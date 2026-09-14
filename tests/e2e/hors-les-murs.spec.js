// Verrou CI — « Hors les murs » (v118, lib/hors-les-murs.js + content/hors-les-murs.js).
// Node pur, aucune DB, aucun navigateur. Il fige deux choses : les RÈGLES (ce
// qu'on refuse d'envoyer au nom de Maude, les transitions de statut, le lien
// mailto) et le CATALOGUE (chaque piste est complète, unique, et son email
// passe les règles : un texte qui casse une règle ne peut pas entrer au dépôt).
import { test, expect } from '@playwright/test';
import {
  FAMILLES, STATUTS, ACTIONS, MOTIFS_ECART, SIGNATURE, SIGNATURE_PRO, CC_EQUIPE,
  validerEmailLieu, lienMailto, fusionner, compteurs, trier, filtrer, occasionsProches, relancesDues, transition, idValide,
} from '../../lib/hors-les-murs.js';
import { LIEUX } from '../../content/hors-les-murs.js';

const corpsOk = `Bonjour,\n\nJe suis prof de yoga à Gillonnay et j'ai vu que vous accueillez déjà des groupes.\n\nJe vous propose une séance d'une heure trente dans votre parc, pour dix à quinze personnes.\n\nUn appel de dix minutes cette semaine vous conviendrait ?\n\n${SIGNATURE}`;

test.describe('validerEmailLieu', () => {
  test('un email complet, vouvoyé et signé passe', () => {
    expect(validerEmailLieu({ objet: 'Une séance de yoga dans votre parc', corps: corpsOk })).toEqual({ ok: true, erreurs: [] });
  });
  test('refuse un crochet, un tiret quadratin, Bordeaux, IziSolo, un concurrent', () => {
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('votre parc', '[le lieu]') }).erreurs.join()).toMatch(/crochet/);
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('parc,', 'parc —') }).erreurs.join()).toMatch(/quadratin/);
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('Gillonnay', 'Bordeaux') }).erreurs.join()).toMatch(/Bordeaux/);
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('prof de yoga', 'cofondatrice d’IziSolo') }).erreurs.join()).toMatch(/IziSolo/);
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('des groupes', 'des groupes, comme Momoyoga') }).erreurs.join()).toMatch(/concurrent/);
  });
  test('refuse le tutoiement', () => {
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('vous accueillez', 'tu accueilles') }).erreurs.join()).toMatch(/vouvoiement/);
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('vous accueillez', "t'as accueilli") }).erreurs.join()).toMatch(/vouvoiement/);
  });
  test('exige la signature sur trois lignes, en fin de texte', () => {
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace(SIGNATURE, 'Maude') }).erreurs.join()).toMatch(/signature/);
    expect(validerEmailLieu({ objet: 'x', corps: `${corpsOk}\nPS : merci` }).erreurs.join()).toMatch(/signature/);
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace(SIGNATURE, SIGNATURE_PRO) }).ok).toBe(true);
  });
  test('un seul lien, et seulement chez Maude ; la signature ne compte pas ; une adresse email n’est pas un lien', () => {
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('votre parc,', 'votre parc (mes cours : maude-yoga.com),') }).ok).toBe(true);
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('votre parc,', 'votre parc (pro.maude-yoga.com/entreprises),') }).ok).toBe(true);
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('votre parc,', 'votre parc (voir www.exemple.fr/yoga),') }).erreurs.join()).toMatch(/lien qui ne mène pas/);
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('votre parc,', 'votre parc (maude-yoga.com et pro.maude-yoga.com),') }).erreurs.join()).toMatch(/un seul lien/);
    expect(validerEmailLieu({ objet: 'x', corps: corpsOk.replace('votre parc,', 'votre parc (écrivez à maude@maude-yoga.com),') }).ok).toBe(true);
  });
  test('objet vide ou trop long, corps vide', () => {
    expect(validerEmailLieu({ objet: '', corps: corpsOk }).erreurs.join()).toMatch(/objet est vide/);
    expect(validerEmailLieu({ objet: 'x'.repeat(121), corps: corpsOk }).erreurs.join()).toMatch(/120/);
    expect(validerEmailLieu({ objet: 'x', corps: '' }).erreurs.join()).toMatch(/corps est vide/);
  });
});

test.describe('lienMailto', () => {
  test('préremplit destinataire, copie, objet et corps, espaces en %20', () => {
    const url = lienMailto('grotte@sassenage.fr', { objet: 'Yoga dans la grotte', corps: 'Bonjour,\n\nà bientôt' });
    expect(url.startsWith('mailto:grotte@sassenage.fr?')).toBe(true);
    expect(url).toContain(`cc=${encodeURIComponent(CC_EQUIPE)}`);
    expect(url).toContain('subject=Yoga%20dans%20la%20grotte');
    expect(url).toContain('body=Bonjour%2C%0A%0A%C3%A0%20bient%C3%B4t');
    expect(url).not.toContain('+');
  });
  test('rend null sans adresse valide (formulaire ou téléphone seulement)', () => {
    expect(lienMailto(null, { objet: 'x', corps: 'y' })).toBeNull();
    expect(lienMailto('04 76 27 55 37', { objet: 'x', corps: 'y' })).toBeNull();
  });
});

test.describe('statuts et transitions', () => {
  test('chaque action pose le statut prévu, ou aucun', () => {
    expect(transition('a_relire', 'valider')).toEqual({ ok: true, statut: 'valide' });
    expect(transition('a_relire', 'enregistrer')).toEqual({ ok: true, statut: 'a_relire' });
    expect(transition('valide', 'marquer_envoye')).toEqual({ ok: true, statut: 'envoye' });
    expect(transition('a_relire', 'marquer_envoye')).toEqual({ ok: true, statut: 'envoye' });
    expect(transition('envoye', 'reponse')).toEqual({ ok: true, statut: 'repondu' });
    expect(transition('repondu', 'en_cours')).toEqual({ ok: true, statut: 'en_cours' });
  });
  test('une piste écartée ne bouge plus, sauf « remettre »', () => {
    expect(transition('ecarte', 'valider').ok).toBe(false);
    expect(transition('ecarte', 'remettre')).toEqual({ ok: true, statut: 'a_relire' });
    expect(transition('a_relire', 'remettre').ok).toBe(false);
  });
  test('on note une réponse après un envoi, pas avant', () => {
    expect(transition('a_relire', 'reponse').ok).toBe(false);
    expect(transition('inconnu', 'ecarter')).toEqual({ ok: true, statut: 'ecarte' });
    expect(transition('a_relire', 'danser').ok).toBe(false);
  });
  test('le vocabulaire est complet et cohérent', () => {
    for (const s of Object.values(ACTIONS).filter(Boolean)) expect(STATUTS[s]).toBeTruthy();
    for (const s of Object.values(STATUTS)) { expect(s.label).toBeTruthy(); expect(s.action).toBeTruthy(); }
    expect(Object.keys(MOTIFS_ECART).length).toBeGreaterThan(2);
  });
});

test.describe('fusion, compteurs, tri, filtres', () => {
  const lieu = { id: 'test', cat: 'nature', nom: 'Test', lieu: 'Ici', km: 5, prio: 1, gest: 'x', email: { objet: 'O', corps: corpsOk } };
  test('sans suivi, la fiche est « à relire » avec le texte du catalogue', () => {
    const f = fusionner(lieu);
    expect(f.statut).toBe('a_relire'); expect(f.objet).toBe('O'); expect(f.corps).toBe(corpsOk); expect(f.texteModifie).toBe(false);
  });
  test('un texte retouché prime et se voit', () => {
    const f = fusionner(lieu, { statut: 'valide', objet: 'O2', corps: null });
    expect(f.statut).toBe('valide'); expect(f.objet).toBe('O2'); expect(f.corps).toBe(corpsOk); expect(f.texteModifie).toBe(true);
  });
  test('un statut inconnu en base retombe sur « à relire »', () => {
    expect(fusionner(lieu, { statut: 'bizarre' }).statut).toBe('a_relire');
  });
  test('compteurs, tri (ce qui attend un geste d’abord) et filtres', () => {
    const fiches = [
      fusionner({ ...lieu, id: 'a', prio: 2, km: 40 }, { statut: 'envoye' }),
      fusionner({ ...lieu, id: 'b', prio: 1, km: 10 }),
      fusionner({ ...lieu, id: 'c', prio: 3, km: 5, cat: 'pro', nom: 'Usine' }, { statut: 'valide' }),
      fusionner({ ...lieu, id: 'd' }, { statut: 'ecarte' }),
    ];
    const c = compteurs(fiches);
    expect(c.total).toBe(4); expect(c.a_relire).toBe(1); expect(c.a_relire_prio1).toBe(1); expect(c.valide).toBe(1); expect(c.ecarte).toBe(1);
    expect(trier(fiches).map((f) => f.id)).toEqual(['c', 'b', 'a', 'd']);
    expect(filtrer(fiches, { statut: 'actives' }).map((f) => f.id)).toEqual(['a', 'b', 'c']);
    expect(filtrer(fiches, { famille: 'pro' }).map((f) => f.id)).toEqual(['c']);
    expect(filtrer(fiches, { kmMax: 15, prio: 1 }).map((f) => f.id)).toEqual(['b', 'd']);
    expect(filtrer(fiches, { kmMax: 15, prio: 1, statut: 'actives' }).map((f) => f.id)).toEqual(['b']);
    expect(filtrer(fiches, { q: 'usine' }).map((f) => f.id)).toEqual(['c']);
  });
  test('occasions proches et relances dues', () => {
    const auj = new Date('2026-09-14T10:00:00Z');
    const fiches = [
      fusionner({ ...lieu, id: 'x', echeance: '2026-09-26' }),
      fusionner({ ...lieu, id: 'y', echeance: '2026-12-25' }),
      fusionner({ ...lieu, id: 'z', echeance: '2026-09-20' }, { statut: 'envoye', envoye_at: '2026-09-01T10:00:00Z' }),
      fusionner({ ...lieu, id: 'w' }, { statut: 'envoye', envoye_at: '2026-09-10T10:00:00Z' }),
    ];
    const occ = occasionsProches(fiches, { aujourdhui: auj });
    expect(occ.map((f) => [f.id, f.joursRestants])).toEqual([['x', 12]]);
    expect(relancesDues(fiches, { aujourdhui: auj }).map((f) => f.id)).toEqual(['z']);
  });
  test('idValide', () => {
    expect(idValide('sassenage')).toBe(true); expect(idValide('grand-lemps2')).toBe(true);
    expect(idValide('Sassenage')).toBe(false); expect(idValide('a')).toBe(false); expect(idValide('../x')).toBe(false);
  });
});

test.describe('le catalogue content/hors-les-murs.js', () => {
  test('il y a des pistes, chacune complète, avec un identifiant unique et une famille connue', () => {
    expect(LIEUX.length).toBeGreaterThan(60);
    const ids = new Set();
    for (const l of LIEUX) {
      expect(idValide(l.id), l.id).toBe(true);
      expect(ids.has(l.id), `id en double : ${l.id}`).toBe(false); ids.add(l.id);
      expect(FAMILLES[l.cat], `${l.id} : famille`).toBeTruthy();
      for (const k of ['nom', 'lieu', 'gest', 'contact', 'deja', 'format', 'prix', 'saison', 'src']) expect(typeof l[k] === 'string' && l[k].trim().length > 0, `${l.id} : ${k}`).toBe(true);
      expect(Number.isFinite(l.km) && l.km >= 0 && l.km <= 80, `${l.id} : km`).toBe(true);
      expect([1, 2, 3].includes(l.prio), `${l.id} : prio`).toBe(true);
      expect(/^https?:\/\//.test(l.src), `${l.id} : source`).toBe(true);
      if (l.echeance) expect(/^\d{4}-\d{2}-\d{2}$/.test(l.echeance), `${l.id} : échéance`).toBe(true);
      expect(l.destinataire && typeof l.destinataire.nom === 'string', `${l.id} : destinataire`).toBe(true);
      for (const k of ['titre', 'concept', 'format', 'deroule', 'prix', 'gain_lieu', 'demande', 'attention']) expect(typeof l.projet?.[k] === 'string' && l.projet[k].trim().length > 0, `${l.id} : projet.${k}`).toBe(true);
    }
  });
  test('chaque email du catalogue passe les règles : un texte qui les casse n’entre pas au dépôt', () => {
    for (const l of LIEUX) {
      const v = validerEmailLieu(l.email);
      expect(v.ok, `${l.id} : ${v.erreurs.join(' ; ')}`).toBe(true);
    }
  });
  test('aucun tiret quadratin nulle part dans le catalogue, et jamais Bordeaux', () => {
    const tout = JSON.stringify(LIEUX);
    expect(tout.includes('—')).toBe(false);
    expect(/Bordeaux/.test(tout)).toBe(false);
  });
  test('une adresse de destinataire, quand elle existe, est une adresse', () => {
    for (const l of LIEUX) if (l.destinataire.email) expect(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(l.destinataire.email), `${l.id} : ${l.destinataire.email}`).toBe(true);
  });
});
