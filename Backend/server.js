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

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
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

app.use(require('./routes/reports'));
app.use(require('./routes/sms'));
app.use(require('./routes/volunteers'));
app.use(require('./routes/test'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log('CrisisNet backend running on port', PORT));
