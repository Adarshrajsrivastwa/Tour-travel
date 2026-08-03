const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  userName: {
    type: String,
    required: [true, 'User name is required']
  },
  userMobile: {
    type: String,
    required: [true, 'User mobile is required']
  },
  userEmail: {
    type: String,
    required: [true, 'User email is required']
  },
  // Passenger details for ticket booking
  passengerName: {
    type: String,
    required: false,
    trim: true
  },
  age: {
    type: Number,
    required: false,
    min: [1, 'Age must be at least 1'],
    max: [120, 'Age cannot exceed 120']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    required: false
  },
  city: {
    type: String,
    required: false,
    trim: true
  },
  state: {
    type: String,
    required: false,
    trim: true
  },
  altContactNumber: {
    type: String,
    required: false,
    trim: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardSchedule',
    required: [true, 'Schedule ID is required']
  },
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: [true, 'Bus ID is required']
  },
  busName: {
    type: String,
    required: [true, 'Bus name is required']
  },
  busNumber: {
    type: String,
    required: [true, 'Bus number is required']
  },
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: [true, 'Route ID is required']
  },
  routeName: {
    type: String,
    required: [true, 'Route name is required']
  },
  source: {
    type: String,
    required: false,
    trim: true
  },
  destination: {
    type: String,
    required: [true, 'Destination is required']
  },
  seats: [{
    type: String,
    required: [true, 'Seat selection is required']
  }],
  fare: {
    type: Number,
    required: [true, 'Fare is required'],
    min: [0, 'Fare cannot be negative']
  },
  bookingTime: {
    type: Date,
    default: Date.now
  },
  travelDate: {
    type: Date,
    required: [true, 'Travel date is required']
  },
  departureTime: {
    type: String,
    required: [true, 'Departure time is required']
  },
  arrivalTime: {
    type: String,
    required: [true, 'Arrival time is required']
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  driverName: {
    type: String,
    default: null
  },
  conductorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  conductorName: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Active', 'Confirmed', 'Pending', 'Cancelled', 'Completed', 'No-Show'],
    default: 'Active'
  },
  cancellationReason: {
    type: String,
    default: null
  },
  cancellationDate: {
    type: Date,
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  specialRequests: {
    type: String,
    default: null
  },
  emergencyContact: {
    name: {
      type: String,
      default: null
    },
    mobile: {
      type: String,
      default: null
    }
  },
  gstNumber: {
    type: String,
    default: null,
    trim: true
  }
}, {
  timestamps: true
});

// Virtual for booking reference
bookingSchema.virtual('bookingReference').get(function() {
  return `BB${this._id.toString().slice(-8).toUpperCase()}`;
});

// Virtual for total seats
bookingSchema.virtual('totalSeats').get(function() {
  return this.seats.length;
});

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });

// Index for better query performance
bookingSchema.index({ userId: 1, travelDate: 1 });
bookingSchema.index({ scheduleId: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
