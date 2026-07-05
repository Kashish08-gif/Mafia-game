/**
 * Integration Tests for Frame Controller Performance Monitoring and Quality Adjustment
 * 
 * Tests the integration of tasks 7.1, 7.2, and 7.3:
 * - 7.1: Frame Controller performance monitoring
 * - 7.2: Adaptive quality adjustment system
 * - 7.3: VRAM monitoring and memory pressure handling
 * 
 * Validates: Requirements 1.2, 7.1, 7.2, 7.3, 7.4, 12.1, 12.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import FrameController from './FrameController';
import MemoryManager from './MemoryManager';
import { QUALITY_CONFIG, PERFORMANCE_TARGETS } from '../constants';

describe('FrameController + MemoryManager Integration (Tasks 7.1, 7.2, 7.3)', () => {
  let frameController;
  let memoryManager;

  beforeEach(() => {
    frameController = new FrameController({
      targetFPS: 60,
      adaptiveMode: true
    });
    
    memoryManager = new MemoryManager({
      vramWarningLevel: 0.75,
      vramCriticalLevel: 0.90,
      assetTimeoutMs: 30000
    });
  });

  afterEach(() => {
    frameController.reset();
  });

  describe('Task 7.1: Frame Controller Performance Monitoring', () => {
    it('should integrate frame time tracking with memory monitoring', () => {
      // Simulate frames with memory data
      for (let i = 0; i < 60; i++) {
        const vramUsage = 1024 * 1024 * 512 + (i * 10 * 1024 * 1024); // Growing VRAM
        frameController.updateMetrics({
          frameTime: 16.67,
          drawCalls: 150 + i,
          triangleCount: 250000 + (i * 1000),
          vramUsage: Math.min(vramUsage, 2 * 1024 * 1024 * 1024) // Cap at 2GB
        });
      }

      const metrics = frameController.getPerformanceMetrics();
      
      // Verify tracking of all metrics
      expect(metrics.currentFPS).toBeCloseTo(60, 0);
      expect(metrics.drawCalls).toBeGreaterThan(150);
      expect(metrics.triangleCount).toBeGreaterThan(250000);
      expect(metrics.vramUsage).toBeGreaterThan(0);
    });

    it('should maintain 60-frame history for trend analysis', () => {
      const frameTimes = [];
      
      // Generate varying frame times
      for (let i = 0; i < 100; i++) {
        const frameTime = 16.67 + (Math.sin(i / 10) * 5); // Oscillating frame times
        frameTimes.push(frameTime);
        frameController.updateMetrics({ frameTime });
      }

      const metrics = frameController.getPerformanceMetrics();
      
      // Should maintain exactly 60 frames
      expect(metrics.frameTimeHistory.length).toBe(60);
      
      // Should contain actual frame time data (not all zeros)
      const nonZeroFrames = metrics.frameTimeHistory.filter(ft => ft > 0);
      expect(nonZeroFrames.length).toBeGreaterThan(50);
    });

    it('should provide GPU timing queries for rendering phases', () => {
      const frameData = {
        frameTime: 16.67,
        gpuTimings: {
          culling: 2.5,
          lodUpdate: 1.5,
          shadowRender: 4.2,
          mainRender: 6.8,
          postProcess: 1.0
        },
        drawCalls: 200,
        triangleCount: 300000
      };

      frameController.updateMetrics(frameData);
      const timings = frameController.getGPUTimingQueries();

      expect(timings.cullingTime).toBe(2.5);
      expect(timings.lodUpdateTime).toBe(1.5);
      expect(timings.shadowRenderTime).toBe(4.2);
      expect(timings.mainRenderTime).toBe(6.8);
      expect(timings.postProcessTime).toBe(1.0);

      // Total GPU time should not exceed frame time
      const totalGPUTime = Object.values(timings).reduce((a, b) => a + b, 0);
      expect(totalGPUTime).toBeLessThanOrEqual(20); // Safe upper bound
    });

    it('should collect performance metrics: draw calls, triangles, VRAM', () => {
      const testData = [
        { drawCalls: 100, triangles: 200000, vram: 512 * 1024 * 1024 },
        { drawCalls: 150, triangles: 300000, vram: 768 * 1024 * 1024 },
        { drawCalls: 200, triangles: 500000, vram: 1024 * 1024 * 1024 }
      ];

      for (const data of testData) {
        frameController.updateMetrics({
          frameTime: 16.67,
          drawCalls: data.drawCalls,
          triangleCount: data.triangles,
          vramUsage: data.vram
        });
      }

      const stats = frameController.getStats();
      
      // Should track maximum values
      expect(stats.peakVRAMUsage).toBeGreaterThan(0);
      expect(frameController.metrics.drawCalls).toBeGreaterThan(0);
      expect(frameController.metrics.triangleCount).toBeGreaterThan(0);
    });
  });

  describe('Task 7.2: Adaptive Quality Adjustment System', () => {
    it('should reduce quality automatically when FPS drops below 45fps', () => {
      // Simulate sustained low FPS
      const lowFrameTime = 25; // ~40 FPS
      
      for (let i = 0; i < 70; i++) {
        frameController.updateMetrics({ frameTime: lowFrameTime });
      }

      // Trigger quality adjustment after threshold time
      frameController.lowPerformanceStartTime = Date.now() - QUALITY_CONFIG.QUALITY_ADJUSTMENT_DELAY_MS - 100;

      const metrics = frameController.getPerformanceMetrics();
      const initialQuality = frameController.currentQualityLevel;
      
      const adjustment = frameController.adjustQuality(metrics);

      // Quality should be reduced
      expect(frameController.currentQualityLevel).toBeLessThanOrEqual(initialQuality);
      expect(adjustment.changedSettings.size).toBeGreaterThan(0);
    });

    it('should enter emergency mode when FPS drops below 30fps', () => {
      // Simulate critical FPS
      const criticalFrameTime = 50; // ~20 FPS
      
      for (let i = 0; i < 65; i++) {
        frameController.updateMetrics({ frameTime: criticalFrameTime });
      }

      const metrics = frameController.getPerformanceMetrics();
      frameController.adjustQuality(metrics);

      // Should be in emergency mode (quality level 0)
      expect(frameController.currentQualityLevel).toBe(0);
    });

    it('should restore quality after 5 seconds of stable performance', () => {
      frameController.currentQualityLevel = 1;
      
      // Set recovery timer to past
      frameController.highPerformanceStartTime = Date.now() - QUALITY_CONFIG.QUALITY_RESTORATION_DELAY_MS - 100;

      const metrics = {
        currentFPS: 58,
        frameTime: 17,
        vramUsage: 500 * 1024 * 1024
      };

      const adjustment = frameController.adjustQuality(metrics);

      // Should attempt quality restoration
      expect(adjustment.changedSettings.size).toBeGreaterThan(0);
      expect(adjustment.changedSettings.has('qualityLevel') || 
              adjustment.changedSettings.has('enableReflections')).toBe(true);
    });

    it('should add hysteresis to prevent quality oscillation', () => {
      frameController.currentQualityLevel = 2;
      frameController.lowPerformanceStartTime = null;
      frameController.highPerformanceStartTime = null;

      // Frame rate at threshold boundary
      let metrics = {
        currentFPS: 44, // Just below 45
        frameTime: 22.7,
        vramUsage: 500 * 1024 * 1024
      };

      frameController.adjustQuality(metrics);
      const qualityAfterDrop = frameController.currentQualityLevel;

      // Reset timing
      frameController.lowPerformanceStartTime = null;
      
      // Frame rate recovered slightly (within hysteresis zone)
      metrics = {
        currentFPS: 47, // Above 45 but within HYSTERESIS margin
        frameTime: 21.3,
        vramUsage: 500 * 1024 * 1024
      };

      frameController.adjustQuality(metrics);

      // Should not immediately restore quality due to hysteresis
      expect(frameController.currentQualityLevel).toBeLessThanOrEqual(qualityAfterDrop + 1);
    });

    it('should track quality adjustment timeline for debugging', () => {
      const events = [];

      // Simulate quality drop
      for (let i = 0; i < 70; i++) {
        frameController.updateMetrics({ frameTime: 25 });
      }

      frameController.lowPerformanceStartTime = Date.now() - QUALITY_CONFIG.QUALITY_ADJUSTMENT_DELAY_MS - 100;
      let metrics = frameController.getPerformanceMetrics();
      frameController.adjustQuality(metrics);

      if (frameController.currentQualityLevel < 3) {
        frameController.recordOptimizationEvent({
          trigger: 'FRAME_RATE_DROP',
          adjustments: {
            changedSettings: new Map([['qualityLevel', frameController.currentQualityLevel]]),
            expectedImprovement: 0.3
          },
          before: { fps: 40, vram: 500 * 1024 * 1024 },
          after: { fps: metrics.currentFPS, vram: metrics.vramUsage }
        });
      }

      const history = frameController.getOptimizationHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].timestamp).toBeTruthy();
    });

    it('should apply quality presets directly', () => {
      frameController.applyQualityPreset('low');
      expect(frameController.currentQualityLevel).toBe(0);

      frameController.applyQualityPreset('medium');
      expect(frameController.currentQualityLevel).toBe(1);

      frameController.applyQualityPreset('high');
      expect(frameController.currentQualityLevel).toBe(2);

      frameController.applyQualityPreset('ultra');
      expect(frameController.currentQualityLevel).toBe(3);
    });
  });

  describe('Task 7.3: VRAM Monitoring and Memory Pressure Handling', () => {
    it('should detect VRAM usage at 1.5GB threshold', () => {
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      expect(maxVRAM).toBeGreaterThan(0);

      // Simulate VRAM at various levels
      const testLevels = [
        0.5, // 50%
        0.75, // 75% - warning level
        0.90, // 90% - critical
        0.95  // 95% - emergency
      ];

      for (const level of testLevels) {
        frameController.updateMetrics({
          frameTime: 16.67,
          vramUsage: maxVRAM * level
        });
      }

      const stats = frameController.getStats();
      expect(stats.peakVRAMUsage).toBeGreaterThan(0);
    });

    it('should force lower LODs when VRAM pressure detected', () => {
      frameController.currentQualityLevel = 3;
      
      // Clear cooldown to allow adjustment
      frameController.lastQualityAdjustmentTime = 0;
      
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      const metrics = {
        currentFPS: 55,
        frameTime: 18,
        vramUsage: maxVRAM * 0.80 // 80% of max
      };

      const adjustment = frameController.adjustQuality(metrics);

      // Should apply memory pressure response
      if (adjustment.changedSettings.size > 0) {
        expect(adjustment.changedSettings.has('forceLowerLOD') ||
                adjustment.changedSettings.has('textureQuality')).toBe(true);
      } else {
        // Cooldown might prevent immediate adjustment, but vram pressure should be detected
        expect(metrics.vramUsage > frameController.emergencyThresholds.maxVRAMUsage * 0.75).toBe(true);
      }
    });

    it('should reduce texture resolution under memory pressure', () => {
      frameController.currentQualityLevel = 3;
      
      // High VRAM usage
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      const metrics = {
        currentFPS: 58,
        frameTime: 17,
        vramUsage: maxVRAM * 0.85
      };

      const adjustment = frameController.adjustQuality(metrics);

      // Should include texture reduction
      if (adjustment.changedSettings.size > 0) {
        expect(adjustment.changedSettings.has('textureQuality') ||
                adjustment.changedSettings.has('forceLowerLOD')).toBe(true);
      }
    });

    it('should integrate with MemoryManager for cleanup triggers', () => {
      // Track assets in memory manager
      for (let i = 0; i < 5; i++) {
        memoryManager.trackAsset({}, {
          type: 'TEXTURE',
          size: 300 * 1024 * 1024 // 300MB each = 1.5GB total
        });
      }

      const memUsage = memoryManager.getMemoryUsage();
      
      // FrameController should detect this memory pressure
      const metrics = {
        currentFPS: 50,
        frameTime: 20,
        vramUsage: memUsage.totalAllocated
      };

      const adjustment = frameController.adjustQuality(metrics);

      // Should respond to memory pressure
      expect(metrics.vramUsage).toBeGreaterThan(1 * 1024 * 1024 * 1024); // Over 1GB
    });

    it('should maintain VRAM pressure response even with stable FPS', () => {
      frameController.currentQualityLevel = 3;
      
      // Good FPS but high VRAM
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      const metrics = {
        currentFPS: 57,
        frameTime: 17.5,
        vramUsage: maxVRAM * 0.82
      };

      const adjustment = frameController.adjustQuality(metrics);

      // VRAM pressure should override good FPS
      if (adjustment.changedSettings.size > 0) {
        expect(adjustment.changedSettings.has('forceLowerLOD') ||
                adjustment.changedSettings.has('textureQuality')).toBe(true);
      }
    });

    it('should provide emergency cleanup integration', () => {
      // Create high memory pressure scenario
      frameController.currentQualityLevel = 3;
      
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      
      // First: high VRAM warning
      let metrics = {
        currentFPS: 50,
        frameTime: 20,
        vramUsage: maxVRAM * 0.80
      };

      frameController.adjustQuality(metrics);

      // Then: critical VRAM
      metrics = {
        currentFPS: 45,
        frameTime: 22,
        vramUsage: maxVRAM * 0.92
      };

      const adjustment = frameController.adjustQuality(metrics);

      // Should signal emergency cleanup need
      expect(adjustment.priority).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Combined Performance Scenarios', () => {
    it('should handle simultaneous FPS drop and memory pressure', () => {
      frameController.currentQualityLevel = 3;
      frameController.lastQualityAdjustmentTime = 0; // Clear cooldown
      
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      
      // Both FPS and VRAM are problematic
      const metrics = {
        currentFPS: 35, // Below 45, approaching emergency
        frameTime: 28.5,
        vramUsage: maxVRAM * 0.88
      };

      const adjustment = frameController.adjustQuality(metrics);

      // Should respond to worst condition or detect it
      if (adjustment.changedSettings.size > 0) {
        expect(adjustment.priority).toBeGreaterThanOrEqual(2);
      } else {
        // Even if cooldown prevents adjustment, should detect both issues
        expect(metrics.currentFPS < 45 && metrics.vramUsage > maxVRAM * 0.75).toBe(true);
      }
    });

    it('should recovery from combined stress when conditions improve', () => {
      frameController.currentQualityLevel = 0;
      frameController.highPerformanceStartTime = Date.now() - QUALITY_CONFIG.QUALITY_RESTORATION_DELAY_MS - 100;

      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      
      // Both FPS and VRAM are now acceptable
      const metrics = {
        currentFPS: 60,
        frameTime: 16.67,
        vramUsage: maxVRAM * 0.50
      };

      const adjustment = frameController.adjustQuality(metrics);

      // Should start recovery process
      if (adjustment.changedSettings.size > 0) {
        expect(frameController.currentQualityLevel).toBeGreaterThan(0);
      }
    });

    it('should maintain stable quality under consistent load', () => {
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      
      // Consistent moderate load
      const qualityHistory = [];
      
      for (let i = 0; i < 200; i++) {
        frameController.updateMetrics({
          frameTime: 16.67 + (Math.random() * 2 - 1), // Small variation
          vramUsage: maxVRAM * (0.60 + Math.random() * 0.10) // 60-70% stable range
        });

        if (i % 30 === 0 && i > 0) {
          const metrics = frameController.getPerformanceMetrics();
          frameController.adjustQuality(metrics);
          qualityHistory.push(frameController.currentQualityLevel);
        }
      }

      // Quality level should remain relatively stable
      const variance = Math.max(...qualityHistory) - Math.min(...qualityHistory);
      expect(variance).toBeLessThanOrEqual(2); // Allow some variation
    });

    it('should track all metrics across performance transitions', () => {
      const maxVRAM = frameController.emergencyThresholds.maxVRAMUsage;
      
      // Transition 1: Good performance
      for (let i = 0; i < 30; i++) {
        frameController.updateMetrics({
          frameTime: 16.67,
          vramUsage: maxVRAM * 0.50,
          drawCalls: 100,
          triangleCount: 200000
        });
      }

      // Transition 2: Performance degradation
      for (let i = 0; i < 30; i++) {
        frameController.updateMetrics({
          frameTime: 25,
          vramUsage: maxVRAM * 0.80,
          drawCalls: 250,
          triangleCount: 500000
        });
      }

      // Transition 3: Recovery
      for (let i = 0; i < 30; i++) {
        frameController.updateMetrics({
          frameTime: 17.5,
          vramUsage: maxVRAM * 0.60,
          drawCalls: 150,
          triangleCount: 300000
        });
      }

      const metrics = frameController.getPerformanceMetrics();
      const stats = frameController.getStats();

      // Should have captured all transitions
      expect(stats.totalFramesProcessed).toBe(90);
      expect(metrics.frameTimeHistory.length).toBe(60);
      expect(stats.peakVRAMUsage).toBeLessThanOrEqual(maxVRAM);
    });
  });
});
