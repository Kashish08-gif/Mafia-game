import { useState, useRef, useEffect } from 'react';
import axios from "axios";
import { motion, AnimatePresence } from 'framer-motion';
import { getUserData } from '../../services/userService.js';
import {
  ShieldAlert, Upload, Trophy, Star, Target, Shield,
  Smile, Swords, Zap, CheckCircle2, AlertTriangle, Eye
} from 'lucide-react';

const DEFAULT_AVATARS = [
  { id: '🎭', emoji: '🎭', label: 'Spooky Mask' },
  { id: '🕵️', emoji: '🕵️', label: 'Detective' },
  { id: '🧛', emoji: '🧛', label: 'Vampire' },
  { id: '🐺', emoji: '🐺', label: 'Werewolf' },
  { id: '🤡', emoji: '🤡', label: 'Joker' },
  { id: '💀', emoji: '💀', label: 'Skull' },
  { id: '🧙', emoji: '🧙', label: 'Witch' },
  { id: '👹', emoji: '👹', label: 'Demon' },
];

const ACHIEVEMENTS_CONFIG = [
  {
    key: 'first_blood',
    icon: Swords,
    title: 'First Blood',
    desc: 'Eliminate a player in Night 1.',
    color: '#ff4444',
    hint: 'Play as Mafia and get the first kill of the night.',
  },
  {
    key: 'detective_eye',
    icon: Eye,
    title: 'Detective Eye',
    desc: 'Correctly accuse a Mafia member on Day 1.',
    color: '#a8d8f0',
    hint: 'Point out the Mafia correctly on the very first voting round.',
  },
  {
    key: 'silent_killer',
    icon: Target,
    title: 'Silent Killer',
    desc: 'Win as Mafia without being suspected once.',
    color: '#f0c848',
    hint: 'Finish a full match as Mafia with zero accusations.',
  },
  {
    key: 'guardian_angel',
    icon: Shield,
    title: 'Guardian Angel',
    desc: 'Save the same target 3 nights in a row.',
    color: '#5ad15a',
    hint: 'As Doctor, protect the same player on 3 consecutive nights.',
  },
  {
    key: 'veteran_spirit',
    icon: Star,
    title: 'Veteran Spirit',
    desc: 'Play 50 total matches.',
    color: '#b088ff',
    hint: 'Reach 50 total games played.',
  },
  {
    key: 'serial_winner',
    icon: Trophy,
    title: 'Serial Winner',
    desc: 'Win 10 matches.',
    color: '#ffd700',
    hint: 'Accumulate 10 wins across any role.',
  },
  {
    key: 'killing_spree',
    icon: Swords,
    title: 'Killing Spree',
    desc: 'Get 20 Mafia kills.',
    color: '#ff6633',
    hint: 'Eliminate 20 players total as Mafia across all matches.',
  },
];

const RANK_CONFIG = [
  { name: 'Bronze',   min:    0, max:  499,  color: '#cd7f32', icon: '🥉', nextName: 'Silver'  },
  { name: 'Silver',   min:  500, max: 1499,  color: '#aaa9ad', icon: '🥈', nextName: 'Gold'    },
  { name: 'Gold',     min: 1500, max: 2999,  color: '#ffd700', icon: '🥇', nextName: 'Diamond' },
  { name: 'Diamond',  min: 3000, max: 4999,  color: '#a8d8f0', icon: '💎', nextName: 'Master'  },
  { name: 'Master',   min: 5000, max: 99999, color: '#ff4455', icon: '👑', nextName: 'Master'  },
];

function getRank(trophies) {
  return RANK_CONFIG.find(r => trophies >= r.min && trophies <= r.max) || RANK_CONFIG[0];
}

const isImageSrc = (val) =>
  val && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/'));

export default function ProfilePage() {
  const [avatar, setAvatar] = useState(() => {
    const saved = localStorage.getItem('mafia_avatar');
    if (saved && isImageSrc(saved)) return saved;
    return null;
  });
  const [selectedDefault, setSelectedDefault] = useState(() => {
    const saved = localStorage.getItem('mafia_avatar');
    if (!saved) return '🎭';
    if (isImageSrc(saved)) return null;
    if ([...saved].length <= 2) return saved;
    return '🎭';
  });
  const [tempUsername, setTempUsername] = useState("Shadow");
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [rawFile, setRawFile] = useState(null);
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);

  const getFavRoleName = (role) => {
    switch (role) {
      case 'mafia': return 'The Mastermind (Mafia)';
      case 'police': return 'The Investigator (Detective)';
      case 'doctor': return 'The Guardian (Doctor)';
      case 'villager': return 'The Innocent (Villager)';
      default: return 'The Unpredictable (All-Rounder)';
    }
  };

  const stats = {
    matchesPlayed: profile?.totalGamesPlayed || 0,
    wins: profile?.totalGamesWon || 0,
    losses: (profile?.totalGamesPlayed || 0) - (profile?.totalGamesWon || 0),
    mafiaKills: profile?.mafiaKills || 0,
    trophies: profile?.trophies || 0,
    favRoleDesc: getFavRoleName(profile?.roleGetMaximumTime),
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        let userId = localStorage.getItem("userId");

        if (token && !userId) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload && payload._id) {
              userId = payload._id;
              localStorage.setItem("userId", userId);
            }
          } catch (e) {
            console.error("Failed to decode token in ProfilePage:", e);
          }
        }

        if (!token || !userId) return;

        const res = await getUserData(token, userId);
        setProfile(res.data.user);
        setTempUsername(res.data.user.username);

        if (res.data.user.avatar) {
          const av = res.data.user.avatar;
          if (isImageSrc(av)) {
            setAvatar(av);
            setSelectedDefault(null);
          } else {
            if ([...av].length <= 2) {
              setAvatar(null);
              setSelectedDefault(av);
            } else {
              setAvatar(null);
              setSelectedDefault('🎭');
            }
          }
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchProfile();
  }, []);

  const winRate =
    stats.matchesPlayed > 0
      ? Math.round((stats.wins / stats.matchesPlayed) * 100)
      : 0;

  const currentRank  = getRank(stats.trophies);
  const currentRankName = currentRank.name;
  const nextRankName  = currentRank.nextName;
  const rankMin       = currentRank.min;
  const rankMax       = currentRank.max;
  const rankProgress  = Math.max(0, stats.trophies - rankMin);
  const rankTotal     = rankMax - rankMin || 1;
  const progressPct   = Math.min(100, Math.round((rankProgress / rankTotal) * 100));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawFile(file);
    setAvatar(URL.createObjectURL(file));
    setSelectedDefault(null);
  };

  const handleSelectDefault = (emoji) => {
    setAvatar(null);
    setRawFile(null);
    setSelectedDefault(emoji);
  };

  const handleSaveChanges = async () => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("username", tempUsername);

      if (rawFile) {
        formData.append("avatar", rawFile);
      } else {
        formData.append("avatar", selectedDefault || avatar);
      }

      const res = await axios.put(
       `${import.meta.env.VITE_API_URL}/api/profile`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.user.avatar) {
        const savedAvatar = res.data.user.avatar;
        localStorage.setItem('mafia_avatar', savedAvatar);
      }
      if (res.data.user.username) {
        localStorage.setItem('mafia_username', res.data.user.username);
        localStorage.setItem('username', res.data.user.username);
      }

      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2800);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-scroll" style={{
      width: '100%', height: '100%',
      padding: '24px 40px 100px 40px',
      color: '#fff',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* Toast */}
      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            style={{
              position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)',
              zIndex: 999, background: 'rgba(90,200,100,0.92)', color: '#000',
              padding: '10px 24px', borderRadius: 8, fontWeight: 800, fontSize: 13,
              boxShadow: '0 0 20px rgba(90,200,100,0.5)', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <CheckCircle2 size={16} /> PROFILE DOSSIER UPDATED!
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
          HITMAN DOSSIER
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Manage your Identity, inspect your contract stats, and view unlocked badges</span>
      </motion.div>

      {/* Grid Layout: Left Avatar & Name Edit, Right Stats & Badges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        gap: 32,
        alignItems: 'start',
      }}>
        {/* LEFT COLUMN: Identity Customization */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-panel"
          style={{
            padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
            background: 'rgba(10,5,15,0.85)',
            border: '1.5px solid rgba(120,40,60,0.25)',
          }}
        >
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.08em', color: '#ff4455' }}>
            SYNDICATE IDENTITY
          </h3>

          {/* Current Avatar Display */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'rgba(255,255,255,0.03)',
              border: '2.5px solid #ff3344',
              boxShadow: '0 0 25px rgba(255,30,50,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48, overflow: 'hidden', position: 'relative'
            }}>
              {avatar ? (
                <img src={avatar} alt="Custom Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{selectedDefault}</span>
              )}
            </div>

            {/* Custom Image Upload Button */}
            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: 11, gap: 6 }}
            >
              <Upload size={13} /> UPLOAD CUSTOM IMAGE
            </button>
          </div>

          {/* Preset Avatar Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              OR SELECT PRESET AVATAR
            </label>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
              background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 8,
            }}>
              {DEFAULT_AVATARS.map(av => (
                <button
                  key={av.id}
                  onClick={() => handleSelectDefault(av.emoji)}
                  style={{
                    background: selectedDefault === av.emoji && !avatar ? 'rgba(255,30,50,0.2)' : 'transparent',
                    border: selectedDefault === av.emoji && !avatar ? '1.5px solid #ff3344' : '1px solid transparent',
                    borderRadius: 6, padding: '6px 0', fontSize: 20, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title={av.label}
                >
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Codename Edit Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              ALIAS / CODENAME
            </label>
            <input
              type="text"
              value={tempUsername}
              onChange={e => setTempUsername(e.target.value)}
              className="input-dark"
              style={{ width: '100%' }}
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveChanges}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: 13, gap: 8, marginTop: 4 }}
          >
            <CheckCircle2 size={16} /> SAVE DOSSIER
          </button>
        </motion.div>

        {/* RIGHT COLUMN: Stats Cards & Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* TOP STATS CARDS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {/* Matches & Win Rate */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="glass-panel"
              style={{
                padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
                background: 'rgba(10,5,15,0.85)',
                border: '1.5px solid rgba(120,40,60,0.25)',
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.08em', color: '#ff4455' }}>
                MATCH PERFORMANCE
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: '#fff' }}>
                  {stats.matchesPlayed}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>MATCHES</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                <span style={{ color: '#5ad15a', fontWeight: 700 }}>WINS: {stats.wins}</span>
                <span style={{ color: '#ff5566', fontWeight: 700 }}>LOSSES: {stats.losses}</span>
                <span style={{ color: '#ffd700', fontWeight: 700 }}>{winRate}% RATE</span>
              </div>
            </motion.div>

            {/* Mafia Kills */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="glass-panel"
              style={{
                padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
                background: 'rgba(10,5,15,0.85)',
                border: '1.5px solid rgba(120,40,60,0.25)',
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.08em', color: '#ff4455' }}>
                MAFIA EXECUTIONS
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: '#ff3344' }}>
                  {stats.mafiaKills}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>CONFIRMED KILLS</span>
              </div>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                Favorite Archetype: <strong style={{ color: '#eee' }}>{stats.favRoleDesc}</strong>
              </span>
            </motion.div>

            {/* Rank Trophies */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="glass-panel"
              style={{
                padding: 20, display: 'flex', flexDirection: 'column', gap: 10,
                background: 'rgba(10,5,15,0.85)',
                border: '1.5px solid rgba(120,40,60,0.25)',
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.08em', color: '#ff4455' }}>
                LEAGUE STANDINGS
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.02)',
                  border: `2px solid ${currentRank.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, boxShadow: `0 0 15px ${currentRank.color}40`,
                }}>
                  {currentRank.icon}
                </div>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>CURRENT LEAGUE</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#eee', letterSpacing: '0.05em' }}>
                    {currentRankName.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: '#f0c848', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Trophy size={12} /> {stats.trophies} Trophies
                  </span>
                </div>
              </div>

              {/* Progress to next rank */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Next Rank: <strong>{nextRankName}</strong></span>
                  <span style={{ color: '#ffd700', fontWeight: 600 }}>{stats.trophies} / {rankMax} 🏆</span>
                </div>
                <div style={{
                  width: '100%', height: 8,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 4, overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{
                    width: `${progressPct}%`, height: '100%',
                    background: 'linear-gradient(90deg, #8a78a8, #ffd700)',
                    borderRadius: 4,
                    boxShadow: '0 0 10px rgba(255,215,0,0.3)',
                  }} />
                </div>
                <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                  You need {rankMax - stats.trophies} more trophies to claim {nextRankName} rank.
                </span>
              </div>
            </motion.div>
          </div>

          {/* ACHIEVEMENTS LIST */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="glass-panel"
            style={{
              padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
              background: 'rgba(10,5,15,0.85)',
              border: '1.5px solid rgba(120,40,60,0.25)',
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.08em', color: '#ff4455', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              ACHIEVEMENTS & BADGES
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                {(profile?.achievements || []).length} / {ACHIEVEMENTS_CONFIG.length} UNLOCKED
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ACHIEVEMENTS_CONFIG.map((ach, i) => {
                const IconComp = ach.icon;
                const unlocked = (profile?.achievements || []).includes(ach.key);
                return (
                  <div
                    key={ach.key}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 8,
                      background: unlocked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                      border: unlocked ? `1px solid ${ach.color}22` : '1px solid rgba(255,255,255,0.02)',
                      opacity: unlocked ? 1 : 0.5,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: unlocked ? `${ach.color}12` : 'rgba(255,255,255,0.01)',
                        border: `1.5px solid ${unlocked ? ach.color : 'rgba(255,255,255,0.1)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: unlocked ? `0 0 12px ${ach.color}44` : 'none',
                        flexShrink: 0,
                      }}>
                        <IconComp size={20} color={unlocked ? ach.color : '#555'} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 700, color: unlocked ? '#fff' : '#777', fontSize: 14 }}>
                          {ach.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {ach.desc}
                        </span>
                        {!unlocked && (
                          <span style={{ fontSize: 10, color: '#555', fontStyle: 'italic', marginTop: 1 }}>
                            💡 {ach.hint}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {unlocked ? (
                        <span style={{ fontSize: 11, color: '#5ad15a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> UNLOCKED
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
                          LOCKED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
