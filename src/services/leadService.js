// ===== LEAD SERVICE — API BACKED =====
import { apiGet, apiPost, apiPut, apiDelete } from './storage';
import {
  slilgGetAllLeads,
  slilgSearchLeads,
  slilgCreateLead,
  mergeLeads,
} from './slilgService';
import { getSession } from './authService';

// Admin sees merged results from both DBs.
// Sales sees only primary DB for getAllLeads (search fans out separately).
export async function getAllLeads() {
  const session = getSession();
  if (session?.role !== 'admin') return apiGet('/leads');

  const [primaryResult, slilgResult] = await Promise.allSettled([
    apiGet('/leads'),
    slilgGetAllLeads(),
  ]);
  const primary = primaryResult.status === 'fulfilled'
    ? (Array.isArray(primaryResult.value) ? primaryResult.value : [])
    : [];
  const slilg = slilgResult.status === 'fulfilled' ? slilgResult.value : [];
  return mergeLeads(primary, slilg);
}

export async function getLeadById(id) {
  try {
    // SLILG leads have ids prefixed with 'slilg_'
    if (typeof id === 'string' && id.startsWith('slilg_')) {
      return null; // SLILG lead detail not supported in SpaceLink UI
    }
    return await apiGet(`/leads/${id}`);
  } catch {
    return null;
  }
}

// Mirrors to SLILG best-effort — does not block on failure.
export async function createLead(leadData, userId) {
  const [primary] = await Promise.allSettled([
    apiPost('/leads', { ...leadData, created_by: userId }),
    slilgCreateLead(leadData),
  ]);

  if (primary.status === 'rejected') throw new Error(primary.reason?.message || 'Failed to create lead');
  return primary.value;
}

export async function updateLead(id, updates, userId) {
  return await apiPut(`/leads/${id}`, { ...updates, userId });
}

export async function deleteLead(id, userId) {
  await apiDelete(`/leads/${id}?userId=${userId}`);
  return true;
}

// Fans out to both APIs when a search term is present.
// Without search term, admin gets merged list; sales gets primary only.
export async function filterLeads(filters) {
  const session = getSession();
  const params = new URLSearchParams();
  if (filters.search)      params.set('search', filters.search);
  if (filters.source_id)   params.set('source_id', filters.source_id);
  if (filters.status)      params.set('status', filters.status);
  if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);
  if (filters.date_from)   params.set('date_from', filters.date_from);
  if (filters.date_to)     params.set('date_to', filters.date_to);
  const qs = params.toString();

  const primaryPromise = apiGet(`/leads${qs ? '?' + qs : ''}`);

  // Fan out SLILG only when there's a search term (or admin loading all)
  const shouldFanOut = filters.search || session?.role === 'admin';

  if (!shouldFanOut) {
    return await primaryPromise;
  }

  const [primaryResult, slilgResult] = await Promise.allSettled([
    primaryPromise,
    filters.search
      ? slilgSearchLeads(filters.search)
      : slilgGetAllLeads(),
  ]);

  const primary = primaryResult.status === 'fulfilled'
    ? (Array.isArray(primaryResult.value) ? primaryResult.value : [])
    : [];
  const slilg = slilgResult.status === 'fulfilled' ? slilgResult.value : [];

  return mergeLeads(primary, slilg);
}

export async function checkDuplicate(phone, alternatePhone, excludeId = null) {
  const params = new URLSearchParams();
  if (phone)          params.set('phone', phone);
  if (alternatePhone) params.set('alternate_phone', alternatePhone);
  if (excludeId)      params.set('exclude_id', excludeId);
  return await apiGet(`/leads/check-duplicate?${params}`);
}

export async function getLeadStats() {
  return await apiGet('/dashboard/stats');
}

export async function getTodayLeads() {
  return await apiGet('/leads/today');
}
