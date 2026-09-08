import { Img, staticFile } from 'remotion';
import { P } from '../theme';

export const BEZEL = 28;

// Géométrie d'un téléphone : où tombe, sur la composition, un point de l'image
// (en px de la capture), compte tenu d'un éventuel défilement de l'écran.
export const geometrieTelephone = ({ x, y, screenW, imgW, imgH, hauteurEcran }) => {
  const echelle = screenW / imgW;
  const hEcran = hauteurEcran ?? imgH * echelle;
  return {
    echelle,
    hEcran,
    largeur: screenW + BEZEL * 2,
    hauteur: hEcran + BEZEL * 2,
    point: ([ix, iy], defilement = 0) => ({ x: x + BEZEL + ix * echelle, y: y + BEZEL + (iy - defilement) * echelle }),
  };
};

// Une capture posée dans l'écran, éventuellement décalée (défilement en px de capture).
export const Ecran = ({ src, screenW, imgW, imgH, defilement = 0, style }) => {
  const echelle = screenW / imgW;
  return (
    <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: -defilement * echelle, width: screenW,
      height: imgH * echelle, display: 'block', ...style }} />
  );
};

export const Telephone = ({ x, y, screenW, imgW, imgH, hauteurEcran, children }) => {
  const g = geometrieTelephone({ x, y, screenW, imgW, imgH, hauteurEcran });
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: g.largeur, height: g.hauteur, borderRadius: 60,
      background: P.bezel, padding: BEZEL, boxSizing: 'border-box',
      boxShadow: '0 40px 90px rgba(44,33,24,0.28), 0 6px 18px rgba(44,33,24,0.12)' }}>
      <div style={{ position: 'relative', width: screenW, height: g.hEcran, borderRadius: 60 - BEZEL, overflow: 'hidden', background: '#fff' }}>
        {children}
      </div>
    </div>
  );
};
