import { useEffect, useState, lazy, Suspense } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getSession, logout } from './services/authService';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import { PageLoader } from './components/Skeleton';

// Lazy load page components for code splitting and faster initial load
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LeadList = lazy(() => import('./pages/LeadList'));
const LeadCreate = lazy(() => import('./pages/LeadCreate'));
const LeadDetail = lazy(() => import('./pages/LeadDetail'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

function ProtectedRoute({ children, allowedRoles }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/leads" replace />;
  }
  return children;
}

function DefaultRedirect() {
  const session = getSession();
  // Admin goes to Dashboard, everyone else goes to Leads
  if (session?.role === 'admin') {
    return <Dashboard />;
  }
  return <Navigate to="/leads" replace />;
}

export default function App() {
  const [session, setSession] = useState(getSession());

  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem('space-link-theme') === 'amoled'
      ? 'amoled'
      : 'light';
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      logout();
      setSession(null);
    };
    window.addEventListener('session-expired', handleExpired);
    return () => window.removeEventListener('session-expired', handleExpired);
  }, []);

  const handleLogin = (s) => {
    setSession(s);
  };

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="/leads" element={<Suspense fallback={<PageLoader />}><LeadList /></Suspense>} />
          <Route path="/leads/new" element={<Suspense fallback={<PageLoader />}><LeadCreate /></Suspense>} />
          <Route path="/leads/:id" element={<Suspense fallback={<PageLoader />}><LeadDetail /></Suspense>} />
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}><UserManagement /></Suspense>
            </ProtectedRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
