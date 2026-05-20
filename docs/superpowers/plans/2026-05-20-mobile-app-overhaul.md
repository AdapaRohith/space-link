# Mobile App-Like Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the mobile experience from a responsive website into a native-feeling CRM app — bottom tab bar, full-screen swipeable lead cards, bottom-sheet add-lead, touch-optimized polish.

**Architecture:** All mobile-specific UI lives in three new components (`BottomSheet`, `MobileNavBar`, `MobileLeadStack`). `Layout.jsx` wires them into the shell. Desktop layout is completely unchanged — all mobile overrides live inside `@media (max-width: 768px)` blocks. No new routes added.

**Tech Stack:** React 19, React Router 7, Lucide React, plain CSS with CSS custom properties, CSS `scroll-snap`, `env(safe-area-inset-*)`.

---

## File Map

**New files:**
- `src/components/BottomSheet.jsx` — reusable drag-to-dismiss bottom sheet
- `src/components/BottomSheet.css`
- `src/components/MobileNavBar.jsx` — bottom tab bar with FAB center button
- `src/components/MobileNavBar.css`
- `src/components/MobileLeadStack.jsx` — full-screen scroll-snap lead card stack
- `src/components/MobileLeadStack.css`

**Modified files:**
- `index.html` — viewport-fit=cover
- `src/styles/variables.css` — mobile layout tokens
- `src/App.css` — global touch press animation
- `src/components/Layout.jsx` — integrate MobileNavBar + BottomSheet, profile avatar topbar
- `src/components/Layout.css` — mobile content padding, topbar polish
- `src/pages/LeadCreate.jsx` — add `inSheet` + `onSuccess` props
- `src/pages/LeadList.jsx` — render `MobileLeadStack` on mobile
- `src/pages/LeadList.css` — mobile card context styles
- `src/pages/LeadDetail.jsx` — floating action buttons on mobile
- `src/pages/LeadDetail.css` — mobile detail layout polish

---

## Task 1: Mobile CSS Tokens + Viewport

**Files:**
- Modify: `index.html`
- Modify: `src/styles/variables.css`
- Modify: `src/App.css`

- [ ] **Step 1: Add `viewport-fit=cover` to `index.html`**

Find the viewport meta tag and replace it:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 2: Add mobile tokens to `src/styles/variables.css`**

After the `--z-toast: 300;` line inside `:root { }`, add:

```css
  /* ── Mobile ── */
  --mobile-header-height: 56px;
  --mobile-nav-height:    64px;
  --z-bottom-nav:         90;
  --z-bottom-sheet:       200;
```

- [ ] **Step 3: Add press animation to `src/App.css`**

Append to `src/App.css`:

```css
/* ── Global touch press feedback ── */
@media (max-width: 768px) {
  button:active,
  a:active,
  [role="button"]:active {
    transform: scale(0.97);
    transition: transform 100ms ease-out;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html src/styles/variables.css src/App.css
git commit -m "feat(mobile): add mobile CSS tokens, viewport-fit, press animation"
```

---

## Task 2: BottomSheet Component

**Files:**
- Create: `src/components/BottomSheet.jsx`
- Create: `src/components/BottomSheet.css`

- [ ] **Step 1: Create `src/components/BottomSheet.jsx`**

```jsx
import { useEffect, useRef } from 'react';
import './BottomSheet.css';

const HEIGHT_MAP = { short: '40vh', tall: '85vh', full: '95vh' };

export default function BottomSheet({ isOpen, onClose, height = 'tall', title, children }) {
  const sheetRef = useRef(null);
  const dragRef = useRef({ startY: 0, currentY: 0, dragging: false });

  useEffect(() => {
    if (!isOpen) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const focusable = sheet.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    setTimeout(() => first?.focus(), 50);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const onTouchStart = (e) => {
    dragRef.current = { startY: e.touches[0].clientY, currentY: 0, dragging: true };
  };
  const onTouchMove = (e) => {
    if (!dragRef.current.dragging) return;
    const delta = e.touches[0].clientY - dragRef.current.startY;
    dragRef.current.currentY = delta;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };
  const onTouchEnd = () => {
    if (dragRef.current.currentY > 120) {
      if (sheetRef.current) sheetRef.current.style.transform = '';
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    dragRef.current.dragging = false;
  };

  if (!isOpen) return null;

  return (
    <div className="bsheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="bsheet"
        style={{ '--sheet-height': HEIGHT_MAP[height] }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bsheet-handle-area"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="bsheet-handle" />
          {title && <div className="bsheet-title">{title}</div>}
        </div>
        <div className="bsheet-body">
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/BottomSheet.css`**

```css
/* ===== BOTTOM SHEET ===== */

.bsheet-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-bg-overlay);
  z-index: var(--z-bottom-sheet);
  display: flex;
  align-items: flex-end;
  animation: fadeIn 150ms ease;
}

.bsheet {
  width: 100%;
  height: var(--sheet-height);
  background: var(--color-bg-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  display: flex;
  flex-direction: column;
  animation: bsheetUp var(--transition-spring) forwards;
  padding-bottom: env(safe-area-inset-bottom);
  will-change: transform;
}

.bsheet-handle-area {
  padding: var(--space-3) var(--space-4) var(--space-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.bsheet-handle {
  width: 40px;
  height: 4px;
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
}

.bsheet-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  width: 100%;
  text-align: center;
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--color-border);
}

.bsheet-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

@keyframes bsheetUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BottomSheet.jsx src/components/BottomSheet.css
git commit -m "feat(mobile): add BottomSheet component with drag-to-dismiss"
```

---

## Task 3: MobileNavBar Component

**Files:**
- Create: `src/components/MobileNavBar.jsx`
- Create: `src/components/MobileNavBar.css`

- [ ] **Step 1: Create `src/components/MobileNavBar.jsx`**

```jsx
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
```

- [ ] **Step 2: Create `src/components/MobileNavBar.css`**

```css
/* ===== MOBILE NAV BAR ===== */

.mobile-nav { display: none; }

@media (max-width: 768px) {
  .mobile-nav {
    display: flex;
    align-items: center;
    justify-content: space-around;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--mobile-nav-height);
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--color-bg-elevated);
    border-top: 1px solid var(--color-border);
    z-index: var(--z-bottom-nav);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.07);
  }
}

.mobile-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px 4px 4px;
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
  min-height: 44px;
  position: relative;
  transition: color var(--transition-fast);
}

.mobile-nav-item.active {
  color: var(--color-primary);
}

.mobile-nav-item.active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 2.5px;
  background: var(--color-primary);
  border-radius: 0 0 var(--radius-full) var(--radius-full);
}

.mobile-nav-item svg {
  transition: transform var(--transition-fast);
}

.mobile-nav-item.active svg {
  transform: translateY(-1px);
}

.mobile-nav-fab {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--color-gold);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-bottom: 8px;
  box-shadow: 0 4px 16px var(--color-gold-glow), 0 2px 6px rgba(0,0,0,0.15);
  transition: transform 100ms ease-out, box-shadow 100ms ease-out;
}

.mobile-nav-fab:active {
  transform: scale(0.93);
  box-shadow: 0 2px 8px var(--color-gold-glow);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MobileNavBar.jsx src/components/MobileNavBar.css
git commit -m "feat(mobile): add MobileNavBar with role-based tabs and FAB"
```

---

## Task 4: Layout Overhaul

**Files:**
- Modify: `src/components/Layout.jsx`
- Modify: `src/components/Layout.css`

- [ ] **Step 1: Replace `src/components/Layout.jsx` entirely**

Read the current file first, then write this complete replacement:

```jsx
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
```

- [ ] **Step 2: Replace `src/components/Layout.css` entirely**

Read the current file first, then write this complete replacement:

```css
/* ===== LAYOUT ===== */

.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-area {
  flex: 1;
  margin-left: var(--sidebar-width);
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  overflow-x: hidden;
  background: var(--color-bg);
}

/* ── Mobile Top Bar ── */
.topbar {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  padding-top: env(safe-area-inset-top);
  height: var(--mobile-header-height);
  background: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: var(--z-header);
}

.topbar-brand {
  font-family: var(--font-family-brand);
  font-size: 0.85rem;
  letter-spacing: 0.14em;
  color: var(--color-gold);
  font-weight: var(--font-weight-semibold);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.topbar-theme-toggle {
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.topbar-theme-toggle:hover {
  border-color: var(--color-border-strong);
  color: var(--color-primary);
}

/* ── Profile Avatar ── */
.topbar-profile-wrap {
  position: relative;
}

.topbar-avatar {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity var(--transition-fast);
}

.topbar-avatar:hover { opacity: 0.85; }

.topbar-popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-header) + 1);
}

.topbar-profile-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-4);
  min-width: 180px;
  z-index: calc(var(--z-header) + 2);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  animation: fadeIn 120ms ease;
}

.topbar-profile-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.topbar-profile-role {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.topbar-profile-logout {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
  cursor: pointer;
  transition: background var(--transition-fast);
  text-align: left;
}

.topbar-profile-logout:hover {
  background: var(--color-danger-bg);
}

/* ── Mobile overrides ── */
@media (max-width: 768px) {
  .main-area { margin-left: 0; }
  .topbar    { display: flex; }
  .main-content {
    padding-bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom));
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.jsx src/components/Layout.css
git commit -m "feat(mobile): overhaul Layout with MobileNavBar, BottomSheet, profile avatar"
```

---

## Task 5: LeadCreate Sheet Mode

**Files:**
- Modify: `src/pages/LeadCreate.jsx`

- [ ] **Step 1: Add `inSheet` and `onSuccess` props**

Open `src/pages/LeadCreate.jsx`. Find the function signature:

```jsx
export default function LeadCreate() {
```

Replace with:

```jsx
export default function LeadCreate({ inSheet = false, onSuccess } = {}) {
```

- [ ] **Step 2: Conditionally hide the page header**

Find the existing page-header block — it looks like:

```jsx
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Add New Lead</h1>
            <p className="page-subtitle">Capture lead information and property requirements</p>
          </div>
        </div>
      </div>
```

Wrap it so it only renders when not in sheet:

```jsx
      {!inSheet && (
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="page-title">Add New Lead</h1>
              <p className="page-subtitle">Capture lead information and property requirements</p>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 3: Wire `onSuccess` after successful submit**

In `handleSubmit`, find the line that navigates on success — it will look like `navigate('/leads')` after the API call succeeds. Replace it with:

```jsx
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/leads');
        }
```

- [ ] **Step 4: Add `page--in-sheet` class to root div**

Find the root return div:

```jsx
    <div className="page">
```

Replace with:

```jsx
    <div className={`page${inSheet ? ' page--in-sheet' : ''}`}>
```

- [ ] **Step 5: Add sheet-mode CSS to `src/pages/LeadCreate.css`**

Append to `src/pages/LeadCreate.css`:

```css
/* ── Sheet mode (inside BottomSheet on mobile) ── */
.page--in-sheet {
  padding: 0;
  min-height: unset;
  background: transparent;
}

.page--in-sheet .lead-form {
  padding: var(--space-4) var(--space-4) 0;
}

.page--in-sheet .form-actions-sticky {
  position: sticky;
  bottom: 0;
  background: var(--color-bg-elevated);
  padding: var(--space-4);
  margin: 0;
  border-top: 1px solid var(--color-border);
  z-index: 10;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/LeadCreate.jsx src/pages/LeadCreate.css
git commit -m "feat(mobile): add inSheet mode to LeadCreate for bottom sheet usage"
```

---

## Task 6: MobileLeadStack Component

**Files:**
- Create: `src/components/MobileLeadStack.jsx`
- Create: `src/components/MobileLeadStack.css`

- [ ] **Step 1: Create `src/components/MobileLeadStack.jsx`**

```jsx
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, ChevronRight, RefreshCw } from 'lucide-react';
import StatusBadge from './StatusBadge';
import './MobileLeadStack.css';

function getLeadName(lead) {
  if (lead.first_name || lead.last_name) {
    return `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
  }
  return lead.lead_name || 'Unknown';
}

function getWhatsAppUrl(phone, countryCode) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) {
    const code = countryCode ? String(countryCode).replace(/\D/g, '') : '91';
    digits = `${code}${digits}`;
  }
  return digits ? `https://wa.me/${digits}` : '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MobileLeadStack({ leads, onRefresh }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const pullRef = useRef({ startY: 0, pulling: false });
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    containerRef.current?.scrollTo({ top: 0 });
  }, [leads]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setCurrentIndex(Math.round(el.scrollTop / el.clientHeight));
  };

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      pullRef.current = { startY: e.touches[0].clientY, pulling: true };
    } else {
      pullRef.current.pulling = false;
    }
  };

  const handleTouchMove = (e) => {
    if (!pullRef.current.pulling) return;
    const delta = e.touches[0].clientY - pullRef.current.startY;
    if (delta > 0) setPullDistance(Math.min(delta, 80));
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    pullRef.current.pulling = false;
  };

  if (!leads.length) return null;

  return (
    <div className="mls-wrap">
      <div
        className="mls-pull-indicator"
        style={{ opacity: pullDistance / 80, transform: `translateY(${pullDistance * 0.4}px)` }}
      >
        <RefreshCw
          size={18}
          className={refreshing ? 'mls-spinning' : ''}
          style={{ transform: `rotate(${pullDistance * 4}deg)` }}
        />
        <span>{pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>
      <div className="mls-counter">{currentIndex + 1} / {leads.length}</div>
      <div
        ref={containerRef}
        className="mls-container"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {leads.map((lead) => {
          const waUrl = getWhatsAppUrl(lead.phone, lead.phone_country_code);
          const telHref = lead.phone
            ? `tel:${lead.phone_country_code ? `+${String(lead.phone_country_code).replace(/\D/g,'')}` : ''}${lead.phone}`
            : '';

          return (
            <div key={lead.id} className="mls-card">
              <div className="mls-card-inner">
                <div className="mls-top-row">
                  <StatusBadge status={lead.status} />
                  {lead.source_name && (
                    <span className="mls-source-chip">{lead.source_name}</span>
                  )}
                </div>

                <div className="mls-name">{getLeadName(lead)}</div>

                {lead.phone && (
                  <a href={telHref} className="mls-phone">
                    <Phone size={13} />
                    {lead.phone}
                    {lead.alternate_phone && (
                      <span className="mls-alt-badge">+alt</span>
                    )}
                  </a>
                )}

                {(lead.property_type || lead.bhk || lead.preferred_location) && (
                  <div className="mls-chips">
                    {lead.property_type && <span className="mls-chip">{lead.property_type}</span>}
                    {lead.bhk && <span className="mls-chip">{lead.bhk}</span>}
                    {lead.preferred_location && (
                      <span className="mls-chip">{lead.preferred_location}</span>
                    )}
                  </div>
                )}

                {lead.requirement_summary && (
                  <div className="mls-summary">{lead.requirement_summary}</div>
                )}

                <div className="mls-meta">{formatDate(lead.created_at)}</div>

                <div className="mls-actions">
                  {lead.phone && (
                    <a href={telHref} className="mls-btn mls-btn-call">
                      <Phone size={17} />
                      <span>Call</span>
                    </a>
                  )}
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mls-btn mls-btn-wa"
                    >
                      <MessageCircle size={17} />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  <button
                    className="mls-btn mls-btn-view"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <span>Details</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/MobileLeadStack.css`**

```css
/* ===== MOBILE LEAD STACK ===== */

.mls-wrap {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mls-pull-indicator {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  pointer-events: none;
  z-index: 2;
  transition: opacity 100ms;
}

.mls-spinning {
  animation: mls-spin 600ms linear infinite;
}

@keyframes mls-spin {
  to { transform: rotate(360deg); }
}

.mls-counter {
  position: absolute;
  top: var(--space-3);
  right: var(--space-4);
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: var(--font-weight-medium);
  z-index: 3;
  background: var(--color-bg-elevated);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
}

.mls-container {
  flex: 1;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

.mls-card {
  scroll-snap-align: start;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.mls-card-inner {
  flex: 1;
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.mls-top-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.mls-source-chip {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
}

.mls-name {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
}

.mls-phone {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-base);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  min-height: 44px;
}

.mls-alt-badge {
  font-size: 10px;
  padding: 1px 6px;
  background: var(--color-primary-dim);
  color: var(--color-primary);
  border-radius: var(--radius-full);
}

.mls-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.mls-chip {
  font-size: var(--font-size-xs);
  padding: 4px 10px;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
}

.mls-summary {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mls-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: auto;
}

.mls-actions {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.mls-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
  text-decoration: none;
  border: none;
  cursor: pointer;
  min-height: 44px;
  transition: opacity var(--transition-fast);
}

.mls-btn:active { opacity: 0.7; transform: scale(0.97); }

.mls-btn-call {
  background: var(--color-primary-dim);
  color: var(--color-primary);
  flex: 1;
}

.mls-btn-wa {
  background: rgba(37, 211, 102, 0.1);
  color: #25D366;
  flex: 1;
}

.mls-btn-view {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  flex: 1;
  border: 1px solid var(--color-border);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MobileLeadStack.jsx src/components/MobileLeadStack.css
git commit -m "feat(mobile): add MobileLeadStack scroll-snap card view with pull-to-refresh"
```

---

## Task 7: LeadList Mobile View

**Files:**
- Modify: `src/pages/LeadList.jsx`
- Modify: `src/pages/LeadList.css`

- [ ] **Step 1: Import MobileLeadStack in `LeadList.jsx`**

At the top of `src/pages/LeadList.jsx`, after the last local import, add:

```jsx
import MobileLeadStack from '../components/MobileLeadStack';
```

- [ ] **Step 2: Add `isMobile` state to LeadList**

Inside the `LeadList` component (or whichever component renders the lead content), after the existing `useState` declarations, add:

```jsx
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
```

- [ ] **Step 3: Render `MobileLeadStack` on mobile in place of the table**

The LeadList has two code paths: admin view and sales view. In each, find where the table/results list renders (inside the page content area, after filters/search). Wrap the table in a desktop-only condition and add the mobile stack alongside.

The pattern to apply in **both** views (admin and sales) — find the table/results container and wrap like this:

```jsx
{/* Mobile card stack — shown only on mobile when filtering */}
{isMobile && isFiltering && (
  <MobileLeadStack
    leads={filteredLeads}
    onRefresh={refreshLeads}
  />
)}

{/* Desktop table — hidden on mobile */}
{!isMobile && (
  /* existing table JSX goes here, unchanged */
)}
```

Note: `filteredLeads` and `isFiltering` are the existing state variables. For `onRefresh`, find the function in the component that re-fetches leads from the API (search for `setLeads(` or `fetchLeads` or `loadLeads` — use whichever name exists). Name it `refreshLeads` in the prop. Wrap the existing table JSX — do not move or modify it, just add the `!isMobile &&` condition around it.

- [ ] **Step 4: Add `leads-page` class to root div in `LeadList.jsx` and add mobile CSS**

In `LeadList.jsx`, find the root return div (it will be `<div className="page">`) and add the extra class:

```jsx
<div className="page leads-page">
```

Then append to `src/pages/LeadList.css`:

```css
/* ── Mobile lead stack context ── */
@media (max-width: 768px) {
  .leads-page .page-header {
    position: sticky;
    top: var(--mobile-header-height);
    background: var(--color-bg);
    z-index: 5;
    padding-top: var(--space-3);
    padding-bottom: var(--space-3);
  }

  .leads-page {
    display: flex;
    flex-direction: column;
    height: calc(100dvh - var(--mobile-header-height) - var(--mobile-nav-height) - env(safe-area-inset-bottom));
    overflow: hidden;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/LeadList.jsx src/pages/LeadList.css
git commit -m "feat(mobile): render MobileLeadStack in LeadList on mobile"
```

---

## Task 8: LeadDetail Mobile Polish

**Files:**
- Modify: `src/pages/LeadDetail.jsx`
- Modify: `src/pages/LeadDetail.css`

- [ ] **Step 1: Add floating action bar to `LeadDetail.jsx`**

In `src/pages/LeadDetail.jsx`, first add `lead-detail-page` to the root div: find `<div className="page">` in the return statement and change it to `<div className="page lead-detail-page">`. Then find the existing `whatsappUrl` variable (already computed in the file). Inside the outermost div, add a floating action bar **before** the closing `</div>`:

```jsx
      {/* Mobile floating actions */}
      <div className="detail-mobile-fab-bar">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="detail-fab detail-fab-call"
            aria-label="Call lead"
          >
            <Phone size={20} />
            <span>Call</span>
          </a>
        )}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="detail-fab detail-fab-wa"
            aria-label="WhatsApp"
          >
            <MessageCircle size={20} />
            <span>WhatsApp</span>
          </a>
        )}
      </div>
```

Make sure `MessageCircle` is imported — check the existing imports at the top of `LeadDetail.jsx`; it's already imported (`MessageCircle` from lucide-react).

- [ ] **Step 2: Add mobile CSS to `src/pages/LeadDetail.css`**

Append to `src/pages/LeadDetail.css`:

```css
/* ── Mobile lead detail polish ── */
@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-card {
    padding: var(--space-4);
  }

  /* Floating call/WhatsApp bar */
  .detail-mobile-fab-bar {
    display: flex;
    position: fixed;
    bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom) + var(--space-3));
    left: var(--space-4);
    right: var(--space-4);
    gap: var(--space-3);
    z-index: 50;
  }

  .detail-fab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: 14px;
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    text-decoration: none;
    box-shadow: var(--shadow-lg);
    min-height: 52px;
    transition: transform 100ms ease-out, opacity 100ms;
  }

  .detail-fab:active {
    transform: scale(0.96);
    opacity: 0.85;
  }

  .detail-fab-call {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .detail-fab-wa {
    background: #25D366;
    color: #fff;
  }

  /* Add bottom padding so content isn't hidden behind FAB bar */
  .lead-detail-page {
    padding-bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom) + 80px);
  }
}

/* Hide FAB bar on desktop */
@media (min-width: 769px) {
  .detail-mobile-fab-bar { display: none; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/LeadDetail.jsx src/pages/LeadDetail.css
git commit -m "feat(mobile): add floating call/WhatsApp bar and mobile polish to LeadDetail"
```

---

## Task 9: Dashboard + UserManagement Mobile Polish

**Files:**
- Modify: `src/pages/Dashboard.css`
- Modify: `src/pages/UserManagement.jsx` (add touch targets)

- [ ] **Step 1: Add mobile polish to `src/pages/Dashboard.css`**

Append to `src/pages/Dashboard.css`:

```css
/* ── Dashboard mobile enhancements ── */
@media (max-width: 768px) {
  .page-header {
    padding: var(--space-4);
  }

  .stat-card {
    min-height: 44px;
  }

  /* Charts already stack at 768px via existing rules — verify they look OK */
  .dashboard-grid {
    padding: var(--space-4);
    gap: var(--space-4);
  }
}
```

- [ ] **Step 2: Add mobile touch targets to `src/pages/UserManagement.jsx`**

Open `src/pages/UserManagement.jsx`. Find any `<button>` elements that have small padding (e.g., icon-only buttons in the user list rows). Add `style={{ minHeight: '44px', minWidth: '44px' }}` to any button that's icon-only or very small.

Alternatively, add CSS to `src/pages/UserManagement.css` (check if this file exists; if not, add inline or in `LeadList.css` scope). Append to whichever CSS file governs this page:

```css
@media (max-width: 768px) {
  .user-list .btn,
  .user-row .btn {
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
  }
}
```

Note: inspect the actual class names in UserManagement to find the right selectors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.css
git commit -m "feat(mobile): dashboard and user management mobile touch polish"
```

---

## Task 10: Global Mobile Polish + Smoke Test

**Files:**
- Modify: `src/styles/variables.css` (safe-area utility)
- Modify: `src/App.css` (momentum scroll on all scroll containers)

- [ ] **Step 1: Add momentum scroll utility to `src/App.css`**

Append to `src/App.css`:

```css
/* ── Momentum scrolling on all scroll containers ── */
@media (max-width: 768px) {
  .page,
  .modal-body,
  [class*="-list"],
  [class*="-content"] {
    -webkit-overflow-scrolling: touch;
  }

  /* Ensure form inputs are min 44px tall on mobile */
  .form-group input,
  .form-group select,
  .form-group textarea {
    min-height: 44px;
  }
}
```

- [ ] **Step 2: Verify safe-area on Sidebar**

Open `src/components/Sidebar.css`. Check if the `.sidebar` has `padding-top: env(safe-area-inset-top)`. On mobile, the sidebar is hidden, so this is low-priority — skip if not needed.

- [ ] **Step 3: Smoke test on mobile viewport**

Run the dev server:

```bash
npm run dev
```

Open browser DevTools → toggle device toolbar → select iPhone 12/13 (390×844). Check:

1. Bottom tab bar visible, FAB gold, tabs route correctly ✓
2. Top bar shows "SPACE LINK" + profile avatar ✓
3. Tap profile avatar → popover shows name, role, sign out ✓
4. Tap FAB (+) → BottomSheet slides up with Add Lead form ✓
5. Drag bottom sheet handle down → dismisses ✓
6. Submit add lead form → sheet closes ✓
7. Navigate to Leads → lead card stack shows when search/filter active ✓
8. Pull down from top of card stack → pull indicator shows, releases refresh ✓
9. Counter "1 / N" visible top-right ✓
10. Tap "Details" on card → navigates to LeadDetail ✓
11. LeadDetail shows floating Call + WhatsApp buttons above bottom nav ✓
12. Desktop at 1024px width → sidebar visible, no bottom nav, layout unchanged ✓

- [ ] **Step 4: Final commit**

```bash
git add src/App.css src/styles/variables.css
git commit -m "feat(mobile): global momentum scroll, touch targets, mobile polish complete"
```
