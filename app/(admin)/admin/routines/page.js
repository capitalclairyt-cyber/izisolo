import Link from 'next/link';
import { ROUTINES_OPS, etatRoutine } from '@/lib/routines-ops';

export const metadata = { title: 'Travail récurrent' };
export const dynamic = 'force-dynamic';

// ─── /admin/routines — le travail récurrent de l'équipe, en un coup d'œil ──
// Source unique : lib/routines-ops.js (fichier versionné, pas de table — qui
// fait la tâche met à jour derniereExecution et commit). Le badge « en
// retard » de la nav vit dans le layout admin, même source.

const BADGES = {
  a_jour:       { label: '🟢 À jour',      classe: 'pro' },
  bientot:      { label: '🟠 Bientôt',     classe: 'premium' },
  en_retard:    { label: '🔴 En retard',   classe: 'inactive' },
  a_la_demande: { label: 'À la demande',   classe: 'free' },
};

function fmt(d) {
  if (!d) return '·';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AdminRoutinesPage() {
  const maintenant = new Date();
  const lignes = ROUTINES_OPS.map(r => ({ ...r, etat: etatRoutine(r, maintenant) }));

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 4 }}>📋 Travail récurrent</h1>
      <p style={{ maxWidth: 720, color: '#64748b', fontSize: '0.875rem', margin: '0 0 20px', lineHeight: 1.55 }}>
        Les tâches qui reviennent, avec leur échéance et leur procédure. La source
        vit dans <code>lib/routines-ops.js</code> : qui fait la tâche met à jour la
        date de dernière exécution (via Claude ou à la main) et déploie. Les
        vérifications de comparatifs tournent aussi toutes seules (routine Claude
        programmée chaque trimestre).
      </p>

      {lignes.map(r => (
        <div key={r.id} className="admin-card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '1rem', color: '#e2e8f0' }}>{r.nom}</strong>
            <span className={`admin-badge ${BADGES[r.etat.statut].classe}`}>
              {BADGES[r.etat.statut].label}
              {r.etat.statut === 'bientot' && r.etat.joursRestants !== null && ` (J-${r.etat.joursRestants})`}
              {r.etat.statut === 'en_retard' && r.etat.joursRestants !== null && ` (+${Math.abs(r.etat.joursRestants)} j)`}
            </span>
          </div>
          <p style={{ margin: '8px 0', color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.55 }}>
            {r.description}
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.8125rem', color: '#64748b', marginBottom: 8 }}>
            <span>Fréquence : {r.frequenceJours ? `tous les ${r.frequenceJours} jours` : 'à la demande'}</span>
            <span>Dernière : {fmt(r.derniereExecution ? r.derniereExecution + 'T12:00:00' : null)}</span>
            {r.etat.prochaine && <span>Prochaine : {fmt(r.etat.prochaine)}</span>}
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8' }}>
            <span style={{ color: '#64748b' }}>Procédure : </span>
            {r.procedure}
            {r.lien && <> · <Link href={r.lien} style={{ color: '#60a5fa' }}>ouvrir</Link></>}
          </p>
        </div>
      ))}
    </div>
  );
}
