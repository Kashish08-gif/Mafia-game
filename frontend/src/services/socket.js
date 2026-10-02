/**
 * socket.js — Singleton Socket.IO client
 * Provides getSocket(), disconnectSocket(), and default socket proxy object.
 */
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  const token = localStorage.getItem('token');

  socket = io('http://localhost:5000', {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Manually disconnected & cleared.');
  }
}

// Proxy object for default import (`import socket from '../services/socket.js'`)
const socketProxy = {
  emit: (...args) => getSocket().emit(...args),
  on: (...args) => getSocket().on(...args),
  off: (...args) => getSocket().off(...args),
  getSocket,
  disconnectSocket,
};

export default socketProxy;
