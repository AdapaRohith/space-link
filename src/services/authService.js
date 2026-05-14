// ===== AUTH SERVICE — HARDCODED CREDENTIALS =====

const SESSION_KEY = 'crm_session';

// Hardcoded users — no backend needed for login
const USERS = [
  {
    id: 'user_admin',
    name: 'KarunaKumar',
    role: 'admin',
    email: 'karuna@spacelink.in',
    password: 'admin123',
  },
  {
    id: 'user_sales1',
    name: 'Sales Team',
    role: 'sales',
    email: 'sales@spacelink.in',
    password: 'sales123',
  },
];

export function login(email, password) {
  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) return null;

  const session = {
    userId: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    loginAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return USERS.find(u => u.id === session.userId) || null;
}

export function getAllUsers() {
  return USERS.map(({ password, ...u }) => u);
}

export function getAllUsersIncludingInactive() {
  return USERS.map(({ password, ...u }) => ({ ...u, active: true }));
}

export function getUserById(id) {
  const user = USERS.find(u => u.id === id);
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

export function getUserName(id, usersCache) {
  if (usersCache) {
    const user = usersCache.find(u => u.id === id);
    if (user) return user.name;
  }
  // Fallback to hardcoded list
  const user = USERS.find(u => u.id === id);
  return user ? user.name : id || 'Unknown';
}

export function hasPermission(action) {
  const session = getSession();
  if (!session) return false;

  const permissions = {
    admin: ['create_lead', 'edit_lead', 'delete_lead', 'assign_lead', 'view_all', 'manage_users', 'view_audit', 'override_duplicate'],
    sales: ['create_lead', 'edit_lead', 'assign_lead', 'view_leads', 'add_visit', 'update_status'],
  };

  const rolePerms = permissions[session.role] || [];
  return rolePerms.includes(action) || session.role === 'admin';
}

export function addUser() { return null; }
export function updateUser() { return null; }
export function toggleUserActive() { return null; }
