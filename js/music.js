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

   THE VALLEY is what plays while you work: the same band, sat
   down, brushes instead of sticks, a slow pastoral turn-around
   that stays out of the way.
   ============================================================ */
const MUSIC = (() => {
  let ac = null, master = null, noise = null;
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
    else { f.type = 'highpass'; f.frequency.value = 7200; }
    const dur = kind === 'crash' ? 0.9 : kind === 'snare' ? 0.13 : kind === 'brush' ? 0.09 : 0.035;
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
      bpm: 86, swing: 0.5, len: 128, gain: 0.32,
      play(i, t, beat) {
        /* C - Am - F - G, twice round, brushes and a music box */
        const CH = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
        const bar = (i / 16) | 0, s = i % 16, ch = CH[bar % 4];
        if (s === 0) bass(ch[0] - 12, t, beat * 1.7, 0.13);
        if (s === 8) bass(ch[2] - 12, t, beat * 0.9, 0.09);
        if (s === 4 || s === 12) drum('brush', t, 0.05);
        if (s % 4 === 2) drum('hat', t, 0.022);
        /* a music-box arpeggio, one note every other eighth */
        if (s % 4 === 0) pluck(ch[(s / 4) % 3] + 24, t, 0.5, 0.05, 'sine');
        if (s === 6 || s === 14) pluck(ch[(s === 6 ? 1 : 2)] + 12, t, 0.35, 0.032, 'triangle');
        /* a whistle line that only shows up in the second half */
        if (bar >= 4) {
          const LINE = [[0, 72], [6, 74], [8, 76], [14, 74]];
          LINE.forEach(([ls, n]) => { if (ls === s) pluck(n, t, beat * 0.8, 0.038, 'sine'); });
        }
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
      [62, 66, 69, 74].forEach((n, i) => horn(n, t + i * 0.06, 0.4, 0.08 * g));
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
