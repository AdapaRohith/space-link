import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, MapPin, Building2, DollarSign, Save,
  ArrowLeft, AlertTriangle, UserCheck
} from 'lucide-react';
import { createLead, checkDuplicate } from '../services/leadService';
import { addVisit } from '../services/visitService';
import { getAllSources, addCustomSource } from '../services/sourceService';
import { getAllUsers, getSession } from '../services/authService';
import { PROPERTY_TYPES, BHK_OPTIONS } from '../data/seedData';
import { COUNTRY_CODES } from '../data/countryCodes';
import PrettySelect from '../components/PrettySelect';
import './LeadCreate.css';

const BUDGET_OPTIONS = ['<50L', '50L-1Cr', '1Cr-1.5cr', '1.5-2', '2-2.5', '2.5-3', '3-3.5', '3.5-4', '4-5', '5-6', '6-7cr'];
const BUDGET_SELECT_OPTIONS = BUDGET_OPTIONS.map(option => ({ value: option, label: option }));
const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};
const currentTime = () => new Date().toTimeString().slice(0, 5);

export default function LeadCreate({ inSheet = false, onSuccess } = {}) {
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
    phone_country_code: '91', phone: '', alternate_phone: '', email: '',
    source_id: '', custom_source: '', assigned_to: '', attended_by: '',
    requirement_summary: '',
    site_visit_scheduled: false, site_visit_done: false, feedback: '',
    budget: '', preferred_location: '', property_type: '', bhk: '',
    referrer_name: '', referrer_phone: '',
    walkin_date: today(),
    walkin_time: currentTime(),
    visit_date: today(), visit_time: currentTime(), site_location: '', visit_notes: '',
  });

  const [errors, setErrors] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const isWalkIn = form.source_id === 'src_walkin';
  const isReference = form.source_id === 'src_reference';
  const isOtherSource = form.source_id === '__other__';
  const visibleSources = sources.filter(s => s.source_name?.trim().toLowerCase() !== 'other');

  useEffect(() => {
    const phone = form.phone.replace(/\D/g, '');
    const alternatePhone = form.alternate_phone.replace(/\D/g, '');
    if (phone.length < 10 && alternatePhone.length < 10) {
      setDuplicates([]);
      setShowDuplicateWarning(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const dupes = await checkDuplicate(phone, alternatePhone);
        if (cancelled) return;
        if (dupes.length > 0) {
          navigate(`/leads/${dupes[0].id}`, {
            replace: true,
            state: { openEdit: true, duplicatePhone: phone || alternatePhone },
          });
          return;
        }
        setDuplicates(dupes);
        setShowDuplicateWarning(false);
      } catch {
        if (!cancelled) {
          setDuplicates([]);
          setShowDuplicateWarning(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.phone, form.alternate_phone, navigate]);

  const handlePhoneChange = (field, value) => {
    set(field, value.replace(/\D/g, '').slice(0, 10));
  };

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    else if (form.phone.replace(/\D/g, '').length < 10) errs.phone = 'Enter a valid phone number';
    if (form.alternate_phone.trim() && form.alternate_phone.replace(/\D/g, '').length < 10) errs.alternate_phone = 'Enter a valid alternate number';
    if (!form.source_id) errs.source_id = 'Source is required';
    if (isOtherSource && !form.custom_source.trim()) errs.custom_source = 'Other source details are required';
    if (!form.assigned_to) errs.assigned_to = 'Assignment is required';
    if (isWalkIn) {
      if (!form.walkin_date) errs.walkin_date = 'Walk-in date is required';
      if (!form.walkin_time) errs.walkin_time = 'Walk-in time is required';
    }
    if (isReference) {
      if (!form.referrer_name.trim()) errs.referrer_name = 'Referrer name is required';
      if (!form.referrer_phone.trim()) errs.referrer_phone = 'Referrer phone is required';
      else if (form.referrer_phone.replace(/\D/g, '').length < 10) errs.referrer_phone = 'Enter a valid referrer phone';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const phone = form.phone.replace(/\D/g, '');
    const alternatePhone = form.alternate_phone.replace(/\D/g, '');
    if (phone.length >= 10 || alternatePhone.length >= 10) {
      const dupes = await checkDuplicate(phone, alternatePhone);
      if (dupes.length > 0) {
        navigate(`/leads/${dupes[0].id}`, {
          replace: true,
          state: { openEdit: true, duplicatePhone: phone || alternatePhone },
        });
        return;
      }
    }

    setSaving(true);
    try {
      let sourceId = form.source_id;
      let dataSource = sources.find(s => s.id === sourceId)?.source_name || '';

      if (isOtherSource) {
        const customSource = await addCustomSource(form.custom_source.trim());
        sourceId = customSource.id;
        dataSource = customSource.source_name;
      }

      const leadData = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        phone_country_code: form.phone_country_code.trim(),
        alternate_phone: form.alternate_phone ? form.alternate_phone.replace(/\D/g, '') : '',
        email: form.email.trim(),
        source_id: sourceId,
        data_source: dataSource,
        custom_source: form.custom_source,
        assigned_to: form.assigned_to,
        attended_by: form.attended_by.trim() || form.assigned_to,
        tele_caller_name: '',
        requirement_summary: form.requirement_summary,
        site_visit_scheduled: form.site_visit_scheduled,
        site_visit_done: form.site_visit_done,
        feedback: form.feedback,
        budget: form.budget,
        preferred_location: form.preferred_location,
        property_type: form.property_type,
        bhk: form.bhk,
        referrer_name: form.referrer_name,
        referrer_phone: form.referrer_phone,
      };

      const newLead = await createLead(leadData, session.userId);
      const siteLocation = form.site_location.trim();

      if (siteLocation) {
        await addVisit({
          lead_id: newLead.id,
          visit_date: form.visit_date || form.walkin_date,
          visit_time: form.visit_time || form.walkin_time,
          site_location: siteLocation,
          notes: form.visit_notes || (isWalkIn ? 'Walk-in visit' : ''),
        }, session.userId);
      }

      if (onSuccess) { onSuccess(); } else { navigate(`/leads/${newLead.id}`); }
    } catch (err) {
      console.error('Failed to create lead:', err);
      setSaving(false);
    }
  };

  const handleSourceChange = (value) => {
    set('custom_source', '');
    set('source_id', value);
  };

  return (
    <div className={`page${inSheet ? ' page--in-sheet' : ''}`}>
      {!inSheet && (
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
      )}

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
                  <label>Last Name</label>
                  <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)}
                    placeholder="Last name" />
                  {errors.last_name && <div className="form-error">{errors.last_name}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ maxWidth: '140px' }}>
                  <label>Country Code</label>
                  <PrettySelect
                    value={form.phone_country_code}
                    onChange={value => set('phone_country_code', value)}
                    options={COUNTRY_CODES}
                    searchable
                    searchPlaceholder="Search country or code"
                    className="country-code-select"
                    compactCode
                  />
                  {errors.phone_country_code && <div className="form-error">{errors.phone_country_code}</div>}
                </div>
                <div className="form-group">
                  <label className="required">Phone Number</label>
                  <input type="tel" value={form.phone} onChange={e => handlePhoneChange('phone', e.target.value)}
                    placeholder="10-digit number" maxLength={10} />
                  {errors.phone && <div className="form-error">{errors.phone}</div>}
                </div>
                <div className="form-group">
                  <label>Alternate Number</label>
                  <input type="tel" value={form.alternate_phone} onChange={e => handlePhoneChange('alternate_phone', e.target.value)}
                    placeholder="Optional" maxLength={10} />
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
                  <select value={form.source_id}
                    onChange={e => handleSourceChange(e.target.value)}>
                    <option value="">Select source</option>
                    {visibleSources.map(s => <option key={s.id} value={s.id}>{s.source_name}</option>)}
                    <option value="__other__">Other</option>
                  </select>
                  {errors.source_id && <div className="form-error">{errors.source_id}</div>}
                </div>
              </div>
              {isOtherSource && (
                <div className="form-group">
                  <label className="required">Other Source Details</label>
                  <input type="text" value={form.custom_source} onChange={e => set('custom_source', e.target.value)}
                    placeholder="Enter lead source" />
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
              <div className="form-group">
                <label>Attended / Handled by</label>
                <input type="text" value={form.attended_by} onChange={e => set('attended_by', e.target.value)}
                  placeholder="Handled by" />
                {errors.attended_by && <div className="form-error">{errors.attended_by}</div>}
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
                    <label className="required">Reference</label>
                    <input type="text" value={form.referrer_name} onChange={e => set('referrer_name', e.target.value)}
                      placeholder="Who referred this lead?" />
                    {errors.referrer_name && <div className="form-error">{errors.referrer_name}</div>}
                  </div>
                  <div className="form-group">
                    <label className="required">Reference Number</label>
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
                    placeholder="Notes about the visit..." rows={2} />
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lead-form-sidebar">
            <div className="form-section">
              <div className="form-section-title"><DollarSign size={14} /> Client Requirements</div>
              <div className="form-group">
                <label>Requirement Summary</label>
                <textarea value={form.requirement_summary} onChange={e => set('requirement_summary', e.target.value)}
                  placeholder="Short summary of what the client needs..." rows={3} />
                {errors.requirement_summary && <div className="form-error">{errors.requirement_summary}</div>}
              </div>
              <div className="form-group">
                <label>Budget</label>
                <PrettySelect
                  value={form.budget}
                  onChange={value => set('budget', value)}
                  options={BUDGET_SELECT_OPTIONS}
                  placeholder="Select budget"
                />
                {errors.budget && <div className="form-error">{errors.budget}</div>}
              </div>
              <div className="form-group">
                <label>Preferred Location</label>
                <input type="text" value={form.preferred_location} onChange={e => set('preferred_location', e.target.value)}
                  placeholder="e.g. Level Up Tower" />
                {errors.preferred_location && <div className="form-error">{errors.preferred_location}</div>}
              </div>
              <div className="form-group">
                <label>Property Type</label>
                <select value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                  <option value="">Select type</option>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.property_type && <div className="form-error">{errors.property_type}</div>}
              </div>
              <div className="form-group">
                <label>BHK Requirement</label>
                <select value={form.bhk} onChange={e => set('bhk', e.target.value)}>
                  <option value="">Select</option>
                  {BHK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {errors.bhk && <div className="form-error">{errors.bhk}</div>}
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
