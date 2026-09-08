import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, P } from '../theme';

export const BARRE = 48;

// Une capture desktop dans un cadre de navigateur, agrandie pour rester lisible
// sur un téléphone, avec un lent panoramique horizontal pour montrer la largeur.
export const geometrieNavigateur = ({ x, y, w, echelle, imgW, imgH, hVisible, panDe, panA }, frame, dureeScene) => {
  const pan = interpolate(frame, [0, dureeScene], [panDe, panA], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad),
  });
  const hauteurEcran = Math.min(hVisible ?? imgH * echelle, imgH * echelle);
  return {
    pan, hauteurEcran,
    largeurImage: imgW * echelle, hauteurImage: imgH * echelle,
    largeur: w, hauteur: hauteurEcran + BARRE,
    point: ([ix, iy]) => ({ x: x + ix * echelle + pan, y: y + BARRE + iy * echelle }),
  };
};

export const Navigateur = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const g = geometrieNavigateur(props, frame, durationInFrames);
  const { src, x, y, w } = props;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: g.hauteur, borderRadius: 26, overflow: 'hidden',
      background: '#fff', boxShadow: '0 40px 90px rgba(44,33,24,0.22), 0 6px 18px rgba(44,33,24,0.10)',
      border: '1px solid rgba(44,33,24,0.08)', boxSizing: 'border-box' }}>
      <div style={{ height: BARRE, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', background: '#f6f1ea',
        borderBottom: '1px solid rgba(44,33,24,0.08)', boxSizing: 'border-box' }}>
        {['#e8a29a', '#e9c98a', '#a9cf9c'].map((c) => <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
        <span style={{ marginLeft: 18, flex: 1, height: 28, borderRadius: 14, background: '#fff', border: '1px solid rgba(44,33,24,0.08)',
          fontFamily: FONT_BODY, fontSize: 16, color: P.inkSoft, display: 'flex', alignItems: 'center', paddingLeft: 14 }}>izisolo.fr</span>
      </div>
      <div style={{ position: 'relative', width: w, height: g.hauteurEcran, overflow: 'hidden' }}>
        <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: 0, width: g.largeurImage, height: g.hauteurImage,
          transform: `translateX(${g.pan}px)` }} />
      </div>
    </div>
  );
};
