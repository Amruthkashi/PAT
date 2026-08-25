import React, { useState, Component } from 'react';
import LoginPage from './components/LoginPage';
import AssessmentPage from './components/AssessmentPage';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary Caught An Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#fef2f2',
          minHeight: '100vh',
          color: '#991b1b'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>⚠️ Application Error</h2>
          <p style={{ marginBottom: '20px' }}>An error occurred while rendering the page:</p>
          <pre style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            color: '#dc2626',
            overflowX: 'auto',
            fontSize: '13px',
            lineHeight: '1.6'
          }}>
            {this.state.error?.toString()}
            {"\n\n"}
            {this.state.errorInfo?.componentStack}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              marginTop: '20px',
              padding: '10px 18px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Clear Cache &amp; Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {!user ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        ) : (
          <AssessmentPage user={user} onLogout={handleLogout} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
