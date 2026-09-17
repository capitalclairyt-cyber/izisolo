// auth:'active' : feature payante (IA) → bloquée si compte gelé (402)
import { withRoute } from '@/lib/api-route';
import { can } from '@/lib/plan-guard';
import { askClaude } from '@/lib/claude';
import { z } from 'zod';
import { reportError } from '@/lib/report';
import {
  MAX_LIGNES_PHOTO,
  MAX_TOKENS_LISTE,
  promptListe,
  sanitizeLignesPhoto,
  lignesVersRows,
} from '@/lib/import-photo';

export const runtime = 'nodejs';

/**
 * POST /api/clients/extract-photo
 *
 * Deux modes, une seule porte (mêmes gardes : plan, compte gelé, format et
 * poids de l'image, plafonds de coût) :
 *
 *   mode 'fiche' (défaut) — lit UNE personne : carte de visite, fiche
 *     d'inscription, capture d'un message, note manuscrite. Préremplit le
 *     formulaire « nouveau client ».
 *   mode 'liste'  (2026-09-17) — lit une LISTE de personnes : listing papier
 *     d'une association, cahier d'inscriptions, tableau imprimé. Rend les
 *     lignes au format de `parseCSV`, donc l'écran d'import les reprend tel
 *     quel : correspondance des colonnes, relecture, dédup par email.
 *     Né du montage d'Atout Gym : Maude avait le listing papier de
 *     l'association, et trente élèves demandaient trente photos.
 *
 * - Réservé Complet (l'essai 30 j = le plan de la structure → les nouvelles
 *   utilisatrices y ont accès).
 * - L'image est traitée puis JETÉE (jamais stockée).
 * - La prof revoit et corrige TOUJOURS avant d'enregistrer. C'est vrai pour
 *   une fiche, c'est vital pour une liste : trente lignes mal lues qui
 *   entreraient en base sans relecture, ce sont trente fiches à reprendre.
 *
 * Body : { media_type: 'image/jpeg'|'image/png'|'image/webp'|'image/gif',
 *          data: base64, mode?: 'fiche'|'liste' }
 * Réponse fiche : { extracted: { prenom, nom, email, telephone, … } }
 * Réponse liste : { rows: [[en-têtes], …], lignes: [...], ignorees, tronque }
 */

export const dynamic = 'force-dynamic';

const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BASE64_LEN = 8_000_000; // ~6 Mo d'image (base64 ≈ 1.33× les octets)

const extractSchema = z.object({
  prenom: z.string().max(120).nullable().optional(),
  nom: z.string().max(120).nullable().optional(),
  email: z.string().max(254).nullable().optional(),
  telephone: z.string().max(40).nullable().optional(),
  date_naissance: z.string().max(10).nullable().optional(), // ISO AAAA-MM-JJ
  adresse_rue: z.string().max(200).nullable().optional(),
  code_postal: z.string().max(10).nullable().optional(),
  ville: z.string().max(120).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

/**
 * Garde-fous coût IA, PAR PROF (migration v51). Deux compteurs SÉPARÉS :
 * une lecture de liste, c'est une grande image et une sortie longue, donc
 * plusieurs fois le prix d'une fiche. Les mélanger rendrait le plafond en
 * euros faux, et refuserait une liste à qui n'a fait que des fiches.
 *   fiche : 2 €/mois au pire cas Opus (~0,025 €/appel)
 *   liste : ~0,15 €/appel, donc 20/mois = ~3 € au pire. Une prof importe son
 *           listing une fois dans sa vie, pas tous les jours ; 10/jour laisse
 *           passer un listing de dix pages.
 */
const QUOTAS = {
  fiche: { feature: 'extract_photo', jour: 50, mois: 80 },
  liste: { feature: 'extract_liste', jour: 10, mois: 20 },
};

const PROMPT_FICHE = `Tu extrais les coordonnées d'UN seul contact (un·e élève) depuis une image fournie par une prof de yoga/pilates/bien-être : carte de visite, fiche d'inscription papier, capture d'écran d'un message, ou note manuscrite.

Réponds UNIQUEMENT par un objet JSON valide, sans aucun texte autour, avec exactement ces clés :
{ "prenom": string|null, "nom": string|null, "email": string|null, "telephone": string|null, "date_naissance": string|null, "adresse_rue": string|null, "code_postal": string|null, "ville": string|null, "notes": string|null }

Règles strictes :
- N'invente RIEN. Si une info est absente, illisible ou incertaine, mets null.
- "telephone" : format français lisible si possible (ex. "06 12 34 56 78").
- "date_naissance" : format ISO AAAA-MM-JJ. Les dates manuscrites françaises sont JJ/MM/AAAA (ex. "05/12/1990" → "1990-12-05"). null si absente ou ambiguë.
- "adresse_rue" : numéro + nom de rue uniquement (ex. "12 rue des Lilas"). "code_postal" : 5 chiffres. "ville" : nom de la ville. null pour chaque partie absente.
- "notes" : uniquement des infos utiles réellement lues (niveau, objectif, contrainte/blessure mentionnée…). Jamais une description de l'image, ni les infos déjà mises dans les autres champs. null si rien d'utile.
- S'il y a plusieurs contacts sur l'image, prends le plus visible/principal.`;

export const POST = withRoute({ auth: 'active', perm: 'eleves_gerer' }, async ({ request, auth }) => {
  const { profile, supabase } = auth;

  // Capacité Complet (essai inclus, donc dispo pour les nouvelles utilisatrices)
  if (!can(profile, 'photo_import')) {
    return Response.json(
      { error: "L'import par photo est réservé au plan Complet." },
      { status: 403 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Extraction IA non configurée.' }, { status: 503 });
  }

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Body invalide' }, { status: 400 }); }
  const { media_type, data } = body || {};
  // Un mode inconnu retombe sur 'fiche' : on ne refuse jamais une lecture
  // pour une faute de frappe, on rend simplement le comportement d'avant.
  const mode = body?.mode === 'liste' ? 'liste' : 'fiche';
  if (!ALLOWED_MEDIA.includes(media_type) || typeof data !== 'string' || !data) {
    return Response.json({ error: 'Image invalide (JPEG, PNG, WebP ou GIF attendu).' }, { status: 400 });
  }
  if (data.length > MAX_BASE64_LEN) {
    return Response.json({ error: 'Image trop lourde (max ~6 Mo).' }, { status: 413 });
  }

  // On incrémente AVANT d'appeler le modèle → chaque appel payant est compté.
  const quota = QUOTAS[mode];
  try {
    const { data: gate, error: gateErr } = await supabase.rpc('check_and_bump_ia_usage', {
      p_feature: quota.feature,
      p_daily_limit: quota.jour,
      p_monthly_limit: quota.mois,
    });
    if (gateErr) {
      // Fail-open volontaire : un souci de compteur ne doit pas casser la
      // feature. Le coût d'un appel isolé est négligeable ; un plafond de
      // dépense dans la Console Anthropic reste le filet ultime à 100%.
      reportError('[extract-photo] usage gate error (fail-open):', gateErr.message);
    } else if (gate && gate.allowed === false) {
      const quoi = mode === 'liste' ? 'lecture de liste' : 'import par photo';
      if (gate.reason === 'monthly') {
        return Response.json(
          { error: `Tu as atteint ta limite de ${quoi} pour ce mois-ci. Elle se réinitialise le 1er du mois prochain.` },
          { status: 429 }
        );
      }
      return Response.json(
        { error: `Limite du jour atteinte (${quota.jour} lectures). Réessaie demain.` },
        { status: 429 }
      );
    }
  } catch (e) {
    reportError('[extract-photo] usage gate exception (fail-open):', e?.message);
  }

  const systemPrompt = mode === 'liste' ? promptListe(MAX_LIGNES_PHOTO) : PROMPT_FICHE;
  const consigne = mode === 'liste'
    ? 'Lis toutes les personnes de cette liste au format JSON demandé.'
    : 'Extrais les coordonnées du contact de cette image au format JSON demandé.';

  const messages = [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type, data } },
      { type: 'text', text: consigne },
    ],
  }];

  let raw;
  try {
    // Opus 4.8 = meilleure lecture (manuscrit inclus). maxTokens large pour
    // laisser de la place à un éventuel "thinking" avant le JSON — et, en
    // mode liste, à une soixantaine de lignes.
    raw = await askClaude(systemPrompt, messages, {
      model: 'claude-opus-4-8',
      maxTokens: mode === 'liste' ? MAX_TOKENS_LISTE : 1500,
    });
  } catch (err) {
    reportError('[extract-photo] claude error:', err);
    return Response.json({ error: 'Lecture de la photo impossible pour le moment, réessaie.' }, { status: 502 });
  }

  const jsonStr = String(raw).replace(/```json|```/g, '').trim();

  if (mode === 'liste') {
    let brut;
    try {
      brut = JSON.parse(jsonStr);
    } catch {
      reportError('[extract-photo] parse liste failed, raw:', jsonStr.slice(0, 200));
      return Response.json(
        { error: "Je n'ai pas réussi à lire cette liste. Réessaie avec une photo plus nette, ou photographie-la en deux fois si elle est longue." },
        { status: 422 }
      );
    }
    const { lignes, ignorees, tronque } = sanitizeLignesPhoto(brut);
    if (lignes.length === 0) {
      return Response.json(
        { error: "Je n'ai trouvé aucune personne sur cette photo. Cadre la liste entière, bien à plat et bien éclairée." },
        { status: 422 }
      );
    }
    // `rows` est exactement ce que rend parseCSV : l'écran d'import n'a rien
    // à savoir de la photo.
    return Response.json({ rows: lignesVersRows(lignes), lignes, ignorees, tronque });
  }

  let parsed;
  try {
    parsed = extractSchema.parse(JSON.parse(jsonStr));
  } catch {
    reportError('[extract-photo] parse failed, raw:', jsonStr.slice(0, 200));
    return Response.json(
      { error: "Je n'ai pas réussi à lire les infos sur cette photo. Réessaie avec une image plus nette." },
      { status: 422 }
    );
  }

  // Image traitée puis jetée : on ne renvoie que les champs extraits.
  return Response.json({ extracted: parsed });
});
