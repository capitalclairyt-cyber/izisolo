'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * IziSolo — Fond décoratif (Canvas)
 * Illustrations PNG Canva teintées dynamiquement avec la couleur brand
 * Grille diagonale 45° avec simple toggle on/off
 *
 * Technique de teinte : on dessine le PNG sur un canvas offscreen,
 * puis on utilise globalCompositeOperation 'source-in' pour remplacer
 * les pixels noirs par la couleur brand du praticien.
 * Le fond blanc de l'image est rendu transparent par seuillage.
 */

// ===== LISTE DES ILLUSTRATIONS DISPONIBLES =====
const ILLUSTRATION_FILES = {
  lotus: '/illustrations/lotus.jpg',
  mandala: '/illustrations/mandala.jpg',
  vague: '/illustrations/vague.jpg',
  montagne: '/illustrations/montagne.jpg',
  'clef-sol': '/illustrations/clef-sol.jpg',
  danseuse: '/illustrations/danseuse.jpg',
  pinceau: '/illustrations/pinceau.jpg',
  meditation: '/illustrations/meditation.jpg',
  pilates: '/illustrations/pilates.jpg',
  guitare: '/illustrations/guitare.jpg',
  micro: '/illustrations/micro.jpg',
  bienetre: '/illustrations/bienetre.jpg',
  buddha: '/illustrations/buddha.jpg',
  ganesh: '/illustrations/ganesh.jpg',
};

// ===== OPTIONS POUR L'UI DE PARAMÈTRES =====
export const ILLUSTRATION_OPTIONS = [
  { value: 'lotus', label: 'Lotus', emoji: '🪷', metiers: ['yoga', 'pilates', 'meditation'] },
  { value: 'mandala', label: 'Mandala', emoji: '🔮', metiers: ['yoga', 'pilates', 'meditation'] },
  { value: 'vague', label: 'Vague zen', emoji: '🌊', metiers: ['yoga', 'pilates', 'zen'] },
  { value: 'montagne', label: 'Montagne', emoji: '⛰️', metiers: ['coaching', 'sport', 'randonnee'] },
  { value: 'clef-sol', label: 'Musique', emoji: '🎵', metiers: ['musique', 'chant'] },
  { value: 'danseuse', label: 'Danse', emoji: '💃', metiers: ['danse', 'ballet'] },
  { value: 'pinceau', label: 'Arts', emoji: '🎨', metiers: ['arts', 'dessin', 'peinture'] },
  { value: 'meditation', label: 'Méditation', emoji: '🧘', metiers: ['yoga', 'meditation', 'sophrologie'] },
  { value: 'pilates', label: 'Pilates', emoji: '🤸', metiers: ['pilates', 'yoga', 'fitness'] },
  { value: 'guitare', label: 'Guitare', emoji: '🎸', metiers: ['musique', 'guitare'] },
  { value: 'micro', label: 'Chant / Voix', emoji: '🎤', metiers: ['chant', 'musique', 'podcast'] },
  { value: 'bienetre', label: 'Bien-être', emoji: '🪨', metiers: ['spa', 'massage', 'bienetre'] },
  { value: 'buddha', label: 'Buddha', emoji: '☸️', metiers: ['yoga', 'meditation', 'spiritualite'] },
  { value: 'ganesh', label: 'Ganesh', emoji: '🐘', metiers: ['yoga', 'meditation', 'spiritualite'] },
  { value: 'aucun', label: 'Aucune', emoji: '✕', metiers: [] },
];

// ===== TEINTE DYNAMIQUE =====
// Prend une image source (noir sur blanc) et retourne un canvas
// avec les noirs remplacés par brandColor et les blancs transparents
function tintImage(sourceImg, brandColor, size) {
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext('2d');

  // 1. Dessiner l'image source
  ctx.drawImage(sourceImg, 0, 0, size, size);

  // 2. Lire les pixels et transformer : blanc → transparent, noir → brand
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  // Parser la couleur brand en RGB
  const r = parseInt(brandColor.slice(1, 3), 16) || 0;
  const g = parseInt(brandColor.slice(3, 5), 16) || 0;
  const b = parseInt(brandColor.slice(5, 7), 16) || 0;

  // Seuil : pixels clairs (> 200 sur les 3 canaux) → transparent
  // Pixels sombres → teintés avec la couleur brand
  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i];
    const pg = data[i + 1];
    const pb = data[i + 2];

    // Luminosité du pixel (0 = noir, 255 = blanc)
    const lum = (pr + pg + pb) / 3;

    if (lum > 200) {
      // Pixel clair → transparent
      data[i + 3] = 0;
    } else {
      // Pixel sombre → couleur brand avec alpha proportionnel à l'obscurité
      const alpha = Math.round((1 - lum / 255) * 255);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return offscreen;
}

// ===== GRILLE DIAGONALE 45° =====
function drawDiagonalGrid(ctx, w, h, brandColor, fadeCX, fadeCY) {
  const fadeR = Math.max(w, h) * 0.35;
  const opacity = 0.12;
  const step = 22;
  const maxDim = Math.max(w, h);

  ctx.save();
  ctx.strokeStyle = brandColor;
  ctx.lineWidth = 1;

  for (let offset = -maxDim; offset < maxDim * 2; offset += step) {
    // NE-SW
    const mx1 = (offset + offset - h) / 2, my1 = h / 2;
    const dist1 = Math.sqrt((mx1 - fadeCX) ** 2 + (my1 - fadeCY) ** 2);
    ctx.globalAlpha = opacity * Math.min(1, dist1 / fadeR);
    ctx.beginPath(); ctx.moveTo(offset, 0); ctx.lineTo(offset - h, h); ctx.stroke();

    // NW-SE
    const mx2 = (offset + offset + h) / 2, my2 = h / 2;
    const dist2 = Math.sqrt((mx2 - fadeCX) ** 2 + (my2 - fadeCY) ** 2);
    ctx.globalAlpha = opacity * Math.min(1, dist2 / fadeR);
    ctx.beginPath(); ctx.moveTo(offset, 0); ctx.lineTo(offset + h, h); ctx.stroke();
  }

  ctx.restore();
}

// ===== COMPOSANT PRINCIPAL =====
export default function BackgroundDecor({ illustration = 'lotus', grilleActive = true, animationActive = true, contained = false }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const animRef = useRef(null);
  const startTime = useRef(Date.now());
  const brandRef = useRef('#d4a0a0');

  // Cache : clé = "name|color", valeur = canvas offscreen teinté
  const tintCache = useRef(new Map());
  // Cache des images sources chargées : clé = name, valeur = HTMLImageElement
  const sourceCache = useRef(new Map());

  // Suivre la couleur brand + vider le cache teinte si elle change
  useEffect(() => {
    const update = () => {
      const newBrand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#d4a0a0';
      if (newBrand !== brandRef.current) {
        brandRef.current = newBrand;
        tintCache.current.clear();
      }
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Charger l'image source (une seule fois par illustration)
  useEffect(() => {
    if (illustration === 'aucun') return;
    const src = ILLUSTRATION_FILES[illustration];
    if (!src || sourceCache.current.has(illustration)) return;

    const img = new Image();
    img._loaded = false;
    img.onload = () => { img._loaded = true; };
    img.onerror = () => { console.warn('BackgroundDecor: failed to load', illustration); };
    img.src = src;
    sourceCache.current.set(illustration, img);
  }, [illustration]);

  // Obtenir ou créer le canvas teinté
  const getTintedCanvas = useCallback((name, color) => {
    const key = `${name}|${color}`;
    if (tintCache.current.has(key)) return tintCache.current.get(key);

    const sourceImg = sourceCache.current.get(name);
    if (!sourceImg || !sourceImg._loaded) return null;

    // Teinter à 800px pour une bonne résolution
    const tinted = tintImage(sourceImg, color, 800);
    tintCache.current.set(key, tinted);
    return tinted;
  }, []);

  // Peinture
  const paint = useCallback((time) => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const rect = contained
      ? wrapper.getBoundingClientRect()
      : { width: window.innerWidth, height: window.innerHeight };
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const brand = brandRef.current;
    const baseCX = w * 0.5;
    const baseCY = h * (contained ? 0.5 : 0.45);

    // Animation douce (désactivable)
    let breathScale = 1, floatX = 0, floatY = 0, rotateAngle = 0;
    if (animationActive) {
      const t = (time - startTime.current) / 1000;
      breathScale = 1 + Math.sin(t * 0.4) * 0.06;
      floatX = Math.sin(t * 0.25) * (contained ? 3 : 8);
      floatY = Math.cos(t * 0.32) * (contained ? 2 : 6);
      rotateAngle = Math.sin(t * 0.12) * 0.012;
    }

    const cx = baseCX + floatX;
    const cy = baseCY + floatY;

    // 1. Grille
    if (grilleActive) {
      drawDiagonalGrid(ctx, w, h, brand, cx, cy);
    }

    // 2. Illustration
    if (illustration !== 'aucun') {
      const tinted = getTintedCanvas(illustration, brand);
      if (tinted) {
        const illuSize = contained ? Math.min(w, h) * 0.7 : Math.min(w, h) * 0.75;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotateAngle);
        ctx.scale(breathScale, breathScale);
        ctx.translate(-cx, -cy);
        ctx.globalAlpha = contained ? 0.45 : 0.3;
        ctx.drawImage(tinted, cx - illuSize / 2, cy - illuSize / 2, illuSize, illuSize);
        ctx.restore();
      }
    }
  }, [illustration, grilleActive, animationActive, contained, getTintedCanvas]);

  // Boucle d'animation (~20fps) — crash-resilient
  useEffect(() => {
    let running = true;
    let lastFrame = 0;

    const loop = () => {
      if (!running) return;
      animRef.current = requestAnimationFrame(loop);
      const now = Date.now();
      if (now - lastFrame > 50) {
        try { paint(now); } catch (e) { console.error('BackgroundDecor paint:', e); }
        lastFrame = now;
      }
    };

    loop();
    const onResize = () => { try { paint(Date.now()); } catch (e) { /* ignore */ } };
    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [paint]);

  if (illustration === 'aucun' && !grilleActive) return null;

  const style = contained
    ? { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 'inherit', background: 'var(--bg-page)' }
    : { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: 'var(--bg-page)' };

  return (
    <div ref={wrapperRef} className={contained ? '' : 'izi-bg-decor'} aria-hidden="true" style={style}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}
