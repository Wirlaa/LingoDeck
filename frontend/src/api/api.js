import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || "/auth-api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized request (401). Authentication failed.");

      localStorage.removeItem("token");
    }

    return Promise.reject(error);
  },
);

export default api;
