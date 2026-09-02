/* ============================================================
   INF EGG CO. v3 — world model: big buyable field, hand tools,
   feather plumes, breeding, incubator-only hatching.
   World units are virtual pixels; the UI scales them up 3x.
   ============================================================ */
'use strict';

const SAVE_KEY = 'infEggCoSave_v3';

/* the world: 3x2 plots of 16x13 tiles = 48x26 tiles = 768x416 px */
const WORLD = {
  T: 16, COLS: 48, ROWS: 26,
  W: 768, H: 416,
  roadY: 384,                                /* road rows 24-25, bottom plots only */
  view: { w: 384, h: 208 },                  /* camera viewport */
  mama: { x: 118, y: 272 },
  pond: { x: 180, y: 226, w: 56, h: 28 },
  truckHome: { x: 150, y: 380, w: 56, h: 32 },
  stations: {
    lab:      { x: 18,  y: 222, w: 30, h: 32 },   /* research shack */
    stand:    { x: 56,  y: 228, w: 16, h: 24 },   /* chickenpedia stand */
    mamaSign: { x: 88,  y: 250, w: 14, h: 20 },   /* upgrade-mama signpost */
  },
  starterInc: [3, 18],                      /* prebuilt incubator anchor tile */
};

const GAME = (() => {

  /* ---------- state ---------- */
  let nextId = 1;
  function freshState() {
    return {
      v: 3,
      coins: 0, feathers: 0,
      plots: [false, false, false, true, false, false],   /* start: bottom-left */
      mamaTier: 0,
      mama: { lay: 8, petCd: 0 },
      chickens: [],          /* {id, sp, x, y, dir, state, t, lay, petCd, buffT} */
      eggs: [],              /* ground eggs {id,tier,golden,x,y,z,vz,suck} */
      plumes: [],            /* feathers on the ground {x,y,z,vz,value,sway} */
      feed: [],              /* {x,y,n} seed piles */
      basket: [],            /* eggs in the basket tool */
      tool: 'hand',
      held: null,            /* {kind:'chicken', ch} | {kind:'egg', egg} */
      belts: {}, incs: {}, vacs: {}, nests: {},   /* "c,r" -> building */
      huts: {}, silos: {}, blowers: {}, sorters: {}, fences: {},
      staff: [],             /* hired workers */
      hired: { hand: 0, feeder: 0, cull: 0, match: 0 },
      autoMark: -1,          /* auto-mark chickens below this tier (-1 = off) */
      unpaid: false,
      duck: null,            /* the visitor at the pond, if any */
      duckCd: 25,            /* seconds until the next visitor */
      duckMet: [],           /* ids of ducks you have helped */
      quest: null,           /* {duckId, type, need, base, coins, feathers} */
      questsDone: 0,
      diary: [],             /* {day, kind, text, sp} */
      day: 1, dayT: 0,
      seenTitle: false,
      items: [],             /* eggs riding belts */
      truck: { state: 'parked', t: 0, load: [] },
      built: { incubator: 0, vacuum: 0, belt: 0, lovenest: 0, staffhut: 0, silo: 0, blower: 0, sorter: 0, fence: 0 },
      disc: [], sk: { root: 1 },
      cam: { x: 0, y: 200 },
      stats: { pets: 0, laid: 0, collected: 0, sold: 0, coinsEarned: 0, hatched: 0, mutations: 0, bred: 0, plumes: 0, culled: 0, wagesPaid: 0, staffEggs: 0 },
      muted: false, last: Date.now(),
    };
  }
  let S = freshState();

  const listeners = {};
  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
  function emit(ev, d) { (listeners[ev] || []).forEach(fn => fn(d)); }
  const dirty = { skills: true, pedia: true, build: true, ground: true };
  function mark(...k) { k.forEach(x => dirty[x] = true); }

  /* ---------- derived values ---------- */
  const lvl = id => S.sk[id] || 0;
  const disc = () => S.disc.length;
  const overclock = () => (lvl('overclock') ? 2 : 1);
  const tycoon = () => (lvl('tycoon') ? 2 : 1);
  const ownedPlots = () => S.plots.filter(Boolean).length;

  function eggValue(tier, golden) {
    let v = ECON.eggValue(tier);
    v *= 1 + 0.15 * lvl('value');
    v *= 1 + 0.01 * lvl('contracts') * disc();
    if (golden) v *= ECON.goldenMult;
    return Math.round(v * tycoon());
  }
  function layTime(t) { return ECON.layTime(t) / (1 + 0.10 * lvl('happy')); }
  function petCd(isMama) { return (isMama ? ECON.mamaPetCd : ECON.basePetCd) * Math.pow(0.85, lvl('pets')); }
  function incHatchTime(t, rainbow) {
    let time = ECON.incHatch(t) / (1 + 0.15 * lvl('warm')) / (1 + 0.30 * lvl('quantum')) / overclock();
    if (rainbow && lvl('secretlore')) time /= 3;
    return time;
  }
  function chickenCap() { return ECON.baseChickenCap + 4 * lvl('flock') + ECON.capPerPlot * (ownedPlots() - 1); }
  function incCap() { return 6 + 3 * lvl('inccap'); }
  function basketCap() { return ECON.baseBasketCap + 8 * lvl('basket1') + 16 * lvl('basket2'); }
  function scoopR() { return ECON.baseScoopR + 12 * lvl('magnet'); }
  function vacR() { return ECON.baseVacR + 8 * lvl('vacradius'); }
  function vacInterval() { return ECON.vacInterval / (1 + 0.25 * lvl('vacspeed')) / overclock(); }
  function beltSpeed() { return ECON.beltSpeed * (1 + 0.20 * lvl('beltspeed')) * overclock(); }
  function truckCap() { return ECON.baseTruckCap + 5 * lvl('truckcap'); }
  function tripTime() { return ECON.baseTripTime * Math.pow(0.85, lvl('route')); }
  function mutationChance() { return ECON.baseMutation + 0.015 * lvl('mutate'); }
  function goldenChance() { return 0.03 * lvl('golden'); }
  function mamaCost() { return ECON.mamaCost(S.mamaTier); }
  function scoopFeatherChance() { return ECON.scoopFeather + 0.03 * lvl('feather1'); }
  function sweepLuck() { return 0.02 * lvl('sweepluck'); }
  function breedTime() { return ECON.breedTime / (1 + 0.20 * lvl('candle')); }
  function breedUp() { return ECON.breedUpBase + 0.06 * lvl('genes'); }
  function rainbowChance() { return ECON.rainbowBase + 0.08 * lvl('rainbowegg'); }
  function featherFor(t, isNew) {
    let f = ECON.feathers(t);
    if (isNew) f += ECON.discoveryBonus(t);
    return Math.ceil(f * (1 + 0.2 * lvl('whisper')));
  }
  function truckPayout() {
    let sum = S.truck.load.reduce((a, e) => a + eggValue(e.tier, e.golden), 0);
    if (S.truck.load.length >= truckCap()) sum *= 1 + 0.06 * lvl('fullbonus');
    return Math.round(sum);
  }

  /* ---------- geography ---------- */
  const key = (c, r) => c + ',' + r;
  function plotAt(x, y) {
    const c = Math.floor(x / WORLD.T), r = Math.floor(y / WORLD.T);
    for (const p of PLOTS)
      if (c >= p.tc && c < p.tc + PLOT_W && r >= p.tr && r < p.tr + PLOT_H) return p;
    return null;
  }
  function inOwned(x, y) {
    if (x < 4 || x > WORLD.W - 4 || y < 4 || y > WORLD.H - 4) return false;
    const p = plotAt(x, y);
    return !!(p && S.plots[p.id]);
  }
  function inPond(x, y) {
    const p = WORLD.pond;
    return x > p.x - 6 && x < p.x + p.w + 6 && y > p.y - 6 && y < p.y + p.h + 6;
  }
  function inStation(x, y, pad) {
    pad = pad || 0;
    for (const k of Object.keys(WORLD.stations)) {
      const s = WORLD.stations[k];
      if (x > s.x - pad && x < s.x + s.w + pad && y > s.y - pad && y < s.y + s.h + pad) return k;
    }
    return null;
  }
  function ownedBounds() {
    /* camera may roam owned plots plus locked neighbors (to visit FOR SALE signs) */
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    PLOTS.forEach(p => {
      const owned = S.plots[p.id];
      const adjacent = !owned && plotNeighbors(p.id).some(n => S.plots[n]);
      if (!owned && !adjacent) return;
      x0 = Math.min(x0, p.tc * 16); y0 = Math.min(y0, p.tr * 16);
      x1 = Math.max(x1, (p.tc + PLOT_W) * 16); y1 = Math.max(y1, (p.tr + PLOT_H) * 16);
    });
    return { x0, y0, x1, y1 };
  }
  function clampCam() {
    const b = ownedBounds();
    const vw = WORLD.view.w, vh = WORLD.view.h;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const loX = Math.max(0, Math.min(b.x0, WORLD.W - vw));
    const hiX = Math.max(loX, Math.min(WORLD.W - vw, b.x1 - vw));
    const loY = Math.max(0, Math.min(b.y0, WORLD.H - vh));
    const hiY = Math.max(loY, Math.min(WORLD.H - vh, b.y1 - vh));
    S.cam.x = clamp(S.cam.x, loX, hiX);
    S.cam.y = clamp(S.cam.y, loY, hiY);
  }

  /* ---------- grid / occupancy ---------- */
  let occ = {};
  function rebuildOcc() {
    occ = {};
    Object.keys(S.belts).forEach(k => occ[k] = { type: 'belt', k });
    Object.keys(S.vacs).forEach(k => occ[k] = { type: 'vacuum', k });
    Object.keys(S.blowers).forEach(k => occ[k] = { type: 'blower', k });
    Object.keys(S.sorters).forEach(k => occ[k] = { type: 'sorter', k });
    Object.keys(S.fences).forEach(k => occ[k] = { type: 'fence', k });
    const two = (map, type) => Object.keys(map).forEach(k => {
      const [c, r] = k.split(',').map(Number);
      for (let dc = 0; dc < 2; dc++) for (let dr = 0; dr < 2; dr++)
        occ[key(c + dc, r + dr)] = { type, k };
    });
    two(S.incs, 'incubator');
    two(S.nests, 'lovenest');
    two(S.huts, 'staffhut');
    two(S.silos, 'silo');
  }
  function isFence(x, y) { return !!S.fences[key(Math.floor(x / 16), Math.floor(y / 16))]; }
  function tileBuildable(c, r) {
    const x = c * 16 + 8, y = r * 16 + 8;
    const p = plotAt(x, y);
    if (!p || !S.plots[p.id]) return false;
    if (r >= 24) return false;                          /* the road */
    if (r === p.tr && p.tr === 0) return false;         /* top tree line */
    const px = c * 16, py = r * 16, pd = WORLD.pond;
    if (px + 16 > pd.x - 4 && px < pd.x + pd.w + 4 && py + 16 > pd.y - 4 && py < pd.y + pd.h + 4) return false;
    if (Math.abs(px + 8 - WORLD.mama.x) < 28 && Math.abs(py + 8 - WORLD.mama.y) < 28) return false;
    for (const k of Object.keys(WORLD.stations)) {
      const st = WORLD.stations[k];
      if (px + 16 > st.x - 4 && px < st.x + st.w + 4 && py + 16 > st.y - 4 && py < st.y + st.h + 4) return false;
    }
    return true;
  }
  function canPlace(type, c, r) {
    const b = BUILDS[type];
    if (b.needs && !lvl(b.needs)) return false;
    for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) {
      if (!tileBuildable(c + dc, r + dr) || occ[key(c + dc, r + dr)]) return false;
    }
    return true;
  }
  const DIRV = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  /* ---------- land ---------- */
  function buyPlot(id) {
    const p = PLOTS[id];
    if (!p || S.plots[id]) return false;
    if (!plotNeighbors(id).some(n => S.plots[n])) return false;
    if (S.coins < p.price) return false;
    S.coins -= p.price;
    S.plots[id] = true;
    note('land', 'Bought the ' + p.theme + ' plot next door.');
    mark('ground');
    emit('land', { plot: p });
    return true;
  }

  /* ---------- egg creation ---------- */
  function rollTier(base) {
    let t = base, mutated = false;
    const capT = TIERS.length - 2;   /* mutations never reach Secret */
    if (t < capT && Math.random() < mutationChance()) {
      let jump = 1;
      if (Math.random() < 0.15 * lvl('rainbow')) jump = 2;
      t = Math.min(capT, t + jump);
      mutated = true;
      S.stats.mutations++;
    }
    return { tier: t, mutated };
  }
  function spawnEgg(x, y, tier, golden, rainbow) {
    if (S.eggs.length >= ECON.groundEggCap) return null;
    const egg = {
      id: nextId++, tier, golden: !!golden, rainbow: !!rainbow,
      x: Math.max(6, Math.min(WORLD.W - 6, x)),
      y: Math.max(20, Math.min(WORLD.roadY - 6, y)),
      z: 0, vz: -34 - Math.random() * 18, suck: null,
    };
    S.eggs.push(egg);
    return egg;
  }
  function layEgg(x, y, baseTier, fromPet) {
    if (S.eggs.length >= ECON.groundEggCap) return null;
    const { tier, mutated } = rollTier(baseTier);
    const golden = Math.random() < goldenChance();
    const egg = spawnEgg(x + (Math.random() * 22 - 11), y + (Math.random() * 14 - 4), tier, golden, false);
    if (!egg) return null;
    S.stats.laid++;
    emit('lay', { egg, mutated, fromPet });
    return egg;
  }

  /* ---------- the diary ---------- */
  function note(kind, text, sp) {
    const last = S.diary[S.diary.length - 1];
    if (last && last.text === text && last.kind === kind) return;
    S.diary.push({ day: S.day, kind, text, sp: sp === undefined ? null : sp });
    if (S.diary.length > ECON.diaryMax) S.diary.shift();
    emit('diary', { kind, text });
  }

  /* ---------- plumes (physical feathers) ---------- */
  function dropPlumes(x, y, total) {
    const n = Math.max(1, Math.min(4, Math.round(total / 3) + 1));
    const each = Math.ceil(total / n);
    for (let i = 0; i < n; i++) {
      if (S.plumes.length > 140) { S.feathers += each; continue; }  /* overflow: auto-collect */
      S.plumes.push({
        id: nextId++, value: each,
        x: x + (Math.random() * 26 - 13), y: Math.max(20, y + (Math.random() * 16 - 8)),
        z: -14 - Math.random() * 8, vz: 0, sway: Math.random() * Math.PI * 2,
      });
    }
  }
  function collectPlume(pl) {
    const i = S.plumes.indexOf(pl);
    if (i === -1) return 0;
    S.plumes.splice(i, 1);
    S.feathers += pl.value;
    S.stats.plumes += pl.value;
    return pl.value;
  }

  /* ---------- chickens ---------- */
  function spawnChicken(spId, x, y) {
    const sp = SPECIES[spId];
    const ch = {
      id: nextId++, sp: spId,
      x: Math.max(10, Math.min(WORLD.W - 30, x)),
      y: Math.max(20, Math.min(WORLD.roadY - 24, y)),
      dir: Math.random() < 0.5 ? -1 : 1, state: 'idle', t: Math.random() * 2,
      lay: layTime(sp.tier) * (0.3 + Math.random() * 0.7), petCd: 0, buffT: 0,
    };
    S.chickens.push(ch);
    return ch;
  }
  function pickSpecies(tier) {
    const pool = SPECIES_BY_TIER[tier];
    const unknown = pool.filter(sp => !S.disc.includes(sp.id));
    if (unknown.length && Math.random() < 0.4)
      return unknown[Math.floor(Math.random() * unknown.length)];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  /* hatch an egg (only incubators call this) */
  function hatchChicken(tier, x, y, rainbow) {
    const births = [];
    const once = t => {
      if (S.chickens.length >= chickenCap()) return;
      let ht = rainbow ? TIERS.length - 1 : t;
      if (!rainbow && ht < TIERS.length - 2 && Math.random() < 0.05 * lvl('miracle')) ht++;
      const sp = pickSpecies(ht);
      const isNew = !S.disc.includes(sp.id);
      if (isNew) S.disc.push(sp.id);
      const f = featherFor(ht, isNew);
      dropPlumes(x, y + 6, f);
      S.stats.hatched++;
      const born = spawnChicken(sp.id, x, y);
      if (S.autoMark >= 0 && sp.tier < S.autoMark) born.marked = true;
      births.push({ sp, feathers: f, isNew, miracle: !rainbow && ht > t });
      if (isNew) { mark('pedia'); note('species', 'Met ' + sp.name + ' for the first time.', sp.id); }
      if (S.stats.hatched === 1) note('first', 'The very first egg hatched on the ranch.', sp.id);
    };
    once(tier);
    if (!rainbow && Math.random() < 0.04 * lvl('twins')) once(tier);
    if (births.length) emit('hatch', { births, x, y, rainbow });
    return births;
  }

  function nearestFeed(x, y, R) {
    let best = null, bd = R * R;
    for (const f of S.feed) {
      const d = (f.x - x) * (f.x - x) + (f.y - y) * (f.y - y);
      if (d < bd) { best = f; bd = d; }
    }
    return best;
  }

  function tickChicken(ch, dt) {
    ch.t -= dt;
    ch.petCd = Math.max(0, ch.petCd - dt);
    ch.buffT = Math.max(0, ch.buffT - dt);
    /* seek feed */
    if (ch.state !== 'seek' && ch.buffT <= 0 && S.feed.length) {
      const f = nearestFeed(ch.x + 10, ch.y + 10, 70);
      if (f) { ch.state = 'seek'; ch.target = f; ch.t = 6; }
    }
    if (ch.state === 'seek') {
      const f = ch.target;
      if (!f || f.n <= 0 || S.feed.indexOf(f) === -1) { ch.state = 'idle'; ch.t = 0.5; ch.target = null; }
      else {
        const dx = f.x - (ch.x + 10), dy = f.y - (ch.y + 12);
        const d = Math.hypot(dx, dy);
        if (d < 6) {
          f.n--;
          if (f.n <= 0) S.feed.splice(S.feed.indexOf(f), 1);
          ch.buffT = ECON.feedBuff * (1 + 0.5 * lvl('feedplus'));
          ch.state = 'peck'; ch.t = 0.8; ch.target = null;
          emit('feedeat', { x: ch.x + 10, y: ch.y });
        } else {
          ch.dir = dx > 0 ? 1 : -1;
          const nx = ch.x + (dx / d) * 22 * dt, ny = ch.y + (dy / d) * 22 * dt;
          if (inOwned(nx + 10, ny + 10) && !inPond(nx + 10, ny + 10) && !isFence(nx + 10, ny + 16)) { ch.x = nx; ch.y = ny; }
          else { ch.state = 'idle'; ch.t = 1; ch.target = null; }
        }
      }
    } else if (ch.t <= 0) {
      const r = Math.random();
      if (r < 0.45) { ch.state = 'walk'; ch.dir = Math.random() < 0.5 ? -1 : 1; ch.t = 0.8 + Math.random() * 2; }
      else if (r < 0.75) { ch.state = 'idle'; ch.t = 0.6 + Math.random() * 1.6; }
      else { ch.state = 'peck'; ch.t = 0.7 + Math.random() * 0.8; }
    }
    if (ch.state === 'walk') {
      const nx = ch.x + ch.dir * 9 * dt;
      const ny = ch.y + Math.sin(ch.id + ch.x / 9) * 5 * dt;
      if (inOwned(nx + 10, ny + 12) && inOwned(nx + 10, ny + 20) && !inPond(nx + 10, ny + 12)
          && !isFence(nx + 10, ny + 16) && ny < WORLD.roadY - 24) {
        ch.x = nx; ch.y = ny;
      } else ch.dir *= -1;
    }
    const sp = SPECIES[ch.sp];
    ch.lay -= dt * (ch.buffT > 0 ? 2 : 1);
    if (ch.lay <= 0) {
      ch.lay = layTime(sp.tier);
      layEgg(ch.x + 10, ch.y + 16, sp.tier, false);
    }
  }

  /* ---------- petting / grabbing ---------- */
  function petMama() {
    if (S.mama.petCd > 0) return false;
    S.mama.petCd = petCd(true);
    S.stats.pets++;
    layEgg(WORLD.mama.x, WORLD.mama.y + 8, S.mamaTier, true);
    return true;
  }
  function petChicken(ch) {
    if (ch.petCd > 0) return false;
    ch.petCd = petCd(false);
    S.stats.pets++;
    layEgg(ch.x + 10, ch.y + 14, SPECIES[ch.sp].tier, true);
    return true;
  }
  function grabChicken(ch) {
    const i = S.chickens.indexOf(ch);
    if (i === -1 || S.held) return false;
    S.chickens.splice(i, 1);
    S.held = { kind: 'chicken', ch };
    return true;
  }
  function grabEgg(egg) {
    const i = S.eggs.indexOf(egg);
    if (i === -1 || S.held) return false;
    S.eggs.splice(i, 1);
    S.held = { kind: 'egg', egg: { tier: egg.tier, golden: egg.golden, rainbow: egg.rainbow } };
    return true;
  }
  /* returns a short outcome string for fx */
  function dropHeld(x, y) {
    if (!S.held) return null;
    const held = S.held;
    S.held = null;
    if (held.kind === 'chicken') {
      const ch = held.ch;
      /* love nest? */
      const o = occ[key(Math.floor(x / 16), Math.floor(y / 16))];
      if (o && o.type === 'lovenest') {
        const nest = S.nests[o.k];
        if (nest.slots.filter(Boolean).length < 2 && nest.cd <= 0) {
          nest.slots[nest.slots[0] ? 1 : 0] = { sp: ch.sp };
          if (nest.slots[0] && nest.slots[1]) nest.prog = 0.0001;
          return 'nested';
        }
      }
      /* the lab: graduate a chicken into feathers */
      if (inStation(x, y, 4) === 'lab') {
        const t = SPECIES[ch.sp].tier;
        const f = Math.max(1, Math.ceil(ECON.feathers(t) * 1.5));
        dropPlumes(WORLD.stations.lab.x + 15, WORLD.stations.lab.y + 30, f);
        emit('graduate', { sp: SPECIES[ch.sp], f });
        return 'graduated';
      }
      ch.x = Math.max(10, Math.min(WORLD.W - 30, x - 10));
      ch.y = Math.max(20, Math.min(WORLD.roadY - 24, y - 10));
      if (!inOwned(ch.x + 10, ch.y + 10)) { ch.x = WORLD.mama.x + 20; ch.y = WORLD.mama.y; }
      S.chickens.push(ch);
      return 'dropped';
    }
    /* egg */
    const e = held.egg;
    const c = Math.floor(x / 16), r = Math.floor(y / 16);
    const o = occ[key(c, r)];
    if (o && o.type === 'incubator') {
      const inc = S.incs[o.k];
      if (inc.queue.length < incCap()) { inc.queue.push(e); return 'incubated'; }
    }
    if (S.truck.state === 'parked' && hitTruck(x, y)) {
      if (S.truck.load.length < truckCap()) { S.truck.load.push(e); return 'loaded'; }
    }
    spawnEgg(x, Math.min(y, WORLD.roadY - 8), e.tier, e.golden, e.rainbow);
    return 'placed';
  }
  function hitTruck(x, y) {
    const th = WORLD.truckHome;
    return x > th.x - 10 && x < th.x + th.w + 12 && y > th.y - 16 && y < th.y + th.h + 4;
  }

  /* ---------- basket ---------- */
  function scoopEgg(egg) {
    if (S.basket.length >= basketCap()) return 'full';
    const i = S.eggs.indexOf(egg);
    if (i === -1) return false;
    S.eggs.splice(i, 1);
    S.basket.push({ tier: egg.tier, golden: egg.golden, rainbow: egg.rainbow });
    S.stats.collected++;
    if (Math.random() < sweepLuck() && S.basket.length < basketCap())
      S.basket.push({ tier: egg.tier, golden: egg.golden, rainbow: egg.rainbow });
    if (Math.random() < scoopFeatherChance()) dropPlumes(egg.x, egg.y, 1);
    return true;
  }
  function basketToTruck() {
    if (S.truck.state !== 'parked') return 0;
    let n = 0;
    while (S.basket.length && S.truck.load.length < truckCap()) { S.truck.load.push(S.basket.pop()); n++; }
    return n;
  }
  function basketToInc(k) {
    const inc = S.incs[k];
    if (!inc) return 0;
    let n = 0;
    while (S.basket.length && inc.queue.length < incCap()) { inc.queue.push(S.basket.pop()); n++; }
    return n;
  }
  function basketToGround(x, y) {
    let n = 0;
    while (S.basket.length) {
      const e = S.basket.pop();
      const a = Math.random() * Math.PI * 2, d = n === 0 ? 0 : 4 + Math.random() * 5 + n;
      spawnEgg(x + Math.cos(a) * d, Math.min(y + Math.sin(a) * d * 0.6, WORLD.roadY - 8), e.tier, e.golden, e.rainbow);
      n++;
    }
    return n;
  }

  /* ---------- feed tool ---------- */
  function sprinkleFeed(x, y) {
    if (!lvl('feed')) return false;
    if (S.coins < ECON.feedCost) return false;
    if (!inOwned(x, y) || y > WORLD.roadY - 10) return false;
    S.coins -= ECON.feedCost;
    for (let i = 0; i < 4; i++) {
      S.feed.push({ x: x + (Math.random() * 22 - 11), y: y + (Math.random() * 14 - 7), n: 1 });
    }
    if (S.feed.length > 60) S.feed.splice(0, S.feed.length - 60);
    return true;
  }

  /* ---------- truck ---------- */
  function sendTruck() {
    if (S.truck.state !== 'parked' || S.truck.load.length === 0) return false;
    S.truck.state = 'away';
    S.truck.t = tripTime();
    emit('truckleave', {});
    return true;
  }
  function tickTruck(dt) {
    const tr = S.truck;
    if (tr.state === 'away') {
      tr.t -= dt;
      if (tr.t <= 0) {
        const pay = truckPayout();
        const n = tr.load.length;
        S.coins += pay;
        S.stats.coinsEarned += pay;
        S.stats.sold += n;
        tr.load = [];
        tr.state = 'parked';
        emit('sell', { pay, n });
      }
    } else if (lvl('autosend') && tr.load.length >= truckCap()) sendTruck();
  }

  /* ---------- eggs & plumes physics ---------- */
  function tickEggs(dt) {
    for (let i = S.eggs.length - 1; i >= 0; i--) {
      const e = S.eggs[i];
      if (e.suck) {
        const [c, r] = e.suck.split(',').map(Number);
        const tx = c * 16 + 8, ty = r * 16 + 8;
        const dx = tx - e.x, dy = ty - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 5) {
          const vac = S.vacs[e.suck];
          S.eggs.splice(i, 1);
          if (vac) { vac.hold.push({ tier: e.tier, golden: e.golden, rainbow: e.rainbow }); S.stats.collected++; }
          continue;
        }
        const sp = 90 * dt / d;
        e.x += dx * sp; e.y += dy * sp;
        continue;
      }
      if (e.z < 0 || e.vz !== 0) {
        e.vz += 160 * dt;
        e.z += e.vz * dt;
        if (e.z >= 0) {
          e.z = 0;
          e.vz = Math.abs(e.vz) > 24 ? -Math.abs(e.vz) * 0.4 : 0;
        }
      }
    }
    for (const pl of S.plumes) {
      pl.sway += dt * 3;
      if (pl.z < 0) {
        pl.z += 9 * dt;
        pl.x += Math.sin(pl.sway) * 6 * dt;
      } else pl.z = 0;
    }
  }

  /* ---------- vacuums ---------- */
  function tickVacs(dt) {
    for (const k of Object.keys(S.vacs)) {
      const v = S.vacs[k];
      const [c, r] = k.split(',').map(Number);
      const vx = c * 16 + 8, vy = r * 16 + 8;
      v.cd -= dt;
      if (v.cd <= 0 && v.hold.length < ECON.vacHold) {
        const R = vacR();
        let best = null, bd = 1e9;
        for (const e of S.eggs) {
          if (e.suck) continue;
          const d = Math.hypot(e.x - vx, e.y - vy);
          if (d < R && d < bd) { best = e; bd = d; }
        }
        if (best) { best.suck = k; v.cd = vacInterval(); }
        /* plumes get slurped instantly (they're light) */
        for (let i = S.plumes.length - 1; i >= 0; i--) {
          const pl = S.plumes[i];
          if (Math.hypot(pl.x - vx, pl.y - vy) < R) { collectPlume(pl); emit('plume', { auto: true }); }
        }
      }
      if (v.hold.length) {
        const [dx, dy] = DIRV[v.dir];
        const nk = key(c + dx, r + dy);
        if (S.belts[nk]) {
          const px = (c + dx) * 16 + 8 - dx * 5, py = (r + dy) * 16 + 8 - dy * 5;
          const blocked = S.items.some(it => Math.hypot(it.x - px, it.y - py) < 8);
          if (!blocked) {
            const e = v.hold.shift();
            S.items.push({ tier: e.tier, golden: e.golden, rainbow: e.rainbow, x: px, y: py });
          }
        }
      }
    }
  }

  /* ---------- belts ---------- */
  function beltDirFor(c, r, item) {
    const b = S.belts[key(c, r)];
    if (b) return b.dir;
    const so = S.sorters[key(c, r)];
    if (so) {
      const rare = item.tier >= (so.thr === undefined ? ECON.sorterRare : so.thr);
      return rare ? so.dir : (so.dir + 1) % 4;   /* commons peel off to the side */
    }
    return null;
  }
  function tickBelts(dt) {
    const spd = beltSpeed();
    for (let i = S.items.length - 1; i >= 0; i--) {
      const it = S.items[i];
      const c = Math.floor(it.x / 16), r = Math.floor(it.y / 16);
      const dir = beltDirFor(c, r, it);
      if (dir === null) { dropItem(i); continue; }
      const [dx, dy] = DIRV[dir];
      let stalled = false;
      for (const o of S.items) {
        if (o === it) continue;
        const rx = o.x - it.x, ry = o.y - it.y;
        const ahead = rx * dx + ry * dy;
        if (ahead > 0 && ahead < 8 && Math.abs(rx * dy - ry * dx) < 7) { stalled = true; break; }
      }
      if (stalled) continue;
      const nx = it.x + dx * spd * dt, ny = it.y + dy * spd * dt;
      const nc = Math.floor(nx / 16), nr = Math.floor(ny / 16);
      if (nc === c && nr === r) { it.x = nx; it.y = ny; continue; }
      const target = occ[key(nc, nr)];
      if (target && (target.type === 'belt' || target.type === 'sorter')) { it.x = nx; it.y = ny; continue; }
      if (target && target.type === 'incubator') {
        const inc = S.incs[target.k];
        if (inc.queue.length < incCap()) {
          inc.queue.push({ tier: it.tier, golden: it.golden, rainbow: it.rainbow });
          S.items.splice(i, 1);
        }
        continue;
      }
      if (target && target.type === 'silo') {
        const silo = S.silos[target.k];
        if (silo.store.length < ECON.siloCap) {
          silo.store.push({ tier: it.tier, golden: it.golden, rainbow: it.rainbow });
          S.items.splice(i, 1);
        }
        continue;
      }
      if (ny >= WORLD.roadY) {
        const th = WORLD.truckHome;
        if (S.truck.state === 'parked' && nx > th.x - 6 && nx < th.x + th.w + 6) {
          if (S.truck.load.length < truckCap()) {
            S.truck.load.push({ tier: it.tier, golden: it.golden, rainbow: it.rainbow });
            S.items.splice(i, 1);
            emit('truckload', {});
          }
          continue;
        }
        dropItem(i); continue;
      }
      dropItem(i);
    }
    function dropItem(i) {
      const it = S.items[i];
      S.items.splice(i, 1);
      spawnEgg(it.x, Math.min(WORLD.roadY - 6, it.y), it.tier, it.golden, it.rainbow);
    }
  }

  /* ---------- blowers: shove loose eggs along the grass ---------- */
  function tickBlowers(dt) {
    for (const k of Object.keys(S.blowers)) {
      const b = S.blowers[k];
      const [c, r] = k.split(',').map(Number);
      const bx = c * 16 + 8, by = r * 16 + 8;
      const [dx, dy] = DIRV[b.dir];
      const R = ECON.blowerR * (lvl('overclock') ? 1.35 : 1);
      for (const e of S.eggs) {
        if (e.suck) continue;
        const ox = e.x - bx, oy = e.y - by;
        const along = ox * dx + oy * dy;
        const side = Math.abs(ox * dy - oy * dx);
        if (along < -4 || along > R || side > 12) continue;
        const push = ECON.blowerPush * (1 - along / R) * dt;
        e.x += dx * push;
        e.y += dy * push + (Math.random() - 0.5) * 6 * dt;
        e.x = Math.max(6, Math.min(WORLD.W - 6, e.x));
        e.y = Math.max(20, Math.min(WORLD.roadY - 6, e.y));
      }
    }
  }

  /* ---------- silos: buffer eggs and feed the parked truck ---------- */
  function tickSilos(dt) {
    for (const k of Object.keys(S.silos)) {
      const silo = S.silos[k];
      silo.t = (silo.t || 0) + dt;
      const rate = 3 * (lvl('overclock') ? 2 : 1);
      while (silo.store.length && S.truck.state === 'parked' && S.truck.load.length < truckCap() && silo.t > 1 / rate) {
        silo.t -= 1 / rate;
        S.truck.load.push(silo.store.shift());
        emit('truckload', {});
      }
      if (!silo.store.length || S.truck.state !== 'parked') silo.t = Math.min(silo.t, 1 / rate);
    }
  }

  /* ---------- incubators ---------- */
  /* ---------- incubators ---------- */
  function tickIncs(dt) {
    for (const k of Object.keys(S.incs)) {
      const inc = S.incs[k];
      if (!inc.queue.length) { inc.prog = 0; continue; }
      const egg = inc.queue[0];
      inc.prog += dt;
      if (inc.prog >= incHatchTime(egg.tier, egg.rainbow)) {
        if (S.chickens.length >= chickenCap()) continue;
        inc.queue.shift();
        inc.prog = 0;
        const [c, r] = k.split(',').map(Number);
        hatchChicken(egg.tier, c * 16 + 16, r * 16 + 36, egg.rainbow);
      }
    }
  }

  /* ---------- love nests (breeding) ---------- */
  function tickNests(dt) {
    for (const k of Object.keys(S.nests)) {
      const nest = S.nests[k];
      nest.cd = Math.max(0, (nest.cd || 0) - dt);
      if (!(nest.slots[0] && nest.slots[1])) continue;
      const a = SPECIES[nest.slots[0].sp], b = SPECIES[nest.slots[1].sp];
      let need = breedTime();
      if (a.id === b.id) need *= 0.6;
      nest.prog += dt;
      if (nest.prog < need) continue;
      /* breeding complete! */
      const [c, r] = k.split(',').map(Number);
      const x = c * 16 + 16, y = r * 16 + 36;
      let tier = Math.max(a.tier, b.tier);
      let rainbow = false;
      if (a.tier >= 7 && b.tier >= 7 && Math.random() < rainbowChance()) rainbow = true;
      else {
        let up = breedUp();
        if (a.tier === b.tier && a.id !== b.id) up += 0.10;
        if (tier < TIERS.length - 2 && Math.random() < up) tier++;
      }
      const lay = n => {
        const egg = spawnEgg(x + (Math.random() * 20 - 10), y, rainbow ? 7 : tier, false, rainbow);
        if (egg && rainbow) egg.tier = TIERS.length - 1;   /* rainbow eggs are Secret tier */
        return egg;
      };
      lay();
      if (Math.random() < 0.10 * lvl('twindate')) lay();
      S.stats.bred++;
      /* parents hop back out */
      spawnChicken(a.id, x - 14, y - 4);
      spawnChicken(b.id, x + 8, y - 2);
      nest.slots = [null, null];
      nest.prog = 0;
      nest.cd = ECON.breedCd;
      emit('breed', { x, y, rainbow, tier: rainbow ? TIERS.length - 1 : tier });
    }
  }

  /* removing a chicken from a love nest slot (tap it out) */
  function ejectNest(k) {
    const nest = S.nests[k];
    if (!nest) return false;
    const [c, r] = k.split(',').map(Number);
    let any = false;
    nest.slots.forEach((s, i) => {
      if (s) { spawnChicken(s.sp, c * 16 + i * 18, r * 16 + 34); nest.slots[i] = null; any = true; }
    });
    nest.prog = 0;
    return any;
  }

  /* ============================================================
     STAFF - hired farmhands and robots
     ============================================================ */
  function staffSlots() {
    return ECON.staffBaseSlots + ECON.hutSlots * Object.keys(S.huts).length + 2 * lvl('crewcap');
  }
  function staffSpeed() { return ECON.staffSpeed * (1 + 0.20 * lvl('crewspeed')); }
  function wageMult() { return Math.pow(0.88, lvl('wages')); }
  function wagePerSec() {
    return S.staff.reduce((a, w) => a + STAFF[w.type].wage, 0) * wageMult();
  }
  function staffHireCost(type) { return staffCost(type, S.hired[type] || 0); }
  function canHire(type) {
    const def = STAFF[type];
    if (!def) return false;
    if (def.needs && !lvl(def.needs)) return false;
    if (!Object.keys(S.huts).length) return false;
    return S.staff.length < staffSlots();
  }
  function hireStaff(type) {
    if (!canHire(type)) return false;
    const cost = staffHireCost(type);
    if (S.coins < cost) return false;
    S.coins -= cost;
    S.hired[type] = (S.hired[type] || 0) + 1;
    note('hire', 'Hired a ' + STAFF[type].name + '.');
    const hutK = Object.keys(S.huts)[0].split(',').map(Number);
    S.staff.push({
      id: nextId++, type,
      x: hutK[0] * 16 + 8 + Math.random() * 12, y: hutK[1] * 16 + 26,
      dir: 1, frame: 0, anim: 0, state: 'idle', t: 0, carry: [], target: null, say: 0,
    });
    emit('hire', { type });
    return true;
  }
  function fireStaff(id) {
    const i = S.staff.findIndex(w => w.id === id);
    if (i === -1) return false;
    const w = S.staff[i];
    w.carry.forEach(e => spawnEgg(w.x, w.y + 8, e.tier, e.golden, e.rainbow));
    S.staff.splice(i, 1);
    S.hired[w.type] = Math.max(0, (S.hired[w.type] || 1) - 1);
    return true;
  }

  /* chickens can be flagged for the Cull-Bot */
  function markChicken(ch, on) {
    ch.marked = on === undefined ? !ch.marked : !!on;
    return ch.marked;
  }
  function retireChicken(ch) {
    const i = S.chickens.indexOf(ch);
    if (i === -1) return 0;
    const sp = SPECIES[ch.sp];
    S.chickens.splice(i, 1);
    const f = Math.max(1, Math.ceil(featherFor(sp.tier, false) * ECON.cullReward));
    dropPlumes(ch.x + 10, ch.y + 12, f);
    S.stats.culled++;
    emit('cull', { sp, x: ch.x + 10, y: ch.y, feathers: f });
    return f;
  }

  function walkTo(w, tx, ty, dt) {
    const dx = tx - w.x, dy = ty - w.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const sp = staffSpeed() * dt;
    w.dir = dx > 0 ? 1 : -1;
    let nx = w.x + (dx / d) * sp, ny = w.y + (dy / d) * sp;
    if (inPond(nx + 6, ny + 8)) ny = w.y;           /* walk around the pond */
    w.x = Math.max(4, Math.min(WORLD.W - 12, nx));
    w.y = Math.max(16, Math.min(WORLD.H - 16, ny));
    w.anim += sp;
    if (w.anim > 5) { w.anim = 0; w.frame ^= 1; }
    return false;
  }
  function nearest(list, x, y, ok) {
    let best = null, bd = 1e9;
    for (const o of list) {
      if (ok && !ok(o)) continue;
      const d = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function buildingSpots(map, ok) {
    return Object.keys(map).filter(k => !ok || ok(map[k], k)).map(k => {
      const [c, r] = k.split(',').map(Number);
      return { k, x: c * 16 + 16, y: r * 16 + 34 };
    });
  }

  function tickStaff(dt) {
    /* wages first */
    const due = wagePerSec() * dt;
    if (due > 0) {
      if (S.coins >= due) { S.coins -= due; S.stats.wagesPaid += due; S.unpaid = false; }
      else { S.coins = 0; S.unpaid = true; }
    } else S.unpaid = false;

    const carryCap = ECON.staffCarry + 2 * lvl('crewcap');
    for (const w of S.staff) {
      w.t -= dt;
      w.say = Math.max(0, w.say - dt);
      if (S.unpaid) { w.state = 'idle'; continue; }

      if (w.type === 'hand') {
        if (w.carry.length < carryCap && S.eggs.length) {
          const e = nearest(S.eggs, w.x, w.y, o => !o.suck);
          if (e) {
            if (walkTo(w, e.x - 6, e.y - 10, dt)) {
              const i = S.eggs.indexOf(e);
              if (i >= 0) {
                S.eggs.splice(i, 1);
                w.carry.push({ tier: e.tier, golden: e.golden, rainbow: e.rainbow });
                S.stats.collected++;
                S.stats.staffEggs++;
                emit('staffpick', { w });
              }
            }
            w.state = 'walk';
            continue;
          }
        }
        if (w.carry.length) {
          const spots = buildingSpots(S.silos, s => s.store.length < ECON.siloCap)
            .concat(buildingSpots(S.incs, inc => inc.queue.length < incCap()));
          if (S.truck.state === 'parked' && S.truck.load.length < truckCap()) {
            spots.push({ k: 'truck', x: WORLD.truckHome.x + 26, y: WORLD.truckHome.y - 10 });
          }
          const spot = nearest(spots, w.x, w.y);
          if (spot) {
            w.state = 'walk';
            if (walkTo(w, spot.x - 6, spot.y - 10, dt)) {
              while (w.carry.length) {
                const e = w.carry.pop();
                if (spot.k === 'truck') {
                  if (S.truck.load.length < truckCap()) S.truck.load.push(e);
                  else { spawnEgg(w.x + 4, w.y + 10, e.tier, e.golden, e.rainbow); }
                } else if (S.silos[spot.k]) {
                  if (S.silos[spot.k].store.length < ECON.siloCap) S.silos[spot.k].store.push(e);
                  else spawnEgg(w.x + 4, w.y + 10, e.tier, e.golden, e.rainbow);
                } else if (S.incs[spot.k]) {
                  if (S.incs[spot.k].queue.length < incCap()) S.incs[spot.k].queue.push(e);
                  else spawnEgg(w.x + 4, w.y + 10, e.tier, e.golden, e.rainbow);
                }
              }
              emit('staffdrop', { w });
            }
            continue;
          }
        }
        w.state = 'idle';
        continue;
      }

      if (w.type === 'feeder') {
        if (!w.target || w.t <= 0) {
          const ch = S.chickens.length ? S.chickens[Math.floor(Math.random() * S.chickens.length)] : null;
          w.target = ch ? { x: ch.x + 8, y: ch.y + 14 } : null;
          w.t = 7;
        }
        if (w.target) {
          w.state = 'walk';
          if (walkTo(w, w.target.x, w.target.y, dt)) {
            for (let i = 0; i < 4; i++) {
              S.feed.push({ x: w.x + 6 + (Math.random() * 20 - 10), y: w.y + 12 + (Math.random() * 12 - 6), n: 1 });
            }
            if (S.feed.length > 80) S.feed.splice(0, S.feed.length - 80);
            emit('stafffeed', { w });
            w.target = null;
            w.t = 4;
            w.state = 'work';
          }
        } else w.state = 'idle';
        continue;
      }

      if (w.type === 'cull') {
        const ch = nearest(S.chickens, w.x, w.y, o => o.marked);
        if (ch) {
          w.state = 'walk';
          if (walkTo(w, ch.x + 2, ch.y + 4, dt)) { retireChicken(ch); w.t = 0.6; w.state = 'work'; }
        } else w.state = 'idle';
        continue;
      }

      if (w.type === 'match') {
        const nestSpots = buildingSpots(S.nests, n => n.slots.filter(Boolean).length < 2 && n.cd <= 0);
        if (!nestSpots.length) { w.state = 'idle'; w.carry = []; continue; }
        const nest = nearest(nestSpots, w.x, w.y);
        if (!w.hold) {
          const ch = nearest(S.chickens, w.x, w.y, o => !o.marked);
          if (!ch) { w.state = 'idle'; continue; }
          w.state = 'walk';
          if (walkTo(w, ch.x + 2, ch.y + 4, dt)) {
            const i = S.chickens.indexOf(ch);
            if (i >= 0) { S.chickens.splice(i, 1); w.hold = { sp: ch.sp }; }
          }
        } else {
          w.state = 'walk';
          if (walkTo(w, nest.x - 8, nest.y - 8, dt)) {
            const n = S.nests[nest.k];
            const slot = n.slots[0] ? 1 : 0;
            if (!n.slots[slot] && n.cd <= 0) {
              n.slots[slot] = { sp: w.hold.sp };
              if (n.slots[0] && n.slots[1]) n.prog = 0.0001;
              w.hold = null;
              emit('staffmatch', { w });
            } else {
              spawnChicken(w.hold.sp, w.x, w.y);
              w.hold = null;
            }
          }
        }
        continue;
      }
    }
  }

  /* live production readouts for the inspect panel */
  function rates() {
    let eggsPerMin = 60 / layTime(S.mamaTier);
    S.chickens.forEach(ch => { eggsPerMin += 60 / layTime(SPECIES[ch.sp].tier) * (ch.buffT > 0 ? 2 : 1); });
    let value = 0, n = 0;
    S.chickens.forEach(ch => { value += eggValue(SPECIES[ch.sp].tier, false); n++; });
    const avg = n ? value / n : eggValue(S.mamaTier, false);
    return {
      eggsPerMin,
      coinsPerMin: eggsPerMin * avg,
      wagePerSec: wagePerSec(),
      staff: S.staff.length,
      slots: staffSlots(),
      stored: Object.values(S.silos).reduce((a, s) => a + s.store.length, 0),
    };
  }

  /* ============================================================
     SPECIAL DUCKS + QUESTS
     ============================================================ */
  function duckSpot() {
    const p = WORLD.pond;
    return { x: p.x + p.w + 10, y: p.y + p.h - 4 };
  }
  function pickDuck() {
    const unseen = DUCKS.filter(d => !S.duckMet.includes(d.id));
    const pool = unseen.length ? unseen : DUCKS;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function rollQuest(duckId) {
    const q = QUESTS[Math.floor(Math.random() * QUESTS.length)];
    const scale = questScale(S.questsDone);
    const need = Math.max(1, Math.round(q.base * scale));
    const mult = 1 + S.questsDone * 0.5 + ownedPlots() * 0.4;
    return {
      duckId, type: q.id, stat: q.stat, need,
      base: S.stats[q.stat] || 0,
      coins: Math.round(ECON.questCoins * mult * tycoon()),
      feathers: Math.round(ECON.questFeathers * mult),
    };
  }
  function questProgress() {
    if (!S.quest) return 0;
    return Math.max(0, (S.stats[S.quest.stat] || 0) - S.quest.base);
  }
  function questDone() { return !!S.quest && questProgress() >= S.quest.need; }
  function questText() {
    if (!S.quest) return '';
    const q = QUESTS.find(x => x.id === S.quest.type);
    return q ? q.text(S.quest.need) : '';
  }
  function acceptQuest() {
    if (!S.duck || S.quest) return false;
    S.quest = rollQuest(S.duck.id);
    S.duck.state = 'waiting';
    note('quest', DUCKS[S.duck.id].name + ' asked for help: ' + questText());
    emit('quest', { kind: 'accept' });
    return true;
  }
  function turnInQuest() {
    if (!S.duck || !S.quest || !questDone()) return null;
    const d = DUCKS[S.duck.id];
    const reward = { coins: S.quest.coins, feathers: S.quest.feathers };
    S.coins += reward.coins;
    dropPlumes(S.duck.x + 4, S.duck.y + 10, reward.feathers);
    S.questsDone++;
    if (!S.duckMet.includes(d.id)) S.duckMet.push(d.id);
    note('duck', 'Helped ' + d.name + '. ' + d.bye, null);
    S.quest = null;
    S.duck.state = 'leaving';
    S.duck.t = 3;
    S.duckCd = ECON.duckCooldown;
    mark('pedia');
    emit('quest', { kind: 'reward', duck: d, reward });
    return reward;
  }
  function dismissDuck() {
    if (!S.duck) return;
    S.duck.state = 'leaving';
    S.duck.t = 2;
    S.duckCd = ECON.duckCooldown;
  }
  function tickDucks(dt) {
    S.dayT += dt;
    if (S.dayT > 300) { S.dayT -= 300; S.day++; }
    if (S.duck) {
      const d = S.duck;
      d.anim = (d.anim || 0) + dt;
      if (d.state === 'arriving') {
        const goal = duckSpot();
        const dx = goal.x - d.x, dy = goal.y - d.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2) { d.state = 'idle'; d.t = ECON.duckStay; }
        else { d.x += (dx / dist) * 18 * dt; d.y += (dy / dist) * 18 * dt; }
      } else if (d.state === 'leaving') {
        d.t -= dt;
        d.x += 26 * dt;
        if (d.t <= 0) S.duck = null;
      } else {
        d.t -= dt;
        if (d.t <= 0 && !S.quest) { d.state = 'leaving'; d.t = 3; S.duckCd = ECON.duckCooldown; }
      }
      return;
    }
    S.duckCd -= dt;
    if (S.duckCd <= 0 && S.stats.laid > 3) {
      const d = pickDuck();
      const goal = duckSpot();
      S.duck = { id: d.id, x: goal.x + 70, y: goal.y - 6, state: 'arriving', t: 0, anim: 0 };
      emit('duckarrive', { duck: d });
    }
  }

  /* ---------- building ---------- */
  function build(type, c, r, dir) {
    const cost = buildCost(type, S.built[type]);
    if (S.coins < cost || !canPlace(type, c, r)) return false;
    S.coins -= cost;
    S.built[type]++;
    const k = key(c, r);
    if (type === 'belt') S.belts[k] = { dir: dir || 0 };
    else if (type === 'vacuum') S.vacs[k] = { dir: dir || 0, hold: [], cd: 0 };
    else if (type === 'incubator') S.incs[k] = { queue: [], prog: 0 };
    else if (type === 'lovenest') S.nests[k] = { slots: [null, null], prog: 0, cd: 0 };
    else if (type === 'staffhut') S.huts[k] = { built: Date.now() };
    else if (type === 'silo') S.silos[k] = { store: [], t: 0 };
    else if (type === 'blower') S.blowers[k] = { dir: dir || 0 };
    else if (type === 'sorter') S.sorters[k] = { dir: dir || 0, thr: ECON.sorterRare };
    else if (type === 'fence') S.fences[k] = { style: 0 };
    rebuildOcc();
    mark('build');
    return true;
  }
  function setBeltDir(c, r, dir) { const b = S.belts[key(c, r)]; if (b) b.dir = dir; }
  function demolish(c, r) {
    const o = occ[key(c, r)];
    if (!o) return false;
    const k = o.k;
    const [kc, kr] = k.split(',').map(Number);
    if (o.type === 'belt') { delete S.belts[k]; S.built.belt = Math.max(0, S.built.belt - 1); }
    else if (o.type === 'vacuum') {
      S.vacs[k].hold.forEach(e => spawnEgg(kc * 16 + 8, kr * 16 + 10, e.tier, e.golden, e.rainbow));
      delete S.vacs[k]; S.built.vacuum = Math.max(0, S.built.vacuum - 1);
    } else if (o.type === 'incubator') {
      if (k === WORLD.starterInc.join(',')) return false;   /* the starter one stays */
      S.incs[k].queue.forEach(e => spawnEgg(kc * 16 + 12 + Math.random() * 8, kr * 16 + 20, e.tier, e.golden, e.rainbow));
      delete S.incs[k]; S.built.incubator = Math.max(0, S.built.incubator - 1);
    } else if (o.type === 'lovenest') {
      ejectNest(k);
      delete S.nests[k]; S.built.lovenest = Math.max(0, S.built.lovenest - 1);
    } else if (o.type === 'staffhut') {
      delete S.huts[k]; S.built.staffhut = Math.max(0, S.built.staffhut - 1);
      while (S.staff.length > staffSlots()) fireStaff(S.staff[S.staff.length - 1].id);
    } else if (o.type === 'silo') {
      S.silos[k].store.slice(0, 40).forEach((e, i) =>
        spawnEgg(kc * 16 + 6 + (i % 8) * 3, kr * 16 + 30, e.tier, e.golden, e.rainbow));
      delete S.silos[k]; S.built.silo = Math.max(0, S.built.silo - 1);
    } else if (o.type === 'blower') {
      delete S.blowers[k]; S.built.blower = Math.max(0, S.built.blower - 1);
    } else if (o.type === 'sorter') {
      delete S.sorters[k]; S.built.sorter = Math.max(0, S.built.sorter - 1);
    } else if (o.type === 'fence') {
      delete S.fences[k]; S.built.fence = Math.max(0, S.built.fence - 1);
    }
    S.coins += BUILDS[o.type].refund;
    S.eggs.forEach(e => { if (e.suck === k) e.suck = null; });
    rebuildOcc();
    mark('build');
    return true;
  }

  /* ---------- skills & mama ---------- */
  function buySkill(id) {
    const sk = SKILL_BY_ID[id];
    if (!sk || id === 'root') return false;
    const cur = lvl(id);
    if (cur >= sk.max) return false;
    const pre = skillPrereq(sk);
    if (pre && lvl(pre.id) < 1) return false;
    const cost = skillCost(sk, cur);
    if (S.feathers < cost) return false;
    S.feathers -= cost;
    S.sk[id] = cur + 1;
    mark('skills', 'build');
    return true;
  }
  function upgradeMama() {
    if (S.mamaTier >= TIERS.length - 2) return false;    /* mama tops out at Divine */
    const cost = ECON.mamaCost(S.mamaTier);
    if (S.coins < cost) return false;
    S.coins -= cost;
    S.mamaTier++;
    note('mama', 'Mama Hen became a ' + TIERS[S.mamaTier].n + ' layer.');
    return true;
  }

  /* ---------- master tick ---------- */
  function tick(dt) {
    S.mama.petCd = Math.max(0, S.mama.petCd - dt);
    S.mama.lay -= dt;
    if (S.mama.lay <= 0) {
      S.mama.lay = layTime(S.mamaTier);
      layEgg(WORLD.mama.x, WORLD.mama.y + 10, S.mamaTier, false);
    }
    S.chickens.forEach(ch => tickChicken(ch, dt));
    tickEggs(dt);
    tickVacs(dt);
    tickBlowers(dt);
    tickBelts(dt);
    tickSilos(dt);
    tickStaff(dt);
    tickIncs(dt);
    tickNests(dt);
    tickTruck(dt);
    tickDucks(dt);
  }

  /* ---------- offline ---------- */
  function applyOffline() {
    const now = Date.now();
    let dt = (now - (S.last || now)) / 1000;
    S.last = now;
    if (dt < 30) { tick(Math.min(2, Math.max(0, dt))); return null; }
    dt = Math.min(dt, ECON.offlineCapHrs * 3600);
    let laid = 0, hatched = 0, pay = 0, feathersGot = 0;
    const layers = [{ tier: S.mamaTier, x: WORLD.mama.x, y: WORLD.mama.y + 10 }]
      .concat(S.chickens.map(ch => ({ tier: SPECIES[ch.sp].tier, x: ch.x + 10, y: ch.y + 14 })));
    for (const L of layers) {
      const n = Math.floor(dt / layTime(L.tier));
      for (let i = 0; i < n && S.eggs.length < ECON.groundEggCap; i++) {
        if (layEgg(L.x + (Math.random() * 80 - 40), L.y + (Math.random() * 50 - 25), L.tier, false)) laid++;
      }
    }
    for (const k of Object.keys(S.incs)) {
      const inc = S.incs[k];
      let budget = dt + inc.prog;
      inc.prog = 0;
      while (inc.queue.length && S.chickens.length < chickenCap()) {
        const egg = inc.queue[0];
        const need = incHatchTime(egg.tier, egg.rainbow);
        if (budget < need) { inc.prog = budget; break; }
        budget -= need;
        inc.queue.shift();
        const before = S.feathers;
        const pcount = S.plumes.length;
        const [c, r] = k.split(',').map(Number);
        hatchChicken(egg.tier, c * 16 + 16, r * 16 + 36, egg.rainbow);
        /* auto-collect plumes dropped while away */
        while (S.plumes.length > pcount) feathersGot += collectPlume(S.plumes[S.plumes.length - 1]);
        feathersGot += S.feathers - before;
        hatched++;
      }
    }
    if (S.truck.state === 'away') {
      pay = truckPayout();
      S.coins += pay; S.stats.coinsEarned += pay; S.stats.sold += S.truck.load.length;
      S.truck.load = []; S.truck.state = 'parked';
    }
    S.eggs.forEach(e => { e.z = 0; e.vz = 0; });
    return { seconds: dt, laid, hatched, pay, feathersGot };
  }

  /* ---------- save / load ---------- */
  function save() {
    try {
      /* anything in hand goes back to the world first */
      if (S.held) {
        if (S.held.kind === 'chicken') { S.chickens.push(S.held.ch); }
        else spawnEgg(WORLD.mama.x + 20, WORLD.mama.y + 10, S.held.egg.tier, S.held.egg.golden, S.held.egg.rainbow);
        S.held = null;
      }
      S.last = Date.now();
      const slim = JSON.parse(JSON.stringify(S));
      slim.eggs.forEach(e => { e.x = Math.round(e.x); e.y = Math.round(e.y); e.z = 0; e.vz = 0; e.suck = null; });
      slim.chickens.forEach(c => { c.x = Math.round(c.x); c.y = Math.round(c.y); c.target = null; });
      slim.items.forEach(i => { i.x = Math.round(i.x); i.y = Math.round(i.y); });
      slim.plumes.forEach(p => { p.x = Math.round(p.x); p.y = Math.round(p.y); p.z = 0; });
      slim.staff.forEach(w => { w.x = Math.round(w.x); w.y = Math.round(w.y); w.target = null; });
      localStorage.setItem(SAVE_KEY, JSON.stringify(slim));
      return true;
    } catch (e) { return false; }
  }
  function ensureStarterInc() {
    const k = WORLD.starterInc.join(',');
    if (!S.incs[k]) S.incs[k] = { queue: [], prog: 0 };
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { ensureStarterInc(); rebuildOcc(); return false; }
      const d = JSON.parse(raw);
      if (!d || d.v !== 3) { ensureStarterInc(); rebuildOcc(); return false; }
      S = Object.assign(freshState(), d);
      S.truck = Object.assign({ state: 'parked', t: 0, load: [] }, d.truck);
      S.held = null;
      S.chickens.forEach(c => { c.target = null; c.state = 'idle'; c.t = Math.random(); });
      S.staff = (S.staff || []).map(w => Object.assign({ carry: [], frame: 0, anim: 0, say: 0 }, w, { target: null, state: 'idle' }));
      S.hired = Object.assign({ hand: 0, feeder: 0, cull: 0, match: 0 }, S.hired);
      ['huts', 'silos', 'blowers', 'sorters', 'fences'].forEach(m => { if (!S[m]) S[m] = {}; });
      if (!Array.isArray(S.diary)) S.diary = [];
      if (!Array.isArray(S.duckMet)) S.duckMet = [];
      if (typeof S.day !== 'number') { S.day = 1; S.dayT = 0; }
      if (typeof S.duckCd !== 'number') S.duckCd = ECON.duckCooldown;
      Object.values(S.silos).forEach(si => { if (!si.store) si.store = []; });
      ensureStarterInc();
      nextId = 1 + Math.max(0, ...S.eggs.map(e => e.id || 0), ...S.chickens.map(c => c.id || 0), ...S.plumes.map(p => p.id || 0));
      rebuildOcc();
      clampCam();
      return true;
    } catch (e) { ensureStarterInc(); rebuildOcc(); return false; }
  }
  function reset() {
    S = freshState();
    nextId = 1;
    ensureStarterInc();
    rebuildOcc();
    clampCam();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    mark('skills', 'pedia', 'build', 'ground');
  }

  /* ---------- formatting ---------- */
  const UNITS = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi'];
  function fmt(n) {
    n = Math.floor(n);
    if (n < 1000) return String(n);
    let u = 0, v = n;
    while (v >= 1000 && u < UNITS.length - 1) { v /= 1000; u++; }
    return (v >= 100 ? Math.floor(v) : v.toFixed(1).replace(/\.0$/, '')) + UNITS[u];
  }
  function fmtTime(sec) {
    sec = Math.ceil(sec);
    if (sec < 60) return sec + 's';
    const m = Math.floor(sec / 60), s = sec % 60;
    if (m < 60) return m + 'm' + (s ? s + 's' : '');
    const h = Math.floor(m / 60);
    return h + 'h' + (m % 60 ? (m % 60) + 'm' : '');
  }

  ensureStarterInc();
  rebuildOcc();
  clampCam();

  return {
    get S() { return S; },
    WORLD, dirty, mark, on, lvl, disc, ownedPlots,
    eggValue, layTime, petCd, incHatchTime, chickenCap, incCap, basketCap,
    scoopR, vacR, vacInterval, beltSpeed, truckCap, tripTime,
    mutationChance, goldenChance, mamaCost: () => ECON.mamaCost(S.mamaTier),
    breedTime, breedUp, rainbowChance, featherFor, truckPayout,
    plotAt, inOwned, inPond, inStation, ownedBounds, clampCam,
    tileBuildable, canPlace, occAt: (c, r) => occ[key(c, r)],
    buyPlot, petMama, petChicken, grabChicken, grabEgg, dropHeld, hitTruck,
    scoopEgg, collectPlume, basketToTruck, basketToInc, basketToGround, sprinkleFeed,
    sendTruck, build, demolish, setBeltDir, ejectNest, buySkill, upgradeMama,
    staffSlots, wagePerSec, staffHireCost, canHire, hireStaff, fireStaff,
    markChicken, retireChicken, rates, beltDirFor,
    duckSpot, questProgress, questDone, questText, acceptQuest, turnInQuest, dismissDuck, note,
    tick, applyOffline, save, load, reset, fmt, fmtTime,
  };
})();
