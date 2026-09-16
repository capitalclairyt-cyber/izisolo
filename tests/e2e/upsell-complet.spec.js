// Verrou CI des deux mécaniques d'upsell (v119, 2026-09-16) : le compteur de
// vues du portail et le bilan chiffré de fin d'essai. Spec Node pure, aucun
// navigateur — on fige ici les règles de SINCÉRITÉ, parce que ce sont elles
// qui décident si l'app a le droit de parler d'argent à une prof :
//   · on ne dit jamais « N personnes », on dit « ouverte N fois » ;
//   · sous le seuil, on se tait ;
//   · une ligne à zéro, ou qu'on ne sait pas compter, ne s'affiche pas ;
//   · quand tout est à zéro, on ne vend rien.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { FENETRE_JOURS, SEUIL_CARTE, estRobot, fenetre, messageVues, totalVues } from '../../lib/vues-portail.js';
import { bilanEssai, lignesBilan } from '../../lib/bilan-essai.js';

const LE_15 = new Date('2026-09-15T10:00:00Z');

test.describe('le compteur de vues du portail', () => {
  test('la fenêtre couvre sept jours, bornes comprises', () => {
    const f = fenetre(FENETRE_JOURS, LE_15);
    expect(f).toEqual({ debut: '2026-09-09', fin: '2026-09-15' });
  });

  test('on ne compte que la fenêtre, et rien de difforme', () => {
    const lignes = [
      { jour: '2026-09-15', vues: 4 },
      { jour: '2026-09-09', vues: 2 },   // borne basse : compte
      { jour: '2026-09-08', vues: 99 },  // hors fenêtre : ignorée
      { jour: '2026-09-12', vues: null },
      { jour: null, vues: 3 },
      { vues: 'beaucoup' },
      null,
    ];
    expect(totalVues(lignes, FENETRE_JOURS, LE_15)).toBe(6);
    expect(totalVues(null, FENETRE_JOURS, LE_15)).toBe(0);
  });

  test('les robots les plus honnêtes ne sont pas comptés', () => {
    expect(estRobot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(estRobot('facebookexternalhit/1.1')).toBe(true);
    expect(estRobot('WhatsApp/2.23')).toBe(true);
    expect(estRobot('')).toBe(true);        // sans user agent, on s'abstient
    expect(estRobot(undefined)).toBe(true);
    expect(estRobot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605')).toBe(false);
  });

  test('sous le seuil on se tait, sur Complet aussi', () => {
    expect(messageVues({ vues: SEUIL_CARTE - 1, peutReserver: false })).toBeNull();
    expect(messageVues({ vues: 40, peutReserver: true })).toBeNull();
    expect(messageVues({ vues: 0, peutReserver: false })).toBeNull();
    expect(messageVues({ vues: undefined, peutReserver: false })).toBeNull();
  });

  test('la phrase dit des OUVERTURES, jamais des personnes, et dit ce qu\'on ne sait pas', () => {
    const m = messageVues({ vues: 14, peutReserver: false });
    expect(m.titre).toBe('Ta page publique a été ouverte 14 fois cette semaine.');
    expect(m.titre).not.toMatch(/personne|visiteuse|élève/i);
    expect(m.texte).toMatch(/réserver/);
    expect(m.note).toMatch(/jamais les personnes/);
    expect(m.note).toMatch(/adresse IP/);
  });
});

test.describe('le bilan chiffré de fin d\'essai', () => {
  test('une ligne à zéro, ou qu\'on ne sait pas compter, ne s\'affiche pas', () => {
    const lignes = lignesBilan({ reservations: 0, paiements: undefined, annonces: 3, comptesEleves: 44 });
    expect(lignes.map((l) => l.cle)).toEqual(['annonces', 'comptesEleves']);
  });

  test('les pluriels et le montant', () => {
    const [r, p] = lignesBilan({ reservations: 1, paiements: 4, montantPaiements: 320.4 });
    expect(r.texte).toBe('1 réservation faite en ligne par tes élèves');
    expect(p.texte).toBe('4 paiements encaissés par carte en ligne (320 €)');
    const [seul] = lignesBilan({ paiements: 2 });
    expect(seul.texte).toBe('2 paiements encaissés par carte en ligne'); // sans montant : pas de parenthèse vide
  });

  test('l\'ordre : ce que les élèves ont FAIT d\'abord', () => {
    const lignes = lignesBilan({ reservations: 2, paiements: 1, annonces: 5, comptesEleves: 12, demandes: 1 });
    expect(lignes.map((l) => l.cle)).toEqual(['reservations', 'paiements', 'demandes', 'annonces', 'comptesEleves']);
  });

  test('tout à zéro : on ne vend rien, on propose le geste qui manque', () => {
    const avant = bilanEssai({ comptes: {}, jours: 3 });
    expect(avant.vide).toBe(true);
    expect(avant.lignes).toEqual([]);
    expect(avant.titre).toBe('Il te reste 3 jours pour essayer Complet');
    expect(avant.conclusion).toMatch(/Partage ton lien/);
    expect(avant.conclusion).not.toMatch(/29 €/); // aucune facture pour un service non rendu

    const apres = bilanEssai({ comptes: {}, jours: 0 });
    expect(apres.vide).toBe(true);
    expect(apres.conclusion).toMatch(/Essentiel, gratuit/);
  });

  test('avec des chiffres : la frontière est dite, et le reste du studio rassuré', () => {
    const b = bilanEssai({ comptes: { reservations: 12, comptesEleves: 44 }, jours: 3 });
    expect(b.vide).toBe(false);
    expect(b.titre).toBe('En 30 jours de Complet, chez toi');
    expect(b.lignes).toHaveLength(2);
    expect(b.conclusion).toMatch(/dans 3 jours/);
    expect(b.conclusion).toMatch(/29 € par mois/);
    expect(b.conclusion).toMatch(/le reste de ton studio/i);

    expect(bilanEssai({ comptes: { reservations: 1 }, jours: 1 }).conclusion).toMatch(/demain/);
    const fini = bilanEssai({ comptes: { reservations: 12 }, jours: 0, nomPlan: 'Association', prix: 39 });
    expect(fini.titre).toMatch(/pendant tes 30 jours de Association/);
    expect(fini.conclusion).toMatch(/39 € par mois/);
  });

  test('aucun texte ne porte de tiret quadratin (règle Colin)', () => {
    const b = bilanEssai({ comptes: { reservations: 3, paiements: 2, montantPaiements: 90, annonces: 1, comptesEleves: 8 }, jours: 2 });
    const tout = [b.titre, b.conclusion, ...b.lignes.map((l) => l.texte)].join(' ');
    expect(tout.includes('—')).toBe(false);
    const m = messageVues({ vues: 9, peutReserver: false });
    expect([m.titre, m.texte, m.note].join(' ').includes('—')).toBe(false);
  });
});

test.describe('la migration v119 dit la même chose que le code', () => {
  const sql = fs.readFileSync(path.join(process.cwd(), 'migrations-v119-upsell-complet.sql'), 'utf8');

  test('la table, la RPC et la colonne', () => {
    expect(sql).toMatch(/create table if not exists vues_portail/);
    expect(sql).toMatch(/create or replace function bump_vue_portail/);
    expect(sql).toMatch(/alter table presences add column if not exists source text/);
  });

  test('aucune écriture n\'est ouverte au client, la RPC est service_role seule', () => {
    // Une policy d'écriture sur vues_portail donnerait à n'importe quel compte
    // connecté le droit de gonfler le compteur d'un studio.
    expect(sql).not.toMatch(/for (insert|update|all) on vues_portail/);
    expect(sql).toMatch(/revoke all on function bump_vue_portail\(uuid\) from anon/);
    expect(sql).toMatch(/revoke all on function bump_vue_portail\(uuid\) from authenticated/);
    expect(sql).toMatch(/grant execute on function bump_vue_portail\(uuid\) to service_role/);
  });

  test('le compteur est daté en heure de Paris, jamais en UTC', () => {
    expect(sql).toMatch(/now\(\) at time zone 'Europe\/Paris'/);
  });
});
