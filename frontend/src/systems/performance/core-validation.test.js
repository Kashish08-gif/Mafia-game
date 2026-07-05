/**
 * Unit Tests for Core Performance System Interfaces and Utilities
 * 
 * Tests interface validation and type checking through JavaScript utility functions.
 * Since JavaScript doesn't have compile-time type checking like TypeScript, this suite
 * validates runtime behavior and interface compliance.
 * 
 * Validates: Requirements 12.1
 * 
 * Run with: npm test -- core-validation.test.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validatePerformanceConfig,
  validateLODGroup,
  validateCullingResult,
  validateInstanceGroup,
  validateMemoryUsageReport,
  validatePerformanceMetrics,
  validateQualityPreset,
  validateHardwareTier,
  validateAssetType,
  calculateBoundingSphere,
  calculateScreenSize,
  calculateDistanceToCamera
} from './validation-utils.js';
import { 
  PERFORMANCE_TARGETS, 
  LOD_CONFIG, 
  CULLING_CONFIG, 
  INSTANCING_CONFIG,
  MEMORY_CONFIG 
} from './constants';
import { 
  QualityPreset, 
  HardwareTier, 
  AssetType,
  LoadStrategy,
  TextureFormat,
  SortingStrategy 
} from './enums';
import { Vector3, Sphere, Box3, PerspectiveCamera, Mesh, BoxGeometry, Material } from 'three';

describe('Core Performance System Validation Utilities', () => {
  
  describe('validatePerformanceConfig', () => {
    it('should validate a complete performance configuration', () => {
      const config = {
        targetFPS: PERFORMANCE_TARGETS.TARGET_FPS,
        maxVRAMUsage: PERFORMANCE_TARGETS.MAX_VRAM_USAGE_GB,
        qualityPreset: QualityPreset.HIGH,
        hardwareTier: HardwareTier.MEDIUM,
        enableAdaptiveQuality: true,
        enableDebugMode: false
      };

      const result = validatePerformanceConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate performance config with default values', () => {
      const config = {
        targetFPS: 60,
        maxVRAMUsage: 2.0
      };

      const result = validatePerformanceConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid targetFPS', () => {
      const config = {
        targetFPS: -10,
        maxVRAMUsage: 2.0
      };

      const result = validatePerformanceConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid maxVRAMUsage', () => {
      const config = {
        targetFPS: 60,
        maxVRAMUsage: -1
      };

      const result = validatePerformanceConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid qualityPreset', () => {
      const config = {
        targetFPS: 60,
        maxVRAMUsage: 2.0,
        qualityPreset: 'invalid'
      };

      const result = validatePerformanceConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid hardwareTier', () => {
      const config = {
        targetFPS: 60,
        maxVRAMUsage: 2.0,
        hardwareTier: 'ultra'
      };

      const result = validatePerformanceConfig(config);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateLODGroup', () => {
    let mockMesh;

    beforeEach(() => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new Material();
      mockMesh = new Mesh(geometry, material);
    });

    it('should validate a complete LOD group', () => {
      const lodGroup = {
        id: 'lod_group_0',
        meshes: [mockMesh, mockMesh],
        distances: [15, 35],
        currentLevel: 0,
        screenSizeThreshold: 0.1,
        transitionState: {
          isTransitioning: false,
          fromLevel: 0,
          toLevel: 0,
          progress: 0,
          startTime: 0
        },
        lastUpdateFrame: 0,
        boundingSphere: new Sphere(new Vector3(0, 0, 0), 1)
      };

      const result = validateLODGroup(lodGroup);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate LOD group with valid distances', () => {
      const lodGroup = {
        id: 'lod_group_test',
        meshes: [mockMesh, mockMesh, mockMesh],
        distances: [10, 25, 50],
        currentLevel: 1,
        screenSizeThreshold: 0.15,
        transitionState: {
          isTransitioning: true,
          fromLevel: 0,
          toLevel: 1,
          progress: 0.5,
          startTime: 100
        },
        lastUpdateFrame: 50,
        boundingSphere: new Sphere(new Vector3(0, 1, 0), 2)
      };

      const result = validateLODGroup(lodGroup);
      expect(result.valid).toBe(true);
    });

    it('should reject LOD group with missing id', () => {
      const lodGroup = {
        meshes: [mockMesh],
        distances: [15],
        currentLevel: 0,
        boundingSphere: new Sphere()
      };

      const result = validateLODGroup(lodGroup);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should reject LOD group with invalid currentLevel', () => {
      const lodGroup = {
        id: 'test',
        meshes: [mockMesh, mockMesh],
        distances: [15, 35],
        currentLevel: 5,
        screenSizeThreshold: 0.1,
        transitionState: { isTransitioning: false },
        boundingSphere: new Sphere()
      };

      const result = validateLODGroup(lodGroup);
      expect(result.valid).toBe(false);
    });

    it('should validate requirement for 2.4 properties', () => {
      const lodGroup = {
        id: 'casino_slot_machine_0',
        meshes: [mockMesh, mockMesh],
        distances: [LOD_CONFIG.HIGH_DETAIL_DISTANCE, LOD_CONFIG.MEDIUM_DETAIL_DISTANCE],
        currentLevel: 0,
        screenSizeThreshold: LOD_CONFIG.SCREEN_SIZE_THRESHOLD,
        transitionState: { isTransitioning: false, fromLevel: 0, toLevel: 0, progress: 0, startTime: 0 },
        lastUpdateFrame: 0,
        boundingSphere: new Sphere(new Vector3(0, 0, 0), 1)
      };

      const result = validateLODGroup(lodGroup);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCullingResult', () => {
    let mockObject;

    beforeEach(() => {
      mockObject = new Mesh(new BoxGeometry(1, 1, 1), new Material());
    });

    it('should validate a complete culling result', () => {
      const cullingResult = {
        visibleObjects: [mockObject],
        frustumCulled: [],
        occlusionCulled: [],
        renderQueue: [
          {
            object: mockObject,
            distanceToCamera: 10,
            renderPriority: 0,
            lodLevel: 0
          }
        ]
      };

      const result = validateCullingResult(cullingResult);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate culling result with multiple objects', () => {
      const cullingResult = {
        visibleObjects: [mockObject, mockObject],
        frustumCulled: [mockObject],
        occlusionCulled: [],
        renderQueue: [
          { object: mockObject, distanceToCamera: 5, renderPriority: 1, lodLevel: 0 },
          { object: mockObject, distanceToCamera: 15, renderPriority: 0, lodLevel: 1 }
        ]
      };

      const result = validateCullingResult(cullingResult);
      expect(result.valid).toBe(true);
    });

    it('should reject culling result with invalid renderQueue entries', () => {
      const cullingResult = {
        visibleObjects: [mockObject],
        frustumCulled: [],
        occlusionCulled: [],
        renderQueue: [
          {
            object: mockObject,
            distanceToCamera: -10, // Invalid negative distance
            renderPriority: 0,
            lodLevel: 0
          }
        ]
      };

      const result = validateCullingResult(cullingResult);
      expect(result.valid).toBe(false);
    });

    it('should reject culling result with invalid lodLevel', () => {
      const cullingResult = {
        visibleObjects: [mockObject],
        frustumCulled: [],
        occlusionCulled: [],
        renderQueue: [
          {
            object: mockObject,
            distanceToCamera: 10,
            renderPriority: 0,
            lodLevel: -1
          }
        ]
      };

      const result = validateCullingResult(cullingResult);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateInstanceGroup', () => {
    let mockMesh;

    beforeEach(() => {
      mockMesh = new Mesh(new BoxGeometry(1, 1, 1), new Material());
    });

    it('should validate a complete instance group', () => {
      const instanceGroup = {
        id: 'instance_slot_machines_0',
        instancedMesh: mockMesh,
        maxInstances: 100,
        activeInstances: 12,
        transforms: [],
        visibilityMask: [],
        cullingData: {
          boundingSpheres: [new Sphere()],
          visibleIndices: [0, 1, 2],
          sortedIndices: [0, 1, 2],
          needsUpdate: false
        },
        lastUpdateFrame: 0
      };

      const result = validateInstanceGroup(instanceGroup);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate instance group with casino threshold requirements', () => {
      const instanceGroup = {
        id: 'casino_slot_machines',
        instancedMesh: mockMesh,
        maxInstances: INSTANCING_CONFIG.SLOT_MACHINE_THRESHOLD,
        activeInstances: INSTANCING_CONFIG.SLOT_MACHINE_THRESHOLD,
        transforms: [],
        visibilityMask: [],
        cullingData: {
          boundingSpheres: [],
          visibleIndices: [],
          sortedIndices: [],
          needsUpdate: false
        },
        lastUpdateFrame: 100
      };

      const result = validateInstanceGroup(instanceGroup);
      expect(result.valid).toBe(true);
    });

    it('should reject instance group with activeInstances > maxInstances', () => {
      const instanceGroup = {
        id: 'test',
        instancedMesh: mockMesh,
        maxInstances: 10,
        activeInstances: 20, // Invalid: more active than max
        transforms: [],
        visibilityMask: [],
        cullingData: { boundingSpheres: [], visibleIndices: [], sortedIndices: [], needsUpdate: false },
        lastUpdateFrame: 0
      };

      const result = validateInstanceGroup(instanceGroup);
      expect(result.valid).toBe(false);
    });

    it('should reject instance group with negative counts', () => {
      const instanceGroup = {
        id: 'test',
        instancedMesh: mockMesh,
        maxInstances: -5,
        activeInstances: 0,
        transforms: [],
        visibilityMask: [],
        cullingData: { boundingSpheres: [], visibleIndices: [], sortedIndices: [], needsUpdate: false },
        lastUpdateFrame: 0
      };

      const result = validateInstanceGroup(instanceGroup);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateMemoryUsageReport', () => {
    it('should validate a complete memory usage report', () => {
      const report = {
        totalAllocated: 512, // MB
        textureMemory: 200,
        geometryMemory: 150,
        shaderMemory: 50,
        instanceMemory: 100,
        availableVRAM: 1024,
        systemMemory: 4096
      };

      const result = validateMemoryUsageReport(report);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate memory usage within target limits', () => {
      const report = {
        totalAllocated: 1500, // Under 2GB limit
        textureMemory: 800,
        geometryMemory: 400,
        shaderMemory: 100,
        instanceMemory: 200,
        availableVRAM: PERFORMANCE_TARGETS.MAX_VRAM_USAGE_GB * 1024,
        systemMemory: 8192
      };

      const result = validateMemoryUsageReport(report);
      expect(result.valid).toBe(true);
    });

    it('should reject report with negative values', () => {
      const report = {
        totalAllocated: -100,
        textureMemory: 100,
        geometryMemory: 50,
        shaderMemory: 25,
        instanceMemory: 50,
        availableVRAM: 1024,
        systemMemory: 4096
      };

      const result = validateMemoryUsageReport(report);
      expect(result.valid).toBe(false);
    });

    it('should reject report where components exceed total', () => {
      const report = {
        totalAllocated: 100,
        textureMemory: 60,
        geometryMemory: 60, // Sum of components > total
        shaderMemory: 25,
        instanceMemory: 25,
        availableVRAM: 1024,
        systemMemory: 4096
      };

      const result = validateMemoryUsageReport(report);
      expect(result.valid).toBe(false);
    });

    it('should validate memory pressure thresholds', () => {
      const vramWarningThreshold = MEMORY_CONFIG.VRAM_WARNING_THRESHOLD;
      const maxVRAM = PERFORMANCE_TARGETS.MAX_VRAM_USAGE_GB * 1024;

      const report = {
        totalAllocated: Math.floor(maxVRAM * vramWarningThreshold),
        textureMemory: Math.floor(maxVRAM * vramWarningThreshold * 0.4),
        geometryMemory: Math.floor(maxVRAM * vramWarningThreshold * 0.3),
        shaderMemory: Math.floor(maxVRAM * vramWarningThreshold * 0.1),
        instanceMemory: Math.floor(maxVRAM * vramWarningThreshold * 0.2),
        availableVRAM: maxVRAM,
        systemMemory: 8192
      };

      const result = validateMemoryUsageReport(report);
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePerformanceMetrics', () => {
    it('should validate a complete performance metrics object', () => {
      const metrics = {
        currentFPS: 60,
        frameTime: 16.67,
        frameTimeHistory: [16.5, 16.7, 16.6],
        vramUsage: 512,
        systemMemoryUsage: 2048,
        drawCalls: 150,
        triangleCount: 500000,
        shaderSwitches: 20,
        textureBindings: 45,
        gpuTime: 12.5,
        cpuTime: 4.2
      };

      const result = validatePerformanceMetrics(metrics);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate metrics at target performance', () => {
      const metrics = {
        currentFPS: PERFORMANCE_TARGETS.TARGET_FPS,
        frameTime: PERFORMANCE_TARGETS.TARGET_FRAME_TIME_MS,
        frameTimeHistory: Array(60).fill(PERFORMANCE_TARGETS.TARGET_FRAME_TIME_MS),
        vramUsage: 1024,
        systemMemoryUsage: 3000,
        drawCalls: 100,
        triangleCount: 1000000,
        shaderSwitches: 10,
        textureBindings: 30,
        gpuTime: 10,
        cpuTime: 3
      };

      const result = validatePerformanceMetrics(metrics);
      expect(result.valid).toBe(true);
    });

    it('should validate metrics under performance stress', () => {
      const metrics = {
        currentFPS: PERFORMANCE_TARGETS.MINIMUM_FPS,
        frameTime: 33.3,
        frameTimeHistory: Array(60).fill(33.3),
        vramUsage: Math.floor(PERFORMANCE_TARGETS.MAX_VRAM_USAGE_GB * 1024 * 0.9),
        systemMemoryUsage: 7000,
        drawCalls: 500,
        triangleCount: 3000000,
        shaderSwitches: 50,
        textureBindings: 100,
        gpuTime: 30,
        cpuTime: 10
      };

      const result = validatePerformanceMetrics(metrics);
      expect(result.valid).toBe(true);
    });

    it('should reject metrics with negative FPS', () => {
      const metrics = {
        currentFPS: -10,
        frameTime: 16.67,
        frameTimeHistory: [],
        vramUsage: 512,
        systemMemoryUsage: 2048,
        drawCalls: 150,
        triangleCount: 500000,
        shaderSwitches: 20,
        textureBindings: 45,
        gpuTime: 12.5,
        cpuTime: 4.2
      };

      const result = validatePerformanceMetrics(metrics);
      expect(result.valid).toBe(false);
    });

    it('should reject metrics with invalid frameTimeHistory length', () => {
      const metrics = {
        currentFPS: 60,
        frameTime: 16.67,
        frameTimeHistory: Array(100).fill(16.67), // Should be max 60 frames
        vramUsage: 512,
        systemMemoryUsage: 2048,
        drawCalls: 150,
        triangleCount: 500000,
        shaderSwitches: 20,
        textureBindings: 45,
        gpuTime: 12.5,
        cpuTime: 4.2
      };

      const result = validatePerformanceMetrics(metrics);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateQualityPreset', () => {
    it('should validate all quality presets', () => {
      Object.values(QualityPreset).forEach(preset => {
        const result = validateQualityPreset(preset);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid quality preset', () => {
      const result = validateQualityPreset('EXTREME');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateHardwareTier', () => {
    it('should validate all hardware tiers', () => {
      Object.values(HardwareTier).forEach(tier => {
        const result = validateHardwareTier(tier);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid hardware tier', () => {
      const result = validateHardwareTier('GAMING');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAssetType', () => {
    it('should validate all asset types', () => {
      Object.values(AssetType).forEach(type => {
        const result = validateAssetType(type);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid asset type', () => {
      const result = validateAssetType('MESH');
      expect(result.valid).toBe(false);
    });
  });

  describe('Calculation Utilities', () => {
    describe('calculateBoundingSphere', () => {
      it('should calculate bounding sphere for single point', () => {
        const positions = [new Vector3(0, 0, 0)];
        const sphere = calculateBoundingSphere(positions);

        expect(sphere).toBeDefined();
        expect(sphere.radius).toBeGreaterThanOrEqual(0);
        expect(sphere.center).toBeDefined();
      });

      it('should calculate bounding sphere for multiple points', () => {
        const positions = [
          new Vector3(0, 0, 0),
          new Vector3(1, 0, 0),
          new Vector3(0, 1, 0),
          new Vector3(0, 0, 1)
        ];
        const sphere = calculateBoundingSphere(positions);

        expect(sphere.radius).toBeGreaterThan(0);
        // All points should be within bounding sphere
        positions.forEach(pos => {
          const distance = sphere.center.distanceTo(pos);
          expect(distance).toBeLessThanOrEqual(sphere.radius + 0.01); // Small tolerance
        });
      });
    });

    describe('calculateScreenSize', () => {
      let camera;

      beforeEach(() => {
        camera = new PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.set(0, 0, 10);
      });

      it('should calculate screen size for objects at different distances', () => {
        const boundingSphere = new Sphere(new Vector3(0, 0, 0), 1);

        const sizeNear = calculateScreenSize(boundingSphere, camera, 5);
        const sizeFar = calculateScreenSize(boundingSphere, camera, 20);

        // Objects closer to camera should appear larger
        expect(sizeNear).toBeGreaterThan(sizeFar);
      });

      it('should return positive screen size', () => {
        const boundingSphere = new Sphere(new Vector3(0, 0, 0), 1);
        const size = calculateScreenSize(boundingSphere, camera, 10);

        expect(size).toBeGreaterThan(0);
      });
    });

    describe('calculateDistanceToCamera', () => {
      let camera;

      beforeEach(() => {
        camera = new PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.set(0, 0, 0);
      });

      it('should calculate distance from camera to point', () => {
        const point = new Vector3(10, 0, 0);
        const distance = calculateDistanceToCamera(point, camera);

        expect(distance).toBeCloseTo(10, 1);
      });

      it('should calculate distance correctly for 3D points', () => {
        camera.position.set(0, 0, 0);
        const point = new Vector3(3, 4, 0);
        const distance = calculateDistanceToCamera(point, camera);

        expect(distance).toBeCloseTo(5, 1); // 3-4-5 triangle
      });

      it('should handle camera at origin', () => {
        const point = new Vector3(0, 0, 10);
        const distance = calculateDistanceToCamera(point, camera);

        expect(distance).toBeCloseTo(10, 1);
      });
    });
  });

  describe('Constant Values Verification', () => {
    it('should have valid performance targets', () => {
      expect(PERFORMANCE_TARGETS.TARGET_FPS).toBe(60);
      expect(PERFORMANCE_TARGETS.MINIMUM_FPS).toBe(30);
      expect(PERFORMANCE_TARGETS.MAX_VRAM_USAGE_GB).toBe(2.0);
      expect(PERFORMANCE_TARGETS.MAX_SCENE_LOAD_TIME_MS).toBe(3000);
    });

    it('should have valid LOD distances per requirements 2.1-2.3', () => {
      expect(PERFORMANCE_TARGETS.TARGET_FPS).toBe(60);
      expect(LOD_CONFIG.HIGH_DETAIL_DISTANCE).toBe(15);
      expect(LOD_CONFIG.MEDIUM_DETAIL_DISTANCE).toBe(35);
    });

    it('should have valid culling configuration', () => {
      expect(CULLING_CONFIG.OCCLUSION_TEST_FREQUENCY).toBe(5);
      expect(CULLING_CONFIG.MIN_SHADOW_CASTER_SIZE).toBe(4);
    });

    it('should have valid instancing thresholds per requirement 4.5', () => {
      expect(INSTANCING_CONFIG.MIN_INSTANCE_COUNT).toBe(3);
      expect(INSTANCING_CONFIG.SLOT_MACHINE_THRESHOLD).toBe(6);
    });

    it('should have valid memory configuration per requirement 10.1', () => {
      expect(MEMORY_CONFIG.ASSET_TIMEOUT_MS).toBe(30000);
      expect(MEMORY_CONFIG.GC_FREQUENCY_MS).toBe(5000);
    });
  });

  describe('Requirement Traceability', () => {
    it('should validate constants match requirement 1.1 (60fps target)', () => {
      expect(PERFORMANCE_TARGETS.TARGET_FPS).toBe(60);
      expect(PERFORMANCE_TARGETS.TARGET_FRAME_TIME_MS).toBeCloseTo(16.67, 1);
    });

    it('should validate LOD distances match requirement 2.1-2.3', () => {
      expect(LOD_CONFIG.HIGH_DETAIL_DISTANCE).toBe(15);
      expect(LOD_CONFIG.MEDIUM_DETAIL_DISTANCE).toBe(35);
    });

    it('should validate culling frequency matches requirement 3.4', () => {
      expect(CULLING_CONFIG.OCCLUSION_TEST_FREQUENCY).toBe(5);
    });

    it('should validate instance threshold matches requirement 4.5', () => {
      expect(INSTANCING_CONFIG.MIN_INSTANCE_COUNT).toBe(3);
      expect(INSTANCING_CONFIG.SLOT_MACHINE_THRESHOLD).toBe(6);
    });

    it('should validate memory cleanup matches requirement 10.1', () => {
      expect(MEMORY_CONFIG.ASSET_TIMEOUT_MS).toBe(30000);
    });
  });
});
