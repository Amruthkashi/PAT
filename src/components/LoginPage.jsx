import React, { useState } from 'react';
import { ShieldCheck, User, IdCard, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your User Name.');
      return;
    }
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID.');
      return;
    }
    if (!password) {
      setError('Please enter your Password.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    onLoginSuccess({
      username: username.trim(),
      employeeId: employeeId.trim(),
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <ShieldCheck size={36} />
          </div>
          <h1 className="login-title">AI POLICY REVIEW</h1>
          <p className="login-subtitle">Accreditation Organization Process Snapshots</p>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="username">User Name</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                type="text"
                id="username"
                className="form-input"
                placeholder="Enter your user name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="employeeId">Employee ID</label>
            <div className="input-wrapper">
              <IdCard size={18} className="input-icon" />
              <input
                type="text"
                id="employeeId"
                className="form-input"
                placeholder="Enter your employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="login-btn">
            Sign In to Assessment
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="login-footer-info">
          Authorized Employee Access Only
        </div>
      </div>
    </div>
  );
}
