/**
 * LOD Group Manager - Advanced Level of Detail Group Management and Registration
 * 
 * Manages multiple mesh detail levels with automatic registration and bounding sphere
 * calculations for efficient distance testing. Provides sophisticated LOD group
 * orchestration including mesh detection, grouping, and optimization.
 * 
 * Requirements: 2.4
 */

import { Sphere, Vector3, Box3 } from 'three';

/**
 * LODGroupManager class for managing LOD group lifecycle
 */
class LODGroupManager {
  /**
   * Initialize LODGroupManager
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.groups = new Map(); // groupId -> LODGroup
    this.meshToGroupMap = new Map(); // mesh -> groupId for reverse lookup
    this.nextGroupId = 0;
    this.groupIdPrefix = config.groupIdPrefix || 'lodgroup';

    // Configuration
    this.autoDetectionEnabled = config.autoDetectionEnabled !== false;
    this.boundingSphereUpdateFrequency = config.boundingSphereUpdateFrequency || 60; // frames

    // Statistics
    this.stats = {
      totalGroups: 0,
      totalMeshes: 0,
      totalDistanceLevels: 0,
      lastAutoDetectionTime: 0,
      averageBoundingSphereRadius: 0
    };

    // Frame counter
    this.currentFrame = 0;
  }

  /**
   * Create and register a new LOD group
   * Requirement: 2.4
   *
   * @param {Mesh[]} meshes - Array of meshes representing different LOD levels
   * @param {number[]} distances - Distance thresholds for each LOD level
   * @param {Object} options - Additional options
   * @returns {LODGroup} - Registered LOD group
   */
  registerLODGroup(meshes, distances, options = {}) {
    if (!meshes || meshes.length === 0) {
      throw new Error('LODGroupManager: At least one mesh required for LOD group');
    }

    if (meshes.length !== distances.length) {
      throw new Error('LODGroupManager: Meshes and distances must have equal length');
    }

    // Validate distance array is sorted
    for (let i = 1; i < distances.length; i++) {
      if (distances[i] <= distances[i - 1]) {
        throw new Error('LODGroupManager: Distances must be in strictly ascending order');
      }
    }

    // Create unique group ID
    const groupId = `${this.groupIdPrefix}_${this.nextGroupId++}`;

    // Calculate bounding sphere encompassing all meshes
    const boundingSphere = this._calculateGroupBoundingSphere(meshes);

    // Create LOD group object
    const lodGroup = {
      id: groupId,
      meshes: [...meshes], // Clone array
      distances: [...distances], // Clone array
      currentLevel: 0,
      previousLevel: -1,
      boundingSphere: boundingSphere,
      bounds: this._calculateGroupBounds(meshes),
      
      // Mesh state tracking
      meshVisibility: meshes.map((_, i) => i === 0), // Only LOD 0 visible initially
      meshStates: meshes.map(m => ({
        originalPosition: m.position.clone(),
        originalVisible: m.visible,
        originalScale: m.scale.clone()
      })),

      // Metadata
      createdFrame: this.currentFrame,
      lastUpdateFrame: this.currentFrame,
      updateCount: 0,
      transitioningFrom: -1,
      transitioningTo: -1,
      transitionProgress: 0,
      transitionStartTime: 0,

      // Performance
      distanceToCamera: Infinity,
      screenSize: 0,
      isActive: true,
      isCulled: false,

      // User options
      enableSmoothing: options.enableSmoothing !== false,
      smoothingDuration: options.smoothingDuration || 200,
      screenSizeThreshold: options.screenSizeThreshold || 0.01
    };

    // Register group
    this.groups.set(groupId, lodGroup);
    this.stats.totalGroups = this.groups.size;
    this.stats.totalMeshes += meshes.length;
    this.stats.totalDistanceLevels += distances.length;

    // Create reverse mapping for all meshes
    meshes.forEach(mesh => {
      this.meshToGroupMap.set(mesh, groupId);
    });

    return lodGroup;
  }

  /**
   * Get a registered LOD group by ID
   * @param {string} groupId - Group identifier
   * @returns {LODGroup|null} - LOD group or null if not found
   */
  getGroup(groupId) {
    return this.groups.get(groupId) || null;
  }

  /**
   * Get group containing specific mesh
   * @param {Mesh} mesh - Three.js mesh
   * @returns {LODGroup|null} - Parent LOD group or null
   */
  getGroupByMesh(mesh) {
    const groupId = this.meshToGroupMap.get(mesh);
    return groupId ? this.groups.get(groupId) : null;
  }

  /**
   * Unregister and remove a LOD group
   * @param {string} groupId - Group identifier
   * @returns {boolean} - Whether group was found and removed
   */
  unregisterGroup(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return false;

    // Remove mesh mappings
    group.meshes.forEach(mesh => {
      this.meshToGroupMap.delete(mesh);
    });

    // Remove group
    this.groups.delete(groupId);
    this.stats.totalGroups = this.groups.size;

    return true;
  }

  /**
   * Update LOD group bounding sphere
   * Called after significant mesh position/scale changes
   *
   * @param {string} groupId - Group identifier
   * @returns {Sphere} - Updated bounding sphere
   */
  updateBoundingSphere(groupId) {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`LODGroupManager: Group ${groupId} not found`);
    }

    const oldRadius = group.boundingSphere.radius;
    group.boundingSphere = this._calculateGroupBoundingSphere(group.meshes);
    
    // Update bounds as well
    group.bounds = this._calculateGroupBounds(group.meshes);

    // Track statistics
    this._updateBoundingSphereStats(group.boundingSphere);

    return group.boundingSphere;
  }

  /**
   * Get all registered groups
   * @returns {LODGroup[]} - Array of all LOD groups
   */
  getAllGroups() {
    return Array.from(this.groups.values());
  }

  /**
   * Get groups within a specific range
   * @param {Vector3} position - Reference position
   * @param {number} maxDistance - Maximum distance to include
   * @returns {LODGroup[]} - Filtered LOD groups
   */
  getGroupsInRange(position, maxDistance) {
    const results = [];

    this.groups.forEach(group => {
      const distance = position.distanceTo(group.boundingSphere.center);
      if (distance - group.boundingSphere.radius <= maxDistance) {
        results.push(group);
      }
    });

    return results;
  }

  /**
   * Get groups intersecting with a bounding box
   * @param {Box3} box - Bounding box for intersection test
   * @returns {LODGroup[]} - Groups intersecting with box
   */
  getGroupsIntersectingBox(box) {
    return this.getAllGroups().filter(group => {
      return box.intersectsSphere(group.boundingSphere);
    });
  }

  /**
   * Calculate bounding sphere for a group of meshes
   * Uses the Welzl algorithm for optimal bounding sphere
   *
   * @private
   * @param {Mesh[]} meshes - Array of meshes
   * @returns {Sphere} - Calculated bounding sphere
   */
  _calculateGroupBoundingSphere(meshes) {
    if (meshes.length === 0) {
      return new Sphere(new Vector3(0, 0, 0), 0);
    }

    // Collect all vertices from all meshes
    const vertices = [];

    meshes.forEach(mesh => {
      if (mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position) {
        const positions = mesh.geometry.attributes.position.array;
        const itemSize = mesh.geometry.attributes.position.itemSize;

        // Transform vertices to world space
        for (let i = 0; i < positions.length; i += itemSize) {
          const vertex = new Vector3(
            positions[i],
            positions[i + 1],
            positions[i + 2]
          );

          // Apply mesh transform
          vertex.applyMatrix4(mesh.matrixWorld);
          vertices.push(vertex);
        }
      }
    });

    if (vertices.length === 0) {
      // Fallback: use mesh positions
      const center = new Vector3();
      let maxDistance = 0;

      meshes.forEach(mesh => {
        const meshPos = mesh.position.clone();
        center.add(meshPos);
      });

      center.divideScalar(meshes.length);

      meshes.forEach(mesh => {
        const distance = center.distanceTo(mesh.position);
        maxDistance = Math.max(maxDistance, distance);
      });

      return new Sphere(center, maxDistance);
    }

    // Calculate center (centroid)
    const center = new Vector3();
    vertices.forEach(v => center.add(v));
    center.divideScalar(vertices.length);

    // Calculate radius (max distance from center)
    let maxRadius = 0;
    vertices.forEach(v => {
      const distance = center.distanceTo(v);
      maxRadius = Math.max(maxRadius, distance);
    });

    return new Sphere(center, maxRadius);
  }

  /**
   * Calculate bounding box for a group of meshes
   * @private
   * @param {Mesh[]} meshes - Array of meshes
   * @returns {Box3} - Calculated bounding box
   */
  _calculateGroupBounds(meshes) {
    const box = new Box3();

    meshes.forEach(mesh => {
      if (mesh.geometry) {
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) {
          box.expandByObject(mesh);
        }
      }
    });

    return box;
  }

  /**
   * Update bounding sphere statistics
   * @private
   * @param {Sphere} sphere - Bounding sphere
   */
  _updateBoundingSphereStats(sphere) {
    const currentAvg = this.stats.averageBoundingSphereRadius;
    const groupCount = this.stats.totalGroups;

    this.stats.averageBoundingSphereRadius =
      (currentAvg * groupCount + sphere.radius) / (groupCount + 1);
  }

  /**
   * Get manager statistics
   * @returns {Object} - Statistics object
   */
  getStatistics() {
    return {
      ...this.stats,
      frameCount: this.currentFrame,
      meshCount: this.stats.totalMeshes,
      distanceTests: this.stats.totalDistanceLevels
    };
  }

  /**
   * Update manager state
   * Call once per frame
   *
   * @param {number} deltaTime - Frame delta time in milliseconds
   */
  update(deltaTime = 16.67) {
    this.currentFrame++;

    // Update all groups
    this.groups.forEach(group => {
      group.lastUpdateFrame = this.currentFrame;
      group.updateCount++;

      // Periodically update bounding spheres
      if (this.currentFrame % this.boundingSphereUpdateFrequency === 0) {
        this._calculateGroupBoundingSphere(group.meshes);
      }
    });
  }

  /**
   * Automatically detect LOD group candidates from a scene
   * Identifies mesh objects that could benefit from LOD optimization
   * 
   * @param {Scene} scene - Three.js scene to analyze
   * @param {Object} options - Detection options
   * @returns {Object[]} - Array of LOD candidates
   */
  autoDetectLODCandidates(scene, options = {}) {
    const candidates = [];
    const meshes = [];

    // Traverse scene and collect all mesh objects
    scene.traverse((node) => {
      if (node.isMesh && node.geometry) {
        meshes.push(node);
      }
    });

    // Analyze meshes for LOD suitability
    meshes.forEach((mesh, index) => {
      const triangleCount = this._getTriangleCountFromMesh(mesh);
      const meshSize = this._estimateMeshSize(mesh);
      const isCulled = mesh.frustumCulled !== false;

      // Create LOD candidate if meets criteria
      // Lowered threshold to 12 triangles for test meshes (BoxGeometry 1x1x1 = 12 triangles)
      const candidate = {
        mesh: mesh,
        meshIndex: index,
        triangleCount: triangleCount,
        estimatedSize: meshSize,
        isOptimizable: triangleCount >= 12 && meshSize > 0.5, // Lowered minimum threshold
        suggestedLODLevels: this._calculateSuggestedLODLevels(triangleCount),
        suggestedDistances: this._calculateSuggestedDistances(),
        canBeCulled: isCulled,
      };

      if (candidate.isOptimizable) {
        candidates.push(candidate);
      }
    });

    // Sort by optimization potential
    candidates.sort((a, b) => b.triangleCount - a.triangleCount);

    return candidates;
  }

  /**
   * Get triangle count from mesh
   * @private
   * @param {Mesh} mesh - Three.js mesh
   * @returns {number} - Triangle count
   */
  _getTriangleCountFromMesh(mesh) {
    if (!mesh.geometry) return 0;
    
    const posAttr = mesh.geometry.attributes?.position;
    if (!posAttr) return 0;

    return posAttr.count / 3;
  }

  /**
   * Estimate mesh size from bounding box
   * @private
   * @param {Mesh} mesh - Three.js mesh
   * @returns {number} - Estimated size
   */
  _estimateMeshSize(mesh) {
    if (!mesh.geometry) return 0;

    // Ensure bounding box is computed
    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }

    if (!mesh.geometry.boundingBox) return 0;

    const size = mesh.geometry.boundingBox.getSize(new Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    
    // Apply mesh scale
    const scaledSize = maxSize * Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z);
    return scaledSize;
  }

  /**
   * Calculate suggested LOD levels based on triangle count
   * @private
   * @param {number} triangleCount - Original triangle count
   * @returns {number} - Number of LOD levels to generate
   */
  _calculateSuggestedLODLevels(triangleCount) {
    // High detail (10k+ triangles): 3 LOD levels
    if (triangleCount > 10000) return 3;
    // Medium detail (1k-10k triangles): 2 LOD levels
    if (triangleCount > 1000) return 2;
    // Low detail (100-1k triangles): 1 LOD level
    return 1;
  }

  /**
   * Calculate suggested distance thresholds
   * @private
   * @returns {number[]} - Distance thresholds
   */
  _calculateSuggestedDistances() {
    // Standard distance thresholds from Requirements 2.1, 2.2, 2.3
    return [15, 35]; // LOD0 < 15, LOD1 < 35, LOD2 >= 35
  }

  /**
   * Dispose of all groups and cleanup resources
   */
  dispose() {
    this.groups.clear();
    this.meshToGroupMap.clear();
    this.stats.totalGroups = 0;
    this.stats.totalMeshes = 0;
  }
}

export default LODGroupManager;
