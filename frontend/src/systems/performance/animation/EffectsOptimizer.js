/**
 * EffectsOptimizer.js
 * 
 * Manages particle system and effects optimization including:
 * - Particle system limiting to maximum 500 active particles
 * - Impostor rendering for characters beyond 40 units distance
 * - Effect LOD system scaling particle density with distance
 * 
 * Requirements: 9.1, 9.5
 */

import * as THREE from 'three';

/**
 * ParticleSystem - Manages pooled particle instances for efficient rendering
 */
class ParticleSystem {
  constructor(maxParticles = 500, particleGeometry = null, particleMaterial = null) {
    this.maxParticles = maxParticles;
    this.particles = [];
    this.activeParticles = [];
    this.inactiveParticles = [];
    
    // Create default particle geometry and material if not provided
    this.particleGeometry = particleGeometry || new THREE.BufferGeometry();
    this.particleMaterial = particleMaterial || new THREE.PointsMaterial({
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
    });
    
    // Create particle pool
    this.createParticlePool();
    
    // Particle mesh group for rendering
    this.particles = new THREE.Group();
  }
  
  /**
   * Create pool of particle instances
   */
  createParticlePool() {
    for (let i = 0; i < this.maxParticles; i++) {
      const particle = new Particle(this.particleGeometry, this.particleMaterial);
      this.inactiveParticles.push(particle);
    }
  }
  
  /**
   * Get a particle from the pool
   * @returns {Particle} A particle instance
   */
  getParticle() {
    if (this.inactiveParticles.length > 0) {
      const particle = this.inactiveParticles.pop();
      particle.active = true;
      this.activeParticles.push(particle);
      return particle;
    } else {
      // Pool exhausted, remove oldest particle
      if (this.activeParticles.length >= this.maxParticles) {
        const removed = this.activeParticles.shift();
        this.inactiveParticles.push(removed);
        return this.getParticle();
      }
    }
    return null;
  }
  
  /**
   * Return particle to pool
   * @param {Particle} particle - The particle to return
   */
  returnParticle(particle) {
    particle.active = false;
    const index = this.activeParticles.indexOf(particle);
    if (index > -1) {
      this.activeParticles.splice(index, 1);
      this.inactiveParticles.push(particle);
    }
  }
  
  /**
   * Update all active particles
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    // Update particles in reverse so we can safely remove during iteration
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      particle.update(deltaTime);
      
      if (particle.life <= 0) {
        this.returnParticle(particle);
      }
    }
  }
  
  /**
   * Get active particle count
   * @returns {number} Number of active particles
   */
  getActiveCount() {
    return this.activeParticles.length;
  }
  
  /**
   * Clear all particles
   */
  clear() {
    this.activeParticles.forEach(particle => {
      this.inactiveParticles.push(particle);
    });
    this.activeParticles = [];
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    this.clear();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }
}

/**
 * Particle - Individual particle instance
 */
class Particle {
  constructor(geometry, material) {
    this.mesh = new THREE.Points(geometry, material);
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3(0, -9.8, 0); // Gravity
    this.life = 1.0;
    this.maxLife = 1.0;
    this.active = false;
    this.size = 1.0;
    this.rotation = 0;
  }
  
  /**
   * Initialize particle
   * @param {THREE.Vector3} position - Starting position
   * @param {THREE.Vector3} velocity - Starting velocity
   * @param {number} life - Life duration
   * @param {number} size - Particle size
   */
  initialize(position, velocity, life = 1.0, size = 1.0) {
    this.position.copy(position);
    this.velocity.copy(velocity);
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.active = true;
    this.mesh.position.copy(position);
    this.mesh.scale.set(size, size, size);
  }
  
  /**
   * Update particle
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    if (!this.active) return;
    
    // Apply physics
    this.velocity.addScaledVector(this.acceleration, deltaTime);
    this.position.addScaledVector(this.velocity, deltaTime);
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Decay life
    this.life -= deltaTime;
    
    // Update opacity based on remaining life
    const alpha = Math.max(0, this.life / this.maxLife);
    if (this.mesh.material) {
      this.mesh.material.opacity = alpha;
    }
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

/**
 * ImpostorRenderer - Renders distant characters as 2D impostor billboards
 */
class ImpostorRenderer {
  constructor(maxImpostors = 100) {
    this.maxImpostors = maxImpostors;
    this.impostors = [];
    this.textureCache = new Map();
    this.geometry = this.createImpostorGeometry();
    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    
    this.group = new THREE.Group();
  }
  
  /**
   * Create impostor billboard geometry
   */
  createImpostorGeometry() {
    return new THREE.PlaneGeometry(1, 2);
  }
  
  /**
   * Register a character for impostor rendering
   * @param {THREE.Object3D} character - The character to register
   * @param {THREE.Texture} texture - Texture for the impostor
   * @param {number} distance - Distance threshold for impostor rendering
   */
  registerCharacter(character, texture, distance = 40) {
    const impostor = {
      character,
      texture,
      distance,
      mesh: null,
      active: false,
    };
    
    this.impostors.push(impostor);
    return impostor;
  }
  
  /**
   * Update impostor rendering based on camera and visibility
   * @param {THREE.Camera} camera - The camera
   */
  update(camera) {
    this.impostors.forEach(impostor => {
      const distance = camera.position.distanceTo(impostor.character.position);
      const shouldShowImpostor = distance > impostor.distance;
      
      if (shouldShowImpostor && !impostor.active) {
        // Create impostor mesh
        const mat = this.material.clone();
        mat.map = impostor.texture;
        impostor.mesh = new THREE.Mesh(this.geometry, mat);
        impostor.mesh.position.copy(impostor.character.position);
        
        // Billboard - face camera
        impostor.mesh.lookAt(camera.position);
        
        this.group.add(impostor.mesh);
        impostor.active = true;
      } else if (!shouldShowImpostor && impostor.active) {
        // Remove impostor mesh
        if (impostor.mesh) {
          this.group.remove(impostor.mesh);
          impostor.mesh.material.dispose();
          impostor.mesh = null;
        }
        impostor.active = false;
      } else if (impostor.active && impostor.mesh) {
        // Update position and rotation
        impostor.mesh.position.copy(impostor.character.position);
        impostor.mesh.lookAt(camera.position);
      }
    });
  }
  
  /**
   * Cache character texture for impostor rendering
   * @param {string} key - Unique key for the character
   * @param {THREE.Texture} texture - The character texture
   */
  cacheTexture(key, texture) {
    this.textureCache.set(key, texture);
  }
  
  /**
   * Get cached texture
   * @param {string} key - The cache key
   */
  getTexture(key) {
    return this.textureCache.get(key);
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    this.impostors.forEach(impostor => {
      if (impostor.mesh) {
        impostor.mesh.material.dispose();
        impostor.mesh.geometry.dispose();
      }
    });
    this.impostors = [];
    this.geometry.dispose();
    this.material.dispose();
    this.textureCache.clear();
  }
}

/**
 * EffectsOptimizer - Main effects optimization manager
 */
class EffectsOptimizer {
  constructor(performanceSystem) {
    this.performanceSystem = performanceSystem;
    
    // Configuration
    this.config = {
      maxParticles: 500,
      impostorDistance: 40,
      particleDensityScale: 1.0, // 1.0 = full density, 0.5 = half density
      maxImpostors: 100,
    };
    
    // State
    this.particleSystems = new Map();
    this.impostorRenderer = new ImpostorRenderer(this.config.maxImpostors);
    this.effectEmitters = [];
    this.lastUpdateTime = Date.now();
    this.frameCounter = 0;
    
    this.initialize();
  }
  
  /**
   * Initialize effects optimizer
   */
  initialize() {
    console.log('[EffectsOptimizer] Initializing effects optimizer');
    console.log(`[EffectsOptimizer] Max particles: ${this.config.maxParticles}`);
  }
  
  /**
   * Create a particle system
   * @param {string} name - Unique name for the system
   * @param {number} maxParticles - Maximum particles (capped at config.maxParticles)
   * @returns {ParticleSystem} The particle system
   */
  createParticleSystem(name, maxParticles = 100) {
    const capped = Math.min(maxParticles, this.config.maxParticles);
    const system = new ParticleSystem(capped);
    this.particleSystems.set(name, system);
    return system;
  }
  
  /**
   * Get particle system
   * @param {string} name - Name of the system
   */
  getParticleSystem(name) {
    return this.particleSystems.get(name);
  }
  
  /**
   * Emit particles from a position
   * @param {string} systemName - Name of particle system
   * @param {THREE.Vector3} position - Emission position
   * @param {THREE.Vector3} velocity - Particle velocity
   * @param {number} count - Number of particles to emit
   * @param {number} life - Life duration of particles
   */
  emit(systemName, position, velocity, count, life = 1.0) {
    const system = this.particleSystems.get(systemName);
    if (!system) {
      console.warn(`[EffectsOptimizer] Particle system '${systemName}' not found`);
      return;
    }
    
    // Scale particle density based on LOD
    const scaledCount = Math.floor(count * this.config.particleDensityScale);
    
    for (let i = 0; i < scaledCount; i++) {
      const particle = system.getParticle();
      if (particle) {
        const randomVel = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        );
        randomVel.multiplyScalar(0.5);
        randomVel.add(velocity);
        
        particle.initialize(position, randomVel, life, 0.5);
      }
    }
  }
  
  /**
   * Update all effects
   * @param {THREE.Camera} camera - The camera
   * @param {number} deltaTime - Time since last frame
   */
  update(camera, deltaTime) {
    this.frameCounter++;
    
    // Update all particle systems
    this.particleSystems.forEach(system => {
      system.update(deltaTime);
    });
    
    // Update impostor rendering
    this.impostorRenderer.update(camera);
    
    // Update particle density LOD based on total active particles
    this.updateParticleDensityLOD();
  }
  
  /**
   * Update particle density LOD
   */
  updateParticleDensityLOD() {
    let totalActive = 0;
    this.particleSystems.forEach(system => {
      totalActive += system.getActiveCount();
    });
    
    // Scale density based on load
    const maxTotal = this.config.maxParticles;
    if (totalActive > maxTotal * 0.9) {
      // At 90% capacity, reduce density to 50%
      this.config.particleDensityScale = 0.5;
    } else if (totalActive > maxTotal * 0.7) {
      // At 70% capacity, reduce density to 75%
      this.config.particleDensityScale = 0.75;
    } else {
      // Below 70%, full density
      this.config.particleDensityScale = 1.0;
    }
  }
  
  /**
   * Register a character for impostor rendering
   * @param {THREE.Object3D} character - The character mesh
   * @param {THREE.Texture} texture - Character texture
   */
  registerCharacterForImpostors(character, texture) {
    return this.impostorRenderer.registerCharacter(character, texture, this.config.impostorDistance);
  }
  
  /**
   * Get the impostor group for adding to scene
   */
  getImpostorGroup() {
    return this.impostorRenderer.group;
  }
  
  /**
   * Get particle system statistics
   */
  getStats() {
    const stats = {
      totalSystems: this.particleSystems.size,
      totalActiveParticles: 0,
      densityScale: this.config.particleDensityScale,
      systemStats: [],
    };
    
    this.particleSystems.forEach((system, name) => {
      const activeCount = system.getActiveCount();
      stats.totalActiveParticles += activeCount;
      stats.systemStats.push({
        name,
        activeParticles: activeCount,
        maxParticles: system.maxParticles,
      });
    });
    
    return stats;
  }
  
  /**
   * Set maximum particles
   * @param {number} max - Maximum particles
   */
  setMaxParticles(max) {
    this.config.maxParticles = max;
  }
  
  /**
   * Set impostor distance threshold
   * @param {number} distance - Distance threshold
   */
  setImpostorDistance(distance) {
    this.config.impostorDistance = distance;
  }
  
  /**
   * Clear all effects
   */
  clear() {
    this.particleSystems.forEach(system => {
      system.clear();
    });
    
    this.impostorRenderer.dispose();
    this.impostorRenderer = new ImpostorRenderer(this.config.maxImpostors);
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    this.particleSystems.forEach(system => {
      system.dispose();
    });
    this.particleSystems.clear();
    
    this.impostorRenderer.dispose();
  }
}

export { EffectsOptimizer, ParticleSystem, ImpostorRenderer };
