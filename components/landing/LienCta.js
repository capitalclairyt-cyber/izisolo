'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { lireAcquisition, hrefAvecAcquisition } from '@/lib/acquisition';

/**
 * Le `next/link` des pages marketing : recopie les `utm_*` de l'URL courante
 * sur chaque lien interne, pour que la source d'une visiteuse arrivée par une
 * annonce suive jusqu'à /register et /creer-mon-studio (lib/acquisition).
 *
 * Le premier rendu garde l'href tel quel (identique au serveur : aucune erreur
 * d'hydratation), l'URL se lit après montage. Sans utm dans l'URL, rien ne
 * change pour personne. Aucun cookie, aucun stockage : la page RGPD tient.
 */
export default function LienCta({ href, ...props }) {
  const [acq, setAcq] = useState(null);
  useEffect(() => {
    try { setAcq(lireAcquisition(window.location.search)); } catch { /* rien : lien intact */ }
  }, []);
  return <Link href={hrefAvecAcquisition(href, acq)} {...props} />;
}
