import { Room } from "../models/room.js";

//* Creating a Room
export const createRoom = async (req, res) => {
  try {
    const { roomName, totalPlayers, roomType, map, contractMode, roomCode } =
      req.body;

    if (!roomName || !totalPlayers || !roomCode) {
      return res.status(400).json({
        success: false,
        error: "Room info not provided",
      });
    }

    let mafiaCount = 1;
    if (totalPlayers >= 8) {
      mafiaCount = 2;
    }

    const room = await Room.create({
      host: req.user._id,
      roomName: roomName,
      totalPlayers: totalPlayers,
      roomType: roomType,
      map: map,
      users: [req.user._id],
      contractMode: contractMode,
      mafiaCount: mafiaCount,
      roomCode: roomCode,
    });

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

//* Get all public rooms (with optional search/map filter)
export const getRooms = async (req, res) => {
  try {
    const search = req.query.search || "";
    const map = req.query.map;

    const rooms = await Room.find({ roomType: "public" });

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No rooms are available",
      });
    }

    const filteredRooms = rooms.filter((room) => {
      const matchesSearch =
        !search || room.roomName.toLowerCase().includes(search.toLowerCase());
      const matchesMap = !map || room.map === map;
      return matchesSearch && matchesMap;
    });

    return res.status(200).json({
      success: true,
      rooms: filteredRooms,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

//* Get a single room's details with populated players list
export const getRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId)
      .populate("users", "username avatar")
      .populate("host", "username avatar");

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    // ── Compute isHost server-side using the verified JWT user ──────────────
    // This is 100% reliable: req.user._id comes from the auth middleware (JWT
    // verified), and room.host comes directly from MongoDB — no client-side
    // ObjectId/string mismatch or stale localStorage token issues possible.
    const currentUserId = req.user._id?.toString?.() || String(req.user._id);
    const hostId =
      room.host?._id?.toString?.() ||
      room.host?.toString?.() ||
      String(room.host);
    const isHost = hostId === currentUserId;

    if (room.gameStarted && room.playersState && room.playersState.length > 0) {
      const roomObj = room.toObject();

      const myState = roomObj.playersState.find(p => {
        const pUserId = p.user?._id?.toString?.() || p.user?.toString?.() || String(p.user);
        return pUserId === currentUserId;
      });
      const amIMafia = myState && myState.role === "mafia";

      // Mask other players' roles — only current player can see their own role
      roomObj.playersState = roomObj.playersState.map(player => {
        const pUserId = player.user?._id?.toString?.() || player.user?.toString?.() || String(player.user);
        if (pUserId === currentUserId) return player;
        if (amIMafia && player.role === "mafia") return player; // mafia can see teammates
        return { ...player, role: null };
      });

      return res.status(200).json({
        success: true,
        room: roomObj,
        myRole: myState?.role || null,
        isHost,  // ← server-determined, always correct
      });
    }

    return res.status(200).json({
      success: true,
      room,
      myRole: null,
      isHost,  // ← server-determined, always correct
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

//* Join a Room
export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    if (room.gameStarted) {
      return res.status(400).json({
        success: false,
        error: "Game has already started",
      });
    }

    if (room.users.length >= room.totalPlayers) {
      return res.status(400).json({
        success: false,
        error: "Room is full",
      });
    }

    if (room.users.some((userId) => userId.toString() === req.user._id.toString())) {
      // Already in room — just return room details so they can navigate to lobby
      const populatedRoom = await Room.findById(roomId)
        .populate("users", "username avatar")
        .populate("host", "username avatar");

      return res.status(200).json({
        success: true,
        message: "You are already in this room",
        room: populatedRoom,
      });
    }

    room.users.push(req.user._id);
    await room.save();

    //& Return the populated room so frontend can navigate directly
    const populatedRoom = await Room.findById(roomId)
      .populate("users", "username avatar")
      .populate("host", "username avatar");

    return res.status(200).json({
      success: true,
      message: "Joined room successfully",
      room: populatedRoom,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

//* Leave a Room
export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    const userId = req.user._id.toString();

    // Remove user from the room
    room.users = room.users.filter((id) => id.toString() !== userId);

    // Safely get host ID — handle both raw ObjectId and populated object
    const hostId = room.host?._id?.toString() || room.host?.toString();

    // If the host leaves and there are still players, transfer host to next player
    if (hostId === userId && room.users.length > 0) {
      room.host = room.users[0];
    }

    // If no players remain, delete the room
    if (room.users.length === 0) {
      await Room.findByIdAndDelete(roomId);
      return res.status(200).json({
        success: true,
        message: "Room deleted as no players remain",
      });
    }

    await room.save();

    return res.status(200).json({
      success: true,
      message: "Left room successfully",
      newHost: room.host.toString(),
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

//* Start the game and assign roles
export const startGame = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ success: false, error: "Room not found" });
    }

    // Safely get host ID — handle both raw ObjectId and populated object
    const hostId = room.host?._id?.toString() || room.host?.toString();

    // Only host can start
    if (hostId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Only the host can start the game" });
    }

    if (room.gameStarted) {
      return res.status(400).json({ success: false, error: "Game already started" });
    }

    const totalPlayers = room.users.length;

    // Minimum 5 players: 1 mafia + 1 doctor + 1 police + at least 2 villagers
    if (totalPlayers < 5) {
      return res.status(400).json({
        success: false,
        error: `Not enough players. Need at least 5 to start (1 Mafia + 1 Doctor + 1 Police + 2 Villagers). Currently: ${totalPlayers}`,
      });
    }

    // Dynamically calculate mafia count based on ACTUAL players present at start time
    // (not the static value stored at room creation)
    let numMafia;
    if (totalPlayers <= 7) {
      numMafia = 1;
    } else if (totalPlayers <= 12) {
      numMafia = 2;
    } else {
      numMafia = 3;
    }

    const numDoctor = 1;
    const numPolice = 1;
    const numVillagers = totalPlayers - numMafia - numDoctor - numPolice;

    // Build roles array: always guaranteed 1 mafia + 1 doctor + 1 police + rest villagers
    let roles = [];
    for (let i = 0; i < numMafia; i++) roles.push("mafia");
    for (let i = 0; i < numDoctor; i++) roles.push("doctor");
    for (let i = 0; i < numPolice; i++) roles.push("police");
    for (let i = 0; i < numVillagers; i++) roles.push("villager");

    // Fisher-Yates shuffle
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    const playersState = room.users.map((userId, index) => ({
      user: userId,
      role: roles[index],
      isAlive: true,
    }));

    room.playersState = playersState;
    room.mafiaCount = numMafia;  // Update to actual count used
    room.gameStarted = true;
    room.gameState = "NIGHT"; // Mafia games start at night
    await room.save();

    return res.status(200).json({
      success: true,
      message: "Game started successfully",
      mafiaCount: numMafia,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
// Get room by room code
export const getRoomByCode = async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({ roomCode })
      .populate("host", "username avatar")
      .populate("users", "username avatar");

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      room,
    });

  } catch (error) {
    console.error("Get room by code error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
