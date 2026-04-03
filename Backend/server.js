require('dotenv').config();


const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const mongoose = require('mongoose');
const socketManager = require('./socket');


const app = express();
app.use(express.json());

// (optional but good)
app.use(express.urlencoded({ extended: true }));
app.use(require('./routes/reports'));
app.use(require('./routes/sms'));
app.use(require('./routes/volunteers'));
app.use(require('./routes/test'));
const server = http.createServer(app);
socketManager.init(server);

app.use(compression());
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'https://crisis-command-console-production.up.railway.app'
  ].filter(Boolean),
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
}
app.use(cors(corsOptions))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => { console.error('MongoDB error:', err); process.exit(1); });

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.use('/api', require('./routes/reports'));
app.use('/api', require('./routes/sms'));
app.use('/api', require('./routes/volunteers'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log('CrisisNet backend running on port', PORT));

