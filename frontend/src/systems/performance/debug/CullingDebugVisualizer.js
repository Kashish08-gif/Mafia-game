/**
 * Culling Debug Visualizer
 * 
 * Provides real-time debug visualization for frustum and occlusion culling systems.
 * Renders wireframe frustum bounds, occluded object markers, and culling statistics overlay.
 * 
 * Task 3.3: Add debug visualization and culling statistics
 * Requirements: 3.5, 12.4
 */

import {
  BufferGeometry,
  BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  BoxHelper,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  Color,
  Vector3,
  Object3D,
  CanvasTexture,
  Sprite,
  SpriteMaterial
} from 'three';

class CullingDebugVisualizer {
  /**
   * Initialize debug visualizer
   * @param {Scene} scene - Three.js scene to add debug geometry to
   */
  constructor(scene) {
    this.scene = scene;
    this.debugObjects = [];
    this.frustumHelper = null;
    this.culledObjectMarkers = new Map(); // objectId -> marker mesh
    this.occludedObjectMarkers = new Map(); // objectId -> marker mesh
    this.debugStats = null;
    this.enabled = false;
  }

  /**
   * Enable debug visualization
   * Task 3.3: Debug rendering for frustum bounds and occluded objects
   * Requirements: 3.5, 12.4
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable debug visualization
   */
  disable() {
    this.enabled = false;
    this.clearAll();
  }

  /**
   * Update debug visualization with current culling data
   * Task 3.3: Debug rendering for frustum bounds and occluded objects
   * 
   * Creates visual representations of:
   * - Visible objects (green bounding spheres)
   * - Culled objects (red bounding spheres)
   * - Occluded objects (yellow markers)
   * - Shadow-casting objects (special markers)
   * 
   * @param {Object} debugData - Debug visualization data from CullingSystem
   * @param {number} canvasWidth - Canvas width for stats overlay
   * @param {number} canvasHeight - Canvas height for stats overlay
   */
  updateVisualization(debugData, canvasWidth = 800, canvasHeight = 600) {
    if (!this.enabled || !debugData) return;

    // Clear previous debug objects
    this.clearDebugObjects();

    // Visualize visible objects (green spheres)
    if (debugData.visibleBounds && Array.isArray(debugData.visibleBounds)) {
      for (const bound of debugData.visibleBounds) {
        this._createBoundSphere(
          bound.position,
          bound.radius,
          new Color(0x00ff00), // Green for visible
          `visible_${bound.objectId}`
        );
      }
    }

    // Visualize culled objects (red spheres)
    if (debugData.culledBounds && Array.isArray(debugData.culledBounds)) {
      for (const bound of debugData.culledBounds) {
        this._createBoundSphere(
          bound.position,
          bound.radius,
          new Color(0xff0000), // Red for culled
          `culled_${bound.objectId}`
        );
      }
    }

    // Visualize occluded objects (yellow markers)
    if (debugData.occludedObjects && Array.isArray(debugData.occludedObjects)) {
      for (const occluded of debugData.occludedObjects) {
        // Create marker for occluded object
        this._createOccludedMarker(
          occluded.position,
          occluded.objectId,
          occluded.castShadow // Include shadow-casting information
        );
      }
    }

    // Visualize occlusion bounds (cyan box)
    if (debugData.occlusionBounds) {
      this._createOcclusionBoundsHelper(
        debugData.occlusionBounds.min,
        debugData.occlusionBounds.max
      );
    }

    // Create statistics overlay
    if (debugData.stats) {
      this.debugStats = debugData.stats;
      this._createStatsOverlay(debugData.stats, canvasWidth, canvasHeight);
    }
  }

  /**
   * Create a bounding sphere visualization
   * 
   * @private
   * @param {Vector3} position - Sphere center position
   * @param {number} radius - Sphere radius
   * @param {Color} color - Wireframe color
   * @param {string} id - Debug object ID
   */
  _createBoundSphere(position, radius, color, id) {
    if (!position || radius <= 0) return;

    const geometry = new SphereGeometry(radius, 16, 16);
    const material = new LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });

    const sphere = new LineSegments(geometry, material);
    sphere.position.copy(position);
    sphere.userData.debugId = id;

    this.scene.add(sphere);
    this.debugObjects.push(sphere);
  }

  /**
   * Create a marker for occluded objects
   * Task 3.3: Debug rendering for occluded objects
   * 
   * Creates a visual marker (pyramid or cross) at the occluded object's position.
   * Shadow-casting objects are marked with special styling.
   * 
   * @private
   * @param {Vector3} position - Object position
   * @param {string} objectId - Object ID
   * @param {boolean} castShadow - Whether object casts shadows
   */
  _createOccludedMarker(position, objectId, castShadow = false) {
    if (!position) return;

    // Create a simple cross marker using lines
    const geometry = new BufferGeometry();
    const vertices = [];

    // Cross pattern
    const size = 1;
    vertices.push(
      -size, 0, 0,  // Left
      size, 0, 0,   // Right
      0, -size, 0,  // Down
      0, size, 0,   // Up
      0, 0, -size,  // Back
      0, 0, size    // Forward
    );

    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));

    // Yellow for standard occluded, orange for shadow-casting
    const color = castShadow ? new Color(0xff8800) : new Color(0xffff00);
    const material = new LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    });

    const marker = new LineSegments(geometry, material);
    marker.position.copy(position);
    marker.userData.debugId = `occluded_${objectId}`;
    marker.userData.castShadow = castShadow;

    this.scene.add(marker);
    this.debugObjects.push(marker);
    this.occludedObjectMarkers.set(objectId, marker);
  }

  /**
   * Create visualization for occlusion bounds
   * 
   * @private
   * @param {Vector3} min - Bounds minimum
   * @param {Vector3} max - Bounds maximum
   */
  _createOcclusionBoundsHelper(min, max) {
    if (!min || !max) return;

    // Create a box representing the occlusion bounds
    const geometry = new BufferGeometry();
    const vertices = [];

    // Box corners
    const corners = [
      [min.x, min.y, min.z],
      [max.x, min.y, min.z],
      [max.x, max.y, min.z],
      [min.x, max.y, min.z],
      [min.x, min.y, max.z],
      [max.x, min.y, max.z],
      [max.x, max.y, max.z],
      [min.x, max.y, max.z]
    ];

    // Box edges
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Front
      [4, 5], [5, 6], [6, 7], [7, 4], // Back
      [0, 4], [1, 5], [2, 6], [3, 7]  // Sides
    ];

    for (const corner of corners) {
      vertices.push(...corner);
    }

    const indices = [];
    for (const edge of edges) {
      indices.push(edge[0], edge[1]);
    }

    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(new BufferAttribute(new Uint16Array(indices), 1));

    const material = new LineBasicMaterial({
      color: new Color(0x00ffff), // Cyan
      transparent: true,
      opacity: 0.5,
      linewidth: 2
    });

    const box = new LineSegments(geometry, material);
    box.userData.debugId = 'occlusion_bounds';

    this.scene.add(box);
    this.debugObjects.push(box);
  }

  /**
   * Create statistics overlay as a sprite
   * Task 3.3: Culling statistics collection and reporting
   * Requirements: 12.4
   * 
   * Creates a canvas texture showing current culling statistics including:
   * - Total visible/culled object counts
   * - Culling efficiency percentage
   * - Shadow-casting object separation stats
   * - Occlusion test frame count
   * 
   * @private
   * @param {Object} stats - Statistics object
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   */
  _createStatsOverlay(stats, canvasWidth = 400, canvasHeight = 300) {
    if (!stats) return;

    // Create canvas for stats rendering
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'top';

    let y = 15;
    const lineHeight = 20;

    // Draw culling statistics
    ctx.fillText('=== CULLING STATISTICS ===', 15, y);
    y += lineHeight * 1.5;

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';

    const stats_to_display = [
      [`Total Objects:`, stats.totalObjects],
      [`Rendered:`, stats.rendered],
      [`Frustum Culled:`, stats.frustumCulled],
      [`Occlusion Culled:`, stats.occlusionCulled],
      [`Culling Efficiency:`, `${stats.cullingEfficiency}%`],
      ['', ''],
      [`Shadow Casting:`, ''],
      [`  Total:`, stats.shadowCastingTotal],
      [`  Rendered:`, stats.shadowCastingRendered],
      [`  Culled:`, stats.shadowCastingCulled],
      [`  Ratio:`, `${stats.shadowCastingRatio}%`],
      ['', ''],
      [`Occlusion Tests/Frame:`, stats.occlusionTestsPerFrame],
      [`Avg Occlusion Time:`, `${stats.averageOcclusionTime}ms`]
    ];

    for (const [label, value] of stats_to_display) {
      if (label === '') {
        y += 5;
      } else if (label.startsWith('===') || label.startsWith('  ')) {
        ctx.fillText(`${label} ${value}`, 15, y);
        y += lineHeight;
      } else {
        ctx.fillText(`${label} ${value}`, 15, y);
        y += lineHeight;
      }
    }

    // Create texture and sprite for display
    const texture = new CanvasTexture(canvas);
    const spriteMaterial = new SpriteMaterial({ map: texture });
    const sprite = new Sprite(spriteMaterial);

    // Position sprite in upper left corner of viewport
    // Scale appropriate to canvas size
    sprite.scale.set(canvasWidth / 100, canvasHeight / 100, 1);
    sprite.position.set(-8, 5, 0);

    this.scene.add(sprite);
    this.debugObjects.push(sprite);
  }

  /**
   * Get debug statistics
   * 
   * @returns {Object} - Current debug statistics
   */
  getDebugStats() {
    return this.debugStats;
  }

  /**
   * Clear all debug visualization objects
   */
  clearDebugObjects() {
    for (const obj of this.debugObjects) {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
    this.debugObjects = [];
    this.culledObjectMarkers.clear();
    this.occludedObjectMarkers.clear();
  }

  /**
   * Clear all resources
   */
  clearAll() {
    this.clearDebugObjects();
    this.debugStats = null;
  }

  /**
   * Dispose of visualizer
   */
  dispose() {
    this.clearAll();
    this.scene = null;
  }
}

export default CullingDebugVisualizer;
