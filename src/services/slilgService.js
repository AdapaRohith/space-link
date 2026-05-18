const SLILG_BASE = 'https://slilg-api.avlokai.com';

async function slilgFetch(path, options = {}) {
  try {
    const res = await fetch(`${SLILG_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '').slice(-10);
}

function normalize(lead) {
  if (!lead) return null;
  const name = lead.name || lead.lead_name || '';
  const nameParts = name.trim().split(' ');
  return {
    id:             `slilg_${lead.id || lead._id || lead.phone}`,
    first_name:     lead.first_name || nameParts[0] || '',
    last_name:      lead.last_name  || nameParts.slice(1).join(' ') || '',
    lead_name:      name,
    phone:          lead.phone || '',
    alternate_phone: lead.alternate_phone || lead.alt_phone || '',
    email:          lead.email || '',
    status:         lead.status || 'New',
    source_id:      lead.source_id || lead.source || null,
    property_type:  lead.property_type || lead.propertyType || null,
    bhk:            lead.bhk || null,
    budget_min:     lead.budget_min || lead.budgetMin || null,
    budget_max:     lead.budget_max || lead.budgetMax || null,
    location:       lead.location || lead.preferred_location || null,
    assigned_to:    lead.assigned_to || lead.assignedTo || null,
    created_at:     lead.created_at  || lead.createdAt  || null,
    updated_at:     lead.updated_at  || lead.updatedAt  || null,
    notes:          lead.notes || '',
    _source:        'slilg',
  };
}

// Deduplicate by last-10-digit phone. SpaceLink records win on collision.
export function mergeLeads(primaryLeads = [], slilgLeads = []) {
  const phones = new Set(
    primaryLeads.map(l => normalizePhone(l.phone)).filter(Boolean)
  );
  const unique = slilgLeads.filter(l => {
    const p = normalizePhone(l.phone);
    return p && !phones.has(p);
  });
  return [...primaryLeads, ...unique];
}

export async function slilgGetAllLeads() {
  const data = await slilgFetch('/leads');
  if (!Array.isArray(data)) return [];
  return data.map(normalize).filter(Boolean);
}

export async function slilgSearchLeads(query) {
  if (!query) return [];
  const data = await slilgFetch(`/search?q=${encodeURIComponent(query)}`);
  const leads = Array.isArray(data) ? data : data?.leads || data?.results || [];
  return leads.map(normalize).filter(Boolean);
}

export async function slilgCreateLead(leadData) {
  return await slilgFetch('/leads', {
    method: 'POST',
    body: {
      name:           [leadData.first_name, leadData.last_name].filter(Boolean).join(' '),
      first_name:     leadData.first_name,
      last_name:      leadData.last_name,
      phone:          leadData.phone,
      alternate_phone: leadData.alternate_phone,
      email:          leadData.email,
      status:         leadData.status,
      source_id:      leadData.source_id,
      property_type:  leadData.property_type,
      bhk:            leadData.bhk,
      budget_min:     leadData.budget_min,
      budget_max:     leadData.budget_max,
      location:       leadData.location,
      notes:          leadData.notes,
    },
  });
}
