import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';
import { dateComptable, filtreDateComptable, montantFr } from '@/lib/urssaf';
import { normaliserMode, labelMode } from '@/lib/modes-paiement';
import { CATEGORIES_DEPENSE, totauxDepenses, exerciceParId, exerciceDe, debutExerciceDefaut, tvaDe } from '@/lib/depenses';
import { typeStructure } from '@/lib/structure';

/**
 * /api/export/compta-csv?exercice=2025-2026|2026 — l'export d'EXERCICE d'une
 * structure (v112, lot 2 Associations & Studios, §5.1 « export du trésorier
 * par saison »). Un seul fichier pour le rapport financier de l'AG ou pour le
 * comptable : les RECETTES (encaissements, base trésorerie v93), les DÉPENSES,
 * un récapitulatif par catégorie et le RÉSULTAT. Plan `depenses`, permission
 * `argent_voir`. Séparateur ';', décimale ',', BOM : Excel FR.
 */
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@\t]/.test(str) && !/^-?\d+(?:[.,]\d+)?$/.test(str)) str = `'${str}`;
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
const ligne = (cells) => cells.map(csvEscape).join(';');
const fmtJour = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];

export const GET = withRoute({ auth: 'user', plan: 'depenses', perm: 'argent_voir' }, async ({ request, auth }) => {
  const { studioId, supabase, profile } = auth;
  const url = new URL(request.url);
  const debutMois = debutExerciceDefaut(typeStructure(profile));
  const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const exercice = exerciceParId(url.searchParams.get('exercice'), debutMois) || exerciceDe(aujourdhui, debutMois);
  if (!exercice) return Response.json({ error: 'Exercice invalide' }, { status: 400 });

  // Recettes : encaissements réglés, bornés en trésorerie (coalesce v93), paginés.
  const recettes = [];
  for (let page = 0; page < 20; page++) {
    const { data: lot, error } = await supabase
      .from('paiements')
      .select('id, date, date_encaissement, intitule, type, montant, mode, commission_montant, clients(prenom, nom, nom_structure)')
      .eq('profile_id', studioId)
      .eq('statut', 'paid')
      .or(filtreDateComptable(exercice.from, exercice.to))
      .order('date', { ascending: true }).order('id', { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error) { reportError('[compta-csv] paiements', error, { route: '/api/export/compta-csv' }); return Response.json({ error: 'Export impossible' }, { status: 500 }); }
    recettes.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }
  recettes.sort((a, b) => (dateComptable(a) || '').localeCompare(dateComptable(b) || ''));

  // Dépenses : sans v112, l'export sort quand même, avec un bloc vide qui le dit.
  let depenses = [];
  let depensesIndisponibles = false;
  for (let page = 0; page < 10; page++) {
    const { data: lot, error } = await supabase
      .from('depenses')
      .select('id, date, categorie, libelle, montant_ttc, montant_ht, tva_taux, fournisseur, statut, date_reglement, mode_reglement, justificatif_url')
      .eq('profile_id', studioId)
      .gte('date', exercice.from).lte('date', exercice.to)
      .order('date', { ascending: true }).order('created_at', { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error) { depensesIndisponibles = ABSENT.includes(error.code); if (!depensesIndisponibles) reportError('[compta-csv] dépenses', error, { route: '/api/export/compta-csv' }); break; }
    depenses.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }

  const totalRecettes = Math.round(recettes.reduce((s, p) => s + (Number(p.montant) || 0), 0) * 100) / 100;
  const tD = totauxDepenses(depenses);
  const resultat = Math.round((totalRecettes - tD.ttc) * 100) / 100;

  const lignes = [];
  lignes.push(ligne([`${profile?.studio_nom || 'Structure'} · ${exercice.label} (du ${fmtJour(exercice.from)} au ${fmtJour(exercice.to)})`]));
  lignes.push('');
  lignes.push(ligne(['RECETTES']));
  lignes.push(ligne(['Date encaissement', 'Élève / tiers', 'Intitulé', 'Mode', 'Montant TTC']));
  for (const p of recettes) {
    const qui = p.clients?.nom_structure || [p.clients?.prenom, p.clients?.nom].filter(Boolean).join(' ') || '';
    lignes.push(ligne([fmtJour(dateComptable(p)), qui, p.intitule || '', labelMode(normaliserMode(p.mode)), montantFr(p.montant)]));
  }
  lignes.push(ligne(['', '', '', 'TOTAL RECETTES', montantFr(totalRecettes)]));
  lignes.push('');
  lignes.push(ligne(['DÉPENSES']));
  lignes.push(ligne(['Date', 'Catégorie', 'Libellé', 'Fournisseur', 'Montant TTC', 'Montant HT', 'TVA', 'Statut', 'Réglée le', 'Mode', 'Justificatif']));
  for (const d of depenses) {
    lignes.push(ligne([
      fmtJour(d.date), CATEGORIES_DEPENSE[d.categorie]?.label || d.categorie, d.libelle, d.fournisseur || '',
      montantFr(d.montant_ttc), d.montant_ht != null ? montantFr(d.montant_ht) : '', tvaDe(d) != null ? montantFr(tvaDe(d)) : '',
      d.statut === 'a_regler' ? 'À régler' : 'Réglée', fmtJour(d.date_reglement), d.mode_reglement || '', d.justificatif_url || '',
    ]));
  }
  if (depensesIndisponibles) lignes.push(ligne(['(dépenses indisponibles : mise à jour v112 non appliquée)']));
  lignes.push(ligne(['', '', '', 'TOTAL DÉPENSES', montantFr(tD.ttc), '', montantFr(tD.tva)]));
  lignes.push('');
  lignes.push(ligne(['RÉCAPITULATIF']));
  lignes.push(ligne(['Recettes encaissées', montantFr(totalRecettes)]));
  lignes.push(ligne(['Dépenses (TTC)', montantFr(tD.ttc)]));
  lignes.push(ligne(['dont réglées', montantFr(tD.reglees)]));
  lignes.push(ligne(['dont à régler', montantFr(tD.a_regler)]));
  lignes.push(ligne(['RÉSULTAT', montantFr(resultat)]));
  lignes.push('');
  lignes.push(ligne(['Dépenses par catégorie']));
  for (const [cat, m] of Object.entries(tD.parCategorie).sort((a, b) => b[1] - a[1])) {
    lignes.push(ligne([CATEGORIES_DEPENSE[cat]?.label || cat, montantFr(m)]));
  }
  lignes.push('');
  lignes.push(ligne([`Généré par IziSolo le ${fmtJour(aujourdhui)}. Recettes = encaissements réglés, à la date d'encaissement.`]));

  const csv = '﻿' + lignes.join('\r\n');
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="compta-${exercice.id}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
