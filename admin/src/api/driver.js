import axiosInstance from "./axiosInstance";

export const getAllDriver = async function (params = {}) {
  try {
    // Build query string from parameters
    const queryParams = new URLSearchParams();
    
    // Only add search parameter if it's not empty after trimming
    if (params.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }
    if (params.role && params.role !== 'all') queryParams.append('role', params.role);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/drivers?${queryString}` : '/drivers';
    
    const drivers = await axiosInstance.get(url);
    return drivers;
  } catch (err) {
    throw err;
  }
};

export const createDriver = async function (payload) {
  try {
    const driver = await axiosInstance.post("/drivers", payload);
    return driver;
  } catch (err) {
    throw err;
  }
};

export const deleteDriver = async function (driverId) {
  try {
    const response = await axiosInstance.delete(`/drivers/${driverId}`);
    return response;
  } catch (err) {
    throw err;
  }
};
