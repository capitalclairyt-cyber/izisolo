'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    console.error('[IziSolo] Dashboard error:', error);
  }, [error]);

  return (
    <div className="dash-err">
      <div className="dash-err-card izi-card">
        <div className="dash-err-icon">
          <AlertTriangle size={32} />
        </div>
        <h2 className="dash-err-title">Une erreur est survenue</h2>
        <p className="dash-err-desc">
          Cette section a rencontré un problème inattendu.
          Tes données sont en sécurité.
        </p>
        <div className="dash-err-actions">
          <button className="izi-btn izi-btn-primary" onClick={reset}>
            <RefreshCw size={16} /> Réessayer
          </button>
          <Link href="/dashboard" className="izi-btn izi-btn-ghost">
            <Home size={16} /> Tableau de bord
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="dash-err-details">
            <summary>Détails (dev)</summary>
            <pre>{error?.message}</pre>
          </details>
        )}
      </div>

      <style jsx global>{`
        .dash-err {
          display: flex; align-items: center; justify-content: center;
          min-height: 60vh; padding: 24px;
        }
        .dash-err-card {
          max-width: 400px; width: 100%;
          padding: 40px 28px; text-align: center;
          display: flex; flex-direction: column; gap: 16px;
        }
        .dash-err-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: #fef3c7; color: #d97706;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto;
        }
        .dash-err-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); }
        .dash-err-desc { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; }
        .dash-err-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .dash-err-details {
          margin-top: 8px; text-align: left;
          background: #f5f5f5; border-radius: 8px; padding: 12px;
          font-size: 0.75rem; color: #666;
        }
        .dash-err-details pre { margin-top: 6px; white-space: pre-wrap; word-break: break-all; }
      `}</style>
    </div>
  );
}
