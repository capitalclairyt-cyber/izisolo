'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import CLIPS from '@/public/videos/manifest.json';

/**
 * ReelPhone — un CLIP du réel (écran seul, 720 × 1558, rendu par
 * `reel/scripts/rendre-clips.mjs` depuis les scènes de reel/src/scenes.js)
 * dans le cadre téléphone de la landing (`.phone`, le même que les captures).
 *
 * Deux fichiers par clip dans /public/videos/ : `<clip>.mp4` (H.264 muet,
 * ~1 Mo, budget tenu par le script de rendu) et `<clip>-poster.jpg`. Le poster
 * est une vraie <Image> : c'est LUI qui est peint en premier (et qui compte
 * pour le LCP du hero, avec `priorite`), la vidéo se pose par-dessus dès
 * qu'elle joue. Jamais d'embed Instagram (scripts tiers, consentement, poids).
 *
 * Comportement : lecture muette en boucle quand le cadre entre à l'écran,
 * pause quand il en sort ; `preload="none"` sauf pour le hero, donc un clip ne
 * pèse rien tant qu'on ne le voit pas. `prefers-reduced-motion` : aucune
 * lecture auto, un bouton ▶ prend le relais. Un tap met en pause / relance.
 * Les clips sont muets à la source (aucune piste audio).
 */
export default function ReelPhone({ clip, titre, coupe = false, priorite = false, sizes = '300px' }) {
  const cadreRef = useRef(null);
  const videoRef = useRef(null);
  const [enLecture, setEnLecture] = useState(false);
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const cadre = cadreRef.current;
    if (!video || !cadre) return;
    const prefereReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduit(prefereReduit);

    const jouer = () => video.play().catch(() => setEnLecture(false));
    const io = new IntersectionObserver(([entree]) => {
      if (entree.isIntersecting) {
        if (!prefereReduit && !video.dataset.pauseManuelle) jouer();
      } else if (!video.paused) {
        video.pause();
      }
    }, { threshold: 0.3 });
    io.observe(cadre);
    return () => io.disconnect();
  }, []);

  const basculer = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      delete video.dataset.pauseManuelle;
      video.play().catch(() => setEnLecture(false));
    } else {
      video.dataset.pauseManuelle = '1';
      video.pause();
    }
  };

  return (
    <div className={`phone phone-clip ${coupe ? 'phone-coupe' : ''} ${enLecture ? 'is-playing' : ''}`} ref={cadreRef} data-clip={clip}>
      <button type="button" className="phone-ecran clip-tap" onClick={basculer}
        aria-label={enLecture ? 'Mettre la vidéo en pause' : 'Lire la vidéo'}>
        <Image src={`/videos/${clip}-poster.jpg`} alt={titre} width={CLIPS[clip].w} height={CLIPS[clip].h} priority={priorite} sizes={sizes} />
        <video
          ref={videoRef}
          src={`/videos/${clip}.mp4`}
          muted
          loop
          playsInline
          preload={priorite ? 'auto' : 'none'}
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setEnLecture(true)}
          onPause={() => setEnLecture(false)}
        />
        {(!enLecture && reduit) && (
          <span className="clip-play" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
          </span>
        )}
      </button>
    </div>
  );
}
