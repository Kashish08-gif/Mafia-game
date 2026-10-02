/**
 * GameCanvasOptimized.jsx
 *
 * Stable React Three Fiber canvas — renders the casino game scene.
 * All config objects are module-level constants so React never sees new references
 * between renders, which prevents Canvas remounting and WebGL context loss.
 *
 * The heavy PerformanceSystem (OptimizedScene) has been intentionally removed because
 * its FallbackRenderer was calling renderer.setPixelRatio() and mutating
 * renderer.shadowMap.type after WebGL initialization, which forced Three.js into
 * a continuous Context Lost → Context Restored loop causing screen blinking.
 */

import { useRef, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import GameScene from './GameScene';

// ── Stable module-level constants — never recreated between renders ──────────
// fov: 45 — tight field of view so player only sees immediate surroundings (was 55)
const CAMERA_CONFIG  = { position: [0, 6, 10], fov: 45 };
const CANVAS_STYLE   = { position: 'absolute', inset: 0 };
const GL_CONFIG      = {
  antialias: true,
  alpha: false,
  stencil: false,
  depth: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
};

/**
 * GameCanvasOptimized — stable, blink-free 3-D canvas.
 * Wrapped in React.memo so parent re-renders (socket ticks, timer ticks)
 * don't propagate into the Canvas unless actual prop values change.
 */
const GameCanvasOptimized = memo(function GameCanvasOptimized({
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
  isSitting,
  setIsSitting,
  discussionActive,
  spectateTarget,
}) {
  const canvasRef = useRef(null);

  return (
    <Canvas
      ref={canvasRef}
      shadows
      camera={CAMERA_CONFIG}
      style={CANVAS_STYLE}
      gl={GL_CONFIG}
      data-testid="game-3d-canvas-optimized"
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
        isSitting={isSitting}
        setIsSitting={setIsSitting}
        discussionActive={discussionActive}
        spectateTarget={spectateTarget}
      />
    </Canvas>
  );
});

export default GameCanvasOptimized;
