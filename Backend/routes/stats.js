const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const Stats = require('../models/Stats');

router.get('/api/stats', async (req, res) => {
  try {
    const reports = await Report.find({ assignedAt: { $ne: null } });

    if (!reports.length) {
      return res.json({ 
        active: 0,
        resolved: 0,
        volunteersDeployed: 0,
        avgResponseTime: "0.00" 
      });
    }

    let totalTime = 0;
    reports.forEach(r => {
      if (r.assignedAt && r.createdAt) {
        totalTime += (new Date(r.assignedAt).getTime() - new Date(r.createdAt).getTime());
      }
    });

    const avgMinutes = totalTime / reports.length / 1000 / 60;

    const activeCases = await Report.countDocuments({ status: { $ne: "resolved" } });
    const busyVolunteers = await Volunteer.countDocuments({ status: "busy" });
    
    let stats = await Stats.findOne();
    const totalResolved = stats ? stats.totalResolved : 0;

    res.json({
      active: activeCases,
      resolved: totalResolved,
      volunteersDeployed: busyVolunteers,
      avgResponseTime: avgMinutes.toFixed(2)
    });
  } catch (error) {
    console.error("Stats API Error:", error);
    res.status(500).json({ avgResponseTime: "0.00" });
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
