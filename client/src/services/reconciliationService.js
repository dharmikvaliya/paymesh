import api from "./api";

export const reconciliationService = {
  async reconcilePacket(packetId) {
    const response = await api.get(`/api/reconciliation/${encodeURIComponent(packetId)}`);
    return response.data;
  },
};

export default reconciliationService;
