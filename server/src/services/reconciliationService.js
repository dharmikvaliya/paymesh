const Packet = require("../models/packet");
const Transaction = require("../models/Transaction");

const reconcilePacket = async (packetId) => {
  const packet = await Packet.findOne({ packetId });

  if (!packet) {
    throw new Error("Packet not found");
  }

  // Find the settlement transaction using the packet's idempotency key
  const transaction = await Transaction.findOne({
    idempotencyKey: packet.idempotencyKey,
  });

  // A packet that was never delivered should not have
  // a completed transaction.
  if (packet.status !== "delivered") {
    if (transaction) {
      return {
        success: false,
        reconciled: false,
        reason: "Non-delivered packet has a transaction",
        packetStatus: packet.status,
        transaction,
      };
    }

    return {
      success: true,
      reconciled: true,
      message: "Packet has no settlement transaction",
      packetStatus: packet.status,
      transaction: null,
    };
  }

  // Delivered packet must have a transaction
  if (!transaction) {
    return {
      success: false,
      reconciled: false,
      reason: "Delivered packet has no transaction",
      packetStatus: packet.status,
      transaction: null,
    };
  }

  // Verify amount using decimal-safe formatting (2 decimal places)
  // Ensures "100.00" and "100" or slight floating deltas are accurately compared.
  const packetAmount = Number(packet.amount.toString());
  const transactionAmount = Number(transaction.amount.toString());

  if (!Number.isFinite(packetAmount) || !Number.isFinite(transactionAmount)) {
    return {
      success: false,
      reconciled: false,
      reason: "Invalid packet or transaction amount",
      packetAmount: packet.amount.toString(),
      transactionAmount: transaction.amount.toString(),
    };
  }

  if (packetAmount.toFixed(2) !== transactionAmount.toFixed(2)) {
    return {
      success: false,
      reconciled: false,
      reason: "Packet amount does not match transaction amount",
      packetAmount: packetAmount.toFixed(2),
      transactionAmount: transactionAmount.toFixed(2),
    };
  }

  // Verify sender
  if (
    packet.sender.toString() !==
    transaction.sender.toString()
  ) {
    return {
      success: false,
      reconciled: false,
      reason: "Packet sender does not match transaction sender",
    };
  }

  // Verify receiver
  if (
    packet.receiver.toString() !==
    transaction.receiver.toString()
  ) {
    return {
      success: false,
      reconciled: false,
      reason: "Packet receiver does not match transaction receiver",
    };
  }

  // Verify transaction status
  if (transaction.status !== "completed") {
    return {
      success: false,
      reconciled: false,
      reason: "Transaction is not completed",
      transactionStatus: transaction.status,
    };
  }

  // Verify transaction type
  if (transaction.type !== "offline") {
    return {
      success: false,
      reconciled: false,
      reason: "Transaction type is not offline",
      transactionType: transaction.type,
    };
  }

  // All reconciliation checks passed
  return {
    success: true,
    reconciled: true,
    message: "Packet and transaction reconciled successfully",

    packet: {
      packetId: packet.packetId,
      amount: packetAmount.toFixed(2),
      status: packet.status,
      idempotencyKey: packet.idempotencyKey,
    },

    transaction: {
      id: transaction._id,
      amount: transactionAmount.toFixed(2),
      status: transaction.status,
      type: transaction.type,
      idempotencyKey: transaction.idempotencyKey,
    },
  };
};

module.exports = {
  reconcilePacket,
};
