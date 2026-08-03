import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  User,
  Bus,
  Route,
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
} from "lucide-react";
import { getAllRatings } from "../api/rating";

const RatingsManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Build query parameters
  const queryParams = {
    page: currentPage,
    limit: pageSize,
    ...(searchTerm && { search: searchTerm }),
    ...(filterStatus !== "all" && { status: filterStatus }),
    ...(filterRating !== "all" && { rating: parseInt(filterRating) }),
  };

  // Use React Query for fetching ratings
  const {
    data: ratingsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["ratings", queryParams],
    queryFn: () => getAllRatings(queryParams),
    keepPreviousData: true,
  });

  const ratings = ratingsData?.data?.data || [];
  const totalPages = ratingsData?.data?.pagination?.pages || 1;

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const handleViewRating = (rating) => {
    navigate(`/ratings/${rating._id}`, { state: { ratingData: rating } });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Rating Management
          </h1>
          <p className="text-gray-600 mt-1">
            View customer ratings and manage rewards
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or bus..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
            </div>
          </div>

          {/* Filter by rating */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-gray-600 mt-2">Loading ratings...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
          <p className="text-red-600">
            Error:{" "}
            {error?.response?.data?.message ||
              error?.message ||
              "Failed to fetch ratings"}
          </p>
        </div>
      )}

      {/* Ratings Table */}
      {!isLoading && !isError && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bus & Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ratings.length > 0 ? (
                  ratings.map((rating) => (
                    <tr key={rating._id} className="hover:bg-gray-50">
                      {/* Customer */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-gray-200 rounded-full p-2">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {rating.customerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {rating.customerEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Bus & Route */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Bus className="h-4 w-4 mr-2 text-gray-400" />
                          {rating.busName}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Route className="h-4 w-4 mr-2 text-gray-400" />
                          {rating.routeName}
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          {renderStars(rating.rating)}
                          <span className="text-sm text-gray-500 ml-1">
                            ({rating.rating}/5)
                          </span>
                        </div>
                      </td>

                      {/* Comments */}
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div
                          className="max-w-xs truncate"
                          title={rating.comments || "No comments"}
                        >
                          {rating.comments || "No comments"}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(rating.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewRating(rating)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No ratings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
                  {currentPage}
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingsManagement;
