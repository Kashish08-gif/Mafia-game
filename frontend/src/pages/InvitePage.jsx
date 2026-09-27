import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoomByCode, joinRoom } from "../services/roomService.js";

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRoom = async () => {
      try {
      const response = await getRoomByCode(token);

        setRoom(response.data.room);
      } catch (error) {
        console.error("Error finding room:", error);
        setError("Room not found or invite link is invalid.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [token]);

  const handleJoin = async () => {
    try {
      const authToken = localStorage.getItem("token");

      const response = await joinRoom(authToken, room._id);

      navigate(`/lobby/${response.data.room._id}`);
    } catch (error) {
      console.error("Join room error:", error);
      setError(
        error.response?.data?.error || "Unable to join the room."
      );
    }
  };

  if (loading) {
    return <h2>Finding room...</h2>;
  }

  if (error) {
    return (
      <div>
        <h2>Invitation Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>You're Invited!</h1>

      <p>
        Room Name: <strong>{room.roomName}</strong>
      </p>

      <p>
        Room Code: <strong>{room.roomCode}</strong>
      </p>

      <p>
        Players: {room.users?.length} / {room.totalPlayers}
      </p>

      <button onClick={handleJoin}>
        Join Room
      </button>
    </div>
  );
}