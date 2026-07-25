import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { sanitizePrefs } from '@/lib/notif-prefs';
import { reportError } from '@/lib/report';

// GET /api/profile — Récupérer le profil courant
export const GET = withRoute({ auth: 'user' }, async ({ auth }) => {
  return NextResponse.json(auth.profile);
});

// PUT /api/profile — Mettre à jour le profil
export const PUT = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { user, supabase } = auth;
  const body = await request.json();

  // Champs autorisés
  const allowed = [
    'prenom', 'nom', 'email_contact', 'telephone',
    'studio_nom', 'studio_slug', 'metier', 'adresse', 'code_postal', 'ville',
    'ui_couleur', 'types_cours', 'niveaux', 'sources', 'modes_paiement', 'vocabulaire',
    'portail_actif', 'portail_message',
    'alerte_seances_seuil', 'alerte_expiration_jours', 'alerte_paiement_attente_jours',
    'checklist_masquee', // v79 — masquage durable de la checklist de démarrage
  ];

  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }
  // Préférences de notification prof : sanitizées (jamais du JSON arbitraire).
  if (body.notif_prefs && typeof body.notif_prefs === 'object') {
    updates.notif_prefs = sanitizePrefs(body.notif_prefs, 'prof');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    reportError('[profile PUT] update err:', error);
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 400 });
  }

  return NextResponse.json(data);
});
