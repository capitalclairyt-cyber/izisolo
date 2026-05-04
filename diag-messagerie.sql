-- Diagnostic messagerie après tentative d'annonce.
-- Lance dans Supabase SQL Editor.

WITH p AS (
  SELECT id FROM profiles WHERE email_contact = 'colin@ateliermelusine.com'
)
SELECT
  -- 1. Combien de conversations existent
  (SELECT COUNT(*) FROM conversations WHERE profile_id = (SELECT id FROM p)) AS nb_conversations,

  -- 2. Combien de messages
  (SELECT COUNT(*) FROM messages m
   JOIN conversations c ON c.id = m.conversation_id
   WHERE c.profile_id = (SELECT id FROM p)) AS nb_messages,

  -- 3. Combien de membres dans toutes les conversations
  (SELECT COUNT(*) FROM conversation_members cm
   JOIN conversations c ON c.id = cm.conversation_id
   WHERE c.profile_id = (SELECT id FROM p)) AS nb_members,

  -- 4. Toutes les policies SELECT sur conversations (debug RLS)
  (SELECT string_agg(policyname, ', ')
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'conversations' AND cmd = 'SELECT') AS conv_select_policies;

-- 5. Détail des conversations + dernier message (si existent)
SELECT
  c.id,
  c.type,
  c.client_id,
  c.cours_id,
  c.last_message_at,
  c.created_at,
  (SELECT cl.prenom || ' ' || cl.nom FROM clients cl WHERE cl.id = c.client_id) AS client_nom,
  (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS dernier_message
FROM conversations c
WHERE c.profile_id = (SELECT id FROM profiles WHERE email_contact = 'colin@ateliermelusine.com')
ORDER BY c.last_message_at DESC NULLS LAST
LIMIT 20;
