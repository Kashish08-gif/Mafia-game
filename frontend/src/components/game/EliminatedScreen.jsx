import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, Eye, Ghost, ShieldAlert, Radio, Flame, Sparkles } from "lucide-react";
import FloatingParticles from "../common/FloatingParticles";

export default function EliminatedScreen({ data, onStartSpectating }) {
  const [countdown, setCountdown] = useState(10);
  const killerName = data?.killerName || "The Mafia Syndicate";
  const reason = data?.reason || "Silenced under cover of darkness";
  const role = data?.role || "Villager";

  useEffect(() => {
    if (countdown <= 0) {
      if (onStartSpectating) onStartSpectating();
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, onStartSpectating]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse at center, rgba(35, 2, 10, 0.98) 0%, rgba(8, 0, 3, 0.99) 100%)",
          backdropFilter: "blur(18px)",
          color: "#ffffff",
          fontFamily: "'Cinzel', 'Outfit', 'Inter', system-ui, sans-serif",
          overflow: "hidden",
          padding: "20px",
        }}
      >
        {/* Ambient Floating Blood Ash Particles */}
        <FloatingParticles theme="eliminated" density={50} />

        {/* Cinematic Screen Shake & Red Fog Overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle at center, transparent 30%, rgba(180, 0, 0, 0.45) 85%, rgba(0, 0, 0, 0.8) 100%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Scanlines Effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Top Caution Tape Banner */}
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            position: "absolute",
            top: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "linear-gradient(90deg, rgba(220,38,38,0.2) 0%, rgba(220,38,38,0.8) 50%, rgba(220,38,38,0.2) 100%)",
            borderTop: "1px solid rgba(239, 68, 68, 0.6)",
            borderBottom: "1px solid rgba(239, 68, 68, 0.6)",
            padding: "8px 40px",
            zIndex: 10,
            boxShadow: "0 0 30px rgba(239, 68, 68, 0.4)",
          }}
        >
          <ShieldAlert size={16} color="#fee2e2" />
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.25em", color: "#fff", textTransform: "uppercase" }}>
            CRIME SCENE IDENTIFIED • CASUALTY REPORT
          </span>
          <ShieldAlert size={16} color="#fee2e2" />
        </motion.div>

        {/* Cinematic Main Holographic Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.35 }}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "600px",
            background: "linear-gradient(160deg, rgba(30, 8, 14, 0.92) 0%, rgba(12, 3, 6, 0.98) 100%)",
            border: "1.5px solid rgba(239, 68, 68, 0.5)",
            borderRadius: "28px",
            boxShadow: "0 0 80px rgba(220, 38, 38, 0.4), inset 0 0 40px rgba(0, 0, 0, 0.9)",
            padding: "36px 32px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 10,
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Animated Skull Emblem with Glowing Core */}
          <div style={{ position: "relative", marginBottom: "18px" }}>
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                boxShadow: [
                  "0 0 30px rgba(239, 68, 68, 0.5)",
                  "0 0 60px rgba(239, 68, 68, 0.9)",
                  "0 0 30px rgba(239, 68, 68, 0.5)",
                ],
              }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              style={{
                width: "92px",
                height: "92px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, rgba(127, 29, 29, 0.15) 75%)",
                border: "2.5px solid #ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Skull size={48} color="#ff4d5e" style={{ filter: "drop-shadow(0 0 10px #ff2233)" }} />
            </motion.div>

            {/* Orbiting Red Particle Dot */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              style={{
                position: "absolute",
                inset: -6,
                borderRadius: "50%",
                border: "2px dashed rgba(239, 68, 68, 0.4)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Glitch Animated Header Title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 900,
                letterSpacing: "3px",
                color: "#ff3b53",
                textTransform: "uppercase",
                textShadow: "0 0 25px rgba(239, 68, 68, 0.8), 0 2px 10px rgba(0, 0, 0, 0.9)",
                margin: "0 0 6px 0",
              }}
            >
              YOU HAVE BEEN ELIMINATED
            </h1>

            {/* Classified "DECEASED" Stamp */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <motion.div
                initial={{ scale: 2.5, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: -6 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 350, damping: 18 }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "2px solid #ef4444",
                  padding: "3px 14px",
                  borderRadius: "6px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#fca5a5",
                  fontWeight: 900,
                  fontSize: "12px",
                  letterSpacing: "0.2em",
                  boxShadow: "0 0 15px rgba(239, 68, 68, 0.4)",
                }}
              >
                <span>⚠️ STATUS: DECEASED</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Dossier Incident Details */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, rgba(15, 3, 7, 0.85) 0%, rgba(0, 0, 0, 0.7) 100%)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "18px",
              padding: "16px 20px",
              marginBottom: "20px",
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ color: "#9ca3af", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 700 }}>
                Eliminated By:
              </span>
              <span
                style={{
                  color: "#ff4455",
                  fontWeight: 900,
                  fontSize: "15px",
                  textShadow: "0 0 12px rgba(255, 68, 85, 0.6)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Flame size={15} color="#ff4455" /> {killerName}
              </span>
            </div>

            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)", margin: "8px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ color: "#9ca3af", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 700 }}>
                Your Assigned Role:
              </span>
              <span
                style={{
                  color: "#38bdf8",
                  fontWeight: 800,
                  fontSize: "14px",
                  background: "rgba(56, 189, 248, 0.12)",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={13} color="#38bdf8" /> {role.toUpperCase()}
              </span>
            </div>

            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)", margin: "8px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#9ca3af", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 700 }}>
                Incident Cause:
              </span>
              <span style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>
                {reason}
              </span>
            </div>
          </motion.div>

          {/* Ghost Recon Protocol Cards */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            style={{
              width: "100%",
              background: "rgba(20, 10, 25, 0.6)",
              border: "1px dashed rgba(168, 85, 247, 0.35)",
              borderRadius: "16px",
              padding: "14px 18px",
              marginBottom: "24px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                color: "#c084fc",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "1.5px",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                textTransform: "uppercase",
              }}
            >
              <Ghost size={16} color="#c084fc" /> GHOST SPECTATOR ABILITIES UNLOCKED
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.35)", padding: "8px 10px", borderRadius: "8px" }}>
                <Eye size={14} color="#60a5fa" />
                <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 600 }}>Omnipresent 3D View</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.35)", padding: "8px 10px", borderRadius: "8px" }}>
                <Radio size={14} color="#a855f7" />
                <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 600 }}>Ghost Afterlife Chat</span>
              </div>
            </div>
          </motion.div>

          {/* Ultra Gamified Glowing CTA Action Button */}
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 35px rgba(239, 68, 68, 0.85)" }}
            whileTap={{ scale: 0.97 }}
            onClick={onStartSpectating}
            style={{
              position: "relative",
              width: "100%",
              padding: "16px 28px",
              background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 50%, #7f1d1d 100%)",
              border: "1.5px solid #f87171",
              borderRadius: "16px",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 900,
              letterSpacing: "2.5px",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 6px 30px rgba(239, 68, 68, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              overflow: "hidden",
            }}
          >
            {/* Shiny Light Sweep */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "40%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                transform: "skewX(-25deg)",
                pointerEvents: "none",
              }}
            />

            <Ghost size={20} color="#ffffff" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.8))" }} />
            <span>ENTER SPECTATOR REALM ({countdown}s)</span>

            {/* Countdown Progress Ring / Indicator */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 900,
              }}
            >
              {countdown}
            </div>
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
