// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — déclaration URSSAF (v93, 2026-08-22). Spec Node pure (zéro
// navigateur, zéro serveur) : fige les règles de lib/urssaf.js et
// lib/livre-recettes.js.
//
// Ce qui est verrouillé, et pourquoi :
//   • l'ASSIETTE est la trésorerie (date d'encaissement), pas la vente —
//     l'export filtrait sur `date` et rangeait les chèques dans le mauvais
//     trimestre ;
//   • `date_encaissement` NULL (paiements nés de vendre_offre avant v93)
//     retombe sur `date` : le module doit être exact AVANT la migration ;
//   • les trimestres sont CIVILS, jamais glissants ;
//   • l'échéance est le dernier jour du mois SUIVANT la fin de période ;
//   • l'estimation porte sur le BRUT (en micro, rien ne se déduit) ;
//   • les emails ne contiennent aucun tiret quadratin (règle rédaction).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  dateComptable, moisComptable, filtreDateComptable,
  echeanceDeclaration, joursEntre, periodeMois, periodeTrimestre, periodeAnnee,
  periodesDeclarables, periodeAMettreEnAvant, periodeParId,
  sanitizeConfigUrssaf, configUrssafAffichee, urssafConfigure,
  estimationCotisations, totauxPaiements, montantFr,
  rappelUrssafDuJour, renderEmailUrssaf, REGIMES,
  mentionExclusions, retirerExclus,
} from '../../lib/urssaf.js';
import {
  construireLivreRecettes, referencePiece, origineClient, livreEnCsv, libelleMois,
} from '../../lib/livre-recettes.js';
import {
  normaliserMode, labelMode, memeMode, estModeConnu, MODES_ORDRE, MODES_REGLEMENT,
} from '../../lib/modes-paiement.js';

const AUJ = '2026-08-22';

test.describe('Assiette — la date qui compte est celle de l\'encaissement', () => {
  test('encaissement prime sur la vente', () => {
    const p = { date: '2026-09-28', date_encaissement: '2026-10-03' };
    expect(dateComptable(p)).toBe('2026-10-03');
    expect(moisComptable(p)).toBe('2026-10');
  });

  test('date_encaissement NULL retombe sur la vente (paiements pré-v93)', () => {
    const p = { date: '2026-09-28', date_encaissement: null };
    expect(dateComptable(p)).toBe('2026-09-28');
    expect(moisComptable(p)).toBe('2026-09');
  });

  test('base « vente » ignore l\'encaissement (rapprochement de factures)', () => {
    const p = { date: '2026-09-28', date_encaissement: '2026-10-03' };
    expect(dateComptable(p, 'vente')).toBe('2026-09-28');
    expect(moisComptable(p, 'vente')).toBe('2026-09');
  });

  test('paiement difforme ne casse rien', () => {
    expect(dateComptable(null)).toBeNull();
    expect(moisComptable({})).toBe('');
  });

  test('le filtre SQL couvre les deux branches, sans fenêtre élargie', () => {
    const f = filtreDateComptable('2026-07-01', '2026-09-30');
    expect(f).toBe(
      'and(date_encaissement.gte.2026-07-01,date_encaissement.lte.2026-09-30),'
      + 'and(date_encaissement.is.null,date.gte.2026-07-01,date.lte.2026-09-30)'
    );
  });
});

test.describe('Périodes civiles — l\'URSSAF ne connaît que le calendrier', () => {
  test('trimestres civils, bornes exactes', () => {
    expect(periodeTrimestre(2026, 1, AUJ)).toMatchObject({ from: '2026-01-01', to: '2026-03-31' });
    expect(periodeTrimestre(2026, 2, AUJ)).toMatchObject({ from: '2026-04-01', to: '2026-06-30' });
    expect(periodeTrimestre(2026, 3, AUJ)).toMatchObject({ from: '2026-07-01', to: '2026-09-30' });
    expect(periodeTrimestre(2026, 4, AUJ)).toMatchObject({ from: '2026-10-01', to: '2026-12-31' });
  });

  test('mois civils, février non bissextile compris', () => {
    expect(periodeMois(2026, 2, AUJ)).toMatchObject({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodeMois(2024, 2, AUJ).to).toBe('2024-02-29');
    expect(periodeAnnee(2025, AUJ)).toMatchObject({ from: '2025-01-01', to: '2025-12-31' });
  });

  test('échéance = dernier jour du mois SUIVANT la fin de période', () => {
    expect(echeanceDeclaration('2026-03-31')).toBe('2026-04-30'); // T1
    expect(echeanceDeclaration('2026-06-30')).toBe('2026-07-31'); // T2
    expect(echeanceDeclaration('2026-09-30')).toBe('2026-10-31'); // T3
    expect(echeanceDeclaration('2026-12-31')).toBe('2027-01-31'); // T4 → année suivante
    expect(echeanceDeclaration('2026-09-30')).toBe(periodeTrimestre(2026, 3, AUJ).echeance);
    expect(echeanceDeclaration('bidon')).toBeNull();
  });

  test('la période en cours n\'est jamais présentée comme déclarable', () => {
    const p = periodesDeclarables({ periodicite: 'trimestrielle' }, AUJ);
    expect(p[0].id).toBe('T3-2026');
    expect(p[0].cloturee).toBe(false);       // août 2026 : T3 court encore
    expect(p[1].id).toBe('T2-2026');
    expect(p[1].cloturee).toBe(true);
    expect(periodeAMettreEnAvant({ periodicite: 'trimestrielle' }, AUJ).id).toBe('T2-2026');
  });

  test('le retour en arrière traverse les années', () => {
    const p = periodesDeclarables({ periodicite: 'trimestrielle' }, '2026-02-10', 6).map(x => x.id);
    expect(p).toEqual(['T1-2026', 'T4-2025', 'T3-2025', 'T2-2025', 'T1-2025', 'T4-2024']);
  });

  test('ids résolus, saisies douteuses refusées', () => {
    expect(periodeParId('T3-2026', AUJ)).toMatchObject({ from: '2026-07-01', to: '2026-09-30' });
    expect(periodeParId('M-2026-09', AUJ)).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
    expect(periodeParId('A-2025', AUJ)).toMatchObject({ from: '2025-01-01', to: '2025-12-31' });
    for (const mauvais of ['T5-2026', 'M-2026-13', '3mois', 'mois', '', null, 'T3-26']) {
      expect(periodeParId(mauvais, AUJ)).toBeNull();
    }
  });

  test('joursEntre compte en jours calendaires', () => {
    expect(joursEntre('2026-09-30', '2026-10-02')).toBe(2);
    expect(joursEntre('2026-10-31', '2026-10-02')).toBe(-29);
    expect(joursEntre('nope', '2026-10-02')).toBeNull();
  });
});

test.describe('Réglages — jamais crus tels quels', () => {
  test('absence de config = non configuré (aucune estimation, aucun email)', () => {
    expect(sanitizeConfigUrssaf(null)).toBeNull();
    expect(sanitizeConfigUrssaf('pas du json')).toBeNull();
    expect(sanitizeConfigUrssaf([1, 2])).toBeNull();
    expect(urssafConfigure(null)).toBe(false);
    expect(configUrssafAffichee(null).regime).toBe('micro_bnc');
  });

  test('régime et périodicité viennent d\'une liste blanche', () => {
    const c = sanitizeConfigUrssaf({ regime: 'nimportequoi', periodicite: 'hebdo' });
    expect(c.regime).toBe('micro_bnc');
    expect(c.periodicite).toBe('trimestrielle');
  });

  test('taux difforme ou hors bornes → défaut du régime, jamais NaN', () => {
    const c = sanitizeConfigUrssaf({ regime: 'micro_bic_vente', taux_cotisations: 'abc', taux_cfp: -3 });
    expect(c.taux_cotisations).toBe(REGIMES.micro_bic_vente.taux);
    expect(c.taux_cfp).toBe(REGIMES.micro_bic_vente.taux_cfp);
    expect(sanitizeConfigUrssaf({ taux_cotisations: 999 }).taux_cotisations).toBe(REGIMES.micro_bnc.taux);
    expect(sanitizeConfigUrssaf({ taux_cotisations: '24,6' }).taux_cotisations).toBe(24.6);
  });

  test('JSON en chaîne accepté, booléens stricts', () => {
    const c = sanitizeConfigUrssaf('{"versement_liberatoire":true,"rappel_email":false}');
    expect(c.versement_liberatoire).toBe(true);
    expect(c.rappel_email).toBe(false);
    expect(sanitizeConfigUrssaf({ versement_liberatoire: 'oui' }).versement_liberatoire).toBe(false);
  });
});

test.describe('Estimation — sur le BRUT, jamais sur le net', () => {
  const CFG = { regime: 'micro_bnc', taux_cotisations: 21.2, taux_cfp: 0.2 };

  test('cotisations + formation pro', () => {
    const e = estimationCotisations(1000, CFG);
    expect(e.cotisations).toBe(212);
    expect(e.cfp).toBe(2);
    expect(e.liberatoire).toBe(0);
    expect(e.total).toBe(214);
    expect(e.estimable).toBe(true);
  });

  test('versement libératoire ajouté seulement si opté', () => {
    const e = estimationCotisations(1000, { ...CFG, versement_liberatoire: true, taux_liberatoire: 2.2 });
    expect(e.liberatoire).toBe(22);
    expect(e.total).toBe(236);
  });

  test('régime « autre » : on donne le CA, pas de chiffre inventé', () => {
    const e = estimationCotisations(1000, { regime: 'autre' });
    expect(e.estimable).toBe(false);
    expect(e.total).toBe(0);
  });

  test('montant absurde ou négatif → 0, jamais NaN', () => {
    expect(estimationCotisations(-50, CFG).ca).toBe(0);
    expect(estimationCotisations('bidon', CFG).total).toBe(0);
  });

  test('les frais ne se déduisent pas du CA déclarable', () => {
    // 20 € payés par l'élève, 0,20 € de commission : on déclare 20, pas 19,80.
    const t = totauxPaiements([{ montant: 20, commission_montant: 0.2, date: '2026-07-05' }]);
    expect(t.brut).toBe(20);
    expect(t.frais).toBe(0.2);
    expect(estimationCotisations(t.brut, CFG).cotisations).toBe(4.24);
  });
});

test.describe('Modes de règlement — une écriture, un moyen de paiement', () => {
  // La prod contenait 7 orthographes pour 4 moyens : « Espèces » (46, la plus
  // fréquente) n'était reconnue par aucun écran. Tuile à 0 €, filtre d'export
  // silencieusement incomplet, récap en double.
  test('toutes les écritures rencontrées retombent sur leur clé', () => {
    expect(normaliserMode('Espèces')).toBe('especes');
    expect(normaliserMode('especes')).toBe('especes');
    expect(normaliserMode('ESPÈCES')).toBe('especes');
    expect(normaliserMode('Chèque')).toBe('cheque');
    expect(normaliserMode('cheque')).toBe('cheque');
    expect(normaliserMode('Virement')).toBe('virement');
    expect(normaliserMode('cb')).toBe('CB');
    expect(normaliserMode('Carte bancaire')).toBe('CB');
  });

  test('un mode absent se voit au lieu de disparaître', () => {
    expect(normaliserMode(null)).toBe('autre');
    expect(normaliserMode('  ')).toBe('autre');
    expect(labelMode(null)).toBe('Non précisé');
    expect(estModeConnu(null)).toBe(false);
  });

  test('un mode maison garde son identité, sans doublon de casse', () => {
    expect(normaliserMode('Lydia')).toBe(normaliserMode('LYDIA'));
    expect(labelMode('lydia')).toBe('Lydia');
    expect(estModeConnu('Lydia')).toBe(false);
  });

  test('le libellé est le même quelle que soit l\'écriture', () => {
    expect(labelMode('Espèces')).toBe(labelMode('especes'));
    expect(memeMode('Chèque', 'cheque')).toBe(true);
    expect(memeMode('CB', 'especes')).toBe(false);
  });

  test('les 4 clés du produit sont celles écrites en base', () => {
    expect(MODES_ORDRE).toEqual(['especes', 'cheque', 'virement', 'CB']);
    for (const cle of MODES_ORDRE) {
      expect(normaliserMode(cle)).toBe(cle);            // écrire la clé est stable
      expect(MODES_REGLEMENT[cle].label).toBe(labelMode(cle));
    }
  });

  test('le récap ne sort JAMAIS deux lignes pour le même moyen', () => {
    const t = totauxPaiements([
      { montant: 10, mode: 'Espèces', date: '2026-07-01' },
      { montant: 15, mode: 'especes', date: '2026-07-02' },
      { montant: 20, mode: 'Virement', date: '2026-07-03' },
      { montant: 5,  mode: 'virement', date: '2026-07-04' },
      { montant: 7,  mode: null, date: '2026-07-05' },
    ]);
    expect(Object.keys(t.parMode).sort()).toEqual(['autre', 'especes', 'virement']);
    expect(t.parMode.especes).toBe(25);
    expect(t.parMode.virement).toBe(25);
    expect(t.parMode.autre).toBe(7);
  });
});

test.describe('Totaux — une seule addition dans toute l\'app', () => {
  const PAIEMENTS = [
    { montant: 100, mode: 'especes', date: '2026-07-05', date_encaissement: '2026-07-05' },
    { montant: '50.50', mode: 'CB', date: '2026-07-28', date_encaissement: '2026-08-02', commission_montant: 0.5 },
    { montant: 20, mode: 'cheque', date: '2026-09-01', date_encaissement: null },
  ];

  test('brut, frais et ventilations', () => {
    const t = totauxPaiements(PAIEMENTS);
    expect(t.nombre).toBe(3);
    expect(t.brut).toBe(170.5);
    expect(t.frais).toBe(0.5);
    expect(t.net).toBe(170);
    expect(t.parMode).toEqual({ especes: 100, CB: 50.5, cheque: 20 });
    // Le paiement vendu en juillet mais encaissé en août bascule en août.
    expect(t.parMois).toEqual({ '2026-07': 100, '2026-08': 50.5, '2026-09': 20 });
  });

  test('en base « vente », le même paiement reste en juillet', () => {
    expect(totauxPaiements(PAIEMENTS, 'vente').parMois['2026-07']).toBe(150.5);
  });

  test('lot vide = zéros, pas de crash', () => {
    expect(totauxPaiements([]).brut).toBe(0);
    expect(totauxPaiements(null).nombre).toBe(0);
  });

  test('montantFr en format français', () => {
    expect(montantFr(1240.5)).toBe('1240,50');
    expect(montantFr('abc')).toBe('0,00');
  });
});

test.describe('Rappel d\'échéance', () => {
  const CFG = { regime: 'micro_bnc', periodicite: 'trimestrielle' };

  test('envoyé dans les 5 jours suivant la clôture', () => {
    expect(rappelUrssafDuJour(CFG, '2026-10-01').id).toBe('T3-2026');
    expect(rappelUrssafDuJour(CFG, '2026-10-05').id).toBe('T3-2026');
  });

  test('rien le jour de la clôture ni après la fenêtre', () => {
    expect(rappelUrssafDuJour(CFG, '2026-09-30')).toBeNull();
    expect(rappelUrssafDuJour(CFG, '2026-10-06')).toBeNull();
    expect(rappelUrssafDuJour(CFG, '2026-11-20')).toBeNull();
  });

  test('rien si la prof a coupé le rappel, ou n\'a rien configuré', () => {
    expect(rappelUrssafDuJour({ ...CFG, rappel_email: false }, '2026-10-01')).toBeNull();
    expect(rappelUrssafDuJour(null, '2026-10-01')).toBeNull();
  });

  test('mensuel : le rappel suit les mois', () => {
    const m = rappelUrssafDuJour({ periodicite: 'mensuelle' }, '2026-10-02');
    expect(m.id).toBe('M-2026-09');
    expect(m.echeanceLabel).toBe('31 octobre 2026');
  });
});

test.describe('Email de rappel', () => {
  const PERIODE = periodeTrimestre(2026, 3, '2026-10-01');
  const CFG = { regime: 'micro_bnc', taux_cotisations: 21.2, taux_cfp: 0.2 };

  test('le montant arrondi à l\'euro est en objet', () => {
    const { subject, html } = renderEmailUrssaf({ prenom: 'Maude', periode: PERIODE, total: 1240.49, config: CFG });
    expect(subject).toContain('1240 €');
    expect(html).toContain('1240 €');
    expect(html).toContain('1240,49');            // le montant exact reste visible
    expect(html).toContain('31 octobre 2026');    // l'échéance
  });

  test('zéro encaissé : on rappelle que déclarer reste obligatoire', () => {
    const { subject, html } = renderEmailUrssaf({ periode: PERIODE, total: 0, config: CFG });
    expect(subject).toContain('même à zéro');
    expect(html).toContain('déclarer zéro');
  });

  test('dit toujours qu\'IziSolo ne connaît que ce qui y est enregistré', () => {
    const { html } = renderEmailUrssaf({ periode: PERIODE, total: 800, config: CFG });
    expect(html).toContain('ne compte que ce qui a été enregistré dans IziSolo');
  });

  test('aucun tiret quadratin dans le texte envoyé (règle rédaction)', () => {
    for (const total of [0, 1240.49]) {
      const { subject, html } = renderEmailUrssaf({ prenom: 'Maude', periode: PERIODE, total, config: CFG });
      expect(subject).not.toContain('—');
      expect(html).not.toContain('—');
    }
  });
});

test.describe('Livre des recettes', () => {
  const PAIEMENTS = [
    { id: 'bbbbbbbb-1111-2222-3333-444444444444', montant: 20, mode: 'cheque', date: '2026-07-02', date_encaissement: '2026-08-01', intitule: 'Atelier', clients: { prenom: 'Emma', nom: 'Durand' } },
    { id: 'aaaaaaaa-1111-2222-3333-444444444444', montant: 150, mode: 'especes', date: '2026-07-05', date_encaissement: '2026-07-05', intitule: 'Carnet 10', clients: { nom_structure: 'CSE Machin' } },
  ];
  const PERIODE = periodeTrimestre(2026, 3, '2026-10-01');

  test('chronologique sur l\'encaissement, pas sur la vente', () => {
    const l = construireLivreRecettes({ paiements: PAIEMENTS, periode: PERIODE });
    expect(l.lignes.map(x => x.date)).toEqual(['2026-07-05', '2026-08-01']);
    expect(l.total).toBe(170);
    expect(l.nombre).toBe(2);
    expect(l.parMois.map(m => m.mois)).toEqual(['2026-07', '2026-08']);
  });

  test('référence = numéro de facture s\'il existe, sinon identifiant du paiement', () => {
    const numeros = new Map([['aaaaaaaa-1111-2222-3333-444444444444', 'FAC-2026-0007']]);
    const l = construireLivreRecettes({ paiements: PAIEMENTS, numeros, periode: PERIODE });
    expect(l.lignes[0].reference).toBe('FAC-2026-0007');
    expect(l.lignes[1].reference).toBe('ENC-BBBBBBBB');
    expect(referencePiece({ id: null })).toBe('ENC-?');
  });

  test('origine : la structure prime sur le nom, jamais vide', () => {
    expect(origineClient({ nom_structure: 'CSE Machin', prenom: 'Emma' })).toBe('CSE Machin');
    expect(origineClient({ prenom: 'Emma', nom: 'Durand' })).toBe('Emma Durand');
    expect(origineClient(null)).toBe('Non renseigné');
    expect(origineClient({})).toBe('Non renseigné');
  });

  test('l\'ordre est stable d\'un téléchargement à l\'autre', () => {
    const memeJour = [
      { id: 'ffffffff-0000-0000-0000-000000000000', montant: 10, date: '2026-07-05', date_encaissement: '2026-07-05' },
      { id: '11111111-0000-0000-0000-000000000000', montant: 10, date: '2026-07-05', date_encaissement: '2026-07-05' },
    ];
    const ids = () => construireLivreRecettes({ paiements: [...memeJour].reverse(), periode: PERIODE })
      .lignes.map(x => x.id);
    expect(ids()).toEqual(ids());
    expect(ids()[0].startsWith('1111')).toBe(true);
  });

  test('la version CSV porte le total et les mois', () => {
    const csv = livreEnCsv(construireLivreRecettes({ paiements: PAIEMENTS, periode: PERIODE }));
    expect(csv).toContain('Date;Référence;Origine;Nature;Mode de règlement;Montant');
    expect(csv).toContain('TOTAL (2 recettes)');
    expect(csv).toContain('170,00');
    expect(csv.startsWith('﻿')).toBe(true); // BOM : Excel FR
  });

  test('période vide = registre vide, jamais une erreur', () => {
    const l = construireLivreRecettes({ paiements: [], periode: PERIODE });
    expect(l.lignes).toEqual([]);
    expect(l.total).toBe(0);
    expect(libelleMois('2026-09')).toBe('septembre 2026');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// v95 — « Ne pas faire apparaître dans ma compta, je déclare à part »
//
// La règle non négociable : un document qui écarte des lignes DOIT dire
// lesquelles. Un registre muet sur ses exclusions se prétend complet alors
// qu'il ne l'est pas, et c'est ce mensonge-là qu'on refuse d'écrire.
// ═══════════════════════════════════════════════════════════════════════════
test.describe('retirerExclus — l\'assiette sans les lignes écartées', () => {
  const paiements = [
    { id: 'a', montant: 50 }, { id: 'b', montant: 30 }, { id: 'c', montant: 20 },
  ];

  test('les paiements exclus sortent, les autres restent dans l\'ordre', () => {
    const restants = retirerExclus(paiements, { ids: new Set(['b']) });
    expect(restants.map(p => p.id)).toEqual(['a', 'c']);
  });

  test('aucune exclusion : le lot est rendu tel quel', () => {
    expect(retirerExclus(paiements, { ids: new Set() })).toHaveLength(3);
    expect(retirerExclus(paiements, null)).toHaveLength(3);
    expect(retirerExclus(paiements, undefined)).toHaveLength(3);
  });

  test('pré-migration (colonne absente) : rien n\'est exclu, jamais une erreur', () => {
    // lireExclusions renvoie ce contrat quand exclu_compta n'existe pas.
    const indisponible = { ids: new Set(), nb: 0, montant: 0, disponible: false };
    expect(retirerExclus(paiements, indisponible)).toHaveLength(3);
  });

  test('lot vide ou absent : jamais un plantage sur un document', () => {
    expect(retirerExclus([], { ids: new Set(['a']) })).toEqual([]);
    expect(retirerExclus(null, { ids: new Set(['a']) })).toEqual([]);
  });
});

test.describe('mentionExclusions — le document annonce ce qu\'il ne contient pas', () => {
  test('elle dit le nombre ET le montant', () => {
    const m = mentionExclusions({ nb: 2, montant: 145.5 });
    expect(m).toContain('2 encaissements');
    expect(m).toContain('145,50');
    expect(m).toContain('je déclare à part');
  });

  test('accord au singulier', () => {
    expect(mentionExclusions({ nb: 1, montant: 40 })).toContain('1 encaissement volontairement exclu ');
  });

  test('aucune exclusion : aucune phrase (on ne salit pas un document propre)', () => {
    expect(mentionExclusions({ nb: 0, montant: 0 })).toBe('');
    expect(mentionExclusions({})).toBe('');
    expect(mentionExclusions()).toBe('');
  });

  test('pas de tiret quadratin (règle de rédaction maison)', () => {
    expect(mentionExclusions({ nb: 3, montant: 90 })).not.toContain('—');
  });
});

test.describe('le livre des recettes porte la mention', () => {
  test('un registre amputé le dit sur lui-même', () => {
    const livre = construireLivreRecettes({
      paiements: [{ id: 'p1', montant: 60, mode: 'especes', date: '2026-09-10', date_encaissement: '2026-09-10' }],
      periode: { id: 'T3-2026', label: 'T3 2026', from: '2026-07-01', to: '2026-09-30' },
      exclusions: { nb: 1, montant: 40 },
    });
    expect(livre.total).toBe(60);
    expect(livre.mentionExclusions).toContain('1 encaissement');
    expect(livreEnCsv(livre)).toContain('40,00');
  });

  test('sans exclusion, le registre ne porte aucune mention', () => {
    const livre = construireLivreRecettes({
      paiements: [{ id: 'p1', montant: 60, mode: 'especes', date: '2026-09-10' }],
      periode: { id: 'T3-2026', label: 'T3 2026', from: '2026-07-01', to: '2026-09-30' },
    });
    expect(livre.mentionExclusions).toBe('');
    expect(livreEnCsv(livre)).not.toContain('exclu');
  });
});
