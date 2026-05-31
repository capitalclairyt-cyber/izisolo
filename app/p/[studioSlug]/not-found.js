'use client';
import Link from 'next/link';

// 404 segmenté pour le portail public élève.
// Sans ce fichier, un slug studio inexistant (ou un cours supprimé) remonterait
// au 404 GLOBAL, qui parle « tableau de bord » et lie vers /dashboard et /agenda
// — des pages du PROF, montrées à une élève déconnectée. Ici : ton chaleureux,
// pas de jargon, et un seul lien neutre (accueil) qui ne casse jamais.
// Note : un not-found segmenté ne reçoit pas le studioSlug, on reste donc générique.
export default function NotFound() {
  return (
    <div className="pnf-page">
      <div className="pnf-card">
        <div className="pnf-emoji">🌿</div>
        <h1 className="pnf-title">Oups, page introuvable</h1>
        <p className="pnf-desc">
          Cette page n'existe pas, ou ce studio est introuvable.
          Le lien que tu as suivi est peut-être incomplet ou a expiré.
        </p>
        <p className="pnf-hint">
          Si tu cherches à réserver un cours, demande à ton professeur le bon lien
          vers son studio.
        </p>
        <div className="pnf-actions">
          <Link href="/" className="pnf-btn-ghost">
            Aller à l'accueil
          </Link>
        </div>
      </div>

      <style jsx global>{`
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #faf8f5; }
        .pnf-page {
          min-height: 100dvh;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .pnf-card {
          background: white;
          border-radius: 20px;
          padding: 48px 32px;
          text-align: center;
          max-width: 380px;
          width: 100%;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
        }
        .pnf-emoji { font-size: 3rem; margin-bottom: 12px; }
        .pnf-title {
          font-size: 1.375rem; font-weight: 800;
          color: #1a1a2e; margin: 0 0 12px;
          letter-spacing: -0.01em;
        }
        .pnf-desc {
          color: #666; font-size: 0.9375rem;
          margin: 0 0 12px; line-height: 1.55;
        }
        .pnf-hint {
          color: #999; font-size: 0.8125rem;
          margin: 0 0 28px; line-height: 1.5;
        }
        .pnf-actions { display: flex; flex-direction: column; gap: 10px; }
        .pnf-btn-ghost {
          display: block; padding: 13px 24px;
          background: transparent; color: #888;
          border: 1.5px solid #e5e5e5;
          border-radius: 12px; text-decoration: none;
          font-weight: 500; font-size: 0.9375rem;
          transition: all 0.15s;
        }
        .pnf-btn-ghost:hover { border-color: #d4a0a0; color: #d4a0a0; }
      `}</style>
    </div>
  );
}
