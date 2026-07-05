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
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ── Static Geometries declared once globally to avoid recreation/disposal leaks ──
const TORSO_GEOMETRY = new THREE.CylinderGeometry(0.38, 0.28, 1.0, 16);
const SHIRT_GEOMETRY = new THREE.BoxGeometry(0.18, 0.2, 0.18);
const TIE_GEOMETRY = new THREE.BoxGeometry(0.06, 0.35, 0.02);
const ARM_GEOMETRY = new THREE.CylinderGeometry(0.11, 0.09, 0.75, 12);
const HEAD_GEOMETRY = new THREE.SphereGeometry(0.26, 16, 16);
const SHADES_LENS_GEOMETRY = new THREE.BoxGeometry(0.11, 0.06, 0.02);
const SHADES_BRIDGE_GEOMETRY = new THREE.BoxGeometry(0.08, 0.02, 0.02);
const FEDORA_BRIM_GEOMETRY = new THREE.CylinderGeometry(0.46, 0.46, 0.02, 24);
const FEDORA_BAND_GEOMETRY = new THREE.CylinderGeometry(0.27, 0.28, 0.05, 20);
const FEDORA_CROWN_GEOMETRY = new THREE.CylinderGeometry(0.24, 0.26, 0.18, 20);
const LEG_GEOMETRY = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 12);
const SHOE_GEOMETRY = new THREE.BoxGeometry(0.13, 0.1, 0.22);

// ── Character Procedural model (No GLB, pure Three.js primitive shapes) ───────────────────
function CharacterModel({ color, isAlive }) {
  // Determine materials based on alive status and cache them
  const materials = useMemo(() => {
    const isGhost = !isAlive;
    return {
      suit: new THREE.MeshStandardMaterial({
        color: isGhost ? '#5c6d7a' : '#111115', // black suit / grey ghost
        roughness: 0.8,
        metalness: 0.1,
        transparent: isGhost,
        opacity: isGhost ? 0.35 : 1.0,
      }),
      shirt: new THREE.MeshStandardMaterial({
        color: isGhost ? '#8ca0ba' : '#ffffff', // white shirt / light blue ghost
        roughness: 0.9,
        metalness: 0.0,
        transparent: isGhost,
        opacity: isGhost ? 0.35 : 1.0,
      }),
      tie: new THREE.MeshStandardMaterial({
        color: isGhost ? '#4a5b6e' : color || '#ff3344', // player tie color / dark blue ghost
        roughness: 0.5,
        metalness: 0.2,
        transparent: isGhost,
        opacity: isGhost ? 0.35 : 1.0,
      }),
      skin: new THREE.MeshStandardMaterial({
        color: isGhost ? '#aabed6' : '#e0b59b', // skin tone / cyan ghost
        roughness: 0.6,
        metalness: 0.0,
        transparent: isGhost,
        opacity: isGhost ? 0.35 : 1.0,
      }),
      hat: new THREE.MeshStandardMaterial({
        color: isGhost ? '#43515e' : '#1e1e24', // black fedora / dark ghost
        roughness: 0.8,
        metalness: 0.05,
        transparent: isGhost,
        opacity: isGhost ? 0.35 : 1.0,
      }),
      hatBand: new THREE.MeshStandardMaterial({
        color: isGhost ? '#4a5b6e' : color || '#ffd700', // player colored band / blue ghost
        roughness: 0.5,
        metalness: 0.4,
        transparent: isGhost,
        opacity: isGhost ? 0.35 : 1.0,
      }),
      shades: new THREE.MeshStandardMaterial({
        color: isGhost ? '#2b353f' : '#0a0a0d', // dark shades
        roughness: 0.1,
        metalness: 0.9,
        transparent: isGhost || !isGhost,
        opacity: isGhost ? 0.3 : 0.95,
      })
    };
  }, [color, isAlive]);

  // Clean up materials on dependency change or unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      Object.values(materials).forEach(mat => mat.dispose());
    };
  }, [materials]);

  return (
    <group>
      {/* ── Torso (Suit Jacket) ── */}
      <mesh castShadow receiveShadow position={[0, 1.0, 0]} geometry={TORSO_GEOMETRY} material={materials.suit} />

      {/* ── Shirt V-neck detail ── */}
      <mesh castShadow position={[0, 1.35, 0.2]} geometry={SHIRT_GEOMETRY} material={materials.shirt} />

      {/* ── Tie ── */}
      <mesh castShadow position={[0, 1.15, 0.3]} geometry={TIE_GEOMETRY} material={materials.tie} />

      {/* ── Left Arm ── */}
      <mesh castShadow position={[-0.48, 1.0, 0]} rotation={[0, 0, 0.15]} geometry={ARM_GEOMETRY} material={materials.suit} />

      {/* ── Right Arm ── */}
      <mesh castShadow position={[0.48, 1.0, 0]} rotation={[0, 0, -0.15]} geometry={ARM_GEOMETRY} material={materials.suit} />

      {/* ── Head ── */}
      <mesh castShadow position={[0, 1.76, 0]} geometry={HEAD_GEOMETRY} material={materials.skin} />

      {/* ── Shades/Sunglasses ── */}
      <group position={[0, 1.8, 0.16]}>
        {/* Left lens */}
        <mesh castShadow position={[-0.09, 0, 0.08]} geometry={SHADES_LENS_GEOMETRY} material={materials.shades} />
        {/* Right lens */}
        <mesh castShadow position={[0.09, 0, 0.08]} geometry={SHADES_LENS_GEOMETRY} material={materials.shades} />
        {/* Bridge */}
        <mesh castShadow position={[0, 0.01, 0.08]} geometry={SHADES_BRIDGE_GEOMETRY} material={materials.shades} />
      </group>

      {/* ── Fedora Hat ── */}
      {/* Brim */}
      <mesh castShadow position={[0, 1.98, 0]} rotation={[0.05, 0, 0]} geometry={FEDORA_BRIM_GEOMETRY} material={materials.hat} />
      {/* Ribbon / Band */}
      <mesh castShadow position={[0, 2.06, 0]} rotation={[0.05, 0, 0]} geometry={FEDORA_BAND_GEOMETRY} material={materials.hatBand} />
      {/* Crown */}
      <mesh castShadow position={[0, 2.15, -0.01]} rotation={[0.05, 0, 0]} geometry={FEDORA_CROWN_GEOMETRY} material={materials.hat} />

      {/* ── Left Leg ── */}
      <mesh castShadow position={[-0.16, 0.35, 0]} geometry={LEG_GEOMETRY} material={materials.suit} />

      {/* ── Right Leg ── */}
      <mesh castShadow position={[0.16, 0.35, 0]} geometry={LEG_GEOMETRY} material={materials.suit} />

      {/* ── Left Shoe ── */}
      <mesh castShadow position={[-0.16, 0.06, 0.08]} geometry={SHOE_GEOMETRY} material={materials.suit} />

      {/* ── Right Shoe ── */}
      <mesh castShadow position={[0.16, 0.06, 0.08]} geometry={SHOE_GEOMETRY} material={materials.suit} />
    </group>
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
