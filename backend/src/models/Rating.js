const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
    },
    customerMobile: {
      type: String,
      required: [true, "Customer mobile is required"],
    },
    customerEmail: {
      type: String,
      required: [true, "Customer email is required"],
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OnboardSchedule",
      required: [true, "Schedule ID is required"],
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: [true, "Bus ID is required"],
    },
    busName: {
      type: String,
      required: [true, "Bus name is required"],
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: [true, "Route ID is required"],
    },
    routeName: {
      type: String,
      required: [true, "Route name is required"],
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    travelDate: {
      type: Date,
      required: [true, "Travel date is required"],
    },
    rating: {
      type: Number,
      required: [true, "Overall rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    serviceRating: {
      type: Number,
      required: [true, "Service rating is required"],
      min: [1, "Service rating must be at least 1"],
      max: [5, "Service rating cannot exceed 5"],
    },
    driverRating: {
      type: Number,
      required: [true, "Driver rating is required"],
      min: [1, "Driver rating must be at least 1"],
      max: [5, "Driver rating cannot exceed 5"],
    },
    busRating: {
      type: Number,
      required: [true, "Bus rating is required"],
      min: [1, "Bus rating must be at least 1"],
      max: [5, "Bus rating cannot exceed 5"],
    },
    punctualityRating: {
      type: Number,
      required: [true, "Punctuality rating is required"],
      min: [1, "Punctuality rating must be at least 1"],
      max: [5, "Punctuality rating cannot exceed 5"],
    },
    comments: {
      type: String,
      maxlength: [1000, "Comments cannot exceed 1000 characters"],
      default: null,
    },
    wouldRecommend: {
      type: Boolean,
      required: false,
      default: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Hidden"],
      default: "Pending",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    adminResponse: {
      type: String,
      maxlength: [500, "Admin response cannot exceed 500 characters"],
      default: null,
    },
    responseDate: {
      type: Date,
      default: null,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
      min: [0, "Helpful votes cannot be negative"],
    },
    reportCount: {
      type: Number,
      default: 0,
      min: [0, "Report count cannot be negative"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for average rating
ratingSchema.virtual("averageRating").get(function () {
  const ratings = [
    this.serviceRating,
    this.driverRating,
    this.busRating,
    this.punctualityRating,
  ];

  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
});

// Virtual for rating date
ratingSchema.virtual("date").get(function () {
  return this.createdAt.toISOString().split("T")[0];
});

// Ensure virtual fields are serialized
ratingSchema.set("toJSON", { virtuals: true });

// Index for better query performance
ratingSchema.index({ userId: 1 });
ratingSchema.index({ scheduleId: 1 });
ratingSchema.index({ busId: 1 });
ratingSchema.index({ status: 1 });
ratingSchema.index({ rating: 1 });
ratingSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Rating", ratingSchema);
