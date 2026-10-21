const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
require("dotenv").config({ path: `${__dirname}/../.env` });

const app = require("../src/app");
const connectDatabase = require("../src/config/database");
const User = require("../src/models/User");
const Wallet = require("../src/models/Wallet");
const Transaction = require("../src/models/Transaction");
const Packet = require("../src/models/packet");
const { reconcilePacket } = require("../src/services/reconciliationService");

let server;
let baseUrl;
let testUser1;
let testUser2;
let token1;
let refreshCookie1;

describe("PayMesh Integration Test Suite", () => {
  before(async () => {
    // Connect to database
    await connectDatabase();

    // Start ephemeral HTTP server on random free port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    console.log(`Test server running at ${baseUrl}`);
  });

  after(async () => {
    // Clean up test data completely so zero residual records remain in database
    try {
      const userIds = [testUser1?.id, testUser1?._id, testUser2?.id, testUser2?._id].filter(Boolean);
      if (userIds.length > 0) {
        await Promise.allSettled([
          User.deleteMany({ _id: { $in: userIds } }),
          Wallet.deleteMany({ user: { $in: userIds } }),
          Transaction.deleteMany({
            $or: [{ sender: { $in: userIds } }, { receiver: { $in: userIds } }],
          }),
          Packet.deleteMany({
            $or: [{ sender: { $in: userIds } }, { receiver: { $in: userIds } }],
          }),
        ]);
        console.log("Successfully cleaned up all integration test fixtures from database.");
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  test("1. Health Endpoint — GET /api/health", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.message, "PayMesh API is running");
  });

  test("2. Authentication — Register, Login, Me, Refresh Rotation, and Logout", async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);
    const email1 = `sender_${uniqueSuffix}@paymesh.test`;
    const email2 = `receiver_${uniqueSuffix}@paymesh.test`;

    // 2a. Register User 1
    const regRes1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Sender",
        email: email1,
        password: "Password@123",
      }),
    });
    const regData1 = await regRes1.json();
    assert.equal(regRes1.status, 201);
    assert.equal(regData1.success, true);
    testUser1 = regData1.user;

    // 2b. Register User 2
    const regRes2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Receiver",
        email: email2,
        password: "Password@123",
      }),
    });
    const regData2 = await regRes2.json();
    assert.equal(regRes2.status, 201);
    assert.equal(regData2.success, true);
    testUser2 = regData2.user;

    // 2c. Login User 1
    const loginRes1 = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email1,
        password: "Password@123",
      }),
    });
    const loginData1 = await loginRes1.json();
    assert.equal(loginRes1.status, 200);
    assert.equal(loginData1.success, true);
    assert.ok(loginData1.accessToken);
    token1 = loginData1.accessToken;

    // Capture initial refresh cookie
    const rawCookies = loginRes1.headers.get("set-cookie");
    assert.ok(rawCookies, "Refresh token cookie should be set by backend");
    refreshCookie1 = rawCookies.split(";")[0];

    // 2d. Login with Invalid Credentials
    const failLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email1,
        password: "WrongPassword!",
      }),
    });
    assert.equal(failLoginRes.status, 401);

    // 2e. Login User 2
    const loginRes2 = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email2,
        password: "Password@123",
      }),
    });
    const loginData2 = await loginRes2.json();
    assert.equal(loginRes2.status, 200);
    assert.ok(loginData2.accessToken);

    // 2f. Protected Route /me with Token
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const meData = await meRes.json();
    assert.equal(meRes.status, 200);
    assert.equal(meData.user.email, email1);

    // 2g. Protected Route /me without Token
    const unauthRes = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(unauthRes.status, 401);

    // 2h. Refresh Access Token using Refresh Cookie (and verify token rotation)
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { Cookie: refreshCookie1 },
    });
    const refreshData = await refreshRes.json();
    assert.equal(refreshRes.status, 200);
    assert.equal(refreshData.success, true);
    assert.ok(refreshData.accessToken);

    const rotatedCookie = refreshRes.headers.get("set-cookie");
    assert.ok(rotatedCookie, "Backend should rotate refresh token cookie upon refresh");

    // 2i. Logout
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
    });
    const logoutData = await logoutRes.json();
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutData.success, true);
  });

  test("3. Wallet — Inspect, Fund Liquidity, and Ownership Authorization", async () => {
    // 3a. Get initial wallet for user 1
    const getWalletRes = await fetch(`${baseUrl}/api/wallet`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const walletData = await getWalletRes.json();
    assert.equal(getWalletRes.status, 200);
    assert.equal(walletData.success, true);
    assert.equal(walletData.wallet.currency, "INR");
    assert.equal(walletData.wallet.status, "active");

    // 3b. Fund wallet with 1,000 INR (caller's own wallet)
    const fundRes = await fetch(`${baseUrl}/api/wallet/fund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        amount: 1000,
      }),
    });
    const fundData = await fundRes.json();
    assert.equal(fundRes.status, 200);
    assert.equal(fundData.success, true);
    assert.ok(Number(fundData.wallet.balance) >= 1000);

    // 3c. Payment Safety Audit: Attempt to fund another user's wallet with client-supplied userId
    const exploitRes = await fetch(`${baseUrl}/api/wallet/fund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        userId: testUser2.id,
        amount: 500,
      }),
    });
    assert.equal(exploitRes.status, 403, "Backend must reject funding another user's wallet");
    const exploitData = await exploitRes.json();
    assert.equal(exploitData.success, false);
  });

  test("4. Direct Online Transfer & Idempotency", async () => {
    const idKey = `test-idemp-${Date.now()}`;

    // 4a. Send 150 INR online from user 1 to user 2
    const sendRes = await fetch(`${baseUrl}/api/transactions/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
        "Idempotency-Key": idKey,
      },
      body: JSON.stringify({
        receiverId: testUser2.id,
        amount: 150,
        type: "online",
        description: "Direct lunch settlement",
      }),
    });
    const sendData = await sendRes.json();
    assert.equal(sendRes.status, 201);
    assert.equal(sendData.success, true);
    assert.equal(sendData.duplicate, false);
    assert.equal(Number(sendData.transaction.amount.$numberDecimal || sendData.transaction.amount), 150);

    // 4b. Duplicate submission with SAME Idempotency-Key
    const dupRes = await fetch(`${baseUrl}/api/transactions/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
        "Idempotency-Key": idKey,
      },
      body: JSON.stringify({
        receiverId: testUser2.id,
        amount: 150,
        type: "online",
      }),
    });
    const dupData = await dupRes.json();
    assert.equal(dupRes.status, 200);
    assert.equal(dupData.duplicate, true);
    assert.equal(dupData.message, "Transaction already processed");

    // 4c. Verify transaction appears in /api/transactions
    const txListRes = await fetch(`${baseUrl}/api/transactions`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const txListData = await txListRes.json();
    assert.equal(txListRes.status, 200);
    assert.ok(Array.isArray(txListData.transactions));
    assert.ok(txListData.transactions.length > 0);
  });

  test("5. Offline Packet Lifecycle — Create, Forward, Bridge Settle, and Reconcile", async () => {
    // 5a. Create Offline Packet (amount: 200, ttl: 4)
    const createPktRes = await fetch(`${baseUrl}/api/packets/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        receiverId: testUser2.id,
        amount: 200,
        ttl: 4,
      }),
    });
    const createPktData = await createPktRes.json();
    assert.equal(createPktRes.status, 201);
    assert.equal(createPktData.success, true);
    assert.equal(createPktData.packet.status, "pending");
    assert.equal(createPktData.packet.ttl, 4);
    assert.equal(createPktData.packet.hopCount, 0);

    const packetId = createPktData.packet.packetId;
    assert.ok(packetId, "Created packet must have packetId");

    // 5b. Lookup packet details via GET /api/packets/:packetId
    const getPktRes = await fetch(`${baseUrl}/api/packets/${packetId}`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const getPktData = await getPktRes.json();
    assert.equal(getPktRes.status, 200);
    assert.equal(getPktData.packet.packetId, packetId);

    // 5c. Pre-Settlement Reconciliation Check (packet pending, 0 transactions)
    const preReconRes = await fetch(`${baseUrl}/api/reconciliation/${packetId}`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const preReconData = await preReconRes.json();
    assert.equal(preReconRes.status, 200);
    assert.equal(preReconData.reconciled, true);
    assert.equal(preReconData.packetStatus, "pending");
    assert.equal(preReconData.transaction, null);

    // 5d. Mesh Forwarding Hop 1
    const fwdRes = await fetch(`${baseUrl}/api/mesh/forward`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ packetId }),
    });
    const fwdData = await fwdRes.json();
    assert.equal(fwdRes.status, 200);
    assert.equal(fwdData.success, true);
    assert.equal(fwdData.packet.ttl, 3, "TTL must decrement by 1");
    assert.equal(fwdData.packet.hopCount, 1, "Hop count must increment by 1");

    // 5e. Bridge Settlement
    const deliverRes = await fetch(`${baseUrl}/api/bridge/deliver`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ packetId }),
    });
    const deliverData = await deliverRes.json();
    assert.equal(deliverRes.status, 200);
    assert.equal(deliverData.success, true);
    assert.equal(deliverData.message, "Offline payment settled successfully");
    assert.ok(deliverData.transaction);

    // 5f. Duplicate Bridge Settlement prevention
    const deliverDupRes = await fetch(`${baseUrl}/api/bridge/deliver`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ packetId }),
    });
    const deliverDupData = await deliverDupRes.json();
    assert.equal(deliverDupRes.status, 400);
    assert.equal(deliverDupData.duplicate, true);

    // 5g. Post-Settlement Full Reconciliation Check
    const postReconRes = await fetch(`${baseUrl}/api/reconciliation/${packetId}`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const postReconData = await postReconRes.json();
    assert.equal(postReconRes.status, 200);
    assert.equal(postReconData.reconciled, true);
    assert.equal(postReconData.packet.status, "delivered");
    assert.equal(postReconData.transaction.status, "completed");
    assert.equal(postReconData.transaction.type, "offline");
    assert.equal(postReconData.packet.amount, "200.00");
    assert.equal(postReconData.transaction.amount, "200.00");
    assert.equal(postReconData.packet.idempotencyKey, postReconData.transaction.idempotencyKey);
  });

  test("6. Reconciliation Mismatch Handling (Read-Only)", async () => {
    // 6a. Create an offline packet
    const createRes = await fetch(`${baseUrl}/api/packets/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        receiverId: testUser2.id,
        amount: 50,
        ttl: 5,
      }),
    });
    const createData = await createRes.json();
    const packetId = createData.packet.packetId;

    // Deliver the packet
    await fetch(`${baseUrl}/api/bridge/deliver`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ packetId }),
    });

    // Artificially simulate an amount tampering on the packet record to test discrepancy detection
    await Packet.updateOne(
      { packetId },
      { $set: { amount: mongoose.Types.Decimal128.fromString("99.99") } }
    );

    const mismatchResult = await reconcilePacket(packetId);
    assert.equal(mismatchResult.success, false);
    assert.equal(mismatchResult.reconciled, false);
    assert.equal(mismatchResult.reason, "Packet amount does not match transaction amount");
    assert.equal(mismatchResult.packetAmount, "99.99");
    assert.equal(mismatchResult.transactionAmount, "50.00");
  });
});
