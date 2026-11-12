/* Discord Plus plugin: Custom CSS Loader
   Applies the custom CSS written in Settings (DP.settings.customCSS)
   through the loader's __DP_APPLY_CUSTOM_CSS__ helper. */
(function () {
  'use strict';
  DP.registerPlugin({
    id: 'customCSS',
    name: 'Custom CSS Loader',
    version: '1.0.0',
    start: function () {
      if (window.__DP_APPLY_CUSTOM_CSS__) {
        window.__DP_APPLY_CUSTOM_CSS__(DP.settings.customCSS || '');
      }
    },
    stop: function () {
      if (window.__DP_APPLY_CUSTOM_CSS__) window.__DP_APPLY_CUSTOM_CSS__('');
    }
  });
})();
