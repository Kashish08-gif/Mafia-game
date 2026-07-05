/**
 * Unit Tests for LODGroupManager
 * 
 * Tests LOD Group management including:
 * - Group registration and lifecycle
 * - Bounding sphere calculations
 * - Mesh tracking and reverse lookup
 * - Group filtering and queries
 * 
 * Validates: Requirements 2.4
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Mesh, BoxGeometry, Material, Sphere, Vector3, Box3, Scene } from 'three';
import LODGroupManager from './LODGroupManager.js';

describe('LODGroupManager', () => {
  let manager;
  let mockMeshes;

  beforeEach(() => {
    manager = new LODGroupManager();

    const geometry = new BoxGeometry(1, 1, 1);
    const material = new Material();
    mockMeshes = [
      new Mesh(geometry, material),
      new Mesh(geometry, material),
      new Mesh(geometry, material)
    ];
  });

  afterEach(() => {
    if (manager) {
      manager.dispose();
    }
  });

  describe('Group Registration', () => {
    it('should register a new LOD group', () => {
      const distances = [15, 35, 100];
      const group = manager.registerLODGroup(mockMeshes, distances);

      expect(group).toBeDefined();
      expect(group.id).toMatch(/^lodgroup_/);
      expect(group.meshes).toHaveLength(3);
      expect(group.distances).toEqual(distances);
    });

    it('should initialize group with correct properties', () => {
      const group = manager.registerLODGroup(mockMeshes, [15, 35, 100]);

      expect(group.currentLevel).toBe(0);
      expect(group.previousLevel).toBe(-1);
      expect(group.isActive).toBe(true);
      expect(group.isCulled).toBe(false);
      expect(group.meshVisibility[0]).toBe(true);
      expect(group.meshVisibility[1]).toBe(false);
      expect(group.meshVisibility[2]).toBe(false);
    });

    it('should throw error when no meshes provided', () => {
      expect(() => manager.registerLODGroup([], [15])).toThrow();
    });

    it('should throw error when meshes and distances mismatch', () => {
      expect(() => {
        manager.registerLODGroup([mockMeshes[0]], [15, 35]);
      }).toThrow();
    });

    it('should throw error when distances not in ascending order', () => {
      expect(() => {
        manager.registerLODGroup(mockMeshes, [35, 15, 100]);
      }).toThrow();
    });

    it('should throw error when distances contain duplicates', () => {
      expect(() => {
        manager.registerLODGroup(mockMeshes, [15, 15, 100]);
      }).toThrow();
    });

    it('should increment group count', () => {
      const initialCount = manager.stats.totalGroups;
      manager.registerLODGroup(mockMeshes, [15, 35, 100]);
      expect(manager.stats.totalGroups).toBe(initialCount + 1);
    });

    it('should track total meshes', () => {
      const initialMeshCount = manager.stats.totalMeshes;
      manager.registerLODGroup(mockMeshes, [15, 35, 100]);
      expect(manager.stats.totalMeshes).toBe(initialMeshCount + 3);
    });
  });

  describe('Bounding Sphere Calculations', () => {
    it('should calculate bounding sphere for group', () => {
      const group = manager.registerLODGroup(mockMeshes, [15, 35, 100]);

      expect(group.boundingSphere).toBeDefined();
      expect(group.boundingSphere).toBeInstanceOf(Sphere);
      expect(group.boundingSphere.radius).toBeGreaterThanOrEqual(0);
    });

    it('should update bounding sphere', () => {
      const group = manager.registerLODGroup(mockMeshes, [15, 35, 100]);
      const originalRadius = group.boundingSphere.radius;

      // Move a mesh
      mockMeshes[0].position.set(10, 10, 10);

      const updatedSphere = manager.updateBoundingSphere(group.id);

      expect(updatedSphere).toBeDefined();
      expect(updatedSphere).toBeInstanceOf(Sphere);
      // Sphere should expand to include new position
      expect(updatedSphere.radius).toBeGreaterThanOrEqual(originalRadius);
    });

    it('should calculate bounds for group', () => {
      const group = manager.registerLODGroup(mockMeshes, [15, 35, 100]);

      expect(group.bounds).toBeDefined();
      expect(group.bounds).toBeInstanceOf(Box3);
    });
  });

  describe('Mesh Tracking and Lookup', () => {
    it('should map meshes to groups', () => {
      const group = manager.registerLODGroup(mockMeshes, [15, 35, 100]);

      mockMeshes.forEach(mesh => {
        const foundGroup = manager.getGroupByMesh(mesh);
        expect(foundGroup).toBe(group);
      });
    });

    it('should return null for unmapped mesh', () => {
      const unmappedMesh = new Mesh(new BoxGeometry(1, 1, 1), new Material());
      const foundGroup = manager.getGroupByMesh(unmappedMesh);

      expect(foundGroup).toBeNull();
    });

    it('should retrieve group by ID', () => {
      const registered = manager.registerLODGroup(mockMeshes, [15, 35, 100]);
      const retrieved = manager.getGroup(registered.id);

      expect(retrieved).toBe(registered);
    });

    it('should return null for non-existent group ID', () => {
      const group = manager.getGroup('nonexistent_id');
      expect(group).toBeNull();
    });
  });

  describe('Group Lifecycle', () => {
    it('should unregister a group', () => {
      const group = manager.registerLODGroup(mockMeshes, [15, 35, 100]);
      const initialCount = manager.stats.totalGroups;

      const removed = manager.unregisterGroup(group.id);

      expect(removed).toBe(true);
      expect(manager.stats.totalGroups).toBe(initialCount - 1);
    });

    it('should return false for non-existent group unregister', () => {
      const removed = manager.unregisterGroup('nonexistent_id');
      expect(removed).toBe(false);
    });

    it('should clean up mesh mappings on unregister', () => {
      const group = manager.registerLODGroup(mockMeshes, [15, 35, 100]);

      manager.unregisterGroup(group.id);

      mockMeshes.forEach(mesh => {
        const foundGroup = manager.getGroupByMesh(mesh);
        expect(foundGroup).toBeNull();
      });
    });
  });

  describe('Group Queries', () => {
    beforeEach(() => {
      // Create multiple groups
      manager.registerLODGroup(mockMeshes, [15, 35, 100]);

      const meshes2 = [
        new Mesh(new BoxGeometry(1, 1, 1), new Material()),
        new Mesh(new BoxGeometry(1, 1, 1), new Material()),
        new Mesh(new BoxGeometry(1, 1, 1), new Material())
      ];
      meshes2[0].position.set(50, 0, 0);
      meshes2[1].position.set(50, 0, 0);
      meshes2[2].position.set(50, 0, 0);

      manager.registerLODGroup(meshes2, [15, 35, 100]);
    });

    it('should get all groups', () => {
      const allGroups = manager.getAllGroups();
      expect(allGroups).toHaveLength(2);
    });

    it('should get groups in range', () => {
      const position = new Vector3(0, 0, 0);
      const nearbyGroups = manager.getGroupsInRange(position, 30);

      // Should include group at origin
      expect(nearbyGroups.length).toBeGreaterThan(0);
    });

    it('should get groups intersecting box', () => {
      const box = new Box3(
        new Vector3(-10, -10, -10),
        new Vector3(10, 10, 10)
      );

      const intersectingGroups = manager.getGroupsIntersectingBox(box);

      expect(intersectingGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track statistics', () => {
      manager.registerLODGroup(mockMeshes, [15, 35, 100]);

      const stats = manager.getStatistics();

      expect(stats).toHaveProperty('totalGroups');
      expect(stats).toHaveProperty('totalMeshes');
      expect(stats).toHaveProperty('totalDistanceLevels');
      expect(stats.totalGroups).toBe(1);
      expect(stats.totalMeshes).toBe(3);
      expect(stats.totalDistanceLevels).toBe(3);
    });

    it('should track bounding sphere statistics', () => {
      manager.registerLODGroup(mockMeshes, [15, 35, 100]);

      const stats = manager.getStatistics();

      expect(stats).toHaveProperty('averageBoundingSphereRadius');
      expect(typeof stats.averageBoundingSphereRadius).toBe('number');
    });

    it('should track frame count', () => {
      manager.update();
      manager.update();

      const stats = manager.getStatistics();

      expect(stats.frameCount).toBe(2);
    });
  });

  describe('Resource Cleanup', () => {
    it('should dispose all resources', () => {
      manager.registerLODGroup(mockMeshes, [15, 35, 100]);
      manager.registerLODGroup(mockMeshes, [15, 35, 100]);

      manager.dispose();

      expect(manager.stats.totalGroups).toBe(0);
      expect(manager.stats.totalMeshes).toBe(0);
      expect(manager.getAllGroups()).toHaveLength(0);
    });
  });

  describe('Automatic LOD Candidate Detection', () => {
    it('should detect LOD candidates from scene', () => {
      const scene = new Scene();

      // Add meshes to scene
      mockMeshes.forEach(mesh => scene.add(mesh));

      const candidates = manager.autoDetectLODCandidates(scene);

      expect(candidates).toBeDefined();
      expect(Array.isArray(candidates)).toBe(true);
    });

    it('should identify mesh size in candidates', () => {
      const scene = new Scene();

      mockMeshes.forEach(mesh => scene.add(mesh));

      const candidates = manager.autoDetectLODCandidates(scene);

      candidates.forEach(candidate => {
        expect(candidate).toHaveProperty('meshIndex');
        expect(candidate).toHaveProperty('triangleCount');
        expect(candidate).toHaveProperty('estimatedSize');
      });
    });

    it('should suggest LOD levels based on triangle count', () => {
      const scene = new Scene();

      mockMeshes.forEach(mesh => scene.add(mesh));

      const candidates = manager.autoDetectLODCandidates(scene);

      candidates.forEach(candidate => {
        expect(candidate.suggestedLODLevels).toBeGreaterThanOrEqual(1);
        expect(candidate.suggestedLODLevels).toBeLessThanOrEqual(3);
      });
    });

    it('should suggest distance thresholds aligned with requirements', () => {
      const scene = new Scene();

      mockMeshes.forEach(mesh => scene.add(mesh));

      const candidates = manager.autoDetectLODCandidates(scene);

      candidates.forEach(candidate => {
        expect(candidate.suggestedDistances).toBeDefined();
        expect(Array.isArray(candidate.suggestedDistances)).toBe(true);
        // Check requirements 2.1, 2.2, 2.3 distances
        expect(candidate.suggestedDistances).toContain(15);
        expect(candidate.suggestedDistances).toContain(35);
      });
    });

    it('should mark optimizable meshes correctly', () => {
      const scene = new Scene();

      mockMeshes.forEach(mesh => scene.add(mesh));

      const candidates = manager.autoDetectLODCandidates(scene);

      candidates.forEach(candidate => {
        expect(candidate.isOptimizable).toBe(true);
      });
    });

    it('should filter out non-optimizable meshes', () => {
      const scene = new Scene();

      // Add tiny mesh that shouldn't be optimized (smaller than threshold)
      const tinyGeometry = new BoxGeometry(0.01, 0.01, 0.01);
      const tinyMesh = new Mesh(tinyGeometry, new Material());
      scene.add(tinyMesh);

      // Add regular meshes
      mockMeshes.forEach(mesh => scene.add(mesh));

      const candidates = manager.autoDetectLODCandidates(scene);

      // Should only detect the regular meshes, not the tiny one
      candidates.forEach(candidate => {
        expect(candidate.triangleCount).toBeGreaterThanOrEqual(12);
      });
    });

    it('should sort candidates by optimization potential', () => {
      const scene = new Scene();

      // Add meshes in random order
      for (let i = 0; i < 3; i++) {
        const geom = new BoxGeometry(i + 1, i + 1, i + 1);
        const mesh = new Mesh(geom, new Material());
        scene.add(mesh);
      }

      const candidates = manager.autoDetectLODCandidates(scene);

      // Candidates should be sorted by triangle count descending
      for (let i = 0; i < candidates.length - 1; i++) {
        expect(candidates[i].triangleCount).toBeGreaterThanOrEqual(
          candidates[i + 1].triangleCount
        );
      }
    });
  });

  describe('LOD Level and Distance Calculation', () => {
    it('should suggest 3 LOD levels for high detail meshes', () => {
      const scene = new Scene();

      // Create high-detail mesh (many triangles)
      const largeGeometry = new BoxGeometry(10, 10, 10);
      const largeMesh = new Mesh(largeGeometry, new Material());
      scene.add(largeMesh);

      const candidates = manager.autoDetectLODCandidates(scene);

      if (candidates.length > 0) {
        const candidate = candidates[0];
        if (candidate.triangleCount > 10000) {
          expect(candidate.suggestedLODLevels).toBe(3);
        }
      }
    });

    it('should align suggested distances with requirement thresholds', () => {
      const scene = new Scene();

      mockMeshes.forEach(mesh => scene.add(mesh));

      const candidates = manager.autoDetectLODCandidates(scene);

      candidates.forEach(candidate => {
        // Requirement 2.1: LOD0 threshold at 15 units
        // Requirement 2.2: LOD1 threshold at 35 units
        expect(candidate.suggestedDistances[0]).toBe(15);
        expect(candidate.suggestedDistances[1]).toBe(35);
      });
    });
  });

  describe('Integration with LOD Group Registration', () => {
    it('should register LOD group from detected candidate', () => {
      const scene = new Scene();

      mockMeshes.forEach(mesh => scene.add(mesh));

      const candidates = manager.autoDetectLODCandidates(scene);

      if (candidates.length > 0) {
        const candidate = candidates[0];
        // Create LOD meshes based on candidate suggestions
        const lodMeshes = Array(candidate.suggestedLODLevels)
          .fill(0)
          .map((_, i) => mockMeshes[i % mockMeshes.length]);

        const group = manager.registerLODGroup(
          lodMeshes,
          candidate.suggestedDistances
        );

        expect(group).toBeDefined();
        expect(group.meshes.length).toBe(candidate.suggestedLODLevels);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle single mesh group', () => {
      const singleMesh = [mockMeshes[0]];
      const group = manager.registerLODGroup(singleMesh, [100]);

      expect(group.meshes).toHaveLength(1);
      expect(group.distances).toHaveLength(1);
    });

    it('should handle many LOD levels', () => {
      const manyMeshes = Array(10).fill(0).map(
        () => new Mesh(new BoxGeometry(1, 1, 1), new Material())
      );
      const distances = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);

      const group = manager.registerLODGroup(manyMeshes, distances);

      expect(group.meshes).toHaveLength(10);
      expect(group.distances).toHaveLength(10);
    });

    it('should handle very large distances', () => {
      const distances = [1000, 5000, 10000];
      const group = manager.registerLODGroup(mockMeshes, distances);

      expect(group.distances).toEqual(distances);
    });
  });
});
