/* Discord Plus plugin: Timeout Countdown
   Shows a live countdown for timed-out members: remaining hours / minutes /
   seconds plus the exact end time — in the member profile and as a small
   badge in the member list.

   HOW IT READS THE TIMEOUT END (most robust route first):
   1. PRIMARY — Discord's own client store (webpack): GuildMemberStore
      .getMember(guildId, userId).communicationDisabledUntil. This is the
      same field Discord itself uses, so it is exact.
   2. FALLBACK — the profile popout's own text ("Timed out until <date>"),
      parsed from the DOM.
   If neither route yields a time, nothing is shown (no invented data). */
(function () {
  'use strict';

  function fmtRemaining(ms) {
    if (ms <= 0) return '0s';
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    if (h > 0) return h + ':' + pad(m) + ':' + pad(sec);
    return pad(m) + ':' + pad(sec);
  }

  function getTimeoutEnd(guildId, userId) {
    // Route 1: client store.
    try {
      var store = DP.webpack.guildMemberStore();
      if (store && typeof store.getMember === 'function') {
        var member = store.getMember(guildId, userId);
        if (member && member.communicationDisabledUntil) {
          var d = new Date(member.communicationDisabledUntil);
          if (!isNaN(d.getTime())) return d;
        }
      }
    } catch (e) {}
    return null;
  }

  function getTimeoutEndFromDOM(popout) {
    // Route 2: the popout's own "Timed out until ..." text.
    try {
      var text = popout.textContent || '';
      var m = text.match(/timed out until\s+([^\n]+)/i);
      if (m) {
        var d = new Date(m[1].trim());
        if (!isNaN(d.getTime())) return d;
      }
      var m2 = text.match(/timed out\s*·\s*([^\n]+)/i);
      if (m2) {
        var d2 = new Date(m2[1].trim());
        if (!isNaN(d2.getTime())) return d2;
      }
    } catch (e) {}
    return null;
  }

  function userIdFrom(el) {
    if (!el) return null;
    var img = el.querySelector ? el.querySelector('img[src*="/avatars/"]') : null;
    if (img) {
      var m = img.src.match(/\/avatars\/(\d+)\//);
      if (m) return m[1];
    }
    var a = el.querySelector ? el.querySelector('a[href*="/users/"]') : null;
    if (a) {
      var m2 = a.getAttribute('href').match(/\/users\/(\d+)/);
      if (m2) return m2[1];
    }
    return null;
  }

  var timers = [];

  function clearTimers() {
    timers.forEach(function (t) { clearInterval(t); });
    timers = [];
  }

  function injectIntoProfile(popout) {
    if (!popout || popout.getAttribute('data-dp-timeout')) return;
    var ids = DP.util.channelIdsFromURL();
    if (!ids.guildId) return;
    var userId = userIdFrom(popout);
    if (!userId) return;
    var end = getTimeoutEnd(ids.guildId, userId) || getTimeoutEndFromDOM(popout);
    if (!end || end.getTime() <= Date.now()) return;
    popout.setAttribute('data-dp-timeout', '1');
    var row = document.createElement('div');
    row.className = 'dp-timeout-row';
    row.style.cssText = 'margin:10px 12px 12px;padding:10px 12px;background:#2b2d31;border:1px solid #ed4245;border-radius:8px;color:#dbdee1;font:14px -apple-system,sans-serif;';
    popout.appendChild(row);
    var tick = function () {
      var left = end.getTime() - Date.now();
      if (left <= 0) {
        row.innerHTML = '<b>⏱ Timeout ended</b>';
        return;
      }
      row.innerHTML = '<b>⏱ Timed out</b><br>' +
        '<span style="font-size:20px;font-weight:700;color:#ed4245">' + fmtRemaining(left) + '</span> left' +
        '<br><span style="color:#b5bac1;font-size:12px">Ends ' + end.toLocaleString() + '</span>';
    };
    tick();
    timers.push(setInterval(tick, 1000));
  }

  function badgeMemberList() {
    var ids = DP.util.channelIdsFromURL();
    if (!ids.guildId) return;
    var store = null;
    try { store = DP.webpack.guildMemberStore(); } catch (e) {}
    if (!store || typeof store.getMember !== 'function') return;
    document.querySelectorAll('[data-list-item-id^="members-"]').forEach(function (row) {
      var listId = row.getAttribute('data-list-item-id');
      var userId = listId.replace('members-', '');
      if (row.querySelector('.dp-timeout-badge')) return;
      var member = null;
      try { member = store.getMember(ids.guildId, userId); } catch (e) {}
      if (!member || !member.communicationDisabledUntil) return;
      var end = new Date(member.communicationDisabledUntil);
      if (isNaN(end.getTime()) || end.getTime() <= Date.now()) return;
      var badge = document.createElement('span');
      badge.className = 'dp-timeout-badge';
      badge.title = 'Timed out until ' + end.toLocaleString();
      badge.style.cssText = 'color:#ed4245;font-size:11px;font-weight:700;margin-left:4px;';
      badge.textContent = '⏱ ' + fmtRemaining(end.getTime() - Date.now());
      var nameEl = row.querySelector('[class*="name"], [class*="username"]');
      if (nameEl) nameEl.appendChild(badge);
      timers.push(setInterval(function () {
        var left = end.getTime() - Date.now();
        if (left <= 0) { if (badge.parentNode) badge.parentNode.removeChild(badge); return; }
        badge.textContent = '⏱ ' + fmtRemaining(left);
      }, 30000));
    });
  }

  DP.registerPlugin({
    id: 'timeoutCountdown',
    name: 'Timeout Countdown',
    version: '1.1.0',
    start: function () {
      var self = this;
      var scanProfiles = function (root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('[class*="userPopout"], [class*="userProfileModal"]').forEach(function (p) {
          injectIntoProfile(p);
        });
      };
      scanProfiles(document);
      self._obs = DP.util.observe(document.body, function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType === 1) scanProfiles(n);
          });
        });
      });
      self._listTimer = setInterval(badgeMemberList, 30000);
      badgeMemberList();
    },
    stop: function () {
      if (this._obs) this._obs.disconnect();
      if (this._listTimer) clearInterval(this._listTimer);
      clearTimers();
      document.querySelectorAll('.dp-timeout-row, .dp-timeout-badge').forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      document.querySelectorAll('[data-dp-timeout]').forEach(function (el) {
        el.removeAttribute('data-dp-timeout');
      });
    }
  });
})();
