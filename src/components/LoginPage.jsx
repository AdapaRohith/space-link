import { useState } from 'react';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { login, signup } from '../services/authService';
import spaceLinkLogo from '../assets/space-link-logo.png';
import './LoginPage.css';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [signupDone, setSignupDone] = useState(false);

  // login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // signup fields
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'sales' });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSignupDone(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await login(email, password);
      if (session) {
        onLogin(session);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, email, and password are required.');
      return;
    }
    setLoading(true);
    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password_hash: form.password,
        role: form.role,
      });
      setSignupDone(true);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-gradient" />
        <div className="login-bg-grid" />
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <img src={spaceLinkLogo} alt="Space Link" className="login-logo-img" />
            <span className="login-logo-name">SPACE LINK</span>
            <span className="login-logo-sub">Real Estate Intelligence Platform</span>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="login-title">Welcome back</h2>
              <p className="login-subtitle">Sign in to your CRM account</p>

              <form onSubmit={handleLogin} className="login-form">
                <div className="login-input-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div className="login-input-group">
                  <label htmlFor="password">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && <div className="login-error" role="alert">{error}</div>}

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? <span className="login-spinner" /> : 'Sign In'}
                </button>

                <div className="login-switch">
                  Don't have an account?{' '}
                  <button type="button" className="login-link" onClick={() => switchMode('signup')}>
                    Request Access
                  </button>
                </div>
              </form>
            </>
          ) : signupDone ? (
            <div className="login-success">
              <CheckCircle size={40} className="login-success-icon" />
              <h2 className="login-title">Request Submitted</h2>
              <p className="login-subtitle">Your account request has been sent to the admin for approval. You'll be able to sign in once approved.</p>
              <button className="login-btn" style={{ marginTop: 'var(--space-4)' }} onClick={() => switchMode('login')}>
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="login-title">Request Access</h2>
              <p className="login-subtitle">Submit your details for admin approval</p>

              <form onSubmit={handleSignup} className="login-form">
                <div className="login-form-row">
                  <div className="login-input-group">
                    <label htmlFor="s-name">Full Name</label>
                    <input
                      id="s-name"
                      type="text"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Your full name"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="login-input-group">
                    <label htmlFor="s-phone">Phone</label>
                    <input
                      id="s-phone"
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="Mobile number"
                    />
                  </div>
                </div>

                <div className="login-input-group">
                  <label htmlFor="s-email">Email Address</label>
                  <input
                    id="s-email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="login-form-row">
                  <div className="login-input-group">
                    <label htmlFor="s-password">Password</label>
                    <input
                      id="s-password"
                      type="password"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Choose a password"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="login-input-group">
                    <label htmlFor="s-role">Role</label>
                    <select
                      id="s-role"
                      value={form.role}
                      onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    >
                      <option value="sales">Sales Team</option>
                      <option value="receptionist">Receptionist</option>
                    </select>
                  </div>
                </div>

                {error && <div className="login-error" role="alert">{error}</div>}

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? <span className="login-spinner" /> : 'Submit Request'}
                </button>

                <div className="login-switch">
                  Already have an account?{' '}
                  <button type="button" className="login-link" onClick={() => switchMode('login')}>
                    Sign In
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="login-footer">Space Link</p>
      </div>
    </div>
  );
}
