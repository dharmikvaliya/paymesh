import api from "./api";

export const walletService = {
  async getWallet() {
    const response = await api.get("/api/wallet");
    return response.data;
  },

  async fundWallet(userId, amount) {
    const response = await api.post("/api/wallet/fund", {
      userId,
      amount: Number(amount),
    });
    return response.data;
  },
};

export default walletService;
