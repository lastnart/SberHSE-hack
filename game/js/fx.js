/* Эффекты «сочности»: конфетти на отдельном canvas, подпрыгивание, встряска.
   Цикл конфетти работает только пока есть частицы, потом останавливается. */
(function (G) {
  'use strict';

  var canvas = null, ctx = null, particles = [], dpr = 1, w = 0, h = 0, loop = null;
  var COLORS = ['#D1F43A', '#7B3FD6', '#FFE45C', '#FFB3D1', '#3EA8F6'];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); // выше 2 на слабых телефонах лишнее
    var root = document.getElementById('rot');
    w = root.clientWidth || window.innerWidth; h = root.clientHeight || window.innerHeight; // размеры вёрстки, не окна
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init() {
    if (canvas) return true;
    canvas = document.getElementById('fx');
    if (!canvas || !canvas.getContext) return false;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    loop = G.loop(update, draw);
    return true;
  }

  function update(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > h + 40) particles.splice(i, 1);
    }
    if (!particles.length) loop.stop();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = G.clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (!particles.length) ctx.clearRect(0, 0, w, h);
  }

  G.fx = {
    size: function () {
      var root = document.getElementById('rot');
      return { w: root.clientWidth || window.innerWidth, h: root.clientHeight || window.innerHeight };
    },

    // Конфетти из точки (x, y); по умолчанию снизу по центру. count держим скромным ради 60 fps.
    confetti: function (opts) {
      if (!init()) return;
      opts = opts || {};
      var x = opts.x != null ? opts.x : w / 2;
      var y = opts.y != null ? opts.y : h * 0.7;
      var count = Math.min(opts.count || 60, 120);
      for (var i = 0; i < count; i++) {
        var a = G.rand(-Math.PI * 0.95, -Math.PI * 0.05);
        var v = G.rand(250, 650);
        particles.push({
          x: x, y: y,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          rot: G.rand(0, 6.28), vr: G.rand(-8, 8),
          s: G.rand(8, 14), life: G.rand(1.2, 2.2),
          color: COLORS[i % COLORS.length]
        });
      }
      loop.start();
    },

    // Пружинка: сжали и отпустили.
    pop: function (el) {
      if (!el.animate) return;
      el.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
        { duration: 220, easing: 'ease-out' }
      );
    },

    // Лёгкая встряска: ошибка выглядит смешно, а не страшно.
    shake: function (el) {
      if (!el.animate) return;
      el.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' },
         { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }],
        { duration: 280, easing: 'ease-out' }
      );
    }
  };
})(window.G);
