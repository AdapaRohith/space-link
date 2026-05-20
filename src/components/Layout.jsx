import { useEffect, useState, lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Moon, Sun, LogOut, Shield } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileNavBar from './MobileNavBar';
import BottomSheet from './BottomSheet';
import { getSession, logout } from '../services/authService';
import { PageLoader } from './Skeleton';
import './Layout.css';

const LeadCreate = lazy(() => import('../pages/LeadCreate'));

const ROLE_LABELS = {
  admin: 'Administrator',
  sales: 'Sales Team',
  receptionist: 'Front Desk',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [amoledMode, setAmoledMode] = useState(
    () => localStorage.getItem('space-link-theme') === 'amoled'
  );
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const session = getSession();

  useEffect(() => {
    document.documentElement.dataset.theme = amoledMode ? 'amoled' : 'light';
    localStorage.setItem('space-link-theme', amoledMode ? 'amoled' : 'light');
  }, [amoledMode]);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const handleAddLeadSuccess = () => {
    setAddLeadOpen(false);
  };

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        amoledMode={amoledMode}
        onThemeToggle={() => setAmoledMode((v) => !v)}
      />
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-brand">SPACE LINK</div>
          <div className="topbar-actions">
            <button
              className="topbar-theme-toggle"
              onClick={() => setAmoledMode((v) => !v)}
              title={amoledMode ? 'Switch to light mode' : 'Switch to AMOLED dark'}
              aria-label={amoledMode ? 'Switch to light mode' : 'Switch to AMOLED dark'}
            >
              {amoledMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="topbar-profile-wrap">
              <button
                className="topbar-avatar"
                onClick={() => setProfileOpen((v) => !v)}
                aria-label="Profile menu"
                aria-expanded={profileOpen}
              >
                {session?.name?.charAt(0)?.toUpperCase()}
              </button>
              {profileOpen && (
                <>
                  <div
                    className="topbar-popover-backdrop"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="topbar-profile-popover">
                    <div className="topbar-profile-name">{session?.name}</div>
                    <div className="topbar-profile-role">
                      <Shield size={10} />
                      {ROLE_LABELS[session?.role] || session?.role}
                    </div>
                    <button className="topbar-profile-logout" onClick={handleLogout}>
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <MobileNavBar onAddLead={() => setAddLeadOpen(true)} />
      <BottomSheet
        isOpen={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
        height="tall"
        title="Add New Lead"
      >
        <Suspense fallback={<PageLoader />}>
          <LeadCreate inSheet onSuccess={handleAddLeadSuccess} />
        </Suspense>
      </BottomSheet>
    </div>
  );
}
