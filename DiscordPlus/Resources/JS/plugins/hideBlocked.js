/* Discord Plus plugin: Hide Blocked Messages
   Hides blocked / ignored message placeholder rows from chat.
   Detection is best-effort: a message row is hidden only when its visible
   text is exactly a blocked/ignored placeholder ("1 blocked message",
   "3 ignored messages", optionally followed by a Show button). */
(function () {
  'use strict';

  function isBlockedRow(el) {
    if (!el || !el.textContent) return false;
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    return /^\d+\s+(blocked|ignored)\s+messages?\s*(show)?$/i.test(text);
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var rows = root.querySelectorAll('[id^="chat-messages-"]');
    rows.forEach(function (row) {
      if (isBlockedRow(row)) row.style.display = 'none';
    });
  }

  DP.registerPlugin({
    id: 'hideBlocked',
    name: 'Hide Blocked Messages',
    version: '1.0.0',
    start: function () {
      var self = this;
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
      document.querySelectorAll('[id^="chat-messages-"]').forEach(function (row) {
        if (isBlockedRow(row)) row.style.display = '';
      });
    }
  });
})();
