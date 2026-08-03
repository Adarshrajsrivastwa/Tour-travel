import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Users,
  Bus,
  BookOpen,
  DollarSign,
  Calendar,
  Download,
  Eye,
  Loader2,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import { exportSalesReport } from "../api/export";

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    totalUsers: 0,
    dailyRevenueTrends: [],
    dailyBookingTrends: [],
    monthlyRevenueTrends: [],
    monthlyBookingTrends: [],
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get("/analytics/overview");
        
        if (response.data.success) {
          setAnalytics(response.data.data);
        } else {
          setError("Failed to fetch analytics data");
        }
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Failed to load analytics data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMaxValue = (data, key) => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((item) => item[key] || 0), 1);
  };

  const getHeightClass = (value, maxValue) => {
    if (maxValue === 0) return "h-4";
    const percentage = (value / maxValue) * 100;
    if (percentage >= 90) return "h-48";
    if (percentage >= 80) return "h-44";
    if (percentage >= 70) return "h-40";
    if (percentage >= 60) return "h-36";
    if (percentage >= 50) return "h-32";
    if (percentage >= 40) return "h-28";
    if (percentage >= 30) return "h-24";
    if (percentage >= 20) return "h-20";
    if (percentage >= 10) return "h-16";
    if (percentage >= 5) return "h-12";
    return "h-8";
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

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(analytics.totalRevenue),
      icon: DollarSign,
      color: "green",
    },
    {
      title: "Total Bookings",
      value: analytics.totalBookings.toLocaleString(),
      icon: BookOpen,
      color: "blue",
    },
    {
      title: "Total Users",
      value: analytics.totalUsers.toLocaleString(),
      icon: Users,
      color: "purple",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Analytics & Reports
          </h1>
          <p className="text-gray-600 mt-1">
            View performance metrics and generate reports
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
              {/* <div className="mt-4 flex items-center">
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === "positive"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  vs last period
                </span>
              </div> */}
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trend
          </h3>
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Revenue chart will be implemented here
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Booking Trends
          </h3>
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Booking trends chart will be implemented here
              </p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Bookings Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Revenue Trends
            </h3>
            <p className="text-sm text-gray-600">
              Daily revenue volume over the last 7 days
            </p>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between space-x-2">
              {analytics.dailyRevenueTrends && analytics.dailyRevenueTrends.length > 0 ? (
                (() => {
                  const maxRevenue = getMaxValue(analytics.dailyRevenueTrends, "revenue");
                  return analytics.dailyRevenueTrends.map((data, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-full bg-green-500 rounded-t ${getHeightClass(data.revenue, maxRevenue)} mb-2 hover:bg-green-600 transition-colors`}
                      ></div>
                      <span className="text-xs text-gray-600">{data.day}</span>
                      <span className="text-xs font-medium text-gray-900">
                        ₹{data.revenue.toLocaleString()}
                      </span>
                    </div>
                  ));
                })()
              ) : (
                <div className="w-full text-center text-gray-500 py-8">
                  No revenue data available
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Daily Revenue</span>
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
              {analytics.dailyBookingTrends && analytics.dailyBookingTrends.length > 0 ? (
                (() => {
                  const maxBookings = getMaxValue(analytics.dailyBookingTrends, "bookings");
                  return analytics.dailyBookingTrends.map((data, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-full bg-yellow-400 rounded-t ${getHeightClass(data.bookings, maxBookings)} mb-2 hover:bg-yellow-500 transition-colors`}
                      ></div>
                      <span className="text-xs text-gray-600">{data.day}</span>
                      <span className="text-xs font-medium text-gray-900">
                        {data.bookings}
                      </span>
                    </div>
                  ));
                })()
              ) : (
                <div className="w-full text-center text-gray-500 py-8">
                  No booking data available
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Daily Bookings</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Revenue Trend
            </h3>
            <p className="text-sm text-gray-600">Monthly revenue trends</p>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between space-x-2">
              {analytics.monthlyRevenueTrends && analytics.monthlyRevenueTrends.length > 0 ? (
                (() => {
                  const maxRevenue = getMaxValue(analytics.monthlyRevenueTrends, "revenue");
                  return analytics.monthlyRevenueTrends.map((data, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-full bg-blue-500 rounded-t ${getHeightClass(data.revenue, maxRevenue)} mb-2 hover:bg-blue-600 transition-colors`}
                      ></div>
                      <span className="text-xs text-gray-600">{data.month}</span>
                      <span className="text-xs font-medium text-gray-900">
                        ₹{data.revenue.toLocaleString()}
                      </span>
                    </div>
                  ));
                })()
              ) : (
                <div className="w-full text-center text-gray-500 py-8">
                  No revenue data available
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthy booking Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Booking Trend
            </h3>
            <p className="text-sm text-gray-600">Monthly booking trends</p>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between space-x-2">
              {analytics.monthlyBookingTrends && analytics.monthlyBookingTrends.length > 0 ? (
                (() => {
                  const maxBookings = getMaxValue(analytics.monthlyBookingTrends, "bookings");
                  return analytics.monthlyBookingTrends.map((data, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-full bg-orange-400 rounded-t ${getHeightClass(data.bookings, maxBookings)} mb-2 hover:bg-orange-500 transition-colors`}
                      ></div>
                      <span className="text-xs text-gray-600">{data.month}</span>
                      <span className="text-xs font-medium text-gray-900">
                        {data.bookings}
                      </span>
                    </div>
                  ));
                })()
              ) : (
                <div className="w-full text-center text-gray-500 py-8">
                  No booking data available
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Bookings</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
