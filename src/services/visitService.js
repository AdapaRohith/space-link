// ===== VISIT SERVICE — API BACKED =====
import { apiGet, apiPost } from './storage';

export async function getVisitsByLead(leadId) {
  return await apiGet(`/visits?lead_id=${leadId}`);
}

export async function addVisit(visitData, userId) {
  return await apiPost('/visits', { ...visitData, created_by: userId });
}

export async function getTodayVisits() {
  return await apiGet('/visits/today');
}

export async function getAllVisits() {
  return await apiGet('/visits');
}
