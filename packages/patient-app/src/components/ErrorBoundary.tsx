import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NER-MIND ErrorBoundary Caught]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          textAlign: 'center',
          background: '#F8FAFC',
          borderRadius: 20,
          border: '2px solid #E2E8F0',
          margin: '24px auto',
          maxWidth: 600,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🌱</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#123B63', marginBottom: 10 }}>
            {this.props.fallbackTitle || 'Taking a Calm Moment'}
          </h2>
          <p style={{ fontSize: 16, color: '#64748B', maxWidth: 460, marginBottom: 24, lineHeight: 1.5 }}>
            We encountered a temporary hiccup in this session. Your progress and data are safely saved.
          </p>
          <div style={{ display: 'flex', gap: 14 }}>
            <button
              className="accessible-btn accessible-btn-primary"
              onClick={this.handleReset}
              style={{ minHeight: 52, padding: '12px 28px', fontSize: 18, fontWeight: 700 }}
            >
              Restart This Activity ↺
            </button>
            <button
              className="accessible-btn accessible-btn-secondary"
              onClick={() => {
                window.location.href = '/';
              }}
              style={{ minHeight: 52, padding: '12px 24px', fontSize: 18, fontWeight: 600 }}
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
