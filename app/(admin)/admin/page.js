import { createAdminClient } from '@/lib/supabase-admin';
import Link from 'next/link';
import {
  fetchAllRows, countParProfil, enrichirProfil,
  mrrEstime, repartitionStatuts, funnelActivation,
} from '@/lib/admin-stats';

async function getStats(supabase) {
  const today = new Date();
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const trenteJours = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  // Profils + emails (auth) — même fusion que /admin/users
  const { data: profils, error } = await supabase
    .from('profiles')
    .select('id, prenom, studio_nom, studio_slug, plan, metier, created_at, trial_started_at, stripe_subscription_status')
    .order('created_at', { ascending: false });
  if (error) console.error('[admin] profils:', error.message);

  const emailById = {};
  const lastSignInById = {};
  try {
    const { data: page } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of page?.users || []) {
      emailById[u.id] = u.email;
      lastSignInById[u.id] = u.last_sign_in_at || null;
    }
  } catch (e) { console.error('[admin] listUsers:', e?.message); }

  // Usage global — lectures paginées (le plafond PostgREST de 1000 lignes
  // tronquait silencieusement : leçon du cron d'archivage)
  const [clientsRows, coursRows, paiementsRows] = await Promise.all([
    fetchAllRows(supabase, 'clients', 'profile_id'),
    fetchAllRows(supabase, 'cours', 'profile_id, date'),
    fetchAllRows(supabase, 'paiements', 'profile_id, date, statut, montant'),
  ]);
  const paiementsPaid = paiementsRows.filter(p => p.statut === 'paid');
  const usage = {
    clientsParProfil: countParProfil(clientsRows),
    coursParProfil: countParProfil(coursRows),
    paiements30jParProfil: countParProfil(paiementsPaid.filter(p => (p.date || '') >= trenteJours)),
    dernierPaiementParProfil: paiementsPaid.reduce((m, p) => {
      if (p.profile_id && (!m[p.profile_id] || p.date > m[p.profile_id])) m[p.profile_id] = p.date;
      return m;
    }, {}),
  };

  const enrichis = (profils || []).map(p => enrichirProfil(p, emailById, lastSignInById, usage));
  const reels = enrichis.filter(p => !p.est_test);

  return {
    enrichis,
    reels,
    mrr: mrrEstime(enrichis),
    statuts: repartitionStatuts(enrichis),
    funnel: funnelActivation(enrichis),
    nbComptesTest: enrichis.length - reels.length,
    newUsersMonth: reels.filter(p => (p.created_at || '') >= firstOfMonth).length,
    // GMV élèves (volume encaissé par les profs via l'app) — pouls d'usage réel
    gmv30j: paiementsPaid
      .filter(p => (p.date || '') >= trenteJours)
      .reduce((s, p) => s + (parseFloat(p.montant) || 0), 0),
    // ⚠️ L'ancienne stat « cours créés ce mois » lisait cours.created_at, qui
    // N'EXISTE PAS → erreur silencieuse, « — » depuis toujours. Remplacée par
    // les séances PROGRAMMÉES ce mois (cours.date), qui veut dire quelque chose.
    seancesCeMois: coursRows.filter(c => (c.date || '') >= firstOfMonth).length,
  };
}

const STATUT_CARDS = [
  { key: 'subscribed',    label: 'Abonnés',        accent: '#4ade80' },
  { key: 'trial_active',  label: 'Essais en cours', accent: '#60a5fa' },
  { key: 'trial_expired', label: 'Essais expirés',  accent: '#fb923c', hint: 'à relancer' },
  { key: 'past_due',      label: 'Impayés',         accent: '#f87171', hint: 'action urgente' },
  { key: 'canceled',      label: 'Résiliés',        accent: '#94a3b8' },
];

const FUNNEL_STEPS = [
  { key: 'inscrits',     label: 'Inscrits' },
  { key: 'onboardes',    label: 'Onboarding fini' },
  { key: 'avecCours',    label: '≥ 1 cours' },
  { key: 'avecEleves',   label: '≥ 1 élève' },
  { key: 'avecPaiement', label: '≥ 1 encaissement' },
  { key: 'actifs30j',    label: 'Actifs (encaissé /30j)' },
];

export default async function AdminDashboard() {
  // Client ADMIN : données GLOBALES (le client session + RLS limitait tout
  // au seul profil de l'admin connecté).
  const supabase = createAdminClient();
  const stats = await getStats(supabase);

  const recentUsers = stats.reels.slice(0, 10);
  const PLAN_COLORS = { free: 'free', solo: 'solo', pro: 'pro', premium: 'premium' };
  const STATUT_BADGES = {
    subscribed: ['Abonné', '#1c3a2e', '#4ade80'],
    trial_active: ['Essai', '#1e3a5f', '#60a5fa'],
    trial_expired: ['Essai expiré', '#3f2d1f', '#fb923c'],
    past_due: ['Impayé', '#3f1f1f', '#f87171'],
    canceled: ['Résilié', '#2a2a35', '#94a3b8'],
    free: ['Free', '#1e293b', '#94a3b8'],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h1 className="admin-title">📊 Dashboard IziSolo</h1>
      <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '-16px 0 0' }}>
        Chiffres HORS comptes de test ({stats.nbComptesTest} exclus — Colin/Maude/démo).
      </p>

      {/* KPIs business */}
      <div className="admin-stat-grid">
        <div className="admin-stat">
          <div className="admin-stat-label">MRR estimé</div>
          <div className="admin-stat-value">{stats.mrr} €</div>
          <div className="admin-stat-sub">brut, hors remises Stripe</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Profs (réels)</div>
          <div className="admin-stat-value">{stats.reels.length}</div>
          <div className="admin-stat-sub">+{stats.newUsersMonth} ce mois</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Encaissé par les profs /30j</div>
          <div className="admin-stat-value">{Math.round(stats.gmv30j)} €</div>
          <div className="admin-stat-sub">volume élèves via l'app (pouls d'usage)</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Séances programmées ce mois</div>
          <div className="admin-stat-value">{stats.seancesCeMois}</div>
          <div className="admin-stat-sub">tous studios</div>
        </div>
      </div>

      {/* Statuts de compte */}
      <div className="admin-stat-grid">
        {STATUT_CARDS.map(({ key, label, accent, hint }) => (
          <div className="admin-stat" key={key} style={{ borderLeft: `3px solid ${accent}` }}>
            <div className="admin-stat-label">{label}</div>
            <div className="admin-stat-value" style={{ color: accent }}>{stats.statuts[key] || 0}</div>
            {hint && (stats.statuts[key] || 0) > 0 && <div className="admin-stat-sub">{hint}</div>}
          </div>
        ))}
      </div>

      {/* Funnel d'activation */}
      <div className="admin-card">
        <h2 className="admin-subtitle" style={{ marginTop: 0 }}>Funnel d'activation (comptes réels)</h2>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'stretch' }}>
          {FUNNEL_STEPS.map(({ key, label }, i) => {
            const val = stats.funnel[key] || 0;
            const base = stats.funnel.inscrits || 1;
            const pct = Math.round((val / base) * 100);
            return (
              <div key={key} style={{ flex: '1 1 130px', background: '#1a1a27', border: '1px solid #2d2d3f', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>{i + 1}. {label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0' }}>{val}</div>
                <div style={{ height: '4px', background: '#2d2d3f', borderRadius: '2px', marginTop: '8px' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#60a5fa', borderRadius: '2px' }} />
                </div>
                <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '4px' }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Derniers inscrits (réels) */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="admin-subtitle" style={{ margin: 0 }}>Derniers inscrits</h2>
          <Link href="/admin/users" style={{ fontSize: '0.8125rem', color: '#64748b', textDecoration: 'none' }}>Voir tous →</Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Prénom</th>
                <th>Studio</th>
                <th>Statut</th>
                <th>Activité</th>
                <th>Plan</th>
                <th>Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map(u => {
                const [label, bg, color] = STATUT_BADGES[u.compte_statut] || ['?', '#1e293b', '#94a3b8'];
                return (
                  <tr key={u.id}>
                    <td>{u.prenom || '—'}</td>
                    <td>{u.studio_nom || '—'}</td>
                    <td>
                      <span style={{ background: bg, color, padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                        {label}{u.compte_statut === 'trial_active' ? ` · J-${u.trial_jours_restants}` : ''}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                      {u.nb_clients} élève{u.nb_clients > 1 ? 's' : ''} · {u.nb_cours} cours
                    </td>
                    <td>
                      <span className={`admin-badge ${PLAN_COLORS[u.plan] || 'free'}`}>
                        {u.plan || 'free'}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
