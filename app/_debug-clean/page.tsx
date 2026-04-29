/**
 * /_debug-clean — page de debug d'urgence
 *
 * Désinstalle agressivement le service worker, purge tous les caches
 * (SW + Cache API + localStorage), et affiche un état détaillé.
 *
 * À utiliser quand l'app affiche des pages vides en prod à cause d'un
 * cache navigator obsolète.
 */
'use client';

import { useEffect, useState } from 'react';

export default function DebugCleanPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const log = (msg: string) => setLogs(prev => [...prev, msg]);

    (async () => {
      log('🧹 Démarrage du nettoyage...');

      // 1. Désinscrire tous les service workers
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          log(`🔧 ${regs.length} service worker(s) trouvé(s)`);
          for (const r of regs) {
            await r.unregister();
            log(`   ✓ Désinscrit : ${r.scope}`);
          }
        } catch (e: any) {
          log(`   ⚠ Erreur SW : ${e?.message || e}`);
        }
      } else {
        log('🔧 Service Worker non supporté (OK)');
      }

      // 2. Vider toutes les Cache API
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          log(`📦 ${keys.length} cache(s) trouvé(s)`);
          for (const k of keys) {
            await caches.delete(k);
            log(`   ✓ Supprimé : ${k}`);
          }
        } catch (e: any) {
          log(`   ⚠ Erreur caches : ${e?.message || e}`);
        }
      }

      // 3. Vider localStorage et sessionStorage
      try {
        const lsKeys = Object.keys(localStorage);
        const ssKeys = Object.keys(sessionStorage);
        localStorage.clear();
        sessionStorage.clear();
        log(`💾 localStorage vidé (${lsKeys.length} clés)`);
        log(`💾 sessionStorage vidé (${ssKeys.length} clés)`);
      } catch (e: any) {
        log(`   ⚠ Erreur storage : ${e?.message || e}`);
      }

      log('');
      log('✅ Nettoyage terminé !');
      log('');
      log('👉 Ferme tous les onglets izisolo.fr et rouvre.');
      setDone(true);
    })();
  }, []);

  return (
    <div style={{
      maxWidth: 600, margin: '40px auto', padding: 24,
      fontFamily: 'ui-monospace, monospace', fontSize: 13, lineHeight: 1.6,
      background: '#fafafa', border: '1px solid #ddd', borderRadius: 12,
      whiteSpace: 'pre-wrap',
    }}>
      <h1 style={{ fontFamily: 'system-ui', fontSize: 24, marginBottom: 16 }}>
        IziSolo · Debug Clean
      </h1>

      {logs.map((l, i) => <div key={i}>{l}</div>)}

      {done && (
        <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => window.location.href = '/login'}
            style={{
              padding: '10px 20px', borderRadius: 99, border: 'none',
              background: '#d4a0a0', color: 'white', cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Aller à /login
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', borderRadius: 99,
              border: '1px solid #ddd', background: 'white', cursor: 'pointer',
            }}
          >
            Recharger cette page
          </button>
        </div>
      )}
    </div>
  );
}
