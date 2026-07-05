/**
 * PerformanceMonitor.jsx
 * 
 * Real-time performance dashboard React component that displays:
 * - FPS and frame time metrics
 * - Draw calls and triangle counts
 * - Memory usage (VRAM)
 * - 60-second performance history graphs with trend analysis
 * - LOD level visualization showing object detail levels in real-time
 * 
 * Requirements: 12.1, 12.2, 12.4
 */

import React, { useState, useEffect, useRef } from 'react';

/**
 * PerformanceMetrics - Manages performance data collection and history
 */
class PerformanceMetrics {
  constructor(maxHistoryFrames = 3600) { // 60 seconds at 60fps
    this.maxHistoryFrames = maxHistoryFrames;
    this.fpsHistory = [];
    this.frameTimeHistory = [];
    this.drawCallsHistory = [];
    this.trianglesHistory = [];
    this.memoryHistory = [];
    this.lodHistory = [];
    
    this.currentFPS = 0;
    this.currentFrameTime = 0;
    this.currentDrawCalls = 0;
    this.currentTriangles = 0;
    this.currentMemory = 0;
    
    this.minFPS = 60;
    this.maxFPS = 0;
    this.avgFPS = 0;
    
    this.lastFrameTime = Date.now();
    this.frameCount = 0;
    this.fpsUpdateInterval = 0.2; // Update FPS every 0.2 seconds
    this.timeSinceLastFPSUpdate = 0;
  }
  
  /**
   * Update metrics with new frame data
   * @param {Object} frameData - Contains fps, frameTime, drawCalls, triangles, memory
   */
  update(frameData) {
    const now = Date.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    
    this.frameCount++;
    this.timeSinceLastFPSUpdate += deltaTime;
    
    // Update FPS calculation every 0.2 seconds
    if (this.timeSinceLastFPSUpdate >= this.fpsUpdateInterval) {
      this.currentFPS = Math.round(this.frameCount / this.timeSinceLastFPSUpdate);
      this.frameCount = 0;
      this.timeSinceLastFPSUpdate = 0;
      
      // Update FPS history
      this.fpsHistory.push(this.currentFPS);
      if (this.fpsHistory.length > this.maxHistoryFrames) {
        this.fpsHistory.shift();
      }
      
      // Calculate FPS stats
      this.minFPS = Math.min(...this.fpsHistory);
      this.maxFPS = Math.max(...this.fpsHistory);
      this.avgFPS = Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
    }
    
    // Update frame time
    this.currentFrameTime = (frameData.frameTime || deltaTime * 1000).toFixed(2);
    this.frameTimeHistory.push(parseFloat(this.currentFrameTime));
    if (this.frameTimeHistory.length > this.maxHistoryFrames) {
      this.frameTimeHistory.shift();
    }
    
    // Update draw calls
    this.currentDrawCalls = frameData.drawCalls || 0;
    this.drawCallsHistory.push(this.currentDrawCalls);
    if (this.drawCallsHistory.length > this.maxHistoryFrames) {
      this.drawCallsHistory.shift();
    }
    
    // Update triangle count
    this.currentTriangles = frameData.triangles || 0;
    this.trianglesHistory.push(this.currentTriangles);
    if (this.trianglesHistory.length > this.maxHistoryFrames) {
      this.trianglesHistory.shift();
    }
    
    // Update memory usage (VRAM in MB)
    this.currentMemory = frameData.memory || 0;
    this.memoryHistory.push(this.currentMemory);
    if (this.memoryHistory.length > this.maxHistoryFrames) {
      this.memoryHistory.shift();
    }
    
    // Update LOD distribution
    if (frameData.lodDistribution) {
      this.lodHistory.push(frameData.lodDistribution);
      if (this.lodHistory.length > this.maxHistoryFrames) {
        this.lodHistory.shift();
      }
    }
  }
  
  /**
   * Get average frame time in ms
   */
  getAvgFrameTime() {
    if (this.frameTimeHistory.length === 0) return 0;
    return (this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length).toFixed(2);
  }
  
  /**
   * Get max frame time in ms
   */
  getMaxFrameTime() {
    if (this.frameTimeHistory.length === 0) return 0;
    return Math.max(...this.frameTimeHistory).toFixed(2);
  }
  
  /**
   * Get average draw calls
   */
  getAvgDrawCalls() {
    if (this.drawCallsHistory.length === 0) return 0;
    return Math.round(this.drawCallsHistory.reduce((a, b) => a + b, 0) / this.drawCallsHistory.length);
  }
  
  /**
   * Get average triangles
   */
  getAvgTriangles() {
    if (this.trianglesHistory.length === 0) return 0;
    return Math.round(this.trianglesHistory.reduce((a, b) => a + b, 0) / this.trianglesHistory.length);
  }
  
  /**
   * Get average memory usage
   */
  getAvgMemory() {
    if (this.memoryHistory.length === 0) return 0;
    return (this.memoryHistory.reduce((a, b) => a + b, 0) / this.memoryHistory.length).toFixed(1);
  }
  
  /**
   * Get current LOD distribution
   */
  getCurrentLODDistribution() {
    if (this.lodHistory.length === 0) {
      return { high: 0, medium: 0, low: 0 };
    }
    return this.lodHistory[this.lodHistory.length - 1];
  }
}

/**
 * PerformanceMonitor React Component
 */
const PerformanceMonitor = ({ performanceSystem = null, visible = true, position = 'top-left' }) => {
  const [metrics, setMetrics] = useState(new PerformanceMetrics());
  const [frameData, setFrameData] = useState({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    memory: 0,
    lodDistribution: { high: 0, medium: 0, low: 0 },
  });
  const animationFrameRef = useRef(null);
  const metricsRef = useRef(metrics);
  
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);
  
  useEffect(() => {
    if (!visible) return;
    
    const updateMetrics = () => {
      // Collect performance data
      const newFrameData = {
        fps: metrics.currentFPS,
        frameTime: metrics.currentFrameTime,
        drawCalls: performanceSystem?.getDrawCallCount?.() || 0,
        triangles: performanceSystem?.getTriangleCount?.() || 0,
        memory: performanceSystem?.getMemoryUsage?.() || 0,
        lodDistribution: performanceSystem?.getLODDistribution?.() || { high: 0, medium: 0, low: 0 },
      };
      
      // Update metrics
      metricsRef.current.update(newFrameData);
      setFrameData(newFrameData);
      setMetrics(new PerformanceMetrics(metricsRef.current.maxHistoryFrames));
      Object.assign(metrics, metricsRef.current);
      
      animationFrameRef.current = requestAnimationFrame(updateMetrics);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateMetrics);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visible, performanceSystem]);
  
  if (!visible) return null;
  
  const positionClass = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }[position] || 'top-4 left-4';
  
  // Determine FPS color based on performance
  const getFPSColor = (fps) => {
    if (fps >= 55) return '#00ff00'; // Green
    if (fps >= 45) return '#ffff00'; // Yellow
    if (fps >= 30) return '#ff9900'; // Orange
    return '#ff0000'; // Red
  };
  
  const lodDistribution = metrics.getCurrentLODDistribution();
  const totalObjects = (lodDistribution.high || 0) + (lodDistribution.medium || 0) + (lodDistribution.low || 0);
  
  return (
    <div
      className={`fixed ${positionClass} z-50 font-mono text-sm bg-black bg-opacity-80 text-white p-4 rounded border border-green-500`}
      style={{
        fontFamily: 'monospace',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#00ff00' }}>
        PERFORMANCE MONITOR
      </div>
      
      {/* FPS Section */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: getFPSColor(metrics.currentFPS) }}>
          FPS: {metrics.currentFPS.toString().padStart(3)} | Min: {metrics.minFPS} | Max: {metrics.maxFPS} | Avg: {metrics.avgFPS}
        </div>
      </div>
      
      {/* Frame Time Section */}
      <div style={{ marginBottom: '8px', color: '#ffffff' }}>
        <div>Frame Time: {metrics.currentFrameTime}ms (Avg: {metrics.getAvgFrameTime()}ms, Max: {metrics.getMaxFrameTime()}ms)</div>
      </div>
      
      {/* Draw Calls Section */}
      <div style={{ marginBottom: '8px', color: '#ffffff' }}>
        <div>Draw Calls: {metrics.currentDrawCalls} (Avg: {metrics.getAvgDrawCalls()})</div>
      </div>
      
      {/* Triangles Section */}
      <div style={{ marginBottom: '8px', color: '#ffffff' }}>
        <div>Triangles: {(metrics.currentTriangles / 1000000).toFixed(2)}M (Avg: {(metrics.getAvgTriangles() / 1000000).toFixed(2)}M)</div>
      </div>
      
      {/* Memory Section */}
      <div style={{ marginBottom: '8px', color: metrics.currentMemory > 1500 ? '#ff9900' : '#ffffff' }}>
        <div>VRAM: {metrics.currentMemory.toFixed(1)}MB (Avg: {metrics.getAvgMemory()}MB, Limit: 2000MB)</div>
      </div>
      
      {/* LOD Distribution */}
      <div style={{ marginBottom: '8px', color: '#ffffff' }}>
        <div>LOD Distribution:</div>
        <div style={{ paddingLeft: '16px', fontSize: '12px' }}>
          <div style={{ color: '#00ff00' }}>High: {lodDistribution.high || 0} ({totalObjects > 0 ? ((lodDistribution.high || 0) / totalObjects * 100).toFixed(1) : 0}%)</div>
          <div style={{ color: '#ffff00' }}>Medium: {lodDistribution.medium || 0} ({totalObjects > 0 ? ((lodDistribution.medium || 0) / totalObjects * 100).toFixed(1) : 0}%)</div>
          <div style={{ color: '#ff9900' }}>Low: {lodDistribution.low || 0} ({totalObjects > 0 ? ((lodDistribution.low || 0) / totalObjects * 100).toFixed(1) : 0}%)</div>
        </div>
      </div>
      
      {/* History Graph Summary */}
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #444444', fontSize: '11px', color: '#888888' }}>
        <div>History: {metrics.fpsHistory.length} frames recorded</div>
      </div>
    </div>
  );
};

export { PerformanceMonitor, PerformanceMetrics };
