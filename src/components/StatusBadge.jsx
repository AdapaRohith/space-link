import { LEAD_STATUSES } from '../data/seedData';

const STATUS_STYLES = {
  new:              { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  contacted:        { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  visit_scheduled:  { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
  visited:          { color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
  interested:       { color: '#4ADE80', bg: 'rgba(74,222,128,0.1)' },
  negotiation:      { color: '#FB923C', bg: 'rgba(251,146,60,0.1)' },
  closed_won:       { color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  closed_lost:      { color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
  followup:         { color: '#F472B6', bg: 'rgba(244,114,182,0.1)' },
};

export default function StatusBadge({ status }) {
  const statusInfo = LEAD_STATUSES.find(s => s.value === status);
  const style = STATUS_STYLES[status] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' };

  return (
    <span
      className="status-badge"
      style={{ background: style.bg, color: style.color }}
    >
      <span className="status-dot" style={{ background: style.color }} />
      {statusInfo?.label || status}
    </span>
  );
}
