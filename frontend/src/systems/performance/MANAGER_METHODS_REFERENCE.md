# Performance System Manager Methods Reference

## Quick Reference Guide

This document lists all the correct method names for each manager in the PerformanceSystem.

---

## FrameController

### Initialization

```javascript
new FrameController(config);
```

### Public Methods

- `update(deltaTime)` - Update frame metrics and quality adjustments
- `setTargetFPS(fps)` - Set target FPS (usually 60)
- `setAdaptiveMode(enabled)` - Enable/disable adaptive quality
- `adjustQuality(metrics)` - Adjust quality based on performance
- `applyQualityPreset(preset)` - Apply quality preset ('low', 'medium', 'high', 'ultra')
- `updateMetrics(frameData)` - Update performance metrics
- `getPerformanceMetrics()` - Get current metrics
- `getGPUTimingQueries()` - Get GPU timing data
- `getStats()` - Get statistics
- `recordOptimizationEvent(event)` - Record event in history
- `getOptimizationHistory()` - Get event history

### Called From

`PerformanceSystem.updateManagers(deltaTime)`

---

## LODManager

### Initialization

```javascript
new LODManager(config);
```

### Public Methods

- `registerLODGroup(meshes, distances)` - Register LOD group with distance thresholds
- `updateLODLevels(camera)` - Update LOD based on camera position
- `getLODStats()` - Get LOD statistics
- `getActiveLODs()` - Get currently active LOD levels
- `registerMeshForLOD(mesh)` - Auto-detect LOD candidates

### Called From

`PerformanceSystem.updateManagers(deltaTime)` → `updateLODLevels(this.camera)`

---

## CullingSystem

### Initialization

```javascript
new CullingSystem(config);
```

### Public Methods

- `performFrustumCulling(objects, camera)` - Frustum culling
- `updateOcclusionCulling(objects, occluders, gl)` - Occlusion culling
- `getOcclusionBounds(casinoBuilding)` - Get occlusion bounds
- `getCullingStats()` - Get culling statistics
- `getDebugVisualizationData()` - Debug visualization data
- `enableDebugVisualization(enabled)` - Toggle debug mode

### Called From

`PerformanceSystem.updateManagers(deltaTime)` → `performFrustumCulling(this.scene.children, this.camera)`

---

## InstanceManager

### Initialization

```javascript
new InstanceManager(config);
```

### Public Methods

- `registerMeshes(meshes, threshold)` - Register meshes for instancing
- `registerInstanceGroup(geometry, material, count)` - Register instance group
- `updateInstances(groupId, transforms)` - Update instance transforms
- `updateInstanceVisibility(groupId, visibilityMask)` - Update visibility
- `getInstancesToCull(groupId, cameraPosition, cullingDistance)` - Get cull list
- `getRenderInstructions(groupId)` - Get render instructions
- `getInstanceStats()` - Get statistics

### Called From

`PerformanceSystem.registerForInstancing(meshes, threshold)`
**NOT called in updateManagers** - Manual update only

---

## AssetOptimizer

### Initialization

```javascript
new AssetOptimizer(config);
```

### Public Methods

- `loadProgressively(priorities, onProgress)` - Progressive loading
- `compressTextures(textures, options)` - Compress textures
- `generateTextureAtlases(materials, atlasSize)` - Generate atlases
- `createUberShader(materials, shaderTemplate)` - Create uber shader
- `optimizeGeometry(geometry, options)` - Optimize geometry
- `preprocessGLB(url, options)` - Preprocess GLB file
- `preloadNearbyAssets(playerPosition, direction, radius)` - Predictive loading
- `getReplacementProgress(assetUrl)` - Get loading progress
- `getStats()` - Get statistics
- `clearCache()` - Clear cache
- `dispose()` - Cleanup

### Called From

Manual calls like `PerformanceSystem.registerForAssetLoading(assets)`
**NOT called in updateManagers** - Manual update only

---

## AnimationOptimizer

### Initialization

```javascript
new AnimationOptimizer(config);
```

### Public Methods

- `update(camera, scene, deltaTime)` - Update animation LOD
- `registerAnimatedMesh(mesh, animationClips)` - Register animated mesh
- `playAnimation(mesh, clipName, loop)` - Play animation
- `stopAnimation(mesh, clipName)` - Stop animation
- `getStats()` - Get statistics

### Called From

`PerformanceSystem.updateManagers(deltaTime)` → `update(this.camera, this.scene, deltaTime)`

---

## EffectsOptimizer

### Initialization

```javascript
new EffectsOptimizer(config);
```

### Public Methods

- `update(deltaTime)` - Update particle effects
- `emit(systemName, position, velocity, count, life)` - Emit particles
- `getActiveParticleCount()` - Get active particle count
- `getStats()` - Get statistics

### Called From

`PerformanceSystem.updateManagers(deltaTime)` → `update(deltaTime)`

---

## LightingOptimizer

### Initialization

```javascript
new LightingOptimizer(config);
```

### Public Methods

- `optimizeLighting(lights)` - Optimize lighting
- `updateContactShadows(objects, camera)` - Update contact shadows
- `setCascadedShadowMaps(directionalLight, cascades)` - Setup cascaded shadows
- `getStats()` - Get statistics

### Called From

`PerformanceSystem.updateManagers(deltaTime)` → `updateContactShadows(this.scene.children, this.camera)`

---

## MemoryManager

### Initialization

```javascript
new MemoryManager(config);
```

### Public Methods

- `trackAsset(asset, metadata)` - Track asset in memory
- `releaseAsset(assetId)` - Release asset
- `performGarbageCollection(aggressiveness)` - Garbage collection
- `getMemoryUsage()` - Get memory usage stats
- `forceCleanup()` - Force cleanup
- `getStats()` - Get statistics

### Called From

`PerformanceSystem.updateManagers(deltaTime)` → `performGarbageCollection(0.5)`

---

## HardwareDetector

### Initialization

```javascript
new HardwareDetector();
```

### Public Methods

- `getSummary()` - Get hardware summary
- `detectGPUTier()` - Detect GPU tier
- `hasWebGL2()` - Check WebGL2 support
- `getVRAMEstimate()` - Estimate VRAM

### Called From

`PerformanceSystem.initializeHardwareDetection()`

---

## FallbackRenderer

### Initialization

```javascript
new FallbackRenderer(hardwareDetector);
```

### Public Methods

- `getCompleteProfile()` - Get rendering profile
- `applyToScene(scene)` - Apply optimizations to scene
- `configureRenderer(renderer)` - Configure renderer

### Called From

`PerformanceSystem.applyFallbackRendering()`

---

## PerformanceLogger

### Initialization

```javascript
new PerformanceLogger(intervalMs, historySize);
```

### Public Methods

- `recordSnapshot(fps, frameTime, drawCalls, triangles, vram, lodDistribution)`
- `getHistory()` - Get performance history
- `setFeatureStatus(featureName, enabled)` - Toggle feature

### Called From

`PerformanceSystem.initialize()` and `PerformanceSystem.update()`

---

## Summary Table

| Manager            | Init Method                | Update Method                            | Update Freq    |
| ------------------ | -------------------------- | ---------------------------------------- | -------------- |
| FrameController    | `new FrameController()`    | `update(deltaTime)`                      | Every frame    |
| LODManager         | `new LODManager()`         | `updateLODLevels(camera)`                | Every frame    |
| CullingSystem      | `new CullingSystem()`      | `performFrustumCulling(objects, camera)` | Every frame    |
| InstanceManager    | `new InstanceManager()`    | Manual                                   | On-demand      |
| AssetOptimizer     | `new AssetOptimizer()`     | Manual                                   | On-demand      |
| AnimationOptimizer | `new AnimationOptimizer()` | `update(camera, scene, deltaTime)`       | Every frame    |
| EffectsOptimizer   | `new EffectsOptimizer()`   | `update(deltaTime)`                      | Every frame    |
| LightingOptimizer  | `new LightingOptimizer()`  | `updateContactShadows(objects, camera)`  | Every 2 frames |
| MemoryManager      | `new MemoryManager()`      | `performGarbageCollection(0.5)`          | Every 5 frames |

---

## Important Notes

1. **Always check if manager exists** before calling methods
2. **Always check if method exists** before calling it
3. **Use typeof check** for safety: `typeof manager.method === 'function'`
4. **Null coalescing** for properties: Use `?.` operator or null checks
5. **No method should throw** errors silently - debug console logs if needed

---

## Example Usage

```javascript
// Safe manager update pattern
if (this.managers.frameControl && this.shouldUpdateManager("frameControl")) {
  if (typeof this.managers.frameControl.update === "function") {
    this.managers.frameControl.update(deltaTime);
  }
}
```

---

Last Updated: January 16, 2025
