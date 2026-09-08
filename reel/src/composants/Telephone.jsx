import { Img, staticFile } from 'remotion';
import { P } from '../theme';

export const BEZEL = 28;

// Géométrie d'un téléphone : où tombe, sur la composition, un point de l'image.
export const geometrieTelephone = ({ x, y, screenW, imgW, imgH }) => {
  const echelle = screenW / imgW;
  return {
    echelle,
    largeur: screenW + BEZEL * 2,
    hauteur: imgH * echelle + BEZEL * 2,
    point: ([ix, iy]) => ({ x: x + BEZEL + ix * echelle, y: y + BEZEL + iy * echelle }),
  };
};

export const Telephone = ({ src, imgW, imgH, x, y, screenW }) => {
  const g = geometrieTelephone({ x, y, screenW, imgW, imgH });
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: g.largeur, height: g.hauteur, borderRadius: 60,
      background: P.bezel, padding: BEZEL, boxSizing: 'border-box',
      boxShadow: '0 40px 90px rgba(44,33,24,0.28), 0 6px 18px rgba(44,33,24,0.12)' }}>
      <div style={{ width: screenW, height: imgH * g.echelle, borderRadius: 60 - BEZEL, overflow: 'hidden', background: '#fff' }}>
        <Img src={staticFile(src)} style={{ width: screenW, height: imgH * g.echelle, display: 'block' }} />
      </div>
    </div>
  );
};
