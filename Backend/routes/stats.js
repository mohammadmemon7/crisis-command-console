const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const Stats = require('../models/Stats');

router.get('/api/stats', async (req, res) => {
  try {
    const reports = await Report.find({ assignedAt: { $ne: null } });

    let totalResponseTimeMs = 0;
    reports.forEach(r => {
      if (r.assignedAt && r.createdAt) {
        totalResponseTimeMs += (new Date(r.assignedAt).getTime() - new Date(r.createdAt).getTime());
      }
    });

    const avgResponseTimeMinutes = reports.length === 0 
      ? 0 
      : (totalResponseTimeMs / reports.length / 1000 / 60);

    const activeCases = await Report.countDocuments({ status: { $ne: "resolved" } });
    const busyVolunteers = await Volunteer.countDocuments({ status: "busy" });
    
    // For resolved cases, use Stats model as it's the source of truth for deleted reports
    let stats = await Stats.findOne();
    const totalResolved = stats ? stats.totalResolved : 0;

    res.json({
      active: activeCases,
      resolved: totalResolved,
      volunteersDeployed: busyVolunteers,
      avgResponseTime: avgResponseTimeMinutes.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/dashboard', async (req, res) => {
  try {
    const activeCases = await Report.countDocuments({ status: { $ne: "resolved" } });
    const busyVolunteers = await Volunteer.countDocuments({ status: "busy" });
    
    let stats = await Stats.findOne();
    const totalResolved = stats ? stats.totalResolved : 0;

    res.json({
      activeCases,
      resolvedCases: totalResolved,
      busyVolunteers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
