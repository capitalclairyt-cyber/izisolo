import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';
import { filtreDateComptable } from '@/lib/urssaf';
import { exerciceParId, exerciceDe, debutExerciceDefaut } from '@/lib/depenses';
import { typeStructure } from '@/lib/structure';
import { chargerIntervenantes, labelIntervenante } from '@/lib/intervenante';
import { sanitizeRemuneration } from '@/lib/remuneration';
import { analyserExercice } from '@/lib/marge';

/**
 * GET /api/compta/analyse?exercice=2026[&format=csv] — l'ANALYSE d'un
 * exercice (v114, lot 4 Associations & Studios, §5.2) : recettes, dépenses
 * et résultat par mois, par salle, par intervenante, par type de cours, la
 * TVA déductible par taux, et la marge de chaque séance. Tout est recalculé
 * à la lecture (lib/marge, PUR), rien n'est stocké. Plan `analyse_compta`
 * (Studio), permission `argent_voir`.
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];
const moisEntre = (from, to) => {
  const out = [];
  let [a, m] = from.slice(0, 7).split('-').map(Number);
  const fin = to.slice(0, 7);
  for (let i = 0; i < 24; i++) {
    const id = `${a}-${String(m).padStart(2, '0')}`;
    out.push(id);
    if (id === fin) break;
    m++; if (m > 12) { m = 1; a++; }
  }
  return out;
};
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@\t]/.test(str) && !/^-?\d+(?:[.,]\d+)?$/.test(str)) str = `'${str}`;
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
const ligne = (cells) => cells.map(csvEscape).join(';');
const fr = (n) => (n == null ? '' : String(Math.round(Number(n) * 100) / 100).replace('.', ','));

export const GET = withRoute({ auth: 'user', plan: 'analyse_compta', perm: 'argent_voir' }, async ({ request, auth }) => {
  const { studioId, supabase, profile } = auth;
  const url = new URL(request.url);
  const debutMois = debutExerciceDefaut(typeStructure(profile));
  const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const exercice = exerciceParId(url.searchParams.get('exercice'), debutMois) || exerciceDe(aujourdhui, debutMois);
  if (!exercice) return Response.json({ error: 'Exercice invalide' }, { status: 400 });
  const fin = exercice.to < aujourdhui ? exercice.to : aujourdhui;

  // Recettes encaissées (trésorerie v93), paginées.
  const paiements = [];
  for (let page = 0; page < 20; page++) {
    const { data: lot, error } = await supabase
      .from('paiements')
      .select('id, date, date_encaissement, montant, presence_id, abonnement_id, statut')
      .eq('profile_id', studioId)
      .eq('statut', 'paid')
      .or(filtreDateComptable(exercice.from, exercice.to))
      .order('id', { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error) { reportError('[compta/analyse] paiements', error, { route: '/api/compta/analyse' }); return Response.json({ error: 'Analyse impossible' }, { status: 500 }); }
    paiements.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }

  // Dépenses (v112) : sans elles, l'analyse sort quand même et le dit.
  let depenses = [];
  let depensesIndisponibles = false;
  for (let page = 0; page < 10; page++) {
    const { data: lot, error } = await supabase
      .from('depenses')
      .select('id, date, categorie, montant_ttc, montant_ht, tva_taux, membre_id, lieu_id, cours_id')
      .eq('profile_id', studioId)
      .gte('date', exercice.from).lte('date', exercice.to)
      .range(page * 1000, page * 1000 + 999);
    if (error) { depensesIndisponibles = ABSENT.includes(error.code); break; }
    depenses.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }

  // Les séances passées de l'exercice, avec leurs présences (v103 pour
  // l'intervenante : sans la colonne, on relit sans elle).
  let seances = [];
  // Deux listes écrites en toutes lettres (jamais composées par template : le
  // vérificateur de selects les rejoue contre la prod, cf. piège v105).
  const COLONNES_SANS = 'id, nom, date, heure, duree_minutes, type_cours, lieu_id, est_annule, presences(id, statut_pointage, pointee, annulation_tardive, abonnement_id)';
  for (let page = 0; page < 10; page++) {
    let { data: lot, error } = await supabase
      .from('cours')
      .select('id, nom, date, heure, duree_minutes, type_cours, lieu_id, est_annule, intervenant_id, presences(id, statut_pointage, pointee, annulation_tardive, abonnement_id)')
      .eq('profile_id', studioId)
      .gte('date', exercice.from).lte('date', fin)
      .order('date', { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error && ABSENT.includes(error.code)) {
      ({ data: lot, error } = await supabase.from('cours').select(COLONNES_SANS).eq('profile_id', studioId).gte('date', exercice.from).lte('date', fin).order('date', { ascending: true }).range(page * 1000, page * 1000 + 999));
    }
    if (error) { reportError('[compta/analyse] cours', error, { route: '/api/compta/analyse' }); return Response.json({ error: 'Analyse impossible' }, { status: 500 }); }
    seances.push(...(lot || []).filter(c => !c.est_annule));
    if (!lot || lot.length < 1000) break;
  }

  // Le paiement RÉGLÉ d'une présence (séance à l'unité) et le prix des carnets.
  const montantParPresence = new Map();
  for (const p of paiements) if (p.presence_id) montantParPresence.set(p.presence_id, (montantParPresence.get(p.presence_id) || 0) + (Number(p.montant) || 0));
  const aboIds = [...new Set(seances.flatMap(c => (c.presences || []).map(p => p.abonnement_id).filter(Boolean)))];
  const abonnements = new Map();
  for (let i = 0; i < aboIds.length; i += 200) {
    const tranche = aboIds.slice(i, i + 200);
    const [{ data: abos }, { data: paies }] = await Promise.all([
      supabase.from('abonnements').select('id, seances_total').in('id', tranche),
      supabase.from('paiements').select('abonnement_id, montant, statut').eq('profile_id', studioId).in('abonnement_id', tranche),
    ]);
    const prix = new Map();
    for (const p of (paies || [])) if (p.statut === 'paid') prix.set(p.abonnement_id, (prix.get(p.abonnement_id) || 0) + (Number(p.montant) || 0));
    for (const a of (abos || [])) abonnements.set(a.id, { seances_total: a.seances_total, prix: prix.get(a.id) || 0 });
  }
  seances = seances.map(c => ({ ...c, presences: (c.presences || []).map(p => ({ ...p, paiement_montant: montantParPresence.get(p.id) || 0 })) }));

  const membresBruts = await chargerIntervenantes(supabase, studioId);
  const membres = membresBruts.map(m => ({ id: m.id, label: labelIntervenante(m), remuneration: sanitizeRemuneration(m.remuneration) }));
  const { data: lieux } = await supabase.from('lieux').select('*').eq('profile_id', studioId);

  const analyse = analyserExercice({ paiements, depenses, seances, abonnements, membres, lieux: lieux || [], mois: moisEntre(exercice.from, exercice.to) });
  if (url.searchParams.get('format') !== 'csv') {
    return Response.json({ exercice, depenses_indisponibles: depensesIndisponibles, ...analyse });
  }

  const lignes = [];
  lignes.push(ligne([`${profile?.studio_nom || 'Structure'} · analyse ${exercice.label}`]));
  lignes.push('');
  lignes.push(ligne(['TOTAUX']));
  lignes.push(ligne(['Recettes encaissées', fr(analyse.totaux.recettes)]));
  lignes.push(ligne(['Dépenses', fr(analyse.totaux.depenses)]));
  lignes.push(ligne(['Résultat', fr(analyse.totaux.resultat)]));
  lignes.push(ligne(['CA rattaché aux séances', fr(analyse.totaux.ca_rattache)]));
  lignes.push(ligne(['Recettes non rattachées à une séance', fr(analyse.totaux.non_rattache)]));
  const bloc = (titre, liste) => {
    lignes.push('');
    lignes.push(ligne([titre, 'Recettes', 'Dépenses', 'Résultat', 'Séances', 'Présentes']));
    for (const l of liste) lignes.push(ligne([l.label ?? l.id, fr(l.recettes), fr(l.depenses), fr(l.resultat), l.nb_seances, l.nb_presentes]));
  };
  bloc('PAR MOIS', analyse.par_mois);
  bloc('PAR SALLE', analyse.par_salle);
  bloc('PAR INTERVENANTE', analyse.par_intervenante);
  bloc('PAR TYPE DE COURS', analyse.par_type);
  lignes.push('');
  lignes.push(ligne(['TVA DÉDUCTIBLE', 'Taux', 'HT', 'TVA', 'TTC']));
  for (const t of analyse.tva) lignes.push(ligne(['', `${t.taux} %`, fr(t.ht), fr(t.tva), fr(t.ttc)]));
  lignes.push('');
  lignes.push(ligne(['SÉANCES', 'Date', 'Séance', 'Type', 'Présentes', 'CA', 'Coût intervenante', 'Dépenses', 'Marge']));
  for (const s of analyse.seances) lignes.push(ligne(['', s.date, s.nom, s.type_cours || '', s.nb_presentes, fr(s.ca), s.cout_intervenante == null ? '' : fr(s.cout_intervenante), fr(s.depenses), s.marge == null ? '' : fr(s.marge)]));
  const csv = '﻿' + lignes.join('\r\n');
  return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="izisolo-analyse-${exercice.id}.csv"` } });
});
