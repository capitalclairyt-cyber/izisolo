'use client';

import { useState } from 'react';
import {
  Screen, ScreenHeader, ScreenBody, HeaderIconBtn,
  Section, Hero, SessionCard, BottomDock, NewSheet,
  Identity, ProfileGroup, ListRow, type DockTab,
} from '@/components/np';

/**
 * /np-preview — page de QA visuel pour valider le rendu pixel-perfect
 * du Nav System designer (Dashboard + Profil + Sheet "Nouveau").
 * Page publique, mobile-first.
 */
export default function NpPreviewPage() {
  const [tab, setTab] = useState<DockTab>('home');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState<'dash' | 'profil'>('dash');

  return (
    <div className="np-preview-wrap">
      <div className="np-preview-toggle">
        <button
          className={view === 'dash' ? 'active' : ''}
          onClick={() => { setView('dash'); setTab('home'); }}
        >Dashboard</button>
        <button
          className={view === 'profil' ? 'active' : ''}
          onClick={() => { setView('profil'); setTab('me'); }}
        >Profil</button>
      </div>

      <div className="np-preview-screen">
        {view === 'dash' ? (
          <Screen>
            <ScreenHeader
              date="MER · 29 AVR"
              title="Bonjour Camille"
              actions={
                <>
                  <HeaderIconBtn icon="search" ariaLabel="Recherche" />
                  <HeaderIconBtn icon="bell"   ariaLabel="Notifs" />
                </>
              }
            />
            <ScreenBody>
              <Hero
                tag="CETTE SEMAINE"
                value="2 480 €"
                sub="+18% vs sem. dernière"
                stats={[
                  { label: 'COURS',    value: 12 },
                  { label: 'ÉLÈVES',   value: 48 },
                  { label: 'TAUX',     value: '87%' },
                ]}
              />
              <Section title="Aujourd'hui" link={{ href: '#' }}>
                <SessionCard time="9:00"  title="Hatha doux"     location="rue Mercière · 6/8"        tone="rose"     badge="prochain" />
                <SessionCard time="12:30" title="Yoga chaise"    location="Lumen · complet"           tone="sage" />
                <SessionCard time="18:00" title="Méditation"     location="En ligne · 12 inscrits"    tone="lavender" />
              </Section>
            </ScreenBody>
          </Screen>
        ) : (
          <Screen>
            <ScreenHeader
              date="PROFIL"
              title=""
              actions={<HeaderIconBtn icon="settings" ariaLabel="Paramètres" />}
            />
            <ScreenBody>
              <Identity
                initials="CD"
                name="Camille Dupuis"
                meta="Plan Pro · Lyon 3"
                onEdit={() => {}}
              />
              <ProfileGroup label="ACTIVITÉ">
                <ListRow icon="chart"    tone="rose"     title="Statistiques"      meta="Rétention, présence" />
                <ListRow icon="euro"     tone="sage"     title="Revenus"           meta="2 480 € ce mois" badge="+18%" />
                <ListRow icon="bookmark" tone="sand"     title="Ateliers"          meta="2 à venir" />
              </ProfileGroup>
              <ProfileGroup label="BUSINESS">
                <ListRow icon="file"     tone="lavender" title="Factures"          meta="3 en attente" />
                <ListRow icon="tag"      tone="ink"      title="Tarifs & cartes"   meta="6 formules actives" />
                <ListRow icon="music"    tone="rose"     title="Disciplines"       meta="Hatha, Vinyasa, Yin" />
                <ListRow icon="bell"     tone="sage"     title="Notifications"     meta="Rappels élèves" />
              </ProfileGroup>
              <ProfileGroup label="COMPTE">
                <ListRow icon="settings" tone="sand"     title="Paramètres"        meta="Profil, lieux" />
                <ListRow icon="help"     tone="lavender" title="Aide & contact" />
                <ListRow icon="out"                      title="Se déconnecter" muted />
              </ProfileGroup>
              <div className="np-foot">IziSolo · v0.1 — fait à Lyon</div>
            </ScreenBody>
          </Screen>
        )}

        <BottomDock
          active={tab}
          onChange={setTab}
          onPlus={() => setSheetOpen(true)}
        />

        <NewSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onPick={(kind) => alert('Picked: ' + kind)}
        />
      </div>

      <style jsx>{`
        .np-preview-wrap {
          padding: 16px;
          background: oklch(0.96 0.008 60);
          min-height: 100vh;
        }
        .np-preview-toggle {
          display: flex; gap: 6px; justify-content: center;
          padding-bottom: 12px;
        }
        .np-preview-toggle button {
          padding: 6px 14px;
          border: 1px solid var(--m-line);
          background: var(--m-surface);
          border-radius: 999px;
          font-family: var(--font-display);
          font-size: 12px; font-weight: 500;
          cursor: pointer;
        }
        .np-preview-toggle button.active {
          background: var(--m-ink); color: var(--m-bg);
          border-color: var(--m-ink);
        }
        .np-preview-screen {
          position: relative;
          width: 390px; max-width: 100%;
          height: 800px;
          margin: 0 auto;
          background: var(--m-bg);
          border-radius: 36px;
          overflow: hidden;
          box-shadow: 0 30px 60px oklch(0.2 0.02 30 / 0.20);
          border: 4px solid oklch(0.18 0.022 30);
        }
      `}</style>
    </div>
  );
}
