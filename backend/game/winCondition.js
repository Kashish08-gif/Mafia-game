import { Room } from "../models/room.js";
import { User } from "../models/user.js";

/**
 * Checks if a win condition has been met based on alive players.
 * @param {Object} players - Dict of players in the room (key: socketId, value: player object)
 * @returns {Object} { isGameOver: boolean, winner: 'MAFIA' | 'TOWN' | null, reason: string | null }
 */
export const checkWinCondition = (players) => {
  const activePlayers = Object.values(players || {});
  const alivePlayers = activePlayers.filter((p) => p.isAlive !== false);

  const aliveMafias = alivePlayers.filter((p) => (p.role || "").toLowerCase() === "mafia");
  const aliveTown = alivePlayers.filter((p) => (p.role || "").toLowerCase() !== "mafia");

  const mafiaCount = aliveMafias.length;
  const townCount = aliveTown.length;

  console.log(`[WinCheck] Alive Total: ${alivePlayers.length} (Mafia: ${mafiaCount}, Town: ${townCount})`);

  // Win Condition 1: All Mafia eliminated -> Town wins
  if (mafiaCount === 0 && townCount > 0) {
    return {
      isGameOver: true,
      winner: "TOWN",
      reason: "All Mafia members have been eliminated! The Town is safe.",
      aliveMafias: 0,
      aliveTown: townCount,
    };
  }

  // Win Condition 2: Mafia count >= Town count -> Mafia wins
  if (mafiaCount >= townCount && mafiaCount > 0) {
    return {
      isGameOver: true,
      winner: "MAFIA",
      reason: "Mafia has equaled or outnumbered the Town! The Mafia takes control.",
      aliveMafias: mafiaCount,
      aliveTown: townCount,
    };
  }

  // If literally everyone is dead (edge case)
  if (alivePlayers.length === 0) {
    return {
      isGameOver: true,
      winner: "DRAW",
      reason: "No survivors remain in the town.",
      aliveMafias: 0,
      aliveTown: 0,
    };
  }

  return {
    isGameOver: false,
    winner: null,
    reason: null,
    aliveMafias: mafiaCount,
    aliveTown: townCount,
  };
};

/**
 * Handles end-of-game procedure: updates MongoDB, awards stats/currency, and broadcasts game-over payload.
 */
export const handleGameOver = async (roomId, roomState, io, winResult) => {
  console.log(`[GameOver] Room ${roomId} ended. Winner: ${winResult.winner}. Reason: ${winResult.reason}`);

  roomState.phase = "GAME_OVER";
  roomState.subPhase = "GAME_OVER";
  roomState.timer = 0;

  if (roomState.interval) {
    clearInterval(roomState.interval);
    roomState.interval = null;
  }

  // Compile full player list with ALL roles revealed
  const allPlayers = Object.values(roomState.players || {}).map((p) => ({
    id: p.id,
    userId: p.userId || p._id,
    username: p.username,
    role: p.role || "villager",
    isAlive: p.isAlive !== false,
    color: p.color,
  }));

  // Update Database Room status
  try {
    await Room.findByIdAndUpdate(roomId, {
      gameState: "GAME_OVER",
      gameEnded: true,
    });
  } catch (err) {
    console.error(`[GameOver] Error updating room in DB:`, err);
  }

  // Award user stats in DB (async, non-blocking)
  try {
    for (const player of allPlayers) {
      if (!player.userId) continue;
      const isMafia = (player.role || "").toLowerCase() === "mafia";
      const didWin =
        (winResult.winner === "MAFIA" && isMafia) ||
        (winResult.winner === "TOWN" && !isMafia);

      const updateData = {
        $inc: {
          totalGamesPlayed: 1,
          totalGamesWon: didWin ? 1 : 0,
          coins: didWin ? 50 : 10,
          trophies: didWin ? 25 : -10,
        },
      };

      await User.findByIdAndUpdate(player.userId, updateData);
    }
  } catch (userErr) {
    console.error(`[GameOver] Error updating user game stats:`, userErr);
  }

  // Broadcast game-over event to all clients in the room
  io.to(roomId).emit("game-over", {
    winner: winResult.winner,
    reason: winResult.reason,
    players: allPlayers,
    day: roomState.day || 1,
  });

  // Also broadcast phase change
  io.to(roomId).emit("phase-change", {
    phase: "GAME_OVER",
    day: roomState.day || 1,
    timer: 0,
  });

  io.to(roomId).emit("receive-chat", {
    sender: "System",
    text: `🏆 GAME OVER! ${winResult.winner} WINS! ${winResult.reason}`,
    color: winResult.winner === "MAFIA" ? "#ff4444" : "#44ff88",
    ts: Date.now(),
    isSystem: true,
  });
};
