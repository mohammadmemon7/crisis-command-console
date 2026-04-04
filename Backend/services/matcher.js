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

/**
 * @param {import('mongoose').Document} report
 * @param {{ smsPending?: boolean, excludeVolunteerId?: import('mongoose').Types.ObjectId | string, _timeoutRetry?: boolean }} [options]
 * @returns {Promise<{ volunteer: import('mongoose').Document, distance: number } | null>}
 */
async function findAndAssignVolunteer(report, options = {}) {
  try {
    if (report.mode === 'manual') return null; // NEVER auto-assign manual reports
    if (!report.coordinates?.lat || report.coordinates.lng == null) return null;

    let volunteers = await Volunteer.find({ status: 'free', isAvailable: true });
    if (options.excludeVolunteerId) {
      const ex = String(options.excludeVolunteerId);
      volunteers = volunteers.filter((v) => String(v._id) !== ex);
    }
    if (volunteers.length === 0) return null;

    const needs = report.needs && report.needs.length ? report.needs : ['rescue'];

    let candidates = volunteers.filter(vol =>
      vol.coordinates?.lat != null && vol.coordinates?.lng != null
    );

    if (candidates.length === 0) return null;

    const withSkill = candidates.filter(vol =>
      vol.skills && vol.skills.length && vol.skills.some(skill => needs.includes(skill))
    );

    if (withSkill.length > 0) candidates = withSkill;

    candidates.forEach((volunteer) => {
      volunteer.distance = haversine(
        report.coordinates.lat,
        report.coordinates.lng,
        volunteer.coordinates.lat,
        volunteer.coordinates.lng
      );
    });

    candidates.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

    const nearest = candidates[0];
    if (!nearest || nearest.distance === Infinity) return null;

    const volDoc = await Volunteer.findById(nearest._id);
    if (!volDoc) return null;

    const distanceKm = nearest.distance;

    // CHANGE 2: Hold assignment in DB before caller sends SMS (prevents double assignment)
    volDoc.isAvailable = false;
    volDoc.status = 'busy';
    volDoc.currentTask = report._id;
    volDoc.activeCase = report._id;
    await volDoc.save();

    const nextStatus = options.smsPending ? 'sms_pending' : 'assigned';

    await Report.findByIdAndUpdate(report._id, {
      status: nextStatus,
      assignedTo: nearest._id,
      startedAt: nextStatus === 'assigned' ? new Date() : null
    });

    // CHANGE 3: in-memory only for sms.js message text
    volDoc.distanceToCase = distanceKm;

    // CHANGE 1: return { volunteer, distance }
    const result = {
      volunteer: volDoc,
      distance: distanceKm
    };

    // CHANGE 4: 5 min timeout for sms_pending (one retry chain; no nested timeout on retry)
    if (options.smsPending && !options._timeoutRetry) {
      const volId = volDoc._id;
      const reportId = report._id;

      setTimeout(async () => {
        try {
          const freshReport = await Report.findById(reportId);
          if (freshReport && freshReport.status === 'sms_pending') {
            console.log('Volunteer timeout — trying next volunteer');
            freshReport.status = 'pending';
            freshReport.assignedTo = null;
            await freshReport.save();

            await Volunteer.findByIdAndUpdate(volId, {
              isAvailable: true,
              status: 'free',
              activeCase: null,
              currentTask: null
            });

            await findAndAssignVolunteer(freshReport, {
              smsPending: true,
              _timeoutRetry: true
            });
          }
        } catch (e) {
          console.error('SMS pending timeout handler:', e.message);
        }
      }, 5 * 60 * 1000);
    }

    return result;
  } catch (error) {
    console.error('Matcher error:', error.message);
    return null;
  }
}

module.exports = { findAndAssignVolunteer };
