const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const { classifyMessage } = require('../services/claude');
const { findAndAssignVolunteer } = require('../services/matcher');
const { sendSMS } = require('../services/twilio');
const { getIO } = require('../socket');

// POST /api/sms
router.post('/api/sms', async (req, res) => {
    try {
        const message = req.body.Body;
        const fromNumber = req.body.From;

        const aiResult = await classifyMessage(message);

        const newReport = new Report({
            rawMessage: message,
            location: aiResult.location,
            coordinates: { lat: 19.076, lng: 72.877 },
            urgency: aiResult.urgency,
            peopleCount: aiResult.peopleCount,
            needs: aiResult.needs,
            source: 'sms',
            status: 'pending'
        });
        const savedReport = await newReport.save();

        getIO().emit('newReport', savedReport);

        const matchResult = await findAndAssignVolunteer(savedReport);

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

        res.set('Content-Type', 'text/xml');
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    CrisisNet received your report from ${aiResult.location}. 
    Urgency: ${aiResult.urgency}/5. 
    Help is being coordinated. Stay safe.
  </Message>
</Response>`);
    } catch (error) {
        res.set('Content-Type', 'text/xml');
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    CrisisNet received your message. 
    We are processing your request.
  </Message>
</Response>`);
    }
});

// POST /api/sms-reply
router.post('/api/sms-reply', async (req, res) => {
    try {
        const { Body, From } = req.body;
        const replyText = Body ? Body.trim() : '';

        if (replyText === '1') {
            const volunteer = await Volunteer.findOne({ phone: From });
            
            if (volunteer && volunteer.activeCase) {
                const report = await Report.findById(volunteer.activeCase);
                if (report) {
                    report.status = 'assigned';
                    await report.save();
                    
                    getIO().emit('reportUpdated', {
                        reportId: report._id,
                        status: 'confirmed',
                        volunteerName: volunteer.name
                    });
                    
                    res.set('Content-Type', 'text/xml');
                    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you ${volunteer.name}! Report confirmed. Please proceed to ${report.location}.</Message>
</Response>`);
                }
            }
        }
        
        res.set('Content-Type', 'text/xml');
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Reply 1 to accept the case.</Message>
</Response>`);
    } catch (error) {
        res.set('Content-Type', 'text/xml');
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Error processing reply.</Message>
</Response>`);
    }
});

module.exports = router;
