const express = require("express");

const { forward } = require("../controllers/meshcontroller.js");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/forward", protect, forward);

module.exports = router;