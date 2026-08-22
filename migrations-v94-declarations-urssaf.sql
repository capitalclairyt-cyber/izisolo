-- ============================================================================
-- v94 — Archive des déclarations URSSAF (2026-08-22, demande Colin : « un
-- système d'archive pour retrouver ce qui a été demandé »)
--
-- UNE ligne par (studio, période). Elle répond aux deux seules questions que
-- la prof se pose des mois plus tard :
--     « combien j'ai déclaré pour le T2 ? »  → montant_declare + snapshot
--     « est-ce que je l'ai déclaré ?      »  → declaree_at
--
-- Pourquoi un SNAPSHOT et pas seulement un montant : les chiffres sont
-- recalculés à la lecture depuis les paiements. Si elle corrige un paiement en
-- décembre, le T2 ne donne plus le même total qu'en juillet. Sans photo du
-- moment, « retrouver » rendrait un nombre qui n'est pas celui qu'elle a
-- déclaré — et l'écart, qui est précisément l'information intéressante,
-- passerait inaperçu.
--
-- La consultation est tracée aussi (compteur + dernière fois) : c'est le
-- « ce qui a été demandé » de la demande initiale. Aucune donnée nouvelle
-- n'est inventée, tout est dérivé des paiements existants.
--
-- Re-runnable.
-- ============================================================================

create table if not exists public.declarations_urssaf (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,

  -- Identité de la période, telle que lib/urssaf.js la nomme ('T3-2026',
  -- 'M-2026-09', 'A-2026'). Le label est figé ici pour rester lisible même si
  -- le formatage change un jour côté code.
  periode_id      text not null,
  periode_label   text,
  periode_debut   date not null,
  periode_fin     date not null,

  -- Consultation : le « qu'est-ce que j'ai demandé, et quand ».
  consultations   int  not null default 0,
  derniere_consultation_at timestamptz,
  montant_dernier numeric(10,2),

  -- Déclaration : posé UNE fois, quand la prof dit « c'est déclaré ».
  declaree_at     timestamptz,
  montant_declare numeric(10,2),
  -- Photo de ce qui était affiché à ce moment-là (ventilations par mois et par
  -- mode, estimation de cotisations, base de calcul, nombre de paiements).
  snapshot        jsonb,

  created_at      timestamptz not null default now(),

  -- Une seule ligne par période et par studio : l'archive est un état, pas un
  -- journal qui gonfle à chaque clic.
  unique (profile_id, periode_id)
);

comment on table public.declarations_urssaf is
  'Archive des déclarations URSSAF (v94) : une ligne par studio+période. Consultations comptées, montant déclaré et snapshot figés au moment où la prof marque la période déclarée. Lu via lib/declaration-archive.js.';

create index if not exists idx_declarations_urssaf_profil
  on public.declarations_urssaf (profile_id, periode_debut desc);

alter table public.declarations_urssaf enable row level security;

-- La prof lit et écrit SES archives (l'app appelle depuis sa session).
drop policy if exists declarations_urssaf_own on public.declarations_urssaf;
create policy declarations_urssaf_own on public.declarations_urssaf
  for all to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

do $$ begin
  raise notice '✅ v94 : declarations_urssaf (archive des déclarations, 1 ligne par studio+période).';
end $$;
