const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  totalResolved: { type: Number, default: 0 },
  totalResponseTime: { type: Number, default: 0 }
});

module.exports = mongoose.model("Stats", statsSchema);
