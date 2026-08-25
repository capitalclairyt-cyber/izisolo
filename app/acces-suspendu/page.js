import Link from 'next/link';

/**
 * /acces-suspendu — la prof invitée dont le studio n'a plus le plan Multi.
 *
 * Sa ligne d'équipe existe toujours : le jour où le studio re-souscrit, tout
 * revient sans qu'on ait rien à refaire. Mais la porte est fermée, sinon un
 * downgrade ne coûterait rien et personne ne paierait le plan.
 *
 * Cet écran existe pour une seule raison : ne pas la laisser devant un
 * onboarding qui n'a rien à voir avec sa situation, en se demandant ce
 * qu'elle a cassé. Elle n'a rien cassé, et ce n'est pas à elle d'agir.
 */
export const metadata = {
  title: 'Accès en pause',
  robots: { index: false, follow: false },
};

export default function AccesSuspendu() {
  return (
    <main className="asus-wrap">
      <div className="asus-carte">
        <div className="asus-emoji">🌿</div>
        <h1>Ton accès est en pause</h1>
        <p className="asus-texte">
          Le studio qui t&apos;a invitée n&apos;a plus l&apos;abonnement qui permet de travailler à plusieurs.
          Ta place est gardée : dès que l&apos;abonnement reprend, tu retrouves tout, exactement où tu
          l&apos;avais laissé.
        </p>
        <p className="asus-aide">
          Rien à faire de ton côté. Préviens simplement la personne qui gère le studio.
        </p>
        <div className="asus-actions">
          <Link href="/onboarding" className="asus-btn">Mon espace IziSolo</Link>
          <a href="mailto:bonjour@izisolo.fr" className="asus-lien">Écrire à IziSolo</a>
        </div>
      </div>

      <style>{`
        .asus-wrap {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 24px; background: var(--c-bg, #fdfbf8);
          font-family: var(--font-geist, system-ui, sans-serif); color: var(--c-ink, #2b2321);
        }
        .asus-carte {
          max-width: 480px; text-align: center; background: #fff; border-radius: 18px;
          border: 1px solid rgba(0,0,0,.07); padding: 34px 28px;
        }
        .asus-emoji { font-size: 40px; margin-bottom: 10px; }
        .asus-carte h1 {
          font-family: var(--font-fraunces, Georgia, serif); font-size: 1.7rem; margin: 0 0 14px;
        }
        .asus-texte { margin: 0 0 12px; line-height: 1.6; color: var(--c-ink-soft, #6b5f5a); }
        .asus-aide { margin: 0 0 22px; font-size: .9rem; color: var(--c-ink-soft, #6b5f5a); }
        .asus-actions { display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; }
        .asus-btn {
          display: inline-block; padding: 11px 20px; border-radius: 11px; font-weight: 600;
          background: var(--c-accent, #b07a44); color: #fff; text-decoration: none;
        }
        .asus-lien { color: var(--c-ink-soft, #6b5f5a); font-size: .88rem; }
      `}</style>
    </main>
  );
}
