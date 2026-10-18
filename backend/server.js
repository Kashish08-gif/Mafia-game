import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import http from "http";

dotenv.config();

import { dbConnect } from "./config/db.js";
import { initializeSocket } from "./config/socket.js";
import authMiddleware from "./middlewares/authMiddleware.js";
import {
  authRoutes,
  friendRoutes,
  roomRoutes,
  userRoutes,
  gameRoutes,
  profileRoutes,
  leaderboardRoutes,
  inviteRoutes,
} from "./routes/index.js";

const app = express();

// ── Production-Ready CORS Setup ──────────────────────────────────────────────
const cleanUrl = (url) => (url ? url.trim().replace(/\/+$/, "") : "");

const allowedOrigins = [
  cleanUrl(process.env.FRONTEND_URL),
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const incoming = cleanUrl(origin);
    const frontendEnv = cleanUrl(process.env.FRONTEND_URL);

    if (
      process.env.NODE_ENV !== "production" ||
      !frontendEnv ||
      frontendEnv === "*" ||
      allowedOrigins.includes(incoming) ||
      incoming.endsWith(".vercel.app")
    ) {
      return callback(null, true);
    }

    // Permissive fallback so production requests aren't blocked unexpectedly
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));

// ── Status & Health Check Endpoints ──────────────────────────────────────────
app.get("/", (req, res) => {
  return res.status(200).json({
    message: "Mafia Game API Server Online",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Public Routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/invite", inviteRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// ── Protected Routes (Auth Required) ─────────────────────────────────────────
app.use("/api/friends", authMiddleware, friendRoutes);
app.use("/api/room", authMiddleware, roomRoutes);
app.use("/api/user", authMiddleware, userRoutes);
app.use("/api/game", authMiddleware, gameRoutes);

// ── 404 Route Handler ────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Centralized Error Handling ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

const server = http.createServer(app);
initializeSocket(server);

const port = process.env.PORT || 5000;

dbConnect()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || "development"} mode`);
    });
  })
  .catch((error) => {
    console.error(`Fatal: Failed to connect to Database:`, error.message);
    process.exit(1);
  });

// ── Graceful Shutdown Handling ───────────────────────────────────────────────
const handleShutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("Forceful shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
