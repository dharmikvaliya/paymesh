const Wallet = require("../models/Wallet");
const { addMoney } = require("../utils/money");

const getWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({
      user: req.user.id,
    });

    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user.id,
      });
    }

    return res.status(200).json({
      success: true,
      wallet: {
        id: wallet._id,
        balance: wallet.balance.toString(),
        currency: wallet.currency,
        status: wallet.status,
      },
    });
  } catch (error) {
    console.error("Get wallet error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const fundWallet = async (req, res) => {
  try {
    const { amount, userId: clientUserId } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    // Security & Authorization: Never trust client-supplied user ID to fund arbitrary wallets
    if (clientUserId && clientUserId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot fund another user's wallet",
      });
    }

    const targetUserId = (req.user.role === "admin" && clientUserId) ? clientUserId : req.user.id;

    const fundAmount = Number(amount);

    if (!Number.isFinite(fundAmount) || fundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    let wallet = await Wallet.findOne({
      user: targetUserId,
    });

    if (!wallet) {
      wallet = await Wallet.create({
        user: targetUserId,
        balance: fundAmount.toFixed(2),
      });
    } else {
      // Decimal-safe addition using integer cents
      wallet.balance = addMoney(wallet.balance.toString(), fundAmount);
      await wallet.save();
    }

    return res.status(200).json({
      success: true,
      message: "Wallet funded successfully",
      wallet: {
        id: wallet._id,
        balance: wallet.balance.toString(),
        currency: wallet.currency,
        status: wallet.status,
      },
    });
  } catch (error) {
    console.error("Fund wallet error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getWallet,
  fundWallet,
};
