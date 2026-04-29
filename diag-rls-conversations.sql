-- Diagnostic RLS sur conversations + messages + conversation_members
-- Pour comprendre pourquoi l'API retourne 0 rows alors que le SELECT Editor en montre 7.

-- 1. Toutes les policies actuelles sur les tables messagerie
SELECT tablename, policyname, cmd, permissive, roles::text, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'messages', 'conversation_members')
ORDER BY tablename, cmd, policyname;

-- 2. Le profile_id de Colin tel que stocké en DB
SELECT id, email_contact, studio_slug FROM profiles WHERE email_contact = 'colin@ateliermelusine.com';

-- 3. Toutes les conversations + leur profile_id (pour comparer)
SELECT id, profile_id, type, client_id, last_message_at FROM conversations LIMIT 10;

-- 4. RLS est-il bien activé sur les tables ?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'messages', 'conversation_members');
