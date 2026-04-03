const express = require('express');
const router = express.Router();
const Volunteer = require('../models/Volunteer');

// GET /api/volunteers
router.get('/api/volunteers', async (req, res) => {
    try {
        const volunteers = await Volunteer.find().sort({ registeredAt: -1 });
        return res.status(200).json({ success: true, volunteers });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// POST /api/volunteer
router.post('/api/volunteer', async (req, res) => {
    try {
        const { name, phone, skills, location, area } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone required' });
        }

        const newVolunteer = new Volunteer({
            name,
            phone,
            skills,
            location,
            area
        });
        
        const volunteer = await newVolunteer.save();

        return res.status(201).json({ success: true, volunteer });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// PATCH /api/volunteer/:id/available
router.patch('/api/volunteer/:id/available', async (req, res) => {
    try {
        const { id } = req.params;
        
        const volunteer = await Volunteer.findById(id);
        if (!volunteer) {
            return res.status(404).json({ error: 'Volunteer not found' });
        }
        
        volunteer.isAvailable = true;
        volunteer.activeCase = null;
        await volunteer.save();
        
        return res.status(200).json({ success: true, volunteer });
    } catch (error) {
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

module.exports = router;
