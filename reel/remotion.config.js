// Réglages Remotion du réel IziSolo.
// Les captures sont lues DIRECTEMENT dans public/icons/landing/ du site : une
// seule source de vérité, re-photographiée par scripts/shoot-landing-visuels.mjs.
import { Config } from '@remotion/cli/config';
import path from 'node:path';

Config.setEntryPoint('./src/index.jsx');
Config.setPublicDir(path.join(process.cwd(), '..', 'public', 'icons', 'landing'));
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
