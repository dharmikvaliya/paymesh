const express = require("express");

const { deliver } = require("../controllers/bridgeController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/deliver", protect, deliver);

module.exports = router;