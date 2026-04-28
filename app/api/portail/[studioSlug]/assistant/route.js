import { createServerClient } from '@/lib/supabase-server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Assistant IA pour aider les élèves à choisir un cours.
 * Reçoit l'historique du chat + les cours disponibles, retourne une réponse.
 *
 * Pour MVP : pas de tool calling (réservation manuelle après lecture des suggestions).
 * Le contexte (élève, planning) est injecté côté serveur dans le prompt système.
 */

export async function POST(request, { params }) {
  const { studioSlug } = await params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Assistant non disponible (clé API manquante).' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body JSON invalide' }, { status: 400 });
  }
  const { messages = [] } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Aucun message' }, { status: 400 });
  }

  // Auth (optionnel — on peut tourner aussi pour les visiteurs anonymes)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Studio + planning à venir (14 jours)
  const today = new Date().toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, metier, ville, regles_annulation')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, type_cours, date, heure, duree_minutes, lieu, capacite_max, format')
    .eq('profile_id', profile.id)
    .eq('est_annule', false)
    .gte('date', today)
    .lte('date', in14)
    .order('date')
    .order('heure');

  // Compter inscrits par cours
  const { data: presences } = await supabaseAdmin
    .from('presences')
    .select('cours_id')
    .in('cours_id', (cours || []).map(c => c.id));
  const counts = {};
  (presences || []).forEach(p => { counts[p.cours_id] = (counts[p.cours_id] || 0) + 1; });

  // Prénom élève si connecté
  let prenom = null;
  if (user) {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('prenom')
      .eq('profile_id', profile.id)
      .ilike('email', user.email)
      .maybeSingle();
    prenom = client?.prenom || null;
  }

  const coursContexte = (cours || []).map(c => ({
    id: c.id,
    nom: c.nom,
    type: c.type_cours,
    date: new Date(c.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    heure: c.heure ? c.heure.slice(0, 5) : '',
    duree: c.duree_minutes,
    lieu: c.lieu,
    format: c.format || 'presentiel',
    places_restantes: c.capacite_max ? Math.max(0, c.capacite_max - (counts[c.id] || 0)) : null,
    url: `/p/${studioSlug}/cours/${c.id}`,
  }));

  const delaiH = profile?.regles_annulation?.delai_heures || 24;

  const systemPrompt = `Tu es l'assistant de réservation du studio "${profile.studio_nom}" (${profile.metier || 'bien-être'}${profile.ville ? `, ${profile.ville}` : ''}).
Tu aides les élèves à choisir et réserver un cours dans les 14 prochains jours.

Ton ton : chaleureux, bref, jamais commercial. Style "yoga teacher friendly", pas "vendeur".
${prenom ? `Tu parles à ${prenom}.` : 'Tu parles à un·e visiteur·euse anonyme.'}

Règles :
- Suggère 1 à 3 cours pertinents en réponse à la demande, jamais plus.
- Donne pour chaque cours suggéré : nom + jour/heure + lieu + places restantes (si limité).
- À chaque suggestion, donne un lien Markdown vers la fiche cours pour réserver, format : [Nom du cours](url).
- Si aucun cours ne correspond, dis-le honnêtement et propose des alternatives ou de revenir plus tard.
- Politique d'annulation : annulation libre jusqu'à ${delaiH}h avant le cours, sinon la séance est décomptée.
- Maximum 4 phrases par réponse.

Cours disponibles (JSON) :
${JSON.stringify(coursContexte, null, 2)}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: messages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 1000),
      })),
    });

    const text = response.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');

    return Response.json({ message: text });
  } catch (err) {
    console.error('[assistant] error:', err);
    return Response.json({ error: 'Assistant temporairement indisponible.' }, { status: 500 });
  }
}
