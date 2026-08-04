import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import AssessmentPage from './components/AssessmentPage';

function App() {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!user ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <AssessmentPage user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
