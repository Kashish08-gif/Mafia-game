/**
 * Frame Controller - Performance monitoring and quality adjustment system
 * 
 * Monitors real-time FPS and frame time, tracks performance metrics including draw calls,
 * triangles rendered, and VRAM usage. Provides dynamic quality adjustment based on 
 * performance drops and maintains 60-frame history for trend analysis.
 * 
 * Validates: Requirements 1.2, 7.1, 7.2, 12.1, 12.2
 */

import { PERFORMANCE_TARGETS, QUALITY_CONFIG, MONITORING_CONFIG } from '../constants';

/**
 * FrameController class implementing the FrameController interface
 * Handles real-time performance monitoring and adaptive quality adjustment
 */
class FrameController {
  /**
   * Initialize FrameController
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.targetFPS = config.targetFPS || PERFORMANCE_TARGETS.TARGET_FPS;
    this.targetFrameTime = PERFORMANCE_TARGETS.TARGET_FRAME_TIME_MS;

    // Frame timing tracking - 60 frame history (Requirement 12.1, 12.2)
    this.frameTimeHistory = new Array(QUALITY_CONFIG.PERFORMANCE_HISTORY_FRAMES).fill(0);
    this.frameTimeIndex = 0;
    this.lastFrameTime = 0;

    // Current performance metrics
    this.metrics = {
      currentFPS: 60,
      frameTime: this.targetFrameTime,
      frameTimeHistory: [...this.frameTimeHistory],
      vramUsage: 0,
      systemMemoryUsage: 0,
      drawCalls: 0,
      triangleCount: 0,
      shaderSwitches: 0,
      textureBindings: 0,
      gpuTime: 0,
      cpuTime: 0
    };

    // Quality adjustment state
    this.adaptiveMode = config.adaptiveMode !== false;
    this.emergencyThresholds = config.emergencyThresholds || this._getDefaultThresholds();
    this.currentQualityLevel = 3; // 0 = low, 1 = medium, 2 = high, 3 = ultra

    // Performance monitors (custom metrics)
    this.monitors = [];

    // Quality adjustment history
    this.optimizationHistory = [];
    this.maxHistorySize = MONITORING_CONFIG.OPTIMIZATION_HISTORY_SIZE;

    // Adjustment cooldown to prevent oscillation (hysteresis)
    this.lastQualityAdjustmentTime = 0;
    this.qualityAdjustmentCooldown = QUALITY_CONFIG.QUALITY_ADJUSTMENT_DELAY_MS;

    // Recovery tracking
    this.lowPerformanceStartTime = null;
    this.highPerformanceStartTime = null;
    this.recoveryTimeout = this.emergencyThresholds.recoveryTimeoutMs;

    // Statistics for analysis
    this.stats = {
      totalFramesProcessed: 0,
      framesBelow45FPS: 0,
      framesBelow30FPS: 0,
      qualityAdjustmentCount: 0,
      averageGPUTime: 0,
      averageCPUTime: 0,
      peakVRAMUsage: 0,
      peakMemoryUsage: 0
    };

    // GPU timing queries (Requirement 12.1)
    this.gpuTimingQueries = {
      cullingTime: 0,
      lodUpdateTime: 0,
      shadowRenderTime: 0,
      mainRenderTime: 0,
      postProcessTime: 0
    };

    this.lastUpdateTime = Date.now();
  }

  /**
   * Set target FPS for performance monitoring
   * 
   * @param {number} fps - Target FPS (usually 60)
   */
  setTargetFPS(fps) {
    this.targetFPS = Math.max(30, fps);
    this.targetFrameTime = 1000 / this.targetFPS;
  }

  /**
   * Enable or disable adaptive quality adjustment
   * Requirements: 7.1, 7.2
   * 
   * @param {boolean} enabled - Enable adaptive mode
   */
  setAdaptiveMode(enabled) {
    this.adaptiveMode = enabled;
  }

  /**
   * Adjust rendering quality based on performance metrics
   * Requirements: 7.1, 7.2, 7.3
   * 
   * @param {PerformanceMetrics} metrics - Current performance metrics
   * @returns {QualityAdjustment} - Quality adjustment to apply
   */
  adjustQuality(metrics) {
    const currentTime = Date.now();
    const adjustments = {
      changedSettings: new Map(),
      expectedImprovement: 0,
      reversible: true,
      priority: 0
    };

    if (!this.adaptiveMode) {
      return adjustments;
    }

    // Check if still in cooldown from last adjustment
    if (currentTime - this.lastQualityAdjustmentTime < this.qualityAdjustmentCooldown) {
      return adjustments;
    }

    const fps = metrics.currentFPS;
    const vramUsage = metrics.vramUsage;

    // Check for emergency conditions
    if (fps < PERFORMANCE_TARGETS.MINIMUM_FPS) {
      // Requirement 7.2: Emergency mode when FPS drops below 30fps
      adjustments.priority = 3;
      adjustments.expectedImprovement = 0.5;

      if (this.currentQualityLevel > 0) {
        this.currentQualityLevel = 0;
        adjustments.changedSettings.set('qualityLevel', 0);
        adjustments.changedSettings.set('disableReflections', true);
        adjustments.changedSettings.set('reducedTextures', true);
      }

      this.lowPerformanceStartTime = currentTime;
      this.highPerformanceStartTime = null;
    }
    // Check for critical frame rate threshold
    else if (fps < PERFORMANCE_TARGETS.QUALITY_ADJUSTMENT_FPS) {
      // Requirement 7.1: Start quality reduction below 45fps
      if (this.lowPerformanceStartTime === null) {
        this.lowPerformanceStartTime = currentTime;
      }

      const timeLowPerformance = currentTime - this.lowPerformanceStartTime;

      if (timeLowPerformance > QUALITY_CONFIG.QUALITY_ADJUSTMENT_DELAY_MS) {
        if (this.currentQualityLevel > 0) {
          this.currentQualityLevel = Math.max(0, this.currentQualityLevel - 1);
          adjustments.changedSettings.set('qualityLevel', this.currentQualityLevel);

          if (this.currentQualityLevel === 2) {
            adjustments.changedSettings.set('shadowQuality', 2);
          } else if (this.currentQualityLevel === 1) {
            adjustments.changedSettings.set('shadowQuality', 1);
          } else if (this.currentQualityLevel === 0) {
            adjustments.changedSettings.set('disableReflections', true);
            adjustments.changedSettings.set('textureQuality', 0);
          }

          adjustments.priority = 2;
          adjustments.expectedImprovement = 0.3;
          this.lastQualityAdjustmentTime = currentTime;
        }
      }
    }
    // Check for memory pressure
    else if (vramUsage > this.emergencyThresholds.maxVRAMUsage * 0.8) {
      // Requirement 7.3: Force lower LODs and reduce texture resolution
      if (this.currentQualityLevel > 0) {
        adjustments.changedSettings.set('forceLowerLOD', true);
        adjustments.changedSettings.set('textureQuality', this.currentQualityLevel - 1);
        adjustments.priority = 2;
        adjustments.expectedImprovement = 0.25;
      }
    }
    // Check for recovery conditions
    else if (
      fps > PERFORMANCE_TARGETS.QUALITY_ADJUSTMENT_FPS + QUALITY_CONFIG.FPS_HYSTERESIS &&
      vramUsage < this.emergencyThresholds.maxVRAMUsage * 0.6
    ) {
      // Requirement 7.4: Restore higher quality after 5 seconds of stability
      if (this.highPerformanceStartTime === null) {
        this.highPerformanceStartTime = currentTime;
      }

      const timeHighPerformance = currentTime - this.highPerformanceStartTime;

      if (
        timeHighPerformance > QUALITY_CONFIG.QUALITY_RESTORATION_DELAY_MS &&
        this.currentQualityLevel < 3
      ) {
        this.currentQualityLevel = Math.min(3, this.currentQualityLevel + 1);
        adjustments.changedSettings.set('qualityLevel', this.currentQualityLevel);
        adjustments.changedSettings.set('enableReflections', true);
        adjustments.changedSettings.set('textureQuality', this.currentQualityLevel);
        adjustments.priority = 1;
        adjustments.expectedImprovement = 0.1;
        this.lastQualityAdjustmentTime = currentTime;
      }
    }

    // Reset low performance timer if we recover
    if (fps > PERFORMANCE_TARGETS.QUALITY_ADJUSTMENT_FPS) {
      this.lowPerformanceStartTime = null;
    }

    return adjustments;
  }

  /**
   * Apply a quality preset (Low, Medium, High, Ultra)
   * Requirement: 7.5
   * 
   * @param {string} preset - Quality preset to apply ('low', 'medium', 'high', 'ultra')
   */
  applyQualityPreset(preset) {
    const presetMap = {
      low: 0,
      medium: 1,
      high: 2,
      ultra: 3
    };

    const level = presetMap[preset.toLowerCase()] !== undefined ? presetMap[preset.toLowerCase()] : 2;
    this.currentQualityLevel = level;
  }

  /**
   * Update performance metrics from frame data
   * Requirements: 1.2, 12.1, 12.2
   * 
   * @param {Object} frameData - Frame metrics data
   */
  updateMetrics(frameData) {
    const now = Date.now();
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    // Update frame time history
    const frameTime = frameData.frameTime || Math.max(1, deltaTime);
    this.frameTimeHistory[this.frameTimeIndex] = frameTime;
    this.frameTimeIndex = (this.frameTimeIndex + 1) % QUALITY_CONFIG.PERFORMANCE_HISTORY_FRAMES;

    // Calculate current FPS and average frame time (excluding zeros)
    const nonZeroFrameTimes = this.frameTimeHistory.filter(ft => ft > 0);
    const averageFrameTime = nonZeroFrameTimes.length > 0
      ? nonZeroFrameTimes.reduce((a, b) => a + b) / nonZeroFrameTimes.length
      : this.targetFrameTime;
    const currentFPS = Math.round(1000 / averageFrameTime);

    // Update metrics
    this.metrics.currentFPS = currentFPS;
    this.metrics.frameTime = averageFrameTime;
    this.metrics.frameTimeHistory = [...this.frameTimeHistory];
    this.metrics.drawCalls = frameData.drawCalls || 0;
    this.metrics.triangleCount = frameData.triangleCount || 0;
    this.metrics.vramUsage = frameData.vramUsage || this.metrics.vramUsage;
    this.metrics.systemMemoryUsage = frameData.systemMemoryUsage || this.metrics.systemMemoryUsage;
    this.metrics.shaderSwitches = frameData.shaderSwitches || 0;
    this.metrics.textureBindings = frameData.textureBindings || 0;
    this.metrics.gpuTime = frameData.gpuTime || 0;
    this.metrics.cpuTime = frameData.cpuTime || 0;

    // Update statistics
    this.stats.totalFramesProcessed++;
    if (currentFPS < 45) this.stats.framesBelow45FPS++;
    if (currentFPS < 30) this.stats.framesBelow30FPS++;

    // Track peak values
    this.stats.peakVRAMUsage = Math.max(this.stats.peakVRAMUsage, this.metrics.vramUsage);
    this.stats.peakMemoryUsage = Math.max(this.stats.peakMemoryUsage, this.metrics.systemMemoryUsage);

    // Update GPU timing if available
    if (frameData.gpuTimings) {
      this._updateGPUTimingQueries(frameData.gpuTimings);
    }

    // Run custom monitors
    this._updateMonitors();
  }

  /**
   * Get current performance metrics
   * Requirement: 12.1
   * 
   * @returns {PerformanceMetrics} - Current performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.metrics,
      frameTimeHistory: [...this.metrics.frameTimeHistory]
    };
  }

  /**
   * Add a custom performance monitor
   * 
   * @param {PerformanceMonitor} monitor - Monitor with name and measure function
   */
  addPerformanceMonitor(monitor) {
    if (!monitor || !monitor.name || typeof monitor.measure !== 'function') {
      throw new Error('FrameController: Invalid monitor configuration');
    }

    this.monitors.push(monitor);
  }

  /**
   * Set emergency thresholds for performance intervention
   * 
   * @param {EmergencyThresholds} thresholds - Emergency threshold values
   */
  setEmergencyThresholds(thresholds) {
    this.emergencyThresholds = {
      ...this.emergencyThresholds,
      ...thresholds
    };
  }

  /**
   * Get optimization event history
   * Requirement: 12.3
   * 
   * @returns {OptimizationEvent[]} - Recent optimization events
   */
  getOptimizationHistory() {
    return [...this.optimizationHistory];
  }

  /**
   * Record an optimization event for history
   * 
   * @param {OptimizationEvent} event - Optimization event to record
   */
  recordOptimizationEvent(event) {
    this.optimizationHistory.push({
      timestamp: Date.now(),
      ...event
    });

    // Trim history to max size
    if (this.optimizationHistory.length > this.maxHistorySize) {
      this.optimizationHistory.shift();
    }

    this.stats.qualityAdjustmentCount++;
  }

  /**
   * Get frame controller statistics
   * 
   * @returns {Object} - Current statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageGPUTime: this.stats.totalFramesProcessed > 0
        ? this.metrics.gpuTime / this.stats.totalFramesProcessed
        : 0,
      averageCPUTime: this.stats.totalFramesProcessed > 0
        ? this.metrics.cpuTime / this.stats.totalFramesProcessed
        : 0,
      lowPerformancePercentage: this.stats.totalFramesProcessed > 0
        ? (this.stats.framesBelow45FPS / this.stats.totalFramesProcessed) * 100
        : 0,
      criticalPercentage: this.stats.totalFramesProcessed > 0
        ? (this.stats.framesBelow30FPS / this.stats.totalFramesProcessed) * 100
        : 0
    };
  }

  /**
   * Get GPU timing query results
   * Requirement: 12.1 (detailed rendering phase breakdown)
   * 
   * @returns {Object} - GPU timing data for each rendering phase
   */
  getGPUTimingQueries() {
    return { ...this.gpuTimingQueries };
  }

  /**
   * Main update method called each frame
   * Tracks frame time and performs quality adjustments if needed
   * Requirement: 7.1, 7.2, 7.3
   * 
   * @param {number} deltaTime - Time since last frame in milliseconds
   */
  update(deltaTime = 0) {
    if (!deltaTime || deltaTime <= 0) {
      deltaTime = Date.now() - this.lastUpdateTime;
    }

    // Update metrics from current frame
    this.updateMetrics({
      frameTime: deltaTime
    });

    // Perform quality adjustments if needed
    if (this.adaptiveMode) {
      const metrics = this.getPerformanceMetrics();
      const adjustment = this.adjustQuality(metrics);

      // Record optimization event if changes were made
      if (adjustment.changedSettings && adjustment.changedSettings.size > 0) {
        this.recordOptimizationEvent({
          trigger: this._determineTrigger(metrics),
          adjustments: adjustment,
          before: { fps: metrics.currentFPS, frameTime: metrics.frameTime },
          after: { fps: metrics.currentFPS, frameTime: metrics.frameTime }
        });
      }
    }
  }

  /**
   * Reset all tracking and metrics
   */
  reset() {
    this.frameTimeHistory.fill(0);
    this.frameTimeIndex = 0;
    this.optimizationHistory = [];
    this.stats = {
      totalFramesProcessed: 0,
      framesBelow45FPS: 0,
      framesBelow30FPS: 0,
      qualityAdjustmentCount: 0,
      averageGPUTime: 0,
      averageCPUTime: 0,
      peakVRAMUsage: 0,
      peakMemoryUsage: 0
    };
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Get default emergency thresholds
   * 
   * @private
   * @returns {EmergencyThresholds} - Default thresholds
   */
  _getDefaultThresholds() {
    return {
      minFPS: PERFORMANCE_TARGETS.MINIMUM_FPS,
      maxFrameTime: PERFORMANCE_TARGETS.FRAME_TIME_WARNING_MS,
      maxVRAMUsage: PERFORMANCE_TARGETS.MAX_VRAM_USAGE_GB * 1024 * 1024 * 1024,
      maxMemoryUsage: 0.9,
      recoveryTimeoutMs: QUALITY_CONFIG.QUALITY_RESTORATION_DELAY_MS
    };
  }

  /**
   * Update GPU timing queries
   * 
   * @private
   * @param {Object} timings - GPU timing data
   */
  _updateGPUTimingQueries(timings) {
    if (timings.culling !== undefined) this.gpuTimingQueries.cullingTime = timings.culling;
    if (timings.lodUpdate !== undefined) this.gpuTimingQueries.lodUpdateTime = timings.lodUpdate;
    if (timings.shadowRender !== undefined) this.gpuTimingQueries.shadowRenderTime = timings.shadowRender;
    if (timings.mainRender !== undefined) this.gpuTimingQueries.mainRenderTime = timings.mainRender;
    if (timings.postProcess !== undefined) this.gpuTimingQueries.postProcessTime = timings.postProcess;
  }

  /**
   * Determine the trigger reason for quality adjustment
   * 
   * @private
   * @param {PerformanceMetrics} metrics - Current metrics
   * @returns {string} - Trigger type
   */
  _determineTrigger(metrics) {
    const fps = metrics.currentFPS;
    const vramUsage = metrics.vramUsage;

    if (fps < PERFORMANCE_TARGETS.MINIMUM_FPS) {
      return 'FRAME_RATE_DROP_CRITICAL';
    } else if (fps < PERFORMANCE_TARGETS.QUALITY_ADJUSTMENT_FPS) {
      return 'FRAME_RATE_DROP';
    } else if (vramUsage > this.emergencyThresholds.maxVRAMUsage * 0.75) {
      return 'MEMORY_PRESSURE';
    }

    return 'PERFORMANCE_RECOVERY';
  }

  /**
   * Update custom performance monitors
   * 
   * @private
   */
  _updateMonitors() {
    for (const monitor of this.monitors) {
      try {
        const value = monitor.measure();

        if (value > monitor.criticalThreshold) {
          // Critical threshold exceeded
          console.warn(`Performance Monitor [${monitor.name}]: Critical threshold exceeded`, value);
        } else if (value > monitor.threshold) {
          // Warning threshold exceeded
          if (MONITORING_CONFIG.LOG_PERFORMANCE_DROPS) {
            console.info(`Performance Monitor [${monitor.name}]: Threshold exceeded`, value);
          }
        }
      } catch (error) {
        console.error(`Performance Monitor [${monitor.name}] error:`, error);
      }
    }
  }
}

export default FrameController;
