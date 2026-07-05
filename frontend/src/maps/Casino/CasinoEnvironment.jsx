/**
 * CasinoEnvironment.jsx
 * Loads and positions ALL GLB assets for the Casino map.
 * Optimized to cache and memoize clones to prevent runtime lag.
 */

import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

// ── GLB path helpers ────────────────────────────────────────────
const CASINO_PATH  = (name) => `/models/casino/${name}`;
const ENV_PATH     = (name) => `/models/environment/${name}`;

// ── Preload all GLBs immediately so streaming starts early ───────
useGLTF.preload(CASINO_PATH('grand_casino.glb'));
useGLTF.preload(CASINO_PATH('bar.glb'));
useGLTF.preload(CASINO_PATH('black_jack_table.glb'));
useGLTF.preload(CASINO_PATH('casion_slot-machine.glb'));
useGLTF.preload(CASINO_PATH('fountain_water_simulation.glb'));
useGLTF.preload(CASINO_PATH('plant_series__palm_tree.glb'));
useGLTF.preload(CASINO_PATH('table_sofa.glb'));
useGLTF.preload(ENV_PATH('street_lamp.glb'));
useGLTF.preload(ENV_PATH('wooden_bench.glb'));
useGLTF.preload(ENV_PATH('realistic_hd_yellow_yellow_bush_lupine_1625.glb')); // Fallback
useGLTF.preload(ENV_PATH('realistic_hd_yellow_bush_lupine_1625.glb'));

// ─────────────────────────────────────────────────────────────────
// Individual GLB components (Optimized to memoize clones)
// ─────────────────────────────────────────────────────────────────

/** Main Casino Building — grand_casino.glb (290 MB, used as-is) */
function GrandCasinoBuilding() {
  const { scene } = useGLTF(CASINO_PATH('grand_casino.glb'));

  const processedScene = useMemo(() => {
    // Only traverse once per load
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return scene;
  }, [scene]);

  return (
    <primitive
      object={processedScene}
      position={[0, 0, -38]}
      scale={[1, 1, 1]}
      rotation={[0, 0, 0]}
    />
  );
}

/** VIP Bar */
function BarModel() {
  const { scene } = useGLTF(CASINO_PATH('bar.glb'));

  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      position={[-32, 0, 32]}
      scale={[1, 1, 1]}
      rotation={[0, Math.PI, 0]}
    />
  );
}

/** Blackjack Table — spawned multiple times */
function BlackjackTable({ position, rotation = 0 }) {
  const { scene } = useGLTF(CASINO_PATH('black_jack_table.glb'));

  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={[1, 1, 1]}
      rotation={[0, rotation, 0]}
    />
  );
}

/** Slot Machine — spawned multiple times */
function SlotMachine({ position, rotation = 0 }) {
  const { scene } = useGLTF(CASINO_PATH('casion_slot-machine.glb'));

  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={[1, 1, 1]}
      rotation={[0, rotation, 0]}
    />
  );
}

/** Central Fountain */
function FountainWater() {
  const { scene } = useGLTF(CASINO_PATH('fountain_water_simulation.glb'));

  const processedScene = useMemo(() => {
    scene.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    return scene;
  }, [scene]);

  return (
    <primitive
      object={processedScene}
      position={[0, 0, 0]}
      scale={[1, 1, 1]}
    />
  );
}

/** Palm Tree — spawned multiple times */
function PalmTreeModel({ position, rotation = 0, scale = 1 }) {
  const { scene } = useGLTF(CASINO_PATH('plant_series__palm_tree.glb'));

  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={[scale, scale, scale]}
      rotation={[0, rotation, 0]}
    />
  );
}

/** Sofa / Lounge Table */
function TableSofa({ position, rotation = 0 }) {
  const { scene } = useGLTF(CASINO_PATH('table_sofa.glb'));

  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={[1, 1, 1]}
      rotation={[0, rotation, 0]}
    />
  );
}


/** Street Lamp */
function StreetLampModel({ position, rotation = 0 }) {
  const { scene } = useGLTF(ENV_PATH('street_lamp.glb'));

  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={[1, 1, 1]}
      rotation={[0, rotation, 0]}
    />
  );
}

/** Wooden Bench */
function WoodenBench({ position, rotation = 0 }) {
  const { scene } = useGLTF(ENV_PATH('wooden_bench.glb'));

  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={[1, 1, 1]}
      rotation={[0, rotation, 0]}
    />
  );
}

/** Bush / Lupine decoration */
function BushLupine({ position, scale = 1, rotation = 0 }) {
  const { scene } = useGLTF(ENV_PATH('realistic_hd_yellow_bush_lupine_1625.glb'));

  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={[scale, scale, scale]}
      rotation={[0, rotation, 0]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN ENVIRONMENT — assembles all GLB props in world space
// ─────────────────────────────────────────────────────────────────
export default function CasinoEnvironment() {
  return (
    <group>
      {/* ── Main Casino Building ── */}
      <GrandCasinoBuilding />

      {/* ── VIP Bar (south-west wing) ── */}
      <BarModel />

      {/* ── Central Fountain ── */}
      <FountainWater />



      {/* ── Blackjack Tables — inside main casino approach ── */}
      <BlackjackTable position={[-8, 0, -10]}  rotation={0} />
      <BlackjackTable position={[ 8, 0, -10]}  rotation={0} />
      <BlackjackTable position={[-8, 0,  10]}  rotation={Math.PI} />
      <BlackjackTable position={[ 8, 0,  10]}  rotation={Math.PI} />

      {/* ── Slot Machines — east corridor ── */}
      <SlotMachine position={[14, 0, -4]}  rotation={-Math.PI / 2} />
      <SlotMachine position={[14, 0,  0]}  rotation={-Math.PI / 2} />
      <SlotMachine position={[14, 0,  4]}  rotation={-Math.PI / 2} />
      {/* West corridor */}
      <SlotMachine position={[-14, 0, -4]} rotation={Math.PI / 2} />
      <SlotMachine position={[-14, 0,  0]} rotation={Math.PI / 2} />
      <SlotMachine position={[-14, 0,  4]} rotation={Math.PI / 2} />

      {/* ── Sofa & Lounge Sets ── */}
      <TableSofa position={[-25, 0, 18]} rotation={Math.PI / 4} />
      <TableSofa position={[-25, 0, 12]} rotation={-Math.PI / 4} />
      <TableSofa position={[ 25, 0, 18]} rotation={Math.PI / 2} />
      <TableSofa position={[ 25, 0, 12]} rotation={-Math.PI / 2} />

      {/* ── Palm Trees (Decorations around map bounds) ── */}
      <PalmTreeModel position={[-38, 0, -38]} scale={1.2} />
      <PalmTreeModel position={[ 38, 0, -38]} scale={1.2} />
      <PalmTreeModel position={[-38, 0,  38]} scale={1.2} />
      <PalmTreeModel position={[ 38, 0,  38]} scale={1.2} />
      {/* Promenade trees */}
      <PalmTreeModel position={[-15, 0, -26]} rotation={1.2} />
      <PalmTreeModel position={[ 15, 0, -26]} rotation={-0.8} />
      <PalmTreeModel position={[-15, 0,  26]} rotation={0.5} />
      <PalmTreeModel position={[ 15, 0,  26]} rotation={-1.5} />

      {/* ── Street Lamps ── */}
      <StreetLampModel position={[-18, 0, -20]} />
      <StreetLampModel position={[ 18, 0, -20]} />
      <StreetLampModel position={[-18, 0,  20]} />
      <StreetLampModel position={[ 18, 0,  20]} />
      <StreetLampModel position={[-20, 0, -10]} rotation={Math.PI / 2} />
      <StreetLampModel position={[ 20, 0, -10]} rotation={-Math.PI / 2} />

      {/* ── Benches ── */}
      <WoodenBench position={[-2, 0, -6]} rotation={0} />
      <WoodenBench position={[ 2, 0, -6]} rotation={0} />
      <WoodenBench position={[-2, 0,  6]} rotation={Math.PI} />
      <WoodenBench position={[ 2, 0,  6]} rotation={Math.PI} />

      {/* ── Yellow Bush / Lupine Decorations ── */}
      <BushLupine position={[-5, 0, -7]} scale={1.0} />
      <BushLupine position={[ 5, 0, -7]} scale={1.0} />
      <BushLupine position={[-5, 0,  7]} scale={1.0} />
      <BushLupine position={[ 5, 0,  7]} scale={1.0} />
      <BushLupine position={[-30, 0, 25]} scale={1.3} rotation={Math.PI / 3} />
      <BushLupine position={[ 30, 0, 25]} scale={1.3} rotation={-Math.PI / 3} />
    </group>
  );
}
