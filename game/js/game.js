/* ШАБЛОН ИГРЫ: свайп-карточки «да / нет» с объяснением ошибки.
   Это рабочий образец, на котором видно, как пользоваться каркасом:
   ввод, мягкая обратная связь, вибрация, конфетти, итог и шаринг.
   Тему и механику заменяем, а модули core / bridge / audio / content / input / fx / ui / share оставляем. */
(function (G) {
  'use strict';

  var els = null;
  var swiper = null;
  var queue = [], current = null;
  var total = 0, solved = 0, mistakes = 0;
  var locked = false;

  function cache() {
    els = {
      card: G.$('#card'), emoji: G.$('#card-emoji'), text: G.$('#card-text'),
      dots: G.$('#dots'), hintL: G.$('#hint-left'), hintR: G.$('#hint-right'),
      btnNo: G.$('#btn-no'), btnYes: G.$('#btn-yes')
    };
  }

  function renderDots() {
    els.dots.innerHTML = '';
    for (var i = 0; i < total; i++) {
      var d = document.createElement('div');
      d.className = 'dot' + (i < solved ? ' done' : '');
      els.dots.appendChild(d);
    }
  }

  function show(card) {
    els.emoji.textContent = card.emoji || '❓';
    els.text.textContent = card.text;
    els.card.classList.remove('pop');
    void els.card.offsetWidth; // перезапуск анимации
    els.card.classList.add('pop');
    renderDots();
  }

  function next() {
    if (!queue.length) { G.screens.go('result', { solved: solved, mistakes: mistakes, total: total }); return; }
    current = queue.shift();
    swiper.reset();
    show(current);
    locked = false;
  }

  // dir: 1 = «да» (вправо), -1 = «нет» (влево)
  function answer(dir) {
    var right = (dir > 0) === current.safe;
    if (right) {
      solved++;
      G.audio.sfx('ok');
      G.bridge.vibrate();
      G.fx.confetti({ count: 18, y: window.innerHeight * 0.45 });
      next();
      return;
    }
    // Ошибка: не ругаем, объясняем почему, возвращаем карточку в конец очереди.
    locked = true;
    mistakes++;
    G.audio.sfx('bad');
    swiper.reset();
    G.fx.shake(els.card);
    G.ui.explain({
      emoji: '🤔',
      title: 'Хм, давай посмотрим',
      text: current.why || 'Давай попробуем ещё раз.',
      button: 'Понятно'
    }).then(function () {
      queue.push(current);
      next();
    });
  }

  function bind() {
    swiper = G.input.swipeCard(els.card, {
      onMove: function (dx) {
        els.hintR.style.opacity = G.clamp(dx / 90, 0, 1);
        els.hintL.style.opacity = G.clamp(-dx / 90, 0, 1);
      },
      onSwipe: answer
    });
    els.btnNo.addEventListener('click', function () { if (!locked) swiper.fling(-1); });
    els.btnYes.addEventListener('click', function () { if (!locked) swiper.fling(1); });
  }

  G.screens.on('play', {
    enter: function () {
      if (!els) { cache(); bind(); }
      var c = G.content.data;
      els.btnYes.textContent = (c.labels && c.labels.yes) || 'Да';
      els.btnNo.textContent = (c.labels && c.labels.no) || 'Нет';
      els.hintR.textContent = els.btnYes.textContent;
      els.hintL.textContent = els.btnNo.textContent;
      var all = G.shuffle(c.cards.slice());
      queue = all.slice(0, c.roundSize || all.length);
      total = queue.length; solved = 0; mistakes = 0; locked = false;
      next();
    }
  });

  /* ---------- итог ---------- */

  function rankFor(score, ranks) {
    var best = (ranks && ranks[0] && ranks[0].title) || 'Молодец';
    (ranks || []).forEach(function (r) { if (score >= r.min) best = r.title; });
    return best;
  }

  function drawCard(ctx, w, h, info) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#272C66'); g.addColorStop(1, '#1B1F4B');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD84D';
    ctx.font = '900 44px ' + G.share.FONT;
    ctx.fillText(info.title, w / 2, 110);

    ctx.font = '200px ' + G.share.FONT;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(info.emoji, w / 2, 380);

    ctx.fillStyle = '#5CE0B8';
    G.share.roundRect(ctx, 80, 450, w - 160, 150, 36);
    ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#0D0F2B'; ctx.stroke();
    ctx.fillStyle = '#0D0F2B';
    ctx.font = '900 56px ' + G.share.FONT;
    ctx.fillText(info.rank, w / 2, 545);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 40px ' + G.share.FONT;
    G.share.wrapText(ctx, info.line, w / 2, 700, w - 160, 54);

    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '700 30px ' + G.share.FONT;
    ctx.fillText('А ты сможешь?', w / 2, h - 70);
  }

  var lastInfo = null;

  G.screens.on('result', {
    enter: function (r) {
      var c = G.content.data;
      var score = Math.max(0, r.total - r.mistakes);
      var stars = r.mistakes === 0 ? 3 : (r.mistakes <= 2 ? 2 : 1);
      var rank = rankFor(score, c.ranks);

      G.$('#result-stars').textContent = new Array(stars + 1).join('⭐');
      G.$('#result-rank').textContent = rank;
      G.$('#result-text').textContent = r.mistakes === 0
        ? 'Ни одной ошибки с первого раза!'
        : 'Ты разобрался. Ошибки — это нормально, они учат.';

      lastInfo = {
        title: c.title, emoji: c.emoji || '⭐', rank: rank,
        line: 'Я прошёл «' + c.title + '»: ' + score + ' из ' + r.total + ' с первого раза.'
      };

      G.audio.sfx('win');
      G.bridge.vibrate();
      G.fx.confetti({ count: 90 });
      G.bridge.completed(); // один раз за открытие, повтор bridge сам не пропустит
    }
  });

  G.shareResult = function () {
    if (!lastInfo) return;
    G.share.send(lastInfo.line + ' А ты сможешь?', function (ctx, w, h) { drawCard(ctx, w, h, lastInfo); });
  };
})(window.G);
