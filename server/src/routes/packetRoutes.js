const express = require("express");

const {
  createOfflinePacket,
} = require("../controllers/packetController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", protect, createOfflinePacket);

module.exports = router;