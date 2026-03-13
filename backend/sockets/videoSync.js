const setupVideoSyncSockets = (io, socket) => {
  
  socket.on('play_video', (data) => {
    // Only broadcaster should emit this ideally
    socket.to(data.roomId).emit('play_video', { timestamp: data.timestamp });
  });

  socket.on('pause_video', (data) => {
    socket.to(data.roomId).emit('pause_video', { timestamp: data.timestamp });
  });

  socket.on('seek_video', (data) => {
    socket.to(data.roomId).emit('seek_video', { timestamp: data.timestamp });
  });

  socket.on('sync_request', (data) => {
    // A listener request sync from the room
    socket.to(data.roomId).emit('sync_request', { senderId: socket.id });
  });

  socket.on('sync_response', (data) => {
    // Broadcaster responds with current time
    io.to(data.requesterId).emit('sync_response', { timestamp: data.timestamp, playingState: data.playingState });
  });

  // Heartbeat ping/pong for connection health
  socket.on('ping_health', (data) => {
    socket.to(data.roomId).emit('ping_health', { 
        senderId: socket.id, 
        timestamp: Date.now() 
    });
  });

  socket.on('pong_health', (data) => {
    io.to(data.requesterId).emit('pong_health', { 
        timestamp: data.timestamp,
        responderId: socket.id
    });
  });
};

module.exports = setupVideoSyncSockets;
