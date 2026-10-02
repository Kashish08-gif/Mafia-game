import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, MapPin, Eye, EyeOff, Users, Play, Check, Send } from 'lucide-react';
import { createRoom } from '../../services/roomService.js';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../../services/socket.js';

const MAPS = [
  { id: 'city', name: 'City Nights', desc: 'Neon-lit streets, dark alleys, urban crime.', icon: '🏙️', color: '#ff66b2' },
  { id: 'village', name: 'Cursed Village', desc: 'Foggy cobblestone hamlet, cursed secrets.', icon: '🏘️', color: '#b0a0d0' },
  { id: 'forest', name: 'Dark Forest', desc: 'Dense woodland, shadows watching, no escape.', icon: '🌲', color: '#5ad15a' },
  { id: 'harbor', name: 'Harbor Docks', desc: 'Foggy waterfront, smuggler\'s shipwrecks.', icon: '⚓', color: '#a8d8f0' },
  { id: 'casino', name: 'Casino Royale', desc: 'Underground high-stakes gambling den.', icon: '🎰', color: '#f0c848' },
  { id: 'mansion', name: 'Old Mansion', desc: 'Classic gothic mafia headquarters.', icon: '🏛️', color: '#ff4455' },
];

export default function CreateRoomPage() {
  const [roomName, setRoomName] = useState('Shadow\'s Mansion');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPublic, setIsPublic] = useState(true);
  const [gameMode, setGameMode] = useState('Classic'); // 'Classic' | 'Quick' | 'Custom'
  const [selectedMap, setSelectedMap] = useState('mansion');
  const [invitedFriends, setInvitedFriends] = useState({}); // { id: boolean }
  const [realFriends, setRealFriends] = useState([]);
  const [createdRoomId, setCreatedRoomId] = useState(null);       // roomCode (display)
  const [createdRoomMongoId, setCreatedRoomMongoId] = useState(null); // MongoDB _id (navigation)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Load real friends list from DB
  useEffect(() => {
    async function loadFriends() {
      try {
        const res = await axios.get("http://localhost:5000/api/friends/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRealFriends(res.data || []);
      } catch (err) {
        console.error("Error fetching friends:", err);
      }
    }
    loadFriends();
  }, [token]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInviteFriendDirect = (friend) => {
    if (!createdRoomMongoId) {
      showToast("Please create the lobby first!");
      return;
    }

    const currentUserId = localStorage.getItem("userId");
    const currentUsername = localStorage.getItem("username") || "Host";

    // Send direct real-time in-app socket invite
    socket.emit("send-lobby-invite", {
      targetUserId: friend._id,
      roomId: createdRoomMongoId,
      roomName: roomName,
      hostName: currentUsername,
      hostId: currentUserId,
    });

    setInvitedFriends(prev => ({ ...prev, [friend._id]: true }));
    showToast(`In-game invite sent to ${friend.username}!`);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Map gameMode to backend contractMode enum value
      const contractModeMap = { Classic: 'classic', Quick: 'quick', Custom: 'custom' };

      // Generate a unique room code
      const roomCode = Math.floor(1000 + Math.random() * 9000);

      const response = await createRoom(token, {
        roomName,
        totalPlayers: maxPlayers,
        roomType: isPublic ? 'public' : 'private',
        map: selectedMap,
        contractMode: contractModeMap[gameMode],
        roomCode,
      });

      if (response.data.success) {
        setCreatedRoomId(roomCode);
        setCreatedRoomMongoId(response.data.room._id);
        showToast("Lobby created! You can now invite your allies below.");
      }
    } catch (err) {
      const message = err?.response?.data?.error || 'Failed to create room. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-scroll" style={{
      width: '100%', height: '100%',
      padding: '24px 40px 100px 40px',
      color: '#fff',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
              position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)',
              zIndex: 100, background: 'rgba(200,20,40,0.95)', color: '#fff',
              padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              boxShadow: '0 0 20px rgba(255,20,40,0.5)', border: '1px solid #ff4444',
              fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
            }}
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Title */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.12em', color: '#ff4455' }}>
          CREATE CONTRACT LOBBY
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Configure your environment parameters and invite your added allies directly
        </span>
      </motion.div>

      {/* Main Grid: Left Settings, Right Map Picker */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap: 32,
        alignItems: 'start',
      }}>
        {/* LEFT COLUMN: Configurations Form */}
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
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.08em', color: '#ff4455' }}>
            LOBBY PARAMETERS
          </h3>

          {!createdRoomId ? (
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Room Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  LOBBY DESIGNATION
                </label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  className="input-dark"
                />
              </div>

              {/* Max Players Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  MAX CAPACITY
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[6, 8, 10].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxPlayers(num)}
                      style={{
                        flex: 1, height: 40, borderRadius: 8,
                        background: maxPlayers === num ? 'rgba(255,20,40,0.12)' : 'rgba(255,255,255,0.02)',
                        border: maxPlayers === num ? '1.5px solid #ff3344' : '1.5px solid rgba(255,255,255,0.06)',
                        color: maxPlayers === num ? '#fff' : 'var(--text-muted)',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        fontSize: 13,
                        boxShadow: maxPlayers === num ? '0 0 10px rgba(255,30,50,0.3)' : 'none',
                      }}
                    >
                      {num} PLAYERS
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  GAME CONTRACT MODE
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['Classic', 'Quick', 'Custom'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setGameMode(mode)}
                      style={{
                        flex: 1, height: 40, borderRadius: 8,
                        background: gameMode === mode ? 'rgba(255,20,40,0.12)' : 'rgba(255,255,255,0.02)',
                        border: gameMode === mode ? '1.5px solid #ff3344' : '1.5px solid rgba(255,255,255,0.06)',
                        color: gameMode === mode ? '#fff' : 'var(--text-muted)',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        fontSize: 13,
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Public/Private Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isPublic ? <Eye size={16} color="#ff3344" /> : <EyeOff size={16} color="#a855f7" />}
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, display: 'block' }}>
                      {isPublic ? 'PUBLIC LOBBY' : 'PRIVATE MEETING'}
                    </span>
                    <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                      {isPublic ? 'Lobby is visible in browser listings.' : 'Invite-only. Send direct in-app invites to friends.'}
                    </span>
                  </div>
                </div>

                <div
                  className={`toggle-track ${isPublic ? 'on' : ''}`}
                  onClick={() => setIsPublic(!isPublic)}
                >
                  <div className="toggle-thumb" />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  background: 'rgba(255,20,40,0.08)',
                  border: '1px solid rgba(255,20,40,0.3)',
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: 12, color: '#ff6677',
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Create Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
                style={{ width: '100%', marginTop: 8, height: 50, gap: 10, fontSize: 16, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
              >
                <Play size={18} fill="#ff3344" /> {isLoading ? 'CREATING...' : 'CREATE LOBBY'}
              </button>
            </form>
          ) : (
            // Room Created Screen
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center', padding: '10px 0' }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(90,200,100,0.15)',
                border: '2.5px solid #5ad15a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(90,200,100,0.3)',
              }}>
                <Check size={32} color="#5ad15a" />
              </div>

              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#5ad15a', marginBottom: 4 }}>
                  LOBBY ESTABLISHED!
                </h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Room ID: <strong style={{ color: '#fff' }}>#{createdRoomId}</strong> · Map: <strong style={{ color: '#fff' }}>{MAPS.find(m => m.id === selectedMap)?.name}</strong>
                </p>
              </div>

              {/* Real Friends Direct Invite Box */}
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                  RECRUIT ADDED ALLIES IN-GAME
                </span>
                
                {realFriends.length === 0 ? (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '10px 0', display: 'block' }}>
                    No friends added yet. Add players from Social Hub to invite them directly!
                  </span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                    {realFriends.map(friend => (
                      <div key={friend._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {(() => {
                            const src = friend.avatar;
                            const isUrl = src && (src.startsWith('http') || src.startsWith('/') || src.startsWith('data:'));
                            return isUrl
                              ? <img src={src} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: 16 }}>{src || '🎭'}</span>;
                          })()}
                          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{friend.username}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInviteFriendDirect(friend)}
                          className="btn-secondary"
                          style={{
                            padding: '4px 10px', fontSize: 10, gap: 4,
                            borderColor: invitedFriends[friend._id] ? '#5ad15a' : 'rgba(255,50,70,0.3)',
                            color: invitedFriends[friend._id] ? '#5ad15a' : '#fff'
                          }}
                        >
                          {invitedFriends[friend._id] ? '✓ SENT' : <><Send size={11} /> INVITE</>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
                <button onClick={() => setCreatedRoomId(null)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  CONFIGURE NEW
                </button>
                <button onClick={() => navigate(`/lobby/${createdRoomMongoId}`)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '10px 16px' }}>
                  LAUNCH GAME
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* RIGHT COLUMN: Map Selector Grid */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-panel"
          style={{
            padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
            background: 'rgba(10,5,15,0.85)',
            border: '1.5px solid rgba(120,40,60,0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.08em', color: '#ff4455' }}>
              SELECT ENVIROMENT MAP
            </h3>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} /> CHOOSE 1 OF 6
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}>
            {MAPS.map((map) => {
              const isSelected = selectedMap === map.id;
              return (
                <div
                  key={map.id}
                  onClick={() => !createdRoomId && setSelectedMap(map.id)}
                  className={`map-card ${isSelected ? 'selected' : ''}`}
                  style={{
                    padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                    background: 'rgba(255,255,255,0.02)',
                    minHeight: 124, borderRadius: 10,
                    opacity: createdRoomId ? 0.6 : 1,
                    pointerEvents: createdRoomId ? 'none' : 'auto',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 24 }}>{map.icon}</span>
                    {isSelected && (
                      <span style={{
                        fontSize: 9, background: 'rgba(255,20,40,0.15)', border: '1px solid #ff3344',
                        padding: '2px 6px', borderRadius: 4, color: '#ff3344', fontWeight: 900
                      }}>
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontWeight: 700, color: isSelected ? '#ff4455' : '#fff', fontSize: 13.5 }}>
                      {map.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: '1.3' }}>
                      {map.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
