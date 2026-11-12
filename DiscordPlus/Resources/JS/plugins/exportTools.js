/* Discord Plus plugin: Export Tools
   Export what is currently loaded on screen to a file:
   - Channel messages (text or JSON) — the messages Discord has loaded in
     the open channel. Only loaded messages are exported; scroll up to load
     more history first.
   - Server member list (CSV) — from the client store, or from the member
     list sidebar as a fallback. Only members the client has loaded are
     included.
   The export opens in a panel with a copy button and a download button.
   (Downloads go through the web view's download handling.) */
(function () {
  'use strict';

  var panel = null;
  var exportButton = null;

  function collectChannelMessages() {
    var out = [];
    document.querySelectorAll('[id^="chat-messages-"]').forEach(function (row) {
      var m = DP.util.extractMessage(row);
      if (m && (m.content || m.authorName)) out.push(m);
    });
    return out;
  }

  function messagesToText(msgs) {
    return msgs.map(function (m) {
      var time = m.timestampISO ? new Date(m.timestampISO).toLocaleString() : '';
      return '[' + time + '] ' + (m.authorName || 'Unknown') + ': ' + (m.content || '');
    }).join('\n');
  }

  function collectMembers() {
    var ids = DP.util.channelIdsFromURL();
    var out = [];
    var seen = {};
    // Primary: client store.
    try {
      var store = DP.webpack.guildMemberStore();
      var userStore = DP.webpack.userStore();
      if (store && typeof store.getMembers === 'function' && ids.guildId) {
        var members = store.getMembers(ids.guildId) || [];
        members.forEach(function (mem) {
          var uid = String(mem.userId || (mem.user && mem.user.id) || '');
          if (!uid || seen[uid]) return;
          seen[uid] = true;
          var user = userStore && typeof userStore.getUser === 'function' ? userStore.getUser(uid) : null;
          out.push({
            userId: uid,
            username: (user && (user.globalName || user.username)) || (mem.user && (mem.user.globalName || mem.user.username)) || '',
            joinedAt: mem.joinedAt || '',
            roles: (mem.roles || []).join(';')
          });
        });
      }
    } catch (e) {}
    // Fallback: member list sidebar.
    if (!out.length) {
      document.querySelectorAll('[data-list-item-id^="members-"]').forEach(function (row) {
        var uid = row.getAttribute('data-list-item-id').replace('members-', '');
        if (seen[uid]) return;
        seen[uid] = true;
        var nameEl = row.querySelector('[class*="name"], [class*="username"]');
        out.push({ userId: uid, username: nameEl ? nameEl.textContent.trim() : '', joinedAt: '', roles: '' });
      });
    }
    return out;
  }

  function showExportPanel(title, filename, content) {
    closePanel();
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;inset:8vh 4vw;z-index:100001;background:#111214;border:1px solid #4f545c;border-radius:10px;color:#dbdee1;font:14px -apple-system,sans-serif;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.7);';
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #2b2d31;';
    var t = document.createElement('b');
    t.textContent = title;
    head.appendChild(t);
    var close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'background:#4f545c;color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:14px;';
    close.addEventListener('click', closePanel);
    head.appendChild(close);
    panel.appendChild(head);
    var area = document.createElement('textarea');
    area.readOnly = true;
    area.value = content;
    area.style.cssText = 'flex:1;margin:12px;padding:10px;background:#1e1f22;color:#dbdee1;border:1px solid #2b2d31;border-radius:8px;font:12px monospace;resize:none;';
    panel.appendChild(area);
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:10px;padding:0 14px 14px;';
    var copy = document.createElement('button');
    copy.textContent = 'Copy / نسخ';
    copy.style.cssText = 'background:#5865f2;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-size:14px;';
    copy.addEventListener('click', function () {
      DP.util.copyText(content).then(function () { DP.toast('Copied'); });
    });
    var dl = document.createElement('button');
    dl.textContent = 'Download / تنزيل';
    dl.style.cssText = 'background:#3ba55d;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-size:14px;';
    dl.addEventListener('click', function () {
      try {
        var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        DP.toast('Download started');
      } catch (e) { DP.toast('Download failed — use Copy'); }
    });
    bar.appendChild(copy);
    bar.appendChild(dl);
    panel.appendChild(bar);
    document.body.appendChild(panel);
  }

  function closePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
  }

  function openMenu() {
    closePanel();
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:12px;bottom:172px;z-index:100001;background:#111214;border:1px solid #4f545c;border-radius:10px;color:#dbdee1;font:14px -apple-system,sans-serif;padding:8px;min-width:260px;box-shadow:0 12px 40px rgba(0,0,0,.7);';
    var items = [
      ['📄 Export channel (text)', function () {
        var msgs = collectChannelMessages();
        if (!msgs.length) { DP.toast('No messages loaded to export'); return; }
        showExportPanel('Channel messages — text (' + msgs.length + ')', 'channel-messages.txt', messagesToText(msgs));
      }],
      ['🧾 Export channel (JSON)', function () {
        var msgs = collectChannelMessages();
        if (!msgs.length) { DP.toast('No messages loaded to export'); return; }
        showExportPanel('Channel messages — JSON (' + msgs.length + ')', 'channel-messages.json', JSON.stringify(msgs, null, 2));
      }],
      ['👥 Export member list (CSV)', function () {
        var members = collectMembers();
        if (!members.length) { DP.toast('No members loaded to export'); return; }
        var csv = 'userId,username,joinedAt,roles\n' + members.map(function (m) {
          var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; };
          return [q(m.userId), q(m.username), q(m.joinedAt), q(m.roles)].join(',');
        }).join('\n');
        showExportPanel('Server members — CSV (' + members.length + ')', 'members.csv', csv);
      }]
    ];
    items.forEach(function (item) {
      var b = document.createElement('button');
      b.textContent = item[0];
      b.style.cssText = 'display:block;width:100%;text-align:left;background:none;border:0;color:#dbdee1;font-size:14px;padding:10px 8px;cursor:pointer;';
      b.addEventListener('click', function () { item[1](); });
      panel.appendChild(b);
    });
    var close = document.createElement('button');
    close.textContent = 'Close / إغلاق';
    close.style.cssText = 'display:block;width:100%;background:#4f545c;color:#fff;border:0;border-radius:6px;padding:8px;margin-top:6px;';
    close.addEventListener('click', closePanel);
    panel.appendChild(close);
    document.body.appendChild(panel);
  }

  DP.registerPlugin({
    id: 'exportTools',
    name: 'Export Tools',
    version: '1.1.0',
    start: function () {
      exportButton = document.createElement('button');
      exportButton.textContent = '⬇️';
      exportButton.title = 'Export Tools';
      exportButton.style.cssText = 'position:fixed;right:12px;bottom:116px;z-index:99990;width:44px;height:44px;border-radius:50%;background:#3ba55d;color:#fff;border:0;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.5);';
      exportButton.addEventListener('click', openMenu);
      document.body.appendChild(exportButton);
      this._btn = exportButton;
    },
    stop: function () {
      if (this._btn && this._btn.parentNode) this._btn.parentNode.removeChild(this._btn);
      closePanel();
    }
  });
})();
