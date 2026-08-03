import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  BookOpen,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";

const ViewUser = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(`/users/${userId}`);

      if (response.data.success) {
        setUser(response.data.data);
      } else {
        setError("Failed to fetch user details");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Failed to load user details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userId = location.state?.userId;
    if (userId) {
      fetchUser(userId);
    } else {
      setError("No user ID provided");
      setLoading(false);
    }
  }, [location.state]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-4 w-4" />;
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "Cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading User
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => navigate("/users")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Users
            </button>
            <button
              onClick={() => fetchUser(location.state?.userId)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            User Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The requested user could not be found.
          </p>
          <button
            onClick={() => navigate("/users")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/users")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to User Management
          </button>
          <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
          <p className="text-gray-600 mt-1">
            View detailed information about this user
          </p>
        </div>

        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row items-center md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="bg-blue-100 rounded-full p-4">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.name}
                </h2>
                <p className="text-gray-600">User ID: {user._id}</p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      user.userType === "Buyer"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.userType}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-full p-2">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Mobile Number
                  </p>
                  <p className="text-lg text-gray-900">{user.mobile}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Email Address
                  </p>
                  <p className="text-lg text-gray-900">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 rounded-full p-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Registration Date
                  </p>
                  <p className="text-lg text-gray-900">
                    {new Date(user.registrationDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 rounded-full p-2">
                  <BookOpen className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Bookings
                  </p>
                  <p className="text-lg text-gray-900">
                    {user.bookingHistory.length} bookings
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Statistics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Booking Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {
                    user.bookingHistory.filter((b) => b.status === "Completed")
                      .length
                  }
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {
                    user.bookingHistory.filter((b) => b.status === "Pending")
                      .length
                  }
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {
                    user.bookingHistory.filter((b) => b.status === "Cancelled")
                      .length
                  }
                </div>
                <div className="text-sm text-gray-600">Cancelled</div>
              </div>
            </div>
          </div>

          {/* Booking History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Booking History
            </h3>
            {user.bookingHistory.length > 0 ? (
              <div className="space-y-4">
                {user.bookingHistory.map((booking, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {booking.route}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>{booking.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {getStatusIcon(booking.status)}
                          <span className="ml-1">{booking.status}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No booking history found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewUser;
