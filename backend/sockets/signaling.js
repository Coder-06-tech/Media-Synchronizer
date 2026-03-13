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
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user_joined', { userId: socket.id });
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', {
      offer: data.offer,
      senderId: socket.id
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', {
      answer: data.answer,
      senderId: socket.id
    });
  });

  socket.on('ice_candidate', (data) => {
    socket.to(data.roomId).emit('ice_candidate', {
      candidate: data.candidate,
      senderId: socket.id
    });
  });
};

module.exports = setupSignalingSockets;
