/* Общие элементы интерфейса: окно с объяснением ошибки и короткий тост. */
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
    }
  };
})(window.G);
