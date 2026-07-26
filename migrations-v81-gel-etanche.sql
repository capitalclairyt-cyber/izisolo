-- ============================================================================
-- v81 — GEL ÉTANCHE (B3b 2026-07-26) : un compte gelé ne crée plus rien,
-- même par insert navigateur.
-- ----------------------------------------------------------------------------
-- La fuite (carte de chaleur 2026-07-23, reste assumé B1f) : le gel n'était
-- appliqué que par l'UI (bandeaux) et les routes API (auth:'active' → 402).
-- Un insert supabase-js direct depuis le navigateur (RLS = ownership seul)
-- passait — et v80 a retiré les derniers triggers de volume qui bornaient
-- un peu par accident.
--
-- Design :
--   • compte_gele(uuid) = miroir SQL de isAccountFrozen (lib/trial.js) :
--     gelé = trial 14 j expiré sans abonnement, OU abo Stripe 'canceled'.
--     past_due N'EST PAS gelé (accès maintenu le temps des retries Stripe).
--     free / pro / premium manuels / sub active|trialing = jamais gelés.
--   • Les triggers ne contraignent QUE les requêtes en JWT utilisateur
--     (auth.role() = 'authenticated') : le service_role (crons, webhooks
--     Stripe qui enregistrent de l'ARGENT RÉEL, réparations admin) passe.
--     C'est exactement la fuite navigateur qu'on bouche, rien d'autre.
--   • Tables couvertes : clients, cours, offres, abonnements, paiements
--     (les 5 créations métier du diagnostic + le reste assumé B1f paiements).
--
-- ⚠️ TRIAL_DAYS = 14 côté code (lib/constantes) — dupliqué ici par nécessité
--    SQL ; si la durée change un jour, synchroniser les deux.
--
-- Re-runnable.
-- ============================================================================

create or replace function public.compte_gele(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- profil introuvable : on ne bloque pas (fail-open, l'ownership RLS
    -- protège déjà — un insert sans profil valide échoue ailleurs)
    when p.id is null then false
    when p.plan = 'free' then false
    -- abonnement Stripe vivant (active/trialing) ou en retry (past_due)
    when p.stripe_subscription_status in ('active', 'trialing', 'past_due') then false
    -- abo annulé après cycle complet = gelé
    when p.stripe_subscription_status = 'canceled' then true
    -- plan payant assigné à la main (sans Stripe) = considéré abonné
    when p.plan in ('pro', 'premium') then false
    -- sinon : gelé si le trial 14 j est fini (ou jamais démarré — legacy)
    when p.trial_started_at is null then true
    else (p.trial_started_at + interval '14 days') < now()
  end
  from (select 1) as un
  left join public.profiles p on p.id = p_profile_id;
$$;

create or replace function public.check_compte_non_gele()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Seules les requêtes utilisateur (navigateur / session) sont contraintes.
  if coalesce(auth.role(), '') is distinct from 'authenticated' then
    return NEW;
  end if;
  if public.compte_gele(NEW.profile_id) then
    raise exception 'Ton essai est terminé — choisis un plan pour continuer à créer (Paramètres → Abonnement IziSolo).'
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

-- Un trigger par table de création métier (INSERT seulement : consulter,
-- exporter et modifier l'existant restent ouverts — promesse « lecture
-- seule + export RGPD » du §5).
drop trigger if exists trg_gel_clients on public.clients;
create trigger trg_gel_clients
  before insert on public.clients
  for each row execute function public.check_compte_non_gele();

drop trigger if exists trg_gel_cours on public.cours;
create trigger trg_gel_cours
  before insert on public.cours
  for each row execute function public.check_compte_non_gele();

drop trigger if exists trg_gel_offres on public.offres;
create trigger trg_gel_offres
  before insert on public.offres
  for each row execute function public.check_compte_non_gele();

drop trigger if exists trg_gel_abonnements on public.abonnements;
create trigger trg_gel_abonnements
  before insert on public.abonnements
  for each row execute function public.check_compte_non_gele();

drop trigger if exists trg_gel_paiements on public.paiements;
create trigger trg_gel_paiements
  before insert on public.paiements
  for each row execute function public.check_compte_non_gele();

-- Après application : `node scripts/verifier-selects.mjs`, puis preuve par
-- le CHEMIN RÉEL (leçon v75-v78) : un insert navigateur sur le compte démo
-- passe (free), et un insert en JWT d'un compte trial expiré est rejeté
-- avec le message ci-dessus.
