import api from "./api";

export const packetService = {
  async createPacket({ receiverId, amount, ttl = 5 }) {
    const response = await api.post("/api/packets/create", {
      receiverId,
      amount: Number(amount),
      ttl: Number(ttl),
    });
    return response.data;
  },

  async getPackets() {
    const response = await api.get("/api/packets");
    return response.data;
  },

  async getPacketById(packetId) {
    const response = await api.get(`/api/packets/${encodeURIComponent(packetId)}`);
    return response.data;
  },
};

export default packetService;
