import { requireAuth } from '@/lib/api-auth';

const PERIODE_TO_RANGE = (periode) => {
  const now = new Date();
  if (periode === 'mois') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      to:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (periode === 'dernier') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
      to:   new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
    };
  }
  if (periode === '3mois') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10),
      to:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (periode === 'annee') {
    return {
      from: `${now.getFullYear()}-01-01`,
      to:   `${now.getFullYear()}-12-31`,
    };
  }
  // 12mois par défaut
  const debut = new Date(now);
  debut.setMonth(debut.getMonth() - 12);
  return {
    from: debut.toISOString().slice(0, 10),
    to:   now.toISOString().slice(0, 10),
  };
};

const STATUT_FR = {
  paid:    'Payé',
  pending: 'En attente',
  cb:      'CB en cours',
  unpaid:  'Impayé',
};

const MODE_FR = {
  especes:  'Espèces',
  cheque:   'Chèque',
  virement: 'Virement',
  CB:       'CB',
};

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request) {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAuth());
  } catch (res) {
    return res;
  }

  const url = new URL(request.url);
  const periode = url.searchParams.get('periode') || 'mois';
  const filterMode = url.searchParams.get('mode');
  const filterStatut = url.searchParams.get('statut');
  const { from, to } = PERIODE_TO_RANGE(periode);

  let query = supabase
    .from('paiements')
    .select('date, date_encaissement, intitule, type, montant, statut, mode, notes, clients(prenom, nom, nom_structure)')
    .eq('profile_id', user.id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (filterMode)   query = query.eq('mode', filterMode);
  if (filterStatut) query = query.eq('statut', filterStatut);

  const { data: paiements, error } = await query;

  if (error) {
    console.error('export csv error:', error);
    return Response.json({ error: 'Erreur lors de la génération du CSV' }, { status: 500 });
  }

  const headers = [
    'Date',
    'Date encaissement',
    'Client',
    'Intitulé',
    'Type',
    'Mode',
    'Montant',
    'Statut',
    'Notes',
  ];

  const rows = (paiements || []).map(p => {
    const client = p.clients;
    const clientName = client?.nom_structure
      || [client?.prenom, client?.nom].filter(Boolean).join(' ')
      || '';
    return [
      p.date || '',
      p.date_encaissement || '',
      clientName,
      p.intitule || '',
      p.type || '',
      MODE_FR[p.mode] || p.mode || '',
      String(p.montant || 0).replace('.', ','), // format FR
      STATUT_FR[p.statut] || p.statut || '',
      p.notes || '',
    ].map(csvEscape).join(',');
  });

  // BOM UTF-8 pour qu'Excel reconnaisse l'encodage
  const csv = '﻿' + [headers.join(','), ...rows].join('\n');

  const filename = `izisolo-paiements-${periode}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
