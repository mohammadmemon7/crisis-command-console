const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const ResolutionLog = require('../models/ResolutionLog');
const { getIO } = require('../socket');

const TASK_SECONDS = 30;

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
      vol.location.lat += (tlat - vol.location.lat) * 0.15;
      vol.location.lng += (tlng - vol.location.lng) * 0.15;
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
    const now = Date.now();

    for (const report of reports) {
      const vol = report.assignedTo;
      if (!vol) continue;

      const started = report.startedAt
        ? new Date(report.startedAt).getTime()
        : new Date(report.createdAt).getTime();
      const diffSec = (now - started) / 1000;

      if (diffSec < TASK_SECONDS) continue;

      const mins = (now - new Date(report.createdAt).getTime()) / 60000;
      await ResolutionLog.create({ responseTimeMinutes: mins });

      const vdoc = await Volunteer.findById(vol._id);
      if (vdoc) {
        vdoc.isAvailable = true;
        vdoc.status = 'free';
        vdoc.activeCase = null;
        vdoc.totalResolved = (vdoc.totalResolved || 0) + 1;
        if (vdoc.homeLocation != null && vdoc.homeLocation.lat != null && vdoc.homeLocation.lng != null) {
          vdoc.location.lat = vdoc.homeLocation.lat;
          vdoc.location.lng = vdoc.homeLocation.lng;
        }
        await vdoc.save();
      }

      const rid = report._id;
      await Report.findByIdAndDelete(rid);

      if (io) {
        io.emit('reportDeleted', { reportId: rid });
        io.emit('statsUpdated');
      }
    }
  } catch (e) {
    console.error('simulation resolveTick:', e.message);
  }
}

async function simulationStep() {
  await movementTick();
  await resolveTick();
}

function startSimulation() {
  setInterval(simulationStep, 2000);
  console.log('Crisis simulation: movement + 30s task completion (tick 2s)');
}

module.exports = { startSimulation };
