/**
 * Lighting.jsx
 * Scene lighting bridge — delegates to CasinoLights (which has the full
 * DAY / NIGHT neon + directional + searchlight system).
 *
 * Keeping this file so GameScene.jsx can import lighting independently,
 * making it easy to swap lighting systems for different maps.
 */

import CasinoLights from '../../maps/Casino/CasinoLights';

export default function Lighting({ phase = 'DAY' }) {
  return <CasinoLights phase={phase} />;
}
