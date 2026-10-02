import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Users, Trophy, PlusSquare, LogIn, ShoppingBag,
  BookOpen, Sparkles, X, Sword, Target, Shield, Skull
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null); // 'shop' | 'quest' | 'skills' | null

  // Mock data for interactive modals
  const quests = [
    { id: 1, title: 'Silent Assassin', desc: 'Win a match as Mafia without being accused.', progress: '0/1', reward: '🪙 150', completed: false },
    { id: 2, title: 'Innocent Bystander', desc: 'Survive to the end as a Villager.', progress: '1/1', reward: '🪙 100', completed: true },
    { id: 3, title: 'Detective Eye', desc: 'Correctly identify the Mafia in discussion.', progress: '2/3', reward: '🪙 200', completed: false },
  ];

  const skills = [
    { name: 'Poker Face', desc: 'Accusations against you have 15% less voting weight.', cost: '💵 1,500', type: 'passive', icon: Skull },
    { name: 'Night Vision', desc: 'Get a 5-second preview of player actions at dusk.', cost: '💵 2,500', type: 'active', icon: Target },
    { name: 'Bulletproof Vest', desc: 'Survive one night attack from the Mafia.', cost: '💵 4,000', type: 'item', icon: Shield },
  ];

  const shopItems = [
    { name: 'Cursed Crate', desc: 'Contains random spooky custom avatars and tags.', cost: '🪙 200', color: '#cc1122' },
    { name: 'VIP Badge', desc: 'Golden nameplate + double XP multiplier for 24h.', cost: '🪙 500', color: '#ffd700' },
    { name: 'Grim Reaper Skin', desc: 'Exclusive animation when killing a player.', cost: '💵 3,500', color: '#a8d8f0' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      position: 'relative',
      color: '#fff',
    }}>
      {/* ── LEFT PANEL: Friends & Leaderboard ── */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          position: 'absolute', left: 24, top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 20,
          zIndex: 20,
        }}
      >
        <button
          onClick={() => navigate('/friends')}
          className="btn-secondary glass-panel"
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            width: 100, height: 100, gap: 8,
            border: '1.5px solid rgba(120,40,60,0.4)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          }}
        >
          <Users size={28} color="#ff6666" />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>FRIENDS</span>
        </button>

        <button
          onClick={() => navigate('/leaderboard')}
          className="btn-secondary glass-panel"
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            width: 100, height: 100, gap: 8,
            border: '1.5px solid rgba(120,40,60,0.4)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          }}
        >
          <Trophy size={28} color="#ffd700" />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>RANKINGS</span>
        </button>
      </motion.div>
      {/* ── CENTER ACTIONS: Create & Join Room ── */}
      <div style={{
        display: 'flex', gap: 40,
        maxWidth: 900, width: '100%',
        padding: '0 40px',
        justifyContent: 'center',
        zIndex: 15,
      }}>
        {/* Create Room Card */}
        <motion.div
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.98 }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onClick={() => navigate('/create-room')}
          className="glass-panel"
          style={{
            flex: 1, height: 260, cursor: 'pointer',
            border: '2px solid rgba(150,20,40,0.5)',
            boxShadow: '0 10px 30px rgba(150,0,20,0.25), inset 0 0 20px rgba(100,0,15,0.2)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 24, textAlign: 'center', gap: 16,
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(30,5,10,0.85) 0%, rgba(10,3,7,0.9) 100%)',
          }}
        >
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            background: 'rgba(255,20,40,0.1)',
            border: '2.5px solid #ff3344',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(255,30,50,0.4)',
          }}>
            <PlusSquare size={36} color="#ff3344" />
          </div>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 22,
              letterSpacing: '0.12em', color: '#ff4455',
              textShadow: '0 0 10px rgba(255,20,40,0.5)',
              marginBottom: 8,
            }}>CREATE ROOM</h2>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 12,
              color: 'var(--text-muted)', lineHeight: '1.4',
            }}>
              Host your own game lobby. Customize player limits, game modes, and summon players into your map.
            </p>
          </div>
        </motion.div>

        {/* Join Room Card */}
        <motion.div
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.98 }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onClick={() => navigate('/join-room')}
          className="glass-panel"
          style={{
            flex: 1, height: 260, cursor: 'pointer',
            border: '2px solid rgba(80,50,110,0.5)',
            boxShadow: '0 10px 30px rgba(100,50,150,0.25), inset 0 0 20px rgba(60,30,100,0.2)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 24, textAlign: 'center', gap: 16,
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(15,8,30,0.85) 0%, rgba(8,4,18,0.9) 100%)',
          }}
        >
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            background: 'rgba(160,80,240,0.1)',
            border: '2.5px solid #a855f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(168,85,247,0.4)',
          }}>
            <LogIn size={36} color="#a855f7" />
          </div>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 22,
              letterSpacing: '0.12em', color: '#b088ff',
              textShadow: '0 0 10px rgba(168,85,247,0.5)',
              marginBottom: 8,
            }}>JOIN ROOM</h2>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 12,
              color: 'var(--text-muted)', lineHeight: '1.4',
            }}>
              Browse active public rooms, search by host, or quick match to instantly enter a lobby.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT PANEL: Shop, Quests, Skills ── */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          position: 'absolute', right: 24, top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 16,
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setActiveModal('shop')}
          className="btn-secondary glass-panel"
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            width: 100, height: 90, gap: 6,
            border: '1.5px solid rgba(80,50,110,0.4)',
          }}
        >
          <ShoppingBag size={24} color="#f0c848" />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>MY SHOP</span>
        </button>

        <button
          onClick={() => setActiveModal('quest')}
          className="btn-secondary glass-panel"
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            width: 100, height: 90, gap: 6,
            border: '1.5px solid rgba(80,50,110,0.4)',
          }}
        >
          <BookOpen size={24} color="#5ad15a" />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>QUESTS</span>
        </button>

        <button
          onClick={() => setActiveModal('skills')}
          className="btn-secondary glass-panel"
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            width: 100, height: 90, gap: 6,
            border: '1.5px solid rgba(80,50,110,0.4)',
          }}
        >
          <Sparkles size={24} color="#a8d8f0" />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>SKILLS</span>
        </button>
      </motion.div>

      {/* ── MODALS (Shop, Quests, Skills) ── */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(2, 1, 6, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-panel"
              style={{
                width: '100%', maxWidth: 500,
                border: '2px solid rgba(120,40,60,0.4)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                padding: 28, borderRadius: 16,
                background: 'linear-gradient(135deg,#130a18,#0a050f)',
                position: 'relative',
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveModal(null)}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={20} />
              </button>

              {/* Shop Modal */}
              {activeModal === 'shop' && (
                <div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)', fontSize: 20,
                    letterSpacing: '0.08em', color: '#f0c848',
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)',
                    paddingBottom: 10,
                  }}>
                    <ShoppingBag size={22} /> IN-GAME SHOP
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {shopItems.map((item, i) => (
                      <div key={i} className="glass-panel" style={{
                        padding: 14, display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <div style={{ display:'flex', flexDirection:'column', gap: 3 }}>
                          <span style={{ fontWeight: 700, color: item.color, fontSize: 14 }}>{item.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</span>
                        </div>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, border: '1px solid rgba(120,80,180,0.5)' }}>
                          BUY ({item.cost})
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quests Modal */}
              {activeModal === 'quest' && (
                <div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)', fontSize: 20,
                    letterSpacing: '0.08em', color: '#5ad15a',
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)',
                    paddingBottom: 10,
                  }}>
                    <BookOpen size={22} /> DAILY CONTRACTS
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {quests.map((item) => (
                      <div key={item.id} className="glass-panel" style={{
                        padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
                        background: item.completed ? 'rgba(40,120,60,0.05)' : 'rgba(255,255,255,0.02)',
                        border: item.completed ? '1px solid rgba(40,120,60,0.2)' : '1px solid rgba(255,255,255,0.05)',
                        opacity: item.completed ? 0.75 : 1,
                      }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontWeight: 700, color: item.completed ? '#5ad15a' : '#ffeaee', fontSize: 14 }}>
                            {item.title} {item.completed && '✓'}
                          </span>
                          <span style={{ fontSize: 11, color: '#e0c050', fontWeight: 600 }}>{item.reward}</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow:'hidden' }}>
                            <div style={{
                              width: item.completed ? '100%' : '66%', height: '100%',
                              background: item.completed ? '#5ad15a' : '#cc1122'
                            }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.progress}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Modal */}
              {activeModal === 'skills' && (
                <div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)', fontSize: 20,
                    letterSpacing: '0.08em', color: '#a8d8f0',
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)',
                    paddingBottom: 10,
                  }}>
                    <Sparkles size={22} /> CHARACTER PERKS
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {skills.map((item, i) => {
                      const IconComp = item.icon;
                      return (
                        <div key={i} className="glass-panel" style={{
                          padding: 14, display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <div style={{ display:'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: 6,
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <IconComp size={18} color="#a8d8f0" />
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap: 2 }}>
                              <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{item.name}</span>
                              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', maxWidth: 220, lineHeight: 1.3 }}>{item.desc}</span>
                            </div>
                          </div>
                          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11, border: '1px solid rgba(120,80,180,0.5)' }}>
                            {item.cost}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
