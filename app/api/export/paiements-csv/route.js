import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';

const PERIODE_TO_RANGE = (periode) => {
  // Bornes en heure de PARIS (serveur UTC : « ce mois » exporté le 1er à
  // 00h30 donnait le mois précédent — B1f).
  const parisStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const now = new Date(parisStr + 'T12:00:00');
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
  overdue: 'En retard',
};

const MODE_FR = {
  especes:  'Espèces',
  cheque:   'Chèque',
  virement: 'Virement',
  CB:       'CB',
};

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Injection de formule Excel (=, +, -, @, tab) : un prénom saisi au
  // formulaire PUBLIC d'essai peut finir dans le tableur de la prof (B1f).
  // Les nombres purs (montants « -12,50 ») restent intacts.
  if (/^[=+\-@\t]/.test(str) && !/^-?\d+(?:[.,]\d+)?$/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(';') || str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// plan 'export_compta' : feature Pro (gate serveur — l'UI seule était contournable)
export const GET = withRoute({ auth: 'user', plan: 'export_compta' }, async ({ request, auth }) => {
  const { user, supabase } = auth;

  const url = new URL(request.url);
  const periode = url.searchParams.get('periode') || 'mois';
  const filterMode = url.searchParams.get('mode');
  const filterStatut = url.searchParams.get('statut');
  const { from, to } = PERIODE_TO_RANGE(periode);

  // Paginé (B1f, rouge) : sans .range, le cap PostgREST 1000 tronquait le
  // CSV COMPTABLE en silence — en ordre ASC, ce sont les lignes les plus
  // RÉCENTES qui manquaient. Tri secondaire par id = pagination stable.
  const paiements = [];
  for (let page = 0; page < 20; page++) {
    let query = supabase
      .from('paiements')
      .select('date, date_encaissement, intitule, type, montant, statut, mode, notes, clients(prenom, nom, nom_structure)')
      .eq('profile_id', user.id)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(page * 1000, page * 1000 + 999);

    if (filterMode)   query = query.eq('mode', filterMode);
    if (filterStatut) query = query.eq('statut', filterStatut);

    const { data: lot, error } = await query;
    if (error) {
      reportError('export csv error:', error);
      return Response.json({ error: 'Erreur lors de la génération du CSV' }, { status: 500 });
    }
    paiements.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
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
    ].map(csvEscape).join(';');
  });

  // BOM UTF-8 + séparateur ';' : Excel FR (séparateur système ';') ouvrait
  // le fichier virgule en UNE colonne — l'export élèves utilisait déjà ';'
  // (B1f). Round-trip aligné.
  const csv = '﻿' + [headers.join(';'), ...rows].join('\n');

  const filename = `izisolo-paiements-${periode}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});
