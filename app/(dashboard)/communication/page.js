'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Mail, Send, Users, CheckSquare, Square, MessageSquare,
  Phone, History, Gift, Pencil, ChevronDown, ChevronUp, X, Loader2,
  Search, Check, AlertCircle, UserCheck, SlidersHorizontal,
  Paperclip, Link2, Smile,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { formatMontant } from '@/lib/utils';
import { TEMPLATES_DEFAUT } from '@/lib/templates-defaut';

/**
 * Sélecteur de templates pré-définis (email + SMS).
 * Au clic sur un template, on remplit sujet + corps via le callback onSelect.
 */
function TemplatesSelecteur({ canal, onSelect }) {
  const [open, setOpen] = useState(false);
  const templates = TEMPLATES_DEFAUT.filter(t => t.type === canal);
  if (templates.length === 0) return null;
  return (
    <div className="compose-field" style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="izi-btn izi-btn-ghost"
        style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.875rem' }}
      >
        <span>📋 Utiliser un template ({templates.length} dispo)</span>
        <span style={{ fontSize: '1.25rem', lineHeight: 1, color: 'var(--text-muted)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{
          marginTop: 8, background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
          maxHeight: 320, overflowY: 'auto',
        }}>
          {templates.map(t => (
            <button
              key={t.cle}
              type="button"
              onClick={() => { onSelect(t); setOpen(false); }}
              style={{
                textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                border: 'none', background: 'transparent', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-soft, #faf8f5)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{t.nom}</span>
              {t.sujet && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.sujet}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Canaux ─────────────────────────────────────────────────────────────────
const CANAUX = [
  { id: 'email',    label: 'E-mail',   icon: Mail,          color: '#2563eb' },
  { id: 'sms',      label: 'SMS',      icon: MessageSquare, color: '#16a34a' },
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone,         color: '#25D366' },
];
const CANAL_ICONS = { email: Mail, sms: MessageSquare, whatsapp: Phone };

// ── Composant chip destinataire ────────────────────────────────────────────
function RecipChip({ label, onRemove }) {
  return (
    <span className="recip-chip">
      <span className="chip-label">{label}</span>
      <button className="chip-remove" onClick={onRemove} type="button" title="Retirer">
        <X size={10} />
      </button>
    </span>
  );
}

function CommunicationInner() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // ── États chargement ───────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [sending, setSending]       = useState(false);

  // ── Données ────────────────────────────────────────────────────────────
  const [clients, setClients]       = useState([]);
  const [cours, setCours]           = useState([]);
  const [offres, setOffres]         = useState([]);
  const [presences, setPresences]   = useState([]); // {cours_id, client_id}
  const [aboActifs, setAboActifs]   = useState([]); // {offre_id, client_id}
  const [historique, setHistorique] = useState([]);
  const [profile, setProfile]       = useState(null);

  // ── Navigation ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState('composer');

  // ── Layout responsive (JS-based pour contourner les conflits CSS) ─────
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 860);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Mobile : panneau picker ouvert / fermé ─────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(true);

  // ── Filtres ────────────────────────────────────────────────────────────
  const [filtreMode, setFiltreMode]       = useState('tous'); // 'tous'|'cours'|'abonnement'
  const [filtreCoursNom, setFiltreCoursNom] = useState(''); // 1er niveau : nom du cours
  const [filtreCours, setFiltreCours]     = useState('');   // 2e niveau : occurrence précise (cours_id)
  const [filtreOffre, setFiltreOffre]     = useState('');
  const [searchDest, setSearchDest]       = useState('');

  // ── Sélection ──────────────────────────────────────────────────────────
  const [selected, setSelected]         = useState(new Set());

  // ── Message ────────────────────────────────────────────────────────────
  const [canal, setCanal]   = useState('email');
  const [sujet, setSujet]   = useState('');
  const [message, setMessage] = useState('');
  const [pendingHtml, setPendingHtml] = useState(null);
  const editorRef = useRef(null);
  const [colorOpen, setColorOpen] = useState(false);
  const colorTriggerRef = useRef(null);
  const colorPanelRef = useRef(null);

  // ── Emojis groupés par catégorie ─────────────────────────────────────
  const EMOJIS = {
    'Yoga & Bien-être':  ['🧘','🧘‍♀️','🧘‍♂️','🌸','🌿','💚','🌱','✨','🌙','☀️','🕊️','🙏','💫','🌺','🌻','🍃','💆','💆‍♀️','🧖','🧖‍♀️','🌈','🫶','🌊','🏔️','🌄','🌅','🌇','🌆','🍃','🌾','🌲'],
    'Danse & Sport':     ['💃','🕺','🩰','🎽','🏃','🏃‍♀️','🤸','🤸‍♀️','⚡','🔥','💪','🏋️','🏋️‍♀️','🩱','👟','🎯','🩻','🫀','🧗','🧗‍♀️','🚴','🏊','🤾','🤺','⛹️','🏇','🏌️','⛷️','🏂','🛷','🥇','🏅'],
    'Musique':           ['🎵','🎶','🎸','🎹','🥁','🎷','🎺','🎻','🎤','🎧','🎼','🎙️','🪗','🪘','🪈','🎛️','🎚️','🎚️','🔊','📻','🎺','🎸','🪕','🪖','🎺','🎷','🎻'],
    'Expressions':       ['😊','😃','🥰','😍','🤩','😎','🤗','🥳','😄','😁','👋','👏','🙌','❤️','💕','💖','⭐','🌟','🎉','🎊','😂','🤣','😆','😅','😘','😚','😙','😗','😔','😢','😭','🥺'],
    'Divers':            ['📅','📢','💌','✉️','📱','💬','🎁','🏆','📌','⏰','📍','🔔','💡','✅','📝','🔑','🗓️','📣','🏅','📊','📈','📉','💼','🎓','🏫','🏫','📚','📖','✏️','📝','🖊️','🖍️'],
  };

  // ── Couleurs pour le sélecteur ──────────────────────────────────────
  const COLORS = [
    { label: 'Noir',   value: '#1a1a1a' },
    { label: 'Rouge',  value: '#dc2626' },
    { label: 'Orange', value: '#ea580c' },
    { label: 'Ambre',  value: '#d97706' },
    { label: 'Vert',   value: '#16a34a' },
    { label: 'Bleu',   value: '#2563eb' },
    { label: 'Violet', value: '#7c3aed' },
    { label: 'Rose',   value: '#db2777' },
  ];

  // ── Insérer du texte à la position du curseur (contenteditable) ───────
  const insertAtCursor = (text) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      document.execCommand('insertText', false, text);
    }
    setMessage(el.innerHTML);
  };

  // ── Insérer un emoji ────────────────────────────────────────────────
  const insertEmoji = (emoji) => {
    insertAtCursor(emoji);
    setEmojiOpen(false);
  };

  // ── Insérer un lien ─────────────────────────────────────────────────
  const handleLinkInsert = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const display = linkText.trim() || url;
    insertAtCursor(display === url ? url : `${display} (${url})`);
    setLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  };

  // ── Pièce jointe ────────────────────────────────────────────────────
  const handleAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED_TYPES = [
      'image/jpeg','image/png','image/gif','image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const MAX_FILE_SIZE  = 5  * 1024 * 1024; // 5 Mo par fichier
    const QUOTA_PER_USER = 50 * 1024 * 1024; // 50 Mo quota total par user

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Type non autorisé. Formats acceptés : JPG, PNG, GIF, WEBP, PDF, DOC, DOCX');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Fichier trop volumineux (max 5 Mo par fichier)');
      e.target.value = '';
      return;
    }

    setAttachFile({ name: file.name, size: file.size, uploading: true, url: null, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // ── Vérification quota : total des fichiers déjà stockés pour cet user ──
      const { data: existingFiles } = await supabase.storage
        .from('messages')
        .list(`attachments/${user.id}`, { limit: 500 });
      const usedBytes = (existingFiles || []).reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
      if (usedBytes + file.size > QUOTA_PER_USER) {
        const usedMo  = (usedBytes / (1024 * 1024)).toFixed(1);
        const quotaMo = (QUOTA_PER_USER / (1024 * 1024)).toFixed(0);
        throw new Error(`Quota de stockage atteint (${usedMo} Mo / ${quotaMo} Mo). Contactez le support pour augmenter votre espace.`);
      }

      const ext  = file.name.split('.').pop().toLowerCase();
      const path = `attachments/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('messages').upload(path, file);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('messages').getPublicUrl(path);
      setAttachFile({ name: file.name, size: file.size, uploading: false, url: publicUrl, error: null });
      insertAtCursor(`\n📎 ${file.name} : ${publicUrl}`);
      toast.success('Fichier joint avec succès !');
    } catch (err) {
      setAttachFile(prev => ({ ...prev, uploading: false, error: err.message }));
      toast.error(err.message);
    }
    e.target.value = '';
  };

  // Insère {{prenom}} à la position du curseur
  const insertPrenom = () => insertAtCursor('{{prenom}}');

  // ── Chips zone : expansion au-delà de 20 ─────────────────────────────
  const [chipsExpanded, setChipsExpanded] = useState(false);

  // ── Toolbar enrichi ───────────────────────────────────────────────────
  const [emojiOpen, setEmojiOpen]     = useState(false);
  const [linkModal, setLinkModal]     = useState(false);
  const [linkUrl, setLinkUrl]         = useState('');
  const [linkText, setLinkText]       = useState('');
  const [attachFile, setAttachFile]   = useState(null); // {name,size,url,uploading,error}
  const attachInputRef                = useRef(null);
  const emojiPanelRef                 = useRef(null);
  const emojiTriggerRef               = useRef(null);

  // ── Fermer les panneaux (emoji et couleur) au clic extérieur ──────────
  useEffect(() => {
    const handler = (e) => {
      const outsideEmojiPanel   = emojiPanelRef.current  && !emojiPanelRef.current.contains(e.target);
      const outsideEmojiTrigger = emojiTriggerRef.current && !emojiTriggerRef.current.contains(e.target);
      if (outsideEmojiPanel && outsideEmojiTrigger) setEmojiOpen(false);

      const outsideColorPanel   = colorPanelRef.current  && !colorPanelRef.current.contains(e.target);
      const outsideColorTrigger = colorTriggerRef.current && !colorTriggerRef.current.contains(e.target);
      if (outsideColorPanel && outsideColorTrigger) setColorOpen(false);
    };
    if (emojiOpen || colorOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [emojiOpen, colorOpen]);

  // ── Appliquer le HTML en attente au contenteditable (anniversaire) ─────
  useEffect(() => {
    if (pendingHtml !== null && editorRef.current) {
      editorRef.current.innerHTML = pendingHtml;
      setMessage(pendingHtml);
      setPendingHtml(null);
    }
  }, [pendingHtml]);

  // ── Appliquer une couleur de texte ──────────────────────────────────────
  const applyColor = (color) => {
    editorRef.current?.focus();
    document.execCommand('foreColor', false, color);
    setMessage(editorRef.current?.innerHTML || '');
    setColorOpen(false);
  };

  // ── Cadeau anniversaire ────────────────────────────────────────────────
  const [isPresetAnniv, setIsPresetAnniv]   = useState(false);
  const [cadeauActif, setCadeauActif]       = useState(false);
  const [cadeauOffreId, setCadeauOffreId]   = useState('');
  const [cadeauType, setCadeauType]         = useState('gratuit');
  const [cadeauRemisePct, setCadeauRemisePct] = useState(20);

  // ── Chargement des données ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const [
        { data: c },
        { data: k },
        { data: o },
        { data: hist },
        { data: prof },
        { data: pres },
        { data: abos },
      ] = await Promise.all([
        supabase.from('clients')
          .select('id, prenom, nom, email, telephone, statut')
          .eq('profile_id', user.id).order('nom'),
        supabase.from('cours')
          .select('id, nom, date')
          .eq('profile_id', user.id)
          .order('date', { ascending: false }),   // pas de limit : on veut tous les cours
        supabase.from('offres')
          .select('id, nom, type, prix')
          .eq('profile_id', user.id).eq('actif', true).order('nom'),
        supabase.from('messages_envoyes')
          .select('*, clients(prenom, nom)')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        // presences : on se fie au RLS (profile_id = auth.uid()) sans re-filtrer
        supabase.from('presences')
          .select('cours_id, client_id'),
        supabase.from('abonnements')
          .select('offre_id, client_id')
          .eq('profile_id', user.id).eq('statut', 'actif'),
      ]);

      setClients(c || []);
      setCours(k || []);
      setOffres(o || []);
      setHistorique(hist || []);
      setProfile(prof);
      setPresences(pres || []);
      setAboActifs(abos || []);

      // ── URL params ──────────────────────────────────────────────────
      const clientId = searchParams.get('client_id');
      const preset   = searchParams.get('preset');

      if (clientId) {
        setSelected(new Set([clientId]));
        setPickerOpen(false); // Sur mobile, fermer le picker quand destinataire pré-sélectionné
      } else {
        // Par défaut : tous les clients avec l'info canal
        setSelected(new Set((c || []).filter(cl => cl.email).map(cl => cl.id)));
      }

      if (preset === 'anniversaire' && prof) {
        setIsPresetAnniv(true);
        const client = (c || []).find(cl => cl.id === clientId);
        const msgTemplate = prof.anniversaire_message || 'Joyeux anniversaire {{prenom}} ! 🎂';
        const finalMsg = client
          ? msgTemplate.replace(/\{\{prenom\}\}/g, client.prenom)
          : msgTemplate;
        setPendingHtml(finalMsg);
        setSujet('Joyeux anniversaire ! 🎂');
        if (prof.anniversaire_cadeau_actif) {
          setCadeauActif(true);
          setCadeauOffreId(prof.anniversaire_cadeau_offre_id || '');
          setCadeauType(prof.anniversaire_cadeau_type || 'gratuit');
          setCadeauRemisePct(prof.anniversaire_cadeau_remise_pct || 20);
        }
      }

      setLoading(false);
    };
    load();
  }, [searchParams]);

  // ── Noms de cours uniques (1er niveau du filtre) ──────────────────────
  const coursNoms = useMemo(() => {
    return [...new Set(cours.map(k => k.nom))].sort();
  }, [cours]);

  // ── Occurrences du cours sélectionné (2e niveau) ───────────────────────
  const coursOccurrences = useMemo(() => {
    if (!filtreCoursNom) return [];
    return cours
      .filter(k => k.nom === filtreCoursNom)
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // plus récent en premier
  }, [cours, filtreCoursNom]);

  // ── Filtrage de la liste de clients ────────────────────────────────────
  const clientsFiltres = useMemo(() => {
    let base = clients;

    // Filtrer par canal (email ou téléphone requis)
    if (canal === 'email')
      base = base.filter(c => c.email);
    else
      base = base.filter(c => c.telephone);

    // Filtrer par recherche texte
    if (searchDest.trim())
      base = base.filter(c =>
        `${c.prenom} ${c.nom}`.toLowerCase().includes(searchDest.toLowerCase()));

    // Filtrer par cours — 2 niveaux
    if (filtreMode === 'cours' && filtreCoursNom) {
      // Soit une occurrence précise, soit toutes les occurrences du type
      const coursIds = filtreCours
        ? new Set([filtreCours])
        : new Set(coursOccurrences.map(k => k.id));
      const ids = new Set(
        presences.filter(p => coursIds.has(p.cours_id)).map(p => p.client_id)
      );
      base = base.filter(c => ids.has(c.id));
    }

    // Filtrer par offre (abonnements actifs)
    if (filtreMode === 'abonnement' && filtreOffre) {
      const ids = new Set(
        aboActifs.filter(a => a.offre_id === filtreOffre).map(a => a.client_id)
      );
      base = base.filter(c => ids.has(c.id));
    }

    return base;
  }, [clients, canal, searchDest, filtreMode, filtreCoursNom, filtreCours, filtreOffre,
      presences, aboActifs, coursOccurrences]);

  // Resynchronise la sélection lors d'un changement de canal
  useEffect(() => {
    setSelected(prev => {
      const validIds = new Set(clientsFiltres.map(c => c.id));
      return new Set([...prev].filter(id => validIds.has(id)));
    });
  }, [canal]); // eslint-disable-line

  const toggleClient = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const allFilteredSelected = clientsFiltres.length > 0 &&
    clientsFiltres.every(c => selected.has(c.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      // Désélectionner seulement les clients filtrés, garder les autres
      setSelected(prev => {
        const s = new Set(prev);
        clientsFiltres.forEach(c => s.delete(c.id));
        return s;
      });
    } else {
      setSelected(prev => {
        const s = new Set(prev);
        clientsFiltres.forEach(c => s.add(c.id));
        return s;
      });
    }
  };

  // Destinataires = tous les clients sélectionnés (pas seulement ceux filtrés)
  const destinataires = clients.filter(c => selected.has(c.id));

  // ── Cadeau ─────────────────────────────────────────────────────────────
  const cadeauOffre = offres.find(o => o.id === cadeauOffreId);
  const cadeauTexte = cadeauActif && cadeauOffreId
    ? cadeauType === 'gratuit'
      ? `\n\n🎁 Pour fêter ça, je vous offre : ${cadeauOffre?.nom} !`
      : `\n\n🎁 Pour fêter ça, bénéficiez de ${cadeauRemisePct}% de remise sur : ${cadeauOffre?.nom}.`
    : '';

  // ── Envoi ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim() || destinataires.length === 0) return;
    setSending(true);
    const corpsTexte = (editorRef.current?.textContent || '').trim();
    const corpsComplet = corpsTexte + cadeauTexte;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      if (canal === 'email') {
        const emails = destinataires.map(d => d.email).filter(Boolean);
        const mailto = `mailto:${emails[0]}?bcc=${emails.slice(1).join(',')}&subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corpsComplet)}`;
        window.open(mailto, '_blank');

      } else if (canal === 'sms') {
        if (destinataires.length === 1) {
          const res = await fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: destinataires[0].telephone, message: corpsComplet }),
          });
          if (!res.ok) throw new Error('Erreur SMS');
        } else {
          const nums = destinataires.map(d => d.telephone).filter(Boolean).join(',');
          window.open(`sms:${nums}?body=${encodeURIComponent(corpsComplet)}`, '_blank');
        }

      } else if (canal === 'whatsapp') {
        if (destinataires.length === 1) {
          const num = destinataires[0].telephone?.replace(/\D/g, '');
          window.open(`https://wa.me/${num}?text=${encodeURIComponent(corpsComplet)}`, '_blank');
        } else {
          toast.warning('WhatsApp ne supporte pas l\'envoi groupé. Sélectionnez un seul destinataire.');
          setSending(false);
          return;
        }
      }

      // Enregistrement historique
      const rows = destinataires.map(d => ({
        profile_id:   user.id,
        client_id:    d.id,
        canal,
        destinataire: canal === 'email' ? d.email : d.telephone,
        sujet:        sujet || null,
        corps:        corpsComplet,
        statut:       'envoye',
      }));
      await supabase.from('messages_envoyes').insert(rows);

      // Cadeau : créer abonnement(s) à 0€
      if (cadeauActif && cadeauOffreId && cadeauType === 'gratuit') {
        const aboRows = destinataires.map(d => ({
          profile_id: user.id,
          client_id:  d.id,
          offre_id:   cadeauOffreId,
          montant:    0,
          statut:     'actif',
          date_debut: new Date().toISOString().split('T')[0],
          notes:      'Cadeau anniversaire',
        }));
        await supabase.from('abonnements').insert(aboRows);
      }

      toast.success(`Message envoyé à ${destinataires.length} élève${destinataires.length > 1 ? 's' : ''} !`);
      setActiveTab('historique');
      const { data: hist } = await supabase
        .from('messages_envoyes')
        .select('*, clients(prenom, nom)')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setHistorique(hist || []);

    } catch (err) {
      toast.error('Erreur lors de l\'envoi : ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const canSend = message.replace(/<[^>]+>/g, '').trim() && destinataires.length > 0 &&
    (canal !== 'email' || sujet.trim());

  const fmtDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) return (
    <div className="comm-loading">
      <Loader2 size={22} className="spin-slow" /> Chargement…
    </div>
  );

  return (
    <div className="communication">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="comm-header animate-fade-in">
        <div className="comm-header-left">
          <Mail size={22} className="comm-icon" />
          <div>
            <h1>Communication</h1>
            <p className="comm-subtitle">Envoyez un message à vos élèves</p>
          </div>
        </div>
        <div className="tabs-bar">
          <button className={`tab-btn ${activeTab === 'composer' ? 'active' : ''}`}
                  onClick={() => setActiveTab('composer')}>
            <Pencil size={14} /> Nouveau
          </button>
          <button className={`tab-btn ${activeTab === 'historique' ? 'active' : ''}`}
                  onClick={() => setActiveTab('historique')}>
            <History size={14} /> Historique
            {historique.length > 0 && <span className="comm-tab-count">{historique.length}</span>}
          </button>
        </div>
      </div>

      {/* ══════════════════ ONGLET COMPOSER ══════════════════ */}
      {activeTab === 'composer' && (
        <div
          className="comm-layout animate-slide-up"
          style={isDesktop ? {
            display: 'flex', flexDirection: 'row',
            alignItems: 'flex-start', gap: '14px', width: '100%',
          } : {}}
        >

          {/* ── COLONNE GAUCHE : sélection des élèves ─────────────────── */}
          <div
            className="comm-picker izi-card"
            style={isDesktop ? { width: '300px', flexShrink: 0 } : {}}
          >

            <div className="picker-header">
              <span className="picker-title">
                <Users size={15} /> Élèves
                <span className="picker-count-badge">{clientsFiltres.length}</span>
              </span>
              {/* Bouton toggle visible seulement sur mobile */}
              <button
                className="picker-toggle-btn"
                style={isDesktop ? { display: 'none' } : {}}
                onClick={() => setPickerOpen(v => !v)}
              >
                <SlidersHorizontal size={14} />
                <span>{pickerOpen ? 'Masquer' : 'Filtrer'}</span>
                {pickerOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            <div
              className={`picker-body ${pickerOpen || isDesktop ? 'open' : 'closed'}`}
            >
              {/* Canal */}
              <div className="canal-bar">
                {CANAUX.map(c => {
                  const Icon = c.icon;
                  return (
                    <button key={c.id}
                      className={`canal-btn ${canal === c.id ? 'active' : ''}`}
                      style={{ '--canal-color': c.color }}
                      onClick={() => setCanal(c.id)}>
                      <Icon size={13} /> {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Filtres par type */}
              <div className="recip-filters">
                <div className="filter-chips">
                  {[
                    { id: 'tous',        label: 'Tous' },
                    { id: 'cours',       label: 'Par cours' },
                    { id: 'abonnement',  label: 'Par offre' },
                  ].map(f => (
                    <button key={f.id}
                      className={`filter-chip ${filtreMode === f.id ? 'active' : ''}`}
                      onClick={() => { setFiltreMode(f.id); setFiltreCours(''); setFiltreCoursNom(''); setFiltreOffre(''); }}>
                      {f.label}
                    </button>
                  ))}
                </div>

                {filtreMode === 'cours' && (
                  <>
                    {/* Niveau 1 : type de cours */}
                    <select className="izi-input filter-select" value={filtreCoursNom}
                      onChange={e => {
                        setFiltreCoursNom(e.target.value);
                        setFiltreCours(''); // reset l'occurrence
                      }}>
                      <option value="">— Type de cours —</option>
                      {coursNoms.map(nom => (
                        <option key={nom} value={nom}>{nom}</option>
                      ))}
                    </select>
                    {/* Niveau 2 : occurrence spécifique (facultatif) */}
                    {filtreCoursNom && coursOccurrences.length > 1 && (
                      <select className="izi-input filter-select" value={filtreCours}
                        onChange={e => setFiltreCours(e.target.value)}>
                        <option value="">Toutes les dates ({coursOccurrences.length})</option>
                        {coursOccurrences.map(k => (
                          <option key={k.id} value={k.id}>
                            {k.date
                              ? new Date(k.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                              : 'Date inconnue'}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}

                {filtreMode === 'abonnement' && (
                  <select className="izi-input filter-select" value={filtreOffre}
                    onChange={e => setFiltreOffre(e.target.value)}>
                    <option value="">— Choisir une offre —</option>
                    {offres.map(o => (
                      <option key={o.id} value={o.id}>{o.nom}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Recherche */}
              <div className="recip-search-wrap">
                <Search size={13} className="recip-search-icon" />
                <input className="recip-search"
                  placeholder="Rechercher un élève…"
                  value={searchDest}
                  onChange={e => setSearchDest(e.target.value)} />
                {searchDest && (
                  <button className="recip-search-clear" onClick={() => setSearchDest('')}>
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Sélectionner / désélectionner tout */}
              <button className="toggle-all" onClick={toggleAll}>
                {allFilteredSelected
                  ? <CheckSquare size={14} />
                  : <Square size={14} />}
                <span>{allFilteredSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</span>
                {filtreMode !== 'tous' && filtreCours || filtreMode !== 'tous' && filtreOffre
                  ? <span className="toggle-all-hint">(filtre actif)</span>
                  : null}
              </button>

              {/* Liste des élèves */}
              <div className="recip-list">
                {clientsFiltres.length === 0 && (
                  <p className="recip-empty">
                    {filtreMode === 'cours' && filtreCours
                      ? 'Aucun élève enregistré pour ce cours'
                      : filtreMode === 'abonnement' && filtreOffre
                      ? 'Aucun élève avec cet abonnement actif'
                      : `Aucun élève avec ${canal === 'email' ? 'adresse e-mail' : 'numéro de téléphone'}`}
                  </p>
                )}
                {clientsFiltres.map(c => (
                  <label key={c.id} className={`recip-row ${selected.has(c.id) ? 'selected' : ''}`}>
                    <input type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleClient(c.id)} />
                    <div className="recip-info">
                      <span className="recip-nom">{c.prenom} {c.nom}</span>
                      <span className="recip-contact">
                        {canal === 'email' ? c.email : c.telephone}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── COLONNE DROITE : rédaction ─────────────────────────────── */}
          <div
            className="comm-compose izi-card"
            style={isDesktop ? { flex: 1, minWidth: 0 } : {}}
          >

            {/* Bannière anniversaire */}
            {isPresetAnniv && (
              <div className="compose-preset-banner">
                🎂 Message d'anniversaire pré-rempli depuis vos paramètres
                <button onClick={() => setIsPresetAnniv(false)}><X size={14} /></button>
              </div>
            )}

            {/* ── Zone destinataires sélectionnés (chips) ── */}
            <div className="compose-recip-zone">
              <div className="compose-recip-header">
                <div className="compose-recip-label">
                  <UserCheck size={13} />
                  <span>Destinataires</span>
                </div>
                {destinataires.length > 0 && (
                  <button className="recip-clear-all"
                    onClick={() => setSelected(new Set())}
                    title="Tout désélectionner">
                    <X size={11} /> Vider
                  </button>
                )}
              </div>

              <div className="compose-chips-area">
                {destinataires.length === 0 && (
                  <span className="chips-empty">
                    Aucun destinataire — sélectionnez des élèves dans la liste
                  </span>
                )}

                {destinataires.length > 0 && destinataires.length <= 20 && (
                  /* ≤ 20 : tous les chips individuels */
                  destinataires.map(d => (
                    <RecipChip
                      key={d.id}
                      label={`${d.prenom} ${d.nom}`}
                      onRemove={() => toggleClient(d.id)}
                    />
                  ))
                )}

                {destinataires.length > 20 && !chipsExpanded && (
                  /* > 20 et collapsed : chip résumé cliquable */
                  <button className="recip-chip recip-chip-bulk recip-chip-expandable"
                    onClick={() => setChipsExpanded(true)}>
                    <Users size={11} />
                    <span className="chip-label">
                      {destinataires.length} élèves sélectionnés
                    </span>
                    <ChevronDown size={11} style={{ flexShrink: 0 }} />
                  </button>
                )}

                {destinataires.length > 20 && chipsExpanded && (
                  /* > 20 et expanded : tous les chips + bouton réduire */
                  <>
                    {destinataires.map(d => (
                      <RecipChip
                        key={d.id}
                        label={`${d.prenom} ${d.nom}`}
                        onRemove={() => toggleClient(d.id)}
                      />
                    ))}
                    <button className="chips-collapse-btn"
                      onClick={() => setChipsExpanded(false)}>
                      <ChevronUp size={11} /> Réduire
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sélecteur de templates pré-définis */}
            <TemplatesSelecteur
              canal={canal}
              onSelect={(t) => {
                if (t.sujet) setSujet(t.sujet);
                if (t.corps && editorRef.current) {
                  editorRef.current.textContent = t.corps;
                }
              }}
            />

            {/* Sujet — email uniquement */}
            {canal === 'email' && (
              <div className="compose-field">
                <label className="compose-label">Objet *</label>
                <input className="izi-input"
                  value={sujet}
                  onChange={e => setSujet(e.target.value)}
                  placeholder="Ex : Reprise des cours en septembre" />
              </div>
            )}

            {/* Message */}
            <div className="compose-field compose-field-grow">
              <div className="compose-label-row">
                <label className="compose-label">Message *</label>
                <button type="button" className="insert-prenom-btn" onClick={insertPrenom}
                  title="Insère {{prenom}} à la position du curseur">
                  + Prénom
                </button>
              </div>

              {/* ── Barre d'outils ─────────────────────────────────── */}
              <div className="editor-toolbar">
                {/* Mise en forme */}
                <button type="button" className="tb-btn tb-bold"
                  onClick={() => { editorRef.current?.focus(); document.execCommand('bold', false, null); setMessage(editorRef.current?.innerHTML || ''); }}
                  title="Gras">B</button>
                <button type="button" className="tb-btn tb-italic"
                  onClick={() => { editorRef.current?.focus(); document.execCommand('italic', false, null); setMessage(editorRef.current?.innerHTML || ''); }}
                  title="Italique"><em>I</em></button>
                <button type="button" className="tb-btn tb-underline"
                  onClick={() => { editorRef.current?.focus(); document.execCommand('underline', false, null); setMessage(editorRef.current?.innerHTML || ''); }}
                  title="Souligné"><u>S</u></button>
                {/* Couleur */}
                <button type="button"
                  ref={colorTriggerRef}
                  className={`tb-btn ${colorOpen ? 'tb-active' : ''}`}
                  title="Couleur du texte"
                  onClick={() => setColorOpen(v => !v)}>
                  <span style={{fontSize:'0.75rem', fontWeight:800, color: '#dc2626', textDecoration: 'underline', textDecorationColor: '#dc2626'}}>A</span>
                </button>
                <div className="tb-sep" />
                {/* Lien */}
                <button type="button" className="tb-btn" title="Insérer un lien"
                  onClick={() => setLinkModal(true)}>
                  <Link2 size={13} />
                </button>
                {/* Emoji */}
                <button type="button"
                  ref={emojiTriggerRef}
                  className={`tb-btn ${emojiOpen ? 'tb-active' : ''}`}
                  title="Emojis"
                  onClick={() => setEmojiOpen(v => !v)}>
                  <Smile size={13} />
                </button>
                {/* Pièce jointe */}
                <button type="button" className="tb-btn" title="Joindre un fichier (JPG, PNG, PDF, DOCX – max 5 Mo)"
                  disabled={attachFile?.uploading}
                  onClick={() => attachInputRef.current?.click()}>
                  {attachFile?.uploading
                    ? <Loader2 size={13} className="spin" />
                    : <Paperclip size={13} />}
                </button>
                <input ref={attachInputRef} type="file" style={{ display: 'none' }}
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
                  onChange={handleAttach} />
              </div>

              {/* ── Panneau emoji ───────────────────────────────────── */}
              {emojiOpen && (
                <div className="emoji-panel" ref={emojiPanelRef}>
                  {Object.entries(EMOJIS).map(([cat, emojis]) => (
                    <div key={cat} className="emoji-section">
                      <div className="emoji-cat-label">{cat}</div>
                      <div className="emoji-grid">
                        {emojis.map((em, i) => (
                          <button key={i} type="button" className="emoji-btn"
                            onClick={() => insertEmoji(em)}>
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Panneau couleur ─────────────────────────────────── */}
              {colorOpen && (
                <div className="color-panel" ref={colorPanelRef}>
                  {COLORS.map(c => (
                    <button key={c.value} type="button"
                      className="color-swatch"
                      style={{'--swatch': c.value}}
                      title={c.label}
                      onClick={() => applyColor(c.value)}
                    />
                  ))}
                </div>
              )}

              {/* ── Contenteditable div ─────────────────────────────── */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="compose-editor"
                onInput={() => setMessage(editorRef.current?.innerHTML || '')}
                data-placeholder="Ex : Bonjour {{prenom}}, je vous écris pour vous rappeler que nos cours reprennent lundi prochain. À très bientôt !"
              />

              {/* ── Indicateur pièce jointe ─────────────────────────── */}
              {attachFile && (
                <div className={`attach-indicator ${attachFile.uploading ? 'att-uploading' : attachFile.error ? 'att-error' : 'att-done'}`}>
                  <Paperclip size={12} style={{ flexShrink: 0 }} />
                  <span className="attach-name">{attachFile.name}</span>
                  <span className="attach-size">
                    ({(attachFile.size / 1024).toFixed(0)} ko)
                  </span>
                  {attachFile.uploading && <Loader2 size={11} className="spin" style={{ marginLeft: 'auto' }} />}
                  {!attachFile.uploading && !attachFile.error && <Check size={11} style={{ marginLeft: 'auto', color: '#16a34a' }} />}
                  {attachFile.error && <span className="attach-error-msg">{attachFile.error}</span>}
                  <button type="button" className="attach-remove" onClick={() => setAttachFile(null)}
                    title="Retirer la pièce jointe"><X size={11} /></button>
                </div>
              )}

              {message.replace(/<[^>]+>/g, '').trim() && destinataires.length === 1 && (
                <div className="compose-preview">
                  <span className="compose-preview-label">Aperçu</span>
                  <div dangerouslySetInnerHTML={{__html:
                    message.replace(/\{\{prenom\}\}/g, destinataires[0].prenom)
                  }} />
                  {cadeauTexte && <div style={{marginTop:4}}>{cadeauTexte}</div>}
                </div>
              )}
            </div>

            {/* ── Modal d'insertion de lien ──────────────────────────── */}
            {linkModal && (
              <div className="link-modal-backdrop" onClick={() => setLinkModal(false)}>
                <div className="link-modal" onClick={e => e.stopPropagation()}>
                  <div className="link-modal-title">
                    <Link2 size={15} /> Insérer un lien
                  </div>
                  <input className="izi-input" autoFocus
                    placeholder="URL  (ex : https://monsite.fr)"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLinkInsert()}
                  />
                  <input className="izi-input"
                    placeholder="Texte affiché (facultatif)"
                    value={linkText}
                    onChange={e => setLinkText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLinkInsert()}
                  />
                  <div className="link-modal-actions">
                    <button className="izi-btn" onClick={() => { setLinkModal(false); setLinkUrl(''); setLinkText(''); }}>
                      Annuler
                    </button>
                    <button className="izi-btn izi-btn-primary" onClick={handleLinkInsert}
                      disabled={!linkUrl.trim()}>
                      Insérer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cadeau anniversaire */}
            {isPresetAnniv && (
              <div className="compose-cadeau-zone">
                <div className="compose-cadeau-header">
                  <div className="compose-cadeau-title"><Gift size={14} /> Offrir un cadeau</div>
                  <button className={`compose-cadeau-toggle ${cadeauActif ? 'on' : ''}`}
                    onClick={() => setCadeauActif(v => !v)}>
                    {cadeauActif ? 'Activé ✓' : 'Ajouter'}
                  </button>
                </div>
                {cadeauActif && (
                  <div className="compose-cadeau-form animate-fade-in">
                    <div className="cadeau-type-row">
                      {[
                        { id: 'gratuit', label: '🎁 Offre gratuite' },
                        { id: 'remise',  label: '% Remise' },
                      ].map(ct => (
                        <button key={ct.id}
                          className={`cadeau-type-btn ${cadeauType === ct.id ? 'active' : ''}`}
                          onClick={() => setCadeauType(ct.id)}>
                          {ct.label}
                        </button>
                      ))}
                    </div>
                    <select className="izi-input"
                      value={cadeauOffreId} onChange={e => setCadeauOffreId(e.target.value)}>
                      <option value="">— Choisir une offre —</option>
                      {offres.map(o => (
                        <option key={o.id} value={o.id}>{o.nom} ({formatMontant(o.prix)})</option>
                      ))}
                    </select>
                    {cadeauType === 'remise' && (
                      <div className="cadeau-pct-row">
                        {[10, 20, 30, 50].map(p => (
                          <button key={p}
                            className={`cadeau-pct-btn ${cadeauRemisePct === p ? 'active' : ''}`}
                            onClick={() => setCadeauRemisePct(p)}>
                            {p}%
                          </button>
                        ))}
                      </div>
                    )}
                    {cadeauOffreId && (
                      <div className="cadeau-preview">Message mis à jour :{cadeauTexte}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pied : envoi */}
            <div className="compose-footer">
              {canal === 'whatsapp' && destinataires.length > 1 && (
                <div className="compose-warn">
                  <AlertCircle size={13} /> WhatsApp : envoi possible vers 1 seul contact à la fois
                </div>
              )}
              <button className="izi-btn izi-btn-primary compose-send"
                onClick={handleSend}
                disabled={sending || !canSend}>
                {sending
                  ? <><Loader2 size={16} className="spin" /> Envoi…</>
                  : <><Send size={16} /> Envoyer à {destinataires.length} élève{destinataires.length !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ ONGLET HISTORIQUE ══════════════════ */}
      {activeTab === 'historique' && (
        <div className="hist-list animate-slide-up">
          {historique.length === 0 && (
            <div className="hist-empty">
              <History size={32} style={{ opacity: 0.15 }} />
              <span>Aucun message envoyé pour l'instant</span>
            </div>
          )}
          {historique.map(m => {
            const Icon = CANAL_ICONS[m.canal] || Mail;
            const canalCfg = CANAUX.find(c => c.id === m.canal);
            return (
              <div key={m.id} className="hist-card izi-card">
                <div className="hist-card-top">
                  <div className="hist-canal-badge" style={{ '--cc': canalCfg?.color || '#666' }}>
                    <Icon size={12} /> {canalCfg?.label || m.canal}
                  </div>
                  <span className="hist-dest">
                    {m.clients ? `${m.clients.prenom} ${m.clients.nom}` : m.destinataire}
                  </span>
                  <span className="hist-date">{fmtDate(m.created_at)}</span>
                  <span className={`hist-statut ${m.statut}`}>
                    {m.statut === 'envoye' ? <><Check size={11} /> Envoyé</> : m.statut}
                  </span>
                </div>
                {m.sujet && <div className="hist-sujet">{m.sujet}</div>}
                <div className="hist-corps">{m.corps}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════ STYLES ══════════════════ */}
      <style jsx global>{`
        .communication { display: flex; flex-direction: column; gap: 18px; padding-bottom: 40px; }

        /* ── Header ── */
        .comm-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .comm-header-left { display: flex; align-items: center; gap: 12px; }
        .comm-icon { color: var(--brand); }
        .comm-header h1 { font-size: 1.25rem; font-weight: 700; }
        .comm-subtitle { font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px; }
        .comm-loading { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 40vh; color: var(--text-muted); }

        /* ── Tabs → globals.css ── */
        .comm-tab-count { background: var(--brand); color: white; font-size: 0.6rem; padding: 1px 5px; border-radius: 8px; font-weight: 800; }

        /* ── Layout deux colonnes ── */
        .comm-layout {
          display: flex; flex-direction: column; gap: 14px; width: 100%;
        }
        @media (min-width: 860px) {
          .comm-layout { flex-direction: row !important; align-items: flex-start; }
          .comm-picker { width: 300px !important; flex-shrink: 0 !important; }
          .comm-compose { flex: 1 !important; min-width: 0; }
          /* Sur desktop : toggle caché et corps toujours affiché */
          .picker-toggle-btn { display: none !important; }
          .picker-body { display: flex !important; }
        }

        /* ── Panneau picker (gauche) ── */
        .comm-picker { display: flex; flex-direction: column; overflow: hidden; }
        .picker-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; border-bottom: 1px solid var(--border);
        }
        .picker-title {
          display: flex; align-items: center; gap: 6px;
          font-weight: 700; font-size: 0.875rem;
        }
        .picker-count-badge {
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.6875rem; font-weight: 700;
          padding: 1px 7px; border-radius: 10px; border: 1px solid var(--brand);
        }
        .picker-toggle-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 8px;
          border: 1px solid var(--border); background: var(--bg-card);
          font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .picker-toggle-btn:hover { border-color: var(--brand); color: var(--brand-700); }

        /* Corps du picker (collapsible sur mobile) */
        .picker-body { display: flex; flex-direction: column; }
        .picker-body.closed { display: none; }

        /* ── Canal ── */
        .canal-bar { display: flex; gap: 4px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
        .canal-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 5px 4px; border-radius: 7px; border: 1.5px solid var(--border); background: var(--bg-card); font-size: 0.6875rem; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .canal-btn.active { border-color: var(--canal-color); color: var(--canal-color); background: color-mix(in srgb, var(--canal-color) 8%, transparent); }

        /* ── Filtres ── */
        .recip-filters { padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
        .filter-chips { display: flex; gap: 5px; flex-wrap: wrap; }
        .filter-chip { padding: 4px 10px; border-radius: var(--radius-full); border: 1px solid var(--border); background: var(--bg-card); font-size: 0.75rem; font-weight: 500; cursor: pointer; color: var(--text-secondary); transition: all 0.15s; }
        .filter-chip.active { background: var(--brand-light); border-color: var(--brand); color: var(--brand-700); }
        .filter-select { font-size: 0.8125rem !important; padding: 6px 10px !important; }

        /* ── Recherche ── */
        .recip-search-wrap { position: relative; padding: 8px 12px; border-bottom: 1px solid var(--border); }
        .recip-search-icon { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .recip-search { width: 100%; padding: 6px 28px; border: 1px solid var(--border); border-radius: 8px; background: var(--cream, #faf8f5); font-size: 0.8125rem; color: var(--text-primary); outline: none; }
        .recip-search:focus { border-color: var(--brand); }
        .recip-search-clear { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 2px; display: flex; align-items: center; }

        /* ── Toggle all ── */
        .toggle-all { display: flex; align-items: center; gap: 6px; padding: 7px 16px; border: none; background: none; cursor: pointer; font-size: 0.8125rem; color: var(--text-secondary); width: 100%; text-align: left; }
        .toggle-all:hover { background: var(--cream-dark, #f0ece6); }
        .toggle-all-hint { font-size: 0.6875rem; color: var(--brand-700); margin-left: auto; }

        /* ── Liste élèves ── */
        .recip-list { max-height: 340px; overflow-y: auto; }
        @media (min-width: 768px) { .recip-list { max-height: 420px; } }
        .recip-empty { padding: 20px 16px; color: var(--text-muted); font-size: 0.8125rem; text-align: center; }
        .recip-row { display: flex; align-items: center; gap: 10px; padding: 8px 16px; cursor: pointer; border-top: 1px solid var(--border); transition: background 0.1s; }
        .recip-row:hover { background: var(--cream-dark, #f0ece6); }
        .recip-row.selected { background: var(--brand-50, #fdf2f2); }
        .recip-row input { accent-color: var(--brand); width: 15px; height: 15px; cursor: pointer; flex-shrink: 0; }
        .recip-info { display: flex; flex-direction: column; min-width: 0; }
        .recip-nom { font-weight: 600; font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .recip-contact { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* ── Zone destinataires (chips) ── */
        .compose-recip-zone {
          padding: 12px 16px; border-bottom: 2px solid var(--brand-light);
          background: color-mix(in srgb, var(--brand) 4%, var(--bg-card));
          display: flex; flex-direction: column; gap: 8px;
        }
        .compose-recip-header {
          display: flex; justify-content: space-between; align-items: center;
        }
        .compose-recip-label {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.6875rem; font-weight: 700; color: var(--brand-700);
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .recip-clear-all {
          display: flex; align-items: center; gap: 3px;
          padding: 2px 8px; border-radius: 6px;
          border: 1px solid var(--border); background: none;
          font-size: 0.6875rem; color: var(--text-muted); cursor: pointer;
          transition: all 0.15s;
        }
        .recip-clear-all:hover { border-color: #dc2626; color: #dc2626; }
        .compose-chips-area {
          display: flex; flex-wrap: wrap; gap: 6px;
          min-height: 30px; align-items: center;
        }
        .chips-empty {
          font-size: 0.8125rem; color: var(--text-muted); font-style: italic;
        }
        /* Chip individuel + bulk */
        .recip-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 6px 4px 10px; border-radius: var(--radius-full);
          background: var(--brand-light); border: 1px solid var(--brand);
          color: var(--brand-700); font-size: 0.75rem; font-weight: 600;
          max-width: 200px; animation: chipIn 0.15s ease;
        }
        .chip-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .chip-remove {
          background: none; border: none; cursor: pointer;
          color: var(--brand-700); padding: 0; display: flex; align-items: center;
          flex-shrink: 0; opacity: 0.55; transition: opacity 0.1s;
          border-radius: 50%; width: 14px; height: 14px; justify-content: center;
        }
        .chip-remove:hover { opacity: 1; background: color-mix(in srgb, var(--brand) 20%, transparent); }
        /* Chip groupé (> 20 élèves) */
        .recip-chip-bulk {
          background: color-mix(in srgb, var(--brand) 12%, transparent);
          border-style: dashed;
        }
        /* Chip groupé cliquable pour expand */
        .recip-chip-expandable {
          cursor: pointer; gap: 6px;
          transition: background 0.15s;
        }
        .recip-chip-expandable:hover {
          background: color-mix(in srgb, var(--brand) 20%, transparent);
        }
        /* Bouton réduire */
        .chips-collapse-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: var(--radius-full);
          border: 1px dashed var(--brand); background: none;
          font-size: 0.75rem; font-weight: 600; color: var(--brand-700);
          cursor: pointer; transition: all 0.15s;
        }
        .chips-collapse-btn:hover { background: var(--brand-light); }
        @keyframes chipIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }

        /* ── Composition (droite) ── */
        .comm-compose { display: flex; flex-direction: column; overflow: hidden; }
        .compose-preset-banner { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 14px; background: #f5f3ff; border-bottom: 1px solid #ddd6fe; font-size: 0.8125rem; color: #6d28d9; font-weight: 600; }
        .compose-preset-banner button { background: none; border: none; cursor: pointer; color: #6d28d9; padding: 2px; }
        .compose-field { padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
        .compose-field-grow { flex: 1; }
        .compose-label { font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .compose-label-row { display: flex; justify-content: space-between; align-items: center; }
        .insert-prenom-btn { display: inline-flex; align-items: center; gap: 3px; padding: 3px 10px; border-radius: 6px; border: 1.5px solid var(--brand); background: var(--brand-light); color: var(--brand-700); font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.15s; white-space: nowrap; font-family: monospace; }
        .insert-prenom-btn:hover { background: var(--brand); color: white; }
        .insert-prenom-btn:active { transform: scale(0.96); }
        .compose-textarea { min-height: 150px; resize: vertical; }
        .compose-preview { font-size: 0.8125rem; color: var(--text-muted); padding: 8px 10px; background: var(--cream, #faf8f5); border-radius: var(--radius-sm); border: 1px dashed var(--border); line-height: 1.5; white-space: pre-wrap; }
        .compose-preview-label { font-weight: 700; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 4px; }

        /* ── Cadeau ── */
        .compose-cadeau-zone { padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--cream, #faf8f5); }
        .compose-cadeau-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .compose-cadeau-title { display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); }
        .compose-cadeau-toggle { padding: 4px 12px; border-radius: var(--radius-full); border: 1.5px solid var(--border); background: var(--bg-card); font-size: 0.75rem; font-weight: 600; cursor: pointer; color: var(--text-muted); transition: all 0.15s; }
        .compose-cadeau-toggle.on { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .compose-cadeau-form { display: flex; flex-direction: column; gap: 8px; }
        .cadeau-type-row { display: flex; gap: 6px; }
        .cadeau-type-btn { flex: 1; padding: 7px 10px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--bg-card); font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
        .cadeau-type-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .cadeau-pct-row { display: flex; gap: 5px; flex-wrap: wrap; }
        .cadeau-pct-btn { padding: 5px 10px; border-radius: 6px; border: 1.5px solid var(--border); background: var(--bg-card); font-size: 0.8125rem; font-weight: 600; cursor: pointer; color: var(--text-secondary); transition: all 0.15s; }
        .cadeau-pct-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .cadeau-preview { font-size: 0.75rem; color: var(--text-muted); padding: 7px 10px; background: var(--bg-card); border-radius: 6px; border: 1px dashed var(--border); white-space: pre-wrap; line-height: 1.4; }

        /* ── Footer envoi ── */
        .compose-footer { padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
        .compose-warn { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: #92400e; }
        .compose-send { width: 100%; }

        /* ── Historique ── */
        .hist-list { display: flex; flex-direction: column; gap: 10px; }
        .hist-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 20px; color: var(--text-muted); font-size: 0.875rem; }
        .hist-card { padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
        .hist-card-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .hist-canal-badge { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: color-mix(in srgb, var(--cc, #666) 10%, transparent); color: var(--cc, #666); font-size: 0.6875rem; font-weight: 700; border: 1px solid color-mix(in srgb, var(--cc, #666) 20%, transparent); }
        .hist-dest { font-size: 0.875rem; font-weight: 600; flex: 1; }
        .hist-date { font-size: 0.75rem; color: var(--text-muted); }
        .hist-statut { display: flex; align-items: center; gap: 3px; font-size: 0.6875rem; font-weight: 700; }
        .hist-statut.envoye { color: #16a34a; }
        .hist-statut.erreur { color: #dc2626; }
        .hist-sujet { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); }
        .hist-corps { font-size: 0.8125rem; color: var(--text-muted); line-height: 1.5; white-space: pre-wrap; max-height: 80px; overflow: hidden; text-overflow: ellipsis; }

        /* ══ Barre d'outils enrichie ══ */
        .editor-toolbar {
          display: flex; align-items: center; gap: 3px;
          padding: 5px 8px; border-radius: 8px 8px 0 0;
          background: var(--cream-dark, #f0ece6);
          border: 1px solid var(--border); border-bottom: none;
          flex-wrap: wrap;
        }
        .tb-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 28px; border-radius: 6px;
          border: 1px solid transparent; background: none;
          font-size: 0.8125rem; cursor: pointer; color: var(--text-secondary);
          transition: all 0.12s; flex-shrink: 0;
        }
        .tb-btn:hover { background: var(--bg-card); border-color: var(--border); color: var(--text-primary); }
        .tb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .tb-btn.tb-active { background: var(--brand-light); border-color: var(--brand); color: var(--brand-700); }
        .tb-bold   { font-weight: 800; font-size: 0.875rem; }
        .tb-italic { font-style: italic; font-weight: 600; }
        .tb-underline { text-decoration: underline; font-weight: 600; }
        .tb-sep { width: 1px; height: 18px; background: var(--border); margin: 0 3px; flex-shrink: 0; }
        /* Textarea collé à la toolbar */
        .editor-toolbar + .emoji-panel,
        .editor-toolbar + textarea,
        .editor-toolbar + .emoji-panel + textarea {
          border-top-left-radius: 0 !important;
          border-top-right-radius: 0 !important;
        }

        /* ══ Panneau emoji ══ */
        .emoji-panel {
          border: 1px solid var(--border); border-top: none;
          background: var(--bg-card);
          max-height: 220px; overflow-y: auto;
          padding: 8px 10px; display: flex; flex-direction: column; gap: 8px;
        }
        .emoji-section { display: flex; flex-direction: column; gap: 4px; }
        .emoji-cat-label {
          font-size: 0.6875rem; font-weight: 700; color: var(--brand-700);
          text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 0;
        }
        .emoji-grid { display: flex; flex-wrap: wrap; gap: 2px; }
        .emoji-btn {
          width: 32px; height: 32px; border-radius: 6px; border: none;
          background: none; cursor: pointer; font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.1s; flex-shrink: 0;
        }
        .emoji-btn:hover { background: var(--brand-light); }

        /* ══ Indicateur pièce jointe ══ */
        .attach-indicator {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 10px; border-radius: 0 0 8px 8px;
          font-size: 0.75rem; border: 1px solid var(--border); border-top: none;
          background: var(--cream, #faf8f5);
        }
        .attach-indicator.att-uploading { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
        .attach-indicator.att-done      { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
        .attach-indicator.att-error     { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
        .attach-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
        .attach-size { color: var(--text-muted); flex-shrink: 0; }
        .attach-error-msg { font-size: 0.6875rem; margin-left: auto; flex: 1; }
        .attach-remove {
          background: none; border: none; cursor: pointer; color: currentColor;
          opacity: 0.55; display: flex; align-items: center; padding: 1px;
          flex-shrink: 0; border-radius: 4px;
        }
        .attach-remove:hover { opacity: 1; }

        /* ══ Modal lien ══ */
        .link-modal-backdrop {
          position: fixed; inset: 0; z-index: 9998;
          background: rgba(0,0,0,0.25); display: flex;
          align-items: center; justify-content: center;
          padding: 20px;
        }
        .link-modal {
          background: var(--bg-card); border-radius: 14px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.18);
          padding: 20px; width: 100%; max-width: 380px;
          display: flex; flex-direction: column; gap: 10px;
          animation: fadeIn 0.15s ease;
        }
        .link-modal-title {
          display: flex; align-items: center; gap: 7px;
          font-size: 0.9375rem; font-weight: 700; color: var(--text-primary);
        }
        .link-modal-actions {
          display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;
        }

        /* ── Animations ── */
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        .animate-fade-in  { animation: fadeIn  0.2s ease; }
        .animate-slide-up { animation: slideUp 0.25s ease; }
        .spin      { animation: spin 0.7s linear infinite; }
        .spin-slow { animation: spin 1.2s linear infinite; }
      `}</style>
    </div>
  );
}

// Wrappé dans Suspense pour useSearchParams
export default function CommunicationPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Chargement…
      </div>
    }>
      <CommunicationInner />
    </Suspense>
  );
}
