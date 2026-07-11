/**
 * GameScene.jsx
 * The 3D scene compositor — renders everything inside the R3F Canvas.
 */

import { Suspense, useState, useEffect, useRef } from 'react';
import { Environment, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import GameSky      from './Sky';
import Ground       from './Ground';
import Player       from './Player';
import PlayerAvatar from './PlayerAvatar';
import Loading3D    from './Loading3D';
import CasinoMap    from '../CasinoMap';

// ── HARDCODED discussion table position (green poker table with black chairs)
// Confirmed from in-game coords: player was at X:0.4 Z:6.7 when standing AT the green table.
// Table center is approximately [0, 0, 7].
export const DISCUSSION_TABLE_POS    = [0, 0, 7];
// Radius of chair ring around the table (used for sit detection)
export const DISCUSSION_TABLE_RADIUS = 5.5;
// Sit-detection radius from a chair
export const SIT_CHAIR_RADIUS        = 2.5;

// ── Generate hardcoded chair positions in a ring around the table ──
// The GLB casino is one baked mesh - we can't detect chairs by name.
// These positions are tuned to match the visible black chairs around the green poker table.
// Chair ring radius 2.1m, 8 chairs, starting from the south (facing player spawn direction).
function buildDiscussionChairs() {
  const [tx, , tz] = DISCUSSION_TABLE_POS;
  const R = 2.1;   // radius in world units — tuned to match visible chair positions
  const N = 8;
  const chairs = [];
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2;
    const cx = tx + Math.sin(angle) * R;
    const cz = tz + Math.cos(angle) * R;
    // yaw faces inward toward table center
    const yaw = Math.atan2(tx - cx, tz - cz);
    chairs.push({ id: `disc-chair-${i}`, name: `DiscChair${i}`, pos: [cx, 0, cz], yaw });
  }
  return chairs;
}
export const DISCUSSION_CHAIRS = buildDiscussionChairs();



// ── Bouncing Arrow pointing to discussion table ────────────────
function BouncingArrow({ center }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    // Rotate
    meshRef.current.rotation.y = t * 2.0;
    // Bounce
    meshRef.current.position.y = 2.8 + Math.sin(t * 3.5) * 0.35;
  });

  return (
    <group ref={meshRef}>
      {/* Shaft */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 12]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={3}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      {/* Tip */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.25, 0.4, 12]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

// ── Discussion Corner Table Overlay ──────────────────────────────
function DiscussionCorner({ phase }) {
  // Use the hardcoded table position — GLB has no semantic names
  const center = [DISCUSSION_TABLE_POS[0], 0.05, DISCUSSION_TABLE_POS[2]];
  // Publish to global window so Player.jsx can read it
  useEffect(() => {
    window.discussionTablePos    = DISCUSSION_TABLE_POS;
    window.discussionTableRadius = DISCUSSION_TABLE_RADIUS;
    // Always publish the hardcoded chairs — GLB nodes are all named "Material2/3/4"
    // so dynamic detection cannot find them. These synthetic positions match the
    // ring of black chairs visible around the green poker table.
    window.casinoChairs = DISCUSSION_CHAIRS;
  }, []);

  if (phase !== 'DAY') return null;

  return (
    <group position={[center[0], 0, center[2]]}>
      {/* Tight glowing ring ON the table surface (radius matches table top ~1.6m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[1.5, 1.65, 64]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={3.0}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Glowing dot at each hardcoded chair position to guide players */}
      {DISCUSSION_CHAIRS.map((chair) => (
        <mesh
          key={chair.id}
          position={[chair.pos[0] - center[0], 0.04, chair.pos[2] - center[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.22, 16]} />
          <meshStandardMaterial
            color="#ffd700"
            emissive="#ffd700"
            emissiveIntensity={4}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}

      {/* Rotating bouncing golden 3D pointer */}
      <BouncingArrow />

      {/* Floating badge above the discussion table */}
      <Html position={[0, 3.8, 0]} center distanceFactor={12}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(20,10,35,0.92) 0%, rgba(10,5,20,0.97) 100%)',
          border: '1.5px solid #ffd700',
          boxShadow: '0 0 15px rgba(255, 215, 0, 0.35)',
          color: '#ffd700',
          padding: '6px 14px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <span style={{ fontSize: '13px' }}>💬</span> DISCUSSION TABLE
        </div>
      </Html>
    </group>
  );
}

// ── Hover tooltip when standing near a chair ─────────────────────
function DiscussionInteractionZone({ myPos, phase, isSitting }) {
  const [nearestChair, setNearestChair] = useState(null);

  useEffect(() => {
    if (phase !== 'DAY' || isSitting) {
      setNearestChair(null);
      return;
    }

    const interval = setInterval(() => {
      const chairs = window.casinoChairs;
      const tablePos = window.discussionTablePos;
      const tableRadius = window.discussionTableRadius || 5.0;
      if (!chairs || chairs.length === 0) return;
      if (!tablePos) return;

      // Find nearest chair to player from discussion table chairs only
      const [px, , pz] = myPos;
      let nearest = null;
      let minDist  = Infinity;
      chairs.forEach((c) => {
        // Only consider chairs near the hardcoded discussion table
        const distToTable = Math.hypot(c.pos[0] - tablePos[0], c.pos[2] - tablePos[2]);
        if (distToTable > tableRadius) return;

        const d = Math.hypot(c.pos[0] - px, c.pos[2] - pz);
        if (d < minDist) { minDist = d; nearest = c; }
      });

      // Show tooltip when within 2.5 m
      if (nearest && minDist < 2.5) {
        setNearestChair(nearest);
      } else {
        setNearestChair(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [myPos, phase, isSitting]);

  if (!nearestChair) return null;

  return (
    <Html position={[nearestChair.pos[0], 0.9, nearestChair.pos[2]]} center distanceFactor={10}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.85)',
        border: '1.5px solid #ffd700',
        borderRadius: '8px',
        color: '#fff',
        padding: '5px 10px',
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: '0 0 10px rgba(255, 215, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        animation: 'sitTooltipPulse 1.5s ease-in-out infinite'
      }}>
        <span style={{
          background: '#ffd700',
          color: '#000',
          padding: '1px 5px',
          borderRadius: '3px',
          fontSize: '9px',
          fontWeight: '900'
        }}>E</span>
        <span>Press E or Click Interact to Sit</span>
        <style>{`
          @keyframes sitTooltipPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
      </div>
    </Html>
  );
}

export default function GameScene({
  myPos,
  setMyPos,
  myRot,
  setMyRot,
  myName,
  myColor,
  myRole,
  isAlive,
  players = [],
  phase = 'DAY',
  onMovingChange,
  buildings = [],
  isSitting = false,
  setIsSitting,
}) {
  const isNight = phase === 'NIGHT';

  return (
    <>
      {/* Sky / background */}
      <GameSky phase={phase} />

      {/* Dynamic Environment preset: only load during DAY to avoid night-time wash-out */}
      {!isNight && <Environment preset="city" background={false} />}

      {/* Dynamic ambient and directional lights representing Sun & Moon */}
      <ambientLight
        intensity={isNight ? 0.015 : 0.65}
        color={isNight ? '#16193b' : '#ffffff'}
      />
      <directionalLight
        castShadow
        position={[15, 25, 10]}
        intensity={isNight ? 0.02 : 1.3}
        color={isNight ? '#6877cc' : '#fff9e6'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={60}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Ground placeholder */}
      <Ground phase={phase} />

      {/* Casino map */}
      <Suspense fallback={<Loading3D />}>
        <CasinoMap phase={phase} />
      </Suspense>

      {/* Discussion Corner table glow & labels */}
      <DiscussionCorner phase={phase} />

      {/* Sitting interaction zones */}
      <DiscussionInteractionZone myPos={myPos} phase={phase} isSitting={isSitting} />

      {/* WASD character controller */}
      <Player
        position={myPos}
        setPosition={setMyPos}
        rotation={myRot}
        setRotation={setMyRot}
        onMoving={onMovingChange}
        buildings={buildings}
        phase={phase}
        isSitting={isSitting}
        setIsSitting={setIsSitting}
      />

      {/* Local player avatar */}
      <PlayerAvatar
        position={myPos}
        rotation={myRot}
        color={myColor}
        name={myName}
        role={myRole}
        isMe
        isAlive={isAlive}
        sitting={isSitting}
      />

      {/* Remote players */}
      {players.map((p) => (
        <PlayerAvatar
          key={p.id}
          position={[p.position?.x || 0, p.position?.y || 0, p.position?.z || 0]}
          rotation={p.rotation || 0}
          color={p.color}
          name={p.username}
          isAlive={p.isAlive !== false}
          walking={!!p.walking}
          sitting={!!p.sitting}
        />
      ))}
    </>
  );
}
