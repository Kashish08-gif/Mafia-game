/**
 * CasinoLights.jsx
 * All lighting for the Casino map — ambient, directional, neon point lights,
 * and animated searchlight beams. Supports DAY / NIGHT phase switching.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// ── Rotating sky searchlight beam ──────────────────────────────
function SkySearchlight({ position, color = '#ffffff', speed = 0.4 }) {
  const beamRef = useRef();

  useFrame(({ clock }) => {
    if (beamRef.current) {
      beamRef.current.rotation.y = clock.elapsedTime * speed;
      beamRef.current.rotation.x =
        Math.sin(clock.elapsedTime * 0.55) * 0.14 - 0.44;
    }
  });

  return (
    <group position={position}>
      {/* Base housing */}
      <mesh castShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.6, 8]} />
        <meshStandardMaterial color="#111" metalness={0.95} roughness={0.05} />
      </mesh>

      {/* Beam */}
      <group ref={beamRef}>
        <mesh position={[0, 14, 0]}>
          <coneGeometry args={[2.2, 28, 16, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.13}
            side={2} /* THREE.DoubleSide */
          />
        </mesh>
        <pointLight
          position={[0, 1, 0]}
          color={color}
          intensity={3.0}
          distance={22}
          decay={2}
        />
      </group>
    </group>
  );
}

// ── Main lighting export ────────────────────────────────────────
export default function CasinoLights({ phase = 'DAY' }) {
  const isNight = phase === 'NIGHT';

  return (
    <group>
      {/* ── Ambient ── */}
      <ambientLight
        intensity={isNight ? 0.04 : 1.8}
        color={isNight ? '#100b26' : '#fff5e6'}
      />

      {/* ── Primary directional (sun / moon) ── */}
      <directionalLight
        position={isNight ? [-30, 60, -20] : [25, 50, 15]}
        intensity={isNight ? 0.05 : 2.5}
        color={isNight ? '#3a2e7c' : '#ffe0b2'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />

      {/* ── Night moon fill ── */}
      {isNight && (
        <pointLight
          position={[-25, 70, -25]}
          color="#7c8cff"
          intensity={0.08}
          distance={80}
        />
      )}

      {/* ── Neon accent point lights (always on, dimmed and focused to avoid wash-out at night) ── */}
      {/* Gold entrance */}
      <pointLight
        position={[0, 4, -20]}
        color="#ffd700"
        intensity={isNight ? 1.5 : 2.0}
        distance={isNight ? 12 : 28}
        decay={2}
      />
      {/* Cyan fountain */}
      <pointLight
        position={[0, 3, 0]}
        color="#00e5ff"
        intensity={isNight ? 1.8 : 2.5}
        distance={isNight ? 12 : 20}
        decay={2}
      />
      {/* Red bar side */}
      <pointLight
        position={[-28, 5, 28]}
        color="#ff4400"
        intensity={isNight ? 1.2 : 1.5}
        distance={isNight ? 12 : 22}
        decay={2}
      />
      {/* Blue police wing */}
      <pointLight
        position={[28, 5, -28]}
        color="#2277ff"
        intensity={isNight ? 1.2 : 1.5}
        distance={isNight ? 12 : 22}
        decay={2}
      />
      {/* Green bank */}
      <pointLight
        position={[-28, 5, -28]}
        color="#00ff88"
        intensity={isNight ? 1.0 : 1.2}
        distance={isNight ? 12 : 22}
        decay={2}
      />
      {/* Purple lounge */}
      <pointLight
        position={[28, 5, 28]}
        color="#cc22ff"
        intensity={isNight ? 1.0 : 1.2}
        distance={isNight ? 12 : 22}
        decay={2}
      />

      {/* ── Casino entrance fill lights ── */}
      <pointLight position={[-6, 5, -24]} color="#ffd700" intensity={isNight ? 1.0 : 1.5} distance={isNight ? 10 : 16} decay={2} />
      <pointLight position={[ 6, 5, -24]} color="#ffd700" intensity={isNight ? 1.0 : 1.5} distance={isNight ? 10 : 16} decay={2} />

      {/* ── Rotating sky searchlights (night only, dimmed during day) ── */}
      <SkySearchlight
        position={[0, 22, -32]}
        color="#ffd700"
        speed={0.35}
      />
      <SkySearchlight
        position={[28, 14, -28]}
        color="#2277ff"
        speed={-0.42}
      />
      <SkySearchlight
        position={[-28, 12, 28]}
        color="#ff4400"
        speed={0.28}
      />

      {/* ── Night atmosphere fog ── */}
      {isNight && <fog attach="fog" args={['#04010a', 25, 90]} />}
    </group>
  );
}
