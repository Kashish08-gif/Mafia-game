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

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.join(path.resolve(), "uploads"))
);

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "Mafia Game API Server OK",
  });
});

// Public Routes
app.use("/api/auth", authRoutes);
app.use("/api/invite", inviteRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// Protected Routes (Auth Required)
app.use("/api/friends", authMiddleware, friendRoutes);
app.use("/api/room", authMiddleware, roomRoutes);
app.use("/api/user", authMiddleware, userRoutes);
app.use("/api/game", authMiddleware, gameRoutes);

const server = http.createServer(app);
initializeSocket(server);

const port = process.env.PORT || 5000;

dbConnect()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server is listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(`Error connecting to Database: ${error}`);
  });
