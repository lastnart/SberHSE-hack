/* Игровой цикл на requestAnimationFrame.
   Останавливается, когда страница скрыта: на слабых телефонах не жжём батарею. */
(function (G) {
  'use strict';

  // update(dt) где dt в секундах (не больше 0.05), render() необязательна.
  G.loop = function (update, render) {
    var wanted = false;   // хотим, чтобы цикл работал
    var active = false;   // кадры реально идут
    var last = 0, raf = 0;

    function frame(now) {
      if (!active) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      if (render) render();
      raf = requestAnimationFrame(frame);
    }

    function spin() {
      if (active || document.hidden) return;
      active = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function halt() {
      active = false;
      cancelAnimationFrame(raf);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) halt();
      else if (wanted) spin();
    });

    return {
      start: function () { wanted = true; spin(); },
      stop: function () { wanted = false; halt(); },
      isRunning: function () { return active; }
    };
  };
})(window.G);
