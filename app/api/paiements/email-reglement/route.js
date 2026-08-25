import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { sendEmail } from '@/lib/email';
import { reportError } from '@/lib/report';
import { lireReglementConfig, referenceVirement, emailReglement } from '@/lib/reglement';

/**
 * POST /api/paiements/email-reglement — l'email « comment régler » (v98).
 *
 * Envoyé après une vente « à régler plus tard » (demande d'offre v97 ou vente
 * classique) avec le moyen CHOISI par la prof dans le tunnel : virement (RIB
 * + référence de virement), espèces ou chèque au studio. Aussi appelé par le
 * bouton « Renvoyer les infos de règlement ».
 *
 * L'email est TRANSACTIONNEL (il confirme une vente qui concerne directement
 * la destinataire), replyTo la prof. Un envoi « skipped » (domaine de test,
 * blacklist) répond ok : la vente, elle, est déjà enregistrée.
 */
const schema = z.object({
  clientId: z.string().uuid(),
  variante: z.enum(['virement', 'especes', 'cheque']),
  intitule: z.string().trim().max(160).optional(),
  montant: z.number().positive().max(100000),
  versements: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    montant: z.number().positive(),
  })).max(12).optional(),
});

export const POST = withRoute({ auth: 'active', schema }, async ({ auth, body }) => {
  const { studioId, supabase } = auth;

  const { data: client } = await supabase
    .from('clients')
    .select('id, prenom, email')
    .eq('id', body.clientId)
    .eq('profile_id', studioId)
    .single();
  if (!client) return Response.json({ error: 'Élève introuvable' }, { status: 404 });
  if (!client.email) {
    return Response.json({ error: 'Cette fiche n\'a pas d\'adresse email : rien à envoyer.' }, { status: 400 });
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('studio_nom, studio_slug, email_contact')
    .eq('id', studioId)
    .single();

  // Config v98 — requête SÉPARÉE et défensive (§12) : sans la migration, la
  // colonne est inconnue → config null → seules espèces/chèque sont possibles.
  let config = null;
  try {
    const { data: cfg, error } = await supabase
      .from('profiles').select('reglement_config').eq('id', studioId).maybeSingle();
    if (!error) config = lireReglementConfig(cfg);
  } catch { /* pré-v98 */ }

  if (body.variante === 'virement' && !config?.rib) {
    return Response.json({
      error: 'Renseigne d\'abord ton RIB : Paramètres → Profil & studio → Activité, carte « Règlement par virement ».',
    }, { status: 400 });
  }

  const message = emailReglement({
    variante: body.variante,
    studioNom: prof?.studio_nom || 'Ton studio',
    prenom: client.prenom || '',
    intitule: body.intitule || '',
    montant: body.montant,
    rib: config?.rib || null,
    reference: referenceVirement(client.id),
    versements: body.versements || [],
    studioSlug: prof?.studio_slug || null,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr',
  });
  if (!message) return Response.json({ error: 'Email impossible à composer.' }, { status: 400 });

  const res = await sendEmail({
    to: client.email,
    subject: message.subject,
    html: message.html,
    replyTo: prof?.email_contact || null,
    categorie: 'transactionnel',
  });
  if (!res.ok && !res.skipped) {
    reportError('[email-reglement] envoi KO:', res.error, { route: '/api/paiements/email-reglement' });
    return Response.json({ error: 'L\'email n\'est pas parti. Réessaie, ou envoie les infos par la messagerie.' }, { status: 502 });
  }
  return Response.json({ ok: true, skipped: res.skipped || null });
});
