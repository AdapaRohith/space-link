import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, ClipboardList, Building2,
  LogOut, X, Shield
} from 'lucide-react';
import { getSession, logout } from '../services/authService';
import spaceLinkLogo from '../assets/space-link-logo.png';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { path: '/leads', label: 'All Leads', icon: ClipboardList, roles: ['admin', 'sales', 'receptionist'] },
  { path: '/leads/new', label: 'Add Lead', icon: UserPlus, roles: ['admin', 'sales', 'receptionist'] },
  { path: '/walkins', label: 'Walk-In Log', icon: Building2, roles: ['admin', 'receptionist'] },
  { path: '/users', label: 'Team', icon: Users, roles: ['admin'] },
];

const ROLE_LABELS = {
  admin: 'Administrator',
  sales: 'Sales Executive',
  receptionist: 'Front Desk',
};

export default function Sidebar({ isOpen, onToggle }) {
  const session = getSession();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(session?.role));

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <img src={spaceLinkLogo} alt="Space Link" className="sidebar-logo-img" />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">SPACE LINK</span>
          </div>
          <button className="sidebar-close-btn" onClick={onToggle} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => { if (window.innerWidth < 769) onToggle(); }}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {session?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{session?.name}</span>
              <span className="sidebar-user-role">
                <Shield size={9} />
                {ROLE_LABELS[session?.role] || session?.role}
              </span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
