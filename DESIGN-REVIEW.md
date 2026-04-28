# IziSolo — Plan complet de l'application

> Document destiné à un brief de design (Claude Design ou autre).
> Décrit toutes les pages, leur contenu, et les interactions clés.
> Mis à jour : avril 2026.

> **Screenshots inclus** : 24 captures (12 pages publiques × desktop+mobile)
> dans `docs/screenshots/`. Capturées via [`scripts/capture-screenshots.mjs`](scripts/capture-screenshots.mjs)
> (Playwright headless, dev server localhost:3333). Pour les pages pro
> protégées par auth, voir §9 *Capturer les pages pro*.

---

## 1. Identité produit

**IziSolo** est un SaaS français pour praticien·nes indépendant·es du bien-être —
profs de yoga, pilates, méditation, danse, coachs, thérapeutes. Outil de gestion
calme, beau, mobile-first qui remplace les tableurs Excel et Momoyoga (jugé trop
cher / trop compliqué par la cible).

**Positionnement** : moins d'admin, plus de présence. L'app fait le boulot
ingrat (relances, paiements, planning) pour que la prof reste sur ce qu'elle
aime.

**Personas** :
- **Pro** (90 % de l'usage) — la prof qui gère son studio depuis son tel
- **Élève inscrit** — réserve, paye, voit son historique
- **Élève invité** — réserve sans compte (juste email)
- **Visiteur prospect studio** — découvre la page publique du studio
- **Visiteur prospect SaaS** — découvre IziSolo (landing)
- **Admin Mélutek** — gère les comptes pros, plans, support

**Plans tarifaires** :
- Free — 25 élèves, sans CB
- Solo — 9 €/mois (mensuel) ou 7,20 €/mois (annuel −20 %)
- Pro — 19 €/mois ou 15,20 €/mois

**Identité visuelle actuelle** :
- **Palette "sable"** : tons rosés-sable doux (`--brand` ≈ `#d4a0a0`,
  `--brand-light`, fonds crémeux `#faf8f5`)
- **Polices** : *Instrument Serif* (titres, accents émotionnels) +
  *Geist Sans* (UI, lecture) + *Geist Mono* (code, montants tabular-nums)
- **Atmosphère** : tactile, chaleureux, jamais corporate. Inspirations :
  Notion, Linear pour la fonction ; Headspace, Calm pour l'âme.

---

## 2. Architecture des routes (50 pages)

### 🌍 Public marketing & SEO

| Route | Description |
|---|---|
| `/` | Landing principale — pitch, features, témoignages, CTA inscription |
| `/profs-de-yoga` | SEO long-tail — "logiciel pour profs de yoga" |
| `/profs-de-pilates` | SEO long-tail |
| `/coachs-bien-etre` | SEO long-tail |
| `/therapeutes` | SEO long-tail |
| `/legal/cgu` | Conditions générales d'utilisation |
| `/legal/cgv` | Conditions générales de vente |
| `/legal/mentions` | Mentions légales |
| `/legal/rgpd` | Politique RGPD |
| `/offline` | Page de fallback PWA hors-ligne |

### 🔑 Authentification

| Route | Description |
|---|---|
| `/login` | Connexion (email + password ou magic link) |
| `/register` | Inscription studio — promet "essai gratuit 25 élèves" |
| `/mot-de-passe-oublie` | Demande de reset |
| `/nouveau-mot-de-passe` | Saisie du nouveau mdp depuis le lien email |
| `/onboarding` | Premier setup post-inscription (nom studio, métier, slug, vocabulaire) |

### 🎓 Espace public studio (côté élève / visiteur)

| Route | Description |
|---|---|
| `/p/[studioSlug]` | Portail public du studio |
| `/p/[studioSlug]/connexion` | Connexion espace élève (magic link) |
| `/p/[studioSlug]/cours/[coursId]` | Détail cours + bouton réserver |
| `/p/[studioSlug]/espace` | Mes réservations, mon abo, mes paiements (élève connecté) |
| `/p/[studioSlug]/sondage/[sondageSlug]` | Sondage planning idéal — vote oui/peut-être/non |

### 👤 Dashboard pro (auth requis)

**Accueil & navigation**

| Route | Description |
|---|---|
| `/dashboard` | Accueil — stats du jour, alertes, cours à venir, CTA |
| `/agenda` | Vue calendrier mensuelle / hebdomadaire / journée |
| `/plus` | Menu mobile (équivalent du sidebar desktop) |

**Gestion des cours**

| Route | Description |
|---|---|
| `/cours` | Onglets Récurrents / Ponctuels |
| `/cours/nouveau` | Création (cours unique ou série récurrente) |
| `/cours/[coursId]` | Détail + édition + annulation |
| `/cours/recurrences` | **Calendrier mensuel d'édition d'une série** : ajout/retrait par jour avec exclusions vacances scolaires |
| `/pointage/[coursId]` | Feuille de présence — marquer présents/absents/en retard |

**Gestion des élèves & ventes**

| Route | Description |
|---|---|
| `/clients` | Liste élèves avec filtres et recherche |
| `/clients/nouveau` | Ajout |
| `/clients/[id]` | Fiche complète (infos, abos, paiements, historique présence) |
| `/clients/[id]/edit` | Édition |
| `/abonnements` | Suivi des forfaits actifs (crédits restants, dates d'expiration) |
| `/offres` | Catalogue : carnets, abonnements, cours à l'unité (chacun avec lien Stripe) |
| `/offres/nouveau` | Création d'offre |
| `/revenus` | Comptabilité : tous les paiements + filtres + export CSV |
| `/revenus/nouveau` | Saisie manuelle |
| `/evenements` | Stages, ateliers, événements ponctuels (différent des cours) |

**Communication & marketing**

| Route | Description |
|---|---|
| `/communication` | Hub mailing avec templates et variables {{prenom}} {{cours_nom}} |
| `/mailing` | Alias historique (à fusionner) |
| `/sondages` | Liste des sondages "Planning idéal" |
| `/sondages/nouveau` | **Builder calendrier visuel** — clic case = ajoute créneau |
| `/sondages/[sondageId]` | Résultats + bouton "convertir le gagnant en série" |
| `/assistant` | Assistant IA Claude pour rédaction emails, conseils gestion |
| `/videos` | Bibliothèque de vidéos cours (gratuites ou payantes) |

**Compte & support**

| Route | Description |
|---|---|
| `/parametres` | Settings — long, multi-onglets (voir détail §3.6) |
| `/support` | Création de tickets de support |

### 🔧 Admin Mélutek

| Route | Description |
|---|---|
| `/admin` | Tableau de bord (nb pros, MRR estimé, tickets ouverts) |
| `/admin/users` | Liste pros — passage manuel des plans (free/solo/pro/studio/premium) |
| `/admin/plans` | Vue agrégée par plan |
| `/admin/stats` | Stats produit (signups, cours créés, sondages, etc.) |
| `/admin/support-tickets` | Inbox des tickets, réponse + email auto |

---

## 3. Détail des pages clés

### 3.1 Landing `/`

**But** : convertir un prof curieux en inscrit (essai gratuit 25 élèves).

| Desktop | Mobile |
|---|---|
| ![Landing desktop](docs/screenshots/landing-desktop.jpg) | ![Landing mobile](docs/screenshots/landing-mobile.jpg) |

**Sections (verticales) :**
1. **Hero** — Phrase forte ("Moins d'admin. Plus de présence."), mockup
   d'écran principal, deux CTA : "Essai gratuit" + "Voir une démo"
2. **3 piliers** — Agenda · Élèves · Paiements (pictos, 1 phrase chacun)
3. **Mockup interactif** — Capture d'écran du dashboard avec annotations
4. **Pour qui ?** — 4 cards (yoga / pilates / coachs / thérapeutes)
   pointant vers les pages SEO
5. **Pricing** — 3 plans avec toggle Mensuel / Annuel (−20 %)
6. **Témoignages** — 3 quotes profs (avec photo, ville, métier)
7. **FAQ** — 5-6 questions clés
8. **CTA final** + footer

**Tone** : doux, rassurant, jamais "growth hacker". Pas d'emojis criards,
pas de "🚀". Espacements généreux.

---

### 3.1bis Pages SEO `/profs-de-yoga`, `/profs-de-pilates`, `/coachs-bien-etre`, `/therapeutes`

**But** : capter le trafic long-tail "logiciel pour prof de yoga" et
adapter le pitch à chaque métier (vocabulaire, exemples, tarifs).
Toutes les 4 partagent la même structure mais avec une personnalisation
forte du wording.

**Variante yoga** (les 3 autres suivent le même squelette) :

| Desktop | Mobile |
|---|---|
| ![SEO yoga desktop](docs/screenshots/seo-yoga-desktop.jpg) | ![SEO yoga mobile](docs/screenshots/seo-yoga-mobile.jpg) |

**Sections (toutes les pages SEO) :**
1. **Hero** — titre adapté au métier ("L'outil de gestion fait pour les yogis"),
   accroche, 2 CTA (essai + en savoir plus)
2. **Pour [métier]** — 4 cards bénéfices (vocabulaire métier, journée plus
   légère, portail élève, annulation auto)
3. **Cas d'usage concrets** — 4 scenarios numérotés ("Ouvre un Vinyasa hebdo
   en 30 secondes", "Pointage en fin de cours"…)
4. **Tarifs** — pricing 3 plans (toggle Mensuel/Annuel)
5. **FAQ** — 6 questions ciblées métier
6. **CTA final** — "Lance ton studio en 5 minutes"
7. Footer

Voir aussi :
- ![SEO pilates desktop](docs/screenshots/seo-pilates-desktop.jpg)
- ![SEO coachs desktop](docs/screenshots/seo-coachs-desktop.jpg)
- ![SEO thérapeutes desktop](docs/screenshots/seo-therapeutes-desktop.jpg)

### 3.1ter Pages auth `/login`, `/register`, `/mot-de-passe-oublie`

**But** : friction minimale, ton chaleureux, pas corporate.

| Login | Register | Mot de passe |
|---|---|---|
| ![Login desktop](docs/screenshots/login-desktop.jpg) | ![Register desktop](docs/screenshots/register-desktop.jpg) | ![Mot de passe desktop](docs/screenshots/mot-de-passe-desktop.jpg) |

**Composition login** : card centrée, logo + "Content de te revoir !",
champs Email + Mot de passe, bouton primaire, "Mot de passe oublié ?",
"Recevoir un lien par email" (magic link), "Pas encore de compte ?
Créer mon studio".

**Composition register** : "Lance ton studio", champ studio_nom + email +
mot de passe, baseline "Free 25 élèves, sans CB", lien vers login.

**Note design** : actuellement très standard, peu de personnalité visuelle.
Mériterait d'être habillé (illustration discrète à côté ? phrase d'accroche
plus forte ? micro-interaction sur le bouton ?) sans rentrer dans le sur-design.

---

### 3.2 Dashboard pro `/dashboard`

**But** : un coup d'œil le matin, et tu sais quoi faire de ta journée.

**Composition (mobile-first) :**
- **Header** — avatar + "Bonjour {prenom}" + date du jour
- **Checklist d'onboarding** (dismissable, visible seulement si setup incomplet)
- **CTA "Planning idéal"** — visible tant qu'aucun sondage créé
- **Bandeau d'alertes** — élèves avec crédits faibles, abos qui expirent
- **3 stat cards** — Séances du jour · Inscrits · Revenus du mois
- **Widget "Mes coûts ce mois"** — SMS envoyés (€) + Frais IziSolo (1 % paiements en ligne) + Total
- **Section "Tes séances aujourd'hui"** — liste avec bouton "Pointer"
- **Widget portail élève** — URL copiable + bouton voir
- **FAB ronde** en bas à droite : nouveau cours

### 3.3 Création de cours `/cours/nouveau`

**Important** : la prof doit pouvoir créer un cours en 30 secondes sans réfléchir.

**Flow :**
1. **Type de cours** — chips horizontales (Yoga vinyasa, Hatha, Pilates…)
   avec bouton "+ Nouveau type" inline
2. **Nom** (auto-rempli depuis le type)
3. **Date + heure + durée** — defaults intelligents (date du jour, 18h,
   60min)
4. **Lieu** — sélecteur lieux + bouton "+ Ajouter un lieu"
5. **Capacité max** (optionnel)
6. **Récurrence** — 6 boutons (Cours unique / Chaque semaine / Toutes les 2
   semaines / Tous les jours / Une fois par mois / Personnalisé)
7. **Si récurrent** :
   - Tabs : "Nombre de cours" (ex: 12) ou "Jusqu'à une date"
   - Toggle "Sauter les vacances scolaires" + select Zone (A/B/C/Corse)
   - Toggle "Sauter les jours fériés"
   - **Aperçu live** : "12 cours seront créés" + 8 premières dates +
     badge "3 dates sautées" avec liste type "Toussaint 2025"
8. **Notes** (textarea)
9. CTA : "Créer le cours" / "Créer la série"

### 3.4 Calendrier édition récurrence `/cours/recurrences`

**But** : gérer une série de cours en mode visuel (ajout/suppression à la pièce).

**Composition :**
- **Liste horizontale des séries** (chips scrollables) avec compteur "X à
  venir" et état actif/pause
- **Card de la série sélectionnée** : nom, fréquence, heure, durée +
  toggle pause + bouton supprimer + tags exclusions actives
- **Compteur** : "N cours sur les 12 prochains mois"
- **Calendrier mensuel** :
  - 1 cellule par jour
  - Dot rose plein si cours prévu
  - Fond jaune si vacances de la zone
  - Fond rouge si jour férié
  - Hover → bouton `+` (ajouter) ou `×` (retirer) en 1 clic
  - Navigation mois précédent / suivant
- **Légende** en bas

### 3.5 Sondage "Planning idéal" — Builder pro `/sondages/nouveau`

**But** : trouver les meilleurs créneaux en sondant les élèves.

**Composition :**
- **Card meta** : titre, message d'intro, date limite
- **Visibilité** : 3 options radio (inscrits / mixte / public)
- **Calendrier hebdomadaire éditable** — nouveauté UX
  - Grille 7 jours × tranches 30min de 6h à 23h
  - Click case vide → ajoute créneau 1h
  - Mini popup pour éditer type de cours / durée
  - Bouton X pour supprimer
  - Pas de limite : 30 créneaux possibles
- CTA : "Créer le sondage"

### 3.6 Sondage — Vote élève `/p/[slug]/sondage/[slug]`

**Composition :**
- Header studio (mini)
- Card intro avec icône Sparkles + titre + message du pro
- **Calendrier hebdomadaire en mode vote** :
  - Mêmes créneaux affichés visuellement
  - Click sur un créneau cycle : vide → Oui (vert) → Peut-être (orange) → Non (rouge) → vide
- Form identification (visiteur anonyme : email obligatoire + honeypot caché)
- Commentaire libre
- **Sticky bar en bas** avec compteurs "X oui / Y peut-être" + bouton "Envoyer"

### 3.7 Sondage — Résultats `/sondages/[id]`

- Bandeau lien public copiable + bouton "Voir la page"
- Liste des créneaux **triés par score** (`oui×2 + peut_etre×1`)
- Médaille 🥇 sur le gagnant
- Pour chaque créneau :
  - Titre (Mardi 19h30 · Yoga doux · 60min)
  - Score en gros
  - **Barre stack** vert/orange/rouge proportionnelle
  - Chips compteurs `oui`, `peut-être`, `non`
  - **Bouton "Créer la série hebdomadaire"** → ouvre `/cours/nouveau`
    pré-rempli (date prochaine occurrence, heure, type, fréquence)
- Section commentaires (collapse)
- Actions clore / supprimer

### 3.8 Paramètres `/parametres`

Section la plus dense. Multi-onglets :
- **Profil** — nom studio, slug, métier, vocabulaire, photo, couleurs (palette)
- **Page publique** — bio, philosophie, formations, années d'expérience,
  horaires, FAQ, réseaux sociaux. **Bouton "Voir l'aperçu"** qui ouvre
  `/p/[slug]?preview=1` avec brouillon
- **Lieux** — multi-lieux (studios, salles, partenaires)
- **Types de cours** — éditeur de catégories + items
- **Notifications élèves** — table type × canal (email/SMS) + master toggle
  SMS off + seuil mensuel (anti-explosion facture) + compteur conso
- **Règles automatiques** — système SI/ALORS (4 conditions, 7 actions)
- **Règles d'annulation** — délai en heures avant le cours pour
  annulation libre (l'app joue le "méchant", pas la prof)
- **Templates communication** — éditeur emails/SMS avec variables
- **Paiement en ligne** — config Stripe Payment Link (URL webhook + secret)
- **Abonnement** — 3 cards plans (Free/Solo/Pro) avec toggle annuel −20 %
- **Apparences** — thème visuel (palette, illustration sidebar)
- **Général** — alertes seuils, anniversaires, etc.

### 3.9 Portail public studio `/p/[slug]`

**Vu par** : élève déjà client, élève potentiel, visiteur curieux.

**Composition :**
- **Bandeau sondage actif** (si applicable) — "✨ Aide {studio} à
  construire son planning" — CTA fort vers la page sondage
- **Header studio** : avatar/photo, nom, métier, ville, lien Instagram/FB/site
- **Filtres** : barre recherche + chips types de cours
- **Liste cours à venir (60 jours)** groupés par jour :
  - Cards avec heure, durée, lieu, places restantes
  - Bouton "Réserver" → `/p/[slug]/cours/[id]`
- **Section "À propos"** (si bio renseignée) — formations, philosophie
- **Section "Tarifs"** (si activée) — cards offres
- **Section "FAQ"** — accordéons
- **Footer** : "Propulsé par IziSolo"

### 3.10 Espace élève connecté `/p/[slug]/espace`

- Mes réservations à venir (avec bouton annuler si délai OK)
- Mon abonnement actuel + crédits restants + date d'expiration
- Mes paiements (avec téléchargement facture PDF)
- Liste d'attente (si inscrit sur des cours complets)
- Bouton déconnexion

---

## 4. Composants transverses

| Composant | Usage |
|---|---|
| **BottomNav** (mobile) | 4 items : Accueil · Agenda · Élèves · Plus (drawer) |
| **Sidebar** (desktop ≥1024px) | Logo, sections (Accueil, Cours, Gestion, Communication), Support, Paramètres, Déconnexion, illustration au pied |
| **FAB** | Bouton flottant rond pour action principale contextuelle |
| **Toast** | Notifications éphémères (success / error / warning / info) |
| **NotificationBell** | Cloche dans header avec badge nombre de notifs non lues |
| **PhotoUploader** | Upload Vercel Blob avec resize canvas client (max 1024×1024) |
| **CalendarBuilder** | Calendrier hebdo éditable utilisé par sondages (modes edit/vote/results) |

---

## 5. Workflows transversaux clés

### Création cours → réservation → présence
```
Pro crée cours (récurrent + exclu vacances)
  → Cours apparaît sur portail public
  → Élève réserve
  → Pro pointe la présence (1 clic depuis dashboard ou agenda)
  → Décompte automatique du crédit / abo
```

### Sondage → conversion 1-clic
```
Pro crée sondage (calendrier visuel)
  → Partage le lien (email, Instagram…)
  → Élèves votent
  → Pro voit gagnant
  → Click "Créer la série" → /cours/nouveau pré-rempli → confirmation
```

### Notifications automatiques (cron quotidien 8h UTC)
```
Cours annulé par pro → email + SMS immédiats aux inscrits
Crédits faibles      → email/SMS si reste ≤ seuil profil
Expiration abo       → email/SMS si date_fin ≤ now + N jours
Règles SI/ALORS      → conditions custom du pro déclenchent emails/SMS
```

### Paiement en ligne (Stripe Payment Link, par pro)
```
Élève clique "Payer" sur une offre
  → Redirige vers Payment Link Stripe du pro
  → Webhook envoyé à IziSolo
  → Création paiement + commission 1% trackée
  → Email de confirmation à l'élève
```

---

## 6. Atmosphère / Design notes

### Vocabulaire
- L'app **tutoie** le pro toujours ("Bonjour {prenom}", "tes élèves")
- Vocabulaire personnalisable selon le métier — un coach voit "Clients"
  là où une prof yoga voit "Élèves"

### Choix de design importants
- **Mobile-first** : 90 % des sessions sur tel. Le desktop est une
  généralisation, pas la cible primaire.
- **Pas d'emojis dans l'UI** sauf icônes Lucide (consistance).
- **Tabular-nums** sur tous les montants et compteurs (alignement vertical).
- **Animations subtiles** : `animate-fade-in`, `animate-slide-up` au
  chargement des sections. Pas de parallax, pas de scroll-jacking.
- **Border radius généreux** : 10-14px sur cards, 99px sur pills/badges.
- **Cards avec léger box-shadow** + bordure 1px très claire (pas de
  flat design pur, mais pas de skeumorphisme non plus).
- **Saisie tactile** : tous les boutons/touch-targets font ≥44px de haut.

### Ce qui marche déjà bien
- Palette sable, polices, structure landing
- Calendrier sondage (tout neuf)
- Builder règles SI/ALORS (parlant pour le pro)

### Ce qui mériterait un coup de design
- **Pages SEO** (yoga/pilates/coachs/thérapeutes) — actuellement assez
  basiques, manquent d'illustrations et de social proof
- **Page assistant IA** — UI chat très basique, pourrait être plus
  conversationnelle
- **Page revenus / comptabilité** — tableaux denses, peu sexy
- **Onboarding** — un seul écran, pourrait être plus progressif
- **Email templates** — éditeur rough, pourrait avoir une preview
  side-by-side
- **Feuille de pointage** — fonctionnel mais visuellement pauvre, alors que c'est
  une des pages les plus utilisées (touch-targets gros, retour visuel marqué…)

---

## 7. Stack technique (pour info design)

- Next.js 16 + React 19 (JSX, pas de TypeScript)
- Supabase (Postgres + Auth + RLS)
- Tailwind 4 mais usage limité (préférence pour CSS variables et
  styled-jsx scoped)
- Vercel hosting + cron jobs + Blob storage
- Resend (email) + OctoPush (SMS) + Stripe (paiements)
- PWA installable sur mobile (manifest dynamique par studio)

Toutes les couleurs et radius sont des **CSS custom properties** (`--brand`,
`--brand-light`, `--radius-md`, etc.) — un changement de palette se fait
dans 1 fichier (`app/globals.css`).

---

## 8. Pages légales `/legal/cgu`, `/legal/cgv`, `/legal/mentions`, `/legal/rgpd`

Pages denses en texte, layout sobre. Actuellement très "wall of text" —
pourraient bénéficier d'une nav latérale pour sauter aux sections.

| CGU | CGV |
|---|---|
| ![CGU desktop](docs/screenshots/legal-cgu-desktop.jpg) | ![CGV desktop](docs/screenshots/legal-cgv-desktop.jpg) |

| Mentions | RGPD |
|---|---|
| ![Mentions desktop](docs/screenshots/legal-mentions-desktop.jpg) | ![RGPD desktop](docs/screenshots/legal-rgpd-desktop.jpg) |

---

## 9. Capturer les pages pro (auth requis)

Les screenshots actuels couvrent les 12 pages publiques. Pour capturer le
**dashboard, agenda, sondages, paramètres, etc.** (38 pages restantes),
il faut une session authentifiée. 3 approches :

**Option 1 — manuelle** (rapide, dev/staging)
1. Lancer le dev `npm run dev`
2. Se connecter en navigateur normal
3. Faire des captures écran natives (⌘⇧4 / Win+Shift+S)
4. Déposer dans `docs/screenshots/dashboard-desktop.jpg` etc.

**Option 2 — script avec storage state** (reproductible)
```js
// Dans capture-screenshots.mjs, ajouter avant le loop :
//   1. login programmatique sur /login
//   2. context.storageState({ path: 'auth.json' })
//   3. réutiliser pour les captures auth
```
Demander le snippet précis si tu veux automatiser ça.

**Option 3 — environnement de démo seedé** (idéal pour design review)
Créer un compte démo `demo@izisolo.fr` avec données peuplées (10 élèves,
20 cours sur 30j, 1 sondage actif, paiements de démo). Le designer peut
s'y connecter pour explorer l'app dans un état "réaliste" sans exposer
de données réelles.

---

## 10. Ce qui manque / roadmap visible

- Stripe SaaS (facturation auto pros) — actuellement plans changés à la
  main par admin
- Module réservation en ligne pour les cours hebdomadaires (la "place
  garantie chaque semaine" est promise dans les règles mais pas encore
  câblée)
- TypeScript migration (purement JS aujourd'hui)
- Tests E2E plus poussés (5 tests Playwright basiques en place)
- Sentry monitoring (config en place, DSN pas encore branchée en prod)
