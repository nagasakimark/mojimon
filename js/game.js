// Mojimon — letter monster battles for the classroom TV.
// Works with a TV remote (arrows + OK), keyboard (arrows, Enter, 1-4), mouse or touch.
(function () {
  "use strict";

  var LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
  var HITS_TO_WEAKEN = 3;
  var DEFAULT_PARTNER = "lower-m";

  function $(id) { return document.getElementById(id); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function later(ms, fn) { return setTimeout(fn, ms); }
  function idOf(letter, upper) { return (upper ? "upper-" : "lower-") + letter; }
  function isUpper(id) { return id.indexOf("upper-") === 0; }
  function letterOf(id) { return id.charAt(id.length - 1); }
  function nameOf(id) { return isUpper(id) ? letterOf(id).toUpperCase() : letterOf(id); }
  function imgOf(id) { return "img/monsters/" + id + ".webp"; }
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  // ---------- saved data ----------
  function load(key, fallback) { try { var v = localStorage.getItem("mojimon-" + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } }
  function save(key, val) { try { localStorage.setItem("mojimon-" + key, JSON.stringify(val)); } catch (e) {} }

  var S = {
    mode: "upper",
    words: load("words", true),
    music: load("music", true),
    caught: load("caught", []),
    partner: load("partner", null),
    enemy: null, lastEnemy: null,
    hits: 0, answers: [], busy: false, screen: "title", timers: []
  };
  Sound.setMusic(S.music);

  function isCaught(id) { return S.caught.indexOf(id) >= 0; }
  function clearTimers() { S.timers.forEach(clearTimeout); S.timers = []; }
  function after(ms, fn) { S.timers.push(later(ms, fn)); }

  // ---------- stage scaling ----------
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var st = $("stage").style;
    st.webkitTransform = st.transform = "scale(" + s + ")";
  }
  window.addEventListener("resize", fit); fit();

  // ---------- screens ----------
  function show(name) {
    clearTimers();
    S.screen = name;
    ["title", "battle", "dex"].forEach(function (s) { $(s).classList.toggle("active", s === name); });
    if (name === "title") { buildTitle(); Sound.music("title"); focusFirst(); }
    if (name === "dex") { buildDex(); focusFirst(); }
  }

  // ---------- title ----------
  function buildTitle() {
    $("btn-words").innerHTML = "Words: " + (S.words ? "ON" : "OFF") + ' <span class="jp">ことば</span>';
    $("btn-words").classList.toggle("off", !S.words);
    $("btn-music").innerHTML = "Music: " + (S.music ? "ON" : "OFF") + ' <span class="jp">おんがく</span>';
    $("btn-music").classList.toggle("off", !S.music);
    $("btn-dex-title").innerHTML = "Mojidex " + S.caught.length + '/52 <span class="jp">ずかん</span>';
    var parade = $("title-parade"); parade.innerHTML = "";
    var ids = shuffle(S.caught.length >= 7 ? S.caught : allIds()).slice(0, 7);
    ids.forEach(function (id, i) {
      var im = document.createElement("img");
      im.src = imgOf(id);
      im.style.left = (60 + i * 262) + "px";
      im.style.webkitAnimationDelay = im.style.animationDelay = (i * 0.22) + "s";
      parade.appendChild(im);
    });
  }
  function allIds() { var a = []; LETTERS.forEach(function (l) { a.push(idOf(l, true), idOf(l, false)); }); return a; }

  // ---------- encounter ----------
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

  function wipe(mid, done) {
    var w = $("wipe"); w.innerHTML = ""; w.style.display = "block";
    var bars = [];
    for (var i = 0; i < 9; i++) {
      var b = document.createElement("div");
      b.style.top = (i * 120) + "px";
      var from = (i % 2 ? 1 : -1) * 1920;
      b.style.webkitTransform = b.style.transform = "translateX(" + from + "px)";
      b.style.webkitTransition = b.style.transition = "transform .35s ease-in " + (i * 0.03) + "s, -webkit-transform .35s ease-in " + (i * 0.03) + "s";
      w.appendChild(b); bars.push([b, from]);
    }
    void w.offsetWidth;
    bars.forEach(function (x) { x[0].style.webkitTransform = x[0].style.transform = "translateX(0)"; });
    later(650, function () {
      mid();
      bars.forEach(function (x) { x[0].style.webkitTransform = x[0].style.transform = "translateX(" + (-x[1]) + "px)"; });
      later(650, function () { w.style.display = "none"; if (done) done(); });
    });
  }

  function startBattle(mode) {
    if (mode) S.mode = mode;
    S.busy = true;
    wipe(function () {
      show("battle");
      Sound.music("battle");
      setupBattle();
    }, introBattle);
  }

  function setupBattle() {
    var e = chooseEnemy();
    S.enemy = e; S.lastEnemy = e; S.hits = 0; S.busy = true;
    var L = letterOf(e);
    S.answers = shuffle(MOJI_WORDS[L]);
    S.partnerId = choosePartner(e);

    var ei = $("enemy-img"), pi = $("partner-img");
    ei.src = imgOf(e); pi.src = imgOf(S.partnerId);
    $("enemy").className = "mon enemy"; $("partner").className = "mon partner";
    $("enemy").style.visibility = "hidden"; $("partner").style.visibility = "hidden";
    $("enemy-name").textContent = nameOf(e);
    $("enemy-new").classList.toggle("show", !isCaught(e));
    $("partner-name").textContent = nameOf(S.partnerId);
    $("partner-dex").textContent = S.caught.length;
    setHP(1);
    $("ball").style.display = "none";
    $("sparkles").innerHTML = "";
    $("quiz").classList.remove("show");
    $("actions").classList.remove("show");
    message("");
  }

  function introBattle() {
    var e = S.enemy;
    $("enemy").style.visibility = "visible"; $("partner").style.visibility = "visible";
    restart($("enemy"), "anim-enter-r"); restart($("partner"), "anim-enter-l");
    Sound.play("appear");
    message('A wild <span class="big">' + nameOf(e) + '</span> appeared!<span class="jp">やせいの ' + nameOf(e) + ' が あらわれた！</span>');
    after(2200, ask);
  }

  function setHP(frac) {
    var f = $("enemy-hp");
    f.style.width = Math.max(0, frac * 100) + "%";
    f.classList.toggle("mid", frac <= 0.67 && frac > 0.34);
    f.classList.toggle("low", frac <= 0.34);
  }

  function message(html) {
    var m = $("msg");
    m.innerHTML = html;
    m.classList.toggle("show", !!html);
  }

  // ---------- questions ----------
  function caseWord(w) { return isUpper(S.enemy) ? w.toUpperCase() : w.toLowerCase(); }

  function distractors(L) {
    var bad = (MOJI_CONFUSABLE[L] || "") + L;
    var letters = shuffle(LETTERS.filter(function (x) { return bad.indexOf(x) < 0; })).slice(0, 3);
    return letters.map(function (x) { return pick(MOJI_WORDS[x]); });
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
      b.className = "nav card" + (S.words ? "" : " noword");
      b.style.left = (i * 470) + "px";
      b.style.webkitAnimationDelay = b.style.animationDelay = (i * 0.07) + "s";
      b.innerHTML = '<span class="num">' + (i + 1) + '</span><img src="img/words/' + o.w[1] + '.svg" alt=""><span class="word">' + caseWord(o.w[0]) + "</span>";
      b.addEventListener("click", function () { choose(b, o.ok); });
      box.appendChild(b);
    });
    $("quiz").classList.add("show");
    S.busy = false;
    box.firstChild.focus();
  }

  function choose(card, ok) {
    if (S.busy || card.disabled) return;
    Sound.unlock();
    if (ok) {
      S.busy = true;
      card.classList.add("right");
      Sound.play("right");
      after(350, function () {
        restart($("partner"), "anim-lunge");
        after(230, function () {
          Sound.play("hit");
          restart($("enemy"), "anim-hit");
          S.hits++;
          setHP(1 - S.hits / HITS_TO_WEAKEN);
        });
      });
      after(1700, function () { if (S.hits >= HITS_TO_WEAKEN) weak(); else ask(); });
    } else {
      card.classList.add("wrong");
      card.disabled = true;
      Sound.play("wrong");
      after(250, function () { Sound.play("taunt"); restart($("enemy"), "anim-hop"); });
      var left = [].filter.call($("cards").children, function (c) { return !c.disabled; });
      if (left.length) left[0].focus();
    }
  }

  // ---------- catching ----------
  function weak() {
    $("quiz").classList.remove("show");
    var nm = nameOf(S.enemy);
    message('<span class="big">' + nm + '</span> is tired! Throw a Moji-ball!<span class="jp">' + nm + ' は よわっている！ モジボールを なげよう！</span>');
    actions([{ html: '<span class="mini-ball"></span>Throw! <span class="jp">なげる</span>', fn: throwBall }]);
  }

  function actions(list) {
    var a = $("actions"); a.innerHTML = "";
    list.forEach(function (it) {
      var b = document.createElement("button");
      b.className = "nav act-btn" + (it.blue ? " blue" : "");
      b.innerHTML = it.html;
      b.addEventListener("click", function () { if (S.busy) return; Sound.unlock(); Sound.play("select"); it.fn(); });
      a.appendChild(b);
    });
    a.classList.add("show");
    S.busy = false;
    a.firstChild.focus();
  }

  function moveBall(x0, y0, x1, y1, h, ms, done) {
    var ball = $("ball"), t0 = null;
    ball.style.display = "block";
    function step(ts) {
      if (S.screen !== "battle") return;
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / ms);
      var x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p - h * 4 * p * (1 - p);
      ball.style.left = x + "px"; ball.style.top = y + "px";
      ball.style.webkitTransform = ball.style.transform = "rotate(" + (p * 720) + "deg)";
      if (p < 1) requestAnimationFrame(step); else if (done) done();
    }
    requestAnimationFrame(step);
  }

  function flash() {
    var f = $("flash");
    f.style.webkitTransition = f.style.transition = "none"; f.style.opacity = 1;
    void f.offsetWidth;
    f.style.webkitTransition = f.style.transition = "opacity .5s"; f.style.opacity = 0;
  }

  function throwBall() {
    S.busy = true;
    $("actions").classList.remove("show");
    message("");
    Sound.play("throwBall");
    var ex = 1390, ey = 250, gy = 445;
    moveBall(470, 520, ex, ey, 260, 750, function () {
      flash();
      Sound.play("absorb");
      restart($("enemy"), "anim-shrink");
      after(550, function () {
        moveBall(ex, ey, ex, gy, -60, 300, function () {
          var ball = $("ball");
          ball.style.webkitTransform = ball.style.transform = "rotate(0deg)";
          wobble(0);
        });
      });
    });
  }

  function wobble(k) {
    var ball = $("ball");
    if (k >= 3) { caught(); return; }
    after(350, function () {
      Sound.play("wobble");
      restart(ball, "anim-wobble");
      after(700, function () { wobble(k + 1); });
    });
  }

  function sparkle(x, y) {
    var box = $("sparkles");
    for (var i = 0; i < 10; i++) {
      var s = document.createElement("div");
      s.className = "spark"; s.textContent = "★";
      s.style.left = (x - 30) + "px"; s.style.top = (y - 40) + "px";
      s.style.webkitTransition = s.style.transition = "transform .8s ease-out, opacity .8s";
      box.appendChild(s);
      (function (s, a) {
        later(20, function () {
          var d = 160 + rnd(60);
          s.style.webkitTransform = s.style.transform = "translate(" + Math.cos(a) * d + "px," + Math.sin(a) * d + "px) scale(.6)";
          s.style.opacity = 0;
        });
      })(s, (i / 10) * Math.PI * 2);
    }
  }

  function caught() {
    var e = S.enemy, isNew = !isCaught(e), nm = nameOf(e);
    $("ball").classList.remove("anim-wobble");
    Sound.play("click");
    sparkle(1390, 445);
    if (isNew) { S.caught.push(e); save("caught", S.caught); }
    S.partner = e; save("partner", e);
    $("partner-dex").textContent = S.caught.length;
    $("enemy-new").classList.remove("show");
    Sound.pauseMusic();
    after(400, function () { Sound.play("caught"); restart($("partner"), "anim-celebrate"); });
    after(700, function () {
      message("Gotcha! <span class=\"big\">" + nm + "</span> was caught!" + (isNew ? " ★NEW" : "") +
        '<span class="jp">' + nm + ' を つかまえた！　ずかん ' + S.caught.length + ' / 52</span>');
    });
    after(1900, function () {
      actions([
        { html: 'Next ▶ <span class="jp">つぎへ</span>', fn: function () { startBattle(); } },
        { html: 'Mojidex <span class="jp">ずかん</span>', blue: true, fn: function () { show("dex"); } }
      ]);
    });
    after(3600, function () { if (S.screen === "battle") Sound.resumeMusic(); });
  }

  // ---------- Mojidex ----------
  function buildDex() {
    var g = $("dex-grid"); g.innerHTML = "";
    var rows = [[0, 13, true], [0, 13, false], [13, 26, true], [13, 26, false]];
    rows.forEach(function (r) {
      for (var i = r[0]; i < r[1]; i++) {
        var id = idOf(LETTERS[i], r[2]), got = isCaught(id);
        var c = document.createElement("div");
        c.className = "dex-cell " + (got ? "got" : "missing");
        c.innerHTML = '<img src="' + imgOf(id) + '" alt=""><span>' + (got ? nameOf(id) : "?") + "</span>";
        g.appendChild(c);
      }
    });
    $("dex-total").textContent = S.caught.length;
    $("confirm").classList.remove("show");
  }

  // ---------- remote / keyboard navigation ----------
  function navItems() {
    var scope = $("confirm").classList.contains("show") ? $("confirm") : $(S.screen);
    return [].filter.call(scope.querySelectorAll(".nav"), function (el) { return !el.disabled && el.offsetParent !== null; });
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

  document.addEventListener("keydown", function (ev) {
    Sound.unlock();
    var k = ev.keyCode;
    if (k === 37) { moveFocus(-1, 0); ev.preventDefault(); }
    else if (k === 39) { moveFocus(1, 0); ev.preventDefault(); }
    else if (k === 38) { moveFocus(0, -1); ev.preventDefault(); }
    else if (k === 40) { moveFocus(0, 1); ev.preventDefault(); }
    else if (k === 13 || k === 32) {
      if (navItems().indexOf(document.activeElement) < 0) { focusFirst(); ev.preventDefault(); }
    }
    else if (S.screen === "battle" && ((k >= 49 && k <= 52) || (k >= 97 && k <= 100))) {
      var card = $("cards").children[(k >= 97 ? k - 97 : k - 49)];
      if (card && $("quiz").classList.contains("show")) card.click();
    }
    else if (k === 27 || k === 8 || k === 10009 || k === 461) {
      ev.preventDefault();
      if ($("confirm").classList.contains("show")) { $("confirm").classList.remove("show"); focusFirst(); }
      else if (S.screen !== "title") show("title");
    }
  });
  var started = false;
  function firstGesture() { Sound.unlock(); if (!started) { started = true; Sound.resumeMusic(); } }
  document.addEventListener("mousedown", firstGesture, true);
  document.addEventListener("touchstart", firstGesture, true);
  document.addEventListener("keydown", firstGesture, true);

  // ---------- buttons ----------
  [].forEach.call(document.querySelectorAll(".mode-btn"), function (b) {
    b.addEventListener("click", function () { Sound.unlock(); Sound.play("select"); startBattle(b.getAttribute("data-mode")); });
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
  $("btn-run").addEventListener("click", function () { if (S.busy) return; Sound.play("select"); startBattle(); });
  $("btn-home").addEventListener("click", function () { Sound.play("select"); show("title"); });

  // preload monster images so battles start instantly
  allIds().forEach(function (id) { var im = new Image(); im.src = imgOf(id); });

  show("title");
})();
