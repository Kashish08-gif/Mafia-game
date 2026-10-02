/**
 * useNightActions.js
 * ─────────────────────────────────────────────────────────────────
 * Modular hook that manages ALL night-phase socket communication:
 *
 *  • Outbound emitters:  emitMafiaVote / emitDoctorHeal / emitPoliceInspect
 *                        emitMafiaChat / emitNightAction (unified dispatcher)
 *  • Inbound listeners:  night-action-confirmed / night-action-error
 *                        night-mafia-votes-update / night-police-result
 *                        night-mafia-chat-receive / morning-announcement
 *                        night-resolved / game-over
 *
 * All state is owned here and exposed via the return value so
 * GameMapPage stays clean.  Listeners auto-register on mount and
 * are removed on unmount — no leaks.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { getSocket } from "../services/socket.js";

// ── Helper: deduplicate messages by ts+id ───────────────────────
const addMsg = (prev, msg) => {
  const key = `${msg.id || "sys"}_${msg.ts || Date.now()}`;
  if (prev.some((m) => `${m.id || "sys"}_${m.ts}` === key)) return prev;
  return [...prev, { ...msg, _key: key }];
};

export default function useNightActions({
  roomId,
  myRole, // "mafia" | "doctor" | "police" | "villager"
  isAlive,
  setIsAlive,
  myName,
  myId,
  players, // live remote player list (from GameMapPage state)
  setPlayers, // setter so we can mark isAlive: false on game-over reveal
  setPhase,
  setTimer,
  setDay,
  setChat, // main game chat setter (for morning messages)
}) {
  // ── Night action state ────────────────────────────────────────
  const [nightActionDone, setNightActionDone] = useState(false);
  const [nightActionTarget, setNightActionTarget] = useState(null); // socketId chosen
  const [nightConfirmation, setNightConfirmation] = useState(null); // { actionType, targetName, … }
  const [nightError, setNightError] = useState(null);

  // Mafia-specific
  const [mafiaChatMessages, setMafiaChatMessages] = useState([]);
  const [mafiaVoteTally, setMafiaVoteTally] = useState({});
  const [currentMafiaVotes, setCurrentMafiaVotes] = useState({});

  // Police-specific
  const [policeResult, setPoliceResult] = useState(null); // { targetUsername, alignment, isMafia }

  // Night sync — tracks whether support roles (Doctor + Police) have acted.
  // Mafia players see a "waiting" indicator until this becomes true.
  const [supportRolesDone, setSupportRolesDone] = useState(true); // default true (non-mafia don't care)
  const [pendingRoles, setPendingRoles] = useState([]); // ["Doctor", "Police"] etc.

  // Morning announcement after night resolution
  const [morningAnnouncement, setMorningAnnouncement] = useState(null); // null | { eliminatedPlayer, isSaved, day }

  // Eliminated screen data (when local player is killed)
  const [eliminatedScreenData, setEliminatedScreenData] = useState(null);

  // Game over
  const [gameOverData, setGameOverData] = useState(null); // null | { winner, reason, players }

  // Auto-clear error after 4 s
  const errorTimerRef = useRef(null);
  const setNightErrorWithTimer = useCallback((msg) => {
    setNightError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setNightError(null), 4000);
  }, []);

  // Reset night state whenever a new Night phase starts
  const resetNightState = useCallback(() => {
    setNightActionDone(false);
    setNightActionTarget(null);
    setNightConfirmation(null);
    setNightError(null);
    setMafiaChatMessages([]);
    setMafiaVoteTally({});
    setCurrentMafiaVotes({});
    setPoliceResult(null);
    setMorningAnnouncement(null);
    setSupportRolesDone(true);
    setPendingRoles([]);
  }, []);

  // ── Socket listener registration ─────────────────────────────
  useEffect(() => {
    const sock = getSocket();

    // ── Local player killed event (private event from server) ────
    const onYouWereKilled = (data) => {
      console.log("[Night] YOU WERE KILLED:", data);
      setIsAlive?.(false);
      setEliminatedScreenData(data);
    };

    // ── Night action confirmed (server echo) ──────────────────
    const onActionConfirmed = (data) => {
      setNightConfirmation(data);
      setNightActionDone(true);
      setNightActionTarget(data.targetId || null);
      // Update support-roles status if Mafia action confirmation contains it
      if (typeof data.supportRolesDone === "boolean") {
        setSupportRolesDone(data.supportRolesDone);
        setPendingRoles(data.pendingRoles || []);
      }
      console.log("[Night] Action confirmed:", data);
    };

    // ── Night action error (role/phase mismatch, etc.) ────────
    const onActionError = (data) => {
      setNightErrorWithTimer(data?.message || "Night action failed.");
      console.warn("[Night] Action error:", data);
    };

    // ── Mafia kill-vote tally (only alive Mafia see this) ─────
    const onMafiaVotesUpdate = (data) => {
      setMafiaVoteTally(data.tally || {});
      setCurrentMafiaVotes(data.votes || {});
      // Update support-roles status from server
      if (typeof data.supportRolesDone === "boolean") {
        setSupportRolesDone(data.supportRolesDone);
        setPendingRoles(data.pendingRoles || []);
      }
    };

    // ── Support roles ready (Doctor + Police both acted) ──────
    const onSupportRolesReady = (data) => {
      setSupportRolesDone(true);
      setPendingRoles([]);
      console.log("[Night:Mafia] Support roles ready:", data.message);
    };

    // ── Police investigation result (private, only police sees) ─
    const onPoliceResult = (data) => {
      setPoliceResult(data);
      console.log("[Night:Police] Investigation result:", data);
    };

    // ── Mafia secret chat (only alive Mafia receive) ──────────
    const onMafiaChatReceive = (msg) => {
      setMafiaChatMessages((prev) => addMsg(prev, msg));
    };

    // ── Morning announcement (after night resolution) ──────────
    const onMorningAnnouncement = (data) => {
      setMorningAnnouncement(data);
      setNightActionDone(false);
      setNightActionTarget(null);
      setNightConfirmation(null);
      setPoliceResult(null);

      // Check if local player was eliminated
      if (data?.eliminatedPlayer) {
        const elName = data.eliminatedPlayer.username;
        const elId = data.eliminatedPlayer.id;
        if (elId === sock.id || (myName && elName === myName)) {
          setIsAlive?.(false);
          // If we haven't already shown eliminatedScreenData from you-were-killed:
          setEliminatedScreenData((prev) => prev || {
            killerName: "The Mafia",
            reason: "MAFIA_KILL",
            eliminatedPlayer: data.eliminatedPlayer,
          });
        }

        // Update remote players list
        setPlayers?.((prev) =>
          prev.map((p) =>
            p.id === elId || p.username === elName ? { ...p, isAlive: false } : p
          )
        );
      }
      console.log("[Night] Morning announcement:", data);
    };

    // ── night-resolved (same data, keeps naming consistent) ───
    const onNightResolved = (data) => {
      // Update main game phase
      if (data.day) setDay(data.day);
      if (data.timer) setTimer(data.timer);
      setPhase("DAY");

      // Add morning kill to main chat
      if (data.eliminatedPlayer) {
        setChat((c) => [
          ...c,
          {
            sender: "System",
            text: `🌅 Morning! ${data.eliminatedPlayer.username} was killed last night.`,
            color: "#ff3344",
            ts: Date.now(),
            isSystem: true,
          },
        ]);
      } else if (data.isSaved) {
        setChat((c) => [
          ...c,
          {
            sender: "System",
            text: `🌅 Morning! The Doctor saved someone — nobody died tonight.`,
            color: "#44ff88",
            ts: Date.now(),
            isSystem: true,
          },
        ]);
      } else {
        setChat((c) => [
          ...c,
          {
            sender: "System",
            text: `🌅 Morning! A peaceful night — nobody was killed.`,
            color: "#ffd700",
            ts: Date.now(),
            isSystem: true,
          },
        ]);
      }
    };

    // ── Game over broadcast ────────────────────────────────────
    const onGameOver = (data) => {
      setGameOverData(data);
      setPhase("GAME_OVER");
      console.log("[GameOver] Received:", data);
      // Reveal all player roles in players list
      if (data.players) {
        setPlayers((prev) =>
          prev.map((p) => {
            const found = data.players.find((dp) => dp.id === p.id);
            return found
              ? { ...p, role: found.role, isAlive: found.isAlive }
              : p;
          }),
        );
      }
    };

    sock.on("you-were-killed", onYouWereKilled);
    sock.on("night-action-confirmed", onActionConfirmed);
    sock.on("night-action-error", onActionError);
    sock.on("night-mafia-votes-update", onMafiaVotesUpdate);
    sock.on("night-police-result", onPoliceResult);
    sock.on("night-mafia-chat-receive", onMafiaChatReceive);
    sock.on("morning-announcement", onMorningAnnouncement);
    sock.on("night-resolved", onNightResolved);
    sock.on("game-over", onGameOver);
    sock.on("night-support-roles-ready", onSupportRolesReady);

    return () => {
      sock.off("you-were-killed", onYouWereKilled);
      sock.off("night-action-confirmed", onActionConfirmed);
      sock.off("night-action-error", onActionError);
      sock.off("night-mafia-votes-update", onMafiaVotesUpdate);
      sock.off("night-police-result", onPoliceResult);
      sock.off("night-mafia-chat-receive", onMafiaChatReceive);
      sock.off("morning-announcement", onMorningAnnouncement);
      sock.off("night-resolved", onNightResolved);
      sock.off("game-over", onGameOver);
      sock.off("night-support-roles-ready", onSupportRolesReady);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Outbound emitters ─────────────────────────────────────────
  const emitMafiaVote = useCallback(
    (targetId) => {
      if (!isAlive || nightActionDone) return;
      const sock = getSocket();
      sock.emit("night-mafia-vote", roomId, { targetId });
      setNightActionTarget(targetId);
      console.log("[Night:Mafia] Voted to kill:", targetId);
    },
    [roomId, isAlive, nightActionDone],
  );

  const emitDoctorHeal = useCallback(
    (targetId) => {
      if (!isAlive || nightActionDone) return;
      const sock = getSocket();
      sock.emit("night-doctor-heal", roomId, { targetId });
      setNightActionTarget(targetId);
      console.log("[Night:Doctor] Healing:", targetId);
    },
    [roomId, isAlive, nightActionDone],
  );

  const emitPoliceInspect = useCallback(
    (targetId) => {
      if (!isAlive || nightActionDone) return;
      const sock = getSocket();
      sock.emit("night-police-inspect", roomId, { targetId });
      setNightActionTarget(targetId);
      console.log("[Night:Police] Inspecting:", targetId);
    },
    [roomId, isAlive, nightActionDone],
  );

  // Unified dispatcher — convenience wrapper used by NightPhasePanel
  const emitNightAction = useCallback(
    (targetId) => {
      const role = (myRole || "").toLowerCase();
      if (role === "mafia") emitMafiaVote(targetId);
      else if (role === "doctor") emitDoctorHeal(targetId);
      else if (role === "police") emitPoliceInspect(targetId);
    },
    [myRole, emitMafiaVote, emitDoctorHeal, emitPoliceInspect],
  );

  const emitMafiaChat = useCallback(
    (text) => {
      if (!isAlive || (myRole || "").toLowerCase() !== "mafia") return;
      const sock = getSocket();
      const msg = { text, ts: Date.now(), id: sock.id };
      sock.emit("night-mafia-chat", roomId, msg);
      // Optimistic local echo
      setMafiaChatMessages((prev) =>
        addMsg(prev, { ...msg, sender: "You", isSelf: true }),
      );
    },
    [roomId, isAlive, myRole],
  );

  // Dismiss morning announcement
  const dismissMorningAnnouncement = useCallback(() => {
    setMorningAnnouncement(null);
  }, []);

  // Dismiss eliminated screen
  const dismissEliminatedScreen = useCallback(() => {
    setEliminatedScreenData(null);
  }, []);

  // Dismiss game over
  const dismissGameOver = useCallback(() => {
    setGameOverData(null);
  }, []);

  return {
    // State
    nightActionDone,
    nightActionTarget,
    nightConfirmation,
    nightError,
    mafiaChatMessages,
    mafiaVoteTally,
    currentMafiaVotes,
    policeResult,
    morningAnnouncement,
    eliminatedScreenData,
    gameOverData,
    supportRolesDone,
    pendingRoles,

    // Emitters
    emitMafiaVote,
    emitDoctorHeal,
    emitPoliceInspect,
    emitNightAction,
    emitMafiaChat,

    // Utilities
    resetNightState,
    dismissMorningAnnouncement,
    dismissEliminatedScreen,
    dismissGameOver,
  };
}
