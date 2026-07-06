/**
 * socket.js — Singleton Socket.IO client
 * Provides getSocket() and disconnectSocket() for use across the app.
 *
 * FIX: Previously getSocket() created a NEW socket whenever socket.connected
 * was false (e.g. during a brief reconnection window). A new socket means a
 * new socket.id, which the backend registers as a completely separate player —
 * causing duplicate entries in the player list.
 *
 * Now we always return the SAME socket instance once created, and simply call
 * socket.connect() if it has dropped. A new instance is only created if the
 * socket was deliberately destroyed via disconnectSocket().
 */
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  // Reuse the existing instance even if it's temporarily disconnected.
  // Calling connect() will resume on the same socket.id so the backend
  // doesn't see a new player.
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
