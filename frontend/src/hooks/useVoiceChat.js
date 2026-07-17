/**
 * useVoiceChat.js
 * ─────────────────────────────────────────────────────────────────
 * Modular WebRTC voice communication hook for Mafia Game Discussion Phase.
 *
 * Architecture:
 *  - getUserMedia() for local microphone stream
 *  - RTCPeerConnection per remote peer (full mesh topology)
 *  - Socket.IO used as the signaling relay (offer/answer/ICE)
 *  - AudioContext AnalyserNode for real-time speaking detection
 *
 * Usage:
 *   const voice = useVoiceChat({ socket, roomId, myId, isActive });
 *   voice.micMuted        → boolean
 *   voice.toggleMic()     → mute/unmute local mic
 *   voice.speakerMuted    → boolean
 *   voice.toggleSpeaker() → mute/unmute all incoming audio
 *   voice.activeSpeakers  → Set<socketId> currently speaking
 *   voice.peersReady      → Set<socketId> connected peers
 *   voice.micGranted      → boolean — mic permission status
 */

import { useRef, useState, useEffect, useCallback } from 'react';

// ── ICE Servers (STUN only — free tier, works for LAN/localhost) ──
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Speaking detection threshold (0–255 analyser scale)
const SPEAKING_THRESHOLD = 18;
const SPEAKING_CHECK_MS  = 80;

export default function useVoiceChat({ socket, roomId, myId, isActive }) {
  // ── Local state ──────────────────────────────────────────────────
  const [micMuted,      setMicMuted]      = useState(false);
  const [speakerMuted,  setSpeakerMuted]  = useState(false);
  const [micGranted,    setMicGranted]    = useState(false);
  const [activeSpeakers,setActiveSpeakers]= useState(new Set());
  const [peersReady,    setPeersReady]    = useState(new Set());

  // ── Internal refs (never trigger re-renders) ─────────────────────
  const localStreamRef  = useRef(null);   // MediaStream from getUserMedia
  const pcsRef          = useRef({});     // { [peerId]: RTCPeerConnection }
  const remoteAudiosRef = useRef({});     // { [peerId]: HTMLAudioElement }
  const analyserRef     = useRef(null);   // AnalyserNode for local speaking detect
  const dataArrayRef    = useRef(null);   // Uint8Array for analyser
  const speakTimerRef   = useRef(null);   // setInterval handle
  const isActiveRef     = useRef(false);

  isActiveRef.current = isActive;

  // ── Helpers ──────────────────────────────────────────────────────

  /** Create and store an RTCPeerConnection for a remote peer. */
  const createPeer = useCallback((peerId) => {
    if (pcsRef.current[peerId]) return pcsRef.current[peerId];

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Attach local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE candidate → relay via socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('voice-ice-candidate', roomId, {
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Remote track arrived → attach to audio element
    pc.ontrack = (event) => {
      let audio = remoteAudiosRef.current[peerId];
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudiosRef.current[peerId] = audio;
      }
      audio.srcObject = event.streams[0];
      audio.muted = speakerMuted;
      audio.play().catch(() => {});

      // Detect remote speaking via AudioContext analyser
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(event.streams[0]);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);

        const checkSpeaking = () => {
          if (!isActiveRef.current) return;
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, v) => a + v, 0) / buf.length;
          setActiveSpeakers(prev => {
            const next = new Set(prev);
            if (avg > SPEAKING_THRESHOLD) next.add(peerId);
            else next.delete(peerId);
            return next;
          });
        };

        const interval = setInterval(checkSpeaking, SPEAKING_CHECK_MS);
        // Cleanup stored on pc object
        pc._speakInterval = interval;
        pc._audioCtx = ctx;
      } catch (_) { /* AudioContext not critical */ }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setPeersReady(prev => new Set([...prev, peerId]));
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setPeersReady(prev => {
          const next = new Set(prev);
          next.delete(peerId);
          return next;
        });
        setActiveSpeakers(prev => {
          const next = new Set(prev);
          next.delete(peerId);
          return next;
        });
      }
    };

    pcsRef.current[peerId] = pc;
    return pc;
  }, [socket, roomId, speakerMuted]);

  /** Close and clean up a single peer connection. */
  const closePeer = useCallback((peerId) => {
    const pc = pcsRef.current[peerId];
    if (pc) {
      if (pc._speakInterval) clearInterval(pc._speakInterval);
      if (pc._audioCtx) pc._audioCtx.close().catch(() => {});
      pc.close();
      delete pcsRef.current[peerId];
    }
    const audio = remoteAudiosRef.current[peerId];
    if (audio) {
      audio.srcObject = null;
      delete remoteAudiosRef.current[peerId];
    }
    setPeersReady(prev => {
      const next = new Set(prev);
      next.delete(peerId);
      return next;
    });
    setActiveSpeakers(prev => {
      const next = new Set(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  /** Stop all peers and local stream. Full teardown. */
  const stopVoice = useCallback(() => {
    // Clear speaking timer
    if (speakTimerRef.current) {
      clearInterval(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    // Close all peer connections
    Object.keys(pcsRef.current).forEach(closePeer);
    pcsRef.current = {};
    // Stop local media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current = null;
    }
    setMicGranted(false);
    setActiveSpeakers(new Set());
    setPeersReady(new Set());
  }, [closePeer]);

  /** Start local mic and announce readiness to room. */
  const startVoice = useCallback(async () => {
    if (localStreamRef.current) return; // already started
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      setMicGranted(true);

      // Local speaking detection
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

        speakTimerRef.current = setInterval(() => {
          if (!analyserRef.current || !isActiveRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          const avg = dataArrayRef.current.reduce((a, v) => a + v, 0) / dataArrayRef.current.length;
          setActiveSpeakers(prev => {
            const next = new Set(prev);
            if (avg > SPEAKING_THRESHOLD && !micMuted) next.add(myId);
            else next.delete(myId);
            return next;
          });
        }, SPEAKING_CHECK_MS);
      } catch (_) { /* non-critical */ }

      // Tell everyone in room we're ready
      if (socket) {
        socket.emit('voice-ready', roomId, { from: socket.id });
      }

      console.log('[Voice] Local stream started, mic granted.');
    } catch (err) {
      console.warn('[Voice] Mic access denied or error:', err.message);
      setMicGranted(false);
    }
  }, [socket, roomId, myId, micMuted]);

  // ── Mic toggle ───────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const newMuted = !micMuted;
    localStreamRef.current.getAudioTracks().forEach(t => {
      t.enabled = !newMuted;
    });
    setMicMuted(newMuted);
    // Update local speaker indicator
    if (newMuted) {
      setActiveSpeakers(prev => {
        const next = new Set(prev);
        next.delete(myId);
        return next;
      });
    }
  }, [micMuted, myId]);

  // ── Speaker toggle ───────────────────────────────────────────────
  const toggleSpeaker = useCallback(() => {
    const newMuted = !speakerMuted;
    setSpeakerMuted(newMuted);
    Object.values(remoteAudiosRef.current).forEach(audio => {
      audio.muted = newMuted;
    });
  }, [speakerMuted]);

  // ── Socket signaling handlers ────────────────────────────────────
  useEffect(() => {
    if (!socket || !isActive) return;

    // Another peer announced they're ready → we send an offer
    const onVoiceReady = async ({ from }) => {
      if (!localStreamRef.current || from === socket.id) return;
      try {
        const pc = createPeer(from);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice-offer', roomId, { to: from, offer });
      } catch (err) {
        console.warn('[Voice] Error creating offer:', err);
      }
    };

    // We received an offer → create answer
    const onVoiceOffer = async ({ from, offer }) => {
      if (!localStreamRef.current) return;
      try {
        const pc = createPeer(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice-answer', roomId, { to: from, answer });
      } catch (err) {
        console.warn('[Voice] Error handling offer:', err);
      }
    };

    // We received an answer → set remote desc
    const onVoiceAnswer = async ({ from, answer }) => {
      try {
        const pc = pcsRef.current[from];
        if (pc && pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.warn('[Voice] Error handling answer:', err);
      }
    };

    // ICE candidate from remote peer
    const onVoiceICE = async ({ from, candidate }) => {
      try {
        const pc = pcsRef.current[from];
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn('[Voice] Error adding ICE candidate:', err);
      }
    };

    // Peer left → close their connection
    const onPlayerLeft = ({ id }) => closePeer(id);

    socket.on('voice-ready',         onVoiceReady);
    socket.on('voice-offer',         onVoiceOffer);
    socket.on('voice-answer',        onVoiceAnswer);
    socket.on('voice-ice-candidate', onVoiceICE);
    socket.on('player-left',         onPlayerLeft);

    return () => {
      socket.off('voice-ready',         onVoiceReady);
      socket.off('voice-offer',         onVoiceOffer);
      socket.off('voice-answer',        onVoiceAnswer);
      socket.off('voice-ice-candidate', onVoiceICE);
      socket.off('player-left',         onPlayerLeft);
    };
  }, [socket, roomId, isActive, createPeer, closePeer]);

  // ── Auto start/stop voice when discussion activates/deactivates ───
  useEffect(() => {
    if (isActive) {
      startVoice();
    } else {
      stopVoice();
    }
    return () => {
      if (!isActive) stopVoice();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopVoice();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    micMuted,
    toggleMic,
    speakerMuted,
    toggleSpeaker,
    micGranted,
    activeSpeakers,
    peersReady,
    startVoice,
    stopVoice,
  };
}
