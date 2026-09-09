/* ============================================================
   INF EGG CO. - THE FRONT OF HOUSE
   Three screens, no interface furniture on any of them.

   ATTRACT  the founder on a stage running his act - a number with
            the guitar, a tree, a factory, a line of chickens - with
            the logo over it and one instruction. Click anywhere.
   BASKET   a crate of straw with three eggs in it. Each egg is a
            save: the further it has come the finer its shell and
            the more it has cracked, because it is nearly ready to
            hatch. Pick one up to play it, or drag it to the scrap
            bin to throw it away.
   Both are drawn on the one canvas and hit-tested by hand, so the
   only DOM on top of them is the certificate and the settings.
   ============================================================ */
'use strict';

window.MENU = (() => {
  let UI = null, $ = null, S = null, W = null;
  let cv = null, g = null, TW = 384, TH = 208;
  let phase = 'attract';
  let clock = 0;
  const K = () => (TW >= 620 ? 3 : TW >= 420 ? 2 : 2);

  /* ---- the act ---- */
  let actI = 0, actT = 0, props = null;
  let parts = [], notes = [], coins = [], bills = [], hens = [], warden = null;
  let hensFound = 0, hensSeen = 0;

  /* ---- the shutter between screens ---- */

  /* ---- the basket ---- */
  let slots = [], hover = null, drag = null, confirm = null, opening = null, binHot = false;
  let hits = [];
  const ptr = { x: -99, y: -99, inside: false, down: false, moved: 0, dx: 0, dy: 0 };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ================= the founder's act ================= */
  function resetAct() {
    props = { chops: 0, swing: -1, fall: 0, shake: 0, punched: 0, flash: 0, chicks: [] };
    warden = null;
    if (MENU_ACTS[actI].id === 'punch')
      props.chicks = [0, 1, 2].map(i => ({ x: TW + 40 + i * 52, sp: SPECIES[(i * 9 + 3) % 24], hop: i * 1.3, y: 0 }));
  }
  function nextAct() { actI = (actI + 1) % MENU_ACTS.length; actT = 0; resetAct(); }

  function spawnHen() {
    if (hens.length > 2) return;
    const fromLeft = Math.random() < 0.5;
    hens.push({
      id: ++hensSeen, sp: SPECIES[Math.floor(Math.random() * Math.min(30, SPECIES.length))],
      x: fromLeft ? -20 : TW + 20, dir: fromLeft ? 1 : -1,
      v: 9 + Math.random() * 7, hop: Math.random() * 6, hit: 0,
    });
  }

  /* ================= drawing helpers, all stencil ================= */
  function plate(x, y, w, h, opts) {
    const o = opts || {};
    g.fillStyle = o.ink || '#14171a'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = o.fill || '#d8d6d0'; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x, y, w, 1);
    g.fillStyle = 'rgba(20,23,26,.25)'; g.fillRect(x, y + h - 1, w, 1);
    if (o.rivets) {
      g.fillStyle = '#8f9298';
      [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]].forEach(([rx, ry]) => g.fillRect(rx, ry, 1, 1));
    }
  }
  function hazard(x, y, w, h, off) {
    for (let i = 0; i < w + h; i += 6) {
      g.fillStyle = '#ffb32e';
      for (let d = 0; d < 3; d++) {
        const px = x + ((i + d + (off | 0)) % (w + h));
        if (px >= x && px < x + w) g.fillRect(px, y, 1, h);
      }
    }
  }
  /* a stencilled label on a dark strip */
  function stencil(text, cx, y, col, k) {
    k = k || 1;
    const w = SPR.textW(text, k);
    g.fillStyle = 'rgba(13,16,20,.82)'; g.fillRect(Math.round(cx - w / 2) - 6, y - 3, w + 12, 8 * k + 6);
    g.fillStyle = '#ffb32e'; g.fillRect(Math.round(cx - w / 2) - 6, y + 8 * k + 2, w + 12, 1);
    SPR.drawText(g, text, Math.round(cx - w / 2), y, col || '#f0eee8', k, '#0d1014');
    return w;
  }

  /* ================= ATTRACT ================= */
  function drawAttract(dt, now) {
    if (!props) resetAct();
    actT += dt;
    if (actT > MENU_ACTS[actI].secs) nextAct();
    const act = MENU_ACTS[actI], k = K();

    /* a dusk that has had a chimney put through it */
    const bands = ['#12142c', '#191c3c', '#23234e', '#33285c', '#4d2f66', '#6e3a66',
                   '#8f4a5e', '#b45f4c', '#d4813f', '#e8a83f'];
    const per = (TH * 0.74) / bands.length;
    for (let y = 0; y < TH; y++) {
      const f = y / per, i = Math.min(bands.length - 1, Math.floor(f));
      g.fillStyle = bands[i]; g.fillRect(0, y, TW, 1);
      if (i < bands.length - 1 && f - i > 0.62) { g.fillStyle = bands[i + 1]; for (let x = y % 2; x < TW; x += 2) g.fillRect(x, y, 1, 1); }
    }
    for (let i = 0; i < 70; i++) {
      if (Math.floor(now / 420 + i) % 11 === 0) continue;
      g.fillStyle = i % 4 ? 'rgba(255,255,255,.66)' : 'rgba(255,226,170,.9)';
      g.fillRect((i * 97) % TW, (i * 53) % Math.round(TH * 0.46), 1, 1);
    }
    /* the moon, low and full */
    const mx = TW - 62, my = 44;
    g.fillStyle = '#fff3d0';
    g.fillRect(mx, my, 20, 20); g.fillRect(mx - 3, my + 5, 26, 10); g.fillRect(mx + 5, my - 3, 10, 26);
    g.fillStyle = '#e8dcb8'; g.fillRect(mx + 11, my + 6, 5, 5); g.fillRect(mx + 4, my + 13, 3, 3); g.fillRect(mx + 14, my + 15, 2, 2);

    /* money weather */
    if (bills.length < 16) bills.push({ x: Math.random() * TW, y: -8, v: 11 + Math.random() * 15, ph: Math.random() * 6 });
    bills.forEach(b => {
      b.y += b.v * dt; b.ph += dt * 3;
      if (b.y > TH) { b.y = -8; b.x = Math.random() * TW; }
      const bx = Math.round(b.x + Math.sin(b.ph) * 9), by = Math.round(b.y);
      g.fillStyle = '#2f6b28'; g.fillRect(bx, by, 9, 5);
      g.fillStyle = '#7fc24f'; g.fillRect(bx + 1, by + 1, 7, 3);
      g.fillStyle = '#d8f0a8'; g.fillRect(bx + 3, by + 2, 3, 1);
    });

    /* the works: hills, then a row of chimneys, then the stage */
    const floorY = Math.max(Math.round(TH * 0.52), TH - 44);
    const FB = TH - floorY;
    [{ c: '#2e2242', r: '#3d2f54', b: 34, a: 11, s: 47 }, { c: '#231a34', r: '#31254a', b: 17, a: 8, s: 31 }]
      .forEach((L, li) => { for (let x = 0; x < TW; x++) { const h = Math.round(L.b + FB + Math.sin(x / L.s + li) * L.a + Math.sin(x / 11 + li * 2) * 3); g.fillStyle = L.c; g.fillRect(x, TH - h, 1, h); g.fillStyle = L.r; g.fillRect(x, TH - h, 1, 2); } });
    const nF = Math.max(3, Math.round(TW / 110));
    for (let i = 0; i < nF; i++) {
      const fx = 22 + i * Math.round((TW - 40) / nF), fh = 30 + (i % 3) * 12, fb = floorY - 22, fw = 30;
      g.fillStyle = '#181229'; g.fillRect(fx, fb - fh, fw, fh);
      g.fillStyle = '#221a36'; g.fillRect(fx, fb - fh, fw, 2);
      g.fillStyle = '#181229'; g.fillRect(fx + fw - 9, fb - fh - 16, 6, 16);
      for (let wy = 4; wy < fh - 6; wy += 8) for (let wx = 3; wx < fw - 5; wx += 8) {
        g.fillStyle = (Math.floor(now / 1500) + wx + wy + i) % 4 ? '#ffb32e' : '#2c2444';
        g.fillRect(fx + wx, fb - fh + wy, 4, 4);
      }
      for (let s2 = 0; s2 < 3; s2++) {
        const p = ((now / 1500 + s2 * 0.33 + i * 0.21) % 1);
        g.fillStyle = 'rgba(190,190,205,' + (0.45 - p * 0.4).toFixed(2) + ')';
        g.fillRect(fx + fw - 8 + Math.round(Math.sin(now / 460 + s2) * 3), Math.round(fb - fh - 18 - p * 26), 5 - Math.floor(p * 3), 3);
      }
    }
    /* the stage: boards, a hazard lip and footlights */
    g.fillStyle = '#1b1f24'; g.fillRect(0, floorY, TW, TH - floorY);
    g.fillStyle = '#2b3138'; for (let x = 0; x < TW; x += 11) g.fillRect(x, floorY + 4, 1, TH - floorY - 4);
    for (let x = 0; x < TW; x += 12) { g.fillStyle = '#ffb32e'; g.fillRect(x, floorY, 6, 3); g.fillStyle = '#14171a'; g.fillRect(x + 6, floorY, 6, 3); }
    for (let x = 14; x < TW; x += 44) {
      g.fillStyle = 'rgba(255,226,150,.09)'; g.fillRect(x - 12, floorY - 66, 26, 66);
      g.fillStyle = '#ffb32e'; g.fillRect(x, floorY + 4, 3, 2);
    }

    const rx = Math.round(TW * 0.30), baseY = floorY + 3;
    const wardrobe = S().wardrobe;
    const put = (pose, x, y) => {
      const spr = SPR.raccoonSprite(pose, k, wardrobe);
      SPR.shadowEll(g, x + 10 * k, y + 1, 9 * k, 2, 0.4);
      g.drawImage(spr, Math.round(x) - (spr.ox || 0) * k, Math.round(y) - spr.height);
    };

    if (act.id === 'dance') {
      const beat = Math.floor(now / 240) % 2;
      const hop = Math.abs(Math.sin(now / 240)) * 4 * k;
      for (let s2 = 0; s2 < 2; s2++) {
        const sx = rx + (s2 ? 27 * k : -23 * k), n = 5 + s2 * 2;
        for (let i = 0; i < n; i++) { g.fillStyle = '#2f6b28'; g.fillRect(sx, baseY - 4 * k - i * 3 * k, 12 * k, 3 * k); g.fillStyle = '#7fc24f'; g.fillRect(sx + k, baseY - 4 * k - i * 3 * k, 10 * k, k); }
        g.fillStyle = '#ffb32e'; g.fillRect(sx + 4 * k, baseY - 4 * k - n * 3 * k, 4 * k, 2 * k);
      }
      put(beat ? 'guitar1' : 'guitar0', rx, baseY - hop);
      if (Math.random() < dt * 7) notes.push({ x: rx + 24 * k, y: baseY - 19 * k, t: 0, ph: Math.random() * 6 });
      if (Math.random() < dt * 9) coins.push({ x: rx - 40 * k + Math.random() * 80 * k, y: floorY - 74, v: 34 + Math.random() * 40, t: 0 });
    } else if (act.id === 'chop') {
      const tx = rx + 36 * k;
      const swing = Math.floor(actT * 2.3) % 2;
      if (swing !== props.swing) {
        props.swing = swing;
        if (swing === 1 && props.fall <= 0) {
          props.chops++; props.shake = 0.34;
          for (let i = 0; i < 10; i++) parts.push({ x: tx + 8 * k, y: baseY - 24 * k, vx: (Math.random() - 0.5) * 90, vy: -34 - Math.random() * 44, t: 0, life: 0.9, col: i % 2 ? '#7fbf4f' : '#e0bd82', s: i % 3 ? 2 : 3 });
          for (let i = 0; i < 5; i++) parts.push({ type: 'spark', x: tx + 8 * k, y: baseY - 24 * k, vx: (Math.random() - 0.5) * 150, vy: -60 - Math.random() * 60, g: 300, drag: 2, t: 0, life: 0.3, col: '#fff8ec' });
          parts.push({ type: 'ring', x: tx + 8 * k, y: baseY - 22 * k, vx: 0, vy: 0, g: 0, t: 0, life: 0.3, col: '#fff8ec', r1: 22 });
        }
      }
      props.shake = Math.max(0, props.shake - dt);
      if (props.chops >= 4) props.fall = Math.min(1, props.fall + dt * 1.5);
      const tree = SPR.decoSprite('tree', k, 77);
      g.save();
      g.translate(Math.round(tx) + (props.shake > 0 ? Math.round(Math.sin(now / 28) * 2) : 0), baseY);
      g.rotate(props.fall * props.fall * 1.4);
      g.drawImage(tree, -Math.floor(tree.width / 2), -tree.height);
      g.restore();
      if (props.fall >= 1) {
        g.fillStyle = '#5e3d18'; g.fillRect(tx - 4 * k, baseY - 5 * k, 8 * k, 5 * k);
        g.fillStyle = '#c9924f'; g.fillRect(tx - 3 * k, baseY - 5 * k, 6 * k, k);
        /* and out he comes */
        if (!warden) warden = { x: tx + 2 * k, t: 0, pose: 'wag', said: 0 };
      }
      for (let i = 0; i < Math.min(props.chops, 4); i++) {
        g.fillStyle = '#8a5e2a'; g.fillRect(tx + 30 * k + (i % 2) * 8 * k, baseY - 3 * k - Math.floor(i / 2) * 3 * k, 7 * k, 3 * k);
        g.fillStyle = '#e0bd82'; g.fillRect(tx + 30 * k + (i % 2) * 8 * k, baseY - 3 * k - Math.floor(i / 2) * 3 * k, k, 3 * k);
      }
      put(swing ? 'chop1' : 'chop0', rx, baseY);
    } else if (act.id === 'build') {
      const fx = rx + 34 * k, fw = 42 * k, fh = 48 * k;
      const prog = Math.min(1, actT / (act.secs - 0.7));
      const swing = Math.floor(actT * 3.1) % 2;
      if (swing !== props.swing) {
        props.swing = swing;
        if (swing === 1) {
          for (let i = 0; i < 8; i++) parts.push({ type: 'spark', x: fx + 6 * k, y: baseY - prog * fh, vx: (Math.random() - 0.5) * 170, vy: -60 - Math.random() * 70, g: 320, drag: 2.2, t: 0, life: 0.32, col: i % 2 ? '#ffb32e' : '#fff8ec' });
          for (let i = 0; i < 5; i++) parts.push({ x: fx + Math.random() * fw, y: baseY - 2, vx: (Math.random() - 0.5) * 90, vy: -14 - Math.random() * 14, g: 60, drag: 3, t: 0, life: 0.45, col: '#c9a878' });
          parts.push({ type: 'ring', x: fx + 6 * k, y: baseY - prog * fh, vx: 0, vy: 0, g: 0, t: 0, life: 0.26, col: '#ffb32e', r1: 16 });
          props.shake = 0.14;
        }
      }
      const h = Math.round(fh * prog);
      g.fillStyle = '#14171a'; g.fillRect(fx - 1, baseY - h - 1, fw + 2, h + 1);
      g.fillStyle = '#8a4a34'; g.fillRect(fx, baseY - h, fw, h);
      for (let yy = 4 * k; yy < h - 3 * k; yy += 7 * k) for (let xx = 3 * k; xx < fw - 4 * k; xx += 9 * k) {
        g.fillStyle = prog >= 1 && (Math.floor(now / 900) + xx + yy) % 3 ? '#ffb32e' : '#241a20';
        g.fillRect(fx + xx, baseY - h + yy, 4 * k, 4 * k);
      }
      if (prog >= 0.55) { const ch = Math.round((prog - 0.55) / 0.45 * 15 * k); g.fillStyle = '#14171a'; g.fillRect(fx + fw - 11 * k, baseY - h - ch, 7 * k, ch); g.fillStyle = '#4a525a'; g.fillRect(fx + fw - 10 * k, baseY - h - ch + 1, 5 * k, ch); }
      if (prog >= 1) {
        for (let s2 = 0; s2 < 4; s2++) { const p = ((now / 900 + s2 * 0.25) % 1); g.fillStyle = 'rgba(200,200,210,' + (0.66 - p * 0.6).toFixed(2) + ')'; g.fillRect(fx + fw - 10 * k + Math.round(Math.sin(now / 400 + s2) * 3), Math.round(baseY - h - 15 * k - p * 30), 6 * k - Math.floor(p * 6), 3); }
        g.drawImage(SPR.iconSprite(S().company.logo || 'egg', k), fx + Math.round(fw / 2) - 5 * k, baseY - h + 4 * k);
      } else {
        g.fillStyle = '#c9924f'; g.fillRect(fx - 4, baseY - fh - 6, 2, fh + 6); g.fillRect(fx + fw + 2, baseY - fh - 6, 2, fh + 6);
        for (let i = 0; i < 4; i++) g.fillRect(fx - 4, baseY - 9 * k * (i + 1), fw + 8, 1);
      }
      put(swing ? 'hammer1' : 'hammer0', rx, baseY);
    } else {
      const reach = rx + 27 * k;
      props.flash = Math.max(0, props.flash - dt);
      props.chicks.forEach(c => {
        if (!c.flying) {
          c.x -= 30 * dt; c.hop += dt * 7;
          if (c.x < reach) {
            c.flying = true; c.vx = 120 + Math.random() * 50; c.vy = -150; c.rot = 0;
            props.punched++; props.flash = 0.26;
            for (let i = 0; i < 14; i++) parts.push({ x: c.x, y: baseY - 12 * k, vx: (Math.random() - 0.5) * 130, vy: -36 - Math.random() * 56, t: 0, life: 0.9, col: i % 3 ? '#fff8ec' : '#ffb32e', g: 60, drag: 1.4, s: i % 2 ? 2 : 1 });
            for (let i = 0; i < 7; i++) parts.push({ type: 'spark', x: c.x, y: baseY - 12 * k, vx: (Math.random() - 0.5) * 220, vy: -50 - Math.random() * 90, g: 340, drag: 2.4, t: 0, life: 0.28, col: '#ffffff' });
            parts.push({ type: 'ring', x: c.x, y: baseY - 12 * k, vx: 0, vy: 0, g: 0, t: 0, life: 0.34, col: '#ffffff', r1: 34 });
            for (let i = 0; i < 5; i++) parts.push({ type: 'star', x: c.x + (Math.random() - 0.5) * 30, y: baseY - 14 * k + (Math.random() - 0.5) * 20, vx: 0, vy: -8, g: 0, t: 0, life: 0.5, col: '#ffb32e', s: 3 });
          }
        }
        if (c.flying) {
          c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 170 * dt; c.rot += dt * 9;
          const cs = SPR.chickenSprite(c.sp, k, false);
          g.save(); g.translate(Math.round(c.x), Math.round(baseY - 14 * k + c.y)); g.rotate(c.rot);
          g.drawImage(cs, -cs.width / 2, -cs.height / 2); g.restore();
          for (let i = 0; i < 3; i++) { const a = c.rot * 2 + i * 2.1; g.fillStyle = '#ffb32e'; g.fillRect(Math.round(c.x + Math.cos(a) * 11 * k), Math.round(baseY - 14 * k + c.y + Math.sin(a) * 6 * k - 8 * k), 2, 2); }
        } else if (c.x < TW + 40) {
          const hp = Math.abs(Math.sin(c.hop)) * 2 * k;
          SPR.shadowEll(g, c.x + 10 * k, baseY + 1, 6 * k, 1.5, 0.34);
          const cs = SPR.chickenSprite(c.sp, k, false);
          g.save(); g.translate(Math.round(c.x) + cs.width, Math.round(baseY - hp)); g.scale(-1, 1); g.drawImage(cs, 0, -cs.height); g.restore();
        }
      });
      if (props.flash > 0) {
        g.fillStyle = 'rgba(255,255,255,' + Math.min(1, props.flash * 2.6).toFixed(2) + ')';
        g.fillRect(reach - 4 * k, baseY - 22 * k, 12 * k, 13 * k);
        const t2 = ['POW', 'BONK', 'CLUCK', 'THWACK'][props.punched % 4];
        SPR.drawTitle(g, t2, reach - SPR.textW(t2, k) / 2 + 6 * k, baseY - 40 * k, '#ffb32e', '#14171a', k);
      }
      const wind = Math.floor(actT * 4) % 3 === 0 && props.flash <= 0;
      put(props.flash > 0.13 ? 'punch1' : wind ? 'punch0' : 'stand', rx, baseY);
    }

    /* the Warden, once a tree is down: he wags, then sulks off */
    if (warden) {
      warden.t += dt;
      const wp = warden.t < 2.4 ? (Math.floor(warden.t * 5) % 2 ? 'wag' : 'stand') : 'sulk';
      const spr = SPR.wardenSprite(wp, k);
      const wx = warden.x + (warden.t > 3 ? (warden.t - 3) * 22 : 0);
      const bob = Math.abs(Math.sin(warden.t * 6)) * (warden.t < 2.4 ? 2 : 0.6) * k;
      SPR.shadowEll(g, wx + 6 * k, baseY + 1, 6 * k, 1.5, 0.36);
      g.drawImage(spr, Math.round(wx), Math.round(baseY - bob) - spr.height);
      hits.push({ id: 'warden', x: wx, y: baseY - spr.height, w: 14 * k, h: spr.height });
      if (warden.t > 0.35 && warden.t < 2.6) {
        const line = ['I SPEAK FOR THE TREES', 'THAT WAS MY ROOF', 'PUT IT BACK'][warden.said % 3];
        const w2 = SPR.tinyW(line, 1) + 8;
        const bx = Math.round(wx - w2 / 2 + 6 * k), by = Math.round(baseY - spr.height - 12);
        g.fillStyle = '#fff8ec'; g.fillRect(bx, by, w2, 11);
        g.fillStyle = '#14171a'; g.fillRect(bx, by, w2, 1); g.fillRect(bx, by + 10, w2, 1); g.fillRect(bx, by, 1, 11); g.fillRect(bx + w2 - 1, by, 1, 11);
        g.fillRect(bx + 8, by + 11, 2, 2);
        SPR.drawTiny(g, line, bx + 4, by + 3, '#14171a', 1);
      }
      if (warden.t > 6) warden = null;
    }

    /* the hens that wandered in - click one and it is off */
    if (Math.random() < dt * 0.5) spawnHen();
    for (let i = hens.length - 1; i >= 0; i--) {
      const h = hens[i];
      h.hop += dt * 7;
      if (h.hit) {
        h.hit += dt; h.hx = (h.hx || 0) + h.dir * 150 * dt; h.hy = (h.hy || 0) - 190 * dt + 260 * h.hit * dt;
        const cs = SPR.chickenSprite(h.sp, k, false);
        g.save(); g.translate(Math.round(h.x + h.hx), Math.round(baseY - 14 * k + h.hy)); g.rotate(h.hit * 11);
        g.drawImage(cs, -cs.width / 2, -cs.height / 2); g.restore();
        if (h.hit > 1.3) hens.splice(i, 1);
        continue;
      }
      h.x += h.dir * h.v * dt;
      if (h.x < -30 || h.x > TW + 30) { hens.splice(i, 1); continue; }
      const hp = Math.abs(Math.sin(h.hop)) * 2 * k;
      const cs = SPR.chickenSprite(h.sp, k, false);
      SPR.shadowEll(g, h.x + 5 * k, baseY + 1, 5 * k, 1.5, 0.32);
      g.save();
      if (h.dir === -1) { g.translate(Math.round(h.x) + cs.width, Math.round(baseY - hp)); g.scale(-1, 1); g.drawImage(cs, 0, -cs.height); }
      else g.drawImage(cs, Math.round(h.x), Math.round(baseY - hp) - cs.height);
      g.restore();
      hits.push({ id: 'hen', ref: h, x: h.x - 2, y: baseY - cs.height - 4, w: cs.width + 4, h: cs.height + 6 });
    }

    /* particles */
    notes = notes.filter(n => (n.t += dt) < 1.6);
    notes.forEach(n => {
      const nx = Math.round(n.x + Math.sin(n.t * 4 + n.ph) * 7 + n.t * 20), ny = Math.round(n.y - n.t * 36);
      g.globalAlpha = 1 - n.t / 1.6; g.fillStyle = '#fff8ec';
      g.fillRect(nx, ny, 2, 2); g.fillRect(nx + 2, ny - 4, 1, 5); g.fillRect(nx + 2, ny - 4, 3, 1); g.globalAlpha = 1;
    });
    coins = coins.filter(c => (c.t += dt) < 3 && c.y < floorY);
    coins.forEach(c => { c.y += c.v * dt; g.fillStyle = '#b87c10'; g.fillRect(Math.round(c.x), Math.round(c.y), 3, 3); g.fillStyle = '#ffb32e'; g.fillRect(Math.round(c.x), Math.round(c.y), 2, 2); });
    parts = parts.filter(p => (p.t += dt) < p.life);
    parts.forEach(p => {
      p.vy += (p.g === undefined ? 130 : p.g) * dt;
      if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
      const px0 = p.x, py0 = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const f = p.t / p.life;
      g.globalAlpha = Math.max(0, 1 - f * f);
      g.fillStyle = p.col;
      if (p.type === 'ring') {
        const r = 2 + Math.pow(f, 0.6) * p.r1;
        g.globalAlpha = Math.max(0, 1 - f);
        const st = Math.max(12, Math.round(r * 1.6));
        for (let i = 0; i < st; i++) { const a = (i / st) * Math.PI * 2; g.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r * 0.5), 1, 1); }
      } else if (p.type === 'spark') {
        g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        g.globalAlpha *= 0.55; g.fillRect(Math.round(px0), Math.round(py0), 1, 1);
      } else if (p.type === 'star') {
        const sz = Math.max(1, Math.round(Math.sin(Math.min(1, f * 1.2) * Math.PI) * (p.s || 3)));
        g.fillRect(Math.round(p.x) - sz, Math.round(p.y), sz * 2 + 1, 1);
        g.fillRect(Math.round(p.x), Math.round(p.y) - sz, 1, sz * 2 + 1);
      } else if (p.type === 'smoke') {
        const sz = Math.max(1, Math.round((p.s || 2) + f * 6));
        g.globalAlpha *= 0.55;
        g.fillRect(Math.round(p.x) - (sz >> 1), Math.round(p.y) - (sz >> 1), sz, sz);
      } else g.fillRect(Math.round(p.x), Math.round(p.y), p.s || 2, p.s || 2);
      g.globalAlpha = 1;
    });

    /* the sign over the works */
    const kk = SPR.textW('INF EGG CO.', 3) < TW - 24 ? 3 : 2;
    const title = 'INF EGG CO.';
    SPR.drawTitle(g, title, Math.round(TW / 2 - SPR.textW(title, kk) / 2), 12, '#ffb32e', '#14171a', kk);
    const sub = 'EGG PRODUCTION DIVISION';
    SPR.drawTiny(g, sub, Math.round(TW / 2 - SPR.tinyW(sub, 1) / 2), 14 + kk * 8 + 4, '#e8b25a', 1, '#14171a');
    /* what he is singing */
    const shown = act.line.slice(0, Math.floor(actT * 24));
    if (shown) stencil(shown, TW / 2, 14 + kk * 8 + 13, '#f0eee8', 1);
    /* the one instruction */
    if (Math.floor(now / 620) % 2) {
      const c2 = 'CLICK ANYWHERE TO START';
      const w2 = SPR.textW(c2, 1);
      g.fillStyle = '#ffb32e'; g.fillRect(Math.round(TW / 2 - w2 / 2) - 9, TH - 22, w2 + 18, 12);
      g.fillStyle = '#14171a'; g.fillRect(Math.round(TW / 2 - w2 / 2) - 7, TH - 20, w2 + 14, 8);
      SPR.drawText(g, c2, Math.round(TW / 2 - w2 / 2), TH - 19, '#ffb32e', 1);
    }
    /* the tally, once you have bothered a hen */
    if (hensFound) {
      const t3 = 'HENS BOTHERED ' + hensFound;
      SPR.drawTiny(g, t3, 6, TH - 12, '#e8b25a', 1, '#14171a');
    }
  }

  /* ================= BASKET ================= */
  function eggLook(info) {
    if (!info) return { tier: 0, crack: 0, pct: 0 };
    const pct = info.pct || 0;
    return {
      pct,
      tier: Math.max(0, Math.min(7, Math.floor(pct / 13))),
      crack: pct >= 80 ? 3 : pct >= 50 ? 2 : pct >= 22 ? 1 : 0,
    };
  }
  const eggScale = () => K() + 2;
  function bench() { return Math.round(TH * 0.70); }
  function crate() {
    const k = K();
    const bw = Math.min(TW - 40, Math.round(TW * 0.62)), bh = 20 + 5 * k;
    return { bw, bh, bx: Math.round(TW / 2 - bw / 2), by: bench() - bh + 4 };
  }
  function layoutSlots() {
    const sc2 = eggScale();
    const eggW = 10 * sc2, gap = Math.round(eggW * 0.55);
    const total = SAVE_SLOTS * eggW + (SAVE_SLOTS - 1) * gap;
    const x0 = Math.round(TW / 2 - total / 2);
    const c = crate();
    const y = c.by - 12 * sc2 + Math.round(10 * sc2 * 0.42);   /* buried to the shoulders in straw */
    slots = [];
    for (let i = 0; i < SAVE_SLOTS; i++) {
      const info = GAME.slotInfo(i);
      slots.push(Object.assign({
        i, info, x: x0 + i * (eggW + gap), y, lift: 0, vy: 0,
      }, eggLook(info)));
    }
  }
  /* the profile of an egg, in cells per row, for drawing an empty one */
  const EGG_W = [2, 4, 6, 6, 8, 8, 8, 8, 8, 8, 6, 4];
  function drawBasket(dt, now) {
    const k = K();
    /* a cold room, a bench, one lamp */
    g.fillStyle = '#171b21'; g.fillRect(0, 0, TW, TH);
    for (let y = 0; y < TH; y += 8) for (let x = ((y / 8) % 2) * 8; x < TW; x += 16) { g.fillStyle = 'rgba(255,255,255,.014)'; g.fillRect(x, y, 8, 8); }
    const benchY = bench();
    /* lamp cone over the basket */
    const cx = TW / 2;
    for (let i = 0; i < 34; i++) {
      const p = i / 34;
      g.fillStyle = 'rgba(255,214,140,' + (0.055 * (1 - p)).toFixed(3) + ')';
      const half = 12 + p * 90;
      g.fillRect(Math.round(cx - half), Math.round(p * benchY), Math.round(half * 2), Math.ceil(benchY / 34) + 1);
    }
    g.fillStyle = '#14171a'; g.fillRect(Math.round(cx) - 1, 0, 2, 10);
    g.fillStyle = '#3f464d'; g.fillRect(Math.round(cx) - 9, 9, 18, 5);
    g.fillStyle = '#ffe6a0'; g.fillRect(Math.round(cx) - 6, 13, 12, 2);
    /* the bench */
    g.fillStyle = '#2b3137'; g.fillRect(0, benchY, TW, TH - benchY);
    g.fillStyle = '#3f464d'; g.fillRect(0, benchY, TW, 2);
    g.fillStyle = '#232930'; for (let x = 0; x < TW; x += 15) g.fillRect(x, benchY + 3, 1, TH - benchY - 3);

    /* the crate: slatted sides, straw inside */
    const C = crate(), bw = C.bw, bh = C.bh, bx = C.bx, by = C.by;
    g.fillStyle = '#3a2a16'; g.fillRect(bx - 2, by + 4, bw + 4, bh);
    g.fillStyle = '#8a5e2a'; g.fillRect(bx, by + 6, bw, bh - 4);
    for (let i = 0; i < bw; i += 9) { g.fillStyle = '#a8783f'; g.fillRect(bx + i, by + 6, 4, bh - 4); }
    g.fillStyle = '#6b4620'; g.fillRect(bx, by + 6, bw, 2); g.fillRect(bx, by + bh, bw, 2);
    /* straw over the rim, drawn behind and in front of the eggs */
    const straw = (front) => {
      const rnd = SPR.mulberry(front ? 9 : 31);
      for (let i = 0; i < bw * 0.8; i++) {
        const sx = bx + 3 + rnd() * (bw - 6), sy = by + 4 + rnd() * 7;
        g.fillStyle = rnd() < 0.5 ? '#e0bd82' : '#c9a35f';
        const len = 3 + Math.floor(rnd() * 4);
        g.fillRect(Math.round(sx), Math.round(sy + (front ? 6 : 0)), len, 1);
      }
    };
    straw(false);

    /* the eggs */
    hits.push({ id: 'bin-zone', x: 0, y: 0, w: 0, h: 0 });
    slots.forEach(sl => {
      const dragged = drag && drag.slot === sl;
      const scale = eggScale();
      /* settle back into the straw */
      if (!dragged) {
        if (sl.vy || sl.lift > 0) { sl.vy += 260 * dt; sl.lift -= sl.vy * dt; if (sl.lift <= 0) { sl.lift = 0; sl.vy = sl.vy > 40 ? -sl.vy * 0.34 : 0; } }
        if (hover === sl && !drag) sl.lift = Math.max(sl.lift, 4 + Math.sin(now / 240));
      }
      const ex = dragged ? ptr.x - 5 * scale : sl.x;
      const ey = (dragged ? ptr.y - 6 * scale : sl.y - sl.lift);
      if (!sl.info) {
        /* an empty shell: the outline of one, dashed, waiting to be filled */
        for (let ry = 0; ry < 12; ry++) {
          const wq = EGG_W[ry], lx = ex + (5 - wq / 2) * scale, rx2 = ex + (5 + wq / 2 - 1) * scale;
          if (ry === 0 || ry === 11) { g.fillStyle = '#6f7883'; g.fillRect(Math.round(lx), Math.round(ey + ry * scale), wq * scale, scale); continue; }
          if (ry % 2) continue;                       /* dashed down the sides */
          g.fillStyle = '#6f7883';
          g.fillRect(Math.round(lx), Math.round(ey + ry * scale), scale, scale);
          g.fillRect(Math.round(rx2), Math.round(ey + ry * scale), scale, scale);
        }
        const em = 'EMPTY';
        SPR.drawTiny(g, em, Math.round(ex + 5 * scale - SPR.tinyW(em, 1) / 2), Math.round(ey + 5 * scale), '#8f9298', 1);
      } else {
        if (dragged) SPR.shadowEll(g, sl.x + 5 * scale, sl.y + 12 * scale + 6, 4 * scale, 2, 0.34);
        g.drawImage(SPR.eggSprite(sl.tier, scale), Math.round(ex), Math.round(ey));
        if (sl.crack) g.drawImage(SPR.eggCrackSprite(sl.tier, sl.crack, scale), Math.round(ex), Math.round(ey));
        /* the company's mark stencilled on the shell */
        if (sl.info.logo) { g.globalAlpha = 0.75; g.drawImage(SPR.iconSprite(sl.info.logo, Math.max(1, scale - 2)), Math.round(ex + 5 * scale - 5 * Math.max(1, scale - 2)), Math.round(ey + 6 * scale)); g.globalAlpha = 1; }
        if (sl.crack >= 3 && Math.floor(now / 400) % 2) { g.fillStyle = '#fff8ec'; g.fillRect(Math.round(ex + 6 * scale), Math.round(ey + 2 * scale), scale, scale); }
        /* how far along it is, on a rail under the shell */
        if (!dragged) SPR.drawBar(g, Math.round(sl.x), by + bh + 12, 10 * scale, sl.pct / 100, '#ffb32e', { h: 4, frame: '#14171a', trough: '#3f464d' });
      }
      /* the slot's number, branded into the crate rail */
      const lab = 'EGG ' + (sl.i + 1);
      SPR.drawTiny(g, lab, Math.round(sl.x + 5 * scale - SPR.tinyW(lab, 1) / 2), by + bh + 4, sl.i === GAME.currentSlot() ? '#ffb32e' : '#8f9298', 1);
      hits.push({ id: 'egg', ref: sl, x: sl.x - 4, y: sl.y - 8, w: 10 * scale + 8, h: 12 * scale + 10 });
    });
    straw(true);

    /* the card over whichever egg you are pointing at */
    const show = (drag && drag.slot) || hover;
    if (show && !confirm) {
      const info = show.info;
      const lines = info
        ? [(info.name || 'INF EGG CO.').toUpperCase().slice(0, 18),
           (AGES[info.age] ? AGES[info.age].name.toUpperCase() : 'STRAW AGE') + '  ' + show.pct + '%',
           GAME.fmtTime(info.playT || 0) + ' ON THE CLOCK',
           info.disc + ' OF ' + SPECIES_TOTAL + ' HENS  ' + (info.quests || 0) + ' JOBS']
        : ['EMPTY SHELL', 'START A NEW COMPANY', 'PICK IT UP TO BEGIN'];
      const w2 = Math.max.apply(null, lines.map(l => SPR.tinyW(l, 1))) + 14;
      const px = Math.max(4, Math.min(TW - w2 - 4, Math.round(show.x + 5 * eggScale() - w2 / 2)));
      const py = Math.max(30, show.y - lines.length * 7 - 18);
      plate(px, py, w2, lines.length * 7 + 10, { rivets: true });
      g.fillStyle = '#ffb32e'; g.fillRect(px, py, w2, 2);
      lines.forEach((l, i) => SPR.drawTiny(g, l, px + 7, py + 6 + i * 7, i === 0 ? '#14171a' : '#5c6168', 1));
      if (info) {
        SPR.drawBar(g, px + 7, py + lines.length * 7 + 2, w2 - 14, show.pct / 100, '#ffb32e', { h: 4, frame: '#14171a', trough: '#a9a7a1' });
      }
    }

    /* the instruction, and the scrap bin while you are carrying one */
    if (!confirm) {
      const t2 = drag ? 'DROP IT IN THE SCRAP BIN TO THROW IT AWAY' : 'PICK AN EGG   -   DRAG ONE OUT TO SCRAP IT';
      SPR.drawTiny(g, t2, Math.round(TW / 2 - SPR.tinyW(t2, 1) / 2), TH - 11, drag ? '#ff8a3d' : '#8f9298', 1, '#14171a');
    }
    const binW = 30 + 4 * k, binH = 22 + 3 * k;
    const binX = TW - binW - 8, binY = benchY - binH - 4;
    if (drag) {
      binHot = ptr.x > binX - 6 && ptr.x < binX + binW + 6 && ptr.y > binY - 6 && ptr.y < binY + binH + 6;
      g.fillStyle = binHot ? '#e0432c' : '#3f464d'; g.fillRect(binX - 2, binY - 2, binW + 4, binH + 4);
      g.fillStyle = binHot ? '#ff6a50' : '#5a636c'; g.fillRect(binX, binY, binW, binH);
      for (let i = 0; i < binW; i += 5) { g.fillStyle = 'rgba(20,23,26,.35)'; g.fillRect(binX + i, binY, 2, binH); }
      g.fillStyle = '#14171a'; g.fillRect(binX - 4, binY - 5, binW + 8, 4);
      for (let i = 0; i < binW + 8; i += 6) { g.fillStyle = '#ffb32e'; g.fillRect(binX - 4 + i, binY - 5, 3, 4); }
      const lab = 'SCRAP';
      SPR.drawTiny(g, lab, Math.round(binX + binW / 2 - SPR.tinyW(lab, 1) / 2), binY + binH / 2 - 2, '#fff8ec', 1, '#14171a');
      hits.push({ id: 'bin', x: binX - 6, y: binY - 6, w: binW + 12, h: binH + 12 });
    }

    /* the settings key, the one control on this screen */
    const gx = TW - 26, gy = 8;
    plate(gx, gy, 18, 18, { rivets: true, fill: hover === 'gear' ? '#ecebe6' : '#d8d6d0' });
    g.drawImage(SPR.iconSprite('gear', 1), gx + 4, gy + 4);
    hits.push({ id: 'gear', x: gx, y: gy, w: 18, h: 18 });

    /* the throw, and the confirm over it */
    if (opening) drawOpening(dt, now);
    if (confirm) drawConfirm();
  }

  function drawConfirm() {
    g.fillStyle = 'rgba(10,12,15,.72)'; g.fillRect(0, 0, TW, TH);
    const lines = ['SCRAP EGG ' + (confirm.slot.i + 1) + '?',
                   (confirm.slot.info.name || '').toUpperCase().slice(0, 20),
                   confirm.slot.pct + '% AND ' + GAME.fmtTime(confirm.slot.info.playT || 0) + ' GONE FOR GOOD'];
    const w2 = Math.max(140, Math.max.apply(null, lines.map(l => SPR.tinyW(l, 1))) + 24);
    const h2 = 62, px = Math.round(TW / 2 - w2 / 2), py = Math.round(TH / 2 - h2 / 2);
    plate(px, py, w2, h2, { rivets: true });
    g.fillStyle = '#14171a'; g.fillRect(px, py, w2, 5);
    for (let i = 0; i < w2; i += 6) { g.fillStyle = '#ffb32e'; g.fillRect(px + i, py, 3, 5); }
    SPR.drawText(g, lines[0], Math.round(TW / 2 - SPR.textW(lines[0], 1) / 2), py + 11, '#14171a', 1);
    SPR.drawTiny(g, lines[1], Math.round(TW / 2 - SPR.tinyW(lines[1], 1) / 2), py + 23, '#bf4f10', 1);
    SPR.drawTiny(g, lines[2], Math.round(TW / 2 - SPR.tinyW(lines[2], 1) / 2), py + 32, '#5c6168', 1);
    const bw = 52, bh = 15, gap = 10;
    const yx = Math.round(TW / 2 - bw - gap / 2), ny = py + h2 - bh - 7;
    plate(yx, ny, bw, bh, { fill: '#e05a42' });
    SPR.drawTiny(g, 'THROW IT', Math.round(yx + bw / 2 - SPR.tinyW('THROW IT', 1) / 2), ny + 5, '#fff5f0', 1);
    hits.push({ id: 'scrap-yes', x: yx, y: ny, w: bw, h: bh });
    const nx = Math.round(TW / 2 + gap / 2);
    plate(nx, ny, bw, bh, { fill: '#d8d6d0' });
    SPR.drawTiny(g, 'KEEP IT', Math.round(nx + bw / 2 - SPR.tinyW('KEEP IT', 1) / 2), ny + 5, '#14171a', 1);
    hits.push({ id: 'scrap-no', x: nx, y: ny, w: bw, h: bh });
  }

  /* the egg being thrown away, or hatching into a game */
  function drawOpening(dt, now) {
    opening.t += dt;
    const o = opening, scale = eggScale();
    if (o.kind === 'throw') {
      const p = Math.min(1, o.t / 0.75);
      const x = o.x + (o.tx - o.x) * p, y = o.y + (o.ty - o.y) * p - Math.sin(p * Math.PI) * 40;
      g.save(); g.translate(Math.round(x + 5 * scale), Math.round(y + 6 * scale)); g.rotate(p * 9);
      g.drawImage(SPR.eggSprite(o.tier, scale), -5 * scale, -6 * scale); g.restore();
      if (p >= 1 && !o.burst) {
        o.burst = true;
        for (let i = 0; i < 16; i++) parts.push({ x: o.tx + 5 * scale, y: o.ty + 6 * scale, vx: (Math.random() - 0.5) * 120, vy: -50 - Math.random() * 60, t: 0, life: 0.8, col: i % 3 ? EGG_SHELL[o.tier] : '#fff8ec' });
      }
      if (o.t > 1.1) opening = null;
    } else {
      /* it splits, and the light of a whole company comes out */
      const p = Math.min(1, o.t / 0.85);
      const shake = p < 0.55 ? Math.round(Math.sin(o.t * 42) * 2) : 0;
      const ex = o.x + shake, ey = o.y;
      if (p < 0.55) {
        g.drawImage(SPR.eggSprite(o.tier, scale), Math.round(ex), Math.round(ey));
        g.drawImage(SPR.eggCrackSprite(o.tier, Math.min(3, 1 + Math.floor(p * 5)), scale), Math.round(ex), Math.round(ey));
      } else {
        const q = (p - 0.55) / 0.45;
        const top = SPR.shellHalfSprite(o.tier, true, scale), bot = SPR.shellHalfSprite(o.tier, false, scale);
        g.drawImage(bot, Math.round(ex), Math.round(ey + 6 * scale));
        g.save(); g.translate(Math.round(ex + 5 * scale - q * 30), Math.round(ey - q * 26)); g.rotate(-q * 4);
        g.drawImage(top, -5 * scale, 0); g.restore();
        g.globalAlpha = Math.min(1, q * 1.4);
        g.fillStyle = '#fff8ec';
        const r = 6 + q * Math.max(TW, TH);
        for (let dy = -r; dy <= r; dy += 2) { const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); g.fillRect(Math.round(ex + 5 * scale - half), Math.round(ey + 6 * scale + dy), half * 2, 2); }
        g.globalAlpha = 1;
      }
      if (o.t > 0.9) { opening = null; startWipe(S().company.done ? 'game' : 'intro'); }
    }
  }

  /* ================= between screens ================= */
  function startWipe(to) {
    UI.snd.build();
    UI.shutter(1.0, () => {
      if (to === 'basket') { phase = 'basket'; layoutSlots(); hover = null; drag = null; }
      else if (to === 'attract') { phase = 'attract'; actT = 0; resetAct(); }
      else if (to === 'game') { phase = 'attract'; UI.hideTitle(); }
      else if (to === 'intro') { phase = 'attract'; UI.startIntro(); }
    });
  }

  /* ================= frame ================= */
  function draw(dt, now) {
    if (!cv) return;
    if (TW !== W.view.w || TH !== W.view.h) {
      TW = W.view.w; TH = W.view.h; cv.width = TW; cv.height = TH;
      g.imageSmoothingEnabled = false;
      if (phase === 'basket') layoutSlots();
    }
    clock += dt;
    hits = [];
    g.imageSmoothingEnabled = false;
    if (UI.introMode) return;                 /* the cutscene draws itself */
    if (phase === 'basket') drawBasket(dt, now);
    else drawAttract(dt, now);
  }

  /* ================= pointer ================= */
  function at(ev) {
    const r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * TW, y: (ev.clientY - r.top) / r.height * TH };
  }
  function hitAt(x, y, id) {
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      if (id && h.id !== id) continue;
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return null;
  }
  function onDown(ev) {
    if (UI.titleHidden) return;
    const p = at(ev);
    Object.assign(ptr, { x: p.x, y: p.y, down: true, moved: 0, inside: true });
    if (UI.shuttering() || opening) return;
    /* the cutscene: anywhere advances it */
    if (UI.introMode === 'scene') { UI.introNext(); return; }
    if (UI.introMode) return;
    if (phase === 'attract') {
      const hen = hitAt(p.x, p.y, 'hen');
      if (hen) {
        hen.ref.hit = 0.001; hensFound++; store.set('infEggCo_hens', hensFound);
        UI.snd.pet();
        for (let i = 0; i < 8; i++) parts.push({ x: hen.ref.x + 6, y: p.y, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 40, t: 0, life: 0.7, col: i % 2 ? '#ffb32e' : '#fff8ec' });
        if (hensFound === 5 || hensFound === 25) GAME.findSecret && GAME.findSecret('butterfly');
        return;
      }
      const w2 = hitAt(p.x, p.y, 'warden');
      if (w2) { warden.said++; warden.t = 0.4; UI.snd.plop(); return; }
      startWipe('basket');
      return;
    }
    /* the basket */
    if (confirm) {
      if (hitAt(p.x, p.y, 'scrap-yes')) {
        const sl = confirm.slot, k = K();
        opening = { kind: 'throw', t: 0, tier: sl.tier, x: sl.x, y: sl.y, tx: TW - 40, ty: TH * 0.72 - 20 };
        GAME.deleteSlot(sl.i);
        UI.snd.demolish();
        confirm = null; drag = null; layoutSlots();
        return;
      }
      if (hitAt(p.x, p.y, 'scrap-no')) { confirm = null; UI.snd.plop(); return; }
      return;
    }
    if (hitAt(p.x, p.y, 'gear')) { UI.snd.build(); MENU.openSettings(); return; }
    const e = hitAt(p.x, p.y, 'egg');
    if (e) { drag = { slot: e.ref, from: { x: e.ref.x, y: e.ref.y }, out: false }; UI.snd.plop(); }
  }
  function onMove(ev) {
    const p = at(ev);
    ptr.moved += Math.abs(p.x - ptr.x) + Math.abs(p.y - ptr.y);
    ptr.x = p.x; ptr.y = p.y; ptr.inside = true;
    if (UI.shuttering() || opening || confirm) return;
    if (phase === 'basket') {
      const e = hitAt(p.x, p.y, 'egg');
      const gear = hitAt(p.x, p.y, 'gear');
      hover = drag ? drag.slot : gear ? 'gear' : e ? e.ref : null;
      cv.style.cursor = (e || gear || drag) ? 'pointer' : 'default';
    } else cv.style.cursor = 'pointer';
  }
  function onUp(ev) {
    if (!ptr.down) return;
    ptr.down = false;
    if (UI.shuttering() || opening || confirm || UI.introMode) return;
    if (phase !== 'basket' || !drag) return;
    const sl = drag.slot;
    const overBin = binHot && hitAt(ptr.x, ptr.y, 'bin');
    if (overBin && sl.info) { confirm = { slot: sl }; drag = null; UI.snd.error(); return; }
    if (ptr.moved < 8) {
      /* a tap: this is the egg we are playing */
      drag = null;
      GAME.setSlot(sl.i);
      layoutSlots();
      const k = K();
      if (sl.info) {
        opening = { kind: 'hatch', t: 0, tier: sl.tier, x: sl.x, y: sl.y };
        UI.snd.hatch();
      } else if (S().company.done) {
        opening = { kind: 'hatch', t: 0, tier: sl.tier, x: sl.x, y: sl.y };
        UI.snd.hatch();
      } else {
        UI.snd.sparkle();
        startWipe('intro');
      }
      return;
    }
    /* dropped somewhere harmless: back in the straw */
    sl.lift = Math.max(6, sl.y - ptr.y + 6); sl.vy = -30;
    drag = null;
    UI.snd.plop();
  }

  /* ================= the DOM screens this front of house owns ================= */
  const SETTING_NAMES = {
    sound: ['SOUND', 'Every beep, cluck and clink.'], volume: ['VOLUME', ''],
    news: ['NEWS CARDS', 'Little cards in the corner for every event. Off by default; the work orders carry the news.'],
    shake: ['READOUT POP', 'Figures flick when they change.'],
    dayNight: ['DAY AND NIGHT', 'Dawn, dusk, night and lamps over the valley.'],
    particles: ['PARTICLES', 'Dust, crumbs, leaves and fireflies.'],
    bigUI: ['LARGE PANELS', 'Bigger keys and labels.'],
    showFps: ['FRAME COUNTER', 'A frame rate in the corner.'],
    autosave: ['AUTOSAVE', 'Save every ten seconds and on the way out.'],
  };
  function openSettings() { renderSettings(); UI.openModal('#modal-settings'); }
  function renderSettings() {
    const box = $('#settings-body'); box.innerHTML = '';
    Object.keys(SETTINGS_DEFAULT).forEach(k => {
      const [name, desc] = SETTING_NAMES[k] || [k.toUpperCase(), ''];
      const row = document.createElement('div'); row.className = 'set-row';
      const mid = document.createElement('div');
      const b = document.createElement('b'); b.textContent = name; mid.appendChild(b);
      if (desc) { const d = document.createElement('span'); d.textContent = desc; mid.appendChild(d); }
      row.appendChild(mid);
      if (k === 'volume') {
        const inp = document.createElement('input');
        inp.type = 'range'; inp.min = '0'; inp.max = '1'; inp.step = '0.05';
        inp.value = String(GAME.setting('volume')); inp.dataset.set = 'volume';
        inp.setAttribute('aria-label', 'Volume');
        row.appendChild(inp);
      } else {
        const tog = document.createElement('button');
        tog.className = 'toggle' + (GAME.setting(k) ? ' on' : '');
        tog.dataset.act = 'set-toggle'; tog.dataset.k = k;
        tog.textContent = GAME.setting(k) ? 'ON' : 'OFF';
        row.appendChild(tog);
      }
      box.appendChild(row);
    });
    const foot = document.createElement('div'); foot.className = 'set-foot';
    const save = document.createElement('button'); save.className = 'btn'; save.dataset.act = 'save'; save.textContent = 'SAVE NOW'; foot.appendChild(save);
    if (UI.titleHidden) {
      const reset = document.createElement('button'); reset.className = 'btn mm-del'; reset.dataset.act = 'reset'; reset.textContent = 'RESET THIS EGG'; foot.appendChild(reset);
    }
    box.appendChild(foot);
  }
  function openWardrobe() { renderWardrobe(); UI.openModal('#modal-wardrobe'); }
  function renderWardrobe() {
    const box = $('#wardrobe-body'); box.innerHTML = '';
    const owned = COSMETICS.filter(c => GAME.ownsCosmetic(c.id)).length;
    $('#wardrobe-sub').textContent = owned + ' / ' + COSMETICS.length + ' PIECES';
    const wrap = document.createElement('div'); wrap.className = 'wd-wrap';
    const prev = document.createElement('div'); prev.className = 'wd-preview';
    const poses = ['boss', 'cheer', 'guitar0', 'dance1'];
    prev.appendChild(UI.cloneCanvas(SPR.raccoonSprite(poses[Math.floor(performance.now() / 1200) % poses.length], 1, S().wardrobe), 6));
    const cap = document.createElement('b'); cap.textContent = 'THE FOUNDER'; prev.appendChild(cap);
    wrap.appendChild(prev);
    const racks = document.createElement('div'); racks.className = 'wd-racks';
    COSMETIC_KINDS.forEach(kind => {
      const sec = document.createElement('div'); sec.className = 'wd-rack';
      const h = document.createElement('i'); h.textContent = kind.name; sec.appendChild(h);
      const row = document.createElement('div'); row.className = 'wd-row';
      COSMETICS.filter(c => c.kind === kind.id).forEach(c => {
        const own = GAME.ownsCosmetic(c.id), on = S().wardrobe[c.kind] === c.id;
        const b = document.createElement('button');
        b.className = 'wd-item' + (on ? ' on' : '') + (own ? '' : ' locked');
        b.dataset.act = 'wear'; b.dataset.id = c.id; b.disabled = !own;
        b.appendChild(UI.cloneCanvas(SPR.raccoonSprite('boss', 1, Object.assign({}, S().wardrobe, { [c.kind]: c.id })), 2));
        const nm = document.createElement('small'); nm.textContent = c.name.toUpperCase(); b.appendChild(nm);
        if (!own) { const lk = document.createElement('em'); lk.appendChild(UI.mkIcon('lock', 1)); lk.appendChild(document.createTextNode(ACH_BY_ID[c.unlock] ? ACH_BY_ID[c.unlock].name : '')); b.appendChild(lk); }
        row.appendChild(b);
      });
      sec.appendChild(row); racks.appendChild(sec);
    });
    wrap.appendChild(racks); box.appendChild(wrap);
  }
  function openAch() { renderAch(); UI.openModal('#modal-ach'); }
  function renderAch() {
    const box = $('#ach-body'); box.innerHTML = '';
    const done = ACHIEVEMENTS.filter(a => GAME.achDone(a.id)).length;
    $('#ach-sub').textContent = done + ' / ' + ACHIEVEMENTS.length + ' EARNED';
    const grid = document.createElement('div'); grid.className = 'ach-grid';
    ACHIEVEMENTS.forEach(a => {
      const got = GAME.achDone(a.id);
      const [c, n] = GAME.achProgress(a);
      const card = document.createElement('div'); card.className = 'ach-card' + (got ? ' got' : '');
      const top = document.createElement('div'); top.className = 'fc-top';
      const ic = document.createElement('div'); ic.className = 'ach-icon'; ic.appendChild(UI.mkIcon(got ? a.icon : 'lock', 3)); top.appendChild(ic);
      const mid = document.createElement('div');
      const b = document.createElement('b'); b.textContent = a.name.toUpperCase(); mid.appendChild(b);
      const d = document.createElement('span'); d.textContent = a.desc; mid.appendChild(d);
      top.appendChild(mid); card.appendChild(top);
      const bar = document.createElement('div'); bar.className = 'qd-bar';
      const rail = document.createElement('div'); rail.className = 'qd-rail';
      const fill = document.createElement('s'); fill.style.width = Math.round(Math.min(1, c / n) * 100) + '%'; rail.appendChild(fill);
      bar.appendChild(rail);
      const num = document.createElement('i'); num.textContent = got ? 'DONE' : GAME.fmt(c) + '/' + GAME.fmt(n); bar.appendChild(num);
      card.appendChild(bar);
      const cos = COSMETICS.filter(k => k.unlock === a.id);
      if (cos.length) { const rw = document.createElement('small'); rw.textContent = 'UNLOCKS ' + cos.map(k => k.name.toUpperCase()).join(', ') + ' + 25 FEATHERS'; card.appendChild(rw); }
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  function show() { phase = 'attract'; actT = 0; resetAct(); hens = []; }
  function hide() {}

  function init(ui) {
    UI = ui; $ = ui.$; S = ui.S; W = ui.W;
    cv = $('#title-canvas'); g = cv.getContext('2d');
    TW = W.view.w; TH = W.view.h; cv.width = TW; cv.height = TH;
    hensFound = store.get('infEggCo_hens', 0) | 0;
    document.body.classList.toggle('big-ui', !!GAME.setting('bigUI'));
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', ev => { ev.preventDefault(); cv.setPointerCapture(ev.pointerId); onDown(ev); });
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointerleave', () => { ptr.inside = false; hover = null; });
    document.getElementById('app').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      switch (btn.dataset.act) {
        case 'set-toggle': GAME.setSetting(btn.dataset.k, !GAME.setting(btn.dataset.k)); UI.snd.plop(); renderSettings(); break;
        case 'wear': if (GAME.wearCosmetic(btn.dataset.id)) { UI.snd.sparkle(); renderWardrobe(); } else UI.snd.error(); break;
      }
    });
    document.getElementById('app').addEventListener('input', ev => {
      const inp = ev.target.closest('[data-set]');
      if (inp && inp.dataset.set === 'volume') { GAME.setSetting('volume', +inp.value); UI.snd.plop(); }
    });
    GAME.on('wardrobe', () => { if (!$('#modal-wardrobe').hidden) renderWardrobe(); });
    GAME.on('achievement', () => { if (!$('#modal-ach').hidden) renderAch(); });
    GAME.on('slot', () => { if (phase === 'basket') layoutSlots(); });
  }
  return { init, show, hide, draw, openSettings, openWardrobe, openAch, render: () => {} };
})();
