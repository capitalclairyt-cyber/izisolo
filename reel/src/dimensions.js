// Les dimensions d'un clip de la landing (écran seul, cf. Clip.jsx), partagées
// entre la composition Remotion et le script de rendu qui écrit le manifest
// lu par le site. Un clip a la largeur des captures (720) et la hauteur d'un
// viewport de téléphone (1558), sauf quand la capture est plus courte : on ne
// rend jamais une bande blanche sous une page qui tient dans l'écran.
export const LARGEUR_CLIP = 720;
export const HAUTEUR_VIEWPORT = 1558;
export const hauteurClip = (imgH) => Math.min(HAUTEUR_VIEWPORT, imgH);
