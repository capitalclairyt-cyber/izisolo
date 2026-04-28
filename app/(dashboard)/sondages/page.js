import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, BarChart3, Calendar, ChevronRight, ExternalLink } from 'lucide-react';

export const metadata = { title: 'Planning idéal — sondages élèves' };

export default async function SondagesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: sondages } = await supabase
    .from('sondages_planning')
    .select('id, slug, titre, message, date_fin, visibilite, actif, created_at, sondages_creneaux(id), sondages_creneaux:sondages_creneaux(id, sondages_reponses(id))')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });

  // Compteurs : nb créneaux + nb réponses uniques par sondage
  const sondagesAvecStats = (sondages || []).map(s => {
    const creneaux = s.sondages_creneaux || [];
    const totalReponses = creneaux.reduce((sum, c) => sum + (c.sondages_reponses?.length || 0), 0);
    return { ...s, nbCreneaux: creneaux.length, nbReponses: totalReponses };
  });

  return (
    <div className="sondages-page">
      <header className="sp-header">
        <div>
          <h1>Planning idéal</h1>
          <p className="sp-subtitle">Sonde tes élèves pour découvrir tes meilleurs créneaux.</p>
        </div>
        <Link href="/sondages/nouveau" className="izi-btn izi-btn-primary">
          <Plus size={16} /> Nouveau sondage
        </Link>
      </header>

      {sondagesAvecStats.length === 0 ? (
        <div className="sp-empty izi-card">
          <div className="sp-empty-icon"><BarChart3 size={28} /></div>
          <p className="sp-empty-title">Aucun sondage pour l'instant</p>
          <p className="sp-empty-desc">
            Crée un sondage avec 3-8 créneaux candidats — tes élèves cochent ceux où ils viendraient.
            Tu vois les gagnants en un coup d'œil et tu les transformes en série en un clic.
          </p>
          <Link href="/sondages/nouveau" className="izi-btn izi-btn-primary">
            <Plus size={16} /> Créer mon premier sondage
          </Link>
        </div>
      ) : (
        <div className="sp-list">
          {sondagesAvecStats.map(s => {
            const closed = !s.actif || (s.date_fin && s.date_fin < new Date().toISOString().slice(0, 10));
            return (
              <Link key={s.id} href={`/sondages/${s.id}`} className={`sp-card izi-card izi-card-interactive ${closed ? 'closed' : ''}`}>
                <div className="sp-card-main">
                  <div className="sp-card-title">{s.titre}</div>
                  <div className="sp-card-meta">
                    <Calendar size={12} />
                    {s.date_fin
                      ? `Jusqu'au ${new Date(s.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                      : 'Sans date limite'}
                    {' · '}
                    {s.nbCreneaux} créneau{s.nbCreneaux > 1 ? 'x' : ''}
                  </div>
                </div>
                <div className="sp-card-stats">
                  <div className="sp-stat">
                    <strong>{s.nbReponses}</strong>
                    <span>réponse{s.nbReponses > 1 ? 's' : ''}</span>
                  </div>
                  {closed
                    ? <span className="sp-badge closed">Clos</span>
                    : <span className="sp-badge active">Actif</span>}
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <style>{`
        .sondages-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 60px; }
        .sp-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
        .sp-header h1 { font-size: 1.25rem; font-weight: 700; }
        .sp-subtitle { font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px; }

        .sp-empty {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 40px 24px; text-align: center;
        }
        .sp-empty-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: var(--brand-light); color: var(--brand);
          display: flex; align-items: center; justify-content: center;
        }
        .sp-empty-title { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
        .sp-empty-desc { font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 12px; max-width: 420px; line-height: 1.5; }

        .sp-list { display: flex; flex-direction: column; gap: 10px; }
        .sp-card {
          display: flex; align-items: center; gap: 16px;
          padding: 14px 16px; text-decoration: none; color: inherit;
        }
        .sp-card.closed { opacity: 0.65; }
        .sp-card-main { flex: 1; min-width: 0; }
        .sp-card-title { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
        .sp-card-meta {
          display: flex; align-items: center; gap: 4px;
          font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;
        }
        .sp-card-stats { display: flex; align-items: center; gap: 14px; }
        .sp-stat { display: flex; flex-direction: column; align-items: flex-end; }
        .sp-stat strong { font-size: 1.125rem; font-weight: 800; color: var(--brand); line-height: 1; }
        .sp-stat span { font-size: 0.6875rem; color: var(--text-muted); }
        .sp-badge {
          font-size: 0.6875rem; font-weight: 700;
          padding: 3px 8px; border-radius: 99px;
        }
        .sp-badge.active { background: #dcfce7; color: #15803d; }
        .sp-badge.closed { background: #f3f4f6; color: #6b7280; }
      `}</style>
    </div>
  );
}
