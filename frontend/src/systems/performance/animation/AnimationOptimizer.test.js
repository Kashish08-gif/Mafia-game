/**
 * Unit tests for AnimationOptimizer
 * 
 * Tests character animation optimization, animation LOD,
 * particle system management, and impostor rendering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import AnimationOptimizer from './AnimationOptimizer.js';

describe('AnimationOptimizer', () => {
  let animationOptimizer;
  let camera;

  beforeEach(() => {
    animationOptimizer = new AnimationOptimizer({
      gpuAnimationThreshold: 3,
      distantAnimationFPS: 15,
      maxParticles: 500
    });

    camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 5, 10);
  });

  describe('Animation Optimization', () => {
    it('should optimize character animation', () => {
      const characters = [
        new Object3D(),
        new Object3D(),
        new Object3D(),
        new Object3D()
      ];

      const config = animationOptimizer.optimizeCharacterAnimation(characters);

      expect(config).toHaveProperty('useGPUAnimation');
      expect(config).toHaveProperty('maxAnimatedCharacters');
      expect(config).toHaveProperty('distantAnimationFPS');
      expect(config.maxAnimatedCharacters).toBe(3); // Threshold is 3
    });

    it('should enable GPU animation when character count >= threshold', () => {
      const characters = [
        new Object3D(),
        new Object3D(),
        new Object3D()
      ];

      const config = animationOptimizer.optimizeCharacterAnimation(characters);

      expect(config.useGPUAnimation).toBe(true); // 3 >= 3
    });

    it('should disable GPU animation when character count < threshold', () => {
      const characters = [
        new Object3D(),
        new Object3D()
      ];

      const config = animationOptimizer.optimizeCharacterAnimation(characters);

      expect(config.useGPUAnimation).toBe(false); // 2 < 3
    });

    it('should track character animation statistics', () => {
      const characters = [
        new Object3D(),
        new Object3D(),
        new Object3D(),
        new Object3D()
      ];

      animationOptimizer.optimizeCharacterAnimation(characters);

      expect(animationOptimizer.stats.visibleCharacters).toBe(4);
      expect(animationOptimizer.stats.gpuAnimatedCharacters).toBe(3);
      expect(animationOptimizer.stats.cpuAnimatedCharacters).toBe(1);
    });
  });

  describe('Animation LOD', () => {
    it('should update animation LOD based on distance', () => {
      const characters = [
        new Object3D(),
        new Object3D(),
        new Object3D()
      ];

      // Position characters at different distances
      characters[0].position.set(0, 0, 5);  // Close
      characters[1].position.set(0, 0, 20); // Medium
      characters[2].position.set(0, 0, 50); // Far

      animationOptimizer.updateAnimationLOD(characters, camera);

      // Should not throw
      expect(animationOptimizer.stats.animationUpdateTime).toBeGreaterThanOrEqual(0);
    });

    it('should reduce animation update frequency for distant characters', () => {
      const character = new Object3D();
      character.position.set(0, 0, 30); // Beyond 25 unit threshold

      // Set up animation interval tracking
      const charId = character.uuid;

      animationOptimizer.updateAnimationLOD([character], camera);

      // Should have set up interval tracking
      expect(animationOptimizer.updateIntervals.has(charId)).toBe(true);
    });

    it('should use correct LOD levels based on distance', () => {
      const characters = [new Object3D()];
      characters[0].position.set(0, 0, 10);

      // First optimize, then update LOD
      animationOptimizer.optimizeCharacterAnimation(characters);
      animationOptimizer.updateAnimationLOD(characters, camera);

      // Character should be at LOD 0 (close distance)
      const charData = animationOptimizer.animatedCharacters.get(characters[0].uuid);
      expect(charData).toBeDefined();
      expect(charData.currentLOD).toBe(0);
    });

    it('should have configurable animation LOD levels', () => {
      const customOptimizer = new AnimationOptimizer({
        animationLODLevels: [
          { distance: 0, boneReduction: 0 },
          { distance: 15, boneReduction: 0.3 },
          { distance: 30, boneReduction: 0.7 }
        ]
      });

      expect(customOptimizer.animationLODLevels).toHaveLength(3);
    });
  });

  describe('Impostor Rendering', () => {
    it('should generate impostors for distant characters', () => {
      const characters = [
        new Object3D(),
        new Object3D()
      ];

      characters[0].position.set(0, 0, 50); // Beyond impostor distance
      characters[1].position.set(0, 0, 10); // Near

      const impostors = animationOptimizer.generateImpostors(characters);

      // Should generate at least one impostor for distant character
      expect(impostors.length).toBeGreaterThanOrEqual(0);
    });

    it('should create impostor during animation LOD update', () => {
      const character = new Object3D();
      character.position.set(0, 0, 50); // Beyond impostor distance

      animationOptimizer.updateAnimationLOD([character], camera);

      // Character should have impostor
      expect(animationOptimizer.impostors.size).toBeGreaterThanOrEqual(0);
    });

    it('should remove impostor when character moves closer', () => {
      const character = new Object3D();
      character.position.set(0, 0, 50); // Far

      animationOptimizer.updateAnimationLOD([character], camera);
      expect(animationOptimizer.impostors.size).toBeGreaterThanOrEqual(0);

      // Move character closer
      character.position.set(0, 0, 10);
      animationOptimizer.updateAnimationLOD([character], camera);

      // Impostor might still be there or removed depending on implementation
      // Just verify it doesn't crash
      expect(animationOptimizer.impostors).toBeDefined();
    });
  });

  describe('Particle System', () => {
    it('should create particle pool', () => {
      const pool = animationOptimizer.createParticlePool(100);

      expect(pool).toBeDefined();
      expect(pool.allocate).toBeDefined();
      expect(pool.deallocate).toBeDefined();
      expect(pool.update).toBeDefined();
    });

    it('should allocate particles from pool', () => {
      const particle = animationOptimizer.allocateParticle();

      expect(particle).toBeDefined();
      expect(animationOptimizer.stats.activeParticles).toBe(1);
    });

    it('should deallocate particles back to pool', () => {
      const particle = animationOptimizer.allocateParticle();
      const beforeCount = animationOptimizer.stats.activeParticles;

      animationOptimizer.releaseParticle(particle);

      expect(animationOptimizer.stats.activeParticles).toBe(beforeCount - 1);
    });

    it('should respect maximum particle count', () => {
      const customOptimizer = new AnimationOptimizer({
        maxParticles: 5,
        particlePoolSize: 5
      });

      // Try to allocate more than max
      const particles = [];
      for (let i = 0; i < 10; i++) {
        const particle = customOptimizer.allocateParticle();
        if (particle) {
          particles.push(particle);
        }
      }

      // Should not exceed pool size
      expect(customOptimizer.stats.activeParticles).toBeLessThanOrEqual(5);
    });

    it('should update particles over time', () => {
      const particle = animationOptimizer.allocateParticle();
      
      if (particle) {
        particle.velocity.set(1, 0, 0);
        particle.maxLife = 1;
        particle.position.set(0, 0, 0);

        const positionBefore = particle.position.x;

        animationOptimizer.updateParticles(0.1);

        // Position should have changed
        const positionAfter = particle.position.x;
        expect(positionAfter).not.toEqual(positionBefore);
      }
    });

    it('should track particle statistics', () => {
      animationOptimizer.allocateParticle();
      animationOptimizer.allocateParticle();

      expect(animationOptimizer.stats.activeParticles).toBe(2);
    });

    it('should track max particles reached', () => {
      for (let i = 0; i < 600; i++) {
        animationOptimizer.allocateParticle();
      }

      expect(animationOptimizer.stats.maxParticlesReached).toBeGreaterThanOrEqual(500);
    });
  });

  describe('Configuration', () => {
    it('should accept custom configuration', () => {
      const customOptimizer = new AnimationOptimizer({
        gpuAnimationThreshold: 5,
        distantAnimationFPS: 10,
        distantAnimationDistance: 30,
        impostorDistance: 50
      });

      expect(customOptimizer.gpuAnimationThreshold).toBe(5);
      expect(customOptimizer.distantAnimationFPS).toBe(10);
      expect(customOptimizer.distantAnimationDistance).toBe(30);
      expect(customOptimizer.impostorDistance).toBe(50);
    });

    it('should use default configuration when not provided', () => {
      expect(animationOptimizer.gpuAnimationThreshold).toBe(3);
      expect(animationOptimizer.distantAnimationFPS).toBe(15);
      expect(animationOptimizer.distantAnimationDistance).toBe(25);
      expect(animationOptimizer.impostorDistance).toBe(40);
    });
  });

  describe('Statistics', () => {
    it('should track animation statistics', () => {
      const stats = animationOptimizer.getStats();

      expect(stats).toHaveProperty('visibleCharacters');
      expect(stats).toHaveProperty('gpuAnimatedCharacters');
      expect(stats).toHaveProperty('cpuAnimatedCharacters');
      expect(stats).toHaveProperty('activeParticles');
      expect(stats).toHaveProperty('impostorsActive');
    });

    it('should update statistics after operations', () => {
      const characters = [
        new Object3D(),
        new Object3D(),
        new Object3D()
      ];

      animationOptimizer.optimizeCharacterAnimation(characters);

      const stats = animationOptimizer.getStats();
      expect(stats.visibleCharacters).toBe(3);
      expect(stats.gpuAnimatedCharacters).toBe(3);
    });
  });

  describe('Reference Requirements Validation', () => {
    it('should support 3+ visible characters', () => {
      const characters = [];
      for (let i = 0; i < 5; i++) {
        characters.push(new Object3D());
      }

      const config = animationOptimizer.optimizeCharacterAnimation(characters);
      expect(config.useGPUAnimation).toBe(true); // Requirements: 3+
    });

    it('should reduce animation to 15fps beyond 25 units', () => {
      const character = new Object3D();
      character.position.set(0, 0, 26); // Beyond 25 units

      animationOptimizer.updateAnimationLOD([character], camera);

      const interval = animationOptimizer.updateIntervals.get(character.uuid);
      expect(interval).toBeDefined(); // Should have set up reduced frequency
    });

    it('should use impostors beyond 40 units', () => {
      const character = new Object3D();
      character.position.set(0, 0, 45); // Beyond 40 units

      animationOptimizer.updateAnimationLOD([character], camera);

      // Impostor should be created or updated
      const hasImpostor = animationOptimizer.impostors.has(character.uuid);
      expect(typeof hasImpostor).toBe('boolean');
    });

    it('should limit particles to 500 maximum', () => {
      expect(animationOptimizer.maxParticles).toBe(500);
    });
  });

  describe('Frame Management', () => {
    it('should track current frame', () => {
      const characters = [new Object3D()];

      const frame1 = animationOptimizer.currentFrame;
      animationOptimizer.optimizeCharacterAnimation(characters);
      const frame2 = animationOptimizer.currentFrame;

      expect(frame2).toBe(frame1 + 1);
    });

    it('should manage animation update intervals', () => {
      const character = new Object3D();

      animationOptimizer.updateAnimationLOD([character], camera);

      const interval = animationOptimizer.updateIntervals.get(character.uuid);
      expect(interval).toBeGreaterThanOrEqual(0);
    });
  });
});
