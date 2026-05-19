-- Passer Maude (maude@maude-yoga.com) au plan Pro
-- À exécuter dans le SQL Editor Supabase

UPDATE profiles
SET plan = 'pro'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'maude@maude-yoga.com'
)
RETURNING id, plan;
