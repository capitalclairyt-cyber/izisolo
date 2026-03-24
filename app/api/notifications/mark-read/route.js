import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// Marquer une notif ou toutes comme lues
export async function POST(request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id, all } = await request.json();

  if (all) {
    await supabase
      .from('notifications')
      .update({ lu: true })
      .eq('profile_id', user.id)
      .eq('lu', false);
  } else if (id) {
    await supabase
      .from('notifications')
      .update({ lu: true })
      .eq('id', id)
      .eq('profile_id', user.id);
  }

  return NextResponse.json({ ok: true });
}
