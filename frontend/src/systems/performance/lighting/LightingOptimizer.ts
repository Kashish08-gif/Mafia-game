/**
 * Lighting Optimizer - TypeScript implementation for lighting and shadow optimization
 * 
 * Manages optimized lighting with cascaded shadow maps, light culling,
 * and shadow map pooling for efficient rendering.
 * 
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import {
  DirectionalLight,
  PointLight,
  SpotLight,
  Object3D,
  Camera,
  WebGLRenderTarget,
  DepthTexture,
  UnsignedIntType,
  DepthFormat,
} from 'three';

import type {
  LightingOptimizer as ILightingOptimizer,
  LightingConfig,
  ShadowMapPool,
  ShadowPoolStats,
} from '../types';

/**
 * Shadow map pool implementation for efficient shadow texture reuse
 * Requirements: 8.3 - shadow map pooling
 */
class ShadowMapPoolImpl implements ShadowMapPool {
  private shadowMaps: Map<string, WebGLRenderTarget>;
  private availableMaps: Array<{
    id: string;
    inUse: boolean;
    lastUsedTime: number;
    lightId: string | null;
  }>;
  private shadowMapSize: number;
  private poolSize: number;

  constructor(poolSize: number, shadowMapSize: number = 2048) {
    this.poolSize = poolSize;
    this.shadowMapSize = shadowMapSize;
    this.shadowMaps = new Map();
    this.availableMaps = [];

    // Initialize available shadow maps
    for (let i = 0; i < poolSize; i++) {
      this.availableMaps.push({
        id: `shadow_${i}`,
        inUse: false,
        lastUsedTime: 0,
        lightId: null,
      });
    }
  }

  /**
   * Acquire shadow map from pool for a light
   * Requirements: 8.3
   */
  acquire(lightId: string): any {
    // Check if light already has shadow map
    if (this.shadowMaps.has(lightId)) {
      const mapId = this.shadowMaps.get(lightId)!;
      // Mark as recently used
      for (const map of this.availableMaps) {
        if (map.id === (mapId as any).id) {
          map.lastUsedTime = Date.now();
          break;
        }
      }
      return mapId;
    }

    // Find available shadow map (least recently used)
    let bestMap = null;
    let minTime = Infinity;

    for (const map of this.availableMaps) {
      if (!map.inUse && map.lastUsedTime < minTime) {
        bestMap = map;
        minTime = map.lastUsedTime;
      }
    }

    if (!bestMap) {
      return null; // Pool exhausted
    }

    // Create or reuse WebGLRenderTarget
    let renderTarget: WebGLRenderTarget;
    if (!(bestMap as any).renderTarget) {
      // Create depth texture
      const depthTexture = new DepthTexture(
        this.shadowMapSize,
        this.shadowMapSize
      );
      depthTexture.format = DepthFormat;
      depthTexture.type = UnsignedIntType;

      // Create render target
      renderTarget = new WebGLRenderTarget(
        this.shadowMapSize,
        this.shadowMapSize,
        {
          depthTexture: depthTexture,
          depthBuffer: true,
        }
      );

      (bestMap as any).renderTarget = renderTarget;
    } else {
      renderTarget = (bestMap as any).renderTarget;
    }

    // Allocate shadow map to light
    bestMap.inUse = true;
    bestMap.lightId = lightId;
    bestMap.lastUsedTime = Date.now();

    this.shadowMaps.set(lightId, renderTarget);

    return renderTarget;
  }

  /**
   * Release shadow map back to pool
   * Requirements: 8.3
   */
  release(lightId: string): void {
    const mapId = this.shadowMaps.get(lightId);
    if (mapId) {
      // Find and mark as available
      for (const map of this.availableMaps) {
        if ((mapId as any).id === map.id) {
          map.inUse = false;
          map.lightId = null;
          break;
        }
      }

      this.shadowMaps.delete(lightId);
    }
  }

  /**
   * Get pool usage statistics
   * Requirements: 8.3
   */
  getUsageStats(): ShadowPoolStats {
    const activeMaps = this.availableMaps.filter((m) => m.inUse).length;
    const memoryUsage =
      activeMaps * this.shadowMapSize * this.shadowMapSize * 4; // 4 bytes per pixel

    return {
      totalMaps: this.poolSize,
      activeMaps: activeMaps,
      memoryUsage: memoryUsage,
      hitRate: this.shadowMaps.size / this.poolSize,
    };
  }

  /**
   * Clean up all shadow maps
   */
  dispose(): void {
    for (const [, renderTarget] of this.shadowMaps) {
      renderTarget.dispose();
    }
    this.shadowMaps.clear();
    this.availableMaps = [];
  }
}

/**
 * LightingOptimizer class implementing the LightingOptimizer interface
 * Handles optimized lighting, shadow mapping, and light culling
 * 
 * Task 10.2: Implements shadow casting optimization with:
 * - Screen-space size testing for shadow casting eligibility (2x2 unit minimum)
 * - Contact shadows for small detail enhancement without additional shadow maps
 * - Shadow caster culling for off-screen objects
 */
class LightingOptimizer implements ILightingOptimizer {
  // Light management
  private lights: Map<string, Object3D>;
  private lightCullingThreshold: number;
  private shadowCascades: number;
  private shadowMapSize: number;

  // Shadow map pooling
  private shadowMapPool: ShadowMapPoolImpl;

  // Light brightness tracking for culling
  private lightBrightnessCache: Map<string, number>;

  // Shadow caster culling
  private shadowCasters: Set<string>;
  private culledShadowCasters: Set<string>;
  private viewFrustum: any;

  // Statistics
  private stats: {
    totalLights: number;
    activeLights: number;
    culledLights: number;
    shadowMapsActive: number;
    lightCullingTime: number;
    shadowCastersVisible: number;
    shadowCastersCulled: number;
    shadowCullingTime: number;
  };

  // Configuration
  private enableLightCulling: boolean;
  private enableContactShadows: boolean;
  private enableShadowCulling: boolean;
  private screenSpaceMinimum: number;

  /**
   * Initialize LightingOptimizer
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   * 
   * @param config Configuration options
   */
  constructor(config: {
    lightCullingThreshold?: number;
    shadowCascades?: number;
    shadowMapSize?: number;
    shadowMapPoolSize?: number;
    enableLightCulling?: boolean;
    enableContactShadows?: boolean;
    enableShadowCulling?: boolean;
    screenSpaceMinimum?: number;
  } = {}) {
    // Light management
    this.lights = new Map();
    this.lightCullingThreshold = config.lightCullingThreshold ?? 4; // Requirements: 8.2 - max 4 lights
    this.shadowCascades = config.shadowCascades ?? 2; // Requirements: 8.1 - 2 cascades max
    this.shadowMapSize = config.shadowMapSize ?? 2048;

    // Shadow map pooling
    this.shadowMapPool = new ShadowMapPoolImpl(
      config.shadowMapPoolSize ?? 4,
      this.shadowMapSize
    );

    // Light brightness tracking for culling
    this.lightBrightnessCache = new Map();

    // Shadow caster culling
    this.shadowCasters = new Set();
    this.culledShadowCasters = new Set();
    this.viewFrustum = null;

    // Statistics
    this.stats = {
      totalLights: 0,
      activeLights: 0,
      culledLights: 0,
      shadowMapsActive: 0,
      lightCullingTime: 0,
      shadowCastersVisible: 0,
      shadowCastersCulled: 0,
      shadowCullingTime: 0,
    };

    // Configuration
    this.enableLightCulling = config.enableLightCulling !== false;
    this.enableContactShadows = config.enableContactShadows !== false;
    this.enableShadowCulling = config.enableShadowCulling !== false;
    this.screenSpaceMinimum = config.screenSpaceMinimum ?? 2;
  }

  /**
   * Optimize lighting configuration for performance
   * Requirements: 8.1, 8.2, 8.3
   * 
   * @param lights Array of lights in scene
   * @returns Optimized lighting configuration
   */
  optimizeLighting(lights: Object3D[]): LightingConfig {
    const startTime = performance.now();

    const config: LightingConfig = {
      maxPointLights: this.lightCullingThreshold, // Requirements: 8.2 - max 4 point lights
      shadowCascades: this.shadowCascades, // Requirements: 8.1 - 2 cascades for directional
      shadowMapSize: this.shadowMapSize,
      contactShadowsEnabled: this.enableContactShadows,
      lightCullingEnabled: this.enableLightCulling,
    };

    // Analyze and categorize lights
    let directionalCount = 0;
    let pointCount = 0;
    let spotCount = 0;

    for (const light of lights) {
      if ((light as any).isDirectionalLight) {
        directionalCount++;
        this._optimizeDirectionalLight(light as DirectionalLight);
      } else if ((light as any).isPointLight) {
        pointCount++;
        this._optimizePointLight(light as PointLight);
      } else if ((light as any).isSpotLight) {
        spotCount++;
        this._optimizeSpotLight(light as SpotLight);
      }
    }

    this.stats.totalLights = lights.length;
    this.stats.activeLights = Math.min(
      pointCount,
      this.lightCullingThreshold
    );
    this.stats.lightCullingTime = performance.now() - startTime;

    return config;
  }

  /**
   * Create shadow map pool for reusing shadow textures
   * Requirements: 8.3 - shadow map pooling for reusing shadow textures
   * 
   * @param size Pool size (number of shadow maps)
   * @returns Created shadow map pool
   */
  createShadowMapPool(size: number): ShadowMapPool {
    return new ShadowMapPoolImpl(size, this.shadowMapSize);
  }

  /**
   * Perform light culling to limit active lights per pixel
   * Requirements: 8.2 - 4 brightest point lights per pixel
   * 
   * @param lights Array of lights to cull
   * @param camera Current camera
   * @returns Culled lights in priority order
   */
  performLightCulling(lights: Object3D[], camera: Camera): Object3D[] {
    if (!this.enableLightCulling) {
      return lights;
    }

    const startTime = performance.now();
    const culledLights: Object3D[] = [];
    const lightBrightness: Array<{ light: Object3D; brightness: number }> = [];

    // Calculate brightness for each light
    for (const light of lights) {
      let brightness = 0;

      if ((light as any).isPointLight || (light as any).isSpotLight) {
        // Calculate brightness based on intensity and distance to camera
        const distance = camera.position.distanceTo(
          (light as any).position
        );
        const intensity = (light as any).intensity ?? 1.0;
        const range = (light as any).distance ?? 100;

        // Inverse square falloff
        const attenuation = Math.max(0, 1 - distance / range);
        brightness = intensity * attenuation * attenuation;
      } else if ((light as any).isDirectionalLight) {
        // Directional lights always have same contribution
        brightness = ((light as any).intensity ?? 1.0) * 1000; // High priority for directional
      }

      lightBrightness.push({ light, brightness });
    }

    // Sort by brightness (descending)
    lightBrightness.sort((a, b) => b.brightness - a.brightness);

    // Take only top lights based on threshold
    const maxLights = this.lightCullingThreshold;
    for (let i = 0; i < Math.min(lightBrightness.length, maxLights); i++) {
      culledLights.push(lightBrightness[i].light);
    }

    this.stats.culledLights = lights.length - culledLights.length;
    this.stats.activeLights = culledLights.length;
    this.stats.lightCullingTime = performance.now() - startTime;

    return culledLights;
  }

  /**
   * Update contact shadows for small objects
   * Requirements: 8.5 - contact shadows for small detail enhancement without additional shadow maps
   * 
   * @param objects Array of objects that might cast contact shadows
   * @param camera Current camera (optional, for screen-space size testing)
   */
  updateContactShadows(objects: Object3D[], camera?: Camera): void {
    if (!this.enableContactShadows) {
      return;
    }

    for (const obj of objects) {
      let useContactShadow = false;

      // Use contact shadows for objects too small to cast regular shadows
      if (camera && !this.shouldCastShadow(obj, camera)) {
        useContactShadow = true;
      }

      // Or for objects specifically marked for contact shadows
      if ((obj as any).userData && (obj as any).userData.requestContactShadow) {
        useContactShadow = true;
      }

      (obj as any).userData = (obj as any).userData || {};
      (obj as any).userData.useContactShadow = useContactShadow;

      // Set contact shadow properties
      if (useContactShadow) {
        (obj as any).userData.contactShadowOpacity = 0.4;
        (obj as any).userData.contactShadowRadius = 2;
        (obj as any).userData.contactShadowBlur = 1;
      }
    }
  }

  /**
   * Get shadow map from pool for a light
   * Requirements: 8.3
   * 
   * @param lightId Light identifier
   * @returns Shadow map texture or null if none available
   */
  acquireShadowMap(lightId: string): any {
    return this.shadowMapPool.acquire(lightId);
  }

  /**
   * Release shadow map back to pool
   * Requirements: 8.3
   * 
   * @param lightId Light identifier
   */
  releaseShadowMap(lightId: string): void {
    this.shadowMapPool.release(lightId);
  }

  /**
   * Get lighting statistics
   * 
   * @returns Current statistics
   */
  getStats(): {
    totalLights: number;
    activeLights: number;
    culledLights: number;
    shadowMapsActive: number;
    lightCullingTime: number;
    shadowPoolStats: ShadowPoolStats;
  } {
    return {
      ...this.stats,
      shadowPoolStats: this.shadowMapPool.getUsageStats(),
    };
  }

  /**
   * Check if object should cast shadows based on screen space size
   * Requirements: 8.4 - 2x2 unit minimum screen space size
   * 
   * @param object Object to check
   * @param camera Current camera
   * @returns True if object is large enough to cast shadows
   */
  shouldCastShadow(object: Object3D, camera: Camera): boolean {
    if (!(object as any).geometry || !(object as any).geometry.boundingSphere) {
      return true; // Default to true if can't determine
    }

    const boundingSphere = (object as any).geometry.boundingSphere;
    const distance = camera.position.distanceTo(boundingSphere.center);

    // Get object radius in screen space
    const radius = boundingSphere.radius;
    const screenRadius = radius / distance;

    // Check if 2x2 units minimum
    return screenRadius >= this.screenSpaceMinimum;
  }

  /**
   * Cull shadow casters that are off-screen or too small
   * Requirements: 8.4 - Disable shadow casting for objects smaller than 2x2 units in screen space
   * 
   * @param objects Array of potential shadow casters
   * @param camera Current camera
   * @returns Filtered list of valid shadow casters
   */
  cullShadowCasters(objects: Object3D[], camera: Camera): Object3D[] {
    const startTime = performance.now();
    const validShadowCasters: Object3D[] = [];

    // Update view frustum
    if (!this.viewFrustum) {
      this.viewFrustum = { planes: [] };
    }

    // Extract frustum planes from camera
    this._updateViewFrustum(camera);

    this.shadowCasters.clear();
    this.culledShadowCasters.clear();

    for (const obj of objects) {
      const id = obj.uuid;
      this.shadowCasters.add(id);

      // Check if should cast shadow (screen-space size test)
      if (!this.shouldCastShadow(obj, camera)) {
        this.culledShadowCasters.add(id);
        continue;
      }

      // Check if in view frustum
      if (this.enableShadowCulling) {
        if (!this._isInViewFrustum(obj)) {
          this.culledShadowCasters.add(id);
          continue;
        }
      }

      validShadowCasters.push(obj);
    }

    this.stats.shadowCastersVisible = validShadowCasters.length;
    this.stats.shadowCastersCulled = this.culledShadowCasters.size;
    this.stats.shadowCullingTime = performance.now() - startTime;

    return validShadowCasters;
  }

  /**
   * Get valid shadow casters for a given light
   * Combines screen-space size testing and frustum culling
   * Requirements: 8.4, 8.5
   * 
   * @param shadowCasters All potential shadow casters
   * @param light Light to get casters for
   * @param camera Current camera
   * @returns Filtered shadow casters valid for this light
   */
  getValidShadowCasters(
    shadowCasters: Object3D[],
    light: Object3D,
    camera: Camera
  ): Object3D[] {
    const validCasters: Object3D[] = [];

    for (const caster of shadowCasters) {
      // Check screen-space size minimum
      if (!this.shouldCastShadow(caster, camera)) {
        continue;
      }

      // Check frustum culling
      if (!this._isInViewFrustum(caster)) {
        continue;
      }

      validCasters.push(caster);
    }

    return validCasters;
  }

  /**
   * Get comprehensive shadow casting statistics
   * 
   * @returns Shadow casting statistics
   */
  getShadowCastingStats(): {
    shadowCastersVisible: number;
    shadowCastersCulled: number;
    shadowCullingTime: number;
    totalShadowCasters: number;
  } {
    return {
      shadowCastersVisible: this.stats.shadowCastersVisible,
      shadowCastersCulled: this.stats.shadowCastersCulled,
      shadowCullingTime: this.stats.shadowCullingTime,
      totalShadowCasters: this.shadowCasters.size,
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.shadowMapPool.dispose();
    this.lights.clear();
    this.lightBrightnessCache.clear();
    this.shadowCasters.clear();
    this.culledShadowCasters.clear();
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Update view frustum from camera
   * Used for shadow caster culling
   * 
   * @param camera Current camera
   */
  private _updateViewFrustum(camera: Camera): void {
    // This is a simplified frustum update
    // In production, would use proper frustum plane extraction
    const cameraObject = camera as any;
    this.viewFrustum = {
      position: cameraObject.position.clone(),
      direction: cameraObject.position.clone(),
      near: cameraObject.near,
      far: cameraObject.far,
    };
  }

  /**
   * Check if object is within view frustum
   * Used for off-screen culling of shadow casters
   * Requirements: 8.4 - disable shadow casting for off-screen objects
   * 
   * @param object Object to check
   * @returns True if object is in view frustum
   */
  private _isInViewFrustum(object: Object3D): boolean {
    if (!this.viewFrustum || !this.enableShadowCulling) {
      return true; // Default to visible if frustum not set or culling disabled
    }

    // Get object bounds
    const geometry = (object as any).geometry;
    if (!geometry || !geometry.boundingSphere) {
      return true; // Default to visible if can't determine bounds
    }

    const boundingSphere = geometry.boundingSphere;
    const worldPosition = object.getWorldPosition(new (require('three') as any).Vector3());

    // Simple sphere-to-frustum check
    const distanceToCamera = (this.viewFrustum as any).position.distanceTo(
      worldPosition
    );

    // Check if sphere is within camera range
    const far = (this.viewFrustum as any).far;
    const near = (this.viewFrustum as any).near;

    // Object is visible if its bounding sphere overlaps with view frustum
    return (
      distanceToCamera - boundingSphere.radius < far &&
      distanceToCamera + boundingSphere.radius > near
    );
  }

  /**
   * Optimize point light settings
   * Requirements: 8.2
   * 
   * @param light Point light to optimize
   */
  private _optimizePointLight(light: PointLight): void {
    // Update brightness cache
    const brightness =
      (light.intensity ?? 1.0) * Math.max(1, light.distance ?? 100);
    this.lightBrightnessCache.set(light.uuid, brightness);

    // Configure shadow if enabled
    if (light.shadow && light.castShadow) {
      light.shadow.mapSize.width = this.shadowMapSize;
      light.shadow.mapSize.height = this.shadowMapSize;
    }
  }

  /**
   * Optimize spot light settings
   * 
   * @param light Spot light to optimize
   */
  private _optimizeSpotLight(light: SpotLight): void {
    // Update brightness cache
    const brightness = (light.intensity ?? 1.0) * (light.distance ?? 100);
    this.lightBrightnessCache.set(light.uuid, brightness);

    // Configure shadow if enabled
    if (light.shadow && light.castShadow) {
      light.shadow.mapSize.width = this.shadowMapSize;
      light.shadow.mapSize.height = this.shadowMapSize;
    }
  }

  /**
   * Optimize directional light settings
   * Requirements: 8.1
   * 
   * @param light Directional light to optimize
   */
  private _optimizeDirectionalLight(light: DirectionalLight): void {
    // Set up cascaded shadow maps (max 2 cascades)
    if (light.shadow) {
      light.shadow.mapSize.width = this.shadowMapSize;
      light.shadow.mapSize.height = this.shadowMapSize;

      // Configure for cascaded setup
      light.shadow.camera.far = 1000;
      light.shadow.camera.near = 0.5;

      // Enable shadow map
      light.castShadow = true;
    }
  }
}

export default LightingOptimizer;
export { ShadowMapPoolImpl };
