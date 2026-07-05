/**
 * CasinoScene.jsx
 * Main Casino scene assembler.
 * Composes: ground, CasinoLights, CasinoEnvironment (GLBs), SpawnPoints.
 *
 * Re-exports BUILDINGS and FOUNTAIN_POS for backward compatibility
 * with GameMapPage.jsx (collision detection, MiniMap, etc.)
 */

import { useMemo } from 'react';
import { Suspense } from 'react';
import CasinoLights from './CasinoLights';
import CasinoEnvironment from './CasinoEnvironment';
import SpawnPoints, { BUILDINGS as SP_BUILDINGS, FOUNTAIN_POS as SP_FOUNTAIN } from './SpawnPoints';

// Re-export for GameMapPage compatibility
export const BUILDINGS   = SP_BUILDINGS;
export const FOUNTAIN_POS = SP_FOUNTAIN;

// ── GLB loading fallback ─────────────────────────────────────────
function GLBLoadingFallback() {
  return (
    <mesh position={[0, 1, -38]}>
      <boxGeometry args={[40, 2, 30]} />
      <meshStandardMaterial color="#09091f" opacity={0.5} transparent />
    </mesh>
  );
}

// ── Luxury ground plane with gold grid ──────────────────────────
function CasinoGround({ isNight }) {
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = -52; i <= 52; i += 14) {
      lines.push(
        { pos: [i, 0.003, 0],  rot: [0, 0, 0],           size: [0.1, 110] },
        { pos: [0, 0.003, i],  rot: [0, Math.PI / 2, 0],  size: [0.1, 110] },
      );
    }
    return lines;
  }, []);

  return (
    <group>
      {/* Base carpet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[110, 110]} />
        <meshStandardMaterial
          color={isNight ? '#1a0628' : '#2e0735'}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Gold grid overlay */}
      {gridLines.map((l, i) => (
        <mesh key={i} position={l.pos} rotation={l.rot} receiveShadow>
          <planeGeometry args={l.size} />
          <meshStandardMaterial
            color="#b8860b"
            roughness={0.35}
            metalness={0.92}
            emissive={isNight ? '#7a5800' : '#2a1a00'}
            emissiveIntensity={isNight ? 0.5 : 0.2}
          />
        </mesh>
      ))}

      {/* Main road cross — N/S */}
      <mesh position={[0, 0.009, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 110]} />
        <meshStandardMaterial color="#1a1710" roughness={0.3} metalness={0.05} />
      </mesh>
      {/* Main road cross — E/W */}
      <mesh position={[0, 0.009, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[6, 110]} />
        <meshStandardMaterial color="#1a1710" roughness={0.3} metalness={0.05} />
      </mesh>

      {/* Centre gold road stripe — N/S */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.14, 110]} />
        <meshStandardMaterial color="#ffd700" emissive="#b8860b" emissiveIntensity={isNight ? 1.5 : 0.6} />
      </mesh>
      {/* Centre gold road stripe — E/W */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[0.14, 110]} />
        <meshStandardMaterial color="#ffd700" emissive="#b8860b" emissiveIntensity={isNight ? 1.5 : 0.6} />
      </mesh>

      {/* Outer boundary gold trim */}
      {[
        { pos: [0,  0.02, -55], rot: [0, 0, 0],           size: [110, 0.18, 0.4] },
        { pos: [0,  0.02,  55], rot: [0, 0, 0],           size: [110, 0.18, 0.4] },
        { pos: [-55, 0.02, 0],  rot: [0, Math.PI / 2, 0], size: [110, 0.18, 0.4] },
        { pos: [ 55, 0.02, 0],  rot: [0, Math.PI / 2, 0], size: [110, 0.18, 0.4] },
      ].map((b, i) => (
        <mesh key={i} position={b.pos} rotation={b.rot}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={0.95}
            emissive="#ffd700"
            emissiveIntensity={isNight ? 2.0 : 0.8}
          />
        </mesh>
      ))}

      {/* VIP red carpets at entrances */}
      {/* Casino main entrance */}
      <mesh position={[0, 0.015, -18]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 12]} />
        <meshStandardMaterial color="#7a0012" roughness={0.88} />
      </mesh>
      {/* Gold stanchion borders on carpet */}
      <mesh position={[-2.6, 0.02, -18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, 12]} />
        <meshStandardMaterial color="#e5c158" metalness={0.92} roughness={0.1} />
      </mesh>
      <mesh position={[ 2.6, 0.02, -18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, 12]} />
        <meshStandardMaterial color="#e5c158" metalness={0.92} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────
export default function CasinoScene({ phase = 'DAY' }) {
  const isNight = phase === 'NIGHT';

  return (
    <group>
      {/* Lighting */}
      <CasinoLights phase={phase} />

      {/* Ground */}
      <CasinoGround isNight={isNight} />

      {/* All GLB Props — wrapped in Suspense for streaming */}
      <Suspense fallback={<GLBLoadingFallback />}>
        <CasinoEnvironment />
      </Suspense>

      {/* Spawn point markers (debug=false keeps them invisible in production) */}
      <SpawnPoints debug={false} />
    </group>
  );
}
