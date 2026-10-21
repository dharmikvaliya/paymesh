const express = require("express");

const {
  reconcile,
} = require("../controllers/reconciliationController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/:packetId",
  protect,
  reconcile
);

module.exports = router;
