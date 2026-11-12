/* Discord Plus plugin: Silent Typing
   Two options (both on by default):
   - "Don't send my typing" — stops the client telling others you are
     typing. Discord sends this as a REST POST to .../channels/<id>/typing
     whenever you type in the message box; this plugin drops those
     requests (fetch + XMLHttpRequest) before they leave the device.
   - "Hide others' typing" — hides the "X is typing…" indicator bar.
   Nothing is sent anywhere by this plugin; it only blocks or hides
   typing traffic locally. */
(function () {
  'use strict';

  var origFetch = null;
  var origXhrOpen = null;
  var origXhrSend = null;
  var styleEl = null;

  function isTypingRequest(url, method) {
    if (!url) return false;
    var u = String(url);
    return /\/api\/v\d+\/channels\/\d+\/typing/.test(u) &&
      (!method || String(method).toUpperCase() === 'POST');
  }

  function blockOutgoing() {
    if (origFetch) return; // already patched
    if (window.fetch) {
      origFetch = window.fetch;
      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var method = (init && init.method) || (input && input.method) || 'GET';
        if (isTypingRequest(url, method)) {
          return Promise.resolve(new Response(null, { status: 204, statusText: 'No Content' }));
        }
        return origFetch.apply(this, arguments);
      };
    }
    if (window.XMLHttpRequest) {
      origXhrOpen = XMLHttpRequest.prototype.open;
      origXhrSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        this.__dpTyping = isTypingRequest(url, method);
        return origXhrOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function () {
        if (this.__dpTyping) {
          var self = this;
          setTimeout(function () {
            try { self.dispatchEvent(new Event('load')); } catch (e) {}
            if (typeof self.onload === 'function') { try { self.onload(); } catch (e) {} }
          }, 0);
          return;
        }
        return origXhrSend.apply(this, arguments);
      };
    }
  }

  function unblockOutgoing() {
    if (origFetch) { window.fetch = origFetch; origFetch = null; }
    if (origXhrOpen) { XMLHttpRequest.prototype.open = origXhrOpen; origXhrOpen = null; }
    if (origXhrSend) { XMLHttpRequest.prototype.send = origXhrSend; origXhrSend = null; }
  }

  function hideIncoming() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = 'dp-silent-typing';
    styleEl.setAttribute('data-dp', 'silent-typing');
    styleEl.textContent = '[class*="typingIndicator"], [class*="typing__"] { display: none !important; }';
    document.head.appendChild(styleEl);
  }

  function showIncoming() {
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    styleEl = null;
  }

  function apply() {
    if (DP.pluginOption('silentTyping', 'blockOutgoing', true)) blockOutgoing();
    else unblockOutgoing();
    if (DP.pluginOption('silentTyping', 'hideIncoming', true)) hideIncoming();
    else showIncoming();
  }

  DP.registerPlugin({
    id: 'silentTyping',
    name: 'Silent Typing',
    version: '1.1.0',
    start: function () {
      apply();
    },
    stop: function () {
      unblockOutgoing();
      showIncoming();
    }
  });
})();
