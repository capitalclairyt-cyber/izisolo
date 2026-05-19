import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * GET /api/unsubscribe?email=xxx
 *
 * Route publique (pas d'auth) — insère l'email dans email_blacklist
 * puis redirige vers /unsubscribe/confirm.
 * Le RLS autorise l'insert anonyme sur email_blacklist.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.trim()?.toLowerCase();

  // Validation basique du format email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.redirect(
      new URL('/unsubscribe?error=invalid', request.url)
    );
  }

  try {
    const supabase = await createServerClient();

    // Upsert : si l'email existe déjà, on ne fait rien (ON CONFLICT DO NOTHING via upsert)
    const { error } = await supabase
      .from('email_blacklist')
      .upsert(
        { email, reason: 'unsubscribe', source: 'unsubscribe_page' },
        { onConflict: 'email', ignoreDuplicates: true }
      );

    if (error) {
      console.error('unsubscribe insert error:', error);
      return NextResponse.redirect(
        new URL('/unsubscribe?error=server', request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/unsubscribe/confirm', request.url)
    );
  } catch (err) {
    console.error('unsubscribe unexpected error:', err);
    return NextResponse.redirect(
      new URL('/unsubscribe?error=server', request.url)
    );
  }
}

/**
 * POST /api/unsubscribe  { email }
 *
 * Alternative POST pour le formulaire (fetch côté client).
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body JSON invalide' }, { status: 400 });
  }

  const email = body.email?.trim()?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Email invalide' }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('email_blacklist')
      .upsert(
        { email, reason: 'unsubscribe', source: 'unsubscribe_page' },
        { onConflict: 'email', ignoreDuplicates: true }
      );

    if (error) {
      console.error('unsubscribe insert error:', error);
      return Response.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('unsubscribe unexpected error:', err);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
