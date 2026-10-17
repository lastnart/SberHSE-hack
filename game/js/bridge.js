/* Канал «страница → приложение». Контракт из README песочниц.
   Пять событий, канал односторонний. Вибрация и шаринг только отсюда:
   встроенные браузерные вибрация и шаринг в приложении не работают. */
(function (G) {
  'use strict';

  var completedSent = false;

  function post(msg) {
    G.log('[bridge]', msg.type);
    G.debugLine('→ ' + msg.type);
    try {
      window.postMessage(msg, '*');
    } catch (e) {
      G.log('[bridge] postMessage failed', e);
    }
  }

  G.bridge = {
    // Закрыть экран игры.
    close: function () { post({ type: 'CLOSE_EVENT' }); },

    // Игра завершена, не обязательно успешно.
    finish: function () { post({ type: 'FINISH_EVENT' }); },

    // Игра пройдена, засчитывается прогресс. Отправляется один раз за открытие.
    completed: function () {
      if (completedSent) return;
      completedSent = true;
      post({ type: 'COMPLETED_EVENT' });
    },

    // Тактильный отклик средствами платформы.
    vibrate: function () { post({ type: 'VIBRATION_EVENT' }); },

    // Системное «поделиться». Нужно хотя бы одно из полей: text или image (data URL).
    share: function (opts) {
      opts = opts || {};
      if (!opts.text && !opts.image) {
        G.log('[bridge] SHARING_EVENT без содержимого, пропущено');
        return;
      }
      var msg = { type: 'SHARING_EVENT' };
      if (opts.text) msg.text = opts.text;
      if (opts.image) msg.image = opts.image;
      post(msg);
    },

    // Для повторной партии в том же открытии COMPLETED_EVENT не шлём повторно.
    wasCompleted: function () { return completedSent; }
  };
})(window.G);
