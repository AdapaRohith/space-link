import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Calendar, Clock, UserCheck, Search, X
} from 'lucide-react';
import { filterLeads, createLead } from '../services/leadService';
import { addVisit } from '../services/visitService';
import { getAllUsers, getSession, getUserName } from '../services/authService';
import { getSourceName, getAllSources } from '../services/sourceService';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import './WalkInLog.css';

export default function WalkInLog() {
  const navigate = useNavigate();
  const session = getSession();
  const [users, setUsers] = useState([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [walkins, setWalkins] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    lead_name: '', phone: '', email: '', assigned_to: '', attended_by: '',
    walkin_time: new Date().toTimeString().slice(0, 5), notes: '',
  });
  const [errors, setErrors] = useState({});

  // Load users once
  useEffect(() => {
    getAllUsers().then(setUsers);
  }, []);

  // Load walk-ins when filters change
  useEffect(() => {
    async function loadWalkins() {
      setLoading(true);
      const allWalkins = await filterLeads({ source_id: 'src_walkin' });
      const filtered = allWalkins
        .filter(l => {
          const localDate = new Date(l.created_at);
          const dateStr = localDate.getFullYear() + '-' +
            String(localDate.getMonth() + 1).padStart(2, '0') + '-' +
            String(localDate.getDate()).padStart(2, '0');
          return dateStr === dateFilter;
        })
        .filter(l => !search ||
          l.lead_name.toLowerCase().includes(search.toLowerCase()) ||
          l.phone.includes(search)
        );
      setWalkins(filtered);
      setLoading(false);
    }
    loadWalkins();
  }, [dateFilter, search]);

  const set = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const handleQuickAdd = async () => {
    const errs = {};
    if (!form.lead_name.trim()) errs.lead_name = 'Required';
    if (!form.phone.trim()) errs.phone = 'Required';
    if (!form.assigned_to) errs.assigned_to = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const lead = await createLead({
      lead_name: form.lead_name.trim(),
      phone: form.phone,
      email: form.email,
      source_id: 'src_walkin',
      assigned_to: form.assigned_to,
      attended_by: form.attended_by || form.assigned_to,
    }, session.userId);

    await addVisit({
      lead_id: lead.id,
      visit_date: dateFilter,
      visit_time: form.walkin_time,
      site_location: 'Level Up Tower - Main Site',
      notes: form.notes || 'Walk-in visitor',
    }, session.userId);

    setForm({
      lead_name: '', phone: '', email: '', assigned_to: '', attended_by: '',
      walkin_time: new Date().toTimeString().slice(0, 5), notes: '',
    });
    setShowModal(false);

    // Reload walk-ins
    const allWalkins = await filterLeads({ source_id: 'src_walkin' });
    const filtered = allWalkins.filter(l => {
      const localDate = new Date(l.created_at);
      const dateStr = localDate.getFullYear() + '-' +
        String(localDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(localDate.getDate()).padStart(2, '0');
      return dateStr === dateFilter;
    });
    setWalkins(filtered);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Walk-In Log</h1>
          <p className="page-subtitle">
            <Building2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
            {walkins.length} walk-in{walkins.length !== 1 ? 's' : ''} on {new Date(dateFilter).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{ width: 'auto' }}
          />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Walk-In
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 'var(--space-6)', maxWidth: '360px' }}>
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Search walk-ins..." value={search}
            onChange={e => setSearch(e.target.value)} />
          {search && <button className="clear-btn" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
      </div>

      {/* Walk-in Cards */}
      {walkins.length > 0 ? (
        <div className="walkin-grid">
          {walkins.map((lead, i) => (
            <div key={lead.id} className="walkin-card animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => navigate(`/leads/${lead.id}`)}>
              <div className="walkin-card-header">
                <div className="walkin-avatar">{lead.lead_name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="walkin-name">{lead.lead_name}</div>
                  <div className="walkin-phone">{lead.phone}</div>
                </div>
                <StatusBadge status={lead.status} />
              </div>
              <div className="walkin-meta">
                <span><Clock size={12} /> {new Date(lead.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                <span><UserCheck size={12} /> {getUserName(lead.assigned_to, users)}</span>
              </div>
              {lead.notes && (
                <p className="walkin-notes">{lead.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon"><Building2 size={28} /></div>
          <h3>No walk-ins recorded</h3>
          <p>Start logging walk-in visitors for this date</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Walk-In
          </button>
        </div>
      )}

      {/* Quick Add Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Log Walk-In Visitor"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleQuickAdd}>Save Walk-In</button>
        </>}>
        <div className="form-row">
          <div className="form-group">
            <label className="required">Visitor Name</label>
            <input type="text" value={form.lead_name} onChange={e => set('lead_name', e.target.value)}
              placeholder="Full name" autoFocus />
            {errors.lead_name && <div className="form-error">{errors.lead_name}</div>}
          </div>
          <div className="form-group">
            <label className="required">Phone</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="Phone number" />
            {errors.phone && <div className="form-error">{errors.phone}</div>}
          </div>
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="Optional" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="required">Assign To</label>
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">Select</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {errors.assigned_to && <div className="form-error">{errors.assigned_to}</div>}
          </div>
          <div className="form-group">
            <label>Attended By</label>
            <select value={form.attended_by} onChange={e => set('attended_by', e.target.value)}>
              <option value="">Select</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Walk-In Time</label>
          <input type="time" value={form.walkin_time} onChange={e => set('walkin_time', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Quick notes about the visitor..." rows={3} />
        </div>
      </Modal>
    </div>
  );
}
