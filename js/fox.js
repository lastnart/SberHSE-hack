/* Лис Хитрик: сборка из рисунков дизайнеров и движения кодом.
   Рисунки приходят из js/art.js (G.art.poses, items, anchors, shadow, friends), его собирают
   tools/import_art.py и tools/build_art.py из art/.

   ВАЖНО: у корневого <svg> обязательно fill="none". Контуры у дизайнеров (рот, усы, узоры маски) заданы только
   обводкой, и без fill="none" браузер зальёт их чёрным (губы «склеятся», узоры маски станут чёрными полосами).

   Позы (смысл от дизайнеров): default (руки опущены, улыбка), confused (недоумение), indignant (негодование),
   surrender (разоблачён, сдаётся), trick (обхитрил). Предметы: sombrero, mask, mustache, bow и костюм sheep. */
(function (G) {
  'use strict';

  var VIEWBOX = '-6 -10 88 124';
  var TROPHY_NAMES = { sombrero: 'Сомбреро', mask: 'Маска', mustache: 'Усы', bow: 'Бантик' };
  var ORDER = ['mustache', 'mask', 'bow', 'sombrero']; // порядок слоёв снизу вверх
  var cache = {};

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function inner(s) { return s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); }

  function part(name) {
    if (!cache[name]) {
      var s = G.art.items[name];
      var v = /viewBox="([^"]+)"/.exec(s)[1].split(' ').map(Number);
      cache[name] = { vx: v[0], vy: v[1], body: inner(s) };
    }
    return cache[name];
  }

  // Предмет в двух группах: внешняя двигается (WAAPI), внутренняя хранит посадку из anchors.
  function itemMarkup(key) {
    var a = G.art.anchors[key];
    var p = part(a.art);
    return '<g class="it it-' + key + '"><g transform="translate(' + a.x + ' ' + a.y + ') scale(' + a.s +
      ') translate(' + (-p.vx) + ' ' + (-p.vy) + ')">' + p.body + '</g></g>';
  }

  function has(list, k) { return !!list && list.indexOf(k) >= 0; }

  // o: { pose, items: ['mask', ...], sheep: bool }
  function markup(o) {
    o = o || {};
    var parts = ['<g class="f-pose">' + inner(G.art.poses[o.pose || 'default']) + '</g>'];
    ORDER.forEach(function (k) { if (has(o.items, k)) parts.push(itemMarkup(k)); });
    if (o.sheep) parts.push(itemMarkup('sheep')); // костюм поверх всего: лицо видно через дырку капюшона
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + VIEWBOX + '" fill="none" class="fox" data-pose="' + (o.pose || 'default') + '">' + parts.join('') + '</svg>';
  }

  function shake(el) {
    if (!el.animate) return;
    el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' },
                { transform: 'rotate(-2deg)' }, { transform: 'rotate(0)' }],
               { duration: 420, transformOrigin: '50% 100%' });
  }

  function waitAll(anims, ms) {
    return new Promise(function (resolve) {
      var left = anims.length, done = false;
      function end() { if (done) return; done = true; resolve(); }
      if (!left) { end(); return; }
      anims.forEach(function (a) {
        if (!a) { if (--left === 0) end(); return; }
        a.onfinish = function () { if (--left === 0) end(); };
      });
      setTimeout(end, ms); // страховка, если onfinish не придёт
    });
  }

  // Любая новая отрисовка слота отменяет незаконченный побег (иначе он потом сотрёт слот следующего гостя).
  function cancelRun(el) { el._ft = (el._ft || 0) + 1; }
  function put(el, html) { el.innerHTML = html; return el.firstElementChild; }

  G.fox = {
    trophyNames: TROPHY_NAMES,

    // Вставляет лиса в контейнер, возвращает его <svg>.
    mount: function (el, o) { cancelRun(el); return put(el, markup(o)); },

    // Размытая тень с «?» до решения.
    shadow: function (el) { cancelRun(el); return put(el, G.art.shadow); },

    // Друг: плоский силуэт. Если рисунка нет, запасной эмодзи.
    friend: function (el, avatar, emoji) {
      cancelRun(el);
      if (G.art.friends && G.art.friends[avatar]) return put(el, G.art.friends[avatar]);
      return put(el, '<div class="portrait">' + (emoji || '🙂') + '</div>');
    },

    // Гэг «разоблачён»: всё, что надето, слетает, лис «сдаётся» (surrender).
    unmask: function (el) {
      var svg = el.firstElementChild;
      var worn = svg ? Array.prototype.slice.call(svg.querySelectorAll('.it')) : [];
      var anims = worn.map(function (g, i) {
        g.style.transformBox = 'fill-box';
        g.style.transformOrigin = 'center';
        if (!g.animate) return null;
        var sheep = g.classList.contains('it-sheep');
        var dir = i % 2 ? 1 : -1;
        var frames = sheep
          ? [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(28px)', opacity: 0 }]
          : [{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
             { transform: 'translate(' + dir * 10 + 'px,-30px) rotate(' + dir * 35 + 'deg)', opacity: 1, offset: 0.45 },
             { transform: 'translate(' + dir * 30 + 'px,40px) rotate(' + dir * 120 + 'deg)', opacity: 0 }];
        return g.animate(frames, { duration: sheep ? 700 : 820, delay: i * 70, easing: 'ease-in', fill: 'forwards' });
      });
      return waitAll(anims, 1400).then(function () {
        var s = put(el, markup({ pose: 'surrender' }));
        shake(s);
      });
    },

    // Лис убегает обиженный (indignant), на полпути оглядывается (default) и убегает дальше.
    runAway: function (el) {
      cancelRun(el);
      var token = el._ft;
      function alive() { return el._ft === token; }
      function run(from, to, ms) {
        var s = put(el, markup({ pose: 'indignant' }));
        s.style.transformOrigin = '50% 100%';
        if (!s.animate) return sleep(ms);
        function f(x, y) { return 'translate(' + x + '%,' + y + '%) scaleX(-1)'; }
        var hops = Math.max(2, Math.round(ms / 330)), frames = [], k;
        for (k = 0; k <= hops * 2; k++) frames.push({ transform: f(from + (to - from) * k / (hops * 2), k % 2 ? -7 : 0) });
        var a = s.animate(frames, { duration: ms, easing: 'linear', fill: 'forwards' });
        return waitAll([a], ms + 300);
      }
      return run(0, -42, 1000).then(function () {
        if (!alive()) return;
        var s = put(el, markup({ pose: 'default' })); // обернулся
        s.style.transform = 'translateX(-42%)';
        return sleep(800);
      }).then(function () {
        if (!alive()) return;
        return run(-42, -160, 1400);
      }).then(function () {
        if (alive()) el.innerHTML = '';
      });
    },

    // Лис как картинка для canvas (плакат). Возвращает Promise<Image>.
    image: function (o) {
      return new Promise(function (resolve, reject) {
        var str = markup(o).replace('<svg ', '<svg width="352" height="496" ');
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = reject;
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
      });
    }
  };
})(window.G);
