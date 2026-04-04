const Report = require('../models/Report');

const demoNames = ['Rahul', 'Amit', 'Priya', 'Sneha', 'Arjun', 'Neha'];

const createReport = async (data) => {
  const report = new Report({
    name: data.name || demoNames[Math.floor(Math.random() * demoNames.length)],
    rawMessage: data.rawMessage,
    location: data.location || '',
    coordinates: data.coordinates,
    priority: data.priority != null ? data.priority : Math.floor(Math.random() * 5) + 1,
    peopleCount: data.peopleCount || 1,
    needs: data.needs && data.needs.length ? data.needs : ['rescue'],
    source: data.source || 'app',
    senderPhone: data.senderPhone || null,
    status: 'pending',
    urgency: data.priority != null ? data.priority : (data.urgency != null ? data.urgency : 3)
  });

  return await report.save();
};

module.exports = { createReport };
