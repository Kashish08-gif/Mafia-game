/**
 * MorningAnnouncement.jsx
 * ─────────────────────────────────────────────────────────────────
 * Cinematic modal that appears after every Night resolution.
 * Shows who was killed (or Doctor saved everyone, or peaceful night).
 * Auto-dismisses after 8 s or on click.
 */

import { useEffect, useState } from "react";
import { Sun, Shield, Skull, X } from "lucide-react";

export default function MorningAnnouncement({ data, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const [animOut, setAnimOut] = useState(false);

  // Auto-dismiss after 8 s
  useEffect(() => {
    const t = setTimeout(() => dismiss(), 8000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setAnimOut(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 400);
  };

  if (!visible || !data) return null;

  const { eliminatedPlayer, isSaved, day } = data;
  const isKill = !!eliminatedPlayer && !isSaved;
  const isSave = isSaved;

  const config = isKill
    ? {
        icon: <Skull size={56} color="#ff3344" />,
        headline: "DAWN BREAKS...",
        sub: `${eliminatedPlayer.username} was found dead!`,
        roleText: eliminatedPlayer.role
          ? `They were the ${eliminatedPlayer.role.toUpperCase()}`
          : null,
        border: "rgba(255,51,68,0.5)",
        glow: "rgba(255,51,68,0.2)",
        headlineColor: "#ff3344",
        bg: "rgba(255,0,0,0.06)",
      }
    : isSave
    ? {
        icon: <Shield size={56} color="#44cc88" />,
        headline: "DAWN BREAKS...",
        sub: "The Doctor intervened! Nobody was killed tonight.",
        roleText: null,
        border: "rgba(68,204,136,0.5)",
        glow: "rgba(68,204,136,0.2)",
        headlineColor: "#44cc88",
        bg: "rgba(68,204,136,0.06)",
      }
    : {
        icon: <Sun size={56} color="#ffd700" />,
        headline: "DAWN BREAKS...",
        sub: "A peaceful night — nobody was killed.",
        roleText: null,
        border: "rgba(255,215,0,0.4)",
        glow: "rgba(255,215,0,0.15)",
        headlineColor: "#ffd700",
        bg: "rgba(255,215,0,0.04)",
      };

  return (
    <>
      <style>{`
        @keyframes ma-in {
          from { opacity: 0; transform: scale(0.88) translateY(30px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes ma-out {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.94) translateY(-20px); }
        }
        @keyframes ma-pulse {
          0%, 100% { box-shadow: 0 0 40px ${config.glow}, 0 24px 80px rgba(0,0,0,0.7); }
          50%       { box-shadow: 0 0 80px ${config.glow}, 0 24px 80px rgba(0,0,0,0.7); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0, zIndex: 350,
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: animOut ? "ma-out 0.4s ease forwards" : "ma-in 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards",
        }}
      >
        {/* Panel */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "linear-gradient(180deg, rgba(10,5,20,0.98) 0%, rgba(3,1,8,1) 100%)",
            border: `1.5px solid ${config.border}`,
            borderRadius: 24,
            padding: "40px 48px",
            minWidth: 380,
            maxWidth: 480,
            textAlign: "center",
            position: "relative",
            background: config.bg,
            animation: "ma-pulse 2.5s ease-in-out infinite",
          }}
        >
          {/* Close */}
          <button
            onClick={dismiss}
            style={{
              position: "absolute", top: 14, right: 14,
              background: "rgba(255,255,255,0.08)", border: "none",
              borderRadius: "50%", width: 28, height: 28,
              cursor: "pointer", color: "#888",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>

          {/* Day label */}
          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.18em", fontWeight: 800,
            marginBottom: 20,
          }}>
            MORNING OF DAY {day}
          </div>

          {/* Icon */}
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: `${config.glow.replace("0.2", "0.08")}`,
            border: `2px solid ${config.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 22px",
            boxShadow: `0 0 32px ${config.glow}`,
          }}>
            {config.icon}
          </div>

          {/* Headline */}
          <div style={{
            fontSize: 11, letterSpacing: "0.18em",
            color: config.headlineColor, fontWeight: 900,
            marginBottom: 12,
          }}>
            {config.headline}
          </div>

          {/* Sub */}
          <div style={{
            fontSize: 18, fontWeight: 800, color: "#fff",
            lineHeight: 1.4, marginBottom: config.roleText ? 10 : 0,
          }}>
            {config.sub}
          </div>

          {/* Role reveal */}
          {config.roleText && (
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 8,
            }}>
              {config.roleText}
            </div>
          )}

          {/* Dismiss hint */}
          <div style={{
            marginTop: 24, fontSize: 11, color: "rgba(255,255,255,0.22)",
            letterSpacing: "0.08em",
          }}>
            Click anywhere to continue · auto-closes in 8s
          </div>
        </div>
      </div>
    </>
  );
}
