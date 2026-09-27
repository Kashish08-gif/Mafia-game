import React from "react";
import {
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./GameEndScreen.css";
const RANKS = [
  {
    name: "Bronze",
    levels: [3, 2, 1],
    minPoints: 0,
    maxPoints: 99,
    color: "#cd7f32",
    icon: "🛡️",
  },
  {
    name: "Silver",
    levels: [2, 1],
    minPoints: 100,
    maxPoints: 199,
    color: "#c0c0c0",
    icon: "⚔️",
  },
  {
    name: "Gold",
    levels: [3, 2, 1],
    minPoints: 200,
    maxPoints: 299,
    color: "#ffd700",
    icon: "👑",
  },
  {
    name: "Platinum",
    levels: [3, 2, 1],
    minPoints: 300,
    maxPoints: 399,
    color: "#7dd3fc",
    icon: "💎",
  },
  {
    name: "Master",
    levels: [4, 3, 2, 1],
    minPoints: 400,
    maxPoints: 499,
    color: "#a855f7",
    icon: "🔥",
  },
  {
    name: "Grandmaster",
    levels: [3, 2, 1],
    minPoints: 500,
    maxPoints: Infinity,
    color: "#ef4444",
    icon: "👑",
  },
];

// Get current rank based on points
function getRank(points) {
  const rank = RANKS.find(
    (item) =>
      points >= item.minPoints &&
      points <= item.maxPoints
  );

  if (!rank) {
    return {
      ...RANKS[0],
      level: RANKS[0].levels[0],
    };
  }

  const progress = points - rank.minPoints;

  const levelIndex = Math.min(
    Math.floor(progress / 34),
    rank.levels.length - 1
  );

  return {
    ...rank,
    level: rank.levels[levelIndex],
  };
}

// Get next rank
function getNextRank(points) {
  for (let i = 0; i < RANKS.length; i++) {
    if (points < RANKS[i].minPoints) {
      return {
        ...RANKS[i],
        level: RANKS[i].levels[0],
      };
    }
  }

  return null;
}

function GameEndScreen() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Get game result data
  const gameResult = location.state || {};

  const {
    winner = "mafia",
    pointsEarned = 50,
    totalPoints = 80,
    kills = 0,
    survived = 0,
  } = gameResult;

  // Calculate new total points
  const newTotalPoints = totalPoints + pointsEarned;

  // Buttons
  const handlePlayAgain = () => {
    navigate(`/lobby/${roomId}`);
  };

  const handleBackToLobby = () => {
    navigate(`/lobby/${roomId}`);
  };

  // Rank information
  const currentRank = getRank(newTotalPoints);
  const previousRank = getRank(totalPoints);
  const nextRank = getNextRank(newTotalPoints);

  // Winner
  const mafiaWon = winner === "mafia";

  // Check whether rank changed
  const rankChanged =
    previousRank.name !== currentRank.name ||
    previousRank.level !== currentRank.level;

  return (
    <div
      className={`game-end ${
        mafiaWon ? "mafia-theme" : "villager-theme"
      }`}
    >
      {/* Background */}
      <div className="fog fog-one"></div>
      <div className="fog fog-two"></div>

      <div className="game-end-container">

        {/* Top Logo */}
        <div className="game-logo">
          <div className="logo-icon">
            {mafiaWon ? "☠" : "🛡"}
          </div>

          <div>
            <h3>MAFIA GAME</h3>

            <span>
              {mafiaWon
                ? "THE CITY NEVER SLEEPS"
                : "TRUST · DISCOVER · SURVIVE"}
            </span>
          </div>
        </div>

        {/* Winner Icon */}
        <div className="winner-icon">
          {mafiaWon ? "☠" : "🛡"}
        </div>

        {/* Winner Text */}
        <h1 className="winner-title">
          {mafiaWon ? "MAFIA WINS" : "VILLAGERS WIN"}
        </h1>

        <p className="winner-subtitle">
          {mafiaWon
            ? "The city has fallen into darkness."
            : "The Mafia has been eliminated."}
        </p>

        {/* Points */}
        <div className="points-box">
          <div className="coin">★</div>

          <div>
            <strong>+{pointsEarned}</strong>
            <span>POINTS</span>
          </div>
        </div>

        {/* Rank Progression */}
        <div className="rank-section">

          <div className="section-title">
            <span></span>
            <p>RANK PROGRESSION</p>
            <span></span>
          </div>

          <div className="rank-progression">

            {/* Previous Rank */}
            <div className="rank-card">

              <div
                className="rank-badge"
                style={{
                  borderColor: previousRank.color,
                  boxShadow: `0 0 25px ${previousRank.color}`,
                }}
              >
                <span>{previousRank.icon}</span>
              </div>

              <h3>
                {previousRank.name} {previousRank.level}
              </h3>

              <p>Previous</p>
            </div>

            {/* Arrow */}
            <div className="rank-arrow">
              <span>»</span>
            </div>

            {/* Current Rank */}
            <div className="rank-card">

              <div
                className="rank-badge"
                style={{
                  borderColor: currentRank.color,
                  boxShadow: `0 0 30px ${currentRank.color}`,
                }}
              >
                <span>{currentRank.icon}</span>
              </div>

              <h3>
                {currentRank.name} {currentRank.level}
              </h3>

              <p>Current</p>
            </div>
          </div>

          {/* Rank Change */}
          {rankChanged ? (
            <div className="rank-up">
              ⬆ RANK UP!
            </div>
          ) : (
            <div className="rank-same">
              Keep playing to reach the next rank
            </div>
          )}

        </div>

        {/* Stats */}
        <div className="stats-box">

          {/* Kills */}
          <div className="stat">
            <div className="stat-icon">☠</div>

            <span>KILLS</span>

            <strong>{kills}</strong>
          </div>

          {/* Survived */}
          <div className="stat">
            <div className="stat-icon">👥</div>

            <span>SURVIVED</span>

            <strong>{survived}</strong>
          </div>

          {/* Total Points */}
          <div className="stat">
            <div className="stat-icon">★</div>

            <span>TOTAL POINTS</span>

            <strong>{newTotalPoints}</strong>
          </div>

        </div>

        {/* Buttons */}
        <div className="action-buttons">

          <button
            className="play-again-btn"
            onClick={handlePlayAgain}
          >
            <span>↻</span>
            PLAY AGAIN
          </button>

          <button
            className="lobby-btn"
            onClick={handleBackToLobby}
          >
            <span>▣</span>
            BACK TO LOBBY
          </button>

        </div>

        {/* Bottom Text */}
        <div className="bottom-text">
          {mafiaWon
            ? "SAME PLAYERS · NEW STORIES · HIGHER RANKS"
            : "TOGETHER · WE ARE STRONGER"}
        </div>

      </div>
    </div>
  );
}

export default GameEndScreen;