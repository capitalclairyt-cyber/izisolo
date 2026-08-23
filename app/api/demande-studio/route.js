import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { checkAntiBot, ipFromRequest } from '@/lib/antibot';
import { sendEmail } from '@/lib/email';
import { reportError } from '@/lib/report';
import {
  sanitizeDemande, cequiManque, renderEmailAccuse, renderEmailInterne,
} from '@/lib/demande-studio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_EQUIPE = 'bonjour@izisolo.fr';

/**
 * POST /api/demande-studio — le guichet public « on crée ton studio » (v96).
 *
 * Route PUBLIQUE : antibot d'abord (honeypot + rate limit IP), puis
 * enregistrement via le client admin (la table est service_role only, personne
 * ne doit pouvoir lire les coordonnées des autres), puis DEUX emails :
 * l'accusé de réception qui réclame ce qui manque, et l'alerte interne.
 *
 * L'ordre compte : la demande est ENREGISTRÉE avant les emails. Un envoi qui
 * échoue ne doit jamais faire perdre une prospecte — c'est le seul contenu
 * irremplaçable de cette requête.
 */
export const POST = withRoute({ auth: 'public' }, async ({ request }) => {
  const brut = await request.json().catch(() => null);
  if (!brut) return Response.json({ error: 'Requête invalide' }, { status: 400 });

  const antibot = await checkAntiBot(request, {
    honeypot: brut.verif_hp,
    turnstileToken: brut.turnstileToken,
    max: 5,
    windowSeconds: 3600,
    scope: 'demande-studio',
  });
  if (!antibot.ok) {
    console.warn('[demande-studio] antibot:', antibot.code, 'ip=', ipFromRequest(request));
    return Response.json({ error: antibot.reason }, { status: antibot.code === 'RATE_LIMITED' ? 429 : 400 });
  }

  const { ok, erreur, valeurs } = sanitizeDemande(brut);
  if (!ok) return Response.json({ error: erreur }, { status: 400 });

  const admin = createAdminClient();
  const { data: demande, error } = await admin
    .from('demandes_studio')
    .insert(valeurs)
    .select('id')
    .single();

  if (error) {
    // Pré-v96 : la table n'existe pas encore. On ne perd pas la demande pour
    // autant — l'email interne part quand même, et il contient TOUT ce qu'il
    // faut pour créer le studio à la main.
    reportError('[demande-studio] insert:', error, { route: '/api/demande-studio' });
    const interne = renderEmailInterne(valeurs);
    await sendEmail({
      to: EMAIL_EQUIPE,
      subject: `${interne.subject} (⚠ non enregistrée)`,
      html: interne.html,
      replyTo: valeurs.email,
      categorie: 'transactionnel',
    });
  } else {
    const interne = renderEmailInterne(valeurs);
    await sendEmail({
      to: EMAIL_EQUIPE,
      subject: interne.subject,
      html: interne.html,
      replyTo: valeurs.email,     // répondre = écrire directement à la prospecte
      categorie: 'transactionnel',
    });
  }

  // L'accusé qui réclame le planning, les tarifs et (sans obligation) la liste
  // d'élèves. C'est LE canal par lequel arrivent les données sensibles : une
  // réponse à un email, jamais un dépôt sur une page publique.
  const accuse = renderEmailAccuse({
    prenom: valeurs.prenom,
    studioNom: valeurs.studio_nom,
    manque: cequiManque(valeurs),
  });
  const envoi = await sendEmail({
    to: valeurs.email,
    subject: accuse.subject,
    html: accuse.html,
    replyTo: EMAIL_EQUIPE,
    categorie: 'transactionnel',
  });

  return Response.json({
    ok: true,
    id: demande?.id || null,
    // L'écran de confirmation ne promet un email que s'il est vraiment parti.
    emailEnvoye: envoi?.ok === true,
  });
});
