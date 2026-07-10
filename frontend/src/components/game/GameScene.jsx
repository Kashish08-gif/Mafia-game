/**
 * GameScene.jsx
 * The 3D scene compositor — renders everything inside the R3F Canvas.
 */

import { Suspense, useState, useEffect } from 'react';
import { Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import GameSky      from './Sky';
import Ground       from './Ground';
import Player       from './Player';
import PlayerAvatar from './PlayerAvatar';
import Loading3D    from './Loading3D';
import CasinoMap    from '../CasinoMap';

// ── Discussion Corner Table Overlay ──────────────────────────────
function DiscussionCorner({ phase }) {
  const [center, setCenter] = useState([0, 0.05, -35.2]);

  useEffect(() => {
    if (phase !== 'DAY') return;
    // Show at hardcoded default immediately, update if dynamic scan finds table
    const interval = setInterval(() => {
      if (window.casinoTables && window.casinoTables.length > 0) {
        const t = window.casinoTables[0];
        setCenter([t.pos[0], 0.05, t.pos[2]]);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase !== 'DAY') return null;

  return (
    <group>
      {/* Golden glowing circle around the discussion table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={center}>
        <ringGeometry args={[4.2, 4.4, 64]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={2.5}
          transparent
          opacity={0.65}
        />
      </mesh>
      
      {/* Floating badge above the discussion table */}
      <Html position={[center[0], 2.2, center[2]]} center distanceFactor={12}>
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
          <span style={{ fontSize: '13px' }}>💬</span> DISCUSSION CORNER
        </div>
      </Html>
    </group>
  );
}

// ── Hover tooltip when standing near a chair ─────────────────────
function DiscussionInteractionZone({ myPos, phase, isSitting }) {
  const [nearestChair, setNearestChair] = useState(null);

  useEffect(() => {
    // Note: phase gate removed for testing — re-add `if (phase !== 'DAY') return;` when needed
    if (isSitting) {
      setNearestChair(null);
      return;
    }

    const interval = setInterval(() => {
      const chairs = window.casinoChairs;
      if (!chairs || chairs.length === 0) return;

      // Find nearest chair to player from ALL loaded chairs
      const [px, , pz] = myPos;
      let nearest = null;
      let minDist  = Infinity;
      chairs.forEach((c) => {
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
        <span>Click Interact to Sit</span>
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
  return (
    <>
      {/* Sky / background */}
      <GameSky phase={phase} />

      {/* Environment map */}
      <Environment preset="city" background={false} />

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
