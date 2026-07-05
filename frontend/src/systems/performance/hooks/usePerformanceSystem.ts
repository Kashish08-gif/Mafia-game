import { useEffect, useCallback, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePerformanceContext } from '../PerformanceContext';
import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';

// Performance System Hook Return Type
interface UsePerformanceSystemReturn {
  performanceSystem: any; // Will be properly typed when task 1.1 is completed
  metrics: any;
  isInitialized: boolean;
  
  // Quality control methods
  setQualityPreset: (preset: 'low' | 'medium' | 'high' | 'ultra') => void;
  setAdaptiveQuality: (enabled: boolean) => void;
  
  // Registration methods for R3F components
  registerMeshForLOD: (mesh: Object3D, distances?: number[]) => () => void;
  registerMeshForInstancing: (mesh: Object3D, groupId?: string) => () => void;
  registerOccluder: (occluder: Object3D) => () => void;
  
  // Performance monitoring
  getFrameStats: () => {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
  };
  
  // Debug utilities
  enableDebugVisualization: (enabled: boolean) => void;
  getOptimizationStats: () => {
    lodStats: any;
    cullingStats: any;
    instanceStats: any;
  };
}

// Hook Configuration Options
interface UsePerformanceSystemOptions {
  // Automatic optimization settings
  enableAutoLOD?: boolean;
  enableAutoCulling?: boolean;
  enableAutoInstancing?: boolean;
  
  // LOD configuration
  lodDistances?: number[];
  lodScreenSizeThreshold?: number;
  lodTransitionSmoothing?: boolean;
  
  // Culling configuration  
  occlusionTestFrequency?: number;
  enableFrustumCulling?: boolean;
  enableOcclusionCulling?: boolean;
  
  // Instancing configuration
  instanceThreshold?: number;
  autoDetectInstances?: boolean;
  
  // Performance monitoring
  metricsUpdateFrequency?: number;
  enablePerformanceLogging?: boolean;
  
  // Quality adjustment
  adaptiveQuality?: boolean;
  targetFPS?: number;
  qualityPreset?: 'low' | 'medium' | 'high' | 'ultra';
}

/**
 * Main hook for integrating React Three Fiber with the Performance System
 * 
 * This hook provides:
 * - Automatic registration of R3F components with optimization systems
 * - Frame-based performance updates integrated with useFrame
 * - Quality control and monitoring methods
 * - Cleanup and resource management
 * 
 * @param options - Configuration options for performance optimization behavior
 * @returns Performance system interface and utility methods
 */
export const usePerformanceSystem = (options: UsePerformanceSystemOptions = {}): UsePerformanceSystemReturn => {
  const {
    enableAutoLOD = true,
    enableAutoCulling = true,
    enableAutoInstancing = true,
    lodDistances = [15, 35, 75],
    lodScreenSizeThreshold = 0.1,
    lodTransitionSmoothing = true,
    occlusionTestFrequency = 5,
    enableFrustumCulling = true,
    enableOcclusionCulling = true,
    instanceThreshold = 3,
    autoDetectInstances = true,
    metricsUpdateFrequency = 100,
    enablePerformanceLogging = false,
    adaptiveQuality = true,
    targetFPS = 60,
    qualityPreset = 'high',
  } = options;

  const { scene, camera, gl: renderer } = useThree();
  const { performanceSystem, metrics, isInitialized, setQualityPreset, setAdaptiveQuality } = usePerformanceContext();
  
  // Track registered objects for cleanup
  const registeredObjects = useRef<Set<Object3D>>(new Set());
  const frameCount = useRef(0);
  const lastMetricsUpdate = useRef(0);

  // Initialize performance system configuration
  useEffect(() => {
    if (!isInitialized) return;

    // Configure LOD system
    if (enableAutoLOD) {
      performanceSystem.lodManager.setScreenSizeThreshold(lodScreenSizeThreshold);
      performanceSystem.lodManager.setTransitionSmoothing(lodTransitionSmoothing);
    }

    // Configure culling system
    if (enableAutoCulling) {
      performanceSystem.cullingSystem.setOcclusionTestFrequency(occlusionTestFrequency);
    }

    // Configure instancing system
    if (enableAutoInstancing) {
      performanceSystem.instanceManager.setInstanceThreshold(instanceThreshold);
    }

    // Configure frame controller
    performanceSystem.frameController.setTargetFPS(targetFPS);
    performanceSystem.frameController.setAdaptiveMode(adaptiveQuality);

    // Apply initial quality preset
    setQualityPreset(qualityPreset);
    setAdaptiveQuality(adaptiveQuality);

    if (enablePerformanceLogging) {
      console.log('[usePerformanceSystem] Configuration applied:', {
        enableAutoLOD,
        enableAutoCulling,
        enableAutoInstancing,
        lodDistances,
        targetFPS,
        qualityPreset,
      });
    }
  }, [
    isInitialized,
    performanceSystem,
    enableAutoLOD,
    enableAutoCulling,
    enableAutoInstancing,
    lodScreenSizeThreshold,
    lodTransitionSmoothing,
    occlusionTestFrequency,
    instanceThreshold,
    targetFPS,
    adaptiveQuality,
    qualityPreset,
    setQualityPreset,
    setAdaptiveQuality,
    enablePerformanceLogging,
  ]);

  // Auto-detect instance candidates in the scene
  useEffect(() => {
    if (!isInitialized || !enableAutoInstancing || !autoDetectInstances) return;

    const detectInstances = () => {
      try {
        const candidates = performanceSystem.instanceManager.autoDetectInstanceCandidates(scene, instanceThreshold);
        
        if (enablePerformanceLogging && candidates.length > 0) {
          console.log(`[usePerformanceSystem] Detected ${candidates.length} instance candidates:`, candidates);
        }

        // Automatically create instance groups for detected candidates
        candidates.forEach((candidate: any, index: number) => {
          if (candidate.eligibleForInstancing && candidate.instances.length >= instanceThreshold) {
            const groupId = `auto-instance-${index}`;
            performanceSystem.instanceManager.createInstanceGroup(
              candidate.instances[0], // Use first instance as template
              candidate.instances.map((obj: any) => obj.matrix),
              {
                maxInstances: candidate.instances.length * 2, // Allow for growth
                dynamicUpdates: true,
                enableFrustumCulling: true,
                sortingStrategy: 'distance',
              }
            );
          }
        });
      } catch (error) {
        console.error('[usePerformanceSystem] Error during instance detection:', error);
      }
    };

    // Delay instance detection to allow scene to populate
    const detectionTimeout = setTimeout(detectInstances, 1000);
    
    return () => clearTimeout(detectionTimeout);
  }, [isInitialized, scene, performanceSystem, enableAutoInstancing, autoDetectInstances, instanceThreshold, enablePerformanceLogging]);

  // Main frame update loop
  useFrame((state, delta) => {
    if (!isInitialized) return;

    frameCount.current++;
    
    try {
      // Update performance system every frame
      performanceSystem.update(state.camera, delta);

      // Staggered expensive operations to distribute load
      const frame = frameCount.current;

      // Update LOD levels every frame (efficient with distance caching)
      if (enableAutoLOD) {
        performanceSystem.lodManager.updateLODLevels(state.camera);
      }

      // Perform frustum culling every frame
      if (enableFrustumCulling) {
        const visibleObjects = scene.children.filter((child: Object3D) => child.visible);
        performanceSystem.cullingSystem.performFrustumCulling(visibleObjects, state.camera);
      }

      // Perform occlusion culling every N frames (configurable)
      if (enableOcclusionCulling && frame % occlusionTestFrequency === 0) {
        const allObjects = scene.children;
        const occluders = allObjects.filter((obj: any) => obj.userData?.isOccluder);
        performanceSystem.cullingSystem.updateOcclusionCulling(allObjects, occluders);
      }

      // Update instance transforms for dynamic objects
      if (enableAutoInstancing) {
        performanceSystem.instanceManager.optimizeInstanceData();
      }

      // Performance monitoring and quality adjustment (every 60 frames = ~1 second at 60fps)
      if (frame % 60 === 0) {
        const currentMetrics = performanceSystem.getPerformanceMetrics();
        const adjustments = performanceSystem.frameController.adjustQuality(currentMetrics);
        
        if (enablePerformanceLogging && adjustments.changedSettings.size > 0) {
          console.log('[usePerformanceSystem] Quality adjustments applied:', adjustments);
        }
      }

      // Memory management (every 300 frames = ~5 seconds at 60fps)
      if (frame % 300 === 0) {
        const memoryUsage = performanceSystem.memoryManager.getMemoryUsage();
        
        // Trigger garbage collection if memory usage is high
        if (memoryUsage.totalAllocated > memoryUsage.availableVRAM * 0.75) {
          performanceSystem.memoryManager.performGarbageCollection(0.5);
          
          if (enablePerformanceLogging) {
            console.log('[usePerformanceSystem] Garbage collection triggered due to memory pressure');
          }
        }
      }

    } catch (error) {
      console.error('[usePerformanceSystem] Error during frame update:', error);
    }
  });

  // Registration methods for R3F components
  const registerMeshForLOD = useCallback((mesh: Object3D, distances: number[] = lodDistances) => {
    if (!isInitialized) {
      console.warn('[usePerformanceSystem] Cannot register mesh for LOD: system not initialized');
      return () => {};
    }

    try {
      registeredObjects.current.add(mesh);
      
      // Generate LOD levels for the mesh
      const lodLevels = performanceSystem.lodManager.generateLODLevels(mesh, {
        targetReductions: [0.7, 0.4, 0.15], // 70%, 40%, 15% of original triangle count
        preserveUVBoundaries: true,
        preserveNormals: true,
        minimumTriangles: 100,
        generateBillboards: true,
      });

      // Register the LOD group
      const lodGroup = performanceSystem.lodManager.registerLODGroup(lodLevels, distances);

      if (enablePerformanceLogging) {
        console.log('[usePerformanceSystem] Registered mesh for LOD optimization:', {
          meshId: mesh.uuid,
          lodLevels: lodLevels.length,
          distances,
        });
      }

      // Return cleanup function
      return () => {
        registeredObjects.current.delete(mesh);
        // LOD cleanup would be handled by the LOD manager
      };
    } catch (error) {
      console.error('[usePerformanceSystem] Error registering mesh for LOD:', error);
      return () => {};
    }
  }, [isInitialized, performanceSystem, lodDistances, enablePerformanceLogging]);

  const registerMeshForInstancing = useCallback((mesh: Object3D, groupId?: string) => {
    if (!isInitialized) {
      console.warn('[usePerformanceSystem] Cannot register mesh for instancing: system not initialized');
      return () => {};
    }

    try {
      registeredObjects.current.add(mesh);
      
      // Check if this mesh is eligible for instancing
      const candidates = performanceSystem.instanceManager.autoDetectInstanceCandidates(scene);
      const eligibleCandidate = candidates.find((candidate: any) => 
        candidate.instances.some((instance: Object3D) => instance.uuid === mesh.uuid)
      );

      if (eligibleCandidate && eligibleCandidate.eligibleForInstancing) {
        const instanceGroupId = groupId || `instance-${mesh.uuid}`;
        performanceSystem.instanceManager.createInstanceGroup(
          mesh,
          [mesh.matrix],
          {
            maxInstances: 100,
            dynamicUpdates: true,
            enableFrustumCulling: true,
            sortingStrategy: 'distance',
          }
        );

        if (enablePerformanceLogging) {
          console.log('[usePerformanceSystem] Registered mesh for instancing:', {
            meshId: mesh.uuid,
            groupId: instanceGroupId,
          });
        }
      }

      return () => {
        registeredObjects.current.delete(mesh);
      };
    } catch (error) {
      console.error('[usePerformanceSystem] Error registering mesh for instancing:', error);
      return () => {};
    }
  }, [isInitialized, performanceSystem, scene, enablePerformanceLogging]);

  const registerOccluder = useCallback((occluder: Object3D) => {
    if (!isInitialized) {
      console.warn('[usePerformanceSystem] Cannot register occluder: system not initialized');
      return () => {};
    }

    try {
      registeredObjects.current.add(occluder);
      performanceSystem.cullingSystem.addOccluder(occluder);

      if (enablePerformanceLogging) {
        console.log('[usePerformanceSystem] Registered occluder:', occluder.uuid);
      }

      return () => {
        registeredObjects.current.delete(occluder);
        performanceSystem.cullingSystem.removeOccluder(occluder);
      };
    } catch (error) {
      console.error('[usePerformanceSystem] Error registering occluder:', error);
      return () => {};
    }
  }, [isInitialized, performanceSystem, enablePerformanceLogging]);

  // Utility methods
  const getFrameStats = useCallback(() => {
    const currentMetrics = performanceSystem.getPerformanceMetrics();
    return {
      fps: currentMetrics.currentFPS,
      frameTime: currentMetrics.frameTime,
      drawCalls: currentMetrics.drawCalls,
      triangles: currentMetrics.triangleCount,
    };
  }, [performanceSystem]);

  const enableDebugVisualization = useCallback((enabled: boolean) => {
    if (isInitialized) {
      performanceSystem.cullingSystem.setDebugVisualization(enabled);
      
      if (enablePerformanceLogging) {
        console.log(`[usePerformanceSystem] Debug visualization ${enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }, [isInitialized, performanceSystem, enablePerformanceLogging]);

  const getOptimizationStats = useCallback(() => {
    if (!isInitialized) {
      return {
        lodStats: {},
        cullingStats: {},
        instanceStats: {},
      };
    }

    return {
      lodStats: performanceSystem.lodManager.getLODStats(),
      cullingStats: performanceSystem.cullingSystem.getCullingStats(),
      instanceStats: performanceSystem.instanceManager.getInstanceStats(),
    };
  }, [isInitialized, performanceSystem]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all registered objects
      registeredObjects.current.clear();
    };
  }, []);

  return {
    performanceSystem,
    metrics,
    isInitialized,
    setQualityPreset,
    setAdaptiveQuality,
    registerMeshForLOD,
    registerMeshForInstancing,
    registerOccluder,
    getFrameStats,
    enableDebugVisualization,
    getOptimizationStats,
  };
};

export default usePerformanceSystem;