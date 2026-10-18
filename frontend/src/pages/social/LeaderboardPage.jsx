import { motion } from 'framer-motion';
import { Trophy, HelpCircle, Flame, Shield, Users } from 'lucide-react';
import { useState, useEffect } from "react";
import { LEAGUE_TIERS, getLeagueByTrophies } from '../../shared/leagueConfig.js';
import LeagueEmblem from '../../components/common/LeagueEmblem.jsx';
import { API_BASE_URL } from '../../config/api.js';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const selfPlayer = currentUser;

  const getWinRate = (player) => {
    if (!player?.totalGamesPlayed) return 0;
    return Math.round(
      (player.totalGamesWon / player.totalGamesPlayed) * 100
    );
  };

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    fetch(`${API_BASE_URL}/leaderboard`)
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data);
        const loggedInUser = data.find(
          (p) => p._id === userId
        );
        setCurrentUser(loggedInUser);
      })
      .catch(console.error);
  }, [userId]);

  return (
    <div className="page-scroll" style={{
      width: '100%', height: '100%',
      padding: '24px 40px 140px 40px', // extra bottom padding for the sticky bottom card
      color: '#fff',
      display: 'flex', flexDirection: 'column', gap: 24,
      position: 'relative',
    }}>
      {/* Page Title */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.12em', color: '#ff4455' }}>
          UNDERGROUND LEADERBOARD & LEAGUES
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Compete across 9 competitive league tiers from Bronze to Legendary Mythic Overlord
        </span>
      </motion.div>

      {/* Grid: Left Tiers Info, Right Rankings */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 24,
        alignItems: 'start',
      }}>
        {/* LEFT COLUMN: Rank Tiers & Point System */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Tiers List */}
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
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', color: '#ff4455', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flame size={16} /> 9 COMPETITIVE TIERS
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
              {[...LEAGUE_TIERS].reverse().map((t) => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8,
                  background: t.bgGradient,
                  border: `1px solid ${t.primaryColor}55`,
                  boxShadow: `0 0 10px ${t.glowColor}22`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LeagueEmblem tierId={t.id} size="xs" animate={false} />
                    <div>
                      <span style={{ fontWeight: 800, color: t.lightColor, fontSize: 12, display: 'block', letterSpacing: '0.04em' }}>
                        {t.name.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{t.title}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#ffd700', fontWeight: 700 }}>{t.range}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Points System Card */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="glass-panel"
            style={{
              padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
              background: 'rgba(10,5,15,0.85)',
              border: '1.5px solid rgba(120,40,60,0.25)',
            }}
          >
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', color: '#ffd700',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <HelpCircle size={15} /> TROPHY SYSTEM
            </h3>
            <ul style={{
              fontSize: 11.5, color: 'var(--text-muted)', lineHeight: '1.6',
              paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6
            }}>
              <li>🏆 <strong>Match Win:</strong> Winning team members gain <strong>+25 Trophies</strong>.</li>
              <li>💀 <strong>Match Defeat:</strong> Defeated team loses <strong>-15 Trophies</strong> (clamped at 0).</li>
              <li>⚡ <strong>Rank Promotions:</strong> Crossing trophy thresholds instantly promotes you to the next League Tier.</li>
            </ul>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: Rankings List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-panel"
          style={{
            padding: 24, display: 'flex', flexDirection: 'column', gap: 14,
            background: 'rgba(10,5,15,0.85)',
            border: '1.5px solid rgba(120,40,60,0.25)',
          }}
        >
          <div style={{
            display: 'grid', gridTemplateColumns: '60px 50px 1fr 150px 110px 90px',
            padding: '0 16px 8px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em',
          }}>
            <span>RANK</span>
            <span>AVATAR</span>
            <span>PLAYER</span>
            <span>LEAGUE</span>
            <span style={{ textAlign: 'right' }}>TROPHIES</span>
            <span style={{ textAlign: 'right' }}>WIN RATE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((p, index) => {
              const isSelf = p._id === selfPlayer?._id;
              const playerLeague = getLeagueByTrophies(p.trophies);
              const rankColor =
                index === 0
                  ? "#ffd700"
                  : index === 1
                    ? "#aaa9ad"
                    : index === 2
                      ? "#cd7f32"
                      : "#888";

              return (
                <div
                  key={p._id}
                  className="lb-row"
                  style={{
                    display: 'grid', gridTemplateColumns: '60px 50px 1fr 150px 110px 90px',
                    padding: '12px 16px', borderRadius: 8,
                    background: isSelf ? 'rgba(200,30,50,0.12)' : 'rgba(255,255,255,0.02)',
                    border: isSelf ? '1.5px solid rgba(255,30,50,0.4)' : '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'center',
                    boxShadow: isSelf ? '0 0 15px rgba(255,30,50,0.2)' : 'none',
                  }}
                >
                  {/* Rank position */}
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color: rankColor,
                    display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    {index + 1 === 1 ? "🥇"
                      : index + 1 === 2
                        ? "🥈"
                        : index + 1 === 3
                          ? "🥉"
                          : `#${index + 1}`}
                  </span>

                  {/* Avatar */}
                  {p.avatar?.startsWith("http") || p.avatar?.startsWith("data:") ? (
                    <img
                      src={p.avatar}
                      alt={p.username}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: `1.5px solid ${playerLeague.primaryColor}`,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 24 }}>
                      {["🎭", "🧛", "🕵️", "💀", "👹", "🐺", "🤡"].includes(p.avatar)
                        ? p.avatar
                        : "🎭"}
                    </span>
                  )}

                  {/* Name */}
                  <span style={{ fontWeight: 700, color: isSelf ? '#ff5566' : '#fff', fontSize: 13.5 }}>
                    {p.username} {isSelf && <span style={{ fontSize: 9.5, background: '#ff3344', padding: '2px 6px', borderRadius: 10, color: '#fff', marginLeft: 6, fontWeight: 900 }}>YOU</span>}
                  </span>

                  {/* League Emblem Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LeagueEmblem tierId={playerLeague.id} size="xs" animate={false} />
                    <span style={{
                      fontSize: 11, fontWeight: 800,
                      color: playerLeague.lightColor,
                      letterSpacing: '0.04em',
                      textShadow: `0 0 8px ${playerLeague.glowColor}`,
                    }}>
                      {playerLeague.name.toUpperCase()}
                    </span>
                  </div>

                  {/* Trophies */}
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#ffd700',
                    textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4
                  }}>
                    🏆 {(p.trophies || 0).toLocaleString()}
                  </span>

                  {/* Win rate */}
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#5ad15a', textAlign: 'right'
                  }}>
                    {getWinRate(p)}%
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* PINNED BOTTOM CARD: Your Rank details */}
      {selfPlayer && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            position: 'sticky',
            bottom: 24,
            marginTop: 'auto',
            background: 'linear-gradient(90deg, #1b0005 0%, #2e000a 50%, #1b0005 100%)',
            border: '2px solid var(--blood)',
            borderRadius: 14, padding: '16px 28px', zIndex: 30,
            boxShadow: '0 -4px 30px rgba(200,0,30,0.3), 0 10px 40px rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Self League Emblem */}
            <LeagueEmblem tierId={getLeagueByTrophies(selfPlayer.trophies).id} size="sm" animate={true} />

            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.02)',
              border: `2px solid ${getLeagueByTrophies(selfPlayer.trophies).primaryColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
              overflow: 'hidden',
            }}>
              {selfPlayer.avatar?.startsWith("http") || selfPlayer.avatar?.startsWith("data:") ? (
                <img
                  src={selfPlayer.avatar}
                  alt={selfPlayer.username}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span>
                  {["🎭", "🧛", "🕵️", "💀", "👹", "🐺", "🤡"].includes(selfPlayer.avatar)
                    ? selfPlayer.avatar
                    : "🎭"}
                </span>
              )}
            </div>
            <div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>YOUR STANDING</span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#ff4455', display: 'flex', alignItems: 'center', gap: 8 }}>
                Rank # {players.findIndex(
                  player => player._id === selfPlayer?._id
                ) + 1}
                · {selfPlayer?.username}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)', display: 'block', textTransform: 'uppercase' }}>LEAGUE</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: getLeagueByTrophies(selfPlayer?.trophies).lightColor }}>
                {getLeagueByTrophies(selfPlayer?.trophies).name.toUpperCase()}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)', display: 'block', textTransform: 'uppercase' }}>TROPHIES</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#ffd700' }}>🏆 {(selfPlayer.trophies || 0).toLocaleString()}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)', display: 'block', textTransform: 'uppercase' }}>WIN RATE</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#5ad15a' }}>{getWinRate(selfPlayer)}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
