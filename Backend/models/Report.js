const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  rawMessage: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: "Unknown"
  },
  urgency: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);
