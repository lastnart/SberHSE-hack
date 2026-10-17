/* Менеджер экранов: заставка → игра → итог. Все экраны лежат в index.html,
   тут только переключение и хуки enter/leave. Состояние живёт в памяти. */
(function (G) {
  'use strict';

  var hooks = {};
  var current = null;

  G.screens = {
    // on('play', { enter: function (params) {}, leave: function () {} })
    on: function (name, h) { hooks[name] = h; },

    go: function (name, params) {
      var next = document.getElementById('screen-' + name);
      if (!next) { G.log('[screens] нет экрана', name); return; }
      if (current && hooks[current] && hooks[current].leave) hooks[current].leave();
      G.$$('.screen').forEach(function (s) { s.classList.remove('active'); });
      next.classList.add('active');
      current = name;
      if (hooks[name] && hooks[name].enter) hooks[name].enter(params || {});
    },

    current: function () { return current; }
  };
})(window.G);
