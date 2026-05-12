import { LEAD_STATUSES } from '../data/seedData';

export default function StatusBadge({ status }) {
  const statusInfo = LEAD_STATUSES.find(s => s.value === status);
  if (!statusInfo) return <span className="badge">{status}</span>;

  const className = `badge badge-dot badge-${status.replace(/_/g, '-')}`;
  return <span className={className}>{statusInfo.label}</span>;
}
