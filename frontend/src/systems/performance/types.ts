/**
 * Core TypeScript interfaces and types for the Casino Rendering Optimization Performance System
 * 
 * This file contains all interface definitions from the design document, providing
 * comprehensive type safety for the entire performance optimization system.
 */

import { 
  Object3D, 
  Camera, 
  Mesh, 
  Scene, 
  InstancedMesh, 
  BufferGeometry, 
  Material, 
  ShaderMaterial, 
  Texture, 
  Matrix4, 
  Matrix3, 
  Vector3, 
  Sphere, 
  Box3 
} from 'three';

import {
  QualityPreset,
  HardwareTier,
  AssetType,
  LoadStrategy,
  TextureFormat,
  SortingStrategy,
  OptimizationTrigger,
  FailureType,
  PoolType,
  TransitionState
} from './enums';

// ============================================================================
// Core Performance System Interfaces
// ============================================================================

/**
 * Main Performance System interface - orchestrates all optimization subsystems
 */
export interface PerformanceSystem {
  lodManager: LODManager;
  cullingSystem: CullingSystem;
  instanceManager: InstanceManager;
  viewportManager: ViewportManager;
  assetOptimizer: AssetOptimizer;
  frameController: FrameController;
  memoryManager: MemoryManager;

  initialize(config: PerformanceConfig): Promise<void>;
  update(camera: Camera, deltaTime: number): void;
  dispose(): void;
  getSystemStats(): SystemStatistics;
}

/**
 * Configuration for the entire performance system
 */
export interface PerformanceConfig {
  targetFPS: number;
  maxVRAMUsage: number;
  qualityPreset: QualityPreset;
  hardwareTier: HardwareTier;
  enableAdaptiveQuality: boolean;
  enableDebugMode: boolean;
}

/**
 * Overall system performance statistics
 */
export interface SystemStatistics {
  currentFPS: number;
  frameTime: number;
  memoryUsage: MemoryUsageReport;
  optimizationStats: OptimizationStatistics;
  activeManagers: string[];
}

/**
 * Aggregated optimization statistics
 */
export interface OptimizationStatistics {
  trianglesSaved: number;
  drawCallsReduced: number;
  memoryFreed: number;
  lodTransitions: number;
  instancesActive: number;
  culledObjects: number;
}

// ============================================================================
// LOD Manager Interfaces
// ============================================================================

/**
 * Level of Detail Manager for distance-based detail reduction
 */
export interface LODManager {
  registerLODGroup(meshes: Mesh[], distances: number[]): LODGroup;
  updateLODLevels(camera: Camera): void;
  generateLODLevels(originalMesh: Mesh, options?: LODOptions): Mesh[];
  setTransitionSmoothing(enabled: boolean): void;
  setScreenSizeThreshold(threshold: number): void;
  getLODStats(): LODStatistics;
  dispose(): void;
}

/**
 * Group of meshes with different detail levels
 */
export interface LODGroup {
  id: string;
  meshes: Mesh[];
  distances: number[];
  currentLevel: number;
  screenSizeThreshold: number;
  transitionState: LODTransitionState;
  lastUpdateFrame: number;
  boundingSphere: Sphere;
}

/**
 * Configuration options for LOD level generation
 */
export interface LODOptions {
  targetReductions: number[]; // [0.7, 0.4, 0.15] for 70%, 40%, 15% triangle counts
  preserveUVBoundaries: boolean;
  preserveNormals: boolean;
  minimumTriangles: number;
  generateBillboards: boolean;
}

/**
 * State information for smooth LOD transitions
 */
export interface LODTransitionState {
  isTransitioning: boolean;
  fromLevel: number;
  toLevel: number;
  progress: number;
  startTime: number;
}

/**
 * Performance statistics for LOD system
 */
export interface LODStatistics {
  totalGroups: number;
  activeTransitions: number;
  trianglesSaved: number;
  memoryReduced: number;
}

// ============================================================================
// Culling System Interfaces  
// ============================================================================

/**
 * Frustum and occlusion culling system
 */
export interface CullingSystem {
  performFrustumCulling(objects: Object3D[], camera: Camera): CullingResult;
  updateOcclusionCulling(objects: Object3D[], occluders: Object3D[]): void;
  setOcclusionTestFrequency(frames: number): void;
  addOccluder(occluder: Object3D): void;
  removeOccluder(occluder: Object3D): void;
  getCullingStats(): CullingStats;
  setDebugVisualization(enabled: boolean): void;
}

/**
 * Results from culling operations
 */
export interface CullingResult {
  visibleObjects: Object3D[];
  frustumCulled: Object3D[];
  occlusionCulled: Object3D[];
  renderQueue: RenderQueueEntry[];
}

/**
 * Entry in the optimized render queue
 */
export interface RenderQueueEntry {
  object: Object3D;
  distanceToCamera: number;
  renderPriority: number;
  lodLevel: number;
  instanceData?: InstanceData;
}

/**
 * Performance statistics for culling system
 */
export interface CullingStats {
  totalObjects: number;
  frustumCulled: number;
  occlusionCulled: number;
  rendered: number;
  occlusionTestsPerFrame: number;
  averageOcclusionTime: number;
}

/**
 * GPU occlusion test tracking
 */
export interface OcclusionTest {
  object: Object3D;
  boundingBox: Box3;
  lastTestFrame: number;
  isVisible: boolean;
  testInProgress: boolean;
}

// ============================================================================
// Instance Manager Interfaces
// ============================================================================

/**
 * GPU instancing manager for repeated objects
 */
export interface InstanceManager {
  createInstanceGroup(
    mesh: Mesh,
    transforms: Matrix4[],
    options?: InstanceOptions,
  ): InstanceGroup;
  updateInstances(groupId: string, transforms: Matrix4[]): void;
  updateInstanceVisibility(groupId: string, visibilityMask: boolean[]): void;
  autoDetectInstanceCandidates(
    scene: Scene,
    threshold?: number,
  ): InstanceCandidate[];
  setInstanceThreshold(minCount: number): void;
  mergeInstanceGroups(groupIds: string[]): string;
  getInstanceStats(): InstanceStatistics;
  optimizeInstanceData(): void;
}

/**
 * Group of instanced objects rendered with single draw call
 */
export interface InstanceGroup {
  id: string;
  instancedMesh: InstancedMesh;
  maxInstances: number;
  activeInstances: number;
  transforms: Matrix4[];
  visibilityMask: boolean[];
  cullingData: InstanceCullingData;
  lastUpdateFrame: number;
}

/**
 * Configuration options for instance groups
 */
export interface InstanceOptions {
  maxInstances: number;
  dynamicUpdates: boolean;
  enableFrustumCulling: boolean;
  sortingStrategy: SortingStrategy;
  lodDistances?: number[];
}

/**
 * Objects eligible for GPU instancing
 */
export interface InstanceCandidate {
  geometry: BufferGeometry;
  material: Material;
  instances: Object3D[];
  eligibleForInstancing: boolean;
  estimatedPerformanceGain: number;
  sharedVertexCount: number;
}

/**
 * Culling data for instance groups
 */
export interface InstanceCullingData {
  boundingSpheres: Sphere[];
  visibleIndices: number[];
  sortedIndices: number[];
  needsUpdate: boolean;
}

/**
 * Instance-specific rendering data
 */
export interface InstanceData {
  groupId: string;
  instanceIndex: number;
  transform: Matrix4;
  isVisible: boolean;
  lodLevel: number;
}

/**
 * Performance statistics for instancing system
 */
export interface InstanceStatistics {
  totalGroups: number;
  totalInstances: number;
  activeInstances: number;
  drawCallsReduced: number;
  memoryEfficiency: number;
}

// ============================================================================
// Viewport Manager Interfaces
// ============================================================================

/**
 * Camera viewport and viewing distance management
 */
export interface ViewportManager {
  updateCameraState(camera: Camera): void;
  getCameraMovement(): CameraMovement;
  predictMovement(deltaTime: number): Vector3;
  getViewFrustum(): ViewFrustum;
  setViewingDistance(near: number, far: number): void;
}

/**
 * Camera movement tracking for predictive optimization
 */
export interface CameraMovement {
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  direction: Vector3;
  isMoving: boolean;
  movementMagnitude: number;
}

/**
 * View frustum data for culling calculations
 */
export interface ViewFrustum {
  planes: Float32Array; // 6 planes * 4 coefficients
  bounds: Box3;
  fov: number;
  aspect: number;
  near: number;
  far: number;
}

// ============================================================================
// Asset Optimizer Interfaces
// ============================================================================

/**
 * Progressive asset loading and compression system
 */
export interface AssetOptimizer {
  loadProgressively(
    priorities: LoadPriority[],
    onProgress?: ProgressCallback,
  ): Promise<OptimizedScene>;
  compressTextures(
    textures: Texture[],
    options: CompressionOptions,
  ): Promise<Texture[]>;
  generateTextureAtlases(
    materials: Material[],
    atlasSize?: number,
  ): Promise<TextureAtlas[]>;
  createUberShader(
    materials: Material[],
    shaderTemplate: string,
  ): ShaderMaterial;
  preloadNearbyAssets(
    playerPosition: Vector3,
    direction: Vector3,
    radius: number,
  ): void;
  optimizeGeometry(
    geometry: BufferGeometry,
    options: GeometryOptions,
  ): BufferGeometry;
  preprocessGLB(
    url: string,
    options: PreprocessOptions,
  ): Promise<ProcessedAsset>;
}

/**
 * Asset loading priority configuration
 */
export interface LoadPriority {
  priority: number; // 0-2, lower = higher priority
  assets: AssetDescriptor[];
  loadStrategy: LoadStrategy;
  fallbackAssets?: AssetDescriptor[];
}

/**
 * Asset description for loading system
 */
export interface AssetDescriptor {
  url: string;
  type: AssetType;
  size: number;
  dependencies: string[];
  metadata: AssetMetadata;
}

/**
 * Asset metadata for optimization tracking
 */
export interface AssetMetadata {
  id: string;
  type: AssetType;
  size: number;
  lastAccessed: number;
  referenceCount: number;
  priority: number;
  disposable: boolean;
}

/**
 * Texture compression configuration
 */
export interface CompressionOptions {
  colorFormat: TextureFormat; // BC7, ASTC, ETC2
  normalFormat: TextureFormat; // BC5, RGTC
  maxTextureSize: number;
  generateMipmaps: boolean;
  qualityLevel: number; // 0.0-1.0
}

/**
 * Texture atlas for reducing draw calls
 */
export interface TextureAtlas {
  texture: Texture;
  uvTransforms: Map<string, Matrix3>;
  materials: Material[];
  coverage: number; // 0.0-1.0
  wastedSpace: number;
}

/**
 * Geometry optimization options
 */
export interface GeometryOptions {
  targetTriangles?: number;
  preserveUVSeams: boolean;
  mergeVertices: boolean;
  computeNormals: boolean;
  dracoCompression?: DracoOptions;
}

/**
 * Draco compression configuration
 */
export interface DracoOptions {
  quantizationBits: number;
  compressionLevel: number;
  preserveNormals: boolean;
  preserveUVs: boolean;
}

/**
 * GLB preprocessing configuration
 */
export interface PreprocessOptions {
  generateLODs: boolean;
  lodDistances: number[];
  compressTextures: boolean;
  optimizeGeometry: boolean;
  mergeSmallObjects: boolean;
}

/**
 * Processed asset with optimization results
 */
export interface ProcessedAsset {
  originalSize: number;
  optimizedSize: number;
  lodLevels: ProcessedLOD[];
  textureData: TextureOptimizationResult;
  instanceData?: InstanceMetadata;
}

/**
 * LOD level processing results
 */
export interface ProcessedLOD {
  level: number;
  geometry: BufferGeometry;
  triangleCount: number;
  distance: number;
  fileSize: number;
}

/**
 * Texture optimization results
 */
export interface TextureOptimizationResult {
  format: TextureFormat;
  compressionRatio: number;
  mipmapLevels: number;
  atlasInfo?: AtlasInfo;
}

/**
 * Texture atlas information
 */
export interface AtlasInfo {
  atlasId: string;
  uvOffset: Vector3;
  uvScale: Vector3;
  atlasSize: number;
}

/**
 * Instance metadata for processed assets
 */
export interface InstanceMetadata {
  geometryHash: string;
  materialHash: string;
  instanceCount: number;
  estimatedInstances: number;
}

/**
 * Optimized scene container
 */
export interface OptimizedScene {
  lodGroups: Map<string, LODGroup>;
  instanceGroups: Map<string, InstanceGroup>;
  cullingBounds: Box3[];
  textureAtlases: TextureAtlas[];
  performanceProfile: PerformanceProfile;
}

/**
 * Performance profile for scene optimization
 */
export interface PerformanceProfile {
  targetFPS: number;
  maxVRAM: number;
  qualityLevel: QualityPreset;
  adaptiveSettingsEnabled: boolean;
  hardwareTier: HardwareTier;
}

/**
 * Progress callback for asset loading
 */
export type ProgressCallback = (loaded: number, total: number, asset: string) => void;

// ============================================================================
// Frame Controller Interfaces
// ============================================================================

/**
 * Performance monitoring and quality adjustment system
 */
export interface FrameController {
  setTargetFPS(fps: number): void;
  setAdaptiveMode(enabled: boolean): void;
  adjustQuality(metrics: PerformanceMetrics): QualityAdjustment;
  applyQualityPreset(preset: QualityPreset): void;
  getPerformanceMetrics(): PerformanceMetrics;
  addPerformanceMonitor(monitor: PerformanceMonitor): void;
  setEmergencyThresholds(thresholds: EmergencyThresholds): void;
  getOptimizationHistory(): OptimizationEvent[];
}

/**
 * Real-time performance metrics
 */
export interface PerformanceMetrics {
  currentFPS: number;
  frameTime: number;
  frameTimeHistory: number[]; // Last 60 frames
  vramUsage: number;
  systemMemoryUsage: number;
  drawCalls: number;
  triangleCount: number;
  shaderSwitches: number;
  textureBindings: number;
  gpuTime: number;
  cpuTime: number;
}

/**
 * Quality adjustment recommendation
 */
export interface QualityAdjustment {
  changedSettings: Map<string, any>;
  expectedImprovement: number;
  reversible: boolean;
  priority: number;
}

/**
 * Emergency performance thresholds
 */
export interface EmergencyThresholds {
  minFPS: number;
  maxFrameTime: number;
  maxVRAMUsage: number;
  maxMemoryUsage: number;
  recoveryTimeoutMs: number;
}

/**
 * Performance optimization event for history tracking
 */
export interface OptimizationEvent {
  timestamp: number;
  trigger: OptimizationTrigger;
  adjustments: QualityAdjustment;
  before: PerformanceSnapshot;
  after: PerformanceSnapshot;
}

/**
 * Performance snapshot for before/after comparison
 */
export interface PerformanceSnapshot {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangleCount: number;
}

/**
 * Custom performance monitor plugin
 */
export interface PerformanceMonitor {
  name: string;
  measure(): number;
  threshold: number;
  criticalThreshold: number;
}

// ============================================================================
// Memory Manager Interfaces
// ============================================================================

/**
 * Memory tracking and cleanup system
 */
export interface MemoryManager {
  trackAsset(asset: Object3D, metadata: AssetMetadata): void;
  releaseAsset(assetId: string): boolean;
  performGarbageCollection(aggressiveness: number): MemoryReclaimed;
  getMemoryUsage(): MemoryUsageReport;
  setCleanupThresholds(thresholds: CleanupThresholds): void;
  optimizeMemoryLayout(): void;
  createMemoryPool(type: PoolType, size: number): MemoryPool;
}

/**
 * Memory usage report
 */
export interface MemoryUsageReport {
  totalAllocated: number;
  textureMemory: number;
  geometryMemory: number;
  shaderMemory: number;
  instanceMemory: number;
  availableVRAM: number;
  systemMemory: number;
}

/**
 * Memory cleanup thresholds
 */
export interface CleanupThresholds {
  vramWarningLevel: number; // 0.75
  vramCriticalLevel: number; // 0.90
  assetTimeoutMs: number; // 30000
  gcFrequencyMs: number; // 5000
}

/**
 * Garbage collection results
 */
export interface MemoryReclaimed {
  bytesFreed: number;
  assetsDisposed: number;
  texturesReleased: number;
  geometryCleaned: number;
}

/**
 * Memory pool for efficient resource allocation
 */
export interface MemoryPool {
  type: PoolType;
  size: number;
  allocated: number;
  available: number;
  allocate(size: number): ArrayBuffer | null;
  deallocate(buffer: ArrayBuffer): void;
  defragment(): void;
}

// ============================================================================
// Error Recovery Interfaces
// ============================================================================

/**
 * Error recovery strategy for performance failures
 */
export interface ErrorRecoveryStrategy {
  detectPerformanceFailure(metrics: PerformanceMetrics): FailureType | null;
  applyFallbackSettings(failure: FailureType): QualitySettings;
  attemptRecovery(timeoutMs: number): Promise<boolean>;
}

/**
 * Quality settings configuration
 */
export interface QualitySettings {
  shadowQuality: number; // 0-3
  textureQuality: number; // 0-3  
  reflectionQuality: number; // 0-2
  lodBias: number; // -1.0 to 1.0
  particleScale: number; // 0.1 to 1.0
  animationQuality: number; // 0-2
}

// ============================================================================
// Lighting Optimization Interfaces
// ============================================================================

/**
 * Lighting and shadow optimization system
 */
export interface LightingOptimizer {
  optimizeLighting(lights: Object3D[]): LightingConfig;
  createShadowMapPool(size: number): ShadowMapPool;
  performLightCulling(lights: Object3D[], camera: Camera): Object3D[];
  updateContactShadows(objects: Object3D[]): void;
}

/**
 * Optimized lighting configuration
 */
export interface LightingConfig {
  maxPointLights: number;
  shadowCascades: number;
  shadowMapSize: number;
  contactShadowsEnabled: boolean;
  lightCullingEnabled: boolean;
}

/**
 * Shadow map pool for efficient shadow texture reuse
 */
export interface ShadowMapPool {
  acquire(lightId: string): WebGLTexture;
  release(lightId: string): void;
  getUsageStats(): ShadowPoolStats;
}

/**
 * Shadow map pool statistics
 */
export interface ShadowPoolStats {
  totalMaps: number;
  activeMaps: number;
  memoryUsage: number;
  hitRate: number;
}

// ============================================================================
// Animation Optimization Interfaces  
// ============================================================================

/**
 * Animation and effects optimization system
 */
export interface AnimationOptimizer {
  optimizeCharacterAnimation(characters: Object3D[]): AnimationConfig;
  createParticlePool(maxParticles: number): ParticlePool;
  updateAnimationLOD(characters: Object3D[], camera: Camera): void;
  generateImpostors(characters: Object3D[]): ImpostorData[];
}

/**
 * Animation optimization configuration
 */
export interface AnimationConfig {
  useGPUAnimation: boolean;
  maxAnimatedCharacters: number;
  distantAnimationFPS: number;
  animationLODLevels: number[];
}

/**
 * Particle system pool for efficient particle management
 */
export interface ParticlePool {
  allocate(): Particle | null;
  deallocate(particle: Particle): void;
  getActiveCount(): number;
  update(deltaTime: number): void;
}

/**
 * Individual particle in the pool
 */
export interface Particle {
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  active: boolean;
}

/**
 * Impostor data for distant character rendering
 */
export interface ImpostorData {
  characterId: string;
  texture: Texture;
  billboard: Mesh;
  updateFrequency: number;
  lastUpdate: number;
}

// ============================================================================
// Hardware Compatibility Interfaces
// ============================================================================

/**
 * Hardware detection and compatibility system
 */
export interface HardwareDetector {
  detectGPUTier(): HardwareTier;
  checkWebGLFeatures(): WebGLFeatures;
  getBenchmarkScore(): Promise<number>;
  getOptimalSettings(tier: HardwareTier): PerformanceConfig;
}

/**
 * WebGL feature support detection
 */
export interface WebGLFeatures {
  webgl2Supported: boolean;
  instancedArrays: boolean;
  vertexArrayObjects: boolean;
  multipleRenderTargets: boolean;
  depthTextures: boolean;
  textureFloat: boolean;
  standardDerivatives: boolean;
  compressionS3TC: boolean;
  compressionASTC: boolean;
  compressionETC: boolean;
}

// ============================================================================
// Debug and Monitoring Interfaces
// ============================================================================

/**
 * Performance monitoring dashboard
 */
export interface PerformanceMonitorComponent {
  show(): void;
  hide(): void;
  updateMetrics(metrics: PerformanceMetrics): void;
  addGraph(name: string, data: number[]): void;
  setLODVisualization(enabled: boolean): void;
}

/**
 * Debug visualization helpers
 */
export interface DebugVisualizer {
  showFrustumBounds(camera: Camera): void;
  showOcclusionBounds(occluders: Object3D[]): void;
  showLODLevels(lodGroups: LODGroup[]): void;
  showInstanceGroups(instanceGroups: InstanceGroup[]): void;
  toggleWireframe(enabled: boolean): void;
}

// ============================================================================
// React Integration Interfaces
// ============================================================================

/**
 * React context for performance system
 */
export interface PerformanceContextValue {
  performanceSystem: PerformanceSystem | null;
  isInitialized: boolean;
  config: PerformanceConfig;
  metrics: PerformanceMetrics;
  updateConfig: (config: Partial<PerformanceConfig>) => void;
}

/**
 * Props for performance-optimized components
 */
export interface OptimizedMeshProps {
  geometry: BufferGeometry;
  material: Material;
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  enableLOD?: boolean;
  enableInstancing?: boolean;
  lodDistances?: number[];
  instanceThreshold?: number;
}

/**
 * Props for optimized scene wrapper
 */
export interface OptimizedSceneProps {
  children: React.ReactNode;
  performanceConfig?: Partial<PerformanceConfig>;
  enableDebug?: boolean;
  onPerformanceChange?: (metrics: PerformanceMetrics) => void;
}

// ============================================================================
// Utility Type Definitions
// ============================================================================

/**
 * Type-safe performance system events
 */
export type PerformanceSystemEvent = 
  | { type: 'initialized'; system: PerformanceSystem }
  | { type: 'qualityChanged'; settings: QualitySettings }
  | { type: 'memoryWarning'; usage: MemoryUsageReport }
  | { type: 'performanceDropped'; metrics: PerformanceMetrics }
  | { type: 'optimizationApplied'; event: OptimizationEvent };

/**
 * Callback for performance system events
 */
export type PerformanceEventCallback = (event: PerformanceSystemEvent) => void;

/**
 * Configuration for casino-specific optimizations
 */
export interface CasinoOptimizationConfig {
  slotMachineInstanceThreshold: number;
  palmTreeLODDistances: number[];
  casinoOcclusionBounds: Box3;
  expectedAssetCounts: Record<string, number>;
}