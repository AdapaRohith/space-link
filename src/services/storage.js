// ===== API HELPER =====

const API_BASE = 'https://crm-sli-api.avlokai.com/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(url, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export function api(path, options) {
  return request(path, options);
}

export function apiGet(path) {
  return request(path);
}

export function apiPost(path, body) {
  return request(path, { method: 'POST', body });
}

export function apiPut(path, body) {
  return request(path, { method: 'PUT', body });
}

export function apiPatch(path, body) {
  return request(path, { method: 'PATCH', body });
}

export function apiDelete(path) {
  return request(path, { method: 'DELETE' });
}
