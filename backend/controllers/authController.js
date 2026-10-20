import { User } from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// * signIn handler
export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Credentials not provided",
      });
    }

    // Support signing in with either email or username
    const trimmedInput = email.trim();
    const user = await User.findOne({
      $or: [
        { email: trimmedInput.toLowerCase() },
        { username: trimmedInput },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Account not found with this email or username",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: "Invalid password",
      });
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      success: true,
      message: "user signed-in successfully",
      token: token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("[Auth] Sign in error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
};

// * signUp handler
export const signUp = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Please fill in all required fields",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match",
      });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if username already exists
    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        error: `Username "${cleanUsername}" is already taken. Please choose another username.`,
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: `Email "${cleanEmail}" is already registered. Please sign in instead.`,
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password: hashPassword,
    });

    return res.status(201).json({
      success: true,
      message: "User signed-up successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("[Auth] Sign up error:", error);

    // Handle MongoDB duplicate key error cleanly if race condition occurs
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "Field";
      return res.status(400).json({
        success: false,
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use. Please use another.`,
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
};
