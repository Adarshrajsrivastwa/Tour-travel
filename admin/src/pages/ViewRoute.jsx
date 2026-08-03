import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchRouteById, deleteRoute } from "../api/route";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Route,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Navigation,
  ArrowRight,
  ArrowDown,
  CheckCircle,
} from "lucide-react";

const ViewRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [routeDataFromNav] = useState(location.state?.routeData || null);
  const routeId = location.state?.routeId || routeDataFromNav?._id;

  const { data: routeResponse, isLoading, isError } = useQuery({
    queryKey: ["route", routeId],
    queryFn: async () => await fetchRouteById(routeId),
    enabled: !!routeId && !routeDataFromNav,
  });

  const routeData = routeDataFromNav || routeResponse?.data || null;

  useEffect(() => {
    if (!routeId) navigate("/routes");
    if (isError) navigate("/routes");
  }, [routeId, isError, navigate]);

  if (!routeData && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>Loading route...</span>
        </div>
      </div>
    );
  }
  if (!routeData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/routes")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Route Management
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Route Details
              </h1>
              <p className="text-gray-600 mt-1">
                View complete route information and stops
              </p>
            </div>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() =>
                  navigate("/add-route", {
                    state: { isEdit: true, routeData: routeData },
                  })
                }
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={async () => {
                  if (!routeData?._id) return;
                  if (
                    window.confirm(
                      "Are you sure you want to delete this route?"
                    )
                  ) {
                    try {
                      await deleteRoute(routeData._id);
                      navigate("/routes");
                    } catch (e) {
                      alert("Failed to delete route");
                    }
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
          {/* Route Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* <div className="flex items-start space-x-6"> */}
            <div className="flex flex-col md:flex-row items-center md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="shrink-0">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <Route className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {routeData.name}
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    {routeData.startPoint}
                  </div>
                  <div className="flex items-center">
                    <Navigation className="h-4 w-4 mr-2 text-gray-400" />
                    {routeData.totalDistance} km
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    {(routeData.estimatedTravelTime / 60).toFixed(2)} hours
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Route Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Route className="h-5 w-5 mr-2" />
              Route Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Route Name
                </label>
                <p className="text-sm text-gray-900">{routeData.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Start Point
                </label>
                <p className="text-sm text-gray-900">{routeData.startPoint}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Total Distance
                </label>
                <p className="text-sm text-gray-900">
                  {routeData.totalDistance} km
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Estimated Travel Time
                </label>
                <p className="text-sm text-gray-900">
                  {(routeData.estimatedTravelTime / 60).toFixed(2)} hours (
                  {routeData.estimatedTravelTime} minutes)
                </p>
              </div>
            </div>
          </div>

          {/* Route Stops */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Route Stops ({routeData.stops.length} stops)
            </h3>
            <div className="space-y-4">
              {routeData.stops.map((stop, index) => (
                <div
                  key={stop.id}
                  className="flex items-center p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <div className="bg-blue-100 rounded-full p-2 mr-4">
                      <span className="text-sm font-medium text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {stop.name}
                        </h4>
                        {index === 0 && (
                          <p className="text-xs text-gray-500">
                            Starting point
                          </p>
                        )}
                        {index === routeData.stops.length - 1 && (
                          <p className="text-xs text-gray-500">
                            Final destination
                          </p>
                        )}
                        {index > 0 && (
                          <p className="text-xs text-gray-500">
                            {stop.distanceFromPrev} km, {stop.durationFromPrev}{" "}
                            min from previous stop
                          </p>
                        )}
                      </div>
                      {index < routeData.stops.length - 1 && (
                        <div className="flex items-center text-gray-400">
                          <ArrowDown className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Route Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Navigation className="h-5 w-5 mr-2" />
              Route Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  Total Distance
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {routeData.totalDistance} km
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Travel Time</p>
                <p className="text-2xl font-bold text-green-600">
                  {(routeData.estimatedTravelTime / 60).toFixed(2)} hours
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <Route className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Total Stops</p>
                <p className="text-2xl font-bold text-purple-600">
                  {routeData.stops.length}
                </p>
              </div>
            </div>
          </div>

          {/* Route Map Visualization */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Navigation className="h-5 w-5 mr-2" />
              Route Visualization
            </h3>
            <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto no-scrollbar">
              <div className="inline-flex items-center justify-start space-x-4 whitespace-nowrap w-max">
                {routeData.stops.map((stop, index) => (
                  <div key={stop.id} className="flex items-center flex-shrink-0">
                    <div className="text-center">
                      <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-900 max-w-20 truncate">
                        {stop.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {index === 0 ? '0km' : `${stop.distanceFromPrev}km`}
                      </p>
                    </div>
                    {index < routeData.stops.length - 1 && (
                      <div className="flex items-center mx-2">
                        <div className="w-8 h-0.5 bg-gray-300"></div>
                        <ArrowRight className="h-4 w-4 text-gray-400 mx-1" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewRoute;
