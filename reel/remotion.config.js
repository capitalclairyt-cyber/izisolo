// Réglages Remotion du réel IziSolo.
// Les captures vivent dans reel/public/ (le dossier public par défaut), prises
// par scripts/shoot-reel-visuels.mjs contre le démo en prod.
import { Config } from '@remotion/cli/config';

Config.setEntryPoint('./src/index.jsx');
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
