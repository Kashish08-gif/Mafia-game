import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, UserCheck, UserX, Search, Sparkles, Trophy, Users, Check, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

const API =  `${import.meta.env.VITE_API_URL}/api`;

// Smart avatar: renders <img> for URLs, emoji <span> for everything else
const isUrl = (val) => val && (val.startsWith('http') || val.startsWith('/') || val.startsWith('data:image'));
function Avatar({ src, size = 40, fontSize = 22 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(255,255,255,0.05)',
      border: '1.5px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, overflow: 'hidden', flexShrink: 0,
    }}>
      {isUrl(src)
        ? <img src={src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span>{src || '\uD83C\uDFAD'}</span>
      }
    </div>
  );
}

export default function FriendsPage() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [communityError, setCommunityError] = useState(null);
  const searchTimerRef = useRef(null);

  // Always get a fresh token on every call
  const getToken = () => localStorage.getItem("token");

  const loadFriends = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/friends/list`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setFriends(res.data || []);
    } catch (err) {
      console.error("Error loading friends:", err);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setRequests(res.data || []);
    } catch (err) {
      console.error("Error loading friend requests:", err);
    }
  }, []);

  const loadAllUsers = useCallback(async (search = "") => {
    setIsLoadingCommunity(true);
    setCommunityError(null);
    try {
      const params = search.trim() ? { search: search.trim() } : {};
      const res = await axios.get(`${API}/api/friends/all-users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params,
      });
      setAllUsers(res.data || []);
    } catch (err) {
      console.error("Error loading all users:", err);
      if (err.response?.status === 401) {
        setCommunityError("Session expired. Please log in again.");
      } else {
        setCommunityError("Failed to load players. Check your connection.");
      }
    } finally {
      setIsLoadingCommunity(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadRequests();
    loadFriends();
    loadAllUsers();
  }, [loadRequests, loadFriends, loadAllUsers]);

  // Debounced search — fires server-side query after 400ms pause
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      loadAllUsers(searchQuery);
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, loadAllUsers]);

  const sendRequest = async (targetUserId, targetUsername) => {
    try {
      await axios.post(
        `${API}/api/friends/send`,
        { receiverId: targetUserId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      showNotification(`Friend request sent to ${targetUsername}!`);
      loadAllUsers(searchQuery);
      loadRequests();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || "Failed to send request");
    }
  };

  const acceptRequest = async (senderId) => {
    try {
      await axios.put(
        `${API}/api/friends/accept/${senderId}`,
        {},
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      showNotification("Friend request accepted!");
      loadRequests();
      loadFriends();
      loadAllUsers(searchQuery);
    } catch (err) {
      console.error(err);
    }
  };

  const declineRequest = async (requestId) => {
    try {
      await axios.put(
        `${API}/api/friends/reject/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      showNotification("Friend request rejected!");
      loadRequests();
      loadAllUsers(searchQuery);
    } catch (err) {
      console.error(err);
    }
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
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
          SOCIAL HUB
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Recruit allies from the mafia database, manage incoming requests, and form your syndicate
        </span>
      </motion.div>

      {/* Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '420px 1fr',
        gap: 24,
        alignItems: 'start',
      }}>
        {/* LEFT COLUMN: Community Players Directory */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-panel"
          style={{
            padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
            background: 'rgba(10,5,15,0.85)',
            border: '1.5px solid rgba(120,40,60,0.25)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.08em', color: '#ff4455' }}>
              COMMUNITY PLAYERS {!isLoadingCommunity && `(${allUsers.length})`}
            </h3>
            <button
              onClick={() => loadAllUsers(searchQuery)}
              title="Refresh"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, padding: 4 }}
            >
              <RefreshCw size={12} style={{ animation: isLoadingCommunity ? 'spin-slow 1s linear infinite' : 'none' }} />
              REFRESH
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 14, pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search players by username..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-dark"
              style={{ paddingLeft: 40, width: '100%' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}
              >
                ×
              </button>
            )}
          </div>

          {/* Community Players List */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            maxHeight: 480, overflowY: 'auto', paddingRight: 4,
          }}>
            {/* Loading skeletons */}
            {isLoadingCommunity && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    height: 56, borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            )}

            {/* Error state */}
            {!isLoadingCommunity && communityError && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '24px 0', gap: 10, textAlign: 'center',
              }}>
                <AlertTriangle size={28} color="#ff4455" />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{communityError}</span>
                <button
                  onClick={() => loadAllUsers(searchQuery)}
                  className="btn-secondary"
                  style={{ fontSize: 11, padding: '6px 14px' }}
                >
                  RETRY
                </button>
              </div>
            )}

            {/* Empty state */}
            {!isLoadingCommunity && !communityError && allUsers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 12, color: 'var(--text-muted)' }}>
                {searchQuery ? `No players found matching "${searchQuery}"` : 'No other players in the database yet.'}
              </div>
            )}

            {/* Player cards */}
            {!isLoadingCommunity && !communityError && allUsers.map(user => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar src={user.avatar} size={40} fontSize={20} />
                  <div>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: 13.5, display: 'block' }}>
                      {user.username}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trophy size={11} color="#f0c848" /> {user.totalGamesWon || 0} Wins
                    </span>
                  </div>
                </div>

                {/* Status Button */}
                {user.status === 'friend' ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#5ad15a',
                    background: 'rgba(90,200,100,0.1)', border: '1px solid rgba(90,200,100,0.3)',
                    padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    <Check size={12} /> FRIEND
                  </span>
                ) : user.status === 'pending_sent' ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#ffaa33',
                    background: 'rgba(255,170,50,0.1)', border: '1px solid rgba(255,170,50,0.3)',
                    padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    <Clock size={12} /> PENDING...
                  </span>
                ) : user.status === 'pending_received' ? (
                  <button
                    onClick={() => acceptRequest(user._id)}
                    className="btn-primary"
                    style={{ padding: '4px 10px', fontSize: 10 }}
                  >
                    ACCEPT
                  </button>
                ) : (
                  <button
                    onClick={() => sendRequest(user._id, user.username)}
                    className="btn-secondary"
                    style={{ padding: '5px 12px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, borderColor: 'rgba(255,50,70,0.3)' }}
                  >
                    <UserPlus size={12} color="#ff3344" /> ADD
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Incoming Requests & My Allies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* INCOMING FRIEND REQUESTS */}
          <AnimatePresence>
            {requests.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-panel"
                style={{
                  padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
                  background: 'rgba(20,5,10,0.85)',
                  border: '1.5px solid rgba(180,40,60,0.3)',
                  boxShadow: '0 8px 30px rgba(180,0,20,0.1)',
                }}
              >
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.08em', color: '#ff3344',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <Sparkles size={16} className="animate-flicker" /> INCOMING REQUESTS ({requests.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {requests.map(req => (
                    <div
                      key={req._id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar src={req.sender?.avatar} size={36} fontSize={18} />
                        <div>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
                            {req.sender?.username || 'Unknown Mobster'}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>
                            Wants to add you to their syndicate
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => acceptRequest(req.sender._id)}
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <UserCheck size={13} /> ACCEPT
                        </button>
                        <button
                          onClick={() => declineRequest(req._id)}
                          className="btn-secondary"
                          style={{ padding: '6px 14px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <UserX size={13} /> DECLINE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MY ALLIES (FRIENDS LIST) */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-panel"
            style={{
              padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
              background: 'rgba(10,5,15,0.85)',
              border: '1.5px solid rgba(120,40,60,0.25)',
              minHeight: 300,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.08em', color: '#ff4455' }}>
                MY ALLIES ({friends.length})
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>MAFIA SYNDICATE</span>
            </div>

            {friends.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '60px 0', gap: 12, color: 'var(--text-muted)', textAlign: 'center',
              }}>
                <Users size={32} color="#7a2222" />
                <span style={{ fontSize: 13 }}>No allies added yet. Add players from the Community list on the left!</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {friends.map(friend => (
                  <div
                    key={friend._id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <Avatar src={friend.avatar} size={44} fontSize={22} />
                      <div>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: 14.5, display: 'block' }}>
                          {friend.username}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>
                          Mafia Ally · {friend.totalGamesWon || 0} Wins
                        </span>
                      </div>
                    </div>

                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#5ad15a',
                      background: 'rgba(90,200,100,0.08)', border: '1px solid rgba(90,200,100,0.2)',
                      padding: '3px 8px', borderRadius: 4,
                    }}>
                      READY TO PLAY
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
