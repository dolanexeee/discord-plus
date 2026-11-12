/* Discord Plus plugin: Translate Messages
   Translate a message in place — Arabic to English or English to Arabic.
   Trigger: long-press a message, then "Translate" in the menu (the menu is
   hosted by the Copy IDs plugin, which owns the long-press gesture).
   Direction is automatic: text with Arabic letters goes to English,
   everything else goes to Arabic.
   Translation uses free endpoints that need no API key:
   1. Google Translate's free gtx endpoint (primary)
   2. MyMemory (fallback)
   The translated text is shown in a box under the message, with a button
   to hide it again. Only the message text is sent to the translation
   service — nothing else. */
(function () {
  'use strict';

  function hasArabic(text) {
    return /[\u0600-\u06FF]/.test(text);
  }

  function googleTranslate(text, target) {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' +
      target + '&dt=t&q=' + encodeURIComponent(text);
    return fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      if (!data || !data[0]) throw new Error('bad response');
      var out = data[0].map(function (s) { return s[0] || ''; }).join('');
      if (!out) throw new Error('empty translation');
      return out;
    });
  }

  function myMemoryTranslate(text, source, target) {
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) +
      '&langpair=' + source + '|' + target;
    return fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      var t = data && data.responseData && data.responseData.translatedText;
      if (!t || t === 'QUERY LENGTH LIMIT EXCEEDED') throw new Error('bad response');
      return t;
    });
  }

  function translate(text) {
    var toAr = !hasArabic(text);
    var target = toAr ? 'ar' : 'en';
    var source = toAr ? 'en' : 'ar';
    return googleTranslate(text, target).catch(function () {
      return myMemoryTranslate(text, source, target);
    });
  }

  function renderTranslation(row, original, translated) {
    var old = row.querySelector('.dp-translation-box');
    if (old) { old.parentNode.removeChild(old); return 'hidden'; }
    var box = document.createElement('div');
    box.className = 'dp-translation-box';
    box.style.cssText = 'margin:4px 0 6px;padding:8px 10px;background:#1e1f22;border:1px solid #5865f2;border-left:3px solid #5865f2;border-radius:6px;color:#dbdee1;font:14px -apple-system,sans-serif;white-space:pre-wrap;word-break:break-word;';
    var label = document.createElement('div');
    label.style.cssText = 'font-size:11px;color:#b5bac1;margin-bottom:4px;';
    label.textContent = '🌐 Translation — ترجمة';
    var body = document.createElement('div');
    body.textContent = translated;
    var hide = document.createElement('button');
    hide.textContent = 'Show original / إظهار الأصل';
    hide.style.cssText = 'background:none;border:0;color:#00a8fc;font-size:12px;padding:6px 0 0;cursor:pointer;';
    hide.addEventListener('click', function () {
      if (box.parentNode) box.parentNode.removeChild(box);
    });
    box.appendChild(label);
    box.appendChild(body);
    box.appendChild(hide);
    var contentEl = row.querySelector('[id^="message-content-"]');
    if (contentEl && contentEl.parentNode) {
      contentEl.parentNode.insertBefore(box, contentEl.nextSibling);
    } else {
      row.appendChild(box);
    }
    return 'shown';
  }

  DP.registerPlugin({
    id: 'translateMessages',
    name: 'Translate Messages',
    version: '1.1.0',

    translateMessage: function (targetEl) {
      var m = DP.util.extractMessage(targetEl);
      if (!m || !m.id || !m.content) { DP.toast('No text to translate'); return; }
      var row = document.getElementById('chat-messages-' + m.id) || targetEl.closest('[id^="chat-messages-"]');
      if (!row) return;
      if (row.querySelector('.dp-translation-box')) {
        row.querySelector('.dp-translation-box').remove();
        return;
      }
      DP.toast('Translating… / جارٍ الترجمة…');
      translate(m.content).then(function (t) {
        renderTranslation(row, m.content, t);
      }).catch(function () {
        DP.toast('Translation failed — check connection');
      });
    },

    start: function () {
      // No background work: triggered from the Copy IDs long-press menu.
    },
    stop: function () {
      document.querySelectorAll('.dp-translation-box').forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    }
  });
})();
