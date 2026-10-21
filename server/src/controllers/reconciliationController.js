const { reconcilePacket } = require("../services/reconciliationService");

const reconcile = async (req, res) => {
  try {
    const { packetId } = req.params;

    if (!packetId) {
      return res.status(400).json({
        success: false,
        message: "Packet ID is required",
      });
    }

    const result = await reconcilePacket(packetId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Reconciliation error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Reconciliation failed",
    });
  }
};

module.exports = {
  reconcile,
};