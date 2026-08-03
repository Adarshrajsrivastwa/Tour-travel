import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Route,
  Plus,
  Trash2,
  Save,
  MapPin,
  Clock,
  Navigation,
} from "lucide-react";
import { createRoute, updateRoute } from "../api/route";

const AddRouteForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.isEdit || false;
  const routeData = location.state?.routeData || null;

  const [formData, setFormData] = useState({
    name: "",
    startPoint: "",
    // Ensure at least 2 stops exist: index 0 is Start Point, last is Last Stop
    stops: [
      { id: 1, name: "", distanceFromPrev: "", durationFromPrev: "" },
      { id: 2, name: "", distanceFromPrev: "", durationFromPrev: "" },
    ],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && routeData) {
      setFormData({
        name: routeData.name,
        startPoint: routeData.startPoint,
        stops: routeData.stops.map((stop, index) => ({
          id: stop.id || index + 1,
          name: stop.name,
          distanceFromPrev: stop.distanceFromPrev || "",
          durationFromPrev: stop.durationFromPrev || "",
        })),
      });
    }
  }, [isEdit, routeData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-fill first stop with start point
    if (name === "startPoint") {
      setFormData((prev) => ({
        ...prev,
        stops: prev.stops.map((stop, index) =>
          index === 0 ? { ...stop, name: value } : stop
        ),
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleStopChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      stops: prev.stops.map((stop, i) =>
        i === index ? { ...stop, [field]: value } : stop
      ),
    }));
  };

  const addStop = () => {
    const newStop = {
      id: Date.now(),
      name: "",
      distanceFromPrev: "",
      durationFromPrev: "",
    };
    setFormData((prev) => ({
      ...prev,
      stops: [...prev.stops, newStop],
    }));
  };

  const removeStop = (index) => {
    // Keep at least two stops (start and last)
    if (formData.stops.length > 2) {
      setFormData((prev) => ({
        ...prev,
        stops: prev.stops.filter((_, i) => i !== index),
      }));
    }
  };

  const calculateTotals = () => {
    const totalDistance = formData.stops.reduce((sum, stop) => {
      return sum + (parseFloat(stop.distanceFromPrev) || 0);
    }, 0);

    const totalDurationMinutes = formData.stops.reduce((sum, stop) => {
      return sum + (parseFloat(stop.durationFromPrev) || 0);
    }, 0);

    const totalDurationHours = totalDurationMinutes / 60;

    return { totalDistance, totalDurationMinutes, totalDurationHours };
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.name.trim()) newErrors.name = "Route name is required";
    if (!formData.startPoint.trim())
      newErrors.startPoint = "Start point is required";

    // Route name validation
    if (formData.name && formData.name.trim().length < 2) {
      newErrors.name = "Route name must be at least 2 characters long";
    }
    if (formData.name && formData.name.trim().length > 100) {
      newErrors.name = "Route name must not exceed 100 characters";
    }

    // Start point validation
    if (formData.startPoint && formData.startPoint.trim().length < 2) {
      newErrors.startPoint = "Start point must be at least 2 characters long";
    }
    if (formData.startPoint && formData.startPoint.trim().length > 100) {
      newErrors.startPoint = "Start point must not exceed 100 characters";
    }

    // Ensure at least two stops
    if (!Array.isArray(formData.stops) || formData.stops.length < 2) {
      newErrors.stops = "At least two stops are required";
    }

    // Validate stops
    formData.stops.forEach((stop, index) => {
      // Skip name validation for the first stop (it mirrors startPoint)
      if (index === 0) {
        return;
      }

      if (!stop.name.trim()) {
        newErrors[`stop_${index}_name`] = `Stop ${index} name is required`;
      } else {
        // Stop name validation
        if (stop.name.trim().length < 2) {
          newErrors[`stop_${index}_name`] = `Stop ${index} name must be at least 2 characters`;
        }
        if (stop.name.trim().length > 100) {
          newErrors[`stop_${index}_name`] = `Stop ${index} name must not exceed 100 characters`;
        }
      }

      if (index > 0) {
        // Distance validation
        if (!stop.distanceFromPrev) {
          newErrors[
            `stop_${index}_distance`
          ] = `Distance from previous stop is required`;
        } else {
          const distance = parseFloat(stop.distanceFromPrev);
          if (isNaN(distance) || distance < 0) {
            newErrors[
              `stop_${index}_distance`
            ] = `Distance must be a positive number`;
          }
        }

        // Duration validation
        if (!stop.durationFromPrev) {
          newErrors[
            `stop_${index}_duration`
          ] = `Duration from previous stop is required`;
        } else {
          const duration = parseFloat(stop.durationFromPrev);
          if (isNaN(duration) || duration < 0) {
            newErrors[
              `stop_${index}_duration`
            ] = `Duration must be a positive number`;
          } 
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { totalDistance, totalDurationMinutes } = calculateTotals();
      const normalizedStops = formData.stops.map((s, idx) => ({
        name: s.name,
        // Backend expects numbers; ensure numeric conversion, and for first stop set 0s
        distanceFromPrev: idx === 0 ? 0 : Number(s.distanceFromPrev),
        durationFromPrev: idx === 0 ? 0 : Number(s.durationFromPrev),
      }));

      const payload = {
        name: formData.name.trim(),
        startPoint: formData.startPoint.trim(),
        stops: normalizedStops,
        totalDistance: Number(totalDistance.toFixed(2)),
        estimatedTravelTime: Number(totalDurationMinutes),
      };

      if (isEdit && routeData?._id) {
        await updateRoute(routeData._id, payload);
      } else {
        await createRoute(payload);
      }

      alert(isEdit ? "Route updated successfully!" : "Route added successfully!");
      navigate("/routes");
    } catch (error) {
      console.error("Error saving route:", error);
      const message = error?.response?.data?.message || "Error saving route. Please try again.";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { totalDistance, totalDurationMinutes, totalDurationHours } =
    calculateTotals();

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
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Route" : "Add New Route"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit
              ? "Update route information and stops"
              : "Configure a new route with stops and distances"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Route className="h-5 w-5 mr-2" />
              Route Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Route Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  maxLength={100}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter route name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Point <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="startPoint"
                  value={formData.startPoint}
                  onChange={handleInputChange}
                  maxLength={100}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.startPoint ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter starting point"
                />
                {errors.startPoint && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.startPoint}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Route Stops */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Route Stops
              </h3>
            </div>

            <div className="space-y-4">
              {formData.stops.map((stop, index) => (
                <div
                  key={stop.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="bg-blue-100 rounded-full p-1 mr-3">
                        <span className="text-xs font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {index === 0 ? "Start Point" : `Stop ${index}`}
                      </span>
                    </div>
                    {formData.stops.length > 2 && index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeStop(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove Stop"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {index === 0 ? "Start Point" : "Stop Name"}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={stop.name}
                        onChange={(e) =>
                          handleStopChange(index, "name", e.target.value)
                        }
                        readOnly={index === 0}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                          index === 0 ? "bg-gray-100 cursor-not-allowed" : ""
                        } ${
                          errors[`stop_${index}_name`]
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder={
                          index === 0
                            ? "Auto-filled from start point"
                            : "Enter stop name"
                        }
                      />
                      {index === 0 && (
                        <p className="text-gray-500 text-xs mt-1">
                          This field is automatically filled from the start
                          point above
                        </p>
                      )}
                      {errors[`stop_${index}_name`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors[`stop_${index}_name`]}
                        </p>
                      )}
                    </div>

                    {index > 0 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Distance from Previous Stop (KM){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={stop.distanceFromPrev}
                            onChange={(e) =>
                              handleStopChange(
                                index,
                                "distanceFromPrev",
                                e.target.value
                              )
                            }
                            min="0"
                            step="0.1"
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                              errors[`stop_${index}_distance`]
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Enter distance"
                          />
                          {errors[`stop_${index}_distance`] && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors[`stop_${index}_distance`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Duration from Previous Stop (Minutes){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={stop.durationFromPrev}
                            onChange={(e) =>
                              handleStopChange(
                                index,
                                "durationFromPrev",
                                e.target.value
                              )
                            }
                            min="0"
        
                            step="1"
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                              errors[`stop_${index}_duration`]
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Enter duration"
                          />
                          {errors[`stop_${index}_duration`] && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors[`stop_${index}_duration`]}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Add Stop button centered in the middle of the row */}
                  {index === formData.stops.length - 1 && (
                    <div className="col-span-full flex justify-center mt-4">
                      <button
                        type="button"
                        onClick={addStop}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Stop
                      </button>
                    </div>
                  )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                <div className="bg-blue-100 rounded-full p-2 mr-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Total Distance
                  </p>
                  <p className="text-lg font-semibold text-blue-600">
                    {totalDistance.toFixed(1)} km
                  </p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <div className="bg-green-100 rounded-full p-2 mr-3">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Estimated Travel Time
                  </p>
                  <p className="text-lg font-semibold text-green-600">
                    {totalDurationHours.toFixed(2)} hours (
                    {totalDurationMinutes} minutes)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/routes")}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEdit ? "Update Route" : "Add Route"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRouteForm;
