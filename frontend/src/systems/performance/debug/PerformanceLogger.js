/**
 * PerformanceLogger.js
 * 
 * Manages detailed performance logging and optimization history tracking:
 * - Detailed timing logs for all performance drops with baseline tracking
 * - Optimization event history with before/after performance snapshots
 * - Hotkey toggles for enabling/disabling individual optimization features
 * 
 * Requirements: 12.3, 12.5
 */

/**
 * PerformanceSnapshot - Captures a point-in-time performance state
 */
class PerformanceSnapshot {
  constructor(timestamp, fps, frameTime, drawCalls, triangles, memory, lodDistribution = {}) {
    this.timestamp = timestamp;
    this.fps = fps;
    this.frameTime = frameTime;
    this.drawCalls = drawCalls;
    this.triangles = triangles;
    this.memory = memory;
    this.lodDistribution = lodDistribution;
  }
  
  /**
   * Get a formatted string representation
   */
  toString() {
    return `[${new Date(this.timestamp).toISOString()}] FPS: ${this.fps}, FrameTime: ${this.frameTime.toFixed(2)}ms, DrawCalls: ${this.drawCalls}, Triangles: ${this.triangles}, Memory: ${this.memory.toFixed(1)}MB`;
  }
}

/**
 * PerformanceEvent - Represents an optimization event with before/after snapshots
 */
class PerformanceEvent {
  constructor(eventName, eventType, beforeSnapshot, afterSnapshot = null) {
    this.eventName = eventName;
    this.eventType = eventType; // 'drop', 'recovery', 'optimization', 'toggle'
    this.beforeSnapshot = beforeSnapshot;
    this.afterSnapshot = afterSnapshot;
    this.timestamp = beforeSnapshot.timestamp;
    this.resolved = afterSnapshot !== null;
  }
  
  /**
   * Set the after snapshot
   */
  setAfterSnapshot(snapshot) {
    this.afterSnapshot = snapshot;
    this.resolved = true;
  }
  
  /**
   * Get performance delta
   */
  getDelta() {
    if (!this.afterSnapshot) {
      return {
        fpsDelta: 0,
        frameTimeDelta: 0,
        drawCallsDelta: 0,
        trianglesDelta: 0,
        memoryDelta: 0,
      };
    }
    
    return {
      fpsDelta: this.afterSnapshot.fps - this.beforeSnapshot.fps,
      frameTimeDelta: this.afterSnapshot.frameTime - this.beforeSnapshot.frameTime,
      drawCallsDelta: this.afterSnapshot.drawCalls - this.beforeSnapshot.drawCalls,
      trianglesDelta: this.afterSnapshot.triangles - this.beforeSnapshot.triangles,
      memoryDelta: this.afterSnapshot.memory - this.beforeSnapshot.memory,
    };
  }
  
  /**
   * Get formatted string representation
   */
  toString() {
    const delta = this.getDelta();
    return `${this.eventType.toUpperCase()}: ${this.eventName}\n  Before: ${this.beforeSnapshot.toString()}\n  After: ${this.afterSnapshot ? this.afterSnapshot.toString() : 'Pending'}\n  Delta: FPS${delta.fpsDelta > 0 ? '+' : ''}${delta.fpsDelta}, FrameTime${delta.frameTimeDelta > 0 ? '+' : ''}${delta.frameTimeDelta.toFixed(2)}ms`;
  }
}

/**
 * PerformanceLogger - Main logging and history manager
 */
class PerformanceLogger {
  constructor(maxHistorySize = 1000, dropThreshold = 10) {
    // Configuration
    this.maxHistorySize = maxHistorySize;
    this.dropThreshold = dropThreshold; // FPS drop threshold to log as "drop"
    this.baselineSnapshot = null;
    
    // History tracking
    this.eventHistory = [];
    this.performanceDrops = [];
    this.optimizationEvents = [];
    this.toggleHistory = [];
    
    // Real-time state
    this.lastSnapshot = null;
    this.isPerformanceDrop = false;
    this.consecutiveFrameDrops = 0;
    
    // Optimization feature toggles
    this.optimizationFeatures = {
      lodEnabled: true,
      cullingEnabled: true,
      instancingEnabled: true,
      assetOptimizationEnabled: true,
      particleSystemEnabled: true,
      animationOptimizationEnabled: true,
      shadowOptimizationEnabled: true,
      textureCompressionEnabled: true,
    };
    
    // Hotkey configuration
    this.hotkeyMap = {
      'KeyL': 'lodEnabled',
      'KeyC': 'cullingEnabled',
      'KeyI': 'instancingEnabled',
      'KeyA': 'assetOptimizationEnabled',
      'KeyP': 'particleSystemEnabled',
      'KeyN': 'animationOptimizationEnabled',
      'KeyS': 'shadowOptimizationEnabled',
      'KeyT': 'textureCompressionEnabled',
    };
    
    // Setup hotkey listeners
    this.setupHotkeyListeners();
    
    console.log('[PerformanceLogger] Initialized');
  }
  
  /**
   * Set baseline snapshot for comparison
   * @param {PerformanceSnapshot} snapshot - The baseline snapshot
   */
  setBaseline(snapshot) {
    this.baselineSnapshot = snapshot;
    console.log(`[PerformanceLogger] Baseline set: ${snapshot.toString()}`);
  }
  
  /**
   * Record a performance snapshot
   * @param {number} fps - Current FPS
   * @param {number} frameTime - Frame time in ms
   * @param {number} drawCalls - Draw call count
   * @param {number} triangles - Triangle count
   * @param {number} memory - Memory usage in MB
   * @param {Object} lodDistribution - LOD distribution
   */
  recordSnapshot(fps, frameTime, drawCalls, triangles, memory, lodDistribution = {}) {
    const snapshot = new PerformanceSnapshot(
      Date.now(),
      fps,
      frameTime,
      drawCalls,
      triangles,
      memory,
      lodDistribution
    );
    
    // Check for performance drops
    if (this.lastSnapshot) {
      const fpsDrop = this.lastSnapshot.fps - fps;
      
      if (fpsDrop > this.dropThreshold) {
        this.consecutiveFrameDrops++;
        
        if (this.consecutiveFrameDrops === 1) {
          // First frame drop, log it
          const event = new PerformanceEvent(
            `Performance Drop (${fpsDrop.toFixed(1)} FPS)`,
            'drop',
            this.lastSnapshot,
            snapshot
          );
          this.logEvent(event);
          this.isPerformanceDrop = true;
        }
      } else if (this.isPerformanceDrop) {
        // Performance recovered
        const event = new PerformanceEvent(
          `Performance Recovery (+${(fps - this.lastSnapshot.fps).toFixed(1)} FPS)`,
          'recovery',
          this.lastSnapshot,
          snapshot
        );
        this.logEvent(event);
        this.isPerformanceDrop = false;
        this.consecutiveFrameDrops = 0;
      }
    }
    
    this.lastSnapshot = snapshot;
  }
  
  /**
   * Log a performance event
   * @param {PerformanceEvent} event - The event to log
   */
  logEvent(event) {
    this.eventHistory.push(event);
    
    // Maintain max history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    // Categorize event
    if (event.eventType === 'drop') {
      this.performanceDrops.push(event);
    } else if (event.eventType === 'recovery') {
      this.performanceDrops.push(event);
    } else if (event.eventType === 'optimization' || event.eventType === 'toggle') {
      this.optimizationEvents.push(event);
    }
    
    console.log(`[PerformanceLogger] ${event.eventName}`);
  }
  
  /**
   * Log optimization event with before/after snapshots
   * @param {string} optimizationName - Name of the optimization
   * @param {PerformanceSnapshot} beforeSnapshot - Before state
   * @param {PerformanceSnapshot} afterSnapshot - After state
   */
  logOptimization(optimizationName, beforeSnapshot, afterSnapshot) {
    const event = new PerformanceEvent(
      optimizationName,
      'optimization',
      beforeSnapshot,
      afterSnapshot
    );
    this.logEvent(event);
  }
  
  /**
   * Setup hotkey event listeners for toggling optimizations
   */
  setupHotkeyListeners() {
    document.addEventListener('keydown', (event) => {
      // Check if Alt key is pressed (Alt + Key)
      if (!event.altKey) return;
      
      const featureName = this.hotkeyMap[event.code];
      if (featureName && this.optimizationFeatures.hasOwnProperty(featureName)) {
        event.preventDefault();
        
        // Toggle feature
        const oldState = this.optimizationFeatures[featureName];
        this.optimizationFeatures[featureName] = !oldState;
        
        // Log toggle event
        const toggleEvent = {
          timestamp: Date.now(),
          feature: featureName,
          oldState,
          newState: this.optimizationFeatures[featureName],
          hotkey: `Alt+${event.key.toUpperCase()}`,
        };
        
        this.toggleHistory.push(toggleEvent);
        
        console.log(
          `[PerformanceLogger] Feature Toggled: ${featureName} ${oldState ? 'OFF' : 'ON'} (Hotkey: Alt+${event.key.toUpperCase()})`
        );
        
        // Dispatch custom event for feature toggle
        window.dispatchEvent(
          new CustomEvent('performanceFeatureToggle', {
            detail: toggleEvent,
          })
        );
      }
    });
  }
  
  /**
   * Get optimization feature status
   * @param {string} featureName - Feature name
   */
  getFeatureStatus(featureName) {
    return this.optimizationFeatures[featureName] ?? null;
  }
  
  /**
   * Set optimization feature status
   * @param {string} featureName - Feature name
   * @param {boolean} enabled - Enable/disable
   */
  setFeatureStatus(featureName, enabled) {
    if (this.optimizationFeatures.hasOwnProperty(featureName)) {
      const oldState = this.optimizationFeatures[featureName];
      this.optimizationFeatures[featureName] = enabled;
      
      if (oldState !== enabled) {
        const toggleEvent = {
          timestamp: Date.now(),
          feature: featureName,
          oldState,
          newState: enabled,
          hotkey: 'API',
        };
        
        this.toggleHistory.push(toggleEvent);
        
        console.log(
          `[PerformanceLogger] Feature ${enabled ? 'Enabled' : 'Disabled'}: ${featureName}`
        );
      }
    }
  }
  
  /**
   * Get all active optimization features
   */
  getActiveFeatures() {
    return Object.fromEntries(
      Object.entries(this.optimizationFeatures).filter(([_, enabled]) => enabled)
    );
  }
  
  /**
   * Get performance drop history
   * @param {number} limit - Max records to return
   */
  getPerformanceDrops(limit = 50) {
    return this.performanceDrops.slice(-limit);
  }
  
  /**
   * Get optimization history
   * @param {number} limit - Max records to return
   */
  getOptimizationHistory(limit = 50) {
    return this.optimizationEvents.slice(-limit);
  }
  
  /**
   * Get toggle history
   * @param {number} limit - Max records to return
   */
  getToggleHistory(limit = 50) {
    return this.toggleHistory.slice(-limit);
  }
  
  /**
   * Get all event history
   * @param {number} limit - Max records to return
   */
  getEventHistory(limit = 100) {
    return this.eventHistory.slice(-limit);
  }
  
  /**
   * Get performance summary
   */
  getSummary() {
    return {
      totalEvents: this.eventHistory.length,
      performanceDrops: this.performanceDrops.length,
      optimizationEvents: this.optimizationEvents.length,
      featureToggles: this.toggleHistory.length,
      activeFeatures: this.getActiveFeatures(),
      currentStatus: this.isPerformanceDrop ? 'Performance Drop' : 'Normal',
      lastSnapshot: this.lastSnapshot?.toString() || 'No snapshots recorded',
      baseline: this.baselineSnapshot?.toString() || 'No baseline set',
    };
  }
  
  /**
   * Export logs as JSON
   */
  exportLogs() {
    return {
      summary: this.getSummary(),
      eventHistory: this.eventHistory.map(e => ({
        name: e.eventName,
        type: e.eventType,
        timestamp: e.timestamp,
        before: {
          fps: e.beforeSnapshot.fps,
          frameTime: e.beforeSnapshot.frameTime,
          drawCalls: e.beforeSnapshot.drawCalls,
          triangles: e.beforeSnapshot.triangles,
          memory: e.beforeSnapshot.memory,
        },
        after: e.afterSnapshot ? {
          fps: e.afterSnapshot.fps,
          frameTime: e.afterSnapshot.frameTime,
          drawCalls: e.afterSnapshot.drawCalls,
          triangles: e.afterSnapshot.triangles,
          memory: e.afterSnapshot.memory,
        } : null,
      })),
      performanceDrops: this.performanceDrops.map(e => e.toString()),
      toggleHistory: this.toggleHistory,
    };
  }
  
  /**
   * Print performance summary to console
   */
  printSummary() {
    const summary = this.getSummary();
    console.group('[PerformanceLogger] Summary');
    console.table(summary);
    console.groupEnd();
  }
  
  /**
   * Clear history
   */
  clear() {
    this.eventHistory = [];
    this.performanceDrops = [];
    this.optimizationEvents = [];
    this.toggleHistory = [];
    this.consecutiveFrameDrops = 0;
    this.isPerformanceDrop = false;
    console.log('[PerformanceLogger] History cleared');
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    this.clear();
  }
}

export { PerformanceLogger, PerformanceSnapshot, PerformanceEvent };
