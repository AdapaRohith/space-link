import './Skeleton.css';

export function SkeletonBar({ width = '100%', height = '16px', className = '' }) {
  return <div className={`skeleton-bar ${className}`} style={{ width, height }} />;
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <SkeletonBar width="60%" height="20px" style={{ marginBottom: '12px' }} />
      <SkeletonBar width="100%" height="40px" style={{ marginBottom: '8px' }} />
      <SkeletonBar width="80%" height="14px" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        <SkeletonBar width="20%" height="16px" />
        <SkeletonBar width="20%" height="16px" />
        <SkeletonBar width="20%" height="16px" />
        <SkeletonBar width="20%" height="16px" />
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton-table-row">
          <SkeletonBar width="20%" height="16px" />
          <SkeletonBar width="20%" height="16px" />
          <SkeletonBar width="20%" height="16px" />
          <SkeletonBar width="20%" height="16px" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="skeleton-dashboard">
      <div style={{ marginBottom: '32px' }}>
        <SkeletonBar width="25%" height="32px" style={{ marginBottom: '24px' }} />
        <div className="skeleton-stats-grid">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div>
          <SkeletonBar width="40%" height="20px" style={{ marginBottom: '16px' }} />
          <div style={{ height: '200px' }}>
            {[...Array(4)].map((_, i) => (
              <SkeletonBar key={i} height="16px" style={{ marginBottom: '12px', width: `${85 - i * 10}%` }} />
            ))}
          </div>
        </div>
        <div>
          <SkeletonBar width="40%" height="20px" style={{ marginBottom: '16px' }} />
          <div style={{ height: '200px' }}>
            {[...Array(4)].map((_, i) => (
              <SkeletonBar key={i} height="16px" style={{ marginBottom: '12px', width: `${90 - i * 15}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div style={{ padding: '24px' }}>
      <SkeletonDashboard />
    </div>
  );
}
