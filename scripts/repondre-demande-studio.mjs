// Répond à UNE demande de création de studio (table demandes_studio, guichet
// /creer-mon-studio) au nom de Maude depuis bonjour@izisolo.fr, puis passe la
// demande « en cours » avec une note. Né pour la première demande réelle
// (Louis, Atelier Move, 2026-09-21) : l'accusé automatique promet 48 h, et
// quand la demande porte un point qu'on ne couvre pas (ClassPass, EGYM), il
// faut le dire AVANT de monter le studio, pas après.
//
// L'email vit HORS du dépôt (coordonnées de tiers) :
//   reseaux/demandes/<id-demande>.json   { objet, corps }   corps = texte brut, paragraphes séparés par une ligne vide
//   reseaux/demandes/envoyes.json        journal { id: { to, date, objet, resendId } }
//
// Usage, depuis izisolo/ :
//   node scripts/repondre-demande-studio.mjs <id-demande> --apercu   → affiche l'email tel qu'il partira, n'envoie rien
//   node scripts/repondre-demande-studio.mjs <id-demande> --envoyer  → envoie, journalise, statut en_cours + note ; refuse un id déjà envoyé
//
// Mêmes garde-fous que les emails aux écoles : domaine de test refusé, jamais
// deux envois pour la même demande, Resend appelé directement.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { estEmailDeTest } from "../lib/email-domaines.js";

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v;

const DOSSIER = join(process.cwd(), "..", "reseaux", "demandes");
const JOURNAL = join(DOSSIER, "envoyes.json");
const FROM = "Maude, IziSolo <bonjour@izisolo.fr>";
const REPLY_TO = "bonjour@izisolo.fr";

const [id, mode] = process.argv.slice(2);
if (!id || !["--apercu", "--envoyer"].includes(mode)) {
  console.error("Usage : node scripts/repondre-demande-studio.mjs <id-demande> --apercu | --envoyer");
  process.exit(1);
}
const fichier = join(DOSSIER, `${id}.json`);
if (!existsSync(fichier)) { console.error(`💥 aucun email dans ${fichier}`); process.exit(1); }
const email = JSON.parse(readFileSync(fichier, "utf8"));
const journal = existsSync(JOURNAL) ? JSON.parse(readFileSync(JOURNAL, "utf8")) : {};
if (journal[id]) { console.error(`💥 déjà envoyé le ${journal[id].date} à ${journal[id].to} : on ne répond pas deux fois à la même demande`); process.exit(1); }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: demande, error: errDemande } = await sb.from("demandes_studio").select("id, prenom, nom, email, studio_nom, statut").eq("id", id).maybeSingle();
if (errDemande || !demande) { console.error("💥 demande introuvable :", errDemande?.message || id); process.exit(1); }

const echapper = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fr = (t) => t.replace(/ ([?!;:])/g, " $1");
const lier = (t) => t.replace(/\b(www\.)?izisolo\.fr(\/[\w\-./?=&]*)?/g,
  (m) => `<a href="https://www.izisolo.fr${m.replace(/^(www\.)?izisolo\.fr/, "")}" style="color:#8f5a37">${m}</a>`);
const paragraphes = email.corps.trim().split(/\n\s*\n/);
const html = `<div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#2c2118;max-width:600px">`
  + paragraphes.map((p) => `<p style="margin:0 0 16px">${lier(echapper(fr(p))).replace(/\n/g, "<br>")}</p>`).join("")
  + `</div>`;
const text = fr(email.corps.trim());

console.log(`De      : ${FROM}\nRépondre: ${REPLY_TO}\nÀ       : ${demande.email} (${demande.prenom} ${demande.nom}, ${demande.studio_nom}, statut ${demande.statut})\nObjet   : ${fr(email.objet)}\n\n${text}\n`);

if (mode === "--apercu") { console.log("(aperçu : rien n'est parti)"); process.exit(0); }

if (estEmailDeTest(demande.email)) { console.error("💥 domaine de test (RFC 2606), rien ne part :", demande.email); process.exit(1); }
if (!process.env.RESEND_API_KEY) { console.error("💥 RESEND_API_KEY manquante"); process.exit(1); }
const resend = new Resend(process.env.RESEND_API_KEY);
const { data, error } = await resend.emails.send({ from: FROM, to: demande.email, subject: fr(email.objet), html, text, replyTo: REPLY_TO });
if (error) { console.error("💥 envoi refusé :", error); process.exit(1); }
journal[id] = { to: demande.email, studio: demande.studio_nom, objet: email.objet, date: new Date().toISOString(), resendId: data?.id || null };
writeFileSync(JOURNAL, JSON.stringify(journal, null, 2) + "\n");
console.log(`✅ envoyé à ${demande.email} (${demande.studio_nom}), journalisé dans ${JOURNAL}`);

// La demande passe « en cours » : quelqu'un lui a écrit, elle attend sa réponse.
const note = `${new Date().toISOString().slice(0, 10)} : réponse envoyée par Maude (${email.objet}).${email.note ? " " + email.note : ""}`;
const { data: maj, error: errMaj } = await sb.from("demandes_studio")
  .update({ statut: demande.statut === "nouvelle" ? "en_cours" : demande.statut, admin_note: note })
  .eq("id", id).select("id, statut");
if (errMaj || !maj?.length) { console.error("⚠️ email parti mais statut non mis à jour :", errMaj?.message || "0 ligne"); process.exit(1); }
console.log(`✅ demande ${maj[0].statut}, note posée`);
