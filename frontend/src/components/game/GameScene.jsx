/**
 * GameScene.jsx
 * The 3D scene compositor — renders everything inside the R3F Canvas.
 *
 * Imports:
 *   Sky          — phase-aware sky / starfield
 *   Lighting     — phase-aware lighting (delegates to CasinoLights)
 *   Ground       — map ground placeholder (CasinoScene provides its own)
 *   CasinoMap    — casino environment (GLB assets + carpet + roads)
 *   Player       — WASD character controller (invisible, camera logic)
 *   PlayerAvatar — GLB avatar for local + remote players
 *   Loading3D    — Suspense fallback spinner
 *
 * Props passed down from GameCanvas → GameScene:
 *   myPos / setMyPos   — local player world position
 *   myRot / setMyRot   — local player yaw rotation
 *   myName / myColor / myRole / isAlive
 *   players            — remote players array
 *   phase              — 'DAY' | 'NIGHT'
 *   onMovingChange     — callback(bool) for walking animation
 *   buildings          — BUILDINGS array for collision detection
 */

import { Suspense } from 'react';
import { Environment } from '@react-three/drei';
import GameSky      from './Sky';
import Ground       from './Ground';
import Player       from './Player';
import PlayerAvatar from './PlayerAvatar';
import Loading3D    from './Loading3D';
import CasinoMap    from '../CasinoMap';

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
}) {
  return (
    <>
      {/* Sky / background */}
      <GameSky phase={phase} />

      {/* Environment map — fixes dark/black PBR metallic materials, background=false keeps GameSky */}
      <Environment preset="city" background={false} />

      {/* Ground placeholder (CasinoMap renders its own ground) */}
      <Ground phase={phase} />

      {/* Casino map — all GLB assets wrapped in Suspense */}
      <Suspense fallback={<Loading3D />}>
        <CasinoMap phase={phase} />
      </Suspense>

      {/* WASD character controller */}
      <Player
        position={myPos}
        setPosition={setMyPos}
        rotation={myRot}
        setRotation={setMyRot}
        onMoving={onMovingChange}
        buildings={buildings}
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
        />
      ))}
    </>
  );
}
