import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// ─── /admin/erreurs — journal d'erreurs applicatives (remplaçant Sentry) ────
// Alimenté par lib/report.js reportError() (les 46 routes API) via la table
// erreurs_app (v71). Purge auto à 30 jours par le cron expirations.

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export default async function AdminErreursPage() {
  const supabase = createAdminClient();
  const { data: erreurs, error } = await supabase
    .from('erreurs_app')
    .select('id, created_at, message, stack')
    .order('created_at', { ascending: false })
    .limit(200);

  const migrationManquante = !!error;

  // Regroupement par message (les mêmes erreurs répétées = 1 ligne + compteur)
  const groupes = [];
  const parMessage = new Map();
  for (const e of erreurs || []) {
    const g = parMessage.get(e.message);
    if (g) {
      g.count++;
      // created_at DESC → la 1re vue est la plus récente, on garde la plus ancienne en "depuis"
      g.depuis = e.created_at;
    } else {
      const nouveau = { ...e, count: 1, depuis: e.created_at };
      parMessage.set(e.message, nouveau);
      groupes.push(nouveau);
    }
  }

  const H24 = Date.now() - 24 * 3600 * 1000;
  const nb24h = (erreurs || []).filter(e => new Date(e.created_at).getTime() >= H24).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 className="admin-title" style={{ marginBottom: '4px' }}>🚨 Erreurs applicatives</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          Tout ce que les routes API attrapent (reportError) — dernières 200 lignes, purge auto à 30 jours.
        </p>
      </div>

      {migrationManquante ? (
        <div style={{ background: '#3f2d1f', border: '1px solid #fb923c', borderRadius: '10px', padding: '14px 16px', color: '#fb923c', fontSize: '0.875rem', lineHeight: 1.6 }}>
          La table <code>erreurs_app</code> n'existe pas encore — applique <strong>migrations-v71-erreurs-app.sql</strong> dans
          le SQL Editor Supabase, puis recharge cette page. (En attendant, les erreurs restent visibles dans les logs Vercel.)
        </div>
      ) : (
        <>
          <div className="admin-stat-grid">
            <div className="admin-stat">
              <div className="admin-stat-label">Dernières 24 h</div>
              <div className="admin-stat-value" style={{ color: nb24h > 0 ? '#f87171' : '#4ade80' }}>{nb24h}</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-label">Sur 30 jours (max 200)</div>
              <div className="admin-stat-value">{(erreurs || []).length}</div>
              <div className="admin-stat-sub">{groupes.length} erreur{groupes.length > 1 ? 's' : ''} distincte{groupes.length > 1 ? 's' : ''}</div>
            </div>
          </div>

          {groupes.length === 0 ? (
            <div className="admin-card" style={{ textAlign: 'center', color: '#4ade80', padding: '32px' }}>
              ✅ Aucune erreur enregistrée. Calme plat.
            </div>
          ) : (
            <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>×</th>
                      <th>Erreur</th>
                      <th style={{ width: '140px' }}>Dernière</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupes.map(g => (
                      <tr key={g.id}>
                        <td>
                          <span style={{
                            background: g.count > 5 ? '#3f1f1f' : '#1e293b',
                            color: g.count > 5 ? '#f87171' : '#94a3b8',
                            padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                          }}>
                            ×{g.count}
                          </span>
                        </td>
                        <td>
                          <div style={{ color: '#e2e8f0', fontSize: '0.8125rem', wordBreak: 'break-word' }}>{g.message}</div>
                          {g.stack && (
                            <details style={{ marginTop: '4px' }}>
                              <summary style={{ color: '#475569', fontSize: '0.7rem', cursor: 'pointer' }}>stack</summary>
                              <pre style={{ color: '#64748b', fontSize: '0.68rem', whiteSpace: 'pre-wrap', margin: '4px 0 0', maxHeight: '180px', overflow: 'auto' }}>{g.stack}</pre>
                            </details>
                          )}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.78rem' }}>{formatDate(g.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
