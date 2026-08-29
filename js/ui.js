/* ============================================================
   INF EGG CO. v2 — view/controller: canvas world, input, HUD
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
      pet()    { tone([300 + Math.random() * 60], 0.06, 'square', 0.05, 0.8); },
      lay()    { tone([620], 0.05, 'triangle', 0.05, 1.25); },
      place()  { tone([180], 0.06, 'square', 0.05, 0.85); },
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
  const eggEl = (tier, k) => cloneCanvas(SPR.eggSprite(tier, k));

  /* ================= CANVAS SETUP ================= */
  const cv = $('#world');
  const ctx = cv.getContext('2d');
  const SC = 3;
  cv.width = W.W * SC; cv.height = W.H * SC;

  function worldToScreen(wx, wy) {
    const r = cv.getBoundingClientRect();
    return { x: r.left + wx / W.W * r.width, y: r.top + wy / W.H * r.height };
  }
  function eventToWorld(ev) {
    const r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * W.W, y: (ev.clientY - r.top) / r.height * W.H };
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
  function buildGround() {
    groundCv = document.createElement('canvas');
    groundCv.width = W.W; groundCv.height = W.H;
    const g = groundCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const rnd = mulberry(20260829);
    /* grass */
    g.fillStyle = '#8ed254'; g.fillRect(0, 0, W.W, W.H);
    g.fillStyle = '#86c94d';
    for (let y = 0; y < W.H; y += 8)
      for (let x = (y / 8) % 2 ? 8 : 0; x < W.W; x += 16)
        g.fillRect(x, y, 8, 8);
    /* blades */
    g.fillStyle = '#79bf42';
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(rnd() * W.W), y = Math.floor(rnd() * (W.H - 8));
      g.fillRect(x, y, 1, 2);
    }
    /* road */
    g.fillStyle = '#c9a35f'; g.fillRect(0, W.roadY, W.W, W.H - W.roadY);
    g.fillStyle = '#b58a48';
    for (let x = 0; x < W.W; x += 10) { g.fillRect(x, W.roadY, 6, 1); g.fillRect(x + 4, W.H - 3, 5, 1); }
    g.fillStyle = '#a8783f';
    for (let i = 0; i < 40; i++) g.fillRect(Math.floor(rnd() * W.W), W.roadY + 3 + Math.floor(rnd() * 26), 2, 1);
    g.fillStyle = '#8a5e2a'; g.fillRect(0, W.roadY - 1, W.W, 1);
    /* pond */
    const p = W.pond;
    g.fillStyle = '#e8d5a8'; g.fillRect(p.x - 3, p.y - 2, p.w + 6, p.h + 5);
    g.fillStyle = '#5fb8dd'; g.fillRect(p.x, p.y, p.w, p.h);
    g.fillStyle = '#7fd0ee'; g.fillRect(p.x + 3, p.y + 2, p.w - 6, p.h - 5);
    g.fillStyle = '#aee7ff';
    for (let i = 0; i < 8; i++) g.fillRect(p.x + 4 + Math.floor(rnd() * (p.w - 10)), p.y + 3 + Math.floor(rnd() * (p.h - 7)), 4, 1);
    /* lily pads */
    g.fillStyle = '#6ab04c';
    g.fillRect(p.x + 8, p.y + p.h - 8, 5, 3); g.fillRect(p.x + p.w - 14, p.y + 5, 5, 3);
    g.fillStyle = '#ff8ab5'; g.fillRect(p.x + p.w - 12, p.y + 4, 2, 2);
    /* fence along the top */
    const fy = W.fieldTop - 12;
    g.fillStyle = '#c98f4f'; g.fillRect(0, fy + 3, W.W, 3); g.fillRect(0, fy + 9, W.W, 3);
    for (let x = 6; x < W.W; x += 32) {
      g.fillStyle = '#b3773f'; g.fillRect(x, fy, 4, 15);
      g.fillStyle = '#8a5e2a'; g.fillRect(x, fy, 4, 2);
    }
    /* trees behind the fence */
    const kinds = ['tree', 'pine', 'apple', 'tree', 'pine', 'tree', 'apple', 'pine', 'tree', 'tree'];
    for (let i = 0; i < 10; i++) {
      const spr = SPR.decoSprite(kinds[i], 1);
      const x = 4 + i * 38 + Math.floor(rnd() * 10);
      g.drawImage(spr, x, fy - spr.height + 8);
    }
    /* side trees */
    [[2, 60], [W.W - 22, 96], [2, 130], [W.W - 24, 52]].forEach(([x, y], i) => {
      g.drawImage(SPR.decoSprite(i % 2 ? 'pine' : 'tree', 1), x, y);
    });
    /* scattered foliage */
    const scatter = [
      ['bush', 8], ['flower', 14], ['tuft', 22], ['rock', 4], ['shroom', 4], ['stump', 2],
    ];
    scatter.forEach(([kind, n]) => {
      const spr = SPR.decoSprite(kind, 1);
      for (let i = 0; i < n; i++) {
        let x, y, tries = 0;
        do {
          x = 8 + rnd() * (W.W - 40);
          y = W.fieldTop + 4 + rnd() * (W.roadY - W.fieldTop - 30);
          tries++;
        } while (tries < 20 && (GAME.inPond(x + 8, y + 4) ||
                 (Math.abs(x - W.mama.x) < 30 && Math.abs(y - W.mama.y) < 30) ||
                 (Math.abs(x - (W.truckHome.x + 28)) < 44 && y > W.roadY - 40)));
        g.drawImage(spr, Math.floor(x), Math.floor(y));
      }
    });
    /* mama's nest patch */
    g.fillStyle = '#a8d35f';
    g.fillRect(W.mama.x - 16, W.mama.y - 4, 34, 20);
  }

  /* ================= PARTICLES (world space) ================= */
  let parts = [];
  function puff(x, y, col, n, spread, up) {
    for (let i = 0; i < n; i++) {
      parts.push({
        type: 'px', x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * (spread || 30),
        vy: -(up || 26) - Math.random() * 18,
        g: 90, t: 0, life: 0.5 + Math.random() * 0.4, col, s: Math.random() < 0.4 ? 2 : 1,
      });
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
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = Math.max(0, a);
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

  /* butterflies */
  const flies = [0, 1, 2, 3].map(i => ({
    x: Math.random() * W.W, y: 50 + Math.random() * 100,
    a: Math.random() * Math.PI * 2, col: ['#ff8ab5', '#fff5d9', '#ffd23f', '#c9a8f0'][i],
  }));

  /* ================= INPUT STATE ================= */
  let cursor = { x: -99, y: -99, down: false, downAt: 0, downX: 0, downY: 0, moved: 0 };
  let placeMode = null;       /* 'incubator' | 'vacuum' | 'belt' | 'demolish' | null */
  let placeDir = 0;
  let paintTile = null;
  const petFx = new Map();    /* chicken id -> time of last pet (for hop anim) */

  /* ================= RENDER ================= */
  function tierColor(t) { return TIERS[t].c; }

  function drawEggShadow(x, y) {
    ctx.fillStyle = 'rgba(46,58,26,.25)';
    ctx.fillRect(Math.round(x - 3), Math.round(y - 1), 7, 2);
  }
  function drawEgg(e, now) {
    const spr = SPR.eggSprite(e.tier, 1);
    drawEggShadow(e.x, e.y);
    let wob = 0;
    if (e.placed && e.hatch > 0 && e.hatch < 4) wob = Math.round(Math.sin(now / 40) * 1);
    ctx.drawImage(spr, Math.round(e.x - 5 + wob), Math.round(e.y - 12 + e.z));
    if (e.golden) {
      ctx.fillStyle = 'rgba(255,220,80,.9)';
      if (Math.floor(now / 160) % 3 === 0) ctx.fillRect(Math.round(e.x + 2), Math.round(e.y - 12 + e.z), 1, 1);
      ctx.fillRect(Math.round(e.x - 4), Math.round(e.y - 6 + e.z), 1, 1);
    }
    if (e.placed && e.hatchTotal) {
      const f = 1 - e.hatch / e.hatchTotal;
      ctx.fillStyle = 'rgba(46,34,20,.5)'; ctx.fillRect(Math.round(e.x - 4), Math.round(e.y + 1), 8, 1);
      ctx.fillStyle = '#7ac74f'; ctx.fillRect(Math.round(e.x - 4), Math.round(e.y + 1), Math.round(8 * f), 1);
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
    /* side rails */
    ctx.fillStyle = '#3f434c';
    if (horiz) { ctx.fillRect(x, y, 16, 2); ctx.fillRect(x, y + 14, 16, 2); }
    else { ctx.fillRect(x, y, 2, 16); ctx.fillRect(x + 14, y, 2, 16); }
    /* direction nub */
    ctx.fillStyle = '#ffd23f';
    const [dx, dy] = [[13, 7], [7, 13], [1, 7], [7, 1]][dir];
    ctx.fillRect(x + dx, y + dy, 2, 2);
  }

  function drawVacuum(c, r, v, now) {
    const x = c * 16, y = r * 16;
    /* faces */
    const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][v.dir];
    /* body */
    ctx.fillStyle = '#2e3238'; ctx.fillRect(x + 3, y + 2, 10, 13);
    ctx.fillStyle = '#b8bcc4'; ctx.fillRect(x + 4, y + 3, 8, 11);
    ctx.fillStyle = '#d5d9df'; ctx.fillRect(x + 5, y + 4, 6, 4);
    /* eye */
    const suck = S().eggs.some(e => e.suck === (c + ',' + r));
    ctx.fillStyle = suck ? '#3fd0ff' : '#2e3238';
    ctx.fillRect(x + 6, y + 5, 4, 2);
    if (suck && Math.floor(now / 120) % 2) { ctx.fillStyle = '#aee7ff'; ctx.fillRect(x + 7, y + 5, 2, 2); }
    /* funnel */
    ctx.fillStyle = '#6a6f78';
    ctx.fillRect(x + 5, y, 6, 2); ctx.fillRect(x + 6, y + 2, 4, 1);
    /* nozzle toward facing dir */
    ctx.fillStyle = '#3f434c';
    ctx.fillRect(x + 7 + dx * 6, y + 9 + dy * 5, 2 + Math.abs(dx) * 2, 2 + Math.abs(dy) * 2);
    /* held eggs pips */
    for (let i = 0; i < Math.min(v.hold.length, 4); i++) {
      ctx.fillStyle = EGG_SHELL[v.hold[i].tier];
      ctx.fillRect(x + 4 + i * 2, y + 12, 2, 2);
    }
  }

  function drawIncubator(c, r, inc, now) {
    const x = c * 16, y = r * 16;
    /* base */
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 1, y + 6, 30, 25);
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(x + 2, y + 7, 28, 23);
    ctx.fillStyle = '#d9c9a8'; ctx.fillRect(x + 2, y + 24, 28, 6);
    /* dome */
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 5, y + 1, 22, 12);
    ctx.fillStyle = '#cfeef5'; ctx.fillRect(x + 6, y + 2, 20, 10);
    ctx.fillStyle = '#e8f8fd'; ctx.fillRect(x + 7, y + 3, 6, 3);
    /* current egg in dome */
    if (inc.queue.length) {
      const egg = SPR.eggSprite(inc.queue[0].tier, 1);
      ctx.drawImage(egg, x + 12, y + 2);
      /* progress bar */
      const need = GAME.incHatchTime(inc.queue[0].tier);
      const f = Math.min(1, inc.prog / need);
      ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 4, y + 15, 24, 3);
      ctx.fillStyle = '#7ac74f'; ctx.fillRect(x + 5, y + 16, Math.round(22 * f), 1);
      /* warm light blinking */
      ctx.fillStyle = Math.floor(now / 300) % 2 ? '#ff9f1c' : '#ffd23f';
      ctx.fillRect(x + 26, y + 20, 2, 2);
    } else {
      ctx.fillStyle = '#8a8d96'; ctx.fillRect(x + 26, y + 20, 2, 2);
      /* faint "put an egg here" silhouette */
      ctx.fillStyle = 'rgba(122,90,58,.28)';
      ctx.fillRect(x + 13, y + 3, 6, 8); ctx.fillRect(x + 14, y + 2, 4, 10);
    }
    /* queue pips */
    for (let i = 0; i < Math.min(inc.queue.length, GAME.incCap()); i++) {
      ctx.fillStyle = i < inc.queue.length ? EGG_SHELL[inc.queue[Math.min(i, inc.queue.length - 1)].tier] : '#d9c9a8';
      ctx.fillRect(x + 4 + (i % 8) * 3, y + 21 + Math.floor(i / 8) * 3, 2, 2);
    }
    /* little feet */
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(x + 3, y + 30, 4, 2); ctx.fillRect(x + 25, y + 30, 4, 2);
  }

  function truckX(now) {
    const tr = S().truck;
    const T = GAME.tripTime();
    if (tr.state === 'parked') return W.truckHome.x;
    const gone = T - tr.t;
    if (gone < 1) return W.truckHome.x + gone * 220;             /* leaving right */
    if (tr.t < 1) return W.truckHome.x + tr.t * 220;             /* backing in from right */
    return 9999;
  }
  function drawTruck(now) {
    const tr = S().truck;
    const x = truckX(now);
    if (x > W.W + 60) return;
    const y = W.roadY - 4;
    const bounce = tr.state === 'parked' ? 0 : Math.round(Math.sin(now / 40) * 1);
    /* bed */
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x, y - 12 + bounce, 34, 20);
    ctx.fillStyle = '#c98f4f'; ctx.fillRect(x + 1, y - 11 + bounce, 32, 18);
    ctx.fillStyle = '#a8663a'; ctx.fillRect(x + 1, y - 11 + bounce, 32, 3);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 1, y + 4 + bounce, 32, 3);
    /* eggs piled in the bed */
    const n = Math.min(tr.load.length, 12);
    for (let i = 0; i < n; i++) {
      const ex = x + 3 + (i % 6) * 5, ey = y - 8 + bounce + Math.floor(i / 6) * -4 + 4;
      const egg = tr.load[i];
      ctx.fillStyle = EGG_SHELL[egg.tier];
      ctx.fillRect(ex, ey, 4, 5);
      ctx.fillStyle = SPR.darken(EGG_SHELL[egg.tier], 0.35);
      ctx.fillRect(ex, ey + 4, 4, 1);
      if (egg.golden) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(ex + 1, ey + 1, 1, 1); }
    }
    /* cab */
    ctx.fillStyle = '#2e3a55'; ctx.fillRect(x + 34, y - 16 + bounce, 18, 24);
    ctx.fillStyle = '#5fa8e8'; ctx.fillRect(x + 35, y - 15 + bounce, 16, 22);
    ctx.fillStyle = '#cfeef5'; ctx.fillRect(x + 37, y - 13 + bounce, 9, 7);
    ctx.fillStyle = '#3f6ea8'; ctx.fillRect(x + 35, y + 1 + bounce, 16, 6);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 49, y - 2 + bounce, 2, 3);
    /* wheels */
    ctx.fillStyle = '#23262b';
    ctx.fillRect(x + 4, y + 6, 8, 8); ctx.fillRect(x + 38, y + 6, 8, 8);
    ctx.fillStyle = '#d5d9df';
    ctx.fillRect(x + 7, y + 9, 2, 2); ctx.fillRect(x + 41, y + 9, 2, 2);
    /* load label */
    if (tr.state === 'parked') {
      ctx.font = '5px monospace';
      ctx.fillStyle = '#3a2a16';
      ctx.fillText(tr.load.length + '/' + GAME.truckCap(), x + 8, y - 15);
      if (tr.load.length > 0 && Math.floor(now / 500) % 2) {
        ctx.fillStyle = '#2e6e2e';
        ctx.fillText('SEND?', x + 34, y - 19);
      }
    }
  }

  function drawChicken(ch, now) {
    const sp = SPECIES[ch.sp];
    const spr = SPR.chickenSprite(sp, 1, false);
    const bob = ch.state === 'walk' ? Math.abs(Math.sin(now / 110 + ch.id)) * 1.6
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
    } else {
      ctx.drawImage(spr, Math.round(ch.x), yy);
    }
    ctx.restore();
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
    /* cooldown sparkle when ready */
    if (S().mama.petCd <= 0 && Math.floor(now / 400) % 2) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(m.x + 12, m.y - 22, 2, 2);
    }
  }

  function drawGhost(now) {
    if (!placeMode || cursor.x < 0) return;
    const c = Math.floor(cursor.x / 16), r = Math.floor(cursor.y / 16);
    if (placeMode === 'demolish') {
      const o = GAME.occAt(c, r);
      ctx.fillStyle = o ? 'rgba(232,84,47,.4)' : 'rgba(0,0,0,.15)';
      ctx.fillRect(c * 16, r * 16, 16, 16);
      return;
    }
    const b = BUILDS[placeMode];
    const ok = GAME.canPlace(placeMode, c, r) && S().coins >= buildCost(placeMode, S().built[placeMode]);
    ctx.globalAlpha = 0.55;
    if (placeMode === 'belt') drawBelt(c, r, placeDir, now);
    else if (placeMode === 'vacuum') drawVacuum(c, r, { dir: placeDir, hold: [] }, now);
    else drawIncubator(c, r, { queue: [], prog: 0 }, now);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ok ? 'rgba(122,199,79,.3)' : 'rgba(232,84,47,.35)';
    ctx.fillRect(c * 16, r * 16, b.w * 16, b.h * 16);
    if (placeMode === 'vacuum') {
      ctx.strokeStyle = 'rgba(63,208,255,.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c * 16 + 8, r * 16 + 8, GAME.vacR(), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function render(now, dt) {
    ctx.setTransform(SC, 0, 0, SC, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(groundCv, 0, 0);

    /* pond shimmer + ducks */
    const p = W.pond;
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 3; i++) {
      const sx = p.x + 6 + ((i * 17 + Math.floor(now / 400)) % (p.w - 12));
      ctx.fillRect(sx, p.y + 5 + i * 8, 4, 1);
    }
    for (let i = 0; i < 2; i++) {
      const dx = p.x + 8 + ((now / (900 + i * 300)) % 1 < 0.5
        ? ((now / (900 + i * 300)) % 0.5) * 2 : (1 - (now / (900 + i * 300)) % 1) * 2) * (p.w - 22);
      const dy = p.y + 6 + i * 12;
      ctx.fillStyle = '#fff8ec'; ctx.fillRect(Math.round(dx), Math.round(dy), 6, 4);
      ctx.fillStyle = '#fff8ec'; ctx.fillRect(Math.round(dx + 4), Math.round(dy - 3), 3, 4);
      ctx.fillStyle = '#f2a03f'; ctx.fillRect(Math.round(dx + 7), Math.round(dy - 2), 2, 1);
      ctx.fillStyle = '#2e2216'; ctx.fillRect(Math.round(dx + 5), Math.round(dy - 2), 1, 1);
    }

    /* belts */
    for (const k of Object.keys(S().belts)) {
      const [c, r] = k.split(',').map(Number);
      drawBelt(c, r, S().belts[k].dir, now);
    }
    /* vacuums + incubators */
    for (const k of Object.keys(S().vacs)) {
      const [c, r] = k.split(',').map(Number);
      drawVacuum(c, r, S().vacs[k], now);
    }
    for (const k of Object.keys(S().incs)) {
      const [c, r] = k.split(',').map(Number);
      drawIncubator(c, r, S().incs[k], now);
    }
    /* belt items */
    S().items.forEach(it => {
      const spr = SPR.eggSprite(it.tier, 1);
      ctx.drawImage(spr, Math.round(it.x - 5), Math.round(it.y - 8));
      if (it.golden) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(Math.round(it.x), Math.round(it.y - 6), 1, 1); }
    });
    /* ground eggs */
    S().eggs.forEach(e => drawEgg(e, now));
    /* mama + chickens */
    drawMama(now);
    S().chickens.forEach(ch => drawChicken(ch, now));
    /* truck */
    drawTruck(now);
    /* butterflies */
    flies.forEach((f, i) => {
      f.a += dt * (0.6 + i * 0.13);
      f.x += Math.cos(f.a) * 12 * dt + Math.sin(now / 3000 + i) * 4 * dt;
      f.y += Math.sin(f.a * 1.4) * 9 * dt;
      if (f.x < 4) f.x = 4; if (f.x > W.W - 6) f.x = W.W - 6;
      if (f.y < W.fieldTop) f.y = W.fieldTop; if (f.y > W.roadY - 10) f.y = W.roadY - 10;
      const flap = Math.floor(now / 90 + i) % 2;
      ctx.fillStyle = f.col;
      ctx.fillRect(Math.round(f.x - 1 - flap), Math.round(f.y), 2, 2);
      ctx.fillRect(Math.round(f.x + 1 + flap), Math.round(f.y), 2, 2);
      ctx.fillStyle = '#3a2a16'; ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 2);
    });
    /* particles */
    drawParts(dt);
    /* scoop ring */
    if (cursor.down && !placeMode && cursor.y < W.roadY + 20 && cursor.x >= 0) {
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, GAME.scoopR(), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    /* drop target highlight while carrying */
    if (S().basket.length && cursor.down) {
      const th = W.truckHome;
      if (S().truck.state === 'parked' && cursor.x > th.x - 10 && cursor.x < th.x + th.w + 10 && cursor.y > th.y - 14) {
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1;
        ctx.strokeRect(th.x - 2, th.y - 14, th.w + 4, th.h + 12);
      }
      const c = Math.floor(cursor.x / 16), r = Math.floor(cursor.y / 16);
      const o = GAME.occAt(c, r);
      if (o && o.type === 'incubator') {
        const [ic, ir] = o.k.split(',').map(Number);
        ctx.strokeStyle = '#7ac74f'; ctx.lineWidth = 1;
        ctx.strokeRect(ic * 16 - 1, ir * 16 - 1, 34, 34);
      }
    }
    drawGhost(now);
  }

  /* ================= MAGNET SCOOPING ================= */
  function magnet(dt, now) {
    if (!cursor.down || placeMode || cursor.x < 0) return;
    const R = GAME.scoopR();
    const eggs = S().eggs;
    for (let i = eggs.length - 1; i >= 0; i--) {
      const e = eggs[i];
      if (e.suck) continue;
      const dx = cursor.x - e.x, dy = cursor.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d < 7) {
        if (GAME.scoopEgg(e)) { snd.scoop(); updateCursorChip(); }
        continue;
      }
      if (d < R) {
        const pull = (1 - d / R) * 320 * dt / d;
        e.x += dx * pull; e.y += dy * pull;
        e.z = Math.min(0, e.z);
      }
    }
  }

  /* ================= HUD ================= */
  const el = {
    coins: $('#r-coins'), feathers: $('#r-feathers'), basket: $('#r-basket'),
    eggs: $('#r-eggs'), chick: $('#r-chick'),
    hint: $('#hint-text'), stats: $('#stats-line'),
    mamaChip: $('#mama-chip'), mamaBtn: $('#btn-mama-up'),
    buildBar: $('#build-bar'), cursorChip: $('#cursor-chip'),
  };

  function updateCursorChip() {
    const n = S().basket.length;
    el.cursorChip.hidden = n === 0;
    if (n) el.cursorChip.textContent = '🥚×' + n;
  }
  document.addEventListener('pointermove', ev => {
    el.cursorChip.style.left = (ev.clientX + 14) + 'px';
    el.cursorChip.style.top = (ev.clientY - 8) + 'px';
  });

  function renderBuildBar() {
    const bar = el.buildBar;
    bar.innerHTML = '';
    const mk = (html, act, extra) => {
      const b = document.createElement('button');
      b.className = 'btn build-btn' + (extra || '');
      b.innerHTML = html;
      b.dataset.act = act;
      return b;
    };
    ['incubator', 'vacuum', 'belt'].forEach(type => {
      const b = BUILDS[type];
      const locked = b.needs && !GAME.lvl(b.needs);
      const cost = buildCost(type, S().built[type]);
      const icon = type === 'incubator' ? '🐣' : type === 'vacuum' ? '🤖' : '↦';
      const btn = mk(
        locked ? `${icon} ${b.name}<br>🔒 research` : `${icon} ${b.name}<br>🪙 ${GAME.fmt(cost)}`,
        'place'
      );
      btn.dataset.type = type;
      btn.disabled = locked;
      btn.title = b.desc;
      if (placeMode === type) btn.classList.add('active');
      bar.appendChild(btn);
    });
    const rot = mk('⟳ ' + ['→', '↓', '←', '↑'][placeDir], 'rotate');
    rot.title = 'Rotate (R)';
    bar.appendChild(rot);
    const dem = mk('🧨 remove', 'demolish');
    if (placeMode === 'demolish') dem.classList.add('active');
    bar.appendChild(dem);
    if (placeMode) {
      const x = mk('✖ done', 'cancel');
      bar.appendChild(x);
    }
    GAME.dirty.build = false;
  }

  function renderMamaCard() {
    const t = S().mamaTier;
    el.mamaChip.textContent = TIERS[t].n;
    el.mamaChip.style.background = TIERS[t].c;
    if (t >= TIERS.length - 1) {
      el.mamaBtn.textContent = '👑 MAX';
      el.mamaBtn.disabled = true;
    } else {
      el.mamaBtn.innerHTML = `⬆ ${TIERS[t + 1].n} 🪙${GAME.fmt(GAME.mamaCost())}`;
      el.mamaBtn.disabled = S().coins < GAME.mamaCost();
    }
  }

  /* ---------- hints ---------- */
  const TIPS = [
    'Eggs can MUTATE a tier up when laid. Science!',
    'Golden eggs are worth 5x. Shiny.',
    'Vacuums + belts + incubator = chicken factory.',
    'Collect all 100 species in the CHICKENPEDIA!',
    'Placed eggs hatch slowly — incubators are much faster.',
    'A full truck pays a bonus with Full Load Deal.',
  ];
  let tipIdx = 0, lastTip = 0;
  function updateHint(now) {
    const st = S(), stats = st.stats;
    let msg;
    if (stats.pets === 0) msg = 'Click MAMA HEN (on her nest) — every pet lays an egg!';
    else if (stats.collected === 0 && st.eggs.length > 0) msg = 'Hold & drag over eggs to scoop them up!';
    else if (stats.sold === 0 && (st.basket.length > 0 || st.truck.load.length > 0))
      msg = st.truck.load.length ? 'Click the TRUCK to send it to market!' : 'Drop your eggs on the TRUCK to load it!';
    else if (stats.hatched === 0 && stats.collected > 0) msg = 'Drop eggs on open grass — they hatch into chickens!';
    else if (st.truck.state === 'parked' && st.truck.load.length >= GAME.truckCap() && !GAME.lvl('autosend'))
      msg = 'The truck is FULL — click it to send it to market!';
    else if (st.feathers >= 4 && Object.keys(st.sk).length === 0) msg = 'You have 🪶 feathers! Open 🧪 RESEARCH.';
    else if (st.built.incubator === 0 && st.coins >= buildCost('incubator', 0)) msg = 'Build an INCUBATOR — it hatches eggs fast, automatically!';
    else if (GAME.lvl('belts') && st.built.belt === 0) msg = 'Conveyors unlocked! Drag to paint a belt to the truck.';
    else if (st.mamaTier < TIERS.length - 1 && st.coins >= GAME.mamaCost()) msg = 'You can UPGRADE MAMA — rarer eggs await!';
    else {
      if (now - lastTip > 12000) { lastTip = now; tipIdx = (tipIdx + 1) % TIPS.length; }
      msg = TIPS[tipIdx];
    }
    if (el.hint.textContent !== msg) el.hint.textContent = msg;
  }

  function flash(chip) { chip.classList.remove('flash'); void chip.offsetWidth; chip.classList.add('flash'); }

  function lightUpdate(now) {
    const st = S();
    const set = (node, v) => { if (node.textContent !== v) node.textContent = v; };
    set(el.coins, GAME.fmt(st.coins));
    set(el.feathers, GAME.fmt(st.feathers));
    set(el.basket, String(st.basket.length));
    set(el.eggs, String(st.eggs.length));
    set(el.chick, st.chickens.length + '/' + GAME.chickenCap());
    renderMamaCard();
    updateHint(now);
    const stLine = `${GAME.fmt(st.stats.laid)} eggs laid · ${GAME.fmt(st.stats.collected)} scooped · ${GAME.fmt(st.stats.sold)} sold · ${GAME.fmt(st.stats.hatched)} hatched · ${GAME.disc()}/100 species`;
    set(el.stats, stLine);
  }

  /* ================= MODALS ================= */
  function openModal(id) { $(id).hidden = false; }
  function closeModals() { document.querySelectorAll('.modal').forEach(m => m.hidden = true); }

  function renderSkills() {
    const box = $('#skill-tree');
    box.innerHTML = '';
    $('#research-sub').textContent = `🪶 ${GAME.fmt(S().feathers)} feathers`;
    BRANCHES.forEach((br, bi) => {
      const col = document.createElement('div');
      col.className = 'skill-branch';
      col.innerHTML = `<div class="branch-title" style="background:${br.hue}">${br.icon} ${br.name}</div>`;
      const grid = document.createElement('div');
      grid.className = 'skill-grid';
      SKILLS.filter(sk => sk.br === bi).forEach(sk => {
        const cur = GAME.lvl(sk.id);
        const pre = skillPrereq(sk);
        const locked = pre && GAME.lvl(pre.id) < 1;
        const maxed = cur >= sk.max;
        const cost = skillCost(sk, cur);
        const node = document.createElement('div');
        node.className = 'skill-node' + (locked ? ' locked' : '') + (maxed ? ' maxed' : '') + (cur > 0 ? ' owned' : '');
        node.style.gridColumn = sk.pos[0] + 1;
        node.style.gridRow = sk.pos[1] + 1;
        node.dataset.skill = sk.id;
        node.innerHTML =
          `<div class="sk-head"><span class="sk-ico">${sk.icon}</span><span class="sk-name">${sk.name}</span><span class="sk-lvl">${cur}/${sk.max}</span></div>
           <div class="sk-desc">${sk.desc}</div>` +
          (maxed ? `<button class="sk-buy btn" disabled>MAXED ★</button>`
            : locked ? `<button class="sk-buy btn" disabled>🔒 ${pre.name}</button>`
            : `<button class="sk-buy btn ${S().feathers >= cost ? 'can' : ''}" data-act="skill" data-id="${sk.id}">🪶 ${GAME.fmt(cost)}</button>`);
        grid.appendChild(node);
      });
      col.appendChild(grid);
      box.appendChild(col);
    });
    /* connector lines */
    requestAnimationFrame(() => {
      document.querySelectorAll('.skill-branch').forEach(col => {
        const old = col.querySelector('svg'); if (old) old.remove();
        const rect = col.getBoundingClientRect();
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'skill-lines');
        svg.setAttribute('width', rect.width); svg.setAttribute('height', rect.height);
        col.querySelectorAll('.skill-node').forEach(node => {
          const sk = SKILL_BY_ID[node.dataset.skill];
          if (!sk.pre) return;
          const preNode = col.querySelector(`[data-skill="${sk.pre}"]`);
          if (!preNode) return;
          const a = preNode.getBoundingClientRect(), b = node.getBoundingClientRect();
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', a.left - rect.left + a.width / 2);
          line.setAttribute('y1', a.top - rect.top + a.height);
          line.setAttribute('x2', b.left - rect.left + b.width / 2);
          line.setAttribute('y2', b.top - rect.top);
          line.setAttribute('stroke', GAME.lvl(sk.pre) ? '#7ac74f' : '#b5a583');
          line.setAttribute('stroke-width', '3');
          svg.appendChild(line);
        });
        col.insertBefore(svg, col.firstChild);
      });
    });
    GAME.dirty.skills = false;
  }

  function renderPedia() {
    const box = $('#pedia');
    box.innerHTML = '';
    $('#pedia-sub').textContent = `${GAME.disc()} / 100 discovered`;
    TIERS.forEach((tier, t) => {
      const pool = SPECIES_BY_TIER[t];
      const found = pool.filter(sp => S().disc.includes(sp.id)).length;
      const sec = document.createElement('div');
      sec.className = 'pedia-tier';
      sec.innerHTML = `<div class="pedia-tier-head" style="background:${tier.c}"><span>${tier.n}</span><span>${found}/${pool.length}</span></div>`;
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
             <span class="p-count">${inField ? 'on field: ' + inField : 'hatched before'}</span>`);
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

  /* ================= ACTIONS / INPUT ================= */
  function tryPet(wx, wy) {
    const m = W.mama;
    if (wx > m.x - 16 && wx < m.x + 18 && wy > m.y - 26 && wy < m.y + 18) {
      if (GAME.petMama()) {
        petFx.set('mama', performance.now());
        heart(m.x, m.y - 18, 3);
        snd.pet();
      }
      return true;
    }
    for (const ch of S().chickens) {
      if (wx > ch.x && wx < ch.x + 20 && wy > ch.y - 4 && wy < ch.y + 20) {
        if (GAME.petChicken(ch)) {
          petFx.set(ch.id, performance.now());
          heart(ch.x + 10, ch.y - 4, 2);
          snd.pet();
        }
        return true;
      }
    }
    return false;
  }

  function hitTruck(wx, wy) {
    const th = W.truckHome;
    return S().truck.state === 'parked' && wx > th.x - 10 && wx < th.x + th.w + 12 && wy > th.y - 16 && wy < th.y + th.h + 4;
  }

  function resolveDrop(wx, wy) {
    if (!S().basket.length) return;
    if (hitTruck(wx, wy)) {
      const n = GAME.basketToTruck();
      if (n) {
        for (let i = 0; i < Math.min(n, 6); i++) setTimeout(() => snd.clink(), i * 60);
        floatWorld('+' + n + ' loaded', W.truckHome.x + 20, W.truckHome.y - 14, 'green');
      }
      if (S().basket.length) floatWorld('truck full!', W.truckHome.x + 20, W.truckHome.y - 24, 'pink');
      updateCursorChip();
      return;
    }
    const c = Math.floor(wx / 16), r = Math.floor(wy / 16);
    const o = GAME.occAt(c, r);
    if (o && o.type === 'incubator') {
      const n = GAME.basketToInc(o.k);
      if (n) { snd.place(); floatWorld('+' + n + ' incubating', wx, wy - 12, 'green'); }
      if (S().basket.length) floatWorld('incubator full!', wx, wy - 22, 'pink');
      updateCursorChip();
      return;
    }
    /* place on grass to hatch */
    const n = GAME.basketToGround(wx, Math.min(wy, W.roadY - 8));
    if (n) { snd.place(); floatWorld(n > 1 ? n + ' eggs nested' : 'egg nested', wx, wy - 12, ''); }
    updateCursorChip();
  }

  function handlePlaceAt(wx, wy, isDragStep) {
    const c = Math.floor(wx / 16), r = Math.floor(wy / 16);
    if (placeMode === 'demolish') {
      if (GAME.occAt(c, r)) { GAME.demolish(c, r); snd.demolish(); }
      return;
    }
    if (placeMode === 'belt' && isDragStep && paintTile) {
      const [pc, pr] = paintTile;
      if (pc === c && pr === r) return;
      /* direction follows the drag */
      let dir = placeDir;
      if (c > pc) dir = 0; else if (c < pc) dir = 2; else if (r > pr) dir = 1; else if (r < pr) dir = 3;
      placeDir = dir;
      GAME.setBeltDir(pc, pr, dir);
      if (GAME.build('belt', c, r, dir)) snd.build();
      paintTile = [c, r];
      GAME.mark('build');
      return;
    }
    if (GAME.build(placeMode, c, r, placeDir)) {
      snd.build();
      if (placeMode === 'belt') paintTile = [c, r];
      GAME.mark('build');
    } else if (!isDragStep) {
      const cost = buildCost(placeMode, S().built[placeMode]);
      if (S().coins < cost) { snd.error(); floatWorld('need 🪙' + GAME.fmt(cost), wx, wy - 10, 'pink'); }
    }
  }

  cv.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    cv.setPointerCapture(ev.pointerId);
    const p = eventToWorld(ev);
    cursor.x = p.x; cursor.y = p.y;
    cursor.down = true; cursor.downAt = performance.now();
    cursor.downX = p.x; cursor.downY = p.y; cursor.moved = 0;
    if (placeMode) { paintTile = null; handlePlaceAt(p.x, p.y, false); return; }
    tryPet(p.x, p.y);
  });
  cv.addEventListener('pointermove', ev => {
    const p = eventToWorld(ev);
    cursor.moved += Math.hypot(p.x - cursor.x, p.y - cursor.y);
    cursor.x = p.x; cursor.y = p.y;
    if (cursor.down && placeMode) handlePlaceAt(p.x, p.y, true);
  });
  function endPointer(ev) {
    if (!cursor.down) return;
    cursor.down = false;
    const p = eventToWorld(ev);
    if (placeMode) { paintTile = null; return; }
    if (S().basket.length) { resolveDrop(p.x, p.y); return; }
    /* plain tap on the truck sends it */
    if (cursor.moved < 6 && performance.now() - cursor.downAt < 450 && hitTruck(p.x, p.y)) {
      if (S().truck.load.length && GAME.sendTruck()) snd.engine();
    }
  }
  cv.addEventListener('pointerup', endPointer);
  cv.addEventListener('pointercancel', () => { cursor.down = false; paintTile = null; });
  cv.addEventListener('contextmenu', ev => { ev.preventDefault(); setPlaceMode(null); });

  function setPlaceMode(mode) {
    placeMode = placeMode === mode ? null : mode;
    paintTile = null;
    GAME.mark('build');
    cv.classList.toggle('placing', !!placeMode);
  }

  window.addEventListener('keydown', ev => {
    if (ev.key === 'r' || ev.key === 'R') { placeDir = (placeDir + 1) % 4; GAME.mark('build'); }
    if (ev.key === 'Escape') { setPlaceMode(null); closeModals(); }
    if (ev.key === '1') setPlaceMode('incubator');
    if (ev.key === '2') setPlaceMode('vacuum');
    if (ev.key === '3') setPlaceMode('belt');
    if (ev.key === 'x' || ev.key === 'X') setPlaceMode('demolish');
  });

  /* HUD clicks (delegated) */
  document.getElementById('app').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    switch (act) {
      case 'place': setPlaceMode(btn.dataset.type); break;
      case 'rotate': placeDir = (placeDir + 1) % 4; GAME.mark('build'); break;
      case 'demolish': setPlaceMode('demolish'); break;
      case 'cancel': setPlaceMode(null); break;
      case 'research': renderSkills(); openModal('#modal-skills'); break;
      case 'pedia': renderPedia(); openModal('#modal-pedia'); break;
      case 'close-modal': closeModals(); break;
      case 'skill': {
        if (GAME.buySkill(btn.dataset.id)) {
          snd.skill();
          if (btn.dataset.id === 'overclock') snd.grand();
          renderSkills();
        } else snd.error();
        break;
      }
      case 'mama-up': {
        if (GAME.upgradeMama()) {
          snd.grand();
          heart(W.mama.x, W.mama.y - 20, 8);
          toast({ title: 'MAMA EVOLVED!', body: `She now lays ${TIERS[S().mamaTier].n} eggs. Radiant.` });
        } else snd.error();
        break;
      }
      case 'send-truck': if (GAME.sendTruck()) snd.engine(); break;
      case 'mute': S().muted = !S().muted; $('#btn-mute').textContent = S().muted ? '🔇' : '🔊'; break;
      case 'save': GAME.save(); floatText('Saved!', ev.clientX - 20, ev.clientY - 20, 'green'); break;
      case 'reset':
        if (confirm('Really reset EVERYTHING? The chickens will unionize.')) {
          GAME.reset(); renderBuildBar(); updateCursorChip();
        }
        break;
    }
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
  GAME.on('hatch', ({ births, x, y }) => {
    snd.hatch();
    births.forEach((b, i) => {
      shellBurst(x + i * 6, y, b.sp.tier);
      floatWorld('+🪶' + b.feathers, x, y - 14, 'green');
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
    if (births.length > 1) floatWorld('TWINS!!', x, y - 24, 'pink');
    flash($('#chip-feathers'));
  });
  GAME.on('sell', ({ pay, n }) => {
    snd.coin();
    coinBurst(W.truckHome.x + 26, W.truckHome.y - 4, n);
    floatWorld('+🪙' + GAME.fmt(pay), W.truckHome.x + 20, W.truckHome.y - 20, 'gold');
    flash($('#chip-coins'));
  });
  GAME.on('truckleave', () => { snd.engine(); puff(W.truckHome.x - 4, W.roadY + 8, '#c9a35f', 8, 40, 14); });
  GAME.on('truckload', () => {});

  /* ================= BOOT & LOOPS ================= */
  function boot() {
    GAME.load();
    const off = GAME.applyOffline();
    buildGround();
    renderBuildBar();
    updateCursorChip();
    $('#btn-mute').textContent = S().muted ? '🔇' : '🔊';
    if (off && (off.laid > 0 || off.hatched > 0 || off.pay > 0)) {
      toast({
        title: 'Welcome back!',
        body: `While you were away (${GAME.fmtTime(off.seconds)}): ${GAME.fmt(off.laid)} eggs laid` +
          (off.hatched ? `, ${off.hatched} hatched` : '') + (off.pay ? `, truck sold +🪙${GAME.fmt(off.pay)}` : '') + '.',
        long: true,
      });
    }

    let last = performance.now(), saveAcc = 0, hudAcc = 0;
    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      /* catch up after tab sleep in small steps */
      if (dt > 2) {
        let rest = Math.min(dt, 600);
        while (rest > 0) { GAME.tick(Math.min(0.5, rest)); rest -= 0.5; }
        dt = 0.016;
      }
      dt = Math.min(dt, 0.1);
      GAME.tick(dt);
      magnet(dt, now);
      render(now, dt);
      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        lightUpdate(now);
        if (GAME.dirty.build) renderBuildBar();
        if (GAME.dirty.skills && !$('#modal-skills').hidden) renderSkills();
        if (GAME.dirty.pedia && !$('#modal-pedia').hidden) renderPedia();
        updateCursorChip();
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
