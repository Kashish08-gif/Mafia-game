/**
 * GameOverScreen.jsx
 * ─────────────────────────────────────────────────────────────────
 * Full-screen Game Over overlay with dynamic confetti/particles,
 * glowing victory/defeat medallions, animated standings, and gamified CTA.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Skull, Users, Crown, X, LogOut, Sparkles } from "lucide-react";
import FloatingParticles from "../common/FloatingParticles";

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
    ? {
        label: "VICTORY ACHIEVED!",
        theme: "dawn",
        icon: <Trophy size={64} color="#fbbf24" />,
        color: "#fbbf24",
        subColor: "#fef08a",
        border: "rgba(251, 191, 36, 0.6)",
        glow: "rgba(251, 191, 36, 0.4)",
        bgGradient: "linear-gradient(145deg, rgba(38, 28, 4, 0.95) 0%, rgba(14, 10, 2, 0.98) 100%)",
      }
    : isDraw
    ? {
        label: "STALEMATE DRAW",
        theme: "villager",
        icon: <Users size={64} color="#94a3b8" />,
        color: "#94a3b8",
        subColor: "#cbd5e1",
        border: "rgba(148, 163, 184, 0.5)",
        glow: "rgba(148, 163, 184, 0.25)",
        bgGradient: "linear-gradient(145deg, rgba(20, 20, 30, 0.95) 0%, rgba(8, 8, 14, 0.98) 100%)",
      }
    : {
        label: "DEFEAT SUFFERED",
        theme: "eliminated",
        icon: <Skull size={64} color="#ff3344" />,
        color: "#ff4455",
        subColor: "#fca5a5",
        border: "rgba(255, 51, 68, 0.6)",
        glow: "rgba(255, 51, 68, 0.4)",
        bgGradient: "linear-gradient(145deg, rgba(38, 6, 12, 0.95) 0%, rgba(14, 2, 5, 0.98) 100%)",
      };

  const winnerLabel = winner === "MAFIA" ? "🔪 MAFIA SYNDICATE DOMINATES" : winner === "TOWN" ? "🏘️ TOWN CITIZENS TRIUMPH" : "DRAW - NO FACTION PREVAILED";
  const winnerColor = winner === "MAFIA" ? "#ff4455" : winner === "TOWN" ? "#34d399" : "#94a3b8";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 400,
          background: "radial-gradient(ellipse at center, rgba(10, 3, 18, 0.96) 0%, rgba(0, 0, 4, 0.99) 100%)",
          backdropFilter: "blur(14px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 16px",
          overflowY: "auto",
          fontFamily: "'Cinzel', 'Outfit', 'Inter', system-ui, sans-serif",
        }}
      >
        <FloatingParticles theme={winCfg.theme} density={40} />

        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.6 }}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 580,
            textAlign: "center",
            background: winCfg.bgGradient,
            border: `2px solid ${winCfg.border}`,
            borderRadius: 28,
            padding: "36px 32px",
            boxShadow: `0 0 60px ${winCfg.glow}, inset 0 0 40px rgba(0,0,0,0.85)`,
            zIndex: 10,
          }}
        >
          {/* Day Label */}
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.2em",
              fontWeight: 800,
              marginBottom: 16,
              textTransform: "uppercase",
            }}
          >
            GAME RESOLUTION • DAY {day}
          </div>

          {/* Animated Victory/Defeat Icon Core */}
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              boxShadow: [
                `0 0 25px ${winCfg.glow}`,
                `0 0 50px ${winCfg.glow}`,
                `0 0 25px ${winCfg.glow}`,
              ],
            }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 75%)",
              border: `2.5px solid ${winCfg.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            {winCfg.icon}
          </motion.div>

          {/* Personal Result */}
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: winCfg.color,
              letterSpacing: "0.1em",
              marginBottom: 6,
              textShadow: `0 0 20px ${winCfg.glow}`,
              textTransform: "uppercase",
            }}
          >
            {winCfg.label}
          </div>

          {/* Global Winner */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: winnerColor,
              letterSpacing: "0.08em",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            {winnerLabel}
          </div>

          {/* Reason */}
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 24,
              maxWidth: 420,
              margin: "0 auto 24px",
              lineHeight: 1.5,
            }}
          >
            {reason}
          </div>

          {/* Standings Grid */}
          <div
            style={{
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 18,
              padding: "16px 18px",
              marginBottom: 24,
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.15em",
                fontWeight: 800,
                marginBottom: 12,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                paddingBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
                textTransform: "uppercase",
              }}
            >
              <Users size={13} />
              FINAL TOWN ROSTER & ALIGNMENTS
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 8,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {players.map((p) => {
                const pRole = (p.role || "villager").toLowerCase();
                const pIsMafia = pRole === "mafia";
                const pWon = (winner === "MAFIA" && pIsMafia) || (winner === "TOWN" && !pIsMafia);
                const isMe = p.id === myId;

                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: isMe ? "rgba(124, 58, 237, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      border: `1px solid ${isMe ? "#7c3aed88" : "rgba(255, 255, 255, 0.08)"}`,
                      borderRadius: 12,
                      opacity: p.isAlive === false ? 0.7 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: p.color || "#666",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 900,
                        color: "#000",
                        border: `2px solid ${ROLE_COLOR[pRole] || "#fff"}`,
                        flexShrink: 0,
                        position: "relative",
                      }}
                    >
                      {p.isAlive === false && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0.65)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                          }}
                        >
                          💀
                        </div>
                      )}
                      {(p.username || "?")[0].toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#fff",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.username}
                        {isMe && (
                          <span
                            style={{
                              marginLeft: 5,
                              fontSize: 9,
                              background: "#7c3aed",
                              padding: "1px 5px",
                              borderRadius: 4,
                              fontWeight: 900,
                            }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: ROLE_COLOR[pRole] || "#aaa",
                          marginTop: 1,
                          fontWeight: 700,
                        }}
                      >
                        {ROLE_EMOJI[pRole]} {pRole.toUpperCase()}
                      </div>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 900 }}>
                      {pWon ? "🏆" : isDraw ? "🤝" : "❌"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gamified Exit Button */}
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(124, 58, 237, 0.7)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setLeaving(true); onLeave?.(); }}
            disabled={leaving}
            style={{
              padding: "14px 44px",
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 16,
              color: "#fff",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: "1.5px",
              cursor: leaving ? "not-allowed" : "pointer",
              boxShadow: "0 6px 25px rgba(124, 58, 237, 0.5)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textTransform: "uppercase",
            }}
          >
            <LogOut size={16} />
            <span>{leaving ? "RETURNING TO LOBBY..." : "RETURN TO LOBBY"}</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
