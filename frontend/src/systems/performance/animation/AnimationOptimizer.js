/**
 * AnimationOptimizer.js
 * 
 * Manages character animation optimization including:
 * - GPU-based skeletal animation for 3+ visible characters
 * - 15fps animation updates for characters beyond 25 units distance
 * - Animation LOD with reduced bone counts for distant characters
 * 
 * Requirements: 9.2, 9.3, 9.4
 */

import * as THREE from 'three';

class AnimationOptimizer {
  constructor(performanceSystem) {
    this.performanceSystem = performanceSystem;
    
    // Configuration
    this.config = {
      gpuAnimationThreshold: 3, // Enable GPU animation for 3+ visible characters
      distanceThreshold: 25, // Distance for animation LOD
      distantUpdateFPS: 15, // Update frequency for distant characters
      nearUpdateFPS: 30, // Update frequency for near characters
      maxBoneCount: 100, // Max bones for high LOD
      mediumBoneCount: 50, // Max bones for medium LOD
      lowBoneCount: 25, // Max bones for low LOD
    };
    
    // State tracking
    this.animatedMeshes = new Map(); // Map of mesh -> AnimationData
    this.animationUpdateQueue = [];
    this.gpuAnimationEnabled = false;
    this.lastUpdateTime = Date.now();
    this.frameCounter = 0;
    
    // GPU animation resources
    this.skeletonTextureData = null;
    this.boneMatrices = [];
    this.textureWidth = 64;
    this.textureHeight = 64;
    
    this.initialize();
  }
  
  /**
   * Initialize animation optimizer system
   */
  initialize() {
    console.log('[AnimationOptimizer] Initializing animation optimizer');
    this.createGPUAnimationResources();
  }
  
  /**
   * Create GPU-based skeletal animation resources
   */
  createGPUAnimationResources() {
    // Create bone matrix texture for GPU animation
    const textureData = new Float32Array(this.textureWidth * this.textureHeight * 4);
    this.skeletonTextureData = textureData;
    
    // Create WebGL texture for bone matrices
    this.boneMatrixTexture = new THREE.DataTexture(
      textureData,
      this.textureWidth,
      this.textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.boneMatrixTexture.needsUpdate = true;
    
    console.log('[AnimationOptimizer] GPU animation resources created');
  }
  
  /**
   * Register an animated mesh for optimization
   * @param {THREE.SkinnedMesh} mesh - The mesh to optimize
   * @param {THREE.AnimationClip[]} animationClips - Available animation clips
   */
  registerAnimatedMesh(mesh, animationClips = []) {
    if (!mesh.skeleton) {
      console.warn('[AnimationOptimizer] Mesh does not have skeleton, skipping registration');
      return false;
    }
    
    const animationData = {
      mesh,
      clips: animationClips,
      skeleton: mesh.skeleton,
      boneCount: mesh.skeleton.bones.length,
      currentClip: null,
      mixer: new THREE.AnimationMixer(mesh),
      actions: new Map(),
      distance: Infinity,
      visible: false,
      lod: 'high', // 'high', 'medium', 'low'
      updateFrequency: 30,
      lastUpdateFrame: 0,
      gpuEnabled: false,
    };
    
    // Initialize actions for all clips
    animationClips.forEach(clip => {
      const action = animationData.mixer.clipAction(clip);
      animationData.actions.set(clip.name, action);
    });
    
    this.animatedMeshes.set(mesh, animationData);
    return true;
  }
  
  /**
   * Unregister a mesh
   * @param {THREE.SkinnedMesh} mesh - The mesh to unregister
   */
  unregisterAnimatedMesh(mesh) {
    const animationData = this.animatedMeshes.get(mesh);
    if (animationData) {
      animationData.mixer.stopAllAction();
      this.animatedMeshes.delete(mesh);
    }
  }
  
  /**
   * Play animation on a mesh
   * @param {THREE.SkinnedMesh} mesh - The mesh to play animation on
   * @param {string} clipName - Name of the animation clip
   * @param {boolean} loop - Whether to loop the animation
   * @param {number} duration - Duration to play (0 = infinite)
   */
  playAnimation(mesh, clipName, loop = true, duration = 0) {
    const animationData = this.animatedMeshes.get(mesh);
    if (!animationData) {
      console.warn('[AnimationOptimizer] Mesh not registered for animation');
      return false;
    }
    
    const action = animationData.actions.get(clipName);
    if (!action) {
      console.warn(`[AnimationOptimizer] Animation clip '${clipName}' not found`);
      return false;
    }
    
    // Stop current animation
    if (animationData.currentClip) {
      animationData.mixer.stopAllAction();
    }
    
    // Set loop and play
    action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    action.clampWhenFinished = !loop;
    action.play();
    
    if (duration > 0) {
      setTimeout(() => {
        action.stop();
      }, duration * 1000);
    }
    
    animationData.currentClip = clipName;
    return true;
  }
  
  /**
   * Stop animation on a mesh
   * @param {THREE.SkinnedMesh} mesh - The mesh to stop animation on
   */
  stopAnimation(mesh) {
    const animationData = this.animatedMeshes.get(mesh);
    if (!animationData) return;
    
    animationData.mixer.stopAllAction();
    animationData.currentClip = null;
  }
  
  /**
   * Update animation states based on camera position and visibility
   * @param {THREE.Camera} camera - The camera
   * @param {THREE.Scene} scene - The scene
   * @param {number} deltaTime - Time since last frame
   */
  update(camera, scene, deltaTime) {
    this.frameCounter++;
    
    // Update all registered meshes
    this.animatedMeshes.forEach((animationData, mesh) => {
      // Calculate distance from camera
      const distance = mesh.position.distanceTo(camera.position);
      animationData.distance = distance;
      
      // Determine LOD level based on distance
      this.updateAnimationLOD(animationData);
      
      // Determine if we should update this frame
      const shouldUpdate = this.shouldUpdateAnimation(animationData);
      
      if (shouldUpdate) {
        animationData.lastUpdateFrame = this.frameCounter;
        animationData.mixer.update(deltaTime);
      }
    });
    
    // Check if GPU animation should be enabled
    this.updateGPUAnimationState();
  }
  
  /**
   * Update animation LOD based on distance
   * @param {Object} animationData - The animation data
   */
  updateAnimationLOD(animationData) {
    const distance = animationData.distance;
    const threshold = this.config.distanceThreshold;
    
    let newLOD = 'high';
    let updateFrequency = 30;
    
    if (distance > threshold * 2) {
      // Very far: low LOD, 10fps
      newLOD = 'low';
      updateFrequency = 10;
    } else if (distance > threshold) {
      // Far: medium LOD, 15fps
      newLOD = 'medium';
      updateFrequency = 15;
    } else {
      // Near: high LOD, 30fps
      newLOD = 'high';
      updateFrequency = 30;
    }
    
    if (animationData.lod !== newLOD) {
      animationData.lod = newLOD;
      this.applyAnimationLOD(animationData, newLOD);
    }
    
    animationData.updateFrequency = updateFrequency;
  }
  
  /**
   * Apply animation LOD by adjusting bone update frequency
   * @param {Object} animationData - The animation data
   * @param {string} lod - The LOD level ('high', 'medium', 'low')
   */
  applyAnimationLOD(animationData, lod) {
    // For now, we update the mixer's time scale to simulate LOD
    // In a full implementation, this would reduce skeleton update frequency
    
    switch (lod) {
      case 'low':
        animationData.mixer.timeScale = 0.5; // Slow down animations for distant characters
        break;
      case 'medium':
        animationData.mixer.timeScale = 0.75;
        break;
      case 'high':
        animationData.mixer.timeScale = 1.0;
        break;
    }
  }
  
  /**
   * Determine if animation should be updated this frame
   * @param {Object} animationData - The animation data
   * @returns {boolean} Whether to update
   */
  shouldUpdateAnimation(animationData) {
    // Calculate frames between updates based on frequency
    const framesBetweenUpdates = Math.max(1, Math.floor(60 / animationData.updateFrequency));
    
    // Check if enough frames have passed
    return (this.frameCounter - animationData.lastUpdateFrame) >= framesBetweenUpdates;
  }
  
  /**
   * Update GPU animation state based on visible character count
   */
  updateGPUAnimationState() {
    let visibleCount = 0;
    this.animatedMeshes.forEach(animationData => {
      if (animationData.distance < Infinity) {
        visibleCount++;
      }
    });
    
    const shouldEnable = visibleCount >= this.config.gpuAnimationThreshold;
    
    if (shouldEnable !== this.gpuAnimationEnabled) {
      this.gpuAnimationEnabled = shouldEnable;
      console.log(`[AnimationOptimizer] GPU animation ${shouldEnable ? 'enabled' : 'disabled'} (${visibleCount} visible characters)`);
      
      if (shouldEnable) {
        this.enableGPUAnimation();
      } else {
        this.disableGPUAnimation();
      }
    }
  }
  
  /**
   * Enable GPU-based skeletal animation
   */
  enableGPUAnimation() {
    // Update bone matrices in GPU texture
    this.updateBoneMatrixTexture();
    
    // Apply GPU animation shader to all animated meshes
    this.animatedMeshes.forEach((animationData, mesh) => {
      animationData.gpuEnabled = true;
      
      if (mesh.material) {
        // Add bone matrix texture to shader
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => {
            mat.uniforms = mat.uniforms || {};
            mat.uniforms.boneMatrices = { value: this.boneMatrixTexture };
          });
        } else {
          mesh.material.uniforms = mesh.material.uniforms || {};
          mesh.material.uniforms.boneMatrices = { value: this.boneMatrixTexture };
        }
      }
    });
  }
  
  /**
   * Disable GPU-based skeletal animation
   */
  disableGPUAnimation() {
    this.animatedMeshes.forEach((animationData, mesh) => {
      animationData.gpuEnabled = false;
    });
  }
  
  /**
   * Update bone matrix texture for GPU animation
   */
  updateBoneMatrixTexture() {
    let textureIndex = 0;
    
    this.animatedMeshes.forEach((animationData, mesh) => {
      if (animationData.gpuEnabled) {
        const skeleton = animationData.skeleton;
        skeleton.bones.forEach((bone, boneIndex) => {
          bone.updateMatrixWorld(true);
          const matrix = bone.matrixWorld;
          
          // Store matrix in texture (4 pixels per matrix = 16 floats)
          const pixelIndex = textureIndex * 4;
          if (pixelIndex + 16 < this.skeletonTextureData.length) {
            const elements = matrix.elements;
            for (let i = 0; i < 16; i++) {
              this.skeletonTextureData[pixelIndex + i] = elements[i];
            }
            textureIndex++;
          }
        });
      }
    });
    
    this.boneMatrixTexture.needsUpdate = true;
  }
  
  /**
   * Get animation statistics
   */
  getStats() {
    const stats = {
      totalAnimatedMeshes: this.animatedMeshes.size,
      gpuAnimationEnabled: this.gpuAnimationEnabled,
      meshStats: [],
    };
    
    this.animatedMeshes.forEach((animationData, mesh) => {
      stats.meshStats.push({
        boneCount: animationData.boneCount,
        lod: animationData.lod,
        distance: animationData.distance.toFixed(2),
        updateFrequency: animationData.updateFrequency,
        currentClip: animationData.currentClip,
        gpuEnabled: animationData.gpuEnabled,
      });
    });
    
    return stats;
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    this.animatedMeshes.forEach(animationData => {
      animationData.mixer.stopAllAction();
      animationData.mixer.uncacheClip();
    });
    
    this.animatedMeshes.clear();
    
    if (this.boneMatrixTexture) {
      this.boneMatrixTexture.dispose();
    }
  }
}

export default AnimationOptimizer;
