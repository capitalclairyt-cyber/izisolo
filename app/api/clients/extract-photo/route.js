import { requireAuth } from '@/lib/api-auth';
import { effectivePlan } from '@/lib/plan-guard';
import { askClaude } from '@/lib/claude';
import { z } from 'zod';

export const runtime = 'nodejs';

/**
 * POST /api/clients/extract-photo
 *
 * Lit une photo (carte de visite, fiche papier, capture, note manuscrite) et
 * en extrait les coordonnées d'UN contact pour pré-remplir le formulaire
 * "nouveau client". La prof revoit/corrige TOUJOURS avant d'enregistrer.
 *
 * - Réservé Pro+ (l'essai 14j = plan 'pro' → les nouvelles utilisatrices y ont accès).
 * - L'image est traitée puis JETÉE (jamais stockée).
 * - Réutilise le SDK Anthropic déjà branché (lib/claude.js).
 *
 * Body : { media_type: 'image/jpeg'|'image/png'|'image/webp'|'image/gif', data: base64 }
 * Réponse : { extracted: { prenom, nom, email, telephone, notes } }
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

export async function POST(request) {
  let auth;
  try { auth = await requireAuth(); } catch (res) { return res; }
  const { profile, supabase } = auth;

  // Réservé Pro+ (essai inclus, donc dispo pour les nouvelles utilisatrices)
  const plan = effectivePlan(profile);
  if (plan !== 'pro' && plan !== 'premium') {
    return Response.json(
      { error: "L'import par photo est réservé au plan Pro." },
      { status: 403 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Extraction IA non configurée.' }, { status: 503 });
  }

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Body invalide' }, { status: 400 }); }
  const { media_type, data } = body || {};
  if (!ALLOWED_MEDIA.includes(media_type) || typeof data !== 'string' || !data) {
    return Response.json({ error: 'Image invalide (JPEG, PNG, WebP ou GIF attendu).' }, { status: 400 });
  }
  if (data.length > MAX_BASE64_LEN) {
    return Response.json({ error: 'Image trop lourde (max ~6 Mo).' }, { status: 413 });
  }

  // Garde-fous coût IA, PAR PROF (cf. migration v51) : on incrémente avant
  // d'appeler le modèle → chaque appel payant est compté.
  //   DAILY_LIMIT   : anti-abus / anti-boucle
  //   MONTHLY_LIMIT : 2 €/mois/prof au pire cas Opus 4.8 (~0,025 €/appel)
  const DAILY_LIMIT = 50;
  const MONTHLY_LIMIT = 80;
  try {
    const { data: gate, error: gateErr } = await supabase.rpc('check_and_bump_ia_usage', {
      p_feature: 'extract_photo',
      p_daily_limit: DAILY_LIMIT,
      p_monthly_limit: MONTHLY_LIMIT,
    });
    if (gateErr) {
      // Fail-open volontaire : un souci de compteur ne doit pas casser la
      // feature. Le coût d'un appel isolé est négligeable ; un plafond de
      // dépense dans la Console Anthropic reste le filet ultime à 100%.
      console.error('[extract-photo] usage gate error (fail-open):', gateErr.message);
    } else if (gate && gate.allowed === false) {
      if (gate.reason === 'monthly') {
        return Response.json(
          { error: "Tu as atteint ta limite d'import par photo pour ce mois-ci. Elle se réinitialise le 1er du mois prochain." },
          { status: 429 }
        );
      }
      return Response.json(
        { error: `Limite du jour atteinte (${DAILY_LIMIT} lectures photo). Réessaie demain.` },
        { status: 429 }
      );
    }
  } catch (e) {
    console.error('[extract-photo] usage gate exception (fail-open):', e?.message);
  }

  const systemPrompt = `Tu extrais les coordonnées d'UN seul contact (un·e élève) depuis une image fournie par une prof de yoga/pilates/bien-être : carte de visite, fiche d'inscription papier, capture d'écran d'un message, ou note manuscrite.

Réponds UNIQUEMENT par un objet JSON valide, sans aucun texte autour, avec exactement ces clés :
{ "prenom": string|null, "nom": string|null, "email": string|null, "telephone": string|null, "date_naissance": string|null, "adresse_rue": string|null, "code_postal": string|null, "ville": string|null, "notes": string|null }

Règles strictes :
- N'invente RIEN. Si une info est absente, illisible ou incertaine, mets null.
- "telephone" : format français lisible si possible (ex. "06 12 34 56 78").
- "date_naissance" : format ISO AAAA-MM-JJ. Les dates manuscrites françaises sont JJ/MM/AAAA (ex. "05/12/1990" → "1990-12-05"). null si absente ou ambiguë.
- "adresse_rue" : numéro + nom de rue uniquement (ex. "12 rue des Lilas"). "code_postal" : 5 chiffres. "ville" : nom de la ville. null pour chaque partie absente.
- "notes" : uniquement des infos utiles réellement lues (niveau, objectif, contrainte/blessure mentionnée…). Jamais une description de l'image, ni les infos déjà mises dans les autres champs. null si rien d'utile.
- S'il y a plusieurs contacts sur l'image, prends le plus visible/principal.`;

  const messages = [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type, data } },
      { type: 'text', text: 'Extrais les coordonnées du contact de cette image au format JSON demandé.' },
    ],
  }];

  let raw;
  try {
    // Opus 4.8 = meilleure lecture (manuscrit inclus). maxTokens large pour
    // laisser de la place à un éventuel "thinking" avant le JSON.
    raw = await askClaude(systemPrompt, messages, { model: 'claude-opus-4-8', maxTokens: 1500 });
  } catch (err) {
    console.error('[extract-photo] claude error:', err);
    return Response.json({ error: 'Lecture de la photo impossible pour le moment, réessaie.' }, { status: 502 });
  }

  let parsed;
  try {
    const jsonStr = String(raw).replace(/```json|```/g, '').trim();
    parsed = extractSchema.parse(JSON.parse(jsonStr));
  } catch {
    console.error('[extract-photo] parse failed, raw:', String(raw).slice(0, 200));
    return Response.json(
      { error: "Je n'ai pas réussi à lire les infos sur cette photo. Réessaie avec une image plus nette." },
      { status: 422 }
    );
  }

  // Image traitée puis jetée : on ne renvoie que les champs extraits.
  return Response.json({ extracted: parsed });
}
