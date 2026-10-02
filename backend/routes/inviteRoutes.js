import express from "express";
import crypto from "crypto";
import Invite from "../models/invite.js";
import { User } from "../models/user.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// ── 1. Create a new invitation token ─────────────────────────────────────────
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const senderId = req.user._id || req.user.id;
    const { roomId } = req.body || {};

    const token = crypto.randomBytes(32).toString("hex");

    const invite = await Invite.create({
      sender: senderId,
      token: token,
      roomId: roomId || null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), 
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${frontendBaseUrl}/invite/${invite.token}`;

    res.status(201).json({
      success: true,
      inviteLink,
      token: invite.token,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error("Error creating invite:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create invitation",
      error: error.message,
    });
  }
});

// ── 2. Get invitation details (Public endpoint for preview / InvitePage) ──────
router.get("/details/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await Invite.findOne({ token })
      .populate("sender", "username avatar trophies totalGamesWon totalGamesPlayed")
      .populate("roomId", "roomName map totalPlayers contractMode roomCode");

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invitation link is invalid or does not exist.",
      });
    }

    const isExpired = new Date() > new Date(invite.expiresAt);

    return res.status(200).json({
      success: true,
      invite: {
        token: invite.token,
        sender: invite.sender,
        room: invite.roomId,
        isUsed: invite.isUsed,
        isExpired: isExpired,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error fetching invite details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve invitation details",
      error: error.message,
    });
  }
});

// ── 3. Accept invitation & forge mafia alliance ──────────────────────────────
router.post("/accept/:token", authMiddleware, async (req, res) => {
  try {
    const { token } = req.params;
    const receiverId = req.user._id || req.user.id;

    const invite = await Invite.findOne({ token }).populate("sender", "username avatar");

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found.",
      });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "This invitation link has expired.",
      });
    }

    const senderId = invite.sender._id.toString();

    // Prevent accepting own invite
    if (senderId === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot accept your own invitation link.",
      });
    }

    // Add each other to friends list
    await User.findByIdAndUpdate(senderId, {
      $addToSet: { friends: receiverId },
    });

    await User.findByIdAndUpdate(receiverId, {
      $addToSet: { friends: senderId },
    });

    return res.status(200).json({
      success: true,
      message: `Alliance forged! You and ${invite.sender.username} are now allies.`,
      sender: invite.sender,
      roomId: invite.roomId,
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept invitation",
      error: error.message,
    });
  }
});

export default router;