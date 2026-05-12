import { useState, useEffect } from 'react';
import {
  Users, Plus, Edit3, Shield, Phone, Mail, UserCheck,
  UserX, ChevronDown, Save
} from 'lucide-react';
import { getAllUsers, addUser, updateUser, toggleUserActive, getSession } from '../services/authService';
import { getCollection } from '../services/storage';
import Modal from '../components/Modal';
import './UserManagement.css';

export default function UserManagement() {
  const session = getSession();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'sales', password_hash: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = () => {
    setUsers(getCollection('crm_users'));
  };

  const set = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const openAdd = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', phone: '', role: 'sales', password_hash: '' });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name, email: user.email, phone: user.phone,
      role: user.role, password_hash: '',
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.email.trim()) errs.email = 'Required';
    if (!editingUser && !form.password_hash.trim()) errs.password_hash = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (editingUser) {
      const updates = { name: form.name, email: form.email, phone: form.phone, role: form.role };
      if (form.password_hash) updates.password_hash = form.password_hash;
      updateUser(editingUser.id, updates);
    } else {
      addUser(form);
    }
    setShowModal(false);
    loadUsers();
  };

  const handleToggle = (userId) => {
    if (userId === session.userId) return;
    toggleUserActive(userId);
    loadUsers();
  };

  const roleColors = {
    admin: { bg: 'rgba(200, 164, 78, 0.12)', color: '#c8a44e' },
    sales: { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' },
    receptionist: { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80' },
  };

  const roleLabels = { admin: 'Admin', sales: 'Sales Executive', receptionist: 'Receptionist' };

  // Count leads per user
  const leads = getCollection('crm_leads');
  const leadCounts = users.reduce((acc, u) => {
    acc[u.id] = leads.filter(l => l.assigned_to === u.id).length;
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">{users.filter(u => u.active).length} active team members</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* User Cards */}
      <div className="user-grid">
        {users.map((user, i) => (
          <div key={user.id} className={`user-card ${!user.active ? 'user-inactive' : ''} animate-fade-in-up`}
            style={{ animationDelay: `${i * 60}ms` }}>
            <div className="user-card-header">
              <div className="user-avatar-lg" style={{
                background: user.active
                  ? `linear-gradient(135deg, ${roleColors[user.role]?.color || '#8ba4c8'}, ${roleColors[user.role]?.color || '#8ba4c8'}80)`
                  : 'var(--color-primary-400)'
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-card-name">{user.name}</div>
                <span className="badge" style={{
                  background: roleColors[user.role]?.bg,
                  color: roleColors[user.role]?.color,
                }}>
                  <Shield size={10} /> {roleLabels[user.role]}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(user)} title="Edit">
                  <Edit3 size={14} />
                </button>
                {user.id !== session.userId && (
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => handleToggle(user.id)}
                    title={user.active ? 'Deactivate' : 'Activate'}
                    style={{ color: user.active ? 'var(--color-danger)' : 'var(--color-success)' }}
                  >
                    {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
                  </button>
                )}
              </div>
            </div>
            <div className="user-card-details">
              <div className="user-detail"><Mail size={12} /> {user.email}</div>
              {user.phone && <div className="user-detail"><Phone size={12} /> {user.phone}</div>}
              <div className="user-detail"><Users size={12} /> {leadCounts[user.id] || 0} leads assigned</div>
            </div>
            {!user.active && <div className="user-inactive-badge">Inactive</div>}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit Team Member' : 'Add Team Member'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={14} /> {editingUser ? 'Update' : 'Add'}
          </button>
        </>}>
        <div className="form-group">
          <label className="required">Full Name</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="required">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email" />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="admin">Admin</option>
              <option value="sales">Sales Executive</option>
              <option value="receptionist">Receptionist</option>
            </select>
          </div>
          <div className="form-group">
            <label className={editingUser ? '' : 'required'}>
              {editingUser ? 'New Password (optional)' : 'Password'}
            </label>
            <input type="password" value={form.password_hash} onChange={e => set('password_hash', e.target.value)}
              placeholder={editingUser ? 'Leave blank to keep' : 'Password'} />
            {errors.password_hash && <div className="form-error">{errors.password_hash}</div>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
