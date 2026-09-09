'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Callouts — les flèches du réel, dessinées DANS LA PAGE, en SVG, au moment où
 * la rangée entre à l'écran. Chaque point fort = une carte de couleur vive
 * (terracotta, sauge : les teintes du réel), numérotée, et une flèche courbe
 * qui se trace de la carte vers un endroit précis du visuel, puis un anneau
 * qui pulse là où elle arrive.
 *
 * Pourquoi dans la page et pas dans une vidéo : sur un visuel FIXE, une
 * flèche vectorielle reste nette à toute taille, le texte reste du texte
 * (accessible, sélectionnable) et rien n'est à re-rendre quand un libellé
 * change. Les clips vidéo gardent, eux, leurs repères animés à l'intérieur.
 *
 * `points` : [{ cible: [x %, y %], carte: [x %, y %], courbure, label, sous }]
 * en POURCENTAGES du visuel, donc valables à toute largeur. Les cartes sont
 * mesurées après rendu pour faire partir la flèche du bon bord.
 * Reduced motion : tout est affiché d'emblée, rien ne bouge.
 */
const TEINTES = ['#c4552a', '#3b7d5e'];

const bezier = (a, c, b, t) => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

export default function Callouts({ points, children, className = '' }) {
  const boxRef = useRef(null);
  const cartesRef = useRef([]);
  const [geo, setGeo] = useState(null);
  const [on, setOn] = useState(false);

  // Géométrie : lue après rendu, refaite à chaque redimensionnement.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const mesurer = () => {
      const b = box.getBoundingClientRect();
      if (!b.width) return;
      // Les cibles se lisent en % du VISUEL (data-cible-ref, l'image), pas du
      // bloc entier : la barre du mockup n'a pas la même part à toute largeur.
      const ref = box.querySelector('[data-cible-ref]');
      const r = ref ? ref.getBoundingClientRect() : b;
      const fleches = points.map((p, i) => {
        const el = cartesRef.current[i];
        const vers = { x: r.left - b.left + (p.cible[0] / 100) * r.width, y: r.top - b.top + (p.cible[1] / 100) * r.height };
        if (!el) return null;
        const c = el.getBoundingClientRect();
        const carte = { left: c.left - b.left, top: c.top - b.top, w: c.width, h: c.height };
        const cx = carte.left + carte.w / 2;
        const cy = carte.top + carte.h / 2;
        // La flèche part du bord de la carte qui regarde la cible (côté ou haut/bas).
        const dx = vers.x - cx; const dy = vers.y - cy;
        const de = Math.abs(dx) * carte.h > Math.abs(dy) * carte.w
          ? { x: dx > 0 ? carte.left + carte.w : carte.left, y: cy }
          : { x: cx, y: dy > 0 ? carte.top + carte.h : carte.top };
        const l = Math.hypot(vers.x - de.x, vers.y - de.y) || 1;
        const courbure = p.courbure ?? 48;
        const ctrl = { x: (de.x + vers.x) / 2 - ((vers.y - de.y) / l) * courbure, y: (de.y + vers.y) / 2 + ((vers.x - de.x) / l) * courbure };
        const marge = Math.min(22, l * 0.2);
        const bout = bezier(de, ctrl, vers, 1 - marge / l);
        const avant = bezier(de, ctrl, vers, 1 - (marge + 4) / l);
        const angle = (Math.atan2(bout.y - avant.y, bout.x - avant.x) * 180) / Math.PI;
        return { d: `M ${de.x} ${de.y} Q ${ctrl.x} ${ctrl.y} ${bout.x} ${bout.y}`, bout, angle, vers };
      });
      setGeo({ w: b.width, h: b.height, fleches });
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(box);
    return () => ro.disconnect();
  }, [points]);

  // Déclenchement : quand le visuel est aux deux tiers dans l'écran.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`co ${on ? 'is-on' : ''} ${className}`} ref={boxRef}>
      {children}
      {geo && (
        <svg className="co-svg" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true">
          {geo.fleches.map((f, i) => f && (
            <g key={i} style={{ '--d': `${0.25 + i * 0.55}s`, color: TEINTES[i % TEINTES.length] }}>
              <path className="co-path" d={f.d} pathLength="1" />
              <path className="co-tete" d="M -13 -8 L 1 0 L -13 8" transform={`translate(${f.bout.x} ${f.bout.y}) rotate(${f.angle})`} />
              <circle className="co-onde" cx={f.vers.x} cy={f.vers.y} r="10" />
              <circle className="co-anneau" cx={f.vers.x} cy={f.vers.y} r="11" />
            </g>
          ))}
        </svg>
      )}
      {points.map((p, i) => (
        <div key={i} className="co-carte" ref={el => { cartesRef.current[i] = el; }}
          style={{ left: `${p.carte[0]}%`, top: `${p.carte[1]}%`, '--d': `${i * 0.55}s`, '--teinte': TEINTES[i % TEINTES.length] }}>
          <span className="co-num">{i + 1}</span>
          <span className="co-texte"><b>{p.label}</b><small>{p.sous}</small></span>
        </div>
      ))}
    </div>
  );
}
