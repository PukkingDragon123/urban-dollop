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
  const K = () => (TW >= 560 ? 4 : TW >= 360 ? 3 : 2);

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
      props.chicks = [0, 1, 2].map(i => ({ x: TW + 40 + i * 60, sp: SPECIES[(i * 9 + 3) % 24], hop: i * 1.3, y: 0 }));
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

  /* ================= ATTRACT =================
     A theatre, not a title card. Back to front: a dusk sky with
     searchlights raking it and the company blimp drifting over; three
     parallax layers of city and works; a proscenium arch with bulbs
     down the pillars, a scalloped valance and curtains tied back; a
     painted backdrop flat that slides in for each act; three coloured
     spotlights that converge on the founder and sweep on the beat,
     with dust in the beams; a boarded stage with footlight cans
     throwing pools up at him and his reflection in the varnish; and
     an audience of hens along the front bobbing in time, with the
     odd camera flash. The marquee hangs over the whole thing with
     chasing bulbs round it. Everything moves to one beat clock.
     ================= */
  const BPM = 124;
  let searchL = [{ a: -0.9, v: 0.13 }, { a: -2.1, v: -0.1 }];
  let blimp = { x: -80, y: 30, v: 9 };
  let crowd = null;
  let flashCam = 0, actFlash = 0, lastActI = -1;
  let backdropSlide = 1;

  function beatOf() { return clock * BPM / 60; }
  function beatPulse() { const f = beatOf() % 1; return Math.max(0, 1 - f * 2.6); }

  function makeCrowd() {
    const n = Math.max(8, Math.round(TW / 26));
    crowd = Array.from({ length: n }, (_, i) => ({
      x: (i + 0.5) * (TW / n) + (Math.random() - 0.5) * 8,
      sp: SPECIES[(i * 7 + 2) % Math.min(30, SPECIES.length)],
      ph: Math.random() * 6, off: (i % 3) * 0.33, cam: Math.random() < 0.22,
      z: 0.7 + Math.random() * 0.5,
    }));
  }

  /* a bulb: lit, half lit, or dark, with a halo when it is on */
  function bulb(x, y, on, col) {
    if (on) {
      g.fillStyle = 'rgba(255,226,150,.18)';
      g.fillRect(x - 2, y - 1, 6, 4); g.fillRect(x - 1, y - 2, 4, 6);
    }
    g.fillStyle = '#14171a'; g.fillRect(x - 1, y - 1, 4, 4);
    g.fillStyle = on ? (col || '#fff3c4') : '#6a5f3a';
    g.fillRect(x, y, 2, 2);
  }

  /* a soft cone of light, dithered so it stays pixel art */
  function lightCone(x0, y0, x1, y1, half, alpha, col) {
    const len = Math.max(1, y1 - y0);
    for (let i = 0; i < len; i++) {
      const f = i / len;
      const cx = x0 + (x1 - x0) * f;
      const w = 1 + half * f;
      const a = alpha * (1 - f * 0.72);
      g.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
      const l = Math.round(cx - w), r = Math.round(cx + w);
      if ((i & 1) === 0) g.fillRect(l, y0 + i, r - l, 1);
      else for (let x = l + 1; x < r; x += 2) g.fillRect(x, y0 + i, 1, 1);
    }
  }

  function drawAttract(dt, now) {
    if (!props) resetAct();
    if (!crowd) makeCrowd();
    actT += dt;
    if (actT > MENU_ACTS[actI].secs) nextAct();
    const act = MENU_ACTS[actI], k = K();
    if (actI !== lastActI) { lastActI = actI; actFlash = 0.3; backdropSlide = 0; }
    actFlash = Math.max(0, actFlash - dt);
    backdropSlide = Math.min(1, backdropSlide + dt * 3.4);
    const bp = beatPulse();

    /* ---------- 1. the sky ---------- */
    const bands = ['#0d0f22', '#141731', '#1c1c40', '#2a2150', '#3f2a5e', '#5c3363',
                   '#7f4260', '#a4544f', '#c4703f', '#dd9440', '#f0b850'];
    const per = (TH * 0.80) / bands.length;
    for (let y = 0; y < TH; y++) {
      const f = y / per, i = Math.min(bands.length - 1, Math.floor(f));
      g.fillStyle = bands[i]; g.fillRect(0, y, TW, 1);
      if (i < bands.length - 1 && f - i > 0.58) { g.fillStyle = bands[i + 1]; for (let x = y % 2; x < TW; x += 2) g.fillRect(x, y, 1, 1); }
    }
    for (let i = 0; i < 90; i++) {
      if (Math.floor(now / 420 + i) % 13 === 0) continue;
      g.fillStyle = i % 5 ? 'rgba(255,255,255,.6)' : 'rgba(255,226,170,.9)';
      g.fillRect((i * 97) % TW, (i * 53) % Math.round(TH * 0.44), 1, 1);
    }
    /* the moon with a halo */
    const mx = TW - Math.round(TW * 0.062) - 58, my = Math.round(TH * 0.15);
    g.fillStyle = 'rgba(255,243,208,.10)';
    for (let r = 22; r > 12; r -= 3) for (let dy = -r; dy <= r; dy += 2) { const hf = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); g.fillRect(mx + 10 - hf, my + 10 + dy, hf * 2, 1); }
    g.fillStyle = '#fff3d0';
    g.fillRect(mx, my, 20, 20); g.fillRect(mx - 3, my + 5, 26, 10); g.fillRect(mx + 5, my - 3, 10, 26);
    g.fillStyle = '#e8dcb8'; g.fillRect(mx + 11, my + 6, 5, 5); g.fillRect(mx + 4, my + 13, 3, 3); g.fillRect(mx + 14, my + 15, 2, 2);

    const floorY = Math.max(Math.round(TH * 0.60), TH - 52);
    const FB = TH - floorY;

    /* ---------- 2. searchlights raking the sky ---------- */
    searchL.forEach((s, i) => {
      s.a += s.v * dt;
      if (s.a < -2.5 || s.a > -0.6) s.v *= -1;
      const bx = i ? TW - 30 : 30, by = floorY - 10;
      const L = TH * 1.3;
      g.save();
      g.translate(bx, by); g.rotate(s.a);
      for (let d = 0; d < L; d += 2) {
        const w = 2 + d * 0.055, a = 0.13 * (1 - d / L);
        g.fillStyle = 'rgba(255,240,200,' + a.toFixed(3) + ')';
        g.fillRect(Math.round(-w), d, Math.round(w * 2), 2);
      }
      g.restore();
      bulb(bx - 1, by - 2, true);
    });

    /* ---------- 3. the blimp ---------- */
    blimp.x += blimp.v * dt;
    if (blimp.x > TW + 90) { blimp.x = -90; blimp.y = 22 + Math.random() * 30; }
    {
      const bx = Math.round(blimp.x), by = Math.round(blimp.y + Math.sin(now / 1400) * 2);
      g.fillStyle = '#14171a'; g.fillRect(bx - 1, by - 1, 46, 16);
      g.fillStyle = '#5a4a6e'; g.fillRect(bx, by, 44, 14);
      g.fillStyle = '#7a6690'; g.fillRect(bx + 2, by + 1, 40, 4);
      g.fillStyle = '#3c3050'; g.fillRect(bx, by + 11, 44, 3);
      g.fillStyle = '#14171a'; g.fillRect(bx + 17, by + 14, 10, 4);
      g.fillStyle = '#2b2b36'; g.fillRect(bx + 18, by + 15, 8, 2);
      g.fillStyle = '#ffb32e'; g.fillRect(bx + 38, by + 3, 5, 8);
      const logo = SPR.iconSprite(S().company.logo || 'egg', 1);
      g.drawImage(logo, bx + 16, by + 2);
      for (let i = 0; i < 4; i++) bulb(bx + 6 + i * 9, by + 12, (Math.floor(beatOf() * 2) + i) % 4 !== 0);
      hits.push({ id: 'blimp', x: bx, y: by, w: 46, h: 20 });
    }

    /* ---------- 4. three parallax layers of city, hills and works ---------- */
    const drift = now / 1000;
    /* far towers */
    for (let i = 0; i < 26; i++) {
      const w = 9 + (i % 4) * 5;
      const x = Math.round(((i * 61 - drift * 2) % (TW + 80)) - 40);
      const h = 22 + (i * 37) % 40;
      g.fillStyle = '#1d1936'; g.fillRect(x, floorY - 16 - h, w, h + 16);
      for (let wy = 4; wy < h - 2; wy += 7) for (let wx = 2; wx < w - 3; wx += 5) {
        if ((i + wx + wy) % 3) continue;
        g.fillStyle = 'rgba(255,179,46,.5)'; g.fillRect(x + wx, floorY - 16 - h + wy, 2, 3);
      }
    }
    /* hills */
    [{ c: '#251c3c', r: '#33264e', b: 30, a: 10, s: 47 }, { c: '#1c142c', r: '#281e3e', b: 15, a: 7, s: 31 }]
      .forEach((L, li) => { for (let x = 0; x < TW; x++) { const h = Math.round(L.b + FB + Math.sin(x / L.s + li) * L.a + Math.sin(x / 11 + li * 2) * 3); g.fillStyle = L.c; g.fillRect(x, TH - h, 1, h); g.fillStyle = L.r; g.fillRect(x, TH - h, 1, 2); } });
    /* the works: chimneys, a gasometer and a water tower */
    const nF = Math.max(3, Math.round(TW / 96));
    for (let i = 0; i < nF; i++) {
      const fx = 16 + i * Math.round((TW - 30) / nF), fh = 34 + (i % 3) * 14, fb = floorY - 14, fw = 28;
      g.fillStyle = '#141026'; g.fillRect(fx, fb - fh, fw, fh);
      g.fillStyle = '#1e1832'; g.fillRect(fx, fb - fh, fw, 2);
      g.fillStyle = '#141026'; g.fillRect(fx + fw - 9, fb - fh - 20, 6, 20);
      g.fillStyle = '#ffb32e'; g.fillRect(fx + fw - 9, fb - fh - 20, 6, 1);
      for (let wy = 5; wy < fh - 6; wy += 8) for (let wx = 3; wx < fw - 5; wx += 8) {
        g.fillStyle = (Math.floor(now / 1500) + wx + wy + i) % 4 ? '#ffb32e' : '#241c3c';
        g.fillRect(fx + wx, fb - fh + wy, 4, 4);
      }
      for (let s2 = 0; s2 < 4; s2++) {
        const p = ((now / 1500 + s2 * 0.25 + i * 0.21) % 1);
        g.fillStyle = 'rgba(190,190,205,' + (0.42 - p * 0.38).toFixed(2) + ')';
        g.fillRect(fx + fw - 8 + Math.round(Math.sin(now / 460 + s2) * 4), Math.round(fb - fh - 22 - p * 30), 5 - Math.floor(p * 3), 3);
      }
    }
    {
      const gx = Math.round(TW * 0.80), gb = floorY - 14, gr = 15;
      g.fillStyle = '#141026';
      for (let dy = -gr; dy <= 0; dy++) { const hf = Math.round(Math.sqrt(Math.max(0, gr * gr - dy * dy))); g.fillRect(gx - hf, gb + dy - 8, hf * 2, 1); }
      g.fillRect(gx - gr, gb - 8, gr * 2, 8);
      for (let y = gb - 6; y < gb; y += 3) { g.fillStyle = '#221a36'; g.fillRect(gx - gr, y, gr * 2, 1); }
    }

    /* ---------- 5. the backdrop flat for this act: it stands on the
       boards and only comes half way up, so the sky, the city and the
       blimp all stay visible over the top of it ---------- */
    const bdH = Math.round((floorY - TH * 0.15) * 0.52), bdY = floorY - bdH;
    const slide = 1 - Math.pow(1 - backdropSlide, 3);
    g.save();
    g.globalAlpha = slide * 0.92;
    const bdx = Math.round((1 - slide) * -TW * 0.3);
    if (act.id === 'chop') {
      for (let i = 0; i < 10; i++) {
        const tx = bdx + 6 + i * Math.round(TW / 10), th = bdH * (0.72 + (i % 3) * 0.12);
        g.fillStyle = '#14261c'; g.fillRect(tx, floorY - th, 10, th);
        g.fillStyle = '#1d3a26';
        for (let t = 0; t < 3; t++) { const w = 22 - t * 5; g.fillRect(Math.round(tx + 5 - w / 2), floorY - th - 6 + t * 8, w, 9); }
      }
    } else if (act.id === 'build') {
      for (let i = 0; i < 8; i++) {
        const sx = bdx + 4 + i * Math.round(TW / 8), sh = bdH * (0.55 + (i % 4) * 0.14);
        g.fillStyle = '#2a1b24'; g.fillRect(sx, floorY - sh, 30, sh);
        g.fillStyle = '#37232e'; g.fillRect(sx, floorY - sh, 30, 2);
        for (let wy = 6; wy < sh - 6; wy += 9) for (let wx = 4; wx < 26; wx += 9) { g.fillStyle = 'rgba(255,179,46,.22)'; g.fillRect(sx + wx, floorY - sh + wy, 4, 4); }
      }
    } else if (act.id === 'dance') {
      /* pallets of cash stacked against the back wall */
      for (let r = 0; r < 5; r++) for (let cc = 0; cc < Math.ceil(TW / 30); cc++) {
        const sx = bdx + cc * 30 + (r % 2) * 8, sy = floorY - 12 - r * 13;
        if (sy < bdY) continue;
        g.fillStyle = '#0c2010'; g.fillRect(sx, sy, 24, 11);
        g.fillStyle = '#143018'; g.fillRect(sx + 1, sy + 1, 22, 5);
        g.fillStyle = '#1d4422'; g.fillRect(sx + 9, sy + 2, 6, 2);
      }
    } else {
      /* a coop wall, wire and all */
      g.fillStyle = '#2b2016'; g.fillRect(bdx, bdY, TW, bdH);
      g.fillStyle = '#3a2c1d';
      for (let y = bdY; y < floorY; y += 8) g.fillRect(bdx, Math.round(y), TW, 2);
      g.fillStyle = 'rgba(200,206,214,.16)';
      for (let x = bdx; x < TW; x += 8) g.fillRect(x, bdY, 1, bdH);
      g.fillStyle = '#14171a'; g.fillRect(bdx, bdY, TW, 2);
    }
    g.restore();

    /* ---------- 6. spotlights from the top of the arch ---------- */
    const rx = Math.round(TW * 0.34), baseY = floorY + 3;
    const spotCols = ['255,236,180', '255,190,120', '190,215,255'];
    for (let i = 0; i < 3; i++) {
      const sway = Math.sin(beatOf() * Math.PI / 2 + i * 2.1) * 26;
      const originX = Math.round(TW * (0.18 + i * 0.32));
      lightCone(originX, Math.round(TH * 0.12), rx + 14 * k + sway, baseY, 26 + i * 6, 0.16 + bp * 0.05, spotCols[i]);
    }
    /* dust in the beams */
    for (let i = 0; i < 26; i++) {
      const t = (now / 2600 + i * 0.077) % 1;
      const x = rx + 14 * k + Math.sin(i * 2.3 + now / 3000) * 46;
      const y = TH * 0.14 + t * (baseY - TH * 0.14);
      g.fillStyle = 'rgba(255,246,220,' + (0.35 * (1 - t)).toFixed(2) + ')';
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }

    /* ---------- 7. the stage: boards, hazard lip, footlight pools ---------- */
    g.fillStyle = '#20242b'; g.fillRect(0, floorY, TW, TH - floorY);
    g.fillStyle = '#2b3138'; for (let x = 0; x < TW; x += 13) g.fillRect(x, floorY + 5, 1, TH - floorY - 5);
    g.fillStyle = 'rgba(255,226,150,.05)'; g.fillRect(0, floorY, TW, 6);
    for (let x = 0; x < TW; x += 12) { g.fillStyle = '#ffb32e'; g.fillRect(x, floorY, 6, 3); g.fillStyle = '#14171a'; g.fillRect(x + 6, floorY, 6, 3); }
    /* footlight cans along the lip, throwing up the wall of light */
    const fl = Math.max(4, Math.round(TW / 52));
    for (let i = 0; i < fl; i++) {
      const lx = Math.round((i + 0.5) * (TW / fl));
      const on = (Math.floor(beatOf()) + i) % 5 !== 0;
      g.fillStyle = 'rgba(255,226,150,' + (on ? 0.10 : 0.03) + ')';
      for (let dy = 0; dy < 54; dy++) { const w = 3 + dy * 0.5; if (dy & 1) continue; g.fillRect(Math.round(lx - w), floorY - dy, Math.round(w * 2), 1); }
      g.fillStyle = '#14171a'; g.fillRect(lx - 4, floorY + 3, 8, 5);
      g.fillStyle = on ? '#ffe89a' : '#7a6a3a'; g.fillRect(lx - 3, floorY + 4, 6, 2);
    }

    /* ---------- 8. the act ---------- */
    const wardrobe = S().wardrobe;
    const put = (pose, x, y) => {
      const spr = SPR.raccoonSprite(pose, k, wardrobe);
      SPR.shadowEll(g, x + 14 * k, y + 1, 12 * k, 2, 0.42);
      /* his reflection in the varnish, squashed and faint */
      g.save();
      g.globalAlpha = 0.16;
      g.translate(Math.round(x) - (spr.ox || 0) * k, Math.round(y) + 1);
      g.scale(1, -0.34);
      g.drawImage(spr, 0, 0);
      g.restore();
      g.globalAlpha = 1;
      g.drawImage(spr, Math.round(x) - (spr.ox || 0) * k, Math.round(y) - spr.height);
    };
    drawAct(act, dt, now, k, rx, baseY, floorY, put);

    /* ---------- 9. the Warden, the loose hens, the particles ---------- */
    drawWardenBit(dt, k, baseY);
    drawHens(dt, k, baseY);
    drawMenuParts(dt, floorY);

    /* ---------- 10. the audience along the front ---------- */
    flashCam = Math.max(0, flashCam - dt);
    if (Math.random() < dt * 1.6) flashCam = 0.12;
    {
      /* heads and shoulders over the stage lip, like an orchestra pit:
         a dark row with the footlights catching the top of each head
         and a bright dot for every eye watching him */
      const ck = Math.max(2, k - 1);
      const dark = '#0e0c18', rim = 'rgba(255,206,130,.40)';
      crowd.forEach(c => {
        const bob = Math.round(Math.abs(Math.sin(beatOf() * Math.PI + c.off * 6)) * 2 * ck);
        const sw = 13 * ck, sh = 5 * ck;
        const sx = Math.round(c.x - sw / 2), sy = TH - sh + ck - bob;
        /* shoulders */
        g.fillStyle = dark;
        g.fillRect(sx, sy + ck, sw, sh);
        g.fillRect(sx + ck, sy, sw - 2 * ck, sh);
        g.fillStyle = rim; g.fillRect(sx + ck, sy, sw - 2 * ck, 1);
        /* head, turned toward the stage */
        const hw = 5 * ck, hh = 4 * ck;
        const hx = sx + Math.round(sw * 0.52), hy = sy - hh + ck;
        g.fillStyle = dark;
        g.fillRect(hx, hy + 1, hw, hh); g.fillRect(hx + 1, hy, hw - 2, hh);
        g.fillStyle = rim; g.fillRect(hx + 1, hy, hw - 2, 1);
        /* comb, wattle and beak */
        g.fillStyle = '#6e1a24';
        g.fillRect(hx + 1, hy - ck, ck, ck); g.fillRect(hx + 1 + ck, hy - 2 * ck, ck, 2 * ck); g.fillRect(hx + 1 + 2 * ck, hy - ck, ck, ck);
        g.fillStyle = '#8a5410'; g.fillRect(hx + hw, hy + 2 * ck, ck, ck);
        /* an eye catching the footlights */
        g.fillStyle = 'rgba(255,236,180,.85)'; g.fillRect(hx + hw - 2 * ck, hy + ck, ck, ck);
        if (c.cam && flashCam > 0 && ((c.ph * 7) | 0) % 3 === 0) {
          g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(hx + ck, hy - 5 * ck, 3, 3);
          g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(hx - 3, hy - 8 * ck, 14, 14);
        }
      });
    }

    /* ---------- 11. the proscenium: pillars, valance, curtains ---------- */
    const PW = Math.max(14, Math.round(TW * 0.062));
    const VH = Math.round(TH * 0.11);
    /* curtains, tied back */
    for (let side = 0; side < 2; side++) {
      const x0 = side ? TW - PW : 0;
      for (let x = 0; x < PW; x++) {
        const f = side ? 1 - x / PW : x / PW;
        const fold = Math.sin(f * 9) * 0.5 + 0.5;
        g.fillStyle = fold > 0.6 ? '#7d1626' : fold > 0.3 ? '#5e0f1c' : '#400a14';
        g.fillRect(x0 + x, 0, 1, TH);
      }
      /* the tie-back sash and its tassel */
      const ty = Math.round(TH * 0.52);
      g.fillStyle = '#ffb32e'; g.fillRect(x0, ty, PW, 3);
      g.fillStyle = '#b87c10'; g.fillRect(x0, ty + 3, PW, 1);
      const tx = side ? TW - 5 : 2;
      g.fillStyle = '#ffb32e'; g.fillRect(tx, ty + 4, 3, 7);
      g.fillStyle = '#b87c10'; g.fillRect(tx, ty + 10, 3, 2);
      /* bulbs set into the pillar itself */
      const bx = side ? TW - Math.round(PW / 2) - 1 : Math.round(PW / 2) - 1;
      for (let y = VH + 10; y < TH - 8; y += 16) bulb(bx, y, (Math.floor(beatOf() * 2) + (y / 16 | 0)) % 3 !== 0);
    }
    /* the valance: a scalloped pelmet with bulbs under it */
    for (let x = 0; x < TW; x++) {
      const scallop = Math.round(Math.abs(Math.sin(x / 9)) * 6);
      const h = VH - 4 + scallop;
      const fold = Math.sin(x / 5) * 0.5 + 0.5;
      g.fillStyle = fold > 0.6 ? '#7d1626' : fold > 0.3 ? '#5e0f1c' : '#400a14';
      g.fillRect(x, 0, 1, h);
      g.fillStyle = '#ffb32e'; g.fillRect(x, h, 1, 2);
    }
    for (let x = 8; x < TW - 6; x += 14) bulb(x, VH + 5 + Math.round(Math.abs(Math.sin(x / 9)) * 6), (Math.floor(beatOf() * 2) + (x / 14 | 0)) % 4 !== 0);

    /* ---------- 12. the marquee ---------- */
    const title = 'INF EGG CO.';
    const kk = SPR.textW(title, 3) < TW - PW * 2 - 40 ? 3 : 2;
    const tw = SPR.textW(title, kk);
    const mW = tw + 34, mH = kk * 8 + 20;
    const mX = Math.round(TW / 2 - mW / 2), mY = Math.round(VH * 0.42);
    g.fillStyle = 'rgba(255,179,46,' + (0.10 + bp * 0.06).toFixed(2) + ')';
    g.fillRect(mX - 8, mY - 6, mW + 16, mH + 14);
    g.fillStyle = '#14171a'; g.fillRect(mX - 3, mY - 3, mW + 6, mH + 6);
    g.fillStyle = '#241a20'; g.fillRect(mX, mY, mW, mH);
    g.fillStyle = '#33242c'; g.fillRect(mX, mY, mW, 2);
    SPR.drawTitle(g, title, Math.round(TW / 2 - tw / 2), mY + 6, '#ffb32e', '#14171a', kk);
    const sub = 'EGG PRODUCTION DIVISION';
    SPR.drawTiny(g, sub, Math.round(TW / 2 - SPR.tinyW(sub, 1) / 2), mY + kk * 8 + 9, '#e8b25a', 1, '#14171a');
    /* bulbs chasing round the board */
    let bi = 0;
    const chase = Math.floor(beatOf() * 4);
    for (let x = mX + 4; x < mX + mW - 2; x += 9) { bulb(x, mY - 5, (chase + bi++) % 3 !== 0); }
    for (let x = mX + 4; x < mX + mW - 2; x += 9) { bulb(x, mY + mH + 1, (chase + bi++) % 3 !== 0); }
    for (let y = mY + 4; y < mY + mH - 2; y += 9) { bulb(mX - 5, y, (chase + bi++) % 3 !== 0); bulb(mX + mW + 1, y, (chase + bi++) % 3 !== 0); }

    /* what he is singing, on a plate under the marquee */
    const shown = act.line.slice(0, Math.floor(actT * 26));
    if (shown) stencil(shown, TW / 2, mY + mH + 10, '#f0eee8', 1);

    /* ---------- 13. front of house ---------- */
    if (Math.floor(now / 620) % 2) {
      const c2 = 'CLICK ANYWHERE TO START';
      const w2 = SPR.textW(c2, 1);
      g.fillStyle = '#ffb32e'; g.fillRect(Math.round(TW / 2 - w2 / 2) - 9, TH - 24, w2 + 18, 12);
      g.fillStyle = '#14171a'; g.fillRect(Math.round(TW / 2 - w2 / 2) - 7, TH - 22, w2 + 14, 8);
      SPR.drawText(g, c2, Math.round(TW / 2 - w2 / 2), TH - 21, '#ffb32e', 1);
    }
    if (hensFound) SPR.drawTiny(g, 'HENS BOTHERED ' + hensFound, PW + 6, TH - 12, '#e8b25a', 1, '#14171a');
    /* the settings key, reachable from the front door too */
    {
      const gx = TW - PW - 24, gy = TH - 26;
      plate(gx, gy, 18, 18, { fill: '#c4c2bb', rivets: true });
      g.drawImage(SPR.iconSprite('gear', 1), gx + 4, gy + 4);
      hits.push({ id: 'gear', x: gx - 2, y: gy - 2, w: 22, h: 22 });
    }
    /* the light change between acts */
    if (actFlash > 0) {
      g.fillStyle = 'rgba(255,246,220,' + (actFlash * 0.5).toFixed(2) + ')';
      g.fillRect(0, 0, TW, TH);
    }
  }

  /* ---- the four acts, staged on the boards ---- */
  function drawAct(act, dt, now, k, rx, baseY, floorY, put) {
    if (act.id === 'dance') {
      const beat = Math.floor(now / 240) % 2;
      const hop = Math.abs(Math.sin(now / 240)) * 4 * k;
      for (let s2 = 0; s2 < 2; s2++) {
        const sx = rx + (s2 ? 34 * k : -30 * k), n = 5 + s2 * 2;
        for (let i = 0; i < n; i++) {
          const by2 = baseY - 4 * k - i * 3 * k;
          g.fillStyle = '#14171a'; g.fillRect(sx - 1, by2 - 1, 12 * k + 2, 3 * k + 1);
          g.fillStyle = '#1d4a1f'; g.fillRect(sx, by2, 12 * k, 3 * k);
          g.fillStyle = '#2f6b28'; g.fillRect(sx, by2, 12 * k, k);
          g.fillStyle = '#e8dcc0'; g.fillRect(sx, by2 + 2 * k, 12 * k, 1);
          g.fillStyle = '#ffb32e'; g.fillRect(sx + 4 * k, by2 + k, 4 * k, 1);
        }
        g.fillStyle = '#b87c10'; g.fillRect(sx + 3 * k, baseY - 4 * k - n * 3 * k - k, 6 * k, k);
      }
      put(beat ? 'guitar1' : 'guitar0', rx, baseY - hop);
      if (Math.random() < dt * 7) notes.push({ x: rx + 30 * k, y: baseY - 26 * k, t: 0, ph: Math.random() * 6 });
      if (Math.random() < dt * 9) coins.push({ x: rx - 40 * k + Math.random() * 80 * k, y: floorY - 74, v: 34 + Math.random() * 40, t: 0 });
    } else if (act.id === 'chop') {
      const tx = rx + 48 * k;
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
      const tree = SPR.decoSprite('tree', k + 1, 77);
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
      const fx = rx + 44 * k, fw = 44 * k, fh = Math.min(58 * k, Math.round(floorY - TH * 0.30));
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
      const reach = rx + 36 * k;
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
          const cs = SPR.chickenSprite(c.sp, Math.max(2, k - 1), false);
          g.save(); g.translate(Math.round(c.x), Math.round(baseY - 14 * k + c.y)); g.rotate(c.rot);
          g.drawImage(cs, -cs.width / 2, -cs.height / 2); g.restore();
          for (let i = 0; i < 3; i++) { const a = c.rot * 2 + i * 2.1; g.fillStyle = '#ffb32e'; g.fillRect(Math.round(c.x + Math.cos(a) * 11 * k), Math.round(baseY - 14 * k + c.y + Math.sin(a) * 6 * k - 8 * k), 2, 2); }
        } else if (c.x < TW + 40) {
          const hp = Math.abs(Math.sin(c.hop)) * 2 * k;
          SPR.shadowEll(g, c.x + 8 * k, baseY + 1, 5 * k, 1.5, 0.34);
          const cs = SPR.chickenSprite(c.sp, Math.max(2, k - 1), false);
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
  }

  /* ---- the Warden, once a tree is down: he wags, then sulks off ---- */
  function drawWardenBit(dt, k, baseY) {
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
  }

  /* ---- the hens that wandered in - click one and it is off ---- */
  function drawHens(dt, k0, baseY) {
    const k = Math.max(2, k0 - 1);
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
  }

  /* ---- the stage's own particles ---- */
  function drawMenuParts(dt, floorY) {
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
    /* the hatchery store room: boarded walls, a shelf of trays, a
       grading chart nailed up, and one work lamp over the crate */
    g.fillStyle = '#171b21'; g.fillRect(0, 0, TW, TH);
    for (let y = 0; y < TH; y += 8) for (let x = ((y / 8) % 2) * 8; x < TW; x += 16) { g.fillStyle = 'rgba(255,255,255,.014)'; g.fillRect(x, y, 8, 8); }
    const benchY = bench();
    /* the wall: horizontal boards with the odd nail */
    for (let y = 0; y < benchY; y += 13) {
      g.fillStyle = 'rgba(255,255,255,.026)'; g.fillRect(0, y, TW, 11);
      g.fillStyle = 'rgba(12,14,18,.5)'; g.fillRect(0, y + 11, TW, 2);
      for (let x = 9; x < TW; x += 61) { g.fillStyle = '#4a5058'; g.fillRect(x, y + 4, 2, 2); }
    }
    /* a shelf of stacked egg trays, high on the left */
    {
      const shY = Math.round(benchY * 0.30), shX = 14, shW = Math.round(TW * 0.22);
      g.fillStyle = '#14171a'; g.fillRect(shX - 2, shY, shW + 4, 5);
      g.fillStyle = '#5e4426'; g.fillRect(shX, shY + 1, shW, 3);
      for (let i = 0; i < 5; i++) {
        const ty = shY - 4 - i * 4, tw2 = shW - 10;
        g.fillStyle = '#14171a'; g.fillRect(shX + 4, ty, tw2, 4);
        g.fillStyle = '#a8783f'; g.fillRect(shX + 5, ty + 1, tw2 - 2, 2);
        g.fillStyle = '#c9a35f'; for (let x = shX + 6; x < shX + tw2 + 3; x += 4) g.fillRect(x, ty + 1, 2, 1);
      }
    }
    /* the grading chart, nailed up on the right */
    {
      const pw = Math.round(TW * 0.17), ph = Math.round(benchY * 0.34);
      const px2 = TW - pw - 16, py2 = Math.round(benchY * 0.16);
      g.fillStyle = '#14171a'; g.fillRect(px2 - 2, py2 - 2, pw + 4, ph + 4);
      g.fillStyle = '#e8dcc0'; g.fillRect(px2, py2, pw, ph);
      g.fillStyle = '#c9bb9a'; g.fillRect(px2, py2, pw, 2);
      SPR.drawTiny(g, 'GRADES', px2 + 4, py2 + 4, '#5e4426', 1);
      for (let i = 0; i < 4; i++) {
        const ey = py2 + 12 + i * Math.max(9, Math.round((ph - 16) / 4));
        if (ey + 8 > py2 + ph) break;
        g.drawImage(SPR.eggSprite(i * 2, 1), px2 + 5, ey);
        SPR.drawTiny(g, ['A', 'AA', 'AAA', '?'][i], px2 + 18, ey + 2, '#5e4426', 1);
      }
      g.fillStyle = '#8f9298'; g.fillRect(px2 + 2, py2 + 2, 2, 2); g.fillRect(px2 + pw - 4, py2 + 2, 2, 2);
    }
    /* lamp cone over the basket */
    const cx = TW / 2;
    for (let i = 0; i < 34; i++) {
      const p = i / 34;
      g.fillStyle = 'rgba(255,214,140,' + (0.11 * (1 - p * 0.75)).toFixed(3) + ')';
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
    SPR.drawTiny(g, 'INF EGG CO. - HATCHERY', bx + 6, by + bh - 8, 'rgba(60,40,18,.75)', 1);
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
      crowd = null;
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
      if (hitAt(p.x, p.y, 'gear')) { UI.snd.build(); MENU.openSettings(); return; }
      if (hitAt(p.x, p.y, 'blimp')) {
        UI.snd.engine();
        for (let i = 0; i < 14; i++) parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 120, vy: -30 - Math.random() * 60, t: 0, life: 1.1, col: i % 2 ? '#ffb32e' : '#fff8ec', s: 2 });
        return;
      }
      /* a handful of confetti where you tapped, then the shutter */
      for (let i = 0; i < 22; i++) parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 190, vy: -60 - Math.random() * 110, g: 200, drag: 1.1, t: 0, life: 1.1,
        col: ['#ffb32e', '#fff8ec', '#7fc24f', '#e0432c', '#7fd7ff'][i % 5], s: i % 3 ? 2 : 3 });
      parts.push({ type: 'ring', x: p.x, y: p.y, vx: 0, vy: 0, g: 0, t: 0, life: 0.4, col: '#ffb32e', r1: 40 });
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
    sound: ['SOUND', 'Every beep, cluck and clink.'],
    music: ['MUSIC', 'The band. A strut for the menu, something slower for the valley.'],
    volume: ['VOLUME', ''],
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
        case 'set-toggle': {
          const k = btn.dataset.k;
          GAME.setSetting(k, !GAME.setting(k)); UI.snd.plop(); renderSettings();
          /* the band starts and stops the moment you ask it to */
          if (k === 'music' || k === 'sound') {
            if (GAME.setting('music') && GAME.setting('sound')) MUSIC.play(UI.titleHidden ? 'valley' : 'strut');
            else MUSIC.stop(false);
          }
          break;
        }
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
