/* Звук синтезируется через WebAudio: файлов нет, вес нулевой.
   По умолчанию выключен. Включается только нажатием кнопки (требование брифа). */
(function (G) {
  'use strict';

  var ctx = null;
  var on = false;

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    return ctx;
  }

  // freq, длительность, тип волны, громкость, задержка, конечная частота (глиссандо)
  function tone(freq, dur, type, vol, delay, slideTo) {
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  var presets = {
    tap: function () { tone(520, 0.06, 'triangle', 0.1); },
    type: function () { tone(900, 0.022, 'square', 0.025); },
    ok: function () { tone(523, 0.1, 'triangle', 0.16); tone(784, 0.16, 'triangle', 0.16, 0.09); },
    // Мягкий «плюх» вместо резкого сигнала ошибки.
    bad: function () { tone(300, 0.22, 'sine', 0.16, 0, 160); },
    win: function () {
      tone(523, 0.12, 'triangle', 0.16);
      tone(659, 0.12, 'triangle', 0.16, 0.12);
      tone(784, 0.12, 'triangle', 0.16, 0.24);
      tone(1047, 0.3, 'triangle', 0.16, 0.36);
    }
  };

  G.audio = {
    isOn: function () { return on; },

    // Вызывать из обработчика нажатия: браузер разрешает звук только после жеста.
    setOn: function (v) {
      on = !!v;
      if (on) { ensure(); presets.tap(); }
      G.$$('[data-sound-btn]').forEach(function (b) { b.textContent = on ? '🔊' : '🔇'; });
    },

    toggle: function () { G.audio.setOn(!on); },

    sfx: function (name) {
      if (!on || !presets[name]) return;
      presets[name]();
    }
  };
})(window.G);
