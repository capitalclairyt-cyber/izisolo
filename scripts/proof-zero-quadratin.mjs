/* Preuve « zéro tiret quadratin » (règle immuable Colin, 2026-08-19).
 *
 * Deux mesures, complémentaires :
 *   A. STATIQUE  — relit les sources des surfaces vues par une prof ou une
 *      élève et compte les tirets quadratins hors commentaires. Les seuls
 *      restes tolérés sont listés (et justifiés) dans TOLERES ci-dessous.
 *   B. RENDU     — ouvre les pages publiques pilotées par le CODE dans un
 *      vrai navigateur et lit leur innerText. Le juge est le DOM rendu, pas
 *      le fichier source (piège §12 : le HTML brut de dev porte les logs
 *      serveur, et innerText est le seul texte réellement lu par un humain).
 *
 * Hors périmètre, volontairement :
 *   - les commentaires de code et les logs serveur (jamais lus par une prof) ;
 *   - content/blog/*.md et content/cities*.js : contenu éditorial publié,
 *     en attente d'un feu vert de Colin ;
 *   - le glyphe « — » employé SEUL comme valeur absente dans un tableau,
 *     et la liste blanche de caractères de lib/factures.js (elle protège les
 *     snapshots de factures déjà émises).
 *
 * Phase B : lancer un build prod local sur :3333 avant (npm run build puis
 * npx next start -p 3333). Sans serveur, la phase B est ignorée, pas ratée.
 */
import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright'

const D = '\u2014'
let ko = 0
const ok = (cond, label) => { console.log((cond ? '✅' : '❌') + ' ' + label); if (!cond) ko++ }

// ── A. Sources ────────────────────────────────────────────────────────────
const RACINES = ['app/(dashboard)', 'app/(auth)', 'app/(legal)', 'app/p', 'app/embed',
  'components', 'lib', 'content/faq-support.js', 'content/faq.js']

// Chemins:ligne tolérés, avec la raison. Toute NOUVELLE ligne fait échouer.
const TOLERES = [
  'lib/factures.js',                                  // liste blanche PDF
  'lib/facture-pdf.js',                               // cellule vide d'un PDF
  'lib/regles-metier.js',                             // libellé inconnu
  'app/(dashboard)/clients/[id]/FicheClientClient.js',// mode de paiement vide
  'app/(dashboard)/clients/importer/page.js',         // cellule vide d'aperçu
  'app/embed/[studioSlug]/EmbedPlanning.js',          // jour sans séance
  'app/p/[studioSlug]/PortailHome.js',                // jour sans séance
  'components/push/NotifPrefsPanel.js',               // case sans canal
]

const fichiers = []
const parcourir = (p) => {
  const st = fs.statSync(p)
  if (st.isDirectory()) { for (const e of fs.readdirSync(p)) parcourir(path.join(p, e)); return }
  if (/\.(js|jsx|mjs|css)$/.test(p) && !p.endsWith('.bak')) fichiers.push(p)
}
for (const r of RACINES) if (fs.existsSync(r)) parcourir(r)

const restes = []
for (const f of fichiers.sort()) {
  const lignes = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  let bloc = false
  lignes.forEach((l, i) => {
    const avantBloc = bloc
    const o = l.lastIndexOf('/*'), c = l.lastIndexOf('*/')
    if (o !== -1 && (c === -1 || c < o)) bloc = true
    else if (c !== -1 && c > o) bloc = false
    if (avantBloc || !l.includes(D)) return
    let k = -1
    while ((k = l.indexOf(D, k + 1)) !== -1) {
      const avant = l.slice(0, k)
      const commentaire = /(^|[^:])\/\//.test(avant) || avant.includes('/*') || avant.trimStart().startsWith('*')
      const journal = /console\.(log|warn|error)|reportError\(|\bdie\(|^\s*log\(/.test(l)
      if (commentaire || journal) continue
      restes.push(f.split(path.sep).join('/') + ':' + (i + 1) + '  ' + l.trim().slice(0, 110))
    }
  })
}
const inattendus = restes.filter(r => !TOLERES.some(t => r.startsWith(t + ':')))
ok(inattendus.length === 0, 'Sources : aucun tiret quadratin hors commentaires et hors tolérés'
  + (inattendus.length ? '\n   ' + inattendus.join('\n   ') : ' (' + restes.length + ' toléré·es)'))

// ── B. Rendu ──────────────────────────────────────────────────────────────
const BASE = 'http://localhost:3333'
const PAGES = ['/', '/calculateur', '/coachs-bien-etre', '/logiciel-gestion-prof-yoga',
  '/creer-mon-studio', '/legal/mentions', '/legal/cgu', '/legal/cgv', '/legal/rgpd',
  '/unsubscribe', '/login', '/register']

let debout = false
try { debout = (await fetch(BASE + '/', { method: 'HEAD' })).ok } catch { debout = false }
if (!debout) {
  console.log('⏭  Phase B ignorée : aucun serveur sur ' + BASE + ' (npm run build puis npx next start -p 3333)')
} else {
  const nav = await chromium.launch({ channel: 'msedge' })
  const page = await nav.newPage({ viewport: { width: 1280, height: 900 } })
  for (const url of PAGES) {
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded' })
    const txt = await page.evaluate(() => document.body.innerText)
    const n = (txt.match(new RegExp(D, 'g')) || []).length
    const i = txt.indexOf(D)
    ok(n === 0, 'Rendu ' + url + (n ? ' → ' + n + ' : …' + txt.slice(Math.max(0, i - 60), i + 60).replace(/\s+/g, ' ') + '…' : ''))
  }
  await nav.close()
}

console.log(ko ? '\n❌ ' + ko + ' contrôle(s) en échec' : '\n🎉 TOUT VERT')
process.exit(ko ? 1 : 0)
