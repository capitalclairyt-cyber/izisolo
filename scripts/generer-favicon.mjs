/**
 * scripts/generer-favicon.mjs — fabrique public/favicon.ico depuis l'icône PWA.
 *
 * Pourquoi ce script existe (2026-08-28, export Search Console) : `/favicon.ico`
 * répondait 404 en production. C'est l'URL que TOUT navigateur et tout crawler
 * demande en dernier recours, et c'était très probablement l'unique page
 * « Introuvable (404) » du rapport d'indexation. Conséquence visible côté prof :
 * aucune icône dans l'onglet, pour un produit dont l'argument est d'être beau.
 *
 * Re-runnable : `node scripts/generer-favicon.mjs`. À relancer si l'icône
 * de marque change (public/icons/icon-512.png).
 *
 * Format ICO : un conteneur qui accepte des PNG tels quels depuis Vista. On
 * embarque 16/32/48 px pour que Windows, les onglets et les favoris piochent
 * la bonne taille sans redimensionner à l'arrache.
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';

const SOURCE = 'public/icons/icon-512.png';
const CIBLE = 'public/favicon.ico';
const TAILLES = [16, 32, 48];

const images = [];
for (const t of TAILLES) {
  images.push({ taille: t, png: await sharp(SOURCE).resize(t, t, { fit: 'contain' }).png().toBuffer() });
}

const entete = Buffer.alloc(6);
entete.writeUInt16LE(0, 0);              // réservé
entete.writeUInt16LE(1, 2);              // type 1 = icône
entete.writeUInt16LE(images.length, 4);

let offset = 6 + images.length * 16;
const entrees = [];
for (const { taille, png } of images) {
  const e = Buffer.alloc(16);
  e.writeUInt8(taille === 256 ? 0 : taille, 0);
  e.writeUInt8(taille === 256 ? 0 : taille, 1);
  e.writeUInt8(0, 2);                    // palette
  e.writeUInt8(0, 3);                    // réservé
  e.writeUInt16LE(1, 4);                 // plans
  e.writeUInt16LE(32, 6);                // bits par pixel
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  entrees.push(e);
}

writeFileSync(CIBLE, Buffer.concat([entete, ...entrees, ...images.map(i => i.png)]));
console.log(`${CIBLE} écrit — ${TAILLES.join('/')} px, ${Buffer.concat(images.map(i => i.png)).length} octets d'images.`);
