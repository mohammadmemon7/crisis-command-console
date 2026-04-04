const express = require("express");
const router = express.Router();
const Volunteer = require("../models/Volunteer");

router.post("/login", async (req, res) => {
  console.log("LOGIN HIT - Method: POST, Body:", req.body);
  try {
    const { name, phone, area, coordinates } = req.body;
    
    if (!name || !phone || !coordinates) {
      return res.status(400).json({ error: "Name, phone, and coordinates are required" });
    }

    let volunteer = await Volunteer.findOne({ phone });

    if (!volunteer) {
      volunteer = await Volunteer.create({
        name,
        phone,
        area,
        status: "free",
        isAvailable: true,
        coordinates: coordinates
      });
      console.log("New volunteer created with location:", volunteer.name);
    } else {
      volunteer.coordinates = coordinates;
      // If no current task, ensure they are free
      if (!volunteer.currentTask) {
        volunteer.status = "free";
        volunteer.isAvailable = true;
      }
      await volunteer.save();
      console.log("Existing volunteer logged in and location updated:", volunteer.name);
    }

    res.json({ success: true, volunteer });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
