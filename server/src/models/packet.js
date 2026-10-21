const mongoose = require("mongoose");

const packetSchema = new mongoose.Schema(
  {
    packetId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      min: 0.01,
    },

    // AES-256-GCM encrypted payment data
    encryptedData: {
      type: String,
      required: true,
    },

    // HMAC-SHA256 signature for packet tamper detection
    signature: {
      type: String,
      required: true,
    },

    // Prevents the same payment from being processed twice
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Number of remaining mesh hops
    ttl: {
      type: Number,
      required: true,
      default: 5,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "delivered",
        "processed",
        "expired",
      ],
      default: "pending",
    },

    // Number of devices the packet passed through
    hopCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Packet", packetSchema);