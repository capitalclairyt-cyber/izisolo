/**
 * Import CSV — décodage + parsing (fonctions pures, testées).
 *
 * Pourquoi le décodage vit ici : l'import forçait `readAsText(file, 'utf-8')`,
 * or Excel FR exporte en ANSI (windows-1252) par défaut → chaque octet accentué
 * devenait U+FFFD (�) AVANT le parsing, puis partait tel quel en DB —
 * destruction IRRÉVERSIBLE (21 fiches sur les 90 de l'import réel du
 * 2026-08-17). Règle : on lit les OCTETS, on tente l'UTF-8 strict, et si le
 * fichier n'est pas de l'UTF-8 valide c'est de l'ANSI → windows-1252.
 *
 * Verrou CI : tests/e2e/csv-import.spec.js
 */

/**
 * Décode un ArrayBuffer de CSV en texte, quel que soit l'export d'origine :
 * UTF-8 (avec ou sans BOM), ANSI Excel FR (windows-1252), ou UTF-16 avec BOM
 * (export Excel « Texte Unicode », tab-séparé).
 */
export function decodeCSVBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  // BOM UTF-16 (FF FE / FE FF) — TextDecoder retire le BOM lui-même
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(buffer);
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(buffer);
  try {
    // fatal:true = la moindre séquence invalide jette, au lieu de fabriquer des U+FFFD
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    // Pas de l'UTF-8 valide → ANSI Excel FR (é=0xE9, ç=0xE7, €=0x80…)
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

// ─── Parser CSV robuste (guillemets, BOM, délimiteur ; , ou tab auto) ───────
export function parseCSV(text) {
  text = text.replace(/^﻿/, ''); // BOM résiduel (texte venu d'ailleurs que decodeCSVBuffer)
  const nl = text.indexOf('\n');
  const firstLine = nl < 0 ? text : text.slice(0, nl);
  // Le délimiteur le plus fréquent de la 1re ligne gagne ; à égalité l'ordre
  // historique est préservé (; avant ,). Tab = export Excel « Texte Unicode ».
  const delim = [';', ',', '\t'].reduce((a, b) =>
    firstLine.split(b).length > firstLine.split(a).length ? b : a
  );
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === delim) { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => (c || '').trim() !== ''));
}
