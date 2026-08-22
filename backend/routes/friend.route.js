import express from "express";
import { User } from "../models/user.js";
import { FriendRequest } from "../models/FriendRequest.js";

const router = express.Router();
router.get("/search/:username", async (req, res) => {
  try {
    const users = await User.find({
      username: {
        $regex: req.params.username,
        $options: "i",
      },
    }).select("username");

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
router.post("/send", async (req, res) => {
  try {
    const { receiverId } = req.body;

    const existing = await FriendRequest.findOne({
      sender: req.user._id,
      receiver: receiverId,
      status: "pending",
    });
    if (existing) {
      return res.status(400).json({
        message: "Request already sent",
      });
    }

    const request = await FriendRequest.create({
      sender: req.user._id,
      receiver: receiverId,
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
router.get("/requests", async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user._id,
      status: "pending",
    }).populate("sender", "username");

    res.json(requests);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
router.put("/accept/:id", async (req, res) => {
  try {
    const request = await FriendRequest.findOne({ sender: req.params.id });
    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    request.status = "accepted";
    await request.save();

    await User.findByIdAndUpdate(
      request.sender,
      {
        $addToSet: {
          friends: request.receiver,
        },
      }
    );

    await User.findByIdAndUpdate(
      request.receiver,
      {
        $addToSet: {
          friends: request.sender,
        },
      }
    );

    res.json({
      message: "Friend request accepted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
router.put("/reject/:id", async (req, res) => {
  try {
    await FriendRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
      }
    );

    res.json({
      message: "Request rejected",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
router.get("/list", async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id
    ).populate("friends", "username avatar trophies totalGamesWon");

    res.json(user.friends);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.get("/all-users", async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    const searchQuery = req.query.search || "";

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found" });
    }

    const myFriendsSet = new Set(
      (currentUser.friends || []).map((id) => id.toString())
    );

    // Get all pending requests involving current user
    const pendingRequests = await FriendRequest.find({
      $or: [
        { sender: currentUserId, status: "pending" },
        { receiver: currentUserId, status: "pending" },
      ],
    });

    const pendingSentSet = new Set();
    const pendingReceivedSet = new Set();

    pendingRequests.forEach((reqItem) => {
      if (reqItem.sender.toString() === currentUserId) {
        pendingSentSet.add(reqItem.receiver.toString());
      } else {
        pendingReceivedSet.add(reqItem.sender.toString());
      }
    });

    // Build query — exclude self, optionally filter by search
    const userQuery = { _id: { $ne: currentUser._id } };
    if (searchQuery.trim()) {
      userQuery.username = { $regex: searchQuery.trim(), $options: "i" };
    }

    const allUsers = await User.find(userQuery)
      .select("username avatar trophies totalGamesWon totalGamesPlayed")
      .limit(100)
      .lean();

    const formattedUsers = allUsers.map((u) => {
      const uId = u._id.toString();
      let status = "none";

      if (myFriendsSet.has(uId)) {
        status = "friend";
      } else if (pendingSentSet.has(uId)) {
        status = "pending_sent";
      } else if (pendingReceivedSet.has(uId)) {
        status = "pending_received";
      }

      return {
        _id: u._id,
        username: u.username,
        avatar: u.avatar || "🎭",
        trophies: u.trophies || 0,
        totalGamesWon: u.totalGamesWon || 0,
        status,
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
