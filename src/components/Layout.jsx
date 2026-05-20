import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [amoledMode, setAmoledMode] = useState(() => localStorage.getItem('space-link-theme') === 'amoled');

  useEffect(() => {
    document.documentElement.dataset.theme = amoledMode ? 'amoled' : 'light';
    localStorage.setItem('space-link-theme', amoledMode ? 'amoled' : 'light');
  }, [amoledMode]);

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        amoledMode={amoledMode}
        onThemeToggle={() => setAmoledMode(value => !value)}
      />
      <div className="main-area">
        {/* Top Bar - Mobile */}
        <header className="topbar">
          <button className="topbar-menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-brand">SPACE LINK CRM</div>
          <button
            className="topbar-theme-toggle"
            onClick={() => setAmoledMode(value => !value)}
            title={amoledMode ? 'Use light mode' : 'Use AMOLED dark mode'}
            aria-label={amoledMode ? 'Use light mode' : 'Use AMOLED dark mode'}
          >
            {amoledMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
