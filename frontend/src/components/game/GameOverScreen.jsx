/**
 * GameOverScreen.jsx
 * ─────────────────────────────────────────────────────────────────
 * Full-screen Game Over overlay.
 *
 * Props:
 *   data        — { winner: "MAFIA"|"TOWN"|"DRAW", reason, players, day }
 *   myId        — socket id of local player (to highlight "YOU")
 *   myRole      — local player role (for win/loss determination)
 *   onLeave     — callback when user clicks "LEAVE GAME"
 */

import { useState } from "react";
import { Trophy, Skull, Users, Crown, X } from "lucide-react";

const ROLE_EMOJI = { mafia: "🔪", police: "🛡️", doctor: "💊", villager: "👤" };
const ROLE_COLOR = { mafia: "#ff3344", police: "#4488ff", doctor: "#44cc88", villager: "#aaa" };

export default function GameOverScreen({ data, myId, myRole, onLeave }) {
  const [leaving, setLeaving] = useState(false);

  if (!data) return null;

  const { winner, reason, players = [], day = 1 } = data;
  const localRole = (myRole || "villager").toLowerCase();
  const isMafia = localRole === "mafia";
  const didWin =
    (winner === "MAFIA" && isMafia) || (winner === "TOWN" && !isMafia);
  const isDraw = winner === "DRAW";

  const winCfg = didWin
    ? { label: "VICTORY!", emoji: "🏆", color: "#ffd700", subColor: "#ffe580", bg: "rgba(255,215,0,0.06)" }
    : isDraw
    ? { label: "DRAW", emoji: "🤝", color: "#aaa", subColor: "#ccc", bg: "rgba(170,170,170,0.05)" }
    : { label: "DEFEAT", emoji: "💀", color: "#ff3344", subColor: "#ff7788", bg: "rgba(255,51,68,0.06)" };

  const winnerLabel = winner === "MAFIA" ? "🔪 MAFIA WINS" : winner === "TOWN" ? "🏘️ TOWN WINS" : "DRAW";
  const winnerColor = winner === "MAFIA" ? "#ff3344" : winner === "TOWN" ? "#44cc88" : "#aaa";

  return (
    <>
      <style>{`
        @keyframes go-in {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes go-glow {
          0%, 100% { text-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
          50%       { text-shadow: 0 0 40px currentColor, 0 0 80px currentColor; }
        }
        @keyframes go-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "linear-gradient(180deg, rgba(2,0,10,0.97) 0%, rgba(0,0,5,0.99) 100%)",
        backdropFilter: "blur(8px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        animation: "go-in 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards",
        padding: "20px 16px",
        overflowY: "auto",
      }}>
        {/* Background radial glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at 50% 40%, ${winnerColor}18 0%, transparent 65%)`,
        }} />

        <div style={{ position: "relative", width: "100%", maxWidth: 540, textAlign: "center" }}>
          {/* Day label */}
          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.2em", fontWeight: 800, marginBottom: 20,
          }}>
            GAME ENDED ON DAY {day}
          </div>

          {/* Big emoji */}
          <div style={{
            fontSize: 72, marginBottom: 10,
            animation: "go-float 3s ease-in-out infinite",
          }}>
            {winCfg.emoji}
          </div>

          {/* Personal result */}
          <div style={{
            fontSize: 36, fontWeight: 900, color: winCfg.color,
            letterSpacing: "0.1em",
            animation: "go-glow 2.5s ease-in-out infinite",
            marginBottom: 6,
          }}>
            {winCfg.label}
          </div>

          {/* Global winner */}
          <div style={{
            fontSize: 16, fontWeight: 800, color: winnerColor,
            marginBottom: 6,
          }}>
            {winnerLabel}
          </div>

          {/* Reason */}
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.45)",
            marginBottom: 30, maxWidth: 380, margin: "0 auto 30px",
          }}>
            {reason}
          </div>

          {/* Player result grid */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18, padding: "18px 20px",
            marginBottom: 28,
          }}>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.12em", fontWeight: 800,
              marginBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)",
              paddingBottom: 10,
            }}>
              <Users size={12} style={{ marginRight: 6 }} />
              FINAL STANDINGS
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
            }}>
              {players.map((p) => {
                const pRole = (p.role || "villager").toLowerCase();
                const pIsMafia = pRole === "mafia";
                const pWon = (winner === "MAFIA" && pIsMafia) || (winner === "TOWN" && !pIsMafia);
                const isMe = p.id === myId;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px",
                      background: isMe ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isMe ? "#7c3aed66" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 12,
                      opacity: p.isAlive === false ? 0.65 : 1,
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: p.color || "#666",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 900, color: "#000",
                      border: `2px solid ${ROLE_COLOR[pRole] || "#fff"}`,
                      flexShrink: 0,
                      position: "relative",
                    }}>
                      {p.isAlive === false && (
                        <div style={{
                          position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
                          borderRadius: "50%", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 14,
                        }}>💀</div>
                      )}
                      {(p.username || "?")[0].toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: "#fff",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {p.username}
                        {isMe && (
                          <span style={{
                            marginLeft: 5, fontSize: 8,
                            background: "#7c3aed", padding: "1px 5px",
                            borderRadius: 4, fontWeight: 800,
                          }}>YOU</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 11, color: ROLE_COLOR[pRole] || "#aaa",
                        marginTop: 2, display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {ROLE_EMOJI[pRole]} {pRole.toUpperCase()}
                      </div>
                    </div>

                    <div style={{ fontSize: 14 }}>
                      {pWon ? "✅" : isDraw ? "🤝" : "❌"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave button */}
          <button
            onClick={() => { setLeaving(true); onLeave?.(); }}
            disabled={leaving}
            style={{
              padding: "14px 40px",
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              border: "none", borderRadius: 14,
              color: "#fff", fontSize: 14, fontWeight: 900,
              letterSpacing: "0.1em", cursor: leaving ? "not-allowed" : "pointer",
              boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
              transition: "all 0.2s",
              opacity: leaving ? 0.7 : 1,
            }}
          >
            {leaving ? "LEAVING..." : "LEAVE GAME"}
          </button>
        </div>
      </div>
    </>
  );
}
