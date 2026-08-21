import express from "express";
import crypto from "crypto";
import Invite from "../models/Invite.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString("hex");

    const invite = await Invite.create({
      sender: req.user.id,
      token: token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const inviteLink =
      `${process.env.FRONTEND_URL}/invite/${invite.token}`;

    res.status(201).json({
      success: true,
      inviteLink,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create invitation",
    });
  }
});

export default router;