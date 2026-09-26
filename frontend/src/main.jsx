import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('CoreInventory Uncaught Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#05070f',
          color: '#f0f4ff',
          padding: 24,
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            maxWidth: 480,
            background: 'rgba(10, 14, 26, 0.95)',
            border: '1px solid rgba(255, 77, 109, 0.4)',
            borderRadius: 16,
            padding: 28,
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: 'rgba(255, 77, 109, 0.15)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              border: '1px solid rgba(255, 77, 109, 0.3)',
              color: '#ff4d6d',
              fontSize: 24,
              fontWeight: 'bold'
            }}>
              !
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ fontSize: 13, color: '#7a8aaa', marginBottom: 18, lineHeight: 1.5 }}>
              {this.state.error?.message || 'A client-side runtime exception occurred.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => { localStorage.clear(); window.location.reload() }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #00dcff, #0076c8)',
                  color: '#030c1a',
                  fontWeight: 700,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Reset &amp; Reload
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#f0f4ff',
                  fontWeight: 600,
                  fontSize: 13,
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer'
                }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
