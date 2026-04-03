const mongoose = require('mongoose');

const resolutionLogSchema = new mongoose.Schema({
  responseTimeMinutes: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ResolutionLog', resolutionLogSchema);
