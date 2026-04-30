-- Migration v30 : Visibilité conditionnelle des cours sur le portail public
--
-- Permet au pro de définir quels cours sont visibles par quels visiteurs :
--   - 'public'    : tout le monde (default — comportement historique)
--   - 'inscrits'  : seulement les clients du studio (= existing fiche client)
--   - 'abonnes'   : seulement les clients avec un abonnement ACTIF
--   - 'fideles'   : seulement les clients avec statut='fidele'
--
-- Le filtrage est fait au niveau de l'application (pas de RLS pour ne pas
-- complexifier — la RLS publique de v25 reste large pour permettre les counts
-- de présences, etc.). L'app filtre la liste des cours selon l'auth context.
--
-- profiles.visibilite_default permet de définir la valeur par défaut pour les
-- nouveaux cours créés via le moteur de cours / récurrences.

-- ── 1. Colonne visibilite sur cours ───────────────────────────────────────
alter table public.cours
  add column if not exists visibilite text default 'public'
    check (visibilite in ('public', 'inscrits', 'abonnes', 'fideles'));

comment on column public.cours.visibilite is
  'Niveau de visibilité du cours sur le portail public : public (tous) / inscrits (clients) / abonnes (avec abo actif) / fideles (statut=fidele).';

-- Index pour filtrer rapidement les cours publics (cas le plus fréquent)
create index if not exists cours_visibilite_idx on public.cours (profile_id, visibilite);

-- ── 2. Default global sur profiles ────────────────────────────────────────
alter table public.profiles
  add column if not exists visibilite_default text default 'public'
    check (visibilite_default in ('public', 'inscrits', 'abonnes', 'fideles'));

comment on column public.profiles.visibilite_default is
  'Valeur par défaut appliquée à la colonne cours.visibilite lors de la création d''un nouveau cours.';

-- Vérif
do $$
declare n int;
begin
  select count(*) into n from public.cours where visibilite = 'public';
  raise notice '✅ % cours en visibilité public (tous existants par défaut)', n;
end $$;
