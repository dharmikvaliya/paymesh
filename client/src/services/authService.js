import api, { setAccessToken } from "./api";

export const authService = {
  async register(name, email, password) {
    const response = await api.post("/api/auth/register", {
      name,
      email,
      password,
    });
    return response.data;
  },

  async login(email, password) {
    const response = await api.post("/api/auth/login", {
      email,
      password,
    });
    if (response.data?.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  },

  async getMe() {
    const response = await api.get("/api/auth/me");
    return response.data;
  },

  async refresh() {
    const response = await api.post("/api/auth/refresh");
    if (response.data?.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  },

  async logout() {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },
};

export default authService;
