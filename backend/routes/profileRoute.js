import express from "express";
import {
  getProfile,
  updateProfile,
} from "../controllers/profileController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Wrapper to handle Multer upload errors cleanly
const handleAvatarUpload = (req, res, next) => {
  upload.single("avatar")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "File upload error",
      });
    }
    next();
  });
};

router.get("/", authMiddleware, getProfile);
router.put("/", authMiddleware, handleAvatarUpload, updateProfile);

export default router;