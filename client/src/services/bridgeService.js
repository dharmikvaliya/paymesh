import api from "./api";

export const bridgeService = {
  async deliverPacket(packetId) {
    const response = await api.post("/api/bridge/deliver", {
      packetId,
    });
    return response.data;
  },
};

export default bridgeService;
