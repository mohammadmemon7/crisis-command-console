const express = require('express');
const router = express.Router();
const Volunteer = require('../models/Volunteer');

router.get('/api/volunteers', async (req, res) => {
  try {
    const volunteers = await Volunteer.find().sort({ registeredAt: -1 });
    return res.status(200).json({ success: true, volunteers });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.post('/api/volunteer', async (req, res) => {
  try {
    const { name, phone, skills, coordinates, location, area } = req.body;
    const coords = coordinates || location;
    if (!name || !coords || coords.lat == null || coords.lng == null) {
      return res.status(400).json({ error: 'Name and coordinates (lat/lng) required' });
    }

    const volunteer = await new Volunteer({
      name,
      phone: phone || '',
      skills: skills || [],
      coordinates: { lat: Number(coords.lat), lng: Number(coords.lng) },
      area,
      status: 'free',
      isAvailable: true
    }).save();

    return res.status(201).json({ success: true, volunteer });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.patch('/api/volunteer/:id/available', async (req, res) => {
  try {
    const { id } = req.params;
    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    volunteer.isAvailable = true;
    volunteer.status = 'free';
    volunteer.activeCase = null;
    volunteer.currentTask = null;
    await volunteer.save();

    return res.status(200).json({ success: true, volunteer });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
