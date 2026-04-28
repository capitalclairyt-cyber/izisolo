'use client';

import { YogaTreeIllu } from './Brand';

/* ================================================================
   IziSolo · App Mockup (faux dashboard pour la landing)
   ================================================================ */

export default function AppMockup({ tab = 'accueil', floating = true }) {
  return (
    <div className={`app-mockup ${floating ? 'floating' : ''}`}>
      <div className="app-chrome">
        <div className="dots"><span /><span /><span /></div>
        <div className="url-bar">
          <span className="lock">⏷</span>
          izisolo.fr/{tab === 'accueil' ? 'dashboard' : tab}
        </div>
        <div className="chrome-actions"><span /><span /></div>
      </div>

      <div className="app-body">
        <aside className="app-sidebar">
          <div className="brand-mini">
            <div className="brand-mark" />
            <div>
              <div className="brand-name">IziSolo</div>
              <div className="brand-sub">Mon Studio</div>
            </div>
          </div>

          <nav className="nav-list">
            <NavItem icon="home" label="Accueil" active={tab === 'accueil'} />
            <NavItem icon="calendar" label="Agenda" active={tab === 'agenda'} />
            <NavItem icon="layers" label="Cours & Événements" />
            <NavItem icon="users" label="Élèves" />
            <div className="nav-section">Gestion</div>
            <NavItem icon="tag" label="Offres" />
            <NavItem icon="chart" label="Revenus" active={tab === 'revenus'} />
            <NavItem icon="book" label="Abonnements" />
            <NavItem icon="mail" label="Communication" />
          </nav>

          <div className="sidebar-foot">
            <YogaTreeIllu size={70} stroke={1} />
          </div>
        </aside>

        <main className="app-main">
          {tab === 'accueil' && <AccueilView />}
          {tab === 'agenda' && <AgendaView />}
          {tab === 'revenus' && <RevenusView />}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`}>
      <NavIcon name={icon} />
      <span>{label}</span>
      {active && <span className="nav-caret">›</span>}
    </div>
  );
}

function NavIcon({ name }) {
  const paths = {
    home: <path d="M3 9 L9 3 L15 9 V15 H3 Z" />,
    calendar: (<><rect x="3" y="4" width="12" height="11" rx="1" /><path d="M3 7 H15 M6 2 V5 M12 2 V5" /></>),
    layers: <path d="M9 2 L15 5 L9 8 L3 5 Z M3 9 L9 12 L15 9 M3 12 L9 15 L15 12" />,
    users: (<><circle cx="6" cy="6" r="2" /><circle cx="12" cy="7" r="1.5" /><path d="M2 14 C3 11, 9 11, 10 14 M10 14 C10.5 12, 15 12, 16 14" /></>),
    tag: (<><path d="M3 3 H8 L15 10 L10 15 L3 8 Z" /><circle cx="6" cy="6" r="0.8" /></>),
    chart: <path d="M3 13 L7 9 L10 11 L15 5 M3 15 H15" />,
    book: <path d="M3 3 H8 C8 3, 9 4, 9 5 V15 C9 14, 8 13, 7 13 H3 Z M9 5 C9 4, 10 3, 11 3 H15 V13 H11 C10 13, 9 14, 9 15" />,
    mail: (<><rect x="2" y="4" width="14" height="10" rx="1" /><path d="M2 5 L9 10 L16 5" /></>),
  };
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function AccueilView() {
  return (
    <>
      <div className="main-head">
        <div className="avatar">C</div>
        <div>
          <div className="hello">Bonjour Colin <span className="hand">✿</span></div>
          <div className="hello-sub">Mardi 28 Avril</div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon="calendar" value="4" label="séances" />
        <StatCard icon="users" value="38" label="élèves" />
        <StatCard icon="chart" value="2 480 €" label="ce mois" highlight />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Tes séances aujourd'hui</span>
          <span className="link-mini">Tout voir ›</span>
        </div>
        <div className="session-list">
          <SessionRow time="09:00" title="Hatha doux" attendees="6/8" tone="rose" />
          <SessionRow time="12:30" title="Yoga sur chaise — entreprise" attendees="12/12" tone="sage" />
          <SessionRow time="18:00" title="Vinyasa flow" attendees="9/15" tone="sand" />
          <SessionRow time="20:00" title="Yin & méditation" attendees="5/10" tone="lavender" />
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, value, label, highlight }) {
  return (
    <div className={`stat-card ${highlight ? 'stat-highlight' : ''}`}>
      <div className="stat-icon"><NavIcon name={icon} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function SessionRow({ time, title, attendees, tone }) {
  return (
    <div className="session-row">
      <div className={`tone-bar tone-${tone}`} />
      <div className="session-time">{time}</div>
      <div className="session-title">{title}</div>
      <div className="session-attendees">{attendees}</div>
    </div>
  );
}

function AgendaView() {
  const days = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
  const dates = [27, 28, 29, 30, 1, 2, 3];
  const events = [
    { day: 1, top: 20, h: 30, title: 'Hatha', tone: 'rose' },
    { day: 1, top: 60, h: 25, title: 'Vinyasa', tone: 'sage' },
    { day: 3, top: 15, h: 35, title: 'Pilates', tone: 'sand' },
    { day: 4, top: 50, h: 30, title: 'Yin', tone: 'lavender' },
    { day: 4, top: 5, h: 30, title: 'Méditation', tone: 'rose' },
    { day: 5, top: 35, h: 40, title: 'Atelier', tone: 'sage' },
    { day: 6, top: 25, h: 30, title: 'Yoga doux', tone: 'sand' },
  ];
  return (
    <>
      <div className="main-head agenda-head">
        <div className="agenda-tabs">
          <span>Jour</span>
          <span className="active">Semaine</span>
          <span>Mois</span>
        </div>
      </div>
      <div className="agenda-range">‹ &nbsp; 27 Avr. – 3 Mai 2026 &nbsp; ›</div>
      <div className="agenda-grid">
        {days.map((d, i) => (
          <div key={i} className="agenda-col">
            <div className="agenda-day-head">
              <span className="day-name">{d}</span>
              <span className="day-num">{dates[i]}</span>
            </div>
            <div className="agenda-cell">
              {events.filter(e => e.day === i).map((e, k) => (
                <div key={k} className={`event tone-${e.tone}`} style={{ top: `${e.top}%`, height: `${e.h}%` }}>
                  {e.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RevenusView() {
  return (
    <>
      <div className="main-head">
        <div>
          <div className="hello">Revenus</div>
          <div className="hello-sub">30 derniers jours · +18% vs mois précédent</div>
        </div>
      </div>
      <div className="revenue-card">
        <div className="revenue-num">2 480 €</div>
        <div className="revenue-sub">Encaissé ce mois</div>
        <RevenueChart />
      </div>
      <div className="stat-grid">
        <StatCard icon="users" value="38" label="abonnés actifs" />
        <StatCard icon="tag" value="12" label="cartes vendues" />
        <StatCard icon="calendar" value="64" label="séances" />
      </div>
    </>
  );
}

function RevenueChart() {
  const points = [20, 28, 22, 35, 30, 42, 38, 50, 46, 58, 54, 68, 62, 72];
  const max = Math.max(...points);
  const w = 100, h = 100;
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - (p / max) * h;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="sparkline">
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--c-accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--c-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#grad)" />
      <path d={path} stroke="var(--c-accent)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
