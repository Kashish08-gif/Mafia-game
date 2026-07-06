// GameMapPage — the full 3D Mafia game map experience.
// • R3F 3D Casino Royale scene with WASD + mouse-look character controller
// • Real-time Socket.IO sync (player-move, send-chat, phase-change, votes)
// • Discussion fountain (day-time meeting spot)
// • Left: players list, role panel, chat
// • Top: day/night clock + alive count
// • Right: mini-map + action buttons (REPORT, USE, CROUCH, RUN)
// • Bottom: TASKS, MAP, INTERACT, EMOTE, INVENTORY
// • Voting
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Wifi,
  Settings,
  Mic,
  MicOff,
  Map as MapIcon,
  Megaphone,
  Hand,
  ChevronUp,
  ClipboardList,
  MapPin,
  Smile,
  Briefcase,
  Shield,
  Heart,
  User,
  Swords,
} from "lucide-react";
import { getSocket, disconnectSocket } from "../services/socket.js";
import { getRoomDetails } from "../services/roomService.js";
import { BUILDINGS, FOUNTAIN_POS } from "../components/CasinoMap.jsx";
// Import modular game sub-components
import GameCanvasOptimized from "../components/game/GameCanvasOptimized.jsx";
import PlayerList from "../components/game/PlayerList.jsx";
import ChatBox from "../components/game/ChatBox.jsx";
import VotingPanel from "../components/game/VotingPanel.jsx";
import MiniMap from "../components/game/MiniMap.jsx";
import PerformanceHUD from "../components/game/PerformanceHUD.jsx";

// ── role meta ──────────────────────────────────────────────
const ROLE_META = {
  mafia: {
    label: "MAFIA",
    color: "#ff3344",
    icon: <Swords size={20} />,
    abilities: [
      { name: "Kill", count: 1 },
      { name: "Sabotage", count: 2 },
      { name: "Fake Task", count: 2 },
      { name: "Hide Body", count: 1 },
    ],
  },
  police: {
    label: "POLICE",
    color: "#4488ff",
    icon: <Shield size={20} />,
    abilities: [
      { name: "Investigate", count: 1 },
      { name: "Arrest", count: 1 },
    ],
  },
  doctor: {
    label: "DOCTOR",
    color: "#44cc88",
    icon: <Heart size={20} />,
    abilities: [
      { name: "Save", count: 1 },
      { name: "Self-Save", count: 1 },
    ],
  },
  villager: {
    label: "VILLAGER",
    color: "#dddddd",
    icon: <User size={20} />,
    abilities: [{ name: "Vote", count: 1 }],
  },
};

const NAME_COLORS = [
  "#ff66b2",
  "#ffa726",
  "#66bb6a",
  "#42a5f5",
  "#ab47bc",
  "#ec407a",
  "#26a69a",
  "#ffee58",
]

// Stable no-op so GameCanvasOptimized.memo never sees a new function reference
const NOOP = () => {};

// ── Main Page ────────────────────────────────────────────────
export default function GameMapPage() {
  const { roomId = "demo" } = useParams();
  const navigate = useNavigate();

  // In-memory token lock on mount to prevent multi-tab token sharing overrides
  const tokenRef = useRef(localStorage.getItem("token"));

  const myId = useMemo(() => {
    try {
      const token = tokenRef.current;
      if (!token) return `guest-${Math.random().toString(36).slice(2, 7)}`;
      return JSON.parse(atob(token.split(".")[1]))._id;
    } catch {
      return `guest-${Math.random().toString(36).slice(2, 7)}`;
    }
  }, []);

  const [myName, setMyName] = useState(() => {
    // Only use mafia_username (written by HUD from DB). Never read the stale "username" key.
    return localStorage.getItem("mafia_username") || `Player_${myId.slice(-4)}`;
  });

  const myColor = useMemo(
    () =>
      NAME_COLORS[
        Math.abs(myId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
          NAME_COLORS.length
      ],
    [myId],
  );

  // Game state
  const [myPos, setMyPos] = useState([0, 0, 6]);
  const [myRot, setMyRot] = useState(0);
  const [players, setPlayers] = useState([]); // remote players
  const [phase, setPhase] = useState("DAY");
  const [timer, setTimer] = useState(165);
  const [day, setDay] = useState(1);
  const [myRole, setMyRole] = useState("villager");
  const [isAlive, setIsAlive] = useState(true);
  const [chat, setChat] = useState([]);
  const [voteTally, setVoteTally] = useState({});
  const [showVote, setShowVote] = useState(false);
  const [muted, setMuted] = useState(false);
  const lastEmitRef = useRef(0);

  // Total players in the DB room, default to 5
  const [dbTotalPlayers, setDbTotalPlayers] = useState(5);

  // Fetch real game state & roles from backend API on mount + phase changes.
  // After resolving, push the correct username + role to the socket so other
  // players see accurate data without a full re-join.
  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        const token = tokenRef.current;
        const response = await getRoomDetails(token, roomId);
        if (response.data?.success) {
          const room = response.data.room;

          let resolvedName = null;
          let resolvedRole = null;
          let resolvedAlive = true;

          // Set total player count in the room
          if (room?.users) {
            setDbTotalPlayers(room.users.length);
          }

          // Resolve dynamic username from the authoritative DB data
          if (room?.users) {
            const me = room.users.find(u => (u._id?.toString() || u.toString()) === myId);
            if (me?.username) {
              resolvedName = me.username;
              setMyName(me.username);
              // Keep mafia_username in sync so the socket initial join also benefits
              localStorage.setItem("mafia_username", me.username);
            }
          }

          // Resolve role & alive status
          if (response.data.myRole) {
            resolvedRole = response.data.myRole;
            setMyRole(response.data.myRole);
          } else if (room?.playersState) {
            const myState = room.playersState.find(p => {
              const pid = p.user?._id?.toString() || p.user?.toString();
              return pid === myId;
            });
            if (myState?.role) {
              resolvedRole = myState.role;
              setMyRole(myState.role);
            }
            if (myState) {
              resolvedAlive = myState.isAlive !== false;
              setIsAlive(myState.isAlive !== false);
            }
          }

          // Push the correct data to the socket server so remote players see
          // the right username/role without triggering a re-join.
          if (resolvedName || resolvedRole) {
            try {
              const sock = getSocket();
              sock.emit("update-player", roomId, {
                username: resolvedName,
                role: resolvedRole,
                isAlive: resolvedAlive,
              });
            } catch (_) { /* socket not yet connected, join-map will carry correct data */ }
          }
        }
      } catch (err) {
        console.error("Error fetching room role info:", err);
      }
    };
    if (roomId && roomId !== "demo") {
      fetchGameDetails();
    }
  }, [roomId, myId, phase]);

  // Connect socket & wire events — runs once on mount (roomId/myId are stable)
  useEffect(() => {
    const sock = getSocket();

    // Emit join-map using the best available name at this point.
    // The name/role will be refreshed once the API fetch resolves.
    sock.emit("join-map", roomId, {
      username: myName,
      color: myColor,
      role: myRole,
      position: { x: myPos[0], y: 0, z: myPos[2] },
    });
const onSnapshot = (snap) => {
  console.log("========== SNAPSHOT ==========");
  console.log(snap);
  console.log("Players received:", snap.players);

  setPlayers((snap.players || []).filter((p) => p.id !== sock.id));

  setPhase(snap.phase || "DAY");
  setTimer(snap.timer || 0);
  setDay(snap.day || 1);
};
    const onJoin = (p) => {
      setPlayers((prev) =>
        prev.find((x) => x.id === p.id) ? prev : [...prev, p],
      );
      setChat((c) => [
        ...c,
        {
          sender: "System",
          text: `${p.username} entered the map`,
          color: "#5ad15a",
        },
      ]);
    };
    const onMove = (p) => {
      setPlayers((prev) =>
        prev.map((x) =>
          x.id === p.id
            ? {
                ...x,
                position: p.position,
                rotation: p.rotation,
                walking: true,
              }
            : x,
        ),
      );
    };
    const onLeave = ({ id }) =>
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    const onChat = (m) => setChat((c) => [...c, m]);
    const onPhase = (d) => {
      setPhase(d.phase);
      setTimer(d.timer);
      setDay(d.day);
      setVoteTally({});
    };
    const onTick = (d) => {
      setTimer(d.timer);
      setPhase(d.phase);
      setDay(d.day);
    };
    const onVote = (d) => setVoteTally(d.tally || {});
    // When a remote player pushes their DB-resolved username/role, update our list
    const onPlayerUpdated = (p) => {
      setPlayers((prev) =>
        prev.map((x) =>
          x.id === p.id
            ? { ...x, ...p }
            : x,
        ),
      );
    };

    sock.on("map-snapshot", onSnapshot);
    sock.on("player-joined", onJoin);
    sock.on("player-moved", onMove);
    sock.on("player-left", onLeave);
    sock.on("receive-chat", onChat);
    sock.on("phase-change", onPhase);
    sock.on("phase-tick", onTick);
    sock.on("vote-update", onVote);
    sock.on("player-updated", onPlayerUpdated);

    return () => {
      sock.off("map-snapshot", onSnapshot);
      sock.off("player-joined", onJoin);
      sock.off("player-moved", onMove);
      sock.off("player-left", onLeave);
      sock.off("receive-chat", onChat);
      sock.off("phase-change", onPhase);
      sock.off("phase-tick", onTick);
      sock.off("vote-update", onVote);
      sock.off("player-updated", onPlayerUpdated);
      disconnectSocket();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // Only re-run if roomId changes (navigation). myName/myRole updates handled separately.

  // Clear "walking" indicator on other players after 200ms of no updates
  useEffect(() => {
    const t = setInterval(() => {
      setPlayers((prev) => prev.map((p) => ({ ...p, walking: false })));
    }, 400);
    return () => clearInterval(t);
  }, []);

  // Throttle outgoing position updates (every ~80ms)
  useEffect(() => {
    const now = performance.now();
    if (now - lastEmitRef.current < 70) return;
    lastEmitRef.current = now;
    const sock = getSocket();
    sock.emit("player-move", roomId, {
      position: { x: myPos[0], y: myPos[1], z: myPos[2] },
      rotation: myRot,
    });
  }, [myPos, myRot, roomId]);



  const castVote = (targetId) => {
    const sock = getSocket();
    sock.emit("cast-vote", roomId, { targetId });
    setChat((c) => [
      ...c,
      {
        sender: "System",
        text: `You voted to eliminate a player.`,
        color: "#ffd700",
      },
    ]);
  };

  // Timer mm:ss formatter
  const mmss = useMemo(() => {
    const m = Math.floor(timer / 60)
      .toString()
      .padStart(2, "0");
    const s = (timer % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [timer]);

  const meta = ROLE_META[myRole] || ROLE_META.villager;
  const aliveCount = (isAlive ? 1 : 0) + players.filter((p) => p.isAlive !== false).length;
  const totalPlayers = dbTotalPlayers;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        overflow: "hidden",
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* 3D Canvas — wrapped in React.memo; only re-renders on actual prop value changes */}
      <GameCanvasOptimized
        myPos={myPos}
        setMyPos={setMyPos}
        myRot={myRot}
        setMyRot={setMyRot}
        myName={myName}
        myColor={myColor}
        myRole={myRole}
        isAlive={isAlive}
        players={players}
        phase={phase}
        onMovingChange={NOOP}
        buildings={BUILDINGS}
      />

      {/* TOP-LEFT: Room banner */}
      <div
        data-testid="hud-room-banner"
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          padding: "10px 20px",
          background: "linear-gradient(135deg, rgba(30,10,40,0.85) 0%, rgba(10,5,20,0.95) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid #ffd70044",
          borderRadius: 14,
          boxShadow: "0 0 15px rgba(255, 215, 0, 0.15)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontWeight: 900,
            letterSpacing: "0.15em",
            fontSize: 14,
            color: "#ffd700",
            textShadow: "0 0 8px rgba(255, 215, 0, 0.6)",
          }}
        >
          🎰 CASINO ROYALE
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            color: "#5ad15a",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Wifi size={13} /> 48ms
        </span>
      </div>

      {/* LEFT: Players Alive list */}
      <PlayerList
        myId={myId}
        myName={myName}
        myColor={myColor}
        isAlive={isAlive}
        players={players}
        
      />

      {/* LEFT-MIDDLE: Role panel */}
      <div
        data-testid="hud-role-panel"
        style={{
          position: "absolute",
          bottom: 280,
          left: 16,
          width: 270,
          background: "linear-gradient(135deg, rgba(15,8,25,0.9) 0%, rgba(5,2,10,0.96) 100%)",
          backdropFilter: "blur(12px)",
          border: `1.5px solid ${meta.color}`,
          boxShadow: `0 0 16px ${meta.color}33, inset 0 0 12px rgba(255, 215, 0, 0.1)`,
          borderRadius: 16,
          padding: 16,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{
            color: meta.color,
            background: `${meta.color}18`,
            padding: 8,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 8px ${meta.color}22`
          }}>{meta.icon}</div>
          <div>
            <div
              style={{ fontSize: 9, color: "#aaa", letterSpacing: "0.15em", fontWeight: 800 }}
            >
              YOUR ASSIGNED FATE
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: meta.color,
                letterSpacing: "0.08em",
                textShadow: `0 0 8px ${meta.color}55`,
              }}
            >
              {meta.label}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#ffd700", fontWeight: 800, letterSpacing: '0.05em', marginBottom: 8 }}>
          SPECIAL ABILITIES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {meta.abilities.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: 'center',
                padding: "6px 10px",
                fontSize: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: 8,
              }}
            >
              <span style={{ color: '#eee', fontWeight: 600 }}>✦ {a.name}</span>
              <span style={{ color: meta.color, fontWeight: 900, fontSize: 11, background: `${meta.color}15`, padding: '1px 6px', borderRadius: 4 }}>
                {a.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* LEFT-BOTTOM: Chat */}
      <div
        data-testid="hud-chat"
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          zIndex: 10,
        }}
      >
        <ChatBox
          messages={chat}
          onSend={(text) => {
            const sock = getSocket();
            sock.emit("send-chat", roomId, {
              sender: myName,
              text,
              color: myColor,
              ts: Date.now(),
            });
          }}
          myColor={myColor}
        />
      </div>

      {/* TOP CENTER: Day/Night clock */}
      <div
        data-testid="hud-phase-clock"
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          background: "linear-gradient(180deg, rgba(20,10,30,0.88) 0%, rgba(8,4,12,0.96) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid #ffd700",
          boxShadow: '0 0 15px rgba(255, 215, 0, 0.2), 0 8px 32px rgba(0,0,0,0.5)',
          borderRadius: 14,
          padding: "10px 26px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 26 }}>{phase === "NIGHT" ? "🌙" : "☀️"}</span>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em" }}>
            {phase} · Day {day}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              fontFamily: "monospace",
              color: phase === "NIGHT" ? "#7c8cff" : "#ffe066",
            }}
          >
            {mmss}
          </div>
          <div style={{ fontSize: 10, color: "#5aa8ff" }}>
            {phase === "DAY" ? "Discussion phase" : "Mafia phase"}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#888" }}>Alive</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#5ad15a" }}>
            {aliveCount}
          </div>
        </div>
      </div>

      {/* TOP-RIGHT: side buttons + mini-map */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          zIndex: 10,
        }}
      >
        {/* Performance HUD */}
        <PerformanceHUD />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: <Settings size={18} />, t: "settings" },
            { icon: <MapIcon size={18} />, t: "map" },
            {
              icon: muted ? <MicOff size={18} /> : <Mic size={18} />,
              t: "mute",
              onClick: () => setMuted((m) => !m),
            },
          ].map((b) => (
            <button
              key={b.t}
              data-testid={`btn-${b.t}`}
              onClick={b.onClick}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.7)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.18s",
              }}
            >
              {b.icon}
            </button>
          ))}
        </div>
        <MiniMap
          myPos={myPos}
          players={players}
          myColor={myColor}
          buildings={BUILDINGS}
          fountainPos={FOUNTAIN_POS}
        />
      </div>

      {/* RIGHT-BOTTOM: Action buttons */}
      <div
        data-testid="hud-actions"
        style={{
          position: "absolute",
          right: 20,
          bottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          alignItems: "center",
          zIndex: 10,
        }}
      >
        {[
          {
            icon: <Megaphone size={20} />,
            label: "REPORT",
            color: "#ff4455",
            testid: "btn-report",
            onClick: () => phase === "DAY" && setShowVote(true),
          },
          {
            icon: <Hand size={20} />,
            label: "USE",
            color: "#fff",
            testid: "btn-use",
          },
          {
            icon: (
              <ChevronUp size={20} style={{ transform: "rotate(180deg)" }} />
            ),
            label: "CROUCH",
            color: "#fff",
            testid: "btn-crouch",
          },
          {
            icon: <span style={{ fontSize: 18 }}>🏃</span>,
            label: "RUN",
            color: "#fff",
            testid: "btn-run",
          },
        ].map((a) => (
          <button
            key={a.label}
            data-testid={a.testid}
            onClick={a.onClick}
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: a.color === '#ff4455'
                ? "radial-gradient(circle, #cc1122 0%, #66000a 100%)"
                : "radial-gradient(circle, #2d2a33 0%, #151319 100%)",
              border: `2px double ${a.color === '#ff4455' ? '#ffd700' : 'rgba(255,255,255,0.4)'}`,
              color: a.color === '#ff4455' ? '#fff' : '#eee',
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.borderColor = '#ffd700'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = a.color === '#ff4455' ? '#ffd700' : 'rgba(255,255,255,0.4)'; }}
          >
            {a.icon}
            <span
              style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.08em" }}
            >
              {a.label}
            </span>
          </button>
        ))}
      </div>

      {/* BOTTOM CENTER: HUD buttons */}
      <div
        data-testid="hud-bottom-bar"
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 14,
          alignItems: "center",
          zIndex: 10,
        }}
      >
        {[
          {
            icon: <ClipboardList size={18} />,
            label: "TASKS",
            testid: "btn-tasks",
          },
          { icon: <MapPin size={18} />, label: "MAP", testid: "btn-map" },
          {
            icon: <Hand size={20} />,
            label: "Interact",
            testid: "btn-interact",
            big: true,
          },
          { icon: <Smile size={18} />, label: "EMOTE", testid: "btn-emote" },
          {
            icon: <Briefcase size={18} />,
            label: "INVENTORY",
            testid: "btn-inventory",
          },
        ].map((a) => (
          <button
            key={a.label}
            data-testid={a.testid}
            style={{
              width: a.big ? 76 : 58,
              height: a.big ? 76 : 58,
              borderRadius: "50%",
              background: a.big
                ? "radial-gradient(circle, #b8860b 0%, #5a3d06 100%)"
                : "radial-gradient(circle, rgba(140,15,30,0.92) 0%, rgba(20,5,10,0.96) 100%)",
              border: a.big ? "2.5px double #ffffff" : "2.5px double #ffd700",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              boxShadow: '0 6px 16px rgba(0,0,0,0.6)',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {a.icon}
            <span
              style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.06em", color: a.big ? '#fff' : '#ffd700' }}
            >
              {a.label}
            </span>
          </button>
        ))}
      </div>

      {/* Phase notification banner */}
      {phase === "DAY" && (
        <div
          style={{
            position: "absolute",
            top: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255, 215, 0, 0.12)",
            border: "1px solid #ffd70077",
            color: "#ffd700",
            padding: "6px 16px",
            borderRadius: 20,
            fontSize: 11,
            letterSpacing: "0.1em",
            zIndex: 10,
          }}
        >
          ☀ Day Discussion — head to the golden fountain to meet & vote!
        </div>
      )}

      {/* Vote modal */}
      {showVote && (
        <VotingPanel
          players={[
            { id: myId, username: myName, color: myColor, isAlive },
            ...players,
          ]}
          tally={voteTally}
          onVote={castVote}
          onClose={() => setShowVote(false)}
          myId={myId}
        />
      )}

      {/* Controls hint */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.08em",
          zIndex: 5,
        }}
      >
        WASD to move · Shift to sprint · Right-click + drag to look · Step on
        fountain ring for discussion
      </div>

      {/* Exit button */}
      <button
        data-testid="btn-exit"
        onClick={() => {
          disconnectSocket();
          navigate("/");
        }}
        style={{
          position: "absolute",
          bottom: 6,
          right: 12,
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.4)",
          cursor: "pointer",
          fontSize: 11,
          zIndex: 10,
        }}
      >
        Leave game →
      </button>
    </div>
  );
}
