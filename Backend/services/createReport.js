const Report = require('../models/Report');

const demoNames = ["Rahul", "Amit", "Priya", "Sneha", "Arjun", "Neha"];

const createReport = async (data) => {
  const report = new Report({
    name: demoNames[Math.floor(Math.random() * demoNames.length)],
    rawMessage: data.rawMessage,
    coordinates: data.coordinates,
    priority: Math.floor(Math.random() * 5) + 1, // 1–5 RANDOM
    status: "pending",
    createdAt: new Date()
  });

  return await report.save();
};

module.exports = { createReport };
