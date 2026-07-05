/**
 * Ground.jsx
 * Scene ground bridge — delegates to CasinoScene's ground system.
 * CasinoScene renders its own luxury carpet + gold grid ground, so
 * this component intentionally returns null to avoid double-ground.
 *
 * If a different map is loaded, replace this with the map-specific ground.
 * Keeping this file ensures GameScene.jsx always has a <Ground /> slot
 * to fill without restructuring the scene tree.
 */

export default function Ground({ phase }) {
  // Casino map renders its own ground inside CasinoScene.
  // This component acts as a placeholder for non-casino maps.
  return null;
}
