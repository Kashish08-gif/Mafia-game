/**
 * NightPhasePanel.jsx
 * ─────────────────────────────────────────────────────────────────
 * Full-screen Night-Phase overlay. Rendered when phase === "NIGHT".
 *
 * Shows a role-specific action panel:
 *   • MAFIA   → Kill-vote target picker + live tally + Mafia secret chat
 *   • DOCTOR  → Protect/heal target picker (can self-protect)
 *   • POLICE  → Investigate target + private result display
 *   • VILLAGER → "Rest and wait" screen (no ability)
 *
 * Props:
 *   myRole          — "mafia" | "doctor" | "police" | "villager"
 *   myId            — socket id of local player
 *   myName          — local player username
 *   myColor         — player color
 *   isAlive         — local player alive?
 *   players         — array of ALL players (remote)
 *   timer           — seconds remaining in Night phase
 *   day             — current day number
 *   nightActionDone — has this player already submitted their action?
 *   nightActionTarget — socketId of chosen target
 *   nightError      — error string or null
 *   nightConfirmation — confirmation data or null
 *   mafiaVoteTally  — { [targetId]: count } — live Mafia vote counts
 *   currentMafiaVotes— { [voterId]: targetId }
 *   policeResult    — { targetUsername, alignment, isMafia } or null
 *   mafiaChatMessages — array of Mafia-only chat messages
 *   onAction        — (targetId) → void — emit night action
 *   onMafiaChat     — (text) → void — emit Mafia chat message
 */

import { useState, useRef, useEffect } from "react";
import {
  Swords, Shield, Heart, User, Moon, Send,
  Check, AlertTriangle, Eye, Users, Lock,
} from "lucide-react";

// ── Constants ───────────────────────────────────────────────────
const ROLE_CONFIG = {
  mafia: {
    label: "MAFIA",
    color: "#ff3344",
    bg: "rgba(255,51,68,0.08)",
    border: "rgba(255,51,68,0.35)",
    glow: "rgba(255,51,68,0.25)",
    icon: Swords,
    action: "CHOOSE YOUR KILL TARGET",
    actionSub: "Vote to eliminate a Town member tonight.",
    btnLabel: "ELIMINATE",
    btnColor: "#ff3344",
  },
  doctor: {
    label: "DOCTOR",
    color: "#44cc88",
    bg: "rgba(68,204,136,0.08)",
    border: "rgba(68,204,136,0.35)",
    glow: "rgba(68,204,136,0.25)",
    icon: Heart,
    action: "CHOOSE WHO TO PROTECT",
    actionSub: "Select one player to heal tonight. You can protect yourself.",
    btnLabel: "PROTECT",
    btnColor: "#44cc88",
  },
  police: {
    label: "POLICE",
    color: "#4488ff",
    bg: "rgba(68,136,255,0.08)",
    border: "rgba(68,136,255,0.35)",
    glow: "rgba(68,136,255,0.25)",
    icon: Shield,
    action: "CHOOSE SOMEONE TO INVESTIGATE",
    actionSub: "You will privately learn if they are Mafia or Innocent.",
    btnLabel: "INVESTIGATE",
    btnColor: "#4488ff",
  },
  villager: {
    label: "VILLAGER",
    color: "#aaaaaa",
    bg: "rgba(170,170,170,0.06)",
    border: "rgba(170,170,170,0.2)",
    glow: "rgba(170,170,170,0.1)",
    icon: User,
    action: "THE TOWN SLEEPS",
    actionSub: "You have no night ability. Rest and wait for morning.",
    btnLabel: null,
    btnColor: "#aaa",
  },
};

// ── Timer bar color ──────────────────────────────────────────────
function timerColor(t) {
  if (t > 30) return "#44ff88";
  if (t > 10) return "#ffd700";
  return "#ff3344";
}

// ── Mafia Secret Chat ────────────────────────────────────────────
function MafiaChatInline({ messages, onSend }) {
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
    <div style={{
      marginTop: 18,
      background: "rgba(255,51,68,0.07)",
      border: "1px solid rgba(255,51,68,0.25)",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "8px 14px",
        background: "rgba(255,51,68,0.15)",
        display: "flex", alignItems: "center", gap: 8,
        fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#ff3344",
      }}>
        <Lock size={12} /> MAFIA SECURE CHANNEL
      </div>
      {/* Messages */}
      <div style={{
        maxHeight: 130, overflowY: "auto",
        padding: "8px 14px",
        display: "flex", flexDirection: "column", gap: 5,
      }}>
        {messages.length === 0 && (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: 8 }}>
            No messages yet... coordinate with your team.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            fontSize: 12,
            color: m.isSelf ? "#ff7788" : "#ffbbbb",
            background: m.isSelf ? "rgba(255,51,68,0.1)" : "transparent",
            padding: "3px 8px", borderRadius: 8,
          }}>
            <span style={{ fontWeight: 700, marginRight: 4 }}>
              {m.isSelf ? "You" : (m.sender || "Mafia")}:
            </span>
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <div style={{
        display: "flex", gap: 8, padding: "8px 12px",
        borderTop: "1px solid rgba(255,51,68,0.15)",
      }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Whisper to your allies..."
          style={{
            flex: 1, background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,51,68,0.25)",
            borderRadius: 8, padding: "6px 10px",
            color: "#fff", fontSize: 12, outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            background: "#ff3344", border: "none", borderRadius: 8,
            padding: "6px 12px", cursor: "pointer", color: "#fff",
            display: "flex", alignItems: "center",
          }}
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Police Result Card ───────────────────────────────────────────
function PoliceResultCard({ result }) {
  if (!result) return null;
  const isMafia = result.isMafia;
  return (
    <div style={{
      marginTop: 14,
      padding: "14px 18px",
      background: isMafia ? "rgba(255,51,68,0.12)" : "rgba(68,204,136,0.12)",
      border: `1.5px solid ${isMafia ? "#ff334488" : "#44cc8888"}`,
      borderRadius: 14,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 32, marginBottom: 6 }}>{isMafia ? "🔴" : "🟢"}</div>
      <div style={{
        fontSize: 13, fontWeight: 900,
        color: isMafia ? "#ff3344" : "#44cc88",
        letterSpacing: "0.1em", marginBottom: 4,
      }}>
        {result.targetUsername} is {isMafia ? "MAFIA" : "INNOCENT"}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
        Alignment: {result.alignment}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
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
}) {
  const role = (myRole || "villager").toLowerCase();
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.villager;
  const Icon = cfg.icon;

  const [hoveredId, setHoveredId] = useState(null);

  // Build the target list
  const allPlayers = [
    { id: myId, username: myName, color: myColor, isAlive, isSelf: true },
    ...players.filter((p) => p.id !== myId),
  ].filter((p) => p.isAlive !== false);

  // Mafia can't target themselves; doctor CAN target themselves
  const targetable = role === "mafia"
    ? allPlayers.filter((p) => !p.isSelf)
    : allPlayers;

  const mmss = `${Math.floor(timer / 60).toString().padStart(2, "0")}:${(timer % 60).toString().padStart(2, "0")}`;
  const tColor = timerColor(timer);

  if (!isAlive) {
    return (
      <NightOverlay>
        <DeadPlayerNight timer={timer} mmss={mmss} day={day} />
      </NightOverlay>
    );
  }

  return (
    <NightOverlay>
      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "8px 20px",
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 30, marginBottom: 16,
        }}>
          <Moon size={16} color="#7c8cff" />
          <span style={{ fontSize: 12, color: "#7c8cff", fontWeight: 700, letterSpacing: "0.12em" }}>
            NIGHT {day}
          </span>
          <span style={{
            fontSize: 18, fontWeight: 900, fontFamily: "monospace",
            color: tColor, textShadow: `0 0 12px ${tColor}`,
          }}>
            {mmss}
          </span>
        </div>

        {/* Role badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "10px 22px",
          background: cfg.bg,
          border: `1.5px solid ${cfg.border}`,
          boxShadow: `0 0 24px ${cfg.glow}`,
          borderRadius: 14,
        }}>
          <Icon size={20} color={cfg.color} />
          <span style={{
            fontSize: 15, fontWeight: 900, color: cfg.color,
            letterSpacing: "0.1em",
          }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* ── Main panel ────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(180deg, rgba(12,6,24,0.96) 0%, rgba(4,2,12,0.99) 100%)",
        border: `1.5px solid ${cfg.border}`,
        boxShadow: `0 0 40px ${cfg.glow}`,
        borderRadius: 20,
        padding: "24px 28px",
        width: "100%",
        maxWidth: 480,
        maxHeight: "70vh",
        overflowY: "auto",
      }}>
        {/* Action header */}
        <div style={{ marginBottom: 18, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: cfg.color, letterSpacing: "0.12em" }}>
            {cfg.action}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
            {cfg.actionSub}
          </div>
        </div>

        {/* Error */}
        {nightError && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", marginBottom: 14,
            background: "rgba(255,51,68,0.12)",
            border: "1px solid rgba(255,51,68,0.3)",
            borderRadius: 10, color: "#ff6677", fontSize: 12, fontWeight: 600,
          }}>
            <AlertTriangle size={14} />
            {nightError}
          </div>
        )}

        {/* Police result */}
        {role === "police" && policeResult && (
          <PoliceResultCard result={policeResult} />
        )}

        {/* Action done confirmation */}
        {nightActionDone && nightConfirmation ? (
          <div style={{
            textAlign: "center", padding: "16px",
            background: `${cfg.color}12`,
            border: `1px solid ${cfg.color}44`,
            borderRadius: 14, marginBottom: 14,
          }}>
            <Check size={28} color={cfg.color} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: cfg.color, fontWeight: 800 }}>
              {nightConfirmation.message ||
                `Action submitted: ${nightConfirmation.actionType}`}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              Waiting for other players to act...
            </div>
          </div>
        ) : role !== "villager" ? (
          /* ── Target grid ────────────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {targetable.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 12, padding: 16 }}>
                No valid targets available.
              </div>
            )}
            {targetable.map((p) => {
              const isSelected = nightActionTarget === p.id;
              const voteCount = mafiaVoteTally?.[p.id] || 0;
              const votedByMe = currentMafiaVotes && Object.values(currentMafiaVotes).includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => !nightActionDone && onAction(p.id)}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", cursor: nightActionDone ? "default" : "pointer",
                    background: isSelected
                      ? `${cfg.color}22`
                      : hoveredId === p.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${isSelected ? cfg.color : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 12, textAlign: "left",
                    transition: "all 0.15s",
                    boxShadow: isSelected ? `0 0 12px ${cfg.glow}` : "none",
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: p.color || "#666",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 900, color: "#000",
                    border: `2px solid ${isSelected ? cfg.color : "rgba(255,255,255,0.2)"}`,
                    flexShrink: 0,
                  }}>
                    {(p.username || "?")[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: isSelected ? cfg.color : "#fff",
                    }}>
                      {p.username || "Unknown"}
                      {p.isSelf && (
                        <span style={{
                          marginLeft: 6, fontSize: 9, background: "#7c3aed",
                          padding: "1px 5px", borderRadius: 4, fontWeight: 800, color: "#fff",
                        }}>YOU</span>
                      )}
                    </div>
                    {role === "mafia" && voteCount > 0 && (
                      <div style={{ fontSize: 11, color: "#ff7788", marginTop: 2 }}>
                        🗳 {voteCount} vote{voteCount > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div style={{
                      fontSize: 11, fontWeight: 800, color: cfg.color,
                      background: `${cfg.color}18`, padding: "3px 8px", borderRadius: 8,
                    }}>
                      {cfg.btnLabel}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Villager: rest screen */
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😴</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              You have no night ability. Wait for morning.
            </div>
          </div>
        )}

        {/* Mafia chat (inline, Mafia only) */}
        {role === "mafia" && (
          <MafiaChatInline
            messages={mafiaChatMessages}
            onSend={onMafiaChat}
          />
        )}
      </div>
    </NightOverlay>
  );
}

// ── Shared full-screen night overlay wrapper ─────────────────────
function NightOverlay({ children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "linear-gradient(180deg, rgba(2,0,15,0.97) 0%, rgba(0,0,8,0.99) 100%)",
      backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "20px 16px",
      overflowY: "auto",
    }}>
      {/* Starfield effect */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 0%, rgba(100,80,200,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
}

// ── Dead player night screen ─────────────────────────────────────
function DeadPlayerNight({ timer, mmss, day }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>💀</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: "#888", marginBottom: 8 }}>
        YOU ARE DEAD
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>
        You can observe but cannot act during Night {day}.
      </div>
      <div style={{
        fontSize: 18, fontFamily: "monospace", fontWeight: 700,
        color: timerColor(timer),
        background: "rgba(0,0,0,0.5)",
        padding: "10px 24px", borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        🌙 {mmss}
      </div>
    </div>
  );
}
