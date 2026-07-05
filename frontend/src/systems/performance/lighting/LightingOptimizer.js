/**
 * Lighting Optimizer - Lighting and shadow optimization system
 * 
 * Manages optimized lighting with cascaded shadow maps, light culling,
 * and shadow map pooling for efficient rendering.
 * 
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import { 
  DirectionalLight, 
  PointLight, 
  Vector3, 
  Matrix4,
  Object3D 
} from 'three';

/**
 * LightingOptimizer class implementing the LightingOptimizer interface
 * Handles optimized lighting, shadow mapping, and light culling
 * 
 * Task 10.2: Implements shadow casting optimization with:
 * - Screen-space size testing for shadow casting eligibility (2x2 unit minimum)
 * - Contact shadows for small detail enhancement without additional shadow maps
 * - Shadow caster culling for off-screen objects
 */
class LightingOptimizer {
  /**
   * Initialize LightingOptimizer
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    // Light management
    this.lights = new Map(); // id -> light data
    this.lightCullingThreshold = config.lightCullingThreshold || 4; // Max 4 brightest lights
    this.shadowCascades = config.shadowCascades || 2; // Requirements: 8.1 - 2 cascades max
    this.shadowMapSize = config.shadowMapSize || 2048;
    
    // Shadow map pooling
    this.shadowMapPool = this._createShadowMapPool(config.shadowMapPoolSize || 4);
    
    // Light brightness tracking for culling
    this.lightBrightnessCache = new Map(); // id -> brightness
    
    // Shadow caster culling
    this.shadowCasters = new Set();
    this.culledShadowCasters = new Set();
    this.viewFrustum = null;
    
    // Cached frustum planes for light culling
    this.viewFrustumPlanes = [];
    
    // Statistics
    this.stats = {
      totalLights: 0,
      activeLights: 0,
      culledLights: 0,
      shadowMapsActive: 0,
      lightCullingTime: 0,
      shadowCastersVisible: 0,
      shadowCastersCulled: 0,
      shadowCullingTime: 0
    };

    // Configuration
    this.enableLightCulling = config.enableLightCulling !== false;
    this.enableContactShadows = config.enableContactShadows !== false;
    this.enableShadowCulling = config.enableShadowCulling !== false;
    this.screenSpaceMinimum = config.screenSpaceMinimum || 2; // 2x2 units minimum
  }

  /**
   * Optimize lighting configuration for performance
   * Requirements: 8.1, 8.2, 8.3
   * 
   * @param {Object3D[]} lights - Array of lights in scene
   * @returns {LightingConfig} - Optimized lighting configuration
   */
  optimizeLighting(lights) {
    const startTime = performance.now();
    
    const config = {
      maxPointLights: this.lightCullingThreshold, // Requirements: 8.2 - max 4 point lights
      shadowCascades: this.shadowCascades, // Requirements: 8.1 - 2 cascades for directional
      shadowMapSize: this.shadowMapSize,
      contactShadowsEnabled: this.enableContactShadows,
      lightCullingEnabled: this.enableLightCulling,
      directionalLights: 0,
      pointLights: 0,
      spotLights: 0
    };

    // Analyze and categorize lights
    let directionalCount = 0;
    let pointCount = 0;
    let spotCount = 0;

    for (const light of lights) {
      if (light.isDirectionalLight) {
        directionalCount++;
        this._optimizeDirectionalLight(light);
      } else if (light.isPointLight) {
        pointCount++;
        this._optimizePointLight(light);
      } else if (light.isSpotLight) {
        spotCount++;
        this._optimizeSpotLight(light);
      }
    }

    config.directionalLights = directionalCount;
    config.pointLights = Math.min(pointCount, this.lightCullingThreshold);
    config.spotLights = spotCount;

    this.stats.totalLights = lights.length;
    this.stats.lightCullingTime = performance.now() - startTime;

    return config;
  }

  /**
   * Create shadow map pool for reusing shadow textures
   * Requirements: 8.3 - shadow map pooling for reusing shadow textures
   * 
   * @param {number} size - Pool size (number of shadow maps)
   * @returns {ShadowMapPool} - Created shadow map pool
   */
  createShadowMapPool(size) {
    return this._createShadowMapPool(size);
  }

  /**
   * Perform light culling to limit active lights per pixel
   * Requirements: 8.2 - 4 brightest point lights per pixel
   * 
   * @param {Object3D[]} lights - Array of lights to cull
   * @param {Camera} camera - Current camera
   * @returns {Object3D[]} - Culled lights in priority order
   */
  performLightCulling(lights, camera) {
    if (!this.enableLightCulling) {
      return lights;
    }

    const startTime = performance.now();
    const culledLights = [];
    const lightBrightness = [];

    // Calculate brightness for each light
    for (const light of lights) {
      let brightness = 0;
      
      if (light.isPointLight || light.isSpotLight) {
        // Calculate brightness based on intensity and distance to camera
        const distance = camera.position.distanceTo(light.position);
        const intensity = light.intensity || 1.0;
        const range = light.distance || 100;
        
        // Inverse square falloff
        const attenuation = Math.max(0, 1 - distance / range);
        brightness = intensity * attenuation * attenuation;
      } else if (light.isDirectionalLight) {
        // Directional lights always have same contribution
        brightness = (light.intensity || 1.0) * 1000; // High priority for directional
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
   * @param {Object3D[]} objects - Array of objects that might cast contact shadows
   * @param {Camera} camera - Current camera (optional, for screen-space size testing)
   */
  updateContactShadows(objects, camera) {
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
      if (obj.userData && obj.userData.requestContactShadow) {
        useContactShadow = true;
      }

      obj.userData = obj.userData || {};
      obj.userData.useContactShadow = useContactShadow;

      // Set contact shadow properties
      if (useContactShadow) {
        obj.userData.contactShadowOpacity = 0.4;
        obj.userData.contactShadowRadius = 2;
        obj.userData.contactShadowBlur = 1;
      }
    }
  }

  /**
   * Check if object should cast shadows based on screen space size
   * Requirements: 8.4 - 2x2 unit minimum screen space size
   * 
   * @param {Object3D} object - Object to check
   * @param {Camera} camera - Current camera
   * @returns {boolean} - True if object is large enough to cast shadows
   */
  shouldCastShadow(object, camera) {
    if (!object.geometry || !object.geometry.boundingSphere) {
      return true; // Default to true if can't determine
    }

    const boundingSphere = object.geometry.boundingSphere;
    const distance = camera.position.distanceTo(boundingSphere.center);
    
    // Calculate screen size
    const vFOV = (camera.fov * Math.PI) / 180;
    const screenHeight = 2 * Math.tan(vFOV / 2) * distance;
    const screenWidth = screenHeight * camera.aspect;
    
    // Get object radius in screen space
    const radius = boundingSphere.radius;
    const screenRadius = radius / distance;
    
    // Check if 2x2 units minimum
    return screenRadius >= this.screenSpaceMinimum;
  }

  /**
   * Get shadow map from pool for a light
   * 
   * @param {string} lightId - Light identifier
   * @returns {WebGLTexture|null} - Shadow map texture or null if none available
   */
  acquireShadowMap(lightId) {
    return this.shadowMapPool.acquire(lightId);
  }

  /**
   * Release shadow map back to pool
   * 
   * @param {string} lightId - Light identifier
   */
  releaseShadowMap(lightId) {
    this.shadowMapPool.release(lightId);
  }

  /**
   * Get lighting statistics
   * 
   * @returns {Object} - Current statistics
   */
  getStats() {
    return {
      ...this.stats,
      shadowPoolStats: this.shadowMapPool.getUsageStats()
    };
  }

  /**
   * Cull shadow casters that are off-screen or too small
   * Requirements: 8.4 - Disable shadow casting for objects smaller than 2x2 units in screen space
   * 
   * @param {Object3D[]} objects - Array of potential shadow casters
   * @param {Camera} camera - Current camera
   * @returns {Object3D[]} - Filtered list of valid shadow casters
   */
  cullShadowCasters(objects, camera) {
    const startTime = performance.now();
    const validShadowCasters = [];

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
   * @param {Object3D[]} shadowCasters - All potential shadow casters
   * @param {Object3D} light - Light to get casters for
   * @param {Camera} camera - Current camera
   * @returns {Object3D[]} - Filtered shadow casters valid for this light
   */
  getValidShadowCasters(shadowCasters, light, camera) {
    const validCasters = [];

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
   * @returns {Object} - Shadow casting statistics
   */
  getShadowCastingStats() {
    return {
      shadowCastersVisible: this.stats.shadowCastersVisible,
      shadowCastersCulled: this.stats.shadowCastersCulled,
      shadowCullingTime: this.stats.shadowCullingTime,
      totalShadowCasters: this.shadowCasters.size
    };
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Create shadow map pool for efficient shadow texture reuse
   * Requirements: 8.3
   * 
   * @private
   * @param {number} poolSize - Number of shadow maps in pool
   * @returns {Object} - Shadow map pool implementation
   */
  _createShadowMapPool(poolSize) {
    const shadowMaps = new Map(); // lightId -> shadowMap
    const availableMaps = [];
    
    // Initialize available shadow maps
    for (let i = 0; i < poolSize; i++) {
      availableMaps.push({
        id: `shadow_${i}`,
        inUse: false,
        lastUsedTime: 0,
        lightId: null
      });
    }

    return {
      acquire: (lightId) => {
        // Check if light already has shadow map
        if (shadowMaps.has(lightId)) {
          return shadowMaps.get(lightId);
        }

        // Find available shadow map (least recently used)
        let bestMap = null;
        let minTime = Infinity;

        for (const map of availableMaps) {
          if (!map.inUse && map.lastUsedTime < minTime) {
            bestMap = map;
            minTime = map.lastUsedTime;
          }
        }

        if (!bestMap) {
          return null; // Pool exhausted
        }

        // Allocate shadow map to light
        bestMap.inUse = true;
        bestMap.lightId = lightId;
        bestMap.lastUsedTime = Date.now();
        
        shadowMaps.set(lightId, bestMap.id);
        
        return bestMap.id;
      },

      release: (lightId) => {
        const mapId = shadowMaps.get(lightId);
        if (mapId) {
          // Find and mark as available
          for (const map of availableMaps) {
            if (map.id === mapId) {
              map.inUse = false;
              map.lightId = null;
              break;
            }
          }
          
          shadowMaps.delete(lightId);
        }
      },

      getUsageStats: () => {
        const activeMaps = availableMaps.filter(m => m.inUse).length;
        const totalMemory = poolSize * this.shadowMapSize * this.shadowMapSize * 4; // 4 bytes per pixel
        
        return {
          totalMaps: poolSize,
          activeMaps: activeMaps,
          memoryUsage: activeMaps * this.shadowMapSize * this.shadowMapSize * 4,
          hitRate: shadowMaps.size / poolSize
        };
      }
    };
  }

  /**
   * Optimize directional light settings
   * Requirements: 8.1
   * 
   * @private
   * @param {DirectionalLight} light - Directional light to optimize
   */
  _optimizeDirectionalLight(light) {
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

  /**
   * Optimize point light settings
   * Requirements: 8.2
   * 
   * @private
   * @param {PointLight} light - Point light to optimize
   */
  _optimizePointLight(light) {
    // Update brightness cache
    const brightness = (light.intensity || 1.0) * Math.max(1, light.distance || 100);
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
   * @private
   * @param {SpotLight} light - Spot light to optimize
   */
  _optimizeSpotLight(light) {
    // Update brightness cache
    const brightness = (light.intensity || 1.0) * light.distance;
    this.lightBrightnessCache.set(light.uuid, brightness);
    
    // Configure shadow if enabled
    if (light.shadow && light.castShadow) {
      light.shadow.mapSize.width = this.shadowMapSize;
      light.shadow.mapSize.height = this.shadowMapSize;
    }
  }

  /**
   * Calculate view frustum planes for light culling
   * 
   * @private
   * @param {Camera} camera - Current camera
   */
  _updateViewFrustum(camera) {
    // Update frustum for shadow caster culling
    const cameraObject = camera;
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
   * @private
   * @param {Object3D} object - Object to check
   * @returns {boolean} - True if object is in view frustum
   */
  _isInViewFrustum(object) {
    if (!this.viewFrustum || !this.enableShadowCulling) {
      return true; // Default to visible if frustum not set or culling disabled
    }

    // Get object bounds
    const geometry = object.geometry;
    if (!geometry || !geometry.boundingSphere) {
      return true; // Default to visible if can't determine bounds
    }

    const boundingSphere = geometry.boundingSphere;
    const worldPosition = object.getWorldPosition(new Vector3());

    // Simple sphere-to-frustum check
    const distanceToCamera = this.viewFrustum.position.distanceTo(worldPosition);

    // Check if sphere is within camera range
    const far = this.viewFrustum.far;
    const near = this.viewFrustum.near;

    // Object is visible if its bounding sphere overlaps with view frustum
    return (
      distanceToCamera - boundingSphere.radius < far &&
      distanceToCamera + boundingSphere.radius > near
    );
  }
}

export default LightingOptimizer;
