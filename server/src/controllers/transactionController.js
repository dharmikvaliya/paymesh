const mongoose = require("mongoose");

const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const sendMoney = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      receiverId,
      amount,
      type = "online",
      description = "",
    } = req.body;

    const idempotencyKey = req.headers["idempotency-key"];

    // Validate request
    if (!receiverId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Receiver and amount are required",
      });
    }

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "Idempotency-Key header is required",
      });
    }

    const transferAmount = Number(amount);

    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    if (req.user.id === receiverId) {
      return res.status(400).json({
        success: false,
        message: "You cannot send money to yourself",
      });
    }

    if (!["online", "offline"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    let transaction;
    let duplicate = false;

    await session.withTransaction(async () => {
      // --------------------------------------------------
      // 1. Check idempotency
      // --------------------------------------------------

      const existingTransaction = await Transaction.findOne({
        idempotencyKey,
      }).session(session);

      if (existingTransaction) {
        transaction = existingTransaction;
        duplicate = true;
        return;
      }

      // --------------------------------------------------
      // 2. Find sender wallet
      // --------------------------------------------------

      const senderWallet = await Wallet.findOne({
        user: req.user.id,
        status: "active",
      }).session(session);

      // --------------------------------------------------
      // 3. Find receiver wallet
      // --------------------------------------------------

      const receiverWallet = await Wallet.findOne({
        user: receiverId,
        status: "active",
      }).session(session);

      if (!senderWallet) {
        throw new Error("Sender wallet not found");
      }

      if (!receiverWallet) {
        throw new Error("Receiver wallet not found");
      }

      // --------------------------------------------------
      // 4. Check sender balance
      // --------------------------------------------------

      const senderBalance = Number(
        senderWallet.balance.toString()
      );

      if (senderBalance < transferAmount) {
        throw new Error("Insufficient balance");
      }

      // --------------------------------------------------
      // 5. Calculate new balances
      // --------------------------------------------------

      const newSenderBalance =
        senderBalance - transferAmount;

      const receiverBalance = Number(
        receiverWallet.balance.toString()
      );

      const newReceiverBalance =
        receiverBalance + transferAmount;

      // --------------------------------------------------
      // 6. Update wallets
      // --------------------------------------------------

      senderWallet.balance = newSenderBalance.toFixed(2);

      receiverWallet.balance = newReceiverBalance.toFixed(2);

      await senderWallet.save({ session });
      await receiverWallet.save({ session });

      // --------------------------------------------------
      // 7. Create transaction
      // --------------------------------------------------

      const transactions = await Transaction.create(
        [
          {
            sender: req.user.id,
            receiver: receiverId,
            amount: transferAmount,
            status: "completed",
            type,
            idempotencyKey,
            description,
          },
        ],
        { session }
      );

      transaction = transactions[0];
    });

    // --------------------------------------------------
    // Duplicate payment
    // --------------------------------------------------

    if (duplicate) {
      return res.status(200).json({
        success: true,
        message: "Transaction already processed",
        duplicate: true,
        transaction,
      });
    }

    // --------------------------------------------------
    // Successful payment
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Money sent successfully",
      duplicate: false,
      transaction,
    });
  } catch (error) {
    console.error("Send money error:", error);

    // Duplicate key race condition
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Transaction already processed",
      });
    }

    if (error.message === "Insufficient balance") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message === "Sender wallet not found" ||
      error.message === "Receiver wallet not found"
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Transfer failed",
    });
  } finally {
    await session.endSession();
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id },
      ],
    })
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error("Get transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  sendMoney,
  getTransactions,
};