import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, Mail, MapPin, Building2, DollarSign, Save,
  ArrowLeft, AlertTriangle, UserCheck, Calendar, Clock, MessageSquare
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
      setUsers(getAllUsers());
      try {
        const srcs = await getAllSources();
        setSources(srcs);
      } catch {
        setSources([]);
      }
    }
    load();
  }, []);

  const [form, setForm] = useState({
    lead_name: '', phone: '', alternate_phone: '', email: '',
    source_id: '', custom_source: '', assigned_to: '', attended_by: '',
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
    if (!form.lead_name.trim()) errs.lead_name = 'Name is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    else if (form.phone.replace(/\D/g, '').length < 10) errs.phone = 'Enter a valid phone number';
    if (!form.source_id) errs.source_id = 'Source is required';
    if (!form.assigned_to) errs.assigned_to = 'Assignment is required';
    if (showCustomSource && !form.custom_source.trim()) errs.custom_source = 'Enter custom source name';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);

    try {
      // Handle custom source
      let sourceId = form.source_id;
      if (showCustomSource && form.custom_source) {
        const newSource = await addCustomSource(form.custom_source);
        sourceId = newSource.id;
      }

      const leadData = {
        lead_name: form.lead_name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        alternate_phone: form.alternate_phone.replace(/\D/g, ''),
        email: form.email.trim(),
        source_id: sourceId,
        custom_source: form.custom_source,
        assigned_to: form.assigned_to,
        attended_by: form.attended_by || '',
        budget: form.budget,
        preferred_location: form.preferred_location,
        property_type: form.property_type,
        bhk: form.bhk,
        notes: form.notes,
        referrer_name: form.referrer_name,
        referrer_phone: form.referrer_phone,
      };

      const newLead = await createLead(leadData, session.userId);

      // Add visit if provided
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
            <p className="page-subtitle">Capture lead information and requirements</p>
          </div>
        </div>
      </div>

      {/* Duplicate Warning */}
      {showDuplicateWarning && (
        <div className="duplicate-warning">
          <AlertTriangle size={20} className="warning-icon" />
          <div>
            <strong style={{ color: 'var(--color-warning)' }}>Possible Duplicate Detected</strong>
            <p style={{ fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
              {duplicates.map(d => `${d.lead_name} (${d.phone})`).join(', ')} — already exists.
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
              <div className="form-section-title">
                <User size={16} /> Basic Information
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="required">Lead Name</label>
                  <input type="text" value={form.lead_name} onChange={e => set('lead_name', e.target.value)}
                    placeholder="Full name" autoFocus />
                  {errors.lead_name && <div className="form-error">{errors.lead_name}</div>}
                </div>
                <div className="form-group">
                  <label className="required">Phone Number</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    onBlur={handlePhoneBlur} placeholder="10-digit number" maxLength={12} />
                  {errors.phone && <div className="form-error">{errors.phone}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Alternate Number</label>
                  <input type="tel" value={form.alternate_phone} onChange={e => set('alternate_phone', e.target.value)}
                    onBlur={handlePhoneBlur} placeholder="Optional" maxLength={12} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="Optional" />
                </div>
              </div>
              <div className="form-row">
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
                <div className="form-group">
                  <label className="required">Assigned To</label>
                  <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                    <option value="">Select team member</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                  {errors.assigned_to && <div className="form-error">{errors.assigned_to}</div>}
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
            </div>

            {/* Walk-In Fields */}
            {isWalkIn && (
              <div className="form-section">
                <div className="form-section-title">
                  <Building2 size={16} /> Walk-In Details
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Walk-In Date</label>
                    <input type="date" value={form.walkin_date} onChange={e => set('walkin_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Walk-In Time</label>
                    <input type="time" value={form.walkin_time} onChange={e => set('walkin_time', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Attended By</label>
                  <select value={form.attended_by} onChange={e => set('attended_by', e.target.value)}>
                    <option value="">Select</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Reference Fields */}
            {isReference && (
              <div className="form-section">
                <div className="form-section-title">
                  <UserCheck size={16} /> Referrer Information
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Referrer Name</label>
                    <input type="text" value={form.referrer_name} onChange={e => set('referrer_name', e.target.value)}
                      placeholder="Who referred this lead?" />
                  </div>
                  <div className="form-group">
                    <label>Referrer Phone</label>
                    <input type="tel" value={form.referrer_phone} onChange={e => set('referrer_phone', e.target.value)}
                      placeholder="Referrer's phone number" />
                  </div>
                </div>
              </div>
            )}

            {/* Visit */}
            {!isWalkIn && (
              <div className="form-section">
                <div className="form-section-title">
                  <MapPin size={16} /> Visit Information <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 400 }}>(Optional)</span>
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
                <div className="form-row">
                  <div className="form-group">
                    <label>Site Location</label>
                    <input type="text" value={form.site_location} onChange={e => set('site_location', e.target.value)}
                      placeholder="e.g. Level Up Tower - Main Site" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Visit Notes</label>
                  <textarea value={form.visit_notes} onChange={e => set('visit_notes', e.target.value)}
                    placeholder="Notes about the visit..." rows={3} />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Requirements */}
          <div className="lead-form-sidebar">
            <div className="form-section">
              <div className="form-section-title">
                <DollarSign size={16} /> Client Requirements
              </div>
              <div className="form-group">
                <label>Budget</label>
                <input type="text" value={form.budget} onChange={e => set('budget', e.target.value)}
                  placeholder="e.g. 1.5 Cr" />
              </div>
              <div className="form-group">
                <label>Preferred Location</label>
                <input type="text" value={form.preferred_location} onChange={e => set('preferred_location', e.target.value)}
                  placeholder="e.g. Level Up Tower" />
              </div>
              <div className="form-group">
                <label>Property Type</label>
                <select value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                  <option value="">Select type</option>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>BHK Requirement</label>
                <select value={form.bhk} onChange={e => set('bhk', e.target.value)}>
                  <option value="">Select</option>
                  {BHK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Additional notes about client requirements..." rows={5} />
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions-sticky">
              <button type="button" className="btn btn-secondary w-full" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                {saving ? <span className="login-spinner" /> : <><Save size={16} /> Save Lead</>}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
