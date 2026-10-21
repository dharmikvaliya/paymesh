const mongoose = require("mongoose");

const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const transferMoney = async ({
  senderId,
  receiverId,
  amount,
  idempotencyKey,
}) => {
  // 1. Check duplicate request
  const existingTransaction = await Transaction.findOne({
    idempotencyKey,
  });

  if (existingTransaction) {
    return {
      duplicate: true,
      transaction: existingTransaction,
    };
  }

  // 2. Basic validation
  if (senderId.toString() === receiverId.toString()) {
    throw new Error("Sender and receiver cannot be the same");
  }

  const transferAmount = Number(amount);

  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  // 3. Find wallets
  const senderWallet = await Wallet.findOne({
    user: senderId,
  });

  const receiverWallet = await Wallet.findOne({
    user: receiverId,
  });

  if (!senderWallet) {
    throw new Error("Sender wallet not found");
  }

  if (!receiverWallet) {
    throw new Error("Receiver wallet not found");
  }

  // 4. Check wallet status
  if (senderWallet.status !== "active") {
    throw new Error("Sender wallet is not active");
  }

  if (receiverWallet.status !== "active") {
    throw new Error("Receiver wallet is not active");
  }

  // 5. Convert Decimal128 to number for comparison
  const senderBalance = Number(
    senderWallet.balance.toString()
  );

  if (senderBalance < transferAmount) {
    throw new Error("Insufficient wallet balance");
  }

  // 6. Update balances
  const newSenderBalance =
    senderBalance - transferAmount;

  const receiverBalance = Number(
    receiverWallet.balance.toString()
  );

  const newReceiverBalance =
    receiverBalance + transferAmount;

  senderWallet.balance = mongoose.Types.Decimal128.fromString(
    newSenderBalance.toFixed(2)
  );

  receiverWallet.balance = mongoose.Types.Decimal128.fromString(
    newReceiverBalance.toFixed(2)
  );

  await senderWallet.save();
  await receiverWallet.save();

  // 7. Save transaction
  const transaction = await Transaction.create({
    sender: senderId,
    receiver: receiverId,
    amount: mongoose.Types.Decimal128.fromString(
      transferAmount.toFixed(2)
    ),
    status: "completed",
    type: "online",
    idempotencyKey,
  });

  return {
    duplicate: false,
    transaction,
  };
};

module.exports = {
  transferMoney,
};