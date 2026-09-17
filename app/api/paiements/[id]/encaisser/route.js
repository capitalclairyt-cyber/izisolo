import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { withRoute } from '@/lib/api-route';
import { sendPushToEmail } from '@/lib/push-server';
import { reportError } from '@/lib/report';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { envoyerFactureAuto } from '@/lib/facture-auto';
import { aujourdhuiParis } from '@/lib/urssaf';
import { validerParts, lignesEncaissement, MIN_PARTS, MAX_PARTS } from '@/lib/encaissement-parts';

const MODES = ['especes', 'cheque', 'virement', 'CB'];
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu');

/**
 * POST /api/paiements/[id]/encaisser — un paiement en attente devient réglé.
 *
 * Deux formes :
 *   - un seul moyen : { mode, date_encaissement?, notes?, numero_cheque? } ;
 *   - PLUSIEURS moyens (2026-09-14, deux chèques de Marie-Pierre) :
 *     { parts: [{ montant, mode, numero_cheque?, date_encaissement? }, …],
 *       notes? } → la ligne d'origine devient la part n°1 (même id), les
 *     autres sont des lignes réglées neuves, sœurs par l'échéancier. La
 *     règle est PURE dans lib/encaissement-parts : un découpage qui ne fait
 *     pas le total est refusé AVANT d'écrire.
 *
 * Écriture en deux temps sans transaction (pas de migration) : les sœurs
 * d'abord, puis la ligne d'origine ; si la seconde échoue, les sœurs sont
 * retirées et la ligne reste en attente. Rien n'est jamais « à moitié ».
 */
const partSchema = z.object({
  montant: z.coerce.number().positive(),
  mode: z.enum(MODES),
  numero_cheque: z.string().trim().max(100).nullable().optional(),
  date_encaissement: DATE.optional(),
});

const encaisserSchema = z.object({
  mode: z.enum(MODES).optional(),
  date_encaissement: DATE.optional(),
  notes: z.string().trim().max(500).optional(),
  numero_cheque: z.string().trim().max(100).nullable().optional(),
  parts: z.array(partSchema).min(MIN_PARTS).max(MAX_PARTS).optional(),
}).refine(b => b.parts || b.mode, { message: 'Déclare comment l\'argent est arrivé (mode ou parts).' });

export const POST = withRoute({ auth: 'active', schema: encaisserSchema, perm: 'argent_gerer' }, async ({ params, auth, body }) => {
  const { studioId, supabase, profile } = auth;
  const { id } = params;

  const today = aujourdhuiParis();
  const { mode, date_encaissement = today, notes, numero_cheque, parts } = body;

  // Vérifier que le paiement appartient bien au profile
  const { data: paiement, error: fetchErr } = await supabase
    .from('paiements')
    .select('id, statut, profile_id, notes, client_id, offre_id, abonnement_id, intitule, type, montant, date, echeancier_id')
    .eq('id', id)
    .eq('profile_id', studioId)
    .single();

  if (fetchErr || !paiement) {
    return Response.json({ error: 'Paiement introuvable' }, { status: 404 });
  }

  if (paiement.statut === 'paid') {
    return Response.json({ error: 'Paiement déjà marqué comme payé' }, { status: 409 });
  }

  let idsRegles = [id];
  let lignes = null;

  if (parts) {
    // ── Plusieurs moyens : validé AVANT d'écrire, refus nommé ─────────────
    const v = validerParts(parts, paiement.montant, { aujourdhui: today });
    if (!v.ok) return Response.json({ error: v.erreur, code: 'DECOUPAGE_REFUSE' }, { status: 400 });

    const { principale, nouvelles } = lignesEncaissement(paiement, v.parts, { echeancierId: randomUUID(), notes });

    let inserees = [];
    if (nouvelles.length) {
      const { data, error: insErr } = await supabase.from('paiements').insert(nouvelles).select('*');
      if (insErr) {
        reportError('encaisser parts insert error:', insErr);
        return Response.json({ error: 'Les moyens supplémentaires n\'ont pas pu être enregistrés : rien n\'est encaissé.' }, { status: 500 });
      }
      inserees = data || [];
    }

    const { data: maj, error: updErr } = await supabase
      .from('paiements')
      .update(principale)
      .eq('id', id)
      .eq('profile_id', studioId)
      .neq('statut', 'paid')
      .select('*');
    if (updErr || !maj?.length) {
      // Compensation : la ligne d'origine n'a pas bougé, on retire les sœurs
      // pour ne laisser aucun encaissement orphelin.
      if (inserees.length) await supabase.from('paiements').delete().in('id', inserees.map(p => p.id));
      reportError('encaisser parts update error:', updErr || 'aucune ligne touchée');
      return Response.json({ error: 'Le paiement n\'a pas pu être encaissé : rien n\'est enregistré.' }, { status: 500 });
    }
    lignes = [...maj, ...inserees];
    idsRegles = lignes.map(p => p.id);
  } else {
    // ── Un seul moyen (chemin historique) ─────────────────────────────────
    const mergedNotes = notes
      ? (paiement.notes ? `${paiement.notes}\n${notes}` : notes)
      : paiement.notes;

    const { data: maj, error: updateErr } = await supabase
      .from('paiements')
      .update({
        statut: 'paid',
        mode,
        date_encaissement,
        notes: mergedNotes,
        ...(numero_cheque !== undefined && { numero_cheque }),
      })
      .eq('id', id)
      .eq('profile_id', studioId)
      .select('*');

    if (updateErr || !maj?.length) {
      reportError('encaisser error:', updateErr || 'aucune ligne touchée');
      return Response.json({ error: 'Erreur lors de l\'encaissement' }, { status: 500 });
    }
    lignes = maj;
  }

  // Facture automatique (v106) : si la prof l'a demandé, la facture de
  // chaque ligne réglée part à l'élève en pièce jointe. Après la réponse,
  // jamais bloquant — l'encaissement est déjà écrit.
  after(async () => {
    const admin = createAdminClient();
    for (const paiementId of idsRegles) {
      await envoyerFactureAuto(admin, { profileId: studioId, paiementId, profile });
    }
  });

  // Push élève « paiement enregistré » (gaté sur pref paiement ; no-op sans abo)
  if (paiement.client_id) {
    (async () => {
      const { data: cl } = await supabase.from('clients').select('email').eq('id', paiement.client_id).maybeSingle();
      if (!cl?.email) return;
      const { data: prof } = await supabase.from('profiles').select('studio_slug').eq('id', studioId).maybeSingle();
      await sendPushToEmail(cl.email, {
        title: `Paiement enregistré ✓`,
        body: `Ton règlement a bien été pris en compte par ton studio.`,
        url: prof?.studio_slug ? `/p/${prof.studio_slug}/espace` : '/',
        tag: `paiement-${id}`,
      }, { type: 'paiement', profileId: studioId });
    })().catch(() => {});
  }

  return Response.json({ ok: true, paiements: lignes });
});
