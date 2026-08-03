const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Stop name is required'],
    trim: true,
    maxlength: [100, 'Stop name cannot exceed 100 characters']
  },
  distanceFromPrev: {
    type: Number,
    required: [true, 'Distance from previous stop is required'],
    min: [0, 'Distance cannot be negative']
  },
  durationFromPrev: {
    type: Number,
    required: [true, 'Duration from previous stop is required'],
    min: [0, 'Duration cannot be negative']
  },
  coordinates: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  }
});

const routeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true,
    maxlength: [200, 'Route name cannot exceed 200 characters']
  },
  startPoint: {
    type: String,
    required: [true, 'Start point is required'],
    trim: true,
    maxlength: [100, 'Start point cannot exceed 100 characters']
  },
  stops: [stopSchema],
  totalDistance: {
    type: Number,
    required: [true, 'Total distance is required'],
    min: [0, 'Total distance cannot be negative']
  },
  estimatedTravelTime: {
    type: Number,
    required: [true, 'Estimated travel time is required'],
    min: [0, 'Estimated travel time cannot be negative']
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  assignedTrips: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardSchedule'
  }]
}, {
  timestamps: true
});

// Virtual for end point
routeSchema.virtual('endPoint').get(function() {
  return this.stops && Array.isArray(this.stops) && this.stops.length > 0 ? this.stops[this.stops.length - 1].name : null;
});

// Virtual for total stops
routeSchema.virtual('totalStops').get(function() {
  return this.stops && Array.isArray(this.stops) ? this.stops.length : 0;
});

// Ensure virtual fields are serialized
routeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Route', routeSchema);
