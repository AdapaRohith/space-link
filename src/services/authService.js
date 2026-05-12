// ===== AUTH SERVICE =====
import { getCollection } from './storage';

const SESSION_KEY = 'crm_session';

export function login(email, password) {
  const users = getCollection('crm_users');
  const user = users.find(
    u => u.email === email && u.password_hash === password && u.active
  );
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
  const users = getCollection('crm_users');
  return users.find(u => u.id === session.userId) || null;
}

export function getAllUsers() {
  return getCollection('crm_users').filter(u => u.active);
}

export function getUserById(id) {
  const users = getCollection('crm_users');
  return users.find(u => u.id === id) || null;
}

export function getUserName(id) {
  const user = getUserById(id);
  return user ? user.name : 'Unknown';
}

export function hasPermission(action) {
  const session = getSession();
  if (!session) return false;

  const permissions = {
    admin: ['create_lead', 'edit_lead', 'delete_lead', 'assign_lead', 'view_all', 'manage_users', 'view_audit', 'override_duplicate'],
    sales: ['create_lead', 'edit_lead', 'assign_lead', 'view_leads', 'add_visit', 'update_status'],
    receptionist: ['create_lead', 'create_walkin', 'assign_lead', 'view_leads'],
  };

  const rolePerms = permissions[session.role] || [];
  return rolePerms.includes(action) || session.role === 'admin';
}

export function addUser(userData) {
  const users = getCollection('crm_users');
  const newUser = {
    ...userData,
    id: 'user_' + Date.now().toString(36),
    active: true,
  };
  users.push(newUser);
  localStorage.setItem('crm_users', JSON.stringify(users));
  return newUser;
}

export function updateUser(id, updates) {
  const users = getCollection('crm_users');
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  users[index] = { ...users[index], ...updates };
  localStorage.setItem('crm_users', JSON.stringify(users));
  return users[index];
}

export function toggleUserActive(id) {
  const users = getCollection('crm_users');
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  users[index].active = !users[index].active;
  localStorage.setItem('crm_users', JSON.stringify(users));
  return users[index];
}
