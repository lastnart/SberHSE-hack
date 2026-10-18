/* Легенда в начале игры: 3 короткие реплики, текст «печатается».
   Тап по облачку дописывает реплику сразу, «Пропустить» закрывает легенду.
   Показывается один раз за открытие игры (в памяти), на «Ещё раз» не повторяется.
   Тексты и позы лиса лежат в content.json (поле legend), так что меняются без релиза. */
(function (G) {
  'use strict';

  var SPEED = 32; // мс на символ

  G.legendSeen = false;

  function typeText(el, text, onTick) {
    var chars = Array.from(text); // по символам Unicode, чтобы не разрезать эмодзи
    return new Promise(function (resolve) {
      var i = 0, timer = null;
      var bubble = G.$('#legend-bubble');
      el.classList.add('typing');
      function finish() {
        clearTimeout(timer);
        bubble.removeEventListener('pointerdown', finish);
        el.textContent = text;
        el.classList.remove('typing');
        resolve();
      }
      function step() {
        if (i >= chars.length) { finish(); return; }
        i++;
        el.textContent = chars.slice(0, i).join('');
        if (i % 3 === 0) onTick();
        var c = chars[i - 1];
        timer = setTimeout(step, (c === '.' || c === '!' || c === '?') ? SPEED * 6 : SPEED);
      }
      bubble.addEventListener('pointerdown', finish); // тап = дописать сразу
      step();
    });
  }

  function run() {
    var lines = G.content.data.legend;
    var textEl = G.$('#legend-text');
    var next = G.$('#legend-next');
    var skipped = false;
    var holder = G.$('#legend-fox');

    function leave() {
      if (skipped) return;
      skipped = true;
      G.legendSeen = true;
      G.screens.go('play');
    }
    G.$('#legend-skip').onclick = function () { G.audio.sfx('tap'); leave(); };

    var chain = Promise.resolve();
    lines.forEach(function (ln, idx) {
      chain = chain.then(function () {
        if (skipped) return;
        G.fox.mount(holder, { pose: ln.pose || 'default', items: ln.items || [] }).classList.add('alive');
        textEl.textContent = '';
        next.classList.add('invisible');
        return typeText(textEl, ln.text, function () { G.audio.sfx('type'); }).then(function () {
          if (skipped) return;
          next.textContent = idx === lines.length - 1 ? 'Поехали!' : 'Дальше';
          next.classList.remove('invisible');
          return new Promise(function (resolve) {
            next.onclick = function () { next.onclick = null; G.audio.sfx('tap'); resolve(); };
          });
        });
      });
    });
    chain.then(leave);
  }

  G.screens.on('legend', { enter: run });
})(window.G);
