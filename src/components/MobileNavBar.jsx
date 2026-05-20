import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Plus, Users } from 'lucide-react';
import { getSession } from '../services/authService';
import './MobileNavBar.css';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { path: '/leads', label: 'Leads', icon: ClipboardList, roles: ['admin', 'sales', 'receptionist'] },
  { path: '/users', label: 'Team', icon: Users, roles: ['admin'] },
];

export default function MobileNavBar({ onAddLead }) {
  const session = getSession();
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(session?.role));
  const mid = Math.ceil(visible.length / 2);
  const items = [...visible.slice(0, mid), { fab: true }, ...visible.slice(mid)];

  return (
    <nav className="mobile-nav" aria-label="Main navigation">
      {items.map((item, i) => {
        if (item.fab) {
          return (
            <button
              key="fab"
              className="mobile-nav-fab"
              onClick={onAddLead}
              aria-label="Add new lead"
            >
              <Plus size={26} strokeWidth={2.5} />
            </button>
          );
        }
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon size={22} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
