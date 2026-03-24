import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase-server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es l'assistant support d'IziSolo, une application de gestion pour les praticien·es indépendant·es (yoga, pilates, danse, musique, coaching, etc.).

Ton rôle :
- Répondre aux questions sur l'utilisation d'IziSolo
- Aider à résoudre les problèmes courants
- Guider les utilisateurs dans les fonctionnalités

Ce que tu peux aider :
- Agenda (créer, modifier, annuler des cours)
- Gestion des élèves et abonnements
- Facturation et paiements
- Pointage et présences
- Paramètres et configuration du profil
- Types de cours et catégories
- Offres et formules

Ce que tu ne peux pas faire :
- Accéder directement aux données de l'utilisateur
- Effectuer des actions dans l'app à sa place
- Répondre à des questions sans rapport avec IziSolo

Si une demande est complexe ou nécessite une intervention humaine, invite l'utilisateur à contacter support@izisolo.fr.

Réponds toujours en français, de façon claire, concise et bienveillante. Utilise des listes courtes quand c'est utile.`;

export async function POST(request) {
  // Vérifier l'authentification
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { messages } = await request.json();
  if (!messages?.length) return new Response('Bad request', { status: 400 });

  // Limiter à 20 messages pour éviter les abus
  const recentMessages = messages.slice(-20);

  const stream = await anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: recentMessages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
