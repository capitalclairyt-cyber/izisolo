'use client';

// ════════════════════════════════════════════════════════════════════════════
// Affichette QR prête à imprimer (v1, 2026-07-26).
// Ouverte depuis la modale « Mon QR code » — la prof clique Imprimer et colle.
// A4 portrait, charte Sauge & Cuivre à l'écran, noir sur blanc à l'impression.
// window.print() = le PDF sort du navigateur, zéro lib de plus.
// ════════════════════════════════════════════════════════════════════════════

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Printer, ArrowLeft } from 'lucide-react';

const TITRES = {
  carte:   { titre: 'Découvre mon studio',            sous: 'Planning, infos pratiques et réservation en ligne.' },
  flyer:   { titre: 'Viens essayer un cours',         sous: "Scanne pour demander ton cours d'essai, ça prend 30 secondes." },
  affiche: { titre: 'Réserve tes séances en ligne',   sous: 'Scanne pour retrouver ton espace élève : réservations, carnet, messages.' },
};

function Affichette() {
  const sp = useSearchParams();
  const slug = sp.get('slug') || '';
  const nom = sp.get('nom') || 'Mon studio';
  const preset = TITRES[sp.get('preset')] ? sp.get('preset') : 'carte';
  const couleur = sp.get('couleur') === 'cuivre' ? '#7A4A1E' : '#1a1a1a';
  const [qr, setQr] = useState(null);
  // Origin en state + useEffect : le rendu serveur ET le premier rendu client
  // affichent le fallback prod (cohérents → pas d'hydration mismatch, attrapé
  // par le smoke du 26/07), puis l'effet ajuste en dev. Même pattern que le
  // portalPath du dashboard.
  const [origin, setOrigin] = useState('https://www.izisolo.fr');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const path = preset === 'flyer' ? '/essai' : preset === 'affiche' ? '/connexion' : '';
  const url = `${origin}/p/${slug}${path}?src=qr-${preset}`;
  const urlLisible = url.replace(/^https?:\/\//, '').replace(/\?src=.*$/, '');

  useEffect(() => {
    if (!slug) return;
    QRCode.toDataURL(url, { width: 640, margin: 3, color: { dark: couleur, light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url, couleur, slug]);

  if (!slug) return <p style={{ padding: 40 }}>Lien incomplet : repasse par la modale « Mon QR code ».</p>;

  return (
    <div className="aff-page">
      {/* Barre d'outils — jamais imprimée */}
      <div className="aff-toolbar">
        <button type="button" className="izi-btn izi-btn-ghost" onClick={() => window.close()}>
          <ArrowLeft size={15} /> Retour
        </button>
        <button type="button" className="izi-btn izi-btn-primary" onClick={() => window.print()}>
          <Printer size={15} /> Imprimer l'affichette
        </button>
      </div>

      <div className="aff-feuille">
        <div className="aff-studio">{nom}</div>
        <h1 className="aff-titre">{TITRES[preset].titre}</h1>
        <p className="aff-sous">{TITRES[preset].sous}</p>
        {qr && <img className="aff-qr" src={qr} alt={`QR code vers ${urlLisible}`} />}
        <div className="aff-url">{urlLisible}</div>
        <div className="aff-credit">propulsé par izisolo.fr</div>
      </div>

      <style jsx>{`
        .aff-page { min-height: 100vh; background: var(--bg-soft, #F8F4ED); padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .aff-toolbar { display: flex; gap: 10px; }
        .aff-feuille {
          background: white; width: min(100%, 620px); aspect-ratio: 210 / 297;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 18px; padding: 48px 36px; text-align: center;
          border-radius: 6px; box-shadow: 0 8px 30px rgba(60, 45, 30, 0.12);
        }
        .aff-studio { font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #7A4A1E; }
        .aff-titre { font-size: 2.25rem; line-height: 1.15; font-weight: 800; color: #1a1a1a; margin: 0; }
        .aff-sous { font-size: 1rem; color: #555; margin: 0; max-width: 40ch; }
        .aff-qr { width: min(62%, 320px); height: auto; }
        .aff-url { font-family: ui-monospace, monospace; font-size: 0.875rem; color: #333; }
        .aff-credit { font-size: 0.6875rem; color: #aaa; margin-top: 8px; }

        @media print {
          .aff-page { background: white; padding: 0; }
          .aff-toolbar { display: none; }
          .aff-feuille { box-shadow: none; border-radius: 0; width: 100%; aspect-ratio: auto; min-height: 96vh; }
        }
      `}</style>
    </div>
  );
}

export default function QrAffichePage() {
  return (
    <Suspense fallback={null}>
      <Affichette />
    </Suspense>
  );
}
