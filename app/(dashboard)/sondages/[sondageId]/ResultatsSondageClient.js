'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Copy, ExternalLink, Trash2, Power, MessageSquare,
  TrendingUp, Plus, Award
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';

const JOURS_LABEL = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const JOURS_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function CounterChip({ value, label, color }) {
  return (
    <div className="rs-counter" style={{ background: color.bg, color: color.fg }}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function ResultatsSondageClient({ sondage: initialSondage, creneaux, studioSlug }) {
  const router = useRouter();
  const { toast } = useToast();
  const [sondage, setSondage] = useState(initialSondage);
  const [showCommentaires, setShowCommentaires] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://izisolo.fr';
  const publicUrl = `${baseUrl}/p/${studioSlug}/sondage/${sondage.slug}`;

  // Pour chaque créneau, agréger oui/peut_etre/non + score = oui*2 + peut_etre*1
  const creneauxAvecStats = useMemo(() => {
    return creneaux.map(c => {
      const reps = c.sondages_reponses || [];
      const oui = reps.filter(r => r.valeur === 'oui').length;
      const peutEtre = reps.filter(r => r.valeur === 'peut_etre').length;
      const non = reps.filter(r => r.valeur === 'non').length;
      const score = oui * 2 + peutEtre;
      const total = oui + peutEtre + non;
      return { ...c, oui, peutEtre, non, score, total };
    });
  }, [creneaux]);

  const sortedByScore = useMemo(
    () => [...creneauxAvecStats].sort((a, b) => b.score - a.score),
    [creneauxAvecStats]
  );
  const meilleurScore = sortedByScore[0]?.score || 0;
  const totalRepondants = useMemo(() => {
    // Approx : nb max de réponses sur un créneau
    return Math.max(0, ...creneauxAvecStats.map(c => c.total));
  }, [creneauxAvecStats]);

  // Tous les commentaires (uniques par répondant)
  const commentaires = useMemo(() => {
    const out = [];
    const seen = new Set();
    creneaux.forEach(c => {
      (c.sondages_reponses || []).forEach(r => {
        if (r.commentaire && r.commentaire.trim()) {
          const key = `${r.prenom || ''}-${r.commentaire.slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push({ ...r, creneauLabel: `${JOURS_LABEL[c.jour_semaine - 1]} ${c.heure?.slice(0,5)} ${c.type_cours}` });
          }
        }
      });
    });
    return out;
  }, [creneaux]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Lien copié — partage-le à tes élèves !');
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const toggleActif = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from('sondages_planning')
      .update({
        actif: !sondage.actif,
        closed_at: sondage.actif ? new Date().toISOString() : null,
      })
      .eq('id', sondage.id);
    if (!error) {
      setSondage(prev => ({ ...prev, actif: !prev.actif }));
      toast.success(sondage.actif ? 'Sondage clos' : 'Sondage rouvert');
    }
  };

  const supprimerSondage = async () => {
    if (!confirm('Supprimer ce sondage et toutes ses réponses ? (irréversible)')) return;
    const supabase = createClient();
    const { error } = await supabase.from('sondages_planning').delete().eq('id', sondage.id);
    if (!error) {
      toast.success('Sondage supprimé');
      router.push('/sondages');
    }
  };

  // Conversion 1-clic : ouvrir /cours/nouveau pré-rempli avec le créneau
  const convertirEnSerie = (c) => {
    // On calcule la prochaine occurrence du jour de la semaine choisi
    const today = new Date();
    const todayDay = today.getDay() === 0 ? 7 : today.getDay();
    let delta = c.jour_semaine - todayDay;
    if (delta <= 0) delta += 7;
    const nextDate = new Date(today.getTime() + delta * 86400000);
    const dateStr = nextDate.toISOString().slice(0, 10);

    const params = new URLSearchParams({
      date: dateStr,
      heure: c.heure?.slice(0, 5) || '18:00',
      duree: String(c.duree_minutes || 60),
      type: c.type_cours,
      nom: c.type_cours,
      frequence: 'hebdomadaire',
      from_sondage: sondage.id,
    });
    router.push(`/cours/nouveau?${params.toString()}`);
  };

  return (
    <div className="rs-page">
      <header className="rs-header">
        <Link href="/sondages" className="back-btn"><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>{sondage.titre}</h1>
          <p className="rs-subtitle">
            {totalRepondants} répondant{totalRepondants > 1 ? 's' : ''}
            {sondage.date_fin && ` · jusqu'au ${new Date(sondage.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
            {' · '}
            {sondage.actif ? 'actif' : 'clos'}
          </p>
        </div>
      </header>

      {/* Bandeau lien public */}
      <div className="rs-link izi-card">
        <div className="rs-link-text">
          <div className="rs-link-label">Lien à partager</div>
          <div className="rs-link-url">{publicUrl}</div>
        </div>
        <button onClick={copyLink} className="rs-icon-btn" title="Copier le lien"><Copy size={14} /></button>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="rs-icon-btn" title="Voir la page">
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Tableau des résultats */}
      {creneauxAvecStats.length === 0 ? (
        <div className="izi-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
          Aucun créneau configuré.
        </div>
      ) : (
        <div className="rs-results">
          <h2 className="rs-h2"><TrendingUp size={16} /> Résultats par créneau</h2>
          {sortedByScore.map((c, rank) => {
            const winner = c.score === meilleurScore && meilleurScore > 0;
            const max = c.total || 1;
            return (
              <div key={c.id} className={`rs-creneau izi-card ${winner ? 'winner' : ''}`}>
                <div className="rs-cr-top">
                  <div className="rs-cr-info">
                    {winner && <Award size={14} style={{ color: '#d97706' }} />}
                    <div>
                      <div className="rs-cr-titre">
                        {JOURS_LONG[c.jour_semaine - 1]} {c.heure?.slice(0, 5)}
                        <span className="rs-cr-type"> · {c.type_cours}</span>
                      </div>
                      <div className="rs-cr-meta">{c.duree_minutes} min · {c.total} vote{c.total > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="rs-cr-score">{c.score} pts</div>
                </div>

                {/* Barre de répartition oui / peut-être / non */}
                <div className="rs-bar">
                  {c.oui > 0 && <div className="rs-bar-seg seg-oui" style={{ width: `${(c.oui / max) * 100}%` }} title={`${c.oui} oui`} />}
                  {c.peutEtre > 0 && <div className="rs-bar-seg seg-peut" style={{ width: `${(c.peutEtre / max) * 100}%` }} title={`${c.peutEtre} peut-être`} />}
                  {c.non > 0 && <div className="rs-bar-seg seg-non" style={{ width: `${(c.non / max) * 100}%` }} title={`${c.non} non`} />}
                </div>

                <div className="rs-counters">
                  <CounterChip value={c.oui} label="oui" color={{ bg: '#dcfce7', fg: '#15803d' }} />
                  <CounterChip value={c.peutEtre} label="peut-être" color={{ bg: '#fef3c7', fg: '#92400e' }} />
                  <CounterChip value={c.non} label="non" color={{ bg: '#fee2e2', fg: '#991b1b' }} />
                </div>

                <button
                  type="button"
                  className="izi-btn izi-btn-primary rs-convert"
                  onClick={() => convertirEnSerie(c)}
                  disabled={c.score === 0}
                >
                  <Plus size={14} /> Créer la série hebdomadaire
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Commentaires */}
      {commentaires.length > 0 && (
        <div className="izi-card" style={{ padding: 16 }}>
          <button
            type="button"
            className="rs-comments-toggle"
            onClick={() => setShowCommentaires(s => !s)}
          >
            <MessageSquare size={14} /> {commentaires.length} commentaire{commentaires.length > 1 ? 's' : ''}
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {showCommentaires ? 'masquer' : 'voir'}
            </span>
          </button>
          {showCommentaires && (
            <div className="rs-comments-list">
              {commentaires.map((c, i) => (
                <div key={i} className="rs-comment">
                  <div className="rs-comment-author">{c.prenom || c.email || 'Anonyme'}</div>
                  <div className="rs-comment-creneau">{c.creneauLabel}</div>
                  <div className="rs-comment-text">« {c.commentaire} »</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="rs-actions">
        <button onClick={toggleActif} className="izi-btn izi-btn-secondary">
          <Power size={14} /> {sondage.actif ? 'Clore le sondage' : 'Rouvrir le sondage'}
        </button>
        <button onClick={supprimerSondage} className="izi-btn izi-btn-ghost rs-delete">
          <Trash2 size={14} /> Supprimer
        </button>
      </div>

      <style>{`
        .rs-page { display: flex; flex-direction: column; gap: 14px; padding-bottom: 60px; }
        .rs-header { display: flex; align-items: center; gap: 12px; }
        .rs-header h1 { font-size: 1.25rem; font-weight: 700; line-height: 1.2; word-break: break-word; }
        .rs-subtitle { font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px; }
        .back-btn {
          width: 40px; height: 40px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary); text-decoration: none; flex-shrink: 0;
        }

        .rs-link {
          display: flex; align-items: center; gap: 8px; padding: 12px 14px;
        }
        .rs-link-text { flex: 1; min-width: 0; }
        .rs-link-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
        .rs-link-url {
          font-size: 0.75rem; color: var(--brand);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 2px;
        }
        .rs-icon-btn {
          width: 34px; height: 34px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: white;
          color: var(--text-secondary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none; flex-shrink: 0;
        }
        .rs-icon-btn:hover { color: var(--brand); border-color: var(--brand); }

        .rs-h2 {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.9375rem; font-weight: 700;
          margin-bottom: 4px;
        }

        .rs-results { display: flex; flex-direction: column; gap: 10px; }
        .rs-creneau {
          padding: 14px; display: flex; flex-direction: column; gap: 10px;
          border-left: 3px solid transparent;
        }
        .rs-creneau.winner {
          border-left-color: #f59e0b;
          background: linear-gradient(90deg, #fffbeb, var(--bg-card) 30%);
        }
        .rs-cr-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .rs-cr-info { display: flex; align-items: center; gap: 8px; }
        .rs-cr-titre { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); }
        .rs-cr-type { font-weight: 500; color: var(--text-secondary); }
        .rs-cr-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .rs-cr-score {
          font-size: 1.0625rem; font-weight: 800; color: var(--brand);
          font-variant-numeric: tabular-nums;
        }

        .rs-bar {
          display: flex; height: 8px; border-radius: 99px; overflow: hidden;
          background: #f3f4f6;
        }
        .rs-bar-seg.seg-oui  { background: #16a34a; }
        .rs-bar-seg.seg-peut { background: #f59e0b; }
        .rs-bar-seg.seg-non  { background: #dc2626; }

        .rs-counters { display: flex; gap: 6px; flex-wrap: wrap; }
        .rs-counter {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 99px;
          font-size: 0.75rem;
        }
        .rs-counter strong { font-weight: 800; }

        .rs-convert { align-self: flex-start; }

        .rs-comments-toggle {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none; cursor: pointer;
          font-size: 0.875rem; font-weight: 600; color: var(--text-primary);
          width: 100%; text-align: left;
        }
        .rs-comments-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
        .rs-comment {
          padding: 10px 12px; border-radius: 10px;
          background: var(--bg-soft, #faf8f5);
          border-left: 3px solid var(--brand);
        }
        .rs-comment-author { font-weight: 600; font-size: 0.8125rem; color: var(--text-primary); }
        .rs-comment-creneau { font-size: 0.7rem; color: var(--brand); margin: 2px 0; }
        .rs-comment-text { font-size: 0.8125rem; color: var(--text-secondary); font-style: italic; }

        .rs-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .rs-delete { color: #dc2626; }
        .rs-delete:hover { background: #fef2f2; }
      `}</style>
    </div>
  );
}
