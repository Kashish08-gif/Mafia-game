/**
 * HardwareDetector.js
 * 
 * GPU tier detection and WebGL feature detection with graceful fallback strategies:
 * - GPU tier detection (Low/Medium/High)
 * - WebGL feature detection with capability assessment
 * - Performance tier scaling (Low/Medium/High) for optimization aggressiveness
 * - Mobile WebGL compatibility with touch-optimized performance profiles
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.5
 */

/**
 * GPU Tier Detection and Capability Assessment
 */
class HardwareDetector {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.gl = null;
    this.gpuTier = 'medium'; // 'low', 'medium', 'high'
    this.performanceTier = 'medium'; // Optimization aggressiveness
    this.isMobile = false;
    this.isTablet = false;
    this.capabilities = {};
    this.webglVersion = 1;
    this.maxTextureSize = 2048;
    this.maxDrawBuffers = 1;
    this.maxCombinedTextureImageUnits = 8;
    this.maxVaryingVectors = 8;
    this.supportsCompressedTextures = false;
    this.compressedTextureFormats = [];
    
    // Feature flags
    this.features = {
      webgl2: false,
      instancedArrays: false,
      drawBuffers: false,
      depthTexture: false,
      textureFloat: false,
      textureHalfFloat: false,
      standardDerivatives: false,
      compressedTextures: false,
      occlusionQueries: false,
      timerQuery: false,
      shadingLanguageVersion: '1.0',
    };
    
    // Performance profiles
    this.performanceProfiles = {
      low: {
        maxDrawCalls: 500,
        maxTriangles: 1000000,
        maxInstances: 1000,
        maxParticles: 250,
        maxLights: 2,
        shadowQuality: 'low',
        textureQuality: 'low',
        lodAggressiveness: 1.5,
        cpuCulling: true,
      },
      medium: {
        maxDrawCalls: 1500,
        maxTriangles: 3000000,
        maxInstances: 5000,
        maxParticles: 500,
        maxLights: 4,
        shadowQuality: 'medium',
        textureQuality: 'medium',
        lodAggressiveness: 1.0,
        cpuCulling: true,
      },
      high: {
        maxDrawCalls: 4000,
        maxTriangles: 10000000,
        maxInstances: 10000,
        maxParticles: 1000,
        maxLights: 8,
        shadowQuality: 'high',
        textureQuality: 'high',
        lodAggressiveness: 0.5,
        cpuCulling: false,
      },
    };
    
    // Initialize detection
    this.detect();
  }
  
  /**
   * Main detection routine
   */
  detect() {
    console.log('[HardwareDetector] Starting hardware detection...');
    
    // Detect platform
    this.detectPlatform();
    
    // Initialize WebGL context
    this.initializeWebGL();
    
    // Detect capabilities
    this.detectWebGLCapabilities();
    
    // Detect GPU tier
    this.detectGPUTier();
    
    // Set performance tier
    this.setPerformanceTier();
    
    console.log('[HardwareDetector] Detection complete');
    console.log(this.getSummary());
  }
  
  /**
   * Detect platform (mobile, tablet, desktop)
   */
  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    this.isMobile = /mobile|android|iphone|ipod|opera mini/i.test(userAgent);
    this.isTablet = /tablet|ipad|android/i.test(userAgent) && !this.isMobile;
    
    console.log(`[HardwareDetector] Platform: ${this.isMobile ? 'Mobile' : this.isTablet ? 'Tablet' : 'Desktop'}`);
  }
  
  /**
   * Initialize WebGL context and check version
   */
  initializeWebGL() {
    try {
      // Try WebGL 2.0 first
      this.gl = this.canvas.getContext('webgl2', { antialias: false });
      if (this.gl) {
        this.webglVersion = 2;
        this.features.webgl2 = true;
        console.log('[HardwareDetector] WebGL 2.0 supported');
      }
    } catch (e) {
      console.log('[HardwareDetector] WebGL 2.0 not supported');
    }
    
    // Fallback to WebGL 1.0
    if (!this.gl) {
      try {
        this.gl = this.canvas.getContext('webgl', { antialias: false });
        if (this.gl) {
          this.webglVersion = 1;
          console.log('[HardwareDetector] WebGL 1.0 supported');
        }
      } catch (e) {
        console.error('[HardwareDetector] WebGL not supported');
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Detect WebGL capabilities
   */
  detectWebGLCapabilities() {
    if (!this.gl) return;
    
    // Get basic limits
    this.maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
    this.maxDrawBuffers = this.gl.getParameter(this.gl.MAX_DRAW_BUFFERS) || 1;
    this.maxCombinedTextureImageUnits = this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    this.maxVaryingVectors = this.gl.getParameter(this.gl.MAX_VARYING_VECTORS);
    
    console.log(`[HardwareDetector] Max Texture Size: ${this.maxTextureSize}`);
    console.log(`[HardwareDetector] Max Draw Buffers: ${this.maxDrawBuffers}`);
    console.log(`[HardwareDetector] Max Texture Units: ${this.maxCombinedTextureImageUnits}`);
    
    // Detect extensions
    this.detectExtensions();
  }
  
  /**
   * Detect WebGL extensions
   */
  detectExtensions() {
    if (!this.gl) return;
    
    // Instance arrays
    const instancedArrays = this.gl.getExtension('ANGLE_instanced_arrays');
    this.features.instancedArrays = !!instancedArrays;
    console.log(`[HardwareDetector] Instanced Arrays: ${instancedArrays ? 'Yes' : 'No'}`);
    
    // Draw buffers
    const drawBuffers = this.gl.getExtension('WEBGL_draw_buffers');
    this.features.drawBuffers = !!drawBuffers;
    console.log(`[HardwareDetector] Draw Buffers: ${drawBuffers ? 'Yes' : 'No'}`);
    
    // Depth texture
    const depthTexture = this.gl.getExtension('WEBGL_depth_texture');
    this.features.depthTexture = !!depthTexture;
    console.log(`[HardwareDetector] Depth Texture: ${depthTexture ? 'Yes' : 'No'}`);
    
    // Texture float
    const textureFloat = this.gl.getExtension('OES_texture_float');
    this.features.textureFloat = !!textureFloat;
    console.log(`[HardwareDetector] Texture Float: ${textureFloat ? 'Yes' : 'No'}`);
    
    // Texture half float
    const textureHalfFloat = this.gl.getExtension('OES_texture_half_float');
    this.features.textureHalfFloat = !!textureHalfFloat;
    console.log(`[HardwareDetector] Texture Half Float: ${textureHalfFloat ? 'Yes' : 'No'}`);
    
    // Standard derivatives
    const standardDerivatives = this.gl.getExtension('OES_standard_derivatives');
    this.features.standardDerivatives = !!standardDerivatives;
    console.log(`[HardwareDetector] Standard Derivatives: ${standardDerivatives ? 'Yes' : 'No'}`);
    
    // Compressed textures
    this.detectCompressedTextures();
    
    // Occlusion queries
    const occlusionQueries = this.gl.getExtension('OES_query_counter_bits');
    this.features.occlusionQueries = !!occlusionQueries;
    console.log(`[HardwareDetector] Occlusion Queries: ${occlusionQueries ? 'Yes' : 'No'}`);
    
    // Timer query
    const timerQuery = this.gl.getExtension('EXT_disjoint_timer_query');
    this.features.timerQuery = !!timerQuery;
    console.log(`[HardwareDetector] Timer Query: ${timerQuery ? 'Yes' : 'No'}`);
    
    // Shading language version
    const shadingLanguageVersion = this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION);
    this.features.shadingLanguageVersion = shadingLanguageVersion;
    console.log(`[HardwareDetector] GLSL Version: ${shadingLanguageVersion}`);
  }
  
  /**
   * Detect compressed texture support
   */
  detectCompressedTextures() {
    if (!this.gl) return;
    
    const formats = [
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_s3tc_srgb',
      'WEBGL_compressed_texture_etc1',
      'WEBGL_compressed_texture_astc',
      'WEBGL_compressed_texture_bc',
    ];
    
    formats.forEach(format => {
      const ext = this.gl.getExtension(format);
      if (ext) {
        this.compressedTextureFormats.push(format);
        this.supportsCompressedTextures = true;
      }
    });
    
    console.log(`[HardwareDetector] Compressed Textures: ${this.compressedTextureFormats.join(', ') || 'None'}`);
  }
  
  /**
   * Detect GPU tier based on capabilities
   */
  detectGPUTier() {
    let tier = 'low';
    let score = 0;
    
    // Score based on features
    score += this.features.webgl2 ? 3 : 0;
    score += this.features.instancedArrays ? 2 : 0;
    score += this.features.drawBuffers ? 2 : 0;
    score += this.features.depthTexture ? 2 : 0;
    score += this.features.textureFloat ? 1 : 0;
    score += this.features.compressedTextures ? 1 : 0;
    score += this.features.occlusionQueries ? 1 : 0;
    score += this.features.timerQuery ? 1 : 0;
    
    // Score based on texture size
    if (this.maxTextureSize >= 4096) score += 3;
    else if (this.maxTextureSize >= 2048) score += 2;
    else if (this.maxTextureSize >= 1024) score += 1;
    
    // Score based on draw buffers
    if (this.maxDrawBuffers >= 4) score += 2;
    else if (this.maxDrawBuffers >= 2) score += 1;
    
    // Platform adjustment
    if (this.isMobile) score *= 0.7;
    if (this.isTablet) score *= 0.85;
    
    // Determine tier
    if (score >= 15) {
      tier = 'high';
    } else if (score >= 8) {
      tier = 'medium';
    } else {
      tier = 'low';
    }
    
    this.gpuTier = tier;
    console.log(`[HardwareDetector] GPU Tier: ${tier} (Score: ${score.toFixed(1)})`);
  }
  
  /**
   * Set performance tier based on GPU tier and platform
   */
  setPerformanceTier() {
    let tier = this.gpuTier;
    
    // Adjust for platform
    if (this.isMobile) {
      tier = this.gpuTier === 'high' ? 'medium' : 'low';
    }
    
    this.performanceTier = tier;
    console.log(`[HardwareDetector] Performance Tier: ${tier}`);
  }
  
  /**
   * Get performance profile for current hardware
   */
  getPerformanceProfile() {
    return this.performanceProfiles[this.performanceTier];
  }
  
  /**
   * Get fallback rendering mode based on capabilities
   */
  getFallbackRenderingMode() {
    const capabilities = {
      useInstancedArrays: this.features.instancedArrays,
      useDrawBuffers: this.features.drawBuffers,
      useDepthTexture: this.features.depthTexture,
      useTextureFloat: this.features.textureFloat,
      useCompressedTextures: this.supportsCompressedTextures,
      maxLights: this.features.drawBuffers ? 8 : 4,
      maxShadowCascades: this.features.depthTexture ? 2 : 1,
      useCPUCulling: !this.features.occlusionQueries,
    };
    
    return capabilities;
  }
  
  /**
   * Check if a specific feature is supported
   */
  isFeatureSupported(featureName) {
    return this.features[featureName] ?? false;
  }
  
  /**
   * Get GPU vendor information
   */
  getGPUInfo() {
    if (!this.gl) return null;
    
    const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;
    
    return {
      vendor: this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
    };
  }
  
  /**
   * Get device information
   */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 'unknown',
      memory: navigator.deviceMemory || 'unknown',
      language: navigator.language,
    };
  }
  
  /**
   * Get comprehensive detection summary
   */
  getSummary() {
    return {
      gpuTier: this.gpuTier,
      performanceTier: this.performanceTier,
      platform: {
        isMobile: this.isMobile,
        isTablet: this.isTablet,
        deviceInfo: this.getDeviceInfo(),
      },
      webgl: {
        version: this.webglVersion,
        maxTextureSize: this.maxTextureSize,
        maxDrawBuffers: this.maxDrawBuffers,
        maxTextureUnits: this.maxCombinedTextureImageUnits,
        gpuInfo: this.getGPUInfo(),
      },
      features: this.features,
      capabilities: this.getFallbackRenderingMode(),
      profile: this.getPerformanceProfile(),
    };
  }
  
  /**
   * Print summary to console
   */
  printSummary() {
    console.group('[HardwareDetector] Summary');
    console.table(this.getSummary());
    console.groupEnd();
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    if (this.canvas) {
      this.canvas.remove();
    }
    this.gl = null;
  }
}

export default HardwareDetector;
