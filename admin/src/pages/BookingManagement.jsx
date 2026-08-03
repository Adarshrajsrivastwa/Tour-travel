import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  User,
  Bus,
  Route,
  Calendar,
  Clock,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import {
  getAllBookings,
  cancelBooking,
  updateBookingStatus,
} from "../api/booking";
import {
  exportBookingAmount,
  exportSalesReport,
} from "../api/export";

const BookingManagement = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [exporting, setExporting] = useState(false);

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllBookings({
        search: searchTerm,
        status: statusFilter,
        page,
        limit,
      });

      if (response.data.success) {
        setBookings(response.data.data || []);
        setPagination(response.data.pagination || pagination);
      } else {
        setError(response.data.message || "Failed to fetch bookings");
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(
        err.response?.data?.message || "Failed to fetch bookings. Please try again."
      );
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchBookings();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleConfirmBooking = async (bookingId) => {
    if (
      !window.confirm(
        "Are you sure you want to confirm this booking?"
      )
    ) {
      return;
    }

    try {
      const response = await updateBookingStatus(bookingId, "Confirmed");
      if (response.data.success) {
        alert("Booking confirmed successfully");
        fetchBookings();
      } else {
        alert(response.data.message || "Failed to confirm booking");
      }
    } catch (err) {
      console.error("Error confirming booking:", err);
      alert(
        err.response?.data?.message || "Failed to confirm booking. Please try again."
      );
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this booking? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await cancelBooking(bookingId, "Cancelled by admin");
      if (response.data.success) {
        alert("Booking cancelled successfully");
        fetchBookings();
      } else {
        alert(response.data.message || "Failed to cancel booking");
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert(
        err.response?.data?.message || "Failed to cancel booking. Please try again."
      );
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      const response = await updateBookingStatus(bookingId, newStatus);
      if (response.data.success) {
        alert("Booking status updated successfully");
        fetchBookings();
      } else {
        alert(response.data.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert(
        err.response?.data?.message || "Failed to update status. Please try again."
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Confirmed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      case "No-Show":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleExportBookingAmount = async () => {
    try {
      setExporting(true);
      await exportBookingAmount({
        status: statusFilter,
      });
      alert("Booking amount report exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      alert(
        err.response?.data?.message || "Failed to export report. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportSalesReport = async () => {
    try {
      setExporting(true);
      await exportSalesReport({});
      alert("Sales report exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      alert(
        err.response?.data?.message || "Failed to export report. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Booking Management
          </h1>
          <p className="text-gray-600 mt-1">
            View and manage customer bookings
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <button
            onClick={handleExportBookingAmount}
            disabled={exporting}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export Booking Report"}
          </button>
          <button
            onClick={handleExportSalesReport}
            disabled={exporting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export Sales Report"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings by name, mobile, email, bus, route, or booking ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No bookings found
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "No bookings have been made yet"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fare
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.bookingReference || `#${booking._id.slice(-8)}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(booking.bookingTime || booking.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {booking.passengerName || booking.userName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.userMobile}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {booking.routeName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.busName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {Array.isArray(booking.seats)
                            ? booking.seats.join(", ")
                            : booking.seats}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.totalSeats || booking.seats?.length || 0} seat(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{booking.fare}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/bookings/${booking._id}`)}
                            className="text-blue-600 hover:text-blue-900 p-1 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {(booking.status === "Pending" || booking.status === "Active") && (
                            <>
                              <button
                                onClick={() => handleConfirmBooking(booking._id)}
                                className="text-green-600 hover:text-green-900 p-1 transition-colors"
                                title="Confirm Booking"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleCancelBooking(booking._id)}
                                className="text-red-600 hover:text-red-900 p-1 transition-colors"
                                title="Cancel Booking"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {booking.status === "Confirmed" && (
                            <button
                              onClick={() => handleCancelBooking(booking._id)}
                              className="text-red-600 hover:text-red-900 p-1 transition-colors"
                              title="Cancel Booking"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} bookings
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(pagination.pages, p + 1))
                    }
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BookingManagement;
