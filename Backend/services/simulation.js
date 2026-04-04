// Simulation logic moved to server.js for strict engine control.
// This file is now a no-op to prevent duplicate assignment engines.

function startSimulation() {
  console.log('Legacy simulation disabled. Main engine running in server.js');
}

module.exports = { startSimulation };
