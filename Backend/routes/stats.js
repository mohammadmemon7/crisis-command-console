const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const Stats = require('../models/Stats');

router.get('/api/stats', async (req, res) => {
  try {
    let stats = await Stats.findOne();
    if (!stats) stats = await Stats.create({});

    const avgSeconds =
      stats.totalResolved === 0
        ? 0
        : stats.totalResponseTime / stats.totalResolved;

    const avgMinutes = avgSeconds / 60;

    const active = await Report.countDocuments({ status: { $in: ['pending', 'assigned'] } });
    const volunteersDeployed = await Volunteer.countDocuments({ status: 'busy' });

    res.json({
      resolved: stats.totalResolved,
      avgResponseTime: avgMinutes.toFixed(2),
      active,
      volunteersDeployed
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
