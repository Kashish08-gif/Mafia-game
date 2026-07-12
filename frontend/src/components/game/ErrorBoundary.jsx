import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught an error inside child component:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '12px',
          background: 'rgba(20, 10, 20, 0.95)',
          border: '1.5px solid rgba(255, 51, 68, 0.4)',
          borderRadius: '10px',
          color: '#ff4455',
          fontSize: '11px',
          textAlign: 'center',
          width: '300px',
          fontFamily: 'Inter, system-ui, sans-serif',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span>Failed to load Emoji Picker.</span>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              padding: '3px 8px',
              fontSize: '10px',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
