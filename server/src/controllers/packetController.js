const crypto = require("crypto");
const mongoose = require("mongoose");

const Wallet = require("../models/Wallet");
const Packet = require("../models/packet");

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

const getPackets = async (req, res) => {
  try {
    const packets = await Packet.find({
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id },
      ],
    })
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .sort({ createdAt: -1 });

    const formattedPackets = packets.map((p) => ({
      id: p._id,
      packetId: p.packetId,
      sender: p.sender,
      receiver: p.receiver,
      amount: p.amount.toString(),
      ttl: p.ttl,
      hopCount: p.hopCount,
      status: p.status,
      idempotencyKey: p.idempotencyKey,
      deliveredAt: p.deliveredAt,
      createdAt: p.createdAt,
    }));

    return res.status(200).json({
      success: true,
      packets: formattedPackets,
    });
  } catch (error) {
    console.error("Get packets error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error retrieving packets",
    });
  }
};

const getPacketById = async (req, res) => {
  try {
    const { packetId } = req.params;

    const query = mongoose.isValidObjectId(packetId)
      ? { $or: [{ packetId }, { _id: packetId }] }
      : { packetId };

    const packet = await Packet.findOne(query)
      .populate("sender", "name email")
      .populate("receiver", "name email");

    if (!packet) {
      return res.status(404).json({
        success: false,
        message: "Packet not found",
      });
    }

    return res.status(200).json({
      success: true,
      packet: {
        id: packet._id,
        packetId: packet.packetId,
        sender: packet.sender,
        receiver: packet.receiver,
        amount: packet.amount.toString(),
        ttl: packet.ttl,
        hopCount: packet.hopCount,
        status: packet.status,
        idempotencyKey: packet.idempotencyKey,
        deliveredAt: packet.deliveredAt,
        createdAt: packet.createdAt,
      },
    });
  } catch (error) {
    console.error("Get packet by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error retrieving packet",
    });
  }
};

module.exports = {
  createOfflinePacket,
  getPackets,
  getPacketById,
};
