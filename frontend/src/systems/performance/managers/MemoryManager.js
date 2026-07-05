/**
 * Memory Manager - Asset tracking and cleanup system
 * 
 * Manages VRAM and system memory usage, implements reference counting,
 * and provides automatic garbage collection for unused assets.
 * 
 * Validates: Requirements 10.1, 10.3
 */

/**
 * MemoryManager class implementing the MemoryManager interface
 * Handles asset tracking, reference counting, and garbage collection
 */
class MemoryManager {
  /**
   * Initialize MemoryManager
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    // Asset tracking
    this.trackedAssets = new Map(); // id -> AssetMetadata
    this.assetsByType = new Map(); // type -> Set of asset ids
    
    // Memory pools
    this.memoryPools = new Map(); // type -> MemoryPool
    
    // Cleanup configuration
    this.cleanupThresholds = {
      vramWarningLevel: config.vramWarningLevel || 0.75,
      vramCriticalLevel: config.vramCriticalLevel || 0.90,
      assetTimeoutMs: config.assetTimeoutMs || 30000, // 30 seconds
      gcFrequencyMs: config.gcFrequencyMs || 5000 // Every 5 seconds
    };
    
    // Statistics
    this.stats = {
      totalAllocated: 0,
      textureMemory: 0,
      geometryMemory: 0,
      shaderMemory: 0,
      instanceMemory: 0,
      availableVRAM: 0,
      systemMemory: 0,
      disposedAssets: 0
    };
    
    // Last garbage collection time
    this.lastGCTime = Date.now();
    this.gcInterval = config.gcInterval || 5000;
    
    // Asset ID counter
    this.nextAssetId = 0;
    
    // Initialize memory pools for each type
    this._initializeMemoryPools(config);
  }

  /**
   * Track an asset with metadata for cleanup management
   * Requirements: 10.1
   * 
   * @param {Object3D|Texture|BufferGeometry|*} asset - Asset to track
   * @param {AssetMetadata} metadata - Asset metadata
   */
  trackAsset(asset, metadata) {
    // Generate unique asset ID if not provided
    const assetId = metadata.id || `asset_${this.nextAssetId++}`;
    
    // Create complete metadata object
    const assetMetadata = {
      id: assetId,
      type: metadata.type,
      size: metadata.size || this._estimateAssetSize(asset),
      lastAccessed: Date.now(),
      referenceCount: metadata.referenceCount !== undefined ? metadata.referenceCount : 1,
      priority: metadata.priority || 0,
      disposable: metadata.disposable !== false,
      asset: asset,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    };

    // Track by ID
    this.trackedAssets.set(assetId, assetMetadata);

    // Track by type for bulk operations
    if (!this.assetsByType.has(metadata.type)) {
      this.assetsByType.set(metadata.type, new Set());
    }
    this.assetsByType.get(metadata.type).add(assetId);

    // Update statistics
    this.stats.totalAllocated += assetMetadata.size;
    this._updateMemoryStats(assetMetadata.type, assetMetadata.size, true);

    return assetId;
  }

  /**
   * Release/decrement reference count for an asset
   * Requirements: 10.1
   * 
   * @param {string} assetId - Asset ID to release
   * @returns {boolean} - True if asset was fully disposed
   */
  releaseAsset(assetId) {
    const metadata = this.trackedAssets.get(assetId);
    if (!metadata) {
      console.warn(`MemoryManager: Asset ${assetId} not found`);
      return false;
    }

    // Decrement reference count
    metadata.referenceCount--;
    metadata.lastAccessedAt = Date.now();

    // If reference count reaches zero and asset is disposable, dispose it
    if (metadata.referenceCount <= 0 && metadata.disposable) {
      return this._disposeAsset(assetId);
    }

    return false;
  }

  /**
   * Perform garbage collection
   * Requirements: 10.2
   * 
   * @param {number} aggressiveness - Aggressiveness level (0-1, higher = more aggressive)
   * @returns {MemoryReclaimed} - Memory reclamation results
   */
  performGarbageCollection(aggressiveness = 0.5) {
    const now = Date.now();
    const timeoutThreshold = this.cleanupThresholds.assetTimeoutMs;
    
    let bytesFreed = 0;
    let assetsDisposed = 0;
    let texturesReleased = 0;
    let geometryCleaned = 0;

    // Determine cleanup strategy based on aggressiveness
    const isAggressive = aggressiveness > 0.7;
    
    // Iterate through all tracked assets
    for (const [assetId, metadata] of this.trackedAssets.entries()) {
      const timeSinceLastAccess = now - metadata.lastAccessedAt;

      // Check if asset should be disposed
      let shouldDispose = false;

      if (isAggressive) {
        // Aggressive: dispose unused assets quickly
        shouldDispose = timeSinceLastAccess > timeoutThreshold * 0.5;
      } else {
        // Normal: dispose assets only after timeout
        // Requirements: 30-second timeout disposal system
        shouldDispose = timeSinceLastAccess > timeoutThreshold;
      }

      // Always check reference count
      if (metadata.referenceCount <= 0 && metadata.disposable) {
        shouldDispose = true;
      }

      if (shouldDispose) {
        const assetSize = metadata.size;
        if (this._disposeAsset(assetId)) {
          bytesFreed += assetSize;
          assetsDisposed++;
          
          if (metadata.type === 'TEXTURE') {
            texturesReleased++;
          } else if (metadata.type === 'GEOMETRY') {
            geometryCleaned++;
          }
        }
      }
    }

    this.lastGCTime = now;

    return {
      bytesFreed,
      assetsDisposed,
      texturesReleased,
      geometryCleaned
    };
  }

  /**
   * Get current memory usage report
   * Requirements: 10.4
   * 
   * @returns {MemoryUsageReport} - Current memory usage
   */
  getMemoryUsage() {
    return {
      totalAllocated: this.stats.totalAllocated,
      textureMemory: this.stats.textureMemory,
      geometryMemory: this.stats.geometryMemory,
      shaderMemory: this.stats.shaderMemory,
      instanceMemory: this.stats.instanceMemory,
      availableVRAM: this._getAvailableVRAM(),
      systemMemory: this._getSystemMemory()
    };
  }

  /**
   * Set cleanup thresholds for garbage collection
   * 
   * @param {CleanupThresholds} thresholds - New threshold configuration
   */
  setCleanupThresholds(thresholds) {
    this.cleanupThresholds = {
      ...this.cleanupThresholds,
      ...thresholds
    };
  }

  /**
   * Optimize memory layout by defragmenting memory pools
   */
  optimizeMemoryLayout() {
    for (const pool of this.memoryPools.values()) {
      if (pool.defragment) {
        pool.defragment();
      }
    }
  }

  /**
   * Create a memory pool for efficient resource allocation
   * Requirements: 10.1 - memory pool management
   * 
   * @param {string} type - Pool type (GEOMETRY, TEXTURE, etc)
   * @param {number} size - Initial pool size in bytes
   * @returns {MemoryPool} - Created memory pool
   */
  createMemoryPool(type, size) {
    if (this.memoryPools.has(type)) {
      return this.memoryPools.get(type);
    }

    const pool = {
      type,
      size,
      allocated: 0,
      available: size,
      buffer: new ArrayBuffer(size),
      allocations: new Map(), // offset -> { size, used }
      
      allocate: (requestSize) => {
        if (requestSize > pool.available) {
          return null;
        }
        
        // Simple first-fit allocation
        let offset = 0;
        for (const [currentOffset, allocation] of pool.allocations.entries()) {
          if (offset + requestSize < currentOffset) {
            // Found gap
            const view = new ArrayBuffer(requestSize);
            pool.allocations.set(offset, { size: requestSize, used: true });
            pool.allocated += requestSize;
            pool.available -= requestSize;
            return view;
          }
          offset = Math.max(offset, currentOffset + allocation.size);
        }
        
        // Try allocation at end
        if (offset + requestSize <= pool.size) {
          const view = new ArrayBuffer(requestSize);
          pool.allocations.set(offset, { size: requestSize, used: true });
          pool.allocated += requestSize;
          pool.available -= requestSize;
          return view;
        }
        
        return null;
      },
      
      deallocate: (buffer) => {
        // Find and mark allocation as unused
        for (const [offset, allocation] of pool.allocations.entries()) {
          if (allocation.size === buffer.byteLength) {
            allocation.used = false;
            pool.allocated -= allocation.size;
            pool.available += allocation.size;
            return;
          }
        }
      },
      
      defragment: () => {
        // Collect used allocations
        const usedAllocs = [];
        for (const [offset, allocation] of pool.allocations.entries()) {
          if (allocation.used) {
            usedAllocs.push({ offset, ...allocation });
          }
        }
        
        // Clear and rebuild
        pool.allocations.clear();
        let currentOffset = 0;
        for (const alloc of usedAllocs) {
          pool.allocations.set(currentOffset, { 
            size: alloc.size, 
            used: true 
          });
          currentOffset += alloc.size;
        }
        
        pool.allocated = currentOffset;
        pool.available = pool.size - currentOffset;
      }
    };

    this.memoryPools.set(type, pool);
    return pool;
  }

  /**
   * Increment reference count for an asset
   * 
   * @param {string} assetId - Asset ID
   */
  incrementReference(assetId) {
    const metadata = this.trackedAssets.get(assetId);
    if (metadata) {
      metadata.referenceCount++;
      metadata.lastAccessedAt = Date.now();
    }
  }

  /**
   * Get all tracked assets of a specific type
   * 
   * @param {string} type - Asset type
   * @returns {Array} - Array of asset metadata
   */
  getAssetsByType(type) {
    const assetIds = this.assetsByType.get(type);
    if (!assetIds) return [];
    
    return Array.from(assetIds).map(id => this.trackedAssets.get(id));
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Initialize memory pools for different asset types
   * 
   * @private
   * @param {Object} config - Configuration
   */
  _initializeMemoryPools(config) {
    // Create pools for common asset types
    const poolTypes = [
      { type: 'GEOMETRY', size: 50 * 1024 * 1024 }, // 50MB
      { type: 'TEXTURE', size: 100 * 1024 * 1024 }, // 100MB
      { type: 'SHADER', size: 10 * 1024 * 1024 }, // 10MB
      { type: 'ANIMATION', size: 20 * 1024 * 1024 } // 20MB
    ];

    for (const poolConfig of poolTypes) {
      this.createMemoryPool(poolConfig.type, poolConfig.size);
    }
  }

  /**
   * Dispose an asset and free its memory
   * 
   * @private
   * @param {string} assetId - Asset ID to dispose
   * @returns {boolean} - True if successfully disposed
   */
  _disposeAsset(assetId) {
    const metadata = this.trackedAssets.get(assetId);
    if (!metadata) return false;

    // Try to dispose Three.js objects
    const asset = metadata.asset;
    
    try {
      if (asset.dispose) {
        // Texture, BufferGeometry, Material, ShaderMaterial, etc.
        asset.dispose();
      } else if (asset.geometry) {
        // Mesh or similar object with geometry
        asset.geometry.dispose();
      }
      
      // Remove tracking
      this.trackedAssets.delete(assetId);
      
      const typeSet = this.assetsByType.get(metadata.type);
      if (typeSet) {
        typeSet.delete(assetId);
      }

      // Update statistics
      this.stats.totalAllocated -= metadata.size;
      this._updateMemoryStats(metadata.type, metadata.size, false);
      this.stats.disposedAssets++;

      return true;
    } catch (error) {
      console.error(`MemoryManager: Error disposing asset ${assetId}:`, error);
      return false;
    }
  }

  /**
   * Estimate asset size in bytes
   * 
   * @private
   * @param {*} asset - Asset to estimate
   * @returns {number} - Estimated size in bytes
   */
  _estimateAssetSize(asset) {
    let size = 0;

    // Texture size estimation
    if (asset.isTexture) {
      const width = asset.source?.data?.width || asset.image?.width || 0;
      const height = asset.source?.data?.height || asset.image?.height || 0;
      // Rough estimate: 4 bytes per pixel (RGBA)
      size = width * height * 4;
    }
    
    // BufferGeometry size estimation
    else if (asset.isBufferGeometry) {
      for (const attr of Object.values(asset.attributes)) {
        if (attr.array) {
          size += attr.array.byteLength || attr.array.length * 4;
        }
      }
      if (asset.index && asset.index.array) {
        size += asset.index.array.byteLength || asset.index.array.length * 4;
      }
    }
    
    // Material size estimation
    else if (asset.isMaterial) {
      size = 1024; // Base material size
      for (const key in asset.uniforms) {
        size += 64; // Rough estimate per uniform
      }
    }
    
    // Default estimate
    else {
      size = 1024;
    }

    return Math.max(size, 0);
  }

  /**
   * Update memory statistics based on asset type
   * 
   * @private
   * @param {string} type - Asset type
   * @param {number} size - Size in bytes
   * @param {boolean} allocating - True if allocating, false if deallocating
   */
  _updateMemoryStats(type, size, allocating) {
    const delta = allocating ? size : -size;
    
    switch (type) {
      case 'TEXTURE':
        this.stats.textureMemory += delta;
        break;
      case 'GEOMETRY':
        this.stats.geometryMemory += delta;
        break;
      case 'SHADER':
        this.stats.shaderMemory += delta;
        break;
      case 'ANIMATION':
        this.stats.instanceMemory += delta;
        break;
    }
  }

  /**
   * Get available VRAM using WebGL if available
   * 
   * @private
   * @returns {number} - Available VRAM in bytes
   */
  _getAvailableVRAM() {
    // Try to get VRAM info from WebGL extension
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (gl) {
        // Check for memory info extension
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          // Rough estimate based on common VRAM amounts
          return 2 * 1024 * 1024 * 1024; // 2GB default estimate
        }
      }
    } catch (e) {
      // Fallback if WebGL is not available
    }
    
    // Fallback estimate
    return 2 * 1024 * 1024 * 1024; // 2GB
  }

  /**
   * Get available system memory
   * 
   * @private
   * @returns {number} - Available system memory in bytes
   */
  _getSystemMemory() {
    if (performance && performance.memory) {
      return performance.memory.jsHeapSizeLimit;
    }
    
    // Fallback estimate
    return 1 * 1024 * 1024 * 1024; // 1GB
  }

  /**
   * Check if emergency cleanup should trigger
   * Requirements: 10.5
   * 
   * @private
   * @returns {boolean} - True if memory pressure is critical
   */
  _isEmergencyCleanupNeeded() {
    const memUsage = this.getMemoryUsage();
    const availableVRAM = memUsage.availableVRAM;
    const allocatedVRAM = memUsage.totalAllocated;
    
    if (availableVRAM <= 0) {
      return true;
    }
    
    const usageRatio = allocatedVRAM / (allocatedVRAM + availableVRAM);
    return usageRatio >= this.cleanupThresholds.vramCriticalLevel;
  }

  /**
   * Perform emergency cleanup when system memory reaches 90%
   * Requirements: 10.5 - Emergency cleanup procedures for 90% system memory usage
   * 
   * This method implements aggressive cleanup when system resources are critically low.
   * It forcefully disposes of low-priority assets and performs defragmentation.
   * 
   * @returns {EmergencyCleanupResult} - Result of emergency cleanup operation
   */
  performEmergencyCleanup() {
    const result = {
      triggered: false,
      bytesFreed: 0,
      assetsDisposed: 0,
      priorityThresholds: {},
      systemMemoryBefore: this._getSystemMemory(),
      systemMemoryAfter: 0,
      emergencyReason: null
    };

    // Check if system memory is at critical level (90%)
    const memUsage = this.getMemoryUsage();
    const systemMemoryUsageRatio = Math.max(
      memUsage.totalAllocated / (memUsage.totalAllocated + memUsage.systemMemory || 1),
      0
    );

    // Check if VRAM is critical (90%)
    const vramUsageRatio = memUsage.totalAllocated / (memUsage.totalAllocated + memUsage.availableVRAM || 1);
    
    if (systemMemoryUsageRatio >= 0.90 || vramUsageRatio >= this.cleanupThresholds.vramCriticalLevel) {
      result.triggered = true;
      
      if (systemMemoryUsageRatio >= 0.90) {
        result.emergencyReason = 'SYSTEM_MEMORY_CRITICAL';
      } else {
        result.emergencyReason = 'VRAM_CRITICAL';
      }

      // Sort assets by priority and last access time
      const assetsList = Array.from(this.trackedAssets.values());
      assetsList.sort((a, b) => {
        // Prioritize by: low priority first, then least recently used
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.lastAccessedAt - b.lastAccessedAt;
      });

      // Dispose lowest priority assets until we meet thresholds
      const targetFreeBytes = memUsage.totalAllocated * 0.2; // Free 20% of current allocation
      let freedBytes = 0;

      for (const asset of assetsList) {
        if (asset.disposable && freedBytes < targetFreeBytes) {
          const assetSize = asset.size;
          if (this._disposeAsset(asset.id)) {
            freedBytes += assetSize;
            result.assetsDisposed++;
          }
        }
      }

      result.bytesFreed = freedBytes;

      // Defragment memory pools
      this.optimizeMemoryLayout();

      // Update stats
      result.systemMemoryAfter = this._getSystemMemory();
    }

    return result;
  }

  /**
   * Get memory tracking accuracy report
   * Requirements: 10.4 - Memory usage reporting for debugging and optimization analysis
   * 
   * Provides detailed memory accounting for analysis and debugging
   * 
   * @returns {MemoryTrackingReport} - Detailed memory report
   */
  getMemoryTrackingReport() {
    const report = {
      timestamp: Date.now(),
      totalTrackedAssets: this.trackedAssets.size,
      assetsByType: {},
      memoryByType: {},
      topMemoryConsumers: [],
      unusedAssets: [],
      referenceCounts: {},
      memoryIntegrity: this._validateMemoryTracking()
    };

    // Collect assets by type with memory info
    for (const [type, assetIds] of this.assetsByType.entries()) {
      report.assetsByType[type] = assetIds.size;
      report.memoryByType[type] = 0;
    }

    // Calculate memory by type and find top consumers
    const allAssets = Array.from(this.trackedAssets.values());
    
    for (const asset of allAssets) {
      report.memoryByType[asset.type] = (report.memoryByType[asset.type] || 0) + asset.size;
      
      // Track reference count distribution
      const refCountKey = `refCount_${asset.referenceCount}`;
      report.referenceCounts[refCountKey] = (report.referenceCounts[refCountKey] || 0) + 1;
    }

    // Get top 10 memory consumers
    report.topMemoryConsumers = allAssets
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        type: a.type,
        size: a.size,
        referenceCount: a.referenceCount,
        lastAccessedAt: a.lastAccessedAt,
        disposable: a.disposable
      }));

    // Find unused (refCount = 0) disposable assets
    const now = Date.now();
    const timeoutThreshold = this.cleanupThresholds.assetTimeoutMs;

    report.unusedAssets = allAssets
      .filter(a => a.referenceCount === 0 && a.disposable)
      .map(a => ({
        id: a.id,
        type: a.type,
        size: a.size,
        timeSinceLastAccess: now - a.lastAccessedAt,
        shouldBeDisposed: (now - a.lastAccessedAt) > timeoutThreshold
      }));

    return report;
  }

  /**
   * Validate memory tracking accuracy
   * Private helper for memory integrity checking
   * 
   * @private
   * @returns {MemoryIntegrityCheck} - Results of memory tracking validation
   */
  _validateMemoryTracking() {
    let calculatedTotal = 0;
    const typeMemory = {};

    for (const asset of this.trackedAssets.values()) {
      calculatedTotal += asset.size;
      typeMemory[asset.type] = (typeMemory[asset.type] || 0) + asset.size;
    }

    const matches = calculatedTotal === this.stats.totalAllocated;

    return {
      isAccurate: matches,
      reportedTotal: this.stats.totalAllocated,
      calculatedTotal: calculatedTotal,
      discrepancy: Math.abs(this.stats.totalAllocated - calculatedTotal),
      typeMatches: {
        TEXTURE: {
          reported: this.stats.textureMemory,
          calculated: typeMemory['TEXTURE'] || 0,
          matches: (this.stats.textureMemory === (typeMemory['TEXTURE'] || 0))
        },
        GEOMETRY: {
          reported: this.stats.geometryMemory,
          calculated: typeMemory['GEOMETRY'] || 0,
          matches: (this.stats.geometryMemory === (typeMemory['GEOMETRY'] || 0))
        },
        SHADER: {
          reported: this.stats.shaderMemory,
          calculated: typeMemory['SHADER'] || 0,
          matches: (this.stats.shaderMemory === (typeMemory['SHADER'] || 0))
        },
        ANIMATION: {
          reported: this.stats.instanceMemory,
          calculated: typeMemory['ANIMATION'] || 0,
          matches: (this.stats.instanceMemory === (typeMemory['ANIMATION'] || 0))
        }
      }
    };
  }
}

export default MemoryManager;
