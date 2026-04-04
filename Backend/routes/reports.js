const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const { classifyMessage } = require('../services/claude');
const { createReport } = require('../services/createReport');
const { getIO } = require('../socket');

const Stats = require('../models/Stats');

const emitStats = async () => {
  try {
    const statsObj = await Stats.findOne();
    const active = await Report.countDocuments({ status: 'assigned' });
    const volunteersDeployed = await Volunteer.countDocuments({ status: 'busy' });
    
    const reports = await Report.find({ assignedAt: { $ne: null } });
    let totalTime = 0;
    reports.forEach(r => {
      if (r.assignedAt && r.createdAt) {
        totalTime += (new Date(r.assignedAt).getTime() - new Date(r.createdAt).getTime());
      }
    });
    const avgMinutes = reports.length > 0 ? (totalTime / reports.length / 1000 / 60) : 0;
    
    const data = {
      active,
      resolved: statsObj ? statsObj.totalResolved : 0,
      volunteersDeployed,
      avgResponseTime: avgMinutes.toFixed(2)
    };
    
    const io = getIO();
    if (io) {
      io.emit('statsUpdated', data);
    }
  } catch (err) {
    console.error("Error emitting stats:", err);
  }
};

router.post('/', async (req, res) => {
  console.log('🔥 BACKEND HIT', req.body);
  try {
    const message = req.body.message || req.body.rawMessage;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const aiResult = await classifyMessage(message);

    const toNum = (v) => (v === undefined || v === null || v === '' ? NaN : Number(v));
    const latN = toNum(req.body.lat);
    const lngN = toNum(req.body.lng);
    let coordinates = null;
    if (Number.isFinite(latN) && Number.isFinite(lngN)) {
      coordinates = { lat: latN, lng: lngN };
    } else if (req.body.coordinates) {
      const clat = toNum(req.body.coordinates.lat);
      const clng = toNum(req.body.coordinates.lng);
      if (Number.isFinite(clat) && Number.isFinite(clng)) {
        coordinates = { lat: clat, lng: clng };
      }
    }

    const locationLabel =
      typeof req.body.location === 'string' && req.body.location.trim()
        ? req.body.location.trim()
        : aiResult.location;

    const needs =
      aiResult.needs && aiResult.needs.length ? aiResult.needs : ['rescue'];

    const savedReport = await createReport({
      rawMessage: message,
      coordinates,
      location: locationLabel,
      source: req.body.source || 'app',
      needs,
      mode: req.body.mode || 'manual',
      peopleCount: aiResult.peopleCount || 1,
      priority: req.body.priority != null ? Number(req.body.priority) : (aiResult.urgency != null ? aiResult.urgency : 3)
    });

    if (savedReport.mode === 'manual') {
      const io = getIO();
      if (io) {
        io.emit('newManualRequest', savedReport);
        emitStats();
      }
    }

    const reportOut = await Report.findById(savedReport._id)
      .populate('assignedTo', 'name phone coordinates status currentTask isAvailable')
      .lean();

    return res.status(201).json({
      success: true,
      report: reportOut || savedReport,
      assigned: false,
      volunteer: null
    });
  } catch (err) {
    console.error('❌ ERROR:', err);
    return res.status(500).json({ error: 'Failed to save report' });
  }
});

router.get('/', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    return res.status(200).json(reports);
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.patch('/:id/respond', async (req, res) => {
  try {
    const { action, volunteerId } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (action === "accept") {
      // ATOMIC UPDATE: Only assign if report is still pending
      const updatedReport = await Report.findOneAndUpdate(
        { _id: req.params.id, assignedTo: null },
        { 
          status: "assigned",
          assignedTo: volunteerId,
          assignedAt: new Date(),
          startedAt: new Date()
        },
        { new: true }
      );

      if (!updatedReport) {
        return res.status(400).json({ error: "Report already assigned to another volunteer" });
      }

      const volunteer = await Volunteer.findByIdAndUpdate(volunteerId, {
        status: "busy",
        currentTask: updatedReport._id,
        activeCase: updatedReport._id,
        isAvailable: false
      }, { new: true });

      const io = getIO();
      if (io) {
        io.emit('caseAccepted', {
          reportId: updatedReport._id,
          volunteerName: volunteer.name,
          eta: '8'
        });
        io.emit('volunteerUpdated', volunteer);
        emitStats();
      }
      return res.json({ success: true, report: updatedReport });
    } else if (action === "reject") {
      report.status = "pending";
      report.assignedTo = null;
    }

    await report.save();
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
