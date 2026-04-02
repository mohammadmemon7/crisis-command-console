const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

// POST /api/report
router.post('/report', async (req, res) => {
  const { message } = req.body;

  try {
    const newReport = new Report({
      rawMessage: message,
      location: "Dummy Location", // dummy value
      urgency: 1 // dummy value
    });

    const savedReport = await newReport.save();
    res.status(201).json(savedReport);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
