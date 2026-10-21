import api from "./api";

export const meshService = {
  async forwardPacket(packetId) {
    const response = await api.post("/api/mesh/forward", {
      packetId,
    });
    return response.data;
  },
};

export default meshService;
