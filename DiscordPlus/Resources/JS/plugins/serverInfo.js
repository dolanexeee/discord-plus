/* Discord Plus plugin: Server Info
   A panel with the current server's facts: creation date, member count,
   boost level and channel count.
   Data comes from Discord's own client stores (webpack) where possible:
   GuildStore for the boost level, GuildMemberStore for the member count,
   and the server ID snowflake for the creation date. The channel count
   is read from the sidebar (links to /channels/<guild>/<channel>).
   Tap the ℹ️ button (bottom-right) while a server is open. */
(function () {
  'use strict';

  var panel = null;
  var infoButton = null;

  function closePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
  }

  function openPanel() {
    closePanel();
    var ids = DP.util.channelIdsFromURL();
    if (!ids.guildId) {
      DP.toast('Open a server first to see its info');
      return;
    }
    var name = 'Server';
    var boostLevel = null;
    var memberCount = null;
    try {
      var guildStore = DP.webpack.guildStore();
      if (guildStore && typeof guildStore.getGuild === 'function') {
        var guild = guildStore.getGuild(ids.guildId);
        if (guild) {
          if (guild.name) name = guild.name;
          if (typeof guild.premiumTier !== 'undefined') boostLevel = guild.premiumTier;
          if (guild.memberCount) memberCount = guild.memberCount;
        }
      }
    } catch (e) {}
    if (memberCount == null) {
      try {
        var memberStore = DP.webpack.guildMemberStore();
        if (memberStore && typeof memberStore.getMemberCount === 'function') {
          memberCount = memberStore.getMemberCount(ids.guildId);
        }
      } catch (e) {}
    }
    if (memberCount == null) {
      memberCount = document.querySelectorAll('[data-list-item-id^="members-"]').length || null;
    }
    var channelLinks = document.querySelectorAll('a[href^="/channels/' + ids.guildId + '/"]');
    var channelCount = channelLinks.length || null;
    var created = DP.util.snowflakeDate(ids.guildId);

    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;inset:20vh 8vw;z-index:100001;background:#111214;border:1px solid #4f545c;border-radius:10px;color:#dbdee1;font:14px -apple-system,sans-serif;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.7);';
    var row = function (label, value) {
      return '<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #2b2d31;">' +
        '<span style="color:#b5bac1">' + label + '</span><b>' + value + '</b></div>';
    };
    var html = '<b style="font-size:16px">ℹ️ ' + name.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</b>';
    if (created) html += row('Created', created.toLocaleDateString() + ' (' + created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ')');
    html += row('Server ID', ids.guildId);
    html += row('Members', memberCount != null ? String(memberCount) : 'unknown');
    html += row('Boost level', boostLevel != null ? 'Level ' + boostLevel : 'unknown');
    html += row('Channels', channelCount != null ? String(channelCount) : 'unknown');
    panel.innerHTML = html;
    var close = document.createElement('button');
    close.textContent = 'Close / إغلاق';
    close.style.cssText = 'background:#4f545c;color:#fff;border:0;border-radius:6px;padding:8px 16px;margin-top:14px;';
    close.addEventListener('click', closePanel);
    panel.appendChild(close);
    document.body.appendChild(panel);
  }

  DP.registerPlugin({
    id: 'serverInfo',
    name: 'Server Info',
    version: '1.1.0',
    start: function () {
      infoButton = document.createElement('button');
      infoButton.textContent = 'ℹ️';
      infoButton.title = 'Server Info';
      infoButton.style.cssText = 'position:fixed;right:12px;bottom:168px;z-index:99990;width:44px;height:44px;border-radius:50%;background:#1e1f22;color:#fff;border:1px solid #4f545c;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.5);';
      infoButton.addEventListener('click', openPanel);
      document.body.appendChild(infoButton);
      this._btn = infoButton;
    },
    stop: function () {
      if (this._btn && this._btn.parentNode) this._btn.parentNode.removeChild(this._btn);
      closePanel();
    }
  });
})();
