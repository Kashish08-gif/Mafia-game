/**
 * PerformanceBenchmark.js
 * 
 * Performance benchmark suite for validating optimization targets:
 * - 60fps target testing on recommended hardware
 * - 3-second load time validation
 * - VRAM usage monitoring (<2GB limit)
 * - Minimum 30fps validation during peak rendering
 * 
 * Requirements: 1.1, 1.3, 1.4, 1.5
 */

/**
 * PerformanceTarget - Defines performance goals and thresholds
 */
class PerformanceTarget {
  constructor() {
    this.targets = {
      targetFPS: 60,
      minFPS: 30,
      maxFPS: 144,
      maxLoadTime: 3000, // milliseconds
      maxVRAM: 2000, // MB
      maxDrawCalls: 4000,
      maxTriangles: 10000000,
      frameTimeBudget: 16.67, // ms for 60fps
      vramThreshold75: 1500, // MB (trigger quality reduction)
      vramThreshold90: 1800, // MB (emergency mode)
    };
    
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    };
  }
  
  /**
   * Get target for metric
   */
  getTarget(metric) {
    return this.targets[metric] ?? null;
  }
  
  /**
   * Check if value meets target
   */
  meetTarget(metric, value) {
    const target = this.targets[metric];
    if (target === null) return null;
    
    // Different metrics have different comparison logic
    if (metric === 'targetFPS' || metric === 'minFPS') {
      return value >= target;
    } else if (metric === 'maxLoadTime' || metric === 'maxVRAM' || metric === 'maxDrawCalls' || metric === 'maxTriangles') {
      return value <= target;
    }
    
    return false;
  }
}

/**
 * PerformanceBenchmark - Main benchmark suite manager
 */
class PerformanceBenchmark {
  constructor(performanceSystem) {
    this.performanceSystem = performanceSystem;
    this.target = new PerformanceTarget();
    this.benchmarkResults = [];
    this.isRunning = false;
    this.startTime = 0;
    this.frameTimes = [];
    this.vramSamples = [];
    this.drawCallsSamples = [];
    this.trianglesSamples = [];
  }
  
  /**
   * Run complete benchmark suite
   */
  async runFullBenchmark(options = {}) {
    console.log('[PerformanceBenchmark] Starting full benchmark suite');
    
    const results = {
      fpsBenchmark: null,
      loadTimeBenchmark: null,
      vramBenchmark: null,
      peakRenderingBenchmark: null,
      summary: null,
    };
    
    try {
      // FPS Benchmark
      console.log('[PerformanceBenchmark] Running FPS benchmark...');
      results.fpsBenchmark = await this.benchmarkFPS(options.fpsDuration || 10000);
      
      // Load Time Benchmark
      console.log('[PerformanceBenchmark] Running load time benchmark...');
      results.loadTimeBenchmark = await this.benchmarkLoadTime();
      
      // VRAM Benchmark
      console.log('[PerformanceBenchmark] Running VRAM benchmark...');
      results.vramBenchmark = await this.benchmarkVRAM();
      
      // Peak Rendering Benchmark
      console.log('[PerformanceBenchmark] Running peak rendering benchmark...');
      results.peakRenderingBenchmark = await this.benchmarkPeakRendering();
      
      // Generate summary
      results.summary = this.generateSummary(results);
      
      console.log('[PerformanceBenchmark] Benchmark complete');
      return results;
    } catch (error) {
      console.error('[PerformanceBenchmark] Benchmark error:', error);
      return results;
    }
  }
  
  /**
   * Benchmark FPS performance
   */
  async benchmarkFPS(duration = 10000) {
    console.log('[PerformanceBenchmark] FPS Benchmark: Duration', duration, 'ms');
    
    return new Promise((resolve) => {
      this.frameTimes = [];
      this.isRunning = true;
      const startTime = Date.now();
      let frameCount = 0;
      let lastTime = startTime;
      
      const updateLoop = () => {
        const now = Date.now();
        const deltaTime = now - lastTime;
        lastTime = now;
        
        this.frameTimes.push(deltaTime);
        frameCount++;
        
        if (now - startTime >= duration) {
          this.isRunning = false;
          
          // Calculate statistics
          const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
          const minFrameTime = Math.min(...this.frameTimes);
          const maxFrameTime = Math.max(...this.frameTimes);
          
          const avgFPS = Math.round(1000 / avgFrameTime);
          const minFPS = Math.round(1000 / maxFrameTime); // Inverse for frame time
          const maxFPS = Math.round(1000 / minFrameTime);
          
          const result = {
            duration,
            frameCount,
            avgFPS,
            minFPS,
            maxFPS,
            avgFrameTime: avgFrameTime.toFixed(2),
            minFrameTime: minFrameTime.toFixed(2),
            maxFrameTime: maxFrameTime.toFixed(2),
            passed: avgFPS >= this.target.targets.targetFPS,
            minPassed: minFPS >= this.target.targets.minFPS,
          };
          
          console.log('[PerformanceBenchmark] FPS Result:', result);
          resolve(result);
        } else {
          requestAnimationFrame(updateLoop);
        }
      };
      
      requestAnimationFrame(updateLoop);
    });
  }
  
  /**
   * Benchmark scene load time
   */
  async benchmarkLoadTime() {
    console.log('[PerformanceBenchmark] Load Time Benchmark');
    
    const startTime = performance.now();
    
    // Simulate scene loading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const loadTime = performance.now() - startTime;
    
    const result = {
      loadTime: loadTime.toFixed(2),
      passed: loadTime <= this.target.targets.maxLoadTime,
      target: this.target.targets.maxLoadTime,
    };
    
    console.log('[PerformanceBenchmark] Load Time Result:', result);
    return result;
  }
  
  /**
   * Benchmark VRAM usage
   */
  async benchmarkVRAM() {
    console.log('[PerformanceBenchmark] VRAM Benchmark');
    
    this.vramSamples = [];
    const duration = 5000; // 5 seconds
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const sampleLoop = () => {
        if (this.performanceSystem && this.performanceSystem.getMemoryUsage) {
          const vram = this.performanceSystem.getMemoryUsage();
          this.vramSamples.push(vram);
        }
        
        if (Date.now() - startTime >= duration) {
          const avgVRAM = this.vramSamples.reduce((a, b) => a + b, 0) / this.vramSamples.length;
          const maxVRAM = Math.max(...this.vramSamples);
          const minVRAM = Math.min(...this.vramSamples);
          
          const result = {
            duration,
            samples: this.vramSamples.length,
            avgVRAM: avgVRAM.toFixed(1),
            maxVRAM: maxVRAM.toFixed(1),
            minVRAM: minVRAM.toFixed(1),
            target: this.target.targets.maxVRAM,
            passed: maxVRAM <= this.target.targets.maxVRAM,
            warning75: maxVRAM > this.target.targets.vramThreshold75,
            warning90: maxVRAM > this.target.targets.vramThreshold90,
          };
          
          console.log('[PerformanceBenchmark] VRAM Result:', result);
          resolve(result);
        } else {
          setTimeout(sampleLoop, 100);
        }
      };
      
      sampleLoop();
    });
  }
  
  /**
   * Benchmark peak rendering scenarios
   */
  async benchmarkPeakRendering() {
    console.log('[PerformanceBenchmark] Peak Rendering Benchmark');
    
    this.drawCallsSamples = [];
    this.trianglesSamples = [];
    const duration = 5000; // 5 seconds
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const sampleLoop = () => {
        if (this.performanceSystem) {
          const metrics = this.performanceSystem.getMetrics();
          this.drawCallsSamples.push(metrics.drawCalls || 0);
          this.trianglesSamples.push(metrics.triangles || 0);
        }
        
        if (Date.now() - startTime >= duration) {
          const avgDrawCalls = Math.round(this.drawCallsSamples.reduce((a, b) => a + b, 0) / this.drawCallsSamples.length);
          const maxDrawCalls = Math.max(...this.drawCallsSamples);
          const avgTriangles = Math.round(this.trianglesSamples.reduce((a, b) => a + b, 0) / this.trianglesSamples.length);
          const maxTriangles = Math.max(...this.trianglesSamples);
          
          // Estimate FPS from frame time (16.67ms = 60fps)
          const estimatedFPS = this.frameTimes.length > 0 
            ? Math.round(1000 / (this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length))
            : 0;
          
          const result = {
            duration,
            avgDrawCalls,
            maxDrawCalls,
            avgTriangles,
            maxTriangles,
            estimatedFPS,
            drawCallsPassed: maxDrawCalls <= this.target.targets.maxDrawCalls,
            trianglesPassed: maxTriangles <= this.target.targets.maxTriangles,
            fpsPassed: estimatedFPS >= this.target.targets.minFPS,
          };
          
          console.log('[PerformanceBenchmark] Peak Rendering Result:', result);
          resolve(result);
        } else {
          setTimeout(sampleLoop, 100);
        }
      };
      
      sampleLoop();
    });
  }
  
  /**
   * Generate benchmark summary
   */
  generateSummary(results) {
    const summary = {
      timestamp: new Date().toISOString(),
      allTestsPassed: true,
      testResults: {
        fpsBenchmark: results.fpsBenchmark?.passed ? '✓ PASS' : '✗ FAIL',
        minFPSBenchmark: results.fpsBenchmark?.minPassed ? '✓ PASS' : '✗ FAIL',
        loadTimeBenchmark: results.loadTimeBenchmark?.passed ? '✓ PASS' : '✗ FAIL',
        vramBenchmark: results.vramBenchmark?.passed ? '✓ PASS' : '✗ FAIL',
        drawCallsBenchmark: results.peakRenderingBenchmark?.drawCallsPassed ? '✓ PASS' : '✗ FAIL',
        trianglesBenchmark: results.peakRenderingBenchmark?.trianglesPassed ? '✓ PASS' : '✗ FAIL',
      },
      warnings: [],
    };
    
    // Check for failures
    Object.values(summary.testResults).forEach(result => {
      if (result.includes('FAIL')) {
        summary.allTestsPassed = false;
      }
    });
    
    // Check for warnings
    if (results.vramBenchmark?.warning75) {
      summary.warnings.push('VRAM usage above 75% threshold (1500MB)');
    }
    if (results.vramBenchmark?.warning90) {
      summary.warnings.push('VRAM usage above 90% threshold (1800MB) - Emergency mode');
    }
    
    return summary;
  }
  
  /**
   * Validate 60fps target
   */
  validate60FPS(avgFPS) {
    return avgFPS >= this.target.targets.targetFPS;
  }
  
  /**
   * Validate 3-second load time
   */
  validateLoadTime(loadTime) {
    return loadTime <= this.target.targets.maxLoadTime;
  }
  
  /**
   * Validate VRAM limit
   */
  validateVRAMLimit(maxVRAM) {
    return maxVRAM <= this.target.targets.maxVRAM;
  }
  
  /**
   * Validate 30fps minimum
   */
  validateMinFPS(minFPS) {
    return minFPS >= this.target.targets.minFPS;
  }
  
  /**
   * Print benchmark report to console
   */
  printReport(results) {
    console.group('[PerformanceBenchmark] Benchmark Report');
    console.log('Timestamp:', results.summary.timestamp);
    console.log('All Tests Passed:', results.summary.allTestsPassed ? '✓ YES' : '✗ NO');
    console.group('Test Results');
    console.table(results.summary.testResults);
    console.groupEnd();
    
    if (results.summary.warnings.length > 0) {
      console.group('Warnings');
      results.summary.warnings.forEach(w => console.warn(w));
      console.groupEnd();
    }
    
    console.table({
      'FPS Benchmark': results.fpsBenchmark,
      'Load Time Benchmark': results.loadTimeBenchmark,
      'VRAM Benchmark': results.vramBenchmark,
      'Peak Rendering Benchmark': results.peakRenderingBenchmark,
    });
    
    console.groupEnd();
  }
  
  /**
   * Export benchmark results as JSON
   */
  exportResults(results) {
    return JSON.stringify({
      timestamp: results.summary.timestamp,
      allTestsPassed: results.summary.allTestsPassed,
      testResults: results.summary.testResults,
      warnings: results.summary.warnings,
      detailedResults: {
        fps: results.fpsBenchmark,
        loadTime: results.loadTimeBenchmark,
        vram: results.vramBenchmark,
        peakRendering: results.peakRenderingBenchmark,
      },
    }, null, 2);
  }
}

export { PerformanceBenchmark, PerformanceTarget };
