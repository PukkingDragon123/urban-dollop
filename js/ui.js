/* ============================================================
   INF EGG CO. — view/controller
   All art is procedural pixel work; no emoji anywhere.
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

  /* ================= DOM ICON HELPERS ================= */
  function mkIcon(name, scale) {
    const src = SPR.iconSprite(name, scale || 2);
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.className = 'px-icon';
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }
  function cloneCanvas(src, scale) {
    const k = scale || 1;
    const c = document.createElement('canvas');
    c.width = src.width * k; c.height = src.height * k;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  const chickEl = (sp, k, sil) => cloneCanvas(SPR.chickenSprite(sp, k, sil));

  /* ================= FLOAT TEXT & TOASTS ================= */
  const fxLayer = $('#fx-layer'), toastBox = $('#toasts');
  function floatText(txt, sx, sy, cls, icon) {
    const el = document.createElement('div');
    el.className = 'float-txt' + (cls ? ' ' + cls : '');
    if (icon) el.appendChild(mkIcon(icon, 2));
    const span = document.createElement('span');
    span.textContent = txt;
    el.appendChild(span);
    el.style.left = Math.round(sx) + 'px';
    el.style.top = Math.round(sy) + 'px';
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }
  function floatWorld(txt, wx, wy, cls, icon) {
    const p = worldToScreen(wx, wy);
    if (p.x < -60 || p.x > innerWidth + 60) return;
    floatText(txt, p.x - 24, p.y - 10, cls, icon);
  }
  function toast(opts) {
    while (toastBox.children.length >= 3) toastBox.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    if (opts.sprite) el.appendChild(opts.sprite);
    else if (opts.icon) el.appendChild(mkIcon(opts.icon, 3));
    const txt = document.createElement('div');
    if (opts.title) { const b = document.createElement('b'); b.textContent = opts.title; txt.appendChild(b); }
    if (opts.body) txt.appendChild(document.createTextNode(opts.body));
    el.appendChild(txt);
    toastBox.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, opts.long ? 6000 : 3600);
  }

  /* ================= CANVAS & CAMERA ================= */
  const cv = $('#world');
  let ctx = cv.getContext('2d');   /* swapped temporarily when painting thumbnails */
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

  /* ================= GROUND (baked once) ================= */
  const rndG = SPR.mulberry(20260901);
  let groundCv = null;

  /* smooth value noise */
  function makeNoise(seed, cell, w, h) {
    const rnd = SPR.mulberry(seed);
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
    const g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    return (x, y) => {
      const fx = x / cell, fy = y / cell;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const at = (i, j) => g[Math.min(gh - 1, j) * gw + Math.min(gw - 1, i)];
      const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
      return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
    };
  }
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  function buildGround() {
    groundCv = SPR.newCanvas(W.W, W.H);
    const g = groundCv.getContext('2d');
    const img = g.createImageData(W.W, W.H);
    const d = img.data;
    const put = (x, y, c) => { const i = (y * W.W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };

    const GRASS = ['#69ab3e', '#74b845', '#80c44f', '#8ecf5b', '#9ada66'].map(rgb);
    const DIRT = ['#b58a4f', '#c69a5c', '#a87c42', '#d1a86b'].map(rgb);
    const SAND = ['#e0cb98', '#d6bd88', '#eddba9'].map(rgb);
    const WATER = ['#3f9ec4', '#4fb0d6', '#63c1e2', '#2f86ad'].map(rgb);

    const nBig = makeNoise(11, 34, W.W, W.H);
    const nSml = makeNoise(29, 9, W.W, W.H);
    const nDirt = makeNoise(47, 7, W.W, W.H);

    /* dirt paths: polylines through the home plot */
    /* dirt paths through the home plot, plus a lane along the road */
    const paths = [
      [[36, 458], [52, 508], [92, 538], [150, 574], [186, 588]],
      [[92, 538], [118, 500]],
      [[64, 456], [58, 494]],
      [[186, 588], [420, 584], [700, 588], [980, 584]],
    ];
    function pathDist(x, y) {
      let best = 1e9;
      for (const poly of paths) {
        for (let i = 0; i < poly.length - 1; i++) {
          const [x1, y1] = poly[i], [x2, y2] = poly[i + 1];
          const dx = x2 - x1, dy = y2 - y1;
          const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
          const px = x1 + dx * t, py = y1 + dy * t;
          best = Math.min(best, Math.hypot(x - px, y - py));
        }
      }
      return best;
    }

    const pond = W.pond;
    for (let y = 0; y < W.H; y++) {
      for (let x = 0; x < W.W; x++) {
        let c;
        if (y >= W.roadY) {
          /* packed dirt road with gravel */
          const n = nSml(x, y);
          c = DIRT[n < 0.3 ? 2 : n < 0.62 ? 0 : n < 0.9 ? 1 : 3];
          if (y === W.roadY) c = rgb('#8a5e2a');
        } else {
          const v = nBig(x, y) * 0.68 + nSml(x, y) * 0.32;
          let idx = v < 0.36 ? 0 : v < 0.46 ? 1 : v < 0.60 ? 2 : v < 0.76 ? 3 : 4;
          /* dither between bands */
          if ((x + y) % 2 === 0 && Math.abs(v - 0.46) < 0.03) idx = 1;
          c = GRASS[idx];
          /* dirt path */
          const pd = pathDist(x, y);
          const edge = 5 + nDirt(x, y) * 4;
          if (pd < edge) {
            const n = nSml(x * 1.7, y * 1.7);
            c = DIRT[n < 0.35 ? 0 : n < 0.7 ? 1 : 2];
            if (pd > edge - 1.6 && (x + y) % 2 === 0) c = GRASS[1];
          }
          /* pond */
          const inPondRect = x > pond.x - 6 && x < pond.x + pond.w + 6 && y > pond.y - 5 && y < pond.y + pond.h + 6;
          if (inPondRect) {
            const cx = pond.x + pond.w / 2, cy = pond.y + pond.h / 2;
            const dx = (x - cx) / (pond.w / 2), dy = (y - cy) / (pond.h / 2);
            const r = dx * dx + dy * dy + (nSml(x, y) - 0.5) * 0.16;
            if (r < 0.82) {
              const depth = 1 - r;
              c = WATER[depth > 0.75 ? 3 : depth > 0.5 ? 0 : depth > 0.3 ? 1 : 2];
            } else if (r < 1.05) {
              const n = nSml(x * 2, y * 2);
              c = SAND[n < 0.4 ? 0 : n < 0.8 ? 1 : 2];
            }
          }
        }
        put(x, y, c);
      }
    }
    g.putImageData(img, 0, 0);

    /* road markings + ruts */
    g.fillStyle = 'rgba(120,86,44,.5)';
    for (let x = 0; x < W.W; x += 2) { g.fillRect(x, W.roadY + 9, 1, 1); g.fillRect(x + 1, W.roadY + 22, 1, 1); }
    g.fillStyle = 'rgba(255,240,200,.35)';
    for (let x = 6; x < W.W; x += 22) g.fillRect(x, W.roadY + 15, 8, 1);

    /* grass blades everywhere */
    for (let i = 0; i < 7000; i++) {
      const x = Math.floor(rndG() * W.W), y = Math.floor(rndG() * (W.roadY - 6)) + 4;
      if (GAME.inPond(x, y)) continue;
      g.fillStyle = rndG() < 0.5 ? 'rgba(96,160,60,.55)' : 'rgba(150,214,110,.5)';
      g.fillRect(x, y, 1, 2);
    }

    /* pond extras: lily pads, reeds, shore stones */
    g.fillStyle = '#4f9b3f';
    [[10, 20], [40, 6], [24, 24]].forEach(([ox, oy], i) => {
      const lx = pond.x + ox, ly = pond.y + oy;
      g.fillStyle = '#4f9b3f'; g.fillRect(lx, ly, 6, 3); g.fillRect(lx + 1, ly - 1, 4, 5);
      g.fillStyle = '#63b048'; g.fillRect(lx + 1, ly, 3, 2);
      if (i === 1) { g.fillStyle = '#ff8ab5'; g.fillRect(lx + 2, ly, 2, 2); g.fillStyle = '#fff'; g.fillRect(lx + 2, ly, 1, 1); }
    });
    for (let i = 0; i < 7; i++) {
      const a = rndG() * Math.PI * 2;
      const rx = pond.x + pond.w / 2 + Math.cos(a) * (pond.w / 2 + 4);
      const ry = pond.y + pond.h / 2 + Math.sin(a) * (pond.h / 2 + 3);
      g.drawImage(SPR.decoSprite('reed', 1, 100 + i), Math.floor(rx) - 4, Math.floor(ry) - 10);
    }

    /* per-plot scenery */
    PLOTS.forEach(p => scatterPlot(g, p));

    /* tree line along the very top */
    let tx = -6;
    while (tx < W.W) {
      const kind = rndG() < 0.34 ? 'pine' : rndG() < 0.5 ? 'apple' : 'tree';
      const spr = SPR.decoSprite(kind, 1, Math.floor(rndG() * 9999));
      shadow(g, tx + spr.width / 2, 26, spr.width * 0.42);
      g.drawImage(spr, tx, -4);
      tx += 18 + Math.floor(rndG() * 14);
    }
    /* side tree columns */
    for (let y = 30; y < W.roadY - 30; y += 30 + Math.floor(rndG() * 20)) {
      let spr = SPR.decoSprite(rndG() < 0.5 ? 'tree' : 'pine', 1, Math.floor(rndG() * 9999));
      shadow(g, 6, y + spr.height - 3, 9);
      g.drawImage(spr, -8, y);
      spr = SPR.decoSprite(rndG() < 0.5 ? 'tree' : 'pine', 1, Math.floor(rndG() * 9999));
      shadow(g, W.W - 8, y + spr.height - 3, 9);
      g.drawImage(spr, W.W - 20, y + 8);
    }

    /* mama's tended nest patch */
    const mx = W.mama.x, my = W.mama.y;
    for (let y = -6; y < 18; y++) for (let x = -20; x < 22; x++) {
      const dx = x / 20, dy = (y - 6) / 11;
      if (dx * dx + dy * dy < 1 && rndG() < 0.85) {
        g.fillStyle = rndG() < 0.5 ? '#c9a35f' : '#d9b673';
        g.fillRect(mx + x, my + y, 1, 1);
      }
    }

    /* fences: pretty picket for owned, weathered for locked */
    PLOTS.forEach(p => { if (!S().plots[p.id]) lockedPlot(g, p); });
    GAME.dirty.ground = false;
  }

  function shadow(g, cx, cy, r) {
    g.fillStyle = 'rgba(40,58,26,.20)';
    for (let y = -Math.round(r * 0.4); y <= r * 0.4; y++) {
      const half = Math.round(r * Math.sqrt(Math.max(0, 1 - (y / (r * 0.4)) ** 2)));
      g.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, 1);
    }
  }

  function scatterPlot(g, p) {
    const rnd = SPR.mulberry(700 + p.id * 131);
    const x0 = p.tc * 16, y0 = p.tr * 16, pw = PLOT_W * 16, ph = PLOT_H * 16;
    const place = (kind, n, big) => {
      for (let i = 0; i < n; i++) {
        let x, y, tries = 0;
        do {
          x = x0 + 8 + rnd() * (pw - 26);
          y = y0 + 10 + rnd() * (ph - (p.tr === (PLOT_ROWS - 1) * PLOT_H ? 66 : 24));
          tries++;
        } while (tries < 26 && (
          GAME.inPond(x + 6, y + 4) ||
          GAME.inStation(x + 6, y + 4, 16) ||
          (Math.abs(x - W.mama.x) < 36 && Math.abs(y - W.mama.y) < 32) ||
          (y > W.roadY - 46 && Math.abs(x - (W.truckHome.x + 28)) < 56) ||
          (p.id === PLOT_START && x < 92 && y > 508 && y < 558)
        ));
        const spr = SPR.decoSprite(kind, 1, Math.floor(rnd() * 99999));
        if (big) shadow(g, x + spr.width / 2, y + spr.height - 3, spr.width * 0.36);
        else shadow(g, x + spr.width / 2, y + spr.height - 1, spr.width * 0.3);
        g.drawImage(spr, Math.floor(x), Math.floor(y));
      }
    };
    switch (p.theme) {
      case 'home': place('tree', 2, true); place('bush', 4); place('flower', 7); place('tuft', 12); place('clover', 6); place('rock', 2); place('shroom', 2); break;
      case 'sunflower': place('sunflower', 14); place('tuft', 10); place('flower', 5); place('bush', 2); break;
      case 'rocky': place('rock', 10); place('pine', 4, true); place('tuft', 8); place('stump', 2); break;
      case 'berry': place('bush', 10); place('tree', 2, true); place('tuft', 9); place('flower', 4); break;
      case 'lavender': place('lavender', 18); place('flower', 5); place('tuft', 8); place('bush', 2); break;
      case 'shroom': place('shroom', 11); place('stump', 3); place('pine', 3, true); place('tuft', 7); place('clover', 4); break;
      case 'orchard': place('apple', 5, true); place('tuft', 10); place('clover', 7); place('flower', 4); break;
      case 'meadow': place('flower', 14); place('clover', 10); place('tuft', 12); place('bush', 2); break;
      case 'wetland': place('reed', 16); place('tuft', 9); place('shroom', 4); place('rock', 3); break;
      case 'pinewood': place('pine', 7, true); place('stump', 4); place('shroom', 5); place('tuft', 8); break;
      case 'thicket': place('bush', 12); place('tree', 3, true); place('shroom', 4); place('tuft', 9); break;
      case 'prairie': place('tuft', 18); place('clover', 9); place('sunflower', 4); place('rock', 4); break;
      default: place('tuft', 12); place('flower', 5); place('bush', 3); break;
    }
  }

  function lockedPlot(g, p) {
    const x0 = p.tc * 16, y0 = p.tr * 16, w = PLOT_W * 16, h = PLOT_H * 16;
    /* overgrown, hazy */
    g.fillStyle = 'rgba(28,44,20,.34)';
    g.fillRect(x0, y0, w, h);
    g.fillStyle = 'rgba(20,34,14,.18)';
    for (let y = y0; y < y0 + h; y += 2) g.fillRect(x0, y, w, 1);
    /* picket fence */
    const post = (x, y) => {
      g.fillStyle = '#7a5230'; g.fillRect(x, y, 3, 13);
      g.fillStyle = '#a8783f'; g.fillRect(x, y + 1, 2, 11);
      g.fillStyle = '#c9a35f'; g.fillRect(x, y + 2, 1, 4);
      g.fillStyle = '#5e3d18'; g.fillRect(x, y, 3, 1);
    };
    const rail = (x, y, len, horiz) => {
      g.fillStyle = '#8a5e2a';
      if (horiz) { g.fillRect(x, y, len, 3); g.fillStyle = '#c9a35f'; g.fillRect(x, y, len, 1); }
      else { g.fillRect(x, y, 3, len); g.fillStyle = '#c9a35f'; g.fillRect(x, y, 1, len); }
    };
    rail(x0 + 2, y0 + 4, w - 4, true); rail(x0 + 2, y0 + h - 10, w - 4, true);
    rail(x0 + 2, y0 + 4, h - 8, false); rail(x0 + w - 5, y0 + 4, h - 8, false);
    for (let x = x0 + 4; x < x0 + w - 4; x += 14) { post(x, y0 + 1); post(x, y0 + h - 14); }
    for (let y = y0 + 6; y < y0 + h - 12; y += 14) { post(x0 + 1, y); post(x0 + w - 4, y); }
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
    puff(x, y, EGG_SHELL[Math.min(tier, EGG_SHELL.length - 1)], 9, 44, 32);
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
        ctx.fillStyle = '#ffb0d0';
        ctx.fillRect(Math.round(p.x + 1), Math.round(p.y + 1), 1, 1);
      } else if (p.type === 'coin') {
        ctx.fillStyle = '#e0a416'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        ctx.fillStyle = '#fff2b0'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      } else {
        ctx.fillStyle = p.col;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
    });
    ctx.globalAlpha = 1;
  }
  /* hatch bursts: shell halves fly, the chick pops out and hops */
  let hatchFx = [];
  const bornFx = new Map();
  function spawnHatchFx(sp, x, y, rainbow) {
    hatchFx.push({ sp, x, y, t: 0, life: 1.15, rainbow, seed: Math.random() });
    shellBurst(x, y, sp.tier);
  }
  function drawHatchFx(dt, now) {
    hatchFx = hatchFx.filter(h => (h.t += dt) < h.life);
    hatchFx.forEach(h => {
      const p = h.t / h.life;
      const shell = Math.min(h.sp.tier, EGG_SHELL.length - 1);
      /* bottom half stays put and settles */
      const bot = SPR.shellHalfSprite(shell, false, 1);
      ctx.drawImage(bot, Math.round(h.x - 5), Math.round(h.y - 4 + Math.min(2, p * 6)));
      /* top half tumbles away */
      const top = SPR.shellHalfSprite(shell, true, 1);
      const tx = h.x - 5 + (h.seed < 0.5 ? -1 : 1) * p * 22;
      const ty = h.y - 8 - Math.sin(Math.min(1, p * 1.4) * Math.PI) * 18 + p * p * 14;
      ctx.save();
      ctx.translate(Math.round(tx + 5), Math.round(ty + 3));
      ctx.rotate(p * (h.seed < 0.5 ? -7 : 7));
      ctx.globalAlpha = Math.max(0, 1 - p * 1.1);
      ctx.drawImage(top, -5, -3);
      ctx.restore();
      ctx.globalAlpha = 1;
      /* the chick rises, squashing as it lands */
      const spr = SPR.chickenSprite(h.sp, 1, false);
      const rise = p < 0.45 ? (p / 0.45) : 1;
      const hop = Math.sin(Math.min(1, p / 0.75) * Math.PI) * 7;
      const squash = p < 0.2 ? 1.35 - p * 1.5 : (p > 0.8 ? 1 + (p - 0.8) * 0.5 : 1);
      ctx.save();
      ctx.translate(Math.round(h.x), Math.round(h.y + 4 - rise * 6 - hop));
      ctx.scale(1 / squash, squash);
      ctx.globalAlpha = Math.min(1, p * 3);
      ctx.drawImage(spr, -10, -16);
      ctx.restore();
      ctx.globalAlpha = 1;
      /* sparkle ring on the first beat */
      if (p < 0.5) {
        const r = 4 + p * 26;
        ctx.fillStyle = h.rainbow ? '#ff5fd0' : 'rgba(255,255,255,.85)';
        for (let a = 0; a < 6; a++) {
          const ang = a / 6 * Math.PI * 2 + h.seed * 6;
          ctx.fillRect(Math.round(h.x + Math.cos(ang) * r), Math.round(h.y - 4 + Math.sin(ang) * r * 0.6), 2, 2);
        }
      }
    });
  }

  const flies = [0, 1, 2, 3, 4, 5].map(i => ({
    x: Math.random() * W.W, y: 40 + Math.random() * 300,
    a: Math.random() * Math.PI * 2,
    col: ['#ff8ab5', '#fff5d9', '#ffd23f', '#c9a8f0', '#aee7ff', '#ffb07a'][i],
  }));
  const clouds = [0, 1, 2].map(i => ({ x: Math.random() * W.W, y: 60 + i * 120, w: 70 + i * 26, v: 3 + i * 1.4 }));

  /* ================= INPUT STATE ================= */
  const ptr = { x: -999, y: -999, sx: 0, sy: 0, inside: false, down: false, downAt: 0, moved: 0, mode: null, target: null };
  let buildSel = null, placeDir = 0, paintTile = null, sprinkleCd = 0;
  const petFx = new Map();
  const keys = {};

  /* ================= WORLD DRAWING ================= */
  function drawEgg(e, now) {
    const spr = e.rainbow ? SPR.eggSprite(e.tier, 1, true, Math.floor(now / 120) % 6) : SPR.eggSprite(e.tier, 1);
    ctx.fillStyle = 'rgba(40,58,26,.26)';
    ctx.fillRect(Math.round(e.x - 3), Math.round(e.y - 1), 7, 2);
    ctx.fillRect(Math.round(e.x - 4), Math.round(e.y - 2), 9, 1);
    ctx.drawImage(spr, Math.round(e.x - 5), Math.round(e.y - 12 + e.z));
    if (e.golden) {
      const s = Math.floor(now / 160) % 4;
      ctx.fillStyle = '#fff6c0';
      if (s === 0) ctx.fillRect(Math.round(e.x + 3), Math.round(e.y - 11 + e.z), 1, 1);
      if (s === 2) ctx.fillRect(Math.round(e.x - 5), Math.round(e.y - 5 + e.z), 1, 1);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(Math.round(e.x - 1), Math.round(e.y - 13 + e.z), 1, 1);
    }
  }
  function drawPlume(pl, now) {
    const spr = SPR.plumeSprite(1);
    const bob = pl.z >= 0 ? Math.sin(now / 400 + pl.sway) * 0.8 : 0;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(spr, Math.round(pl.x - 3), Math.round(pl.y + pl.z - 5 + bob));
    ctx.globalAlpha = 1;
    if (Math.floor(now / 260 + pl.sway * 3) % 5 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(pl.x + 3), Math.round(pl.y + pl.z - 6), 1, 1);
    }
  }

  function drawBelt(c, r, dir, now) {
    const x = c * 16, y = r * 16;
    const horiz = dir === 0 || dir === 2;
    /* shadow on the grass */
    ctx.fillStyle = 'rgba(40,58,26,.22)'; ctx.fillRect(x + 1, y + 14, 15, 2);
    /* chassis */
    ctx.fillStyle = '#6a7280'; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#8e97a6'; ctx.fillRect(x, y, 16, 2);
    ctx.fillStyle = '#4b515c'; ctx.fillRect(x, y + 14, 16, 2);
    /* tread bed */
    ctx.fillStyle = '#9aa3b2';
    if (horiz) ctx.fillRect(x, y + 3, 16, 10); else ctx.fillRect(x + 3, y, 10, 16);
    ctx.fillStyle = '#b8c0cc';
    if (horiz) ctx.fillRect(x, y + 3, 16, 3); else ctx.fillRect(x + 3, y, 3, 16);
    /* moving cleats */
    const phase = Math.floor(now / 1000 * GAME.beltSpeed()) % 8;
    for (let i = -1; i < 3; i++) {
      let off = i * 8 + (dir === 0 || dir === 1 ? phase : 8 - phase);
      off = ((off % 16) + 16) % 16;
      ctx.fillStyle = '#5d6472';
      if (horiz) ctx.fillRect(x + off, y + 4, 2, 8); else ctx.fillRect(x + 4, y + off, 8, 2);
      ctx.fillStyle = '#d6dce6';
      if (horiz) ctx.fillRect(x + off, y + 4, 1, 8); else ctx.fillRect(x + 4, y + off, 8, 1);
    }
    /* side rails with rivets */
    ctx.fillStyle = '#3d434e';
    if (horiz) { ctx.fillRect(x, y + 2, 16, 2); ctx.fillRect(x, y + 12, 16, 2); }
    else { ctx.fillRect(x + 2, y, 2, 16); ctx.fillRect(x + 12, y, 2, 16); }
    ctx.fillStyle = '#c9d1dc';
    if (horiz) { ctx.fillRect(x + 3, y + 2, 1, 1); ctx.fillRect(x + 11, y + 2, 1, 1); ctx.fillRect(x + 3, y + 13, 1, 1); ctx.fillRect(x + 11, y + 13, 1, 1); }
    else { ctx.fillRect(x + 2, y + 3, 1, 1); ctx.fillRect(x + 2, y + 11, 1, 1); ctx.fillRect(x + 13, y + 3, 1, 1); ctx.fillRect(x + 13, y + 11, 1, 1); }
    /* direction chevron */
    const [ax, ay] = [[12, 6], [6, 12], [2, 6], [6, 2]][dir];
    ctx.fillStyle = '#ffc72f'; ctx.fillRect(x + ax, y + ay, 3, 3);
    ctx.fillStyle = '#e0a416'; ctx.fillRect(x + ax, y + ay + 2, 3, 1);
  }

  function drawVacuum(c, r, v, now) {
    const x = c * 16, y = r * 16;
    const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][v.dir];
    const sucking = S().eggs.some(e => e.suck === (c + ',' + r));
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 2, y + 14, 12, 2);
    /* treads */
    ctx.fillStyle = '#23262b'; ctx.fillRect(x + 1, y + 10, 14, 5);
    ctx.fillStyle = '#3a3f47';
    for (let i = 0; i < 5; i++) ctx.fillRect(x + 2 + i * 3 + (sucking ? Math.floor(now / 120) % 3 : 0) % 3, y + 11, 2, 3);
    /* body */
    ctx.fillStyle = '#2e3238'; ctx.fillRect(x + 2, y + 2, 12, 9);
    ctx.fillStyle = '#aeb4bd'; ctx.fillRect(x + 3, y + 3, 10, 7);
    ctx.fillStyle = '#d8dde6'; ctx.fillRect(x + 3, y + 3, 10, 3);
    ctx.fillStyle = '#8a9099'; ctx.fillRect(x + 3, y + 9, 10, 1);
    /* glass canister showing held eggs */
    ctx.fillStyle = '#2e3238'; ctx.fillRect(x + 9, y + 4, 5, 6);
    ctx.fillStyle = '#bfe8f5'; ctx.fillRect(x + 10, y + 5, 3, 4);
    for (let i = 0; i < Math.min(v.hold.length, 3); i++) {
      ctx.fillStyle = EGG_SHELL[v.hold[i].tier];
      ctx.fillRect(x + 10, y + 8 - i, 3, 1);
    }
    /* eye / lens */
    ctx.fillStyle = sucking ? '#3fd0ff' : '#2f5f9e';
    ctx.fillRect(x + 4, y + 5, 4, 3);
    ctx.fillStyle = '#e8f8ff'; ctx.fillRect(x + 4, y + 5, 2, 1);
    /* antenna with blinker */
    ctx.fillStyle = '#565d68'; ctx.fillRect(x + 5, y, 1, 2);
    ctx.fillStyle = Math.floor(now / 400) % 2 ? '#e8542f' : '#7a2a1a';
    ctx.fillRect(x + 5, y - 1, 1, 1);
    /* intake nozzle */
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(x + 7 + dx * 6, y + 6 + dy * 5, 2 + Math.abs(dx) * 3, 2 + Math.abs(dy) * 3);
    if (sucking) {
      ctx.fillStyle = 'rgba(120,220,255,.55)';
      const t = Math.floor(now / 90) % 3;
      ctx.fillRect(x + 7 + dx * (8 + t * 2), y + 6 + dy * (7 + t * 2), 2, 2);
    }
  }

  function drawIncubator(c, r, inc, now) {
    const x = c * 16, y = r * 16;
    const warm = inc.queue.length > 0;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 2, y + 29, 28, 3);
    /* legs */
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 3, y + 27, 4, 4); ctx.fillRect(x + 25, y + 27, 4, 4);
    /* main body: wood cabinet with panel lines */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 12, 30, 16);
    ctx.fillStyle = '#c9a35f'; ctx.fillRect(x + 2, y + 13, 28, 14);
    ctx.fillStyle = '#e0bd82'; ctx.fillRect(x + 2, y + 13, 28, 3);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 2, y + 24, 28, 3);
    ctx.fillStyle = '#8a5e2a';
    ctx.fillRect(x + 2, y + 19, 28, 1);
    /* metal band + rivets */
    ctx.fillStyle = '#8d949e'; ctx.fillRect(x + 2, y + 20, 28, 2);
    ctx.fillStyle = '#d8dde6';
    for (let i = 0; i < 6; i++) ctx.fillRect(x + 4 + i * 5, y + 20, 1, 1);
    /* dome frame */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 4, y + 1, 24, 12);
    ctx.fillStyle = '#8d949e'; ctx.fillRect(x + 5, y + 2, 22, 1);
    /* glass */
    ctx.fillStyle = warm ? '#d8f2fa' : '#c2dbe4'; ctx.fillRect(x + 5, y + 3, 22, 9);
    ctx.fillStyle = warm ? '#ffe9c0' : '#d6e8ee'; ctx.fillRect(x + 6, y + 8, 20, 4);
    /* glass reflection streak */
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillRect(x + 7, y + 4, 4, 1); ctx.fillRect(x + 6, y + 5, 3, 1);
    /* egg inside */
    if (inc.queue.length) {
      const q = inc.queue[0];
      const spr = q.rainbow ? SPR.eggSprite(q.tier, 1, true, Math.floor(now / 120) % 6) : SPR.eggSprite(q.tier, 1);
      const need = GAME.incHatchTime(q.tier, q.rainbow);
      const frac = Math.min(1, inc.prog / need);
      /* the closer to hatching, the harder the egg rocks */
      const rock = frac > 0.55 ? Math.sin(now / (frac > 0.85 ? 45 : 90)) * (frac > 0.85 ? 1.6 : 0.9) : 0;
      const wob = Math.sin(now / 150) * 0.6 + rock;
      ctx.drawImage(spr, Math.round(x + 11 + wob), y + 2);
      const stage = frac > 0.94 ? 3 : frac > 0.82 ? 2 : frac > 0.66 ? 1 : 0;
      if (stage) ctx.drawImage(SPR.eggCrackSprite(q.tier, stage, 1), Math.round(x + 11 + wob), y + 2);
      if (stage >= 2 && Math.floor(now / 140) % 3 === 0) {
        ctx.fillStyle = '#fff8ee';
        ctx.fillRect(Math.round(x + 11 + wob + 2 + Math.random() * 5), y + 12, 1, 1);
      }
      /* warm glow */
      ctx.fillStyle = 'rgba(255,190,90,.25)';
      ctx.fillRect(x + 6, y + 9, 20, 3);
    } else {
      ctx.fillStyle = 'rgba(80,60,40,.30)';
      ctx.fillRect(x + 14, y + 5, 4, 6); ctx.fillRect(x + 15, y + 4, 2, 8);
    }
    /* control panel: gauge + progress + lamp */
    ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 4, y + 14, 12, 5);
    ctx.fillStyle = '#1a2a20'; ctx.fillRect(x + 5, y + 15, 10, 3);
    if (inc.queue.length) {
      const need = GAME.incHatchTime(inc.queue[0].tier, inc.queue[0].rainbow);
      const f = Math.min(1, inc.prog / need);
      ctx.fillStyle = '#7ac74f'; ctx.fillRect(x + 5, y + 15, Math.round(10 * f), 3);
      ctx.fillStyle = '#aef07a'; ctx.fillRect(x + 5, y + 15, Math.round(10 * f), 1);
    }
    /* dial */
    ctx.fillStyle = '#e8d5a8'; ctx.fillRect(x + 18, y + 14, 5, 5);
    ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 20, y + 16, 1, 1);
    const ang = now / 500;
    ctx.fillRect(x + 20 + Math.round(Math.cos(ang) * 1.5), y + 16 + Math.round(Math.sin(ang) * 1.5), 1, 1);
    /* lamp */
    ctx.fillStyle = warm ? (Math.floor(now / 300) % 2 ? '#ff9f1c' : '#ffd23f') : '#6a6f78';
    ctx.fillRect(x + 25, y + 15, 3, 3);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + 25, y + 15, 1, 1);
    /* queue tray */
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 3, y + 22, 26, 4);
    for (let i = 0; i < Math.min(inc.queue.length, 12); i++) {
      ctx.fillStyle = EGG_SHELL[inc.queue[i].tier];
      ctx.fillRect(x + 4 + i * 2, y + 23, 2, 2);
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.fillRect(x + 4 + i * 2, y + 24, 2, 1);
    }
  }

  /* a 3x3 bank of incubator drawers: wood cabinet, brass bands, warm glass */
  function drawHatchery(c, r, h, now) {
    const x = c * 16, y = r * 16;
    const busy = h.queue.length > 0;
    ctx.fillStyle = 'rgba(40,58,26,.28)'; ctx.fillRect(x + 3, y + 44, 42, 4);
    /* legs */
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 4, y + 42, 5, 5); ctx.fillRect(x + 39, y + 42, 5, 5);
    /* cabinet */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 7, 46, 36);
    ctx.fillStyle = '#c9a35f'; ctx.fillRect(x + 2, y + 8, 44, 34);
    ctx.fillStyle = '#e0bd82'; ctx.fillRect(x + 2, y + 8, 44, 3);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 2, y + 39, 44, 3);
    /* brass bands between the drawer rows */
    for (let i = 1; i < 3; i++) {
      const by = y + 8 + i * 11;
      ctx.fillStyle = '#b08d3a'; ctx.fillRect(x + 2, by, 44, 2);
      ctx.fillStyle = '#e0c070'; ctx.fillRect(x + 2, by, 44, 1);
      for (let j = 0; j < 8; j++) { ctx.fillStyle = '#fff0c0'; ctx.fillRect(x + 5 + j * 6, by, 1, 1); }
    }
    /* gabled roof with a vent pipe */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 2, y + 2, 44, 5);
    ctx.fillStyle = '#8fb8d6'; ctx.fillRect(x + 3, y + 3, 42, 3);
    ctx.fillStyle = '#c2dbe8'; ctx.fillRect(x + 3, y + 3, 42, 1);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 37, y - 2, 5, 5);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 37, y - 2, 5, 1);
    if (busy && Math.floor(now / 320) % 2) {
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.fillRect(x + 38, y - 5, 2, 2); ctx.fillRect(x + 40, y - 8, 2, 2);
    }
    /* nine drawers */
    for (let i = 0; i < 9; i++) {
      const dx = x + 4 + (i % 3) * 14, dy = y + 12 + Math.floor(i / 3) * 11;
      const egg = h.queue[i];
      const lane = i < 3 && busy;
      ctx.fillStyle = '#4a3220'; ctx.fillRect(dx, dy, 12, 8);
      ctx.fillStyle = egg ? (lane ? '#ffe9c0' : '#d8f2fa') : '#8a6a44';
      ctx.fillRect(dx + 1, dy + 1, 10, 6);
      if (egg) {
        const wob = lane ? Math.sin(now / 130 + i * 1.7) * 0.8 : 0;
        ctx.fillStyle = EGG_SHELL[egg.tier];
        ctx.fillRect(Math.round(dx + 4 + wob), dy + 2, 4, 5);
        ctx.fillStyle = SPR.darken(EGG_SHELL[egg.tier], 0.22);
        ctx.fillRect(Math.round(dx + 4 + wob), dy + 6, 4, 1);
        ctx.fillStyle = TIERS[egg.tier].c;
        ctx.fillRect(Math.round(dx + 5 + wob), dy + 4, 1, 1);
        if (lane) { ctx.fillStyle = 'rgba(255,180,70,.28)'; ctx.fillRect(dx + 1, dy + 4, 10, 3); }
      } else {
        ctx.fillStyle = '#6e5232'; ctx.fillRect(dx + 4, dy + 3, 4, 2);
      }
      /* glass glint + handle */
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(dx + 2, dy + 1, 2, 1);
      ctx.fillStyle = '#8a5e2a'; ctx.fillRect(dx + 4, dy + 7, 4, 1);
    }
    /* status column: lamp per lane plus a progress rail */
    for (let i = 0; i < 3; i++) {
      const on = busy && i < Math.min(3, h.queue.length);
      ctx.fillStyle = on ? (Math.floor(now / 260 + i) % 2 ? '#ff9f1c' : '#ffd23f') : '#6a6f78';
      ctx.fillRect(x + 43, y + 14 + i * 11, 3, 3);
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 43, y + 14 + i * 11, 1, 1);
    }
    ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 4, y + 34, 30, 5);
    ctx.fillStyle = '#1a2a20'; ctx.fillRect(x + 5, y + 35, 28, 3);
    if (busy) {
      const egg = h.queue[0];
      const need = GAME.incHatchTime(egg.tier, egg.rainbow) / Math.min(3, h.queue.length);
      const f = Math.max(0, Math.min(1, h.prog / need));
      ctx.fillStyle = '#7ac74f'; ctx.fillRect(x + 5, y + 35, Math.round(28 * f), 3);
      ctx.fillStyle = '#aef07a'; ctx.fillRect(x + 5, y + 35, Math.round(28 * f), 1);
    }
    SPR.drawTiny(ctx, h.queue.length + '/' + ECON.hatcheryCap, x + 36, y + 35, '#2e2216', 1, '#fff8ec');
  }

  /* a Y junction that flips a paddle side to side */
  function drawSplitter(c, r, sp, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.22)'; ctx.fillRect(x + 1, y + 14, 15, 2);
    ctx.fillStyle = '#3d434e'; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#7e8794'; ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.fillStyle = '#a6aeba'; ctx.fillRect(x + 1, y + 1, 14, 3);
    ctx.fillStyle = '#5a626e'; ctx.fillRect(x + 1, y + 12, 14, 3);
    /* the paddle, leaning whichever way the next egg goes */
    const lean = (sp.n % 2) ? 1 : -1;
    ctx.fillStyle = '#ffc72f';
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(x + 8 + lean * Math.round(i * 0.7) - 1, y + 4 + i, 2, 1);
    }
    ctx.fillStyle = '#e0a416'; ctx.fillRect(x + 7, y + 3, 2, 2);
    /* both output mouths */
    const L = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    [(sp.dir + 1) % 4, (sp.dir + 3) % 4].forEach((d, i) => {
      const [dx, dy] = L[d];
      ctx.fillStyle = i === (sp.n % 2) ? '#ffe27a' : '#8d949e';
      ctx.fillRect(x + 7 + dx * 6, y + 7 + dy * 6, 2, 2);
    });
  }

  /* a hopper on legs that tips belt eggs into the truck */
  function drawLoader(c, r, ld, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.24)'; ctx.fillRect(x + 2, y + 14, 28, 3);
    /* legs */
    ctx.fillStyle = '#3d434e'; ctx.fillRect(x + 3, y + 11, 3, 5); ctx.fillRect(x + 26, y + 11, 3, 5);
    /* hopper body */
    ctx.fillStyle = '#2e3238'; ctx.fillRect(x + 1, y + 1, 30, 11);
    ctx.fillStyle = '#8d949e'; ctx.fillRect(x + 2, y + 2, 28, 9);
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(x + 2, y + 2, 28, 2);
    ctx.fillStyle = '#5a626e'; ctx.fillRect(x + 2, y + 9, 28, 2);
    /* window with the buffer inside */
    ctx.fillStyle = '#23262b'; ctx.fillRect(x + 4, y + 4, 22, 5);
    for (let i = 0; i < Math.min(ld.store.length, 11); i++) {
      ctx.fillStyle = EGG_SHELL[ld.store[i].tier];
      ctx.fillRect(x + 5 + i * 2, y + 6, 2, 2);
    }
    /* chute, animated while it is tipping */
    const on = ld.store.length && S().truck.state === 'parked';
    ctx.fillStyle = on && Math.floor(now / 200) % 2 ? '#ffc72f' : '#6a7280';
    ctx.fillRect(x + 27, y + 5, 4, 6);
    ctx.fillRect(x + 29, y + 10, 2, 4);
    /* lamp */
    ctx.fillStyle = on ? (Math.floor(now / 260) % 2 ? '#7ac74f' : '#aef07a') : '#6a6f78';
    ctx.fillRect(x + 2, y + 3, 2, 2);
    SPR.drawTiny(ctx, String(ld.store.length), x + 4, y + 11, '#2e2216', 1, '#fff8ec');
  }

  function drawFence(c, r, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.22)'; ctx.fillRect(x + 1, y + 13, 14, 2);
    /* two posts and two rails */
    const post = px => {
      ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + px, y + 1, 3, 13);
      ctx.fillStyle = '#a8783f'; ctx.fillRect(x + px, y + 2, 2, 11);
      ctx.fillStyle = '#c9a35f'; ctx.fillRect(x + px, y + 3, 1, 5);
      ctx.fillStyle = '#3e2810'; ctx.fillRect(x + px, y + 1, 3, 1);
    };
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x, y + 4, 16, 3); ctx.fillRect(x, y + 9, 16, 3);
    ctx.fillStyle = '#c9a35f'; ctx.fillRect(x, y + 4, 16, 1); ctx.fillRect(x, y + 9, 16, 1);
    post(1); post(12);
  }

  function drawSorter(c, r, so, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.22)'; ctx.fillRect(x + 1, y + 14, 15, 2);
    /* housing */
    ctx.fillStyle = '#3d434e'; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#7e8794'; ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.fillStyle = '#a6aeba'; ctx.fillRect(x + 1, y + 1, 14, 3);
    ctx.fillStyle = '#5a626e'; ctx.fillRect(x + 1, y + 12, 14, 3);
    /* window showing the scanner beam */
    ctx.fillStyle = '#23262b'; ctx.fillRect(x + 3, y + 5, 10, 6);
    const beam = Math.floor(now / 90) % 8;
    ctx.fillStyle = '#3fd0ff';
    ctx.fillRect(x + 4 + beam, y + 6, 1, 4);
    ctx.fillStyle = 'rgba(63,208,255,.35)';
    ctx.fillRect(x + 4, y + 6, 8, 4);
    /* output arrows: straight = rare, side = common */
    const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][so.dir];
    const [sx, sy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][(so.dir + 1) % 4];
    ctx.fillStyle = '#ffc72f';
    ctx.fillRect(x + 7 + dx * 6, y + 7 + dy * 6, 2, 2);
    ctx.fillStyle = '#b8c0cc';
    ctx.fillRect(x + 7 + sx * 6, y + 7 + sy * 6, 2, 2);
    /* rarity threshold pips */
    const thr = so.thr === undefined ? ECON.sorterRare : so.thr;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i < thr ? TIERS[Math.min(i, TIERS.length - 1)].c : 'rgba(40,40,50,.5)';
      ctx.fillRect(x + 3 + i * 3, y + 2, 2, 1);
    }
  }

  function drawBlower(c, r, b, now) {
    const x = c * 16, y = r * 16;
    const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][b.dir];
    ctx.fillStyle = 'rgba(40,58,26,.22)'; ctx.fillRect(x + 2, y + 14, 12, 2);
    /* stand */
    ctx.fillStyle = '#3d434e'; ctx.fillRect(x + 6, y + 11, 4, 4);
    ctx.fillStyle = '#23262b'; ctx.fillRect(x + 4, y + 14, 8, 2);
    /* housing ring */
    ctx.fillStyle = '#2e3238'; ctx.fillRect(x + 2, y + 1, 12, 11);
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(x + 3, y + 2, 10, 9);
    ctx.fillStyle = '#8a9099'; ctx.fillRect(x + 3, y + 9, 10, 2);
    /* fan blades */
    const spin = Math.floor(now / 70) % 4;
    ctx.fillStyle = '#4b515c';
    if (spin % 2 === 0) { ctx.fillRect(x + 4, y + 6, 8, 2); ctx.fillRect(x + 7, y + 3, 2, 8); }
    else { ctx.fillRect(x + 5, y + 4, 6, 6); ctx.fillStyle = '#7e8794'; ctx.fillRect(x + 6, y + 5, 4, 4); }
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 7, y + 6, 2, 2);
    /* nozzle + gust puffs */
    ctx.fillStyle = '#5a626e';
    ctx.fillRect(x + 6 + dx * 7, y + 5 + dy * 7, 3 + Math.abs(dx) * 2, 3 + Math.abs(dy) * 2);
    ctx.fillStyle = 'rgba(210,240,255,.6)';
    for (let i = 0; i < 3; i++) {
      const t = (Math.floor(now / 110) + i) % 3;
      ctx.fillRect(x + 7 + dx * (10 + t * 6), y + 6 + dy * (10 + t * 6), 2, 2);
    }
  }

  function drawStaffHut(c, r, hut, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(x + 2, y + 30, 28, 3);
    /* walls */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 10, 30, 21);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#d9b98c' : '#c9a675';
      ctx.fillRect(x + 2, y + 11 + i * 4, 28, 4);
    }
    ctx.fillStyle = '#a8865e'; ctx.fillRect(x + 2, y + 27, 28, 3);
    /* thatched roof */
    for (let row = 0; row < 4; row++) {
      const wRow = 34 - row * 2;
      ctx.fillStyle = row % 2 ? '#c9924f' : '#b8843f';
      ctx.fillRect(x - 1 + row, y + 2 + row * 2, wRow, 3);
      ctx.fillStyle = '#e0bd82';
      for (let i = 0; i < wRow; i += 5) ctx.fillRect(x - 1 + row + i, y + 2 + row * 2, 2, 1);
    }
    /* door */
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 12, y + 18, 8, 13);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 13, y + 19, 6, 12);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 17, y + 25, 1, 1);
    /* window with a lamp */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 3, y + 16, 7, 6);
    ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x + 4, y + 17, 5, 4);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 6, y + 16, 1, 6);
    /* hiring board with staff count */
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 21, y + 15, 10, 9);
    ctx.fillStyle = '#e8d5a8'; ctx.fillRect(x + 22, y + 16, 8, 7);
    const n = S().staff.length, cap = GAME.staffSlots();
    SPR.drawTiny(ctx, String(n), x + 23, y + 17, '#3a2a16', 1);
    SPR.drawTiny(ctx, '/' + cap, x + 23, y + 20, '#7a5a3a', 1);
    if (S().unpaid && Math.floor(now / 400) % 2) {
      SPR.drawTiny(ctx, 'NO PAY', x + 2, y - 4, '#c43a2a', 1, '#ffffff');
    }
  }

  function drawSilo(c, r, silo, now) {
    const x = c * 16, y = r * 16;
    const fill = silo.store.length / ECON.siloCap;
    ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(x + 3, y + 30, 26, 3);
    /* concrete base */
    ctx.fillStyle = '#6e6a60'; ctx.fillRect(x + 2, y + 27, 28, 5);
    ctx.fillStyle = '#8a867a'; ctx.fillRect(x + 2, y + 27, 28, 2);
    /* body */
    ctx.fillStyle = '#3d434e'; ctx.fillRect(x + 5, y + 6, 22, 22);
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(x + 6, y + 7, 20, 20);
    ctx.fillStyle = '#e6eaf0'; ctx.fillRect(x + 6, y + 7, 6, 20);
    ctx.fillStyle = '#9aa1ab'; ctx.fillRect(x + 22, y + 7, 4, 20);
    /* corrugation */
    ctx.fillStyle = 'rgba(90,98,110,.5)';
    for (let i = 0; i < 5; i++) ctx.fillRect(x + 6, y + 10 + i * 4, 20, 1);
    /* fill gauge */
    ctx.fillStyle = '#23262b'; ctx.fillRect(x + 13, y + 9, 6, 16);
    const h = Math.round(14 * Math.min(1, fill));
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 14, y + 24 - h, 4, h);
    ctx.fillStyle = '#fff2b0'; ctx.fillRect(x + 14, y + 24 - h, 4, Math.min(1, h));
    /* dome roof */
    ctx.fillStyle = '#3d434e'; ctx.fillRect(x + 4, y + 2, 24, 4);
    ctx.fillStyle = '#aeb4bd'; ctx.fillRect(x + 6, y + 1, 20, 4);
    ctx.fillStyle = '#e6eaf0'; ctx.fillRect(x + 8, y, 10, 2);
    /* chute toward the road */
    ctx.fillStyle = '#8a9099'; ctx.fillRect(x + 27, y + 20, 5, 3);
    ctx.fillStyle = '#5a626e'; ctx.fillRect(x + 27, y + 23, 5, 1);
    /* count plate */
    SPR.drawTiny(ctx, String(silo.store.length), x + 7, y + 29, '#2e2216', 1);
  }

  function drawStaff(w, now) {
    if (w.x + 20 < cam().x || w.x > cam().x + W.view.w || w.y + 24 < cam().y || w.y > cam().y + W.view.h) return;
    const moving = w.state === 'walk';
    const spr = SPR.staffSprite(w, moving ? w.frame : 0, 1);
    const bob = moving ? 0 : Math.sin(now / 600 + w.id) * 0.5;
    ctx.fillStyle = 'rgba(40,58,26,.26)';
    ctx.fillRect(Math.round(w.x + 1), Math.round(w.y + spr.height - 2), 10, 2);
    ctx.save();
    if (w.dir === 1) {
      ctx.translate(Math.round(w.x) + spr.width, Math.round(w.y + bob));
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0);
    } else ctx.drawImage(spr, Math.round(w.x), Math.round(w.y + bob));
    ctx.restore();
    /* carried eggs stack above the head */
    for (let i = 0; i < Math.min(w.carry.length, 4); i++) {
      const e = w.carry[i];
      ctx.fillStyle = EGG_SHELL[e.tier];
      ctx.fillRect(Math.round(w.x + 3 + (i % 2) * 5), Math.round(w.y - 4 - Math.floor(i / 2) * 4), 4, 4);
      ctx.fillStyle = SPR.darken(EGG_SHELL[e.tier], 0.3);
      ctx.fillRect(Math.round(w.x + 3 + (i % 2) * 5), Math.round(w.y - 1 - Math.floor(i / 2) * 4), 4, 1);
    }
    /* match-bot carrying a chicken */
    if (w.hold) {
      const ch = SPR.chickenSprite(SPECIES[w.hold.sp], 1, false);
      ctx.drawImage(ch, Math.round(w.x - 3), Math.round(w.y - 14));
    }
    /* status marks */
    if (S().unpaid && Math.floor(now / 350) % 2) {
      SPR.drawTiny(ctx, '!', Math.round(w.x + 5), Math.round(w.y - 8), '#c43a2a', 1, '#ffffff');
    } else if (w.state === 'rest') {
      /* a little snooze bubble while they take five */
      const zz = Math.floor(now / 500) % 3;
      SPR.drawTiny(ctx, 'z', Math.round(w.x + 9 + zz), Math.round(w.y - 6 - zz * 2), '#5f7fa8', 1, '#ffffff');
    } else if (w.role === 'cull' && w.state === 'work') {
      ctx.fillStyle = '#ff6b4a';
      ctx.fillRect(Math.round(w.x + 12), Math.round(w.y + 4), 4, 1);
    }
    /* a Technician's aura shows as a faint pulsing ring of sparks */
    if (w.role === 'tech' && w.state !== 'rest') {
      const R = GAME.auraR();
      const t = now / 900;
      ctx.fillStyle = 'rgba(120,220,255,.5)';
      for (let i = 0; i < 8; i++) {
        const a2 = t + i * Math.PI / 4;
        ctx.fillRect(Math.round(w.x + 6 + Math.cos(a2) * R), Math.round(w.y + 10 + Math.sin(a2) * R * 0.55), 1, 1);
      }
    }
    /* a Keeper trails little hearts */
    if (w.role === 'keeper' && w.state === 'work' && Math.floor(now / 300) % 2) {
      ctx.fillStyle = '#ff8ab5';
      ctx.fillRect(Math.round(w.x + 11), Math.round(w.y - 3), 2, 1);
      ctx.fillRect(Math.round(w.x + 10), Math.round(w.y - 2), 4, 1);
      ctx.fillRect(Math.round(w.x + 11), Math.round(w.y - 1), 2, 1);
    }
  }

  function drawLoveNest(c, r, nest, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 3, y + 29, 26, 3);
    /* arch posts with vines */
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 2, y + 3, 3, 24); ctx.fillRect(x + 27, y + 3, 3, 24);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 2, y + 3, 1, 24); ctx.fillRect(x + 27, y + 3, 1, 24);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 2, y + 1, 28, 3);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 2, y + 1, 28, 1);
    /* vines + blossoms */
    ctx.fillStyle = '#4f9b3f';
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(x + 3 + i * 3, y + 4 + (i % 2), 2, 1);
      if (i % 3 === 0) ctx.fillRect(x + 3 + i * 3, y + 5, 1, 2);
    }
    ctx.fillStyle = '#ff8ab5';
    ctx.fillRect(x + 6, y + 5, 2, 2); ctx.fillRect(x + 15, y + 6, 2, 2); ctx.fillRect(x + 24, y + 5, 2, 2);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(x + 6, y + 5, 1, 1); ctx.fillRect(x + 15, y + 6, 1, 1);
    /* heart topper */
    ctx.fillStyle = '#e8407a';
    [[14,-2],[16,-2],[13,-1],[14,-1],[15,-1],[16,-1],[17,-1],[14,0],[15,0],[16,0],[15,1]]
      .forEach(([hx, hy]) => ctx.fillRect(x + hx, y + hy, 1, 1));
    ctx.fillStyle = '#ff9ec4'; ctx.fillRect(x + 14, y - 1, 1, 1);
    /* straw nest bowl */
    const nsp = SPR.nestSprite(1);
    ctx.drawImage(nsp, 0, 0, 20, 7, x + 3, y + 19, 26, 10);
    /* occupants */
    nest.slots.forEach((s, i) => {
      if (!s) return;
      const spr = SPR.chickenSprite(SPECIES[s.sp], 1, false);
      const bob = Math.sin(now / 220 + i * 2.2) * 1.2;
      ctx.drawImage(spr, x + 1 + i * 11, y + 7 + Math.round(bob));
    });
    if (nest.slots[0] && nest.slots[1]) {
      if (Math.random() < 0.12) heart(x + 16, y + 9, 1);
      const a = SPECIES[nest.slots[0].sp], b = SPECIES[nest.slots[1].sp];
      let need = GAME.breedTime();
      if (a.id === b.id) need *= 0.6;
      ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 5, y + 30, 22, 3);
      const f = Math.min(1, nest.prog / need);
      ctx.fillStyle = '#e8407a'; ctx.fillRect(x + 6, y + 31, Math.round(20 * f), 1);
    } else if (!nest.slots[0] && !nest.slots[1]) {
      SPR.drawTiny(ctx, 'DROP', x + 8, y + 9, 'rgba(90,62,38,.8)', 1);
      SPR.drawTiny(ctx, '2 HENS', x + 5, y + 15, 'rgba(90,62,38,.8)', 1);
    }
  }

  /* ---------- stations ---------- */
  function drawLab(now) {
    const s = W.stations.lab, x = s.x, y = s.y;
    ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(x + 1, y + 30, 30, 3);
    /* walls: vertical planks */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x, y + 8, 30, 24);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#e0cb98' : '#d6bd88';
      ctx.fillRect(x + 1 + i * 3, y + 9, 3, 22);
      ctx.fillStyle = '#bda678'; ctx.fillRect(x + 3 + i * 3, y + 9, 1, 22);
    }
    /* foundation */
    ctx.fillStyle = '#9b9b90'; ctx.fillRect(x, y + 28, 30, 4);
    ctx.fillStyle = '#8a8a80';
    for (let i = 0; i < 7; i++) ctx.fillRect(x + 1 + i * 4, y + 29, 3, 1);
    /* shingled roof */
    for (let row = 0; row < 4; row++) {
      const wRow = 34 - row * 2;
      const xr = x - 2 + row;
      ctx.fillStyle = row % 2 ? '#2f5f9e' : '#3a6eb0';
      ctx.fillRect(xr, y + 4 - row + 4, wRow, 2);
      ctx.fillStyle = '#5fa8e8';
      for (let i = 0; i < wRow; i += 4) ctx.fillRect(xr + i, y + 4 - row + 4, 2, 1);
    }
    ctx.fillStyle = '#8fd6ff'; ctx.fillRect(x - 2, y + 2, 34, 2);
    ctx.fillStyle = '#23405e'; ctx.fillRect(x - 2, y + 8, 34, 1);
    /* window with panes + glow + flask */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 4, y + 13, 13, 11);
    ctx.fillStyle = '#cfeef5'; ctx.fillRect(x + 5, y + 14, 11, 9);
    ctx.fillStyle = 'rgba(255,225,140,.5)'; ctx.fillRect(x + 5, y + 14, 11, 9);
    /* flask silhouette */
    ctx.fillStyle = '#2f7a5a'; ctx.fillRect(x + 9, y + 19, 4, 3);
    ctx.fillStyle = '#7ac74f'; ctx.fillRect(x + 9, y + 20, 4, 2);
    ctx.fillStyle = '#3a5a4a'; ctx.fillRect(x + 10, y + 17, 2, 2);
    const bub = Math.floor(now / 220) % 4;
    ctx.fillStyle = '#aef0d0'; ctx.fillRect(x + 10, y + 18 - bub, 1, 1);
    /* panes */
    ctx.fillStyle = '#3a2a16';
    ctx.fillRect(x + 10, y + 14, 1, 9); ctx.fillRect(x + 5, y + 18, 11, 1);
    /* door with handle */
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 20, y + 15, 8, 16);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 21, y + 16, 6, 15);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 21, y + 16, 6, 1);
    ctx.fillStyle = '#6e4a20'; ctx.fillRect(x + 24, y + 16, 1, 15);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 22, y + 23, 1, 1);
    /* feather emblem plaque */
    ctx.fillStyle = '#e8d5a8'; ctx.fillRect(x + 21, y + 18, 6, 4);
    ctx.drawImage(SPR.plumeSprite(1), x + 22, y + 18, 5, 5);
    /* chimney + smoke */
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 23, y - 3, 5, 7);
    ctx.fillStyle = '#9b9b90'; ctx.fillRect(x + 23, y - 4, 5, 2);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 3; i++) {
      const t = (now / 700 + i * 0.33) % 1;
      ctx.fillRect(x + 24 + Math.round(Math.sin(t * 6 + i) * 2), Math.round(y - 6 - t * 12), 2 + i, 2);
    }
    /* hanging sign */
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 6, y + 26, 10, 5);
    SPR.drawTiny(ctx, 'LAB', x + 7, y + 27, '#ffd23f', 1);
    /* crates outside */
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 30, y + 24, 7, 7);
    ctx.fillStyle = '#c9924f'; ctx.fillRect(x + 31, y + 25, 5, 5);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 31, y + 27, 5, 1);
  }

  function drawStand(now) {
    const s = W.stations.stand, x = s.x, y = s.y;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 2, y + 22, 13, 2);
    /* lectern post + base */
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 6, y + 11, 4, 11);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 6, y + 11, 2, 11);
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 3, y + 21, 10, 2);
    /* open book */
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x, y + 3, 16, 9);
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 1, y + 4, 6, 7);
    ctx.fillStyle = '#f2e8d2'; ctx.fillRect(x + 9, y + 4, 6, 7);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 7, y + 3, 2, 9);
    ctx.fillStyle = '#b5a583';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + 2, y + 5 + i * 2, 4, 1);
      ctx.fillRect(x + 10, y + 5 + i * 2, 4, 1);
    }
    /* a tiny chicken doodle on the page */
    ctx.fillStyle = '#c98f3f'; ctx.fillRect(x + 3, y + 8, 3, 2); ctx.fillRect(x + 4, y + 7, 2, 1);
    /* ribbon */
    ctx.fillStyle = '#e8407a'; ctx.fillRect(x + 12, y + 10, 1, 4);
    if (Math.floor(now / 700) % 4 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 13, y + 4, 1, 1); }
  }

  function drawMamaSign(now) {
    const s = W.stations.mamaSign, x = s.x - 5, y = s.y;
    const maxed = S().mamaTier >= TIERS.length - 2;
    const cost = GAME.mamaCost();
    const afford = !maxed && S().coins >= cost;
    ctx.drawImage(SPR.signSprite(26, 1, 0), x, y + 2);
    SPR.drawTiny(ctx, 'MAMA', x + 4, y + 4, '#4a3018', 1);
    if (maxed) SPR.drawTiny(ctx, 'MAX', x + 6, y + 10, '#4a3018', 1);
    else {
      const label = GAME.fmt(cost);
      const col = afford && Math.floor(now / 400) % 2 ? '#2e6e2e' : '#5e3d18';
      SPR.drawTiny(ctx, label, x + 8, y + 10, col, 1);
      ctx.fillStyle = afford ? '#ffd23f' : '#b5a06a';
      ctx.fillRect(x + 4, y + 10, 3, 3);
      ctx.fillStyle = '#e0a416'; ctx.fillRect(x + 5, y + 11, 1, 1);
    }
  }

  function drawSaleSigns(now) {
    PLOTS.forEach(p => {
      if (S().plots[p.id]) return;
      if (!plotNeighbors(p.id).some(n => S().plots[n])) return;
      const cx = p.tc * 16 + PLOT_W * 8, cy = p.tr * 16 + PLOT_H * 8;
      const afford = S().coins >= p.price;
      const wig = afford ? Math.sin(now / 260) * 1 : 0;
      ctx.save();
      ctx.translate(Math.round(cx), Math.round(cy + wig));
      const BW = 58;
      ctx.drawImage(SPR.signSprite(BW, 1, 1), -BW / 2, -16);
      const t1 = 'FOR SALE';
      SPR.drawText(ctx, t1, -Math.floor(SPR.textW(t1, 1) / 2), -14, '#4a3018', 1);
      const priceTxt = GAME.fmt(p.price);
      const pw = SPR.textW(priceTxt, 1) + 6;
      SPR.drawText(ctx, priceTxt, -Math.floor(pw / 2) + 6, -6, afford ? '#2e6e2e' : '#a83a2a', 1);
      ctx.fillStyle = afford ? '#ffd23f' : '#b5a06a';
      ctx.fillRect(-Math.floor(pw / 2) - 1, -5, 4, 4);
      ctx.fillStyle = '#e0a416'; ctx.fillRect(-Math.floor(pw / 2), -4, 2, 2);
      ctx.restore();
    });
  }

  function truckX(now) {
    const tr = S().truck;
    const T = GAME.tripTime();
    if (tr.state === 'parked') return W.truckHome.x;
    const gone = T - tr.t;
    if (gone < 1) return W.truckHome.x + gone * 240;
    if (tr.t < 1) return W.truckHome.x + tr.t * 240;
    return 99999;
  }
  function drawTruck(now) {
    const tr = S().truck;
    const x = Math.round(truckX(now));
    if (x > W.W + 90) return;
    const y = W.roadY - 4;
    const moving = tr.state !== 'parked';
    const bounce = moving ? Math.round(Math.sin(now / 45) * 1) : 0;
    ctx.fillStyle = 'rgba(40,58,26,.28)'; ctx.fillRect(x + 2, y + 13, 48, 3);
    /* --- cargo bed (wood planks) --- */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x, y - 13 + bounce, 34, 21);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#c9924f' : '#b8843f';
      ctx.fillRect(x + 1, y - 12 + i * 4 + bounce, 32, 4);
    }
    ctx.fillStyle = '#e0bd82'; ctx.fillRect(x + 1, y - 12 + bounce, 32, 1);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 1, y + 6 + bounce, 32, 2);
    /* bed slats */
    ctx.fillStyle = '#8a5e2a';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 9, y - 12 + bounce, 1, 20);
    /* eggs piled in the bed */
    const n = Math.min(tr.load.length, 15);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 5);
      const ex = x + 3 + (i % 5) * 6, ey = y - 2 + bounce - row * 4;
      const egg = tr.load[i];
      ctx.fillStyle = EGG_SHELL[egg.tier];
      ctx.fillRect(ex, ey, 4, 5);
      ctx.fillStyle = SPR.lighten(EGG_SHELL[egg.tier], 0.5);
      ctx.fillRect(ex, ey, 2, 2);
      ctx.fillStyle = SPR.darken(EGG_SHELL[egg.tier], 0.32);
      ctx.fillRect(ex, ey + 4, 4, 1);
      if (egg.golden) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(ex + 2, ey + 2, 1, 1); }
    }
    /* --- cab --- */
    ctx.fillStyle = '#1e3450'; ctx.fillRect(x + 34, y - 17 + bounce, 19, 25);
    ctx.fillStyle = '#2f5f9e'; ctx.fillRect(x + 35, y - 16 + bounce, 17, 23);
    ctx.fillStyle = '#5fa8e8'; ctx.fillRect(x + 35, y - 16 + bounce, 17, 3);
    /* windshield */
    ctx.fillStyle = '#1e3450'; ctx.fillRect(x + 36, y - 13 + bounce, 12, 9);
    ctx.fillStyle = '#bfe8f5'; ctx.fillRect(x + 37, y - 12 + bounce, 10, 7);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 37, y - 12 + bounce, 4, 3);
    /* mirror */
    ctx.fillStyle = '#1e3450'; ctx.fillRect(x + 52, y - 11 + bounce, 2, 3);
    /* grille + bumper + headlight */
    ctx.fillStyle = '#23262b'; ctx.fillRect(x + 48, y + 1 + bounce, 5, 5);
    ctx.fillStyle = '#8d949e';
    ctx.fillRect(x + 49, y + 2 + bounce, 3, 1); ctx.fillRect(x + 49, y + 4 + bounce, 3, 1);
    ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x + 51, y - 2 + bounce, 2, 3);
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(x + 34, y + 7 + bounce, 19, 2);
    /* wheels with hubcaps */
    [x + 5, x + 38].forEach(wx => {
      ctx.fillStyle = '#191c21'; ctx.fillRect(wx, y + 5, 10, 9);
      ctx.fillStyle = '#2e333a'; ctx.fillRect(wx + 1, y + 6, 8, 7);
      ctx.fillStyle = '#c9ced6'; ctx.fillRect(wx + 3, y + 8, 4, 3);
      ctx.fillStyle = '#8d949e'; ctx.fillRect(wx + 4, y + 9, 2, 1);
    });
    /* exhaust */
    if (moving && Math.floor(now / 120) % 2) {
      ctx.fillStyle = 'rgba(200,190,175,.6)';
      ctx.fillRect(x - 4, y + 2 + bounce, 3, 3);
      ctx.fillRect(x - 8, y - 1 + bounce, 2, 2);
    }
    /* load counter plate */
    if (!moving) {
      const label = tr.load.length + '/' + GAME.truckCap();
      const w = SPR.tinyW(label, 1) + 6;
      const px0 = x + 34, py0 = y - 26;
      ctx.fillStyle = '#3a2a16'; ctx.fillRect(px0, py0, w, 9);
      ctx.fillStyle = '#e8d5a8'; ctx.fillRect(px0 + 1, py0 + 1, w - 2, 7);
      ctx.fillStyle = '#c9b48a'; ctx.fillRect(px0 + 1, py0 + 6, w - 2, 2);
      SPR.drawTiny(ctx, label, px0 + 3, py0 + 2, '#3a2a16', 1);
      const full = tr.load.length >= GAME.truckCap();
      if (tr.load.length > 0 && Math.floor(now / 460) % 2) {
        const msg = full ? 'FULL - TAP' : 'TAP TO SEND';
        SPR.drawText(ctx, msg, x + 1, y - 40, full ? '#c43a2a' : '#2e6e2e', 1, '#ffffff');
      }
    }
  }

  function drawChicken(ch, now) {
    if (ch.x + 24 < cam().x || ch.x > cam().x + W.view.w || ch.y + 24 < cam().y || ch.y > cam().y + W.view.h) return;
    const sp = SPECIES[ch.sp];
    const spr = SPR.chickenSprite(sp, 1, false);
    const walking = ch.state === 'walk' || ch.state === 'seek';
    const bob = walking ? Math.abs(Math.sin(now / 110 + ch.id)) * 1.6
              : ch.state === 'peck' ? Math.abs(Math.sin(now / 200)) * 1.2 : Math.sin(now / 500 + ch.id) * 0.6;
    let hop = 0;
    const pf = petFx.get(ch.id);
    if (pf && now - pf < 350) hop = Math.sin((now - pf) / 350 * Math.PI) * 4;
    const bf = bornFx.get(ch.id);
    let grow = 1;
    if (bf !== undefined) {
      const bp = (now - bf) / 700;
      if (bp >= 1) bornFx.delete(ch.id);
      else { grow = 0.45 + 0.55 * bp; hop += Math.sin(bp * Math.PI) * 3; }
    }
    const yy = Math.round(ch.y - bob - hop);
    /* soft shadow that shrinks as it hops */
    const sw = 12 - Math.round(hop * 0.6);
    ctx.fillStyle = 'rgba(40,58,26,.26)';
    ctx.fillRect(Math.round(ch.x + 4 + (12 - sw) / 2), Math.round(ch.y + 17), sw, 2);
    ctx.save();
    if (grow !== 1) {
      ctx.translate(Math.round(ch.x) + spr.width / 2, yy + spr.height);
      ctx.scale(ch.dir === 1 ? -grow : grow, grow);
      ctx.drawImage(spr, -spr.width / 2, -spr.height);
    } else if (ch.dir === 1) {
      ctx.translate(Math.round(ch.x) + spr.width, yy);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0);
    } else ctx.drawImage(spr, Math.round(ch.x), yy);
    ctx.restore();
    /* marked for the cull-bot */
    if (ch.marked) {
      const blink = Math.floor(now / 380) % 2;
      ctx.fillStyle = blink ? '#e8542f' : '#a8321c';
      ctx.fillRect(Math.round(ch.x + 7), Math.round(yy - 6), 6, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(ch.x + 9), Math.round(yy - 5), 2, 2);
      ctx.fillRect(Math.round(ch.x + 9), Math.round(yy - 2), 2, 1);
    }
    /* feed buff sparkle */
    if (ch.buffT > 0 && Math.floor(now / 250) % 2) {
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(Math.round(ch.x + 16), Math.round(yy - 2), 2, 2);
      ctx.fillStyle = '#fff6c0';
      ctx.fillRect(Math.round(ch.x + 16), Math.round(yy - 2), 1, 1);
    }
    if (sp.tier >= 6 && Math.random() < 0.07) {
      ctx.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#ffd23f';
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
    ctx.fillStyle = 'rgba(40,58,26,.24)';
    ctx.fillRect(m.x - 13, m.y + 12, 28, 3);
    ctx.save();
    ctx.translate(m.x + 1, m.y + 14);
    ctx.scale(1 + squish * 0.12, 1 - squish * 0.12);
    ctx.drawImage(mama, -15, -26 + Math.round(bob));
    ctx.restore();
    ctx.drawImage(nest, m.x - 10, m.y + 6);
    if (S().mama.petCd <= 0 && Math.floor(now / 400) % 2) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(m.x + 13, m.y - 22, 1, 1);
      ctx.fillRect(m.x + 12, m.y - 21, 1, 1);
      ctx.fillRect(m.x + 14, m.y - 21, 1, 1);
      ctx.fillRect(m.x + 13, m.y - 20, 1, 1);
    }
  }

  /* the floating hand + whatever it holds */
  function drawHand(now) {
    if (!ptr.inside) return;
    const x = ptr.x, y = ptr.y;
    const held = S().held;
    const tool = S().tool;
    ctx.fillStyle = 'rgba(40,58,26,.18)';
    ctx.fillRect(Math.round(x - 4), Math.round(y + 3), 9, 2);
    if (held) {
      if (held.kind === 'chicken') {
        const spr = SPR.chickenSprite(SPECIES[held.ch.sp], 1, false);
        const sway = Math.sin(now / 180) * 2;
        ctx.save();
        ctx.translate(Math.round(x + sway), Math.round(y + 6));
        ctx.rotate(sway * 0.02);
        ctx.drawImage(spr, -10, -8);
        ctx.restore();
        /* motion squiggles */
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.fillRect(Math.round(x - 12 - sway), Math.round(y + 2), 2, 1);
        ctx.fillRect(Math.round(x + 10 - sway), Math.round(y + 4), 2, 1);
      } else {
        const e = held.egg;
        const spr = e.rainbow ? SPR.eggSprite(e.tier, 1, true, Math.floor(now / 120) % 6) : SPR.eggSprite(e.tier, 1);
        ctx.drawImage(spr, Math.round(x - 5), Math.round(y - 1));
      }
    }
    if (tool === 'basket') {
      const b = SPR.basketSprite(Math.min(S().basket.length, 5), 1);
      ctx.drawImage(b, Math.round(x - 7), Math.round(y - 3 + (ptr.down ? 2 : 0)));
    } else if (tool === 'feed') {
      ctx.drawImage(SPR.feedbagSprite(1), Math.round(x - 6), Math.round(y - 4));
    } else if (tool === 'inspect') {
      const g = SPR.iconSprite('magnify', 1);
      ctx.drawImage(g, Math.round(x - 4), Math.round(y - 4));
    } else if (tool === 'build') {
      const h = SPR.hammerSprite(1);
      ctx.save();
      ctx.translate(Math.round(x + 2), Math.round(y - 2));
      ctx.rotate(ptr.down ? 0.6 : 0.2);
      ctx.drawImage(h, -6, -8);
      ctx.restore();
    }
    const hand = SPR.uiSprite(ptr.down || held ? 'handGrab' : 'handPoint', 1);
    const hy = (ptr.down ? y - hand.height + 4 : y - hand.height + 2) - (held ? 6 : 0);
    ctx.drawImage(hand, Math.round(x - 6), Math.round(hy));
  }

  function drawGhost(now) {
    if (S().tool !== 'build' || !buildSel || !ptr.inside) return;
    const c = Math.floor(ptr.x / 16), r = Math.floor(ptr.y / 16);
    if (buildSel === 'remove') {
      const o = GAME.occAt(c, r);
      ctx.fillStyle = o ? 'rgba(232,84,47,.42)' : 'rgba(0,0,0,.14)';
      ctx.fillRect(c * 16, r * 16, 16, 16);
      if (o) { ctx.fillStyle = '#ffffff'; ctx.fillRect(c * 16 + 3, r * 16 + 7, 10, 2); }
      return;
    }
    const b = BUILDS[buildSel];
    const ok = GAME.canPlace(buildSel, c, r) && S().coins >= buildCost(buildSel, S().built[buildSel]);
    ctx.globalAlpha = 0.55;
    if (buildSel === 'belt') drawBelt(c, r, placeDir, now);
    else if (buildSel === 'vacuum') drawVacuum(c, r, { dir: placeDir, hold: [] }, now);
    else if (buildSel === 'blower') drawBlower(c, r, { dir: placeDir }, now);
    else if (buildSel === 'sorter') drawSorter(c, r, { dir: placeDir, thr: ECON.sorterRare }, now);
    else if (buildSel === 'fence') drawFence(c, r, now);
    else if (buildSel === 'lovenest') drawLoveNest(c, r, { slots: [null, null], prog: 0 }, now);
    else if (buildSel === 'staffhut') drawStaffHut(c, r, {}, now);
    else if (buildSel === 'silo') drawSilo(c, r, { store: [] }, now);
    else if (buildSel === 'splitter') drawSplitter(c, r, { dir: placeDir, n: 0 }, now);
    else if (buildSel === 'loader') drawLoader(c, r, { store: [] }, now);
    else if (buildSel === 'hatchery') drawHatchery(c, r, { queue: [], prog: 0 }, now);
    else drawIncubator(c, r, { queue: [], prog: 0 }, now);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ok ? 'rgba(122,199,79,.28)' : 'rgba(232,84,47,.34)';
    ctx.fillRect(c * 16, r * 16, b.w * 16, b.h * 16);
    /* corner brackets */
    ctx.fillStyle = ok ? '#7ac74f' : '#e8542f';
    const gw = b.w * 16, gh = b.h * 16, gx = c * 16, gy = r * 16;
    [[0, 0, 1, 1], [gw - 4, 0, 1, 1], [0, gh - 4, 1, 1], [gw - 4, gh - 4, 1, 1]].forEach(([ox, oy]) => {
      ctx.fillRect(gx + ox, gy + oy, 4, 1); ctx.fillRect(gx + ox, gy + oy, 1, 4);
    });
    if (buildSel === 'vacuum') {
      ctx.strokeStyle = 'rgba(63,208,255,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c * 16 + 8, r * 16 + 8, GAME.vacR(), 0, Math.PI * 2); ctx.stroke();
    }
    if (buildSel === 'blower') {
      const [bdx, bdy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][placeDir];
      ctx.fillStyle = 'rgba(180,230,255,.35)';
      for (let d = 10; d < ECON.blowerR; d += 4)
        ctx.fillRect(c * 16 + 7 + bdx * d, r * 16 + 7 + bdy * d, 3, 3);
    }
  }

  /* ================= MAIN RENDER ================= */
  function render(now, dt) {
    if (GAME.dirty.ground || !groundCv) buildGround();
    ctx.setTransform(SC, 0, 0, SC, Math.round(-cam().x * SC), Math.round(-cam().y * SC));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(groundCv, 0, 0);

    /* pond ripples */
    const p = W.pond;
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    for (let i = 0; i < 4; i++) {
      const sx = p.x + 6 + ((i * 15 + Math.floor(now / 420)) % (p.w - 14));
      ctx.fillRect(sx, p.y + 5 + i * 6, 4, 1);
    }
    /* a couple of lily pads drifting on the surface */
    for (let i = 0; i < 2; i++) {
      const phase = (now / (13000 + i * 4200)) % 1;
      const dx = p.x + 10 + (phase < 0.5 ? phase * 2 : (1 - phase) * 2) * (p.w - 26);
      const dy = p.y + 8 + i * 12 + Math.sin(now / 1400 + i) * 1;
      ctx.fillStyle = '#3f8a33';
      ctx.fillRect(Math.round(dx), Math.round(dy) + 1, 7, 3);
      ctx.fillRect(Math.round(dx) + 1, Math.round(dy), 5, 5);
      ctx.fillStyle = '#5aa845';
      ctx.fillRect(Math.round(dx) + 2, Math.round(dy) + 1, 3, 2);
      if (i === 0) {
        ctx.fillStyle = '#fff2c4'; ctx.fillRect(Math.round(dx) + 3, Math.round(dy) + 1, 2, 2);
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(Math.round(dx) + 3, Math.round(dy) + 1, 1, 1);
      }
    }
    /* sun glints */
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let i = 0; i < 3; i++) {
      if (Math.floor(now / 300 + i * 2) % 4) continue;
      ctx.fillRect(p.x + 12 + i * 17, p.y + 10 + (i % 2) * 9, 2, 1);
    }

    drawLab(now); drawStand(now); drawMamaSign(now);

    for (const k of Object.keys(S().belts)) { const [c, r] = k.split(',').map(Number); drawBelt(c, r, S().belts[k].dir, now); }
    for (const k of Object.keys(S().sorters)) { const [c, r] = k.split(',').map(Number); drawSorter(c, r, S().sorters[k], now); }
    for (const k of Object.keys(S().fences)) { const [c, r] = k.split(',').map(Number); drawFence(c, r, now); }
    for (const k of Object.keys(S().vacs)) { const [c, r] = k.split(',').map(Number); drawVacuum(c, r, S().vacs[k], now); }
    for (const k of Object.keys(S().blowers)) { const [c, r] = k.split(',').map(Number); drawBlower(c, r, S().blowers[k], now); }
    for (const k of Object.keys(S().incs)) { const [c, r] = k.split(',').map(Number); drawIncubator(c, r, S().incs[k], now); }
    for (const k of Object.keys(S().nests)) { const [c, r] = k.split(',').map(Number); drawLoveNest(c, r, S().nests[k], now); }
    for (const k of Object.keys(S().huts)) { const [c, r] = k.split(',').map(Number); drawStaffHut(c, r, S().huts[k], now); }
    for (const k of Object.keys(S().silos)) { const [c, r] = k.split(',').map(Number); drawSilo(c, r, S().silos[k], now); }
    for (const k of Object.keys(S().splitters)) { const [c, r] = k.split(',').map(Number); drawSplitter(c, r, S().splitters[k], now); }
    for (const k of Object.keys(S().loaders)) { const [c, r] = k.split(',').map(Number); drawLoader(c, r, S().loaders[k], now); }
    for (const k of Object.keys(S().hatchers)) { const [c, r] = k.split(',').map(Number); drawHatchery(c, r, S().hatchers[k], now); }

    S().items.forEach(it => {
      const spr = it.rainbow ? SPR.eggSprite(it.tier, 1, true, Math.floor(now / 120) % 6) : SPR.eggSprite(it.tier, 1);
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.fillRect(Math.round(it.x - 3), Math.round(it.y + 1), 6, 1);
      ctx.drawImage(spr, Math.round(it.x - 5), Math.round(it.y - 9));
    });
    /* feed piles */
    S().feed.forEach(f => {
      ctx.fillStyle = '#e0a416';
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
      ctx.fillRect(Math.round(f.x - 3), Math.round(f.y + 2), 2, 2);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
      ctx.fillRect(Math.round(f.x + 3), Math.round(f.y + 1), 2, 2);
    });
    S().eggs.forEach(e => drawEgg(e, now));
    S().plumes.forEach(pl => drawPlume(pl, now));
    drawMama(now);
    S().chickens.forEach(ch => drawChicken(ch, now));
    S().staff.forEach(w => drawStaff(w, now));
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
      ctx.fillStyle = SPR.darken(f.col, 0.3);
      ctx.fillRect(Math.round(f.x - 1 - flap), Math.round(f.y + 1), 1, 1);
      ctx.fillStyle = '#3a2a16'; ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 2);
    });

    drawHatchFx(dt, now);
    drawParts(dt);

    /* drifting cloud shadows (dithered, very soft) */
    ctx.fillStyle = 'rgba(30,50,20,.10)';
    clouds.forEach(cl => {
      cl.x += cl.v * dt;
      if (cl.x > W.W + 90) cl.x = -110;
      for (let y = 0; y < 26; y++) {
        const half = Math.round((cl.w / 2) * Math.sqrt(Math.max(0, 1 - ((y - 13) / 13) ** 2)));
        for (let x = -half; x < half; x += 2) {
          ctx.fillRect(Math.round(cl.x + x + (y % 2)), Math.round(cl.y + y), 1, 1);
        }
      }
    });

    /* scoop ring */
    if (ptr.down && S().tool === 'basket' && ptr.inside) {
      const R = GAME.scoopR();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let a = 0; a < Math.PI * 2; a += 0.22) {
        if (Math.floor(a * 4 + now / 200) % 2) continue;
        ctx.fillRect(Math.round(ptr.x + Math.cos(a) * R), Math.round(ptr.y + Math.sin(a) * R * 0.85), 1, 1);
      }
    }
    /* drop-target highlights */
    if (S().held || (S().tool === 'basket' && S().basket.length && ptr.down)) {
      const th = W.truckHome;
      if (S().truck.state === 'parked') {
        ctx.fillStyle = Math.floor(now / 250) % 2 ? '#ffd23f' : '#e0a416';
        for (let x = th.x - 2; x < th.x + th.w + 4; x += 4) {
          ctx.fillRect(x, th.y - 14, 2, 1); ctx.fillRect(x, th.y + th.h - 4, 2, 1);
        }
      }
      const o = GAME.occAt(Math.floor(ptr.x / 16), Math.floor(ptr.y / 16));
      if (o && (o.type === 'incubator' || o.type === 'lovenest')) {
        const [ic, ir] = o.k.split(',').map(Number);
        ctx.fillStyle = '#7ac74f';
        for (let x = 0; x < 34; x += 4) { ctx.fillRect(ic * 16 - 1 + x, ir * 16 - 2, 2, 1); ctx.fillRect(ic * 16 - 1 + x, ir * 16 + 33, 2, 1); }
        for (let y = 0; y < 34; y += 4) { ctx.fillRect(ic * 16 - 2, ir * 16 - 1 + y, 1, 2); ctx.fillRect(ic * 16 + 33, ir * 16 - 1 + y, 1, 2); }
      }
    }
    drawGhost(now);
    drawHand(now);

    /* vignette */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.56, cv.width / 2, cv.height / 2, cv.height * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(48,36,18,.20)');
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
        else if (r === 'full' && Math.random() < 0.05) floatWorld('BASKET FULL', ptr.x, ptr.y - 14, 'pink');
        continue;
      }
      if (d < R && S().basket.length < GAME.basketCap()) {
        const pull = (1 - d / R) * 320 * dt / d;
        e.x += dx * pull; e.y += dy * pull;
      }
    }
    for (let i = S().plumes.length - 1; i >= 0; i--) {
      const pl = S().plumes[i];
      if (Math.hypot(ptr.x - pl.x, ptr.y - pl.y) < R * 0.8) {
        const v = GAME.collectPlume(pl);
        if (v) { snd.plume(); floatWorld('+' + v, pl.x, pl.y - 8, 'green', 'feather'); }
      }
    }
  }

  /* ================= HUD ================= */
  const el = {
    coins: $('#r-coins'), feathers: $('#r-feathers'),
    cap: $('#r-cap'), capPill: $('#pill-cap'),
    cursorChip: $('#cursor-chip'), bubble: $('#bubble'),
    toolbelt: $('#toolbelt'), palette: $('#build-palette'),
  };
  /* prepend pixel icons to the resource pills once */
  (function seedPills() {
    const cp = $('#pill-coins'), fp = $('#pill-feathers'), hp = $('#pill-cap');
    cp.insertBefore(mkIcon('coin', 2), cp.firstChild);
    fp.insertBefore(mkIcon('feather', 2), fp.firstChild);
    hp.insertBefore(mkIcon('chick', 2), hp.firstChild);
  })();

  function updateCursorChip() {
    if (S().tool !== 'basket') { el.cursorChip.hidden = true; return; }
    el.cursorChip.hidden = false;
    el.cursorChip.textContent = S().basket.length + '/' + GAME.basketCap();
  }
  document.addEventListener('pointermove', ev => {
    el.cursorChip.style.left = (ev.clientX + 18) + 'px';
    el.cursorChip.style.top = (ev.clientY + 12) + 'px';
  });

  const TOOL_ICON = { hand: 'hand', basket: 'basket', feed: 'seed', build: 'hammer', inspect: 'magnify' };
  function renderToolbelt() {
    el.toolbelt.innerHTML = '';
    ['hand', 'basket', 'feed', 'build', 'inspect'].forEach(id => {
      if (id === 'feed' && !GAME.lvl('feed')) return;
      const b = document.createElement('button');
      b.className = 'tool-btn' + (S().tool === id ? ' active' : '');
      b.dataset.tool = id;
      b.title = {
        hand: 'Hand - pet, carry chickens and eggs, drag to pan',
        basket: 'Basket - sweep up eggs and feathers',
        feed: 'Feed - sprinkle seed, hens lay twice as fast',
        build: 'Build - place machines',
        inspect: 'Inspect - tap anything for its stats',
      }[id];
      b.appendChild(mkIcon(TOOL_ICON[id], 3));
      el.toolbelt.appendChild(b);
    });
    if (GAME.lvl('hiring')) {
      const crew = document.createElement('button');
      crew.className = 'tool-btn tool-crew';
      crew.dataset.act = 'crew';
      crew.title = 'The crew - flyers, applicants and who is on the payroll';
      crew.appendChild(mkIcon('hands', 3));
      const badge = document.createElement('i');
      badge.className = 'tb-badge';
      badge.hidden = true;
      crew.appendChild(badge);
      el.toolbelt.appendChild(crew);
      crewBadge = badge;
    } else crewBadge = null;
    const menu = document.createElement('button');
    menu.className = 'tool-btn tool-menu';
    menu.dataset.act = 'menu';
    menu.title = 'Settings';
    menu.appendChild(mkIcon('gear', 2));
    el.toolbelt.appendChild(menu);
  }
  let crewBadge = null;
  function updateCrewBadge() {
    if (!crewBadge) return;
    const st = S();
    const n = st.applicants.length;
    const show = n > 0 || st.unpaid;
    if (crewBadge.hidden === show) crewBadge.hidden = !show;
    const label = st.unpaid ? '!' : String(n);
    if (crewBadge.textContent !== label) crewBadge.textContent = label;
    crewBadge.classList.toggle('warn', st.unpaid);
  }

  /* miniature building render for the palette buttons: reuse the world painters
     by pointing `ctx` at an offscreen canvas for the duration of the call */
  function buildingThumb(type) {
    const small = ['belt', 'vacuum', 'blower', 'sorter', 'fence', 'splitter'].includes(type);
    const big = type === 'hatchery';
    const wpx = small ? 16 : big ? 50 : 34, hpx = small ? 16 : big ? 50 : 36;
    const k = small ? 2 : 1;
    const c = document.createElement('canvas');
    c.width = wpx * k; c.height = hpx * k;
    c.className = 'px-icon';
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.setTransform(k, 0, 0, k, 0, small ? 0 : 3);
    const saved = ctx;
    ctx = g;
    try {
      const now = performance.now();
      if (type === 'belt') drawBelt(0, 0, placeDir, now);
      else if (type === 'vacuum') drawVacuum(0, 0, { dir: placeDir, hold: [] }, now);
      else if (type === 'blower') drawBlower(0, 0, { dir: placeDir }, now);
      else if (type === 'sorter') drawSorter(0, 0, { dir: placeDir, thr: ECON.sorterRare }, now);
      else if (type === 'fence') drawFence(0, 0, now);
      else if (type === 'lovenest') drawLoveNest(0, 0, { slots: [null, null], prog: 0 }, now);
      else if (type === 'staffhut') drawStaffHut(0, 0, {}, now);
      else if (type === 'silo') drawSilo(0, 0, { store: [] }, now);
      else if (type === 'splitter') drawSplitter(0, 0, { dir: placeDir, n: 0 }, now);
      else if (type === 'loader') drawLoader(0, 0, { store: [] }, now);
      else if (type === 'hatchery') drawHatchery(0, 0, { queue: [], prog: 0 }, now);
      else drawIncubator(0, 0, { queue: [], prog: 0 }, now);
    } finally {
      ctx = saved;
    }
    return c;
  }

  function renderPalette() {
    if (S().tool !== 'build') { el.palette.hidden = true; return; }
    el.palette.hidden = false;
    el.palette.innerHTML = '';
    ['incubator', 'hatchery', 'lovenest', 'staffhut', 'silo', 'loader', 'vacuum', 'blower', 'sorter', 'splitter', 'belt', 'fence'].forEach(type => {
      const b = BUILDS[type];
      const locked = b.needs && !GAME.lvl(b.needs);
      const cost = buildCost(type, S().built[type]);
      const btn = document.createElement('button');
      btn.className = 'pal-btn' + (buildSel === type ? ' active' : '');
      btn.dataset.build = type;
      btn.disabled = locked;
      btn.appendChild(buildingThumb(type));
      const tag = document.createElement('small');
      if (locked) tag.textContent = 'LOCKED';
      else {
        tag.appendChild(mkIcon('coin', 1));
        tag.appendChild(document.createTextNode(GAME.fmt(cost)));
      }
      btn.appendChild(tag);
      btn.title = b.name + ' - ' + b.desc + (locked ? ' (research first)' : '');
      el.palette.appendChild(btn);
    });
    const rot = document.createElement('button');
    rot.className = 'pal-btn small';
    rot.dataset.build = 'rotate';
    rot.appendChild(mkIcon('arrow', 2));
    const rtag = document.createElement('small');
    rtag.textContent = ['EAST', 'SOUTH', 'WEST', 'NORTH'][placeDir];
    rot.appendChild(rtag);
    rot.title = 'Rotate (R)';
    el.palette.appendChild(rot);
    const rem = document.createElement('button');
    rem.className = 'pal-btn small' + (buildSel === 'remove' ? ' active' : '');
    rem.dataset.build = 'remove';
    rem.appendChild(mkIcon('remove', 2));
    const dtag = document.createElement('small');
    dtag.textContent = 'REMOVE';
    rem.appendChild(dtag);
    el.palette.appendChild(rem);
    GAME.dirty.build = false;
  }

  /* ---------- speech-bubble hints ---------- */
  let bubbleText = '';
  function hintLogic() {
    const st = S(), stats = st.stats;
    const incK = Object.keys(st.incs)[0];
    const incPos = incK ? incK.split(',').map(Number) : null;
    let anchor = null, text = null;
    if (stats.pets === 0) { anchor = [W.mama.x, W.mama.y - 30]; text = 'pet me!'; }
    else if (stats.collected === 0 && st.eggs.length > 1) { anchor = [W.mama.x + 34, W.mama.y - 6]; text = 'take the basket tool and sweep up eggs'; }
    else if (stats.hatched === 0 && (st.basket.length > 0 || st.held)) { anchor = incPos ? [incPos[0] * 16 + 16, incPos[1] * 16 - 8] : null; text = 'drop eggs in the incubator to hatch them'; }
    else if (stats.sold === 0 && (st.basket.length > 2 || st.truck.load.length)) { anchor = [W.truckHome.x + 26, W.truckHome.y - 24]; text = st.truck.load.length ? 'tap the truck to sell' : 'drop eggs on the truck'; }
    else if (st.truck.state === 'parked' && st.truck.load.length >= GAME.truckCap() && !GAME.lvl('autosend')) { anchor = [W.truckHome.x + 26, W.truckHome.y - 24]; text = 'truck is full - tap to send it'; }
    else if (st.feathers >= 4 && Object.keys(st.sk).length <= 1) { anchor = [W.stations.lab.x + 15, W.stations.lab.y - 10]; text = 'spend feathers in the lab'; }
    else if (st.unpaid) { anchor = null; text = 'payroll is empty - your staff have stopped working'; }
    else if (GAME.lvl('court') && st.built.lovenest === 0 && stats.bred === 0) { anchor = null; text = 'build a love nest to breed chickens'; }
    else if (GAME.lvl('hiring') && !Object.keys(st.huts).length) { anchor = null; text = 'build a staff hut, then tap it to hire crew'; }
    else if (st.chickens.length > 6 && !st.inspected) { anchor = null; text = 'use the magnifier tool to inspect any hen, worker or machine'; }
    else if (st.mamaTier < TIERS.length - 2 && st.coins >= GAME.mamaCost() * 1.2) { anchor = [W.stations.mamaSign.x + 7, W.stations.mamaSign.y - 8]; text = 'upgrade mama at her sign'; }
    if (!text || !titleEl.hidden) { el.bubble.hidden = true; bubbleText = ''; return; }
    if (text !== bubbleText) { bubbleText = text; el.bubble.textContent = text; }
    el.bubble.hidden = false;
    const r = cv.getBoundingClientRect();
    const bw = el.bubble.offsetWidth || 140;
    if (anchor) {
      const sp = worldToScreen(anchor[0], anchor[1]);
      el.bubble.style.left = Math.max(r.left + 6, Math.min(sp.x - bw / 2, r.right - bw - 6)) + 'px';
      el.bubble.style.top = Math.max(r.top + 6, sp.y - 36) + 'px';
    } else {
      el.bubble.style.left = (r.left + r.width / 2 - bw / 2) + 'px';
      el.bubble.style.top = (r.top + 12) + 'px';
    }
  }

  function lightUpdate() {
    const set = (node, v) => { if (node.textContent !== v) node.textContent = v; };
    set(el.coins, GAME.fmt(S().coins));
    set(el.feathers, GAME.fmt(S().feathers));
    const n = S().chickens.length, capn = GAME.chickenCap();
    set(el.cap, n + '/' + capn);
    const full = n >= capn;
    if (el.capPill.classList.contains('full') !== full) el.capPill.classList.toggle('full', full);
    updateCursorChip();
    updateCrewBadge();
    hintLogic();
    refreshInspect();
    if (!$('#modal-hire').hidden) {
      const sig = S().staff.length + '|' + S().coins.toFixed(0) + '|' + S().autoMark + '|' + GAME.staffSlots();
      if (sig !== hireSig) { hireSig = sig; renderHire(); }
    }
    if (GAME.dirty.build) { renderPalette(); renderToolbelt(); }
  }

  /* ================= TITLE SCREEN ================= */
  const titleEl = $('#title-screen');
  const titleCv = $('#title-canvas');
  const tctx = titleCv.getContext('2d');
  const TW = 384, TH = 208;
  let titleT = 0;
  const titleEggs = Array.from({ length: 20 }, () => ({
    x: 16 + Math.random() * (TW - 32), y: 52 + Math.random() * (TH + 40),
    tier: Math.floor(Math.random() * 8), sp: 8 + Math.random() * 14, sw: Math.random() * 6,
  }));
  const titleClouds = [0, 1, 2, 3].map(i => ({ x: Math.random() * TW, y: 58 + i * 13, w: 34 + i * 12, v: 4 + i * 2 }));
  const silCache = new Map();

  function drawTitleScreen(dt) {
    titleT += dt;
    const now = titleT * 1000;
    tctx.imageSmoothingEnabled = false;
    /* dusk sky: a long ramp with dithered seams so it reads as pixel gradient */
    const bands = ['#16203c', '#1d2b4a', '#26375c', '#2f4470', '#3b5686', '#4a6a9c',
                   '#5d7fae', '#7d9ac4', '#9fa8bd', '#bda6a6', '#d8ab94', '#eebd8c'];
    const per = (TH * 0.66) / bands.length;
    for (let y = 0; y < TH; y++) {
      const f = y / per;
      const i = Math.min(bands.length - 1, Math.floor(f));
      tctx.fillStyle = bands[i];
      tctx.fillRect(0, y, TW, 1);
      const frac = f - i;
      if (i < bands.length - 1 && frac > 0.62) {
        tctx.fillStyle = bands[i + 1];
        for (let x = (y % 2); x < TW; x += 2) tctx.fillRect(x, y, 1, 1);
      }
    }
    /* stars */
    for (let i = 0; i < 52; i++) {
      const sx = (i * 97) % TW, sy = (i * 43) % 78;
      if (Math.floor(now / 500 + i) % 7 === 0) continue;
      tctx.fillStyle = i % 3 ? 'rgba(255,255,255,.75)' : 'rgba(255,240,200,.9)';
      tctx.fillRect(sx, sy, 1, 1);
    }
    /* moon, kept out of the logo's way */
    tctx.fillStyle = '#fff3d0';
    tctx.fillRect(330, 88, 16, 16); tctx.fillRect(328, 92, 20, 8); tctx.fillRect(334, 86, 8, 20);
    tctx.fillStyle = '#e8dcb8';
    tctx.fillRect(339, 94, 4, 4); tctx.fillRect(333, 99, 3, 3); tctx.fillRect(342, 101, 2, 2);
    /* clouds */
    titleClouds.forEach(c => {
      c.x += c.v * dt;
      if (c.x > TW + 50) c.x = -60;
      tctx.fillStyle = 'rgba(255,235,220,.26)';
      tctx.fillRect(Math.round(c.x), c.y, c.w, 5);
      tctx.fillRect(Math.round(c.x) + 6, c.y - 3, c.w - 16, 4);
      tctx.fillStyle = 'rgba(255,255,245,.18)';
      tctx.fillRect(Math.round(c.x) + 10, c.y - 5, c.w - 26, 2);
    });
    /* eggs drifting up, fading out before they reach the logo */
    titleEggs.forEach(e => {
      e.y -= e.sp * dt;
      e.sw += dt * 2;
      if (e.y < 44) { e.y = TH + 10; e.x = 16 + Math.random() * (TW - 32); e.tier = Math.floor(Math.random() * 8); }
      tctx.globalAlpha = Math.max(0, Math.min(0.92, (e.y - 48) / 26));
      tctx.drawImage(SPR.eggSprite(e.tier, 1), Math.round(e.x + Math.sin(e.sw) * 3), Math.round(e.y));
      tctx.globalAlpha = 1;
    });
    /* a chicken gliding past, wings out */
    const dx = ((now / 26) % (TW + 90)) - 50;
    const dyy = 64 + Math.sin(now / 700) * 8;
    const flier = SPR.chickenSprite(SPECIES[6], 1, false);
    tctx.save();
    tctx.translate(Math.round(dx) + flier.width, Math.round(dyy));
    tctx.scale(-1, 1);
    tctx.drawImage(flier, 0, 0);
    tctx.restore();
    tctx.fillStyle = 'rgba(255,255,255,.55)';
    const wing = Math.floor(now / 180) % 2;
    tctx.fillRect(Math.round(dx) + 2, Math.round(dyy) + (wing ? 3 : 7), 5, 1);
    tctx.fillRect(Math.round(dx) + 12, Math.round(dyy) + (wing ? 7 : 3), 5, 1);
    /* hills, back to front, each with a lit rim */
    const layers = [
      { col: '#40614a', rim: '#557a58', base: 58, a: 11, b: 5, ph: 0.6, sc: 44, sc2: 15 },
      { col: '#37573f', rim: '#4d7150', base: 44, a: 9, b: 4, ph: 1.9, sc: 33, sc2: 12 },
      { col: '#2b4a34', rim: '#3f6644', base: 26, a: 7, b: 3, ph: 3.4, sc: 27, sc2: 9 },
    ];
    layers.forEach(L => {
      for (let x = 0; x < TW; x++) {
        const h = Math.round(L.base + Math.sin(x / L.sc + L.ph) * L.a + Math.sin(x / L.sc2 + L.ph * 2) * L.b);
        tctx.fillStyle = L.col;
        tctx.fillRect(x, TH - h, 1, h);
        tctx.fillStyle = L.rim;
        tctx.fillRect(x, TH - h, 1, 2);
        if ((x * 7 + h * 3) % 23 === 0) tctx.fillRect(x, TH - h + 3 + (x % 4), 1, 1);
      }
    });
    /* silhouette trees (tinted on an offscreen copy so only the tree darkens) */
    [22, 66, 300, 352].forEach((tx, i) => {
      const spr = SPR.decoSprite(i % 2 ? 'pine' : 'tree', 1, 400 + i);
      const key = 'sil' + i;
      let sil = silCache.get(key);
      if (!sil) {
        sil = SPR.newCanvas(spr.width, spr.height);
        const g = sil.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(spr, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(20,34,24,.62)';
        g.fillRect(0, 0, spr.width, spr.height);
        silCache.set(key, sil);
      }
      tctx.drawImage(sil, tx, TH - 52 - spr.height + 12);
    });
    /* mama on her nest, up on the middle hill so the plate below stays clear */
    const mx = 100, gy = TH - 54;
    const bob = Math.sin(now / 500) * 1.5;
    const mamaTier = Math.abs(Math.floor(now / 2600)) % 8;
    const mama = SPR.mamaSprite(mamaTier, 2, Math.abs(Math.floor(now / 3000)) % 5 === 4 ? 'blink' : 'idle');
    tctx.fillStyle = 'rgba(16,26,18,.34)';
    tctx.fillRect(mx - 26, gy, 52, 4);
    tctx.drawImage(mama, Math.round(mx - mama.width / 2), Math.round(gy - mama.height + bob));
    const nest = SPR.nestSprite(2);
    tctx.drawImage(nest, Math.round(mx - nest.width / 2), gy - 6);
    /* three chicks pecking beside her */
    [[mx + 38, 0], [mx + 56, 1], [mx - 40, 2]].forEach(([cx, o], i) => {
      const sp = SPECIES[(Math.abs(Math.floor(now / 3400)) + i * 5) % Math.min(14, SPECIES.length)];
      const hop = Math.abs(Math.sin(now / 420 + o * 1.7)) * 2;
      const c = SPR.chickenSprite(sp, 1, false);
      tctx.fillStyle = 'rgba(16,26,18,.3)';
      tctx.fillRect(cx - 5, gy + 1, 11, 3);
      tctx.drawImage(c, Math.round(cx - c.width / 2), Math.round(gy + 1 - c.height - hop));
    });
    /* logo */
    const title = 'INF EGG CO.';
    const k = 3;
    SPR.drawTitle(tctx, title, Math.round(TW / 2 - SPR.textW(title, k) / 2), 18, '#ffd23f', '#3a2410', k);
    const sub = 'A COZY CHICKEN RANCH';
    SPR.drawText(tctx, sub, Math.round(TW / 2 - SPR.textW(sub, 1) / 2), 46, '#ffe9b0', 1, '#3a2410');
    /* progress plate above the START button */
    const line = GAME.disc() + ' OF ' + SPECIES_TOTAL + ' CHICKENS FOUND';
    const lw = SPR.textW(line, 1), px0 = Math.round(TW / 2 - lw / 2) - 7, py0 = TH - 40;
    tctx.fillStyle = 'rgba(24,18,12,.62)';
    tctx.fillRect(px0, py0 - 4, lw + 14, 14);
    tctx.fillStyle = 'rgba(255,232,180,.28)';
    tctx.fillRect(px0, py0 - 5, lw + 14, 1);
    tctx.fillRect(px0, py0 + 10, lw + 14, 1);
    const blink = Math.floor(now / 480) % 2;
    SPR.drawText(tctx, line, px0 + 7, py0, blink ? '#fff8ec' : '#e8d5a8', 1, '#1a120a');
  }
  function showTitle() { titleEl.hidden = false; el.bubble.hidden = true; setInspect(null); }
  function hideTitle() { titleEl.hidden = true; S().seenTitle = true; }

  /* ================= MODAL PLUMBING ================= */
  function openModal(sel) {
    closeModals();
    $(sel).hidden = false;
  }
  function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.hidden = true);
  }

  /* ================= EGGOS - THE LAB TERMINAL =================
     The research screen is a little computer. Modules down the
     left, installable packages on the right, and nothing listed
     that you cannot install yet - a package appears the moment
     its prerequisite goes in.
     ========================================================== */
  const TERM_W = 760, TERM_H = 400, TK = 2;      /* canvas px, and the pixel scale */
  const VW = TERM_W / TK, VH = TERM_H / TK;      /* 380 x 200 virtual pixels */
  let termCv = null, termCtx = null;
  let termMod = 0, termSel = null, termScroll = 0, termHover = null;
  let termHits = [];
  const ROW_H = 21, LIST_X = 92, LIST_Y = 32, LIST_W = VW - LIST_X - 12, ROWS_VIS = 6;
  const LABEL_Y = 22;

  function pkgState(sk) {
    const cur = GAME.lvl(sk.id);
    if (cur >= sk.max) return 'done';
    if (S().feathers >= skillCost(sk, cur)) return 'ready';
    return 'short';
  }
  /* a package only shows once its prerequisite is installed */
  function pkgVisible(sk) {
    const pre = skillPrereq(sk);
    return !pre || GAME.lvl(pre.id) > 0;
  }
  function modulePkgs(i) { return SKILLS_BY_MODULE[i].filter(pkgVisible); }
  function moduleHidden(i) { return SKILLS_BY_MODULE[i].length - modulePkgs(i).length; }
  function moduleReady(i) { return modulePkgs(i).some(sk => pkgState(sk) === 'ready'); }

  function drawTerm(now) {
    if (!termCv) return;
    const g = termCtx;
    const T = SPR.TERM;
    g.imageSmoothingEnabled = false;
    g.setTransform(TK, 0, 0, TK, 0, 0);
    termHits = [];

    SPR.drawBezel(g, 0, 0, VW, VH);
    const px0 = 6, py0 = 6, pw = VW - 12, ph = VH - 16;

    /* faint grid, like a phosphor mesh */
    g.fillStyle = T.grid;
    for (let x = px0; x < px0 + pw; x += 8) g.fillRect(x, py0, 1, ph);
    for (let y = py0; y < py0 + ph; y += 8) g.fillRect(px0, y, pw, 1);

    /* ---- header ---- */
    g.fillStyle = T.bg2; g.fillRect(px0, py0, pw, 14);
    g.fillStyle = T.dim;  g.fillRect(px0, py0 + 14, pw, 1);
    SPR.drawText(g, 'EGGOS 4.0', px0 + 4, py0 + 4, T.hot, 1);
    const fx = 'FEATHERS ' + GAME.fmt(S().feathers);
    SPR.drawText(g, fx, px0 + pw - 4 - SPR.textW(fx, 1), py0 + 4, T.warn, 1);
    if (Math.floor(now / 420) % 2) {
      g.fillStyle = T.text;
      g.fillRect(px0 + 4 + SPR.textW('EGGOS 4.0 ', 1), py0 + 4, 4, 6);
    }

    /* ---- module column ---- */
    const modX = px0 + 4, modY = LIST_Y;
    SPR.drawText(g, 'MODULES', modX, LABEL_Y, T.dim, 1);
    MODULES.forEach((m, i) => {
      const y = modY + i * 17;
      const on = i === termMod;
      const pkgs = modulePkgs(i);
      const dead = pkgs.length === 0;
      SPR.drawBox(g, modX, y, 78, 15, on ? SPR.darken(m.hue, 0.55) : T.bg2,
                  on ? m.hue : null, on ? m.hue : T.frame);
      const col = dead ? T.dim : on ? T.hot : T.text;
      SPR.drawText(g, (on ? '>' : ' ') + m.name, modX + 3, y + 4, col, 1);
      /* a lamp when something in there is affordable */
      if (moduleReady(i)) {
        g.fillStyle = Math.floor(now / 340) % 2 ? T.warn : SPR.darken(T.warn, 0.5);
        g.fillRect(modX + 72, y + 5, 4, 4);
      }
      termHits.push({ kind: 'mod', i, x: modX, y, w: 78, h: 15 });
    });
    /* module footer: the code name, like a filename */
    SPR.drawText(g, MODULES[termMod].code, modX, modY + 7 * 17 + 4, T.dim, 1);

    /* ---- package list ---- */
    const pkgs = modulePkgs(termMod);
    const maxScroll = Math.max(0, pkgs.length - ROWS_VIS);
    termScroll = Math.max(0, Math.min(maxScroll, termScroll));
    const hue = MODULES[termMod].hue;
    SPR.drawText(g, 'PACKAGES', LIST_X, LABEL_Y, T.dim, 1);
    const cnt = pkgs.length + ' AVAILABLE';
    SPR.drawText(g, cnt, LIST_X + LIST_W - SPR.textW(cnt, 1), LABEL_Y, T.dim, 1);

    if (!pkgs.length) {
      SPR.drawBox(g, LIST_X, LIST_Y, LIST_W, 30, SPR.TERM.bg2, null, T.frame);
      SPR.drawText(g, 'NO PACKAGES YET', LIST_X + 6, LIST_Y + 6, T.dim, 1);
      SPR.drawText(g, 'INSTALL SOMETHING ELSE FIRST', LIST_X + 6, LIST_Y + 16, T.dim, 1);
    }

    for (let vi = 0; vi < Math.min(ROWS_VIS, pkgs.length); vi++) {
      const sk = pkgs[vi + termScroll];
      const y = LIST_Y + vi * ROW_H;
      const st = pkgState(sk);
      const sel = termSel === sk.id;
      const hov = termHover === sk.id;
      const fill = sel ? SPR.darken(hue, 0.6) : st === 'done' ? '#152a1c' : T.bg2;
      SPR.drawBox(g, LIST_X, y, LIST_W, ROW_H - 2, fill, sel || hov ? hue : null,
                  sel ? hue : st === 'ready' ? SPR.darken(T.warn, 0.35) : T.frame);
      /* icon chip */
      SPR.drawBox(g, LIST_X + 2, y + 2, 14, 14, SPR.darken(hue, 0.45), hue, T.frame);
      const icon = SPR.iconSprite(sk.icon, 1);
      g.globalAlpha = st === 'done' ? 0.7 : 1;
      g.drawImage(icon, LIST_X + 4, y + 4);
      g.globalAlpha = 1;
      /* name + level pips */
      const cur = GAME.lvl(sk.id);
      SPR.drawText(g, sk.name.toUpperCase(), LIST_X + 20, y + 3,
                   st === 'done' ? T.dim : st === 'ready' ? T.hot : T.text, 1);
      if (sk.max > 1) {
        SPR.drawPips(g, LIST_X + 20, y + 12, cur, Math.min(sk.max, 12),
                     st === 'done' ? T.dim : hue, '#20402c');
        SPR.drawText(g, cur + '/' + sk.max, LIST_X + 24 + Math.min(sk.max, 12) * 3, y + 11, T.dim, 1);
      } else {
        SPR.drawText(g, cur ? 'INSTALLED' : 'ONE OFF', LIST_X + 20, y + 11, cur ? T.dim : T.text, 1);
      }
      /* the whole row selects; the cost chip on top of it installs */
      termHits.push({ kind: 'pkg', id: sk.id, x: LIST_X, y, w: LIST_W, h: ROW_H - 2 });
      /* right side: cost chip, or DONE */
      if (st === 'done') {
        const w = SPR.textW('DONE', 1) + 8;
        SPR.drawBox(g, LIST_X + LIST_W - w - 3, y + 5, w, 10, '#1c3a26', null, T.dim);
        SPR.drawText(g, 'DONE', LIST_X + LIST_W - w + 1, y + 6, T.dim, 1);
      } else {
        const cost = skillCost(sk, cur);
        const label = GAME.fmt(cost);
        const w = SPR.textW(label, 1) + 16;
        const ok = st === 'ready';
        SPR.drawBox(g, LIST_X + LIST_W - w - 3, y + 4, w, 12,
                    ok ? SPR.darken(T.warn, 0.35) : '#20262c', ok ? T.warn : null,
                    ok ? T.warn : T.frame);
        g.drawImage(SPR.iconSprite('feather', 1), LIST_X + LIST_W - w - 1, y + 5);
        SPR.drawText(g, label, LIST_X + LIST_W - w + 10, y + 6, ok ? '#fff8ec' : T.dim, 1);
        termHits.push({ kind: 'buy', id: sk.id, x: LIST_X + LIST_W - w - 3, y: y + 4, w, h: 12 });
      }
    }

    /* scroll rail */
    if (maxScroll > 0) {
      const railH = ROWS_VIS * ROW_H - 2;
      g.fillStyle = '#16281e'; g.fillRect(LIST_X + LIST_W + 2, LIST_Y, 3, railH);
      const th = Math.max(6, railH * ROWS_VIS / pkgs.length);
      g.fillStyle = hue;
      g.fillRect(LIST_X + LIST_W + 2, LIST_Y + Math.round((railH - th) * termScroll / maxScroll), 3, Math.round(th));
    }

    /* locked count - a hint that the tree keeps going */
    const hid = moduleHidden(termMod);
    if (hid > 0) {
      const y = LIST_Y + Math.min(ROWS_VIS, pkgs.length) * ROW_H;
      SPR.drawText(g, hid + ' MORE ENCRYPTED', LIST_X + 2, y + 2, '#2f5a40', 1);
    }

    /* ---- footer: the selected package ---- */
    const fy = py0 + ph - 22;
    g.fillStyle = T.bg2; g.fillRect(px0, fy, pw, 22);
    g.fillStyle = T.dim;  g.fillRect(px0, fy, pw, 1);
    const sel = termSel ? SKILL_BY_ID[termSel] : null;
    if (sel && pkgVisible(sel)) {
      SPR.drawText(g, '> ' + sel.name.toUpperCase(), px0 + 4, fy + 4, MODULES[sel.br].hue, 1);
      SPR.drawText(g, sel.desc.toUpperCase().slice(0, 58), px0 + 4, fy + 13, T.text, 1);
    } else {
      SPR.drawText(g, '> SELECT A PACKAGE', px0 + 4, fy + 4, T.dim, 1);
      SPR.drawText(g, 'TAP THE COST CHIP TO INSTALL IT', px0 + 4, fy + 13, T.dim, 1);
    }

    SPR.drawScanlines(g, px0, py0, pw, ph, now);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  function termHitAt(cx, cy) {
    /* later hits sit on top: walk backwards so buy chips win over rows */
    for (let i = termHits.length - 1; i >= 0; i--) {
      const h = termHits[i];
      if (cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h) return h;
    }
    return null;
  }
  function termCoords(ev) {
    const r = termCv.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / r.width * VW,
      y: (ev.clientY - r.top) / r.height * VH,
    };
  }
  function installPkg(id) {
    const sk = SKILL_BY_ID[id];
    if (!sk) return;
    if (GAME.buySkill(id)) {
      snd.skill();
      termSel = id;
      toast({ icon: sk.icon, title: sk.name.toUpperCase() + ' INSTALLED', body: sk.desc });
      renderSkillCard();
      renderToolbelt();
      GAME.mark('build');
    } else {
      snd.error();
    }
  }

  function renderSkillCard() {
    const card = $('#skill-card');
    card.innerHTML = '';
    const sk = termSel ? SKILL_BY_ID[termSel] : null;
    if (!sk) {
      const hint = document.createElement('span');
      hint.className = 'sk-hint';
      hint.textContent = 'pick a package on the screen above';
      card.appendChild(hint);
      return;
    }
    const cur = GAME.lvl(sk.id);
    const maxed = cur >= sk.max;
    const cost = skillCost(sk, cur);
    card.appendChild(mkIcon(sk.icon, 4));
    const mid = document.createElement('div');
    mid.className = 'skc-mid';
    const b = document.createElement('b');
    b.textContent = sk.name;
    const small = document.createElement('small');
    small.textContent = ' ' + cur + '/' + sk.max + '  ' + MODULES[sk.br].code;
    b.appendChild(small);
    mid.appendChild(b);
    const desc = document.createElement('span');
    desc.textContent = sk.desc;
    mid.appendChild(desc);
    card.appendChild(mid);
    const btn = document.createElement('button');
    btn.className = 'btn';
    if (maxed) { btn.disabled = true; btn.textContent = 'INSTALLED'; }
    else {
      btn.dataset.act = 'buy-skill';
      btn.dataset.id = sk.id;
      if (S().feathers >= cost) btn.classList.add('btn-green');
      else btn.disabled = true;
      btn.appendChild(mkIcon('feather', 2));
      btn.appendChild(document.createTextNode(GAME.fmt(cost)));
    }
    card.appendChild(btn);
  }

  function renderSkills() {
    if (!termCv) {
      termCv = $('#tree-canvas');
      termCv.width = TERM_W; termCv.height = TERM_H;
      termCtx = termCv.getContext('2d');
      termCv.addEventListener('pointermove', ev => {
        const p = termCoords(ev);
        const h = termHitAt(p.x, p.y);
        termHover = h && (h.kind === 'pkg' || h.kind === 'buy') ? h.id : null;
        termCv.style.cursor = h ? 'pointer' : 'default';
      });
      termCv.addEventListener('pointerleave', () => { termHover = null; });
      termCv.addEventListener('pointerdown', ev => {
        const p = termCoords(ev);
        const h = termHitAt(p.x, p.y);
        if (!h) return;
        if (h.kind === 'mod') {
          if (termMod !== h.i) { termMod = h.i; termScroll = 0; termSel = null; renderSkillCard(); }
          snd.plop();
        } else if (h.kind === 'buy') {
          installPkg(h.id);
        } else {
          termSel = h.id;
          snd.plop();
          renderSkillCard();
        }
      });
      termCv.addEventListener('wheel', ev => {
        ev.preventDefault();
        termScroll += ev.deltaY > 0 ? 1 : -1;
      }, { passive: false });
    }
    /* land on a module that has something in it */
    if (!modulePkgs(termMod).length) {
      const first = MODULES.findIndex((_, i) => modulePkgs(i).length);
      if (first >= 0) termMod = first;
    }
    $('#research-sub').textContent = GAME.fmt(S().feathers) + ' FEATHERS';
    renderSkillCard();
    GAME.dirty.skills = false;
  }

  /* ================= INSPECT PANEL ================= */
  const ipanel = $('#inspect-panel');
  let inspect = null;   /* {kind, ref} */

  let ipUpdaters = [];
  function ipRow(label, value) {
    const d = document.createElement('div');
    d.className = 'ip-row';
    const a = document.createElement('span'); a.textContent = label;
    const b = document.createElement('span');
    if (typeof value === 'function') {
      const set = () => { const v = String(value()); if (b.textContent !== v) b.textContent = v; };
      set();
      ipUpdaters.push(set);
    } else b.textContent = value;
    d.appendChild(a); d.appendChild(b);
    return d;
  }
  function ipHead(spriteCanvas, title, sub) {
    const h = document.createElement('div');
    h.className = 'ip-head';
    if (spriteCanvas) h.appendChild(spriteCanvas);
    const t = document.createElement('b');
    t.textContent = title;
    if (sub) {
      const sp = document.createElement('span');
      sp.className = 'ip-sub';
      sp.textContent = sub;
      t.appendChild(sp);
    }
    h.appendChild(t);
    const x = document.createElement('button');
    x.className = 'btn btn-tiny ip-close';
    x.dataset.act = 'close-inspect';
    x.textContent = 'X';
    h.appendChild(x);
    return h;
  }
  function ipBtns(defs) {
    const row = document.createElement('div');
    row.className = 'ip-btns';
    defs.forEach(d => {
      const b = document.createElement('button');
      Object.keys(d.data || {}).forEach(k => b.dataset[k] = d.data[k]);
      const apply = () => {
        const label = typeof d.label === 'function' ? d.label() : d.label;
        if (b.textContent !== label) b.textContent = label;
        const cls = typeof d.cls === 'function' ? d.cls() : d.cls;
        b.className = 'btn' + (cls ? ' ' + cls : '');
        const dis = typeof d.disabled === 'function' ? d.disabled() : d.disabled;
        if (b.disabled !== !!dis) b.disabled = !!dis;
      };
      apply();
      if (typeof d.label === 'function' || typeof d.cls === 'function' || typeof d.disabled === 'function')
        ipUpdaters.push(apply);
      row.appendChild(b);
    });
    return row;
  }

  let ipSig = '';
  function setInspect(target) {
    inspect = target;
    if (target) S().inspected = true;
    ipSig = '';           /* force a rebuild for the new target */
    renderInspect();
  }
  /* called every frame-ish: only rebuilds when the target changes,
     otherwise just refreshes the live values so buttons stay clickable */
  function refreshInspect() {
    if (!inspect) return;
    const sig = inspectSig();
    if (sig !== ipSig) { renderInspect(); return; }
    for (const u of ipUpdaters) u();
  }
  function inspectSig() {
    if (!inspect) return '';
    const r = inspect.ref;
    return inspect.kind + '|' + (r ? (r.id !== undefined ? 'id' + r.id : (r.k || '')) : '') +
      (inspect.kind === 'build' && r ? r.type : '');
  }
  function renderInspect() {
    if (!inspect) { ipanel.hidden = true; ipanel.innerHTML = ''; ipUpdaters = []; return; }
    ipanel.hidden = false;
    ipanel.innerHTML = '';
    ipUpdaters = [];
    ipSig = inspectSig();
    const st = S();
    const kind = inspect.kind;

    if (kind === 'farm') {
      const r = GAME.rates();
      ipanel.appendChild(ipHead(mkIcon('doc', 3), 'RANCH REPORT', 'live production'));
      ipanel.appendChild(ipRow('eggs / min', () => GAME.fmt(Math.round(GAME.rates().eggsPerMin))));
      ipanel.appendChild(ipRow('coins / min', () => GAME.fmt(Math.round(GAME.rates().coinsPerMin))));
      ipanel.appendChild(ipRow('wages / sec', () => GAME.wagePerSec().toFixed(1)));
      ipanel.appendChild(ipRow('chickens', () => S().chickens.length + ' / ' + GAME.chickenCap()));
      ipanel.appendChild(ipRow('staff', () => S().staff.length + ' / ' + GAME.staffSlots()));
      ipanel.appendChild(ipRow('eggs on field', () => String(S().eggs.length)));
      ipanel.appendChild(ipRow('in silos', () => String(GAME.rates().stored)));
      ipanel.appendChild(ipRow('species', () => GAME.disc() + ' / ' + SPECIES_TOTAL));
      ipanel.appendChild(ipRow('land owned', GAME.ownedPlots() + ' / ' + PLOTS.length));
      ipanel.appendChild(ipRow('total sold', () => GAME.fmt(S().stats.sold)));
      ipanel.appendChild(ipRow('retired', () => GAME.fmt(S().stats.culled)));
      if (st.unpaid) {
        const w = document.createElement('p');
        w.className = 'ip-note';
        w.textContent = 'Payroll is empty - your staff have downed tools!';
        ipanel.appendChild(w);
      }
      return;
    }

    if (kind === 'chicken') {
      const ch = inspect.ref;
      if (st.chickens.indexOf(ch) === -1) { setInspect({ kind: 'farm' }); return; }
      const sp = SPECIES[ch.sp];
      ipanel.appendChild(ipHead(chickEl(sp, 2, false), sp.name, TIERS[sp.tier].n));
      ipanel.appendChild(ipRow('lays every', GAME.fmtTime(GAME.layTime(sp.tier) / (ch.buffT > 0 ? 2 : 1))));
      ipanel.appendChild(ipRow('egg value', GAME.fmt(GAME.eggValue(sp.tier, false))));
      ipanel.appendChild(ipRow('next egg in', () => GAME.fmtTime(Math.max(0, ch.lay))));
      ipanel.appendChild(ipRow('well fed', () => ch.buffT > 0 ? GAME.fmtTime(ch.buffT) : 'no'));
      ipanel.appendChild(ipRow('petting', () => ch.petCd > 0 ? GAME.fmtTime(ch.petCd) : 'ready'));
      ipanel.appendChild(ipRow('status', () => ch.marked ? 'MARKED' : 'keeping'));
      const note = document.createElement('p');
      note.className = 'ip-note';
      note.textContent = sp.quip;
      ipanel.appendChild(note);
      ipanel.appendChild(ipBtns([
        { label: () => ch.marked ? 'UNMARK' : 'MARK CULL', data: { act: 'mark-chicken' }, cls: () => ch.marked ? '' : 'btn-green' },
        { label: 'RETIRE NOW', data: { act: 'retire-chicken' } },
      ]));
      return;
    }

    if (kind === 'staff') {
      const w = inspect.ref;
      if (st.staff.indexOf(w) === -1) { setInspect({ kind: 'farm' }); return; }
      const def = ROLES[w.role] || ROLES.hand;
      ipanel.appendChild(ipHead(cloneCanvas(SPR.staffSprite(w, 0, 2)), w.name, def.name));
      STAT_KEYS.forEach(k => {
        const lead = def.uses.includes(k) ? ' *' : '';
        ipanel.appendChild(ipRow(STATS[k].name.toLowerCase() + lead, String(GAME.crewStat(w, k))));
      });
      ipanel.appendChild(ipRow('wage', (w.wage * Math.pow(0.88, GAME.lvl('wages'))).toFixed(2) + '/s'));
      ipanel.appendChild(ipRow('stamina', () => Math.round((w.energy === undefined ? 1 : w.energy) * 100) + '%'));
      ipanel.appendChild(ipRow('doing', () => S().unpaid ? 'UNPAID' : w.state === 'rest' ? 'on a break' : w.state));
      if (w.role === 'hand' || w.role === 'packer') {
        ipanel.appendChild(ipRow('carrying', () => w.carry.length + ' / ' + (GAME.crewCarry(w) + (w.role === 'packer' ? 2 : 0))));
      }
      if (w.role === 'match') ipanel.appendChild(ipRow('holding', () => w.hold ? SPECIES[w.hold.sp].name : 'nobody'));
      if (w.role === 'tech') ipanel.appendChild(ipRow('aura boost', '+' + Math.round(GAME.crewStat(w, 'tech') * 6) + '%'));
      if ((w.traits || []).length) {
        ipanel.appendChild(ipRow('quirks', w.traits.map(t => TRAIT_BY_ID[t] ? TRAIT_BY_ID[t].name : t).join(', ')));
      }
      const note = document.createElement('p');
      note.className = 'ip-note';
      note.textContent = def.job;
      ipanel.appendChild(note);
      ipanel.appendChild(ipBtns([
        { label: 'CREW BOARD', data: { act: 'open-hire' } },
        { label: 'DISMISS', data: { act: 'fire-staff' } },
      ]));
      return;
    }

    if (kind === 'mama') {
      ipanel.appendChild(ipHead(cloneCanvas(SPR.mamaSprite(st.mamaTier, 1, 'idle')), 'MAMA HEN', TIERS[st.mamaTier].n + ' layer'));
      ipanel.appendChild(ipRow('lays every', GAME.fmtTime(GAME.layTime(st.mamaTier))));
      ipanel.appendChild(ipRow('egg value', GAME.fmt(GAME.eggValue(st.mamaTier, false))));
      ipanel.appendChild(ipRow('pet cooldown', GAME.fmtTime(GAME.petCd(true))));
      ipanel.appendChild(ipRow('mutation', Math.round(GAME.mutationChance() * 100) + '%'));
      const maxed = st.mamaTier >= TIERS.length - 2;
      ipanel.appendChild(ipBtns([{
        label: () => S().mamaTier >= TIERS.length - 2 ? 'MAX TIER' : 'UPGRADE ' + GAME.fmt(GAME.mamaCost()),
        data: { act: 'upgrade-mama' },
        disabled: () => S().mamaTier >= TIERS.length - 2 || S().coins < GAME.mamaCost(),
        cls: () => S().mamaTier < TIERS.length - 2 && S().coins >= GAME.mamaCost() ? 'btn-green' : '',
      }]));
      return;
    }

    if (kind === 'land') {
      const pl = inspect.ref;
      ipanel.appendChild(ipHead(mkIcon('house', 3), 'PLOT FOR SALE', pl.theme + ' ground'));
      ipanel.appendChild(ipRow('price', GAME.fmt(pl.price)));
      ipanel.appendChild(ipRow('you have', () => GAME.fmt(S().coins)));
      ipanel.appendChild(ipRow('size', PLOT_W + ' x ' + PLOT_H + ' tiles'));
      ipanel.appendChild(ipRow('adds', '+' + ECON.capPerPlot + ' chicken room'));
      const note = document.createElement('p');
      note.className = 'ip-note';
      note.textContent = 'Buy it from the sign with any other tool.';
      ipanel.appendChild(note);
      ipanel.appendChild(ipBtns([{
        label: () => 'BUY ' + GAME.fmt(pl.price),
        data: { act: 'buy-plot', id: String(pl.id) },
        disabled: () => S().coins < pl.price,
        cls: () => S().coins >= pl.price ? 'btn-green' : '',
      }]));
      return;
    }

    if (kind === 'build') {
      const o = inspect.ref;    /* {type, k} */
      const b = BUILDS[o.type];
      const [c, r] = o.k.split(',').map(Number);
      ipanel.appendChild(ipHead(buildingThumb(o.type), b.name.toUpperCase(), 'tile ' + c + ',' + r));
      const btns = [];
      if (o.type === 'incubator') {
        const inc = st.incs[o.k];
        if (!inc) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('queue', () => inc.queue.length + ' / ' + GAME.incCap()));
        if (inc.queue.length) {
          const q = inc.queue[0];
          ipanel.appendChild(ipRow('hatching', () => inc.queue.length ? TIERS[inc.queue[0].tier].n : 'empty'));
          const need = GAME.incHatchTime(q.tier, q.rainbow);
          ipanel.appendChild(ipRow('ready in', () => inc.queue.length ? GAME.fmtTime(Math.max(0, GAME.incHatchTime(inc.queue[0].tier, inc.queue[0].rainbow) - inc.prog)) : '-'));
        }
        ipanel.appendChild(ipRow('speed', 'x' + (10 / GAME.incHatchTime(0, false)).toFixed(2)));
      } else if (o.type === 'lovenest') {
        const n = st.nests[o.k];
        if (!n) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('slot 1', () => n.slots[0] ? SPECIES[n.slots[0].sp].name : 'empty'));
        ipanel.appendChild(ipRow('slot 2', () => n.slots[1] ? SPECIES[n.slots[1].sp].name : 'empty'));
        ipanel.appendChild(ipRow('tier-up odds', Math.round(GAME.breedUp() * 100) + '%'));
        ipanel.appendChild(ipRow('rainbow odds', Math.round(GAME.rainbowChance() * 100) + '%'));
        btns.push({ label: 'EJECT PAIR', data: { act: 'eject-nest', k: o.k } });
      } else if (o.type === 'sorter') {
        const so = st.sorters[o.k];
        if (!so) { setInspect({ kind: 'farm' }); return; }
        const thr = so.thr === undefined ? ECON.sorterRare : so.thr;
        ipanel.appendChild(ipRow('straight if', () => TIERS[Math.min(so.thr === undefined ? ECON.sorterRare : so.thr, TIERS.length - 1)].n + '+'));
        ipanel.appendChild(ipRow('others', 'turn aside'));
        ipanel.appendChild(ipRow('facing', () => ['east', 'south', 'west', 'north'][so.dir]));
        btns.push({ label: 'THRESHOLD +', data: { act: 'sorter-thr', k: o.k }, cls: 'btn-green' });
        btns.push({ label: 'TURN', data: { act: 'rotate-build', k: o.k, kind: 'sorter' } });
      } else if (o.type === 'silo') {
        const si = st.silos[o.k];
        if (!si) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('stored', () => si.store.length + ' / ' + ECON.siloCap));
        const worth = si.store.reduce((a, e) => a + GAME.eggValue(e.tier, e.golden), 0);
        ipanel.appendChild(ipRow('worth', () => GAME.fmt(si.store.reduce((a, e) => a + GAME.eggValue(e.tier, e.golden), 0))));
        ipanel.appendChild(ipRow('loading', () => S().truck.state === 'parked' ? 'truck is here' : 'waiting'));
      } else if (o.type === 'vacuum') {
        const v = st.vacs[o.k];
        if (!v) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('radius', Math.round(GAME.vacR()) + 'px'));
        ipanel.appendChild(ipRow('holding', () => v.hold.length + ' / ' + ECON.vacHold));
        ipanel.appendChild(ipRow('every', GAME.vacInterval().toFixed(2) + 's'));
        btns.push({ label: 'TURN', data: { act: 'rotate-build', k: o.k, kind: 'vacuum' } });
      } else if (o.type === 'blower') {
        const bl = st.blowers[o.k];
        if (!bl) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('reach', ECON.blowerR + 'px'));
        ipanel.appendChild(ipRow('facing', () => ['east', 'south', 'west', 'north'][bl.dir]));
        btns.push({ label: 'TURN', data: { act: 'rotate-build', k: o.k, kind: 'blower' } });
      } else if (o.type === 'belt') {
        const be = st.belts[o.k];
        if (!be) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('speed', Math.round(GAME.beltSpeed()) + ' px/s'));
        ipanel.appendChild(ipRow('facing', () => ['east', 'south', 'west', 'north'][be.dir]));
        btns.push({ label: 'TURN', data: { act: 'rotate-build', k: o.k, kind: 'belt' } });
      } else if (o.type === 'staffhut') {
        ipanel.appendChild(ipRow('staff', () => S().staff.length + ' / ' + GAME.staffSlots()));
        ipanel.appendChild(ipRow('wages', () => GAME.wagePerSec().toFixed(2) + '/s'));
        btns.push({ label: 'HIRE CREW', data: { act: 'open-hire' }, cls: 'btn-green' });
      } else if (o.type === 'fence') {
        ipanel.appendChild(ipRow('blocks', 'chickens'));
      }
      const note = document.createElement('p');
      note.className = 'ip-note';
      note.textContent = b.desc;
      ipanel.appendChild(note);
      btns.push({ label: 'REMOVE', data: { act: 'demolish-here', k: o.k } });
      ipanel.appendChild(ipBtns(btns));
      return;
    }
  }

  /* ================= HIRING ================= */
  let hireSig = '';
  /* ================= THE CREW BOARD =================
     One set of card builders, used by both the Staff Hut and
     the STAFF tab of the Index, so the crew is always two taps
     away wherever you are.
     ================================================ */
  function statRow(label, v, hue) {
    const row = document.createElement('div');
    row.className = 'st-row';
    const nm = document.createElement('i');
    nm.textContent = label;
    row.appendChild(nm);
    const bar = document.createElement('u');
    const fill = document.createElement('s');
    fill.style.width = Math.round(Math.min(10, v) / 10 * 100) + '%';
    if (hue) fill.style.background = hue;
    bar.appendChild(fill);
    row.appendChild(bar);
    const n = document.createElement('b');
    n.textContent = String(v);
    row.appendChild(n);
    return row;
  }
  function traitChips(traits) {
    const wrap = document.createElement('div');
    wrap.className = 'trait-row';
    if (!traits || !traits.length) {
      const none = document.createElement('em');
      none.textContent = 'no quirks';
      wrap.appendChild(none);
      return wrap;
    }
    traits.forEach(id => {
      const t = TRAIT_BY_ID[id];
      if (!t) return;
      const chip = document.createElement('span');
      chip.className = 'trait' + (t.good ? ' good' : ' bad');
      chip.textContent = t.name;
      chip.title = t.desc;
      wrap.appendChild(chip);
    });
    return wrap;
  }
  function statBlock(w, uses) {
    const box = document.createElement('div');
    box.className = 'st-block';
    STAT_KEYS.forEach(k => {
      const lead = uses && uses.includes(k);
      const row = statRow(STATS[k].name, GAME.crewStat(w, k), lead ? '#ffc72f' : null);
      if (lead) row.classList.add('lead');
      box.appendChild(row);
    });
    return box;
  }

  /* a hired worker */
  function crewCard(w) {
    const def = ROLES[w.role] || ROLES.hand;
    const card = document.createElement('div');
    card.className = 'crew-card' + (def.robot ? ' bot' : '');
    const head = document.createElement('div');
    head.className = 'cc-head';
    head.appendChild(cloneCanvas(SPR.staffSprite(w, 0, 2)));
    const who = document.createElement('div');
    who.className = 'cc-who';
    const nm = document.createElement('b');
    nm.textContent = w.name;
    who.appendChild(nm);
    const rl = document.createElement('span');
    rl.appendChild(mkIcon(def.icon, 2));
    rl.appendChild(document.createTextNode(def.name));
    who.appendChild(rl);
    head.appendChild(who);
    const st = document.createElement('span');
    st.className = 'cc-state';
    st.textContent = S().unpaid ? 'unpaid' : w.state === 'rest' ? 'on a break' : w.state;
    head.appendChild(st);
    card.appendChild(head);

    card.appendChild(statBlock(w, def.uses));
    card.appendChild(traitChips(w.traits));

    const meta = document.createElement('div');
    meta.className = 'cc-meta';
    const wage = document.createElement('span');
    wage.appendChild(mkIcon('coin', 2));
    wage.appendChild(document.createTextNode((w.wage * Math.pow(0.88, GAME.lvl('wages'))).toFixed(2) + '/s'));
    meta.appendChild(wage);
    const jobs = document.createElement('span');
    jobs.textContent = GAME.fmt(w.jobs || 0) + ' jobs';
    meta.appendChild(jobs);
    const nrg = document.createElement('span');
    nrg.textContent = 'stamina ' + Math.round((w.energy === undefined ? 1 : w.energy) * 100) + '%';
    meta.appendChild(nrg);
    card.appendChild(meta);

    /* role switcher - people can move between people-roles */
    const roles = document.createElement('div');
    roles.className = 'cc-roles';
    ROLE_KEYS.filter(r => ROLES[r].robot === def.robot && GAME.roleOpen(r)).forEach(r => {
      const b = document.createElement('button');
      b.className = 'btn btn-tiny' + (r === w.role ? ' on' : '');
      b.dataset.act = 'set-role';
      b.dataset.id = String(w.id);
      b.dataset.role = r;
      b.disabled = r === w.role;
      b.title = ROLES[r].job;
      b.appendChild(mkIcon(ROLES[r].icon, 2));
      roles.appendChild(b);
    });
    const fire = document.createElement('button');
    fire.className = 'btn btn-tiny cc-fire';
    fire.dataset.act = 'fire';
    fire.dataset.id = String(w.id);
    fire.textContent = def.robot ? 'SCRAP' : 'LET GO';
    roles.appendChild(fire);
    card.appendChild(roles);
    return card;
  }

  /* somebody who answered a flyer */
  function applicantCard(ap) {
    const card = document.createElement('div');
    card.className = 'crew-card applicant';
    const head = document.createElement('div');
    head.className = 'cc-head';
    head.appendChild(cloneCanvas(SPR.personSprite(ap.look, 0, 2)));
    const who = document.createElement('div');
    who.className = 'cc-who';
    const nm = document.createElement('b');
    nm.textContent = ap.name;
    who.appendChild(nm);
    const q = document.createElement('span');
    q.textContent = 'rating ' + crewQuality(ap.st) + ' / 50';
    who.appendChild(q);
    head.appendChild(who);
    const t = document.createElement('span');
    t.className = 'cc-state';
    t.textContent = 'leaves in ' + GAME.fmtTime(ap.t);
    head.appendChild(t);
    card.appendChild(head);

    card.appendChild(statBlock(ap, null));
    card.appendChild(traitChips(ap.traits));

    const meta = document.createElement('div');
    meta.className = 'cc-meta';
    const sign = document.createElement('span');
    sign.appendChild(mkIcon('coin', 2));
    sign.appendChild(document.createTextNode(GAME.fmt(ap.sign) + ' to sign'));
    meta.appendChild(sign);
    const wage = document.createElement('span');
    wage.appendChild(mkIcon('coin', 2));
    wage.appendChild(document.createTextNode((ap.wage * Math.pow(0.88, GAME.lvl('wages'))).toFixed(2) + '/s'));
    meta.appendChild(wage);
    card.appendChild(meta);

    const roles = document.createElement('div');
    roles.className = 'cc-roles';
    const room = GAME.canHire() && S().coins >= ap.sign;
    ROLE_KEYS.filter(r => !ROLES[r].robot && GAME.roleOpen(r)).forEach(r => {
      const b = document.createElement('button');
      b.className = 'btn btn-tiny' + (room ? ' btn-green' : '');
      b.dataset.act = 'hire-applicant';
      b.dataset.id = String(ap.id);
      b.dataset.role = r;
      b.disabled = !room;
      b.title = 'Hire as ' + ROLES[r].name + ' - ' + ROLES[r].job;
      b.appendChild(mkIcon(ROLES[r].icon, 2));
      roles.appendChild(b);
    });
    const hint = document.createElement('em');
    hint.className = 'cc-hint';
    hint.textContent = room ? 'pick a role' : GAME.canHire() ? 'not enough coins' : 'no free slot';
    roles.appendChild(hint);
    card.appendChild(roles);
    return card;
  }

  /* the noticeboard: flyer button, campaign timer, applicants */
  function noticeBoard(box) {
    const st = S();
    const bar = document.createElement('div');
    bar.className = 'notice';
    const spr = cloneCanvas(SPR.flyerSprite(2));
    bar.appendChild(spr);
    const mid = document.createElement('div');
    mid.className = 'no-mid';
    const b = document.createElement('b');
    b.textContent = 'HELP WANTED';
    mid.appendChild(b);
    const line = document.createElement('span');
    if (!GAME.lvl('hiring')) line.textContent = 'Research Recruiting in the Lab to start hiring.';
    else if (!Object.keys(st.huts).length) line.textContent = 'Build a Staff Hut first - the crew needs a base.';
    else if (st.flyer) line.textContent = 'Flyers are up. Folk should turn up in ' + GAME.fmtTime(st.flyer.t) + '.';
    else line.textContent = 'Post flyers around the valley and wait for folk to walk in.';
    mid.appendChild(line);
    if (st.flyer) {
      const barr = document.createElement('div');
      barr.className = 'no-bar';
      const fill = document.createElement('i');
      fill.style.width = Math.round((1 - st.flyer.t / st.flyer.need) * 100) + '%';
      barr.appendChild(fill);
      mid.appendChild(barr);
    }
    bar.appendChild(mid);
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.dataset.act = 'send-flyers';
    const cost = GAME.flyerPrice();
    const ok = GAME.canFlyer() && st.coins >= cost;
    if (ok) btn.classList.add('btn-green');
    btn.disabled = !ok;
    if (st.flyer) btn.textContent = 'OUT THERE';
    else {
      btn.appendChild(mkIcon('coin', 2));
      btn.appendChild(document.createTextNode(GAME.fmt(cost)));
    }
    bar.appendChild(btn);
    box.appendChild(bar);

    if (st.applicants.length) {
      const grid = document.createElement('div');
      grid.className = 'crew-grid';
      st.applicants.forEach(ap => grid.appendChild(applicantCard(ap)));
      box.appendChild(grid);
    } else if (!st.flyer && GAME.lvl('hiring') && Object.keys(st.huts).length) {
      const none = document.createElement('p');
      none.className = 'crew-none';
      none.textContent = 'Nobody waiting. Put some flyers up.';
      box.appendChild(none);
    }
  }

  /* robots are built, not recruited */
  function botBench(box) {
    const bots = ROLE_KEYS.filter(r => ROLES[r].robot);
    if (!bots.some(r => GAME.roleOpen(r))) return;
    const grid = document.createElement('div');
    grid.className = 'bot-grid';
    bots.forEach(r => {
      const def = ROLES[r];
      const open = GAME.roleOpen(r);
      const cost = GAME.botPrice(r);
      const card = document.createElement('div');
      card.className = 'bot-card' + (open ? '' : ' locked');
      card.appendChild(cloneCanvas(SPR.staffSprite({ role: r }, 0, 2)));
      const mid = document.createElement('div');
      mid.className = 'hc-mid';
      const b = document.createElement('b');
      b.textContent = def.name.toUpperCase();
      mid.appendChild(b);
      const job = document.createElement('span');
      job.textContent = open ? def.job : 'Research required before you can build this one.';
      mid.appendChild(job);
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.dataset.act = 'assemble';
      btn.dataset.role = r;
      const ok = open && GAME.canHire() && S().coins >= cost;
      if (ok) btn.classList.add('btn-green');
      btn.disabled = !ok;
      btn.appendChild(mkIcon('coin', 2));
      btn.appendChild(document.createTextNode(open ? GAME.fmt(cost) : 'LOCKED'));
      mid.appendChild(btn);
      card.appendChild(mid);
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  /* both the hut modal and the Index tab show the same crew, so
     redraw whichever one is open */
  function refreshCrewViews() {
    if (!$('#modal-hire').hidden) renderHire();
    if (!$('#modal-pedia').hidden && indexTab === 'staff') renderPedia();
    refreshInspect();
  }

  function crewHeadline() {
    return S().staff.length + ' / ' + GAME.staffSlots() + ' SLOTS  -  ' +
      GAME.wagePerSec().toFixed(2) + ' COINS/SEC';
  }

  /* the Staff Hut modal */
  function renderHire() {
    const list = $('#hire-list');
    const crew = $('#crew-list');
    const st = S();
    $('#hire-sub').textContent = crewHeadline();
    list.innerHTML = '';
    noticeBoard(list);
    botBench(list);
    crew.innerHTML = '';
    if (st.staff.length >= GAME.staffSlots() && Object.keys(st.huts).length) {
      const warn = document.createElement('p');
      warn.id = 'hire-warn';
      warn.textContent = 'All slots full - build another Staff Hut or install Bunkhouse.';
      crew.appendChild(warn);
    }
    if (st.staff.length) {
      const grid = document.createElement('div');
      grid.className = 'crew-grid';
      st.staff.forEach(w => grid.appendChild(crewCard(w)));
      crew.appendChild(grid);
    }
    /* auto-mark rule */
    const rule = document.createElement('div');
    rule.className = 'crew-chip';
    const rt = document.createElement('span');
    const am = st.autoMark;
    rt.textContent = 'auto-mark culls below: ' + (am < 0 ? 'off' : TIERS[Math.min(am, TIERS.length - 1)].n);
    rule.appendChild(rt);
    const rb = document.createElement('button');
    rb.className = 'btn';
    rb.dataset.act = 'cycle-automark';
    rb.textContent = 'CHANGE';
    rule.appendChild(rb);
    crew.appendChild(rule);
  }

  /* ================= THE INDEX =================
     Four tabs: the chickens you have found, the crew on the
     payroll, what each egg is worth, and the diary.
     ============================================ */
  let indexTab = 'chickens';
  function renderPedia() {
    const box = $('#pedia');
    box.innerHTML = '';
    document.querySelectorAll('#index-tabs .tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === indexTab));

    if (indexTab === 'chickens') {
      $('#pedia-sub').textContent = GAME.disc() + ' / ' + SPECIES_TOTAL + ' CHICKENS';
      TIERS.forEach((tier, t) => {
        const pool = SPECIES_BY_TIER[t];
        const found = pool.filter(sp => S().disc.includes(sp.id)).length;
        const sec = document.createElement('div');
        sec.className = 'pedia-sec';
        const head = document.createElement('div');
        head.className = 'ps-head';
        const hl = document.createElement('b');
        hl.textContent = tier.n.toUpperCase();
        hl.style.color = tier.c;
        head.appendChild(hl);
        const hr = document.createElement('span');
        hr.textContent = found + ' / ' + pool.length;
        head.appendChild(hr);
        sec.appendChild(head);
        const grid = document.createElement('div');
        grid.className = 'pedia-grid';
        pool.forEach(sp => {
          const known = S().disc.includes(sp.id);
          const card = document.createElement('div');
          card.className = 'pedia-card' + (known ? '' : ' unknown');
          card.appendChild(cloneCanvas(SPR.chickenSprite(sp, 2, !known)));
          const name = document.createElement('b');
          name.textContent = known ? sp.name : '???';
          card.appendChild(name);
          if (known) {
            const quip = document.createElement('span');
            quip.textContent = sp.quip;
            card.appendChild(quip);
            const cnt = document.createElement('i');
            const inField = S().chickens.filter(c => c.sp === sp.id).length;
            cnt.textContent = inField ? inField + ' on the ranch' : 'none right now';
            card.appendChild(cnt);
          }
          grid.appendChild(card);
        });
        sec.appendChild(grid);
        box.appendChild(sec);
      });

    } else if (indexTab === 'staff') {
      const st = S();
      $('#pedia-sub').textContent = crewHeadline();
      const intro = document.createElement('p');
      intro.className = 'pedia-intro';
      intro.textContent = 'Nobody walks in on their own - print flyers, wait for folk to arrive, then pick the role that suits their stats.';
      box.appendChild(intro);
      noticeBoard(box);
      if (st.staff.length) {
        const head = document.createElement('div');
        head.className = 'ps-head crew-head';
        const hl = document.createElement('b');
        hl.textContent = 'ON THE PAYROLL';
        head.appendChild(hl);
        const hr = document.createElement('span');
        hr.textContent = st.staff.length + ' / ' + GAME.staffSlots();
        head.appendChild(hr);
        box.appendChild(head);
        const grid = document.createElement('div');
        grid.className = 'crew-grid';
        st.staff.forEach(w => grid.appendChild(crewCard(w)));
        box.appendChild(grid);
      }
      botBench(box);
      /* what each stat actually does */
      const legend = document.createElement('div');
      legend.className = 'stat-legend';
      const lh = document.createElement('b');
      lh.textContent = 'WHAT THE STATS DO';
      legend.appendChild(lh);
      STAT_KEYS.forEach(k => {
        const row = document.createElement('div');
        row.appendChild(mkIcon(STATS[k].icon, 2));
        const nm = document.createElement('i');
        nm.textContent = STATS[k].name;
        row.appendChild(nm);
        const d = document.createElement('span');
        d.textContent = STATS[k].desc;
        row.appendChild(d);
        legend.appendChild(row);
      });
      ROLE_KEYS.forEach(r => {
        const def = ROLES[r];
        if (!GAME.roleOpen(r)) return;
        const row = document.createElement('div');
        row.appendChild(mkIcon(def.icon, 2));
        const nm = document.createElement('i');
        nm.textContent = def.name.toUpperCase();
        row.appendChild(nm);
        const d = document.createElement('span');
        d.textContent = def.job + '  Leans on ' + def.uses.map(k => STATS[k].name).join(' and ') + '.';
        row.appendChild(d);
        legend.appendChild(row);
      });
      box.appendChild(legend);

    } else if (indexTab === 'eggs') {
      $('#pedia-sub').textContent = 'EGG VALUES';
      const intro = document.createElement('p');
      intro.className = 'pedia-intro';
      intro.textContent = 'Every egg both hatches and sells. Golden ones are worth five times as much.';
      box.appendChild(intro);
      const grid = document.createElement('div');
      grid.className = 'egg-grid';
      TIERS.forEach((tier, t) => {
        const card = document.createElement('div');
        card.className = 'egg-card';
        card.appendChild(cloneCanvas(SPR.eggSprite(t, 2, t === TIERS.length - 1)));
        const mid = document.createElement('div');
        const b = document.createElement('b');
        b.textContent = tier.n;
        b.style.color = tier.c;
        mid.appendChild(b);
        const v = document.createElement('span');
        v.appendChild(mkIcon('coin', 2));
        v.appendChild(document.createTextNode(GAME.fmt(GAME.eggValue(t, false))));
        mid.appendChild(v);
        const h = document.createElement('i');
        h.textContent = 'hatches in ' + GAME.fmtTime(GAME.incHatchTime(t, false));
        mid.appendChild(h);
        card.appendChild(mid);
        grid.appendChild(card);
      });
      box.appendChild(grid);

    } else {
      const list = S().diary.slice().reverse();
      $('#pedia-sub').textContent = 'DAY ' + S().day + ' - ' + list.length + ' ENTRIES';
      if (!list.length) {
        const p = document.createElement('p');
        p.className = 'pedia-intro';
        p.textContent = 'Nothing written down yet. Hatch an egg and the diary starts itself.';
        box.appendChild(p);
      }
      const icons = { species: null, first: null, land: 'house', mama: 'crown', hire: 'hands',
                      flyer: 'doc', applicants: 'hands' };
      list.forEach(en => {
        const row = document.createElement('div');
        row.className = 'diary-row';
        if (en.sp !== null && en.sp !== undefined && SPECIES[en.sp]) {
          row.appendChild(cloneCanvas(SPR.chickenSprite(SPECIES[en.sp], 1, false), 2));
        } else {
          row.appendChild(mkIcon(icons[en.kind] || 'star', 2));
        }
        const day = document.createElement('i');
        day.textContent = 'day ' + en.day;
        row.appendChild(day);
        const tx = document.createElement('span');
        tx.textContent = en.text;
        row.appendChild(tx);
        box.appendChild(row);
      });
    }
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
  function staffAt(x, y) {
    for (let i = S().staff.length - 1; i >= 0; i--) {
      const w = S().staff[i];
      if (x > w.x - 2 && x < w.x + 14 && y > w.y - 6 && y < w.y + 18) return w;
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
      if (Math.abs(x - cx) < 22 && Math.abs(y - cy) < 20) return p;
    }
    return null;
  }

  function tapWorld(x, y) {
    const st = GAME.inStation(x, y, 5);
    if (st === 'lab') { renderSkills(); openModal('#modal-skills'); snd.build(); return true; }
    if (st === 'stand') { renderPedia(); openModal('#modal-pedia'); snd.build(); return true; }
    if (st === 'mamaSign') {
      if (S().tool === 'inspect') { setInspect({ kind: 'mama' }); return true; }
      if (GAME.upgradeMama()) {
        snd.grand(); heart(W.mama.x, W.mama.y - 20, 8);
        toast({ icon: 'crown', title: 'MAMA EVOLVED', body: 'She now lays ' + TIERS[S().mamaTier].n + ' eggs.' });
      } else snd.error();
      return true;
    }
    const sign = saleSignAt(x, y);
    if (sign) {
      if (S().tool === 'inspect') { setInspect({ kind: 'land', ref: sign }); return true; }
      if (GAME.buyPlot(sign.id)) {
        snd.grand();
        puff(x, y, '#ffd23f', 18, 64, 44);
        toast({ icon: 'house', title: 'NEW LAND', body: 'The fences come down. Room to grow!' });
        GAME.clampCam();
      } else {
        snd.error();
        floatWorld(GAME.fmt(sign.price), x, y - 16, 'pink', 'coin');
      }
      return true;
    }
    if (GAME.hitTruck(x, y) && S().truck.state === 'parked') {
      if (S().tool === 'basket' && S().basket.length) return false;
      if (S().truck.load.length && GAME.sendTruck()) { snd.engine(); return true; }
    }
    const o = GAME.occAt(Math.floor(x / 16), Math.floor(y / 16));
    if (o && o.type === 'staffhut' && S().tool !== 'build') {
      renderHire(); openModal('#modal-hire'); snd.build(); return true;
    }
    if (o && o.type === 'lovenest' && S().tool === 'hand' && !S().held) {
      if (GAME.ejectNest(o.k)) { snd.plop(); return true; }
    }
    return false;
  }

  /* the inspect tool: tap anything to read its stats */
  function inspectAt(x, y) {
    const w = staffAt(x, y);
    if (w) { setInspect({ kind: 'staff', ref: w }); return; }
    const ch = chickenAt(x, y);
    if (ch) { setInspect({ kind: 'chicken', ref: ch }); return; }
    if (overMama(x, y)) { setInspect({ kind: 'mama' }); return; }
    const o = GAME.occAt(Math.floor(x / 16), Math.floor(y / 16));
    if (o) { setInspect({ kind: 'build', ref: o }); return; }
    setInspect({ kind: 'farm' });
  }

  let heldSince = 0, cand = null;

  cv.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    cv.setPointerCapture(ev.pointerId);
    const p = eventToWorld(ev);
    Object.assign(ptr, { x: p.x, y: p.y, sx: p.sx, sy: p.sy, inside: true, down: true, downAt: performance.now(), moved: 0 });
    const tool = S().tool;
    ptr.mode = null; ptr.target = null; cand = null;
    if (tool === 'build') {
      if (buildSel) { paintTile = null; handlePlaceAt(p.x, p.y, false); ptr.mode = 'place'; }
      return;
    }
    if (tool === 'feed') { trySprinkle(p.x, p.y); ptr.mode = 'feed'; return; }
    if (tool === 'inspect') { ptr.mode = 'inspect'; return; }
    if (tool === 'basket') { ptr.mode = 'sweep'; return; }
    if (S().held) { ptr.mode = 'carry'; return; }
    cand = { ch: chickenAt(p.x, p.y), egg: eggAt(p.x, p.y),
             mama: overMama(p.x, p.y), plume: plumeAt(p.x, p.y) };
    ptr.mode = 'pending';
  });

  cv.addEventListener('pointermove', ev => {
    const before = { x: ptr.x, y: ptr.y };
    const p = eventToWorld(ev);
    ptr.moved += Math.hypot(p.x - ptr.x, p.y - ptr.y);
    ptr.x = p.x; ptr.y = p.y; ptr.sx = p.sx; ptr.sy = p.sy;
    ptr.inside = true;
    if (!ptr.down) return;
    if (ptr.mode === 'inspect' && ptr.moved > 6) ptr.mode = 'pan';
    if (ptr.mode === 'pending' && ptr.moved > 5) {
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
    } else if (ptr.mode === 'place') handlePlaceAt(ptr.x, ptr.y, true);
    else if (ptr.mode === 'feed') trySprinkle(ptr.x, ptr.y);
  });

  function endPointer(ev) {
    if (!ptr.down) return;
    ptr.down = false;
    const wasTap = ptr.moved < 6 && performance.now() - ptr.downAt < 420;
    const x = ptr.x, y = ptr.y;
    const tool = S().tool;
    if (ptr.mode === 'carry' && S().held) {
      if (performance.now() - heldSince > 260 || ptr.moved > 6) dropHeldAt(x, y);
      return;
    }
    if (ptr.mode === 'inspect') {
      if (wasTap) { if (!tapWorld(x, y)) { inspectAt(x, y); snd.plop(); } }
      else { ptr.mode = 'pan'; }
      return;
    }
    if (ptr.mode === 'pending' && wasTap && cand) {
      if (cand.mama) {
        if (GAME.petMama()) { petFx.set('mama', performance.now()); heart(W.mama.x, W.mama.y - 18, 3); snd.pet(); }
        return;
      }
      if (cand.ch) {
        if (GAME.petChicken(cand.ch)) {
          petFx.set(cand.ch.id, performance.now());
          heart(cand.ch.x + 10, cand.ch.y - 4, 2);
          snd.pet();
        }
        return;
      }
      if (cand.plume) {
        const v = GAME.collectPlume(cand.plume);
        if (v) { snd.plume(); floatWorld('+' + v, x, y - 8, 'green', 'feather'); }
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
      if (S().basket.length) {
        if (GAME.hitTruck(x, y)) {
          const n = GAME.basketToTruck();
          if (n) {
            for (let i = 0; i < Math.min(n, 6); i++) setTimeout(() => snd.clink(), i * 60);
            floatWorld('+' + n + ' LOADED', W.truckHome.x + 26, W.truckHome.y - 18, 'green');
          } else floatWorld('TRUCK FULL', x, y - 12, 'pink');
          updateCursorChip();
          return;
        }
        const o = GAME.occAt(Math.floor(x / 16), Math.floor(y / 16));
        if (o && o.type === 'incubator') {
          const n = GAME.basketToInc(o.k);
          if (n) { snd.plop(); floatWorld('+' + n + ' IN', x, y - 12, 'green'); }
          else floatWorld('FULL', x, y - 12, 'pink');
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
    else if (result === 'graduated') { snd.sparkle(); floatWorld('GRADUATED', x, y - 14, 'green', 'feather'); }
    else if (result === 'incubated') { snd.plop(); floatWorld('INCUBATING', x, y - 12, 'green'); }
    else if (result === 'loaded') snd.clink();
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
      if (S().coins < cost) { snd.error(); floatWorld(GAME.fmt(cost), wx, wy - 10, 'pink', 'coin'); }
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
    if (ev.key === '5') setTool('inspect');
  });
  window.addEventListener('keyup', ev => { keys[ev.key.toLowerCase()] = false; });

  function setTool(t) {
    if (S().tool === t) return;
    S().tool = t;
    if (t === 'build' && !buildSel) buildSel = 'incubator';
    renderToolbelt(); renderPalette(); updateCursorChip();
    snd.plop();
  }

  document.getElementById('app').addEventListener('click', ev => {
    const toolBtn = ev.target.closest('[data-tool]');
    if (toolBtn) { setTool(toolBtn.dataset.tool); return; }
    const palBtn = ev.target.closest('[data-build]');
    if (palBtn && !palBtn.disabled) {
      const b = palBtn.dataset.build;
      if (b === 'rotate') placeDir = (placeDir + 1) % 4;
      else buildSel = (buildSel === b ? null : b);
      GAME.mark('build');
      return;
    }
    const btn = ev.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    switch (btn.dataset.act) {
      case 'menu': $('#menu-pop').hidden = !$('#menu-pop').hidden; break;
      case 'close-modal': closeModals(); break;
      case 'close-inspect': setInspect(null); break;
      case 'start-game': hideTitle(); snd.sparkle(); break;
      case 'title': showTitle(); $('#menu-pop').hidden = true; break;
      case 'crew': {
        indexTab = 'staff';
        renderPedia();
        openModal('#modal-pedia');
        $('#menu-pop').hidden = true;
        snd.build();
        break;
      }
      case 'send-flyers': {
        if (GAME.sendFlyers()) {
          snd.build();
          toast({ icon: 'doc', title: 'FLYERS UP', body: 'Give it a minute and folk will start walking in.' });
        } else snd.error();
        refreshCrewViews();
        break;
      }
      case 'hire-applicant': {
        if (GAME.hireApplicant(+btn.dataset.id, btn.dataset.role)) {
          snd.skill();
          const w = S().staff[S().staff.length - 1];
          toast({ icon: ROLES[btn.dataset.role].icon, title: w.name.toUpperCase() + ' HIRED',
                  body: 'Signed on as a ' + ROLES[btn.dataset.role].name + '.' });
        } else snd.error();
        refreshCrewViews();
        break;
      }
      case 'assemble': {
        if (GAME.assembleBot(btn.dataset.role)) {
          snd.skill();
          toast({ icon: ROLES[btn.dataset.role].icon, title: ROLES[btn.dataset.role].name.toUpperCase() + ' BUILT',
                  body: ROLES[btn.dataset.role].job });
        } else snd.error();
        refreshCrewViews();
        break;
      }
      case 'set-role': {
        if (GAME.setRole(+btn.dataset.id, btn.dataset.role)) snd.plop();
        else snd.error();
        refreshCrewViews();
        break;
      }
      case 'index-tab': { indexTab = btn.dataset.tab; renderPedia(); break; }
      case 'open-hire': renderHire(); openModal('#modal-hire'); break;
      case 'mark-chicken': {
        if (inspect && inspect.kind === 'chicken') {
          const on = GAME.markChicken(inspect.ref);
          snd.plop();
          floatWorld(on ? 'MARKED' : 'SPARED', inspect.ref.x + 8, inspect.ref.y - 6, on ? 'pink' : 'green');
          refreshInspect();
        }
        break;
      }
      case 'retire-chicken': {
        if (inspect && inspect.kind === 'chicken') {
          const ch = inspect.ref;
          const f = GAME.retireChicken(ch);
          if (f) { snd.demolish(); setInspect({ kind: 'farm' }); }
        }
        break;
      }
      case 'fire-staff': {
        if (inspect && inspect.kind === 'staff') {
          GAME.fireStaff(inspect.ref.id);
          snd.demolish();
          setInspect({ kind: 'farm' });
        }
        break;
      }
      case 'upgrade-mama': {
        if (GAME.upgradeMama()) {
          snd.grand(); heart(W.mama.x, W.mama.y - 20, 8);
          toast({ icon: 'crown', title: 'MAMA EVOLVED', body: 'She now lays ' + TIERS[S().mamaTier].n + ' eggs.' });
          refreshInspect();
        } else snd.error();
        break;
      }
      case 'buy-plot': {
        const id = +btn.dataset.id;
        if (GAME.buyPlot(id)) {
          snd.grand();
          toast({ icon: 'house', title: 'NEW LAND', body: 'The fences come down. Room to grow!' });
          GAME.clampCam();
          setInspect({ kind: 'farm' });
        } else snd.error();
        break;
      }
      case 'eject-nest': { if (GAME.ejectNest(btn.dataset.k)) { snd.plop(); refreshInspect(); } break; }
      case 'sorter-thr': {
        const so = S().sorters[btn.dataset.k];
        if (so) { so.thr = ((so.thr === undefined ? ECON.sorterRare : so.thr) + 1) % (TIERS.length - 1); snd.build(); refreshInspect(); }
        break;
      }
      case 'rotate-build': {
        const k = btn.dataset.k, kindMap = { belt: 'belts', vacuum: 'vacs', blower: 'blowers', sorter: 'sorters' };
        const store = S()[kindMap[btn.dataset.kind]];
        if (store && store[k]) { store[k].dir = (store[k].dir + 1) % 4; snd.build(); refreshInspect(); }
        break;
      }
      case 'demolish-here': {
        const [c, r] = btn.dataset.k.split(',').map(Number);
        if (GAME.demolish(c, r)) { snd.demolish(); setInspect({ kind: 'farm' }); }
        break;
      }
      case 'fire': { GAME.fireStaff(+btn.dataset.id); snd.demolish(); refreshCrewViews(); break; }
      case 'cycle-automark': {
        const st = S();
        st.autoMark = st.autoMark >= TIERS.length - 3 ? -1 : st.autoMark + 1;
        snd.plop();
        refreshCrewViews();
        break;
      }
      case 'buy-skill': {
        if (GAME.buySkill(btn.dataset.id)) {
          snd.skill();
          if (['overclock', 'tycoon', 'secretlore'].includes(btn.dataset.id)) snd.grand();
          renderSkills(); renderToolbelt();
        } else snd.error();
        break;
      }
      case 'mute':
        S().muted = !S().muted;
        btn.textContent = S().muted ? 'SOUND OFF' : 'SOUND ON';
        break;
      case 'save': GAME.save(); floatText('SAVED', ev.clientX - 20, ev.clientY - 24, 'green'); break;
      case 'reset':
        if (confirm('Reset everything? The chickens will write memoirs.')) {
          GAME.reset(); buildSel = null; setInspect(null);
          renderToolbelt(); renderPalette(); updateCursorChip();
        }
        break;
    }
  });

  /* ================= GAME EVENT FX ================= */
  let lastMutToast = 0;
  GAME.on('lay', ({ egg, mutated, fromPet }) => {
    if (fromPet) snd.lay();
    if (mutated) {
      puff(egg.x, egg.y - 6, TIERS[egg.tier].c, 9, 42, 32);
      if (performance.now() - lastMutToast > 5000) {
        lastMutToast = performance.now();
        snd.sparkle();
        floatWorld('MUTATION ' + TIERS[egg.tier].n, egg.x, egg.y - 16, 'pink', 'dna');
      }
    }
    if (egg.golden) puff(egg.x, egg.y - 6, '#ffd23f', 7, 32, 28);
  });
  GAME.on('hatch', ({ births, x, y, rainbow }) => {
    snd.hatch();
    /* the chickens just pushed onto the field are these births */
    const fresh = S().chickens.slice(-births.length);
    fresh.forEach(ch => bornFx.set(ch.id, performance.now()));
    births.forEach((b, i) => {
      spawnHatchFx(b.sp, x + i * 8, y, rainbow);
      if (b.isNew) {
        toast({
          sprite: cloneCanvas(SPR.chickenSprite(b.sp, 2, false)),
          title: 'NEW SPECIES: ' + b.sp.name,
          body: TIERS[b.sp.tier].n + ' - ' + b.sp.quip,
          long: true,
        });
        snd.sparkle();
      }
    });
    if (rainbow) { puff(x, y - 10, '#ff5fd0', 16, 64, 42); snd.grand(); }
    if (births.length > 1) floatWorld('TWINS', x, y - 24, 'pink');
  });
  GAME.on('breed', ({ x, y, rainbow, tier }) => {
    snd.breed();
    heart(x, y - 10, 6);
    floatWorld(rainbow ? 'RAINBOW EGG' : TIERS[tier].n + ' EGG', x, y - 18, rainbow ? 'pink' : 'green');
    if (rainbow) puff(x, y - 6, '#ff5fd0', 14, 54, 38);
  });
  GAME.on('sell', ({ pay, n }) => {
    snd.coin();
    coinBurst(W.truckHome.x + 26, W.truckHome.y - 4, n);
    floatWorld('+' + GAME.fmt(pay), W.truckHome.x + 20, W.truckHome.y - 22, 'gold', 'coin');
  });
  GAME.on('truckleave', () => { snd.engine(); puff(W.truckHome.x - 4, W.roadY + 8, '#c9a35f', 9, 44, 16); });
  GAME.on('graduate', ({ sp }) => {
    toast({ sprite: cloneCanvas(SPR.chickenSprite(sp, 2, false)), title: sp.name + ' GRADUATED', body: 'She joins the lab team. Feathers dropped!' });
  });
  GAME.on('feedeat', ({ x, y }) => puff(x, y, '#f2c94c', 4, 18, 14));
  GAME.on('land', () => { GAME.mark('ground'); });

  /* ================= BOOT ================= */
  function boot() {
    GAME.load();
    const off = GAME.applyOffline();
    buildGround();
    renderToolbelt();
    renderPalette();
    updateCursorChip();
    if (S().seenTitle) titleEl.hidden = true;
    const mb = $('#btn-mute');
    if (mb) mb.textContent = S().muted ? 'SOUND OFF' : 'SOUND ON';
    if (off && (off.laid > 0 || off.hatched > 0 || off.pay > 0)) {
      toast({
        icon: 'egg',
        title: 'WELCOME BACK',
        body: 'While you were away (' + GAME.fmtTime(off.seconds) + '): ' + GAME.fmt(off.laid) + ' eggs laid' +
          (off.hatched ? ', ' + off.hatched + ' hatched' : '') +
          (off.pay ? ', truck sold for ' + GAME.fmt(off.pay) : '') + '.',
        long: true,
      });
    }

    let last = performance.now(), saveAcc = 0, hudAcc = 0;
    function frame(now) {
      /* the first rAF timestamp can predate boot's clock read - never go backwards */
      let dt = Math.max(0, (now - last) / 1000);
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
      if (pdx || pdy) { cam().x += pdx * 150 * dt; cam().y += pdy * 150 * dt; GAME.clampCam(); }
      if (!titleEl.hidden) drawTitleScreen(dt);
      render(now, dt);
      if (!$('#modal-skills').hidden) drawTerm(now);
      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        lightUpdate();
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
