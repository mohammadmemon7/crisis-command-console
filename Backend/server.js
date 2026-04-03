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
app.use(cors(corsOptions));
// 5) Handle preflight globally
app.options("*", cors(corsOptions));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
socketManager.init(server);

const Report = require('./models/Report');
const Volunteer = require('./models/Volunteer');
const Stats = require('./models/Stats');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // require('./services/simulation').startSimulation(); // Disabled in favor of strict engines below

    // 🔥 STEP 3: ASSIGNMENT ENGINE (RUN EVERY 2s)
    setInterval(async () => {
      try {
        const pendingReports = await Report.find({ status: "pending" });
        const freeVolunteers = await Volunteer.find({ status: "free" });

        for (let report of pendingReports) {
          if (freeVolunteers.length === 0) break;

          const volunteer = freeVolunteers.shift();

          report.status = "assigned";
          report.assignedTo = volunteer._id;
          report.startedAt = new Date();

          volunteer.status = "busy";
          volunteer.currentTask = report._id;

          await report.save();
          await volunteer.save();
          console.log(`Assigned report ${report._id} to volunteer ${volunteer.name}`);
        }
      } catch (err) {
        console.error("Assignment Engine Error:", err);
      }
    }, 2000);

    // 🔥 STEP 4: 30-SECOND RESOLUTION ENGINE (CRITICAL FIX)
    setInterval(async () => {
      try {
        const reports = await Report.find({ status: "assigned" }).populate("assignedTo");

        for (let report of reports) {
          const now = new Date();
          const started = new Date(report.startedAt);
          const seconds = (now - started) / 1000;

          if (seconds >= 30) {
            const volunteer = report.assignedTo;

            // Update stats
            let stats = await Stats.findOne();
            if (!stats) stats = await Stats.create({});
            stats.totalResolved += 1;
            stats.totalResponseTime += seconds;
            await stats.save();

            // Free volunteer
            if (volunteer) {
              volunteer.status = "free";
              volunteer.currentTask = null;
              await volunteer.save();
            }

            // Delete report
            await Report.findByIdAndDelete(report._id);
            console.log(`Resolved and deleted report ${report._id}, freed volunteer ${volunteer ? volunteer.name : 'unknown'}`);
          }
        }
      } catch (err) {
        console.error("Resolution Engine Error:", err);
      }
    }, 2000);

    // 🔥 STEP 5: VOLUNTEER MOVEMENT ENGINE
    setInterval(async () => {
      try {
        const reports = await Report.find({ status: "assigned" }).populate("assignedTo");

        for (let report of reports) {
          const vol = report.assignedTo;
          if (!vol || !vol.coordinates || !report.coordinates) continue;

          // Move 10% closer every tick
          const newLat = vol.coordinates.lat + (report.coordinates.lat - vol.coordinates.lat) * 0.1;
          const newLng = vol.coordinates.lng + (report.coordinates.lng - vol.coordinates.lng) * 0.1;

          vol.coordinates = { lat: newLat, lng: newLng };
          await vol.save();
        }
      } catch (err) {
        console.error("Movement Engine Error:", err);
      }
    }, 2000);
  })
  .catch((err) => { console.error('MongoDB error:', err); process.exit(1); });

// 10) Add a /health route if missing
app.get('/health', (req, res) => {
  res.json({ ok: true, service: "crisis-command-console-backend" });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.use('/api/reports', require('./routes/reports'));
app.use(require('./routes/stats'));
app.use(require('./routes/sms'));
app.use(require('./routes/volunteers'));
app.use(require('./routes/test'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log('CrisisNet backend running on port', PORT));
