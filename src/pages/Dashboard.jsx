import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Footprints, PhoneForwarded, TrendingUp,
  Plus, ArrowRight, Building2, Clock, BarChart3
} from 'lucide-react';
import { getLeadStats, getTodayLeads } from '../services/leadService';
import { getRecentActivities } from '../services/activityService';
import { getAllSources, getSourceName } from '../services/sourceService';
import { getSession, getAllUsers, getUserName } from '../services/authService';
import StatusBadge from '../components/StatusBadge';
import { LEAD_STATUSES } from '../data/seedData';
import './Dashboard.css';

// ===== SVG DONUT CHART COMPONENT =====
function DonutChart({ data, size = 180, onSelect }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 16;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <div className="donut-chart-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart-svg">
        {data.map((d, i) => {
          const percent = d.count / total;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const offset = cumulativePercent * circumference;
          cumulativePercent += percent;

          return (
            <circle
              key={d.name}
              role="button"
              tabIndex={0}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth="24"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              className="donut-segment clickable"
              style={{ animationDelay: `${i * 120}ms` }}
              onClick={() => onSelect?.(d)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(d); }}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" className="donut-total-value">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="donut-total-label">Total</text>
      </svg>
      <div className="donut-legend">
        {data.map(d => (
          <button key={d.name} type="button" className="donut-legend-item clickable" onClick={() => onSelect?.(d)}>
            <span className="donut-legend-dot" style={{ background: d.color }} />
            <span className="donut-legend-label">{d.name}</span>
            <span className="donut-legend-count">{d.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== SVG BAR CHART COMPONENT =====
function BarChart({ data }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={d.label} className="bar-chart-row" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="bar-chart-label">
            <span className="bar-dot" style={{ background: d.color }} />
            <span>{d.label}</span>
          </div>
          <div className="bar-chart-track">
            <div
              className="bar-chart-fill"
              style={{
                width: `${(d.count / maxCount) * 100}%`,
                background: `linear-gradient(90deg, ${d.color}, ${d.color}99)`,
              }}
            />
          </div>
          <span className="bar-chart-count">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [activities, setActivities] = useState([]);
  const [sources, setSources] = useState([]);
  const [usersCache, setUsersCache] = useState([]);
  const navigate = useNavigate();
  const session = getSession();

  useEffect(() => {
    async function load() {
      const users = await getAllUsers();
      setUsersCache(users);

      try {
        const [statsData, todayLeads, acts, srcs] = await Promise.all([
          getLeadStats(),
          getTodayLeads(),
          getRecentActivities(10),
          getAllSources(),
        ]);
        setStats(statsData);
        setRecentLeads(todayLeads.slice(0, 8));
        setActivities(acts);
        setSources(srcs);
      } catch {
        setStats({ total: 0, todayWalkIns: 0, followUpsDue: 0, newToday: 0, byStatus: {}, bySource: {}, byAssignee: {} });
        setRecentLeads([]);
        setActivities([]);
        setSources([]);
      }
    }
    load();
  }, []);

  if (!stats) return null;

  const statCards = [
    { label: 'Total Leads', value: stats.total, icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { label: "Today's Walk-Ins", value: stats.todayWalkIns, icon: Footprints, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { label: 'Follow-Ups Due', value: stats.followUpsDue, icon: PhoneForwarded, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { label: 'New Today', value: stats.newToday, icon: TrendingUp, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  ];

  // Source data for donut chart
  const sourceColors = {
    'Walk-In': '#3b82f6',
    'Reference': '#8b5cf6',
    'Online Enquiry': '#22c55e',
    'Social Media': '#f59e0b',
    'Other': '#64748b',
  };
  const sourceMap = new Map(sources.map(source => [source.id, source]));
  const sourceData = Object.entries(stats.bySource || {})
    .map(([sourceId, count]) => {
      const source = sourceMap.get(sourceId);
      const name = source?.source_name || getSourceName(sourceId, sources);
      return {
        id: sourceId,
        name,
        count,
        color: sourceColors[name] || '#64748b',
      };
    })
    .filter(s => s.count > 0);

  const openSourceLeads = (source) => {
    navigate(`/leads?source=${encodeURIComponent(source.id)}`);
  };

  // Status data for bar chart
  const statusData = LEAD_STATUSES.map(s => ({
    ...s,
    count: stats.byStatus[s.value] || 0,
  })).filter(s => s.count > 0);

  // Assignee data for horizontal bar chart
  const assigneeData = Object.entries(stats.byAssignee || {})
    .map(([userId, count]) => ({
      label: getUserName(userId, usersCache),
      count,
      color: userId === 'user_admin' ? '#c8a44e' : '#3b82f6',
    }))
    .sort((a, b) => b.count - a.count);

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

      {/* Charts Row */}
      <div className="charts-row">
        {/* Donut Chart — Leads by Source */}
        <div className="card dashboard-card chart-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="dashboard-card-header">
            <h3><BarChart3 size={16} style={{ marginRight: '8px', opacity: 0.6 }} />Leads by Source</h3>
          </div>
          <div className="chart-body">
            {sourceData.length > 0 ? (
              <DonutChart data={sourceData} onSelect={openSourceLeads} />
            ) : (
              <p className="chart-empty">No data yet</p>
            )}
          </div>
        </div>

        {/* Bar Chart — Lead Pipeline */}
        <div className="card dashboard-card chart-card animate-fade-in-up" style={{ animationDelay: '320ms' }}>
          <div className="dashboard-card-header">
            <h3><BarChart3 size={16} style={{ marginRight: '8px', opacity: 0.6 }} />Lead Pipeline</h3>
          </div>
          <div className="chart-body">
            {statusData.length > 0 ? (
              <BarChart data={statusData} />
            ) : (
              <p className="chart-empty">No data yet</p>
            )}
          </div>
        </div>

        {/* Team Performance */}
        <div className="card dashboard-card chart-card animate-fade-in-up" style={{ animationDelay: '440ms' }}>
          <div className="dashboard-card-header">
            <h3><Users size={16} style={{ marginRight: '8px', opacity: 0.6 }} />Team Performance</h3>
          </div>
          <div className="chart-body">
            {assigneeData.length > 0 ? (
              <BarChart data={assigneeData} />
            ) : (
              <p className="chart-empty">No data yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Recent Leads */}
        <div className="card dashboard-card">
          <div className="dashboard-card-header">
            <h3>Recent Leads</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          {recentLeads.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
              <p>No leads yet</p>
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
                      <td><span className="text-muted">{getSourceName(lead.source_id, sources)}</span></td>
                      <td><StatusBadge status={lead.status} /></td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{getUserName(lead.assigned_to, usersCache)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="dashboard-right">
          {/* Recent Activity */}
          <div className="card dashboard-card">
            <div className="dashboard-card-header">
              <h3>Recent Activity</h3>
            </div>
            <div className="activity-feed">
              {activities.slice(0, 8).map(act => (
                <div key={act.id} className="activity-feed-item">
                  <div className="activity-feed-dot" />
                  <div className="activity-feed-content">
                    <p>{act.description}</p>
                    <span className="activity-feed-time">
                      <Clock size={10} /> {getUserName(act.performed_by, usersCache)} • {formatTime(act.created_at)}
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
