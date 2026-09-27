import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./GameEndScreen.css";
import mafiaBg from "../assets/image.png";

const GameEndScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // TESTING:
  // Change to "mafia" to test Mafia.
  // Change to "villagers" to test Villagers.
const winner = "mafia";

  const isMafiaWin = winner === "mafia";

  const data = isMafiaWin
    ? {
        title: "MAFIA WINS",
        subtitle: "THE CITY HAS FALLEN INTO DARKNESS",
        icon: "☠",
        points: 50,
        currentRank: "BRONZE 2",
        nextRank: "BRONZE 1",
        kills: 2,
        survived: 4,
        totalPoints: 130,
        bottomText: "SAME PLAYERS • NEW STORIES • HIGHER RANKS",
      }
    : {
        title: "VILLAGERS WIN",
        subtitle: "THE MAFIA HAS BEEN ELIMINATED",
        icon: "♟",
        points: 50,
        currentRank: "SILVER 1",
        nextRank: "GOLD 3",
        kills: 1,
        survived: 6,
        totalPoints: 180,
        bottomText: "TOGETHER • WE ARE STRONGER",
      };

  useEffect(() => {
    // Small horror sound/vibration effect if supported
    document.body.classList.add("game-end-active");

    return () => {
      document.body.classList.remove("game-end-active");
    };
  }, []);

  const handlePlayAgain = () => {
    navigate("/lobby");
  };

  const handleBackToLobby = () => {
    navigate("/lobby");
  };

  return (
   <div
  className="game-end-screen"
  style={{ backgroundImage: `url(${mafiaBg})` }}
>
      {/* =========================================
          HORROR BACKGROUND
      ========================================= */}

      <div className="horror-background">

        <div className="moon"></div>

        <div className="fog fog-one"></div>
        <div className="fog fog-two"></div>
        <div className="fog fog-three"></div>

        <div className="blood-cloud"></div>

        <div className="shadow-person">
          <div className="shadow-head"></div>
          <div className="shadow-body"></div>
        </div>

        <div className="grave grave-one"></div>
        <div className="grave grave-two"></div>
        <div className="grave grave-three"></div>

        <div className="tree tree-left"></div>
        <div className="tree tree-right"></div>

        {/* Flying birds */}
        <div className="bird bird-one">╲╱</div>
        <div className="bird bird-two">╲╱</div>
        <div className="bird bird-three">╲╱</div>

        {/* Rain */}
        <div className="rain"></div>
        <div className="rain rain-two"></div>
        <div className="rain rain-three"></div>

        {/* Floating dust */}
        <div className="particles"></div>
      </div>

      {/* =========================================
          DARK OVERLAY
      ========================================= */}

      <div className="horror-vignette"></div>

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="game-header">

        <div className="game-logo">

          <div className="logo-icon">
            {isMafiaWin ? "☠" : "♟"}
          </div>

          <div className="logo-text">
            <h2>MAFIA GAME</h2>

            <p>
              THE CITY NEVER SLEEPS
            </p>
          </div>

        </div>

      </header>

      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="end-content">

        {/* Winner Symbol */}

        <div className="winner-symbol-wrapper">

          <div className="winner-ring ring-one"></div>
          <div className="winner-ring ring-two"></div>

          <div className="winner-icon">
            {data.icon}
          </div>

        </div>

        {/* Winner Title */}

        <h1 className="winner-title">
          {data.title}
        </h1>

        {/* Blood line */}

        <div className="blood-line">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <p className="winner-subtitle">
          {data.subtitle}
        </p>

        {/* =========================================
            POINTS
        ========================================= */}

        <div className="points-box">

          <div className="points-glow"></div>

          <div className="coin">
            ★
          </div>

          <div className="points-text">

            <strong>
              +{data.points}
            </strong>

            <span>
              POINTS
            </span>

          </div>

        </div>

        {/* =========================================
            RANK PROGRESSION
        ========================================= */}

        <section className="rank-section">

          <div className="section-title">

            <span></span>

            <p>
              RANK PROGRESSION
            </p>

            <span></span>

          </div>

          <div className="rank-container">

            {/* Current */}

            <div className="rank-item">

              <div className="rank-badge">

                <span>★</span>

              </div>

              <h3>
                {data.currentRank}
              </h3>

              <p>
                CURRENT
              </p>

            </div>

            {/* Arrow */}

            <div className="rank-arrow">

              <span>»</span>
              <span>»</span>
              <span>»</span>

            </div>

            {/* Next */}

            <div className="rank-item">

              <div className="rank-badge next">

                <span>★</span>

              </div>

              <h3>
                {data.nextRank}
              </h3>

              <p>
                NEXT RANK
              </p>

            </div>

          </div>

        </section>

        {/* =========================================
            STATS
        ========================================= */}

        <section className="stats-box">

          <div className="stat">

            <div className="stat-icon">
              ☠
            </div>

            <span>
              KILLS
            </span>

            <strong>
              {data.kills}
            </strong>

          </div>

          <div className="stat">

            <div className="stat-icon">
              ♟
            </div>

            <span>
              SURVIVED
            </span>

            <strong>
              {data.survived}
            </strong>

          </div>

          <div className="stat">

            <div className="stat-icon">
              ★
            </div>

            <span>
              TOTAL POINTS
            </span>

            <strong>
              {data.totalPoints}
            </strong>

          </div>

        </section>

        {/* =========================================
            BUTTONS
        ========================================= */}

        <div className="button-container">

          <button
            className="horror-button play-again-btn"
            onClick={handlePlayAgain}
          >

            <span className="button-icon">
              ↻
            </span>

            <span>
              PLAY AGAIN
            </span>

          </button>

          <button
            className="horror-button lobby-btn"
            onClick={handleBackToLobby}
          >

            <span className="button-icon">
              ▣
            </span>

            <span>
              BACK TO LOBBY
            </span>

          </button>

        </div>

        {/* =========================================
            FOOTER
        ========================================= */}

        <p className="bottom-text">
          {data.bottomText}
        </p>

      </main>

    </div>
  );
};

export default GameEndScreen;