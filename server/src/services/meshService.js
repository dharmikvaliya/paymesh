const Packet = require("../models/packet");

const forwardPacket = async (packetId) => {
  const packet = await Packet.findOne({ packetId });

  if (!packet) {
    throw new Error("Packet not found");
  }

  if (packet.status !== "pending") {
    return {
      success: false,
      message: "Packet is no longer pending",
      packet,
    };
  }

  if (packet.ttl <= 0) {
    packet.status = "expired";
    await packet.save();

    return {
      success: false,
      message: "Packet expired",
      packet,
    };
  }

  packet.ttl -= 1;
  packet.hopCount += 1;

  await packet.save();

  return {
    success: true,
    message: "Packet forwarded successfully",
    packet,
  };
};

module.exports = {
  forwardPacket,
};