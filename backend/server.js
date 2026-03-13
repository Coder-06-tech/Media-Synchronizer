require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const roomRoutes = require('./routes/rooms');
const eventRoutes = require('./routes/events');

const setupSignalingSockets = require('./sockets/signaling');
const setupVideoSyncSockets = require('./sockets/videoSync');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5174').split(',');

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// App level socket io instance
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/events', eventRoutes);

// Socket connections
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Custom sockets logic modularized
  setupSignalingSockets(io, socket);
  setupVideoSyncSockets(io, socket);

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
