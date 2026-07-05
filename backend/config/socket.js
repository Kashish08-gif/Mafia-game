import { Server } from "socket.io";

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

    socket.on("join-map", (roomId, userData) => {
      currentRoomId = roomId;
      socket.join(roomId);
      if (!mapRooms[roomId]) {
        mapRooms[roomId] = {
          players: {},
          phase: "DAY",
          day: 1,
          timer: 165
        };
      }
      mapRooms[roomId].players[socket.id] = {
        id: socket.id,
        ...userData,
        isAlive: userData.isAlive !== false
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
    });

    socket.on("player-move", (roomId, positionData) => {
      if (mapRooms[roomId] && mapRooms[roomId].players[socket.id]) {
        mapRooms[roomId].players[socket.id].position = positionData.position;
        mapRooms[roomId].players[socket.id].rotation = positionData.rotation;
        mapRooms[roomId].players[socket.id].walking = true;
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

    socket.on("send-chat", (roomId, messageData) => {
      io.to(roomId).emit("receive-chat", { id: socket.id, ...messageData });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      if (currentRoomId && mapRooms[currentRoomId]) {
        delete mapRooms[currentRoomId].players[socket.id];
        io.to(currentRoomId).emit("player-left", { id: socket.id });
        if (Object.keys(mapRooms[currentRoomId].players).length === 0) {
          delete mapRooms[currentRoomId];
        }
      }
    });
  });

  return io;
};