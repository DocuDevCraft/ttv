import { Server } from 'socket.io';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    socket.emit('log', { message: 'Connected to debug console', type: 'info', timestamp: new Date() });
  });
}

export function emitLog(message, type = 'info') {
  if (io) {
    io.emit('log', { message, type, timestamp: new Date() });
  }
}

export function emitProgress(data) {
    if (io) {
        io.emit('progress', data);
    }
}
