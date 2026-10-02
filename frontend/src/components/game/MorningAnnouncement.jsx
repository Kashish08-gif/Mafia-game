/**
 * MorningAnnouncement.jsx
 * ─────────────────────────────────────────────────────────────────
 * Cinematic modal that appears after every Night resolution.
 * Shows who was killed (or Doctor saved everyone, or peaceful night).
 * Auto-dismisses after 8 s or on click.
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Shield, Skull, X, Sparkles, AlertCircle } from "lucide-react";
import FloatingParticles from "../common/FloatingParticles";

export default function MorningAnnouncement({ data, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          dismiss();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  if (!visible || !data) return null;

  const { eliminatedPlayer, isSaved, day = 1 } = data;
  const isKill = !!eliminatedPlayer && !isSaved;
  const isSave = isSaved;

  const config = isKill
    ? {
        theme: "eliminated",
        icon: <Skull size={52} color="#ff3344" />,
        headline: "BLOOD AT DAWN",
        sub: `${eliminatedPlayer.username || "A Town Member"} was assassinated!`,
        badge: "CASUALTY CONFIRMED",
        roleText: eliminatedPlayer.role
          ? `Assigned Role: ${eliminatedPlayer.role.toUpperCase()}`
          : null,
        border: "rgba(255, 51, 68, 0.6)",
        glow: "rgba(255, 51, 68, 0.4)",
        headlineColor: "#ff4455",
        bg: "linear-gradient(145deg, rgba(38, 6, 14, 0.95) 0%, rgba(14, 2, 6, 0.98) 100%)",
      }
    : isSave
    ? {
        theme: "doctor",
        icon: <Shield size={52} color="#10b981" />,
        headline: "MIRACULOUS RESCUE",
        sub: "The Doctor intervened just in time! No lives were lost.",
        badge: "VITALITY PRESERVED",
        roleText: null,
        border: "rgba(16, 185, 129, 0.6)",
        glow: "rgba(16, 185, 129, 0.4)",
        headlineColor: "#34d399",
        bg: "linear-gradient(145deg, rgba(4, 30, 20, 0.95) 0%, rgba(2, 12, 8, 0.98) 100%)",
      }
    : {
        theme: "dawn",
        icon: <Sun size={52} color="#f59e0b" />,
        headline: "PEACEFUL SUNRISE",
        sub: "The night was quiet. All citizens survived till morning.",
        badge: "TOWN SECURE",
        roleText: null,
        border: "rgba(245, 158, 11, 0.5)",
        glow: "rgba(245, 158, 11, 0.3)",
        headlineColor: "#fbbf24",
        bg: "linear-gradient(145deg, rgba(32, 20, 4, 0.95) 0%, rgba(12, 8, 2, 0.98) 100%)",
      };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismiss}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 350,
          background: "radial-gradient(ellipse at center, rgba(10, 5, 20, 0.92) 0%, rgba(0, 0, 0, 0.97) 100%)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily: "'Cinzel', 'Outfit', 'Inter', system-ui, sans-serif",
        }}
      >
        <FloatingParticles theme={config.theme} density={35} />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.8, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.6 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: config.bg,
            border: `2px solid ${config.border}`,
            borderRadius: 28,
            padding: "36px 40px",
            minWidth: 360,
            maxWidth: 480,
            textAlign: "center",
            position: "relative",
            boxShadow: `0 0 60px ${config.glow}, inset 0 0 30px rgba(0,0,0,0.8)`,
            zIndex: 10,
          }}
        >
          {/* Close Button */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={dismiss}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </motion.button>

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
            DAWN OF DAY {day}
          </div>

          {/* Glowing Emblem Core */}
          <motion.div
            animate={{
              scale: [1, 1.06, 1],
              boxShadow: [
                `0 0 25px ${config.glow}`,
                `0 0 50px ${config.glow}`,
                `0 0 25px ${config.glow}`,
              ],
            }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 75%)",
              border: `2px solid ${config.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            {config.icon}
          </motion.div>

          {/* Status Badge */}
          <div style={{ marginBottom: 12 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.2em",
                color: config.headlineColor,
                border: `1.5px solid ${config.headlineColor}`,
                padding: "4px 12px",
                borderRadius: 6,
                background: "rgba(0,0,0,0.4)",
              }}
            >
              {config.badge}
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.1em",
              color: config.headlineColor,
              fontWeight: 900,
              textTransform: "uppercase",
              marginBottom: 8,
              textShadow: `0 0 15px ${config.glow}`,
            }}
          >
            {config.headline}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.5,
              marginBottom: config.roleText ? 10 : 18,
            }}
          >
            {config.sub}
          </div>

          {/* Role Reveal */}
          {config.roleText && (
            <div
              style={{
                fontSize: 12,
                color: "#93c5fd",
                fontWeight: 800,
                letterSpacing: "0.1em",
                marginBottom: 18,
                background: "rgba(59, 130, 246, 0.12)",
                padding: "6px 14px",
                borderRadius: 8,
                display: "inline-block",
              }}
            >
              {config.roleText}
            </div>
          )}

          {/* Gamified Dismiss Button */}
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: `0 0 25px ${config.glow}` }}
            whileTap={{ scale: 0.97 }}
            onClick={dismiss}
            style={{
              width: "100%",
              padding: "12px 20px",
              background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 14,
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "1.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>CONTINUE TO DISCUSSION ({countdown}s)</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
