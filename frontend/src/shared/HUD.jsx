import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserData } from '../services/userService.js';
import Chat from "../components/chat/Chat";

const RANK_CONFIG = [
  { name: 'Bronze',  min:    0, max:  499, color: '#cd7f32', icon: '🥉' },
  { name: 'Silver',  min:  500, max: 1499, color: '#aaa9ad', icon: '🥈' },
  { name: 'Gold',    min: 1500, max: 2999, color: '#ffd700', icon: '🥇' },
  { name: 'Diamond', min: 3000, max: 9999, color: '#a8d8f0', icon: '💎' },
];

function getRank(trophies) {
  return RANK_CONFIG.find(r => trophies >= r.min && trophies <= r.max) || RANK_CONFIG[0];
}

// Helper: is this value a renderable image source (server URL or base64)?
const isImageSrc = (val) =>
  val && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/'));

function GearSVG({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export default function HUD() {
  const navigate = useNavigate();
  const location = useLocation();
  const [avatar, setAvatar] = useState(() => localStorage.getItem('mafia_avatar') || null);
  const [username, setUsername] = useState(() => localStorage.getItem('mafia_username') || 'Shadow');
  const [userData, setUserData] = useState(null);

  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem('token');
    let userId = localStorage.getItem('userId');

    // Self-healing: if token exists but userId is not in localStorage, decode it
    if (token && !userId) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload._id) {
          userId = payload._id;
          localStorage.setItem('userId', userId);
        }
      } catch (e) {
        console.error("Failed to decode token in HUD:", e);
      }
    }

    if (token && userId) {
      try {
        const res = await getUserData(token, userId);
        if (res.data.success && res.data.user) {
          setUserData(res.data.user);
          const u = res.data.user;
          if (u.avatar) {
            localStorage.setItem('mafia_avatar', u.avatar);
            setAvatar(u.avatar);
          }
          if (u.username) {
            localStorage.setItem('mafia_username', u.username);
            setUsername(u.username);
          }
        }
      } catch (err) {
        console.error("Error fetching HUD user data:", err);
      }
    }
  }, []);

  useEffect(() => {
    fetchUserData();

    const handleUpdate = () => {
      setAvatar(localStorage.getItem('mafia_avatar') || null);
      setUsername(localStorage.getItem('mafia_username') || 'Shadow');
      fetchUserData();
    };
    window.addEventListener('profileUpdate', handleUpdate);
    return () => window.removeEventListener('profileUpdate', handleUpdate);
  }, [fetchUserData]);

  const fileRef = useRef(null);

  const trophies = userData?.trophies !== undefined ? userData.trophies : 0;
  const cash = userData?.cash !== undefined ? userData.cash : 0;
  const coins = userData?.coins !== undefined ? userData.coins : 0;
  const level = userData?.totalGamesPlayed !== undefined ? (Math.floor(userData.totalGamesPlayed / 3) + 1) : 1;
  const xp = userData?.totalGamesPlayed !== undefined ? ((userData.totalGamesPlayed % 3) * 100) : 0;
  const xpNext = 500;

  const rank = getRank(trophies);
  const xpPct = Math.round((xp / xpNext) * 100);

  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatar(dataUrl);
      localStorage.setItem('mafia_avatar', dataUrl);
      window.dispatchEvent(new Event('profileUpdate'));
    };
    reader.readAsDataURL(file);
  }, []);

  const isHome = location.pathname === '/';

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: 72, zIndex: 30,
      display: 'flex', alignItems: 'center',
      padding: '0 16px',
      background: 'linear-gradient(180deg,rgba(2,1,7,0.95) 0%,rgba(4,2,10,0.7) 80%,transparent 100%)',
      borderBottom: '1px solid rgba(80,30,50,0.25)',
      gap: 12,
    }}>
      {/* Back button (non-home pages) */}
      {!isHome && (
        <button onClick={() => navigate(-1)} style={{
          background: 'rgba(10,5,18,0.8)',
          border: '1px solid rgba(100,40,60,0.4)',
          borderRadius: 8,
          color: '#c88a8a',
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 18, flexShrink: 0,
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(180,40,60,0.7)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(100,40,60,0.4)'}
        >←</button>
      )}

      {/* Avatar */}
      <div className="hud-avatar" style={{
        position: 'relative', width: 46, height: 46, flexShrink: 0, cursor: 'pointer',
      }} onClick={() => navigate('/profile')}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          border: `2px solid ${rank.color}`,
          boxShadow: `0 0 14px ${rank.color}55`,
          overflow: 'hidden',
          background: 'linear-gradient(135deg,#1a0a18,#0d0518)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isImageSrc(avatar)
            ? <img src={avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize: 22 }}>{(avatar && [...avatar].length <= 2) ? avatar : '🎭'}</span>
          }
        </div>
        {/* Level badge */}
        <div style={{
          position: 'absolute', bottom: -3, right: -3,
          background: 'linear-gradient(135deg,#7a0010,#cc0020)',
          border: '1.5px solid #ff2233',
          borderRadius: '50%',
          width: 18, height: 18, fontSize: 9, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', boxShadow: '0 0 8px rgba(200,0,30,0.6)',
        }}>
          {level}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display:'none' }} />
      </div>

      {/* Name + XP bar */}
      <div style={{ display:'flex', flexDirection:'column', gap: 3, minWidth: 0 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 13,
          color: '#e8d0d8', letterSpacing: '0.08em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: 100,
        }}>{username}</span>
        <div style={{ display:'flex', alignItems:'center', gap: 5 }}>
          <span style={{ fontSize: 9, color: rank.color, letterSpacing:'0.06em', fontWeight:700 }}>
            {rank.icon} {rank.name.toUpperCase()}
          </span>
        </div>
        {/* XP bar */}
        <div style={{
          width: 100, height: 5,
          background: 'rgba(20,10,28,0.9)',
          border: '1px solid rgba(80,40,100,0.4)',
          borderRadius: 3, overflow: 'hidden',
        }}>
          <div style={{
            width:`${xpPct}%`, height:'100%',
            background: 'linear-gradient(90deg,#5a1a80,#9040d0)',
            borderRadius: 3,
            animation: 'xp-fill 1.2s ease',
          }}/>
        </div>
      </div>

      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}/>

      {/* Trophies */}
      <HudStat icon="🏆" value={trophies} color="#ffd700" />
      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}/>

      {/* Cash */}
      <HudStat icon="💵" value={`$${cash.toLocaleString()}`} color="#8fcc55" onPlusClick={() => navigate('/store')} />
      {/* Coins */}
      <HudStat icon="🪙" value={coins} color="#f0c848" onPlusClick={() => navigate('/store')} />

      {/* League Badge (Gamish and Stylish) */}
      <div
        onClick={() => navigate('/leaderboard')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
          background: 'linear-gradient(135deg, rgba(30,10,20,0.8) 0%, rgba(10,5,15,0.95) 100%)',
          border: `1.5px solid ${rank.color}`,
          borderRadius: 20,
          boxShadow: `0 0 12px ${rank.color}44, inset 0 0 8px ${rank.color}22`,
          cursor: 'pointer', flexShrink: 0,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = `0 0 18px ${rank.color}77, inset 0 0 10px ${rank.color}33`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `0 0 12px ${rank.color}44, inset 0 0 8px ${rank.color}22`;
        }}
      >
        <span style={{ fontSize: 13 }}>{rank.icon}</span>
        <span style={{
          fontSize: 9.5, fontWeight: 900, color: rank.color,
          fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
          textShadow: `0 0 8px ${rank.color}aa`,
        }}>
          {rank.name.toUpperCase()}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Settings */}
      <button
        onClick={() => navigate('/settings')}
        style={{
          background: 'rgba(10,5,18,0.8)',
          border: '1px solid rgba(80,50,110,0.35)',
          borderRadius: 8,
          color: '#8878aa',
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color='#b090d0'; e.currentTarget.style.borderColor='rgba(120,80,160,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.color='#8878aa'; e.currentTarget.style.borderColor='rgba(80,50,110,0.35)'; }}
      >
        <GearSVG size={18} />
      </button>
    </div>
  );
}

function HudStat({ icon, value, color, onPlusClick }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 5, flexShrink: 0 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{
        fontSize: 14, fontWeight: 700, color,
        textShadow: `0 0 10px ${color}55`,
        fontFamily: 'var(--font-display)',
      }}>{value}</span>
      {onPlusClick && (
        <button
          onClick={onPlusClick}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1.2px solid rgba(255,255,255,0.18)',
            borderRadius: '50%',
            color: '#fff',
            width: 15, height: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 900, cursor: 'pointer',
            marginLeft: 3, transition: 'all 0.2s',
            lineHeight: 1,
            padding: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,30,50,0.2)';
            e.currentTarget.style.borderColor = '#ff3344';
            e.currentTarget.style.boxShadow = '0 0 8px rgba(255,30,50,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
