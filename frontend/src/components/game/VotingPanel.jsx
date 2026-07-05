/**
 * VotingPanel.jsx
 * Day-phase voting modal — lists all alive players (excluding self),
 * shows current vote tally, and emits a vote on click.
 * Extracted from GameMapPage.jsx's inline VotingPanel function.
 *
 * Props:
 *   players  — array of remote player objects
 *   tally    — { [playerId]: voteCount }
 *   onVote   — callback(targetId: string)
 *   onClose  — callback() to dismiss the panel
 *   myId     — socket ID of the local player (excluded from list)
 */

import { Skull, Vote } from 'lucide-react';

export default function VotingPanel({ players = [], tally = {}, onVote, onClose, myId }) {
  const eligible = players.filter((p) => p.id !== myId && p.isAlive !== false);

  return (
    <div
      data-testid="voting-panel"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(22,6,16,0.98) 0%, rgba(8,3,10,0.98) 100%)',
          border: '1.5px solid rgba(255,68,85,0.35)',
          borderRadius: 18,
          padding: '28px 32px',
          width: 520,
          maxWidth: '92vw',
          color: '#fff',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 40px rgba(255,68,85,0.12)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Title */}
        <h2
          style={{
            fontSize: 22,
            color: '#ff4455',
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '0 0 6px',
          }}
        >
          <Vote size={22} /> VOTE TO ELIMINATE
        </h2>
        <p style={{ color: '#888', fontSize: 12, margin: '0 0 20px' }}>
          Pick the player you suspect is Mafia. Most votes gets eliminated.
        </p>

        {eligible.length === 0 ? (
          <div style={{ color: '#666', textAlign: 'center', padding: '24px 0', fontSize: 14 }}>
            No eligible players to vote for.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            {eligible.map((p) => {
              const votes = tally[p.id] || 0;
              return (
                <button
                  key={p.id}
                  data-testid={`vote-${p.id}`}
                  onClick={() => onVote(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,68,85,0.2)',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,68,85,0.12)';
                    e.currentTarget.style.borderColor = '#ff4455';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,68,85,0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: p.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: 15,
                      color: '#000',
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${p.color}88`,
                    }}
                  >
                    {p.username?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Name + vote count */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.username}
                    </div>
                    <div style={{ fontSize: 11, color: votes > 0 ? '#ff9966' : '#666', marginTop: 2 }}>
                      {votes} vote{votes !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <Skull size={16} color="#ff4455" />
                </button>
              );
            })}
          </div>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          data-testid="voting-close"
          style={{
            marginTop: 20,
            width: '100%',
            padding: 13,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#aaa',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            fontWeight: 700,
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
