'use client';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="nf-page">
      <div className="nf-card">
        <div className="nf-emoji">🌿</div>
        <h1 className="nf-code">404</h1>
        <h2 className="nf-title">Page introuvable</h2>
        <p className="nf-desc">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="nf-actions">
          <Link href="/dashboard" className="nf-btn-primary">
            Retour au tableau de bord
          </Link>
          <Link href="/agenda" className="nf-btn-ghost">
            Voir mon agenda
          </Link>
        </div>
      </div>

      <style jsx global>{`
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #faf8f5; }
        .nf-page {
          min-height: 100dvh;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .nf-card {
          background: white;
          border-radius: 20px;
          padding: 48px 32px;
          text-align: center;
          max-width: 380px;
          width: 100%;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
        }
        .nf-emoji { font-size: 3rem; margin-bottom: 8px; }
        .nf-code {
          font-size: 4rem; font-weight: 800;
          color: #d4a0a0; margin: 0 0 8px;
          letter-spacing: -2px;
        }
        .nf-title {
          font-size: 1.25rem; font-weight: 700;
          color: #1a1a2e; margin: 0 0 12px;
        }
        .nf-desc {
          color: #666; font-size: 0.9375rem;
          margin: 0 0 32px; line-height: 1.5;
        }
        .nf-actions { display: flex; flex-direction: column; gap: 10px; }
        .nf-btn-primary {
          display: block; padding: 13px 24px;
          background: #d4a0a0; color: white;
          border-radius: 12px; text-decoration: none;
          font-weight: 600; font-size: 0.9375rem;
          transition: background 0.15s;
        }
        .nf-btn-primary:hover { background: #c08080; }
        .nf-btn-ghost {
          display: block; padding: 13px 24px;
          background: transparent; color: #888;
          border: 1.5px solid #e5e5e5;
          border-radius: 12px; text-decoration: none;
          font-weight: 500; font-size: 0.9375rem;
          transition: all 0.15s;
        }
        .nf-btn-ghost:hover { border-color: #d4a0a0; color: #d4a0a0; }
      `}</style>
    </div>
  );
}
