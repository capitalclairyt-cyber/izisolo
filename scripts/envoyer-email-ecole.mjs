// Envoie UN email de partenariat à une école de formation, au nom de Maude
// Pontet depuis bonjour@izisolo.fr, après validation texte par texte par
// Colin (décision du 2026-09-10 : « tu les envoies toi-même après que j'ai
// validé, mail par mail »).
//
// Les emails vivent HORS du dépôt (coordonnées de tiers) :
//   reseaux/ecoles/emails.json   [{ id, ecole, to, objet, corps }]  corps = texte brut, paragraphes séparés par une ligne vide
//   reseaux/ecoles/envoyes.json  journal des envois { id: { to, date, objet } }
//
// Usage, depuis izisolo/ :
//   node scripts/envoyer-email-ecole.mjs <id> --apercu   → affiche l'email tel qu'il partira, n'envoie rien
//   node scripts/envoyer-email-ecole.mjs <id> --envoyer  → envoie, puis journalise ; refuse un id déjà envoyé
//
// Parle à Resend directement (lib/email.js importe sans extension, Node seul
// ne le charge pas), avec les mêmes garde-fous : domaine de test refusé, pas
// de lien de désinscription sur un email personnel, jamais deux envois à la
// même école.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resend } from 'resend';
import { estEmailDeTest } from '../lib/email-domaines.js';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }),
);
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v;

const DOSSIER = join(process.cwd(), '..', 'reseaux', 'ecoles');
const EMAILS = join(DOSSIER, 'emails.json');
const JOURNAL = join(DOSSIER, 'envoyes.json');
const FROM = 'Maude Pontet, IziSolo <bonjour@izisolo.fr>';
const REPLY_TO = 'bonjour@izisolo.fr';

const [id, mode] = process.argv.slice(2);
if (!id || !['--apercu', '--envoyer'].includes(mode)) {
  console.error('Usage : node scripts/envoyer-email-ecole.mjs <id> --apercu | --envoyer');
  process.exit(1);
}
const emails = JSON.parse(readFileSync(EMAILS, 'utf8'));
const email = emails.find((e) => e.id === id);
if (!email) { console.error(`💥 aucun email d'id « ${id} » dans ${EMAILS}`); process.exit(1); }
const journal = existsSync(JOURNAL) ? JSON.parse(readFileSync(JOURNAL, 'utf8')) : {};
if (journal[id]) { console.error(`💥 « ${id} » a déjà été envoyé le ${journal[id].date} à ${journal[id].to} : on n'écrit pas deux fois à une école`); process.exit(1); }

// Un « ? » ou un « ! » ne commence jamais une ligne (espace fine insécable),
// et le texte brut devient des paragraphes HTML sobres, sans mise en page.
const echapper = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fr = (t) => t.replace(/ ([?!;:])/g, ' $1');
const paragraphes = email.corps.trim().split(/\n\s*\n/);
const html = `<div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#2c2118;max-width:600px">`
  + paragraphes.map((p) => `<p style="margin:0 0 16px">${echapper(fr(p)).replace(/\n/g, '<br>')}</p>`).join('')
  + `</div>`;

console.log(`De      : ${FROM}\nRépondre: ${REPLY_TO}\nÀ       : ${email.to}\nObjet   : ${fr(email.objet)}\n\n${fr(email.corps.trim())}\n`);

if (mode === '--apercu') { console.log('(aperçu : rien n\'est parti)'); process.exit(0); }

if (estEmailDeTest(email.to)) { console.error('💥 domaine de test (RFC 2606), rien ne part :', email.to); process.exit(1); }
if (!process.env.RESEND_API_KEY) { console.error('💥 RESEND_API_KEY manquante'); process.exit(1); }
const resend = new Resend(process.env.RESEND_API_KEY);
const { data, error } = await resend.emails.send({ from: FROM, to: email.to, subject: fr(email.objet), html, replyTo: REPLY_TO });
if (error) { console.error('💥 envoi refusé :', error); process.exit(1); }
journal[id] = { to: email.to, ecole: email.ecole, objet: email.objet, date: new Date().toISOString(), resendId: data?.id || null };
writeFileSync(JOURNAL, JSON.stringify(journal, null, 2) + '\n');
console.log(`✅ envoyé à ${email.to} (${email.ecole}), journalisé dans ${JOURNAL}`);
