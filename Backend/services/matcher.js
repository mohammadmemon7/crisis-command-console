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
    if (!report.coordinates?.lat || report.coordinates.lng == null) return null;

    const volunteers = await Volunteer.find({ isAvailable: true });
    if (volunteers.length === 0) return null;

    const needs = report.needs && report.needs.length ? report.needs : ['rescue'];

    const withSkill = volunteers.filter(vol =>
      vol.skills && vol.skills.length && vol.skills.some(skill => needs.includes(skill))
    );

    const candidates = withSkill.length > 0 ? withSkill : volunteers;

    candidates.forEach(volunteer => {
      if (!volunteer.location?.lat || volunteer.location?.lng == null) {
        volunteer.distance = Infinity;
        return;
      }
      volunteer.distance = haversine(
        report.coordinates.lat,
        report.coordinates.lng,
        volunteer.location.lat,
        volunteer.location.lng
      );
    });

    candidates.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

    const nearest = candidates[0];
    if (!nearest || nearest.distance === Infinity) return null;

    const volDoc = await Volunteer.findById(nearest._id);
    if (!volDoc) return null;

    if (volDoc.homeLocation == null || volDoc.homeLocation.lat == null) {
      volDoc.homeLocation = { lat: volDoc.location.lat, lng: volDoc.location.lng };
    }
    volDoc.isAvailable = false;
    volDoc.status = 'busy';
    volDoc.activeCase = report._id;
    await volDoc.save();

    await Report.findByIdAndUpdate(report._id, {
      status: 'assigned',
      assignedTo: nearest._id
    });

    // Step 9: Return object
    return {
      volunteer: volDoc,
      distance: nearest.distance.toFixed(2)
    };
  } catch (error) {
    console.error('Matcher error:', error.message);
    return null;
  }
}

module.exports = { findAndAssignVolunteer };
