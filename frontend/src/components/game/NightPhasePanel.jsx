/**
 * NightPhasePanel.jsx
 * ─────────────────────────────────────────────────────────────────
 * Ultra-gamified, cinematic Night-Phase overlay with floating particles,
 * role-specific HUD themes, interactive 3D target cards, cybernetic action buttons,
 * syndicate dark-web chat, and classified police dossier reports.
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Shield, Heart, User, Moon, Send,
  Check, AlertTriangle, Eye, Users, Lock, Target,
  Crosshair, Radio, Activity, Fingerprint, Sparkles, Flame, Clock
} from "lucide-react";
import FloatingParticles from "../common/FloatingParticles";

// ── Role Visual Configs ──────────────────────────────────────────
const ROLE_CONFIG = {
  mafia: {
    label: "MAFIA SYNDICATE",
    theme: "mafia",
    accent: "#ff2a3d",
    accentLight: "#ff6b7a",
    border: "rgba(255, 42, 61, 0.45)",
    glow: "rgba(255, 42, 61, 0.35)",
    bgGradient: "linear-gradient(135deg, rgba(38, 6, 12, 0.95) 0%, rgba(12, 2, 5, 0.98) 100%)",
    icon: Swords,
    reticleIcon: Crosshair,
    objective: "CONTRACT ASSASSINATION",
    objectiveSub: "Vote to eliminate a Town member under cover of darkness.",
    actionBtn: "EXECUTE CONTRACT",
    selectedStatus: "TARGET LOCKED",
    badgeColor: "#ff2a3d",
  },
  doctor: {
    label: "CHIEF PHYSICIAN",
    theme: "doctor",
    accent: "#10b981",
    accentLight: "#6ee7b7",
    border: "rgba(16, 185, 129, 0.45)",
    glow: "rgba(16, 185, 129, 0.35)",
    bgGradient: "linear-gradient(135deg, rgba(4, 28, 20, 0.95) 0%, rgba(2, 12, 8, 0.98) 100%)",
    icon: Heart,
    reticleIcon: Activity,
    objective: "BIOMEDICAL PROTECTION",
    objectiveSub: "Inject vitality shield to protect one player from death tonight.",
    actionBtn: "DEPLOY MEDICAL SHIELD",
    selectedStatus: "SHIELD ASSIGNED",
    badgeColor: "#10b981",
  },
  police: {
    label: "SPECIAL INVESTIGATOR",
    theme: "police",
    accent: "#3b82f6",
    accentLight: "#93c5fd",
    border: "rgba(59, 130, 246, 0.45)",
    glow: "rgba(59, 130, 246, 0.35)",
    bgGradient: "linear-gradient(135deg, rgba(6, 20, 42, 0.95) 0%, rgba(2, 6, 18, 0.98) 100%)",
    icon: Shield,
    reticleIcon: Fingerprint,
    objective: "SURVEILLANCE & RECON",
    objectiveSub: "Run forensic background analysis to uncover suspect alignment.",
    actionBtn: "COMMENCE SURVEILLANCE",
    selectedStatus: "SUSPECT MARKED",
    badgeColor: "#3b82f6",
  },
  villager: {
    label: "TOWN CITIZEN",
    theme: "villager",
    accent: "#818cf8",
    accentLight: "#c7d2fe",
    border: "rgba(129, 140, 248, 0.3)",
    glow: "rgba(129, 140, 248, 0.2)",
    bgGradient: "linear-gradient(135deg, rgba(16, 14, 32, 0.95) 0%, rgba(5, 4, 12, 0.98) 100%)",
    icon: User,
    reticleIcon: Moon,
    objective: "THE TOWN SLEEPS",
    objectiveSub: "You possess no night abilities. Stay vigilant and survive till dawn.",
    actionBtn: null,
    selectedStatus: null,
    badgeColor: "#818cf8",
  },
};

// ── Syndicate Secret Terminal Chat ────────────────────────────────
function MafiaChatInline({ messages = [], onSend }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div
      style={{
        marginTop: 18,
        background: "rgba(20, 4, 8, 0.8)",
        border: "1.5px solid rgba(255, 42, 61, 0.35)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 0 20px rgba(255, 42, 61, 0.15), inset 0 0 15px rgba(0,0,0,0.8)",
      }}
    >
      {/* Terminal Header */}
      <div
        style={{
          padding: "8px 14px",
          background: "linear-gradient(90deg, rgba(255,42,61,0.25) 0%, rgba(255,42,61,0.08) 100%)",
          borderBottom: "1px solid rgba(255,42,61,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 900, letterSpacing: "0.15em", color: "#ff4d5e" }}>
          <Lock size={12} color="#ff4d5e" /> SYNDICATE ENCRYPTED CHANNEL
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4455", boxShadow: "0 0 8px #ff4455" }} />
          SECURE
        </div>
      </div>

      {/* Messages Window */}
      <div
        style={{
          maxHeight: 120,
          overflowY: "auto",
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: "rgba(0,0,0,0.5)",
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: "rgba(255, 255, 255, 0.35)", fontSize: 11, textAlign: "center", padding: "10px 0" }}>
            Radio silence. Coordinate hit targets with your Syndicate allies...
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              fontSize: 12,
              color: m.isSelf ? "#fca5a5" : "#fee2e2",
              background: m.isSelf ? "rgba(255, 42, 61, 0.15)" : "rgba(255, 255, 255, 0.04)",
              border: m.isSelf ? "1px solid rgba(255, 42, 61, 0.3)" : "1px solid rgba(255, 255, 255, 0.06)",
              padding: "4px 10px",
              borderRadius: 8,
              alignSelf: m.isSelf ? "flex-end" : "flex-start",
              maxWidth: "85%",
            }}
          >
            <span style={{ fontWeight: 800, marginRight: 6, color: m.isSelf ? "#ff4d5e" : "#ff8896" }}>
              {m.isSelf ? "YOU" : (m.sender || "SYNDICATE")}:
            </span>
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Field */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 10px",
          borderTop: "1px solid rgba(255, 42, 61, 0.2)",
          background: "rgba(10, 2, 4, 0.9)",
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Transmit encrypted whisper..."
          style={{
            flex: 1,
            background: "rgba(0, 0, 0, 0.6)",
            border: "1px solid rgba(255, 42, 61, 0.3)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#fff",
            fontSize: 12,
            outline: "none",
          }}
        />
        <motion.button
          whileHover={{ scale: 1.05, background: "#ff2a3d" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          style={{
            background: "linear-gradient(135deg, #ff2a3d 0%, #b91c1c 100%)",
            border: "none",
            borderRadius: 8,
            padding: "0 14px",
            cursor: "pointer",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 10px rgba(255,42,61,0.4)",
          }}
        >
          <Send size={14} />
        </motion.button>
      </div>
    </div>
  );
}

// ── Police Result Dossier Card ───────────────────────────────────
function PoliceResultCard({ result }) {
  if (!result) return null;
  const isMafia = result.isMafia;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, type: "spring" }}
      style={{
        marginTop: 16,
        padding: "18px 22px",
        background: isMafia
          ? "linear-gradient(135deg, rgba(40, 6, 12, 0.95) 0%, rgba(15, 2, 5, 0.98) 100%)"
          : "linear-gradient(135deg, rgba(6, 30, 20, 0.95) 0%, rgba(2, 12, 8, 0.98) 100%)",
        border: `2px solid ${isMafia ? "#ef4444" : "#10b981"}`,
        borderRadius: 18,
        textAlign: "center",
        boxShadow: `0 0 30px ${isMafia ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"}`,
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", color: isMafia ? "#fca5a5" : "#a7f3d0", textTransform: "uppercase", marginBottom: 8 }}>
        <Fingerprint size={13} /> FORENSIC RECON DOSSIER
      </div>

      <div style={{ fontSize: 36, marginBottom: 8 }}>
        {isMafia ? "🔴" : "🟢"}
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          color: isMafia ? "#ff4455" : "#34d399",
          letterSpacing: "0.1em",
          marginBottom: 4,
          textShadow: `0 0 15px ${isMafia ? "rgba(255,68,85,0.7)" : "rgba(52,211,153,0.7)"}`,
        }}
      >
        {result.targetUsername?.toUpperCase()} is {isMafia ? "MAFIA OPERATIVE" : "INNOCENT CITIZEN"}
      </div>

      <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)", marginTop: 4 }}>
        Alignment Verified: <strong>{result.alignment || (isMafia ? "Evil" : "Good")}</strong>
      </div>
    </motion.div>
  );
}

// ── Main NightPhasePanel ─────────────────────────────────────────
export default function NightPhasePanel({
  myRole = "villager",
  myId,
  myName,
  myColor,
  isAlive,
  players = [],
  timer = 60,
  day = 1,
  nightActionDone,
  nightActionTarget,
  nightError,
  nightConfirmation,
  mafiaVoteTally,
  currentMafiaVotes,
  policeResult,
  mafiaChatMessages,
  onAction,
  onMafiaChat,
  supportRolesDone = true,
  pendingRoles = [],
}) {
  const role = (myRole || "villager").toLowerCase();
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.villager;
  const RoleIcon = cfg.icon;
  const ReticleIcon = cfg.reticleIcon;

  const [hoveredId, setHoveredId] = useState(null);

  // Build target list
  const allPlayers = [
    { id: myId, username: myName, color: myColor, isAlive, isSelf: true },
    ...players.filter((p) => p.id !== myId),
  ].filter((p) => p.isAlive !== false);

  const targetable = role === "mafia"
    ? allPlayers.filter((p) => !p.isSelf)
    : allPlayers;

  const mmss = `${Math.floor(timer / 60).toString().padStart(2, "0")}:${(timer % 60).toString().padStart(2, "0")}`;
  const isUrgent = timer <= 15;

  if (!isAlive) {
    return (
      <NightOverlay theme="eliminated">
        <DeadPlayerNight timer={timer} mmss={mmss} day={day} />
      </NightOverlay>
    );
  }

  return (
    <NightOverlay theme={cfg.theme}>
      {/* ── Top Gamified Header ───────────────────────────────── */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: "520px",
          marginBottom: 18,
          gap: 12,
        }}
      >
        {/* Role Insignia Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 18px",
            background: cfg.bgGradient,
            border: `1.5px solid ${cfg.border}`,
            boxShadow: `0 0 25px ${cfg.glow}`,
            borderRadius: 16,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${cfg.accent}44 0%, transparent 80%)`,
              border: `1px solid ${cfg.accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RoleIcon size={18} color={cfg.accent} />
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 800 }}>
              YOUR PROTOCOL
            </div>
            <div style={{ fontSize: 13, fontWeight: 900, color: cfg.accent, letterSpacing: "0.1em" }}>
              {cfg.label}
            </div>
          </div>
        </div>

        {/* Night & Glowing Timer Gauge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 18px",
            background: "rgba(10, 5, 20, 0.8)",
            border: `1.5px solid ${isUrgent ? "rgba(239, 68, 68, 0.6)" : "rgba(255,255,255,0.15)"}`,
            borderRadius: 16,
            boxShadow: isUrgent ? "0 0 25px rgba(239, 68, 68, 0.5)" : "0 0 15px rgba(0,0,0,0.5)",
          }}
        >
          <Moon size={16} color="#818cf8" />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#818cf8", fontWeight: 800 }}>
              NIGHT {day}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                fontFamily: "monospace",
                color: isUrgent ? "#ff3344" : "#4ade80",
                textShadow: isUrgent ? "0 0 12px #ff3344" : "0 0 10px #4ade80",
              }}
            >
              {mmss}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Main Gamified Action Command Panel ──────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: "linear-gradient(170deg, rgba(14, 8, 25, 0.95) 0%, rgba(5, 3, 12, 0.98) 100%)",
          border: `1.5px solid ${cfg.border}`,
          boxShadow: `0 0 50px ${cfg.glow}, inset 0 0 30px rgba(0, 0, 0, 0.8)`,
          borderRadius: 24,
          padding: "24px 26px",
          width: "100%",
          maxWidth: 520,
          maxHeight: "75vh",
          overflowY: "auto",
          zIndex: 10,
          backdropFilter: "blur(16px)",
          position: "relative",
        }}
      >
        {/* Tactical Objective Header */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 900,
              color: cfg.accent,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            <ReticleIcon size={16} color={cfg.accent} />
            {cfg.objective}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
            {cfg.objectiveSub}
          </div>
        </div>

        {/* Error Alert */}
        {nightError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              marginBottom: 14,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: 12,
              color: "#fca5a5",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <AlertTriangle size={15} color="#ef4444" />
            {nightError}
          </motion.div>
        )}

        {/* Mafia Pending Support Roles Sync Banner */}
        {role === "mafia" && !supportRolesDone && (
          <motion.div
            animate={{
              boxShadow: [
                "0 0 15px rgba(245, 158, 11, 0.2)",
                "0 0 30px rgba(245, 158, 11, 0.45)",
                "0 0 15px rgba(245, 158, 11, 0.2)",
              ],
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              marginBottom: 16,
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.1) 100%)",
              border: "1.5px solid rgba(245, 158, 11, 0.5)",
              borderRadius: 14,
            }}
          >
            <Clock size={22} color="#fbbf24" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Awaiting Doctor & Police Activity
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                Pending: <strong style={{ color: "#fef08a" }}>{pendingRoles.join(", ")}</strong>. You can lock your target now; execution resolves once they act.
              </div>
            </div>
          </motion.div>
        )}

        {/* Police Result Inspection Dossier */}
        {role === "police" && policeResult && (
          <PoliceResultCard result={policeResult} />
        )}

        {/* Action Submitted Locked State */}
        {nightActionDone && nightConfirmation ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              textAlign: "center",
              padding: "20px 18px",
              background: `${cfg.accent}14`,
              border: `1.5px solid ${cfg.accent}55`,
              borderRadius: 16,
              marginBottom: 16,
              boxShadow: `0 0 25px ${cfg.glow}`,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${cfg.accent}44 0%, transparent 80%)`,
                border: `2px solid ${cfg.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 10px",
              }}
            >
              <Check size={24} color={cfg.accent} />
            </div>
            <div style={{ fontSize: 14, color: cfg.accent, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {nightConfirmation.message || "PROTOCOL SUBMITTED & ENCRYPTED"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              Standby while remaining players complete their night actions...
            </div>
          </motion.div>
        ) : role !== "villager" ? (
          /* ── 3D Interactive Target Selection Cards ─────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {targetable.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13, padding: 20 }}>
                No valid target signatures available.
              </div>
            )}
            {targetable.map((p) => {
              const isSelected = nightActionTarget === p.id;
              const isHovered = hoveredId === p.id;
              const voteCount = mafiaVoteTally?.[p.id] || 0;

              return (
                <motion.button
                  key={p.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => !nightActionDone && onAction(p.id)}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 18px",
                    cursor: nightActionDone ? "default" : "pointer",
                    background: isSelected
                      ? `linear-gradient(90deg, ${cfg.accent}2a 0%, ${cfg.accent}10 100%)`
                      : isHovered
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: `1.5px solid ${isSelected ? cfg.accent : isHovered ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 16,
                    textAlign: "left",
                    transition: "border 0.2s, background 0.2s",
                    boxShadow: isSelected
                      ? `0 0 20px ${cfg.glow}, inset 0 0 12px ${cfg.accent}22`
                      : isHovered
                      ? "0 4px 15px rgba(0,0,0,0.4)"
                      : "none",
                    overflow: "hidden",
                  }}
                >
                  {/* Left Role Target Indicator Bar */}
                  {isSelected && (
                    <motion.div
                      layoutId="targetBar"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        background: cfg.accent,
                        boxShadow: `0 0 10px ${cfg.accent}`,
                      }}
                    />
                  )}

                  {/* Player Avatar */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: p.color || "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 900,
                      color: "#000",
                      border: `2px solid ${isSelected ? cfg.accent : "rgba(255,255,255,0.25)"}`,
                      boxShadow: isSelected ? `0 0 14px ${cfg.accent}` : `0 0 8px ${p.color}55`,
                      flexShrink: 0,
                      position: "relative",
                    }}
                  >
                    {(p.username || "?")[0].toUpperCase()}
                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          background: cfg.accent,
                          borderRadius: "50%",
                          width: 14,
                          height: 14,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={9} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Player Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: isSelected ? cfg.accentLight : "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>{p.username || "Unknown"}</span>
                      {p.isSelf && (
                        <span
                          style={{
                            fontSize: 9,
                            background: "#7c3aed",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontWeight: 900,
                            color: "#fff",
                            letterSpacing: "0.1em",
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Role Specific Status Tag */}
                    {role === "mafia" && voteCount > 0 && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#ff6b7a",
                          marginTop: 2,
                        }}
                      >
                        <Flame size={12} color="#ff3344" />
                        <span>{voteCount} Syndicate Vote{voteCount > 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Badge */}
                  {isSelected ? (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: "0.1em",
                        color: "#fff",
                        background: cfg.accent,
                        padding: "5px 12px",
                        borderRadius: 8,
                        boxShadow: `0 0 12px ${cfg.accent}`,
                        textTransform: "uppercase",
                      }}
                    >
                      {cfg.selectedStatus}
                    </div>
                  ) : (
                    <div
                      style={{
                        color: "rgba(255,255,255,0.25)",
                        transition: "color 0.2s",
                      }}
                    >
                      <ReticleIcon size={18} color={isHovered ? cfg.accent : "rgba(255,255,255,0.3)"} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        ) : (
          /* Villager Rest Atmosphere */
          <div style={{ textAlign: "center", padding: "32px 10px" }}>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              style={{ fontSize: 52, marginBottom: 12 }}
            >
              🌙
            </motion.div>
            <div style={{ color: "#c7d2fe", fontSize: 15, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 6 }}>
              THE SLEEPING PROVINCE
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, maxWidth: 320, margin: "0 auto" }}>
              Keep the doors barred and lights extinguished. The shadows will lift with the morning sun.
            </div>
          </div>
        )}

        {/* Mafia Inline Encrypted Syndicate Chat */}
        {role === "mafia" && (
          <MafiaChatInline
            messages={mafiaChatMessages}
            onSend={onMafiaChat}
          />
        )}
      </motion.div>
    </NightOverlay>
  );
}

// ── Shared Full-Screen Night Overlay Wrapper with Particles ───────
function NightOverlay({ theme = "mafia", children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "linear-gradient(180deg, rgba(3, 1, 10, 0.98) 0%, rgba(1, 0, 5, 0.99) 100%)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        overflowY: "auto",
        fontFamily: "'Cinzel', 'Outfit', 'Inter', system-ui, sans-serif",
      }}
    >
      {/* Dynamic Themed Floating Particle Storm */}
      <FloatingParticles theme={theme} density={45} />

      {/* Ambient Vignette Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, transparent 35%, rgba(0, 0, 0, 0.75) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Dead Player Spectator Screen ─────────────────────────────────
function DeadPlayerNight({ timer, mmss, day }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        textAlign: "center",
        background: "rgba(18, 5, 10, 0.85)",
        border: "1.5px solid rgba(239, 68, 68, 0.4)",
        borderRadius: 24,
        padding: "36px 40px",
        maxWidth: 440,
        boxShadow: "0 0 40px rgba(239, 68, 68, 0.25)",
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 12 }}>👻</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#f87171", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>
        SPECTATING NIGHT {day}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
        You exist beyond the mortal veil. Living players are now conducting their night actions.
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 18,
          fontFamily: "monospace",
          fontWeight: 900,
          color: timer <= 15 ? "#ff3344" : "#a855f7",
          background: "rgba(0,0,0,0.6)",
          padding: "10px 24px",
          borderRadius: 14,
          border: "1px solid rgba(168, 85, 247, 0.3)",
          boxShadow: "0 0 15px rgba(168, 85, 247, 0.25)",
        }}
      >
        <Moon size={18} /> {mmss}
      </div>
    </motion.div>
  );
}
