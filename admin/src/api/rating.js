import axiosInstance from "./axiosInstance";

// Get all ratings with filters and pagination (Admin)
export const getAllRatings = async function (params = {}) {
  try {
    const queryParams = new URLSearchParams();

    if (params.search && params.search.trim()) {
      queryParams.append("search", params.search.trim());
    }
    if (params.status && params.status !== "all") {
      queryParams.append("status", params.status);
    }
    if (params.rating) {
      queryParams.append("rating", params.rating);
    }
    if (params.dateFrom) {
      queryParams.append("dateFrom", params.dateFrom);
    }
    if (params.dateTo) {
      queryParams.append("dateTo", params.dateTo);
    }
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const queryString = queryParams.toString();
    const url = queryString ? `/ratings?${queryString}` : "/ratings";

    const response = await axiosInstance.get(url);
    return response;
  } catch (err) {
    throw err;
  }
};

// Get rating by ID
export const getRatingById = async function (ratingId) {
  try {
    const response = await axiosInstance.get(`/ratings/${ratingId}`);
    return response;
  } catch (err) {
    throw err;
  }
};

// Create new rating (User)
export const createRating = async function (payload) {
  try {
    const response = await axiosInstance.post("/ratings", payload);
    return response;
  } catch (err) {
    throw err;
  }
};

// Update rating
export const updateRating = async function (ratingId, payload) {
  try {
    const response = await axiosInstance.put(`/ratings/${ratingId}`, payload);
    return response;
  } catch (err) {
    throw err;
  }
};

// Delete rating
export const deleteRating = async function (ratingId) {
  try {
    const response = await axiosInstance.delete(`/ratings/${ratingId}`);
    return response;
  } catch (err) {
    throw err;
  }
};

// Update rating status (Admin only)
export const updateRatingStatus = async function (
  ratingId,
  status,
  adminResponse = null
) {
  try {
    const payload = { status };
    if (adminResponse) {
      payload.adminResponse = adminResponse;
    }
    const response = await axiosInstance.put(
      `/ratings/${ratingId}/status`,
      payload
    );
    return response;
  } catch (err) {
    throw err;
  }
};

// Mark rating as helpful
export const markRatingHelpful = async function (ratingId) {
  try {
    const response = await axiosInstance.post(`/ratings/${ratingId}/helpful`);
    return response;
  } catch (err) {
    throw err;
  }
};

// Report rating
export const reportRating = async function (
  ratingId,
  reason,
  description = null
) {
  try {
    const payload = { reason };
    if (description) {
      payload.description = description;
    }
    const response = await axiosInstance.post(
      `/ratings/${ratingId}/report`,
      payload
    );
    return response;
  } catch (err) {
    throw err;
  }
};

// Get rating statistics (Admin only)
export const getRatingStats = async function () {
  try {
    const response = await axiosInstance.get("/ratings/stats/overview");
    return response;
  } catch (err) {
    throw err;
  }
};
