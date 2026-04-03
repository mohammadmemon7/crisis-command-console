const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  rawMessage:  { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  priority:    { type: Number, min: 1, max: 5, default: 3 },
  status:      { 
    type: String, 
    enum: ['pending','assigned'],
    default: 'pending'
  },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', default: null },
  startedAt:   { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
