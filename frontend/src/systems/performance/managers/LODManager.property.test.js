/**
 * Property-Based Tests for LOD Manager Distance Calculation Consistency
 * 
 * Tests core LOD selection logic using property-based testing with fast-check.
 * This ensures that LOD level selection is deterministic and consistent
 * when called multiple times with identical inputs.
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * Property 1: LOD Distance Calculation Consistency
 * For any 3D object position and camera position, the calculated distance used 
 * for LOD level selection SHALL remain consistent when calculated multiple times 
 * with the same inputs.
 * 
 * Run with: npm test -- LODManager.property.test.js --run
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { Vector3, PerspectiveCamera, Sphere, BoxGeometry, Material, Mesh } from 'three';
import LODManager from './LODManager.js';
import {
  calculateDistanceToCamera,
  calculateBoundingSphere
} from '../validation-utils.js';
import { LOD_CONFIG } from '../constants';

describe('LODManager - Property-Based Tests', () => {
  let lodManager;

  beforeEach(() => {
    lodManager = new LODManager();
  });

  afterEach(() => {
    if (lodManager) {
      lodManager.dispose();
    }
  });

  /**
   * PROPERTY 1: LOD Distance Calculation Consistency
   * 
   * For any 3D object position and camera position, calculating the distance
   * used for LOD selection must always produce the same result when called
   * multiple times with identical inputs.
   * 
   * Validates: Requirements 2.1, 2.2, 2.3
   */
  describe('Property 1: LOD Distance Calculation Consistency', () => {
    
    it('should calculate consistent distances for identical positions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 100 }),
          fc.integer({ min: -100, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: -100, max: 100 }),
          fc.integer({ min: -100, max: 100 }),
          fc.integer({ min: -100, max: 100 }),
          (cameraX, cameraY, cameraZ, objectX, objectY, objectZ) => {
            const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.set(cameraX, cameraY, cameraZ);
            const objectPos = new Vector3(objectX, objectY, objectZ);

            const distance1 = calculateDistanceToCamera(objectPos, camera);
            const distance2 = calculateDistanceToCamera(objectPos, camera);
            const distance3 = calculateDistanceToCamera(objectPos, camera);

            expect(distance1).toBe(distance2);
            expect(distance2).toBe(distance3);
            expect(distance1).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should consistently select same LOD level for identical configurations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 150 }),
          (distanceToObject) => {
            const geometry = new BoxGeometry(1, 1, 1);
            const material = new Material();
            const meshes = [
              new Mesh(geometry, material),
              new Mesh(geometry, material),
              new Mesh(geometry, material)
            ];

            const lodGroup = lodManager.registerLODGroup(
              meshes,
              [LOD_CONFIG.HIGH_DETAIL_DISTANCE, LOD_CONFIG.MEDIUM_DETAIL_DISTANCE]
            );

            const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.set(0, 0, 0);

            meshes.forEach(m => m.position.set(distanceToObject, 0, 0));

            lodManager.updateLODLevels(camera);
            const lodLevel1 = lodGroup.currentLevel;

            lodManager.updateLODLevels(camera);
            const lodLevel2 = lodGroup.currentLevel;

            lodManager.updateLODLevels(camera);
            const lodLevel3 = lodGroup.currentLevel;

            expect(lodLevel1).toBe(lodLevel2);
            expect(lodLevel2).toBe(lodLevel3);
            expect(lodLevel1).toBeGreaterThanOrEqual(0);
            expect(lodLevel1).toBeLessThan(meshes.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should ensure LOD transitions are monotonic increasing with distance', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.integer({ min: 0, max: 150 }),
            { minLength: 2, maxLength: 10 }
          ),
          (distances) => {
            const sortedDistances = [...new Set(distances)].sort((a, b) => a - b);
            if (sortedDistances.length < 2) return;

            const geometry = new BoxGeometry(1, 1, 1);
            const material = new Material();
            const meshes = [
              new Mesh(geometry, material),
              new Mesh(geometry, material),
              new Mesh(geometry, material)
            ];

            const lodGroup = lodManager.registerLODGroup(
              meshes,
              [LOD_CONFIG.HIGH_DETAIL_DISTANCE, LOD_CONFIG.MEDIUM_DETAIL_DISTANCE]
            );

            const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.set(0, 0, 0);

            let previousLODLevel = -1;

            sortedDistances.forEach((distance) => {
              meshes.forEach(m => m.position.set(distance, 0, 0));
              lodManager.updateLODLevels(camera);
              const currentLODLevel = lodGroup.currentLevel;

              if (previousLODLevel >= 0) {
                expect(currentLODLevel).toBeGreaterThanOrEqual(previousLODLevel);
              }

              previousLODLevel = currentLODLevel;
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should be deterministic regardless of update frame count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (distanceToObject, frameCount) => {
            const geometry = new BoxGeometry(1, 1, 1);
            const material = new Material();
            const meshes = [
              new Mesh(geometry, material),
              new Mesh(geometry, material),
              new Mesh(geometry, material)
            ];

            const lodGroup = lodManager.registerLODGroup(
              meshes,
              [LOD_CONFIG.HIGH_DETAIL_DISTANCE, LOD_CONFIG.MEDIUM_DETAIL_DISTANCE]
            );

            const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.set(0, 0, 0);
            meshes.forEach(m => m.position.set(distanceToObject, 0, 0));

            let lodLevelAtFrame = null;
            for (let i = 0; i < frameCount; i++) {
              lodManager.updateLODLevels(camera);

              if (i === 0) {
                lodLevelAtFrame = lodGroup.currentLevel;
              }

              expect(lodGroup.currentLevel).toBe(lodLevelAtFrame);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle edge cases at LOD distance thresholds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1 }),
          (thresholdIndex) => {
            const geometry = new BoxGeometry(1, 1, 1);
            const material = new Material();
            const meshes = [
              new Mesh(geometry, material),
              new Mesh(geometry, material),
              new Mesh(geometry, material)
            ];

            const lodGroup = lodManager.registerLODGroup(
              meshes,
              [LOD_CONFIG.HIGH_DETAIL_DISTANCE, LOD_CONFIG.MEDIUM_DETAIL_DISTANCE]
            );

            const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.set(0, 0, 0);

            const thresholds = [
              LOD_CONFIG.HIGH_DETAIL_DISTANCE,
              LOD_CONFIG.MEDIUM_DETAIL_DISTANCE
            ];

            const threshold = thresholds[thresholdIndex];

            meshes.forEach(m => m.position.set(threshold, 0, 0));
            lodManager.updateLODLevels(camera);
            const lodLevelAtThreshold = lodGroup.currentLevel;

            meshes.forEach(m => m.position.set(threshold - 1, 0, 0));
            lodManager.updateLODLevels(camera);
            const lodLevelCloser = lodGroup.currentLevel;

            expect(lodLevelCloser).toBeLessThanOrEqual(lodLevelAtThreshold);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should calculate bounding spheres consistently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.integer({ min: -50, max: 50 }),
              fc.integer({ min: -50, max: 50 }),
              fc.integer({ min: -50, max: 50 })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (positionTuples) => {
            const positions = positionTuples.map(t => new Vector3(...t));

            const sphere1 = calculateBoundingSphere(positions);
            const sphere2 = calculateBoundingSphere(positions);
            const sphere3 = calculateBoundingSphere(positions);

            expect(sphere1.center.x).toBeCloseTo(sphere2.center.x, 10);
            expect(sphere1.center.y).toBeCloseTo(sphere2.center.y, 10);
            expect(sphere1.center.z).toBeCloseTo(sphere2.center.z, 10);
            expect(sphere1.radius).toBeCloseTo(sphere2.radius, 10);
            expect(sphere2.radius).toBeCloseTo(sphere3.radius, 10);

            positions.forEach(pos => {
              const distance = sphere1.center.distanceTo(pos);
              expect(distance).toBeLessThanOrEqual(sphere1.radius + 0.01);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should obey triangle inequality for camera distances', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: -100, max: 100 }),
            fc.integer({ min: -100, max: 100 }),
            fc.integer({ min: -100, max: 100 })
          ),
          fc.tuple(
            fc.integer({ min: -100, max: 100 }),
            fc.integer({ min: -100, max: 100 }),
            fc.integer({ min: -100, max: 100 })
          ),
          fc.tuple(
            fc.integer({ min: -100, max: 100 }),
            fc.integer({ min: -100, max: 100 }),
            fc.integer({ min: -100, max: 100 })
          ),
          (cameraCoords, object1Coords, object2Coords) => {
            const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.set(...cameraCoords);

            const pos1 = new Vector3(...object1Coords);
            const pos2 = new Vector3(...object2Coords);

            const distToPos1 = calculateDistanceToCamera(pos1, camera);
            const distToPos2 = calculateDistanceToCamera(pos2, camera);
            const distPos1ToPos2 = pos1.distanceTo(pos2);

            const lowerBound = Math.abs(distToPos1 - distToPos2);
            const upperBound = distToPos1 + distToPos2;

            expect(distPos1ToPos2).toBeGreaterThanOrEqual(lowerBound - 0.01);
            expect(distPos1ToPos2).toBeLessThanOrEqual(upperBound + 0.01);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('LOD Manager Contract Verification', () => {
    
    it('should maintain consistent stats across operations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (groupCount) => {
            for (let i = 0; i < groupCount; i++) {
              const geometry = new BoxGeometry(1, 1, 1);
              const material = new Material();
              const meshes = [
                new Mesh(geometry, material),
                new Mesh(geometry, material),
                new Mesh(geometry, material)
              ];

              lodManager.registerLODGroup(
                meshes,
                [LOD_CONFIG.HIGH_DETAIL_DISTANCE, LOD_CONFIG.MEDIUM_DETAIL_DISTANCE]
              );
            }

            const stats1 = lodManager.getLODStats();
            const stats2 = lodManager.getLODStats();
            const stats3 = lodManager.getLODStats();

            expect(stats1.totalGroups).toBe(stats2.totalGroups);
            expect(stats2.totalGroups).toBe(stats3.totalGroups);
            expect(stats1.totalGroups).toBe(groupCount);

            expect(stats1).toHaveProperty('activeTransitions');
            expect(stats1).toHaveProperty('trianglesSaved');
            expect(stats1).toHaveProperty('memoryReduced');

            expect(typeof stats1.activeTransitions).toBe('number');
            expect(stats1.activeTransitions).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
