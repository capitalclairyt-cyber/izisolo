// Verrou CI des guides admin (content/admin-guides/*.md) : chaque guide porte
// un titre, une description, une date, un GROUPE connu et un ORDRE, pour que
// /admin/guides les range par famille au lieu d'une liste plate où onze
// légendes se suivaient (2026-09-15). Les blocs « à coller » (```texte) suivent
// la bible réseaux : zéro tiret cadratin, zéro flèche en puce, zéro crochet
// oublié d'un gabarit. Spec Node pure, aucun navigateur.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { GROUPES_GUIDES, dateMaj } from '../../lib/admin-guides.js';

// Les blocs « à coller » d'un guide (```texte) : c'est EUX que Maude publie,
// et c'est sur eux que portent les règles de la bible réseaux. Le reste du
// guide peut nommer une formule interdite pour dire qu'elle est interdite.
const blocsACopier = (content) => [...content.matchAll(/```texte\n([\s\S]*?)```/g)].map((m) => m[1]);

const DIR = path.join(process.cwd(), 'content', 'admin-guides');
const fichiers = fs.readdirSync(DIR).filter((f) => f.endsWith('.md'));
const guides = fichiers.map((f) => ({ f, ...matter(fs.readFileSync(path.join(DIR, f), 'utf8')) }));

test.describe('les guides admin sont rangés', () => {
  test('il y a des guides, et chacun a un titre, une description et une date', () => {
    expect(guides.length).toBeGreaterThan(5);
    for (const g of guides) {
      expect(typeof g.data.titre, g.f).toBe('string');
      expect(g.data.titre.length, g.f).toBeGreaterThan(5);
      expect(typeof g.data.description, g.f).toBe('string');
      // `maj: 2026-08-21` sans guillemets arrive en Date : dateMaj la lit quand même.
      expect(dateMaj(g.data.maj), g.f).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('chaque guide appartient à un groupe connu, avec un ordre numérique', () => {
    for (const g of guides) {
      expect(GROUPES_GUIDES, `${g.f} : groupe « ${g.data.groupe} » inconnu`).toContain(g.data.groupe);
      expect(Number.isInteger(g.data.ordre) && g.data.ordre > 0, `${g.f} : ordre`).toBe(true);
    }
  });

  test('deux guides d\'un même groupe ne partagent pas le même ordre', () => {
    const vus = new Set();
    for (const g of guides) {
      const cle = `${g.data.groupe}#${g.data.ordre}`;
      expect(vus.has(cle), `${g.f} : ${cle} déjà pris`).toBe(false);
      vus.add(cle);
    }
  });

  test('les blocs à coller respectent la bible réseaux', () => {
    for (const g of guides) {
      for (const b of blocsACopier(g.content)) {
        expect(b.includes('—'), `${g.f} : tiret cadratin dans un bloc à coller`).toBe(false);
        expect(/^\s*→/m.test(b), `${g.f} : flèche en puce dans un bloc à coller`).toBe(false);
      }
    }
  });

  test('les légendes freemium et avis Google existent et disent la vérité', () => {
    const freemium = guides.find((g) => g.f === 'freemium-lancement-2026-09.md');
    const avis = guides.find((g) => g.f === 'legendes-avis-google.md');
    expect(freemium && avis).toBeTruthy();
    const blocsFreemium = blocsACopier(freemium.content).join('\n');
    const blocsAvis = blocsACopier(avis.content).join('\n');
    // Freemium : la phrase exacte partout, jamais « gratuit à vie » ni « essai gratuit » seul.
    expect(blocsFreemium).toContain('Gratuit, sans carte, pour toujours');
    expect(blocsFreemium).not.toMatch(/gratuit à vie/i);
    // Avis Google : ce que la fonction fait (une fois, cinq par jour), jamais ce qu'elle refuse.
    expect(blocsAvis).toMatch(/une seule fois/);
    expect(blocsAvis).toMatch(/cinq par jour/);
    expect(blocsAvis).not.toMatch(/booste ta note/i);
    expect(blocsAvis).not.toMatch(/\+\s?\d+ avis/);
    // Aucune légende ne CONSEILLE d'envoyer à toute la base (citer le réflexe pour
    // dire que Google le filtre est précisément le propos).
    expect(blocsAvis).not.toMatch(/envoie(-le)?\s+(le lien\s+)?à toute (ta|sa) base/i);
    expect(blocsAvis).toMatch(/Google filtre|c'est ce que Google demande/);
  });
});
