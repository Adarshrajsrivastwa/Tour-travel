import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "",
});

// Add request interceptor to include auth token and handle Content-Type properly
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If we're not sending FormData, set Content-Type to application/json
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    console.log("📤 [Axios Request]", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("❌ [Axios Request Error]", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log("✅ [Axios Response]", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error("❌ [Axios Response Error]", error);
    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Request timed out!");
    }
    if (!error.response) {
      console.error("📡 Network error - no response from server");
    } else {
      console.error("🔍 Error status:", error.response.status);
      console.error("📊 Error data:", error.response.data);
    }
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      // Only redirect if not already on login page and not during initial auth check
      const isAuthCheck = error.config?.url?.includes('/auth/me');
      const isLoginPage = window.location.pathname === '/login';
      
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Don't redirect if we're already on login page or if it's the initial auth check
      // The AuthContext will handle the state update
      if (!isLoginPage && !isAuthCheck) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
