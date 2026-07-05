/**
 * Enums for the Casino Rendering Optimization Performance System
 * 
 * This file contains all enumeration types used throughout the performance
 * optimization system, including quality presets, asset types, and optimization triggers.
 */

/**
 * Quality presets for manual and automatic quality adjustment
 * Used by Frame_Controller for performance-based quality scaling
 */
export enum QualityPreset {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  ULTRA = "ultra",
}

/**
 * Hardware performance tiers for optimization strategy scaling
 * Automatically detected based on GPU capabilities and WebGL features
 */
export enum HardwareTier {
  LOW = "low",     // Mobile, integrated graphics
  MEDIUM = "medium", // Mid-range discrete GPU
  HIGH = "high",   // High-end discrete GPU
}

/**
 * Asset types for memory management and optimization categorization
 * Used by Memory_Manager for tracking different resource types
 */
export enum AssetType {
  GEOMETRY = "geometry",
  TEXTURE = "texture", 
  SHADER = "shader",
  ANIMATION = "animation",
  INSTANCE_DATA = "instanceData",
}

/**
 * Loading strategies for progressive asset loading
 * Used by Asset_Optimizer to prioritize asset loading order
 */
export enum LoadStrategy {
  IMMEDIATE = "immediate",   // Load immediately (essential assets)
  PROGRESSIVE = "progressive", // Load progressively based on priority
  ON_DEMAND = "on_demand",   // Load only when needed
  PREDICTIVE = "predictive", // Preload based on player movement prediction
}

/**
 * Texture compression formats for cross-platform compatibility
 * Used by Asset_Optimizer for texture optimization
 */
export enum TextureFormat {
  BC7 = "bc7",     // Color textures (Desktop)
  BC5 = "bc5",     // Normal maps (Desktop)
  BC4 = "bc4",     // Mask textures (Desktop)
  ASTC = "astc",   // Mobile compression
  ETC2 = "etc2",   // Mobile fallback
  UNCOMPRESSED = "uncompressed", // Fallback for unsupported hardware
}

/**
 * Sorting strategies for GPU instancing optimization
 * Used by Instance_Manager for render call optimization
 */
export enum SortingStrategy {
  NONE = "none",
  DISTANCE = "distance",
  DEPTH = "depth", 
  MATERIAL = "material",
}

/**
 * Optimization triggers for performance adjustments
 * Used by Frame_Controller to track what caused a quality change
 */
export enum OptimizationTrigger {
  FRAME_RATE_DROP = "frameRateDrop",
  MEMORY_PRESSURE = "memoryPressure",
  GPU_STALL = "gpuStall",
  USER_INITIATED = "userInitiated",
}

/**
 * Failure types for error recovery strategies
 * Used by Frame_Controller for appropriate fallback selection
 */
export enum FailureType {
  FRAME_RATE_DROP = "frameRateDrop",
  MEMORY_EXHAUSTION = "memoryExhaustion", 
  GPU_STALL = "gpuStall",
  ASSET_LOAD_TIMEOUT = "assetLoadTimeout",
}

/**
 * Memory pool types for resource management
 * Used by Memory_Manager for efficient resource allocation
 */
export enum PoolType {
  GEOMETRY = "geometry",
  TEXTURE = "texture",
  INSTANCE_MATRIX = "instanceMatrix",
  SHADER_UNIFORM = "shaderUniform",
}

/**
 * LOD transition states for smooth level switching
 * Used by LOD_Manager to prevent visual popping artifacts
 */
export enum TransitionState {
  NONE = "none",
  TRANSITIONING = "transitioning", 
  COMPLETED = "completed",
}