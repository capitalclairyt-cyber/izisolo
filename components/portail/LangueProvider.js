'use client';

/**
 * components/portail/LangueProvider.js — la langue du portail, côté navigateur.
 *
 * Le layout serveur du portail résout la langue (cookie > studio > fr) et la
 * descend ici. Tout composant client du portail écrit ensuite :
 *
 *   const { t, langue, locale } = useLangue();
 *   <button>{t(« Réserver ma place »)}</button>
 *   d.toLocaleDateString(locale, …)
 *
 * `LangueSwitch` est le petit sélecteur FR / EN de l'en-tête : il pose le
 * cookie `izi_lang` puis rafraîchit la page (le serveur re-rend dans la
 * nouvelle langue). Il ne s'affiche que si le studio a activé l'anglais, ou
 * si la visiteuse est déjà en anglais (pour qu'elle puisse revenir).
 */
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LANGUES_PORTAIL, LANGUE_DEFAUT, LIBELLES_LANGUES, cookieLangue, traducteur } from '@/lib/i18n-portail';

const LangueContext = createContext(null);

export default function LangueProvider({ langue = LANGUE_DEFAUT, children }) {
  const valeur = useMemo(() => {
    const t = traducteur(langue);
    return { langue: t.langue, locale: t.locale, t };
  }, [langue]);

  // L'attribut lang du document : les lecteurs d'écran et le correcteur du
  // navigateur s'en servent. Le layout racine dit « fr » ; on le corrige ici.
  useEffect(() => {
    try {
      document.documentElement.lang = valeur.langue;
    } catch { /* hors navigateur */ }
  }, [valeur.langue]);

  return <LangueContext.Provider value={valeur}>{children}</LangueContext.Provider>;
}

/** Hors provider (un composant partagé rendu ailleurs) : le français. */
export function useLangue() {
  const ctx = useContext(LangueContext);
  if (ctx) return ctx;
  const t = traducteur(LANGUE_DEFAUT);
  return { langue: t.langue, locale: t.locale, t };
}

/**
 * Toujours affiché, sur chaque portail : l'élève qui a besoin de l'anglais
 * est invisible pour la prof (Romain n'avait aucune idée que cinq de ses
 * élèves s'étaient arrêtées à la connexion). Deux lettres dans une pastille,
 * comme sur n'importe quel site.
 */
export function LangueSwitch() {
  const { langue } = useLangue();
  const router = useRouter();

  const choisir = (l) => {
    if (l === langue) return;
    try { document.cookie = cookieLangue(l); } catch { /* cookies bloqués */ }
    router.refresh();
  };

  return (
    <div className="portail-langue" role="group" aria-label="Langue / Language" data-testid="portail-langue">
      {LANGUES_PORTAIL.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choisir(l)}
          className={`portail-langue-btn${l === langue ? ' est-active' : ''}`}
          aria-pressed={l === langue}
          lang={l}
          title={LIBELLES_LANGUES[l]}
        >
          {l.toUpperCase()}
        </button>
      ))}
      <style jsx global>{`
        .portail-langue { display: inline-flex; align-items: center; border: 1px solid #e6dfd6; border-radius: 99px; padding: 2px; gap: 2px; background: #fff; }
        .portail-langue-btn { border: none; background: none; font: inherit; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; color: #8a8a8a; padding: 3px 8px; border-radius: 99px; cursor: pointer; line-height: 1.2; }
        .portail-langue-btn.est-active { background: var(--brand, #b87333); color: #fff; }
        .portail-langue-btn:not(.est-active):hover { color: #1a1a2e; }
      `}</style>
    </div>
  );
}
