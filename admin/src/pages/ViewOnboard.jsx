import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Bus,
  Route,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  User,
  UserCheck,
  MapPin,
  Navigation,
  Grid,
} from "lucide-react";
import SeatMapEditor from "../components/SeatMapEditor";
import { getOnboardScheduleById } from "../api/onboard";

const ViewOnboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const onboardData = location.state?.onboardData;
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!onboardData) {
      navigate("/onboard");
      return;
    }

    // Fetch schedule with booked seats for the travel date
    const fetchScheduleWithBookings = async () => {
      if (!onboardData._id && !onboardData.id) return;
      
      setLoading(true);
      try {
        const scheduleId = onboardData._id || onboardData.id;
        // Format date as YYYY-MM-DD for the API
        const travelDate = onboardData.date 
          ? new Date(onboardData.date).toISOString().split('T')[0]
          : null;
        
        const response = await getOnboardScheduleById(scheduleId, travelDate);
        const data = response?.data?.data || response?.data;
        setScheduleData(data);
      } catch (error) {
        console.error('Error fetching schedule with bookings:', error);
        // Fall back to onboardData if API call fails
        setScheduleData(onboardData);
      } finally {
        setLoading(false);
      }
    };

    fetchScheduleWithBookings();
  }, [onboardData, navigate]);

  if (!onboardData) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Scheduled":
        return "bg-blue-100 text-blue-800";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/onboard")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Onboard Management
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Trip Schedule Details
              </h1>
              <p className="text-gray-600 mt-1">
                View complete trip information and crew assignment
              </p>
            </div>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() =>
                  navigate("/add-onboard", {
                    state: { isEdit: true, onboardData: onboardData },
                  })
                }
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this schedule?"
                    )
                  ) {
                    alert("Schedule deleted successfully!");
                    navigate("/onboard");
                  }
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Trip Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row items-center md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="shrink-0">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bus className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {onboardData.busName}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      onboardData.status
                    )}`}
                  >
                    {onboardData.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Route className="h-4 w-4 mr-2 text-gray-400" />
                    {onboardData.routeName}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {formatDate(onboardData.date)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    {formatTime(onboardData.time)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Bus className="h-5 w-5 mr-2" />
              Trip Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Bus</label>
                <p className="text-sm text-gray-900">{onboardData.busName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Route
                </label>
                <p className="text-sm text-gray-900">{onboardData.routeName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Date
                </label>
                <p className="text-sm text-gray-900">
                  {formatDate(onboardData.date)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Time
                </label>
                <p className="text-sm text-gray-900">
                  {formatTime(onboardData.time)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <p className="text-sm text-gray-900">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      onboardData.status
                    )}`}
                  >
                    {onboardData.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Crew Assignment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Crew Assignment ({onboardData.assignedTeam.length} members)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Drivers */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Drivers
                </h4>
                <div className="space-y-2">
                  {onboardData.assignedTeam
                    .filter((member) => member.role === "Driver")
                    .map((driver) => (
                      <div
                        key={driver.id}
                        className="flex items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="bg-blue-100 rounded-full p-2 mr-3">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {driver.name}
                          </p>
                          <p className="text-xs text-gray-500">Driver</p>
                        </div>
                      </div>
                    ))}
                  {onboardData.assignedTeam.filter(
                    (member) => member.role === "Driver"
                  ).length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      No drivers assigned
                    </p>
                  )}
                </div>
              </div>

              {/* Conductors */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Conductors
                </h4>
                <div className="space-y-2">
                  {onboardData.assignedTeam
                    .filter((member) => member.role === "Conductor")
                    .map((conductor) => (
                      <div
                        key={conductor.id}
                        className="flex items-center p-3 bg-green-50 rounded-lg"
                      >
                        <div className="bg-green-100 rounded-full p-2 mr-3">
                          <UserCheck className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {conductor.name}
                          </p>
                          <p className="text-xs text-gray-500">Conductor</p>
                        </div>
                      </div>
                    ))}
                  {onboardData.assignedTeam.filter(
                    (member) => member.role === "Conductor"
                  ).length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      No conductors assigned
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Pricing Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Base Amount</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{onboardData.pricing.baseAmount}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <Navigation className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Per KM Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{onboardData.pricing.perKmRate}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Total Fare</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₹{onboardData.pricing.totalFare}
                </p>
              </div>
            </div>
          </div>

          {/* Seat Layout Preview with Booked Seats */}
          {(scheduleData?.busId?.seatLayout || onboardData?.busId?.seatLayout) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Grid className="h-5 w-5 mr-2" />
                Seat Layout & Booking Status
                {loading && (
                  <span className="ml-2 text-sm text-gray-500">(Loading...)</span>
                )}
              </h3>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading seat layout and booking information...
                </div>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Total Seats</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {scheduleData?.busId?.seatLayout?.totalSeats || scheduleData?.busId?.seatCapacity || onboardData?.busId?.seatCapacity || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg border border-rose-200 shadow-sm">
                      <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">Booked Seats</p>
                      <p className="text-2xl font-bold text-rose-700">
                        {scheduleData?.bookedSeats?.length || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200 shadow-sm">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Available Seats</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {scheduleData?.availableSeats !== null && scheduleData?.availableSeats !== undefined
                          ? scheduleData.availableSeats
                          : ((scheduleData?.busId?.seatLayout?.totalSeats || scheduleData?.busId?.seatCapacity || onboardData?.busId?.seatCapacity || 0) - (scheduleData?.bookedSeats?.length || 0))}
                      </p>
                    </div>
                  </div>
                  <SeatMapEditor
                    value={scheduleData?.busId?.seatLayout || onboardData?.busId?.seatLayout}
                    onChange={() => {}}
                    readOnly={true}
                    bookedSeats={scheduleData?.bookedSeats || []}
                  />
                </>
              )}
            </div>
          )}

          {/* Trip Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Trip Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Bus Details
                </h4>
                <p className="text-sm text-gray-600">{onboardData.busName}</p>
                <p className="text-xs text-gray-500">
                  Scheduled for {formatDate(onboardData.date)} at{" "}
                  {formatTime(onboardData.time)}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Route Details
                </h4>
                <p className="text-sm text-gray-600">{onboardData.routeName}</p>
                <p className="text-xs text-gray-500">
                  Total fare: ₹{onboardData.pricing.totalFare}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile App Behavior Info */}
          {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Bus className="h-5 w-5 mr-2" />
              Mobile App Behavior
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="bg-yellow-100 rounded-full p-2">
                    <Bus className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">On Board Status</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    On {formatDate(onboardData.date)} at {formatTime(onboardData.time)}, this bus will appear as "On Board" 
                    in the mobile app with seat availability and route summary for customers to book.
                  </p>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default ViewOnboard;
