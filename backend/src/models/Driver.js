const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    jobTitle: {
      type: String,
      required: [true, "Job title is required"],
      enum: ["Driver", "Conductor"],
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    fathersName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [100, "Father's name cannot exceed 100 characters"],
    },
    mothersName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [100, "Mother's name cannot exceed 100 characters"],
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid mobile number"],
    },
    alternateMobile: {
      type: String,
      match: [
        /^\+?[1-9]\d{1,14}$/,
        "Please enter a valid alternate mobile number",
      ],
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
    profileImage: {
      type: String,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    permanentAddress: {
      type: String,
      required: [true, "Permanent address is required"],
      maxlength: [500, "Address cannot exceed 500 characters"],
    },
    aadharFront: {
      type: String,
      default: null,
    },
    aadharBack: {
      type: String,
      default: null,
    },
    aadharNumber: {
      type: String,
      required: [true, "Aadhar number is required"],
      match: [
        /^\d{4}\s\d{4}\s\d{4}$/,
        "Please enter a valid Aadhar number (XXXX XXXX XXXX)",
      ],
    },
    panCard: {
      type: String,
      default: null,
    },
    panNumber: {
      type: String,
      required: [true, "PAN number is required"],
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Please enter a valid PAN number"],
    },
    bankAccount: {
      accountNumber: {
        type: String,
        required: [true, "Bank account number is required"],
      },
      ifscCode: {
        type: String,
        required: [true, "IFSC code is required"],
        match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Please enter a valid IFSC code"],
      },
      bankName: {
        type: String,
        required: [true, "Bank name is required"],
      },
    },
    drivingLicense: {
      type: String,
      default: null,
    },
    yearsOfExperience: {
      type: Number,
      required: [true, "Years of experience is required"],
      min: [0, "Experience cannot be negative"],
    },
    handicapped: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedTrips: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OnboardSchedule",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual for age calculation
driverSchema.virtual("age").get(function () {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
});

// Ensure virtual fields are serialized
driverSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Driver", driverSchema);
