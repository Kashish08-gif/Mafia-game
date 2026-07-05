/**
 * CasinoMap.jsx
 * Thin wrapper around the modular CasinoScene.
 *
 * Maintains the same API as before:
 *   <CasinoMap phase="DAY" />
 *   <CasinoMap phase="NIGHT" />
 *
 * Also re-exports BUILDINGS and FOUNTAIN_POS for GameMapPage
 * (used by CharacterController collision + MiniMap).
 */

import CasinoScene from '../maps/Casino/CasinoScene';

// Re-export constants so GameMapPage can keep using:
//   import CasinoMap, { BUILDINGS, FOUNTAIN_POS } from '../components/CasinoMap.jsx'
export { BUILDINGS, FOUNTAIN_POS } from '../maps/Casino/CasinoScene';

export default function CasinoMap({ phase = 'DAY' }) {
  return <CasinoScene phase={phase} />;
}
