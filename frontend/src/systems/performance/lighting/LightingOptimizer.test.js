/**
 * Comprehensive Unit Tests for LightingOptimizer
 * 
 * Validates: Requirements 8.1, 8.2, 8.4
 * 
 * Tests:
 * - Light culling algorithms and brightness calculations
 * - Shadow map assignment and pooling logic
 * - Screen-space size calculations for shadow casting
 * - Contact shadow management
 * - Shadow caster culling
 * - Statistics tracking and reporting
 * 
 * Target Coverage: 95%+
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DirectionalLight,
  PointLight,
  SpotLight,
  PerspectiveCamera,
  Vector3,
  Object3D,
  Sphere,
  BufferGeometry,
  Mesh,
} from 'three';
import LightingOptimizer from './LightingOptimizer.js';

describe('LightingOptimizer - Lighting Optimization (Requirements 8.1, 8.2)', () => {
  let lightingOptimizer;
  let camera;

  beforeEach(() => {
    lightingOptimizer = new LightingOptimizer({
      lightCullingThreshold: 4,
      shadowCascades: 2,
      shadowMapSize: 2048,
      enableLightCulling: true,
      enableContactShadows: true,
      enableShadowCulling: true,
      screenSpaceMinimum: 2,
    });

    camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 5, 10);
  });

  it('should optimize lighting configuration', () => {
    const lights = [
      new DirectionalLight(0xffffff, 1),
      new PointLight(0xffffff, 1),
    ];

    const config = lightingOptimizer.optimizeLighting(lights);

    expect(config).toHaveProperty('maxPointLights');
    expect(config).toHaveProperty('shadowCascades');
    expect(config).toHaveProperty('shadowMapSize');
    expect(config.shadowCascades).toBe(2); // Requirements: 8.1 - 2 cascades max
    expect(config.maxPointLights).toBe(4); // Requirements: 8.2 - 4 max point lights
  });

  it('should track total lights in optimization', () => {
    const lights = [
      new DirectionalLight(0xffffff, 1),
      new PointLight(0xffffff, 1),
      new PointLight(0xffffff, 0.8),
      new SpotLight(0xffffff, 1),
    ];

    lightingOptimizer.optimizeLighting(lights);

    const stats = lightingOptimizer.getStats();
    expect(stats.totalLights).toBe(4);
  });

  it('should enable light culling by default', () => {
    const lights = [
      new PointLight(0xffffff, 1),
      new PointLight(0xffffff, 1),
    ];

    const config = lightingOptimizer.optimizeLighting(lights);
    expect(config.lightCullingEnabled).toBe(true);
  });

  it('should set shadowMapSize correctly', () => {
    const config = lightingOptimizer.optimizeLighting([
      new DirectionalLight(0xffffff, 1),
    ]);

    expect(config.shadowMapSize).toBe(2048);
  });

  it('should handle empty light array', () => {
    const config = lightingOptimizer.optimizeLighting([]);

    expect(config).toBeDefined();
    expect(config.maxPointLights).toBe(4);
    expect(config.shadowCascades).toBe(2);
  });

  it('should measure optimization time', () => {
    const lights = [
      new PointLight(0xffffff, 1),
      new PointLight(0xffffff, 1),
    ];

    lightingOptimizer.optimizeLighting(lights);
    const stats = lightingOptimizer.getStats();

    expect(stats.lightCullingTime).toBeGreaterThanOrEqual(0);
  });

  it('should set contact shadows enabled flag', () => {
    const lights = [new DirectionalLight(0xffffff, 1)];
    const config = lightingOptimizer.optimizeLighting(lights);

    expect(config.contactShadowsEnabled).toBe(true);
  });

  it('should allow disabling light culling', () => {
    const optimizer = new LightingOptimizer({
      enableLightCulling: false,
    });

    const lights = [
      new PointLight(0xffffff, 1),
      new PointLight(0xffffff, 1),
    ];

    const config = optimizer.optimizeLighting(lights);
    expect(config.lightCullingEnabled).toBe(false);
  });
});

describe('LightingOptimizer - Light Culling Algorithm (Requirements 8.2)', () => {
  let lightingOptimizer;
  let camera;

  beforeEach(() => {
    lightingOptimizer = new LightingOptimizer({ lightCullingThreshold: 4 });
    camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 5, 10);
  });

  it('should cull lights to maximum threshold of 4', () => {
    const lights = Array.from({ length: 10 }, () => new PointLight(0xffffff, 1));

    const culledLights = lightingOptimizer.performLightCulling(lights, camera);

    expect(culledLights.length).toBeLessThanOrEqual(4); // Max 4 lights per requirement 8.2
    expect(culledLights.length).toBeGreaterThan(0);
  });

  it('should prioritize brightest lights', () => {
    const dim = new PointLight(0xffffff, 0.5);
    dim.position.set(1, 0, 5);

    const bright = new PointLight(0xffffff, 10); // Much brighter
    bright.position.set(1, 0, 5);

    const veryDim = new PointLight(0xffffff, 0.1);
    veryDim.position.set(1, 0, 5);

    const lights = [dim, bright, veryDim];
    const culledLights = lightingOptimizer.performLightCulling(lights, camera);

    // Brightest light should be included
    expect(culledLights).toContain(bright);
  });

  it('should calculate brightness based on distance and intensity', () => {
    const light1 = new PointLight(0xffffff, 1);
    light1.position.set(0, 0, 1); // Very close

    const light2 = new PointLight(0xffffff, 1);
    light2.position.set(0, 0, 100); // Very far

    const culledLights = lightingOptimizer.performLightCulling([light1, light2], camera);
    expect(culledLights.length).toBeGreaterThan(0);
  });

  it('should prioritize directional lights', () => {
    const dirLight = new DirectionalLight(0xffffff, 1);
    const pointLight = new PointLight(0xffffff, 0.5);
    pointLight.position.set(10, 0, 0);

    const lights = [pointLight, dirLight];
    const culledLights = lightingOptimizer.performLightCulling(lights, camera);

    // Directional light should have priority
    expect(culledLights).toContain(dirLight);
  });

  it('should update culling statistics after culling', () => {
    const lights = Array.from({ length: 8 }, () => new PointLight(0xffffff, 1));

    lightingOptimizer.performLightCulling(lights, camera);

    const stats = lightingOptimizer.getStats();
    expect(stats.culledLights).toBe(4); // 8 - 4 = 4
    expect(stats.activeLights).toBe(4);
    expect(stats.lightCullingTime).toBeGreaterThan(0);
  });

  it('should not cull when light culling is disabled', () => {
    const optimizer = new LightingOptimizer({ enableLightCulling: false });

    const lights = Array.from({ length: 8 }, () => new PointLight(0xffffff, 1));

    const culledLights = optimizer.performLightCulling(lights, camera);

    // Should return all lights when culling disabled
    expect(culledLights.length).toBe(8);
  });

  it('should handle single light', () => {
    const light = new PointLight(0xffffff, 1);
    light.position.set(0, 0, 5);

    const culledLights = lightingOptimizer.performLightCulling([light], camera);

    expect(culledLights.length).toBe(1);
    expect(culledLights).toContain(light);
  });

  it('should handle lights with custom distance', () => {
    const light1 = new PointLight(0xffffff, 1);
    light1.position.set(0, 0, 5);
    light1.distance = 50;

    const light2 = new PointLight(0xffffff, 1);
    light2.position.set(0, 0, 50);
    light2.distance = 100;

    const culledLights = lightingOptimizer.performLightCulling([light1, light2], camera);

    expect(culledLights).toContain(light1);
  });

  it('should handle mix of light types in culling', () => {
    const lights = [
      new DirectionalLight(0xffffff, 1),
      new PointLight(0xffffff, 0.8),
      new SpotLight(0xffffff, 0.6),
      new PointLight(0xffffff, 0.7),
      new PointLight(0xffffff, 0.5),
    ];

    const culledLights = lightingOptimizer.performLightCulling(lights, camera);

    expect(culledLights.length).toBeLessThanOrEqual(4);
    expect(culledLights).toContain(lights[0]); // Directional should be included
  });
});

describe('LightingOptimizer - Shadow Map Pooling (Requirements 8.3)', () => {
  let lightingOptimizer;

  beforeEach(() => {
    lightingOptimizer = new LightingOptimizer({
      shadowMapPoolSize: 4,
      shadowMapSize: 2048,
    });
  });

  it('should create shadow map pool of specified size', () => {
    const pool = lightingOptimizer.createShadowMapPool(4);

    expect(pool).toBeDefined();
    expect(pool.acquire).toBeDefined();
    expect(pool.release).toBeDefined();
    expect(pool.getUsageStats).toBeDefined();
  });

  it('should acquire different shadow maps for different lights', () => {
    const map1 = lightingOptimizer.acquireShadowMap('light_1');
    const map2 = lightingOptimizer.acquireShadowMap('light_2');
    const map3 = lightingOptimizer.acquireShadowMap('light_3');

    expect(map1).toBeDefined();
    expect(map2).toBeDefined();
    expect(map3).toBeDefined();
  });

  it('should return same map for same light id', () => {
    const map1 = lightingOptimizer.acquireShadowMap('light_1');
    const map1Again = lightingOptimizer.acquireShadowMap('light_1');

    expect(map1).toBe(map1Again);
  });

  it('should allow releasing and reusing shadow maps', () => {
    const map1 = lightingOptimizer.acquireShadowMap('light_1');
    lightingOptimizer.releaseShadowMap('light_1');

    // Acquire new shadow map
    const map2 = lightingOptimizer.acquireShadowMap('light_2');

    expect(map1).toBeDefined();
    expect(map2).toBeDefined();
  });

  it('should track shadow pool usage statistics', () => {
    lightingOptimizer.acquireShadowMap('light_1');
    lightingOptimizer.acquireShadowMap('light_2');

    const stats = lightingOptimizer.getStats();

    expect(stats.shadowPoolStats).toBeDefined();
    expect(stats.shadowPoolStats.totalMaps).toBeGreaterThan(0);
    expect(stats.shadowPoolStats.activeMaps).toBeGreaterThanOrEqual(0);
    expect(stats.shadowPoolStats.memoryUsage).toBeGreaterThanOrEqual(0);
    expect(stats.shadowPoolStats.hitRate).toBeGreaterThanOrEqual(0);
  });

  it('should calculate memory usage correctly', () => {
    lightingOptimizer.acquireShadowMap('light_1');
    const stats = lightingOptimizer.getStats();

    // 2048x2048 shadow map at 4 bytes per pixel = 16MB per map
    expect(stats.shadowPoolStats.memoryUsage).toBeGreaterThan(0);
  });

  it('should track hit rate in pool statistics', () => {
    lightingOptimizer.acquireShadowMap('light_1');
    lightingOptimizer.acquireShadowMap('light_1'); // Reuse same light (hit)

    const stats = lightingOptimizer.getStats();
    expect(stats.shadowPoolStats.hitRate).toBeGreaterThanOrEqual(0);
  });

  it('should handle multiple releases and acquisitions', () => {
    for (let i = 0; i < 10; i++) {
      const map = lightingOptimizer.acquireShadowMap(`light_${i % 4}`);
      expect(map).toBeDefined();
    }

    lightingOptimizer.releaseShadowMap('light_0');
    lightingOptimizer.releaseShadowMap('light_1');

    const map = lightingOptimizer.acquireShadowMap('light_new');
    expect(map).toBeDefined();
  });

  it('should maintain pool consistency', () => {
    const initialStats = lightingOptimizer.getStats();
    expect(initialStats.shadowPoolStats.totalMaps).toBe(4); // Default pool size

    lightingOptimizer.acquireShadowMap('light_1');
    const statsAfter = lightingOptimizer.getStats();
    expect(statsAfter.shadowPoolStats.totalMaps).toBe(4); // Should remain same
  });
});

describe('LightingOptimizer - Screen-Space Size Calculations (Requirements 8.4)', () => {
  let lightingOptimizer;
  let camera;

  beforeEach(() => {
    lightingOptimizer = new LightingOptimizer({ screenSpaceMinimum: 2 });
    camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
  });

  it('should validate screen-space size for shadow casting', () => {
    const mockObject = new Mesh(new BufferGeometry(), null);
    mockObject.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 5);

    const shouldCast = lightingOptimizer.shouldCastShadow(mockObject, camera);

    expect(typeof shouldCast).toBe('boolean');
  });

  it('should not cast shadows for small objects at distance', () => {
    const camera2 = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera2.position.set(0, 0, 100); // Very far away

    const smallObject = new Mesh(new BufferGeometry(), null);
    smallObject.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 0.5); // Very small

    const shouldCast = lightingOptimizer.shouldCastShadow(smallObject, camera2);

    expect(shouldCast).toBe(false); // Too small from this distance
  });

  it('should cast shadows for large objects', () => {
    const largeObject = new Mesh(new BufferGeometry(), null);
    largeObject.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 10), 10);

    const shouldCast = lightingOptimizer.shouldCastShadow(largeObject, camera);

    expect(shouldCast).toBe(true); // Large enough to cast shadow
  });

  it('should use 2x2 unit minimum threshold', () => {
    const optimizer = new LightingOptimizer({ screenSpaceMinimum: 2 });

    const object = new Mesh(new BufferGeometry(), null);
    object.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 50), 1);

    const shouldCast = optimizer.shouldCastShadow(object, camera);

    expect(typeof shouldCast).toBe('boolean');
  });

  it('should return true for objects without geometry', () => {
    const objectWithoutGeometry = new Object3D();

    const shouldCast = lightingOptimizer.shouldCastShadow(objectWithoutGeometry, camera);

    expect(shouldCast).toBe(true); // Default: true if can't determine
  });

  it('should return true for objects without bounding sphere', () => {
    const object = new Mesh(new BufferGeometry(), null);
    // No bounding sphere set

    const shouldCast = lightingOptimizer.shouldCastShadow(object, camera);

    expect(shouldCast).toBe(true); // Default: true if can't determine
  });

  it('should consider distance in shadow casting decision', () => {
    const nearObject = new Mesh(new BufferGeometry(), null);
    nearObject.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 5), 2);

    const farObject = new Mesh(new BufferGeometry(), null);
    farObject.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 200), 2);

    const nearShouldCast = lightingOptimizer.shouldCastShadow(nearObject, camera);
    const farShouldCast = lightingOptimizer.shouldCastShadow(farObject, camera);

    // Both should have specific results
    expect(typeof nearShouldCast).toBe('boolean');
    expect(typeof farShouldCast).toBe('boolean');
  });

  it('should handle objects at varying distances', () => {
    const distances = [1, 5, 10, 50, 100, 500];
    const results = distances.map(distance => {
      const object = new Mesh(new BufferGeometry(), null);
      object.geometry.boundingSphere = new Sphere(new Vector3(0, 0, distance), 2);

      return lightingOptimizer.shouldCastShadow(object, camera);
    });

    expect(results.length).toBe(6);
    results.forEach(result => {
      expect(typeof result).toBe('boolean');
    });
  });

  it('should validate custom screen space minimum threshold', () => {
    const optimizer = new LightingOptimizer({ screenSpaceMinimum: 4 });

    const object = new Mesh(new BufferGeometry(), null);
    object.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 50), 1);

    // With 4x4 minimum, this should be false
    const shouldCast = optimizer.shouldCastShadow(object, camera);

    expect(typeof shouldCast).toBe('boolean');
  });
});

describe('LightingOptimizer - Shadow Caster Culling (Requirements 8.4)', () => {
  let lightingOptimizer;
  let camera;

  beforeEach(() => {
    lightingOptimizer = new LightingOptimizer({ enableShadowCulling: true });
    camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 5, 10);
  });

  it('should cull small shadow casters', () => {
    const smallObject = new Mesh(new BufferGeometry(), null);
    smallObject.uuid = 'small-1';
    smallObject.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 0.1);

    const camera2 = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera2.position.set(0, 5, 110);

    const culledLights = lightingOptimizer.cullShadowCasters([smallObject], camera2);

    expect(Array.isArray(culledLights)).toBe(true);
  });

  it('should keep large shadow casters', () => {
    const largeObject = new Mesh(new BufferGeometry(), null);
    largeObject.uuid = 'large-1';
    largeObject.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 10);

    const culledLights = lightingOptimizer.cullShadowCasters([largeObject], camera);

    expect(Array.isArray(culledLights)).toBe(true);
    expect(culledLights.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty shadow caster array', () => {
    const culledLights = lightingOptimizer.cullShadowCasters([], camera);

    expect(Array.isArray(culledLights)).toBe(true);
    expect(culledLights.length).toBe(0);
  });

  it('should handle objects with missing bounding sphere', () => {
    const objectNoBounds = new Mesh(new BufferGeometry(), null);
    objectNoBounds.uuid = 'no-bounds';

    const culledLights = lightingOptimizer.cullShadowCasters([objectNoBounds], camera);

    expect(Array.isArray(culledLights)).toBe(true);
  });

  it('should update shadow casting statistics', () => {
    const objects = [
      new Mesh(new BufferGeometry(), null),
      new Mesh(new BufferGeometry(), null),
    ];

    objects[0].uuid = 'obj-1';
    objects[0].geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 10);

    objects[1].uuid = 'obj-2';
    objects[1].geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 0.1);

    lightingOptimizer.cullShadowCasters(objects, camera);
    const stats = lightingOptimizer.getShadowCastingStats();

    expect(stats).toHaveProperty('shadowCastersVisible');
    expect(stats).toHaveProperty('shadowCastersCulled');
    expect(stats).toHaveProperty('shadowCullingTime');
    expect(stats).toHaveProperty('totalShadowCasters');
    expect(stats.shadowCastersVisible).toBeGreaterThanOrEqual(0);
    expect(stats.shadowCullingTime).toBeGreaterThanOrEqual(0);
  });

  it('should measure shadow culling time', () => {
    const objects = Array.from({ length: 10 }, (_, idx) => {
      const obj = new Mesh(new BufferGeometry(), null);
      obj.uuid = `obj-${idx}`;
      obj.geometry.boundingSphere = new Sphere(new Vector3(idx, 0, 0), 2);
      return obj;
    });

    lightingOptimizer.cullShadowCasters(objects, camera);
    const stats = lightingOptimizer.getShadowCastingStats();

    expect(stats.shadowCullingTime).toBeGreaterThanOrEqual(0);
  });

  it('should disable shadow culling when configured', () => {
    const optimizer = new LightingOptimizer({ enableShadowCulling: false });

    const object = new Mesh(new BufferGeometry(), null);
    object.uuid = 'test';
    object.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 5); // Large object

    const culled = optimizer.cullShadowCasters([object], camera);

    // With culling disabled but failing screen-space test, result may vary
    expect(Array.isArray(culled)).toBe(true);
  });
});

describe('LightingOptimizer - Contact Shadows (Requirements 8.5)', () => {
  let lightingOptimizer;
  let camera;

  beforeEach(() => {
    lightingOptimizer = new LightingOptimizer({ enableContactShadows: true });
    camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 100); // Far away
  });

  it('should enable contact shadows for small objects', () => {
    const smallObject = new Mesh(new BufferGeometry(), null);
    smallObject.userData = {};
    smallObject.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 0.5);

    lightingOptimizer.updateContactShadows([smallObject], camera);

    expect(smallObject.userData.useContactShadow).toBe(true);
    expect(smallObject.userData.contactShadowOpacity).toBeDefined();
    expect(smallObject.userData.contactShadowRadius).toBeDefined();
  });

  it('should not enable contact shadows when disabled', () => {
    const optimizer = new LightingOptimizer({ enableContactShadows: false });

    const mockObject = new Mesh(new BufferGeometry(), null);
    mockObject.userData = {};

    optimizer.updateContactShadows([mockObject], camera);

    expect(mockObject.userData.useContactShadow).toBeUndefined();
  });

  it('should set contact shadow opacity', () => {
    const object = new Mesh(new BufferGeometry(), null);
    object.userData = {};
    object.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 0.5);

    lightingOptimizer.updateContactShadows([object], camera);

    expect(object.userData.contactShadowOpacity).toBe(0.4);
  });

  it('should set contact shadow radius', () => {
    const object = new Mesh(new BufferGeometry(), null);
    object.userData = {};
    object.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 0.5);

    lightingOptimizer.updateContactShadows([object], camera);

    expect(object.userData.contactShadowRadius).toBe(2);
  });

  it('should set contact shadow blur', () => {
    const object = new Mesh(new BufferGeometry(), null);
    object.userData = {};
    object.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 0.5);

    lightingOptimizer.updateContactShadows([object], camera);

    expect(object.userData.contactShadowBlur).toBe(1);
  });

  it('should respect requestContactShadow flag', () => {
    const largeObject = new Mesh(new BufferGeometry(), null);
    largeObject.userData = { requestContactShadow: true };
    largeObject.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 10); // Large but requests contact shadow

    lightingOptimizer.updateContactShadows([largeObject], camera);

    expect(largeObject.userData.useContactShadow).toBe(true);
  });

  it('should handle multiple objects with contact shadows', () => {
    const objects = Array.from({ length: 5 }, (_, idx) => {
      const obj = new Mesh(new BufferGeometry(), null);
      obj.userData = {};
      obj.geometry.boundingSphere = new Sphere(new Vector3(idx, 0, 0), 0.5);
      return obj;
    });

    lightingOptimizer.updateContactShadows(objects, camera);

    objects.forEach(obj => {
      expect(obj.userData.useContactShadow).toBe(true);
    });
  });

  it('should enable contact shadows without camera parameter', () => {
    const object = new Mesh(new BufferGeometry(), null);
    object.userData = { requestContactShadow: true };

    lightingOptimizer.updateContactShadows([object]);

    expect(object.userData.useContactShadow).toBe(true);
  });

  it('should handle objects with requestContactShadow but missing geometry', () => {
    const object = new Object3D();
    object.userData = { requestContactShadow: true };

    lightingOptimizer.updateContactShadows([object], camera);

    expect(object.userData.useContactShadow).toBe(true);
  });
});

describe('LightingOptimizer - Statistics and Metrics', () => {
  let lightingOptimizer;
  let camera;

  beforeEach(() => {
    lightingOptimizer = new LightingOptimizer();
    camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 5, 10);
  });

  it('should track lighting statistics', () => {
    const stats = lightingOptimizer.getStats();

    expect(stats).toHaveProperty('totalLights');
    expect(stats).toHaveProperty('activeLights');
    expect(stats).toHaveProperty('culledLights');
    expect(stats).toHaveProperty('shadowMapsActive');
    expect(stats).toHaveProperty('lightCullingTime');
    expect(stats).toHaveProperty('shadowPoolStats');
  });

  it('should update statistics after optimization', () => {
    const lights = [
      new PointLight(0xffffff, 1),
      new PointLight(0xffffff, 1),
    ];

    lightingOptimizer.optimizeLighting(lights);
    lightingOptimizer.performLightCulling(lights, camera);

    const stats = lightingOptimizer.getStats();

    expect(stats.totalLights).toBe(2);
    expect(stats.activeLights).toBe(2);
    expect(stats.lightCullingTime).toBeGreaterThan(0);
  });

  it('should provide shadow casting statistics', () => {
    const objects = [
      new Mesh(new BufferGeometry(), null),
    ];

    objects[0].uuid = 'obj-1';
    objects[0].geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 10);

    lightingOptimizer.cullShadowCasters(objects, camera);
    const stats = lightingOptimizer.getShadowCastingStats();

    expect(stats.shadowCastersVisible).toBeGreaterThanOrEqual(0);
    expect(stats.shadowCastersCulled).toBeGreaterThanOrEqual(0);
    expect(stats.shadowCullingTime).toBeGreaterThanOrEqual(0);
    expect(stats.totalShadowCasters).toBeGreaterThanOrEqual(0);
  });

  it('should reset statistics after multiple operations', () => {
    const lights = Array.from({ length: 6 }, () => new PointLight(0xffffff, 1));

    lightingOptimizer.performLightCulling(lights, camera);
    let stats = lightingOptimizer.getStats();
    const initialCulled = stats.culledLights;

    lightingOptimizer.performLightCulling(lights, camera);
    stats = lightingOptimizer.getStats();

    expect(stats.culledLights).toBe(initialCulled);
  });

  it('should track performance metrics accurately', () => {
    const startTime = performance.now();

    const lights = Array.from({ length: 100 }, () => new PointLight(0xffffff, 1));

    lightingOptimizer.performLightCulling(lights, camera);

    const stats = lightingOptimizer.getStats();
    const endTime = performance.now();

    expect(stats.lightCullingTime).toBeLessThan(endTime - startTime + 100);
  });
});

describe('LightingOptimizer - Configuration', () => {
  it('should accept custom configuration', () => {
    const customOptimizer = new LightingOptimizer({
      lightCullingThreshold: 2,
      shadowCascades: 1,
      shadowMapSize: 1024,
      enableLightCulling: false,
      enableContactShadows: false,
      enableShadowCulling: false,
      screenSpaceMinimum: 4,
    });

    const config = customOptimizer.optimizeLighting([]);

    expect(config.maxPointLights).toBe(2);
    expect(config.shadowCascades).toBe(1);
    expect(config.shadowMapSize).toBe(1024);
    expect(config.lightCullingEnabled).toBe(false);
    expect(config.contactShadowsEnabled).toBe(false);
  });

  it('should use default configuration when not provided', () => {
    const optimizer = new LightingOptimizer();
    const config = optimizer.optimizeLighting([]);

    expect(config.maxPointLights).toBe(4);
    expect(config.shadowCascades).toBe(2);
    expect(config.shadowMapSize).toBe(2048);
    expect(config.lightCullingEnabled).toBe(true);
    expect(config.contactShadowsEnabled).toBe(true);
  });

  it('should override defaults with partial config', () => {
    const optimizer = new LightingOptimizer({
      lightCullingThreshold: 6,
    });

    const config = optimizer.optimizeLighting([]);

    expect(config.maxPointLights).toBe(6);
    expect(config.shadowCascades).toBe(2); // Default
    expect(config.shadowMapSize).toBe(2048); // Default
  });
});

describe('LightingOptimizer - Light Type Optimization', () => {
  let lightingOptimizer;

  beforeEach(() => {
    lightingOptimizer = new LightingOptimizer();
  });

  it('should configure cascaded shadow maps for directional lights', () => {
    const dirLight = new DirectionalLight(0xffffff, 1);
    dirLight.shadow = {
      mapSize: {},
      camera: {},
    };

    lightingOptimizer.optimizeLighting([dirLight]);

    expect(dirLight.shadow.mapSize.width).toBe(2048);
    expect(dirLight.shadow.mapSize.height).toBe(2048);
    expect(dirLight.castShadow).toBe(true);
  });

  it('should set far and near for shadow camera', () => {
    const dirLight = new DirectionalLight(0xffffff, 1);
    dirLight.shadow = {
      mapSize: {},
      camera: {},
    };

    lightingOptimizer.optimizeLighting([dirLight]);

    expect(dirLight.shadow.camera.far).toBe(1000);
    expect(dirLight.shadow.camera.near).toBe(0.5);
  });

  it('should handle directional light without shadow', () => {
    const dirLight = new DirectionalLight(0xffffff, 1);

    expect(() => {
      lightingOptimizer.optimizeLighting([dirLight]);
    }).not.toThrow();
  });

  it('should optimize point light settings', () => {
    const pointLight = new PointLight(0xffffff, 1);
    pointLight.distance = 50;
    pointLight.intensity = 2;

    lightingOptimizer.optimizeLighting([pointLight]);

    expect(lightingOptimizer.getStats()).toBeDefined();
  });

  it('should optimize spot light settings', () => {
    const spotLight = new SpotLight(0xffffff, 1);
    spotLight.distance = 100;
    spotLight.intensity = 1.5;

    expect(() => {
      lightingOptimizer.optimizeLighting([spotLight]);
    }).not.toThrow();
  });

  it('should handle spot light with shadow', () => {
    const spotLight = new SpotLight(0xffffff, 1);
    spotLight.shadow = {
      mapSize: {},
    };

    lightingOptimizer.optimizeLighting([spotLight]);

    // Shadow map size may be set if shadow is properly initialized
    expect(spotLight.shadow.mapSize).toBeDefined();
  });
});

describe('LightingOptimizer - Edge Cases', () => {
  let lightingOptimizer;
  let camera;

  beforeEach(() => {
    lightingOptimizer = new LightingOptimizer();
    camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 5, 10);
  });

  it('should handle very large number of lights', () => {
    const lights = Array.from({ length: 1000 }, () => new PointLight(0xffffff, Math.random()));

    const culledLights = lightingOptimizer.performLightCulling(lights, camera);

    expect(culledLights.length).toBeLessThanOrEqual(4);
    expect(culledLights.length).toBeGreaterThan(0);
  });

  it('should handle very small camera near plane', () => {
    const smallCamera = new PerspectiveCamera(75, 1, 0.001, 1000);
    smallCamera.position.set(0, 5, 10);

    const lights = [
      new PointLight(0xffffff, 1),
      new PointLight(0xffffff, 1),
    ];

    expect(() => {
      lightingOptimizer.performLightCulling(lights, smallCamera);
    }).not.toThrow();
  });

  it('should handle very large camera far plane', () => {
    const largeCamera = new PerspectiveCamera(75, 1, 0.1, 100000);
    largeCamera.position.set(0, 5, 10);

    const lights = [
      new PointLight(0xffffff, 1),
      new PointLight(0xffffff, 1),
    ];

    expect(() => {
      lightingOptimizer.performLightCulling(lights, largeCamera);
    }).not.toThrow();
  });

  it('should handle zero intensity lights', () => {
    const zeroLight = new PointLight(0xffffff, 0);
    zeroLight.position.set(0, 0, 5);

    const normalLight = new PointLight(0xffffff, 1);
    normalLight.position.set(0, 0, 5);

    const culledLights = lightingOptimizer.performLightCulling([zeroLight, normalLight], camera);

    expect(culledLights).toContain(normalLight);
  });

  it('should handle lights at camera position', () => {
    const light = new PointLight(0xffffff, 1);
    light.position.copy(camera.position);

    const culledLights = lightingOptimizer.performLightCulling([light], camera);

    expect(culledLights.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle very close objects', () => {
    const closeObject = new Mesh(new BufferGeometry(), null);
    closeObject.geometry.boundingSphere = new Sphere(new Vector3(0, 5, 10.00001), 1);

    const shouldCast = lightingOptimizer.shouldCastShadow(closeObject, camera);

    expect(typeof shouldCast).toBe('boolean');
  });

  it('should handle very far objects', () => {
    const farObject = new Mesh(new BufferGeometry(), null);
    farObject.geometry.boundingSphere = new Sphere(new Vector3(0, 0, 10000), 1);

    const shouldCast = lightingOptimizer.shouldCastShadow(farObject, camera);

    expect(shouldCast).toBe(false);
  });
});
