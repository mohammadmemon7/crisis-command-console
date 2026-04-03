const Report = require('../models/Report');
const { getIO } = require('../socket');

const DEMO_NAMES = ['Rahul', 'Amit', 'Priya', 'Sneha', 'Arjun', 'Neha'];

/**
 * Single source of truth for new reports: demo name + random priority (1–5).
 */
async function createReport(data) {
  const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
  const priority = Math.floor(Math.random() * 5) + 1;

  const report = new Report({
    name,
    rawMessage: data.rawMessage,
    location: data.location || 'Incident',
    coordinates: data.coordinates,
    urgency: priority,
    priority,
    peopleCount: data.peopleCount != null ? data.peopleCount : 1,
    needs: data.needs && data.needs.length ? data.needs : ['rescue'],
    source: data.source || 'app',
    status: 'pending'
  });

  const saved = await report.save();
  getIO().emit('newReport', saved);
  return saved;
}

module.exports = { createReport, DEMO_NAMES };
