// Performance System React Integration Layer
// This module provides React Three Fiber integration for the casino rendering optimization system

// Context and Provider
export { 
  PerformanceProvider, 
  usePerformanceContext,
  default as PerformanceContext 
} from './PerformanceContext';

// React Three Fiber Integration Hooks
export { usePerformanceSystem } from './hooks/usePerformanceSystem';
export { useOptimizedMesh } from './hooks/useOptimizedMesh';

// Type exports (these would normally come from task 1.1)
export type {
  PerformanceMetrics,
  LODManager,
  CullingSystem,
  InstanceManager,
  AssetOptimizer,
  FrameController,
  MemoryManager,
} from './PerformanceContext';

// Hook option types
export type { UsePerformanceSystemOptions } from './hooks/usePerformanceSystem';
export type { OptimizedMeshOptions, UseOptimizedMeshReturn } from './hooks/useOptimizedMesh';

// Re-export common types that components will need
export type { 
  BufferGeometry, 
  Material, 
  Mesh, 
  Vector3, 
  Matrix4,
  Camera,
  Object3D,
  Scene,
  WebGLRenderer,
} from 'three';