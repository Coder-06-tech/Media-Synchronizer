const { createClient } = require('redis');

// Broadcast Engine: Manages stateless room sessions and real-time syncing
const sessions = new Map(); // Fallback for local dev if Redis is unavailable

const setupBroadcastEngine = async (io, socket) => {
    let redisClient = null;
    
    // Attempt Redis connection for scaling
    if (process.env.REDIS_URL) {
        try {
            redisClient = createClient({ url: process.env.REDIS_URL });
            await redisClient.connect();
        } catch (e) {
            console.warn("[BROADCAST] Redis connection failed, falling back to local memory.");
        }
    }

    const getSession = async (roomId) => {
        if (redisClient) {
            const data = await redisClient.get(`session:${roomId}`);
            return data ? JSON.parse(data) : null;
        }
        return sessions.get(roomId);
    };

    const updateSession = async (roomId, data) => {
        const current = await getSession(roomId) || {};
        const updated = { ...current, ...data };
        if (redisClient) {
            await redisClient.set(`session:${roomId}`, JSON.stringify(updated), { EX: 86400 });
        } else {
            sessions.set(roomId, updated);
        }
        return updated;
    };

    // --- WebSocket Listeners ---

    socket.on('join_room', async (data) => {
        // Support both object { roomId, ... } and plain string formats
        const roomId = typeof data === 'object' ? data.roomId : data;
        const isBroadcaster = typeof data === 'object' ? data.isBroadcaster : false;
        const userId = typeof data === 'object' ? data.userId : null;

        socket.join(roomId);
        
        // Return current state to NEW joining client (Initial Sync)
        const state = await getSession(roomId);
        
        if (isBroadcaster && userId) {
            await updateSession(roomId, { broadcasterId: userId });
        }

        if (state) {
            socket.emit('sync_state', {
                videoUrl: state.videoUrl,
                timestamp: state.timestamp,
                isPlaying: state.isPlaying,
                viewers: io.sockets.adapter.rooms.get(roomId)?.size || 0
            });
        }

        // Broadcast updated viewer count
        io.to(roomId).emit('viewer_count', { 
            count: io.sockets.adapter.rooms.get(roomId)?.size || 0 
        });
    });

    socket.on('play_video', async (data) => {
        const { roomId, timestamp, url } = data;
        await updateSession(roomId, { isPlaying: true, timestamp, videoUrl: url });
        socket.to(roomId).emit('play_video', { timestamp, url });
    });

    socket.on('pause_video', async (data) => {
        const { roomId, timestamp } = data;
        await updateSession(roomId, { isPlaying: false, timestamp });
        socket.to(roomId).emit('pause_video', { timestamp });
    });

    socket.on('seek_video', async (data) => {
        const { roomId, timestamp } = data;
        await updateSession(roomId, { timestamp });
        socket.to(roomId).emit('seek_video', { timestamp });
    });

    // 3-SECOND SYNC HEARTBEAT (Pulse)
    // In a production environment with many rooms, this heartbeat 
    // is usually managed by a separate worker or only for active hosts.
    socket.on('sync_pulse', async (data) => {
        const { roomId, timestamp, userId } = data;
        // Only trust the host to pulse (broadcaster check)
        const session = await getSession(roomId);
        if (session && session.broadcasterId === userId) {
            await updateSession(roomId, { timestamp });
            socket.to(roomId).emit('sync_time', { serverTime: timestamp });
        }
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(roomId => {
            const count = (io.sockets.adapter.rooms.get(roomId)?.size || 0) - 1;
            socket.to(roomId).emit('viewer_count', { count: Math.max(0, count) });
        });
    });
};

module.exports = setupBroadcastEngine;
