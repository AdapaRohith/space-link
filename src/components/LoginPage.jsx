import { useState } from 'react';
import { Triangle, Eye, EyeOff, LogIn } from 'lucide-react';
import { login } from '../services/authService';
import './LoginPage.css';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const session = login(email, password);
      if (session) {
        onLogin(session);
      } else {
        setError('Invalid email or password');
      }
      setLoading(false);
    }, 300);
  };

  const demoAccounts = [
    { label: 'Admin', email: 'karuna@spacelink.in', pass: 'admin123' },
    { label: 'Sales', email: 'sales@spacelink.in', pass: 'sales123' },
  ];

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-gradient" />
        <div className="login-bg-pattern" />
      </div>

      <div className="login-container">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">
              <Triangle size={32} fill="var(--color-accent-500)" strokeWidth={0} />
            </div>
            <h1 className="login-title">SPACE LINK</h1>
            <p className="login-subtitle">Real Estate CRM</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? (
                <span className="login-spinner" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="demo-accounts">
            <p className="demo-label">Quick Login</p>
            <div className="demo-buttons">
              {demoAccounts.map(acc => (
                <button
                  key={acc.label}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setEmail(acc.email); setPassword(acc.pass); }}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="login-footer">
          Level Up — Premium Living Redefined
        </p>
      </div>
    </div>
  );
}
