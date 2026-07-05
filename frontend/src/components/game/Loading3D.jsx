/**
 * Loading3D.jsx
 * Suspense fallback shown while GLB assets stream in.
 * Renders a subtle glowing ring indicator in the 3D scene.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function Loading3D() {
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.elapsedTime * 1.8;
      ringRef.current.rotation.x = clock.elapsedTime * 0.9;
    }
  });

  return (
    <group position={[0, 1.5, -10]}>
      {/* Spinning ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.2, 0.06, 8, 40]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={3}
        />
      </mesh>

      {/* Inner ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.7, 0.04, 8, 32]} />
        <meshStandardMaterial
          color="#00e5ff"
          emissive="#00e5ff"
          emissiveIntensity={3}
        />
      </mesh>

      {/* HTML overlay label */}
      <Html center position={[0, 2.4, 0]} distanceFactor={8}>
        <div
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#ffd700',
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            background: 'rgba(0,0,0,0.75)',
            padding: '6px 16px',
            borderRadius: '8px',
            border: '1px solid #ffd70044',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          Loading Casino…
        </div>
      </Html>
    </group>
  );
}
