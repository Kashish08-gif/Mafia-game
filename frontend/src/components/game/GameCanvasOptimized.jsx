/**
 * GameCanvasOptimized.jsx
 * 
 * Enhanced GameCanvas with integrated Performance Optimization System
 * - Automatically initializes PerformanceSystem
 * - Wraps canvas with OptimizedScene
 * - Enables performance monitoring dashboard
 * - Manages all performance optimizations transparently
 */

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import GameScene from './GameScene';
import OptimizedScene from '../../systems/performance/components/OptimizedScene';

const PERFORMANCE_OPTIONS = {
  enableLOD: true,
  enableCulling: true,
  enableInstancing: true,
  enableAssetOptimization: true,
  enableAnimationOptimization: true,
  enableEffects: true,
  enableLightingOptimization: true,
  enableMemoryManagement: true,
  enableFrameControl: true,
};

/**
 * Inner component to access performance system from context
 */
function GameSceneWithOptimization({
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
  );
}

/**
 * Main optimized canvas component
 */
export default function GameCanvasOptimized({
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
  const canvasRef = useRef(null);

  return (
    <Canvas
      ref={canvasRef}
      shadows
      camera={{ position: [0, 6, 10], fov: 55 }}
      style={{ position: 'absolute', inset: 0 }}
      data-testid="game-3d-canvas-optimized"
      gl={{
        antialias: true,
        alpha: false,
        stencil: false,
        depth: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      }}
    >
      {/* Wrap with OptimizedScene for automatic performance management */}
      <OptimizedScene
        autoInitialize={true}
        enableMonitor={false}
        performanceOptions={PERFORMANCE_OPTIONS}
      >
        {/* Render game scene with performance system context */}
        <GameSceneWithOptimization
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
      </OptimizedScene>
    </Canvas>
  );
}
