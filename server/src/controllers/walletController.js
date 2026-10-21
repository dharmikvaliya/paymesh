const Wallet = require("../models/Wallet");

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
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: "User ID and amount are required",
      });
    }

    const fundAmount = Number(amount);

    if (!Number.isFinite(fundAmount) || fundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    let wallet = await Wallet.findOne({
      user: userId,
    });

    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        balance: fundAmount.toFixed(2),
      });
    } else {
      const currentBalance = Number(wallet.balance.toString());

      wallet.balance = (
        currentBalance + fundAmount
      ).toFixed(2);

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
