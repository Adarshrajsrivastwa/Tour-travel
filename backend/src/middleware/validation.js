const { body, param, query, validationResult } = require("express-validator");
const logger = require("../utils/logger");

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.error("❌ BACKEND VALIDATION FAILED:");
    console.error(JSON.stringify(errors.array(), null, 2));
    logger.debug("Validation failed:", errors.array());
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  next();
};

// User validation rules
const validateUser = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),

  body("email").isEmail().withMessage("Please provide a valid email"),

  body("mobile")
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid mobile number"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("userType")
    .optional()
    .isIn(["Normal", "Buyer", "Admin"])
    .withMessage("Invalid user type"),

  handleValidationErrors,
];

// Driver validation rules
const validateDriver = [
  body("jobTitle")
    .isIn(["Driver", "Conductor"])
    .withMessage("Job title must be either Driver or Conductor"),

  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),

  body("fathersName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Father's name cannot exceed 100 characters"),

  body("mothersName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Mother's name cannot exceed 100 characters"),

  body("mobile")
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid mobile number"),

  body("alternateMobile")
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid alternate mobile number"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("dateOfBirth")
    .isISO8601()
    .withMessage("Please provide a valid date of birth"),

  body("permanentAddress")
    .trim()
    .notEmpty()
    .withMessage("Permanent address is required")
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters"),

  body("aadharNumber")
    .matches(/^\d{4}\s\d{4}\s\d{4}$/)
    .withMessage("Please provide a valid Aadhar number (XXXX XXXX XXXX)"),

  body("panNumber")
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage("Please provide a valid PAN number"),

  body("accountNumber")
    .trim()
    .notEmpty()
    .withMessage("Bank account number is required"),

  body("ifscCode")
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage("Please provide a valid IFSC code"),

  body("bankName").trim().notEmpty().withMessage("Bank name is required"),

  body("yearsOfExperience")
    .isInt({ min: 0 })
    .withMessage("Years of experience must be a non-negative integer"),

  body("handicapped")
    .optional()
    .isBoolean()
    .withMessage("Handicapped must be true or false"),

  // File validation - required for both create and edit
  body("aadharFront").custom((value, { req }) => {
    // Check if file is uploaded or if it's an existing file path (for edit mode)
    if (!req.files?.aadharFront && !value) {
      throw new Error("Aadhar front image is required");
    }
    return true;
  }),

  body("aadharBack").custom((value, { req }) => {
    if (!req.files?.aadharBack && !value) {
      throw new Error("Aadhar back image is required");
    }
    return true;
  }),

  body("panCard").custom((value, { req }) => {
    if (!req.files?.panCard && !value) {
      throw new Error("PAN card image is required");
    }
    return true;
  }),

  body("drivingLicense").custom((value, { req }) => {
    if (!req.files?.drivingLicense && !value) {
      throw new Error("Driving license image is required");
    }
    return true;
  }),

  handleValidationErrors,
];

// Bus validation rules
const validateBus = [
  body("busName")
    .trim()
    .notEmpty()
    .withMessage("Bus name is required")
    .isLength({ max: 100 })
    .withMessage("Bus name cannot exceed 100 characters"),

  body("busNumber")
    .matches(/^[A-Z]{2}-\d{2}-[A-Z]{2}-\d{4}$/)
    .withMessage("Please provide a valid bus number (e.g., MH-01-AB-1234)"),

  body("seatArchitecture")
    .isIn(["2+2", "2+1", "1+1", "3+2"])
    .withMessage("Invalid seat architecture"),

  body("seatCapacity")
    .isInt({ min: 1, max: 100 })
    .withMessage("Seat capacity must be between 1 and 100"),

  body("insuranceNumber")
    .trim()
    .notEmpty()
    .withMessage("Insurance number is required"),

  handleValidationErrors,
];

// Route validation rules
const validateRoute = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Route name is required")
    .isLength({ max: 200 })
    .withMessage("Route name cannot exceed 200 characters"),

  body("startPoint")
    .trim()
    .notEmpty()
    .withMessage("Start point is required")
    .isLength({ max: 100 })
    .withMessage("Start point cannot exceed 100 characters"),

  body("stops")
    .isArray({ min: 2 })
    .withMessage("Route must have at least 2 stops"),

  body("totalDistance")
    .isFloat({ min: 0 })
    .withMessage("Total distance must be a positive number"),

  body("estimatedTravelTime")
    .isInt({ min: 0 })
    .withMessage("Estimated travel time must be a non-negative integer"),

  handleValidationErrors,
];

// Ticket booking validation rules (for form-based ticket booking)
const validateTicketBooking = [
  body("passengerName")
    .trim()
    .notEmpty()
    .withMessage("Passenger name is required")
    .isLength({ max: 100 })
    .withMessage("Passenger name cannot exceed 100 characters"),

  body("age")
    .isInt({ min: 1, max: 120 })
    .withMessage("Age must be between 1 and 120"),

  body("contactNumber")
    .trim()
    .notEmpty()
    .withMessage("Contact number is required")
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid contact number"),

  body("altContactNumber")
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid alternate contact number"),

  body("gender")
    .isIn(["Male", "Female", "Other", "Prefer not to say"])
    .withMessage(
      "Gender must be one of: Male, Female, Other, Prefer not to say"
    ),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters"),

  body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .isLength({ max: 100 })
    .withMessage("State cannot exceed 100 characters"),

  body("scheduleId").isMongoId().withMessage("Valid schedule ID is required"),

  body("source")
    .trim()
    .notEmpty()
    .withMessage("Source is required")
    .isLength({ max: 100 })
    .withMessage("Source cannot exceed 100 characters"),

  body("destination")
    .trim()
    .notEmpty()
    .withMessage("Destination is required")
    .isLength({ max: 100 })
    .withMessage("Destination cannot exceed 100 characters"),

  body("seats")
    .isArray({ min: 1 })
    .withMessage("At least one seat must be selected")
    .custom((seats) => {
      if (!Array.isArray(seats) || seats.length === 0) {
        throw new Error("Seats must be an array with at least one seat");
      }
      // Validate each seat is a string
      seats.forEach((seat, index) => {
        if (typeof seat !== "string" || seat.trim() === "") {
          throw new Error(`Seat at index ${index} must be a non-empty string`);
        }
      });
      return true;
    }),

  body("travelDate").isISO8601().withMessage("Valid travel date is required"),

  handleValidationErrors,
];

// Rating validation rules
const validateRating = [
  body("scheduleId").isMongoId().withMessage("Valid schedule ID is required"),

  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("comments")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comments cannot exceed 1000 characters"),

  body("serviceRating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Service rating must be between 1 and 5"),

  body("driverRating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Driver rating must be between 1 and 5"),

  body("busRating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Bus rating must be between 1 and 5"),

  body("punctualityRating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Punctuality rating must be between 1 and 5"),

  body("wouldRecommend")
    .optional()
    .isBoolean()
    .withMessage("Recommendation must be true or false"),

  handleValidationErrors,
];

// ID parameter validation
const validateObjectId = [
  param("id").isMongoId().withMessage("Invalid ID format"),

  handleValidationErrors,
];

// Pagination validation
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be between 1 and 1000"),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateDriver,
  validateBus,
  validateRoute,
  validateTicketBooking,
  validateRating,
  validateObjectId,
  validatePagination,
};
