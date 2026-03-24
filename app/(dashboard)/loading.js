'use client';

export default function DashboardLoading() {
  return (
    <div className="dash-loading">
      <div className="dl-header">
        <div className="dl-skeleton dl-skeleton-title" />
      </div>
      <div className="dl-content">
        {[1, 2, 3].map(i => (
          <div key={i} className="dl-card">
            <div className="dl-skeleton dl-skeleton-line short" />
            <div className="dl-skeleton dl-skeleton-line" />
            <div className="dl-skeleton dl-skeleton-line medium" />
          </div>
        ))}
      </div>

      <style jsx global>{`
        .dash-loading { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
        .dl-header { padding: 4px 0 8px; }
        .dl-content { display: flex; flex-direction: column; gap: 12px; }
        .dl-card {
          background: white; border-radius: 16px;
          padding: 20px; display: flex; flex-direction: column; gap: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .dl-skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
          height: 14px;
          width: 100%;
        }
        .dl-skeleton-title { height: 24px; width: 45%; border-radius: 10px; }
        .dl-skeleton-line.short { width: 35%; }
        .dl-skeleton-line.medium { width: 65%; }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
