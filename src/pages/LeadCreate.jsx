import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, MapPin, Building2, DollarSign, Save,
  ArrowLeft, AlertTriangle, UserCheck, MessageSquare
} from 'lucide-react';
import { createLead, checkDuplicate } from '../services/leadService';
import { addVisit } from '../services/visitService';
import { getAllSources, addCustomSource } from '../services/sourceService';
import { getAllUsers, getSession } from '../services/authService';
import { PROPERTY_TYPES, BHK_OPTIONS } from '../data/seedData';
import './LeadCreate.css';

export default function LeadCreate() {
  const navigate = useNavigate();
  const session = getSession();

  const [sources, setSources] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function load() {
      setUsers(await getAllUsers());
      try { setSources(await getAllSources()); } catch { setSources([]); }
    }
    load();
  }, []);

  const [form, setForm] = useState({
    first_name: '', last_name: '',
    phone_country_code: '+91', phone: '', alternate_phone: '', email: '',
    source_id: '', custom_source: '', assigned_to: '', attended_by: '',
    tele_caller_name: '', requirement_summary: '',
    site_visit_scheduled: false, site_visit_done: false, feedback: '',
    budget: '', preferred_location: '', property_type: '', bhk: '', notes: '',
    referrer_name: '', referrer_phone: '',
    walkin_date: new Date().toISOString().split('T')[0],
    walkin_time: new Date().toTimeString().slice(0, 5),
    visit_date: '', visit_time: '', site_location: '', visit_notes: '',
  });

  const [errors, setErrors] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCustomSource, setShowCustomSource] = useState(false);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const isWalkIn = form.source_id === 'src_walkin';
  const isReference = form.source_id === 'src_reference';

  const handlePhoneBlur = async () => {
    if (form.phone.length >= 10) {
      const dupes = await checkDuplicate(form.phone, form.alternate_phone);
      if (dupes.length > 0) {
        setDuplicates(dupes);
        setShowDuplicateWarning(true);
      } else {
        setDuplicates([]);
        setShowDuplicateWarning(false);
      }
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    if (!form.last_name.trim()) errs.last_name = 'Last name is required';
    if (!form.phone_country_code.trim()) errs.phone_country_code = 'Country code is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    else if (form.phone.replace(/\D/g, '').length < 10) errs.phone = 'Enter a valid phone number';
    if (!form.alternate_phone.trim()) errs.alternate_phone = 'Alternate number is required';
    else if (form.alternate_phone.replace(/\D/g, '').length < 10) errs.alternate_phone = 'Enter a valid alternate number';
    if (!form.source_id) errs.source_id = 'Source is required';
    if (!form.assigned_to) errs.assigned_to = 'Assignment is required';
    if (!form.attended_by) errs.attended_by = 'Handled by is required';
    if (!form.tele_caller_name.trim()) errs.tele_caller_name = 'Tele caller name is required';
    if (showCustomSource && !form.custom_source.trim()) errs.custom_source = 'Enter custom source name';
    if (isWalkIn) {
      if (!form.walkin_date) errs.walkin_date = 'Walk-in date is required';
      if (!form.walkin_time) errs.walkin_time = 'Walk-in time is required';
    }
    if (isReference) {
      if (!form.referrer_name.trim()) errs.referrer_name = 'Referrer name is required';
      if (!form.referrer_phone.trim()) errs.referrer_phone = 'Referrer phone is required';
      else if (form.referrer_phone.replace(/\D/g, '').length < 10) errs.referrer_phone = 'Enter a valid referrer phone';
    }
    if (!form.requirement_summary.trim()) errs.requirement_summary = 'Requirement summary is required';
    if (!form.budget.trim()) errs.budget = 'Budget is required';
    if (!form.preferred_location.trim()) errs.preferred_location = 'Preferred location is required';
    if (!form.property_type) errs.property_type = 'Property type is required';
    if (!form.bhk) errs.bhk = 'BHK requirement is required';
    if (!form.notes.trim()) errs.notes = 'Notes are required';
    if (!form.feedback.trim()) errs.feedback = 'Feedback is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      let sourceId = form.source_id;
      if (showCustomSource && form.custom_source) {
        const newSource = await addCustomSource(form.custom_source);
        sourceId = newSource.id;
      }

      const leadData = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        phone_country_code: form.phone_country_code.trim(),
        alternate_phone: form.alternate_phone.replace(/\D/g, ''),
        email: form.email.trim(),
        source_id: sourceId,
        data_source: showCustomSource
          ? form.custom_source.trim()
          : (sources.find(s => s.id === sourceId)?.source_name || ''),
        custom_source: form.custom_source,
        assigned_to: form.assigned_to,
        attended_by: form.attended_by || '',
        tele_caller_name: form.tele_caller_name,
        requirement_summary: form.requirement_summary,
        site_visit_scheduled: form.site_visit_scheduled,
        site_visit_done: form.site_visit_done,
        feedback: form.feedback,
        budget: form.budget,
        preferred_location: form.preferred_location,
        property_type: form.property_type,
        bhk: form.bhk,
        notes: form.notes,
        referrer_name: form.referrer_name,
        referrer_phone: form.referrer_phone,
      };

      const newLead = await createLead(leadData, session.userId);

      if (form.visit_date || isWalkIn) {
        await addVisit({
          lead_id: newLead.id,
          visit_date: form.visit_date || form.walkin_date,
          visit_time: form.visit_time || form.walkin_time,
          site_location: form.site_location || 'Level Up Tower - Main Site',
          notes: form.visit_notes || (isWalkIn ? 'Walk-in visit' : ''),
        }, session.userId);
      }

      navigate(`/leads/${newLead.id}`);
    } catch (err) {
      console.error('Failed to create lead:', err);
      setSaving(false);
    }
  };

  const handleSourceChange = (value) => {
    if (value === '__custom__') {
      setShowCustomSource(true);
      set('source_id', '');
    } else {
      setShowCustomSource(false);
      set('custom_source', '');
      set('source_id', value);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Add New Lead</h1>
            <p className="page-subtitle">Capture lead information and property requirements</p>
          </div>
        </div>
      </div>

      {showDuplicateWarning && (
        <div className="duplicate-warning">
          <AlertTriangle size={20} className="warning-icon" />
          <div>
            <strong style={{ color: 'var(--color-warning)' }}>Possible Duplicate Detected</strong>
            <p style={{ fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
              {duplicates.map(d => {
                const name = d.first_name ? `${d.first_name} ${d.last_name || ''}`.trim() : d.lead_name;
                return `${name} (${d.phone})`;
              }).join(', ')} — already exists.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/leads/${duplicates[0].id}`)}>
                View Existing
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowDuplicateWarning(false)}>
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="lead-form">
        <div className="lead-form-grid">
          {/* Left Column */}
          <div className="lead-form-main">
            {/* Basic Info */}
            <div className="form-section">
              <div className="form-section-title"><User size={14} /> Basic Information</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="required">First Name</label>
                  <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)}
                    placeholder="First name" autoFocus />
                  {errors.first_name && <div className="form-error">{errors.first_name}</div>}
                </div>
                <div className="form-group">
                  <label className="required">Last Name</label>
                  <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)}
                    placeholder="Last name" />
                  {errors.last_name && <div className="form-error">{errors.last_name}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ maxWidth: '140px' }}>
                  <label className="required">Country Code</label>
                  <input type="text" value={form.phone_country_code} onChange={e => set('phone_country_code', e.target.value)}
                    placeholder="+91" />
                  {errors.phone_country_code && <div className="form-error">{errors.phone_country_code}</div>}
                </div>
                <div className="form-group">
                  <label className="required">Phone Number</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    onBlur={handlePhoneBlur} placeholder="10-digit number" maxLength={12} />
                  {errors.phone && <div className="form-error">{errors.phone}</div>}
                </div>
                <div className="form-group">
                  <label className="required">Alternate Number</label>
                  <input type="tel" value={form.alternate_phone} onChange={e => set('alternate_phone', e.target.value)}
                    onBlur={handlePhoneBlur} placeholder="Optional" maxLength={12} />
                  {errors.alternate_phone && <div className="form-error">{errors.alternate_phone}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="Optional" />
                </div>
                <div className="form-group">
                  <label className="required">Lead Source</label>
                  <select value={showCustomSource ? '__custom__' : form.source_id}
                    onChange={e => handleSourceChange(e.target.value)}>
                    <option value="">Select source</option>
                    {sources.map(s => <option key={s.id} value={s.id}>{s.source_name}</option>)}
                    <option value="__custom__">+ Add Custom Source</option>
                  </select>
                  {errors.source_id && <div className="form-error">{errors.source_id}</div>}
                </div>
              </div>
              {showCustomSource && (
                <div className="form-group">
                  <label className="required">Custom Source Name</label>
                  <input type="text" value={form.custom_source} onChange={e => set('custom_source', e.target.value)}
                    placeholder="Enter new source name" />
                  {errors.custom_source && <div className="form-error">{errors.custom_source}</div>}
                </div>
              )}
              <div className="form-group">
                <label className="required">Assigned To</label>
                <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                  <option value="">Select team member</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
                {errors.assigned_to && <div className="form-error">{errors.assigned_to}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="required">Attended / Handled by</label>
                  <select value={form.attended_by} onChange={e => set('attended_by', e.target.value)}>
                    <option value="">Select team member</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                  {errors.attended_by && <div className="form-error">{errors.attended_by}</div>}
                </div>
                <div className="form-group">
                  <label className="required">Tele Caller Name</label>
                  <input type="text" value={form.tele_caller_name} onChange={e => set('tele_caller_name', e.target.value)}
                    placeholder="Tele caller name" />
                  {errors.tele_caller_name && <div className="form-error">{errors.tele_caller_name}</div>}
                </div>
              </div>
            </div>

            {/* Walk-In Fields */}
            {isWalkIn && (
              <div className="form-section">
                <div className="form-section-title"><Building2 size={14} /> Walk-In Details</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="required">Walk-In Date</label>
                    <input type="date" value={form.walkin_date} onChange={e => set('walkin_date', e.target.value)} />
                    {errors.walkin_date && <div className="form-error">{errors.walkin_date}</div>}
                  </div>
                  <div className="form-group">
                    <label className="required">Walk-In Time</label>
                    <input type="time" value={form.walkin_time} onChange={e => set('walkin_time', e.target.value)} />
                    {errors.walkin_time && <div className="form-error">{errors.walkin_time}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Reference Fields */}
            {isReference && (
              <div className="form-section">
                <div className="form-section-title"><UserCheck size={14} /> Referrer Information</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="required">Referrer Name</label>
                    <input type="text" value={form.referrer_name} onChange={e => set('referrer_name', e.target.value)}
                      placeholder="Who referred this lead?" />
                    {errors.referrer_name && <div className="form-error">{errors.referrer_name}</div>}
                  </div>
                  <div className="form-group">
                    <label className="required">Referrer Phone</label>
                    <input type="tel" value={form.referrer_phone} onChange={e => set('referrer_phone', e.target.value)}
                      placeholder="Referrer's phone number" />
                    {errors.referrer_phone && <div className="form-error">{errors.referrer_phone}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Visit */}
            {!isWalkIn && (
              <div className="form-section">
                <div className="form-section-title">
                  <MapPin size={14} /> Visit Information
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>(Optional)</span>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Visit Date</label>
                    <input type="date" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Visit Time</label>
                    <input type="time" value={form.visit_time} onChange={e => set('visit_time', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Site Location</label>
                  <input type="text" value={form.site_location} onChange={e => set('site_location', e.target.value)}
                    placeholder="e.g. Level Up Tower - Main Site" />
                </div>
                <div className="form-group">
                  <label>Visit Notes</label>
                  <textarea value={form.visit_notes} onChange={e => set('visit_notes', e.target.value)}
                    placeholder="Notes about the visit..." rows={3} />
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lead-form-sidebar">
            <div className="form-section">
              <div className="form-section-title"><DollarSign size={14} /> Client Requirements</div>
              <div className="form-group">
                <label className="required">Requirement Summary</label>
                <textarea value={form.requirement_summary} onChange={e => set('requirement_summary', e.target.value)}
                  placeholder="Short summary of what the client needs..." rows={4} />
                {errors.requirement_summary && <div className="form-error">{errors.requirement_summary}</div>}
              </div>
              <div className="form-group">
                <label className="required">Budget</label>
                <input type="text" value={form.budget} onChange={e => set('budget', e.target.value)}
                  placeholder="e.g. 1.5 Cr" />
                {errors.budget && <div className="form-error">{errors.budget}</div>}
              </div>
              <div className="form-group">
                <label className="required">Preferred Location</label>
                <input type="text" value={form.preferred_location} onChange={e => set('preferred_location', e.target.value)}
                  placeholder="e.g. Level Up Tower" />
                {errors.preferred_location && <div className="form-error">{errors.preferred_location}</div>}
              </div>
              <div className="form-group">
                <label className="required">Property Type</label>
                <select value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                  <option value="">Select type</option>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.property_type && <div className="form-error">{errors.property_type}</div>}
              </div>
              <div className="form-group">
                <label className="required">BHK Requirement</label>
                <select value={form.bhk} onChange={e => set('bhk', e.target.value)}>
                  <option value="">Select</option>
                  {BHK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {errors.bhk && <div className="form-error">{errors.bhk}</div>}
              </div>
              <div className="form-group">
                <label className="required">Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Additional notes about client requirements..." rows={5} />
                {errors.notes && <div className="form-error">{errors.notes}</div>}
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title"><MessageSquare size={14} /> Visit Feedback</div>
              <label className="checkbox-row">
                <input type="checkbox" checked={form.site_visit_scheduled}
                  onChange={e => set('site_visit_scheduled', e.target.checked)} />
                Site Visit Scheduled
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={form.site_visit_done}
                  onChange={e => set('site_visit_done', e.target.checked)} />
                Site Visit Done
              </label>
              <div className="form-group">
                <label className="required">Feedback</label>
                <textarea value={form.feedback} onChange={e => set('feedback', e.target.value)}
                  placeholder="Client feedback after call or visit..." rows={4} />
                {errors.feedback && <div className="form-error">{errors.feedback}</div>}
              </div>
            </div>

            <div className="form-actions-sticky">
              <button type="button" className="btn btn-secondary w-full" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                {saving ? <span className="spinner" /> : <><Save size={15} /> Save Lead</>}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
