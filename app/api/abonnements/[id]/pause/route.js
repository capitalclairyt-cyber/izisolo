import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

/**
 * POST /api/abonnements/[id]/pause
 *
 * Body :
 *   { action: 'pause', date_debut, date_fin, notes? } → met l'abo en pause
 *   { action: 'reprendre' } → retire la pause (statut='actif', dates pause null)
 *
 * RLS : l'abonnement doit appartenir au prof (profile_id = user.id).
 */
export async function POST(request, { params }) {
  let profile, supabase;
  try {
    ({ profile, supabase } = await requireAuth());
  } catch (res) { return res; }

  const { id } = await params;

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  const { action } = body;

  // Vérifier que l'abo appartient bien à ce prof
  const { data: abo } = await supabase
    .from('abonnements')
    .select('id, statut')
    .eq('id', id)
    .eq('profile_id', profile.id)
    .single();

  if (!abo) return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 });

  if (action === 'pause') {
    const { date_debut, date_fin, notes } = body;
    if (!date_debut || !date_fin) {
      return NextResponse.json({ error: 'Dates de pause requises' }, { status: 400 });
    }
    if (date_fin < date_debut) {
      return NextResponse.json({ error: 'La date de fin doit être après le début' }, { status: 400 });
    }

    const { error } = await supabase
      .from('abonnements')
      .update({
        statut: 'gele',
        date_pause_debut: date_debut,
        date_pause_fin: date_fin,
        notes_pause: notes || null,
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reprendre') {
    const { error } = await supabase
      .from('abonnements')
      .update({
        statut: 'actif',
        date_pause_debut: null,
        date_pause_fin: null,
        notes_pause: null,
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
