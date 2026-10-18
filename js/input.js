/* Единый ввод на Pointer Events: перетаскивание, тап и свайп-карточка. */
(function (G) {
  'use strict';

  // Перетаскивание элемента. handlers: onStart(x, y), onMove(dx, dy, x, y), onEnd(dx, dy, x, y).
  function drag(el, handlers) {
    var id = null, sx = 0, sy = 0, dx = 0, dy = 0;

    function down(e) {
      if (id !== null) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; dx = 0; dy = 0;
      try { el.setPointerCapture(id); } catch (_) { /* не критично */ }
      if (handlers.onStart) handlers.onStart(sx, sy);
    }
    function move(e) {
      if (e.pointerId !== id) return;
      var l = G.rot.toLocal(e.clientX - sx, e.clientY - sy); // с учётом контр-поворота
      dx = l.x; dy = l.y;
      if (handlers.onMove) handlers.onMove(dx, dy, e.clientX, e.clientY);
    }
    function up(e) {
      if (e.pointerId !== id) return;
      id = null;
      if (handlers.onEnd) handlers.onEnd(dx, dy, e.clientX, e.clientY);
    }

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    return {
      destroy: function () {
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
      }
    };
  }

  // Карточка, которую тянут влево/вправо. Отпустили далеко: карточка возвращается на место,
  // а решение приходит сразу в onSwipe(dir), где dir = -1 | 1 (карточка нужна на экране для разбора).
  // Короткое касание без сдвига: onTap(element, x, y) с элементом под пальцем (даже при захвате указателя).
  // opts: threshold, onMove(dx), onSwipe(dir), onTap(el).
  function swipeCard(el, opts) {
    var threshold = opts.threshold || 90;
    var TAP = 14; // палец на экране дрожит, меньший порог превращал тапы в «ничего»
    var enabled = true;

    function put(x, rot, animate) {
      el.style.transition = animate ? 'transform .22s ease-out' : 'none';
      el.style.transform = 'translateX(' + x + 'px) rotate(' + rot + 'deg)';
    }

    var d = drag(el, {
      onStart: function () { if (enabled) put(0, 0, false); },
      onMove: function (dx) {
        if (!enabled) return;
        put(dx, dx / 22, false);
        if (opts.onMove) opts.onMove(dx);
      },
      onEnd: function (dx, dy, x, y) {
        if (!enabled) return;
        put(0, 0, true);
        if (opts.onMove) opts.onMove(0);
        if (Math.abs(dx) < TAP && Math.abs(dy) < TAP) {
          if (opts.onTap) opts.onTap(document.elementFromPoint(x, y), x, y);
          return;
        }
        if (Math.abs(dx) >= threshold && opts.onSwipe) opts.onSwipe(dx > 0 ? 1 : -1);
      }
    });

    return {
      trigger: function (dir) { if (enabled && opts.onSwipe) opts.onSwipe(dir); }, // то же самое по кнопке
      enable: function (v) { enabled = v !== false; if (!enabled) { put(0, 0, true); if (opts.onMove) opts.onMove(0); } },
      reset: function () { put(0, 0, false); },
      destroy: d.destroy
    };
  }

  G.input = { drag: drag, swipeCard: swipeCard };
})(window.G);
