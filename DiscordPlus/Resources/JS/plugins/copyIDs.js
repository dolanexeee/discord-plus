/* Discord Plus plugin: Copy IDs
   Long-press (context menu) on a message, user, server or channel to copy
   its ID. DOM detection is best-effort with several fallbacks, because
   Discord's web DOM changes between releases. */
(function () {
  'use strict';

  function findMessageId(el) {
    var node = el.closest ? el.closest('[id^="chat-messages-"]') : null;
    if (node && node.id) return node.id.replace('chat-messages-', '');
    return null;
  }

  function findUserId(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.getAttribute) {
        var direct = node.getAttribute('data-user-id');
        if (direct) return direct;
        var listId = node.getAttribute('data-list-item-id');
        if (listId && listId.indexOf('members-') === 0) return listId.replace('members-', '');
        if (node.querySelector) {
          var img = node.querySelector('img[src*="/avatars/"]');
          if (img) {
            var m = img.src.match(/\/avatars\/(\d+)\//);
            if (m) return m[1];
          }
        }
      }
      node = node.parentElement;
    }
    return null;
  }

  function collectIds(target) {
    var ids = {};
    var urlIds = DP.util.channelIdsFromURL();
    if (urlIds.guildId) ids.guildId = urlIds.guildId;
    if (urlIds.channelId) ids.channelId = urlIds.channelId;
    var messageId = findMessageId(target);
    if (messageId) ids.messageId = messageId;
    var userId = findUserId(target);
    if (userId) ids.userId = userId;
    return ids;
  }

  var menuEl = null;

  function hideMenu() {
    if (menuEl && menuEl.parentNode) menuEl.parentNode.removeChild(menuEl);
    menuEl = null;
    document.removeEventListener('click', hideMenu, true);
  }

  function showMenu(x, y, ids) {
    hideMenu();
    menuEl = document.createElement('div');
    menuEl.style.cssText = 'position:fixed;z-index:99999;left:' + x + 'px;top:' + y + 'px;background:#111214;border:1px solid #4f545c;border-radius:8px;padding:8px;min-width:230px;box-shadow:0 8px 24px rgba(0,0,0,.6);color:#dbdee1;font:13px -apple-system,sans-serif;';
    var rows = [
      ['Message ID', ids.messageId],
      ['User ID', ids.userId],
      ['Channel ID', ids.channelId],
      ['Server ID', ids.guildId]
    ];
    rows.forEach(function (row) {
      if (!row[1]) return;
      var line = document.createElement('div');
      line.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 4px;';
      var label = document.createElement('span');
      label.textContent = row[0] + ': ' + row[1];
      label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      var btn = document.createElement('button');
      btn.textContent = 'Copy';
      btn.style.cssText = 'background:#5865f2;color:#fff;border:0;border-radius:4px;padding:4px 8px;cursor:pointer;flex-shrink:0;';
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        DP.util.copyText(row[1]).then(function () { DP.toast('Copied ' + row[0]); });
        hideMenu();
      });
      line.appendChild(label);
      line.appendChild(btn);
      menuEl.appendChild(line);
    });
    if (!menuEl.children.length) return;
    document.body.appendChild(menuEl);
    var rect = menuEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) menuEl.style.left = Math.max(8, window.innerWidth - rect.width - 8) + 'px';
    if (rect.bottom > window.innerHeight) menuEl.style.top = Math.max(8, window.innerHeight - rect.height - 8) + 'px';
    setTimeout(function () { document.addEventListener('click', hideMenu, true); }, 0);
  }

  DP.registerPlugin({
    id: 'copyIDs',
    name: 'Copy IDs',
    version: '1.0.0',
    start: function () {
      var self = this;
      self._handler = function (e) {
        var ids = collectIds(e.target);
        if (!ids.messageId && !ids.userId && !ids.channelId && !ids.guildId) return;
        e.preventDefault();
        e.stopPropagation();
        showMenu(e.clientX, e.clientY, ids);
      };
      document.addEventListener('contextmenu', self._handler, true);
    },
    stop: function () {
      if (this._handler) document.removeEventListener('contextmenu', this._handler, true);
      hideMenu();
    }
  });
})();
