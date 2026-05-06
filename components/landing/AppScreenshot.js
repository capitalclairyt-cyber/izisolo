'use client';

import Image from 'next/image';

/**
 * Wrapper "fenêtre Chrome stylisée" autour d'une vraie capture d'écran de
 * l'app IziSolo. Remplace l'ancien <AppMockup /> qui rendait un faux
 * dashboard (rendu peu crédible). Les captures sont dans /public/landing/.
 *
 * Props :
 *   - src     : chemin du PNG (ex: '/landing/screen-1-dashboard.png')
 *   - alt     : description accessible
 *   - urlPath : ce qui s'affiche dans la barre d'URL (ex: 'dashboard', 'agenda')
 *   - floating: si true, ajoute les pings flottants (sur le hero uniquement)
 *   - priority: chargement prioritaire (true pour le hero)
 */
export default function AppScreenshot({
  src,
  alt = 'Capture d\'écran IziSolo',
  urlPath = 'dashboard',
  floating = false,
  priority = false,
}) {
  return (
    <div className={`app-mockup ${floating ? 'floating' : ''}`}>
      <div className="app-chrome">
        <div className="dots"><span /><span /><span /></div>
        <div className="url-bar">
          <span className="lock">⏷</span>
          izisolo.fr/{urlPath}
        </div>
        <div className="chrome-actions"><span /><span /></div>
      </div>

      <div className="app-screenshot-frame">
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={760}
          priority={priority}
          sizes="(max-width: 768px) 100vw, 600px"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>
    </div>
  );
}
