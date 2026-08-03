import axiosInstance from "./axiosInstance";

// Get all bookings with filters and pagination
export const getAllBookings = async function (params = {}) {
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
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/bookings?${queryString}` : '/bookings';
    
    const response = await axiosInstance.get(url);
    return response;
  } catch (err) {
    throw err;
  }
};

// Get booking by ID
export const getBookingById = async function (bookingId) {
  try {
    const response = await axiosInstance.get(`/bookings/${bookingId}`);
    return response;
  } catch (err) {
    throw err;
  }
};

// Get ticket details by booking ID
export const getTicketDetails = async function (bookingId) {
  try {
    const response = await axiosInstance.get(`/bookings/ticket/${bookingId}`);
    return response;
  } catch (err) {
    throw err;
  }
};

// Create ticket booking (with passenger details)
export const createTicketBooking = async function (payload) {
  try {
    const response = await axiosInstance.post("/bookings/ticket", payload);
    return response;
  } catch (err) {
    throw err;
  }
};

// Update booking
export const updateBooking = async function (bookingId, payload) {
  try {
    const response = await axiosInstance.put(`/bookings/${bookingId}`, payload);
    return response;
  } catch (err) {
    throw err;
  }
};

// Cancel booking (old endpoint - DELETE method)
export const cancelBooking = async function (bookingId, reason = null) {
  try {
    const response = await axiosInstance.delete(`/bookings/${bookingId}`, {
      data: { reason }
    });
    return response;
  } catch (err) {
    throw err;
  }
};

// Cancel ticket (new endpoint - PUT method with required reason)
export const cancelTicket = async function (bookingId, reason) {
  try {
    if (!reason || reason.trim().length < 5) {
      throw new Error('Cancellation reason is required and must be at least 5 characters long');
    }
    const response = await axiosInstance.put(`/bookings/ticket/${bookingId}/cancel`, {
      reason: reason.trim()
    });
    return response;
  } catch (err) {
    throw err;
  }
};

// Update booking status (Admin only)
export const updateBookingStatus = async function (bookingId, status, reason = null) {
  try {
    const response = await axiosInstance.put(`/bookings/${bookingId}/status`, {
      status,
      reason
    });
    return response;
  } catch (err) {
    throw err;
  }
};

// Get booking statistics (Admin only)
export const getBookingStats = async function () {
  try {
    const response = await axiosInstance.get('/bookings/stats/overview');
    return response;
  } catch (err) {
    throw err;
  }
};

