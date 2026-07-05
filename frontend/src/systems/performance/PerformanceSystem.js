/**
 * PerformanceSystem.js
 * 
 * Main Performance System orchestrator that coordinates all subsystem managers:
 * - Initialization flow connecting all subsystem managers
 * - Frame-based update loop with staggered expensive operations
 * - System shutdown and cleanup procedures
 * - Performance monitoring and metrics collection
 * 
 * Requirements: 1.1, 1.2
 */

import LODManager from './managers/LODManager';
import CullingSystem from './managers/CullingSystem';
import InstanceManager from './managers/InstanceManager';
import AssetOptimizer from './managers/AssetOptimizer';
import FrameController from './managers/FrameController';
import MemoryManager from './managers/MemoryManager';
import AnimationOptimizer from './animation/AnimationOptimizer';
import { EffectsOptimizer } from './animation/EffectsOptimizer';
import LightingOptimizer from './lighting/LightingOptimizer';
import { PerformanceLogger } from './debug/PerformanceLogger';
import HardwareDetector from './compatibility/HardwareDetector';
import { FallbackRenderer } from './compatibility/FallbackRenderer';

/**
 * PerformanceSystem - Main orchestrator managing all performance subsystems
 */
class PerformanceSystem {
  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    // Configuration
    this.options = {
      enableLOD: true,
      enableCulling: true,
      enableInstancing: true,
      enableAssetOptimization: true,
      enableAnimationOptimization: true,
      enableEffects: true,
      enableLightingOptimization: true,
      enableMemoryManagement: true,
      enableFrameControl: true,
      ...options,
    };
    
    // Initialization state
    this.initialized = false;
    this.isRunning = false;
    this.frameCount = 0;
    this.startTime = Date.now();
    
    // Subsystems
    this.managers = {
      lod: null,
      culling: null,
      instancing: null,
      assetOptimization: null,
      animation: null,
      effects: null,
      lighting: null,
      memory: null,
      frameControl: null,
    };
    
    // Hardware and compatibility
    this.hardwareDetector = null;
    this.fallbackRenderer = null;
    
    // Monitoring
    this.logger = null;
    this.metrics = {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      vramUsage: 0,
      lodDistribution: { high: 0, medium: 0, low: 0 },
    };
    
    // Update scheduling
    this.updateSchedule = {
      lod: 1, // Update every frame
      culling: 1,
      instancing: 2, // Update every 2 frames
      assetOptimization: 3,
      animation: 1,
      effects: 1,
      lighting: 2,
      memory: 5, // Update every 5 frames
      frameControl: 1,
    };
    
    this.initialize();
  }
  
  /**
   * Initialize all subsystems
   */
  initialize() {
    console.log('[PerformanceSystem] Initializing...');
    
    try {
      // Detect hardware capabilities
      this.initializeHardwareDetection();
      
      // Initialize subsystems in order
      if (this.options.enableMemoryManagement) {
        this.managers.memory = new MemoryManager();
      }
      
      if (this.options.enableFrameControl) {
        this.managers.frameControl = new FrameController(this);
      }
      
      if (this.options.enableLOD) {
        this.managers.lod = new LODManager(this);
      }
      
      if (this.options.enableCulling) {
        this.managers.culling = new CullingSystem(this);
      }
      
      if (this.options.enableInstancing) {
        this.managers.instancing = new InstanceManager(this);
      }
      
      if (this.options.enableAssetOptimization) {
        this.managers.assetOptimization = new AssetOptimizer(this);
      }
      
      if (this.options.enableAnimationOptimization) {
        this.managers.animation = new AnimationOptimizer(this);
      }
      
      if (this.options.enableEffects) {
        this.managers.effects = new EffectsOptimizer(this);
      }
      
      if (this.options.enableLightingOptimization) {
        this.managers.lighting = new LightingOptimizer(this);
      }
      
      // Initialize logger
      this.logger = new PerformanceLogger(1000, 10);
      
      // Apply fallback rendering if needed
      this.applyFallbackRendering();
      
      this.initialized = true;
      this.isRunning = true;
      
      console.log('[PerformanceSystem] Initialized successfully');
      console.log('[PerformanceSystem] Active managers:', this.getActiveManagers());
    } catch (error) {
      console.error('[PerformanceSystem] Initialization failed:', error);
      this.initialized = false;
    }
  }
  
  /**
   * Initialize hardware detection and compatibility
   */
  initializeHardwareDetection() {
    console.log('[PerformanceSystem] Detecting hardware...');
    
    this.hardwareDetector = new HardwareDetector();
    this.fallbackRenderer = new FallbackRenderer(this.hardwareDetector);
    
    // Log hardware info
    const summary = this.hardwareDetector.getSummary();
    console.log(`[PerformanceSystem] GPU Tier: ${summary.gpuTier}`);
    console.log(`[PerformanceSystem] Performance Tier: ${summary.performanceTier}`);
    
    // Get performance profile
    const profile = this.fallbackRenderer.getCompleteProfile();
    console.log('[PerformanceSystem] Performance Profile:', profile);
  }
  
  /**
   * Apply fallback rendering configuration
   */
  applyFallbackRendering() {
    if (!this.fallbackRenderer) return;
    
    // Apply scene optimizations
    this.fallbackRenderer.applyToScene(this.scene);
    
    // Configure renderer
    this.fallbackRenderer.configureRenderer(this.renderer);
    
    console.log('[PerformanceSystem] Fallback rendering applied');
  }
  
  /**
   * Get list of active managers
   */
  getActiveManagers() {
    return Object.entries(this.managers)
      .filter(([_, manager]) => manager !== null)
      .map(([name, _]) => name);
  }
  
  /**
   * Main update loop (called per frame)
   */
  update(deltaTime) {
    if (!this.initialized || !this.isRunning) return;
    
    this.frameCount++;
    const frameStart = performance.now();
    
    // Update managers based on schedule
    this.updateManagers(deltaTime);
    
    // Collect metrics
    this.collectMetrics();
    
    // Record performance
    if (this.logger) {
      this.logger.recordSnapshot(
        this.metrics.fps,
        this.metrics.frameTime,
        this.metrics.drawCalls,
        this.metrics.triangles,
        this.metrics.vramUsage,
        this.metrics.lodDistribution
      );
    }
    
    const frameEnd = performance.now();
    this.metrics.frameTime = frameEnd - frameStart;
  }
  
  /**
   * Update all managers based on schedule
   */
  updateManagers(deltaTime) {
    // Frame Control (always update)
    if (this.managers.frameControl && this.shouldUpdateManager('frameControl')) {
      if (typeof this.managers.frameControl.update === 'function') {
        this.managers.frameControl.update(deltaTime);
      }
    }
    
    // LOD Manager - call updateLODLevels instead of update
    if (this.managers.lod && this.shouldUpdateManager('lod')) {
      if (typeof this.managers.lod.updateLODLevels === 'function') {
        this.managers.lod.updateLODLevels(this.camera);
      }
    }
    
    // Culling System - call performFrustumCulling with all scene objects (deep traversal)
    // scene.children only contains top-level React groups; actual meshes are nested inside
    if (this.managers.culling && this.shouldUpdateManager('culling')) {
      if (typeof this.managers.culling.performFrustumCulling === 'function') {
        const allSceneObjects = [];
        this.scene.traverse((obj) => {
          if (obj !== this.scene) allSceneObjects.push(obj);
        });
        this.managers.culling.performFrustumCulling(allSceneObjects, this.camera);
      }
    }
    
    // Instance Manager - has no update method, skip
    if (this.managers.instancing && this.shouldUpdateManager('instancing')) {
      // InstanceManager doesn't have an update method - it's updated via registerForInstancing
      // Skip this
    }
    
    // Asset Optimizer
    if (this.managers.assetOptimization && this.shouldUpdateManager('assetOptimization')) {
      // Asset optimizer is updated via preloadNearbyAssets or manually
      // Skip automatic update
    }
    
    // Animation Optimizer
    if (this.managers.animation && this.shouldUpdateManager('animation')) {
      if (typeof this.managers.animation.update === 'function') {
        this.managers.animation.update(this.camera, this.scene, deltaTime);
      }
    }
    
    // Effects Optimizer
    if (this.managers.effects && this.shouldUpdateManager('effects')) {
      if (typeof this.managers.effects.update === 'function') {
        this.managers.effects.update(this.camera, deltaTime);
      }
    }
    
    // Lighting Optimizer
    if (this.managers.lighting && this.shouldUpdateManager('lighting')) {
      if (typeof this.managers.lighting.updateContactShadows === 'function') {
        this.managers.lighting.updateContactShadows(this.scene.children, this.camera);
      }
    }
    
    // Memory Manager
    if (this.managers.memory && this.shouldUpdateManager('memory')) {
      if (typeof this.managers.memory.performGarbageCollection === 'function') {
        this.managers.memory.performGarbageCollection(0.5);
      }
    }
  }
  
  /**
   * Check if a manager should update this frame
   */
  shouldUpdateManager(managerName) {
    const schedule = this.updateSchedule[managerName];
    return schedule && (this.frameCount % schedule === 0);
  }
  
  /**
   * Collect performance metrics
   */
  collectMetrics() {
    // FPS calculation (rough)
    const elapsed = (Date.now() - this.startTime) / 1000;
    if (elapsed > 0) {
      this.metrics.fps = Math.round(this.frameCount / elapsed);
    }
    
    // Get renderer info
    if (this.renderer && this.renderer.info) {
      this.metrics.drawCalls = this.renderer.info.render ? this.renderer.info.render.calls : 0;
      this.metrics.triangles = this.renderer.info.render ? this.renderer.info.render.triangles : 0;
    }
    
    // Get VRAM usage (rough estimate)
    if (this.managers.memory && typeof this.managers.memory.getMemoryUsage === 'function') {
      const memUsage = this.managers.memory.getMemoryUsage();
      this.metrics.vramUsage = memUsage ? memUsage.totalAllocated : 0;
    }
    
    // Get LOD distribution
    if (this.managers.lod && typeof this.managers.lod.getLODStats === 'function') {
      const lodStats = this.managers.lod.getLODStats();
      this.metrics.lodDistribution = {
        high: lodStats && lodStats.activeLOD0 ? lodStats.activeLOD0 : 0,
        medium: lodStats && lodStats.activeLOD1 ? lodStats.activeLOD1 : 0,
        low: lodStats && lodStats.activeLOD2 ? lodStats.activeLOD2 : 0,
      };
    }
  }
  
  /**
   * Register a LOD group
   */
  registerLODGroup(meshes, distances = null) {
    if (this.managers.lod) {
      return this.managers.lod.registerLODGroup(meshes, distances);
    }
    return null;
  }
  
  /**
   * Register meshes for instancing
   */
  registerForInstancing(meshes, threshold = 3) {
    if (this.managers.instancing) {
      return this.managers.instancing.registerMeshes(meshes, threshold);
    }
    return null;
  }
  
  /**
   * Register animated mesh
   */
  registerAnimatedMesh(mesh, animationClips) {
    if (this.managers.animation) {
      return this.managers.animation.registerAnimatedMesh(mesh, animationClips);
    }
    return false;
  }
  
  /**
   * Play animation
   */
  playAnimation(mesh, clipName, loop = true) {
    if (this.managers.animation) {
      return this.managers.animation.playAnimation(mesh, clipName, loop);
    }
    return false;
  }
  
  /**
   * Emit particles
   */
  emitParticles(systemName, position, velocity, count, life) {
    if (this.managers.effects) {
      return this.managers.effects.emit(systemName, position, velocity, count, life);
    }
  }
  
  /**
   * Enable/disable optimization feature
   */
  setFeatureEnabled(featureName, enabled) {
    if (this.logger) {
      this.logger.setFeatureStatus(featureName, enabled);
    }
    
    // Apply to specific managers
    if (featureName === 'lodEnabled' && this.managers.lod) {
      this.managers.lod.enabled = enabled;
    } else if (featureName === 'cullingEnabled' && this.managers.culling) {
      this.managers.culling.enabled = enabled;
    } else if (featureName === 'instancingEnabled' && this.managers.instancing) {
      this.managers.instancing.enabled = enabled;
    }
  }
  
  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Get draw call count
   */
  getDrawCallCount() {
    return this.metrics.drawCalls;
  }
  
  /**
   * Get triangle count
   */
  getTriangleCount() {
    return this.metrics.triangles;
  }
  
  /**
   * Get memory usage
   */
  getMemoryUsage() {
    return this.metrics.vramUsage;
  }
  
  /**
   * Get LOD distribution
   */
  getLODDistribution() {
    return this.metrics.lodDistribution;
  }
  
  /**
   * Get performance logger
   */
  getLogger() {
    return this.logger;
  }
  
  /**
   * Get hardware detector
   */
  getHardwareDetector() {
    return this.hardwareDetector;
  }
  
  /**
   * Get fallback renderer
   */
  getFallbackRenderer() {
    return this.fallbackRenderer;
  }
  
  /**
   * Get performance profile
   */
  getPerformanceProfile() {
    if (this.fallbackRenderer) {
      return this.fallbackRenderer.getCompleteProfile();
    }
    return null;
  }
  
  /**
   * Print system status to console
   */
  printStatus() {
    console.group('[PerformanceSystem] Status');
    console.log('Initialized:', this.initialized);
    console.log('Running:', this.isRunning);
    console.log('Frame Count:', this.frameCount);
    console.log('Active Managers:', this.getActiveManagers());
    console.log('Metrics:', this.getMetrics());
    console.groupEnd();
  }
  
  /**
   * Shutdown and cleanup
   */
  shutdown() {
    console.log('[PerformanceSystem] Shutting down...');
    
    this.isRunning = false;
    
    // Shutdown managers
    Object.values(this.managers).forEach(manager => {
      if (manager && typeof manager.dispose === 'function') {
        manager.dispose();
      }
    });
    
    // Shutdown logger
    if (this.logger) {
      this.logger.dispose();
    }
    
    // Shutdown hardware detector
    if (this.hardwareDetector) {
      this.hardwareDetector.dispose();
    }
    
    // Shutdown fallback renderer
    if (this.fallbackRenderer) {
      this.fallbackRenderer.dispose();
    }
    
    this.initialized = false;
    
    console.log('[PerformanceSystem] Shutdown complete');
  }
}

export default PerformanceSystem;
