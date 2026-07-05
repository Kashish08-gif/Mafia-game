/**
 * MiniMap.jsx
 * Top-right HUD mini-map overlay.
 * Renders building footprints, discussion fountain location, remote players,
 * and the local player's position on a stylized 2D map overlay.
 *
 * Props:
 *   myPos      — [x, y, z] position of local player
 *   players    — array of remote players
 *   myColor    — color string for the local player's dot
 *   buildings  — array of buildings to render outlines for
 *   fountainPos — [x, z] coordinates of center fountain
 */

export default function MiniMap({
  myPos,
  players = [],
  myColor = '#ffd700',
  buildings = [],
  fountainPos = [0, 0],
}) {
  const W = 180;
  const H = 140;

  // Map world coordinate range [-45, 45] to UI pixel bounds [0, W] & [0, H]
  const worldToMap = (x, z) => ({
    left: ((x + 45) / 90) * W,
    top: ((z + 45) / 90) * H,
  });

  return (
    <div
      data-testid="mini-map"
      style={{
        width: W,
        height: H,
        position: 'relative',
        background:
          'radial-gradient(ellipse at center, rgba(50,30,40,0.85), rgba(10,5,15,0.95))',
        border: '1.5px solid rgba(255,180,80,0.4)',
        borderRadius: 90,
        overflow: 'hidden',
        boxShadow: '0 0 16px rgba(0,0,0,0.6)',
      }}
    >
      {/* Building Outlines */}
      {buildings.map((b) => {
        const { left, top } = worldToMap(b.pos[0], b.pos[1]);
        const [w, , d] = b.size;
        return (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: left - ((w / 90) * W) / 2,
              top: top - ((d / 90) * H) / 2,
              width: (w / 90) * W,
              height: (d / 90) * H,
              background: 'rgba(120,80,60,0.55)',
              border: `1px solid ${b.neon}77`,
              fontSize: 7,
              color: '#fff',
              textAlign: 'center',
              lineHeight: '8px',
              paddingTop: 2,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {b.label.split(' ')[0]}
          </div>
        );
      })}

      {/* Center Fountain Indicator */}
      <div
        style={{
          position: 'absolute',
          left: worldToMap(fountainPos[0], fountainPos[1]).left - 5,
          top: worldToMap(fountainPos[0], fountainPos[1]).top - 5,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#ffd700',
          boxShadow: '0 0 8px #ffd700',
        }}
      />

      {/* Remote Players Dots */}
      {players.map((p) => {
        const { left, top } = worldToMap(
          p.position?.x || 0,
          p.position?.z || 0
        );
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: left - 3,
              top: top - 3,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: p.color || '#fff',
              boxShadow: `0 0 4px ${p.color || '#fff'}`,
            }}
          />
        );
      })}

      {/* Local Player Dot (Arrow / Circle indicator) */}
      {(() => {
        const { left, top } = worldToMap(myPos[0], myPos[2]);
        return (
          <div
            style={{
              position: 'absolute',
              left: left - 6,
              top: top - 6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: myColor,
              border: '2px solid #fff',
              boxShadow: `0 0 8px ${myColor}`,
            }}
          />
        );
      })()}
    </div>
  );
}
