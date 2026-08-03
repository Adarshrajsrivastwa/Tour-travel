import axiosInstance from "./axiosInstance";

/**
 * Get all onboard schedules with optional filters
 * @param {Object} params - Query parameters (page, limit, search, status, dateFrom, dateTo)
 * @returns {Promise} API response
 */
export const getAllOnboardSchedules = async function (params = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }
    if (params.status && params.status !== 'all') {
      queryParams.append('status', params.status);
    }
    if (params.dateFrom) {
      queryParams.append('dateFrom', params.dateFrom);
    }
    if (params.dateTo) {
      queryParams.append('dateTo', params.dateTo);
    }
    if (params.page) {
      queryParams.append('page', params.page);
    }
    if (params.limit) {
      queryParams.append('limit', params.limit);
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `/onboard?${queryString}` : '/onboard';
    
    const response = await axiosInstance.get(url);
    return response;
  } catch (err) {
    throw err;
  }
};

/**
 * Get onboard schedule by ID
 * @param {string} scheduleId - Schedule ID
 * @param {string} travelDate - Optional travel date (YYYY-MM-DD) to get booked seats
 * @returns {Promise} API response
 */
export const getOnboardScheduleById = async function (scheduleId, travelDate = null) {
  try {
    let url = `/onboard/${scheduleId}`;
    if (travelDate) {
      url += `?travelDate=${travelDate}`;
    }
    const response = await axiosInstance.get(url);
    return response;
  } catch (err) {
    throw err;
  }
};

/**
 * Create new onboard schedule
 * @param {Object} payload - Schedule data
 * @returns {Promise} API response
 */
export const createOnboardSchedule = async function (payload) {
  try {
    const response = await axiosInstance.post("/onboard", payload);
    return response;
  } catch (err) {
    throw err;
  }
};

/**
 * Update onboard schedule
 * @param {string} scheduleId - Schedule ID
 * @param {Object} payload - Updated schedule data
 * @returns {Promise} API response
 */
export const updateOnboardSchedule = async function (scheduleId, payload) {
  try {
    const response = await axiosInstance.put(`/onboard/${scheduleId}`, payload);
    return response;
  } catch (err) {
    throw err;
  }
};

/**
 * Delete onboard schedule
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise} API response
 */
export const deleteOnboardSchedule = async function (scheduleId) {
  try {
    const response = await axiosInstance.delete(`/onboard/${scheduleId}`);
    return response;
  } catch (err) {
    throw err;
  }
};

/**
 * Update onboard schedule status
 * @param {string} scheduleId - Schedule ID
 * @param {Object} payload - Status data (status, actualDepartureTime, actualArrivalTime, delayReason)
 * @returns {Promise} API response
 */
export const updateOnboardScheduleStatus = async function (scheduleId, payload) {
  try {
    const response = await axiosInstance.put(`/onboard/${scheduleId}/status`, payload);
    return response;
  } catch (err) {
    throw err;
  }
};

/**
 * Update assigned team for onboard schedule
 * @param {string} scheduleId - Schedule ID
 * @param {Array} assignedTeam - Array of team members
 * @returns {Promise} API response
 */
export const updateOnboardScheduleTeam = async function (scheduleId, assignedTeam) {
  try {
    const response = await axiosInstance.put(`/onboard/${scheduleId}/team`, { assignedTeam });
    return response;
  } catch (err) {
    throw err;
  }
};

