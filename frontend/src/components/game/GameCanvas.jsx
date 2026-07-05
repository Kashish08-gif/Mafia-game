/**
 * GameCanvas.jsx
 * R3F Canvas wrapper — sets up the WebGL renderer, camera, shadows,
 * and renders GameScene inside it.
 *
 * All 3D-scene props are forwarded from GameMapPage → GameCanvas → GameScene.
 */

import { Canvas } from '@react-three/fiber';
import GameScene  from './GameScene';

export default function GameCanvas({
  myPos,
  setMyPos,
  myRot,
  setMyRot,
  myName,
  myColor,
  myRole,
  isAlive,
  players,
  phase,
  onMovingChange,
  buildings,
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 6, 10], fov: 55 }}
      style={{ position: 'absolute', inset: 0 }}
      data-testid="game-3d-canvas"
    >
      <GameScene
        myPos={myPos}
        setMyPos={setMyPos}
        myRot={myRot}
        setMyRot={setMyRot}
        myName={myName}
        myColor={myColor}
        myRole={myRole}
        isAlive={isAlive}
        players={players}
        phase={phase}
        onMovingChange={onMovingChange}
        buildings={buildings}
      />
    </Canvas>
  );
}
