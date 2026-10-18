/* Точка входа: загрузка контента, подключение кнопок, показ заставки. */
(function (G) {
  'use strict';

  // Проверка контента. Битый файл = запасной набор, игра не падает.
  function valid(d) {
    if (!d || !Array.isArray(d.tricks) || !d.tricks.length) return false;
    if (!Array.isArray(d.waves) || !d.waves.length || !Array.isArray(d.guests) || !d.guests.length) return false;
    var ids = {};
    d.tricks.forEach(function (t) { ids[t.id] = true; });
    var ok = d.guests.every(function (g) {
      if (!g || (g.kind !== 'sly' && g.kind !== 'friend') || typeof g.name !== 'string') return false;
      if (!Array.isArray(g.chunks) || g.chunks.length < 1) return false;
      var tricks = 0;
      var chunksOk = g.chunks.every(function (c) {
        if (!c || typeof c.t !== 'string') return false;
        if (c.trick) { tricks++; return !!ids[c.trick]; }
        return true;
      });
      if (!chunksOk) return false;
      return g.kind === 'sly' ? tricks > 0 : tricks === 0;
    });
    if (!ok) return false;
    // необязательные части получают безопасные значения
    d.legend = Array.isArray(d.legend) ? d.legend.filter(function (l) { return l && typeof l.text === 'string'; }) : [];
    d.rules = d.rules || [];
    d.residents = d.residents || [];
    d.ranks = d.ranks || [{ min: 0, title: 'Страж' }];
    d.foxLines = d.foxLines || {};
    d.foxLines.caught = (d.foxLines.caught && d.foxLines.caught.length) ? d.foxLines.caught : ['Мои усы были настоящие!'];
    d.foxLines.naughty = (d.foxLines.naughty && d.foxLines.naughty.length) ? d.foxLines.naughty : ['Мороженое не отдам.'];
    return true;
  }

  function bindButtons() {
    G.$('#btn-play').addEventListener('click', function () {
      G.audio.sfx('tap');
      // легенда один раз за открытие игры; на «Ещё раз» сразу в игру
      G.screens.go(G.content.data.legend.length && !G.legendSeen ? 'legend' : 'play');
    });
    G.$('#btn-again').addEventListener('click', function () { G.audio.sfx('tap'); G.screens.go('play'); });
    G.$('#btn-share').addEventListener('click', function () { G.shareResult(); });
    G.$('#btn-exit').addEventListener('click', function () { G.bridge.close(); });
    G.$$('[data-sound-btn]').forEach(function (b) { b.addEventListener('click', G.audio.toggle); });
  }

  function start() {
    var c = G.content.data;
    var svg = G.fox.mount(G.$('#intro-fox'), { pose: 'default' });
    svg.classList.add('alive');
    G.$('#intro-title').textContent = c.title || 'Лис-привратник';
    G.$('#intro-goal').textContent = c.goal || '';
    document.title = c.title || 'Лис-привратник';
    G.screens.go('intro');
  }

  // Кнопки звука помечены атрибутом, чтобы audio.js обновлял иконки сам.
  G.$('#btn-sound').setAttribute('data-sound-btn', '');
  G.$('#btn-sound-play').setAttribute('data-sound-btn', '');

  bindButtons();
  G.content.load('data/content.json', G.fallbackContent, valid).then(function () {
    if (G.content.source === 'fallback') valid(G.content.data); // добавить значения по умолчанию в запасной набор
    start();
  });
})(window.G);
