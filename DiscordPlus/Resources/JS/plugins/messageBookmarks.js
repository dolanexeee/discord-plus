/* Discord Plus plugin: Message Bookmarks
   Save messages locally and read them later in a saved-messages list.
   Trigger: long-press a message, then "Bookmark" in the menu (the menu is
   hosted by the Copy IDs plugin, which owns the long-press gesture).
   Tap the 🔖 button (bottom-right) to open the saved list: jump to the
   message, delete one bookmark, or clear all.
   Bookmarks are stored on the device only (localStorage) — never sent
   anywhere. */
(function () {
  'use strict';

  var STORE_KEY = 'dp_bookmarks_v1';
  var MAX_BOOKMARKS = 500;

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function save(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_BOOKMARKS))); } catch (e) {}
  }

  function isBookmarked(id) {
    return load().some(function (b) { return b.id === id; });
  }

  function toggleBookmark(m) {
    var list = load();
    var idx = -1;
    list.forEach(function (b, i) { if (b.id === m.id) idx = i; });
    if (idx >= 0) {
      list.splice(idx, 1);
      save(list);
      DP.toast('Bookmark removed');
      return false;
    }
    list.unshift({
      id: m.id,
      channelId: m.channelId || '',
      guildId: m.guildId || '',
      authorName: m.authorName || '',
      authorId: m.authorId || '',
      content: m.content || '',
      timestampISO: m.timestampISO || '',
      savedAt: Date.now()
    });
    save(list);
    DP.toast('Bookmarked 🔖');
    return true;
  }

  var panel = null;
  var bmButton = null;

  function closePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
  }

  function jumpTo(b) {
    if (!b.channelId) { DP.toast('Channel unknown for this bookmark'); return; }
    var path = '/channels/' + (b.guildId || '@me') + '/' + b.channelId + (b.id ? '/' + b.id : '');
    try {
      history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      closePanel();
    } catch (e) {
      DP.toast('Could not jump to the message');
    }
  }

  function openPanel() {
    closePanel();
    var list = load();
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;inset:8vh 4vw;z-index:100001;background:#111214;border:1px solid #4f545c;border-radius:10px;color:#dbdee1;font:14px -apple-system,sans-serif;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.7);';
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #2b2d31;';
    var t = document.createElement('b');
    t.textContent = '🔖 Bookmarks (' + list.length + ')';
    head.appendChild(t);
    var close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'background:#4f545c;color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:14px;';
    close.addEventListener('click', closePanel);
    head.appendChild(close);
    panel.appendChild(head);
    var body = document.createElement('div');
    body.style.cssText = 'overflow:auto;padding:10px 14px;';
    if (!list.length) {
      body.innerHTML = '<p style="color:#b5bac1">No bookmarks yet. Long-press a message and choose Bookmark.</p>';
    } else {
      list.forEach(function (b) {
        var div = document.createElement('div');
        div.style.cssText = 'border-bottom:1px solid #2b2d31;padding:10px 0;';
        var meta = document.createElement('div');
        meta.style.cssText = 'font-size:12px;color:#b5bac1;margin-bottom:4px;';
        meta.textContent = (b.authorName || 'Unknown') + ' · ' + (b.timestampISO ? new Date(b.timestampISO).toLocaleString() : '');
        div.appendChild(meta);
        var c = document.createElement('div');
        c.style.cssText = 'white-space:pre-wrap;word-break:break-word;';
        c.textContent = b.content || '(no text — attachment / embed)';
        div.appendChild(c);
        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
        var jump = document.createElement('button');
        jump.textContent = 'Jump to message';
        jump.style.cssText = 'background:#5865f2;color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:12px;';
        jump.addEventListener('click', function () { jumpTo(b); });
        var del = document.createElement('button');
        del.textContent = 'Delete';
        del.style.cssText = 'background:#4f545c;color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:12px;';
        del.addEventListener('click', function () {
          var l = load().filter(function (x) { return x.id !== b.id; });
          save(l);
          openPanel();
        });
        bar.appendChild(jump);
        bar.appendChild(del);
        div.appendChild(bar);
        body.appendChild(div);
      });
      var clear = document.createElement('button');
      clear.textContent = 'Clear all bookmarks';
      clear.style.cssText = 'background:#ed4245;color:#fff;border:0;border-radius:6px;padding:8px 16px;margin:12px 0 4px;';
      clear.addEventListener('click', function () { save([]); openPanel(); });
      body.appendChild(clear);
    }
    panel.appendChild(body);
    document.body.appendChild(panel);
  }

  DP.registerPlugin({
    id: 'messageBookmarks',
    name: 'Message Bookmarks',
    version: '1.1.0',

    bookmarkMessage: function (targetEl) {
      var m = DP.util.extractMessage(targetEl);
      if (!m || !m.id) { DP.toast('Could not find the message'); return; }
      var ids = DP.util.channelIdsFromURL();
      m.channelId = ids.channelId;
      m.guildId = ids.guildId;
      toggleBookmark(m);
    },

    isBookmarked: function (id) {
      return isBookmarked(id);
    },

    start: function () {
      bmButton = document.createElement('button');
      bmButton.textContent = '🔖';
      bmButton.title = 'Bookmarks';
      bmButton.style.cssText = 'position:fixed;right:12px;bottom:64px;z-index:99990;width:44px;height:44px;border-radius:50%;background:#5865f2;color:#fff;border:0;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.5);';
      bmButton.addEventListener('click', openPanel);
      document.body.appendChild(bmButton);
      this._btn = bmButton;
    },
    stop: function () {
      if (this._btn && this._btn.parentNode) this._btn.parentNode.removeChild(this._btn);
      closePanel();
    }
  });
})();
