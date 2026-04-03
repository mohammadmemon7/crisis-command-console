const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  phone:         { type: String, default: '' },
  skills:        {
    type: [String],
    enum: ['boat', 'medical', 'rescue', 'food', 'vehicle', 'water', 'shelter'],
    default: []
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  homeLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  status:        { type: String, enum: ['free', 'busy'], default: 'free' },
  currentTask:   { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },
  isAvailable:   { type: Boolean, default: true },
  activeCase:    { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },
  area:          { type: String },
  totalResolved: { type: Number, default: 0 },
  registeredAt:  { type: Date, default: Date.now }
});

volunteerSchema.pre('save', function syncAvailability() {
  if (this.status === 'busy') {
    this.isAvailable = false;
  } else if (this.status === 'free') {
    this.isAvailable = true;
  }
  if (this.currentTask && !this.activeCase) {
    this.activeCase = this.currentTask;
  }
  if (!this.currentTask && this.activeCase) {
    this.currentTask = this.activeCase;
  }
});

module.exports = mongoose.model('Volunteer', volunteerSchema);
