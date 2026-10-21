const express = require("express");

const {
  sendMoney,
  getTransactions,
} = require("../controllers/transactionController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Send money
router.post("/send", protect, sendMoney);

// Get logged-in user's transactions
router.get("/", protect, getTransactions);

module.exports = router;