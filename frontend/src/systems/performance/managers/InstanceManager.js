/**
 * Instance Manager - GPU Instancing optimization system
 * 
 * Manages GPU instancing of repeated objects (slot machines, palm trees, etc.)
 * Groups identical objects into instanced render batches to dramatically reduce draw calls.
 * Supports per-instance transforms, visibility culling, and dynamic updates.
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import {
  InstancedMesh,
  Matrix4,
  Vector3,
  Quaternion,
  Sphere,
  Box3,
  Color
} from 'three';
import { INSTANCING_CONFIG } from '../constants';

/**
 * InstanceManager class implementing the InstanceManager interface
 * Handles automatic detection, creation, and management of GPU instanced objects
 */
class InstanceManager {
  /**
   * Initialize InstanceManager
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.instanceGroups = new Map(); // id -> InstanceGroup
    this.nextGroupId = 0;
    
    // Configuration
    this.instanceThreshold = config.instanceThreshold || INSTANCING_CONFIG.MIN_INSTANCES;
    this.maxInstancesPerGroup = config.maxInstancesPerGroup || INSTANCING_CONFIG.MAX_INSTANCES_PER_GROUP;
    
    // Statistics
    this.stats = {
      totalGroups: 0,
      totalInstances: 0,
      activeInstances: 0,
      drawCallsReduced: 0,
      memoryEfficiency: 0
    };

    // Geometry/Material equality cache
    this.geometryCache = new Map();
    this.materialCache = new Map();
  }

  /**
   * Create an instanced mesh group from individual meshes
   * Requirements: 4.1, 4.2, 4.3
   * 
   * @param {Mesh} mesh - Template mesh with geometry and material
   * @param {Matrix4[]} transforms - Array of transform matrices for each instance
   * @param {InstanceOptions} options - Instance configuration options
   * @returns {InstanceGroup} - Created instance group
   */
  createInstanceGroup(mesh, transforms, options = {}) {
    if (!mesh || !mesh.geometry || !mesh.material) {
      throw new Error('InstanceManager: Valid mesh with geometry and material required');
    }

    if (!transforms || transforms.length < this.instanceThreshold) {
      throw new Error(
        `InstanceManager: Minimum ${this.instanceThreshold} instances required`
      );
    }

    // Limit to max instances per group (use option if provided, otherwise use default)
    const maxInstancesLimit = options.maxInstances || this.maxInstancesPerGroup;
    const actualInstanceCount = Math.min(transforms.length, maxInstancesLimit);

    // Create InstancedMesh
    const instancedMesh = new InstancedMesh(
      mesh.geometry,
      mesh.material,
      actualInstanceCount
    );

    // Set instance transforms
    for (let i = 0; i < actualInstanceCount; i++) {
      instancedMesh.setMatrixAt(i, transforms[i]);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    // Create instance group
    const groupId = `inst_group_${this.nextGroupId++}`;
    const instanceGroup = {
      id: groupId,
      instancedMesh: instancedMesh,
      maxInstances: actualInstanceCount,
      activeInstances: actualInstanceCount,
      transforms: transforms.slice(0, actualInstanceCount),
      visibilityMask: new Array(actualInstanceCount).fill(true),
      cullingData: {
        boundingSpheres: this._calculateInstanceBoundingSpheres(
          transforms.slice(0, actualInstanceCount),
          mesh
        ),
        visibleIndices: Array.from({ length: actualInstanceCount }, (_, i) => i),
        sortedIndices: Array.from({ length: actualInstanceCount }, (_, i) => i),
        needsUpdate: false
      },
      lastUpdateFrame: 0,
      geometry: mesh.geometry,
      material: mesh.material,
      isDynamic: options.dynamicUpdates === true,
      sortingStrategy: options.sortingStrategy || 'NONE',
      enableFrustumCulling: options.enableFrustumCulling !== false,
      lodDistances: options.lodDistances || []
    };

    // Configure instance mesh
    instancedMesh.castShadow = mesh.castShadow;
    instancedMesh.receiveShadow = mesh.receiveShadow;
    instancedMesh.frustumCulled = instanceGroup.enableFrustumCulling;

    // Register group
    this.instanceGroups.set(groupId, instanceGroup);
    this.stats.totalGroups = this.instanceGroups.size;
    this.stats.totalInstances = Array.from(this.instanceGroups.values())
      .reduce((sum, g) => sum + g.activeInstances, 0);

    return instanceGroup;
  }

  /**
   * Automatically detect instancing candidates from a scene
   * Requirements: 4.1, 4.4
   * 
   * @param {Scene} scene - Three.js scene to analyze
   * @param {number} threshold - Minimum similarity threshold (0-1)
   * @returns {InstanceCandidate[]} - Array of instance candidates
   */
  autoDetectInstanceCandidates(scene, threshold = 0.95) {
    const candidates = [];
    const meshGroups = new Map(); // Key: geometry+material hash -> meshes

    // Traverse scene and group identical meshes
    scene.traverse((child) => {
      if (child.isMesh && !child.isInstancedMesh && child.visible) {
        const key = this._createMeshKey(child);

        if (!meshGroups.has(key)) {
          meshGroups.set(key, []);
        }
        meshGroups.get(key).push(child);
      }
    });

    // Create candidates for groups with enough instances
    for (const [key, meshes] of meshGroups.entries()) {
      if (meshes.length >= this.instanceThreshold) {
        const similarity = this._calculateGeometrySimilarity(meshes);

        candidates.push({
          geometry: meshes[0].geometry,
          material: meshes[0].material,
          instances: meshes,
          eligibleForInstancing: similarity >= threshold,
          estimatedPerformanceGain: this._estimatePerformanceGain(meshes.length),
          sharedVertexCount: meshes[0].geometry.attributes.position.count,
          similarity: similarity
        });
      }
    }

    return candidates;
  }

  /**
   * Update instance transforms
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @param {Matrix4[]} transforms - New transform matrices
   */
  updateInstances(groupId, transforms) {
    const group = this.instanceGroups.get(groupId);
    if (!group) {
      throw new Error(`InstanceManager: Group ${groupId} not found`);
    }

    const count = Math.min(transforms.length, group.maxInstances);
    for (let i = 0; i < count; i++) {
      group.instancedMesh.setMatrixAt(i, transforms[i]);
      group.transforms[i] = transforms[i].clone();
    }

    group.instancedMesh.instanceMatrix.needsUpdate = true;
    group.cullingData.needsUpdate = true;
  }

  /**
   * Update visibility mask for instances
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @param {boolean[]} visibilityMask - Visibility for each instance
   */
  updateInstanceVisibility(groupId, visibilityMask) {
    const group = this.instanceGroups.get(groupId);
    if (!group) {
      throw new Error(`InstanceManager: Group ${groupId} not found`);
    }

    const color = new Color();
    let visibleCount = 0;

    for (let i = 0; i < group.maxInstances; i++) {
      const isVisible = i < visibilityMask.length ? visibilityMask[i] : true;
      
      if (isVisible) {
        color.setHex(0xffffff);
        visibleCount++;
      } else {
        color.setHex(0x000000);
      }

      group.instancedMesh.setColorAt(i, color);
    }

    group.visibilityMask = visibilityMask.slice();
    group.activeInstances = visibleCount;
    
    if (group.instancedMesh.instanceColor) {
      group.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Perform frustum culling on instance group
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @param {Frustum} frustum - Camera frustum for culling
   * @returns {number[]} - Indices of visible instances
   */
  frustumCullInstances(groupId, frustum) {
    const group = this.instanceGroups.get(groupId);
    if (!group || !group.enableFrustumCulling) {
      return group ? group.cullingData.visibleIndices : [];
    }

    const visibleIndices = [];
    const sphere = new Sphere();

    for (let i = 0; i < group.activeInstances; i++) {
      if (!group.visibilityMask[i]) continue;

      sphere.copy(group.cullingData.boundingSpheres[i]);
      if (frustum.intersectsSphere(sphere)) {
        visibleIndices.push(i);
      }
    }

    group.cullingData.visibleIndices = visibleIndices;
    return visibleIndices;
  }

  /**
   * Batch update multiple instance transforms efficiently
   * Collects updates and applies them in a single operation
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @param {Array<{index: number, transform: Matrix4}>} updates - Batch of instance updates
   */
  batchUpdateInstances(groupId, updates) {
    const group = this.instanceGroups.get(groupId);
    if (!group) {
      throw new Error(`InstanceManager: Group ${groupId} not found`);
    }

    for (const update of updates) {
      if (update.index >= 0 && update.index < group.maxInstances && update.transform) {
        group.instancedMesh.setMatrixAt(update.index, update.transform);
        group.transforms[update.index] = update.transform.clone();
      }
    }

    group.instancedMesh.instanceMatrix.needsUpdate = true;
    group.cullingData.needsUpdate = true;
  }

  /**
   * Get instances to cull based on visibility and distance from camera
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @param {Vector3} cameraPosition - Camera world position
   * @param {number} cullingDistance - Distance beyond which to cull instances
   * @returns {number[]} - Indices of instances to cull
   */
  getInstancesToCull(groupId, cameraPosition, cullingDistance) {
    const group = this.instanceGroups.get(groupId);
    if (!group) {
      return [];
    }

    const indicesToCull = [];
    const tempVec = new Vector3();

    for (let i = 0; i < group.activeInstances; i++) {
      if (!group.visibilityMask[i]) {
        indicesToCull.push(i);
        continue;
      }

      // Extract position from transform
      group.transforms[i].decompose(tempVec, new Quaternion(), new Vector3());
      
      // Check if beyond culling distance
      if (tempVec.distanceTo(cameraPosition) > cullingDistance) {
        indicesToCull.push(i);
      }
    }

    return indicesToCull;
  }

  /**
   * Sort instances by depth from camera for transparency handling
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @param {Vector3} cameraPosition - Camera world position
   */
  sortInstancesByDepth(groupId, cameraPosition) {
    const group = this.instanceGroups.get(groupId);
    if (!group) {
      throw new Error(`InstanceManager: Group ${groupId} not found`);
    }

    const tempVec = new Vector3();
    const depthData = [];

    // Calculate depth for each instance
    for (let i = 0; i < group.activeInstances; i++) {
      if (!group.visibilityMask[i]) continue;

      group.transforms[i].decompose(tempVec, new Quaternion(), new Vector3());
      const depth = tempVec.distanceTo(cameraPosition);
      depthData.push({ index: i, depth });
    }

    // Sort by depth (front to back)
    depthData.sort((a, b) => a.depth - b.depth);

    // Update sorted indices
    group.cullingData.sortedIndices = depthData.map(d => d.index);
    group.sortingStrategy = 'DEPTH';
  }

  /**
   * Sort instances by transparency for optimal rendering order
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @param {Vector3} cameraPosition - Camera world position
   * @returns {number[]} - Sorted instance indices
   */
  sortInstancesByTransparency(groupId, cameraPosition) {
    const group = this.instanceGroups.get(groupId);
    if (!group) {
      throw new Error(`InstanceManager: Group ${groupId} not found`);
    }

    // Opaque instances (alpha = 1.0) render first, then transparent
    const opaqueIndices = [];
    const transparentIndices = [];

    for (let i = 0; i < group.activeInstances; i++) {
      if (!group.visibilityMask[i]) continue;

      // Check material transparency
      const isTransparent = group.material.transparent || group.material.opacity < 1.0;
      
      if (isTransparent) {
        transparentIndices.push(i);
      } else {
        opaqueIndices.push(i);
      }
    }

    // If transparent instances exist, sort by depth
    if (transparentIndices.length > 0) {
      const tempVec = new Vector3();
      const transDepthData = [];

      for (const idx of transparentIndices) {
        group.transforms[idx].decompose(tempVec, new Quaternion(), new Vector3());
        const depth = tempVec.distanceTo(cameraPosition);
        transDepthData.push({ index: idx, depth });
      }

      transDepthData.sort((a, b) => b.depth - a.depth); // Back to front for transparency
      transparentIndices.splice(0, transparentIndices.length, ...transDepthData.map(d => d.index));
    }

    // Combine: opaques first, then transparent
    const sortedIndices = [...opaqueIndices, ...transparentIndices];
    group.cullingData.sortedIndices = sortedIndices;
    group.sortingStrategy = 'TRANSPARENCY';

    return sortedIndices;
  }

  /**
   * Update bounding spheres for instances that have moved
   * Enables accurate culling for dynamic objects
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @param {number[]} changedIndices - Indices of instances that changed
   */
  updateInstanceCullingData(groupId, changedIndices = null) {
    const group = this.instanceGroups.get(groupId);
    if (!group) {
      throw new Error(`InstanceManager: Group ${groupId} not found`);
    }

    // If specific indices provided, update only those
    if (changedIndices && changedIndices.length > 0) {
      for (const idx of changedIndices) {
        if (idx >= 0 && idx < group.maxInstances) {
          const sphere = new Sphere();
          const refSphere = group.geometry.boundingSphere;
          
          if (refSphere) {
            sphere.copy(refSphere);
            sphere.applyMatrix4(group.transforms[idx]);
          }
          
          group.cullingData.boundingSpheres[idx] = sphere;
        }
      }
    } else {
      // Update all spheres
      group.cullingData.boundingSpheres = this._calculateInstanceBoundingSpheres(
        group.transforms,
        { geometry: group.geometry }
      );
    }

    group.cullingData.needsUpdate = false;
  }

  /**
   * Enable dynamic updates for a group (allows frequent transform changes)
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @param {boolean} enabled - Whether to enable dynamic updates
   */
  setDynamicUpdates(groupId, enabled) {
    const group = this.instanceGroups.get(groupId);
    if (!group) {
      throw new Error(`InstanceManager: Group ${groupId} not found`);
    }

    group.isDynamic = enabled;
    
    if (enabled) {
      // For dynamic objects, ensure frustum culling is enabled
      group.enableFrustumCulling = true;
    }
  }

  /**
   * Get render instructions for optimal instance rendering
   * Includes visibility, sorting, and culling information
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @returns {Object} - Render instructions for the group
   */
  getRenderInstructions(groupId) {
    const group = this.instanceGroups.get(groupId);
    if (!group) {
      return null;
    }

    return {
      groupId: group.id,
      instanceCount: group.activeInstances,
      visibleIndices: group.cullingData.visibleIndices,
      sortedIndices: group.cullingData.sortedIndices,
      sortingStrategy: group.sortingStrategy,
      isDynamic: group.isDynamic,
      needsCullingUpdate: group.cullingData.needsUpdate,
      lastUpdateFrame: group.lastUpdateFrame
    };
  }

  /**
   * Mark frame number for tracking update frequency
   * Requirements: 4.3
   * 
   * @param {string} groupId - Instance group ID
   * @param {number} frameNumber - Current frame number
   */
  updateFrameNumber(groupId, frameNumber) {
    const group = this.instanceGroups.get(groupId);
    if (group) {
      group.lastUpdateFrame = frameNumber;
    }
  }

  /**
   * Set instance threshold for automatic detection
   * Requirements: 4.5
   * 
   * @param {number} minCount - Minimum instances required for instancing
   */
  setInstanceThreshold(minCount) {
    this.instanceThreshold = Math.max(3, minCount);
  }

  /**
   * Merge multiple instance groups into one
   * 
   * @param {string[]} groupIds - IDs of groups to merge
   * @returns {string} - New merged group ID
   */
  mergeInstanceGroups(groupIds) {
    const groupsToMerge = groupIds
      .map(id => this.instanceGroups.get(id))
      .filter(g => g !== undefined);

    if (groupsToMerge.length < 2) {
      throw new Error('InstanceManager: At least 2 groups required to merge');
    }

    // Combine all transforms
    const allTransforms = [];
    for (const group of groupsToMerge) {
      allTransforms.push(...group.transforms);
    }

    // Use first group's geometry and material
    const templateMesh = {
      geometry: groupsToMerge[0].geometry,
      material: groupsToMerge[0].material,
      castShadow: groupsToMerge[0].instancedMesh.castShadow,
      receiveShadow: groupsToMerge[0].instancedMesh.receiveShadow
    };

    // Create new merged group
    const mergedGroup = this.createInstanceGroup(templateMesh, allTransforms);

    // Remove old groups
    for (const group of groupsToMerge) {
      this.instanceGroups.delete(group.id);
    }

    this.stats.totalGroups = this.instanceGroups.size;
    return mergedGroup.id;
  }

  /**
   * Get instance manager statistics
   * 
   * @returns {InstanceStatistics} - Current statistics
   */
  getInstanceStats() {
    let totalDrawCallsReduced = 0;

    for (const group of this.instanceGroups.values()) {
      totalDrawCallsReduced += group.activeInstances - 1;
    }

    this.stats.drawCallsReduced = totalDrawCallsReduced;

    return {
      totalGroups: this.stats.totalGroups,
      totalInstances: this.stats.totalInstances,
      activeInstances: this.stats.activeInstances,
      drawCallsReduced: this.stats.drawCallsReduced,
      memoryEfficiency: this._calculateMemoryEfficiency()
    };
  }

  /**
   * Optimize instance data layout
   */
  optimizeInstanceData() {
    for (const group of this.instanceGroups.values()) {
      // Sort instances if needed
      if (group.sortingStrategy !== 'NONE') {
        this._sortInstances(group);
      }

      // Update culling data
      group.cullingData.boundingSpheres = this._calculateInstanceBoundingSpheres(
        group.transforms,
        { geometry: group.geometry }
      );
      group.cullingData.needsUpdate = false;
    }
  }

  /**
   * Dispose instance group and free resources
   * 
   * @param {string} groupId - Instance group ID
   */
  disposeInstanceGroup(groupId) {
    const group = this.instanceGroups.get(groupId);
    if (!group) {
      return;
    }

    group.instancedMesh.geometry.dispose();
    group.instancedMesh.material.dispose();
    group.instancedMesh.dispose();

    this.instanceGroups.delete(groupId);
    this.stats.totalGroups = this.instanceGroups.size;
  }

  /**
   * Clean up and dispose all resources
   */
  dispose() {
    for (const [groupId] of this.instanceGroups) {
      this.disposeInstanceGroup(groupId);
    }
    
    this.geometryCache.clear();
    this.materialCache.clear();
    this.stats.totalGroups = 0;
    this.stats.totalInstances = 0;
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Create a unique key for a mesh based on geometry and material
   * 
   * @private
   * @param {Mesh} mesh - Mesh to create key for
   * @returns {string} - Unique key
   */
  _createMeshKey(mesh) {
    const geomId = mesh.geometry.uuid || `geom_${this._hashGeometry(mesh.geometry)}`;
    const matId = mesh.material.uuid || `mat_${this._hashMaterial(mesh.material)}`;
    return `${geomId}_${matId}`;
  }

  /**
   * Hash geometry attributes for uniqueness
   * 
   * @private
   * @param {BufferGeometry} geometry - Geometry to hash
   * @returns {string} - Hash string
   */
  _hashGeometry(geometry) {
    const positions = geometry.attributes.position;
    let hash = positions.count.toString();
    
    // Sample first few vertices
    for (let i = 0; i < Math.min(10, positions.count); i++) {
      hash += Math.round(positions.getX(i) + positions.getY(i) + positions.getZ(i));
    }
    
    return hash;
  }

  /**
   * Hash material properties for uniqueness
   * 
   * @private
   * @param {Material} material - Material to hash
   * @returns {string} - Hash string
   */
  _hashMaterial(material) {
    let hash = material.type;
    if (material.color) {
      hash += material.color.getHexString();
    }
    if (material.map) {
      hash += material.map.uuid;
    }
    return hash;
  }

  /**
   * Calculate similarity between meshes
   * 
   * @private
   * @param {Mesh[]} meshes - Meshes to compare
   * @returns {number} - Similarity (0-1)
   */
  _calculateGeometrySimilarity(meshes) {
    if (meshes.length < 2) return 1.0;

    let similarityScore = 0;
    const reference = meshes[0];

    for (let i = 1; i < meshes.length; i++) {
      const mesh = meshes[i];
      
      // Compare vertex counts
      const refVertexCount = reference.geometry.attributes.position.count;
      const meshVertexCount = mesh.geometry.attributes.position.count;
      const vertexSimilarity = 1 - Math.abs(refVertexCount - meshVertexCount) / refVertexCount;

      // Compare material colors
      let colorSimilarity = 1.0;
      if (reference.material.color && mesh.material.color) {
        const refColor = reference.material.color;
        const meshColor = mesh.material.color;
        const colorDiff = Math.abs(refColor.r - meshColor.r) +
                         Math.abs(refColor.g - meshColor.g) +
                         Math.abs(refColor.b - meshColor.b);
        colorSimilarity = 1 - (colorDiff / 3);
      }

      similarityScore += (vertexSimilarity + colorSimilarity) / 2;
    }

    return similarityScore / (meshes.length - 1);
  }

  /**
   * Estimate performance gain from instancing
   * 
   * @private
   * @param {number} instanceCount - Number of instances
   * @returns {number} - Estimated performance improvement (0-1)
   */
  _estimatePerformanceGain(instanceCount) {
    // More instances = more potential gain, but diminishing returns
    return Math.min(0.9, (instanceCount - 1) / (instanceCount * 1.5));
  }

  /**
   * Calculate bounding spheres for each instance
   * 
   * @private
   * @param {Matrix4[]} transforms - Transform matrices
   * @param {Mesh} mesh - Template mesh
   * @returns {Sphere[]} - Bounding spheres
   */
  _calculateInstanceBoundingSpheres(transforms, mesh) {
    const spheres = [];
    const refSphere = mesh.geometry.boundingSphere || 
                      new Sphere().setFromPoints(
                        Array.from(mesh.geometry.attributes.position.array).slice(0, 100)
                      );

    for (const transform of transforms) {
      const sphere = refSphere.clone();
      sphere.applyMatrix4(transform);
      spheres.push(sphere);
    }

    return spheres;
  }

  /**
   * Sort instances based on sorting strategy
   * 
   * @private
   * @param {InstanceGroup} group - Instance group to sort
   */
  _sortInstances(group) {
    const indices = Array.from({ length: group.activeInstances }, (_, i) => i);

    if (group.sortingStrategy === 'DISTANCE') {
      // Would need camera position - stub for now
      // indices.sort((a, b) => distA - distB);
    } else if (group.sortingStrategy === 'DEPTH') {
      // Would need depth information
    }

    group.cullingData.sortedIndices = indices;
  }

  /**
   * Calculate memory efficiency metric
   * 
   * @private
   * @returns {number} - Memory efficiency (0-1)
   */
  _calculateMemoryEfficiency() {
    let totalInstances = 0;
    let totalDrawCalls = 0;

    for (const group of this.instanceGroups.values()) {
      totalInstances += group.activeInstances;
      totalDrawCalls += 1; // One draw call per group
    }

    if (totalInstances === 0) return 0;

    // Efficiency is ratio of instances to draw calls
    return Math.min(1.0, totalDrawCalls / totalInstances);
  }
}

export default InstanceManager;
