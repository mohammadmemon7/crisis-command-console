let io;
const init = (httpServer) => {
  const { Server } = require('socket.io');
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000',
        'https://crisis-command-console-production.up.railway.app'
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: false
    }
  });
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => 
      console.log('Client disconnected:', socket.id)
    );
  });
  return io;
};
const getIO = () => io;
module.exports = { init, getIO };
