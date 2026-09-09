'use client';

// ════════════════════════════════════════════════════════════════════════════
// Le registre : id de rubrique → composant. Chaque rubrique rend ses cartes
// (CarteReglage, lot 2 : la première ouverte, les suivantes repliées avec leur
// résumé d'état) et lit l'état partagé par useParametres(). Rien ici ne
// change ce qui est enregistré.
// ════════════════════════════════════════════════════════════════════════════

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { FileText, Palette, Eye, Sparkles, CreditCard, Landmark, ClipboardList, Clock, Send } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { resumeCarte } from '@/lib/parametres-rubriques';
import { useParametres, BtnSauver } from '../ParametresContext';
import CarteReglage from '../CarteReglage';

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

// Une carte « section + son bouton » : le patron de la plupart des rubriques.
// `ouverte` : la première carte d'une rubrique s'ouvre d'elle-même.
export function Carte({ Section, carte, titre, icone, ouverte = true, props = {} }) {
  const { profile, setProfile, marquer, lieux } = useParametres();
  return (
    <CarteReglage id={carte} titre={titre} icone={icone} resume={resumeCarte(carte, profile, { lieux })} ouverte={ouverte}>
      <Section profile={profile} setProfile={setProfile} setDirty={() => marquer(carte)} {...props} />
      <BtnSauver carte={carte} />
    </CarteReglage>
  );
}

const TypesCoursRubrique = () => <Carte Section={TypesCoursSection} carte="apparence" titre="Types de cours" icone={Palette} />;
const EssaiRubrique      = () => <Carte Section={CoursEssaiSection} carte="essai" titre="Cours d'essai" icone={Sparkles} />;
const DocumentsRubrique  = () => <Carte Section={DocsInscriptionSection} carte="docs" titre="Documents d'inscription" icone={FileText} />;
const PaiementRubrique   = () => <Carte Section={StripePaiementSection} carte="paiement" titre="Paiement en ligne" icone={CreditCard} />;
const ChampsRubrique     = () => <Carte Section={ChampsElevesSection} carte="champs" titre="Infos collectées sur tes élèves" icone={ClipboardList} />;
const VisibiliteRubrique = () => <Carte Section={VisibiliteSection} carte="visibilite" titre="Visibilité des cours" icone={Eye} />;
const AnnulationRubrique = () => <Carte Section={ReglesAnnulationSection} carte="annulation" titre="Règles d'annulation" icone={Clock} />;

function PageRubrique() {
  // Ma page se replie en trois cartes DANS la section (ouvert / ce que ta page
  // montre / aller plus loin) : un seul bouton Enregistrer pour la carte `page`.
  const { profile, setProfile, marquer } = useParametres();
  return (
    <>
      <PagePubliqueSection profile={profile} setProfile={setProfile} setDirty={() => marquer('page')} />
      <BtnSauver carte="page" />
    </>
  );
}

function IntegrerRubrique() {
  const { profile, setProfile } = useParametres();
  return <IntegrerSiteSection profile={profile} setProfile={setProfile} />;
}

function VirementRubrique() {
  const { profile, setProfile, marquer } = useParametres();
  return (
    <CarteReglage id="reglement" titre="Règlement par virement" icone={Landmark} resume={resumeCarte('reglement', profile)} ouverte>
      <ReglementSection
        profile={profile}
        setProfile={setProfile}
        setDirty={() => marquer('reglement')}
        boutonSauver={<BtnSauver carte="reglement" />}
      />
    </CarteReglage>
  );
}

function CasParticuliersRubrique() {
  const { profile } = useParametres();
  return <ReglesMetierTab profileId={profile.id} />;
}

function NotificationsElevesRubrique() {
  return (
    <>
      <Carte Section={NotifsElevesSection} carte="notifs_eleves" titre="Emails automatiques à tes élèves" icone={Send} />
      <AnniversairesCarte />
    </>
  );
}

function AbonnementAvecRetourStripe() {
  // Retour Stripe Checkout (?abo=success ou ?abo=cancel) : toast + URL
  // nettoyée pour ne pas re-déclencher au refresh.
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
