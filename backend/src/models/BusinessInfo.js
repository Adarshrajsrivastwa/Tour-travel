const mongoose = require("mongoose");

const businessInfoSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    supportEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
    },
    addressLine1: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one document exists
businessInfoSchema.statics.getBusinessInfo = async function () {
  let businessInfo = await this.findOne();
  if (!businessInfo) {
    businessInfo = await this.create({});
  }
  return businessInfo;
};

const BusinessInfo = mongoose.model("BusinessInfo", businessInfoSchema);

module.exports = BusinessInfo;

