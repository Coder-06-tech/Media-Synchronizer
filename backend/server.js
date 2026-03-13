require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const roomRoutes = require('./routes/rooms');
const eventRoutes = require('./routes/events');
const notificationRoutes = require('./routes/notifications');

const setupSignalingSockets = require('./sockets/signaling');
const setupVideoSyncSockets = require('./sockets/videoSync');
const setupBroadcastEngine = require('./sockets/broadcastEngine');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5174').split(',');

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Setup Redis Adapter if REDIS_URL exists
if (process.env.REDIS_URL) {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('[SYSTEM] Redis Adapter scales connected.');
    }).catch(err => {
        console.error('[SYSTEM] Redis Adapter failed:', err);
    });
}

// App level socket io instance
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);

// Socket connections
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Custom sockets logic modularized
  setupSignalingSockets(io, socket);
  setupVideoSyncSockets(io, socket);
  setupBroadcastEngine(io, socket);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cerebro-code-red')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
