import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';

// Marquer une notif ou toutes comme lues
export const POST = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { studioId, supabase } = auth;
  const { id, all } = await request.json();

  // Erreurs vérifiées (B2c) : un update muet laissait le badge « non lu »
  // ré-apparaître sans aucun signal ni côté prof ni dans erreurs_app.
  let error = null;
  if (all) {
    ({ error } = await supabase
      .from('notifications')
      .update({ lu: true })
      .eq('profile_id', studioId)
      .eq('lu', false));
  } else if (id) {
    ({ error } = await supabase
      .from('notifications')
      .update({ lu: true })
      .eq('id', id)
      .eq('profile_id', studioId));
  }
  if (error) {
    reportError('[notifications/mark-read]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
