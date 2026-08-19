import { createAdminClient } from '@/lib/supabase-admin';
import { fetchAllRows, idsComptesTest } from '@/lib/admin-stats';

// `testIds` : profils de TEST (démo Atelier Soleil, melutek, colin+*) —
// exclus de TOUTES les stats et du fil (2026-08-19, retour Colin : le refresh
// du démo seedait 812 € et 32 élèves dans les graphes).
async function getStats(supabase, testIds) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Last 12 months labels
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10),
    });
  }

  // PAGINÉ via fetchAllRows (AUDIT-PERF cat 1.4) : le select nu plafonne à
  // 1000 lignes en silence — `cours` l'aurait crevé le premier (graphes
  // 12 mois silencieusement faux), à rebours de la doctrine d'admin-stats.
  const [rawProfiles, rawCours, rawClients] = await Promise.all([
    fetchAllRows(supabase, 'profiles', 'id, plan, created_at, metier'),
    // ⚠️ cours.created_at N'EXISTE PAS (42703 → data null → graphe vide en
    // silence depuis toujours) — on suit les séances PROGRAMMÉES via `date`.
    fetchAllRows(supabase, 'cours', 'id, profile_id, date, type_cours'),
    fetchAllRows(supabase, 'clients', 'id, profile_id, created_at'),
  ]);
  const allProfiles = (rawProfiles || []).filter(p => !testIds.has(p.id));
  const allCours = (rawCours || []).filter(c => !testIds.has(c.profile_id));
  const allClients = (rawClients || []).filter(c => !testIds.has(c.profile_id));

  // Inscriptions par mois
  const signupsByMonth = months.map(m => ({
    ...m,
    count: (allProfiles || []).filter(p =>
      p.created_at >= m.start && p.created_at < m.end
    ).length,
  }));

  // Séances programmées par mois (cours.date — created_at n'existe pas)
  const coursByMonth = months.map(m => ({
    ...m,
    count: (allCours || []).filter(c =>
      c.date >= m.start.slice(0, 10) && c.date < m.end.slice(0, 10)
    ).length,
  }));

  // Clients créés par mois
  const clientsByMonth = months.map(m => ({
    ...m,
    count: (allClients || []).filter(c =>
      c.created_at >= m.start && c.created_at < m.end
    ).length,
  }));

  // Distribution métiers
  const metierDist = (allProfiles || []).reduce((acc, p) => {
    const m = p.metier || 'Non renseigné';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const metierSorted = Object.entries(metierDist).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Upcoming cours count (today + 30 days)
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const upcomingCours = (allCours || []).filter(c => c.date >= todayStr && c.date <= in30).length;

  return {
    signupsByMonth,
    coursByMonth,
    clientsByMonth,
    metierSorted,
    totalUsers: (allProfiles || []).length,
    totalCours: (allCours || []).length,
    totalClients: (allClients || []).length,
    upcomingCours,
  };
}

function MiniBarChart({ data, color = '#60a5fa', label }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '64px', marginBottom: '6px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div
              title={`${d.label}: ${d.count}`}
              style={{
                width: '100%',
                height: `${Math.max((d.count / max) * 56, d.count > 0 ? 4 : 0)}px`,
                background: i === data.length - 1 ? color : color + '80',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s',
                minHeight: d.count > 0 ? '4px' : '0',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.65rem', color: '#475569' }}>{data[0]?.label}</span>
        <span style={{ fontSize: '0.65rem', color: '#475569' }}>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

// ─── Fil d'activité (tous studios) ──────────────────────────────────────────
// Fusionne connexions (Supabase Auth) + événements métier datés en un fil
// chronologique unique. Lecture via client ADMIN : la page est réservée aux
// ADMIN_EMAILS par le layout ; avec le client session, la RLS filtrerait
// tout sur le compte connecté (même bug que les routes admin, corrigé S3).
async function getActivityFeed(admin, testIds) {
  const events = [];

  // ── Affiliation des comptes (demande Colin 2026-07-26) : « Connexion » et
  // « Nouveau compte » arrivaient avec studio:null en dur — illisibles.
  // Prof → son propre studio ; élève (auth sans profil, v57) → les studios de
  // ses fiches par email (même mécanique que /admin/users).
  const [{ data: profilsAff }, clientsAff] = await Promise.all([
    admin.from('profiles').select('id, studio_nom, prenom'),
    fetchAllRows(admin, 'clients', 'profile_id, email'),
  ]);
  const profilById = {};
  for (const p of profilsAff || []) profilById[p.id] = p;
  const studiosParEmail = {};
  for (const c of clientsAff || []) {
    if (!c.email) continue;
    const k = String(c.email).toLowerCase();
    (studiosParEmail[k] = studiosParEmail[k] || new Set()).add(c.profile_id);
  }
  const affiliation = (u) => {
    const prof = profilById[u.id];
    if (prof) return { studio: prof.studio_nom || prof.prenom || 'studio sans nom', qui: 'prof' };
    const ids = [...(studiosParEmail[String(u.email || '').toLowerCase()] || [])].filter(id => profilById[id]);
    if (ids.length === 0) return { studio: null, qui: 'élève ⚠ aucune fiche' };
    return { studio: ids.map(id => profilById[id].studio_nom || 'studio sans nom').join(' + '), qui: 'élève' };
  };

  // Un auth user de TEST : le prof démo lui-même, ou un élève dont TOUTES les
  // fiches sont dans des studios de test (les 32 élèves fictifs du démo).
  const estUserTest = (u) => {
    if (testIds.has(u.id)) return true;
    const ids = [...(studiosParEmail[String(u.email || '').toLowerCase()] || [])];
    return ids.length > 0 && ids.every(id => testIds.has(id));
  };

  // Connexions + nouveaux comptes (API admin Supabase)
  try {
    const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of usersPage?.users || []) {
      if (estUserTest(u)) continue;
      const { studio, qui } = affiliation(u);
      if (u.last_sign_in_at) {
        events.push({ date: u.last_sign_in_at, icone: '🔑', type: `Connexion ${qui}`, label: u.email, studio });
      }
      if (u.created_at) {
        events.push({ date: u.created_at, icone: '✨', type: `Nouveau compte ${qui}`, label: u.email, studio });
      }
    }
  } catch (e) {
    console.error('[admin/stats] listUsers:', e?.message);
  }

  const nomClient = (c) => [c?.prenom, c?.nom].filter(Boolean).join(' ') || 'élève inconnu·e';

  // Limites élargies PUIS filtre test : un refresh du démo (dizaines de
  // lignes récentes) ne doit pas vider le fil réel.
  const [{ data: rawPresences }, { data: rawPaiements }, { data: rawClients }, { data: rawEssais }] = await Promise.all([
    admin.from('presences')
      .select('created_at, profile_id, clients(prenom, nom), cours(nom, date), profiles(studio_nom)')
      .order('created_at', { ascending: false }).limit(60),
    admin.from('paiements')
      .select('created_at, profile_id, montant, intitule, statut, clients(prenom, nom), profiles(studio_nom)')
      .order('created_at', { ascending: false }).limit(60),
    admin.from('clients')
      .select('created_at, profile_id, prenom, nom, statut, source, profiles(studio_nom)')
      .order('created_at', { ascending: false }).limit(60),
    admin.from('cours_essai_demandes')
      .select('created_at, profile_id, prenom, statut, profiles(studio_nom)')
      .order('created_at', { ascending: false }).limit(30),
  ]);
  const horsTest = rows => (rows || []).filter(r => !testIds.has(r.profile_id)).slice(0, 15);
  const presences = horsTest(rawPresences);
  const paiements = horsTest(rawPaiements);
  const clients = horsTest(rawClients);
  const essais = horsTest(rawEssais);

  for (const p of presences || []) {
    events.push({
      date: p.created_at, icone: '📅', type: 'Réservation',
      label: `${nomClient(p.clients)} → ${p.cours?.nom || 'cours'}${p.cours?.date ? ` (${p.cours.date})` : ''}`,
      studio: p.profiles?.studio_nom,
    });
  }
  for (const p of paiements || []) {
    events.push({
      date: p.created_at, icone: '💶', type: `Paiement ${p.statut === 'paid' ? 'encaissé' : p.statut}`,
      label: `${p.intitule || 'Paiement'} · ${p.montant} € · ${nomClient(p.clients)}`,
      studio: p.profiles?.studio_nom,
    });
  }
  for (const c of clients || []) {
    events.push({
      date: c.created_at, icone: '👤', type: `Fiche élève (${c.statut || 'prospect'})`,
      label: `${nomClient(c)}${c.source ? ` · via ${c.source}` : ''}`,
      studio: c.profiles?.studio_nom,
    });
  }
  for (const e of essais || []) {
    events.push({
      date: e.created_at, icone: '🎟️', type: `Demande d'essai (${e.statut})`,
      label: e.prenom || '—',
      studio: e.profiles?.studio_nom,
    });
  }

  return events
    .filter(e => e.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40);
}

function formatDateFeed(iso) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default async function AdminStatsPage() {
  // Client ADMIN (service_role) : stats GLOBALES. Avant : client session →
  // la RLS limitait les comptages aux données du compte admin connecté.
  const supabase = createAdminClient();
  const testIds = await idsComptesTest(supabase);
  const stats = await getStats(supabase, testIds);
  const feed = await getActivityFeed(supabase, testIds);

  const currentMonthSignups = stats.signupsByMonth[stats.signupsByMonth.length - 1]?.count ?? 0;
  const prevMonthSignups = stats.signupsByMonth[stats.signupsByMonth.length - 2]?.count ?? 0;
  const signupsDelta = currentMonthSignups - prevMonthSignups;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h1 className="admin-title">📈 Statistiques</h1>
      <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '-16px 0 0' }}>
        Hors comptes de test ({testIds.size} exclus : démos et comptes internes).
      </p>

      {/* KPIs */}
      <div className="admin-stat-grid">
        <div className="admin-stat">
          <div className="admin-stat-label">Utilisateurs total</div>
          <div className="admin-stat-value">{stats.totalUsers}</div>
          <div className="admin-stat-sub" style={{ color: signupsDelta >= 0 ? '#4ade80' : '#f87171' }}>
            {signupsDelta >= 0 ? '+' : ''}{signupsDelta} vs mois dernier
          </div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Séances programmées</div>
          <div className="admin-stat-value">{stats.totalCours}</div>
          <div className="admin-stat-sub">{stats.upcomingCours} dans les 30 prochains jours</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Élèves gérés</div>
          <div className="admin-stat-value">{stats.totalClients}</div>
          <div className="admin-stat-sub">toutes activités confondues</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Moy. cours / user</div>
          <div className="admin-stat-value">
            {stats.totalUsers > 0 ? (stats.totalCours / stats.totalUsers).toFixed(1) : '—'}
          </div>
          <div className="admin-stat-sub">cours par utilisateur</div>
        </div>
      </div>

      {/* Fil d'activité récente — tous studios */}
      <div className="admin-card">
        <h2 className="admin-subtitle" style={{ marginBottom: '4px' }}>🕒 Activité récente (tous studios)</h2>
        <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 16px' }}>
          Connexions, comptes, réservations, paiements, fiches élèves et demandes d'essai — 40 derniers événements.
        </p>
        {feed.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>Aucune activité récente.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {feed.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '10px', padding: '7px 0', borderBottom: i < feed.length - 1 ? '1px solid #2d2d3f' : 'none' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', minWidth: '88px' }}>
                  {formatDateFeed(e.date)}
                </span>
                <span aria-hidden="true">{e.icone}</span>
                <span style={{ fontSize: '0.8125rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{e.type}</span>
                <span style={{ fontSize: '0.875rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {e.label}
                </span>
                {e.studio && (
                  <span style={{ fontSize: '0.7rem', color: '#c084fc', background: '#c084fc18', borderRadius: '99px', padding: '2px 9px', whiteSpace: 'nowrap' }}>
                    {e.studio}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="admin-card">
          <div className="admin-subtitle" style={{ marginBottom: '16px' }}>Inscriptions (12 mois)</div>
          <MiniBarChart data={stats.signupsByMonth} color="#60a5fa" />
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
            {[...stats.signupsByMonth].reverse().slice(0, 3).reverse().map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#e2e8f0' }}>{m.count}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-subtitle" style={{ marginBottom: '16px' }}>Séances programmées (12 mois)</div>
          <MiniBarChart data={stats.coursByMonth} color="#4ade80" />
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
            {[...stats.coursByMonth].reverse().slice(0, 3).reverse().map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#e2e8f0' }}>{m.count}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-subtitle" style={{ marginBottom: '16px' }}>Élèves ajoutés (12 mois)</div>
          <MiniBarChart data={stats.clientsByMonth} color="#c084fc" />
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
            {[...stats.clientsByMonth].reverse().slice(0, 3).reverse().map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#e2e8f0' }}>{m.count}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métiers */}
      <div className="admin-card">
        <h2 className="admin-subtitle" style={{ marginBottom: '16px' }}>Top métiers</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stats.metierSorted.length === 0 ? (
            <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>Aucune donnée</p>
          ) : stats.metierSorted.map(([metier, count]) => {
            const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
            return (
              <div key={metier}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{metier}</span>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{count} · {pct}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '99px', background: '#2d2d3f', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #c084fc, #60a5fa)', borderRadius: '99px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
