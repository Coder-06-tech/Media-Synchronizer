const User = require('../models/User');

const setupSignalingSockets = (io, socket) => {
  // Join a personal notification room
  socket.on('setup', (userData) => {
    if (userData && userData._id) {
      socket.join(`user_${userData._id}`);
      socket.emit('connected');
    }
  });

  // WebRTC Signaling
  socket.on('join_room', (data) => {
    // Support both object { roomId, ... } and plain string formats
    const roomId = typeof data === 'object' ? data.roomId : data;
    socket.join(roomId);
    socket.to(roomId).emit('user_joined', { userId: socket.id });
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('offer', (data) => {
    const target = data.receiverId || data.roomId;
    io.to(target).emit('offer', {
      offer: data.offer,
      senderId: socket.id
    });
  });

  socket.on('answer', (data) => {
    const target = data.receiverId || data.roomId;
    io.to(target).emit('answer', {
      answer: data.answer,
      senderId: socket.id
    });
  });

  socket.on('ice_candidate', (data) => {
    const target = data.receiverId || data.roomId;
    io.to(target).emit('ice_candidate', {
      candidate: data.candidate,
      senderId: socket.id
    });
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach(roomId => {
        socket.to(roomId).emit('user_left', { userId: socket.id });
    });
  });
};

module.exports = setupSignalingSockets;
