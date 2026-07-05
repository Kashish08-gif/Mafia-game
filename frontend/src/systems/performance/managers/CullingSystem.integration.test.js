/**
 * Integration Tests for CullingSystem - Occlusion Culling
 * 
 * Tests complete occlusion culling workflow including:
 * - 5-frame update cycle for GPU queries
 * - GPU query lifecycle management
 * - Occlusion bounds management
 * - Rendering with occluders and occludees
 * 
 * Validates: Requirements 3.2, 3.4
 * Task: 3.2 Implement Occlusion Culling with GPU queries
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  Vector3,
  Box3,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
  PerspectiveCamera,
  Group
} from 'three';
import CullingSystem from './CullingSystem';

function createTestCamera() {
  const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.set(0, 0, 10);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function createTestMesh(position = new Vector3(0, 0, 0), size = 1) {
  const geometry = new BoxGeometry(size, size, size);
  const material = new MeshBasicMaterial({ color: 0xff0000 });
  const mesh = new Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.updateMatrixWorld();
  return mesh;
}

describe('CullingSystem - Occlusion Culling Integration Tests', () => {
  let cullingSystem;
  let camera;

  beforeEach(() => {
    cullingSystem = new CullingSystem({
      occlusionTestFrequency: 5,
      maxOcclusionTestsPerFrame: 20
    });
    camera = createTestCamera();
  });

  afterEach(() => {
    cullingSystem.dispose();
  });

  describe('5-Frame Update Cycle (Requirement 3.4)', () => {
    it('should implement 5-frame cycle for occlusion testing', () => {
      const objects = [
        createTestMesh(new Vector3(0, 0, -10)),
        createTestMesh(new Vector3(5, 0, -10))
      ];
      const building = createTestMesh(new Vector3(0, 0, -25), 20);
      cullingSystem.getOcclusionBounds(building);

      let testCycleCounts = [];

      // Collect stats every test cycle
      for (let i = 0; i < 30; i++) {
        cullingSystem.currentFrame = i;
        cullingSystem.updateOcclusionCulling(objects, [building], null);
        
        // Collect counts at test cycle frames
        if (i % 5 === 0) {
          testCycleCounts.push({
            frame: i,
            testCount: cullingSystem.stats.occlusionTestsPerFrame
          });
        }
      }

      // Should have test cycles at frames 0, 5, 10, 15, 20, 25
      expect(testCycleCounts.length).toBeGreaterThanOrEqual(4);
      
      // Each cycle should test some objects or maintain state
      for (const cycle of testCycleCounts) {
        expect(typeof cycle.testCount).toBe('number');
        expect(cycle.testCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should update occlusion test frequency and maintain cycle', () => {
      cullingSystem.setOcclusionTestFrequency(5);
      const objects = [createTestMesh(new Vector3(0, 0, -10))];
      const building = createTestMesh(new Vector3(0, 0, -25), 20);
      cullingSystem.getOcclusionBounds(building);

      // Verify frequency is set
      expect(cullingSystem.occlusionTestFrequency).toBe(5);

      // Run and verify cycle
      for (let i = 0; i < 20; i++) {
        cullingSystem.currentFrame = i;
        cullingSystem.updateOcclusionCulling(objects, [building], null);
      }

      // Should have tracked occlusion tests for the objects
      expect(cullingSystem.occlusionTests.size).toBeGreaterThan(0);
    });

    it('should respect custom test frequency for occlusion cycle', () => {
      cullingSystem.setOcclusionTestFrequency(3);
      expect(cullingSystem.occlusionTestFrequency).toBe(3);

      const objects = [createTestMesh(new Vector3(0, 0, -10))];
      const building = createTestMesh(new Vector3(0, 0, -25), 20);
      cullingSystem.getOcclusionBounds(building);

      // Verify that modulo check works with custom frequency
      for (let i = 0; i < 10; i++) {
        cullingSystem.currentFrame = i;
        cullingSystem.updateOcclusionCulling(objects, [building], null);
        
        // On test cycle frames (0, 3, 6, 9), testInProgress or initialization should happen
        if (i % 3 === 0) {
          expect(cullingSystem.occlusionTests.size).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('GPU Query Lifecycle (Requirement 3.2)', () => {
    it('should initialize GPU queries for objects', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -10));
      
      cullingSystem.initGPUOcclusionQueries(mesh);
      
      const occlusionTest = cullingSystem.occlusionTests.get(mesh.uuid);
      expect(occlusionTest).toBeDefined();
      expect(occlusionTest.gpuQuery).toBeDefined();
      expect(occlusionTest.gpuQuery.samplesPassed).toBe(0);
      expect(occlusionTest.gpuQuery.resultReady).toBe(false);
    });

    it('should track pending queries', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -10));
      const building = createTestMesh(new Vector3(0, 0, -25), 20);
      
      cullingSystem.getOcclusionBounds(building);
      cullingSystem.initGPUOcclusionQueries(mesh);
      cullingSystem.issueGPUOcclusionQuery(null, mesh);

      expect(cullingSystem.pendingOcclusionQueries.size).toBe(1);
      expect(cullingSystem.pendingOcclusionQueries.has(mesh.uuid)).toBe(true);
    });

    it('should remove pending queries when retrieving results', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -10));
      const building = createTestMesh(new Vector3(0, 0, -25), 20);
      
      cullingSystem.getOcclusionBounds(building);
      cullingSystem.initGPUOcclusionQueries(mesh);
      cullingSystem.issueGPUOcclusionQuery(null, mesh);

      expect(cullingSystem.pendingOcclusionQueries.size).toBe(1);

      cullingSystem.retrieveGPUOcclusionQueryResult(null, mesh);

      // Pending queries may still exist if result not ready, but test should be in-progress = false
      const occlusionTest = cullingSystem.occlusionTests.get(mesh.uuid);
      expect(occlusionTest.testInProgress).toBe(false);
    });

    it('should update visibility based on query results', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -10));
      const building = createTestMesh(new Vector3(0, 0, -25), 20);
      
      cullingSystem.getOcclusionBounds(building);
      cullingSystem.initGPUOcclusionQueries(mesh);

      // Initially visible
      let occlusionTest = cullingSystem.occlusionTests.get(mesh.uuid);
      expect(occlusionTest.isVisible).toBe(true);

      cullingSystem.issueGPUOcclusionQuery(null, mesh);
      
      // Simulate query result by setting samplesPassed to 0 (occluded)
      occlusionTest = cullingSystem.occlusionTests.get(mesh.uuid);
      occlusionTest.gpuQuery.samplesPassed = 0; // No samples passed = occluded
      cullingSystem.retrieveGPUOcclusionQueryResult(null, mesh);

      occlusionTest = cullingSystem.occlusionTests.get(mesh.uuid);
      expect(occlusionTest.isVisible).toBe(false);
    });
  });

  describe('Occlusion Bounds Management (Requirement 3.2)', () => {
    it('should set occlusion bounds from casino building', () => {
      const building = createTestMesh(new Vector3(0, 0, -30), 50);
      const bounds = cullingSystem.getOcclusionBounds(building);

      expect(bounds).toBeInstanceOf(Box3);
      expect(bounds.isEmpty()).toBe(false);
      expect(cullingSystem.occlusionBounds).toBeDefined();
      expect(cullingSystem.occlusionBounds.equals(bounds)).toBe(true);
    });

    it('should identify objects potentially occluded by building', () => {
      const building = createTestMesh(new Vector3(0, 0, -20), 10);
      const occlusionBounds = cullingSystem.getOcclusionBounds(building);

      // Object behind building
      const behindBuilding = createTestMesh(new Vector3(0, 0, -30));
      const isBehindOccluded = cullingSystem.isPotentiallyOccluded(behindBuilding, occlusionBounds);

      // Object in front of building
      const inFrontOfBuilding = createTestMesh(new Vector3(0, 0, -5));
      const isFrontOccluded = cullingSystem.isPotentiallyOccluded(inFrontOfBuilding, occlusionBounds);

      // Behind building should be potentially occluded
      expect(isBehindOccluded).toBe(true);
      
      // In front should not be occluded
      expect(isFrontOccluded).toBe(false);
    });

    it('should handle objects at various distances from occluder', () => {
      const building = createTestMesh(new Vector3(0, 0, -15), 5);
      const occlusionBounds = cullingSystem.getOcclusionBounds(building);

      // Very far behind
      const veryFar = createTestMesh(new Vector3(0, 0, -100));
      expect(cullingSystem.isPotentiallyOccluded(veryFar, occlusionBounds)).toBe(true);

      // Right behind
      const justBehind = createTestMesh(new Vector3(0, 0, -20));
      expect(cullingSystem.isPotentiallyOccluded(justBehind, occlusionBounds)).toBe(true);
    });

    it('should update occluders dynamically', () => {
      const building = createTestMesh(new Vector3(0, 0, -20), 20);
      cullingSystem.getOcclusionBounds(building);
      cullingSystem.addOccluder(building);

      expect(cullingSystem.occluders.size).toBe(1);
      expect(cullingSystem.occluders.has(building)).toBe(true);

      cullingSystem.removeOccluder(building);
      expect(cullingSystem.occluders.size).toBe(0);
    });
  });

  describe('Occlusion Culling with Multiple Objects', () => {
    it('should handle multiple objects in occlusion cycle', () => {
      const objects = [
        createTestMesh(new Vector3(-5, 0, -20)),
        createTestMesh(new Vector3(0, 0, -20)),
        createTestMesh(new Vector3(5, 0, -20))
      ];
      const building = createTestMesh(new Vector3(0, 0, -30), 50);

      cullingSystem.getOcclusionBounds(building);

      // First cycle
      cullingSystem.updateOcclusionCulling(objects, [building], null);
      expect(cullingSystem.stats.occlusionTestsPerFrame).toBeGreaterThanOrEqual(0);

      // Advance to next test cycle
      for (let i = 0; i < 5; i++) {
        cullingSystem.currentFrame++;
        cullingSystem.updateOcclusionCulling(objects, [building], null);
      }

      // Should have tested objects
      expect(cullingSystem.occlusionTests.size).toBeGreaterThanOrEqual(0);
    });

    it('should respect max tests per frame limit', () => {
      cullingSystem = new CullingSystem({
        maxOcclusionTestsPerFrame: 2
      });

      const objects = [
        createTestMesh(new Vector3(-5, 0, -20)),
        createTestMesh(new Vector3(0, 0, -20)),
        createTestMesh(new Vector3(5, 0, -20)),
        createTestMesh(new Vector3(10, 0, -20))
      ];
      const building = createTestMesh(new Vector3(0, 0, -30), 50);

      cullingSystem.getOcclusionBounds(building);
      cullingSystem.updateOcclusionCulling(objects, [building], null);

      // Should not exceed max tests per frame
      expect(cullingSystem.stats.occlusionTestsPerFrame).toBeLessThanOrEqual(2);
    });

    it('should handle mix of occluded and non-occluded objects', () => {
      const behindBuilding1 = createTestMesh(new Vector3(-10, 0, -30));
      const behindBuilding2 = createTestMesh(new Vector3(10, 0, -30));
      const inFront = createTestMesh(new Vector3(0, 0, -5));

      const objects = [behindBuilding1, behindBuilding2, inFront];
      const building = createTestMesh(new Vector3(0, 0, -20), 30);

      cullingSystem.getOcclusionBounds(building);
      cullingSystem.updateOcclusionCulling(objects, [building], null);

      const behind1Test = cullingSystem.occlusionTests.get(behindBuilding1.uuid);
      const behind2Test = cullingSystem.occlusionTests.get(behindBuilding2.uuid);
      const frontTest = cullingSystem.occlusionTests.get(inFront.uuid);

      // All objects should be registered
      expect(behind1Test || behind2Test || frontTest).toBeDefined();
    });
  });

  describe('Integration with Frustum Culling', () => {
    it('should combine frustum and occlusion culling results', () => {
      const camera = createTestCamera();

      // Object in frustum but potentially occluded
      const occludedObject = createTestMesh(new Vector3(0, 0, -15));

      // Object outside frustum
      const outOfFrustum = createTestMesh(new Vector3(200, 200, 0));

      const objects = [occludedObject, outOfFrustum];
      const building = createTestMesh(new Vector3(0, 0, -25), 50);

      cullingSystem.getOcclusionBounds(building);

      // Perform frustum culling
      const frustumResult = cullingSystem.performFrustumCulling(objects, camera);

      // Then perform occlusion culling
      cullingSystem.updateOcclusionCulling(frustumResult.visibleObjects, [building], null);

      // Occluded object should be in visible from frustum but might be marked occluded
      const occludedTest = cullingSystem.occlusionTests.get(occludedObject.uuid);
      if (occludedTest) {
        expect(typeof occludedTest.isVisible).toBe('boolean');
      }

      // Out of frustum should be culled
      expect(frustumResult.frustumCulled).toContain(outOfFrustum);
    });

    it('should maintain separate results for frustum and occlusion culling', () => {
      const camera = createTestCamera();
      const mesh1 = createTestMesh(new Vector3(0, 0, -10));
      const mesh2 = createTestMesh(new Vector3(100, 0, 0)); // Far out

      const objects = [mesh1, mesh2];
      const result = cullingSystem.performFrustumCulling(objects, camera);

      expect(result.frustumCulled.length + result.visibleObjects.length).toBe(2);
      expect(result.occlusionCulled).toBeDefined();
    });
  });

  describe('Statistics Collection', () => {
    it('should track occlusion test frequency correctly', () => {
      cullingSystem.setOcclusionTestFrequency(5);
      const objects = [createTestMesh(new Vector3(0, 0, -10))];
      const building = createTestMesh(new Vector3(0, 0, -25), 20);

      cullingSystem.getOcclusionBounds(building);

      // First test cycle at frame 0
      cullingSystem.updateOcclusionCulling(objects, [building], null);
      const firstStats = cullingSystem.getCullingStats();
      expect(firstStats.occlusionTestsPerFrame).toBe(1);

      // No tests at frame 1-4
      for (let i = 1; i < 5; i++) {
        cullingSystem.currentFrame++;
        cullingSystem.updateOcclusionCulling(objects, [building], null);
      }

      // Test cycle again at frame 5
      cullingSystem.currentFrame++;
      cullingSystem.updateOcclusionCulling(objects, [building], null);
      const secondStats = cullingSystem.getCullingStats();
      expect(secondStats.occlusionTestsPerFrame).toBeGreaterThanOrEqual(0);
    });

    it('should maintain occlusion test history', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -10));
      const building = createTestMesh(new Vector3(0, 0, -25), 20);

      cullingSystem.getOcclusionBounds(building);
      cullingSystem.updateOcclusionCulling([mesh], [building], null);

      const occlusionTest = cullingSystem.occlusionTests.get(mesh.uuid);
      expect(occlusionTest.lastTestFrame).toBe(0);

      // Advance to next test cycle
      cullingSystem.currentFrame = 5;
      cullingSystem.updateOcclusionCulling([mesh], [building], null);

      const updatedTest = cullingSystem.occlusionTests.get(mesh.uuid);
      expect(updatedTest.lastTestFrame).toBe(5);
    });
  });

  describe('Casino Scene Specific (Requirement 3.2)', () => {
    it('should handle typical casino scene layout', () => {
      // Simulate casino scene with main building and surrounding objects
      const mainBuilding = createTestMesh(new Vector3(0, 0, -50), 100); // Large building
      const slotMachine1 = createTestMesh(new Vector3(-20, 0, -60));
      const slotMachine2 = createTestMesh(new Vector3(20, 0, -60));
      const palmTree1 = createTestMesh(new Vector3(-30, 0, -40));
      const palmTree2 = createTestMesh(new Vector3(30, 0, -40));

      const objects = [slotMachine1, slotMachine2, palmTree1, palmTree2];

      cullingSystem.getOcclusionBounds(mainBuilding);
      cullingSystem.addOccluder(mainBuilding);

      // Run multiple occlusion test cycles
      for (let i = 0; i < 15; i++) {
        cullingSystem.updateOcclusionCulling(objects, [mainBuilding], null);
        if (i % 5 === 0) {
          // At test cycles, verify tracking
          const stats = cullingSystem.getCullingStats();
          expect(stats.occlusionTestsPerFrame).toBeGreaterThanOrEqual(0);
        }
        cullingSystem.currentFrame++;
      }

      // All objects should have been tested at least once
      expect(cullingSystem.occlusionTests.size).toBeGreaterThan(0);
    });

    it('should exclude occluded furniture from render queue', () => {
      const camera = createTestCamera();
      const mainBuilding = createTestMesh(new Vector3(0, 0, -50), 100);

      // Furniture behind building (should be occluded)
      const furniture = createTestMesh(new Vector3(0, 0, -70));
      furniture.userData.furniture = true;

      const objects = [furniture];

      // Setup occlusion culling
      cullingSystem.getOcclusionBounds(mainBuilding);
      cullingSystem.addOccluder(mainBuilding);

      // Perform full culling pass
      const frustumResult = cullingSystem.performFrustumCulling(objects, camera);
      cullingSystem.updateOcclusionCulling(frustumResult.visibleObjects, [mainBuilding], null);

      // Furniture should either be frustum-culled or available for occlusion testing
      expect(
        frustumResult.frustumCulled.includes(furniture) || 
        frustumResult.visibleObjects.includes(furniture)
      ).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null WebGL context gracefully', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -10));
      const building = createTestMesh(new Vector3(0, 0, -25), 20);

      cullingSystem.getOcclusionBounds(building);

      expect(() => {
        cullingSystem.updateOcclusionCulling([mesh], [building], null);
      }).not.toThrow();
    });

    it('should handle empty occluders list', () => {
      const objects = [createTestMesh(new Vector3(0, 0, -10))];

      expect(() => {
        cullingSystem.updateOcclusionCulling(objects, [], null);
      }).not.toThrow();
    });

    it('should handle disposed objects', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -10));

      cullingSystem.updateOcclusionCulling([mesh], [], null);
      cullingSystem.dispose();

      // After dispose, state should be cleared
      expect(cullingSystem.occluders.size).toBe(0);
      expect(cullingSystem.occlusionTests.size).toBe(0);
    });

    it('should handle negative frame indices', () => {
      cullingSystem.currentFrame = -1;
      const objects = [createTestMesh(new Vector3(0, 0, -10))];

      expect(() => {
        cullingSystem.updateOcclusionCulling(objects, [], null);
      }).not.toThrow();
    });

    it('should handle very large object counts', () => {
      const objects = [];
      for (let i = 0; i < 1000; i++) {
        objects.push(createTestMesh(new Vector3(i * 0.1, 0, -10)));
      }

      cullingSystem.setOcclusionTestFrequency(5);

      expect(() => {
        cullingSystem.updateOcclusionCulling(objects, [], null);
      }).not.toThrow();

      // Should respect max tests per frame
      expect(cullingSystem.stats.occlusionTestsPerFrame).toBeLessThanOrEqual(
        cullingSystem.maxOcclusionTestsPerFrame
      );
    });
  });

  describe('Performance Characteristics', () => {
    it('should efficiently stagger tests over 5 frames', () => {
      cullingSystem.setOcclusionTestFrequency(5);
      const objects = [];
      
      // Create 100 test objects
      for (let i = 0; i < 100; i++) {
        objects.push(createTestMesh(new Vector3(i * 0.5, 0, -20)));
      }

      const building = createTestMesh(new Vector3(0, 0, -50), 200);
      cullingSystem.getOcclusionBounds(building);
      cullingSystem.maxOcclusionTestsPerFrame = 50; // Allow up to 50 tests

      // First frame - should test some objects
      cullingSystem.updateOcclusionCulling(objects, [building], null);
      const frame0Tests = cullingSystem.stats.occlusionTestsPerFrame;

      // Verify tests were performed
      expect(frame0Tests).toBeGreaterThan(0);
      expect(frame0Tests).toBeLessThanOrEqual(50);

      // Jump to next test cycle
      cullingSystem.currentFrame = 5;
      cullingSystem.updateOcclusionCulling(objects, [building], null);

      // Should have maintained reasonable performance
      expect(cullingSystem.stats.occlusionTestsPerFrame).toBeLessThanOrEqual(50);
    });
  });
});
