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
    version: '1.1.0',
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
      },

      snowflakeDate: function (id) {
        // Discord snowflake -> creation date (ms since epoch).
        try {
          var n = BigInt(id);
          return new Date(Number((n >> 22n) + 1420070400000n));
        } catch (e) { return null; }
      },

      extractMessage: function (el) {
        // Pull {id, authorName, authorId, content, timestampISO} out of a
        // message row node. Best-effort: selectors change between Discord
        // releases, so every field has a fallback.
        if (!el) return null;
        var row = el.closest ? (el.closest('[id^="chat-messages-"]') || el) : el;
        var id = null;
        if (row.id && row.id.indexOf('chat-messages-') === 0) id = row.id.replace('chat-messages-', '');
        var contentEl = row.querySelector ? row.querySelector('[id^="message-content-"]') : null;
        var content = contentEl ? contentEl.innerText : '';
        var authorName = '';
        var authorId = null;
        var header = row.querySelector ? row.querySelector('[class*="header"]') : null;
        if (header) {
          var nameEl = header.querySelector('[class*="username"]');
          if (nameEl) authorName = nameEl.textContent.trim();
        }
        if (row.querySelector) {
          var img = row.querySelector('img[src*="/avatars/"]');
          if (img) {
            var m = img.src.match(/\/avatars\/(\d+)\//);
            if (m) authorId = m[1];
          }
        }
        var timestampISO = null;
        var timeEl = row.querySelector ? row.querySelector('time[datetime]') : null;
        if (timeEl) timestampISO = timeEl.getAttribute('datetime');
        if (!id && !content) return null;
        return { id: id, authorName: authorName, authorId: authorId, content: content, timestampISO: timestampISO };
      }
    },

    /* Webpack store access for the Discord web client.
       The client ships as webpack chunks on window.webpackChunkdiscord_app;
       pushing a fake chunk entry gives us the require function and its
       module cache, so plugins can read the same stores Discord itself
       uses (GuildMemberStore, UserStore, GuildStore, RoleStore...).
       This is the same technique Vencord uses; it reads local client
       state only — no network, no token access. */
    webpack: (function () {
      var req = null;
      function getRequire() {
        if (req) return req;
        var chunk = window.webpackChunkdiscord_app;
        if (!chunk || typeof chunk.push !== 'function') return null;
        try {
          chunk.push([['dp-finder'], {}, function (r) { req = r; }]);
        } catch (e) { return null; }
        return req;
      }
      function allExports() {
        var r = getRequire();
        if (!r || !r.c) return [];
        var out = [];
        Object.keys(r.c).forEach(function (id) {
          try {
            var m = r.c[id];
            if (m && m.exports) out.push(m.exports);
          } catch (e) {}
        });
        return out;
      }
      function candidateExports(m) {
        // Discord modules often wrap the real object in .default / .Z / .ZP.
        var out = [m];
        if (m && typeof m === 'object') {
          if (m.default) out.push(m.default);
          if (m.Z) out.push(m.Z);
          if (m.ZP) out.push(m.ZP);
        }
        return out;
      }
      function hasProps(obj) {
        var props = Array.prototype.slice.call(arguments, 1);
        if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return false;
        for (var i = 0; i < props.length; i++) {
          if (!(props[i] in obj)) return false;
        }
        return true;
      }
      return {
        ready: function () { return !!window.webpackChunkdiscord_app; },
        findByProps: function () {
          var props = Array.prototype.slice.call(arguments);
          var mods = allExports();
          for (var i = 0; i < mods.length; i++) {
            var cands = candidateExports(mods[i]);
            for (var j = 0; j < cands.length; j++) {
              if (hasProps.apply(null, [cands[j]].concat(props))) return cands[j];
            }
          }
          return null;
        },
        /* Convenience lookups for the stores plugins need. */
        guildMemberStore: function () {
          return this.findByProps('getMember', 'getMemberCount');
        },
        userStore: function () {
          return this.findByProps('getCurrentUser', 'getUser');
        },
        guildStore: function () {
          return this.findByProps('getGuild', 'getGuilds');
        },
        roleStore: function () {
          return this.findByProps('getRoles', 'getRole');
        },
        channelStore: function () {
          return this.findByProps('getChannel', 'getDMFromUserId');
        }
      };
    })(),

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
