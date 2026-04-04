require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const mongoose = require('mongoose');
const socketManager = require('./socket');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://crisis-command-console-production.up.railway.app',
  'http://localhost:8081',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

console.log('=== CORS Allowed Origins Configuration ===');
console.log(allowedOrigins);
console.log('Also allowing Vercel preview domains via regex: /\\.vercel\\.app$/');
console.log('==========================================');

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow non-browser clients (Postman, etc)
    if (allowedOrigins.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 7) Ensure CORS middleware is mounted BEFORE routes.
app.use(cors());
// 5) Handle preflight globally
app.options("*", cors());

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const server = http.createServer(app);
const io = socketManager.init(server);

const { router: smsRouter, setIo } = require('./routes/sms');
setIo(io);

const Report = require('./models/Report');
const Volunteer = require('./models/Volunteer');
const Stats = require('./models/Stats');

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // require('./services/simulation').startSimulation(); // Disabled in favor of strict engines below

    // Helper to emit stats
    const emitStats = async () => {
      try {
        const statsObj = await Stats.findOne();
        const active = await Report.countDocuments({ status: 'assigned' });
        const volunteersDeployed = await Volunteer.countDocuments({ status: 'busy' });
        
        // Match logic in stats.js
        const reports = await Report.find({ assignedAt: { $ne: null } });
        let totalTime = 0;
        reports.forEach(r => {
          if (r.assignedAt && r.createdAt) {
            totalTime += (new Date(r.assignedAt).getTime() - new Date(r.createdAt).getTime());
          }
        });
        const avgMinutes = reports.length > 0 ? (totalTime / reports.length / 1000 / 60) : 0;
        
        const data = {
          active,
          resolved: statsObj ? statsObj.totalResolved : 0,
          volunteersDeployed,
          avgResponseTime: avgMinutes.toFixed(2)
        };
        
        const socketIo = socketManager.getIO();
        if (socketIo) {
          socketIo.emit('statsUpdated', data);
        }
      } catch (err) {
        console.error("Error emitting stats:", err);
      }
    };

    // 🔥 STEP 2: STRICT ASSIGNMENT ENGINE (NEAREST ONLY)
    setInterval(async () => {
      try {
        // Proactive Cleanup: Ensure all free volunteers with no task are actually available
        await Volunteer.updateMany(
          { status: "free", currentTask: null, isAvailable: false },
          { isAvailable: true }
        );

        const reports = await Report.find({ status: { $in: ["pending", "sms_pending"] }, mode: "chaos" });
        const freeVolunteers = await Volunteer.find({ status: "free", isAvailable: true });

        if (reports.length > 0 && freeVolunteers.length > 0) {
          console.log(`[Assignment Engine] Processing ${reports.length} chaos reports with ${freeVolunteers.length} free volunteers: ${freeVolunteers.map(v => v.name).join(', ')}`);
        }

        for (let report of reports) {
          // Double-check report is still unassigned in DB
          const freshReport = await Report.findById(report._id);
          if (!freshReport || freshReport.assignedTo) continue;

          if (freeVolunteers.length === 0) break;

          let nearest = null;
          let minDist = Infinity;
          let nearestIdx = -1;

          // Try to find a suitable volunteer first (skill match)
          const needs = freshReport.needs || [];
          let candidates = freeVolunteers;
          
          if (needs.length > 0) {
            const skillMatched = freeVolunteers.filter(v => 
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
            if (!freshReport.coordinates || freshReport.coordinates.lat == null || freshReport.coordinates.lng == null) continue;

            const dist = getDistance(
              freshReport.coordinates.lat,
              freshReport.coordinates.lng,
              vlat,
              vlng
            );

            if (dist < minDist) {
              minDist = dist;
              nearest = vol;
              nearestIdx = freeVolunteers.indexOf(vol);
            }
          }

          if (nearest) {
            // ATOMIC UPDATE: Only assign if report is still pending
            const updateResult = await Report.findOneAndUpdate(
              { _id: freshReport._id, assignedTo: null },
              { 
                status: "assigned",
                assignedTo: nearest._id,
                startedAt: new Date(),
                assignedAt: new Date()
              },
              { new: true }
            );

            if (!updateResult) {
              console.log(`[Assignment Engine] Report ${freshReport._id} was already assigned, skipping.`);
              continue;
            }

            console.log(`[Assignment Engine] Nearest found: ${nearest.name} at distance ${minDist.toFixed(2)}km`);
            
            nearest.status = "busy";
            nearest.isAvailable = false;
            nearest.currentTask = freshReport._id;
            nearest.activeCase = freshReport._id;

            await nearest.save();
            console.log(`[Assignment Engine] Assigned ${freshReport._id} to ${nearest.name}`);
            
            // Remove assigned volunteer from local list for this tick
            if (nearestIdx !== -1) {
              freeVolunteers.splice(nearestIdx, 1);
            }

            const socketIo = socketManager.getIO();
            const updatedVolunteer = await Volunteer.findById(nearest._id);
            if (socketIo) {
              socketIo.emit('caseAccepted', {
                reportId: freshReport._id,
                volunteerName: nearest.name,
                eta: '5'
              });
              socketIo.emit('volunteerUpdated', updatedVolunteer);
              emitStats();
            }
          }
        }
      } catch (err) {
        console.error("Assignment Engine Error:", err);
      }
    }, 2000);

    // 🔥 STEP 3: MOVEMENT ENGINE (CRITICAL FIX - BUSY ONLY)
    setInterval(async () => {
      try {
        const busyVolunteers = await Volunteer.find({ status: "busy" }).populate("currentTask");
        let movedCount = 0;

        for (let vol of busyVolunteers) {
          const report = vol.currentTask;
          
          // Cleanup: If volunteer is busy but has no task or task is not assigned, free them
          if (!report || report.status !== 'assigned') {
            console.log(`[Movement Engine] Freeing volunteer ${vol.name} because task is missing or not assigned.`);
            vol.status = "free";
            vol.currentTask = null;
            vol.activeCase = null;
            vol.isAvailable = true;
            await vol.save();
            
            const socketIo = socketManager.getIO();
            if (socketIo) {
              socketIo.emit('volunteerUpdated', vol);
              emitStats();
            }
            continue;
          }

          const vlat = vol.coordinates?.lat ?? vol.location?.lat;
          const vlng = vol.coordinates?.lng ?? vol.location?.lng;
          const rlat = report.coordinates?.lat;
          const rlng = report.coordinates?.lng;

          if (vlat == null || vlng == null || rlat == null || rlng == null) continue;

          // Move 15% closer toward victim each tick (2s)
          const newLat = vlat + (rlat - vlat) * 0.15;
          const newLng = vlng + (rlng - vlng) * 0.15;

          vol.coordinates = { lat: newLat, lng: newLng };
          await vol.save();
          movedCount++;
          
          const socketIo = socketManager.getIO();
          if (socketIo) {
            socketIo.emit('volunteerUpdated', vol);
          }
        }

        if (movedCount > 0 && io) {
          io.emit('simulationTick', { type: 'movement' });
        }
      } catch (err) {
        console.error("Movement Engine Error:", err);
      }
    }, 2000);

    // 🔥 STEP 4: STRICT 30-SECOND RULE (NO EXCEPTION)
    setInterval(async () => {
      try {
        const reports = await Report.find({ status: "assigned" });

        for (let report of reports) {
          const now = new Date();
          const started = new Date(report.startedAt);
          const seconds = (now - started) / 1000;

          if (seconds >= 30) {
            const vol = await Volunteer.findById(report.assignedTo);

            // Update global stats
            let stats = await Stats.findOne();
            if (!stats) stats = await Stats.create({});
            stats.totalResolved += 1;
            stats.totalResponseTime += seconds;
            await stats.save();

            if (vol) {
              vol.status = "free";
              vol.currentTask = null;
              vol.isAvailable = true;
              await vol.save();
              
              const socketIo = socketManager.getIO();
              if (socketIo) {
                socketIo.emit('volunteerUpdated', vol);
              }
            }

            await Report.findByIdAndDelete(report._id);
            console.log(`Resolved and deleted report ${report._id}, freed volunteer ${vol ? vol.name : 'unknown'}`);
            emitStats();
            
            const socketIo = socketManager.getIO();
            if (socketIo) {
              socketIo.emit('reportDeleted', { reportId: report._id });
            }
          }
        }
      } catch (err) {
        console.error("Resolution Engine Error:", err);
      }
    }, 2000);
  })
  .catch((err) => { console.error('MongoDB error:', err); process.exit(1); });

// 10) Add a /health route if missing
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1
               ? 'connected' : 'disconnected',
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
      gemini: !!process.env.GEMINI_API_KEY,
      opencage: !!process.env.OPENCAGE_API_KEY
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.get("/test", (req, res) => {
  res.send("Server working");
});

app.get("/check", (req, res) => {
  res.send("CHECK OK");
});

// 🔥 MOUNT VOLUNTEER ROUTES
const volunteerRoutes = require('./routes/volunteer');
app.use('/api/volunteer', volunteerRoutes);

app.use('/api/reports', require('./routes/reports'));
app.use(require('./routes/stats'));
app.use('/api', smsRouter);
app.use(require('./routes/volunteers'));
app.use(require('./routes/test'));

console.log("=== SERVER FILE LOADED AND RUNNING ===");
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log('CrisisNet backend running on port', PORT));
