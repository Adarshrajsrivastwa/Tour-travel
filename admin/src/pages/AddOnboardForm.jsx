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
  Plus,
  X,
  Save,
  User,
  UserCheck,
} from "lucide-react";
import { getAllBuses } from "../api/bus";
import { fetchRoutes } from "../api/route";
import { getAllDriver } from "../api/driver";
import { createOnboardSchedule, updateOnboardSchedule, getOnboardScheduleById } from "../api/onboard";

const AddOnboardForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.isEdit || false;
  const onboardData = location.state?.onboardData || null;

  const [formData, setFormData] = useState({
    busId: "",
    routeId: "",
    date: "",
    time: "",
    assignedTeam: [],
    pricing: {
      baseAmount: "",
      perKmRate: "",
      totalFare: 0,
    },
    status: "Scheduled",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableConductors, setAvailableConductors] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);

  // Fetch initial data (buses, routes, drivers) - silently in background
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch buses (backend max limit is 100)
        const busesResponse = await getAllBuses({ limit: 100, status: 'Active' });
        const busesData = busesResponse?.data?.data || [];
        setBuses(busesData);

        // Fetch routes (backend max limit is 100)
        const routesResponse = await fetchRoutes({ limit: 100 });
        const routesData = routesResponse?.data?.data || routesResponse?.data || [];
        setRoutes(Array.isArray(routesData) ? routesData : []);

        // Fetch drivers (all roles) (backend max limit is 100)
        const driversResponse = await getAllDriver({ limit: 100, status: 'Active' });
        const driversData = driversResponse?.data?.data || [];
        
        // Filter drivers and conductors
        const drivers = driversData.filter(
          (driver) => driver.jobTitle === "Driver" || driver.role === "Driver"
        );
        const conductors = driversData.filter(
          (driver) => driver.jobTitle === "Conductor" || driver.role === "Conductor"
        );
        setAvailableDrivers(drivers);
        setAvailableConductors(conductors);

        // If editing, fetch the schedule data
        if (isEdit && onboardData?._id) {
          try {
            const scheduleResponse = await getOnboardScheduleById(onboardData._id);
            const schedule = scheduleResponse?.data?.data || scheduleResponse?.data;
            
            if (schedule) {
              // Format date for input field (YYYY-MM-DD)
              const scheduleDate = schedule.date 
                ? new Date(schedule.date).toISOString().split('T')[0] 
                : '';
              
              // Format time for input field (HH:MM)
              let scheduleTime = schedule.time || '';
              // Convert "10:00 AM" format to "10:00" if needed
              if (scheduleTime && scheduleTime.includes(' ')) {
                const [timePart, ampm] = scheduleTime.split(' ');
                const [hours, minutes] = timePart.split(':');
                let hour24 = parseInt(hours);
                if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
                if (ampm === 'AM' && hour24 === 12) hour24 = 0;
                scheduleTime = `${hour24.toString().padStart(2, '0')}:${minutes}`;
              }

              setFormData({
                busId: schedule.busId?._id || schedule.busId || '',
                routeId: schedule.routeId?._id || schedule.routeId || '',
                date: scheduleDate,
                time: scheduleTime,
                assignedTeam: schedule.assignedTeam || [],
                pricing: schedule.pricing || {
                  baseAmount: "",
                  perKmRate: "",
                  totalFare: 0,
                },
                status: schedule.status || "Scheduled",
              });
            }
          } catch (error) {
            console.error("Error fetching schedule data:", error);
            // If fetch fails, use the onboardData from location state
            if (onboardData) {
              const scheduleDate = onboardData.date 
                ? new Date(onboardData.date).toISOString().split('T')[0] 
                : '';
              setFormData({
                busId: onboardData.busId?._id || onboardData.busId || '',
                routeId: onboardData.routeId?._id || onboardData.routeId || '',
                date: scheduleDate,
                time: onboardData.time || '',
                assignedTeam: onboardData.assignedTeam || [],
                pricing: onboardData.pricing || {
                  baseAmount: "",
                  perKmRate: "",
                  totalFare: 0,
                },
                status: onboardData.status || "Scheduled",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        // Silently handle error - don't show alert on initial load
      }
    };

    fetchInitialData();
  }, [isEdit, onboardData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("pricing.")) {
      const pricingField = name.split(".")[1];
      // Allow empty string or parse the value - don't default to 0
      if (value === "") {
        setFormData((prev) => ({
          ...prev,
          pricing: {
            ...prev.pricing,
            [pricingField]: "",
          },
        }));
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          // Enforce min/max constraints
          let constrainedValue = numValue;
          if (pricingField === "baseAmount") {
            constrainedValue = Math.max(0, Math.min(100000, numValue));
          } else if (pricingField === "perKmRate") {
            constrainedValue = Math.max(0, Math.min(10000, numValue));
          }
          setFormData((prev) => ({
            ...prev,
            pricing: {
              ...prev.pricing,
              [pricingField]: constrainedValue,
            },
          }));
        }
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
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

  const handleTeamMemberToggle = (member) => {
    setFormData((prev) => {
      const memberId = member._id || member.id;
      const isAlreadyAssigned = prev.assignedTeam.some(
        (teamMember) => {
          const teamMemberId = teamMember.id?._id || teamMember.id?.id || teamMember.id;
          return teamMemberId === memberId;
        }
      );

      if (isAlreadyAssigned) {
        return {
          ...prev,
          assignedTeam: prev.assignedTeam.filter(
            (teamMember) => {
              const teamMemberId = teamMember.id?._id || teamMember.id?.id || teamMember.id;
              return teamMemberId !== memberId;
            }
          ),
        };
      } else {
        return {
          ...prev,
          assignedTeam: [
            ...prev.assignedTeam,
            {
              id: memberId,
              name: member.fullName,
              role: member.jobTitle || member.role || (member.jobTitle === "Driver" ? "Driver" : "Conductor"),
            },
          ],
        };
      }
    });
  };

  const calculateTotalFare = () => {
    const selectedRoute = routes.find(
      (route) => route._id === formData.routeId || route.id === formData.routeId
    )
    if (selectedRoute) {
      const totalDistance = selectedRoute.totalDistance || 0;
      const baseAmount = typeof formData.pricing.baseAmount === 'number' ? formData.pricing.baseAmount : 0;
      const perKmRate = typeof formData.pricing.perKmRate === 'number' ? formData.pricing.perKmRate : 0;
      const totalFare = baseAmount + (totalDistance * perKmRate);
      setFormData((prev) => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          totalFare: totalFare,
        },
      }));
    }
  };

  useEffect(() => {
    if (
      formData.routeId &&
      formData.pricing.baseAmount !== "" &&
      formData.pricing.perKmRate !== "" &&
      typeof formData.pricing.baseAmount === 'number' &&
      typeof formData.pricing.perKmRate === 'number'
    ) {
      calculateTotalFare();
    } else {
      // Reset total fare if values are invalid
      setFormData((prev) => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          totalFare: 0,
        },
      }));
    }
  }, [
    formData.routeId,
    formData.pricing.baseAmount,
    formData.pricing.perKmRate,
  ]);

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.busId) newErrors.busId = "Please select a bus";
    if (!formData.routeId) newErrors.routeId = "Please select a route";
    if (!formData.date) newErrors.date = "Please select a date";
    if (!formData.time) newErrors.time = "Please select a time";
    
    // Check if at least one driver is assigned
    const hasDriver = formData.assignedTeam.some(member => member.role === 'Driver');
    if (!hasDriver) {
      newErrors.assignedTeam = "Please assign at least one driver";
    }
    
    // Check if at least one conductor is assigned
    const hasConductor = formData.assignedTeam.some(member => member.role === 'Conductor');
    if (!hasConductor) {
      newErrors.assignedTeam = "Please assign at least one driver and one conductor";
    }

    // Date validation - should not be in the past
    if (
      formData.date &&
      new Date(formData.date) < new Date().setHours(0, 0, 0, 0)
    ) {
      newErrors.date = "Date cannot be in the past";
    }

    // Time validation - should not be in the past if date is today
    if (formData.date && formData.time) {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      const isToday = selectedDate.toDateString() === today.toDateString();

      if (isToday) {
        const selectedTime = new Date(`${formData.date}T${formData.time}`);
        const now = new Date();

        if (selectedTime < now) {
          newErrors.time = "Time cannot be in the past for today";
        }
      }
    }

    // Pricing validation
    if (formData.pricing.baseAmount === "" || formData.pricing.baseAmount === null) {
      newErrors["pricing.baseAmount"] = "Base amount is required";
    } else if (typeof formData.pricing.baseAmount === 'number') {
      if (formData.pricing.baseAmount < 0) {
        newErrors["pricing.baseAmount"] = "Base amount cannot be negative";
      }
      if (formData.pricing.baseAmount > 100000) {
        newErrors["pricing.baseAmount"] = "Base amount cannot exceed ₹100,000";
      }
    }
    
    if (formData.pricing.perKmRate === "" || formData.pricing.perKmRate === null) {
      newErrors["pricing.perKmRate"] = "Per KM rate is required";
    } else if (typeof formData.pricing.perKmRate === 'number') {
      if (formData.pricing.perKmRate < 0) {
        newErrors["pricing.perKmRate"] = "Per KM rate cannot be negative";
      }
      if (formData.pricing.perKmRate > 10000) {
        newErrors["pricing.perKmRate"] = "Per KM rate cannot exceed ₹10,000";
      }
    }

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
      // Prepare the data for API submission
      const schedulePayload = {
        busId: formData.busId,
        routeId: formData.routeId,
        date: formData.date,
        time: formData.time,
        assignedTeam: formData.assignedTeam.map(member => ({
          id: member.id,
          name: member.name,
          role: member.role,
        })),
        pricing: {
          baseAmount: typeof formData.pricing.baseAmount === 'number' ? formData.pricing.baseAmount : 0,
          perKmRate: typeof formData.pricing.perKmRate === 'number' ? formData.pricing.perKmRate : 0,
          totalFare: formData.pricing.totalFare || 0,
        },
        status: formData.status,
      };

      if (isEdit && onboardData?._id) {
        // Update existing schedule
        await updateOnboardSchedule(onboardData._id, schedulePayload);
        alert("Schedule updated successfully!");
      } else {
        // Create new schedule
        await createOnboardSchedule(schedulePayload);
        alert("Schedule created successfully!");
      }

      navigate("/onboard");
    } catch (error) {
      console.error("Error saving schedule:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Error saving schedule. Please try again.";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedBus = () =>
    buses.find((bus) => bus._id === formData.busId || bus.id === formData.busId);
  const getSelectedRoute = () =>
    routes.find((route) => route._id === formData.routeId || route.id === formData.routeId);

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
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
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Schedule" : "Schedule New Trip"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit
              ? "Update trip schedule and crew assignment"
              : "Create a new trip schedule with bus, route, and crew assignment"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Bus className="h-5 w-5 mr-2" />
              Trip Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Bus <span className="text-red-500">*</span>
                </label>
                <select
                  name="busId"
                  value={formData.busId}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.busId ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Choose a bus</option>
                  {buses.map((bus) => (
                    <option key={bus._id || bus.id} value={bus._id || bus.id}>
                      {bus.busName} ({bus.busNumber}) - {bus.seatCapacity} seats
                    </option>
                  ))}
                </select>
                {errors.busId && (
                  <p className="text-red-500 text-sm mt-1">{errors.busId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Route <span className="text-red-500">*</span>
                </label>
                <select
                  name="routeId"
                  value={formData.routeId}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.routeId ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Choose a route</option>
                  {routes.map((route) => (
                    <option key={route._id || route.id} value={route._id || route.id}>
                      {route.name} - {route.totalDistance}km
                    </option>
                  ))}
                </select>
                {errors.routeId && (
                  <p className="text-red-500 text-sm mt-1">{errors.routeId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Travel <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.date ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.date && (
                  <p className="text-red-500 text-sm mt-1">{errors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time of Travel <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.time ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.time && (
                  <p className="text-red-500 text-sm mt-1">{errors.time}</p>
                )}
              </div>
            </div>
          </div>

          {/* Crew Assignment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Crew Assignment
            </h3>

            {errors.assignedTeam && (
              <p className="text-red-500 text-sm mb-4">{errors.assignedTeam}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Drivers */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Available Drivers
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {availableDrivers.map((driver) => {
                    const driverId = driver._id || driver.id;
                    const isAssigned = formData.assignedTeam.some(
                      (member) => (member.id === driverId) || (member.id?._id === driverId) || (member.id?.id === driverId)
                    );
                    return (
                      <div
                        key={driverId}
                        onClick={() => handleTeamMemberToggle(driver)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isAssigned
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {driver.fullName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {driver.yearsOfExperience || 0} years experience
                            </p>
                          </div>
                          {isAssigned && (
                            <div className="bg-blue-100 rounded-full p-1">
                              <UserCheck className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conductors */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Available Conductors
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {availableConductors.map((conductor) => {
                    const conductorId = conductor._id || conductor.id;
                    const isAssigned = formData.assignedTeam.some(
                      (member) => (member.id === conductorId) || (member.id?._id === conductorId) || (member.id?.id === conductorId)
                    );
                    return (
                      <div
                        key={conductorId}
                        onClick={() => handleTeamMemberToggle(conductor)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isAssigned
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {conductor.fullName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {conductor.yearsOfExperience || 0} years experience
                            </p>
                          </div>
                          {isAssigned && (
                            <div className="bg-green-100 rounded-full p-1">
                              <UserCheck className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Team Summary */}
            {formData.assignedTeam.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Selected Team ({formData.assignedTeam.length} members)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {formData.assignedTeam.map((member) => (
                    <span
                      key={member.id}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.role === "Driver"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {member.name} ({member.role})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pricing Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Pricing Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="pricing.baseAmount"
                  value={formData.pricing.baseAmount === "" ? "" : formData.pricing.baseAmount}
                  onChange={handleInputChange}
                  min="0"
                  max="100000"
                  step="1"
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors["pricing.baseAmount"] ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g. 100"
                />
                {errors["pricing.baseAmount"] && (
                  <p className="text-red-500 text-sm mt-1">{errors["pricing.baseAmount"]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Per KM Rate (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="pricing.perKmRate"
                  value={formData.pricing.perKmRate === "" ? "" : formData.pricing.perKmRate}
                  onChange={handleInputChange}
                  min="0"
                  max="10000"
                  step="0.1"
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors["pricing.perKmRate"] ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g. 10"
                />
                {errors["pricing.perKmRate"] && (
                  <p className="text-red-500 text-sm mt-1">{errors["pricing.perKmRate"]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Fare (₹)
                </label>
                <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-900">
                  ₹{formData.pricing.totalFare.toFixed(2)}
                </div>
                {getSelectedRoute() && (
                  <p className="text-xs text-gray-500 mt-1">
                    Base: ₹{formData.pricing.baseAmount === "" ? 0 : formData.pricing.baseAmount} + (
                    {getSelectedRoute().totalDistance}km × ₹
                    {formData.pricing.perKmRate === "" ? 0 : formData.pricing.perKmRate})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Trip Summary */}
          {(getSelectedBus() || getSelectedRoute()) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Bus className="h-5 w-5 mr-2" />
                Trip Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getSelectedBus() && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Selected Bus
                    </h4>
                    <p className="text-sm text-gray-600">
                      {getSelectedBus().busName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getSelectedBus().busNumber} •{" "}
                      {getSelectedBus().seatCapacity} seats
                    </p>
                  </div>
                )}

                {getSelectedRoute() && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Selected Route
                    </h4>
                    <p className="text-sm text-gray-600">
                      {getSelectedRoute().name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getSelectedRoute().totalDistance}km •{" "}
                      {getSelectedRoute().estimatedTravelTime 
                        ? `${(getSelectedRoute().estimatedTravelTime / 60).toFixed(2)} hours`
                        : 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/onboard")}
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
                  {isEdit ? "Update Schedule" : "Create Schedule"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOnboardForm;
