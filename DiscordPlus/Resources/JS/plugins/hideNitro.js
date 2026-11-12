/* Discord Plus plugin: Hide Nitro Upsell
   Hides Nitro upsell links and buttons (best-effort: matches links and
   controls whose href or aria-label mentions Nitro). */
(function () {
  'use strict';
  var styleEl = null;
  var CSS = 'a[href*="/nitro" i], a[href*="nitro" i], [aria-label*="nitro" i] { display: none !important; }';
  DP.registerPlugin({
    id: 'hideNitro',
    name: 'Hide Nitro Upsell',
    version: '1.0.0',
    start: function () {
      styleEl = document.createElement('style');
      styleEl.id = 'dp-hide-nitro';
      styleEl.textContent = CSS;
      document.head.appendChild(styleEl);
    },
    stop: function () {
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      styleEl = null;
    }
  });
})();
