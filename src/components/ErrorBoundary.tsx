'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: 40,
          backgroundColor: '#0A0A0A',
          color: '#fff',
          minHeight: '100vh',
          fontFamily: 'monospace',
        }}>
          <h1 style={{ color: '#ff4444', marginBottom: 20 }}>Something went wrong</h1>
          <p style={{ color: '#888', marginBottom: 20 }}>
            Please try refreshing the page. If the issue persists, clear your browser cache.
          </p>
          <details style={{ marginTop: 20 }}>
            <summary style={{ cursor: 'pointer', color: '#00FFFF' }}>Technical Details</summary>
            <pre style={{
              marginTop: 10,
              padding: 15,
              backgroundColor: '#1a1a1a',
              borderRadius: 8,
              overflow: 'auto',
              fontSize: 12,
              color: '#ff6b6b',
            }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '12px 24px',
              backgroundColor: '#00FFFF',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
