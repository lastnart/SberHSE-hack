/* «Блокировка» портрета без попапов. Из веб-страницы настоящую блокировку ориентации не поставить
   (screen.orientation.lock в WebView не работает), поэтому делаем то, что видел бы ребёнок при настоящей:
   когда телефон лёг на бок, игра остаётся «приклеенной» к корпусу и не перестраивается.
   Для этого весь интерфейс (#rot) поворачивается обратно CSS-трансформом.
   Режим пишется в html[data-rot]: 0, -90, 90 или 180. Для проверки на компьютере: ?rot=ccw | cw | flip. */
(function (G) {
  'use strict';

  var root = document.documentElement;
  var mode = 0;

  function deviceAngle() {
    var a = 0;
    if (window.screen && screen.orientation && typeof screen.orientation.angle === 'number') a = screen.orientation.angle;
    else if (typeof window.orientation === 'number') a = window.orientation;
    return ((a % 360) + 360) % 360;
  }

  function update() {
    var w = window.innerWidth, h = window.innerHeight, a = deviceAngle();
    var forced = /[?&]rot=(ccw|cw|flip)/.exec(location.search);
    var m = 0;
    if (forced) m = forced[1] === 'ccw' ? -90 : (forced[1] === 'cw' ? 90 : 180);
    else if (w > h && h < 500) m = (a === 270) ? 90 : -90; // телефон на боку: поворачиваем интерфейс обратно
    else if (w <= h && a === 180) m = 180;                  // перевёрнутый портрет
    mode = m;

    var sideways = (m === 90 || m === -90);
    var lw = sideways ? h : w; // размеры вёрстки после обратного поворота
    var lh = sideways ? w : h;
    root.setAttribute('data-rot', String(m));
    root.style.setProperty('--vw', (lw / 100) + 'px');
    root.style.setProperty('--vh', (lh / 100) + 'px');
    root.classList.toggle('compact', lh <= 640);
    G.rot.w = lw; G.rot.h = lh;
  }

  G.rot = {
    w: window.innerWidth, h: window.innerHeight,
    mode: function () { return mode; },
    // Сдвиг пальца на экране (dx, dy) переводим в систему координат повёрнутого интерфейса.
    toLocal: function (dx, dy) {
      if (mode === -90) return { x: -dy, y: dx };
      if (mode === 90) return { x: dy, y: -dx };
      if (mode === 180) return { x: -dx, y: -dy };
      return { x: dx, y: dy };
    }
  };

  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', function () { setTimeout(update, 60); });
})(window.G);
