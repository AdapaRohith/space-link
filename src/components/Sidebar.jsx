import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, ClipboardList, Building2,
  LogOut, Menu, X, ChevronLeft, Shield
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

export default function Sidebar({ isOpen, onToggle }) {
  const session = getSession();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const roleLabel = {
    admin: 'Administrator',
    sales: 'Sales Executive',
    receptionist: 'Front Desk',
  };

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(session?.role));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Logo Section */}
        <div className="sidebar-logo">
          <img src={spaceLinkLogo} alt="Space Link" className="sidebar-logo-img" />
          <button className="sidebar-close-btn hide-desktop" onClick={onToggle}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {filteredNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => { if (window.innerWidth < 768) onToggle(); }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {session?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{session?.name}</span>
              <span className="sidebar-user-role">
                <Shield size={10} />
                {roleLabel[session?.role] || session?.role}
              </span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
