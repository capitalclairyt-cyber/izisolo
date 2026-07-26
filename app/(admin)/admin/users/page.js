import { createAdminClient } from '@/lib/supabase-admin';
import AdminUsersClient from './AdminUsersClient';
import { fetchAllRows, countParProfil, enrichirProfil } from '@/lib/admin-stats';

async function getUsers(supabase) {
  // ⚠️ Pas de colonne email sur profiles (l'ancien select la demandait →
  // 42703 → la page affichait « 0 inscrits » depuis toujours). L'email vit
  // dans auth.users : on fusionne les deux sources par id.
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, prenom, studio_nom, studio_slug, plan, metier, created_at, updated_at, trial_started_at, stripe_subscription_status')
    .order('created_at', { ascending: false });

  if (error) console.error('getUsers error:', error);

  const emailById = {};
  const lastSignInById = {};
  let authUsers = [];
  try {
    const { data: page } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    authUsers = page?.users || [];
    for (const u of authUsers) {
      emailById[u.id] = u.email;
      lastSignInById[u.id] = u.last_sign_in_at || null;
    }
  } catch (e) {
    console.error('getUsers listUsers error:', e?.message);
  }

  // Activité par compte — lectures PAGINÉES (jamais tronquées à 1000 en silence)
  const trenteJours = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [clientsRows, coursRows, paiementsRows] = await Promise.all([
    // email + prenom : servent aussi à affilier les COMPTES ÉLÈVES aux studios
    fetchAllRows(supabase, 'clients', 'profile_id, email, prenom'),
    fetchAllRows(supabase, 'cours', 'profile_id'),
    fetchAllRows(supabase, 'paiements', 'profile_id, date, statut'),
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

  const profs = (users || []).map(p => enrichirProfil(p, emailById, lastSignInById, usage));

  // ── Comptes ÉLÈVES (demande Colin 2026-07-26) : les auth users SANS profil
  // (role=eleve depuis v57) étaient INVISIBLES dans l'admin — impossible de
  // voir à quel studio un nouveau compte ou une connexion se rattache.
  // L'affiliation = leurs fiches `clients` (email ↔ studio), le modèle du
  // brainstorm élèves (aucune FK : le lien EST l'email, en lower()).
  const profilIds = new Set((users || []).map(p => p.id));
  const nomStudioParProfil = {};
  for (const p of users || []) nomStudioParProfil[p.id] = p.studio_nom || p.prenom || 'Studio sans nom';

  const fichesParEmail = {};
  for (const c of clientsRows) {
    if (!c.email) continue;
    const k = String(c.email).toLowerCase();
    (fichesParEmail[k] = fichesParEmail[k] || []).push(c);
  }

  const comptesEleves = authUsers
    .filter(u => !profilIds.has(u.id))
    .map(u => {
      const fiches = fichesParEmail[String(u.email || '').toLowerCase()] || [];
      const studios = [...new Set(fiches.map(f => f.profile_id))]
        .filter(id => profilIds.has(id))
        .map(id => ({ id, nom: nomStudioParProfil[id] }));
      return {
        id: u.id,
        email: u.email,
        prenom: u.user_metadata?.prenom || fiches[0]?.prenom || null,
        role: u.user_metadata?.role || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        studios,
      };
    })
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  return { profs, comptesEleves };
}

export default async function AdminUsersPage() {
  // Client ADMIN : liste GLOBALE des utilisateurs (le client session + RLS
  // ne renvoyait que le profil de l'admin connecté).
  const supabase = createAdminClient();
  const { profs, comptesEleves } = await getUsers(supabase);

  return <AdminUsersClient initialUsers={profs} comptesEleves={comptesEleves} />;
}
