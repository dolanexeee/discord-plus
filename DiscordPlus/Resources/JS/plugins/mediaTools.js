/* Discord Plus plugin: Media Tools
   Tap any image in a message to zoom it fullscreen in a lightbox, with a
   download button. Videos open in the same lightbox with controls. */
(function () {
  'use strict';

  var overlay = null;

  function isMediaImage(el) {
    if (!el || el.tagName !== 'IMG') return false;
    // Skip avatars and emojis.
    if (el.closest('[class*="avatar"], [class*="emoji"]')) return false;
    if (el.naturalWidth && el.naturalWidth < 120) return false;
    var inMessage = el.closest('[class*="message"], [class*="attachment"], [class*="embed"], [class*="imageWrapper"], [class*="gallery"], [class*="media"]');
    return !!inMessage || (el.naturalWidth && el.naturalWidth >= 200);
  }

  function fullSizeUrl(src) {
    return src.replace(/[?&](width|height)=\d+/g, '').replace(/[?&]$/, '');
  }

  function openLightbox(src, isVideo) {
    closeLightbox();
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;';
    var media;
    if (isVideo) {
      media = document.createElement('video');
      media.src = src;
      media.controls = true;
      media.autoplay = true;
      media.playsInline = true;
    } else {
      media = document.createElement('img');
      media.src = fullSizeUrl(src);
    }
    media.style.cssText = 'max-width:96vw;max-height:82vh;object-fit:contain;border-radius:8px;';
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:12px;margin-top:16px;';
    var dl = document.createElement('button');
    dl.textContent = 'Download / تنزيل';
    dl.style.cssText = 'background:#5865f2;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-size:15px;';
    dl.addEventListener('click', function (ev) {
      ev.stopPropagation();
      downloadMedia(src);
    });
    var close = document.createElement('button');
    close.textContent = 'Close / إغلاق';
    close.style.cssText = 'background:#4f545c;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-size:15px;';
    close.addEventListener('click', closeLightbox);
    bar.appendChild(dl);
    bar.appendChild(close);
    overlay.appendChild(media);
    overlay.appendChild(bar);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeLightbox(); });
    document.body.appendChild(overlay);
  }

  function closeLightbox() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  function downloadMedia(src) {
    var url = fullSizeUrl(src);
    fetch(url).then(function (r) { return r.blob(); }).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      var name = url.split('/').pop().split('?')[0] || 'discord-media';
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      DP.toast('Download started');
    }).catch(function () {
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  DP.registerPlugin({
    id: 'mediaTools',
    name: 'Media Tools',
    version: '1.0.0',
    start: function () {
      var self = this;
      self._onClick = function (e) {
        var img = e.target && e.target.closest ? e.target.closest('img') : null;
        var video = e.target && e.target.closest ? e.target.closest('video') : null;
        if (img && isMediaImage(img)) {
          e.preventDefault();
          e.stopPropagation();
          openLightbox(img.src, false);
        } else if (video) {
          e.preventDefault();
          e.stopPropagation();
          openLightbox(video.currentSrc || video.src, true);
        }
      };
      self._onKey = function (e) { if (e.key === 'Escape') closeLightbox(); };
      document.addEventListener('click', self._onClick, true);
      document.addEventListener('keydown', self._onKey, true);
    },
    stop: function () {
      if (this._onClick) document.removeEventListener('click', this._onClick, true);
      if (this._onKey) document.removeEventListener('keydown', this._onKey, true);
      closeLightbox();
    }
  });
})();
