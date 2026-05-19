import axios from "axios";
import { toast } from "react-toastify";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const TokenService = {
  getAccessToken:  () => localStorage.getItem("access"),
  getRefreshToken: () => localStorage.getItem("refresh"),
  setTokens: (access, refresh) => {
    if (access)  localStorage.setItem("access",  access);
    if (refresh) localStorage.setItem("refresh", refresh);
  },
  removeTokens: () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },
  isTokenExpired: (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 < Date.now();
    } catch { return true; }
  },
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

const redirectToLogin = () => {
  if (window.location.pathname !== "/login") window.location.href = "/login";
};

// ── Request interceptor: attach token ─────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = TokenService.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 + refresh ────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    if (!error.response) {
      toast.error("Network error. Check your connection.");
      return Promise.reject(error);
    }

    const { status } = error.response;

    if (status === 401 && !orig._retry) {
      if (orig.url?.includes("/refresh/")) {
        TokenService.removeTokens();
        redirectToLogin();
        return Promise.reject(error);
      }
      orig._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => { orig.headers.Authorization = `Bearer ${token}`; resolve(api(orig)); },
            reject,
          });
        });
      }

      const refresh = TokenService.getRefreshToken();
      if (!refresh || TokenService.isTokenExpired(refresh)) {
        TokenService.removeTokens();
        redirectToLogin();
        return Promise.reject(error);
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/refresh/`, { refresh });
        TokenService.setTokens(data.access, data.refresh ?? refresh);
        processQueue(null, data.access);
        orig.headers.Authorization = `Bearer ${data.access}`;
        return api(orig);
      } catch (err) {
        processQueue(err, null);
        TokenService.removeTokens();
        redirectToLogin();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // Generic error toasts
    if (!orig?.skipAuth) {
      const msg = error.response?.data?.detail || error.response?.data?.error;
      if (msg) {
        toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
      } else {
        const fallback = {
          400: "Bad request. Check your input.",
          403: "Not authorized.",
          404: "Resource not found.",
          500: "Server error. Try again later.",
        };
        toast.error(fallback[status] || "Something went wrong.");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
