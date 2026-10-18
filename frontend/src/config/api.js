/**
 * Centralized API & Server Configuration
 * Automatically handles development vs production environment variables.
 */

const getCleanUrl = (url) => (url ? url.trim().replace(/\/+$/, "") : "");

// 1. Raw environment variables
const envBackend = getCleanUrl(import.meta.env.VITE_BACKEND_URL);
const envApiBase = getCleanUrl(import.meta.env.VITE_API_BASE_URL);
const envSocket = getCleanUrl(import.meta.env.VITE_SOCKET_URL);

// 2. Resolved Backend URL (e.g. "https://mafia-backend.onrender.com" or "http://localhost:5000")
export const BACKEND_URL =
  envBackend ||
  (import.meta.env.PROD ? "" : "http://localhost:5000");

// 3. Resolved API Base URL (e.g. "https://mafia-backend.onrender.com/api" or "/api")
export const API_BASE_URL =
  envApiBase ||
  (BACKEND_URL ? `${BACKEND_URL}/api` : "/api");

// 4. Resolved Socket.IO Server URL
export const SOCKET_URL =
  envSocket ||
  BACKEND_URL ||
  (typeof window !== "undefined" && window.location.origin ? window.location.origin : "http://localhost:5000");

export default {
  BACKEND_URL,
  API_BASE_URL,
  SOCKET_URL,
};
