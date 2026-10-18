/* Книга стража: правила и карточки жителей. Растёт от волны к волне.
   Открывается сама в начале волны (там подсвечены новые правила) и по кнопке 📖.
   Всё содержимое берётся из content.json (rules, residents). */
(function (G) {
  'use strict';

  var el = null;
  var isOpen = false;

  function boot() { el = document.getElementById('book'); }

  function row(cls, emoji, html) {
    var d = document.createElement('div');
    d.className = cls;
    d.innerHTML = '<span class="b-emoji">' + emoji + '</span><span class="b-text">' + html + '</span>';
    return d;
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
  }

  // Лист книги уменьшается и летит в центр кнопки target, фон затухает. Если анимации недоступны, просто закрываем.
  function flyTo(target) {
    var sheet = el.querySelector('.sheet');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!sheet.animate || reduce) return Promise.resolve();
    var sr = sheet.getBoundingClientRect();
    var tr = target.getBoundingClientRect();
    // сдвиг между центрами считаем на экране и переводим в систему координат повёрнутого интерфейса
    var d = G.rot.toLocal((tr.left + tr.width / 2) - (sr.left + sr.width / 2), (tr.top + tr.height / 2) - (sr.top + sr.height / 2));
    var dx = d.x, dy = d.y;
    var s = Math.max(target.offsetWidth / sheet.offsetWidth, 0.05); // размеры без учёта поворота
    return new Promise(function (resolve) {
      var a = sheet.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
        { transform: 'translate(0,0) scale(.93)', opacity: 1, offset: 0.14 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: 0.2, offset: 1 }
      ], { duration: 760, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' });
      var b = el.animate([{ backgroundColor: 'rgba(22,19,31,.5)' }, { backgroundColor: 'rgba(22,19,31,0)' }], { duration: 760, fill: 'forwards' });
      var ended = false;
      function end() { if (ended) return; ended = true; a.cancel(); b.cancel(); resolve(); }
      a.onfinish = end;
      setTimeout(end, 1000); // на случай, если onfinish не придёт
    });
  }

  function pingButton(target) {
    target.classList.remove('ping');
    void target.offsetWidth;
    target.classList.add('ping');
    setTimeout(function () { target.classList.remove('ping'); }, 2000);
  }

  G.book = {
    introDone: false,
    isOpen: function () { return isOpen; },

    // o: { heading, sub, wave, markNew }. Promise завершается, когда ребёнок закрыл книгу.
    open: function (o) {
      if (!el) boot();
      var c = G.content.data;
      var wave = o.wave || 1;

      document.getElementById('book-title').textContent = o.heading || 'Книга стража';
      var sub = document.getElementById('book-sub');
      sub.textContent = o.sub || '';
      sub.hidden = !o.sub;

      var rules = document.getElementById('book-rules');
      rules.innerHTML = '';
      (c.rules || []).filter(function (r) { return r.wave <= wave; }).forEach(function (r) {
        var isNew = o.markNew && r.wave === wave;
        var ico = r.icon && G.ui.icon(r.icon);
        var d = row('rule' + (isNew ? ' new' : ''), ico ? '<span class="b-ico">' + ico + '</span>' : r.emoji,
                    esc(r.text) + (isNew ? ' <b class="badge-new">НОВОЕ</b>' : ''));
        rules.appendChild(d);
      });

      var res = document.getElementById('book-residents');
      res.innerHTML = '';
      var list = (c.residents || []).filter(function (r) { return r.fromWave <= wave; });
      document.getElementById('book-res-head').hidden = !list.length; // жители появляются со 2-й волны
      list.forEach(function (r) {
        var facts = r.facts.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
        var face = (G.art.friends && G.art.friends[r.avatar]) ? '<span class="b-bust">' + G.art.friends[r.avatar] + '</span>' : '<span class="b-emoji">' + r.emoji + '</span>';
        var card = document.createElement('div');
        card.className = 'res-card';
        card.innerHTML = face + '<b>' + esc(r.name) + '</b><ul>' + facts + '</ul>';
        res.appendChild(card);
      });

      el.hidden = false;
      isOpen = true;
      el.querySelector('.sheet').scrollTop = 0;

      return new Promise(function (resolve) {
        var btn = document.getElementById('book-btn');
        function finish() {
          el.hidden = true;
          isOpen = false;
          resolve();
        }
        function done() {
          btn.removeEventListener('click', done);
          G.audio.sfx('tap');
          // Первый раз: книга «улетает» в свою кнопку 📖, чтобы ребёнок запомнил, что это и где.
          if (o.flyTo && !G.book.introDone) {
            G.book.introDone = true;
            flyTo(o.flyTo).then(function () { finish(); pingButton(o.flyTo); });
          } else {
            finish();
          }
        }
        btn.addEventListener('click', done);
      });
    }
  };
})(window.G);
