const express = require("express");

const {
  getWallet,
  fundWallet,
} = require("../controllers/walletController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getWallet);

router.post("/fund", protect, fundWallet);

module.exports = router;