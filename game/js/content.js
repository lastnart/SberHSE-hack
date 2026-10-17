/* Загрузка контента (уровни, тексты, сценарии) как данных.
   Правило ТЗ: пустой или битый конфиг не должен ломать игру,
   поэтому load() никогда не падает и при любой проблеме отдаёт запасной вариант. */
(function (G) {
  'use strict';

  var TIMEOUT_MS = 4000;

  function withTimeout(path) {
    var url = G.config.contentBase + path;
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  G.content = {
    data: null,
    source: 'none',

    // path: относительный путь к JSON. fallback: встроенный набор. validate(data) -> bool.
    load: function (path, fallback, validate) {
      var ok = validate || function (d) { return !!d; };
      return withTimeout(path).then(function (data) {
        if (!ok(data)) throw new Error('не прошёл проверку');
        G.content.data = data;
        G.content.source = 'file';
        return data;
      }).catch(function (err) {
        G.log('[content] запасной набор:', err && err.message);
        G.content.data = fallback;
        G.content.source = 'fallback';
        return fallback;
      });
    }
  };
})(window.G);
