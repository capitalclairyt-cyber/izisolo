'use client';

// ════════════════════════════════════════════════════════════════════════════
// Le registre : id de rubrique → composant. Chaque rubrique rend ses cartes
// (les mêmes sections qu'avant, réutilisées telles quelles) et lit l'état
// partagé par useParametres(). Rien ici ne change ce qui est enregistré.
// ════════════════════════════════════════════════════════════════════════════

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useParametres, BtnSauver } from '../ParametresContext';

import PagePubliqueSection from '../sections/PagePubliqueSection';
import DocsInscriptionSection from '../sections/DocsInscriptionSection';
import IntegrerSiteSection from '../sections/IntegrerSiteSection';
import TypesCoursSection from '../sections/TypesCoursSection';
import VisibiliteSection from '../sections/VisibiliteSection';
import CoursEssaiSection from '../sections/CoursEssaiSection';
import StripePaiementSection from '../sections/StripePaiementSection';
import ReglementSection from '../sections/ReglementSection';
import ChampsElevesSection from '../sections/ChampsElevesSection';
import ReglesAnnulationSection from '../sections/ReglesAnnulationSection';
import NotifsElevesSection from '../sections/NotifsElevesSection';
import ReglesMetierTab from '../ReglesMetierTab';

import ProfilCarte from './ProfilCarte';
import StudioLieux from './StudioLieux';
import FacturationCarte from './FacturationCarte';
import UrssafCarte from './UrssafCarte';
import SeuilsCartes from './SeuilsCartes';
import MesNotifications from './MesNotifications';
import AnniversairesCarte from './AnniversairesCarte';
import AbonnementRubrique from './AbonnementRubrique';

// Une carte « section + son bouton » : le patron de 9 rubriques sur 19.
function Carte({ Section, carte }) {
  const { profile, setProfile, marquer } = useParametres();
  return (
    <>
      <Section profile={profile} setProfile={setProfile} setDirty={() => marquer(carte)} />
      <BtnSauver carte={carte} />
    </>
  );
}

const PageRubrique       = () => <Carte Section={PagePubliqueSection} carte="page" />;
const TypesCoursRubrique = () => <Carte Section={TypesCoursSection} carte="apparence" />;
const EssaiRubrique      = () => <Carte Section={CoursEssaiSection} carte="essai" />;
const DocumentsRubrique  = () => <Carte Section={DocsInscriptionSection} carte="docs" />;
const PaiementRubrique   = () => <Carte Section={StripePaiementSection} carte="paiement" />;
const ChampsRubrique     = () => <Carte Section={ChampsElevesSection} carte="champs" />;
const VisibiliteRubrique = () => <Carte Section={VisibiliteSection} carte="visibilite" />;
const AnnulationRubrique = () => <Carte Section={ReglesAnnulationSection} carte="annulation" />;

function IntegrerRubrique() {
  const { profile, setProfile } = useParametres();
  return <IntegrerSiteSection profile={profile} setProfile={setProfile} />;
}

function VirementRubrique() {
  const { profile, setProfile, marquer } = useParametres();
  return (
    <ReglementSection
      profile={profile}
      setProfile={setProfile}
      setDirty={() => marquer('reglement')}
      boutonSauver={<BtnSauver carte="reglement" />}
    />
  );
}

function CasParticuliersRubrique() {
  const { profile } = useParametres();
  return <ReglesMetierTab profileId={profile.id} />;
}

function NotificationsElevesRubrique() {
  return (
    <>
      <Carte Section={NotifsElevesSection} carte="notifs_eleves" />
      <AnniversairesCarte />
    </>
  );
}

function AbonnementAvecRetourStripe() {
  // Retour Stripe Checkout (?abo=success ou ?abo=cancel) : toast + URL
  // nettoyée pour ne pas re-déclencher au refresh. Avant, ce code vivait dans
  // le monolithe et basculait l'onglet ; l'URL de la rubrique s'en charge.
  const searchParams = useSearchParams();
  const { toast } = useToast();
  useEffect(() => {
    const abo = searchParams.get('abo');
    if (abo === 'success') {
      toast.success('🎉 Paiement reçu, merci ! Ton abonnement s\'active dans quelques secondes.');
      window.history.replaceState(null, '', '/parametres/abonnement');
    } else if (abo === 'cancel') {
      toast.info('Souscription annulée. Tu peux relancer quand tu veux.');
      window.history.replaceState(null, '', '/parametres/abonnement');
    }
  }, []);
  return <AbonnementRubrique />;
}

const RUBRIQUES = {
  'profil':               ProfilCarte,
  'studio':               StudioLieux,
  'page':                 PageRubrique,
  'types-cours':          TypesCoursRubrique,
  'essai':                EssaiRubrique,
  'documents':            DocumentsRubrique,
  'integrer':             IntegrerRubrique,
  'facturation':          FacturationCarte,
  'paiement-en-ligne':    PaiementRubrique,
  'virement':             VirementRubrique,
  'urssaf':               UrssafCarte,
  'champs':               ChampsRubrique,
  'visibilite':           VisibiliteRubrique,
  'annulation':           AnnulationRubrique,
  'cas-particuliers':     CasParticuliersRubrique,
  'seuils':               SeuilsCartes,
  'mes-notifications':    MesNotifications,
  'notifications-eleves': NotificationsElevesRubrique,
  'abonnement':           AbonnementAvecRetourStripe,
};

export const RUBRIQUES_RENDUES = Object.keys(RUBRIQUES);

export default function Rubrique({ id }) {
  const Composant = RUBRIQUES[id];
  if (!Composant) return null;
  return <Composant />;
}
