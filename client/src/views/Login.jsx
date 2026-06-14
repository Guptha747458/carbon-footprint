import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onSwitchView, onBackToMain }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      onBackToMain();
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card glass-panel">
          <div className="auth-header text-center">
            <button className="brand-logo-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={onBackToMain}>
              <div className="brand-icon mx-auto">
                <i className="fa-solid fa-seedling"></i>
              </div>
            </button>
            <h2>Welcome Back</h2>
            <p>Login to track your footprint</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <p className="auth-error" style={{ display: 'block' }} role="alert" aria-live="assertive">
                {error}
              </p>
            )}

            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-envelope input-icon" aria-hidden="true"></i>
                <input
                  type="email"
                  id="login-email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock input-icon" aria-hidden="true"></i>
                <input
                  type="password"
                  id="login-password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-actions">
              <button type="submit" className="btn btn-primary btn-large full-width" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Please wait...
                  </>
                ) : (
                  <>
                    Login <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="auth-footer text-center">
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => onSwitchView('signup')}
                style={{ background: 'none', border: 'none', padding: 0 }}
                className="auth-link"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
