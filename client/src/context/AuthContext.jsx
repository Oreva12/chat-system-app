import { createContext, useState, useEffect, useCallback } from "react";
import { getMe, loginUser, registerUser, logoutUser, setAuthToken } from "../api/auth.api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true); // true on first load

  // Restore session on page refresh
  useEffect(() => {
    const savedToken = sessionStorage.getItem("accessToken");
    if (savedToken) {
      setAuthToken(savedToken);
      setToken(savedToken);
      getMe()
        .then((res) => setUser(res.data.user))
        .catch(() => clearAuth())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    } 
  }, []);

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    sessionStorage.removeItem("accessToken");
  };

  // Register 
  const register = useCallback(async (formData) => {
    const res = await registerUser(formData);
    const { accessToken, user } = res.data;
    sessionStorage.setItem("accessToken", accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(user);
    return user;
  }, []);

  // Login
  const login = useCallback(async (formData) => {
    const res = await loginUser(formData);
    const { accessToken, user } = res.data;
    sessionStorage.setItem("accessToken", accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(user);
    return user;
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try { await logoutUser(); } catch (_) {}
    clearAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};