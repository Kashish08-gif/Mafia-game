import { Room } from "../models/room.js";
import { User } from "../models/user.js";
import { checkWinCondition, handleGameOver } from "./winCondition.js";

/**
 * Creates a fresh night action state container for a room.
 */
export const createNightState = () => ({
  mafiaVotes: {}, // { [socketId]: targetPlayerSocketId }
  doctorTarget: null, // targetPlayerSocketId
  policeTarget: null, // targetPlayerSocketId
  policeResults: {}, // { [policeSocketId]: { targetId, targetName, isMafia, role } }
});

/**
 * Helper: retrieves all alive players of a given role from roomState
 */
export const getAliveRoleSockets = (roomState, roleName) => {
  const normalized = (roleName || "").toLowerCase();
  return Object.values(roomState.players || {}).filter(
    (p) => (p.role || "").toLowerCase() === normalized && p.isAlive !== false
  );
};

/**
 * Handles Mafia target vote during Night phase.
 */
export const handleMafiaVote = (roomState, socket, targetId, io, roomId) => {
  const player = roomState.players[socket.id];
  if (!player || player.isAlive === false) {
    socket.emit("night-action-error", { message: "Dead players cannot vote." });
    return;
  }

  if ((player.role || "").toLowerCase() !== "mafia") {
    socket.emit("night-action-error", { message: "Only Mafia members can cast a kill vote." });
    return;
  }

  if (!roomState.nightActions) {
    roomState.nightActions = createNightState();
  }

  // Record or update vote
  roomState.nightActions.mafiaVotes[socket.id] = targetId;

  // Calculate current mafia tally
  const tally = {};
  Object.values(roomState.nightActions.mafiaVotes).forEach((tId) => {
    if (tId) {
      tally[tId] = (tally[tId] || 0) + 1;
    }
  });

  // Broadcast tally strictly to all alive Mafia members
  const aliveMafias = getAliveRoleSockets(roomState, "mafia");
  aliveMafias.forEach((m) => {
    io.to(m.id).emit("night-mafia-votes-update", {
      votes: roomState.nightActions.mafiaVotes,
      tally,
      voterId: socket.id,
      targetId,
    });
  });

  socket.emit("night-action-confirmed", {
    actionType: "KILL",
    targetId,
    timestamp: Date.now(),
  });

  console.log(`[Night:Mafia] ${player.username} (${socket.id}) voted to kill target ${targetId}`);
};

/**
 * Handles Doctor protection/heal selection during Night phase.
 */
export const handleDoctorHeal = (roomState, socket, targetId, io, roomId) => {
  const player = roomState.players[socket.id];
  if (!player || player.isAlive === false) {
    socket.emit("night-action-error", { message: "Dead players cannot perform actions." });
    return;
  }

  if ((player.role || "").toLowerCase() !== "doctor") {
    socket.emit("night-action-error", { message: "Only Doctor can protect players." });
    return;
  }

  if (!roomState.nightActions) {
    roomState.nightActions = createNightState();
  }

  roomState.nightActions.doctorTarget = targetId;

  const targetPlayer = roomState.players[targetId];
  const targetName = targetPlayer?.username || "Player";

  socket.emit("night-action-confirmed", {
    actionType: "HEAL",
    targetId,
    targetName,
    message: `You chose to protect ${targetName} tonight.`,
    timestamp: Date.now(),
  });

  console.log(`[Night:Doctor] ${player.username} (${socket.id}) chose to protect ${targetName} (${targetId})`);
};

/**
 * Handles Police/Detective investigation during Night phase.
 */
export const handlePoliceInspect = (roomState, socket, targetId, io, roomId) => {
  const player = roomState.players[socket.id];
  if (!player || player.isAlive === false) {
    socket.emit("night-action-error", { message: "Dead players cannot perform actions." });
    return;
  }

  if ((player.role || "").toLowerCase() !== "police") {
    socket.emit("night-action-error", { message: "Only Police/Detective can investigate players." });
    return;
  }

  if (!roomState.nightActions) {
    roomState.nightActions = createNightState();
  }

  const targetPlayer = roomState.players[targetId];
  if (!targetPlayer) {
    socket.emit("night-action-error", { message: "Target player not found." });
    return;
  }

  const isMafia = (targetPlayer.role || "").toLowerCase() === "mafia";
  const result = {
    targetId,
    targetUsername: targetPlayer.username,
    isMafia,
    alignment: isMafia ? "MAFIA" : "INNOCENT",
    timestamp: Date.now(),
  };

  roomState.nightActions.policeTarget = targetId;
  roomState.nightActions.policeResults[socket.id] = result;

  // Privately deliver result directly to the police officer
  socket.emit("night-police-result", result);

  socket.emit("night-action-confirmed", {
    actionType: "INSPECT",
    targetId,
    targetName: targetPlayer.username,
    isMafia,
    timestamp: Date.now(),
  });

  console.log(`[Night:Police] ${player.username} inspected ${targetPlayer.username} -> Alignment: ${result.alignment}`);
};

/**
 * Handles Night secret chat between Mafia members.
 */
export const handleMafiaChat = (roomState, socket, messageData, io, roomId) => {
  const player = roomState.players[socket.id];
  if (!player || player.isAlive === false) return;

  if ((player.role || "").toLowerCase() !== "mafia") {
    socket.emit("night-action-error", { message: "Access denied: Mafia secret channel." });
    return;
  }

  const payload = {
    id: socket.id,
    sender: player.username || "Mafia Member",
    text: messageData.text,
    color: "#ff3344",
    role: "mafia",
    ts: Date.now(),
    isMafiaOnly: true,
  };

  // Broadcast exclusively to alive Mafia members
  const aliveMafias = getAliveRoleSockets(roomState, "mafia");
  aliveMafias.forEach((m) => {
    io.to(m.id).emit("night-mafia-chat-receive", payload);
  });
};

/**
 * Checks if all alive night roles have completed their actions.
 */
export const checkAllNightActionsDone = (roomState) => {
  if (!roomState.nightActions || roomState.phase !== "NIGHT") return false;

  const aliveMafias = getAliveRoleSockets(roomState, "mafia");
  const aliveDoctors = getAliveRoleSockets(roomState, "doctor");
  const alivePolice = getAliveRoleSockets(roomState, "police");

  const mafiaDone = aliveMafias.every((m) => roomState.nightActions.mafiaVotes[m.id]);
  const doctorDone = aliveDoctors.length === 0 || !!roomState.nightActions.doctorTarget;
  const policeDone = alivePolice.length === 0 || !!roomState.nightActions.policeTarget;

  return mafiaDone && doctorDone && policeDone;
};

/**
 * Resolves the Night Phase:
 * 1. Tallies Mafia votes for kill target.
 * 2. Checks Doctor heal target vs kill target.
 * 3. Updates player death state if not saved.
 * 4. Checks Win Conditions.
 * 5. If game continues, transitions to Day phase with full morning broadcast.
 */
export const resolveNightPhase = async (roomId, roomState, io) => {
  console.log(`[Night:Resolve] Resolving Night Phase for Room ${roomId}...`);

  const nightActions = roomState.nightActions || createNightState();

  // ── Step 1: Tally Mafia kill votes ─────────────────────────────────
  const tally = {};
  Object.values(nightActions.mafiaVotes).forEach((targetId) => {
    if (targetId && targetId !== "skip") {
      tally[targetId] = (tally[targetId] || 0) + 1;
    }
  });

  let maxVotes = 0;
  let mafiaKillTargetId = null;
  let isTie = false;

  Object.entries(tally).forEach(([targetId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      mafiaKillTargetId = targetId;
      isTie = false;
    } else if (count === maxVotes && count > 0) {
      isTie = true;
    }
  });

  // If tie occurs in mafia vote, randomly resolve to one of the tied targets or none
  if (isTie) {
    const tiedTargets = Object.entries(tally)
      .filter(([_, count]) => count === maxVotes)
      .map(([targetId]) => targetId);
    mafiaKillTargetId = tiedTargets[Math.floor(Math.random() * tiedTargets.length)];
  }

  // ── Step 2: Compare with Doctor's Heal Target ──────────────────────
  const doctorTargetId = nightActions.doctorTarget;
  let isSaved = false;
  let eliminatedPlayer = null;

  if (mafiaKillTargetId) {
    if (doctorTargetId && doctorTargetId === mafiaKillTargetId) {
      isSaved = true;
      console.log(`[Night:Resolve] Doctor successfully SAVED target ${mafiaKillTargetId}!`);
    } else {
      // Victim is eliminated
      const victim = roomState.players[mafiaKillTargetId];
      if (victim && victim.isAlive !== false) {
        victim.isAlive = false;
        eliminatedPlayer = {
          id: victim.id,
          username: victim.username,
          role: victim.role,
        };

        console.log(`[Night:Resolve] Victim ${victim.username} (${victim.id}) was ELIMINATED by Mafia.`);

        // Persist elimination to MongoDB
        try {
          const room = await Room.findById(roomId).populate("playersState.user", "username");
          if (room) {
            const match = room.playersState.find(
              (p) => p.user && p.user.username === victim.username
            );
            if (match) {
              await Room.updateOne(
                { _id: roomId, "playersState._id": match._id },
                { $set: { "playersState.$.isAlive": false } }
              );
              console.log(`[Night:Resolve] Saved elimination of ${victim.username} to DB.`);
            }
          }
        } catch (dbErr) {
          console.error(`[Night:Resolve] Error saving elimination to DB:`, dbErr);
        }

        // Notify room of player state change
        io.to(roomId).emit("player-updated", {
          id: victim.id,
          ...victim,
        });
      }
    }
  } else {
    console.log(`[Night:Resolve] No kill target was chosen by Mafia tonight.`);
  }

  // ── Step 3: Check Win Condition ────────────────────────────────────
  const winResult = checkWinCondition(roomState.players);
  if (winResult.isGameOver) {
    await handleGameOver(roomId, roomState, io, winResult);
    return;
  }

  // ── Step 4: Advance to Day Phase ───────────────────────────────────
  roomState.phase = "DAY";
  roomState.day = (roomState.day || 1) + 1;
  roomState.timer = 165; // Standard Day discussion timer
  roomState.discussionActive = false;
  roomState.subPhase = "ROAMING";
  roomState.sittingPlayers.clear();
  roomState.votes = {};
  roomState.nightActions = createNightState();

  // Sync room state to Database
  try {
    await Room.findByIdAndUpdate(roomId, {
      gameState: "DAY",
      currentDay: roomState.day,
    });
  } catch (dbErr) {
    console.error(`[Night:Resolve] Error updating room in DB:`, dbErr);
  }

  const alivePlayers = Object.values(roomState.players).filter((p) => p.isAlive !== false);
  const aliveMafias = alivePlayers.filter((p) => (p.role || "").toLowerCase() === "mafia");

  // Broadcast morning announcement payload
  io.to(roomId).emit("morning-announcement", {
    eliminatedPlayer,
    isSaved,
    day: roomState.day,
    timer: roomState.timer,
    aliveCount: alivePlayers.length,
    mafiaCount: aliveMafias.length,
  });

  io.to(roomId).emit("night-resolved", {
    eliminatedPlayer,
    isSaved,
    day: roomState.day,
    timer: roomState.timer,
    aliveCount: alivePlayers.length,
    mafiaCount: aliveMafias.length,
  });

  io.to(roomId).emit("phase-change", {
    phase: "DAY",
    day: roomState.day,
    timer: roomState.timer,
  });

  // Morning System Announcement in Game Chat
  if (eliminatedPlayer) {
    io.to(roomId).emit("receive-chat", {
      sender: "System",
      text: `🌅 Morning has broken. 🩸 ${eliminatedPlayer.username} was found dead last night!`,
      color: "#ff3344",
      ts: Date.now(),
      isSystem: true,
    });
  } else if (isSaved) {
    io.to(roomId).emit("receive-chat", {
      sender: "System",
      text: `🌅 Morning has broken. 💉 The Doctor successfully protected the victim! Nobody died tonight.`,
      color: "#44ff88",
      ts: Date.now(),
      isSystem: true,
    });
  } else {
    io.to(roomId).emit("receive-chat", {
      sender: "System",
      text: `🌅 Morning has broken. A peaceful night passed — nobody was killed.`,
      color: "#ffd700",
      ts: Date.now(),
      isSystem: true,
    });
  }

  console.log(`[Night:Resolve] Transitioned Room ${roomId} to Day ${roomState.day}`);
};
