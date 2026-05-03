import axios from "axios";

// Base axios instance — all requests go through here
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // sends httpOnly refresh token cookie automatically
});

// Auth API calls
export const registerUser = (data) => api.post("/auth/register", data);
export const loginUser    = (data) => api.post("/auth/login", data);
export const logoutUser   = ()     => api.post("/auth/logout");
export const getMe        = ()     => api.get("/auth/me");

// Attach access token to every request automatically
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export default api;