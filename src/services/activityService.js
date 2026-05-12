// ===== ACTIVITY SERVICE =====
import { getCollection, setCollection, generateId } from './storage';

const COLLECTION = 'crm_activities';

export function logActivity(leadId, activityType, description, performedBy) {
  const activities = getCollection(COLLECTION);
  const activity = {
    id: 'act_' + generateId(),
    lead_id: leadId,
    activity_type: activityType,
    description,
    performed_by: performedBy,
    created_at: new Date().toISOString(),
  };
  activities.push(activity);
  setCollection(COLLECTION, activities);
  return activity;
}

export function getActivitiesByLead(leadId) {
  return getCollection(COLLECTION)
    .filter(a => a.lead_id === leadId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function getRecentActivities(limit = 20) {
  return getCollection(COLLECTION)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}
