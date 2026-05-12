// ===== LEAD SERVICE =====
import { getCollection, setCollection, generateId } from './storage';
import { logActivity } from './activityService';

const COLLECTION = 'crm_leads';

export function getAllLeads() {
  return getCollection(COLLECTION).sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
  );
}

export function getLeadById(id) {
  const leads = getCollection(COLLECTION);
  return leads.find(l => l.id === id) || null;
}

export function createLead(leadData, userId) {
  const leads = getCollection(COLLECTION);
  const newLead = {
    ...leadData,
    id: 'lead_' + generateId(),
    status: leadData.status || 'new',
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  leads.push(newLead);
  setCollection(COLLECTION, leads);

  logActivity(newLead.id, 'created', `Lead created - ${newLead.lead_name}`, userId);
  return newLead;
}

export function updateLead(id, updates, userId) {
  const leads = getCollection(COLLECTION);
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) return null;

  const oldLead = { ...leads[index] };
  leads[index] = {
    ...leads[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  setCollection(COLLECTION, leads);

  // Log status change
  if (updates.status && updates.status !== oldLead.status) {
    const statusLabel = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    logActivity(id, 'status_change',
      `Status changed from ${statusLabel(oldLead.status)} to ${statusLabel(updates.status)}${updates.status_note ? ': ' + updates.status_note : ''}`,
      userId
    );
  }

  // Log assignment change
  if (updates.assigned_to && updates.assigned_to !== oldLead.assigned_to) {
    logActivity(id, 'assignment_change', `Lead reassigned`, userId);
  }

  // General update
  if (!updates.status && !updates.assigned_to) {
    logActivity(id, 'updated', 'Lead information updated', userId);
  }

  return leads[index];
}

export function deleteLead(id, userId) {
  const leads = getCollection(COLLECTION);
  const lead = leads.find(l => l.id === id);
  if (!lead) return false;
  const filtered = leads.filter(l => l.id !== id);
  setCollection(COLLECTION, filtered);
  logActivity(id, 'deleted', `Lead deleted - ${lead.lead_name}`, userId);
  return true;
}

export function searchLeads(query) {
  const leads = getAllLeads();
  if (!query) return leads;
  const q = query.toLowerCase().trim();
  return leads.filter(l =>
    l.lead_name.toLowerCase().includes(q) ||
    l.phone.includes(q) ||
    (l.alternate_phone && l.alternate_phone.includes(q)) ||
    (l.email && l.email.toLowerCase().includes(q))
  );
}

export function filterLeads(filters) {
  let leads = getAllLeads();

  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    leads = leads.filter(l =>
      l.lead_name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.alternate_phone && l.alternate_phone.includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q))
    );
  }

  if (filters.source_id) {
    leads = leads.filter(l => l.source_id === filters.source_id);
  }

  if (filters.status) {
    leads = leads.filter(l => l.status === filters.status);
  }

  if (filters.assigned_to) {
    leads = leads.filter(l => l.assigned_to === filters.assigned_to);
  }

  if (filters.date_from) {
    leads = leads.filter(l => new Date(l.created_at) >= new Date(filters.date_from));
  }

  if (filters.date_to) {
    const endDate = new Date(filters.date_to);
    endDate.setHours(23, 59, 59, 999);
    leads = leads.filter(l => new Date(l.created_at) <= endDate);
  }

  return leads;
}

export function checkDuplicate(phone, alternatePhone, excludeId = null) {
  const leads = getCollection(COLLECTION);
  const duplicates = leads.filter(l => {
    if (excludeId && l.id === excludeId) return false;
    const phones = [l.phone, l.alternate_phone].filter(Boolean);
    const checkPhones = [phone, alternatePhone].filter(Boolean);
    return checkPhones.some(p => phones.includes(p));
  });
  return duplicates;
}

function toLocalDateStr(isoStr) {
  const d = new Date(isoStr);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getTodayStr() {
  return toLocalDateStr(new Date().toISOString());
}

export function getLeadStats() {
  const leads = getAllLeads();
  const today = getTodayStr();

  return {
    total: leads.length,
    todayWalkIns: leads.filter(l =>
      l.source_id === 'src_walkin' && toLocalDateStr(l.created_at) === today
    ).length,
    followUpsDue: leads.filter(l => l.status === 'followup').length,
    newToday: leads.filter(l => toLocalDateStr(l.created_at) === today).length,
    byStatus: leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {}),
    bySource: leads.reduce((acc, l) => {
      acc[l.source_id] = (acc[l.source_id] || 0) + 1;
      return acc;
    }, {}),
    byAssignee: leads.reduce((acc, l) => {
      if (l.assigned_to) {
        acc[l.assigned_to] = (acc[l.assigned_to] || 0) + 1;
      }
      return acc;
    }, {}),
  };
}

export function getTodayLeads() {
  const today = getTodayStr();
  return getAllLeads().filter(l => toLocalDateStr(l.created_at) === today);
}

