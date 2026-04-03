const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  name: String,
  coordinates: {
    lat: Number,
    lng: Number
  },
  status: {
    type: String,
    enum: ["free", "busy"],
    default: "free"
  },
  currentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Report",
    default: null
  }
});

module.exports = mongoose.model('Volunteer', volunteerSchema);
