const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const ResolutionLog = require('../models/ResolutionLog');

router.get('/api/stats', async (req, res) => {
  try {
    const [active, volunteersDeployed, totalResolvedLifetime, avgAgg] = await Promise.all([
      Report.countDocuments({ status: { $in: ['pending', 'assigned'] } }),
      Volunteer.countDocuments({ status: 'busy' }),
      ResolutionLog.countDocuments(),
      ResolutionLog.aggregate([
        { $group: { _id: null, avg: { $avg: '$responseTimeMinutes' } } }
      ])
    ]);

    const avgResponseTimeMinutes = avgAgg[0]?.avg != null
      ? Number(Number(avgAgg[0].avg).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      active,
      resolved: totalResolvedLifetime,
      volunteersDeployed,
      avgResponseTimeMinutes,
      totalResolvedLifetime
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
