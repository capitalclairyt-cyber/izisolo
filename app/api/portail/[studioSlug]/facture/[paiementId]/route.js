import { createServerClient } from '@/lib/supabase-server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const runtime = 'nodejs';

/**
 * Génère une facture PDF pour un paiement donné, accessible par l'élève authentifié
 * (uniquement ses propres paiements).
 */
export async function GET(request, { params }) {
  const { studioSlug, paiementId } = await params;

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Studio
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, adresse, code_postal, ville, telephone, email_contact')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return new Response('Studio introuvable', { status: 404 });

  // Client lié à cet user dans ce studio
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, prenom, nom, email, adresse, code_postal, ville')
    .eq('profile_id', profile.id)
    .ilike('email', user.email)
    .single();
  if (!client) return new Response('Client introuvable', { status: 404 });

  // Paiement (vérification que c'est bien le sien)
  const { data: paiement } = await supabaseAdmin
    .from('paiements')
    .select('id, intitule, montant, mode, date, date_encaissement, statut, notes')
    .eq('id', paiementId)
    .eq('profile_id', profile.id)
    .eq('client_id', client.id)
    .single();
  if (!paiement) return new Response('Facture introuvable', { status: 404 });

  // Génération PDF avec pdf-lib
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const grey = rgb(0.4, 0.4, 0.4);
  const brand = rgb(0.83, 0.63, 0.63); // #d4a0a0

  let y = 800;
  const left = 50;
  const right = 545;

  // ── En-tête studio
  page.drawText(profile.studio_nom || 'Studio', { x: left, y, size: 22, font: fontBold, color: black });
  y -= 28;
  if (profile.adresse) {
    page.drawText(profile.adresse, { x: left, y, size: 10, font, color: grey });
    y -= 14;
  }
  const cp = [profile.code_postal, profile.ville].filter(Boolean).join(' ');
  if (cp) { page.drawText(cp, { x: left, y, size: 10, font, color: grey }); y -= 14; }
  if (profile.telephone) { page.drawText(profile.telephone, { x: left, y, size: 10, font, color: grey }); y -= 14; }
  if (profile.email_contact) { page.drawText(profile.email_contact, { x: left, y, size: 10, font, color: grey }); y -= 14; }

  // ── Titre + numéro
  y = 720;
  page.drawText('REÇU DE PAIEMENT', { x: left, y, size: 14, font: fontBold, color: brand });
  y -= 18;
  const numFacture = `N° ${paiement.id.slice(0, 8).toUpperCase()}`;
  const dateEmission = new Date(paiement.date_encaissement || paiement.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  page.drawText(numFacture, { x: left, y, size: 10, font, color: grey });
  page.drawText(`Émis le ${dateEmission}`, { x: right - 150, y, size: 10, font, color: grey });

  // ── Client
  y = 660;
  page.drawText('Émis pour :', { x: left, y, size: 10, font, color: grey });
  y -= 16;
  page.drawText([client.prenom, client.nom].filter(Boolean).join(' '), { x: left, y, size: 12, font: fontBold, color: black });
  y -= 14;
  if (client.email) { page.drawText(client.email, { x: left, y, size: 10, font, color: grey }); y -= 14; }
  if (client.adresse) { page.drawText(client.adresse, { x: left, y, size: 10, font, color: grey }); y -= 14; }
  const cpClient = [client.code_postal, client.ville].filter(Boolean).join(' ');
  if (cpClient) { page.drawText(cpClient, { x: left, y, size: 10, font, color: grey }); y -= 14; }

  // ── Détail
  y = 540;
  page.drawRectangle({ x: left, y: y - 4, width: right - left, height: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;
  page.drawText('Désignation', { x: left, y, size: 10, font: fontBold, color: black });
  page.drawText('Mode', { x: 380, y, size: 10, font: fontBold, color: black });
  page.drawText('Montant TTC', { x: right - 90, y, size: 10, font: fontBold, color: black });
  y -= 12;
  page.drawRectangle({ x: left, y: y - 4, width: right - left, height: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;

  const intitule = paiement.intitule || 'Prestation';
  page.drawText(intitule.length > 50 ? intitule.slice(0, 47) + '...' : intitule, { x: left, y, size: 11, font, color: black });
  page.drawText(formatMode(paiement.mode), { x: 380, y, size: 11, font, color: black });
  page.drawText(`${parseFloat(paiement.montant).toFixed(2).replace('.', ',')} €`, { x: right - 90, y, size: 11, font, color: black });

  // ── Total
  y -= 50;
  page.drawRectangle({ x: 350, y: y - 4, width: right - 350, height: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;
  page.drawText('TOTAL', { x: 380, y, size: 12, font: fontBold, color: black });
  page.drawText(`${parseFloat(paiement.montant).toFixed(2).replace('.', ',')} €`, { x: right - 90, y, size: 14, font: fontBold, color: brand });

  // ── Mentions légales
  y = 100;
  page.drawText('TVA non applicable, art. 293 B du CGI (auto-entrepreneur ou micro-entreprise).', {
    x: left, y, size: 8, font, color: grey,
  });
  y -= 12;
  page.drawText(`Reçu généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} par IziSolo.`, {
    x: left, y, size: 8, font, color: grey,
  });

  const pdfBytes = await pdf.save();

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recu-${profile.studio_nom?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'studio'}-${paiement.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

function formatMode(mode) {
  const map = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement', CB: 'CB' };
  return map[mode] || mode || '—';
}
