import { requireAuth } from '@/lib/api-auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paletteSchema = z.object({
  palette: z.enum(['rose', 'sauge', 'sable', 'lavande']),
});

/**
 * POST /api/profile/palette
 * Body : { palette: 'rose' | 'sauge' | 'sable' | 'lavande' }
 *
 * Set le cookie `izisolo-palette` (1 an) ET met à jour profile.palette en DB.
 * Le cookie permet au layout SSR de poser le bon `data-palette` sur le <html>
 * au prochain render sans avoir à fetcher le profil.
 */
export async function POST(request: Request) {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAuth());
  } catch (res) {
    return res as Response;
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = paletteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'palette invalide', issues: parsed.error.issues }, { status: 400 });
  }

  const { palette } = parsed.data;

  // Set cookie 1 an
  const store = await cookies();
  store.set('izisolo-palette', palette, {
    httpOnly: false, // lisible côté client pour transition fluide sans reload
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === 'production',
  });

  // Persister en DB (silencieux si fail — le cookie est primaire)
  try {
    await supabase.from('profiles').update({ palette }).eq('id', user.id);
  } catch (err) {
    console.warn('[palette] update profile err:', err);
  }

  return Response.json({ ok: true, palette });
}
