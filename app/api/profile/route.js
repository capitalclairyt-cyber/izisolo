import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

// GET /api/profile — Récupérer le profil courant
export async function GET() {
  try {
    const { profile } = await requireAuth();
    return NextResponse.json(profile);
  } catch (res) {
    return res;
  }
}

// PUT /api/profile — Mettre à jour le profil
export async function PUT(request) {
  try {
    const { user, supabase } = await requireAuth();
    const body = await request.json();

    // Champs autorisés
    const allowed = [
      'prenom', 'nom', 'email_contact', 'telephone',
      'studio_nom', 'studio_slug', 'metier', 'adresse', 'code_postal', 'ville',
      'ui_couleur', 'types_cours', 'niveaux', 'sources', 'modes_paiement', 'vocabulaire',
      'portail_actif', 'portail_message',
      'alerte_seances_seuil', 'alerte_expiration_jours', 'alerte_paiement_attente_jours',
    ];

    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (res) {
    return res;
  }
}
