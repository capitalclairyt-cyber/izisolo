// Envoie UN email de prospection à une prof, au nom de Maude Pontet depuis
// bonjour@izisolo.fr, après validation texte par texte par Colin (décision du
// 2026-09-12 : « quelques mails par jour », écrits pour une personne, jamais
// une séquence automatisée ; pour ça il y a izisolo.com, pas encore branché).
//
// Copie de envoyer-email-ecole.mjs avec trois différences, toutes RGPD :
//   - un pied automatique : d'où vient l'adresse (annuaire ou site), un lien de
//     désinscription en un clic, et qui édite IziSolo ;
//   - refus d'écrire à une adresse DÉSINSCRITE (table email_blacklist) ;
//   - envoi PROGRAMMÉ possible (--a=HH:MM, heure de Paris) pour décaler les
//     emails du jour sans laisser tourner un script (Resend `scheduledAt`).
//
// Les emails vivent HORS du dépôt (coordonnées de tiers) :
//   reseaux/prospects/emails.json   [{ id, to, prenom, source, objet, corps }]
//     source = clé de SOURCES ci-dessous ('site' quand l'adresse vient de son site)
//     corps  = texte brut, paragraphes séparés par une ligne vide, signé Maude
//   reseaux/prospects/envoyes.json  journal { id: { to, prenom, objet, date, programme, resendId, reponse } }
//
// Usage, depuis izisolo/ :
//   node scripts/envoyer-email-prof.mjs <id> --apercu             → l'email tel qu'il partira, pied compris
//   node scripts/envoyer-email-prof.mjs <id> --envoyer            → envoie maintenant, journalise
//   node scripts/envoyer-email-prof.mjs <id> --envoyer --a=09:40  → programme à 9 h 40 (Paris), aujourd'hui
//   node scripts/envoyer-email-prof.mjs <id> --repondu            → note qu'elle a répondu (pour compter)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { estEmailDeTest } from '../lib/email-domaines.js';
import { SOURCES } from '../lib/prospection-sources.js';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }),
);
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v;

const DOSSIER = join(process.cwd(), '..', 'reseaux', 'prospects');
const EMAILS = join(DOSSIER, 'emails.json');
const JOURNAL = join(DOSSIER, 'envoyes.json');
const FROM = 'Maude Pontet, IziSolo <bonjour@izisolo.fr>';
const REPLY_TO = 'bonjour@izisolo.fr';
const SITE = 'https://www.izisolo.fr';


const args = process.argv.slice(2);
const id = args[0];
const mode = args.find((a) => ['--apercu', '--envoyer', '--repondu'].includes(a));
const heure = (args.find((a) => a.startsWith('--a=')) || '').slice(4);
if (!id || !mode) {
  console.error('Usage : node scripts/envoyer-email-prof.mjs <id> --apercu | --envoyer [--a=HH:MM] | --repondu');
  process.exit(1);
}
const emails = JSON.parse(readFileSync(EMAILS, 'utf8'));
const email = emails.find((e) => e.id === id);
if (!email) { console.error(`💥 aucun email d'id « ${id} » dans ${EMAILS}`); process.exit(1); }
const journal = existsSync(JOURNAL) ? JSON.parse(readFileSync(JOURNAL, 'utf8')) : {};

if (mode === '--repondu') {
  if (!journal[id]) { console.error(`💥 « ${id} » n'a pas été envoyé, rien à noter`); process.exit(1); }
  journal[id].reponse = new Date().toISOString();
  writeFileSync(JOURNAL, JSON.stringify(journal, null, 2) + '\n');
  const envoyes = Object.values(journal).length;
  const repondu = Object.values(journal).filter((j) => j.reponse).length;
  console.log(`✅ réponse notée pour ${email.prenom}. Compteur : ${repondu} réponse(s) sur ${envoyes} envoi(s).`);
  process.exit(0);
}
if (journal[id]) { console.error(`💥 « ${id} » a déjà été envoyé le ${journal[id].date} à ${journal[id].to} : on n'écrit pas deux fois à la même personne`); process.exit(1); }
if (!SOURCES[email.source]) { console.error(`💥 source « ${email.source} » inconnue : le pied doit dire d'où vient l'adresse (clés : ${Object.keys(SOURCES).join(', ')})`); process.exit(1); }
if (!email.prenom || !email.objet || !email.corps?.trim()) { console.error('💥 prenom, objet et corps sont obligatoires'); process.exit(1); }
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.to)) { console.error('💥 adresse invalide :', email.to); process.exit(1); }

// Heure programmée : HH:MM en heure de Paris, aujourd'hui, dans le futur.
function isoParis(hhmm) {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) throw new Error(`heure « ${hhmm} » : attendu HH:MM`);
  const jour = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  for (const off of ['+02:00', '+01:00']) {
    const d = new Date(`${jour}T${hhmm}:00${off}`);
    if (d.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).startsWith(`${jour} ${hhmm}`)) return d;
  }
  throw new Error('offset Paris introuvable');
}
let programme = null;
if (heure) {
  programme = isoParis(heure);
  if (programme.getTime() < Date.now() + 60_000) { console.error(`💥 ${heure} est déjà passé (ou dans moins d'une minute) : donne une heure à venir`); process.exit(1); }
}

// Texte brut → HTML sobre. Espace fine avant ? ! ; : ; « izisolo.fr/… » devient
// un vrai lien (un texte nu n'est cliquable que dans certaines messageries).
const echapper = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fr = (t) => t.replace(/ ([?!;:])/g, ' $1');
const lier = (t) => t.replace(/\b(www\.)?izisolo\.fr(\/[\w\-./?=&]*)?/g,
  (m) => `<a href="${SITE}${m.replace(/^(www\.)?izisolo\.fr/, '')}" style="color:#8f5a37">${m}</a>`);
const paragraphes = email.corps.trim().split(/\n\s*\n/);
const desinscription = `${SITE}/unsubscribe?email=${encodeURIComponent(email.to.toLowerCase())}`;
const piedTexte = `Je t'écris parce que ${SOURCES[email.source]}. Si tu préfères ne plus recevoir de message de ma part : ${desinscription}\nIziSolo est édité par Maude Yoga (mentions légales : ${SITE}/legal/mentions).`;
const piedHtml = '<p style="margin:28px 0 0;padding-top:12px;border-top:1px solid #e6dccf;font-size:13px;color:#7a6a5c">'
  + `Je t'écris parce que ${echapper(SOURCES[email.source])}. Si tu préfères ne plus recevoir de message de ma part : <a href="${desinscription}" style="color:#7a6a5c">se désinscrire</a>.<br>`
  + `IziSolo est édité par Maude Yoga · <a href="${SITE}/legal/mentions" style="color:#7a6a5c">mentions légales</a></p>`;
const html = '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:16px;line-height:1.55;color:#2c2118;max-width:600px">'
  + paragraphes.map((p) => `<p style="margin:0 0 16px">${lier(echapper(fr(p))).replace(/\n/g, '<br>')}</p>`).join('')
  + piedHtml + '</div>';
const text = `${fr(email.corps.trim())}\n\n${fr(piedTexte)}`;

console.log(`De      : ${FROM}\nRépondre: ${REPLY_TO}\nÀ       : ${email.to}\nObjet   : ${fr(email.objet)}${programme ? `\nDépart  : ${programme.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} (Paris)` : ''}\n\n${text}\n`);

if (mode === '--apercu') { console.log("(aperçu : rien n'est parti)"); process.exit(0); }

if (estEmailDeTest(email.to)) { console.error('💥 domaine de test (RFC 2606), rien ne part :', email.to); process.exit(1); }
if (!process.env.RESEND_API_KEY) { console.error('💥 RESEND_API_KEY manquante'); process.exit(1); }
// Désinscrite = on n'écrit pas, quelle que soit la qualité de l'email.
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: bl, error: blErr } = await sb.from('email_blacklist').select('email').eq('email', email.to.toLowerCase()).maybeSingle();
if (blErr) { console.error("💥 impossible de lire la liste des désinscrites, on n'envoie pas :", blErr.message); process.exit(1); }
if (bl) { console.error(`💥 ${email.to} s'est désinscrite : on ne lui écrit pas`); process.exit(1); }

const resend = new Resend(process.env.RESEND_API_KEY);
const { data, error } = await resend.emails.send({
  from: FROM, to: email.to, subject: fr(email.objet), html, text, replyTo: REPLY_TO,
  headers: { 'List-Unsubscribe': `<${desinscription}>` },
  ...(programme ? { scheduledAt: programme.toISOString() } : {}),
});
if (error) { console.error('💥 envoi refusé :', error); process.exit(1); }
journal[id] = { to: email.to, prenom: email.prenom, objet: email.objet, date: new Date().toISOString(), programme: programme ? programme.toISOString() : null, resendId: data?.id || null, reponse: null };
writeFileSync(JOURNAL, JSON.stringify(journal, null, 2) + '\n');
console.log(programme
  ? `✅ programmé pour ${email.prenom} (${email.to}) à ${heure}, journalisé dans ${JOURNAL}`
  : `✅ envoyé à ${email.prenom} (${email.to}), journalisé dans ${JOURNAL}`);
