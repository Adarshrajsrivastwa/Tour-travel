const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required'],
    unique: true
  },
  dailyBookings: {
    type: Number,
    default: 0,
    min: [0, 'Daily bookings cannot be negative']
  },
  dailyRevenue: {
    type: Number,
    default: 0,
    min: [0, 'Daily revenue cannot be negative']
  },
  totalUsers: {
    type: Number,
    default: 0,
    min: [0, 'Total users cannot be negative']
  },
  activeBuses: {
    type: Number,
    default: 0,
    min: [0, 'Active buses cannot be negative']
  },
  completedTrips: {
    type: Number,
    default: 0,
    min: [0, 'Completed trips cannot be negative']
  },
  cancelledTrips: {
    type: Number,
    default: 0,
    min: [0, 'Cancelled trips cannot be negative']
  },
  averageOccupancy: {
    type: Number,
    default: 0,
    min: [0, 'Average occupancy cannot be negative'],
    max: [100, 'Average occupancy cannot exceed 100%']
  },
  busUtilization: [{
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true
    },
    busName: {
      type: String,
      required: true
    },
    occupancy: {
      type: Number,
      required: true,
      min: [0, 'Occupancy cannot be negative'],
      max: [100, 'Occupancy cannot exceed 100%']
    },
    revenue: {
      type: Number,
      default: 0,
      min: [0, 'Revenue cannot be negative']
    },
    trips: {
      type: Number,
      default: 0,
      min: [0, 'Trips cannot be negative']
    }
  }],
  driverPerformance: [{
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true
    },
    driverName: {
      type: String,
      required: true
    },
    onTimePercentage: {
      type: Number,
      required: true,
      min: [0, 'On-time percentage cannot be negative'],
      max: [100, 'On-time percentage cannot exceed 100%']
    },
    trips: {
      type: Number,
      default: 0,
      min: [0, 'Trips cannot be negative']
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    }
  }],
  routePerformance: [{
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true
    },
    routeName: {
      type: String,
      required: true
    },
    bookings: {
      type: Number,
      default: 0,
      min: [0, 'Bookings cannot be negative']
    },
    revenue: {
      type: Number,
      default: 0,
      min: [0, 'Revenue cannot be negative']
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Average rating cannot be negative'],
      max: [5, 'Average rating cannot exceed 5']
    }
  }],
  customerSatisfaction: {
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Average rating cannot be negative'],
      max: [5, 'Average rating cannot exceed 5']
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: [0, 'Total ratings cannot be negative']
    },
    positiveRatings: {
      type: Number,
      default: 0,
      min: [0, 'Positive ratings cannot be negative']
    },
    negativeRatings: {
      type: Number,
      default: 0,
      min: [0, 'Negative ratings cannot be negative']
    }
  },
  financialMetrics: {
    totalRevenue: {
      type: Number,
      default: 0,
      min: [0, 'Total revenue cannot be negative']
    },
    operatingCosts: {
      type: Number,
      default: 0,
      min: [0, 'Operating costs cannot be negative']
    },
    profit: {
      type: Number,
      default: 0
    },
    profitMargin: {
      type: Number,
      default: 0,
      min: [-100, 'Profit margin cannot be less than -100%'],
      max: [100, 'Profit margin cannot exceed 100%']
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
analyticsSchema.index({ date: -1 });
analyticsSchema.index({ dailyBookings: -1 });
analyticsSchema.index({ dailyRevenue: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
