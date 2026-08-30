/* ============================================================
   INF EGG CO. v3 — view/controller: camera world, hand tools,
   cozy minimal HUD, lab tree, pedia.
   ============================================================ */
'use strict';

(() => {
  const $ = sel => document.querySelector(sel);
  const S = () => GAME.S;
  const W = WORLD;

  /* ================= AUDIO ================= */
  const snd = (() => {
    let ctx = null;
    function ac() {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    function tone(freqs, dur, type, vol, slide) {
      if (S().muted) return;
      const a = ac(); if (!a) return;
      const t0 = a.currentTime;
      freqs.forEach((f, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = type || 'square';
        const st = t0 + i * dur * 0.9;
        o.frequency.setValueAtTime(f, st);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), st + dur);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(vol || 0.07, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g).connect(a.destination);
        o.start(st); o.stop(st + dur + 0.02);
      });
    }
    let comboT = 0, comboN = 0;
    return {
      scoop() {
        const now = performance.now();
        if (now - comboT > 600) comboN = 0;
        comboT = now; comboN = Math.min(comboN + 1, 24);
        tone([340 + comboN * 28], 0.05, 'square', 0.05, 1.3);
      },
      plume()  { tone([1046 + Math.random() * 200], 0.06, 'sine', 0.05, 1.2); },
      pet()    { tone([300 + Math.random() * 60], 0.06, 'square', 0.05, 0.8); },
      squawk() { tone([540, 420], 0.07, 'square', 0.06, 0.85); },
      plop()   { tone([200], 0.07, 'triangle', 0.06, 0.7); },
      lay()    { tone([620], 0.05, 'triangle', 0.05, 1.25); },
      clink()  { tone([880 + Math.random() * 120], 0.04, 'sine', 0.05); },
      hatch()  { tone([523, 659, 784, 1047], 0.1, 'triangle', 0.08); },
      coin()   { tone([988, 1319, 1760], 0.08, 'sine', 0.09); },
      engine() { tone([90, 120, 90], 0.09, 'square', 0.06); },
      build()  { tone([200, 260], 0.07, 'square', 0.06); },
      demolish(){ tone([160, 110], 0.08, 'square', 0.06, 0.8); },
      skill()  { tone([392, 523, 659], 0.09, 'square', 0.06); },
      error()  { tone([130], 0.12, 'square', 0.06, 0.7); },
      sparkle(){ tone([784, 1175, 1568], 0.08, 'sine', 0.06); },
      grand()  { tone([392, 494, 587, 784, 1175], 0.13, 'triangle', 0.1); },
      breed()  { tone([659, 784, 988, 1319], 0.1, 'triangle', 0.08); },
      sprinkle(){ tone([1400, 1150, 1300], 0.03, 'square', 0.03); },
    };
  })();

  /* ================= FLOAT TEXT & TOASTS ================= */
  const fxLayer = $('#fx-layer'), toastBox = $('#toasts');
  function floatText(txt, sx, sy, cls) {
    const el = document.createElement('div');
    el.className = 'float-txt' + (cls ? ' ' + cls : '');
    el.textContent = txt;
    el.style.left = Math.round(sx) + 'px';
    el.style.top = Math.round(sy) + 'px';
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }
  function floatWorld(txt, wx, wy, cls) {
    const p = worldToScreen(wx, wy);
    if (p.x < -40 || p.x > innerWidth + 40) return;
    floatText(txt, p.x - 20, p.y - 10, cls);
  }
  function toast(opts) {
    while (toastBox.children.length >= 3) toastBox.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    if (opts.sprite) el.appendChild(opts.sprite);
    const txt = document.createElement('div');
    if (opts.title) { const b = document.createElement('b'); b.textContent = opts.title; txt.appendChild(b); }
    if (opts.body) txt.appendChild(document.createTextNode(opts.body));
    el.appendChild(txt);
    toastBox.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, opts.long ? 6000 : 3600);
  }
  function cloneCanvas(src) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }
  const chickEl = (sp, k, sil) => cloneCanvas(SPR.chickenSprite(sp, k, sil));

  /* ================= CANVAS & CAMERA ================= */
  const cv = $('#world');
  const ctx = cv.getContext('2d');
  const SC = 3;
  cv.width = W.view.w * SC; cv.height = W.view.h * SC;

  function cam() { return S().cam; }
  function worldToScreen(wx, wy) {
    const r = cv.getBoundingClientRect();
    return {
      x: r.left + (wx - cam().x) / W.view.w * r.width,
      y: r.top + (wy - cam().y) / W.view.h * r.height,
    };
  }
  function eventToWorld(ev) {
    const r = cv.getBoundingClientRect();
    return {
      x: cam().x + (ev.clientX - r.left) / r.width * W.view.w,
      y: cam().y + (ev.clientY - r.top) / r.height * W.view.h,
      sx: ev.clientX, sy: ev.clientY,
    };
  }

  /* ================= STATIC GROUND ================= */
  function mulberry(seed) {
    let a = seed + 0x6D2B79F5;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  let groundCv = null;

  function bakePlotDeco(g, p, rnd) {
    const x0 = p.tc * 16, y0 = p.tr * 16;
    const place = (spr, n, yMin, yMax) => {
      for (let i = 0; i < n; i++) {
        let x, y, tries = 0;
        do {
          x = x0 + 6 + rnd() * (PLOT_W * 16 - 30);
          y = y0 + (yMin || 8) + rnd() * ((yMax || PLOT_H * 16 - 40) - (yMin || 8));
          tries++;
        } while (tries < 24 && (
          GAME.inPond(x + 8, y + 4) ||
          GAME.inStation(x + 8, y + 4, 14) ||
          (Math.abs(x - W.mama.x) < 34 && Math.abs(y - W.mama.y) < 34) ||
          (y > W.roadY - 40 && Math.abs(x - (W.truckHome.x + 28)) < 50)
        ));
        g.drawImage(spr, Math.floor(x), Math.floor(y));
      }
    };
    const T = k => SPR.decoSprite(k, 1);
    if (p.theme === 'home') {
      place(T('bush'), 3); place(T('flower'), 6); place(T('tuft'), 9); place(T('rock'), 2); place(T('shroom'), 2);
    } else if (p.theme === 'sunflower') {
      /* procedural sunflowers */
      for (let i = 0; i < 12; i++) {
        const x = Math.floor(x0 + 10 + rnd() * (PLOT_W * 16 - 30));
        const y = Math.floor(y0 + 16 + rnd() * (PLOT_H * 16 - 70));
        g.fillStyle = '#3a7d3a'; g.fillRect(x + 2, y + 5, 2, 8);
        g.fillStyle = '#ffd23f';
        g.fillRect(x, y + 1, 6, 4); g.fillRect(x + 1, y, 4, 6);
        g.fillStyle = '#8a5e2a'; g.fillRect(x + 2, y + 2, 2, 2);
      }
      place(T('tuft'), 8); place(T('flower'), 4);
    } else if (p.theme === 'rocky') {
      place(T('rock'), 8); place(T('pine'), 3, 8, PLOT_H * 16 - 60); place(T('tuft'), 6); place(T('stump'), 2);
    } else if (p.theme === 'berry') {
      place(T('bush'), 9); place(T('tuft'), 7); place(T('flower'), 3);
    } else if (p.theme === 'lavender') {
      for (let i = 0; i < 16; i++) {
        const x = Math.floor(x0 + 8 + rnd() * (PLOT_W * 16 - 22));
        const y = Math.floor(y0 + 14 + rnd() * (PLOT_H * 16 - 50));
        g.fillStyle = '#3a7d3a'; g.fillRect(x + 2, y + 4, 1, 4);
        g.fillStyle = '#a58ae0';
        g.fillRect(x + 1, y, 3, 4); g.fillRect(x, y + 1, 5, 2);
      }
      place(T('flower'), 5); place(T('tuft'), 6);
    } else if (p.theme === 'shroom') {
      place(T('shroom'), 9); place(T('stump'), 3); place(T('tuft'), 7); place(T('pine'), 2, 8, PLOT_H * 16 - 60);
    }
  }

  function buildGround() {
    groundCv = document.createElement('canvas');
    groundCv.width = W.W; groundCv.height = W.H;
    const g = groundCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const rnd = mulberry(20260830);
    /* grass everywhere */
    g.fillStyle = '#8ed254'; g.fillRect(0, 0, W.W, W.H);
    g.fillStyle = '#86c94d';
    for (let y = 0; y < W.H; y += 8)
      for (let x = (y / 8) % 2 ? 8 : 0; x < W.W; x += 16)
        g.fillRect(x, y, 8, 8);
    g.fillStyle = '#79bf42';
    for (let i = 0; i < 700; i++) g.fillRect(Math.floor(rnd() * W.W), Math.floor(rnd() * (W.H - 8)), 1, 2);
    /* road across the bottom plots */
    g.fillStyle = '#c9a35f'; g.fillRect(0, W.roadY, W.W, W.H - W.roadY);
    g.fillStyle = '#b58a48';
    for (let x = 0; x < W.W; x += 10) { g.fillRect(x, W.roadY, 6, 1); g.fillRect(x + 4, W.H - 3, 5, 1); }
    g.fillStyle = '#a8783f';
    for (let i = 0; i < 90; i++) g.fillRect(Math.floor(rnd() * W.W), W.roadY + 3 + Math.floor(rnd() * 26), 2, 1);
    g.fillStyle = '#8a5e2a'; g.fillRect(0, W.roadY - 1, W.W, 1);
    /* pond (start plot) */
    const p = W.pond;
    g.fillStyle = '#e8d5a8'; g.fillRect(p.x - 3, p.y - 2, p.w + 6, p.h + 5);
    g.fillStyle = '#5fb8dd'; g.fillRect(p.x, p.y, p.w, p.h);
    g.fillStyle = '#7fd0ee'; g.fillRect(p.x + 3, p.y + 2, p.w - 6, p.h - 5);
    g.fillStyle = '#6ab04c'; g.fillRect(p.x + 6, p.y + p.h - 8, 5, 3); g.fillRect(p.x + p.w - 13, p.y + 4, 5, 3);
    g.fillStyle = '#ff8ab5'; g.fillRect(p.x + p.w - 11, p.y + 3, 2, 2);
    /* per-plot deco + tree borders on top row */
    PLOTS.forEach(pl => bakePlotDeco(g, pl, mulberry(999 + pl.id * 77)));
    /* top tree line across the whole top row of plots */
    const kinds = ['tree', 'pine', 'apple'];
    for (let x = 2; x < W.W - 18; x += 34 + Math.floor(rnd() * 10)) {
      const spr = SPR.decoSprite(kinds[Math.floor(rnd() * 3)], 1);
      g.drawImage(spr, x, 2 - Math.floor(rnd() * 3));
    }
    /* side tree columns */
    for (let y = 20; y < W.roadY - 30; y += 44 + Math.floor(rnd() * 16)) {
      g.drawImage(SPR.decoSprite(rnd() < 0.5 ? 'tree' : 'pine', 1), 0 - 4, y);
      g.drawImage(SPR.decoSprite(rnd() < 0.5 ? 'tree' : 'pine', 1), W.W - 16, y);
    }
    /* mama's nest patch */
    g.fillStyle = '#a8d35f'; g.fillRect(W.mama.x - 16, W.mama.y - 4, 34, 20);
    /* locked plots: darken + fence */
    PLOTS.forEach(pl => {
      if (S().plots[pl.id]) return;
      const x0 = pl.tc * 16, y0 = pl.tr * 16, w = PLOT_W * 16, h = PLOT_H * 16;
      g.fillStyle = 'rgba(30,46,22,.38)';
      g.fillRect(x0, y0, w, h);
      /* fence around it */
      g.fillStyle = '#8a6a3f';
      for (let x = x0 + 4; x < x0 + w; x += 24) { g.fillRect(x, y0 + 2, 4, 12); g.fillRect(x, y0 + h - 14, 4, 12); }
      for (let y = y0 + 4; y < y0 + h; y += 24) { g.fillRect(x0 + 2, y, 4, 12); g.fillRect(x0 + w - 6, y, 4, 12); }
      g.fillStyle = '#a8845a';
      g.fillRect(x0 + 2, y0 + 5, w - 4, 3); g.fillRect(x0 + 2, y0 + h - 10, w - 4, 3);
      g.fillRect(x0 + 3, y0 + 4, 3, h - 8); g.fillRect(x0 + w - 6, y0 + 4, 3, h - 8);
    });
    GAME.dirty.ground = false;
  }

  /* ================= PARTICLES ================= */
  let parts = [];
  function puff(x, y, col, n, spread, up) {
    for (let i = 0; i < n; i++) {
      parts.push({ type: 'px', x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * (spread || 30), vy: -(up || 26) - Math.random() * 18,
        g: 90, t: 0, life: 0.5 + Math.random() * 0.4, col, s: Math.random() < 0.4 ? 2 : 1 });
    }
  }
  function heart(x, y, n) {
    for (let i = 0; i < (n || 2); i++) {
      parts.push({ type: 'heart', x: x + (Math.random() - 0.5) * 12, y: y - 4,
        vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 8, g: 0, t: 0, life: 0.9, col: '#ff5f9e', s: 1 });
    }
  }
  function shellBurst(x, y, tier) {
    puff(x, y, EGG_SHELL[tier], 8, 40, 30);
    puff(x, y, '#ffffff', 4, 30, 34);
  }
  function coinBurst(x, y, n) {
    for (let i = 0; i < Math.min(n, 14); i++) {
      parts.push({ type: 'coin', x, y, vx: (Math.random() - 0.5) * 50, vy: -40 - Math.random() * 30,
        g: 130, t: 0, life: 0.8 + Math.random() * 0.3, col: '#ffd23f', s: 1 });
    }
  }
  const HEART_PX = [[1,0],[3,0],[0,1],[1,1],[2,1],[3,1],[4,1],[1,2],[2,2],[3,2],[2,3]];
  function drawParts(dt) {
    parts = parts.filter(p => (p.t += dt) < p.life);
    parts.forEach(p => {
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      if (p.type === 'heart') {
        ctx.fillStyle = p.col;
        HEART_PX.forEach(([hx, hy]) => ctx.fillRect(Math.round(p.x + hx), Math.round(p.y + hy), 1, 1));
      } else if (p.type === 'coin') {
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
        ctx.fillStyle = '#fff2b0'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      } else {
        ctx.fillStyle = p.col;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
    });
    ctx.globalAlpha = 1;
  }
  const flies = [0, 1, 2, 3, 4].map(i => ({
    x: Math.random() * W.W, y: 40 + Math.random() * 300,
    a: Math.random() * Math.PI * 2, col: ['#ff8ab5', '#fff5d9', '#ffd23f', '#c9a8f0', '#aee7ff'][i],
  }));

  /* ================= INPUT STATE ================= */
  const ptr = { x: -999, y: -999, sx: 0, sy: 0, inside: false, down: false, downAt: 0, downX: 0, downY: 0, moved: 0, mode: null, target: null };
  let buildSel = null;          /* which building is selected in the palette */
  let placeDir = 0;
  let paintTile = null;
  let sprinkleCd = 0;
  const petFx = new Map();
  const keys = {};

  /* ================= DRAW HELPERS ================= */
  function drawEgg(e, now) {
    const spr = SPR.eggSprite(e.tier, 1);
    ctx.fillStyle = 'rgba(46,58,26,.25)';
    ctx.fillRect(Math.round(e.x - 3), Math.round(e.y - 1), 7, 2);
    ctx.drawImage(spr, Math.round(e.x - 5), Math.round(e.y - 12 + e.z));
    if (e.golden) {
      ctx.fillStyle = 'rgba(255,220,80,.9)';
      if (Math.floor(now / 160) % 3 === 0) ctx.fillRect(Math.round(e.x + 2), Math.round(e.y - 12 + e.z), 1, 1);
      ctx.fillRect(Math.round(e.x - 4), Math.round(e.y - 6 + e.z), 1, 1);
    }
    if (e.rainbow) {
      const cols = ['#ff5f5f', '#ffd23f', '#7ac74f', '#5fa8e8', '#c96be0'];
      ctx.fillStyle = cols[Math.floor(now / 130) % cols.length];
      ctx.fillRect(Math.round(e.x - 2), Math.round(e.y - 9 + e.z), 2, 2);
      ctx.fillStyle = cols[(Math.floor(now / 130) + 2) % cols.length];
      ctx.fillRect(Math.round(e.x + 1), Math.round(e.y - 5 + e.z), 1, 2);
    }
  }
  function drawPlume(pl, now) {
    const spr = SPR.uiSprite('plume', 1);
    const bob = pl.z >= 0 ? Math.sin(now / 400 + pl.sway) * 0.8 : 0;
    ctx.drawImage(spr, Math.round(pl.x - 3), Math.round(pl.y + pl.z - 4 + bob));
    if (Math.floor(now / 300 + pl.sway) % 4 === 0) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.round(pl.x + 2), Math.round(pl.y + pl.z - 5), 1, 1);
    }
  }

  function drawBelt(c, r, dir, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = '#5e636e'; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#9aa0aa'; ctx.fillRect(x + 1, y + 1, 14, 14);
    const phase = Math.floor(now / 1000 * GAME.beltSpeed()) % 8;
    ctx.fillStyle = '#c8cdd6';
    const horiz = dir === 0 || dir === 2;
    for (let i = -1; i < 3; i++) {
      let off = i * 8 + (dir === 0 || dir === 1 ? phase : 8 - phase);
      off = ((off % 16) + 16) % 16;
      if (horiz) ctx.fillRect(x + off, y + 2, 2, 12);
      else ctx.fillRect(x + 2, y + off, 12, 2);
    }
    ctx.fillStyle = '#3f434c';
    if (horiz) { ctx.fillRect(x, y, 16, 2); ctx.fillRect(x, y + 14, 16, 2); }
    else { ctx.fillRect(x, y, 2, 16); ctx.fillRect(x + 14, y, 2, 16); }
    ctx.fillStyle = '#ffd23f';
    const [dx, dy] = [[13, 7], [7, 13], [1, 7], [7, 1]][dir];
    ctx.fillRect(x + dx, y + dy, 2, 2);
  }

  function drawVacuum(c, r, v, now) {
    const x = c * 16, y = r * 16;
    const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][v.dir];
    ctx.fillStyle = '#2e3238'; ctx.fillRect(x + 3, y + 2, 10, 13);
    ctx.fillStyle = '#b8bcc4'; ctx.fillRect(x + 4, y + 3, 8, 11);
    ctx.fillStyle = '#d5d9df'; ctx.fillRect(x + 5, y + 4, 6, 4);
    const suck = S().eggs.some(e => e.suck === (c + ',' + r));
    ctx.fillStyle = suck ? '#3fd0ff' : '#2e3238';
    ctx.fillRect(x + 6, y + 5, 4, 2);
    if (suck && Math.floor(now / 120) % 2) { ctx.fillStyle = '#aee7ff'; ctx.fillRect(x + 7, y + 5, 2, 2); }
    ctx.fillStyle = '#6a6f78';
    ctx.fillRect(x + 5, y, 6, 2); ctx.fillRect(x + 6, y + 2, 4, 1);
    ctx.fillStyle = '#3f434c';
    ctx.fillRect(x + 7 + dx * 6, y + 9 + dy * 5, 2 + Math.abs(dx) * 2, 2 + Math.abs(dy) * 2);
    for (let i = 0; i < Math.min(v.hold.length, 4); i++) {
      ctx.fillStyle = EGG_SHELL[v.hold[i].tier];
      ctx.fillRect(x + 4 + i * 2, y + 12, 2, 2);
    }
  }

  function drawIncubator(c, r, inc, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 1, y + 6, 30, 25);
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(x + 2, y + 7, 28, 23);
    ctx.fillStyle = '#d9c9a8'; ctx.fillRect(x + 2, y + 24, 28, 6);
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 5, y + 1, 22, 12);
    ctx.fillStyle = '#cfeef5'; ctx.fillRect(x + 6, y + 2, 20, 10);
    ctx.fillStyle = '#e8f8fd'; ctx.fillRect(x + 7, y + 3, 6, 3);
    if (inc.queue.length) {
      const egg = SPR.eggSprite(inc.queue[0].tier, 1);
      ctx.drawImage(egg, x + 12, y + 2);
      const need = GAME.incHatchTime(inc.queue[0].tier, inc.queue[0].rainbow);
      const f = Math.min(1, inc.prog / need);
      ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 4, y + 15, 24, 3);
      ctx.fillStyle = '#7ac74f'; ctx.fillRect(x + 5, y + 16, Math.round(22 * f), 1);
      ctx.fillStyle = Math.floor(now / 300) % 2 ? '#ff9f1c' : '#ffd23f';
      ctx.fillRect(x + 26, y + 20, 2, 2);
    } else {
      ctx.fillStyle = '#8a8d96'; ctx.fillRect(x + 26, y + 20, 2, 2);
      ctx.fillStyle = 'rgba(122,90,58,.28)';
      ctx.fillRect(x + 13, y + 3, 6, 8); ctx.fillRect(x + 14, y + 2, 4, 10);
    }
    for (let i = 0; i < Math.min(inc.queue.length, 16); i++) {
      ctx.fillStyle = EGG_SHELL[inc.queue[i].tier];
      ctx.fillRect(x + 4 + (i % 8) * 3, y + 21 + Math.floor(i / 8) * 3, 2, 2);
    }
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(x + 3, y + 30, 4, 2); ctx.fillRect(x + 25, y + 30, 4, 2);
  }

  function drawLoveNest(c, r, nest, now) {
    const x = c * 16, y = r * 16;
    /* heart arch */
    ctx.fillStyle = '#b3773f';
    ctx.fillRect(x + 2, y + 2, 3, 22); ctx.fillRect(x + 27, y + 2, 3, 22);
    ctx.fillRect(x + 2, y, 28, 3);
    ctx.fillStyle = '#ff5f9e';
    [[14,3],[16,3],[13,4],[15,4],[17,4],[14,5],[16,5],[15,6]].forEach(([hx, hy]) => ctx.fillRect(x + hx, y + hy, 1, 1));
    /* big nest */
    const nestSpr = SPR.nestSprite(1);
    ctx.drawImage(nestSpr, 0, 0, 20, 7, x + 2, y + 20, 28, 10);
    /* occupants */
    nest.slots.forEach((s, i) => {
      if (!s) return;
      const spr = SPR.chickenSprite(SPECIES[s.sp], 1, false);
      const bob = Math.sin(now / 200 + i * 2) * 1;
      ctx.drawImage(spr, x + 1 + i * 12, y + 6 + Math.round(bob));
    });
    if (nest.slots[0] && nest.slots[1]) {
      /* breeding! hearts + progress */
      if (Math.random() < 0.1) heart(x + 16, y + 8, 1);
      const a = SPECIES[nest.slots[0].sp], b = SPECIES[nest.slots[1].sp];
      let need = GAME.breedTime();
      if (a.id === b.id) need *= 0.6;
      ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 5, y + 30, 22, 3);
      ctx.fillStyle = '#ff5f9e'; ctx.fillRect(x + 6, y + 31, Math.round(20 * Math.min(1, nest.prog / need)), 1);
    } else if (!nest.slots[0] && !nest.slots[1]) {
      ctx.fillStyle = 'rgba(74,50,32,.55)';
      ctx.font = '5px monospace';
      ctx.fillText('drop 2', x + 4, y + 13);
      ctx.fillText('hens', x + 7, y + 19);
    }
  }

  /* stations */
  function drawLab(now) {
    const s = W.stations.lab;
    const x = s.x, y = s.y;
    /* shack */
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x, y + 8, 30, 24);
    ctx.fillStyle = '#e8d5a8'; ctx.fillRect(x + 1, y + 9, 28, 22);
    ctx.fillStyle = '#d9c28c'; ctx.fillRect(x + 1, y + 25, 28, 6);
    /* roof */
    ctx.fillStyle = '#3f6ea8'; ctx.fillRect(x - 2, y + 4, 34, 6);
    ctx.fillStyle = '#5fa8e8'; ctx.fillRect(x - 1, y + 2, 32, 4);
    ctx.fillStyle = '#2e3a55'; ctx.fillRect(x - 2, y + 9, 34, 1);
    /* window with bubbling flask */
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 5, y + 13, 12, 11);
    ctx.fillStyle = '#cfeef5'; ctx.fillRect(x + 6, y + 14, 10, 9);
    ctx.fillStyle = '#7ac74f';
    ctx.fillRect(x + 9, y + 18, 4, 4); ctx.fillRect(x + 10, y + 16, 2, 2);
    const bub = Math.floor(now / 250) % 3;
    ctx.fillStyle = '#aee7ff';
    ctx.fillRect(x + 9 + bub, y + 17 - bub, 1, 1);
    /* door + feather emblem */
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 20, y + 17, 7, 14);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 20, y + 17, 7, 2);
    ctx.drawImage(SPR.uiSprite('plume', 1), x + 21, y + 21);
    /* smoke */
    if (Math.floor(now / 700) % 3 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillRect(x + 24, y - 2 - (Math.floor(now / 200) % 4), 3, 3);
    }
  }
  function drawStand() {
    const s = W.stations.stand;
    ctx.fillStyle = '#4a3220'; ctx.fillRect(s.x + 5, s.y + 10, 5, 14);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(s.x + 6, s.y + 10, 3, 13);
    /* open book */
    ctx.fillStyle = '#4a3220'; ctx.fillRect(s.x, s.y + 4, 16, 8);
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(s.x + 1, s.y + 5, 6, 6);
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(s.x + 9, s.y + 5, 6, 6);
    ctx.fillStyle = '#b5a583';
    ctx.fillRect(s.x + 2, s.y + 6, 4, 1); ctx.fillRect(s.x + 2, s.y + 8, 4, 1);
    ctx.fillRect(s.x + 10, s.y + 6, 4, 1); ctx.fillRect(s.x + 10, s.y + 8, 4, 1);
  }
  function drawMamaSign(now) {
    const s = W.stations.mamaSign;
    const affordable = S().coins >= GAME.mamaCost() && S().mamaTier < TIERS.length - 2;
    ctx.drawImage(SPR.uiSprite('sign', 1), s.x, s.y + 4);
    ctx.font = '5px monospace';
    if (S().mamaTier >= TIERS.length - 2) {
      ctx.fillStyle = '#7a5a3a'; ctx.fillText('MAX', s.x + 2, s.y + 10);
    } else {
      ctx.fillStyle = affordable && Math.floor(now / 400) % 2 ? '#2e6e2e' : '#7a5a3a';
      ctx.fillText('^' + GAME.fmt(GAME.mamaCost()), s.x + 1, s.y + 10);
    }
  }
  function drawSaleSigns(now) {
    ctx.font = '5px monospace';
    PLOTS.forEach(p => {
      if (S().plots[p.id]) return;
      if (!plotNeighbors(p.id).some(n => S().plots[n])) return;   /* not reachable yet */
      const cx = p.tc * 16 + PLOT_W * 8, cy = p.tr * 16 + PLOT_H * 8;
      const wig = S().coins >= p.price ? Math.sin(now / 200) * 1.5 : 0;
      ctx.save();
      ctx.translate(Math.round(cx), Math.round(cy));
      ctx.rotate(wig * 0.03);
      const spr = SPR.uiSprite('sign', 2);
      ctx.drawImage(spr, -14, -10);
      ctx.restore();
      ctx.fillStyle = '#4a3220';
      ctx.fillText('FOR SALE', cx - 11, cy - 3);
      ctx.fillStyle = S().coins >= p.price ? '#2e6e2e' : '#8a3a2a';
      ctx.fillText('$' + GAME.fmt(p.price), cx - 8, cy + 3);
    });
  }

  function truckX(now) {
    const tr = S().truck;
    const T = GAME.tripTime();
    if (tr.state === 'parked') return W.truckHome.x;
    const gone = T - tr.t;
    if (gone < 1) return W.truckHome.x + gone * 220;
    if (tr.t < 1) return W.truckHome.x + tr.t * 220;
    return 99999;
  }
  function drawTruck(now) {
    const tr = S().truck;
    const x = truckX(now);
    if (x > W.W + 80) return;
    const y = W.roadY - 4;
    const bounce = tr.state === 'parked' ? 0 : Math.round(Math.sin(now / 40) * 1);
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x, y - 12 + bounce, 34, 20);
    ctx.fillStyle = '#c98f4f'; ctx.fillRect(x + 1, y - 11 + bounce, 32, 18);
    ctx.fillStyle = '#a8663a'; ctx.fillRect(x + 1, y - 11 + bounce, 32, 3);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 1, y + 4 + bounce, 32, 3);
    const n = Math.min(tr.load.length, 12);
    for (let i = 0; i < n; i++) {
      const ex = x + 3 + (i % 6) * 5, ey = y - 4 + bounce - Math.floor(i / 6) * 4;
      const egg = tr.load[i];
      ctx.fillStyle = EGG_SHELL[egg.tier];
      ctx.fillRect(ex, ey, 4, 5);
      ctx.fillStyle = SPR.darken(EGG_SHELL[egg.tier], 0.35);
      ctx.fillRect(ex, ey + 4, 4, 1);
      if (egg.golden) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(ex + 1, ey + 1, 1, 1); }
    }
    ctx.fillStyle = '#2e3a55'; ctx.fillRect(x + 34, y - 16 + bounce, 18, 24);
    ctx.fillStyle = '#5fa8e8'; ctx.fillRect(x + 35, y - 15 + bounce, 16, 22);
    ctx.fillStyle = '#cfeef5'; ctx.fillRect(x + 37, y - 13 + bounce, 9, 7);
    ctx.fillStyle = '#3f6ea8'; ctx.fillRect(x + 35, y + 1 + bounce, 16, 6);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 49, y - 2 + bounce, 2, 3);
    ctx.fillStyle = '#23262b';
    ctx.fillRect(x + 4, y + 6, 8, 8); ctx.fillRect(x + 38, y + 6, 8, 8);
    ctx.fillStyle = '#d5d9df';
    ctx.fillRect(x + 7, y + 9, 2, 2); ctx.fillRect(x + 41, y + 9, 2, 2);
    if (tr.state === 'parked') {
      ctx.font = '5px monospace';
      ctx.fillStyle = '#3a2a16';
      ctx.fillText(tr.load.length + '/' + GAME.truckCap(), x + 8, y - 15);
      if (tr.load.length > 0 && Math.floor(now / 500) % 2) {
        ctx.fillStyle = '#2e6e2e';
        ctx.fillText('SEND?', x + 33, y - 19);
      }
    }
  }

  function drawChicken(ch, now) {
    if (ch.x + 24 < cam().x || ch.x > cam().x + W.view.w || ch.y + 24 < cam().y || ch.y > cam().y + W.view.h) return;
    const sp = SPECIES[ch.sp];
    const spr = SPR.chickenSprite(sp, 1, false);
    const bob = ch.state === 'walk' || ch.state === 'seek' ? Math.abs(Math.sin(now / 110 + ch.id)) * 1.6
              : ch.state === 'peck' ? Math.abs(Math.sin(now / 200)) * 1.2 : Math.sin(now / 500 + ch.id) * 0.6;
    let hop = 0;
    const pf = petFx.get(ch.id);
    if (pf && now - pf < 350) hop = Math.sin((now - pf) / 350 * Math.PI) * 4;
    const yy = Math.round(ch.y - bob - hop);
    ctx.fillStyle = 'rgba(46,58,26,.25)';
    ctx.fillRect(Math.round(ch.x + 4), Math.round(ch.y + 17), 12, 2);
    ctx.save();
    if (ch.dir === 1) {
      ctx.translate(Math.round(ch.x) + spr.width, yy);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0);
    } else ctx.drawImage(spr, Math.round(ch.x), yy);
    ctx.restore();
    if (ch.buffT > 0 && Math.floor(now / 250) % 2) {
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(Math.round(ch.x + 16), Math.round(yy - 3), 2, 2);
    }
    if (sp.tier >= 6 && Math.random() < 0.06) {
      ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#ffd23f';
      ctx.fillRect(Math.round(ch.x + Math.random() * 18), Math.round(yy + Math.random() * 14), 1, 1);
    }
  }

  function drawMama(now) {
    const m = W.mama;
    const nest = SPR.nestSprite(1);
    const pf = petFx.get('mama');
    const happy = pf && now - pf < 700;
    const mood = happy ? 'happy' : (Math.floor(now / 3200) % 8 === 7 ? 'blink' : 'idle');
    const mama = SPR.mamaSprite(S().mamaTier, 1, mood);
    const bob = Math.sin(now / 450) * 1;
    let squish = 0;
    if (pf && now - pf < 250) squish = 1 - (now - pf) / 250;
    ctx.fillStyle = 'rgba(46,58,26,.2)';
    ctx.fillRect(m.x - 12, m.y + 12, 26, 3);
    ctx.save();
    ctx.translate(m.x + 1, m.y + 14);
    ctx.scale(1 + squish * 0.12, 1 - squish * 0.12);
    ctx.drawImage(mama, -15, -26 + Math.round(bob));
    ctx.restore();
    ctx.drawImage(nest, m.x - 10, m.y + 6);
    if (S().mama.petCd <= 0 && Math.floor(now / 400) % 2) {
      ctx.fillStyle = '#fff'; ctx.fillRect(m.x + 12, m.y - 22, 2, 2);
    }
  }

  /* the floating hand */
  function drawHand(now) {
    if (!ptr.inside) return;
    const x = ptr.x, y = ptr.y;
    const held = S().held;
    const tool = S().tool;
    /* soft shadow so the hand reads against pale eggs */
    ctx.fillStyle = 'rgba(46,58,26,.20)';
    ctx.fillRect(Math.round(x - 4), Math.round(y + 2), 9, 2);
    /* held things dangle under the hand */
    if (held) {
      if (held.kind === 'chicken') {
        const spr = SPR.chickenSprite(SPECIES[held.ch.sp], 1, false);
        const sway = Math.sin(now / 180) * 2;
        ctx.save();
        ctx.translate(Math.round(x + sway), Math.round(y + 4));
        ctx.rotate(sway * 0.02);
        ctx.drawImage(spr, -10, -6);
        ctx.restore();
      } else {
        const spr = SPR.eggSprite(held.egg.tier, 1);
        ctx.drawImage(spr, Math.round(x - 5), Math.round(y - 2));
      }
    }
    if (tool === 'basket') {
      const b = SPR.uiSprite('basket', 1);
      ctx.drawImage(b, Math.round(x - 6), Math.round(y - 2 + (ptr.down ? 2 : 0)));
      /* eggs peeking out */
      const n = Math.min(S().basket.length, 4);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = EGG_SHELL[S().basket[S().basket.length - 1 - i].tier];
        ctx.fillRect(Math.round(x - 3 + i * 3), Math.round(y - 4 + (ptr.down ? 2 : 0)), 2, 3);
      }
    } else if (tool === 'feed') {
      ctx.drawImage(SPR.uiSprite('feedbag', 1), Math.round(x - 5), Math.round(y - 3));
    } else if (tool === 'build') {
      const h = SPR.uiSprite('hammer', 1);
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(ptr.down ? 0.5 : 0.15);
      ctx.drawImage(h, -4, -6);
      ctx.restore();
    }
    const hand = SPR.uiSprite(ptr.down || held ? 'handGrab' : 'handPoint', 1);
    const hy = ptr.down ? y - hand.height + 3 : y - hand.height + 1;
    ctx.drawImage(hand, Math.round(x - 6), Math.round(hy - (held ? 6 : 0)));
  }

  function drawGhost(now) {
    if (S().tool !== 'build' || !buildSel || !ptr.inside) return;
    const c = Math.floor(ptr.x / 16), r = Math.floor(ptr.y / 16);
    if (buildSel === 'remove') {
      const o = GAME.occAt(c, r);
      ctx.fillStyle = o ? 'rgba(232,84,47,.4)' : 'rgba(0,0,0,.15)';
      ctx.fillRect(c * 16, r * 16, 16, 16);
      return;
    }
    const b = BUILDS[buildSel];
    const ok = GAME.canPlace(buildSel, c, r) && S().coins >= buildCost(buildSel, S().built[buildSel]);
    ctx.globalAlpha = 0.55;
    if (buildSel === 'belt') drawBelt(c, r, placeDir, now);
    else if (buildSel === 'vacuum') drawVacuum(c, r, { dir: placeDir, hold: [] }, now);
    else if (buildSel === 'lovenest') drawLoveNest(c, r, { slots: [null, null], prog: 0 }, now);
    else drawIncubator(c, r, { queue: [], prog: 0 }, now);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ok ? 'rgba(122,199,79,.3)' : 'rgba(232,84,47,.35)';
    ctx.fillRect(c * 16, r * 16, b.w * 16, b.h * 16);
    if (buildSel === 'vacuum') {
      ctx.strokeStyle = 'rgba(63,208,255,.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c * 16 + 8, r * 16 + 8, GAME.vacR(), 0, Math.PI * 2); ctx.stroke();
    }
  }

  /* ================= RENDER ================= */
  function render(now, dt) {
    if (GAME.dirty.ground || !groundCv) buildGround();
    ctx.setTransform(SC, 0, 0, SC, Math.round(-cam().x * SC), Math.round(-cam().y * SC));
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(cam().x, cam().y, W.view.w, W.view.h);
    ctx.drawImage(groundCv, 0, 0);

    /* pond shimmer + ducks */
    const p = W.pond;
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 3; i++) {
      const sx = p.x + 6 + ((i * 17 + Math.floor(now / 400)) % (p.w - 12));
      ctx.fillRect(sx, p.y + 5 + i * 8, 4, 1);
    }
    for (let i = 0; i < 2; i++) {
      const ph = (now / (9000 + i * 3000)) % 1;
      const dx = p.x + 8 + (ph < 0.5 ? ph * 2 : (1 - ph) * 2) * (p.w - 22);
      const dy = p.y + 6 + i * 12;
      ctx.fillStyle = '#fff8ec'; ctx.fillRect(Math.round(dx), Math.round(dy), 6, 4);
      ctx.fillRect(Math.round(dx + 4), Math.round(dy - 3), 3, 4);
      ctx.fillStyle = '#f2a03f'; ctx.fillRect(Math.round(dx + 7), Math.round(dy - 2), 2, 1);
      ctx.fillStyle = '#2e2216'; ctx.fillRect(Math.round(dx + 5), Math.round(dy - 2), 1, 1);
    }

    /* stations */
    drawLab(now); drawStand(); drawMamaSign(now);

    /* buildings */
    for (const k of Object.keys(S().belts)) { const [c, r] = k.split(',').map(Number); drawBelt(c, r, S().belts[k].dir, now); }
    for (const k of Object.keys(S().vacs)) { const [c, r] = k.split(',').map(Number); drawVacuum(c, r, S().vacs[k], now); }
    for (const k of Object.keys(S().incs)) { const [c, r] = k.split(',').map(Number); drawIncubator(c, r, S().incs[k], now); }
    for (const k of Object.keys(S().nests)) { const [c, r] = k.split(',').map(Number); drawLoveNest(c, r, S().nests[k], now); }

    /* belt items */
    S().items.forEach(it => {
      const spr = SPR.eggSprite(it.tier, 1);
      ctx.drawImage(spr, Math.round(it.x - 5), Math.round(it.y - 8));
    });
    /* feed */
    S().feed.forEach(f => {
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
      ctx.fillRect(Math.round(f.x - 3), Math.round(f.y + 2), 2, 2);
      ctx.fillRect(Math.round(f.x + 3), Math.round(f.y + 1), 2, 2);
    });
    /* eggs & plumes */
    S().eggs.forEach(e => drawEgg(e, now));
    S().plumes.forEach(pl => drawPlume(pl, now));
    /* mama & chickens */
    drawMama(now);
    S().chickens.forEach(ch => drawChicken(ch, now));
    /* truck & signs */
    drawTruck(now);
    drawSaleSigns(now);
    /* butterflies */
    flies.forEach((f, i) => {
      f.a += dt * (0.6 + i * 0.13);
      f.x += Math.cos(f.a) * 12 * dt;
      f.y += Math.sin(f.a * 1.4) * 9 * dt;
      f.x = Math.max(6, Math.min(W.W - 8, f.x));
      f.y = Math.max(24, Math.min(W.roadY - 12, f.y));
      const flap = Math.floor(now / 90 + i) % 2;
      ctx.fillStyle = f.col;
      ctx.fillRect(Math.round(f.x - 1 - flap), Math.round(f.y), 2, 2);
      ctx.fillRect(Math.round(f.x + 1 + flap), Math.round(f.y), 2, 2);
      ctx.fillStyle = '#3a2a16'; ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 2);
    });
    drawParts(dt);
    /* scoop ring */
    if (ptr.down && S().tool === 'basket' && ptr.inside) {
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(ptr.x, ptr.y, GAME.scoopR(), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    /* drop highlights while carrying */
    if ((S().held || (S().tool === 'basket' && S().basket.length && ptr.down))) {
      const th = W.truckHome;
      if (S().truck.state === 'parked') {
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1;
        ctx.strokeRect(th.x - 2, th.y - 14, th.w + 4, th.h + 10);
      }
      const o = GAME.occAt(Math.floor(ptr.x / 16), Math.floor(ptr.y / 16));
      if (o && (o.type === 'incubator' || o.type === 'lovenest')) {
        const [ic, ir] = o.k.split(',').map(Number);
        ctx.strokeStyle = '#7ac74f'; ctx.lineWidth = 1;
        ctx.strokeRect(ic * 16 - 1, ir * 16 - 1, 34, 34);
      }
    }
    drawGhost(now);
    drawHand(now);
    /* cozy vignette */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.55, cv.width / 2, cv.height / 2, cv.height * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(58,42,22,.16)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }

  /* ================= MAGNET SCOOPING ================= */
  function magnet(dt) {
    if (!(ptr.down && S().tool === 'basket' && ptr.inside)) return;
    const R = GAME.scoopR();
    const eggs = S().eggs;
    for (let i = eggs.length - 1; i >= 0; i--) {
      const e = eggs[i];
      if (e.suck) continue;
      const dx = ptr.x - e.x, dy = ptr.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d < 7) {
        const r = GAME.scoopEgg(e);
        if (r === true) { snd.scoop(); updateCursorChip(); }
        else if (r === 'full' && Math.random() < 0.05) floatWorld('basket full!', ptr.x, ptr.y - 14, 'pink');
        continue;
      }
      if (d < R && S().basket.length < GAME.basketCap()) {
        const pull = (1 - d / R) * 320 * dt / d;
        e.x += dx * pull; e.y += dy * pull;
      }
    }
    for (let i = S().plumes.length - 1; i >= 0; i--) {
      const pl = S().plumes[i];
      const d = Math.hypot(ptr.x - pl.x, ptr.y - pl.y);
      if (d < R * 0.8) {
        const v = GAME.collectPlume(pl);
        if (v) { snd.plume(); floatWorld('+🪶' + v, pl.x, pl.y - 8, 'green'); }
      }
    }
  }

  /* ================= HUD ================= */
  const el = {
    coins: $('#r-coins'), feathers: $('#r-feathers'),
    cursorChip: $('#cursor-chip'), bubble: $('#bubble'),
    toolbelt: $('#toolbelt'), palette: $('#build-palette'),
  };

  function updateCursorChip() {
    if (S().tool !== 'basket') { el.cursorChip.hidden = true; return; }
    el.cursorChip.hidden = false;
    el.cursorChip.textContent = '🥚 ' + S().basket.length + '/' + GAME.basketCap();
  }
  document.addEventListener('pointermove', ev => {
    el.cursorChip.style.left = (ev.clientX + 16) + 'px';
    el.cursorChip.style.top = (ev.clientY + 10) + 'px';
  });

  function renderToolbelt() {
    const tools = [
      { id: 'hand', icon: '🖐️', title: 'Hand — pet, grab chickens & eggs, drag to pan' },
      { id: 'basket', icon: '🧺', title: 'Basket — sweep up eggs, drop on truck/incubator' },
      { id: 'feed', icon: '🌾', title: 'Feed — sprinkle seeds, hens lay 2x', locked: !GAME.lvl('feed') },
      { id: 'build', icon: '🔨', title: 'Build — place machines' },
    ];
    el.toolbelt.innerHTML = '';
    tools.forEach(t => {
      if (t.id === 'feed' && t.locked) return;
      const b = document.createElement('button');
      b.className = 'tool-btn' + (S().tool === t.id ? ' active' : '');
      b.dataset.tool = t.id;
      b.textContent = t.icon;
      b.title = t.title;
      el.toolbelt.appendChild(b);
    });
    const menu = document.createElement('button');
    menu.className = 'tool-btn tool-menu';
    menu.dataset.act = 'menu';
    menu.textContent = '⋯';
    menu.title = 'Settings';
    el.toolbelt.appendChild(menu);
  }

  function renderPalette() {
    if (S().tool !== 'build') { el.palette.hidden = true; return; }
    el.palette.hidden = false;
    el.palette.innerHTML = '';
    ['incubator', 'lovenest', 'vacuum', 'belt'].forEach(type => {
      const b = BUILDS[type];
      const locked = b.needs && !GAME.lvl(b.needs);
      const cost = buildCost(type, S().built[type]);
      const btn = document.createElement('button');
      btn.className = 'pal-btn' + (buildSel === type ? ' active' : '');
      btn.dataset.build = type;
      btn.disabled = locked;
      btn.innerHTML = `${{ incubator: '🐣', lovenest: '💘', vacuum: '🤖', belt: '↦' }[type]}<small>${locked ? '🔒' : '🪙' + GAME.fmt(cost)}</small>`;
      btn.title = b.name + ' — ' + b.desc + (locked ? ' (research first!)' : '');
      el.palette.appendChild(btn);
    });
    const rot = document.createElement('button');
    rot.className = 'pal-btn';
    rot.dataset.build = 'rotate';
    rot.innerHTML = `⟳<small>${['→', '↓', '←', '↑'][placeDir]}</small>`;
    rot.title = 'Rotate (R)';
    el.palette.appendChild(rot);
    const rem = document.createElement('button');
    rem.className = 'pal-btn' + (buildSel === 'remove' ? ' active' : '');
    rem.dataset.build = 'remove';
    rem.innerHTML = '🧨<small>remove</small>';
    el.palette.appendChild(rem);
    GAME.dirty.build = false;
  }

  /* ---------- speech-bubble hints ---------- */
  let bubbleAnchor = null, bubbleText = '', bubbleUntil = 0;
  function hintLogic(now) {
    const st = S(), stats = st.stats;
    const incK = Object.keys(st.incs)[0];
    const incPos = incK ? incK.split(',').map(Number) : null;
    let anchor = null, text = null;
    if (stats.pets === 0) { anchor = [W.mama.x, W.mama.y - 30]; text = 'pet me! ♥'; }
    else if (stats.collected === 0 && st.eggs.length > 1) { anchor = [W.mama.x + 30, W.mama.y - 10]; text = 'grab the 🧺 basket & sweep up eggs!'; }
    else if (stats.hatched === 0 && (st.basket.length > 0 || st.held)) { anchor = incPos ? [incPos[0] * 16 + 16, incPos[1] * 16 - 6] : null; text = 'drop eggs on the incubator!'; }
    else if (stats.sold === 0 && (st.basket.length > 2 || st.truck.load.length)) { anchor = [W.truckHome.x + 26, W.truckHome.y - 20]; text = st.truck.load.length ? 'tap the truck to sell!' : 'drop eggs on the truck!'; }
    else if (st.truck.state === 'parked' && st.truck.load.length >= GAME.truckCap() && !GAME.lvl('autosend')) { anchor = [W.truckHome.x + 26, W.truckHome.y - 20]; text = 'truck is full — tap to send!'; }
    else if (st.feathers >= 4 && Object.keys(st.sk).length <= 1) { anchor = [W.stations.lab.x + 15, W.stations.lab.y - 8]; text = 'research inside the lab!'; }
    else if (GAME.lvl('court') && st.built.lovenest === 0 && stats.bred === 0) { anchor = null; text = '🔨 build a LOVE NEST to breed chickens!'; }
    else if (st.mamaTier < TIERS.length - 2 && st.coins >= GAME.mamaCost() * 1.2) { anchor = [W.stations.mamaSign.x + 7, W.stations.mamaSign.y - 8]; text = 'upgrade mama here!'; }
    if (text !== bubbleText) { bubbleText = text; bubbleAnchor = anchor; }
    if (!text) { el.bubble.hidden = true; return; }
    el.bubble.hidden = false;
    el.bubble.textContent = text;
    if (anchor) {
      const sp = worldToScreen(anchor[0], anchor[1]);
      const r = cv.getBoundingClientRect();
      const bw = el.bubble.offsetWidth || 120;
      el.bubble.style.left = Math.max(r.left + 4, Math.min(sp.x - bw / 2, r.right - bw - 4)) + 'px';
      el.bubble.style.top = Math.max(r.top + 4, sp.y - 34) + 'px';
      el.bubble.classList.remove('center');
    } else {
      const r = cv.getBoundingClientRect();
      el.bubble.style.left = (r.left + r.width / 2 - (el.bubble.offsetWidth || 130) / 2) + 'px';
      el.bubble.style.top = (r.bottom - 90) + 'px';
      el.bubble.classList.add('center');
    }
  }

  function lightUpdate(now) {
    const set = (node, v) => { if (node.textContent !== v) node.textContent = v; };
    set(el.coins, GAME.fmt(S().coins));
    set(el.feathers, GAME.fmt(S().feathers));
    updateCursorChip();
    hintLogic(now);
    if (GAME.dirty.build) { renderPalette(); }
  }

  /* ================= MODALS ================= */
  function openModal(id) { $(id).hidden = false; }
  function closeModals() { document.querySelectorAll('.modal').forEach(m => m.hidden = true); }

  let selSkill = null;
  function renderSkills() {
    $('#research-sub').textContent = `🪶 ${GAME.fmt(S().feathers)}`;
    const box = $('#tree-nodes');
    box.innerHTML = '';
    const svg = $('#tree-lines');
    svg.innerHTML = '';
    const rect = { w: box.clientWidth || 900, h: box.clientHeight || 560 };
    svg.setAttribute('viewBox', `0 0 ${rect.w} ${rect.h}`);
    /* trunk */
    const trunk = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const rx = SKILL_BY_ID.root.x / 100 * rect.w, ry = SKILL_BY_ID.root.y / 100 * rect.h;
    trunk.setAttribute('d', `M ${rx} ${rect.h} L ${rx} ${ry}`);
    trunk.setAttribute('stroke', '#8a5e2a'); trunk.setAttribute('stroke-width', '14'); trunk.setAttribute('fill', 'none');
    svg.appendChild(trunk);
    SKILLS.forEach(sk => {
      if (sk.pre) {
        const a = SKILL_BY_ID[sk.pre], b = sk;
        const x1 = a.x / 100 * rect.w, y1 = a.y / 100 * rect.h;
        const x2 = b.x / 100 * rect.w, y2 = b.y / 100 * rect.h;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const my = (y1 + y2) / 2;
        path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`);
        path.setAttribute('stroke', GAME.lvl(sk.pre) ? '#8a5e2a' : '#c9b896');
        path.setAttribute('stroke-width', GAME.lvl(sk.pre) ? 6 : 3);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        svg.appendChild(path);
      }
      const cur = GAME.lvl(sk.id);
      const pre = skillPrereq(sk);
      const locked = pre && GAME.lvl(pre.id) < 1;
      const maxed = cur >= sk.max;
      const cost = skillCost(sk, cur);
      const afford = S().feathers >= cost;
      const node = document.createElement('button');
      node.className = 'tree-node' +
        (sk.id === 'root' ? ' root' : '') +
        (locked ? ' locked' : '') + (maxed ? ' maxed' : '') +
        (cur > 0 ? ' owned' : '') +
        (!locked && !maxed && afford ? ' can' : '') +
        (selSkill === sk.id ? ' sel' : '');
      node.style.left = sk.x + '%';
      node.style.top = sk.y + '%';
      node.style.setProperty('--hue', BRANCHES[sk.br].hue);
      node.dataset.skill = sk.id;
      node.innerHTML = `<span class="tn-ico">${sk.icon}</span>` +
        (sk.max > 1 ? `<span class="tn-lvl">${cur}/${sk.max}</span>` : (cur ? '<span class="tn-lvl">★</span>' : ''));
      node.title = sk.name;
      box.appendChild(node);
    });
    renderSkillCard();
    GAME.dirty.skills = false;
  }
  function renderSkillCard() {
    const card = $('#skill-card');
    if (!selSkill) {
      card.innerHTML = '<span class="sk-hint">tap a leaf to inspect it 🍃</span>';
      return;
    }
    const sk = SKILL_BY_ID[selSkill];
    const cur = GAME.lvl(sk.id);
    const pre = skillPrereq(sk);
    const locked = pre && GAME.lvl(pre.id) < 1;
    const maxed = cur >= sk.max;
    const cost = skillCost(sk, cur);
    card.innerHTML =
      `<span class="skc-ico">${sk.icon}</span>
       <div class="skc-mid">
         <b>${sk.name} <small>${cur}/${sk.max}</small></b>
         <span>${sk.desc}</span>
         ${locked ? `<span class="skc-lock">needs ${pre.name}</span>` : ''}
       </div>` +
      (sk.id === 'root' ? '<button class="btn" disabled>the trunk</button>'
        : maxed ? '<button class="btn" disabled>MAXED ★</button>'
        : locked ? `<button class="btn" disabled>🔒</button>`
        : `<button class="btn ${S().feathers >= cost ? 'btn-green' : ''}" data-act="buy-skill" data-id="${sk.id}">🪶 ${GAME.fmt(cost)}</button>`);
  }

  function renderPedia() {
    const box = $('#pedia');
    box.innerHTML = '';
    $('#pedia-sub').textContent = `${GAME.disc()} / ${SPECIES_TOTAL} discovered`;
    TIERS.forEach((tier, t) => {
      const pool = SPECIES_BY_TIER[t];
      const found = pool.filter(sp => S().disc.includes(sp.id)).length;
      const sec = document.createElement('div');
      sec.className = 'pedia-tier';
      sec.innerHTML = `<div class="pedia-tier-head" style="background:${tier.c}">
        <span>${tier.n}${t === TIERS.length - 1 ? ' · bred from two Divine parents' : ''}</span><span>${found}/${pool.length}</span></div>`;
      const grid = document.createElement('div');
      grid.className = 'pedia-grid';
      pool.forEach(sp => {
        const known = S().disc.includes(sp.id);
        const card = document.createElement('div');
        card.className = 'pedia-card' + (known ? '' : ' unknown');
        card.appendChild(chickEl(sp, 3, !known));
        if (known) {
          const inField = S().chickens.filter(c => c.sp === sp.id).length;
          card.insertAdjacentHTML('beforeend',
            `<span class="p-name">${sp.name}</span><span class="p-quip">${sp.quip}</span>
             <span class="p-count">${inField ? 'on field: ' + inField : 'met before'}</span>`);
        } else {
          card.insertAdjacentHTML('beforeend', `<span class="p-name">???</span><span class="p-quip">not yet hatched</span>`);
        }
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      box.appendChild(sec);
    });
    GAME.dirty.pedia = false;
  }

  /* ================= INTERACTION ================= */
  function chickenAt(x, y) {
    for (let i = S().chickens.length - 1; i >= 0; i--) {
      const ch = S().chickens[i];
      if (x > ch.x && x < ch.x + 20 && y > ch.y - 4 && y < ch.y + 20) return ch;
    }
    return null;
  }
  function eggAt(x, y) {
    for (let i = S().eggs.length - 1; i >= 0; i--) {
      const e = S().eggs[i];
      if (!e.suck && Math.abs(x - e.x) < 7 && Math.abs(y - (e.y - 6)) < 9) return e;
    }
    return null;
  }
  function plumeAt(x, y) {
    for (let i = S().plumes.length - 1; i >= 0; i--) {
      const pl = S().plumes[i];
      if (Math.abs(x - pl.x) < 8 && Math.abs(y - pl.y) < 8) return pl;
    }
    return null;
  }
  function overMama(x, y) {
    const m = W.mama;
    return x > m.x - 16 && x < m.x + 18 && y > m.y - 26 && y < m.y + 18;
  }
  function saleSignAt(x, y) {
    for (const p of PLOTS) {
      if (S().plots[p.id]) continue;
      if (!plotNeighbors(p.id).some(n => S().plots[n])) continue;
      const cx = p.tc * 16 + PLOT_W * 8, cy = p.tr * 16 + PLOT_H * 8;
      if (Math.abs(x - cx) < 20 && Math.abs(y - cy) < 18) return p;
    }
    return null;
  }

  function tapWorld(x, y) {
    /* shared taps that work with any tool */
    const st = GAME.inStation(x, y, 4);
    if (st === 'lab') { selSkill = null; renderSkills(); openModal('#modal-skills'); snd.build(); return true; }
    if (st === 'stand') { renderPedia(); openModal('#modal-pedia'); snd.build(); return true; }
    if (st === 'mamaSign') {
      if (GAME.upgradeMama()) {
        snd.grand(); heart(W.mama.x, W.mama.y - 20, 8);
        toast({ title: 'MAMA EVOLVED!', body: `She now lays ${TIERS[S().mamaTier].n} eggs.` });
      } else snd.error();
      return true;
    }
    const sign = saleSignAt(x, y);
    if (sign) {
      if (GAME.buyPlot(sign.id)) {
        snd.grand();
        puff(x, y, '#ffd23f', 16, 60, 40);
        toast({ title: '🌱 NEW LAND!', body: 'The fences come down. Room to grow!' });
        GAME.clampCam();
      } else {
        snd.error();
        floatWorld('need 🪙' + GAME.fmt(sign.price), x, y - 14, 'pink');
      }
      return true;
    }
    if (GAME.hitTruck(x, y) && S().truck.state === 'parked') {
      if (S().tool === 'basket' && S().basket.length) return false; /* handled by release-deposit */
      if (S().truck.load.length && GAME.sendTruck()) { snd.engine(); return true; }
    }
    /* eject love-nest occupants */
    const o = GAME.occAt(Math.floor(x / 16), Math.floor(y / 16));
    if (o && o.type === 'lovenest' && S().tool === 'hand' && !S().held) {
      if (GAME.ejectNest(o.k)) { snd.plop(); return true; }
    }
    return false;
  }

  let heldSince = 0;   /* when the current held thing was picked up */
  let cand = null;     /* pointerdown candidates for the hand tool */

  cv.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    cv.setPointerCapture(ev.pointerId);
    const p = eventToWorld(ev);
    Object.assign(ptr, { x: p.x, y: p.y, sx: p.sx, sy: p.sy, inside: true, down: true, downAt: performance.now(), downX: p.x, downY: p.y, moved: 0 });
    const tool = S().tool;
    ptr.mode = null; ptr.target = null; cand = null;
    if (tool === 'build') {
      if (buildSel) { paintTile = null; handlePlaceAt(p.x, p.y, false); ptr.mode = 'place'; }
      return;
    }
    if (tool === 'feed') { trySprinkle(p.x, p.y); ptr.mode = 'feed'; return; }
    if (tool === 'basket') { ptr.mode = 'sweep'; return; }
    /* hand tool: already carrying? next release decides the drop */
    if (S().held) { ptr.mode = 'carry'; return; }
    /* remember everything under the finger; decide on move/release */
    cand = { ch: chickenAt(p.x, p.y), egg: eggAt(p.x, p.y), mama: overMama(p.x, p.y), plume: plumeAt(p.x, p.y) };
    ptr.mode = 'pending';
  });

  cv.addEventListener('pointermove', ev => {
    const before = { x: ptr.x, y: ptr.y };
    const p = eventToWorld(ev);
    ptr.moved += Math.hypot(p.x - ptr.x, p.y - ptr.y);
    ptr.x = p.x; ptr.y = p.y; ptr.sx = p.sx; ptr.sy = p.sy;
    ptr.inside = true;
    if (!ptr.down) return;
    if (ptr.mode === 'pending' && ptr.moved > 5) {
      /* the tap became a drag: grab what was under the finger, else pan */
      if (cand && cand.ch && GAME.grabChicken(cand.ch)) { snd.squawk(); ptr.mode = 'carry'; heldSince = performance.now(); }
      else if (cand && cand.egg && GAME.grabEgg(cand.egg)) { snd.plop(); ptr.mode = 'carry'; heldSince = performance.now(); }
      else ptr.mode = 'pan';
    }
    if (ptr.mode === 'pan') {
      cam().x -= (p.x - before.x);
      cam().y -= (p.y - before.y);
      GAME.clampCam();
      const q = eventToWorld(ev);
      ptr.x = q.x; ptr.y = q.y;
    } else if (ptr.mode === 'place') {
      handlePlaceAt(ptr.x, ptr.y, true);
    } else if (ptr.mode === 'feed') {
      trySprinkle(ptr.x, ptr.y);
    }
  });

  function endPointer(ev) {
    if (!ptr.down) return;
    ptr.down = false;
    const wasTap = ptr.moved < 6 && performance.now() - ptr.downAt < 420;
    const x = ptr.x, y = ptr.y;
    const tool = S().tool;
    if (ptr.mode === 'carry' && S().held) {
      /* the pickup gesture itself doesn't drop; later releases do */
      if (performance.now() - heldSince > 260 || ptr.moved > 6) dropHeldAt(x, y);
      return;
    }
    if (ptr.mode === 'pending' && wasTap && cand) {
      if (cand.mama) {
        if (GAME.petMama()) {
          petFx.set('mama', performance.now());
          heart(W.mama.x, W.mama.y - 18, 3);
          snd.pet();
        }
        return;
      }
      if (cand.ch) {
        if (GAME.petChicken(cand.ch)) {
          petFx.set(cand.ch.id, performance.now());
          heart(cand.ch.x + 10, cand.ch.y - 4, 2);
          snd.pet();
        } else floatWorld('...', cand.ch.x + 8, cand.ch.y - 8, '');
        return;
      }
      if (cand.plume) {
        const v = GAME.collectPlume(cand.plume);
        if (v) { snd.plume(); floatWorld('+🪶' + v, x, y - 8, 'green'); }
        return;
      }
      if (cand.egg) {
        if (GAME.grabEgg(cand.egg)) { snd.plop(); heldSince = performance.now(); }
        return;
      }
      tapWorld(x, y);
      return;
    }
    if (tool === 'basket') {
      /* deposit on release over targets */
      if (S().basket.length) {
        if (GAME.hitTruck(x, y)) {
          const n = GAME.basketToTruck();
          if (n) {
            for (let i = 0; i < Math.min(n, 6); i++) setTimeout(() => snd.clink(), i * 60);
            floatWorld('+' + n + ' loaded', W.truckHome.x + 26, W.truckHome.y - 16, 'green');
          } else floatWorld('truck full!', x, y - 12, 'pink');
          updateCursorChip();
          return;
        }
        const o = GAME.occAt(Math.floor(x / 16), Math.floor(y / 16));
        if (o && o.type === 'incubator') {
          const n = GAME.basketToInc(o.k);
          if (n) { snd.plop(); floatWorld('+' + n + ' incubating', x, y - 12, 'green'); }
          else floatWorld('incubator full!', x, y - 12, 'pink');
          updateCursorChip();
          return;
        }
      }
      if (wasTap) tapWorld(x, y);
      return;
    }
    if (wasTap) tapWorld(x, y);
    if (ptr.mode === 'place') paintTile = null;
  }
  cv.addEventListener('pointerup', endPointer);
  cv.addEventListener('pointercancel', () => { ptr.down = false; paintTile = null; });
  cv.addEventListener('pointerleave', () => { ptr.inside = false; });
  cv.addEventListener('pointerenter', () => { ptr.inside = true; });
  cv.addEventListener('contextmenu', ev => ev.preventDefault());
  cv.addEventListener('wheel', ev => {
    ev.preventDefault();
    cam().x += (ev.shiftKey ? ev.deltaY : ev.deltaX) / 3;
    cam().y += (ev.shiftKey ? 0 : ev.deltaY) / 3;
    GAME.clampCam();
  }, { passive: false });

  function dropHeldAt(x, y) {
    const held = S().held;
    const result = GAME.dropHeld(x, y);
    if (!result) return;
    if (result === 'nested') { snd.breed(); heart(x, y - 8, 3); }
    else if (result === 'graduated') { snd.sparkle(); floatWorld('graduated! 🎓', x, y - 14, 'green'); }
    else if (result === 'incubated') { snd.plop(); floatWorld('incubating!', x, y - 12, 'green'); }
    else if (result === 'loaded') { snd.clink(); }
    else if (held && held.kind === 'chicken') snd.plop();
    else snd.plop();
  }

  function trySprinkle(x, y) {
    if (sprinkleCd > 0) return;
    if (GAME.sprinkleFeed(x, y)) { snd.sprinkle(); sprinkleCd = 0.22; }
  }

  function handlePlaceAt(wx, wy, isDragStep) {
    const c = Math.floor(wx / 16), r = Math.floor(wy / 16);
    if (buildSel === 'remove') {
      if (GAME.occAt(c, r)) { GAME.demolish(c, r); snd.demolish(); }
      return;
    }
    if (buildSel === 'belt' && isDragStep && paintTile) {
      const [pc, pr] = paintTile;
      if (pc === c && pr === r) return;
      let dir = placeDir;
      if (c > pc) dir = 0; else if (c < pc) dir = 2; else if (r > pr) dir = 1; else if (r < pr) dir = 3;
      placeDir = dir;
      GAME.setBeltDir(pc, pr, dir);
      if (GAME.build('belt', c, r, dir)) snd.build();
      paintTile = [c, r];
      GAME.mark('build');
      return;
    }
    if (GAME.build(buildSel, c, r, placeDir)) {
      snd.build();
      if (buildSel === 'belt') paintTile = [c, r];
      GAME.mark('build');
    } else if (!isDragStep) {
      const cost = buildCost(buildSel, S().built[buildSel]);
      if (S().coins < cost) { snd.error(); floatWorld('need 🪙' + GAME.fmt(cost), wx, wy - 10, 'pink'); }
    }
  }

  window.addEventListener('keydown', ev => {
    keys[ev.key.toLowerCase()] = true;
    if (ev.key === 'r' || ev.key === 'R') { placeDir = (placeDir + 1) % 4; GAME.mark('build'); }
    if (ev.key === 'Escape') { closeModals(); buildSel = null; GAME.mark('build'); }
    if (ev.key === '1') setTool('hand');
    if (ev.key === '2') setTool('basket');
    if (ev.key === '3' && GAME.lvl('feed')) setTool('feed');
    if (ev.key === '4') setTool('build');
  });
  window.addEventListener('keyup', ev => { keys[ev.key.toLowerCase()] = false; });

  function setTool(t) {
    if (S().tool === t) return;
    S().tool = t;
    buildSel = t === 'build' ? (buildSel || 'incubator') : buildSel;
    renderToolbelt();
    renderPalette();
    updateCursorChip();
    snd.plop();
  }

  /* HUD clicks */
  document.getElementById('app').addEventListener('click', ev => {
    const toolBtn = ev.target.closest('[data-tool]');
    if (toolBtn) { setTool(toolBtn.dataset.tool); return; }
    const palBtn = ev.target.closest('[data-build]');
    if (palBtn && !palBtn.disabled) {
      const b = palBtn.dataset.build;
      if (b === 'rotate') { placeDir = (placeDir + 1) % 4; }
      else buildSel = (buildSel === b ? null : b);
      GAME.mark('build');
      return;
    }
    const btn = ev.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    switch (btn.dataset.act) {
      case 'menu': $('#menu-pop').hidden = !$('#menu-pop').hidden; break;
      case 'close-modal': closeModals(); break;
      case 'buy-skill': {
        if (GAME.buySkill(btn.dataset.id)) {
          snd.skill();
          if (['overclock', 'tycoon', 'secretlore'].includes(btn.dataset.id)) snd.grand();
          renderSkills(); renderToolbelt();
        } else snd.error();
        break;
      }
      case 'mute': S().muted = !S().muted; btn.textContent = S().muted ? '🔇 sound' : '🔊 sound'; break;
      case 'save': GAME.save(); floatText('Saved!', ev.clientX - 20, ev.clientY - 24, 'green'); break;
      case 'reset':
        if (confirm('Really reset EVERYTHING? The chickens will write memoirs.')) {
          GAME.reset(); buildSel = null;
          renderToolbelt(); renderPalette(); updateCursorChip();
        }
        break;
    }
  });
  /* skill tree node taps */
  $('#tree-nodes').addEventListener('click', ev => {
    const node = ev.target.closest('.tree-node');
    if (!node) return;
    selSkill = node.dataset.skill;
    renderSkills();
  });

  /* ================= GAME EVENT FX ================= */
  let lastMutToast = 0;
  GAME.on('lay', ({ egg, mutated, fromPet }) => {
    if (fromPet) snd.lay();
    if (mutated) {
      puff(egg.x, egg.y - 6, TIERS[egg.tier].c, 8, 40, 30);
      if (performance.now() - lastMutToast > 5000) {
        lastMutToast = performance.now();
        snd.sparkle();
        floatWorld('⚡ MUTATION! ' + TIERS[egg.tier].n + '!', egg.x, egg.y - 16, 'pink');
      }
    }
    if (egg.golden) puff(egg.x, egg.y - 6, '#ffd23f', 6, 30, 26);
  });
  GAME.on('hatch', ({ births, x, y, rainbow }) => {
    snd.hatch();
    births.forEach((b, i) => {
      shellBurst(x + i * 6, y, Math.min(b.sp.tier, EGG_SHELL.length - 1));
      if (b.isNew) {
        toast({
          sprite: chickEl(b.sp, 2, false),
          title: '✨ NEW! ' + b.sp.name,
          body: TIERS[b.sp.tier].n + ' · ' + b.sp.quip,
          long: true,
        });
        snd.sparkle();
      }
    });
    if (rainbow) { puff(x, y - 10, '#ff5fd0', 14, 60, 40); snd.grand(); }
    if (births.length > 1) floatWorld('TWINS!!', x, y - 24, 'pink');
  });
  GAME.on('breed', ({ x, y, rainbow, tier }) => {
    snd.breed();
    heart(x, y - 10, 6);
    floatWorld(rainbow ? '🌈 RAINBOW EGG!!' : 'an egg! (' + TIERS[tier].n + ')', x, y - 18, rainbow ? 'pink' : 'green');
    if (rainbow) puff(x, y - 6, '#ff5fd0', 12, 50, 36);
  });
  GAME.on('sell', ({ pay, n }) => {
    snd.coin();
    coinBurst(W.truckHome.x + 26, W.truckHome.y - 4, n);
    floatWorld('+🪙' + GAME.fmt(pay), W.truckHome.x + 20, W.truckHome.y - 20, 'gold');
  });
  GAME.on('truckleave', () => { snd.engine(); puff(W.truckHome.x - 4, W.roadY + 8, '#c9a35f', 8, 40, 14); });
  GAME.on('land', () => {});
  GAME.on('graduate', ({ sp, f }) => {
    toast({ sprite: chickEl(sp, 2, false), title: sp.name + ' graduated! 🎓', body: 'She joins the lab team. +🪶 feathers dropped!' });
  });
  GAME.on('feedeat', ({ x, y }) => { puff(x, y, '#f2c94c', 3, 16, 12); });

  /* ================= BOOT & LOOPS ================= */
  function boot() {
    GAME.load();
    const off = GAME.applyOffline();
    buildGround();
    renderToolbelt();
    renderPalette();
    updateCursorChip();
    $('#btn-mute-lbl') && ($('#btn-mute-lbl').textContent = S().muted ? '🔇' : '🔊');
    if (off && (off.laid > 0 || off.hatched > 0 || off.pay > 0)) {
      toast({
        title: 'Welcome back!',
        body: `While you were away (${GAME.fmtTime(off.seconds)}): ${GAME.fmt(off.laid)} eggs laid` +
          (off.hatched ? `, ${off.hatched} hatched (+🪶${GAME.fmt(off.feathersGot)})` : '') +
          (off.pay ? `, truck sold +🪙${GAME.fmt(off.pay)}` : '') + '.',
        long: true,
      });
    }

    let last = performance.now(), saveAcc = 0, hudAcc = 0;
    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 2) {
        let rest = Math.min(dt, 600);
        while (rest > 0) { GAME.tick(Math.min(0.5, rest)); rest -= 0.5; }
        dt = 0.016;
      }
      dt = Math.min(dt, 0.1);
      sprinkleCd = Math.max(0, sprinkleCd - dt);
      GAME.tick(dt);
      magnet(dt);
      /* keyboard / edge panning */
      let pdx = 0, pdy = 0;
      if (keys.arrowleft || keys.a) pdx -= 1;
      if (keys.arrowright || keys.d) pdx += 1;
      if (keys.arrowup || keys.w) pdy -= 1;
      if (keys.arrowdown || keys.s) pdy += 1;
      if (ptr.down && ptr.inside && ptr.mode !== 'pan') {
        const r = cv.getBoundingClientRect();
        const ex = (ptr.sx - r.left) / r.width, ey = (ptr.sy - r.top) / r.height;
        if (ex < 0.04) pdx -= 1; if (ex > 0.96) pdx += 1;
        if (ey < 0.05) pdy -= 1; if (ey > 0.95) pdy += 1;
      }
      if (pdx || pdy) {
        cam().x += pdx * 150 * dt;
        cam().y += pdy * 150 * dt;
        GAME.clampCam();
      }
      render(now, dt);
      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        lightUpdate(now);
        if (GAME.dirty.skills && !$('#modal-skills').hidden) renderSkills();
        if (GAME.dirty.pedia && !$('#modal-pedia').hidden) renderPedia();
      }
      saveAcc += dt;
      if (saveAcc >= 10) { saveAcc = 0; GAME.save(); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    document.addEventListener('visibilitychange', () => { if (document.hidden) GAME.save(); });
    window.addEventListener('beforeunload', () => GAME.save());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
