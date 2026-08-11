# Comparatif IziSolo × Momoyoga — 2026-08-06

> **Méthode** : analyse exhaustive du centre d'aide FR de Momoyoga
> (support.momoyoga.com, ~170 articles / 15 catégories, crawlé le 2026-08-06)
> croisée avec le périmètre réel d'IziSolo (bible + code). Un centre d'aide
> documente ce qui EXISTE et génère des questions — c'est le meilleur proxy
> public de leur produit. Limite : ce qui n'est pas documenté n'est pas
> forcément absent (mais chez un éditeur mature, c'est rare).
>
> **Usage interne uniquement** — jamais de comparatif public nommant un
> concurrent (règle gravée, cf. mémoire `feedback_no_competitor_naming`).

---

## 1. Leur grille tarifaire (source : article « forfaits et fonctionnalités »)

| Momoyoga | Prix | Notes |
|---|---|---|
| **Free** | 0 €/mois | **5 % de frais** sur les paiements en ligne — leur moteur d'acquisition |
| **Standard** | **39 €/mois** (29 €/mois en annuel, −25 %) | essai 14 j |
| **Plus** | **79 €/mois** (59 €/mois en annuel) | essai 14 j |

Tous les plans : cours/élèves/résas illimités, app mobile, support. Plus
gratuit pour les associations, −50 % pour les écoles de formation.

**Nous** : Essentiel 15 € / Complet 29 € TTC, sans engagement, essai 14 j,
LANCEMENT50 (−50 % 3 mois). → **Complet = le prix de leur Standard ANNUEL,
2,7× moins cher que leur Plus mensuel.** Le « Momoyoga 29 » de notre analyse
pricing de juillet était leur Standard annuel — notre positionnement prix
tient, avec de la marge.

À méditer (décision produit, pas urgente) : leur **Free à 5 %** est une
machine d'acquisition qu'on n'a pas. Notre réponse actuelle = essai 14 j +
LANCEMENT50. Un « gratuit qui se paie sur les frais » ne colle pas à notre
cible (majorité d'encaissements espèces/chèque → un Free chez nous serait
juste gratuit), mais ça explique leur volume.

---

## 2. Ce qu'ils ont et pas nous

### 🔴 Gaps réels pour notre cible solo

| Feature Momoyoga | Détail | Notre état |
|---|---|---|
| **Abonnements récurrents** (prélèvement auto SEPA/CB, gestion des échecs, suspension, changement de date) | Leur catégorie la plus profonde côté argent (12+ articles). L'abonnement mensuel se renouvelle et s'encaisse TOUT SEUL. | Nos « abonnements » = périodes vendues puis re-encaissées à la main (ou Payment Link par achat). **Le gap n°1** : c'est du churn de revenus en moins pour la prof, et LA justification d'un plan Complet. |
| **Cours en ligne** (lien Zoom par cours, cours hybride, partage d'enregistrement) | 4 articles, feature simple : le lien visio est attaché au cours et distribué aux inscrits. | Rien (les « vidéos » sont notées Studio/comingSoon — mais ça, c'est de la VOD ; le lien Zoom, c'est 1 champ + 1 email). |
| **Relance de paiement à l'élève** (email automatisé) | « Comment envoyer un rappel de paiement ? » | Le retard de paiement notifie la PROF (cloche) et s'affiche « à régler » côté élève — mais aucun email de relance automatique à l'élève. |
| **Codes promo** sur les offres élèves | Standard chez eux. | Rien (LANCEMENT50 = SaaS profs, pas élèves). |

### 🟠 Moyens (utiles, pas structurants)

- **Bons cadeaux** — demande saisonnière réelle (Noël) chez les profs.
- **Dons / prix libre** — colle à la culture yoga (cours à prix conscient).
- **Multi-langue du planning élève** — nous : FR only (OK tant que cible FR).
- **Image par cours/événement** — cosmétique mais vend les ateliers.
- **Remboursement partiel/intégral depuis la plateforme** — nous : geste à faire dans Stripe.
- **PayPal / Klarna / TWINT / multi-devises** — nous : Stripe only (suffisant FR).
- **Personnalisation des templates d'emails** — nous : textes fixes (white-label jamais construit).
- **Événements à billets** (plusieurs billets par résa, invité +1) — notre résa = 1 place par élève.
- **« Aperçus »** (dashboard stats + export) — nos Revenus/exports couvrent l'argent, pas la fréquentation synthétique.
- **Overbooking volontaire** (dépasser la capacité) — chez nous : possible de fait via pointage, pas assumé dans l'UI de résa.

### 🟢 Hors cible — à NE PAS suivre (choix assumé, cf. STRATEGIE-DOMINATION-SOLO)

- **Multi-enseignants** : rôles/autorisations, comptes profs, « payer vos enseignants » — leur cœur STUDIO. Notre anti-cible assumée (le mode équipe a été retiré de notre landing précisément pour ça).
- **Urban Sports Club** — agrégateur urbain, pertinent pour studios multi-profs.
- **Mailchimp** — notre mailing intégré fait le travail pour une solo.
- **App native générique** sur les stores — notre PWA par studio (manifest, icône, couleurs du studio) est un choix différent, pas un retard : leur app est UNE app Momoyoga, pas l'app du studio.

---

## 3. Ce que nous avons et pas eux (nos armes)

| Notre feature | Leur état (d'après 170 articles) |
|---|---|
| **Pointage profond** : décompte auto agnostique à l'ordre, no-show avec politique (strict/souple), annulation tardive → décompte ou dette réelle, cas à traiter avec undo | « Comment prendre note de la participation » — un émargement. Aucune trace de politique no-show, de dette, d'inbox d'exceptions. |
| **Cas à traiter** (inbox des exceptions + résolution guidée) | Rien d'équivalent. |
| **Messagerie intégrée** : 1-à-1, canaux par cours, annonces, réactions, email instantané à l'élève | Des emails. « Peut-on envoyer un email aux participants d'un cours ? » — oui, et c'est tout. |
| **Sondages planning** (vote → conversion en cours) | Rien. |
| **Règles métier paramétrables** (7 cas) + automations SI/ALORS | Fenêtres de résa/annulation seulement. |
| **Import fiche par photo (IA)** + import CSV avec invitation groupée | Import de liste documenté, sans IA. |
| **Factures acquittées v84** : numéro séquentiel IMMUABLE par studio+année, snapshot gelé, facture du mois, couvre les paiements MANUELS (espèces/chèque/virement = la réalité de notre cible), annulation tracée | Facture PDF auto à la commande EN LIGNE uniquement, **numéro modifiable à la main** (!), pas d'envoi, pas de logo. Une facture modifiable n'est pas conforme à la séquentialité française — **argument massue CSE/comptable pour nous**. |
| **Échéanciers** (paiement en 3× manuel, versement par versement) | Leurs récurrents ≠ échéancier ; rien pour le « elle me paie en 3 chèques ». |
| **Cours mixtes** (carnets acceptés + tarif unité sur le même cours) | Produits attribués par cours (approche liste), sans la résolution fine carnet/unité au pointage. |
| **Visibilité par audience** (public/inscrits/abonnés/fidèles/privé) + cours privés sur invitation | Masquer le planning, bloquer les nouveaux — binaire. |
| **QR code 3 destinations + affiche A4** | Rien de documenté. |
| **Fusion de doublons, état de compte élève, FK douce fiche↔compte** | Rien de documenté. |
| **Embed** : parité (eux : guides par CMS ; nous : widget + palettes + couleurs libres + vue semaine depuis la v3) | Parité — leur seule vraie avance était l'ancienneté. |

---

## 4. Le centre d'aide lui-même (méta-leçon)

~170 articles Freshdesk bien rangés, orientés « Comment faire X ? » — c'est
leur maturité qui parle (produit NL, ~10 ans). Nous : guide `/aide` + FAQ
vérifiée + emails J+1/J+3. **Pas de course au volume** : notre app vise le
« pas besoin d'aide » (moins de surface, plus d'opinion). La bonne pratique à
leur prendre : chaque vraie question d'une prof (Manon, Maude…) devient un
article/section de `/aide` — le support s'écrit par accrétion, jamais en
avance de phase.

---

## 5. Recos priorisées (alignées churn-maîtresse + boucle élève)

1. **Abonnements récurrents élèves** (Stripe Subscriptions + gestion échec/suspension) — LE gap. Gros chantier : à cadrer après la mise en prod Stripe SaaS (P4), comme extension naturelle de « Paiement en ligne » du plan Complet.
2. **Lien visio sur un cours** (« cours en ligne » minimal : champ lien + envoi aux inscrits + affichage espace élève) — ~1 jour de dev, tue l'argument « ils font les cours en ligne, pas vous ». La VOD reste comingSoon, c'est un autre sujet.
3. **Relance paiement élève** (email doux automatisé, opt-in prof, réutilise `alerte_paiement_attente_jours` + cron `alertes` + templates existants) — petit, réduit les impayés, complète la boucle « à régler ».
4. **Bons cadeaux / codes promo élèves** — après le récurrent ; bon candidat « nouveauté de Noël ».
5. **Ne pas suivre** : multi-profs, agrégateurs, app store, Mailchimp.
6. **Prix : ne pas bouger.** 15/29 sans engagement contre 39/79 mensuel (29/59 annuel) = notre angle. En com : « moins de la moitié du prix, pensé solo » — sans jamais les nommer publiquement.

---

*Sources : support.momoyoga.com (15 catégories crawlées le 2026-08-06),
articles « Les forfaits et fonctionnalités », « Comment générer des factures
pour mes yogis ? », catégories cours/abonnements/paiements/emails/intégrations.
À rapprocher de AUDIT-STRATEGIQUE-2026.md (benchmark) et
STRATEGIE-DOMINATION-SOLO-2026.md (positionnement).*
