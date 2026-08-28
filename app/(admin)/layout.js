import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { isAdminEmail } from '@/lib/admin';
import { estHoteAdmin, hotePrincipal } from '@/lib/admin-host';
import { nbRoutinesEnRetard } from '@/lib/routines-ops';
import { nbTodoHaute } from '@/lib/todo-ops';
import './admin.css';

// PWA admin dédiée : sur les pages /admin, le manifest est celui de
// « IziSolo Admin » (icône sombre distincte, start_url /admin) → installée
// depuis capsule.izisolo.fr, l'admin devient sa propre app sur l'écran
// d'accueil, séparée de l'app studio (sessions par hôte, cf. lib/admin-host).
export const metadata = {
  title: { default: 'IziSolo Admin', template: '%s — IziSolo Admin' },
  manifest: '/manifest-admin.json',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'IziSolo Admin' },
  // `icons` REMPLACE en bloc celui du layout racine : sans l'entrée `icon`,
  // l'onglet admin retomberait sur le favicon du studio (2026-08-28).
  icons: {
    icon: [{ url: '/icons/icon-admin-192.png', type: 'image/png', sizes: '192x192' }],
    apple: '/icons/icon-admin-180.png',
  },
};

export const viewport = { themeColor: '#1a1612' };

export default async function AdminLayout({ children }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Sur l'hôte admin, « /dashboard » RELATIF est renvoyé vers /admin par le
  // proxy : tout lien/redirect vers l'app studio doit viser l'hôte principal.
  const h = await headers();
  const host = h.get('host') || '';
  const surHoteAdmin = estHoteAdmin(host);
  const proto = h.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const urlRetourApp = surHoteAdmin ? `${proto}://${hotePrincipal(host)}/dashboard` : '/dashboard';

  if (!user || !isAdminEmail(user.email)) {
    redirect(urlRetourApp);
  }

  // ── MFA TOTP : un compte admin qui a ACTIVÉ la double authentification
  // (facteur vérifié) doit présenter une session aal2 — sinon, challenge.
  // Fail-open assumé : sans facteur enrôlé (ou API en erreur), jamais bloquant.
  // Téléphone perdu : node scripts/admin-mfa-reset.mjs <email> (service_role).
  let mfaRequise = false;
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    mfaRequise = aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2';
  } catch { /* fail-open */ }
  if (mfaRequise) {
    redirect('/admin-mfa');
  }

  // Compteur de feedbacks non triés (badge nav) — jamais bloquant.
  let nbFeedbacksNew = 0;
  try {
    const { createAdminClient } = await import('@/lib/supabase-admin');
    const { count, error } = await createAdminClient()
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new');
    if (!error && count) nbFeedbacksNew = count;
  } catch { /* table absente ou env manquante : badge à 0 */ }

  // Demandes de studio en attente (badge nav, v96) — jamais bloquant.
  // Le badge compte les « nouvelle » : c'est la promesse de 48 h qui court.
  let nbDemandesNew = 0;
  try {
    const { createAdminClient } = await import('@/lib/supabase-admin');
    const { count, error } = await createAdminClient()
      .from('demandes_studio')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'nouvelle');
    if (!error && count) nbDemandesNew = count;
  } catch { /* table absente (pré-v96) : badge à 0 */ }

  // Fils support « à répondre » (badge nav messagerie, v87) — jamais bloquant.
  let nbSupportNonLus = 0;
  try {
    const { createAdminClient } = await import('@/lib/supabase-admin');
    const { estNonLuePourAdmin } = await import('@/lib/messagerie-support');
    const admin = createAdminClient();
    const { data: convsSupport, error } = await admin
      .from('conversations')
      .select('id, support_admin_last_read_at')
      .eq('type', 'support')
      .limit(200);
    if (!error) {
      for (const c of (convsSupport || [])) {
        const { data: dernierPro } = await admin
          .from('messages')
          .select('created_at')
          .eq('conversation_id', c.id)
          .eq('sender_type', 'pro')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (estNonLuePourAdmin(dernierPro?.created_at, c.support_admin_last_read_at)) nbSupportNonLus++;
      }
    }
  } catch { /* migration v87 absente (42703) ou env manquante : badge à 0 */ }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-logo">⚙️</span>
          <div>
            <div className="admin-brand-name">Mélutek Admin</div>
            <div className="admin-brand-sub">IziSolo</div>
          </div>
        </div>

        <nav className="admin-nav">
          <Link href="/admin" className="admin-nav-item">📊 Dashboard</Link>
          <Link href="/admin/users" className="admin-nav-item">👥 Utilisateurs</Link>
          <Link href="/admin/plans" className="admin-nav-item">💳 Plans & abonnements</Link>
          <Link href="/admin/stats" className="admin-nav-item">📈 Statistiques</Link>
          <Link href="/admin/support-tickets" className="admin-nav-item">🎫 Tickets support</Link>
          <Link href="/admin/messagerie" className="admin-nav-item">
            📨 Messagerie profs
            {nbSupportNonLus > 0 && (
              <span style={{ marginLeft: '6px', background: '#4a2e10', color: '#f5b878', borderRadius: '999px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {nbSupportNonLus}
              </span>
            )}
          </Link>
          <Link href="/admin/demandes" className="admin-nav-item">
            🎁 Demandes
            {nbDemandesNew > 0 && (
              <span style={{ marginLeft: '6px', background: '#3a2e14', color: '#fbbf24', borderRadius: '999px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {nbDemandesNew}
              </span>
            )}
          </Link>
          <Link href="/admin/feedbacks" className="admin-nav-item">
            💬 Feedbacks
            {nbFeedbacksNew > 0 && (
              <span style={{ marginLeft: '6px', background: '#1e3a5f', color: '#60a5fa', borderRadius: '999px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {nbFeedbacksNew}
              </span>
            )}
          </Link>
          <Link href="/admin/erreurs" className="admin-nav-item">🚨 Erreurs</Link>
          <Link href="/admin/routines" className="admin-nav-item">
            📋 Travail récurrent
            {nbRoutinesEnRetard() > 0 && (
              <span style={{ marginLeft: '6px', background: '#3f1f1f', color: '#f87171', borderRadius: '999px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {nbRoutinesEnRetard()}
              </span>
            )}
          </Link>
          <Link href="/admin/todo" className="admin-nav-item">
            ✅ To-do
            {nbTodoHaute() > 0 && (
              <span style={{ marginLeft: '6px', background: '#3f2d1f', color: '#fb923c', borderRadius: '999px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {nbTodoHaute()}
              </span>
            )}
          </Link>
          <Link href="/admin/guides" className="admin-nav-item">📖 Guides démo</Link>
          <Link href="/admin/demo" className="admin-nav-item">🎬 Démo</Link>
          <Link href="/admin/securite" className="admin-nav-item">🔐 Sécurité</Link>
        </nav>

        <div className="admin-sidebar-footer">
          {/* <a> volontaire : l'URL peut être absolue (hôte principal) */}
          <a href={urlRetourApp} className="admin-back-app">← Retour à l'app</a>
          <div className="admin-user">{user.email}</div>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-mode-banner" role="status">
          <span className="admin-mode-icon">⚠️</span>
          <span>
            <strong>Mode Admin Mélutek</strong> — actions visibles sur la production. Connecté en tant que <strong>{user.email}</strong>.
          </span>
        </div>
        {children}
      </main>

    </div>
  );
}
