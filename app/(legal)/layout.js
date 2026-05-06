'use client';
import Link from 'next/link';

export default function LegalLayout({ children }) {
  return (
    <div className="legal-layout">
      <header className="legal-header">
        <Link href="/" className="legal-logo">🌿 IziSolo</Link>
        <nav className="legal-nav">
          <Link href="/legal/cgu">CGU</Link>
          <Link href="/legal/cgv">CGV</Link>
          <Link href="/legal/rgpd">RGPD</Link>
          <Link href="/legal/mentions">Mentions légales</Link>
        </nav>
      </header>

      <main className="legal-main">
        {children}
      </main>

      <footer className="legal-footer">
        <p>© {new Date().getFullYear()} Atelier Mélusine — IziSolo. Tous droits réservés.</p>
        <Link href="/dashboard">Retour à l'app</Link>
      </footer>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #faf8f5; color: #1a1a2e; }
        .legal-layout { min-height: 100dvh; display: flex; flex-direction: column; }
        .legal-header {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
          padding: 16px 24px; background: white;
          border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 10;
        }
        .legal-logo { font-size: 1.125rem; font-weight: 700; text-decoration: none; color: #d4a0a0; }
        .legal-nav { display: flex; gap: 16px; flex-wrap: wrap; }
        .legal-nav a { font-size: 0.875rem; color: #666; text-decoration: none; font-weight: 500; transition: color 0.15s; }
        .legal-nav a:hover { color: #d4a0a0; }
        .legal-main { flex: 1; max-width: 760px; margin: 0 auto; width: 100%; padding: 40px 24px; }
        .legal-footer {
          text-align: center; padding: 24px;
          border-top: 1px solid #eee; background: white;
          font-size: 0.875rem; color: #888;
          display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; align-items: center;
        }
        .legal-footer a { color: #d4a0a0; text-decoration: none; font-weight: 500; }

        /* Contenu légal */
        .legal-content h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 8px; }
        .legal-content .legal-date { color: #888; font-size: 0.875rem; margin-bottom: 32px; }
        .legal-content h2 { font-size: 1.125rem; font-weight: 700; margin: 32px 0 12px; color: #1a1a2e; border-bottom: 2px solid #f0e8e8; padding-bottom: 6px; }
        .legal-content h3 { font-size: 1rem; font-weight: 600; margin: 20px 0 8px; }
        .legal-content p { line-height: 1.7; margin: 0 0 12px; color: #444; }
        .legal-content ul { padding-left: 20px; margin: 8px 0 12px; }
        .legal-content li { line-height: 1.7; margin-bottom: 4px; color: #444; }
        .legal-content a { color: #d4a0a0; }
        .legal-content strong { color: #1a1a2e; }
        .legal-content .legal-box {
          background: #fef3c7; border-left: 4px solid #f59e0b;
          padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 20px 0;
          font-size: 0.9rem;
        }
        .legal-content .legal-box-warning {
          background: #fee2e2; border-left-color: #dc2626;
          color: #7f1d1d;
        }
        .legal-content .legal-note {
          font-size: 0.85rem; color: #888; font-style: italic;
          margin-top: -4px; margin-bottom: 16px;
        }
        .legal-content .legal-table {
          width: 100%; border-collapse: collapse; font-size: 0.86rem;
          margin: 14px 0 22px;
        }
        .legal-content .legal-table th,
        .legal-content .legal-table td {
          border: 1px solid #e5e0d8; padding: 8px 10px;
          text-align: left; vertical-align: top;
        }
        .legal-content .legal-table th {
          background: #faf6f0; font-weight: 600; color: #1a1a2e;
        }
        .legal-content .legal-table tr:nth-child(even) td {
          background: #fafaf7;
        }
      `}</style>
    </div>
  );
}
