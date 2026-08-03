import axiosInstance from "./axiosInstance";

export const createRoute = async (payload) => {
  const { data } = await axiosInstance.post("/routes", payload);
  return data;
};

export const updateRoute = async (routeId, payload) => {
  const { data } = await axiosInstance.put(`/routes/${routeId}`, payload);
  return data;
};

export const fetchRoutes = async (params = {}) => {
  const { data } = await axiosInstance.get("/routes", { params });
  return data;
};

export const fetchRouteById = async (routeId) => {
  const { data } = await axiosInstance.get(`/routes/${routeId}`);
  return data;
};

export const deleteRoute = async (routeId) => {
  const { data } = await axiosInstance.delete(`/routes/${routeId}`);
  return data;
};


