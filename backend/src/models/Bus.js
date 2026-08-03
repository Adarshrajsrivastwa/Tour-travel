const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busName: {
    type: String,
    required: [true, 'Bus name is required'],
    trim: true,
    maxlength: [100, 'Bus name cannot exceed 100 characters']
  },
  busNumber: {
    type: String,
    required: [true, 'Bus number is required'],
    unique: true,
    trim: true,
    match: [/^[A-Z]{2}-\d{2}-[A-Z]{2}-\d{4}$/, 'Please enter a valid bus number (e.g., MH-01-AB-1234)']
  },
  seatArchitecture: {
    type: String,
    required: false, // Made optional for backward compatibility
    enum: ['2+2', '2+1', '1+1', '3+2']
  },
  seatCapacity: {
    type: Number,
    required: [true, 'Seat capacity is required'],
    min: [1, 'Seat capacity must be at least 1'],
    max: [100, 'Seat capacity cannot exceed 100']
  },
  // New seat layout system - Android-friendly format
  seatLayout: {
    rows: {
      type: Number,
      min: [1, 'Rows must be at least 1'],
      max: [50, 'Rows cannot exceed 50'],
      default: null
    },
    columns: {
      type: Number,
      min: [1, 'Columns must be at least 1'],
      max: [10, 'Columns cannot exceed 10'],
      default: null
    },
    // Array of seat objects: [{row: 0, column: 0, enabled: true, seatLabel: 'A1'}, ...]
    // This format is easier for Android to parse and render
    seats: [{
      row: {
        type: Number,
        required: true,
        min: 0
      },
      column: {
        type: Number,
        required: true,
        min: 0
      },
      enabled: {
        type: Boolean,
        default: true
      },
      seatLabel: {
        type: String,
        default: ''
      }
    }],
    // Alternative: 2D array format for easier frontend rendering
    // Format: [[{enabled: true, seatLabel: 'A1'}, ...], ...]
    map: {
      type: mongoose.Schema.Types.Mixed,
      default: []
    }
  },
  rcDocument: {
    type: String,
    default: null
  },
  pollutionCertificate: {
    type: String,
    default: null
  },
  insuranceNumber: {
    type: String,
    required: [true, 'Insurance number is required'],
    trim: true
  },
  insuranceCertificate: {
    type: String,
    default: null
  },
  busImages: {
    front: {
      type: String,
      default: null
    },
    rear: {
      type: String,
      default: null
    },
    left: {
      type: String,
      default: null
    },
    right: {
      type: String,
      default: null
    }
  },
  acType: {
    type: String,
    enum: ['AC', 'Non-AC'],
    default: 'AC'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Maintenance', 'Retired'],
    default: 'Active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  assignedTrips: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardSchedule'
  }],
  maintenanceHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      required: true
    },
    cost: {
      type: Number,
      default: 0
    },
    nextMaintenanceDate: {
      type: Date
    }
  }],
  lastMaintenanceDate: {
    type: Date
  },
  nextMaintenanceDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual for document completion status
busSchema.virtual('documentStatus').get(function() {
  const hasRC = !!this.rcDocument;
  const hasPollution = !!this.pollutionCertificate;
  const hasInsurance = !!this.insuranceCertificate;
  const hasImages = Object.values(this.busImages).some(img => img);
  
  const docCount = [hasRC, hasPollution, hasInsurance, hasImages].filter(Boolean).length;
  
  if (docCount === 4) {
    return { status: 'Complete', color: 'green', count: docCount };
  } else if (docCount >= 2) {
    return { status: 'Partial', color: 'yellow', count: docCount };
  } else {
    return { status: 'Missing', color: 'red', count: docCount };
  }
});

// Transform function to ensure proper serialization
busSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Ensure documentStatus is properly serialized as a plain object
    if (ret.documentStatus) {
      if (typeof ret.documentStatus === 'object' && ret.documentStatus !== null) {
        ret.documentStatus = {
          status: ret.documentStatus.status || 'Missing',
          color: ret.documentStatus.color || 'red',
          count: ret.documentStatus.count || 0
        };
      } else if (typeof ret.documentStatus === 'string') {
        // If it's already a string (shouldn't happen, but handle it)
        delete ret.documentStatus;
      }
    }
    return ret;
  }
});

module.exports = mongoose.model('Bus', busSchema);
