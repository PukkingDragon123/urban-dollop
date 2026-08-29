/* ============================================================
   INF EGG CO. — UI: rendering, canvas scenes, fx, audio, boot
   ============================================================ */
'use strict';

(() => {
  const $ = sel => document.querySelector(sel);
  const S = () => GAME.S;

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
        const start = t0 + i * dur * 0.9;
        o.frequency.setValueAtTime(f, start);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), start + dur);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(vol || 0.08, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.connect(g).connect(a.destination);
        o.start(start); o.stop(start + dur + 0.02);
      });
    }
    return {
      pet()    { tone([300 + Math.random() * 60], 0.06, 'square', 0.05, 0.8); },
      egg()    { tone([523, 784], 0.09, 'triangle', 0.09); },
      coin()   { tone([988, 1319], 0.07, 'sine', 0.08); },
      hatch()  { tone([523, 659, 784, 1047], 0.11, 'triangle', 0.09); },
      skill()  { tone([392, 523, 659], 0.09, 'square', 0.06); },
      error()  { tone([130], 0.12, 'square', 0.06, 0.7); },
      sparkle(){ tone([784, 1175, 1568], 0.08, 'sine', 0.07); },
      grand()  { tone([392, 494, 587, 784, 1175], 0.13, 'triangle', 0.1); },
    };
  })();

  /* ================= FX: floats & toasts ================= */
  const fxLayer = $('#fx-layer');
  function floatText(txt, x, y, cls) {
    const el = document.createElement('div');
    el.className = 'float-txt' + (cls ? ' ' + cls : '');
    el.textContent = txt;
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }
  function floatAt(el, txt, cls) {
    const r = el.getBoundingClientRect();
    floatText(txt, r.left + r.width / 2 - 20 + (Math.random() * 30 - 15), r.top - 8, cls);
  }

  const toastBox = $('#toasts');
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
  let lastMutToast = 0;

  /* ================= sprite -> element helpers ================= */
  function cloneCanvas(src) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }
  const chickEl = (sp, k, sil) => cloneCanvas(SPR.chickenSprite(sp, k, sil));
  const eggEl = (tier, k) => cloneCanvas(SPR.eggSprite(tier, k));
  function tierChip(t) {
    return `<span class="tier-chip" style="background:${TIERS[t].c}">${TIERS[t].n}</span>`;
  }

  /* ================= MAMA SCENE ================= */
  const stage = $('#mama-stage');
  const sctx = stage.getContext('2d');
  let hearts = [], eggFlies = [], clouds = [];
  let lastPetAt = -99, petSquish = 0, blinkAt = 0;

  function sizeStage() {
    const w = stage.clientWidth || 300;
    const h = stage.clientHeight || 230;
    if (stage.width !== w) stage.width = w;
    if (stage.height !== h) stage.height = h;
  }
  function initClouds() {
    clouds = [0, 1, 2].map(i => ({
      x: Math.random() * 300, y: 14 + i * 26 + Math.random() * 8,
      w: 40 + Math.random() * 30, v: 3 + Math.random() * 4,
    }));
  }
  function spawnHearts(n) {
    const w = stage.width, h = stage.height;
    for (let i = 0; i < n; i++) {
      hearts.push({
        x: w / 2 + (Math.random() * 90 - 45),
        y: h - 90 - Math.random() * 40,
        vy: -(22 + Math.random() * 20), vx: Math.random() * 16 - 8,
        life: 1 + Math.random() * 0.4, t: 0, s: Math.random() < 0.3 ? 3 : 2,
      });
    }
  }
  function spawnEggFly(tier) {
    eggFlies.push({ tier, t: 0, x: stage.width / 2 + (Math.random() * 40 - 20), y: stage.height - 96 });
  }
  const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'];
  function drawHeart(x, y, s, alpha) {
    sctx.globalAlpha = alpha;
    sctx.fillStyle = '#ff5f9e';
    for (let r = 0; r < HEART.length; r++)
      for (let cx = 0; cx < 5; cx++)
        if (HEART[r][cx] === 'x') sctx.fillRect(x + cx * s, y + r * s, s, s);
    sctx.globalAlpha = 1;
  }

  function drawMamaScene(now, dt) {
    sizeStage();
    const w = stage.width, h = stage.height;
    sctx.imageSmoothingEnabled = false;
    /* sky */
    sctx.fillStyle = '#aee3ff'; sctx.fillRect(0, 0, w, h);
    sctx.fillStyle = '#c4ecff'; sctx.fillRect(0, h * 0.4, w, h * 0.6);
    /* sun */
    sctx.fillStyle = '#ffd23f';
    sctx.fillRect(w - 52, 12, 26, 26);
    sctx.fillRect(w - 58, 18, 38, 14); sctx.fillRect(w - 46, 6, 14, 38);
    sctx.fillStyle = '#ffe9a0'; sctx.fillRect(w - 48, 16, 18, 18);
    /* clouds */
    sctx.fillStyle = '#ffffff';
    clouds.forEach(cl => {
      cl.x += cl.v * dt;
      if (cl.x > w + 60) cl.x = -80;
      const x = Math.round(cl.x), y = Math.round(cl.y);
      sctx.fillRect(x, y + 6, cl.w, 10);
      sctx.fillRect(x + 8, y, cl.w - 20, 8);
      sctx.fillRect(x + 4, y + 14, cl.w - 8, 6);
    });
    /* grass */
    const gy = h - 44;
    sctx.fillStyle = '#9ede63'; sctx.fillRect(0, gy, w, 44);
    sctx.fillStyle = '#8bcf52';
    for (let x = 0; x < w; x += 16) sctx.fillRect(x + (Math.floor(gy) % 2 ? 8 : 0), gy, 8, 6);
    /* nest */
    const nest = SPR.nestSprite(7);
    const nx = Math.round(w / 2 - nest.width / 2), ny = h - nest.height - 6;
    /* mama */
    const tier = S().mamaTier;
    const sincePet = (now - lastPetAt) / 1000;
    let mood = 'idle';
    if (sincePet < 0.7) mood = 'happy';
    else if (now / 1000 > blinkAt && now / 1000 < blinkAt + 0.18) mood = 'blink';
    if (now / 1000 > blinkAt + 0.18) blinkAt = now / 1000 + 2.5 + Math.random() * 2.5;
    const mama = SPR.mamaSprite(tier, 5, mood);
    petSquish = Math.max(0, petSquish - dt * 5);
    const bob = Math.sin(now / 450) * 2;
    const mx = w / 2, myBottom = ny + 14;
    sctx.save();
    sctx.translate(mx, myBottom);
    sctx.scale(1 + petSquish * 0.14, 1 - petSquish * 0.14);
    sctx.drawImage(mama, Math.round(-mama.width / 2), Math.round(-mama.height + bob));
    sctx.restore();
    sctx.drawImage(nest, nx, ny);

    /* egg flies */
    eggFlies = eggFlies.filter(e => e.t < 0.9);
    eggFlies.forEach(e => {
      e.t += dt;
      const spr = SPR.eggSprite(e.tier, 3);
      const yy = e.y - 90 * e.t + 70 * e.t * e.t;
      sctx.globalAlpha = Math.max(0, 1 - e.t / 0.9);
      sctx.drawImage(spr, Math.round(e.x - spr.width / 2), Math.round(yy));
      sctx.globalAlpha = 1;
    });
    /* hearts */
    hearts = hearts.filter(hh => hh.t < hh.life);
    hearts.forEach(hh => {
      hh.t += dt;
      hh.x += hh.vx * dt; hh.y += hh.vy * dt;
      drawHeart(Math.round(hh.x), Math.round(hh.y), hh.s, Math.max(0, 1 - hh.t / hh.life));
    });
  }

  /* ================= YARD SCENE ================= */
  const yard = $('#yard');
  const yctx = yard.getContext('2d');
  let wanderers = [];
  const MAX_WANDER = 40;
  let flowerSeed = [];

  function sizeYard() {
    const w = yard.clientWidth || 400;
    const h = yard.clientHeight || 150;
    if (yard.width !== w) { yard.width = w; flowerSeed = []; }
    if (yard.height !== h) yard.height = h;
  }
  function ensureFlowers() {
    if (flowerSeed.length || !yard.width) return;
    const cols = ['#ff8ab5', '#fff5d9', '#ffd23f', '#c9a8f0'];
    for (let i = 0; i < Math.max(6, Math.floor(yard.width / 60)); i++) {
      flowerSeed.push({
        x: Math.floor(Math.random() * (yard.width - 10)) + 5,
        y: 44 + Math.floor(Math.random() * (yard.height - 60)),
        c: cols[i % cols.length],
      });
    }
  }
  function syncWanderers() {
    /* build desired list of species ids (one entry per bird, capped) */
    const want = [];
    const ids = Object.keys(S().flock).map(Number).sort((a, b) => SPECIES[b].tier - SPECIES[a].tier);
    outer: for (const id of ids) {
      for (let i = 0; i < S().flock[id]; i++) {
        want.push(id);
        if (want.length >= MAX_WANDER) break outer;
      }
    }
    /* keep existing entities where possible */
    const pool = wanderers.slice();
    const yw = yard.width || yard.clientWidth || 640;
    const yh = yard.height || yard.clientHeight || 150;
    wanderers = want.map(id => {
      const i = pool.findIndex(e => e.id === id);
      if (i >= 0) return pool.splice(i, 1)[0];
      return {
        id,
        x: 12 + Math.random() * Math.max(40, yw - 70),
        y: 40 + Math.random() * Math.max(20, yh - 100),
        dir: Math.random() < 0.5 ? -1 : 1,
        speed: 8 + Math.random() * 10,
        state: 'idle', t: Math.random() * 2,
      };
    });
  }

  function drawYard(now, dt) {
    sizeYard(); ensureFlowers();
    const w = yard.width, h = yard.height;
    yctx.imageSmoothingEnabled = false;
    /* grass checker */
    yctx.fillStyle = '#9ede63'; yctx.fillRect(0, 0, w, h);
    yctx.fillStyle = '#93d55b';
    for (let y = 0; y < h; y += 12)
      for (let x = (y / 12) % 2 ? 12 : 0; x < w; x += 24)
        yctx.fillRect(x, y, 12, 12);
    /* fence */
    yctx.fillStyle = '#c98f4f';
    yctx.fillRect(0, 10, w, 5); yctx.fillRect(0, 22, w, 5);
    for (let x = 8; x < w; x += 48) {
      yctx.fillStyle = '#b3773f'; yctx.fillRect(x, 2, 8, 32);
      yctx.fillStyle = '#8a5e2a'; yctx.fillRect(x, 2, 8, 3);
      yctx.fillStyle = '#c98f4f';
    }
    /* flowers */
    flowerSeed.forEach(f => {
      yctx.fillStyle = f.c;
      yctx.fillRect(f.x - 2, f.y, 2, 2); yctx.fillRect(f.x + 2, f.y, 2, 2);
      yctx.fillRect(f.x, f.y - 2, 2, 2); yctx.fillRect(f.x, f.y + 2, 2, 2);
      yctx.fillStyle = '#ffd23f'; yctx.fillRect(f.x, f.y, 2, 2);
    });
    /* chickens */
    wanderers.forEach(e => {
      e.t -= dt;
      if (e.t <= 0) {
        const r = Math.random();
        if (r < 0.45) { e.state = 'walk'; e.dir = Math.random() < 0.5 ? -1 : 1; e.t = 0.8 + Math.random() * 1.8; }
        else if (r < 0.75) { e.state = 'idle'; e.t = 0.6 + Math.random() * 1.6; }
        else { e.state = 'peck'; e.t = 0.7 + Math.random() * 0.8; }
      }
      if (e.state === 'walk') {
        e.x += e.dir * e.speed * dt;
        e.y += Math.sin(now / 300 + e.x) * 4 * dt;
        if (e.x < 6) { e.x = 6; e.dir = 1; }
        if (e.x > w - 54) { e.x = w - 54; e.dir = -1; }
        e.y = Math.max(34, Math.min(h - 62, e.y));
      }
      const sp = SPECIES[e.id];
      const spr = SPR.chickenSprite(sp, 3, false);
      const bob = e.state === 'walk' ? Math.abs(Math.sin(now / 110 + e.id)) * 3
                : e.state === 'peck' ? Math.abs(Math.sin(now / 200)) * 2 : Math.sin(now / 500 + e.id) * 1;
      const yy = Math.round(e.y - (e.state === 'peck' ? -bob : bob));
      yctx.save();
      if (e.dir === 1) {
        yctx.translate(Math.round(e.x) + spr.width, yy);
        yctx.scale(-1, 1);
        yctx.drawImage(spr, 0, 0);
      } else {
        yctx.drawImage(spr, Math.round(e.x), yy);
      }
      yctx.restore();
      /* sparkle for cosmic+ */
      if (sp.tier >= 6 && Math.random() < 0.08) {
        yctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#ffd23f';
        yctx.fillRect(Math.round(e.x + Math.random() * spr.width), Math.round(yy + Math.random() * spr.height * 0.7), 3, 3);
      }
    });
    /* empty message */
    if (!wanderers.length) {
      yctx.fillStyle = 'rgba(82,53,31,.75)';
      yctx.font = '16px "Press Start 2P", monospace';
      yctx.textAlign = 'center';
      yctx.fillText('hatch a chicken!', w / 2, h / 2 + 6);
    }
  }

  /* yard click: name the chicken you tapped */
  yard.addEventListener('pointerdown', ev => {
    const r = yard.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const hit = [...wanderers].reverse().find(e => x >= e.x - 6 && x <= e.x + 66 && y >= e.y - 6 && y <= e.y + 66);
    if (hit) {
      const sp = SPECIES[hit.id];
      floatText(sp.name + '!', ev.clientX - 30, ev.clientY - 24, 'pink');
      snd.pet();
    }
  });

  /* ================= RENDERERS ================= */
  const el = {
    coins: $('#r-coins'), feathers: $('#r-feathers'), eggs: $('#r-eggs'),
    petBar: $('#pet-bar'), petLabel: $('#pet-label'),
    mamaChip: $('#mama-tier-chip'), mamaInfo: $('#mama-info'), mamaUp: $('#btn-mama-up'),
    nests: $('#nests'), nestSub: $('#nest-sub'),
    vault: $('#vault'), vaultSub: $('#vault-sub'),
    coopSub: $('#coop-sub'), coopControls: $('#coop-controls'), flockList: $('#flock-list'),
    skillTree: $('#skill-tree'), researchSub: $('#research-sub'),
    pedia: $('#pedia'), pediaSub: $('#pedia-sub'),
    hint: $('#hint-text'), hintBar: $('#hintbar'),
    stats: $('#stats-line'),
  };

  let nestRefs = [];   /* {bar, label, idx} for ticking progress */
  let vaultRefs = {};  /* tier -> {count, value, btnHatch, btnSell1, btnSellAll, btnBuy} */

  function renderMama() {
    const t = S().mamaTier;
    el.mamaChip.textContent = TIERS[t].n;
    el.mamaChip.style.background = TIERS[t].c;
    if (t < TIERS.length - 1) {
      el.mamaUp.innerHTML = `⬆ UPGRADE MAMA to ${TIERS[t + 1].n}<br>🪙 ${GAME.fmt(GAME.mamaCost())}`;
      el.mamaUp.dataset.cost = GAME.mamaCost();
      el.mamaUp.dataset.res = 'coins';
      el.mamaUp.hidden = false;
    } else {
      el.mamaUp.innerHTML = '👑 MAMA IS DIVINE — MAX TIER!';
      delete el.mamaUp.dataset.cost;
      el.mamaUp.disabled = true;
    }
    GAME.dirty.mama = false;
  }

  function renderNests() {
    GAME.syncNests();
    nestRefs = [];
    el.nests.innerHTML = '';
    S().nests.forEach((n, i) => {
      const d = document.createElement('div');
      d.className = 'nest';
      if (!n) {
        d.innerHTML = '<div class="nest-label">empty nest</div>';
        const c = document.createElement('canvas');
        c.width = 64; c.height = 64;
        const cc = c.getContext('2d'); cc.imageSmoothingEnabled = false;
        cc.drawImage(SPR.nestSprite(3), 2, 40);
        d.insertBefore(c, d.firstChild);
        d.insertAdjacentHTML('beforeend', '<div class="nest-label" style="min-height:0;color:var(--ink-soft)">use HATCH in the vault</div>');
      } else {
        const ready = n.left <= 0;
        if (ready) d.classList.add('ready');
        const c = document.createElement('canvas');
        c.width = 64; c.height = 64;
        const cc = c.getContext('2d'); cc.imageSmoothingEnabled = false;
        const egg = SPR.eggSprite(n.tier, 4);
        cc.drawImage(egg, 12, 0);
        cc.drawImage(SPR.nestSprite(3), 2, 42);
        d.appendChild(c);
        d.insertAdjacentHTML('beforeend',
          `<div class="nest-label"><span class="tier-chip" style="background:${TIERS[n.tier].c}">${TIERS[n.tier].n}</span></div>`);
        if (ready) {
          const b = document.createElement('button');
          b.className = 'btn btn-green';
          b.dataset.act = 'collect'; b.dataset.slot = i;
          b.textContent = 'HATCH!';
          d.appendChild(b);
        } else {
          d.insertAdjacentHTML('beforeend',
            `<div class="bar-outer"><div class="bar-fill striped" style="width:${100 * (1 - n.left / n.total)}%"></div></div>
             <div class="nest-label" style="min-height:0">${GAME.fmtTime(n.left)}</div>`);
          nestRefs.push({ idx: i, bar: d.querySelector('.bar-fill'), label: d.querySelectorAll('.nest-label')[1] });
        }
      }
      el.nests.appendChild(d);
    });
    /* buy slot */
    if (GAME.canBuyNest()) {
      const b = document.createElement('button');
      b.className = 'nest-buy';
      b.dataset.act = 'buy-nest';
      b.dataset.cost = GAME.nestBuyCost(); b.dataset.res = 'coins';
      b.innerHTML = `+ BUY NEST<br>🪙 ${GAME.fmt(GAME.nestBuyCost())}`;
      el.nests.appendChild(b);
    }
    el.nestSub.textContent = `eggs hatch into chickens here`;
    GAME.dirty.nests = false;
  }

  function renderVault() {
    el.vault.innerHTML = '';
    vaultRefs = {};
    let any = false;
    TIERS.forEach((tier, t) => {
      if (!S().everEgg[t]) return;
      any = true;
      const row = document.createElement('div');
      row.className = 'vault-row';
      row.appendChild(eggEl(t, 4));
      row.insertAdjacentHTML('beforeend',
        `<div class="vault-name">${tierChip(t)}<span class="vault-count" data-ref="count">x0</span></div>
         <div class="vault-value" data-ref="value"></div>
         <div class="vault-btns">
           <button class="btn btn-green" data-act="hatch" data-tier="${t}">🐣 HATCH</button>
           <button class="btn btn-gold" data-act="sell" data-tier="${t}">SELL 1</button>
           <button class="btn btn-gold" data-act="sell-all" data-tier="${t}">SELL ALL</button>
           <button class="btn btn-blue" data-act="buy-egg" data-tier="${t}">BUY</button>
         </div>`);
      el.vault.appendChild(row);
      vaultRefs[t] = {
        count: row.querySelector('[data-ref="count"]'),
        value: row.querySelector('[data-ref="value"]'),
        btns: row.querySelectorAll('button'),
      };
    });
    if (!any) el.vault.innerHTML = '<div class="vault-empty">No eggs yet — go pet Mama Hen!</div>';
    GAME.dirty.vault = false;
    updateVault();
  }

  function updateVault() {
    let structureChanged = false;
    TIERS.forEach((_, t) => {
      if (S().everEgg[t] && !vaultRefs[t]) structureChanged = true;
    });
    if (structureChanged) { renderVault(); return; }
    let total = 0;
    Object.keys(vaultRefs).forEach(tStr => {
      const t = +tStr, r = vaultRefs[t];
      const n = S().eggs[t]; total += n;
      const count = 'x' + GAME.fmt(n);
      if (r.count.textContent !== count) r.count.textContent = count;
      const val = `worth 🪙${GAME.fmt(GAME.sellValue(t))} · buy 🪙${GAME.fmt(GAME.shopPrice(t))}`;
      if (r.value.textContent !== val) r.value.textContent = val;
      const [bH, bS1, bSA, bBuy] = r.btns;
      const noEgg = n <= 0;
      const noNest = !S().nests.some(x => x === null);
      bH.disabled = noEgg || noNest;
      bH.title = noNest ? 'All nests are busy!' : '';
      bS1.disabled = noEgg; bSA.disabled = noEgg;
      bBuy.disabled = S().coins < GAME.shopPrice(t);
    });
    el.vaultSub.textContent = `sell for coins, or hatch for chickens + feathers`;
  }

  function renderCoop() {
    const cap = GAME.coopCap(), n = GAME.flockSize();
    el.coopSub.textContent = `${n} / ${cap} chickens`;
    let html = `<span class="cap-label">CAPACITY ${n}/${cap}</span>`;
    if (GAME.canBuyCoop()) {
      html += `<button class="btn btn-green" data-act="buy-coop" data-cost="${GAME.coopBuyCost()}" data-res="coins">+${ECON.coopPerBuy} SPACE — 🪙 ${GAME.fmt(GAME.coopBuyCost())}</button>`;
    }
    const total = GAME.flockSize();
    if (total > MAX_WANDER) html += `<span style="color:var(--ink-soft)">(showing ${MAX_WANDER} of ${total})</span>`;
    el.coopControls.innerHTML = html;
    GAME.dirty.coop = false;
  }

  function renderFlock() {
    el.flockList.innerHTML = '';
    const ids = Object.keys(S().flock).map(Number).sort((a, b) => SPECIES[b].tier - SPECIES[a].tier || a - b);
    ids.forEach(id => {
      const sp = SPECIES[id], n = S().flock[id];
      const row = document.createElement('div');
      row.className = 'flock-row';
      row.appendChild(chickEl(sp, 2, false));
      row.insertAdjacentHTML('beforeend',
        `<div class="flock-info">
           <span class="f-name" style="color:${TIERS[sp.tier].c}">${sp.name} x${n}</span>
           <span class="f-rate">1 ${TIERS[sp.tier].n} egg / ${GAME.fmtTime(GAME.layTime(sp.tier))} each</span>
         </div>
         <button class="btn btn-ghost" data-act="release" data-sp="${id}" title="Set one free (+🪶)">🕊️</button>`);
      el.flockList.appendChild(row);
    });
    syncWanderers();
    GAME.dirty.flock = false;
  }

  function renderSkills() {
    el.researchSub.textContent = `🪶 ${GAME.fmt(S().feathers)} feathers`;
    el.skillTree.innerHTML = '';
    BRANCHES.forEach((name, bi) => {
      const col = document.createElement('div');
      col.className = 'skill-branch';
      col.innerHTML = `<div class="branch-title">${name}</div>`;
      SKILLS.filter(sk => sk.br === bi).forEach(sk => {
        const cur = GAME.lvl(sk.id);
        const pre = skillPrereq(sk);
        const locked = pre && GAME.lvl(pre.id) < 1;
        const maxed = cur >= sk.max;
        const node = document.createElement('div');
        node.className = 'skill-node' + (locked ? ' locked' : '') + (maxed ? ' maxed' : '');
        const cost = skillCost(sk, cur);
        node.innerHTML =
          `<div class="sk-head"><span class="sk-name">${sk.name}</span><span class="sk-lvl">Lv ${cur}/${sk.max}</span></div>
           <div class="sk-desc">${sk.desc}</div>` +
          (maxed
            ? `<button class="sk-buy btn" disabled>MAXED ★</button>`
            : locked
              ? `<button class="sk-buy btn" disabled>needs ${pre.name}</button>`
              : `<button class="sk-buy btn" data-act="skill" data-id="${sk.id}" data-cost="${cost}" data-res="feathers">RESEARCH — 🪶 ${GAME.fmt(cost)}</button>`);
        col.appendChild(node);
      });
      el.skillTree.appendChild(col);
    });
    GAME.dirty.skills = false;
  }

  function renderPedia() {
    el.pedia.innerHTML = '';
    el.pediaSub.textContent = `${GAME.discCount()} / 100 discovered`;
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
          const owned = S().flock[sp.id] || 0;
          card.insertAdjacentHTML('beforeend',
            `<span class="p-name">${sp.name}</span>
             <span class="p-quip">${sp.quip}</span>
             <span class="p-count">${owned ? 'in coop: ' + owned : 'hatched before'}</span>`);
        } else {
          card.insertAdjacentHTML('beforeend', `<span class="p-name">???</span><span class="p-quip">not yet hatched</span>`);
        }
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      el.pedia.appendChild(sec);
    });
    GAME.dirty.pedia = false;
  }

  /* ================= hints & stats ================= */
  const TIPS = [
    'Eggs can MUTATE a tier up when laid. Science!',
    'Rarer chickens lay rarer, pricier eggs.',
    'Feathers come from hatching — spend them on Research.',
    'Collect all 100 chickens for the Chickenpedia!',
    'Upgrading Mama makes her lay rarer eggs.',
    'BUY eggs in the vault if you have spare coins.',
  ];
  let tipIdx = 0, lastTipSwap = 0;
  function updateHint(now) {
    const st = S();
    let msg = null;
    if (st.stats.eggsMade === 0) msg = `Pet Mama Hen ${GAME.clicksNeeded()} times to get your first egg!`;
    else if (st.stats.hatched === 0 && GAME.totalEggs() > 0 && !st.nests.some(n => n)) msg = 'Put an egg in a nest — press 🐣 HATCH in the Egg Vault!';
    else if (st.nests.some(n => n && n.left <= 0)) msg = 'An egg is ready — click HATCH! in the nest!';
    else if (GAME.flockSize() >= GAME.coopCap() && st.nests.some(n => n)) msg = 'Coop is full! Buy more space or release a chicken.';
    else if (st.stats.hatched > 0 && Object.keys(st.sk).length === 0 && st.feathers >= 3) msg = 'You have feathers! Spend them in 🧪 RESEARCH.';
    else if (st.mamaTier < TIERS.length - 1 && st.coins >= GAME.mamaCost()) msg = 'You can afford to UPGRADE MAMA — rarer eggs await!';
    else {
      if (now - lastTipSwap > 12000) { lastTipSwap = now; tipIdx = (tipIdx + 1) % TIPS.length; }
      msg = TIPS[tipIdx];
    }
    if (el.hint.textContent !== msg) el.hint.textContent = msg;
  }

  function updateStats() {
    const st = S().stats;
    const line = `${GAME.fmt(st.pets)} pets given · ${GAME.fmt(st.eggsMade)} eggs made · ${GAME.fmt(st.hatched)} chickens hatched · ${GAME.fmt(st.mutations)} mutations · ${GAME.discCount()}/100 species`;
    if (el.stats.textContent !== line) el.stats.textContent = line;
  }

  /* ================= per-tick light update ================= */
  function flash(chip) { chip.classList.remove('flash'); void chip.offsetWidth; chip.classList.add('flash'); }

  function lightUpdate(now) {
    const st = S();
    /* header */
    const c = GAME.fmt(st.coins);
    if (el.coins.textContent !== c) el.coins.textContent = c;
    const f = GAME.fmt(st.feathers);
    if (el.feathers.textContent !== f) el.feathers.textContent = f;
    const e = GAME.fmt(GAME.totalEggs());
    if (el.eggs.textContent !== e) el.eggs.textContent = e;
    /* pet bar */
    const need = GAME.clicksNeeded();
    el.petBar.style.width = Math.min(100, 100 * st.pets / need) + '%';
    el.petLabel.textContent = `${Math.floor(st.pets)} / ${need} pets → 1 ${TIERS[st.mamaTier].n} egg`;
    /* mama info */
    const info = `Lays <b>${TIERS[st.mamaTier].n}</b> eggs (🪙${GAME.fmt(GAME.sellValue(st.mamaTier))}) · mutation <b>${Math.round(GAME.mutationChance('click') * 100)}%</b>` +
      (GAME.autoPetRate() ? ` · auto-pets <b>${GAME.autoPetRate().toFixed(1)}/s</b>` : '');
    if (el.mamaInfo.dataset.h !== info) { el.mamaInfo.dataset.h = info; el.mamaInfo.innerHTML = info; }
    /* nest bars */
    nestRefs.forEach(r => {
      const n = st.nests[r.idx];
      if (!n) return;
      r.bar.style.width = (100 * (1 - n.left / n.total)) + '%';
      r.label.textContent = GAME.fmtTime(n.left);
    });
    /* vault counts */
    updateVault();
    /* research sub while tab open */
    el.researchSub.textContent = `🪶 ${GAME.fmt(st.feathers)} feathers`;
    /* affordability */
    document.querySelectorAll('[data-cost]').forEach(b => {
      const res = b.dataset.res === 'feathers' ? st.feathers : st.coins;
      const should = res < +b.dataset.cost;
      if (b.disabled !== should) b.disabled = should;
    });
    updateHint(now);
    updateStats();
  }

  function renderDirty() {
    const d = GAME.dirty;
    if (d.mama) renderMama();
    if (d.nests) renderNests();
    if (d.vault) renderVault();
    if (d.coop) renderCoop();
    if (d.flock) renderFlock();
    if (d.skills) renderSkills();
    if (d.pedia) renderPedia();
  }

  /* ================= actions ================= */
  function doPet(clientX, clientY) {
    const res = GAME.pet(1);
    lastPetAt = performance.now();
    petSquish = 1;
    spawnHearts(2);
    snd.pet();
    if (clientX != null && Math.random() < 0.35) {
      floatText(['cluck!', 'bok!', '♥', 'cluck~'][Math.floor(Math.random() * 4)], clientX - 14, clientY - 26, 'pink');
    }
    if (res.coinsDropped) {
      floatAt(stage, `+🪙${GAME.fmt(res.coinsDropped)}`, 'gold');
      snd.coin();
    }
    if (res.eggsLaid > 0) {
      snd.egg();
      floatAt($('#chip-eggs'), `+${res.eggsLaid} 🥚`, 'green');
      flash($('#chip-eggs'));
    }
  }

  function handle(act, ds, target, ev) {
    const t = ds.tier != null ? +ds.tier : null;
    switch (act) {
      case 'pet': doPet(ev && ev.clientX, ev && ev.clientY); break;
      case 'tab': {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === target));
        document.querySelectorAll('.tab-page').forEach(p => p.hidden = p.id !== 'tab-' + ds.tab);
        break;
      }
      case 'sell': case 'sell-all': {
        const n = act === 'sell' ? 1 : S().eggs[t];
        const gain = GAME.sellEggs(t, n);
        if (gain > 0) { snd.coin(); floatAt(target, `+🪙${GAME.fmt(gain)}`, 'gold'); flash($('#chip-coins')); }
        break;
      }
      case 'buy-egg': {
        if (GAME.buyEgg(t)) { snd.egg(); floatAt(target, `+1 🥚`, 'green'); }
        else snd.error();
        break;
      }
      case 'hatch': {
        const r = GAME.placeEgg(t);
        if (r.ok) { snd.egg(); floatAt(target, 'nested!', 'green'); }
        else {
          snd.error();
          toast({ title: 'No free nests!', body: r.why === 'full' ? 'Buy another nest or wait for a hatch.' : 'No egg of that tier.' });
        }
        break;
      }
      case 'collect': {
        const r = GAME.collectNest(+ds.slot);
        if (!r.ok) {
          snd.error();
          if (r.why === 'coop-full') toast({ title: 'Coop is full!', body: 'Upgrade the coop or release a chicken first.' });
          break;
        }
        snd.hatch();
        const showBirth = b => {
          toast({
            sprite: chickEl(b.sp, 2, false),
            title: (b.isNew ? '✨ NEW SPECIES! ' : '') + b.sp.name + ' hatched!',
            body: `${TIERS[b.sp.tier].n} · +🪶${GAME.fmt(b.feathers)}${b.isNew ? ' · ' + b.sp.quip : ''}`,
            long: b.isNew,
          });
        };
        showBirth(r.first);
        if (r.twin) { showBirth(r.twin); floatAt(target, 'TWINS!!', 'pink'); }
        flash($('#chip-feathers'));
        break;
      }
      case 'buy-nest': if (GAME.buyNest()) snd.skill(); else snd.error(); break;
      case 'buy-coop': if (GAME.buyCoop()) snd.skill(); else snd.error(); break;
      case 'mama-up': {
        if (GAME.upgradeMama()) {
          snd.grand();
          spawnHearts(10);
          toast({ title: 'MAMA EVOLVED!', body: `She now lays ${TIERS[S().mamaTier].n} eggs. She looks radiant.` });
        } else snd.error();
        break;
      }
      case 'skill': {
        if (GAME.buySkill(ds.id)) {
          snd.skill();
          floatAt(target, SKILL_BY_ID[ds.id].name + ' ↑', 'green');
        } else snd.error();
        break;
      }
      case 'release': {
        const sp = SPECIES[+ds.sp];
        const refund = GAME.releaseChicken(+ds.sp);
        if (refund) {
          snd.egg();
          toast({ sprite: chickEl(sp, 2, false), title: sp.name + ' set free!', body: `She waves goodbye. +🪶${refund}` });
        }
        break;
      }
      case 'mute': {
        S().muted = !S().muted;
        $('#btn-mute').textContent = S().muted ? '🔇' : '🔊';
        break;
      }
      case 'save': {
        GAME.save();
        floatAt($('#topbar'), 'Saved!', 'green');
        break;
      }
      case 'reset': {
        if (confirm('Really reset EVERYTHING? All chickens will be released into the wild.')) {
          GAME.reset();
          renderDirty();
        }
        break;
      }
    }
    renderDirty();
  }

  document.getElementById('app').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    if (btn.dataset.act === 'pet') return;   /* handled on pointerdown for snappiness */
    handle(btn.dataset.act, btn.dataset, btn, ev);
  });
  /* petting: pointerdown for snap response */
  $('#btn-pet').addEventListener('pointerdown', ev => { ev.preventDefault(); handle('pet', {}, null, ev); });
  stage.addEventListener('pointerdown', ev => { ev.preventDefault(); handle('pet', {}, null, ev); });
  stage.addEventListener('keydown', ev => {
    if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); handle('pet', {}, null, null); }
  });

  /* ================= game event listeners ================= */
  GAME.on('egg', e => {
    if (e.source === 'click') spawnEggFly(e.tier);
    if (e.mutated && performance.now() - lastMutToast > 5000) {
      lastMutToast = performance.now();
      snd.sparkle();
      toast({ sprite: eggEl(e.tier, 3), title: '⚡ MUTATION!', body: `A ${TIERS[e.tier].n} egg appeared!` });
    }
  });
  GAME.on('discover', () => { /* handled in collect toast */ });
  GAME.on('coins', e => { if (e.golden) flash($('#chip-coins')); });

  /* ================= boot ================= */
  function boot() {
    GAME.load();
    GAME.syncNests();
    const off = GAME.applyOffline();

    initClouds();
    renderMama(); renderNests(); renderVault(); renderCoop(); renderFlock(); renderSkills(); renderPedia();
    $('#btn-mute').textContent = S().muted ? '🔇' : '🔊';

    if (off && off.eggs > 0) {
      toast({
        title: 'Welcome back!',
        body: `While you were away (${GAME.fmtTime(off.seconds)}), your chickens laid ${GAME.fmt(off.eggs)} eggs!`,
        long: true,
      });
    }

    /* logic loop */
    let lastLogic = performance.now();
    let saveAcc = 0;
    setInterval(() => {
      const now = performance.now();
      const dt = Math.min(2, (now - lastLogic) / 1000);
      lastLogic = now;
      GAME.tick(dt);
      renderDirty();
      lightUpdate(now);
      saveAcc += dt;
      if (saveAcc >= 10) { saveAcc = 0; GAME.save(); }
    }, 200);

    /* draw loop */
    let lastDraw = performance.now();
    function frame(now) {
      const dt = Math.min(0.1, (now - lastDraw) / 1000);
      lastDraw = now;
      if (!document.hidden) {
        drawMamaScene(now, dt);
        if (!$('#tab-farm').hidden) drawYard(now, dt);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    document.addEventListener('visibilitychange', () => { if (document.hidden) GAME.save(); });
    window.addEventListener('beforeunload', () => GAME.save());
    window.addEventListener('resize', () => { sizeStage(); sizeYard(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
