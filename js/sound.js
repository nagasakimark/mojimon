// Mojimon sound: all effects and music are synthesised with Web Audio (no audio files).
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, musicGain = null;
  var musicOn = true, musicTimer = null, musicStep = 0, nextTime = 0, currentSong = null;

  function init() {
    if (ctx || !AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
  }
  function unlock() { init(); if (ctx && ctx.state === "suspended") ctx.resume(); }

  function tone(freq, start, dur, type, vol, dest, slideTo) {
    if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(dest || master);
    o.start(start); o.stop(start + dur + 0.05);
  }
  function noise(start, dur, vol, hp) {
    if (!ctx) return;
    var len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = hp || 800;
    s.buffer = buf; g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(master); s.start(start);
  }
  function R(a, b) { return a + Math.random() * (b - a); }
  function n(note) { return 440 * Math.pow(2, (note - 69) / 12); }

  var sfx = {
    move: function (t) { tone(n(84), t, 0.05, "square", 0.08); },
    select: function (t) { tone(n(79), t, 0.06, "square", 0.12); tone(n(86), t + 0.06, 0.08, "square", 0.12); },
    right: function (t) { [72, 76, 79, 84].forEach(function (m, i) { tone(n(m), t + i * 0.07, 0.14, "square", 0.14); }); },
    hit: function (t) { noise(t, 0.25, 0.45, 500); tone(220, t, 0.25, "sawtooth", 0.2, null, 60); },
    wrong: function (t) { tone(n(55), t, 0.18, "square", 0.15); tone(n(50), t + 0.17, 0.3, "square", 0.15); },
    taunt: function (t) { tone(n(76), t, 0.08, "triangle", 0.2); tone(n(81), t + 0.1, 0.12, "triangle", 0.2); },
    appear: function (t) { [60, 64, 67, 72, 67, 72, 76].forEach(function (m, i) { tone(n(m), t + i * 0.06, 0.1, "square", 0.12); }); },
    throwBall: function (t) { tone(300, t, 0.5, "triangle", 0.25, null, 1200); noise(t, 0.4, 0.12, 2000); },
    absorb: function (t) { tone(1400, t, 0.4, "sine", 0.25, null, 200); },
    wobble: function (t) { tone(n(60), t, 0.06, "square", 0.15); tone(n(55), t + 0.08, 0.06, "square", 0.15); },
    click: function (t) { tone(n(96), t, 0.04, "square", 0.2); noise(t, 0.05, 0.3, 3000); },
    star: function (t) { [84, 88, 91, 96].forEach(function (m, i) { tone(n(m), t + i * 0.05, 0.12, "square", 0.1); }); tone(400, t, 0.4, "triangle", 0.15, null, 1600); },
    zap: function (t) { noise(t, 0.5, 0.5, 300); tone(1200, t, 0.35, "sawtooth", 0.15, null, 80); tone(90, t + 0.05, 0.4, "square", 0.2, null, 40); },
    flame: function (t) { noise(t, 0.6, 0.4, 150); tone(160, t, 0.5, "sawtooth", 0.15, null, 50); },
    bubble: function (t) { for (var i = 0; i < 7; i++) tone(R(500, 900), t + i * 0.06, 0.08, "sine", 0.25, null, R(1200, 1800)); },
    whoosh: function (t) { noise(t, 0.35, 0.25, 1500); tone(900, t, 0.3, "sine", 0.08, null, 300); },
    pop: function (t) { tone(200, t, 0.15, "sine", 0.35, null, 900); noise(t, 0.08, 0.3, 2000); },
    blip: function (t) { tone(n(88), t, 0.03, "square", 0.04); },
    drumroll: function (t) { for (var i = 0; i < 18; i++) noise(t + i * 0.045, 0.05, 0.12 + i * 0.012, 900); },
    tada: function (t) { [[72, 0], [76, 0.1], [79, 0.2], [84, 0.3]].forEach(function (m) { tone(n(m[0]), t + m[1], 0.5, "square", 0.13); tone(n(m[0] - 12), t + m[1], 0.5, "triangle", 0.2); }); noise(t + 0.3, 0.5, 0.25, 4000); },
    caught: function (t) {
      var mel = [[72, 0.15], [72, 0.15], [72, 0.15], [76, 0.45], [74, 0.15], [74, 0.15], [74, 0.15], [77, 0.45], [79, 0.15], [79, 0.15], [81, 0.15], [84, 0.9]];
      var x = t; mel.forEach(function (m) { tone(n(m[0]), x, m[1] * 0.95, "square", 0.13); tone(n(m[0] - 24), x, m[1] * 0.95, "triangle", 0.18); x += m[1]; });
    }
  };

  // --- music: tiny step sequencer ---
  var songs = {
    battle: { bpm: 168, steps: 32,
      lead: [69,0,72,0,76,0,74,72, 71,0,72,0,74,0,0,0, 69,0,72,0,76,0,79,77, 76,0,74,0,72,0,71,0],
      bass: [45,45,57,45,45,57,45,57, 43,43,55,43,43,55,43,55, 41,41,53,41,41,53,41,53, 40,40,52,40,44,44,56,44] },
    mystery: { bpm: 110, steps: 32,
      lead: [64,0,67,0,71,0,67,0, 65,0,69,0,72,0,69,0, 64,0,67,0,71,0,74,0, 72,0,71,0,69,0,67,0],
      bass: [40,0,0,0,40,0,0,0, 41,0,0,0,41,0,0,0, 40,0,0,0,40,0,0,0, 43,0,0,0,43,0,0,0] },
    title: { bpm: 132, steps: 32,
      lead: [72,0,76,0,79,0,76,0, 77,0,81,0,79,0,0,0, 76,0,79,0,84,0,83,81, 79,0,77,0,76,0,74,0],
      bass: [48,0,55,0,48,0,55,0, 53,0,57,0,55,0,59,0, 48,0,55,0,52,0,57,0, 53,0,55,0,43,0,55,0] }
  };
  function schedule() {
    if (!ctx || !currentSong) return;
    var s = songs[currentSong], step = 60 / s.bpm / 2;
    while (nextTime < ctx.currentTime + 0.2) {
      var i = musicStep % s.steps;
      if (s.lead[i]) tone(n(s.lead[i]), nextTime, step * 0.9, "square", 0.12, musicGain);
      if (s.bass[i]) tone(n(s.bass[i]), nextTime, step * 0.9, "triangle", 0.35, musicGain);
      if (i % 4 === 2) { noise(nextTime, 0.04, 0.05, 6000); }
      nextTime += step; musicStep++;
    }
  }
  function playMusic(name) {
    if (currentSong === name && musicTimer) return;
    stopMusic(); currentSong = name;
    if (!musicOn || !ctx) return;
    musicStep = 0; nextTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(schedule, 50);
  }
  function stopMusic() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; }

  window.Sound = {
    unlock: unlock,
    play: function (name) { if (!ctx) return; var f = sfx[name]; if (f) f(ctx.currentTime + 0.01); },
    music: function (name) { currentSong = name; playMusic(name); },
    pauseMusic: function () { stopMusic(); },
    resumeMusic: function () { if (currentSong) { var c = currentSong; currentSong = null; playMusic(c); } },
    setMusic: function (on) { musicOn = on; if (!on) stopMusic(); else if (currentSong) { var c = currentSong; currentSong = null; playMusic(c); } },
    isMusicOn: function () { return musicOn; }
  };
})();
