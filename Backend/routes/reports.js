const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const { classifyMessage } = require('../services/claude');
const { findAndAssignVolunteer } = require('../services/matcher');
const { sendSMS } = require('../services/twilio');
const { getIO } = require('../socket');

// POST /api/reports
router.post('/api/reports', async (req, res) => {
    try {
        const message = req.body.message || req.body.rawMessage;
        const { source, coordinates } = req.body;

        console.log("Incoming report:", req.body);

        // Step 1 — Validate
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Step 2 — Call classifyMessage(message)
        const aiResult = await classifyMessage(message);

        // Step 3 — Create new Report
        const newReport = new Report({
            rawMessage: message,
            location: aiResult.location,
            coordinates: coordinates || { lat: 19.076, lng: 72.877 },
            urgency: aiResult.urgency,
            peopleCount: aiResult.peopleCount,
            needs: aiResult.needs,
            source: source || 'app',
            status: 'pending'
        });
        const savedReport = await newReport.save();

        // Step 4 — Emit socket event
        getIO().emit('newReport', savedReport);

        // Step 5 — Call findAndAssignVolunteer(savedReport)
        const matchResult = await findAndAssignVolunteer(savedReport);

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

        // Step 7 — Return 201 response
        return res.status(201).json({
            success: true,
            report: savedReport,
            assigned: !!matchResult,
            volunteer: matchResult ? matchResult.volunteer.name : null
        });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// GET /api/reports
router.get('/api/reports', async (req, res) => {
    try {
        const reports = await Report.find({
            status: { $nin: ['resolved', 'false_alarm'] }
        })
        .sort({ createdAt: -1 })
        .populate('assignedTo', 'name phone');

        return res.status(200).json({ success: true, reports });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// PATCH /api/report/:id
router.patch('/api/report/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedReport = await Report.findByIdAndUpdate(id, { status }, { new: true });
        
        if (!updatedReport) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (status === 'resolved') {
            updatedReport.resolvedAt = new Date();
            await updatedReport.save();

            const volunteer = await Volunteer.findOne({ activeCase: id });
            
            if (volunteer) {
                volunteer.isAvailable = true;
                volunteer.activeCase = null;
                volunteer.totalResolved = (volunteer.totalResolved || 0) + 1;
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
