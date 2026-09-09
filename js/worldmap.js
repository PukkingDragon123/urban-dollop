/* ============================================================
   INF EGG CO. - THE VALLEY MAP
   A living map of the valley: the ranch, the five towns down the
   road, the roads between them in three styles, the weather over
   every town, whatever is happening on the road, our factories,
   traffic going about its business and your own vehicle on its
   way. Drag to pan, wheel to zoom, tap a town for its card.
   ============================================================ */
'use strict';

window.WMAP = (() => {
  let UI = null, $ = null, S = null;
  const LW = 480, LH = 270, MK = 2;                    /* logical size, and canvas pixels per logical pixel */
  let cv = null, g = null, base = null, side = null;
  let zoom = 1, pan = { x: 0, y: 0 }, drag = null, sel = 'ranch', hover = null, mouse = { x: 0, y: 0, inside: false };
  let sideSig = '';
  /* where everything sits */
  const NODES = {
    ranch:   { x: 56,  y: 168, name: 'THE RANCH' },
    hamlet:  { x: 128, y: 150 },
    town:    { x: 208, y: 104 },
    city:    { x: 296, y: 146 },
    capital: { x: 376, y: 78 },
    port:    { x: 444, y: 150 },
  };
  const ORDER = ['ranch', 'hamlet', 'town', 'city', 'capital', 'port'];
  const paths = {};                                    /* seg index -> style -> points */
  const cars = [];
  let carT = 0;

  function bez(a, c, b, t) { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; }
  function buildPaths() {
    for (let i = 0; i < ORDER.length - 1; i++) {
      const a = NODES[ORDER[i]], b = NODES[ORDER[i + 1]];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const nx = -dy / len, ny = dx / len;
      paths[i] = {};
      [['fast', 4], ['safe', 26], ['scenic', -46]].forEach(([st, off]) => {
        const c = { x: mx + nx * off, y: my + ny * off };
        const pts = [];
        for (let k = 0; k <= 18; k++) pts.push(bez(a, c, b, k / 18));
        paths[i][st] = pts;
      });
    }
  }
  function pathTo(cityId, style) {
    const idx = ORDER.indexOf(cityId);
    const out = [];
    for (let i = 0; i < idx; i++) paths[i][style].forEach((p, k) => { if (i === 0 || k) out.push(p); });
    return out;
  }
  function along(pts, t) {
    if (!pts.length) return { x: 0, y: 0 };
    const f = Math.max(0, Math.min(0.9999, t)) * (pts.length - 1);
    const i = Math.floor(f), r = f - i;
    const a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)];
    return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r, dir: b.x >= a.x ? 1 : -1 };
  }

  /* ---- the land, baked once ---- */
  function bake() {
    base = SPR.newCanvas(LW, LH);
    const b = base.getContext('2d');
    const rnd = SPR.mulberry(4242);
    const noise = (x, y) => { const n = Math.sin(x * 0.11 + Math.sin(y * 0.07) * 3) + Math.cos(y * 0.09 + Math.sin(x * 0.05) * 2); return (n + 2) / 4; };
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
      const n = noise(x, y);
      const sea = x > 452 + Math.sin(y * 0.08) * 6 + Math.sin(y * 0.31) * 2;
      let col;
      if (sea) col = (x + y) % 3 ? '#3f8fc6' : '#5aa8d8';
      else if (x > 446 + Math.sin(y * 0.08) * 6) col = '#e8d9a0';
      else col = n > 0.66 ? '#6fae4a' : n > 0.38 ? '#7fbf58' : '#8ed254';
      b.fillStyle = col; b.fillRect(x, y, 1, 1);
    }
    /* the river, down from the hills to the sea, with a lighter sheen */
    for (let y = 0; y < LH; y++) {
      const rx = 244 + Math.sin(y * 0.045) * 26 + Math.sin(y * 0.19) * 5 + y * 0.72;
      b.fillStyle = '#3f8fc6'; b.fillRect(Math.round(rx) - 3, y, 7, 1);
      b.fillStyle = '#5aa8d8'; b.fillRect(Math.round(rx) - 2, y, 5, 1);
      if (y % 3 === 0) { b.fillStyle = '#9fd6ff'; b.fillRect(Math.round(rx) - 1 + (y % 2), y, 1, 1); }
    }
    /* hills in the north, a forest belt, a few fields */
    for (let i = 0; i < 26; i++) {
      const hx = 20 + rnd() * 420, hy = 10 + rnd() * 50, r = 8 + rnd() * 14;
      for (let dy = -r; dy <= 0; dy++) { const half = Math.round(Math.sqrt(r * r - dy * dy) * 1.6); b.fillStyle = dy < -r * 0.6 ? '#9fb87a' : '#6fae4a'; b.fillRect(Math.round(hx) - half, Math.round(hy + dy), half * 2, 1); }
      b.fillStyle = '#4f8f3a'; b.fillRect(Math.round(hx) - 2, Math.round(hy - r * 0.6), 4, 1);
    }
    for (let i = 0; i < 260; i++) {
      const tx = rnd() * 440, ty = 60 + rnd() * 200;
      if (Object.values(NODES).some(n => Math.hypot(n.x - tx, n.y - ty) < 30)) continue;
      if (noise(tx, ty) < 0.5) continue;
      b.fillStyle = '#3f8a44'; b.fillRect(Math.round(tx), Math.round(ty) - 2, 3, 3);
      b.fillStyle = '#5aa845'; b.fillRect(Math.round(tx) + 1, Math.round(ty) - 3, 1, 1);
      b.fillStyle = '#5e3d18'; b.fillRect(Math.round(tx) + 1, Math.round(ty) + 1, 1, 1);
    }
    for (let i = 0; i < 12; i++) {
      const fx = 30 + rnd() * 380, fy = 120 + rnd() * 120, fw = 12 + rnd() * 16, fh = 8 + rnd() * 10;
      if (Object.values(NODES).some(n => Math.hypot(n.x - fx, n.y - fy) < 34)) continue;
      for (let yy = 0; yy < fh; yy++) { b.fillStyle = yy % 2 ? '#c9a35f' : '#e0bd82'; b.fillRect(Math.round(fx), Math.round(fy + yy), Math.round(fw), 1); }
    }
    /* roads: every style faint, the safe lane as the trunk */
    for (let i = 0; i < ORDER.length - 1; i++) {
      ['scenic', 'fast', 'safe'].forEach(st => {
        const pts = paths[i][st];
        for (let k = 0; k < pts.length - 1; k++) {
          const a = pts[k], c = pts[k + 1];
          const n = Math.ceil(Math.hypot(c.x - a.x, c.y - a.y));
          for (let j = 0; j <= n; j++) {
            const x = Math.round(a.x + (c.x - a.x) * j / n), y = Math.round(a.y + (c.y - a.y) * j / n);
            if (st === 'fast') { b.fillStyle = '#7a7f88'; b.fillRect(x - 1, y - 1, 3, 3); }
            else if (st === 'safe') { b.fillStyle = '#b58a4f'; b.fillRect(x - 1, y - 1, 3, 3); b.fillStyle = '#c9a35f'; b.fillRect(x, y, 1, 1); }
            else { b.fillStyle = 'rgba(181,138,79,.55)'; b.fillRect(x, y, 2, 2); }
          }
        }
      });
    }
    /* the coast: a frayed edge of foam */
    for (let y = 0; y < LH; y += 2) { const cx = 452 + Math.sin(y * 0.08) * 6 + Math.sin(y * 0.31) * 2; b.fillStyle = 'rgba(255,255,255,.6)'; b.fillRect(Math.round(cx), y, 1, 1); }
  }

  /* ---- live things ---- */
  function tickCars(dt) {
    carT -= dt;
    if (carT <= 0 && cars.length < 9) {
      carT = 1.4 + Math.random() * 2;
      const open = Math.max(1, S().routes.length);
      const seg = Math.floor(Math.random() * Math.min(ORDER.length - 1, open + 1));
      cars.push({ seg, t: Math.random() < 0.5 ? 0 : 1, dir: Math.random() < 0.5 ? 1 : -1, v: 0.05 + Math.random() * 0.05, col: ['#e8542f', '#3fa7d6', '#ffd23f', '#fff8ec', '#b06ee0', '#2e2216', '#6ab04c'][Math.floor(Math.random() * 7)], style: Math.random() < 0.3 ? 'fast' : 'safe' });
      const c = cars[cars.length - 1]; if (c.dir === -1) c.t = 1; else c.t = 0;
    }
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      const ev = GAME.eventAt(ORDER[c.seg + 1]);
      const slow = ev ? 1 / ROAD_EVENT_BY_ID[ev.id].slow : 1;
      c.t += c.dir * c.v * slow * dt;
      if (c.t < 0 || c.t > 1) cars.splice(i, 1);
    }
  }
  function drawWeatherIcon(x, y, w, now) {
    if (w === 'sun') { g.fillStyle = '#ffd23f'; g.fillRect(x - 2, y - 2, 5, 5); g.fillStyle = '#fff3c4'; g.fillRect(x - 1, y - 1, 2, 2); g.fillStyle = '#ffd23f'; [[0, -4], [0, 4], [-4, 0], [4, 0]].forEach(([dx, dy]) => g.fillRect(x + dx, y + dy, 1, 1)); }
    else if (w === 'cloud' || w === 'rain') {
      g.fillStyle = w === 'rain' ? '#8a93a3' : '#fff8ec'; g.fillRect(x - 4, y - 1, 9, 3); g.fillRect(x - 2, y - 3, 5, 3);
      if (w === 'rain') { g.fillStyle = '#7fc4e8'; for (let i = 0; i < 3; i++) g.fillRect(x - 3 + i * 3, y + 3 + ((Math.floor(now / 120) + i) % 3), 1, 2); }
    } else if (w === 'wind') { g.fillStyle = '#e8f4fa'; for (let i = 0; i < 3; i++) g.fillRect(x - 5 + ((Math.floor(now / 90) + i * 3) % 6), y - 2 + i * 2, 5, 1); }
    else if (w === 'fog') { g.fillStyle = 'rgba(220,220,230,.7)'; g.fillRect(x - 6, y - 2, 12, 1); g.fillRect(x - 4, y, 10, 1); g.fillRect(x - 6, y + 2, 12, 1); }
  }
  function drawTown(id, now) {
    const n = NODES[id], st = S();
    const c = CITY_BY_ID[id];
    const open = st.routes.includes(id);
    const i = CITIES.indexOf(c);
    const nextUp = !open && (i === 0 || st.routes.includes(CITIES[i - 1].id));
    g.globalAlpha = open ? 1 : 0.45;
    const sky = SPR.skylineSprite(c.sky, 44 + c.sky * 6, 22, 1);
    g.drawImage(sky, Math.round(n.x - sky.width / 2), Math.round(n.y - sky.height + 2));
    g.globalAlpha = 1;
    /* our factory, beside the town */
    if (st.factories[id]) {
      const fx = n.x + sky.width / 2 + 2, fy = n.y - 2;
      g.fillStyle = '#3a2a16'; g.fillRect(fx, fy - 10, 12, 12); g.fillStyle = '#b5714f'; g.fillRect(fx + 1, fy - 9, 10, 10);
      g.fillStyle = '#3a2a16'; g.fillRect(fx + 8, fy - 15, 3, 6); g.fillStyle = '#6a7280'; g.fillRect(fx + 9, fy - 14, 1, 5);
      g.fillStyle = '#ffe9a0'; g.fillRect(fx + 2, fy - 7, 2, 2); g.fillRect(fx + 5, fy - 7, 2, 2);
      g.drawImage(SPR.iconSprite(st.company.logo || 'egg', 1), fx + 1, fy - 3);
      for (let s2 = 0; s2 < 3; s2++) { const t = ((now / 900 + s2 * 0.33) % 1); g.fillStyle = 'rgba(230,230,230,' + (0.7 - t * 0.6).toFixed(2) + ')'; g.fillRect(fx + 9 + Math.round(Math.sin(now / 300 + s2) * 2), Math.round(fy - 16 - t * 12), 3, 2); }
    }
    /* the name plate */
    const label = open ? c.name.toUpperCase() : nextUp ? 'SURVEY ' + GAME.fmt(c.cost) : '? ? ?';
    const tw = SPR.tinyW(label, 1);
    g.fillStyle = sel === id ? '#ffd23f' : 'rgba(46,34,22,.85)'; g.fillRect(Math.round(n.x - tw / 2) - 3, n.y + 4, tw + 6, 9);
    SPR.drawTiny(g, label, Math.round(n.x - tw / 2), n.y + 6, sel === id ? '#2e2216' : nextUp ? '#ffd23f' : '#fff8ec', 1);
    /* pays */
    if (open) { const pt = 'x' + (c.mult * GAME.payMultTo(id)).toFixed(2); SPR.drawTiny(g, pt, Math.round(n.x - SPR.tinyW(pt, 1) / 2), n.y + 15, '#2e2216', 1); }
    /* weather over the town */
    if (open) drawWeatherIcon(n.x + sky.width / 2 + 4, n.y - sky.height - 4, GAME.townWeather(id), now);
    /* what is happening on its road */
    const ev = GAME.eventAt(id);
    if (ev && open) {
      const E = ROAD_EVENT_BY_ID[ev.id];
      const mid = along(paths[i]['safe'], 0.5);
      const pulse = Math.floor(now / 400) % 2;
      g.fillStyle = E.col; g.fillRect(Math.round(mid.x) - 6 - pulse, Math.round(mid.y) - 16 - pulse, 12 + pulse * 2, 12 + pulse * 2);
      g.fillStyle = '#2e2216'; g.fillRect(Math.round(mid.x) - 5, Math.round(mid.y) - 15, 10, 10);
      g.drawImage(SPR.iconSprite(E.icon, 1), Math.round(mid.x) - 5, Math.round(mid.y) - 15);
      g.fillStyle = E.col; g.fillRect(Math.round(mid.x) - 1, Math.round(mid.y) - 5, 2, 3);
      if (ev.id === 'jam') for (let k = 0; k < 4; k++) { const p = along(paths[i]['safe'], 0.42 + k * 0.04); g.fillStyle = ['#e8542f', '#ffd23f', '#3fa7d6', '#fff8ec'][k]; g.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 1, 4, 2); }
    }
    /* the active route wears a ring; the one you can survey blinks */
    if (st.route === id) { g.fillStyle = 'rgba(255,210,63,.9)'; const R = 6 + Math.sin(now / 300); for (let a = 0; a < 6.3; a += 0.35) g.fillRect(Math.round(n.x + Math.cos(a) * R * 3), Math.round(n.y + 1 + Math.sin(a) * R), 1, 1); }
    if (nextUp && Math.floor(now / 500) % 2) { g.fillStyle = '#ffd23f'; g.fillRect(Math.round(n.x) - 2, Math.round(n.y - sky.height - 8), 4, 4); }
  }
  function drawRanch(now) {
    const n = NODES.ranch, st = S();
    /* a barn, a fence and Mama on her nest */
    g.fillStyle = '#3a2a16'; g.fillRect(n.x - 14, n.y - 14, 16, 14); g.fillStyle = st.company.col1 || '#c94a3a'; g.fillRect(n.x - 13, n.y - 13, 14, 12); g.fillStyle = '#fff8ec'; g.fillRect(n.x - 9, n.y - 6, 6, 5); g.fillStyle = '#3a2a16'; g.fillRect(n.x - 16, n.y - 16, 20, 3);
    g.drawImage(SPR.mamaSprite(st.mamaTier, 1, 'idle'), n.x + 2, n.y - 22);
    g.fillStyle = '#8a5e2a'; for (let i = 0; i < 6; i++) g.fillRect(n.x - 16 + i * 6, n.y + 2, 1, 4); g.fillRect(n.x - 16, n.y + 3, 32, 1);
    const label = (st.company.name || 'THE RANCH').toUpperCase().slice(0, 14);
    const tw = SPR.tinyW(label, 1);
    g.fillStyle = sel === 'ranch' ? '#ffd23f' : 'rgba(46,34,22,.85)'; g.fillRect(Math.round(n.x - tw / 2) - 3, n.y + 8, tw + 6, 9);
    SPR.drawTiny(g, label, Math.round(n.x - tw / 2), n.y + 10, sel === 'ranch' ? '#2e2216' : '#fff8ec', 1);
    if (st.weather.rain) drawWeatherIcon(n.x + 20, n.y - 26, 'rain', now);
    else drawWeatherIcon(n.x + 20, n.y - 26, GAME.dayPhase() > 0.78 ? 'cloud' : 'sun', now);
  }
  function miniCar(x, y, col, dir, big) {
    const w = big ? 7 : 5, h = big ? 4 : 3;
    g.fillStyle = '#2e2216'; g.fillRect(Math.round(x - w / 2) - 1, Math.round(y - h / 2) - 1, w + 2, h + 2);
    g.fillStyle = col; g.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    g.fillStyle = '#d8f2fa'; g.fillRect(Math.round(x - w / 2) + (dir === 1 ? w - 2 : 0), Math.round(y - h / 2), 2, 1);
    g.fillStyle = '#ffd23f'; g.fillRect(Math.round(x - w / 2) + (dir === 1 ? w - 1 : 0), Math.round(y + h / 2) - 1, 1, 1);
  }
  function drawVehicle(now) {
    const st = S();
    const ph = GAME.tripPhase();
    if (!ph) return;
    const pts = pathTo(st.route, GAME.routeStyle(st.route).id);
    const t = ph.out ? ph.f / 0.5 : 1 - (ph.f - 0.5) / 0.5;
    const p = along(pts, t);
    const paint = GAME.paintInfo();
    const col = paint.col || { bike: '#e8542f', cart: '#e8542f', van: '#7fc4e8', truck: '#3f6fd6', lorry: '#e8542f', train: '#3f6fd6' }[ph.vehicle.id];
    miniCar(p.x, p.y, col, ph.out ? 1 : -1, true);
    /* a badge with the egg count, bobbing over it */
    const tag = (ph.out ? ph.n + ' EGGS' : '+' + GAME.fmt(ph.pay));
    const tw = SPR.tinyW(tag, 1), bob = Math.round(Math.sin(now / 250));
    g.fillStyle = '#2e2216'; g.fillRect(Math.round(p.x - tw / 2) - 2, Math.round(p.y) - 16 + bob, tw + 4, 8);
    g.fillStyle = ph.out ? '#fff8ec' : '#ffd23f'; g.fillRect(Math.round(p.x - tw / 2) - 1, Math.round(p.y) - 15 + bob, tw + 2, 6);
    SPR.drawTiny(g, tag, Math.round(p.x - tw / 2), Math.round(p.y) - 14 + bob, '#2e2216', 1);
    g.fillStyle = '#2e2216'; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 8 + bob, 2, 2);
    /* the route itself, lit */
    g.fillStyle = 'rgba(255,210,63,.75)';
    pts.forEach((q, k) => { if ((k + Math.floor(now / 200)) % 3 === 0) g.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); });
  }

  /* ---- the frame ---- */
  function view() { return { x: pan.x, y: pan.y, w: LW / zoom, h: LH / zoom }; }
  function clamp() {
    const v = view();
    pan.x = Math.max(0, Math.min(LW - v.w, pan.x));
    pan.y = Math.max(0, Math.min(LH - v.h, pan.y));
  }
  function toLogical(ev) {
    const r = cv.getBoundingClientRect();
    const sx = (ev.clientX - r.left) / r.width * LW, sy = (ev.clientY - r.top) / r.height * LH;
    return { x: pan.x + sx / zoom, y: pan.y + sy / zoom, sx, sy };
  }
  function hitAt(x, y) {
    for (const id of ORDER) { const n = NODES[id]; if (Math.abs(x - n.x) < 22 && y > n.y - 26 && y < n.y + 14) return id; }
    return null;
  }
  function draw(now, dt) {
    if (!cv) return;
    tickCars(dt || 0.016);
    g.imageSmoothingEnabled = false;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#2a1e12'; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(MK * zoom, 0, 0, MK * zoom, -pan.x * MK * zoom, -pan.y * MK * zoom);
    g.drawImage(base, 0, 0);
    /* water sparkle */
    g.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 20; i++) { const x = 456 + ((i * 37 + Math.floor(now / 200)) % 22), y = (i * 53 + Math.floor(now / 500) * 7) % LH; if ((i + Math.floor(now / 300)) % 3 === 0) g.fillRect(x, y, 2, 1); }
    /* the chosen style to the active town, drawn firm */
    const st = S();
    const rs = GAME.routeStyle(st.route).id;
    const idx = ORDER.indexOf(st.route);
    for (let i = 0; i < idx; i++) {
      const pts = paths[i][rs];
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k], c = pts[k + 1];
        const n = Math.ceil(Math.hypot(c.x - a.x, c.y - a.y));
        for (let j = 0; j <= n; j++) { const x = Math.round(a.x + (c.x - a.x) * j / n), y = Math.round(a.y + (c.y - a.y) * j / n); g.fillStyle = rs === 'fast' ? '#5a5f68' : '#a8783f'; g.fillRect(x - 1, y - 1, 3, 3); if ((j + Math.floor(now / 160)) % 6 === 0) { g.fillStyle = '#fff8ec'; g.fillRect(x, y, 1, 1); } }
      }
    }
    /* traffic */
    cars.forEach(c => { const p = along(paths[c.seg][c.style], c.t); miniCar(p.x, p.y, c.col, c.dir, false); });
    drawRanch(now);
    CITIES.forEach(c => drawTown(c.id, now));
    drawVehicle(now);
    /* the limousine, if it is out */
    if (GAME.limo) { const p = along(paths[0]['safe'], GAME.limo.state === 'leave' ? 0.2 : 0.05); miniCar(p.x, p.y, '#1a1a22', -1, true); g.fillStyle = '#ffd23f'; g.fillRect(Math.round(p.x) + 3, Math.round(p.y) - 5, 2, 2); }
    /* the movers */
    if (GAME.movers.van) { const p = along(paths[0]['safe'], 0.12); miniCar(p.x, p.y, '#f2ece0', 1, true); }
    /* the hour of the day over the whole valley */
    if (GAME.setting('dayNight')) { const ph = GAME.dayPhase(); if (ph > 0.78 || ph < 0.06) { g.fillStyle = 'rgba(20,30,70,.3)'; g.fillRect(0, 0, LW, LH); g.fillStyle = '#ffe9a0'; ORDER.forEach(id => { if (id === 'ranch' || st.routes.includes(id)) { const n = NODES[id]; for (let i = 0; i < 4; i++) g.fillRect(n.x - 10 + i * 6, n.y - 6 - (i % 2) * 4, 1, 1); } }); } }
    /* compass and scale */
    g.setTransform(MK, 0, 0, MK, 0, 0);
    SPR.compassRose(g, LW - 28, 30, 12, '#fff8ec');
    SPR.drawTiny(g, 'ZOOM x' + zoom.toFixed(1), 6, LH - 10, '#fff8ec', 1, '#2e2216');
    /* the hover label */
    if (hover && mouse.inside) {
      const n = NODES[hover];
      const nm = hover === 'ranch' ? 'THE RANCH' : CITY_BY_ID[hover].name.toUpperCase();
      const tw = SPR.tinyW(nm, 1);
      const sx = (n.x - pan.x) * zoom, sy = (n.y - pan.y) * zoom;
      g.fillStyle = '#2e2216'; g.fillRect(Math.round(sx - tw / 2) - 3, Math.round(sy) - 40, tw + 6, 9);
      SPR.drawTiny(g, nm, Math.round(sx - tw / 2), Math.round(sy) - 38, '#ffd23f', 1);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!$('#modal-wmap').hidden) renderSide();
  }

  /* ---- the card beside the map ---- */
  function renderSide() {
    const st = S();
    const s2 = sel + '|' + st.route + '|' + st.routes.join() + '|' + st.coins.toFixed(0) + '|' + st.truck.state + '|' + st.truck.load.length + '|' + JSON.stringify(st.factories) + JSON.stringify(st.road.events.map(e => e.id + e.city + Math.floor(e.t / 5))) + JSON.stringify(st.road.weather) + JSON.stringify(st.garage.routes) + '|' + zoom.toFixed(1);
    if (s2 === sideSig) return;
    sideSig = s2;
    side.innerHTML = '';
    const zr = document.createElement('div');
    zr.className = 'wm-zoom';
    [['-', 'out'], ['o', 'reset'], ['+', 'in']].forEach(([l, z]) => { const b = document.createElement('button'); b.className = 'btn btn-tiny'; b.dataset.act = 'wmap-zoom'; b.dataset.z = z; b.textContent = l; zr.appendChild(b); });
    side.appendChild(zr);
    const card = document.createElement('div');
    card.className = 'wm-card';
    if (sel === 'ranch') {
      const h = document.createElement('b'); h.textContent = (st.company.name || 'THE RANCH').toUpperCase(); card.appendChild(h);
      const rows = [['egg', 'LOADED', st.truck.load.length + ' / ' + GAME.truckCap()], ['truck', 'VEHICLE', GAME.vehicle().name.toUpperCase()], ['city', 'ROUTE', GAME.city().name.toUpperCase()],
                    ['clock', 'ROUND TRIP', GAME.fmtTime(GAME.tripTime())], ['coin', 'THIS LOAD', GAME.fmt(GAME.truckPayout())], ['water', 'WEATHER', st.weather.rain ? 'RAINING' : 'CLEAR'],
                    ['house', 'FACTORIES', Object.keys(st.factories).length + ' - ' + GAME.fmt(GAME.factoryIncome()) + '/MIN']];
      rows.forEach(([ic, k, v]) => { const r = document.createElement('div'); r.className = 'wm-row'; r.appendChild(UI.mkIcon(ic, 2)); const kk = document.createElement('i'); kk.textContent = k; r.appendChild(kk); const vv = document.createElement('span'); vv.textContent = v; r.appendChild(vv); card.appendChild(r); });
      const send = document.createElement('button');
      const ok = st.truck.state === 'parked' && st.truck.load.length > 0;
      send.className = 'btn' + (ok ? ' btn-green' : ''); send.disabled = !ok; send.dataset.act = 'send-now';
      send.textContent = st.truck.state === 'parked' ? 'SEND THE LOAD' : 'ON THE ROAD';
      card.appendChild(send);
      const ph = GAME.tripPhase();
      if (ph) { const p = document.createElement('p'); p.className = 'wm-note'; p.textContent = ph.out ? 'Heading for ' + ph.city.name + ' with ' + ph.n + ' eggs.' : 'Sold for ' + GAME.fmt(ph.pay) + '. Heading home.'; card.appendChild(p); }
    } else {
      const c = CITY_BY_ID[sel];
      const open = st.routes.includes(sel);
      const i = CITIES.indexOf(c);
      const prevOpen = i === 0 || st.routes.includes(CITIES[i - 1].id);
      const h = document.createElement('b'); h.textContent = open ? c.name.toUpperCase() : 'UNSURVEYED TOWN'; card.appendChild(h);
      const sk = document.createElement('div'); sk.className = 'wm-sky'; sk.appendChild(UI.cloneCanvas(SPR.skylineSprite(c.sky, 90, 30, 2))); card.appendChild(sk);
      const p = document.createElement('p'); p.className = 'wm-note'; p.textContent = open ? c.desc : prevOpen ? 'Survey the road to open it: ' + GAME.fmt(c.cost) + ' coins.' : 'Further down the road. Open the towns before it first.'; card.appendChild(p);
      if (open) {
        const ev = GAME.eventAt(sel), E = ev && ROAD_EVENT_BY_ID[ev.id];
        const rows = [['coin', 'PAYS', 'x' + (c.mult * GAME.payMultTo(sel)).toFixed(2)], ['clock', 'ROUND TRIP', GAME.fmtTime(GAME.tripTimeTo(sel))],
                      ['water', 'WEATHER', GAME.townWeather(sel).toUpperCase()], [E ? E.icon : 'road', 'ON THE ROAD', E ? E.name.toUpperCase() + ' ' + GAME.fmtTime(ev.t) : 'ALL CLEAR'],
                      [GAME.routeStyle(sel).icon, 'DRIVING', GAME.routeStyle(sel).name.toUpperCase()]];
        rows.forEach(([ic, k, v]) => { const r = document.createElement('div'); r.className = 'wm-row'; r.appendChild(UI.mkIcon(ic, 2)); const kk = document.createElement('i'); kk.textContent = k; r.appendChild(kk); const vv = document.createElement('span'); vv.textContent = v; r.appendChild(vv); card.appendChild(r); });
        if (E) { const e2 = document.createElement('p'); e2.className = 'wm-note'; e2.textContent = E.desc; card.appendChild(e2); }
        const styles = document.createElement('div'); styles.className = 'rc-styles';
        ROUTE_STYLE_KEYS.forEach(sid => { const rs = ROUTE_STYLES[sid]; const b = document.createElement('button'); b.className = 'btn btn-tiny' + (GAME.routeStyle(sel).id === sid ? ' btn-green' : ''); b.dataset.act = 'set-style'; b.dataset.city = sel; b.dataset.style = sid; b.title = rs.desc; b.appendChild(UI.mkIcon(rs.icon, 2)); b.appendChild(document.createTextNode(rs.name.toUpperCase())); styles.appendChild(b); });
        card.appendChild(styles);
        if (st.route !== sel) { const b = document.createElement('button'); b.className = 'btn'; b.dataset.act = 'set-route'; b.dataset.id = sel; b.disabled = st.truck.state !== 'parked'; b.textContent = 'DELIVER HERE'; card.appendChild(b); }
        else { const em = document.createElement('em'); em.className = 'wm-here'; em.textContent = 'DELIVERING HERE'; card.appendChild(em); }
        if (st.factories[sel]) { const f = document.createElement('p'); f.className = 'wm-note good'; f.textContent = 'Our factory here adds 15% to every load and earns ' + GAME.fmt(c.mult * ROAD.factoryIncome) + ' a minute.'; card.appendChild(f); }
        else { const b = document.createElement('button'); b.className = 'btn' + (GAME.canFactory(sel) ? ' btn-green' : ''); b.disabled = !GAME.canFactory(sel); b.dataset.act = 'buy-factory'; b.dataset.id = sel; b.appendChild(UI.mkIcon('coin', 2)); b.appendChild(document.createTextNode('BUILD A FACTORY ' + GAME.fmt(GAME.factoryCost(sel)))); card.appendChild(b); }
      } else if (prevOpen) {
        const b = document.createElement('button'); b.className = 'btn' + (st.coins >= c.cost ? ' btn-green' : ''); b.disabled = st.coins < c.cost; b.dataset.act = 'buy-route'; b.dataset.id = sel; b.appendChild(UI.mkIcon('coin', 2)); b.appendChild(document.createTextNode('SURVEY THE ROAD ' + GAME.fmt(c.cost))); card.appendChild(b);
      }
    }
    side.appendChild(card);
    /* everything happening on the roads, in one list */
    const evs = document.createElement('div'); evs.className = 'wm-events';
    const eh = document.createElement('i'); eh.textContent = 'ON THE ROADS'; evs.appendChild(eh);
    if (!st.road.events.length) { const none = document.createElement('span'); none.textContent = 'Quiet out there.'; evs.appendChild(none); }
    st.road.events.forEach(e => { const E = ROAD_EVENT_BY_ID[e.id]; const r = document.createElement('button'); r.className = 'wm-ev'; r.dataset.act = 'wmap-sel'; r.dataset.id = e.city; r.style.borderColor = E.col; r.appendChild(UI.mkIcon(E.icon, 2)); r.appendChild(document.createTextNode(E.name.toUpperCase() + ' - ' + CITY_BY_ID[e.city].name.toUpperCase() + ' - ' + GAME.fmtTime(e.t))); evs.appendChild(r); });
    side.appendChild(evs);
    $('#wmap-sub').textContent = st.routes.length + ' / ' + CITIES.length + ' TOWNS  -  ' + Object.keys(st.factories).length + ' FACTORIES  -  ' + (GAME.tripPhase() ? 'A LOAD IS OUT' : 'THE ' + GAME.vehicle().name.toUpperCase() + ' IS HOME');
  }

  function open() {
    if (!cv) setup();
    sideSig = '';
    UI.openModal('#modal-wmap');
  }
  function setup() {
    cv = $('#wmap-canvas'); g = cv.getContext('2d'); side = $('#wmap-side');
    cv.width = LW * MK; cv.height = LH * MK;
    buildPaths(); bake();
    cv.addEventListener('pointermove', ev => {
      const p = toLogical(ev);
      mouse = { x: p.x, y: p.y, inside: true };
      if (drag) {
        if (Math.hypot(ev.clientX - drag.cx, ev.clientY - drag.cy) > 4) drag.moved = true;
        pan.x = drag.px - (p.sx - drag.sx) / zoom; pan.y = drag.py - (p.sy - drag.sy) / zoom; clamp();
        return;
      }
      hover = hitAt(p.x, p.y);
      cv.style.cursor = hover ? 'pointer' : 'grab';
    });
    cv.addEventListener('pointerleave', () => { mouse.inside = false; hover = null; drag = null; });
    cv.addEventListener('pointerdown', ev => {
      ev.preventDefault(); cv.setPointerCapture(ev.pointerId);
      const p = toLogical(ev);
      drag = { sx: p.sx, sy: p.sy, px: pan.x, py: pan.y, cx: ev.clientX, cy: ev.clientY, moved: false };
    });
    cv.addEventListener('pointerup', ev => {
      if (!drag) return;
      const moved = drag.moved; drag = null;
      if (moved) return;
      const p = toLogical(ev);
      const h = hitAt(p.x, p.y);
      if (h) { sel = h; sideSig = ''; UI.snd.plop(); }
    });
    cv.addEventListener('wheel', ev => {
      ev.preventDefault();
      const p = toLogical(ev);
      const z0 = zoom;
      zoom = Math.max(1, Math.min(3, zoom * (ev.deltaY > 0 ? 0.85 : 1.18)));
      /* zoom about the pointer */
      pan.x = p.x - p.sx / zoom; pan.y = p.y - p.sy / zoom; clamp();
      if (z0 !== zoom) sideSig = '';
    }, { passive: false });
  }
  function init(ui) {
    UI = ui; $ = ui.$; S = ui.S;
    document.getElementById('app').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      switch (btn.dataset.act) {
        case 'wmap-zoom': {
          const z = btn.dataset.z;
          const cx = pan.x + LW / zoom / 2, cy = pan.y + LH / zoom / 2;
          zoom = z === 'in' ? Math.min(3, zoom * 1.3) : z === 'out' ? Math.max(1, zoom / 1.3) : 1;
          pan.x = cx - LW / zoom / 2; pan.y = cy - LH / zoom / 2; clamp(); sideSig = ''; UI.snd.plop(); break;
        }
        case 'wmap-sel': { sel = btn.dataset.id; const n = NODES[sel]; if (n) { zoom = Math.max(zoom, 1.6); pan.x = n.x - LW / zoom / 2; pan.y = n.y - LH / zoom / 2; clamp(); } sideSig = ''; UI.snd.plop(); break; }
        case 'buy-factory': { if (GAME.buyFactory(btn.dataset.id)) { UI.snd.grand(); UI.floatText('FACTORY OPEN', ev.clientX - 40, ev.clientY - 30, 'gold', 'house'); } else UI.snd.error(); sideSig = ''; break; }
        case 'set-style': case 'set-route': case 'buy-route': case 'send-now': sideSig = ''; break;
      }
    });
  }
  return { init, open, draw };
})();
