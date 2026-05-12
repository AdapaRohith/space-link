import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getSession } from './services/authService';
import { seedDatabase } from './data/seedData';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LeadList from './pages/LeadList';
import LeadCreate from './pages/LeadCreate';
import LeadDetail from './pages/LeadDetail';
import WalkInLog from './pages/WalkInLog';
import UserManagement from './pages/UserManagement';

// Seed on first load
seedDatabase();

function ProtectedRoute({ children, allowedRoles }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [session, setSession] = useState(getSession());

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
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<LeadList />} />
          <Route path="/leads/new" element={<LeadCreate />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/walkins" element={<WalkInLog />} />
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
