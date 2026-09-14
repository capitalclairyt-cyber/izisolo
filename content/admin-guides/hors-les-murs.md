---
titre: Hors les murs, le yoga de Maude dans des lieux qui ont déjà leur public
description: Le mode d'emploi de la page 🌿 Hors les murs, pour relire, valider ou envoyer chaque proposition depuis ta boîte, et noter ce que le lieu répond.
maj: 2026-09-14
---

# Hors les murs

*Guide de la page 🌿 Hors les murs de l'admin (depuis le 14 septembre 2026).*

## L'idée

Maude n'a pas un problème de yoga, elle a un problème de surface : un village, des
cours à 10 à 20 €, une saison qui se joue sur une trentaine d'annuels. La marge
n'est pas dans « communiquer plus », elle est dans **être vue là où il y a déjà du
monde** : une grotte, une ferme, un château, un musée, une entreprise, un EHPAD,
un gîte. Le lieu apporte son public et ses canaux, Maude apporte la séance.

La page réunit, pour chaque piste :

- **la fiche**, vérifiée sur la page de l'exploitant le jour de sa rédaction (qui
  gère, comment le joindre, ce qu'il accueille déjà, la saison, les prix constatés,
  le lien source) ;
- **le mini-projet** : le format, le déroulé, l'argent (pour Maude et pour le lieu),
  ce qu'on lui demande, les points de vigilance ;
- **l'email**, prêt à partir de la boîte de Maude, en vouvoiement, signé sur trois
  lignes, sans crochet ni tiret quadratin.

Le catalogue vit dans le dépôt (`content/hors-les-murs.js`) : il change par commit.
Ce que Maude en fait (statut, texte retouché, commentaire, réponse) est enregistré
en base (table `hlm_suivi`, migration v118).

## Le parcours de Maude, piste par piste

1. **Ouvrir la liste.** Ce qui attend un geste est en haut : d'abord les pistes
   « prêtes à partir », puis celles qui ont répondu, puis celles « à relire ». Les
   filtres (famille, statut, priorité, distance, recherche) servent à se donner un
   programme : « les priorités 1 à moins de 15 km », par exemple.
2. **Lire la fiche et le projet.** Si le lieu ne convient pas, **Écarter** avec un
   motif ; on peut toujours le remettre.
3. **Relire l'email.** Trois sorties possibles :
   - **Demander une modif** : un mot en une phrase, Colin le reçoit par email et
     reprend le texte. La piste passe « Modif demandée ».
   - **Valider tel quel** : la piste passe « Prêt à partir ».
   - Retoucher soi-même dans le champ, puis **Enregistrer le texte** : la version
     retouchée remplace celle du catalogue, pour cette piste seulement.
   Un texte qui ne respecte pas les règles (un crochet, un tiret quadratin, un lien
   ailleurs que chez Maude, du tutoiement, une signature manquante) ne peut ni être
   validé ni être marqué envoyé : la raison s'affiche sous le texte.
4. **Envoyer depuis ma boîte.** Le bouton ouvre la messagerie de Maude avec le
   destinataire, la copie à bonjour@izisolo.fr, l'objet et le texte préremplis. C'est
   elle qui appuie sur Envoyer, depuis maude@maude-yoga.com. Rien ne part d'un
   serveur à sa place. Quand le lieu n'affiche pas d'adresse (formulaire, téléphone),
   **Copier l'email** met le tout dans le presse-papiers.
5. **Je l'ai envoyé.** La piste passe « Envoyé » avec la date. Après dix jours sans
   réponse, la liste la signale dans « Cette semaine » : un petit mot, une seule
   fois.
6. **Ils ont répondu.** Une phrase sur ce qu'ils ont dit, puis « En cours » le temps
   du repérage, des dates, du devis. Le dossier détaillé (comme celui de la grotte)
   se fait à ce moment-là, pas avant.

## Les occasions datées

Certaines fiches portent une échéance (une fête, un marché, un pilote). Elles
apparaissent dans « Cette semaine » tant qu'elles sont à moins de 60 jours et que
la piste n'a pas encore été envoyée : à appeler cette semaine ou laisser passer.

## Les prix, pour ne pas se tromper d'étage

Relevés dans la région (Isère, Savoie, Drôme, Rhône, 2025 et 2026) :

| Format | Prix constaté |
|---|---|
| Séance de 1 h à 1 h 30 en lieu insolite, portée par un office de tourisme | 8 à 10 € |
| Séance de 1 h à 1 h 30, prof autonome | 15 à 20 € |
| 2 h avec un second intervenant (bain sonore, plantes) | 35 à 40 € |
| Séance avec dégustation ou petit-déjeuner | 30 à 55 € |
| Deux heures privatisées avec un guide (la grotte) | 50 € |
| Week-end 2 nuits en gîte, tout compris | 345 à 420 € (6 minimum, 12 maximum) |
| Entreprise, séance de 45 min à 1 h | 90 à 160 € ; 300 € la demi-journée |
| EHPAD, yoga adapté | 70 à 90 € la séance |

À 20 € la séance simple, on est dans la norme et on ne gagne rien. La marge est
dans le partenaire et dans ce qui reste après la séance (une tisane, une
dégustation, une visite). Et trois à cinq dates annoncées d'un coup remplissent
mieux qu'un événement isolé.

## Ce que le module ne fait pas

- Il n'envoie aucun email au lieu depuis un serveur : la boîte de Maude, et elle
  seule. La seule notification automatique est celle qui prévient Colin d'une
  demande de modif.
- Il ne relance pas tout seul : il signale la relance due, Maude décide.
- Il ne remplace pas le dossier détaillé (PDF, chiffrage) qu'on fait une fois que
  le lieu a dit oui.

## Pour ajouter une piste

Une nouvelle piste = une entrée dans `content/hors-les-murs.js`, vérifiée sur sa
page (nom, gestionnaire, contact, ce qu'il accueille déjà, lien source), avec son
mini-projet et son email. Le verrou CI `tests/e2e/hors-les-murs.spec.js` refuse un
email qui casse une règle et un identifiant en double.
