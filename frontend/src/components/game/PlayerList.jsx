/**
 * PlayerList.jsx
 * Left-side HUD panel showing all alive players with colour indicator,
 * alive/dead status bar, rank number, and "YOU" badge.
 * Extracted from the large inline block in GameMapPage.jsx.
 *
 * Props:
 *   myId         — socket ID of the local player
 *   myName       — local player username
 *   myColor      — local player colour hex string
 *   isAlive      — local player alive status
 *   players      — array of remote player objects
 *   aliveCount   — number currently alive (including local)
 *   totalPlayers — total in the room
 */

export default function PlayerList({
  myId,
  myName,
  myColor,
  isAlive,
  players = [],
  inspectedPlayerId = null,
  onInspectPlayer = null,
}) {
  const all = [
    { id: myId, username: myName, color: myColor, isAlive },
    ...players.filter((p) => p.id !== myId),
  ];

  const aliveCount = all.filter((p) => p.isAlive !== false).length;
  const totalPlayers = all.length;

  return (
    <div
      data-testid="hud-players-list"
      style={{
        position: 'absolute',
        top: 74,
        left: 16,
        width: 270,
        background: 'linear-gradient(180deg, rgba(28,9,38,0.85) 0%, rgba(8,4,12,0.95) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1.5px solid rgba(255,215,0,0.25)',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          fontSize: 12,
          color: '#ffd700',
          fontWeight: 800,
          letterSpacing: '0.05em',
          borderBottom: '1px solid rgba(255,215,0,0.15)',
          paddingBottom: 6,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          👥 Players Alive
        </span>
        <span
          style={{
            color: '#5ad15a',
            background: 'rgba(90,209,90,0.1)',
            padding: '2px 8px',
            borderRadius: 8,
          }}
        >
          {aliveCount}/{totalPlayers}
        </span>
      </div>

      {/* Player rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
        {all.map((p, i) => {
          const isInspected = inspectedPlayerId === p.id;
          const canInspect = !isAlive && p.isAlive !== false;

          return (
            <div
              key={p.id}
              onClick={() => {
                if (canInspect) onInspectPlayer?.(p.id);
              }}
              title={canInspect ? `Click to inspect ${p.username}` : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: isInspected
                  ? 'rgba(255, 215, 0, 0.14)'
                  : 'rgba(255,255,255,0.03)',
                padding: '6px 10px',
                borderRadius: 8,
                border: isInspected
                  ? '1.5px solid #ffd700'
                  : '1px solid rgba(255,255,255,0.04)',
                cursor: canInspect ? 'pointer' : 'default',
                transition: 'all 0.18s ease',
              }}
            >
              {/* Rank */}
              <span style={{ color: '#ffd70088', fontSize: 11, fontWeight: 700, width: 14 }}>
                {i + 1}
              </span>

              {/* Avatar circle */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: p.color,
                  border: '1.5px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 900,
                  color: '#000',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              >
                {p.username?.[0]?.toUpperCase()}
              </div>

              {/* Name + status bar */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: p.isAlive !== false ? '#fff' : '#888',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.username}
                </div>
                <div
                  style={{
                    height: 3,
                    background: p.isAlive !== false ? '#5ad15a' : '#ff4455',
                    borderRadius: 2,
                    marginTop: 3,
                    boxShadow: p.isAlive !== false
                      ? '0 0 6px #5ad15a'
                      : '0 0 6px #ff4455',
                  }}
                />
              </div>

              {/* Badge */}
              {p.id === myId ? (
                <span
                  style={{
                    fontSize: 8,
                    background: p.isAlive === false ? '#ff3344' : 'linear-gradient(90deg, #7c3aed, #4f46e5)',
                    padding: '2px 6px',
                    borderRadius: 6,
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                    flexShrink: 0,
                  }}
                >
                  {p.isAlive === false ? 'YOU (DEAD)' : 'YOU'}
                </span>
              ) : p.isAlive === false ? (
                <span style={{ fontSize: 12 }}>💀</span>
              ) : isInspected ? (
                <span
                  style={{
                    fontSize: 8,
                    background: 'rgba(255, 215, 0, 0.25)',
                    border: '1px solid #ffd700',
                    color: '#ffd700',
                    padding: '2px 5px',
                    borderRadius: 4,
                    fontWeight: 800,
                  }}
                >
                  VIEWING
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
