-- ============================================================================
-- IziSolo — v116 : annuler une adhésion (2026-09-14)
-- Correctif du lot 3 (v113), trouvé par la preuve en phase COMPLÈTE.
-- Re-runnable. À appliquer APRÈS v113. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-vie-asso.mjs
-- ----------------------------------------------------------------------------
-- v113 donnait à `adhesions` une policy de lecture, d'insertion et de mise à
-- jour, mais AUCUNE de suppression. Or « Annuler l'adhésion » SUPPRIME la ligne
-- (l'index unique client + saison interdit d'en garder une « annulée », sinon
-- la personne ne pourrait plus ré-adhérer la même saison). Sans policy, un
-- DELETE sous RLS ne lève aucune erreur : il touche zéro ligne, et l'écran
-- disait « annulée » alors que rien n'avait bougé. La route répond désormais
-- 503 MIGRATION_V116_REQUISE tant que cette policy manque.
-- Même périmètre que l'écriture : la permission `argent_gerer` de l'équipe.
-- ============================================================================

drop policy if exists "adhesions suppression" on public.adhesions;
create policy "adhesions suppression" on public.adhesions
  for delete to authenticated
  using (profile_id in (select public.mes_studios_staff('argent_gerer')));

do $$
begin
  raise notice '✅ v116 : policy de suppression sur adhesions (argent_gerer)';
end $$;
