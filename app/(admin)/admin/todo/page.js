import { TODO_OPS, TODO_CATEGORIES, todoParCategorie } from '@/lib/todo-ops';

export const metadata = { title: 'To-do équipe' };
export const dynamic = 'force-dynamic';

// ─── /admin/todo — la to-do équipe, par catégories ──────────────────────────
// Source unique : lib/todo-ops.js (fichier versionné — on ajoute/termine une
// tâche en l'éditant, une tâche faite se supprime, git garde l'historique).
// Le registre dev exhaustif reste la bible (CLAUDE.md §8) ; ici la vue équipe.

const BADGE_PRIORITE = {
  haute: { label: 'Haute', classe: 'inactive' },
  normale: { label: 'Normale', classe: 'solo' },
  basse: { label: 'Basse', classe: 'free' },
};

export default function AdminTodoPage() {
  const groupes = todoParCategorie(TODO_OPS);
  const categories = Object.entries(TODO_CATEGORIES).sort((a, b) => a[1].ordre - b[1].ordre);

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 4 }}>✅ To-do équipe</h1>
      <p style={{ maxWidth: 720, color: '#64748b', fontSize: '0.875rem', margin: '0 0 20px', lineHeight: 1.55 }}>
        Ce qu&apos;on ne veut pas perdre de vue, par catégorie. La source vit dans{' '}
        <code>lib/todo-ops.js</code> : ajouter ou terminer une tâche = éditer le
        fichier (via Claude ou à la main) et déployer. Une tâche faite se supprime,
        git garde l&apos;historique.
      </p>

      {categories.map(([cle, cat]) => (
        <section key={cle} style={{ marginBottom: 26 }}>
          <h2 className="admin-subtitle">{cat.nom} ({groupes[cle].length})</h2>
          {groupes[cle].length === 0 && (
            <p style={{ color: '#475569', fontSize: '0.8125rem' }}>Rien en cours. 🌿</p>
          )}
          {groupes[cle].map(t => (
            <div key={t.id} className="admin-card" style={{ marginBottom: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ color: '#e2e8f0' }}>{t.titre}</strong>
                <span className={`admin-badge ${BADGE_PRIORITE[t.priorite].classe}`}>{BADGE_PRIORITE[t.priorite].label}</span>
                {t.statut === 'en_cours' && <span className="admin-badge pro">En cours</span>}
                <span style={{ fontSize: '0.75rem', color: '#475569', marginLeft: 'auto' }}>ajouté le {t.ajoute}</span>
              </div>
              <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.55 }}>
                {t.description}
              </p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
