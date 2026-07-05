/**
 * OptimizedScene.jsx
 * 
 * React Three Fiber wrapper component for optimized scene rendering:
 * - Automatic performance optimization integration
 * - Performance-aware Suspense boundaries for progressive loading
 * - Context provider for performance system access
 * 
 * Requirements: 13.4
 */

import { useEffect, useRef, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import PerformanceSystem from '../PerformanceSystem';

/**
 * OptimizedScene Context for accessing performance system
 */
import React from 'react';
const OptimizedSceneContext = React.createContext(null);

export const usePerformanceSystem = () => {
  const context = React.useContext(OptimizedSceneContext);
  if (!context) {
    console.warn('[OptimizedScene] PerformanceSystem not available in context');
  }
  return context;
};

/**
 * OptimizedScene - Wrapper component for React Three Fiber scenes
 */
const OptimizedScene = ({
  children,
  autoInitialize = true,
  onPerformanceSystemReady = null,
  enableMonitor = false,
  performanceOptions = {},
}) => {
  const { gl, scene, camera } = useThree();
  const performanceSystemRef = useRef(null);
  const [performanceSystem, setPerformanceSystem] = useState(null);
  const [isReady, setIsReady] = useState(false);
  // Keep a stable ref for the callback to avoid re-triggering the init effect
  const onReadyRef = useRef(onPerformanceSystemReady);
  useEffect(() => { onReadyRef.current = onPerformanceSystemReady; }, [onPerformanceSystemReady]);
  
  // Initialize performance system
  useEffect(() => {
    if (!autoInitialize || performanceSystemRef.current) return;
    
    try {
      console.log('[OptimizedScene] Initializing PerformanceSystem');
      
      const perfSys = new PerformanceSystem(gl, scene, camera, {
        enableLOD: true,
        enableCulling: true,
        enableInstancing: true,
        enableAssetOptimization: true,
        enableAnimationOptimization: true,
        enableEffects: true,
        enableLightingOptimization: true,
        enableMemoryManagement: true,
        enableFrameControl: true,
      });
      
      performanceSystemRef.current = perfSys;
      window.performanceSystem = perfSys; // Expose globally for PerformanceHUD and console
      setPerformanceSystem(perfSys);
      setIsReady(true);
      
      if (onReadyRef.current) {
        onReadyRef.current(perfSys);
      }
      
      console.log('[OptimizedScene] PerformanceSystem ready');
    } catch (error) {
      console.error('[OptimizedScene] Failed to initialize PerformanceSystem:', error);
    }
    
    return () => {
      // Cleanup on unmount
      if (performanceSystemRef.current) {
        const perfSys = performanceSystemRef.current;
        perfSys.shutdown();
        performanceSystemRef.current = null;
        if (window.performanceSystem === perfSys) {
          window.performanceSystem = null;
        }
      }
    };
  }, [autoInitialize, gl, scene, camera]);

  // Handle configuration changes dynamically without re-initializing
  useEffect(() => {
    const perfSys = performanceSystemRef.current;
    if (!perfSys) return;

    // Apply features based on options
    if (performanceOptions.enableLOD !== undefined) {
      perfSys.setFeatureEnabled('lodEnabled', performanceOptions.enableLOD);
    }
    if (performanceOptions.enableCulling !== undefined) {
      perfSys.setFeatureEnabled('cullingEnabled', performanceOptions.enableCulling);
    }
    if (performanceOptions.enableInstancing !== undefined) {
      perfSys.setFeatureEnabled('instancingEnabled', performanceOptions.enableInstancing);
    }
    // Update options object inside performanceSystem
    perfSys.options = {
      ...perfSys.options,
      ...performanceOptions,
    };
  }, [performanceOptions]);
  
  // Frame update loop
  useFrame((state, delta) => {
    if (performanceSystemRef.current) {
      performanceSystemRef.current.update(delta);
    }
  });
  
  // Render performance monitor if enabled
  useEffect(() => {
    if (enableMonitor && isReady) {
      console.log('[OptimizedScene] Performance monitor enabled');
    }
  }, [enableMonitor, isReady]);
  
  return (
    <OptimizedSceneContext.Provider value={performanceSystem}>
      <Suspense fallback={<FallbackLoader />}>
        {children}
      </Suspense>
    </OptimizedSceneContext.Provider>
  );
};

/**
 * FallbackLoader - Shown while assets are loading
 * Must return null or 3D components only, not HTML elements
 */
const FallbackLoader = () => {
  return null;
};

export default OptimizedScene;
export { OptimizedSceneContext };
