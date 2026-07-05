/**
 * PlayerAvatar.jsx
 * 3D avatar for each player using the GLB character model:
 *   /models/characters/casual_male-architectural_updated.glb
 *
 * Features:
 * - GLB character model with shadow casting
 * - Walking bounce animation (applied to whole group)
 * - Idle breathing animation
 * - Floating username label above head
 * - Role badge (only shown to the local player)
 * - Ghost / transparent effect when dead
 * - Halo ring above dead players
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';

// Preload character GLB immediately
useGLTF.preload('/models/characters/casual_male-architectural_updated.glb');

// ── Character GLB component ─────────────────────────────────────
function CharacterModel({ color, isAlive }) {
  const { scene } = useGLTF('/models/characters/casual_male-architectural_updated.glb');

  // Clone the scene only when the loaded scene changes
  const clonedScene = useMemo(() => {
    return scene.clone();
  }, [scene]);

  // Apply shadows and color tinting on dependency changes
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          // Clone material so different player instances don't share it
          child.material = child.material.clone();
          if (!isAlive) {
            child.material.transparent = true;
            child.material.opacity = 0.35;
          }
        }
      }
    });
  }, [clonedScene, isAlive, color]);

  return (
    <primitive
      object={clonedScene}
      scale={[1, 1, 1]}
      rotation={[0, Math.PI, 0]}
    />
  );
}

// ── Main PlayerAvatar export ────────────────────────────────────
export default function PlayerAvatar({
  position = [0, 0, 0],
  rotation = 0,
  color = '#ffffff',
  name = 'Player',
  role = '',
  isMe = false,
  isAlive = true,
  walking = false,
}) {
  const groupRef  = useRef();
  const bodyRef   = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      groupRef.current.rotation.y = rotation;
    }

    if (bodyRef.current) {
      if (walking) {
        // Subtle walking bob
        bodyRef.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 10)) * 0.08;
      } else {
        // Idle breathing
        bodyRef.current.position.y = Math.sin(clock.elapsedTime * 1.8) * 0.015;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Character body with walking animation */}
      <group ref={bodyRef}>
        <CharacterModel color={color} isAlive={isAlive} />

        {/* Dead player halo ring */}
        {!isAlive && (
          <mesh position={[0, 2.4, 0]}>
            <torusGeometry args={[0.22, 0.035, 8, 24]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={2.0}
            />
          </mesh>
        )}

        {/* Colour indicator ring at feet — shows player colour */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.38, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isMe ? 2.5 : 1.2}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Local player highlight glow */}
        {isMe && (
          <pointLight
            position={[0, 1, 0]}
            color={color}
            intensity={1.8}
            distance={4}
            decay={2}
          />
        )}
      </group>

      {/* ── Floating name tag ── */}
      <Html position={[0, 2.6, 0]} center distanceFactor={10}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Role badge — only visible to me */}
          {role && isMe && (
            <span
              style={{
                background:
                  role === 'mafia'   ? '#ff3344' :
                  role === 'police'  ? '#4488ff' :
                  role === 'doctor'  ? '#44cc88' : '#777777',
                color: '#fff',
                fontSize: '8px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                marginBottom: '3px',
                letterSpacing: '0.08em',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                textTransform: 'uppercase',
              }}
            >
              {role}
            </span>
          )}

          {/* Username tag */}
          <span
            style={{
              background: 'rgba(0,0,0,0.78)',
              color: isAlive ? '#ffffff' : '#aaaaaa',
              border: isMe ? `1.5px solid ${color}` : '1px solid rgba(255,255,255,0.18)',
              padding: '3px 9px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 700,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              boxShadow: isMe
                ? `0 0 8px ${color}66, 0 4px 6px rgba(0,0,0,0.4)`
                : '0 4px 6px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {!isAlive && '👻 '}
            {name}
            {isMe && ' (You)'}
          </span>
        </div>
      </Html>
    </group>
  );
}
