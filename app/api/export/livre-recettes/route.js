import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';
import {
  filtreDateComptable, periodeParId, periodeAnnee, aujourdhuiParis,
  lireExclusions, retirerExclus,
} from '@/lib/urssaf';
import { construireLivreRecettes, livreEnCsv } from '@/lib/livre-recettes';
import { genererLivreRecettesPdf } from '@/lib/livre-recettes-pdf';
import { reponsePdf } from '@/lib/facture-pdf';

// ============================================================================
// Livre des recettes — le registre obligatoire de la micro-entreprise.
//
// PAS de gate de plan, volontairement : c'est une obligation légale, pas un
// confort. Même arbitrage que les factures acquittées (v84). L'export CSV
// détaillé pour la compta, lui, reste sur la capacité `export_compta`.
//
// Le registre se REGÉNÈRE depuis les paiements à chaque téléchargement : rien
// n'est figé en DB, contrairement aux factures dont le numéro engage.
// ============================================================================

export const GET = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { user, supabase } = auth;
  const url = new URL(request.url);
  const today = aujourdhuiParis();

  const periode = periodeParId(url.searchParams.get('periode'), today)
    || periodeAnnee(Number(today.slice(0, 4)), today);
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'pdf';

  // Paginé : un registre tronqué à 1000 lignes en silence serait pire que pas
  // de registre du tout (B1f).
  const paiements = [];
  for (let page = 0; page < 20; page++) {
    const { data: lot, error } = await supabase
      .from('paiements')
      .select('id, montant, mode, date, date_encaissement, intitule, clients(prenom, nom, nom_structure)')
      .eq('profile_id', user.id)
      .eq('statut', 'paid')
      .or(filtreDateComptable(periode.from, periode.to))
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error) {
      reportError('[livre-recettes] lecture paiements:', error, { route: '/api/export/livre-recettes' });
      return Response.json({ error: 'Impossible de générer ton livre des recettes' }, { status: 500 });
    }
    paiements.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }

  // v95 : les encaissements que la prof déclare à part sortent du registre,
  // et le registre le dit en toutes lettres (cf. construireLivreRecettes).
  const exclusions = await lireExclusions(supabase, user.id, periode);
  const retenus = retirerExclus(paiements, exclusions);

  // Références de pièce : le numéro de facture v84 quand il existe. Défensif —
  // sans lui, la référence retombe sur l'identifiant court du paiement.
  const numeros = new Map();
  if (paiements.length > 0) {
    try {
      const ids = paiements.map(p => p.id);
      for (let i = 0; i < ids.length; i += 200) {
        const { data: liens, error: lienErr } = await supabase
          .from('factures_paiements')
          .select('paiement_id, factures(numero_affiche, statut)')
          .in('paiement_id', ids.slice(i, i + 200));
        if (lienErr) throw lienErr;
        for (const l of (liens || [])) {
          if (l.factures?.statut === 'emise') numeros.set(l.paiement_id, l.factures.numero_affiche);
        }
      }
    } catch (e) {
      reportError('[livre-recettes] numéros de facture illisibles:', e?.message, { route: '/api/export/livre-recettes' });
    }
  }

  let emetteur = {};
  try {
    const { data } = await supabase
      .from('profiles')
      .select('studio_nom, ville, facturation_raison_sociale, facturation_siret')
      .eq('id', user.id)
      .single();
    emetteur = {
      nom: data?.facturation_raison_sociale || data?.studio_nom || 'Mon studio',
      siret: data?.facturation_siret || null,
      ville: data?.ville || null,
    };
  } catch {
    emetteur = { nom: 'Mon studio' };
  }

  const livre = construireLivreRecettes({ paiements: retenus, numeros, periode, emetteur, exclusions });
  const base = `izisolo-livre-recettes-${periode.id}`;

  if (format === 'csv') {
    return new Response(livreEnCsv(livre), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${base}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  try {
    const pdf = await genererLivreRecettesPdf(livre);
    return reponsePdf(pdf, `${base}.pdf`);
  } catch (e) {
    reportError('[livre-recettes] rendu PDF:', e?.message, { route: '/api/export/livre-recettes' });
    return Response.json({ error: 'Impossible de générer le PDF' }, { status: 500 });
  }
});
