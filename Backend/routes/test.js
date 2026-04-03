const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { classifyMessage } = require('../services/claude');
const { sendSMS } = require('../services/twilio');
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');

router.get('/api/test', async (req, res) => {
  const results = {
    mongodb: { status: 'pending' },
    gemini: { status: 'pending' },
    twilio: { status: 'pending' },
    database: { status: 'pending' }
  };

  try {
    try {
      if (mongoose.connection.readyState === 1) {
        results.mongodb = { status: 'ok', message: 'Connected' };
      } else {
        results.mongodb = { status: 'fail', message: 'Not connected' };
      }
    } catch (e) { results.mongodb = { status: 'fail', message: e.message }; }

    try {
      const result = await classifyMessage('Test: 5 people trapped in flood at Andheri, need boat');
      if (result && result.location && result.urgency) {
        results.gemini = { status: 'ok', message: 'Working', sample: result };
      } else {
        results.gemini = { status: 'fail', message: 'Bad response' };
      }
    } catch (e) { results.gemini = { status: 'fail', message: e.message }; }

    try {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        throw new Error("Missing Twilio credentials in environment");
      }
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      if (client) {
        results.twilio = { 
          status: 'ok', 
          message: 'Credentials valid', 
          number: process.env.TWILIO_PHONE_NUMBER 
        };
      }
    } catch (e) { results.twilio = { status: 'fail', message: e.message }; }

    try {
      results.database = {
        status: 'ok',
        reports: await Report.countDocuments(),
        volunteers: await Volunteer.countDocuments(),
        availableVolunteers: await Volunteer.countDocuments({ isAvailable: true })
      };
    } catch (e) { results.database = { status: 'fail', message: e.message }; }

    res.json({
      success: true,
      timestamp: new Date(),
      results: results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
