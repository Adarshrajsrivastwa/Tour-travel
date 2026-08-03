import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Bus,
  FileText,
  Upload,
  X,
  Save,
  Camera,
  Image,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { createBus, updateBus } from "../api/bus";
import SeatMapEditor from "../components/SeatMapEditor";

const AddBusForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.isEdit || false;
  const busData = location.state?.busData || null;

  const [formData, setFormData] = useState({
    busName: "",
    busNumber: "",
    seatArchitecture: "2+2", 
    seatCapacity: "",
    seatLayout: {
      rows: 10,
      columns: 4,
      map: [],
      seats: [],
      totalSeats: 0,
    },
    rcDocument: null,
    pollutionCertificate: null,
    insuranceNumber: "",
    insuranceCertificate: null,
    busImages: {
      front: null,
      rear: null,
      left: null,
      right: null,
    },
    acType: "AC",
    status: "Active",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // React Query mutation for adding/updating bus
  const busMutation = useMutation({
    mutationFn: async (busData) => {
      console.log("🚀 ===== BUS CREATION/UPDATE START =====");
      console.log(
        "📝 Raw form data received:",
        JSON.stringify(busData, null, 2)
      );

      const formDataToSend = new FormData();

      // Fields that should not be sent to the backend
      const fieldsToExclude = [
        "_id",
        "id",
        "createdAt",
        "updatedAt",
        "__v",
        "assignedTrips",
        "maintenanceHistory",
        "documentStatus",
        "lastMaintenanceDate",
        "nextMaintenanceDate",
      ];

      // Log FormData for debugging
      console.log("📦 Preparing FormData with busData:", busData);

      // Append fields to FormData
      for (const key in busData) {
        // Skip excluded fields
        if (fieldsToExclude.includes(key)) {
          console.log(`⏭️ Skipping excluded field: ${key}`);
          continue;
        }

        console.log(
          `🔍 Processing field: ${key} = ${
            busData[key]
          } (type: ${typeof busData[key]})`
        );

        if (key === "seatLayout") {
          // Handle seatLayout - serialize as JSON for backend
          console.log("🪑 Processing seat layout:", busData.seatLayout);
          if (busData.seatLayout && typeof busData.seatLayout === "object") {
            formDataToSend.append(
              "seatLayout",
              JSON.stringify(busData.seatLayout)
            );
          }
          continue;
        }

        if (key === "busImages") {
          console.log("🚌 Processing bus images:");
          console.log("  - front:", busData.busImages.front);
          console.log("  - rear:", busData.busImages.rear);
          console.log("  - left:", busData.busImages.left);
          console.log("  - right:", busData.busImages.right);

          // Handle each image field
          if (busData.busImages.front) {
            if (busData.busImages.front instanceof File) {
              // New file uploaded
              formDataToSend.append("frontImage", busData.busImages.front);
            } else if (isEdit && typeof busData.busImages.front === "string") {
              // In edit mode, keep existing URL
              formDataToSend.append("frontImage", busData.busImages.front);
            }
          } else if (isEdit && busData.busImages.front === null) {
            // File was removed by user - send empty string to clear it
            console.log(
              "  - Front image removed by user - sending empty string"
            );
            formDataToSend.append("frontImage", "");
          }

          if (busData.busImages.rear) {
            if (busData.busImages.rear instanceof File) {
              formDataToSend.append("rearImage", busData.busImages.rear);
            } else if (isEdit && typeof busData.busImages.rear === "string") {
              formDataToSend.append("rearImage", busData.busImages.rear);
            }
          } else if (isEdit && busData.busImages.rear === null) {
            console.log(
              "  - Rear image removed by user - sending empty string"
            );
            formDataToSend.append("rearImage", "");
          }

          if (busData.busImages.left) {
            if (busData.busImages.left instanceof File) {
              formDataToSend.append("leftImage", busData.busImages.left);
            } else if (isEdit && typeof busData.busImages.left === "string") {
              formDataToSend.append("leftImage", busData.busImages.left);
            }
          } else if (isEdit && busData.busImages.left === null) {
            console.log(
              "  - Left image removed by user - sending empty string"
            );
            formDataToSend.append("leftImage", "");
          }

          if (busData.busImages.right) {
            if (busData.busImages.right instanceof File) {
              formDataToSend.append("rightImage", busData.busImages.right);
            } else if (isEdit && typeof busData.busImages.right === "string") {
              formDataToSend.append("rightImage", busData.busImages.right);
            }
          } else if (isEdit && busData.busImages.right === null) {
            console.log(
              "  - Right image removed by user - sending empty string"
            );
            formDataToSend.append("rightImage", "");
          }
        } else if (
          [
            "rcDocument",
            "pollutionCertificate",
            "insuranceCertificate",
          ].includes(key)
        ) {
          console.log(`📎 Processing file field: ${key}`);
          console.log(
            `  - Current value:`,
            busData[key],
            "type:",
            typeof busData[key]
          );

          if (busData[key] && busData[key] instanceof File) {
            // New file uploaded
            console.log(
              `  - New file found: ${busData[key].name} (${busData[key].size} bytes)`
            );
            formDataToSend.append(key, busData[key]);
          } else if (
            isEdit &&
            busData[key] &&
            typeof busData[key] === "string"
          ) {
            // In edit mode, if there's an existing URL and no new file, keep the existing URL
            console.log(`  - Keeping existing ${key} URL: ${busData[key]}`);
            formDataToSend.append(key, busData[key]);
          } else if (isEdit && busData[key] === null) {
            // File was removed by user - send empty string to clear it
            console.log(
              `  - File removed by user for ${key} - sending empty string`
            );
            formDataToSend.append(key, "");
          } else {
            console.log(`  - No file for ${key}`);
          }
        } else {
          console.log(`📝 Adding regular field: ${key} = "${busData[key]}"`);
          formDataToSend.append(key, busData[key]);
        }
      }

      // Log FormData entries
      console.log("📋 Final FormData entries:");
      for (const [key, value] of formDataToSend.entries()) {
        if (value instanceof File) {
          console.log(`  - ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  - ${key}: "${value}" (type: ${typeof value})`);
        }
      }

      // Use createBus for add mode, updateBus for edit mode
      if (isEdit) {
        if (!busData?.id) {
          throw new Error("Bus ID is missing in edit mode");
        }
        console.log(`🔄 Making PUT request to /buses/${busData.id}`);
        const response = await updateBus(busData.id, formDataToSend);
        console.log("✅ PUT response received:", response.data);
        return response.data;
      } else {
        console.log("🆕 Making POST request to /buses");
        const response = await createBus(formDataToSend);
        console.log("✅ POST response received:", response.data);
        return response.data;
      }
    },
    onSuccess: (data) => {
      console.log("Bus saved successfully:", data);
      // Show success message with better UX
      const successMessage = isEdit
        ? "Bus updated successfully!"
        : "Bus added successfully!";

      // You could replace this with a toast notification library
      alert(successMessage);

      // Navigate back to bus management
      navigate("/buses");
    },
    onError: (error) => {
      console.error("❌ ===== BUS CREATION/UPDATE ERROR =====");
      console.error("🚨 Full error object:", error);
      console.error("🔍 Error response:", error.response);
      console.error("📊 Error response data:", error.response?.data);
      console.error("📈 Error response status:", error.response?.status);
      console.error("📋 Error response headers:", error.response?.headers);
      console.error("🌐 Error request config:", error.config);

      // Extract error message from response
      let errorMessage = "Error saving bus. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        console.log("📝 Using response message:", errorMessage);
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        console.log("📝 Using response error:", errorMessage);
      } else if (error.message) {
        errorMessage = error.message;
        console.log("📝 Using error message:", errorMessage);
      }

      console.log("💬 Final error message to show:", errorMessage);

      // Show error message
      alert(errorMessage);

      // Set form errors if validation errors
      if (error.response?.data?.errors) {
        console.log("🔧 Setting form errors:", error.response.data.errors);
        setErrors(error.response.data.errors);
      }

      console.error("❌ ===== END ERROR LOGGING =====");
    },
  });

  // Predefined seat architectures
  const seatArchitectures = [
    { value: "2+2", label: "2+2 (Standard)", capacity: 45 },
    { value: "2+1", label: "2+1 (Luxury)", capacity: 35 },
    { value: "1+1", label: "1+1 (Premium)", capacity: 25 },
    { value: "3+2", label: "3+2 (High Capacity)", capacity: 55 },
  ];

  useEffect(() => {
    if (isEdit && busData) {
      console.log("🔍 Edit mode - busData received:", busData);
      console.log("🔍 busData.busImages:", busData.busImages);
      console.log("🔍 Individual image fields:", {
        frontImage: busData.frontImage,
        rearImage: busData.rearImage,
        leftImage: busData.leftImage,
        rightImage: busData.rightImage,
      });

      // Handle busImages - check if they come as individual fields or nested object
      let busImages = {
        front: null,
        rear: null,
        left: null,
        right: null,
      };

      if (busData.busImages && typeof busData.busImages === "object") {
        // If busImages is already a nested object
        console.log("📁 Using nested busImages object");
        busImages = {
          front: busData.busImages.front || null,
          rear: busData.busImages.rear || null,
          left: busData.busImages.left || null,
          right: busData.busImages.right || null,
        };
      } else {
        // If images come as individual fields (frontImage, rearImage, etc.)
        console.log("📁 Using individual image fields");
        busImages = {
          front: busData.frontImage || null,
          rear: busData.rearImage || null,
          left: busData.leftImage || null,
          right: busData.rightImage || null,
        };
      }

      console.log("🔧 Final busImages:", busImages);

      // --- Load existing bus data in edit mode ---
      const incomingLayout = busData.seatLayout || {
        rows: 10,
        columns: 4,
        map: [],
        seats: [],
        totalSeats: 0,
      };

      // Use layout's totalSeats (seats with assigned numbers) or fallback to seatCapacity
      const computedTotal =
        incomingLayout.totalSeats || busData.seatCapacity || 0;

      setFormData({
        ...busData,
        // Ensure we have `id` available for edit mode (backend uses `_id`)
        id: busData.id || busData._id || null,
        rcDocument: busData.rcDocument,
        pollutionCertificate: busData.pollutionCertificate,
        insuranceCertificate: busData.insuranceCertificate,
        busImages: busImages,
        // Keep the seat layout as-is from server
        seatLayout: incomingLayout,
        // Seat capacity = count of seats with assigned numbers
        seatCapacity: computedTotal,
      });
    }
  }, [isEdit, busData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith("busImages.")) {
      const imageField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        busImages: {
          ...prev.busImages,
          [imageField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
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

  const handleSeatArchitectureChange = (e) => {
    const selectedArchitecture = seatArchitectures.find(
      (arch) => arch.value === e.target.value
    );
    setFormData((prev) => ({
      ...prev,
      seatArchitecture: e.target.value,
      seatCapacity: selectedArchitecture ? selectedArchitecture.capacity : "",
    }));
  };

  // Count only seats that have been assigned a seat number (non-empty seatLabel)
  // This matches the logic in SeatMapEditor where totalSeats = count of labeled seats
  const countAssignedSeats = (layout) => {
    if (!layout) return 0;

    // SeatMapEditor already calculates totalSeats correctly as count of labeled seats
    // So we can use it directly if available
    if (typeof layout.totalSeats === "number") {
      return layout.totalSeats;
    }

    // Fallback: count from 2D map if totalSeats not provided
    if (Array.isArray(layout.map)) {
      return layout.map
        .flatMap((row) => row)
        .filter((seat) => {
          return seat && seat.seatLabel && String(seat.seatLabel).trim() !== "";
        }).length;
    }

    // Last fallback: count from flat seats array
    if (Array.isArray(layout.seats)) {
      return layout.seats.filter((seat) => {
        return seat && seat.seatLabel && String(seat.seatLabel).trim() !== "";
      }).length;
    }

    return 0;
  };

  const handleSeatLayoutChange = (layoutData) => {
    // Use the countAssignedSeats helper which handles multiple seat property formats
    const capacity = countAssignedSeats(layoutData);

    setFormData((prev) => ({
      ...prev,
      seatLayout: layoutData,
      seatCapacity: capacity,
    }));

    // Clear seatCapacity error if it was set
    if (errors.seatCapacity) {
      setErrors((prev) => ({
        ...prev,
        seatCapacity: "",
      }));
    }
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type - allow any image MIME type
      if (!file.type || !file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: "Please upload a valid image file",
        }));
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: "File size must be less than 5MB",
        }));
        return;
      }

      if (fieldName.startsWith("busImages.")) {
        const imageField = fieldName.split(".")[1];
        setFormData((prev) => ({
          ...prev,
          busImages: {
            ...prev.busImages,
            [imageField]: file,
          },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [fieldName]: file,
        }));
      }

      // Clear error
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
    }
  };

  const removeFile = (fieldName) => {
    if (fieldName.startsWith("busImages.")) {
      const imageField = fieldName.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        busImages: {
          ...prev.busImages,
          [imageField]: null,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: null,
      }));
    }

    // Clear any errors for this field
    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.busName.trim()) newErrors.busName = "Bus name is required";
    if (!formData.busNumber.trim())
      newErrors.busNumber = "Bus number is required";

    // Validate seat layout
    if (
      !formData.seatLayout ||
      !formData.seatLayout.rows ||
      !formData.seatLayout.columns
    ) {
      newErrors.seatLayout =
        "Seat layout is required. Please configure rows and columns.";
    } else if (
      !formData.seatLayout.totalSeats ||
      formData.seatLayout.totalSeats === 0
    ) {
      newErrors.seatLayout = "At least one seat must be enabled in the layout.";
    }

    if (
      formData.seatCapacity === "" ||
      formData.seatCapacity === 0 ||
      !formData.seatCapacity
    ) {
      newErrors.seatCapacity =
        "At least one seat must be assigned in the layout";
    }
    if (!formData.insuranceNumber.trim())
      newErrors.insuranceNumber = "Insurance number is required";

    // Required document validation
    // For new buses, all documents are required
    // For editing, documents are required only if they don't exist
    if (!isEdit) {
      // New bus creation - all documents required
      if (!formData.rcDocument) {
        newErrors.rcDocument = "RC Document is required";
      }
      if (!formData.pollutionCertificate) {
        newErrors.pollutionCertificate = "Pollution Certificate is required";
      }
      if (!formData.insuranceCertificate) {
        newErrors.insuranceCertificate = "Insurance Certificate is required";
      }
    } else {
      // Edit mode - documents required only if they were removed
      if (formData.rcDocument === null && busData?.rcDocument) {
        newErrors.rcDocument = "RC Document is required";
      }
      if (
        formData.pollutionCertificate === null &&
        busData?.pollutionCertificate
      ) {
        newErrors.pollutionCertificate = "Pollution Certificate is required";
      }
      if (
        formData.insuranceCertificate === null &&
        busData?.insuranceCertificate
      ) {
        newErrors.insuranceCertificate = "Insurance Certificate is required";
      }
    }

    // Bus name validation
    if (formData.busName && formData.busName.trim().length < 2) {
      newErrors.busName = "Bus name must be at least 2 characters long";
    }
    if (formData.busName && formData.busName.trim().length > 50) {
      newErrors.busName = "Bus name must not exceed 50 characters";
    }

    // Bus number validation (should be in format like MH-01-AB-1234)
    const busNumberRegex = /^[A-Z]{2}-\d{2}-[A-Z]{2}-\d{4}$/;
    if (
      formData.busNumber &&
      !busNumberRegex.test(formData.busNumber.toUpperCase())
    ) {
      newErrors.busNumber =
        "Please enter a valid bus number (e.g., MH-01-AB-1234)";
    }

    // Seat capacity validation
    if (formData.seatCapacity) {
      const capacity = parseInt(formData.seatCapacity);
      if (capacity < 1) {
        newErrors.seatCapacity = "Seat capacity must be at least 1";
      } else if (capacity > 100) {
        newErrors.seatCapacity = "Seat capacity cannot exceed 100";
      }
    }

    // Insurance number validation
    if (
      formData.insuranceNumber &&
      formData.insuranceNumber.trim().length < 5
    ) {
      newErrors.insuranceNumber =
        "Insurance number must be at least 5 characters";
    }
    if (
      formData.insuranceNumber &&
      formData.insuranceNumber.trim().length > 50
    ) {
      newErrors.insuranceNumber =
        "Insurance number must not exceed 50 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();


    // Clear previous errors
    setErrors({});
    console.log("working");

    if (!validateForm()) {
      console.log("Validation failed, not submitting");
      return;
    }

    console.log("Validation passed, submitting form...");
    console.log("Form data:", formData);

    // Use the mutation to submit the form
    busMutation.mutate(formData);
  };

  const getFullImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http") || imagePath.startsWith("data:")) return imagePath;
    
    const apiUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const baseUrl = apiUrl.replace(/\/api\/?$/, "");
    
    let formattedPath = imagePath.replace(/\\/g, "/");
    if (!formattedPath.startsWith("/")) {
      formattedPath = "/" + formattedPath;
    }
    
    return `${baseUrl}${formattedPath}`;
  };

  const FileUploadField = ({ fieldName, label, required = false }) => {
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
      if (formData[fieldName] && formData[fieldName] instanceof File) {
        const url = URL.createObjectURL(formData[fieldName]);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      } else if (
        formData[fieldName] &&
        typeof formData[fieldName] === "string"
      ) {
        setPreviewUrl(getFullImageUrl(formData[fieldName]));
      } else {
        setPreviewUrl(null);
      }
    }, [formData[fieldName], fieldName]);

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative">
          {formData[fieldName] ? (
            <div>
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-48 rounded-lg object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        {formData[fieldName].name || "Image uploaded"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(fieldName)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      {formData[fieldName].name || "File uploaded"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        document
                          .querySelector(`input[data-field="${fieldName}"]`)
                          ?.click();
                      }}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(fieldName);
                      }}
                      className="text-red-500 hover:text-red-700 relative z-20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              {formData[fieldName] && (
                <div className="mt-2 p-2 border border-dashed border-gray-300 rounded text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      document
                        .querySelector(`input[data-field="${fieldName}"]`)
                        ?.click();
                    }}
                    className="text-blue-500 hover:text-blue-700 text-sm underline"
                  >
                    Click to upload new file
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">JPG, PNG (max 5MB)</p>
            </div>
          )}
          <input
            type="file"
            onChange={(e) => handleFileUpload(e, fieldName)}
            className={
              formData[fieldName]
                ? "hidden"
                : "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            }
            accept="image/*"
            data-field={fieldName}
          />
        </div>
        {errors[fieldName] && (
          <p className="text-red-500 text-sm mt-1">{errors[fieldName]}</p>
        )}
      </div>
    );
  };

  const BusImageUpload = ({ view, label }) => {
    const fieldName = `busImages.${view}`;
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
      if (
        formData.busImages[view] &&
        formData.busImages[view] instanceof File
      ) {
        const url = URL.createObjectURL(formData.busImages[view]);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      } else if (
        formData.busImages[view] &&
        typeof formData.busImages[view] === "string"
      ) {
        setPreviewUrl(getFullImageUrl(formData.busImages[view]));
      } else {
        setPreviewUrl(null);
      }
    }, [formData.busImages[view], view]);

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative">
          {formData.busImages[view] ? (
            <div>
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <img
                      src={previewUrl}
                      alt={`${view} view preview`}
                      className="max-w-full max-h-32 rounded-lg object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Image className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        {formData.busImages[view].name || "Image uploaded"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          document
                            .querySelector(`input[data-field="${fieldName}"]`)
                            ?.click();
                        }}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(fieldName);
                        }}
                        className="text-red-500 hover:text-red-700 relative z-20"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Image className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      {formData.busImages[view].name || "Image uploaded"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(fieldName);
                    }}
                    className="text-red-500 hover:text-red-700 relative z-20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {formData[fieldName] && (
                <div className="mt-2 p-2 border border-dashed border-gray-300 rounded text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      document
                        .querySelector(`input[data-field="${fieldName}"]`)
                        ?.click();
                    }}
                    className="text-blue-500 hover:text-blue-700 text-sm underline"
                  >
                    Click to upload new file
                  </button>
                </div>
              )}
              {formData.busImages[view] && (
                <div className="mt-2 p-2 border border-dashed border-gray-300 rounded text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      document
                        .querySelector(`input[data-field="${fieldName}"]`)
                        ?.click();
                    }}
                    className="text-blue-500 hover:text-blue-700 text-sm underline"
                  >
                    Click to upload new image
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Camera className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click to upload</p>
              <p className="text-xs text-gray-500">JPG, PNG (max 5MB)</p>
            </div>
          )}
          <input
            type="file"
            onChange={(e) => handleFileUpload(e, fieldName)}
            className={
              formData[fieldName]
                ? "hidden"
                : "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            }
            accept="image/*"
            data-field={fieldName}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/buses")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Bus Management
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Bus" : "Add New Bus"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit
              ? "Update bus information and documents"
              : "Fill in the details to add a new bus to the GR Tour & Travel"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Bus className="h-5 w-5 mr-2" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bus Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="busName"
                  value={formData.busName}
                  onChange={handleInputChange}
                  maxLength={50}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.busName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter bus name"
                />
                {errors.busName && (
                  <p className="text-red-500 text-sm mt-1">{errors.busName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bus Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="busNumber"
                  value={formData.busNumber}
                  onChange={handleInputChange}
                  maxLength={13}
                  pattern="[A-Z]{2}-[0-9]{2}-[A-Z]{2}-[0-9]{4}"
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.busNumber ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g., MH-01-AB-1234"
                />
                {errors.busNumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.busNumber}
                  </p>
                )}
              </div>

              {/* Seat Layout Editor */}
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seat Layout <span className="text-red-500">*</span>
                </label>
                <SeatMapEditor
                  value={formData.seatLayout}
                  onChange={handleSeatLayoutChange}
                />
                {errors.seatLayout && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.seatLayout}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  Configure your bus seat layout by setting rows and columns,
                  then click on seats to enable/disable them. The seat capacity
                  will be automatically calculated.
                </p>
              </div>

              {/* Seat Capacity (Auto-calculated, read-only display) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seat Capacity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="seatCapacity"
                  value={formData.seatCapacity}
                  readOnly
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-gray-600 cursor-not-allowed ${
                    errors.seatCapacity ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.seatCapacity && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.seatCapacity}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  This is automatically calculated from enabled seats in the
                  layout above.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  name="acType"
                  value={formData.acType}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Document Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Document Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <FileUploadField
                  fieldName="rcDocument"
                  label="RC (Registration Certificate)"
                  required={true}
                />
              </div>

              <div className="md:col-span-2">
                <FileUploadField
                  fieldName="pollutionCertificate"
                  label="Pollution Certificate"
                  required={true}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="insuranceNumber"
                  value={formData.insuranceNumber}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.insuranceNumber
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="Enter insurance number"
                />
                {errors.insuranceNumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.insuranceNumber}
                  </p>
                )}
              </div>

              <div>
                <FileUploadField
                  fieldName="insuranceCertificate"
                  label="Insurance Certificate"
                  required={true}
                />
              </div>
            </div>
          </div>

          {/* Bus Images */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Bus Images
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BusImageUpload view="front" label="Front View" />
              <BusImageUpload view="rear" label="Rear View" />
              <BusImageUpload view="left" label="Left View" />
              <BusImageUpload view="right" label="Right View" />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/buses")}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {busMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEdit ? "Updating..." : "Adding..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEdit ? "Update Bus" : "Add Bus"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBusForm;
