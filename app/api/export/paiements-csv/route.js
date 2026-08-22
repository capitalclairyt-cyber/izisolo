import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';
import {
  dateComptable, moisComptable, filtreDateComptable, totauxPaiements,
  periodeParId, aujourdhuiParis, montantFr,
  sanitizeConfigUrssaf, estimationCotisations, REGIMES,
} from '@/lib/urssaf';
import { normaliserMode, labelMode } from '@/lib/modes-paiement';

// Périodes « héritées » de l'écran Revenus (fenêtres glissantes). Conservées
// pour les liens/habitudes, mais l'URSSAF ne connaît QUE le calendrier civil :
// les périodes déclarables arrivent désormais par id ('T3-2026', 'M-2026-09',
// 'A-2026'), résolues par lib/urssaf.js.
const PERIODE_TO_RANGE = (periode) => {
  // Bornes en heure de PARIS (serveur UTC : « ce mois » exporté le 1er à
  // 00h30 donnait le mois précédent — B1f).
  const now = new Date(aujourdhuiParis() + 'T12:00:00');
  if (periode === 'mois') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      to:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (periode === 'dernier') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
      to:   new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
    };
  }
  if (periode === '3mois') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10),
      to:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (periode === 'annee') {
    return {
      from: `${now.getFullYear()}-01-01`,
      to:   `${now.getFullYear()}-12-31`,
    };
  }
  // 12mois par défaut
  const debut = new Date(now);
  debut.setMonth(debut.getMonth() - 12);
  return {
    from: debut.toISOString().slice(0, 10),
    to:   now.toISOString().slice(0, 10),
  };
};

const STATUT_FR = {
  paid:    'Payé',
  pending: 'En attente',
  overdue: 'En retard',
};

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Injection de formule Excel (=, +, -, @, tab) : un prénom saisi au
  // formulaire PUBLIC d'essai peut finir dans le tableur de la prof (B1f).
  // Les nombres purs (montants « -12,50 ») restent intacts.
  if (/^[=+\-@\t]/.test(str) && !/^-?\d+(?:[.,]\d+)?$/.test(str)) {
    str = `'${str}`;
  }
  // On NE quote PAS sur la virgule : le séparateur du fichier est ';' (Excel
  // FR), et la virgule est le séparateur DÉCIMAL. Quoter « 1411,00 » le
  // faisait arriver en TEXTE dans certains importeurs — donc un total qu'on
  // ne peut pas additionner, dans un document dont c'est tout l'intérêt.
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const ligne = (cells) => cells.map(csvEscape).join(';');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODES_VALIDES = ['especes', 'cheque', 'virement', 'CB'];
const STATUTS_VALIDES = ['paid', 'pending', 'overdue'];

const fmtJour = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

// plan 'export_compta' : feature Pro (gate serveur — l'UI seule était contournable)
export const GET = withRoute({ auth: 'user', plan: 'export_compta' }, async ({ request, auth }) => {
  const { user, supabase } = auth;

  const url = new URL(request.url);
  const periode = url.searchParams.get('periode') || 'mois';

  // ── Base de calcul ────────────────────────────────────────────────────────
  // 'encaissement' (défaut) : coalesce(date_encaissement, date) = l'assiette
  // de TRÉSORERIE, la seule qui vaille pour l'URSSAF. L'export filtrait
  // historiquement sur `date` (date de vente) : un chèque vendu le 28/09 et
  // déposé le 03/10 tombait dans le mauvais trimestre.
  const base = url.searchParams.get('base') === 'vente' ? 'vente' : 'encaissement';

  // Filtres validés strictement — un paramètre invalide est IGNORÉ (pas de
  // filtre silencieusement faux dans un document comptable).
  // Le filtre par mode ne peut PAS se faire en SQL : la base contient plusieurs
  // orthographes du même moyen de paiement (« Espèces » et « especes »), donc
  // un .eq() rendrait un document comptable filtré SILENCIEUSEMENT incomplet.
  // Il s'applique en JS, sur le mode normalisé. Cf. lib/modes-paiement.js.
  const filterMode = MODES_VALIDES.includes(url.searchParams.get('mode')) ? url.searchParams.get('mode') : null;
  const filterStatut = STATUTS_VALIDES.includes(url.searchParams.get('statut')) ? url.searchParams.get('statut') : null;
  // Offre : uuid = cette offre précise ; 'aucune' = paiements hors offre
  // (séance à l'unité, prestation libre). RLS scope déjà par profile_id.
  const offreParam = url.searchParams.get('offre');
  const filterOffre = offreParam === 'aucune' ? 'aucune' : (UUID_RE.test(offreParam || '') ? offreParam : null);

  // Bornes libres du/au (demande Patricia 2026-08-18 : jour, semaine,
  // trimestre… = une plage libre couvre tout) — priment sur `periode`.
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const libre = DATE_RE.test(fromParam || '') && DATE_RE.test(toParam || '') && fromParam <= toParam;

  const today = aujourdhuiParis();
  const periodeCivile = libre ? null : periodeParId(periode, today);
  const { from, to } = libre
    ? { from: fromParam, to: toParam }
    : (periodeCivile ? { from: periodeCivile.from, to: periodeCivile.to } : PERIODE_TO_RANGE(periode));

  // Paginé (B1f, rouge) : sans .range, le cap PostgREST 1000 tronquait le
  // CSV COMPTABLE en silence — en ordre ASC, ce sont les lignes les plus
  // RÉCENTES qui manquaient. Tri secondaire par id = pagination stable.
  const bruts = [];
  for (let page = 0; page < 20; page++) {
    let query = supabase
      .from('paiements')
      .select('id, date, date_encaissement, intitule, type, montant, statut, mode, notes, commission_montant, clients(prenom, nom, nom_structure)')
      .eq('profile_id', user.id)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(page * 1000, page * 1000 + 999);

    // Borne temporelle : `coalesce(date_encaissement, date)` en SQL (pas de
    // fenêtre élargie refiltrée en JS, qui serait un plafond silencieux).
    if (base === 'encaissement') query = query.or(filtreDateComptable(from, to));
    else                        query = query.gte('date', from).lte('date', to);

    if (filterStatut) query = query.eq('statut', filterStatut);
    if (filterOffre === 'aucune') query = query.is('offre_id', null);
    else if (filterOffre)         query = query.eq('offre_id', filterOffre);

    const { data: lot, error } = await query;
    if (error) {
      reportError('export csv error:', error, { route: '/api/export/paiements-csv' });
      return Response.json({ error: 'Erreur lors de la génération du CSV' }, { status: 500 });
    }
    bruts.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }

  const paiements = filterMode
    ? bruts.filter(p => normaliserMode(p.mode) === filterMode)
    : bruts;

  // Ordre CHRONOLOGIQUE sur la date qui fait foi (PostgREST ne sait pas
  // trier sur un coalesce — le tri SQL sert la pagination, celui-ci le
  // document).
  paiements.sort((a, b) => {
    const da = dateComptable(a, base) || '';
    const db = dateComptable(b, base) || '';
    return da === db ? String(a.id).localeCompare(String(b.id)) : da.localeCompare(db);
  });

  // ── Numéros de facture (v84) ──────────────────────────────────────────────
  // Défensif : si la liaison est illisible (v84 non appliquée sur un env), la
  // colonne reste vide, l'export part quand même.
  const numeroFacture = new Map();
  if (paiements.length > 0) {
    try {
      const ids = paiements.map(p => p.id);
      for (let i = 0; i < ids.length; i += 200) {
        const { data: liens, error: lienErr } = await supabase
          .from('factures_paiements')
          .select('paiement_id, factures(numero_affiche, statut)')
          .in('paiement_id', ids.slice(i, i + 200));
        if (lienErr) throw lienErr;
        for (const l of (liens || [])) {
          if (l.factures?.statut === 'emise') numeroFacture.set(l.paiement_id, l.factures.numero_affiche);
        }
      }
    } catch (e) {
      reportError('[export csv] numéros de facture illisibles:', e?.message, { route: '/api/export/paiements-csv' });
    }
  }

  // ── Profil : en-tête du récapitulatif + réglages URSSAF ───────────────────
  // Lecture SÉPARÉE et défensive (urssaf_config naît avec v93 ; la colonne
  // ne va JAMAIS dans un select principal — anti-pattern « colonnes fantômes »).
  let studio = {};
  try {
    const { data } = await supabase
      .from('profiles')
      .select('studio_nom, facturation_raison_sociale, facturation_siret')
      .eq('id', user.id)
      .single();
    studio = data || {};
  } catch { /* en-tête cosmétique : on continue sans */ }

  let configUrssaf = null;
  try {
    const { data } = await supabase.from('profiles').select('urssaf_config').eq('id', user.id).single();
    configUrssaf = sanitizeConfigUrssaf(data?.urssaf_config);
  } catch { /* pré-v93 : pas d'estimation dans le récap */ }

  const totaux = totauxPaiements(paiements, base);

  // ── Le tableau ────────────────────────────────────────────────────────────
  const headers = [
    'Mois',
    'Date encaissement',
    'Date de vente',
    'Client',
    'Intitulé',
    'Type',
    'Mode',
    'Montant',
    'Frais IziSolo',
    'Statut',
    'Facture n°',
    'Notes',
  ];

  const rows = paiements.map(p => {
    const client = p.clients;
    const clientName = client?.nom_structure
      || [client?.prenom, client?.nom].filter(Boolean).join(' ')
      || '';
    return ligne([
      moisComptable(p, base),
      p.date_encaissement || '',
      p.date || '',
      clientName,
      p.intitule || '',
      p.type || '',
      labelMode(p.mode),
      montantFr(p.montant),
      montantFr(p.commission_montant),
      STATUT_FR[p.statut] || p.statut || '',
      numeroFacture.get(p.id) || '',
      p.notes || '',
    ]);
  });

  // Ligne TOTAL collée au tableau (pas de ligne vide avant : un importeur
  // strict s'arrête au premier blanc, le total doit rester DANS le tableau).
  const ligneTotal = ligne([
    `TOTAL (${totaux.nombre} paiement${totaux.nombre > 1 ? 's' : ''})`,
    '', '', '', '', '', '',
    montantFr(totaux.brut),
    montantFr(totaux.frais),
    '', '', '',
  ]);

  // ── Le récapitulatif ──────────────────────────────────────────────────────
  // Après une ligne VIDE, volontairement : un import comptable strict s'arrête
  // là et ne récupère que le tableau, la prof voit le récap dans son tableur.
  const nomStudio = studio.facturation_raison_sociale || studio.studio_nom || '';
  const filtresLisibles = [
    filterStatut ? `état : ${STATUT_FR[filterStatut]}` : 'tous les états',
    filterMode ? `mode : ${labelMode(filterMode)}` : null,
    filterOffre === 'aucune' ? 'hors offre uniquement' : (filterOffre ? 'une offre précise' : null),
  ].filter(Boolean).join(', ');

  const recap = [
    '',
    ligne(['RÉCAPITULATIF']),
    ligne(['Studio', nomStudio]),
  ];
  if (studio.facturation_siret) recap.push(ligne(['SIRET', studio.facturation_siret]));
  recap.push(
    ligne(['Période', `du ${fmtJour(from)} au ${fmtJour(to)}${periodeCivile ? ` (${periodeCivile.label})` : ''}`]),
    ligne(['Base de calcul', base === 'encaissement'
      ? "date d'encaissement (assiette URSSAF, trésorerie)"
      : 'date de vente (facturation)']),
    ligne(['Filtres', filtresLisibles]),
    ligne(['Nombre de paiements', String(totaux.nombre)]),
    ligne(['Total encaissé (brut)', montantFr(totaux.brut)]),
    ligne(['dont frais IziSolo', montantFr(totaux.frais)]),
    '',
    ligne(["Le montant à déclarer est le BRUT payé par l'élève."]),
    ligne(['En micro-entreprise les frais ne se déduisent pas : ils sont ici pour ton information.']),
    ligne(["Les frais Stripe ne sont pas connus d'IziSolo, retrouve-les dans ton tableau de bord Stripe."]),
  );

  if (filterStatut !== 'paid') {
    recap.push(ligne(['⚠ Cet export contient des paiements non réglés : ne déclare que ce qui est encaissé.']));
  }

  if (configUrssaf && configUrssaf.regime !== 'autre' && filterStatut === 'paid') {
    const est = estimationCotisations(totaux.brut, configUrssaf);
    recap.push(
      '',
      ligne(['ESTIMATION (non contractuelle, vérifie sur urssaf.fr)']),
      ligne(['Régime', REGIMES[configUrssaf.regime].label]),
      ligne([`Cotisations ${montantFr(configUrssaf.taux_cotisations)} %`, montantFr(est.cotisations)]),
      ligne([`Formation professionnelle ${montantFr(configUrssaf.taux_cfp)} %`, montantFr(est.cfp)]),
    );
    if (est.liberatoire > 0) {
      recap.push(ligne([`Versement libératoire ${montantFr(configUrssaf.taux_liberatoire)} %`, montantFr(est.liberatoire)]));
    }
    recap.push(ligne(['Total à prévoir', montantFr(est.total)]));
  }

  const parMois = Object.entries(totaux.parMois).sort(([a], [b]) => a.localeCompare(b));
  if (parMois.length > 0) {
    recap.push('', ligne(['PAR MOIS']));
    for (const [mois, montant] of parMois) recap.push(ligne([mois, montantFr(montant)]));
  }

  const parMode = Object.entries(totaux.parMode).sort((a, b) => b[1] - a[1]);
  if (parMode.length > 0) {
    recap.push('', ligne(['PAR MODE DE RÈGLEMENT']));
    for (const [mode, montant] of parMode) recap.push(ligne([labelMode(mode), montantFr(montant)]));
  }

  // BOM UTF-8 + séparateur ';' : Excel FR (séparateur système ';') ouvrait
  // le fichier virgule en UNE colonne — l'export élèves utilisait déjà ';'
  // (B1f). Round-trip aligné.
  const csv = '﻿' + [
    headers.join(';'),
    ...rows,
    ...(paiements.length > 0 ? [ligneTotal] : []),
    ...recap,
  ].join('\r\n');

  const suffixe = periodeCivile ? periodeCivile.id : (libre ? `${from}-au-${to}` : periode);
  const filename = `izisolo-encaissements-${suffixe}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});
