/**
 * DiscussionChatPage.jsx
 * ─────────────────────────────────────────────────────────────────
 * Full-screen overlay that handles all sub-phases of day meeting:
 *   1. DISCUSSION: Chat freely with players.
 *   2. VOTING: Responsive grid to cast vote or skip.
 *   3. REVEAL: Cinematic screen showing eliminated role and remaining Mafias.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Smile, Lock, Users, MessageCircle, Check, AlertTriangle, Skull, Compass } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import ErrorBoundary from "./ErrorBoundary";
import VoiceChatPanel from "./VoiceChatPanel";

const ROLE_COLORS = {
  mafia: "#ff3344",
  police: "#4488ff",
  doctor: "#44cc88",
  villager: "#dddddd",
};

const ROLE_LABELS = {
  mafia: "MAFIA",
  police: "POLICE",
  doctor: "DOCTOR",
  villager: "VILLAGER",
};

const ROLE_EMOJI = {
  mafia: "🔪",
  police: "🛡️",
  doctor: "💊",
  villager: "👤",
};

const KEYFRAMES = `
  @keyframes disc-slide-in {
    from { transform: translateY(40px) scale(0.97); opacity: 0; }
    to   { transform: translateY(0)   scale(1);    opacity: 1; }
  }
  @keyframes disc-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes disc-pulse-glow {
    0%, 100% { box-shadow: 0 0 18px rgba(255, 215, 0, 0.25), 0 0 0 1px rgba(255,215,0,0.15); }
    50%       { box-shadow: 0 0 32px rgba(255, 215, 0, 0.55), 0 0 0 1px rgba(255,215,0,0.35); }
  }
  @keyframes disc-dot-bounce {
    0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
    40%           { transform: scale(1); opacity: 1;   }
  }
  @keyframes disc-timer-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }
  @keyframes disc-lock-shake {
    0%, 100% { transform: rotate(0deg); }
    20%       { transform: rotate(-8deg); }
    60%       { transform: rotate(8deg); }
  }
  @keyframes disc-toast-in {
    0%   { opacity: 0; transform: translateX(-50%) translateY(-16px); }
    20%  { opacity: 1; transform: translateX(-50%) translateY(0); }
    80%  { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
  }
  @keyframes disc-waiting-pulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1; }
  }
  @keyframes disc-bubble-in {
    from { opacity: 0; transform: scale(0.9) translateY(6px); }
    to   { opacity: 1; transform: scale(1)   translateY(0); }
  }
  @keyframes cinematic-reveal {
    0% { transform: scale(0.85); opacity: 0; filter: blur(10px); }
    30% { transform: scale(1.05); opacity: 1; filter: blur(0); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes card-spin-glow {
    0% { border-color: rgba(255, 215, 0, 0.2); box-shadow: 0 0 10px rgba(255, 215, 0, 0.05); }
    50% { border-color: rgba(255, 215, 0, 0.6); box-shadow: 0 0 25px rgba(255, 215, 0, 0.3); }
    100% { border-color: rgba(255, 215, 0, 0.2); box-shadow: 0 0 10px rgba(255, 215, 0, 0.05); }
  }
  @keyframes pulse-voted {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); filter: drop-shadow(0 0 8px #44cc88); }
  }

  @media (max-width: 900px) {
    .disc-role-badge {
      display: none !important;
    }
  }
  @media (max-width: 720px) {
    .disc-lock-indicator {
      display: none !important;
    }
    .disc-sidebar {
      display: none !important;
    }
    .disc-dialog {
      width: 100vw !important;
      height: 100vh !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      border-radius: 0px !important;
      border: none !important;
    }
    .disc-header {
      padding: 10px 16px !important;
      gap: 10px !important;
    }
  }
`;

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", marginLeft: 6 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#ffd700",
            display: "inline-block",
            animation: `disc-dot-bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

function PlayerSidebarItem({ player, isMe, isSeated, hasVoted }) {
  const roleColor = isMe ? (ROLE_COLORS[player.role] || "#dddddd") : "#888888";
  const roleEmoji = isMe ? (ROLE_EMOJI[player.role] || "👤") : "🎭";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        background: isSeated
          ? `linear-gradient(135deg, ${roleColor}18, rgba(255,215,0,0.06))`
          : "rgba(255,255,255,0.03)",
        border: isSeated
          ? `1px solid ${roleColor}44`
          : "1px solid rgba(255,255,255,0.06)",
        transition: "all 0.4s ease",
        position: "relative",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${player.color || roleColor}99, ${player.color || roleColor}33)`,
          border: `2px solid ${isSeated ? roleColor : "rgba(255,255,255,0.15)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {roleEmoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: player.color || "#fff",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {player.username || "Player"}
          {isMe && (
            <span
              style={{
                marginLeft: 5,
                fontSize: 9,
                background: "rgba(255,215,0,0.2)",
                color: "#ffd700",
                padding: "1px 5px",
                borderRadius: 4,
                fontWeight: 900,
              }}
            >
              YOU
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: isSeated ? roleColor : "#555", fontWeight: 700, marginTop: 1 }}>
          {hasVoted ? (
            <span style={{ color: "#44cc88", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Check size={10} /> Voted
            </span>
          ) : isSeated ? (
            <span>💺 Seated</span>
          ) : (
            <span style={{ animation: "disc-waiting-pulse 1.5s ease infinite" }}>
              ⏳ Walking...
            </span>
          )}
        </div>
      </div>

      {hasVoted ? (
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#44cc88",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pulse-voted 2s infinite",
          }}
        >
          <Check size={10} color="#000" strokeWidth={3} />
        </div>
      ) : (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isSeated ? "#ffd700" : "#555",
            boxShadow: isSeated ? "0 0 6px #ffd700" : "none",
            transition: "all 0.4s ease",
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}

function ChatBubble({ msg, isMe }) {
  if (msg.isSystem || msg.sender === "System") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "8px 0",
          animation: "disc-bubble-in 0.3s ease",
        }}
      >
        <div style={{ flex: 1, height: 1, background: "rgba(255,215,0,0.12)" }} />
        <div
          style={{
            fontSize: 11,
            color: msg.color || "#ffd700",
            fontStyle: "italic",
            fontWeight: 600,
            textAlign: "center",
            whiteSpace: "nowrap",
            padding: "0 8px",
          }}
        >
          {msg.text}
        </div>
        <div style={{ flex: 1, height: 1, background: "rgba(255,215,0,0.12)" }} />
      </div>
    );
  }

  const bubbleColor = msg.color || "#ffd700";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMe ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 8,
        margin: "4px 0",
        animation: "disc-bubble-in 0.3s ease",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${bubbleColor}88, ${bubbleColor}22)`,
          border: `1.5px solid ${bubbleColor}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          flexShrink: 0,
          boxShadow: `0 0 6px ${bubbleColor}33`,
        }}
      >
        {msg.sender?.[0]?.toUpperCase() || "?"}
      </div>

      <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: bubbleColor,
            marginBottom: 3,
            letterSpacing: "0.04em",
            paddingLeft: isMe ? 0 : 4,
            paddingRight: isMe ? 4 : 0,
          }}
        >
          {isMe ? "You" : msg.sender}
        </div>

        <div
          style={{
            padding: "9px 14px",
            borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isMe
              ? `linear-gradient(135deg, ${bubbleColor}33, ${bubbleColor}18)`
              : "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
            border: `1.5px solid ${isMe ? bubbleColor + "55" : "rgba(255,255,255,0.1)"}`,
            color: "#f0f0f0",
            fontSize: 13,
            lineHeight: "1.5",
            wordBreak: "break-word",
            boxShadow: isMe ? `0 4px 16px ${bubbleColor}22` : "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {msg.text}
        </div>

        {msg.ts && (
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.3)",
              marginTop: 3,
              paddingLeft: isMe ? 0 : 4,
              paddingRight: isMe ? 4 : 0,
            }}
          >
            {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiscussionChatPage({
  isOpen,
  isWaiting,
  discussionPlayers = [],
  seatedIds = [],
  messages = [],
  onSend,
  myId,
  myName,
  myColor,
  myRole,
  isAlive = true,
  timer,
  day,
  lockedMessage,
  subPhase = "DISCUSSION", // DISCUSSION, VOTING, REVEAL, ROAMING
  votedIds = [],
  revealData = null,
  onCastVote,
  // Voice communication props (from useVoiceChat hook via GameMapPage)
  voiceProps = null,
}) {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [selectedVoteId, setSelectedVoteId] = useState(null);
  const [voteConfirmed, setVoteConfirmed] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pickerRef = useRef(null);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show lock toast messages
  useEffect(() => {
    if (!lockedMessage) return;
    setToastMsg(lockedMessage);
    const t = setTimeout(() => setToastMsg(null), 2800);
    return () => clearTimeout(t);
  }, [lockedMessage]);

  // Reset vote state when subPhase changes
  useEffect(() => {
    if (subPhase !== "VOTING") {
      setSelectedVoteId(null);
      setVoteConfirmed(false);
    }
  }, [subPhase]);

  // Close emoji picker
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [showEmoji]);

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault?.();
      const trimmed = input.trim();
      if (!trimmed) return;
      onSend?.(trimmed);
      setInput("");
      setShowEmoji(false);
      inputRef.current?.focus();
    },
    [input, onSend],
  );

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") setShowEmoji(false);
  };

  const handleEmojiClick = useCallback((emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleConfirmVote = () => {
    if (!selectedVoteId || voteConfirmed) return;
    onCastVote?.(selectedVoteId);
    setVoteConfirmed(true);
  };

  if (!isOpen && !isWaiting) return null;

  const mm = Math.floor(timer / 60).toString().padStart(2, "0");
  const ss = (timer % 60).toString().padStart(2, "0");
  const timerPct = Math.min(100, Math.max(0, (timer / (subPhase === "VOTING" ? 60 : subPhase === "REVEAL" ? 12 : 180)) * 100));
  const timerColor = timer < 15 ? "#ff3344" : timer < 30 ? "#ffaa33" : "#44cc88";

  const roleColor = ROLE_COLORS[myRole] || "#dddddd";
  const roleLabel = ROLE_LABELS[myRole] || "VILLAGER";
  const roleEmoji = ROLE_EMOJI[myRole] || "👤";

  const seatedSet = new Set(seatedIds || []);
  const votedSet = new Set(votedIds || []);
  const allSeated = discussionPlayers.length > 0 && discussionPlayers.every((p) => seatedSet.has(p.id));

  // Determine stage title text based on subPhase
  let phaseTitleText = "DISCUSSION TABLE";
  let phaseDescText = `Day ${day} · Active Discussion`;
  if (subPhase === "VOTING") {
    phaseTitleText = "CAST YOUR VOTE";
    phaseDescText = "SUSPECT IDENTIFICATION GRID";
  } else if (subPhase === "REVEAL") {
    phaseTitleText = "VOTE REVEAL";
    phaseDescText = "ELIMINATION RESULTS";
  }

  const amIAlive = isAlive && (discussionPlayers.length === 0 || discussionPlayers.some(p => p.id === myId && p.isAlive !== false));

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(8px)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Main Panel */}
        <div
          className="disc-dialog"
          style={{
            width: "min(1100px, 96vw)",
            height: "min(720px, 92vh)",
            background: "linear-gradient(160deg, rgba(8, 4, 18, 0.98) 0%, rgba(4, 2, 10, 0.99) 100%)",
            border: "1.5px solid rgba(255, 215, 0, 0.35)",
            borderRadius: 24,
            boxShadow: "0 0 100px rgba(255, 215, 0, 0.15), 0 40px 80px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "disc-slide-in 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Header */}
          <div
            className="disc-header"
            style={{
              padding: "16px 24px",
              background: "linear-gradient(135deg, rgba(24, 12, 42, 0.92), rgba(12, 6, 20, 0.96))",
              borderBottom: "1px solid rgba(255, 215, 0, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexShrink: 0,
            }}
          >
            {/* Header Icon */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 150, 0, 0.1))",
                border: "1.5px solid rgba(255, 215, 0, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 0 18px rgba(255, 215, 0, 0.25)",
                animation: "disc-pulse-glow 3s ease-in-out infinite",
              }}
            >
              {subPhase === "VOTING" ? "🗳️" : subPhase === "REVEAL" ? "📢" : "🗣️"}
            </div>

            {/* Title Block */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 950,
                  letterSpacing: "0.08em",
                  background: "linear-gradient(90deg, #ffd700, #ffaa33, #ffd700)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  lineHeight: 1.2,
                }}
              >
                {phaseTitleText}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255, 255, 255, 0.5)",
                  letterSpacing: "0.08em",
                  marginTop: 2,
                  fontWeight: 700,
                }}
              >
                {isWaiting && !allSeated
                  ? "WAITING FOR SUSPECTS TO SIT AT TABLE..."
                  : phaseDescText}
              </div>
            </div>

            {/* Role Info */}
            <div
              className="disc-role-badge"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 30,
                background: `${roleColor}22`,
                border: `1.5px solid ${roleColor}55`,
                boxShadow: `0 0 10px ${roleColor}22`,
              }}
            >
              <span style={{ fontSize: 16 }}>{roleEmoji}</span>
              <div>
                <div style={{ fontSize: 8, color: "#999", letterSpacing: "0.1em", fontWeight: 800 }}>
                  YOUR IDENTITY
                </div>
                <div style={{ fontSize: 12, fontWeight: 900, color: roleColor, letterSpacing: "0.06em" }}>
                  {roleLabel}
                </div>
              </div>
            </div>

            {/* Stage Timer */}
            <div
              style={{
                textAlign: "center",
                padding: "8px 18px",
                borderRadius: 12,
                background: "rgba(0, 0, 0, 0.45)",
                border: `1.5px solid ${timerColor}55`,
                boxShadow: `0 0 10px ${timerColor}22`,
                minWidth: 90,
              }}
            >
              <div style={{ fontSize: 8, color: "#777", letterSpacing: "0.12em", fontWeight: 800 }}>
                {subPhase === "VOTING" ? "VOTING TIME" : subPhase === "REVEAL" ? "SWITCH TO NIGHT" : "DISCUSSION TIME"}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 950,
                  fontFamily: "monospace",
                  color: timerColor,
                  animation: timer < 15 ? "disc-timer-pulse 1s ease-in-out infinite" : "none",
                  letterSpacing: "0.05em",
                }}
              >
                {mm}:{ss}
              </div>
            </div>

            {/* Lock Indicator */}
            <div
              className="disc-lock-indicator"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(255, 215, 0, 0.08)",
                border: "1px solid rgba(255, 215, 0, 0.25)",
              }}
            >
              <Lock size={15} color="#ffd700" style={{ animation: "disc-lock-shake 4s ease infinite" }} />
              <div style={{ fontSize: 8, color: "#ffd700", fontWeight: 800, letterSpacing: "0.06em", lineHeight: 1.3 }}>
                LOCKED<br />IN SEAT
              </div>
            </div>
          </div>

          {/* Subphase countdown bar */}
          <div style={{ height: 4, background: "rgba(255, 255, 255, 0.05)", flexShrink: 0 }}>
            <div
              style={{
                height: "100%",
                width: `${timerPct}%`,
                background: `linear-gradient(90deg, ${timerColor}, ${timerColor}dd)`,
                boxShadow: `0 0 8px ${timerColor}`,
                transition: "width 1s linear, background 1s ease",
              }}
            />
          </div>

          {/* Main Content Body */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            
            {/* Left sidebar: Player list */}
            <div
              className="disc-sidebar"
              style={{
                width: 230,
                flexShrink: 0,
                borderRight: "1px solid rgba(255, 215, 0, 0.15)",
                display: "flex",
                flexDirection: "column",
                background: "rgba(0, 0, 0, 0.25)",
              }}
            >
              <div
                style={{
                  padding: "14px 16px 10px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Users size={14} color="#888" />
                <span style={{ fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: "0.1em" }}>
                  PLAYERS ALIVE ({discussionPlayers.length || 0})
                </span>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {discussionPlayers.map((p) => (
                  <PlayerSidebarItem
                    key={p.id}
                    player={p}
                    isMe={p.id === myId}
                    isSeated={seatedSet.has(p.id)}
                    hasVoted={votedSet.has(p.id)}
                  />
                ))}
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  background: "rgba(0, 0, 0, 0.35)",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {!allSeated ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888" }}>
                    <span>Waiting for seats</span>
                    <TypingDots />
                  </div>
                ) : subPhase === "DISCUSSION" ? (
                  <div style={{ color: "#ffd700", display: "flex", alignItems: "center", gap: 6 }}>
                    💬 Discussion active...
                  </div>
                ) : subPhase === "VOTING" ? (
                  <div style={{ color: "#ffaa33", display: "flex", alignItems: "center", gap: 6 }}>
                    🗳️ Voting in progress ({votedIds.length}/{discussionPlayers.length})
                  </div>
                ) : (
                  <div style={{ color: "#44cc88" }}>
                    📢 Announcement!
                  </div>
                )}
              </div>
            </div>

            {/* Chat column / Voting Grid / Reveal center screen */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* STAGE 1: DISCUSSION */}
              {subPhase === "DISCUSSION" && (
                <>
                  {/* Voice Chat Panel — rendered above messages when voice is available */}
                  {voiceProps && (
                    <VoiceChatPanel
                      players={discussionPlayers}
                      myId={myId}
                      micMuted={voiceProps.micMuted}
                      toggleMic={voiceProps.toggleMic}
                      speakerMuted={voiceProps.speakerMuted}
                      toggleSpeaker={voiceProps.toggleSpeaker}
                      micGranted={voiceProps.micGranted}
                      activeSpeakers={voiceProps.activeSpeakers}
                      peersReady={voiceProps.peersReady}
                    />
                  )}

                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    {isWaiting && !allSeated && messages.length === 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: 1,
                          gap: 16,
                          opacity: 0.8,
                        }}
                      >
                        <div style={{ fontSize: 52 }}>💬</div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 850,
                              color: "#ffd700",
                              letterSpacing: "0.08em",
                              marginBottom: 8,
                            }}
                          >
                            Waiting for all players to sit down...
                          </div>
                          <div style={{ fontSize: 12, color: "#777", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>

                            Discussion starts when everyone is seated
                            <TypingDots />
                          </div>
                        </div>
                      </div>
                    )}

                    {messages.map((msg, i) => (
                      <ChatBubble key={i} msg={msg} isMe={msg.id === myId || msg.sender === myName} />
                    ))}
                    <div ref={bottomRef} />
                  </div>

                  {showEmoji && (
                    <div ref={pickerRef} style={{ position: "absolute", bottom: 90, right: 20, zIndex: 9999 }}>
                      <ErrorBoundary>
                        <EmojiPicker
                          onEmojiClick={handleEmojiClick}
                          theme="dark"
                          autoFocusSearch={false}
                          lazyLoadEmojis
                          width={310}
                          height={380}
                        />
                      </ErrorBoundary>
                    </div>
                  )}

                  {/* Message Input Panel */}
                  <div
                    style={{
                      padding: "14px 20px",
                      borderTop: "1px solid rgba(255, 215, 0, 0.15)",
                      background: "rgba(0, 0, 0, 0.4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.35)", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
                      <MessageCircle size={11} />
                      Share suspected Mafia clues or Doctor protections in the round discussion...
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setShowEmoji(v => !v); }}
                        style={{
                          flexShrink: 0,
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: showEmoji ? "rgba(255, 215, 0, 0.2)" : "rgba(255, 255, 255, 0.05)",
                          border: `1.5px solid ${showEmoji ? "#ffd700" : "rgba(255, 255, 255, 0.12)"}`,
                          color: showEmoji ? "#ffd700" : "rgba(255, 255, 255, 0.55)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s",
                        }}
                      >
                        <Smile size={20} />
                      </button>

                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={allSeated ? "Type suspected player clues..." : "Waiting for all to seat..."}
                        disabled={!allSeated}
                        style={{
                          flex: 1,
                          height: 42,
                          padding: "0 16px",
                          borderRadius: 12,
                          background: "rgba(8, 4, 18, 0.85)",
                          border: "1.5px solid rgba(255, 215, 0, 0.2)",
                          color: "#fff",
                          outline: "none",
                          fontSize: 14,
                          fontFamily: "Inter, sans-serif",
                          transition: "border-color 0.2s",
                          opacity: allSeated ? 1 : 0.45,
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(255, 215, 0, 0.5)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255, 215, 0, 0.2)")}
                      />

                      <button
                        type="submit"
                        disabled={!input.trim() || !allSeated}
                        style={{
                          flexShrink: 0,
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: input.trim() && allSeated ? "linear-gradient(135deg, #ffd700, #ffaa33)" : "rgba(255, 255, 255, 0.05)",
                          border: "none",
                          color: input.trim() && allSeated ? "#000" : "#555",
                          cursor: input.trim() && allSeated ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s",
                          boxShadow: input.trim() && allSeated ? "0 4px 16px rgba(255, 215, 0, 0.35)" : "none",
                        }}
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
                </>
              )}

              {/* STAGE 2: VOTING GRID */}
              {subPhase === "VOTING" && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    padding: "24px 32px",
                    overflowY: "auto",
                    animation: "disc-fade-in 0.5s ease",
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#ff4455", letterSpacing: "0.06em", textShadow: "0 0 10px rgba(255, 68, 85, 0.2)" }}>
                      🗳️ CAST YOUR ELIMINATION VOTE
                    </div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                      {!amIAlive ? (
                        <span style={{ color: "#ff3344", fontWeight: 800 }}>💀 Spectator Mode: You are dead and cannot vote.</span>
                      ) : voteConfirmed ? (
                        <span style={{ color: "#44cc88", fontWeight: 800 }}>✅ Your vote has been recorded! Waiting for others.</span>
                      ) : (
                        <span>Identify who is the hidden Mafia. Choose Skip if unsure.</span>
                      )}
                    </div>
                  </div>

                  {/* Grid of Players */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: 14,
                      flex: 1,
                      minHeight: 180,
                    }}
                  >
                    {discussionPlayers.map((p) => {
                      const isSelected = selectedVoteId === p.id;
                      const hasVotedThisPlayer = votedSet.has(p.id);

                      return (
                        <button
                          key={p.id}
                          onClick={() => !voteConfirmed && amIAlive && setSelectedVoteId(p.id)}
                          disabled={voteConfirmed || !amIAlive}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "20px 14px",
                            borderRadius: 16,
                            background: isSelected
                              ? "linear-gradient(135deg, rgba(255, 68, 85, 0.22), rgba(0, 0, 0, 0.6))"
                              : "rgba(255, 255, 255, 0.03)",
                            border: isSelected
                              ? "2.5px solid #ff4455"
                              : "1.5px solid rgba(255, 255, 255, 0.08)",
                            color: "#fff",
                            cursor: (voteConfirmed || !amIAlive) ? "not-allowed" : "pointer",
                            transition: "all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                            boxShadow: isSelected ? "0 0 20px rgba(255, 68, 85, 0.3)" : "none",
                            position: "relative",
                            overflow: "hidden",
                          }}
                          onMouseEnter={(e) => {
                            if (!voteConfirmed && amIAlive) {
                              e.currentTarget.style.transform = "scale(1.04)";
                              e.currentTarget.style.borderColor = isSelected ? "#ff4455" : "rgba(255, 215, 0, 0.4)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!voteConfirmed && amIAlive) {
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.borderColor = isSelected ? "#ff4455" : "rgba(255, 255, 255, 0.08)";
                            }
                          }}
                        >
                          {/* Checked mark if voter has voted */}
                          {hasVotedThisPlayer && (
                            <div style={{ position: "absolute", top: 8, right: 8, background: "#44cc88", borderRadius: "50%", padding: 3, display: "flex" }}>
                              <Check size={10} color="#000" strokeWidth={3} />
                            </div>
                          )}

                          {/* Avatar representation */}
                          <div
                            style={{
                              width: 54,
                              height: 54,
                              borderRadius: "50%",
                              background: p.color || "#999",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 22,
                              color: "#000",
                              fontWeight: 950,
                              boxShadow: `0 0 16px ${p.color || "#fff"}66`,
                              marginBottom: 12,
                            }}
                          >
                            {p.username?.[0]?.toUpperCase() || "?"}
                          </div>

                          <div style={{ fontWeight: 800, fontSize: 14, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.username}
                          </div>

                          {p.id === myId && (
                            <span style={{ fontSize: 9, background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: 4, marginTop: 4, fontWeight: 700 }}>
                              YOURSELF
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Skip Vote option */}
                    <button
                      onClick={() => !voteConfirmed && amIAlive && setSelectedVoteId("skip")}
                      disabled={voteConfirmed || !amIAlive}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px 14px",
                        borderRadius: 16,
                        background: selectedVoteId === "skip"
                          ? "linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(0, 0, 0, 0.6))"
                          : "rgba(255, 255, 255, 0.03)",
                        border: selectedVoteId === "skip"
                          ? "2.5px solid #ffd700"
                          : "1.5px solid rgba(255, 255, 255, 0.08)",
                        color: "#fff",
                        cursor: (voteConfirmed || !amIAlive) ? "not-allowed" : "pointer",
                        transition: "all 0.25s ease",
                        boxShadow: selectedVoteId === "skip" ? "0 0 20px rgba(255, 215, 0, 0.2)" : "none",
                        minHeight: 120,
                      }}
                      onMouseEnter={(e) => {
                        if (!voteConfirmed && amIAlive) {
                          e.currentTarget.style.transform = "scale(1.04)";
                          e.currentTarget.style.borderColor = selectedVoteId === "skip" ? "#ffd700" : "rgba(255, 215, 0, 0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!voteConfirmed && amIAlive) {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.borderColor = selectedVoteId === "skip" ? "#ffd700" : "rgba(255, 255, 255, 0.08)";
                        }
                      }}
                    >
                      <Compass size={32} color={selectedVoteId === "skip" ? "#ffd700" : "#888"} style={{ marginBottom: 10 }} />
                      <div style={{ fontWeight: 800, fontSize: 14 }}>Skip Voting</div>
                      <span style={{ fontSize: 9, color: "#666", marginTop: 2 }}>Abstain from voting</span>
                    </button>
                  </div>

                  {/* Confirmation Button */}
                  {amIAlive && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                      <button
                        onClick={handleConfirmVote}
                        disabled={!selectedVoteId || voteConfirmed}
                        style={{
                          padding: "12px 48px",
                          borderRadius: 30,
                          fontSize: 14,
                          fontWeight: 900,
                          letterSpacing: "0.08em",
                          border: "none",
                          cursor: (!selectedVoteId || voteConfirmed) ? "not-allowed" : "pointer",
                          background: voteConfirmed
                            ? "rgba(68, 204, 136, 0.25)"
                            : selectedVoteId
                            ? "linear-gradient(135deg, #ff4455, #cc1122)"
                            : "rgba(255, 255, 255, 0.06)",
                          color: voteConfirmed
                            ? "#44cc88"
                            : selectedVoteId
                            ? "#fff"
                            : "#555",
                          boxShadow: selectedVoteId && !voteConfirmed ? "0 8px 24px rgba(255, 68, 85, 0.4)" : "none",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {voteConfirmed ? (
                          <>
                            <Check size={16} /> VOTE RECORDED
                          </>
                        ) : (
                          <>
                            <Skull size={16} /> CONFIRM ELIMINATION VOTE
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 3: CINEMATIC REVEAL SCREEN */}
              {subPhase === "REVEAL" && revealData && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px 40px",
                    animation: "cinematic-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 550,
                      background: "linear-gradient(180deg, rgba(20, 10, 30, 0.95) 0%, rgba(8, 4, 14, 0.98) 100%)",
                      border: "2px solid rgba(255, 215, 0, 0.4)",
                      borderRadius: 24,
                      padding: "36px 30px",
                      textAlign: "center",
                      animation: "card-spin-glow 6s infinite",
                      boxShadow: "0 0 50px rgba(0, 0, 0, 0.9)",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#ffd700", fontWeight: 900, letterSpacing: "0.15em", marginBottom: 12 }}>
                      🚨 ELIMINATION DECREE 🚨
                    </div>

                    {revealData.eliminatedPlayer ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                          {/* Big glowing avatar */}
                          <div
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: "50%",
                              background: revealData.eliminatedPlayer.color || "#ff3344",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 32,
                              fontWeight: 950,
                              color: "#000",
                              boxShadow: `0 0 30px ${revealData.eliminatedPlayer.color || "#ff3344"}bb`,
                            }}
                          >
                            {revealData.eliminatedPlayer.username?.[0]?.toUpperCase() || "?"}
                          </div>
                        </div>

                        <div style={{ fontSize: 24, fontWeight: 950, color: "#fff", letterSpacing: "0.02em", marginBottom: 8 }}>
                          {revealData.eliminatedPlayer.username}
                        </div>

                        <div style={{ color: "#aaa", fontSize: 13, marginBottom: 24 }}>
                          has been voted out by the assembly
                        </div>

                        {/* Revealed Role Title */}
                        <div
                          style={{
                            padding: "16px 20px",
                            borderRadius: 16,
                            background: `${ROLE_COLORS[revealData.eliminatedPlayer.role] || "#999"}15`,
                            border: `2px solid ${ROLE_COLORS[revealData.eliminatedPlayer.role] || "#999"}55`,
                            color: ROLE_COLORS[revealData.eliminatedPlayer.role] || "#fff",
                            fontSize: 16,
                            fontWeight: 950,
                            letterSpacing: "0.1em",
                            display: "inline-block",
                            minWidth: 200,
                            boxShadow: `0 0 20px ${ROLE_COLORS[revealData.eliminatedPlayer.role] || "#999"}22`,
                            marginBottom: 30,
                          }}
                        >
                          THEIR ROLE WAS:<br />
                          <span style={{ fontSize: 22, marginTop: 4, display: "block" }}>
                            {ROLE_EMOJI[revealData.eliminatedPlayer.role] || "👤"} {ROLE_LABELS[revealData.eliminatedPlayer.role] || "VILLAGER"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div style={{ margin: "40px 0" }}>
                        <div style={{ fontSize: 64, marginBottom: 12 }}>⚖️</div>
                        <div style={{ fontSize: 22, fontWeight: 950, color: "#ffaa33" }}>
                          NO ONE GOT ELIMINATED
                        </div>
                        <div style={{ color: "#777", fontSize: 13, marginTop: 6, padding: "0 20px" }}>
                          Voting resulted in a tie or skipped decision. No player was removed from the casino floor.
                        </div>
                      </div>
                    )}

                    <div style={{ height: 1, background: "rgba(255, 215, 0, 0.15)", margin: "0 auto 20px", width: "80%" }} />

                    {/* Mafia Status */}
                    <div>
                      {revealData.mafiaCount > 0 ? (
                        <>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#ff3344", fontWeight: 800, fontSize: 14 }}>
                            <AlertTriangle size={16} /> Mafia is still hunting!
                          </div>
                          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                            Remaining Mafias lurking on map: <span style={{ color: "#ff3344", fontWeight: 900 }}>{revealData.mafiaCount}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#44cc88", fontWeight: 900, fontSize: 16 }}>
                            🎉 VILLAGERS TRIUMPH!
                          </div>
                          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                            All Mafias have been eliminated. Casino Royale is safe!
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Stand-up locked local toast */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 120,
            left: "50%",
            zIndex: 9999,
            background: "linear-gradient(135deg, rgba(255, 50, 68, 0.95), rgba(180, 10, 25, 0.98))",
            border: "1.5px solid #ff3344",
            borderRadius: 30,
            padding: "10px 24px",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 8px 32px rgba(255, 50, 68, 0.4)",
            animation: "disc-toast-in 2.8s ease forwards",
            whiteSpace: "nowrap",
          }}
        >
          <Lock size={15} />
          {toastMsg}
        </div>
      )}
    </>
  );
}
