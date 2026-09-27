import {
  createRoom,
  getRooms,
  getRoomDetails,
  getRoomByCode,
  joinRoom,
  leaveRoom,
  startGame
} from "../controllers/roomController.js";

import { Router } from "express";

const router = Router();

router.post("/rooms", createRoom);

router.get("/rooms", getRooms);

router.get("/rooms/code/:roomCode", getRoomByCode);

router.get("/rooms/:roomId", getRoomDetails);

router.post("/rooms/:roomId/join", joinRoom);

router.post("/rooms/:roomId/leave", leaveRoom);

router.post("/rooms/:roomId/start", startGame);

export default router;