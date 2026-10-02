/**
 * SpectatorHUD.jsx
 * ─────────────────────────────────────────────────────────────────
 * Free Fire / CS:GO / Among Us style Spectator overlay.
 * Rendered when the local player is dead (isAlive === false).
 *
 * Features:
 *   - Current inspected player card (avatar, username, status)
 *   - Prev / Next buttons with [Q] and [E] keyboard shortcuts
 *   - Quick-select roster of all alive players
 *   - Ghost spectator badge & privacy indicators
 */

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Eye, ShieldAlert, Users, Radio } from "lucide-react";

export default function SpectatorHUD({
  alivePlayers = [],
  currentInspectIndex = 0,
  onSelectIndex,
  onPrev,
  onNext,
  myRole,
  isNight = false,
}) {
  const currentTarget = alivePlayers[currentInspectIndex] || null;

  // Keyboard navigation for spectating
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if (e.key === "q" || e.key === "Q" || e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev?.();
      } else if (e.key === "e" || e.key === "E" || e.key === "ArrowRight") {
        e.preventDefault();
        onNext?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrev, onNext]);

  return (
    <>
      <style>{`
        @keyframes spectate-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.2); }
          50%       { box-shadow: 0 0 30px rgba(255, 215, 0, 0.45); }
        }
        @keyframes live-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.3); opacity: 0.6; }
        }
      `}</style>

      {/* Top Center Ghost Banner */}
      <div
        style={{
          position: "fixed",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "linear-gradient(135deg, rgba(20, 6, 28, 0.94) 0%, rgba(10, 3, 16, 0.98) 100%)",
            border: "1.5px solid rgba(255, 215, 0, 0.4)",
            borderRadius: 30,
            padding: "8px 22px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.75), 0 0 20px rgba(255, 215, 0, 0.15)",
            color: "#ffd700",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ fontSize: 16 }}>👻</span>
          <span>SPECTATOR MODE (GHOST)</span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#44cc88",
              boxShadow: "0 0 8px #44cc88",
              animation: "live-pulse 1.8s ease-in-out infinite",
            }}
          />
        </div>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            padding: "3px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.65)",
            fontWeight: 600,
          }}
        >
          Muted to Living Players • Classified Intel Protected
        </div>
      </div>

      {/* Bottom Center Free Fire Style Spectator Navigation Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          pointerEvents: "auto",
        }}
      >
        {/* Quick Alive Players Carousel Dots */}
        {alivePlayers.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(8, 3, 14, 0.88)",
              backdropFilter: "blur(10px)",
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}
          >
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700, marginRight: 4 }}>
              SURVIVORS ({alivePlayers.length}):
            </span>
            {alivePlayers.map((p, idx) => {
              const isSelected = idx === currentInspectIndex;
              return (
                <button
                  key={p.id || idx}
                  onClick={() => onSelectIndex?.(idx)}
                  title={`Inspect ${p.username}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 12,
                    background: isSelected
                      ? `linear-gradient(135deg, ${p.color || "#ffd700"}44, ${p.color || "#ffd700"}22)`
                      : "rgba(255, 255, 255, 0.05)",
                    border: isSelected
                      ? `1.5px solid ${p.color || "#ffd700"}`
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    color: isSelected ? "#fff" : "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    fontWeight: isSelected ? 800 : 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: p.color || "#fff",
                      boxShadow: isSelected ? `0 0 6px ${p.color || "#fff"}` : "none",
                    }}
                  />
                  <span>{p.username}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Spectator Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "linear-gradient(160deg, rgba(22, 8, 32, 0.96) 0%, rgba(8, 2, 12, 0.98) 100%)",
            backdropFilter: "blur(14px)",
            border: "1.5px solid rgba(255, 215, 0, 0.35)",
            borderRadius: 22,
            padding: "10px 18px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.12)",
            minWidth: 380,
            justifyContent: "space-between",
          }}
        >
          {/* Previous Player Button */}
          <button
            onClick={onPrev}
            disabled={alivePlayers.length <= 1}
            title="Inspect previous player (Q or Left Arrow)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffd700",
              fontSize: 12,
              fontWeight: 800,
              cursor: alivePlayers.length > 1 ? "pointer" : "default",
              opacity: alivePlayers.length > 1 ? 1 : 0.4,
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              if (alivePlayers.length > 1) {
                e.currentTarget.style.background = "rgba(255, 215, 0, 0.15)";
                e.currentTarget.style.borderColor = "#ffd700";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
            }}
          >
            <ChevronLeft size={18} />
            <span>[Q] PREV</span>
          </button>

          {/* Inspected Player Profile */}
          {currentTarget ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "4px 8px",
              }}
            >
              {/* Player Avatar */}
              <div
                style={{
                  position: "relative",
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: currentTarget.color || "#4488ff",
                  border: "2px solid #fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#000",
                  boxShadow: `0 0 16px ${currentTarget.color || "#ffd700"}66`,
                  flexShrink: 0,
                }}
              >
                {currentTarget.username?.[0]?.toUpperCase() || "?"}
                <div
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#44cc88",
                    border: "2px solid #000",
                  }}
                />
              </div>

              {/* Player Text Info */}
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255, 215, 0, 0.8)",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Eye size={12} />
                  <span>SPECTATING</span>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: "#ffffff",
                    letterSpacing: "0.02em",
                  }}
                >
                  {currentTarget.username}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
              No surviving players to inspect
            </div>
          )}

          {/* Next Player Button */}
          <button
            onClick={onNext}
            disabled={alivePlayers.length <= 1}
            title="Inspect next player (E or Right Arrow)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffd700",
              fontSize: 12,
              fontWeight: 800,
              cursor: alivePlayers.length > 1 ? "pointer" : "default",
              opacity: alivePlayers.length > 1 ? 1 : 0.4,
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              if (alivePlayers.length > 1) {
                e.currentTarget.style.background = "rgba(255, 215, 0, 0.15)";
                e.currentTarget.style.borderColor = "#ffd700";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
            }}
          >
            <span>NEXT [E]</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Instructions Hint */}
        <div
          style={{
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.45)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>
            <kbd style={{ background: "#222", padding: "2px 5px", borderRadius: 4, color: "#ffd700" }}>Q</kbd> /{" "}
            <kbd style={{ background: "#222", padding: "2px 5px", borderRadius: 4, color: "#ffd700" }}>E</kbd> Switch Player
          </span>
          <span>•</span>
          <span>
            <kbd style={{ background: "#222", padding: "2px 5px", borderRadius: 4, color: "#ffd700" }}>RMB</kbd> Orbit Camera
          </span>
        </div>
      </div>
    </>
  );
}
