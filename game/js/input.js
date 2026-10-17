/* Единый ввод на Pointer Events: перетаскивание и свайп-карточка. */
(function (G) {
  'use strict';

  // Перетаскивание элемента. handlers: onStart(x, y), onMove(dx, dy, x, y), onEnd(dx, dy).
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
      dx = e.clientX - sx; dy = e.clientY - sy;
      if (handlers.onMove) handlers.onMove(dx, dy, e.clientX, e.clientY);
    }
    function up(e) {
      if (e.pointerId !== id) return;
      id = null;
      if (handlers.onEnd) handlers.onEnd(dx, dy);
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

  // Карточка, которую тянут влево/вправо. opts: threshold, onMove(dx), onSwipe(dir) где dir = -1 | 1.
  function swipeCard(el, opts) {
    var threshold = opts.threshold || 90;
    var busy = false;

    function put(x, rot, animate) {
      el.style.transition = animate ? 'transform .22s ease-out' : 'none';
      el.style.transform = 'translateX(' + x + 'px) rotate(' + rot + 'deg)';
    }

    function fling(dir) {
      if (busy) return;
      busy = true;
      put(dir * window.innerWidth * 1.1, dir * 24, true);
      setTimeout(function () { busy = false; opts.onSwipe(dir); }, 200);
    }

    var d = drag(el, {
      onStart: function () { if (!busy) put(0, 0, false); },
      onMove: function (dx) {
        if (busy) return;
        put(dx, dx / 18, false);
        if (opts.onMove) opts.onMove(dx);
      },
      onEnd: function (dx) {
        if (busy) return;
        if (Math.abs(dx) >= threshold) {
          fling(dx > 0 ? 1 : -1);
        } else {
          put(0, 0, true);
          if (opts.onMove) opts.onMove(0);
        }
      }
    });

    return {
      fling: fling, // то же самое по кнопке
      reset: function () { busy = false; put(0, 0, false); if (opts.onMove) opts.onMove(0); },
      destroy: d.destroy
    };
  }

  G.input = { drag: drag, swipeCard: swipeCard };
})(window.G);
