/**
 * Constants for the Casino Rendering Optimization Performance System
 * 
 * This file contains all performance targets, thresholds, and configuration values
 * used throughout the optimization system. Values are derived from requirements analysis.
 */

/**
 * Performance Targets (Requirements 1.1-1.5)
 */
export const PERFORMANCE_TARGETS = {
  // Target frame rate for normal gameplay
  TARGET_FPS: 60,
  TARGET_FRAME_TIME_MS: 16.67, // 1000ms / 60fps

  // Performance thresholds for quality adjustment
  FRAME_TIME_WARNING_MS: 20, // Trigger quality reduction
  MINIMUM_FPS: 30, // Emergency threshold
  QUALITY_ADJUSTMENT_FPS: 45, // Start reducing quality below this FPS

  // Memory limits
  MAX_VRAM_USAGE_GB: 2.0,
  VRAM_WARNING_THRESHOLD: 0.75, // 75% of available
  VRAM_CRITICAL_THRESHOLD: 0.90, // 90% of available
  SYSTEM_MEMORY_CRITICAL: 0.90, // 90% of system memory

  // Loading performance
  MAX_SCENE_LOAD_TIME_MS: 3000, // 3 seconds for complete casino scene
} as const;

/**
 * LOD (Level of Detail) Configuration (Requirements 2.1-2.6)
 */
export const LOD_CONFIG = {
  // Distance thresholds for LOD level switching
  HIGH_DETAIL_DISTANCE: 15, // LOD 0 - within 15 units
  MEDIUM_DETAIL_DISTANCE: 35, // LOD 1 - 15-35 units
  LOW_DETAIL_DISTANCE: 35, // LOD 2 - beyond 35 units

  // LOD generation parameters
  TARGET_REDUCTIONS: [0.7, 0.4, 0.15], // 70%, 40%, 15% triangle counts for LOD 1, 2, 3
  MINIMUM_TRIANGLES: 50, // Minimum triangles before switching to billboard
  SCREEN_SIZE_THRESHOLD: 0.1, // Minimum screen size ratio for detail switching

  // Transition smoothing
  TRANSITION_DURATION_MS: 200, // Duration for smooth LOD transitions
  PRESERVE_UV_BOUNDARIES: true,
  PRESERVE_NORMALS: true,
  GENERATE_BILLBOARDS: true,
} as const;

/**
 * Culling System Configuration (Requirements 3.1-3.5)
 */
export const CULLING_CONFIG = {
  // Occlusion culling update frequency
  OCCLUSION_TEST_FREQUENCY: 5, // Test every 5 frames
  
  // Frustum culling margins
  FRUSTUM_MARGIN: 1.1, // 10% margin for smooth culling transitions
  
  // Shadow casting optimization
  MIN_SHADOW_CASTER_SIZE: 4, // 2x2 units minimum for shadow casting
  
  // Performance settings
  MAX_OCCLUSION_TESTS_PER_FRAME: 20,
  OCCLUSION_QUERY_TIMEOUT_MS: 5, // Maximum time to wait for GPU query results
} as const;

/**
 * GPU Instancing Configuration (Requirements 4.1-4.5)
 */
export const INSTANCING_CONFIG = {
  // Instance thresholds
  MIN_INSTANCE_COUNT: 3, // Minimum objects before instancing
  SLOT_MACHINE_THRESHOLD: 6, // Use instancing for 6+ slot machines
  
  // Instance limits
  MAX_INSTANCES_PER_GROUP: 1000,
  MAX_INSTANCE_GROUPS: 50,
  
  // Performance settings
  INSTANCE_CULLING_ENABLED: true,
  DYNAMIC_INSTANCE_UPDATES: true,
} as const;

/**
 * Asset Loading Configuration (Requirements 5.1-5.5)
 */
export const ASSET_LOADING_CONFIG = {
  // Progressive loading priorities (0 = highest, 2 = lowest)
  PRIORITY_GROUND_PLANE: 0,
  PRIORITY_MAIN_BUILDING: 0, 
  PRIORITY_ESSENTIAL_FURNITURE: 1,
  PRIORITY_DECORATIVE_ELEMENTS: 2,

  // Predictive loading
  MOVEMENT_PREDICTION_RADIUS: 50, // Units ahead to preload
  MOVEMENT_VELOCITY_THRESHOLD: 2, // Minimum velocity for prediction

  // Placeholder settings
  PLACEHOLDER_MODEL_SIZE_KB: 10, // Size of low-res placeholder models
  STREAMING_REPLACEMENT_ENABLED: true,
} as const;

/**
 * Texture and Material Optimization (Requirements 6.1-6.5)
 */
export const TEXTURE_CONFIG = {
  // Compression settings
  DEFAULT_COMPRESSION_QUALITY: 0.8, // 80% quality level
  MAX_TEXTURE_SIZE: 2048, // Maximum texture resolution
  GENERATE_MIPMAPS: true,
  
  // Atlas settings
  ATLAS_SIZE: 2048,
  MIN_ATLAS_EFFICIENCY: 0.75, // Minimum 75% atlas space utilization
  
  // LOD texture streaming
  TEXTURE_STREAMING_ENABLED: true,
  DISTANT_TEXTURE_RESOLUTION_SCALE: 0.5, // 50% resolution for distant objects
} as const;

/**
 * Dynamic Quality Adjustment (Requirements 7.1-7.4)
 */
export const QUALITY_CONFIG = {
  // Performance monitoring
  PERFORMANCE_HISTORY_FRAMES: 60, // Track last 60 frames
  QUALITY_ADJUSTMENT_DELAY_MS: 1000, // Wait 1 second before reducing quality
  QUALITY_RESTORATION_DELAY_MS: 5000, // Wait 5 seconds before restoring quality

  // Hysteresis to prevent oscillation
  FPS_HYSTERESIS: 5, // 5 FPS difference needed to trigger opposite adjustment
  MEMORY_HYSTERESIS_MB: 100, // 100MB difference for memory adjustments

  // Quality reduction steps
  SHADOW_QUALITY_LEVELS: 4, // 4 shadow quality levels
  TEXTURE_QUALITY_STEPS: [1.0, 0.75, 0.5, 0.25], // Texture resolution scaling
  REFLECTION_QUALITY_LEVELS: 3, // 3 reflection quality levels
} as const;

/**
 * Lighting and Shadow Optimization (Requirements 8.1-8.5)
 */
export const LIGHTING_CONFIG = {
  // Shadow mapping
  MAX_SHADOW_CASCADES: 2,
  SHADOW_MAP_SIZE: 1024,
  SHADOW_MAP_POOL_SIZE: 8,

  // Light culling  
  MAX_POINT_LIGHTS_PER_PIXEL: 4,
  LIGHT_CULLING_TILE_SIZE: 16,

  // Screen space shadows
  MIN_SHADOW_CASTER_SCREEN_SIZE: 0.02, // 2% of screen size
  CONTACT_SHADOW_ENABLED: true,
  CONTACT_SHADOW_DISTANCE: 2.0,
} as const;

/**
 * Animation and Effects (Requirements 9.1-9.5)
 */
export const ANIMATION_CONFIG = {
  // Particle limits
  MAX_ACTIVE_PARTICLES: 500,
  PARTICLE_POOL_SIZE: 1000,

  // Animation optimization
  GPU_ANIMATION_CHARACTER_THRESHOLD: 3, // Use GPU animation for 3+ characters
  DISTANT_ANIMATION_FPS: 15, // 15fps for characters beyond 25 units
  DISTANT_CHARACTER_THRESHOLD: 25, // Distance threshold for reduced animation
  
  // Impostor rendering
  IMPOSTOR_DISTANCE_THRESHOLD: 40, // Use impostors beyond 40 units
  ANIMATION_LOD_BONE_REDUCTION: [1.0, 0.7, 0.4], // Bone count reduction by distance
} as const;

/**
 * Memory Management (Requirements 10.1-10.5)
 */
export const MEMORY_CONFIG = {
  // Cleanup thresholds
  ASSET_TIMEOUT_MS: 30000, // 30 seconds before disposing unused assets
  GC_FREQUENCY_MS: 5000, // Run garbage collection every 5 seconds
  
  // Memory pools
  GEOMETRY_POOL_SIZE_MB: 100,
  TEXTURE_POOL_SIZE_MB: 200, 
  INSTANCE_DATA_POOL_SIZE_MB: 50,

  // Emergency thresholds
  EMERGENCY_CLEANUP_THRESHOLD: 0.95, // 95% memory usage triggers emergency cleanup
  REFERENCE_COUNT_CLEANUP_DELAY_MS: 1000, // Wait 1 second after reference count hits 0
} as const;

/**
 * Performance Monitoring (Requirements 12.1-12.5)
 */
export const MONITORING_CONFIG = {
  // Real-time metrics
  FPS_SMOOTHING_FACTOR: 0.1, // Exponential moving average factor
  METRICS_UPDATE_FREQUENCY_MS: 100, // Update metrics every 100ms
  PERFORMANCE_GRAPH_DURATION_S: 60, // 60 seconds of performance history
  
  // Debug visualization
  DEBUG_GUI_ENABLED: true,
  HOTKEY_TOGGLES_ENABLED: true,
  LOD_VISUALIZATION_ENABLED: false, // Can be toggled at runtime

  // Logging
  LOG_PERFORMANCE_DROPS: true,
  DETAILED_TIMING_ENABLED: false, // Enable for development only
  OPTIMIZATION_HISTORY_SIZE: 100, // Keep last 100 optimization events
} as const;

/**
 * Cross-Platform Compatibility (Requirements 13.1-13.5)
 */
export const COMPATIBILITY_CONFIG = {
  // WebGL feature detection
  REQUIRED_WEBGL_VERSION: 2,
  FALLBACK_TO_WEBGL1: true,
  
  // Mobile optimization
  MOBILE_PERFORMANCE_SCALE: 0.6, // 60% performance scaling for mobile
  MOBILE_TEXTURE_SCALE: 0.5, // 50% texture resolution on mobile
  MOBILE_PARTICLE_SCALE: 0.3, // 30% particle count on mobile

  // Hardware detection
  GPU_TIER_DETECTION_ENABLED: true,
  PERFORMANCE_BENCHMARKING_ENABLED: false, // Enable for initial hardware assessment
  
  // React Three Fiber compatibility
  R3F_INTEGRATION_MODE: "wrapper", // "wrapper" or "replacement"
  DREI_COMPATIBILITY_MODE: true,
} as const;

/**
 * Casino-Specific Configuration
 * Optimizations specific to the casino scene layout and assets
 */
export const CASINO_CONFIG = {
  // Asset identification
  SLOT_MACHINE_MODEL_NAME: "casion_slot-machine.glb",
  PALM_TREE_MODEL_NAME: "plant_series__palm_tree.glb", 
  MAIN_BUILDING_MODEL_NAME: "grand_casino.glb",
  
  // Scene-specific optimizations
  CASINO_OCCLUSION_BOUNDS_SIZE: 100, // Size of main building for occlusion culling
  TYPICAL_CASINO_SCENE_SIZE: 200, // Typical scene bounds in units
  
  // Expected asset counts for optimization
  EXPECTED_SLOT_MACHINE_COUNT: 12,
  EXPECTED_PALM_TREE_COUNT: 8,
  EXPECTED_TABLE_COUNT: 6,
} as const;