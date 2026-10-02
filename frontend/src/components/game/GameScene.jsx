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
// Calibrated from in-game coords: player was at X:-0.9 Z:4.9 when standing AT the table edge.
// Table center estimated at approximately [0, 0, 3.5].
export const DISCUSSION_TABLE_POS    = [0, 0, 12.5];
// Radius around table within which chairs are considered "discussion chairs"
export const DISCUSSION_TABLE_RADIUS = 5.0;
// Sit-detection radius from a chair (how close player must be to trigger prompt)
export const SIT_CHAIR_RADIUS        = 5.5;

// ── Generate hardcoded chair positions in a ring around the table ──
// The GLB casino bakes everything into one mesh — chairs cannot be detected by name.
// These positions are tuned to match the 8 visible black chairs around the green poker table.
// The table is a perfect circle in 3D space (looks like an ellipse only due to low camera perspective).
// R = 3.4m matches the physical chair positions perfectly.
function buildDiscussionChairs() {
  const [tx, , tz] = DISCUSSION_TABLE_POS;
  const R = 3.4;   // radius in world units
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
function DiscussionCorner({ phase, discussionActive = false }) {
  const [tx, , tz] = DISCUSSION_TABLE_POS;

  // Publish to global window so Player.jsx can read it
  useEffect(() => {
    window.discussionTablePos    = DISCUSSION_TABLE_POS;
    window.discussionTableRadius = DISCUSSION_TABLE_RADIUS;
    // Always publish the hardcoded chairs — GLB nodes are all named "Material2/3/4"
    // so dynamic detection cannot find them. These synthetic positions match the
    // ring of black chairs visible around the green poker table.
    window.casinoChairs = DISCUSSION_CHAIRS;
    console.log('[DiscussionCorner] Table pos:', DISCUSSION_TABLE_POS, '| Chairs:', DISCUSSION_CHAIRS.length);
  }, []);

  if (phase !== 'DAY') return null;

  return (
    <group position={[tx, 0, tz]}>
      {/* Glowing ring ON the table surface — radius 2.2m fits the circular poker table top */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[2.0, 2.2, 64]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={3.5}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Subtle inner table glow (filled circle so table top pulses) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <circleGeometry args={[2.0, 48]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={0.4}
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Glowing dot at each chair position to guide players where to sit */}
      {DISCUSSION_CHAIRS.map((chair) => (
        <mesh
          key={chair.id}
          // positions are absolute world coords; subtract group origin (tx, tz) to get local
          position={[chair.pos[0] - tx, 0.05, chair.pos[2] - tz]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.2, 16]} />
          <meshStandardMaterial
            color="#ffd700"
            emissive="#ffd700"
            emissiveIntensity={5}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}

      {/* Rotating bouncing golden 3D arrow — sits above the TABLE, not the player */}
      <BouncingArrow />

      {/* Floating badge above the discussion table */}
      {!discussionActive && (
        <Html position={[0, 3.8, 0]} center distanceFactor={12} zIndexRange={[50, 0]}>
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
      )}
    </group>
  );
}

// ── Hover tooltip when standing near a chair ─────────────────────
function DiscussionInteractionZone({ myPos, phase, isSitting, players = [] }) {
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

        // Skip chair if it is occupied by any remote player
        const isOccupied = players.some(p => {
          if (!p.sitting) return false;
          const rx = p.position?.x ?? 0;
          const rz = p.position?.z ?? 0;
          return Math.hypot(c.pos[0] - rx, c.pos[2] - rz) < 0.6;
        });
        if (isOccupied) return;

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
  }, [myPos, phase, isSitting, players]);

  if (!nearestChair) return null;

  return (
    <Html position={[nearestChair.pos[0], 0.9, nearestChair.pos[2]]} center distanceFactor={10} zIndexRange={[50, 0]}>
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
  discussionActive = false,
  spectateTarget = null,
}) {
  const isNight = phase === 'NIGHT';

  return (
    <>
      {/* Sky / background */}
      <GameSky phase={phase} />

      {/* Dynamic Environment preset: only load during DAY to avoid night-time wash-out */}
      {!isNight && (
        <Suspense fallback={null}>
          <Environment files="/textures/potsdamer_platz_1k.hdr" background={false} />
        </Suspense>
      )}

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
      <DiscussionCorner phase={phase} discussionActive={discussionActive} />

      {/* Sitting interaction zones */}
      <DiscussionInteractionZone myPos={myPos} phase={phase} isSitting={isSitting} players={players} />

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
        players={players}
        discussionActive={discussionActive}
        isAlive={isAlive}
        spectateTarget={spectateTarget}
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
        discussionActive={discussionActive}
        phase={phase}
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
          discussionActive={discussionActive}
          phase={phase}
        />
      ))}
    </>
  );
}
