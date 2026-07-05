/**
 * LOD Manager - Level of Detail optimization system
 * 
 * Manages distance and screen-size based detail reduction for 3D objects.
 * Automatically generates multiple LOD levels from source meshes and transitions
 * between them smoothly to prevent visual popping artifacts.
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6
 */

import { 
  Mesh, 
  Sphere, 
  Vector3, 
  BufferGeometry,
  BufferAttribute
} from 'three';
import { LOD_CONFIG } from '../constants';

/**
 * LODManager class implementing the LODManager interface
 * Handles automatic LOD level generation, selection, and smooth transitions
 */
class LODManager {
  /**
   * Initialize LODManager
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.lodGroups = new Map(); // id -> LODGroup
    this.nextGroupId = 0;
    
    // Configuration
    this.screenSizeThreshold = config.screenSizeThreshold || LOD_CONFIG.SCREEN_SIZE_THRESHOLD;
    this.transitionSmoothingEnabled = config.transitionSmoothing !== false;
    this.transitionDurationMs = config.transitionDurationMs || LOD_CONFIG.TRANSITION_DURATION_MS;
    
    // LOD generation options
    this.targetReductions = config.targetReductions || LOD_CONFIG.TARGET_REDUCTIONS;
    this.preserveUVBoundaries = config.preserveUVBoundaries !== false;
    this.preserveNormals = config.preserveNormals !== false;
    this.minimumTriangles = config.minimumTriangles || LOD_CONFIG.MINIMUM_TRIANGLES;
    this.generateBillboards = config.generateBillboards !== false;
    
    // Statistics
    this.stats = {
      totalGroups: 0,
      activeTransitions: 0,
      trianglesSaved: 0,
      memoryReduced: 0,
      lastUpdateFrame: 0
    };
    
    // Frame counter for throttling updates
    this.currentFrame = 0;
    this.lastSignificantCameraPosition = null;
    this.cameraMovementThreshold = config.cameraMovementThreshold ?? 1.0; // Units
  }

  /**
   * Register a new LOD group with multiple detail levels
   * Requirements: 2.4
   * 
   * @param {Mesh[]} meshes - Array of meshes representing different LOD levels
   * @param {number[]} distances - Distance thresholds for each LOD level
   * @returns {LODGroup} - Registered LOD group
   */
  registerLODGroup(meshes, distances) {
    if (!meshes || meshes.length === 0) {
      throw new Error('LODManager: At least one mesh required for LOD group');
    }
    
    if (meshes.length !== distances.length) {
      throw new Error('LODManager: Meshes and distances arrays must have same length');
    }

    // Create LOD group ID
    const groupId = `lod_group_${this.nextGroupId++}`;

    // Calculate bounding sphere encompassing all LOD levels
    const boundingSphere = this._calculateBoundingSphere(meshes);

    // Create LOD group
    const lodGroup = {
      id: groupId,
      meshes: meshes,
      distances: distances,
      currentLevel: 0,
      screenSizeThreshold: this.screenSizeThreshold,
      transitionState: {
        isTransitioning: false,
        fromLevel: 0,
        toLevel: 0,
        progress: 0,
        startTime: 0
      },
      lastUpdateFrame: this.currentFrame,
      boundingSphere: boundingSphere,
      // Original triangle counts for statistics
      originalTriangleCounts: meshes.map(m => this._getTriangleCount(m))
    };

    // Register group
    this.lodGroups.set(groupId, lodGroup);
    this.stats.totalGroups = this.lodGroups.size;

    // Hide all meshes except LOD 0
    meshes.forEach((mesh, index) => {
      mesh.visible = index === 0;
    });

    return lodGroup;
  }

  /**
   * Generate LOD levels automatically from a source mesh
   * Requirements: 2.1, 2.4
   * 
   * @param {Mesh} originalMesh - Source mesh to generate LODs from
   * @param {LODOptions} options - Generation options
   * @returns {Mesh[]} - Array of meshes with decreasing detail levels
   */
  generateLODLevels(originalMesh, options = {}) {
    const targetReductions = options.targetReductions || this.targetReductions;
    const preserveNormals = options.preserveNormals !== false;
    const minimumTriangles = options.minimumTriangles || this.minimumTriangles;
    const generateBillboards = options.generateBillboards !== false;

    const lodMeshes = [originalMesh]; // LOD 0 is always the original
    const originalGeometry = originalMesh.geometry;
    const originalTriangleCount = this._getTriangleCount(originalMesh);

    // Generate simplified LOD levels
    for (let i = 0; i < targetReductions.length; i++) {
      const targetReduction = targetReductions[i];
      
      // Calculate target triangle count
      const targetTriangles = Math.max(
        Math.floor(originalTriangleCount * (1 - targetReduction)),
        minimumTriangles
      );

      // Use mesh simplification to create LOD geometry
      const simplifiedGeometry = this._simplifyGeometry(
        originalGeometry,
        targetTriangles,
        preserveNormals
      );

      // Create mesh with simplified geometry
      const lodMesh = new Mesh(simplifiedGeometry, originalMesh.material);
      lodMesh.castShadow = originalMesh.castShadow;
      lodMesh.receiveShadow = originalMesh.receiveShadow;
      lodMesh.visible = false;

      lodMeshes.push(lodMesh);
    }

    // Generate billboard for extreme distance if enabled
    if (generateBillboards && lodMeshes.length > 0) {
      const billboardGeometry = this._createBillboardGeometry(originalMesh);
      const billboardMesh = new Mesh(billboardGeometry, originalMesh.material);
      billboardMesh.visible = false;
      lodMeshes.push(billboardMesh);
    }

    return lodMeshes;
  }

  /**
   * Update LOD levels based on camera position and distance
   * Requirements: 2.1, 2.2, 2.3, 2.6
   * 
   * @param {Camera} camera - Current camera for distance calculations
   */
  updateLODLevels(camera) {
    this.currentFrame++;
    this.stats.lastUpdateFrame = this.currentFrame;

    // Initialize camera position on first call
    if (!this.lastSignificantCameraPosition) {
      this.lastSignificantCameraPosition = camera.position.clone();
    } else {
      // Throttle updates based on camera movement
      const cameraPos = camera.position;
      const movement = cameraPos.distanceTo(this.lastSignificantCameraPosition);
      
      if (movement < this.cameraMovementThreshold) {
        // Not enough movement to warrant updates
        return;
      }
      
      // Store new camera position for next throttle check
      this.lastSignificantCameraPosition = camera.position.clone();
    }
    
    // Update active transitions count
    this.stats.activeTransitions = 0;

    // Update each LOD group
    for (const lodGroup of this.lodGroups.values()) {
      this._updateLODGroup(lodGroup, camera);
    }
  }

  /**
   * Update a single LOD group
   * 
   * @private
   * @param {LODGroup} lodGroup - LOD group to update
   * @param {Camera} camera - Current camera
   */
  _updateLODGroup(lodGroup, camera) {
    const cameraPos = camera.position;
    const meshCenter = lodGroup.boundingSphere.center;
    
    // Calculate distance from camera to mesh
    const distance = cameraPos.distanceTo(meshCenter);
    
    // Calculate screen size of the object
    const screenSize = this._calculateScreenSize(lodGroup.boundingSphere, camera);
    
    // Determine appropriate LOD level
    let targetLevel = this._selectLODLevel(distance, screenSize, lodGroup.distances);
    
    // Clamp to valid range
    targetLevel = Math.max(0, Math.min(targetLevel, lodGroup.meshes.length - 1));

    // Handle LOD transitions
    if (lodGroup.currentLevel !== targetLevel) {
      if (this.transitionSmoothingEnabled) {
        this._startTransition(lodGroup, targetLevel);
      } else {
        // Immediate LOD switch
        this._switchLODLevel(lodGroup, targetLevel);
      }
    }

    // Update active transitions
    if (lodGroup.transitionState.isTransitioning) {
      this._updateTransition(lodGroup);
      this.stats.activeTransitions++;
    }
  }

  /**
   * Select appropriate LOD level based on distance and screen size
   * Requirements: 2.1, 2.2, 2.3
   * 
   * @private
   * @param {number} distance - Distance from camera
   * @param {number} screenSize - Normalized screen size (0-1)
   * @param {number[]} distances - Distance thresholds
   * @returns {number} - Selected LOD level
   */
  _selectLODLevel(distance, screenSize, distances) {
    // Use distance-based thresholds primarily
    for (let i = 0; i < distances.length; i++) {
      if (distance < distances[i]) {
        return i;
      }
    }
    
    // Beyond all thresholds, use lowest detail
    return distances.length - 1;
  }

  /**
   * Start smooth LOD transition
   * Requirements: 2.5
   * 
   * @private
   * @param {LODGroup} lodGroup - LOD group
   * @param {number} targetLevel - Target LOD level
   */
  _startTransition(lodGroup, targetLevel) {
    lodGroup.transitionState = {
      isTransitioning: true,
      fromLevel: lodGroup.currentLevel,
      toLevel: targetLevel,
      progress: 0,
      startTime: Date.now()
    };
  }

  /**
   * Update ongoing LOD transition
   * Requirements: 2.5
   * 
   * @private
   * @param {LODGroup} lodGroup - LOD group
   */
  _updateTransition(lodGroup) {
    const transition = lodGroup.transitionState;
    const elapsed = Date.now() - transition.startTime;
    const progress = Math.min(elapsed / this.transitionDurationMs, 1.0);
    
    transition.progress = progress;

    if (progress >= 1.0) {
      // Transition complete
      this._switchLODLevel(lodGroup, transition.toLevel);
      transition.isTransitioning = false;
    } else {
      // Intermediate blend (cross-fade)
      this._blendLODLevels(
        lodGroup,
        transition.fromLevel,
        transition.toLevel,
        progress
      );
    }
  }

  /**
   * Switch to a different LOD level immediately
   * 
   * @private
   * @param {LODGroup} lodGroup - LOD group
   * @param {number} newLevel - New LOD level
   */
  _switchLODLevel(lodGroup, newLevel) {
    const oldLevel = lodGroup.currentLevel;
    
    // Hide old LOD level
    if (oldLevel < lodGroup.meshes.length) {
      lodGroup.meshes[oldLevel].visible = false;
      lodGroup.meshes[oldLevel].material.opacity = 1.0;
    }
    
    // Show new LOD level
    lodGroup.meshes[newLevel].visible = true;
    lodGroup.meshes[newLevel].material.opacity = 1.0;
    
    lodGroup.currentLevel = newLevel;
    lodGroup.transitionState.isTransitioning = false;

    // Update statistics
    if (oldLevel < lodGroup.originalTriangleCounts.length) {
      const trianglesSaved = 
        (lodGroup.originalTriangleCounts[oldLevel] - lodGroup.originalTriangleCounts[newLevel]);
      this.stats.trianglesSaved += trianglesSaved;
    }
  }

  /**
   * Blend between two LOD levels for smooth transition
   * Requirements: 2.5
   * 
   * @private
   * @param {LODGroup} lodGroup - LOD group
   * @param {number} fromLevel - Source LOD level
   * @param {number} toLevel - Target LOD level
   * @param {number} progress - Blend progress (0-1)
   */
  _blendLODLevels(lodGroup, fromLevel, toLevel, progress) {
    const fromMesh = lodGroup.meshes[fromLevel];
    const toMesh = lodGroup.meshes[toLevel];

    // Show both meshes during transition
    fromMesh.visible = true;
    toMesh.visible = true;

    // Cross-fade opacity
    fromMesh.material.opacity = 1.0 - progress;
    toMesh.material.opacity = progress;

    // Ensure materials support opacity
    if (fromMesh.material.transparent === false) {
      fromMesh.material.transparent = true;
    }
    if (toMesh.material.transparent === false) {
      toMesh.material.transparent = true;
    }
  }

  /**
   * Set transition smoothing enabled/disabled
   * 
   * @param {boolean} enabled - Enable smooth transitions
   */
  setTransitionSmoothing(enabled) {
    this.transitionSmoothingEnabled = enabled;
  }

  /**
   * Set screen size threshold for LOD selection
   * 
   * @param {number} threshold - Screen size threshold (0-1)
   */
  setScreenSizeThreshold(threshold) {
    this.screenSizeThreshold = threshold;
    
    // Update all LOD groups
    for (const lodGroup of this.lodGroups.values()) {
      lodGroup.screenSizeThreshold = threshold;
    }
  }

  /**
   * Get LOD system statistics
   * 
   * @returns {LODStatistics} - Current statistics
   */
  getLODStats() {
    return {
      totalGroups: this.stats.totalGroups,
      activeTransitions: this.stats.activeTransitions,
      trianglesSaved: this.stats.trianglesSaved,
      memoryReduced: this.stats.memoryReduced
    };
  }

  /**
   * Clean up and dispose resources
   */
  dispose() {
    for (const lodGroup of this.lodGroups.values()) {
      // Dispose all geometries except the first (original)
      for (let i = 1; i < lodGroup.meshes.length; i++) {
        const mesh = lodGroup.meshes[i];
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          mesh.material.dispose();
        }
      }
    }
    
    this.lodGroups.clear();
    this.stats.totalGroups = 0;
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Calculate bounding sphere encompassing multiple meshes
   * 
   * @private
   * @param {Mesh[]} meshes - Array of meshes
   * @returns {Sphere} - Bounding sphere
   */
  _calculateBoundingSphere(meshes) {
    const sphere = new Sphere();
    const positions = [];

    // Collect all positions from all LOD meshes
    for (const mesh of meshes) {
      if (mesh.geometry && mesh.geometry.attributes.position) {
        const posAttr = mesh.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          // Get local position from geometry
          const localPos = new Vector3(
            posAttr.getX(i),
            posAttr.getY(i),
            posAttr.getZ(i)
          );
          // Transform to world space using mesh position
          localPos.add(mesh.position);
          positions.push(localPos);
        }
      }
    }

    if (positions.length > 0) {
      sphere.setFromPoints(positions);
    }

    return sphere;
  }

  /**
   * Get triangle count from a mesh
   * 
   * @private
   * @param {Mesh} mesh - Mesh to count triangles from
   * @returns {number} - Triangle count
   */
  _getTriangleCount(mesh) {
    if (!mesh.geometry || !mesh.geometry.attributes.position) {
      return 0;
    }

    const positionAttribute = mesh.geometry.attributes.position;
    return positionAttribute.count / 3;
  }

  /**
   * Simplify geometry to target triangle count
   * Note: Simplified version using basic triangle removal
   * Production code would use proper mesh decimation algorithm
   * 
   * @private
   * @param {BufferGeometry} geometry - Original geometry
   * @param {number} targetTriangles - Target triangle count
   * @param {boolean} preserveNormals - Whether to preserve normals
   * @returns {BufferGeometry} - Simplified geometry
   */
  _simplifyGeometry(geometry, targetTriangles, preserveNormals) {
    const simplified = geometry.clone();

    // Get current triangle count
    const posAttr = simplified.attributes.position;
    const currentTriangles = posAttr.count / 3;

    // If already below target, return as-is
    if (currentTriangles <= targetTriangles) {
      return simplified;
    }

    // Calculate reduction ratio
    const reductionRatio = targetTriangles / currentTriangles;

    // Create subset of indices (simple decimation)
    const indices = [];
    const step = Math.ceil(1 / reductionRatio);

    if (simplified.index) {
      // Indexed geometry
      const indexArray = simplified.index.array;
      for (let i = 0; i < indexArray.length; i += step) {
        indices.push(indexArray[i]);
      }
      simplified.setIndex(indices);
    } else {
      // Non-indexed geometry - create new index
      for (let i = 0; i < posAttr.count; i += step) {
        indices.push(i);
      }
      simplified.setIndex(indices);
    }

    // Recompute normals if needed
    if (preserveNormals) {
      simplified.computeVertexNormals();
    }

    return simplified;
  }

  /**
   * Create billboard geometry for extreme distances
   * 
   * @private
   * @param {Mesh} originalMesh - Original mesh to billboard
   * @returns {BufferGeometry} - Billboard geometry
   */
  _createBillboardGeometry(originalMesh) {
    const geometry = new BufferGeometry();

    // Create a simple quad facing camera
    const size = 5; // Billboard size
    const positions = new Float32Array([
      -size, -size, 0,
      size, -size, 0,
      size, size, 0,
      -size, size, 0
    ]);

    const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1
    ]);

    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex(new BufferAttribute(indices, 1));

    return geometry;
  }

  /**
   * Calculate screen size of object
   * 
   * @private
   * @param {Sphere} boundingSphere - Object bounding sphere
   * @param {Camera} camera - Current camera
   * @returns {number} - Normalized screen size (0-1)
   */
  _calculateScreenSize(boundingSphere, camera) {
    const distance = camera.position.distanceTo(boundingSphere.center);
    const radius = boundingSphere.radius;
    
    // Get camera FOV in radians
    const vFOV = (camera.fov * Math.PI) / 180; // Convert to radians
    
    // Calculate visible height at distance
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
    
    // Calculate screen size relative to object radius
    const screenSize = radius / (visibleHeight * 0.5);
    
    return Math.max(0, Math.min(1, screenSize));
  }
}

export default LODManager;
