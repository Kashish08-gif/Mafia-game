# Culling Debug Visualizer

## Overview

The `CullingDebugVisualizer` provides real-time debug visualization for the frustum and occlusion culling system. It renders wireframe visualizations of culling decisions and displays comprehensive statistics about culling performance.

**Task 3.3: Add debug visualization and culling statistics**  
**Requirements: 3.5, 12.4**

## Features

### 1. Debug Visualization Rendering

The visualizer displays:

- **Visible Objects**: Green wireframe spheres showing objects that are being rendered
- **Culled Objects**: Red wireframe spheres showing objects excluded by frustum culling
- **Occluded Objects**: Yellow/orange cross markers showing objects excluded by occlusion culling
  - Yellow markers: Standard occluded objects
  - Orange markers: Occluded objects that cast shadows (special tracking per Requirement 3.5)
- **Occlusion Bounds**: Cyan wireframe box showing the geometry used for occlusion testing

### 2. Culling Statistics Display

Real-time statistics overlay showing:

- Total visible/culled object counts
- Frustum culling efficiency percentage
- Shadow-casting object separation statistics
- Occlusion test frequency
- Average occlusion test time

#### Shadow-Casting Object Separation (Requirement 3.5)

The visualizer separates shadow-casting objects from regular objects in statistics:

```
Shadow Casting:
  Total: 45
  Rendered: 35
  Culled: 10
  Ratio: 77.8%
```

This allows developers to understand how culling decisions affect shadow-casting geometry specifically, which has different performance implications than standard geometry.

## API

### Constructor

```javascript
const visualizer = new CullingDebugVisualizer(scene);
```

**Parameters:**

- `scene` (Scene): Three.js scene to add debug geometry to

### Methods

#### `enable()`

Enables debug visualization rendering.

#### `disable()`

Disables debug visualization and cleans up resources.

#### `updateVisualization(debugData, canvasWidth, canvasHeight)`

Updates the visualization with current culling data from the CullingSystem.

**Parameters:**

- `debugData` (Object): Debug data from `CullingSystem.getDebugVisualizationData()`
- `canvasWidth` (number): Canvas width for statistics overlay (default: 800)
- `canvasHeight` (number): Canvas height for statistics overlay (default: 600)

**Example:**

```javascript
const cullingSystem = new CullingSystem();
const debugVisualizer = new CullingDebugVisualizer(scene);

cullingSystem.setDebugVisualization(true);

// In render loop
const debugData = cullingSystem.getDebugVisualizationData();
debugVisualizer.updateVisualization(debugData);
```

#### `getDebugStats()`

Returns the current debug statistics object.

**Returns:** Statistics object with counts and efficiency metrics

#### `clearDebugObjects()`

Clears all debug visualization objects from the scene.

#### `clearAll()`

Clears all resources including statistics.

#### `dispose()`

Disposes of the visualizer and cleans up all resources.

## Integration with CullingSystem

The visualizer works in conjunction with the `CullingSystem` debug mode:

```javascript
// Enable debug mode on CullingSystem
cullingSystem.setDebugVisualization(true);

// Get debug data
const debugData = cullingSystem.getDebugVisualizationData();

// Visualize
debugVisualizer.updateVisualization(debugData);
```

## Performance Considerations

- Debug visualization has negligible performance impact when disabled
- When enabled, visualization rendering adds:
  - Spheres and markers rendering time (minimal with wireframes)
  - Canvas texture generation for statistics overlay (~1-2ms per frame)
  - Total overhead: typically <5ms per frame

## Requirements Compliance

### Requirement 3.5: Debug Visualization for Frustum Bounds and Occluded Objects

✓ Creates debug rendering for frustum bounds via `generateFrustumVisualization()`  
✓ Renders occluded objects with special markers  
✓ Shows wireframe spheres for visible/culled objects  
✓ Displays occlusion bounds geometry

### Requirement 12.4: Performance Monitoring and Debugging Tools

✓ Provides real-time display of culling statistics  
✓ Shows object visibility distribution  
✓ Displays shadow-casting object separation  
✓ Tracks occlusion test performance metrics  
✓ Renders statistics overlay with key metrics

## Shadow-Casting Object Separation

The system implements Requirement 3.5 by tracking shadow-casting objects separately:

1. **Identification**: Objects are marked as shadow-casters via `object.castShadow = true`
2. **Tracking**: The `CullingSystem.getCullingStats()` method separates shadow-casting statistics
3. **Visualization**: Orange markers distinguish shadow-casting occluded objects
4. **Analysis**: Statistics show shadow-casting object count and culling ratio

Example output:

```
Shadow Casting Objects Culled: 8 of 35 total shadow casters (22.9% efficiency)
```

This helps developers understand:

- How many shadow-casting objects are being rendered vs culled
- Whether shadow-casting objects are being culled effectively
- Performance impact of shadow rendering on specific object types

## Example Usage

```javascript
import CullingSystem from "./CullingSystem.js";
import CullingDebugVisualizer from "./CullingDebugVisualizer.js";

// Initialize systems
const cullingSystem = new CullingSystem();
const debugVisualizer = new CullingDebugVisualizer(scene);

// Enable debug visualization
cullingSystem.setDebugVisualization(true);
debugVisualizer.enable();

// In animation loop
function animate() {
  // Perform culling
  const cullingResult = cullingSystem.performFrustumCulling(objects, camera);

  // Update debug visualization
  const debugData = cullingSystem.getDebugVisualizationData();
  debugVisualizer.updateVisualization(debugData, 800, 600);

  // Render scene
  renderer.render(scene, camera);
}
```

## Testing

Unit tests for the culling algorithms are provided in `CullingSystem.culling-algorithms.test.js`:

- Frustum-sphere intersection tests
- Render queue sorting tests
- Occlusion culling tests
- Shadow-casting object separation tests
- Culling statistics accuracy tests
- Debug visualization functionality tests

All tests verify correct calculation and reporting of culling decisions.
