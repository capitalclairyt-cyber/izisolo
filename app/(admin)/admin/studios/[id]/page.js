import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import { fetchAllRows, estCompteTest } from '@/lib/admin-stats';
import { getAccountStatus, getTrialStatus } from '@/lib/trial';

export const dynamic = 'force-dynamic';

// ─── /admin/studios/[id] — fiche détaillée d'un studio ──────────────────────
// Le zoom qui manquait à l'admin : qui est cette prof, quand est-elle passée
// pour la dernière fois, où en est son activité, que raconte-t-elle en
// feedback. Toutes les lectures sont SCOPÉES au profil (pas de plafond 1000
// global) et vérifient error.

const STATUTS_COMPTE = {
  subscribed:    { label: 'Abonnée',       couleur: '#4ade80' },
  trial_active:  { label: 'En essai',      couleur: '#60a5fa' },
  trial_expired: { label: 'Essai expiré',  couleur: '#fb923c' },
  past_due:      { label: 'Impayé',        couleur: '#f87171' },
  canceled:      { label: 'Résiliée',      couleur: '#64748b' },
  free:          { label: 'Free',          couleur: '#94a3b8' },
};

function relatif(iso) {
  if (!iso) return null;
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (j === 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  if (j < 30) return `il y a ${j} j`;
  if (j < 365) return `il y a ${Math.floor(j / 30)} mois`;
  return `il y a ${Math.floor(j / 365)} an${j >= 730 ? 's' : ''}`;
}

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';
}

function fmtEuros(n) {
  return `${(Math.round(n * 100) / 100).toLocaleString('fr-FR')} €`;
}

function Carte({ label, valeur, sub, couleur }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value" style={couleur ? { color: couleur } : undefined}>{valeur}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

function Etape({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: ok ? '#4ade80' : '#475569' }}>
      <span>{ok ? '✓' : '○'}</span> {label}
    </div>
  );
}

export default async function AdminStudioPage({ params }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: profil, error: profilError } = await supabase
    .from('profiles')
    .select('id, prenom, studio_nom, studio_slug, metier, plan, created_at, updated_at, trial_started_at, stripe_subscription_status')
    .eq('id', id)
    .single();

  if (profilError || !profil) notFound();

  // Auth : email + dernière connexion (1 appel ciblé, pas de listUsers global)
  let email = null;
  let lastSignIn = null;
  try {
    const { data } = await supabase.auth.admin.getUserById(id);
    email = data?.user?.email || null;
    lastSignIn = data?.user?.last_sign_in_at || null;
  } catch (e) {
    console.error('[admin/studio] getUserById:', e?.message);
  }

  const trenteJours = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const scope = q => q.eq('profile_id', id);
  const [clientsRows, coursRows, paiementsRows, abosRows] = await Promise.all([
    fetchAllRows(supabase, 'clients', 'id, statut, invitation_envoyee_at', scope),
    fetchAllRows(supabase, 'cours', 'id, date', scope),
    fetchAllRows(supabase, 'paiements', 'id, montant, statut, mode, date, intitule', scope),
    fetchAllRows(supabase, 'abonnements', 'id, statut', scope),
  ]);

  // Présences 30 j : count exact, sans rapatrier les lignes.
  let presences30j = null;
  {
    const { count, error } = await supabase
      .from('presences')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', id)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
    if (!error) presences30j = count;
  }

  // Feedbacks de ce studio (5 derniers)
  const { data: feedbacks } = await supabase
    .from('feedback')
    .select('id, type, message, status, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  // ── Dérivés ──
  const statut = getAccountStatus(profil);
  const trial = getTrialStatus(profil);
  const estTest = estCompteTest({ email, studio_slug: profil.studio_slug, studio_nom: profil.studio_nom });

  const nbClients = clientsRows.length;
  const clientsActifs = clientsRows.filter(c => c.statut === 'actif').length;
  const clientsArchives = clientsRows.filter(c => c.statut === 'archive').length;
  const clientsInvites = clientsRows.filter(c => c.invitation_envoyee_at).length;

  const coursAVenir = coursRows.filter(c => (c.date || '') >= aujourdhui).length;
  const cours30j = coursRows.filter(c => (c.date || '') >= trenteJours && (c.date || '') < aujourdhui).length;

  const paid = paiementsRows.filter(p => p.statut === 'paid');
  const paid30j = paid.filter(p => (p.date || '') >= trenteJours);
  const pending = paiementsRows.filter(p => p.statut === 'pending');
  const sommeTotale = paid.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const somme30j = paid30j.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const sommePending = pending.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const derniersPaiements = [...paid].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
  const dernierPaiement = derniersPaiements[0]?.date || null;

  const abosActifs = abosRows.filter(a => a.statut === 'actif').length;

  const sc = STATUTS_COMPTE[statut] || STATUTS_COMPTE.free;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Link href="/admin/users" style={{ color: '#64748b', fontSize: '0.8125rem', textDecoration: 'none' }}>← Utilisateurs</Link>

      {/* En-tête */}
      <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
          <h1 className="admin-title" style={{ margin: 0 }}>{profil.studio_nom || 'Studio sans nom'}</h1>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{profil.prenom || '—'}{profil.metier ? ` · ${profil.metier}` : ''}</span>
          {estTest && (
            <span style={{ padding: '1px 6px', borderRadius: '4px', background: '#3f2d1f', color: '#fb923c', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.5px' }}>
              TEST
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.8125rem' }}>
          <span style={{ background: `${sc.couleur}22`, color: sc.couleur, border: `1px solid ${sc.couleur}55`, borderRadius: '999px', padding: '2px 10px', fontWeight: 700 }}>
            {sc.label}{statut === 'trial_active' ? ` · J-${trial.daysLeft}` : ''}
          </span>
          <span className={`admin-badge ${profil.plan || 'free'}`}>{profil.plan || 'free'}</span>
          {profil.stripe_subscription_status && (
            <span style={{ color: '#64748b' }}>Stripe : {profil.stripe_subscription_status}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: '#94a3b8', fontSize: '0.8125rem' }}>
          {email && <a href={`mailto:${email}`} style={{ color: '#94a3b8' }}>✉️ {email}</a>}
          {profil.studio_slug && (
            <a href={`https://www.izisolo.fr/p/${profil.studio_slug}`} target="_blank" rel="noreferrer" style={{ color: '#94a3b8' }}>
              🌐 /p/{profil.studio_slug}
            </a>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: '#64748b', fontSize: '0.78rem' }}>
          <span>Inscrite le {fmtDate(profil.created_at)}</span>
          <span style={{ color: lastSignIn && (Date.now() - new Date(lastSignIn).getTime()) < 7 * 86400000 ? '#4ade80' : '#64748b' }}>
            Dernière connexion : {lastSignIn ? `${relatif(lastSignIn)} (${fmtDate(lastSignIn)})` : 'jamais vue'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stat-grid">
        <Carte label="Élèves" valeur={nbClients} sub={`${clientsActifs} actif·ves · ${clientsInvites} invité·es${clientsArchives ? ` · ${clientsArchives} archivé·es` : ''}`} />
        <Carte label="Séances à venir" valeur={coursAVenir} sub={`${cours30j} passées /30j`} />
        <Carte label="Encaissé /30j" valeur={fmtEuros(somme30j)} couleur={somme30j > 0 ? '#4ade80' : undefined} sub={`${paid30j.length} paiement${paid30j.length > 1 ? 's' : ''}`} />
        <Carte label="Encaissé total" valeur={fmtEuros(sommeTotale)} sub={dernierPaiement ? `dernier ${relatif(dernierPaiement)}` : 'jamais'} />
        <Carte label="À percevoir" valeur={fmtEuros(sommePending)} couleur={sommePending > 0 ? '#fb923c' : undefined} sub={`${pending.length} en attente`} />
        <Carte label="Carnets/abos actifs" valeur={abosActifs} sub={presences30j != null ? `${presences30j} présences pointées /30j` : null} />
      </div>

      {/* Activation */}
      <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activation</div>
        <Etape ok={!!profil.studio_slug} label="Onboarding terminé (slug posé)" />
        <Etape ok={coursRows.length > 0} label={`Des cours créés (${coursRows.length})`} />
        <Etape ok={nbClients > 0} label={`Des élèves dans la base (${nbClients})`} />
        <Etape ok={clientsInvites > 0} label={`Des élèves invité·es au portail (${clientsInvites})`} />
        <Etape ok={paid.length > 0} label="Un premier encaissement" />
        <Etape ok={paid30j.length > 0} label="Encaisse ce mois-ci (compte vivant)" />
      </div>

      {/* Derniers encaissements */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 0', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Derniers encaissements</div>
        {derniersPaiements.length === 0 ? (
          <div style={{ padding: '16px', color: '#475569', fontSize: '0.8125rem' }}>Aucun encaissement pour l'instant.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <tbody>
                {derniersPaiements.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: '#64748b', fontSize: '0.78rem', width: '110px' }}>{fmtDate(p.date)}</td>
                    <td style={{ color: '#e2e8f0', fontSize: '0.8125rem' }}>{p.intitule || '—'}</td>
                    <td style={{ color: '#64748b', fontSize: '0.78rem' }}>{p.mode || ''}</td>
                    <td style={{ color: '#4ade80', fontWeight: 600, textAlign: 'right', fontSize: '0.8125rem' }}>{fmtEuros(Number(p.montant) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feedbacks du studio */}
      <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feedbacks</div>
          <Link href="/admin/feedbacks" style={{ color: '#64748b', fontSize: '0.75rem' }}>Tout voir →</Link>
        </div>
        {(feedbacks || []).length === 0 ? (
          <div style={{ color: '#475569', fontSize: '0.8125rem' }}>Aucun feedback envoyé.</div>
        ) : (feedbacks || []).map(f => (
          <div key={f.id} style={{ borderLeft: '2px solid #2d2d3f', paddingLeft: '10px' }}>
            <div style={{ color: '#475569', fontSize: '0.72rem' }}>
              {{ bug: '🐛 Bug', manque: '🧩 Il manque', confus: '😵 Pas clair', kiff: '💛 Kiff', autre: '💬' }[f.type] || '💬'} · {relatif(f.created_at)} · {f.status}
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '0.8125rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{f.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
