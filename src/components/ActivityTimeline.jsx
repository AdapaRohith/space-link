import {
  UserPlus, Edit, ArrowRightLeft, MapPin, MessageSquare,
  Clock, CheckCircle, XCircle, AlertCircle, Trash2
} from 'lucide-react';
import { getUserName } from '../services/authService';
import './ActivityTimeline.css';

const ACTIVITY_ICONS = {
  created: UserPlus,
  updated: Edit,
  status_change: ArrowRightLeft,
  visit_logged: MapPin,
  assignment_change: ArrowRightLeft,
  note_added: MessageSquare,
  deleted: Trash2,
};

const ACTIVITY_COLORS = {
  created: '#3b82f6',
  updated: '#8b5cf6',
  status_change: '#f59e0b',
  visit_logged: '#06b6d4',
  assignment_change: '#f97316',
  note_added: '#22c55e',
  deleted: '#ef4444',
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ActivityTimeline({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
        <Clock size={32} style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }} />
        <p style={{ fontSize: 'var(--font-size-sm)' }}>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      {activities.map((activity, idx) => {
        const Icon = ACTIVITY_ICONS[activity.activity_type] || AlertCircle;
        const color = ACTIVITY_COLORS[activity.activity_type] || '#8ba4c8';
        return (
          <div key={activity.id} className="timeline-item" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="timeline-line" />
            <div className="timeline-dot" style={{ background: color + '25', borderColor: color }}>
              <Icon size={14} style={{ color }} />
            </div>
            <div className="timeline-content">
              <p className="timeline-desc">{activity.description}</p>
              <div className="timeline-meta">
                <span>{getUserName(activity.performed_by)}</span>
                <span>•</span>
                <span>{formatDate(activity.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
