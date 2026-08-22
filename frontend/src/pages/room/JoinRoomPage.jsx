import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, LogIn, AlertTriangle, ShieldCheck, MapPin, X, Users, RefreshCw } from 'lucide-react';
import { getRooms, joinRoom } from '../../services/roomService.js';
import { useNavigate } from 'react-router-dom';

const MAPS = [
  { id: 'all', name: 'All Maps', desc: 'Display rooms from all environments.', icon: '🌍' },
  { id: 'city', name: 'City Nights', desc: 'Neon-lit alleys and urban crime.', icon: '🏙️' },
  { id: 'village', name: 'Cursed Village', desc: 'Foggy hamlet with dark secret spells.', icon: '🏘️' },
  { id: 'forest', name: 'Dark Forest', desc: 'Dense spooky woods with no escape.', icon: '🌲' },
  { id: 'harbor', name: 'Harbor Docks', desc: 'Mist waterfront and pirate docks.', icon: '⚓' },
  { id: 'casino', name: 'Casino Royale', desc: 'Underground high-stakes gambling.', icon: '🎰' },
  { id: 'mansion', name: 'Old Mansion', desc: 'Classic gothic dark headquarters.', icon: '🏛️' },
];

export default function JoinRoomPage() {
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMapFilter, setSelectedMapFilter] = useState('all');
  const [matchingOverlay, setMatchingOverlay] = useState(false);
  const [matchedRoom, setMatchedRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [joiningRoomId, setJoiningRoomId] = useState(null);
  const navigate = useNavigate();

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedMapFilter !== 'all') params.map = selectedMapFilter;

      const response = await getRooms(token, params);
      setRooms(response.data.rooms || []);
    } catch (err) {
      if (err?.response?.status === 404) {
        setRooms([]);
      } else {
        setFetchError('Could not load rooms. Check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedMapFilter]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleQuickMatch = () => {
    setMatchingOverlay(true);
    setMatchedRoom(null);

    setTimeout(() => {
      const available = rooms.filter(r => r.gameState === 'WAITING' && r.users?.length < r.totalPlayers);
      if (available.length > 0) {
        const bestRoom = [...available].sort((a, b) => (b.users?.length || 0) - (a.users?.length || 0))[0];
        setMatchedRoom(bestRoom);
      } else {
        setMatchedRoom({ error: 'No available rooms found matching filters.' });
      }
    }, 2200);
  };

  const handleConfirmJoin = async (room) => {
    setJoinError(null);
    setJoiningRoomId(room._id);
    try {
      const token = localStorage.getItem('token');
      const response = await joinRoom(token, room._id);
      const joinedRoom = response.data.room;
      navigate(`/lobby/${joinedRoom._id}`);
    } catch (err) {
      const message = err?.response?.data?.error || 'Failed to join room. Please try again.';
      setJoinError({ roomId: room._id, message });
      setMatchingOverlay(false);
    } finally {
      setJoiningRoomId(null);
    }
  };

  return (
    <div className="page-scroll" style={{
      width: '100%', height: '100%',
      padding: '24px 40px 100px 40px',
      color: '#fff',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* Page Title */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.12em', color: '#ff4455' }}>
          JOIN CONTRACT LOBBY
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Infiltrate active lobbies or initialize a matchmaking scan</span>
      </motion.div>

      {/* Grid: Left Map Filters, Right Rooms list */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 24,
        alignItems: 'start',
      }}>
        {/* LEFT COLUMN: Map Filters */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-panel"
          style={{
            padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
            background: 'rgba(10,5,15,0.85)',
            border: '1.5px solid rgba(120,40,60,0.25)',
          }}
        >
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', color: '#ff4455' }}>
            MAP SELECTOR FILTER
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MAPS.map(m => {
              const isSelected = selectedMapFilter === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMapFilter(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 8, border: isSelected ? '1.5px solid #ff3344' : '1px solid rgba(255,255,255,0.04)',
                    background: isSelected ? 'rgba(255,20,40,0.08)' : 'rgba(255,255,255,0.01)',
                    color: isSelected ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                  }}
                >
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <span style={{ fontWeight: 700, fontSize: 12.5, color: isSelected ? '#ff4455' : '#eee' }}>{m.name}</span>
                    <span style={{ fontSize: 9.5, color: 'var(--text-muted)', display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Rooms Search and List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Search bar & Quick Match button */}
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 16 }} />
              <input
                type="text"
                placeholder="Filter by lobby name or host..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-dark"
                style={{ paddingLeft: 44, height: 46 }}
              />
            </div>
            <button
              onClick={handleQuickMatch}
              className="btn-primary"
              style={{ gap: 8, padding: '0 24px', flexShrink: 0, height: 46 }}
            >
              <Sparkles size={16} /> QUICK MATCH
            </button>
          </div>

          {/* Rooms List */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="glass-panel"
            style={{
              padding: 24, display: 'flex', flexDirection: 'column', gap: 12,
              background: 'rgba(10,5,15,0.85)',
              border: '1.5px solid rgba(120,40,60,0.25)',
              minHeight: 300,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              <span>ACTIVE LOBBIES ({isLoading ? '...' : rooms.length})</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>FILTER: {MAPS.find(m => m.id === selectedMapFilter)?.name.toUpperCase()}</span>
                <button
                  onClick={fetchRooms}
                  title="Refresh"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  <RefreshCw size={13} style={{ animation: isLoading ? 'spin-slow 1s linear infinite' : 'none' }} />
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: 68, borderRadius: 8, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoading && fetchError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: '40px 0' }}>
                <AlertTriangle size={28} color="#ff4455" />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fetchError}</span>
                <button onClick={fetchRooms} className="btn-secondary" style={{ fontSize: 12, padding: '8px 20px' }}>RETRY</button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !fetchError && rooms.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', padding: '60px 0' }}>
                <AlertTriangle size={32} color="#cc0020" />
                <span style={{ fontSize: 13 }}>No active rooms match your filters. Try choosing a different map.</span>
              </div>
            )}

            {!isLoading && !fetchError && rooms.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rooms.map(room => {
                  const mapObj = MAPS.find(m => m.id === room.map) || { name: 'Old Mansion', icon: '🏛️' };
                  const currentPlayers = room.users?.length || 0;
                  const isFull = currentPlayers >= room.totalPlayers;
                  const isPlaying = room.gameState !== 'WAITING';
                  const cannotJoin = isFull || isPlaying;
                  const isJoiningThis = joiningRoomId === room._id;
                  const thisRoomError = joinError?.roomId === room._id ? joinError.message : null;

                  return (
                    <div key={room._id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div
                        className="room-card"
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '14px 20px', background: 'rgba(255,255,255,0.02)',
                          opacity: cannotJoin ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <span style={{ fontSize: 26 }}>{mapObj.icon}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, color: '#fff', fontSize: 14.5 }}>{room.roomName}</span>
                              <span style={{ fontSize: 9.5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>
                                {room.contractMode?.toUpperCase()}
                              </span>
                            </div>
                            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                              Code: <strong>#{room.roomCode}</strong> · Map: <strong>{mapObj.name}</strong>
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: isFull ? '#ff4455' : '#ddd' }}>
                            <Users size={14} color={isFull ? '#ff4455' : '#aaa'} />
                            {currentPlayers}/{room.totalPlayers}
                          </div>

                          <div style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                            color: isPlaying ? '#ff4455' : '#5ad15a',
                            background: isPlaying ? 'rgba(255,20,40,0.08)' : 'rgba(90,200,100,0.08)',
                            border: `1px solid ${isPlaying ? 'rgba(255,20,40,0.2)' : 'rgba(90,200,100,0.2)'}`,
                            padding: '3px 8px', borderRadius: 4,
                            minWidth: 84, textAlign: 'center'
                          }}>
                            {isPlaying ? 'IN PROGRESS' : 'WAITING'}
                          </div>

                          <button
                            onClick={() => handleConfirmJoin(room)}
                            className={cannotJoin ? 'btn-ghost' : 'btn-primary'}
                            disabled={cannotJoin || isJoiningThis}
                            style={{
                              padding: '8px 16px', fontSize: 12, height: 36, minWidth: 80,
                              border: cannotJoin ? '1px solid rgba(255,255,255,0.05)' : '1.5px solid var(--blood)',
                              opacity: isJoiningThis ? 0.75 : 1,
                              cursor: isJoiningThis ? 'not-allowed' : undefined,
                            }}
                          >
                            {isJoiningThis
                              ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin-slow 0.7s linear infinite' }} />
                                  JOINING
                                </span>
                              : <><LogIn size={13} /> JOIN</>
                            }
                          </button>
                        </div>
                      </div>

                      {thisRoomError && (
                        <div style={{
                          fontSize: 11.5, color: '#ff6677',
                          background: 'rgba(255,20,40,0.06)',
                          border: '1px solid rgba(255,20,40,0.2)',
                          borderRadius: 6, padding: '7px 14px',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <AlertTriangle size={13} /> {thisRoomError}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* MATCHMAKING RADAR SPIN OVERLAY */}
      <AnimatePresence>
        {matchingOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(2, 1, 6, 0.9)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="glass-panel"
              style={{
                width: '100%', maxWidth: 440,
                border: '2px solid rgba(120,40,60,0.4)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                padding: 32, borderRadius: 16,
                background: 'linear-gradient(135deg,#130a18,#0a050f)',
                textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 20,
                alignItems: 'center', position: 'relative',
              }}
            >
              <button
                onClick={() => setMatchingOverlay(false)}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={20} />
              </button>

              {!matchedRoom ? (
                <>
                  <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      border: '2.5px dashed #ff3344',
                      animation: 'spin-slow 4s linear infinite',
                    }} />
                    <div style={{
                      position: 'absolute', inset: 12, borderRadius: '50%',
                      border: '1.5px dashed rgba(255,255,255,0.1)',
                      animation: 'spin-slow 6s linear infinite reverse',
                    }} />
                    <Sparkles size={32} color="#ff3344" className="animate-flicker" />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#ff3344', letterSpacing: '0.08em', marginBottom: 4 }}>
                      MATCHMAKING ACTIVE
                    </h3>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Scanning nodes for open lobbies...</span>
                  </div>
                </>
              ) : matchedRoom.error ? (
                <>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'rgba(200,20,40,0.15)',
                    border: '2.5px solid #ff3344',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    ⚠️
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#ff3344', marginBottom: 4 }}>
                      SCAN FAILED
                    </h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{matchedRoom.error}</span>
                  </div>
                  <button onClick={() => setMatchingOverlay(false)} className="btn-secondary" style={{ width: '100%' }}>
                    CANCEL SCAN
                  </button>
                </>
              ) : (
                <>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'rgba(90,200,100,0.15)',
                    border: '2.5px solid #5ad15a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ShieldCheck size={32} color="#5ad15a" />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#5ad15a', marginBottom: 4 }}>
                      TARGET ACQUIRED!
                    </h3>
                    <span style={{ fontSize: 12.5, color: '#fff', fontWeight: 600 }}>{matchedRoom.roomName}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                      Code: #{matchedRoom.roomCode} · Mode: {matchedRoom.contractMode}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
                    <button onClick={() => setMatchingOverlay(false)} className="btn-secondary" style={{ flex: 1 }}>
                      CANCEL
                    </button>
                    <button onClick={() => handleConfirmJoin(matchedRoom)} className="btn-primary" style={{ flex: 1, padding: '10px 16px' }}>
                      CONNECT
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
