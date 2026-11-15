// Mojimon — letter monster battles for the classroom TV.
// Works with a TV remote (arrows + OK), keyboard (arrows, Enter, Space, 1-4), mouse or touch.
(function () {
  "use strict";

  var LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
  var HP_STEPS = [1, 0.66, 0.36, 0.12];       // HP after 0,1,2,3 correct answers — never reaches 0
  var DEFAULT_PARTNER = "lower-m";
  var PRAISE = ["Great!", "Nice!", "Awesome!", "Super!", "Yes!", "Perfect!", "Amazing!"];
  var ATTACKS = ["star", "zap", "flame", "bubble", "tackle"];

  // battle positions (stage pixels)
  var E = { x: 1390, y: 250 }, EF = { x: 1390, y: 455 };   // enemy centre / foot
  var P = { x: 440, y: 500 };                               // partner centre

  function $(id) { return document.getElementById(id); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function idOf(letter, upper) { return (upper ? "upper-" : "lower-") + letter; }
  function isUpper(id) { return id.indexOf("upper-") === 0; }
  function letterOf(id) { return id.charAt(id.length - 1); }
  function nameOf(id) { return isUpper(id) ? letterOf(id).toUpperCase() : letterOf(id); }
  function imgOf(id) { return "img/monsters/" + id + ".webp"; }
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function act(who, cls) {   // play an action animation on a monster's .act layer
    var a = $(who).querySelector(".act");
    a.className = "act"; void a.offsetWidth; if (cls) a.classList.add(cls);
  }

  // ---------- saved data ----------
  function load(key, fallback) { try { var v = localStorage.getItem("mojimon-" + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } }
  function save(key, val) { try { localStorage.setItem("mojimon-" + key, JSON.stringify(val)); } catch (e) {} }

  var S = {
    mode: "upper", words: load("words", true), music: load("music", true),
    caught: load("caught", []), partner: load("partner", null),
    enemy: null, lastEnemy: null, partnerId: null, hits: 0, answers: [], attacks: [],
    busy: false, screen: "title", phase: "", timers: [], typeTimer: null
  };
  Sound.setMusic(S.music);
  FX.init($("fx"));

  function isCaught(id) { return S.caught.indexOf(id) >= 0; }
  function clearTimers() { S.timers.forEach(clearTimeout); S.timers = []; clearInterval(S.typeTimer); }
  function after(ms, fn) { S.timers.push(setTimeout(fn, ms)); }

  // ---------- stage scaling ----------
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var st = $("stage").style;
    st.webkitTransform = st.transform = "scale(" + s + ")";
  }
  window.addEventListener("resize", fit); fit();

  // ---------- screens ----------
  function show(name) {
    clearTimers(); FX.clear();
    S.screen = name; S.phase = "";
    ["title", "reveal", "battle", "dex"].forEach(function (s) { $(s).classList.toggle("active", s === name); });
    if (name === "title") { buildTitle(); Sound.music("title"); focusFirst(); }
    if (name === "dex") { buildDex(); Sound.music("title"); focusFirst(); }
  }

  function wipe(mid, done) {
    var w = $("wipe"); w.innerHTML = ""; w.style.display = "block";
    var bars = [];
    for (var i = 0; i < 9; i++) {
      var b = document.createElement("div");
      b.className = "bar";
      b.style.top = (i * 120) + "px";
      var from = (i % 2 ? 1 : -1) * 1920;
      b.style.webkitTransform = b.style.transform = "translateX(" + from + "px)";
      b.style.webkitTransition = "-webkit-transform .32s ease-in " + (i * 0.03) + "s";
      b.style.transition = "transform .32s ease-in " + (i * 0.03) + "s";
      w.appendChild(b); bars.push([b, from]);
    }
    var ball = document.createElement("img"); ball.src = "img/ball.svg"; ball.className = "wipe-ball"; w.appendChild(ball);
    void w.offsetWidth;
    Sound.play("whoosh");
    bars.forEach(function (x) { x[0].style.webkitTransform = x[0].style.transform = "translateX(0)"; });
    setTimeout(function () { ball.classList.add("on"); }, 300);
    setTimeout(function () {
      mid();
      ball.classList.remove("on");
      bars.forEach(function (x) { x[0].style.webkitTransform = x[0].style.transform = "translateX(" + (-x[1]) + "px)"; });
      setTimeout(function () { w.style.display = "none"; if (done) done(); }, 620);
    }, 820);
  }

  // ---------- title ----------
  function allIds() { var a = []; LETTERS.forEach(function (l) { a.push(idOf(l, true), idOf(l, false)); }); return a; }
  function buildTitle() {
    $("btn-words").innerHTML = "Words: " + (S.words ? "ON" : "OFF") + ' <span class="jp">ことば</span>';
    $("btn-words").classList.toggle("off", !S.words);
    $("btn-music").innerHTML = "Music: " + (S.music ? "ON" : "OFF") + ' <span class="jp">おんがく</span>';
    $("btn-music").classList.toggle("off", !S.music);
    $("btn-dex-title").innerHTML = "Mojidex " + S.caught.length + '/52 <span class="jp">ずかん</span>';
    var parade = $("title-parade"); parade.innerHTML = "";
    var ids = shuffle(S.caught.length >= 8 ? S.caught : allIds()).slice(0, 8);
    for (var r = 0; r < 2; r++) ids.forEach(function (id, i) {
      var im = document.createElement("img");
      im.src = imgOf(id);
      im.style.left = (r * 2080 + 40 + i * 260) + "px";
      im.style.webkitAnimationDelay = im.style.animationDelay = (i * 0.11) + "s";
      parade.appendChild(im);
    });
  }

  // ---------- choosing monsters ----------
  function poolFor(mode) {
    var a = [];
    LETTERS.forEach(function (l) {
      if (mode !== "lower") a.push(idOf(l, true));
      if (mode !== "upper") a.push(idOf(l, false));
    });
    return a;
  }
  function chooseEnemy() {
    var pool = poolFor(S.mode).filter(function (id) { return id !== S.lastEnemy; });
    var fresh = pool.filter(function (id) { return !isCaught(id); });
    return fresh.length && Math.random() < 0.75 ? pick(fresh) : pick(pool);
  }
  function choosePartner(enemy) {
    var L = letterOf(enemy);
    if (S.partner && isCaught(S.partner) && letterOf(S.partner) !== L) return S.partner;
    var others = S.caught.filter(function (id) { return letterOf(id) !== L; });
    if (others.length) return others[others.length - 1];
    return L === "m" ? "lower-o" : DEFAULT_PARTNER;
  }

  // ================= REVEAL =================
  function startEncounter(mode) {
    if (mode) S.mode = mode;
    S.busy = true;
    S.enemy = chooseEnemy(); S.lastEnemy = S.enemy;
    wipe(function () { show("reveal"); setupReveal(); }, introReveal);
  }

  function setupReveal() {
    $("rv-img").src = imgOf(S.enemy);
    $("rv-mon").classList.add("hidden");
    $("rv-card").classList.remove("flipped");
    $("rv-letter").textContent = nameOf(S.enemy);
    $("rv-its").classList.remove("show");
    $("btn-reveal").style.visibility = "visible";
    document.querySelector(".rv-hint").style.visibility = "visible";
    S.phase = "reveal-intro";
  }

  function introReveal() {
    Sound.music("mystery");
    $("rv-mon").classList.remove("hidden");
    act("rv-mon", "a-appear");
    after(550, function () { Sound.play("appear"); FX.ring(760, 560, { r: 420, color: "#fff", width: 30, life: 0.6 }); });
    after(700, function () { S.phase = "reveal-wait"; S.busy = false; $("btn-reveal").focus(); });
  }

  var lastAdvance = 0;
  function revealAdvance() {
    var now = Date.now(); if (now - lastAdvance < 350) return; lastAdvance = now;
    Sound.unlock();
    if (S.phase === "reveal-wait") doReveal();
    else if (S.phase === "revealed") goBattle();
  }

  function doReveal() {
    S.phase = "revealing";
    $("btn-reveal").style.visibility = "hidden";
    document.querySelector(".rv-hint").style.visibility = "hidden";
    Sound.pauseMusic();
    Sound.play("drumroll");
    restart($("rv-card"), "shake");
    after(820, function () {
      $("rv-card").classList.add("flipped");
      Sound.play("tada");
      act("rv-mon", "a-reveal");
      after(250, function () {
        FX.burst(1470, 540, { count: 40, speed: 22, size: 34, gravity: 0.25, life: 1.4 });
        FX.ring(1470, 540, { r: 380, color: "#ffd52e", width: 34 });
        FX.burst(760, 520, { count: 18, shape: "star", colors: ["#ffd52e", "#fff"], speed: 14 });
      });
      $("rv-its").innerHTML = "It's <span class=\"big\">" + nameOf(S.enemy) + "</span> !";
      after(350, function () { $("rv-its").classList.add("show"); S.phase = "revealed"; });
      after(3000, function () { if (S.phase === "revealed") goBattle(); });
    });
  }

  function goBattle() {
    S.phase = "to-battle"; S.busy = true;
    wipe(function () { show("battle"); setupBattle(); }, introBattle);
  }

  // ================= BATTLE =================
  function setupBattle() {
    var e = S.enemy;
    S.hits = 0; S.busy = true;
    S.answers = shuffle(MOJI_WORDS[letterOf(e)]);
    S.attacks = shuffle(ATTACKS).slice(0, 3);
    S.partnerId = choosePartner(e);

    $("enemy-img").src = imgOf(e); $("partner-img").src = imgOf(S.partnerId);
    act("enemy", ""); act("partner", "");
    $("partner").classList.add("hidden");
    $("enemy").classList.remove("hidden");
    $("dizzy").classList.remove("show");
    ["enemy-side", "partner-side"].forEach(function (id) { $(id).className = "side"; $(id).style.visibility = "hidden"; });
    $("enemy-box").className = "infobox enemy-box hidden";
    $("partner-box").className = "infobox partner-box hidden";
    $("enemy-name").textContent = nameOf(e);
    $("enemy-new").classList.toggle("show", !isCaught(e));
    $("partner-name").textContent = nameOf(S.partnerId);
    $("partner-dex").textContent = S.caught.length;
    setHP(1, true);
    var ball = $("ball"); ball.style.display = "none"; ball.className = "ball-wrap";
    $("result").classList.remove("show");
    $("quiz").classList.remove("show");
    $("actions").classList.remove("show");
    message("");
  }

  function introBattle() {
    var e = S.enemy, pn = nameOf(S.partnerId);
    Sound.music("battle");
    $("enemy-side").style.visibility = "visible"; $("partner-side").style.visibility = "visible";
    $("enemy-side").classList.add("slide-in-l"); $("partner-side").classList.add("slide-in-r");
    after(850, function () {
      $("enemy-box").className = "infobox enemy-box slide-in-l";
      act("enemy", "a-taunt"); Sound.play("taunt");
      message('A wild <span class="big">' + nameOf(e) + '</span> appeared!<span class="jp">やせいの ' + nameOf(e) + ' が あらわれた！</span>');
    });
    after(2700, function () {
      message('Go! <span class="big">' + pn + '</span> !<span class="jp">いけっ！ ' + pn + '！</span>');
      act("partner", "");
      moveBall(-80, 640, P.x, P.y + 40, 260, 650, { spin: 2 }, function () {
        $("ball").style.display = "none";
        Sound.play("pop");
        flash(0.7);
        FX.burst(P.x, P.y, { count: 30, colors: ["#fff", "#bff3ff", "#ffe98a"], speed: 16 });
        FX.ring(P.x, P.y, { r: 300, color: "#fff", width: 26 });
        $("partner").classList.remove("hidden");
        act("partner", "a-release");
        $("partner-box").className = "infobox partner-box slide-in-r";
      });
    });
    after(4500, ask);
  }

  function setHP(frac, instant) {
    var f = $("enemy-hp"), g = $("enemy-ghost"), w = Math.round(468 * frac) + "px";
    if (instant) {
      f.style.webkitTransition = g.style.webkitTransition = f.style.transition = g.style.transition = "none";
      f.style.width = g.style.width = w; void f.offsetWidth;
      f.style.webkitTransition = g.style.webkitTransition = f.style.transition = g.style.transition = "";
    } else { f.style.width = w; g.style.width = w; restart(f.parentNode, "bump"); }
    f.classList.toggle("mid", frac <= 0.7 && frac > 0.3);
    f.classList.toggle("low", frac <= 0.3);
  }

  // Pokémon-style typewriter text
  function message(html) {
    var m = $("msg"), t = $("msg-text");
    clearInterval(S.typeTimer);
    if (!html) { m.classList.remove("show"); m.classList.remove("done"); t.innerHTML = ""; return; }
    m.classList.add("show"); m.classList.remove("done");
    t.innerHTML = html;
    var nodes = [], walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT, null, false), nd;
    while ((nd = walker.nextNode())) { nodes.push({ node: nd, full: nd.nodeValue }); nd.nodeValue = ""; }
    var i = 0, j = 0, tick = 0;
    S.typeTimer = setInterval(function () {
      for (var k = 0; k < 2; k++) {
        if (i >= nodes.length) { clearInterval(S.typeTimer); m.classList.add("done"); return; }
        var o = nodes[i];
        if (j < o.full.length) o.node.nodeValue += o.full.charAt(j++); else { i++; j = 0; }
      }
      if (tick++ % 3 === 0) Sound.play("blip");
    }, 24);
  }

  function flash(strength, color) {
    var f = $("flash");
    f.style.background = color || "#fff";
    f.style.webkitTransition = f.style.transition = "none"; f.style.opacity = strength || 1;
    void f.offsetWidth;
    f.style.webkitTransition = f.style.transition = "opacity .45s"; f.style.opacity = 0;
  }
  function shake(big) { restart($("field"), big ? "shake-big" : "shake"); }

  function praise(text, miss) {
    var p = $("praise");
    p.textContent = text;
    p.className = "praise" + (miss ? " miss" : "");
    void p.offsetWidth; p.classList.add("show");
  }

  // ---------- questions ----------
  function caseWord(w) { return isUpper(S.enemy) ? w.toUpperCase() : w.toLowerCase(); }
  function distractors(L) {
    var bad = (MOJI_CONFUSABLE[L] || "") + L;
    return shuffle(LETTERS.filter(function (x) { return bad.indexOf(x) < 0; })).slice(0, 3)
      .map(function (x) { return pick(MOJI_WORDS[x]); });
  }

  function ask() {
    message("");
    var L = letterOf(S.enemy);
    var answer = S.answers[S.hits % S.answers.length];
    var opts = shuffle([{ w: answer, ok: true }].concat(distractors(L).map(function (w) { return { w: w, ok: false }; })));
    $("q-letter").textContent = nameOf(S.enemy);
    var box = $("cards"); box.innerHTML = "";
    opts.forEach(function (o, i) {
      var b = document.createElement("button");
      b.className = "nav card c" + i + (S.words ? "" : " noword");
      b.style.left = (i * 470) + "px";
      b.style.webkitAnimationDelay = b.style.animationDelay = (i * 0.08) + "s";
      b.innerHTML = '<span class="num">' + (i + 1) + '</span><span class="pic"><img src="img/words/' + o.w[1] + '.svg" alt=""></span><span class="word">' + caseWord(o.w[0]) + "</span>";
      b.addEventListener("click", function () { choose(b, o.ok); });
      box.appendChild(b);
    });
    $("quiz").classList.add("show");
    S.busy = false;
    box.firstChild.focus();
  }

  function mark(card, ok) {
    var svg = ok
      ? '<svg class="mark" viewBox="0 0 230 230"><circle cx="115" cy="115" r="96" stroke="#ff4d4d" stroke-width="22" transform="rotate(-90 115 115)"/></svg>'
      : '<svg class="mark" viewBox="0 0 230 230"><path d="M45,45 L185,185" stroke="#4c6a8a" stroke-width="28"/><path class="l2" d="M185,45 L45,185" stroke="#4c6a8a" stroke-width="28"/></svg>';
    card.insertAdjacentHTML("beforeend", svg);
  }

  function stageXY(el) {
    var r = el.getBoundingClientRect(), s = $("stage").getBoundingClientRect(), k = s.width / 1920;
    return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k };
  }

  function choose(card, ok) {
    if (S.busy || card.disabled) return;
    Sound.unlock();
    if (ok) {
      S.busy = true;
      card.classList.add("right"); mark(card, true);
      [].forEach.call($("cards").children, function (c) { if (c !== card) c.classList.add("fade"); });
      Sound.play("right");
      var c = stageXY(card);
      FX.burst(c.x, c.y - 40, { count: 28, shape: "star", colors: ["#ffd52e", "#fff", "#7bed6f"], speed: 18, gravity: 0.3 });
      praise(pick(PRAISE));
      var type = S.attacks[S.hits] || "tackle";
      after(450, function () { attack(type); });
    } else {
      card.classList.add("wrong"); mark(card, false);
      card.disabled = true;
      Sound.play("wrong");
      after(200, function () { Sound.play("whoosh"); act("enemy", "a-dodge"); praise("Miss!", true); });
      after(800, function () { if (!S.busy) { act("enemy", "a-taunt"); Sound.play("taunt"); } });
      var left = [].filter.call($("cards").children, function (c) { return !c.disabled; });
      if (left.length) left[0].focus();
    }
  }

  // ---------- attacks ----------
  var POW_WORDS = { star: "POW!", zap: "ZAP!", flame: "BOOM!", bubble: "SPLASH!", tackle: "BAM!" };
  var POW_COLORS = { star: ["#ffd52e", "#e2364f"], zap: ["#fff27a", "#3a6fd8"], flame: ["#ffb347", "#d62828"], bubble: ["#bff0ff", "#1f78c8"], tackle: ["#ffd52e", "#e2364f"] };

  function attack(type) {
    var pc = { x: P.x + 60, y: P.y - 40 };
    if (type === "tackle") {
      act("partner", "a-windup");
      after(330, function () { act("partner", "a-lunge"); Sound.play("whoosh"); });
      after(560, function () { impact(type); });
    } else if (type === "zap") {
      act("partner", "a-cast");
      after(320, function () {
        Sound.play("zap");
        FX.bolt(E.x + 40, -40, E.x, E.y + 40);
        after(90, function () { FX.bolt(E.x - 60, -40, E.x - 10, E.y + 20, { life: 0.35 }); });
        flash(0.6, "#fff7a0");
        impact(type);
      });
    } else {
      act("partner", "a-windup");
      after(300, function () {
        act("partner", "a-cast");
        if (type === "star") { Sound.play("star"); FX.stream(pc.x, pc.y, E.x, E.y, { count: 16, shape: "star", colors: ["#ffd52e", "#fff6a0", "#fff"], time: 0.45, size: 40, sizeMin: 22, wobble: 90, glow: true }); }
        if (type === "flame") { Sound.play("flame"); FX.stream(pc.x, pc.y, E.x, E.y, { count: 46, shape: "flame", colors: ["#ff6a00", "#ffb800", "#ff3d00", "#ffd52e"], time: 0.5, size: 46, sizeMin: 18, wobble: 40 }); }
        if (type === "bubble") { Sound.play("bubble"); FX.stream(pc.x, pc.y, E.x, E.y, { count: 24, shape: "bubble", colors: ["#7fdcff", "#bff0ff", "#4cc9f0"], time: 0.55, size: 34, sizeMin: 14, wobble: 110 }); }
      });
      after(880, function () { impact(type); });
    }
  }

  function powSVG(word, cols) {
    var pts = [], n = 18;
    for (var i = 0; i < n * 2; i++) {
      var a = i * Math.PI / n, r = i % 2 ? 0.66 : 1 - Math.random() * 0.12;
      pts.push((220 + Math.cos(a) * 210 * r).toFixed(1) + "," + (160 + Math.sin(a) * 150 * r).toFixed(1));
    }
    return '<svg viewBox="0 0 440 320"><polygon points="' + pts.join(" ") + '" fill="' + cols[0] + '" stroke="' + cols[1] + '" stroke-width="10" stroke-linejoin="round"/>' +
      '<text x="220" y="190" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="' + (word.length > 5 ? 82 : 104) + '" fill="#fff" stroke="' + cols[1] + '" stroke-width="12" paint-order="stroke" stroke-linejoin="round">' + word + "</text></svg>";
  }

  function impact(type) {
    var pow = $("pow");
    pow.innerHTML = powSVG(POW_WORDS[type], POW_COLORS[type]);
    pow.style.left = (E.x - 90 + rnd(60)) + "px"; pow.style.top = (E.y - 60 + rnd(40)) + "px";
    restart(pow, "show");
    Sound.play("hit");
    act("enemy", "a-hit");
    shake(S.hits === 2);
    FX.burst(E.x, E.y, { count: 30, colors: POW_COLORS[type].concat(["#fff"]), speed: 20, gravity: 0.2 });
    FX.ring(E.x, E.y, { r: 260, color: POW_COLORS[type][0], width: 24 });
    S.hits++;
    setHP(HP_STEPS[S.hits]);
    after(1500, function () { if (S.hits >= 3) weak(); else ask(); });
  }

  // ---------- catching ----------
  function weak() {
    $("quiz").classList.remove("show");
    var nm = nameOf(S.enemy);
    act("enemy", "a-dizzy");
    $("dizzy").classList.add("show");
    Sound.play("wobble");
    message('<span class="big">' + nm + '</span> is tired! Throw a Moji-ball!<span class="jp">' + nm + ' は つかれている！ モジボールを なげよう！</span>');
    after(900, function () {
      actions($("actions"), [{ html: '<img src="img/ball.svg" alt="">Throw! <span class="jp">なげる</span>', cls: "throw", fn: throwBall }]);
    });
  }

  function actions(box, list) {
    box.innerHTML = "";
    list.forEach(function (it) {
      var b = document.createElement("button");
      b.className = "nav act-btn" + (it.blue ? " blue" : "") + (it.cls ? " " + it.cls : "");
      b.innerHTML = it.html;
      b.addEventListener("click", function () { if (S.busy) return; Sound.unlock(); Sound.play("select"); it.fn(); });
      box.appendChild(b);
    });
    box.classList.add("show");
    S.busy = false;
    box.firstChild.focus();
  }

  // ball flight: parabola with spin and sparkle trail
  function moveBall(x0, y0, x1, y1, h, ms, o, done) {
    var ball = $("ball"), t0 = null, scr = S.screen;
    ball.style.display = "block";
    function step(ts) {
      if (S.screen !== scr) return;
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / ms);
      var q = o.fall ? p * p : p;
      var x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * q - h * 4 * p * (1 - p);
      ball.style.left = x + "px"; ball.style.top = y + "px";
      var rot = (o.spin || 0) * 360 * p;
      ball.style.webkitTransform = ball.style.transform = "rotate(" + rot + "deg)";
      if (o.trail && Math.random() < 0.6) FX.burst(x, y, { count: 1, shape: "star", colors: ["#fff", "#ffe98a", "#bff3ff"], speed: 2, speedMin: 0, size: 18, sizeMin: 8, life: 0.5 });
      if (p < 1) requestAnimationFrame(step); else if (done) done();
    }
    requestAnimationFrame(step);
  }

  function throwBall() {
    S.busy = true;
    $("actions").classList.remove("show");
    message('Go, Moji-ball!<span class="jp">いけっ！ モジボール！</span>');
    act("partner", "a-windup");
    Sound.play("throwBall");
    var top = { x: E.x, y: 190 };
    moveBall(-80, 640, top.x, top.y + 40, 360, 850, { spin: 3, trail: true }, function () {
      // bonk! the ball pops up and pulls the Mojimon inside
      moveBall(top.x, top.y + 40, top.x, top.y, 50, 220, {}, function () {
        $("ball").classList.add("glow");
        flash(0.9);
        Sound.play("absorb");
        $("dizzy").classList.remove("show");
        act("enemy", "a-absorb");
        FX.converge(E.x - 200, 40, 400, 420, top.x, top.y, { count: 60 });
        FX.ring(top.x, top.y, { r0: 260, r: 10, color: "#fff", width: 20, life: 0.5 });
        after(750, function () {
          $("ball").classList.remove("glow");
          moveBall(top.x, top.y, EF.x, EF.y - 20, -10, 380, { fall: true }, function () {
            land();
            moveBall(EF.x, EF.y - 20, EF.x, EF.y - 20, 60, 300, {}, function () { land(); after(400, function () { wobble(0); }); });
          });
        });
      });
    });
  }

  function land() {
    restart($("ball"), "land");
    Sound.play("wobble");
    FX.burst(EF.x, EF.y + 30, { count: 10, shape: "circle", colors: ["#b5e48c", "#8fd16a", "#e9f5db"], speed: 7, angle: -Math.PI / 2, spread: 1.3, gravity: 0.5, life: 0.6, size: 18 });
  }

  function wobble(k) {
    var ball = $("ball");
    if (k >= 3) { click(); return; }
    restart(ball, "wobble");
    Sound.play("wobble");
    after(250, function () { FX.burst(EF.x, EF.y - 80, { count: 4, shape: "star", colors: ["#fff", "#ffd52e"], speed: 6, size: 18, life: 0.6 }); });
    after(1050, function () { wobble(k + 1); });
  }

  function click() {
    var ball = $("ball");
    ball.classList.remove("wobble"); ball.classList.add("done");
    Sound.play("click");
    FX.burst(EF.x, EF.y - 20, { count: 36, shape: "star", colors: ["#ffd52e", "#fff", "#ffb703"], speed: 20, gravity: 0.25, life: 1.3 });
    FX.ring(EF.x, EF.y - 20, { r: 300, color: "#ffd52e", width: 26 });
    after(500, caught);
  }

  function caught() {
    var e = S.enemy, isNew = !isCaught(e), nm = nameOf(e);
    if (isNew) { S.caught.push(e); save("caught", S.caught); }
    S.partner = e; save("partner", e);
    $("partner-dex").textContent = S.caught.length;
    Sound.pauseMusic();
    Sound.play("caught");
    act("partner", "a-cheer");

    after(700, function () {
      $("res-img").src = imgOf(e);
      $("res-new").classList.toggle("show", isNew);
      $("res-text").innerHTML = '<span class="big">' + nm + '</span> joined your team!<span class="jp">' + nm + ' を つかまえた！</span>';
      $("res-count").innerHTML = '<span class="jp">ずかん</span> <b id="res-num">' + (S.caught.length - (isNew ? 1 : 0)) + "</b> / 52";
      $("res-actions").innerHTML = "";
      restart($("result"), "show");
      FX.confettiRain(2.2);
      after(200, function () { FX.burst(960, 470, { count: 50, speed: 26, size: 34, gravity: 0.3, life: 1.6 }); FX.ring(960, 470, { r: 600, color: "#fff", width: 40, life: 0.7 }); });
      if (isNew) after(1300, function () { var b = $("res-num"); if (b) { b.textContent = S.caught.length; restart(b.parentNode, "shake"); Sound.play("right"); } });
      after(1900, function () {
        actions($("res-actions"), [
          { html: 'Next ▶ <span class="jp">つぎへ</span>', fn: function () { startEncounter(); } },
          { html: 'Mojidex <span class="jp">ずかん</span>', blue: true, fn: function () { show("dex"); } }
        ]);
      });
    });
    after(4200, function () { if (S.screen === "battle") Sound.resumeMusic(); });
  }

  // ================= MOJIDEX =================
  function buildDex() {
    var g = $("dex-grid"); g.innerHTML = "";
    var rows = [[0, 13, true], [0, 13, false], [13, 26, true], [13, 26, false]], n = 0;
    rows.forEach(function (r) {
      for (var i = r[0]; i < r[1]; i++) {
        var id = idOf(LETTERS[i], r[2]), got = isCaught(id);
        var c = document.createElement("div");
        c.className = "dex-cell " + (got ? "got" : "missing");
        c.style.webkitAnimationDelay = c.style.animationDelay = (n++ * 0.012) + "s";
        c.innerHTML = '<img src="' + imgOf(id) + '" alt="" style="animation-delay:-' + (Math.random() * 1.4).toFixed(2) + 's"><span>' + (got ? nameOf(id) : "?") + "</span>";
        g.appendChild(c);
      }
    });
    $("dex-total").textContent = S.caught.length;
    $("confirm").classList.remove("show");
  }

  // ================= INPUT =================
  function navItems() {
    var scope = $("confirm").classList.contains("show") ? $("confirm") : $(S.screen);
    if (S.screen === "battle" && $("result").classList.contains("show")) scope = $("result");
    return [].filter.call(scope.querySelectorAll(".nav"), function (el) {
      return !el.disabled && el.offsetParent !== null && el.style.visibility !== "hidden";
    });
  }
  function focusFirst() { var it = navItems(); if (it.length) it[0].focus(); }
  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function moveFocus(dx, dy) {
    var items = navItems(); if (!items.length) return;
    var cur = document.activeElement;
    if (items.indexOf(cur) < 0) { items[0].focus(); return; }
    var c = center(cur), best = null, bestScore = 1e9;
    items.forEach(function (el) {
      if (el === cur) return;
      var p = center(el), vx = p.x - c.x, vy = p.y - c.y;
      var main = dx ? vx * dx : vy * dy, side = dx ? Math.abs(vy) : Math.abs(vx);
      if (main <= 5) return;
      var score = main + side * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) { best.focus(); Sound.play("move"); }
  }

  var started = false;
  function firstGesture() { Sound.unlock(); if (!started) { started = true; Sound.resumeMusic(); } }
  document.addEventListener("mousedown", firstGesture, true);
  document.addEventListener("touchstart", firstGesture, true);

  document.addEventListener("keydown", function (ev) {
    firstGesture();
    var k = ev.keyCode;
    if (k === 37) { moveFocus(-1, 0); ev.preventDefault(); return; }
    if (k === 39) { moveFocus(1, 0); ev.preventDefault(); return; }
    if (k === 38) { moveFocus(0, -1); ev.preventDefault(); return; }
    if (k === 40) { moveFocus(0, 1); ev.preventDefault(); return; }
    if (k === 27 || k === 8 || k === 10009 || k === 461) {
      ev.preventDefault();
      if ($("confirm").classList.contains("show")) { $("confirm").classList.remove("show"); focusFirst(); }
      else if (S.screen !== "title") show("title");
      return;
    }
    // reveal screen: Space / Enter / OK reveals the letter (unless a corner button is focused)
    if (S.screen === "reveal" && (k === 32 || k === 13)) {
      var a = document.activeElement;
      if (!a || !a.closest || !a.closest(".corner")) { ev.preventDefault(); revealAdvance(); return; }
    }
    if (k === 13 || k === 32) {
      if (navItems().indexOf(document.activeElement) < 0) { focusFirst(); ev.preventDefault(); }
      return;
    }
    if (S.screen === "battle" && ((k >= 49 && k <= 52) || (k >= 97 && k <= 100))) {
      var card = $("cards").children[(k >= 97 ? k - 97 : k - 49)];
      if (card && $("quiz").classList.contains("show")) card.click();
    }
  });

  // clicking anywhere on the reveal screen also reveals
  $("reveal").addEventListener("click", function (ev) {
    if (ev.target.closest && ev.target.closest(".corner")) return;
    revealAdvance();
  });

  // ---------- buttons ----------
  [].forEach.call(document.querySelectorAll(".mode-btn"), function (b) {
    b.addEventListener("click", function () { Sound.unlock(); Sound.play("select"); startEncounter(b.getAttribute("data-mode")); });
  });
  $("btn-words").addEventListener("click", function () { S.words = !S.words; save("words", S.words); Sound.play("select"); buildTitle(); });
  $("btn-music").addEventListener("click", function () {
    Sound.unlock(); S.music = !S.music; save("music", S.music); Sound.setMusic(S.music); Sound.play("select"); buildTitle();
  });
  $("btn-dex-title").addEventListener("click", function () { Sound.play("select"); show("dex"); });
  $("btn-dex-back").addEventListener("click", function () { Sound.play("select"); show("title"); });
  $("btn-dex-reset").addEventListener("click", function () { Sound.play("select"); $("confirm").classList.add("show"); $("btn-reset-no").focus(); });
  $("btn-reset-no").addEventListener("click", function () { $("confirm").classList.remove("show"); $("btn-dex-reset").focus(); });
  $("btn-reset-yes").addEventListener("click", function () {
    S.caught = []; S.partner = null; save("caught", []); save("partner", null); buildDex(); $("btn-dex-back").focus();
  });
  $("btn-run").addEventListener("click", function () { if (S.busy) return; Sound.play("select"); startEncounter(); });
  $("btn-home").addEventListener("click", function () { Sound.play("select"); show("title"); });
  $("btn-rv-skip").addEventListener("click", function () { if (S.phase === "to-battle") return; Sound.play("select"); startEncounter(); });
  $("btn-rv-home").addEventListener("click", function () { Sound.play("select"); show("title"); });

  // preload images so battles start instantly
  allIds().forEach(function (id) { var im = new Image(); im.src = imgOf(id); });
  ["img/bg.svg", "img/pad.svg", "img/ball.svg", "img/rays.svg"].forEach(function (s) { var im = new Image(); im.src = s; });

  show("title");
})();
