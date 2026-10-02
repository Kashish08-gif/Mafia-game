import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, LogOut, RefreshCw, Clock, Shield, Swords, Heart, User, Play, AlertTriangle, Send, Check } from 'lucide-react';
import { getRoomDetails, leaveRoom, startGame } from '../../services/roomService.js';
import axios from 'axios';
import socket from '../../services/socket.js';

const MAP_META = {
  city:    { name: 'City Nights',    icon: '🏙️', color: '#ff66b2' },
  village: { name: 'Cursed Village', icon: '🏘️', color: '#b0a0d0' },
  forest:  { name: 'Dark Forest',    icon: '🌲', color: '#5ad15a' },
  harbor:  { name: 'Harbor Docks',   icon: '⚓', color: '#a8d8f0' },
  casino:  { name: 'Casino Royale',  icon: '🎰', color: '#f0c848' },
  mansion: { name: 'Old Mansion',    icon: '🏛️', color: '#ff4455' },
};

const ROLE_ICONS = {
  mafia:    { icon: <Swords size={14} />,  label: 'Mafia',    color: '#ff4455' },
  police:   { icon: <Shield size={14} />,  label: 'Police',   color: '#4488ff' },
  doctor:   { icon: <Heart size={14} />,   label: 'Doctor',   color: '#44cc88' },
  villager: { icon: <User size={14} />,    label: 'Villager', color: '#aaaaaa' },
};

export default function RoomLobbyPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [realFriends, setRealFriends] = useState([]);
  const [invitedMap, setInvitedMap] = useState({});

  useEffect(() => {
    async function loadFriends() {
      try {
        const token = localStorage.getItem("token");
        const res =await axios.get(`${import.meta.env.VITE_API_URL}/api/friends/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRealFriends(res.data || []);
      } catch (err) {
        console.error("Error loading friends in lobby:", err);
      }
    }
    if (isHost) {
      loadFriends();
    }
  }, [isHost]);

  const handleSendLobbyInvite = (friend) => {
    const currentUsername = room?.host?.username || "Host";
    socket.emit("send-lobby-invite", {
      targetUserId: friend._id,
      roomId,
      roomName: room?.roomName || "Mafia Lobby",
      hostName: currentUsername,
      hostId: currentUserId,
    });
    setInvitedMap(prev => ({ ...prev, [friend._id]: true }));
  };

  const currentUserId = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      return JSON.parse(atob(token.split('.')[1]))._id;
    } catch {
      return null;
    }
  })();

  const fetchRoom = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await getRoomDetails(token, roomId);
      setRoom(response.data.room);
      if (typeof response.data.isHost === 'boolean') {
        setIsHost(response.data.isHost);
      }
      setFetchError(null);
    } catch (err) {
      if (err?.response?.status === 404) {
        setFetchError('This room no longer exists.');
      } else {
        setFetchError('Could not load room details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  useEffect(() => {
    if (room?.gameStarted) {
      navigate(`/loading/${roomId}`);
    }
  }, [room?.gameStarted, navigate, roomId]);

  const handleLeave = async () => {
    setShowLeaveConfirm(false);
    setIsLeaving(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      await leaveRoom(token, roomId);
      navigate('/join-room');
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Failed to leave room.');
      setIsLeaving(false);
    }
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      await startGame(token, roomId);
      navigate(`/loading/${roomId}`);
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Failed to start game.');
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, color: '#fff',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid #ff3344', borderTopColor: 'transparent',
          animation: 'spin-slow 0.8s linear infinite',
        }} />
        <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', fontSize: 14, color: 'var(--text-muted)' }}>
          INFILTRATING LOBBY...
        </span>
      </div>
    );
  }

  if (fetchError || !room) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, color: '#fff', padding: 24, textAlign: 'center',
      }}>
        <AlertTriangle size={48} color="#ff4455" />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#ff4455' }}>
          LOBBY NOT ACCESSIBLE
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 360 }}>
          {fetchError || 'Room data could not be retrieved.'}
        </p>
        <button onClick={() => navigate('/join-room')} className="btn-primary" style={{ padding: '10px 24px', fontSize: 13 }}>
          BACK TO LOBBY BROWSER
        </button>
      </div>
    );
  }

  const currentPlayers = room.users?.length || 0;
  const isFull = currentPlayers >= room.totalPlayers;
  const mapMeta = MAP_META[room.map] || { name: room.map || 'Old Mansion', icon: '🏛️', color: '#ff4455' };
  const MIN_PLAYERS = 4;
  const canStart = currentPlayers >= MIN_PLAYERS;
  const effectiveMafiaCount = room.contractMode === 'classic'
    ? (currentPlayers >= 8 ? 2 : 1)
    : (room.contractMode === 'quick' ? 1 : Math.max(1, Math.floor(currentPlayers / 3)));

  let statusText = 'WAITING FOR PLAYERS';
  let statusSub = `Need at least ${MIN_PLAYERS} players to start (currently ${currentPlayers})`;
  let statusColor = '#ffaa33';

  if (isFull) {
    statusText = 'LOBBY FULL';
    statusSub = 'Maximum capacity reached. Host may start game.';
    statusColor = '#5ad15a';
  } else if (canStart) {
    statusText = 'READY TO START';
    statusSub = `${currentPlayers}/${room.totalPlayers} players in lobby. Host can launch match.`;
    statusColor = '#ffd700';
  }

  return (
    <div className="page-scroll" style={{
      width: '100%', height: '100%',
      padding: '24px 40px 100px 40px',
      color: '#fff',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* ── Top Header ───────────────────────────────────────────── */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 26,
              letterSpacing: '0.1em', color: '#ff4455',
            }}>
              {room.roomName}
            </h1>
            {isHost && (
              <span style={{
                fontSize: 10, background: 'rgba(255,200,0,0.12)',
                border: '1px solid rgba(255,200,0,0.4)',
                color: '#ffd700', padding: '2px 8px', borderRadius: 4,
                fontWeight: 800, letterSpacing: '0.05em',
              }}>
                HOST
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Room Code: <strong style={{ color: '#fff' }}>#{room.roomCode}</strong>
            &nbsp;·&nbsp; Map: <strong style={{ color: mapMeta.color }}>{mapMeta.name}</strong>
            &nbsp;·&nbsp; Mode: <strong style={{ color: '#fff' }}>{room.contractMode?.toUpperCase()}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchRoom}
            title="Refresh players"
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '10px 14px', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
            }}
          >
            <RefreshCw size={14} /> REFRESH
          </button>
          <button
            onClick={() => setShowLeaveConfirm(true)}
            disabled={isLeaving}
            className="btn-secondary"
            style={{ gap: 8, opacity: isLeaving ? 0.6 : 1, cursor: isLeaving ? 'not-allowed' : 'pointer' }}
          >
            <LogOut size={14} />
            {isLeaving ? 'LEAVING...' : 'LEAVE ROOM'}
          </button>
        </div>
      </motion.div>

      {/* ── Error banner ─────────────────────────────────────────── */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(255,20,40,0.08)', border: '1px solid rgba(255,20,40,0.3)',
              borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#ff6677',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <AlertTriangle size={14} /> {actionError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Leave confirmation modal ─────────────────────────────── */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 999,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'rgba(12,6,18,0.98)', border: '1.5px solid rgba(255,68,85,0.35)',
                borderRadius: 16, padding: '32px 36px', maxWidth: 380, width: '90%',
                display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 36 }}>🚪</span>
              <h3 style={{ fontFamily: 'var(--font-display)', color: '#ff4455', fontSize: 17, letterSpacing: '0.08em' }}>
                LEAVE ROOM?
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                {isHost && currentPlayers > 1
                  ? 'You are the host. Leaving will transfer control to the next player.'
                  : 'Are you sure you want to leave this lobby?'}
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--text-muted)', cursor: 'pointer', letterSpacing: '0.06em',
                  }}
                >
                  STAY
                </button>
                <button
                  onClick={handleLeave}
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px 0', fontSize: 12, letterSpacing: '0.06em' }}
                >
                  LEAVE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Grid ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

        {/* LEFT: Players Grid */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-panel"
          style={{
            padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
            background: 'rgba(10,5,15,0.85)',
            border: '1.5px solid rgba(120,40,60,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', color: '#ff4455' }}>
              PLAYERS IN LOBBY
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
              <Users size={14} color={isFull ? '#ff4455' : '#5ad15a'} />
              <span style={{ color: isFull ? '#ff4455' : '#5ad15a' }}>
                {currentPlayers}/{room.totalPlayers}
              </span>
            </div>
          </div>

          {/* Player slots grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
          }}>
            {/* Filled slots */}
            {room.users?.map((player, idx) => {
              const isMe = player._id?.toString() === currentUserId;
              const isPlayerHost = (room.host?._id?.toString() || room.host?.toString()) === player._id?.toString();

              return (
                <motion.div
                  key={player._id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    background: isMe ? 'rgba(255,20,40,0.08)' : 'rgba(255,255,255,0.03)',
                    border: isMe ? '1.5px solid rgba(255,20,40,0.35)' : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10, padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 8, position: 'relative',
                  }}
                >
                  {isPlayerHost && (
                    <Crown
                      size={13}
                      color="#ffd700"
                      style={{ position: 'absolute', top: 10, right: 10 }}
                    />
                  )}

                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, overflow: 'hidden'
                  }}>
                    {player.avatar ? (
                      player.avatar.startsWith('http') || player.avatar.startsWith('/') ? (
                        <img src={player.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        player.avatar
                      )
                    ) : '🎭'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: isMe ? '#ff6677' : '#fff' }}>
                      {player.username}
                      {isMe && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>(you)</span>}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                      {isPlayerHost ? '👑 Host' : '⚔️ Player'}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: room.totalPlayers - currentPlayers }).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '14px 16px', height: 104,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 6,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: '1.5px dashed rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 18, opacity: 0.3 }}>?</span>
                </div>
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.15)' }}>EMPTY SLOT</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT: Room Info + Status */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Host Friend Invite Panel */}
          {isHost && (
            <div
              className="glass-panel"
              style={{
                padding: 20, background: 'rgba(10,5,15,0.85)',
                border: '1.5px solid rgba(120,40,60,0.25)',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.08em', color: '#ff4455' }}>
                INVITE ALLIES TO LOBBY
              </h3>
              {realFriends.length === 0 ? (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  No friends added yet. Add players from Social Hub!
                </span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                  {realFriends.map(friend => (
                    <div key={friend._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {(() => {
                          const src = friend.avatar;
                          const isUrl = src && (src.startsWith('http') || src.startsWith('/') || src.startsWith('data:'));
                          return isUrl
                            ? <img src={src} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 16 }}>{src || '🎭'}</span>;
                        })()}
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{friend.username}</span>
                      </div>
                      <button
                        onClick={() => handleSendLobbyInvite(friend)}
                        className="btn-secondary"
                        style={{
                          padding: '3px 8px', fontSize: 10, gap: 4,
                          borderColor: invitedMap[friend._id] ? '#5ad15a' : 'rgba(255,50,70,0.3)',
                          color: invitedMap[friend._id] ? '#5ad15a' : '#fff'
                        }}
                      >
                        {invitedMap[friend._id] ? '✓ SENT' : <><Send size={10} /> INVITE</>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status Card */}
          <div
            className="glass-panel"
            style={{
              padding: 20, background: 'rgba(10,5,15,0.85)',
              border: '1.5px solid rgba(120,40,60,0.25)',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.08em', color: '#ff4455' }}>
              LOBBY STATUS
            </h3>

            {/* Status pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: isFull ? 'rgba(90,200,100,0.08)' : canStart ? 'rgba(255,200,0,0.07)' : 'rgba(255,130,0,0.07)',
              border: `1px solid ${statusColor}44`,
              borderRadius: 8, padding: '12px 14px',
            }}>
              <Clock size={16} color={statusColor} />
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: statusColor, display: 'block' }}>
                  {statusText}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  {statusSub}
                </span>
              </div>
            </div>

            {/* Room details list */}
            {[
              { label: 'ROOM CODE', value: `#${room.roomCode}` },
              { label: 'MAP', value: `${mapMeta.icon} ${mapMeta.name}` },
              { label: 'MODE', value: room.contractMode?.toUpperCase() },
              { label: 'MAX PLAYERS', value: room.totalPlayers },
              { label: 'MAFIA COUNT', value: `${effectiveMafiaCount} (for ${currentPlayers} players)` },
              { label: 'VISIBILITY', value: room.roomType?.toUpperCase() },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.04)',
                fontSize: 12,
              }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Roles info card */}
          <div
            className="glass-panel"
            style={{
              padding: 20, background: 'rgba(10,5,15,0.85)',
              border: '1.5px solid rgba(120,40,60,0.25)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.08em', color: '#ff4455' }}>
              ROLES IN THIS GAME
            </h3>
            {Object.entries(ROLE_ICONS).map(([role, meta]) => (
              <div key={role} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid rgba(255,255,255,0.04)`,
                borderRadius: 6,
              }}>
                <span style={{ color: meta.color }}>{meta.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 12, color: meta.color }}>{meta.label.toUpperCase()}</span>
                {role === 'mafia' && (
                  <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-muted)' }}>
                    ×{effectiveMafiaCount}
                  </span>
                )}
              </div>
            ))}
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>
              Roles are assigned randomly when the host starts the game.
            </p>
          </div>

          {/* Start game — host only */}
          {isHost ? (
            <motion.button
              onClick={handleStartGame}
              className="btn-primary"
              disabled={!canStart || isStarting}
              whileHover={canStart && !isStarting ? { scale: 1.015, boxShadow: '0 0 30px rgba(255, 34, 51, 0.65)' } : {}}
              whileTap={canStart && !isStarting ? { scale: 0.985 } : {}}
              style={{
                width: '100%', height: 52, fontSize: 14, gap: 10,
                opacity: canStart ? 1 : 0.45,
                cursor: canStart ? (isStarting ? 'not-allowed' : 'pointer') : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: canStart ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                textShadow: canStart ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none',
                background: canStart
                  ? 'linear-gradient(135deg, #ff2233 0%, #b80d1a 100%)'
                  : 'rgba(255,255,255,0.06)',
                border: canStart ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: canStart
                  ? '0 0 20px rgba(255, 34, 51, 0.45), inset 0 0 10px rgba(255, 255, 255, 0.2)'
                  : 'none',
                position: 'relative', overflow: 'hidden',
                transition: 'box-shadow 0.2s ease, background 0.2s ease',
              }}
            >
              {canStart && !isStarting && (
                <motion.div
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                  }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <Play size={16} style={{ position: 'relative', zIndex: 1 }} />
              <span style={{ position: 'relative', zIndex: 1 }}>
                {isStarting
                  ? 'STARTING GAME...'
                  : canStart
                  ? `🚀 START GAME (${currentPlayers} Players)`
                  : `⏳ NEED ${MIN_PLAYERS - currentPlayers} MORE PLAYER${MIN_PLAYERS - currentPlayers !== 1 ? 'S' : ''}`
                }
              </span>
            </motion.button>
          ) : (
            <div style={{
              width: '100%', height: 52, borderRadius: 10,
              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 12, color: 'var(--text-muted)',
            }}>
              <Crown size={14} color="#ffd700" />
              Waiting for host to start the game...
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
