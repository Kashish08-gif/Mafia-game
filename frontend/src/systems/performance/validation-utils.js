/**
 * Validation Utilities for Core Performance System
 * 
 * Provides runtime validation functions for interfaces and configurations
 * without TypeScript compile-time checking. These utilities validate that
 * runtime objects conform to the interface specifications.
 * 
 * Validates: Requirements 12.1
 */

import { Sphere, Vector3 } from 'three';
import {
  QualityPreset,
  HardwareTier,
  AssetType,
  LoadStrategy,
  TextureFormat,
  SortingStrategy
} from './enums';

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - Array of error messages
 * @property {Object} [warnings] - Optional warnings
 */

/**
 * Validates a PerformanceConfig object
 * @param {Object} config - Configuration to validate
 * @returns {ValidationResult}
 */
export function validatePerformanceConfig(config) {
  const errors = [];

  if (!config) {
    return { valid: false, errors: ['Config object is required'] };
  }

  // Validate targetFPS
  if (typeof config.targetFPS !== 'number' || config.targetFPS <= 0 || config.targetFPS > 240) {
    errors.push('targetFPS must be a positive number between 1-240');
  }

  // Validate maxVRAMUsage
  if (typeof config.maxVRAMUsage !== 'number' || config.maxVRAMUsage <= 0 || config.maxVRAMUsage > 16) {
    errors.push('maxVRAMUsage must be a positive number in GB, typically 0.5-16');
  }

  // Validate qualityPreset if provided
  if (config.qualityPreset && !Object.values(QualityPreset).includes(config.qualityPreset)) {
    errors.push(`qualityPreset must be one of: ${Object.values(QualityPreset).join(', ')}`);
  }

  // Validate hardwareTier if provided
  if (config.hardwareTier && !Object.values(HardwareTier).includes(config.hardwareTier)) {
    errors.push(`hardwareTier must be one of: ${Object.values(HardwareTier).join(', ')}`);
  }

  // Validate boolean flags
  if (config.enableAdaptiveQuality !== undefined && typeof config.enableAdaptiveQuality !== 'boolean') {
    errors.push('enableAdaptiveQuality must be boolean');
  }

  if (config.enableDebugMode !== undefined && typeof config.enableDebugMode !== 'boolean') {
    errors.push('enableDebugMode must be boolean');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a LODGroup object
 * @param {Object} lodGroup - LOD group to validate
 * @returns {ValidationResult}
 */
export function validateLODGroup(lodGroup) {
  const errors = [];

  if (!lodGroup) {
    return { valid: false, errors: ['LODGroup object is required'] };
  }

  // Validate required fields
  if (typeof lodGroup.id !== 'string' || lodGroup.id.length === 0) {
    errors.push('id must be a non-empty string');
  }

  if (!Array.isArray(lodGroup.meshes) || lodGroup.meshes.length === 0) {
    errors.push('meshes must be a non-empty array');
  }

  if (!Array.isArray(lodGroup.distances) || lodGroup.distances.length !== lodGroup.meshes.length) {
    errors.push('distances array must match meshes array length');
  }

  // Validate currentLevel
  if (typeof lodGroup.currentLevel !== 'number') {
    errors.push('currentLevel must be a number');
  } else if (lodGroup.currentLevel < 0 || lodGroup.currentLevel >= lodGroup.meshes.length) {
    errors.push(`currentLevel must be between 0 and ${lodGroup.meshes.length - 1}`);
  }

  // Validate screenSizeThreshold
  if (typeof lodGroup.screenSizeThreshold !== 'number' || lodGroup.screenSizeThreshold < 0) {
    errors.push('screenSizeThreshold must be a non-negative number');
  }

  // Validate transitionState
  if (lodGroup.transitionState) {
    if (typeof lodGroup.transitionState.isTransitioning !== 'boolean') {
      errors.push('transitionState.isTransitioning must be boolean');
    }
    if (typeof lodGroup.transitionState.progress !== 'number' || 
        lodGroup.transitionState.progress < 0 || 
        lodGroup.transitionState.progress > 1) {
      errors.push('transitionState.progress must be between 0-1');
    }
  }

  // Validate lastUpdateFrame
  if (typeof lodGroup.lastUpdateFrame !== 'number' || lodGroup.lastUpdateFrame < 0) {
    errors.push('lastUpdateFrame must be a non-negative number');
  }

  // Validate boundingSphere
  if (!(lodGroup.boundingSphere instanceof Sphere)) {
    errors.push('boundingSphere must be a Three.js Sphere instance');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a CullingResult object
 * @param {Object} cullingResult - Culling result to validate
 * @returns {ValidationResult}
 */
export function validateCullingResult(cullingResult) {
  const errors = [];

  if (!cullingResult) {
    return { valid: false, errors: ['CullingResult object is required'] };
  }

  // Validate arrays
  if (!Array.isArray(cullingResult.visibleObjects)) {
    errors.push('visibleObjects must be an array');
  }

  if (!Array.isArray(cullingResult.frustumCulled)) {
    errors.push('frustumCulled must be an array');
  }

  if (!Array.isArray(cullingResult.occlusionCulled)) {
    errors.push('occlusionCulled must be an array');
  }

  if (!Array.isArray(cullingResult.renderQueue)) {
    errors.push('renderQueue must be an array');
  }

  // Validate render queue entries
  if (Array.isArray(cullingResult.renderQueue)) {
    cullingResult.renderQueue.forEach((entry, index) => {
      if (typeof entry.distanceToCamera !== 'number' || entry.distanceToCamera < 0) {
        errors.push(`renderQueue[${index}].distanceToCamera must be non-negative number`);
      }

      if (typeof entry.renderPriority !== 'number') {
        errors.push(`renderQueue[${index}].renderPriority must be a number`);
      }

      if (typeof entry.lodLevel !== 'number' || entry.lodLevel < 0) {
        errors.push(`renderQueue[${index}].lodLevel must be non-negative number`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates an InstanceGroup object
 * @param {Object} instanceGroup - Instance group to validate
 * @returns {ValidationResult}
 */
export function validateInstanceGroup(instanceGroup) {
  const errors = [];

  if (!instanceGroup) {
    return { valid: false, errors: ['InstanceGroup object is required'] };
  }

  // Validate required fields
  if (typeof instanceGroup.id !== 'string' || instanceGroup.id.length === 0) {
    errors.push('id must be a non-empty string');
  }

  if (typeof instanceGroup.maxInstances !== 'number' || instanceGroup.maxInstances <= 0) {
    errors.push('maxInstances must be a positive number');
  }

  if (typeof instanceGroup.activeInstances !== 'number' || instanceGroup.activeInstances < 0) {
    errors.push('activeInstances must be a non-negative number');
  }

  if (instanceGroup.activeInstances > instanceGroup.maxInstances) {
    errors.push('activeInstances cannot exceed maxInstances');
  }

  // Validate arrays
  if (!Array.isArray(instanceGroup.transforms)) {
    errors.push('transforms must be an array');
  }

  if (!Array.isArray(instanceGroup.visibilityMask)) {
    errors.push('visibilityMask must be an array');
  }

  // Validate cullingData
  if (instanceGroup.cullingData) {
    if (!Array.isArray(instanceGroup.cullingData.boundingSpheres)) {
      errors.push('cullingData.boundingSpheres must be an array');
    }

    if (!Array.isArray(instanceGroup.cullingData.visibleIndices)) {
      errors.push('cullingData.visibleIndices must be an array');
    }

    if (!Array.isArray(instanceGroup.cullingData.sortedIndices)) {
      errors.push('cullingData.sortedIndices must be an array');
    }

    if (typeof instanceGroup.cullingData.needsUpdate !== 'boolean') {
      errors.push('cullingData.needsUpdate must be boolean');
    }
  }

  // Validate lastUpdateFrame
  if (typeof instanceGroup.lastUpdateFrame !== 'number' || instanceGroup.lastUpdateFrame < 0) {
    errors.push('lastUpdateFrame must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a MemoryUsageReport object
 * @param {Object} report - Memory usage report to validate
 * @returns {ValidationResult}
 */
export function validateMemoryUsageReport(report) {
  const errors = [];

  if (!report) {
    return { valid: false, errors: ['MemoryUsageReport object is required'] };
  }

  const fields = [
    'totalAllocated',
    'textureMemory',
    'geometryMemory',
    'shaderMemory',
    'instanceMemory',
    'availableVRAM',
    'systemMemory'
  ];

  // Validate all memory fields are non-negative numbers
  fields.forEach(field => {
    if (typeof report[field] !== 'number' || report[field] < 0) {
      errors.push(`${field} must be a non-negative number (MB)`);
    }
  });

  // Validate that component sum doesn't exceed total
  const componentSum = (report.textureMemory || 0) + 
                      (report.geometryMemory || 0) + 
                      (report.shaderMemory || 0) + 
                      (report.instanceMemory || 0);

  if (componentSum > (report.totalAllocated || 0) * 1.01) { // 1% tolerance for rounding
    errors.push('Sum of memory components cannot exceed totalAllocated');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a PerformanceMetrics object
 * @param {Object} metrics - Performance metrics to validate
 * @returns {ValidationResult}
 */
export function validatePerformanceMetrics(metrics) {
  const errors = [];

  if (!metrics) {
    return { valid: false, errors: ['PerformanceMetrics object is required'] };
  }

  // Validate FPS
  if (typeof metrics.currentFPS !== 'number' || metrics.currentFPS < 0 || metrics.currentFPS > 1000) {
    errors.push('currentFPS must be a number between 0-1000');
  }

  // Validate frameTime
  if (typeof metrics.frameTime !== 'number' || metrics.frameTime < 0) {
    errors.push('frameTime must be a non-negative number (ms)');
  }

  // Validate frameTimeHistory
  if (!Array.isArray(metrics.frameTimeHistory)) {
    errors.push('frameTimeHistory must be an array');
  } else if (metrics.frameTimeHistory.length > 60) {
    errors.push('frameTimeHistory must not exceed 60 frames');
  } else {
    metrics.frameTimeHistory.forEach((time, index) => {
      if (typeof time !== 'number' || time < 0) {
        errors.push(`frameTimeHistory[${index}] must be a non-negative number`);
      }
    });
  }

  // Validate memory usage
  if (typeof metrics.vramUsage !== 'number' || metrics.vramUsage < 0) {
    errors.push('vramUsage must be a non-negative number (MB)');
  }

  if (typeof metrics.systemMemoryUsage !== 'number' || metrics.systemMemoryUsage < 0) {
    errors.push('systemMemoryUsage must be a non-negative number (MB)');
  }

  // Validate rendering stats
  if (typeof metrics.drawCalls !== 'number' || metrics.drawCalls < 0) {
    errors.push('drawCalls must be a non-negative number');
  }

  if (typeof metrics.triangleCount !== 'number' || metrics.triangleCount < 0) {
    errors.push('triangleCount must be a non-negative number');
  }

  // Validate timing
  if (typeof metrics.gpuTime !== 'number' || metrics.gpuTime < 0) {
    errors.push('gpuTime must be a non-negative number (ms)');
  }

  if (typeof metrics.cpuTime !== 'number' || metrics.cpuTime < 0) {
    errors.push('cpuTime must be a non-negative number (ms)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a QualityPreset value
 * @param {string} preset - Quality preset to validate
 * @returns {ValidationResult}
 */
export function validateQualityPreset(preset) {
  const valid = Object.values(QualityPreset).includes(preset);
  return {
    valid,
    errors: valid ? [] : [`Invalid quality preset: ${preset}. Must be one of: ${Object.values(QualityPreset).join(', ')}`]
  };
}

/**
 * Validates a HardwareTier value
 * @param {string} tier - Hardware tier to validate
 * @returns {ValidationResult}
 */
export function validateHardwareTier(tier) {
  const valid = Object.values(HardwareTier).includes(tier);
  return {
    valid,
    errors: valid ? [] : [`Invalid hardware tier: ${tier}. Must be one of: ${Object.values(HardwareTier).join(', ')}`]
  };
}

/**
 * Validates an AssetType value
 * @param {string} type - Asset type to validate
 * @returns {ValidationResult}
 */
export function validateAssetType(type) {
  const valid = Object.values(AssetType).includes(type);
  return {
    valid,
    errors: valid ? [] : [`Invalid asset type: ${type}. Must be one of: ${Object.values(AssetType).join(', ')}`]
  };
}

/**
 * Calculate bounding sphere for a set of positions
 * @param {Vector3[]} positions - Array of Vector3 positions
 * @returns {Sphere} - Calculated bounding sphere
 */
export function calculateBoundingSphere(positions) {
  if (!positions || positions.length === 0) {
    return new Sphere(new Vector3(0, 0, 0), 0);
  }

  // Calculate center (centroid)
  const center = new Vector3();
  positions.forEach(pos => center.add(pos));
  center.divideScalar(positions.length);

  // Calculate radius (max distance from center to any point)
  let maxDistance = 0;
  positions.forEach(pos => {
    const distance = center.distanceTo(pos);
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  });

  return new Sphere(center, maxDistance);
}

/**
 * Calculate screen size of a bounding sphere
 * @param {Sphere} sphere - Bounding sphere
 * @param {Camera} camera - Camera for projection
 * @param {number} objectDistance - Distance from camera to object center
 * @returns {number} - Screen-space size as ratio (0-1)
 */
export function calculateScreenSize(sphere, camera, objectDistance) {
  if (!sphere || !camera || objectDistance <= 0) {
    return 0;
  }

  // Calculate the angular size of the sphere
  // This is a simplified calculation based on FOV and distance
  const angularSize = 2 * Math.atan(sphere.radius / objectDistance);
  
  // Convert to screen space (approximate, based on 75 degree FOV)
  const fovRad = (camera.fov || 75) * Math.PI / 180;
  const screenSize = angularSize / fovRad;

  return Math.max(0, Math.min(1, screenSize));
}

/**
 * Calculate distance from camera to a point in world space
 * @param {Vector3} point - World space point
 * @param {Camera} camera - Camera with position property
 * @returns {number} - Distance in units
 */
export function calculateDistanceToCamera(point, camera) {
  if (!point || !camera) {
    return 0;
  }

  return camera.position.distanceTo(point);
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} - Interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Exponential moving average for smoothing values over time
 * @param {number} current - Current value
 * @param {number} previous - Previous average
 * @param {number} alpha - Smoothing factor (0-1), higher = more recent weight
 * @returns {number} - Smoothed value
 */
export function exponentialMovingAverage(current, previous, alpha = 0.1) {
  if (previous === undefined || previous === null) {
    return current;
  }
  return alpha * current + (1 - alpha) * previous;
}

/**
 * Calculate hysteresis-adjusted threshold for value changes
 * @param {number} currentValue - Current value
 * @param {number} lastValue - Last value
 * @param {number} threshold - Base threshold
 * @param {number} hysteresis - Hysteresis amount
 * @returns {boolean} - Whether threshold was crossed
 */
export function checkHysteresis(currentValue, lastValue, threshold, hysteresis) {
  if (currentValue > lastValue + hysteresis) {
    return currentValue > threshold;
  } else if (currentValue < lastValue - hysteresis) {
    return currentValue > threshold;
  }
  return false;
}
