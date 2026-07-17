/**
 * PerformanceHUD.jsx
 * 
 * Performance control panel for the casino game UI
 * - Real-time performance metrics display
 * - Feature toggle buttons
 * - Performance monitoring options
 */

import { useState, useEffect } from 'react';
import { Activity, BarChart3, Settings, X } from 'lucide-react';

export default function PerformanceHUD() {
  const [showDetails, setShowDetails] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [features, setFeatures] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const perfSys = window.performanceSystem;
      if (perfSys) {
        // Get metrics from PerformanceSystem
        if (typeof perfSys.metrics === 'object') {
          setMetrics({ ...perfSys.metrics });
        }
        // Try to get logger for features
        if (typeof perfSys.logger === 'object' && perfSys.logger) {
          setFeatures(perfSys.logger.optimizationFeatures || {});
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (!metrics) {
    return null;
  }

  const getStatusColor = (fps) => {
    if (fps >= 55) return '#00ff00';
    if (fps >= 45) return '#ffff00';
    if (fps >= 30) return '#ff9900';
    return '#ff0000';
  };

  const getVRAMColor = (vram) => {
    const percent = (vram / 2000) * 100;
    if (percent < 50) return '#00ff00';
    if (percent < 75) return '#ffff00';
    if (percent < 90) return '#ff9900';
    return '#ff0000';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 70,
        right: 16,
        zIndex: 20,
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      {/* Compact Performance Badge */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid #ffd700',
          borderRadius: 8,
          padding: '8px 12px',
          color: '#fff',
          marginBottom: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => setShowDetails(!showDetails)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#ffff00';
          e.currentTarget.style.background = 'rgba(10, 10, 10, 0.9)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#ffd700';
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={14} style={{ color: getStatusColor(metrics.fps) }} />
          <span style={{ color: getStatusColor(metrics.fps), fontWeight: 'bold' }}>
            {metrics.fps} FPS
          </span>
          <span style={{ color: '#888' }}>|</span>
          <span style={{ color: getVRAMColor(metrics.vramUsage), fontWeight: 'bold' }}>
            {metrics.vramUsage.toFixed(0)}MB
          </span>
        </div>
      </div>

      {/* Detailed Panel */}
      {showDetails && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(10,5,15,0.95) 100%)',
            border: '1px solid #ffd700',
            borderRadius: 8,
            padding: '12px',
            width: 280,
            boxShadow: '0 8px 24px rgba(255, 215, 0, 0.15)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ffd700' }}>
              <BarChart3 size={14} />
              <span style={{ fontWeight: 'bold' }}>PERFORMANCE</span>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* FPS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#888' }}>FPS</span>
              <span style={{ color: getStatusColor(metrics.fps), fontWeight: 'bold' }}>
                {metrics.fps}
              </span>
            </div>

            {/* Frame Time */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#888' }}>Frame Time</span>
              <span style={{ color: metrics.frameTime > 20 ? '#ff9900' : '#00ff00' }}>
                {metrics.frameTime.toFixed(2)}ms
              </span>
            </div>

            {/* Draw Calls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#888' }}>Draw Calls</span>
              <span style={{ color: metrics.drawCalls > 3000 ? '#ff9900' : '#00ff00' }}>
                {metrics.drawCalls}
              </span>
            </div>

            {/* Triangles */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#888' }}>Triangles</span>
              <span style={{ color: '#00ff00' }}>
                {(metrics.triangles / 1000000).toFixed(1)}M
              </span>
            </div>

            {/* VRAM */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 215, 0, 0.1)',
              }}
            >
              <span style={{ color: '#888' }}>VRAM</span>
              <span style={{ color: getVRAMColor(metrics.vramUsage) }}>
                {metrics.vramUsage.toFixed(0)}MB / 2000MB
              </span>
            </div>

            {/* LOD Distribution */}
            {metrics.lodDistribution && (
              <div
                style={{
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 215, 0, 0.1)',
                }}
              >
                <div style={{ color: '#888', marginBottom: 4 }}>LOD Distribution:</div>
                <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#00ff00' }}>▪ High</span>
                    <span>{metrics.lodDistribution.high || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ffff00' }}>▪ Medium</span>
                    <span>{metrics.lodDistribution.medium || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ff9900' }}>▪ Low</span>
                    <span>{metrics.lodDistribution.low || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Feature Toggles */}
          {features && (
            <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255, 215, 0, 0.1)' }}>
              <div
                style={{
                  color: '#ffd700',
                  marginBottom: 6,
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Settings size={12} />
                Features (Alt + Key)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '10px' }}>
                {[
                  { key: 'L', name: 'LOD', prop: 'lodEnabled' },
                  { key: 'C', name: 'Culling', prop: 'cullingEnabled' },
                  { key: 'I', name: 'Instancing', prop: 'instancingEnabled' },
                  { key: 'A', name: 'Assets', prop: 'assetOptimizationEnabled' },
                  { key: 'P', name: 'Particles', prop: 'particleSystemEnabled' },
                  { key: 'N', name: 'Animation', prop: 'animationOptimizationEnabled' },
                  { key: 'S', name: 'Shadows', prop: 'shadowOptimizationEnabled' },
                  { key: 'T', name: 'Textures', prop: 'textureCompressionEnabled' },
                ].map((f) => (
                  <div
                    key={f.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 6px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const perfSys = window.performanceSystem;
                      if (perfSys?.getLogger) {
                        const logger = perfSys.getLogger();
                        const enabled = features[f.prop];
                        logger.setFeatureStatus(f.prop, !enabled);
                      }
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: features[f.prop] ? '#00ff00' : '#333',
                        marginRight: 2,
                      }}
                    />
                    <span style={{ color: features[f.prop] ? '#fff' : '#666' }}>
                      {f.name}
                    </span>
                    <span style={{ marginLeft: 'auto', color: '#888', fontSize: '9px' }}>
                      {f.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto Refresh Toggle */}
          <div
            style={{
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255, 215, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: '11px',
            }}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#888' }}>Auto-refresh metrics</span>
          </div>

          {/* Console Hint */}
          <div
            style={{
              marginTop: '8px',
              padding: '6px',
              background: 'rgba(255, 215, 0, 0.05)',
              border: '1px solid rgba(255, 215, 0, 0.1)',
              borderRadius: 4,
              fontSize: '10px',
              color: '#888',
            }}
          >
            💡 Press F12 to open console and run:
            <br />
            <code style={{ color: '#ffd700' }}>perfSys?.printStatus()</code>
          </div>
        </div>
      )}
    </div>
  );
}
