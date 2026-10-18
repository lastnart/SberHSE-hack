/* «Поймай Лиса»: механика.
   Ребёнок читает сообщение из окошка ворот, лупой находит уловки (тап по фразе),
   решает: пустить или показать взрослому. Настоящий облик гостя виден только ПОСЛЕ решения.
   Три волны, книга правил растёт от волны к волне. Состояние живёт только в памяти. */
(function (G) {
  'use strict';

  var els = null;
  var swiper = null;
  var S = null;            // состояние текущей партии
  var wardrobe = {};       // трофеи Лиса: копятся, пока экран открыт (между партиями не сбрасываются)
  var poster = null;       // данные для плаката
  var trickById = {};

  // Реплики лиса: сначала перемешиваем весь список и показываем по очереди, пока не кончится, потом снова перемешиваем.
  // Так одна и та же реплика не повторяется, пока не показаны все остальные, и не выпадает два раза подряд на стыке кругов.
  var decks = {};
  function nextLine(key) {
    var all = (S.c.foxLines && S.c.foxLines[key]) || [];
    if (!all.length) return '';
    var d = decks[key];
    if (!d || d.size !== all.length) d = decks[key] = { queue: [], last: null, size: all.length };
    if (!d.queue.length) {
      d.queue = G.shuffle(all.slice());
      if (all.length > 1 && d.queue[0] === d.last) { // на стыке кругов не ставим подряд ту же реплику
        var t = d.queue[0]; d.queue[0] = d.queue[d.queue.length - 1]; d.queue[d.queue.length - 1] = t;
      }
    }
    d.last = d.queue.shift();
    return d.last;
  }

  function cache() {
    els = {
      dots: G.$('#dots'), card: G.$('#card'), phrases: G.$('#phrases'), stamp: G.$('#stamp'),
      scene: G.$('#scene'), slot: G.$('#slot'), plate: G.$('#plate'), sill: G.$('#sill'), foxline: G.$('#foxline'),
      tip: G.$('#tip'), stickers: G.$('#stickers'), btnNo: G.$('#btn-no'), btnYes: G.$('#btn-yes'),
      zones: G.$('#zones'), btnNext: G.$('#btn-next')
    };
  }

  /* ---------- сборка партии ---------- */

  // Порядок гостей в волне: обучающий первым, подряд нет двух с одним именем на табличке, первый не повторяет
  // последнего гостя прошлой волны. Гостей в волне мало, поэтому перебираем все перестановки в случайном порядке.
  function arrange(list, prevName) {
    var perms = permutations(list);
    G.shuffle(perms);
    function ok(p, strictPrev) {
      for (var i = 0; i < p.length; i++) {
        if (i === 0 && p[0].name === prevName && strictPrev) return false;
        if (i > 0 && p[i].name === p[i - 1].name) return false;
        if (p[i].tutorial && i > 0) return false;
      }
      return true;
    }
    for (var k = 0; k < perms.length; k++) if (ok(perms[k], true)) return perms[k];
    for (k = 0; k < perms.length; k++) if (ok(perms[k], false)) return perms[k];
    return perms.length ? perms[0] : list;
  }

  // Порядок гостей сразу во всех волнах: в каждой волне обучающий первым, нигде подряд нет двух гостей с одним именем
  // на табличке, в том числе на стыке волн. Перебор с возвратом по перестановкам волн (гостей всего около десяти).
  // Если подходящего порядка нет вообще, расставляем волны по одной, как получится.
  function arrangeAll(lists) {
    function good(p, first) {
      for (var i = 0; i < p.length; i++) {
        if (i > 0 && p[i].name === p[i - 1].name) return false;
        if (p[i].tutorial && !(first && i === 0)) return false;
      }
      return true;
    }
    var perms = lists.map(function (l, i) {
      return G.shuffle(permutations(l)).filter(function (p) { return good(p, i === 0); });
    });
    var chosen = [];
    function dfs(i, prev) {
      if (i === lists.length) return true;
      for (var k = 0; k < perms[i].length; k++) {
        var p = perms[i][k];
        if (p.length && prev !== null && p[0].name === prev) continue;
        chosen[i] = p;
        if (dfs(i + 1, p.length ? p[p.length - 1].name : prev)) return true;
      }
      return false;
    }
    if (dfs(0, null)) return chosen;
    var prev = null;
    return lists.map(function (l) {
      var p = arrange(l, prev);
      if (p.length) prev = p[p.length - 1].name;
      return p;
    });
  }

  function buildRun(c) {
    trickById = {};
    c.tricks.forEach(function (t) { trickById[t.id] = t; });

    var lists = c.waves.map(function (w) {
      var sly = G.shuffle(c.guests.filter(function (g) { return g.kind === 'sly' && g.wave === w.id; }));
      sly.sort(function (a, b) { return (b.tutorial ? 1 : 0) - (a.tutorial ? 1 : 0); }); // обучающий гость всегда попадает
      var fr = G.shuffle(c.guests.filter(function (g) { return g.kind === 'friend' && g.wave === w.id; }));
      return sly.slice(0, w.pick.sly).concat(fr.slice(0, w.pick.friend));
    });
    var ordered = arrangeAll(lists);
    var waves = c.waves.map(function (w, i) { return { def: w, list: ordered[i] }; });

    var total = 0;
    waves.forEach(function (w) { total += w.list.length; });
    return {
      c: c, waves: waves, wave: -1, queue: [], current: null,
      total: total, solved: 0, mistakes: 0,
      found: {}, guestFound: {}, falseAlarms: 0, warned: false,
      baseTip: '', locked: true, tipTimer: null
    };
  }

  /* ---------- отрисовка ---------- */

  function renderDots() {
    els.dots.innerHTML = '';
    for (var i = 0; i < S.total; i++) {
      var d = document.createElement('div');
      d.className = 'dot' + (i < S.solved ? ' done' : '');
      els.dots.appendChild(d);
    }
  }

  function stickerRow(box, foundMap) {
    box.innerHTML = '';
    S.c.tricks.forEach(function (t) {
      var d = document.createElement('div');
      d.className = 'sticker' + (foundMap[t.id] ? ' on' : '');
      d.dataset.id = t.id;
      d.style.setProperty('--c', t.color);
      d.innerHTML = G.ui.icon(t.id) || t.emoji; // иконка дизайнеров, запасной вариант эмодзи
      d.title = t.name;
      box.appendChild(d);
    });
  }

  function stickerEl(id) { return els.stickers.querySelector('[data-id="' + id + '"]'); }

  function stickerOn(id) {
    var d = stickerEl(id);
    if (d) { d.classList.remove('seen'); d.classList.add('on'); }
  }

  // Уловка этого типа уже была найдена: наклейка всё равно отзывается, чтобы отклик был на каждую находку.
  function stickerBump(id) {
    var d = stickerEl(id);
    if (!d) return;
    d.classList.remove('bump');
    void d.offsetWidth;
    d.classList.add('bump');
  }

  // Показана после разбора, но ребёнок сам её не нашёл: пунктирное кольцо, в счёт не идёт.
  function stickerSeen(id) {
    var d = stickerEl(id);
    if (d && !d.classList.contains('on')) d.classList.add('seen');
  }

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  // html: true, если text уже собран из безопасных частей (иконка + экранированный текст).
  function setTip(text, ms, html) {
    clearTimeout(S.tipTimer);
    if (html) els.tip.innerHTML = '<span class="tip-in">' + text + '</span>'; else els.tip.textContent = text;
    if (ms) S.tipTimer = setTimeout(function () { els.tip.textContent = S.baseTip; }, ms);
  }

  // Ярлык над фразой: иконка и название уловки. Элемент, а не ::before, чтобы внутри была настоящая иконка.
  function addTag(ph, t) {
    var old = ph.querySelector('.tag');
    if (old) old.remove();
    var tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = (G.ui.icon(t.id) || esc(t.emoji)) + '<span>' + esc(t.name) + '</span>';
    ph.appendChild(tag);
  }

  function setBaseTip(text) { S.baseTip = text; setTip(text); }

  function sayFox(text) {
    els.foxline.textContent = text;
    els.foxline.hidden = false;
    els.foxline.style.animation = 'none';
    void els.foxline.offsetWidth;
    els.foxline.style.animation = '';
  }

  function showStamp(adult) {
    els.stamp.textContent = adult ? 'ВЗРОСЛОМУ' : 'ПУСТИТЬ';
    els.stamp.className = 'stamp ' + (adult ? 'no' : 'yes');
    void els.stamp.offsetWidth;
    els.stamp.classList.add('show');
    // Штамп виден недолго, иначе закрывает подсвеченные подсказки под ним.
    setTimeout(function () { els.stamp.classList.remove('show'); }, 1200);
  }

  // Даём прочитать: через 2 секунды вместо зон решения появляется кнопка «Дальше».
  // Ничего не пропадает само, ребёнок идёт дальше, когда готов.
  var READ_MS = 2000;
  function waitNext(ms) {
    return G.sleep(ms == null ? READ_MS : ms).then(function () {
      return new Promise(function (resolve) {
        els.zones.classList.add('next-mode');
        function done() {
          els.btnNext.removeEventListener('click', done);
          els.zones.classList.remove('next-mode');
          G.audio.sfx('tap');
          resolve();
        }
        els.btnNext.addEventListener('click', done);
      });
    });
  }

  function renderGuest() {
    var g = S.current;
    S.guestFound = {};
    els.plate.textContent = g.name;
    G.fx.pop(G.fox.shadow(els.slot)); // до решения гость = размытая тень с «?»
    els.sill.classList.remove('eaten');
    els.scene.classList.remove('closed'); // к новому гостю ворота открыты
    els.foxline.hidden = true;
    els.stamp.className = 'stamp';

    els.phrases.innerHTML = '';
    var firstTrick = true;
    g.chunks.forEach(function (ch, i) {
      var s = document.createElement('span');
      s.className = 'ph';
      s.dataset.i = i;
      s.textContent = ch.t;
      if (g.tutorial && S.solved === 0 && ch.trick && firstTrick) { s.classList.add('pulse'); firstTrick = false; }
      els.phrases.appendChild(s);
      els.phrases.appendChild(document.createTextNode(' '));
    });
    els.card.classList.remove('pop');
    void els.card.offsetWidth;
    els.card.classList.add('pop');

    setBaseTip(g.tutorial && S.solved === 0 ? 'Нажми на фразу, где что-то не так' : '');
    renderDots();
    swiper.reset();
    swiper.enable(true);
    S.locked = false;
  }

  /* ---------- ход игры ---------- */

  function startWave(i) {
    S.wave = i;
    var w = S.waves[i];
    S.queue = w.list.slice();
    S.locked = true;
    swiper.enable(false);
    var first = !G.book.introDone;
    G.book.open({
      heading: 'Волна ' + (i + 1), sub: w.def.title, wave: w.def.id, markNew: true,
      flyTo: first ? G.$('#btn-book') : null
    }).then(function () {
      nextGuest();
      if (first) setTip('📖 Вот где живёт книга стража. Загляни, если забыл правило!');
    });
  }

  function nextGuest() {
    if (!S.queue.length) {
      if (S.wave + 1 < S.waves.length) { startWave(S.wave + 1); return; }
      G.screens.go('result');
      return;
    }
    S.current = S.queue.splice(pickIndex(S.queue, S.current ? S.current.name : null), 1)[0];
    renderGuest();
  }

  // Все перестановки списка (гостей в очереди мало).
  function permutations(list) {
    var out = [];
    (function rec(rest, acc) {
      if (!rest.length) { out.push(acc); return; }
      rest.forEach(function (g, i) { rec(rest.slice(0, i).concat(rest.slice(i + 1)), acc.concat([g])); });
    })(list, []);
    return out;
  }

  // Второй шанс после ошибки: гость возвращается, но не сразу и не рядом с гостем с таким же именем на табличке.
  // Переставляем оставшихся так, чтобы одинаковые имена не оказались рядом, а вернувшийся стоял как можно позже.
  // Если в волне остались только «однофамильцы» или никого, он возвращается в начале следующей волны.
  // Последняя волна и больше никого: повтора нет, ребёнок уже получил объяснение ошибки.
  function requeue(st, g) {
    var q = st.queue;
    var onlySame = q.every(function (x) { return x.name === g.name; });
    if (!q.length || onlySame) {
      if (st.wave + 1 < st.waves.length) st.waves[st.wave + 1].list.unshift(g);
      return;
    }
    var all = q.concat([g]), best = null, bestPos = -1;
    if (all.length <= 6) {
      G.shuffle(permutations(all)).forEach(function (p) {
        if (p[0].name === g.name) return;                        // сразу после себя же не выходит
        for (var i = 1; i < p.length; i++) if (p[i].name === p[i - 1].name) return;
        var pos = p.indexOf(g);
        if (pos > bestPos) { best = p; bestPos = pos; }
      });
    }
    if (best) { st.queue = best; return; }
    if (st.wave + 1 < st.waves.length) st.waves[st.wave + 1].list.unshift(g); // иначе пришлось бы поставить рядом с однофамильцем
    else q.push(g);
  }

  // Кто выходит следующим: первый в очереди, у кого имя на табличке не такое, как у только что показанного.
  // Так «Бабушка» (жулик) и «Бабушка» (настоящая), два «Незнакомца» или «Дима» на стыке волн не идут подряд.
  // Если в очереди остались только такие же (например, гость вернулся на второй шанс последним), берём первого.
  function pickIndex(queue, prevName) {
    for (var i = 0; i < queue.length; i++) if (queue[i].name !== prevName) return i;
    return 0;
  }

  function markFound(ph, trickId) {
    var t = trickById[trickId];
    S.guestFound[ph.dataset.i] = true;
    var firstOfType = !S.found[trickId];
    S.found[trickId] = true;
    ph.classList.remove('pulse');
    ph.classList.add('found');
    ph.style.setProperty('--c', t.color);
    addTag(ph, t);
    G.audio.sfx('ok');
    if (firstOfType) { G.bridge.vibrate(); stickerOn(trickId); } else { stickerBump(trickId); }
    if (S.current.tutorial && S.solved === 0) {
      setBaseTip('Нашёл: «' + t.name + '»! Теперь реши: ← показать взрослому или пустить →');
    } else {
      setTip(G.ui.icon(t.id) + '<b>' + esc(t.name) + '</b>: ' + esc(t.tip), 0, true); // остаётся, пока не сменится другой подсказкой или гостем
    }
  }

  // Тап мимо фразы (в промежуток или рядом) засчитывается на ближайшую, если до неё не дальше 24 пикселей.
  function nearestPhrase(x, y) {
    var best = null, bestD = 24;
    G.$$('.ph:not(.found):not(.honest)', els.phrases).forEach(function (p) { // уже найденные в зачёт не берём
      var r = p.getBoundingClientRect();
      var dx = Math.max(r.left - x, 0, x - r.right);
      var dy = Math.max(r.top - y, 0, y - r.bottom);
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = p; }
    });
    return best;
  }

  function onTap(target, x, y) {
    if (S.locked) return;
    var ph = target && target.closest ? target.closest('.ph') : null;
    if (!ph && x != null) ph = nearestPhrase(x, y);
    if (!ph || ph.classList.contains('found') || ph.classList.contains('honest')) return;
    var ch = S.current.chunks[+ph.dataset.i];
    if (ch.trick) { markFound(ph, ch.trick); return; }

    ph.classList.add('honest');
    setTimeout(function () { ph.classList.remove('honest'); }, 700);
    G.audio.sfx('tap');
    S.falseAlarms++;
    if (S.falseAlarms >= 4 && !S.warned) {
      S.warned = true;
      setTip('Не всё подозрительное плохое! Ищи, где спешат, просят секрет, ключ или не сходится с книгой.');
    } else {
      setTip('Тут всё честно 🙂', 5000);
    }
  }

  // Подсвечивает уловки, которые ребёнок не нашёл. Возвращает список их id.
  function showMissed() {
    var ids = [];
    S.current.chunks.forEach(function (ch, i) {
      if (!ch.trick || S.guestFound[i]) return;
      var ph = els.phrases.querySelector('[data-i="' + i + '"]');
      var t = trickById[ch.trick];
      ph.classList.remove('pulse');
      ph.classList.add('missed');
      ph.style.setProperty('--c', t.color);
      addTag(ph, t);
      stickerSeen(ch.trick);
      if (ids.indexOf(ch.trick) < 0) ids.push(ch.trick);
    });
    return ids;
  }

  function missedTip(ids) {
    if (!ids.length) return '';
    var t = trickById[ids[0]];
    return 'А ещё тут было: ' + G.ui.icon(t.id) + '<b>' + esc(t.name) + '</b>. ' + esc(t.tip);
  }

  // dir: 1 = пустить (вправо), -1 = показать взрослому (влево)
  function answer(dir) {
    if (S.locked) return;
    S.locked = true;
    swiper.enable(false);
    var g = S.current;
    var adult = dir < 0;
    showStamp(adult);
    if (g.kind === 'sly') { if (adult) caught(g); else naughty(g); }
    else friend(g, !adult);
  }

  async function caught(g) {
    var worn = g.disguise || ['mask'];
    var sheep = worn.indexOf('sheep') >= 0;
    var items = worn.filter(function (k) { return k !== 'sheep'; });
    var svg = G.fox.mount(els.slot, { pose: 'default', items: items, sheep: sheep }); // лис в маскировке
    G.fx.pop(svg);
    G.audio.sfx('tap');
    await G.sleep(450);
    await G.fox.unmask(els.slot); // всё слетает, лис «сдаётся» (surrender)
    sayFox(nextLine('caught'));
    // Трофей и текст берём из того, что на лисе реально было: слетело всё, что надето (костюм овечки трофеем не бывает).
    items.forEach(function (k) { wardrobe[k] = true; });
    var missed = showMissed();
    S.solved++;
    renderDots();
    G.audio.sfx('ok');
    G.bridge.vibrate();
    G.fx.confetti({ count: 45, y: G.fx.size().h * 0.4 });
    var lostNames = worn.map(function (k) { return k === 'sheep' ? 'Костюм овечки' : G.fox.trophyNames[k]; });
    var lost = 'Лис потерял: ' + lostNames.join(' и ') + '. ';
    setTip(esc(lost) + missedTip(missed), 0, true);
    await G.sleep(900); // лис постоит, «сдавшись», и ребёнок успеет увидеть, что слетело
    await G.fox.runAway(els.slot); // убегает обиженный и оглядывается
    if (S.current === g) {
      els.foxline.hidden = true; // лис ушёл за кадр, его реплика тоже пропадает
      els.scene.classList.add('closed'); // ворота закрываются
    }
    await waitNext(1200);
    nextGuest();
  }

  async function naughty(g) {
    S.mistakes++;
    G.audio.sfx('bad');
    var svg = G.fox.mount(els.slot, { pose: 'trick' }); // рука у рта, улыбка: обхитрил
    G.fx.pop(svg);
    els.sill.classList.add('eaten');
    sayFox(nextLine('naughty'));
    showMissed();
    await G.sleep(2400); // реплику лиса и пропавшее мороженое надо успеть увидеть
    await G.ui.explain({ emoji: '🤔', title: 'Хм, давай посмотрим', text: g.why, button: 'Понятно' });
    requeue(S, g); // второй шанс, но не сразу тем же диалогом
    nextGuest();
  }

  async function friend(g, correct) {
    G.fx.pop(G.fox.friend(els.slot, g.avatar, g.emoji)); // тень обретает цвет и лицо
    if (correct) {
      S.solved++;
      renderDots();
      G.audio.sfx('ok');
      setTip('Это свой! ' + g.why);
      await waitNext();
      nextGuest();
      return;
    }
    S.mistakes++;
    G.audio.sfx('bad');
    await G.sleep(500);
    await G.ui.explain({ emoji: '🙂', title: 'Тут всё в порядке', text: g.why + ' Можно пускать.', button: 'Понятно' });
    requeue(S, g);
    nextGuest();
  }

  /* ---------- экраны ---------- */

  function bind() {
    if (G.art.scene) G.$('#screen-play').insertAdjacentHTML('afterbegin', G.art.scene); // фон за сценой, привязан к экрану
    swiper = G.input.swipeCard(els.card, {
      onMove: function (dx) {
        els.btnYes.classList.toggle('hot', dx > 40);
        els.btnNo.classList.toggle('hot', dx < -40);
      },
      onSwipe: answer,
      onTap: onTap
    });
    els.btnNo.addEventListener('click', function () { swiper.trigger(-1); });
    els.btnYes.addEventListener('click', function () { swiper.trigger(1); });
    G.$('#btn-book').addEventListener('click', function () {
      if (G.book.isOpen() || !S) return;
      var w = S.waves[Math.max(0, S.wave)].def;
      G.book.open({ heading: 'Книга стража', wave: w.id, markNew: false });
    });
  }

  G.screens.on('play', {
    enter: function () {
      if (!els) { cache(); bind(); }
      S = buildRun(G.content.data);
      stickerRow(els.stickers, S.found);
      renderDots();
      startWave(0);
    }
  });

  function rankFor(n, ranks) {
    var best = (ranks && ranks[0] && ranks[0].title) || 'Молодец';
    (ranks || []).forEach(function (r) { if (n >= r.min) best = r.title; });
    return best;
  }

  G.screens.on('result', {
    enter: function () {
      var c = S.c;
      var n = Object.keys(S.found).length;
      var total = c.tricks.length;
      var trophies = Object.keys(wardrobe);
      var rank = rankFor(n, c.ranks);
      var stars = S.mistakes === 0 ? 3 : (S.mistakes <= 2 ? 2 : 1);

      var svg = G.fox.mount(G.$('#result-fox'), { pose: 'surrender', items: trophies });
      svg.classList.add('sway');
      G.$('#result-stars').textContent = new Array(stars + 1).join('⭐');
      G.$('#result-rank').textContent = rank;
      G.$('#result-text').textContent = 'Поймал уловок: ' + n + ' из ' + total;
      stickerRow(G.$('#result-stickers'), S.found);

      poster = { rank: rank, n: n, total: total, trophies: trophies, found: S.found, tricks: c.tricks, title: c.title };

      G.audio.sfx('win');
      G.bridge.vibrate();
      G.fx.confetti({ count: 90 });
      G.bridge.completed(); // один раз за открытие
    }
  });

  /* ---------- плакат для «Поделиться» ---------- */

  function drawPoster(ctx, w, h, p) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8C4FE6'); g.addColorStop(1, '#4A1F9E');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#D1F43A';
    ctx.font = '900 54px ' + G.share.FONT;
    ctx.fillText(p.title, w / 2, 92);

    function rest() {
      // лента со званием
      ctx.fillStyle = '#D1F43A';
      G.share.roundRect(ctx, 70, 668, w - 140, 96, 30);
      ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = '#16131F'; ctx.stroke();
      ctx.fillStyle = '#16131F';
      ctx.font = '900 50px ' + G.share.FONT;
      ctx.fillText(p.rank, w / 2, 735);

      // наклейки-уловки
      var n = p.tricks.length, r = 36, gap = 12;
      var x0 = (w - (n * r * 2 + (n - 1) * gap)) / 2 + r;
      p.tricks.forEach(function (t, i) {
        var cx = x0 + i * (r * 2 + gap), cy = 826, on = !!p.found[t.id], ico = icons[i];
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = on ? t.color : 'rgba(255,255,255,.12)'; ctx.fill();
        ctx.lineWidth = 5; ctx.strokeStyle = on ? '#16131F' : 'rgba(255,255,255,.3)'; ctx.stroke();
        ctx.globalAlpha = on ? 1 : 0.4;
        if (ico) {
          ctx.drawImage(ico, cx - 22, cy - 22, 44, 44);
        } else { // запасной вариант, если рисунка нет
          ctx.font = '38px ' + G.share.FONT; ctx.fillStyle = '#fff';
          ctx.fillText(t.emoji, cx, cy + 13);
        }
        ctx.globalAlpha = 1;
      });

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 36px ' + G.share.FONT;
      ctx.fillText('Поймал ' + p.n + ' уловок из ' + p.total + '. А ты сможешь?', w / 2, 905);
    }

    // лаймовый круг за лисом, как «пузырь» на слайдах СберKids
    var cg = ctx.createRadialGradient(290, 270, 20, 360, 400, 260);
    cg.addColorStop(0, '#EDFB8F'); cg.addColorStop(0.55, '#D1F43A'); cg.addColorStop(1, '#B9E41C');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(360, 400, 255, 0, Math.PI * 2); ctx.fill();

    var icons = [];
    return Promise.all(p.tricks.map(function (t, i) {
      return G.ui.iconImage(t.id, p.found[t.id] ? '#16131F' : '#FFFFFF').then(function (im) { icons[i] = im; });
    })).then(function () {
      return G.fox.image({ pose: 'surrender', items: p.trophies });
    }).then(function (img) {
      ctx.drawImage(img, 164, 112, 392, 552);
    }, function () {
      ctx.font = '240px ' + G.share.FONT; ctx.fillStyle = '#fff';
      ctx.fillText('🦊', w / 2, 420);
    }).then(rest);
  }

  G._test = { buildRun: buildRun, pickIndex: pickIndex, arrange: arrange, requeue: requeue }; // для tools/order_test.py

  G.shareResult = function () {
    if (!poster) return;
    var p = poster;
    G.share.sendAsync('Я поймал ' + p.n + ' уловок из ' + p.total + ' в игре «' + p.title + '»! А ты сможешь?',
      function (ctx, w, h) { return drawPoster(ctx, w, h, p); });
  };
})(window.G);
