const express = require("express");
const router = express.Router();
const Volunteer = require("../models/Volunteer");

router.post("/login", async (req, res) => {
  console.log("LOGIN HIT - Method: POST, Body:", req.body);
  try {
    const { name, phone, area } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    let volunteer = await Volunteer.findOne({ phone });

    if (!volunteer) {
      volunteer = await Volunteer.create({
        name,
        phone,
        area,
        status: "free",
        coordinates: { lat: 19.076, lng: 72.877 }
      });
      console.log("New volunteer created:", volunteer.name);
    } else {
      console.log("Existing volunteer logged in:", volunteer.name);
    }

    res.json({ success: true, volunteer });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
