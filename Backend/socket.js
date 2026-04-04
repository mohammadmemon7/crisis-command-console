let io;
const init = (httpServer) => {
  const { Server } = require('socket.io');

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://crisis-command-console-production.up.railway.app',
    'http://localhost:8081',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000'
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    },
    transports: ["websocket", "polling"]
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('registerVolunteer', async (volunteerId) => {
      const Volunteer = require('./models/Volunteer');
      await Volunteer.findByIdAndUpdate(volunteerId, { socketId: socket.id });
      console.log(`Volunteer ${volunteerId} registered with socket ${socket.id}`);
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      const Volunteer = require('./models/Volunteer');
      await Volunteer.findOneAndUpdate({ socketId: socket.id }, { socketId: null });
    });
  });
  return io;
};
const getIO = () => io;
module.exports = { init, getIO };
