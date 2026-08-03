import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Bus,
  BookOpen,
  MapPin,
  UserCheck,
  UserPlus,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDrivers: 0,
    totalConductors: 0,
    totalBuses: 0,
    onboardedBuses: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeRoutes: 0,
  });
  const [chartData, setChartData] = useState({
    userGrowthChart: [],
    dailyBookingTrends: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axiosInstance.get("/analytics/dashboard");

        if (response.data.success) {
          const data = response.data.data;

          // Update stats
          setStats({
            totalUsers: data.totalUsers || 0,
            totalDrivers: data.totalDrivers || 0,
            totalConductors: data.totalConductors || 0,
            totalBuses: data.totalBuses || 0,
            onboardedBuses: data.onboardedBuses || 0,
            totalBookings: data.totalBookings || 0,
            totalRevenue: data.totalRevenue || 0,
            activeRoutes: data.activeRoutes || 0,
          });

          // Update chart data
          setChartData({
            userGrowthChart: data.userGrowthChart || [],
            dailyBookingTrends: data.dailyBookingTrends || [],
          });
        } else {
          setError("Failed to fetch dashboard data");
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "blue",
      route: "/users",
    },
    {
      title: "Total Drivers",
      value: stats.totalDrivers,
      icon: UserCheck,
      color: "green",
      route: "/drivers",
    },
    {
      title: "Total Conductors",
      value: stats.totalConductors,
      icon: UserPlus,
      color: "purple",
      route: "/drivers",
    },
    {
      title: "Total Buses",
      value: stats.totalBuses,
      icon: Bus,
      color: "orange",
      route: "/buses",
    },
    {
      title: "Onboarded Buses",
      value: stats.onboardedBuses,
      icon: MapPin,
      color: "indigo",
      route: "/onboard",
    },
    {
      title: "Total Bookings",
      value: stats.totalBookings,
      icon: BookOpen,
      color: "yellow",
      route: "/bookings",
    },
  ];

  const handleCardClick = (route) => {
    navigate(route);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome to GR Tour & Travel Dashboard
          </h1>
          <p className="text-blue-100">
            Monitor and manage your GR Tour & Travel operations efficiently
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome to GR Tour & Travel Dashboard
          </h1>
          <p className="text-blue-100">
            Monitor and manage your GR Tour & Travel operations efficiently
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome to GR Tour & Travel Dashboard
        </h1>
        <p className="text-blue-100">
          Monitor and manage your GR Tour & Travel operations efficiently
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all duration-200"
              onClick={() => handleCardClick(stat.route)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
                <p className="text-sm mr-auto ml-4 font-medium text-gray-600 mb-1">
                  {stat.title}
                </p>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <p className="text-2xl px-4 font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
            <p className="text-sm text-gray-600">
              Monthly user registration trends
            </p>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between space-x-2">
              {chartData.userGrowthChart.map((data, index) => {
                // Calculate height based on max value (minimum height for visibility)
                const maxUsers = Math.max(
                  ...chartData.userGrowthChart.map((d) => d.users),
                  1
                );
                const heightPercentage = Math.max(
                  (data.users / maxUsers) * 100,
                  5
                ); // Minimum 5% height
                const heightClass =
                  heightPercentage > 80
                    ? "h-48"
                    : heightPercentage > 60
                    ? "h-40"
                    : heightPercentage > 40
                    ? "h-32"
                    : heightPercentage > 20
                    ? "h-24"
                    : heightPercentage > 5
                    ? "h-16"
                    : "h-8"; // Minimum height for zero values

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={`w-full ${
                        data.users > 0
                          ? "bg-blue-500 hover:bg-blue-600"
                          : "bg-gray-300"
                      } rounded-t ${heightClass} mb-2 transition-colors`}
                    ></div>
                    <span className="text-xs text-gray-600">{data.month}</span>
                    <span
                      className={`text-xs font-medium ${
                        data.users > 0 ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {data.users}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">New Users</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Bookings Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Booking Trends
            </h3>
            <p className="text-sm text-gray-600">
              Daily booking volume over the last 7 days
            </p>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between space-x-2">
              {chartData.dailyBookingTrends.map((data, index) => {
                // Calculate height based on max value (minimum height for visibility)
                const maxBookings = Math.max(
                  ...chartData.dailyBookingTrends.map((d) => d.bookings),
                  1
                );
                const heightPercentage = Math.max(
                  (data.bookings / maxBookings) * 100,
                  5
                ); // Minimum 5% height
                const heightClass =
                  heightPercentage > 80
                    ? "h-48"
                    : heightPercentage > 60
                    ? "h-40"
                    : heightPercentage > 40
                    ? "h-32"
                    : heightPercentage > 20
                    ? "h-24"
                    : heightPercentage > 5
                    ? "h-16"
                    : "h-8"; // Minimum height for zero values

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={`w-full ${
                        data.bookings > 0
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-gray-300"
                      } rounded-t ${heightClass} mb-2 transition-colors`}
                    ></div>
                    <span className="text-xs text-gray-600">{data.day}</span>
                    <span
                      className={`text-xs font-medium ${
                        data.bookings > 0 ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {data.bookings}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Daily Bookings</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
