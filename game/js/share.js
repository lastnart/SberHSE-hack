/* Карточка результата для SHARING_EVENT. Рисуем на canvas, отдаём data URL.
   Это главный носитель виральности: красивая картинка, которую хочется отправить. */
(function (G) {
  'use strict';

  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Перенос текста по ширине. Возвращает y после последней строки.
  function wrapText(ctx, text, x, y, maxW, lineH) {
    var words = String(text).split(' '), line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        line = words[i];
        y += lineH;
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, x, y); y += lineH; }
    return y;
  }

  G.share = {
    FONT: FONT,
    roundRect: roundRect,
    wrapText: wrapText,

    // draw(ctx, w, h) рисует карточку. Возвращает data URL (PNG, 720x960).
    card: function (draw) {
      var c = document.createElement('canvas');
      c.width = 720; c.height = 960;
      var ctx = c.getContext('2d');
      draw(ctx, c.width, c.height);
      return c.toDataURL('image/png');
    },

    // Отправка: текст + картинка. Если картинку собрать не удалось, делимся одним текстом.
    send: function (text, draw) {
      var image = null;
      try { if (draw) image = G.share.card(draw); } catch (e) { G.log('[share] card failed', e); }
      G.bridge.share({ text: text, image: image });
    },

    // То же, но рисование может быть асинхронным (например, загрузка картинки с лисом).
    // draw(ctx, w, h) возвращает Promise или ничего. Формат JPEG: плакат с градиентом получается заметно легче PNG.
    sendAsync: function (text, draw) {
      var c = document.createElement('canvas');
      c.width = 720; c.height = 960;
      var ctx = c.getContext('2d');
      return Promise.resolve()
        .then(function () { return draw(ctx, c.width, c.height); })
        .then(function () { return c.toDataURL('image/jpeg', 0.88); })
        .catch(function (e) { G.log('[share] poster failed', e); return null; })
        .then(function (image) { G.bridge.share({ text: text, image: image }); });
    }
  };
})(window.G);
