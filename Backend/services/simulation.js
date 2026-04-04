const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const ResolutionLog = require('../models/ResolutionLog');
const { getIO } = require('../socket');

const TASK_SECONDS = 30;
const TICK_MS = 2000;

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function assignTick() {
  try {
    const pending = await Report.find({ status: 'pending', mode: 'chaos' }).sort({ createdAt: 1 });
    const availableVolunteers = await Volunteer.find({ status: 'free', isAvailable: true });
    const io = getIO();

    for (const report of pending) {
      if (!report.coordinates || report.coordinates.lat == null) continue;
      if (availableVolunteers.length === 0) break;

      let nearest = null;
      let minDist = Infinity;
      let nearestIdx = -1;

      // Try to find a suitable volunteer first (skill match)
      const needs = report.needs || [];
      let candidates = availableVolunteers;
      
      if (needs.length > 0) {
        const skillMatched = availableVolunteers.filter(v => 
          v.skills && v.skills.some(s => needs.includes(s))
        );
        if (skillMatched.length > 0) {
          candidates = skillMatched;
        }
      }

      for (let i = 0; i < candidates.length; i++) {
        const vol = candidates[i];
        const vlat = vol.coordinates?.lat ?? vol.location?.lat;
        const vlng = vol.coordinates?.lng ?? vol.location?.lng;
        
        if (vlat == null || vlng == null) continue;

        const dist = getDistance(
          report.coordinates.lat,
          report.coordinates.lng,
          vlat,
          vlng
        );

        if (dist < minDist) {
          minDist = dist;
          nearest = vol;
          nearestIdx = availableVolunteers.indexOf(vol);
        }
      }

      if (nearest) {
        if (nearest.homeLocation == null || nearest.homeLocation.lat == null) {
          nearest.homeLocation = {
            lat: nearest.coordinates?.lat ?? nearest.location?.lat,
            lng: nearest.coordinates?.lng ?? nearest.location?.lng
          };
        }

        nearest.status = 'busy';
        nearest.isAvailable = false;
        nearest.currentTask = report._id;
        nearest.activeCase = report._id;
        await nearest.save();

        report.status = 'assigned';
        report.assignedTo = nearest._id;
        report.startedAt = new Date();
        await report.save();

        // Remove assigned volunteer from list for this tick
        availableVolunteers.splice(nearestIdx, 1);

        if (io) {
          io.emit('caseAccepted', {
            reportId: report._id,
            volunteerName: nearest.name,
            eta: '5'
          });
          io.emit('statsUpdated');
        }
      }
    }
  } catch (e) {
    console.error('assignTick:', e.message);
  }
}

async function movementTick() {
  try {
    const reports = await Report.find({ status: 'assigned' }).populate('assignedTo');
    const io = getIO();

    for (const report of reports) {
      const vol = report.assignedTo;
      if (!vol || report.coordinates?.lat == null || report.coordinates?.lng == null) continue;
      if (!vol.coordinates || vol.coordinates.lat == null) continue;
      const tlat = report.coordinates.lat;
      const tlng = report.coordinates.lng;
      vol.coordinates.lat += (tlat - vol.coordinates.lat) * 0.15;
      vol.coordinates.lng += (tlng - vol.coordinates.lng) * 0.15;
      await vol.save();
    }

    if (io && reports.length) io.emit('simulationTick', { type: 'movement' });
  } catch (e) {
    console.error('movementTick:', e.message);
  }
}

async function resolveTick() {
  try {
    const activeReports = await Report.find({ status: 'assigned' });
    const io = getIO();
    const now = Date.now();

    for (const report of activeReports) {
      const started = report.startedAt
        ? new Date(report.startedAt).getTime()
        : 0;
      const seconds = (now - started) / 1000;
      if (seconds < TASK_SECONDS) continue;

      const volunteer = await Volunteer.findById(report.assignedTo);
      if (volunteer) {
        volunteer.status = 'free';
        volunteer.isAvailable = true;
        volunteer.currentTask = null;
        volunteer.activeCase = null;
        volunteer.totalResolved = (volunteer.totalResolved || 0) + 1;
        if (
          volunteer.homeLocation != null &&
          volunteer.homeLocation.lat != null &&
          volunteer.homeLocation.lng != null
        ) {
          volunteer.coordinates.lat = volunteer.homeLocation.lat;
          volunteer.coordinates.lng = volunteer.homeLocation.lng;
        }
        await volunteer.save();
      }

      const mins = (now - new Date(report.createdAt).getTime()) / 60000;
      await ResolutionLog.create({ responseTimeMinutes: mins });

      const rid = report._id;
      await Report.findByIdAndDelete(rid);

      if (io) {
        io.emit('caseResolved', { reportId: rid });
        io.emit('reportDeleted', { reportId: rid });
        io.emit('statsUpdated');
      }
    }
  } catch (e) {
    console.error('resolveTick:', e.message);
  }
}

async function simulationStep() {
  await assignTick();
  await movementTick();
  await resolveTick();
}

function startSimulation() {
  setInterval(simulationStep, TICK_MS);
  console.log('State-driven simulation: assign + movement + 30s resolve (2s tick)');
}

module.exports = { startSimulation };
