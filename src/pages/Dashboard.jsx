import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Footprints, PhoneForwarded, TrendingUp,
  Plus, ArrowRight, Building2, Clock
} from 'lucide-react';
import { getLeadStats, getTodayLeads } from '../services/leadService';
import { getRecentActivities } from '../services/activityService';
import { getAllSources, getSourceName } from '../services/sourceService';
import { getUserName, getSession } from '../services/authService';
import StatusBadge from '../components/StatusBadge';
import { LEAD_STATUSES } from '../data/seedData';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [activities, setActivities] = useState([]);
  const navigate = useNavigate();
  const session = getSession();

  useEffect(() => {
    setStats(getLeadStats());
    setRecentLeads(getTodayLeads().slice(0, 8));
    setActivities(getRecentActivities(10));
  }, []);

  if (!stats) return null;

  const statCards = [
    { label: 'Total Leads', value: stats.total, icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { label: "Today's Walk-Ins", value: stats.todayWalkIns, icon: Footprints, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { label: 'Follow-Ups Due', value: stats.followUpsDue, icon: PhoneForwarded, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { label: 'New Today', value: stats.newToday, icon: TrendingUp, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  ];

  const sources = getAllSources();
  const sourceData = sources.map(s => ({
    name: s.source_name,
    count: stats.bySource[s.id] || 0,
  })).filter(s => s.count > 0);

  const statusData = LEAD_STATUSES.map(s => ({
    ...s,
    count: stats.byStatus[s.value] || 0,
  })).filter(s => s.count > 0);

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - d) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {session?.name} — here's your overview</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/walkins')}>
            <Building2 size={16} /> Walk-In
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/leads/new')}>
            <Plus size={16} /> New Lead
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-4 gap-4" style={{ marginBottom: 'var(--space-8)' }}>
        {statCards.map((stat, i) => (
          <div key={stat.label} className="stat-card animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="stat-icon" style={{ background: stat.bg }}>
              <stat.icon size={22} style={{ color: stat.color }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Recent Leads */}
        <div className="card dashboard-card">
          <div className="dashboard-card-header">
            <h3>Today's Leads</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          {recentLeads.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
              <p>No leads created today yet</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map(lead => (
                    <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td style={{ fontWeight: 600 }}>{lead.lead_name}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{lead.phone}</td>
                      <td><span className="text-muted">{getSourceName(lead.source_id)}</span></td>
                      <td><StatusBadge status={lead.status} /></td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{getUserName(lead.assigned_to)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="dashboard-right">
          {/* Sources Breakdown */}
          <div className="card dashboard-card">
            <div className="dashboard-card-header">
              <h3>Leads by Source</h3>
            </div>
            <div className="source-bars">
              {sourceData.map(s => {
                const maxCount = Math.max(...sourceData.map(x => x.count), 1);
                return (
                  <div key={s.name} className="source-bar-item">
                    <div className="source-bar-label">
                      <span>{s.name}</span>
                      <span className="text-accent">{s.count}</span>
                    </div>
                    <div className="source-bar-track">
                      <div
                        className="source-bar-fill"
                        style={{ width: `${(s.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {sourceData.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center', padding: '20px' }}>No data yet</p>
              )}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="card dashboard-card">
            <div className="dashboard-card-header">
              <h3>Lead Pipeline</h3>
            </div>
            <div className="pipeline-grid">
              {statusData.map(s => (
                <div key={s.value} className="pipeline-item" onClick={() => navigate(`/leads?status=${s.value}`)}>
                  <div className="pipeline-dot" style={{ background: s.color }} />
                  <span className="pipeline-label">{s.label}</span>
                  <span className="pipeline-count">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card dashboard-card">
            <div className="dashboard-card-header">
              <h3>Recent Activity</h3>
            </div>
            <div className="activity-feed">
              {activities.slice(0, 6).map(act => (
                <div key={act.id} className="activity-feed-item">
                  <div className="activity-feed-dot" />
                  <div className="activity-feed-content">
                    <p>{act.description}</p>
                    <span className="activity-feed-time">
                      <Clock size={10} /> {getUserName(act.performed_by)} • {formatTime(act.created_at)}
                    </span>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center', padding: '20px' }}>No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
