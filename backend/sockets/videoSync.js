const setupVideoSyncSockets = (io, socket) => {
  
  // sync_request / sync_response are handled here because they need direct socket targeting
  socket.on('sync_request', (data) => {
    // A listener requests sync from the broadcaster in the room
    socket.to(data.roomId).emit('sync_request', { senderId: socket.id });
  });

  socket.on('sync_response', (data) => {
    // Broadcaster responds to a specific requester with full state
    io.to(data.requesterId).emit('sync_response', { 
      timestamp: data.timestamp, 
      playingState: data.playingState,
      videoUrl: data.videoUrl 
    });
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

  // Chat Functionality
  socket.on('send_message', (data) => {
    // data: { roomId, message, user }
    io.in(data.roomId).emit('receive_message', { 
        id: Math.random().toString(36).substr(2, 9),
        text: data.message, 
        sender: data.user,
        timestamp: new Date().toISOString()
    });
  });
};

module.exports = setupVideoSyncSockets;
