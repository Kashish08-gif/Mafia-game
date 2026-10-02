import { Server } from "socket.io";
import { Room } from "../models/room.js";
import {
  createNightState,
  handleMafiaVote,
  handleDoctorHeal,
  handlePoliceInspect,
  handleMafiaChat,
  checkAllNightActionsDone,
  resolveNightPhase,
} from "../game/nightEngine.js";
import { checkWinCondition, handleGameOver } from "../game/winCondition.js";

const mapRooms = {};

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected to socket:", socket.id);
    let currentRoomId = null;

    // Register user to personal channel for direct in-app lobby invites
    socket.on("register-user", (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[Socket] Socket ${socket.id} registered to channel user_${userId}`);
      }
    });

    // Direct in-app lobby invitation handler (no link needed!)
    socket.on("send-lobby-invite", ({ targetUserId, roomId, roomName, hostName, hostId }) => {
      if (targetUserId && roomId) {
        io.to(`user_${targetUserId}`).emit("receive-lobby-invite", {
          roomId,
          roomName: roomName || "Mafia Mansion",
          hostName: hostName || "A Friend",
          hostId,
          timestamp: Date.now(),
        });
        console.log(`[Socket] Direct lobby invite sent from ${hostName} to user_${targetUserId} for room ${roomId}`);
      }
    });

    socket.on("join-map", async (roomId, userData) => {
      currentRoomId = roomId;
      socket.join(roomId);

      let initialPhase = "DAY";
      let initialTimer = 165;
      let initialDay = 1;
      let resolvedRole = userData?.role || null;
      let resolvedIsAlive = userData?.isAlive !== false;

      try {
        const room = await Room.findById(roomId).populate("playersState.user", "username");
        if (room && room.gameStarted) {
          initialPhase = room.gameState === "WAITING" ? "DAY" : (room.gameState || "DAY");
          initialTimer = initialPhase === "NIGHT" ? 60 : 165;
          initialDay = room.currentDay || 1;

          // Fetch authoritative role from DB if available
          if (room.playersState && room.playersState.length > 0) {
            const match = room.playersState.find((p) => {
              const pUsername = p.user?.username;
              const pUserId = p.user?._id?.toString() || p.user?.toString();
              return (
                (userData.userId && pUserId === userData.userId) ||
                (userData.username && pUsername === userData.username)
              );
            });
            if (match) {
              if (match.role) resolvedRole = match.role;
              if (match.isAlive != null) resolvedIsAlive = match.isAlive;
            }
          }
        }
      } catch (err) {
        console.error("[Socket] Error reading room from DB:", err);
      }

      if (!mapRooms[roomId]) {
        mapRooms[roomId] = {
          players: {},
          phase: initialPhase,
          day: initialDay,
          timer: initialTimer,
          votes: {},
          interval: null,
          sittingPlayers: new Set(), // tracks who is seated at discussion table
          discussionActive: false, // is discussion phase active
          nightActions: createNightState(),
        };
      }

      mapRooms[roomId].players[socket.id] = {
        id: socket.id,
        ...userData,
        role: resolvedRole || userData.role,
        isAlive: resolvedIsAlive,
        sitting: false,
      };

      const activePlayers = Object.values(mapRooms[roomId].players);
      socket.emit("map-snapshot", {
        players: activePlayers,
        phase: mapRooms[roomId].phase,
        day: mapRooms[roomId].day,
        timer: mapRooms[roomId].timer,
        discussionActive: mapRooms[roomId].discussionActive,
      });

      socket.to(roomId).emit("player-joined", {
        id: socket.id,
        ...userData,
        role: resolvedRole || userData.role,
        isAlive: resolvedIsAlive,
      });

      console.log(`User ${userData.username || "Guest"} (${socket.id}) joined room map: ${roomId} [Role: ${resolvedRole || "unknown"}]`);

      // Start room game loop if not already running
      if (!mapRooms[roomId].interval) {
        mapRooms[roomId].interval = setInterval(async () => {
          if (!mapRooms[roomId]) return;

          mapRooms[roomId].timer--;

          // Broadcast phase tick to all clients
          io.to(roomId).emit("phase-tick", {
            phase: mapRooms[roomId].phase,
            day: mapRooms[roomId].day,
            timer: mapRooms[roomId].timer,
            discussionActive: mapRooms[roomId].discussionActive,
            subPhase: mapRooms[roomId].subPhase || "ROAMING",
          });

          // Transition when timer hits 0
          if (mapRooms[roomId].timer <= 0) {
            if (mapRooms[roomId].phase === "DAY") {
              if (mapRooms[roomId].discussionActive) {
                if (mapRooms[roomId].subPhase === "DISCUSSION") {
                  // Transition to VOTING sub-phase
                  mapRooms[roomId].subPhase = "VOTING";
                  mapRooms[roomId].timer = 60; // 60 seconds voting
                  mapRooms[roomId].votes = {};

                  io.to(roomId).emit("discussion-phase-change", {
                    subPhase: "VOTING",
                    timer: 60,
                  });
                  console.log(`[Socket] Room ${roomId} discussion transitioned to VOTING`);

                } else if (mapRooms[roomId].subPhase === "VOTING") {
                  // Transition to REVEAL sub-phase
                  mapRooms[roomId].subPhase = "REVEAL";
                  mapRooms[roomId].timer = 12; // 12 seconds reveal

                  // Process votes
                  const votes = mapRooms[roomId].votes || {};
                  const alivePlayers = Object.values(mapRooms[roomId].players).filter(
                    (p) => p.isAlive !== false
                  );

                  const tally = {};
                  alivePlayers.forEach((p) => {
                    tally[p.id] = 0;
                  });
                  tally["skip"] = 0;

                  Object.values(votes).forEach((targetId) => {
                    tally[targetId] = (tally[targetId] || 0) + 1;
                  });

                  let maxVotes = 0;
                  let eliminatedPlayerId = null;
                  let isTie = false;

                  Object.entries(tally).forEach(([targetId, count]) => {
                    if (targetId === "skip") return;
                    if (count > maxVotes) {
                      maxVotes = count;
                      eliminatedPlayerId = targetId;
                      isTie = false;
                    } else if (count === maxVotes && count > 0) {
                      isTie = true;
                    }
                  });

                  // If skip has equal or more votes, no one gets eliminated
                  if (tally["skip"] >= maxVotes) {
                    eliminatedPlayerId = null;
                  } else if (isTie) {
                    eliminatedPlayerId = null; // tie
                  }

                  let eliminatedPlayer = null;
                  if (eliminatedPlayerId) {
                    const elPlayer = mapRooms[roomId].players[eliminatedPlayerId];
                    if (elPlayer) {
                      elPlayer.isAlive = false;
                      eliminatedPlayer = {
                        id: elPlayer.id,
                        username: elPlayer.username,
                        role: elPlayer.role,
                      };

                      // Privately notify voted-out player
                      io.to(eliminatedPlayerId).emit("you-were-killed", {
                        killerName: "Town Majority Vote",
                        killerNames: ["Town Council"],
                        eliminatedPlayer,
                        reason: "VOTED_OUT",
                        timestamp: Date.now(),
                      });

                      // Update DB playerState to isAlive: false
                      try {
                        const room = await Room.findById(roomId).populate(
                          "playersState.user",
                          "username"
                        );
                        if (room) {
                          const match = room.playersState.find(
                            (p) => p.user && p.user.username === elPlayer.username
                          );
                          if (match) {
                            await Room.updateOne(
                              { _id: roomId, "playersState._id": match._id },
                              { $set: { "playersState.$.isAlive": false } }
                            );
                            console.log(`[Socket] Saved user ${elPlayer.username} elimination to DB.`);
                          }
                        }
                      } catch (dbErr) {
                        console.error("[Socket] DB update error on elimination:", dbErr);
                      }

                      // Broadcast update to all
                      io.to(roomId).emit("player-updated", {
                        id: eliminatedPlayerId,
                        ...elPlayer,
                      });

                      io.to(roomId).emit("receive-chat", {
                        sender: "System",
                        text: `${elPlayer.username || "A player"} was voted out and eliminated.`,
                        color: "#ff3344",
                        ts: Date.now(),
                      });
                    }
                  } else {
                    io.to(roomId).emit("receive-chat", {
                      sender: "System",
                      text: `No one was eliminated (tie or skip vote won).`,
                      color: "#ffaa33",
                      ts: Date.now(),
                    });
                  }

                  // Count remaining alive mafias
                  const remainingPlayers = Object.values(mapRooms[roomId].players).filter(
                    (p) => p.isAlive !== false
                  );
                  const mafiaCount = remainingPlayers.filter((p) => p.role === "mafia").length;

                  io.to(roomId).emit("discussion-reveal", {
                    eliminatedPlayer, // { id, username, role } or null
                    mafiaCount,
                    mafiaPresent: mafiaCount > 0,
                    subPhase: "REVEAL",
                    timer: 12,
                    tally,
                  });

                  console.log(`[Socket] Room ${roomId} discussion transitioned to REVEAL. Eliminated:`, eliminatedPlayer);

                  // Check if Day elimination triggered Win Condition
                  const winCheck = checkWinCondition(mapRooms[roomId].players);
                  if (winCheck.isGameOver) {
                    await handleGameOver(roomId, mapRooms[roomId], io, winCheck);
                    return;
                  }

                } else if (mapRooms[roomId].subPhase === "REVEAL") {
                  // End discussion phase, go to NIGHT
                  mapRooms[roomId].discussionActive = false;
                  mapRooms[roomId].subPhase = "ROAMING";
                  mapRooms[roomId].sittingPlayers.clear();
                  mapRooms[roomId].votes = {};
                  mapRooms[roomId].nightActions = createNightState();

                  // Switch to NIGHT
                  mapRooms[roomId].phase = "NIGHT";
                  mapRooms[roomId].timer = 60;

                  // Sync database room state
                  try {
                    await Room.findByIdAndUpdate(roomId, {
                      gameState: "NIGHT",
                      currentDay: mapRooms[roomId].day,
                    });
                  } catch (dbErr) {
                    console.error("[Socket] DB update error on phase change:", dbErr);
                  }

                  io.to(roomId).emit("phase-change", {
                    phase: mapRooms[roomId].phase,
                    day: mapRooms[roomId].day,
                    timer: mapRooms[roomId].timer,
                  });

                  io.to(roomId).emit("discussion-end", { reason: "timer" });

                  io.to(roomId).emit("receive-chat", {
                    sender: "System",
                    text: "🌙 Night has fallen. The Town sleeps... Mafia, Doctor, and Police make your moves.",
                    color: "#7c8cff",
                    ts: Date.now(),
                    isSystem: true,
                  });

                  console.log(`[Socket] Room ${roomId} discussion ended, transitioned to NIGHT`);
                }
              } else {
                // No discussion active, standard Day timeout -> switch to NIGHT
                mapRooms[roomId].phase = "NIGHT";
                mapRooms[roomId].timer = 60;
                mapRooms[roomId].nightActions = createNightState();

                try {
                  await Room.findByIdAndUpdate(roomId, {
                    gameState: "NIGHT",
                    currentDay: mapRooms[roomId].day,
                  });
                } catch (dbErr) {
                  console.error("[Socket] DB update error:", dbErr);
                }

                io.to(roomId).emit("phase-change", {
                  phase: mapRooms[roomId].phase,
                  day: mapRooms[roomId].day,
                  timer: mapRooms[roomId].timer,
                });

                io.to(roomId).emit("receive-chat", {
                  sender: "System",
                  text: "🌙 Night has fallen. The Town sleeps... Mafia, Doctor, and Police make your moves.",
                  color: "#7c8cff",
                  ts: Date.now(),
                  isSystem: true,
                });
              }
            } else if (mapRooms[roomId].phase === "NIGHT") {
              // Night timer reached 0 -> Resolve Night Phase
              await resolveNightPhase(roomId, mapRooms[roomId], io);
            }
          }
        }, 1000);
      }
    });

    socket.on("player-move", (roomId, positionData) => {
      if (mapRooms[roomId] && mapRooms[roomId].players[socket.id]) {
        mapRooms[roomId].players[socket.id].position = positionData.position;
        mapRooms[roomId].players[socket.id].rotation = positionData.rotation;
        mapRooms[roomId].players[socket.id].walking = true;
        mapRooms[roomId].players[socket.id].sitting = !!positionData.sitting;
      }
      socket.to(roomId).emit("player-moved", {
        id: socket.id,
        ...positionData,
      });
    });

    socket.on("update-player", (roomId, updateData) => {
      if (mapRooms[roomId] && mapRooms[roomId].players[socket.id]) {
        if (updateData.username != null) {
          mapRooms[roomId].players[socket.id].username = updateData.username;
        }
        if (updateData.role != null) {
          mapRooms[roomId].players[socket.id].role = updateData.role;
        }
        if (updateData.isAlive != null) {
          mapRooms[roomId].players[socket.id].isAlive = updateData.isAlive;
        }
        if (updateData.userId != null) {
          mapRooms[roomId].players[socket.id].userId = updateData.userId;
        }
        socket.to(roomId).emit("player-updated", {
          id: socket.id,
          ...mapRooms[roomId].players[socket.id],
        });
      }
    });

    socket.on("cast-vote", (roomId, { targetId }) => {
      if (mapRooms[roomId]) {
        const voter = mapRooms[roomId].players[socket.id];
        if (voter && voter.isAlive === false) {
          socket.emit("vote-error", { message: "Dead players cannot vote." });
          return;
        }

        if (!mapRooms[roomId].votes) {
          mapRooms[roomId].votes = {};
        }
        mapRooms[roomId].votes[socket.id] = targetId;

        // Tally votes
        const tally = {};
        Object.values(mapRooms[roomId].votes).forEach((tId) => {
          tally[tId] = (tally[tId] || 0) + 1;
        });

        io.to(roomId).emit("vote-update", { tally });
      }
    });

    socket.on("send-chat", (roomId, messageData) => {
      if (!mapRooms[roomId]) return;
      const sender = mapRooms[roomId].players[socket.id];
      const isDead = sender && sender.isAlive === false;

      if (isDead) {
        // Ghost chat: strictly broadcast only to dead players / spectators
        Object.values(mapRooms[roomId].players).forEach((p) => {
          if (p.isAlive === false) {
            io.to(p.id).emit("receive-chat", {
              id: socket.id,
              ...messageData,
              sender: `👻 ${messageData.sender || "Ghost"} (Dead)`,
              isGhost: true,
              color: "#a0a8b9",
            });
          }
        });
        return;
      }

      socket.to(roomId).emit("receive-chat", { id: socket.id, ...messageData });
    });

    // ── Night Phase Actions & Secret Mafia Chat ───────────────────────
    socket.on("night-action", (roomId, { actionType, targetId }) => {
      if (!mapRooms[roomId] || mapRooms[roomId].phase !== "NIGHT") {
        socket.emit("night-action-error", { message: "Night actions can only be performed during Night phase." });
        return;
      }

      const player = mapRooms[roomId].players[socket.id];
      if (!player) return;

      const role = (player.role || "").toLowerCase();

      if (actionType === "KILL" || role === "mafia") {
        handleMafiaVote(mapRooms[roomId], socket, targetId, io, roomId);
      } else if (actionType === "HEAL" || role === "doctor") {
        handleDoctorHeal(mapRooms[roomId], socket, targetId, io, roomId);
      } else if (actionType === "INSPECT" || role === "police") {
        handlePoliceInspect(mapRooms[roomId], socket, targetId, io, roomId);
      } else {
        socket.emit("night-action-error", { message: "Villagers do not have a nighttime ability." });
      }

      // Check if all alive night roles have completed their moves
      if (checkAllNightActionsDone(mapRooms[roomId])) {
        console.log(`[Night] All night roles acted in room ${roomId}. Shortening night countdown...`);
        mapRooms[roomId].timer = Math.min(mapRooms[roomId].timer, 4); // 4s grace countdown
      }
    });

    socket.on("night-mafia-vote", (roomId, { targetId }) => {
      if (!mapRooms[roomId] || mapRooms[roomId].phase !== "NIGHT") return;
      handleMafiaVote(mapRooms[roomId], socket, targetId, io, roomId);
      if (checkAllNightActionsDone(mapRooms[roomId])) {
        mapRooms[roomId].timer = Math.min(mapRooms[roomId].timer, 4);
      }
    });

    socket.on("night-doctor-heal", (roomId, { targetId }) => {
      if (!mapRooms[roomId] || mapRooms[roomId].phase !== "NIGHT") return;
      handleDoctorHeal(mapRooms[roomId], socket, targetId, io, roomId);
      if (checkAllNightActionsDone(mapRooms[roomId])) {
        mapRooms[roomId].timer = Math.min(mapRooms[roomId].timer, 4);
      }
    });

    socket.on("night-police-inspect", (roomId, { targetId }) => {
      if (!mapRooms[roomId] || mapRooms[roomId].phase !== "NIGHT") return;
      handlePoliceInspect(mapRooms[roomId], socket, targetId, io, roomId);
      if (checkAllNightActionsDone(mapRooms[roomId])) {
        mapRooms[roomId].timer = Math.min(mapRooms[roomId].timer, 4);
      }
    });

    socket.on("night-mafia-chat", (roomId, messageData) => {
      if (!mapRooms[roomId] || mapRooms[roomId].phase !== "NIGHT") return;
      handleMafiaChat(mapRooms[roomId], socket, messageData, io, roomId);
    });

    // ── Discussion Chat ──────────────────────────────────────────────
    socket.on("discussion-send", (roomId, messageData) => {
      if (!mapRooms[roomId]) return;
      const sender = mapRooms[roomId].players[socket.id];
      const isDead = sender && sender.isAlive === false;

      const payload = {
        id: socket.id,
        ...messageData,
        ts: Date.now(),
      };

      if (isDead) {
        // Only deliver ghost discussion chat to other dead players
        Object.values(mapRooms[roomId].players).forEach((p) => {
          if (p.isAlive === false) {
            io.to(p.id).emit("discussion-receive", {
              ...payload,
              sender: `👻 ${messageData.sender || "Ghost"} (Dead)`,
              isGhost: true,
            });
          }
        });
        return;
      }

      socket.to(roomId).emit("discussion-receive", payload);
    });

    // ── Player Sit / Stand at Discussion Table ───────────────────────
    socket.on("player-sit", async (roomId, { username }) => {
      if (!mapRooms[roomId]) return;
      const player = mapRooms[roomId].players[socket.id];
      if (player && player.isAlive === false) {
        socket.emit("discussion-locked", {
          message: "Spectators cannot sit at the discussion table.",
        });
        return;
      }

      mapRooms[roomId].sittingPlayers.add(socket.id);
      mapRooms[roomId].players[socket.id].sitting = true;

      io.to(roomId).emit("discussion-seated-update", {
        sittingIds: Array.from(mapRooms[roomId].sittingPlayers),
        players: Object.values(mapRooms[roomId].players).map((p) => ({
          id: p.id,
          username: p.username,
          color: p.color,
          isAlive: p.isAlive,
          sitting: p.sitting,
        })),
      });

      console.log(`[Socket] ${username} (${socket.id}) sat down in room ${roomId}. Seated: ${mapRooms[roomId].sittingPlayers.size}`);

      // Check if ALL alive players are seated → start discussion
      if (!mapRooms[roomId].discussionActive && mapRooms[roomId].phase === "DAY") {
        const alivePlayers = Object.values(mapRooms[roomId].players).filter(
          (p) => p.isAlive !== false
        );
        const aliveCount = alivePlayers.length;
        const seatedAliveCount = alivePlayers.filter((p) =>
          mapRooms[roomId].sittingPlayers.has(p.id)
        ).length;

        console.log(`[Socket] Alive: ${aliveCount}, Seated alive: ${seatedAliveCount}`);

        if (aliveCount > 0 && seatedAliveCount >= aliveCount) {
          mapRooms[roomId].discussionActive = true;
          mapRooms[roomId].subPhase = "DISCUSSION";
          mapRooms[roomId].timer = 180; // 3 minutes discussion
          mapRooms[roomId].votes = {};

          const discussionPlayersPublic = alivePlayers.map((p) => ({
            id: p.id,
            username: p.username,
            color: p.color,
            isAlive: p.isAlive,
          }));

          const sockets = await io.in(roomId).fetchSockets();
          for (const s of sockets) {
            const myPlayerData = mapRooms[roomId].players[s.id];
            const playersForThisClient = discussionPlayersPublic.map((p) =>
              p.id === s.id
                ? { ...p, role: myPlayerData?.role || "villager" }
                : p
            );
            s.emit("discussion-start", {
              players: playersForThisClient,
              timer: 180,
              day: mapRooms[roomId].day,
              subPhase: "DISCUSSION",
            });
          }

          io.to(roomId).emit("discussion-receive", {
            sender: "System",
            text: "🗣 Discussion has started! All players are seated. Discuss who the Mafia is...",
            color: "#ffd700",
            ts: Date.now(),
            isSystem: true,
          });

          console.log(`[Socket] Discussion STARTED in room ${roomId} with ${aliveCount} players`);
        }
      }
    });

    socket.on("player-stand", (roomId) => {
      if (!mapRooms[roomId]) return;

      if (mapRooms[roomId].discussionActive) {
        socket.emit("discussion-locked", {
          message: "You cannot leave the table during discussion!",
        });
        return;
      }

      mapRooms[roomId].sittingPlayers.delete(socket.id);
      if (mapRooms[roomId].players[socket.id]) {
        mapRooms[roomId].players[socket.id].sitting = false;
      }

      io.to(roomId).emit("discussion-seated-update", {
        sittingIds: Array.from(mapRooms[roomId].sittingPlayers),
        players: Object.values(mapRooms[roomId].players),
      });
    });

    // ── Discussion Vote Casting ─────────────────────────────────────
    socket.on("discussion-cast-vote", (roomId, { targetId }) => {
      if (!mapRooms[roomId] || !mapRooms[roomId].discussionActive) return;
      if (mapRooms[roomId].subPhase !== "VOTING") return;

      const voter = mapRooms[roomId].players[socket.id];
      if (voter && voter.isAlive === false) {
        socket.emit("vote-error", { message: "Dead players cannot vote." });
        return;
      }

      mapRooms[roomId].votes[socket.id] = targetId;

      const votedSocketIds = Object.keys(mapRooms[roomId].votes);
      io.to(roomId).emit("discussion-vote-cast-update", {
        votedIds: votedSocketIds,
      });

      const alivePlayers = Object.values(mapRooms[roomId].players).filter(
        (p) => p.isAlive !== false
      );
      const aliveIds = alivePlayers.map((p) => p.id);
      const allVoted = aliveIds.every((id) => mapRooms[roomId].votes[id] !== undefined);

      if (allVoted) {
        console.log(`[Socket] All players voted in room ${roomId}. Transitioning to reveal stage.`);
        mapRooms[roomId].timer = 0;
      }
    });

    // ── WebRTC Voice Signaling ──────────────────────────────────────
    socket.on("voice-ready", (roomId, { from }) => {
      if (!mapRooms[roomId]) return;
      socket.to(roomId).emit("voice-ready", { from: socket.id });
    });

    socket.on("voice-offer", (roomId, { to, offer }) => {
      if (!mapRooms[roomId]) return;
      io.to(to).emit("voice-offer", { from: socket.id, offer });
    });

    socket.on("voice-answer", (roomId, { to, answer }) => {
      if (!mapRooms[roomId]) return;
      io.to(to).emit("voice-answer", { from: socket.id, answer });
    });

    socket.on("voice-ice-candidate", (roomId, { to, candidate }) => {
      if (!mapRooms[roomId]) return;
      io.to(to).emit("voice-ice-candidate", { from: socket.id, candidate });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      if (currentRoomId && mapRooms[currentRoomId]) {
        // Clean up vote
        if (mapRooms[currentRoomId].votes && mapRooms[currentRoomId].votes[socket.id]) {
          delete mapRooms[currentRoomId].votes[socket.id];
          const tally = {};
          Object.values(mapRooms[currentRoomId].votes).forEach((tId) => {
            tally[tId] = (tally[tId] || 0) + 1;
          });
          io.to(currentRoomId).emit("vote-update", { tally });
        }

        // Clean up night votes
        if (
          mapRooms[currentRoomId].nightActions &&
          mapRooms[currentRoomId].nightActions.mafiaVotes[socket.id]
        ) {
          delete mapRooms[currentRoomId].nightActions.mafiaVotes[socket.id];
        }

        // Clean up sitting state
        mapRooms[currentRoomId].sittingPlayers.delete(socket.id);

        delete mapRooms[currentRoomId].players[socket.id];
        io.to(currentRoomId).emit("player-left", { id: socket.id });

        if (Object.keys(mapRooms[currentRoomId].players).length === 0) {
          if (mapRooms[currentRoomId].interval) {
            clearInterval(mapRooms[currentRoomId].interval);
          }
          delete mapRooms[currentRoomId];
        }
      }
    });
  });

  return io;
};