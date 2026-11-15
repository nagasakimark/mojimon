// Mojimon particle effects on one canvas laid over the whole stage (1920x1080 coordinates).
(function () {
  var cv, cx, parts = [], bolts = [], rings = [], running = false;
  var TAU = Math.PI * 2;

  function init(canvas) { cv = canvas; cx = cv.getContext("2d"); }
  function R(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function add(p) {
    p.age = 0; p.rot = p.rot || R(0, TAU); p.vr = p.vr === undefined ? R(-6, 6) : p.vr;
    p.drag = p.drag === undefined ? 0.98 : p.drag; p.g = p.g || 0; p.fade = p.fade === undefined ? true : p.fade;
    parts.push(p); start();
  }
  function start() { if (!running) { running = true; requestAnimationFrame(loop); } }

  // ---- public effects ----
  function burst(x, y, o) {
    o = o || {};
    var n = o.count || 24, cols = o.colors || ["#ffd52e", "#ff6b6b", "#4cc9f0", "#7bed6f", "#fff"];
    for (var i = 0; i < n; i++) {
      var a = o.angle !== undefined ? o.angle + R(-(o.spread || 0.6), o.spread || 0.6) : R(0, TAU);
      var sp = R(o.speedMin || 4, o.speed || 14);
      add({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: R(o.sizeMin || 10, o.size || 26),
        color: pick(cols), shape: o.shape || pick(["star", "circle", "confetti"]), life: R(0.6, 1) * (o.life || 1.1),
        g: o.gravity || 0, drag: o.drag || 0.94, glow: o.glow });
    }
  }
  function ring(x, y, o) {
    o = o || {};
    rings.push({ x: x, y: y, r: o.r0 || 20, r1: o.r || 220, w: o.width || 18, color: o.color || "#fff", life: o.life || 0.5, age: 0 });
    start();
  }
  // particles flying from (x0,y0) to (x1,y1)
  function stream(x0, y0, x1, y1, o) {
    o = o || {};
    var n = o.count || 30, dur = o.time || 0.5, cols = o.colors || ["#ffd52e"];
    for (var i = 0; i < n; i++) {
      (function (i) {
        var delay = (i / n) * (o.spreadTime || 0.35);
        var p = { x: x0, y: y0, tx: x1 + R(-30, 30), ty: y1 + R(-30, 30), sx: x0 + R(-25, 25), sy: y0 + R(-25, 25),
          arc: R(-1, 1) * (o.wobble || 60), size: R(o.sizeMin || 14, o.size || 30), color: pick(cols),
          shape: o.shape || "circle", life: dur + delay, delay: delay, travel: dur, vx: 0, vy: 0, homing: true, glow: o.glow, vr: R(-8, 8) };
        add(p);
      })(i);
    }
  }
  // particles sucked from an area into a point (used when catching)
  function converge(x, y, w, h, tx, ty, o) {
    o = o || {};
    var n = o.count || 50, cols = o.colors || ["#fff", "#bff3ff", "#ffe98a"];
    for (var i = 0; i < n; i++) {
      var sx = x + R(0, w), sy = y + R(0, h), delay = R(0, 0.35);
      add({ x: sx, y: sy, sx: sx, sy: sy, tx: tx, ty: ty, arc: R(-80, 80), size: R(8, 22), color: pick(cols),
        shape: "circle", life: 0.55 + delay, delay: delay, travel: 0.55, homing: true, glow: true, vx: 0, vy: 0 });
    }
  }
  function confettiRain(seconds) {
    var cols = ["#ff5a5f", "#ffd52e", "#2ec4b6", "#4c8dff", "#ff9f1c", "#b16cff", "#7bed6f"];
    var t = 0, iv = setInterval(function () {
      t += 0.05;
      for (var i = 0; i < 6; i++) add({ x: R(0, 1920), y: R(-80, -20), vx: R(-2, 2), vy: R(4, 9), size: R(16, 30), color: pick(cols),
        shape: "confetti", life: 3.2, g: 0.08, drag: 0.995, fade: false, vr: R(-10, 10) });
      if (t > seconds) clearInterval(iv);
    }, 50);
  }
  function bolt(x0, y0, x1, y1, o) {
    o = o || {};
    var pts = [], segs = 12;
    for (var i = 0; i <= segs; i++) {
      var t = i / segs;
      pts.push([x0 + (x1 - x0) * t + (i && i < segs ? R(-60, 60) : 0), y0 + (y1 - y0) * t]);
    }
    bolts.push({ pts: pts, life: o.life || 0.45, age: 0, color: o.color || "#fff27a" });
    start();
  }

  // ---- drawing ----
  function star(s) {
    cx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? s * 0.45 : s, a = i * Math.PI / 5 - Math.PI / 2;
      cx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    cx.closePath(); cx.fill();
  }

  var last = 0;
  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
    var k = dt * 60;
    cx.clearRect(0, 0, 1920, 1080);

    // rings
    for (var i = rings.length - 1; i >= 0; i--) {
      var g = rings[i]; g.age += dt;
      var t = g.age / g.life; if (t >= 1) { rings.splice(i, 1); continue; }
      var e = 1 - Math.pow(1 - t, 3);
      cx.globalAlpha = 1 - t; cx.strokeStyle = g.color; cx.lineWidth = g.w * (1 - t) + 2;
      cx.beginPath(); cx.arc(g.x, g.y, g.r + (g.r1 - g.r) * e, 0, TAU); cx.stroke();
    }
    // bolts
    for (i = bolts.length - 1; i >= 0; i--) {
      var b = bolts[i]; b.age += dt;
      if (b.age >= b.life) { bolts.splice(i, 1); continue; }
      var flick = Math.random() < 0.3 ? 0.4 : 1;
      cx.globalAlpha = (1 - b.age / b.life) * flick;
      cx.lineJoin = "round"; cx.lineCap = "round";
      [[30, "rgba(255,240,120,.35)"], [14, b.color], [5, "#fff"]].forEach(function (L) {
        cx.strokeStyle = L[1]; cx.lineWidth = L[0];
        cx.beginPath(); b.pts.forEach(function (p, j) { if (j) cx.lineTo(p[0], p[1]); else cx.moveTo(p[0], p[1]); }); cx.stroke();
      });
    }
    // particles
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      if (p.homing) {
        if (p.age < p.delay) continue;
        var q = Math.min(1, (p.age - p.delay) / p.travel), ee = q * q * (3 - 2 * q);
        var ox = p.x, oy = p.y;
        p.x = p.sx + (p.tx - p.sx) * ee + Math.sin(q * Math.PI) * p.arc;
        p.y = p.sy + (p.ty - p.sy) * ee - Math.sin(q * Math.PI) * Math.abs(p.arc) * 0.6;
        p.vx = p.x - ox; p.vy = p.y - oy;
        if (q >= 1) { parts.splice(i, 1); continue; }
      } else {
        p.vx *= Math.pow(p.drag, k); p.vy = p.vy * Math.pow(p.drag, k) + p.g * k;
        p.x += p.vx * k; p.y += p.vy * k;
      }
      p.rot += p.vr * dt;
      var life = p.age / p.life;
      cx.globalAlpha = p.fade ? Math.min(1, (1 - life) * 1.6) : 1;
      cx.fillStyle = p.color;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
      var s = p.size * (p.fade ? (1 - life * 0.5) : 1);
      if (p.glow) {
        cx.globalCompositeOperation = "lighter";
        cx.globalAlpha *= 0.35; cx.beginPath(); cx.arc(0, 0, s * 1.6, 0, TAU); cx.fill();
        cx.globalAlpha /= 0.35;
      }
      if (p.shape === "star") star(s);
      else if (p.shape === "confetti") { cx.scale(1, Math.cos(p.age * 8)); cx.fillRect(-s / 2, -s / 3, s, s * 0.66); }
      else if (p.shape === "bubble") {
        cx.strokeStyle = p.color; cx.lineWidth = 4; cx.globalAlpha *= 0.9;
        cx.beginPath(); cx.arc(0, 0, s, 0, TAU); cx.stroke();
        cx.fillStyle = "rgba(255,255,255,.7)"; cx.beginPath(); cx.arc(-s * 0.35, -s * 0.35, s * 0.25, 0, TAU); cx.fill();
      }
      else if (p.shape === "flame") {
        cx.globalCompositeOperation = "lighter";
        cx.beginPath(); cx.arc(0, 0, s, 0, TAU); cx.fill();
      }
      else { cx.beginPath(); cx.arc(0, 0, s / 2, 0, TAU); cx.fill(); }
      cx.restore();
      cx.globalCompositeOperation = "source-over";
    }
    cx.globalAlpha = 1;
    if (parts.length || rings.length || bolts.length) requestAnimationFrame(loop);
    else { running = false; last = 0; cx.clearRect(0, 0, 1920, 1080); }
  }

  function clear() { parts = []; rings = []; bolts = []; }

  window.FX = { init: init, burst: burst, ring: ring, stream: stream, converge: converge, confettiRain: confettiRain, bolt: bolt, clear: clear };
})();
