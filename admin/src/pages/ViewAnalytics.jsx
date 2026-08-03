import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Bus,
  BookOpen,
  DollarSign,
  Calendar,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";

const ViewAnalytics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reportId = location.pathname.split("/").pop();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");

  useEffect(() => {
    // Simulate API call
    const fetchReport = async () => {
      setLoading(true);
      try {
        // Simulate fetching report data
        const mockReport = {
          id: reportId,
          title: "GR Tour & Travel Performance Report",
          period: "Last 7 Days",
          generatedAt: new Date().toISOString(),
          metrics: {
            totalBookings: 1247,
            totalRevenue: 187050,
            averageRating: 4.2,
            totalUsers: 892,
            activeBuses: 45,
            totalRoutes: 23,
          },
          trends: {
            bookings: { value: 12.5, direction: "up" },
            revenue: { value: 8.3, direction: "up" },
            users: { value: 15.2, direction: "up" },
            rating: { value: 0.3, direction: "up" },
          },
          topRoutes: [
            { name: "Mumbai to Pune", bookings: 156, revenue: 23400 },
            { name: "Delhi to Agra", bookings: 134, revenue: 20100 },
            { name: "Bangalore to Chennai", bookings: 98, revenue: 14700 },
            { name: "Kolkata to Durgapur", bookings: 87, revenue: 13050 },
          ],
          topBuses: [
            { name: "Bus MH-01-AB-1234", bookings: 89, revenue: 13350 },
            { name: "Bus DL-02-CD-5678", bookings: 76, revenue: 11400 },
            { name: "Bus KA-03-EF-9012", bookings: 65, revenue: 9750 },
          ],
        };
        setReport(mockReport);
      } catch (error) {
        console.error("Error fetching report:", error);
        navigate("/analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, navigate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (direction) => {
    return direction === "up" ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTrendColor = (direction) => {
    return direction === "up" ? "text-green-600" : "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Report not found
        </h3>
        <p className="text-gray-600 mb-4">
          The report you're looking for doesn't exist.
        </p>
        <button
          onClick={() => navigate("/analytics")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Analytics
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
            onClick={() => navigate("/analytics")}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Analytics
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
            <p className="text-gray-600 mt-1">
              Report #{report.id} • {report.period}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Bookings
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {report.metrics.totalBookings.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(report.trends.bookings.direction)}
            <span
              className={`ml-2 text-sm font-medium ${getTrendColor(
                report.trends.bookings.direction
              )}`}
            >
              +{report.trends.bookings.value}%
            </span>
            <span className="ml-2 text-sm text-gray-500">vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(report.metrics.totalRevenue)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(report.trends.revenue.direction)}
            <span
              className={`ml-2 text-sm font-medium ${getTrendColor(
                report.trends.revenue.direction
              )}`}
            >
              +{report.trends.revenue.value}%
            </span>
            <span className="ml-2 text-sm text-gray-500">vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.metrics.totalUsers.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(report.trends.users.direction)}
            <span
              className={`ml-2 text-sm font-medium ${getTrendColor(
                report.trends.users.direction
              )}`}
            >
              +{report.trends.users.value}%
            </span>
            <span className="ml-2 text-sm text-gray-500">vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Average Rating
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {report.metrics.averageRating}/5
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-100">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(report.trends.rating.direction)}
            <span
              className={`ml-2 text-sm font-medium ${getTrendColor(
                report.trends.rating.direction
              )}`}
            >
              +{report.trends.rating.value}
            </span>
            <span className="ml-2 text-sm text-gray-500">vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Buses</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.metrics.activeBuses}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-100">
              <Bus className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Routes</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.metrics.totalRoutes}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-100">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Routes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Top Performing Routes
          </h3>
          <div className="space-y-4">
            {report.topRoutes.map((route, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {route.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {route.bookings} bookings
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(route.revenue)}
                  </p>
                  <p className="text-xs text-gray-500">revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Buses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Top Performing Buses
          </h3>
          <div className="space-y-4">
            {report.topBuses.map((bus, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {bus.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {bus.bookings} bookings
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(bus.revenue)}
                  </p>
                  <p className="text-xs text-gray-500">revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Report Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report ID
            </label>
            <p className="text-sm text-gray-900">#{report.id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <p className="text-sm text-gray-900">{report.period}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Generated At
            </label>
            <p className="text-sm text-gray-900">
              {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAnalytics;
