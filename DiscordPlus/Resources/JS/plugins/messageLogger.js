/* Discord Plus plugin: MessageLogger
   Keeps messages that arrive while the logger is running, so you can still
   read them after they are deleted or edited.
   - Subscribes to Discord's own Flux dispatcher (MESSAGE_CREATE /
     MESSAGE_UPDATE / MESSAGE_DELETE) via the webpack stores — the same
     technique Vencord uses. Falls back to DOM observation if the
     dispatcher cannot be found.
   - Deleted messages stay visible in place (marked "deleted") and are
     also listed in the log panel (tap the 📜 button, bottom-right).
   - Edit history is kept: an "edited (n)" badge on edited messages opens
     the previous versions.

   HONEST LIMIT: the logger can only show messages that arrived while it
   was running. It CANNOT recover messages deleted before the app was
   installed, before the plugin was enabled, or while the app was closed.
   Messages deleted by a ban purge are kept only if they were seen first. */
(function () {
  'use strict';

  var STORE_KEY = 'dp_msglog_v1';
  var MAX_ENTRIES = 1000;

  function loadLog() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveLog(log) {
    try {
      var ids = Object.keys(log);
      if (ids.length > MAX_ENTRIES) {
        ids.sort(function (a, b) { return (log[a].ts || 0) - (log[b].ts || 0); });
        for (var i = 0; i < ids.length - MAX_ENTRIES; i++) delete log[ids[i]];
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(log));
    } catch (e) {}
  }

  var log = loadLog();

  function record(msg) {
    if (!msg || !msg.id) return;
    var existing = log[msg.id];
    var author = msg.author || {};
    var entry = existing || {
      id: String(msg.id),
      channelId: String(msg.channel_id || msg.channelId || ''),
      guildId: String(msg.guild_id || msg.guildId || ''),
      authorId: String(author.id || ''),
      authorName: author.global_name || author.username || '',
      content: msg.content || '',
      ts: msg.timestamp ? Date.parse(msg.timestamp) : Date.now(),
      edited: [],
      deleted: false
    };
    entry.content = msg.content || entry.content;
    log[msg.id] = entry;
    saveLog(log);
    return entry;
  }

  function markEdited(msg) {
    if (!DP.pluginOption('messageLogger', 'keepEdits', true)) return;
    var entry = log[msg.id];
    if (!entry) { record(msg); return; }
    var newContent = msg.content || '';
    if (newContent !== entry.content) {
      entry.edited.push({ content: entry.content, at: Date.now() });
      entry.content = newContent;
      saveLog(log);
      renderEditBadge(msg.id, entry);
    }
  }

  function markDeleted(id) {
    var entry = log[id];
    if (!entry) return;
    entry.deleted = true;
    saveLog(log);
    if (DP.pluginOption('messageLogger', 'showDeleted', true)) renderDeleted(id, entry);
  }

  /* --- in-place rendering ---------------------------------------------- */

  function rowFor(id) {
    return document.getElementById('chat-messages-' + id);
  }

  function badge(text, title) {
    var b = document.createElement('span');
    b.className = 'dp-ml-badge';
    b.textContent = text;
    if (title) b.title = title;
    b.style.cssText = 'display:inline-block;background:#ed4245;color:#fff;border-radius:4px;padding:1px 6px;margin-left:6px;font-size:11px;font-weight:700;cursor:default;';
    return b;
  }

  function renderDeleted(id, entry) {
    var row = rowFor(id);
    if (!row || row.getAttribute('data-dp-deleted')) return;
    row.setAttribute('data-dp-deleted', '1');
    row.style.opacity = '0.75';
    row.style.borderLeft = '3px solid #ed4245';
    row.style.paddingLeft = '6px';
    var header = row.querySelector('[class*="header"]');
    if (header) {
      var time = entry.ts ? new Date(entry.ts).toLocaleTimeString() : '';
      header.appendChild(badge('🗑 Deleted · ' + time, 'Deleted message — kept by Discord Plus'));
    }
  }

  function renderEditBadge(id, entry) {
    var row = rowFor(id);
    if (!row || row.querySelector('.dp-ml-edit-badge')) return;
    var header = row.querySelector('[class*="header"]');
    if (!header) return;
    var b = badge('✏️ edited (' + entry.edited.length + ')', 'Tap to see previous versions');
    b.className = 'dp-ml-badge dp-ml-edit-badge';
    b.style.background = '#faa81a';
    b.style.cursor = 'pointer';
    b.addEventListener('click', function () { showEditHistory(entry); });
    header.appendChild(b);
  }

  /* --- log panel -------------------------------------------------------- */

  var panel = null;

  function openPanel() {
    closePanel();
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;inset:8vh 4vw;z-index:100001;background:#111214;border:1px solid #4f545c;border-radius:10px;color:#dbdee1;font:14px -apple-system,sans-serif;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.7);';
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #2b2d31;';
    head.innerHTML = '<b>📜 Message Log — deleted &amp; edited</b><span style="color:#b5bac1;font-size:12px">only messages seen while the logger was running</span>';
    var close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'background:#4f545c;color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:14px;';
    close.addEventListener('click', closePanel);
    head.appendChild(close);
    panel.appendChild(head);
    var body = document.createElement('div');
    body.style.cssText = 'overflow:auto;padding:10px 14px;';
    var entries = Object.keys(log).map(function (k) { return log[k]; })
      .filter(function (e) { return e.deleted || e.edited.length; })
      .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    if (!entries.length) {
      body.innerHTML = '<p style="color:#b5bac1">No deleted or edited messages logged yet.</p>';
    } else {
      entries.forEach(function (e) {
        var div = document.createElement('div');
        div.style.cssText = 'border-bottom:1px solid #2b2d31;padding:10px 0;';
        var meta = document.createElement('div');
        meta.style.cssText = 'font-size:12px;color:#b5bac1;margin-bottom:4px;';
        meta.textContent = (e.deleted ? '🗑 Deleted' : '✏️ Edited') + ' · ' + (e.authorName || 'Unknown') + ' · ' + (e.ts ? new Date(e.ts).toLocaleString() : '');
        div.appendChild(meta);
        var c = document.createElement('div');
        c.style.cssText = 'white-space:pre-wrap;word-break:break-word;';
        c.textContent = e.content || '(no text — attachment / embed)';
        div.appendChild(c);
        e.edited.forEach(function (ed) {
          var old = document.createElement('div');
          old.style.cssText = 'white-space:pre-wrap;word-break:break-word;color:#faa81a;font-size:13px;margin-top:4px;';
          old.textContent = 'Previous: ' + ed.content;
          div.appendChild(old);
        });
        body.appendChild(div);
      });
    }
    panel.appendChild(body);
    document.body.appendChild(panel);
  }

  function closePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
  }

  function showEditHistory(entry) {
    closePanel();
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;inset:20vh 8vw;z-index:100001;background:#111214;border:1px solid #4f545c;border-radius:10px;color:#dbdee1;font:14px -apple-system,sans-serif;padding:14px;overflow:auto;box-shadow:0 12px 40px rgba(0,0,0,.7);';
    var html = '<b>Edit history — ' + (entry.authorName || 'Unknown') + '</b><br><br>';
    entry.edited.forEach(function (ed, i) {
      html += '<div style="color:#faa81a;margin-bottom:8px">v' + (i + 1) + ': ' + escapeHtml(ed.content) + '</div>';
    });
    html += '<div><b>Current:</b> ' + escapeHtml(entry.content) + '</div>';
    panel.innerHTML = html;
    var close = document.createElement('button');
    close.textContent = 'Close';
    close.style.cssText = 'background:#4f545c;color:#fff;border:0;border-radius:6px;padding:8px 16px;margin-top:12px;';
    close.addEventListener('click', closePanel);
    panel.appendChild(close);
    document.body.appendChild(panel);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* --- capture ---------------------------------------------------------- */

  var unsubscribes = [];
  var logButton = null;

  function subscribeDispatcher() {
    var dispatcher = null;
    try { dispatcher = DP.webpack.findByProps('dispatch', 'subscribe'); } catch (e) {}
    if (!dispatcher || typeof dispatcher.subscribe !== 'function') return false;
    try {
      unsubscribes.push(dispatcher.subscribe('MESSAGE_CREATE', function (a) {
        try { if (a && a.message) record(a.message); } catch (e) {}
      }));
      unsubscribes.push(dispatcher.subscribe('MESSAGE_UPDATE', function (a) {
        try { if (a && a.message) markEdited(a.message); } catch (e) {}
      }));
      unsubscribes.push(dispatcher.subscribe('MESSAGE_DELETE', function (a) {
        try { if (a && a.id) markDeleted(String(a.id)); } catch (e) {}
      }));
      return true;
    } catch (e) { return false; }
  }

  function domFallback() {
    // Best-effort only: record messages as they appear in the DOM and watch
    // for removed rows. Note: Discord unmounts off-screen rows while
    // scrolling, so this fallback can misread scrolling as deletion.
    var scan = function (root) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll('[id^="chat-messages-"]').forEach(function (row) {
        var m = DP.util.extractMessage(row);
        if (m && m.id) record({ id: m.id, author: { username: m.authorName, id: m.authorId }, content: m.content, timestamp: m.timestampISO });
      });
    };
    scan(document);
    DP.util.observe(document.body, function (mutations) {
      mutations.forEach(function (mut) {
        mut.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); });
        mut.removedNodes.forEach(function (n) {
          if (n.nodeType === 1 && n.id && n.id.indexOf('chat-messages-') === 0) {
            var id = n.id.replace('chat-messages-', '');
            if (log[id] && !n.getAttribute('data-dp-deleted')) markDeleted(id);
          }
        });
      });
    });
  }

  DP.registerPlugin({
    id: 'messageLogger',
    name: 'Message Logger',
    version: '1.1.0',
    start: function () {
      var self = this;
      // Give the web client a moment to boot its webpack runtime.
      DP.util.when(function () { return DP.webpack.ready(); }, function () {
        if (!subscribeDispatcher()) domFallback();
      }, 20000);
      logButton = document.createElement('button');
      logButton.textContent = '📜';
      logButton.title = 'Message Log (deleted & edited)';
      logButton.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99990;width:44px;height:44px;border-radius:50%;background:#5865f2;color:#fff;border:0;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.5);';
      logButton.addEventListener('click', openPanel);
      document.body.appendChild(logButton);
      self._logButton = logButton;
    },
    stop: function () {
      unsubscribes.forEach(function (u) { try { if (typeof u === 'function') u(); } catch (e) {} });
      unsubscribes = [];
      if (this._logButton && this._logButton.parentNode) this._logButton.parentNode.removeChild(this._logButton);
      closePanel();
    }
  });
})();
