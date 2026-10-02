import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Swords, Shield, Heart, User, Key } from "lucide-react";
import { getRoomDetails } from "../../services/roomService.js";
import "../../styles/roleReveal.css";

/* ─── Role definitions ─────────────────────────────────── */
const ROLE_META = {
  mafia: {
    title: "MAFIA",
    icon: <Swords size={28} />,
    colorClass: "role-mafia",
    ability: "ELIMINATE 1 PLAYER EACH NIGHT",
    tagline:
      "You are the shadow in the dark. Eliminate the town without getting caught.",
    tip: "Deceive your opponents, build false trusts, and coordinate nighttime hits with other Mafia members secretly. Watch out for the Police — they can expose you.",
  },
  police: {
    title: "POLICE",
    icon: <Shield size={28} />,
    colorClass: "role-police",
    ability: "INVESTIGATE 1 PLAYER PER NIGHT",
    tagline:
      "You are the guardian of order. Investigate players to reveal the criminals.",
    tip: "Use your investigation ability each night to check a player's alignment. Share your findings carefully during day discussions — revealing too early makes you a target.",
  },
  doctor: {
    title: "DOCTOR",
    icon: <Heart size={28} />,
    colorClass: "role-doctor",
    ability: "PROTECT 1 PLAYER PER NIGHT",
    tagline:
      "You are the savior of lives. Save the innocent from the final strike.",
    tip: "Select one player to protect each night. Prioritize keeping the Police alive. You may save yourself once. Choose wisely — a wrong save wastes your only tool.",
  },
  villager: {
    title: "VILLAGER",
    icon: <User size={28} />,
    colorClass: "role-villager",
    ability: "VOTE WISELY DURING DISCUSSIONS",
    tagline:
      "You are the eyes of the town. Deduce who the killers are before it's too late.",
    tip: "Stay alert during discussions. Watch for voting inconsistencies, suspicious silence, or overly eager accusers. Trust your instincts — your vote can eliminate the Mafia.",
  },
};

/* ─── Helper: play envelope-open sound ─────────────────── */
function playEnvelopeSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Paper rustle burst
    const len = Math.floor(ctx.sampleRate * 0.35);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = 1400;
    bpf.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = 0.22;
    src.connect(bpf);
    bpf.connect(g);
    g.connect(ctx.destination);
    src.start();

    // Wax-seal crack (low thud)
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.18);
      og.gain.setValueAtTime(0.12, ctx.currentTime);
      og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(og);
      og.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }, 80);
  } catch (_) {
    /* silently ignore if audio context unavailable */
  }
}

/* ─── Main component ────────────────────────────────────── */
export default function RoleRevealPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [role, setRole] = useState("villager");
  const [isOpen, setIsOpen] = useState(false);
  const [showBtn, setShowBtn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const MAX_ATTEMPTS = 10;
    const RETRY_DELAY_MS = 1200;

    const fetchRole = async () => {
      while (!cancelled && attempt < MAX_ATTEMPTS) {
        attempt++;
        try {
          const token = localStorage.getItem("token");
          const response = await getRoomDetails(token, roomId);

          if (response.data.myRole) {
            if (!cancelled) {
              setRole(response.data.myRole);
              setIsLoading(false);
            }
            return;
          }

          const room = response.data.room;
          if (room?.playersState && room.playersState.length > 0) {
            const currentUserId =
              localStorage.getItem("userId") ||
              (() => {
                try {
                  const t = localStorage.getItem("token");
                  if (!t) return null;
                  return JSON.parse(atob(t.split(".")[1]))._id;
                } catch {
                  return null;
                }
              })();
            const myState = room.playersState.find((p) => {
              const pid = p.user?._id?.toString() || p.user?.toString();
              return pid === currentUserId?.toString();
            });
            if (myState?.role) {
              if (!cancelled) {
                setRole(myState.role);
                setIsLoading(false);
              }
              return;
            }
          }

          if (!cancelled && attempt < MAX_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          }
        } catch (err) {
          console.error("Failed to load role (attempt " + attempt + "):", err);
          if (!cancelled && attempt < MAX_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          }
        }
      }

      if (!cancelled) setIsLoading(false);
    };

    fetchRole();
    return () => { cancelled = true; };
  }, [roomId]);

  const handleOpenEnvelope = () => {
    if (isOpen) return;
    setIsOpen(true);
    playEnvelopeSound();
    setTimeout(() => setShowBtn(true), 1500);
  };

  const rainDrops = useMemo(
    () =>
      Array.from({ length: 75 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        height: `${50 + Math.random() * 80}px`,
        dur: `${0.35 + Math.random() * 0.4}s`,
        delay: `${-Math.random() * 2.5}s`,
        opacity: 0.04 + Math.random() * 0.09,
      })),
    [],
  );

  const particles = useMemo(
    () =>
      Array.from({ length: 38 }, (_, i) => {
        const palette = [
          "#c8a84b",
          "#c8a84b",
          "#c8a84b",
          "#a8922e",
          "#7c3aed",
          "#5b21b6",
          "#bb1828",
          "#991020",
        ];
        return {
          id: i,
          left: `${5 + Math.random() * 90}%`,
          top: `${8 + Math.random() * 82}%`,
          size: Math.random() > 0.6 ? 3 : 2,
          color: palette[Math.floor(Math.random() * palette.length)],
          dur: `${2.5 + Math.random() * 3.5}s`,
          delay: `${-Math.random() * 4}s`,
          opacity: 0.25 + Math.random() * 0.55,
        };
      }),
    [],
  );

  const meta = ROLE_META[role] || ROLE_META.villager;

  /* ── Loading screen ─────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="rr-container">
        <div className="rr-atmos-br" />
        <div className="rr-atmos-tl" />
        <div className="rr-loading-wrap">
          <div className="rr-spinner" />
          <span className="rr-loading-text">Decoding secret dispatch…</span>
        </div>
      </div>
    );
  }

  /* ── Main render ────────────────────────────────────── */
  return (
    <div className={`rr-container${isOpen ? " rr-container--open" : ""}`}>
      {/* ── Background rain ── */}
      <div className="rr-rain-layer" aria-hidden="true">
        {rainDrops.map((d) => (
          <div
            key={d.id}
            className="rr-rain-drop"
            style={{
              left: d.left,
              height: d.height,
              animationDuration: d.dur,
              animationDelay: d.delay,
              opacity: d.opacity,
            }}
          />
        ))}
      </div>

      {/* ── Pixel particles ── */}
      <div className="rr-particles-layer" aria-hidden="true">
        {particles.map((p) => (
          <div
            key={p.id}
            className="rr-particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              background: p.color,
              opacity: p.opacity,
              animationDuration: p.dur,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* ── Atmospheric glows ── */}
      <div className="rr-atmos-br" aria-hidden="true" />
      <div className="rr-atmos-tl" aria-hidden="true" />
      <div className="rr-fog" aria-hidden="true" />

      {/* ── Title block ── */}
      <header className="rr-header">
        <h1 className="rr-title">OPERATION ORDER</h1>
        <p className="rr-subtitle">
          A secret dispatch has arrived. Open it in privacy.
        </p>
      </header>

      {/* ── Envelope + card wrapper ── */}
      <div
        className={`rr-scene ${isOpen ? "is-open" : ""}`}
        onClick={handleOpenEnvelope}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleOpenEnvelope()}
        aria-label="Open envelope to reveal your role"
      >
        {/* Envelope body */}
        <div className={`rr-envelope ${isOpen ? "open" : ""}`}>
          {/* Four CSS-triangle flaps */}
          <div className="rr-flap rr-flap--top" />
          <div className="rr-flap rr-flap--bottom" />
          <div className="rr-flap rr-flap--left" />
          <div className="rr-flap rr-flap--right" />

          {/* Wax seal */}
          <div className="rr-seal">
            <div className="rr-seal-inner">
              <Key size={20} />
            </div>
          </div>
        </div>

        {/* Role card — sibling of envelope, never inherits 3-D tilt */}
        <div className={`rr-card ${isOpen ? "open" : ""} rr-card--${role}`}>
          {/* Animated sheen across card */}
          <div className="rr-sheen" aria-hidden="true" />

          {/* Role badge */}
          <div className={`rr-role-badge ${meta.colorClass}`}>
            {meta.icon}
            <span className="rr-role-name">{meta.title}</span>
          </div>

          {/* Ability pill */}
          <div className={`rr-ability ${meta.colorClass}`}>
            <span className="rr-ability-dot">◈</span>
            {meta.ability}
          </div>

          {/* Gold divider */}
          <div className="rr-divider">
            <span className="rr-divider-diamond">◆</span>
          </div>

          {/* Flavour tagline */}
          <p className="rr-tagline">"{meta.tagline}"</p>

          {/* Tactical tips */}
          <div className="rr-tips">
            <p className="rr-tips-label">TACTICAL INSTRUCTION</p>
            <p className="rr-tips-body">{meta.tip}</p>
          </div>
        </div>
      </div>

      {/* ── Proceed button (appears after card animation) ── */}
      {showBtn && (
        <button
          className={`rr-proceed rr-proceed--${role}`}
          onClick={() => navigate(`/game/${roomId}`)}
        >
          I ACCEPT MY FATE
        </button>
      )}

      {/* ── Click hint ── */}
      {!isOpen && (
        <p className="rr-hint" aria-live="polite">
          ↑ Click the envelope to reveal your fate ↑
        </p>
      )}
    </div>
  );
}
