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
  const W = 260;
  const H = 260;

  // Map world coordinate range [-45, 45] to UI pixel bounds [0, W] & [0, H]
const WORLD_SIZE = 80;

const worldToMap = (x, z) => ({
  left: ((x + WORLD_SIZE) / (WORLD_SIZE * 2)) * W,
  top: ((z + WORLD_SIZE) / (WORLD_SIZE * 2)) * H,
});
  const locations = [
    { name: "COURTYARD", x: 0, z: 0 },
    { name: "VIP", x: -20, z: 0 },
    { name: "LOUNGE", x: 22, z: 10 },
    { name: "KITCHEN", x: -30, z: 20 },
    { name: "LIBRARY", x: -30, z: -20 },
    { name: "STORAGE", x: 28, z: -18 },
    { name: "BASEMENT", x: 0, z: 30 },
    { name: "GARDEN", x: 0, z: -30 },
  ];

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
        borderRadius: "50%",
        overflow: 'hidden',
        boxShadow: '0 0 16px rgba(0,0,0,0.6)',
      }}
    >
     <div
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background:
          "conic-gradient(from 0deg, rgba(0,255,0,.25), transparent 40%)",
        animation: "spin 4s linear infinite",
      }}
    />
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
      {locations.map((room) => {
        const { left, top } = worldToMap(room.x, room.z);

        return (
          <div
            key={room.name}
            style={{
              position: "absolute",
              left,
              top,
              transform: "translate(-50%, -50%)",
              color: "#ffffff",
              fontSize: 9,
              fontWeight: 700,
              textShadow: "0 0 5px black",
              pointerEvents: "none",
            }}
          >
            {room.name}
          </div>
        );
      })}

      {/* Remote Players Dots */}
      {/* Remote Players */}
      {players.map((p) => {
        const { left, top } = worldToMap(
          p.position?.x || 0,
          p.position?.z || 0
        );

        return (
          <div key={p.id}>
            <div
              style={{
                position: "absolute",
                left: left - 4,
                top: top - 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.color || "#00ff00",
                boxShadow: `0 0 8px ${p.color || "#00ff00"}`
              }}
            />

            <div
              style={{
                position: "absolute",
                left: left + 8,
                top: top - 8,
                color: "white",
                fontSize: 8,
                fontWeight: "bold",
                textShadow: "0 0 3px black",
              }}
            >
              {p.name}
            </div>
          </div>
        );
      })}

      {/* Local Player */}
      {(() => {
        const { left, top } = worldToMap(myPos[0], myPos[2]);

        return (
          <div
            style={{
              position: "absolute",
              left: left - 8,
              top: top - 8,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: myColor,
              border: "2px solid white",
              boxShadow: `0 0 10px ${myColor}`,
              animation: "pulse 1s infinite",
            }}
          />
        );
      })()}
    </div>
  );
}
