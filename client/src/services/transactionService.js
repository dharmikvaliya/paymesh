import api from "./api";

export const transactionService = {
  async getTransactions() {
    const response = await api.get("/api/transactions");
    return response.data;
  },

  async sendMoney({ receiverId, amount, type = "online", description = "", idempotencyKey }) {
    const idKey = idempotencyKey || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    const response = await api.post(
      "/api/transactions/send",
      {
        receiverId,
        amount: Number(amount),
        type,
        description,
      },
      {
        headers: {
          "Idempotency-Key": idKey,
        },
      }
    );
    return response.data;
  },
};

export default transactionService;
