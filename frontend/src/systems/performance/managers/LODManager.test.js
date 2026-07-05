/**
 * Unit Tests for LODManager
 * 
 * Tests core LOD functionality including:
 * - LOD level selection based on distance and screen size
 * - LOD group registration and management
 * - Smooth transitions between LOD levels
 * - Triangle count reduction tracking
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Mesh, BoxGeometry, Material, BufferGeometry, BufferAttribute, PerspectiveCamera } from 'three';
import LODManager from './LODManager.js';

describe('LODManager', () => {
  let lodManager;
  let mockCamera;
  let mockMeshes;

  beforeEach(() => {
    // Disable camera movement throttling and transitions for tests
    lodManager = new LODManager({ cameraMovementThreshold: 0, transitionSmoothing: false });
    
    mockCamera = new PerspectiveCamera(75, 1, 0.1, 1000);
    mockCamera.position.set(0, 0, 10);

    const geometry = new BoxGeometry(1, 1, 1);
    const material = new Material();
    
    mockMeshes = [
      new Mesh(geometry, material),
      new Mesh(geometry, material),
      new Mesh(geometry, material)
    ];

    mockMeshes.forEach(mesh => {
      const geo = new BufferGeometry();
      const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      geo.setAttribute('position', new BufferAttribute(positions, 3));
      mesh.geometry = geo;
      mesh.visible = false;
    });
  });

  afterEach(() => {
    if (lodManager) lodManager.dispose();
  });

  describe('registerLODGroup', () => {
    it('should register a new LOD group with multiple meshes', () => {
      const distances = [15, 35];
      const lodGroup = lodManager.registerLODGroup([mockMeshes[0], mockMeshes[1]], distances);

      expect(lodGroup).toBeDefined();
      expect(lodGroup.meshes).toHaveLength(2);
      expect(lodGroup.distances).toEqual(distances);
    });

    it('should initialize LOD group with correct properties', () => {
      const distances = [15, 35];
      const lodGroup = lodManager.registerLODGroup([mockMeshes[0], mockMeshes[1]], distances);

      expect(lodGroup.currentLevel).toBe(0);
      expect(lodGroup.transitionState.isTransitioning).toBe(false);
      expect(lodGroup.boundingSphere).toBeDefined();
    });

    it('should throw error when no meshes provided', () => {
      expect(() => lodManager.registerLODGroup([], [15])).toThrow();
    });

    it('should throw error when meshes and distances length mismatch', () => {
      expect(() => {
        lodManager.registerLODGroup([mockMeshes[0], mockMeshes[1]], [15]);
      }).toThrow();
    });

    it('should set LOD 0 as visible by default', () => {
      const lodGroup = lodManager.registerLODGroup([mockMeshes[0], mockMeshes[1]], [15, 35]);
      expect(lodGroup.meshes[0].visible).toBe(true);
      expect(lodGroup.meshes[1].visible).toBe(false);
    });

    it('should increment total group count', () => {
      const initialCount = lodManager.getLODStats().totalGroups;
      lodManager.registerLODGroup([mockMeshes[0], mockMeshes[1]], [15, 35]);
      const newCount = lodManager.getLODStats().totalGroups;
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('generateLODLevels', () => {
    it('should generate LOD levels from source mesh', () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new Material();
      const mockMesh = new Mesh(geometry, material);
      
      const lodLevels = lodManager.generateLODLevels(mockMesh);
      expect(lodLevels).toBeDefined();
      expect(lodLevels.length).toBeGreaterThan(0);
    });

    it('should include original mesh as LOD 0', () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new Material();
      const mockMesh = new Mesh(geometry, material);
      
      const lodLevels = lodManager.generateLODLevels(mockMesh);
      expect(lodLevels[0]).toBe(mockMesh);
    });

    it('should respect target reduction settings', () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new Material();
      const mockMesh = new Mesh(geometry, material);
      
      const options = {
        targetReductions: [0.5, 0.75]
      };
      const lodLevels = lodManager.generateLODLevels(mockMesh, options);
      expect(lodLevels.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('updateLODLevels', () => {
    it('should update LOD levels based on camera distance', () => {
      const lodGroup = lodManager.registerLODGroup([mockMeshes[0], mockMeshes[1]], [15, 35]);
      
      mockCamera.position.set(0, 0, 10);
      lodManager.updateLODLevels(mockCamera);
      
      expect(lodGroup.currentLevel).toBeDefined();
    });

    it('should increment frame counter', () => {
      const initialFrame = lodManager.currentFrame;
      lodManager.updateLODLevels(mockCamera);
      expect(lodManager.currentFrame).toBeGreaterThan(initialFrame);
    });
  });

  describe('LOD Level Selection', () => {
    it('should select LOD 0 for close objects', () => {
      const lodGroup = lodManager.registerLODGroup(mockMeshes, [15, 35, 100]);
      
      // Position object at origin, camera at distance 5 from object
      mockMeshes.forEach(m => m.position.set(0, 0, 0));
      mockCamera.position.set(0, 0, 5);
      lodManager.updateLODLevels(mockCamera);
      
      expect(lodGroup.currentLevel).toBe(0);
    });

    it('should select LOD 1 for medium distance', () => {
      const lodGroup = lodManager.registerLODGroup(mockMeshes, [15, 35, 100]);
      
      // Position object at origin, camera at distance 25 from object
      mockMeshes.forEach(m => m.position.set(0, 0, 0));
      mockCamera.position.set(0, 0, 25);
      lodManager.updateLODLevels(mockCamera);
      
      expect(lodGroup.currentLevel).toBe(1);
    });

    it('should select LOD 2 for far distance', () => {
      const lodGroup = lodManager.registerLODGroup(mockMeshes, [15, 35, 100]);
      
      // Position object at origin, camera at distance 50 from object
      mockMeshes.forEach(m => m.position.set(0, 0, 0));
      mockCamera.position.set(0, 0, 50);
      lodManager.updateLODLevels(mockCamera);
      
      expect(lodGroup.currentLevel).toBe(2);
    });
  });

  describe('Smooth Transitions', () => {
    it('should smooth transitions when enabled', () => {
      lodManager.setTransitionSmoothing(true);
      const lodGroup = lodManager.registerLODGroup(mockMeshes, [15, 35, 100]);
      
      mockCamera.position.set(0, 0, 5);
      lodManager.updateLODLevels(mockCamera);
      
      mockCamera.position.set(0, 0, 25);
      lodManager.updateLODLevels(mockCamera);
      
      expect(lodGroup.transitionState.isTransitioning).toBe(true);
    });

    it('should immediately switch LOD when smoothing disabled', () => {
      lodManager.setTransitionSmoothing(false);
      const lodGroup = lodManager.registerLODGroup(mockMeshes, [15, 35, 100]);
      
      mockCamera.position.set(0, 0, 5);
      lodManager.updateLODLevels(mockCamera);
      
      mockCamera.position.set(0, 0, 25);
      lodManager.updateLODLevels(mockCamera);
      
      expect(lodGroup.transitionState.isTransitioning).toBe(false);
      expect(lodGroup.currentLevel).toBe(1);
    });
  });

  describe('Statistics and Tracking', () => {
    it('should return valid LOD statistics', () => {
      lodManager.registerLODGroup(mockMeshes, [15, 35, 100]);
      const stats = lodManager.getLODStats();
      
      expect(stats).toHaveProperty('totalGroups');
      expect(stats).toHaveProperty('activeTransitions');
      expect(stats).toHaveProperty('trianglesSaved');
      expect(stats).toHaveProperty('memoryReduced');
      
      expect(typeof stats.totalGroups).toBe('number');
      expect(typeof stats.activeTransitions).toBe('number');
      expect(typeof stats.trianglesSaved).toBe('number');
      expect(typeof stats.memoryReduced).toBe('number');
    });
  });

  describe('Configuration and Settings', () => {
    it('should allow screen size threshold adjustment', () => {
      const newThreshold = 0.5;
      lodManager.setScreenSizeThreshold(newThreshold);
      
      expect(lodManager.screenSizeThreshold).toBe(newThreshold);
    });

    it('should toggle transition smoothing', () => {
      // By default (as configured in beforeEach for tests), transitions are disabled
      expect(lodManager.transitionSmoothingEnabled).toBe(false);
      
      lodManager.setTransitionSmoothing(true);
      expect(lodManager.transitionSmoothingEnabled).toBe(true);
      
      lodManager.setTransitionSmoothing(false);
      expect(lodManager.transitionSmoothingEnabled).toBe(false);
    });
  });

  describe('Resource Cleanup', () => {
    it('should dispose all resources', () => {
      lodManager.registerLODGroup(mockMeshes, [15, 35, 100]);
      lodManager.dispose();
      
      expect(lodManager.lodGroups.size).toBe(0);
      expect(lodManager.stats.totalGroups).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very close camera position', () => {
      const lodGroup = lodManager.registerLODGroup(mockMeshes, [15, 35, 100]);
      
      mockCamera.position.set(0, 0, 0.1);
      lodManager.updateLODLevels(mockCamera);
      
      expect(lodGroup.currentLevel).toBeDefined();
      expect(lodGroup.currentLevel).toBeGreaterThanOrEqual(0);
    });

    it('should handle single LOD level', () => {
      const singleLOD = [mockMeshes[0]];
      const lodGroup = lodManager.registerLODGroup(singleLOD, [0]);
      
      mockCamera.position.set(0, 0, 100);
      lodManager.updateLODLevels(mockCamera);
      
      expect(lodGroup.currentLevel).toBe(0);
    });
  });
});
