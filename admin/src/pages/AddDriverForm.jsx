import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  CreditCard,
  FileText,
  Upload,
  X,
  Save,
  Camera,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import axiosInstance from "../api/axiosInstance";
import { createDriver } from "../api/driver";
// import { createDriver } from "./path/to/api"; // Replace with the correct import path for createDriver
// import axiosInstance from "./path/to/axiosInstance"; // Replace with the correct import path for axiosInstance

const AddDriverForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.isEdit || false;
  const driverData = location.state?.driverData || null;

  // React Query mutation for adding/updating driver
  const createDriverMutation = useMutation({
    mutationFn: async (driverData) => {
      console.log("🚀 ===== DRIVER CREATION START =====");
      console.log("📝 Raw form data received:", JSON.stringify(driverData, null, 2));
      
      const formDataToSend = new FormData();

      // Log FormData for debugging
      console.log("📦 Preparing FormData with driverData:", driverData);

      // Append fields to FormData
      for (const key in driverData) {
        console.log(`🔍 Processing field: ${key} = ${driverData[key]} (type: ${typeof driverData[key]})`);
        
        if (key === "bankAccount") {
          console.log("🏦 Processing bank account fields:");
          console.log("  - accountNumber:", driverData.bankAccount.accountNumber);
          console.log("  - ifscCode:", driverData.bankAccount.ifscCode);
          console.log("  - bankName:", driverData.bankAccount.bankName);
          
          formDataToSend.append(
            "accountNumber",
            driverData.bankAccount.accountNumber
          );
          formDataToSend.append("ifscCode", driverData.bankAccount.ifscCode);
          formDataToSend.append("bankName", driverData.bankAccount.bankName);
        } else if (
          [
            "profileImage",
            "aadharFront",
            "aadharBack",
            "panCard",
            "drivingLicense",
          ].includes(key)
        ) {
          console.log(`📎 Processing file field: ${key}`);
          console.log(`  - Current value:`, driverData[key], "type:", typeof driverData[key]);
          console.log(`  - Original value:`, driverData[key], "type:", typeof driverData[key]);
          
          if (driverData[key] && driverData[key] instanceof File) {
            // New file uploaded
            console.log(`  - New file found: ${driverData[key].name} (${driverData[key].size} bytes)`);
            formDataToSend.append(key, driverData[key]);
          } else if (isEdit && driverData[key] && typeof driverData[key] === 'string') {
            // In edit mode, if there's an existing URL and no new file, keep the existing URL
            console.log(`  - Keeping existing ${key} URL: ${driverData[key]}`);
            formDataToSend.append(key, driverData[key]);
          } else if (isEdit && driverData[key] === null) {
            // File was removed by user - send empty string to clear it
            console.log(`  - File removed by user for ${key} - sending empty string`);
            formDataToSend.append(key, "");
          } else {
            console.log(`  - No file for ${key}`);
          }
        } else if (key === "yearsOfExperience") {
          // Convert years of experience to number
          const expValue = parseInt(driverData[key]) || 0;
          console.log(`🔢 Converting yearsOfExperience: "${driverData[key]}" -> ${expValue}`);
          formDataToSend.append(key, expValue);
        } else {
          console.log(`📝 Adding regular field: ${key} = "${driverData[key]}"`);
          formDataToSend.append(key, driverData[key]);
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

      // Use createDriver for add mode, axiosInstance.put for edit mode
      if (isEdit) {
        if (!driverData?.id) {
          throw new Error("Driver ID is missing in edit mode");
        }
        console.log(`🔄 Making PUT request to /drivers/${driverData.id}`);
        const response = await axiosInstance.put(
          `/drivers/${driverData.id}`,
          formDataToSend
        );
        console.log("✅ PUT response received:", response.data);
        return response.data;
      } else {
        console.log("🆕 Making POST request to /drivers");
        const response = await createDriver(formDataToSend);
        console.log("✅ POST response received:", response.data);
        return response.data;
      }
    },
    onSuccess: (data) => {
      console.log("Driver saved successfully:", data);
      // Show success message with better UX
      const successMessage = isEdit 
        ? "Driver updated successfully!" 
        : "Driver added successfully!";
      
      // You could replace this with a toast notification library
      alert(successMessage);
      
      // Navigate back to drivers list
      navigate("/drivers");
    },
    onError: (error) => {
      console.error("❌ ===== DRIVER CREATION ERROR =====");
      console.error("🚨 Full error object:", error);
      console.error("🔍 Error response:", error.response);
      console.error("📊 Error response data:", error.response?.data);
      console.error("📈 Error response status:", error.response?.status);
      console.error("📋 Error response headers:", error.response?.headers);
      console.error("🌐 Error request config:", error.config);
      
      // Extract error message from response
      let errorMessage = "Error saving driver. Please try again.";
      
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

  const [formData, setFormData] = useState({
    jobTitle: "Driver",
    fullName: "",
    fathersName: "",
    mothersName: "",
    mobile: "",
    alternateMobile: "",
    email: "",
    profileImage: null,
    dateOfBirth: "",
    permanentAddress: "",
    aadharFront: null,
    aadharBack: null,
    aadharNumber: "",
    panCard: null,
    panNumber: "",
    bankAccount: {
      accountNumber: "",
      ifscCode: "",
      bankName: "",
    },
    drivingLicense: null,
    yearsOfExperience: "",
    handicapped: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && driverData) {
      console.log("Loading driver data for edit:", driverData);
      setFormData({
        ...driverData,
        dateOfBirth: driverData.dateOfBirth
          ? driverData.dateOfBirth.split("T")[0]
          : "",
        profileImage: driverData.profileImage,
        aadharFront: driverData.aadharFront,
        aadharBack: driverData.aadharBack,
        panCard: driverData.panCard,
        drivingLicense: driverData.drivingLicense,
      });
    }
  }, [isEdit, driverData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;

    // Format Aadhar number with spaces
    if (name === "aadharNumber") {
      // Remove all non-digits
      const digits = value.replace(/\D/g, "");
      // Add spaces every 4 digits
      if (digits.length <= 12) {
        processedValue = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
      } else {
        processedValue = digits.slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1 ");
      }
    }

    // Format mobile numbers - allow only numbers, +, and spaces, max 15 chars
    if (name === "mobile" || name === "alternateMobile") {
      // Allow only numbers, +, and spaces
      processedValue = value.replace(/[^0-9+\s]/g, "");
      // Limit to 15 characters
      if (processedValue.length > 15) {
        processedValue = processedValue.slice(0, 15);
      }
    }

    // Format PAN number to uppercase
    if (name === "panNumber") {
      processedValue = value.toUpperCase();
    }

    // Format IFSC code to uppercase
    if (name === "bankAccount.ifscCode") {
      processedValue = value.toUpperCase();
    }

    if (name.startsWith("bankAccount.")) {
      const bankField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        bankAccount: {
          ...prev.bankAccount,
          [bankField]: processedValue,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : processedValue,
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

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type - only images
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: "Please upload a valid image (JPG, PNG)",
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

      setFormData((prev) => ({
        ...prev,
        [fieldName]: file,
      }));

      // Clear error
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
    }
  };

  const removeFile = (fieldName) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: null,
    }));

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
    if (!formData.jobTitle) newErrors.jobTitle = "Job title is required";
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.mobile.trim()) newErrors.mobile = "Mobile number is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.dateOfBirth)
      newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.permanentAddress.trim())
      newErrors.permanentAddress = "Address is required";
    if (!formData.aadharNumber.trim())
      newErrors.aadharNumber = "Aadhar number is required";
    if (!formData.panNumber.trim())
      newErrors.panNumber = "PAN number is required";
    if (!formData.bankAccount.accountNumber.trim())
      newErrors["bankAccount.accountNumber"] = "Account number is required";
    if (!formData.bankAccount.ifscCode.trim())
      newErrors["bankAccount.ifscCode"] = "IFSC code is required";
    if (!formData.bankAccount.bankName.trim())
      newErrors["bankAccount.bankName"] = "Bank name is required";
    if (!formData.yearsOfExperience)
      newErrors.yearsOfExperience = "Years of experience is required";
    // File validation - required for both create and edit modes
    // In edit mode, check if there's either a new file or existing file URL
    const hasAadharFront = formData.aadharFront && (
      formData.aadharFront instanceof File || 
      (typeof formData.aadharFront === 'string' && formData.aadharFront.trim() !== '')
    );
    const hasAadharBack = formData.aadharBack && (
      formData.aadharBack instanceof File || 
      (typeof formData.aadharBack === 'string' && formData.aadharBack.trim() !== '')
    );
    const hasPanCard = formData.panCard && (
      formData.panCard instanceof File || 
      (typeof formData.panCard === 'string' && formData.panCard.trim() !== '')
    );
    const hasDrivingLicense = formData.drivingLicense && (
      formData.drivingLicense instanceof File || 
      (typeof formData.drivingLicense === 'string' && formData.drivingLicense.trim() !== '')
    );

    if (!hasAadharFront) {
      newErrors.aadharFront = "Aadhar front image is required";
    }
    if (!hasAadharBack) {
      newErrors.aadharBack = "Aadhar back image is required";
    }
    if (!hasPanCard) {
      newErrors.panCard = "PAN card image is required";
    }
    if (!hasDrivingLicense) {
      newErrors.drivingLicense = "Driving license image is required";
    }

    // Job title validation
    if (formData.jobTitle && !["Driver", "Conductor"].includes(formData.jobTitle)) {
      newErrors.jobTitle = "Job title must be either Driver or Conductor";
    }

    // Name validation - only letters and spaces
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (formData.fullName && !nameRegex.test(formData.fullName.trim())) {
      newErrors.fullName = "Name should only contain letters and spaces";
    }
    if (formData.fullName && formData.fullName.trim().length < 2) {
      newErrors.fullName = "Name must be at least 2 characters long";
    }
    if (formData.fullName && formData.fullName.trim().length > 50) {
      newErrors.fullName = "Name must not exceed 50 characters";
    }

    // Father's name validation
    if (formData.fathersName && !nameRegex.test(formData.fathersName.trim())) {
      newErrors.fathersName =
        "Father's name should only contain letters and spaces";
    }
    if (formData.fathersName && formData.fathersName.trim().length > 50) {
      newErrors.fathersName = "Father's name must not exceed 50 characters";
    }

    // Mother's name validation
    if (formData.mothersName && !nameRegex.test(formData.mothersName.trim())) {
      newErrors.mothersName =
        "Mother's name should only contain letters and spaces";
    }
    if (formData.mothersName && formData.mothersName.trim().length > 50) {
      newErrors.mothersName = "Mother's name must not exceed 50 characters";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (formData.email && formData.email.length > 100) {
      newErrors.email = "Email must not exceed 100 characters";
    }

    // Mobile validation - matches backend validation: Indian format (10 digits starting with 6-9) or international format
    const indianMobileRegex = /^(\+91|0)?[6-9]\d{9}$/;
    const internationalMobileRegex = /^\+?[1-9]\d{1,14}$/;
    if (formData.mobile) {
      const cleanedMobile = formData.mobile.trim();
      if (!indianMobileRegex.test(cleanedMobile) && !internationalMobileRegex.test(cleanedMobile)) {
        newErrors.mobile = "Please enter a valid mobile number (10 digits for Indian numbers starting with 6-9, or international format)";
      }
      if (cleanedMobile.length > 15) {
        newErrors.mobile = "Mobile number must not exceed 15 characters";
      }
    }

    // Alternate mobile validation
    if (formData.alternateMobile) {
      const cleanedAltMobile = formData.alternateMobile.trim();
      if (!indianMobileRegex.test(cleanedAltMobile) && !internationalMobileRegex.test(cleanedAltMobile)) {
        newErrors.alternateMobile = "Please enter a valid alternate mobile number (10 digits for Indian numbers starting with 6-9, or international format)";
      }
      if (cleanedAltMobile.length > 15) {
        newErrors.alternateMobile = "Alternate mobile number must not exceed 15 characters";
      }
    }

    // Date of birth validation
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      if (birthDate > today) {
        newErrors.dateOfBirth = "Date of birth cannot be in the future";
      } else if (age < 18) {
        newErrors.dateOfBirth = "Driver must be at least 18 years old";
      } else if (age > 65) {
        newErrors.dateOfBirth = "Driver must be under 65 years old";
      }
    }

    // Years of experience validation
    if (formData.yearsOfExperience) {
      const experience = parseInt(formData.yearsOfExperience);
      if (experience < 0) {
        newErrors.yearsOfExperience = "Experience cannot be negative";
      } else if (experience > 50) {
        newErrors.yearsOfExperience = "Experience cannot exceed 50 years";
      }
    }

    // Aadhar validation - matches backend validation: 12 digits (format: XXXX XXXX XXXX)
    const aadharRegex = /^\d{4}\s\d{4}\s\d{4}$/;
    const aadharDigitsOnly = /^\d{12}$/;
    if (formData.aadharNumber) {
      const cleanedAadhar = formData.aadharNumber.trim().replace(/\s/g, '');
      if (!aadharDigitsOnly.test(cleanedAadhar)) {
        newErrors.aadharNumber = "Please enter a valid Aadhar number (12 digits, format: XXXX XXXX XXXX)";
      } else if (!aadharRegex.test(formData.aadharNumber.trim())) {
        // Auto-format if user entered without spaces
        if (cleanedAadhar.length === 12) {
          formData.aadharNumber = cleanedAadhar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
        }
      }
    }

    // PAN validation - matches backend validation: ABCDE1234F format
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (formData.panNumber) {
      const cleanedPAN = formData.panNumber.trim().toUpperCase();
      if (!panRegex.test(cleanedPAN)) {
        newErrors.panNumber = "Please enter a valid PAN number (format: ABCDE1234F - 5 letters, 4 digits, 1 letter)";
      } else {
        // Auto-format to uppercase
        formData.panNumber = cleanedPAN;
      }
    }

    // Bank account validation - backend doesn't have regex, just required
    // No additional validation needed for account number format

    // IFSC code validation
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (
      formData.bankAccount.ifscCode &&
      !ifscRegex.test(formData.bankAccount.ifscCode.toUpperCase())
    ) {
      newErrors["bankAccount.ifscCode"] =
        "Please enter a valid IFSC code (format: ABCD0123456)";
    }

    // Bank name validation
    if (
      formData.bankAccount.bankName &&
      formData.bankAccount.bankName.trim().length < 2
    ) {
      newErrors["bankAccount.bankName"] =
        "Bank name must be at least 2 characters";
    }
    if (
      formData.bankAccount.bankName &&
      formData.bankAccount.bankName.trim().length > 100
    ) {
      newErrors["bankAccount.bankName"] =
        "Bank name must not exceed 100 characters";
    }

    // Address validation - match backend max length of 500
    if (
      formData.permanentAddress &&
      formData.permanentAddress.trim().length > 500
    ) {
      newErrors.permanentAddress = "Address must not exceed 500 characters";
    }

    console.log("Validation Errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted, validating...");
    
    // Clear previous errors
    setErrors({});
    
    if (!validateForm()) {
      console.log("Validation failed, stopping submission");
      alert("Validation failed! Please check the highlighted fields for errors and try again.");
      return;
    }
    
    console.log("Validation passed, calling mutation...");
    setIsSubmitting(true);
    
    try {
      await createDriverMutation.mutateAsync(formData);
      console.log("Mutation completed successfully");
    } catch (error) {
      console.error("Mutation error:", error);
      // Error handling is done in the mutation's onError callback
    } finally {
      setIsSubmitting(false);
    }
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
        setPreviewUrl(formData[fieldName]);
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
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(fieldName);
                      }}
                      className="text-red-500 hover:text-red-700 z-20 relative"
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(fieldName);
                    }}
                    className="text-red-500 hover:text-red-700 z-20 relative"
                  >
                    <X className="h-4 w-4" />
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
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            accept="image/*"
            style={{ pointerEvents: formData[fieldName] ? "none" : "auto" }}
          />
        </div>
        {errors[fieldName] && (
          <p className="text-red-500 text-sm mt-1">{errors[fieldName]}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/drivers")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Driver Management
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Driver/Conductor" : "Add New Driver/Conductor"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit
              ? "Update driver/conductor information"
              : "Fill in the details to add a new crew member"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <select
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.jobTitle ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="Driver">Driver</option>
                  <option value="Conductor">Conductor</option>
                </select>
                {errors.jobTitle && (
                  <p className="text-red-500 text-sm mt-1">{errors.jobTitle}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  maxLength={50}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.fullName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter full name"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Father's Name
                </label>
                <input
                  type="text"
                  name="fathersName"
                  value={formData.fathersName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                  placeholder="Enter father's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mother's Name
                </label>
                <input
                  type="text"
                  name="mothersName"
                  value={formData.mothersName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                  placeholder="Enter mother's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.dateOfBirth ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.dateOfBirth && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.dateOfBirth}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleInputChange}
                  min="0"
                  max="50"
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.yearsOfExperience
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="Enter years of experience"
                />
                {errors.yearsOfExperience && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.yearsOfExperience}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permanent Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="permanentAddress"
                  value={formData.permanentAddress}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.permanentAddress
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="Enter complete address"
                />
                {errors.permanentAddress && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.permanentAddress}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="handicapped"
                    checked={formData.handicapped}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Handicapped
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Phone className="h-5 w-5 mr-2" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  maxLength={15}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.mobile ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter mobile number (e.g., +919876543210)"
                />
                {errors.mobile && (
                  <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alternate Mobile Number
                </label>
                <input
                  type="tel"
                  name="alternateMobile"
                  value={formData.alternateMobile}
                  onChange={handleInputChange}
                  maxLength={15}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.alternateMobile ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter alternate mobile number (e.g., +919876543210)"
                />
                {errors.alternateMobile && (
                  <p className="text-red-500 text-sm mt-1">{errors.alternateMobile}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhar Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.aadharNumber ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter 12-digit Aadhar number"
                />
                {errors.aadharNumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.aadharNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors.panNumber ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter PAN number"
                />
                {errors.panNumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.panNumber}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <FileUploadField
                  fieldName="aadharFront"
                  label="Aadhar Card - Front"
                  required={true}
                />
              </div>

              <div className="md:col-span-2">
                <FileUploadField
                  fieldName="aadharBack"
                  label="Aadhar Card - Back"
                  required={true}
                />
              </div>

              <div className="md:col-span-2">
                <FileUploadField
                  fieldName="panCard"
                  label="PAN Card"
                  required={true}
                />
              </div>

              <div className="md:col-span-2">
                <FileUploadField
                  fieldName="drivingLicense"
                  label="Driving License"
                  required={true}
                />
              </div>
            </div>
          </div>

          {/* Bank Account Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Bank Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccount.accountNumber"
                  value={formData.bankAccount.accountNumber}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors["bankAccount.accountNumber"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="Enter account number"
                />
                {errors["bankAccount.accountNumber"] && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors["bankAccount.accountNumber"]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccount.ifscCode"
                  value={formData.bankAccount.ifscCode}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors["bankAccount.ifscCode"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="Enter IFSC code"
                />
                {errors["bankAccount.ifscCode"] && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors["bankAccount.ifscCode"]}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccount.bankName"
                  value={formData.bankAccount.bankName}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                    errors["bankAccount.bankName"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="Enter bank name"
                />
                {errors["bankAccount.bankName"] && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors["bankAccount.bankName"]}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Image */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Profile Image
            </h3>
            <div className="max-w-md">
              <FileUploadField
                fieldName="profileImage"
                label="Profile Photo"
                required={false}
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/drivers")}
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
                  {isEdit ? "Update Driver" : "Add Driver"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDriverForm;

// import { useState, useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import {
//   ArrowLeft,
//   User,
//   Phone,
//   Mail,
//   Calendar,
//   MapPin,
//   CreditCard,
//   FileText,
//   Upload,
//   X,
//   Save,
//   Camera,
// } from "lucide-react";
// import { useMutation } from "@tanstack/react-query";
// // import axios from "axios";

// // // Placeholder axiosInstance - replace with your actual configuration
// // const axiosInstance = axios.create({
// //   baseURL: "http://localhost:5000", // Replace with your API base URL
// //   timeout: 10000,
// // });

// const AddDriverForm = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const isEdit = location.state?.isEdit || false;
//   const driverData = location.state?.driverData || null;

//   // React Query mutation for adding/updating driver
//   const createDriverMutation = useMutation({
//     mutationFn: async (driverData) => {
//       const formDataToSend = new FormData();

//       // Log FormData for debugging
//       console.log("Preparing FormData with driverData:", driverData);

//       // Append fields to FormData
//       for (const key in driverData) {
//         if (key === "bankAccount") {
//           formDataToSend.append(
//             "accountNumber",
//             driverData.bankAccount.accountNumber
//           );
//           formDataToSend.append("ifscCode", driverData.bankAccount.ifscCode);
//           formDataToSend.append("bankName", driverData.bankAccount.bankName);
//         } else if (
//           [
//             "profileImage",
//             "aadharFront",
//             "aadharBack",
//             "panCard",
//             "drivingLicense",
//           ].includes(key)
//         ) {
//           if (driverData[key] && driverData[key] instanceof File) {
//             formDataToSend.append(key, driverData[key]);
//           } else if (isEdit && driverData[key]) {
//             console.log(
//               `Skipping ${key} in edit mode (URL: ${driverData[key]})`
//             );
//           }
//         } else {
//           formDataToSend.append(key, driverData[key]);
//         }
//       }

//       // Log FormData entries
//       for (const [key, value] of formDataToSend.entries()) {
//         console.log(`FormData - ${key}:`, value);
//       }

//       const endpoint = isEdit
//         ? `/api/drivers/${driverData.id}`
//         : "/api/drivers";
//       const method = isEdit ? axiosInstance.put : axiosInstance.post;

//       const response = await method(endpoint, formDataToSend, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       return response.data;
//     },
//     onSuccess: () => {
//       alert(
//         isEdit ? "Driver updated successfully!" : "Driver added successfully!"
//       );
//       navigate("/drivers");
//     },
//     onError: (error) => {
//       console.error("Error saving driver:", error);
//       alert(
//         error.response?.data?.message ||
//           "Error saving driver. Please try again."
//       );
//     },
//   });

//   const [formData, setFormData] = useState({
//     jobTitle: "Driver",
//     fullName: "",
//     fathersName: "",
//     mothersName: "",
//     mobile: "",
//     alternateMobile: "",
//     email: "",
//     profileImage: null,
//     dateOfBirth: "",
//     permanentAddress: "",
//     aadharFront: null,
//     aadharBack: null,
//     aadharNumber: "",
//     panCard: null,
//     panNumber: "",
//     bankAccount: {
//       accountNumber: "",
//       ifscCode: "",
//       bankName: "",
//     },
//     drivingLicense: null,
//     yearsOfExperience: "",
//     handicapped: false,
//   });

//   const [errors, setErrors] = useState({});
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   useEffect(() => {
//     if (isEdit && driverData) {
//       console.log("Loading driver data for edit:", driverData);
//       setFormData({
//         ...driverData,
//         dateOfBirth: driverData.dateOfBirth
//           ? driverData.dateOfBirth.split("T")[0]
//           : "",
//         profileImage: driverData.profileImage,
//         aadharFront: driverData.aadharFront,
//         aadharBack: driverData.aadharBack,
//         panCard: driverData.panCard,
//         drivingLicense: driverData.drivingLicense,
//       });
//     }
//   }, [isEdit, driverData]);

//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;

//     if (name.startsWith("bankAccount.")) {
//       const bankField = name.split(".")[1];
//       setFormData((prev) => ({
//         ...prev,
//         bankAccount: {
//           ...prev.bankAccount,
//           [bankField]: value,
//         },
//       }));
//     } else {
//       setFormData((prev) => ({
//         ...prev,
//         [name]: type === "checkbox" ? checked : value,
//       }));
//     }

//     // Clear error when user starts typing
//     if (errors[name]) {
//       setErrors((prev) => ({
//         ...prev,
//         [name]: "",
//       }));
//     }
//   };

//   const handleFileUpload = (e, fieldName) => {
//     const file = e.target.files[0];
//     if (file) {
//       // Validate file type - only images
//       const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
//       if (!allowedTypes.includes(file.type)) {
//         setErrors((prev) => ({
//           ...prev,
//           [fieldName]: "Please upload a valid image (JPG, PNG)",
//         }));
//         return;
//       }

//       // Validate file size (5MB max)
//       if (file.size > 5 * 1024 * 1024) {
//         setErrors((prev) => ({
//           ...prev,
//           [fieldName]: "File size must be less than 5MB",
//         }));
//         return;
//       }

//       setFormData((prev) => ({
//         ...prev,
//         [fieldName]: file,
//       }));

//       // Clear error
//       setErrors((prev) => ({
//         ...prev,
//         [fieldName]: "",
//       }));
//     }
//   };

//   const removeFile = (fieldName) => {
//     setFormData((prev) => ({
//       ...prev,
//       [fieldName]: null,
//     }));

//     // Clear any errors for this field
//     if (errors[fieldName]) {
//       setErrors((prev) => ({
//         ...prev,
//         [fieldName]: "",
//       }));
//     }
//   };

//   const validateForm = () => {
//     const newErrors = {};

//     // Required fields validation
//     if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
//     if (!formData.mobile.trim()) newErrors.mobile = "Mobile number is required";
//     if (!formData.email.trim()) newErrors.email = "Email is required";
//     if (!formData.dateOfBirth)
//       newErrors.dateOfBirth = "Date of birth is required";
//     if (!formData.permanentAddress.trim())
//       newErrors.permanentAddress = "Address is required";
//     if (!formData.aadharNumber.trim())
//       newErrors.aadharNumber = "Aadhar number is required";
//     if (!formData.panNumber.trim())
//       newErrors.panNumber = "PAN number is required";
//     if (!formData.bankAccount.accountNumber.trim())
//       newErrors["bankAccount.accountNumber"] = "Account number is required";
//     if (!formData.bankAccount.ifscCode.trim())
//       newErrors["bankAccount.ifscCode"] = "IFSC code is required";
//     if (!formData.bankAccount.bankName.trim())
//       newErrors["bankAccount.bankName"] = "Bank name is required";
//     if (!formData.yearsOfExperience)
//       newErrors.yearsOfExperience = "Years of experience is required";
//     if (!isEdit && !formData.aadharFront)
//       newErrors.aadharFront = "Aadhar front image is required";
//     if (!isEdit && !formData.aadharBack)
//       newErrors.aadharBack = "Aadhar back image is required";
//     if (!isEdit && !formData.panCard)
//       newErrors.panCard = "PAN card image is required";
//     if (!isEdit && !formData.drivingLicense)
//       newErrors.drivingLicense = "Driving license image is required";

//     // Name validation - only letters and spaces
//     const nameRegex = /^[a-zA-Z\s]+$/;
//     if (formData.fullName && !nameRegex.test(formData.fullName.trim())) {
//       newErrors.fullName = "Name should only contain letters and spaces";
//     }
//     if (formData.fullName && formData.fullName.trim().length < 2) {
//       newErrors.fullName = "Name must be at least 2 characters long";
//     }
//     if (formData.fullName && formData.fullName.trim().length > 50) {
//       newErrors.fullName = "Name must not exceed 50 characters";
//     }

//     // Father's name validation
//     if (formData.fathersName && !nameRegex.test(formData.fathersName.trim())) {
//       newErrors.fathersName =
//         "Father's name should only contain letters and spaces";
//     }
//     if (formData.fathersName && formData.fathersName.trim().length > 50) {
//       newErrors.fathersName = "Father's name must not exceed 50 characters";
//     }

//     // Mother's name validation
//     if (formData.mothersName && !nameRegex.test(formData.mothersName.trim())) {
//       newErrors.mothersName =
//         "Mother's name should only contain letters and spaces";
//     }
//     if (formData.mothersName && formData.mothersName.trim().length > 50) {
//       newErrors.mothersName = "Mother's name must not exceed 50 characters";
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (formData.email && !emailRegex.test(formData.email)) {
//       newErrors.email = "Please enter a valid email address";
//     }
//     if (formData.email && formData.email.length > 100) {
//       newErrors.email = "Email must not exceed 100 characters";
//     }

//     // Mobile validation
//     const mobileRegex = /^[6-9]\d{9}$/;
//     if (
//       formData.mobile &&
//       !mobileRegex.test(formData.mobile.replace(/\D/g, ""))
//     ) {
//       newErrors.mobile =
//         "Please enter a valid 10-digit mobile number starting with 6-9";
//     }

//     // Alternate mobile validation
//     if (
//       formData.alternateMobile &&
//       !mobileRegex.test(formData.alternateMobile.replace(/\D/g, ""))
//     ) {
//       newErrors.alternateMobile =
//         "Please enter a valid 10-digit mobile number starting with 6-9";
//     }

//     // Date of birth validation
//     if (formData.dateOfBirth) {
//       const birthDate = new Date(formData.dateOfBirth);
//       const today = new Date();
//       const age = today.getFullYear() - birthDate.getFullYear();

//       if (birthDate > today) {
//         newErrors.dateOfBirth = "Date of birth cannot be in the future";
//       } else if (age < 18) {
//         newErrors.dateOfBirth = "Driver must be at least 18 years old";
//       } else if (age > 65) {
//         newErrors.dateOfBirth = "Driver must be under 65 years old";
//       }
//     }

//     // Years of experience validation
//     if (formData.yearsOfExperience) {
//       const experience = parseInt(formData.yearsOfExperience);
//       if (experience < 0) {
//         newErrors.yearsOfExperience = "Experience cannot be negative";
//       } else if (experience > 50) {
//         newErrors.yearsOfExperience = "Experience cannot exceed 50 years";
//       }
//     }

//     // Aadhar validation
//     const aadharRegex = /^\d{4}\s?\d{4}\s?\d{4}$/;
//     if (formData.aadharNumber && !aadharRegex.test(formData.aadharNumber)) {
//       newErrors.aadharNumber = "Please enter a valid 12-digit Aadhar number";
//     }

//     // PAN validation
//     const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
//     if (
//       formData.panNumber &&
//       !panRegex.test(formData.panNumber.toUpperCase())
//     ) {
//       newErrors.panNumber =
//         "Please enter a valid PAN number (format: ABCDE1234F)";
//     }

//     // Bank account validation
//     if (
//       formData.bankAccount.accountNumber &&
//       !/^\d{9,18}$/.test(formData.bankAccount.accountNumber)
//     ) {
//       newErrors["bankAccount.accountNumber"] =
//         "Account number should be 9-18 digits";
//     }

//     // IFSC code validation
//     const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
//     if (
//       formData.bankAccount.ifscCode &&
//       !ifscRegex.test(formData.bankAccount.ifscCode.toUpperCase())
//     ) {
//       newErrors["bankAccount.ifscCode"] =
//         "Please enter a valid IFSC code (format: ABCD0123456)";
//     }

//     // Bank name validation
//     if (
//       formData.bankAccount.bankName &&
//       formData.bankAccount.bankName.trim().length < 2
//     ) {
//       newErrors["bankAccount.bankName"] =
//         "Bank name must be at least 2 characters";
//     }
//     if (
//       formData.bankAccount.bankName &&
//       formData.bankAccount.bankName.trim().length > 100
//     ) {
//       newErrors["bankAccount.bankName"] =
//         "Bank name must not exceed 100 characters";
//     }

//     // Address validation
//     if (
//       formData.permanentAddress &&
//       formData.permanentAddress.trim().length < 10
//     ) {
//       newErrors.permanentAddress =
//         "Address must be at least 10 characters long";
//     }
//     if (
//       formData.permanentAddress &&
//       formData.permanentAddress.trim().length > 500
//     ) {
//       newErrors.permanentAddress = "Address must not exceed 500 characters";
//     }

//     console.log("Validation Errors:", newErrors);
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     console.log("Form submitted, validating...");
//     if (!validateForm()) {
//       console.log("Validation failed, stopping submission");
//       return;
//     }
//     console.log("Validation passed, calling mutation...");
//     setIsSubmitting(true);
//     try {
//       await createDriverMutation.mutateAsync(formData);
//       console.log("Mutation completed successfully");
//     } catch (error) {
//       console.error("Mutation error:", error);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const FileUploadField = ({ fieldName, label, required = false }) => {
//     const [previewUrl, setPreviewUrl] = useState(null);

//     useEffect(() => {
//       if (formData[fieldName] && formData[fieldName] instanceof File) {
//         const url = URL.createObjectURL(formData[fieldName]);
//         setPreviewUrl(url);
//         return () => URL.revokeObjectURL(url);
//       } else if (
//         formData[fieldName] &&
//         typeof formData[fieldName] === "string"
//       ) {
//         setPreviewUrl(formData[fieldName]);
//       } else {
//         setPreviewUrl(null);
//       }
//     }, [formData[fieldName], fieldName]);

//     return (
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           {label} {required && <span className="text-red-500">*</span>}
//         </label>
//         <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative">
//           {formData[fieldName] ? (
//             <div>
//               {previewUrl ? (
//                 <div className="space-y-3">
//                   <div className="flex justify-center">
//                     <img
//                       src={previewUrl}
//                       alt="Preview"
//                       className="max-w-full max-h-48 rounded-lg object-cover"
//                     />
//                   </div>
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center">
//                       <FileText className="h-5 w-5 text-gray-400 mr-2" />
//                       <span className="text-sm text-gray-600">
//                         {formData[fieldName].name || "Image uploaded"}
//                       </span>
//                     </div>
//                     <button
//                       type="button"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         removeFile(fieldName);
//                       }}
//                       className="text-red-500 hover:text-red-700 z-20 relative"
//                     >
//                       <X className="h-4 w-4" />
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center">
//                     <FileText className="h-5 w-5 text-gray-400 mr-2" />
//                     <span className="text-sm text-gray-600">
//                       {formData[fieldName].name || "File uploaded"}
//                     </span>
//                   </div>
//                   <button
//                     type="button"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       removeFile(fieldName);
//                     }}
//                     className="text-red-500 hover:text-red-700 z-20 relative"
//                   >
//                     <X className="h-4 w-4" />
//                   </button>
//                 </div>
//               )}
//             </div>
//           ) : (
//             <div>
//               <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
//               <p className="text-sm text-gray-600">
//                 Click to upload or drag and drop
//               </p>
//               <p className="text-xs text-gray-500">JPG, PNG (max 5MB)</p>
//             </div>
//           )}
//           <input
//             type="file"
//             onChange={(e) => handleFileUpload(e, fieldName)}
//             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
//             accept="image/*"
//             style={{ pointerEvents: formData[fieldName] ? "none" : "auto" }}
//           />
//         </div>
//         {errors[fieldName] && (
//           <p className="text-red-500 text-sm mt-1">{errors[fieldName]}</p>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="mx-auto">
//         {/* Header */}
//         <div className="mb-6">
//           <button
//             onClick={() => navigate("/drivers")}
//             className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
//           >
//             <ArrowLeft className="h-5 w-5 mr-2" />
//             Back to Driver Management
//           </button>
//           <h1 className="text-2xl font-bold text-gray-900">
//             {isEdit ? "Edit Driver/Conductor" : "Add New Driver/Conductor"}
//           </h1>
//           <p className="text-gray-600 mt-1">
//             {isEdit
//               ? "Update driver/conductor information"
//               : "Fill in the details to add a new crew member"}
//           </p>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-8">
//           {/* Basic Information */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
//               <User className="h-5 w-5 mr-2" />
//               Basic Information
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Job Title <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   name="jobTitle"
//                   value={formData.jobTitle}
//                   onChange={handleInputChange}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 >
//                   <option value="Driver">Driver</option>
//                   <option value="Conductor">Conductor</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Full Name <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="fullName"
//                   value={formData.fullName}
//                   onChange={handleInputChange}
//                   maxLength={50}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.fullName ? "border-red-500" : "border-gray-300"
//                   }`}
//                   placeholder="Enter full name"
//                 />
//                 {errors.fullName && (
//                   <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Father's Name
//                 </label>
//                 <input
//                   type="text"
//                   name="fathersName"
//                   value={formData.fathersName}
//                   onChange={handleInputChange}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
//                   placeholder="Enter father's name"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Mother's Name
//                 </label>
//                 <input
//                   type="text"
//                   name="mothersName"
//                   value={formData.mothersName}
//                   onChange={handleInputChange}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
//                   placeholder="Enter mother's name"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Date of Birth <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="date"
//                   name="dateOfBirth"
//                   value={formData.dateOfBirth}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
//                     errors.dateOfBirth ? "border-red-500" : "border-gray-300"
//                   }`}
//                 />
//                 {errors.dateOfBirth && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors.dateOfBirth}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Years of Experience <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="number"
//                   name="yearsOfExperience"
//                   value={formData.yearsOfExperience}
//                   onChange={handleInputChange}
//                   min="0"
//                   max="50"
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.yearsOfExperience
//                       ? "border-red-500"
//                       : "border-gray-300"
//                   }`}
//                   placeholder="Enter years of experience"
//                 />
//                 {errors.yearsOfExperience && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors.yearsOfExperience}
//                   </p>
//                 )}
//               </div>

//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Permanent Address <span className="text-red-500">*</span>
//                 </label>
//                 <textarea
//                   name="permanentAddress"
//                   value={formData.permanentAddress}
//                   onChange={handleInputChange}
//                   rows={3}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.permanentAddress
//                       ? "border-red-500"
//                       : "border-gray-300"
//                   }`}
//                   placeholder="Enter complete address"
//                 />
//                 {errors.permanentAddress && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors.permanentAddress}
//                   </p>
//                 )}
//               </div>

//               <div className="md:col-span-2">
//                 <label className="flex items-center">
//                   <input
//                     type="checkbox"
//                     name="handicapped"
//                     checked={formData.handicapped}
//                     onChange={handleInputChange}
//                     className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
//                   />
//                   <span className="ml-2 text-sm text-gray-700">
//                     Handicapped
//                   </span>
//                 </label>
//               </div>
//             </div>
//           </div>

//           {/* Contact Information */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
//               <Phone className="h-5 w-5 mr-2" />
//               Contact Information
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Mobile Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="tel"
//                   name="mobile"
//                   value={formData.mobile}
//                   onChange={handleInputChange}
//                   maxLength={10}
//                   pattern="[6-9][0-9]{9}"
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.mobile ? "border-red-500" : "border-gray-300"
//                   }`}
//                   placeholder="Enter 10-digit mobile number"
//                 />
//                 {errors.mobile && (
//                   <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Alternate Mobile Number
//                 </label>
//                 <input
//                   type="tel"
//                   name="alternateMobile"
//                   value={formData.alternateMobile}
//                   onChange={handleInputChange}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
//                   placeholder="Enter alternate mobile number"
//                 />
//               </div>

//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Email Address <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="email"
//                   name="email"
//                   value={formData.email}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.email ? "border-red-500" : "border-gray-300"
//                   }`}
//                   placeholder="Enter email address"
//                 />
//                 {errors.email && (
//                   <p className="text-red-500 text-sm mt-1">{errors.email}</p>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Document Information */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
//               <FileText className="h-5 w-5 mr-2" />
//               Document Information
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Aadhar Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="aadharNumber"
//                   value={formData.aadharNumber}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.aadharNumber ? "border-red-500" : "border-gray-300"
//                   }`}
//                   placeholder="Enter 12-digit Aadhar number"
//                 />
//                 {errors.aadharNumber && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors.aadharNumber}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   PAN Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="panNumber"
//                   value={formData.panNumber}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.panNumber ? "border-red-500" : "border-gray-300"
//                   }`}
//                   placeholder="Enter PAN number"
//                 />
//                 {errors.panNumber && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors.panNumber}
//                   </p>
//                 )}
//               </div>

//               <div className="md:col-span-2">
//                 <FileUploadField
//                   fieldName="aadharFront"
//                   label="Aadhar Card - Front"
//                   required={true}
//                 />
//               </div>

//               <div className="md:col-span-2">
//                 <FileUploadField
//                   fieldName="aadharBack"
//                   label="Aadhar Card - Back"
//                   required={true}
//                 />
//               </div>

//               <div className="md:col-span-2">
//                 <FileUploadField
//                   fieldName="panCard"
//                   label="PAN Card"
//                   required={true}
//                 />
//               </div>

//               <div className="md:col-span-2">
//                 <FileUploadField
//                   fieldName="drivingLicense"
//                   label="Driving License"
//                   required={true}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Bank Account Information */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
//               <CreditCard className="h-5 w-5 mr-2" />
//               Bank Account Information
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Account Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="bankAccount.accountNumber"
//                   value={formData.bankAccount.accountNumber}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors["bankAccount.accountNumber"]
//                       ? "border-red-500"
//                       : "border-gray-300"
//                   }`}
//                   placeholder="Enter account number"
//                 />
//                 {errors["bankAccount.accountNumber"] && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors["bankAccount.accountNumber"]}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   IFSC Code <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="bankAccount.ifscCode"
//                   value={formData.bankAccount.ifscCode}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors["bankAccount.ifscCode"]
//                       ? "border-red-500"
//                       : "border-gray-300"
//                   }`}
//                   placeholder="Enter IFSC code"
//                 />
//                 {errors["bankAccount.ifscCode"] && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors["bankAccount.ifscCode"]}
//                   </p>
//                 )}
//               </div>

//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Bank Name <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="bankAccount.bankName"
//                   value={formData.bankAccount.bankName}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors["bankAccount.bankName"]
//                       ? "border-red-500"
//                       : "border-gray-300"
//                   }`}
//                   placeholder="Enter bank name"
//                 />
//                 {errors["bankAccount.bankName"] && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors["bankAccount.bankName"]}
//                   </p>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Profile Image */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
//               <Camera className="h-5 w-5 mr-2" />
//               Profile Image
//             </h3>
//             <div className="max-w-md">
//               <FileUploadField
//                 fieldName="profileImage"
//                 label="Profile Photo"
//                 required={false}
//               />
//             </div>
//           </div>

//           {/* Submit Buttons */}
//           <div className="flex justify-end space-x-4">
//             <button
//               type="button"
//               onClick={() => navigate("/drivers")}
//               className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={isSubmitting}
//               className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
//             >
//               {isSubmitting ? (
//                 <>
//                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                   Saving...
//                 </>
//               ) : (
//                 <>
//                   <Save className="h-4 w-4 mr-2" />
//                   {isEdit ? "Update Driver" : "Add Driver"}
//                 </>
//               )}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default AddDriverForm;

// import { useState, useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import {
//   ArrowLeft,
//   User,
//   Phone,
//   Mail,
//   Calendar,
//   MapPin,
//   CreditCard,
//   FileText,
//   Upload,
//   X,
//   Save,
//   Camera,
// } from "lucide-react";

// const AddDriverForm = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const isEdit = location.state?.isEdit || false;
//   const driverData = location.state?.driverData || null;

//   const [formData, setFormData] = useState({
//     jobTitle: "Driver",
//     fullName: "",
//     fathersName: "",
//     mothersName: "",
//     mobile: "",
//     alternateMobile: "",
//     email: "",
//     profileImage: null,
//     dateOfBirth: "",
//     permanentAddress: "",
//     aadharFront: null,
//     aadharBack: null,
//     aadharNumber: "",
//     panCard: null,
//     panNumber: "",
//     bankAccount: {
//       accountNumber: "",
//       ifscCode: "",
//       bankName: "",
//     },
//     drivingLicense: null,
//     yearsOfExperience: "",
//     handicapped: false,
//   });

//   const [errors, setErrors] = useState({});
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   useEffect(() => {
//     if (isEdit && driverData) {
//       setFormData({
//         ...driverData,
//         dateOfBirth: driverData.dateOfBirth
//           ? driverData.dateOfBirth.split("T")[0]
//           : "",
//         profileImage: driverData.profileImage,
//         aadharFront: driverData.aadharFront,
//         aadharBack: driverData.aadharBack,
//         panCard: driverData.panCard,
//         drivingLicense: driverData.drivingLicense,
//       });
//     }
//   }, [isEdit, driverData]);

//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;

//     if (name.startsWith("bankAccount.")) {
//       const bankField = name.split(".")[1];
//       setFormData((prev) => ({
//         ...prev,
//         bankAccount: {
//           ...prev.bankAccount,
//           [bankField]: value,
//         },
//       }));
//     } else {
//       setFormData((prev) => ({
//         ...prev,
//         [name]: type === "checkbox" ? checked : value,
//       }));
//     }

//     // Clear error when user starts typing
//     if (errors[name]) {
//       setErrors((prev) => ({
//         ...prev,
//         [name]: "",
//       }));
//     }
//   };

//   const handleFileUpload = (e, fieldName) => {
//     const file = e.target.files[0];
//     if (file) {
//       // Validate file type - only images
//       const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
//       if (!allowedTypes.includes(file.type)) {
//         setErrors((prev) => ({
//           ...prev,
//           [fieldName]: "Please upload a valid image (JPG, PNG)",
//         }));
//         return;
//       }

//       // Validate file size (5MB max)
//       if (file.size > 5 * 1024 * 1024) {
//         setErrors((prev) => ({
//           ...prev,
//           [fieldName]: "File size must be less than 5MB",
//         }));
//         return;
//       }

//       setFormData((prev) => ({
//         ...prev,
//         [fieldName]: file,
//       }));

//       // Clear error
//       setErrors((prev) => ({
//         ...prev,
//         [fieldName]: "",
//       }));
//     }
//   };

//   const removeFile = (fieldName) => {
//     setFormData((prev) => ({
//       ...prev,
//       [fieldName]: null,
//     }));

//     // Clear any errors for this field
//     if (errors[fieldName]) {
//       setErrors((prev) => ({
//         ...prev,
//         [fieldName]: "",
//       }));
//     }
//   };

//   const validateForm = () => {
//     const newErrors = {};

//     // Required fields validation
//     if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
//     if (!formData.mobile.trim()) newErrors.mobile = "Mobile number is required";
//     if (!formData.email.trim()) newErrors.email = "Email is required";
//     if (!formData.dateOfBirth)
//       newErrors.dateOfBirth = "Date of birth is required";
//     if (!formData.permanentAddress.trim())
//       newErrors.permanentAddress = "Address is required";
//     if (!formData.aadharNumber.trim())
//       newErrors.aadharNumber = "Aadhar number is required";
//     if (!formData.panNumber.trim())
//       newErrors.panNumber = "PAN number is required";
//     if (!formData.bankAccount.accountNumber.trim())
//       newErrors["bankAccount.accountNumber"] = "Account number is required";
//     if (!formData.bankAccount.ifscCode.trim())
//       newErrors["bankAccount.ifscCode"] = "IFSC code is required";
//     if (!formData.bankAccount.bankName.trim())
//       newErrors["bankAccount.bankName"] = "Bank name is required";
//     if (!formData.yearsOfExperience)
//       newErrors.yearsOfExperience = "Years of experience is required";

//     // Name validation - only letters and spaces
//     const nameRegex = /^[a-zA-Z\s]+$/;
//     if (formData.fullName && !nameRegex.test(formData.fullName.trim())) {
//       newErrors.fullName = "Name should only contain letters and spaces";
//     }
//     if (formData.fullName && formData.fullName.trim().length < 2) {
//       newErrors.fullName = "Name must be at least 2 characters long";
//     }
//     if (formData.fullName && formData.fullName.trim().length > 50) {
//       newErrors.fullName = "Name must not exceed 50 characters";
//     }

//     // Fathers name validation
//     if (formData.fathersName && !nameRegex.test(formData.fathersName.trim())) {
//       newErrors.fathersName =
//         "Father's name should only contain letters and spaces";
//     }
//     if (formData.fathersName && formData.fathersName.trim().length > 50) {
//       newErrors.fathersName = "Father's name must not exceed 50 characters";
//     }

//     // Mothers name validation
//     if (formData.mothersName && !nameRegex.test(formData.mothersName.trim())) {
//       newErrors.mothersName =
//         "Mother's name should only contain letters and spaces";
//     }
//     if (formData.mothersName && formData.mothersName.trim().length > 50) {
//       newErrors.mothersName = "Mother's name must not exceed 50 characters";
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (formData.email && !emailRegex.test(formData.email)) {
//       newErrors.email = "Please enter a valid email address";
//     }
//     if (formData.email && formData.email.length > 100) {
//       newErrors.email = "Email must not exceed 100 characters";
//     }

//     // Mobile validation
//     const mobileRegex = /^[6-9]\d{9}$/;
//     if (
//       formData.mobile &&
//       !mobileRegex.test(formData.mobile.replace(/\D/g, ""))
//     ) {
//       newErrors.mobile =
//         "Please enter a valid 10-digit mobile number starting with 6-9";
//     }

//     // Alternate mobile validation
//     if (
//       formData.alternateMobile &&
//       !mobileRegex.test(formData.alternateMobile.replace(/\D/g, ""))
//     ) {
//       newErrors.alternateMobile =
//         "Please enter a valid 10-digit mobile number starting with 6-9";
//     }

//     // Date of birth validation
//     if (formData.dateOfBirth) {
//       const birthDate = new Date(formData.dateOfBirth);
//       const today = new Date();
//       const age = today.getFullYear() - birthDate.getFullYear();

//       if (birthDate > today) {
//         newErrors.dateOfBirth = "Date of birth cannot be in the future";
//       } else if (age < 18) {
//         newErrors.dateOfBirth = "Driver must be at least 18 years old";
//       } else if (age > 65) {
//         newErrors.dateOfBirth = "Driver must be under 65 years old";
//       }
//     }

//     // Years of experience validation
//     if (formData.yearsOfExperience) {
//       const experience = parseInt(formData.yearsOfExperience);
//       if (experience < 0) {
//         newErrors.yearsOfExperience = "Experience cannot be negative";
//       } else if (experience > 50) {
//         newErrors.yearsOfExperience = "Experience cannot exceed 50 years";
//       }
//     }

//     // Aadhar validation
//     const aadharRegex = /^\d{4}\s?\d{4}\s?\d{4}$/;
//     if (formData.aadharNumber && !aadharRegex.test(formData.aadharNumber)) {
//       newErrors.aadharNumber = "Please enter a valid 12-digit Aadhar number";
//     }

//     // PAN validation
//     const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
//     if (
//       formData.panNumber &&
//       !panRegex.test(formData.panNumber.toUpperCase())
//     ) {
//       newErrors.panNumber =
//         "Please enter a valid PAN number (format: ABCDE1234F)";
//     }

//     // Bank account validation
//     if (
//       formData.bankAccount.accountNumber &&
//       !/^\d{9,18}$/.test(formData.bankAccount.accountNumber)
//     ) {
//       newErrors["bankAccount.accountNumber"] =
//         "Account number should be 9-18 digits";
//     }

//     // IFSC code validation
//     const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
//     if (
//       formData.bankAccount.ifscCode &&
//       !ifscRegex.test(formData.bankAccount.ifscCode.toUpperCase())
//     ) {
//       newErrors["bankAccount.ifscCode"] =
//         "Please enter a valid IFSC code (format: ABCD0123456)";
//     }

//     // Bank name validation
//     if (
//       formData.bankAccount.bankName &&
//       formData.bankAccount.bankName.trim().length < 2
//     ) {
//       newErrors["bankAccount.bankName"] =
//         "Bank name must be at least 2 characters";
//     }
//     if (
//       formData.bankAccount.bankName &&
//       formData.bankAccount.bankName.trim().length > 100
//     ) {
//       newErrors["bankAccount.bankName"] =
//         "Bank name must not exceed 100 characters";
//     }

//     // Address validation
//     if (
//       formData.permanentAddress &&
//       formData.permanentAddress.trim().length < 10
//     ) {
//       newErrors.permanentAddress =
//         "Address must be at least 10 characters long";
//     }
//     if (
//       formData.permanentAddress &&
//       formData.permanentAddress.trim().length > 500
//     ) {
//       newErrors.permanentAddress = "Address must not exceed 500 characters";
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!validateForm()) {
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Simulate API call
//       await new Promise((resolve) => setTimeout(resolve, 1000));

//       // Here you would typically make an API call to save the driver data
//       console.log("Driver data to be saved:", formData);

//       // Show success message and navigate back
//       alert(
//         isEdit ? "Driver updated successfully!" : "Driver added successfully!"
//       );
//       navigate("/drivers");
//     } catch (error) {
//       console.error("Error saving driver:", error);
//       alert("Error saving driver. Please try again.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const FileUploadField = ({ fieldName, label, required = false }) => {
//     const [previewUrl, setPreviewUrl] = useState(null);

//     useEffect(() => {
//       if (formData[fieldName] && formData[fieldName] instanceof File) {
//         const url = URL.createObjectURL(formData[fieldName]);
//         setPreviewUrl(url);
//         return () => URL.revokeObjectURL(url);
//       } else if (
//         formData[fieldName] &&
//         typeof formData[fieldName] === "string"
//       ) {
//         setPreviewUrl(formData[fieldName]);
//       } else {
//         setPreviewUrl(null);
//       }
//     }, [formData[fieldName], fieldName]);

//     return (
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           {label} {required && <span className="text-red-500">*</span>}
//         </label>
//         <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative">
//           {formData[fieldName] ? (
//             <div>
//               {previewUrl ? (
//                 <div className="space-y-3">
//                   <div className="flex justify-center">
//                     <img
//                       src={previewUrl}
//                       alt="Preview"
//                       className="max-w-full max-h-48 rounded-lg object-cover"
//                     />
//                   </div>
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center">
//                       <FileText className="h-5 w-5 text-gray-400 mr-2" />
//                       <span className="text-sm text-gray-600">
//                         {formData[fieldName].name || "Image uploaded"}
//                       </span>
//                     </div>
//                     <button
//                       type="button"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         removeFile(fieldName);
//                       }}
//                       className="text-red-500 hover:text-red-700 z-20 relative"
//                     >
//                       <X className="h-4 w-4" />
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center">
//                     <FileText className="h-5 w-5 text-gray-400 mr-2" />
//                     <span className="text-sm text-gray-600">
//                       {formData[fieldName].name || "File uploaded"}
//                     </span>
//                   </div>
//                   <button
//                     type="button"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       removeFile(fieldName);
//                     }}
//                     className="text-red-500 hover:text-red-700 z-20 relative"
//                   >
//                     <X className="h-4 w-4" />
//                   </button>
//                 </div>
//               )}
//             </div>
//           ) : (
//             <div>
//               <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
//               <p className="text-sm text-gray-600">
//                 Click to upload or drag and drop
//               </p>
//               <p className="text-xs text-gray-500">JPG, PNG (max 5MB)</p>
//             </div>
//           )}
//           <input
//             type="file"
//             onChange={(e) => handleFileUpload(e, fieldName)}
//             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
//             accept="image/*"
//             style={{ pointerEvents: formData[fieldName] ? "none" : "auto" }}
//           />
//         </div>
//         {errors[fieldName] && (
//           <p className="text-red-500 text-sm mt-1">{errors[fieldName]}</p>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="mx-auto">
//         {/* Header */}
//         <div className="mb-6">
//           <button
//             onClick={() => navigate("/drivers")}
//             className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
//           >
//             <ArrowLeft className="h-5 w-5 mr-2" />
//             Back to Driver Management
//           </button>
//           <h1 className="text-2xl font-bold text-gray-900">
//             {isEdit ? "Edit Driver/Conductor" : "Add New Driver/Conductor"}
//           </h1>
//           <p className="text-gray-600 mt-1">
//             {isEdit
//               ? "Update driver/conductor information"
//               : "Fill in the details to add a new crew member"}
//           </p>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-8">
//           {/* Basic Information */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
//               <User className="h-5 w-5 mr-2" />
//               Basic Information
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Job Title <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   name="jobTitle"
//                   value={formData.jobTitle}
//                   onChange={handleInputChange}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 >
//                   <option value="Driver">Driver</option>
//                   <option value="Conductor">Conductor</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Full Name <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="fullName"
//                   value={formData.fullName}
//                   onChange={handleInputChange}
//                   maxLength={50}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.fullName ? "border-red-500" : "border-gray-300"
//                   }`}
//                   placeholder="Enter full name"
//                 />
//                 {errors.fullName && (
//                   <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Father's Name
//                 </label>
//                 <input
//                   type="text"
//                   name="fathersName"
//                   value={formData.fathersName}
//                   onChange={handleInputChange}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
//                   placeholder="Enter father's name"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Mother's Name
//                 </label>
//                 <input
//                   type="text"
//                   name="mothersName"
//                   value={formData.mothersName}
//                   onChange={handleInputChange}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
//                   placeholder="Enter mother's name"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Date of Birth <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="date"
//                   name="dateOfBirth"
//                   value={formData.dateOfBirth}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
//                     errors.dateOfBirth ? "border-red-500" : "border-gray-300"
//                   }`}
//                 />
//                 {errors.dateOfBirth && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors.dateOfBirth}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Years of Experience <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="number"
//                   name="yearsOfExperience"
//                   value={formData.yearsOfExperience}
//                   onChange={handleInputChange}
//                   min="0"
//                   max="50"
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.yearsOfExperience
//                       ? "border-red-500"
//                       : "border-gray-300"
//                   }`}
//                   placeholder="Enter years of experience"
//                 />
//                 {errors.yearsOfExperience && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors.yearsOfExperience}
//                   </p>
//                 )}
//               </div>

//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Permanent Address <span className="text-red-500">*</span>
//                 </label>
//                 <textarea
//                   name="permanentAddress"
//                   value={formData.permanentAddress}
//                   onChange={handleInputChange}
//                   rows={3}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.permanentAddress
//                       ? "border-red-500"
//                       : "border-gray-300"
//                   }`}
//                   placeholder="Enter complete address"
//                 />
//                 {errors.permanentAddress && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors.permanentAddress}
//                   </p>
//                 )}
//               </div>

//               <div className="md:col-span-2">
//                 <label className="flex items-center">
//                   <input
//                     type="checkbox"
//                     name="handicapped"
//                     checked={formData.handicapped}
//                     onChange={handleInputChange}
//                     className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
//                   />
//                   <span className="ml-2 text-sm text-gray-700">
//                     Handicapped
//                   </span>
//                 </label>
//               </div>
//             </div>
//           </div>

//           {/* Contact Information */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
//               <Phone className="h-5 w-5 mr-2" />
//               Contact Information
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Mobile Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="tel"
//                   name="mobile"
//                   value={formData.mobile}
//                   onChange={handleInputChange}
//                   maxLength={10}
//                   pattern="[6-9][0-9]{9}"
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.mobile ? "border-red-500" : "border-gray-300"
//                   }`}
//                   placeholder="Enter 10-digit mobile number"
//                 />
//                 {errors.mobile && (
//                   <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Alternate Mobile Number
//                 </label>
//                 <input
//                   type="tel"
//                   name="alternateMobile"
//                   value={formData.alternateMobile}
//                   onChange={handleInputChange}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
//                   placeholder="Enter alternate mobile number"
//                 />
//               </div>

//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Email Address <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="email"
//                   name="email"
//                   value={formData.email}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.email ? "border-red-500" : "border-gray-300"
//                   }`}
//                   placeholder="Enter email address"
//                 />
//                 {errors.email && (
//                   <p className="text-red-500 text-sm mt-1">{errors.email}</p>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Document Information */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
//               <FileText className="h-5 w-5 mr-2" />
//               Document Information
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Aadhar Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="aadharNumber"
//                   value={formData.aadharNumber}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.aadharNumber ? "border-red-500" : "border-gray-300"
//                   }`}
//                   placeholder="Enter 12-digit Aadhar number"
//                 />
//                 {errors.aadharNumber && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors.aadharNumber}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   PAN Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="panNumber"
//                   value={formData.panNumber}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors.panNumber ? "border-red-500" : "border-gray-300"
//                   }`}
//                   placeholder="Enter PAN number"
//                 />
//                 {errors.panNumber && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors.panNumber}
//                   </p>
//                 )}
//               </div>

//               <div className="md:col-span-2">
//                 <FileUploadField
//                   fieldName="aadharFront"
//                   label="Aadhar Card - Front"
//                   required={true}
//                 />
//               </div>

//               <div className="md:col-span-2">
//                 <FileUploadField
//                   fieldName="aadharBack"
//                   label="Aadhar Card - Back"
//                   required={true}
//                 />
//               </div>

//               <div className="md:col-span-2">
//                 <FileUploadField
//                   fieldName="panCard"
//                   label="PAN Card"
//                   required={true}
//                 />
//               </div>

//               <div className="md:col-span-2">
//                 <FileUploadField
//                   fieldName="drivingLicense"
//                   label="Driving License"
//                   required={true}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Bank Account Information */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
//               <CreditCard className="h-5 w-5 mr-2" />
//               Bank Account Information
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Account Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="bankAccount.accountNumber"
//                   value={formData.bankAccount.accountNumber}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors["bankAccount.accountNumber"]
//                       ? "border-red-500"
//                       : "border-gray-300"
//                   }`}
//                   placeholder="Enter account number"
//                 />
//                 {errors["bankAccount.accountNumber"] && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors["bankAccount.accountNumber"]}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   IFSC Code <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="bankAccount.ifscCode"
//                   value={formData.bankAccount.ifscCode}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors["bankAccount.ifscCode"]
//                       ? "border-red-500"
//                       : "border-gray-300"
//                   }`}
//                   placeholder="Enter IFSC code"
//                 />
//                 {errors["bankAccount.ifscCode"] && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors["bankAccount.ifscCode"]}
//                   </p>
//                 )}
//               </div>

//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Bank Name <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="bankAccount.bankName"
//                   value={formData.bankAccount.bankName}
//                   onChange={handleInputChange}
//                   className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
//                     errors["bankAccount.bankName"]
//                       ? "border-red-500"
//                       : "border-gray-300"
//                   }`}
//                   placeholder="Enter bank name"
//                 />
//                 {errors["bankAccount.bankName"] && (
//                   <p className="text-red-500 text-sm mt-1">
//                     {errors["bankAccount.bankName"]}
//                   </p>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Profile Image */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
//               <Camera className="h-5 w-5 mr-2" />
//               Profile Image
//             </h3>
//             <div className="max-w-md">
//               <FileUploadField
//                 fieldName="profileImage"
//                 label="Profile Photo"
//                 required={false}
//               />
//             </div>
//           </div>

//           {/* Submit Buttons */}
//           <div className="flex justify-end space-x-4">
//             <button
//               type="button"
//               onClick={() => navigate("/drivers")}
//               className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={isSubmitting}
//               className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
//             >
//               {isSubmitting ? (
//                 <>
//                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                   Saving...
//                 </>
//               ) : (
//                 <>
//                   <Save className="h-4 w-4 mr-2" />
//                   {isEdit ? "Update Driver" : "Add Driver"}
//                 </>
//               )}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default AddDriverForm;
