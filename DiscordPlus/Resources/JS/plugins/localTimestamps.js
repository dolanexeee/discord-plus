/* Discord Plus plugin: Local Timestamps
   Shows the full local date and time on message timestamps (as a tooltip,
   and optionally by replacing the displayed text). */
(function () {
  'use strict';

  function applyTo(root) {
    var replace = DP.pluginOption('localTimestamps', 'replace', false);
    if (!root || !root.querySelectorAll) return;
    var nodes = root.querySelectorAll('time[datetime]');
    nodes.forEach(function (t) {
      var d = new Date(t.getAttribute('datetime'));
      if (isNaN(d.getTime())) return;
      t.title = d.toLocaleString();
      if (replace) {
        t.textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    });
  }

  DP.registerPlugin({
    id: 'localTimestamps',
    name: 'Local Timestamps',
    version: '1.0.0',
    start: function () {
      var self = this;
      applyTo(document);
      self._obs = DP.util.observe(document.body, function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType === 1) applyTo(n);
          });
        });
      });
    },
    stop: function () {
      if (this._obs) this._obs.disconnect();
    }
  });
})();
