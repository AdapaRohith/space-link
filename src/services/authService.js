// ===== AUTH SERVICE — API BACKED =====
import { apiGet, apiPost, apiPut, apiPatch } from './storage';

const SESSION_KEY = 'crm_session';

export async function login(email, password) {
  try {
    const session = await apiPost('/auth/login', { email, password });
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch {
    return null;
  }
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

export async function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  try {
    return await apiGet(`/users/${session.userId}`);
  } catch {
    return null;
  }
}

export async function getAllUsers() {
  try {
    return await apiGet('/users/active');
  } catch {
    return [];
  }
}

export async function getAllUsersIncludingInactive() {
  try {
    return await apiGet('/users');
  } catch {
    return [];
  }
}

export async function getUserById(id) {
  try {
    return await apiGet(`/users/${id}`);
  } catch {
    return null;
  }
}

export function getUserName(id, usersCache) {
  if (!usersCache) return id || 'Unknown';
  const user = usersCache.find(u => u.id === id);
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

export async function addUser(userData) {
  return await apiPost('/users', userData);
}

export async function updateUser(id, updates) {
  return await apiPut(`/users/${id}`, updates);
}

export async function toggleUserActive(id) {
  return await apiPatch(`/users/${id}/toggle`);
}
