import axiosInstance from "./axiosInstance";

export const login = async function (payload) {
  try {
    const loginUser = await axiosInstance.post("/auth/admin-login", payload);

    return loginUser;
  } catch (err) {
    throw err;
  }
};
