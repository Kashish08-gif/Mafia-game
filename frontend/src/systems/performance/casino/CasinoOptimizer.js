/**
 * CasinoOptimizer.js
 * 
 * Casino scene-specific optimizations:
 * - Casino asset mapping for slot machines, palm trees, furniture identification
 * - Casino-specific LOD distances and instance grouping rules
 * - Casino building occlusion geometry setup for occlusion culling
 * 
 * Requirements: 4.2, 3.2
 */

import * as THREE from 'three';

/**
 * Casino Asset Mapper - Identifies and maps casino objects
 */
class CasinoAssetMapper {
  constructor() {
    // Asset type patterns for identification
    this.assetPatterns = {
      slotMachine: ['slot', 'machine', 'slots', 'game_machine'],
      palmTree: ['palm', 'tree', 'foliage', 'vegetation'],
      furniture: ['chair', 'table', 'sofa', 'couch', 'bench', 'stool', 'desk'],
      bar: ['bar', 'counter', 'bartender', 'drinks'],
      blackjackTable: ['blackjack', 'table', 'card', 'dealer'],
      roulette: ['roulette', 'wheel', 'spinner'],
      building: ['casino', 'building', 'structure', 'wall', 'floor', 'roof'],
      light: ['light', 'lamp', 'chandelier', 'bulb', 'neon'],
      decoration: ['decoration', 'decor', 'ornament', 'sculpture'],
    };
    
    // LOD configuration per asset type
    this.lodConfig = {
      slotMachine: {
        distances: [20, 40, 80],
        quality: 'high',
        canInstance: true,
        minInstances: 6,
      },
      palmTree: {
        distances: [25, 50, 100],
        quality: 'medium',
        canInstance: true,
        minInstances: 3,
      },
      furniture: {
        distances: [15, 30, 60],
        quality: 'medium',
        canInstance: true,
        minInstances: 3,
      },
      bar: {
        distances: [10, 25, 50],
        quality: 'high',
        canInstance: false,
        minInstances: 1,
      },
      blackjackTable: {
        distances: [15, 30, 60],
        quality: 'high',
        canInstance: false,
        minInstances: 1,
      },
      roulette: {
        distances: [15, 30, 60],
        quality: 'high',
        canInstance: false,
        minInstances: 1,
      },
      building: {
        distances: [50, 150, 300],
        quality: 'high',
        canInstance: false,
        minInstances: 1,
      },
      light: {
        distances: [20, 50, 100],
        quality: 'medium',
        canInstance: true,
        minInstances: 5,
      },
      decoration: {
        distances: [15, 40, 80],
        quality: 'medium',
        canInstance: true,
        minInstances: 3,
      },
      default: {
        distances: [25, 50, 100],
        quality: 'medium',
        canInstance: true,
        minInstances: 3,
      },
    };
    
    this.assetMap = new Map();
    this.assetsByType = new Map();
  }
  
  /**
   * Identify asset type from name
   */
  identifyAssetType(name) {
    const lowerName = name.toLowerCase();
    
    for (const [type, patterns] of Object.entries(this.assetPatterns)) {
      for (const pattern of patterns) {
        if (lowerName.includes(pattern)) {
          return type;
        }
      }
    }
    
    return 'default';
  }
  
  /**
   * Scan scene and map all casino assets
   */
  scanScene(scene) {
    const assets = [];
    
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      
      const type = this.identifyAssetType(obj.name);
      const asset = {
        name: obj.name,
        type,
        mesh: obj,
        position: obj.position.clone(),
        geometry: obj.geometry,
        config: this.lodConfig[type] || this.lodConfig.default,
      };
      
      assets.push(asset);
      this.assetMap.set(obj.uuid, asset);
      
      // Group by type
      if (!this.assetsByType.has(type)) {
        this.assetsByType.set(type, []);
      }
      this.assetsByType.get(type).push(asset);
    });
    
    console.log(`[CasinoAssetMapper] Scanned ${assets.length} assets`);
    this.printAssetSummary();
    
    return assets;
  }
  
  /**
   * Get LOD configuration for asset type
   */
  getLODConfig(assetType) {
    return this.lodConfig[assetType] || this.lodConfig.default;
  }
  
  /**
   * Get assets by type
   */
  getAssetsByType(type) {
    return this.assetsByType.get(type) || [];
  }
  
  /**
   * Get all assets
   */
  getAllAssets() {
    return Array.from(this.assetMap.values());
  }
  
  /**
   * Print asset mapping summary
   */
  printAssetSummary() {
    console.group('[CasinoAssetMapper] Asset Summary');
    for (const [type, assets] of this.assetsByType.entries()) {
      console.log(`${type}: ${assets.length} objects`);
    }
    console.groupEnd();
  }
}

/**
 * Occlusion Geometry Manager - Creates occlusion geometry for casino building
 */
class OcclusionGeometryManager {
  constructor() {
    this.occlusionGeometries = new Map();
    this.occlusionMeshes = new Map();
  }
  
  /**
   * Create occlusion geometry for casino building
   */
  createBuildingOcclusion(buildingMesh) {
    if (!buildingMesh) return null;
    
    console.log('[OcclusionGeometryManager] Creating building occlusion geometry');
    
    // Create simplified geometry (box approximation for performance)
    const boundingBox = new THREE.Box3().setFromObject(buildingMesh);
    const size = boundingBox.getSize(new THREE.Vector3());
    const center = boundingBox.getCenter(new THREE.Vector3());
    
    const occlusionGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const occlusionMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      colorWrite: false,
    });
    
    const occlusionMesh = new THREE.Mesh(occlusionGeometry, occlusionMaterial);
    occlusionMesh.position.copy(center);
    occlusionMesh.name = `${buildingMesh.name}_occlusion`;
    
    this.occlusionGeometries.set(buildingMesh.uuid, occlusionGeometry);
    this.occlusionMeshes.set(buildingMesh.uuid, occlusionMesh);
    
    console.log(`[OcclusionGeometryManager] Created occlusion mesh: ${occlusionMesh.name}`);
    
    return occlusionMesh;
  }
  
  /**
   * Create occlusion geometries for multiple objects
   */
  createOcclusionGroup(meshes) {
    const occlusionGroup = new THREE.Group();
    occlusionGroup.name = 'occlusion_group';
    
    meshes.forEach(mesh => {
      const occlusionMesh = this.createBuildingOcclusion(mesh);
      if (occlusionMesh) {
        occlusionGroup.add(occlusionMesh);
      }
    });
    
    return occlusionGroup;
  }
  
  /**
   * Get occlusion mesh for building
   */
  getOcclusionMesh(buildingUUID) {
    return this.occlusionMeshes.get(buildingUUID);
  }
  
  /**
   * Dispose occlusion geometry
   */
  dispose() {
    this.occlusionGeometries.forEach(geometry => {
      geometry.dispose();
    });
    this.occlusionGeometries.clear();
    this.occlusionMeshes.clear();
  }
}

/**
 * CasinoOptimizer - Main casino-specific optimization manager
 */
class CasinoOptimizer {
  constructor(performanceSystem) {
    this.performanceSystem = performanceSystem;
    this.assetMapper = new CasinoAssetMapper();
    this.occlusionManager = new OcclusionGeometryManager();
    this.optimizedAssets = [];
    this.isOptimized = false;
  }
  
  /**
   * Apply casino-specific optimizations to scene
   */
  optimizeCasinoScene(scene) {
    console.log('[CasinoOptimizer] Starting casino scene optimization');
    
    try {
      // Scan and map all assets
      const assets = this.assetMapper.scanScene(scene);
      this.optimizedAssets = assets;
      
      // Apply LOD configurations
      this.applyLODConfigurations();
      
      // Set up occlusion culling for building
      this.setupOcclusionCulling(scene);
      
      // Apply instancing rules
      this.applyInstanceGrouping();
      
      this.isOptimized = true;
      console.log('[CasinoOptimizer] Casino scene optimization complete');
    } catch (error) {
      console.error('[CasinoOptimizer] Optimization error:', error);
    }
  }
  
  /**
   * Apply LOD configurations for each asset
   */
  applyLODConfigurations() {
    console.log('[CasinoOptimizer] Applying LOD configurations');
    
    for (const [type, assets] of this.assetMapper.assetsByType.entries()) {
      const config = this.assetMapper.getLODConfig(type);
      
      console.log(`[CasinoOptimizer] Configuring ${type}: ${assets.length} objects (distances: ${config.distances.join(', ')})`);
      
      // Register with LOD manager
      if (this.performanceSystem && this.performanceSystem.managers.lod) {
        const meshes = assets.map(asset => asset.mesh);
        this.performanceSystem.managers.lod.registerLODGroup(meshes, config.distances);
      }
    }
  }
  
  /**
   * Set up occlusion culling for casino building
   */
  setupOcclusionCulling(scene) {
    console.log('[CasinoOptimizer] Setting up occlusion culling');
    
    // Find main casino building
    let buildingMesh = null;
    scene.traverse((obj) => {
      if (!buildingMesh && obj.isMesh && obj.name.toLowerCase().includes('casino')) {
        buildingMesh = obj;
      }
    });
    
    if (buildingMesh) {
      // Create occlusion geometry
      const occlusionMesh = this.occlusionManager.createBuildingOcclusion(buildingMesh);
      
      if (occlusionMesh) {
        // Add to scene (invisible, for occlusion testing)
        scene.add(occlusionMesh);
        
        // Register with culling system
        if (this.performanceSystem && this.performanceSystem.managers.culling) {
          this.performanceSystem.managers.culling.addOcclusionTarget(occlusionMesh);
        }
      }
    } else {
      console.warn('[CasinoOptimizer] Casino building mesh not found');
    }
  }
  
  /**
   * Apply instance grouping rules
   */
  applyInstanceGrouping() {
    console.log('[CasinoOptimizer] Applying instance grouping rules');
    
    // Group assets by type for instancing
    for (const [type, assets] of this.assetMapper.assetsByType.entries()) {
      const config = this.assetMapper.getLODConfig(type);
      
      if (config.canInstance && assets.length >= config.minInstances) {
        const meshes = assets.map(asset => asset.mesh);
        
        console.log(`[CasinoOptimizer] Batching ${type}: ${meshes.length} instances`);
        
        // Register with instancing manager
        if (this.performanceSystem && this.performanceSystem.managers.instancing) {
          this.performanceSystem.managers.instancing.registerMeshes(meshes, 1);
        }
      }
    }
  }
  
  /**
   * Get optimization stats
   */
  getStats() {
    return {
      totalAssets: this.optimizedAssets.length,
      assetsByType: Object.fromEntries(
        Array.from(this.assetMapper.assetsByType.entries()).map(([type, assets]) => [type, assets.length])
      ),
      isOptimized: this.isOptimized,
    };
  }
  
  /**
   * Print optimization stats
   */
  printStats() {
    const stats = this.getStats();
    console.group('[CasinoOptimizer] Optimization Stats');
    console.table(stats.assetsByType);
    console.log('Total Assets:', stats.totalAssets);
    console.log('Optimized:', stats.isOptimized);
    console.groupEnd();
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    this.occlusionManager.dispose();
    this.optimizedAssets = [];
  }
}

export { CasinoOptimizer, CasinoAssetMapper, OcclusionGeometryManager };
