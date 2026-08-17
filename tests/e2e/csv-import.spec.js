/**
 * Import CSV — décodage d'encodage (lib/csv-import).
 *
 * Verrouille le correctif du 2026-08-17 : l'import forçait readAsText(utf-8)
 * sur des exports Excel FR en ANSI (windows-1252) → tous les accents devenaient
 * U+FFFD (�) et partaient tels quels en DB, irréversiblement (21 fiches sur 90
 * du premier import réel d'une prospect). Le décodage lit désormais les octets
 * et choisit : UTF-8 strict d'abord, sinon windows-1252 ; UTF-16 si BOM.
 *
 * Test Node pur (aucun navigateur) : on importe les fonctions directement.
 */
import { test, expect } from '@playwright/test';
import { decodeCSVBuffer, parseCSV } from '../../lib/csv-import.js';

// Encode une chaîne en windows-1252 (accents FR = mêmes octets qu'en latin1)
const cp1252 = (s) => Uint8Array.from(Buffer.from(s, 'latin1')).buffer;
const utf8 = (s) => Uint8Array.from(Buffer.from(s, 'utf8')).buffer;
const utf16le = (s) => Uint8Array.from(Buffer.from('﻿' + s, 'utf16le')).buffer;

test.describe('decodeCSVBuffer — le cas de l’incident : export Excel FR en ANSI', () => {
  test('les accents survivent (Michèle, Françoise, Maïté)', () => {
    const txt = decodeCSVBuffer(cp1252('prenom;nom\nMichèle;BONARDET\nFrançoise;BELAIR\nMaïté;LE GLEUHER'));
    expect(txt).toContain('Michèle');
    expect(txt).toContain('Françoise');
    expect(txt).toContain('Maïté');
    expect(txt).not.toContain('�'); // plus jamais de � fabriqué
  });

  test('€ (0x80) prouve que c’est bien du windows-1252, pas du latin1', () => {
    const bytes = new Uint8Array([...Buffer.from('prix;', 'latin1'), 0x80]);
    expect(decodeCSVBuffer(bytes.buffer)).toBe('prix;€');
  });
});

test.describe('decodeCSVBuffer — les exports sains restent intacts', () => {
  test('UTF-8 sans BOM', () => {
    expect(decodeCSVBuffer(utf8('prenom;nom\nGwénaëlle;DENIS'))).toContain('Gwénaëlle');
  });

  test('UTF-8 avec BOM Excel : BOM retiré, accents intacts', () => {
    const txt = decodeCSVBuffer(utf8('﻿prenom;nom\nHélène;BERTIN'));
    expect(txt.charCodeAt(0)).not.toBe(0xFEFF);
    expect(txt).toContain('Hélène');
  });

  test('ASCII pur : identique quel que soit le chemin', () => {
    expect(decodeCSVBuffer(utf8('prenom;nom\nAnne;MAGNE'))).toBe('prenom;nom\nAnne;MAGNE');
  });

  test('UTF-16LE avec BOM (export Excel « Texte Unicode », tab-séparé)', () => {
    const rows = parseCSV(decodeCSVBuffer(utf16le('prenom\tnom\nMaïté\tLE GLEUHER')));
    expect(rows).toEqual([['prenom', 'nom'], ['Maïté', 'LE GLEUHER']]);
  });
});

test.describe('parseCSV — comportement historique préservé', () => {
  test('délimiteur ; prioritaire à égalité avec ,', () => {
    expect(parseCSV('a;b,c;d\n1;2,3;4')).toEqual([['a', 'b,c', 'd'], ['1', '2,3', '4']]);
  });

  test('round-trip complet cp1252 → décodage → parsing', () => {
    const rows = parseCSV(decodeCSVBuffer(cp1252('prenom;nom;email\nRenée;CHAMBAUD;r.chambaud@floviane.com')));
    expect(rows).toEqual([
      ['prenom', 'nom', 'email'],
      ['Renée', 'CHAMBAUD', 'r.chambaud@floviane.com'],
    ]);
  });

  test('guillemets et champs vides inchangés', () => {
    expect(parseCSV('nom;notes\n"Le Gleuher";"aime le ""hatha"", venue 2x"\n;')).toEqual([
      ['nom', 'notes'],
      ['Le Gleuher', 'aime le "hatha", venue 2x'],
    ]);
  });
});
