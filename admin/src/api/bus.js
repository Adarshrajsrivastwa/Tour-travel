import axiosInstance from "./axiosInstance";

export const getAllBuses = async function (params = {}) {
  try {
    // Build query string from parameters
    const queryParams = new URLSearchParams();
    
    // Only add search parameter if it's not empty after trimming
    if (params.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.architecture && params.architecture !== 'all') queryParams.append('architecture', params.architecture);
    if (params.acType && params.acType !== 'all') queryParams.append('acType', params.acType);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/buses?${queryString}` : '/buses';
    
    const buses = await axiosInstance.get(url);
    return buses;
  } catch (err) {
    throw err;
  }
};

export const createBus = async function (payload) {
  try {
    console.log("🌐 [API] createBus calling /buses endpoint...");
    const bus = await axiosInstance.post("/buses", payload);
    console.log("✅ [API] createBus Success! Response:", bus.data);
    return bus;
  } catch (err) {
    console.error("❌ [API] createBus ERROR thrown from axiosInstance:");
    console.error("   - Error Message:", err.message);
    console.error("   - Error Code:", err.code);
    console.error("   - Response exists?", !!err.response);
    if (err.response) {
      console.error("   - Response status:", err.response.status);
      console.error("   - Response data:", err.response.data);
    }
    throw err;
  }
};

export const updateBus = async function (busId, payload) {
  try {
    const response = await axiosInstance.put(`/buses/${busId}`, payload);
    return response;
  } catch (err) {
    throw err;
  }
};

export const deleteBus = async function (busId) {
  try {
    const response = await axiosInstance.delete(`/buses/${busId}`);
    return response;
  } catch (err) {
    throw err;
  }
};

export const getBusById = async function (busId) {
  try {
    console.log('API Call - getBusById:', busId);
    console.log('API Call - Base URL:', axiosInstance.defaults.baseURL);
    const response = await axiosInstance.get(`/buses/${busId}`);
    console.log('API Call - Response:', response);
    return response;
  } catch (err) {
    console.error('API Call - Error:', err);
    throw err;
  }
};

export const getBusTrips = async function (busId) {
  try {
    const response = await axiosInstance.get(`/buses/${busId}/trips`);
    return response;
  } catch (err) {
    throw err;
  }
};

export const updateBusStatus = async function (busId, status) {
  try {
    const response = await axiosInstance.put(`/buses/${busId}/status`, { status });
    return response;
  } catch (err) {
    throw err;
  }
};

export const addMaintenanceRecord = async function (busId, maintenanceData) {
  try {
    const response = await axiosInstance.post(`/buses/${busId}/maintenance`, maintenanceData);
    return response;
  } catch (err) {
    throw err;
  }
};

export const getBusStats = async function () {
  try {
    const response = await axiosInstance.get('/buses/stats/overview');
    return response;
  } catch (err) {
    throw err;
  }
};
