const crypto = require("crypto");
const mongoose = require("mongoose");

const Wallet = require("../models/Wallet");
const Packet = require("../models/packet");
console.log(
  "PACKET MODEL FILE:",
  require.resolve("../models/packet")
);

console.log(
  "SIGNATURE FIELD:",
  Packet.schema.path("signature")
);

const { encrypt } = require("../utils/encryption");
const { signPacket } = require("../utils/signature");

const createOfflinePacket = async (req, res) => {
  try {
    const { receiverId, amount, ttl = 5 } = req.body;

    if (!receiverId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Receiver and amount are required",
      });
    }

    if (req.user.id === receiverId) {
      return res.status(400).json({
        success: false,
        message: "You cannot send money to yourself",
      });
    }

    const transferAmount = Number(amount);

    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    if (!Number.isInteger(ttl) || ttl < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid TTL",
      });
    }

    const senderWallet = await Wallet.findOne({
      user: req.user.id,
      status: "active",
    });

    if (!senderWallet) {
      return res.status(404).json({
        success: false,
        message: "Sender wallet not found",
      });
    }

    const senderBalance = Number(
      senderWallet.balance.toString()
    );

    if (senderBalance < transferAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
    }

    const packetId = crypto.randomUUID();

    const idempotencyKey = crypto.randomUUID();

    // Encrypt payment information
    const encryptedData = encrypt({
      senderId: req.user.id.toString(),
      receiverId: receiverId.toString(),
      amount: transferAmount,
      packetId,
    });

    // Sign packet data to detect tampering
    const signature = signPacket({
      packetId,
      sender: req.user.id.toString(),
      receiver: receiverId.toString(),
      amount: transferAmount,
      encryptedData,
    });
console.log("SIGNATURE GENERATED:", signature);

console.log(
  "PACKET MODEL HAS SIGNATURE:",
  Packet.schema.path("signature")
);
    const packet = await Packet.create({

      packetId,
      sender: req.user.id,
      receiver: receiverId,

      amount: mongoose.Types.Decimal128.fromString(
        transferAmount.toFixed(2)
      ),

      encryptedData,
      signature,
      idempotencyKey,

      ttl,
      status: "pending",
      hopCount: 0,
    });

    return res.status(201).json({
      success: true,
      message: "Offline payment packet created",

      packet: {
        id: packet._id,
        packetId: packet.packetId,
        receiver: packet.receiver,
        amount: packet.amount.toString(),
        ttl: packet.ttl,
        hopCount: packet.hopCount,
        status: packet.status,
      },
    });
  } catch (error) {
    console.error("Create offline packet error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create offline payment packet",
    });
  }
};

module.exports = {
  createOfflinePacket,
};