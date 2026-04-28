# Migrations IziSolo — application manuelle

Les fichiers SQL sont à la racine du repo (et non dans ce dossier `migrations/` qui ne sert qu'à la doc), à appliquer **dans l'ordre exact** ci-dessous, via le **SQL Editor du Dashboard Supabase** (Production).

## Ordre d'application

| # | Fichier | Description |
|---|---|---|
| 1 | `migrations.sql` | Schéma de base : `profiles`, `clients`, `cours`, `offres`, `abonnements`, `presences`, `paiements`, `evenements`, `inscriptions_evenements`, `mailings`. RLS activé sur toutes les tables. |
| 2 | `migrations-v2-multiuser.sql` | Table `team_members` (admin/instructor/viewer) pour le multi-utilisateur côté pro. |
| 3 | `migrations-v3-lieux-recurrence.sql` | Tables `lieux_pratique` et `recurrences` (patterns hebdo/mensuel). |
| 4 | `migrations-v4-visual-themes.sql` | Colonne `ui_couleur` dans `profiles` (theme par studio). |
| 5 | `migrations-v5-pointage.sql` | Triggers et colonnes `pointee` / `heure_pointage` dans `presences`. |
| 6 | `migrations-v10-notifications.sql` | Table `notifications` + triggers anniversaires/alertes. |
| 7 | `migrations-v11-support-tickets.sql` | Table `support_tickets` (RLS, schéma anglais aligné avec le code). |
| 8 | `migrations-v12-paiements-compta.sql` | `paiements.date_encaissement` (chèque reçu vs encaissé) + `paiements.stripe_session_id` (préparation v13). |
| 9 | `migrations-v13-stripe-payment-link.sql` | `offres.stripe_payment_link`, `profiles.stripe_webhook_secret` + `stripe_account_id`, `paiements.commission_taux` + `commission_montant`. Index unique sur `stripe_session_id` pour idempotence des webhooks. |

## Procédure

1. Ouvrir le [Dashboard Supabase](https://supabase.com/dashboard) → projet IziSolo prod
2. Aller dans **SQL Editor**
3. Pour chaque fichier dans l'ordre :
   - Vérifier d'abord si la migration est déjà appliquée :
     ```sql
     -- Exemple pour v11
     select to_regclass('public.support_tickets');
     ```
     Si la table existe → migration déjà passée, sauter.
   - Sinon : copier-coller le contenu du `.sql`, exécuter, vérifier le retour "Success".
4. Après v11, lancer un check global pour confirmer que toutes les tables clés sont là :
   ```sql
   select table_name from information_schema.tables
   where table_schema = 'public'
   order by table_name;
   ```
   Doit contenir au minimum : `abonnements`, `clients`, `cours`, `evenements`, `inscriptions_evenements`, `lieux_pratique`, `mailings`, `notifications`, `offres`, `paiements`, `presences`, `profiles`, `recurrences`, `support_tickets`, `team_members`.

5. Pour vérifier que v13 (Stripe) est bien appliqué :
   ```sql
   select column_name from information_schema.columns
   where table_name = 'offres' and column_name = 'stripe_payment_link';
   -- doit renvoyer 1 ligne

   select column_name from information_schema.columns
   where table_name = 'profiles' and column_name = 'stripe_webhook_secret';
   -- doit renvoyer 1 ligne
   ```

## Notes importantes

- **`migrations-v11-support-tickets.sql`** a été réécrit le 2026-04-28 : le schéma initial était en français mais ne correspondait pas au code (qui utilise `user_id`, `subject`, `status`, `admin_reply`). La version actuelle est en anglais et conforme.
- **Les versions 6 à 9** n'existent pas dans ce projet — c'est intentionnel, l'historique a sauté de v5 à v10.
- **Aucun script `npm run migrate`** : c'est volontaire, on garde l'application manuelle pour avoir un contrôle visuel et éviter des dépendances supplémentaires (Drizzle, etc.).
- **RLS** : toutes les nouvelles tables doivent activer `enable row level security` et définir au minimum les policies `select`/`insert` pour `auth.uid()`. Le `service_role` bypasse RLS automatiquement.

## Future migration v12+

Quand tu ajoutes une migration :
1. Créer `migrations-v12-{nom-court}.sql` à la racine
2. Mettre à jour ce README (ligne dans le tableau + numéro de version)
3. Tester sur un projet Supabase de dev avant la prod
4. Documenter ici tout breaking change qui demande un backfill ou une dépréciation côté code
