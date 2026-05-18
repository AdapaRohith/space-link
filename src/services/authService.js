// ===== AUTH SERVICE — API BACKED =====
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './storage';

const SESSION_KEY = 'crm_session';

export async function login(email, password) {
  try {
    const session = await apiPost('/auth/login', { email, password });
    if (session && session.userId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
    return null;
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

export function getCurrentUser() {
  return getSession();
}

// Cache for users fetched from API
let _usersCache = null;

export async function getAllUsers() {
  try {
    const users = await apiGet('/users/active');
    _usersCache = users;
    return users;
  } catch {
    return _usersCache || [];
  }
}

export async function getAllUsersIncludingInactive() {
  try {
    const users = await apiGet('/users');
    _usersCache = users;
    return users;
  } catch {
    return _usersCache || [];
  }
}

export function getUserById(id) {
  if (_usersCache) {
    return _usersCache.find(u => u.id === id) || null;
  }
  return null;
}

export function getUserName(id, usersCache) {
  if (usersCache) {
    const user = usersCache.find(u => u.id === id);
    if (user) return user.name;
  }
  if (_usersCache) {
    const user = _usersCache.find(u => u.id === id);
    if (user) return user.name;
  }
  return id || 'Unknown';
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

export async function addUser(userData) {
  try {
    const user = await apiPost('/users', userData);
    _usersCache = null; // invalidate cache
    return user;
  } catch {
    return null;
  }
}

export async function updateUser(id, updates) {
  try {
    const user = await apiPut(`/users/${id}`, updates);
    _usersCache = null;
    return user;
  } catch {
    return null;
  }
}

export async function toggleUserActive(id) {
  try {
    const user = await apiPatch(`/users/${id}/toggle`);
    _usersCache = null;
    return user;
  } catch {
    return null;
  }
}

export async function deleteUser(id) {
  try {
    await apiDelete(`/users/${id}`);
    _usersCache = null;
    return true;
  } catch {
    return false;
  }
}

export async function signup(userData) {
  return await apiPost('/auth/signup', userData);
}

export async function getPendingUsers() {
  try {
    return await apiGet('/users/pending');
  } catch {
    return [];
  }
}

export async function approveUser(id) {
  try {
    const user = await apiPost(`/users/${id}/approve`, {});
    _usersCache = null;
    return user;
  } catch {
    return null;
  }
}

export async function rejectUser(id) {
  try {
    await apiDelete(`/users/${id}`);
    _usersCache = null;
    return true;
  } catch {
    return false;
  }
}
