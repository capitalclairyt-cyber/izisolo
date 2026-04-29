/**
 * IziSolo · Storybook minimal — Page de validation visuelle
 * src/app/components/page.tsx
 *
 * Affiche tous les composants du DS pour validation visuelle.
 * À supprimer en prod.
 */

'use client';

import * as React from 'react';
import { Button, Card, Pill, Badge, Avatar, Icon } from '@/components/ui-ds';
import {
  Phone, MobileScreen, ScreenHeader, HeaderIconButton,
  BottomDock, NewSheet, SessionCard, ListRow, ProfileGroup,
  RevenueHero, SectionHeader, Identity, type DockTab,
} from '@/components/mobile';

export default function ComponentsPage() {
  const [tab, setTab] = React.useState<DockTab>('home');
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-bg-warm py-12 px-8">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="font-display font-medium text-5xl mb-12 tracking-tight"
            style={{ fontVariationSettings: '"opsz" 144' }}>
          IziSolo · Components
        </h1>

        {/* PRIMITIVES */}
        <section className="mb-16">
          <h2 className="serif text-2xl mb-6">Buttons</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <Button variant="primary">Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="dark">Dark</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button iconLeft={<Icon name="plus" size={16} />}>Avec icône</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="serif text-2xl mb-6">Pills & Badges</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <Pill>Accent</Pill>
            <Pill variant="tone-rose">Tone Rose</Pill>
            <Pill variant="tone-sage">Tone Sage</Pill>
            <Pill variant="tone-sand">Tone Sand</Pill>
            <Pill variant="tone-lavender">Tone Lavender</Pill>
            <Pill variant="success" dot>En ligne</Pill>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">+18%</Badge>
            <Badge variant="warn">3 EN ATTENTE</Badge>
            <Badge variant="error">RETARD</Badge>
            <Badge variant="info">BETA</Badge>
            <Badge variant="accent">PRO</Badge>
            <Badge variant="mute">5</Badge>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="serif text-2xl mb-6">Avatars</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar initials="CM" size="sm" tone="rose" />
            <Avatar initials="LB" size="md" tone="sage" />
            <Avatar initials="SR" size="lg" tone="sand" />
            <Avatar initials="JT" size="xl" tone="lavender" />
            <Avatar initials="AC" size="xl" tone="accent" />
          </div>
        </section>

        <section className="mb-16">
          <h2 className="serif text-2xl mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><h3 className="serif text-xl mb-2">Default</h3><p>Surface blanche, border-line.</p></Card>
            <Card variant="warm"><h3 className="serif text-xl mb-2">Warm</h3><p>Fond sable.</p></Card>
            <Card variant="tone-rose"><h3 className="serif text-xl mb-2">Rose</h3><p>Tone rose.</p></Card>
            <Card variant="tone-sage"><h3 className="serif text-xl mb-2">Sage</h3><p>Tone sauge.</p></Card>
          </div>
        </section>

        {/* MOBILE PREVIEW */}
        <section className="mb-16">
          <h2 className="serif text-2xl mb-6">Mobile screen — Dashboard</h2>
          <p className="text-ink-soft mb-6">
            Composition typique : status bar, header, RevenueHero, SectionHeader,
            SessionCards, BottomDock, NewSheet déclenchée par le +.
          </p>
          <Phone size="full">
            <MobileScreen
              header={
                <ScreenHeader
                  title="Bonjour Camille"
                  date="MER · 29 AVR"
                  actions={
                    <>
                      <HeaderIconButton aria-label="Recherche">
                        <Icon name="search" size={16} />
                      </HeaderIconButton>
                      <HeaderIconButton aria-label="Notifications">
                        <Icon name="bell" size={16} />
                      </HeaderIconButton>
                    </>
                  }
                />
              }
              dock={
                <BottomDock
                  active={tab}
                  onChange={setTab}
                  onPlus={() => setSheetOpen(true)}
                />
              }
            >
              <RevenueHero
                eyebrow="CETTE SEMAINE"
                value="2 480 €"
                sub="+18% vs sem. dernière"
                stats={[
                  { label: 'Cours',    value: '14' },
                  { label: 'Présence', value: '92%' },
                  { label: 'Élèves',   value: '38' },
                ]}
              />

              <SectionHeader title="Aujourd'hui" action={{ label: 'Tout voir' }} />
              <SessionCard
                time="9:00"
                title="Hatha doux"
                location="rue Mercière · 6/8"
                tone="rose"
                badge={{ label: 'PROCHAIN', variant: 'accent' }}
              />
              <SessionCard
                time="11:30"
                title="Vinyasa flow"
                location="Studio Confluence · 8/10"
                tone="sage"
              />
              <SessionCard
                time="18:00"
                title="Méditation guidée"
                location="En ligne · 12 inscrits"
                tone="lavender"
              />
            </MobileScreen>

            <NewSheet
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              onPick={(k) => console.log('picked:', k)}
            />
          </Phone>
        </section>

        {/* PROFIL HUB */}
        <section className="mb-16">
          <h2 className="serif text-2xl mb-6">Mobile screen — Profil hub</h2>
          <p className="text-ink-soft mb-6">
            Pattern liste pour les 11+ sections : Identity + ProfileGroup avec
            ListRow tonées.
          </p>
          <Phone size="full">
            <MobileScreen
              header={<ScreenHeader title="Profil" />}
              dock={<BottomDock active="me" onChange={setTab} onPlus={() => setSheetOpen(true)} />}
            >
              <Identity
                initials="CM"
                name="Camille Mercier"
                meta="Plan Pro · Lyon 3"
                onEdit={() => {}}
              />

              <ProfileGroup label="ACTIVITÉ">
                <ListRow icon="cal"   iconTone="rose" title="Mes cours"        meta="14 cette semaine" />
                <ListRow icon="users" iconTone="sage" title="Mes élèves"       meta="38 actifs" badge="3" badgeVariant="warn" />
                <ListRow icon="chart" iconTone="sand" title="Statistiques"     meta="Présence, revenus" />
              </ProfileGroup>

              <ProfileGroup label="GESTION">
                <ListRow icon="euro"   iconTone="rose"     title="Paiements"  meta="2 480 € ce mois" />
                <ListRow icon="file"   iconTone="lavender" title="Factures"   meta="Génération auto" />
                <ListRow icon="tag"    iconTone="sage"     title="Tarifs"     meta="3 formules" />
              </ProfileGroup>

              <ProfileGroup label="COMPTE">
                <ListRow icon="settings" iconTone="mute" title="Paramètres" />
                <ListRow icon="help"     iconTone="mute" title="Aide & support" />
                <ListRow icon="out"      iconTone="mute" title="Se déconnecter" muted hideChevron />
              </ProfileGroup>
            </MobileScreen>
          </Phone>
        </section>

      </div>
    </div>
  );
}
