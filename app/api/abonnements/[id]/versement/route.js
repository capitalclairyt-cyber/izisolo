import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';
import { createAdminClient } from '@/lib/supabase-admin';
import { envoyerFactureAuto } from '@/lib/facture-auto';
import { aujourdhuiParis } from '@/lib/urssaf';
import { planImputation, dateIsoValide } from '@/lib/encaissement-parts';

const MODES = ['especes', 'cheque', 'virement', 'CB'];
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu');

/**
 * POST /api/abonnements/[id]/versement — un versement sur un abo DÉJÀ vendu.
 *
 * Deux formes, une seule règle (2026-09-15, Marie-Pierre bis) :
 *   - `recu: false` : une ligne EN ATTENTE de plus (l'ancien « versement à
 *     venir »), mode facultatif, date = échéance ;
 *   - `recu: true` : de l'argent est ARRIVÉ (mode déclaré, jamais deviné).
 *     S'il reste des lignes en attente sur l'abo, ce versement s'y IMPUTE
 *     (lib/encaissement-parts → planImputation) : la plus ancienne d'abord,
 *     une ligne couverte devient réglée, la dernière est scindée en une part
 *     réglée (ligne neuve, sœur par l'échéancier) et un reste toujours
 *     attendu (même id, montant réduit). Sans ligne en attente, c'est une
 *     ligne réglée neuve. Un versement qui dépasse l'attendu est refusé.
 *
 * Avant : le client insérait une ligne réglée PAR-DESSUS la ligne en attente,
 * et la fiche disait « reçu 245 € · 480 € restant ». Un encart le
 * déconseillait ; personne ne lit un encart quand le bouton dit « Encaisser ».
 *
 * Pas de transaction (aucune migration) : les lignes neuves d'abord, puis les
 * mises à jour ; si une mise à jour échoue, les lignes neuves sont retirées.
 */
const schema = z.object({
  recu: z.boolean().default(true),
  montant: z.coerce.number().positive().max(100000),
  mode: z.enum(MODES).nullable().optional(),
  numero_cheque: z.string().trim().max(100).nullable().optional(),
  date: DATE.optional(),
}).refine(b => !b.recu || b.mode, { message: "Déclare comment l'argent est arrivé : espèces, chèque, virement ou CB." });

const sansSuffixe = s => String(s || '').replace(/\s*\((versement|\d+\/\d+)\)\s*$/, '').trim();

/** Facture automatique v106 sur chaque ligne réglée, après la réponse. */
function lancerFactures(studioId, profile, ids) {
  if (!ids.length) return;
  after(async () => {
    const admin = createAdminClient();
    for (const paiementId of ids) {
      await envoyerFactureAuto(admin, { profileId: studioId, paiementId, profile });
    }
  });
}

export const POST = withRoute({ auth: 'active', schema, perm: 'argent_gerer' }, async ({ params, auth, body }) => {
  const { studioId, supabase, profile } = auth;
  const { id } = params;
  const today = aujourdhuiParis();
  const date = dateIsoValide(body.date) ? body.date : today;

  const { data: abo, error: aboErr } = await supabase
    .from('abonnements')
    .select('id, client_id, offre_id, offre_nom, type, statut')
    .eq('id', id)
    .eq('profile_id', studioId)
    .single();
  if (aboErr || !abo) return Response.json({ error: 'Abonnement introuvable' }, { status: 404 });

  const { data: existants, error: payErr } = await supabase
    .from('paiements')
    .select('id, statut, montant, date, intitule, notes, echeancier_id')
    .eq('abonnement_id', abo.id)
    .eq('profile_id', studioId);
  if (payErr) {
    reportError('[abo versement] lecture paiements:', payErr, { route: '/api/abonnements/versement' });
    return Response.json({ error: 'Impossible de relire les paiements de cet abonnement.' }, { status: 500 });
  }
  const echeancierExistant = (existants || []).find(p => p.echeancier_id)?.echeancier_id || null;
  const cheque = body.mode === 'cheque' && body.numero_cheque?.trim() ? body.numero_cheque.trim() : null;

  const ligneNeuve = (montant, statut, extra = {}) => ({
    profile_id: studioId,
    client_id: abo.client_id,
    offre_id: abo.offre_id || null,
    abonnement_id: abo.id,
    echeancier_id: echeancierExistant,
    intitule: `${abo.offre_nom} (versement)`,
    type: abo.type || null,
    montant,
    statut,
    mode: body.mode || null,
    date,
    date_encaissement: statut === 'paid' ? date : null,
    numero_cheque: statut === 'paid' ? cheque : null,
    ...extra,
  });

  // ── Versement à venir : une ligne en attente de plus, comme avant ─────────
  if (!body.recu) {
    const { data, error } = await supabase.from('paiements').insert(ligneNeuve(body.montant, 'pending')).select('*');
    if (error || !data?.length) {
      reportError('[abo versement] insert pending:', error || 'aucune ligne', { route: '/api/abonnements/versement' });
      return Response.json({ error: "Le versement à venir n'a pas pu être enregistré." }, { status: 500 });
    }
    return Response.json({ ok: true, imputation: [], paiements: data });
  }

  // ── Versement reçu : imputé sur ce qui attend, sinon ligne réglée neuve ──
  const plan = planImputation(existants || [], body.montant);
  if (!plan.ok) return Response.json({ error: plan.erreur, code: 'VERSEMENT_DEPASSE' }, { status: 400 });

  if (plan.actions.length === 0) {
    const { data, error } = await supabase.from('paiements').insert(ligneNeuve(body.montant, 'paid')).select('*');
    if (error || !data?.length) {
      reportError('[abo versement] insert paid:', error || 'aucune ligne', { route: '/api/abonnements/versement' });
      return Response.json({ error: "Le versement n'a pas pu être encaissé : rien n'est enregistré." }, { status: 500 });
    }
    lancerFactures(studioId, profile, data.map(p => p.id));
    return Response.json({ ok: true, imputation: [], paiements: data });
  }

  const parId = new Map((existants || []).map(p => [p.id, p]));
  const echId = echeancierExistant || randomUUID();
  const inserees = [];
  const touchees = [];
  try {
    for (const a of plan.actions) {
      const ligne = parId.get(a.id);
      if (a.action === 'regler') {
        const { data, error } = await supabase
          .from('paiements')
          .update({ statut: 'paid', mode: body.mode, date_encaissement: date, numero_cheque: cheque, echeancier_id: ligne.echeancier_id || echId })
          .eq('id', a.id).eq('profile_id', studioId).neq('statut', 'paid')
          .select('*');
        if (error || !data?.length) throw new Error(`regler ${a.id}: ${error?.message || 'aucune ligne touchée'}`);
        touchees.push(...data);
      } else {
        // Scinder : la part reçue est une ligne NEUVE réglée ; la ligne
        // d'origine garde son id (une facture ou une présence déjà rattachée
        // reste sur elle) avec le reste toujours attendu.
        const { data: neuve, error: insErr } = await supabase
          .from('paiements')
          .insert(ligneNeuve(a.paye, 'paid', { echeancier_id: ligne.echeancier_id || echId, intitule: `${sansSuffixe(ligne.intitule) || abo.offre_nom} (versement)` }))
          .select('*');
        if (insErr || !neuve?.length) throw new Error(`insert part ${a.id}: ${insErr?.message || 'aucune ligne'}`);
        inserees.push(...neuve);
        const { data, error } = await supabase
          .from('paiements')
          .update({ montant: a.reste, echeancier_id: ligne.echeancier_id || echId })
          .eq('id', a.id).eq('profile_id', studioId).neq('statut', 'paid')
          .select('*');
        if (error || !data?.length) throw new Error(`scinder ${a.id}: ${error?.message || 'aucune ligne touchée'}`);
        touchees.push(...data);
      }
    }
  } catch (e) {
    // Compensation : les lignes neuves sont retirées ; une ligne déjà passée
    // réglée le reste (l'argent est réel) et le message invite à relire.
    if (inserees.length) await supabase.from('paiements').delete().in('id', inserees.map(p => p.id));
    reportError('[abo versement] imputation:', e, { route: '/api/abonnements/versement', aboId: abo.id });
    return Response.json({ error: "Le versement n'a pas pu être imputé entièrement : vérifie les paiements de la fiche avant de recommencer." }, { status: 500 });
  }

  const reglees = [...touchees.filter(p => p.statut === 'paid'), ...inserees];
  lancerFactures(studioId, profile, reglees.map(p => p.id));
  return Response.json({ ok: true, imputation: plan.actions, paiements: [...touchees, ...inserees] });
});
