/**
 * OptimizedMesh.jsx
 * 
 * React Three Fiber component for automatic mesh optimization:
 * - Automatic LOD registration
 * - Instance detection and batching
 * - Animation optimization
 * - Performance-aware rendering
 * 
 * Requirements: 13.4
 */

import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { usePerformanceSystem } from './OptimizedScene';

/**
 * OptimizedMesh - Wrapper component for meshes with automatic optimization
 */
const OptimizedMesh = React.forwardRef(({
  children,
  lodDistances = null,
  enableLOD = true,
  enableInstancing = false,
  animationClips = null,
  castShadow = true,
  receiveShadow = true,
  onOptimized = null,
}, ref) => {
  const meshRef = useRef();
  const { scene } = useThree();
  const performanceSystem = usePerformanceSystem();
  const [isOptimized, setIsOptimized] = useState(false);
  
  // Combine refs
  React.useImperativeHandle(ref, () => meshRef.current);
  
  // Auto-optimize mesh
  useEffect(() => {
    if (!meshRef.current || !performanceSystem || isOptimized) return;
    
    try {
      const mesh = meshRef.current;
      
      console.log('[OptimizedMesh] Optimizing mesh:', mesh.name || 'unnamed');
      
      // Register for LOD management
      if (enableLOD && mesh.geometry) {
        performanceSystem.registerLODGroup([mesh], lodDistances);
        console.log('[OptimizedMesh] LOD registered');
      }
      
      // Register for instancing if applicable
      if (enableInstancing && mesh.geometry) {
        performanceSystem.registerForInstancing([mesh], 1);
        console.log('[OptimizedMesh] Instancing registered');
      }
      
      // Register for animation if applicable
      if (animationClips && animationClips.length > 0 && mesh.skeleton) {
        performanceSystem.registerAnimatedMesh(mesh, animationClips);
        console.log('[OptimizedMesh] Animation registered');
      }
      
      // Set shadow properties
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      
      setIsOptimized(true);
      
      if (onOptimized) {
        onOptimized(mesh);
      }
    } catch (error) {
      console.warn('[OptimizedMesh] Optimization error:', error);
    }
  }, [performanceSystem, enableLOD, enableInstancing, animationClips, castShadow, receiveShadow, isOptimized, onOptimized]);
  
  return (
    <group ref={meshRef}>
      {children}
    </group>
  );
});

OptimizedMesh.displayName = 'OptimizedMesh';

export default OptimizedMesh;
