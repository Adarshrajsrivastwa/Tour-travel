const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Stop name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Stop name cannot exceed 100 characters'],
    index: true
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [100, 'Display name cannot exceed 100 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Text index for searching
stopSchema.index({ name: 'text', displayName: 'text' });

// Case-insensitive index for exact matching
stopSchema.index({ name: 1 }, { collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Stop', stopSchema);

