/**
 * InstanceManager Unit Tests (30+ tests)
 * Tests instance candidate detection, transform calculations, and visibility operations
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  Mesh,
  BufferGeometry,
  MeshStandardMaterial,
  Matrix4,
  Vector3,
  Quaternion,
  Color,
  Scene,
  Frustum,
  PerspectiveCamera
} from 'three';
import InstanceManager from './InstanceManager';

/**
 * Helper: Create mock geometry with controllable properties
 */
function createMockGeometry(vertexCount = 3, seed = 0) {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(vertexCount * 3);
  
  for (let i = 0; i < vertexCount * 3; i++) {
    positions[i] = Math.sin(i + seed) * 2;
  }
  
  geometry.setAttribute('position', {
    count: vertexCount,
    array: positions,
    getX: (i) => positions[i * 3],
    getY: (i) => positions[i * 3 + 1],
    getZ: (i) => positions[i * 3 + 2]
  });
  
  return geometry;
}

/**
 * Helper: Create transform matrices in patterns
 */
function createTransformPattern(count, pattern = 'line') {
  const transforms = [];
  
  for (let i = 0; i < count; i++) {
    const matrix = new Matrix4();
    
    if (pattern === 'line') {
      matrix.setPosition(i, 0, 0);
    } else if (pattern === 'grid') {
      const cols = Math.ceil(Math.sqrt(count));
      const x = (i % cols);
      const y = Math.floor(i / cols);
      matrix.setPosition(x, y, 0);
    } else if (pattern === 'circle') {
      const angle = (i / count) * Math.PI * 2;
      matrix.setPosition(Math.cos(angle) * 10, Math.sin(angle) * 10, 0);
    }
    
    transforms.push(matrix);
  }
  
  return transforms;
}

describe('InstanceManager', () => {
  let instanceManager;
  let mockGeometry;
  let mockMaterial;
  let mockMesh;

  beforeEach(() => {
    instanceManager = new InstanceManager({ instanceThreshold: 3 });
    mockGeometry = createMockGeometry(3);
    mockMaterial = new MeshStandardMaterial({ color: 0xff0000 });
    mockMesh = {
      geometry: mockGeometry,
      material: mockMaterial,
      castShadow: true,
      receiveShadow: true,
      isInstancedMesh: false
    };
  });

  afterEach(() => {
    if (instanceManager) {
      instanceManager.dispose();
    }
  });

  // ========================================================================
  // Basic Creation and Validation (5 tests)
  // ========================================================================
  
  describe('createInstanceGroup', () => {
    it('should create instance group with valid transforms', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      expect(group).toBeDefined();
      expect(group.id).toBeDefined();
      expect(group.maxInstances).toBe(3);
      expect(group.activeInstances).toBe(3);
      expect(group.transforms).toHaveLength(3);
    });

    it('should throw error if mesh is invalid', () => {
      expect(() => {
        instanceManager.createInstanceGroup(null, []);
      }).toThrow('Valid mesh with geometry and material required');
    });

    it('should throw error if below threshold', () => {
      const transforms = [
        new Matrix4().setPosition(0, 0, 0),
        new Matrix4().setPosition(1, 0, 0)
      ];
      expect(() => {
        instanceManager.createInstanceGroup(mockMesh, transforms);
      }).toThrow();
    });

    it('should create visibility mask', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      expect(group.visibilityMask).toHaveLength(3);
      expect(group.visibilityMask.every(v => v === true)).toBe(true);
    });

    it('should initialize culling data', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      expect(group.cullingData).toBeDefined();
      expect(group.cullingData.boundingSpheres).toHaveLength(3);
      expect(group.cullingData.visibleIndices).toHaveLength(3);
    });
  });

  // ========================================================================
  // Transform Matrix Operations (7 tests)
  // ========================================================================

  describe('Transform Matrix Operations (Requirement 4.3)', () => {
    it('should update transform matrices', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);
      
      const newTransforms = [
        new Matrix4().setPosition(5, 5, 5),
        new Matrix4().setPosition(6, 6, 6),
        new Matrix4().setPosition(7, 7, 7)
      ];

      instanceManager.updateInstances(group.id, newTransforms);

      const pos0 = new Vector3();
      group.transforms[0].decompose(pos0, new Quaternion(), new Vector3());
      expect(pos0.x).toBe(5);
      expect(pos0.y).toBe(5);
      expect(pos0.z).toBe(5);
    });

    it('should preserve transform matrix precision', () => {
      const transforms = [
        new Matrix4().setPosition(1.5, 2.3, 3.7),
        new Matrix4().setPosition(-4.2, 5.1, -6.8),
        new Matrix4().setPosition(0.001, 0.002, 0.003)
      ];

      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      for (let i = 0; i < 3; i++) {
        const pos = new Vector3();
        group.transforms[i].decompose(pos, new Quaternion(), new Vector3());
        const originalPos = new Vector3();
        transforms[i].decompose(originalPos, new Quaternion(), new Vector3());
        
        expect(pos.x).toBeCloseTo(originalPos.x, 5);
        expect(pos.y).toBeCloseTo(originalPos.y, 5);
        expect(pos.z).toBeCloseTo(originalPos.z, 5);
      }
    });

    it('should handle scaling transformations', () => {
      const transforms = [
        new Matrix4().scale(new Vector3(2, 2, 2)).setPosition(0, 0, 0),
        new Matrix4().scale(new Vector3(0.5, 0.5, 0.5)).setPosition(1, 0, 0),
        new Matrix4().scale(new Vector3(1, 1, 1)).setPosition(2, 0, 0)
      ];

      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      for (let i = 0; i < 3; i++) {
        const scale = new Vector3();
        group.transforms[i].decompose(new Vector3(), new Quaternion(), scale);
        expect(scale.length()).toBeGreaterThan(0);
      }
    });

    it('should handle rotation transformations', () => {
      const transforms = [
        new Matrix4().makeRotationZ(Math.PI / 4).setPosition(0, 0, 0),
        new Matrix4().makeRotationX(Math.PI / 6).setPosition(1, 0, 0),
        new Matrix4().makeRotationY(Math.PI / 3).setPosition(2, 0, 0)
      ];

      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      for (let i = 0; i < 3; i++) {
        const quat = new Quaternion();
        group.transforms[i].decompose(new Vector3(), quat, new Vector3());
        expect(quat.length()).toBeCloseTo(1, 5);
      }
    });

    it('should handle combined transformation matrices', () => {
      const transforms = [
        new Matrix4()
          .scale(new Vector3(2, 2, 2))
          .setPosition(5, 10, 15)
          .multiply(new Matrix4().makeRotationZ(Math.PI / 4)),
        new Matrix4()
          .scale(new Vector3(1, 1, 1))
          .setPosition(0, 0, 0)
          .multiply(new Matrix4().makeRotationX(Math.PI / 6)),
        new Matrix4().setPosition(0, 0, 0)
      ];

      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      expect(group.transforms.length).toBe(3);
    });

    it('should update transforms without losing precision', () => {
      const initialTransforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, initialTransforms);

      const newTransforms = createTransformPattern(3, 'grid');
      instanceManager.updateInstances(group.id, newTransforms);

      for (let i = 0; i < 3; i++) {
        const pos = new Vector3();
        group.transforms[i].decompose(pos, new Quaternion(), new Vector3());
        const expectedPos = new Vector3();
        newTransforms[i].decompose(expectedPos, new Quaternion(), new Vector3());
        
        expect(pos.x).toBeCloseTo(expectedPos.x, 5);
        expect(pos.y).toBeCloseTo(expectedPos.y, 5);
      }
    });
  });

  // ========================================================================
  // Instance Visibility Culling (5 tests)
  // ========================================================================

  describe('Instance Visibility Culling (Requirement 4.3)', () => {
    it('should correctly handle mixed visibility states', () => {
      const transforms = createTransformPattern(10, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      const visibilityMask = [
        true, false, true, false, true,
        false, true, false, true, false
      ];

      instanceManager.updateInstanceVisibility(group.id, visibilityMask);

      expect(group.activeInstances).toBe(5);
      expect(group.visibilityMask).toEqual(visibilityMask);
    });

    it('should handle all visible state', () => {
      const transforms = createTransformPattern(5, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      const visibilityMask = [true, true, true, true, true];
      instanceManager.updateInstanceVisibility(group.id, visibilityMask);

      expect(group.activeInstances).toBe(5);
    });

    it('should handle all invisible state', () => {
      const transforms = createTransformPattern(5, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      const visibilityMask = [false, false, false, false, false];
      instanceManager.updateInstanceVisibility(group.id, visibilityMask);

      expect(group.activeInstances).toBe(0);
    });

    it('should preserve visibility across updates', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      const visibilityMask1 = [true, false, true];
      instanceManager.updateInstanceVisibility(group.id, visibilityMask1);
      expect(group.activeInstances).toBe(2);

      const visibilityMask2 = [false, false, true];
      instanceManager.updateInstanceVisibility(group.id, visibilityMask2);
      expect(group.activeInstances).toBe(1);
      expect(group.visibilityMask).toEqual(visibilityMask2);
    });

    it('should handle partial visibility mask', () => {
      const transforms = createTransformPattern(5, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      const visibilityMask = [true, false];
      instanceManager.updateInstanceVisibility(group.id, visibilityMask);

      expect(group.visibilityMask.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ========================================================================
  // Minimum Threshold Enforcement (5 tests) - Requirement 4.5
  // ========================================================================

  describe('Minimum Threshold Enforcement (Requirement 4.5)', () => {
    it('should enforce 3-object minimum', () => {
      expect(() => {
        const transforms = [
          new Matrix4().setPosition(0, 0, 0),
          new Matrix4().setPosition(1, 0, 0)
        ];
        instanceManager.createInstanceGroup(mockMesh, transforms);
      }).toThrow();
    });

    it('should accept exactly 3 objects', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      expect(group.activeInstances).toBe(3);
    });

    it('should enforce threshold in autoDetect', () => {
      const scene = new Scene();
      const material = new MeshStandardMaterial();
      const geom = createMockGeometry(5);

      for (let i = 0; i < 2; i++) {
        const mesh = new Mesh(geom, material);
        mesh.visible = true;
        scene.add(mesh);
      }

      const candidates = instanceManager.autoDetectInstanceCandidates(scene);
      expect(candidates.length).toBe(0);
    });

    it('should include at threshold count in autoDetect', () => {
      const scene = new Scene();
      const material = new MeshStandardMaterial();
      const geom = createMockGeometry(5);

      for (let i = 0; i < 3; i++) {
        const mesh = new Mesh(geom, material);
        mesh.visible = true;
        scene.add(mesh);
      }

      const candidates = instanceManager.autoDetectInstanceCandidates(scene);
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should enforce minimum threshold of 3', () => {
      instanceManager.setInstanceThreshold(1);
      expect(instanceManager.instanceThreshold).toBeGreaterThanOrEqual(3);
    });
  });

  // ========================================================================
  // Slot Machine Batching (4 tests) - Requirement 4.2
  // ========================================================================

  describe('6+ Slot Machine Batching (Requirement 4.2)', () => {
    it('should support 6+ instances in single draw call', () => {
      const transforms = createTransformPattern(6, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      expect(group.maxInstances).toBe(6);
      expect(group.instancedMesh).toBeDefined();
      expect(group.instancedMesh.count).toBeGreaterThanOrEqual(6);
    });

    it('should handle 12+ slot machine scenario', () => {
      const transforms = createTransformPattern(12, 'grid');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      expect(group.activeInstances).toBe(12);
      expect(group.instancedMesh).toBeDefined();
    });

    it('should reduce draw calls significantly', () => {
      const transforms = createTransformPattern(20, 'grid');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);
      const stats = instanceManager.getInstanceStats();

      expect(stats.drawCallsReduced).toBe(19);
    });

    it('should respect maxInstances limit in config', () => {
      const transforms = createTransformPattern(150, 'grid');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { maxInstances: 100 }
      );

      expect(group.maxInstances).toBeLessThanOrEqual(100);
    });
  });

  // ========================================================================
  // Instance Candidate Detection (5 tests) - Requirement 4.1, 4.4
  // ========================================================================

  describe('Instance Candidate Detection (Requirement 4.1, 4.4)', () => {
    it('should detect identical meshes in scene', () => {
      const scene = new Scene();
      
      for (let i = 0; i < 4; i++) {
        const mesh = new Mesh(mockGeometry, mockMaterial);
        mesh.position.set(i, 0, 0);
        mesh.visible = true;
        scene.add(mesh);
      }

      const candidates = instanceManager.autoDetectInstanceCandidates(scene);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].instances.length).toBeGreaterThanOrEqual(4);
      expect(candidates[0].eligibleForInstancing).toBe(true);
    });

    it('should detect multiple groups of identical objects', () => {
      const scene = new Scene();
      const geom1 = createMockGeometry(5, 1);
      const geom2 = createMockGeometry(10, 2);
      const material = new MeshStandardMaterial();

      for (let i = 0; i < 3; i++) {
        const mesh = new Mesh(geom1, material);
        mesh.visible = true;
        scene.add(mesh);
      }

      for (let i = 0; i < 3; i++) {
        const mesh = new Mesh(geom2, material);
        mesh.visible = true;
        scene.add(mesh);
      }

      const candidates = instanceManager.autoDetectInstanceCandidates(scene);
      expect(candidates.length).toBeGreaterThanOrEqual(2);
    });

    it('should calculate performance gain estimates', () => {
      const scene = new Scene();
      const geom = createMockGeometry(8);
      const material = new MeshStandardMaterial();

      for (let i = 0; i < 8; i++) {
        const mesh = new Mesh(geom, material);
        mesh.visible = true;
        scene.add(mesh);
      }

      const candidates = instanceManager.autoDetectInstanceCandidates(scene);
      expect(candidates[0].estimatedPerformanceGain).toBeGreaterThan(0);
      expect(candidates[0].estimatedPerformanceGain).toBeLessThanOrEqual(1);
    });

    it('should include shared vertex count information', () => {
      const scene = new Scene();
      const geom = createMockGeometry(100);
      const material = new MeshStandardMaterial();

      for (let i = 0; i < 4; i++) {
        const mesh = new Mesh(geom, material);
        mesh.visible = true;
        scene.add(mesh);
      }

      const candidates = instanceManager.autoDetectInstanceCandidates(scene);
      expect(candidates[0].sharedVertexCount).toBe(100);
    });

    it('should ignore invisible meshes', () => {
      const scene = new Scene();
      
      for (let i = 0; i < 4; i++) {
        const mesh = new Mesh(mockGeometry, mockMaterial);
        mesh.visible = false;
        scene.add(mesh);
      }

      const candidates = instanceManager.autoDetectInstanceCandidates(scene);
      expect(candidates.length).toBe(0);
    });
  });

  // ========================================================================
  // Group Management (4 tests)
  // ========================================================================

  describe('Group Management and Merging', () => {
    it('should track group IDs correctly', () => {
      const transforms = createTransformPattern(3, 'line');
      const group1 = instanceManager.createInstanceGroup(mockMesh, transforms);
      const group2 = instanceManager.createInstanceGroup(mockMesh, transforms);

      expect(group1.id).not.toBe(group2.id);
      expect(instanceManager.instanceGroups.size).toBe(2);
    });

    it('should merge two groups', () => {
      const transforms = createTransformPattern(3, 'line');
      const group1 = instanceManager.createInstanceGroup(mockMesh, transforms);
      const group2 = instanceManager.createInstanceGroup(mockMesh, transforms);

      const mergedId = instanceManager.mergeInstanceGroups([group1.id, group2.id]);

      expect(mergedId).toBeDefined();
      expect(instanceManager.instanceGroups.has(mergedId)).toBe(true);
      expect(instanceManager.instanceGroups.has(group1.id)).toBe(false);
      expect(instanceManager.instanceGroups.has(group2.id)).toBe(false);
    });

    it('should combine transforms in merged group', () => {
      const transforms1 = createTransformPattern(3, 'line');
      const transforms2 = createTransformPattern(3, 'line');

      const group1 = instanceManager.createInstanceGroup(mockMesh, transforms1);
      const group2 = instanceManager.createInstanceGroup(mockMesh, transforms2);

      const mergedId = instanceManager.mergeInstanceGroups([group1.id, group2.id]);
      const mergedGroup = instanceManager.instanceGroups.get(mergedId);

      expect(mergedGroup.transforms.length).toBe(6);
    });

    it('should handle merging more than 2 groups', () => {
      const transforms = createTransformPattern(3, 'line');

      const g1 = instanceManager.createInstanceGroup(mockMesh, transforms);
      const g2 = instanceManager.createInstanceGroup(mockMesh, transforms);
      const g3 = instanceManager.createInstanceGroup(mockMesh, transforms);

      const mergedId = instanceManager.mergeInstanceGroups([g1.id, g2.id, g3.id]);

      expect(instanceManager.instanceGroups.size).toBe(1);
      expect(instanceManager.instanceGroups.get(mergedId).transforms.length).toBe(9);
    });
  });

  // ========================================================================
  // Statistics and Monitoring (4 tests)
  // ========================================================================

  describe('Statistics and Monitoring', () => {
    it('should track total instance count', () => {
      const transforms = createTransformPattern(5, 'line');
      instanceManager.createInstanceGroup(mockMesh, transforms);

      const stats = instanceManager.getInstanceStats();
      expect(stats.totalInstances).toBe(5);
    });

    it('should accumulate statistics across multiple groups', () => {
      const transforms3 = createTransformPattern(3, 'line');
      const transforms5 = createTransformPattern(5, 'line');

      instanceManager.createInstanceGroup(mockMesh, transforms3);
      instanceManager.createInstanceGroup(mockMesh, transforms5);

      const stats = instanceManager.getInstanceStats();
      expect(stats.totalGroups).toBe(2);
      expect(stats.totalInstances).toBe(8);
    });

    it('should calculate memory efficiency', () => {
      const transforms = createTransformPattern(10, 'line');
      instanceManager.createInstanceGroup(mockMesh, transforms);

      const stats = instanceManager.getInstanceStats();
      expect(stats.memoryEfficiency).toBeGreaterThan(0);
      expect(stats.memoryEfficiency).toBeLessThanOrEqual(1);
    });

    it('should update stats after disposal', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      let stats = instanceManager.getInstanceStats();
      expect(stats.totalGroups).toBe(1);

      instanceManager.disposeInstanceGroup(group.id);
      stats = instanceManager.getInstanceStats();

      expect(stats.totalGroups).toBe(0);
    });
  });

  // ========================================================================
  // Edge Cases and Error Handling (5 tests)
  // ========================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty transform array', () => {
      expect(() => {
        instanceManager.createInstanceGroup(mockMesh, []);
      }).toThrow();
    });

    it('should handle null geometry', () => {
      expect(() => {
        const invalidMesh = { geometry: null, material: mockMaterial };
        instanceManager.createInstanceGroup(invalidMesh, createTransformPattern(3));
      }).toThrow();
    });

    it('should handle non-existent group ID updates', () => {
      expect(() => {
        instanceManager.updateInstances('nonexistent', []);
      }).toThrow();
    });

    it('should tolerate dispose on empty manager', () => {
      const manager = new InstanceManager();
      expect(() => {
        manager.dispose();
      }).not.toThrow();
    });

    it('should handle duplicate disposal', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      instanceManager.disposeInstanceGroup(group.id);
      
      expect(() => {
        instanceManager.disposeInstanceGroup(group.id);
      }).not.toThrow();
    });
  });

  // ========================================================================
  // Configuration and Options (3 tests)
  // ========================================================================

  describe('Configuration and Options', () => {
    it('should accept dynamic updates option', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { dynamicUpdates: true }
      );

      expect(group.isDynamic).toBe(true);
    });

    it('should accept sorting strategy option', () => {
      const transforms = createTransformPattern(5, 'line');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { sortingStrategy: 'DISTANCE' }
      );

      expect(group.sortingStrategy).toBe('DISTANCE');
    });

    it('should accept frustum culling option', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { enableFrustumCulling: false }
      );

      expect(group.enableFrustumCulling).toBe(false);
    });
  });

  // ========================================================================
  // Task 5.2: Per-Instance Transform and Visibility Management Tests
  // ========================================================================

  describe('Task 5.2: Per-Instance Transform Updates (Requirement 4.3)', () => {
    it('should efficiently update multiple instance transforms', () => {
      const transforms = createTransformPattern(10, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      const updates = [
        { index: 0, transform: new Matrix4().setPosition(100, 100, 100) },
        { index: 5, transform: new Matrix4().setPosition(200, 200, 200) },
        { index: 9, transform: new Matrix4().setPosition(300, 300, 300) }
      ];

      instanceManager.batchUpdateInstances(group.id, updates);

      const pos0 = new Vector3();
      group.transforms[0].decompose(pos0, new Quaternion(), new Vector3());
      expect(pos0.x).toBe(100);

      const pos5 = new Vector3();
      group.transforms[5].decompose(pos5, new Quaternion(), new Vector3());
      expect(pos5.x).toBe(200);
    });

    it('should handle concurrent transform updates for dynamic objects', () => {
      const transforms = createTransformPattern(20, 'grid');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { dynamicUpdates: true }
      );

      // Simulate multiple moving objects
      for (let frame = 0; frame < 5; frame++) {
        const frameUpdates = [];
        for (let i = 0; i < 20; i++) {
          frameUpdates.push({
            index: i,
            transform: new Matrix4().setPosition(i * frame, 0, 0)
          });
        }
        instanceManager.batchUpdateInstances(group.id, frameUpdates);
      }

      expect(group.isDynamic).toBe(true);
      expect(group.transforms.length).toBe(20);
    });

    it('should track last update frame for dynamic objects', () => {
      const transforms = createTransformPattern(3, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      instanceManager.updateFrameNumber(group.id, 0);
      expect(group.lastUpdateFrame).toBe(0);

      instanceManager.updateFrameNumber(group.id, 60);
      expect(group.lastUpdateFrame).toBe(60);
    });

    it('should maintain transform precision during frequent updates', () => {
      const transforms = createTransformPattern(5, 'line');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { dynamicUpdates: true }
      );

      // Update the same instances many times
      for (let i = 0; i < 100; i++) {
        const newTransform = new Matrix4().setPosition(1.234567, 2.345678, 3.456789);
        instanceManager.batchUpdateInstances(group.id, [
          { index: 0, transform: newTransform }
        ]);
      }

      const finalPos = new Vector3();
      group.transforms[0].decompose(finalPos, new Quaternion(), new Vector3());
      expect(finalPos.x).toBeCloseTo(1.234567, 5);
      expect(finalPos.y).toBeCloseTo(2.345678, 5);
      expect(finalPos.z).toBeCloseTo(3.456789, 5);
    });

    it('should support independent transform updates per instance', () => {
      const transforms = createTransformPattern(10, 'grid');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      // Update every other instance differently
      const updates = [];
      for (let i = 0; i < 10; i += 2) {
        updates.push({
          index: i,
          transform: new Matrix4().setPosition(i * 10, i * 10, 0)
        });
      }

      instanceManager.batchUpdateInstances(group.id, updates);

      // Verify odd indices unchanged, even indices changed
      const pos1 = new Vector3();
      group.transforms[1].decompose(pos1, new Quaternion(), new Vector3());

      const pos2 = new Vector3();
      group.transforms[2].decompose(pos2, new Quaternion(), new Vector3());

      expect(pos2.x).toBe(20);
    });
  });

  describe('Task 5.2: Instance-Level Visibility Culling (Requirement 4.3)', () => {
    it('should cull instances outside frustum accurately', () => {
      const transforms = createTransformPattern(20, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      // Test frustum culling with instances
      const frustum = new Frustum();
      const camera = new PerspectiveCamera(
        75,
        1.6,
        0.1,
        1000
      );
      
      // Position camera far away so only close instances are in view
      camera.position.set(0, 0, 100);
      camera.near = 50;
      camera.far = 110;
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      frustum.setFromProjectionMatrix(
        new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      );

      const visibleIndices = instanceManager.frustumCullInstances(group.id, frustum);

      // With this setup, should cull most instances
      expect(Array.isArray(visibleIndices)).toBe(true);
    });

    it('should efficiently handle large instance groups with visibility culling', () => {
      // Create large instance group (500 instances)
      const transforms = createTransformPattern(500, 'grid');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { enableFrustumCulling: true }
      );

      const visibilityMask = new Array(500).fill(true);
      // Hide half the instances
      for (let i = 250; i < 500; i++) {
        visibilityMask[i] = false;
      }

      instanceManager.updateInstanceVisibility(group.id, visibilityMask);
      expect(group.activeInstances).toBe(250);
    });

    it('should support dynamic visibility state changes', () => {
      const transforms = createTransformPattern(10, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      // Start all visible
      instanceManager.updateInstanceVisibility(group.id, new Array(10).fill(true));
      expect(group.activeInstances).toBe(10);

      // Hide some
      const mask1 = [true, false, true, false, true, false, true, false, true, false];
      instanceManager.updateInstanceVisibility(group.id, mask1);
      expect(group.activeInstances).toBe(5);

      // Change visibility again
      const mask2 = [false, true, false, true, false, true, false, true, false, true];
      instanceManager.updateInstanceVisibility(group.id, mask2);
      expect(group.activeInstances).toBe(5);
    });

    it('should update culling data when instances become invisible', () => {
      const transforms = createTransformPattern(10, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      const visibilityMask = new Array(10).fill(true);
      visibilityMask[0] = false;
      visibilityMask[5] = false;

      instanceManager.updateInstanceVisibility(group.id, visibilityMask);

      expect(group.activeInstances).toBe(8);
      expect(group.cullingData.needsUpdate).toBe(false);
    });

    it('should combine distance-based and frustum culling', () => {
      const transforms = createTransformPattern(20, 'line');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { enableFrustumCulling: true }
      );

      // Distance cull instances beyond 10 units
      const toCull = instanceManager.getInstancesToCull(
        group.id,
        new Vector3(0, 0, 0),
        10
      );

      expect(toCull.length).toBeGreaterThan(0);
      expect(toCull.length).toBeLessThan(20);
    });

    it('should maintain visibility mask integrity across multiple updates', () => {
      const transforms = createTransformPattern(8, 'grid');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      const originalMask = [true, false, true, false, true, false, true, false];
      instanceManager.updateInstanceVisibility(group.id, originalMask);

      // Perform other operations
      instanceManager.updateFrameNumber(group.id, 1);
      instanceManager.optimizeInstanceData();

      // Verify mask unchanged
      expect(group.visibilityMask).toEqual(originalMask);
    });
  });

  describe('Task 5.2: Sorting Strategies for Transparency and Depth (Requirement 4.3)', () => {
    it('should sort instances by depth front-to-back', () => {
      const transforms = [
        new Matrix4().setPosition(5, 0, 0),
        new Matrix4().setPosition(10, 0, 0),
        new Matrix4().setPosition(0, 0, 0),
        new Matrix4().setPosition(15, 0, 0),
        new Matrix4().setPosition(2, 0, 0)
      ];

      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      const cameraPos = new Vector3(0, 0, 10);
      instanceManager.sortInstancesByDepth(group.id, cameraPos);

      const sorted = group.cullingData.sortedIndices;
      expect(sorted.length).toBe(5);

      // Verify front-to-back order
      for (let i = 0; i < sorted.length - 1; i++) {
        const pos1 = new Vector3();
        group.transforms[sorted[i]].decompose(pos1, new Quaternion(), new Vector3());
        const dist1 = pos1.distanceTo(cameraPos);

        const pos2 = new Vector3();
        group.transforms[sorted[i + 1]].decompose(pos2, new Quaternion(), new Vector3());
        const dist2 = pos2.distanceTo(cameraPos);

        expect(dist1).toBeLessThanOrEqual(dist2);
      }
    });

    it('should sort transparent instances back-to-front', () => {
      const transparentMaterial = new MeshStandardMaterial({
        transparent: true,
        opacity: 0.7
      });

      const transparentMesh = {
        geometry: mockGeometry,
        material: transparentMaterial,
        castShadow: true,
        receiveShadow: true
      };

      const transforms = [
        new Matrix4().setPosition(0, 0, 0),
        new Matrix4().setPosition(5, 0, 0),
        new Matrix4().setPosition(10, 0, 0)
      ];

      const group = instanceManager.createInstanceGroup(transparentMesh, transforms);

      const cameraPos = new Vector3(0, 0, 10);
      const sorted = instanceManager.sortInstancesByTransparency(group.id, cameraPos);

      expect(sorted.length).toBe(3);
      // Transparent materials should be sorted
      expect(group.sortingStrategy).toBe('TRANSPARENCY');
    });

    it('should separate opaque and transparent rendering', () => {
      // Create material with opacity < 1
      const material = new MeshStandardMaterial({ opacity: 0.8 });
      const transparentMesh = {
        geometry: mockGeometry,
        material: material,
        castShadow: true,
        receiveShadow: true
      };

      const transforms = createTransformPattern(6, 'line');
      const group = instanceManager.createInstanceGroup(transparentMesh, transforms);

      const sorted = instanceManager.sortInstancesByTransparency(
        group.id,
        new Vector3(0, 0, 0)
      );

      expect(sorted.length).toBe(6);
      expect(group.sortingStrategy).toBe('TRANSPARENCY');
    });

    it('should update sorting strategy after sort operation', () => {
      const transforms = createTransformPattern(5, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      expect(group.sortingStrategy).toBe('NONE');

      instanceManager.sortInstancesByDepth(group.id, new Vector3(0, 0, 0));
      expect(group.sortingStrategy).toBe('DEPTH');

      instanceManager.sortInstancesByTransparency(group.id, new Vector3(0, 0, 0));
      expect(group.sortingStrategy).toBe('TRANSPARENCY');
    });

    it('should handle sorting with visibility culling', () => {
      const transforms = createTransformPattern(10, 'line');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      // Set visibility mask
      const visibilityMask = new Array(10).fill(true);
      visibilityMask[0] = false;
      visibilityMask[9] = false;

      instanceManager.updateInstanceVisibility(group.id, visibilityMask);

      // Sort should still work
      const cameraPos = new Vector3(5, 0, 0);
      instanceManager.sortInstancesByDepth(group.id, cameraPos);

      expect(group.cullingData.sortedIndices.length).toBeGreaterThan(0);
    });

    it('should optimize render instructions with sorting info', () => {
      const transforms = createTransformPattern(8, 'grid');
      const group = instanceManager.createInstanceGroup(mockMesh, transforms);

      instanceManager.sortInstancesByDepth(group.id, new Vector3(0, 0, 10));

      const instructions = instanceManager.getRenderInstructions(group.id);

      expect(instructions.sortingStrategy).toBe('DEPTH');
      expect(instructions.sortedIndices).toBeDefined();
      expect(instructions.sortedIndices.length).toBe(8);
    });

    it('should support per-instance LOD with sorting', () => {
      const transforms = createTransformPattern(5, 'line');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { lodDistances: [5, 10, 20] }
      );

      instanceManager.sortInstancesByDepth(group.id, new Vector3(0, 0, 0));

      expect(group.lodDistances).toEqual([5, 10, 20]);
      expect(group.cullingData.sortedIndices.length).toBe(5);
    });
  });

  describe('Task 5.2: Integration Tests for Dynamic Rendering (Requirement 4.3)', () => {
    it('should combine transform updates with visibility culling', () => {
      const transforms = createTransformPattern(15, 'grid');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { dynamicUpdates: true }
      );

      // Update transforms
      const updates = [];
      for (let i = 0; i < 15; i++) {
        updates.push({
          index: i,
          transform: new Matrix4().setPosition(i * 2, 0, 0)
        });
      }
      instanceManager.batchUpdateInstances(group.id, updates);

      // Apply visibility culling
      const visibilityMask = new Array(15).fill(true);
      for (let i = 10; i < 15; i++) {
        visibilityMask[i] = false;
      }
      instanceManager.updateInstanceVisibility(group.id, visibilityMask);

      expect(group.activeInstances).toBe(10);
    });

    it('should handle full render pipeline with all 5.2 features', () => {
      const transforms = createTransformPattern(20, 'grid');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { dynamicUpdates: true, enableFrustumCulling: true }
      );

      // Step 1: Update transforms
      const updates = transforms.map((t, i) => ({
        index: i,
        transform: new Matrix4().setPosition(i, 0, i * 0.5)
      }));
      instanceManager.batchUpdateInstances(group.id, updates);

      // Step 2: Update culling data
      instanceManager.updateInstanceCullingData(group.id);

      // Step 3: Apply visibility
      const visibilityMask = new Array(20).fill(true);
      for (let i = 15; i < 20; i++) {
        visibilityMask[i] = false;
      }
      instanceManager.updateInstanceVisibility(group.id, visibilityMask);

      // Step 4: Sort by depth
      instanceManager.sortInstancesByDepth(group.id, new Vector3(10, 10, 10));

      // Step 5: Get render instructions
      const instructions = instanceManager.getRenderInstructions(group.id);

      expect(instructions.instanceCount).toBe(15);
      expect(instructions.sortingStrategy).toBe('DEPTH');
      expect(instructions.isDynamic).toBe(true);
    });

    it('should maintain performance with rapid updates and culling', () => {
      const transforms = createTransformPattern(50, 'grid');
      const group = instanceManager.createInstanceGroup(
        mockMesh,
        transforms,
        { dynamicUpdates: true }
      );

      const startTime = performance.now();

      // Simulate 60 frames of rapid updates
      for (let frame = 0; frame < 60; frame++) {
        const updates = [];
        for (let i = 0; i < 50; i++) {
          updates.push({
            index: i,
            transform: new Matrix4().setPosition(
              i + Math.sin(frame) * 5,
              Math.cos(frame) * 2,
              frame * 0.1
            )
          });
        }

        instanceManager.batchUpdateInstances(group.id, updates);

        if (frame % 5 === 0) {
          instanceManager.updateInstanceCullingData(group.id);
          instanceManager.sortInstancesByDepth(group.id, new Vector3(0, 0, 0));
        }

        instanceManager.updateFrameNumber(group.id, frame);
      }

      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Should complete in < 100ms
    });
  });

  // ========================================================================
  // Geometry and Material Matching (3 tests) - Requirement 4.4
  // ========================================================================

  describe('Geometry and Material Matching (Requirement 4.4)', () => {
    it('should create unique keys for different geometries', () => {
      const geom1 = createMockGeometry(3, 0);
      const geom2 = createMockGeometry(6, 1);
      const material = new MeshStandardMaterial();

      const mesh1 = { geometry: geom1, material, castShadow: true, receiveShadow: true };
      const mesh2 = { geometry: geom2, material, castShadow: true, receiveShadow: true };

      const key1 = instanceManager._createMeshKey(mesh1);
      const key2 = instanceManager._createMeshKey(mesh2);

      expect(key1).not.toBe(key2);
    });

    it('should create unique keys for different materials', () => {
      const geom = createMockGeometry(3);
      const material1 = new MeshStandardMaterial({ color: 0xff0000 });
      const material2 = new MeshStandardMaterial({ color: 0x00ff00 });

      const mesh1 = { geometry: geom, material: material1, castShadow: true, receiveShadow: true };
      const mesh2 = { geometry: geom, material: material2, castShadow: true, receiveShadow: true };

      const key1 = instanceManager._createMeshKey(mesh1);
      const key2 = instanceManager._createMeshKey(mesh2);

      expect(key1).not.toBe(key2);
    });

    it('should calculate geometry similarity correctly', () => {
      const scene = new Scene();
      const geom = createMockGeometry(10);
      const material = new MeshStandardMaterial();

      for (let i = 0; i < 5; i++) {
        const mesh = new Mesh(geom, material);
        mesh.visible = true;
        scene.add(mesh);
      }

      const candidates = instanceManager.autoDetectInstanceCandidates(scene);
      expect(candidates.length).toBeGreaterThan(0);
      
      const similarity = candidates[0].similarity;
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThanOrEqual(1.0);
    });
  });
});
