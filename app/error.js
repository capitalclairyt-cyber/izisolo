'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[IziSolo] Global error:', error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <div className="err-page">
          <div className="err-card">
            <div className="err-emoji">⚡</div>
            <h1 className="err-title">Quelque chose s'est mal passé</h1>
            <p className="err-desc">
              Une erreur inattendue est survenue. Nos équipes en sont informées.
            </p>
            <div className="err-actions">
              <button className="err-btn-primary" onClick={reset}>
                Réessayer
              </button>
              <Link href="/dashboard" className="err-btn-ghost">
                Retour au tableau de bord
              </Link>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="err-details">
                <summary>Détails de l'erreur (dev)</summary>
                <pre>{error?.message}</pre>
              </details>
            )}
          </div>
        </div>

        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #faf8f5; }
          .err-page {
            min-height: 100dvh;
            display: flex; align-items: center; justify-content: center;
            padding: 24px;
          }
          .err-card {
            background: white; border-radius: 20px;
            padding: 48px 32px; text-align: center;
            max-width: 400px; width: 100%;
            box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          }
          .err-emoji { font-size: 3rem; margin-bottom: 16px; }
          .err-title { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; }
          .err-desc { color: #666; font-size: 0.9375rem; line-height: 1.5; margin-bottom: 32px; }
          .err-actions { display: flex; flex-direction: column; gap: 10px; }
          .err-btn-primary {
            padding: 13px 24px; background: #d4a0a0; color: white;
            border: none; border-radius: 12px; cursor: pointer;
            font-weight: 600; font-size: 0.9375rem; transition: background 0.15s;
          }
          .err-btn-primary:hover { background: #c08080; }
          .err-btn-ghost {
            display: block; padding: 13px 24px;
            background: transparent; color: #888;
            border: 1.5px solid #e5e5e5; border-radius: 12px;
            text-decoration: none; font-weight: 500; font-size: 0.9375rem;
            transition: all 0.15s;
          }
          .err-btn-ghost:hover { border-color: #d4a0a0; color: #d4a0a0; }
          .err-details {
            margin-top: 24px; text-align: left;
            background: #f5f5f5; border-radius: 8px; padding: 12px;
            font-size: 0.8rem; color: #666;
          }
          .err-details pre { margin-top: 8px; white-space: pre-wrap; word-break: break-all; }
        `}</style>
      </body>
    </html>
  );
}
