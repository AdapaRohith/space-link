// ===== ACTIVITY SERVICE — API BACKED =====
import { apiGet, apiPost } from './storage';

export async function logActivity(leadId, activityType, description, performedBy) {
  return await apiPost('/activities', {
    lead_id: leadId,
    activity_type: activityType,
    description,
    performed_by: performedBy,
  });
}

export async function getActivitiesByLead(leadId) {
  return await apiGet(`/activities?lead_id=${leadId}`);
}

export async function getRecentActivities(limit = 20) {
  return await apiGet(`/activities?limit=${limit}`);
}
