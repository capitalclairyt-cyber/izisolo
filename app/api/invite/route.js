import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { Resend } from 'resend';

export async function POST(req) {
  try {
    const { profile } = await requireAuth();
    const body = await req.json();
    const { email, prenom, studioSlug, studioNom, profPrenom } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Envoi email non configuré' }, { status: 500 });
    }

    const slug = studioSlug || profile.studio_slug;
    const studio = studioNom || profile.studio_nom || 'mon studio';
    const prof = profPrenom || profile.prenom || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';
    const portailUrl = `${appUrl}/p/${slug}/connexion`;
    const salutation = prenom ? `Salut ${prenom}` : 'Coucou';

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'IziSolo <bonjour@izisolo.fr>',
      to: email,
      subject: `Ton espace ${studio}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#b87333;margin:0 0 6px;">Ton espace élève t'attend !</h2>
          <p style="color:#555;margin:0 0 16px;">${salutation},</p>
          <p style="color:#555;margin:0 0 12px;">
            J'utilise un nouvel outil pour gérer les inscriptions, suivre tes cours et te tenir au courant : <strong>IziSolo</strong>.
          </p>
          <p style="color:#555;margin:0 0 12px;">
            Pour créer ton espace, rien de plus simple :
          </p>
          <ol style="color:#555;margin:0 0 16px;padding-left:20px;line-height:1.8;">
            <li>Clique sur le bouton ci-dessous</li>
            <li>Tape l'email auquel tu reçois ce message</li>
            <li>Tu reçois un lien magique — clique dessus, c'est tout !</li>
          </ol>
          <div style="text-align:center;margin:20px 0;">
            <a href="${portailUrl}" style="display:inline-block;padding:14px 28px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;font-size:1rem;">
              Accéder à mon espace
            </a>
          </div>
          <p style="color:#555;margin:0 0 12px;font-size:0.875rem;">
            Ensuite tu pourras voir tes cours réservés, t'inscrire à de nouveaux créneaux et garder un œil sur ton carnet de séances.
          </p>
          <p style="color:#999;margin:16px 0 0;font-size:0.8125rem;">
            Pas de mot de passe à retenir, c'est juste ton email à chaque fois.
          </p>
          <p style="color:#555;margin:16px 0 0;">
            À très vite${prof ? ' — ' + prof : ''} 🌿
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#bbb;font-size:0.6875rem;text-align:center;">
            Envoyé via <a href="https://izisolo.fr" style="color:#b87333;">IziSolo</a> de la part de ${studio}
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('Erreur envoi invitation:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
