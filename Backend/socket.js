let io;
const init = (httpServer) => {
  const { Server } = require('socket.io');
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
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
