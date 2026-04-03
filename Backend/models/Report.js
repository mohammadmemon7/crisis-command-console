const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  name:        { type: String, default: 'Anonymous User' },
  rawMessage:  { type: String, required: true },
  location:    { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  urgency:     { type: Number, min: 1, max: 5, default: 3 },
  peopleCount: { type: Number, default: 1 },
  needs:       { type: [String], enum: ['rescue','medical','food','water','shelter','boat','vehicle'] },
  status:      { 
    type: String, 
    enum: ['pending','verified','assigned','resolved','false_alarm'],
    default: 'pending'
  },
  source:      { 
    type: String, 
    enum: ['app','sms','voice','sos'],
    default: 'app'
  },
  reportCount: { type: Number, default: 1 },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', default: null },
  resolvedAt:  { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
