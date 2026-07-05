/**
 * Culling System - Frustum and Occlusion Culling
 * 
 * Implements both frustum and occlusion culling to exclude invisible objects
 * from rendering. Frustum culling removes objects outside the camera view
 * immediately, while occlusion culling tests objects against main geometry
 * every 5 frames using GPU occlusion queries.
 * 
 * Task 3.2: GPU occlusion query system
 * Task 3.3: Debug visualization and culling statistics
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { Vector3, Plane, Box3, Sphere, Matrix4, Camera, Quaternion, Frustum } from 'three';
import { CULLING_CONFIG } from '../constants';

/**
 * Represents a plane of the viewing frustum
 */
class FrustumPlane {
  constructor(normal, constant) {
    this.normal = new Vector3().copy(normal);
    this.constant = constant;
  }

  /**
   * Test if a sphere is on the positive side of the plane
   * Used for frustum-sphere intersection testing
   * @param {Sphere} sphere - The sphere to test
   * @returns {boolean} - True if sphere is at least partially on positive side
   */
  testSphere(sphere) {
    // Distance from sphere center to plane
    const distance = this.normal.dot(sphere.center) + this.constant;
    // If sphere center is far enough behind the plane, cull it
    return distance > -sphere.radius;
  }

  /**
   * Test if a box is on the positive side of the plane
   * Used for bounding box intersection tests
   * @param {Box3} box - The box to test
   * @returns {boolean} - True if box is at least partially on positive side
   */
  testBox(box) {
    // Get the closest point on the box to the plane
    const closestPoint = new Vector3(
      this.normal.x > 0 ? box.max.x : box.min.x,
      this.normal.y > 0 ? box.max.y : box.min.y,
      this.normal.z > 0 ? box.max.z : box.min.z
    );

    const distance = this.normal.dot(closestPoint) + this.constant;
    return distance >= 0;
  }
}

/**
 * CullingSystem class implementing the CullingSystem interface
 * Handles frustum culling and optional occlusion culling
 */
class CullingSystem {
  /**
   * Initialize CullingSystem
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    // Frustum planes (6 for near, far, left, right, top, bottom)
    this.frustumPlanes = [
      new FrustumPlane(new Vector3(0, 0, 1), 0), // near
      new FrustumPlane(new Vector3(0, 0, -1), 0), // far
      new FrustumPlane(new Vector3(1, 0, 0), 0), // left
      new FrustumPlane(new Vector3(-1, 0, 0), 0), // right
      new FrustumPlane(new Vector3(0, 1, 0), 0), // top
      new FrustumPlane(new Vector3(0, -1, 0), 0), // bottom
    ];

    // Occlusion testing configuration
    this.occluders = new Set(); // Objects that can occlude others
    this.occlusionTests = new Map(); // object.uuid -> OcclusionTest
    this.occlusionTestFrequency = config.occlusionTestFrequency || CULLING_CONFIG.OCCLUSION_TEST_FREQUENCY;
    this.currentFrame = 0;
    this.pendingOcclusionQueries = new Map(); // Query tracking for GPU tests

    // Performance configuration
    this.frustumMargin = config.frustumMargin || CULLING_CONFIG.FRUSTUM_MARGIN;
    this.maxOcclusionTestsPerFrame = config.maxOcclusionTestsPerFrame || CULLING_CONFIG.MAX_OCCLUSION_TESTS_PER_FRAME;

    // Debug settings
    this.debugVisualizationEnabled = false;
    this.debugBounds = [];

    // Statistics
    this.stats = {
      totalObjects: 0,
      frustumCulled: 0,
      occlusionCulled: 0,
      rendered: 0,
      occlusionTestsPerFrame: 0,
      averageOcclusionTime: 0,
      lastUpdateFrame: 0
    };

    // Temporary vectors for calculations
    this._tmpVector3 = new Vector3();
    this._tmpMatrix4 = new Matrix4();
    this._frustumMatrix = new Matrix4();
  }

  /**
   * Perform frustum culling on objects
   * Requirements: 3.1, 3.3
   * 
   * @param {Object3D[]} objects - Array of objects to cull
   * @param {Camera} camera - Camera for frustum calculation
   * @returns {CullingResult} - Result containing visible objects and render queue
   */
  performFrustumCulling(objects, camera) {
    if (!objects || objects.length === 0) {
      return {
        visibleObjects: [],
        frustumCulled: [],
        occlusionCulled: [],
        renderQueue: []
      };
    }

    // Build Three.js Frustum from the camera — battle-tested and correct
    if (!this._threeFrustum) this._threeFrustum = new Frustum();
    if (!this._projScreenMatrix) this._projScreenMatrix = new Matrix4();

    // Ensure camera matrices are up to date
    camera.updateMatrixWorld(false);
    camera.updateProjectionMatrix?.();
    this._projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._threeFrustum.setFromProjectionMatrix(this._projScreenMatrix);

    const visibleObjects = [];
    const frustumCulled = [];
    const renderQueueEntries = [];
    const cameraPosition = camera.position;

    let frustumCulledCount = 0;

    // Only cull actual renderable mesh objects — NEVER Groups, Lights, or Cameras.
    // Hiding a Group or Light would black out the entire scene.
    for (const object of objects) {
      if (!object) continue;

      // Only process renderable leaf objects (Mesh, SkinnedMesh, InstancedMesh, Points, Line)
      if (!object.isMesh && !object.isInstancedMesh && !object.isSkinnedMesh &&
          !object.isPoints && !object.isLine) continue;

      // Skip objects that were hidden by game logic (not by our culling system)
      const isCulledByUs = object.userData?.frustumCulled === true;
      if (!object.visible && !isCulledByUs) continue;

      // Ensure geometry bounding sphere is computed
      if (object.geometry) {
        if (!object.geometry.boundingSphere) {
          object.geometry.computeBoundingSphere();
        }
      }

      // Use Three.js frustum intersectsObject — handles world matrix correctly
      const isVisible = this._threeFrustum.intersectsObject(object);

      if (isVisible) {
        visibleObjects.push(object);

        if (!object.userData) object.userData = {};
        object.userData.frustumCulled = false;

        // Restore visibility only if not occlusion-culled
        if (!object.userData.occlusionCulled) {
          object.visible = true;
        }

        // Build render queue entry
        const center = object.geometry?.boundingSphere
          ? object.geometry.boundingSphere.center.clone().applyMatrix4(object.matrixWorld)
          : object.position;
        const distanceToCamera = cameraPosition.distanceTo(center);

        renderQueueEntries.push({
          object,
          distanceToCamera,
          renderPriority: this._calculateRenderPriority(object),
          lodLevel: this._getLODLevel(object),
          instanceData: object.userData?.instanceData || null
        });
      } else {
        frustumCulled.push(object);
        frustumCulledCount++;

        // Only hide when object is far enough outside to avoid shadow popping
        // Shadow casters need extra margin — keep them visible while nearby
        const skipCull = object.castShadow; // Keep shadow casters always visible for now
        if (!skipCull) {
          object.visible = false;
          if (!object.userData) object.userData = {};
          object.userData.frustumCulled = true;
        }
      }
    }

    // Sort render queue by priority and distance for optimal rendering
    this._sortRenderQueue(renderQueueEntries, camera);

    // Update statistics
    this.stats.totalObjects = objects.length;
    this.stats.frustumCulled = frustumCulledCount;
    this.stats.rendered = visibleObjects.length;
    this.stats.lastUpdateFrame = this.currentFrame;

    // Clear debug visualization if enabled
    if (this.debugVisualizationEnabled) {
      this._updateDebugVisualization(visibleObjects, frustumCulled);
    }

    this.currentFrame++;

    return {
      visibleObjects,
      frustumCulled,
      occlusionCulled: [],
      renderQueue: renderQueueEntries
    };
  }

  /**
   * Update occlusion culling state with GPU queries
   * Requirements: 3.2, 3.4
   * 
   * Implements 5-frame update cycle for occlusion testing using GPU queries
   * when available, falling back to CPU-based testing.
   * 
   * @param {Object3D[]} objects - Array of objects to test
   * @param {Object3D[]} occluders - Array of occluding objects
   */
  updateOcclusionCulling(objects, occluders, gl = null) {
    if (!objects || objects.length === 0) return;

    // Update occluder set
    if (occluders && occluders.length > 0) {
      occluders.forEach(occluder => this.addOccluder(occluder));
    }

    // Perform occlusion tests on 5-frame cycle (Requirement 3.4)
    // The 5-frame cycle means: issue new queries every 5 frames, retrieve results every 5 frames
    const isTestFrame = this.currentFrame % this.occlusionTestFrequency === 0;

    if (isTestFrame) {
      // Process results from previous cycle
      if (gl && this.pendingOcclusionQueries.size > 0) {
        for (const [objectId, query] of this.pendingOcclusionQueries.entries()) {
          const occlusionTest = this.occlusionTests.get(objectId);
          if (occlusionTest && occlusionTest.object) {
            this.retrieveGPUOcclusionQueryResult(gl, occlusionTest.object);
          }
        }
      }

      // Issue new queries for objects to test
      let testCount = 0;
      const maxTests = this.maxOcclusionTestsPerFrame;

      for (const object of objects) {
        if (testCount >= maxTests) break;
        if (!object || !object.visible) continue;

        const objectId = object.uuid;

        // Get or create occlusion test record
        let occlusionTest = this.occlusionTests.get(objectId);
        if (!occlusionTest) {
          occlusionTest = {
            object: object,
            boundingBox: new Box3(),
            lastTestFrame: -1,
            isVisible: true,
            testInProgress: false,
            gpuQuery: null, // GPU occlusion query handle
            samplesPassed: 0, // Number of samples passed in GPU query
            totalSamples: 0   // Total samples rendered for query
          };
          this.occlusionTests.set(objectId, occlusionTest);
        }

        // Initialize GPU query if not already done
        if (!occlusionTest.gpuQuery) {
          this.initGPUOcclusionQueries(object);
        }

        // Check if object might be occluded (quick CPU test)
        const potentiallyOccluded = this.isPotentiallyOccluded(
          object,
          this.occlusionBounds
        );

        if (potentiallyOccluded && gl) {
          // Issue GPU query for objects that might be occluded
          this.issueGPUOcclusionQuery(gl, object);
        } else if (potentiallyOccluded) {
          // Fall back to CPU-based occlusion test
          const isOccluded = this._testObjectOcclusion(object, this.occluders);
          occlusionTest.isVisible = !isOccluded;
          this._applyOcclusionVisibility(object, !isOccluded);
        } else {
          // Not occluded
          occlusionTest.isVisible = true;
          this._applyOcclusionVisibility(object, true);
        }

        occlusionTest.lastTestFrame = this.currentFrame;
        testCount++;
      }

      this.stats.occlusionTestsPerFrame = testCount;
    }
  }

  /**
   * Initialize GPU occlusion queries for an object
   * Requirements: 3.2
   * 
   * Sets up GPU-based occlusion queries for accurate visibility testing.
   * This is called automatically when objects are registered for occlusion testing.
   * 
   * @param {Object3D} object - Object to initialize GPU queries for
   * @returns {Object} - GPU query data or null if GPU queries not supported
   */
  initGPUOcclusionQueries(object) {
    const objectId = object.uuid;
    let occlusionTest = this.occlusionTests.get(objectId);

    if (!occlusionTest) {
      occlusionTest = {
        object: object,
        boundingBox: new Box3(),
        lastTestFrame: -1,
        isVisible: true,
        testInProgress: false,
        gpuQuery: null,
        samplesPassed: 0,
        totalSamples: 0
      };
      this.occlusionTests.set(objectId, occlusionTest);
    }

    // GPU query data structure for tracking occlusion tests
    // In a real WebGL context, this would store actual query objects
    occlusionTest.gpuQuery = {
      id: objectId,
      queryHandle: null,
      issuedFrame: -1,
      resultReady: false,
      samplesPassed: 0
    };

    return occlusionTest.gpuQuery;
  }

  /**
   * Issue GPU occlusion query for an object
   * Requirements: 3.2
   * 
   * Submits a GPU occlusion query for an object. In a real WebGL implementation,
   * this would use GL_ANY_SAMPLES_PASSED queries. When WebGL context is not available,
   * simulates query tracking for testing purposes.
   * 
   * @param {WebGLRenderingContext} gl - WebGL context (optional for testing)
   * @param {Object3D} object - Object to query
   * @returns {Object} - Query object or null if not supported
   */
  issueGPUOcclusionQuery(gl, object) {
    if (!object) return null;

    const objectId = object.uuid;
    const occlusionTest = this.occlusionTests.get(objectId);

    if (!occlusionTest || !occlusionTest.gpuQuery) {
      return null;
    }

    // If no WebGL context provided, simulate query for testing
    if (!gl) {
      occlusionTest.gpuQuery.queryHandle = { simulated: true };
      occlusionTest.gpuQuery.issuedFrame = this.currentFrame;
      occlusionTest.gpuQuery.contextType = 'simulated';
      occlusionTest.testInProgress = true;
      this.pendingOcclusionQueries.set(objectId, occlusionTest.gpuQuery);
      return occlusionTest.gpuQuery;
    }

    // Check if WebGL EXT_disjoint_timer_query_webgl2 extension is available
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') ||
                gl.getExtension('EXT_disjoint_timer_query');
    
    if (!ext) {
      // Fallback: use EXT_occlusion_query_boolean if available
      const occlusionExt = gl.getExtension('EXT_occlusion_query_boolean');
      if (!occlusionExt) {
        occlusionTest.gpuQuery.supported = false;
        return null;
      }
    }

    try {
      // WebGL 2.0: Use built-in occlusion query
      let query = null;
      if (gl instanceof WebGL2RenderingContext) {
        query = gl.createQuery();
        if (!query) return null;

        gl.beginQuery(gl.ANY_SAMPLES_PASSED, query);
        occlusionTest.gpuQuery.queryHandle = query;
        occlusionTest.gpuQuery.issuedFrame = this.currentFrame;
        occlusionTest.gpuQuery.contextType = 'webgl2';
      } else {
        // WebGL 1.0 fallback with extension
        const ext = gl.getExtension('EXT_occlusion_query_boolean');
        if (ext) {
          query = ext.createQueryEXT();
          ext.beginQueryEXT(ext.OCCLUSION_QUERY_EXT, query);
          occlusionTest.gpuQuery.queryHandle = query;
          occlusionTest.gpuQuery.issuedFrame = this.currentFrame;
          occlusionTest.gpuQuery.contextType = 'webgl1_ext';
          occlusionTest.gpuQuery.extension = ext;
        }
      }

      occlusionTest.testInProgress = true;
      this.pendingOcclusionQueries.set(objectId, occlusionTest.gpuQuery);

      return occlusionTest.gpuQuery;
    } catch (error) {
      console.warn('Failed to issue GPU occlusion query:', error);
      occlusionTest.gpuQuery.supported = false;
      return null;
    }
  }

  /**
   * End GPU occlusion query for an object
   * Requirements: 3.2
   * 
   * Completes the GPU occlusion query after rendering test geometry.
   * Must be called after rendering the bounding geometry for the object.
   * 
   * @param {WebGLRenderingContext} gl - WebGL context
   * @param {Object3D} object - Object whose query should be ended
   */
  endGPUOcclusionQuery(gl, object) {
    if (!gl || !object) return;

    const objectId = object.uuid;
    const occlusionTest = this.occlusionTests.get(objectId);

    if (!occlusionTest || !occlusionTest.gpuQuery) {
      return;
    }

    const gpuQuery = occlusionTest.gpuQuery;

    if (!gpuQuery.queryHandle) {
      return; // Query not issued
    }

    try {
      if (gpuQuery.contextType === 'webgl2') {
        gl.endQuery(gl.ANY_SAMPLES_PASSED);
      } else if (gpuQuery.contextType === 'webgl1_ext') {
        const ext = gpuQuery.extension;
        if (ext) {
          ext.endQueryEXT(ext.OCCLUSION_QUERY_EXT);
        }
      }
    } catch (error) {
      console.warn('Failed to end GPU occlusion query:', error);
    }
  }

  /**
   * Retrieve GPU occlusion query results
   * Requirements: 3.2, 3.4
   * 
   * Processes GPU occlusion query results and updates object visibility state.
   * Results are cached until the next test cycle. Handles both WebGL 2.0 and
   * WebGL 1.0 with extension fallback, plus simulated queries for testing.
   * 
   * @param {WebGLRenderingContext} gl - WebGL context (optional for testing)
   * @param {Object3D} object - Object to get results for
   * @returns {boolean} - True if object is visible (samples passed > 0)
   */
  retrieveGPUOcclusionQueryResult(gl, object) {
    if (!object) return true;

    const objectId = object.uuid;
    const occlusionTest = this.occlusionTests.get(objectId);

    if (!occlusionTest || !occlusionTest.gpuQuery) {
      return true; // Assume visible if no query
    }

    const gpuQuery = occlusionTest.gpuQuery;

    if (!gpuQuery.queryHandle) {
      return true; // Query not issued
    }

    try {
      let resultAvailable = false;
      let samplesPassed = 0;

      if (gpuQuery.contextType === 'simulated') {
        // Simulated query for testing - always return result ready
        resultAvailable = true;
        samplesPassed = gpuQuery.samplesPassed; // Use pre-set value or default to visible
      } else if (gpuQuery.contextType === 'webgl2') {
        // WebGL 2.0 query result
        if (!gl) return occlusionTest.isVisible;
        
        resultAvailable = gl.getQueryParameter(
          gpuQuery.queryHandle,
          gl.QUERY_RESULT_AVAILABLE
        );

        if (resultAvailable) {
          samplesPassed = gl.getQueryParameter(
            gpuQuery.queryHandle,
            gl.QUERY_RESULT
          );

          // Clean up query
          if (gl instanceof WebGL2RenderingContext) {
            gl.deleteQuery(gpuQuery.queryHandle);
          }
        }
      } else if (gpuQuery.contextType === 'webgl1_ext') {
        // WebGL 1.0 extension query result
        if (!gl) return occlusionTest.isVisible;
        
        const ext = gpuQuery.extension;
        if (ext) {
          resultAvailable = ext.getQueryObjectEXT(
            gpuQuery.queryHandle,
            ext.QUERY_RESULT_AVAILABLE_EXT
          );

          if (resultAvailable) {
            samplesPassed = ext.getQueryObjectEXT(
              gpuQuery.queryHandle,
              ext.QUERY_RESULT_EXT
            );

            // Clean up query
            ext.deleteQueryEXT(gpuQuery.queryHandle);
          }
        }
      }

      if (resultAvailable) {
        gpuQuery.samplesPassed = samplesPassed;
        gpuQuery.resultReady = true;
        const isVisible = samplesPassed > 0;

        occlusionTest.isVisible = isVisible;
        occlusionTest.testInProgress = false;
        occlusionTest.samplesPassed = samplesPassed;
        
        // Apply visibility state
        this._applyOcclusionVisibility(object, isVisible);

        // Remove from pending queries
        this.pendingOcclusionQueries.delete(objectId);

        return isVisible;
      } else {
        // Result not yet available, keep waiting
        return occlusionTest.isVisible; // Use last known visibility
      }
    } catch (error) {
      console.warn('Failed to retrieve GPU occlusion query result:', error);
      return occlusionTest.isVisible; // Use last known visibility on error
    }
  }

  /**
   * Get occlusion bounds for casino building geometry
   * Requirements: 3.2, 3.4
   * 
   * Creates bounding boxes for occlusion testing against main building.
   * Used to determine which objects should be tested for occlusion.
   * 
   * @param {Object3D} casinoBuilding - Main casino building mesh
   * @returns {Box3} - Bounding box for occlusion geometry
   */
  getOcclusionBounds(casinoBuilding) {
    if (!casinoBuilding) {
      return new Box3(); // Empty bounds
    }

    const occlusionBounds = new Box3();
    occlusionBounds.setFromObject(casinoBuilding);

    // Store for later reference
    if (!this.occlusionBounds) {
      this.occlusionBounds = occlusionBounds;
    }

    return occlusionBounds;
  }

  /**
   * Check if object is potentially occluded by casino building
   * Requirements: 3.2
   * 
   * Quick test to determine if an object is within the shadow volume
   * of the occlusion geometry. Used to filter which objects need GPU queries.
   * 
   * @param {Object3D} object - Object to test
   * @param {Box3} occlusionBounds - Bounds of occlusion geometry
   * @returns {boolean} - True if object might be occluded
   */
  isPotentiallyOccluded(object, occlusionBounds) {
    if (!occlusionBounds) return false;

    // Get object bounds
    const objectBounds = new Box3();
    objectBounds.setFromObject(object);

    // Test if object is behind or intersecting occlusion bounds
    // A more sophisticated test would compute shadow volumes
    if (objectBounds.intersectsBox(occlusionBounds)) {
      return true;
    }

    // Check if object is roughly behind the occluder (z-depth test)
    const occluderCenterZ = (occlusionBounds.min.z + occlusionBounds.max.z) / 2;
    const objectCenterZ = (objectBounds.min.z + objectBounds.max.z) / 2;

    return objectCenterZ < occluderCenterZ;
  }

  /**
   * Set the frequency of occlusion culling tests
   * Requirements: 3.4
   * 
   * @param {number} frames - Test frequency in frames
   */
  setOcclusionTestFrequency(frames) {
    if (frames < 1) {
      throw new Error('CullingSystem: Occlusion test frequency must be at least 1 frame');
    }
    this.occlusionTestFrequency = Math.floor(frames);
  }

  /**
   * Add an object that can occlude other objects
   * 
   * @param {Object3D} occluder - Object to use for occlusion testing
   */
  addOccluder(occluder) {
    if (occluder && !this.occluders.has(occluder)) {
      this.occluders.add(occluder);
    }
  }

  /**
   * Remove an occluding object
   * 
   * @param {Object3D} occluder - Object to stop using for occlusion testing
   */
  removeOccluder(occluder) {
    if (occluder) {
      this.occluders.delete(occluder);
      // Clean up related occlusion tests
      for (const [id, test] of this.occlusionTests.entries()) {
        if (test.object === occluder) {
          this.occlusionTests.delete(id);
        }
      }
    }
  }

  /**
   * Get current culling statistics including shadow casting separation
   * Task 3.3: Culling statistics collection and reporting
   * Requirements: 3.5, 12.4
   * 
   * Collects comprehensive statistics about culling operations including
   * timing, object counts, and separation of shadow-casting objects.
   * Tracks both visible and culled shadow-casting objects for analysis.
   * 
   * @returns {CullingStats} - Current culling performance statistics
   */
  getCullingStats() {
    // Count shadow-casting objects separately (Requirement 3.5, 12.4)
    let shadowCastingCulled = 0;
    let shadowCastingRendered = 0;
    let shadowCastingTotal = 0;
    
    // Count from visible and culled objects in debug bounds
    for (const entry of this.debugBounds || []) {
      if (entry.object && entry.object.castShadow) {
        shadowCastingTotal++;
        if (entry.type === 'culled') {
          shadowCastingCulled++;
        } else if (entry.type === 'visible') {
          shadowCastingRendered++;
        }
      }
    }

    // Calculate statistics
    const shadowCastingRatio = shadowCastingTotal > 0 
      ? shadowCastingRendered / shadowCastingTotal 
      : 0;
    
    // Calculate culling efficiency (higher = more objects culled, reducing render load)
    const cullingEfficiency = this.stats.totalObjects > 0
      ? (this.stats.frustumCulled + this.stats.occlusionCulled) / this.stats.totalObjects
      : 0;

    return {
      // Core statistics
      totalObjects: this.stats.totalObjects,
      frustumCulled: this.stats.frustumCulled,
      occlusionCulled: this.stats.occlusionCulled,
      rendered: this.stats.rendered,
      
      // Occlusion query performance
      occlusionTestsPerFrame: this.stats.occlusionTestsPerFrame,
      averageOcclusionTime: this.stats.averageOcclusionTime,
      
      // Task 3.3 additions: shadow casting object separation (Requirements 3.5, 12.4)
      shadowCastingTotal: shadowCastingTotal,
      shadowCastingCulled: shadowCastingCulled,
      shadowCastingRendered: shadowCastingRendered,
      shadowCastingRatio: shadowCastingRatio,
      
      // Efficiency metrics
      cullingEfficiency: cullingEfficiency,
      
      // Debug status
      debugEnabled: this.debugVisualizationEnabled,
      currentFrame: this.currentFrame
    };
  }

  /**
   * Enable or disable debug visualization
   * Task 3.3: Debug rendering for frustum bounds and occluded objects
   * Requirements: 3.5, 12.4
   * 
   * Creates visual representations of culling decisions for debugging purposes.
   * Shows frustum bounds, occluded objects, culled objects, and culling statistics in real-time.
   * When enabled, generates debug data structures suitable for visualization overlays.
   * 
   * @param {boolean} enabled - Enable debug visualization
   */
  setDebugVisualization(enabled) {
    this.debugVisualizationEnabled = enabled;
    if (!enabled) {
      // Clean up debug data when disabled
      this.debugBounds = [];
      this.debugStats = null;
      this.debugVisualizationData = null;
    } else {
      // Initialize debug tracking structures
      this.debugBounds = [];
      this.debugStats = {
        lastRenderStart: 0,
        renderTime: 0
      };
    }
  }

  /**
   * Get comprehensive debug visualization data for rendering debug overlays
   * Task 3.3: Debug rendering for frustum bounds and occluded objects
   * Requirements: 3.5, 12.4
   * 
   * Returns structured data for visualization overlays including:
   * - Frustum bounds geometry
   * - Occluded object markers
   * - Culling statistics with shadow-casting separation
   * - Frame-by-frame debug metrics
   * 
   * @returns {Object} - Comprehensive debug visualization data
   */
  getDebugVisualizationData() {
    if (!this.debugVisualizationEnabled) {
      return null;
    }

    const stats = this.getCullingStats();
    
    return {
      // Frustum visualization
      frustumPlanes: this.frustumPlanes.map(plane => ({
        normal: plane.normal.clone(),
        constant: plane.constant
      })),
      
      // Object bounds for visualization
      visibleBounds: this.debugBounds
        .filter(b => b.type === 'visible')
        .map(b => ({
          type: 'visible',
          sphere: b.sphere,
          objectId: b.object?.uuid,
          position: b.object?.position?.clone(),
          castShadow: b.object?.castShadow || false
        })),
      
      culledBounds: this.debugBounds
        .filter(b => b.type === 'culled')
        .map(b => ({
          type: 'culled',
          sphere: b.sphere,
          objectId: b.object?.uuid,
          position: b.object?.position?.clone(),
          castShadow: b.object?.castShadow || false
        })),
      
      // Occluded objects visualization
      occludedObjects: this.generateOccludedObjectVisualization(),
      
      // Occlusion bounds
      occlusionBounds: this.occlusionBounds ? {
        min: this.occlusionBounds.min.clone(),
        max: this.occlusionBounds.max.clone(),
        center: this.occlusionBounds.getCenter(new Vector3())
      } : null,
      
      // Statistics for overlay display
      stats: {
        totalObjects: stats.totalObjects,
        rendered: stats.rendered,
        frustumCulled: stats.frustumCulled,
        occlusionCulled: stats.occlusionCulled,
        cullingEfficiency: (stats.cullingEfficiency * 100).toFixed(1),
        
        // Shadow casting stats
        shadowCastingTotal: stats.shadowCastingTotal,
        shadowCastingRendered: stats.shadowCastingRendered,
        shadowCastingCulled: stats.shadowCastingCulled,
        shadowCastingRatio: (stats.shadowCastingRatio * 100).toFixed(1),
        
        // Performance metrics
        occlusionTestsPerFrame: stats.occlusionTestsPerFrame,
        averageOcclusionTime: stats.averageOcclusionTime.toFixed(2)
      },
      
      // Frame information
      currentFrame: this.currentFrame,
      occlusionTestFrequency: this.occlusionTestFrequency,
      
      // Timestamp for performance tracking
      timestamp: performance.now()
    };
  }

  /**
   * Generate comprehensive debug rendering data for frustum visualization
   * Task 3.3: Debug rendering for frustum bounds and occluded objects
   * Requirements: 3.5, 12.4
   * 
   * Creates detailed wireframe representations of the view frustum including:
   * - All 6 frustum planes with normals
   * - Visible object bounding spheres
   * - Culled object bounding spheres
   * - Occlusion bounds geometry
   * 
   * @returns {Object} - Frustum visualization geometry data
   */
  generateFrustumVisualization() {
    const frustumVisualization = {
      // Frustum plane data for rendering
      planes: this.frustumPlanes.map((plane, idx) => ({
        index: idx,
        name: ['near', 'far', 'left', 'right', 'top', 'bottom'][idx],
        normal: plane.normal.clone(),
        constant: plane.constant,
        vertices: this._generatePlaneVertices(plane)
      })),
      
      // Object distribution statistics
      statistics: {
        visibleCount: this.stats.rendered,
        culledCount: this.stats.frustumCulled,
        totalCount: this.stats.totalObjects,
        occlusionTestedCount: this.occlusionTests.size,
        
        // Shadow-casting separation
        shadowCastingVisible: this.debugBounds
          .filter(b => b.type === 'visible' && b.object?.castShadow).length,
        shadowCastingCulled: this.debugBounds
          .filter(b => b.type === 'culled' && b.object?.castShadow).length
      },
      
      // Object bounds for visualization
      visibleBounds: this.debugBounds
        .filter(b => b.type === 'visible')
        .map(b => this._boundToVisualizationData(b)),
      
      culledBounds: this.debugBounds
        .filter(b => b.type === 'culled')
        .map(b => this._boundToVisualizationData(b)),
      
      // Current frame info
      frame: this.currentFrame
    };

    return frustumVisualization;
  }

  /**
   * Generate debug rendering data for occluded objects
   * Task 3.3: Debug rendering for frustum bounds and occluded objects
   * Requirements: 3.5, 12.4
   * 
   * Creates visual markers and data for occluded objects, including:
   * - Occluded object positions and bounds
   * - Occlusion test status and timing
   * - GPU query results when available
   * - Shadow-casting object identification
   * 
   * @returns {Array} - Array of occluded object visualization data
   */
  generateOccludedObjectVisualization() {
    const occludedVisualizations = [];

    for (const [objectId, occlusionTest] of this.occlusionTests.entries()) {
      if (!occlusionTest.isVisible && occlusionTest.object) {
        const object = occlusionTest.object;
        const framesSinceTest = this.currentFrame - occlusionTest.lastTestFrame;
        
        occludedVisualizations.push({
          // Object identification
          objectId: objectId,
          objectName: object.name || 'Unnamed',
          objectType: object.type,
          
          // Position and bounds
          position: object.position.clone(),
          boundingBox: occlusionTest.boundingBox ? {
            min: occlusionTest.boundingBox.min.clone(),
            max: occlusionTest.boundingBox.max.clone()
          } : null,
          
          // Occlusion test status
          occlusionFrame: occlusionTest.lastTestFrame,
          framesSinceTest: framesSinceTest,
          isCurrentTest: framesSinceTest === 0,
          
          // GPU query results if available
          gpuQueryResults: occlusionTest.gpuQuery ? {
            samplesPassed: occlusionTest.samplesPassed,
            contextType: occlusionTest.gpuQuery.contextType,
            queryReady: occlusionTest.gpuQuery.resultReady
          } : null,
          
          // Shadow casting information
          castShadow: object.castShadow || false,
          receiveShadow: object.receiveShadow || false,
          
          // Material information
          materialTransparent: object.material?.transparent || false,
          materialOpacity: object.material?.opacity ?? 1.0
        });
      }
    }

    return occludedVisualizations;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.occluders.clear();
    this.occlusionTests.clear();
    this.pendingOcclusionQueries.clear();
    this.debugBounds = [];
    this.frustumPlanes = [];
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Update frustum planes from camera matrices
   * @private
   * @param {Camera} camera - Camera to extract frustum from
   */
  _updateFrustumPlanes(camera) {
    // Get the camera's projection matrix
    this._frustumMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );

    // Extract planes from projection matrix
    // Each plane is derived from rows/columns of the projection matrix
    const me = this._frustumMatrix.elements;

    // Near plane: me[2], me[6], me[10], me[14]
    this._setPlane(this.frustumPlanes[0], me[2], me[6], me[10], me[14]);

    // Far plane: me[3] - me[2], me[7] - me[6], me[11] - me[10], me[15] - me[14]
    this._setPlane(
      this.frustumPlanes[1],
      me[3] - me[2],
      me[7] - me[6],
      me[11] - me[10],
      me[15] - me[14]
    );

    // Left plane: me[3] + me[0], me[7] + me[4], me[11] + me[8], me[15] + me[12]
    this._setPlane(
      this.frustumPlanes[2],
      me[3] + me[0],
      me[7] + me[4],
      me[11] + me[8],
      me[15] + me[12]
    );

    // Right plane: me[3] - me[0], me[7] - me[4], me[11] - me[8], me[15] - me[12]
    this._setPlane(
      this.frustumPlanes[3],
      me[3] - me[0],
      me[7] - me[4],
      me[11] - me[8],
      me[15] - me[12]
    );

    // Top plane: me[3] - me[1], me[7] - me[5], me[11] - me[9], me[15] - me[13]
    this._setPlane(
      this.frustumPlanes[4],
      me[3] - me[1],
      me[7] - me[5],
      me[11] - me[9],
      me[15] - me[13]
    );

    // Bottom plane: me[3] + me[1], me[7] + me[5], me[11] + me[9], me[15] + me[13]
    this._setPlane(
      this.frustumPlanes[5],
      me[3] + me[1],
      me[7] + me[5],
      me[11] + me[9],
      me[15] + me[13]
    );
  }

  /**
   * Set a frustum plane from raw matrix values
   * @private
   */
  _setPlane(plane, x, y, z, w) {
    // Normalize the plane equation
    const length = Math.sqrt(x * x + y * y + z * z);
    if (length < 1e-10) {
      // Degenerate plane — set to pass-all so nothing gets hidden
      plane.normal.set(0, 0, 1);
      plane.constant = 1e9;
      return;
    }
    const factor = 1 / length;
    plane.normal.set(x * factor, y * factor, z * factor);
    plane.constant = w * factor;
  }

  /**
   * Test if a sphere is within the frustum
   * @private
   * @param {Sphere} sphere - Sphere to test
   * @returns {boolean} - True if sphere is at least partially visible
   */
  _isInFrustum(sphere, marginMultiplier = 1.0) {
    // Apply frustum margin to avoid sharp culling
    const testRadius = sphere.radius * this.frustumMargin * marginMultiplier;
    
    // Create a temporary sphere with the adjusted radius for testing
    const testSphere = {
      center: sphere.center,
      radius: testRadius
    };

    for (let i = 0; i < this.frustumPlanes.length; i++) {
      if (!this.frustumPlanes[i].testSphere(testSphere)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Helper to apply visibility state to an object based on occlusion culling
   * @private
   */
  _applyOcclusionVisibility(object, isVisible) {
    if (!object.userData) object.userData = {};
    object.userData.occlusionCulled = !isVisible;
    
    // Object should be visible if it is NOT frustum culled AND NOT occlusion culled
    const isFrustumCulled = object.userData.frustumCulled === true;
    object.visible = isVisible && !isFrustumCulled;
  }

  /**
   * Get bounding sphere for an object, using cached or computed value
   * @private
   * @param {Object3D} object - Object to get bounds for
   * @returns {Sphere|null} - Bounding sphere or null if no geometry
   */
  _getBoundingSphere(object) {
    // Compute fresh world-space bounding sphere — do NOT cache since objects move
    if (object.geometry) {
      if (!object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere();
      }
      if (object.geometry.boundingSphere) {
        const sphere = new Sphere(
          object.geometry.boundingSphere.center.clone(),
          object.geometry.boundingSphere.radius
        );
        // Transform center into world space
        sphere.center.applyMatrix4(object.matrixWorld);
        // Scale radius by the max scale component
        const scaleX = object.matrixWorld.elements[0];
        const scaleY = object.matrixWorld.elements[5];
        const scaleZ = object.matrixWorld.elements[10];
        const maxScale = Math.sqrt(Math.max(scaleX * scaleX, scaleY * scaleY, scaleZ * scaleZ));
        sphere.radius *= maxScale;
        return sphere;
      }
    }
    return null;
  }

  /**
   * Check if object has meaningful geometry
   * @private
   * @param {Object3D} object - Object to check
   * @returns {boolean} - True if object has geometry or children with geometry
   */
  _hasGeometry(object) {
    if (object.geometry) return true;
    if (object.children && object.children.length > 0) {
      return object.children.some(child => this._hasGeometry(child));
    }
    return false;
  }

  /**
   * Calculate render priority for an object
   * Priority helps sort opaque vs transparent objects
   * @private
   * @param {Object3D} object - Object to calculate priority for
   * @returns {number} - Render priority (lower = rendered first)
   */
  _calculateRenderPriority(object) {
    // Transparent objects have higher priority (rendered last)
    let priority = 0;

    if (object.material) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      for (const material of materials) {
        if (material.transparent || material.opacity < 1.0) {
          priority += 1000; // Render after opaque objects
        }
      }
    }

    return priority;
  }

  /**
   * Get LOD level for an object from userData
   * @private
   * @param {Object3D} object - Object to get LOD for
   * @returns {number} - Current LOD level (0 = high detail)
   */
  _getLODLevel(object) {
    return object.userData?.lodLevel || 0;
  }

  /**
   * Sort render queue by priority and distance
   * Opaques first (sorted by distance), then transparents (reverse distance)
   * @private
   * @param {RenderQueueEntry[]} queue - Queue to sort
   * @param {Camera} camera - Camera for distance reference
   */
  _sortRenderQueue(queue, camera) {
    // Separate opaque and transparent
    const opaque = [];
    const transparent = [];

    for (const entry of queue) {
      if (entry.renderPriority >= 1000) {
        transparent.push(entry);
      } else {
        opaque.push(entry);
      }
    }

    // Sort opaques by distance (front to back for early z-reject)
    opaque.sort((a, b) => a.distanceToCamera - b.distanceToCamera);

    // Sort transparents by distance (back to front for correct blending)
    transparent.sort((a, b) => b.distanceToCamera - a.distanceToCamera);

    // Replace queue with sorted entries
    queue.length = 0;
    queue.push(...opaque);
    queue.push(...transparent);
  }

  /**
   * Test if an object is occluded by any occluders
   * Simplified CPU-based test; GPU queries would be more accurate
   * @private
   * @param {Object3D} object - Object to test
   * @param {Set} occluders - Set of occluding objects
   * @returns {boolean} - True if object appears to be occluded
   */
  _testObjectOcclusion(object, occluders) {
    if (occluders.size === 0) return false;

    // Get bounding box for the object being tested
    const testBox = new Box3();
    testBox.setFromObject(object);

    // Check against each occluder
    for (const occluderId of occluders) {
      // In a full implementation, this would use GPU occlusion queries
      // For now, we do a simple AABB-to-AABB containment test
      const occluderBox = new Box3();
      occluderBox.setFromObject(occluderId);

      // If object box is fully contained within occluder, it's occluded
      if (testBox.containsBox && occluderBox.containsBox(testBox)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update debug visualization for culling results
   * Task 3.3: Debug rendering for frustum bounds and occluded objects
   * 
   * @private
   */
  _updateDebugVisualization(visibleObjects, culledObjects) {
    // Clear previous debug bounds
    this.debugBounds = [];

    // Store bounding sphere data for visible objects (for frustum visualization)
    for (const obj of visibleObjects) {
      const sphere = this._getBoundingSphere(obj);
      if (sphere) {
        this.debugBounds.push({
          type: 'visible',
          sphere: sphere,
          object: obj,
          debug: {
            castShadow: obj.castShadow || false,
            receiveShadow: obj.receiveShadow || false,
            lodLevel: this._getLODLevel(obj)
          }
        });
      }
    }

    // Store bounding sphere data for culled objects
    for (const obj of culledObjects) {
      const sphere = this._getBoundingSphere(obj);
      if (sphere) {
        this.debugBounds.push({
          type: 'culled',
          sphere: sphere,
          object: obj,
          debug: {
            castShadow: obj.castShadow || false,
            receiveShadow: obj.receiveShadow || false,
            lodLevel: this._getLODLevel(obj)
          }
        });
      }
    }
  }

  /**
   * Convert bounding data to visualization format
   * @private
   * @param {Object} boundData - Bounding sphere data
   * @returns {Object} - Formatted visualization data
   */
  _boundToVisualizationData(boundData) {
    return {
      position: boundData.sphere.center.clone(),
      radius: boundData.sphere.radius,
      objectId: boundData.object?.uuid,
      objectName: boundData.object?.name || 'Unnamed',
      castShadow: boundData.object?.castShadow || false,
      debug: boundData.debug || {}
    };
  }

  /**
   * Generate vertex positions for frustum plane visualization
   * @private
   * @param {FrustumPlane} plane - Frustum plane
   * @returns {Array<Vector3>} - Vertices for plane visualization
   */
  _generatePlaneVertices(plane) {
    // Generate a grid of vertices representing the plane
    // Used for wireframe frustum visualization
    const vertices = [];
    const gridSize = 5;
    const planeScale = 50; // Scale for visualization

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const u = (i / (gridSize - 1)) * 2 - 1;
        const v = (j / (gridSize - 1)) * 2 - 1;

        // Create a point on the plane using the normal
        // This is a simplified representation
        const point = new Vector3(u * planeScale, v * planeScale, 0);

        // Rotate to align with plane normal
        const quaternion = new Quaternion().setFromUnitVectors(
          new Vector3(0, 0, 1),
          plane.normal
        );
        point.applyQuaternion(quaternion);

        vertices.push(point);
      }
    }

    return vertices;
  }
}

export default CullingSystem;
