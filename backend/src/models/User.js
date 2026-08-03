const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid mobile number"],
      validate: {
        validator: function(v) {
          // Indian mobile number validation: 10 digits starting with 6-9
          const indianMobileRegex = /^(\+91|0)?[6-9]\d{9}$/;
          // International format validation
          const internationalRegex = /^\+?[1-9]\d{1,14}$/;
          return indianMobileRegex.test(v) || internationalRegex.test(v);
        },
        message: "Please enter a valid mobile number (10 digits for Indian numbers or international format)"
      }
    },
    panNumber: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Please enter a valid PAN number (e.g., ABCDE1234F)"],
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional field
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: "PAN number must be in format ABCDE1234F"
      }
    },
    aadharNumber: {
      type: String,
      default: null,
      trim: true,
      match: [/^\d{4}\s\d{4}\s\d{4}$/, "Please enter a valid Aadhar number (XXXX XXXX XXXX)"],
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional field
          // Remove spaces for validation
          const cleaned = v.replace(/\s/g, '');
          return /^\d{12}$/.test(cleaned);
        },
        message: "Aadhar number must be 12 digits (format: XXXX XXXX XXXX)"
      }
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: null,
    },
    
    dob: {
      type: Date,
      default: null,
    },
    
    address: {
      type: String,
      trim: true,
      default: null,
    },
    
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Important for security — hide password by default
    },
    userType: {
      type: String,
      enum: ["Normal", "Buyer", "Admin"],
      default: "Normal",
    },
    profileImage: {
      type: String,
      default: null, // URL or path to image
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    accountDetails: {
      email: String,
      preferences: {
        notifications: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
      },
      notificationSettings: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      permissions: {
        bookings: { type: Boolean, default: false },
      },
      isDriverOrConductor: { type: Boolean, default: false },
    },

    bookingHistory: [
      {
        id: { type: Number },
        date: { type: Date },
        route: { type: String },
        status: {
          type: String,
          enum: ["Completed", "Pending", "Cancelled"],
          default: "Pending",
        },
      },
    ],

    lastLogin: {
      type: Date,
    },

    // 🔐 Added for secure OTP verification (password reset / change)
    otp: {
      type: Number,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    otpVerifiedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// 🔒 Hash password before saving (only if modified)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 🔍 Compare entered password with stored hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 📦 Get user data for auth responses (login/register) - minimal fields only
userSchema.methods.getAuthResponse = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    mobile: this.mobile,
    userType: this.userType,
    isActive: this.isActive,
    accountDetails: this.accountDetails || null,
    panNumber: this.panNumber || null,
    aadharNumber: this.aadharNumber || null,
  };
};

// 🔐 Generate and save OTP for password reset
userSchema.methods.generateOTP = function () {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  // OTP valid for 10 minutes
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Set new OTP values (explicitly clearing old ones by overwriting)
  this.otp = otp;
  this.otpExpires = otpExpires;
  this.otpVerifiedAt = undefined; // Clear previous verification
  
  return otp;
};

// ✅ Verify OTP
// @param {string} enteredOTP - The OTP entered by user
// @param {boolean} clearOnSuccess - Whether to clear OTP after successful verification (default: false)
userSchema.methods.verifyOTP = async function (enteredOTP, clearOnSuccess = false) {
  const user = await this.constructor.findById(this._id).select("+otp +otpExpires +otpVerifiedAt");

  if (!user.otp || !user.otpExpires) {
    return { valid: false, message: "No OTP found. Please request a new one." };
  }

  // Check if OTP has already been verified (prevent reuse)
  if (user.otpVerifiedAt) {
    return { 
      valid: false, 
      message: "OTP has already been verified. Please request a new one." 
    };
  }

  if (user.otpExpires < new Date()) {
    // Clear expired OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpVerifiedAt = undefined;
    await user.save({ validateBeforeSave: false });
    return { valid: false, message: "OTP has expired. Please request a new one." };
  }

  if (user.otp !== parseInt(enteredOTP)) {
    return { 
      valid: false, 
      message: "Invalid OTP. Please try again." 
    };
  }

  // Mark OTP as verified
  user.otpVerifiedAt = new Date();
  console.log("✅ [VERIFY-OTP] Setting otpVerifiedAt:", { userId: user._id, otpVerifiedAt: user.otpVerifiedAt });
  
  // OTP is valid - clear it only if requested (typically on password reset)
  if (clearOnSuccess) {
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpVerifiedAt = undefined;
    await user.save({ validateBeforeSave: false });
    console.log("✅ [VERIFY-OTP] OTP cleared (clearOnSuccess=true)");
  } else {
    // Clear the OTP after verification to prevent reuse, but keep otpVerifiedAt for password reset
    user.otp = undefined;
    user.otpExpires = undefined;
    // Save the verification timestamp and clear OTP
    await user.save({ validateBeforeSave: false });
    console.log("✅ [VERIFY-OTP] OTP cleared after verification (security fix), otpVerifiedAt saved:", { userId: user._id, otpVerifiedAt: user.otpVerifiedAt });
  }

  return { valid: true, message: "OTP verified successfully." };
};

// 🕒 Check if OTP can be requested (rate limiting)
userSchema.methods.canRequestOTP = async function () {
  const user = await this.constructor.findById(this._id).select("+otpExpires");
  
  // If no OTP exists, allow request
  if (!user.otpExpires) {
    return { allowed: true };
  }

  // Check if previous OTP is still valid (not expired)
  if (user.otpExpires > new Date()) {
    const timeRemaining = Math.ceil((user.otpExpires - new Date()) / 1000 / 60);
    return { 
      allowed: false, 
      message: `Please wait ${timeRemaining} minute(s) before requesting a new OTP.` 
    };
  }

  // OTP expired, allow new request
  return { allowed: true };
};

// 🧹 Remove sensitive fields (password, otp) from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.otp;
  delete userObject.otpExpires;
  delete userObject.otpVerifiedAt;
  return userObject;
};

module.exports = mongoose.model("User", userSchema);
