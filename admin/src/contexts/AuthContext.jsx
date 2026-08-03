import { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on app start
  const loadUserFromToken = async () => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (token) {
      // First, try to use stored user data for immediate UI rendering
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (e) {
          console.error("Error parsing stored user:", e);
        }
      }
      
      // Then verify token with backend (don't block on this)
      try {
        const res = await axiosInstance.get("/auth/me");
        if (res.data.success && res.data.data) {
          const userData = res.data.data.user || res.data.data;
          setUser(userData);
          // Update stored user data
          localStorage.setItem("user", JSON.stringify(userData));
        }
      } catch (err) {
        // Only remove token if it's a 401 (unauthorized) error
        // Don't remove on network errors or other issues
        if (err.response?.status === 401) {
          console.error("Token invalid or expired", err);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        } else {
          // For other errors (network, 500, etc.), keep the token and user
          // The user can still use the app, and we'll retry on next request
          console.warn("Failed to verify token, but keeping session:", err.message);
        }
      }
    } else {
      // No token, clear user data
      localStorage.removeItem("user");
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUserFromToken();
  }, []);

  // Login function called from Login.jsx
  const login = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
