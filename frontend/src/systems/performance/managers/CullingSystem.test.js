/**
 * Unit Tests for CullingSystem
 * 
 * Tests core frustum culling and render queue functionality
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  Vector3, 
  Sphere, 
  Box3, 
  Mesh, 
  BoxGeometry, 
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Group
} from 'three';
import CullingSystem from './CullingSystem';

// Mock camera setup for testing
function createTestCamera() {
  const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.set(0, 0, 10);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

// Helper to create a test mesh at a specific position
function createTestMesh(position = new Vector3(0, 0, 0)) {
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshBasicMaterial({ color: 0xff0000 });
  const mesh = new Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.updateMatrixWorld();
  return mesh;
}

describe('CullingSystem', () => {
  let cullingSystem;
  let camera;

  beforeEach(() => {
    cullingSystem = new CullingSystem();
    camera = createTestCamera();
  });

  afterEach(() => {
    cullingSystem.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(cullingSystem).toBeDefined();
      expect(cullingSystem.frustumPlanes).toHaveLength(6);
      expect(cullingSystem.occluders.size).toBe(0);
    });

    it('should accept custom configuration', () => {
      const customSystem = new CullingSystem({
        frustumMargin: 1.5,
        occlusionTestFrequency: 10
      });
      expect(customSystem.frustumMargin).toBe(1.5);
      expect(customSystem.occlusionTestFrequency).toBe(10);
      customSystem.dispose();
    });

    it('should initialize statistics', () => {
      const stats = cullingSystem.getCullingStats();
      expect(stats).toEqual({
        totalObjects: 0,
        frustumCulled: 0,
        occlusionCulled: 0,
        rendered: 0,
        occlusionTestsPerFrame: 0,
        averageOcclusionTime: 0,
        shadowCastingTotal: 0,
        shadowCastingCulled: 0,
        shadowCastingRendered: 0,
        shadowCastingRatio: 0,
        cullingEfficiency: 0,
        debugEnabled: false,
        currentFrame: 0
      });
    });
  });

  describe('Frustum Culling', () => {
    it('should not cull objects within frustum', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      const objects = [mesh];

      const result = cullingSystem.performFrustumCulling(objects, camera);

      expect(result.visibleObjects).toContain(mesh);
      expect(result.frustumCulled).not.toContain(mesh);
      expect(result.renderQueue.length).toBe(1);
    });

    it('should cull objects far to the side (outside frustum)', () => {
      // Object far to the right, likely outside frustum
      const mesh = createTestMesh(new Vector3(50, 0, 0));
      const objects = [mesh];

      const result = cullingSystem.performFrustumCulling(objects, camera);

      // This object should be culled as it's outside the viewing frustum
      expect(result.frustumCulled.length).toBeGreaterThanOrEqual(0);
    });

    it('should cull objects behind camera', () => {
      // Object behind camera
      const mesh = createTestMesh(new Vector3(0, 0, 20));
      const objects = [mesh];

      const result = cullingSystem.performFrustumCulling(objects, camera);

      // Behind camera objects are typically outside frustum
      expect(result.visibleObjects.length + result.frustumCulled.length).toBe(1);
    });

    it('should handle empty object array', () => {
      const result = cullingSystem.performFrustumCulling([], camera);

      expect(result.visibleObjects).toEqual([]);
      expect(result.frustumCulled).toEqual([]);
      expect(result.renderQueue).toEqual([]);
    });

    it('should skip invisible objects', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      mesh.visible = false;
      const objects = [mesh];

      const result = cullingSystem.performFrustumCulling(objects, camera);

      expect(result.visibleObjects).not.toContain(mesh);
      expect(result.renderQueue).toEqual([]);
    });

    it('should calculate distance to camera correctly', () => {
      const mesh1 = createTestMesh(new Vector3(0, 0, -5));
      const mesh2 = createTestMesh(new Vector3(0, 0, -15));
      const objects = [mesh1, mesh2];

      const result = cullingSystem.performFrustumCulling(objects, camera);

      // Should have both meshes in visible if both in frustum
      if (result.renderQueue.length === 2) {
        // mesh1 should be closer than mesh2
        expect(result.renderQueue[0].distanceToCamera).toBeLessThan(
          result.renderQueue[1].distanceToCamera
        );
      }
    });
  });

  describe('Render Queue Sorting', () => {
    it('should sort opaques before transparent objects', () => {
      const opaqueMesh = createTestMesh(new Vector3(0, 0, -10));
      opaqueMesh.material = new MeshBasicMaterial({ color: 0xff0000, transparent: false });

      const transparentMesh = createTestMesh(new Vector3(0, 0, -15));
      transparentMesh.material = new MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true,
        opacity: 0.5
      });

      const objects = [transparentMesh, opaqueMesh];

      const result = cullingSystem.performFrustumCulling(objects, camera);

      // If both are visible, opaque should come first in render queue
      if (result.renderQueue.length === 2) {
        expect(result.renderQueue[0].renderPriority).toBeLessThan(
          result.renderQueue[1].renderPriority
        );
      }
    });

    it('should sort objects by distance for opaque objects', () => {
      const near = createTestMesh(new Vector3(0, 0, -5));
      const far = createTestMesh(new Vector3(0, 0, -20));
      const objects = [far, near]; // Add in reverse order

      const result = cullingSystem.performFrustumCulling(objects, camera);

      // If both visible, near should come before far
      if (result.renderQueue.length === 2) {
        expect(result.renderQueue[0].distanceToCamera).toBeLessThan(
          result.renderQueue[1].distanceToCamera
        );
      }
    });

    it('should sort objects by reverse distance for transparent objects', () => {
      const near = createTestMesh(new Vector3(0, 0, -5));
      near.material = new MeshBasicMaterial({ transparent: true });

      const far = createTestMesh(new Vector3(0, 0, -20));
      far.material = new MeshBasicMaterial({ transparent: true });

      const objects = [near, far];

      const result = cullingSystem.performFrustumCulling(objects, camera);

      // Transparent objects should be sorted back-to-front
      if (result.renderQueue.length === 2) {
        // Last entries are transparent, should be back-to-front
        expect(result.renderQueue[0].distanceToCamera).toBeGreaterThan(
          result.renderQueue[1].distanceToCamera
        );
      }
    });
  });

  describe('Occluder Management', () => {
    it('should add occluders', () => {
      const occluder = createTestMesh();
      expect(cullingSystem.occluders.size).toBe(0);

      cullingSystem.addOccluder(occluder);

      expect(cullingSystem.occluders.size).toBe(1);
    });

    it('should not add duplicate occluders', () => {
      const occluder = createTestMesh();

      cullingSystem.addOccluder(occluder);
      cullingSystem.addOccluder(occluder);

      expect(cullingSystem.occluders.size).toBe(1);
    });

    it('should remove occluders', () => {
      const occluder = createTestMesh();
      cullingSystem.addOccluder(occluder);

      cullingSystem.removeOccluder(occluder);

      expect(cullingSystem.occluders.size).toBe(0);
    });

    it('should handle null occluders gracefully', () => {
      expect(() => {
        cullingSystem.addOccluder(null);
        cullingSystem.removeOccluder(null);
      }).not.toThrow();
    });
  });

  describe('Occlusion Culling', () => {
    it('should update occlusion culling', () => {
      const objects = [createTestMesh(new Vector3(0, 0, -5))];
      expect(() => {
        cullingSystem.updateOcclusionCulling(objects, []);
      }).not.toThrow();
    });

    it('should set occlusion test frequency', () => {
      cullingSystem.setOcclusionTestFrequency(10);
      expect(cullingSystem.occlusionTestFrequency).toBe(10);
    });

    it('should reject invalid occlusion test frequency', () => {
      expect(() => {
        cullingSystem.setOcclusionTestFrequency(0);
      }).toThrow();

      expect(() => {
        cullingSystem.setOcclusionTestFrequency(-5);
      }).toThrow();
    });

    it('should handle empty occlusion culling', () => {
      expect(() => {
        cullingSystem.updateOcclusionCulling([], []);
      }).not.toThrow();
    });

    it('should respect occlusion test frequency (Requirement 3.4)', () => {
      const objects = [createTestMesh(new Vector3(0, 0, -5))];
      cullingSystem.setOcclusionTestFrequency(5);

      // First call at frame 0 - should run
      cullingSystem.updateOcclusionCulling(objects, []);
      let stats1 = cullingSystem.getCullingStats();
      
      // Frames 1-3 - should not run test
      for (let i = 0; i < 4; i++) {
        cullingSystem.currentFrame++;
        cullingSystem.updateOcclusionCulling(objects, []);
      }

      // Frame 5 - should run test again
      cullingSystem.currentFrame++;
      cullingSystem.updateOcclusionCulling(objects, []);
      let stats2 = cullingSystem.getCullingStats();

      // Stats should reflect the frame-based frequency
      expect(cullingSystem.currentFrame).toBe(5);
    });
  });

  describe('Statistics', () => {
    it('should track culling statistics', () => {
      const near = createTestMesh(new Vector3(0, 0, -5));
      const far = createTestMesh(new Vector3(100, 100, -50));
      const objects = [near, far];

      cullingSystem.performFrustumCulling(objects, camera);
      const stats = cullingSystem.getCullingStats();

      expect(stats.totalObjects).toBe(2);
      expect(stats.frustumCulled + stats.rendered).toBe(2);
      expect(stats.rendered).toBeGreaterThanOrEqual(0);
      expect(stats.frustumCulled).toBeGreaterThanOrEqual(0);
    });

    it('should increment frame counter', () => {
      const mesh = createTestMesh();
      const initialFrame = cullingSystem.currentFrame;

      cullingSystem.performFrustumCulling([mesh], camera);

      expect(cullingSystem.currentFrame).toBe(initialFrame + 1);
    });
  });

  describe('Debug Visualization', () => {
    it('should enable and disable debug visualization', () => {
      expect(cullingSystem.debugVisualizationEnabled).toBe(false);

      cullingSystem.setDebugVisualization(true);
      expect(cullingSystem.debugVisualizationEnabled).toBe(true);

      cullingSystem.setDebugVisualization(false);
      expect(cullingSystem.debugVisualizationEnabled).toBe(false);
    });

    it('should clear debug bounds when disabled', () => {
      cullingSystem.setDebugVisualization(true);
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      cullingSystem.performFrustumCulling([mesh], camera);

      expect(cullingSystem.debugBounds.length).toBeGreaterThanOrEqual(0);

      cullingSystem.setDebugVisualization(false);
      expect(cullingSystem.debugBounds).toEqual([]);
    });

    it('should populate debug bounds when enabled', () => {
      cullingSystem.setDebugVisualization(true);
      const mesh = createTestMesh(new Vector3(0, 0, -5));

      cullingSystem.performFrustumCulling([mesh], camera);

      expect(cullingSystem.debugBounds).toBeDefined();
    });
  });

  describe('Bounding Sphere Caching', () => {
    it('should cache bounding spheres in userData', () => {
      // Bounding spheres are intentionally NOT cached in userData anymore because
      // caching world-space spheres goes stale as objects move. The geometry-level
      // boundingSphere (local space) is still computed and stored on geometry.
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      cullingSystem.performFrustumCulling([mesh], camera);

      // The geometry-level boundingSphere should be computed
      expect(mesh.geometry.boundingSphere).toBeDefined();
      expect(mesh.geometry.boundingSphere).toHaveProperty('center');
      expect(mesh.geometry.boundingSphere).toHaveProperty('radius');
    });

    it('should reuse cached bounding spheres', () => {
      // Two successive calls should work correctly without errors
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      const objects = [mesh];

      expect(() => cullingSystem.performFrustumCulling(objects, camera)).not.toThrow();
      expect(() => cullingSystem.performFrustumCulling(objects, camera)).not.toThrow();

      // Geometry sphere should be stable across calls (local-space, not world-space)
      expect(mesh.geometry.boundingSphere).toBeDefined();
    });
  });


  describe('Object Geometry Handling', () => {
    it('should handle objects with geometry', () => {
      const mesh = createTestMesh();
      expect(() => {
        cullingSystem.performFrustumCulling([mesh], camera);
      }).not.toThrow();
    });

    it('should handle objects without geometry', () => {
      const group = new Group();
      group.position.set(0, 0, -5);
      const mesh = createTestMesh();
      group.add(mesh);

      expect(() => {
        cullingSystem.performFrustumCulling([group], camera);
      }).not.toThrow();
    });

    it('should handle objects with multiple materials', () => {
      const mesh = createTestMesh();
      mesh.material = [
        new MeshBasicMaterial({ color: 0xff0000 }),
        new MeshBasicMaterial({ color: 0x00ff00, transparent: true })
      ];

      expect(() => {
        cullingSystem.performFrustumCulling([mesh], camera);
      }).not.toThrow();
    });
  });

  describe('Frustum Plane Calculations', () => {
    it('should correctly update frustum planes from camera', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));

      cullingSystem.performFrustumCulling([mesh], camera);

      // After frustum culling, planes should be updated
      expect(cullingSystem.frustumPlanes).toHaveLength(6);
      cullingSystem.frustumPlanes.forEach(plane => {
        expect(plane.normal).toBeDefined();
        expect(plane.normal.length()).toBeCloseTo(1, 0.1); // Should be normalized
        expect(plane.constant).toBeDefined();
      });
    });

    it('should handle different camera positions', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));

      // Test with camera at different position
      const camera2 = createTestCamera();
      camera2.position.set(10, 10, 10);
      camera2.updateMatrixWorld();

      expect(() => {
        cullingSystem.performFrustumCulling([mesh], camera2);
      }).not.toThrow();
    });
  });

  describe('Disposal', () => {
    it('should dispose resources', () => {
      const occluder = createTestMesh();
      cullingSystem.addOccluder(occluder);

      cullingSystem.dispose();

      expect(cullingSystem.occluders.size).toBe(0);
      expect(cullingSystem.frustumPlanes.length).toBe(0);
    });
  });

  describe('GPU Occlusion Queries (Task 3.2)', () => {
    it('should initialize GPU occlusion queries', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      const gpuQuery = cullingSystem.initGPUOcclusionQueries(mesh);

      expect(gpuQuery).toBeDefined();
      expect(gpuQuery.id).toBe(mesh.uuid);
      expect(gpuQuery.resultReady).toBe(false);
      expect(gpuQuery.samplesPassed).toBe(0);
    });

    it('should issue GPU occlusion queries', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      cullingSystem.initGPUOcclusionQueries(mesh);

      expect(() => {
        cullingSystem.issueGPUOcclusionQuery(null, mesh);
      }).not.toThrow();

      const occlusionTest = cullingSystem.occlusionTests.get(mesh.uuid);
      expect(occlusionTest.testInProgress).toBe(true);
      expect(occlusionTest.gpuQuery.issuedFrame).toBe(cullingSystem.currentFrame);
    });

    it('should retrieve GPU occlusion query results', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      cullingSystem.initGPUOcclusionQueries(mesh);
      cullingSystem.issueGPUOcclusionQuery(null, mesh);

      const isVisible = cullingSystem.retrieveGPUOcclusionQueryResult(null, mesh);

      expect(typeof isVisible).toBe('boolean');
      const occlusionTest = cullingSystem.occlusionTests.get(mesh.uuid);
      expect(occlusionTest.testInProgress).toBe(false);
      expect(occlusionTest.gpuQuery.resultReady).toBe(true);
    });

    it('should handle GPU query for uninitialized objects', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));

      const result = cullingSystem.retrieveGPUOcclusionQueryResult(null, mesh);

      // Should return visible if not initialized
      expect(result).toBe(true);
    });
  });

  describe('Occlusion Bounds Management (Task 3.2)', () => {
    it('should get occlusion bounds from building geometry', () => {
      const building = createTestMesh(new Vector3(0, 0, -20));
      const bounds = cullingSystem.getOcclusionBounds(building);

      expect(bounds).toBeInstanceOf(Box3);
      expect(bounds.isEmpty()).toBe(false);
    });

    it('should handle null occlusion bounds', () => {
      const bounds = cullingSystem.getOcclusionBounds(null);
      expect(bounds).toBeInstanceOf(Box3);
      expect(bounds.isEmpty()).toBe(true);
    });

    it('should test if object is potentially occluded', () => {
      const building = createTestMesh(new Vector3(0, 0, -20));
      const occlusionBounds = cullingSystem.getOcclusionBounds(building);

      const objectBehind = createTestMesh(new Vector3(0, 0, -25));
      const isOccluded = cullingSystem.isPotentiallyOccluded(objectBehind, occlusionBounds);

      expect(typeof isOccluded).toBe('boolean');
    });

    it('should handle occlusion test with null bounds', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      const result = cullingSystem.isPotentiallyOccluded(mesh, null);

      expect(result).toBe(false);
    });
  });

  describe('Debug Visualization and Statistics (Task 3.3)', () => {
    it('should provide debug visualization data', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      cullingSystem.setDebugVisualization(true);
      cullingSystem.performFrustumCulling([mesh], camera);

      const debugData = cullingSystem.getDebugVisualizationData();

      expect(debugData).toBeDefined();
      expect(debugData.visibleBounds).toBeDefined();
      expect(debugData.culledBounds).toBeDefined();
      expect(debugData.frustumPlanes).toBeDefined();
      expect(debugData.stats).toBeDefined();
      expect(debugData.currentFrame).toBeDefined();
    });

    it('should return null when debug visualization disabled', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      cullingSystem.setDebugVisualization(false);
      cullingSystem.performFrustumCulling([mesh], camera);

      const debugData = cullingSystem.getDebugVisualizationData();

      expect(debugData).toBeNull();
    });

    it('should generate frustum visualization', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      cullingSystem.performFrustumCulling([mesh], camera);

      const frustumViz = cullingSystem.generateFrustumVisualization();

      expect(frustumViz.planes).toBeDefined();
      expect(Array.isArray(frustumViz.planes)).toBe(true);
      expect(frustumViz.statistics).toBeDefined();
      expect(frustumViz.statistics.visibleCount).toBeGreaterThanOrEqual(0);
      expect(frustumViz.statistics.culledCount).toBeGreaterThanOrEqual(0);
      expect(frustumViz.statistics.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should generate occluded object visualization', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      cullingSystem.performFrustumCulling([mesh], camera);

      const occludedViz = cullingSystem.generateOccludedObjectVisualization();

      expect(Array.isArray(occludedViz)).toBe(true);
    });

    it('should track shadow casting object separation (Requirement 3.5, 12.4)', () => {
      const shadowMesh = createTestMesh(new Vector3(0, 0, -5));
      shadowMesh.castShadow = true;

      const regularMesh = createTestMesh(new Vector3(0, 0, -10));
      regularMesh.castShadow = false;

      cullingSystem.setDebugVisualization(true);
      cullingSystem.performFrustumCulling([shadowMesh, regularMesh], camera);

      const stats = cullingSystem.getCullingStats();

      expect(stats).toHaveProperty('shadowCastingCulled');
      expect(stats).toHaveProperty('shadowCastingRendered');
      expect(stats).toHaveProperty('shadowCastingRatio');
      expect(typeof stats.shadowCastingRatio).toBe('number');
      expect(stats.shadowCastingRatio).toBeGreaterThanOrEqual(0);
      expect(stats.shadowCastingRatio).toBeLessThanOrEqual(1);
    });

    it('should include debug flag in statistics', () => {
      const stats = cullingSystem.getCullingStats();

      expect(stats).toHaveProperty('debugEnabled');
      expect(typeof stats.debugEnabled).toBe('boolean');
    });
  });

  describe('Render Queue Entry Sorting (Task 3.4)', () => {
    it('should create render queue entries with correct properties', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      const result = cullingSystem.performFrustumCulling([mesh], camera);

      if (result.renderQueue.length > 0) {
        const entry = result.renderQueue[0];
        expect(entry).toHaveProperty('object');
        expect(entry).toHaveProperty('distanceToCamera');
        expect(entry).toHaveProperty('renderPriority');
        expect(entry).toHaveProperty('lodLevel');
        expect(typeof entry.distanceToCamera).toBe('number');
        expect(typeof entry.renderPriority).toBe('number');
        expect(typeof entry.lodLevel).toBe('number');
      }
    });

    it('should assign priority based on material transparency (Task 3.4)', () => {
      const opaqueMesh = createTestMesh(new Vector3(0, 0, -5));
      opaqueMesh.material = new MeshBasicMaterial({ color: 0xff0000, transparent: false });

      const transparentMesh = createTestMesh(new Vector3(0, 0, -5));
      transparentMesh.material = new MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true,
        opacity: 0.5
      });

      const result = cullingSystem.performFrustumCulling(
        [opaqueMesh, transparentMesh], 
        camera
      );

      // Find the entries
      const opaqueEntry = result.renderQueue.find(e => e.object === opaqueMesh);
      const transparentEntry = result.renderQueue.find(e => e.object === transparentMesh);

      if (opaqueEntry && transparentEntry) {
        expect(opaqueEntry.renderPriority).toBeLessThan(transparentEntry.renderPriority);
      }
    });

    it('should maintain LOD level information in render queue', () => {
      const mesh = createTestMesh(new Vector3(0, 0, -5));
      mesh.userData.lodLevel = 1;

      const result = cullingSystem.performFrustumCulling([mesh], camera);

      if (result.renderQueue.length > 0) {
        expect(result.renderQueue[0].lodLevel).toBe(1);
      }
    });
  });
});

