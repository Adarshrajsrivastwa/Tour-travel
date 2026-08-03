import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, User, Bus, Route, ArrowLeft, MessageCircle } from "lucide-react";
import { getRatingById } from "../api/rating";

const ViewRating = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get initial rating data from state if available
  const initialRating = location.state?.ratingData;

  // Fetch rating details
  const {
    data: ratingResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["rating", id],
    queryFn: () => getRatingById(id),
    initialData: initialRating ? { data: { data: initialRating } } : undefined,
    enabled: !!id,
  });

  const rating = ratingResponse?.data?.data || initialRating;

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError || !rating) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </button>
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
          <p className="text-red-600">
            Error: {error?.response?.data?.message || "Failed to fetch rating"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Rating Details</h1>
        <div></div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Rating Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {/* Rating Score */}
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                {renderStars(rating.rating)}
                <span className="text-3xl font-bold text-gray-900 ml-2">
                  {rating.rating}/5
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Overall Rating
              </h2>
            </div>

            {/* Customer Info */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-400" />
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-gray-900 font-medium">
                    {rating.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900 font-medium">
                    {rating.customerEmail}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mobile</p>
                  <p className="text-gray-900 font-medium">
                    {rating.customerMobile}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rating Date</p>
                  <p className="text-gray-900 font-medium">
                    {new Date(rating.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bus className="h-5 w-5 mr-2 text-gray-400" />
                Service Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Bus Name</p>
                  <p className="text-gray-900 font-medium">{rating.busName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Route</p>
                  <p className="text-gray-900 font-medium">
                    {rating.routeName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Travel Date</p>
                  <p className="text-gray-900 font-medium">
                    {new Date(rating.travelDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-gray-400" />
                Customer Comments
              </h3>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-4">
                {rating.comments || "No comments provided"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewRating;
