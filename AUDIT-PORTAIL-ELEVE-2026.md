# Audit — Portail élève IziSolo (2026-07-22)

> Analyse complète du portail côté élève : accueil public + réservation, espace
> connecté, flux d'entrée & authentification. Findings sourcés `fichier:ligne`,
> hiérarchisés par sévérité × impact. Issu de 3 audits parallèles.

---

## 🎯 Les 4 clusters à retenir

1. **Le paiement en ligne est un trou béant** — réservation fantôme sur workshop payant, dettes non payables en ligne, CTA Stripe prématuré en essai manuel. **Cluster n°1, à traiter en priorité.**
2. **Promesses non tenues selon le plan** — annulation self-service et liste d'attente affichées à TOUS mais réservées au Pro → culs-de-sac trompeurs en Solo (jusque dans les emails).
3. **Vie privée / anti-abus** — énumération d'appartenance, comptes+emails « de marque » créés pour des emails arbitraires.
4. **Données affichées imprécises** — dette fantôme, cours passé encore « inscrit·e », fuseau UTC.

---

## 🔴 P0 — Bloquant : paiement workshop en ligne = réservation fantôme

`app/api/portail/[studioSlug]/reserver/route.js:142-159` : pour un cours
`tarif_unitaire` + `stripe_payment_link_unit`, l'API renvoie **402 AVANT de créer
la présence** (commentaire du code : « la résa ne se finalise PAS automatiquement
après paiement — manque webhook par cours »). Conséquences :
- L'élève paie sur Stripe et **n'est jamais inscrit** ; sa place n'est pas décomptée.
- S'il re-clique « Réserver » → **même lien Stripe → risque de double paiement**.
- `PortailHome.js:99-104` (`handleQuickReserve`) ouvre le lien Stripe sans basculer la carte en « Inscrit·e ».

**Impact** : élève qui a payé et se présente sans être sur la liste → embarras direct + litige. **Le trou le plus grave du parcours.**
**Fix** : réserver la place en `pending` AVANT la redirection Stripe + un retour (webhook/redirect) qui confirme la présence ; sinon désactiver le paiement à l'unité tant que le webhook par cours n'existe pas.

---

## 🟠 P1 — Promesses conditionnées au plan (culs-de-sac Solo)

- **Annulation self-service promise à tous, réservée au Pro.** La politique
  d'annulation s'affiche inconditionnellement : bannière (`CoursReservationClient.js:377-393`),
  écran de succès (`:295-298`) et **email de confirmation** (`reserver/route.js:578-580`)
  promettent « annule depuis ton espace jusqu'à Xh avant ». Or `annuler/route.js:56-60`
  gate derrière `studioHasFeature('annulationParEleve')` (Pro) → 403 « contacte ton
  studio » en Solo. → promesse écrite non tenable + charge de support.
- **Liste d'attente : formulaire affiché puis rejeté.** `CompletAvecListeAttente`
  s'affiche dès qu'un cours est complet (`CoursReservationClient.js:427-432`), sans
  connaître le plan. L'élève remplit tout, soumet, reçoit « pas disponible pour ce
  studio » (`liste-attente/route.js:43-47`, Pro). → cul-de-sac.

**Fix** : conditionner l'affichage (politique d'annulation, formulaire LA) au plan
effectif du studio. Sinon montrer « contacte ton studio » **en amont**, pas après saisie.

## 🟠 P1 — Essai manuel : on demande de payer avant validation

`EssaiClient.js:96-110` : le bloc « Régler {prix}€ pour confirmer » (Stripe) est
rendu **hors** du conditionnel `status === 'en_attente'`, et l'API renvoie
`stripePaymentLink`/`prix` quel que soit le mode (`essai/route.js:187,215-221`).
→ en mode **manuel**, l'élève voit « Demande reçue ! » puis un bouton l'invitant à
**payer un créneau pas encore accepté**. **Impact** : confusion, litiges.
**Fix** : n'afficher le paiement que si `status === 'finalisee'` ; sinon « demande en cours de validation ».

---

## 🟠 P2 — Vie privée & anti-abus

- **Énumération d'appartenance sur l'essai.** `essai/route.js:91-110` renvoie deux
  messages distincts : `ALREADY_CLIENT` vs `ALREADY_REQUESTED`. N'importe qui peut
  sonder un email et apprendre si X fréquente le studio Y (donnée bien-être sensible).
  Incohérent avec l'uniformité de `/api/portail-login` (`:58`). **Fix** : message générique unique.
- **Comptes auth + emails « de marque » pour emails arbitraires.** `/api/portail-login`
  n'exige aucun lien préalable email↔studio : il crée un `auth.users` confirmé
  (`portail-magic-link.js:86-93`) et envoie « Ton lien — {studio} » à **n'importe quelle**
  adresse (borné 15/h/IP). Idem la réservation crée une fiche + email « Réservation
  confirmée » signé studio pour un email arbitraire (`reserver/route.js:104-120`).
  **Impact** : spam/usurpation d'image sous le nom du studio + pollution CRM.
  **Fix** : ne créer/envoyer que si l'email est déjà connu du studio, ou captcha/délai au-delà de N.
- **Wildcard `_` non échappé dans les `ilike` email** (`essai/route.js:88,101`,
  `reserver/route.js:94`, `essai.js:37`) → `a_b@x.com` = motif joker → faux positif
  « déjà client ». Le code sait échapper (`reserver/route.js:433` pour la LA) mais pas ici. 🟡
- **Rate-limit best-effort en mémoire par instance** (`antibot.js:15-38`) → plafond réel
  × nombre d'instances serverless. Protection plus faible qu'annoncée. 🟡

## 🟠 P2 — Données affichées imprécises (espace connecté)

- **Dette fantôme.** `EspaceClient.js:288` : `paiementsDus = paiements.filter(p => p.statut !== 'paid')`
  (liste noire) → un paiement `refunded`/`annule`/`rembourse`/`failed` remonte dans
  « À régler », gonfle `totalDu` (`:293-296`). **Fix** : liste blanche (`pending`, `echeance`…).
- **Cours passé plus tôt aujourd'hui reste « Inscrit·e » + propose d'annuler.** Bascule
  à-venir/passé en **date seule** (`page.js:203-204`, `EspaceClient.js:159-166`). Un cours
  de ce matin, vu ce soir, s'affiche « Inscrit·e » et `evaluerAnnulation` → « Annuler
  (séance due) » sur un cours **déjà passé** (`:198-229`). **Fix** : comparer date+heure de fin.
- **Fuseau UTC autour de minuit** (`page.js:196`, `EspaceClient.js:159,303` via `toISOString`)
  → entre minuit et ~02h (UTC+1/2), un cours d'hier reste « à venir ». 🟡

---

## 🟡 P3 — Polish & cohérence

- **`tarif_unitaire` invisible avant soumission** (`CoursReservationClient.js`) → prix
  découvert seulement dans la 402 → effet de surprise. Afficher le prix + badge « paiement en ligne » sur la fiche.
- **« Prochain cours » propose « Réserver » même si complet** (`PortailHome.js:236-247, 421-423`).
- **Formatage montant incohérent** : dettes de cas en `${montant} €` → « 15.5 € » au lieu de « 15,50 € » (`EspaceClient.js:824`).
- **Pas de badge non-lus sur « Mes messages »** (`EspaceClient.js:530-540`) alors que `unreadMessages` alimente la cloche.
- **Double emploi du mot « Notifications »** : cloche (alertes) vs carte prefs push (`:459-513` / `:544-566`).
- **Historique & carnets non paginés** (`EspaceClient.js:663-778`) alors que le reste pagine 8/page.
- **Zoom désactivé** (`layout.js:44-50` `userScalable:false`) → a11y sur app mobile-first.
- **Smell récurrence** : home lit `recurrence_parent_id` (`page.js:74`) mais la fiche/série
  lit `recurrence_id` (`CoursReservationClient.js:167`, `reserver-serie`) → la case
  « m'inscrire aux séances suivantes » pourrait ne jamais apparaître. À vérifier au schéma.
- **Chemin legacy `/auth/finaliser`** renvoie un élève vers `/dashboard` par défaut (`finaliser/page.js:56-61,120`) — latent.
- **Liens d'accès 1h dans les emails métier** (`essai.js:138-144`, `reserver/route.js:573-577`)
  → ouverture différée = lien mort → `/connexion?erreur=expire` (récupérable, mais friction).

---

## 💡 Opportunités activation / rétention (quick wins)

- **Router les nouveaux visiteurs vers l'essai** : sur une fiche cours, si visiteur
  anonyme + essai actif, essai en action primaire, réservation directe secondaire
  (évite le mur `eleve_sans_carnet` en fin de formulaire, `reserver/route.js:258-299`).
- **Réactiver l'assistant de réservation** : le chatbot « Aide-moi à choisir un cours »
  est **entièrement codé mais commenté** (`EspaceClient.js:928-930`) — c'était le levier de re-réservation.
- **Mettre le prochain cours en tête, avec compte à rebours** (« Ton Pilates dans 2 jours ») + nudge « même créneau la semaine prochaine ».
- **Payer les dettes en ligne (Stripe)** : la section « Acheter en ligne » existe
  (`EspaceClient.js:889-926`) mais les montants dus ne sont pas payables → réduire le no-pay.
- **Badge non-lus sur « Mes messages » + résumé d'assiduité** (« 8 séances ce trimestre »).
- **« Renvoyer mon lien » sur la page de lien expiré** (l'email est déjà géré via `?email=`, `connexion/page.js:11`) — 1 clic au lieu d'une re-saisie.
- **Persister filtres/semaine en query params** pour ne pas réinitialiser la navigation au retour d'une fiche.

---

## Ce qui est SOLIDE (ne pas toucher)

- Parcours de réservation lisible + politique d'annulation calculée + écran de succès clair.
- Réservation 1-clic optimiste + atomicité RPC `reserver_place` (fin des races sur la dernière place).
- Statut de présence enfin fiable (`statut_pointage`, plus de faux « Absent·e »).
- Annulation honnête (libre vs tardive, double confirmation, « séance décomptée »).
- Carnets ultra-lisibles (solde, barre, pause, expiration). « À régler » agrégé + disclaimer honnête.
- Magic link maison cross-device (`hashed_token` + `verifyOtp` server-side, slug dans le path).
- Séparation prof/élève assumée (role=eleve, plus de prof fantôme). Anti-doublon essai + anti-bot en couches.
