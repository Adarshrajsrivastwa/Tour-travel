import axiosInstance from "./axiosInstance";

/**
 * Request admin password reset OTP
 * @param {string} email - Admin email address
 * @returns {Promise} API response
 */
export const requestAdminPasswordReset = async (email) => {
  try {
    const response = await axiosInstance.post("/admin/reset-password", { email });
    return response;
  } catch (err) {
    throw err;
  }
};

/**
 * Verify OTP for admin password reset
 * @param {string} email - Admin email address
 * @param {string} otp - OTP code
 * @returns {Promise} API response
 */
export const verifyAdminOTP = async (email, otp) => {
  try {
    const response = await axiosInstance.post("/auth/verify-otp", { email, otp });
    return response;
  } catch (err) {
    throw err;
  }
};

/**
 * Reset admin password after OTP verification
 * @param {string} email - Admin email address
 * @param {string} newPassword - New password
 * @returns {Promise} API response
 */
export const resetAdminPassword = async (email, newPassword) => {
  try {
    const response = await axiosInstance.post("/auth/reset-password", { email, newPassword });
    return response;
  } catch (err) {
    throw err;
  }
};

