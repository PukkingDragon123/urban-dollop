/* ============================================================
   INF EGG CO. - THE MAIN MENU
   The founder on stage in his uniform, running through his act
   while you pick a save: a dance with the red guitar, a tree to
   chop, a factory to hammer up, a chicken or two to punch. Three
   eggs are the three save slots, each filled to how far along it
   is. Settings, the wardrobe and the achievements live here too,
   and in the game's own menu.
   ============================================================ */
'use strict';

window.MENU = (() => {
  let UI = null, $ = null, S = null, W = null;
  let cv = null, g = null, TW = 384, TH = 208;
  let actI = 0, actT = 0, hop = 0;
  let parts = [], props = null, coins = [], notes = [];
  let bills = [];
  let menuSig = '';

  const RAC_K = () => (TW >= 560 ? 3 : 2);
  function resetAct() {
    const act = MENU_ACTS[actI].id;
    props = { fall: 0, chops: 0, shake: 0, built: 0, chicks: [], flying: [], punched: 0, swing: 0 };
    if (act === 'punch') props.chicks = [0, 1, 2].map(i => ({ x: TW + 30 + i * 46, sp: SPECIES[(i * 7 + Math.floor(actT * 100)) % 30], hop: i * 1.3 }));
  }
  function nextAct() { actI = (actI + 1) % MENU_ACTS.length; actT = 0; resetAct(); }

  /* ---- the scene ---- */
  function draw(dt, now) {
    if (!cv) return;
    if (TW !== W.view.w || TH !== W.view.h) { TW = W.view.w; TH = W.view.h; cv.width = TW; cv.height = TH; g.imageSmoothingEnabled = false; bills = []; }
    if (!props) resetAct();
    actT += dt;
    if (actT > MENU_ACTS[actI].secs) nextAct();
    const act = MENU_ACTS[actI], K = RAC_K();
    g.imageSmoothingEnabled = false;
    /* a rich dusk with stars, and money in the air */
    const bands = ['#12142c', '#1a1c40', '#262458', '#3a2c6c', '#5a3478', '#7a3e7a', '#a04a6a', '#c8624e', '#e08a48', '#f0b45c'];
    const per = (TH * 0.7) / bands.length;
    for (let y = 0; y < TH; y++) {
      const f = y / per; const i = Math.min(bands.length - 1, Math.floor(f));
      g.fillStyle = bands[i]; g.fillRect(0, y, TW, 1);
      if (i < bands.length - 1 && f - i > 0.6) { g.fillStyle = bands[i + 1]; for (let x = y % 2; x < TW; x += 2) g.fillRect(x, y, 1, 1); }
    }
    for (let i = 0; i < 60; i++) { if (Math.floor(now / 400 + i) % 9 === 0) continue; g.fillStyle = i % 4 ? 'rgba(255,255,255,.7)' : 'rgba(255,230,180,.9)'; g.fillRect((i * 97) % TW, (i * 43) % Math.round(TH * 0.5), 1, 1); }
    /* the moon, big and low */
    g.fillStyle = '#fff3d0'; g.fillRect(TW - 70, 40, 22, 22); g.fillRect(TW - 73, 45, 28, 12); g.fillRect(TW - 65, 37, 12, 28);
    g.fillStyle = '#e8dcb8'; g.fillRect(TW - 60, 48, 5, 5); g.fillRect(TW - 66, 55, 3, 3); g.fillRect(TW - 54, 57, 2, 2);
    /* banknotes drifting down */
    if (bills.length < 14) bills.push({ x: Math.random() * TW, y: -10, v: 10 + Math.random() * 14, ph: Math.random() * 6 });
    bills.forEach(b => { b.y += b.v * dt; b.ph += dt * 3; if (b.y > TH) { b.y = -10; b.x = Math.random() * TW; } const bx = Math.round(b.x + Math.sin(b.ph) * 8), by = Math.round(b.y); g.fillStyle = '#6ab04c'; g.fillRect(bx, by, 9, 5); g.fillStyle = '#b8e986'; g.fillRect(bx + 1, by + 1, 7, 3); g.fillStyle = '#3f8a33'; g.fillRect(bx + 4, by + 2, 1, 1); });
    /* hills and a stage: the stage stands clear of the slot panel, whatever the window's shape */
    const panel = $('#menu-ui .mm-panel');
    const panelH = panel && !$('#menu-ui').hidden ? Math.ceil(panel.getBoundingClientRect().height / (UI.SC || 3)) : 0;
    const floorY = Math.max(Math.round(TH * 0.42), TH - panelH - 8);
    const FB = TH - floorY;
    const layers = [{ col: '#3a2a4a', rim: '#4d3a5e', base: 36, a: 12, sc: 46 }, { col: '#2c2040', rim: '#3d2e52', base: 18, a: 9, sc: 31 }];
    layers.forEach((L, li) => { for (let x = 0; x < TW; x++) { const h = Math.round(L.base + FB + Math.sin(x / L.sc + li) * L.a + Math.sin(x / 11 + li * 2) * 3); g.fillStyle = L.col; g.fillRect(x, TH - h, 1, h); g.fillStyle = L.rim; g.fillRect(x, TH - h, 1, 2); } });
    /* factories on the skyline, smoking */
    for (let i = 0; i < 4; i++) { const fx = 30 + i * Math.round(TW / 4.2), fh = 26 + (i % 2) * 10, fb = floorY - 24; g.fillStyle = '#1e1630'; g.fillRect(fx, fb - fh, 28, fh); g.fillRect(fx + 20, fb - fh - 12, 5, 12); for (let wy = 2; wy < fh - 6; wy += 7) for (let wx = 3; wx < 24; wx += 7) { g.fillStyle = (Math.floor(now / 1500) + wx + wy + i) % 4 ? '#ffd23f' : '#3a3050'; g.fillRect(fx + wx, fb - fh + wy, 3, 3); } for (let s2 = 0; s2 < 3; s2++) { const t = ((now / 1400 + s2 * 0.33 + i * 0.2) % 1); g.fillStyle = 'rgba(200,200,210,' + (0.5 - t * 0.45).toFixed(2) + ')'; g.fillRect(fx + 20 + Math.round(Math.sin(now / 500 + s2) * 3), Math.round(fb - fh - 12 - t * 22), 5 - Math.floor(t * 3), 3); } }
    g.fillStyle = '#2e2216'; g.fillRect(0, floorY, TW, TH - floorY);
    g.fillStyle = '#c94a3a'; g.fillRect(0, floorY, TW, 3); g.fillStyle = '#ffd23f'; for (let x = 4; x < TW; x += 14) g.fillRect(x, floorY + 5, 6, 1);
    g.fillStyle = '#3a2a16'; for (let x = 0; x < TW; x += 9) g.fillRect(x, floorY + 8, 1, TH - floorY - 8);
    /* footlights */
    for (let x = 12; x < TW; x += 40) { g.fillStyle = 'rgba(255,230,150,.10)'; g.fillRect(x - 10, floorY - 60, 22, 60); g.fillStyle = '#ffd23f'; g.fillRect(x, floorY - 1, 3, 2); }

    /* ---- the act ---- */
    const rx = Math.round(TW * 0.32), baseY = floorY + 2;
    const wardrobe = S().wardrobe;
    const stage = (pose, x, y, flip) => {
      const spr = SPR.raccoonSprite(pose, K, wardrobe);
      const ox = (spr.ox || 0) * K;
      g.save();
      if (flip) { g.translate(Math.round(x) + 20 * K, Math.round(y)); g.scale(-1, 1); g.drawImage(spr, -ox, -spr.height); }
      else g.drawImage(spr, Math.round(x) - ox, Math.round(y) - spr.height);
      g.restore();
      SPR.shadowEll(g, x + 10 * K, y + 1, 9 * K, 2, 0.35);
    };
    const chick = (sp, x, y, flip, k2) => { const c = SPR.chickenSprite(sp, k2, false); g.save(); if (flip) { g.translate(Math.round(x) + c.width, Math.round(y)); g.scale(-1, 1); g.drawImage(c, 0, -c.height); } else g.drawImage(c, Math.round(x), Math.round(y) - c.height); g.restore(); };
    if (act.id === 'dance') {
      const beat = Math.floor(now / 250) % 2;
      hop = Math.abs(Math.sin(now / 250)) * 4 * K;
      /* stacks of money either side of him */
      for (let s2 = 0; s2 < 2; s2++) { const sx = rx + (s2 ? 26 * K : -22 * K), n = 5 + s2 * 2; for (let i = 0; i < n; i++) { g.fillStyle = '#3f8a33'; g.fillRect(sx, baseY - 4 * K - i * 3 * K, 12 * K, 3 * K); g.fillStyle = '#8fd14f'; g.fillRect(sx + K, baseY - 4 * K - i * 3 * K, 10 * K, K); } g.fillStyle = '#ffd23f'; g.fillRect(sx + 4 * K, baseY - 4 * K - n * 3 * K, 4 * K, 2 * K); }
      stage(beat ? 'guitar1' : 'guitar0', rx, baseY - hop, false);
      /* notes off the guitar */
      if (Math.random() < dt * 6) notes.push({ x: rx + 24 * K, y: baseY - 18 * K, t: 0, ph: Math.random() * 6 });
      notes = notes.filter(n => (n.t += dt) < 1.6);
      notes.forEach(n => { const nx = Math.round(n.x + Math.sin(n.t * 4 + n.ph) * 6 + n.t * 18), ny = Math.round(n.y - n.t * 34); g.globalAlpha = 1 - n.t / 1.6; g.fillStyle = '#fff8ec'; g.fillRect(nx, ny, 2, 2); g.fillRect(nx + 2, ny - 4, 1, 5); g.fillRect(nx + 2, ny - 4, 3, 1); g.globalAlpha = 1; });
      /* coins raining */
      if (Math.random() < dt * 8) coins.push({ x: rx - 40 * K + Math.random() * 80 * K, y: floorY - 90 * K / 3, v: 30 + Math.random() * 40, t: 0 });
      coins = coins.filter(c => (c.t += dt) < 3 && c.y < floorY);
      coins.forEach(c => { c.y += c.v * dt; g.fillStyle = '#e0a416'; g.fillRect(Math.round(c.x), Math.round(c.y), 3, 3); g.fillStyle = '#ffd23f'; g.fillRect(Math.round(c.x), Math.round(c.y), 2, 2); });
    } else if (act.id === 'chop') {
      /* a tree to the right takes six chops and comes down */
      const tx = rx + 34 * K;
      const swing = Math.floor(actT * 2.2) % 2;
      if (swing !== props.swing) { props.swing = swing; if (swing === 1) { props.chops++; props.shake = 0.3; for (let i = 0; i < 6; i++) parts.push({ x: tx + 8 * K, y: baseY - 22 * K, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30, t: 0, life: 0.9, col: i % 2 ? '#7fbf4f' : '#e0bd82' }); } }
      props.shake = Math.max(0, props.shake - dt);
      const falling = props.chops >= 5;
      if (falling) props.fall = Math.min(1, props.fall + dt * 1.4);
      const tree = SPR.decoSprite('tree', K, 77);
      g.save();
      const jit = props.shake > 0 ? Math.round(Math.sin(now / 30) * 2) : 0;
      g.translate(Math.round(tx) + jit, baseY);
      g.rotate(props.fall * props.fall * 1.45);
      g.drawImage(tree, -Math.floor(tree.width / 2), -tree.height);
      g.restore();
      if (props.fall >= 1) { g.fillStyle = '#5e3d18'; g.fillRect(tx - 4 * K, baseY - 5 * K, 8 * K, 5 * K); g.fillStyle = '#c9924f'; g.fillRect(tx - 3 * K, baseY - 5 * K, 6 * K, K); if (Math.random() < dt * 12) parts.push({ x: tx + 20 * K, y: baseY - 4, vx: (Math.random() - 0.5) * 40, vy: -10, t: 0, life: 0.6, col: '#c9a35f' }); }
      /* the wood pile so far */
      for (let i = 0; i < Math.min(props.chops, 5); i++) { g.fillStyle = '#8a5e2a'; g.fillRect(tx + 28 * K + (i % 3) * 7 * K, baseY - 3 * K - Math.floor(i / 3) * 3 * K, 6 * K, 3 * K); g.fillStyle = '#e0bd82'; g.fillRect(tx + 28 * K + (i % 3) * 7 * K, baseY - 3 * K - Math.floor(i / 3) * 3 * K, K, 3 * K); }
      stage(swing ? 'chop1' : 'chop0', rx, baseY, false);
    } else if (act.id === 'build') {
      /* the factory rises plank by plank to the right */
      const fx = rx + 34 * K, fw = 40 * K, fh = 46 * K;
      const prog = Math.min(1, actT / (act.secs - 0.8));
      const swing = Math.floor(actT * 3) % 2;
      if (swing !== props.swing) { props.swing = swing; if (swing === 1) for (let i = 0; i < 5; i++) parts.push({ x: fx + 6 * K, y: baseY - prog * fh, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 30, t: 0, life: 0.5, col: i % 2 ? '#ffd23f' : '#fff8ec' }); }
      const h = Math.round(fh * prog);
      g.fillStyle = '#2e2216'; g.fillRect(fx - 1, baseY - h - 1, fw + 2, h + 1);
      g.fillStyle = '#b5714f'; g.fillRect(fx, baseY - h, fw, h);
      for (let yy = 4 * K; yy < h - 3 * K; yy += 6 * K) for (let xx = 3 * K; xx < fw - 4 * K; xx += 8 * K) { g.fillStyle = prog >= 1 && (Math.floor(now / 900) + xx + yy) % 3 ? '#ffe9a0' : '#3a2a16'; g.fillRect(fx + xx, baseY - h + yy, 4 * K, 4 * K); }
      if (prog >= 0.6) { const ch = Math.round((prog - 0.6) / 0.4 * 14 * K); g.fillStyle = '#2e2216'; g.fillRect(fx + fw - 10 * K, baseY - h - ch, 6 * K, ch); g.fillStyle = '#6a7280'; g.fillRect(fx + fw - 9 * K, baseY - h - ch + 1, 4 * K, ch); }
      if (prog >= 1) { for (let s2 = 0; s2 < 4; s2++) { const t = ((now / 900 + s2 * 0.25) % 1); g.fillStyle = 'rgba(210,210,220,' + (0.7 - t * 0.6).toFixed(2) + ')'; g.fillRect(fx + fw - 9 * K + Math.round(Math.sin(now / 400 + s2) * 3), Math.round(baseY - h - 14 * K - t * 30), 5 * K - Math.floor(t * 6), 3); } g.drawImage(SPR.iconSprite(S().company.logo || 'egg', K), fx + Math.round(fw / 2) - 5 * K, baseY - h + 3 * K); }
      /* scaffold */
      if (prog < 1) { g.fillStyle = '#c9924f'; g.fillRect(fx - 4, baseY - fh - 6, 2, fh + 6); g.fillRect(fx + fw + 2, baseY - fh - 6, 2, fh + 6); for (let i = 0; i < 4; i++) g.fillRect(fx - 4, baseY - 8 * K * (i + 1), fw + 8, 1); }
      stage(swing ? 'hammer1' : 'hammer0', rx, baseY, false);
    } else {
      /* chickens file in from the right; he winds up and sends them flying */
      const reach = rx + 26 * K;
      let punching = false;
      props.chicks.forEach(c => { c.x -= 26 * K / 3 * dt; c.hop += dt * 7; if (c.x < reach && !c.flying) { c.flying = true; c.vx = 90 * K / 3 + Math.random() * 40; c.vy = -110 * K / 3; c.rot = 0; props.punched++; props.flash = 0.25; for (let i = 0; i < 8; i++) parts.push({ x: c.x, y: baseY - 10 * K, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 40, t: 0, life: 0.7, col: i % 2 ? '#ffd23f' : '#fff8ec' }); } });
      props.flash = Math.max(0, (props.flash || 0) - dt);
      punching = props.flash > 0.12;
      props.chicks.forEach(c => {
        if (c.flying) {
          c.x += c.vx * dt; c.y = (c.y || 0) + c.vy * dt; c.vy += 160 * dt; c.rot += dt * 9;
          g.save(); g.translate(Math.round(c.x), Math.round(baseY - 12 * K + c.y)); g.rotate(c.rot); const cs = SPR.chickenSprite(c.sp, K, false); g.drawImage(cs, -cs.width / 2, -cs.height / 2); g.restore();
          /* stars round the head */
          for (let i = 0; i < 3; i++) { const a = c.rot * 2 + i * 2.1; g.fillStyle = '#ffd23f'; g.fillRect(Math.round(c.x + Math.cos(a) * 10 * K), Math.round(baseY - 12 * K + c.y + Math.sin(a) * 5 * K - 8 * K), 2, 2); }
        } else if (c.x < TW + 40) {
          const hp = Math.abs(Math.sin(c.hop)) * 2 * K;
          SPR.shadowEll(g, c.x + 10 * K, baseY + 1, 6 * K, 1.5, 0.3);
          chick(c.sp, c.x, baseY - hp, true, K);
        }
      });
      if (props.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + (props.flash * 2).toFixed(2) + ')'; g.fillRect(reach - 4 * K, baseY - 20 * K, 12 * K, 12 * K); const t = ['POW', 'BONK', 'CLUCK'][props.punched % 3]; SPR.drawTitle(g, t, reach, baseY - 34 * K, '#ffd23f', '#2e2216', Math.max(1, K - 1)); }
      const windup = Math.floor(actT * 4) % 3 === 0 && !punching;
      stage(punching ? 'punch1' : windup ? 'punch0' : 'stand', rx, baseY, false);
    }
    /* particles */
    parts = parts.filter(p => (p.t += dt) < p.life);
    parts.forEach(p => { p.vy += 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.col; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); g.globalAlpha = 1; });

    /* ---- the logo and his line ---- */
    const title = 'INF EGG CO.';
    const k = SPR.textW(title, 3) < TW - 16 ? 3 : SPR.textW(title, 2) < TW - 12 ? 2 : 1;
    SPR.drawTitle(g, title, Math.round(TW / 2 - SPR.textW(title, k) / 2), 14, '#ffd23f', '#3a2410', k);
    const line = act.line;
    const shown = line.slice(0, Math.floor(actT * 22));
    const lw = SPR.textW(line, 1);
    g.fillStyle = 'rgba(24,18,12,.7)'; g.fillRect(Math.round(TW / 2 - lw / 2) - 8, 14 + k * 8 + 8, lw + 16, 14);
    SPR.drawText(g, shown, Math.round(TW / 2 - lw / 2), 14 + k * 8 + 11, '#fff8ec', 1, '#1a120a');
    const tally = GAME.disc() + ' OF ' + SPECIES_TOTAL + ' CHICKENS FOUND  -  ' + GAME.completion() + '% COMPLETE';
    SPR.drawTiny(g, tally, Math.round(TW / 2 - SPR.tinyW(tally, 1) / 2), 14 + k * 8 + 26, '#e8d5a8', 1, '#1a120a');
  }

  /* ---- the menu itself: three eggs and a row of keys ---- */
  function eggSlot(i, info) {
    const wrap = document.createElement('button');
    wrap.className = 'mm-slot' + (i === GAME.currentSlot() ? ' active' : '') + (info ? '' : ' empty');
    wrap.dataset.act = 'slot-pick'; wrap.dataset.i = String(i);
    const c = document.createElement('canvas');
    c.width = 66; c.height = 80; c.className = 'px-icon';
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    /* an egg drawn in fat pixels, filled from the bottom to the completion */
    const pct = info ? info.pct : 0;
    const col1 = info ? info.col1 : '#c9c0a8', col2 = info ? info.col2 : '#e8e2d0';
    const rows = [];
    for (let y = 0; y < 40; y++) { const t = y / 40; const half = Math.round(13 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.58) / (t < 0.58 ? 0.58 : 0.42), 2)))); rows.push(half); }
    rows.forEach((half, y) => {
      if (half <= 0) return;
      const yy = y * 2, xx = 33 - half * 2;
      x.fillStyle = '#2e2216'; x.fillRect(xx - 2, yy, half * 4 + 4, 2);
      const filled = info && (1 - y / 40) <= pct / 100;
      x.fillStyle = filled ? col1 : '#fff8ec'; x.fillRect(xx, yy, half * 4, 2);
      if (filled && (y + 1) % 4 === 0) { x.fillStyle = col2; x.fillRect(xx + 6, yy, Math.max(2, half * 4 - 12), 2); }
      if (!filled && y > 4 && y < 30 && (y % 6 === 0)) { x.fillStyle = '#f2e2c8'; x.fillRect(xx + half * 4 - 8, yy, 4, 2); }
    });
    x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(16, 12, 4, 8); x.fillRect(20, 8, 2, 4);
    if (info && info.logo) x.drawImage(SPR.iconSprite(info.logo, 2), 23, 30);
    wrap.appendChild(c);
    const nm = document.createElement('b'); nm.textContent = info ? (info.name || 'INF EGG CO.').toUpperCase() : 'NEW EGG'; wrap.appendChild(nm);
    const sub = document.createElement('small');
    sub.textContent = info ? pct + '% COMPLETE' : 'START FRESH';
    wrap.appendChild(sub);
    if (info) {
      const meta = document.createElement('span');
      meta.textContent = (AGES[info.age] ? AGES[info.age].name.toUpperCase() : 'STRAW AGE') + ' - ' + GAME.fmtTime(info.playT || 0) + ' PLAYED';
      wrap.appendChild(meta);
      const bar = document.createElement('u'); const f = document.createElement('s'); f.style.width = pct + '%'; f.style.background = col1; bar.appendChild(f); wrap.appendChild(bar);
    }
    const tag = document.createElement('i'); tag.textContent = 'EGG ' + (i + 1); wrap.appendChild(tag);
    return wrap;
  }
  function render() {
    const box = $('#menu-ui');
    if (!box) return;
    const infos = []; for (let i = 0; i < SAVE_SLOTS; i++) infos.push(GAME.slotInfo(i));
    const sig = GAME.currentSlot() + '|' + JSON.stringify(infos.map(x => x && [x.pct, x.name, x.at]));
    if (sig === menuSig && box.children.length) return;
    menuSig = sig;
    box.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'mm-panel';
    const h = document.createElement('div'); h.className = 'mm-h'; h.textContent = 'PICK AN EGG'; panel.appendChild(h);
    const slots = document.createElement('div'); slots.className = 'mm-slots';
    infos.forEach((info, i) => slots.appendChild(eggSlot(i, info)));
    panel.appendChild(slots);
    const cur = infos[GAME.currentSlot()];
    const row = document.createElement('div'); row.className = 'mm-btns';
    const play = document.createElement('button');
    play.className = 'btn btn-green mm-play'; play.dataset.act = 'menu-play';
    play.textContent = cur && cur.done ? 'CONTINUE' : 'START';
    row.appendChild(play);
    [['open-settings', 'SETTINGS', 'gear'], ['open-wardrobe', 'WARDROBE', 'tophat'], ['open-ach', 'AWARDS', 'medal']].forEach(([act, name, icon]) => {
      const b = document.createElement('button'); b.className = 'btn'; b.dataset.act = act; b.appendChild(UI.mkIcon(icon, 2)); b.appendChild(document.createTextNode(name)); row.appendChild(b);
    });
    if (cur) { const del = document.createElement('button'); del.className = 'btn mm-del'; del.dataset.act = 'slot-delete'; del.dataset.i = String(GAME.currentSlot()); del.textContent = 'DELETE EGG'; row.appendChild(del); }
    panel.appendChild(row);
    box.appendChild(panel);
  }
  function show() { menuSig = ''; render(); $('#menu-ui').hidden = false; }
  function hide() { $('#menu-ui').hidden = true; }

  /* ---- settings ---- */
  const SETTING_NAMES = { sound: ['SOUND', 'Every beep, cluck and clink.'], volume: ['VOLUME', ''], news: ['NEWS POP-UPS', 'Little cards in the corner for every event. Off by default: the founder and the to-do list carry the news.'],
    shake: ['SCREEN POP', 'Numbers and keys pop when they change.'], dayNight: ['DAY AND NIGHT', 'Dawn, dusk, night and lamps over the valley.'], particles: ['PARTICLES', 'Dust, crumbs, leaves and fireflies.'],
    bigUI: ['BIG INTERFACE', 'Larger keys and text.'], showFps: ['FRAME COUNTER', 'A frame rate in the corner.'], autosave: ['AUTOSAVE', 'Save every ten seconds and on the way out.'] };
  function openSettings() { renderSettings(); UI.openModal('#modal-settings'); }
  function renderSettings() {
    const box = $('#settings-body'); box.innerHTML = '';
    Object.keys(SETTINGS_DEFAULT).forEach(k => {
      const [name, desc] = SETTING_NAMES[k] || [k.toUpperCase(), ''];
      const row = document.createElement('div'); row.className = 'set-row';
      const mid = document.createElement('div'); const b = document.createElement('b'); b.textContent = name; mid.appendChild(b);
      if (desc) { const d = document.createElement('span'); d.textContent = desc; mid.appendChild(d); }
      row.appendChild(mid);
      if (k === 'volume') {
        const inp = document.createElement('input'); inp.type = 'range'; inp.min = '0'; inp.max = '1'; inp.step = '0.05'; inp.value = String(GAME.setting('volume')); inp.dataset.set = 'volume'; row.appendChild(inp);
      } else {
        const tog = document.createElement('button'); tog.className = 'toggle' + (GAME.setting(k) ? ' on' : ''); tog.dataset.act = 'set-toggle'; tog.dataset.k = k; tog.textContent = GAME.setting(k) ? 'ON' : 'OFF'; row.appendChild(tog);
      }
      box.appendChild(row);
    });
    const foot = document.createElement('div'); foot.className = 'set-foot';
    const save = document.createElement('button'); save.className = 'btn'; save.dataset.act = 'save'; save.textContent = 'SAVE NOW'; foot.appendChild(save);
    const reset = document.createElement('button'); reset.className = 'btn mm-del'; reset.dataset.act = 'reset'; reset.textContent = 'RESET THIS EGG'; foot.appendChild(reset);
    box.appendChild(foot);
  }
  /* ---- the wardrobe ---- */
  function openWardrobe() { renderWardrobe(); UI.openModal('#modal-wardrobe'); }
  function renderWardrobe() {
    const box = $('#wardrobe-body'); box.innerHTML = '';
    const owned = COSMETICS.filter(c => GAME.ownsCosmetic(c.id)).length;
    $('#wardrobe-sub').textContent = owned + ' / ' + COSMETICS.length + ' PIECES';
    const wrap = document.createElement('div'); wrap.className = 'wd-wrap';
    const prev = document.createElement('div'); prev.className = 'wd-preview';
    const poses = ['boss', 'cheer', 'guitar0', 'dance1'];
    const pose = poses[Math.floor(performance.now() / 1200) % poses.length];
    prev.appendChild(UI.cloneCanvas(SPR.raccoonSprite(pose, 1, S().wardrobe), 6));
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
        const trial = Object.assign({}, S().wardrobe, { [c.kind]: c.id });
        b.appendChild(UI.cloneCanvas(SPR.raccoonSprite('boss', 1, trial), 2));
        const nm = document.createElement('small'); nm.textContent = c.name.toUpperCase(); b.appendChild(nm);
        if (!own) { const lk = document.createElement('em'); lk.appendChild(UI.mkIcon('lock', 1)); lk.appendChild(document.createTextNode(ACH_BY_ID[c.unlock] ? ACH_BY_ID[c.unlock].name : '')); b.appendChild(lk); }
        row.appendChild(b);
      });
      sec.appendChild(row);
      racks.appendChild(sec);
    });
    wrap.appendChild(racks);
    box.appendChild(wrap);
  }
  /* ---- achievements ---- */
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
      const mid = document.createElement('div'); const b = document.createElement('b'); b.textContent = a.name.toUpperCase(); mid.appendChild(b); const d = document.createElement('span'); d.textContent = a.desc; mid.appendChild(d); top.appendChild(mid);
      card.appendChild(top);
      const bar = document.createElement('div'); bar.className = 'qd-bar';
      const rail = document.createElement('div'); rail.className = 'qd-rail'; const fill = document.createElement('s'); fill.style.width = Math.round(Math.min(1, c / n) * 100) + '%'; rail.appendChild(fill); bar.appendChild(rail);
      const num = document.createElement('i'); num.textContent = got ? 'DONE' : GAME.fmt(c) + '/' + GAME.fmt(n); bar.appendChild(num);
      card.appendChild(bar);
      const cos = COSMETICS.filter(k => k.unlock === a.id);
      if (cos.length) { const rw = document.createElement('small'); rw.textContent = 'UNLOCKS ' + cos.map(k => k.name.toUpperCase()).join(', ') + ' + 25 FEATHERS'; card.appendChild(rw); }
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  function init(ui) {
    UI = ui; $ = ui.$; S = ui.S; W = ui.W;
    cv = $('#title-canvas'); g = cv.getContext('2d');
    TW = W.view.w; TH = W.view.h; cv.width = TW; cv.height = TH;
    document.body.classList.toggle('big-ui', !!GAME.setting('bigUI'));
    document.getElementById('app').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      switch (btn.dataset.act) {
        case 'slot-pick': { const i = +btn.dataset.i; if (GAME.setSlot(i)) { UI.snd.plop(); } menuSig = ''; render(); break; }
        case 'slot-delete': {
          const i = +btn.dataset.i;
          if (confirm('Crack egg ' + (i + 1) + ' for good? Everything in it is gone.')) { GAME.deleteSlot(i); UI.snd.demolish(); menuSig = ''; render(); }
          break;
        }
        case 'menu-play': { if (!S().company.done) UI.startIntro(); else { UI.hideTitle(); UI.snd.sparkle(); } break; }
        case 'set-toggle': { GAME.setSetting(btn.dataset.k, !GAME.setting(btn.dataset.k)); UI.snd.plop(); renderSettings(); break; }
        case 'wear': { if (GAME.wearCosmetic(btn.dataset.id)) { UI.snd.sparkle(); renderWardrobe(); } else UI.snd.error(); break; }
        case 'reset': { setTimeout(() => { menuSig = ''; render(); }, 0); break; }
      }
    });
    document.getElementById('app').addEventListener('input', ev => {
      const inp = ev.target.closest('[data-set]');
      if (!inp) return;
      if (inp.dataset.set === 'volume') { GAME.setSetting('volume', +inp.value); UI.snd.plop(); }
    });
    GAME.on('slot', () => { menuSig = ''; if (!$('#menu-ui').hidden) render(); });
    GAME.on('wardrobe', () => { if (!$('#modal-wardrobe').hidden) renderWardrobe(); });
    GAME.on('achievement', () => { if (!$('#modal-ach').hidden) renderAch(); });
  }
  return { init, show, hide, draw, render, openSettings, openWardrobe, openAch };
})();
