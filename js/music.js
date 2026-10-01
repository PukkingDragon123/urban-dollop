/* ============================================================
   THE BAND
   There are no audio files in this game, the same as there are no
   image files. The music is synthesised: a lookahead scheduler
   walks a grid of sixteenths, and four parts - horns, a walking
   bass, a piano comp and a kit - are built out of oscillators and
   one noise buffer.

   THE MENU STRUT is an original tune written for this game, in the
   spirit of the brassy, minor-key villain swagger the founder
   clearly thinks he is starring in: swung eighths, a walking bass,
   horn stabs on the off-beat and a hook that struts. The melody,
   the changes and the words he sings over it are this game's own.

   THE VALLEY is what plays while you work: a little bouncy tune in
   F for a marimba, a ukulele strumming the off-beats, a soft kick,
   a shaker and a glockenspiel that comes in for the second half.
   Sixteen bars, an A and a B, all of it this game's own.
   ============================================================ */
const MUSIC = (() => {
  let ac = null, master = null, noise = null, echo = null;
  let timer = 0, track = null, step = 0, nextT = 0, wanted = null;
  const LOOK = 0.14;                 /* how far ahead we schedule, in seconds */

  function vol() {
    if (typeof GAME === 'undefined' || !GAME.setting) return 0.5;
    if (!GAME.setting('music') || !GAME.setting('sound')) return 0;
    return Math.max(0, Math.min(1, GAME.setting('volume') === undefined ? 0.7 : GAME.setting('volume')));
  }
  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      master = ac.createGain();
      master.gain.value = 0;
      master.connect(ac.destination);
      /* one buffer of white noise, reused by every drum */
      noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      /* a short tape echo the bells and the marimba can send to, so the
         valley sounds like a room rather than a circuit */
      echo = ac.createDelay(1);
      echo.delayTime.value = 0.21;
      const fb = ac.createGain(), wet = ac.createGain(), lp = ac.createBiquadFilter();
      fb.gain.value = 0.32; wet.gain.value = 0.3;
      lp.type = 'lowpass'; lp.frequency.value = 2600;
      echo.connect(lp).connect(fb).connect(echo);
      lp.connect(wet).connect(master);
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------------- the instruments ---------------- */
  function horn(n, t, dur, v) {
    const f = hz(n);
    const g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 5;
    lp.frequency.setValueAtTime(f * 1.6, t);
    lp.frequency.linearRampToValueAtTime(f * 5.5, t + 0.045);
    lp.frequency.exponentialRampToValueAtTime(Math.max(220, f * 1.5), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.014);
    g.gain.setValueAtTime(v, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [0, 8, -7].forEach(cents => {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.detune.setValueAtTime(cents, t);
      o.connect(lp);
      o.start(t); o.stop(t + dur + 0.03);
    });
    lp.connect(g).connect(master);
  }
  function bass(n, t, dur, v) {
    const f = hz(n);
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o2.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o2.frequency.setValueAtTime(f / 2, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g); g.connect(master);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }
  function pluck(n, t, dur, v, type) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(hz(n), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  /* a marimba: a sine with a soft fourth-harmonic knock on top, gone in
     a third of a second */
  function marimba(n, t, dur, v, send) {
    const f = hz(n);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.55, 0.22 + dur * 0.5));
    [[1, 1], [4, 0.18], [10, 0.05]].forEach(([m, a]) => {
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f * m, t);
      og.gain.setValueAtTime(a, t);
      if (m > 1) og.gain.exponentialRampToValueAtTime(0.001, t + 0.06 * (m === 4 ? 2 : 1));
      o.connect(og).connect(g);
      o.start(t); o.stop(t + 0.6);
    });
    g.connect(master);
    if (send && echo) { const s = ac.createGain(); s.gain.value = send; g.connect(s).connect(echo); }
  }
  /* a glockenspiel: pure, bright, and a long ring */
  function bell(n, t, v) {
    const f = hz(n);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    [[1, 1], [2.76, 0.3], [5.4, 0.1]].forEach(([m, a]) => {
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f * m, t);
      og.gain.setValueAtTime(a, t);
      o.connect(og).connect(g);
      o.start(t); o.stop(t + 1.15);
    });
    g.connect(master);
    if (echo) { const s = ac.createGain(); s.gain.value = 0.5; g.connect(s).connect(echo); }
  }
  /* a ukulele strum: the chord rolled upward, each string a quick
     filtered pluck */
  function strum(ch, t, v) {
    ch.forEach((n, k) => {
      const tt = t + k * 0.011;
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = 'triangle';
      o.frequency.setValueAtTime(hz(n), tt);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(hz(n) * 6, tt); lp.frequency.exponentialRampToValueAtTime(hz(n) * 1.5, tt + 0.15);
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.linearRampToValueAtTime(v, tt + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.2);
      o.connect(lp).connect(g).connect(master);
      o.start(tt); o.stop(tt + 0.22);
    });
  }
  function drum(kind, t, v) {
    if (kind === 'kick') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(128, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 0.19);
      return;
    }
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noise;
    s.playbackRate.value = 0.9 + Math.random() * 0.2;
    if (kind === 'snare') { f.type = 'bandpass'; f.frequency.value = 1750; f.Q.value = 0.9; }
    else if (kind === 'brush') { f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.5; }
    else if (kind === 'crash') { f.type = 'highpass'; f.frequency.value = 4200; }
    else if (kind === 'shaker') { f.type = 'highpass'; f.frequency.value = 5200; }
    else if (kind === 'block') { f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 6; }
    else { f.type = 'highpass'; f.frequency.value = 7200; }
    const dur = kind === 'crash' ? 0.9 : kind === 'snare' ? 0.13 : kind === 'brush' ? 0.09 : kind === 'shaker' ? 0.05 : kind === 'block' ? 0.04 : 0.035;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  /* ---------------- THE MENU STRUT ----------------
     Eight bars in D minor. Chart: Dm Dm | Gm A7 | Dm Bb | Gm A7.
     Sixteen steps to the bar; the eighths swing. */
  const CHORD = [
    [50, 53, 57], [50, 53, 57], [55, 58, 62], [57, 61, 64],
    [50, 53, 57], [58, 62, 65], [55, 58, 62], [57, 61, 64],
  ];
  const WALK = [
    [38, 45, 38, 41], [38, 45, 38, 40], [43, 50, 43, 46], [45, 52, 45, 43],
    [38, 45, 38, 41], [46, 41, 46, 50], [43, 50, 43, 46], [45, 52, 43, 45],
  ];
  /* the hook: [step within the bar, note] at eighth resolution */
  const HOOK = [
    [[0, 74], [3, 77], [4, 76], [6, 74], [10, 72], [12, 74]],
    [[0, 74], [3, 77], [4, 79], [6, 77], [8, 76], [12, 74]],
    [[0, 72], [3, 74], [4, 75], [6, 74], [10, 70], [12, 67]],
    [[0, 73], [2, 76], [4, 79], [6, 76], [8, 73], [12, 69]],
    [[0, 74], [3, 77], [4, 76], [6, 74], [10, 72], [12, 74]],
    [[0, 77], [3, 74], [4, 70], [6, 74], [10, 77], [12, 79]],
    [[0, 79], [3, 77], [4, 75], [6, 74], [8, 72], [12, 70]],
    [[0, 73], [4, 76], [6, 79], [8, 81], [12, 76]],
  ];
  const KICK = [0, 6, 8, 14], SNARE = [4, 12];

  /* ---------------- THE VALLEY ----------------
     Sixteen bars in F. A: F C Dm Bb | F C Bb C.  B: Bb C Am Dm | Gm C F F.
     The tune is [step, note, length in sixteenths]. */
  const VCH = {
    F: { n: [57, 60, 65], b: [41, 48] }, C: { n: [55, 60, 64], b: [36, 43] },
    Dm: { n: [57, 62, 65], b: [38, 45] }, Bb: { n: [58, 62, 65], b: [46, 41] },
    Am: { n: [57, 60, 64], b: [45, 40] }, Gm: { n: [55, 58, 62], b: [43, 38] },
  };
  const VPROG = ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'Bb', 'C', 'Am', 'Dm', 'Gm', 'C', 'F', 'F'];
  const VMEL = [
    [[0, 72, 2], [2, 69, 2], [4, 72, 2], [6, 77, 4], [12, 76, 2], [14, 74, 2]],
    [[0, 72, 4], [4, 67, 2], [6, 69, 2], [8, 72, 6]],
    [[0, 74, 2], [2, 72, 2], [4, 74, 2], [6, 77, 4], [12, 81, 4]],
    [[0, 79, 6], [8, 77, 2], [10, 74, 2], [12, 74, 4]],
    [[0, 72, 2], [2, 69, 2], [4, 72, 2], [6, 77, 4], [12, 76, 2], [14, 74, 2]],
    [[0, 72, 2], [2, 74, 2], [4, 76, 2], [6, 79, 4], [12, 76, 4]],
    [[0, 77, 2], [2, 76, 2], [4, 74, 2], [6, 72, 4], [12, 70, 2], [14, 69, 2]],
    [[0, 67, 4], [4, 72, 2], [6, 76, 2], [8, 72, 8]],
    [[0, 74, 4], [6, 77, 2], [8, 74, 4], [12, 72, 4]],
    [[0, 76, 4], [6, 79, 2], [8, 76, 4], [12, 72, 4]],
    [[0, 76, 2], [2, 77, 2], [4, 76, 2], [6, 72, 4], [12, 69, 4]],
    [[0, 74, 6], [8, 72, 2], [10, 74, 2], [12, 77, 4]],
    [[0, 79, 4], [4, 77, 2], [6, 74, 2], [8, 70, 4], [12, 74, 4]],
    [[0, 72, 4], [4, 76, 2], [6, 79, 2], [8, 84, 4], [12, 82, 4]],
    [[0, 81, 2], [2, 79, 2], [4, 77, 4], [8, 72, 2], [10, 74, 2], [12, 76, 2], [14, 79, 2]],
    [[0, 77, 8]],
  ];

  const TRACKS = {
    strut: {
      bpm: 126, swing: 0.64, len: 128, gain: 0.5,
      play(i, t, beat) {
        const bar = (i / 16) | 0, s = i % 16;
        const ch = CHORD[bar], v = 1;
        if (i === 0) drum('crash', t, 0.16 * v);
        if (KICK.indexOf(s) >= 0) drum('kick', t, 0.5 * v);
        if (SNARE.indexOf(s) >= 0) drum('snare', t, 0.22 * v);
        if (s % 2 === 0) drum('hat', t, (s % 4 === 0 ? 0.1 : 0.055) * v);
        if (s % 4 === 0) bass(WALK[bar][s / 4], t, beat * 0.92, 0.17 * v);
        /* horn stabs on the and of two and the and of four */
        if (s === 6 || s === 14) ch.forEach((n, k) => horn(n + 12, t, beat * 0.42, 0.052 * v - k * 0.006));
        /* and the hook over the top */
        HOOK[bar].forEach(([hs, n]) => { if (hs === s) horn(n, t, beat * (s % 4 === 0 ? 0.75 : 0.42), 0.075 * v); });
      },
    },
    valley: {
      bpm: 108, swing: 0.56, len: 256, gain: 0.36,
      play(i, t, beat) {
        const bar = (i / 16) | 0, s = i % 16;
        const c = VCH[VPROG[bar]];
        /* a soft kick on one and three, a wood block on two and four,
           a shaker under everything */
        if (s === 0 || s === 8) drum('kick', t, 0.2);
        if (s === 4 || s === 12) drum('block', t, 0.09);
        if (s % 2 === 0) drum('shaker', t, s % 4 === 2 ? 0.03 : 0.018);
        /* the bass bounces root and fifth */
        if (s === 0) bass(c.b[0], t, beat * 0.8, 0.15);
        if (s === 8) bass(c.b[1], t, beat * 0.8, 0.12);
        if (s === 14 && bar % 2) bass(c.b[0] + 2, t, beat * 0.35, 0.08);
        /* the ukulele on the off-beats */
        if (s === 2 || s === 6 || s === 10 || s === 14) strum(c.n, t, s === 6 || s === 14 ? 0.03 : 0.022);
        /* the tune on the marimba; the glockenspiel doubles it an octave
           up through the B section */
        VMEL[bar].forEach(([ms, n, len]) => {
          if (ms !== s) return;
          marimba(n, t, len * beat / 4, 0.1, 0.25);
          if (bar >= 8 && bar < 15) bell(n + 12, t, 0.022);
        });
        /* a sparkle run into the top of the loop */
        if (bar === 15 && s >= 8 && s % 2 === 0) bell([77, 81, 84, 89][(s - 8) / 2], t, 0.03);
      },
    },
  };

  /* ---------------- the scheduler ---------------- */
  function stepTime(i, T) {
    /* swing: the second eighth of every beat leans late */
    const beat = 60 / T.bpm;
    const sw = (i % 4 === 2) ? (T.swing - 0.5) * beat : 0;
    return sw;
  }
  function pump() {
    if (!ac || !track) return;
    const T = TRACKS[track];
    const beat = 60 / T.bpm, sixteenth = beat / 4;
    while (nextT < ac.currentTime + LOOK) {
      const at = nextT + stepTime(step, T);
      try { T.play(step, Math.max(at, ac.currentTime + 0.01), beat); } catch (e) { /* never let a bad bar stop the band */ }
      step = (step + 1) % T.len;
      nextT += sixteenth;
    }
    /* the volume can change under us at any time */
    const want = vol() * T.gain;
    master.gain.setTargetAtTime(want, ac.currentTime, 0.08);
  }

  function play(name, fade) {
    wanted = name;
    if (!TRACKS[name]) return;
    if (!ctx()) return;
    if (track === name && timer) return;
    stopTimer();
    track = name; step = 0; nextT = ac.currentTime + 0.06;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(0.0001, ac.currentTime);
    master.gain.setTargetAtTime(vol() * TRACKS[name].gain, ac.currentTime, fade === false ? 0.02 : 0.5);
    timer = setInterval(pump, 25);
    pump();
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = 0; } }
  function stop(fade) {
    wanted = null;
    if (!ac) { track = null; return; }
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(0.0001, ac.currentTime, fade === false ? 0.01 : 0.25);
    const was = track;
    setTimeout(() => { if (track === was && !wanted) { stopTimer(); track = null; } }, fade === false ? 60 : 900);
  }
  /* a one-off hit, for the moments that want one */
  function sting(kind) {
    if (!ctx() || !vol()) return;
    const t = ac.currentTime + 0.02, g = vol();
    const old = master.gain.value;
    master.gain.setTargetAtTime(Math.max(g * 0.5, old), t, 0.02);
    if (kind === 'news') {
      drum('crash', t, 0.2 * g);
      [57, 60, 64].forEach((n, i) => horn(n, t + i * 0.055, 0.42, 0.09 * g));
      horn(69, t + 0.2, 0.7, 0.1 * g);
    } else if (kind === 'good') {
      /* a little ta-da on the marimba with a bell on top */
      [65, 69, 72, 77].forEach((n, i) => marimba(n, t + i * 0.07, 0.2, 0.12 * g, 0.3));
      bell(84, t + 0.3, 0.06 * g);
    } else {
      [62, 61, 58, 55].forEach((n, i) => horn(n, t + i * 0.07, 0.38, 0.08 * g));
    }
  }
  /* the page going away should not leave the band playing */
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!ac) return;
      if (document.hidden) master.gain.setTargetAtTime(0.0001, ac.currentTime, 0.1);
      else if (track) master.gain.setTargetAtTime(vol() * TRACKS[track].gain, ac.currentTime, 0.3);
    });
  }
  return { play, stop, sting, get playing() { return track; } };
})();
window.MUSIC = MUSIC;
