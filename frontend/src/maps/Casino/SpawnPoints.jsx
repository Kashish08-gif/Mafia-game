/**
 * SpawnPoints.jsx
 * Defines player spawn points across the Casino map.
 * Also exports FOUNTAIN_POS and BUILDINGS for use in GameMapPage / MiniMap.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// ── World constants ─────────────────────────────────────────────
export const FOUNTAIN_POS = [0, 0]; // [x, z] in world space

/**
 * BUILDINGS — used by CharacterController for collision detection
 * and by MiniMap for rendering building outlines.
 * pos: [x, z], size: [width, height, depth]
 */
export const BUILDINGS = [
  { id: 'casino',  label: 'ROYALE CASINO', pos: [  0, -38], size: [40, 18, 30], color: '#09091f', neon: '#ffd700' },
  { id: 'bank',    label: 'GOLD BANK',     pos: [-32, -32], size: [14,  7, 12], color: '#05180f', neon: '#00ff88' },
  { id: 'police',  label: 'SHERIFF HQ',    pos: [ 32, -32], size: [14,  7, 12], color: '#050c21', neon: '#2277ff' },
  { id: 'bar',     label: 'VIP BAR',       pos: [-32,  32], size: [14,  6, 12], color: '#3a0f08', neon: '#ff4400' },
  { id: 'house',   label: 'LOUNGE',        pos: [ 32,  32], size: [12,  5, 12], color: '#180518', neon: '#cc22ff' },
  { id: 'garden',  label: 'COURTYARD',     pos: [  0,  40], size: [18,  0.2, 14], color: '#0c260f', neon: '#11ff55' },
  { id: 'helipad', label: 'VIP PAD',       pos: [ 42,   0], size: [12,  0.3, 12], color: '#161616', neon: '#ff2244' },
];

/**
 * SPAWN_POINTS — starting positions for players.
 * Spread around the fountain and entrance area.
 */
export const SPAWN_POINTS = [
  [  2, 0,  8 ],
  [ -2, 0,  8 ],
  [  4, 0,  6 ],
  [ -4, 0,  6 ],
  [  6, 0,  4 ],
  [ -6, 0,  4 ],
  [  3, 0, 10 ],
  [ -3, 0, 10 ],
  [  8, 0,  2 ],
  [ -8, 0,  2 ],
];

/**
 * Returns a spawn position by player index (wraps around).
 */
export function getSpawnPosition(index = 0) {
  return SPAWN_POINTS[index % SPAWN_POINTS.length];
}

// ── Debug: glowing spawn markers (only shown in dev mode) ───────
function SpawnMarker({ position }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 0.05 + Math.sin(clock.elapsedTime * 3 + position[0]) * 0.05;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <cylinderGeometry args={[0.25, 0.25, 0.04, 16]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={2.5}
          transparent
          opacity={0.75}
        />
      </mesh>
      <pointLight color="#00ffcc" intensity={0.8} distance={3} decay={2} />
    </group>
  );
}

/**
 * SpawnPoints component — renders visual markers for spawn positions.
 * Set `debug={true}` to see them in-game.
 */
export default function SpawnPoints({ debug = false }) {
  if (!debug) return null;

  return (
    <group>
      {SPAWN_POINTS.map((pos, i) => (
        <SpawnMarker key={i} position={pos} />
      ))}
    </group>
  );
}
