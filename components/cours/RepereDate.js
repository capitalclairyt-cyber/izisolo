'use client';

import { repereDate } from '@/lib/dates';

/**
 * Le jour de la semaine, écrit sous un champ de date.
 *
 * Pourquoi ce composant existe : cf. `repereDate` dans lib/dates.js. En deux
 * mots, un `<input type="date">` natif n'annonce jamais le jour de la semaine,
 * et son petit calendrier est dessiné par le navigateur, pas par nous. Une
 * année mal tapée passe donc totalement inaperçue.
 *
 * ⚠️ Styles EN LIGNE, volontairement. La classe `.form-hint` qui conviendrait
 * ici vit dans un `<style jsx>` SCOPÉ de chaque page : posée depuis un
 * composant séparé, elle ne matcherait rien et ce repère sortirait nu (le
 * piège §12 de la bible, qui a déjà mordu six fois).
 */
export default function RepereDate({ iso }) {
  const r = repereDate(iso);
  if (!r) return null;

  return (
    <p
      style={{
        margin: '6px 0 0',
        fontSize: '0.75rem',
        lineHeight: 1.4,
        color: r.anneeSuspecte ? 'var(--danger)' : 'var(--text-muted)',
        fontWeight: r.anneeSuspecte ? 600 : 400,
      }}
    >
      {r.anneeSuspecte
        ? `⚠️ ${r.label}. C'est bien l'année ${r.annee} que tu veux ?`
        : r.label}
    </p>
  );
}
