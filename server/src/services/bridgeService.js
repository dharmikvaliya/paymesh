const mongoose = require("mongoose");

const User = require("../models/User");
const Packet = require("../models/packet");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const { verifyPacket } = require("../utils/signature");

const deliverPacket = async (packetId) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const packet = await Packet.findOne({
        packetId,
      }).session(session);

      if (!packet) {
        throw new Error("Packet not found");
      }

      // Prevent processing the same packet twice
      if (
        packet.status === "delivered" ||
        packet.status === "processed"
      ) {
        result = {
          success: false,
          duplicate: true,
          message: "Packet already delivered",
          packet,
        };

        return;
      }

      // Check packet TTL
      if (packet.status === "expired" || packet.ttl <= 0) {
        packet.status = "expired";
        await packet.save();

        result = {
          success: false,
          expired: true,
          message: "Packet expired",
          packet,
        };

        return;
      }

      // Verify packet signature BEFORE settlement
      if (!packet.signature) {
        throw new Error("Packet signature missing");
      }

      const signaturePayload = {
        packetId: packet.packetId,
        sender: packet.sender.toString(),
        receiver: packet.receiver.toString(),
        amount: Number(packet.amount.toString()),
        encryptedData: packet.encryptedData,
      };

      let validSignature = false;

      try {
        validSignature = verifyPacket(
          signaturePayload,
          packet.signature
        );
      } catch (error) {
        validSignature = false;
      }

      if (!validSignature) {
        throw new Error("Invalid packet signature");
      }

      // Check idempotency
      const existingTransaction = await Transaction.findOne({
        idempotencyKey: packet.idempotencyKey,
      }).session(session);

      if (existingTransaction) {
        result = {
          success: true,
          duplicate: true,
          message: "Transaction already processed",
          transaction: existingTransaction,
        };

        return;
      }

      // Find sender wallet
      const senderWallet = await Wallet.findOne({
        user: packet.sender,
        status: "active",
      }).session(session);

      // Find receiver wallet (auto-create if receiver user exists)
      let receiverWallet = await Wallet.findOne({
        user: packet.receiver,
        status: "active",
      }).session(session);

      if (!senderWallet) {
        throw new Error("Sender wallet not found");
      }

      if (!receiverWallet) {
        const receiverUser = await User.findById(packet.receiver).session(session);
        if (!receiverUser) {
          throw new Error("Receiver wallet not found");
        }
        const createdWallets = await Wallet.create(
          [{ user: packet.receiver }],
          { session }
        );
        receiverWallet = createdWallets[0];
      }

      const amount = Number(packet.amount.toString());

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid transaction amount");
      }

      const senderBalance = Number(
        senderWallet.balance.toString()
      );

      if (senderBalance < amount) {
        throw new Error("Insufficient balance");
      }

      // Debit sender
      senderWallet.balance = (
        senderBalance - amount
      ).toFixed(2);

      // Credit receiver
      receiverWallet.balance = (
        Number(receiverWallet.balance.toString()) + amount
      ).toFixed(2);

      await senderWallet.save({ session });
      await receiverWallet.save({ session });

      // Create transaction
      const transaction = await Transaction.create(
        [
          {
            sender: packet.sender,
            receiver: packet.receiver,
            amount,
            status: "completed",
            type: "offline",
            idempotencyKey: packet.idempotencyKey,
            description: "Offline mesh payment",
          },
        ],
        { session }
      );

      // Mark packet delivered
      packet.status = "delivered";
      packet.deliveredAt = new Date();

      await packet.save({ session });

      result = {
        success: true,
        duplicate: false,
        message: "Offline payment settled successfully",
        transaction: transaction[0],
      };
    });

    return result;
  } catch (error) {
    console.error("Bridge settlement error:", error);

    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  deliverPacket,
};
