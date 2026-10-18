import { User } from "../models/user.js";
import { uploadImageToCloudinary } from "../config/cloudinary.js";

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error in getProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile",
      error: error.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { username, avatar } = req.body;
    let finalAvatar = avatar;

    // If an image file was uploaded via multer, stream it directly to Cloudinary
    if (req.file) {
      try {
        const uploadResult = await uploadImageToCloudinary(req.file.buffer, {
          folder: "mafia_game/avatars",
        });
        finalAvatar = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload avatar image to Cloudinary. Please check Cloudinary credentials.",
          error: uploadError.message,
        });
      }
    }

    const updateFields = {};
    if (username !== undefined && username.trim() !== "") {
      updateFields.username = username.trim();
    }
    if (finalAvatar !== undefined) {
      updateFields.avatar = finalAvatar;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
      error: error.message,
    });
  }
};
