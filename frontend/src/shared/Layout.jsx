import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Check, X, ShieldAlert } from 'lucide-react';
import HorrorBg from './HorrorBg';
import HUD from './HUD';
import AudioManager from '../services/audio';
import socket from '../services/socket';
import { joinRoom } from '../services/roomService';

export default function Layout() {
  const [activeInviteAlert, setActiveInviteAlert] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Register current user to personal socket channel for direct in-app lobby invites
    const userId = localStorage.getItem("userId");
    if (userId) {
      socket.emit("register-user", userId);
    }

    const handleReceiveInvite = (inviteData) => {
      console.log("[Layout] Received direct lobby invite:", inviteData);
      setActiveInviteAlert(inviteData);
      AudioManager.playNotification?.();
    };

    socket.on("receive-lobby-invite", handleReceiveInvite);

    return () => {
      socket.off("receive-lobby-invite", handleReceiveInvite);
    };
  }, []);

  useEffect(() => {
    // If audio is already initialized, start loops on mount
    if (AudioManager.initialized) {
      AudioManager.startAudioLoops();
    }

    const handleGlobalClick = (e) => {
      AudioManager.init();
      if (AudioManager.initialized) {
        AudioManager.startAudioLoops();
      }

      const target = e.target;
      const isInteractive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('.map-card') ||
        target.closest('.nav-item') ||
        target.closest('.hud-avatar') ||
        target.closest('.btn-secondary') ||
        target.closest('.btn-primary') ||
        target.closest('.btn-ghost') ||
        target.closest('.lb-row') ||
        target.closest('.friend-row') ||
        target.closest('.room-card');

      if (isInteractive) {
        AudioManager.playClick();
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleAcceptInvite = async (roomId) => {
    setIsJoining(true);
    try {
      const token = localStorage.getItem("token");
      const res = await joinRoom(token, roomId);
      if (res.data.success) {
        setActiveInviteAlert(null);
        navigate(`/lobby/${roomId}`);
      }
    } catch (err) {
      console.error("Error joining lobby from invite:", err);
      alert(err.response?.data?.error || "Failed to join room lobby.");
      setActiveInviteAlert(null);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      overflow: 'hidden', position: 'relative',
      background: '#020107',
    }}>
      {/* Atmospheric horror background */}
      <HorrorBg />

      {/* Top HUD — always visible */}
      <HUD />

      {/* Global In-App Lobby Invite Notification Banner (No Links!) */}
      <AnimatePresence>
        {activeInviteAlert && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 0.9 }}
            style={{
              position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9999,
              background: 'linear-gradient(135deg, rgba(30,5,15,0.95), rgba(12,2,6,0.98))',
              border: '2px solid #ff3344',
              boxShadow: '0 0 35px rgba(255,30,50,0.6), inset 0 0 15px rgba(255,0,0,0.2)',
              borderRadius: 12, padding: '14px 24px',
              display: 'flex', alignItems: 'center', gap: 20,
              backdropFilter: 'blur(10px)',
              fontFamily: 'var(--font-display)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,20,40,0.15)', border: '1.5px solid #ff3344',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              ✉️
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>
                LOBBY INVITATION RECEIVED!
              </span>
              <span style={{ fontSize: 11.5, color: '#ddc8c8', fontFamily: 'var(--font-body)' }}>
                <strong style={{ color: '#ff4455' }}>{activeInviteAlert.hostName}</strong> invited you to join <strong style={{ color: '#fff' }}>"{activeInviteAlert.roomName}"</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginLeft: 12 }}>
              <button
                onClick={() => handleAcceptInvite(activeInviteAlert.roomId)}
                disabled={isJoining}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: 11, gap: 6, opacity: isJoining ? 0.7 : 1 }}
              >
                <Check size={14} /> {isJoining ? 'JOINING...' : 'ACCEPT & JOIN'}
              </button>
              <button
                onClick={() => setActiveInviteAlert(null)}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: 11, gap: 4 }}
              >
                <X size={14} /> DECLINE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <div style={{
        position: 'absolute', inset: 0,
        zIndex: 10,
        paddingTop: 72, // below HUD
      }}>
        <Outlet />
      </div>
    </div>
  );
}
