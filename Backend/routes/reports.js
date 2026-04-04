const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const { classifyMessage } = require('../services/claude');
const { createReport } = require('../services/createReport');
const { getIO } = require('../socket');

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
      peopleCount: aiResult.peopleCount || 1,
      priority: aiResult.urgency != null ? aiResult.urgency : 3
    });

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
      report.status = "assigned";
      report.assignedTo = volunteerId;
      report.assignedAt = new Date();
      report.startedAt = new Date();

      await Volunteer.findByIdAndUpdate(volunteerId, {
        status: "busy",
        currentTask: report._id
      });
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
