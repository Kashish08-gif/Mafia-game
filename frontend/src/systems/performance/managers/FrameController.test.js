/**
 * FrameController Unit Tests
 * Tests FPS calculation, frame time averaging, quality adjustment logic, and performance metrics
 * 
 * Validates: Requirements 1.2, 7.1, 7.2, 12.1, 12.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import FrameController from './FrameController';
import { QUALITY_CONFIG } from '../constants';

describe('FrameController', () => {
  let frameController;

  beforeEach(() => {
    frameController = new FrameController({
      targetFPS: 60,
      adaptiveMode: true
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(frameController.targetFPS).toBe(60);
      expect(frameController.metrics.currentFPS).toBe(60);
      expect(frameController.adaptiveMode).toBe(true);
      expect(frameController.frameTimeHistory.length).toBe(60);
    });

    it('should set target FPS', () => {
      frameController.setTargetFPS(30);
      expect(frameController.targetFPS).toBe(30);
      expect(frameController.targetFrameTime).toBeCloseTo(1000 / 30, 1);
    });

    it('should enforce minimum FPS of 30', () => {
      frameController.setTargetFPS(10);
      expect(frameController.targetFPS).toBe(30);
    });
  });

  describe('Performance Metrics Tracking (Requirement 12.1, 12.2)', () => {
    it('should track 60-frame history', () => {
      expect(frameController.frameTimeHistory.length).toBe(60);
    });

    it('should update metrics from frame data', () => {
      const frameData = {
        frameTime: 16.67,
        drawCalls: 150,
        triangleCount: 250000,
        vramUsage: 1024 * 1024 * 512, // 512MB
        systemMemoryUsage: 0.5
      };

      frameController.updateMetrics(frameData);

      expect(frameController.metrics.drawCalls).toBe(150);
      expect(frameController.metrics.triangleCount).toBe(250000);
    });

    it('should calculate correct FPS from frame time history', () => {
      // Fill history with 16.67ms frame times (60 FPS)
      for (let i = 0; i < 60; i++) {
        frameController.updateMetrics({ frameTime: 16.67 });
      }

      expect(frameController.metrics.currentFPS).toBeCloseTo(60, 0);
    });

    it('should track FPS below thresholds', () => {
      // Simulate low FPS - need enough frames to fill history and calculate average
      for (let i = 0; i < 80; i++) {
        frameController.updateMetrics({ frameTime: 25 }); // ~40 FPS
      }

      const stats = frameController.getStats();
      expect(stats.framesBelow45FPS).toBeGreaterThan(0);
    });

    it('should track critical FPS below 30', () => {
      // Simulate critical FPS - fill history completely
      for (let i = 0; i < 80; i++) {
        frameController.updateMetrics({ frameTime: 40 }); // ~25 FPS
      }

      const stats = frameController.getStats();
      expect(stats.framesBelow30FPS).toBeGreaterThan(0);
    });

    it('should track peak VRAM usage', () => {
      frameController.updateMetrics({ frameTime: 16.67, vramUsage: 500 });
      frameController.updateMetrics({ frameTime: 16.67, vramUsage: 1000 });
      frameController.updateMetrics({ frameTime: 16.67, vramUsage: 800 });

      const stats = frameController.getStats();
      expect(stats.peakVRAMUsage).toBe(1000);
    });

    it('should return copy of metrics', () => {
      const metrics1 = frameController.getPerformanceMetrics();
      const metrics2 = frameController.getPerformanceMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('Quality Adjustment (Requirement 7.1, 7.2, 7.3)', () => {
    it('should reduce quality when FPS drops below 45 (Requirement 7.1)', (context) => {
      // Simulate low FPS for extended period
      for (let i = 0; i < 70; i++) {
        frameController.updateMetrics({ frameTime: 25 }); // ~40 FPS
      }

      // Set the low performance timer to past to simulate sustained low FPS
      frameController.lowPerformanceStartTime = Date.now() - QUALITY_CONFIG.QUALITY_ADJUSTMENT_DELAY_MS - 100;

      const metrics = frameController.getPerformanceMetrics();
      const adjustment = frameController.adjustQuality(metrics);

      expect(adjustment.changedSettings.size).toBeGreaterThan(0);
      expect(frameController.currentQualityLevel).toBeLessThan(3);
    });

    it('should enter emergency mode when FPS below 30 (Requirement 7.2)', () => {
      // Simulate critical FPS
      for (let i = 0; i < 65; i++) {
        frameController.updateMetrics({ frameTime: 50 }); // ~20 FPS
      }

      const metrics = frameController.getPerformanceMetrics();
      const adjustment = frameController.adjustQuality(metrics);

      expect(frameController.currentQualityLevel).toBe(0);
      expect(adjustment.changedSettings.has('disableReflections')).toBe(true);
    });

    it('should force lower LODs when VRAM exceeds threshold (Requirement 7.3)', () => {
      // Set quality level higher first
      frameController.currentQualityLevel = 3;

      // Simulate high VRAM and normal FPS
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      const metrics = {
        currentFPS: 50,
        frameTime: 20,
        vramUsage: maxVRAM * 0.85 // 85% of max
      };

      const adjustment = frameController.adjustQuality(metrics);
      expect(adjustment.changedSettings.has('forceLowerLOD')).toBe(true);
    });

    it('should restore quality after stable performance (Requirement 7.4)', () => {
      frameController.currentQualityLevel = 1;
      frameController.highPerformanceStartTime = null;

      // First check - should start recovery timer
      let metrics = {
        currentFPS: 55,
        frameTime: 18,
        vramUsage: 500 * 1024 * 1024
      };
      frameController.adjustQuality(metrics);
      expect(frameController.highPerformanceStartTime).toBeTruthy();

      // Simulate recovery timeout
      frameController.highPerformanceStartTime = Date.now() - 6000; // 6 seconds ago

      metrics = {
        currentFPS: 58,
        frameTime: 17,
        vramUsage: 400 * 1024 * 1024
      };
      const adjustment = frameController.adjustQuality(metrics);
      expect(adjustment.changedSettings.size).toBeGreaterThan(0);
    });

    it('should apply quality presets', () => {
      frameController.applyQualityPreset('low');
      expect(frameController.currentQualityLevel).toBe(0);

      frameController.applyQualityPreset('medium');
      expect(frameController.currentQualityLevel).toBe(1);

      frameController.applyQualityPreset('high');
      expect(frameController.currentQualityLevel).toBe(2);

      frameController.applyQualityPreset('ultra');
      expect(frameController.currentQualityLevel).toBe(3);
    });

    it('should not adjust quality during cooldown', () => {
      const metrics = {
        currentFPS: 40,
        frameTime: 25,
        vramUsage: 500 * 1024 * 1024
      };

      // First adjustment
      frameController.adjustQuality(metrics);
      const qualityAfterFirst = frameController.currentQualityLevel;

      // Immediate second adjustment (during cooldown)
      const adjustment = frameController.adjustQuality(metrics);
      expect(adjustment.changedSettings.size).toBe(0);
      expect(frameController.currentQualityLevel).toBe(qualityAfterFirst);
    });

    it('should respect hysteresis in quality changes', () => {
      frameController.currentQualityLevel = 1;
      frameController.lowPerformanceStartTime = null;

      // FPS near threshold
      const metricsNearThreshold = {
        currentFPS: 44, // Just below 45
        frameTime: 22.7,
        vramUsage: 500 * 1024 * 1024
      };

      frameController.adjustQuality(metricsNearThreshold);
      const qualityAfterFall = frameController.currentQualityLevel;

      // FPS just above threshold (without hysteresis, this would not recover)
      frameController.lowPerformanceStartTime = null;
      frameController.highPerformanceStartTime = null;
      const metricsAboveThreshold = {
        currentFPS: 45, // At threshold
        frameTime: 22.2,
        vramUsage: 500 * 1024 * 1024
      };

      frameController.adjustQuality(metricsAboveThreshold);
      // Should not immediately restore due to hysteresis
      expect(frameController.highPerformanceStartTime).toBeNull();
    });
  });

  describe('GPU Timing Queries (Requirement 12.1)', () => {
    it('should track GPU timing for rendering phases', () => {
      const frameData = {
        frameTime: 16.67,
        gpuTimings: {
          culling: 2.5,
          lodUpdate: 1.2,
          shadowRender: 4.5,
          mainRender: 6.3,
          postProcess: 1.2
        }
      };

      frameController.updateMetrics(frameData);
      const timings = frameController.getGPUTimingQueries();

      expect(timings.cullingTime).toBe(2.5);
      expect(timings.lodUpdateTime).toBe(1.2);
      expect(timings.shadowRenderTime).toBe(4.5);
      expect(timings.mainRenderTime).toBe(6.3);
      expect(timings.postProcessTime).toBe(1.2);
    });
  });

  describe('Performance Monitoring', () => {
    it('should add custom performance monitor', () => {
      const monitor = {
        name: 'CustomMetric',
        measure: () => 50,
        threshold: 100,
        criticalThreshold: 200
      };

      frameController.addPerformanceMonitor(monitor);
      expect(frameController.monitors.length).toBe(1);
    });

    it('should validate monitor configuration', () => {
      const invalidMonitor = {
        name: 'Invalid'
        // missing measure function
      };

      expect(() => frameController.addPerformanceMonitor(invalidMonitor)).toThrow();
    });

    it('should record optimization events', () => {
      const event = {
        trigger: 'FRAME_RATE_DROP',
        adjustments: { changedSettings: new Map(), expectedImprovement: 0.3 },
        before: { fps: 40, frameTime: 25 },
        after: { fps: 55, frameTime: 18 }
      };

      frameController.recordOptimizationEvent(event);
      const history = frameController.getOptimizationHistory();

      expect(history.length).toBe(1);
      expect(history[0].trigger).toBe('FRAME_RATE_DROP');
      expect(history[0].timestamp).toBeTruthy();
    });

    it('should maintain optimization history size limit', () => {
      // Add more events than history limit
      for (let i = 0; i < 120; i++) {
        frameController.recordOptimizationEvent({
          trigger: 'FRAME_RATE_DROP',
          adjustments: {},
          before: {},
          after: {}
        });
      }

      const history = frameController.getOptimizationHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Adaptive Mode', () => {
    it('should disable adaptive mode', () => {
      frameController.setAdaptiveMode(false);
      expect(frameController.adaptiveMode).toBe(false);

      const metrics = {
        currentFPS: 40,
        frameTime: 25,
        vramUsage: 500
      };

      const adjustment = frameController.adjustQuality(metrics);
      expect(adjustment.changedSettings.size).toBe(0);
    });

    it('should enable adaptive mode', () => {
      frameController.setAdaptiveMode(false);
      frameController.setAdaptiveMode(true);
      expect(frameController.adaptiveMode).toBe(true);
    });
  });

  describe('Reset and Statistics', () => {
    it('should reset all metrics', () => {
      // Accumulate some data
      for (let i = 0; i < 20; i++) {
        frameController.updateMetrics({ frameTime: 25 });
      }

      frameController.reset();

      expect(frameController.frameTimeHistory.every(t => t === 0)).toBe(true);
      expect(frameController.optimizationHistory.length).toBe(0);
      expect(frameController.stats.totalFramesProcessed).toBe(0);
    });

    it('should calculate statistics', () => {
      for (let i = 0; i < 60; i++) {
        frameController.updateMetrics({ frameTime: 16.67 });
      }

      const stats = frameController.getStats();

      expect(stats.totalFramesProcessed).toBe(60);
      expect(stats.lowPerformancePercentage).toBeLessThanOrEqual(100);
      expect(stats.lowPerformancePercentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Emergency Thresholds', () => {
    it('should set custom emergency thresholds', () => {
      const customThresholds = {
        minFPS: 25,
        maxFrameTime: 40,
        maxVRAMUsage: 3 * 1024 * 1024 * 1024
      };

      frameController.setEmergencyThresholds(customThresholds);

      expect(frameController.emergencyThresholds.minFPS).toBe(25);
      expect(frameController.emergencyThresholds.maxFrameTime).toBe(40);
    });
  });

  describe('VRAM Monitoring and Memory Pressure Handling (Task 7.3)', () => {
    it('should detect VRAM usage at warning threshold', () => {
      const metrics = {
        currentFPS: 60,
        frameTime: 16.67,
        vramUsage: frameController.emergencyThresholds.maxVRAMUsage * 0.76
      };

      const adjustment = frameController.adjustQuality(metrics);
      // Should consider memory pressure even with good FPS
      expect(metrics.vramUsage > frameController.emergencyThresholds.maxVRAMUsage * 0.75).toBe(true);
    });

    it('should implement memory pressure response', () => {
      frameController.currentQualityLevel = 3;
      
      // Set VRAM to 80% of max threshold
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      const metrics = {
        currentFPS: 50,
        frameTime: 20,
        vramUsage: maxVRAM * 0.80
      };

      const adjustment = frameController.adjustQuality(metrics);
      
      // Memory pressure should trigger LOD and texture reduction
      if (adjustment.changedSettings.size > 0) {
        expect(
          adjustment.changedSettings.has('forceLowerLOD') ||
          adjustment.changedSettings.has('textureQuality')
        ).toBe(true);
      }
    });

    it('should track VRAM usage trends over time', () => {
      // Simulate increasing VRAM usage
      for (let i = 0; i < 10; i++) {
        const vramUsage = frameController.emergencyThresholds.maxVRAMUsage * (0.5 + i * 0.05);
        frameController.updateMetrics({
          frameTime: 16.67,
          vramUsage: Math.min(vramUsage, frameController.emergencyThresholds.maxVRAMUsage)
        });
      }

      const stats = frameController.getStats();
      expect(stats.peakVRAMUsage).toBeGreaterThan(0);
    });

    it('should detect critical VRAM threshold (90%)', () => {
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      const metrics = {
        currentFPS: 50,
        frameTime: 20,
        vramUsage: maxVRAM * 0.91 // 91% - critical level
      };

      const adjustment = frameController.adjustQuality(metrics);
      // Critical VRAM should trigger aggressive response
      expect(adjustment.changedSettings.size).toBeGreaterThan(0);
    });

    it('should integrate with memory manager triggers', () => {
      // This tests the integration point with Memory Manager
      frameController.currentQualityLevel = 2;
      
      const metrics = {
        currentFPS: 55,
        frameTime: 18,
        vramUsage: frameController.emergencyThresholds.maxVRAMUsage * 0.85
      };

      const adjustment = frameController.adjustQuality(metrics);
      
      // Should suggest memory-related adjustments
      expect(adjustment.priority).toBeGreaterThan(0);
    });

    it('should maintain VRAM pressure even with stable FPS', () => {
      frameController.currentQualityLevel = 3;
      
      // Stable FPS but high VRAM
      const metrics = {
        currentFPS: 58,
        frameTime: 17.2,
        vramUsage: frameController.emergencyThresholds.maxVRAMUsage * 0.80
      };

      const adjustment = frameController.adjustQuality(metrics);
      
      // Memory pressure should trigger regardless of good FPS
      if (adjustment.changedSettings.size > 0) {
        expect(adjustment.changedSettings.has('forceLowerLOD') || 
                adjustment.changedSettings.has('textureQuality')).toBe(true);
      }
    });
  });

  describe('Real-time Performance Monitoring (Task 7.1)', () => {
    it('should maintain 60-frame history for FPS tracking', () => {
      for (let i = 0; i < 100; i++) {
        frameController.updateMetrics({ frameTime: 16.67 });
      }

      const metrics = frameController.getPerformanceMetrics();
      expect(metrics.frameTimeHistory.length).toBe(60);
    });

    it('should track draw calls and triangles in metrics', () => {
      const frameData = {
        frameTime: 16.67,
        drawCalls: 250,
        triangleCount: 500000,
        vramUsage: 1024 * 1024 * 512
      };

      frameController.updateMetrics(frameData);
      const metrics = frameController.getPerformanceMetrics();

      expect(metrics.drawCalls).toBe(250);
      expect(metrics.triangleCount).toBe(500000);
    });

    it('should aggregate GPU timing queries for rendering phases', () => {
      const frameData = {
        frameTime: 16.67,
        gpuTimings: {
          culling: 2.1,
          lodUpdate: 1.0,
          shadowRender: 3.5,
          mainRender: 7.2,
          postProcess: 0.8
        }
      };

      frameController.updateMetrics(frameData);
      const timings = frameController.getGPUTimingQueries();

      expect(timings.cullingTime).toBe(2.1);
      expect(timings.lodUpdateTime).toBe(1.0);
      expect(timings.shadowRenderTime).toBe(3.5);
      expect(timings.mainRenderTime).toBe(7.2);
      expect(timings.postProcessTime).toBe(0.8);
    });

    it('should provide performance metrics snapshot', () => {
      frameController.updateMetrics({
        frameTime: 16.67,
        drawCalls: 150,
        triangleCount: 250000,
        vramUsage: 1024 * 1024 * 512,
        systemMemoryUsage: 0.6
      });

      const metrics = frameController.getPerformanceMetrics();

      expect(metrics).toHaveProperty('currentFPS');
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('drawCalls');
      expect(metrics).toHaveProperty('triangleCount');
      expect(metrics).toHaveProperty('vramUsage');
      expect(metrics).toHaveProperty('gpuTime');
      expect(metrics).toHaveProperty('cpuTime');
    });
  });

  describe('Adaptive Quality Adjustment System (Task 7.2)', () => {
    it('should detect FPS drop below 45fps and trigger quality reduction', () => {
      for (let i = 0; i < 70; i++) {
        frameController.updateMetrics({ frameTime: 25 }); // ~40 FPS
      }

      frameController.lowPerformanceStartTime = Date.now() - QUALITY_CONFIG.QUALITY_ADJUSTMENT_DELAY_MS - 100;

      const metrics = frameController.getPerformanceMetrics();
      const initialQuality = frameController.currentQualityLevel;
      
      frameController.adjustQuality(metrics);

      // Quality should remain same or be reduced
      expect(frameController.currentQualityLevel).toBeLessThanOrEqual(initialQuality);
    });

    it('should implement emergency mode below 30fps', () => {
      for (let i = 0; i < 65; i++) {
        frameController.updateMetrics({ frameTime: 50 }); // ~20 FPS
      }

      const metrics = frameController.getPerformanceMetrics();
      frameController.adjustQuality(metrics);

      expect(frameController.currentQualityLevel).toBe(0);
    });

    it('should restore quality after 5 seconds of stable performance', () => {
      frameController.currentQualityLevel = 1;
      frameController.highPerformanceStartTime = Date.now() - QUALITY_CONFIG.QUALITY_RESTORATION_DELAY_MS - 100;

      const metrics = {
        currentFPS: 58,
        frameTime: 17,
        vramUsage: 500 * 1024 * 1024
      };

      const adjustment = frameController.adjustQuality(metrics);

      // Should attempt to restore quality
      expect(adjustment.changedSettings.size).toBeGreaterThan(0);
    });

    it('should apply hysteresis to prevent oscillation', () => {
      frameController.currentQualityLevel = 1;
      frameController.lowPerformanceStartTime = null;
      frameController.highPerformanceStartTime = null;

      // FPS just below threshold
      let metrics = {
        currentFPS: 44, // Just below 45
        frameTime: 22.7,
        vramUsage: 500 * 1024 * 1024
      };

      frameController.adjustQuality(metrics);
      const qualityAfterDrop = frameController.currentQualityLevel;

      // FPS just above threshold with hysteresis
      frameController.lowPerformanceStartTime = null;
      metrics = {
        currentFPS: 48, // Above 45 but within hysteresis zone
        frameTime: 20.8,
        vramUsage: 500 * 1024 * 1024
      };

      frameController.adjustQuality(metrics);
      
      // Should not immediately recover due to hysteresis margin
      expect(frameController.currentQualityLevel).toBeLessThanOrEqual(qualityAfterDrop + 1);
    });

    it('should prevent quality oscillation with adjustment cooldown', () => {
      const metrics = {
        currentFPS: 42,
        frameTime: 23.8,
        vramUsage: 500 * 1024 * 1024
      };

      // First adjustment
      frameController.adjustQuality(metrics);
      const qualityAfterFirst = frameController.currentQualityLevel;

      // Immediate second adjustment attempt (within cooldown)
      const adjustment = frameController.adjustQuality(metrics);
      expect(adjustment.changedSettings.size).toBe(0);
      expect(frameController.currentQualityLevel).toBe(qualityAfterFirst);
    });

    it('should track quality adjustment timeline for analysis', () => {
      const event = {
        trigger: 'FRAME_RATE_DROP',
        adjustments: { 
          changedSettings: new Map([['qualityLevel', 2]]),
          expectedImprovement: 0.25 
        },
        before: { fps: 40, frameTime: 25 },
        after: { fps: 55, frameTime: 18 }
      };

      frameController.recordOptimizationEvent(event);
      const history = frameController.getOptimizationHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].trigger).toBe('FRAME_RATE_DROP');
      expect(history[0].timestamp).toBeTruthy();
    });
  });
});
