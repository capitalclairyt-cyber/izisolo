-- ============================================================
-- MIGRATION v100 — Lien de pointage confié (remplaçante, prof occasionnelle)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Demande Colin 2026-08-25, lot 1 du chantier multi-prof : « un lien sécurisé
-- à envoyer pour accéder UNIQUEMENT au pointage d'un cours, même sans compte ».
--
-- Le besoin est celui d'aujourd'hui, pas celui de l'association : Maude est
-- seule, et il lui arrive de se faire remplacer. Ce lot ne touche NI la RLS,
-- NI le modèle multi-membre (lots 2 à 4) : il s'ajoute à côté.
--
-- ── Modèle ──────────────────────────────────────────────────────────────
-- Un lien = UN cours, UNE date d'expiration, révocable. On stocke le HASH du
-- jeton (sha256), jamais le jeton : une fuite de la table ne donne aucun accès.
-- Le jeton complet ne vit que dans l'URL remise à la personne invitée, et il
-- n'est affiché qu'UNE fois, à la création (comme une clé d'API).
--
-- ── Sécurité : AUCUNE policy anon, volontairement ───────────────────────
-- La personne invitée n'a pas de session Supabase et ne doit jamais en avoir.
-- Le chemin public passe par des routes serveur en service_role qui
-- re-vérifient, à CHAQUE appel, que la présence touchée appartient bien au
-- cours du lien. C'est cette vérification, et elle seule, qui sépare un lien
-- de dépannage d'une clé du studio — pas la RLS.
-- La prof, elle, lit et révoque ses liens sous RLS normale.
--
-- Purge : le cron `expirations` supprime les liens expirés ou révoqués
-- depuis plus de 90 jours (même hygiène que erreurs_app v71).
-- ============================================================

create table if not exists public.liens_pointage (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  cours_id      uuid not null references public.cours(id) on delete cascade,

  -- sha256 hex du jeton. UNIQUE : deux liens ne peuvent pas collisionner.
  token_hash    text not null unique,

  -- Pour que la prof sache à qui elle a confié quoi (« Claire », « le club »).
  nom_invitee   text,

  cree_par      uuid references auth.users(id) on delete set null,
  expire_at     timestamptz not null,
  revoque_at    timestamptz,

  -- Traçabilité de l'usage : qui s'en est servi, quand, combien de fois.
  premiere_utilisation_at timestamptz,
  derniere_utilisation_at timestamptz,
  nb_pointages  integer not null default 0,

  -- Le mot que la personne invitée laisse à la prof (« Léa est venue mais
  -- n'était pas sur la liste »). Elle ne peut ni ajouter ni retirer personne :
  -- sans ce champ, elle n'aurait aucun moyen de le signaler.
  note_invitee  text,

  created_at    timestamptz not null default now()
);

alter table public.liens_pointage enable row level security;

-- La prof voit et gère SES liens. Rien pour anon (cf. en-tête).
drop policy if exists "liens_pointage proprietaire" on public.liens_pointage;
create policy "liens_pointage proprietaire" on public.liens_pointage
  for all to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create index if not exists idx_liens_pointage_cours   on public.liens_pointage (cours_id);
create index if not exists idx_liens_pointage_profile on public.liens_pointage (profile_id, created_at desc);

do $$
begin
  raise notice '✅ v100 : liens_pointage prête (% lien(s) existant(s))',
    (select count(*) from public.liens_pointage);
end $$;
