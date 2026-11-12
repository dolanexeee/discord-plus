/* Discord Plus plugin: Member Details
   Adds account details to user profiles: account creation date, server
   join date, roles, and account age.
   Data comes from Discord's own client stores (webpack): UserStore,
   GuildMemberStore and RoleStore. Creation date is computed from the
   user ID snowflake — the same math Discord uses. */
(function () {
  'use strict';

  function accountAgeText(created) {
    var days = Math.floor((Date.now() - created.getTime()) / 86400000);
    if (days < 1) return 'less than a day';
    if (days < 30) return days + ' day' + (days === 1 ? '' : 's');
    if (days < 365) {
      var m = Math.floor(days / 30);
      return m + ' month' + (m === 1 ? '' : 's');
    }
    var y = Math.floor(days / 365);
    var rem = Math.floor((days % 365) / 30);
    return y + ' year' + (y === 1 ? '' : 's') + (rem ? ' ' + rem + ' mo' : '');
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

  function detailsFor(guildId, userId) {
    var created = DP.util.snowflakeDate(userId);
    var joinedAt = null;
    var roles = [];
    try {
      var memberStore = DP.webpack.guildMemberStore();
      if (memberStore && typeof memberStore.getMember === 'function') {
        var member = memberStore.getMember(guildId, userId);
        if (member) {
          if (member.joinedAt) joinedAt = new Date(member.joinedAt);
          if (member.roles && member.roles.length) {
            try {
              var roleStore = DP.webpack.roleStore();
              var roleMap = roleStore && typeof roleStore.getRoles === 'function'
                ? roleStore.getRoles(guildId) : null;
              member.roles.forEach(function (rid) {
                if (rid === guildId) return; // @everyone
                var role = roleMap ? (roleMap[rid] || roleMap[String(rid)]) : null;
                roles.push(role && role.name ? role.name : rid);
              });
            } catch (e) {
              roles = member.roles.slice();
            }
          }
        }
      }
    } catch (e) {}
    return { created: created, joinedAt: joinedAt, roles: roles };
  }

  function inject(popout) {
    if (!popout || popout.getAttribute('data-dp-member-details')) return;
    var ids = DP.util.channelIdsFromURL();
    var userId = userIdFrom(popout);
    if (!userId) return;
    var d = detailsFor(ids.guildId, userId);
    if (!d.created && !d.joinedAt && !d.roles.length) return;
    popout.setAttribute('data-dp-member-details', '1');
    var box = document.createElement('div');
    box.className = 'dp-member-details';
    box.style.cssText = 'margin:10px 12px 12px;padding:10px 12px;background:#2b2d31;border-radius:8px;color:#dbdee1;font:13px -apple-system,sans-serif;line-height:1.7;';
    var html = '<b style="color:#fff">👤 Member details</b><br>';
    if (d.created) {
      html += 'Account created: ' + d.created.toLocaleDateString() +
        ' <span style="color:#b5bac1">(' + accountAgeText(d.created) + ' old)</span><br>';
    }
    if (d.joinedAt) {
      html += 'Joined server: ' + d.joinedAt.toLocaleDateString() + '<br>';
    }
    if (d.roles.length) {
      html += 'Roles (' + d.roles.length + '): ' + d.roles.map(function (r) {
        return r.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      }).join(', ');
    }
    box.innerHTML = html;
    popout.appendChild(box);
  }

  DP.registerPlugin({
    id: 'memberDetails',
    name: 'Member Details',
    version: '1.1.0',
    start: function () {
      var self = this;
      var scan = function (root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('[class*="userPopout"], [class*="userProfileModal"]').forEach(function (p) {
          inject(p);
        });
      };
      scan(document);
      self._obs = DP.util.observe(document.body, function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType === 1) scan(n);
          });
        });
      });
    },
    stop: function () {
      if (this._obs) this._obs.disconnect();
      document.querySelectorAll('.dp-member-details').forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      document.querySelectorAll('[data-dp-member-details]').forEach(function (el) {
        el.removeAttribute('data-dp-member-details');
      });
    }
  });
})();
