/* Общие элементы интерфейса: окно с объяснением ошибки, короткий тост, иконки уловок. */
(function (G) {
  'use strict';

  var modal, modalBtn, toastEl, toastTimer = null;

  function boot() {
    modal = document.getElementById('modal');
    modalBtn = document.getElementById('modal-btn');
    toastEl = document.getElementById('toast');
  }

  G.ui = {
    // Мягкая обратная связь на ошибку: что не так и почему. Возвращает Promise, который
    // завершается, когда ребёнок нажал кнопку. Никакого красного крестика и «неверно!».
    explain: function (opts) {
      if (!modal) boot();
      return new Promise(function (resolve) {
        document.getElementById('modal-emoji').textContent = opts.emoji || '🤔';
        document.getElementById('modal-title').textContent = opts.title || 'Хм, давай посмотрим';
        document.getElementById('modal-text').textContent = opts.text || '';
        modalBtn.textContent = opts.button || 'Понятно';
        modal.hidden = false;
        function done() {
          modalBtn.removeEventListener('click', done);
          modal.hidden = true;
          G.audio.sfx('tap');
          resolve();
        }
        modalBtn.addEventListener('click', done);
      });
    },

    toast: function (text, ms) {
      if (!toastEl) boot();
      toastEl.textContent = text;
      toastEl.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.hidden = true; }, ms || 1800);
    },

    // Иконка уловки (рисунок дизайнеров из js/art.js). Цвет берёт у родителя через currentColor.
    // Если рисунка нет, возвращает пустую строку, и вызывающий код показывает запасной эмодзи.
    icon: function (id) {
      var s = G.art && G.art.icons && G.art.icons[id];
      return s ? '<span class="ico">' + s + '</span>' : '';
    },

    // Иконка как картинка для canvas (плакат). color: любой CSS-цвет. Promise<Image> или null.
    iconImage: function (id, color) {
      var s = G.art && G.art.icons && G.art.icons[id];
      if (!s) return Promise.resolve(null);
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { resolve(null); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
          s.replace(/currentColor/g, color).replace('<svg ', '<svg width="96" height="96" '));
      });
    }
  };
})(window.G);
