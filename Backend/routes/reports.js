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
      peopleCount: aiResult.peopleCount || 1
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
    const reports = await Report.find({
      status: { $nin: ['resolved', 'false_alarm'] }
    })
      .sort({ createdAt: -1 })
      .populate(
        'assignedTo',
        'name phone coordinates status currentTask isAvailable homeLocation'
      );

    return res.status(200).json({ success: true, reports });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, volunteerId } = req.body;

    const update = { status };
    if (volunteerId && status === 'assigned') {
      update.assignedTo = volunteerId;
    }
    if (status === 'false_alarm') {
      update.assignedTo = null;
    }

    let updatedReport = await Report.findByIdAndUpdate(id, update, { new: true });

    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (status === 'assigned' && volunteerId) {
      const vol = await Volunteer.findById(volunteerId);
      if (vol) {
        if (vol.homeLocation == null || vol.homeLocation.lat == null) {
          vol.homeLocation = { lat: vol.coordinates.lat, lng: vol.coordinates.lng };
        }
        vol.isAvailable = false;
        vol.status = 'busy';
        vol.currentTask = id;
        vol.activeCase = id;
        await vol.save();
      }
      updatedReport = await Report.findByIdAndUpdate(
        id,
        { startedAt: new Date() },
        { new: true }
      );
    }

    if (status === 'resolved') {
      const volunteer = await Volunteer.findOne({
        $or: [{ activeCase: id }, { currentTask: id }]
      });

      if (volunteer) {
        volunteer.isAvailable = true;
        volunteer.status = 'free';
        volunteer.activeCase = null;
        volunteer.currentTask = null;
        volunteer.totalResolved = (volunteer.totalResolved || 0) + 1;
        if (
          volunteer.homeLocation != null &&
          volunteer.homeLocation.lat != null
        ) {
          volunteer.coordinates.lat = volunteer.homeLocation.lat;
          volunteer.coordinates.lng = volunteer.homeLocation.lng;
        }
        await volunteer.save();
      }

      const mins = (Date.now() - new Date(updatedReport.createdAt).getTime()) / 60000;
      const ResolutionLog = require('../models/ResolutionLog');
      await ResolutionLog.create({ responseTimeMinutes: mins });
      await Report.findByIdAndDelete(id);
      getIO().emit('reportDeleted', { reportId: id });
      getIO().emit('statsUpdated');
      return res.status(200).json({ success: true, report: null, deleted: true });
    }

    if (status === 'false_alarm') {
      const volunteer = await Volunteer.findOne({
        $or: [{ activeCase: id }, { currentTask: id }]
      });
      if (volunteer) {
        volunteer.isAvailable = true;
        volunteer.status = 'free';
        volunteer.activeCase = null;
        volunteer.currentTask = null;
        if (
          volunteer.homeLocation != null &&
          volunteer.homeLocation.lat != null
        ) {
          volunteer.coordinates.lat = volunteer.homeLocation.lat;
          volunteer.coordinates.lng = volunteer.homeLocation.lng;
        }
        await volunteer.save();
      }
    }

    getIO().emit('reportUpdated', { reportId: id, status });

    return res.status(200).json({ success: true, report: updatedReport });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
