import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
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
const ARTIFACT_DIR = "C:\\Users\\ZeeGadgets\\.gemini\\antigravity\\brain\\39d4615b-b324-4dc1-b18d-e13712aad519";
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");
const DIST_DIR = path.join(__dirname, "dist");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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

async function verifyLoginUI() {
  console.log("=== PAYMESH LOGIN UI VISUAL VERIFICATION ===");
  let clientServer;
  let backendServer;
  let browser;

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
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

    // 4. Navigate to login
    await page.goto("http://localhost:5173/login", { waitUntil: "networkidle0" });
    console.log("✓ Navigated to http://localhost:5173/login");

    // 5. Measure computed styles of key UI elements
    const styles = await page.evaluate(() => {
      const pageEl = document.querySelector(".auth-page");
      const card = document.querySelector(".auth-card");
      const brandMark = document.querySelector(".brand-mark");
      const heading = document.querySelector(".auth-heading h1");
      const submitBtn = document.querySelector(".login-button");
      const emailInput = document.querySelector('input[type="email"]');
      const footer = document.querySelector(".auth-footer");

      return {
        page: pageEl ? {
          backgroundColor: window.getComputedStyle(pageEl).backgroundColor,
          minHeight: window.getComputedStyle(pageEl).minHeight,
        } : null,
        card: card ? {
          backgroundColor: window.getComputedStyle(card).backgroundColor,
          borderRadius: window.getComputedStyle(card).borderRadius,
          boxShadow: window.getComputedStyle(card).boxShadow,
          border: window.getComputedStyle(card).border,
          width: window.getComputedStyle(card).width,
          padding: window.getComputedStyle(card).padding,
        } : null,
        brandMark: brandMark ? {
          backgroundColor: window.getComputedStyle(brandMark).backgroundColor,
          color: window.getComputedStyle(brandMark).color,
          borderRadius: window.getComputedStyle(brandMark).borderRadius,
          fontSize: window.getComputedStyle(brandMark).fontSize,
          fontWeight: window.getComputedStyle(brandMark).fontWeight,
        } : null,
        heading: heading ? {
          fontSize: window.getComputedStyle(heading).fontSize,
          fontWeight: window.getComputedStyle(heading).fontWeight,
          color: window.getComputedStyle(heading).color,
        } : null,
        submitBtn: submitBtn ? {
          backgroundColor: window.getComputedStyle(submitBtn).backgroundColor,
          color: window.getComputedStyle(submitBtn).color,
          borderRadius: window.getComputedStyle(submitBtn).borderRadius,
          fontWeight: window.getComputedStyle(submitBtn).fontWeight,
          height: window.getComputedStyle(submitBtn).height,
        } : null,
        emailInput: emailInput ? {
          border: window.getComputedStyle(emailInput).border,
          borderRadius: window.getComputedStyle(emailInput).borderRadius,
          height: window.getComputedStyle(emailInput).height,
          backgroundColor: window.getComputedStyle(emailInput).backgroundColor,
        } : null,
        footer: footer ? {
          borderTop: window.getComputedStyle(footer).borderTop,
          color: window.getComputedStyle(footer).color,
          fontSize: window.getComputedStyle(footer).fontSize,
        } : null,
      };
    });

    console.log("Computed styles report:");
    console.log(JSON.stringify(styles, null, 2));

    // Style checks
    if (!styles.card) throw new Error(".auth-card not found!");
    console.log(`✓ Auth Card: bg=${styles.card.backgroundColor}, radius=${styles.card.borderRadius}, shadow=${styles.card.boxShadow}`);
    console.log(`✓ Brand Mark: bg=${styles.brandMark.backgroundColor}, color=${styles.brandMark.color}`);
    console.log(`✓ Submit Button: bg=${styles.submitBtn.backgroundColor}, color=${styles.submitBtn.color}, height=${styles.submitBtn.height}`);
    console.log(`✓ Email Input: border=${styles.emailInput.border}, radius=${styles.emailInput.borderRadius}, height=${styles.emailInput.height}`);

    // 6. Capture clean desktop login screenshot
    const desktopPath = path.join(SCREENSHOTS_DIR, "login-desktop.png");
    await page.screenshot({ path: desktopPath });
    console.log(`✓ Saved desktop screenshot: ${desktopPath}`);

    // 7. Focus email field and capture input focus state
    await page.focus('input[type="email"]');
    const focusedInputPath = path.join(SCREENSHOTS_DIR, "login-input-focus.png");
    await page.screenshot({ path: focusedInputPath });
    console.log(`✓ Saved input focus screenshot: ${focusedInputPath}`);

    // 8. Test invalid credentials error state
    await page.$eval('input[type="email"]', (el) => (el.value = ""));
    await page.type('input[type="email"]', "invalid@user.com");
    await page.$eval('input[type="password"]', (el) => (el.value = ""));
    await page.type('input[type="password"]', "wrongpass");
    await page.click('button[type="submit"]');

    await page.waitForSelector(".form-error", { timeout: 6000 });
    const errorText = await page.$eval(".form-error", (el) => el.textContent);
    console.log(`✓ Form error displayed correctly: "${errorText}"`);
    const errorPath = path.join(SCREENSHOTS_DIR, "login-error-state.png");
    await page.screenshot({ path: errorPath });
    console.log(`✓ Saved form error screenshot: ${errorPath}`);

    // 9. Switch to registration mode
    const toggleBtn = await page.waitForSelector("button.text-button");
    await toggleBtn.click();
    await page.waitForSelector('input[placeholder="e.g. Alice Sharma"]');
    const registerPath = path.join(SCREENSHOTS_DIR, "register-desktop.png");
    await page.screenshot({ path: registerPath });
    console.log(`✓ Saved registration screenshot: ${registerPath}`);

    // 10. Mobile viewport screenshot
    await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2 });
    const mobilePath = path.join(SCREENSHOTS_DIR, "login-mobile.png");
    await page.screenshot({ path: mobilePath });
    console.log(`✓ Saved mobile screenshot: ${mobilePath}`);

    // 11. Copy screenshots to artifact directory
    if (fs.existsSync(ARTIFACT_DIR)) {
      const filesToCopy = [
        "login-desktop.png",
        "login-input-focus.png",
        "login-error-state.png",
        "register-desktop.png",
        "login-mobile.png",
      ];
      for (const file of filesToCopy) {
        const src = path.join(SCREENSHOTS_DIR, file);
        const dest = path.join(ARTIFACT_DIR, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }
      console.log(`✓ Successfully copied screenshots to artifact directory: ${ARTIFACT_DIR}`);
    }

    console.log("\n=== ALL VISUAL VERIFICATIONS COMPLETED SUCCESSFULLY ===");
  } finally {
    if (browser) await browser.close();
    if (clientServer) await new Promise((r) => clientServer.close(r));
    if (backendServer) await new Promise((r) => backendServer.close(r));
    if (mongoose.connection?.readyState === 1) await mongoose.connection.close();
    console.log("✓ Servers and database connections closed.");
  }
}

verifyLoginUI().catch((err) => {
  console.error("\n❌ Visual verification encountered an error:", err);
  process.exit(1);
});
