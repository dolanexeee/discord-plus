/* Discord Plus loader — defines the window.DP plugin API and the
   native bridge helpers. All code in this file is original, written for
   Discord Plus. The plugin pattern (loader + registerPlugin + start/stop)
   follows the same idea as Vencord/Kettu, but this is our own code. */
(function () {
  'use strict';
  if (window.DP) return;

  function callNative(message) {
    try {
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.discordPlus) {
        window.webkit.messageHandlers.discordPlus.postMessage(message);
      }
    } catch (e) { /* bridge unavailable */ }
  }

  var callbacks = {};
  var callbackId = 0;

  var DP = window.DP = {
    version: '1.0.0',
    plugins: {},
    settings: window.__DP_SETTINGS__ || {},

    log: function () {
      var args = Array.prototype.slice.call(arguments);
      try { console.log.apply(console, ['[DP]'].concat(args)); } catch (e) {}
      callNative({ type: 'log', message: args.map(String).join(' ') });
    },

    toast: function (message) {
      callNative({ type: 'toast', message: String(message) });
    },

    openExternal: function (url) {
      callNative({ type: 'openExternal', url: String(url) });
    },

    storage: {
      get: function (key) {
        return new Promise(function (resolve) {
          var id = ++callbackId;
          callbacks[id] = resolve;
          callNative({ type: 'storage', action: 'get', key: String(key), id: id });
        });
      },
      set: function (key, value) {
        callNative({ type: 'storage', action: 'set', key: String(key), value: value });
      }
    },

    util: {
      when: function (predicate, callback, timeoutMs) {
        var timeout = timeoutMs || 15000;
        var start = Date.now();
        var timer = setInterval(function () {
          var result = null;
          try { result = predicate(); } catch (e) { result = null; }
          if (result) { clearInterval(timer); callback(result); }
          else if (Date.now() - start > timeout) { clearInterval(timer); }
        }, 250);
      },

      observe: function (target, callback, options) {
        var obs = new MutationObserver(function (mutations) { callback(mutations); });
        obs.observe(target, options || { childList: true, subtree: true });
        return obs;
      },

      copyText: function (text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
        }
        fallbackCopy(text);
        return Promise.resolve();
        function fallbackCopy(t) {
          var ta = document.createElement('textarea');
          ta.value = t;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta);
        }
      },

      channelIdsFromURL: function () {
        var m = window.location.pathname.match(/^\/channels\/([^\/]+)\/([^\/]+)/);
        if (!m) return { guildId: null, channelId: null };
        return { guildId: m[1] === '@me' ? null : m[1], channelId: m[2] };
      }
    },

    registerPlugin: function (def) {
      if (!def || !def.id || typeof def.start !== 'function') {
        this.log('Invalid plugin definition', def && def.id);
        return;
      }
      this.plugins[def.id] = def;
    },

    isPluginEnabled: function (id) {
      var entry = this.settings && this.settings.plugins && this.settings.plugins[id];
      return !!(entry && entry.enabled);
    },

    pluginOption: function (pluginId, optionId, fallback) {
      var entry = this.settings && this.settings.plugins && this.settings.plugins[pluginId];
      if (entry && entry.options && typeof entry.options[optionId] !== 'undefined') return entry.options[optionId];
      return fallback;
    },

    startAll: function () {
      var self = this;
      Object.keys(this.plugins).forEach(function (id) {
        var def = self.plugins[id];
        if (self.isPluginEnabled(id)) {
          try { def.start(); self.log('Started plugin:', id); }
          catch (e) { self.log('Failed to start plugin ' + id + ':', e && e.message); }
        }
      });
    },

    stopAll: function () {
      var self = this;
      Object.keys(this.plugins).forEach(function (id) {
        var def = self.plugins[id];
        if (def.stop) { try { def.stop(); } catch (e) {} }
      });
    }
  };

  window.__DP_BRIDGE_REPLY__ = function (id, value) {
    var cb = callbacks[id];
    if (cb) { delete callbacks[id]; try { cb(value); } catch (e) {} }
  };

  window.__DP_APPLY_THEME__ = function (css) {
    try {
      var el = document.getElementById('dp-theme');
      if (!el) {
        el = document.createElement('style');
        el.id = 'dp-theme';
        el.setAttribute('data-dp', 'theme');
        document.head.appendChild(el);
      }
      el.textContent = css || '';
    } catch (e) {}
  };

  window.__DP_APPLY_CUSTOM_CSS__ = function (css) {
    try {
      var el = document.getElementById('dp-custom-css');
      if (!el) {
        el = document.createElement('style');
        el.id = 'dp-custom-css';
        el.setAttribute('data-dp', 'custom-css');
        document.head.appendChild(el);
      }
      el.textContent = css || '';
    } catch (e) {}
  };

  DP.log('Discord Plus loader ready, version ' + DP.version);
})();
