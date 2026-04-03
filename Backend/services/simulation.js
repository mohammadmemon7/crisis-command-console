const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const ResolutionLog = require('../models/ResolutionLog');
const { getIO } = require('../socket');

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function movementTick() {
  try {
    const reports = await Report.find({ status: 'assigned' }).populate('assignedTo');
    const io = getIO();
    for (const report of reports) {
      const vol = report.assignedTo;
      if (!vol || report.coordinates?.lat == null || report.coordinates?.lng == null) continue;
      if (!vol.location || vol.location.lat == null) continue;
      const tlat = report.coordinates.lat;
      const tlng = report.coordinates.lng;
      vol.location.lat += (tlat - vol.location.lat) * 0.2;
      vol.location.lng += (tlng - vol.location.lng) * 0.2;
      await vol.save();
    }
    if (io && reports.length) io.emit('simulationTick', { type: 'movement' });
  } catch (e) {
    console.error('simulation movementTick:', e.message);
  }
}

async function resolveTick() {
  try {
    const reports = await Report.find({ status: 'assigned' }).populate('assignedTo');
    const io = getIO();
    for (const report of reports) {
      const vol = report.assignedTo;
      if (!vol || report.coordinates?.lat == null || report.coordinates?.lng == null) continue;
      if (!vol.location || vol.location.lat == null) continue;

      const dist = haversineKm(
        report.coordinates.lat,
        report.coordinates.lng,
        vol.location.lat,
        vol.location.lng
      );

      if (dist < 0.1) {
        const mins = (Date.now() - new Date(report.createdAt).getTime()) / 60000;
        await ResolutionLog.create({ responseTimeMinutes: mins });

        vol.isAvailable = true;
        vol.status = 'free';
        vol.activeCase = null;
        if (vol.homeLocation != null && vol.homeLocation.lat != null && vol.homeLocation.lng != null) {
          vol.location.lat = vol.homeLocation.lat;
          vol.location.lng = vol.homeLocation.lng;
        }
        vol.totalResolved = (vol.totalResolved || 0) + 1;
        await vol.save();

        const rid = report._id;
        await Report.findByIdAndDelete(rid);

        if (io) {
          io.emit('reportDeleted', { reportId: rid });
          io.emit('statsUpdated');
        }
      }
    }
  } catch (e) {
    console.error('simulation resolveTick:', e.message);
  }
}

function startSimulation() {
  setInterval(movementTick, 2000);
  setInterval(resolveTick, 3000);
  console.log('Crisis simulation engine started (movement 2s, resolve 3s)');
}

module.exports = { startSimulation, haversineKm };
