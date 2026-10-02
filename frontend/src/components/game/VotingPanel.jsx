/**
 * VotingPanel.jsx
 * Day-phase voting modal — lists all alive players (excluding self),
 * shows current vote tally with glowing flame meters, and emits a vote on click.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Vote, X, Flame, ShieldAlert, Crosshair } from 'lucide-react';
import FloatingParticles from '../common/FloatingParticles';

export default function VotingPanel({ players = [], tally = {}, onVote, onClose, myId }) {
  const [hoveredId, setHoveredId] = useState(null);
  const eligible = players.filter((p) => p.id !== myId && p.isAlive !== false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="voting-panel"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 250,
          background: 'radial-gradient(ellipse at center, rgba(30, 4, 10, 0.94) 0%, rgba(5, 0, 2, 0.98) 100%)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          padding: '20px',
          fontFamily: "'Cinzel', 'Outfit', 'Inter', system-ui, sans-serif",
        }}
      >
        <FloatingParticles theme="eliminated" density={30} />

        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
          style={{
            background: 'linear-gradient(165deg, rgba(28, 8, 16, 0.96) 0%, rgba(10, 3, 6, 0.98) 100%)',
            border: '1.5px solid rgba(255, 68, 85, 0.45)',
            borderRadius: 24,
            padding: '30px 32px',
            width: 540,
            maxWidth: '92vw',
            color: '#fff',
            boxShadow: '0 24px 70px rgba(0,0,0,0.85), 0 0 50px rgba(255, 68, 85, 0.25)',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Close Icon */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            data-testid="voting-close"
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              cursor: 'pointer',
              color: '#888',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </motion.button>

          {/* Title Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,68,85,0.3) 0%, transparent 80%)',
                border: '1.5px solid #ff4455',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Vote size={18} color="#ff4455" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: 20,
                  color: '#ff4455',
                  letterSpacing: '0.12em',
                  fontWeight: 900,
                  margin: 0,
                  textTransform: 'uppercase',
                  textShadow: '0 0 15px rgba(255,68,85,0.5)',
                }}
              >
                TOWN TRIBUNAL VOTE
              </h2>
            </div>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '0 0 20px', letterSpacing: '0.5px' }}>
            Cast your vote to suspect and execute a player. Majority vote seals their fate.
          </p>

          {eligible.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
              No eligible players remaining to vote for.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                maxHeight: 340,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {eligible.map((p) => {
                const votes = tally[p.id] || 0;
                const isHovered = hoveredId === p.id;

                return (
                  <motion.button
                    key={p.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    data-testid={`vote-${p.id}`}
                    onClick={() => onVote(p.id)}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: votes > 0
                        ? 'linear-gradient(135deg, rgba(255, 68, 85, 0.15) 0%, rgba(255, 68, 85, 0.05) 100%)'
                        : isHovered
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${votes > 0 ? '#ff4455' : isHovered ? 'rgba(255,68,85,0.4)' : 'rgba(255,68,85,0.18)'}`,
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.18s ease',
                      boxShadow: votes > 0 ? '0 0 15px rgba(255,68,85,0.25)' : 'none',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: p.color || '#666',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: 16,
                        color: '#000',
                        flexShrink: 0,
                        boxShadow: `0 0 10px ${p.color}88`,
                        border: '2px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      {p.username?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Name + vote count */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#fff',
                        }}
                      >
                        {p.username}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: votes > 0 ? '#ff8896' : 'rgba(255,255,255,0.4)',
                          marginTop: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: votes > 0 ? 800 : 500,
                        }}
                      >
                        {votes > 0 && <Flame size={12} color="#ff3344" />}
                        <span>{votes} vote{votes !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <Skull size={16} color={votes > 0 ? '#ff4455' : 'rgba(255,255,255,0.2)'} />
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Close Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            style={{
              marginTop: 22,
              width: '100%',
              padding: '13px 20px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#d1d5db',
              cursor: 'pointer',
              letterSpacing: '0.1em',
              fontWeight: 800,
              fontSize: 13,
              textTransform: 'uppercase',
            }}
          >
            DISMISS / CLOSE
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
