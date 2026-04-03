const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const { classifyMessage } = require('../services/claude');
const { findAndAssignVolunteer } = require('../services/matcher');
const { sendSMS } = require('../services/twilio');
const { getIO } = require('../socket');

const DEMO_NAMES = ['Rahul', 'Amit', 'Priya', 'Sneha', 'Arjun', 'Neha'];

function clampPriority(p) {
    const n = Number(p);
    if (!Number.isFinite(n)) return null;
    return Math.min(5, Math.max(1, Math.floor(n)));
}

// POST /api/reports (mounted at /api/reports)
router.post('/', async (req, res) => {
    console.log("🔥 BACKEND HIT");
    console.log("📦 DATA:", req.body);
    try {
        const message = req.body.message || req.body.rawMessage;
        const { source, coordinates: coordsBody, location: bodyLocation, lat: bodyLat, lng: bodyLng, name: bodyName } = req.body;

        console.log("Incoming report:", req.body);

        // Step 1 — Validate
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Step 2 — Call classifyMessage(message)
        const aiResult = await classifyMessage(message);

        const toNum = (v) => (v === undefined || v === null || v === '' ? NaN : Number(v));
        const latN = toNum(bodyLat);
        const lngN = toNum(bodyLng);
        let coordinates = null;
        if (Number.isFinite(latN) && Number.isFinite(lngN)) {
            coordinates = { lat: latN, lng: lngN };
        } else if (coordsBody) {
            const clat = toNum(coordsBody.lat);
            const clng = toNum(coordsBody.lng);
            if (Number.isFinite(clat) && Number.isFinite(clng)) {
                coordinates = { lat: clat, lng: clng };
            }
        }

        const locationLabel = (typeof bodyLocation === 'string' && bodyLocation.trim())
            ? bodyLocation.trim()
            : aiResult.location;

        // Step 3 — Create new Report
        const needs = (aiResult.needs && aiResult.needs.length) ? aiResult.needs : ['rescue'];
        const reporterName = (typeof bodyName === 'string' && bodyName.trim())
            ? bodyName.trim()
            : DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];

        const priorityFromBody = clampPriority(req.body.priority);
        const priority = priorityFromBody != null ? priorityFromBody : (Math.floor(Math.random() * 5) + 1);

        const newReport = new Report({
            name: reporterName,
            rawMessage: message,
            location: locationLabel,
            ...(coordinates ? { coordinates } : {}),
            urgency: priority,
            priority,
            peopleCount: aiResult.peopleCount,
            needs,
            source: source || 'app',
            status: 'pending'
        });
        const savedReport = await newReport.save();
        console.log("✅ SAVED TO DB:", savedReport);

        getIO().emit('newReport', savedReport);

        const matchResult = await findAndAssignVolunteer(savedReport);

        const reportOut = await Report.findById(savedReport._id)
            .populate('assignedTo', 'name phone location status homeLocation isAvailable')
            .lean();

        // Step 6 — If matchResult exists
        if (matchResult && matchResult.volunteer) {
            const smsMessage = 'CrisisNet Alert: Help needed at ' + savedReport.location +
                '. Urgency: ' + savedReport.urgency + '/5' +
                '. People: ' + savedReport.peopleCount +
                '. Distance: ' + matchResult.distance + 'km' +
                '. Reply 1 to accept.';

            await sendSMS(matchResult.volunteer.phone, smsMessage);

            getIO().emit('reportUpdated', {
                reportId: savedReport._id,
                status: 'assigned',
                volunteerName: matchResult.volunteer.name
            });
        }

        return res.status(201).json({
            success: true,
            report: reportOut || savedReport,
            assigned: !!matchResult,
            volunteer: matchResult ? matchResult.volunteer.name : null
        });
    } catch (err) {
        console.error("❌ ERROR:", err);
        return res.status(500).json({ error: 'Failed to save report' });
    }
});

// GET /api/reports (mounted at /api/reports)
router.get('/', async (req, res) => {
    console.log("API HIT: GET /api/reports");
    try {
        const reports = await Report.find({
            status: { $nin: ['resolved', 'false_alarm'] }
        })
        .sort({ createdAt: -1 })
        .populate('assignedTo', 'name phone location status homeLocation isAvailable');

        return res.status(200).json({ success: true, reports });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// PATCH /api/reports/:id (mounted at /api/reports)
router.patch('/:id', async (req, res) => {
    console.log(`API HIT: PATCH /api/reports/${req.params.id}`);
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
                    vol.homeLocation = { lat: vol.location.lat, lng: vol.location.lng };
                }
                vol.isAvailable = false;
                vol.status = 'busy';
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
            updatedReport.resolvedAt = new Date();
            await updatedReport.save();

            const volunteer = await Volunteer.findOne({ activeCase: id });
            
            if (volunteer) {
                volunteer.isAvailable = true;
                volunteer.status = 'free';
                volunteer.activeCase = null;
                volunteer.totalResolved = (volunteer.totalResolved || 0) + 1;
                if (volunteer.homeLocation != null && volunteer.homeLocation.lat != null) {
                    volunteer.location.lat = volunteer.homeLocation.lat;
                    volunteer.location.lng = volunteer.homeLocation.lng;
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
            const volunteer = await Volunteer.findOne({ activeCase: id });
            if (volunteer) {
                volunteer.isAvailable = true;
                volunteer.status = 'free';
                volunteer.activeCase = null;
                if (volunteer.homeLocation != null && volunteer.homeLocation.lat != null) {
                    volunteer.location.lat = volunteer.homeLocation.lat;
                    volunteer.location.lng = volunteer.homeLocation.lng;
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
