import { Component } from 'react';

/**
 * ErrorBoundary — React render/lifecycle xatolarini ushlab qoladi.
 * main.jsx da <App /> ni o'rab qo'ying:
 *   <ErrorBoundary><App /></ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught render error:', error);
    console.error('[ErrorBoundary] Component stack:', info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;

    return (
      <div style={{
        minHeight:     '100dvh',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        justifyContent:'center',
        gap:           20,
        padding:       '32px 24px',
        background:    'var(--color-bg, #1E1E3F)',
        color:         'var(--fg-1, #e8e8f0)',
        textAlign:     'center',
        fontFamily:    'var(--font-sans, Inter, sans-serif)',
      }}>
        {/* Warning icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'rgba(224,82,82,0.12)',
          border: '1px solid rgba(224,82,82,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>
          ⚠
        </div>

        {/* Title + description */}
        <div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>
            An unexpected error occurred
          </h2>
          <p style={{
            margin: 0, fontSize: 14, lineHeight: 1.6,
            color: 'var(--fg-3, #888)', maxWidth: 340,
          }}>
            The app needs to reload. If the issue persists, try refreshing the page.
          </p>

          {/* Error detail (dev-friendly) */}
          {error?.message && (
            <p style={{
              marginTop: 12, fontSize: 12,
              color: '#e05252',
              fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
              background: 'rgba(224,82,82,0.08)',
              border: '1px solid rgba(224,82,82,0.2)',
              padding: '8px 14px', borderRadius: 8,
              maxWidth: 360, wordBreak: 'break-word',
            }}>
              {error.message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
          <button
            onClick={this.handleReset}
            style={{
              padding:      '11px 0',
              background:   'var(--color-accent, #5B4FD4)',
              color:        '#fff',
              border:       'none',
              borderRadius: 12,
              cursor:       'pointer',
              fontSize:     14,
              fontWeight:   600,
            }}
          >
            Try again
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding:     '11px 0',
              background:  'none',
              border:      '1px solid var(--color-border, rgba(255,255,255,0.12))',
              borderRadius:12,
              color:       'var(--fg-2, #b0b0c8)',
              cursor:      'pointer',
              fontSize:    14,
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
