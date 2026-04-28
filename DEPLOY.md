# Guide de déploiement IziSolo en production

Cibles : **Vercel** (hébergement) + **Supabase prod** (BDD/Auth) + domaine **izisolo.fr** + **Resend** (emails).

Ce guide est à dérouler **dans l'ordre**, étape par étape.

---

## Pré-requis

- Compte Vercel actif (https://vercel.com)
- Projet Supabase de production déjà créé
- Domaine `izisolo.fr` acheté (registrar OVH, Gandi…)
- Compte Resend actif avec les API keys
- Clé API Anthropic (Claude) active

---

## Étape 1 — Installer le CLI Vercel et lier le projet

```bash
npm i -g vercel
cd ~/Documents/Claude/IziSolo/izisolo
vercel login
vercel link
```

Choix lors du `vercel link` :
- Scope : ton scope perso
- Link to existing project? **No**
- Project name: `izisolo`
- Directory: `./` (par défaut)
- Modifier les settings? **No**

---

## Étape 2 — Appliquer les migrations Supabase prod

Ouvrir le dashboard Supabase de **production** → SQL Editor.

Exécuter dans cet ordre, **uniquement les migrations qui ne sont pas encore appliquées** (vérifier l'existence des tables avant chaque) :

1. `migrations.sql`
2. `migrations-v2-multiuser.sql`
3. `migrations-v3-lieux-recurrence.sql`
4. `migrations-v4-visual-themes.sql`
5. `migrations-v5-pointage.sql`
6. `migrations-v10-notifications.sql`
7. `migrations-v11-support-tickets.sql` ← **probablement la seule manquante**

Pour vérifier rapidement quoi est déjà appliqué :

```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Référence complète : [migrations/README.md](./migrations/README.md).

---

## Étape 3 — Configurer Supabase Auth pour la prod

Dashboard Supabase → **Authentication** → **URL Configuration** :

- **Site URL** : `https://izisolo.fr`
- **Redirect URLs** (ajouter) :
  - `https://izisolo.fr/auth/callback`
  - `https://izisolo.fr/p/*/connexion`
  - `http://localhost:3333/auth/callback` (dev)
  - `http://localhost:3333/p/*/connexion` (dev)

Templates email (Magic Link, Confirm signup, Reset password…) → vérifier que les liens utilisent bien `{{ .SiteURL }}` et non un URL hardcodé.

---

## Étape 4 — Configurer le domaine et Resend

### Vercel — Domaine

1. Dashboard Vercel → projet `izisolo` → **Settings** → **Domains**
2. Ajouter `izisolo.fr` puis `www.izisolo.fr` (redirect vers apex)
3. Suivre les instructions DNS (créer un A record vers `76.76.21.21` pour l'apex et un CNAME `cname.vercel-dns.com` pour `www`)
4. Attendre la propagation (5 min à quelques heures), HTTPS sera auto-provisionné

### Resend — Validation domaine

1. Dashboard Resend → **Domains** → **Add Domain** → `izisolo.fr`
2. Ajouter dans le DNS du registrar :
   - 3 records DKIM (`resend._domainkey`)
   - 1 record SPF (`v=spf1 include:_spf.resend.com ~all`)
   - 1 record DMARC (`v=DMARC1; p=none; rua=mailto:dmarc@izisolo.fr`)
3. Cliquer **Verify** dans Resend
4. Sans ça, les emails partent en spam.

---

## Étape 5 — Variables d'environnement Vercel

Pour chaque variable, lancer (en remplaçant la valeur) :

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add ANTHROPIC_API_KEY production
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM_EMAIL production
vercel env add CRON_SECRET production
```

**Valeurs à définir :**

| Variable | Valeur production |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase prod (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase prod |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase prod (SECRET — ne jamais exposer côté client) |
| `NEXT_PUBLIC_APP_URL` | `https://izisolo.fr` |
| `ANTHROPIC_API_KEY` | Clé API Anthropic prod |
| `RESEND_API_KEY` | API key Resend prod |
| `RESEND_FROM_EMAIL` | `IziSolo <no-reply@izisolo.fr>` |
| `CRON_SECRET` | **Générer 32+ chars aléatoires** : `openssl rand -hex 32` |

(Stripe pas configuré — abonnements gérés manuellement via `/admin/users` jusqu'au sprint Stripe post-launch.)

Vérifier ensuite :

```bash
vercel env ls
```

---

## Étape 6 — Premier déploiement

```bash
git add -A
git commit -m "feat: production hardening (zod, headers, SEO, analytics, tests, CI)"
git push origin main
```

Si le repo Git est connecté à Vercel, le push déclenche un auto-deploy. Sinon :

```bash
vercel --prod
```

Surveiller les logs :

```bash
vercel logs --follow
```

---

## Étape 7 — Vérification post-déploiement

Dans cet ordre :

1. **Crons** — Dashboard Vercel → projet → onglet **Cron Jobs** → vérifier que les 2 jobs apparaissent (`/api/cron/expirations` à 03h00 UTC et `/api/cron/alertes` à 07h00 UTC). Tester un trigger manuel.

2. **Headers de sécurité** :
   ```bash
   curl -I https://izisolo.fr | grep -iE 'strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy'
   ```
   → doit afficher les 5 headers.

3. **Indexation** :
   - `https://izisolo.fr/robots.txt` → doit lister les Disallow et le sitemap
   - `https://izisolo.fr/sitemap.xml` → doit lister les pages publiques + studios

4. **Smoke test fonctionnel** — voir [DEPLOY-SMOKE.md](./DEPLOY-SMOKE.md) ou checklist du plan.

5. **PWA** — Installer le portail élève sur un mobile (`/p/{slug}` → "Ajouter à l'écran d'accueil"). Vérifier l'icône, la theme color et l'ouverture en mode standalone.

---

## Étape 8 — Activer Sentry (post-deploy, optionnel)

```bash
npx @sentry/wizard@latest -i nextjs
```

Le wizard demande un projet Sentry, génère :
- `instrumentation.js`
- `sentry.client.config.js`, `sentry.server.config.js`, `sentry.edge.config.js`

Ajouter `SENTRY_AUTH_TOKEN` et `NEXT_PUBLIC_SENTRY_DSN` dans Vercel env. Reconfigurer `tracesSampleRate: 0.1` pour démarrer.

---

## Roll-back en cas de problème

```bash
vercel ls            # lister les déploiements
vercel rollback <url> # remettre une version précédente en prod
```

Ou via le dashboard Vercel → Deployments → 3 points → "Promote to production".

Pour le DB, utiliser les **point-in-time recovery** de Supabase si besoin (Settings → Database → Backups).

---

## Stripe Payment Link (paiements élève → pro) — déjà branché

**Architecture** : chaque pro IziSolo branche **son propre compte Stripe**. Pas de Stripe Connect côté Mélutek (donc pas de KYC ni de TVA sur commission marchande). Mélutek facture **1% de frais de fonctionnement** sur chaque paiement confirmé via webhook (champ `paiements.commission_montant` côté DB, libellé "Frais IziSolo" côté UI), à ajouter à la facture mensuelle SaaS dans le sprint post-launch.

### Côté pro (à expliquer dans la doc utilisateur)

1. Le pro va dans **Paramètres → Profil → Paiement en ligne** dans IziSolo.
2. Il copie l'URL d'endpoint affichée (`https://izisolo.fr/api/stripe/webhook?profile=<id>`).
3. Il colle cette URL dans **dashboard.stripe.com → Developers → Webhooks → + Add endpoint**.
4. Il coche les événements `checkout.session.completed` (et optionnellement `charge.refunded`).
5. Il copie le **Signing secret** (commence par `whsec_`) et le colle dans le champ paramètres IziSolo, puis sauvegarde.
6. Il crée un Payment Link sur **Stripe → Payment Links → New** pour chaque carnet/abonnement vendable.
7. Il colle le lien (`https://buy.stripe.com/...`) dans le champ "Lien Stripe" de chaque offre IziSolo.

### Vérification post-déploiement

```bash
# 1. Tester un paiement avec une CB de test Stripe (4242 4242 4242 4242)
# 2. Vérifier que le webhook a été reçu :
vercel logs --filter "/api/stripe/webhook"
# 3. Vérifier en DB que le paiement est créé avec le bon stripe_session_id et commission_montant
```

### Notes de sécurité

- Le webhook signing secret est stocké en clair dans `profiles.stripe_webhook_secret`. Pour MVP : OK (RLS protège les lectures). Production-grade : envisager un KMS Supabase Vault.
- L'URL d'endpoint avec `?profile=<id>` n'est PAS un secret en soi : la sécurité repose sur la vérification de la signature Stripe avec le secret du pro. Un attaquant ne peut pas forger un webhook valide sans le `whsec_`.
- Les webhooks sont **idempotents** via l'index unique sur `paiements.stripe_session_id` : Stripe peut renvoyer le même événement plusieurs fois sans dupliquer.

---

## Sprint post-launch — Stripe SaaS Mélutek (facturation pros)

Pour activer la facturation automatique des plans (free / solo / pro / studio / premium) **plus les frais de fonctionnement 1% sur les paiements en ligne** :

1. Stripe Checkout pour les abonnements par plan (côté Mélutek)
2. Customer Portal pour la gestion d'abonnement
3. **Job mensuel** qui calcule pour chaque pro : `sum(commission_montant) WHERE date >= mois.debut AND date <= mois.fin` → ajoute une "invoice item" sur l'abonnement Stripe Mélutek du pro avant le prélèvement
4. Webhook Stripe Mélutek (`STRIPE_WEBHOOK_SECRET` env var) pour les events `customer.subscription.updated`, `invoice.paid`, `invoice.payment_failed`
5. Sync auto du `plan` dans `profiles` selon les events

Aujourd'hui, les plans sont activés manuellement par toi via `/admin/users`. La commission 1% est **trackée en DB** mais pas encore facturée.

---

## Liens utiles

- Vercel Dashboard : https://vercel.com/dashboard
- Supabase Dashboard : https://supabase.com/dashboard
- Resend Dashboard : https://resend.com/dashboard
- Plan complet de la reprise : `~/.claude/plans/je-veux-reprendre-la-nifty-brooks.md`
