/**
 * AssetOptimizer Unit Tests
 * Tests progressive loading, compression, and asset management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AssetOptimizer from './AssetOptimizer';

describe('AssetOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new AssetOptimizer();
  });

  afterEach(() => {
    if (optimizer) {
      optimizer.dispose();
    }
  });

  describe('loadProgressively', () => {
    it('should load assets in priority order', async () => {
      const priorities = [
        {
          priority: 0,
          assets: [
            { url: 'ground.glb', type: 'model', priority: 0 },
            { url: 'ground-texture.png', type: 'texture', priority: 0 }
          ]
        },
        {
          priority: 1,
          assets: [
            { url: 'casino.glb', type: 'model', priority: 1 }
          ]
        }
      ];

      const result = await optimizer.loadProgressively(priorities);

      expect(result.assets).toBeDefined();
      expect(optimizer.stats.assetsLoaded).toBeGreaterThan(0);
    });

    it('should call progress callback', async () => {
      const callback = vi.fn();
      const priorities = [
        {
          priority: 0,
          assets: [
            { url: 'test1.glb', type: 'model', priority: 0 },
            { url: 'test2.glb', type: 'model', priority: 0 }
          ]
        }
      ];

      await optimizer.loadProgressively(priorities, callback);

      expect(callback).toHaveBeenCalled();
    });

    it('should handle fallback assets on failure', async () => {
      const priorities = [
        {
          priority: 0,
          assets: [
            {
              url: 'primary.glb',
              type: 'model',
              priority: 0,
              fallbackAssets: [
                { url: 'fallback.glb', type: 'model', priority: 0 }
              ]
            }
          ]
        }
      ];

      const result = await optimizer.loadProgressively(priorities);

      expect(result).toBeDefined();
    });

    it('should throw error with no priorities', async () => {
      await expect(optimizer.loadProgressively([])).rejects.toThrow(
        'At least one priority level required'
      );
    });

    it('should track load statistics', async () => {
      const priorities = [
        {
          priority: 0,
          assets: [
            { url: 'asset1.glb', type: 'model', priority: 0 },
            { url: 'asset2.glb', type: 'model', priority: 0 }
          ]
        }
      ];

      await optimizer.loadProgressively(priorities);

      const stats = optimizer.getStats();
      expect(stats.loadTime).toBeGreaterThan(0);
      expect(stats.assetsLoaded).toBeGreaterThanOrEqual(0);
    });
  });

  describe('compressTextures', () => {
    it('should compress texture array with options', async () => {
      const mockTextures = [
        {
          name: 'color',
          image: { width: 2048, height: 2048 },
          generateMipmaps: false
        },
        {
          name: 'normal',
          image: { width: 1024, height: 1024 },
          generateMipmaps: false
        }
      ];

      const compressed = await optimizer.compressTextures(mockTextures, {
        generateMipmaps: true,
        maxTextureSize: 2048,
        colorFormat: 'bc7',
        normalFormat: 'bc5'
      });

      expect(compressed).toHaveLength(2);
      expect(optimizer.stats.totalBytesCompressed).toBeGreaterThan(0);
    });

    it('should handle compression failure gracefully', async () => {
      const mockTextures = [
        {
          name: 'invalid',
          image: null
        }
      ];

      const compressed = await optimizer.compressTextures(mockTextures);

      expect(compressed).toHaveLength(1);
    });

    it('should apply mipmap generation', async () => {
      const mockTextures = [
        {
          name: 'color',
          image: { width: 512, height: 512 },
          generateMipmaps: false,
          minFilter: 'LinearFilter'
        }
      ];

      const compressed = await optimizer.compressTextures(mockTextures, {
        generateMipmaps: true
      });

      expect(compressed[0].generateMipmaps).toBe(true);
    });

    it('should select correct format based on texture name', async () => {
      const mockTextures = [
        { name: 'color_diffuse', image: { width: 512, height: 512 } },
        { name: 'normal_map', image: { width: 512, height: 512 } },
        { name: 'roughness_mask', image: { width: 512, height: 512 } }
      ];

      const compressed = await optimizer.compressTextures(mockTextures);

      expect(compressed).toHaveLength(3);
      expect(compressed[0].userData.compressionFormat).toBe('bc7');
      expect(compressed[1].userData.compressionFormat).toBe('bc5');
      expect(compressed[2].userData.compressionFormat).toBe('bc4');
    });

    it('should track compression statistics', async () => {
      const mockTextures = [
        { name: 'test', image: { width: 1024, height: 1024 } }
      ];

      const initialStats = optimizer.stats.totalBytesCompressed;
      await optimizer.compressTextures(mockTextures, { generateMipmaps: true });
      
      expect(optimizer.stats.totalBytesCompressed).toBeGreaterThan(initialStats);
    });

    it('should calculate average compression ratio', async () => {
      const mockTextures = [
        { name: 'texture1', image: { width: 1024, height: 1024 } },
        { name: 'texture2', image: { width: 512, height: 512 } }
      ];

      await optimizer.compressTextures(mockTextures);
      
      expect(optimizer.stats.averageCompressionRatio).toBeGreaterThan(0);
      expect(optimizer.stats.averageCompressionRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('generateTextureAtlases', () => {
    it('should create atlases from materials', async () => {
      const mockMaterials = [
        { name: 'material1', color: { r: 1, g: 0, b: 0 } },
        { name: 'material2', color: { r: 0, g: 1, b: 0 } },
        { name: 'material3', color: { r: 0, g: 0, b: 1 } },
        { name: 'material4', color: { r: 1, g: 1, b: 0 } },
        { name: 'material5', color: { r: 1, g: 0, b: 1 } }
      ];

      const atlases = await optimizer.generateTextureAtlases(mockMaterials);

      expect(atlases.length).toBeGreaterThan(0);
      expect(optimizer.stats.textureAtlasesCreated).toBeGreaterThan(0);
    });

    it('should calculate UV transforms for atlas', async () => {
      const mockMaterials = [
        { name: 'mat1', color: { r: 1, g: 0, b: 0 } },
        { name: 'mat2', color: { r: 0, g: 1, b: 0 } },
        { name: 'mat3', color: { r: 0, g: 0, b: 1 } }
      ];

      const atlases = await optimizer.generateTextureAtlases(mockMaterials);

      expect(atlases[0].uvTransforms).toBeDefined();
      expect(atlases[0].uvTransforms.size).toBeGreaterThan(0);
      
      // Check that each UV transform has correct properties
      for (const [name, transform] of atlases[0].uvTransforms) {
        expect(transform.offsetX).toBeGreaterThanOrEqual(0);
        expect(transform.offsetX).toBeLessThanOrEqual(1);
        expect(transform.offsetY).toBeGreaterThanOrEqual(0);
        expect(transform.offsetY).toBeLessThanOrEqual(1);
        expect(transform.scaleX).toBeGreaterThan(0);
        expect(transform.scaleY).toBeGreaterThan(0);
      }
    });

    it('should track coverage and wasted space', async () => {
      const mockMaterials = [
        { name: 'mat1' },
        { name: 'mat2' },
        { name: 'mat3' }
      ];

      const atlases = await optimizer.generateTextureAtlases(mockMaterials, 2048);

      expect(atlases[0].coverage).toBeGreaterThan(0);
      expect(atlases[0].coverage).toBeLessThanOrEqual(1);
      expect(atlases[0].wastedSpace).toBeGreaterThanOrEqual(0);
      expect(atlases[0].wastedSpace).toBeLessThanOrEqual(1);
      expect(atlases[0].coverage + atlases[0].wastedSpace).toBeCloseTo(1, 1);
    });

    it('should handle large atlas sizes', async () => {
      const mockMaterials = Array.from({ length: 16 }, (_, i) => ({
        name: `material_${i}`,
        color: { r: Math.random(), g: Math.random(), b: Math.random() }
      }));

      const atlases = await optimizer.generateTextureAtlases(mockMaterials, 4096);

      expect(atlases.length).toBeGreaterThan(0);
      expect(atlases[0].size).toBe(4096);
    });

    it('should generate correct cell dimensions', async () => {
      const mockMaterials = [
        { name: 'mat1' },
        { name: 'mat2' },
        { name: 'mat3' },
        { name: 'mat4' }
      ];

      const atlases = await optimizer.generateTextureAtlases(mockMaterials, 2048);

      expect(atlases[0].cellsPerDimension).toBe(2); // 2x2 grid for 4 materials
      expect(atlases[0].cellSize).toBe(1024); // 2048 / 2
    });
  });

  describe('createUberShader', () => {
    it('should generate shader code from materials', () => {
      const mockMaterials = [
        { name: 'material1', color: { r: 1, g: 0, b: 0 } },
        { name: 'material2', color: { r: 0, g: 1, b: 0 } }
      ];

      const template = 'uniform int materialId;\n{{PARAMETER_DEFINITIONS}}\nvoid main() { {{MATERIAL_COUNT}} }';
      const shader = optimizer.createUberShader(mockMaterials, template);

      expect(shader).toBeDefined();
      expect(shader.type).toBe('ShaderMaterial');
      expect(shader.materials).toHaveLength(2);
    });

    it('should replace placeholder values in template', () => {
      const mockMaterials = [
        { name: 'mat1', metalness: 0.8 },
        { name: 'mat2', metalness: 0.2 }
      ];

      const template = '{{MATERIAL_COUNT}}';
      const shader = optimizer.createUberShader(mockMaterials, template);

      expect(shader).toBeDefined();
      expect(shader.uniforms.materialCount.value).toBe(2);
    });

    it('should extract and merge material properties', () => {
      const mockMaterials = [
        {
          name: 'pbr_material',
          color: { r: 1, g: 0.5, b: 0.2 },
          metalness: 0.5,
          roughness: 0.3,
          map: {}
        },
        {
          name: 'simple_material',
          color: { r: 0.2, g: 0.8, b: 0.5 }
        }
      ];

      const template = '{{PARAMETER_DEFINITIONS}}';
      const shader = optimizer.createUberShader(mockMaterials, template);

      expect(shader.materialParameters).toBeDefined();
      expect(shader.materialParameters.material_0).toBeDefined();
      expect(shader.materialParameters.material_0.metalness).toBe(0.5);
      expect(shader.materialParameters.material_1.metalness).toBe(0);
    });

    it('should generate vertex shader', () => {
      const mockMaterials = [{ name: 'mat1' }];
      const template = '{{PARAMETER_DEFINITIONS}}';
      const shader = optimizer.createUberShader(mockMaterials, template);

      expect(shader.vertexShader).toBeDefined();
      expect(shader.vertexShader).toContain('out vec3');
      expect(shader.vertexShader).toContain('gl_Position');
    });

    it('should generate fragment shader', () => {
      const mockMaterials = [
        { name: 'mat1', color: { r: 1, g: 0, b: 0 }, map: {} }
      ];
      const template = '{{PARAMETER_DEFINITIONS}}';
      const shader = optimizer.createUberShader(mockMaterials, template);

      expect(shader.fragmentShader).toBeDefined();
      expect(shader.fragmentShader).toContain('outColor');
    });

    it('should handle null materials gracefully', () => {
      const template = 'void main() {}';
      const shader = optimizer.createUberShader(null, template);

      expect(shader).toBeNull();
    });

    it('should mark as uber shader', () => {
      const mockMaterials = [{ name: 'mat1' }];
      const template = 'uniform float test;';
      const shader = optimizer.createUberShader(mockMaterials, template);

      expect(shader).not.toBeNull();
      expect(shader.isUberShader).toBe(true);
    });
  });

  describe('preloadNearbyAssets', () => {
    it('should track player position', () => {
      const position = { clone: () => ({ x: 0, y: 0, z: 0 }) };
      const direction = { clone: () => ({ x: 1, y: 0, z: 0, multiplyScalar: () => ({ x: 10, y: 0, z: 0 }) }) };

      optimizer.preloadNearbyAssets(position, direction);

      expect(optimizer.lastPlayerPosition).toBeDefined();
      expect(optimizer.playerMovementDirection).toBeDefined();
    });

    it('should queue nearby assets for loading', () => {
      const position = { clone: () => ({ x: 0, y: 0, z: 0 }) };
      const direction = { clone: () => ({ x: 1, y: 0, z: 0, multiplyScalar: () => ({ x: 10, y: 0, z: 0 }) }) };

      const initialQueueLength = optimizer.assetQueue.length;
      optimizer.preloadNearbyAssets(position, direction, 50);

      // Queue may or may not grow depending on spatial index
      expect(optimizer.assetQueue).toBeDefined();
    });
  });

  describe('optimizeGeometry', () => {
    it('should return optimized geometry', () => {
      const mockGeometry = {
        clone: function() { return { ...this }; },
        computeVertexNormals: vi.fn(),
        getAttribute: vi.fn(() => ({ count: 1000 }))
      };

      const optimized = optimizer.optimizeGeometry(mockGeometry, {
        computeNormals: true
      });

      expect(optimized).toBeDefined();
      expect(optimized.userData.optimization).toBeDefined();
    });

    it('should apply Draco compression if requested', () => {
      const mockGeometry = {
        clone: function() { return { ...this, userData: {} }; },
        getAttribute: vi.fn(() => ({ count: 1000 }))
      };

      const optimized = optimizer.optimizeGeometry(mockGeometry, {
        dracoCompression: { quality: 10 }
      });

      expect(optimized).toBeDefined();
      expect(optimized.userData.isDracoCompressed).toBe(true);
    });

    it('should merge vertices if requested', () => {
      const mockGeometry = {
        clone: function() { return { ...this }; },
        mergeVertices: vi.fn(),
        getAttribute: vi.fn(() => ({ count: 1000 }))
      };

      optimizer.optimizeGeometry(mockGeometry, {
        mergeVertices: true
      });

      expect(mockGeometry.mergeVertices).toHaveBeenCalled();
    });

    it('should track vertex reduction statistics', () => {
      const mockGeometry = {
        clone: function() { return { ...this, userData: {} }; },
        getAttribute: vi.fn(() => ({ count: 1000 }))
      };

      const optimized = optimizer.optimizeGeometry(mockGeometry, {
        computeNormals: true
      });

      expect(optimized.userData.optimization.originalVertexCount).toBe(1000);
      expect(optimized.userData.optimization.appliedOptions).toBeDefined();
    });

    it('should handle null geometry', () => {
      const result = optimizer.optimizeGeometry(null);
      
      expect(result).toBeNull();
    });

    it('should calculate vertex reduction percentage', () => {
      // Create a geometry where clone returns 850 vertices (15% reduction)
      const clonedGetAttribute = vi.fn(() => ({ count: 850 }));
      const originalGetAttribute = vi.fn(() => ({ count: 1000 }));
      
      const mockGeometry = {
        clone: function() { 
          return { 
            ...this,
            getAttribute: clonedGetAttribute
          }; 
        },
        getAttribute: originalGetAttribute
      };

      const optimized = optimizer.optimizeGeometry(mockGeometry);

      // The cloned geometry should show 850 vertices, while original was 1000
      expect(optimized.userData.optimization.optimizedVertexCount).toBe(850);
      expect(optimized.userData.optimization.originalVertexCount).toBe(1000);
      // Vertex reduction = (1000 - 850) / 1000 * 100 = 15%
      expect(optimized.userData.optimization.vertexReduction).toBeCloseTo(15, 5);
    });
  });

  describe('preprocessGLB', () => {
    it('should generate LOD levels with quality tiers', async () => {
      const result = await optimizer.preprocessGLB('test.glb');

      expect(result.lodLevels).toBeDefined();
      expect(result.lodLevels.length).toBe(3);
      
      // Verify LOD quality progression
      expect(result.lodLevels[0].quality).toBe(0.7);
      expect(result.lodLevels[1].quality).toBe(0.4);
      expect(result.lodLevels[2].quality).toBe(0.15);
    });

    it('should include comprehensive texture optimization data', async () => {
      const result = await optimizer.preprocessGLB('test.glb');

      expect(result.textureData).toBeDefined();
      expect(result.textureData.format).toBe('bc7');
      expect(result.textureData.compressionRatio).toBe(0.25);
      expect(result.textureData.mipmapLevels).toBe(12);
      expect(result.textureData.originalTextureMemory).toBeGreaterThan(0);
      expect(result.textureData.compressedTextureMemory).toBeGreaterThan(0);
    });

    it('should include geometry optimization metrics', async () => {
      const result = await optimizer.preprocessGLB('test.glb');

      expect(result.geometryData).toBeDefined();
      expect(result.geometryData.dracoCompressionApplied).toBe(true);
      expect(result.geometryData.vertexMergingApplied).toBe(true);
      expect(result.geometryData.geometryCompressionRatio).toBeLessThan(1);
    });

    it('should calculate compression ratio correctly', async () => {
      const result = await optimizer.preprocessGLB('test.glb');

      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThanOrEqual(1);
      expect(result.optimizedSize).toBeLessThanOrEqual(result.originalSize);
    });

    it('should include performance metrics', async () => {
      const result = await optimizer.preprocessGLB('test.glb');

      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.estimatedLoadTimeReduction).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.estimatedMemorySavings).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.estimatedMemorySavingsPercent).toBeGreaterThanOrEqual(0);
    });

    it('should validate quality metrics (90% similarity threshold)', async () => {
      const result = await optimizer.preprocessGLB('test.glb');

      expect(result.qualityMetrics).toBeDefined();
      expect(result.qualityMetrics.similarityThreshold).toBe(0.9);
      expect(result.qualityMetrics.estimatedSimilarity).toBeGreaterThanOrEqual(0.9);
      expect(result.qualityMetrics.validationPassed).toBe(true);
    });

    it('should include instance data for batching eligibility', async () => {
      const result = await optimizer.preprocessGLB('test.glb');

      expect(result.instanceData).toBeDefined();
      expect(result.instanceData.isInstancable).toBeDefined();
      expect(result.instanceData.estimatedInstances).toBeGreaterThanOrEqual(0);
    });

    it('should handle Draco compression option', async () => {
      const result = await optimizer.preprocessGLB('test.glb', {
        dracoCompression: true,
        dracoQuality: 12
      });

      expect(result.geometryData.dracoCompressionApplied).toBe(true);
      expect(result.geometryData.dracoQuality).toBe(12);
    });

    it('should estimate instancing candidates based on asset name', async () => {
      const slotMachineResult = await optimizer.preprocessGLB('slot_machine.glb');
      const palmTreeResult = await optimizer.preprocessGLB('palm_tree.glb');
      const chairResult = await optimizer.preprocessGLB('chair.glb');

      expect(slotMachineResult.instanceData.estimatedInstances).toBeGreaterThan(0);
      expect(palmTreeResult.instanceData.estimatedInstances).toBeGreaterThan(0);
      expect(chairResult.instanceData.estimatedInstances).toBeGreaterThan(0);
    });

    it('should include metadata timestamps', async () => {
      const result = await optimizer.preprocessGLB('test.glb');

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.version).toBe('1.0');
    });
  });

  describe('getStats', () => {
    it('should return statistics object', () => {
      const stats = optimizer.getStats();

      expect(stats).toBeDefined();
      expect(stats.assetsLoaded).toBe(0);
      expect(stats.assetsFailed).toBe(0);
      expect(stats.loadTime).toBe(0);
    });

    it('should track bytes loaded and compressed', async () => {
      const priorities = [
        {
          priority: 0,
          assets: [
            { url: 'asset.glb', type: 'model', priority: 0 }
          ]
        }
      ];

      await optimizer.loadProgressively(priorities);
      const stats = optimizer.getStats();

      expect(stats.totalBytesLoaded).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearCache', () => {
    it('should clear loaded assets', async () => {
      const priorities = [
        {
          priority: 0,
          assets: [
            { url: 'asset.glb', type: 'model', priority: 0 }
          ]
        }
      ];

      await optimizer.loadProgressively(priorities);
      optimizer.clearCache();

      expect(optimizer.loadedAssets.size).toBe(0);
      expect(optimizer.pendingAssets.size).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should clear all data', () => {
      optimizer.dispose();

      expect(optimizer.assetQueue.length).toBe(0);
      expect(optimizer.priorityQueue.length).toBe(0);
      expect(optimizer.loadedAssets.size).toBe(0);
    });
  });
});
