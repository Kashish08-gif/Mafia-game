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
function CasinoGround() {
  return null;
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

      {/* Ground (offset slightly down to prevent z-fighting with the GLB floor) */}
      <group position={[0, -0.05, 0]}>
        <CasinoGround isNight={isNight} />
      </group>

      {/* All GLB Props — wrapped in Suspense for streaming */}
      <Suspense fallback={<GLBLoadingFallback />}>
        <CasinoEnvironment />
      </Suspense>

      {/* Spawn point markers (debug=false keeps them invisible in production) */}
      <SpawnPoints debug={false} />
    </group>
  );
}
