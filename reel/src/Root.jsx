import { Composition } from 'remotion';
import { Reel, dureeReel } from './Reel';
import { Clip, dureeClip, LARGEUR_CLIP, hauteurClip } from './Clip';
import { SCENES } from './scenes';
import { Pov } from './Pov';
import { DUREE_POV, VARIANTES } from './pov-variantes';
import { Split } from './Split';
import { ReponseDM } from './ReponseDM';
import { Rentree } from './Rentree';
import { Fonction, dureeFonction } from './Fonction';
import { SPLIT, REPONSE_DM, RENTREE } from './formats';
import { Migration, MigrationClip, DUREE_MIGRATION, DUREE_CLIP_MIGRATION } from './Migration';
import { Freemium, DUREE_FREEMIUM } from './Freemium';
import { Gratuit, DUREE_GRATUIT } from './Gratuit';
import { PROFILS as PROFILS_GRATUIT } from './gratuit-scenes';
import { CarrouselAvis, LARGEUR_CARROUSEL, HAUTEUR_CARROUSEL } from './CarrouselAvis';
import { Avis, DUREE_AVIS } from './Avis';
import { Studio, DUREE_STUDIO } from './Studio';
import { PROFILS as PROFILS_STUDIO } from './studio-formats';
import { Conversation } from './Conversation';
import { VARIANTES as CONVERSATIONS, dureeConversation } from './conversation-variantes';
import { FPS, H, W } from './theme';

// Trois familles : le réel complet (Instagram / Facebook), pour la landing un
// clip « écran seul » par scène (`Clip-<id>`, rendu par scripts/rendre-clips.mjs),
// les réels « POV » en texte pur (`Pov-<id>`, rendus par scripts/rendre-pov.mjs),
// et les formats « déclencheurs » du 10/09 (Split, ReponseDM, Rentree, Fonction-<scène>,
// rendus par scripts/rendre-formats.mjs).
export const RemotionRoot = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={dureeReel()} fps={FPS} width={W} height={H} />
    {VARIANTES.map((v) => (
      <Composition key={v.id} id={`Pov-${v.id}`} component={Pov} defaultProps={{ varianteId: v.id }}
        durationInFrames={DUREE_POV} fps={FPS} width={W} height={H} />
    ))}
    {CONVERSATIONS.map((v) => (
      <Composition key={v.id} id={`Conv-${v.id}`} component={Conversation} defaultProps={{ varianteId: v.id }}
        durationInFrames={dureeConversation(v.id)} fps={FPS} width={W} height={H} />
    ))}
    <Composition id="Split" component={Split} durationInFrames={SPLIT.duree} fps={FPS} width={W} height={H} />
    <Composition id="ReponseDM" component={ReponseDM} durationInFrames={REPONSE_DM.duree} fps={FPS} width={W} height={H} />
    <Composition id="Rentree" component={Rentree} durationInFrames={RENTREE.duree} fps={FPS} width={W} height={H} />
    <Composition id="Migration" component={Migration} durationInFrames={DUREE_MIGRATION} fps={FPS} width={W} height={H} />
    <Composition id="Freemium" component={Freemium} durationInFrames={DUREE_FREEMIUM} fps={FPS} width={W} height={H} />
    {/* Le reel « 0 € » (2026-09-16) : deux formats, la MEME composition, le
        profil choisit la mise en page (9:16 pour les reels, 4:5 pour le fil
        LinkedIn). Rendus par scripts/rendre-gratuit.mjs. */}
    <Composition id="Gratuit" component={Gratuit} defaultProps={{ profil: 'reel' }}
      durationInFrames={DUREE_GRATUIT} fps={FPS} width={PROFILS_GRATUIT.reel.W} height={PROFILS_GRATUIT.reel.H} />
    <Composition id="Gratuit-Feed" component={Gratuit} defaultProps={{ profil: 'feed' }}
      durationInFrames={DUREE_GRATUIT} fps={FPS} width={PROFILS_GRATUIT.feed.W} height={PROFILS_GRATUIT.feed.H} />
    {/* Le carrousel Instagram Avis Google : une image fixe par page (`--props`
        { slide, palette }), rendu par scripts/rendre-carrousel.mjs. */}
    <Composition id="CarrouselAvis" component={CarrouselAvis} defaultProps={{ slide: 1, palette: 'bleu' }}
      durationInFrames={1} fps={FPS} width={LARGEUR_CARROUSEL} height={HAUTEUR_CARROUSEL} />
    <Composition id="Avis" component={Avis} durationInFrames={DUREE_AVIS} fps={FPS} width={W} height={H} />
    {/* Le reel « plan Studio » (2026-09-23) : deux formats, la MEME composition,
        rendus par scripts/rendre-studio.mjs (npm run plan-studio). */}
    <Composition id="PlanStudio" component={Studio} defaultProps={{ profil: 'reel' }}
      durationInFrames={DUREE_STUDIO} fps={FPS} width={PROFILS_STUDIO.reel.W} height={PROFILS_STUDIO.reel.H} />
    <Composition id="PlanStudio-Feed" component={Studio} defaultProps={{ profil: 'feed' }}
      durationInFrames={DUREE_STUDIO} fps={FPS} width={PROFILS_STUDIO.feed.W} height={PROFILS_STUDIO.feed.H} />
    <Composition id="Clip-migration" component={MigrationClip} durationInFrames={DUREE_CLIP_MIGRATION} fps={FPS} width={LARGEUR_CLIP} height={hauteurClip(1558)} />
    {SCENES.map((scene) => (
      <Composition key={`f-${scene.id}`} id={`Fonction-${scene.id}`} component={Fonction} defaultProps={{ sceneId: scene.id }}
        durationInFrames={dureeFonction(scene)} fps={FPS} width={W} height={H} />
    ))}
    {SCENES.map((scene) => (
      <Composition key={scene.id} id={`Clip-${scene.id}`} component={Clip} defaultProps={{ sceneId: scene.id }}
        durationInFrames={dureeClip(scene)} fps={FPS} width={LARGEUR_CLIP} height={hauteurClip(scene.mockup.imgH)} />
    ))}
  </>
);
