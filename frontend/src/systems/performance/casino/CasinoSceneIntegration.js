/**
 * CasinoSceneIntegration.js
 * 
 * Real-world casino scene integration with performance optimization:
 * - Integration with existing casino GLB models in /public/models/casino/
 * - Configuration for grand_casino.glb main building
 * - Instance setup for slot machines, palm trees, furniture
 * - Testing with actual 38MB asset sizes
 * 
 * Requirements: 2.1, 4.1, 5.1
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

/**
 * CasinoAssetLibrary - Manages casino asset paths and metadata
 */
class CasinoAssetLibrary {
  constructor() {
    this.basePath = '/models/casino/';
    this.assets = {
      mainBuilding: {
        path: 'grand_casino.glb',
        size: '38MB',
        lod: [50, 150, 300],
        instancing: false,
        cacheBust: true,
      },
      slotMachines: {
        path: 'casion_slot-machine.glb',
        size: '5MB',
        lod: [20, 40, 80],
        instancing: true,
        minInstances: 6,
        maxInstances: 50,
      },
      palmTrees: {
        path: 'plant_series__palm_tree.glb',
        size: '2MB',
        lod: [25, 50, 100],
        instancing: true,
        minInstances: 3,
        maxInstances: 20,
      },
      furniture: {
        path: 'table_sofa.glb',
        size: '1.5MB',
        lod: [15, 30, 60],
        instancing: true,
        minInstances: 3,
        maxInstances: 30,
      },
      bar: {
        path: 'bar.glb',
        size: '3MB',
        lod: [10, 25, 50],
        instancing: false,
      },
      blackjackTable: {
        path: 'black_jack_table.glb',
        size: '4MB',
        lod: [15, 30, 60],
        instancing: false,
      },
      fountain: {
        path: 'fountain_water_simulation.glb',
        size: '6MB',
        lod: [20, 50, 100],
        instancing: false,
      },
    };
    
    this.loadedAssets = new Map();
  }
  
  /**
   * Get asset metadata
   */
  getAsset(assetName) {
    return this.assets[assetName];
  }
  
  /**
   * Get full asset path
   */
  getAssetPath(assetName) {
    const asset = this.assets[assetName];
    if (!asset) return null;
    return this.basePath + asset.path;
  }
  
  /**
   * Cache loaded asset
   */
  cacheAsset(assetName, model) {
    this.loadedAssets.set(assetName, model);
  }
  
  /**
   * Get cached asset
   */
  getCachedAsset(assetName) {
    return this.loadedAssets.get(assetName);
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.loadedAssets.clear();
  }
}

/**
 * CasinoSceneIntegration - Main integration manager
 */
class CasinoSceneIntegration {
  constructor(performanceSystem, scene) {
    this.performanceSystem = performanceSystem;
    this.scene = scene;
    this.assetLibrary = new CasinoAssetLibrary();
    this.loader = this.initializeLoader();
    this.loadedModels = [];
    this.instanceGroups = [];
    this.isIntegrated = false;
    this.loadStartTime = 0;
  }
  
  /**
   * Initialize GLTF loader with Draco support
   */
  initializeLoader() {
    const loader = new GLTFLoader();
    
    // Setup Draco decompression
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);
    
    console.log('[CasinoSceneIntegration] GLTF Loader initialized with Draco support');
    return loader;
  }
  
  /**
   * Load casino assets into scene
   */
  async loadCasinoAssets() {
    console.log('[CasinoSceneIntegration] Loading casino assets...');
    this.loadStartTime = performance.now();
    
    try {
      // Load main building
      await this.loadMainBuilding();
      
      // Load and instance repeated objects
      await this.loadAndInstanceSlotMachines();
      await this.loadAndInstancePalmTrees();
      await this.loadAndInstanceFurniture();
      
      // Load other assets
      await this.loadBar();
      await this.loadBlackjackTables();
      await this.loadFountain();
      
      const loadTime = performance.now() - this.loadStartTime;
      console.log(`[CasinoSceneIntegration] Assets loaded in ${loadTime.toFixed(0)}ms`);
      
      return {
        success: true,
        loadTime,
        assetsLoaded: this.loadedModels.length,
        instancesCreated: this.instanceGroups.length,
      };
    } catch (error) {
      console.error('[CasinoSceneIntegration] Asset loading error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Load main casino building
   */
  async loadMainBuilding() {
    console.log('[CasinoSceneIntegration] Loading main casino building...');
    
    return new Promise((resolve, reject) => {
      const path = this.assetLibrary.getAssetPath('mainBuilding');
      const asset = this.assetLibrary.getAsset('mainBuilding');
      
      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          model.name = 'grand_casino_main';
          model.scale.set(1, 1, 1);
          
          // Register with performance system
          if (this.performanceSystem) {
            this.performanceSystem.registerLODGroup([model], asset.lod);
          }
          
          this.scene.add(model);
          this.loadedModels.push(model);
          this.assetLibrary.cacheAsset('mainBuilding', model);
          
          console.log('[CasinoSceneIntegration] Main building loaded');
          resolve(model);
        },
        (progress) => {
          const percentComplete = (progress.loaded / progress.total) * 100;
          console.log(`[CasinoSceneIntegration] Building loading: ${percentComplete.toFixed(0)}%`);
        },
        reject
      );
    });
  }
  
  /**
   * Load and instance slot machines
   */
  async loadAndInstanceSlotMachines() {
    console.log('[CasinoSceneIntegration] Loading slot machines...');
    
    return new Promise((resolve, reject) => {
      const path = this.assetLibrary.getAssetPath('slotMachines');
      const asset = this.assetLibrary.getAsset('slotMachines');
      
      this.loader.load(
        path,
        (gltf) => {
          const templateMesh = gltf.scene;
          const meshes = [];
          
          // Create 20 instances of slot machines in grid pattern
          const gridSize = 5; // 5x4 grid
          const spacing = 3;
          
          for (let i = 0; i < 20; i++) {
            const clone = templateMesh.clone();
            const x = (i % gridSize) * spacing;
            const z = Math.floor(i / gridSize) * spacing;
            
            clone.position.set(x - (gridSize * spacing) / 2, 0, z - 10);
            clone.name = `slot_machine_${i}`;
            
            this.scene.add(clone);
            meshes.push(clone);
            this.loadedModels.push(clone);
          }
          
          // Register with performance system
          if (this.performanceSystem) {
            this.performanceSystem.registerForInstancing(meshes, 1);
            this.performanceSystem.registerLODGroup(meshes, asset.lod);
          }
          
          this.instanceGroups.push({
            name: 'slot_machines',
            meshes,
            count: meshes.length,
          });
          
          console.log(`[CasinoSceneIntegration] Loaded ${meshes.length} slot machines`);
          resolve(meshes);
        },
        null,
        reject
      );
    });
  }
  
  /**
   * Load and instance palm trees
   */
  async loadAndInstancePalmTrees() {
    console.log('[CasinoSceneIntegration] Loading palm trees...');
    
    return new Promise((resolve, reject) => {
      const path = this.assetLibrary.getAssetPath('palmTrees');
      const asset = this.assetLibrary.getAsset('palmTrees');
      
      this.loader.load(
        path,
        (gltf) => {
          const templateMesh = gltf.scene;
          const meshes = [];
          
          // Create 15 instances of palm trees scattered around
          for (let i = 0; i < 15; i++) {
            const clone = templateMesh.clone();
            const angle = (i / 15) * Math.PI * 2;
            const radius = 30;
            
            clone.position.set(
              Math.cos(angle) * radius,
              0,
              Math.sin(angle) * radius
            );
            clone.name = `palm_tree_${i}`;
            
            this.scene.add(clone);
            meshes.push(clone);
            this.loadedModels.push(clone);
          }
          
          // Register with performance system
          if (this.performanceSystem) {
            this.performanceSystem.registerForInstancing(meshes, 1);
            this.performanceSystem.registerLODGroup(meshes, asset.lod);
          }
          
          this.instanceGroups.push({
            name: 'palm_trees',
            meshes,
            count: meshes.length,
          });
          
          console.log(`[CasinoSceneIntegration] Loaded ${meshes.length} palm trees`);
          resolve(meshes);
        },
        null,
        reject
      );
    });
  }
  
  /**
   * Load and instance furniture
   */
  async loadAndInstanceFurniture() {
    console.log('[CasinoSceneIntegration] Loading furniture...');
    
    return new Promise((resolve, reject) => {
      const path = this.assetLibrary.getAssetPath('furniture');
      const asset = this.assetLibrary.getAsset('furniture');
      
      this.loader.load(
        path,
        (gltf) => {
          const templateMesh = gltf.scene;
          const meshes = [];
          
          // Create 25 instances of furniture
          for (let i = 0; i < 25; i++) {
            const clone = templateMesh.clone();
            const x = Math.random() * 60 - 30;
            const z = Math.random() * 60 - 30;
            
            clone.position.set(x, 0, z);
            clone.rotation.y = Math.random() * Math.PI * 2;
            clone.name = `furniture_${i}`;
            
            this.scene.add(clone);
            meshes.push(clone);
            this.loadedModels.push(clone);
          }
          
          // Register with performance system
          if (this.performanceSystem) {
            this.performanceSystem.registerForInstancing(meshes, 1);
            this.performanceSystem.registerLODGroup(meshes, asset.lod);
          }
          
          this.instanceGroups.push({
            name: 'furniture',
            meshes,
            count: meshes.length,
          });
          
          console.log(`[CasinoSceneIntegration] Loaded ${meshes.length} furniture items`);
          resolve(meshes);
        },
        null,
        reject
      );
    });
  }
  
  /**
   * Load bar
   */
  async loadBar() {
    console.log('[CasinoSceneIntegration] Loading bar...');
    
    return new Promise((resolve, reject) => {
      const path = this.assetLibrary.getAssetPath('bar');
      
      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(0, 0, -20);
          model.name = 'bar';
          
          this.scene.add(model);
          this.loadedModels.push(model);
          
          console.log('[CasinoSceneIntegration] Bar loaded');
          resolve(model);
        },
        null,
        reject
      );
    });
  }
  
  /**
   * Load blackjack tables
   */
  async loadBlackjackTables() {
    console.log('[CasinoSceneIntegration] Loading blackjack tables...');
    
    return new Promise((resolve, reject) => {
      const path = this.assetLibrary.getAssetPath('blackjackTable');
      
      this.loader.load(
        path,
        (gltf) => {
          const templateMesh = gltf.scene;
          const meshes = [];
          
          // Create 5 blackjack tables
          for (let i = 0; i < 5; i++) {
            const clone = templateMesh.clone();
            clone.position.set(i * 5, 0, 10);
            clone.name = `blackjack_table_${i}`;
            
            this.scene.add(clone);
            meshes.push(clone);
            this.loadedModels.push(clone);
          }
          
          console.log(`[CasinoSceneIntegration] Loaded ${meshes.length} blackjack tables`);
          resolve(meshes);
        },
        null,
        reject
      );
    });
  }
  
  /**
   * Load fountain
   */
  async loadFountain() {
    console.log('[CasinoSceneIntegration] Loading fountain...');
    
    return new Promise((resolve, reject) => {
      const path = this.assetLibrary.getAssetPath('fountain');
      
      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(0, 0, 0);
          model.scale.set(1.5, 1.5, 1.5);
          model.name = 'fountain';
          
          this.scene.add(model);
          this.loadedModels.push(model);
          
          console.log('[CasinoSceneIntegration] Fountain loaded');
          resolve(model);
        },
        null,
        reject
      );
    });
  }
  
  /**
   * Get integration statistics
   */
  getStats() {
    const totalAssets = this.loadedModels.length;
    const totalInstances = this.instanceGroups.reduce((sum, group) => sum + group.count, 0);
    const totalTris = this.calculateTotalTriangles();
    
    return {
      assetsLoaded: totalAssets,
      instanceGroupCount: this.instanceGroups.length,
      totalInstances,
      totalTriangles: totalTris,
      estimatedVRAM: (totalTris * 6 / 1024 / 1024).toFixed(1), // Rough estimate: 6 bytes per vertex
      instanceGroups: this.instanceGroups,
    };
  }
  
  /**
   * Calculate total triangles in loaded models
   */
  calculateTotalTriangles() {
    let totalTris = 0;
    
    this.loadedModels.forEach(model => {
      model.traverse(obj => {
        if (obj.isMesh && obj.geometry) {
          const indexCount = obj.geometry.index ? obj.geometry.index.count : obj.geometry.attributes.position.count;
          totalTris += indexCount / 3;
        }
      });
    });
    
    return Math.round(totalTris);
  }
  
  /**
   * Print integration report
   */
  printReport() {
    const stats = this.getStats();
    console.group('[CasinoSceneIntegration] Integration Report');
    console.log('Assets Loaded:', stats.assetsLoaded);
    console.log('Instance Groups:', stats.instanceGroupCount);
    console.log('Total Instances:', stats.totalInstances);
    console.log('Total Triangles:', stats.totalTriangles);
    console.log('Estimated VRAM:', stats.estimatedVRAM, 'MB');
    console.table(stats.instanceGroups);
    console.groupEnd();
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    this.loadedModels.forEach(model => {
      this.scene.remove(model);
      model.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    });
    
    this.loadedModels = [];
    this.instanceGroups = [];
    this.assetLibrary.clearCache();
  }
}

export { CasinoSceneIntegration, CasinoAssetLibrary };
