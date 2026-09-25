// Monte l'espace d'une prof À SA PLACE, depuis un fichier de description
// (le concierge v96, mais scripté : tout ce que Maude ferait à la main
// pendant la visio, en un passage, re-runnable).
//
// Né le 2026-09-25 pour Dorothée Cottarel : le guichet /admin/studios/nouveau
// crée le compte et laisse la configuration à la souris ; ici la description
// vit dans un JSON qu'on relit, qu'on corrige, et qu'on rejoue sans rien
// doubler. Le script s'arrête AVANT l'envoi du lien : ce geste-là reste à
// l'humain (fiche admin → « Envoyer le lien d'appropriation », ou --lien pour
// un lien à coller dans un DM).
//
// Usage, depuis izisolo/ :
//   node scripts/parametrer-espace-prof.mjs scripts/espaces/<prof>.json --dry-run  → montre le plan, n'écrit RIEN (ni compte, ni ligne)
//   node scripts/parametrer-espace-prof.mjs scripts/espaces/<prof>.json            → crée le compte s'il manque, complète le profil, pose lieux, séries, offres
//   node scripts/parametrer-espace-prof.mjs scripts/espaces/<prof>.json --lien     → idem, puis imprime un lien d'appropriation (recovery, usage unique) à envoyer
//
// Ce qu'il fait, dans l'ordre et exactement comme l'app :
//   1. le COMPTE : createUser (email confirmé, metadata { prenom, concierge })
//      → le trigger handle_new_user crée le profil PROF (jamais role='eleve'),
//      trial 30 j démarré par le trigger v33 ; puis le profil est complété
//      comme l'onboarding le ferait (slug unique, métier, types de cours,
//      portail actif). Un compte ÉLÈVE à cette adresse = refus, comme la route.
//      Un compte PROF déjà là = reprise : on ne recrée rien, on complète.
//   2. la PAGE : bio, formations, liens, message d'accueil, tarifs affichés.
//   3. les LIEUX (par nom, jamais deux fois).
//   4. les SÉRIES hebdomadaires : une ligne `recurrences` + ses occurrences,
//      générées par la même règle que l'écran de création (fériés / vacances
//      par lib/vacances-scolaires), tarif à la séance et carnets acceptés
//      portés par CHAQUE occurrence (la table recurrences n'a pas la colonne).
//      Une série déjà posée (même nom, même jour, même heure) est ignorée.
//   5. les OFFRES (par nom, jamais deux fois), les colonnes de séances écrites
//      par payloadSeances (le seul traducteur, lib/offres-seances).
//
// Garde-fous : domaine de test refusé (RFC 2606), aucun email envoyé par le
// script, chaque écriture relue (jamais « ok » sur zéro ligne), compensation
// si les occurrences d'une série échouent (la récurrence fantôme est retirée).
//
// Le JSON : voir scripts/espaces/exemple.json (commenté par ses clés « _ »).
// Les fichiers réels vivent dans scripts/espaces/ et sont IGNORÉS par git
// (coordonnées de tiers) ; seul exemple.json est versionné.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { estEmailDeTest } from "../lib/email-domaines.js";
import { slugify } from "../lib/utils.js";
import { SOUS_DOMAINES_RESERVES } from "../lib/studio-host.js";
import { estJourFerie, getPeriodeVacances, ZONES_VACANCES } from "../lib/vacances-scolaires.js";
import { payloadSeances, MODE_ILLIMITE, MODE_CADENCE, MODE_TOTAL } from "../lib/offres-seances.js";
import { TYPES_COURS_DEFAUT } from "../lib/constantes.js";
import { CODES_STRUCTURE } from "../lib/structure.js";
import { parseDate, toDateStr } from "../lib/dates.js";

// ─── environnement ──────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v;

const args = process.argv.slice(2);
const fichier = args.find((a) => !a.startsWith("--"));
const DRY = args.includes("--dry-run");
const LIEN = args.includes("--lien");
if (!fichier) {
  console.error("Usage : node scripts/parametrer-espace-prof.mjs scripts/espaces/<prof>.json [--dry-run] [--lien]");
  process.exit(1);
}
if (!existsSync(fichier)) { console.error(`💥 fichier introuvable : ${fichier}`); process.exit(1); }

const SITE = "https://www.izisolo.fr";
const METIERS = ["yoga", "pilates", "danse", "musique", "coaching", "arts", "autre"];
const JOURS = { 1: "lundi", 2: "mardi", 3: "mercredi", 4: "jeudi", 5: "vendredi", 6: "samedi", 7: "dimanche" };
const log = (m) => console.log(m);
const die = (m, e) => { console.error(`💥 ${m}${e ? " : " + (e.message || JSON.stringify(e)) : ""}`); process.exit(1); };

// ─── 0. lecture et validation du fichier ────────────────────────────────────
const desc = JSON.parse(readFileSync(fichier, "utf8"));
const erreurs = [];
const email = String(desc.email || "").trim().toLowerCase();
if (!desc.prenom?.trim()) erreurs.push("prenom manquant");
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) erreurs.push(`email invalide : « ${email} »`);
if (estEmailDeTest(email)) erreurs.push(`email sur un domaine de test (RFC 2606) : ${email}`);
const studio = desc.studio || {};
if (!studio.nom || String(studio.nom).trim().length < 2) erreurs.push("studio.nom manquant (2 caractères minimum)");
if (!METIERS.includes(studio.metier)) erreurs.push(`studio.metier doit être l'un de ${METIERS.join(", ")}`);
const typeStructure = studio.type_structure || "solo";
if (!CODES_STRUCTURE.includes(typeStructure)) erreurs.push(`studio.type_structure inconnu : ${typeStructure}`);
const pays = studio.pays || "FR";
if (!["FR", "BE", "LU"].includes(pays)) erreurs.push(`studio.pays doit être FR, BE ou LU (reçu ${pays})`);

const lieux = Array.isArray(desc.lieux) ? desc.lieux : [];
const clesLieux = new Set();
for (const l of lieux) {
  if (!l.cle || !l.nom) erreurs.push(`lieu sans cle ou sans nom : ${JSON.stringify(l)}`);
  if (clesLieux.has(l.cle)) erreurs.push(`deux lieux portent la clé « ${l.cle} »`);
  clesLieux.add(l.cle);
}
const series = Array.isArray(desc.series) ? desc.series : [];
for (const s of series) {
  const ou = `série « ${s.nom || "?"} »`;
  if (!s.nom) erreurs.push("série sans nom");
  if (!JOURS[s.jour]) erreurs.push(`${ou} : jour doit être 1 (lundi) à 7 (dimanche)`);
  if (!/^\d{2}:\d{2}$/.test(s.heure || "")) erreurs.push(`${ou} : heure au format HH:MM`);
  if (!(parseInt(s.duree_minutes) > 0)) erreurs.push(`${ou} : duree_minutes manquante`);
  if (s.format !== "visio" && !clesLieux.has(s.lieu)) erreurs.push(`${ou} : lieu « ${s.lieu} » ne correspond à aucune clé de lieux`);
  if (s.format === "visio" && s.lien_visio && !/^https:\/\//.test(s.lien_visio)) erreurs.push(`${ou} : lien_visio doit commencer par https://`);
  for (const k of ["date_debut", "date_fin"]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s[k] || "")) erreurs.push(`${ou} : ${k} au format AAAA-MM-JJ`);
  }
  if (s.date_debut && s.date_fin && s.date_fin < s.date_debut) erreurs.push(`${ou} : date_fin avant date_debut`);
  if (s.date_debut && JOURS[s.jour]) {
    const d = parseDate(s.date_debut);
    const j = d.getDay() === 0 ? 7 : d.getDay();
    if (j !== s.jour) erreurs.push(`${ou} : date_debut ${s.date_debut} tombe un ${JOURS[j]}, pas un ${JOURS[s.jour]} (la première séance fixe le jour de la série, comme à l'écran)`);
  }
  if (s.exclure_vacances && !ZONES_VACANCES.some((z) => z.value === s.zone_vacances)) erreurs.push(`${ou} : exclure_vacances demande zone_vacances (A, B, C ou Corse)`);
  if (s.tarif_unitaire != null && !(parseFloat(s.tarif_unitaire) > 0)) erreurs.push(`${ou} : tarif_unitaire doit être un prix`);
  if (s.visibilite && !["public", "inscrits", "abonnes", "fideles", "prive"].includes(s.visibilite)) erreurs.push(`${ou} : visibilite inconnue`);
}
const offres = Array.isArray(desc.offres) ? desc.offres : [];
for (const o of offres) {
  const ou = `offre « ${o.nom || "?"} »`;
  if (!o.nom) erreurs.push("offre sans nom");
  if (!["carnet", "abonnement"].includes(o.type)) erreurs.push(`${ou} : type doit être carnet ou abonnement (le prix d'une séance à l'unité vit sur la série, tarif_unitaire)`);
  if (!(parseFloat(o.prix) >= 0)) erreurs.push(`${ou} : prix manquant`);
  if (o.type === "carnet" && !(parseInt(o.seances) > 0)) erreurs.push(`${ou} : un carnet a un nombre de séances`);
  if (o.type === "abonnement") {
    const glissante = !(o.date_debut && o.date_fin);
    if (glissante && !(parseInt(o.duree_jours) > 0)) erreurs.push(`${ou} : un abonnement glissant a une duree_jours (ou date_debut + date_fin pour une saison)`);
    if (o.mode_seances && ![MODE_ILLIMITE, MODE_CADENCE, MODE_TOTAL].includes(o.mode_seances)) erreurs.push(`${ou} : mode_seances doit être illimite, cadence ou total`);
  }
}
if (erreurs.length) { console.error("💥 le fichier n'est pas prêt :\n  · " + erreurs.join("\n  · ")); process.exit(1); }

const typesCours = Array.isArray(desc.page?.types_cours) && desc.page.types_cours.length
  ? desc.page.types_cours.map((t) => String(t).trim()).filter(Boolean)
  : (TYPES_COURS_DEFAUT[studio.metier] || TYPES_COURS_DEFAUT.autre);
// Un type cité par une série ou une offre doit exister dans la liste du studio,
// sinon le formulaire de cours ne le proposera pas et le carnet ne matchera rien.
const typesCites = new Set([...series.map((s) => s.type_cours), ...offres.flatMap((o) => o.types_cours_autorises || [])].filter(Boolean));
for (const t of typesCites) if (!typesCours.includes(t)) erreurs.push(`le type de cours « ${t} » est cité mais absent de page.types_cours`);
if (erreurs.length) { console.error("💥 le fichier n'est pas prêt :\n  · " + erreurs.join("\n  · ")); process.exit(1); }

// ─── occurrences d'une série : la règle exacte de l'écran de création ───────
// (calculerDates de app/(dashboard)/cours/nouveau, mode date_fin, hebdomadaire :
// on inclut chaque date qui tombe le jour de la première séance, on écarte
// fériés puis vacances selon les cases, borne dure 24 mois.)
function datesSerie(s) {
  const incluses = [], exclues = [];
  const start = parseDate(s.date_debut);
  let limite = parseDate(s.date_fin);
  const limiteMax = new Date(start.getFullYear() + 2, start.getMonth(), start.getDate());
  if (limite > limiteMax) limite = limiteMax;
  const cursor = new Date(start);
  const startDay = start.getDay() === 0 ? 7 : start.getDay();
  let safety = 0;
  while (cursor <= limite && safety < 800) {
    safety++;
    const day = cursor.getDay() === 0 ? 7 : cursor.getDay();
    if (day === startDay) {
      const iso = toDateStr(cursor);
      if (s.exclure_feries && estJourFerie(iso)) exclues.push({ date: iso, raison: "férié" });
      else if (s.exclure_vacances && s.zone_vacances && getPeriodeVacances(iso, s.zone_vacances)) exclues.push({ date: iso, raison: getPeriodeVacances(iso, s.zone_vacances).label });
      else incluses.push(iso);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { incluses, exclues };
}

// ─── slug unique : miroir de lib/slug-studio (qui importe sans extension,
// donc illisible depuis Node) ────────────────────────────────────────────────
async function slugUnique(sb, nom, profileId) {
  const brut = slugify(nom || "") || "studio";
  const base = SOUS_DOMAINES_RESERVES.includes(brut) ? `${brut}-studio` : brut;
  let candidat = base, suffixe = 1;
  while (suffixe < 50) {
    const { data, error } = await sb.from("profiles").select("id").eq("studio_slug", candidat).neq("id", profileId).maybeSingle();
    if (error) throw error;
    if (!data) return candidat;
    suffixe += 1; candidat = `${base}-${suffixe}`;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── le plan, lisible avant d'écrire ────────────────────────────────────────
log(`\n${DRY ? "🔍 DRY-RUN (rien ne sera écrit)" : "🚀 PARAMÉTRAGE"} : ${desc.prenom} ${desc.nom || ""} · ${studio.nom} · ${email}`);
log(`   métier ${studio.metier} · ${typeStructure} · ${studio.ville || "ville ?"} (${pays}) · types de cours : ${typesCours.join(", ")}`);
log(`   lieux : ${lieux.length} · séries : ${series.length} · offres : ${offres.length}`);
for (const s of series) {
  const { incluses, exclues } = datesSerie(s);
  log(`   ▸ série « ${s.nom} » (${s.type_cours || "sans type"}) : ${JOURS[s.jour]} ${s.heure}, ${s.duree_minutes} min, ${s.format === "visio" ? "en ligne" : lieux.find((l) => l.cle === s.lieu)?.nom}`
    + `, du ${s.date_debut} au ${s.date_fin} → ${incluses.length} séances${exclues.length ? ` (${exclues.length} écartées : ${exclues.map((e) => `${e.date} ${e.raison}`).slice(0, 4).join(", ")}${exclues.length > 4 ? "…" : ""})` : ""}`
    + `${s.tarif_unitaire ? ` · ${s.tarif_unitaire} € à la séance${s.carnets_acceptes ? " ou carnet" : ""}` : ""}`);
}
for (const o of offres) {
  const det = o.type === "carnet"
    ? `${o.seances} séances${o.duree_jours ? `, ${o.duree_jours} j` : ", sans expiration"}`
    : (o.date_debut && o.date_fin ? `saison ${o.date_debut} → ${o.date_fin}` : `${o.duree_jours} j à partir de la vente`) + `, ${o.mode_seances || MODE_ILLIMITE}`;
  log(`   ▸ offre « ${o.nom} » : ${o.type}, ${o.prix} €, ${det}${o.types_cours_autorises?.length ? ` · vaut pour ${o.types_cours_autorises.join(", ")}` : " · tous les cours"}`);
}
if (Array.isArray(desc.a_confirmer) && desc.a_confirmer.length) {
  log(`\n   ⚠️ À confirmer avec elle (rien n'est inventé pour ces points) :`);
  for (const a of desc.a_confirmer) log(`      · ${a}`);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ─── 1. le compte ───────────────────────────────────────────────────────────
log(`\n1️⃣  Le compte`);
let userId = null, reprise = false;
{
  let page = 1, existant = null;
  while (!existant) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) die("listUsers", error);
    existant = data.users.find((u) => (u.email || "").toLowerCase() === email) || null;
    if (data.users.length < 1000) break;
    page++;
  }
  if (existant) {
    const { data: profil, error } = await sb.from("profiles").select("id, studio_nom, studio_slug, metier").eq("id", existant.id).maybeSingle();
    if (error) die("lecture du profil existant", error);
    if (!profil) die(`un compte ÉLÈVE existe déjà pour ${email} (role ${existant.user_metadata?.role || "?"}). Comme la route concierge : elle ouvre son studio elle-même depuis son espace, ou on prend une autre adresse`);
    userId = existant.id; reprise = true;
    log(`   ↺ compte prof déjà là (${existant.id}, « ${profil.studio_nom || "sans nom"} », slug ${profil.studio_slug || "aucun"}) : reprise, on complète sans recréer`);
  } else if (DRY) {
    log(`   → createUser(${email}, email confirmé, metadata { prenom: « ${desc.prenom} », concierge: true }) puis profil complété (slug « ${slugify(studio.nom)} » ou suffixé)`);
  } else {
    const { data: cree, error } = await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: { prenom: desc.prenom.trim(), concierge: true } });
    if (error) die("createUser", error);
    userId = cree.user.id;
    let profil = null;
    for (let i = 0; i < 20 && !profil; i++) {
      const { data } = await sb.from("profiles").select("id").eq("id", userId).maybeSingle();
      profil = data; if (!profil) await new Promise((r) => setTimeout(r, 500));
    }
    if (!profil) die("le trigger handle_new_user n'a pas créé le profil en 10 s (compte auth créé : " + userId + ")");
    log(`   ✅ compte créé ${userId}, profil posé par le trigger (essai de 30 jours démarré)`);
  }
}

// ─── 2. le profil et la page ────────────────────────────────────────────────
log(`\n2️⃣  Le profil et la page publique`);
let slug = null;
if (!DRY) {
  const { data: actuel } = await sb.from("profiles").select("studio_slug, studio_nom").eq("id", userId).single();
  slug = actuel?.studio_slug || await slugUnique(sb, studio.nom, userId);
  const coeur = {
    prenom: desc.prenom.trim(), nom: desc.nom?.trim() || null,
    studio_nom: studio.nom.trim(), studio_slug: slug, metier: studio.metier,
    types_cours: typesCours, portail_actif: true,
    ville: studio.ville || null, code_postal: studio.code_postal || null, adresse: studio.adresse || null,
    telephone: desc.telephone || null,
  };
  const { data: maj, error } = await sb.from("profiles").update(coeur).eq("id", userId).select("id, studio_slug");
  if (error || !maj?.length) die("mise à jour du profil", error || { message: "0 ligne" });
  log(`   ✅ profil : ${studio.nom} · slug ${slug} · ${studio.ville || ""} · types de cours posés`);

  // Colonnes plus récentes, écrites À PART : si l'une manque sur une base en
  // retard, le cœur ci-dessus est déjà en place (leçon v95 / v105).
  const page = desc.page || {};
  const suite = {
    type_structure: typeStructure, pays,
    bio: page.bio || null, philosophie: page.philosophie || null, formations: page.formations || null,
    annees_experience: page.annees_experience ?? null,
    website_url: page.website_url || null, instagram_url: page.instagram_url || null, facebook_url: page.facebook_url || null,
    portail_message: page.portail_message || undefined,
    afficher_tarifs: page.afficher_tarifs ?? undefined,
    zone_vacances_default: series.find((s) => s.exclure_vacances)?.zone_vacances || undefined,
  };
  for (const k of Object.keys(suite)) if (suite[k] === undefined) delete suite[k];
  const { data: maj2, error: e2 } = await sb.from("profiles").update(suite).eq("id", userId).select("id");
  if (e2 || !maj2?.length) die("mise à jour de la page publique", e2 || { message: "0 ligne" });
  log(`   ✅ page : ${[page.bio && "bio", page.formations && "formations", page.website_url && "site", page.instagram_url && "instagram", page.facebook_url && "facebook", page.portail_message && "message d'accueil", page.afficher_tarifs && "tarifs affichés"].filter(Boolean).join(", ") || "rien de plus"}`);
} else {
  const page = desc.page || {};
  log(`   → profil : prénom, nom, studio, slug, métier, ville, téléphone, ${typesCours.length} types de cours, portail actif`);
  log(`   → page : ${[page.bio && "bio", page.formations && "formations", page.website_url && "site", page.instagram_url && "instagram", page.facebook_url && "facebook", page.portail_message && "message d'accueil", page.afficher_tarifs && "tarifs affichés"].filter(Boolean).join(", ") || "rien de plus"}`);
}

// ─── 3. les lieux ───────────────────────────────────────────────────────────
log(`\n3️⃣  Les lieux`);
const lieuId = {}; // cle → id
{
  const { data: existants, error } = userId ? await sb.from("lieux").select("id, nom, salle_de").eq("profile_id", userId) : { data: [] };
  if (error) die("lecture des lieux", error);
  let ordre = existants?.length || 0;
  for (const l of lieux) {
    const deja = (existants || []).find((x) => !x.salle_de && x.nom.trim().toLowerCase() === l.nom.trim().toLowerCase());
    if (deja) { lieuId[l.cle] = deja.id; log(`   ↺ « ${l.nom} » déjà là`); continue; }
    if (DRY) { log(`   → « ${l.nom} »${l.adresse ? `, ${l.adresse}` : ""}${l.ville ? `, ${l.ville}` : ""}`); continue; }
    const { data, error: e } = await sb.from("lieux").insert({ profile_id: userId, nom: l.nom.trim(), adresse: l.adresse || null, ville: l.ville || null, actif: true, ordre: ordre++ }).select("id").single();
    if (e || !data) die(`lieu « ${l.nom} »`, e);
    lieuId[l.cle] = data.id;
    log(`   ✅ « ${l.nom} »`);
  }
}

// ─── 4. les séries ──────────────────────────────────────────────────────────
log(`\n4️⃣  Les séries`);
{
  const { data: existantes, error } = userId ? await sb.from("recurrences").select("id, nom, heure, jours_semaine").eq("profile_id", userId) : { data: [] };
  if (error) die("lecture des séries", error);
  for (const s of series) {
    const deja = (existantes || []).find((r) => r.nom.trim().toLowerCase() === s.nom.trim().toLowerCase() && String(r.heure).slice(0, 5) === s.heure && (r.jours_semaine || []).includes(s.jour));
    const { incluses, exclues } = datesSerie(s);
    if (deja) { log(`   ↺ « ${s.nom} » ${JOURS[s.jour]} ${s.heure} déjà posée (${deja.id})`); continue; }
    if (DRY) { log(`   → « ${s.nom} » : récurrence + ${incluses.length} séances (${incluses[0]} → ${incluses.at(-1)})`); continue; }
    const estVisio = s.format === "visio";
    const lieu = estVisio ? null : lieux.find((l) => l.cle === s.lieu);
    const { data: rec, error: eRec } = await sb.from("recurrences").insert({
      profile_id: userId, nom: s.nom.trim(), type_cours: s.type_cours || null, heure: s.heure,
      duree_minutes: parseInt(s.duree_minutes), lieu_id: estVisio ? null : lieuId[s.lieu], client_pro_id: null,
      capacite_max: s.capacite_max ? parseInt(s.capacite_max) : null,
      frequence: "hebdomadaire", jours_semaine: [s.jour], intervalle: 1,
      date_debut: s.date_debut, date_fin: s.date_fin, nb_occurrences: null,
      exclure_vacances: !!s.exclure_vacances, exclure_feries: !!s.exclure_feries,
      zone_vacances: s.exclure_vacances && s.zone_vacances ? s.zone_vacances : null, actif: true,
    }).select("id").single();
    if (eRec || !rec) die(`récurrence « ${s.nom} »`, eRec);
    const rows = incluses.map((date) => ({
      profile_id: userId, nom: s.nom.trim(), type_cours: s.type_cours || null, date, heure: s.heure,
      duree_minutes: parseInt(s.duree_minutes),
      lieu: estVisio ? null : (lieu?.nom || null), lieu_id: estVisio ? null : lieuId[s.lieu],
      format: estVisio ? "visio" : "presentiel", client_pro_id: null,
      capacite_max: s.capacite_max ? parseInt(s.capacite_max) : null,
      recurrence_parent_id: rec.id, est_annule: false, visibilite: s.visibilite || "public",
      tarif_unitaire: s.tarif_unitaire ? parseFloat(s.tarif_unitaire) : null,
      carnets_acceptes: s.tarif_unitaire ? s.carnets_acceptes === true : false,
      stripe_payment_link_unit: null, notes: s.notes || null,
    }));
    const { data: crees, error: eCours } = await sb.from("cours").insert(rows).select("id");
    if (eCours || (crees?.length || 0) !== rows.length) {
      await sb.from("recurrences").delete().eq("id", rec.id); // compensation : jamais une série fantôme
      die(`séances de « ${s.nom} » (récurrence retirée)`, eCours || { message: `${crees?.length || 0}/${rows.length} écrites` });
    }
    if (estVisio && s.lien_visio) {
      // Patron poserLienVisio v86 : UPDATE séparé, jamais dans l'insert.
      const { error: eV } = await sb.from("cours").update({ lien_visio: s.lien_visio, lien_visio_verrouille: s.lien_visio_verrouille !== false }).in("id", crees.map((c) => c.id));
      if (eV) log(`   ⚠️ lien visio non posé : ${eV.message}`);
    }
    log(`   ✅ « ${s.nom} » : ${crees.length} séances ${JOURS[s.jour]} ${s.heure} (${incluses[0]} → ${incluses.at(-1)})${exclues.length ? `, ${exclues.length} écartées` : ""}`);
  }
}

// ─── 5. les offres ──────────────────────────────────────────────────────────
log(`\n5️⃣  Les offres`);
{
  const { data: existantes, error } = userId ? await sb.from("offres").select("id, nom").eq("profile_id", userId) : { data: [] };
  if (error) die("lecture des offres", error);
  let ordre = existantes?.length || 0;
  for (const o of offres) {
    const deja = (existantes || []).find((x) => x.nom.trim().toLowerCase() === o.nom.trim().toLowerCase());
    if (deja) { log(`   ↺ « ${o.nom} » déjà là (${deja.id})`); continue; }
    if (DRY) { log(`   → « ${o.nom} »`); continue; }
    // Le même payload que app/(dashboard)/offres/nouveau.
    const payload = { profile_id: userId, nom: o.nom.trim(), type: o.type, prix: parseFloat(o.prix), actif: true, ordre: ordre++ };
    if (o.type === "carnet") {
      payload.seances = parseInt(o.seances);
      payload.prix_unitaire_ref = o.prix_unitaire_ref ? parseFloat(o.prix_unitaire_ref) : null;
      payload.duree_jours = o.duree_jours ? parseInt(o.duree_jours) : null;
    }
    if (o.types_cours_autorises?.length) payload.types_cours_autorises = o.types_cours_autorises;
    if (o.type === "abonnement") {
      const glissante = !(o.date_debut && o.date_fin);
      payload.date_debut = glissante ? null : o.date_debut;
      payload.date_fin = glissante ? null : o.date_fin;
      payload.duree_jours = glissante ? parseInt(o.duree_jours) : (o.duree_jours ? parseInt(o.duree_jours) : null);
      Object.assign(payload, payloadSeances({ mode: o.mode_seances || MODE_ILLIMITE, total: o.seances, cadence: o.seances_par_semaine }));
      payload.inclut_vacances = o.inclut_vacances !== false;
      payload.pro_rata_actif = false; payload.pro_rata_date_limite = null;
    }
    const { data, error: e } = await sb.from("offres").insert(payload).select("id").single();
    if (e || !data) die(`offre « ${o.nom} »`, e);
    log(`   ✅ « ${o.nom} » : ${o.prix} €`);
  }
}

// ─── fin : ce qui reste à l'humain ──────────────────────────────────────────
if (DRY) {
  log(`\n🔍 Dry-run terminé : rien n'a été écrit. Relance sans --dry-run pour monter l'espace.`);
  process.exit(0);
}
const { data: fin } = await sb.from("profiles").select("id, studio_slug, studio_nom, trial_started_at").eq("id", userId).single();
const [{ count: nLieux }, { count: nSeries }, { count: nCours }, { count: nOffres }] = await Promise.all([
  sb.from("lieux").select("id", { count: "exact", head: true }).eq("profile_id", userId),
  sb.from("recurrences").select("id", { count: "exact", head: true }).eq("profile_id", userId),
  sb.from("cours").select("id", { count: "exact", head: true }).eq("profile_id", userId).eq("est_annule", false),
  sb.from("offres").select("id", { count: "exact", head: true }).eq("profile_id", userId).eq("actif", true),
]);
log(`\n✅ Espace ${reprise ? "complété" : "monté"} : « ${fin.studio_nom} » (${fin.id})`);
log(`   en base : ${nLieux} lieu(x), ${nSeries} série(s), ${nCours} séance(s), ${nOffres} offre(s) · essai démarré le ${String(fin.trial_started_at).slice(0, 10)}`);
log(`   page publique : ${SITE}/p/${fin.studio_slug}`);
log(`   fiche admin  : ${SITE}/admin/studios/${fin.id}`);

const resultat = { profileId: fin.id, slug: fin.studio_slug, email, date: new Date().toISOString(), lieux: nLieux, series: nSeries, seances: nCours, offres: nOffres };
const sortie = fichier.replace(/\.json$/, ".resultat.json");
writeFileSync(sortie, JSON.stringify(resultat, null, 2) + "\n");
log(`   résultat noté dans ${basename(sortie)}`);

if (LIEN) {
  // Le même lien que la route /api/admin/studios/appropriation : recovery,
  // usage unique, qui atterrit sur la page à bouton /auth/ouvrir (2026-09-08 :
  // un robot de messagerie ne peut pas le consommer à sa place).
  const { data: lien, error } = await sb.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: `${SITE}/auth/callback?type=recovery` } });
  if (error) die("generateLink", error);
  log(`\n🔗 Lien d'appropriation (usage unique, à envoyer À ELLE et à personne d'autre) :\n   ${lien.properties.action_link}`);
  log(`   Il lui fait choisir son mot de passe puis l'amène sur son tableau de bord. Un second --lien invalide le précédent.`);
} else {
  log(`\n➡️  Reste à toi : vérifier l'espace (« Se connecter à ce studio » sur la fiche admin), puis lui envoyer son accès :`);
  log(`   · par email : fiche admin → « Envoyer le lien d'appropriation » (email signé IziSolo, réponse vers bonjour@)`);
  log(`   · par DM    : relance avec --lien pour obtenir le lien à coller`);
}
