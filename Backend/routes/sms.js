const express = require('express');
const router = express.Router();
const Volunteer = require('../models/Volunteer');
const { classifyMessage } = require('../services/claude');
const { createReport } = require('../services/createReport');
const { getIO } = require('../socket');

router.post('/api/sms', async (req, res) => {
  try {
    const message = req.body.Body;

    const aiResult = await classifyMessage(message);

    const savedReport = await createReport({
      rawMessage: message,
      location: aiResult.location,
      coordinates: { lat: 19.076, lng: 72.877 },
      source: 'sms',
      needs: aiResult.needs && aiResult.needs.length ? aiResult.needs : ['rescue'],
      peopleCount: aiResult.peopleCount || 1
    });

    getIO().emit('newReport', savedReport);

    res.set('Content-Type', 'text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    CrisisNet received your report from ${aiResult.location}. 
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

router.post('/api/sms-reply', async (req, res) => {
  try {
    const { Body, From } = req.body;
    const replyText = Body ? Body.trim() : '';

    if (replyText === '1') {
      const volunteer = await Volunteer.findOne({ phone: From });

      if (volunteer && volunteer.currentTask) {
        getIO().emit('caseAccepted', {
          reportId: volunteer.currentTask,
          volunteerName: volunteer.name,
          eta: '8'
        });
      }

      res.set('Content-Type', 'text/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You accepted the case. Stay safe.</Message>
</Response>`);
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
