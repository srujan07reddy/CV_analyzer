import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught rendering exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07111f',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 8px 0' }}>Guru garu, something went wrong</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              An unexpected application error occurred. You can reload the page or click below to reset the interface cache.
            </p>
            {this.state.error && (
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#fca5a5',
                textAlign: 'left',
                overflowX: 'auto',
                fontFamily: 'monospace',
                margin: '0 0 24px 0'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
            >
              <RefreshCw size={16} /> Reset Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
