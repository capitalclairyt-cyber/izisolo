'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * ReelPhone — un réel produit (vidéo 9:16) dans un cadre téléphone, pour la
 * landing. Auto-hébergé (JAMAIS d'embed Instagram : scripts tiers, consent,
 * poids). Les MP4 vivent dans /public/videos/ (compressés ~3 Mo, sous-titres
 * incrustés) — les masters restent dans ressources/ (gitignoré).
 *
 * Comportement : lecture muette en boucle quand le cadre entre dans le
 * viewport, pause quand il en sort. `preload="none"` + poster : la vidéo ne
 * pèse rien tant qu'on ne la voit pas. `prefers-reduced-motion` : aucune
 * lecture auto, un bouton ▶ prend le relais. Un tap met en pause / relance.
 * Les réels landing sont muets (piste audio retirée à l'export — la musique
 * Instagram n'est de toute façon licenciée que pour Instagram).
 */
export default function ReelPhone({ src, poster, titre }) {
  const cadreRef = useRef(null);
  const videoRef = useRef(null);
  const reduitRef = useRef(false);   // prefers-reduced-motion, lu au montage
  const enVueRef = useRef(false);
  const [enLecture, setEnLecture] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const cadre = cadreRef.current;
    if (!video || !cadre) return;

    reduitRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const jouer = () => video.play().then(() => setEnLecture(true)).catch(() => setEnLecture(false));
    const pauser = () => { video.pause(); setEnLecture(false); };

    const io = new IntersectionObserver(([entree]) => {
      enVueRef.current = entree.isIntersecting;
      if (entree.isIntersecting) {
        if (!reduitRef.current && !video.dataset.pauseManuelle) jouer();
      } else if (!video.paused) {
        pauser();
      }
    }, { threshold: 0.35 });
    io.observe(cadre);
    return () => io.disconnect();
  }, []);

  // Tap sur la vidéo (ou le bouton ▶) : bascule lecture/pause.
  const basculer = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      delete video.dataset.pauseManuelle;
      video.play().then(() => setEnLecture(true)).catch(() => setEnLecture(false));
    } else {
      video.dataset.pauseManuelle = '1';
      video.pause();
      setEnLecture(false);
    }
  };

  return (
    <div className="reel-phone" ref={cadreRef}>
      <button
        type="button"
        className="reel-tap"
        onClick={basculer}
        aria-label={enLecture ? 'Mettre la vidéo en pause' : 'Lire la vidéo'}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          aria-label={titre}
        />
        {!enLecture && (
          <span className="reel-play" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
          </span>
        )}
      </button>

      <style jsx>{`
        .reel-phone {
          /* Dimensionné par la LARGEUR (le parent la fixe), la hauteur suit le
             ratio. Jamais height:100% dans une grille à piste auto : le
             pourcentage ne se résout pas et le cadre s'étale (vu au 1er rendu). */
          width: 100%;
          aspect-ratio: 9 / 16;
          padding: 7px;
          background: #1a1612;
          border-radius: 30px;
          box-shadow: var(--shadow-lg, 0 18px 40px rgba(40, 26, 16, 0.22));
        }
        .reel-tap {
          position: relative;
          display: block;
          width: 100%;
          height: 100%;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 24px;
          overflow: hidden;
        }
        video {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #1a1612;
        }
        .reel-play {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(26, 22, 18, 0.72);
          color: #fff;
          padding-left: 4px; /* centre optique du triangle */
        }
      `}</style>
    </div>
  );
}
