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
        g.gain.exponentialRampToValueAtTime((vol || 0.07) * Math.max(0.05, (GAME.setting('volume') || 0.7) / 0.7), st + 0.01);
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

  /* ================= SPEECH BUBBLES =================
     Nothing in the interface gets a thin grey browser tooltip. Any
     element with a title grows a fat cartoon bubble with a tail
     instead, and the title is moved out of the way so the native
     one never appears.
     ================================================== */
  let tipEl = null, tipFor = null, tipT = 0;
  function ensureTip() {
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.id = 'tip-bubble';
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
    return tipEl;
  }
  function tipTextOf(el) {
    let n = el;
    for (let i = 0; i < 5 && n; i++, n = n.parentElement) {
      if (n.dataset && n.dataset.tip) return { el: n, text: n.dataset.tip };
      if (n.title) { n.dataset.tip = n.title; n.title = ''; return { el: n, text: n.dataset.tip }; }
    }
    return null;
  }
  function showTip(target, text) {
    const t = ensureTip();
    if (tipFor === target && !t.hidden) return;
    tipFor = target;
    t.textContent = text;
    t.hidden = false;
    t.classList.remove('pop');
    void t.offsetWidth;
    t.classList.add('pop');
    const r = target.getBoundingClientRect();
    const tw = t.offsetWidth, th = t.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2;
    let y = r.top - th - 14;
    let below = false;
    if (y < 8) { y = r.bottom + 14; below = true; }
    x = Math.max(8, Math.min(window.innerWidth - tw - 8, x));
    t.style.left = Math.round(x) + 'px';
    t.style.top = Math.round(y) + 'px';
    t.classList.toggle('below', below);
    /* the tail points back at whatever you are hovering */
    const tail = Math.max(14, Math.min(tw - 14, r.left + r.width / 2 - x));
    paintCloud(t, tail, below);
  }
  /* wear a generated pixel cloud as a background, sized to the box */
  function paintCloud(elm, tailAt, below, opts) {
    const w = elm.offsetWidth, h = elm.offsetHeight;
    if (!w || !h) return;
    const sig = w + 'x' + h + '|' + Math.round(tailAt) + '|' + (below ? 1 : 0);
    if (elm.dataset.cloud === sig) return;
    elm.dataset.cloud = sig;
    const cv = SPR.cloudBubble(w, h, tailAt, below, opts);
    elm.style.backgroundImage = 'url(' + cv.toDataURL() + ')';
    elm.style.backgroundSize = cv.width + 'px ' + cv.height + 'px';
  }
  function hideTip() { if (tipEl) { tipEl.hidden = true; } tipFor = null; }
  /* Titles are moved into data-tip the moment they enter the page, so the
     browser never gets a chance to draw its own thin grey tooltip. */
  function stripTitles(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.title) { root.dataset.tip = root.title; root.title = ''; }
    const kids = root.querySelectorAll ? root.querySelectorAll('[title]') : [];
    kids.forEach(n => { if (n.title) { n.dataset.tip = n.title; n.title = ''; } });
  }
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(stripTitles));
  }).observe(document.body, { childList: true, subtree: true });
  stripTitles(document.body);

  document.addEventListener('pointerover', ev => {
    const found = tipTextOf(ev.target);
    if (!found || !found.text) { hideTip(); return; }
    clearTimeout(tipT);
    tipT = setTimeout(() => showTip(found.el, found.text), 90);
  });
  document.addEventListener('pointerout', ev => { clearTimeout(tipT); hideTip(); });
  document.addEventListener('pointerdown', () => { clearTimeout(tipT); hideTip(); });

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
    /* two things arriving at once would print on top of each other, so
       stack them, and never let more than a handful be up at a time */
    while (fxLayer.children.length >= 5) fxLayer.firstChild.remove();
    let top = Math.round(sy);
    for (let i = 0; i < 8; i++) {
      const clash = Array.from(fxLayer.children).some(o =>
        Math.abs(parseInt(o.style.top, 10) - top) < 15 &&
        Math.abs(parseInt(o.style.left, 10) - Math.round(sx)) < 130);
      if (!clash) break;
      top -= 17;
    }
    const el = document.createElement('div');
    el.className = 'float-txt' + (cls ? ' ' + cls : '');
    if (icon) el.appendChild(mkIcon(icon, 2));
    const span = document.createElement('span');
    span.textContent = txt;
    el.appendChild(span);
    el.style.left = Math.round(sx) + 'px';
    el.style.top = top + 'px';
    fxLayer.appendChild(el);
    paintCloud(el, el.offsetWidth / 2, false);
    setTimeout(() => el.remove(), 1150);
  }
  function floatWorld(txt, wx, wy, cls, icon) {
    /* a number over the field means nothing while a panel covers the field */
    if (document.querySelector('.modal:not([hidden])')) return;
    const p = worldToScreen(wx, wy);
    if (p.x < -60 || p.x > innerWidth + 60) return;
    floatText(txt, p.x - 24, p.y - 10, cls, icon);
  }
  function toast(opts) {
    if (!GAME.setting('news')) return;
    while (toastBox.children.length >= 2) toastBox.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    if (opts.sprite) el.appendChild(opts.sprite);
    else if (opts.icon) el.appendChild(mkIcon(opts.icon, 3));
    const txt = document.createElement('div');
    if (opts.title) { const b = document.createElement('b'); b.textContent = opts.title; txt.appendChild(b); }
    if (opts.body) txt.appendChild(document.createTextNode(opts.body));
    el.appendChild(txt);
    toastBox.appendChild(el);
    paintCloud(el, el.offsetWidth - 26, false);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, opts.long ? 5000 : 2800);
  }

  /* ================= CANVAS & CAMERA ================= */
  const cv = $('#world');
  let ctx = cv.getContext('2d');   /* swapped temporarily when painting thumbnails */
  const mainCtx = ctx;
  /* how many screen pixels one world pixel gets. Measured from the window
     rather than fixed, so the stage fills whatever room there is and the
     page never has anything below the fold. */
  let SC = 3;
  /* fit the stage to the window: take the room the rail leaves, pick a
     whole-number zoom so pixels stay square, and set the camera's view
     from that. Called on load and whenever the window changes. */
  function sizeStage() {
    const row = $('#stage-row');
    if (!row) return false;
    const rs = row.getBoundingClientRect();
    if (rs.width < 40 || rs.height < 40) return false;
    const stacked = getComputedStyle(row).flexDirection === 'column';
    const rail = $('#siderail');
    const rr = rail && rail.offsetParent !== null ? rail.getBoundingClientRect() : null;
    const GAP = 10, BORD = 8;                    /* the stage's own border */
    const aw = Math.max(160, rs.width  - BORD - (!stacked && rr ? rr.width  + GAP : 0));
    const ah = Math.max(120, rs.height - BORD - ( stacked && rr ? rr.height + GAP : 0));
    /* the art is drawn for three screen pixels to a world pixel; drop to
       two only when the window is too narrow to show a field at three */
    const z = aw < 640 ? 2 : aw < 1560 ? 3 : 4;
    const vw = Math.max(120, Math.min(W.W, Math.floor(aw / z)));
    const vh = Math.max(100, Math.min(W.H, Math.floor(ah / z)));
    if (z === SC && vw === W.view.w && vh === W.view.h) return false;
    SC = z; W.view.w = vw; W.view.h = vh;
    cv.width = vw * z; cv.height = vh * z;
    cv.style.width = (vw * z) + 'px';
    cv.style.height = (vh * z) + 'px';
    ctx.imageSmoothingEnabled = false;
    GAME.clampCam();
    if (onStageResize) onStageResize();
    return true;
  }
  /* set once the title screen's own canvas exists */
  let onStageResize = null;
  sizeStage();

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
    const DRY = ['#93aa5c', '#a2ae68', '#afb974', '#bcc484', '#c8ce94'].map(rgb);
    const WATER = ['#3f9ec4', '#4fb0d6', '#63c1e2', '#2f86ad'].map(rgb);
    const TAR = ['#8f6438', '#9c7040', '#835a30', '#aa7d49'].map(rgb);
    const PAVE = ['#b2ab9c', '#c2bbab', '#a29a8c', '#cdc5b4'].map(rgb);
    const KERB = rgb('#8a8578'), KERB2 = rgb('#6e6a60');

    const nBig = makeNoise(11, 34, W.W, W.H);
    const nSml = makeNoise(29, 9, W.W, W.H);
    const nDirt = makeNoise(47, 7, W.W, W.H);

    /* dirt paths: polylines through the home plot */
    /* nothing is baked into the ground any more - no paths, no pond.
       Whatever crosses this valley, you painted it. */
    for (let y = 0; y < W.H; y++) {
      for (let x = 0; x < W.W; x++) {
        let c;
        if (y >= W.farY) {
          /* the far side: a stone footpath, then the town's own paving */
          const n = nSml(x, y);
          c = PAVE[n < 0.3 ? 2 : n < 0.6 ? 0 : n < 0.88 ? 1 : 3];
          if (y < W.farY + 3) c = y === W.farY ? KERB2 : KERB;
          else {
            /* flagstones: a joint every ten across, every eight down, offset per course */
            const row = ((y - W.farY - 3) / 8) | 0;
            if ((y - W.farY - 3) % 8 === 0 || (x + row * 5) % 10 === 0) c = PAVE[2];
          }
        } else if (y >= W.roadY) {
          /* two lanes of packed dirt, kerbed on both sides */
          const n = nSml(x, y);
          c = TAR[n < 0.3 ? 2 : n < 0.62 ? 0 : n < 0.9 ? 1 : 3];
          if (y < W.roadY + 3) c = y === W.roadY ? KERB2 : KERB;
          else if (y >= W.farY - 3) c = y === W.farY - 1 ? KERB2 : KERB;
          else if (y === W.roadY + 3 || y === W.farY - 4) c = rgb('#7a5230');
        } else {
          const v = nBig(x, y) * 0.68 + nSml(x, y) * 0.32;
          let idx = v < 0.36 ? 0 : v < 0.46 ? 1 : v < 0.60 ? 2 : v < 0.76 ? 3 : 4;
          /* dither between bands */
          if ((x + y) % 2 === 0 && Math.abs(v - 0.46) < 0.03) idx = 1;
          c = GRASS[idx];
          /* the home plot is scrubby and sun-bleached until you work it */
          const hp = PLOTS[PLOT_START];
          if (x >= hp.tc * 16 && x < (hp.tc + PLOT_W) * 16 && y >= hp.tr * 16 && y < (hp.tr + PLOT_H) * 16) {
            c = DRY[Math.min(DRY.length - 1, idx)];
            /* bald patches, from the same smooth noise the grass uses */
            const bare = nDirt(x, y) * 0.55 + nBig(x, y) * 0.45;
            if (bare > 0.755) c = DIRT[((x * 7 + y * 13) % 23) < 8 ? 0 : 2];
            else if (bare > 0.715 && (x + y) % 2 === 0) c = DIRT[2];
          }
        }
        put(x, y, c);
      }
    }
    g.putImageData(img, 0, 0);

    /* the gravel lay-by where customers pull up */
    {
      const L = W.layby;
      for (let y = L.y; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) {
        const edge = y === L.y || x === L.x || x === L.x + L.w - 1;
        const n = ((x * 31 + y * 17) % 11);
        g.fillStyle = edge ? '#8a7a5a' : n < 3 ? '#c9b48c' : n < 7 ? '#b8a37a' : '#a8946c';
        g.fillRect(x, y, 1, 1);
      }
      g.fillStyle = '#fff8ec';
      for (let x = L.x + 4; x < L.x + L.w - 4; x += 12) g.fillRect(x, L.y + 2, 6, 1);
    }
    /* road markings: a dashed line down the middle, ruts worn in each lane */
    const mid = W.roadY + Math.round(W.roadH / 2);
    g.fillStyle = 'rgba(255,240,200,.42)';
    for (let x = 8; x < W.W; x += 26) g.fillRect(x, mid - 1, 12, 2);
    g.fillStyle = 'rgba(120,86,44,.45)';
    [W.roadY + 10, W.roadY + 19, mid + 9, mid + 18].forEach(ry => {
      for (let x = 0; x < W.W; x += 2) g.fillRect(x + (ry % 4 ? 1 : 0), ry, 1, 1);
    });
    /* a worn white line just inside each kerb */
    g.fillStyle = 'rgba(255,246,220,.30)';
    for (let x = 0; x < W.W; x++) {
      if ((x * 7 + 3) % 11 === 0) continue;
      g.fillRect(x, W.roadY + 5, 1, 1);
      g.fillRect(x, W.farY - 6, 1, 1);
    }
    /* the odd patch of repair and a drain by the kerb */
    for (let i = 0; i < 7; i++) {
      const px0 = Math.floor(rndG() * (W.W - 40)), py0 = W.roadY + 8 + Math.floor(rndG() * 26);
      g.fillStyle = 'rgba(70,52,30,.22)';
      g.fillRect(px0, py0, 18 + Math.floor(rndG() * 20), 5 + Math.floor(rndG() * 6));
    }
    for (let x = 60; x < W.W; x += 210) {
      g.fillStyle = '#5a5650'; g.fillRect(x, W.farY - 8, 12, 5);
      g.fillStyle = '#7a756c'; g.fillRect(x + 1, W.farY - 7, 10, 3);
      g.fillStyle = '#4a463f';
      for (let i = 0; i < 4; i++) g.fillRect(x + 2 + i * 2, W.farY - 7, 1, 3);
    }
    /* grit and puddles at the kerbs */
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(rndG() * W.W);
      g.fillStyle = rndG() < 0.5 ? 'rgba(90,66,34,.35)' : 'rgba(220,200,160,.35)';
      g.fillRect(x, W.roadY + 4 + Math.floor(rndG() * 3), 1 + (rndG() < 0.3 ? 1 : 0), 1);
      g.fillRect(x, W.farY - 6 - Math.floor(rndG() * 3), 1 + (rndG() < 0.3 ? 1 : 0), 1);
    }
    /* the town on the far side */
    buildFarSide(g);

    /* grass blades everywhere */
    for (let i = 0; i < 7000; i++) {
      const x = Math.floor(rndG() * W.W), y = Math.floor(rndG() * (W.roadY - 6)) + 4;
      const hp2 = PLOTS[PLOT_START];
      if (x >= hp2.tc * 16 && x < (hp2.tc + PLOT_W) * 16 && y >= hp2.tr * 16 && rndG() < 0.55) continue;
      g.fillStyle = rndG() < 0.5 ? 'rgba(96,160,60,.55)' : 'rgba(150,214,110,.5)';
      g.fillRect(x, y, 1, 2);
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


    /* fences: pretty picket for owned, weathered for locked */
    PLOTS.forEach(p => { if (!S().plots[p.id]) lockedPlot(g, p); });
    GAME.dirty.ground = false;
  }

  /* ============================================================
     THE PAINTED LAYER
     The paint grid is 8px cells, but nothing is drawn as a cell.
     Every pixel asks its neighbourhood how much of each kind
     covers it, and the answer is thresholded with a dither, so a
     brush stroke comes out as a soft organic shape rather than a
     staircase. Only the region under the brush is redrawn.
     ============================================================ */
  const TERR_LIFT = 8;                  /* headroom above the world for raised ground */
  let terrCv = null, terrCtx = null, terrImg = null, terrDirty = true;
  const CP = 8;

  function coverAt(px, py, kind) {
    /* weighted vote of the 3x3 cells around this pixel */
    const fx = px / CP, fy = py / CP;
    const c0 = Math.floor(fx), r0 = Math.floor(fy);
    let hit = 0, tot = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = c0 + dx, cy = r0 + dy;
      const d = Math.hypot((cx + 0.5) - fx, (cy + 0.5) - fy);
      const w = Math.max(0, 1.45 - d);
      if (w <= 0) continue;
      tot += w;
      if (GAME.S.paint[cx + ',' + cy] === kind) hit += w;
    }
    return tot > 0 ? hit / tot : 0;
  }
  function topKindAt(px, py) {
    const fx = Math.floor(px / CP), fy = Math.floor(py / CP);
    const seen = {};
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const k = GAME.S.paint[(fx + dx) + ',' + (fy + dy)];
      if (k) seen[k] = 1;
    }
    return Object.keys(seen);
  }
  const hash2 = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };

  /* the paint pots: each returns a colour for a pixel */
  const PAINT = {
    /* a walked path is pale, dusty and dry - deliberately a long way off
       the dark turned earth of a ploughed field, so a track crossing a
       field still reads as a track */
    path: (x, y, edge) => {
      const n = hash2(x * 0.7, y * 0.7);
      if (edge) return n < 0.5 ? '#d6bd94' : '#c9ae84';
      const grit = hash2(Math.floor(x / 2) * 2.9, Math.floor(y / 2) * 3.7);
      if (grit < 0.06) return '#a8916c';
      return n < 0.25 ? '#c2a87e' : n < 0.6 ? '#cdb489' : n < 0.88 ? '#d9c197' : '#e4cfa8';
    },
    stone: (x, y, edge) => {
      /* flagstones cut by mortar lines that wander a little */
      const gx = Math.floor((x + Math.sin(y * 0.21) * 2) / 9), gy = Math.floor((y + Math.sin(x * 0.19) * 2) / 7);
      const mort = ((x + Math.round(Math.sin(y * 0.21) * 2)) % 9 === 0) || ((y + Math.round(Math.sin(x * 0.19) * 2)) % 7 === 0);
      if (mort) return '#8a8578';
      const n = hash2(gx, gy);
      const base = n < 0.25 ? '#c9c4b4' : n < 0.5 ? '#bdb8a8' : n < 0.75 ? '#d2cdbd' : '#b5b0a0';
      if (edge) return '#9a9488';
      return hash2(x, y) < 0.10 ? SPR.darken(base, 0.12) : base;
    },
    water: (x, y, edge, depth) => {
      if (edge) return hash2(x, y) < 0.5 ? '#e0cb98' : '#d6bd88';
      const n = hash2(x * 0.6, y * 0.6);
      if (depth < 0.62) return n < 0.5 ? '#63c1e2' : '#4fb0d6';
      return n < 0.2 ? '#2a7ba0' : n < 0.62 ? '#2f86ad' : '#3f9ec4';
    },
    high: (x, y, edge) => {
      const n = hash2(x * 0.8, y * 0.8);
      if (edge) return '#5b9636';
      return n < 0.2 ? '#6ab04c' : n < 0.55 ? '#7fc44f' : n < 0.85 ? '#8ecf5b' : '#9ada66';
    },
    /* ploughed earth. broken clods, with just a hint of the plough line
       showing through - strong regular furrows read as corrugated card,
       so the wave is shallow and the speckle does most of the work. */
    soil: (x, y, edge) => {
      if (edge) return hash2(x, y) < 0.5 ? '#8a6034' : '#7a5230';
      const n = hash2(x * 0.85, y * 0.85);
      const clod = hash2(Math.floor(x / 3) * 1.7, Math.floor(y / 2) * 2.3);
      const fur = Math.sin((y + Math.sin(x * 0.09) * 3.4 + hash2(x * 0.2, 0) * 2) * 0.42);
      const drift = hash2(Math.floor(x / 11) * 3.1, Math.floor(y / 9) * 4.7);
      let t = clod * 0.50 + n * 0.24 + fur * 0.09 + drift * 0.17;
      if (t < 0.22) return '#6e4a28';
      if (t < 0.40) return '#7f5732';
      if (t < 0.56) return '#8d6339';
      if (t < 0.72) return '#9a6e40';
      if (t < 0.88) return '#a87a49';
      return '#b58755';
    },
  };
  const CLIFF = (x, y, t) => {
    const n = hash2(x * 0.9, y * 1.3);
    if (t < 0.16) return '#b98a52';
    if (n < 0.18) return '#a8783f';
    if (n < 0.34) return '#7d5626';
    return '#93672f';
  };

  function ensureTerrain() {
    if (terrCv) return;
    terrCv = SPR.newCanvas(W.W, W.H + TERR_LIFT);
    terrCtx = terrCv.getContext('2d');
    terrCtx.imageSmoothingEnabled = false;
  }
  /* redraw a rectangle of the layer straight into an ImageData buffer */
  function repaintRegion(x0, y0, x1, y1) {
    ensureTerrain();
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(W.W, Math.ceil(x1)); y1 = Math.min(W.H + TERR_LIFT, Math.ceil(y1));
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const img = terrCtx.createImageData(w, h);
    const d = img.data;
    const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    const cache = {};
    const col = hex => cache[hex] || (cache[hex] = rgb(hex));
    for (let py = y0; py < y1; py++) {
      /* the layer is drawn TERR_LIFT lower than the world so raised ground
         has somewhere to stand up into */
      const wy = py - TERR_LIFT;
      for (let px = x0; px < x1; px++) {
        const i = ((py - y0) * w + (px - x0)) * 4;
        let put = null;

        /* raised ground first: it lifts, and drops a bank below itself */
        const hUp = coverAt(px, wy + TERR_LIFT, 'high');
        if (hUp > 0.5 || (hUp > 0.33 && ((px + wy) % 2 === 0))) {
          put = PAINT.high(px, wy, hUp <= 0.62);
        } else {
          /* the cut bank under the lifted grass */
          let bank = 0;
          for (let k = 1; k <= TERR_LIFT + 3; k++) {
            const c2 = coverAt(px, wy + TERR_LIFT - k, 'high');
            if (c2 > 0.5) { bank = k; break; }
          }
          if (bank) put = CLIFF(px, wy, bank / (TERR_LIFT + 3));
        }

        if (!put) {
          const kinds = topKindAt(px, wy);
          let bestK = null, bestC = 0;
          for (let n = 0; n < kinds.length; n++) {
            if (kinds[n] === 'high') continue;
            const c2 = coverAt(px, wy, kinds[n]);
            if (c2 > bestC) { bestC = c2; bestK = kinds[n]; }
          }
          if (bestK) {
            const solid = bestC > 0.52;
            const fringe = bestC > 0.34 && ((px * 3 + wy * 5) % 4 < 2 || hash2(px, wy) < 0.4);
            if (solid || fringe) {
              const edge = !solid || bestC < 0.66;
              put = PAINT[bestK](px, wy, edge, bestC);
            }
          }
        }
        if (put) {
          const c3 = col(put);
          d[i] = c3[0]; d[i + 1] = c3[1]; d[i + 2] = c3[2]; d[i + 3] = 255;
        }
      }
    }
    terrCtx.clearRect(x0, y0, w, h);
    terrCtx.putImageData(img, x0, y0);
  }
  function rebuildTerrain() {
    ensureTerrain();
    terrCtx.clearRect(0, 0, terrCv.width, terrCv.height);
    /* only bother with the rows that actually have paint in them */
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const k in GAME.S.paint) {
      const [cx, cy] = k.split(',').map(Number);
      minX = Math.min(minX, cx * CP); maxX = Math.max(maxX, cx * CP + CP);
      minY = Math.min(minY, cy * CP); maxY = Math.max(maxY, cy * CP + CP);
    }
    terrDirty = false;
    if (maxX < minX) return;
    repaintRegion(minX - 12, minY - 12, maxX + 12, maxY + TERR_LIFT + 14);
  }
  function terrainTouched(x0, y0, x1, y1, radius) {
    ensureTerrain();
    const pad = radius + 14;
    repaintRegion(Math.min(x0, x1) - pad, Math.min(y0, y1) - pad,
                  Math.max(x0, x1) + pad, Math.max(y0, y1) + pad + TERR_LIFT + 6);
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
      /* HOME is a blank canvas: not a tree, not a rock, not a blade.
         Everything on this plot is something you put there. */
      case 'home': break;
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
      case 'birch': place('tree', 6, true); place('tuft', 11); place('flower', 6); place('shroom', 3); break;
      case 'highland': place('rock', 14); place('pine', 5, true); place('tuft', 6); place('stump', 3); break;
      default: place('tuft', 12); place('flower', 5); place('bush', 3); break;
    }
  }

  function lockedPlot(g, p) {
    const x0 = p.tc * 16, y0 = p.tr * 16, w = PLOT_W * 16;
    /* the bottom row of plots runs past the kerb; nobody's fence and
       nobody's weeds belong on the tarmac, so stop the plot there */
    const h = Math.min(p.tr * 16 + PLOT_H * 16, W.roadY) - y0;
    if (h <= 16) return;
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

  /* ============================================================
     THE OTHER SIDE OF THE ROAD
     Your land stops at the kerb. Across the tarmac is the edge of
     Cluckton: shop fronts with lit windows and awnings, a bus
     shelter for the tourists, lamps, planters and a hoarding that
     is not yours. Baked into the ground once, like the scenery.
     ============================================================ */
  function buildFarSide(g) {
    const rnd = SPR.mulberry(20260907);
    const groundY = W.H - 2;              /* where the town stands */
    const pathY = W.farY + 14;            /* the back of the footpath */
    /* the footpath's back edge, and the shade the frontage casts on it */
    g.fillStyle = '#9b9b90'; g.fillRect(0, pathY, W.W, 1);
    g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(0, pathY + 1, W.W, 2);
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, groundY - 1, W.W, 3);
    g.fillStyle = '#6e6a60'; g.fillRect(0, W.H - 2, W.W, 2);
    let x = -12;
    let slot = 0;
    while (x < W.W + 8) {
      const roll = rnd();
      if (slot % 5 === 4 && roll < 0.7) {
        /* a break in the terrace: the bus stop, or a hoarding, or a tree */
        const pick = rnd();
        if (pick < 0.4) {
          const sh = SPR.shelterSprite(1);
          g.drawImage(sh, Math.round(x + 4), groundY - sh.height);
          shadow(g, x + 4 + sh.width / 2, groundY, sh.width * 0.4);
          /* a bus stop flag on the kerb */
          g.fillStyle = '#3a3a4a'; g.fillRect(Math.round(x + sh.width + 8), W.farY + 4, 2, 14);
          g.fillStyle = '#2e2216'; g.fillRect(Math.round(x + sh.width + 4), W.farY, 10, 6);
          g.fillStyle = '#3fa7d6'; g.fillRect(Math.round(x + sh.width + 5), W.farY + 1, 8, 4);
          x += sh.width + 20;
        } else if (pick < 0.72) {
          /* somebody else's advertising */
          const bb = SPR.billboardSprite(SPR.billboardPreset('sale'), 1, false);
          g.drawImage(bb, Math.round(x + 6), groundY - bb.height);
          shadow(g, x + 6 + bb.width / 2, groundY, bb.width * 0.36);
          x += bb.width + 16;
        } else {
          const t = SPR.decoSprite(rnd() < 0.5 ? 'tree' : 'pine', 1, Math.floor(rnd() * 9999));
          g.drawImage(t, Math.round(x + 6), groundY - t.height);
          shadow(g, x + 6 + t.width / 2, groundY, t.width * 0.34);
          x += t.width + 14;
        }
      } else {
        const kind = roll < 0.22 ? 'shed' : roll < 0.5 ? 'wide' : 'shop';
        const spr = SPR.townSprite(kind, Math.floor(rnd() * 9999), 1);
        g.drawImage(spr, Math.round(x), groundY - spr.height);
        shadow(g, x + spr.width / 2, groundY, spr.width * 0.3);
        x += spr.width + 2 + Math.floor(rnd() * 5);
      }
      slot++;
    }
    /* street furniture along the footpath */
    for (let lx = 26; lx < W.W; lx += 96 + Math.floor(rnd() * 40)) {
      const lamp = SPR.furnitureSprite('lamp', Math.floor(rnd() * 900), 1);
      g.drawImage(lamp, Math.round(lx), W.farY + 12 - lamp.height + 6);
      g.fillStyle = 'rgba(40,40,30,.22)'; g.fillRect(Math.round(lx), W.farY + 16, 8, 2);
      if (rnd() < 0.5) {
        const kind = rnd() < 0.5 ? 'mailbox' : 'planter';
        const f = SPR.furnitureSprite(kind, Math.floor(rnd() * 900), 1);
        g.drawImage(f, Math.round(lx + 34), W.farY + 14 - f.height + 4);
      }
    }
  }
  /* the lamps come on over the town at runtime, so they can flicker */
  function drawFarSide(now) {
    if (cam().y + W.view.h < W.farY - 8) return;
    const t0 = Math.floor(now / 520);
    for (let lx = 26, i = 0; lx < W.W; lx += 96, i++) {
      if (lx < cam().x - 30 || lx > cam().x + W.view.w + 30) continue;
      const on = (i + t0) % 23 !== 0;
      /* a dithered cone of light spilling onto the footpath */
      ctx.fillStyle = on ? 'rgba(255,232,150,.20)' : 'rgba(255,232,150,.06)';
      for (let dy = 0; dy < 16; dy++) {
        const half = 2 + Math.round(dy * 0.55);
        for (let dx = -half; dx <= half; dx++) {
          if ((dx + dy + i) % 2 && dy > 4) continue;
          ctx.fillRect(lx + 4 + dx, W.farY - 3 + dy, 1, 1);
        }
      }
      ctx.fillStyle = on ? '#fff3c4' : '#8a8f98';
      ctx.fillRect(lx + 2, W.farY - 14, 4, 3);
    }
  }

  /* ============================================================
     PARTICLES AND SCREEN FEEL
     One flat array of particles, each with a type that says how to
     draw it, plus three screen-wide effects (shake, flash, a hit
     freeze) that everything else borrows to land a punch. All of it
     is off when the particles setting is off, except the numbers,
     which are information rather than decoration.
     ============================================================ */
  let parts = [];
  const PCAP = 640;                          /* a ceiling, so a long chain never stutters */
  function pOn() { return GAME.setting('particles'); }
  function P(p) { if (parts.length < PCAP) parts.push(p); }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];

  /* --- squares of dust, the old faithful --- */
  function puff(x, y, col, n, spread, up) {
    if (!pOn()) return;
    for (let i = 0; i < n; i++) {
      P({ type: 'px', x: x + rnd(-3, 3), y: y + rnd(-2, 2),
        vx: rnd(-0.5, 0.5) * (spread || 30), vy: -(up || 26) - Math.random() * 18,
        g: 90, drag: 1.2, t: 0, life: rnd(0.5, 0.9), col, s: Math.random() < 0.4 ? 2 : 1 });
    }
  }
  /* --- hot sparks with a trail: hammering, machinery, impacts --- */
  function sparks(x, y, n, col, spread) {
    if (!pOn()) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rnd(0.35, 1) * (spread || 90);
      P({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        g: 220, drag: 2.4, t: 0, life: rnd(0.22, 0.46), col: col || '#ffd23f' });
    }
  }
  /* --- smoke that grows as it climbs --- */
  function smoke(x, y, n, col, rise) {
    if (!pOn()) return;
    for (let i = 0; i < n; i++) {
      P({ type: 'smoke', x: x + rnd(-3, 3), y, vx: rnd(-6, 6), vy: -(rise || 12) - Math.random() * 10,
        g: -4, t: 0, life: rnd(0.8, 1.6), col: col || 'rgba(226,226,232,1)', s: rnd(2, 4), grow: rnd(3, 7) });
    }
  }
  /* --- feathers, which flutter instead of falling --- */
  function feathers(x, y, n, col) {
    if (!pOn()) return;
    for (let i = 0; i < n; i++) {
      P({ type: 'feather', x: x + rnd(-5, 5), y: y + rnd(-4, 2), vx: rnd(-16, 16), vy: rnd(-46, -18),
        g: 42, drag: 1.6, t: 0, life: rnd(1.1, 2.0), col: col || pick(['#fff8ec', '#f2e6cf', '#e8dcc0']),
        ph: Math.random() * 6, wob: rnd(10, 22) });
    }
  }
  /* --- a ring of twinkles: something good just happened --- */
  function twinkles(x, y, n, col, r) {
    if (!pOn()) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random();
      const rr = (r || 12) * rnd(0.6, 1.15);
      P({ type: 'star', x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.6,
        vx: Math.cos(a) * 10, vy: Math.sin(a) * 6 - 8, g: 0, t: 0, life: rnd(0.4, 0.8),
        col: col || '#fff8ec', s: Math.random() < 0.4 ? 3 : 2 });
    }
  }
  /* --- chips of something solid, tumbling --- */
  function shards(x, y, n, col, spread) {
    if (!pOn()) return;
    for (let i = 0; i < n; i++) {
      P({ type: 'shard', x, y, vx: rnd(-1, 1) * (spread || 60), vy: rnd(-70, -26),
        g: 260, t: 0, life: rnd(0.5, 0.95), col: col || '#8a5e2a',
        w: 2 + ((Math.random() * 2) | 0), h: 1 + ((Math.random() * 3) | 0), spin: rnd(-14, 14) });
    }
  }
  /* --- an expanding ring, flattened to sit on the ground plane --- */
  function ring(x, y, col, r1, life, thick) {
    if (!pOn()) return;
    P({ type: 'ring', x, y, vx: 0, vy: 0, g: 0, t: 0, life: life || 0.34,
      col: col || 'rgba(255,255,255,1)', r1: r1 || 26, th: thick || 1 });
  }
  /* --- a four-point sparkle that pops and goes --- */
  function glint(x, y, col, size) {
    if (!pOn()) return;
    P({ type: 'glint', x, y, vx: 0, vy: -6, g: 0, t: 0, life: 0.34, col: col || '#fff8ec', s: size || 4 });
  }
  /* --- dust kicked sideways along the ground --- */
  function groundDust(x, y, n, col) {
    if (!pOn()) return;
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      P({ type: 'px', x: x + rnd(-2, 2), y: y + rnd(-1, 1), vx: side * rnd(24, 74), vy: rnd(-16, -2),
        g: 40, drag: 3.2, t: 0, life: rnd(0.3, 0.6), col: col || '#c9a878', s: Math.random() < 0.5 ? 2 : 1 });
    }
  }
  /* --- bubbles, for anything that boils or brews --- */
  function bubbles(x, y, n, col) {
    if (!pOn()) return;
    for (let i = 0; i < n; i++) {
      P({ type: 'bubble', x: x + rnd(-4, 4), y, vx: rnd(-3, 3), vy: rnd(-22, -10), g: 0,
        t: 0, life: rnd(0.5, 1.0), col: col || '#aee7ff', s: 1 + ((Math.random() * 2) | 0), ph: Math.random() * 6 });
    }
  }
  /* --- a column of light: something arrived --- */
  function beam(x, y, col, h, life) {
    P({ type: 'beam', x, y, vx: 0, vy: 0, g: 0, t: 0, life: life || 0.7, col: col || '#ffd23f', h: h || 60 });
  }
  /* --- a sprite that flies off and pops: whatever you just picked up --- */
  function fly(canvas, x, y, opts) {
    if (!pOn() || !canvas) return;
    const o = opts || {};
    P({ type: 'spr', cv: canvas, x, y, vx: o.vx === undefined ? rnd(-14, 14) : o.vx,
      vy: o.vy === undefined ? -58 : o.vy, g: o.g === undefined ? 40 : o.g, drag: 1.1,
      t: 0, life: o.life || 0.5, spin: o.spin === undefined ? rnd(-5, 5) : o.spin,
      s0: o.s0 || 1, s1: o.s1 === undefined ? 1.7 : o.s1 });
  }

  /* --- a number in the world, in the game's own type --- */
  function popNum(x, y, txt, col) {
    P({ type: 'num', x, y, vx: rnd(-10, 10), vy: -46, g: 96, drag: 1.2, t: 0, life: 1.0,
      col: col || '#fff8ec', txt: String(txt) });
  }
  function heart(x, y, n) {
    if (!pOn()) return;
    for (let i = 0; i < (n || 2); i++) {
      P({ type: 'heart', x: x + rnd(-6, 6), y: y - 4, vx: rnd(-4, 4), vy: rnd(-22, -14),
        g: 0, drag: 0.6, t: 0, life: 1.0, col: '#ff5f9e', s: 1 });
    }
  }
  function shellBurst(x, y, tier) {
    const col = EGG_SHELL[Math.min(tier, EGG_SHELL.length - 1)];
    shards(x, y, 7, col, 70);
    puff(x, y, '#ffffff', 4, 30, 34);
    ring(x, y, 'rgba(255,255,255,1)', 20, 0.3);
  }
  function coinBurst(x, y, n) {
    if (!pOn()) return;
    for (let i = 0; i < Math.min(n, 16); i++) {
      P({ type: 'coin', x, y, vx: rnd(-1, 1) * 56, vy: rnd(-78, -40),
        g: 220, t: 0, life: rnd(0.6, 1.0), col: '#ffd23f', ph: Math.random() * 6 });
    }
  }
  /* --- the all-purpose hit: a ring, a spray of sparks, dust below --- */
  function impact(x, y, col, big) {
    ring(x, y, 'rgba(255,255,255,1)', big ? 40 : 22, big ? 0.4 : 0.28, big ? 2 : 1);
    sparks(x, y, big ? 12 : 6, col, big ? 130 : 90);
    groundDust(x, y + 4, big ? 8 : 4);
  }

  const HEART_PX = [[1,0],[3,0],[0,1],[1,1],[2,1],[3,1],[4,1],[1,2],[2,2],[3,2],[2,3]];
  const FEATHER_PX = [[1,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2],[1,3],[1,4]];
  function drawParts(dt) {
    parts = parts.filter(p => (p.t += dt) < p.life);
    for (const p of parts) {
      p.vy += (p.g || 0) * dt;
      if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
      const ox = p.x, oy = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const f = p.t / p.life;
      ctx.globalAlpha = Math.max(0, 1 - f * f);
      const X = Math.round(p.x), Y = Math.round(p.y);
      switch (p.type) {
        case 'heart':
          ctx.fillStyle = p.col;
          HEART_PX.forEach(([hx, hy]) => ctx.fillRect(X + hx, Y + hy, 1, 1));
          ctx.fillStyle = '#ffb0d0'; ctx.fillRect(X + 1, Y + 1, 1, 1);
          break;
        case 'coin': {
          /* it flips as it flies */
          const w = 1 + Math.round(Math.abs(Math.cos(p.t * 15 + p.ph)) * 2);
          ctx.fillStyle = '#8a6410'; ctx.fillRect(X, Y, w, 4);
          ctx.fillStyle = '#ffd23f'; ctx.fillRect(X, Y, w, 3);
          ctx.fillStyle = '#fff2b0'; ctx.fillRect(X, Y, Math.min(w, 1), 1);
          break;
        }
        case 'spark': {
          /* a short streak back along its own path, hottest at the head */
          ctx.fillStyle = p.col;
          ctx.fillRect(X, Y, 1, 1);
          const bx = Math.round(ox), by = Math.round(oy);
          if (bx !== X || by !== Y) { ctx.globalAlpha *= 0.6; ctx.fillRect(bx, by, 1, 1); }
          ctx.globalAlpha = Math.max(0, 1 - f * f);
          if (f < 0.35) { ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y, 1, 1); }
          break;
        }
        case 'smoke': {
          const s = Math.max(1, Math.round(p.s + f * p.grow));
          ctx.globalAlpha *= 0.62;
          ctx.fillStyle = p.col;
          ctx.fillRect(X - (s >> 1), Y - (s >> 1), s, s);
          ctx.fillRect(X - (s >> 1) - 1, Y - (s >> 1) + 1, s + 2, Math.max(1, s - 2));
          break;
        }
        case 'feather': {
          const wob = Math.sin(p.t * 6 + p.ph) * p.wob;
          ctx.fillStyle = p.col;
          FEATHER_PX.forEach(([hx, hy]) => ctx.fillRect(X + Math.round(wob * 0.1) + hx, Y + hy, 1, 1));
          ctx.fillStyle = 'rgba(140,130,110,.5)'; ctx.fillRect(X + Math.round(wob * 0.1) + 1, Y + 2, 1, 2);
          break;
        }
        case 'star': {
          const s = Math.max(1, Math.round(Math.sin(Math.min(1, f * 1.2) * Math.PI) * p.s) || 1);
          ctx.fillStyle = p.col;
          ctx.fillRect(X - s, Y, s * 2 + 1, 1);
          ctx.fillRect(X, Y - s, 1, s * 2 + 1);
          break;
        }
        case 'shard': {
          ctx.save();
          ctx.translate(X, Y); ctx.rotate(p.t * p.spin);
          ctx.fillStyle = '#171420'; ctx.fillRect(-p.w / 2 - 1, -p.h / 2 - 1, p.w + 2, p.h + 2);
          ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
          break;
        }
        case 'ring': {
          const r = 2 + Math.pow(f, 0.6) * p.r1;              /* fast out, then eases */
          ctx.globalAlpha = Math.max(0, 1 - f);
          const steps = Math.max(12, Math.round(r * 2));
          ctx.fillStyle = p.col;
          for (let i = 0; i < steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            ctx.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r * 0.55), p.th, p.th);
          }
          if (f < 0.3) {                                      /* a hot inner ring while it is young */
            ctx.globalAlpha = (1 - f / 0.3) * 0.8;
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < steps; i += 2) {
              const a = (i / steps) * Math.PI * 2;
              ctx.fillRect(Math.round(p.x + Math.cos(a) * r * 0.7), Math.round(p.y + Math.sin(a) * r * 0.39), 1, 1);
            }
          }
          break;
        }
        case 'glint': {
          const s = Math.max(1, Math.round(Math.sin(f * Math.PI) * p.s));
          ctx.fillStyle = p.col;
          ctx.fillRect(X - s, Y, s * 2 + 1, 1); ctx.fillRect(X, Y - s, 1, s * 2 + 1);
          ctx.fillRect(X - 1, Y - 1, 3, 3);
          break;
        }
        case 'bubble': {
          const wob = Math.sin(p.t * 8 + p.ph) * 3;
          const s = p.s;
          ctx.fillStyle = p.col;
          ctx.fillRect(X + Math.round(wob), Y, s + 1, 1);
          ctx.fillRect(X + Math.round(wob) - 1, Y + 1, 1, s);
          ctx.fillRect(X + Math.round(wob) + s + 1, Y + 1, 1, s);
          ctx.fillRect(X + Math.round(wob), Y + s + 1, s + 1, 1);
          break;
        }
        case 'beam': {
          const a0 = Math.sin(Math.min(1, f * 1.5) * Math.PI);
          for (let i = 0; i < p.h; i++) {
            const t = i / p.h;
            const wd = 3 + Math.round(t * 9);
            ctx.globalAlpha = a0 * (1 - t) * 0.55;
            ctx.fillStyle = p.col;
            ctx.fillRect(X - (wd >> 1), Y - i, wd, 1);
            if (t < 0.5) { ctx.globalAlpha = a0 * (1 - t * 2) * 0.7; ctx.fillStyle = '#ffffff'; ctx.fillRect(X - 1, Y - i, 2, 1); }
          }
          break;
        }
        case 'spr': {
          const sc = p.s0 + (p.s1 - p.s0) * f;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.t * p.spin * 0.4);
          ctx.scale(sc, sc);
          ctx.drawImage(p.cv, -p.cv.width / 2, -p.cv.height / 2);
          ctx.restore();
          break;
        }
        case 'num': {
          /* it pops out, holds, then goes: bigger for the first beat */
          const kk = f < 0.12 ? 2 : 1;
          const w = SPR.tinyW(p.txt, kk);
          SPR.drawTiny(ctx, p.txt, X - ((w / 2) | 0), Y, p.col, kk, '#171420');
          break;
        }
        default:
          ctx.fillStyle = p.col;
          ctx.fillRect(X, Y, p.s, p.s);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---- screen feel: a shake, a flash, and a held frame ---- */
  let shk = { t: 0, dur: 0, mag: 0 };
  function shake(mag, dur) {
    if (!pOn()) return;
    if (mag * 1.0 < shk.mag * (1 - shk.t / (shk.dur || 1))) return;   /* never soften a bigger one */
    shk = { t: 0, dur: dur || 0.24, mag };
  }
  function shakeOff() {
    if (shk.t >= shk.dur) return [0, 0];
    const f = 1 - shk.t / shk.dur;
    const m = shk.mag * f * f;
    return [Math.round(Math.sin(shk.t * 92) * m), Math.round(Math.sin(shk.t * 71 + 1.7) * m * 0.7)];
  }
  let hold = 0, realDt = 0.016;
  function holdFrame(s) { if (pOn()) hold = Math.max(hold, s || 0.06); }
  let fla = null;
  function flash(col, a, dur) { if (pOn()) fla = { col, a, dur: dur || 0.2, t: 0 }; }
  function drawFlash(dt) {
    if (!fla) return;
    fla.t += dt;
    if (fla.t >= fla.dur) { fla = null; return; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = fla.a * (1 - fla.t / fla.dur);
    ctx.fillStyle = fla.col;
    ctx.fillRect(0, 0, cv.width, cv.height);
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
    /* while the basket has hold of it, it stretches toward the cursor */
    const pulling = ptr.down && ptr.inside && S().tool === 'basket' &&
                    Math.hypot(ptr.x - e.x, ptr.y - e.y) < GAME.scoopR();
    ctx.fillStyle = 'rgba(40,58,26,.26)';
    ctx.fillRect(Math.round(e.x - 3), Math.round(e.y - 1), 7, 2);
    ctx.fillRect(Math.round(e.x - 4), Math.round(e.y - 2), 9, 1);
    if (pulling) {
      const d = Math.hypot(ptr.x - e.x, ptr.y - e.y) || 1;
      const lean = Math.min(1, (1 - d / GAME.scoopR()) * 1.4);
      ctx.save();
      ctx.translate(Math.round(e.x), Math.round(e.y + e.z));
      ctx.rotate(Math.atan2(ptr.y - e.y, ptr.x - e.x) * 0.12 * lean);
      ctx.scale(1 - lean * 0.1, 1 + lean * 0.14);
      ctx.drawImage(spr, -5, -12);
      ctx.restore();
      if (Math.floor(now / 90) % 3 === 0) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(Math.round(e.x - 1), Math.round(e.y - 14 + e.z), 1, 1); }
    } else ctx.drawImage(spr, Math.round(e.x - 5), Math.round(e.y - 12 + e.z));
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
  /* ---- the polisher: a 1x1 buffing wheel that sits in a belt line ---- */
  function drawPolisher(c, r, po, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.24)'; ctx.fillRect(x + 3, y + 14, 10, 2);
    ctx.fillStyle = '#2e3238'; ctx.fillRect(x + 1, y + 3, 14, 11);
    ctx.fillStyle = '#7f8894'; ctx.fillRect(x + 2, y + 4, 12, 9);
    ctx.fillStyle = '#a9b2bd'; ctx.fillRect(x + 2, y + 4, 12, 2);
    ctx.fillStyle = '#5a626e'; ctx.fillRect(x + 2, y + 11, 12, 2);
    /* the wheel, spinning */
    const sp = Math.floor(now / 90) % 4;
    ctx.fillStyle = '#23262b'; ctx.fillRect(x + 4, y + 6, 8, 5);
    ctx.fillStyle = '#ffe9a8';
    for (let i = 0; i < 4; i++) if ((i + sp) % 4 < 2) ctx.fillRect(x + 5 + i * 2, y + 7, 1, 3);
    /* a sparkle popping off the top */
    if (Math.floor(now / 220) % 3 === 0) {
      ctx.fillStyle = '#fff8ec';
      ctx.fillRect(x + 7, y + 1, 2, 1); ctx.fillRect(x + 8, y, 1, 1);
    }
    ctx.fillStyle = '#3d434e'; ctx.fillRect(x + 2, y + 14, 3, 2); ctx.fillRect(x + 11, y + 14, 3, 2);
  }

  /* ---- the grader: a 2x1 line that lifts the odd egg a whole tier ---- */
  function drawGrader(c, r, g, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.24)'; ctx.fillRect(x + 3, y + 14, 26, 3);
    ctx.fillStyle = '#2a2f36'; ctx.fillRect(x + 1, y + 2, 30, 12);
    ctx.fillStyle = '#8d949e'; ctx.fillRect(x + 2, y + 3, 28, 10);
    ctx.fillStyle = '#c2c9d2'; ctx.fillRect(x + 2, y + 3, 28, 2);
    ctx.fillStyle = '#5a626e'; ctx.fillRect(x + 2, y + 11, 28, 2);
    /* graded slots lighting up in sequence */
    ctx.fillStyle = '#20242a'; ctx.fillRect(x + 4, y + 5, 24, 5);
    const step = Math.floor(now / 160) % 6;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i === step ? '#7ce8a0' : i < step ? '#3f7a52' : '#2c3138';
      ctx.fillRect(x + 5 + i * 4, y + 6, 3, 3);
    }
    /* a little grading arm sweeping the top */
    const ax = x + 4 + ((Math.floor(now / 130) % 12) * 2);
    ctx.fillStyle = '#ffc72f'; ctx.fillRect(ax, y, 2, 3);
    ctx.fillStyle = '#3d434e'; ctx.fillRect(x + 3, y + 14, 3, 2); ctx.fillRect(x + 26, y + 14, 3, 2);
  }

  /* ---- the dynamo: a 2x2 flywheel that drives everything nearby ---- */
  function drawDynamo(c, r, dy, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(x + 3, y + 28, 26, 3);
    /* housing */
    ctx.fillStyle = '#26292f'; ctx.fillRect(x + 2, y + 6, 28, 24);
    ctx.fillStyle = '#6f7885'; ctx.fillRect(x + 3, y + 7, 26, 22);
    ctx.fillStyle = '#9aa3b0'; ctx.fillRect(x + 3, y + 7, 26, 3);
    ctx.fillStyle = '#4b525d'; ctx.fillRect(x + 3, y + 25, 26, 4);
    /* the flywheel */
    const cx = x + 16, cy = y + 18, a = now / 220;
    ctx.fillStyle = '#2a2e34'; 
    for (let dy2 = -7; dy2 <= 7; dy2++) {
      const half = Math.round(Math.sqrt(Math.max(0, 49 - dy2 * dy2)));
      ctx.fillRect(cx - half, cy + dy2, half * 2, 1);
    }
    ctx.fillStyle = '#c9924f';
    for (let i = 0; i < 6; i++) {
      const t = a + i / 6 * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(t) * 5) - 1, Math.round(cy + Math.sin(t) * 5) - 1, 2, 2);
    }
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
    /* the exhaust stack and its lamp */
    ctx.fillStyle = '#3d434e'; ctx.fillRect(x + 22, y + 1, 5, 6);
    ctx.fillStyle = '#575f6b'; ctx.fillRect(x + 23, y + 1, 3, 5);
    ctx.fillStyle = Math.floor(now / 300) % 2 ? '#7ac74f' : '#aef07a';
    ctx.fillRect(x + 5, y + 8, 3, 3);
    /* arcs of power skipping round the rim */
    if (Math.floor(now / 180) % 2) {
      ctx.fillStyle = 'rgba(180,235,255,.75)';
      const t = a * 1.7;
      ctx.fillRect(Math.round(cx + Math.cos(t) * 9), Math.round(cy + Math.sin(t) * 9), 1, 1);
      ctx.fillRect(Math.round(cx + Math.cos(t + 2) * 9), Math.round(cy + Math.sin(t + 2) * 9), 1, 1);
    }
  }

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

  /* a red feed barn with a hayloft door */
  function drawBarn(c, r, barn, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 2, y + 29, 28, 3);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 10, 30, 20);
    ctx.fillStyle = '#c94a3a'; ctx.fillRect(x + 2, y + 11, 28, 18);
    ctx.fillStyle = '#e06a58'; ctx.fillRect(x + 2, y + 11, 28, 2);
    ctx.fillStyle = '#a83a2a'; ctx.fillRect(x + 2, y + 26, 28, 3);
    /* white trim + big door */
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 2, y + 11, 1, 18); ctx.fillRect(x + 29, y + 11, 1, 18);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 11, y + 17, 10, 12);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 12, y + 18, 8, 11);
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 12, y + 18, 8, 1); ctx.fillRect(x + 15, y + 18, 1, 11);
    ctx.fillRect(x + 12, y + 18, 1, 11); ctx.fillRect(x + 19, y + 18, 1, 11);
    /* roof */
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i === 0 ? '#3a2a16' : (i % 2 ? '#8a5e2a' : '#a8783f');
      ctx.fillRect(x + 1 + i, y + 10 - i, 30 - i * 2, 1);
    }
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 6, y + 4, 20, 1);
    /* loft hatch with hay poking out */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 13, y + 7, 6, 4);
    ctx.fillStyle = '#e0bd82'; ctx.fillRect(x + 14, y + 8, 4, 2);
    ctx.fillStyle = '#c9a35f'; ctx.fillRect(x + 12, y + 9, 2, 1); ctx.fillRect(x + 18, y + 9, 2, 1);
    /* feed gauge */
    const f = Math.min(1, S().feedStore / Math.max(1, GAME.feedCap()));
    ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 4, y + 21, 5, 7);
    ctx.fillStyle = '#1a2a20'; ctx.fillRect(x + 5, y + 22, 3, 5);
    ctx.fillStyle = f > 0.85 ? '#ffd23f' : '#7ac74f'; ctx.fillRect(x + 5, y + 27 - Math.round(5 * f), 3, Math.round(5 * f));
  }

  /* a wooden trough with pellets in it */
  function drawTrough(c, r, t, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.22)'; ctx.fillRect(x + 1, y + 14, 14, 2);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 6, 14, 8);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 2, y + 7, 12, 6);
    ctx.fillStyle = '#c9a35f'; ctx.fillRect(x + 2, y + 7, 12, 1);
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 2, y + 12, 12, 1);
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 2, y + 14, 2, 2); ctx.fillRect(x + 12, y + 14, 2, 2);
    const n = Math.min(t.n, ECON.troughCap);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#e8c458' : '#d9a066';
      ctx.fillRect(x + 3 + (i % 6) * 2, y + 10 - Math.floor(i / 6), 1, 1);
    }
    if (!t.n && Math.floor(now / 600) % 2) SPR.drawTiny(ctx, '!', x + 6, y - 1, '#c43a2a', 1, '#ffffff');
  }

  /* a stone well with a bucket on a beam */
  function drawWell(c, r, w, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 1, y + 14, 14, 2);
    ctx.fillStyle = '#3a3a4a'; ctx.fillRect(x + 1, y + 6, 14, 9);
    ctx.fillStyle = '#8a9099'; ctx.fillRect(x + 2, y + 7, 12, 7);
    ctx.fillStyle = '#b8c0cc'; ctx.fillRect(x + 2, y + 7, 12, 1);
    ctx.fillStyle = '#5a626e'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 3, y + 9 + (i % 2) * 2, 2, 1);
    ctx.fillStyle = '#2f86ad'; ctx.fillRect(x + 4, y + 8, 8, 2);
    ctx.fillStyle = '#63c1e2'; ctx.fillRect(x + 5 + (Math.floor(now / 500) % 3), y + 8, 2, 1);
    /* posts + beam + bucket */
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 2, y, 2, 7); ctx.fillRect(x + 12, y, 2, 7); ctx.fillRect(x + 2, y, 12, 1);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 2, y, 1, 7); ctx.fillRect(x + 12, y, 1, 7);
    const bob = Math.round(Math.sin(now / 900) * 1);
    ctx.fillStyle = '#8a9099'; ctx.fillRect(x + 7, y + 1, 1, 3 + bob);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 6, y + 4 + bob, 4, 3);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 7, y + 5 + bob, 2, 1);
    /* drips */
    if (Math.floor(now / 300) % 3 === 0) { ctx.fillStyle = '#7fc4e8'; ctx.fillRect(x - 2, y + 10, 1, 1); ctx.fillRect(x + 16, y + 12, 1, 1); }
  }

  /* a sprinkler head on a pipe, spraying */
  function drawSprinkler(c, r, sp, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.2)'; ctx.fillRect(x + 4, y + 14, 8, 2);
    ctx.fillStyle = '#3a3a4a'; ctx.fillRect(x + 7, y + 6, 2, 9);
    ctx.fillStyle = '#8a9099'; ctx.fillRect(x + 7, y + 6, 1, 9);
    ctx.fillStyle = '#23262b'; ctx.fillRect(x + 5, y + 4, 6, 3);
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(x + 6, y + 5, 4, 1);
    const a = now / 400;
    ctx.fillStyle = 'rgba(127,196,232,.85)';
    for (let i = 0; i < 5; i++) {
      const ang = a + i * 1.25;
      const d = 4 + ((now / 60 + i * 7) % 9);
      ctx.fillRect(Math.round(x + 8 + Math.cos(ang) * d), Math.round(y + 5 + Math.sin(ang) * d * 0.5 - d * 0.3), 1, 1);
    }
  }

  /* a windmill: stone base, turning sails */
  function drawMill(c, r, m, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 4, y + 29, 24, 3);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 6, y + 8, 20, 22);
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x + 7, y + 9, 18, 20);
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 7, y + 9, 18, 1);
    ctx.fillStyle = '#c9c0a8'; ctx.fillRect(x + 7, y + 26, 18, 3);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 13, y + 20, 6, 9);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 14, y + 21, 4, 8);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 11, y + 12, 4, 4);
    ctx.fillStyle = '#d8f2fa'; ctx.fillRect(x + 12, y + 13, 2, 2);
    /* cap */
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 5, y + 5, 22, 4);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 8, y + 3, 16, 2);
    /* sails */
    const cx = x + 16, cy = y + 7, ang = now / 900;
    for (let k = 0; k < 4; k++) {
      const a = ang + k * Math.PI / 2;
      for (let d = 2; d < 11; d++) {
        const sx = Math.round(cx + Math.cos(a) * d), sy = Math.round(cy + Math.sin(a) * d);
        ctx.fillStyle = d % 2 ? '#e8e2d0' : '#c9a35f';
        ctx.fillRect(sx, sy, 1, 1);
        if (d > 4) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(sx + Math.round(Math.cos(a + 1.57)), sy + Math.round(Math.sin(a + 1.57)), 1, 1); }
      }
    }
    ctx.fillStyle = '#2e2216'; ctx.fillRect(cx, cy, 1, 1);
  }

  /* a coop: little house on stilts with a ramp */
  function drawCoop(c, r, cp, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 3, y + 29, 26, 3);
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 5, y + 22, 3, 7); ctx.fillRect(x + 24, y + 22, 3, 7);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 2, y + 10, 28, 13);
    ctx.fillStyle = '#e0bd82'; ctx.fillRect(x + 3, y + 11, 26, 11);
    ctx.fillStyle = '#c9a35f'; for (let i = 0; i < 26; i += 4) ctx.fillRect(x + 3 + i, y + 11, 1, 11);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 3, y + 20, 26, 2);
    /* door with a chick peeking out */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 12, y + 13, 8, 9);
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 13, y + 14, 6, 8);
    if (Math.floor(now / 1400) % 2) { ctx.fillStyle = '#ffe08a'; ctx.fillRect(x + 14, y + 17, 4, 4); ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 17, y + 18, 1, 1); ctx.fillStyle = '#f2a03f'; ctx.fillRect(x + 18, y + 19, 1, 1); }
    /* ramp */
    ctx.fillStyle = '#8a5e2a'; for (let i = 0; i < 7; i++) ctx.fillRect(x + 12 + i, y + 22 + i, 8 - i, 1);
    /* roof */
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i === 0 ? '#3a2a16' : (i % 2 ? '#c94a3a' : '#e06a58'); ctx.fillRect(x + 2 + i, y + 10 - i, 28 - i * 2, 1); }
    /* nest window */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 5, y + 13, 5, 4);
    ctx.fillStyle = '#ffe9c0'; ctx.fillRect(x + 6, y + 14, 3, 2);
  }

  /* a beehive on legs, bees drifting round it */
  function drawBeehive(c, r, b, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 2, y + 14, 12, 2);
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 3, y + 11, 2, 4); ctx.fillRect(x + 11, y + 11, 2, 4);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 3, 14, 9);
    ctx.fillStyle = '#f2e2c8'; ctx.fillRect(x + 2, y + 4, 12, 7);
    ctx.fillStyle = '#e0c9a0'; ctx.fillRect(x + 2, y + 7, 12, 1); ctx.fillRect(x + 2, y + 10, 12, 1);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 6, y + 9, 4, 2);
    ctx.fillStyle = '#c9924f'; ctx.fillRect(x, y + 1, 16, 2); ctx.fillStyle = '#e0bd82'; ctx.fillRect(x, y + 1, 16, 1);
    const prog = b.t / ECON.honeyEvery;
    if (prog > 0.6) { ctx.fillStyle = '#f0a422'; ctx.fillRect(x + 7, y + 11, 2, 1 + Math.round(prog * 2)); }
    for (let i = 0; i < 3; i++) {
      const a = now / 500 + i * 2.1, R = 9 + i * 2;
      const bx = Math.round(x + 8 + Math.cos(a) * R), by = Math.round(y + 6 + Math.sin(a * 1.3) * 5);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(bx, by, 2, 1);
      ctx.fillStyle = '#2e2216'; ctx.fillRect(bx + 1, by, 1, 1);
    }
  }
  /* ---- the billboard: your poster, up on posts, lit at the top ---- */
  let stockArt = null, stockArtFor = '';
  function billArt(bb) {
    if (bb && bb.art) return bb.art;
    const co = S().company;
    if (!stockArt || stockArtFor !== co.name) { stockArtFor = co.name; stockArt = SPR.billboardPreset('eggs', co); }
    return stockArt;
  }
  function drawBillboard(c, r, bb, now) {
    const x = c * 16, y = r * 16;
    const spr = SPR.billboardSprite(billArt(bb), 1, true);
    ctx.fillStyle = 'rgba(40,58,26,.26)';
    ctx.fillRect(x + 2, y + 30, 28, 3);
    ctx.drawImage(spr, x - 1, y + 32 - spr.height);
    /* the lamps throw a little light back onto the poster */
    if (Math.floor(now / 900) % 7 === 0) {
      ctx.fillStyle = 'rgba(255,248,220,.30)';
      ctx.fillRect(x + 2, y + 32 - spr.height + 6, 28, 14);
    }
  }

  /* the Gene Lab: white tiles, a glass dome, a helix on the door */
  function drawGeneLab(c, r, gl, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(x + 2, y + 30, 28, 3);
    ctx.fillStyle = '#2e2a3a'; ctx.fillRect(x + 1, y + 8, 30, 23);
    ctx.fillStyle = '#e8ecf0'; ctx.fillRect(x + 2, y + 9, 28, 21);
    ctx.fillStyle = '#c9d0d8'; for (let i = 0; i < 5; i++) ctx.fillRect(x + 2, y + 9 + i * 4, 28, 1);
    ctx.fillStyle = '#4fb8a8'; ctx.fillRect(x + 2, y + 26, 28, 4);
    /* dome */
    ctx.fillStyle = '#2e2a3a'; ctx.fillRect(x + 8, y + 2, 16, 7); ctx.fillRect(x + 10, y, 12, 3);
    ctx.fillStyle = '#9fe8ff'; ctx.fillRect(x + 9, y + 3, 14, 5); ctx.fillRect(x + 11, y + 1, 10, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 11, y + 2, 4, 1);
    /* door with the helix */
    ctx.fillStyle = '#2e2a3a'; ctx.fillRect(x + 12, y + 17, 8, 13);
    ctx.fillStyle = '#3fa7d6'; ctx.fillRect(x + 13, y + 18, 6, 11);
    for (let i = 0; i < 6; i++) { const o = Math.round(Math.sin(now / 400 + i) * 1.5); ctx.fillStyle = i % 2 ? '#ff5f9e' : '#ffd23f'; ctx.fillRect(x + 15 + o, y + 19 + i * 2, 2, 1); }
    /* windows and a blinking readout */
    ctx.fillStyle = '#2e2a3a'; ctx.fillRect(x + 4, y + 12, 6, 6); ctx.fillRect(x + 22, y + 12, 6, 6);
    ctx.fillStyle = '#9fe8ff'; ctx.fillRect(x + 5, y + 13, 4, 4); ctx.fillRect(x + 23, y + 13, 4, 4);
    ctx.fillStyle = Math.floor(now / 300) % 2 ? '#7ef2a8' : '#2f6a48'; ctx.fillRect(x + 5, y + 21, 2, 2);
    ctx.fillStyle = Math.floor(now / 450) % 2 ? '#e8542f' : '#5a2a2a'; ctx.fillRect(x + 8, y + 21, 2, 2);
  }
  /* the Kitchen: white tiles, a red awning, a chimney that steams while
     something is on, and the dish of the day chalked on the board */
  function drawKitchen(c, r, kt, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(x + 2, y + 30, 28, 3);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 9, 30, 22);
    ctx.fillStyle = '#f2ece0'; ctx.fillRect(x + 2, y + 10, 28, 20);
    ctx.fillStyle = '#d8d0c0'; for (let i = 0; i < 5; i++) ctx.fillRect(x + 2, y + 13 + i * 4, 28, 1); for (let i = 0; i < 7; i++) ctx.fillRect(x + 2 + i * 4, y + 10, 1, 20);
    /* the awning */
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#e8542f' : '#fff8ec'; ctx.fillRect(x + i * 4, y + 6, 4, 4); }
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x, y + 5, 32, 1); ctx.fillRect(x, y + 10, 32, 1);
    /* the hatch, with dishes on the counter */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 4, y + 13, 14, 10);
    ctx.fillStyle = '#5a4030'; ctx.fillRect(x + 5, y + 14, 12, 8);
    ctx.fillStyle = '#c9924f'; ctx.fillRect(x + 3, y + 22, 16, 2); ctx.fillStyle = '#e0bd82'; ctx.fillRect(x + 3, y + 22, 16, 1);
    for (let i = 0; i < Math.min(kt.counter.length, 3); i++) ctx.drawImage(SPR.dishSprite(kt.counter[i].recipe, 1), x + 4 + i * 5, y + 16);
    /* the menu board */
    ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 20, y + 12, 10, 10);
    ctx.fillStyle = '#1d3628'; ctx.fillRect(x + 21, y + 13, 8, 8);
    const rec = RECIPE_BY_ID[kt.cook ? kt.cook.recipe : kt.recipe] || RECIPES[0];
    ctx.drawImage(SPR.iconSprite(rec.icon, 1), x + 20, y + 12);
    /* the door */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 22, y + 23, 6, 8); ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 23, y + 24, 4, 7); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 26, y + 27, 1, 1);
    /* chimney, and the steam of something cooking */
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 25, y - 2, 4, 8); ctx.fillStyle = '#8a8a80'; ctx.fillRect(x + 24, y - 3, 6, 2);
    if (kt.cook) {
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      for (let i = 0; i < 3; i++) { const t = (now / 600 + i * 0.33) % 1; ctx.fillRect(x + 26 + Math.round(Math.sin(t * 6 + i) * 2), Math.round(y - 5 - t * 12), 2 + i, 2); }
      ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 4, y + 25, 14, 3);
      ctx.fillStyle = '#f0a422'; ctx.fillRect(x + 5, y + 26, Math.round(12 * Math.min(1, kt.cook.t / kt.cook.T)), 1);
    } else {
      SPR.drawTiny(ctx, kt.pantry.length + '/' + ECON.kitchenPantry, x + 4, y + 25, '#5a4030', 1);
    }
    /* a diner's bell */
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 18, y + 20, 2, 2); ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 18, y + 22, 2, 1);
  }

  /* the Chicken Park: a lawn behind a picket fence, a striped ticket booth,
     bunting over the gate and the exhibits up on their stands */
  function drawPark(c, r, p, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = '#7fc44f'; ctx.fillRect(x + 1, y + 8, 46, 39);
    ctx.fillStyle = '#9ada66'; for (let i = 0; i < 26; i++) ctx.fillRect(x + 2 + (i * 7) % 44, y + 10 + (i * 13) % 34, 1, 1);
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x + 20, y + 8, 8, 39);
    ctx.fillStyle = '#d0c4a8'; for (let i = 0; i < 10; i++) ctx.fillRect(x + 21 + (i % 3) * 3, y + 10 + i * 4, 1, 1);
    const post = (px2, py2) => { ctx.fillStyle = '#fff8ec'; ctx.fillRect(px2, py2, 2, 6); ctx.fillStyle = '#c9c0a8'; ctx.fillRect(px2, py2 + 5, 2, 1); ctx.fillStyle = '#3a2a16'; ctx.fillRect(px2, py2 - 1, 2, 1); };
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(x, y + 9, 48, 1); ctx.fillRect(x, y + 12, 48, 1); ctx.fillRect(x, y + 43, 48, 1); ctx.fillRect(x, y + 46, 48, 1);
    ctx.fillRect(x, y + 9, 1, 38); ctx.fillRect(x + 47, y + 9, 1, 38);
    for (let i = 0; i < 48; i += 6) { post(x + i, y + 7); post(x + i, y + 41); }
    for (let i = 14; i < 40; i += 6) { post(x, y + i); post(x + 46, y + i); }
    /* the sign over the gate */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 10, y - 2, 28, 9); ctx.fillStyle = '#e8542f'; ctx.fillRect(x + 11, y - 1, 26, 7);
    ctx.fillStyle = '#ff8f6a'; ctx.fillRect(x + 11, y - 1, 26, 1);
    SPR.drawTiny(ctx, 'PARK', x + 16, y + 0, '#fff8ec', 1);
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 11, y + 7, 1, 3); ctx.fillRect(x + 36, y + 7, 1, 3);
    /* bunting */
    for (let i = 0; i < 8; i++) { ctx.fillStyle = ['#e8542f', '#ffd23f', '#3fa7d6', '#ff5f9e'][i % 4]; ctx.fillRect(x + 1 + i * 6, y + 10 + (i % 2), 3, 2); }
    /* the ticket booth by the gate */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 33, 13, 15); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 2, y + 34, 11, 13);
    ctx.fillStyle = '#e8542f'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 2 + i * 2, y + 34, 1, 13);
    ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 4, y + 38, 7, 5); ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 5, y + 39, 5, 3);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x, y + 32, 15, 2); ctx.fillStyle = '#ff8f6a'; ctx.fillRect(x + 1, y + 32, 13, 1);
    if (Math.floor(now / 700) % 2) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 6, y + 36, 3, 1); }
    /* the exhibits on their little stands */
    const slots = p.slots || [];
    slots.forEach((ch, i) => {
      if (!ch) return;
      const ex = x + 8 + (i % 3) * 14, ey = y + 16 + Math.floor(i / 3) * 14;
      ctx.fillStyle = '#c9c0a8'; ctx.fillRect(ex - 2, ey + 12, 12, 3); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(ex - 2, ey + 12, 12, 1);
      const spr = SPR.chickenSprite(SPECIES[ch.sp], 1, false);
      const bob = Math.round(Math.sin(now / 500 + i * 2) * 0.8);
      ctx.drawImage(spr, ex - 6, ey - 6 + bob);
      const stars = GAME.rankOf(ch);
      for (let s = 0; s < stars; s++) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(ex - 2 + s * 3, ey - 8, 2, 1); }
    });
    if (!slots.filter(Boolean).length) SPR.drawTiny(ctx, 'DROP HENS', x + 7, y + 22, 'rgba(40,58,26,.75)', 1);
  }

  /* the Time Machine: a brass drum with a glass dome, a dial, a hatch for
     the bones, and a great deal of blue light when it is running */
  function drawTimeMachine(c, r, tm, now) {
    const x = c * 16, y = r * 16;
    const on = !!tm.on, spin = on ? Math.floor(now / 200) % 2 : 0;
    ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(x + 3, y + 30, 26, 3);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 3, y + 12, 26, 19);
    ctx.fillStyle = '#c98f3f'; ctx.fillRect(x + 4, y + 13, 24, 17);
    ctx.fillStyle = '#e0bd82'; ctx.fillRect(x + 4, y + 13, 24, 2); ctx.fillRect(x + 4, y + 13, 3, 17);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 4, y + 27, 24, 3); ctx.fillRect(x + 25, y + 13, 3, 17);
    ctx.fillStyle = '#fff3c4'; for (let i = 0; i < 6; i++) { ctx.fillRect(x + 6 + i * 4, y + 15, 1, 1); ctx.fillRect(x + 6 + i * 4, y + 26, 1, 1); }
    /* the dome */
    ctx.fillStyle = '#2e2a3a'; ctx.fillRect(x + 7, y + 2, 18, 11); ctx.fillRect(x + 9, y, 14, 3);
    ctx.fillStyle = on ? '#9fe8ff' : '#6a8aa0'; ctx.fillRect(x + 8, y + 3, 16, 9); ctx.fillRect(x + 10, y + 1, 12, 3);
    if (on) {
      const a = now / 200;
      for (let i = 0; i < 8; i++) { const t = a + i * 0.8; ctx.fillStyle = i % 2 ? '#ffffff' : '#5fd0ff'; ctx.fillRect(Math.round(x + 16 + Math.cos(t) * (3 + i * 0.5)), Math.round(y + 7 + Math.sin(t) * (2 + i * 0.3)), 1, 1); }
      if (Math.floor(now / 90) % 5 === 0) { ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 5 + Math.floor(now / 30) % 3, y - 2, 1, 5); ctx.fillRect(x + 26 - Math.floor(now / 50) % 3, y - 3, 1, 6); }
    } else { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 10, y + 2, 3, 1); }
    /* the dial and the bone hatch */
    ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 8, y + 17, 8, 8); ctx.fillStyle = '#e8d5a8'; ctx.fillRect(x + 9, y + 18, 6, 6);
    const ang = on ? now / 300 : -1.2;
    ctx.fillStyle = '#e8542f'; ctx.fillRect(x + 12 + Math.round(Math.cos(ang) * 2), y + 21 + Math.round(Math.sin(ang) * 2), 1, 1);
    ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 12, y + 21, 1, 1);
    ctx.fillRect(x + 18, y + 17, 7, 8); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x + 19, y + 18, 5, 6);
    if (S().fossilCount) ctx.drawImage(SPR.fossilSprite(1, 1), 0, 0, 9, 7, x + 18, y + 19, 7, 5);
    if (on) { ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 4, y + 28, 24, 3); ctx.fillStyle = '#5fd0ff'; ctx.fillRect(x + 5, y + 29, Math.round(22 * Math.min(1, tm.t / Math.max(1, tm.T))), 1); }
    /* gears at the sides */
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x, y + 18, 4, 4); ctx.fillRect(x + 28, y + 18, 4, 4);
    ctx.fillStyle = '#c9924f'; ctx.fillRect(x + 1 + spin, y + 19, 2, 2); ctx.fillRect(x + 29 - spin, y + 19, 2, 2);
  }

  /* a bone half out of the dirt */
  function drawFossil(f, now) {
    const spr = SPR.fossilSprite(f.seed, 1);
    ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(Math.round(f.x - 4), Math.round(f.y + 1), 9, 2);
    ctx.drawImage(spr, Math.round(f.x - 4), Math.round(f.y - 6 + f.z));
    if (Math.floor(now / 400 + f.id) % 3 === 0) { ctx.fillStyle = '#fff8ec'; ctx.fillRect(Math.round(f.x + 4), Math.round(f.y - 8 + f.z), 1, 1); }
  }

  /* diners and tourists: people who are not on the payroll */
  const visitorLooks = new Map();
  function drawVisitor(v, now) {
    if (ctx === mainCtx && (v.x + 20 < cam().x || v.x > cam().x + W.view.w || v.y + 24 < cam().y || v.y > cam().y + W.view.h)) return;
    let look = visitorLooks.get(v.id);
    if (!look) {
      const rnd = SPR.mulberry(v.seed || v.id);
      const pick = arr => arr[Math.floor(rnd() * arr.length)];
      look = { skin: pick(SKINS), hair: pick(HAIRS), style: pick(HAIR_STYLES), shirt: pick(SHIRTS), pants: pick(PANTS), boot: pick(BOOTS), hat: pick(HATS) };
      visitorLooks.set(v.id, look);
      if (visitorLooks.size > 200) visitorLooks.delete(visitorLooks.keys().next().value);
    }
    const moving = v.state !== 'stay';
    const spr = SPR.personSprite(look, moving ? v.frame : 0, 1);
    ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(Math.round(v.x + 1), Math.round(v.y + spr.height - 2), 10, 2);
    ctx.save();
    if (v.dir === 1) { ctx.translate(Math.round(v.x) + spr.width, Math.round(v.y)); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); }
    else ctx.drawImage(spr, Math.round(v.x), Math.round(v.y));
    ctx.restore();
    if (v.state === 'stay') {
      if (v.kind === 'tourist') { if (Math.floor(now / 500 + v.id) % 3 === 0) { ctx.fillStyle = '#fff8ec'; ctx.fillRect(Math.round(v.x + 12), Math.round(v.y - 4), 2, 2); } }
      else ctx.drawImage(SPR.dishSprite('omelette', 1), 0, 0, 10, 7, Math.round(v.x + 9), Math.round(v.y + 7), 7, 5);
    } else if (v.kind === 'tourist' && v.state === 'in') {
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(Math.round(v.x + (v.dir === 1 ? 11 : -1)), Math.round(v.y + 11), 2, 1);
    }
  }

  /* a building site: stakes and rope round a dirt patch, timber waiting,
     and the frame going up as the movers work */
  function drawSite(k, st, now) {
    const [c, r] = k.split(',').map(Number);
    const b = BUILDS[st.type];
    const x = c * 16, y = r * 16, w = b.w * 16, h = b.h * 16;
    const prog = Math.min(1, st.t / st.T);
    if (st.kind === 'storey') {
      /* scaffold poles up the sides of the building */
      ctx.fillStyle = '#c9924f';
      for (let i = 0; i < 3; i++) { ctx.fillRect(x - 2, y - 26 + i * 8, w + 4, 1); }
      ctx.fillRect(x - 2, y - 26, 1, h + 26); ctx.fillRect(x + w + 1, y - 26, 1, h + 26);
      ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 2, y - 30, w - 4, 3);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 3, y - 29, Math.round((w - 6) * prog), 1);
      return;
    }
    /* churned dirt */
    ctx.fillStyle = '#8a6a3a';
    for (let yy = 2; yy < h - 1; yy += 2) for (let xx = 2 + (yy % 4) / 2; xx < w - 2; xx += 3) if (((xx * 7 + yy * 13 + c) % 5) < 3) ctx.fillRect(x + xx, y + yy, 2, 1);
    /* stakes and rope */
    ctx.fillStyle = '#e8542f';
    [[1, 1], [w - 3, 1], [1, h - 3], [w - 3, h - 3]].forEach(([sx, sy]) => { ctx.fillRect(x + sx, y + sy - 4, 2, 6); });
    ctx.fillStyle = '#fff8ec';
    for (let i = 3; i < w - 3; i += 4) { ctx.fillRect(x + i, y - 1, 2, 1); ctx.fillRect(x + i, y + h - 3, 2, 1); }
    for (let i = 1; i < h - 3; i += 4) { ctx.fillRect(x + 1, y + i, 1, 2); ctx.fillRect(x + w - 2, y + i, 1, 2); }
    /* timber, and the frame rising */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 3, y + h - 8, 8, 4);
    ctx.fillStyle = '#c9924f'; ctx.fillRect(x + 4, y + h - 7, 6, 1); ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 4, y + h - 5, 6, 1);
    if (prog > 0.15) {
      const fh = Math.round((h + 6) * Math.min(1, (prog - 0.15) / 0.7));
      ctx.fillStyle = '#e0bd82';
      ctx.fillRect(x + 4, y + h - 2 - fh, 1, fh); ctx.fillRect(x + w - 5, y + h - 2 - fh, 1, fh);
      if (b.w > 1) ctx.fillRect(x + w / 2, y + h - 2 - fh, 1, fh);
      for (let yy = y + h - 4; yy > y + h - 2 - fh; yy -= 5) ctx.fillRect(x + 4, yy, w - 8, 1);
    }
    if (prog > 0.85) { ctx.fillStyle = 'rgba(224,189,130,.6)'; ctx.fillRect(x + 3, y - 2, w - 6, h - 2); }
    /* progress plank */
    SPR.drawBar(ctx, x, y - 9, w, prog, st.stage === 'work' ? '#ffd23f' : '#8a7a5a', { h: 5 });
  }
  /* a second floor: a lighter box with windows and a little roof, sat over
     the building's own roof */
  function drawStorey(k, now) {
    const o = GAME.occAt(...k.split(',').map(Number));
    if (!o || !BUILDS[o.type]) return;
    const [c, r] = k.split(',').map(Number);
    const b = BUILDS[o.type];
    const x = c * 16 + 2, w = b.w * 16 - 4, y = r * 16 - 12 - (b.h > 1 ? 14 : 4), h = 14;
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#f2e2c8'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = '#e0c9a0'; for (let i = 3; i < h - 2; i += 4) ctx.fillRect(x + 1, y + i, w - 2, 1);
    const nWin = Math.max(1, Math.floor((w - 4) / 10));
    for (let i = 0; i < nWin; i++) {
      const wx = x + 3 + i * Math.floor((w - 6) / nWin) + Math.floor(((w - 6) / nWin - 5) / 2);
      ctx.fillStyle = '#3a2a16'; ctx.fillRect(wx, y + 4, 6, 6);
      ctx.fillStyle = Math.floor(now / 2000 + i + c) % 3 ? '#ffe9a0' : '#7fc4e8'; ctx.fillRect(wx + 1, y + 5, 4, 4);
      ctx.fillStyle = '#3a2a16'; ctx.fillRect(wx + 3, y + 5, 1, 4);
    }
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i === 0 ? '#3a2a16' : (i % 2 ? '#c94a3a' : '#e06a58'); ctx.fillRect(x - 2 + i, y - i, w + 4 - i * 2, 1); }
    ctx.fillStyle = '#8a9099'; ctx.fillRect(x + w - 6, y - 7, 3, 5);
  }
  /* traffic, the customers in the lay-by and the movers' van */
  function drawCar(kind, col, x, y, dir, frame) {
    const spr = SPR.carSprite(kind, col, frame, 1);
    ctx.fillStyle = 'rgba(40,58,26,.28)'; ctx.fillRect(Math.round(x) + 2, Math.round(y) + spr.height - 2, spr.width - 4, 2);
    ctx.save();
    if (dir === -1) { ctx.translate(Math.round(x) + spr.width, Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); }
    else ctx.drawImage(spr, Math.round(x), Math.round(y));
    ctx.restore();
    return spr;
  }
  function drawTraffic(now) {
    const list = GAME.cars.slice().sort((a, b) => a.y - b.y);
    list.forEach(c => {
      if (c.x + 50 < cam().x || c.x - 10 > cam().x + W.view.w) return;
      const spr = drawCar(c.kind, c.col, c.x, c.y - 2, c.dir, Math.floor(now / 80 + c.id) % 2);
      /* a puff of exhaust */
      if (Math.floor(now / 160 + c.id) % 3 === 0) {
        ctx.fillStyle = 'rgba(200,200,190,.5)';
        ctx.fillRect(Math.round(c.x + (c.dir === 1 ? -3 : spr.width + 1)), Math.round(c.y + spr.height - 6), 2, 2);
      }
    });
  }
  function drawOrders(now) {
    S().orders.forEach(o => {
      if (o.x + 40 < cam().x || o.x - 10 > cam().x + W.view.w) return;
      const spr = drawCar(o.kind, o.col, o.x, o.y, -1, o.state === 'wait' ? 0 : Math.floor(now / 80) % 2);
      if (o.state !== 'wait') return;
      /* the order, on a docket over the car: the eggs wanted, the price,
         then the clock. six to a row so a big order stays narrow enough
         to sit beside the next car in the lay-by. */
      const n = o.n, got = o.got;
      const PER = 6;
      const rows = Math.ceil(n / PER), cols = Math.min(n, PER);
      const payTxt = GAME.fmt(o.pay), payW = SPR.tinyW(payTxt, 1);
      const bw = Math.max(30, 8 + cols * 5, 8 + payW), bh = 14 + rows * 7;
      const bx = Math.round(o.x + spr.width / 2 - bw / 2), by = Math.round(o.y - bh - 8);
      ctx.fillStyle = '#2e2216'; ctx.fillRect(bx - 1, by, bw + 2, bh); ctx.fillRect(bx, by - 1, bw, bh + 2);
      ctx.fillStyle = '#fff8ec'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#2e2216'; ctx.fillRect(bx + bw / 2 - 2, by + bh, 4, 1); ctx.fillRect(bx + bw / 2 - 1, by + bh + 1, 2, 1); ctx.fillRect(bx + bw / 2, by + bh + 2, 1, 1);
      ctx.fillStyle = '#fff8ec'; ctx.fillRect(bx + bw / 2 - 1, by + bh, 2, 1);
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / PER), inRow = Math.min(n - row * PER, PER);
        const ex = Math.round(bx + bw / 2 - inRow * 5 / 2 + 1 + (i % PER) * 5), ey = by + 3 + row * 7;
        ctx.fillStyle = i < got ? TIERS[o.tier].c : '#2e2216'; ctx.fillRect(ex, ey, 3, 4); ctx.fillRect(ex + 1, ey - 1, 1, 1); ctx.fillRect(ex + 1, ey + 4, 1, 1);
        if (i >= got) { ctx.fillStyle = EGG_SHELL[o.tier]; ctx.fillRect(ex + 1, ey + 1, 1, 2); }
      }
      /* what it pays, on its own line under the eggs */
      SPR.drawTiny(ctx, payTxt, Math.round(bx + bw / 2 - payW / 2), by + 4 + rows * 7, '#8a5e2a', 1);
      /* the clock */
      const f = Math.max(0, o.t / o.T);
      ctx.fillStyle = '#e0c9a0'; ctx.fillRect(bx + 3, by + bh - 4, bw - 6, 2);
      ctx.fillStyle = f < 0.2 && Math.floor(now / 250) % 2 ? '#e8542f' : f < 0.4 ? '#f0a422' : '#7ac74f'; ctx.fillRect(bx + 3, by + bh - 4, Math.round((bw - 6) * f), 2);
      if (o.vip) {
        /* a gold rim and a star: this one pays double and will not wait long */
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(bx - 1, by - 1, bw + 2, 1); ctx.fillRect(bx - 1, by + bh, bw + 2, 1);
        ctx.fillRect(bx - 1, by - 1, 1, bh + 2); ctx.fillRect(bx + bw, by - 1, 1, bh + 2);
        ctx.drawImage(SPR.iconSprite('star', 1), bx + bw / 2 - 5, by - 12 + (Math.floor(now / 300) % 2));
      }
    });
  }
  function drawMovers(now) {
    const m = GAME.movers;
    if (!m.van) return;
    const v = m.van;
    const moving = v.state !== 'parked';
    drawCar('mover', null, v.x, v.y - 4 + (moving ? Math.round(Math.sin(now / 45)) : 0), 1, moving ? Math.floor(now / 80) % 2 : 0);
    m.crew.forEach(w => {
      if (w.state === 'van') return;
      const spr = SPR.personSprite(w.look, w.state === 'walk' ? w.frame : 0, 1);
      ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(Math.round(w.x + 1), Math.round(w.y + spr.height - 2), 10, 2);
      ctx.save();
      if (w.dir === 1) { ctx.translate(Math.round(w.x) + spr.width, Math.round(w.y)); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); }
      else ctx.drawImage(spr, Math.round(w.x), Math.round(w.y));
      ctx.restore();
      if (w.state === 'work') {
        /* hammer swinging, sparks flying */
        const swing = Math.floor(now / 140 + w.id) % 2;
        const hx = Math.round(w.x + (w.dir === 1 ? 10 : -2)), hy = Math.round(w.y + (swing ? 4 : 0));
        ctx.fillStyle = '#8a5e2a'; ctx.fillRect(hx, hy + 2, 1, 5);
        ctx.fillStyle = '#3a3a4a'; ctx.fillRect(hx - 1, hy, 3, 2);
        if (!swing && Math.floor(now / 70) % 2) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(hx + 2, hy + 6, 1, 1); ctx.fillRect(hx - 2, hy + 7, 1, 1); }
        if (Math.floor(now / 500 + w.id) % 4 === 0 && Math.floor(now / 50) % 10 === 0) puff(w.x + 6, w.y + 12, '#c9a35f', 2, 10, 8);
      }
    });
  }
  /* the company sign by the road wears your colours */
  function drawBrand(now) {
    const st = W.stations.brand, co = S().company;
    const x = st.x, y = st.y;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 6, y + st.h - 2, st.w - 12, 2);
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 6, y + 14, 3, st.h - 15); ctx.fillRect(x + st.w - 9, y + 14, 3, st.h - 15);
    ctx.fillStyle = '#2e2216'; ctx.fillRect(x, y, st.w, 16);
    ctx.fillStyle = co.col1; ctx.fillRect(x + 1, y + 1, st.w - 2, 14);
    ctx.fillStyle = SPR.lighten(co.col1, 0.35); ctx.fillRect(x + 1, y + 1, st.w - 2, 1);
    ctx.fillStyle = co.col2; ctx.fillRect(x + 1, y + 13, st.w - 2, 2);
    ctx.drawImage(SPR.iconSprite(co.logo, 1), x + 3, y + 3);
    const name = co.name.slice(0, 14);
    SPR.drawTiny(ctx, name, x + 15, y + 5, SPR.lum(co.col1) > 0.6 ? '#2e2216' : '#fff8ec', 1);
    if (!co.done && Math.floor(now / 400) % 2) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + st.w / 2 - 1, y - 5, 3, 3); }
  }

  /* the Logistics HQ: a dispatch office with a loading bay and a wall clock */
  function drawHQ(c, r, hq, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.26)'; ctx.fillRect(x + 3, y + 29, 42, 4);
    /* body */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 8, 46, 24);
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x + 2, y + 9, 44, 22);
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 2, y + 9, 44, 2);
    ctx.fillStyle = '#c9c0a8'; ctx.fillRect(x + 2, y + 28, 44, 3);
    /* brick base */
    ctx.fillStyle = '#b5714f';
    for (let i = 0; i < 22; i++) ctx.fillRect(x + 2 + (i % 11) * 4, y + 25 + Math.floor(i / 11) * 3, 3, 2);
    /* roof with a sign band */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x, y + 3, 48, 6);
    ctx.fillStyle = '#3f6fd6'; ctx.fillRect(x + 1, y + 4, 46, 4);
    ctx.fillStyle = '#6f9af0'; ctx.fillRect(x + 1, y + 4, 46, 1);
    SPR.drawTiny(ctx, 'LOGISTICS', x + 6, y + 4, '#ffffff', 1);
    /* roller door on the loading bay */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 4, y + 15, 16, 16);
    ctx.fillStyle = '#8d949e'; ctx.fillRect(x + 5, y + 16, 14, 14);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#a6aeba' : '#6a7280'; ctx.fillRect(x + 5, y + 16 + i * 3, 14, 2); }
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 5, y + 30, 14, 1);
    /* window with a map pinned inside */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 24, y + 14, 18, 11);
    ctx.fillStyle = '#bfe8f5'; ctx.fillRect(x + 25, y + 15, 16, 9);
    ctx.fillStyle = '#e8d9ae'; ctx.fillRect(x + 27, y + 16, 12, 7);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 28, y + 20, 10, 1); ctx.fillRect(x + 33, y + 17, 1, 4);
    ctx.fillStyle = '#e8542f'; ctx.fillRect(x + 30, y + 18, 1, 1); ctx.fillRect(x + 36, y + 21, 1, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 25, y + 15, 5, 1);
    /* a clock over the door and a parked pallet */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 10, y + 10, 5, 5);
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 11, y + 11, 3, 3);
    const ang = now / 2000;
    ctx.fillStyle = '#3a2a16';
    ctx.fillRect(x + 12 + Math.round(Math.cos(ang) * 1), y + 12 + Math.round(Math.sin(ang) * 1), 1, 1);
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(x + 42, y + 26, 5, 5);
    ctx.fillStyle = '#c9a35f'; ctx.fillRect(x + 42, y + 26, 5, 1); ctx.fillRect(x + 44, y + 27, 1, 4);
    /* a bot on the forecourt when a load is out */
    if (S().truck.state !== 'parked' && Math.floor(now / 600) % 2) {
      ctx.fillStyle = '#7ac74f'; ctx.fillRect(x + 20, y + 6, 2, 2);
    }
  }

  /* the noticeboard where flyers get pinned */
  function drawBoard(c, r, bd, now) {
    const x = c * 16, y = r * 16;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 2, y + 14, 12, 2);
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 2, y + 8, 2, 7); ctx.fillRect(x + 12, y + 8, 2, 7);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x, y, 16, 10);
    ctx.fillStyle = '#c9a35f'; ctx.fillRect(x + 1, y + 1, 14, 8);
    ctx.fillStyle = '#e0bd82'; ctx.fillRect(x + 1, y + 1, 14, 1);
    /* pinned flyers */
    const st = S();
    const n = st.flyer ? 3 : st.applicants.length ? 1 : 0;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < n ? '#fff8ec' : '#b89355';
      ctx.fillRect(x + 2 + i * 4, y + 2 + (i % 2), 3, 5);
      if (i < n) { ctx.fillStyle = '#e8542f'; ctx.fillRect(x + 3 + i * 4, y + 3 + (i % 2), 1, 1); ctx.fillStyle = '#8a8070'; ctx.fillRect(x + 2 + i * 4, y + 5 + (i % 2), 3, 1); }
    }
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 3, y + 1, 1, 1); ctx.fillRect(x + 11, y + 2, 1, 1);
    if (st.flyer && Math.floor(now / 600) % 2) { ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 14, y - 3, 2, 2); }
  }

  /* somebody who answered a flyer, standing by the board */
  function drawApplicant(a, now) {
    if (a.x === undefined) return;
    if (ctx === mainCtx && (a.x + 20 < cam().x || a.x > cam().x + W.view.w || a.y + 24 < cam().y || a.y > cam().y + W.view.h)) return;
    const moving = a.state !== 'waiting';
    const spr = SPR.personSprite(a.look, moving ? a.frame : 0, 1);
    const bob = moving ? 0 : Math.abs(Math.sin(now / 420 + a.id)) * (Math.floor((now + a.id * 300) / 2600) % 3 === 0 ? 2 : 0);
    SPR.shadowEll(ctx, a.x + 6, a.y + spr.height - 1, 5.5, 1.5, 0.26);
    ctx.save();
    if (a.dir === 1) { ctx.translate(Math.round(a.x) + spr.width, Math.round(a.y - bob)); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); }
    else ctx.drawImage(spr, Math.round(a.x), Math.round(a.y - bob));
    ctx.restore();
    if (a.state === 'waiting') {
      /* a little speech bubble: they want a job */
      const by = Math.round(a.y - 11 + Math.sin(now / 300 + a.id) * 1);
      ctx.fillStyle = '#2e2216'; ctx.fillRect(Math.round(a.x + 3), by, 9, 9);
      ctx.fillStyle = '#fff9ec'; ctx.fillRect(Math.round(a.x + 4), by + 1, 7, 7);
      ctx.fillStyle = '#2e2216'; ctx.fillRect(Math.round(a.x + 6), by + 9, 2, 2);
      ctx.drawImage(SPR.iconSprite('doc', 1), Math.round(a.x + 3), by - 1);
      /* patience bar */
      SPR.drawBar(ctx, Math.round(a.x), Math.round(a.y + spr.height), 12, Math.max(0, a.t) / RECRUIT.applicantLife, a.t < 90 ? '#e8542f' : '#7ac74f', { h: 3 });
    }
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
    if (ctx === mainCtx && (w.x + 20 < cam().x || w.x > cam().x + W.view.w || w.y + 24 < cam().y || w.y > cam().y + W.view.h)) return;
    const moving = w.state === 'walk';
    const spr = SPR.staffSprite(w, moving ? w.frame : 0, 1);
    const bob = moving ? 0 : Math.sin(now / 600 + w.id) * 0.5;
    SPR.shadowEll(ctx, w.x + 6, w.y + spr.height - 1, 5.5, 1.5, 0.26);
    if (moving && w.frame && GAME.setting('particles') && Math.floor(now / 130) % 2) { ctx.fillStyle = 'rgba(200,180,140,.5)'; ctx.fillRect(Math.round(w.x + (w.dir === 1 ? 0 : 10)), Math.round(w.y + spr.height - 2), 2, 1); }
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

  /* ============================================================
     SPEECH IN THE WORLD
     A generated pixel cloud with the tiny font wrapped inside it,
     drawn at one world pixel a pixel so it belongs to the farm
     rather than floating over it in HTML.
     ============================================================ */
  const sayCache = new Map();
  function wrapTiny(text, cols) {
    const out = [];
    let line = '';
    String(text).toUpperCase().split(' ').forEach(w => {
      if (!line) line = w;
      else if (line.length + 1 + w.length <= cols) line += ' ' + w;
      else { out.push(line); line = w; }
    });
    if (line) out.push(line);
    return out;
  }
  /* the cloud, cached by what it says and which way the tail points */
  function sayCloud(text, below) {
    const key = (below ? 'v' : '^') + text;
    if (sayCache.has(key)) return sayCache.get(key);
    const lines = wrapTiny(text, 23);
    const tw = Math.max(...lines.map(l => SPR.tinyW(l, 1)));
    const w = tw + 18, h = lines.length * 7 + 18;
    const cloud = SPR.cloudBubble(w, h, Math.round(w * 0.32), below, { px: 1, fill: '#fff9ec', ink: '#2e2216' });
    const c = SPR.newCanvas(cloud.width, cloud.height);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(cloud, 0, 0);
    lines.forEach((l, i) => SPR.drawTiny(g, l, 9, (below ? 12 : 7) + i * 7, '#2e2216', 1));
    if (sayCache.size > 80) sayCache.clear();
    sayCache.set(key, c);
    return c;
  }
  /* the dialogue panel owns the top-left of the view; in world pixels
     it covers about this much, and a speech cloud keeps out of it */
  const PANEL_W = 126, PANEL_H = 52;
  /* draw it over a speaker: above if there is room, below if not, and
     never behind the founder's own dialogue box */
  function drawSay(text, wx, wy, h) {
    const height = h === undefined ? 30 : h;
    const above = sayCloud(text, false);
    const below = wy - above.height < cam().y + 2;
    const c = below ? sayCloud(text, true) : above;
    let x = Math.round(wx - c.width * 0.32);
    let y = Math.round(below ? wy + height : wy - c.height);
    /* if it would land under the dialogue panel, slide it clear */
    const panelX = cam().x + PANEL_W, panelY = cam().y + PANEL_H;
    if (x < panelX && y < panelY && !$('#todo-panel').hidden) {
      if (panelX + c.width + 2 < cam().x + W.view.w) x = panelX;
      else y = panelY;
    }
    x = Math.max(cam().x + 2, Math.min(cam().x + W.view.w - c.width - 2, x));
    y = Math.max(cam().y + 2, Math.min(cam().y + W.view.h - c.height - 2, y));
    ctx.drawImage(c, x, y);
  }

  /* ============================================================
     THE FOUNDER
     The raccoon who inherited the place walks it like everyone
     else on the payroll - top hat, tail, opinions. Whatever the
     current job is, he is standing next to it telling you about it.
     ============================================================ */
  function bossPose(b, now) {
    if (b.state === 'walk') return (b.frame ? 'walk1' : 'walk0');
    if (b.pose === 'cheer') return 'cheer';
    if (b.pose === 'read') return 'read';
    /* he blinks: a quarter second every four, out of phase per save */
    if ((now % 4200) < 190) return 'blink';
    return 'boss';
  }
  function drawBoss(now) {
    const b = GAME.boss();
    if (!b || !S().company.done) return;
    if (ctx === mainCtx && (b.x + 40 < cam().x || b.x - 14 > cam().x + W.view.w || b.y + 44 < cam().y || b.y - 52 > cam().y + W.view.h)) return;
    const pose = bossPose(b, now);
    const spr = SPR.raccoonSprite(pose, 1, S().wardrobe);
    const walking = b.state === 'walk';
    const bob = walking ? 0 : Math.sin(now / 620 + 1) * 0.6;
    const hop = pose === 'cheer' ? Math.abs(Math.sin(now / 190)) * 4 : 0;
    SPR.shadowEll(ctx, b.x + 14, b.y + 34.5, 11 - hop * 0.4, 2, 0.3);
    ctx.save();
    if (b.dir === 1) {
      ctx.translate(Math.round(b.x) + spr.width, Math.round(b.y - SPR.RAC_OFF + bob - hop));
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0);
    } else ctx.drawImage(spr, Math.round(b.x), Math.round(b.y - SPR.RAC_OFF + bob - hop));
    ctx.restore();
    /* dust off his heels while he walks */
    if (walking && b.frame && GAME.setting('particles') && Math.floor(now / 120) % 2) { ctx.fillStyle = 'rgba(200,180,140,.55)'; ctx.fillRect(Math.round(b.x + (b.dir === 1 ? 3 : 20)), Math.round(b.y + 32), 4, 1); }
    if (b.line && ctx === mainCtx) drawSay(b.line, b.x + 14, b.y - 10 - hop, 34);
    else if (pose === 'read') {
      /* leafing through the ledger */
      if (Math.floor(now / 500) % 2) { ctx.fillStyle = '#fff8ec'; ctx.fillRect(Math.round(b.x + 9), Math.round(b.y + 22), 3, 1); }
    }
  }

  /* The Warden: he comes up out of the ground where a tree used to be,
     objects at length, takes a bribe and walks off. */
  function drawWarden(now) {
    const w = GAME.warden();
    if (!w) return;
    if (ctx === mainCtx && (w.x + 24 < cam().x || w.x - 10 > cam().x + W.view.w || w.y + 20 < cam().y || w.y - 40 > cam().y + W.view.h)) return;
    const up = Math.min(1, w.t / 0.5);
    const pose = w.going > 0 ? 'sulk' : w.t < 3 ? (Math.floor(now / 190) % 2 ? 'wag' : 'stand') : 'stand';
    const spr = SPR.wardenSprite(pose, 1);
    const bob = w.going > 0 ? Math.abs(Math.sin(now / 150)) : Math.abs(Math.sin(now / 260)) * 1.2;
    /* the hole he came up out of */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(Math.round(w.x - 1), Math.round(w.y - 2), 16, 4);
    ctx.fillStyle = '#241a10'; ctx.fillRect(Math.round(w.x + 1), Math.round(w.y - 1), 12, 2);
    SPR.shadowEll(ctx, w.x + 6, w.y + 1, 6, 1.5, 0.3);
    ctx.save();
    ctx.beginPath();
    ctx.rect(w.x - 6, w.y - spr.height, spr.width + 12, spr.height + 2);
    ctx.clip();
    ctx.drawImage(spr, Math.round(w.x), Math.round(w.y - spr.height + (1 - up) * 20 - bob));
    ctx.restore();
    if (GAME.setting('particles') && w.t < 2 && Math.floor(now / 260) % 2) {
      ctx.fillStyle = '#7fbf4f';
      ctx.fillRect(Math.round(w.x + 14 + Math.sin(now / 300) * 3), Math.round(w.y - 26 + (w.t * 14) % 24), 2, 1);
    }
    if (up >= 1 && ctx === mainCtx) drawSay(GAME.wardenLine(), w.x + 6, w.y - 22 - bob, 24);
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
    const maxed = S().mamaTier >= TIER_DIVINE;
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
      /* a two-line board: the words, then the coin and the asking price */
      ctx.drawImage(SPR.signSprite(BW, 1, 1, 21), -BW / 2, -25);
      const t1 = 'FOR SALE';
      SPR.drawText(ctx, t1, -Math.floor(SPR.textW(t1, 1) / 2), -23, '#4a3018', 1);
      const priceTxt = GAME.fmt(p.price);
      const pw = SPR.textW(priceTxt, 1) + 6;
      SPR.drawText(ctx, priceTxt, -Math.floor(pw / 2) + 6, -13, afford ? '#2e6e2e' : '#a83a2a', 1);
      ctx.fillStyle = afford ? '#ffd23f' : '#b5a06a';
      ctx.fillRect(-Math.floor(pw / 2) - 1, -12, 4, 4);
      ctx.fillStyle = '#e0a416'; ctx.fillRect(-Math.floor(pw / 2), -11, 2, 2);
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
    const v = GAME.vehicle();
    const moving = tr.state !== 'parked';
    const spr = SPR.vehicleSprite(v.id, moving ? Math.floor(now / 90) % 2 : 0, 1);
    const y = W.roadY + 26 - spr.height;
    const bounce = moving ? Math.round(Math.sin(now / 45) * 1) : 0;
    ctx.fillStyle = 'rgba(40,58,26,.28)'; ctx.fillRect(x + 2, W.roadY + 23, spr.width - 4, 3);
    ctx.drawImage(spr, x, y + bounce);
    /* the load rides on top of whatever you drive */
    const n = Math.min(tr.load.length, v.id === 'bike' ? 4 : v.id === 'cart' ? 6 : 15);
    const bedX = x + (v.id === 'bike' ? 17 : v.id === 'cart' ? 22 : 3), bedY = y + bounce + (v.id === 'bike' ? -1 : v.id === 'cart' ? 4 : 2);
    const perRow = v.id === 'bike' ? 2 : v.id === 'cart' ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const ex = bedX + (i % perRow) * 4, ey = bedY - row * 3;
      const egg = tr.load[i];
      ctx.fillStyle = EGG_SHELL[egg.tier]; ctx.fillRect(ex, ey, 3, 4);
      ctx.fillStyle = SPR.lighten(EGG_SHELL[egg.tier], 0.5); ctx.fillRect(ex, ey, 1, 1);
      if (egg.golden) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(ex + 1, ey + 2, 1, 1); }
    }
    /* exhaust for engines, sweat for pedals */
    if (moving && Math.floor(now / 120) % 2) {
      ctx.fillStyle = v.cost >= 4000 ? 'rgba(200,190,175,.6)' : 'rgba(150,200,255,.7)';
      ctx.fillRect(x - 4, y + spr.height - 8 + bounce, 3, 3);
      ctx.fillRect(x - 8, y + spr.height - 11 + bounce, 2, 2);
    }
    /* load counter plate */
    if (!moving) {
      const label = tr.load.length + '/' + GAME.truckCap();
      const w = SPR.tinyW(label, 1) + 6;
      const px0 = x + spr.width - w, py0 = y - 12;
      ctx.fillStyle = '#3a2a16'; ctx.fillRect(px0, py0, w, 9);
      ctx.fillStyle = '#e8d5a8'; ctx.fillRect(px0 + 1, py0 + 1, w - 2, 7);
      SPR.drawTiny(ctx, label, px0 + 3, py0 + 2, tr.load.length >= GAME.truckCap() ? '#c43a2a' : '#2e2216', 1);
      if (tr.load.length >= GAME.truckCap() && Math.floor(now / 400) % 2) {
        SPR.drawTiny(ctx, 'FULL', px0 - 18, py0 + 2, '#c43a2a', 1, '#fff8ec');
      }
    }
  }
  /* the road sign by the parking spot: tap for vehicles and routes */
  function drawDepot(now) {
    const st = W.stations.depot;
    const x = st.x, y = st.y;
    ctx.fillStyle = 'rgba(40,58,26,.25)'; ctx.fillRect(x + 2, y + 24, 12, 2);
    ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 7, y + 8, 3, 18);
    ctx.fillStyle = '#a8783f'; ctx.fillRect(x + 7, y + 8, 1, 18);
    /* two arrow boards pointing down the road, each cut to fit its word */
    const cityTxt = GAME.city().name.slice(0, 5).toUpperCase();
    const openTxt = GAME.depotOpen() ? 'DEPOT' : 'SHUT';
    const w1 = SPR.tinyW(cityTxt, 1) + 4, w2 = SPR.tinyW(openTxt, 1) + 4;
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x, y, w1, 8); ctx.fillRect(x + w1, y + 2, 2, 4);
    ctx.fillStyle = '#3f6fd6'; ctx.fillRect(x + 1, y + 1, w1 - 2, 6); ctx.fillRect(x + w1 - 1, y + 3, 2, 2);
    ctx.fillStyle = '#6f9af0'; ctx.fillRect(x + 1, y + 1, w1 - 2, 1);
    SPR.drawTiny(ctx, cityTxt, x + 2, y + 2, '#ffffff', 1);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x - 2, y + 9, w2, 8); ctx.fillRect(x - 4, y + 11, 2, 4);
    ctx.fillStyle = '#e8542f'; ctx.fillRect(x - 1, y + 10, w2 - 2, 6); ctx.fillRect(x - 3, y + 12, 2, 2);
    ctx.fillStyle = '#ff8f6a'; ctx.fillRect(x - 1, y + 10, w2 - 2, 1);
    SPR.drawTiny(ctx, openTxt, x, y + 11, '#ffffff', 1);
    /* a lamp that blinks when you can afford the next vehicle or route */
    const nextV = VEHICLES[S().vehicle + 1];
    const nextC = CITIES.find(c => !S().routes.includes(c.id));
    const can = (nextV && S().coins >= nextV.cost) || (nextC && S().coins >= nextC.cost);
    if (can && Math.floor(now / 380) % 2) {
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 6, y - 4, 4, 3);
      ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 7, y - 4, 1, 1);
    }
  }


  /* what crossbreeding leaves on a bird, drawn in the sprite's own frame
     (head to the right, 20 x 18) */
  function drawGeneMarks(ch, x, y, now) {
    const has = m => ch.mods.includes(m);
    if (has('spots')) {
      ctx.fillStyle = '#2e2216';
      ctx.fillRect(x + 7, y + 9, 3, 2); ctx.fillRect(x + 11, y + 11, 2, 2); ctx.fillRect(x + 8, y + 13, 2, 1); ctx.fillRect(x + 12, y + 8, 2, 1);
    }
    if (has('stripes')) {
      ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 7, y + 10, 6, 1); ctx.fillRect(x + 7, y + 13, 6, 1);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 7, y + 11, 6, 1);
    }
    if (has('ears')) {
      ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 13, y - 6, 3, 8); ctx.fillRect(x + 17, y - 6, 3, 8);
      ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 14, y - 5, 1, 6); ctx.fillRect(x + 18, y - 5, 1, 6);
      ctx.fillStyle = '#ffb0c8'; ctx.fillRect(x + 14, y - 3, 1, 3); ctx.fillRect(x + 18, y - 3, 1, 3);
    }
    if (has('horns')) {
      ctx.fillStyle = '#2e2216'; ctx.fillRect(x + 13, y - 2, 2, 4); ctx.fillRect(x + 17, y - 2, 2, 4);
      ctx.fillStyle = '#e0c9a0'; ctx.fillRect(x + 13, y - 2, 1, 3); ctx.fillRect(x + 18, y - 2, 1, 3);
    }
    if (has('fan')) {
      const cols = ['#1f7a6a', '#2fa78f', '#3fa7d6', '#2fa78f', '#1f7a6a'];
      for (let i = 0; i < 5; i++) {
        const a = -1.2 + i * 0.45, len = 9;
        const fx = x + 5 + Math.round(Math.cos(Math.PI + a) * len), fy = y + 7 + Math.round(Math.sin(Math.PI + a) * len * 0.8);
        ctx.fillStyle = cols[i]; ctx.fillRect(fx, fy, 3, 3);
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(fx + 1, fy + 1, 1, 1);
        ctx.fillStyle = cols[i]; ctx.fillRect(Math.round((fx + x + 5) / 2), Math.round((fy + y + 7) / 2), 1, 1);
      }
    }
  }
  function drawChicken(ch, now) {
    if (ctx === mainCtx && (ch.x + 24 < cam().x || ch.x > cam().x + W.view.w || ch.y + 24 < cam().y || ch.y > cam().y + W.view.h)) return;
    const sp = SPECIES[ch.sp];
    const chick = GAME.isChick(ch);
    const spr = chick ? SPR.chickSprite(sp, 1) : SPR.chickenSprite(sp, 1, false);
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
    /* eating: quick pecks down at the ground, crumbs flying */
    const eating = (ch.eat || 0) > 0;
    const peck = eating ? Math.max(0, Math.sin(now / 70)) * 2 : 0;
    const yy = Math.round(ch.y - bob - hop + peck) + (chick ? 7 : 0);
    /* soft shadow that shrinks as it hops */
    SPR.shadowEll(ctx, ch.x + 10, ch.y + 17.5, (chick ? 5 : 7) - hop * 0.3, 1.5, 0.26);
    if (eating && GAME.setting('particles') && Math.floor(now / 140) % 2) {
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(Math.round(ch.x + (ch.dir === 1 ? 17 : 1) + Math.sin(now / 50) * 2), Math.round(ch.y + 16 - Math.abs(Math.cos(now / 90)) * 4), 1, 1);
      ctx.fillRect(Math.round(ch.x + (ch.dir === 1 ? 19 : 0)), Math.round(ch.y + 15 - Math.abs(Math.sin(now / 110)) * 3), 1, 1);
    }
    ctx.save();
    if (grow !== 1) {
      ctx.translate(Math.round(ch.x) + spr.width / 2, yy + spr.height);
      ctx.scale(ch.dir === 1 ? -grow : grow, grow);
      ctx.drawImage(spr, -spr.width / 2, -spr.height);
    } else if (ch.dir === 1) {
      ctx.translate(Math.round(ch.x) + spr.width, yy);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0);
      if (!chick && ch.mods && ch.mods.length) drawGeneMarks(ch, 0, 0, now);
    } else {
      ctx.drawImage(spr, Math.round(ch.x), yy);
      if (!chick && ch.mods && ch.mods.length) drawGeneMarks(ch, Math.round(ch.x), yy, now);
    }
    ctx.restore();
    /* a chick shows how far it has to grow; a hungry hen asks for food */
    if (chick) {
      /* two rails: what it has been fed on top, how long it has been
         growing underneath. It is ready when both are full. */
      const bx = Math.round(ch.x + 4), by = yy - 7;
      const fed = Math.max(0, Math.min(1, ch.fed === undefined ? ch.age : ch.fed));
      const timed = Math.max(0, Math.min(1, (ch.raised || 0) / GAME.growTime()));
      SPR.drawBar(ctx, bx, by, 14, fed, '#e8a53f', { h: 3 });
      SPR.drawBar(ctx, bx, by + 3, 14, timed, '#7ac74f', { h: 3 });
    } else if (ch.food <= 0 && Math.floor(now / 500) % 2) {
      ctx.fillStyle = '#fff9ec'; ctx.fillRect(Math.round(ch.x + 6), yy - 9, 9, 8);
      ctx.fillStyle = '#2e2216'; ctx.fillRect(Math.round(ch.x + 6), yy - 9, 9, 1); ctx.fillRect(Math.round(ch.x + 6), yy - 1, 9, 1);
      ctx.fillRect(Math.round(ch.x + 5), yy - 8, 1, 7); ctx.fillRect(Math.round(ch.x + 15), yy - 8, 1, 7);
      ctx.drawImage(SPR.iconSprite('seed', 1), Math.round(ch.x + 6), yy - 9);
    }
    /* marked for the cull-bot */
    if (ch.marked) {
      const blink = Math.floor(now / 380) % 2;
      ctx.fillStyle = blink ? '#e8542f' : '#a8321c';
      ctx.fillRect(Math.round(ch.x + 7), Math.round(yy - 6), 6, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(ch.x + 9), Math.round(yy - 5), 2, 2);
      ctx.fillRect(Math.round(ch.x + 9), Math.round(yy - 2), 2, 1);
    }
    /* rank: a star for every rank earned, in a row over the head */
    if (!chick) {
      const stars = GAME.rankOf(ch);
      if (stars > 0) {
        const sx0 = Math.round(ch.x + 10 - stars * 2), sy0 = Math.round(yy - 3);
        for (let i = 0; i < stars; i++) {
          ctx.fillStyle = RANKS[stars].col; ctx.fillRect(sx0 + i * 4, sy0, 3, 3);
          ctx.fillStyle = '#fff8ec'; ctx.fillRect(sx0 + i * 4 + 1, sy0, 1, 1);
          ctx.fillStyle = '#2e2216'; ctx.fillRect(sx0 + i * 4 + 1, sy0 + 2, 1, 1);
        }
        if (stars >= RANKS.length - 1 && Math.floor(now / 300) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(sx0 - 2, sy0 - 1, 1, 1); ctx.fillRect(sx0 + stars * 4 + 1, sy0 + 1, 1, 1); }
      }
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
    /* the nest is stretched to fit a grandma this size: NEST_W wide,
       drawn in two passes so she sits down inside the rim */
    const NEST_W = 38, NEST_H = 13, nx = m.x + 1 - NEST_W / 2, ny = m.y + 3;
    ctx.fillStyle = 'rgba(40,58,26,.24)';
    ctx.fillRect(m.x - 17, m.y + 15, 36, 3);
    ctx.save();
    ctx.beginPath();
    ctx.rect(nx, ny, NEST_W, 6);
    ctx.clip();
    ctx.drawImage(nest, nx, ny, NEST_W, NEST_H);
    ctx.restore();
    ctx.save();
    ctx.translate(m.x + 1, m.y + 14);
    ctx.scale(1 + squish * 0.12, 1 - squish * 0.12);
    ctx.drawImage(mama, -18, -32 + Math.round(bob));
    ctx.restore();

    /* only once supper is wearing off: a small gauge on her nest rail */
    const belly = GAME.mamaBelly();
    if (belly < 0.6) {
      const bw = 18, bx = m.x - 8, by = m.y - 27;
      SPR.drawBar(ctx, bx, by, bw, belly, belly < 0.25 ? '#e8542f' : '#e8a92f', { h: 4 });
      if (belly <= 0 && Math.floor(now / 380) % 2)
        ctx.drawImage(SPR.iconSprite('seed', 1), m.x - 5, by - 12);
    }
    /* and the front rim over her toes */
    ctx.save();
    ctx.beginPath();
    ctx.rect(nx, ny + 6, NEST_W, NEST_H);
    ctx.clip();
    ctx.drawImage(nest, nx, ny, NEST_W, NEST_H);
    ctx.restore();
    if (S().mama.petCd <= 0 && !GAME.mamaHungry() && Math.floor(now / 400) % 2) {
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
    } else if (tool === 'farm') {
      const sel = farmPick();
      const tc = Math.floor(x / 16), trr = Math.floor(y / 16);
      const soil = S().soil[tc + ',' + trr];
      if (sel.kind === 't') {
        /* a round brush outline that pulses while you paint */
        const r = brushPx() + (ptr.down ? 1 : 0);
        const col = sel.id === 'flat' ? '#ff9f8a' : sel.id === 'water' ? '#7fd6f5'
                  : sel.id === 'high' ? '#9ada66' : sel.id === 'stone' ? '#d8d2c0'
                  : sel.id === 'soil' ? '#a37a49' : '#d1a86b';
        const spin = now / 340;
        for (let i = 0; i < 40; i++) {
          const a = i / 40 * Math.PI * 2 + spin;
          if ((i + Math.floor(now / 90)) % 5 < 2) continue;
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
        }
        ctx.fillStyle = 'rgba(255,255,255,.20)';
        for (let dy = -r; dy <= r; dy += 2) {
          const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
          ctx.fillRect(Math.round(x) - half, Math.round(y + dy), half * 2, 1);
        }
        ctx.drawImage(SPR.iconSprite(TERRAIN[sel.id] ? TERRAIN[sel.id].icon : 'remove', 1),
                      Math.round(x - 4), Math.round(y - r - 12 + (ptr.down ? 2 : 0)));
      } else {
        let ok, deco = null, crop = null;
        if (sel.kind === 'd') { ok = GAME.canDecorate(sel.id, tc, trr); deco = sel.id; }
        else if (sel.kind === 'c') { ok = GAME.canPlant(tc, trr, sel.id); crop = sel.id; }
        else if (sel.id === 'water') ok = !!soil;
        else if (sel.id === 'harvest') ok = !!(soil && GAME.ripe(soil));
        else ok = !!(GAME.decoAt(tc, trr) || GAME.paintAt(x, y) || (soil && !soil.crop));
        ctx.globalAlpha = 0.55;
        if (deco) {
          const spr = SPR.decoSprite(DECOS[deco].kind, 1, 40 + DECO_KEYS.indexOf(deco) * 7);
          ctx.drawImage(spr, tc * 16 + 8 - Math.floor(spr.width / 2), trr * 16 + 15 - spr.height);
        } else if (crop) {
          ctx.drawImage(SPR.cropSprite(crop, CROPS[crop].stages - 1, 3, 1), tc * 16, trr * 16 - 4);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = ok ? 'rgba(122,199,79,.28)' : 'rgba(232,84,47,.26)';
        ctx.fillRect(tc * 16, trr * 16, 16, 16);
        const dash = Math.floor(now / 90) % 4;
        ctx.fillStyle = ok ? '#dfffc4' : '#ffc9b8';
        for (let i = 0; i < 16; i++) {
          if ((i + dash) % 4 < 2) { ctx.fillRect(tc * 16 + i, trr * 16, 1, 1); ctx.fillRect(tc * 16 + i, trr * 16 + 15, 1, 1); }
          if ((i + dash) % 4 < 2) { ctx.fillRect(tc * 16, trr * 16 + i, 1, 1); ctx.fillRect(tc * 16 + 15, trr * 16 + i, 1, 1); }
        }
        const icon = sel.kind === 't' ? 'hoe' : sel.kind === 'd' ? 'tree' : sel.kind === 'c' ? 'sprout'
                   : sel.id === 'water' ? 'water' : sel.id === 'harvest' ? 'scythe' : 'remove';
        ctx.drawImage(SPR.iconSprite(icon, 1), Math.round(x - 4), Math.round(y - 6 + (ptr.down ? 2 : 0)));
      }
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
    else if (buildSel === 'polisher') drawPolisher(c, r, {}, now);
    else if (buildSel === 'grader') drawGrader(c, r, {}, now);
    else if (buildSel === 'dynamo') drawDynamo(c, r, {}, now);
    else if (buildSel === 'hatchery') drawHatchery(c, r, { queue: [], prog: 0 }, now);
    else if (buildSel === 'barn') drawBarn(c, r, {}, now);
    else if (buildSel === 'trough') drawTrough(c, r, { n: 6 }, now);
    else if (buildSel === 'well') drawWell(c, r, {}, now);
    else if (buildSel === 'sprinkler') drawSprinkler(c, r, {}, now);
    else if (buildSel === 'mill') drawMill(c, r, {}, now);
    else if (buildSel === 'coop') drawCoop(c, r, {}, now);
    else if (buildSel === 'board') drawBoard(c, r, {}, now);
    else if (buildSel === 'hq') drawHQ(c, r, {}, now);
    else if (buildSel === 'kitchen') drawKitchen(c, r, { pantry: [], counter: [], recipe: 'omelette', cook: null }, now);
    else if (buildSel === 'park') drawPark(c, r, { slots: [] }, now);
    else if (buildSel === 'timemachine') drawTimeMachine(c, r, { on: false, t: 0, T: 1 }, now);
    else if (buildSel === 'billboard') drawBillboard(c, r, { art: null }, now);
    else drawIncubator(c, r, { queue: [], prog: 0 }, now);
    ctx.globalAlpha = 1;
    if (buildSel === 'well' || buildSel === 'sprinkler' || buildSel === 'coop') {
      const R = buildSel === 'well' ? ECON.wellR : buildSel === 'sprinkler' ? ECON.sprinklerR : ECON.coopR;
      ctx.fillStyle = buildSel === 'coop' ? 'rgba(255,210,63,.14)' : 'rgba(120,180,255,.16)';
      const cx = c * 16 + b.w * 8, cy = r * 16 + b.h * 8;
      for (let dy = -R; dy <= R; dy += 2) { const half = Math.round(Math.sqrt(R * R - dy * dy)); ctx.fillRect(cx - half, cy + dy, half * 2, 1); }
    }
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
  /* the HR Office: a squat brick block with a camera on every corner and a
     wall of little screens glowing in the window */
  function drawHR(c, r, hr, now) {
    const x = c * 16, y = r * 16;
    SPR.shadowEll(ctx, x + 16, y + 31, 16, 2, 0.26);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 6, 30, 26);
    ctx.fillStyle = '#9aa3ad'; ctx.fillRect(x + 2, y + 7, 28, 24);
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(x + 2, y + 7, 28, 2);
    ctx.fillStyle = '#6a7280'; ctx.fillRect(x + 2, y + 28, 28, 3);
    /* the wall of monitors in the window */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 4, y + 11, 15, 11);
    for (let i = 0; i < 6; i++) {
      const mx = x + 5 + (i % 3) * 5, my = y + 12 + Math.floor(i / 3) * 5;
      ctx.fillStyle = (Math.floor(now / 700) + i) % 5 === 0 ? '#1a2a24' : '#7ef2a8'; ctx.fillRect(mx, my, 4, 4);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(mx, my, 4, 1);
    }
    /* door, a sign, a camera on a stalk */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 21, y + 18, 8, 13); ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 22, y + 19, 6, 12); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 26, y + 25, 1, 1);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 20, y + 10, 10, 6); ctx.fillStyle = '#e8542f'; ctx.fillRect(x + 21, y + 11, 8, 4); SPR.drawTiny(ctx, 'HR', x + 22, y + 11, '#ffffff', 1);
    const sw = Math.round(Math.sin(now / 1400) * 2);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 29, y + 1, 1, 6); ctx.fillRect(x + 26 + sw, y + 1, 5, 3);
    ctx.fillStyle = Math.floor(now / 500) % 2 ? '#ff4a3a' : '#7a1a12'; ctx.fillRect(x + 27 + sw, y + 2, 1, 1);
    if (S().staff.length && Math.floor(now / 900) % 3 === 0) { ctx.fillStyle = 'rgba(126,242,168,.5)'; ctx.fillRect(x + 4, y + 22, 15, 1); }
  }
  /* the Cannery: a tin-roofed shed with a chimney and a conveyor of jars in the window */
  function drawCannery(c, r, cn, now) {
    const x = c * 16, y = r * 16;
    SPR.shadowEll(ctx, x + 16, y + 31, 16, 2, 0.26);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 1, y + 10, 30, 22);
    ctx.fillStyle = '#e8b96f'; ctx.fillRect(x + 2, y + 11, 28, 20);
    ctx.fillStyle = '#c9924f'; for (let i = 0; i < 5; i++) ctx.fillRect(x + 2, y + 13 + i * 4, 28, 1);
    ctx.fillStyle = '#a8785a'; ctx.fillRect(x + 2, y + 28, 28, 3);
    /* corrugated tin roof */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x - 1, y + 4, 34, 7);
    for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#c9ced6' : '#9aa3ad'; ctx.fillRect(x + i * 2, y + 5, 2, 5); }
    /* chimney and smoke while it works */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 24, y - 3, 5, 8); ctx.fillStyle = '#6a7280'; ctx.fillRect(x + 25, y - 2, 3, 7);
    if (cn.cook && GAME.setting('particles')) for (let i = 0; i < 3; i++) { const t = ((now / 700 + i * 0.33) % 1); ctx.fillStyle = 'rgba(240,240,240,' + (0.6 - t * 0.5).toFixed(2) + ')'; ctx.fillRect(x + 25 + Math.round(Math.sin(now / 300 + i) * 2), Math.round(y - 4 - t * 12), 3 - Math.floor(t * 2), 2); }
    /* window with jars going by */
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 4, y + 14, 14, 9); ctx.fillStyle = '#bfe8f5'; ctx.fillRect(x + 5, y + 15, 12, 7);
    const G = GOODS[cn.recipe] || GOODS.flour;
    for (let i = 0; i < 3; i++) { const jx = x + 5 + ((i * 5 + Math.floor(now / 200)) % 13); if (jx < x + 15) { ctx.fillStyle = G.col; ctx.fillRect(jx, y + 18, 2, 3); ctx.fillStyle = '#c9a35f'; ctx.fillRect(jx, y + 17, 2, 1); } }
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 20, y + 18, 8, 13); ctx.fillStyle = '#5e3d18'; ctx.fillRect(x + 21, y + 19, 6, 12);
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x + 19, y + 11, 11, 6); ctx.fillStyle = '#6ab04c'; ctx.fillRect(x + 20, y + 12, 9, 4); SPR.drawTiny(ctx, 'CAN', x + 20, y + 12, '#fff8ec', 1);
    if (cn.cook) SPR.drawBar(ctx, x + 2, y + 1, 20, Math.min(1, cn.cook.t / cn.cook.T), '#ffd23f', { h: 4 });
  }
  /* the limousine, on its way in with a present */
  function drawLimo(now) {
    const L = GAME.limo;
    if (!L) return;
    const spr = drawCar('limo', '#1a1a22', L.x, L.y, -1, Math.floor(now / 90) % 2);
    /* a gold pennant and a glow while it waits */
    if (L.state === 'drop') {
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(Math.round(L.x + 18), Math.round(L.y - 4 + Math.sin(now / 200)), 4, 2);
      if (Math.floor(now / 250) % 2) { ctx.fillStyle = 'rgba(255,240,180,.6)'; ctx.fillRect(Math.round(L.x + spr.width - 2), Math.round(L.y + 6), 2, 3); }
    }
  }
  function drawPresents(now) {
    S().presents.forEach(p => {
      const spr = SPR.presentSprite(1, S().company.col1, S().company.col2);
      const bob = p.z >= 0 ? Math.sin(now / 260 + p.wob) * 1 : 0;
      SPR.shadowEll(ctx, p.x, p.y + 1, 6 + Math.min(0, p.z) * 0.15, 1.5, 0.24);
      ctx.drawImage(spr, Math.round(p.x - 7), Math.round(p.y - 13 + p.z + bob));
      /* a sparkle, and the clock running down */
      if (Math.floor(now / 300 + p.id) % 3 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(p.x + 6), Math.round(p.y - 14 + bob), 1, 1); ctx.fillRect(Math.round(p.x - 8), Math.round(p.y - 6 + bob), 1, 1); }
      if (p.t < 30) SPR.drawBar(ctx, Math.round(p.x - 7), Math.round(p.y + 3), 14, p.t / 30, '#e8542f', { h: 3 });
    });
  }
  /* HELP WANTED posters along the road while a campaign is out */
  function drawPosters(now) {
    if (!S().flyer) return;
    const e = GAME.boardSpot(0);
    [[e.x - 40, W.roadY - 22], [e.x + 30, W.roadY - 24], [W.stations.depot.x - 30, W.roadY - 20]].forEach(([px, py], i) => {
      if (px < 8) return;
      const spr = SPR.posterSprite(1);
      ctx.drawImage(spr, Math.round(px), Math.round(py + (Math.floor(now / 500 + i) % 2 ? 0 : -0.5)));
    });
  }
  /* the day turns: a warm dawn, a clear noon, a blue dusk and a dark night
     with lamps in it, across one 300 second day */
  function drawDayNight(now) {
    if (!GAME.setting('dayNight')) return;
    const ph = GAME.dayPhase();
    const cx = cam().x, cy = cam().y, vw = W.view.w, vh = W.view.h;
    let tint = null;
    if (ph < 0.12) tint = 'rgba(255,170,90,' + (0.16 * (1 - ph / 0.12)).toFixed(3) + ')';
    else if (ph > 0.62 && ph <= 0.78) tint = 'rgba(255,140,80,' + (0.14 * ((ph - 0.62) / 0.16)).toFixed(3) + ')';
    else if (ph > 0.78) { const d = Math.min(1, (ph - 0.78) / 0.1) * (ph > 0.95 ? (1 - ph) / 0.05 : 1); tint = 'rgba(20,30,70,' + (0.34 * d).toFixed(3) + ')'; }
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(cx, cy, vw, vh); }
    if (ph > 0.76) {
      /* lamp posts and lit windows push the dark back */
      const glow = Math.min(1, (ph - 0.76) / 0.08);
      ctx.fillStyle = 'rgba(255,220,140,' + (0.16 * glow).toFixed(3) + ')';
      for (const k of Object.keys(S().deco)) {
        if (S().deco[k].kind !== 'lamp') continue;
        const [c, r] = k.split(',').map(Number);
        const lx = c * 16 + 8, ly = r * 16 + 4;
        if (lx < cx - 40 || lx > cx + vw + 40 || ly < cy - 40 || ly > cy + vh + 40) continue;
        for (let dy = -2; dy <= 26; dy += 2) { const half = Math.round(4 + dy * 0.55); ctx.fillRect(lx - half, ly + dy, half * 2, 2); }
      }
      /* fireflies */
      if (GAME.setting('particles')) for (let i = 0; i < 12; i++) {
        if ((i + Math.floor(now / 400)) % 3 === 0) continue;
        const fx = cx + ((i * 97 + Math.floor(now / 110 + i * 30)) % vw), fy = cy + ((i * 53 + Math.floor(Math.sin(now / 900 + i) * 6) + vh) % vh);
        ctx.fillStyle = 'rgba(255,240,150,' + (0.9 * glow).toFixed(2) + ')'; ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
      }
    }
  }
  /* leaves blowing off the trees, and the odd gust across the grass */
  let leaves = [];
  function drawLeaves(dt, now) {
    if (!GAME.setting('particles')) return;
    const cx = cam().x, cy = cam().y, vw = W.view.w, vh = W.view.h;
    if (leaves.length < 10 && Math.random() < dt * 1.5) {
      const trees = Object.keys(S().deco).filter(k => ['tree', 'pine', 'apple'].includes(S().deco[k].kind));
      if (trees.length) {
        const [c, r] = trees[Math.floor(Math.random() * trees.length)].split(',').map(Number);
        leaves.push({ x: c * 16 + 4 + Math.random() * 8, y: r * 16 - 10, t: 0, life: 2.5 + Math.random() * 2, ph: Math.random() * 6, col: Math.random() < 0.3 ? '#e0a416' : '#7fbf4f' });
      }
    }
    leaves = leaves.filter(l => (l.t += dt) < l.life);
    leaves.forEach(l => {
      l.x += (9 + Math.sin(l.t * 3 + l.ph) * 6) * dt; l.y += (7 + Math.cos(l.t * 4 + l.ph) * 3) * dt;
      if (l.x < cx - 10 || l.x > cx + vw + 10 || l.y < cy - 10 || l.y > cy + vh + 10) return;
      ctx.globalAlpha = Math.min(1, (l.life - l.t)); ctx.fillStyle = l.col;
      ctx.fillRect(Math.round(l.x), Math.round(l.y), Math.floor(l.t * 6) % 2 ? 2 : 1, 1); ctx.globalAlpha = 1;
    });
    /* gusts: pale streaks racing over the grass during rain or at random */
    if (S().weather.rain || Math.floor(now / 9000) % 4 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      for (let i = 0; i < 6; i++) {
        const gx = ((i * 211 + now / 6) % (vw + 80)) + cx - 40, gy = ((i * 97) % vh) + cy;
        ctx.fillRect(Math.round(gx), Math.round(gy), 9, 1);
      }
    }
  }
  /* a camera feed for the HR room: the ground and whoever stands on it,
     framed on one point, drawn into someone else's canvas */
  function cameraFeed(g, wx, wy, vw, vh, now) {
    if (!groundCv) buildGround();
    if (terrDirty) rebuildTerrain();
    const saved = ctx;
    ctx = g;
    try {
      const ox = Math.round(wx - vw / 2), oy = Math.round(wy - vh / 2);
      g.save();
      g.beginPath(); g.rect(0, 0, vw, vh); g.clip();
      g.translate(-ox, -oy);
      g.imageSmoothingEnabled = false;
      g.drawImage(groundCv, 0, 0);
      g.drawImage(terrCv, 0, -TERR_LIFT);
      const near = (x, y) => x > ox - 48 && x < ox + vw + 48 && y > oy - 48 && y < oy + vh + 48;
      for (const k of Object.keys(S().soil)) { const [c, r] = k.split(',').map(Number); const t = S().soil[k]; if (t.crop && near(c * 16, r * 16)) g.drawImage(SPR.cropSprite(t.crop, GAME.cropStage(t), t.seed, 1), c * 16, r * 16 - 4); }
      const stores = [['belts', drawBelt, true], ['fences', drawFence, true], ['incs', drawIncubator], ['nests', drawLoveNest], ['huts', drawStaffHut], ['silos', drawSilo], ['barns', drawBarn], ['coops', drawCoop], ['wells', drawWell], ['troughs', drawTrough], ['boards', drawBoard], ['hqs', drawHQ], ['kitchens', drawKitchen], ['hrs', drawHR], ['canneries', drawCannery], ['mills', drawMill], ['beehives', drawBeehive], ['genelabs', drawGeneLab]];
      stores.forEach(([m, fn, dirOnly]) => Object.keys(S()[m] || {}).forEach(k => { const [c, r] = k.split(',').map(Number); if (!near(c * 16, r * 16)) return; if (m === 'belts') fn(c, r, S()[m][k].dir, now); else if (m === 'fences') fn(c, r, now); else fn(c, r, S()[m][k], now); }));
      for (const k of Object.keys(S().deco)) { const [c, r] = k.split(',').map(Number); if (!near(c * 16, r * 16)) continue; const d = S().deco[k]; const spr = SPR.decoSprite(DECOS[d.kind] ? DECOS[d.kind].kind : 'tuft', 1, d.seed); g.drawImage(spr, c * 16 + 8 - Math.floor(spr.width / 2), r * 16 + 15 - spr.height); }
      S().eggs.forEach(e => { if (near(e.x, e.y)) drawEgg(e, now); });
      S().feed.forEach(f => { if (near(f.x, f.y)) { g.fillStyle = '#e0a416'; g.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); } });
      if (near(W.mama.x, W.mama.y)) drawMama(now);
      S().chickens.forEach(ch => { if (near(ch.x, ch.y)) drawChicken(ch, now); });
      S().staff.forEach(w => { if (near(w.x, w.y)) drawStaff(w, now); });
      const b = GAME.boss(); if (b && near(b.x, b.y)) drawBoss(now);
      S().applicants.forEach(a2 => { if (a2.x !== undefined && near(a2.x, a2.y)) drawApplicant(a2, now); });
      g.restore();
    } finally { ctx = saved; }
  }

  function render(now, dt) {
    if (GAME.dirty.ground || !groundCv) buildGround();
    /* the camera can sit a little past the foot of the map so the dock
       never hides your land, so paint the surround before anything else */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#3c5a24';
    ctx.fillRect(0, 0, cv.width, cv.height);
    shk.t += realDt;
    const [shx, shy] = shakeOff();
    ctx.setTransform(SC, 0, 0, SC, Math.round((-cam().x + shx) * SC), Math.round((-cam().y + shy) * SC));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(groundCv, 0, 0);

    /* ---- everything you painted, blitted from its own layer ---- */
    if (terrDirty) rebuildTerrain();
    ctx.drawImage(terrCv, 0, -TERR_LIFT);
    /* water catches the light */
    if (GAME.paintedCells()) {
      const t0 = Math.floor(now / 260);
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      for (let i = 0; i < 26; i++) {
        const gx = ((i * 137 + t0 * 3) % (W.view.w + 40)) + cam().x - 20;
        const gy = ((i * 313 + Math.floor(t0 / 3) * 5) % (W.view.h + 40)) + cam().y - 20;
        if (GAME.paintAt(gx, gy) !== 'water') continue;
        if ((i + t0) % 4) continue;
        ctx.fillRect(Math.round(gx), Math.round(gy), 3, 1);
      }
    }
    /* the soil itself comes off the paint layer; only what grows in it
       is drawn per tile */
    for (const k of Object.keys(S().soil)) {
      const [c, r] = k.split(',').map(Number);
      const t = S().soil[k];
      if (c * 16 + 16 < cam().x || c * 16 > cam().x + W.view.w || r * 16 + 20 < cam().y || r * 16 > cam().y + W.view.h) continue;
      if (t.water > 0) {
        /* a damp sheen while the watering can is still on it */
        ctx.fillStyle = 'rgba(60,110,150,.16)';
        ctx.fillRect(c * 16, r * 16, 16, 16);
      }
      if (t.crop) {
        const stage = GAME.cropStage(t);
        const sway = t.growth > 0.3 ? Math.round(Math.sin(now / 700 + c * 1.3 + r) * 0.6) : 0;
        /* the same seeded nudge, so a planted field looks sown by hand */
        const jx = (t.seed % 5) - 2, jy = ((t.seed >> 3) % 3) - 1;
        ctx.drawImage(SPR.cropSprite(t.crop, stage, t.seed, 1), c * 16 + sway + jx, r * 16 - 4 + jy);
        if (GAME.ripe(t) && Math.floor(now / 420) % 2) {
          ctx.fillStyle = '#fff8ec'; ctx.fillRect(c * 16 + 12, r * 16 - 6, 2, 2);
          ctx.fillStyle = '#ffd23f'; ctx.fillRect(c * 16 + 3, r * 16 - 3, 1, 1);
        }
        /* a dry crop asks for water; with the farm tool out, every crop shows how far along it is */
        const dry = t.growth < 1 && t.water <= 0 && !GAME.wateredBy(c, r);
        if (dry && Math.floor(now / 600 + c) % 2) {
          ctx.fillStyle = '#2e2216'; ctx.fillRect(c * 16 + 6, r * 16 - 9, 4, 5); ctx.fillRect(c * 16 + 7, r * 16 - 10, 2, 1);
          ctx.fillStyle = '#5fa8e8'; ctx.fillRect(c * 16 + 7, r * 16 - 8, 2, 3); ctx.fillStyle = '#b5e0f5'; ctx.fillRect(c * 16 + 7, r * 16 - 8, 1, 1);
        }
        if (S().tool === 'farm' && t.growth < 1) {
          ctx.fillStyle = '#2e2216'; ctx.fillRect(c * 16 + 2, r * 16 + 13, 12, 3);
          ctx.fillStyle = dry ? '#8a7a5a' : '#7ac74f'; ctx.fillRect(c * 16 + 3, r * 16 + 14, Math.round(10 * t.growth), 1);
        }
      }
    }
    /* watered circles from wells and sprinklers, faint */
    if (S().tool === 'farm') {
      ctx.fillStyle = 'rgba(120,180,255,.10)';
      const ring = (x, y, R) => { for (let dy = -R; dy <= R; dy += 2) { const half = Math.round(Math.sqrt(R * R - dy * dy)); ctx.fillRect(x - half, y + dy, half * 2, 1); } };
      Object.keys(S().wells).forEach(k => { const [c, r] = k.split(',').map(Number); ring(c * 16 + 8, r * 16 + 8, ECON.wellR); });
      Object.keys(S().sprinklers).forEach(k => { const [c, r] = k.split(',').map(Number); ring(c * 16 + 8, r * 16 + 8, ECON.sprinklerR); });
      ctx.fillStyle = 'rgba(255,210,63,.10)';
      Object.keys(S().beehives).forEach(k => { const [c, r] = k.split(',').map(Number); ring(c * 16 + 8, r * 16 + 8, ECON.beehiveR); });
    }
    drawLab(now); drawStand(now); drawMamaSign(now); drawDepot(now);

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
    for (const k of Object.keys(S().polishers)) { const [c, r] = k.split(',').map(Number); drawPolisher(c, r, S().polishers[k], now); }
    for (const k of Object.keys(S().graders)) { const [c, r] = k.split(',').map(Number); drawGrader(c, r, S().graders[k], now); }
    for (const k of Object.keys(S().dynamos)) { const [c, r] = k.split(',').map(Number); drawDynamo(c, r, S().dynamos[k], now); }
    for (const k of Object.keys(S().hatchers)) { const [c, r] = k.split(',').map(Number); drawHatchery(c, r, S().hatchers[k], now); }
    for (const k of Object.keys(S().troughs)) { const [c, r] = k.split(',').map(Number); drawTrough(c, r, S().troughs[k], now); }
    for (const k of Object.keys(S().wells)) { const [c, r] = k.split(',').map(Number); drawWell(c, r, S().wells[k], now); }
    for (const k of Object.keys(S().sprinklers)) { const [c, r] = k.split(',').map(Number); drawSprinkler(c, r, S().sprinklers[k], now); }
    for (const k of Object.keys(S().boards)) { const [c, r] = k.split(',').map(Number); drawBoard(c, r, S().boards[k], now); }
    for (const k of Object.keys(S().hqs)) { const [c, r] = k.split(',').map(Number); drawHQ(c, r, S().hqs[k], now); }
    for (const k of Object.keys(S().barns)) { const [c, r] = k.split(',').map(Number); drawBarn(c, r, S().barns[k], now); }
    for (const k of Object.keys(S().mills)) { const [c, r] = k.split(',').map(Number); drawMill(c, r, S().mills[k], now); }
    for (const k of Object.keys(S().coops)) { const [c, r] = k.split(',').map(Number); drawCoop(c, r, S().coops[k], now); }
    for (const k of Object.keys(S().beehives)) { const [c, r] = k.split(',').map(Number); drawBeehive(c, r, S().beehives[k], now); }
    for (const k of Object.keys(S().genelabs)) { const [c, r] = k.split(',').map(Number); drawGeneLab(c, r, S().genelabs[k], now); }
    for (const k of Object.keys(S().billboards)) { const [c, r] = k.split(',').map(Number); drawBillboard(c, r, S().billboards[k], now); }
    for (const k of Object.keys(S().kitchens)) { const [c, r] = k.split(',').map(Number); drawKitchen(c, r, S().kitchens[k], now); }
    for (const k of Object.keys(S().parks)) { const [c, r] = k.split(',').map(Number); drawPark(c, r, S().parks[k], now); }
    for (const k of Object.keys(S().timemachines)) { const [c, r] = k.split(',').map(Number); drawTimeMachine(c, r, S().timemachines[k], now); }
    for (const k of Object.keys(S().hrs)) { const [c, r] = k.split(',').map(Number); drawHR(c, r, S().hrs[k], now); }
    for (const k of Object.keys(S().canneries)) { const [c, r] = k.split(',').map(Number); drawCannery(c, r, S().canneries[k], now); }
    drawPosters(now);
    for (const k of Object.keys(S().storeys)) drawStorey(k, now);
    for (const k of Object.keys(S().sites)) drawSite(k, S().sites[k], now);
    drawBrand(now);
    S().applicants.forEach(a => drawApplicant(a, now));
    /* things you planted for the look of them */
    for (const k of Object.keys(S().deco)) {
      const [c, r] = k.split(',').map(Number);
      if (c * 16 + 24 < cam().x || c * 16 - 8 > cam().x + W.view.w || r * 16 + 24 < cam().y || r * 16 - 20 > cam().y + W.view.h) continue;
      const d = S().deco[k];
      const spr = SPR.decoSprite(DECOS[d.kind] ? DECOS[d.kind].kind : 'tuft', 1, d.seed);
      /* nudged off the tile centre by its own seed, so a row of trees
         does not line up like fence posts on a grid */
      const jx = (d.seed % 7) - 3, jy = ((d.seed >> 3) % 5) - 2;
      const px0 = c * 16 + 8 + jx - Math.floor(spr.width / 2);
      const py0 = r * 16 + 15 + jy - spr.height;
      shadow(ctx, c * 16 + 8 + jx, r * 16 + 14 + jy, spr.width * 0.34);
      const sway = spr.height > 14 ? Math.round(Math.sin(now / 1100 + c * 1.7 + r) * 0.5) : 0;
      ctx.drawImage(spr, px0 + sway, py0);
    }

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
    S().fossils.forEach(f => drawFossil(f, now));
    S().eggs.forEach(e => drawEgg(e, now));
    S().plumes.forEach(pl => drawPlume(pl, now));
    drawMama(now);
    S().chickens.forEach(ch => drawChicken(ch, now));
    S().staff.forEach(w => drawStaff(w, now));
    drawBoss(now);
    drawWarden(now);
    S().visitors.forEach(v => drawVisitor(v, now));
    drawTruck(now);
    drawFarSide(now);
    drawTraffic(now);
    drawOrders(now);
    drawMovers(now);
    drawLimo(now);
    drawPresents(now);
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

    drawAmbientFx(now, dt);
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

    drawLeaves(dt, now);
    drawDayNight(now);
    drawWeather(now);
    drawAge(now, dt);

    /* scoop ring: two dashed rings turning against each other, and it
       snaps in for a frame every time something goes in the basket */
    if (ptr.down && S().tool === 'basket' && ptr.inside) {
      const R0 = GAME.scoopR();
      const kick = Math.max(0, 1 - (performance.now() - scoopAt) / 140);
      const R = R0 * (1 - kick * 0.12);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.7 + kick * 0.3).toFixed(2) + ')';
      for (let a = 0; a < Math.PI * 2; a += 0.22) {
        if (Math.floor(a * 4 + now / 200) % 2) continue;
        ctx.fillRect(Math.round(ptr.x + Math.cos(a) * R), Math.round(ptr.y + Math.sin(a) * R * 0.85), 1, 1);
      }
      ctx.fillStyle = 'rgba(255,210,63,.5)';
      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        if (Math.floor(a * 3 - now / 260) % 2) continue;
        const r2 = R * 0.72;
        ctx.fillRect(Math.round(ptr.x + Math.cos(a) * r2), Math.round(ptr.y + Math.sin(a) * r2 * 0.85), 1, 1);
      }
      if (kick > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (kick * 0.5).toFixed(2) + ')';
        for (let a = 0; a < Math.PI * 2; a += 0.5) ctx.fillRect(Math.round(ptr.x + Math.cos(a) * R * 1.1), Math.round(ptr.y + Math.sin(a) * R * 0.94), 2, 2);
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

    drawFlash(realDt);

    /* vignette */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.56, cv.width / 2, cv.height / 2, cv.height * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(48,36,18,.20)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }

  /* rain: a cool wash over everything, streaks slanting down, splashes on
     the ground; then a rainbow for a few seconds once it stops */
  function drawWeather(now) {
    const w = GAME.weather;
    const cx = cam().x, cy = cam().y, vw = W.view.w, vh = W.view.h;
    if (w.rain) {
      const f = Math.min(1, w.left / 6, (ECON.rainLength * 1.5 - w.left) / 4);   /* eases in and out */
      ctx.fillStyle = 'rgba(40,60,90,' + (0.16 * f).toFixed(3) + ')';
      ctx.fillRect(cx, cy, vw, vh);
      ctx.fillStyle = 'rgba(190,220,255,' + (0.55 * f).toFixed(3) + ')';
      const t = now / 4;
      for (let i = 0; i < 110; i++) {
        const x = ((i * 137 + t * 1.2) % (vw + 60)) + cx - 30;
        const y = ((i * 313 + t * 3) % (vh + 40)) + cy - 20;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 5);
        ctx.fillRect(Math.round(x) - 1, Math.round(y) + 5, 1, 2);
      }
      /* splashes where the drops land */
      ctx.fillStyle = 'rgba(220,240,255,' + (0.5 * f).toFixed(3) + ')';
      const s2 = Math.floor(now / 90);
      for (let i = 0; i < 30; i++) {
        const x = ((i * 211 + s2 * 17) % vw) + cx, y = ((i * 97 + s2 * 5) % vh) + cy;
        if ((i + s2) % 3) continue;
        ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
      }
    }
  }

  /* the age the company is in: a colour grade over the valley, a little
     weather of its own, and a banner across the field when a new one begins */
  let ageFx = null;
  function drawAge(now, dt) {
    const a = GAME.age();
    const cx = cam().x, cy = cam().y, vw = W.view.w, vh = W.view.h;
    if (a.tint) { ctx.fillStyle = a.tint; ctx.fillRect(cx, cy, vw, vh); }
    if (a.id === 'steam') {
      /* wisps of steam drifting up off the whole valley */
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      const t0 = Math.floor(now / 80);
      for (let i = 0; i < 14; i++) {
        const x = ((i * 137 + t0) % (vw + 40)) + cx - 20;
        const y = ((((i * 313 - t0 * 2) % (vh + 40)) + vh + 40) % (vh + 40)) + cy - 20;
        ctx.fillRect(Math.round(x), Math.round(y), 3 + (i % 3), 2);
      }
    } else if (a.id === 'electric') {
      /* fireflies */
      for (let i = 0; i < 18; i++) {
        if ((i + Math.floor(now / 300)) % 4 === 0) continue;
        const x = cx + ((i * 97 + Math.floor(now / 90 + i * 30)) % vw), y = cy + ((i * 53 + Math.floor(Math.sin(now / 700 + i) * 6) + vh) % vh);
        ctx.fillStyle = 'rgba(255,240,150,.9)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    } else if (a.id === 'space') {
      /* a satellite crossing high up, blinking */
      const sx = cx + ((now / 40) % (vw + 60)) - 30, sy = cy + 14 + Math.sin(now / 2000) * 6;
      ctx.fillStyle = '#c9ced6'; ctx.fillRect(Math.round(sx), Math.round(sy), 3, 1); ctx.fillRect(Math.round(sx) + 1, Math.round(sy) - 1, 1, 3);
      if (Math.floor(now / 250) % 2) { ctx.fillStyle = '#ff5f5f'; ctx.fillRect(Math.round(sx) + 1, Math.round(sy), 1, 1); }
    } else if (a.id === 'jurassic') {
      /* pollen in a very old light */
      ctx.fillStyle = 'rgba(220,255,160,.55)';
      for (let i = 0; i < 16; i++) {
        const x = ((i * 137 + Math.floor(now / 60)) % (vw + 40)) + cx - 20, y = ((i * 313 + Math.floor(now / 90)) % (vh + 40)) + cy - 20;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    /* the banner, when a new age begins */
    if (ageFx && now - ageFx.t < 4200) {
      const f = (now - ageFx.t) / 4200;
      ctx.globalAlpha = f < 0.1 ? f / 0.1 : f > 0.8 ? (1 - f) / 0.2 : 1;
      const txt = 'THE ' + ageFx.a.name.toUpperCase();
      const k = 2, tw = SPR.textW(txt, k);
      const bx = Math.round(cx + vw / 2 - tw / 2 - 10), by = Math.round(cy + 40);
      ctx.fillStyle = 'rgba(24,18,12,.82)'; ctx.fillRect(bx, by - 6, tw + 20, 34);
      ctx.fillStyle = ageFx.a.hue; ctx.fillRect(bx, by - 6, tw + 20, 2); ctx.fillRect(bx, by + 26, tw + 20, 2);
      SPR.drawTitle(ctx, txt, bx + 10, by, ageFx.a.hue, '#1a120a', k);
      const sub = ageFx.a.blurb.toUpperCase();
      SPR.drawTiny(ctx, sub, Math.round(cx + vw / 2 - SPR.tinyW(sub, 1) / 2), by + 17, '#fff8ec', 1, '#1a120a');
      ctx.globalAlpha = 1;
    } else if (ageFx) ageFx = null;
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
        if (r === true) {
          snd.scoop(); updateCursorChip();
          /* the pop: a ring off the shell, a glint, a few sparks in its colour */
          const col = EGG_SHELL[Math.min(e.tier, EGG_SHELL.length - 1)];
          fly(SPR.eggSprite(e.tier, 1, false), e.x, e.y, { life: 0.36, s1: 1.9, vy: -70 });
          ring(e.x, e.y, 'rgba(255,255,255,1)', 14, 0.22);
          glint(e.x, e.y - 2, '#fff8ec', 3);
          sparks(e.x, e.y, 3, col, 50);
          /* a run of them builds: every fifth says so and hits harder */
          const nowMs = performance.now();
          scoopCombo = nowMs - scoopAt < 700 ? scoopCombo + 1 : 1;
          scoopAt = nowMs;
          if (scoopCombo % 5 === 0) {
            popNum(e.x - 6, e.y - 12, 'x' + scoopCombo, '#ffd23f');
            twinkles(e.x, e.y, 6, '#ffd23f', 14); shake(0.7, 0.14); snd.clink();
          }
          if (e.golden) {
            sweepGold++; if (sweepGold >= 3) GAME.findSecret('goldrush');
            coinBurst(e.x, e.y, 5); flash('#ffd23f', 0.10, 0.14); shake(1.1, 0.18);
          }
        }
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
        if (v) {
          snd.plume(); floatWorld('+' + v, pl.x, pl.y - 8, 'green', 'feather');
          feathers(pl.x, pl.y, 3); glint(pl.x, pl.y - 4, '#fff8ec', 3);
        }
      }
    }
    /* bones come up with the basket too */
    for (let i = S().fossils.length - 1; i >= 0; i--) {
      const f = S().fossils[i];
      if (Math.hypot(ptr.x - f.x, ptr.y - f.y) < R * 0.8 && GAME.collectFossil(f)) { snd.sparkle(); floatWorld('FOSSIL', f.x, f.y - 8, 'gold', 'fossil'); }
    }
  }
  let sweepGold = 0, scoopCombo = 0, scoopAt = 0;

  /* ================= HUD ================= */
  const el = {
    coins: $('#r-coins'), feathers: $('#r-feathers'), feed: $('#r-feed'), feedPill: $('#pill-feed'),
    cap: $('#r-cap'), capPill: $('#pill-cap'), agePill: $('#pill-age'),
    food: $('#r-food'), foodPill: $('#pill-food'), sky: $('#r-sky'), skyPill: $('#pill-sky'),
    cursorChip: $('#cursor-chip'),
    toolbelt: $('#toolbelt'), deskbar: $('#deskbar'),
    palette: $('#build-palette'), farmPalette: $('#farm-palette'),
  };
  /* prepend pixel icons to the resource pills once */
  (function seedPills() {
    const cp = $('#pill-coins'), fp = $('#pill-feathers'), hp = $('#pill-cap'), fd = $('#pill-feed'), pp = $('#pill-food');
    cp.insertBefore(mkIcon('coin', 2), cp.firstChild);
    fp.insertBefore(mkIcon('feather', 2), fp.firstChild);
    hp.insertBefore(mkIcon('chick', 2), hp.firstChild);
    fd.insertBefore(mkIcon('bowl', 2), fd.firstChild);
    pp.insertBefore(mkIcon('crate', 2), pp.firstChild);
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

  const TOOL_ICON = { hand: 'hand', basket: 'basket', feed: 'bowl', farm: 'hoe', build: 'hammer', inspect: 'magnify' };
  const TOOL_LABEL = { hand: 'HAND', basket: 'BASKET', feed: 'FEED', farm: 'FARM', build: 'BUILD', inspect: 'LOOK' };
  /* the research that hands you each tool; the rack shows a padlock until then */
  const TOOL_UNLOCK = { feed: 'feedtool', farm: 'hoe', build: 'buildtool' };
  let farmSel = 't:soil', farmSec = 'ground', palSec = 'ranch';
  /* ------------------------------------------------------------
     THE DESK BAR
     Everything that used to mean walking to a shack or digging
     through the book gets a fat button of its own down here: the
     Lab, the Index, the crew payroll, the dispatch office and
     Mama's upgrade. Locked ones stay put and say what unlocks them,
     so the row never jumps about under your finger.
     ------------------------------------------------------------ */
  const DESK = [
    { act: 'open-lab',    icon: 'flask',  name: 'LAB',
      tip: 'The Lab - spend feathers on research', open: () => true },
    { act: 'open-quests', icon: 'quest',  name: 'QUESTS',
      tip: 'The quest board - what the founder wants, and the rewards to claim', open: () => true },
    { act: 'open-book',   icon: 'book',   name: 'INDEX',
      tip: 'The Index - chickens, crops, routes, eggs and the diary', open: () => true },
    { act: 'open-food',   icon: 'crate',  name: 'PANTRY',
      tip: 'The pantry - produce off the field, goods out of the Cannery',
      open: () => GAME.lvl('hoe') > 0, why: 'research The Hoe' },
    { act: 'crew',        icon: 'hands',  name: 'CREW',
      tip: 'The crew - posters, applications and the payroll; the HR security room once it is built',
      open: () => GAME.lvl('hiring'), why: 'research Recruiting' },
    { act: 'open-wmap',   icon: 'road',   name: 'MAP',
      tip: 'The valley map - towns, roads, weather, your vehicle on its way',
      open: () => GAME.depotOpen(), why: 'research Logistics' },
    { act: 'open-garage', icon: 'truck',  name: 'GARAGE',
      tip: 'The garage - buy, paint and upgrade the wheels; pick how you drive',
      open: () => GAME.depotOpen(), why: 'research Logistics' },
    { act: 'open-world',  icon: 'globe',  name: 'WORLD',
      tip: 'The world - branches abroad, and the Moon',
      open: () => GAME.lvl('worldmap') > 0, why: 'research the World Map' },
    { act: 'open-genes',  icon: 'dna',    name: 'GENES',
      tip: 'The Gene Lab - read, splice, clone and cross your hens',
      open: () => GAME.hasGeneLab(), why: GAME.lvl('genelab') ? 'build a Gene Lab' : 'research the Gene Lab' },
    { act: 'open-ach',    icon: 'medal',  name: 'AWARDS',
      tip: 'Achievements and the wardrobe they unlock', open: () => true },
  ];
  let crewBadgeDesk = null;
  function renderDeskbar() {
    el.deskbar.innerHTML = '';
    crewBadgeDesk = null;
    DESK.forEach(d => {
      const b = document.createElement('button');
      const open = d.open();
      b.className = 'desk-btn' + (open ? '' : ' locked');
      b.dataset.act = d.act;
      b.disabled = !open;
      const why = typeof d.why === 'function' ? d.why() : d.why;
      b.title = open ? d.tip : d.tip + ' (' + why + ')';
      b.appendChild(mkIcon(d.icon, 3));
      if (!open) { const lk = document.createElement('i'); lk.className = 'lock-badge'; lk.appendChild(mkIcon('lock', 2)); b.appendChild(lk); }
      const nm = document.createElement('small');
      nm.textContent = d.name;
      b.appendChild(nm);
      if (d.act === 'crew') {
        const badge = document.createElement('i');
        badge.className = 'tb-badge';
        badge.hidden = true;
        b.appendChild(badge);
        crewBadgeDesk = badge;
      }
      el.deskbar.appendChild(b);
    });
  }

  function renderToolbelt() {
    el.toolbelt.innerHTML = '';
    ['hand', 'basket', 'feed', 'farm', 'build', 'inspect'].forEach((id, i) => {
      const b = document.createElement('button');
      const open = GAME.toolOpen(id);
      b.className = 'tool-btn' + (S().tool === id ? ' active' : '') + (open ? '' : ' locked');
      b.dataset.tool = id;
      if (!open) b.title = 'Locked - install ' + SKILL_BY_ID[TOOL_UNLOCK[id]].name + ' in the Lab';
      else b.title = {
        hand: 'Hand - pet, carry chickens and eggs, pick ripe crops, drag to pan',
        basket: 'Basket - sweep up eggs and feathers',
        feed: 'Feed - scatter pellets from the barn; chicks grow, hens lay faster',
        farm: 'Farm - till, plant, water and harvest',
        build: 'Build - place machines and buildings',
        inspect: 'Inspect - tap anything for its stats',
      }[id];
      b.appendChild(cloneCanvas(SPR.toolIconSprite(TOOL_ICON[id], 3)));
      const lab = document.createElement('small');
      lab.textContent = TOOL_LABEL[id];
      b.appendChild(lab);
      /* the number key that picks it, printed on the tool like a rack tag */
      const key = document.createElement('u');
      key.className = 'tool-key';
      key.textContent = String(i + 1);
      b.appendChild(key);
      if (!open) { const lk = document.createElement('i'); lk.className = 'lock-badge'; lk.appendChild(mkIcon('lock', 2)); b.appendChild(lk); }
      el.toolbelt.appendChild(b);
    });
    renderDeskbar();
    crewBadge = crewBadgeDesk;
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
    const small = ['belt', 'vacuum', 'blower', 'sorter', 'fence', 'splitter', 'trough', 'well', 'sprinkler', 'board', 'polisher'].includes(type);
    const big = type === 'hatchery' || type === 'hq' || type === 'park';
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
      else if (type === 'polisher') drawPolisher(0, 0, {}, now);
      else if (type === 'grader') drawGrader(0, 0, {}, now);
      else if (type === 'dynamo') drawDynamo(0, 0, {}, now);
      else if (type === 'hatchery') drawHatchery(0, 0, { queue: [], prog: 0 }, now);
      else if (type === 'barn') drawBarn(0, 0, {}, now);
      else if (type === 'trough') drawTrough(0, 0, { n: 6 }, now);
      else if (type === 'well') drawWell(0, 0, {}, now);
      else if (type === 'sprinkler') drawSprinkler(0, 0, {}, now);
      else if (type === 'mill') drawMill(0, 0, {}, now);
      else if (type === 'coop') drawCoop(0, 0, {}, now);
      else if (type === 'board') drawBoard(0, 0, {}, now);
      else if (type === 'hq') drawHQ(0, 0, {}, now);
      else if (type === 'kitchen') drawKitchen(0, 0, { pantry: [], counter: [], recipe: 'omelette', cook: null }, now);
      else if (type === 'park') drawPark(0, 0, { slots: [] }, now);
      else if (type === 'timemachine') drawTimeMachine(0, 0, { on: false, t: 0, T: 1 }, now);
      else if (type === 'billboard') drawBillboard(0, 0, { art: null }, now);
      else if (type === 'hr') drawHR(0, 0, {}, now);
      else if (type === 'cannery') drawCannery(0, 0, { recipe: 'flour', cook: null }, now);
      else drawIncubator(0, 0, { queue: [], prog: 0 }, now);
    } finally {
      ctx = saved;
    }
    return c;
  }

  /* how much of the field the open dock is standing on, in world pixels */
  function syncCamPad() {
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    /* whatever sits over the foot of the view - a dock, or just the tool
       strap - the camera may scroll that much further so the road, the
       truck and the customers are never stuck behind it */
    const dock = !el.palette.hidden ? el.palette : !el.farmPalette.hidden ? el.farmPalette : null;
    const top = dock ? dock.getBoundingClientRect().top : r.bottom;
    GAME.setCamPad(Math.max(0, (r.bottom - top) / (r.width / W.view.w)));
    /* a new ranch opens looking at the road, where the bike and the sign are */
    if (!S().camSet) { S().camSet = true; S().cam.y += 200; GAME.clampCam(); }
  }

  function renderPalette() {
    el.palette.hidden = S().tool !== 'build';
    el.farmPalette.hidden = S().tool !== 'farm';
    renderFarmPalette();
    requestAnimationFrame(syncCamPad);
    if (el.palette.hidden) { GAME.dirty.build = false; return; }
    el.palette.innerHTML = '';
    /* section tabs run down the left edge of the dock */
    const tabs = document.createElement('div');
    tabs.className = 'dock-tabs';
    const buildOpen = t => !BUILDS[t].needs || GAME.lvl(BUILDS[t].needs) > 0;
    if (!Object.keys(BUILDS).some(t => BUILDS[t].sec === palSec && buildOpen(t))) palSec = 'ranch';
    BUILD_SECTIONS.forEach(sec => {
      const anyOpen = Object.keys(BUILDS).some(t => BUILDS[t].sec === sec.id && buildOpen(t));
      if (!anyOpen) return;
      const b = document.createElement('button');
      b.className = 'pal-tab' + (palSec === sec.id ? ' active' : '');
      b.dataset.palsec = sec.id;
      b.appendChild(mkIcon(sec.icon, 2));
      b.appendChild(document.createTextNode(sec.name));
      tabs.appendChild(b);
    });
    el.palette.appendChild(tabs);
    const shelf = document.createElement('div');
    shelf.className = 'dock-shelf';
    const row = document.createElement('div');
    row.className = 'pal-row';
    const lockedN = Object.keys(BUILDS).filter(t => BUILDS[t].sec === palSec && !buildOpen(t)).length;
    Object.keys(BUILDS).filter(t => BUILDS[t].sec === palSec && buildOpen(t)).forEach(type => {
      const b = BUILDS[type];
      const locked = false;
      const cost = buildCost(type, S().built[type]);
      const btn = document.createElement('button');
      btn.className = 'pal-btn' + (buildSel === type ? ' active' : '');
      btn.dataset.build = type;
      btn.disabled = locked;
      btn.appendChild(buildingThumb(type));
      const nm = document.createElement('b');
      nm.textContent = b.name.toUpperCase();
      btn.appendChild(nm);
      const tag = document.createElement('small');
      if (locked) tag.textContent = 'RESEARCH';
      else {
        tag.appendChild(mkIcon('coin', 1));
        tag.appendChild(document.createTextNode(GAME.fmt(cost)));
      }
      btn.appendChild(tag);
      btn.title = b.name + ' - ' + b.desc + (locked ? ' (research first)' : '');
      row.appendChild(btn);
    });
    if (lockedN) row.appendChild(moreInLab(lockedN));
    shelf.appendChild(row);
    el.palette.appendChild(shelf);

    /* rotate + remove live on the right, out of the scrolling shelf */
    const side = document.createElement('div');
    side.className = 'dock-side';
    const rot = document.createElement('button');
    rot.className = 'pal-btn small';
    rot.dataset.build = 'rotate';
    rot.appendChild(mkIcon('arrow', 2));
    const rtag = document.createElement('small');
    rtag.textContent = ['EAST', 'SOUTH', 'WEST', 'NORTH'][placeDir];
    rot.appendChild(rtag);
    rot.title = 'Rotate (R)';
    side.appendChild(rot);
    const rem = document.createElement('button');
    rem.className = 'pal-btn small' + (buildSel === 'remove' ? ' active' : '');
    rem.dataset.build = 'remove';
    rem.appendChild(mkIcon('remove', 2));
    const dtag = document.createElement('small');
    dtag.textContent = 'REMOVE';
    rem.appendChild(dtag);
    side.appendChild(rem);
    el.palette.appendChild(side);
    GAME.dirty.build = false;
  }

  /* The landscaping palette. Four tabs: shape the GROUND, PLANT crops,
     TEND them, and DECOR the place with trees and flowers. */
  /* ids are namespaced - t: terrain, c: crop, d: decoration - so the clover
     seed packet and the clover patch never get mistaken for one another */
  /* a quiet tag at the end of a shelf: how much more the Lab still holds */
  function moreInLab(n) {
    const more = document.createElement('div');
    more.className = 'pal-more';
    more.appendChild(mkIcon('lock', 2));
    more.appendChild(document.createTextNode(n + ' MORE IN THE LAB'));
    more.title = 'Research in the Lab opens more';
    return more;
  }
  /* how many things in this tab research still hides */
  function farmLocked() {
    if (farmSec === 'ground') return TERRAIN_KEYS.filter(k => !GAME.terrainOpen(k)).length;
    if (farmSec === 'plant') return CROP_KEYS.filter(k => !GAME.cropOpen(k)).length;
    if (farmSec === 'tend') return (GAME.lvl('wateringcan') ? 0 : 1) + (GAME.lvl('sickle') ? 0 : 1);
    return DECO_KEYS.filter(k => DECOS[k].needs && !GAME.lvl(DECOS[k].needs)).length;
  }
  function farmItems() {
    if (farmSec === 'ground') {
      return TERRAIN_KEYS.filter(k => GAME.terrainOpen(k)).map(k => ({ id: 't:' + k, terrain: k, name: TERRAIN[k].name.toUpperCase(), icon: TERRAIN[k].icon }));
    }
    if (farmSec === 'plant') {
      return CROP_KEYS.filter(k => GAME.cropOpen(k)).map(k => ({ id: 'c:' + k, crop: k, name: CROPS[k].name.toUpperCase() }));
    }
    if (farmSec === 'tend') {
      const out = [];
      if (GAME.lvl('wateringcan')) out.push({ id: 'do:water', icon: 'water', name: 'WATER', tip: 'A watering lasts a minute. Nothing grows dry' });
      if (GAME.lvl('sickle')) out.push({ id: 'do:harvest', icon: 'scythe', name: 'HARVEST', tip: 'Cut ripe crops into feed' });
      out.push({ id: 'do:clear', icon: 'remove', name: 'CLEAR', tip: 'Lift a decoration, bare soil or shaped ground' });
      return out;
    }
    return DECO_KEYS.filter(k => !DECOS[k].needs || GAME.lvl(DECOS[k].needs)).map(k => ({ id: 'd:' + k, deco: k, name: DECOS[k].name.toUpperCase() }));
  }
  /* what the current selection actually is */
  function farmPick() {
    const i = farmSel.indexOf(':');
    return i < 0 ? { kind: 'do', id: farmSel } : { kind: farmSel.slice(0, i), id: farmSel.slice(i + 1) };
  }
  function renderFarmPalette() {
    if (el.farmPalette.hidden) return;
    el.farmPalette.innerHTML = '';
    const tabs = document.createElement('div');
    tabs.className = 'dock-tabs';
    FARM_SECTIONS.forEach(sec => {
      const b = document.createElement('button');
      b.className = 'pal-tab' + (farmSec === sec.id ? ' active' : '');
      b.dataset.farmsec = sec.id;
      b.appendChild(mkIcon(sec.icon, 2));
      b.appendChild(document.createTextNode(sec.name));
      tabs.appendChild(b);
    });
    el.farmPalette.appendChild(tabs);

    const shelf = document.createElement('div');
    shelf.className = 'dock-shelf';
    const row = document.createElement('div');
    row.className = 'pal-row';
    farmItems().forEach(it => {
      const btn = document.createElement('button');
      let open = true, cost = 0, tip = it.tip || '';
      if (it.crop) { open = GAME.cropOpen(it.crop); cost = GAME.seedCount(it.crop) > 0 ? 0 : CROPS[it.crop].seed; tip = CROPS[it.crop].desc; }
      if (it.terrain) { open = GAME.terrainOpen(it.terrain); cost = GAME.terrainCost(it.terrain); tip = TERRAIN[it.terrain].desc; }
      if (it.deco) { cost = DECOS[it.deco].cost; tip = 'Plant a ' + DECOS[it.deco].name.toLowerCase() + ' just because it looks nice.'; }
      btn.className = 'pal-btn farm' + (farmSel === it.id ? ' active' : '');
      btn.dataset.farm = it.id;
      btn.disabled = !open;
      if (it.crop) btn.appendChild(cloneCanvas(SPR.cropSprite(it.crop, CROPS[it.crop].stages - 1, 3, 2)));
      else if (it.deco) btn.appendChild(cloneCanvas(SPR.decoSprite(DECOS[it.deco].kind, 1, 40 + DECO_KEYS.indexOf(it.deco) * 7), 2));
      else if (it.terrain === 'path' || it.terrain === 'stone') btn.appendChild(cloneCanvas(SPR.pathSprite(it.terrain, 3, 15, 1), 2));
      else if (it.terrain === 'water') btn.appendChild(cloneCanvas(SPR.waterSprite(3, 15, 1), 2));
      else if (it.terrain === 'high') btn.appendChild(cloneCanvas(SPR.terraceSprite(3, 3, 1), 2));
      else if (it.terrain === 'soil') btn.appendChild(cloneCanvas(SPR.soilSprite(3, false, 1), 2));
      else btn.appendChild(mkIcon(it.icon, 3));
      const nm = document.createElement('b');
      nm.textContent = it.name;
      btn.appendChild(nm);
      const tag = document.createElement('small');
      if (!open) tag.textContent = 'RESEARCH';
      else if (it.crop && GAME.seedCount(it.crop) > 0) tag.textContent = 'x' + GAME.seedCount(it.crop) + ' SEEDS';
      else if (cost > 0) { tag.appendChild(mkIcon('coin', 1)); tag.appendChild(document.createTextNode(GAME.fmt(cost))); }
      else if (it.crop || it.terrain || it.deco) tag.textContent = 'FREE';
      else tag.textContent = 'DRAG';
      btn.appendChild(tag);
      btn.title = it.name + ' - ' + tip;
      row.appendChild(btn);
    });
    const lockedN = farmLocked();
    if (lockedN) row.appendChild(moreInLab(lockedN));
    if (!farmItems().some(it => it.id === farmSel)) { const first = farmItems()[0]; if (first) farmSel = first.id; }
    shelf.appendChild(row);
    el.farmPalette.appendChild(shelf);

    const side = document.createElement('div');
    side.className = 'dock-side';

    /* brush sizes, only where a brush is what you are holding */
    if (farmSec === 'ground') {
      const bs = document.createElement('div');
      bs.className = 'brush-row';
      [1, 2, 3, 5, 8].forEach(n => {
        const b = document.createElement('button');
        b.className = 'brush-btn' + (S().brush === n ? ' active' : '');
        b.dataset.brush = String(n);
        b.title = 'Brush size ' + n;
        const dot = document.createElement('i');
        const px2 = Math.max(6, Math.min(30, n * 4 + 4));
        dot.style.width = px2 + 'px'; dot.style.height = px2 + 'px';
        b.appendChild(dot);
        bs.appendChild(b);
      });
      side.appendChild(bs);
    }
    const info = document.createElement('div');
    info.className = 'farm-info';
    const st = S();
    const ripeN = Object.values(st.soil).filter(t => GAME.ripe(t)).length;
    const dryN = Object.values(st.soil).filter(t => t.crop && t.growth < 1 && t.water <= 0 && !GAME.wateredBy(...Object.keys(st.soil).find(k => st.soil[k] === t).split(',').map(Number))).length;
    [['hoe', Object.keys(st.soil).length, 'Tiles tilled'],
     ['sprout', Object.values(st.soil).filter(t => t.crop).length, 'Growing'],
     ['water', dryN, 'Dry crops - they are not growing'],
     ['scythe', ripeN, 'Ripe now'],
     ['road', GAME.paintedCells(), 'Ground painted'],
     ['tree', Object.keys(st.deco).length, 'Decorations']].forEach(([ic, v, tip]) => {
      const cell = document.createElement('span');
      cell.title = tip;
      cell.appendChild(mkIcon(ic, 2));
      cell.appendChild(document.createTextNode(String(v)));
      info.appendChild(cell);
    });
    side.appendChild(info);
    el.farmPalette.appendChild(side);
    requestAnimationFrame(syncCamPad);
  }

  /* ============================================================
     THE FOUNDER'S NAGGING
     What used to be a floating hint over the field is now
     something he says out loud. One line at a time, never twice
     in a row, and never more often than a person could stand.
     ============================================================ */
  let lastHint = '', hintAt = -1e9;
  function hintLogic() {
    if (!titleEl.hidden) return;
    const st = S(), stats = st.stats;
    let text = null;
    const ord = st.orders.find(o => o.state === 'wait' && o.t < 25);
    if (GAME.mamaHungry()) text = 'Grandmama\'s hen is out of supper. Scatter her some feed.';
    else if (stats.pets === 0) text = 'Give the old hen a pat. She lays when she is fussed over.';
    else if (ord) text = ord.who + ' is about to drive off. ' + (ord.n - ord.got) + ' more eggs!';
    else if (stats.collected === 0 && st.eggs.length > 1) text = 'Eggs on the grass, partner. Take the basket to them.';
    else if (stats.hatched === 0 && (st.basket.length > 0 || st.held)) text = 'Put that egg in the incubator before it goes cold.';
    else if (stats.sold === 0 && (st.basket.length > 2 || st.truck.load.length)) text = st.truck.load.length ? 'The bike is loaded. Tap it and off to town.' : 'Drop those eggs on the bike. Coins do not walk here.';
    else if (st.truck.state === 'parked' && st.truck.load.length >= GAME.truckCap() && !GAME.lvl('autosend')) text = 'The bike is full. Send it before something cracks.';
    else if (st.unpaid) text = 'The payroll is empty and the crew have noticed.';
    else if (st.feathers >= 4 && Object.keys(st.sk).length <= 1) text = 'Feathers in your pocket and no science. Get to the Lab.';
    else if (Object.keys(st.sites).length && !GAME.movers.van) text = 'The movers are on the road. They always turn up.';
    else if (GAME.lvl('court') && st.built.lovenest === 0 && stats.bred === 0) text = 'We can breed hens now. That wants a love nest.';
    else if (GAME.lvl('hiring') && !Object.keys(st.huts).length) text = 'Nobody will work without a hut to sit in. Build one.';
    else if (GAME.lvl('billboard') && !st.built.billboard) text = 'Put a billboard by the road. I want them pulling in.';
    else if (st.chickens.length > 6 && !st.inspected) text = 'Use the magnifier on things. It tells you everything.';
    else if (st.mamaTier < TIER_DIVINE && st.coins >= GAME.mamaCost() * 1.2) text = 'We can afford to upgrade the old hen. Do it.';
    if (!text) { lastHint = ''; return; }
    const now = performance.now();
    if (text === lastHint && now - hintAt < 30000) return;
    if (now - hintAt < 11000) return;
    lastHint = text; hintAt = now;
    GAME.bossSay(text, 8, 'stand');
  }

  let ageShown = -1;
  /* a counter rolls to its new figure rather than snapping to it, which
     is how a mechanical readout behaves and reads as money arriving */
  const rolls = new Map();
  function setRoll(node, target) {
    let r = rolls.get(node);
    if (!r) { r = { shown: target, target }; rolls.set(node, r); }
    r.target = target;
    /* a jump of nothing much, or the first paint, lands straight away */
    if (Math.abs(r.target - r.shown) < 2) r.shown = r.target;
  }
  function tickRolls(dt) {
    rolls.forEach((r, node) => {
      const d = r.target - r.shown;
      if (d === 0) { if (node.classList.contains('rolling')) node.classList.remove('rolling'); return; }
      if (Math.abs(d) < 1.2) r.shown = r.target;
      else r.shown += d * Math.min(1, dt * 9) + Math.sign(d) * Math.min(Math.abs(d), dt * 4);
      const txt = GAME.fmt(Math.round(r.shown));
      if (node.textContent !== txt) node.textContent = txt;
      node.classList.toggle('rolling', r.shown !== r.target);
    });
  }
  function lightUpdate() {
    const set = (node, v) => { if (node.textContent !== v) node.textContent = v; };
    setRoll(el.coins, S().coins);
    setRoll(el.feathers, S().feathers);
    set(el.feed, Math.floor(S().feedStore) + '/' + GAME.feedCap());
    const nofeed = S().feedStore < 1;
    if (el.feedPill.classList.contains('full') !== nofeed) el.feedPill.classList.toggle('full', nofeed);
    const n = S().chickens.length, capn = GAME.chickenCap();
    set(el.cap, n + '/' + capn);
    const full = n >= capn;
    if (el.capPill.classList.contains('full') !== full) el.capPill.classList.toggle('full', full);
    if (el.food) {
      set(el.food, GAME.fmt(GAME.pantryTotal()));
      const canPantry = GAME.lvl('hoe') > 0;
      if (el.foodPill.hidden !== !canPantry) el.foodPill.hidden = !canPantry;
    }
    if (el.sky) {
      const w = GAME.weather, ph = GAME.dayPhase();
      const night = GAME.setting('dayNight') && (ph > 0.78 || ph < 0.08);
      const txt = w.rain ? 'RAIN' : night ? 'NIGHT' : ph > 0.66 ? 'DUSK' : ph < 0.16 ? 'DAWN' : 'CLEAR';
      if (el.skyPill.dataset.sky !== txt) {
        el.skyPill.dataset.sky = txt;
        el.skyPill.innerHTML = '';
        el.skyPill.appendChild(mkIcon(w.rain ? 'water' : night ? 'moon' : 'sparkle', 2));
        const sb = document.createElement('b'); sb.textContent = txt; el.skyPill.appendChild(sb);
      }
    }
    /* a number that just changed pops - measured on the target, so the
       punch lands when the money arrives and not on every rolling frame */
    [[el.coins, S().coins], [el.feathers, S().feathers]].forEach(([node, v]) => {
      const key = GAME.fmt(v);
      if (node.dataset.last !== undefined && node.dataset.last !== key) { node.classList.remove('pop'); void node.offsetWidth; node.classList.add('pop'); }
      node.dataset.last = key;
    });
    if (el.agePill && ageShown !== GAME.ageIndex()) {
      ageShown = GAME.ageIndex();
      el.agePill.innerHTML = '';
      el.agePill.appendChild(mkIcon(GAME.age().icon, 2));
      const ab = document.createElement('b');
      ab.textContent = GAME.age().name.toUpperCase();
      el.agePill.appendChild(ab);
      el.agePill.title = 'The ' + GAME.age().name + ' - tap to see what the next age needs';
    }
    updateCursorChip();
    updateCrewBadge();
    hintLogic();
    if (window.QUESTS_UI) QUESTS_UI.update();
    refreshInspect();
    /* the card under the Lab screen keeps up with your feathers */
    if (!$('#modal-skills').hidden && skillCardFeathers !== S().feathers) { renderSkillCard(); $('#research-sub').textContent = GAME.fmt(S().feathers) + ' FEATHERS'; }
    if (!$('#modal-depot').hidden) {
      const dsig = S().truck.state + '|' + S().truck.load.length + '|' + S().coins.toFixed(0) + '|' + S().vehicle + '|' + S().routes.length + '|' + S().route;
      if (dsig !== depotSig) { depotSig = dsig; renderDepot(); }
    }
    if (!$('#modal-hire').hidden) {
      const sig = S().staff.length + '|' + S().coins.toFixed(0) + '|' + S().autoMark + '|' + GAME.staffSlots();
      if (sig !== hireSig) { hireSig = sig; renderHire(); }
    }
    if (GAME.dirty.build) { renderPalette(); renderToolbelt(); }
  }

  /* ============================================================
     THE FOUNDER'S DIALOGUE
     The old quest card was a slip of paper with a hint on it.
     Now it is the raccoon: his portrait, what he wants in his own
     words, how far along you are and what it pays. Tap it and the
     Lab opens on the job.
     ============================================================ */
  let questSig = '';
  function renderDialogue() {
    const box = $('#quest-dialogue');
    if (!box) return;
    const q = GAME.currentQuest();
    const b = GAME.boss();
    if (!q || !titleEl.hidden) { if (!box.hidden) box.hidden = true; questSig = ''; return; }
    const [cur, n] = GAME.questProgress(q);
    /* he speaks for himself while he has something to say */
    const said = b && b.line ? b.line : q.say;
    const cheering = !!(b && b.line && b.pose === 'cheer');
    const sig = q.id + '|' + cur + '|' + n + '|' + said + '|' + (cheering ? 1 : 0);
    if (sig === questSig && !box.hidden) return;
    questSig = sig;
    box.hidden = false;
    box.dataset.act = 'quest-card';
    box.title = 'What the founder wants next - tap for the Lab';
    box.classList.toggle('done', cheering);
    box.innerHTML = '';
    /* his portrait, framed like a staff photo */
    const face = document.createElement('div');
    face.className = 'qd-face';
    face.appendChild(cloneCanvas(SPR.raccoonSprite(cheering ? 'cheer' : 'boss', 1, S().wardrobe), 2));
    box.appendChild(face);
    const body = document.createElement('div');
    body.className = 'qd-body';
    const top = document.createElement('div');
    top.className = 'qd-top';
    const who = document.createElement('b');
    who.textContent = 'THE FOUNDER';
    top.appendChild(who);
    const tag = document.createElement('small');
    tag.textContent = 'JOB ' + (QUESTS.indexOf(q) + 1) + '/' + QUESTS.length;
    top.appendChild(tag);
    body.appendChild(top);
    const say = document.createElement('div');
    say.className = 'qd-say';
    say.textContent = '"' + said + '"';
    body.appendChild(say);
    box.appendChild(body);
    /* the job itself, on its own strip under what he says */
    const foot = document.createElement('div');
    foot.className = 'qd-foot';
    const job = document.createElement('div');
    job.className = 'qd-job';
    job.appendChild(mkIcon(q.icon, 2));
    const jt = document.createElement('div');
    const jn = document.createElement('i');
    jn.textContent = q.name.toUpperCase();
    jt.appendChild(jn);
    const rw = [q.rw.c ? GAME.fmt(q.rw.c) + ' COINS' : '', q.rw.f ? q.rw.f + ' FEATHERS' : ''].filter(Boolean).join(' + ');
    if (rw) { const rl = document.createElement('em'); rl.textContent = rw; jt.appendChild(rl); }
    job.appendChild(jt);
    foot.appendChild(job);
    const bar = document.createElement('div');
    bar.className = 'qd-bar';
    const rail = document.createElement('div');
    rail.className = 'qd-rail';
    const fill = document.createElement('s');
    fill.style.width = Math.round(cur / n * 100) + '%';
    rail.appendChild(fill);
    bar.appendChild(rail);
    const num = document.createElement('i');
    num.textContent = cur + '/' + n;
    bar.appendChild(num);
    foot.appendChild(bar);
    box.appendChild(foot);
  }

  /* ================= TITLE SCREEN ================= */
  const titleEl = $('#title-screen');
  const titleCv = $('#title-canvas');
  const tctx = titleCv.getContext('2d');
  let TW = 384, TH = 208;
  let titleT = 0;
  let titleEggs = Array.from({ length: 20 }, () => ({
    x: 16 + Math.random() * (TW - 32), y: 52 + Math.random() * (TH + 40),
    tier: Math.floor(Math.random() * 8), sp: 8 + Math.random() * 14, sw: Math.random() * 6,
  }));
  let titleClouds = [0, 1, 2, 3].map(i => ({ x: Math.random() * TW, y: 58 + i * 13, w: 34 + i * 12, v: 4 + i * 2 }));
  /* the hills, the drifting eggs and the logo are all laid out from TW and
     TH, so handing them the stage's real size composes the card to fit
     whatever shape the window is instead of cropping or stretching it */
  onStageResize = () => {
    TW = W.view.w; TH = W.view.h;
    titleCv.width = TW; titleCv.height = TH;
    tctx.imageSmoothingEnabled = false;
    titleEggs = Array.from({ length: Math.round(TW * TH / 4000) + 8 }, () => ({
      x: 16 + Math.random() * (TW - 32), y: 52 + Math.random() * (TH + 40),
      tier: Math.floor(Math.random() * 8), sp: 8 + Math.random() * 14, sw: Math.random() * 6,
    }));
    titleClouds = [0, 1, 2, 3].map(i => ({ x: Math.random() * TW, y: 58 + i * 13, w: 34 + i * 12, v: 4 + i * 2 }));
  };
  onStageResize();
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
    const k = SPR.textW(title, 3) < TW - 16 ? 3 : SPR.textW(title, 2) < TW - 12 ? 2 : 1;
    SPR.drawTitle(tctx, title, Math.round(TW / 2 - SPR.textW(title, k) / 2), 18, '#ffd23f', '#3a2410', k);
    const sub = 'A COZY CHICKEN RANCH';
    SPR.drawText(tctx, sub, Math.round(TW / 2 - SPR.textW(sub, 1) / 2), 46, '#ffe9b0', 1, '#3a2410');
    /* progress plate above the START button */
    const line = GAME.disc() + ' OF ' + SPECIES_TOTAL + ' CHICKENS FOUND';
    const lw = SPR.textW(line, 1), px0 = Math.round(TW / 2 - lw / 2) - 7, py0 = TH - 58;
    tctx.fillStyle = 'rgba(24,18,12,.62)';
    tctx.fillRect(px0, py0 - 4, lw + 14, 14);
    tctx.fillStyle = 'rgba(255,232,180,.28)';
    tctx.fillRect(px0, py0 - 5, lw + 14, 1);
    tctx.fillRect(px0, py0 + 10, lw + 14, 1);
    const blink = Math.floor(now / 480) % 2;
    SPR.drawText(tctx, line, px0 + 7, py0, blink ? '#fff8ec' : '#e8d5a8', 1, '#1a120a');
  }
  /* the rail stands outside the stage, so the title screen no longer
     covers it. Blank the strap instead of removing it: taking it out of
     the row would widen the stage and snap it back again. */
  function railUp(up) { const a = $('#app'); if (a) a.classList.toggle('title-up', !up); }
  function showTitle() {
    titleEl.hidden = false; railUp(false); setInspect(null); introMode = null; closeModals();
    $('#intro-ui').hidden = true; $('#company-form').hidden = true; $('#title-buttons').hidden = true;
    if (window.MENU) MENU.show(); else $('#title-buttons').hidden = false;
  }
  function hideTitle() { titleEl.hidden = true; railUp(true); S().seenTitle = true; introMode = null; if (window.MENU) MENU.hide(); }
  /* the world after a slot change or a reset: everything baked from the save is stale */
  function reloadWorld() {
    buildGround(); terrDirty = true; leaves = [];
    buildSel = null; setInspect(null);
    renderToolbelt(); renderPalette(); updateCursorChip();
    GAME.clampCam();
    questSig = '';
  }

  /* ================= THE INTRO =================
     A raccoon gets a letter: Grandmama's farm is theirs. One old
     hen, a bare field and a bicycle. The raccoon, being a raccoon,
     decides to get super rich, and founds a company: you name it,
     pick its mark and paint its colours before the first egg.
     ============================================ */
  /* Four shots. `hot` names the words the caption sets in amber. */
  const INTRO = [
    { bg: 'night', lines: ['A LETTER CAME FOR A RACCOON.', '"GRANDMAMA LEFT YOU THE FARM.', 'MIND THE HEN. SHE IS PARTICULAR."'],
      hot: ['LETTER', 'FARM', 'HEN'], slate: 'ONE WET TUESDAY' },
    { bg: 'day', lines: ['ONE OLD HEN. ONE BARE FIELD.', 'ONE BICYCLE WITH A BASKET.', 'NOT MUCH OF AN INHERITANCE.'],
      hot: ['ONE', 'BICYCLE', 'INHERITANCE.'], slate: 'THE GATE, DAWN' },
    { bg: 'dream', lines: ['SO HE DID THE ARITHMETIC.', 'ONE HEN IS A HOBBY.', 'TEN THOUSAND IS AN INDUSTRY.'],
      hot: ['ARITHMETIC.', 'HOBBY.', 'INDUSTRY.'], slate: 'A BACK OF AN ENVELOPE' },
    { bg: 'factory', lines: ['THE PERMITS WENT THROUGH ON A FRIDAY.', 'SMOKE. BELTS. A LIMOUSINE.', '"HOW BAD CAN I POSSIBLY BE?"'],
      hot: ['PERMITS', 'LIMOUSINE.', 'BAD'], slate: 'GROUND BREAKS' },
  ];
  let introMode = null, introScene = 0, introT = 0;
  function startIntro() {
    introMode = 'scene'; introScene = 0; introT = 0;
    $('#title-buttons').hidden = true;
    if (window.MENU) MENU.hide();
    $('#company-form').hidden = true;
    snd.plop();
  }
  function introNext() {
    if (introMode !== 'scene') return;
    if (introT < 1.1) { introT = 9; return; }          /* let the caption finish first */
    introScene++; introT = 0; snd.build();
    if (introScene >= INTRO.length) showCompanyForm(true);
  }
  function introSkip() { if (introMode === 'scene') showCompanyForm(true); }

  /* ============================================================
     THE CUTSCENES
     Four letterboxed shots with a slate in the corner, parallax
     behind the cast and a caption that types itself one fat pixel
     letter at a time - each letter dropping in with a bounce, the
     words that matter in hazard amber. Click anywhere for the next.
     ============================================================ */
  function drawIntro(dt) {
    introT += dt;
    const sc = INTRO[Math.min(introScene, INTRO.length - 1)];
    const now = titleT * 1000; titleT += dt;
    tctx.imageSmoothingEnabled = false;
    /* the letterbox: a thin bar on top, and a bottom bar deep enough for the
       caption, so nothing it says is ever cut off */
    const capK = TW >= 560 ? 2 : 1;
    const lineH = 8 * capK + 5;
    const BAR = Math.max(12, Math.round(TH * 0.075));
    const BARB = Math.max(BAR, sc.lines.length * lineH + 10);
    const stage = { y: BAR, h: TH - BAR - BARB };
    const gy = Math.round(stage.y + stage.h * 0.78);     /* the ground line */
    const K = TW >= 620 ? 3 : 2;

    tctx.fillStyle = '#07080b'; tctx.fillRect(0, 0, TW, TH);

    /* ---- sky ---- */
    const skies = {
      night:   ['#080a18', '#0d1226', '#141b36', '#1d2748', '#28345c'],
      day:     ['#4d84b8', '#6fa3ce', '#8fbde0', '#b0d4ec', '#d2e8f6'],
      dream:   ['#1b1030', '#2b1848', '#402260', '#5a2f78', '#78418e'],
      factory: ['#1a1220', '#2b1a26', '#42232a', '#5e2f2c', '#7d4030'],
    };
    const bands = skies[sc.bg] || skies.day;
    const per = Math.ceil(stage.h / bands.length);
    bands.forEach((b, i) => { tctx.fillStyle = b; tctx.fillRect(0, stage.y + i * per, TW, per); });
    if (sc.bg !== 'day') for (let i = 0; i < 46; i++) {
      if (Math.floor(now / 480 + i) % 9 === 0) continue;
      tctx.fillStyle = 'rgba(255,255,255,.6)';
      tctx.fillRect((i * 97) % TW, stage.y + (i * 43) % Math.round(stage.h * 0.5), 1, 1);
    }

    /* ---- ground ---- */
    const groundCol = { night: '#141a16', day: '#5f9c40', dream: '#2a1d3c', factory: '#2a211f' }[sc.bg];
    tctx.fillStyle = groundCol; tctx.fillRect(0, gy, TW, stage.y + stage.h - gy);
    tctx.fillStyle = { night: '#1d2620', day: '#74b64f', dream: '#3a2a50', factory: '#3a2e28' }[sc.bg];
    tctx.fillRect(0, gy, TW, 2);

    /* everything is composed for a 384-wide shot and centred in whatever we got */
    tctx.save();
    tctx.translate(Math.round((TW - 384) / 2), 0);

    if (sc.bg === 'night') {
      /* a wet street: shuttered fronts, one lamp, one raccoon reading */
      for (let i = 0; i < 7; i++) {
        const hx = i * 58 - 10, hh = 40 + (i * 17) % 26;
        tctx.fillStyle = '#0b0e1c'; tctx.fillRect(hx, gy - hh, 46, hh);
        tctx.fillStyle = '#131830'; tctx.fillRect(hx, gy - hh, 46, 2);
        tctx.fillStyle = (i + Math.floor(now / 1900)) % 3 ? '#ffd88a' : '#20263f';
        tctx.fillRect(hx + 9, gy - hh + 10, 7, 8); tctx.fillRect(hx + 29, gy - hh + 10, 7, 8);
      }
      const lamp = SPR.furnitureSprite('lamp', 3, 3);
      tctx.drawImage(lamp, 244, gy - lamp.height + 4);
      /* the cone, and rain crossing it */
      for (let i = 0; i < 30; i++) {
        const p = i / 30;
        tctx.fillStyle = 'rgba(255,226,150,' + (0.05 * (1 - p)).toFixed(3) + ')';
        const half = 8 + p * 54;
        tctx.fillRect(Math.round(252 - half), Math.round(gy - 62 + p * 62), Math.round(half * 2), 3);
      }
      tctx.fillStyle = 'rgba(190,215,255,.45)';
      for (let i = 0; i < 60; i++) {
        const rx = (i * 137 + Math.floor(now / 3)) % 420 - 20, ry = stage.y + ((i * 313 + Math.floor(now / 2)) % (gy - stage.y));
        tctx.fillRect(rx, ry, 1, 4);
      }
      /* puddle reflection */
      tctx.fillStyle = 'rgba(255,226,150,.14)'; tctx.fillRect(228, gy + 2, 48, 3);
      const rac = SPR.raccoonSprite('read', K, S().wardrobe);
      tctx.drawImage(rac, 150 - (rac.ox || 0) * K, gy - rac.height + 4);
      /* the letter, blown in during the first beat */
      if (introT < 1.6) {
        const f = Math.min(1, introT / 1.6);
        const lx = Math.round(40 + f * 108), ly = Math.round(stage.y + 14 + f * (gy - stage.y - 60) + Math.sin(introT * 7) * 6);
        tctx.fillStyle = '#14171a'; tctx.fillRect(lx - 1, ly - 1, 20, 15);
        tctx.fillStyle = '#fff8ec'; tctx.fillRect(lx, ly, 18, 13);
        tctx.fillStyle = '#c9c0a8'; tctx.fillRect(lx, ly, 18, 1);
        tctx.fillStyle = '#e0432c'; tctx.fillRect(lx + 6, ly + 4, 6, 5);
      }
    } else if (sc.bg === 'day') {
      /* the gate: fence, nest, bicycle, and a FOR SALE board going up */
      for (let x = -10; x < 400; x += 15) { tctx.fillStyle = '#8a5e2a'; tctx.fillRect(x, gy - 15, 3, 17); }
      tctx.fillStyle = '#a8783f'; tctx.fillRect(-10, gy - 11, 410, 2); tctx.fillRect(-10, gy - 5, 410, 2);
      for (let i = 0; i < 5; i++) { const cx2 = 20 + i * 90; tctx.fillStyle = 'rgba(255,255,255,.5)'; tctx.fillRect(cx2 + ((now / 40) % 60), stage.y + 12 + i * 7, 22, 3); }
      const mama = SPR.mamaSprite(0, 2, Math.floor(now / 3000) % 5 === 4 ? 'blink' : 'idle');
      const nest = SPR.nestSprite(2);
      tctx.drawImage(nest, 300 - nest.width / 2, gy - 16);
      tctx.drawImage(mama, 300 - mama.width / 2, gy - mama.height - 2);
      const bike = SPR.vehicleSprite('bike', 0, 2, GAME.paintInfo());
      tctx.drawImage(bike, 22, gy - bike.height + 2);
      const wx = Math.min(150, 34 + introT * 46);
      const rac = SPR.raccoonSprite(wx < 150 && Math.floor(now / 150) % 2 ? 'walk1' : 'stand', K, S().wardrobe);
      tctx.drawImage(rac, Math.round(wx) - (rac.ox || 0) * K, gy - rac.height + 4);
      const cse = SPR.iconSprite('suitcase', 3);
      tctx.drawImage(cse, Math.round(wx) - 28, gy - 30);
      if (wx < 150 && Math.floor(now / 190) % 2) { tctx.fillStyle = 'rgba(210,190,150,.7)'; tctx.fillRect(Math.round(wx) - 8, gy - 3, 5, 2); }
    } else if (sc.bg === 'dream') {
      /* the arithmetic: an envelope the size of a wall, sums crawling over it */
      const bx = 96, by = stage.y + 14, bw = 210, bh = Math.max(60, gy - by - 26);
      tctx.fillStyle = '#14171a'; tctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      tctx.fillStyle = '#f2ece0'; tctx.fillRect(bx, by, bw, bh);
      tctx.fillStyle = 'rgba(90,120,160,.16)';
      for (let y = 6; y < bh - 4; y += 8) tctx.fillRect(bx + 4, by + y, bw - 8, 1);
      tctx.fillStyle = 'rgba(210,90,90,.35)'; tctx.fillRect(bx + 16, by, 1, bh);
      const sums = ['1 HEN = 1 EGG', 'x 10 HENS', 'x 100 COOPS', 'x 1000 TRUCKS', '= ???'];
      sums.forEach((line, i) => {
        if (introT < 0.35 + i * 0.42) return;
        SPR.drawTiny(tctx, line, bx + 24, by + 10 + i * 11, i === sums.length - 1 ? '#bf4f10' : '#14171a', 1);
        if (i === sums.length - 1 && Math.floor(now / 300) % 2) SPR.drawTiny(tctx, 'RICH', bx + 74, by + 10 + i * 11, '#bf4f10', 1);
      });
      /* a graph climbing out of the top of the envelope */
      const rise = Math.min(1, Math.max(0, (introT - 1.2) / 2.2));
      tctx.fillStyle = '#2f6b28';
      for (let i = 0; i < Math.round(rise * 26); i++) {
        const px2 = bx + 150 + i * 2, py2 = by + bh - 14 - Math.round(Math.pow(i / 26, 1.7) * (bh - 22));
        tctx.fillRect(px2, py2, 2, 2);
      }
      const rac = SPR.raccoonSprite(Math.floor(now / 400) % 4 === 0 ? 'cheer' : 'boss', K, S().wardrobe);
      tctx.drawImage(rac, 30 - (rac.ox || 0) * K, gy - rac.height + 4);
      for (let i = 0; i < 10; i++) {
        const cy2 = ((now / 16 + i * 41) % (gy - stage.y)) + stage.y;
        tctx.fillStyle = '#ffb32e'; tctx.fillRect((i * 67 + 26) % 384, Math.round(cy2), 3, 3);
      }
    } else {
      /* ground breaks: chimneys climb, belts turn, and someone objects */
      for (let i = 0; i < 5; i++) {
        const fx = 6 + i * 78, rise = Math.min(1, Math.max(0, introT * 0.62 - i * 0.34));
        const fh = Math.round((44 + (i % 2) * 18) * rise), fw = 56;
        if (fh < 2) continue;
        tctx.fillStyle = '#14171a'; tctx.fillRect(fx, gy - fh, fw, fh);
        tctx.fillStyle = '#4a2f2c'; tctx.fillRect(fx + 1, gy - fh + 1, fw - 2, fh - 1);
        for (let wy = 5; wy < fh - 6; wy += 9) for (let wx = 4; wx < fw - 6; wx += 10) {
          tctx.fillStyle = (Math.floor(now / 1300) + wx + wy + i) % 3 ? '#ffb32e' : '#241a20';
          tctx.fillRect(fx + wx, gy - fh + wy, 5, 5);
        }
        tctx.fillStyle = '#14171a'; tctx.fillRect(fx + fw - 14, gy - fh - Math.round(16 * rise), 8, Math.round(16 * rise));
        if (rise >= 1) for (let s2 = 0; s2 < 4; s2++) {
          const p = ((now / 1100 + s2 * 0.25 + i * 0.13) % 1);
          tctx.fillStyle = 'rgba(200,200,210,' + (0.5 - p * 0.45).toFixed(2) + ')';
          tctx.fillRect(fx + fw - 12 + Math.round(Math.sin(now / 420 + s2) * 4), Math.round(gy - fh - 18 - p * 30), 7 - Math.floor(p * 4), 3);
        }
      }
      /* a belt across the foreground with eggs on it */
      tctx.fillStyle = '#14171a'; tctx.fillRect(-10, gy + 2, 410, 9);
      tctx.fillStyle = '#3f464d'; tctx.fillRect(-10, gy + 3, 410, 7);
      for (let x = -10; x < 400; x += 8) { tctx.fillStyle = '#2b3137'; tctx.fillRect(x + ((now / 22) % 8), gy + 3, 3, 7); }
      for (let i = 0; i < 9; i++) {
        const ex = ((i * 46 + now / 18) % 420) - 20;
        tctx.drawImage(SPR.eggSprite(i % 4, 1), Math.round(ex), gy - 6);
      }
      const rac = SPR.raccoonSprite(Math.floor(now / 240) % 2 ? 'guitar1' : 'guitar0', K,
                                    Object.assign({}, S().wardrobe, { suit: 'suit_green', glasses: 'gl_star', acc: 'acc_guitar' }));
      const hop = Math.abs(Math.sin(now / 240)) * 5;
      tctx.drawImage(rac, 132 - (rac.ox || 0) * K, gy - rac.height + 4 - hop);
      /* the Warden, arriving late with an objection */
      if (introT > 1.4) {
        const wt = introT - 1.4;
        const wsp = SPR.wardenSprite(Math.floor(wt * 5) % 2 ? 'wag' : 'stand', 3);
        const wx2 = Math.max(292, 400 - wt * 70);
        tctx.drawImage(wsp, Math.round(wx2), gy - wsp.height + 4);
        if (wt > 0.7) {
          const line = 'I SPEAK FOR THE TREES';
          const w2 = SPR.tinyW(line, 1) + 8;
          const bx2 = Math.round(wx2 - w2 + 24), by2 = gy - wsp.height - 6;
          tctx.fillStyle = '#fff8ec'; tctx.fillRect(bx2, by2, w2, 11);
          tctx.fillStyle = '#14171a';
          tctx.fillRect(bx2, by2, w2, 1); tctx.fillRect(bx2, by2 + 10, w2, 1);
          tctx.fillRect(bx2, by2, 1, 11); tctx.fillRect(bx2 + w2 - 1, by2, 1, 11);
          tctx.fillRect(bx2 + w2 - 12, by2 + 11, 2, 2);
          SPR.drawTiny(tctx, line, bx2 + 4, by2 + 3, '#14171a', 1);
        }
      }
    }
    tctx.restore();

    /* ---- a vignette, then the bars over everything ---- */
    tctx.fillStyle = 'rgba(7,8,11,.30)';
    for (let i = 0; i < 10; i++) { tctx.fillRect(0, stage.y + i, TW, 1); tctx.fillRect(0, stage.y + stage.h - 1 - i, TW, 1); }
    tctx.fillStyle = '#07080b';
    tctx.fillRect(0, 0, TW, BAR); tctx.fillRect(0, TH - BARB, TW, BARB);
    tctx.fillStyle = '#ffb32e';
    tctx.fillRect(0, BAR - 1, TW, 1); tctx.fillRect(0, TH - BARB, TW, 1);

    /* ---- the slate, top left ---- */
    const slate = 'SHOT ' + (introScene + 1) + ' OF ' + INTRO.length + '   ' + sc.slate;
    SPR.drawTiny(tctx, slate, 8, Math.round(BAR / 2) - 2, '#8f9298', 1);
    /* clapper stripes */
    for (let i = 0; i < 5; i++) { tctx.fillStyle = i % 2 ? '#f0eee8' : '#3f464d'; tctx.fillRect(TW - 46 + i * 8, Math.round(BAR / 2) - 3, 8, 5); }

    /* ---- the caption: fat pixel letters, each dropped in on its own ---- */
    const capY = TH - BARB + Math.max(4, Math.round((BARB - sc.lines.length * lineH) / 2));
    const hot = (sc.hot || []).map(h => h.replace(/[^A-Z0-9]/g, ''));
    let shown = 0;                                   /* letters revealed so far */
    const budget = introT * 30;
    sc.lines.forEach((line, li) => {
      let x = Math.round(TW / 2 - SPR.textW(line, capK) / 2);
      const y = capY + li * lineH;
      /* which words in this line are set in amber */
      const amber = new Uint8Array(line.length);
      let at = 0;
      line.split(' ').forEach(word => {
        if (hot.includes(word.replace(/[^A-Z0-9]/g, ''))) for (let i = 0; i < word.length; i++) amber[at + i] = 1;
        at += word.length + 1;
      });
      for (let ci = 0; ci < line.length; ci++) {
        const ch = line[ci];
        if (ch !== ' ') {
          const rev = budget - shown;
          if (rev <= 0) { shown++; x += 6 * capK; continue; }
          const drop = Math.min(1, rev / 2.6);
          const dy = drop >= 1 ? 0 : Math.round(-13 * (1 - drop) + Math.sin(drop * Math.PI) * 3);
          SPR.drawText(tctx, ch, x, y + dy, amber[ci] ? '#ffb32e' : '#f0eee8', capK, '#07080b');
        }
        shown++;
        x += 6 * capK;
      }
    });
    /* ---- and the one control ---- */
    if (introT > 1.4 && Math.floor(now / 560) % 2) {
      const nx = 'CLICK FOR THE NEXT SHOT';
      SPR.drawTiny(tctx, nx, TW - 8 - SPR.tinyW(nx, 1), TH - 9, '#ffb32e', 1);
    }
  }

  /* ---- the company form: name, mark and colours ---- */
  let companyDraft = null, companyHost = null, companyInIntro = false;
  function showCompanyForm(fromIntro) {
    introMode = 'form';
    companyInIntro = !!fromIntro;
    companyDraft = Object.assign({}, COMPANY_DEFAULT, S().company);
    companyHost = $('#company-form');
    $('#intro-ui').hidden = true;
    companyHost.hidden = false;
    renderCompanyForm();
    snd.build();
  }
  function openCompany() {
    companyInIntro = false;
    companyDraft = Object.assign({}, COMPANY_DEFAULT, S().company);
    companyHost = $('#company-body');
    renderCompanyForm();
    openModal('#modal-company');
  }
  function brandPreview(draft) {
    const c = SPR.newCanvas(120, 40);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    /* the roadside sign */
    g.fillStyle = '#2e2216'; g.fillRect(0, 0, 120, 26);
    g.fillStyle = draft.col1; g.fillRect(1, 1, 118, 24);
    g.fillStyle = SPR.lighten(draft.col1, 0.35); g.fillRect(1, 1, 118, 1);
    g.fillStyle = draft.col2; g.fillRect(1, 22, 118, 3);
    g.drawImage(SPR.iconSprite(draft.logo, 2), 4, 3);
    const nm = (draft.name || 'YOUR COMPANY').slice(0, 16);
    const dark = SPR.lum(draft.col1) > 0.6;
    SPR.drawTiny(g, nm, 26, 8, dark ? '#2e2216' : '#fff8ec', 1);
    g.fillStyle = '#5e3d18'; g.fillRect(10, 26, 4, 14); g.fillRect(106, 26, 4, 14);
    const out = document.createElement('canvas');
    out.width = 360; out.height = 120; out.className = 'brand-preview';
    const og = out.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(c, 0, 0, 360, 120);
    return out;
  }
  /* the signature: a run of pen points on a 120 x 40 grid, [-1,-1] where the pen lifted */
  let sigPts = [], sigDown = false, sigLast = null;
  const SIGW = 120, SIGH = 40;
  function sigEnough(pts) { return (pts || []).filter(p => p[0] >= 0).length >= 14; }
  function drawSignature(g, pts, k, col) {
    g.fillStyle = col || '#1f2a6e';
    let prev = null;
    (pts || []).forEach(p => {
      if (p[0] < 0) { prev = null; return; }
      if (prev) {
        const n = Math.max(Math.abs(p[0] - prev[0]), Math.abs(p[1] - prev[1]));
        for (let i = 1; i <= n; i++) {
          const x = Math.round(prev[0] + (p[0] - prev[0]) * i / n), y = Math.round(prev[1] + (p[1] - prev[1]) * i / n);
          g.fillRect(x * k, y * k, k, k); g.fillRect(x * k, (y + 1) * k, k, k);
        }
      } else { g.fillRect(p[0] * k, p[1] * k, k, k); g.fillRect(p[0] * k, (p[1] + 1) * k, k, k); }
      prev = p;
    });
  }
  function signatureCanvas(pts, k, col) {
    const c = document.createElement('canvas');
    c.width = SIGW * k; c.height = SIGH * k; c.className = 'cf-signature';
    drawSignature(c.getContext('2d'), pts, k, col);
    return c;
  }
  function redrawPad() {
    const pad = $('#sig-pad');
    if (!pad) return;
    const g = pad.getContext('2d');
    g.clearRect(0, 0, pad.width, pad.height);
    drawSignature(g, sigPts, 2);
    const ok = sigEnough(sigPts);
    const wrap = pad.parentElement;
    if (wrap) wrap.classList.toggle('signed', ok);
    const btn = companyHost && companyHost.querySelector('[data-act="company-save"]');
    if (btn) { btn.disabled = !ok; btn.classList.toggle('btn-green', ok); }
    const st = companyHost && companyHost.querySelector('.stamp');
    if (st) { st.textContent = ok ? 'SIGNED' : 'UNSIGNED'; st.className = 'stamp ' + (ok ? 'green' : 'amber'); }
    const note = companyHost && companyHost.querySelector('.cf-foot small');
    if (note) note.textContent = ok ? '' : 'SIGN ON THE LINE';
  }
  function padPoint(ev) {
    const pad = $('#sig-pad');
    const r = pad.getBoundingClientRect();
    return [Math.max(0, Math.min(SIGW - 1, Math.floor((ev.clientX - r.left) / r.width * SIGW))),
            Math.max(0, Math.min(SIGH - 2, Math.floor((ev.clientY - r.top) / r.height * SIGH)))];
  }
  document.addEventListener('pointerdown', ev => {
    if (!ev.target || ev.target.id !== 'sig-pad') return;
    ev.preventDefault();
    ev.target.setPointerCapture(ev.pointerId);
    sigDown = true;
    const p = padPoint(ev);
    if (sigPts.length && sigPts[sigPts.length - 1][0] >= 0) sigPts.push([-1, -1]);
    sigPts.push(p); sigLast = p;
    redrawPad();
  });
  document.addEventListener('pointermove', ev => {
    if (!sigDown || !ev.target || ev.target.id !== 'sig-pad') return;
    const p = padPoint(ev);
    if (sigLast && p[0] === sigLast[0] && p[1] === sigLast[1]) return;
    if (sigPts.length > 880) return;
    sigPts.push(p); sigLast = p;
    redrawPad();
  });
  document.addEventListener('pointerup', () => { if (sigDown) { sigDown = false; sigLast = null; snd.plop(); } });

  /* The form is one sheet with three things on it and nothing else: the
     name, the mark and colours, and a line to sign. Everything the
     registry used to ask for - the founder, the date, the form number,
     the specimen caption - is gone; what is left is set big enough to
     read across the room. */
  function renderCompanyForm() {
    const host = companyHost;
    if (!host) return;
    const d = companyDraft;
    host.innerHTML = '';
    const paper = document.createElement('div');
    paper.className = 'cf-paper';

    const head = document.createElement('div');
    head.className = 'cf-head';
    const h = document.createElement('b');
    h.textContent = companyInIntro ? 'NAME YOUR COMPANY' : 'CHANGE THE NAME';
    head.appendChild(h);
    paper.appendChild(head);
    const stamp = document.createElement('div');
    stamp.className = 'stamp amber'; stamp.textContent = 'UNSIGNED';
    paper.appendChild(stamp);

    /* one: the name, on a line of its own, as big as the sheet allows */
    const nameBox = document.createElement('div');
    nameBox.className = 'cf-block';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.maxLength = 16; inp.id = 'company-name'; inp.value = d.name;
    inp.autocomplete = 'off'; inp.spellcheck = false; inp.placeholder = 'INF EGG CO.';
    nameBox.appendChild(inp);
    paper.appendChild(nameBox);

    /* two: the mark */
    const markBox = document.createElement('div');
    markBox.className = 'cf-block';
    const ml = document.createElement('i'); ml.textContent = 'MARK'; markBox.appendChild(ml);
    const grid = document.createElement('div'); grid.className = 'cf-grid marks';
    LOGOS.forEach(lg => {
      const bt = document.createElement('button');
      bt.className = 'cf-pick' + (d.logo === lg ? ' active' : '');
      bt.dataset.act = 'company-logo'; bt.dataset.logo = lg; bt.type = 'button';
      bt.appendChild(mkIcon(lg, 3));
      grid.appendChild(bt);
    });
    markBox.appendChild(grid);

    /* three: the colours, picked as pairs so there is one row not two */
    const colBox = document.createElement('div');
    colBox.className = 'cf-block';
    const cl = document.createElement('i'); cl.textContent = 'COLOURS'; colBox.appendChild(cl);
    const cg = document.createElement('div'); cg.className = 'cf-grid pairs';
    BRAND_PAIRS.forEach(([c1, c2]) => {
      const bt = document.createElement('button');
      bt.className = 'cf-pick pair' + (d.col1 === c1 && d.col2 === c2 ? ' active' : '');
      bt.dataset.act = 'company-pair'; bt.dataset.c1 = c1; bt.dataset.c2 = c2; bt.type = 'button';
      const a1 = document.createElement('span'); a1.style.background = c1;
      const a2 = document.createElement('span'); a2.style.background = c2;
      bt.appendChild(a1); bt.appendChild(a2);
      cg.appendChild(bt);
    });
    colBox.appendChild(cg);
    const two = document.createElement('div');
    two.className = 'cf-two';
    two.appendChild(markBox); two.appendChild(colBox);
    paper.appendChild(two);

    /* the sign itself, so you can see what you have made */
    const spec = document.createElement('div');
    spec.className = 'cf-specimen';
    spec.appendChild(brandPreview(d));
    paper.appendChild(spec);

    /* and the line */
    const sign = document.createElement('div');
    sign.className = 'cf-sign';
    const padWrap = document.createElement('div');
    padWrap.className = 'cf-pad';
    const pad = document.createElement('canvas');
    pad.id = 'sig-pad'; pad.width = SIGW * 2; pad.height = SIGH * 2;
    padWrap.appendChild(pad);
    const baseline = document.createElement('u'); padWrap.appendChild(baseline);
    const ghost = document.createElement('em'); ghost.textContent = 'SIGN HERE'; padWrap.appendChild(ghost);
    sign.appendChild(padWrap);
    const clear = document.createElement('button');
    clear.className = 'btn btn-tiny'; clear.type = 'button'; clear.dataset.act = 'company-sigclear'; clear.textContent = 'CLEAR';
    sign.appendChild(clear);
    const save = document.createElement('button');
    save.className = 'btn btn-green'; save.dataset.act = 'company-save'; save.type = 'button';
    save.textContent = companyInIntro ? 'FILE IT' : 'RE-FILE';
    sign.appendChild(save);
    paper.appendChild(sign);

    host.appendChild(paper);
    /* an existing signature comes back onto the line; a new company starts blank */
    sigPts = Array.isArray(d.sig) ? d.sig.map(p => [p[0], p[1]]) : [];
    redrawPad();
  }
  document.addEventListener('input', ev => {
    if (ev.target && ev.target.id === 'company-name' && companyDraft) {
      companyDraft.name = ev.target.value;
      const old = companyHost && companyHost.querySelector('.brand-preview');
      if (old) old.replaceWith(brandPreview(companyDraft));
    }
  });
  function saveCompany() {
    if (!companyDraft) return;
    if (!sigEnough(sigPts)) { snd.error(); redrawPad(); return; }
    companyDraft.sig = sigPts.slice();
    GAME.setCompany(companyDraft);
    snd.grand();
    if (companyInIntro) {
      $('#company-form').hidden = true;
      hideTitle();
      const q = GAME.currentQuest();
      toast({ icon: S().company.logo, title: S().company.name + ' IS OPEN', body: q ? 'First job: ' + q.name.toLowerCase() + '. ' + q.hint + '.' : 'Good luck.', long: true });
    } else closeModals();
    companyDraft = null;
  }

  /* ================= THE GENE LAB =================
     Pick a hen, read its five genes, then splice another into it,
     clone it, or cross it with an animal. The best bird on the
     ranch wears a crown.
     ============================================== */
  let geneTarget = null, geneMode = null;
  function openGenes(id) {
    if (!GAME.hasGeneLab()) { toast({ icon: 'lock', title: 'NO GENE LAB', body: GAME.lvl('genelab') ? 'Build one from the BUILD tool, RANCH tab.' : 'Research the Gene Lab in the HENS lane first.' }); return; }
    if (id) geneTarget = id;
    if (!S().chickens.some(c => c.id === geneTarget)) { const best = GAME.bestChickens(1)[0]; geneTarget = best ? best.id : null; }
    geneMode = null;
    renderGenes();
    openModal('#modal-genes');
  }
  function genePick(id) {
    if (geneMode === 'splice' && geneTarget && id !== geneTarget) {
      if (GAME.splice(geneTarget, id)) { geneMode = null; glFx = { t: performance.now(), kind: 'splice' }; refreshInspect(); }
      else { snd.error(); }
      return;
    }
    geneTarget = id; snd.plop();
  }
  /* ============================================================
     THE GENE LAB - a room, not a form. Steel walls, pipes, a helix
     on the back screen, and the flock floating in glass tubes along
     the bench. Tap a tube to lift that hen onto the big specimen tube
     on the right; the machines beside it splice, clone and cross. All
     of it is drawn on one canvas and hit-tested like the Lab's screen.
     ============================================================ */
  const GLW = 380, GLH = 220, GK = 2;
  let glCv = null, glCtx = null, glHits = [], glHover = null, glMouse = { x: 0, y: 0, inside: false }, glScroll = 0, glFx = null;
  function glAdults() { return S().chickens.filter(c => !GAME.isChick(c)).slice().sort((a, b) => GAME.chScore(b) - GAME.chScore(a)); }
  function glHitAt(x, y) {
    for (let i = glHits.length - 1; i >= 0; i--) { const h = glHits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; }
    return null;
  }
  function renderGenes() {
    const body = $('#genes-body');
    if (!glCv) {
      body.innerHTML = '';
      glCv = document.createElement('canvas');
      glCv.id = 'genes-canvas'; glCv.width = GLW * GK; glCv.height = GLH * GK;
      body.appendChild(glCv);
      glCtx = glCv.getContext('2d');
      const at = ev => { const r = glCv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * GLW, y: (ev.clientY - r.top) / r.height * GLH }; };
      glCv.addEventListener('pointermove', ev => { const p = at(ev); glMouse = { x: p.x, y: p.y, inside: true }; const h = glHitAt(p.x, p.y); glHover = h ? h.key : null; });
      glCv.addEventListener('pointerleave', () => { glMouse.inside = false; glHover = null; });
      glCv.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        const p = at(ev); glMouse = { x: p.x, y: p.y, inside: true };
        const h = glHitAt(p.x, p.y);
        if (!h) return;
        if (h.kind === 'tube') { genePick(h.id); return; }
        if (h.kind === 'splice') { if (h.on) { geneMode = geneMode === 'splice' ? null : 'splice'; snd.plop(); } else snd.error(); return; }
        if (h.kind === 'clone') { if (GAME.cloneChicken(h.id)) { snd.grand(); glFx = { t: performance.now(), kind: 'clone' }; } else snd.error(); return; }
        if (h.kind === 'cross') { if (GAME.crossAnimal(h.id, h.animal)) { snd.grand(); glFx = { t: performance.now(), kind: 'cross' }; } else snd.error(); return; }
        if (h.kind === 'scroll') { glScroll = Math.max(0, glScroll + h.d); snd.plop(); return; }
        if (h.kind === 'close') { closeModals(); snd.plop(); }
      });
    }
    glScroll = 0;
  }
  /* a glass tube with liquid, bubbles and something floating in it */
  function glTube(g, x, y, w, h, now, liquid, seed, spr, sprScale, glow) {
    const lt = y + 8, lh = h - 16;
    g.fillStyle = '#0b1a24'; g.fillRect(x - 3, y + h - 6, w + 6, 8);          /* pedestal */
    g.fillStyle = '#2a4a5a'; g.fillRect(x - 2, y + h - 5, w + 4, 5);
    g.fillStyle = glow ? '#7ef2a8' : '#1f6a5a'; for (let i = 0; i < 3; i++) g.fillRect(x + 2 + i * Math.floor((w - 4) / 3), y + h - 3, 3, 1);
    g.fillStyle = '#2a4a5a'; g.fillRect(x - 2, y, w + 4, 5);                    /* cap */
    g.fillStyle = '#4a7a8a'; g.fillRect(x - 2, y, w + 4, 1);
    g.fillStyle = 'rgba(190,240,255,.16)'; g.fillRect(x, y + 5, w, h - 11);     /* glass */
    g.fillStyle = liquid; g.fillRect(x + 1, lt, w - 2, lh);                       /* liquid */
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 1, lt, w - 2, 1);
    if (spr) {
      const bob = Math.round(Math.sin(now / 600 + seed) * 2);
      const sx = Math.round(x + w / 2 - spr.width / 2), sy = Math.round(lt + lh / 2 - spr.height / 2 + bob);
      g.drawImage(spr, sx, sy);
      g.fillStyle = 'rgba(80,220,200,.28)'; g.fillRect(sx, Math.max(lt, sy), spr.width, Math.min(spr.height, lt + lh - sy));
    }
    /* bubbles rising */
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 5; i++) {
      const bx = x + 3 + ((i * 7 + seed * 3) % Math.max(1, w - 6));
      const by = lt + lh - 2 - Math.floor(((now / 28) + i * 19 + seed * 7) % (lh - 3));
      g.fillRect(bx, by, 1, 1); if (i % 2) g.fillRect(bx + 1, by, 1, 1);
    }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 2, y + 6, 1, h - 13);  /* highlight */
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + w - 3, y + 6, 2, h - 13);
    if (glow) { g.fillStyle = glow; g.fillRect(x - 3, y - 1, w + 6, 1); g.fillRect(x - 3, y + h + 1, w + 6, 1); g.fillRect(x - 4, y - 1, 1, h + 3); g.fillRect(x + w + 3, y - 1, 1, h + 3); }
  }
  function drawGenes(now) {
    if (!glCv) return;
    const g = glCtx;
    g.imageSmoothingEnabled = false;
    g.setTransform(GK, 0, 0, GK, 0, 0);
    glHits = [];
    const st = S();
    const adults = glAdults();
    const target = st.chickens.find(c => c.id === geneTarget);

    /* ---- the room ---- */
    g.fillStyle = '#0e1620'; g.fillRect(0, 0, GLW, GLH);
    g.fillStyle = '#16232f';
    for (let x = 0; x < GLW; x += 38) for (let y = 0; y < 150; y += 30) g.fillRect(x + 1, y + 1, 36, 28);
    g.fillStyle = '#1f3040'; for (let x = 0; x < GLW; x += 38) g.fillRect(x + 1, 1, 36, 1);
    /* pipes along the ceiling */
    g.fillStyle = '#34505e'; g.fillRect(0, 6, GLW, 5); g.fillStyle = '#5a7a88'; g.fillRect(0, 6, GLW, 1);
    g.fillStyle = '#2a3f4c'; g.fillRect(0, 14, GLW, 3);
    for (let x = 20; x < GLW; x += 60) { g.fillStyle = '#5a7a88'; g.fillRect(x, 4, 6, 9); g.fillStyle = Math.floor(now / 700 + x) % 3 ? '#7ef2a8' : '#245a3a'; g.fillRect(x + 2, 12, 2, 2); }
    /* the floor */
    g.fillStyle = '#101c24'; g.fillRect(0, 150, GLW, GLH - 150);
    g.fillStyle = '#1a2b36'; for (let x = 0; x < GLW; x += 20) g.fillRect(x, 150, 1, GLH - 150); for (let y = 150; y < GLH; y += 14) g.fillRect(0, y, GLW, 1);
    g.fillStyle = 'rgba(126,242,168,.06)'; g.fillRect(0, 150, GLW, 3);
    /* the helix screen on the back wall */
    SPR.drawBox(g, 262, 20, 108, 44, '#03110a', '#2f6a48', '#0f1f16');
    for (let i = 0; i < 26; i++) {
      const px2 = 268 + i * 4, ph = Math.sin(now / 500 + i * 0.55);
      g.fillStyle = '#ff5f9e'; g.fillRect(px2, Math.round(42 + ph * 12), 2, 2);
      g.fillStyle = '#3fa7d6'; g.fillRect(px2, Math.round(42 - ph * 12), 2, 2);
      if (i % 3 === 0) { g.fillStyle = 'rgba(126,242,168,.5)'; g.fillRect(px2, Math.min(42 + ph * 12, 42 - ph * 12) | 0, 1, Math.abs(ph * 24) | 0); }
    }
    SPR.drawTiny(g, 'GENE LAB', 266, 23, '#7ef2a8', 1);
    const fx = GAME.fmt(st.feathers) + ' FEATHERS';
    SPR.drawTiny(g, fx, 368 - SPR.tinyW(fx, 1), 23, '#ffd23f', 1);
    SPR.drawScanlines(g, 263, 21, 106, 42, now);
    /* the way out */
    SPR.drawBox(g, 14, 22, 30, 12, glHover === 'close' ? '#3a5060' : '#2a3f4c', '#5a7a88', '#0b1a24');
    SPR.drawTiny(g, 'EXIT', 20, 25, '#e8607a', 1);
    glHits.push({ kind: 'close', key: 'close', x: 14, y: 22, w: 30, h: 12, label: 'BACK TO THE RANCH' });

    /* ---- the flock in their tubes ---- */
    const TW = 30, TH = 84, GAP = 8, x0 = 14, ty = 46;
    const perPage = 6;
    if (glScroll > Math.max(0, adults.length - perPage)) glScroll = Math.max(0, adults.length - perPage);
    const shown = adults.slice(glScroll, glScroll + perPage);
    if (!adults.length) SPR.drawTiny(g, 'NO GROWN HENS YET', x0, ty + 40, '#7ef2a8', 1);
    shown.forEach((ch, i) => {
      const x = x0 + i * (TW + GAP);
      const sp = SPECIES[ch.sp];
      const sel = ch.id === geneTarget, donor = geneMode === 'splice' && !sel;
      const glow = sel ? '#ffd23f' : donor ? (Math.floor(now / 300) % 2 ? '#ff5f9e' : null) : (glHover === 'tube' + ch.id ? 'rgba(255,255,255,.5)' : null);
      glTube(g, x, ty, TW, TH, now, sel ? 'rgba(80,220,255,.55)' : 'rgba(60,200,170,.45)', ch.id, SPR.chickenSprite(sp, 1, false), 1, glow);
      if (adults[0] === ch) g.drawImage(SPR.iconSprite('crown', 1), x + TW / 2 - 5, ty - 12 + Math.round(Math.sin(now / 400) * 1));
      /* what it earns, on the pedestal */
      const lab = GAME.fmt(Math.round(GAME.chScore(ch)));
      SPR.drawTiny(g, lab, Math.round(x + TW / 2 - SPR.tinyW(lab, 1) / 2), ty + TH + 5, sel ? '#ffd23f' : '#7ef2a8', 1);
      /* its genes as five little lights */
      GENE_KEYS.forEach((k, gi) => { const v = GAME.gene(ch, k); g.fillStyle = v ? GENES[k].col : '#1f3040'; g.fillRect(x + 1 + gi * 6, ty + TH + 12, 4, 2); });
      glHits.push({ kind: 'tube', key: 'tube' + ch.id, id: ch.id, x: x - 3, y: ty - 2, w: TW + 6, h: TH + 20, label: (donor ? 'DONOR: ' : '') + sp.name.toUpperCase() + '  ' + TIERS[sp.tier].n.toUpperCase() });
    });
    if (adults.length > perPage) {
      [['<', -1, x0 - 12], ['>', 1, x0 + perPage * (TW + GAP) - 2]].forEach(([lab, d, bx]) => {
        const can = d < 0 ? glScroll > 0 : glScroll + perPage < adults.length;
        SPR.drawBox(g, bx, ty + 34, 9, 14, can ? '#2a4a5a' : '#16232f', can ? '#5a7a88' : null, '#0b1a24');
        SPR.drawTiny(g, lab, bx + 3, ty + 38, can ? '#d8ffe8' : '#3a5560', 1);
        if (can) glHits.push({ kind: 'scroll', key: 'scroll' + d, d, x: bx, y: ty + 34, w: 9, h: 14, label: 'MORE HENS' });
      });
    }

    /* ---- the specimen tube and its readout ---- */
    const bx = 256, by = 72, BW = 46, BH = 100;
    const flash = glFx && now - glFx.t < 700 ? (1 - (now - glFx.t) / 700) : 0;
    glTube(g, bx, by, BW, BH, now, flash ? 'rgba(255,255,220,' + (0.35 + flash * 0.5) + ')' : 'rgba(80,220,255,.5)', 99, target ? SPR.chickenSprite(SPECIES[target.sp], 2, false) : null, 2, geneMode === 'splice' ? '#ff5f9e' : '#5fe8ff');
    if (!target) SPR.drawTiny(g, 'PICK A HEN', bx + 4, by + 44, '#7ef2a8', 1);
    /* the readout */
    const rx = bx + BW + 8, ry = by;
    SPR.drawBox(g, rx, ry, 372 - rx, 74, '#03110a', '#2f6a48', '#0f1f16');
    if (target) {
      const sp = SPECIES[target.sp];
      SPR.drawTiny(g, sp.name.toUpperCase().slice(0, 14), rx + 3, ry + 3, '#d8ffe8', 1);
      GENE_KEYS.forEach((k, gi) => {
        const v = GAME.gene(target, k);
        g.drawImage(SPR.iconSprite(GENES[k].icon, 1), rx + 3, ry + 11 + gi * 10);
        for (let p = 0; p < ECON.geneMax; p++) { g.fillStyle = p < v ? GENES[k].col : '#1d3628'; g.fillRect(rx + 15 + p * 7, ry + 13 + gi * 10, 5, 4); }
      });
      const sc = GAME.fmt(Math.round(GAME.chScore(target))) + '/MIN' + (target.mods && target.mods.length ? '  ' + target.mods.length + 'X' : '');
      SPR.drawTiny(g, sc, rx + 3, ry + 64, '#ffd23f', 1);
    } else SPR.drawTiny(g, 'NO SPECIMEN', rx + 3, ry + 3, '#4fb072', 1);
    SPR.drawScanlines(g, rx + 1, ry + 1, 372 - rx - 2, 72, now + 300);

    /* ---- the machines: splice, clone, cross ---- */
    const machine = (kind, x, y, w, icon, label, cost, on, hot, extra) => {
      const hov = glHover === kind + (extra || '');
      SPR.drawBox(g, x, y, w, 20, on ? (hot ? SPR.darken('#ffc72f', 0.4) : '#1d3628') : '#16232f', on ? (hot ? '#ffc72f' : '#4fb072') : '#243440', '#0b1a24');
      g.globalAlpha = on ? 1 : 0.4; g.drawImage(SPR.iconSprite(icon, 1), x + 3, y + 3); g.globalAlpha = 1;
      SPR.drawTiny(g, label, x + 15, y + 4, on ? '#d8ffe8' : '#3a5560', 1);
      if (cost) SPR.drawTiny(g, cost, x + 15, y + 12, on ? (hot ? '#ffd23f' : '#4fb072') : '#3a5560', 1);
      if (!on) g.drawImage(SPR.iconSprite('lock', 1), x + w - 12, y + 5);
      if (hov && on) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x, y, w, 1); g.fillRect(x, y + 19, w, 1); }
    };
    const my = 152, my2 = 178;
    const spliceOk = GAME.lvl('splice') > 0, cloneOk = GAME.lvl('clone') > 0, crossOk = GAME.lvl('crossbreed') > 0;
    machine('splice', 14, my, 70, 'flask', geneMode === 'splice' ? 'CANCEL' : 'SPLICE', spliceOk ? GAME.spliceCost() + ' F' : 'RESEARCH', spliceOk, geneMode === 'splice' || (target && st.feathers >= GAME.spliceCost() && adults.length > 1));
    glHits.push({ kind: 'splice', key: 'splice', on: spliceOk && target && adults.length > 1, x: 14, y: my, w: 70, h: 20, label: spliceOk ? (geneMode === 'splice' ? 'PICK THE DONOR - IT WILL BE GONE' : 'SPLICE: THE BEST OF TWO HENS, ONE BIRD') : 'RESEARCH SPLICING IN THE HENS LANE' });
    const cc = target ? GAME.cloneCost(target) : null;
    machine('clone', 92, my, 70, 'twins', 'CLONE', cloneOk ? (cc ? GAME.fmt(cc.c) + ' + ' + cc.f + ' F' : '-') : 'RESEARCH', cloneOk, target && GAME.canClone(target));
    glHits.push({ kind: 'clone', key: 'clone', id: target ? target.id : 0, x: 92, y: my, w: 70, h: 20, label: cloneOk ? 'CLONE: A SECOND BIRD, GENES AND ALL' : 'RESEARCH CLONING IN THE HENS LANE' });
    SPR.drawTiny(g, crossOk ? 'CROSS' : 'CROSS', 218, my2 + 4, crossOk ? '#7ef2a8' : '#3a5560', 1);
    SPR.drawTiny(g, crossOk ? GAME.crossCost() + ' F' : 'LOCKED', 218, my2 + 12, crossOk ? '#4fb072' : '#3a5560', 1);
    ANIMALS.forEach((a, i) => {
      const ax = 14 + i * 40;
      const can = target && GAME.canCross(target, a.id);
      machine('cross', ax, my2, 36, GENES[a.gene].icon, a.name.toUpperCase().slice(0, 4), '+' + GENES[a.gene].name, crossOk, can, a.id);
      glHits.push({ kind: 'cross', key: 'cross' + a.id, id: target ? target.id : 0, animal: a.id, x: ax, y: my2, w: 36, h: 20, label: crossOk ? a.name.toUpperCase() + ': ' + a.desc.toUpperCase() : 'RESEARCH CROSSBREEDING IN THE HENS LANE' });
    });
    /* the status strip */
    const hov = glHits.find(h => h.key === glHover);
    g.fillStyle = '#0b1a24'; g.fillRect(0, GLH - 14, GLW, 14);
    g.fillStyle = '#2a4a5a'; g.fillRect(0, GLH - 14, GLW, 1);
    const line = hov ? hov.label : (geneMode === 'splice' ? 'TAP THE HEN TO SPLICE IN' : adults.length + ' HENS  ' + st.stats.edits + ' EDITS');
    SPR.drawTiny(g, line, 6, GLH - 9, hov ? '#d8ffe8' : '#4fb072', 1);
    /* the pointer */
    if (glMouse.inside) {
      const kind = hov ? 'hand' : 'arrow';
      const cur = SPR.cursorSprite(kind, 1);
      g.drawImage(cur, Math.round(glMouse.x) - (kind === 'hand' ? 4 : 0), Math.round(glMouse.y) - (kind === 'hand' ? 2 : 0));
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ============================================================
     THE WORLD - a map of the whole egg-eating world, drawn on one
     canvas. Continents rise out of a moving sea, every region has a
     flag on a pole, shipping lanes run home from the ones you own,
     and the Moon hangs top right. Pick a region, open it, and build
     branches on it; they earn on their own while you farm.
     ============================================================ */
  /* ================= THE WORLD - A GLOBE ON THE DESK =================
     One canvas: a pixel Earth turning under a fixed sun, the Moon on
     its orbit round it, and every country as a marker standing on the
     surface. Drag the globe to spin it; pick a country and the globe
     turns to face it. The column on the right is the ledger for whatever
     is picked, and the way to open it or build there.
     ============================================================ */
  const WLW = 380, WLH = 220, WLK = 2;
  const GLOBE = { cx: 124, cy: 108, R: 74 };
  const TILT = 0.38;                                     /* axial tilt, radians */
  let wlCv = null, wlCtx = null, wlHits = [], wlHover = null, wlMouse = { x: 0, y: 0, inside: false }, wlSel = null, wlFx = null;
  let wlYaw = 0.6, wlTarget = null, wlDrag = null, wlLast = 0, wlIdle = 9, wlOff = null, wlBuf = null, wlTex = null;
  function wlHitAt(x, y) {
    for (let i = wlHits.length - 1; i >= 0; i--) { const h = wlHits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; }
    return null;
  }
  const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  /* the yaw that puts a country dead centre, facing the room */
  function faceYaw(r) { return wrapAngle(-r.lon * Math.PI / 180); }
  function wlPick(id) {
    wlSel = id;
    const r = REGION_BY_ID[id];
    if (r && !r.moon) wlTarget = faceYaw(r);
    wlIdle = 0;
  }
  function wlStep(d) {
    const i = Math.max(0, REGIONS.findIndex(r => r.id === wlSel));
    const nx = REGIONS[(i + d + REGIONS.length) % REGIONS.length];
    wlPick(nx.id);
  }
  function openWorld() {
    if (GAME.lvl('worldmap') < 1) { toast({ icon: 'lock', title: 'NO MAP', body: 'Research the World Map in the MARKET lane.' }); return; }
    if (!wlCv) {
      const body = $('#world-body');
      body.innerHTML = '';
      wlCv = document.createElement('canvas');
      wlCv.id = 'world-canvas'; wlCv.width = WLW * WLK; wlCv.height = WLH * WLK;
      body.appendChild(wlCv);
      wlCtx = wlCv.getContext('2d');
      const at = ev => { const r = wlCv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * WLW, y: (ev.clientY - r.top) / r.height * WLH }; };
      const onGlobe = p => Math.hypot(p.x - GLOBE.cx, p.y - GLOBE.cy) <= GLOBE.R + 2;
      wlCv.addEventListener('pointermove', ev => {
        const p = at(ev); wlMouse = { x: p.x, y: p.y, inside: true };
        if (wlDrag) { wlYaw = wlDrag.yaw + (p.x - wlDrag.x) / GLOBE.R * 1.3; wlTarget = null; wlIdle = 0; return; }
        const h = wlHitAt(p.x, p.y); wlHover = h ? h.key : (onGlobe(p) ? 'globe' : null);
      });
      wlCv.addEventListener('pointerleave', () => { wlMouse.inside = false; wlHover = null; wlDrag = null; });
      wlCv.addEventListener('pointerup', () => { wlDrag = null; });
      wlCv.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        wlCv.setPointerCapture(ev.pointerId);
        const p = at(ev); wlMouse = { x: p.x, y: p.y, inside: true };
        const h = wlHitAt(p.x, p.y);
        if (!h) { if (onGlobe(p)) wlDrag = { x: p.x, yaw: wlYaw }; return; }
        if (h.kind === 'region') { wlPick(h.id); snd.plop(); return; }
        if (h.kind === 'prev') { wlStep(-1); snd.plop(); return; }
        if (h.kind === 'next') { wlStep(1); snd.plop(); return; }
        if (h.kind === 'open') { if (GAME.openRegion(h.id)) { snd.grand(); wlFx = { t: performance.now(), id: h.id }; } else snd.error(); return; }
        if (h.kind === 'branch') { if (GAME.buildBranch(h.id)) { snd.build(); wlFx = { t: performance.now(), id: h.id }; } else snd.error(); return; }
        if (h.kind === 'close') { closeModals(); snd.plop(); }
      });
    }
    if (!wlSel) {
      const first = REGIONS.find(r => !r.home && GAME.regionReachable(r.id) && !GAME.regionOpen(r.id));
      wlPick(first ? first.id : 'valley');
    }
    wlLast = performance.now();
    openModal('#modal-world');
  }
  /* the planet's skin, baked once: a 256 x 128 map of what covers each
     patch of ground. Every country is a continent grown round its heart,
     its edge frayed by noise; the poles wear ice. */
  const GLOBE_PAL = [[47, 111, 168], [106, 176, 76], [63, 138, 68], [224, 196, 122], [238, 243, 247], [138, 143, 122], [63, 143, 196], [120, 90, 50]];
  function globeTex() {
    if (wlTex) return wlTex;
    const TW = 256, TH = 128;
    const tex = new Uint8Array(TW * TH);
    const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
    /* value noise on a lattice that wraps round the seam */
    const noise = (u, v, cell) => {
      const cu = u / cell, cv = v / cell;
      const x0 = Math.floor(cu), y0 = Math.floor(cv), fx = cu - x0, fy = cv - y0;
      const per = Math.round(TW / cell);
      const at = (i, j) => hash(((i % per) + per) % per, j);
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
    };
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
      const lat = (0.5 - ty / TH) * Math.PI, lon = (tx / TW - 0.5) * Math.PI * 2;
      let land = 0, kind = 'green';
      REGIONS.forEach(r => {
        if (r.moon) return;
        const rl = r.lat * Math.PI / 180, ro = r.lon * Math.PI / 180;
        const d = Math.acos(Math.max(-1, Math.min(1, Math.sin(lat) * Math.sin(rl) + Math.cos(lat) * Math.cos(rl) * Math.cos(lon - ro))));
        const rad = r.size * Math.PI / 180 * (0.62 + 0.76 * noise(tx + r.lon * 0.7, ty + r.lat * 0.4, 12));
        if (d < rad) { const s = 1 - d / rad; if (s > land) { land = s; kind = r.land; } }
      });
      let t = 0;
      if (land > 0.10) {
        t = kind === 'sand' ? 3 : kind === 'cold' ? (land < 0.4 ? 1 : 4) : kind === 'high' ? (land > 0.55 ? 5 : 2) : kind === 'lush' ? 2 : 1;
        if (kind === 'green' && noise(tx * 1.7, ty * 1.7, 6) > 0.72) t = 2;
        if (kind === 'sand' && land > 0.7 && noise(tx, ty, 5) > 0.6) t = 7;
      } else if (land > 0) t = 6;
      if (Math.abs(lat) > 1.24 && t !== 6) t = 4;
      if (Math.abs(lat) > 1.31) t = 4;
      const grain = hash(tx, ty) < 0.16;
      tex[ty * TW + tx] = t | (grain ? 8 : 0);
    }
    wlTex = tex;
    return tex;
  }
  /* a country's place on the screen, and how far round the globe it is */
  function regionView(r) {
    const rl = r.lat * Math.PI / 180, ro = r.lon * Math.PI / 180;
    const wx = Math.cos(rl) * Math.sin(ro), wy = Math.sin(rl), wz = Math.cos(rl) * Math.cos(ro);
    const cy2 = Math.cos(wlYaw), sy2 = Math.sin(wlYaw);
    const x1 = wx * cy2 + wz * sy2, z1 = -wx * sy2 + wz * cy2;
    const ct = Math.cos(TILT), stt = Math.sin(TILT);
    const ny = wy * ct - z1 * stt, nz = wy * stt + z1 * ct;
    return { x: GLOBE.cx + x1 * GLOBE.R, y: GLOBE.cy - ny * GLOBE.R, z: nz };
  }
  function moonSpot(now) {
    const a = now / 5200;
    return { x: GLOBE.cx + Math.cos(a) * (GLOBE.R + 46), y: GLOBE.cy - 8 + Math.sin(a) * 28, front: Math.sin(a) > 0, a };
  }
  /* the planet itself, painted pixel by pixel into an offscreen buffer */
  function paintGlobe(now) {
    if (!wlOff) { wlOff = SPR.newCanvas(WLW, WLH); wlBuf = wlOff.getContext('2d').createImageData(WLW, WLH); }
    const d = wlBuf.data; d.fill(0);
    const tex = globeTex();
    const { cx, cy, R } = GLOBE;
    const ct = Math.cos(TILT), stt = Math.sin(TILT), cy2 = Math.cos(wlYaw), sy2 = Math.sin(wlYaw);
    const Lx = -0.46, Ly = 0.44, Lz = 0.77;
    for (let py = -R - 6; py <= R + 6; py++) {
      const Y = cy + py; if (Y < 0 || Y >= WLH) continue;
      for (let px = -R - 6; px <= R + 6; px++) {
        const X = cx + px; if (X < 0 || X >= WLW) continue;
        const nx = px / R, ny = -py / R, d2 = nx * nx + ny * ny;
        const i = (Y * WLW + X) * 4;
        if (d2 > 1) {
          if (d2 < 1.17) { const a = (1.17 - d2) / 0.17; d[i] = 110; d[i + 1] = 180; d[i + 2] = 255; d[i + 3] = Math.round(110 * a * a); }
          continue;
        }
        const nz = Math.sqrt(1 - d2);
        /* view -> world: undo the tilt, then the spin */
        const wy = ny * ct + nz * stt, wz1 = -ny * stt + nz * ct;
        const wx = nx * cy2 - wz1 * sy2, wz = nx * sy2 + wz1 * cy2;
        const lat = Math.asin(Math.max(-1, Math.min(1, wy))), lon = Math.atan2(wx, wz);
        const tx = ((Math.floor((lon / (Math.PI * 2) + 0.5) * 256) % 256) + 256) % 256;
        const ty = Math.max(0, Math.min(127, Math.floor((0.5 - lat / Math.PI) * 128)));
        const v = tex[ty * 256 + tx];
        const col = GLOBE_PAL[v & 7];
        const light = nx * Lx + ny * Ly + nz * Lz;
        let f = light < 0.02 ? 0.3 : light < 0.3 ? 0.6 : light < 0.66 ? 0.84 : 1.0;
        if (((X + Y) & 1) && light > 0.02 && light < 0.3) f -= 0.1;
        if (d2 > 0.88) f *= 0.82;
        if (v & 8) f *= 0.9;
        d[i] = col[0] * f; d[i + 1] = col[1] * f; d[i + 2] = col[2] * f; d[i + 3] = 255;
      }
    }
    wlOff.getContext('2d').putImageData(wlBuf, 0, 0);
    return wlOff;
  }
  function drawMoonBody(g, mx, my, open, now, big) {
    const r = big ? 13 : 11;
    const mm = SPR.newMask(r * 2 + 2, r * 2 + 2); SPR.mCircle(mm, r + 1, r + 1, r, 1);
    SPR.renderMask(g, mm, 1, Math.round(mx - r - 1), Math.round(my - r - 1),
      open ? { base: '#c9ced6', light: '#eef0f4', dark: '#8a9099', out: '#5e6570' } : { base: '#8a9099', light: '#b8c0cc', dark: '#5a626e', out: '#3a4048' },
      5, { lightBand: 3, shadeBand: 4, grain: 0.1 });
    g.fillStyle = open ? '#8a9099' : '#5a626e';
    g.fillRect(Math.round(mx - 6), Math.round(my - 4), 4, 3); g.fillRect(Math.round(mx + 2), Math.round(my + 2), 5, 4); g.fillRect(Math.round(mx - 2), Math.round(my + 6), 3, 2);
    if (open) {
      /* the dome, and the branches as little lit windows */
      g.fillStyle = '#9fe8ff'; g.fillRect(Math.round(mx - 4), Math.round(my - 11), 8, 4); g.fillRect(Math.round(mx - 2), Math.round(my - 13), 4, 2);
      g.fillStyle = '#2e2216'; g.fillRect(Math.round(mx - 4), Math.round(my - 7), 8, 1);
      for (let i = 0; i < Math.min(10, GAME.branchCount('moon')); i++) { g.fillStyle = Math.floor(now / 400 + i) % 3 ? '#ffd23f' : '#7a5a2a'; g.fillRect(Math.round(mx - 7 + (i % 5) * 3), Math.round(my + 9 + Math.floor(i / 5) * 2), 2, 1); }
    }
  }
  function drawWorld(now) {
    if (!wlCv) return;
    const dt = Math.min(0.1, Math.max(0, (now - wlLast) / 1000)); wlLast = now;
    /* the globe turns to face the picked country, then drifts on its own once left alone */
    if (wlTarget !== null) {
      const dd = wrapAngle(wlTarget - wlYaw);
      wlYaw += dd * Math.min(1, dt * 5);
      if (Math.abs(dd) < 0.01) { wlYaw = wlTarget; wlTarget = null; }
    } else if (!wlDrag) {
      wlIdle += dt;
      if (wlIdle > 5) wlYaw += dt * 0.18;
    }
    wlYaw = wrapAngle(wlYaw);
    const g = wlCtx;
    g.imageSmoothingEnabled = false;
    g.setTransform(WLK, 0, 0, WLK, 0, 0);
    wlHits = [];
    const st = S();
    /* space: a slow sky of stars and the sun off to the upper left */
    g.fillStyle = '#05080f'; g.fillRect(0, 0, WLW, WLH);
    for (let i = 0; i < 90; i++) {
      const x = (i * 97 + 13) % WLW, y = (i * 53 + 7) % WLH;
      if ((i + Math.floor(now / 600)) % 9 === 0) continue;
      g.fillStyle = i % 4 ? 'rgba(255,255,255,.55)' : 'rgba(180,220,255,.9)';
      g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = 'rgba(255,232,150,.10)'; g.fillRect(0, 0, 60, 46); g.fillStyle = 'rgba(255,232,150,.14)'; g.fillRect(0, 0, 34, 26);
    const moon = moonSpot(now);
    const moonOpen = GAME.regionOpen('moon');
    /* the far side of the orbit passes behind the planet */
    if (!moon.front) drawMoonBody(g, moon.x, moon.y, moonOpen, now, false);
    /* the orbit itself, a ring of dots */
    g.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; const ox = GLOBE.cx + Math.cos(a) * (GLOBE.R + 46), oy = GLOBE.cy - 8 + Math.sin(a) * 28; if (Math.sin(a) > 0 || Math.hypot(ox - GLOBE.cx, oy - GLOBE.cy) > GLOBE.R + 3) g.fillRect(Math.round(ox), Math.round(oy), 1, 1); }
    g.drawImage(paintGlobe(now), 0, 0);
    /* a glint where the sun catches the sea */
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(GLOBE.cx - 30, GLOBE.cy - 36, 3, 1); g.fillRect(GLOBE.cx - 33, GLOBE.cy - 34, 2, 1);
    /* the countries, standing on the surface */
    const home = REGION_BY_ID.valley;
    REGIONS.forEach(r => {
      if (r.moon) return;
      const v = regionView(r);
      if (v.z < 0.06) return;
      const open = GAME.regionOpen(r.id), reach = GAME.regionReachable(r.id), sel = wlSel === r.id, hov = wlHover === 'r' + r.id;
      const x = Math.round(v.x), y = Math.round(v.y);
      g.globalAlpha = Math.min(1, 0.35 + v.z);
      if (r.home) {
        g.fillStyle = '#2e2216'; g.fillRect(x - 6, y - 13, 12, 12);
        g.fillStyle = st.company.col1; g.fillRect(x - 5, y - 12, 10, 10);
        g.drawImage(SPR.iconSprite(st.company.logo, 1), x - 5, y - 12);
        g.fillStyle = '#2e2216'; g.fillRect(x, y - 2, 1, 3);
      } else if (open) {
        g.fillStyle = '#2e2216'; g.fillRect(x, y - 15, 1, 16);
        g.fillStyle = r.flag[0]; g.fillRect(x + 1, y - 15, 8, 5);
        g.fillStyle = r.flag[1]; g.fillRect(x + 1, y - 12, 8, 2);
        for (let i = 0; i < GAME.branchCount(r.id); i++) {
          const bx2 = x - 9 + (i % 5) * 4, by2 = y + 1 + Math.floor(i / 5) * 4;
          g.fillStyle = '#2e2216'; g.fillRect(bx2, by2, 3, 3);
          g.fillStyle = Math.floor(now / 500 + i) % 3 ? '#ffe9a0' : '#c9a35f'; g.fillRect(bx2 + 1, by2 + 1, 1, 2);
        }
      } else {
        g.fillStyle = reach ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.3)';
        for (let i = 0; i < 6; i++) g.fillRect(x - 5 + (i % 3) * 4, y - 12 + Math.floor(i / 3) * 10, 2, 1);
        g.fillRect(x - 5, y - 8, 1, 2); g.fillRect(x + 5, y - 8, 1, 2);
        g.globalAlpha *= reach ? 1 : 0.45;
        g.drawImage(SPR.iconSprite('lock', 1), x - 5, y - 13);
      }
      g.globalAlpha = 1;
      if (sel || hov) {
        const pul = sel ? Math.floor(now / 300) % 2 : 0;
        g.fillStyle = sel ? (pul ? '#ffd23f' : '#fff8ec') : 'rgba(255,255,255,.6)';
        g.fillRect(x - 11, y - 18, 22, 1); g.fillRect(x - 11, y + 5, 22, 1); g.fillRect(x - 11, y - 18, 1, 24); g.fillRect(x + 10, y - 18, 1, 24);
      }
      if (wlFx && wlFx.id === r.id && now - wlFx.t < 700) { const f = (now - wlFx.t) / 700; g.fillStyle = 'rgba(255,255,255,' + (1 - f) + ')'; const rr = Math.round(f * 16); g.fillRect(x - rr, y - 7 - rr, rr * 2, 1); g.fillRect(x - rr, y - 7 + rr, rr * 2, 1); g.fillRect(x - rr, y - 7 - rr, 1, rr * 2); g.fillRect(x + rr, y - 7 - rr, 1, rr * 2); }
      wlHits.push({ kind: 'region', key: 'r' + r.id, id: r.id, x: x - 11, y: y - 18, w: 22, h: 24 });
    });
    /* the near side of the orbit passes in front */
    if (moon.front) drawMoonBody(g, moon.x, moon.y, moonOpen, now, false);
    {
      const mx = Math.round(moon.x), my = Math.round(moon.y), sel = wlSel === 'moon', hov = wlHover === 'rmoon';
      if (sel || hov) { g.fillStyle = sel ? (Math.floor(now / 300) % 2 ? '#ffd23f' : '#fff8ec') : 'rgba(255,255,255,.6)'; g.fillRect(mx - 15, my - 16, 30, 1); g.fillRect(mx - 15, my + 15, 30, 1); g.fillRect(mx - 15, my - 16, 1, 32); g.fillRect(mx + 14, my - 16, 1, 32); }
      if (!moonOpen) { g.globalAlpha = GAME.regionReachable('moon') ? 1 : 0.5; g.drawImage(SPR.iconSprite('lock', 1), mx - 5, my - 5); g.globalAlpha = 1; }
      if (wlFx && wlFx.id === 'moon' && now - wlFx.t < 700) { const f = (now - wlFx.t) / 700; g.fillStyle = 'rgba(255,255,255,' + (1 - f) + ')'; const rr = Math.round(f * 20); g.fillRect(mx - rr, my - rr, rr * 2, 1); g.fillRect(mx - rr, my + rr, rr * 2, 1); }
      wlHits.push({ kind: 'region', key: 'rmoon', id: 'moon', x: mx - 15, y: my - 16, w: 30, h: 32 });
    }
    /* the rocket, on its way up */
    if (st.empire.rocket > 0) {
      const f = 1 - st.empire.rocket / 6;
      const hv = regionView(home);
      const sx = hv.z > 0 ? hv.x : GLOBE.cx, sy = hv.z > 0 ? hv.y : GLOBE.cy;
      const rx = sx + (moon.x - sx) * f, ry = sy + (moon.y - sy) * f - Math.sin(f * Math.PI) * 30;
      g.fillStyle = '#fff8ec'; g.fillRect(Math.round(rx) - 1, Math.round(ry) - 3, 3, 6);
      g.fillStyle = '#e8542f'; g.fillRect(Math.round(rx) - 2, Math.round(ry) + 3, 5, 1);
      g.fillStyle = Math.floor(now / 60) % 2 ? '#ffd23f' : '#ff8f6a'; g.fillRect(Math.round(rx) - 1, Math.round(ry) + 4, 3, 3 + Math.floor(now / 90) % 2);
    }
    /* the way out, and what the empire earns */
    SPR.drawBox(g, 6, 6, 30, 12, wlHover === 'close' ? '#3a5060' : '#2a3f4c', '#5a7a88', '#0b1a24');
    SPR.drawTiny(g, 'EXIT', 12, 9, '#e8607a', 1);
    wlHits.push({ kind: 'close', key: 'close', x: 6, y: 6, w: 30, h: 12 });
    const inc = GAME.branchIncome();
    SPR.drawTiny(g, GAME.fmt(Math.round(inc)) + '/MIN ABROAD', 42, 9, '#ffd23f', 1);
    SPR.drawTiny(g, GAME.fmt(st.coins) + ' COINS', 42, 17, '#7ef2a8', 1);
    if (wlHover === 'globe' || wlDrag) SPR.drawTiny(g, wlDrag ? 'SPINNING' : 'DRAG TO SPIN', 6, WLH - 10, '#4fb072', 1);

    /* ---- the column on the right: the picked country ---- */
    const r = REGION_BY_ID[wlSel] || REGION_BY_ID.valley;
    const px0 = 226, pw = 148;
    SPR.drawBox(g, px0, 6, pw, WLH - 12, '#0b1a24', '#2a4a5a', '#16232f');
    const open = GAME.regionOpen(r.id), reach = GAME.regionReachable(r.id);
    /* flag, name, blurb */
    g.fillStyle = '#2e2216'; g.fillRect(px0 + 7, 13, 18, 13);
    g.fillStyle = r.flag[0]; g.fillRect(px0 + 8, 14, 16, 11);
    g.fillStyle = r.flag[1]; g.fillRect(px0 + 8, 19, 16, 3);
    if (r.moon) { g.fillStyle = '#c9ced6'; g.fillRect(px0 + 12, 16, 3, 3); g.fillRect(px0 + 18, 20, 2, 2); }
    if (r.home) g.drawImage(SPR.iconSprite(st.company.logo, 1), px0 + 12, 15);
    const nm = r.name.toUpperCase();
    SPR.drawTiny(g, nm.length > 13 ? nm.slice(0, 13) : nm, px0 + 30, 12, '#d8ffe8', 1);
    SPR.drawTiny(g, open ? (r.home ? 'HEAD OFFICE' : 'OPEN') : reach ? 'FOR SALE' : 'NOT YET', px0 + 30, 20, open ? '#7ef2a8' : reach ? '#ffd23f' : '#4fb072', 1);
    const blurb = r.blurb.toUpperCase().split(' ');
    let line = '', ly = 32;
    blurb.forEach(w => { if (SPR.tinyW(line + ' ' + w, 1) > pw - 14) { SPR.drawTiny(g, line, px0 + 7, ly, '#4fb072', 1); ly += 7; line = w; } else line = line ? line + ' ' + w : w; });
    if (line) { SPR.drawTiny(g, line, px0 + 7, ly, '#4fb072', 1); ly += 7; }
    g.fillStyle = '#2a4a5a'; g.fillRect(px0 + 7, ly + 3, pw - 14, 1);
    ly += 9;
    /* the numbers */
    const row = (a, b, col) => { SPR.drawTiny(g, a, px0 + 7, ly, '#7ef2a8', 1); SPR.drawTiny(g, b, px0 + pw - 7 - SPR.tinyW(b, 1), ly, col || '#d8ffe8', 1); ly += 8; };
    if (r.home) {
      row('RANCH', GAME.fmt(Math.round(GAME.rates().coinsPerMin)) + '/MIN', '#ffd23f');
      row('COUNTRIES', REGIONS.filter(x => !x.home && GAME.regionOpen(x.id)).length + '/' + (REGIONS.length - 1));
      row('BRANCHES', String(st.stats.branches));
      row('ABROAD', GAME.fmt(Math.round(inc)) + '/MIN', '#ffd23f');
    } else if (!open) {
      row('PRICE', GAME.fmt(r.cost), reach && st.coins >= r.cost ? '#ffd23f' : '#e8607a');
      row('A BRANCH', GAME.fmt(r.yield) + '/MIN');
      row('ROOM FOR', r.cap + ' BRANCHES');
      if (r.moon && GAME.lvl('moonshot') < 1) row('NEEDS', 'MOONSHOT', '#e8607a');
      else if (!reach) row('OPEN', 'THE ONE BEFORE', '#e8607a');
    } else {
      const n = GAME.branchCount(r.id);
      row('BRANCHES', n + '/' + r.cap);
      row('EARNING', GAME.fmt(Math.round(GAME.regionIncome(r.id))) + '/MIN', '#ffd23f');
      row('NEXT ONE', n >= r.cap ? '-' : GAME.fmt(GAME.branchCost(r.id)), GAME.canBranch(r.id) ? '#ffd23f' : '#e8607a');
      if (r.moon && GAME.lvl('moonegg')) row('MOON EGGS', n ? 'ON THEIR WAY' : 'NEED A BRANCH', '#5fd0ff');
    }
    /* the switch */
    const by = 158;
    if (r.home) {
      SPR.drawBox(g, px0 + 7, by, pw - 14, 14, '#16232f', '#243440', '#0b1a24');
      SPR.drawTiny(g, 'HOME SWEET HOME', px0 + 12, by + 4, '#4fb072', 1);
    } else if (!open) {
      const can = GAME.canOpenRegion(r.id);
      SPR.drawBox(g, px0 + 7, by, pw - 14, 14, can ? SPR.darken('#ffc72f', 0.4) : '#16232f', can ? '#ffc72f' : '#243440', '#0b1a24');
      SPR.drawTiny(g, reach ? 'OPEN  ' + GAME.fmt(r.cost) : 'LOCKED', px0 + 12, by + 4, can ? '#fff8ec' : '#4fb072', 1);
      if (reach) wlHits.push({ kind: 'open', key: 'open', id: r.id, x: px0 + 7, y: by, w: pw - 14, h: 14 });
    } else {
      const n = GAME.branchCount(r.id), can = GAME.canBranch(r.id), full = n >= r.cap;
      SPR.drawBox(g, px0 + 7, by, pw - 14, 14, can ? SPR.darken('#7ef2a8', 0.55) : '#16232f', can ? '#7ef2a8' : '#243440', '#0b1a24');
      SPR.drawTiny(g, full ? 'ALL BUILT' : 'BRANCH  ' + GAME.fmt(GAME.branchCost(r.id)), px0 + 12, by + 4, can ? '#fff8ec' : '#4fb072', 1);
      if (!full) wlHits.push({ kind: 'branch', key: 'branch', id: r.id, x: px0 + 7, y: by, w: pw - 14, h: 14 });
    }
    /* previous and next, and where this one sits in the run */
    const ay = 182;
    [['<', 'prev', px0 + 7], ['>', 'next', px0 + pw - 23]].forEach(([lab, kind, bx]) => {
      SPR.drawBox(g, bx, ay, 16, 14, wlHover === kind ? '#3a5060' : '#2a3f4c', '#5a7a88', '#0b1a24');
      SPR.drawTiny(g, lab, bx + 6, ay + 4, '#d8ffe8', 1);
      wlHits.push({ kind, key: kind, x: bx, y: ay, w: 16, h: 14 });
    });
    const idx = REGIONS.findIndex(x => x.id === r.id);
    const pos = (idx + 1) + ' OF ' + REGIONS.length;
    SPR.drawTiny(g, pos, px0 + pw / 2 - SPR.tinyW(pos, 1) / 2, ay + 4, '#4fb072', 1);
    /* the run of flags along the foot, lit where they are open */
    REGIONS.forEach((x, i) => {
      const fx = px0 + 8 + i * 14, fy = 202;
      const op = GAME.regionOpen(x.id);
      g.fillStyle = op ? x.flag[0] : '#243440'; g.fillRect(fx, fy, 10, 7);
      g.fillStyle = op ? x.flag[1] : '#16232f'; g.fillRect(fx, fy + 4, 10, 2);
      if (x.id === r.id) { g.fillStyle = '#fff8ec'; g.fillRect(fx - 1, fy + 8, 12, 1); }
    });
    /* the pointer */
    if (wlMouse.inside) {
      const hov = wlHitAt(wlMouse.x, wlMouse.y);
      const kind = hov ? 'hand' : 'arrow';
      const cur = SPR.cursorSprite(kind, 1);
      g.drawImage(cur, Math.round(wlMouse.x) - (kind === 'hand' ? 4 : 0), Math.round(wlMouse.y) - (kind === 'hand' ? 2 : 0));
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ============================================================
     THE POSTER DESK
     A billboard is 28 x 14 fat pixels of your own art. Pick a
     colour, draw on the board, or start from one of the printed
     designs. A poster you painted yourself pulls harder than a
     stock one - the road can tell.
     ============================================================ */
  const PCELL = 25;
  let posterKey = null, posterArt = null, posterCol = 5, posterSize = 1, posterDown = false, posterCv = null, posterCtx = null;
  function openPoster(k) {
    if (!S().billboards[k]) return;
    posterKey = k;
    posterArt = (GAME.billboardArt(k) || billArt(S().billboards[k])).split('');
    if (!posterCv) {
      posterCv = $('#poster-canvas');
      posterCtx = posterCv.getContext('2d');
      const at = ev => {
        const r = posterCv.getBoundingClientRect();
        return { x: Math.floor((ev.clientX - r.left) / r.width * SPR.BILL_W),
                 y: Math.floor((ev.clientY - r.top) / r.height * SPR.BILL_H) };
      };
      const paint = p => {
        let any = false;
        for (let dy = 0; dy < posterSize; dy++) for (let dx = 0; dx < posterSize; dx++) {
          const x = p.x + dx, y = p.y + dy;
          if (x < 0 || y < 0 || x >= SPR.BILL_W || y >= SPR.BILL_H) continue;
          const ch = SPR.BILL_CH[posterCol] || '0';
          if (posterArt[y * SPR.BILL_W + x] === ch) continue;
          posterArt[y * SPR.BILL_W + x] = ch;
          any = true;
        }
        if (any) { drawPoster(); posterDirty = true; }
      };
      posterCv.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        posterCv.setPointerCapture(ev.pointerId);
        posterDown = true;
        paint(at(ev));
      });
      posterCv.addEventListener('pointermove', ev => { if (posterDown) paint(at(ev)); });
      posterCv.addEventListener('pointerup', () => { posterDown = false; savePoster(); });
      posterCv.addEventListener('pointerleave', () => { if (posterDown) { posterDown = false; savePoster(); } });
    }
    renderPosterTools();
    drawPoster();
    openModal('#modal-poster');
  }
  let posterDirty = false;
  function savePoster() {
    if (!posterKey || !posterDirty) return;
    posterDirty = false;
    GAME.setBillboardArt(posterKey, posterArt.join(''), true);
    snd.plop();
  }
  function drawPoster() {
    if (!posterCtx) return;
    const g = posterCtx;
    g.imageSmoothingEnabled = false;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#5e3d18'; g.fillRect(0, 0, posterCv.width, posterCv.height);
    for (let y = 0; y < SPR.BILL_H; y++) for (let x = 0; x < SPR.BILL_W; x++) {
      const i = SPR.BILL_CH.indexOf(posterArt[y * SPR.BILL_W + x]);
      g.fillStyle = BILL_COLS[i > 0 ? i : 0];
      g.fillRect(x * PCELL, y * PCELL, PCELL, PCELL);
      /* a faint join so it reads as a grid you are painting */
      g.fillStyle = 'rgba(0,0,0,.07)';
      g.fillRect(x * PCELL, y * PCELL, PCELL, 1);
      g.fillRect(x * PCELL, y * PCELL, 1, PCELL);
    }
    /* the poster as the road will see it, pinned in the corner */
    const mini = SPR.billboardSprite(posterArt.join(''), 2, true);
    g.drawImage(mini, posterCv.width - mini.width - 8, 8);
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(posterCv.width - mini.width - 12, 4, mini.width + 8, mini.height + 8);
    g.drawImage(mini, posterCv.width - mini.width - 8, 8);
  }
  function renderPosterTools() {
    const box = $('#poster-tools');
    const bb = S().billboards[posterKey];
    $('#poster-sub').textContent = (bb && bb.custom ? 'HAND PAINTED' : 'STOCK POSTER') +
      '  -  PULL x' + (1 + ECON.billboardPull * GAME.billboardPull()).toFixed(2);
    box.innerHTML = '';
    const cols = document.createElement('div');
    cols.className = 'pt-cols';
    BILL_COLS.forEach((col, i) => {
      const b = document.createElement('button');
      b.className = 'pt-col' + (posterCol === i ? ' active' : '');
      b.style.background = col;
      b.dataset.act = 'poster-col';
      b.dataset.i = String(i);
      b.title = i === 0 ? 'The bare board - use it to rub out' : 'Paint with this';
      cols.appendChild(b);
    });
    box.appendChild(cols);
    const sizes = document.createElement('div');
    sizes.className = 'pt-size';
    [1, 2, 3].forEach(n => {
      const b = document.createElement('button');
      b.className = 'btn' + (posterSize === n ? ' btn-green' : '');
      b.dataset.act = 'poster-size';
      b.dataset.n = String(n);
      b.textContent = n + 'X' + n;
      b.title = 'Brush size';
      sizes.appendChild(b);
    });
    box.appendChild(sizes);
    BILL_PRESETS.forEach(pr => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.dataset.act = 'poster-preset';
      b.dataset.id = pr.id;
      b.textContent = pr.name;
      b.title = 'Print this design on the board';
      box.appendChild(b);
    });
  }

  /* ================= MODAL PLUMBING ================= */
  function openModal(sel) {
    closeModals();
    $(sel).hidden = false;
  }
  function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.hidden = true);
  }

  /* ================= THE LAB - A COMPUTER ON A DESK =================
     Open the Lab and you are looking at a monitor: a desk, a
     keyboard, a mug, and on the screen an operating system called
     EGGOS running SKILLMAP.EXE - a hex map of research. Only hexes
     you have installed or could install right now are on the map;
     the rest is dark. A pixel mouse pointer follows your finger.
     ============================================================ */
  const TERM_W = 1140, TERM_H = 660, TK = 3;
  const VW = TERM_W / TK, VH = TERM_H / TK;         /* 380 x 220 */
  const SCR = { x: 18, y: 10, w: 344, h: 166 };     /* the glass */
  const MAPW = { x: SCR.x + 4, y: SCR.y + 4, w: 236, h: 146 };
  const RDW = { x: SCR.x + 244, y: SCR.y + 4, w: 96, h: 146 };
  /* the board: 14px cubes, columns are depth, rows are packed lanes */
  const NODE = 14, COLW = 24, ROWH = 18, GUT = 32;
  const MAP_BG = '#081a14';
  let termCv = null, termCtx = null;
  let termSel = null, termHover = null, termHits = [];
  let mapPan = { x: 0, y: 0 }, mapDrag = null;
  let termMouse = { x: 0, y: 0, inside: false };
  let labOpenedAt = 0, installFx = null, termKeys = 0;

  /* every package is on the board, always: the whole tree reads at a
     glance. State says how far off it is: aged (its lane waits for an
     age), locked (its parent is not in yet), short, ready, done. */
  function pkgState(sk) {
    const cur = GAME.lvl(sk.id);
    if (cur >= sk.max) return 'done';
    if (!GAME.laneOpen(sk.br)) return 'aged';
    const pre = skillPrereq(sk);
    if (pre && GAME.lvl(pre.id) < 1) return 'locked';
    if (S().feathers >= skillCost(sk, cur)) return 'ready';
    return 'short';
  }
  function pkgVisible(sk) { return true; }
  const pkgDark = st => st === 'locked' || st === 'aged';
  /* quests show the chain up to one past the current goal */
  function questIndex(q) { return QUESTS.indexOf(q); }
  function questVisible(q) {
    const cur = GAME.currentQuest();
    const ci = cur ? questIndex(cur) : QUESTS.length;
    return questIndex(q) <= ci + 1;
  }
  function questState(q) {
    if (GAME.questDone(q)) return 'done';
    const cur = GAME.currentQuest();
    return cur && cur.id === q.id ? 'current' : 'later';
  }
  const mapInner = () => ({ x: MAPW.x + 1, y: MAPW.y + 10, w: MAPW.w - 2, h: MAPW.h - 11 });
  /* top-left of a node's front face on the glass */
  function nodePos(id) {
    const p = GRID_POS[id] || { col: 0, row: 0 };
    const inner = mapInner();
    return { x: Math.round(inner.x + GUT + p.col * COLW + mapPan.x), y: Math.round(inner.y + 8 + p.row * ROWH + mapPan.y), col: p.col, row: p.row };
  }
  function clampPan() {
    const inner = mapInner();
    const boardW = GRID.cols * COLW + 8, boardH = GRID.rows * ROWH + 12;
    mapPan.x = Math.min(0, Math.max(-(boardW - (inner.w - GUT)), mapPan.x));
    mapPan.y = Math.min(0, Math.max(-(boardH - inner.h), mapPan.y));
  }
  function centerOn(id) {
    const p = GRID_POS[id] || { col: 0, row: 0 };
    const inner = mapInner();
    mapPan = { x: -(p.col * COLW) + (inner.w - GUT) / 2 - NODE / 2, y: -(p.row * ROWH) + inner.h / 2 - NODE / 2 - 8 };
    clampPan();
  }
  /* Every node wears its lane's colour, always - the lane is the thing you
     read at a glance. State is carried by how bright it is: installed burns
     full, affordable is lit with a gold rim pulsing round it, and one you
     cannot pay for yet sits dark. */
  function nodePal(state, hue) {
    if (state === 'root') return { base: '#c9a35f', light: '#eccf95', dark: '#8a5e2a', out: '#3e2810' };
    if (state === 'done' || state === 'current') return { base: hue, light: SPR.lighten(hue, 0.40), dark: SPR.darken(hue, 0.28), out: SPR.darken(hue, 0.68) };
    if (state === 'ready') {
      const b = SPR.darken(hue, 0.18);
      return { base: b, light: SPR.lighten(b, 0.30), dark: SPR.darken(b, 0.28), out: '#ffc72f' };
    }
    if (pkgDark(state)) {
      const d = SPR.darken(hue, 0.76);
      return { base: d, light: SPR.lighten(d, 0.10), dark: SPR.darken(d, 0.4), out: '#0f1f16' };
    }
    const d = SPR.darken(hue, 0.66);
    return { base: d, light: SPR.lighten(d, 0.14), dark: SPR.darken(d, 0.35), out: '#0f1f16' };
  }
  /* the current quest points at a node; if that node is still dark, at the
     nearest lit one on the way to it */
  function questTarget() {
    const q = GAME.currentQuest();
    if (!q || q.goal.k !== 'skill') return null;
    let sk = SKILL_BY_ID[q.goal.id];
    const path = [];
    while (sk && !pkgVisible(sk)) { path.push(sk.id); sk = skillPrereq(sk); }
    return sk ? { id: sk.id, hidden: path } : null;
  }

  function drawTerm(now) {
    if (!termCv) return;
    const g = termCtx;
    const T = SPR.TERM;
    g.imageSmoothingEnabled = false;
    g.setTransform(TK, 0, 0, TK, 0, 0);
    termHits = [];

    /* ---------- the desk ---------- */
    g.fillStyle = '#2a1e12'; g.fillRect(0, 0, VW, VH);
    g.fillStyle = '#8a5e2a'; g.fillRect(0, 184, VW, 36);
    g.fillStyle = '#a8783f'; g.fillRect(0, 184, VW, 2);
    g.fillStyle = '#7a5230';
    for (let y = 190; y < VH; y += 6) for (let x = (y % 12) ? 0 : 7; x < VW; x += 14) g.fillRect(x, y, 9, 1);
    /* monitor glow on the desk */
    g.fillStyle = 'rgba(126,242,168,.10)'; g.fillRect(40, 186, 300, 30);

    /* ---------- monitor ---------- */
    g.fillStyle = '#1a1410'; g.fillRect(10, 2, 360, 184);
    g.fillStyle = '#d9d2c0'; g.fillRect(11, 3, 358, 182);
    g.fillStyle = '#f2ece0'; g.fillRect(11, 3, 358, 2);
    g.fillStyle = '#a89e8c'; g.fillRect(11, 180, 358, 5);
    g.fillStyle = '#8c8270'; g.fillRect(11, 3, 2, 182); g.fillRect(367, 3, 2, 182);
    /* glass well */
    g.fillStyle = '#1a1410'; g.fillRect(SCR.x - 2, SCR.y - 2, SCR.w + 4, SCR.h + 4);
    /* badge, power lamp, stand */
    SPR.drawTiny(g, 'EGGTRON 3000', 150, 179, '#6e6656', 1);
    g.fillStyle = Math.floor(now / 900) % 2 ? '#7ac74f' : '#4f9b3f'; g.fillRect(352, 180, 4, 3);
    g.fillStyle = '#8c8270'; g.fillRect(170, 186, 40, 5); g.fillStyle = '#a89e8c'; g.fillRect(150, 190, 80, 3);
    /* sticky notes on the bezel */
    const note = (x, y, col, lines, tilt) => {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 1, y + 1, 26, 22);
      g.fillStyle = col; g.fillRect(x, y, 26, 22);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, 26, 2);
      lines.forEach((l, i) => SPR.drawTiny(g, l, x + 2 + tilt, y + 4 + i * 6, '#3a2a16', 1));
    };
    note(8, 190, '#ffe27a', ['FEED', 'CHICKS'], 0);
    note(38, 196, '#ffb0d0', ['WATER', 'CROPS'], 1);
    note(346, 194, '#b8f0c8', ['PET', 'MAMA'], 0);

    /* ---------- keyboard ---------- */
    g.fillStyle = '#1a1410'; g.fillRect(70, 196, 200, 20);
    g.fillStyle = '#d9d2c0'; g.fillRect(71, 197, 198, 18);
    g.fillStyle = '#a89e8c'; g.fillRect(71, 212, 198, 3);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 22; c++) {
      const kx = 74 + c * 9 + (r % 2) * 3, ky = 199 + r * 4;
      if (kx + 8 > 268) continue;
      const lit = installFx && (now - installFx.t) < 600 && ((c + r * 3) % 7) === Math.floor((now - installFx.t) / 60) % 7;
      g.fillStyle = lit ? '#7ef2a8' : '#f2ece0'; g.fillRect(kx, ky, 7, 3);
      g.fillStyle = lit ? '#4fb072' : '#b8b0a0'; g.fillRect(kx, ky + 2, 7, 1);
    }
    g.fillStyle = '#f2ece0'; g.fillRect(120, 211, 90, 3); g.fillStyle = '#b8b0a0'; g.fillRect(120, 213, 90, 1);
    /* mouse on its pad */
    g.fillStyle = '#3a5a8a'; g.fillRect(282, 194, 34, 22);
    g.fillStyle = '#4a6a9a'; g.fillRect(282, 194, 34, 2);
    g.fillStyle = '#1a1410'; g.fillRect(292, 198, 14, 16);
    g.fillStyle = '#f2ece0'; g.fillRect(293, 199, 12, 14);
    g.fillStyle = '#c9c0a8'; g.fillRect(293, 205, 12, 1); g.fillRect(299, 199, 1, 6);
    g.fillStyle = termMouse.inside ? '#7ef2a8' : '#8c8270'; g.fillRect(298, 201, 2, 2);
    /* mug with steam */
    g.fillStyle = '#1a1410'; g.fillRect(324, 190, 15, 19); g.fillRect(338, 194, 4, 9);
    g.fillStyle = '#e8542f'; g.fillRect(325, 191, 13, 17); g.fillRect(339, 195, 2, 7);
    g.fillStyle = '#ff8f6a'; g.fillRect(325, 191, 13, 2);
    g.fillStyle = '#5e3d18'; g.fillRect(326, 192, 11, 2);
    g.fillStyle = '#fff8ec'; g.fillRect(330, 197, 3, 3); g.fillRect(331, 198, 1, 1);
    g.fillStyle = 'rgba(255,255,255,.45)';
    for (let i = 0; i < 3; i++) { const sy = 186 - ((now / 120 + i * 9) % 14); g.fillRect(328 + i * 3 + Math.round(Math.sin(now / 300 + i) * 1), Math.round(sy), 1, 2); }

    /* ---------- the screen ---------- */
    const boot = (now - labOpenedAt) / 1000;
    if (boot < 1.15) { drawBoot(g, boot, now); }
    else drawDesktop(g, now);

    /* glass: scanlines, band, reflection */
    SPR.drawScanlines(g, SCR.x, SCR.y, SCR.w, SCR.h, now);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(SCR.x + 6, SCR.y + 4, 40, 2); g.fillRect(SCR.x + 6, SCR.y + 7, 20, 1);

    /* ---------- the pointer ---------- */
    if (termMouse.inside) {
      const over = termHitAt(termMouse.x, termMouse.y);
      const kind = over && (over.kind === 'node' || over.kind === 'quest' || over.kind === 'age' || over.kind === 'install' || over.kind === 'mod' || over.kind === 'home' || over.kind === 'close') ? 'hand' : 'arrow';
      const cur = SPR.cursorSprite(kind, 1);
      g.drawImage(cur, Math.round(termMouse.x) - (kind === 'hand' ? 4 : 0), Math.round(termMouse.y) - (kind === 'hand' ? 2 : 0));
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawBoot(g, t, now) {
    g.fillStyle = '#05100a'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    const lines = ['EGGTRON BIOS v3.0', 'MEMORY 640 EGGS OK', 'CHECKING COOPS.... OK', 'MOUNTING FEATHERS.. OK',
                   'LOADING EGGOS 5.0', 'RUNNING SKILLMAP.EXE'];
    const n = Math.min(lines.length, Math.floor(t / 0.16));
    for (let i = 0; i < n; i++) SPR.drawText(g, lines[i], SCR.x + 6, SCR.y + 6 + i * 9, i === n - 1 ? '#d8ffe8' : '#7ef2a8', 1);
    if (n < lines.length && Math.floor(now / 120) % 2) { g.fillStyle = '#7ef2a8'; g.fillRect(SCR.x + 6 + SPR.textW(lines[n] || '', 1) * 0, SCR.y + 6 + n * 9, 4, 6); }
    if (t > 1.0) { g.fillStyle = 'rgba(200,255,220,' + ((t - 1.0) / 0.15) + ')'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h); }
  }

  function drawDesktop(g, now) {
    /* wallpaper */
    g.fillStyle = '#0f2a24'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    g.fillStyle = '#123229';
    for (let y = SCR.y; y < SCR.y + SCR.h; y += 12) for (let x = SCR.x + ((y / 12) % 2) * 8; x < SCR.x + SCR.w; x += 16) { g.fillRect(x + 2, y + 3, 3, 4); g.fillRect(x + 1, y + 4, 5, 2); }

    /* ---- SKILLMAP window ---- */
    drawWindow(g, MAPW, 'SKILLMAP.EXE', now);
    const inner = mapInner();
    g.save();
    g.beginPath(); g.rect(inner.x, inner.y, inner.w, inner.h); g.clip();
    /* the drag area goes in first so every node drawn on top of it wins the hit test */
    termHits.push({ kind: 'map', x: inner.x, y: inner.y, w: inner.w, h: inner.h });
    g.fillStyle = MAP_BG; g.fillRect(inner.x, inner.y, inner.w, inner.h);
    /* dotted board */
    g.fillStyle = '#0f2e22';
    const ox = inner.x + GUT + mapPan.x, oy = inner.y + 8 + mapPan.y;
    for (let x = ox + NODE / 2; x < inner.x + inner.w; x += COLW) for (let y = oy + NODE / 2; y < inner.y + inner.h; y += ROWH) if (x > inner.x + GUT) g.fillRect(Math.round(x), Math.round(y), 1, 1);
    /* lane bands */
    GRID.lanes.forEach((L, i) => {
      const y0 = Math.round(oy + L.top * ROWH - 3), h = L.rows * ROWH;
      if (i % 2) { g.fillStyle = 'rgba(255,255,255,.028)'; g.fillRect(inner.x, y0, inner.w, h); }
      g.fillStyle = 'rgba(126,242,168,.12)'; g.fillRect(inner.x, y0, inner.w, 1);
    });

    /* axis-aligned 1px segments; dotted when the way is not yet open */
    const seg = (x0, y0, x1, y1, col, dotted) => {
      const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      g.fillStyle = col;
      for (let i = 0; i <= n; i++) {
        if (dotted && (i % 4) > 1) continue;
        g.fillRect(x0 + dx * i, y0 + dy * i, 1, 1);
      }
    };
    /* an elbow from the right edge of a to the left edge of b */
    const elbow = (a, b, col, dotted) => {
      const ax = a.x + NODE, ay = a.y + NODE / 2, bx = b.x, by = b.y + NODE / 2;
      if (a.col === b.col) { seg(a.x + NODE / 2, a.y + NODE, a.x + NODE / 2, b.y - 1, col, dotted); return; }
      const mx = bx - 6;
      seg(ax, ay, mx, ay, col, dotted);
      if (by !== ay) seg(mx, ay, mx, by, col, dotted);
      seg(mx, by, bx - 1, by, col, dotted);
    };
    const target = questTarget();
    const onPath = new Set();
    if (target) { let sk = SKILL_BY_ID[target.id]; while (sk) { onPath.add(sk.id); sk = skillPrereq(sk); } }

    const visible = SKILLS.filter(pkgVisible);
    const root = nodePos('root');
    /* the trunk: every first package hangs off the kernel down the left edge */
    const firsts = visible.filter(sk => sk.pre === 'root');
    let trunkEnd = root.y + NODE;
    firsts.forEach(sk => { trunkEnd = Math.max(trunkEnd, nodePos(sk.id).y + NODE / 2); });
    seg(root.x + NODE / 2, root.y + NODE, root.x + NODE / 2, trunkEnd, 'rgba(201,163,95,.55)', false);
    /* paths: installed -> child */
    visible.forEach(sk => {
      if (!sk.pre) return;
      const a = nodePos(sk.pre), b = nodePos(sk.id);
      const st = pkgState(sk);
      const hue = MOD_BY_ID[sk.br].hue;
      const col = onPath.has(sk.id) && st !== 'done' ? '#ffffff' : st === 'done' ? hue : st === 'ready' ? '#ffc72f' : pkgDark(st) ? '#173226' : '#2f6a48';
      if (sk.pre === 'root') seg(root.x + NODE / 2 + 1, b.y + NODE / 2, b.x - 1, b.y + NODE / 2, col, st !== 'done');
      else elbow(a, b, col, st !== 'done');
    });
    /* the quest chain zigzags along the top */
    QUESTS.forEach((q, i) => {
      if (!i || !questVisible(q)) return;
      const a = nodePos(QUESTS[i - 1].id), b = nodePos(q.id);
      const done = GAME.questDone(QUESTS[i - 1]);
      const col = done ? '#ffd23f' : '#4a4a2a';
      if (a.col === b.col) seg(a.x + NODE / 2, a.y + NODE, a.x + NODE / 2, b.y - 1, col, !done);
      else { seg(a.x + NODE, a.y + NODE / 2, b.x - 6, a.y + NODE / 2, col, !done); seg(b.x - 6, a.y + NODE / 2, b.x - 6, b.y + NODE / 2, col, !done); seg(b.x - 6, b.y + NODE / 2, b.x - 1, b.y + NODE / 2, col, !done); }
    });

    /* a node: shadow, cube, glyph, then what state it is in */
    const ring = (x, y, col) => {
      g.fillStyle = col;
      g.fillRect(x - 2, y - 2, NODE + 4, 1); g.fillRect(x - 2, y + NODE + 1, NODE + 4, 1);
      g.fillRect(x - 2, y - 2, 1, NODE + 4); g.fillRect(x + NODE + 1, y - 2, 1, NODE + 4);
    };
    const drawNode = (id, hue, st, icon, kind, sel, hov) => {
      const p = nodePos(id);
      if (p.x < inner.x + GUT - NODE || p.x > inner.x + inner.w + 4 || p.y < inner.y - NODE - 4 || p.y > inner.y + inner.h + 4) return;
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(p.x + 1, p.y + 2, NODE + 1, NODE);
      const dim = st === 'short' || st === 'later' ? 0.5 : pkgDark(st) ? 0.3 : 1;
      SPR.drawCube(g, p.x, p.y, NODE, nodePal(st, hue), { depth: dim < 1 ? 1 : 2, bg: MAP_BG });
      g.globalAlpha = dim;
      g.drawImage(SPR.iconSprite(icon, 1), p.x + 2, p.y + 2);
      g.globalAlpha = 1;
      /* a little padlock on anything the tree has not reached yet */
      if (pkgDark(st)) {
        g.fillStyle = '#0f1f16'; g.fillRect(p.x + NODE - 6, p.y + NODE - 7, 6, 7);
        g.fillStyle = st === 'aged' ? '#8a7a3a' : '#5a7a88';
        g.fillRect(p.x + NODE - 5, p.y + NODE - 4, 4, 3); g.fillRect(p.x + NODE - 4, p.y + NODE - 6, 1, 2); g.fillRect(p.x + NODE - 3, p.y + NODE - 6, 1, 2);
      }
      if (sel || hov) ring(p.x, p.y, sel ? '#ffffff' : 'rgba(255,255,255,.55)');
      if ((st === 'ready' || st === 'current') && Math.floor(now / 340) % 2) ring(p.x, p.y, st === 'ready' ? 'rgba(255,214,80,.85)' : 'rgba(255,255,255,.7)');
      if (installFx && installFx.id === id && now - installFx.t < 600) {
        const f = (now - installFx.t) / 600;
        const r2 = Math.round(f * 8);
        g.fillStyle = 'rgba(255,255,255,' + (1 - f) + ')';
        g.fillRect(p.x - r2, p.y - r2, NODE + r2 * 2, 1); g.fillRect(p.x - r2, p.y + NODE + r2 - 1, NODE + r2 * 2, 1);
        g.fillRect(p.x - r2, p.y - r2, 1, NODE + r2 * 2); g.fillRect(p.x + NODE + r2 - 1, p.y - r2, 1, NODE + r2 * 2);
      }
      /* kind badges in the bottom-right corner */
      if (pkgDark(st)) { /* the padlock says it all */ }
      else if (kind === 'unlock' && st !== 'done') {
        g.fillStyle = '#0f1f16'; g.fillRect(p.x + NODE - 5, p.y + NODE - 6, 5, 6);
        g.fillStyle = st === 'ready' ? '#ffd23f' : '#4fb072'; g.fillRect(p.x + NODE - 4, p.y + NODE - 3, 3, 2); g.fillRect(p.x + NODE - 3, p.y + NODE - 5, 1, 2);
      } else if (kind === 'unlock' || (kind === 'quest' && st === 'done')) {
        g.fillStyle = '#0f1f16'; g.fillRect(p.x + NODE - 6, p.y + NODE - 6, 6, 6);
        g.fillStyle = '#7ef2a8'; g.fillRect(p.x + NODE - 5, p.y + NODE - 3, 1, 1); g.fillRect(p.x + NODE - 4, p.y + NODE - 2, 1, 1); g.fillRect(p.x + NODE - 3, p.y + NODE - 3, 1, 1); g.fillRect(p.x + NODE - 2, p.y + NODE - 4, 1, 1);
      } else if (kind === 'quest') {
        g.fillStyle = '#0f1f16'; g.fillRect(p.x + NODE - 5, p.y + NODE - 6, 5, 6);
        g.fillStyle = st === 'current' ? '#ffffff' : '#7a6a2a'; g.fillRect(p.x + NODE - 4, p.y + NODE - 5, 1, 4); g.fillRect(p.x + NODE - 3, p.y + NODE - 5, 2, 2);
      }
      return p;
    };
    visible.forEach(sk => {
      const st = sk.id === 'root' ? 'root' : pkgState(sk);
      const hue = MOD_BY_ID[sk.br].hue;
      const p = drawNode(sk.id, hue, st, sk.icon, sk.kind, termSel === sk.id, termHover === sk.id);
      if (!p) return;
      /* stat nodes carry their level as pips along the foot */
      if (sk.kind === 'stat') {
        const cur = GAME.lvl(sk.id), n = Math.min(sk.max, 6);
        for (let i = 0; i < n; i++) {
          const lit = cur > Math.round(i * sk.max / n);
          g.fillStyle = lit ? '#fff8ec' : 'rgba(0,0,0,.5)';
          g.fillRect(p.x + 1 + i * 2, p.y + NODE + 3, 1, 1);
        }
        if (sk.max > 6 && cur >= sk.max) { g.fillStyle = '#ffd23f'; g.fillRect(p.x + 1, p.y + NODE + 3, 12, 1); }
      }
      termHits.push({ kind: 'node', id: sk.id, x: p.x - 1, y: p.y - 2, w: NODE + 3, h: NODE + 3 });
    });
    QUESTS.forEach(q => {
      if (!questVisible(q)) return;
      const st = questState(q);
      const p = drawNode(q.id, '#ffd23f', st, q.icon, 'quest', termSel === q.id, termHover === q.id);
      if (!p) return;
      if (st === 'current') {
        const [cur, n] = GAME.questProgress(q);
        g.fillStyle = '#0f1f16'; g.fillRect(p.x - 1, p.y + NODE + 2, NODE + 2, 3);
        g.fillStyle = '#ffd23f'; g.fillRect(p.x, p.y + NODE + 3, Math.round(NODE * cur / n), 1);
      }
      termHits.push({ kind: 'quest', id: q.id, x: p.x - 1, y: p.y - 2, w: NODE + 3, h: NODE + 3 });
    });
    /* the ages, in a row of their own: reached, next, and still to come */
    AGES.forEach((a, i) => {
      const cur = GAME.ageIndex();
      const st = i <= cur ? 'done' : i === cur + 1 ? 'current' : 'later';
      if (i) {
        const p0 = nodePos(AGES[i - 1].id), p1 = nodePos(a.id);
        seg(p0.x + NODE, p0.y + NODE / 2, p1.x - 1, p1.y + NODE / 2, i <= cur ? a.hue : '#3a3a2a', i > cur);
      }
      const p = drawNode(a.id, a.hue, st, a.icon, 'age', termSel === a.id, termHover === a.id);
      if (!p) return;
      if (st === 'current') {
        const [c2, n2] = GAME.ageProgress(a);
        g.fillStyle = '#0f1f16'; g.fillRect(p.x - 1, p.y + NODE + 2, NODE + 2, 3);
        g.fillStyle = a.hue; g.fillRect(p.x, p.y + NODE + 3, Math.round(NODE * c2 / n2), 1);
      }
      termHits.push({ kind: 'age', id: a.id, x: p.x - 1, y: p.y - 2, w: NODE + 3, h: NODE + 3 });
    });
    /* the way forward: a bouncing arrow over the current quest, and over
       the package it wants you to install */
    const bounce = Math.round(Math.abs(Math.sin(now / 260)) * 2);
    const arrow = (p, col) => {
      const ax = p.x + NODE / 2, ay = p.y - 7 - bounce;
      g.fillStyle = col;
      g.fillRect(ax - 1, ay - 3, 2, 3); g.fillRect(ax - 2, ay, 4, 1); g.fillRect(ax - 1, ay + 1, 2, 1);
    };
    const cq = GAME.currentQuest();
    if (cq && cq.id !== termSel) arrow(nodePos(cq.id), '#fff8ec');
    if (target && target.id !== termSel) arrow(nodePos(target.id), '#fff8ec');

    /* the gutter: lane names, frozen while the board pans sideways */
    g.fillStyle = MAP_BG; g.fillRect(inner.x, inner.y, GUT - 2, inner.h);
    GRID.lanes.forEach((L, i) => {
      const y0 = Math.round(oy + L.top * ROWH - 3), h = L.rows * ROWH;
      if (i % 2) { g.fillStyle = 'rgba(255,255,255,.028)'; g.fillRect(inner.x, y0, GUT - 2, h); }
      const m = MOD_BY_ID[L.id];
      const ready = (L.id === 'quests' || L.id === 'ages') ? false : SKILLS_BY_MODULE[MOD_INDEX[L.id]].some(sk => pkgState(sk) === 'ready');
      const shut = m.age && !GAME.laneOpen(m.id);
      g.fillStyle = shut ? '#2a3a34' : m.hue; g.fillRect(inner.x, y0 + 1, 2, h - 1);
      SPR.drawTiny(g, m.name, inner.x + 4, y0 + 4, shut ? '#3a5560' : m.hue, 1);
      if (shut) SPR.drawTiny(g, AGES[AGE_INDEX[m.age]].name.split(' ')[0].toUpperCase(), inner.x + 4, y0 + 11, '#3a5560', 1);
      if (ready && Math.floor(now / 340) % 2) { g.fillStyle = '#ffd23f'; g.fillRect(inner.x + 4 + SPR.tinyW(m.name, 1) + 2, y0 + 5, 2, 2); }
    });
    g.fillStyle = 'rgba(126,242,168,.18)'; g.fillRect(inner.x + GUT - 2, inner.y, 1, inner.h);
    g.restore();
    /* window status line */
    const tot = SKILLS.length - 1, inst = SKILLS.filter(sk => sk.id !== 'root' && GAME.lvl(sk.id) >= sk.max).length;
    const doneQ = QUESTS.filter(GAME.questDone).length;
    const status = inst + '/' + tot + ' IN  QUESTS ' + doneQ + '/' + QUESTS.length + '  ' + GAME.age().name.toUpperCase();
    g.fillStyle = 'rgba(8,26,20,.85)'; g.fillRect(inner.x + 1, inner.y + inner.h - 9, SPR.tinyW(status, 1) + 4, 8);
    SPR.drawTiny(g, status, inner.x + 3, inner.y + inner.h - 7, '#4fb072', 1);

    /* ---- README window ---- */
    drawWindow(g, RDW, 'README.TXT', now);
    const rx = RDW.x + 4, ry = RDW.y + 14;
    g.fillStyle = '#0b1f18'; g.fillRect(RDW.x + 1, RDW.y + 10, RDW.w - 2, RDW.h - 11);
    const wrap = (text, x, y, col) => {
      let line = '', y2 = y;
      text.toUpperCase().split(' ').forEach(w => {
        if (SPR.tinyW(line + ' ' + w, 1) > RDW.w - 10) { SPR.drawTiny(g, line, x, y2, col, 1); y2 += 7; line = w; }
        else line = line ? line + ' ' + w : w;
      });
      if (line) { SPR.drawTiny(g, line, x, y2, col, 1); y2 += 7; }
      return y2;
    };
    const sk = termSel && SKILL_BY_ID[termSel] ? SKILL_BY_ID[termSel] : null;
    const q = termSel && QUEST_BY_ID[termSel] ? QUEST_BY_ID[termSel] : null;
    if (sk) {
      const st = sk.id === 'root' ? 'root' : pkgState(sk);
      const hue = MOD_BY_ID[sk.br].hue;
      SPR.drawCube(g, rx + 1, ry + 3, 16, nodePal(st, hue), { depth: 2, bg: '#0b1f18' });
      g.drawImage(SPR.iconSprite(sk.icon, 1), rx + 4, ry + 6);
      const words = sk.name.toUpperCase().split(' ');
      words.slice(0, 2).forEach((w, i) => SPR.drawTiny(g, w, rx + 22, ry + 1 + i * 7, '#d8ffe8', 1));
      SPR.drawTiny(g, sk.kind === 'unlock' ? 'UNLOCK' : MOD_BY_ID[sk.br].code, rx + 22, ry + 15, sk.kind === 'unlock' ? '#ffd23f' : '#4fb072', 1);
      let y2 = wrap(sk.desc, rx, ry + 25, '#7ef2a8') + 4;
      const cur = GAME.lvl(sk.id);
      if (sk.id !== 'root') {
        SPR.drawTiny(g, 'LEVEL ' + cur + ' / ' + sk.max, rx, y2, '#d8ffe8', 1); y2 += 7;
        if (sk.max > 1) { SPR.drawPips(g, rx, y2, cur, Math.min(sk.max, 12), hue, '#1d3628'); y2 += 8; }
        if (st !== 'done') {
          const cost = skillCost(sk, cur);
          SPR.drawTiny(g, 'COST ' + GAME.fmt(cost) + ' FEATHERS', rx, y2, st === 'ready' ? '#ffd23f' : '#e8607a', 1); y2 += 9;
          const bw = RDW.w - 10, bh = 13, bx = rx, by = RDW.y + RDW.h - 20;
          const busy = installFx && now - installFx.t < 500;
          SPR.drawBox(g, bx, by, bw, bh, st === 'ready' ? SPR.darken('#ffc72f', 0.35) : '#1d2a22', st === 'ready' ? '#ffc72f' : null, st === 'ready' ? '#ffc72f' : '#2f6a48');
          if (busy) {
            const f = (now - installFx.t) / 500;
            g.fillStyle = '#7ef2a8'; g.fillRect(bx + 2, by + 2, Math.round((bw - 4) * f), bh - 4);
            SPR.drawTiny(g, 'INSTALLING', bx + 6, by + 4, '#03110a', 1);
          } else {
            const lab2 = st === 'ready' ? '> INSTALL' : st === 'aged' ? AGES[AGE_INDEX[MOD_BY_ID[sk.br].age]].name.toUpperCase()
                       : st === 'locked' ? 'NEEDS ' + skillPrereq(sk).name.toUpperCase().slice(0, 10) : 'NEED MORE';
            SPR.drawTiny(g, lab2, bx + Math.round(bw / 2 - SPR.tinyW(lab2, 1) / 2), by + 4, st === 'ready' ? '#fff8ec' : '#4fb072', 1);
          }
          if (st === 'ready') termHits.push({ kind: 'install', id: sk.id, x: bx, y: by, w: bw, h: bh });
        } else {
          SPR.drawTiny(g, 'INSTALLED', rx, RDW.y + RDW.h - 16, '#4fb072', 1);
        }
      } else {
        SPR.drawTiny(g, 'THE KERNEL.', rx, y2, '#d8ffe8', 1);
        SPR.drawTiny(g, 'EVERY LANE STARTS HERE.', rx, y2 + 7, '#7ef2a8', 1);
      }
    } else if (termSel && AGE_INDEX[termSel] !== undefined) {
      /* an age: what it takes to get there, ticked off */
      const a = AGES[AGE_INDEX[termSel]], ai = AGE_INDEX[termSel], cur = GAME.ageIndex();
      const st = ai <= cur ? 'done' : ai === cur + 1 ? 'current' : 'later';
      SPR.drawCube(g, rx + 1, ry + 3, 16, nodePal(st, a.hue), { depth: 2, bg: '#0b1f18' });
      g.drawImage(SPR.iconSprite(a.icon, 1), rx + 4, ry + 6);
      a.name.toUpperCase().split(' ').slice(0, 2).forEach((w, i) => SPR.drawTiny(g, w, rx + 22, ry + 1 + i * 7, '#d8ffe8', 1));
      SPR.drawTiny(g, ai <= cur ? (ai === cur ? 'NOW' : 'PAST') : 'AGE ' + (ai + 1), rx + 22, ry + 15, a.hue, 1);
      let y2 = wrap(a.blurb, rx, ry + 25, '#7ef2a8') + 4;
      const needs = GAME.ageNeeds(a);
      if (!needs.length) { SPR.drawTiny(g, 'WHERE IT ALL STARTED', rx, y2, '#4fb072', 1); y2 += 7; }
      needs.forEach(n => {
        g.fillStyle = n.ok ? '#7ef2a8' : '#1d3628'; g.fillRect(rx, y2 + 1, 4, 4);
        if (n.ok) { g.fillStyle = '#03110a'; g.fillRect(rx + 1, y2 + 2, 2, 2); }
        const txt = (n.k === 'moon' ? '' : GAME.fmt(n.have) + '/' + GAME.fmt(n.want) + ' ') + n.name.toUpperCase();
        SPR.drawTiny(g, txt.slice(0, 22), rx + 6, y2, n.ok ? '#d8ffe8' : '#4fb072', 1); y2 += 7;
      });
      const opens = MODULES.filter(m => m.age === a.id).map(m => m.name).join(', ');
      if (opens) { SPR.drawTiny(g, 'OPENS ' + opens, rx, y2 + 2, '#ffd23f', 1); y2 += 9; }
      SPR.drawTiny(g, '+' + Math.round(ECON.ageBonus * 100 * ai) + '% ON EVERY COIN', rx, RDW.y + RDW.h - 16, ai <= cur ? '#7ef2a8' : '#4fb072', 1);
    } else if (q) {
      const st = questState(q);
      SPR.drawCube(g, rx + 1, ry + 3, 16, nodePal(st, '#ffd23f'), { depth: 2, bg: '#0b1f18' });
      g.drawImage(SPR.iconSprite(q.icon, 1), rx + 4, ry + 6);
      q.name.toUpperCase().split(' ').slice(0, 2).forEach((w, i) => SPR.drawTiny(g, w, rx + 22, ry + 1 + i * 7, '#d8ffe8', 1));
      SPR.drawTiny(g, 'QUEST ' + (questIndex(q) + 1), rx + 22, ry + 15, '#ffd23f', 1);
      let y2 = wrap(q.hint, rx, ry + 25, '#7ef2a8') + 4;
      const [cur, n] = GAME.questProgress(q);
      SPR.drawTiny(g, st === 'done' ? 'DONE' : 'PROGRESS ' + cur + ' / ' + n, rx, y2, st === 'done' ? '#4fb072' : '#d8ffe8', 1); y2 += 8;
      g.fillStyle = '#1d3628'; g.fillRect(rx, y2, RDW.w - 10, 3);
      g.fillStyle = '#ffd23f'; g.fillRect(rx, y2, Math.round((RDW.w - 10) * (st === 'done' ? 1 : cur / n)), 3); y2 += 7;
      const rw = [];
      if (q.rw.c) rw.push(GAME.fmt(q.rw.c) + ' COINS');
      if (q.rw.f) rw.push(q.rw.f + ' FEATHERS');
      SPR.drawTiny(g, 'REWARD ' + rw.join(' + '), rx, y2, '#ffd23f', 1);
      if (st === 'later') SPR.drawTiny(g, 'AFTER THE ONE BEFORE', rx, RDW.y + RDW.h - 16, '#4fb072', 1);
      if (st === 'current') SPR.drawTiny(g, 'PAYS OUT BY ITSELF', rx, RDW.y + RDW.h - 16, '#4fb072', 1);
    } else {
      const cq2 = GAME.currentQuest();
      SPR.drawTiny(g, 'TAP A CUBE', rx, ry, '#d8ffe8', 1);
      let y2 = ry + 12;
      if (cq2) {
        SPR.drawTiny(g, 'NEXT STEP', rx, y2, '#ffd23f', 1); y2 += 8;
        y2 = wrap(cq2.name, rx, y2, '#fff8ec');
        const [cur, n] = GAME.questProgress(cq2);
        SPR.drawTiny(g, cur + ' / ' + n, rx, y2, '#d8ffe8', 1);
      } else SPR.drawTiny(g, 'EVERY QUEST DONE', rx, y2, '#ffd23f', 1);
    }

    /* ---- taskbar ---- */
    const tb = { x: SCR.x, y: SCR.y + SCR.h - 14, w: SCR.w, h: 14 };
    g.fillStyle = '#1d3628'; g.fillRect(tb.x, tb.y, tb.w, tb.h);
    g.fillStyle = '#2f6a48'; g.fillRect(tb.x, tb.y, tb.w, 1);
    SPR.drawBox(g, tb.x + 3, tb.y + 2, 34, 10, '#2a4a3a', '#4fb072', '#0f1f16');
    g.drawImage(SPR.iconSprite('egg', 1), tb.x + 5, tb.y + 2);
    SPR.drawTiny(g, 'EGGOS', tb.x + 16, tb.y + 4, '#d8ffe8', 1);
    termHits.push({ kind: 'home', x: tb.x + 3, y: tb.y + 2, w: 34, h: 10 });
    /* lane chips: click to pan there */
    MODULES.forEach((m, i) => {
      const cx = tb.x + 42 + i * 14;
      const has = m.id === 'quests' || m.id === 'ages' || GAME.laneOpen(m.id);
      const ready = (m.id === 'quests' || m.id === 'ages') ? false : SKILLS_BY_MODULE[i].some(sk => pkgState(sk) === 'ready');
      SPR.drawBox(g, cx, tb.y + 2, 12, 10, has ? SPR.darken(m.hue, 0.5) : '#142a20', has ? m.hue : null, '#0f1f16');
      g.globalAlpha = has ? 1 : 0.4;
      g.drawImage(SPR.iconSprite(m.icon, 1), cx + 1, tb.y + 2);
      g.globalAlpha = 1;
      g.fillStyle = has ? m.hue : '#24382c';
      g.fillRect(cx + 1, tb.y + 10, 10, 1);
      if (ready && Math.floor(now / 340) % 2) { g.fillStyle = '#ffd23f'; g.fillRect(cx + 9, tb.y + 2, 3, 3); }
      termHits.push({ kind: 'mod', i, x: cx, y: tb.y + 2, w: 12, h: 10 });
    });
    const fx = 'FEATHERS ' + GAME.fmt(S().feathers);
    SPR.drawTiny(g, fx, tb.x + tb.w - 4 - SPR.tinyW(fx, 1), tb.y + 4, '#ffd23f', 1);
  }

  function drawWindow(g, r, title, now) {
    g.fillStyle = '#0f1f16'; g.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
    g.fillStyle = '#2a4a3a'; g.fillRect(r.x, r.y, r.w, 9);
    g.fillStyle = '#4fb072'; g.fillRect(r.x, r.y, r.w, 1);
    SPR.drawTiny(g, title, r.x + 3, r.y + 2, '#d8ffe8', 1);
    /* buttons */
    g.fillStyle = '#7ef2a8'; g.fillRect(r.x + r.w - 15, r.y + 2, 5, 5);
    g.fillStyle = '#e8607a'; g.fillRect(r.x + r.w - 8, r.y + 2, 5, 5);
    g.fillStyle = '#0f1f16'; g.fillRect(r.x + r.w - 14, r.y + 5, 3, 1); g.fillRect(r.x + r.w - 7, r.y + 3, 1, 1); g.fillRect(r.x + r.w - 5, r.y + 3, 1, 1); g.fillRect(r.x + r.w - 6, r.y + 4, 1, 1); g.fillRect(r.x + r.w - 7, r.y + 5, 1, 1); g.fillRect(r.x + r.w - 5, r.y + 5, 1, 1);
    termHits.push({ kind: 'close', x: r.x + r.w - 9, y: r.y + 1, w: 8, h: 8 });
  }

  function termHitAt(cx, cy) {
    for (let i = termHits.length - 1; i >= 0; i--) {
      const h = termHits[i];
      if (cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h) return h;
    }
    return null;
  }
  function termCoords(ev) {
    const r = termCv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * VW, y: (ev.clientY - r.top) / r.height * VH };
  }
  function installPkg(id) {
    const sk = SKILL_BY_ID[id];
    if (!sk) return;
    if (GAME.buySkill(id)) {
      snd.skill();
      termSel = id;
      installFx = { t: performance.now(), id };
      const tool = Object.keys(TOOL_UNLOCK).find(t => TOOL_UNLOCK[t] === id);
      toast({ icon: sk.icon, title: sk.name.toUpperCase() + ' INSTALLED', body: tool ? 'A new tool is on the rack: ' + TOOL_LABEL[tool] : sk.desc });
      renderSkillCard();
      renderToolbelt();
      renderPalette();
      GAME.mark('build');
    } else snd.error();
  }

  let skillCardFeathers = -1;
  function renderSkillCard() {
    const card = $('#skill-card');
    card.innerHTML = '';
    skillCardFeathers = S().feathers;
    const sk = termSel && SKILL_BY_ID[termSel] ? SKILL_BY_ID[termSel] : null;
    const q = termSel && QUEST_BY_ID[termSel] ? QUEST_BY_ID[termSel] : null;
    const ag = termSel && AGE_INDEX[termSel] !== undefined ? AGES[AGE_INDEX[termSel]] : null;
    if (ag) {
      const ai = AGE_INDEX[ag.id], cur = GAME.ageIndex();
      card.appendChild(mkIcon(ag.icon, 4));
      const mid = document.createElement('div');
      mid.className = 'skc-mid';
      const b = document.createElement('b');
      b.textContent = ag.name;
      const small = document.createElement('small');
      small.textContent = ai <= cur ? (ai === cur ? '  THE AGE WE ARE IN' : '  BEHIND US') : '  AGE ' + (ai + 1) + ' OF ' + AGES.length;
      b.appendChild(small);
      mid.appendChild(b);
      const desc = document.createElement('span');
      const needs = GAME.ageNeeds(ag);
      desc.textContent = ag.blurb + (needs.length ? ' Needs ' + needs.map(n => (n.k === 'moon' ? '' : GAME.fmt(n.want) + ' ') + n.name).join(', ') + '.' : '');
      mid.appendChild(desc);
      card.appendChild(mid);
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.disabled = true;
      const [c2, n2] = GAME.ageProgress(ag);
      btn.textContent = ai <= cur ? 'REACHED' : c2 + '/' + n2 + ' DONE';
      card.appendChild(btn);
      return;
    }
    if (q) {
      const st = questState(q);
      card.appendChild(mkIcon(q.icon, 4));
      const mid = document.createElement('div');
      mid.className = 'skc-mid';
      const b = document.createElement('b');
      b.textContent = q.name;
      const small = document.createElement('small');
      const [cur, n] = GAME.questProgress(q);
      small.textContent = '  QUEST ' + (questIndex(q) + 1) + ' OF ' + QUESTS.length + (st === 'done' ? '  DONE' : '  ' + cur + '/' + n);
      b.appendChild(small);
      mid.appendChild(b);
      const desc = document.createElement('span');
      desc.textContent = q.hint + '. Reward: ' + [q.rw.c ? q.rw.c + ' coins' : '', q.rw.f ? q.rw.f + ' feathers' : ''].filter(Boolean).join(' and ') + '.';
      mid.appendChild(desc);
      card.appendChild(mid);
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.disabled = true;
      btn.textContent = st === 'done' ? 'PAID OUT' : st === 'current' ? 'IN PROGRESS' : 'LATER';
      card.appendChild(btn);
      return;
    }
    if (!sk) {
      const hint = document.createElement('span');
      hint.className = 'sk-hint';
      const cq = GAME.currentQuest();
      hint.textContent = cq ? cq.hint : 'tap a cube.';
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
    small.textContent = ' ' + cur + '/' + sk.max + '  ' + MOD_BY_ID[sk.br].code + (sk.kind === 'unlock' ? '  UNLOCK' : '');
    b.appendChild(small);
    mid.appendChild(b);
    const desc = document.createElement('span');
    desc.textContent = sk.desc;
    mid.appendChild(desc);
    card.appendChild(mid);
    const btn = document.createElement('button');
    btn.className = 'btn';
    if (sk.id === 'root') { btn.disabled = true; btn.textContent = 'KERNEL'; }
    else if (maxed) { btn.disabled = true; btn.textContent = 'INSTALLED'; }
    else if (pkgDark(pkgState(sk))) {
      btn.disabled = true;
      btn.appendChild(mkIcon('lock', 2));
      const st2 = pkgState(sk);
      btn.appendChild(document.createTextNode(st2 === 'aged' ? AGES[AGE_INDEX[MOD_BY_ID[sk.br].age]].name.toUpperCase() : 'NEEDS ' + skillPrereq(sk).name.toUpperCase()));
    } else {
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
        termMouse = { x: p.x, y: p.y, inside: true };
        if (mapDrag) {
          mapPan = { x: mapDrag.px + (p.x - mapDrag.x), y: mapDrag.py + (p.y - mapDrag.y) };
          clampPan();
          return;
        }
        const h = termHitAt(p.x, p.y);
        termHover = h && (h.kind === 'node' || h.kind === 'quest' || h.kind === 'age') ? h.id : null;
      });
      termCv.addEventListener('pointerleave', () => { termMouse.inside = false; termHover = null; mapDrag = null; });
      termCv.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        termCv.setPointerCapture(ev.pointerId);
        const p = termCoords(ev);
        termMouse = { x: p.x, y: p.y, inside: true };
        const h = termHitAt(p.x, p.y);
        if (!h) return;
        if (h.kind === 'node' || h.kind === 'quest' || h.kind === 'age') { termSel = h.id; snd.plop(); renderSkillCard(); mapDrag = null; return; }
        if (h.kind === 'install') { installPkg(h.id); return; }
        if (h.kind === 'mod') {
          const m = MODULES[h.i];
          const first = m.id === 'quests' ? (GAME.currentQuest() || QUESTS[0]) : m.id === 'ages' ? (GAME.nextAge() || GAME.age()) : SKILLS_BY_MODULE[h.i][0];
          if (first) { centerOn(first.id); snd.plop(); }
          return;
        }
        if (h.kind === 'home') { mapPan = { x: 0, y: 0 }; snd.plop(); return; }
        if (h.kind === 'close') { closeModals(); snd.plop(); return; }
        if (h.kind === 'map') { mapDrag = { x: p.x, y: p.y, px: mapPan.x, py: mapPan.y }; }
      });
      termCv.addEventListener('pointerup', () => { mapDrag = null; });
      termCv.addEventListener('wheel', ev => {
        ev.preventDefault();
        if (ev.shiftKey || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) mapPan.x -= (ev.shiftKey ? ev.deltaY : ev.deltaX) > 0 ? 14 : -14;
        else mapPan.y -= ev.deltaY > 0 ? 14 : -14;
        clampPan();
      }, { passive: false });
    }
    /* opening the Lab starts at the top-left of the board, where the quests
       and the kernel are; a selection off that first screen is panned to.
       A refresh while the Lab is already open leaves the board where it is. */
    if ($('#modal-skills').hidden) {
      labOpenedAt = performance.now();
      mapPan = { x: 0, y: 0 };
      if (termSel) {
        const p = nodePos(termSel), inner = mapInner();
        if (p.x + NODE > inner.x + inner.w || p.y + NODE > inner.y + inner.h) centerOn(termSel);
      }
    }
    $('#research-sub').textContent = GAME.fmt(S().feathers) + ' FEATHERS';
    renderSkillCard();
    GAME.dirty.skills = false;
  }

  /* ================= THE TRIP - a picture-in-picture of the road =================
     While the load is out, a little window shows the drive: hills
     scrolling by, the destination skyline rising, the sale, and the
     ride home.
     =========================================================== */
  const tripCv = $('#trip-canvas');
  const tripCtx = tripCv ? tripCv.getContext('2d') : null;
  const TRW = 160, TRH = 56;
  let tripSoldFx = 0;
  function drawTrip(now) {
    const view = $('#trip-view');
    const ph = GAME.tripPhase();
    if (!ph || !tripCtx) { if (view && !view.hidden) view.hidden = true; return; }
    if (view.hidden) view.hidden = false;
    const g = tripCtx;
    g.imageSmoothingEnabled = false;
    g.setTransform(3, 0, 0, 3, 0, 0);
    const f = ph.f, out = f < 0.5;
    const c2 = ph.city;
    /* sky */
    const skyCols = ['#8fc8e8', '#a6d6f0', '#c2e4f5'];
    skyCols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 12, TRW, 12); });
    g.fillStyle = '#e8f4fa'; g.fillRect(0, 36, TRW, 10);
    g.fillStyle = '#ffe9a0'; g.fillRect(126, 5, 7, 7); g.fillRect(125, 7, 9, 3);
    /* clouds */
    for (let i = 0; i < 3; i++) {
      const cx = ((now / (60 + i * 20) + i * 60) % (TRW + 40)) - 20;
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(Math.round(TRW - cx), 6 + i * 7, 14 + i * 4, 3); g.fillRect(Math.round(TRW - cx) + 4, 4 + i * 7, 8, 2);
    }
    /* far hills scroll slowly, near ones faster */
    const scroll = now / 18;
    for (let x = 0; x < TRW; x++) {
      const h1 = 14 + Math.sin((x + scroll * 0.4) / 22) * 4 + Math.sin((x + scroll * 0.4) / 7) * 1.5;
      g.fillStyle = '#7fb85f'; g.fillRect(x, Math.round(TRH - 12 - h1), 1, Math.round(h1));
      const h2 = 8 + Math.sin((x + scroll) / 15 + 2) * 3;
      g.fillStyle = '#5aa845'; g.fillRect(x, Math.round(TRH - 12 - h2), 1, Math.round(h2));
    }
    /* the destination rises during the drive out; home rises on the way back */
    const sky = SPR.skylineSprite(c2.sky, 120, 46, 1);
    if (out) {
      const sx = Math.round(TRW + 20 - (f / 0.5) * (TRW * 0.55 + 20));
      g.drawImage(sky, sx, TRH - 12 - 46);
    } else {
      const sx = Math.round(-80 - ((f - 0.5) / 0.5) * 120);
      g.drawImage(sky, sx, TRH - 12 - 46);
      /* home: mama's nest and the lab, growing from the right */
      const hx = Math.round(TRW + 20 - ((f - 0.5) / 0.5) * (TRW * 0.55 + 20));
      g.drawImage(SPR.mamaSprite(S().mamaTier, 1, 'idle'), hx + 30, TRH - 12 - 16);
      g.fillStyle = '#c9a35f'; g.fillRect(hx, TRH - 26, 22, 14); g.fillStyle = '#5fa8e8'; g.fillRect(hx - 2, TRH - 30, 26, 5);
      g.fillStyle = '#3a2a16'; g.fillRect(hx + 8, TRH - 20, 6, 8);
      SPR.drawTiny(g, 'LAB', hx + 4, TRH - 24, '#ffd23f', 1);
    }
    /* road */
    g.fillStyle = '#b58a4f'; g.fillRect(0, TRH - 12, TRW, 12);
    g.fillStyle = '#8a5e2a'; g.fillRect(0, TRH - 12, TRW, 1);
    g.fillStyle = 'rgba(255,240,200,.5)';
    for (let x = -((now / 8) % 22); x < TRW; x += 22) g.fillRect(Math.round(x), TRH - 6, 10, 1);
    /* the vehicle, bobbing */
    const v = ph.vehicle;
    const spr = SPR.vehicleSprite(v.id, Math.floor(now / 90) % 2, 1);
    const vx = 20, vy = TRH - 2 - spr.height + Math.round(Math.sin(now / 60) * 1);
    g.drawImage(spr, vx, vy);
    if (Math.floor(now / 120) % 2) { g.fillStyle = 'rgba(200,190,175,.6)'; g.fillRect(vx - 4, vy + spr.height - 6, 3, 2); }
    /* banner */
    let text, col;
    if (out) { text = 'TO ' + c2.name.toUpperCase(); col = '#3a2a16'; }
    else if (f < 0.62) { text = 'SOLD ' + ph.n + ' EGGS  +' + GAME.fmt(ph.pay); col = '#1f7a2a'; }
    else { text = 'HEADING HOME'; col = '#3a2a16'; }
    const tw = SPR.textW(text, 1);
    g.fillStyle = 'rgba(255,249,236,.9)'; g.fillRect(Math.round(TRW / 2 - tw / 2) - 4, 2, tw + 8, 10);
    g.fillStyle = '#3a2a16'; g.fillRect(Math.round(TRW / 2 - tw / 2) - 4, 11, tw + 8, 1);
    SPR.drawText(g, text, Math.round(TRW / 2 - tw / 2), 4, col, 1);
    /* coins pop at the sale */
    if (!out && f < 0.62) {
      for (let i = 0; i < 6; i++) {
        const t = ((f - 0.5) / 0.12 + i * 0.13) % 1;
        g.fillStyle = '#ffd23f'; g.fillRect(Math.round(vx + 10 + i * 6), Math.round(vy - 4 - t * 16), 2, 2);
      }
    }
    /* progress bar along the bottom */
    g.fillStyle = '#3a2a16'; g.fillRect(0, TRH - 1, TRW, 1);
    g.fillStyle = '#ffd23f'; g.fillRect(0, TRH - 1, Math.round(TRW * f), 1);
    g.setTransform(1, 0, 0, 1, 0, 0);
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
      ipanel.appendChild(ipRow('orders filled', () => S().stats.orders + (S().stats.ordersMissed ? ' (' + S().stats.ordersMissed + ' missed)' : '')));
      ipanel.appendChild(ipRow('honey jars', () => String(S().stats.honey)));
      ipanel.appendChild(ipRow('retired', () => GAME.fmt(S().stats.culled)));
      if (st.unpaid) {
        const w = document.createElement('p');
        w.className = 'ip-note';
        w.textContent = 'Payroll is empty - your staff have downed tools!';
        ipanel.appendChild(w);
      }
      return;
    }

    if (kind === 'warden') {
      const w = GAME.warden();
      if (!w) { setInspect({ kind: 'farm' }); return; }
      ipanel.appendChild(ipHead(cloneCanvas(SPR.wardenSprite('stand', 1), 2), 'THE WARDEN', 'speaks for the trees'));
      const p = document.createElement('p');
      p.className = 'ip-note';
      p.textContent = 'He lives under the stumps and comes up whenever one of his trees does. Tap him once and he takes a bribe in feathers and says no more about it.';
      ipanel.appendChild(p);
      ipanel.appendChild(ipRow('leaving in', () => GAME.warden() ? GAME.fmtTime(Math.max(0, GAME.warden().T - GAME.warden().t)) : '-'));
      ipanel.appendChild(ipRow('bribed', () => GAME.warden() && GAME.warden().paid ? 'yes' : 'not yet'));
      return;
    }
    if (kind === 'chicken') {
      const ch = inspect.ref;
      if (st.chickens.indexOf(ch) === -1) { setInspect({ kind: 'farm' }); return; }
      const sp = SPECIES[ch.sp];
      ipanel.appendChild(ipHead(chickEl(sp, 2, false), sp.name, TIERS[sp.tier].n + (GAME.isChick(ch) ? ' chick' : '')));
      if (GAME.isChick(ch)) {
        ipanel.appendChild(ipRow('grown up', () => Math.round((ch.age || 0) * 100) + '%'));
        ipanel.appendChild(ipRow('still needs', () => {
          const short = Math.ceil((1 - (ch.fed || 0)) * GAME.growPellets());
          const wait = Math.max(0, GAME.growTime() - (ch.raised || 0));
          if (short > 0 && wait > 0) return short + ' feeds, ' + GAME.fmtTime(wait);
          if (short > 0) return short + ' more feeds';
          if (wait > 0) return GAME.fmtTime(wait) + ' to grow';
          return 'ready';
        }));
      }
      ipanel.appendChild(ipRow('belly', () => ch.food <= 0 ? 'EMPTY - lays slow' : Math.round(ch.food * 100) + '% full'));
      ipanel.appendChild(ipRow('lays every', GAME.fmtTime(GAME.chLayTime(ch) / (ch.buffT > 0 ? 2 : 1))));
      ipanel.appendChild(ipRow('egg value', GAME.fmt(GAME.eggValue(sp.tier, false))));
      ipanel.appendChild(ipRow('worth / min', () => GAME.fmt(Math.round(GAME.chScore(ch)))));
      ipanel.appendChild(ipRow('rank', () => { const r2 = GAME.rankOf(ch); return RANKS[r2].n + (r2 ? ' ' + '*'.repeat(r2) : ''); }));
      ipanel.appendChild(ipRow('eggs laid', () => { const nx = GAME.nextRankEggs(ch); return (ch.laid || 0) + (nx ? ' / ' + nx + ' for a star' : ' - top rank'); }));
      /* the five genes, as little pip rows */
      const gbox = document.createElement('div');
      gbox.className = 'gene-rows';
      GENE_KEYS.forEach(k => {
        const g = GENES[k], v = GAME.gene(ch, k);
        const row = document.createElement('div');
        row.className = 'gene-row';
        row.title = g.name + ' - ' + g.desc;
        row.appendChild(mkIcon(g.icon, 2));
        for (let i = 0; i < ECON.geneMax; i++) { const pip = document.createElement('i'); if (i < v) { pip.className = 'on'; pip.style.background = g.col; } row.appendChild(pip); }
        gbox.appendChild(row);
      });
      ipanel.appendChild(gbox);
      if (ch.mods && ch.mods.length) ipanel.appendChild(ipRow('crossed with', ch.mods.map(m => (ANIMALS.find(a => a.mark === m) || { name: m }).name.toLowerCase()).join(', ')));
      ipanel.appendChild(ipRow('next egg in', () => GAME.fmtTime(Math.max(0, ch.lay))));
      ipanel.appendChild(ipRow('well fed', () => ch.buffT > 0 ? GAME.fmtTime(ch.buffT) : 'no'));
      ipanel.appendChild(ipRow('petting', () => ch.petCd > 0 ? GAME.fmtTime(ch.petCd) : 'ready'));
      ipanel.appendChild(ipRow('status', () => ch.marked ? 'MARKED' : 'keeping'));
      const note = document.createElement('p');
      note.className = 'ip-note';
      note.textContent = sp.quip;
      ipanel.appendChild(note);
      const cbtns = [
        { label: () => ch.marked ? 'UNMARK' : 'MARK CULL', data: { act: 'mark-chicken' }, cls: () => ch.marked ? '' : 'btn-green' },
        { label: 'RETIRE NOW', data: { act: 'retire-chicken' } },
      ];
      if (GAME.hasGeneLab()) cbtns.push({ label: 'GENE LAB', data: { act: 'open-genes', id: String(ch.id) }, cls: 'btn-green' });
      ipanel.appendChild(ipBtns(cbtns));
      return;
    }

    if (kind === 'order') {
      const o = inspect.ref;
      if (st.orders.indexOf(o) === -1 || o.state !== 'wait') { setInspect(null); return; }
      ipanel.appendChild(ipHead(cloneCanvas(SPR.carSprite(o.kind, o.col, 0, 1), 2), o.who, 'waiting in the lay-by'));
      ipanel.appendChild(ipRow('wants', o.n + ' eggs, ' + TIERS[o.tier].n + ' or better'));
      ipanel.appendChild(ipRow('handed over', () => o.got + ' / ' + o.n));
      ipanel.appendChild(ipRow('pays', GAME.fmt(o.pay) + ' + ' + ECON.orderTip + ' feathers'));
      ipanel.appendChild(ipRow('leaves in', () => GAME.fmtTime(Math.max(0, o.t))));
      const note = document.createElement('p');
      note.className = 'ip-note';
      note.textContent = 'Sweep eggs into the BASKET and let go over the car, or carry one egg over with the HAND.';
      ipanel.appendChild(note);
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

    if (kind === 'applicant') {
      const a = inspect.ref;
      if (st.applicants.indexOf(a) === -1) { setInspect(null); return; }
      ipanel.appendChild(ipHead(cloneCanvas(SPR.personSprite(a.look, 0, 2)), a.name, 'looking for work'));
      STAT_KEYS.forEach(k => ipanel.appendChild(ipRow(STATS[k].name.toLowerCase(), String(GAME.crewStat(a, k)))));
      ipanel.appendChild(ipRow('asks', (a.wage * Math.pow(0.88, GAME.lvl('wages'))).toFixed(2) + '/s'));
      ipanel.appendChild(ipRow('to sign', GAME.fmt(a.sign)));
      ipanel.appendChild(ipRow('waits', () => GAME.fmtTime(Math.max(0, a.t))));
      if ((a.traits || []).length) ipanel.appendChild(ipRow('quirks', a.traits.map(t => TRAIT_BY_ID[t] ? TRAIT_BY_ID[t].name : t).join(', ')));
      const note = document.createElement('p');
      note.className = 'ip-note';
      note.textContent = 'Pick a role to hire them on the spot. Roles lean on different stats.';
      ipanel.appendChild(note);
      const room = GAME.canHire() && st.coins >= a.sign;
      const btns = ROLE_KEYS.filter(r => !ROLES[r].botOnly && GAME.roleOpen(r)).map(r => ({
        label: ROLES[r].name.toUpperCase(), data: { act: 'hire-applicant', id: String(a.id), role: r },
        green: room, disabled: !room,
      }));
      ipanel.appendChild(ipBtns(btns));
      return;
    }

    if (kind === 'soil') {
      const t = st.soil[inspect.ref];
      if (!t) { setInspect({ kind: 'farm' }); return; }
      const [c, r] = inspect.ref.split(',').map(Number);
      const d = t.crop ? CROPS[t.crop] : null;
      ipanel.appendChild(ipHead(cloneCanvas(t.crop ? SPR.cropSprite(t.crop, GAME.cropStage(t), t.seed, 2) : SPR.soilSprite(t.seed, t.water > 0, 2)),
        d ? d.name.toUpperCase() : 'TILLED SOIL', 'tile ' + inspect.ref));
      if (d) {
        ipanel.appendChild(ipRow('growth', () => Math.round(Math.min(1, st.soil[inspect.ref].growth) * 100) + '%'));
        ipanel.appendChild(ipRow('ripe in', () => {
          const tt = st.soil[inspect.ref];
          if (!tt || !tt.crop) return '-';
          if (tt.growth >= 1) return 'now';
          if (tt.water <= 0 && !GAME.wateredBy(c, r)) return 'DRY - not growing';
          return GAME.fmtTime(GAME.cropTimeLeft(tt, c, r)) + ' if watered';
        }));
        if (GAME.beeBoost(c, r) > 1) ipanel.appendChild(ipRow('bees', '+' + Math.round(ECON.beehiveBoost * 100) + '% growth'));
        ipanel.appendChild(ipRow('feed', GAME.harvestYield(t.crop) + ' pellets'));
      }
      ipanel.appendChild(ipRow('watered', () => {
        const tt = st.soil[inspect.ref];
        const by = GAME.wateredBy(c, r);
        return by ? 'by a ' + by : tt && tt.water > 0 ? GAME.fmtTime(tt.water * ECON.waterLast) + ' left' : 'DRY';
      }));
      const note = document.createElement('p');
      note.className = 'ip-note';
      note.textContent = d ? d.desc + (t.water <= 0 && t.growth < 1 && !GAME.wateredBy(c, r) ? ' It is dry: water it or it sits still.' : '') : 'Bare soil. Plant something with a seed packet from the farm tool.';
      ipanel.appendChild(note);
      const btns = [];
      if (d) btns.push({ label: GAME.lvl('sickle') ? 'HARVEST' : 'NEEDS SICKLE', data: { act: 'harvest-here', k: inspect.ref }, green: GAME.ripe(t), disabled: !GAME.ripe(t) || !GAME.lvl('sickle') });
      else btns.push({ label: 'CLEAR', data: { act: 'untill-here', k: inspect.ref } });
      ipanel.appendChild(ipBtns(btns));
      return;
    }

    if (kind === 'mama') {
      ipanel.appendChild(ipHead(cloneCanvas(SPR.mamaSprite(st.mamaTier, 1, 'idle')), 'MAMA HEN', TIERS[st.mamaTier].n + ' layer'));
      ipanel.appendChild(ipRow('belly', Math.round(GAME.mamaBelly() * 100) + '%'));
      ipanel.appendChild(ipRow('lays every', GAME.mamaHungry() ? 'HUNGRY' : GAME.fmtTime(GAME.mamaLayTime())));
      ipanel.appendChild(ipRow('egg value', GAME.fmt(GAME.eggValue(st.mamaTier, false))));
      ipanel.appendChild(ipRow('pet cooldown', GAME.fmtTime(GAME.petCd(true))));
      ipanel.appendChild(ipRow('mutation', Math.round(GAME.mutationChance() * 100) + '%'));
      const maxed = st.mamaTier >= TIER_DIVINE;
      ipanel.appendChild(ipBtns([{
        label: () => S().mamaTier >= TIER_DIVINE ? 'MAX TIER' : 'UPGRADE ' + GAME.fmt(GAME.mamaCost()),
        data: { act: 'upgrade-mama' },
        disabled: () => S().mamaTier >= TIER_DIVINE || S().coins < GAME.mamaCost(),
        cls: () => S().mamaTier < TIER_DIVINE && S().coins >= GAME.mamaCost() ? 'btn-green' : '',
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

    if (kind === 'build' && inspect.ref.type === 'site') {
      const o = inspect.ref;
      const site = st.sites[o.k];
      if (!site) { setInspect({ kind: 'farm' }); return; }
      const b = BUILDS[site.type];
      ipanel.appendChild(ipHead(buildingThumb(site.type), b.name.toUpperCase(), 'under construction'));
      ipanel.appendChild(ipRow('progress', () => { const s2 = S().sites[o.k]; return s2 ? Math.round(Math.min(1, s2.t / s2.T) * 100) + '%' : 'done'; }));
      ipanel.appendChild(ipRow('movers', () => { const s2 = S().sites[o.k]; return !s2 ? 'gone' : s2.stage === 'work' ? 'on site' : GAME.movers.van ? 'on their way' : 'called'; }));
      const note = document.createElement('p');
      note.className = 'ip-note';
      note.textContent = 'The moving van pulls up on the road and two movers walk over to put it up. Cancel and the coins come back.';
      ipanel.appendChild(note);
      ipanel.appendChild(ipBtns([{ label: 'CANCEL', data: { act: 'demolish-here', k: o.k } }]));
      return;
    }

    if (kind === 'build') {
      const o = inspect.ref;    /* {type, k} */
      const b = BUILDS[o.type];
      const [c, r] = o.k.split(',').map(Number);
      ipanel.appendChild(ipHead(buildingThumb(o.type), b.name.toUpperCase(), (st.storeys[o.k] ? 'two floors, ' : '') + 'tile ' + c + ',' + r));
      const btns = [];
      if (o.type === 'beehive') {
        const bh = st.beehives[o.k];
        if (!bh) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('next jar', () => { const b2 = S().beehives[o.k]; return b2 ? GAME.fmtTime(Math.max(0, (ECON.honeyEvery - b2.t) / GAME.storeyMult(o.k))) : '-'; }));
        ipanel.appendChild(ipRow('a jar sells for', GAME.fmt(ECON.honeyValue)));
        ipanel.appendChild(ipRow('pollinating', () => Object.keys(S().soil).filter(k => { const t = S().soil[k]; const [cc, rr] = k.split(',').map(Number); return t.crop && GAME.beeBoost(cc, rr) > 1; }).length + ' crops'));
        ipanel.appendChild(ipRow('honey so far', () => String(S().stats.honey)));
      } else if (o.type === 'genelab') {
        ipanel.appendChild(ipRow('edits made', () => String(S().stats.edits)));
        const best = GAME.bestChickens(1)[0];
        ipanel.appendChild(ipRow('best hen', best ? SPECIES[best.sp].name : 'none yet'));
        btns.push({ label: 'OPEN GENE LAB', data: { act: 'open-genes' }, cls: 'btn-green' });
      } else if (o.type === 'incubator') {
        const inc = st.incs[o.k];
        if (!inc) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('queue', () => inc.queue.length + ' / ' + GAME.incCapAt(o.k)));
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
      } else if (o.type === 'polisher') {
        const po = st.polishers[o.k];
        if (!po) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('buffed', () => GAME.fmt(st.polishers[o.k] ? st.polishers[o.k].n : 0)));
        ipanel.appendChild(ipRow('worth', 'x' + ECON.polishMult.toFixed(2)));
      } else if (o.type === 'grader') {
        const g = st.graders[o.k];
        if (!g) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('graded', () => GAME.fmt(st.graders[o.k] ? st.graders[o.k].n : 0)));
        ipanel.appendChild(ipRow('bumped up', () => GAME.fmt(st.graders[o.k] ? st.graders[o.k].up : 0)));
        ipanel.appendChild(ipRow('odds', Math.round(ECON.gradeChance * 100) + '%'));
      } else if (o.type === 'dynamo') {
        ipanel.appendChild(ipRow('driving', () => GAME.dynamoLoad(c, r) + ' machines'));
        ipanel.appendChild(ipRow('reach', ECON.dynamoR + ' px'));
        ipanel.appendChild(ipRow('speed', '+' + Math.round(ECON.dynamoBoost * 100) + '%'));
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
      } else if (o.type === 'cannery') {
        const cn = st.canneries[o.k];
        if (!cn) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('making', () => { const G = GOODS[cn.recipe] || GOODS.flour; return G.name + (cn.cook ? ' ' + Math.round(Math.min(1, cn.cook.t / cn.cook.T) * 100) + '%' : GAME.canMake(cn.recipe) ? ' - starting' : ' - short of produce'); }));
        ipanel.appendChild(ipRow('needs', () => { const G = GOODS[cn.recipe] || GOODS.flour; return Object.keys(G.need).map(k => G.need[k] + ' ' + PRODUCE[k].name.toLowerCase()).join(', '); }));
        ipanel.appendChild(ipRow('made here', () => String(cn.made || 0)));
        btns.push({ label: 'THE PANTRY', data: { act: 'open-food' } });
        btns.push({ label: 'CHANGE RECIPE', data: { act: 'open-food', tab: 'cannery' } });
      } else if (o.type === 'hr') {
        ipanel.appendChild(ipRow('on the payroll', () => S().staff.length + ' / ' + GAME.staffSlots()));
        ipanel.appendChild(ipRow('trained', () => String(S().stats.trained)));
        btns.push({ label: 'SECURITY ROOM', data: { act: 'open-hr' }, cls: 'btn-green' });
      } else if (o.type === 'kitchen') {
        const kt = st.kitchens[o.k];
        if (!kt) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('larder', () => kt.pantry.length + ' / ' + ECON.kitchenPantry + ' eggs'));
        ipanel.appendChild(ipRow('cooking', () => kt.cook ? RECIPE_BY_ID[kt.cook.recipe].name + ' ' + Math.round(Math.min(1, kt.cook.t / kt.cook.T) * 100) + '%' : 'nothing'));
        ipanel.appendChild(ipRow('on the counter', () => kt.counter.length + ' / ' + ECON.kitchenCounter + (kt.counter.length ? ' worth ' + GAME.fmt(kt.counter.reduce((a, d) => a + d.value, 0)) : '')));
        ipanel.appendChild(ipRow('sold', () => String(kt.sold)));
        ipanel.appendChild(ipRow('recipe', () => { const r2 = RECIPE_BY_ID[kt.recipe] || RECIPES[0]; return r2.name + ': ' + r2.eggs + ' egg' + (r2.eggs > 1 ? 's' : '') + (r2.feed ? ' + ' + r2.feed + ' feed' : '') + ', x' + r2.mult; }));
        RECIPES.filter(r2 => !r2.hen).forEach(r2 => {
          btns.push({ label: () => r2.name.toUpperCase() + (GAME.recipeOpen(r2.id) ? '' : ' (LAB)'), data: { act: 'set-recipe', k: o.k, id: r2.id },
                      disabled: () => !GAME.recipeOpen(r2.id) || kt.recipe === r2.id, cls: () => kt.recipe === r2.id ? 'btn-green' : '' });
        });
      } else if (o.type === 'park') {
        const p = st.parks[o.k];
        if (!p) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('exhibits', () => p.slots.filter(Boolean).length + ' / ' + GAME.parkSlots(o.k)));
        ipanel.appendChild(ipRow('appeal', () => GAME.parkAppeal(o.k).toFixed(1)));
        ipanel.appendChild(ipRow('a ticket', () => GAME.fmt(GAME.ticketPrice(o.k))));
        ipanel.appendChild(ipRow('next bus', () => GAME.parkAppeal(o.k) > 0 ? GAME.fmtTime(Math.max(0, GAME.busEvery() - (p.t || 0))) : 'no show, no bus'));
        ipanel.appendChild(ipRow('visitors', () => String(p.visitors || 0)));
        p.slots.forEach((ch, i) => { if (ch) btns.push({ label: 'LET OUT ' + SPECIES[ch.sp].name.toUpperCase().slice(0, 10), data: { act: 'park-eject', k: o.k, i: String(i) } }); });
      } else if (o.type === 'timemachine') {
        const tm = st.timemachines[o.k];
        if (!tm) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('fossils in the crate', () => String(S().fossilCount)));
        ipanel.appendChild(ipRow('a dinosaur takes', ECON.dinoFossils + ' fossils'));
        ipanel.appendChild(ipRow('countdown', () => tm.on ? GAME.fmtTime(Math.max(0, tm.T - tm.t)) : 'idle'));
        ipanel.appendChild(ipRow('brought back', () => String(tm.made || 0)));
        btns.push({ label: () => tm.on ? 'RUNNING' : 'LOAD ' + ECON.dinoFossils + ' FOSSILS', data: { act: 'tm-load', k: o.k },
                    disabled: () => !GAME.canLoadTM(o.k), cls: () => GAME.canLoadTM(o.k) ? 'btn-green' : '' });
      } else if (o.type === 'billboard') {
        const bb = st.billboards[o.k];
        if (!bb) { setInspect({ kind: 'farm' }); return; }
        ipanel.appendChild(ipRow('poster', () => { const b2 = S().billboards[o.k]; return b2 && b2.custom ? 'hand painted' : 'stock print'; }));
        ipanel.appendChild(ipRow('pull', () => 'x' + (1 + ECON.billboardPull * GAME.billboardPull()).toFixed(2)));
        ipanel.appendChild(ipRow('a car every', () => GAME.fmtTime(GAME.orderWait())));
        ipanel.appendChild(ipRow('lay-by holds', () => String(GAME.maxOrders())));
        ipanel.appendChild(ipRow('they pay', () => '+' + Math.round(ECON.billboardPay * GAME.billboardPull() * 100) + '%'));
        btns.push({ label: 'PAINT POSTER', data: { act: 'open-poster', k: o.k }, cls: 'btn-green' });
      } else if (o.type === 'fence') {
        ipanel.appendChild(ipRow('blocks', 'chickens'));
      }
      const note = document.createElement('p');
      note.className = 'ip-note';
      note.textContent = b.desc;
      ipanel.appendChild(note);
      /* a second floor, once researched */
      if (GAME.lvl('storeys') && !st.storeys[o.k] && !st.sites[o.k] && GAME.canStorey(o.k) !== undefined && ['incubator', 'coop', 'barn', 'staffhut', 'silo', 'hq', 'mill', 'well', 'sprinkler', 'beehive', 'trough', 'hatchery', 'lovenest'].includes(o.type)) {
        btns.push({
          label: () => 'ADD A FLOOR ' + GAME.fmt(GAME.storeyCost(o.type)),
          data: { act: 'add-storey', k: o.k },
          disabled: () => !GAME.canStorey(o.k),
          cls: () => GAME.canStorey(o.k) ? 'btn-green' : '',
        });
      }
      if (st.sites[o.k] && st.sites[o.k].kind === 'storey') ipanel.appendChild(ipRow('second floor', () => { const s2 = S().sites[o.k]; return s2 ? Math.round(Math.min(1, s2.t / s2.T) * 100) + '% built' : 'done'; }));
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
  function statRow(label, v, hue, icon) {
    const row = document.createElement('div');
    row.className = 'st-row';
    row.title = label;
    if (icon) row.appendChild(mkIcon(icon, 2));
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
      const row = statRow(STATS[k].name + ' - ' + STATS[k].desc, GAME.crewStat(w, k), lead ? '#ffc72f' : null, STATS[k].icon);
      if (lead) row.classList.add('lead');
      box.appendChild(row);
    });
    return box;
  }

  /* a small form field: a printed label with something written in it */
  function formField(label, valueNode, cls) {
    const f = document.createElement('div');
    f.className = 'ff' + (cls ? ' ' + cls : '');
    const l = document.createElement('i');
    l.textContent = label;
    f.appendChild(l);
    const v = document.createElement('span');
    if (typeof valueNode === 'string') v.textContent = valueNode;
    else if (valueNode) v.appendChild(valueNode);
    f.appendChild(v);
    return f;
  }
  function stampEl(text, cls) {
    const st = document.createElement('div');
    st.className = 'stamp ' + (cls || '');
    st.textContent = text;
    return st;
  }

  /* a hired worker: their application, filed and stamped */
  function crewCard(w) {
    const def = ROLES[w.role] || ROLES.hand;
    const card = document.createElement('div');
    card.className = 'form-card' + (w.bot ? ' bot' : '') + (S().unpaid ? ' unpaid' : '');
    card.dataset.tip = w.name + ' - ' + def.name + '. ' + def.job;

    const head = document.createElement('div');
    head.className = 'form-head';
    const no = document.createElement('i');
    no.textContent = 'FORM ' + (w.bot ? 'R' : 'H') + '-' + String(w.id).padStart(3, '0');
    head.appendChild(no);
    const kind = document.createElement('b');
    kind.textContent = w.bot ? 'ROBOT UNIT' : 'STAFF RECORD';
    head.appendChild(kind);
    card.appendChild(head);

    const body = document.createElement('div');
    body.className = 'form-body';
    const photo = document.createElement('div');
    photo.className = 'form-photo';
    photo.appendChild(cloneCanvas(SPR.staffSprite(w, 0, 3)));
    body.appendChild(photo);

    const fields = document.createElement('div');
    fields.className = 'form-fields';
    fields.appendChild(formField('NAME', w.name, 'wide'));
    const post = document.createElement('span');
    post.className = 'chip';
    post.appendChild(mkIcon(def.icon, 2));
    post.appendChild(document.createTextNode(def.name));
    fields.appendChild(formField('POST', post));
    const pay = document.createElement('span');
    pay.className = 'chip pay';
    pay.appendChild(mkIcon('coin', 2));
    pay.appendChild(document.createTextNode((w.wage * Math.pow(0.88, GAME.lvl('wages'))).toFixed(2)));
    fields.appendChild(formField('PAY/S', pay));
    body.appendChild(fields);
    card.appendChild(body);

    /* the ratings box */
    const rate = document.createElement('div');
    rate.className = 'form-rate';
    const rh = document.createElement('i');
    rh.textContent = 'RATINGS';
    rate.appendChild(rh);
    rate.appendChild(statBlock(w, def.uses));
    card.appendChild(rate);

    card.appendChild(traitChips(w.traits));

    const meta = document.createElement('div');
    meta.className = 'form-meta';
    const jobs = document.createElement('span');
    jobs.title = 'Jobs done';
    jobs.appendChild(mkIcon('star', 2));
    jobs.appendChild(document.createTextNode(GAME.fmt(w.jobs || 0)));
    meta.appendChild(jobs);
    const nrg = document.createElement('span');
    nrg.title = 'Stamina left before a breather';
    nrg.appendChild(mkIcon('flame', 2));
    nrg.appendChild(document.createTextNode(Math.round((w.energy === undefined ? 1 : w.energy) * 100) + '%'));
    meta.appendChild(nrg);
    const stt = document.createElement('span');
    stt.className = 'form-state';
    stt.textContent = S().unpaid ? 'UNPAID' : w.state === 'rest' ? 'ON A BREAK' : w.state.toUpperCase();
    meta.appendChild(stt);
    card.appendChild(meta);

    /* reassignment: tick a different box */
    const roles = document.createElement('div');
    roles.className = 'form-roles';
    const rl = document.createElement('i');
    rl.textContent = 'REASSIGN';
    roles.appendChild(rl);
    const boxes = document.createElement('div');
    boxes.className = 'tickrow';
    ROLE_KEYS.filter(r => (w.bot || !ROLES[r].botOnly) && GAME.roleOpen(r)).forEach(r => {
      const b = document.createElement('button');
      b.className = 'tick' + (r === w.role ? ' on' : '');
      b.dataset.act = 'set-role';
      b.dataset.id = String(w.id);
      b.dataset.role = r;
      b.disabled = r === w.role;
      b.title = ROLES[r].name + ' - ' + ROLES[r].job;
      b.appendChild(mkIcon(ROLES[r].icon, 2));
      boxes.appendChild(b);
    });
    roles.appendChild(boxes);
    const fire = document.createElement('button');
    fire.className = 'btn btn-tiny cc-fire';
    fire.dataset.act = 'fire';
    fire.dataset.id = String(w.id);
    fire.title = w.bot ? 'Break this robot down for parts' : 'Let this person go';
    fire.textContent = w.bot ? 'SCRAP' : 'LET GO';
    roles.appendChild(fire);
    card.appendChild(roles);

    card.appendChild(stampEl(w.bot ? 'BUILT' : 'HIRED', 'green'));
    return card;
  }

  /* somebody who answered a flyer: an application waiting on a decision */
  function applicantCard(ap) {
    const card = document.createElement('div');
    card.className = 'form-card applicant';
    card.dataset.tip = ap.name + ' wants a job. Rating ' + crewQuality(ap.st) + ' out of 50.';

    const head = document.createElement('div');
    head.className = 'form-head';
    const no = document.createElement('i');
    no.textContent = 'APPLICATION';
    head.appendChild(no);
    const t = document.createElement('b');
    t.title = 'How long before they give up and walk off';
    t.textContent = GAME.fmtTime(Math.max(0, ap.t));
    head.appendChild(t);
    card.appendChild(head);

    const body = document.createElement('div');
    body.className = 'form-body';
    const photo = document.createElement('div');
    photo.className = 'form-photo';
    photo.appendChild(cloneCanvas(SPR.personSprite(ap.look, 0, 3)));
    body.appendChild(photo);
    const fields = document.createElement('div');
    fields.className = 'form-fields';
    fields.appendChild(formField('NAME', ap.name, 'wide'));
    const rate = document.createElement('span');
    rate.className = 'chip';
    rate.appendChild(mkIcon('star', 2));
    rate.appendChild(document.createTextNode(crewQuality(ap.st) + '/50'));
    fields.appendChild(formField('RATING', rate));
    const ask = document.createElement('span');
    ask.className = 'chip pay';
    ask.appendChild(mkIcon('coin', 2));
    ask.appendChild(document.createTextNode(GAME.fmt(ap.sign)));
    ask.appendChild(mkIcon('clock', 2));
    ask.appendChild(document.createTextNode((ap.wage * Math.pow(0.88, GAME.lvl('wages'))).toFixed(2)));
    fields.appendChild(formField('ASKS', ask));
    body.appendChild(fields);
    card.appendChild(body);

    const rbox = document.createElement('div');
    rbox.className = 'form-rate';
    const rh = document.createElement('i');
    rh.textContent = 'RATINGS';
    rbox.appendChild(rh);
    rbox.appendChild(statBlock(ap, null));
    card.appendChild(rbox);
    card.appendChild(traitChips(ap.traits));

    const roles = document.createElement('div');
    roles.className = 'form-roles';
    const rl = document.createElement('i');
    rl.textContent = 'HIRE AS';
    roles.appendChild(rl);
    const room = GAME.canHire() && S().coins >= ap.sign;
    const boxes = document.createElement('div');
    boxes.className = 'tickrow';
    ROLE_KEYS.filter(r => !ROLES[r].botOnly && GAME.roleOpen(r)).forEach(r => {
      const b = document.createElement('button');
      b.className = 'tick' + (room ? ' go' : '');
      b.dataset.act = 'hire-applicant';
      b.dataset.id = String(ap.id);
      b.dataset.role = r;
      b.disabled = !room;
      b.title = 'Hire as ' + ROLES[r].name + ' - ' + ROLES[r].job;
      b.appendChild(mkIcon(ROLES[r].icon, 2));
      boxes.appendChild(b);
    });
    roles.appendChild(boxes);
    if (!room) {
      const hint = document.createElement('em');
      hint.className = 'cc-hint';
      hint.textContent = GAME.canHire() ? 'too dear' : 'no room';
      roles.appendChild(hint);
    }
    card.appendChild(roles);
    card.appendChild(stampEl('PENDING', 'amber'));
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
    if (!GAME.lvl('hiring')) line.textContent = 'Research Recruiting first.';
    else if (!Object.keys(st.huts).length) line.textContent = 'Build a Staff Hut.';
    else if (!Object.keys(st.boards).length) line.textContent = 'Build a Noticeboard.';
    else if (st.flyer) line.textContent = 'Folk arrive in ' + GAME.fmtTime(st.flyer.t);
    else line.textContent = 'Put flyers up and wait.';
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
      grid.className = 'form-grid';
      st.applicants.forEach(ap => grid.appendChild(applicantCard(ap)));
      box.appendChild(grid);
    } else if (!st.flyer && GAME.lvl('hiring') && Object.keys(st.huts).length) {
      const none = document.createElement('p');
      none.className = 'crew-none';
      none.textContent = 'Nobody waiting.';
      box.appendChild(none);
    }
  }

  /* robots are built, not recruited */
  function botBench(box) {
    const bots = ROLE_KEYS.filter(r => GAME.roleOpen(r));
    if (!bots.length) return;
    const head = document.createElement('div');
    head.className = 'ps-head crew-head';
    const hl = document.createElement('b');
    hl.textContent = 'ROBOT WORKSHOP - BUILD ORDERS';
    head.appendChild(hl);
    const hr = document.createElement('span');
    hr.textContent = GAME.botCount() + ' built';
    head.appendChild(hr);
    box.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'form-grid';
    bots.forEach(r => {
      const def = ROLES[r];
      const open = GAME.roleOpen(r);
      const cost = GAME.botPrice(r);
      const card = document.createElement('div');
      card.className = 'form-card order' + (open ? '' : ' locked');
      card.dataset.tip = open ? (BOTS[r] || { name: def.name }).name + ' - does the ' + def.name + ' job. ' + def.job
                              : 'Research this chassis in the Lab first.';
      const head = document.createElement('div');
      head.className = 'form-head';
      const no = document.createElement('i');
      no.textContent = 'BUILD ORDER';
      head.appendChild(no);
      const nm2 = document.createElement('b');
      nm2.textContent = (BOTS[r] || { name: def.name }).name.toUpperCase();
      head.appendChild(nm2);
      card.appendChild(head);
      const body = document.createElement('div');
      body.className = 'form-body';
      const photo = document.createElement('div');
      photo.className = 'form-photo';
      photo.appendChild(cloneCanvas(SPR.botSprite(r, 0, 3)));
      body.appendChild(photo);
      const fields = document.createElement('div');
      fields.className = 'form-fields';
      const post = document.createElement('span');
      post.className = 'chip';
      post.appendChild(mkIcon(def.icon, 2));
      post.appendChild(document.createTextNode(open ? def.name : 'LOCKED'));
      fields.appendChild(formField('POST', post));
      const specs = document.createElement('span');
      specs.className = 'chip';
      def.uses.forEach(u => { specs.appendChild(mkIcon(STATS[u].icon, 2)); });
      specs.appendChild(document.createTextNode('7'));
      fields.appendChild(formField('SPEC', specs));
      body.appendChild(fields);
      card.appendChild(body);
      const foot = document.createElement('div');
      foot.className = 'form-roles';
      const rl2 = document.createElement('i');
      rl2.textContent = 'COST';
      foot.appendChild(rl2);
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.dataset.act = 'assemble';
      btn.dataset.role = r;
      const ok = open && GAME.canHire() && S().coins >= cost;
      if (ok) btn.classList.add('btn-green');
      btn.disabled = !ok;
      btn.appendChild(mkIcon('coin', 2));
      btn.appendChild(document.createTextNode(open ? GAME.fmt(cost) : '-'));
      foot.appendChild(btn);
      card.appendChild(foot);
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
      grid.className = 'form-grid';
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

  /* ================= THE VALLEY MAP =================
     A sheet of old paper pinned to the HQ wall, drawn in wobbly
     ink: the ranch, the road, and every town along it. Cities you
     have not opened yet sit under a fog of unmapped country.
     ================================================== */
  const MAP_W = 720, MAP_H = 320, MK = 2;
  const MVW = MAP_W / MK, MVH = MAP_H / MK;
  const INK = '#5e4426', INK2 = '#8a6a44', RED = '#b4442e';
  const MAP_PTS = {
    ranch:   { x: 34,  y: 118 },
    hamlet:  { x: 88,  y: 104 },
    town:    { x: 142, y: 78  },
    city:    { x: 204, y: 96  },
    capital: { x: 262, y: 62  },
    port:    { x: 320, y: 104 },
  };
  let mapCv = null, mapCtx = null, mapHits = [], mapHover = null;

  function drawValleyMap(now) {
    if (!mapCv) return;
    const g = mapCtx;
    g.imageSmoothingEnabled = false;
    g.setTransform(MK, 0, 0, MK, 0, 0);
    mapHits = [];
    const st = S();

    /* corkboard behind the paper */
    g.fillStyle = '#b98a52'; g.fillRect(0, 0, MVW, MVH);
    const crnd = SPR.mulberry(99);
    for (let i = 0; i < 900; i++) {
      const x = Math.floor(crnd() * MVW), y = Math.floor(crnd() * MVH);
      g.fillStyle = crnd() < 0.5 ? '#a87a45' : '#c99a62';
      g.fillRect(x, y, 1 + (crnd() < 0.2 ? 1 : 0), 1);
    }
    /* the sheet, very slightly crooked */
    SPR.parchment(g, 6, 5, MVW - 12, MVH - 10, 21);

    /* --- hand-drawn country --- */
    /* coast down the right-hand side */
    let prev = null;
    for (let y = 8; y < MVH - 8; y += 4) {
      const x = MVW - 22 + Math.round(Math.sin(y / 13) * 5 + Math.sin(y / 5) * 2);
      if (prev) SPR.inkLine(g, prev[0], prev[1], x, y, INK, 0, 300 + y);
      prev = [x, y];
    }
    for (let y = 10; y < MVH - 10; y += 7) {
      const x = MVW - 18 + Math.round(Math.sin(y / 13) * 5);
      SPR.inkLine(g, x + 3, y, x + 9, y, INK2, 0, 400 + y, 2);
    }
    /* hills along the top */
    for (let i = 0; i < 9; i++) {
      const hx = 24 + i * 34, hy = 26 + (i % 3) * 5;
      SPR.inkLine(g, hx, hy, hx + 7, hy - 6, INK, 0, 500 + i);
      SPR.inkLine(g, hx + 7, hy - 6, hx + 14, hy, INK, 0, 520 + i);
      if (i % 2) { SPR.inkLine(g, hx + 4, hy - 3, hx + 7, hy - 6, INK2, 0, 540 + i); }
    }
    /* a little forest */
    for (let i = 0; i < 7; i++) {
      const tx = 60 + (i % 4) * 13, ty = 148 + Math.floor(i / 4) * 11;
      g.fillStyle = INK;
      g.fillRect(tx + 2, ty + 4, 1, 3);
      g.fillRect(tx, ty, 5, 1); g.fillRect(tx + 1, ty - 2, 3, 1); g.fillRect(tx + 1, ty + 2, 3, 1);
    }
    /* a river winding down to the sea */
    let rp = [150, 150];
    for (let i = 0; i < 26; i++) {
      const nx = rp[0] + 7, ny = 150 + Math.round(Math.sin(i / 3) * 6) - i * 0.4;
      SPR.inkLine(g, rp[0], rp[1], nx, ny, '#7fa8c4', 1, 600 + i);
      rp = [nx, ny];
    }

    /* --- the road: one wobbly line through every town --- */
    const order = ['ranch'].concat(CITIES.map(c => c.id));
    for (let i = 0; i < order.length - 1; i++) {
      const a = MAP_PTS[order[i]], b = MAP_PTS[order[i + 1]];
      const open = st.routes.includes(order[i + 1]);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 12 };
      /* two straight halves through a raised midpoint reads as a curve */
      SPR.inkLine(g, a.x, a.y, mid.x, mid.y, open ? INK : '#bfae90', 1, 700 + i);
      SPR.inkLine(g, mid.x, mid.y, b.x, b.y, open ? INK : '#bfae90', 1, 730 + i);
      if (open) {
        SPR.inkLine(g, a.x, a.y + 1, mid.x, mid.y + 1, INK2, 1, 760 + i, 3);
        SPR.inkLine(g, mid.x, mid.y + 1, b.x, b.y + 1, INK2, 1, 790 + i, 3);
      }
    }

    /* --- the active route, inked in red and crawling --- */
    const activeIdx = CITIES.findIndex(c => c.id === st.route);
    if (activeIdx >= 0) {
      for (let i = 0; i <= activeIdx; i++) {
        const a = MAP_PTS[order[i]], b = MAP_PTS[order[i + 1]];
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 12 };
        const crawl = Math.floor(now / 90) % 6;
        [[a, mid], [mid, b]].forEach(([p0, p1], h) => {
          const steps = Math.max(Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y));
          for (let q = 0; q <= steps; q++) {
            if ((q + crawl) % 6 >= 3) continue;
            const t = steps ? q / steps : 0;
            g.fillStyle = RED;
            g.fillRect(Math.round(p0.x + (p1.x - p0.x) * t), Math.round(p0.y + (p1.y - p0.y) * t) - 2, 1, 2);
          }
        });
      }
    }

    /* --- the ranch --- */
    const rr = MAP_PTS.ranch;
    g.fillStyle = INK;
    g.fillRect(rr.x - 7, rr.y - 2, 14, 8);
    g.fillStyle = '#e8d9ae'; g.fillRect(rr.x - 6, rr.y - 1, 12, 6);
    for (let i = 0; i < 7; i++) g.fillRect(rr.x - 6 + i, rr.y - 2 - Math.min(i, 6 - i), 1, 1);
    g.fillStyle = INK;
    for (let i = 0; i < 8; i++) g.fillRect(rr.x - 7 + i, rr.y - 3 - Math.min(i, 7 - i), 1, 1);
    g.fillRect(rr.x - 1, rr.y + 1, 3, 4);
    /* the X marking it */
    for (let i = -4; i <= 4; i++) { g.fillStyle = RED; g.fillRect(rr.x + i, rr.y - 12 + i, 1, 1); g.fillRect(rr.x + i, rr.y - 4 - i, 1, 1); }
    SPR.drawTiny(g, 'YOUR RANCH', rr.x - 12, rr.y + 9, INK, 1);

    /* --- the towns --- */
    CITIES.forEach((c, i) => {
      const p = MAP_PTS[c.id];
      const open = st.routes.includes(c.id);
      const active = st.route === c.id;
      const nextUp = !open && (i === 0 || st.routes.includes(CITIES[i - 1].id));
      if (!open) {
        /* unmapped: a smudge of cloud and a question mark */
        /* a soft bank of cloud, drawn as overlapping puffs */
        const rnd2 = SPR.mulberry(880 + i);
        for (let pass = 0; pass < 2; pass++) {
          g.fillStyle = pass ? 'rgba(226,214,182,.92)' : 'rgba(203,188,152,.85)';
          for (let q = 0; q < 9; q++) {
            const cx2 = p.x - 13 + Math.floor(rnd2() * 26);
            const cy2 = p.y - 10 + Math.floor(rnd2() * 18) - pass;
            const rr2 = 4 + Math.floor(rnd2() * 4);
            for (let dy = -rr2; dy <= rr2; dy++) {
              const half = Math.round(Math.sqrt(Math.max(0, rr2 * rr2 - dy * dy)));
              g.fillRect(cx2 - half, cy2 + dy, half * 2, 1);
            }
          }
        }
        /* a curl of ink round the edge so it reads as drawn, not missing */
        for (let q = 0; q < 22; q++) {
          const th = q / 22 * Math.PI * 2;
          g.fillStyle = 'rgba(138,122,90,.5)';
          g.fillRect(Math.round(p.x + Math.cos(th) * 15), Math.round(p.y - 1 + Math.sin(th) * 12), 1, 1);
        }
        SPR.drawText(g, '?', p.x - 2, p.y - 6, nextUp ? RED : '#8a7a5a', 1);
        if (nextUp) SPR.drawTiny(g, 'UNMAPPED', p.x - 13, p.y + 9, '#8a7a5a', 1);
      } else {
        /* a drawn little town: blocks, roofs, and a spire for the big ones */
        const n = 2 + c.sky;
        for (let b2 = 0; b2 < n; b2++) {
          const bx = p.x - n * 3 + b2 * 6, bh = 5 + ((b2 * 7 + c.sky * 3) % 6);
          g.fillStyle = INK;
          g.fillRect(bx, p.y - bh, 5, bh);
          g.fillStyle = '#e8d9ae'; g.fillRect(bx + 1, p.y - bh + 1, 3, bh - 1);
          g.fillStyle = INK;
          for (let q = 0; q < 3; q++) g.fillRect(bx + q, p.y - bh - 1 - Math.min(q, 2 - q), 1, 1);
          if (c.sky >= 2 && b2 % 2) { g.fillStyle = INK2; g.fillRect(bx + 2, p.y - bh + 2, 1, 1); }
        }
        if (c.sky >= 3) { g.fillStyle = INK; g.fillRect(p.x + n * 3 - 2, p.y - 18, 2, 18); g.fillRect(p.x + n * 3 - 3, p.y - 21, 4, 3); }
        if (c.sky === 4) { g.fillStyle = '#7fa8c4'; g.fillRect(p.x - 16, p.y + 3, 34, 1); g.fillRect(p.x - 12, p.y + 5, 26, 1); }
        const label = c.name.toUpperCase();
        SPR.drawTiny(g, label, p.x - Math.floor(SPR.tinyW(label, 1) / 2), p.y + 8, active ? RED : INK, 1);
        if (active) {
          SPR.drawTiny(g, 'DELIVERING', p.x - 16, p.y + 15, RED, 1);
          /* a ring drawn round the active town */
          for (let a2 = 0; a2 < 34; a2++) {
            const th = a2 / 34 * Math.PI * 2;
            g.fillStyle = RED;
            g.fillRect(Math.round(p.x + Math.cos(th) * 18), Math.round(p.y - 4 + Math.sin(th) * 12), 1, 1);
          }
        }
      }
      if (mapHover === c.id) {
        g.fillStyle = 'rgba(180,68,46,.16)';
        g.fillRect(p.x - 18, p.y - 20, 36, 30);
      }
      mapHits.push({ id: c.id, x: p.x - 18, y: p.y - 20, w: 36, h: 30 });
    });

    /* --- the load, riding the road --- */
    const ph = GAME.tripPhase();
    if (ph) {
      const dest = MAP_PTS[st.truck.to || st.route] || MAP_PTS.hamlet;
      const home = MAP_PTS.ranch;
      const t = ph.out ? ph.f / 0.5 : 1 - (ph.f - 0.5) / 0.5;
      const vx = home.x + (dest.x - home.x) * t, vy = home.y + (dest.y - home.y) * t - Math.sin(t * Math.PI) * 10;
      const spr = SPR.vehicleSprite(ph.vehicle.id, Math.floor(now / 90) % 2, 1);
      g.save();
      if (!ph.out) { g.translate(Math.round(vx) + Math.round(spr.width / 2), Math.round(vy) - spr.height + 2); g.scale(-1, 1); g.drawImage(spr, -spr.width, 0); }
      else g.drawImage(spr, Math.round(vx - spr.width / 2), Math.round(vy) - spr.height + 2);
      g.restore();
      g.fillStyle = 'rgba(94,68,38,.28)';
      g.fillRect(Math.round(vx - spr.width / 2), Math.round(vy) + 1, spr.width, 1);
    }

    /* --- furniture: compass, title, scale, pins --- */
    SPR.compassRose(g, MVW - 34, 40, 9, INK);
    SPR.drawTiny(g, 'N', MVW - 36, 24, INK, 1);
    const title = 'THE VALLEY';
    g.fillStyle = 'rgba(232,217,174,.9)';
    g.fillRect(16, 12, SPR.textW(title, 1) + 10, 14);
    SPR.inkLine(g, 16, 12, 16 + SPR.textW(title, 1) + 10, 12, INK, 1, 12);
    SPR.inkLine(g, 16, 26, 16 + SPR.textW(title, 1) + 10, 26, INK, 1, 13);
    SPR.drawText(g, title, 21, 16, INK, 1);
    SPR.inkLine(g, 20, MVH - 18, 60, MVH - 18, INK, 1, 44);
    SPR.drawTiny(g, 'A DAYS RIDE', 20, MVH - 15, INK2, 1);
    /* pushpins */
    [[10, 9], [MVW - 12, 9], [10, MVH - 11], [MVW - 12, MVH - 11]].forEach(([px2, py2], i) => {
      g.fillStyle = ['#c94a3a', '#3f6fd6', '#7ac74f', '#ffd23f'][i];
      g.fillRect(px2 - 2, py2 - 2, 5, 5);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(px2 - 1, py2 - 1, 2, 2);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px2 - 2, py2 + 3, 5, 1);
    });
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  function mapCoords(ev) {
    const r = mapCv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * MVW, y: (ev.clientY - r.top) / r.height * MVH };
  }
  function mapHitAt(x, y) {
    for (let i = mapHits.length - 1; i >= 0; i--) {
      const h = mapHits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return null;
  }

  /* ================= THE DEPOT - wheels and routes ================= */
  let depotSig = '';
  function renderDepot() {
    const box = $('#depot-body');
    const st = S();
    box.innerHTML = '';
    const v = GAME.vehicle();
    const wrap = $('#depot-map-wrap');

    /* ---- no HQ yet: a blueprint and what to do about it ---- */
    if (!GAME.depotOpen()) {
      wrap.hidden = true;
      $('#depot-sub').textContent = 'NOT YET OPEN';
      const need = document.createElement('div');
      need.className = 'hq-needed';
      need.appendChild(mkIcon('lock', 5));
      const mid = document.createElement('div');
      const b2 = document.createElement('b');
      b2.textContent = 'RESEARCH LOGISTICS';
      mid.appendChild(b2);
      const p2 = document.createElement('p');
      p2.textContent = 'One cheap cube in the Lab, MARKET lane. Then vehicles and routes open right here.';
      mid.appendChild(p2);
      const p3 = document.createElement('p');
      p3.className = 'hq-cost';
      p3.appendChild(mkIcon('feather', 2));
      p3.appendChild(document.createTextNode(String(SKILL_BY_ID.logistics.base)));
      mid.appendChild(p3);
      need.appendChild(mid);
      box.appendChild(need);
      /* the load can still be sent from the sign */
      const foot = document.createElement('div');
      foot.className = 'depot-foot';
      const info = document.createElement('span');
      if (st.truck.state === 'parked') {
        info.appendChild(mkIcon('egg', 2));
        info.appendChild(document.createTextNode(st.truck.load.length + '/' + GAME.truckCap()));
        info.appendChild(mkIcon('coin', 2));
        info.appendChild(document.createTextNode(GAME.fmt(GAME.truckPayout())));
      } else info.textContent = 'On the road.';
      foot.appendChild(info);
      const send = document.createElement('button');
      send.className = 'btn' + (st.truck.state === 'parked' && st.truck.load.length ? ' btn-green' : '');
      send.disabled = !(st.truck.state === 'parked' && st.truck.load.length);
      send.dataset.act = 'send-now';
      send.textContent = 'SEND IT';
      foot.appendChild(send);
      box.appendChild(foot);
      return;
    }

    wrap.hidden = false;
    if (!mapCv) {
      mapCv = $('#depot-map');
      mapCv.width = MAP_W; mapCv.height = MAP_H;
      mapCtx = mapCv.getContext('2d');
      mapCv.addEventListener('pointermove', ev => {
        const p2 = mapCoords(ev);
        const h = mapHitAt(p2.x, p2.y);
        mapHover = h ? h.id : null;
        mapCv.style.cursor = h ? 'pointer' : 'default';
      });
      mapCv.addEventListener('pointerleave', () => { mapHover = null; });
      mapCv.addEventListener('pointerdown', ev => {
        const p2 = mapCoords(ev);
        const h = mapHitAt(p2.x, p2.y);
        if (!h) return;
        if (S().routes.includes(h.id)) { if (GAME.setRoute(h.id)) { snd.plop(); renderDepot(); } else snd.error(); }
        else if (GAME.buyRoute(h.id)) renderDepot();
        else snd.error();
      });
    }
    $('#depot-sub').textContent = v.name.toUpperCase() + '  -  ' + GAME.truckCap() + ' EGGS  -  ' + GAME.fmtTime(GAME.tripTime()) + ' ROUND TRIP';

    /* --- the garage --- */
    const gar = document.createElement('div');
    gar.className = 'depot-sec';
    const gh = document.createElement('b');
    gh.className = 'depot-h';
    gh.textContent = 'THE GARAGE';
    gar.appendChild(gh);
    const row = document.createElement('div');
    row.className = 'veh-row';
    VEHICLES.forEach((veh, i) => {
      const card = document.createElement('div');
      const owned = i <= st.vehicle, cur = i === st.vehicle, next = i === st.vehicle + 1;
      card.className = 'veh-card' + (cur ? ' current' : owned ? ' owned' : next ? ' next' : ' locked');
      card.appendChild(cloneCanvas(SPR.vehicleSprite(veh.id, 0, 2)));
      const nm = document.createElement('b');
      nm.textContent = veh.name.toUpperCase();
      card.appendChild(nm);
      card.title = veh.name + ' - ' + veh.desc + ' Carries ' + veh.cap + ' eggs, ' +
                   GAME.fmtTime(veh.trip * GAME.city().dist) + ' to ' + GAME.city().name + '.';
      const line = document.createElement('span');
      line.appendChild(mkIcon('egg', 3));
      line.appendChild(document.createTextNode(String(veh.cap)));
      line.appendChild(mkIcon('clock', 3));
      line.appendChild(document.createTextNode(GAME.fmtTime(veh.trip * GAME.city().dist)));
      card.appendChild(line);
      if (cur) { const t = document.createElement('em'); t.textContent = 'YOURS'; card.appendChild(t); }
      else if (next) {
        const b3 = document.createElement('button');
        b3.className = 'btn' + (st.coins >= veh.cost && st.truck.state === 'parked' ? ' btn-green' : '');
        b3.disabled = !(st.coins >= veh.cost && st.truck.state === 'parked');
        b3.dataset.act = 'buy-vehicle';
        b3.appendChild(mkIcon('coin', 2));
        b3.appendChild(document.createTextNode(GAME.fmt(veh.cost)));
        card.appendChild(b3);
      } else if (!owned) { const t = document.createElement('em'); t.textContent = 'LATER'; card.appendChild(t); }
      row.appendChild(card);
    });
    gar.appendChild(row);
    box.appendChild(gar);

    /* --- the routes, as dispatch slips --- */
    const rt = document.createElement('div');
    rt.className = 'depot-sec';
    const rh = document.createElement('b');
    rh.className = 'depot-h';
    rh.textContent = 'ROUTES';
    rt.appendChild(rh);
    const list = document.createElement('div');
    list.className = 'route-list';
    CITIES.forEach((c, i) => {
      const open = st.routes.includes(c.id), active = st.route === c.id;
      const prevOpen = i === 0 || st.routes.includes(CITIES[i - 1].id);
      const card = document.createElement('div');
      card.className = 'route-card' + (active ? ' active' : open ? ' open' : prevOpen ? ' next' : ' locked');
      card.appendChild(cloneCanvas(SPR.skylineSprite(c.sky, 64, 30, 2)));
      const mid = document.createElement('div');
      mid.className = 'rc-mid';
      const nm = document.createElement('b');
      nm.textContent = c.name.toUpperCase();
      mid.appendChild(nm);
      card.title = c.name + ' - ' + c.pop + '. ' + c.desc + ' Pays x' + c.mult.toFixed(2) +
                   (c.sky ? ', and ' + (8 * c.sky) + '% more per tier on rare eggs.' : '.');
      const l1 = document.createElement('span');
      l1.appendChild(mkIcon('coin', 3));
      l1.appendChild(document.createTextNode('x' + c.mult.toFixed(2)));
      l1.appendChild(mkIcon('clock', 3));
      l1.appendChild(document.createTextNode(GAME.fmtTime(v.trip * c.dist * Math.pow(0.85, GAME.lvl('route')) * Math.pow(0.75, GAME.lvl('fleet')))));
      mid.appendChild(l1);
      card.appendChild(mid);
      const act = document.createElement('div');
      act.className = 'rc-act';
      if (active) { const t = document.createElement('em'); t.textContent = 'DELIVERING HERE'; act.appendChild(t); }
      else if (open) {
        const b4 = document.createElement('button');
        b4.className = 'btn';
        b4.dataset.act = 'set-route'; b4.dataset.id = c.id;
        b4.disabled = st.truck.state !== 'parked';
        b4.textContent = 'DELIVER HERE';
        act.appendChild(b4);
      } else if (prevOpen) {
        const b5 = document.createElement('button');
        b5.className = 'btn' + (st.coins >= c.cost ? ' btn-green' : '');
        b5.disabled = st.coins < c.cost;
        b5.dataset.act = 'buy-route'; b5.dataset.id = c.id;
        b5.appendChild(mkIcon('coin', 2));
        b5.appendChild(document.createTextNode(GAME.fmt(c.cost)));
        act.appendChild(b5);
        const t = document.createElement('em'); t.textContent = 'survey the road'; act.appendChild(t);
      } else { const t = document.createElement('em'); t.textContent = 'further down the road'; act.appendChild(t); }
      card.appendChild(act);
      list.appendChild(card);
    });
    rt.appendChild(list);
    box.appendChild(rt);

    /* --- send the load --- */
    const foot = document.createElement('div');
    foot.className = 'depot-foot';
    const info = document.createElement('span');
    if (st.truck.state === 'parked') {
      info.appendChild(mkIcon('egg', 2));
      info.appendChild(document.createTextNode(st.truck.load.length + '/' + GAME.truckCap()));
      info.appendChild(mkIcon('coin', 2));
      info.appendChild(document.createTextNode(GAME.fmt(GAME.truckPayout())));
      info.appendChild(mkIcon('city', 2));
      info.appendChild(document.createTextNode(GAME.city().name));
    } else info.textContent = 'On the road.';
    foot.appendChild(info);
    const send = document.createElement('button');
    send.className = 'btn' + (st.truck.state === 'parked' && st.truck.load.length ? ' btn-green' : '');
    send.disabled = !(st.truck.state === 'parked' && st.truck.load.length);
    send.dataset.act = 'send-now';
    send.textContent = 'SEND IT';
    foot.appendChild(send);
    box.appendChild(foot);
  }

  /* ================= THE INDEX =================
     Four tabs: the chickens you have found, the crew on the
     payroll, what each egg is worth, and the diary.
     ============================================ */
  let indexTab = 'chickens';
  function flipBook() {
    const page = $('#pedia');
    page.classList.remove('flip');
    void page.offsetWidth;
    page.classList.add('flip');
    snd.plop();
  }
  /* the LEDGER page: an income graph, where the coins came from, and
     once the market is open, the rival companies' shares */
  function graphCanvas(vals, w, h, col, fill) {
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2; c.className = 'ledger-graph';
    c.style.width = w + 'px'; c.style.height = h + 'px';
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.fillStyle = fill || '#fdf6e3'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(82,53,31,.12)'; for (let y = h / 4; y < h; y += h / 4) g.fillRect(0, Math.round(y), w, 1);
    const n = vals.length;
    if (!n) { SPR.drawTiny(g, 'NOTHING YET', 4, h / 2 - 3, '#7a5a3a', 1); return c; }
    const mx = Math.max(1, ...vals), mn = Math.min(...vals);
    const span = Math.max(1e-6, mx - (fill ? mn : 0));
    const bw = Math.max(1, Math.floor(w / Math.max(n, 30)));
    for (let i = 0; i < n; i++) {
      const v = vals[i];
      const hh = Math.max(1, Math.round((v - (fill ? mn : 0)) / span * (h - 8)));
      const x = w - (n - i) * bw;
      g.fillStyle = col;
      if (fill) g.fillRect(x, h - 2 - hh, bw, 2); else g.fillRect(x, h - 2 - hh, Math.max(1, bw - 1), hh);
    }
    SPR.drawTiny(g, GAME.fmt(Math.round(mx)), 2, 2, '#52351f', 1);
    if (fill) SPR.drawTiny(g, GAME.fmt(Math.round(mn)), 2, h - 8, '#7a5a3a', 1);
    return c;
  }
  function renderLedger(box) {
    const st = S();
    const L = st.ledger;
    $('#pedia-sub').textContent = GAME.fmt(st.stats.coinsEarned) + ' EARNED ALL TOLD';
    const intro = document.createElement('p');
    intro.className = 'pedia-intro';
    intro.textContent = 'Coins a minute, sampled every ten seconds. The company is worth what it earns.';
    box.appendChild(intro);
    const sec = document.createElement('div');
    sec.className = 'ledger-sec';
    const h = document.createElement('b'); h.textContent = 'INCOME'; sec.appendChild(h);
    sec.appendChild(graphCanvas(L.hist, 320, 90, '#6ab04c'));
    const now2 = L.hist.length ? L.hist[L.hist.length - 1] : 0;
    const row = document.createElement('div');
    row.className = 'tally';
    [['coin', GAME.fmt(now2) + '/min', 'Right now'], ['truck', GAME.fmt(L.sales), 'Truck sales'], ['doc', GAME.fmt(L.orders), 'Roadside orders'],
     ['honey', GAME.fmt(L.honey), 'Honey'], ['star', GAME.fmt(L.quests), 'Quest rewards'], ['globe', GAME.fmt(L.empire || 0), 'Branches abroad'],
     ['pan', GAME.fmt(L.food || 0), 'Kitchen'], ['ticket', GAME.fmt(L.park || 0), 'Park tickets'], ['key', GAME.fmt(L.secrets || 0), 'Secrets'],
     [GAME.age().icon, '+' + Math.round((GAME.ageMult() - 1) * 100) + '%', GAME.age().name + ' bonus'],
     ['chart', GAME.fmt(GAME.companyValue()), 'Company value']].forEach(([ic, v, tip]) => {
      const cell = document.createElement('div');
      cell.title = tip;
      cell.appendChild(mkIcon(ic, 3));
      const n = document.createElement('b'); n.textContent = String(v); cell.appendChild(n);
      const l2 = document.createElement('small'); l2.textContent = tip.toUpperCase(); cell.appendChild(l2);
      row.appendChild(cell);
    });
    sec.appendChild(row);
    box.appendChild(sec);
    if (!GAME.lvl('stocks')) {
      const lock = document.createElement('p');
      lock.className = 'pedia-intro';
      lock.appendChild(mkIcon('lock', 2));
      lock.appendChild(document.createTextNode(' The market opens with Stock Market, in the MARKET lane of the Lab.'));
      box.appendChild(lock);
      return;
    }
    const msec = document.createElement('div');
    msec.className = 'ledger-sec';
    const mh = document.createElement('b'); mh.textContent = 'THE MARKET - ' + GAME.fmt(Math.round(GAME.portfolio())) + ' IN SHARES'; msec.appendChild(mh);
    const own = document.createElement('div');
    own.className = 'stock-row own';
    own.appendChild(mkIcon(st.company.logo, 3));
    const on = document.createElement('b'); on.textContent = st.company.name; own.appendChild(on);
    const ov = document.createElement('span'); ov.textContent = 'yours - valued at ' + GAME.fmt(GAME.companyValue()); own.appendChild(ov);
    msec.appendChild(own);
    STOCKS.forEach(sk => {
      const price = GAME.stockPrice(sk.id);
      const hist = (st.market.hist[sk.id] || []);
      const first = hist.length ? hist[0] : price;
      const chg = first ? (price - first) / first * 100 : 0;
      const held = st.market.held[sk.id] || 0;
      const r2 = document.createElement('div');
      r2.className = 'stock-row';
      const sw = document.createElement('i'); sw.className = 'stock-swatch'; sw.style.background = sk.col; r2.appendChild(sw);
      const nm = document.createElement('b'); nm.textContent = sk.name; r2.appendChild(nm);
      const pr = document.createElement('span'); pr.className = 'stock-price ' + (chg >= 0 ? 'up' : 'down'); pr.textContent = price.toFixed(2) + ' (' + (chg >= 0 ? '+' : '') + chg.toFixed(1) + '%)'; r2.appendChild(pr);
      r2.appendChild(graphCanvas(hist.length ? hist : [price], 80, 24, sk.col, '#fffaf0'));
      const hd = document.createElement('span'); hd.className = 'stock-held'; hd.textContent = held + ' held'; r2.appendChild(hd);
      const btns = document.createElement('div'); btns.className = 'ip-btns';
      [['buy-stock', 1, 'BUY 1'], ['buy-stock', 10, 'BUY 10'], ['sell-stock', 1, 'SELL 1'], ['sell-stock', 10, 'SELL 10']].forEach(([act, n, label]) => {
        const b = document.createElement('button');
        b.className = 'btn' + (act === 'buy-stock' ? ' btn-green' : '');
        b.dataset.act = act; b.dataset.id = sk.id; b.dataset.n = String(n);
        b.disabled = act === 'buy-stock' ? st.coins < price * n : held < n;
        b.textContent = label;
        btns.appendChild(b);
      });
      r2.appendChild(btns);
      msec.appendChild(r2);
    });
    box.appendChild(msec);
  }

  function renderPedia() {
    const box = $('#pedia');
    box.innerHTML = '';
    const ledgerBtn = document.querySelector('#index-tabs [data-tab="ledger"]');
    if (ledgerBtn) ledgerBtn.hidden = !GAME.lvl('ledger');
    if (indexTab === 'ledger' && !GAME.lvl('ledger')) indexTab = 'chickens';
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
      intro.textContent = 'Print flyers. Folk walk in. Pick a role that suits their stats.';
      box.appendChild(intro);
      noticeBoard(box);
      if (st.staff.length) {
        const head = document.createElement('div');
        head.className = 'ps-head crew-head';
        const hl = document.createElement('b');
        hl.textContent = 'PERSONNEL FILES';
        head.appendChild(hl);
        const hr = document.createElement('span');
        hr.textContent = st.staff.length + ' / ' + GAME.staffSlots();
        head.appendChild(hr);
        box.appendChild(head);
        const grid = document.createElement('div');
        grid.className = 'form-grid';
        st.staff.forEach(w => grid.appendChild(crewCard(w)));
        box.appendChild(grid);
      }
      botBench(box);

    } else if (indexTab === 'crops') {
      const st = S();
      $('#pedia-sub').textContent = st.stats.harvested + ' HARVESTS - ' + Math.floor(st.feedStore) + ' / ' + GAME.feedCap() + ' FEED';
      const intro = document.createElement('p');
      intro.className = 'pedia-intro';
      intro.textContent = 'Harvests make feed. Chicks eat to grow, hens eat to lay.';
      box.appendChild(intro);
      const grid = document.createElement('div');
      grid.className = 'crop-grid';
      CROP_KEYS.forEach(k => {
        const d = CROPS[k];
        const open = GAME.cropOpen(k);
        const card = document.createElement('div');
        card.className = 'crop-card' + (open ? '' : ' unknown');
        const stages = document.createElement('div');
        stages.className = 'crop-stages';
        for (let st2 = 0; st2 < d.stages; st2++) stages.appendChild(cloneCanvas(SPR.cropSprite(k, st2, 3, 2)));
        card.appendChild(stages);
        const nm = document.createElement('b');
        nm.textContent = open ? d.name : '???';
        nm.style.color = d.col;
        card.appendChild(nm);
        if (open) {

          card.title = d.name + ' - ' + d.desc + ' Grows in ' + GAME.fmtTime(d.grow / (1 + 0.15 * GAME.lvl('farming'))) +
                       ' dry, yields ' + GAME.harvestYield(k) + ' feed.' + (d.regrow ? ' Regrows after picking.' : '');
          const l = document.createElement('i');
          l.appendChild(mkIcon('clock', 2));
          l.appendChild(document.createTextNode(GAME.fmtTime(d.grow / (1 + 0.15 * GAME.lvl('farming')))));
          l.appendChild(mkIcon('seed', 2));
          l.appendChild(document.createTextNode(String(GAME.harvestYield(k))));
          l.appendChild(mkIcon('basket', 2));
          l.appendChild(document.createTextNode(String(GAME.seedCount(k))));
          card.appendChild(l);
        } else {
          const l = document.createElement('i');
          l.textContent = 'research ' + (SKILL_BY_ID[d.needs] ? SKILL_BY_ID[d.needs].name : d.needs) + ' in the Lab';
          card.appendChild(l);
        }
        grid.appendChild(card);
      });
      box.appendChild(grid);
      const facts = document.createElement('div');
      facts.className = 'tally';
      [['sprout', st.stats.planted, 'Seeds planted'], ['scythe', st.stats.harvested, 'Harvests'],
       ['seed', GAME.fmt(st.stats.feedMade), 'Feed made'], ['chick', st.stats.grown, 'Chicks raised'],
       ['road', GAME.paintedCells(), 'Ground painted']].forEach(([ic, v, tip]) => {
        const cell = document.createElement('div');
        cell.title = tip;
        cell.appendChild(mkIcon(ic, 3));
        const n = document.createElement('b');
        n.textContent = String(v);
        cell.appendChild(n);
        facts.appendChild(cell);
      });
      box.appendChild(facts);

    } else if (indexTab === 'routes') {
      const st = S();
      $('#pedia-sub').textContent = st.stats.trips + ' TRIPS - ' + st.routes.length + ' / ' + CITIES.length + ' CITIES';
      const intro = document.createElement('p');
      intro.className = 'pedia-intro';
      intro.textContent = 'Bigger wheels carry more. Farther cities pay more.';
      box.appendChild(intro);
      const vr = document.createElement('div');
      vr.className = 'veh-row book';
      VEHICLES.forEach((veh, i) => {
        const card = document.createElement('div');
        card.className = 'veh-card' + (i === st.vehicle ? ' current' : i < st.vehicle ? ' owned' : ' locked');
        card.appendChild(cloneCanvas(SPR.vehicleSprite(veh.id, 0, 2)));
        const nm = document.createElement('b'); nm.textContent = i <= st.vehicle ? veh.name.toUpperCase() : '???'; card.appendChild(nm);
        const l = document.createElement('span'); l.textContent = i <= st.vehicle ? veh.cap + ' eggs' : GAME.fmt(veh.cost) + ' coins'; card.appendChild(l);
        vr.appendChild(card);
      });
      box.appendChild(vr);
      const list = document.createElement('div');
      list.className = 'route-list book';
      CITIES.forEach(c => {
        const open = st.routes.includes(c.id);
        const card = document.createElement('div');
        card.className = 'route-card' + (open ? (st.route === c.id ? ' active' : ' open') : ' locked');
        card.appendChild(cloneCanvas(SPR.skylineSprite(c.sky, 64, 30, 2)));
        const mid = document.createElement('div');
        mid.className = 'rc-mid';
        const nm = document.createElement('b'); nm.textContent = open ? c.name.toUpperCase() : '???'; mid.appendChild(nm);
        const l1 = document.createElement('span'); l1.textContent = open ? c.pop + ', pays x' + c.mult.toFixed(2) : 'a route to open at the depot'; mid.appendChild(l1);
        const l3 = document.createElement('i'); l3.textContent = open ? c.desc : ''; mid.appendChild(l3);
        card.appendChild(mid);
        list.appendChild(card);
      });
      box.appendChild(list);

    } else if (indexTab === 'secrets') {
      const found = SECRETS.filter(s => GAME.secretFound(s.id)).length;
      $('#pedia-sub').textContent = found + ' / ' + SECRETS.length + ' SECRETS';
      const intro = document.createElement('p');
      intro.className = 'pedia-intro';
      intro.textContent = 'Things the ranch never tells you to do. Each pays out once, the moment it happens.';
      box.appendChild(intro);
      const grid = document.createElement('div');
      grid.className = 'egg-grid secrets';
      SECRETS.forEach(s => {
        const ok = GAME.secretFound(s.id);
        const card = document.createElement('div');
        card.className = 'egg-card' + (ok ? '' : ' unknown');
        card.appendChild(mkIcon(ok ? s.icon : 'quest', 3));
        const mid = document.createElement('div');
        const b = document.createElement('b'); b.textContent = ok ? s.name : '???'; mid.appendChild(b);
        const sp = document.createElement('span'); sp.textContent = ok ? s.desc : 'Not found yet.'; mid.appendChild(sp);
        const rw = document.createElement('i');
        rw.textContent = [s.rw.c ? s.rw.c + ' coins' : '', s.rw.f ? s.rw.f + ' feathers' : ''].filter(Boolean).join(', ');
        mid.appendChild(rw);
        card.appendChild(mid);
        grid.appendChild(card);
      });
      box.appendChild(grid);
    } else if (indexTab === 'ledger') {
      renderLedger(box);
    } else if (indexTab === 'eggs') {
      $('#pedia-sub').textContent = 'EGG VALUES';
      const intro = document.createElement('p');
      intro.className = 'pedia-intro';
      intro.textContent = 'Every egg hatches and sells. Golden ones pay five times.';
      box.appendChild(intro);
      const grid = document.createElement('div');
      grid.className = 'egg-grid';
      TIERS.forEach((tier, t) => {
        const card = document.createElement('div');
        card.className = 'egg-card';
        card.appendChild(cloneCanvas(SPR.eggSprite(t, 2, t === TIER_SECRET)));
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
                      secret: 'key', age: 'scroll', food: 'pan', park: 'ticket', fossil: 'fossil', rank: 'medal', moon: 'moon', world: 'globe',
                      shape: 'hoe', quest: 'star', storey: 'rack', order: 'doc', genes: 'dna',
                      flyer: 'doc', applicants: 'hands', farm: 'sprout', grown: 'chick', wheels: 'truck', route: 'city' };
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
    const ward = GAME.wardenAt(x, y);
    if (ward) {
      if (S().tool === 'inspect') { setInspect({ kind: 'warden' }); return true; }
      const f = GAME.tapWarden();
      if (f) {
        snd.grand();
        puff(ward.x + 6, ward.y - 10, '#e8721c', 12, 40, 30);
        coinBurst(ward.x + 6, ward.y - 8, 6); twinkles(ward.x + 6, ward.y - 6, 7, '#ffd23f', 16);
        ring(ward.x + 6, ward.y + 6, 'rgba(255,210,63,1)', 26, 0.34); shake(0.8, 0.16);
        floatWorld('HUSH MONEY +' + f, ward.x + 6, ward.y - 30, 'gold', 'feather');
      } else { snd.plop(); heart(ward.x + 6, ward.y - 12, 1); }
      return true;
    }
    const boss = GAME.bossAt(x, y);
    if (boss) {
      if (S().tool === 'inspect') { setInspect({ kind: 'boss' }); return true; }
      GAME.bossTap();
      snd.pet();
      heart(boss.x + 14, boss.y - 8, 1);
      twinkles(boss.x + 14, boss.y + 10, 6, '#fff8ec', 16);
      shake(0.5, 0.12);
      questSig = '';
      return true;
    }
    const st = GAME.inStation(x, y, 5);
    if (st === 'lab') { renderSkills(); openModal('#modal-skills'); snd.build(); return true; }
    if (st === 'stand') { renderPedia(); openModal('#modal-pedia'); snd.build(); return true; }
    if (st === 'depot') { if (window.WMAP) WMAP.open(); else { renderDepot(); openModal('#modal-depot'); } snd.build(); return true; }
    if (st === 'brand') { openCompany(); snd.build(); return true; }
    const fos = GAME.fossilAt(x, y);
    if (fos && GAME.collectFossil(fos)) { snd.sparkle(); floatWorld('FOSSIL', x, y - 14, 'gold', 'fossil'); return true; }
    const gift = GAME.presentAt(x, y);
    if (gift) {
      const rw = GAME.openPresent(gift);
      if (rw) {
        snd.grand(); puff(gift.x, gift.y - 8, S().company.col2, 16, 60, 40); coinBurst(gift.x, gift.y - 6, rw.c ? 10 : 3);
        shards(gift.x, gift.y - 4, 8, S().company.col2, 80); ring(gift.x, gift.y + 4, 'rgba(255,255,255,1)', 34, 0.36);
        twinkles(gift.x, gift.y - 6, 9, '#fff8ec', 20); shake(1.2, 0.24); flash('#fff8ec', 0.12, 0.16);
        if (rw.c) floatWorld('+' + GAME.fmt(rw.c), gift.x, gift.y - 22, 'gold', 'coin');
        if (rw.f) floatWorld('+' + rw.f + ' FEATHERS', gift.x, gift.y - 34, 'green', 'feather');
        if (rw.cos && rw.cos.length) floatWorld('NEW OUTFIT', gift.x, gift.y - 46, 'pink', 'star');
      }
      return true;
    }
    const lm = GAME.limo;
    if (lm && x > lm.x - 4 && x < lm.x + 44 && y > lm.y - 8 && y < lm.y + 18) { snd.engine(); floatWorld('HONK HONK', x, y - 14, 'gold'); return true; }
    const mv = GAME.movers.van;
    if (mv && x > mv.x - 4 && x < mv.x + 44 && y > mv.y - 8 && y < mv.y + 20) {
      if (GAME.findSecret('vanmover')) snd.grand(); else { snd.engine(); floatWorld('HONK', x, y - 14, 'gold'); }
      return true;
    }
    const ord = GAME.orderAt(x, y);
    if (ord) { setInspect({ kind: 'order', ref: ord }); snd.plop(); return true; }
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
        ring(x, y, 'rgba(255,210,63,1)', 90, 0.6, 2); ring(x, y, 'rgba(255,255,255,1)', 60, 0.45);
        beam(x, y, '#ffd23f', 80, 0.9); twinkles(x, y, 12, '#fff8ec', 34);
        flash('#ffe9a8', 0.16, 0.26); shake(1.8, 0.4); holdFrame(0.08);
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
    if (o && o.type === 'hr' && S().tool !== 'build') { if (window.HR) HR.open(); snd.build(); return true; }
    if (o && o.type === 'cannery' && S().tool !== 'build') { setInspect({ kind: 'build', ref: o }); snd.plop(); return true; }
    if (o && o.type === 'lovenest' && S().tool === 'hand' && !S().held) {
      if (GAME.ejectNest(o.k)) { snd.plop(); return true; }
    }
    if (o && o.type === 'genelab' && S().tool !== 'build') { openGenes(); snd.build(); return true; }
    if (o && o.type === 'billboard' && S().tool !== 'build') { openPoster(o.k); snd.build(); return true; }
    if (o && (o.type === 'kitchen' || o.type === 'park' || o.type === 'timemachine') && S().tool !== 'build') { setInspect({ kind: 'build', ref: o }); snd.plop(); return true; }
    if (o && o.type === 'site' && S().tool !== 'build') { setInspect({ kind: 'build', ref: o }); return true; }
    return false;
  }

  /* the inspect tool: tap anything to read its stats */
  function inspectAt(x, y) {
    if (GAME.bossAt(x, y)) { setInspect({ kind: 'boss' }); return; }
    const w = staffAt(x, y);
    if (w) { setInspect({ kind: 'staff', ref: w }); return; }
    const ch = chickenAt(x, y);
    if (ch) { setInspect({ kind: 'chicken', ref: ch }); return; }
    if (overMama(x, y)) { setInspect({ kind: 'mama' }); return; }
    const ap = GAME.applicantAt(x, y);
    if (ap) { setInspect({ kind: 'applicant', ref: ap }); return; }
    const ord = GAME.orderAt(x, y);
    if (ord) { setInspect({ kind: 'order', ref: ord }); return; }
    const o = GAME.occAt(Math.floor(x / 16), Math.floor(y / 16));
    if (o) { setInspect({ kind: 'build', ref: o }); return; }
    const sk = Math.floor(x / 16) + ',' + Math.floor(y / 16);
    if (S().soil[sk]) { setInspect({ kind: 'soil', ref: sk }); return; }
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
      if (buildSel) { paintTile = null; dimPalettes(true); handlePlaceAt(p.x, p.y, false); ptr.mode = 'place'; }
      return;
    }
    if (tool === 'feed') { trySprinkle(p.x, p.y); ptr.mode = 'feed'; return; }
    if (tool === 'farm') { farmTile = null; lastPaint = null; dimPalettes(true); handleFarmAt(p.x, p.y); ptr.mode = 'farm'; return; }
    if (tool === 'inspect') { ptr.mode = 'inspect'; return; }
    if (tool === 'basket') { ptr.mode = 'sweep'; sweepGold = 0; return; }
    if (S().held) { ptr.mode = 'carry'; return; }
    cand = { ch: chickenAt(p.x, p.y), egg: eggAt(p.x, p.y), app: GAME.applicantAt(p.x, p.y),
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
      if (cand && cand.app) ptr.mode = 'pan';
      else if (cand && cand.ch && GAME.grabChicken(cand.ch)) { snd.squawk(); ptr.mode = 'carry'; heldSince = performance.now(); }
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
    else if (ptr.mode === 'farm') handleFarmAt(ptr.x, ptr.y);
  });

  function endPointer(ev) {
    if (!ptr.down) return;
    ptr.down = false;
    lastPaint = null;
    dimPalettes(false);
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
        const pet = GAME.petMama();
        if (pet === 'hungry') {
          petFx.set('mama', performance.now());
          floatWorld('FEED ME', W.mama.x, W.mama.y - 30, 'pink', 'seed');
          snd.error();
        } else if (pet) {
          petFx.set('mama', performance.now());
          heart(W.mama.x, W.mama.y - 22, 3); twinkles(W.mama.x, W.mama.y - 8, 5, '#ffd6e8', 14); snd.pet();
        }
        return;
      }
      if (cand.app) { setInspect({ kind: 'applicant', ref: cand.app }); snd.plop(); return; }
      {
        const tc = Math.floor(x / 16), trr = Math.floor(y / 16);
        const soil = S().soil[tc + ',' + trr];
        if (soil && GAME.ripe(soil)) { if (!GAME.harvest(tc, trr)) { snd.error(); floatWorld('NEEDS THE SICKLE', x, y - 14, 'pink', 'lock'); } return; }
      }
      if (cand.ch) {
        if (GAME.petChicken(cand.ch)) {
          petFx.set(cand.ch.id, performance.now());
          heart(cand.ch.x + 10, cand.ch.y - 4, 2);
          twinkles(cand.ch.x + 10, cand.ch.y + 4, 4, '#ffd6e8', 11);
          feathers(cand.ch.x + 10, cand.ch.y + 2, 2);
          snd.pet();
        }
        return;
      }
      if (cand.plume) {
        const v = GAME.collectPlume(cand.plume);
        if (v) { snd.plume(); floatWorld('+' + v, x, y - 8, 'green', 'feather'); }
        return;
      }
      {
        /* a butterfly, if you are quick */
        const fly = flies.find(f => Math.abs(f.x - x) < 6 && Math.abs(f.y - y) < 6);
        if (fly) {
          puff(fly.x, fly.y, fly.col, 6, 20, 16); twinkles(fly.x, fly.y, 5, fly.col, 10);
          if (GAME.findSecret('butterfly')) snd.grand(); else snd.plume(); return;
        }
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
        const ord = GAME.orderAt(x, y);
        if (ord) {
          const n = GAME.basketToOrder(ord);
          if (n) { for (let i = 0; i < Math.min(n, 6); i++) setTimeout(() => snd.clink(), i * 60); floatWorld('+' + n + ' HANDED OVER', ord.x + 14, ord.y - 30, 'green'); }
          else floatWorld('WANTS ' + TIERS[ord.tier].n.toUpperCase() + '+', ord.x + 14, ord.y - 30, 'pink');
          updateCursorChip();
          return;
        }
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
        if (o && o.type === 'kitchen') {
          const n = GAME.basketToKitchen(o.k);
          if (n) { snd.plop(); floatWorld('+' + n + ' TO THE LARDER', x, y - 12, 'green', 'pan'); }
          else floatWorld('LARDER FULL', x, y - 12, 'pink');
          updateCursorChip();
          return;
        }
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
  window.addEventListener('resize', () => requestAnimationFrame(() => { sizeStage(); syncCamPad(); }));
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => requestAnimationFrame(() => { sizeStage(); syncCamPad(); }));
    const row = $('#stage-row'); if (row) ro.observe(row);
  }
  /* the dock shelf runs sideways, so let a plain wheel roll it along */
  [el.palette, el.farmPalette].forEach(dock => {
    dock.addEventListener('wheel', ev => {
      const shelf = ev.target.closest('.dock-shelf');
      if (!shelf || shelf.scrollWidth <= shelf.clientWidth) return;
      ev.preventDefault();
      shelf.scrollLeft += (Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY);
    }, { passive: false });
  });
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
    else if (result === 'ordered') { snd.clink(); floatWorld('HANDED OVER', x, y - 14, 'green'); }
    else if (result === 'loaded') snd.clink();
    else if (result === 'exhibited') { snd.grand(); floatWorld('ON SHOW', x, y - 14, 'gold', 'ticket'); }
    else if (result === 'roasting') { snd.build(); puff(x, y - 6, '#fff8ec', 8, 30, 26); floatWorld('INTO THE POT', x, y - 14, 'gold', 'pan'); }
    else if (result === 'pantry') { snd.plop(); floatWorld('LARDER', x, y - 12, 'green', 'pan'); }
    else if (result === 'park-full') { snd.error(); floatWorld('PARK FULL', x, y - 14, 'pink'); }
    else if (result === 'park-nodino') { snd.error(); floatWorld('NEEDS A DINO PEN', x, y - 14, 'pink', 'lock'); }
    else if (result === 'park-chick') { snd.error(); floatWorld('TOO YOUNG', x, y - 14, 'pink'); }
    else if (result === 'kitchen-busy') { snd.error(); floatWorld('OVEN BUSY', x, y - 14, 'pink'); }
    else if (result === 'kitchen-locked') { snd.error(); floatWorld('NEEDS A RECIPE', x, y - 14, 'pink', 'lock'); }
    else snd.plop();
  }
  /* while you are actually drawing, the palette gets out of the way */
  function dimPalettes(on) {
    el.palette.classList.toggle('dim', !!on);
    el.farmPalette.classList.toggle('dim', !!on);
  }
  let farmTile = null, lastPaint = null;
  function brushPx() { return S().brush * GAME.CELL_PX * 0.5 + 3; }
  function handleFarmAt(wx, wy) {
    const sel = farmPick();
    const miss = () => { if (ptr.moved < 4) snd.error(); };

    /* --- the brush: a continuous stroke, not a tile at a time --- */
    if (sel.kind === 't') {
      const r = brushPx();
      const a = lastPaint || { x: wx, y: wy };
      const n = sel.id === 'soil'
        ? GAME.tillStroke(a.x, a.y, wx, wy, r)
        : GAME.stroke(sel.id, a.x, a.y, wx, wy, r);
      lastPaint = { x: wx, y: wy };
      if (n) {
        terrainTouched(a.x, a.y, wx, wy, r + 16);
        if (!brushSnd || performance.now() - brushSnd > 90) { brushSnd = performance.now(); snd.sprinkle(); }
        if (sel.id === 'soil') renderFarmPalette();
      } else miss();
      return;
    }

    /* --- everything else still works a tile at a time --- */
    const c = Math.floor(wx / 16), r2 = Math.floor(wy / 16);
    const k = c + ',' + r2;
    if (farmTile === k) return;
    farmTile = k;
    if (sel.kind === 'd') {
      if (GAME.decorate(sel.id, c, r2)) renderFarmPalette();
      else miss();
      return;
    }
    if (sel.kind === 'c') {
      if (GAME.plant(c, r2, sel.id)) renderFarmPalette();
      else miss();
      return;
    }
    if (sel.id === 'water') { if (GAME.water(c, r2)) snd.sprinkle(); return; }
    if (sel.id === 'harvest') { if (GAME.harvest(c, r2)) snd.plop(); return; }
    if (sel.id === 'clear') {
      if (GAME.undecorate(c, r2)) { snd.demolish(); renderFarmPalette(); return; }
      if (GAME.untill(c, r2)) { snd.demolish(); terrainTouched(wx, wy, wx, wy, 24); renderFarmPalette(); return; }
      /* nothing loose here: rub the paint out with the brush instead */
      const rr = brushPx();
      if (GAME.stroke('flat', wx, wy, wx, wy, rr)) { terrainTouched(wx, wy, wx, wy, rr); snd.demolish(); }
    }
  }
  let brushSnd = 0;
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

  let typed = '';
  window.addEventListener('keydown', ev => {
    keys[ev.key.toLowerCase()] = true;
    if (ev.key.length === 1 && !(ev.target && ev.target.tagName === 'INPUT')) { typed = (typed + ev.key.toLowerCase()).slice(-3); if (typed === 'egg') GAME.findSecret('typist'); }
    if (ev.key === 'r' || ev.key === 'R') { placeDir = (placeDir + 1) % 4; GAME.mark('build'); }
    if (ev.key === 'Escape') { closeModals(); buildSel = null; GAME.mark('build'); }
    if (ev.key === '1') setTool('hand');
    if (ev.key === '2') setTool('basket');
    if (ev.key === '3') setTool('feed');
    if (ev.key === '4') setTool('farm');
    if (ev.key === '5') setTool('build');
    if (ev.key === '6') setTool('inspect');
  });
  window.addEventListener('keyup', ev => { keys[ev.key.toLowerCase()] = false; });

  function setTool(t) {
    if (S().tool === t) return;
    if (!GAME.toolOpen(t)) {
      snd.error();
      const sk = SKILL_BY_ID[TOOL_UNLOCK[t]];
      toast({ icon: 'lock', title: TOOL_LABEL[t] + ' IS LOCKED', body: 'Install ' + sk.name + ' in the Lab (' + sk.base + ' feathers).' });
      return;
    }
    S().tool = t;
    if (t === 'build' && !buildSel) buildSel = 'incubator';
    renderToolbelt(); renderPalette(); updateCursorChip();
    snd.plop();
  }

  document.getElementById('app').addEventListener('click', ev => {
    const toolBtn = ev.target.closest('[data-tool]');
    if (toolBtn) { setTool(toolBtn.dataset.tool); return; }
    const secBtn = ev.target.closest('[data-palsec]');
    if (secBtn) { palSec = secBtn.dataset.palsec; buildSel = null; GAME.mark('build'); snd.plop(); return; }
    const brushBtn = ev.target.closest('[data-brush]');
    if (brushBtn) { S().brush = +brushBtn.dataset.brush; renderFarmPalette(); snd.plop(); return; }
    const fsec = ev.target.closest('[data-farmsec]');
    if (fsec) {
      farmSec = fsec.dataset.farmsec;
      const first = farmItems()[0];
      if (first) farmSel = first.id;
      renderFarmPalette(); updateCursorChip(); snd.plop();
      return;
    }
    const farmBtn = ev.target.closest('[data-farm]');
    if (farmBtn && !farmBtn.disabled) { farmSel = farmBtn.dataset.farm; renderFarmPalette(); updateCursorChip(); snd.plop(); return; }
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
      case 'start-game': { if (!S().company.done) startIntro(); else { hideTitle(); snd.sparkle(); } break; }
      case 'title': GAME.save(); showTitle(); $('#menu-pop').hidden = true; break;
      case 'open-quests': { if (window.QUESTS_UI) QUESTS_UI.open(); snd.build(); break; }
      case 'open-food': { if (window.FOODUI) FOODUI.open(btn.dataset.tab); snd.build(); break; }
      case 'open-garage': { if (window.GARAGE) GARAGE.open(); snd.build(); break; }
      case 'open-wmap': { if (window.WMAP) WMAP.open(); snd.build(); break; }
      case 'open-hr': { if (window.HR) HR.open(); snd.build(); break; }
      case 'open-settings': { if (window.MENU) MENU.openSettings(); $('#menu-pop').hidden = true; snd.build(); break; }
      case 'open-wardrobe': { if (window.MENU) MENU.openWardrobe(); $('#menu-pop').hidden = true; snd.build(); break; }
      case 'open-ach': { if (window.MENU) MENU.openAch(); $('#menu-pop').hidden = true; snd.build(); break; }
      case 'crew': {
        if (GAME.hasHR() && window.HR) HR.open();
        else { renderHire(); openModal('#modal-hire'); }
        $('#menu-pop').hidden = true;
        snd.build();
        break;
      }
      case 'open-lab': { renderSkills(); openModal('#modal-skills'); snd.build(); break; }
      case 'open-book': { renderPedia(); openModal('#modal-pedia'); snd.build(); break; }
      case 'open-mama': {
        setInspect({ kind: 'mama' });
        GAME.S.cam.x = W.mama.x - W.view.w / 2;
        GAME.S.cam.y = W.mama.y - W.view.h / 2;
        GAME.clampCam();
        snd.build();
        break;
      }
      case 'send-flyers': {
        if (GAME.sendFlyers()) {
          snd.build();
          toast({ icon: 'doc', title: 'FLYERS UP', body: 'folk are on their way' });
        } else snd.error();
        refreshCrewViews();
        break;
      }
      case 'hire-applicant': {
        if (GAME.hireApplicant(+btn.dataset.id, btn.dataset.role)) {
          snd.skill();
          const w = S().staff[S().staff.length - 1];
          toast({ icon: ROLES[btn.dataset.role].icon, title: w.name.toUpperCase(),
                  body: ROLES[btn.dataset.role].name });
        } else snd.error();
        refreshCrewViews();
        break;
      }
      case 'assemble': {
        if (GAME.assembleBot(btn.dataset.role)) {
          snd.skill();
          toast({ icon: ROLES[btn.dataset.role].icon,
                  title: (BOTS[btn.dataset.role] || ROLES[btn.dataset.role]).name.toUpperCase(),
                  body: ROLES[btn.dataset.role].name });
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
      case 'index-tab': { indexTab = btn.dataset.tab; flipBook(); renderPedia(); break; }
      case 'harvest-here': { const [c, r] = btn.dataset.k.split(',').map(Number); if (!GAME.harvest(c, r)) snd.error(); refreshInspect(); break; }
      case 'untill-here': { const [c, r] = btn.dataset.k.split(',').map(Number); if (GAME.untill(c, r)) { snd.demolish(); setInspect({ kind: 'farm' }); } else snd.error(); break; }
      case 'open-depot': { if (window.WMAP) WMAP.open(); else { renderDepot(); openModal('#modal-depot'); } break; }
      case 'buy-vehicle': { if (GAME.buyVehicle()) renderDepot(); else snd.error(); break; }
      case 'buy-route': { if (GAME.buyRoute(btn.dataset.id)) renderDepot(); else snd.error(); break; }
      case 'set-route': { if (GAME.setRoute(btn.dataset.id)) { snd.plop(); renderDepot(); } else snd.error(); break; }
      case 'send-now': { if (GAME.sendTruck()) closeModals(); else snd.error(); break; }
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
      case 'add-storey': {
        if (GAME.addStorey(btn.dataset.k)) { snd.build(); refreshInspect(); } else snd.error();
        break;
      }
      case 'open-genes': { openGenes(btn.dataset.id ? +btn.dataset.id : null); snd.build(); break; }
      case 'open-world': { openWorld(); snd.build(); break; }
      case 'open-poster': { openPoster(btn.dataset.k); snd.build(); break; }
      case 'poster-col': { posterCol = +btn.dataset.i; renderPosterTools(); snd.plop(); break; }
      case 'poster-size': { posterSize = +btn.dataset.n; renderPosterTools(); snd.plop(); break; }
      case 'poster-preset': {
        posterArt = SPR.billboardPreset(btn.dataset.id, S().company).split('');
        GAME.setBillboardArt(posterKey, posterArt.join(''), false);
        drawPoster(); renderPosterTools(); snd.build();
        break;
      }
      case 'set-recipe': { if (GAME.setRecipe(btn.dataset.k, btn.dataset.id)) { snd.plop(); refreshInspect(); } else snd.error(); break; }
      case 'park-eject': { if (GAME.parkEject(btn.dataset.k, +btn.dataset.i)) { snd.plop(); ipSig = ''; renderInspect(); } else snd.error(); break; }
      case 'tm-load': { if (GAME.loadTM(btn.dataset.k)) { snd.grand(); refreshInspect(); } else snd.error(); break; }
      case 'open-ages': { termSel = (GAME.nextAge() || GAME.age()).id; renderSkills(); centerOn(termSel); openModal('#modal-skills'); snd.build(); break; }
      case 'gene-pick': { genePick(+btn.dataset.id); break; }
      case 'gene-splice': { geneMode = geneMode === 'splice' ? null : 'splice'; snd.plop(); break; }
      case 'gene-clone': {
        if (GAME.cloneChicken(+btn.dataset.id)) snd.grand(); else snd.error();
        break;
      }
      case 'gene-cross': {
        if (GAME.crossAnimal(+btn.dataset.id, btn.dataset.animal)) snd.grand(); else snd.error();
        break;
      }
      case 'open-company': { openCompany(); $('#menu-pop').hidden = true; break; }
      case 'company-logo': { companyDraft.logo = btn.dataset.logo; renderCompanyForm(); snd.plop(); break; }
      case 'company-col1': { companyDraft.col1 = btn.dataset.col; renderCompanyForm(); snd.plop(); break; }
      case 'company-col2': { companyDraft.col2 = btn.dataset.col; renderCompanyForm(); snd.plop(); break; }
      case 'company-pair': { companyDraft.col1 = btn.dataset.c1; companyDraft.col2 = btn.dataset.c2; renderCompanyForm(); snd.plop(); break; }
      case 'company-save': { saveCompany(); break; }
      case 'company-sigclear': { sigPts = []; redrawPad(); snd.plop(); break; }
      case 'intro-next': { introNext(); break; }
      case 'intro-skip': { introSkip(); break; }
      case 'quest-card': {
        const cq = GAME.currentQuest();
        termSel = cq ? cq.id : null;
        renderSkills(); openModal('#modal-skills'); snd.build();
        break;
      }
      case 'buy-stock': { if (GAME.buyStock(btn.dataset.id, +btn.dataset.n)) { snd.clink(); renderPedia(); } else snd.error(); break; }
      case 'sell-stock': { if (GAME.sellStock(btn.dataset.id, +btn.dataset.n)) { snd.clink(); renderPedia(); } else snd.error(); break; }
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
      case 'mute': GAME.setSetting('sound', !GAME.setting('sound')); break;
      case 'save': GAME.save(); floatText('SAVED', ev.clientX - 20, ev.clientY - 24, 'green'); break;
      case 'reset':
        if (confirm('Reset everything? The chickens will write memoirs.')) {
          GAME.reset(); reloadWorld(); closeModals();
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
    feathers(x, y - 6, 4 + births.length * 2);
    ring(x, y + 4, 'rgba(255,255,255,1)', 30, 0.36); twinkles(x, y - 4, 7, '#fff8ec', 16);
    shake(0.8, 0.18);
    if (rainbow) {
      puff(x, y - 10, '#ff5fd0', 16, 64, 42); snd.grand();
      beam(x, y, '#ff5fd0', 70, 0.9); flash('#ffb0e8', 0.18, 0.28); shake(2, 0.4);
      twinkles(x, y - 8, 14, '#ff8ae0', 30); holdFrame(0.08);
    }
    if (births.length > 1) floatWorld('TWINS', x, y - 24, 'pink');
  });
  GAME.on('breed', ({ x, y, rainbow, tier }) => {
    snd.breed();
    heart(x, y - 10, 6);
    floatWorld(rainbow ? 'RAINBOW EGG' : TIERS[tier].n + ' EGG', x, y - 18, rainbow ? 'pink' : 'green');
    twinkles(x, y - 6, 5, rainbow ? '#ff8ae0' : '#ffd6e8', 13);
    if (rainbow) { puff(x, y - 6, '#ff5fd0', 14, 54, 38); beam(x, y, '#ff5fd0', 56, 0.8); shake(1.2, 0.24); }
  });
  GAME.on('sell', ({ pay, n }) => {
    snd.coin();
    coinBurst(W.truckHome.x + 26, W.truckHome.y - 4, n);
    twinkles(W.truckHome.x + 26, W.truckHome.y - 6, 6, '#ffd23f', 18);
    ring(W.truckHome.x + 26, W.truckHome.y + 6, 'rgba(255,210,63,1)', 30, 0.34);
    beam(W.truckHome.x + 26, W.truckHome.y, '#ffd23f', 44, 0.7);
    shake(Math.min(1.6, 0.5 + n * 0.05), 0.2);
    floatWorld('+' + GAME.fmt(pay), W.truckHome.x + 20, W.truckHome.y - 22, 'gold', 'coin');
  });
  GAME.on('depart', ({ n, to }) => {
    snd.engine();
    puff(W.truckHome.x - 4, W.roadY + 8, '#c9a35f', 9, 44, 16);
    smoke(W.truckHome.x - 6, W.roadY + 6, 5, 'rgba(190,186,180,1)', 16);
    floatWorld('TO ' + to.name.toUpperCase(), W.truckHome.x + 20, W.roadY - 26, 'gold');
  });
  GAME.on('home', () => {
    puff(W.truckHome.x + 30, W.roadY + 8, '#c9a35f', 6, 30, 12);
    smoke(W.truckHome.x + 32, W.roadY + 6, 4, 'rgba(190,186,180,1)', 14);
    groundDust(W.truckHome.x + 26, W.roadY + 10, 5, '#c9a878');
  });
  GAME.on('quest', ({ q }) => {
    snd.grand(); questSig = '';
    const b = GAME.boss();
    if (b) { twinkles(b.x + 14, b.y + 8, 10, '#ffd23f', 26); coinBurst(b.x + 14, b.y - 4, 8); beam(b.x + 14, b.y + 30, '#ffd23f', 70, 0.8); }
    flash('#ffe9a8', 0.14, 0.22); shake(1.4, 0.3); holdFrame(0.07);
  });
  GAME.on('questready', ({ q }) => { snd.sparkle(); const b = GAME.boss(); if (b) { heart(b.x + 14, b.y - 8, 3); twinkles(b.x + 14, b.y + 4, 6, '#ffd23f', 18); } floatText('QUEST READY: ' + q.name.toUpperCase(), innerWidth / 2 - 90, 90, 'gold', 'quest'); });
  GAME.on('limo', ({ state, x, y }) => {
    if (state === 'here') {
      snd.engine(); floatWorld('A DELIVERY', x + 20, y - 18, 'gold', 'star');
      groundDust(x + 20, y + 14, 10, '#c9a878'); smoke(x + 2, y + 10, 4, 'rgba(190,186,180,1)', 14);
      shake(0.9, 0.24);
    } else if (state === 'coming') snd.engine();
  });
  GAME.on('present', ({ p, state }) => {
    if (state === 'dropped') {
      snd.plop(); puff(p.x, p.y - 4, '#c9a35f', 6, 24, 14);
      groundDust(p.x, p.y + 2, 6); ring(p.x, p.y + 2, 'rgba(255,255,255,1)', 18, 0.26); shake(0.6, 0.14);
    }
  });
  GAME.on('achievement', ({ a }) => {
    snd.grand();
    floatText('ACHIEVEMENT: ' + a.name.toUpperCase(), innerWidth / 2 - 100, 130, 'pink', 'medal');
    const cx = cam().x + W.view.w / 2, cy = cam().y + W.view.h / 2;
    twinkles(cx, cy - 20, 16, '#ff8ac0', 70); flash('#ffd0e8', 0.14, 0.3); shake(1.2, 0.3);
  });
  GAME.on('canned', ({ id, x, y }) => { puff(x, y, GOODS[id].col, 6, 24, 20); bubbles(x, y - 2, 4, '#cfe8f5'); smoke(x, y - 6, 3, 'rgba(255,255,255,1)', 18); floatWorld(GOODS[id].name.toUpperCase(), x, y - 10, 'green', GOODS[id].icon); snd.clink(); });
  GAME.on('produce', ({ c, r, id, n }) => { floatWorld('+' + n + ' ' + PRODUCE[id].name.toUpperCase(), c * 16 + 8, r * 16 - 18, 'gold', 'crate'); });
  GAME.on('eat', ({ ch, prem }) => { if (GAME.setting('particles')) puff(ch.x + 10, ch.y + 14, prem ? '#ffd23f' : '#e8b84c', prem ? 6 : 3, 16, 12); });
  GAME.on('soldfood', ({ got }) => { snd.coin(); });
  GAME.on('factory', ({ city }) => { snd.grand(); });
  GAME.on('upgrade', () => { snd.skill(); });
  GAME.on('train', ({ w, stat }) => { snd.sparkle(); floatWorld('+1 ' + STATS[stat].name, w.x + 6, w.y - 10, 'green', STATS[stat].icon); });
  GAME.on('warden', ({ x, y }) => {
    snd.demolish();
    puff(x + 6, y - 4, '#8a5e2a', 12, 40, 22);
    puff(x + 6, y - 10, '#7fbf4f', 8, 34, 26);
    shards(x + 6, y - 2, 9, '#8a5e2a', 70); groundDust(x + 6, y + 6, 10, '#a07444');
    ring(x + 6, y + 6, 'rgba(255,255,255,1)', 30, 0.34); shake(1.6, 0.34);
    floatWorld('THE WARDEN', x + 6, y - 34, 'pink', 'tree');
  });
  GAME.on('hatchick', ({ x, y }) => {
    snd.hatch(); snd.sparkle();
    puff(x, y, '#fff8ec', 14, 46, 34);
    feathers(x, y - 4, 6); twinkles(x, y - 4, 9, '#fff8ec', 18); beam(x, y + 6, '#fff8ec', 46, 0.8);
    flash('#ffffff', 0.12, 0.18); shake(1, 0.22);
    floatWorld('OUT OF THE HAT', x, y - 20, 'gold', 'chick');
  });
  GAME.on('slot', () => { reloadWorld(); });
  GAME.on('settings', ({ k, v }) => { if (k === 'bigUI') document.body.classList.toggle('big-ui', !!v); });
  GAME.on('customer', ({ o }) => { snd.plop(); floatWorld(o.who + ': ' + o.n + ' EGGS', o.x + 14, o.y - 28, 'gold', 'doc'); });
  GAME.on('orderdone', ({ o }) => { snd.grand(); puff(o.x + 14, o.y, '#ffd23f', 10, 34, 26); coinBurst(o.x + 14, o.y - 2, 7); twinkles(o.x + 14, o.y, 6, '#ffd23f', 16); shake(0.9, 0.2); floatWorld('+' + GAME.fmt(o.pay), o.x + 14, o.y - 30, 'gold', 'coin'); });
  GAME.on('ordermiss', ({ o }) => { snd.error(); puff(o.x + 14, o.y + 4, '#8a8f98', 6, 24, 14); smoke(o.x + 8, o.y + 6, 4, 'rgba(160,160,168,1)', 14); groundDust(o.x + 14, o.y + 12, 6); floatWorld('DROVE OFF', o.x + 14, o.y - 26, 'pink'); });
  GAME.on('site', ({ type, c, r, kind }) => { snd.build(); if (c !== undefined) floatWorld(kind === 'storey' ? 'MOVERS CALLED' : 'MOVERS CALLED', c * 16 + 16, r * 16 - 12, 'gold', 'hammer'); });
  GAME.on('movers', ({ state, x }) => { if (state === 'here') { snd.engine(); floatWorld('MOVERS', x + 20, W.roadY - 16, 'gold'); } else if (state === 'coming') snd.engine(); });
  GAME.on('built', ({ type, c, r, kind }) => {
    snd.grand();
    const b = BUILDS[type];
    const bx = c * 16 + b.w * 8, by = r * 16 + b.h * 8;
    puff(bx, by, '#e0bd82', 14, 40, 30);
    /* it lands: dust out sideways, chips of timber, a ring and a thump */
    groundDust(bx, r * 16 + b.h * 16 - 2, 16, '#c9a878');
    shards(bx, by, 10, '#a07444', 80);
    ring(bx, r * 16 + b.h * 16 - 2, 'rgba(255,255,255,1)', 16 + b.w * 12, 0.4, 2);
    smoke(bx, by - 4, 5, 'rgba(220,214,204,1)', 14);
    sparks(bx, by, 6, '#ffd23f', 70);
    shake(1.8, 0.36); holdFrame(0.07);
    floatWorld(kind === 'storey' ? 'SECOND FLOOR' : b.name.toUpperCase() + ' BUILT', c * 16 + b.w * 8, r * 16 - 14, 'green');
  });
  GAME.on('honey', ({ x, y, v }) => { floatWorld('+' + v, x, y - 6, 'gold', 'honey'); twinkles(x, y - 4, 3, '#ffd23f', 9); snd.clink(); });
  GAME.on('splice', ({ ch, x, y }) => { snd.grand(); puff(x, y, '#ff5f9e', 12, 34, 28); beam(x, y, '#ff5f9e', 54, 0.8); twinkles(x, y - 6, 8, '#ff8ac0', 18); flash('#ffd0e8', 0.1, 0.2); shake(1.1, 0.24); toast({ icon: 'dna', title: 'SPLICED', body: SPECIES[ch.sp].name + ' carries the best of both birds now.' }); });
  GAME.on('clone', ({ ch, x, y }) => { snd.grand(); puff(x, y, '#9fe8ff', 12, 34, 28); beam(x, y, '#9fe8ff', 54, 0.8); twinkles(x, y - 6, 8, '#cff4ff', 18); flash('#d8f4ff', 0.1, 0.2); shake(1.1, 0.24); bornFx.set(ch.id, performance.now()); toast({ icon: 'twins', title: 'CLONED', body: 'A second ' + SPECIES[ch.sp].name + ', genes and all.' }); });
  GAME.on('cross', ({ ch, animal, x, y }) => { snd.grand(); puff(x, y, '#ffd23f', 12, 34, 28); beam(x, y, '#ffd23f', 54, 0.8); twinkles(x, y - 6, 8, '#fff2b0', 18); shake(1.1, 0.24); toast({ icon: 'atom', title: 'CROSSED WITH A ' + animal.name.toUpperCase(), body: animal.desc }); });
  GAME.on('company', ({ c }) => { toast({ icon: c.logo, title: c.name, body: 'Filed and signed.' }); });
  GAME.on('rain', () => { snd.sprinkle(); });
  GAME.on('boss', () => { questSig = ''; });
  GAME.on('poster', ({ k, custom }) => {
    const [c, r] = k.split(',').map(Number);
    puff(c * 16 + 16, r * 16 - 6, '#ffd23f', 8, 30, 22);
    if (custom) floatWorld('PAINTED', c * 16 + 16, r * 16 - 18, 'gold', 'brush');
    GAME.bossSay(custom ? 'Now that is a poster. They will pull right in.' : 'A printed one. It will do until you paint me a better.', 6, 'stand');
  });
  GAME.on('region', ({ r }) => { toast({ icon: r.moon ? 'atom' : 'city', title: r.name.toUpperCase(), body: r.moon ? 'The rocket is away.' : 'Open for business.' }); });
  GAME.on('branch', ({ r, n }) => { floatText('+1 BRANCH', innerWidth / 2 - 40, 120, 'gold', 'house'); });
  GAME.on('secret', ({ s }) => { snd.grand(); flash('#fff8ec', 0.12, 0.24); shake(1, 0.24); toast({ icon: s.icon, title: 'SECRET: ' + s.name.toUpperCase(), body: s.desc, long: true }); });
  GAME.on('age', ({ a }) => {
    snd.grand(); ageFx = { t: performance.now(), a };
    const cx = cam().x + W.view.w / 2, cy = cam().y + W.view.h / 2;
    ring(cx, cy, a.hue || 'rgba(255,255,255,1)', 260, 0.9, 2);
    twinkles(cx, cy, 20, a.hue || '#fff8ec', 120);
    flash(a.hue || '#fff8ec', 0.22, 0.5); shake(2.6, 0.6); holdFrame(0.11); toast({ icon: a.icon, title: 'THE ' + a.name.toUpperCase(), body: a.blurb, long: true }); renderToolbelt(); });
  GAME.on('cooked', ({ recipe, x, y }) => { puff(x, y, '#fff8ec', 6, 24, 20); smoke(x, y - 4, 4, 'rgba(255,250,240,1)', 20); twinkles(x, y - 6, 3, '#ffd23f', 8); floatWorld(RECIPE_BY_ID[recipe].name.toUpperCase(), x, y - 10, 'green', 'pan'); snd.clink(); });
  GAME.on('dine', ({ x, y, v }) => { floatWorld('+' + GAME.fmt(v), x, y - 12, 'gold', 'coin'); snd.coin(); });
  GAME.on('ticket', ({ x, y, v }) => { floatWorld('+' + GAME.fmt(v), x, y - 12, 'gold', 'ticket'); snd.clink(); });
  GAME.on('bus', ({ n }) => { snd.engine(); });
  GAME.on('roast', ({ ch }) => { toast({ icon: 'pan', title: 'INTO THE POT', body: SPECIES[ch.sp].name + ' is the dish of the day.' }); });
  GAME.on('exhibit', ({ ch }) => { snd.sparkle(); });
  GAME.on('fossil', ({ x, y }) => { puff(x, y, '#e0cb98', 8, 30, 20); shards(x, y, 5, '#c9b07a', 50); twinkles(x, y - 4, 5, '#fff8ec', 12); floatWorld('A FOSSIL', x, y - 14, 'gold', 'fossil'); snd.sparkle(); });
  GAME.on('tmstart', () => { snd.engine(); });
  GAME.on('tmdone', ({ x, y }) => { snd.grand(); puff(x, y, '#9fe8ff', 18, 60, 40); ring(x, y, 'rgba(159,232,255,1)', 60, 0.5, 2); beam(x, y, '#9fe8ff', 70, 1); flash('#d8f4ff', 0.18, 0.3); shake(2, 0.4); floatWorld('FROM THE PAST', x, y - 20, 'gold', 'dino'); });
  GAME.on('rankup', ({ ch, rank }) => { floatWorld(RANKS[rank].n.toUpperCase(), ch.x + 10, ch.y - 12, 'gold', 'medal'); heart(ch.x + 10, ch.y - 6, 2); twinkles(ch.x + 10, ch.y, 7, '#ffd23f', 15); beam(ch.x + 10, ch.y + 12, '#ffd23f', 36, 0.7); snd.sparkle(); });
  GAME.on('moonegg', () => { snd.sparkle(); toast({ icon: 'moon', title: 'MOON EGG', body: 'Something came down by the Lab. Hatch it.' }); });
  GAME.on('rainend', () => { snd.sparkle(); });
  GAME.on('market', () => { if (!$('#modal-pedia').hidden && indexTab === 'ledger') GAME.mark('pedia'); });
  GAME.on('vehicle', ({ v }) => { snd.grand(); toast({ icon: 'truck', title: v.name.toUpperCase(), body: v.cap + ' eggs' }); });
  GAME.on('route', ({ city }) => { snd.grand(); toast({ icon: 'city', title: city.name.toUpperCase(), body: 'pays x' + city.mult.toFixed(2) }); });
  GAME.on('grown', ({ ch }) => { puff(ch.x + 10, ch.y + 6, '#fff8ec', 8, 30, 26); heart(ch.x + 10, ch.y - 4, 2); twinkles(ch.x + 10, ch.y, 6, '#fff8ec', 13); ring(ch.x + 10, ch.y + 12, 'rgba(255,255,255,1)', 20, 0.3); snd.sparkle(); bornFx.set(ch.id, performance.now()); });
  GAME.on('harvest', ({ c, r, crop, id, n }) => {
    const hx = c * 16 + 8, hy = r * 16 + 6;
    puff(hx, hy, crop.col, 10, 40, 30);
    shards(hx, hy, 5, crop.col, 60); twinkles(hx, hy - 4, 4, '#fff8ec', 10);
    groundDust(hx, hy + 8, 4, '#a07444');
    popNum(hx, hy - 14, '+' + n, '#7fc24f');
    if (id) fly(SPR.cropSprite(id, Math.max(1, (CROPS[id].stages || 3) - 1), 7, 1), hx, hy - 2, { life: 0.42, s1: 1.6, vy: -66 });
    floatWorld('+' + n + ' FEED', c * 16 + 8, r * 16 - 6, 'green', 'seed');
    snd.scoop();
  });
  GAME.on('ripe', ({ c, r }) => { puff(c * 16 + 8, r * 16 + 2, '#fff8ec', 4, 20, 20); glint(c * 16 + 8, r * 16, '#fff8ec', 3); });
  GAME.on('plant', ({ c, r }) => { puff(c * 16 + 8, r * 16 + 10, '#8a5e2a', 5, 26, 14); groundDust(c * 16 + 8, r * 16 + 12, 4, '#a07444'); snd.plop(); });
  GAME.on('water', ({ c, r }) => { puff(c * 16 + 8, r * 16 + 8, '#7fc4e8', 6, 28, 18); bubbles(c * 16 + 8, r * 16 + 8, 3, '#aee7ff'); ring(c * 16 + 8, r * 16 + 10, 'rgba(150,215,255,1)', 14, 0.3); });
  GAME.on('till', ({ c, r }) => { puff(c * 16 + 8, r * 16 + 8, '#a07444', 8, 34, 16); groundDust(c * 16 + 8, r * 16 + 10, 6, '#a07444'); shards(c * 16 + 8, r * 16 + 8, 3, '#7a5432', 40); terrainTouched(c * 16 + 8, r * 16 + 8, c * 16 + 8, r * 16 + 8, 20); });
  GAME.on('graduate', ({ sp }) => {
    toast({ sprite: cloneCanvas(SPR.chickenSprite(sp, 2, false)), title: sp.name + ' GRADUATED', body: 'She joins the lab team. Feathers dropped!' });
  });
  GAME.on('feedeat', ({ x, y }) => { puff(x, y, '#f2c94c', 4, 18, 14); heart(x, y - 6, 1); });
  GAME.on('land', () => { GAME.mark('ground'); });
  GAME.on('paint', ({ x0, y0, x1, y1, radius }) => { terrainTouched(x0, y0, x1, y1, radius); });
  GAME.on('polish', ({ x, y }) => { puff(x, y - 4, '#fff8ec', 3, 16, 12); glint(x, y - 6, '#ffffff', 3); });
  GAME.on('grade', ({ x, y, tier }) => {
    puff(x, y - 6, TIERS[tier].c, 6, 26, 20);
    twinkles(x, y - 6, 5, TIERS[tier].c, 11); glint(x, y - 8, '#ffffff', 4);
    floatWorld('+1 TIER', x, y - 12, 'green', 'star');
    snd.sparkle();
  });

  /* ============================================================
     AMBIENT EFFECTS
     The plant is never still: chimneys smoke, the cannery boils,
     dynamos throw sparks, mills dust the air, and rain lands in
     little splashes. All of it is emitted at a metered rate so the
     particle array never runs away with itself.
     ============================================================ */
  let ambT = 0;
  function drawAmbientFx(now, dt) {
    if (!GAME.setting('particles')) return;
    ambT += dt;
    if (ambT < 0.14) return;
    const step = ambT; ambT = 0;
    const cx = cam().x, cy = cam().y, vw = W.view.w, vh = W.view.h;
    const near = (x, y) => x > cx - 20 && x < cx + vw + 20 && y > cy - 30 && y < cy + vh + 20;
    const each = (store, fn) => {
      const keys = Object.keys(store);
      for (let i = 0; i < keys.length; i++) {
        const [c, r] = keys[i].split(',').map(Number);
        fn(c * 16, r * 16, store[keys[i]], keys[i]);
      }
    };
    /* chimneys: mills and kitchens run all day */
    each(S().mills, (x, y) => { if (near(x, y) && Math.random() < step * 3) smoke(x + 22, y - 4, 1, 'rgba(214,210,204,1)', 16); });
    each(S().kitchens, (x, y) => { if (near(x, y) && Math.random() < step * 2.4) smoke(x + 8, y - 6, 1, 'rgba(240,236,228,1)', 18); });
    /* the cannery only bubbles while something is in the pot */
    each(S().canneries, (x, y, cn) => {
      if (!near(x, y) || !cn.cook) return;
      if (Math.random() < step * 5) bubbles(x + 16, y + 4, 1, '#cfe8f5');
      if (Math.random() < step * 2) smoke(x + 16, y - 4, 1, 'rgba(255,252,244,1)', 20);
    });
    /* dynamos arc */
    each(S().dynamos, (x, y) => { if (near(x, y) && Math.random() < step * 4) sparks(x + 8, y + 2, 2, '#9fe8ff', 60); });
    /* graders and polishers throw a glint as they work */
    each(S().polishers, (x, y) => { if (near(x, y) && Math.random() < step * 1.4) glint(x + 8 + ((Math.random() * 10) | 0), y + 2, '#ffffff', 3); });
    /* the gene lab hums */
    each(S().genelabs, (x, y) => { if (near(x, y) && Math.random() < step * 2) sparks(x + 16, y - 2, 1, '#ff8ac0', 40); });
    /* rain lands */
    if (GAME.weather.rain) {
      for (let i = 0; i < 3; i++) {
        if (Math.random() > step * 6) continue;
        const rx = cx + Math.random() * vw, ry = cy + Math.random() * vh;
        P({ type: 'ring', x: rx, y: ry, vx: 0, vy: 0, g: 0, t: 0, life: 0.24, col: 'rgba(200,230,255,1)', r1: 5, th: 1 });
      }
    }
    /* the basket pulls motes in toward the cursor while you sweep */
    if (ptr.down && ptr.inside && S().tool === 'basket' && Math.random() < step * 8) {
      const a = Math.random() * Math.PI * 2, R = GAME.scoopR();
      P({ type: 'px', x: ptr.x + Math.cos(a) * R, y: ptr.y + Math.sin(a) * R * 0.7,
        vx: -Math.cos(a) * R * 1.8, vy: -Math.sin(a) * R * 1.3, g: 0, t: 0, life: 0.5,
        col: 'rgba(255,248,236,1)', s: 1 });
    }
  }

  /* ============================================================
     THE SHUTTER
     One transition for the whole game: a corrugated roller door
     drops over whatever is on screen, the world changes behind it,
     and it rolls back up. It draws on the title canvas while the
     front of house is up and on the world canvas once it is not,
     so it can carry you across that boundary.
     ============================================================ */
  let shut = null;
  function startShutter(dur, half) { shut = { t: 0, dur: dur || 1, half: half || null, done: false }; }
  function shuttering() { return !!shut; }
  function drawShutter(dt) {
    if (!shut) return;
    shut.t += dt;
    const p = Math.min(1, shut.t / shut.dur);
    if (p >= 0.46 && !shut.done) { shut.done = true; if (shut.half) shut.half(); }
    const onTitle = !titleEl.hidden;
    const g2 = onTitle ? tctx : ctx;
    const k = onTitle ? 1 : SC;
    const w = onTitle ? TW : Math.round(cv.width / SC), h = onTitle ? TH : Math.round(cv.height / SC);
    g2.setTransform(k, 0, 0, k, 0, 0);
    const cover = p < 0.46 ? p / 0.46 : 1 - (p - 0.46) / 0.54;
    const hh = Math.round(h * Math.min(1, cover * 1.02));
    for (let y = 0; y < hh; y += 6) {
      g2.fillStyle = '#3f464d'; g2.fillRect(0, y, w, 4);
      g2.fillStyle = '#2b3137'; g2.fillRect(0, y + 4, w, 2);
    }
    if (hh > 0) {
      g2.fillStyle = '#14171a'; g2.fillRect(0, hh - 6, w, 6);
      for (let x = 0; x < w; x += 10) { g2.fillStyle = '#ffb32e'; g2.fillRect(x + ((shut.t * 34) | 0) % 10, hh - 5, 5, 4); }
      g2.fillStyle = 'rgba(0,0,0,.4)'; g2.fillRect(0, hh, w, 3);
    }
    g2.setTransform(1, 0, 0, 1, 0, 0);
    if (p >= 1) shut = null;
  }

  /* ================= THE HELPER BAG =================
     The modules in their own files - the menu, the quest board, the
     pantry, the garage, the map and the HR room - reach the view
     through this and nothing else. */
  const UI = {
    $, S, W, snd, mkIcon, cloneCanvas, floatText, floatWorld, toast, openModal, closeModals, setInspect, refreshInspect,
    puff, heart, coinBurst, shellBurst, sparks, smoke, feathers, twinkles, shards,
    ring, glint, groundDust, bubbles, beam, popNum, impact, shake, flash, fly, holdFrame,
    worldToScreen, cam, paintCloud,
    showTitle, hideTitle, startIntro, openCompany, reloadWorld, renderToolbelt, renderPalette, renderHire,
    introNext, introSkip, shutter: startShutter, shuttering,
    cameraFeed, buildingThumb, statRow, statBlock, traitChips, crewCard, applicantCard, noticeBoard, botBench,
    labOn(id) { termSel = id; renderSkills(); openModal('#modal-skills'); if (id) centerOn(id); },
    get SC() { return SC; }, get titleHidden() { return titleEl.hidden; }, get introMode() { return introMode; },
    railUp,
  };
  window.UI = UI;

  /* ================= BOOT ================= */
  function boot() {
    GAME.load();
    const off = GAME.applyOffline();
    buildGround();
    terrDirty = true;
    renderToolbelt();
    renderPalette();
    updateCursorChip();
    requestAnimationFrame(syncCamPad);
    /* the modules that live in their own files hook up here */
    [window.QUESTS_UI, window.FOODUI, window.GARAGE, window.WMAP, window.HR, window.MENU].forEach(m => { if (m && m.init) m.init(UI); });
    showTitle();
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
      realDt = dt;
      /* a held frame: the world stops for a beat so a hit lands */
      if (hold > 0) { hold = Math.max(0, hold - dt); dt = 0; }
      sprinkleCd = Math.max(0, sprinkleCd - dt);
      tickRolls(realDt);
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
      if (!titleEl.hidden) { if (introMode) drawIntro(dt); else if (window.MENU) MENU.draw(dt, now); else drawTitleScreen(dt); }
      render(now, dt);
      if (!$('#modal-skills').hidden) drawTerm(now);
      if (!$('#modal-genes').hidden) drawGenes(now);
      if (!$('#modal-world').hidden) drawWorld(now);
      if (!$('#modal-depot').hidden && mapCv) drawValleyMap(now);
      if (window.WMAP && !$('#modal-wmap').hidden) WMAP.draw(now, dt);
      if (window.HR && !$('#modal-hr').hidden) HR.draw(now, dt);
      drawTrip(now);
      drawShutter(dt);
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
