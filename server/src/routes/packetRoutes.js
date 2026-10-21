const express = require("express");

const {
  createOfflinePacket,
  getPackets,
  getPacketById,
} = require("../controllers/packetController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getPackets);
router.get("/:packetId", protect, getPacketById);
router.post("/create", protect, createOfflinePacket);

module.exports = router;
