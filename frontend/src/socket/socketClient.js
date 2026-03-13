import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
});

export const requestSync = (roomId) => {
    socket.emit('sync_request', { roomId });
};

export const pingHealth = (roomId) => {
    socket.emit('ping_health', { roomId });
};
