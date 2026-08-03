import axiosInstance from "./axiosInstance";

/**
 * Export booking amount report
 * @param {Object} params - Query parameters (startDate, endDate, status)
 * @returns {Promise} CSV file download
 */
export const exportBookingAmount = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);
    if (params.status && params.status !== "all") {
      queryParams.append("status", params.status);
    }

    const response = await axiosInstance.get(
      `/exports/booking-amount?${queryParams.toString()}`,
      {
        responseType: "blob", // Important for file downloads
      }
    );

    // Create blob and download
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `booking_amount_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (err) {
    console.error("Export booking amount error:", err);
    throw err;
  }
};

/**
 * Export sales report
 * @param {Object} params - Query parameters (startDate, endDate)
 * @returns {Promise} CSV file download
 */
export const exportSalesReport = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);

    const response = await axiosInstance.get(
      `/exports/sales-report?${queryParams.toString()}`,
      {
        responseType: "blob",
      }
    );

    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sales_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (err) {
    console.error("Export sales report error:", err);
    throw err;
  }
};

/**
 * Export user report
 * @returns {Promise} CSV file download
 */
export const exportUserReport = async () => {
  try {
    const response = await axiosInstance.get("/exports/user-report", {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `user_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (err) {
    console.error("Export user report error:", err);
    throw err;
  }
};

/**
 * Export driver report
 * @returns {Promise} CSV file download
 */
export const exportDriverReport = async () => {
  try {
    const response = await axiosInstance.get("/exports/driver-report", {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `driver_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (err) {
    console.error("Export driver report error:", err);
    throw err;
  }
};

/**
 * Export bus report
 * @returns {Promise} CSV file download
 */
export const exportBusReport = async () => {
  try {
    const response = await axiosInstance.get("/exports/bus-report", {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bus_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (err) {
    console.error("Export bus report error:", err);
    throw err;
  }
};

