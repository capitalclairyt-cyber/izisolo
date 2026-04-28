'use client';

import { useState } from 'react';
import { Play, Plus, Trash2, Edit3, X, Save, Eye, EyeOff, Loader2, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';

const ACCES_LABELS = {
  gratuit: 'Gratuit (tout le monde)',
  inclus_abo: 'Inclus dans les abonnements',
  paye: 'Payant à l\'unité (bientôt)',
};

export default function VideosClient({ videosInit }) {
  const { toast } = useToast();
  const [videos, setVideos] = useState(videosInit);
  const [editing, setEditing] = useState(null); // 'new' | id | null
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  function emptyForm() {
    return {
      titre: '',
      description: '',
      url_video: '',
      vignette_url: '',
      duree_minutes: '',
      type_cours: '',
      acces: 'inclus_abo',
      publie: true,
    };
  }

  const startNew = () => {
    setForm(emptyForm());
    setEditing('new');
  };
  const startEdit = (v) => {
    setForm({
      titre: v.titre || '',
      description: v.description || '',
      url_video: v.url_video || '',
      vignette_url: v.vignette_url || '',
      duree_minutes: v.duree_minutes || '',
      type_cours: v.type_cours || '',
      acces: v.acces || 'inclus_abo',
      publie: v.publie !== false,
    });
    setEditing(v.id);
  };
  const cancel = () => { setEditing(null); setForm(emptyForm()); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.url_video.trim()) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        profile_id: user.id,
        titre: form.titre.trim(),
        description: form.description.trim() || null,
        url_video: form.url_video.trim(),
        vignette_url: form.vignette_url.trim() || null,
        duree_minutes: form.duree_minutes ? parseInt(form.duree_minutes) : null,
        type_cours: form.type_cours.trim() || null,
        acces: form.acces,
        publie: form.publie,
      };
      if (editing === 'new') {
        const { data, error } = await supabase.from('videos_cours').insert(payload).select().single();
        if (error) throw error;
        setVideos(prev => [data, ...prev]);
        toast.success('Vidéo ajoutée !');
      } else {
        const { data, error } = await supabase.from('videos_cours').update(payload).eq('id', editing).select().single();
        if (error) throw error;
        setVideos(prev => prev.map(v => v.id === editing ? data : v));
        toast.success('Vidéo mise à jour !');
      }
      cancel();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (v) => {
    if (!confirm(`Supprimer "${v.titre}" ?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('videos_cours').delete().eq('id', v.id);
      if (error) throw error;
      setVideos(prev => prev.filter(x => x.id !== v.id));
      toast.success('Vidéo supprimée.');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const togglePublie = async (v) => {
    try {
      const supabase = createClient();
      await supabase.from('videos_cours').update({ publie: !v.publie }).eq('id', v.id);
      setVideos(prev => prev.map(x => x.id === v.id ? { ...x, publie: !v.publie } : x));
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Vidéos de cours</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Réplays, cours en ligne, on-demand. Vu par tes élèves sur leur espace ou sur ton portail.
          </p>
        </div>
        {!editing && (
          <button onClick={startNew} className="izi-btn izi-btn-primary">
            <Plus size={16} /> Ajouter une vidéo
          </button>
        )}
      </div>

      {/* Form */}
      {editing && (
        <form onSubmit={handleSubmit} className="izi-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
              {editing === 'new' ? 'Nouvelle vidéo' : 'Modifier la vidéo'}
            </h2>
            <button type="button" onClick={cancel} className="izi-btn izi-btn-ghost" style={{ padding: 6 }}><X size={16} /></button>
          </div>

          <div>
            <label className="izi-label">Titre *</label>
            <input className="izi-input" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Ex : Salutation au soleil — guide débutant" required />
          </div>

          <div>
            <label className="izi-label">URL de la vidéo *</label>
            <input
              className="izi-input"
              type="url"
              value={form.url_video}
              onChange={e => setForm({ ...form, url_video: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=… · https://vimeo.com/… · https://drive.google.com/…"
              required
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
              YouTube, Vimeo ou Google Drive (lien partage public). Upload direct arrive bientôt.
            </p>
          </div>

          <div>
            <label className="izi-label">Description (optionnel)</label>
            <textarea className="izi-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Quelques mots sur le cours, le niveau, le matériel…" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div>
              <label className="izi-label">Durée (min)</label>
              <input className="izi-input" type="number" min="1" value={form.duree_minutes} onChange={e => setForm({ ...form, duree_minutes: e.target.value })} placeholder="60" />
            </div>
            <div>
              <label className="izi-label">Type de cours</label>
              <input className="izi-input" value={form.type_cours} onChange={e => setForm({ ...form, type_cours: e.target.value })} placeholder="Ex : Hatha" />
            </div>
            <div>
              <label className="izi-label">URL vignette (optionnel)</label>
              <input className="izi-input" type="url" value={form.vignette_url} onChange={e => setForm({ ...form, vignette_url: e.target.value })} placeholder="https://…/image.jpg" />
            </div>
          </div>

          <div>
            <label className="izi-label">Accès</label>
            <select className="izi-input" value={form.acces} onChange={e => setForm({ ...form, acces: e.target.value })}>
              {Object.entries(ACCES_LABELS).map(([v, l]) => (
                <option key={v} value={v} disabled={v === 'paye'}>{l}</option>
              ))}
            </select>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.publie} onChange={e => setForm({ ...form, publie: e.target.checked })} />
            <span>Visible sur ma vidéothèque publique</span>
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={cancel} className="izi-btn izi-btn-ghost">Annuler</button>
            <button type="submit" disabled={submitting || !form.titre.trim() || !form.url_video.trim()} className="izi-btn izi-btn-primary">
              {submitting ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              {editing === 'new' ? 'Ajouter' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {videos.length === 0 && !editing ? (
        <div className="izi-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <Video size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Aucune vidéo pour l'instant</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Ajoute une vidéo (YouTube, Vimeo, Drive) pour permettre à tes élèves de pratiquer chez eux.
          </p>
          <button onClick={startNew} className="izi-btn izi-btn-primary"><Plus size={16} /> Ma première vidéo</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {videos.map(v => (
            <div key={v.id} className="izi-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
              <div style={{
                width: 70, height: 50, borderRadius: 8,
                background: v.vignette_url ? `url(${v.vignette_url}) center/cover` : 'var(--brand-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: 'var(--brand)',
              }}>
                {!v.vignette_url && <Play size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{v.titre}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {v.duree_minutes && <>{v.duree_minutes} min · </>}
                  {ACCES_LABELS[v.acces]}
                  {v.type_cours && <> · {v.type_cours}</>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => togglePublie(v)} className="izi-btn izi-btn-ghost" style={{ padding: 6 }} title={v.publie ? 'Visible publiquement' : 'Caché'}>
                  {v.publie ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <a href={v.url_video} target="_blank" rel="noopener noreferrer" className="izi-btn izi-btn-ghost" style={{ padding: 6 }} title="Voir la vidéo"><Play size={14} /></a>
                <button onClick={() => startEdit(v)} className="izi-btn izi-btn-ghost" style={{ padding: 6 }} title="Modifier"><Edit3 size={14} /></button>
                <button onClick={() => handleDelete(v)} className="izi-btn izi-btn-ghost" style={{ padding: 6, color: '#dc2626' }} title="Supprimer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
