const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  name:          { type: String, default: 'Volunteer' },
  phone:         { type: String, default: '' },
  area:          { type: String, default: '' },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  status:        {
    type: String,
    enum: ['free', 'busy'],
    default: 'free'
  },
  isAvailable:   { type: Boolean, default: true },
  currentTask:   {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    default: null
  },
  /** Same report as currentTask; used for SMS reply / hold state */
  activeCase:    {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    default: null
  },
  totalResolved: { type: Number, default: 0 }
});

module.exports = mongoose.model('Volunteer', volunteerSchema);
