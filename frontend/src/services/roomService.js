import axios from "axios";

const api = axios.create({
  baseURL:`${import.meta.env.VITE_API_URL}/api`,
});

const createRoom = (token, data) =>
  api.post("/room/rooms", data, {
    headers: { Authorization: `Bearer ${token}` },
  });

const getRooms = (token, params = {}) =>
  api.get("/room/rooms", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });

const getRoomDetails = (token, roomId) =>
  api.get(`/room/rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

const getRoomByCode = (roomCode) =>
  api.get(`/invite/room/${roomCode}`);

const joinRoom = (token, roomId) =>
  api.post(
    `/room/rooms/${roomId}/join`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

const leaveRoom = (token, roomId) =>
  api.post(
    `/room/rooms/${roomId}/leave`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

const startGame = (token, roomId) =>
  api.post(
    `/room/rooms/${roomId}/start`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

export {
  createRoom,
  getRooms,
  getRoomDetails,
  getRoomByCode,
  joinRoom,
  leaveRoom,
  startGame,
};