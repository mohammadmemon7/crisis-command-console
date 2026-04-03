const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const ResolutionLog = require('../models/ResolutionLog');
const { getIO } = require('../socket');

const TASK_SECONDS = 30;
const TICK_MS = 2000;

async function assignTick() {
  try {
    const pending = await Report.find({ status: 'pending' }).sort({ createdAt: 1 });
    const io = getIO();

    for (const report of pending) {
      const volunteer = await Volunteer.findOne({
        status: 'free',
        isAvailable: true
      }).sort({ registeredAt: 1 });

      if (!volunteer) break;

      if (volunteer.homeLocation == null || volunteer.homeLocation.lat == null) {
        volunteer.homeLocation = {
          lat: volunteer.coordinates.lat,
          lng: volunteer.coordinates.lng
        };
      }

      volunteer.status = 'busy';
      volunteer.isAvailable = false;
      volunteer.currentTask = report._id;
      volunteer.activeCase = report._id;
      await volunteer.save();

      report.status = 'assigned';
      report.assignedTo = volunteer._id;
      report.startedAt = new Date();
      await report.save();

      if (io) {
        io.emit('reportUpdated', {
          reportId: report._id,
          status: 'assigned',
          volunteerName: volunteer.name
        });
        io.emit('statsUpdated');
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
