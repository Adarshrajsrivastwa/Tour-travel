import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  User,
  Bus,
  Route,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  getBookingById,
} from "../api/booking";

const ViewBooking = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getBookingById(id);

        if (response.data.success) {
          const bookingData = response.data.data;
          setBooking(bookingData);
        } else {
          setError(response.data.message || "Booking not found");
        }
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError(
          err.response?.data?.message || "Failed to fetch booking details"
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBooking();
    }
  }, [id]);

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

  const getStatusIcon = (status) => {
    switch (status) {
      case "Active":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "Confirmed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "Pending":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "Cancelled":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "Completed":
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || "Booking not found"}
        </h3>
        <p className="text-gray-600 mb-4">
          The booking you're looking for doesn't exist or couldn't be loaded.
        </p>
        <button
          onClick={() => navigate("/bookings")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/bookings")}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Bookings
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Booking Details
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {booking.bookingReference || `Booking #${booking._id.slice(-8)}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Booking Information
              </h3>
              <div className="flex items-center space-x-2">
                {getStatusIcon(booking.status)}
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Booking ID
                </label>
                <p className="text-sm text-gray-900">
                  {booking.bookingReference || `#${booking._id.slice(-8)}`}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Booking Date
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(booking.bookingTime || booking.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Travel Date
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(booking.travelDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seats
                </label>
                <p className="text-sm text-gray-900">
                  {Array.isArray(booking.seats)
                    ? booking.seats.join(", ")
                    : booking.seats}{" "}
                  ({booking.totalSeats || booking.seats?.length || 0} seat
                  {booking.totalSeats !== 1 ? "s" : ""})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Fare
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  ₹{booking.fare}
                </p>
              </div>
            </div>
          </div>

          {/* Route Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Route className="h-5 w-5 mr-2" />
                Route Information
              </h3>
              {booking.routeName && (
                <p className="text-sm text-gray-600">{booking.routeName}</p>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {booking.source || booking.routeId?.startPoint || booking.routeName?.split(' to ')[0] || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">Source</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {booking.departureTime}
                  </p>
                  <p className="text-xs text-gray-500">Departure</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {booking.destination || (booking.routeId?.stops && Array.isArray(booking.routeId.stops) && booking.routeId.stops.length > 0
                        ? booking.routeId.stops[booking.routeId.stops.length - 1].name
                        : booking.routeName?.split(' to ')[1]) || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">Destination</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {booking.arrivalTime}
                  </p>
                  <p className="text-xs text-gray-500">Arrival</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bus Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Bus className="h-5 w-5 mr-2" />
              Bus Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bus Name
                </label>
                <p className="text-sm text-gray-900">{booking.busName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bus Number
                </label>
                <p className="text-sm text-gray-900">{booking.busNumber}</p>
              </div>
              {booking.driverName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver
                  </label>
                  <p className="text-sm text-gray-900">{booking.driverName}</p>
                </div>
              )}
              {booking.conductorName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conductor
                  </label>
                  <p className="text-sm text-gray-900">
                    {booking.conductorName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Customer Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <p className="text-sm text-gray-900">
                  {booking.passengerName || booking.userName}
                </p>
              </div>
              {booking.age && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <p className="text-sm text-gray-900">{booking.age}</p>
                </div>
              )}
              {booking.gender && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <p className="text-sm text-gray-900">{booking.gender}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile
                </label>
                <p className="text-sm text-gray-900">{booking.userMobile}</p>
              </div>
              {booking.altContactNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alt. Contact
                  </label>
                  <p className="text-sm text-gray-900">
                    {booking.altContactNumber}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-sm text-gray-900">{booking.userEmail}</p>
              </div>
              {(booking.city || booking.state) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <p className="text-sm text-gray-900">
                    {[booking.city, booking.state].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ViewBooking;
