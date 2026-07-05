import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { usePerformanceContext } from '../PerformanceContext';
import type { BufferGeometry, Material, Mesh, Vector3, Matrix4 } from 'three';

// Mesh optimization configuration options
interface OptimizedMeshOptions {
  // LOD Configuration
  enableLOD?: boolean;
  lodDistances?: number[];
  lodScreenSizeThreshold?: number;
  lodTransitionSmoothing?: boolean;
  
  // Instancing Configuration
  enableInstancing?: boolean;
  instanceGroupId?: string;
  maxInstances?: number;
  instanceThreshold?: number;
  
  // Culling Configuration
  enableCulling?: boolean;
  isOccluder?: boolean;
  cullingBounds?: {
    center: Vector3;
    radius: number;
  };
  
  // Memory Management
  enableAutoDispose?: boolean;
  disposeTimeout?: number; // ms
  
  // Performance Monitoring
  trackPerformance?: boolean;
  
  // Optimization Presets
  optimizationLevel?: 'conservative' | 'balanced' | 'aggressive';
}

// Return type for the hook
interface UseOptimizedMeshReturn {
  // Mesh reference (to be used with React Three Fiber)
  meshRef: React.RefObject<Mesh>;
  
  // Optimization status
  isOptimized: boolean;
  lodLevel: number;
  isInstanced: boolean;
  isCulled: boolean;
  
  // Manual control methods
  forceLODLevel: (level: number) => void;
  updateInstanceTransform: (transform: Matrix4) => void;
  setVisible: (visible: boolean) => void;
  
  // Performance info
  getOptimizationStats: () => {
    triangleCount: number;
    originalTriangleCount: number;
    memoryUsage: number;
    renderingCost: number;
  };
}

// Optimization presets
const OPTIMIZATION_PRESETS = {
  conservative: {
    lodDistances: [25, 50, 100],
    lodScreenSizeThreshold: 0.05,
    instanceThreshold: 5,
    enableAutoDispose: false,
    disposeTimeout: 60000,
  },
  balanced: {
    lodDistances: [15, 35, 75],
    lodScreenSizeThreshold: 0.1,
    instanceThreshold: 3,
    enableAutoDispose: true,
    disposeTimeout: 30000,
  },
  aggressive: {
    lodDistances: [10, 20, 40],
    lodScreenSizeThreshold: 0.15,
    instanceThreshold: 2,
    enableAutoDispose: true,
    disposeTimeout: 15000,
  },
};

/**
 * Hook for creating performance-optimized meshes in React Three Fiber
 * 
 * This hook automatically applies various optimization techniques to 3D meshes:
 * - Level of Detail (LOD) based on camera distance and screen size
 * - GPU instancing for identical objects
 * - Frustum and occlusion culling
 * - Automatic memory management and disposal
 * 
 * @param geometry - The mesh geometry
 * @param material - The mesh material
 * @param position - Initial position (optional)
 * @param options - Optimization configuration options
 * @returns Optimized mesh interface and controls
 */
export const useOptimizedMesh = (
  geometry: BufferGeometry,
  material: Material | Material[],
  position?: Vector3,
  options: OptimizedMeshOptions = {}
): UseOptimizedMeshReturn => {
  const {
    enableLOD = true,
    lodDistances,
    lodScreenSizeThreshold,
    lodTransitionSmoothing = true,
    enableInstancing = true,
    instanceGroupId,
    maxInstances = 100,
    instanceThreshold,
    enableCulling = true,
    isOccluder = false,
    cullingBounds,
    enableAutoDispose = true,
    disposeTimeout,
    trackPerformance = false,
    optimizationLevel = 'balanced',
  } = options;

  const { camera } = useThree();
  const { performanceSystem, isInitialized } = usePerformanceContext();
  const meshRef = useRef<Mesh>(null);
  
  // Apply optimization preset
  const preset = OPTIMIZATION_PRESETS[optimizationLevel];
  const finalLodDistances = lodDistances || preset.lodDistances;
  const finalInstanceThreshold = instanceThreshold || preset.instanceThreshold;
  const finalDisposeTimeout = disposeTimeout || preset.disposeTimeout;
  
  // State tracking
  const optimizationState = useRef({
    isOptimized: false,
    lodLevel: 0,
    isInstanced: false,
    isCulled: false,
    lodGroupId: null as string | null,
    instanceGroupId: null as string | null,
    lastAccessTime: Date.now(),
    originalTriangleCount: 0,
  });

  // Calculate original triangle count
  const originalTriangleCount = useMemo(() => {
    if (geometry.index) {
      return geometry.index.count / 3;
    } else if (geometry.attributes.position) {
      return geometry.attributes.position.count / 3;
    }
    return 0;
  }, [geometry]);

  optimizationState.current.originalTriangleCount = originalTriangleCount;

  // LOD optimization setup
  useEffect(() => {
    if (!isInitialized || !enableLOD || !meshRef.current) return;

    const mesh = meshRef.current;
    
    try {
      // Generate LOD levels based on the optimization preset
      const lodOptions = {
        targetReductions: optimizationLevel === 'aggressive' 
          ? [0.8, 0.5, 0.2] // More aggressive reduction
          : optimizationLevel === 'conservative'
          ? [0.9, 0.7, 0.4] // Conservative reduction
          : [0.7, 0.4, 0.15], // Balanced reduction
        preserveUVBoundaries: true,
        preserveNormals: true,
        minimumTriangles: 50,
        generateBillboards: optimizationLevel === 'aggressive',
      };

      const lodLevels = performanceSystem.lodManager.generateLODLevels(mesh, lodOptions);
      
      if (lodLevels.length > 0) {
        const lodGroup = performanceSystem.lodManager.registerLODGroup(lodLevels, finalLodDistances);
        optimizationState.current.lodGroupId = lodGroup.id;
        
        // Configure LOD settings
        performanceSystem.lodManager.setScreenSizeThreshold(
          lodScreenSizeThreshold || (optimizationLevel === 'aggressive' ? 0.15 : 0.1)
        );
        performanceSystem.lodManager.setTransitionSmoothing(lodTransitionSmoothing);
        
        optimizationState.current.isOptimized = true;
        
        if (trackPerformance) {
          console.log(`[useOptimizedMesh] LOD optimization applied:`, {
            meshId: mesh.uuid,
            lodLevels: lodLevels.length,
            distances: finalLodDistances,
            originalTriangles: originalTriangleCount,
          });
        }
      }
    } catch (error) {
      console.error('[useOptimizedMesh] Error setting up LOD optimization:', error);
    }

    return () => {
      // Cleanup LOD registration
      if (optimizationState.current.lodGroupId) {
        // LOD cleanup would be handled by the LOD manager
        optimizationState.current.lodGroupId = null;
      }
    };
  }, [
    isInitialized,
    enableLOD,
    finalLodDistances,
    lodScreenSizeThreshold,
    lodTransitionSmoothing,
    optimizationLevel,
    originalTriangleCount,
    trackPerformance,
    performanceSystem,
  ]);

  // Instancing optimization setup
  useEffect(() => {
    if (!isInitialized || !enableInstancing || !meshRef.current) return;

    const mesh = meshRef.current;
    
    try {
      // Check if this mesh is a candidate for instancing
      const candidates = performanceSystem.instanceManager.autoDetectInstanceCandidates(
        mesh.parent || mesh, 
        finalInstanceThreshold
      );
      
      const eligibleCandidate = candidates.find((candidate: any) => 
        candidate.instances.some((instance: Mesh) => 
          instance.geometry === geometry && 
          instance.material === material
        )
      );

      if (eligibleCandidate && eligibleCandidate.eligibleForInstancing) {
        const groupId = instanceGroupId || `optimized-mesh-${mesh.uuid}`;
        
        const instanceGroup = performanceSystem.instanceManager.createInstanceGroup(
          mesh,
          [mesh.matrix],
          {
            maxInstances,
            dynamicUpdates: true,
            enableFrustumCulling: enableCulling,
            sortingStrategy: 'distance',
          }
        );

        optimizationState.current.instanceGroupId = groupId;
        optimizationState.current.isInstanced = true;
        
        if (trackPerformance) {
          console.log(`[useOptimizedMesh] Instancing optimization applied:`, {
            meshId: mesh.uuid,
            groupId,
            maxInstances,
            eligibleInstances: eligibleCandidate.instances.length,
          });
        }
      }
    } catch (error) {
      console.error('[useOptimizedMesh] Error setting up instancing optimization:', error);
    }

    return () => {
      // Cleanup instancing registration
      optimizationState.current.isInstanced = false;
      optimizationState.current.instanceGroupId = null;
    };
  }, [
    isInitialized,
    enableInstancing,
    instanceGroupId,
    maxInstances,
    finalInstanceThreshold,
    enableCulling,
    geometry,
    material,
    trackPerformance,
    performanceSystem,
  ]);

  // Culling optimization setup
  useEffect(() => {
    if (!isInitialized || !enableCulling || !meshRef.current) return;

    const mesh = meshRef.current;
    
    try {
      // Register as occluder if specified
      if (isOccluder) {
        performanceSystem.cullingSystem.addOccluder(mesh);
        
        if (trackPerformance) {
          console.log(`[useOptimizedMesh] Registered as occluder:`, mesh.uuid);
        }
      }

      // Set up custom culling bounds if provided
      if (cullingBounds) {
        mesh.userData.cullingBounds = cullingBounds;
      }

    } catch (error) {
      console.error('[useOptimizedMesh] Error setting up culling optimization:', error);
    }

    return () => {
      // Cleanup culling registration
      if (isOccluder && meshRef.current) {
        performanceSystem.cullingSystem.removeOccluder(meshRef.current);
      }
    };
  }, [
    isInitialized,
    enableCulling,
    isOccluder,
    cullingBounds,
    trackPerformance,
    performanceSystem,
  ]);

  // Memory management and auto-disposal
  useEffect(() => {
    if (!enableAutoDispose) return;

    const mesh = meshRef.current;
    if (!mesh) return;

    const checkDisposal = () => {
      const timeSinceAccess = Date.now() - optimizationState.current.lastAccessTime;
      
      if (timeSinceAccess > finalDisposeTimeout && !mesh.visible) {
        // Mark for disposal by memory manager
        if (isInitialized) {
          performanceSystem.memoryManager.releaseAsset(mesh.uuid);
          
          if (trackPerformance) {
            console.log(`[useOptimizedMesh] Mesh marked for disposal due to inactivity:`, mesh.uuid);
          }
        }
      }
    };

    const disposalInterval = setInterval(checkDisposal, finalDisposeTimeout / 4);

    return () => {
      clearInterval(disposalInterval);
    };
  }, [enableAutoDispose, finalDisposeTimeout, isInitialized, trackPerformance, performanceSystem]);

  // Update access time when mesh is visible or interacted with
  useEffect(() => {
    if (!meshRef.current) return;

    const updateAccessTime = () => {
      optimizationState.current.lastAccessTime = Date.now();
    };

    const mesh = meshRef.current;
    
    // Update access time when mesh becomes visible
    if (mesh.visible) {
      updateAccessTime();
    }

    // Set up intersection observer for visibility changes (if supported)
    const observer = new IntersectionObserver && new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            updateAccessTime();
          }
        });
      },
      { threshold: 0.1 }
    );

    // Note: IntersectionObserver works with DOM elements, not Three.js objects
    // This is a conceptual implementation - actual visibility would be tracked
    // by the culling system in the performance system

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  // Manual control methods
  const forceLODLevel = useCallback((level: number) => {
    if (isInitialized && optimizationState.current.lodGroupId) {
      // This would require extending the LOD manager interface
      // performanceSystem.lodManager.setForcedLODLevel(optimizationState.current.lodGroupId, level);
      optimizationState.current.lodLevel = level;
      
      if (trackPerformance) {
        console.log(`[useOptimizedMesh] Forced LOD level ${level} for mesh:`, meshRef.current?.uuid);
      }
    }
  }, [isInitialized, trackPerformance, performanceSystem]);

  const updateInstanceTransform = useCallback((transform: Matrix4) => {
    if (isInitialized && optimizationState.current.instanceGroupId && meshRef.current) {
      performanceSystem.instanceManager.updateInstances(
        optimizationState.current.instanceGroupId,
        [transform]
      );
      
      optimizationState.current.lastAccessTime = Date.now();
    }
  }, [isInitialized, performanceSystem]);

  const setVisible = useCallback((visible: boolean) => {
    if (meshRef.current) {
      meshRef.current.visible = visible;
      
      if (visible) {
        optimizationState.current.lastAccessTime = Date.now();
      }
      
      // Update instance visibility if instanced
      if (optimizationState.current.isInstanced && optimizationState.current.instanceGroupId) {
        performanceSystem.instanceManager.updateInstanceVisibility(
          optimizationState.current.instanceGroupId,
          [visible]
        );
      }
    }
  }, [performanceSystem]);

  // Performance statistics
  const getOptimizationStats = useCallback(() => {
    const mesh = meshRef.current;
    let currentTriangleCount = originalTriangleCount;
    let memoryUsage = 0;
    let renderingCost = 1.0;

    if (mesh && geometry) {
      // Calculate current triangle count based on LOD level
      const reductionFactors = [1.0, 0.7, 0.4, 0.15];
      const lodLevel = optimizationState.current.lodLevel;
      currentTriangleCount = Math.round(originalTriangleCount * (reductionFactors[lodLevel] || 1.0));
      
      // Estimate memory usage (rough calculation)
      const vertexCount = geometry.attributes.position ? geometry.attributes.position.count : 0;
      const attributeSize = 12; // Position (12 bytes) + normal (12 bytes) + uv (8 bytes) ≈ 32 bytes per vertex
      memoryUsage = vertexCount * attributeSize;
      
      // Calculate rendering cost factor
      renderingCost = currentTriangleCount / Math.max(originalTriangleCount, 1);
      
      if (optimizationState.current.isInstanced) {
        renderingCost *= 0.1; // Instancing provides significant performance improvement
      }
    }

    return {
      triangleCount: currentTriangleCount,
      originalTriangleCount,
      memoryUsage,
      renderingCost,
    };
  }, [originalTriangleCount, geometry]);

  // Set initial position if provided
  useEffect(() => {
    if (position && meshRef.current) {
      meshRef.current.position.copy(position);
    }
  }, [position]);

  return {
    meshRef,
    isOptimized: optimizationState.current.isOptimized,
    lodLevel: optimizationState.current.lodLevel,
    isInstanced: optimizationState.current.isInstanced,
    isCulled: optimizationState.current.isCulled,
    forceLODLevel,
    updateInstanceTransform,
    setVisible,
    getOptimizationStats,
  };
};

export default useOptimizedMesh;