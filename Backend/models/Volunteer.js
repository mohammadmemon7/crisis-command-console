const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  phone:         { type: String, required: true },
  skills:        { 
    type: [String], 
    enum: ['boat','medical','rescue','food','vehicle','water','shelter'] 
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  area:          { type: String },
  isAvailable:   { type: Boolean, default: true },
  activeCase:    { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },
  totalResolved: { type: Number, default: 0 },
  registeredAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Volunteer', volunteerSchema);
