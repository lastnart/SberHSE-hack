/* Точка входа: загрузка контента, подключение кнопок, показ заставки. */
(function (G) {
  'use strict';

  function valid(d) {
    return d && Array.isArray(d.cards) && d.cards.length > 0 && d.cards.every(function (c) {
      return c && typeof c.text === 'string' && typeof c.safe === 'boolean';
    });
  }

  function bindButtons() {
    G.$('#btn-play').addEventListener('click', function () { G.audio.sfx('tap'); G.screens.go('play'); });
    G.$('#btn-again').addEventListener('click', function () { G.audio.sfx('tap'); G.screens.go('play'); });
    G.$('#btn-share').addEventListener('click', function () { G.shareResult(); });
    G.$('#btn-exit').addEventListener('click', function () { G.bridge.close(); });
    G.$('#btn-close').addEventListener('click', function () { G.bridge.close(); });
    G.$('#btn-close-play').addEventListener('click', function () { G.bridge.close(); });
    G.$$('[data-sound-btn]').forEach(function (b) { b.addEventListener('click', G.audio.toggle); });
  }

  function start() {
    var c = G.content.data;
    G.$('#intro-emoji').textContent = c.emoji || '🎮';
    G.$('#intro-title').textContent = c.title || 'Игра';
    G.$('#intro-goal').textContent = c.goal || '';
    document.title = c.title || 'Игра';
    G.screens.go('intro');
  }

  // Кнопки звука помечены атрибутом, чтобы audio.js обновлял иконки сам.
  G.$('#btn-sound').setAttribute('data-sound-btn', '');
  G.$('#btn-sound-play').setAttribute('data-sound-btn', '');

  bindButtons();
  G.content.load('data/content.json', G.fallbackContent, valid).then(start);
})(window.G);
