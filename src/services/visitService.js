// ===== VISIT SERVICE =====
import { getCollection, setCollection, generateId } from './storage';
import { logActivity } from './activityService';

const COLLECTION = 'crm_visits';

export function getVisitsByLead(leadId) {
  return getCollection(COLLECTION)
    .filter(v => v.lead_id === leadId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function addVisit(visitData, userId) {
  const visits = getCollection(COLLECTION);
  const newVisit = {
    ...visitData,
    id: 'visit_' + generateId(),
    created_by: userId,
    created_at: new Date().toISOString(),
  };
  visits.push(newVisit);
  setCollection(COLLECTION, visits);

  logActivity(
    visitData.lead_id,
    'visit_logged',
    `Site visit logged at ${visitData.site_location || 'site'}`,
    userId
  );
  return newVisit;
}

export function getTodayVisits() {
  const today = new Date().toISOString().split('T')[0];
  return getCollection(COLLECTION).filter(v => v.visit_date === today);
}

export function getAllVisits() {
  return getCollection(COLLECTION).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}
