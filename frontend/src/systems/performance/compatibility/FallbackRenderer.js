/**
 * FallbackRenderer.js
 * 
 * Fallback rendering paths and React Three Fiber integration:
 * - Fallback rendering for hardware lacking advanced features
 * - Compatibility with existing React Three Fiber and drei components
 * - Performance preset system integrating with existing R3F ecosystem
 * 
 * Requirements: 13.2, 13.4
 */

import * as THREE from 'three';

/**
 * RenderingStrategy - Encapsulates rendering strategy based on capabilities
 */
class RenderingStrategy {
  constructor(capabilities) {
    this.capabilities = capabilities;
    this.name = 'base-strategy';
    this.maxDrawCalls = capabilities.maxDrawCalls || 1500;
    this.useInstancing = capabilities.useInstancedArrays;
    this.useDrawBuffers = capabilities.useDrawBuffers;
    this.useShadows = capabilities.maxShadowCascades > 0;
    this.shadowCascades = capabilities.maxShadowCascades || 1;
    this.maxLights = capabilities.maxLights || 4;
  }
  
  /**
   * Get material override for fallback rendering
   */
  getMaterialOverride(originalMaterial) {
    // Return fallback material if needed
    if (!this.capabilities.useDrawBuffers && originalMaterial.isMeshStandardMaterial) {
      // Use basic material instead of standard material
      return new THREE.MeshPhongMaterial({
        color: originalMaterial.color,
        map: originalMaterial.map,
        roughness: 0.5,
        specular: 0x111111,
      });
    }
    return originalMaterial;
  }
  
  /**
   * Get light configuration for strategy
   */
  getLightConfiguration() {
    return {
      maxPointLights: this.maxLights,
      maxDirectionalLights: 1,
      maxSpotLights: this.maxLights / 2,
      shadowCascades: this.shadowCascades,
    };
  }
  
  /**
   * Check if feature is available
   */
  isFeatureAvailable(featureName) {
    return this.capabilities[featureName] ?? false;
  }
}

/**
 * PerformancePreset - Preset configuration for performance tiers
 */
class PerformancePreset {
  constructor(tier, profile) {
    this.tier = tier; // 'low', 'medium', 'high'
    this.profile = profile;
    this.renderStrategy = new RenderingStrategy(this.getCapabilities());
  }
  
  /**
   * Get capabilities for this preset
   */
  getCapabilities() {
    const baseCapabilities = {
      useInstancedArrays: true,
      useDrawBuffers: true,
      useDepthTexture: true,
      useTextureFloat: true,
      useCompressedTextures: true,
      maxLights: 4,
      maxShadowCascades: 2,
      useCPUCulling: false,
    };
    
    if (this.tier === 'low') {
      return {
        useInstancedArrays: false,
        useDrawBuffers: false,
        useDepthTexture: false,
        useTextureFloat: false,
        useCompressedTextures: false,
        maxLights: 2,
        maxShadowCascades: 0,
        useCPUCulling: true,
      };
    } else if (this.tier === 'medium') {
      return {
        ...baseCapabilities,
        maxLights: 4,
        maxShadowCascades: 1,
      };
    }
    
    return baseCapabilities;
  }
  
  /**
   * Apply preset to renderer
   */
  applyToRenderer(renderer) {
    renderer.setPixelRatio(window.devicePixelRatio);
    
    if (this.tier === 'low') {
      renderer.shadowMap.enabled = false;
      renderer.shadowMap.type = THREE.BasicShadowMap;
    } else if (this.tier === 'medium') {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
    } else {
      renderer.shadowMap.enabled = true;
      // Use PCFShadowMap instead of deprecated PCFShadowMapSoftShadows
      renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    
    // In three.js r185+, sRGBEncoding is deprecated; use colorSpace instead
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  
  /**
   * Get maximum render targets for this preset
   */
  getMaxRenderTargets() {
    if (this.tier === 'low') return 1;
    if (this.tier === 'medium') return 2;
    return 4;
  }
  
  /**
   * Get texture settings for preset
   */
  getTextureSettings() {
    const settings = {
      low: {
        maxSize: 1024,
        mipmap: false,
        compress: true,
        format: 'BC1',
      },
      medium: {
        maxSize: 2048,
        mipmap: true,
        compress: true,
        format: 'BC3',
      },
      high: {
        maxSize: 4096,
        mipmap: true,
        compress: false,
        format: 'RGBA',
      },
    };
    
    return settings[this.tier] || settings.medium;
  }
}

/**
 * FallbackRenderer - Manages fallback rendering and compatibility
 */
class FallbackRenderer {
  constructor(hardwareDetector) {
    this.hardwareDetector = hardwareDetector;
    this.performanceTier = hardwareDetector.performanceTier;
    this.capabilities = hardwareDetector.getFallbackRenderingMode();
    this.preset = new PerformancePreset(this.performanceTier, hardwareDetector.getPerformanceProfile());
    this.strategy = this.preset.renderStrategy;
    this.materialOverrides = new Map();
    this.lightLimiter = null;
    this.renderTargetPool = [];
    
    console.log(`[FallbackRenderer] Initialized for ${this.performanceTier} tier`);
  }
  
  /**
   * Apply fallback configuration to three.js scene
   */
  applyToScene(scene) {
    // Limit lights in scene
    this.limitLights(scene);
    
    // Apply material overrides
    this.applyMaterialOverrides(scene);
    
    // Configure fog based on tier
    this.configureFog(scene);
  }
  
  /**
   * Limit number of lights in scene
   */
  limitLights(scene) {
    const lights = [];
    
    scene.traverse((obj) => {
      if (obj.isLight) {
        lights.push(obj);
      }
    });
    
    const maxLights = this.strategy.maxLights;
    const lightConfig = this.strategy.getLightConfiguration();
    
    // Disable extra lights
    if (lights.length > maxLights) {
      console.warn(`[FallbackRenderer] Scene has ${lights.length} lights, limiting to ${maxLights}`);
      
      for (let i = maxLights; i < lights.length; i++) {
        lights[i].visible = false;
      }
    }
    
    // Disable shadows for low tier
    if (this.performanceTier === 'low') {
      lights.forEach(light => {
        light.castShadow = false;
      });
    }
  }
  
  /**
   * Apply material overrides to scene
   */
  applyMaterialOverrides(scene) {
    scene.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const override = this.strategy.getMaterialOverride(obj.material);
        if (override !== obj.material) {
          obj.material = override;
          this.materialOverrides.set(obj.uuid, override);
        }
      }
    });
  }
  
  /**
   * Configure fog based on performance tier
   */
  configureFog(scene) {
    if (this.performanceTier === 'low') {
      // Add fog to reduce far clipping plane load
      scene.fog = new THREE.Fog(0x000000, 50, 200);
    } else if (this.performanceTier === 'medium') {
      scene.fog = new THREE.Fog(0x000000, 100, 400);
    }
  }
  
  /**
   * Get R3F component wrapper for optimized rendering
   */
  getR3FWrapper() {
    return {
      preset: this.performanceTier,
      shadowMap: this.performanceTier !== 'low',
      shadowMapType: this.performanceTier === 'high' ? 'pcf-soft' : 'pcf',
      antialias: this.performanceTier !== 'low',
      pixelRatio: window.devicePixelRatio * (this.performanceTier === 'low' ? 0.75 : 1),
      dpr: this.performanceTier === 'low' ? [0.5, 1] : [1, 2],
    };
  }
  
  /**
   * Create optimized render target
   */
  createRenderTarget(width, height, options = {}) {
    const target = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: this.performanceTier === 'high' ? THREE.FloatType : THREE.UnsignedByteType,
      depthBuffer: options.depthBuffer !== false,
      stencilBuffer: options.stencilBuffer === true,
      ...options,
    });
    
    this.renderTargetPool.push(target);
    return target;
  }
  
  /**
   * Get mesh optimization settings
   */
  getMeshOptimizationSettings() {
    return {
      low: {
        enableInstancing: false,
        enableLOD: true,
        lodLevels: 2,
        enableCulling: true,
        mergeGeometries: true,
        decimateGeometry: true,
      },
      medium: {
        enableInstancing: true,
        enableLOD: true,
        lodLevels: 3,
        enableCulling: true,
        mergeGeometries: false,
        decimateGeometry: false,
      },
      high: {
        enableInstancing: true,
        enableLOD: true,
        lodLevels: 4,
        enableCulling: true,
        mergeGeometries: false,
        decimateGeometry: false,
      },
    };
  }
  
  /**
   * Get asset loading settings
   */
  getAssetLoadingSettings() {
    return {
      low: {
        compressionFormat: 'draco',
        textureFormat: 'jpg',
        maxTextureResolution: 512,
        priorityLoading: true,
        preloadDistance: 10,
      },
      medium: {
        compressionFormat: 'draco',
        textureFormat: 'webp',
        maxTextureResolution: 1024,
        priorityLoading: true,
        preloadDistance: 30,
      },
      high: {
        compressionFormat: 'draco',
        textureFormat: 'png',
        maxTextureResolution: 2048,
        priorityLoading: false,
        preloadDistance: 50,
      },
    };
  }
  
  /**
   * Get performance budget settings
   */
  getPerformanceBudget() {
    const budgets = {
      low: {
        maxDrawCalls: 500,
        maxTriangles: 1000000,
        maxVRAM: 512, // MB
        targetFPS: 30,
        qualityReduction: 0.7,
      },
      medium: {
        maxDrawCalls: 1500,
        maxTriangles: 3000000,
        maxVRAM: 1024, // MB
        targetFPS: 60,
        qualityReduction: 1.0,
      },
      high: {
        maxDrawCalls: 4000,
        maxTriangles: 10000000,
        maxVRAM: 2048, // MB
        targetFPS: 60,
        qualityReduction: 1.0,
      },
    };
    
    return budgets[this.performanceTier];
  }
  
  /**
   * Get particle system settings
   */
  getParticleSystemSettings() {
    return {
      low: {
        maxParticles: 250,
        particleDensity: 0.5,
        maxEmitters: 3,
      },
      medium: {
        maxParticles: 500,
        particleDensity: 1.0,
        maxEmitters: 10,
      },
      high: {
        maxParticles: 1000,
        particleDensity: 1.0,
        maxEmitters: 20,
      },
    };
  }
  
  /**
   * Get animation settings
   */
  getAnimationSettings() {
    return {
      low: {
        enableGPUAnimation: false,
        updateFrequency: 15,
        boneLODReduction: 0.5,
      },
      medium: {
        enableGPUAnimation: false,
        updateFrequency: 30,
        boneLODReduction: 0.75,
      },
      high: {
        enableGPUAnimation: true,
        updateFrequency: 60,
        boneLODReduction: 1.0,
      },
    };
  }
  
  /**
   * Apply preset to renderer configuration
   */
  configureRenderer(renderer) {
    this.preset.applyToRenderer(renderer);
  }
  
  /**
   * Get complete performance profile
   */
  getCompleteProfile() {
    return {
      tier: this.performanceTier,
      r3f: this.getR3FWrapper(),
      meshOptimization: this.getMeshOptimizationSettings()[this.performanceTier],
      assetLoading: this.getAssetLoadingSettings()[this.performanceTier],
      performanceBudget: this.getPerformanceBudget(),
      particles: this.getParticleSystemSettings()[this.performanceTier],
      animation: this.getAnimationSettings()[this.performanceTier],
      capabilities: this.capabilities,
    };
  }
  
  /**
   * Print profile to console
   */
  printProfile() {
    console.group(`[FallbackRenderer] ${this.performanceTier.toUpperCase()} Tier Profile`);
    console.table(this.getCompleteProfile());
    console.groupEnd();
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    this.renderTargetPool.forEach(target => {
      target.dispose();
    });
    this.renderTargetPool = [];
    this.materialOverrides.clear();
  }
}

export { FallbackRenderer, PerformancePreset, RenderingStrategy };
