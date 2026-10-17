/* Общее пространство имён и мелкие помощники.
   Синтаксис ES2017, без опциональной цепочки и оператора слияния: на Android 8 WebView может быть старым. */
(function () {
  'use strict';

  var G = window.G = window.G || {};

  G.config = {
    debug: /[?&]debug=1/.test(location.search),
    // Для загрузки контента с CDN организаторов сюда ставится базовый адрес. Пусто = рядом с игрой.
    contentBase: ''
  };

  G.$ = function (sel, root) { return (root || document).querySelector(sel); };
  G.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  G.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  G.rand = function (lo, hi) { return lo + Math.random() * (hi - lo); };
  G.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  G.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  G.log = function () {
    if (G.config.debug && window.console) console.log.apply(console, arguments);
  };

  // Мелкий отладочный лог на экране телефона (включается ?debug=1).
  G.debugLine = function (text) {
    if (!G.config.debug) return;
    var box = document.getElementById('debug-log');
    if (!box) {
      box = document.createElement('div');
      box.id = 'debug-log';
      document.body.appendChild(box);
    }
    box.textContent += text + '\n';
    box.scrollTop = box.scrollHeight;
  };
})();
