require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const reportRoutes = require('./routes/report');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/disaster_system';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api', reportRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Disaster Reporting System Backend');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
