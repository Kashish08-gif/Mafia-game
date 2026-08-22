import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, LogOut, Check, Sliders, ShieldAlert, Sparkles, Terminal, Activity } from 'lucide-react';
import AudioManager from '../../services/audio';

const RANK_CONFIG = [
  { name: 'Bronze',  min:    0, max:  499, color: '#cd7f32', icon: '🥉' },
  { name: 'Silver',  min:  500, max: 1499, color: '#aaa9ad', icon: '🥈' },
  { name: 'Gold',    min: 1500, max: 2999, color: '#ffd700', icon: '🥇' },
  { name: 'Diamond', min: 3000, max: 9999, color: '#a8d8f0', icon: '💎' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => AudioManager.settings);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Agent Dossier cache
  const [username, setUsername] = useState('Shadow');
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    setUsername(localStorage.getItem('mafia_username') || 'Shadow');
    setAvatar(localStorage.getItem('mafia_avatar') || null);
  }, []);

  const trophies = 820;
  const currentRank = RANK_CONFIG.find(r => trophies >= r.min && trophies <= r.max) || RANK_CONFIG[0];

  const handleToggleMusic = () => {
    const updated = { ...settings, musicEnabled: !settings.musicEnabled };
    setSettings(updated);
    AudioManager.updateSettings(updated);
  };

  const handleToggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(updated);
    AudioManager.updateSettings(updated);
  };

  const handleMusicVolumeChange = (e) => {
    const vol = parseInt(e.target.value, 10);
    const updated = { ...settings, musicVolume: vol };
    setSettings(updated);
    AudioManager.updateSettings(updated);
  };

  const handleSoundVolumeChange = (e) => {
    const vol = parseInt(e.target.value, 10);
    const updated = { ...settings, soundVolume: vol };
    setSettings(updated);
    AudioManager.updateSettings(updated);
  };

  const handleLogout = () => {
    localStorage.removeItem('mafia_username');
    localStorage.removeItem('mafia_avatar');
    window.dispatchEvent(new Event('profileUpdate'));
    
    setSuccessMsg('⚠️ Purging Operative Profile from Mansion Database...');
    setShowLogoutConfirm(false);
    
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  };

  return (
    <div className="page-scroll" style={{
      width: '100%', height: '100%',
      padding: '24px 40px 120px 40px',
      color: '#fff',
      display: 'flex', flexDirection: 'column', gap: 24,
      alignItems: 'center',
      position: 'relative',
    }}>
      {/* Custom Slider & Switch CSS */}
      <style>{`
        .custom-range {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.08);
          outline: none;
          transition: all 0.2s;
        }
        .custom-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .range-red::-webkit-slider-thumb {
          background: #ff3344;
          box-shadow: 0 0 8px rgba(255, 51, 68, 0.6);
        }
        .range-red::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 14px rgba(255, 51, 68, 0.9);
        }
        .range-green::-webkit-slider-thumb {
          background: #8fcc55;
          box-shadow: 0 0 8px rgba(143, 204, 85, 0.6);
        }
        .range-green::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 14px rgba(143, 204, 85, 0.9);
        }
      `}</style>

      {/* Toast Notification */}
      <AnimatePresence>
        {successMsg && (
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
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Page Title */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.12em', color: '#ff4455' }}>
            OPERATIVE SETTINGS CONSOLE
          </h1>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Calibrate hardware channels and execute secure protocol overrides</span>
        </motion.div>

        {/* IMMERSIVE AGENT STATUS BLOCK */}
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="glass-panel"
          style={{
            background: 'linear-gradient(90deg, rgba(30,12,20,0.7) 0%, rgba(10,5,15,0.95) 100%)',
            border: '1.5px solid rgba(160,80,240,0.25)',
            boxShadow: '0 8px 30px rgba(100,50,150,0.15)',
            padding: '20px 24px',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              border: `2px solid ${currentRank.color}`,
              boxShadow: `0 0 16px ${currentRank.color}55`,
              background: 'linear-gradient(135deg,#1c0a22,#0a030c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, overflow: 'hidden',
            }}>
              {avatar && avatar.startsWith('data:') ? (
                <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{avatar || '🎭'}</span>
              )}
            </div>

            <div>
              <span style={{ fontSize: 9, color: '#a855f7', fontWeight: 900, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Terminal size={11} /> CLIENT ACTIVE LINK: CONNECTED
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#fff', margin: '2px 0 0 0' }}>
                {username}
              </h2>
            </div>
          </div>

          {/* Tactical Telemetry info */}
          <div style={{ display: 'flex', gap: 20, fontSize: 11 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>LATENCY</span>
              <span style={{ color: '#5ad15a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                🟢 45ms
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>RANK TIER</span>
              <span style={{ color: currentRank.color, fontWeight: 800, marginTop: 2 }}>
                {currentRank.icon} {currentRank.name.toUpperCase()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* AUDIO DECK CONFIGURATION */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-panel"
          style={{
            padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
            background: 'rgba(10,5,15,0.85)',
            border: '1.5px solid rgba(120,40,60,0.25)',
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.08em', color: '#ff4455' }}>
              AUDIO CHANNELS MIXER
            </h3>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Activity size={12} /> REAL-TIME FREQUENCY CONTROL
            </span>
          </div>

          {/* Ambient Music Wind Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 6,
                  background: settings.musicEnabled ? 'rgba(255,51,68,0.05)' : 'rgba(255,255,255,0.01)',
                  border: `1px solid ${settings.musicEnabled ? '#ff3344' : 'rgba(255,255,255,0.06)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {settings.musicEnabled ? <Volume2 size={15} color="#ff3344" /> : <VolumeX size={15} color="#666" />}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, display: 'block', color: '#fff' }}>HOWLING WIND MUSIC</span>
                  <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Low volume continuous storm wind whistling drone</span>
                </div>
              </div>

              <div 
                className={`toggle-track ${settings.musicEnabled ? 'on' : ''}`}
                onClick={handleToggleMusic}
              >
                <div className="toggle-thumb" />
              </div>
            </div>

            {settings.musicEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 6 }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>GAIN</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.musicVolume}
                  onChange={handleMusicVolumeChange}
                  className="custom-range range-red"
                />
                <span style={{ fontSize: 11, fontWeight: 800, width: 30, textAlign: 'right', color: '#ff3344' }}>
                  {settings.musicVolume}%
                </span>
              </motion.div>
            )}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

          {/* Interface SFX Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 6,
                  background: settings.soundEnabled ? 'rgba(143,204,85,0.05)' : 'rgba(255,255,255,0.01)',
                  border: `1px solid ${settings.soundEnabled ? '#8fcc55' : 'rgba(255,255,255,0.06)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {settings.soundEnabled ? <Volume2 size={15} color="#8fcc55" /> : <VolumeX size={15} color="#666" />}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, display: 'block', color: '#fff' }}>INTERFACE SFX EFFECTS</span>
                  <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Button feedback triggers, clicks, and tactical sweeps</span>
                </div>
              </div>

              <div 
                className={`toggle-track ${settings.soundEnabled ? 'on' : ''}`}
                onClick={handleToggleSound}
              >
                <div className="toggle-thumb" />
              </div>
            </div>

            {settings.soundEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 6 }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>GAIN</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.soundVolume}
                  onChange={handleSoundVolumeChange}
                  className="custom-range range-green"
                />
                <span style={{ fontSize: 11, fontWeight: 800, width: 30, textAlign: 'right', color: '#8fcc55' }}>
                  {settings.soundVolume}%
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* LOGOUT PANEL */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-panel"
          style={{
            padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
            background: 'rgba(25,8,12,0.8)',
            border: '1.5px solid rgba(220,40,60,0.3)',
            borderRadius: 12,
          }}
        >
          <h4 style={{ 
            fontSize: 11.5, fontWeight: 900, color: '#ff3344', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <ShieldAlert size={14} /> CONTRACT SECURITY BYPASS
          </h4>
          <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', lineHeight: '1.3' }}>
            Wipe codename caches and detach socket hooks from current game loop.
          </p>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="btn-primary"
            style={{
              width: '100%', height: 38, gap: 8, fontSize: 12,
              background: 'linear-gradient(135deg, #250005, #42000c)',
              borderColor: '#ff3344', color: '#ff4455',
              boxShadow: '0 0 12px rgba(255,51,68,0.2)'
            }}
          >
            <LogOut size={13} /> TERMINATE CONTRACT
          </button>
        </motion.div>

      </div>

      {/* CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {showLogoutConfirm && (
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
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="glass-panel"
              style={{
                width: '100%', maxWidth: 400,
                border: '2px solid rgba(180,20,40,0.5)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                padding: 28, borderRadius: 12,
                background: 'linear-gradient(135deg,#130a18,#0a050f)',
                textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 18,
                alignItems: 'center',
              }}
            >
              <div style={{
                width: 54, height: 54, borderRadius: '50%',
                background: 'rgba(200,20,40,0.15)',
                border: '2px solid #ff3344',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldAlert size={26} color="#ff3344" />
              </div>

              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#ff3344', marginBottom: 4 }}>
                  TERMINATE CONTRACT?
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Are you sure you want to log out and purge your local character identity?</span>
              </div>

              <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
                <button onClick={() => setShowLogoutConfirm(false)} className="btn-secondary" style={{ flex: 1 }}>
                  CANCEL
                </button>
                <button onClick={handleLogout} className="btn-primary" style={{ flex: 1, padding: '10px 16px' }}>
                  CONFIRM LOGOUT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
