/**
 * POST /api/sms/send
 *
 * Envoie un SMS à une liste de numéros via l'API REST Twilio (sans dépendance npm).
 * Réservé aux plans activant le SMS (voir SMS_PLANS ci-dessous).
 *
 * Variables d'environnement requises dans .env.local :
 *   TWILIO_ACCOUNT_SID   → Account SID Twilio (commence par "AC…")
 *   TWILIO_AUTH_TOKEN    → Auth Token Twilio
 *   TWILIO_PHONE_NUMBER  → Numéro expéditeur au format E.164 (ex: +33756001234)
 *
 * Body JSON :
 *   {
 *     phones: [{ telephone: "0612345678", nom: "Jean Dupont" }],
 *     message: "Votre cours est annulé."
 *   }
 *
 * Réponse :
 *   { sent: number, failed: number, errors: string[] }
 */

import { createServerClient } from '@/lib/supabase-server';
import { SMS_ENABLED } from '@/lib/constantes';

// Plans autorisés à envoyer des SMS. `free` inclus pour comptes internes
// (Colin, Maude — exemptés full access). `studio` retiré (obsolète).
const SMS_PLANS = ['pro', 'premium', 'free'];

// Normalise un numéro FR vers le format E.164 (+33XXXXXXXXX)
function normalizePhone(telephone) {
  const raw = telephone.replace(/[\s.\-()]/g, '');
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('0033')) return '+33' + raw.slice(4);
  if (raw.startsWith('00')) return '+' + raw.slice(2);
  if (raw.startsWith('0')) return '+33' + raw.slice(1);
  return raw; // déjà normalisé ou numéro international sans indicatif
}

export async function POST(request) {
  // 0. Kill-switch global : SMS désactivés temporairement (cf. constantes.js)
  if (!SMS_ENABLED) {
    return Response.json(
      { error: 'L\'envoi SMS est temporairement désactivé. Active-toi prochainement.' },
      { status: 503 }
    );
  }

  // 1. Authentification
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // 2. Vérification du plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  if (!SMS_PLANS.includes(profile?.plan)) {
    return Response.json(
      { error: `L'envoi SMS nécessite un plan Pro ou supérieur. Plan actuel : "${profile?.plan || 'inconnu'}".` },
      { status: 403 }
    );
  }

  // 3. Vérification des variables d'environnement Twilio
  const accountSid  = process.env.TWILIO_ACCOUNT_SID;
  const authToken   = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone   = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    return Response.json(
      { error: 'SMS non configuré. Ajoutez TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_PHONE_NUMBER dans .env.local.' },
      { status: 500 }
    );
  }

  // 4. Parse du body
  let phones, message;
  try {
    ({ phones, message } = await request.json());
  } catch {
    return Response.json({ error: 'Body JSON invalide' }, { status: 400 });
  }

  if (!Array.isArray(phones) || phones.length === 0 || !message?.trim()) {
    return Response.json({ error: 'Paramètres manquants (phones, message)' }, { status: 400 });
  }

  // 5. Envoi via l'API REST Twilio (sans twilio npm — simple fetch)
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const results = { sent: 0, failed: 0, errors: [] };

  for (const { telephone, nom } of phones) {
    try {
      const to = normalizePhone(telephone);

      const res = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type':  'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To:   to,
          From: fromPhone,
          Body: message,
        }),
      });

      if (res.ok) {
        results.sent++;
      } else {
        const err = await res.json().catch(() => ({}));
        results.failed++;
        results.errors.push(`${nom} (${to}) : ${err.message || err.code || res.status}`);
      }
    } catch (err) {
      results.failed++;
      results.errors.push(`${nom} : ${err.message}`);
    }
  }

  return Response.json(results);
}
