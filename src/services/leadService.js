// ===== LEAD SERVICE — API BACKED =====
import { apiGet, apiPost, apiPut, apiDelete } from './storage';

export async function getAllLeads() {
  return await apiGet('/leads');
}

export async function getLeadById(id) {
  try {
    return await apiGet(`/leads/${id}`);
  } catch {
    return null;
  }
}

export async function createLead(leadData, userId) {
  return await apiPost('/leads', { ...leadData, created_by: userId });
}

export async function updateLead(id, updates, userId) {
  return await apiPut(`/leads/${id}`, { ...updates, userId });
}

export async function deleteLead(id, userId) {
  await apiDelete(`/leads/${id}?userId=${userId}`);
  return true;
}

export async function filterLeads(filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.source_id) params.set('source_id', filters.source_id);
  if (filters.status) params.set('status', filters.status);
  if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  const qs = params.toString();
  return await apiGet(`/leads${qs ? '?' + qs : ''}`);
}

export async function checkDuplicate(phone, alternatePhone, excludeId = null) {
  const params = new URLSearchParams();
  if (phone) params.set('phone', phone);
  if (alternatePhone) params.set('alternate_phone', alternatePhone);
  if (excludeId) params.set('exclude_id', excludeId);
  return await apiGet(`/leads/check-duplicate?${params}`);
}

export async function getLeadStats() {
  return await apiGet('/dashboard/stats');
}

export async function getTodayLeads() {
  return await apiGet('/leads/today');
}
