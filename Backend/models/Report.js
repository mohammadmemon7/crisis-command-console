const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  rawMessage:    { type: String, required: true },
  location:      { type: String, default: '' },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  priority:      { type: Number, min: 1, max: 5, default: 3 },
  peopleCount:   { type: Number, default: 1 },
  needs:         { type: [String], default: ['rescue'] },
  source:        { type: String, enum: ['app', 'sms', 'voice', 'sos'], default: 'app' },
  senderPhone:   { type: String, default: null },
  status:        {
    type: String,
    enum: ['pending', 'sms_pending', 'assigned', 'resolved'],
    default: 'pending'
  },
  assignedTo:    { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', default: null },
  startedAt:     { type: Date, default: null },
  resolvedAt:    { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
