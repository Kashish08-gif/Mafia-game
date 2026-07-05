import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { PerformanceProvider, usePerformanceSystem, useOptimizedMesh } from '../index';
import type { Vector3, BufferGeometry, Material } from 'three';

// Example optimized mesh component for casino objects
const OptimizedCasinoObject: React.FC<{
  url: string;
  position: Vector3;
  isOccluder?: boolean;
  enableInstancing?: boolean;
}> = ({ url, position, isOccluder = false, enableInstancing = true }) => {
  const { scene } = useGLTF(url);
  
  // Extract geometry and material from the loaded model
  const mesh = scene.children[0] as any; // This would need proper type checking
  const geometry = mesh?.geometry as BufferGeometry;
  const material = mesh?.material as Material;

  // Apply performance optimizations
  const {
    meshRef,
    isOptimized,
    lodLevel,
    isInstanced,
    getOptimizationStats,
  } = useOptimizedMesh(
    geometry,
    material,
    position,
    {
      enableLOD: true,
      enableInstancing,
      enableCulling: true,
      isOccluder,
      optimizationLevel: 'balanced',
      trackPerformance: true,
    }
  );

  // Log optimization stats for debugging
  React.useEffect(() => {
    if (isOptimized) {
      const stats = getOptimizationStats();
      console.log(`[OptimizedCasinoObject] Optimization stats:`, {
        url,
        lodLevel,
        isInstanced,
        ...stats,
      });
    }
  }, [isOptimized, lodLevel, isInstanced, getOptimizationStats, url]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} position={position}>
      {/* The mesh will be automatically optimized by the performance system */}
    </mesh>
  );
};

// Example casino scene component
const CasinoScene: React.FC = () => {
  const { 
    isInitialized, 
    metrics, 
    setQualityPreset, 
    enableDebugVisualization,
    getOptimizationStats 
  } = usePerformanceSystem({
    enableAutoLOD: true,
    enableAutoCulling: true,
    enableAutoInstancing: true,
    targetFPS: 60,
    adaptiveQuality: true,
    enablePerformanceLogging: true,
  });

  // Performance monitoring
  React.useEffect(() => {
    if (isInitialized) {
      console.log('[CasinoScene] Performance system initialized');
      
      // Log performance metrics every 5 seconds
      const metricsInterval = setInterval(() => {
        console.log('[CasinoScene] Performance metrics:', {
          fps: metrics.currentFPS,
          frameTime: metrics.frameTime,
          vramUsage: metrics.vramUsage,
          drawCalls: metrics.drawCalls,
        });
        
        const optimizationStats = getOptimizationStats();
        console.log('[CasinoScene] Optimization stats:', optimizationStats);
      }, 5000);

      return () => clearInterval(metricsInterval);
    }
  }, [isInitialized, metrics, getOptimizationStats]);

  // Quality control example (could be triggered by UI)
  const handleQualityChange = (preset: 'low' | 'medium' | 'high' | 'ultra') => {
    setQualityPreset(preset);
    console.log(`[CasinoScene] Quality preset changed to: ${preset}`);
  };

  if (!isInitialized) {
    return (
      <group>
        {/* Loading placeholder - could be a simple geometry */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="gray" />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {/* Main casino building - mark as occluder */}
      <OptimizedCasinoObject
        url="/models/casino/grand_casino.glb"
        position={[0, 0, 0] as any}
        isOccluder={true}
        enableInstancing={false}
      />
      
      {/* Slot machines - good candidates for instancing */}
      {Array.from({ length: 8 }, (_, i) => (
        <OptimizedCasinoObject
          key={`slot-machine-${i}`}
          url="/models/casino/casion_slot-machine.glb"
          position={[i * 3 - 10, 0, 5] as any}
          enableInstancing={true}
        />
      ))}
      
      {/* Palm trees - another instancing candidate */}
      {Array.from({ length: 6 }, (_, i) => (
        <OptimizedCasinoObject
          key={`palm-tree-${i}`}
          url="/models/casino/plant_series__palm_tree.glb"
          position={[Math.cos(i) * 15, 0, Math.sin(i) * 15] as any}
          enableInstancing={true}
        />
      ))}
      
      {/* Furniture objects */}
      <OptimizedCasinoObject
        url="/models/casino/table_sofa.glb"
        position={[-5, 0, -5] as any}
        enableInstancing={true}
      />
      
      <OptimizedCasinoObject
        url="/models/casino/black_jack_table.glb"
        position={[5, 0, -5] as any}
        enableInstancing={true}
      />
      
      {/* Bar */}
      <OptimizedCasinoObject
        url="/models/casino/bar.glb"
        position={[0, 0, -10] as any}
        enableInstancing={false}
      />
      
      {/* Debug controls (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <group>
          {/* These would be triggered by keyboard shortcuts or debug UI */}
          <mesh 
            onClick={() => handleQualityChange('low')}
            position={[-20, 5, 0]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="red" />
          </mesh>
          
          <mesh 
            onClick={() => handleQualityChange('high')}
            position={[-20, 7, 0]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="green" />
          </mesh>
          
          <mesh 
            onClick={() => enableDebugVisualization(true)}
            position={[-20, 9, 0]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="blue" />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Example usage component that wraps the scene with the performance provider
const OptimizedCasinoScene: React.FC = () => {
  return (
    <Canvas 
      camera={{ position: [0, 10, 20], fov: 60 }}
      gl={{ 
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
    >
      {/* Performance Provider must wrap all R3F content */}
      <PerformanceProvider
        qualityPreset="high"
        adaptiveQuality={true}
        targetFPS={60}
      >
        <Suspense fallback={null}>
          <CasinoScene />
          
          {/* Standard R3F components work normally */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <OrbitControls />
        </Suspense>
      </PerformanceProvider>
    </Canvas>
  );
};

export default OptimizedCasinoScene;