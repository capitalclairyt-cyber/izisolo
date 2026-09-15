// Les emails de Maude aux ENTREPRISES de la Bièvre et du Voironnais (2026-09-15).
//
// Colin (le soir du 14/09) : « fais une recherche sur toutes les entreprises
// susceptibles de faire intervenir Maude dans un secteur proche, prépare les
// mails, je valide et tu envoies ». Même patron que les écoles : les textes
// vivent HORS dépôt (coordonnées de tiers), chaque envoi est journalisé, jamais
// deux emails à la même entreprise, et chaque texte passe les règles de
// lib/hors-les-murs (vouvoiement, signature, un seul lien, pas de crochet).
//
//   ../reseaux/entreprises/emails.json    [{ id, entreprise, commune, to, objet, corps, … }]
//   ../reseaux/entreprises/envoyes.json   journal { id: { to, date, resendId } }
//
//   node scripts/envoyer-email-entreprise.mjs --liste              → où on en est
//   node scripts/envoyer-email-entreprise.mjs <id> --apercu        → l'email tel qu'il partira
//   node scripts/envoyer-email-entreprise.mjs <id> --envoyer       → envoie, journalise, marque « envoyé » dans hlm_suivi
//   node scripts/envoyer-email-entreprise.mjs --tous --envoyer     → tous ceux qui ont une adresse et ne sont pas partis
//
// Parle à Resend directement (comme les écoles) : pas de pied de désinscription
// sur un email B2B écrit à la main, mais un « transmettez à la bonne personne ».
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { estEmailDeTest } from '../lib/email-domaines.js';
import { validerEmailLieu } from '../lib/hors-les-murs.js';
import { LIEUX } from '../content/hors-les-murs.js';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }),
);
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v;

const DOSSIER = join(process.cwd(), '..', 'reseaux', 'entreprises');
const EMAILS = join(DOSSIER, 'emails.json');
const JOURNAL = join(DOSSIER, 'envoyes.json');
const FROM = 'Maude Pontet, Maude Yoga <bonjour@izisolo.fr>';
const REPLY_TO = 'maude@maude-yoga.com';
const CC = 'bonjour@izisolo.fr';

const args = process.argv.slice(2);
const mode = args.find((a) => ['--apercu', '--envoyer', '--liste'].includes(a));
const tous = args.includes('--tous');
const id = args.find((a) => !a.startsWith('--'));
if (!mode || (!id && !tous && mode !== '--liste')) {
  console.error('Usage : node scripts/envoyer-email-entreprise.mjs --liste | <id> --apercu | <id> --envoyer | --tous --envoyer');
  process.exit(1);
}
if (!existsSync(EMAILS)) { console.error(`💥 ${EMAILS} introuvable`); process.exit(1); }
const emails = JSON.parse(readFileSync(EMAILS, 'utf8'));
const journal = existsSync(JOURNAL) ? JSON.parse(readFileSync(JOURNAL, 'utf8')) : {};

if (mode === '--liste') {
  for (const e of emails) {
    const etat = journal[e.id] ? `envoyé le ${journal[e.id].date.slice(0, 10)}` : e.to ? 'prêt' : `sans adresse (${e.canal || 'formulaire'})`;
    console.log(`${e.id.padEnd(22)} ${e.entreprise.padEnd(40)} ${(e.to || '').padEnd(40)} ${etat}`);
  }
  process.exit(0);
}

const echapper = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fr = (t) => t.replace(/ ([?!;:])/g, ' $1');
const lier = (t) => t.replace(/\bpro\.maude-yoga\.com\b/g, (m) => `<a href="https://pro.maude-yoga.com" style="color:#8f5a37">${m}</a>`);
const rendre = (corps) => `<div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#2c2118;max-width:600px">`
  + corps.trim().split(/\n\s*\n/).map((p) => `<p style="margin:0 0 16px">${lier(echapper(fr(p))).replace(/\n/g, '<br>')}</p>`).join('')
  + '</div>';

const cibles = tous ? emails.filter((e) => e.to && !journal[e.id]) : emails.filter((e) => e.id === id);
if (!cibles.length) { console.error(tous ? 'Rien à envoyer : tout est parti ou sans adresse.' : `💥 aucun email d'id « ${id } »`); process.exit(1); }

let resend = null, admin = null;
if (mode === '--envoyer') {
  if (!process.env.RESEND_API_KEY) { console.error('💥 RESEND_API_KEY manquante'); process.exit(1); }
  resend = new Resend(process.env.RESEND_API_KEY);
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

let envoyes = 0;
for (const email of cibles) {
  const v = validerEmailLieu({ objet: email.objet, corps: email.corps });
  if (!v.ok) { console.error(`💥 « ${email.id} » ne respecte pas les règles : ${v.erreurs.join(' ; ')}`); if (!tous) process.exit(1); continue; }
  if (journal[email.id]) { console.error(`💥 « ${email.id} » a déjà été envoyé le ${journal[email.id].date} à ${journal[email.id].to} : on n'écrit pas deux fois`); if (!tous) process.exit(1); continue; }
  if (!email.to) { console.error(`💥 « ${email.id} » n'a pas d'adresse : ${email.canal || 'formulaire'}. Le texte se colle à la main.`); if (!tous) process.exit(1); continue; }

  console.log(`\nDe      : ${FROM}\nRépondre: ${REPLY_TO}\nCc      : ${CC}\nÀ       : ${email.to}  (${email.entreprise}, ${email.commune})\nObjet   : ${fr(email.objet)}\n\n${fr(email.corps.trim())}\n`);
  if (mode === '--apercu') { console.log("(aperçu : rien n'est parti)"); continue; }

  if (estEmailDeTest(email.to)) { console.error('💥 domaine de test (RFC 2606), rien ne part :', email.to); continue; }
  const { data, error } = await resend.emails.send({ from: FROM, to: email.to, cc: CC, subject: fr(email.objet), html: rendre(email.corps), text: fr(email.corps.trim()), replyTo: REPLY_TO });
  if (error) { console.error('💥 envoi refusé :', error); if (!tous) process.exit(1); continue; }
  journal[email.id] = { to: email.to, entreprise: email.entreprise, objet: email.objet, date: new Date().toISOString(), resendId: data?.id || null };
  mkdirSync(DOSSIER, { recursive: true });
  writeFileSync(JOURNAL, JSON.stringify(journal, null, 2) + '\n');
  envoyes++;
  console.log(`✅ envoyé à ${email.to} (${email.entreprise})`);

  // La piste existe dans le backoffice de Maude ? Elle passe « Envoyé » pour qu'elle
  // la voie dans /admin/hors-les-murs avec sa date, et note la réponse là-bas.
  if (admin && LIEUX.some((l) => l.id === email.id)) {
    const maintenant = new Date().toISOString();
    const { data: existant } = await admin.from('hlm_suivi').select('id, historique').eq('id', email.id).maybeSingle();
    const historique = [...(existant?.historique || []), { quand: maintenant, action: 'marquer_envoye', par: 'script entreprises' }];
    const ligne = { id: email.id, statut: 'envoye', envoye_at: maintenant, updated_at: maintenant, historique, objet: email.objet, corps: email.corps };
    const { error: eS } = existant ? await admin.from('hlm_suivi').update(ligne).eq('id', email.id) : await admin.from('hlm_suivi').insert(ligne);
    console.log(eS ? `   (hlm_suivi non mis à jour : ${eS.message})` : '   → marqué « Envoyé » dans Hors les murs');
  }
}
if (mode === '--envoyer') console.log(`\n${envoyes} email(s) parti(s), journal : ${JOURNAL}`);
