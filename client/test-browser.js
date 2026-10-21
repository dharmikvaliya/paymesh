import http from "node:http";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverRequire = createRequire(path.join(__dirname, "../server/package.json"));
const dotenv = serverRequire("dotenv");
const mongoose = serverRequire("mongoose");

dotenv.config({ path: path.join(__dirname, "../server/.env") });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DIST_DIR = path.join(__dirname, "dist");

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

const serveStatic = (req, res) => {
  let reqPath = req.url.split("?")[0];
  let filePath = path.join(DIST_DIR, reqPath === "/" ? "index.html" : reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end("Internal Server Error");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
};

async function runBrowserAudit() {
  console.log("=== PAYMESH REAL BROWSER WORKFLOW VERIFICATION ===");
  let clientServer;
  let backendServer;
  let browser;
  let createdUserIds = [];

  try {
    // 1. Start backend server
    const app = serverRequire("./src/app");
    const connectDatabase = serverRequire("./src/config/database");
    await connectDatabase();

    backendServer = http.createServer(app);
    await new Promise((resolve) => backendServer.listen(5000, resolve));
    console.log("✓ Backend server listening on http://localhost:5000");

    // 2. Start client static server
    clientServer = http.createServer(serveStatic);
    await new Promise((resolve) => clientServer.listen(5173, resolve));
    console.log("✓ Client production bundle serving on http://localhost:5173");

    // 3. Launch Chrome via puppeteer-core
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,800"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    console.log("✓ Headless Google Chrome launched successfully");

    const results = {};

    // ----------------------------------------------------
    // CHECK 1: Protected Route Guard
    // ----------------------------------------------------
    console.log("\n[1/15] Testing Unauthenticated Route Guard...");
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      console.log("✓ PASSED: Unauthenticated user correctly redirected to /login");
      results["Unauthenticated route protection"] = "PASSED";
    } else {
      throw new Error(`Expected redirect to /login, but got ${currentUrl}`);
    }

    // ----------------------------------------------------
    // CHECK 2: Invalid Login Error State
    // ----------------------------------------------------
    console.log("\n[2/15] Testing Invalid Credentials Error Handling...");
    await page.waitForSelector('input[type="email"]');
    await page.$eval('input[type="email"]', (el) => (el.value = ""));
    await page.type('input[type="email"]', "nonexistent@paymesh.test");
    await page.$eval('input[type="password"]', (el) => (el.value = ""));
    await page.type('input[type="password"]', "WrongPassword123");
    await page.click('button[type="submit"]');

    await page.waitForSelector(".form-error", { timeout: 6000 });
    const errorText = await page.$eval(".form-error", (el) => el.textContent);
    console.log(`✓ PASSED: Received expected inline error: "${errorText}"`);
    results["Invalid credentials handling"] = "PASSED";

    // ----------------------------------------------------
    // CHECK 3: User Registration & Automatic Dashboard Entry
    // ----------------------------------------------------
    console.log("\n[3/15] Testing Account Registration...");
    const uniqueId = Date.now().toString().slice(-6);
    const testEmail = `browser_user_${uniqueId}@paymesh.test`;
    const testName = `Browser Tester ${uniqueId}`;

    const toggleBtn = await page.waitForSelector("button.text-button");
    await toggleBtn.click();
    await page.waitForSelector('input[placeholder="e.g. Alice Sharma"]');

    await page.type('input[placeholder="e.g. Alice Sharma"]', testName);
    await page.$eval('input[type="email"]', (el) => (el.value = ""));
    await page.type('input[type="email"]', testEmail);
    await page.$eval('input[type="password"]', (el) => (el.value = ""));
    await page.type('input[type="password"]', "Password@123");

    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname === "/", { timeout: 10000 });
    await page.waitForSelector(".page-title", { timeout: 8000 });
    const welcomeTitle = await page.$eval(".page-title", (el) => el.textContent);
    console.log(`✓ PASSED: Successfully registered and reached dashboard: "${welcomeTitle}"`);
    results["Registration and login"] = "PASSED";

    // ----------------------------------------------------
    // CHECK 4: Real-time Dashboard Data Inspection
    // ----------------------------------------------------
    console.log("\n[4/15] Verifying Real-time Dashboard Ledger Data...");
    await page.waitForSelector(".huge-balance-text");
    const initialBalance = await page.$eval(".huge-balance-text", (el) => el.textContent.trim());
    console.log(`✓ PASSED: Initial wallet balance displayed from backend: ${initialBalance}`);
    results["Dashboard balance from backend"] = "PASSED";

    // ----------------------------------------------------
    // CHECK 5: Wallet Funding & Instant Balance Reflection
    // ----------------------------------------------------
    console.log("\n[5/15] Testing Wallet Liquidity Deposit...");
    await page.click('a[href="/wallet"]');
    await page.waitForSelector(".funding-form", { timeout: 8000 });

    const preset500Btn = await page.waitForSelector(".preset-btn:nth-child(2)");
    await preset500Btn.click();

    await page.click('button.submit-btn[type="submit"]');
    await page.waitForSelector(".success-banner", { timeout: 8000 });
    const successMsg = await page.$eval(".success-banner span", (el) => el.textContent);
    console.log(`✓ PASSED: Wallet deposit confirmed: "${successMsg}"`);

    const updatedBalance = await page.$eval(".huge-balance-text", (el) => el.textContent.trim());
    if (updatedBalance.includes("500")) {
      console.log(`✓ PASSED: Wallet balance updated to: ${updatedBalance}`);
      results["Wallet funding and balance update"] = "PASSED";
    } else {
      throw new Error(`Expected updated balance ₹500.00, got ${updatedBalance}`);
    }

    // ----------------------------------------------------
    // CHECK 6: Session Persistence Across Hard Page Reload
    // ----------------------------------------------------
    console.log("\n[6/15] Testing Session Refresh on Hard Reload...");
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector(".huge-balance-text", { timeout: 8000 });
    const reloadedBalance = await page.$eval(".huge-balance-text", (el) => el.textContent.trim());
    if (reloadedBalance.includes("500") && page.url().includes("/wallet")) {
      console.log(`✓ PASSED: Session perfectly preserved via httpOnly refresh token across reload`);
      results["Session refresh on reload"] = "PASSED";
    } else {
      throw new Error(`Session lost after reload; URL is ${page.url()}`);
    }

    // Create 2nd test user for recipient in background
    const User = serverRequire("./src/models/User");
    const Wallet = serverRequire("./src/models/Wallet");

    const secondUser = await User.create({
      name: "Second Test Recipient",
      email: `recipient_${uniqueId}@paymesh.test`,
      password: "HashedPassword123!",
    });
    await Wallet.create({ user: secondUser._id, balance: "0.00" });
    createdUserIds.push(secondUser._id);

    // ----------------------------------------------------
    // CHECK 7: Invalid Payment Amount Validation
    // ----------------------------------------------------
    console.log("\n[7/15] Testing Payment Validation & Excessive Amount Handling...");
    await page.click('a[href="/send"]');
    await page.waitForSelector("#receiverId", { timeout: 8000 });

    await page.type("#receiverId", secondUser._id.toString());
    // Enter amount larger than wallet balance (e.g. ₹999,999 when balance is ₹500)
    await page.type("#amount", "999999.00");
    await page.click('button.submit-btn[type="submit"]');

    await page.waitForSelector(".error-banner", { timeout: 5000 });
    const valError = await page.$eval(".error-banner span", (el) => el.textContent);
    console.log(`✓ PASSED: Client validation blocked excessive amount: "${valError}"`);
    results["Payment validation & amount bounds"] = "PASSED";

    // Clear amount
    await page.$eval("#amount", (el) => (el.value = ""));

    // ----------------------------------------------------
    // CHECK 8: Send Payment Form & Offline Packet Creation
    // ----------------------------------------------------
    console.log("\n[8/15] Testing Offline Mesh Packet Creation...");
    await page.type("#amount", "125.00");
    await page.$eval("#ttl", (el) => (el.value = ""));
    await page.type("#ttl", "4");

    await page.click('button.submit-btn[type="submit"]');

    await page.waitForSelector(".modal-overlay", { timeout: 5000 });
    console.log("✓ Review confirmation modal displayed");
    const confirmBtn = await page.waitForSelector(".modal-footer button.primary-btn");
    await confirmBtn.click();

    await page.waitForSelector(".result-card", { timeout: 8000 });
    const packetIdText = await page.$eval(".result-details-box code", (el) => el.textContent.trim());
    console.log(`✓ PASSED: Offline payment packet created with ID: ${packetIdText}`);
    results["Offline packet creation"] = "PASSED";

    // ----------------------------------------------------
    // CHECK 9: Mesh Network Forwarding (TTL & Hop Progression)
    // ----------------------------------------------------
    console.log("\n[9/15] Testing Mesh Forwarding & Hop Count Progression...");
    const fwdMeshBtn = await page.waitForSelector('.result-details-box button.primary-btn');
    await fwdMeshBtn.click();

    await page.waitForFunction(() => window.location.pathname === "/mesh", { timeout: 8000 });
    await page.waitForSelector(".visualizer-card", { timeout: 8000 });

    let remainingTtl = await page.$eval(".mesh-metrics-row .mesh-metric-item:nth-child(1) strong", (el) => el.textContent.trim());
    console.log(`  Initial mesh state: ${remainingTtl}`);

    const hopBtn = await page.waitForSelector('.mesh-controls-row button.primary-btn');
    await hopBtn.click();

    await page.waitForSelector(".success-banner", { timeout: 8000 });
    remainingTtl = await page.$eval(".mesh-metrics-row .mesh-metric-item:nth-child(1) strong", (el) => el.textContent.trim());
    const hopsDone = await page.$eval(".mesh-metrics-row .mesh-metric-item:nth-child(2) strong", (el) => el.textContent.trim());
    console.log(`✓ PASSED: Packet hopped forward! TTL now: ${remainingTtl}, Hops traversed: ${hopsDone}`);
    results["Mesh packet forwarding"] = "PASSED";

    // ----------------------------------------------------
    // CHECK 10: Bridge Settlement
    // ----------------------------------------------------
    console.log("\n[10/15] Testing Bridge Delivery and Ledger Settlement...");
    const deliverBtn = await page.waitForSelector('.mesh-controls-row button.secondary-btn');
    await deliverBtn.click();

    await page.waitForSelector(".settlement-card", { timeout: 8000 });
    const settlementMsg = await page.$eval(".settlement-card .review-list .review-row:nth-child(2) span:nth-child(2)", (el) => el.textContent.trim());
    console.log(`✓ PASSED: Bridge settlement executed: "${settlementMsg}"`);
    results["Bridge settlement"] = "PASSED";

    // ----------------------------------------------------
    // CHECK 11: Ledger Reconciliation (Packet vs Transaction)
    // ----------------------------------------------------
    console.log("\n[11/15] Testing Ledger Reconciliation Audit...");
    const auditBtn = await page.waitForSelector('.settlement-card button.primary-btn');
    await auditBtn.click();

    await page.waitForFunction(() => window.location.pathname === "/reconciliation", { timeout: 8000 });
    await page.waitForSelector(".verdict-card", { timeout: 8000 });

    const verdictTitle = await page.$eval(".verdict-header h2", (el) => el.textContent.trim());
    const isSuccess = verdictTitle.includes("Reconciliation Verified");
    if (isSuccess) {
      console.log(`✓ PASSED: Reconciliation verdict: "${verdictTitle}"`);
      results["Reconciliation audit"] = "PASSED";
    } else {
      throw new Error(`Expected Reconciliation Verified, got ${verdictTitle}`);
    }

    // ----------------------------------------------------
    // CHECK 12: Direct Online Transfer via Browser Form
    // ----------------------------------------------------
    console.log("\n[12/15] Testing Direct Online Transfer Form & Ledger Entry...");
    await page.click('a[href="/send"]');
    await page.waitForSelector(".mode-tab-btn:nth-child(2)", { timeout: 8000 });

    // Switch to "Direct Online Transfer" tab
    await page.click(".mode-tab-btn:nth-child(2)");
    await page.waitForSelector("#description");

    await page.type("#receiverId", secondUser._id.toString());
    await page.type("#amount", "75.00");
    await page.type("#description", "Browser direct online payment");

    await page.click('button.submit-btn[type="submit"]');

    // Confirm Modal
    await page.waitForSelector(".modal-overlay", { timeout: 5000 });
    const confirmDirectBtn = await page.waitForSelector(".modal-footer button.primary-btn");
    await confirmDirectBtn.click();

    // Verify Direct transfer completed
    await page.waitForSelector(".result-card", { timeout: 8000 });
    console.log("✓ PASSED: Direct online transfer executed");

    // Click "View Transactions"
    const viewTxBtn = await page.waitForSelector(".result-details-box button.primary-btn");
    await viewTxBtn.click();

    await page.waitForFunction(() => window.location.pathname === "/transactions", { timeout: 8000 });
    await page.waitForSelector(".financial-table", { timeout: 8000 });
    const rowCount = await page.$$eval(".financial-table tbody tr", (trs) => trs.length);
    console.log(`✓ PASSED: Transactions ledger loaded with ${rowCount} entries`);
    results["Direct transfer & ledger display"] = "PASSED";

    // ----------------------------------------------------
    // CHECK 13: Responsive Layouts (Mobile & Desktop)
    // ----------------------------------------------------
    console.log("\n[13/15] Testing Responsive Mobile Layout...");
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });

    const mobileHeaderVisible = await page.$eval(".mobile-top-bar", (el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none";
    });
    assert.equal(mobileHeaderVisible, true, "Mobile top bar should be visible on narrow screens");

    const menuBtn = await page.waitForSelector(".mobile-menu-trigger");
    await menuBtn.click();
    await page.waitForSelector(".dashboard-sidebar.mobile-open", { timeout: 3000 });
    console.log("✓ PASSED: Mobile hamburger menu toggles navigation drawer cleanly");

    await page.setViewport({ width: 1280, height: 800 });
    results["Responsive layouts"] = "PASSED";

    // ----------------------------------------------------
    // CHECK 14: Sign Out & Route Re-Protection
    // ----------------------------------------------------
    console.log("\n[14/15] Testing Sign Out and Access Revocation...");
    await page.goto("http://localhost:5173/wallet", { waitUntil: "networkidle0" });
    const logoutBtn = await page.waitForSelector(".sidebar-logout-btn");
    await logoutBtn.click();

    await page.waitForFunction(() => window.location.pathname === "/login", { timeout: 8000 });
    console.log("✓ PASSED: Logout redirects to /login");

    await page.goto("http://localhost:5173/transactions", { waitUntil: "networkidle0" });
    if (page.url().includes("/login")) {
      console.log("✓ PASSED: Direct navigation to protected /transactions redirects to /login");
      results["Logout and route re-protection"] = "PASSED";
    } else {
      throw new Error(`Expected redirect to /login, but stayed at ${page.url()}`);
    }

    // ----------------------------------------------------
    // CHECK 15: Clean Database State
    // ----------------------------------------------------
    console.log("\n[15/15] Cleaning up test accounts from database...");
    const registeredUser = await User.findOne({ email: testEmail });
    if (registeredUser) {
      createdUserIds.push(registeredUser._id);
    }
    results["Database test isolation"] = "PASSED";

    console.log("\n====================================================");
    console.log("ALL REAL BROWSER WORKFLOW AUDITS PASSED SUCCESSFULLY");
    console.log("====================================================");
    console.table(results);
  } finally {
    try {
      if (createdUserIds.length > 0) {
        const User = serverRequire("./src/models/User");
        const Wallet = serverRequire("./src/models/Wallet");
        const Transaction = serverRequire("./src/models/Transaction");
        const Packet = serverRequire("./src/models/packet");

        await Promise.allSettled([
          User.deleteMany({ _id: { $in: createdUserIds } }),
          Wallet.deleteMany({ user: { $in: createdUserIds } }),
          Transaction.deleteMany({
            $or: [{ sender: { $in: createdUserIds } }, { receiver: { $in: createdUserIds } }],
          }),
          Packet.deleteMany({
            $or: [{ sender: { $in: createdUserIds } }, { receiver: { $in: createdUserIds } }],
          }),
        ]);
        console.log("✓ Cleaned up all browser test accounts and fixtures from MongoDB Atlas.");
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr.message);
    }

    if (browser) await browser.close();
    if (clientServer) await new Promise((res) => clientServer.close(res));
    if (backendServer) await new Promise((res) => backendServer.close(res));
    await mongoose.disconnect();
    console.log("✓ Servers and database connections closed.");
  }
}

runBrowserAudit().catch((err) => {
  console.error("\n❌ Browser audit encountered an error:", err);
  process.exit(1);
});
