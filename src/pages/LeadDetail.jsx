import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Trash2, MapPin, Phone, Mail,
  DollarSign, Building2, Calendar, Clock, Save, X,
  UserCheck, MessageSquare, Plus, RefreshCw
} from 'lucide-react';
import { getLeadById, updateLead, deleteLead } from '../services/leadService';
import { getVisitsByLead, addVisit } from '../services/visitService';
import { getActivitiesByLead } from '../services/activityService';
import { logActivity } from '../services/activityService';
import { getSourceName, getAllSources } from '../services/sourceService';
import { getUserName, getSession, getAllUsers, hasPermission } from '../services/authService';
import StatusBadge from '../components/StatusBadge';
import ActivityTimeline from '../components/ActivityTimeline';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { LEAD_STATUSES, PROPERTY_TYPES, BHK_OPTIONS } from '../data/seedData';
import './LeadDetail.css';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = getSession();

  const [users, setUsers] = useState([]);
  const [sources, setSources] = useState([]);
  const [lead, setLead] = useState(null);
  const [visits, setVisits] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Forms
  const [statusForm, setStatusForm] = useState({ status: '', note: '' });
  const [visitForm, setVisitForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    visit_time: new Date().toTimeString().slice(0, 5),
    site_location: 'Level Up Tower - Main Site', notes: '',
  });
  const [editForm, setEditForm] = useState({});
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const [usrs, srcs] = await Promise.all([getAllUsers(), getAllSources()]);
    setUsers(usrs);
    setSources(srcs);

    const l = await getLeadById(id);
    if (!l) { navigate('/leads'); return; }
    setLead(l);
    setEditForm({ ...l });

    const [v, a] = await Promise.all([getVisitsByLead(id), getActivitiesByLead(id)]);
    setVisits(v);
    setActivities(a);
  };

  const handleStatusUpdate = async () => {
    if (!statusForm.status) return;
    await updateLead(id, { status: statusForm.status, status_note: statusForm.note }, session.userId);
    setShowStatusModal(false);
    setStatusForm({ status: '', note: '' });
    await loadData();
  };

  const handleAddVisit = async () => {
    await addVisit({ lead_id: id, ...visitForm }, session.userId);
    setShowVisitModal(false);
    setVisitForm({
      visit_date: new Date().toISOString().split('T')[0],
      visit_time: new Date().toTimeString().slice(0, 5),
      site_location: 'Level Up Tower - Main Site', notes: '',
    });
    await loadData();
  };

  const handleEdit = async () => {
    await updateLead(id, {
      lead_name: editForm.lead_name,
      phone: editForm.phone,
      alternate_phone: editForm.alternate_phone,
      email: editForm.email,
      assigned_to: editForm.assigned_to,
      attended_by: editForm.attended_by,
      budget: editForm.budget,
      preferred_location: editForm.preferred_location,
      property_type: editForm.property_type,
      bhk: editForm.bhk,
      notes: editForm.notes,
    }, session.userId);
    setShowEditModal(false);
    await loadData();
  };

  const handleDelete = async () => {
    await deleteLead(id, session.userId);
    navigate('/leads');
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    await logActivity(id, 'note_added', noteText.trim(), session.userId);
    await updateLead(id, {}, session.userId);
    setNoteText('');
    setShowNoteModal(false);
    await loadData();
  };

  if (!lead) return null;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/leads')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 className="page-title">{lead.lead_name}</h1>
              <StatusBadge status={lead.status} />
            </div>
            <p className="page-subtitle">
              Created {formatDateTime(lead.created_at)} by {getUserName(lead.created_by, users)}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNoteModal(true)}>
            <MessageSquare size={14} /> Add Note
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setStatusForm({ status: lead.status, note: '' }); setShowStatusModal(true); }}>
            <RefreshCw size={14} /> Update Status
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(true)}>
            <Edit3 size={14} /> Edit
          </button>
          {hasPermission('delete_lead') && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'visits', 'activity'].map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'visits' && visits.length > 0 && <span className="tab-count">{visits.length}</span>}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="detail-grid">
          <div className="detail-main">
            {/* Contact Info */}
            <div className="card detail-card">
              <h4 className="detail-card-title"><Phone size={16} /> Contact Information</h4>
              <div className="detail-fields">
                <div className="detail-field"><span className="detail-label">Phone</span><span className="detail-value">{lead.phone}</span></div>
                {lead.alternate_phone && <div className="detail-field"><span className="detail-label">Alt Phone</span><span className="detail-value">{lead.alternate_phone}</span></div>}
                {lead.email && <div className="detail-field"><span className="detail-label">Email</span><span className="detail-value">{lead.email}</span></div>}
                <div className="detail-field"><span className="detail-label">Source</span><span className="detail-value">{getSourceName(lead.source_id, sources)}</span></div>
                <div className="detail-field"><span className="detail-label">Assigned To</span><span className="detail-value">{getUserName(lead.assigned_to, users)}</span></div>
                {lead.attended_by && <div className="detail-field"><span className="detail-label">Attended By</span><span className="detail-value">{getUserName(lead.attended_by, users)}</span></div>}
              </div>
            </div>

            {/* Referrer Info */}
            {lead.referrer_name && (
              <div className="card detail-card">
                <h4 className="detail-card-title"><UserCheck size={16} /> Referrer</h4>
                <div className="detail-fields">
                  <div className="detail-field"><span className="detail-label">Referrer</span><span className="detail-value">{lead.referrer_name}</span></div>
                  {lead.referrer_phone && <div className="detail-field"><span className="detail-label">Phone</span><span className="detail-value">{lead.referrer_phone}</span></div>}
                </div>
              </div>
            )}

            {/* Notes */}
            {lead.notes && (
              <div className="card detail-card">
                <h4 className="detail-card-title"><MessageSquare size={16} /> Notes</h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{lead.notes}</p>
              </div>
            )}
          </div>

          <div className="detail-sidebar">
            {/* Requirements */}
            <div className="card detail-card">
              <h4 className="detail-card-title"><DollarSign size={16} /> Requirements</h4>
              <div className="detail-fields">
                {lead.budget && <div className="detail-field"><span className="detail-label">Budget</span><span className="detail-value accent">{lead.budget}</span></div>}
                {lead.preferred_location && <div className="detail-field"><span className="detail-label">Location</span><span className="detail-value">{lead.preferred_location}</span></div>}
                {lead.property_type && <div className="detail-field"><span className="detail-label">Type</span><span className="detail-value">{lead.property_type}</span></div>}
                {lead.bhk && <div className="detail-field"><span className="detail-label">BHK</span><span className="detail-value">{lead.bhk}</span></div>}
              </div>
              {!lead.budget && !lead.property_type && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No requirements recorded</p>
              )}
            </div>

            {/* Quick Info */}
            <div className="card detail-card">
              <h4 className="detail-card-title"><Calendar size={16} /> Timeline</h4>
              <div className="detail-fields">
                <div className="detail-field"><span className="detail-label">Created</span><span className="detail-value">{formatDate(lead.created_at)}</span></div>
                <div className="detail-field"><span className="detail-label">Updated</span><span className="detail-value">{formatDate(lead.updated_at)}</span></div>
                <div className="detail-field"><span className="detail-label">Visits</span><span className="detail-value">{visits.length}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visits Tab */}
      {activeTab === 'visits' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowVisitModal(true)}>
              <Plus size={14} /> Log Visit
            </button>
          </div>
          {visits.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {visits.map(v => (
                <div key={v.id} className="card card-accent" style={{ padding: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} style={{ color: 'var(--color-accent-500)' }} />
                      <strong style={{ fontSize: 'var(--font-size-sm)' }}>{v.site_location}</strong>
                    </div>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {v.visit_date} at {v.visit_time}
                    </span>
                  </div>
                  {v.notes && <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>{v.notes}</p>}
                  <div style={{ marginTop: '8px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    Logged by {getUserName(v.created_by, users)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><MapPin size={28} /></div>
              <h3>No visits recorded</h3>
              <p>Log a site visit for this lead</p>
              <button className="btn btn-primary" onClick={() => setShowVisitModal(true)}>
                <Plus size={16} /> Log Visit
              </button>
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && <ActivityTimeline activities={activities} />}

      {/* Status Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Status"
        footer={<><button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleStatusUpdate}>Update</button></>}>
        <div className="form-group">
          <label>New Status</label>
          <select value={statusForm.status} onChange={e => setStatusForm(p => ({ ...p, status: e.target.value }))}>
            {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={statusForm.note} onChange={e => setStatusForm(p => ({ ...p, note: e.target.value }))}
            placeholder="Add a note about this status change..." rows={3} />
        </div>
      </Modal>

      {/* Visit Modal */}
      <Modal isOpen={showVisitModal} onClose={() => setShowVisitModal(false)} title="Log Site Visit"
        footer={<><button className="btn btn-secondary" onClick={() => setShowVisitModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddVisit}>Save Visit</button></>}>
        <div className="form-row">
          <div className="form-group"><label>Date</label>
            <input type="date" value={visitForm.visit_date} onChange={e => setVisitForm(p => ({ ...p, visit_date: e.target.value }))} /></div>
          <div className="form-group"><label>Time</label>
            <input type="time" value={visitForm.visit_time} onChange={e => setVisitForm(p => ({ ...p, visit_time: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label>Site Location</label>
          <input type="text" value={visitForm.site_location} onChange={e => setVisitForm(p => ({ ...p, site_location: e.target.value }))} /></div>
        <div className="form-group"><label>Visit Notes</label>
          <textarea value={visitForm.notes} onChange={e => setVisitForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Describe the visit..." rows={4} /></div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Lead" wide
        footer={<><button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit}><Save size={14} /> Save Changes</button></>}>
        <div className="form-row">
          <div className="form-group"><label>Lead Name</label>
            <input type="text" value={editForm.lead_name || ''} onChange={e => setEditForm(p => ({ ...p, lead_name: e.target.value }))} /></div>
          <div className="form-group"><label>Phone</label>
            <input type="tel" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Alt Phone</label>
            <input type="tel" value={editForm.alternate_phone || ''} onChange={e => setEditForm(p => ({ ...p, alternate_phone: e.target.value }))} /></div>
          <div className="form-group"><label>Email</label>
            <input type="email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Assigned To</label>
            <select value={editForm.assigned_to || ''} onChange={e => setEditForm(p => ({ ...p, assigned_to: e.target.value }))}>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="form-group"><label>Budget</label>
            <input type="text" value={editForm.budget || ''} onChange={e => setEditForm(p => ({ ...p, budget: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Property Type</label>
            <select value={editForm.property_type || ''} onChange={e => setEditForm(p => ({ ...p, property_type: e.target.value }))}>
              <option value="">Select</option>{PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="form-group"><label>BHK</label>
            <select value={editForm.bhk || ''} onChange={e => setEditForm(p => ({ ...p, bhk: e.target.value }))}>
              <option value="">Select</option>{BHK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
        </div>
        <div className="form-group"><label>Preferred Location</label>
          <input type="text" value={editForm.preferred_location || ''} onChange={e => setEditForm(p => ({ ...p, preferred_location: e.target.value }))} /></div>
        <div className="form-group"><label>Notes</label>
          <textarea value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={4} /></div>
      </Modal>

      {/* Note Modal */}
      <Modal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note"
        footer={<><button className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddNote}>Save Note</button></>}>
        <div className="form-group">
          <label>Note</label>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note about this lead..." rows={5} autoFocus />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message={`Are you sure you want to delete "${lead.lead_name}"? This action cannot be undone.`}
        confirmText="Delete Lead"
        danger
      />
    </div>
  );
}
