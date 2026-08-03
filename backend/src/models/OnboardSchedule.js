const mongoose = require('mongoose');

const assignedTeamSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: [true, 'Team member ID is required']
  },
  name: {
    type: String,
    required: [true, 'Team member name is required']
  },
  role: {
    type: String,
    enum: ['Driver', 'Conductor'],
    required: [true, 'Role is required']
  }
});

const pricingSchema = new mongoose.Schema({
  baseAmount: {
    type: Number,
    required: [true, 'Base amount is required'],
    min: [0, 'Base amount cannot be negative']
  },
  perKmRate: {
    type: Number,
    required: [true, 'Per km rate is required'],
    min: [0, 'Per km rate cannot be negative']
  },
  totalFare: {
    type: Number,
    required: [true, 'Total fare is required'],
    min: [0, 'Total fare cannot be negative']
  }
});

const onboardScheduleSchema = new mongoose.Schema({
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: [true, 'Bus ID is required']
  },
  busName: {
    type: String,
    required: [true, 'Bus name is required']
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
  assignedTeam: [assignedTeamSchema],
  date: {
    type: Date,
    required: [true, 'Travel date is required']
  },
  time: {
    type: String,
    required: [true, 'Departure time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  pricing: pricingSchema,
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Delayed'],
    default: 'Scheduled'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  actualDepartureTime: {
    type: String,
    default: null
  },
  actualArrivalTime: {
    type: String,
    default: null
  },
  delayReason: {
    type: String,
    default: null
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  occupancyRate: {
    type: Number,
    default: 0,
    min: [0, 'Occupancy rate cannot be negative'],
    max: [100, 'Occupancy rate cannot exceed 100%']
  },
  notes: {
    type: String,
    default: null
  },
  weatherConditions: {
    type: String,
    enum: ['Clear', 'Rainy', 'Foggy', 'Stormy', 'Snowy'],
    default: 'Clear'
  },
  roadConditions: {
    type: String,
    enum: ['Good', 'Fair', 'Poor', 'Closed'],
    default: 'Good'
  }
}, {
  timestamps: true
});

// Virtual for estimated arrival time
onboardScheduleSchema.virtual('estimatedArrivalTime').get(function() {
  if (!this.time) return null;
  
  const [hours, minutes] = this.time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const route = this.constructor.model('Route').findById(this.routeId);
  
  if (route && route.estimatedTravelTime) {
    const arrivalMinutes = totalMinutes + route.estimatedTravelTime;
    const arrivalHours = Math.floor(arrivalMinutes / 60) % 24;
    const arrivalMins = arrivalMinutes % 60;
    
    return `${arrivalHours.toString().padStart(2, '0')}:${arrivalMins.toString().padStart(2, '0')}`;
  }
  
  return null;
});

// Virtual for available seats
onboardScheduleSchema.virtual('availableSeats').get(function() {
  // This would be calculated based on bus capacity and existing bookings
  return 0; // Placeholder - would need to query bookings
});

// Ensure virtual fields are serialized
onboardScheduleSchema.set('toJSON', { virtuals: true });

// Index for better query performance
onboardScheduleSchema.index({ date: 1, time: 1 });
onboardScheduleSchema.index({ busId: 1, date: 1 });
onboardScheduleSchema.index({ routeId: 1, date: 1 });
onboardScheduleSchema.index({ status: 1 });

module.exports = mongoose.model('OnboardSchedule', onboardScheduleSchema);
