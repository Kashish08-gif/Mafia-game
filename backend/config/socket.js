import { Server } from "socket.io";
import { Room } from "../models/room.js";

const mapRooms = {};

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("New client connected to socket:", socket.id);
    let currentRoomId = null;

    socket.on("join-map", async (roomId, userData) => {
      currentRoomId = roomId;
      socket.join(roomId);

      let initialPhase = "DAY";
      let initialTimer = 165;
      let initialDay = 1;

      try {
        const room = await Room.findById(roomId);
        if (room && room.gameStarted) {
          initialPhase = room.gameState === "WAITING" ? "DAY" : (room.gameState || "DAY");
          initialTimer = initialPhase === "NIGHT" ? 60 : 165;
          initialDay = room.currentDay || 1;
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
          interval: null
        };
      }

      mapRooms[roomId].players[socket.id] = {
        id: socket.id,
        ...userData,
        isAlive: userData.isAlive !== false,
        sitting: false
      };

      const activePlayers = Object.values(mapRooms[roomId].players);
      socket.emit("map-snapshot", {
        players: activePlayers,
        phase: mapRooms[roomId].phase,
        day: mapRooms[roomId].day,
        timer: mapRooms[roomId].timer
      });

      socket.to(roomId).emit("player-joined", {
        id: socket.id,
        ...userData
      });

      console.log(`User ${userData.username || 'Guest'} (${socket.id}) joined room map: ${roomId}`);

      // Start room game loop if not already running
      if (!mapRooms[roomId].interval) {
        mapRooms[roomId].interval = setInterval(async () => {
          if (!mapRooms[roomId]) return;

          mapRooms[roomId].timer--;

          // Broadcast phase tick to all clients
          io.to(roomId).emit("phase-tick", {
            phase: mapRooms[roomId].phase,
            day: mapRooms[roomId].day,
            timer: mapRooms[roomId].timer
          });

          // Transition when timer hits 0
          if (mapRooms[roomId].timer <= 0) {
            if (mapRooms[roomId].phase === "DAY") {
              // End of DAY: process votes
              const votes = mapRooms[roomId].votes || {};
              const tally = {};
              Object.values(votes).forEach((targetId) => {
                tally[targetId] = (tally[targetId] || 0) + 1;
              });

              let maxVotes = 0;
              let eliminatedPlayerId = null;
              Object.entries(tally).forEach(([pid, count]) => {
                if (count > maxVotes) {
                  maxVotes = count;
                  eliminatedPlayerId = pid;
                }
              });

              // Check for tie
              const winners = Object.entries(tally).filter(([_, count]) => count === maxVotes);
              if (winners.length === 1 && eliminatedPlayerId) {
                const elPlayer = mapRooms[roomId].players[eliminatedPlayerId];
                if (elPlayer) {
                  elPlayer.isAlive = false;

                  // Update DB playerState to isAlive: false
                  try {
                    const room = await Room.findById(roomId).populate("playersState.user", "username");
                    if (room) {
                      const match = room.playersState.find(p => p.user && p.user.username === elPlayer.username);
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
                    ...elPlayer
                  });

                  io.to(roomId).emit("receive-chat", {
                    sender: "System",
                    text: `${elPlayer.username || 'A player'} was voted out and eliminated.`,
                    color: "#ff3344",
                    ts: Date.now()
                  });
                }
              } else {
                io.to(roomId).emit("receive-chat", {
                  sender: "System",
                  text: `No one was eliminated (tie or no votes cast).`,
                  color: "#ffaa33",
                  ts: Date.now()
                });
              }

              // Reset votes
              mapRooms[roomId].votes = {};
              io.to(roomId).emit("vote-update", { tally: {} });

              // Switch to NIGHT
              mapRooms[roomId].phase = "NIGHT";
              mapRooms[roomId].timer = 60;
            } else {
              // Switch to DAY
              mapRooms[roomId].phase = "DAY";
              mapRooms[roomId].timer = 165;
              mapRooms[roomId].day += 1;
            }

            // Sync database room state
            try {
              await Room.findByIdAndUpdate(roomId, {
                gameState: mapRooms[roomId].phase,
                currentDay: mapRooms[roomId].day
              });
            } catch (dbErr) {
              console.error("[Socket] DB update error on phase change:", dbErr);
            }

            // Broadcast phase change
            io.to(roomId).emit("phase-change", {
              phase: mapRooms[roomId].phase,
              day: mapRooms[roomId].day,
              timer: mapRooms[roomId].timer
            });
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
        ...positionData
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
        socket.to(roomId).emit("player-updated", {
          id: socket.id,
          ...mapRooms[roomId].players[socket.id],
        });
      }
    });

    socket.on("cast-vote", (roomId, { targetId }) => {
      if (mapRooms[roomId]) {
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
      socket.to(roomId).emit("receive-chat", { id: socket.id, ...messageData });
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