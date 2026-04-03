const Volunteer = require('../models/Volunteer');
const Report = require('../models/Report');

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findAndAssignVolunteer(report) {
  try {
    // Step 1: If report has no coordinates or needs, return null
    if (!report.coordinates?.lat || !report.needs?.length) return null;

    // Step 2: Get all available volunteers from MongoDB
    const volunteers = await Volunteer.find({ isAvailable: true });

    // Step 3: Filter by skill match
    const filtered = volunteers.filter(volunteer => 
      volunteer.skills && volunteer.skills.some(skill => report.needs.includes(skill))
    );

    // Step 4: If no volunteers found after filter, return null
    if (filtered.length === 0) return null;

    // Step 5: Calculate distance for each filtered volunteer
    filtered.forEach(volunteer => {
      volunteer.distance = haversine(
        report.coordinates.lat,
        report.coordinates.lng,
        volunteer.location.lat,
        volunteer.location.lng
      );
    });

    // Step 6: Sort by distance ascending
    filtered.sort((a, b) => a.distance - b.distance);

    // Step 7: Take first volunteer (nearest)
    const nearest = filtered[0];

    // Step 8: Atomic MongoDB update
    await Volunteer.findByIdAndUpdate(nearest._id, {
      isAvailable: false,
      activeCase: report._id
    });

    await Report.findByIdAndUpdate(report._id, {
      status: 'assigned',
      assignedTo: nearest._id
    });

    // Step 9: Return object
    return {
      volunteer: nearest,
      distance: nearest.distance.toFixed(2)
    };
  } catch (error) {
    console.error('Matcher error:', error.message);
    return null;
  }
}

module.exports = { findAndAssignVolunteer };
