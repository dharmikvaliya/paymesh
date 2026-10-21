const { forwardPacket } = require("../services/meshService");

const forward = async (req, res) => {
  try {
    const { packetId } = req.body;

    if (!packetId) {
      return res.status(400).json({
        success: false,
        message: "Packet ID is required",
      });
    }

    const result = await forwardPacket(packetId);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Mesh forward error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Mesh forwarding failed",
    });
  }
};

module.exports = {
  forward,
};