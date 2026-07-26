/* IziSolo — widget planning intégrable (B2g).
 *
 * Usage (une ligne, dans un bloc HTML de WordPress / Wix / Squarespace…) :
 *   <script src="https://www.izisolo.fr/widget.js" data-studio="mon-studio" async></script>
 *
 * Options : data-semaines="4" (fenêtre affichée), data-type="Yoga" (filtre),
 *           data-hauteur="900" (hauteur de départ avant auto-ajustement).
 *
 * Le script crée une iframe vers /embed/<studio> À L'ENDROIT où il est collé,
 * puis écoute les messages { source:'izisolo-embed', height } postés par la
 * page embarquée pour ajuster la hauteur (zéro double scrollbar). L'origine
 * de l'iframe est dérivée du src du script lui-même : le même fichier marche
 * en prod comme en local. Sans JavaScript côté hôte, l'iframe nue documentée
 * dans Paramètres reste le fallback.
 */
(function () {
  var script = document.currentScript;
  if (!script) return; // navigateur exotique : l'iframe nue reste possible

  var studio = script.getAttribute('data-studio');
  if (!studio) return;

  var origin;
  try {
    origin = new URL(script.src).origin;
  } catch (_e) {
    origin = 'https://www.izisolo.fr';
  }

  var params = [];
  var semaines = script.getAttribute('data-semaines');
  var type = script.getAttribute('data-type');
  if (semaines) params.push('semaines=' + encodeURIComponent(semaines));
  if (type) params.push('type=' + encodeURIComponent(type));

  var iframe = document.createElement('iframe');
  iframe.src = origin + '/embed/' + encodeURIComponent(studio) + (params.length ? '?' + params.join('&') : '');
  iframe.title = 'Planning des cours';
  iframe.loading = 'lazy';
  iframe.style.width = '100%';
  iframe.style.border = '0';
  iframe.style.display = 'block';
  iframe.style.height = (parseInt(script.getAttribute('data-hauteur'), 10) || 700) + 'px';

  window.addEventListener('message', function (e) {
    // Garde-fous : bonne origine, bonne iframe (multi-widgets possibles),
    // bonne forme de message. La hauteur est la seule donnée échangée.
    if (e.origin !== origin) return;
    if (e.source !== iframe.contentWindow) return;
    var d = e.data;
    if (!d || d.source !== 'izisolo-embed' || typeof d.height !== 'number') return;
    var h = Math.max(120, Math.min(20000, Math.ceil(d.height)));
    iframe.style.height = h + 'px';
  });

  script.insertAdjacentElement('afterend', iframe);
})();
