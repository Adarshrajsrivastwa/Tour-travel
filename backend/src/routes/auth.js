const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const BusinessInfo = require("../models/BusinessInfo");
const { generateToken } = require("../utils/jwt");
const { successResponse, errorResponse } = require("../utils/response");
const { authenticateToken } = require("../middleware/auth");
const { validateUser } = require("../middleware/validation");
const { sendOTPEmail } = require("../utils/email");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - mobile
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               mobile:
 *                 type: string
 *                 example: "+919876543210"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *               userType:
 *                 type: string
 *                 enum: [Normal, Buyer, Admin]
 *                 default: Normal
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         token:
 *                           type: string
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/register", validateUser, async (req, res) => {
  try {
    const { name, email, mobile, password, userType = "Normal" } = req.body;

    // Check if email already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return errorResponse(
        res,
        400,
        "Email already exists"
      );
    }

    // Check if mobile already exists
    const existingUserByMobile = await User.findOne({ mobile });
    if (existingUserByMobile) {
      return errorResponse(
        res,
        400,
        "Mobile number already exists"
      );
    }

    // Create new user
    const user = new User({
      name,
      email,
      mobile,
      password,
      userType,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    successResponse(res, 201, "User registered successfully", {
      user: user.getAuthResponse(),
      token,
    });
  } catch (error) {
    logger.error("Registration error:", error);
    errorResponse(res, 500, "Registration failed", error.message);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         token:
 *                           type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, "Email and password are required");
    }

    // Find user by email
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 401, "Account is deactivated");
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    successResponse(res, 200, "Login successful", {
      user: user.getAuthResponse(),
      token,
    });
  } catch (error) {
    logger.error("Login error:", error);
    errorResponse(res, 500, "Login failed", error.message);
  }
});

/* 
 * @swagger
 * /api/auth/admin-login:
 *   post:
 *     summary: Secure admin login using email and password
 *     description: Authenticates an admin user from the database using hashed password validation and generates a JWT token on successful login.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 example: "Admin@12345"
 *     responses:
 *       200:
 *         description: Admin login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         token:
 *                           type: string
 *                           description: JWT authentication token
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid email or password / Admin not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.post("/admin-login", async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email =
      typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : "";

    // 1️⃣ Validate input
    if (!email || !password) {
      return errorResponse(res, 400, "Email and password are required");
    }

    // 2️⃣ Find admin user in the database
    const adminUser = await User.findOne({ email, userType: "Admin" }).select(
      "+password"
    );

    if (!adminUser) {
      return errorResponse(res, 401, "Admin account not found");
    }

    // 3️⃣ Compare password securely
    const isPasswordMatch = await bcrypt.compare(password, adminUser.password);

    if (!isPasswordMatch) {
      return errorResponse(res, 401, "Invalid email or password");
    }

    // 4️⃣ Check if user is linked to a Driver/Conductor record
    // This ensures we verify both user role (Admin) and driver model type
    const Driver = require("../models/Driver");
    const driverRecord = await Driver.findOne({
      $or: [{ email: adminUser.email }, { mobile: adminUser.mobile }],
    });

    // If user is linked to a driver/conductor, ensure accountDetails flag is set
    if (driverRecord) {
      if (!adminUser.accountDetails) {
        adminUser.accountDetails = {};
      }
      // Set the flag if not already set
      if (!adminUser.accountDetails.isDriverOrConductor) {
        adminUser.accountDetails.isDriverOrConductor = true;
        adminUser.accountDetails.permissions = { bookings: true };
        await adminUser.save();
      }
    }

    // 5️⃣ Generate secure JWT token
    const token = generateToken(adminUser._id);

    // 6️⃣ Send response with minimal user data (includes accountDetails)
    successResponse(res, 200, "Admin login successful", {
      user: adminUser.getAuthResponse(),
      token,
    });
  } catch (error) {
    logger.error("Admin login error:", error);
    errorResponse(res, 500, "Internal server error");
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Get the authenticated user's profile information. Returns 404 if user profile does not exist.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             email:
 *                               type: string
 *                             mobile:
 *                               type: string
 *                             userType:
 *                               type: string
 *                               enum: [Normal, Buyer, Admin]
 *                             isActive:
 *                               type: boolean
 *                             registrationDate:
 *                               type: string
 *                               format: date-time
 *                             gender:
 *                               type: string
 *                             dob:
 *                               type: string
 *                               format: date
 *                             address:
 *                               type: string
 *                             profileImage:
 *                               type: string
 *                               description: URL of user's profile picture
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return errorResponse(res, 404, "User profile not found");
    }

    if (!user.isActive) {
      return errorResponse(res, 401, "Account is deactivated");
    }

    // If Admin, check driver record & add flags
    if (user.userType === "Admin") {
      const Driver = require("../models/Driver");
      const driverRecord = await Driver.findOne({
        $or: [{ email: user.email }, { mobile: user.mobile }],
      });

      if (driverRecord) {
        if (!user.accountDetails) {
          user.accountDetails = {};
        }
        if (!user.accountDetails.isDriverOrConductor) {
          user.accountDetails.isDriverOrConductor = true;
          user.accountDetails.permissions = { bookings: true };
          await user.save();
        }
      }
    }

    // Return full user profile (allowed fields only)
    const minimalUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      userType: user.userType,
      isActive: user.isActive,
      registrationDate: user.registrationDate,

      // Newly added fields:
      gender: user.gender || null,
      dob: user.dob || null,
      address: user.address || null,
      profileImage: user.profileImage || null,
      panNumber: user.panNumber || null,
      aadharNumber: user.aadharNumber || null,

      accountDetails: user.accountDetails || null,
    };

    successResponse(res, 200, "Profile retrieved successfully", {
      user: minimalUser,
    });
  } catch (error) {
    logger.error("Get profile error:", error);
    errorResponse(res, 500, "Failed to retrieve profile", error.message);
  }
});


/**
 * @swagger
 * /api/auth/update-profile:
 *   patch:
 *     summary: Update user profile (all fields optional)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               gender:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               email:
 *                 type: string
 *               mobile:
 *                 type: string
 *               address:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 description: URL of profile photo
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 */

router.patch("/update-profile", authenticateToken, async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "gender",
      "dob",
      "email",
      "mobile",
      "address",
      "profileImage",
      "panNumber",
      "aadharNumber",
    ];

    const updates = {};

    // Pick only allowed properties
    for (const key of Object.keys(req.body)) {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    }

    // Email uniqueness check
    if (updates.email) {
      const exists = await User.findOne({
        email: updates.email,
        _id: { $ne: req.user._id }
      });
      if (exists) return errorResponse(res, 400, "Email already in use");
    }

    // Mobile uniqueness check
    if (updates.mobile) {
      // Validate mobile number format
      const mobileRegex = /^(\+91|0)?[6-9]\d{9}$/;
      const internationalRegex = /^\+?[1-9]\d{1,14}$/;
      if (!mobileRegex.test(updates.mobile) && !internationalRegex.test(updates.mobile)) {
        return errorResponse(res, 400, "Please enter a valid mobile number");
      }
      
      const exists = await User.findOne({
        mobile: updates.mobile,
        _id: { $ne: req.user._id }
      });
      if (exists) return errorResponse(res, 400, "Mobile number already in use");
    }

    // PAN number validation
    if (updates.panNumber) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(updates.panNumber.toUpperCase())) {
        return errorResponse(res, 400, "Please enter a valid PAN number (format: ABCDE1234F)");
      }
      updates.panNumber = updates.panNumber.toUpperCase().trim();
    }

    // Aadhar number validation
    if (updates.aadharNumber) {
      // Remove spaces for validation
      const cleaned = updates.aadharNumber.replace(/\s/g, '');
      if (!/^\d{12}$/.test(cleaned)) {
        return errorResponse(res, 400, "Please enter a valid Aadhar number (12 digits)");
      }
      // Format as XXXX XXXX XXXX
      updates.aadharNumber = cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    }

    // Update profile
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return successResponse(res, 200, "Profile updated successfully", {
      user: user.toJSON(),
    });

  } catch (error) {
    logger.error("Update profile error:", error);
    return errorResponse(res, 500, "Failed to update profile", error.message);
  }
});


/* 
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "oldpassword123"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid current password or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return errorResponse(
        res,
        400,
        "Current password and new password are required"
      );
    }

    if (newPassword.length < 6) {
      return errorResponse(
        res,
        400,
        "New password must be at least 6 characters long"
      );
    }

    // Get user with password
    const user = await User.findById(userId).select("+password");

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return errorResponse(res, 400, "Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    successResponse(res, 200, "Password changed successfully");
  } catch (error) {
    logger.error("Change password error:", error);
    errorResponse(res, 500, "Failed to change password", error.message);
  }
});

/* 
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/logout", authenticateToken, (req, res) => {
  successResponse(res, 200, "Logout successful");
});

/** 
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     description: Sends an OTP to the user's email for password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         otp:
 *                           type: string
 *                           description: The 6-digit OTP code (for development/testing)
 *                           example: "123456"
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           description: When the OTP expires
 *                         validUntil:
 *                           type: string
 *                           format: date-time
 *                           description: ISO timestamp of OTP expiry
 *       400:
 *         description: Invalid email or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found (generic message for security)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    logger.debug("Forgot password request received:", { email });

    // Validate email
    if (!email) {
      logger.debug("Forgot password: Email validation failed - Email is required");
      return errorResponse(res, 400, "Email is required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.debug("Forgot password: Email validation failed - Invalid email format", { email });
      return errorResponse(res, 400, "Please provide a valid email address");
    }

    logger.debug("Forgot password: Searching for user with email:", email);
    
    // Find user by email - explicitly select OTP fields to ensure old OTP is replaced
    const user = await User.findOne({ email }).select("+otp +otpExpires +otpVerifiedAt");

    // Check if user exists
    if (!user) {
      logger.debug("Forgot password: User not found for email:", email);
      return errorResponse(res, 404, "No account found with this email address");
    }

    logger.debug("Forgot password: User found:", { userId: user._id, isActive: user.isActive });

    // Check if user is active
    if (!user.isActive) {
      logger.debug("Forgot password: Account is deactivated:", { userId: user._id, email });
      return errorResponse(res, 400, "Your account is deactivated. Please contact support to reactivate your account.");
    }

    // Generate OTP - use findOneAndUpdate to atomically replace old OTP
    logger.debug("Forgot password: Generating OTP...");
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Atomically update OTP fields, replacing any existing OTP
    const updatedUser = await User.findOneAndUpdate(
      { email: email },
      { 
        $set: { 
          otp: otp, 
          otpExpires: otpExpires 
        },
        $unset: { 
          otpVerifiedAt: "" 
        }
      },
      { 
        new: true,
        runValidators: false 
      }
    ).select("+otp +otpExpires");
    
    if (!updatedUser) {
      logger.error("Forgot password: User not found during update");
      return errorResponse(res, 404, "User not found");
    }
    
    logger.debug("Forgot password: OTP generated and saved:", { 
      userId: updatedUser._id, 
      expiresAt: otpExpires
    });

    // Send OTP via email
    logger.debug("Forgot password: Sending OTP email...");
    try {
      await sendOTPEmail(updatedUser.email, otp, updatedUser.name);
      logger.debug("Forgot password: OTP email sent successfully:", { 
        email: updatedUser.email
      });
    } catch (emailError) {
      logger.error("Forgot password: Failed to send OTP email:", emailError);
      // Log OTP for development/debugging only
      logger.debug(`Forgot password [DEV] OTP for ${email}: ${otp} (Valid until: ${new Date(otpExpires).toLocaleString()})`);
      // Don't fail the request, just log the error
    }

    // Return success message with OTP (for development/testing)
    logger.debug("Forgot password: Request completed successfully");
    successResponse(res, 200, "Password reset code sent to your email", {
      otp: otp.toString(),
      expiresAt: otpExpires,
      validUntil: new Date(otpExpires).toISOString()
    });
  } catch (error) {
    logger.error("Forgot password: Unexpected error:", error);
    errorResponse(res, 500, "Unable to process your request at this time. Please try again later.");
  }
});

/** 
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP for password reset
 *     description: Verifies the OTP sent to user's email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         verified:
 *                           type: boolean
 *                         message:
 *                           type: string
 *       400:
 *         description: Invalid OTP or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return errorResponse(res, 400, "Email and OTP are required");
    }

    if (!/^\d{6}$/.test(otp)) {
      return errorResponse(res, 400, "OTP must be a 6-digit number");
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 404, "User not found");
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 400, "Account is deactivated");
    }

    // Verify OTP and clear it to prevent reuse
    // The otpVerifiedAt timestamp will be used for password reset verification
    logger.debug("Verify OTP: Verifying OTP for user:", { userId: user._id, email: user.email });
    const verification = await user.verifyOTP(otp, false); // OTP will be cleared after verification in verifyOTP method

    if (!verification.valid) {
      logger.debug("Verify OTP: OTP verification failed:", verification.message);
      return errorResponse(res, 400, verification.message);
    }

    // Verify otpVerifiedAt was saved
    const updatedUser = await User.findById(user._id).select("+otpVerifiedAt");
    logger.debug("Verify OTP: OTP verified successfully:", { 
      userId: user._id, 
      otpVerifiedAt: updatedUser.otpVerifiedAt 
    });

    successResponse(res, 200, verification.message, {
      verified: true,
      message: "OTP verified. You can now proceed to reset your password.",
    });
  } catch (error) {
    logger.error("Verify OTP error:", error);
    errorResponse(res, 500, "Failed to verify OTP. Please try again.");
  }
});

/** 
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP for password reset
 *     description: Generates and sends a new OTP to the user's email for password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *     responses:
 *       200:
 *         description: New OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         otp:
 *                           type: string
 *                           description: The 6-digit OTP code (for development/testing)
 *                           example: "123456"
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           description: When the OTP expires
 *                         validUntil:
 *                           type: string
 *                           format: date-time
 *                           description: ISO timestamp of OTP expiry
 *       400:
 *         description: Invalid email or account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    logger.debug("Resend OTP: Request received:", { email });

    // Validate email
    if (!email) {
      logger.debug("Resend OTP: Email validation failed - Email is required");
      return errorResponse(res, 400, "Email is required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.debug("Resend OTP: Email validation failed - Invalid email format", { email });
      return errorResponse(res, 400, "Please provide a valid email address");
    }

    logger.debug("Resend OTP: Searching for user with email:", email);
    
    // Find user by email - explicitly select OTP fields to ensure old OTP is replaced
    const user = await User.findOne({ email }).select("+otp +otpExpires +otpVerifiedAt");

    // Check if user exists
    if (!user) {
      logger.debug("Resend OTP: User not found for email:", email);
      return errorResponse(res, 404, "No account found with this email address");
    }

    logger.debug("Resend OTP: User found:", { userId: user._id, isActive: user.isActive });

    // Check if user is active
    if (!user.isActive) {
      logger.debug("Resend OTP: Account is deactivated:", { userId: user._id, email });
      return errorResponse(res, 400, "Your account is deactivated. Please contact support to reactivate your account.");
    }

    // Generate new OTP - use findOneAndUpdate to atomically replace old OTP
    logger.debug("Resend OTP: Generating new OTP...");
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Atomically update OTP fields, replacing any existing OTP
    const updatedUser = await User.findOneAndUpdate(
      { email: email },
      { 
        $set: { 
          otp: otp, 
          otpExpires: otpExpires 
        },
        $unset: { 
          otpVerifiedAt: "" 
        }
      },
      { 
        new: true,
        runValidators: false 
      }
    ).select("+otp +otpExpires");
    
    if (!updatedUser) {
      logger.error("Resend OTP: User not found during update");
      return errorResponse(res, 404, "User not found");
    }
    
    logger.debug("Resend OTP: New OTP generated and saved:", { 
      userId: updatedUser._id, 
      expiresAt: otpExpires
    });

    // Send OTP via email
    logger.debug("Resend OTP: Sending OTP email...");
    try {
      await sendOTPEmail(updatedUser.email, otp, updatedUser.name);
      logger.debug("Resend OTP: OTP email sent successfully:", { 
        email: updatedUser.email
      });
    } catch (emailError) {
      logger.error("Resend OTP: Failed to send OTP email:", emailError);
      // Log OTP for development/debugging only
      logger.debug(`Resend OTP [DEV] OTP for ${email}: ${otp} (Valid until: ${new Date(otpExpires).toLocaleString()})`);
      // Don't fail the request, just log the error
    }

    // Return success message with OTP (for development/testing)
    logger.debug("Resend OTP: Request completed successfully");
    successResponse(res, 200, "New password reset code sent to your email", {
      otp: otp.toString(),
      expiresAt: otpExpires,
      validUntil: new Date(otpExpires).toISOString()
    });
  } catch (error) {
    logger.error("Resend OTP: Unexpected error:", error);
    errorResponse(res, 500, "Unable to process your request at this time. Please try again later.");
  }
});

/** 
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password after OTP verification
 *     description: Resets user password. OTP must be verified first using /verify-otp endpoint
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid OTP, weak password, or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    logger.debug("Reset password: Request received:", { email });

    // Validate input
    if (!email || !newPassword) {
      logger.debug("Reset password: Validation failed - Missing email or password");
      return errorResponse(res, 400, "Email and new password are required");
    }

    if (newPassword.length < 6) {
      logger.debug("Reset password: Validation failed - Password too short");
      return errorResponse(res, 400, "Password must be at least 6 characters long");
    }

    // Find user with OTP verification info
    const user = await User.findOne({ email }).select("+password +otpVerifiedAt");
    if (!user) {
      logger.debug("Reset password: User not found:", email);
      return errorResponse(res, 404, "User not found");
    }

    logger.debug("Reset password: User found:", { 
      userId: user._id, 
      hasOtpVerified: !!user.otpVerifiedAt 
    });

    // Check if user is active
    if (!user.isActive) {
      logger.debug("Reset password: Account is deactivated:", { userId: user._id });
      return errorResponse(res, 400, "Account is deactivated");
    }

    // Check if OTP was verified (within last 15 minutes)
    if (!user.otpVerifiedAt) {
      logger.debug("Reset password: OTP not verified - user needs to verify OTP first");
      return errorResponse(res, 400, "Please verify your OTP code before resetting your password");
    }

    const verificationAge = Date.now() - new Date(user.otpVerifiedAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    if (verificationAge > fifteenMinutes) {
      logger.debug("Reset password: OTP verification expired", { 
        userId: user._id, 
        ageMinutes: Math.floor(verificationAge / 60000)
      });
      // Clear expired verification
      user.otpVerifiedAt = undefined;
      await user.save({ validateBeforeSave: false });
      return errorResponse(res, 400, "OTP verification expired. Please verify OTP again.");
    }

    logger.debug("Reset password: OTP verification valid", { 
      userId: user._id,
      ageMinutes: Math.floor(verificationAge / 60000)
    });

    // Check if new password is same as current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      logger.debug("Reset password: New password same as current", { userId: user._id });
      return errorResponse(res, 400, "New password must be different from current password");
    }

    // Reset password
    logger.debug("Reset password: Resetting password...");
    user.password = newPassword;
    // Clear OTP and verification data after successful password reset
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpVerifiedAt = undefined;
    await user.save();

    logger.debug("Reset password: Password reset successfully", { userId: user._id });
    successResponse(res, 200, "Password reset successfully. Please login with your new password.");
  } catch (error) {
    logger.error("Reset password: Unexpected error:", error);
    errorResponse(res, 500, "Failed to reset password. Please try again.");
  }
});

/**
 * @swagger
 * /api/auth/contact-info:
 *   get:
 *     summary: Get business contact information
 *     description: Get business contact information including support email, contact number, WhatsApp number, business name, website, and address. Requires authentication.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contact information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         businessName:
 *                           type: string
 *                           example: "GR Tour & Travel"
 *                         supportEmail:
 *                           type: string
 *                           example: "support@example.com"
 *                         contactNumber:
 *                           type: string
 *                           example: "+919876543210"
 *                         whatsappNumber:
 *                           type: string
 *                           example: "+919876543210"
 *                         website:
 *                           type: string
 *                           example: "https://www.example.com"
 *                         address:
 *                           type: object
 *                           properties:
 *                             addressLine1:
 *                               type: string
 *                               example: "123 Main Street"
 *                             city:
 *                               type: string
 *                               example: "Mumbai"
 *                             state:
 *                               type: string
 *                               example: "Maharashtra"
 *                             pincode:
 *                               type: string
 *                               example: "400001"
 *                             country:
 *                               type: string
 *                               example: "India"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/contact-info", authenticateToken, async (req, res) => {
  try {
    const businessInfo = await BusinessInfo.getBusinessInfo();

    // Return business contact information
    const contactInfo = {
      businessName: businessInfo.businessName || null,
      supportEmail: businessInfo.supportEmail || null,
      contactNumber: businessInfo.contactNumber || null,
      whatsappNumber: businessInfo.whatsappNumber || null,
      website: businessInfo.website || null,
      address: {
        addressLine1: businessInfo.addressLine1 || null,
        city: businessInfo.city || null,
        state: businessInfo.state || null,
        pincode: businessInfo.pincode || null,
        country: businessInfo.country || null,
      },
    };

    successResponse(
      res,
      200,
      "Contact information retrieved successfully",
      contactInfo
    );
  } catch (error) {
    logger.error("Get contact info error:", error);
    errorResponse(res, 500, "Failed to retrieve contact information", error.message);
  }
});


module.exports = router;