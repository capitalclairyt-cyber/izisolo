import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import EspaceClient from './EspaceClient';

export const metadata = { title: 'Mon espace — IziSolo' };

// ─── Mode démo : données fake pour que le prof voie son portail comme une
// élève fictive. Active uniquement si ?demo=1 ET viewer = prof du studio. ──
function buildDemoData(profile) {
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  const demoClient = {
    id: 'demo-client',
    prenom: 'Camille',
    nom: '(démo)',
    email: 'demo@izisolo.fr',
    telephone: null,
  };

  const demoAVenir = [
    {
      id: 'demo-pres-1',
      statut_pointage: 'inscrit',
      created_at: new Date().toISOString(),
      cours: {
        id: 'demo-cours-1',
        nom: 'Pilates matinal',
        date: fmt(addDays(2)),
        heure: '09:30',
        duree_minutes: 60,
        lieu: profile.studio_nom || 'Studio',
        type_cours: 'Pilates',
        est_annule: false,
      },
    },
    {
      id: 'demo-pres-2',
      statut_pointage: 'inscrit',
      created_at: new Date().toISOString(),
      cours: {
        id: 'demo-cours-2',
        nom: 'Pilates barre',
        date: fmt(addDays(5)),
        heure: '18:00',
        duree_minutes: 75,
        lieu: profile.studio_nom || 'Studio',
        type_cours: 'Pilates',
        est_annule: false,
      },
    },
  ];

  const demoPasses = [
    {
      id: 'demo-pres-p1',
      statut_pointage: 'present',
      pointee: true,
      created_at: new Date().toISOString(),
      cours: {
        id: 'demo-cours-p1',
        nom: 'Pilates matinal',
        date: fmt(addDays(-3)),
        heure: '09:30',
        duree_minutes: 60,
        lieu: profile.studio_nom || 'Studio',
        type_cours: 'Pilates',
        est_annule: false,
      },
    },
  ];

  const demoAbonnements = [
    {
      id: 'demo-abo-1',
      offre_nom: 'Carnet 10 séances',
      type: 'carnet',
      date_debut: fmt(addDays(-30)),
      date_fin: fmt(addDays(150)),
      seances_total: 10,
      seances_utilisees: 4,
      statut: 'actif',
      date_pause_debut: null,
      date_pause_fin: null,
    },
  ];

  const demoPaiements = [
    {
      id: 'demo-pay-1',
      intitule: 'Carnet 10 séances',
      montant: 180,
      mode: 'cb',
      date: fmt(addDays(-30)),
      date_encaissement: fmt(addDays(-30)),
      statut: 'paid',
    },
  ];

  return {
    profile,
    client: demoClient,
    aVenir: demoAVenir,
    passes: demoPasses,
    paiements: demoPaiements,
    offresStripe: [],
    abonnements: demoAbonnements,
  };
}

async function getData(studioSlug, userEmail) {
  const supabase = await createServerClient();

  // Studio (+ règles d'annulation pour application dans EspaceClient)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, regles_annulation')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return null;

  // Client lié à ce studio + offres avec Stripe Payment Link en parallèle
  const [{ data: client }, { data: offresStripe }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, prenom, nom, email, telephone')
      .eq('profile_id', profile.id)
      .ilike('email', userEmail)
      .single(),
    supabase
      .from('offres')
      .select('id, nom, type, prix, seances, stripe_payment_link')
      .eq('profile_id', profile.id)
      .eq('actif', true)
      .not('stripe_payment_link', 'is', null)
      .order('ordre'),
  ]);

  if (!client) {
    return { profile, client: null, aVenir: [], passes: [], paiements: [], offresStripe: offresStripe || [], abonnements: [] };
  }

  // Mes paiements + abonnements actifs (pour afficher le solde)
  const [{ data: paiements }, { data: abonnements }] = await Promise.all([
    supabase
      .from('paiements')
      .select('id, intitule, montant, mode, date, date_encaissement, statut')
      .eq('profile_id', profile.id)
      .eq('client_id', client.id)
      .order('date', { ascending: false }),
    supabase
      .from('abonnements')
      .select('id, offre_nom, type, date_debut, date_fin, seances_total, seances_utilisees, statut, date_pause_debut, date_pause_fin')
      .eq('profile_id', profile.id)
      .eq('client_id', client.id)
      .in('statut', ['actif', 'epuise', 'expire', 'gele'])
      .order('date_debut', { ascending: false }),
  ]);

  // Ses réservations avec détail des cours
  const { data: presences } = await supabase
    .from('presences')
    .select(`
      id,
      statut_pointage,
      created_at,
      cours:cours_id (
        id, nom, date, heure, duree_minutes, lieu, type_cours, est_annule
      )
    `)
    .eq('client_id', client.id)
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const all = presences || [];

  const aVenir = all
    .filter(p => p.cours && p.cours.date >= today && !p.cours.est_annule)
    .sort((a, b) => {
      if (a.cours.date !== b.cours.date) return a.cours.date.localeCompare(b.cours.date);
      return (a.cours.heure || '').localeCompare(b.cours.heure || '');
    });

  const passes = all
    .filter(p => p.cours && (p.cours.date < today || p.cours.est_annule))
    .sort((a, b) => b.cours.date.localeCompare(a.cours.date));

  return { profile, client, aVenir, passes, paiements: paiements || [], offresStripe: offresStripe || [], abonnements: abonnements || [] };
}

export default async function EspacePage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = (await searchParams) || {};
  const isDemoRequest = sp.demo === '1';

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/p/${studioSlug}/connexion`);
  }

  // Mode démo : si ?demo=1 ET l'user connecté est le prof du studio, on
  // injecte des données fake pour qu'il/elle voie l'espace comme une élève.
  if (isDemoRequest) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, studio_nom, studio_slug, regles_annulation')
      .eq('studio_slug', studioSlug)
      .single();

    if (!profile) notFound();

    if (profile.id === user.id) {
      const demoData = buildDemoData(profile);
      return (
        <EspaceClient
          profile={demoData.profile}
          client={demoData.client}
          aVenir={demoData.aVenir}
          passes={demoData.passes}
          paiements={demoData.paiements}
          offresStripe={demoData.offresStripe}
          abonnements={demoData.abonnements}
          studioSlug={studioSlug}
          userEmail={user.email}
          isDemo={true}
        />
      );
    }
    // Si demo=1 mais user n'est PAS le prof → on ignore le flag, vraie data
  }

  const data = await getData(studioSlug, user.email);
  if (!data) notFound();

  return (
    <EspaceClient
      profile={data.profile}
      client={data.client}
      aVenir={data.aVenir || []}
      passes={data.passes || []}
      paiements={data.paiements || []}
      offresStripe={data.offresStripe || []}
      abonnements={data.abonnements || []}
      studioSlug={studioSlug}
      userEmail={user.email}
    />
  );
}
