/* ============================================================
   INF EGG CO. v4 - world model: a twelve-plot valley, hand
   tools, feather plumes, breeding, incubator-only hatching,
   and a crew you recruit with flyers.
   World units are virtual pixels; the UI scales them up 3x.
   ============================================================ */
'use strict';

const SAVE_KEY = 'infEggCoSave_v6';

/* the world: 4x3 plots of 16x13 tiles = 64x39 tiles = 1024x624 px */
const WORLD = {
  T: 16, COLS: 64, ROWS: 39,
  W: 1024, H: 624,
  roadY: 592,                                /* road rows 37-38, bottom plots only */
  view: { w: 384, h: 208 },                  /* camera viewport */
  mama: { x: 118, y: 480 },
  pond: { x: 180, y: 434, w: 56, h: 28 },
  truckHome: { x: 150, y: 588, w: 56, h: 32 },
  stations: {
    lab:      { x: 18,  y: 430, w: 30, h: 32 },   /* the Lab, home of EGGOS */
    stand:    { x: 56,  y: 436, w: 16, h: 24 },   /* the Index bookstand */
    mamaSign: { x: 88,  y: 458, w: 14, h: 20 },   /* upgrade-mama signpost */
    depot:    { x: 216, y: 562, w: 16, h: 26 },   /* the road sign: vehicles and routes */
  },
  starterInc: [3, 31],                      /* prebuilt incubator anchor tile */
};

const GAME = (() => {

  /* ---------- state ---------- */
  let nextId = 1;
  function freshState() {
    const plots = PLOTS.map(p => p.id === PLOT_START);
    return {
      v: 6,
      coins: 0, feathers: 0,
      plots,
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
      hatchers: {}, splitters: {}, loaders: {},
      barns: {}, troughs: {}, wells: {}, sprinklers: {}, mills: {}, coops: {}, boards: {}, hqs: {},
      soil: {},              /* "c,r" -> {crop, growth, water, seed} tilled ground */
      terrain: {},           /* "c,r" -> {t:'path'|'stone'|'high'|'water', seed} shaped ground */
      deco: {},              /* "c,r" -> {kind, seed} things planted for the look of them */
      feedStore: 6,          /* pellets in the barn, ready to scatter */
      seeds: { clover: 6, wheat: 4 },
      vehicle: 0,            /* index into VEHICLES - you start on a bike */
      routes: ['hamlet'],    /* cities you can deliver to */
      route: 'hamlet',       /* where the next load goes */
      staff: [],             /* the crew: procedural people and robots */
      applicants: [],        /* folk who answered a flyer, waiting at the hut */
      flyer: null,           /* {t, need, n} a campaign in progress */
      flyerRuns: 0,          /* how many campaigns you have paid for */
      bots: { cull: 0, match: 0 },
      autoMark: -1,          /* auto-mark chickens below this tier (-1 = off) */
      unpaid: false,
      diary: [],             /* {day, kind, text, sp} */
      day: 1, dayT: 0,
      seenTitle: false,
      items: [],             /* eggs riding belts */
      truck: { state: 'parked', t: 0, load: [] },
      built: { incubator: 0, vacuum: 0, belt: 0, lovenest: 0, staffhut: 0, silo: 0,
               blower: 0, sorter: 0, fence: 0, hatchery: 0, splitter: 0, loader: 0,
               barn: 0, trough: 0, well: 0, sprinkler: 0, mill: 0, coop: 0, board: 0, hq: 0 },
      disc: [], sk: { root: 1 },
      cam: { x: 0, y: WORLD.H - 208 },
      stats: { pets: 0, laid: 0, collected: 0, sold: 0, coinsEarned: 0, hatched: 0, mutations: 0,
               bred: 0, plumes: 0, culled: 0, wagesPaid: 0, staffEggs: 0, hired: 0, flyers: 0,
               planted: 0, harvested: 0, feedMade: 0, grown: 0, trips: 0, shaped: 0, planted2: 0 },
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
  function chickenCap() {
    return ECON.baseChickenCap + 4 * lvl('flock') + 10 * lvl('coops') + 6 * Object.keys(S.coops).length
         + ECON.capPerPlot * (ownedPlots() - 1);
  }
  function feedCap() { return ECON.baseFeedCap + ECON.barnCap * Object.keys(S.barns).length; }
  function vehicle() { return VEHICLES[Math.min(S.vehicle, VEHICLES.length - 1)]; }
  function city() { return CITY_BY_ID[S.route] || CITIES[0]; }
  function mamaLayTime() { return layTime(S.mamaTier) * ECON.mamaLayMult; }
  function incCap() { return 6 + 3 * lvl('inccap'); }
  function basketCap() { return ECON.baseBasketCap + 8 * lvl('basket1') + 16 * lvl('basket2'); }
  function scoopR() { return ECON.baseScoopR + 12 * lvl('magnet'); }
  function vacR() { return ECON.baseVacR + 8 * lvl('vacradius'); }
  function vacInterval() { return ECON.vacInterval / (1 + 0.25 * lvl('vacspeed')) / overclock(); }
  function vacIntervalAt(x, y) { return vacInterval() / machineBoost(x, y); }
  function beltSpeed() { return ECON.beltSpeed * (1 + 0.20 * lvl('beltspeed')) * overclock(); }
  function truckCap() { return vehicle().cap + 5 * lvl('truckcap'); }
  function tripTime() { return vehicle().trip * city().dist * Math.pow(0.85, lvl('route')) * Math.pow(0.75, lvl('fleet')); }
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
    const c = city();
    /* bigger cities pay a premium, and a steeper one for rare eggs */
    let sum = S.truck.load.reduce((a, e) => a + eggValue(e.tier, e.golden) * (1 + 0.08 * c.sky * e.tier), 0);
    sum *= c.mult;
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
  function terrainAt(c, r) { const t = S.terrain[key(c, r)]; return t ? t.t : null; }
  function inPond(x, y) {
    const p = WORLD.pond;
    if (x > p.x - 6 && x < p.x + p.w + 6 && y > p.y - 6 && y < p.y + p.h + 6) return true;
    /* ponds you dug yourself block just the same */
    return terrainAt(Math.floor(x / 16), Math.floor(y / 16)) === 'water';
  }
  /* how much quicker the crew move over a tile */
  function groundSpeed(x, y) {
    const t = terrainAt(Math.floor(x / 16), Math.floor(y / 16));
    if (t === 'stone') return ECON.stoneSpeed;
    if (t === 'path') return ECON.pathSpeed;
    return 1;
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
    Object.keys(S.splitters).forEach(k => occ[k] = { type: 'splitter', k });
    const box = (map, type, w, h) => Object.keys(map).forEach(k => {
      const [c, r] = k.split(',').map(Number);
      for (let dc = 0; dc < w; dc++) for (let dr = 0; dr < h; dr++)
        occ[key(c + dc, r + dr)] = { type, k };
    });
    Object.keys(S.troughs).forEach(k => occ[k] = { type: 'trough', k });
    Object.keys(S.wells).forEach(k => occ[k] = { type: 'well', k });
    Object.keys(S.sprinklers).forEach(k => occ[k] = { type: 'sprinkler', k });
    Object.keys(S.boards).forEach(k => occ[k] = { type: 'board', k });
    two(S.incs, 'incubator');
    two(S.nests, 'lovenest');
    two(S.huts, 'staffhut');
    two(S.silos, 'silo');
    two(S.barns, 'barn');
    two(S.mills, 'mill');
    two(S.coops, 'coop');
    box(S.hqs, 'hq', 3, 2);
    box(S.hatchers, 'hatchery', 3, 3);
    box(S.loaders, 'loader', 2, 1);
  }
  function isFence(x, y) { return !!S.fences[key(Math.floor(x / 16), Math.floor(y / 16))]; }
  function tileBuildable(c, r) {
    const x = c * 16 + 8, y = r * 16 + 8;
    const p = plotAt(x, y);
    if (!p || !S.plots[p.id]) return false;
    if (r >= 37) return false;                          /* the road */
    if (terrainAt(c, r) === 'water') return false;      /* not in the pond */
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
      const k = key(c + dc, r + dr);
      if (!tileBuildable(c + dc, r + dr) || occ[k] || S.soil[k]) return false;
      if (S.terrain[k] && S.terrain[k].t === 'water') return false;
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
  function plumeValue(v) { return Math.max(1, Math.round(v * (1 + 0.25 * lvl('plumage')))); }
  function collectPlume(pl) {
    const i = S.plumes.indexOf(pl);
    if (i === -1) return 0;
    S.plumes.splice(i, 1);
    const got = plumeValue(pl.value);
    S.feathers += got;
    S.stats.plumes += got;
    return got;
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
      age: 1, food: 1,
    };
    S.chickens.push(ch);
    return ch;
  }
  function isChick(ch) { return (ch.age === undefined ? 1 : ch.age) < 1; }
  function growPellets() { return Math.max(1, ECON.chickPellets - lvl('hearty')); }
  function nearCoop(x, y) {
    return Object.keys(S.coops).some(k => {
      const [c, r] = k.split(',').map(Number);
      return Math.hypot(c * 16 + 16 - x, r * 16 + 16 - y) < ECON.coopR;
    });
  }
  /* a chicken eats one pellet: chicks grow, adults fill up and lay faster */
  function eat(ch) {
    if (isChick(ch)) {
      ch.age = Math.min(1, ch.age + (1 / growPellets()) * (nearCoop(ch.x + 10, ch.y + 10) ? 2 : 1));
      ch.food = 1;
      if (ch.age >= 1) {
        ch.lay = layTime(SPECIES[ch.sp].tier) * 0.5;
        S.stats.grown++;
        emit('grown', { ch });
        if (S.stats.grown === 1) note('grown', 'The first chick grew up. It lays now.', ch.sp);
      }
    } else {
      ch.food = 1;
      ch.buffT = ECON.feedBuff * (1 + 0.5 * lvl('feedplus'));
    }
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
      born.age = 0;
      born.food = 1;
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

  /* the nearest thing to eat: a seed pile, or a trough with pellets in it */
  function nearestFeed(x, y, R) {
    let best = null, bd = R * R;
    for (const f of S.feed) {
      const d = (f.x - x) * (f.x - x) + (f.y - y) * (f.y - y);
      if (d < bd) { best = f; bd = d; }
    }
    for (const k of Object.keys(S.troughs)) {
      const t = S.troughs[k];
      if (t.n <= 0) continue;
      const [c, r] = k.split(',').map(Number);
      const tx = c * 16 + 8, ty = r * 16 + 12;
      const d = (tx - x) * (tx - x) + (ty - y) * (ty - y);
      if (d < bd) { best = t; bd = d; t.x = tx; t.y = ty; t.trough = k; }
    }
    return best;
  }
  function feedStillThere(f) {
    if (f.trough) return !!S.troughs[f.trough] && S.troughs[f.trough].n > 0;
    return f.n > 0 && S.feed.indexOf(f) !== -1;
  }
  function takeBite(f) {
    if (f.trough) { S.troughs[f.trough].n--; return; }
    f.n--;
    if (f.n <= 0) S.feed.splice(S.feed.indexOf(f), 1);
  }

  function tickChicken(ch, dt) {
    ch.t -= dt;
    ch.petCd = Math.max(0, ch.petCd - dt);
    ch.buffT = Math.max(0, ch.buffT - dt);
    if (ch.age === undefined) ch.age = 1;
    if (ch.food === undefined) ch.food = 1;
    const chick = isChick(ch);
    ch.food = Math.max(0, ch.food - dt / (ECON.hungerTime * (1 + 0.25 * lvl('slowbelly'))));
    /* seek feed: the hungry and the little ones look further */
    const keen = chick || ch.food < 0.5;
    if (ch.state !== 'seek' && (keen || ch.buffT <= 0) && (S.feed.length || Object.keys(S.troughs).length)) {
      const f = nearestFeed(ch.x + 10, ch.y + 10, keen ? 150 : 70);
      if (f) { ch.state = 'seek'; ch.target = f; ch.t = 8; }
    }
    if (ch.state === 'seek') {
      const f = ch.target;
      if (!f || !feedStillThere(f)) { ch.state = 'idle'; ch.t = 0.5; ch.target = null; }
      else {
        const dx = f.x - (ch.x + 10), dy = f.y - (ch.y + 12);
        const d = Math.hypot(dx, dy);
        if (d < 6) {
          takeBite(f);
          eat(ch);
          ch.state = 'peck'; ch.t = 0.8; ch.target = null;
          emit('feedeat', { x: ch.x + 10, y: ch.y, chick });
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
    if (chick) return;                                 /* chicks do not lay */
    const belly = ch.food <= 0 ? ECON.hungryLay : 1;
    ch.lay -= dt * (ch.buffT > 0 ? 2 : 1) * belly * careBoost(ch.x + 10, ch.y + 10);
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
    if (isChick(ch)) {
      ch.age = Math.min(1, ch.age + 0.06);
      if (ch.age >= 1) { S.stats.grown++; emit('grown', { ch }); }
      return true;
    }
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
    if (!inOwned(x, y) || y > WORLD.roadY - 10) return false;
    if (S.feedStore < 1) return false;
    const n = Math.min(ECON.sprinkle, Math.floor(S.feedStore));
    S.feedStore -= n;
    for (let i = 0; i < n; i++) {
      S.feed.push({ x: x + (Math.random() * 18 - 9), y: y + (Math.random() * 12 - 6), n: 1 });
    }
    if (S.feed.length > 160) S.feed.splice(0, S.feed.length - 160);
    emit('sprinkle', { x, y });
    return true;
  }
  /* pellets straight into storage (harvests, refunds) - overflow spills on the grass */
  function addFeed(n, x, y) {
    const room = Math.max(0, feedCap() - S.feedStore);
    const stored = Math.min(n, room);
    S.feedStore += stored;
    S.stats.feedMade += n;
    let spill = n - stored;
    for (let i = 0; i < spill && i < 12; i++) {
      S.feed.push({ x: x + (Math.random() * 30 - 15), y: Math.min(WORLD.roadY - 10, y + (Math.random() * 20 - 10)), n: 1 });
    }
    return stored;
  }

  /* ============================================================
     FARMING - till, plant, water, harvest
     ============================================================ */
  /* Buildings keep clear of Mama and the stations. Landscaping is far more
     relaxed: anywhere you own, off the road, that is not already spoken for. */
  function tileOpen(c, r) {
    const x = c * 16 + 8, y = r * 16 + 8;
    const p = plotAt(x, y);
    if (!p || !S.plots[p.id]) return false;
    if (r >= 37) return false;
    if (r === p.tr && p.tr === 0) return false;
    const px = c * 16, py = r * 16, pd = WORLD.pond;
    if (px + 16 > pd.x - 2 && px < pd.x + pd.w + 2 && py + 16 > pd.y - 2 && py < pd.y + pd.h + 2) return false;
    if (Math.abs(px + 8 - WORLD.mama.x) < 18 && Math.abs(py + 8 - WORLD.mama.y) < 18) return false;
    for (const k of Object.keys(WORLD.stations)) {
      const st = WORLD.stations[k];
      if (px + 16 > st.x && px < st.x + st.w && py + 16 > st.y && py < st.y + st.h) return false;
    }
    return true;
  }
  function tileFree(c, r) {
    const k = key(c, r);
    return tileOpen(c, r) && !occ[k] && !S.soil[k] && !S.deco[k];
  }
  function canTill(c, r) {
    const t = terrainAt(c, r);
    return tileFree(c, r) && t !== 'water' && t !== 'stone' && t !== 'path';
  }

  /* ---- shaping the ground ---- */
  function terrainCost(kind) { return (TERRAIN[kind] || {}).cost || 0; }
  function terrainOpen(kind) {
    const d = TERRAIN[kind];
    return !!d && (!d.needs || lvl(d.needs) > 0);
  }
  function canShape(kind, c, r) {
    if (!terrainOpen(kind)) return false;
    const k = key(c, r);
    if (kind === 'flat') return !!S.terrain[k];
    if (!tileOpen(c, r) && terrainAt(c, r) !== 'water') return false;
    if (occ[k] || S.soil[k]) return false;
    if (kind === 'water' && S.deco[k]) return false;
    if (terrainAt(c, r) === kind) return false;
    return S.coins >= terrainCost(kind);
  }
  function shape(kind, c, r) {
    if (!canShape(kind, c, r)) return false;
    const k = key(c, r);
    if (kind === 'flat') {
      delete S.terrain[k];
      emit('shape', { c, r, kind });
      return true;
    }
    S.coins -= terrainCost(kind);
    if (kind === 'water' && S.deco[k]) delete S.deco[k];
    S.terrain[k] = { t: kind, seed: Math.floor(Math.random() * 999) };
    S.stats.shaped++;
    if (S.stats.shaped === 1) note('shape', 'Started shaping the land. It is yours to arrange.');
    emit('shape', { c, r, kind });
    return true;
  }

  /* ---- decorations ---- */
  function canDecorate(kind, c, r) {
    const d = DECOS[kind];
    if (!d) return false;
    const t = terrainAt(c, r);
    if (t === 'water') return false;
    return tileFree(c, r) && S.coins >= d.cost;
  }
  function decorate(kind, c, r) {
    if (!canDecorate(kind, c, r)) return false;
    S.coins -= DECOS[kind].cost;
    S.deco[key(c, r)] = { kind, seed: Math.floor(Math.random() * 99999) };
    S.stats.planted2++;
    emit('decorate', { c, r, kind });
    return true;
  }
  function undecorate(c, r) {
    const k = key(c, r), d = S.deco[k];
    if (!d) return false;
    S.coins += Math.round(DECOS[d.kind].cost * ECON.decoRefund);
    delete S.deco[k];
    emit('decorate', { c, r, kind: null });
    return true;
  }
  function decoAt(c, r) { return S.deco[key(c, r)] || null; }
  function till(c, r) {
    if (!canTill(c, r)) return false;
    delete S.terrain[key(c, r)];
    S.soil[key(c, r)] = { crop: null, growth: 0, water: 0, seed: Math.floor(Math.random() * 999) };
    emit('till', { c, r });
    return true;
  }
  function untill(c, r) {
    const k = key(c, r), t = S.soil[k];
    if (!t) return false;
    if (t.crop) return false;
    delete S.soil[k];
    return true;
  }
  function seedCount(crop) { return (S.seeds[crop] || 0); }
  function cropOpen(crop) { const d = CROPS[crop]; return !!d && (!d.needs || lvl(d.needs) > 0); }
  function canPlant(c, r, crop) {
    const t = S.soil[key(c, r)];
    if (!t || t.crop || !cropOpen(crop)) return false;
    return seedCount(crop) > 0 || S.coins >= CROPS[crop].seed;
  }
  function plant(c, r, crop) {
    if (!canPlant(c, r, crop)) return false;
    if (seedCount(crop) > 0) S.seeds[crop]--;
    else S.coins -= CROPS[crop].seed;
    const t = S.soil[key(c, r)];
    t.crop = crop; t.growth = 0;
    S.stats.planted++;
    if (S.stats.planted === 1) note('farm', 'Planted the first seeds. The field is not bare any more.');
    emit('plant', { c, r, crop });
    return true;
  }
  function water(c, r) {
    const t = S.soil[key(c, r)];
    if (!t) return false;
    t.water = 1;
    emit('water', { c, r });
    return true;
  }
  function wateredBy(c, r) {
    const x = c * 16 + 8, y = r * 16 + 8;
    for (const k of Object.keys(S.wells)) {
      const [wc, wr] = k.split(',').map(Number);
      if (Math.hypot(wc * 16 + 8 - x, wr * 16 + 8 - y) < ECON.wellR) return 'well';
    }
    for (const k of Object.keys(S.sprinklers)) {
      const [wc, wr] = k.split(',').map(Number);
      if (Math.hypot(wc * 16 + 8 - x, wr * 16 + 8 - y) < ECON.sprinklerR) return 'sprinkler';
    }
    return null;
  }
  function cropStage(t) {
    const d = CROPS[t.crop];
    return Math.min(d.stages - 1, Math.floor(t.growth * d.stages));
  }
  function ripe(t) { return !!t.crop && t.growth >= 1; }
  function harvestYield(crop) {
    return Math.round(CROPS[crop].yield * (1 + 0.20 * lvl('bumper')) * (1 + 0.25 * Object.keys(S.mills).length));
  }
  function harvest(c, r) {
    const k = key(c, r), t = S.soil[k];
    if (!t || !ripe(t)) return 0;
    const d = CROPS[t.crop];
    const n = harvestYield(t.crop);
    addFeed(n, c * 16 + 8, r * 16 + 8);
    S.stats.harvested++;
    /* every harvest hands back a couple of seeds of its own kind */
    S.seeds[t.crop] = (S.seeds[t.crop] || 0) + (d.regrow ? 0 : 2);
    if (d.regrow) t.growth = 0.3;
    else { t.crop = null; t.growth = 0; }
    emit('harvest', { c, r, crop: d, n });
    return n;
  }
  function tickFarm(dt) {
    const speed = (1 + 0.15 * lvl('farming'));
    for (const k of Object.keys(S.soil)) {
      const t = S.soil[k];
      const [c, r] = k.split(',').map(Number);
      const auto = wateredBy(c, r);
      if (auto) t.water = 1;
      else t.water = Math.max(0, t.water - dt / 70);
      if (!t.crop) continue;
      if (t.growth < 1) {
        const d = CROPS[t.crop];
        t.growth = Math.min(1, t.growth + dt / d.grow * speed * (t.water > 0 ? ECON.waterMult : 1));
        if (t.growth >= 1) emit('ripe', { c, r });
      } else if (lvl('harvestbot')) {
        t.auto = (t.auto || 0) + dt;
        if (t.auto > 4) { t.auto = 0; harvest(c, r); }
      }
    }
  }

  function sendTruck() {
    const tr = S.truck;
    if (tr.state !== 'parked' || !tr.load.length) return false;
    tr.state = 'away';
    tr.t = tripTime();
    tr.T = tr.t;
    tr.to = S.route;
    tr.pay = truckPayout();
    tr.n = tr.load.length;
    S.stats.trips++;
    emit('depart', { n: tr.n, to: city() });
    return true;
  }
  function tripPhase() {
    const tr = S.truck;
    if (tr.state !== 'away') return null;
    const f = 1 - tr.t / (tr.T || tripTime());
    return { f, out: f < 0.5, city: city(), vehicle: vehicle(), n: tr.n, pay: tr.pay };
  }
  function hasHQ() { return Object.keys(S.hqs).length > 0; }
  function buyVehicle() {
    const next = VEHICLES[S.vehicle + 1];
    if (!hasHQ() || !next || S.coins < next.cost || S.truck.state !== 'parked') return false;
    S.coins -= next.cost;
    S.vehicle++;
    note('wheels', 'Traded up to the ' + next.name + '.');
    emit('vehicle', { v: next });
    return true;
  }
  function buyRoute(id) {
    const c = CITY_BY_ID[id];
    if (!hasHQ() || !c || S.routes.includes(id) || S.coins < c.cost) return false;
    /* routes open in order down the road */
    const idx = CITIES.indexOf(c);
    if (idx > 0 && !S.routes.includes(CITIES[idx - 1].id)) return false;
    S.coins -= c.cost;
    S.routes.push(id);
    S.route = id;
    note('route', 'Opened a route to ' + c.name + '.');
    emit('route', { city: c });
    return true;
  }
  function setRoute(id) {
    if (!S.routes.includes(id) || S.truck.state !== 'parked') return false;
    S.route = id;
    return true;
  }

  function tickTruck(dt) {
    const tr = S.truck;
    if (tr.state === 'away') {
      tr.t -= dt;
      const T = tr.T || tripTime();
      /* the sale happens on arrival, halfway through the trip */
      if (!tr.sold && tr.t <= T / 2) {
        const pay = tr.pay || truckPayout();
        const n = tr.load.length;
        S.coins += pay;
        S.stats.coinsEarned += pay;
        S.stats.sold += n;
        tr.load = [];
        tr.sold = true;
        emit('sell', { pay, n, city: CITY_BY_ID[tr.to] || city() });
      }
      if (tr.t <= 0) {
        tr.state = 'parked';
        tr.sold = false;
        tr.load = [];
        emit('home', {});
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
        if (best) { best.suck = k; v.cd = vacIntervalAt(c * 16 + 8, r * 16 + 8); }
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
    const k = key(c, r);
    const b = S.belts[k];
    if (b) return b.dir;
    const so = S.sorters[k];
    if (so) {
      const rare = item.tier >= (so.thr === undefined ? ECON.sorterRare : so.thr);
      return rare ? so.dir : (so.dir + 1) % 4;   /* commons peel off to the side */
    }
    const sp = S.splitters[k];
    if (sp) {
      /* alternate left and right so two lines fill evenly; decided once per egg */
      if (item.splitAt !== k) {
        item.splitAt = k;
        item.splitDir = (sp.n++ % 2) ? (sp.dir + 1) % 4 : (sp.dir + 3) % 4;
      }
      return item.splitDir;
    }
    return null;
  }
  function tickBelts(dt) {
    const base = beltSpeed();
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
      const spd = base * machineBoost(it.x, it.y);
      const nx = it.x + dx * spd * dt, ny = it.y + dy * spd * dt;
      const nc = Math.floor(nx / 16), nr = Math.floor(ny / 16);
      if (nc === c && nr === r) { it.x = nx; it.y = ny; continue; }
      const target = occ[key(nc, nr)];
      if (target && (target.type === 'belt' || target.type === 'sorter' || target.type === 'splitter')) {
        it.x = nx; it.y = ny; continue;
      }
      if (target && target.type === 'hatchery') {
        const h = S.hatchers[target.k];
        if (h.queue.length < ECON.hatcheryCap) {
          h.queue.push({ tier: it.tier, golden: it.golden, rainbow: it.rainbow });
          S.items.splice(i, 1);
        }
        continue;
      }
      if (target && target.type === 'loader') {
        const ld = S.loaders[target.k];
        if (ld.store.length < 20) {
          ld.store.push({ tier: it.tier, golden: it.golden, rainbow: it.rainbow });
          S.items.splice(i, 1);
        }
        continue;
      }
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
      const [sc, sr] = k.split(',').map(Number);
      const rate = 3 * (lvl('overclock') ? 2 : 1) * machineBoost(sc * 16 + 16, sr * 16 + 16);
      while (silo.store.length && S.truck.state === 'parked' && S.truck.load.length < truckCap() && silo.t > 1 / rate) {
        silo.t -= 1 / rate;
        S.truck.load.push(silo.store.shift());
        emit('truckload', {});
      }
      if (!silo.store.length || S.truck.state !== 'parked') silo.t = Math.min(silo.t, 1 / rate);
    }
  }

  /* ---------- incubators and the Grand Hatchery ---------- */
  function tickIncs(dt) {
    for (const k of Object.keys(S.incs)) {
      const inc = S.incs[k];
      if (!inc.queue.length) { inc.prog = 0; continue; }
      const egg = inc.queue[0];
      const [c, r] = k.split(',').map(Number);
      inc.prog += dt * machineBoost(c * 16 + 16, r * 16 + 16);
      if (inc.prog >= incHatchTime(egg.tier, egg.rainbow)) {
        if (S.chickens.length >= chickenCap()) continue;
        inc.queue.shift();
        inc.prog = 0;
        hatchChicken(egg.tier, c * 16 + 16, r * 16 + 36, egg.rainbow);
      }
    }
    /* a hatchery works three eggs at a time, each at double speed */
    for (const k of Object.keys(S.hatchers)) {
      const h = S.hatchers[k];
      if (!h.queue.length) { h.prog = 0; continue; }
      const [c, r] = k.split(',').map(Number);
      const cx = c * 16 + 24, cy = r * 16 + 24;
      const lanes = Math.min(3, h.queue.length);
      h.prog += dt * 2 * machineBoost(cx, cy);
      const egg = h.queue[0];
      const need = incHatchTime(egg.tier, egg.rainbow) / lanes;
      if (h.prog >= need) {
        if (S.chickens.length >= chickenCap()) continue;
        h.queue.shift();
        h.prog = 0;
        hatchChicken(egg.tier, cx, r * 16 + 50, egg.rainbow);
      }
    }
  }

  /* ---------- loaders: buffer belt eggs, then fill the truck ---------- */
  function tickLoaders(dt) {
    for (const k of Object.keys(S.loaders)) {
      const ld = S.loaders[k];
      const [c, r] = k.split(',').map(Number);
      const rate = ECON.loaderRate / machineBoost(c * 16 + 16, r * 16 + 8) / (lvl('overclock') ? 2 : 1);
      ld.t = (ld.t || 0) + dt;
      while (ld.store.length && S.truck.state === 'parked' && S.truck.load.length < truckCap() && ld.t > rate) {
        ld.t -= rate;
        S.truck.load.push(ld.store.shift());
        emit('truckload', {});
      }
      if (!ld.store.length || S.truck.state !== 'parked') ld.t = Math.min(ld.t, rate);
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
     THE CREW - flyers bring applicants, applicants become staff.
     Every person is rolled procedurally: five stats, a look, a
     name and up to two traits. Roles lean on different stats, so
     who you put where actually matters.
     ============================================================ */
  function staffSlots() {
    return ECON.staffBaseSlots + ECON.hutSlots * Object.keys(S.huts).length + 2 * lvl('crewcap');
  }
  function unionMult() { return lvl('union') ? 1.5 : 1; }
  function wageMult() { return Math.pow(0.88, lvl('wages')); }
  function wagePerSec() { return S.staff.reduce((a, w) => a + (w.wage || 0), 0) * wageMult(); }
  function restCap() { return ECON.staffTireless * (1 + 0.25 * lvl('overtime')); }
  function auraR() { return ECON.techAuraR * (1 + 0.35 * lvl('foreman')); }

  /* ---- per-worker derived numbers ---- */
  function trait(w, id) { return (w.traits || []).includes(id); }
  function crewStat(w, k) {
    let v = (w.st && w.st[k]) || 0;
    (w.traits || []).forEach(id => { const t = TRAIT_BY_ID[id]; if (t && t.add && t.add[k]) v += t.add[k]; });
    return v;
  }
  function crewSpeed(w) {
    const base = ECON.staffSpeed * (1 + 0.15 * lvl('crewspeed')) * unionMult();
    return base * (0.55 + 0.09 * crewStat(w, 'speed'));
  }
  function crewCarry(w) { return Math.max(1, Math.round(1 + crewStat(w, 'carry') * 0.8)); }
  function crewLuck(w) { return trait(w, 'lucky') ? 0.10 : 0; }
  function crewRestRate(w) {
    if (trait(w, 'noRest') || trait(w, 'tireless')) return 0;
    return (trait(w, 'dozy') ? 2 : 1) / restCap();
  }
  /* every Technician within reach speeds a machine up */
  function machineBoost(x, y) {
    let m = 1;
    const R = auraR();
    for (const w of S.staff) {
      if (w.role !== 'tech' || w.state === 'rest') continue;
      if (Math.hypot(w.x + 6 - x, w.y + 8 - y) > R) continue;
      m += 0.06 * crewStat(w, 'tech');
    }
    return m;
  }
  /* Keepers make the flock lay faster just by being about */
  function careBoost(x, y) {
    let m = 1;
    for (const w of S.staff) {
      if (w.role !== 'keeper' || w.state === 'rest') continue;
      if (Math.hypot(w.x + 6 - x, w.y + 8 - y) > 70) continue;
      m += 0.05 * crewStat(w, 'care');
    }
    return m;
  }

  /* ---- rolling a person ---- */
  function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }
  function rollName(rnd) {
    let first = pick(NAME_A, rnd);
    if (rnd() < 0.8) first += pick(NAME_B, rnd);
    if (rnd() < 0.18) first += pick(NAME_B, rnd);
    return first.charAt(0).toUpperCase() + first.slice(1) + ' ' + pick(NAME_C, rnd);
  }
  function rollApplicant() {
    const seed = Math.floor(Math.random() * 1e9);
    const rnd = SPR.mulberry(seed);
    const bonus = lvl('agency');
    const st = {};
    /* a lopsided roll: everyone is good at something */
    const favour = pick(STAT_KEYS, rnd);
    STAT_KEYS.forEach(k => {
      let v = 1 + Math.floor(rnd() * 6) + (k === favour ? 2 + Math.floor(rnd() * 3) : 0) + bonus;
      st[k] = Math.max(RECRUIT.statMin, Math.min(RECRUIT.statMax, v));
    });
    const traits = [];
    const pool = TRAITS.slice();
    const n = rnd() < 0.34 ? 0 : rnd() < 0.85 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      if (t) traits.push(t.id);
    }
    const look = {
      skin: pick(SKINS, rnd), hair: pick(HAIRS, rnd), style: pick(HAIR_STYLES, rnd),
      shirt: pick(SHIRTS, rnd), pants: pick(PANTS, rnd), boot: pick(BOOTS, rnd),
      hat: pick(HATS, rnd),
    };
    return {
      id: nextId++, seed, name: rollName(rnd), st, traits, look,
      wage: crewWage(st, traits), sign: crewSignCost(st, traits),
      t: RECRUIT.applicantLife,
    };
  }

  /* ---- flyers ---- */
  function flyerPrice() { return flyerCost(S.flyerRuns); }
  function canFlyer() {
    return !!lvl('hiring') && !S.flyer && Object.keys(S.huts).length > 0 && Object.keys(S.boards).length > 0;
  }
  /* where applicants gather: a row in front of the first noticeboard */
  function boardSpot(i) {
    const k = Object.keys(S.boards)[0];
    if (!k) { const h = hutSpawn(); return { x: h.x + 20 + i * 11, y: h.y }; }
    const [c, r] = k.split(',').map(Number);
    return { x: c * 16 + 18 + i * 11, y: r * 16 + 4 + (i % 2) * 3 };
  }
  function roadEntry() {
    /* the edge of the land you actually own, down by the road */
    let x1 = 0;
    PLOTS.forEach(p => { if (S.plots[p.id] && p.tr === (PLOT_ROWS - 1) * PLOT_H) x1 = Math.max(x1, (p.tc + PLOT_W) * 16); });
    return { x: Math.min(WORLD.W - 20, x1 + 4), y: WORLD.roadY - 24 };
  }
  function sendFlyers() {
    if (!canFlyer()) return false;
    const cost = flyerPrice();
    if (S.coins < cost) return false;
    S.coins -= cost;
    S.flyerRuns++;
    S.stats.flyers++;
    /* every city on your routes is another place a flyer gets read */
    const n = RECRUIT.flyerYield + lvl('posters') + (S.routes.length - 1);
    S.flyer = { t: RECRUIT.flyerTime, need: RECRUIT.flyerTime, n };
    note('flyer', 'Pinned up ' + n + ' HELP WANTED flyers around the valley.');
    emit('flyer', { n, cost });
    return true;
  }
  function tickRecruit(dt) {
    S.dayT += dt;
    if (S.dayT > 300) { S.dayT -= 300; S.day++; }
    if (S.flyer) {
      S.flyer.t -= dt;
      if (S.flyer.t <= 0) {
        const got = [];
        for (let i = 0; i < S.flyer.n; i++) {
          if (S.applicants.length >= RECRUIT.poolMax) break;
          const ap = rollApplicant();
          const e = roadEntry();
          ap.x = e.x + i * 14; ap.y = e.y + (i % 2) * 4;
          ap.state = 'arriving'; ap.anim = 0; ap.frame = 0; ap.dir = -1;
          S.applicants.push(ap);
          got.push(ap);
        }
        S.flyer = null;
        if (got.length) note('applicants', got.length + ' folk turned up at the hut looking for work.');
        emit('applicants', { got });
      }
    }
    /* applicants are people in the world: they walk in, wait by the board, and walk off */
    let slot = 0;
    for (let i = 0; i < S.applicants.length; i++) {
      const ap = S.applicants[i];
      ap.anim = (ap.anim || 0) + dt;
      if (ap.x === undefined) { const e = roadEntry(); ap.x = e.x; ap.y = e.y; ap.state = 'arriving'; }
      if (ap.state !== 'leaving') {
        ap.t -= dt;
        if (ap.t <= 0 || !Object.keys(S.boards).length) { ap.state = 'leaving'; ap.dir = 1; continue; }
      }
      if (ap.state === 'arriving') {
        const goal = boardSpot(slot++);
        const dx = goal.x - ap.x, dy = goal.y - ap.y, d = Math.hypot(dx, dy);
        if (d < 2) { ap.state = 'waiting'; ap.x = goal.x; ap.y = goal.y; }
        else {
          const sp = 30 * dt;
          ap.dir = dx > 0 ? 1 : -1;
          let nx = ap.x + dx / d * sp, ny = ap.y + dy / d * sp;
          if (inPond(nx + 6, ny + 8)) ny = ap.y;
          ap.x = nx; ap.y = ny;
          ap.walk = (ap.walk || 0) + sp;
          if (ap.walk > 5) { ap.walk = 0; ap.frame ^= 1; }
        }
      } else if (ap.state === 'waiting') {
        const goal = boardSpot(slot++);
        /* shuffle along when someone ahead leaves */
        if (Math.abs(goal.x - ap.x) > 1) ap.x += Math.sign(goal.x - ap.x) * Math.min(Math.abs(goal.x - ap.x), 14 * dt);
        ap.frame = 0;
      } else {
        ap.x += 26 * dt;
        ap.walk = (ap.walk || 0) + 26 * dt;
        if (ap.walk > 5) { ap.walk = 0; ap.frame ^= 1; }
        if (ap.x > roadEntry().x + 60 || ap.x > WORLD.W) { S.applicants.splice(i, 1); i--; }
      }
    }
  }
  function applicantAt(x, y) {
    for (let i = S.applicants.length - 1; i >= 0; i--) {
      const a = S.applicants[i];
      if (a.x === undefined || a.state === 'leaving') continue;
      if (x > a.x - 3 && x < a.x + 15 && y > a.y - 6 && y < a.y + 20) return a;
    }
    return null;
  }

  /* ---- hiring ---- */
  function hutSpawn() {
    const k = Object.keys(S.huts)[0];
    if (!k) return { x: WORLD.mama.x, y: WORLD.mama.y + 20 };
    const [c, r] = k.split(',').map(Number);
    return { x: c * 16 + 8 + Math.random() * 12, y: r * 16 + 26 };
  }
  function roleOpen(role) {
    const def = ROLES[role];
    if (!def) return false;
    if (def.needs && !lvl(def.needs)) return false;
    return true;
  }
  function canHire() {
    return Object.keys(S.huts).length > 0 && S.staff.length < staffSlots();
  }
  function hireApplicant(id, role) {
    if (!canHire() || !roleOpen(role) || ROLES[role].botOnly) return false;
    const i = S.applicants.findIndex(a => a.id === id);
    if (i === -1) return false;
    const ap = S.applicants[i];
    if (S.coins < ap.sign) return false;
    S.coins -= ap.sign;
    S.applicants.splice(i, 1);
    const at = ap.x !== undefined ? { x: ap.x, y: ap.y } : hutSpawn();
    S.staff.push({
      id: nextId++, role, name: ap.name, st: ap.st, traits: ap.traits, look: ap.look,
      wage: ap.wage, x: at.x, y: at.y, dir: 1, frame: 0, anim: 0,
      state: 'idle', t: 0, carry: [], target: null, say: 0, energy: 1, jobs: 0,
    });
    S.stats.hired++;
    note('hire', 'Hired ' + ap.name + ' as a ' + ROLES[role].name + '.');
    emit('hire', { role, name: ap.name });
    return true;
  }
  function botCount() { return S.staff.filter(w => w.bot).length; }
  function botPrice(role) { return Math.round(botCost(botCount()) * (ROLES[role] && ROLES[role].botOnly ? 1 : 0.7)); }
  function assembleBot(role) {
    const def = ROLES[role];
    if (!def || !roleOpen(role) || !canHire()) return false;
    const cost = botPrice(role);
    if (S.coins < cost) return false;
    S.coins -= cost;
    S.bots[role] = (S.bots[role] || 0) + 1;
    const at = hutSpawn();
    const st = {};
    STAT_KEYS.forEach(k => st[k] = def.uses.includes(k) ? 7 : 4);
    S.staff.push({
      id: nextId++, role, bot: true, name: botName(role, S.bots[role]),
      st, traits: ['tireless'], look: null, wage: 0.4 + 0.2 * botCount(),
      x: at.x, y: at.y, dir: 1, frame: 0, anim: 0,
      state: 'idle', t: 0, carry: [], target: null, say: 0, energy: 1, jobs: 0,
    });
    note('hire', 'Assembled a ' + def.name + '.');
    emit('hire', { role });
    return true;
  }
  function setRole(id, role) {
    const w = S.staff.find(x => x.id === id);
    if (!w || !roleOpen(role)) return false;
    /* people cannot take the jobs built for robots */
    if (ROLES[role].botOnly && !w.bot) return false;
    w.role = role;
    if (w.bot) w.name = botName(role, (S.bots[role] || 0) + 1);
    w.carry = [];
    w.hold = null;
    w.target = null;
    w.state = 'idle';
    return true;
  }
  function fireStaff(id) {
    const i = S.staff.findIndex(w => w.id === id);
    if (i === -1) return false;
    const w = S.staff[i];
    (w.carry || []).forEach(e => spawnEgg(w.x, w.y + 8, e.tier, e.golden, e.rainbow));
    if (w.hold) spawnChicken(w.hold.sp, w.x, w.y);
    S.staff.splice(i, 1);
    if (w.bot) S.bots[w.role] = Math.max(0, (S.bots[w.role] || 1) - 1);
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
    const sp = crewSpeed(w) * groundSpeed(w.x + 6, w.y + 12) * dt;
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
  function buildingSpots(map, ok, span) {
    const sp = span || 2;
    return Object.keys(map).filter(k => !ok || ok(map[k], k)).map(k => {
      const [c, r] = k.split(',').map(Number);
      return { k, x: c * 16 + sp * 8, y: r * 16 + sp * 16 + 2 };
    });
  }

  function tickStaff(dt) {
    /* wages first - run the payroll dry and the crew downs tools */
    const due = wagePerSec() * dt;
    if (due > 0) {
      if (S.coins >= due) { S.coins -= due; S.stats.wagesPaid += due; S.unpaid = false; }
      else { S.coins = 0; S.unpaid = true; }
    } else S.unpaid = false;

    for (const w of S.staff) {
      w.t -= dt;
      w.say = Math.max(0, w.say - dt);
      if (S.unpaid) { w.state = 'idle'; continue; }

      /* stamina: work drains it, a breather at the hut fills it back up */
      if (w.state === 'rest') {
        w.energy = Math.min(1, (w.energy || 0) + dt / ECON.staffRest);
        const hut = buildingSpots(S.huts)[0];
        if (hut) walkTo(w, hut.x - 6, hut.y - 6, dt);
        if (w.energy >= 1) w.state = 'idle';
        continue;
      }
      w.energy = Math.max(0, (w.energy === undefined ? 1 : w.energy) - crewRestRate(w) * dt);
      if (w.energy <= 0 && Object.keys(S.huts).length) { w.state = 'rest'; continue; }

      const role = ROLES[w.role] ? w.role : 'hand';
      if (role === 'hand') tickHand(w, dt);
      else if (role === 'feeder') tickFeeder(w, dt);
      else if (role === 'packer') tickPacker(w, dt);
      else if (role === 'tech') tickTech(w, dt);
      else if (role === 'keeper') tickKeeper(w, dt);
      else if (role === 'cull') tickCull(w, dt);
      else if (role === 'match') tickMatch(w, dt);
    }
  }

  function dropSpots(w) {
    const spots = buildingSpots(S.silos, s => s.store.length < ECON.siloCap)
      .concat(buildingSpots(S.incs, inc => inc.queue.length < incCap()))
      .concat(buildingSpots(S.hatchers, h => h.queue.length < ECON.hatcheryCap, 3))
      .concat(buildingSpots(S.loaders, l => l.store.length < 20, 2));
    if (S.truck.state === 'parked' && S.truck.load.length < truckCap())
      spots.push({ k: 'truck', x: WORLD.truckHome.x + 26, y: WORLD.truckHome.y - 10 });
    return spots;
  }
  function stow(w, spot, e) {
    if (spot.k === 'truck') {
      if (S.truck.load.length < truckCap()) { S.truck.load.push(e); emit('truckload', {}); return true; }
    } else if (S.silos[spot.k]) {
      if (S.silos[spot.k].store.length < ECON.siloCap) { S.silos[spot.k].store.push(e); return true; }
    } else if (S.incs[spot.k]) {
      if (S.incs[spot.k].queue.length < incCap()) { S.incs[spot.k].queue.push(e); return true; }
    } else if (S.hatchers[spot.k]) {
      if (S.hatchers[spot.k].queue.length < ECON.hatcheryCap) { S.hatchers[spot.k].queue.push(e); return true; }
    } else if (S.loaders[spot.k]) {
      if (S.loaders[spot.k].store.length < 20) { S.loaders[spot.k].store.push(e); return true; }
    }
    spawnEgg(w.x + 4, w.y + 10, e.tier, e.golden, e.rainbow);
    return false;
  }

  /* FARMHAND - sweeps loose eggs off the grass and stows them; harvests when the grass is clear */
  function tickHand(w, dt) {
    const cap = crewCarry(w);
    if (!w.carry.length && !S.eggs.length) {
      const ripeSpots = Object.keys(S.soil).filter(k => ripe(S.soil[k])).map(k => {
        const [c, r] = k.split(',').map(Number);
        return { k, c, r, x: c * 16 + 8, y: r * 16 + 8 };
      });
      const spot = nearest(ripeSpots, w.x, w.y);
      if (spot) {
        w.state = 'walk';
        if (walkTo(w, spot.x - 6, spot.y - 10, dt)) { harvest(spot.c, spot.r); w.jobs++; w.t = 0.8; w.state = 'work'; }
        return;
      }
    }
    if (w.carry.length < cap && S.eggs.length) {
      const e = nearest(S.eggs, w.x, w.y, o => !o.suck);
      if (e) {
        w.state = 'walk';
        if (walkTo(w, e.x - 6, e.y - 10, dt)) {
          const i = S.eggs.indexOf(e);
          if (i >= 0) {
            S.eggs.splice(i, 1);
            if (trait(w, 'butter') && Math.random() < 0.12) {
              spawnEgg(w.x + 8, w.y + 12, e.tier, e.golden, e.rainbow);
            } else {
              w.carry.push({ tier: e.tier, golden: e.golden, rainbow: e.rainbow });
            }
            w.jobs++;
            S.stats.collected++;
            S.stats.staffEggs++;
            const lk = crewLuck(w);
            if (lk && Math.random() < lk) dropPlumes(w.x + 6, w.y + 8, featherFor(e.tier, false));
            emit('staffpick', { w });
          }
        }
        return;
      }
    }
    if (w.carry.length) {
      const spot = nearest(dropSpots(w), w.x, w.y);
      if (spot) {
        w.state = 'walk';
        if (walkTo(w, spot.x - 6, spot.y - 10, dt)) {
          while (w.carry.length) stow(w, spot, w.carry.pop());
          emit('staffdrop', { w });
        }
        return;
      }
    }
    w.state = 'idle';
  }

  /* FEEDER - CARE decides how much seed lands per trip */
  function tickFeeder(w, dt) {
    if (!w.target || w.t <= 0) {
      const ch = S.chickens.length ? S.chickens[Math.floor(Math.random() * S.chickens.length)] : null;
      w.target = ch ? { x: ch.x + 8, y: ch.y + 14 } : null;
      w.t = 7;
    }
    if (!w.target) { w.state = 'idle'; return; }
    if (S.feedStore < 1) { w.state = 'idle'; w.target = null; return; }
    /* a hungry trough comes first */
    const empty = buildingSpots(S.troughs, t => t.n < ECON.troughCap / 2, 1);
    if (empty.length) {
      const tr = nearest(empty, w.x, w.y);
      w.state = 'walk';
      if (walkTo(w, tr.x - 6, tr.y - 8, dt)) {
        const want = ECON.troughCap - S.troughs[tr.k].n;
        const n = Math.min(want, Math.floor(S.feedStore));
        S.troughs[tr.k].n += n; S.feedStore -= n;
        w.jobs++; w.t = 3; w.state = 'work';
        emit('stafffeed', { w });
      }
      return;
    }
    w.state = 'walk';
    if (walkTo(w, w.target.x, w.target.y, dt)) {
      const n = Math.min(Math.floor(S.feedStore), 2 + Math.round(crewStat(w, 'care') * 0.6));
      S.feedStore -= n;
      for (let i = 0; i < n; i++) {
        S.feed.push({ x: w.x + 6 + (Math.random() * 22 - 11), y: w.y + 12 + (Math.random() * 12 - 6), n: 1 });
      }
      if (S.feed.length > 160) S.feed.splice(0, S.feed.length - 160);
      w.jobs++;
      emit('stafffeed', { w });
      w.target = null;
      w.t = 4;
      w.state = 'work';
    }
  }

  /* PACKER - hauls silo stock to the truck in big armfuls */
  function tickPacker(w, dt) {
    const cap = crewCarry(w) + 2;
    if (!w.carry.length) {
      const full = buildingSpots(S.silos, si => si.store.length > 0)
        .concat(buildingSpots(S.loaders, l => l.store.length > 0, 2));
      const src = nearest(full, w.x, w.y);
      if (!src) { w.state = 'idle'; return; }
      w.state = 'walk';
      if (walkTo(w, src.x - 6, src.y - 6, dt)) {
        const store = (S.silos[src.k] || S.loaders[src.k]).store;
        while (w.carry.length < cap && store.length) w.carry.push(store.shift());
        w.jobs++;
      }
      return;
    }
    if (S.truck.state !== 'parked' || S.truck.load.length >= truckCap()) { w.state = 'idle'; return; }
    const th = WORLD.truckHome;
    w.state = 'walk';
    if (walkTo(w, th.x + 20, th.y - 12, dt)) {
      while (w.carry.length && S.truck.load.length < truckCap()) {
        S.truck.load.push(w.carry.pop());
        emit('truckload', {});
      }
      emit('staffdrop', { w });
    }
  }

  /* TECHNICIAN - patrols the machines; the aura does the work */
  function tickTech(w, dt) {
    const machines = buildingSpots(S.belts).concat(buildingSpots(S.incs))
      .concat(buildingSpots(S.vacs)).concat(buildingSpots(S.silos))
      .concat(buildingSpots(S.sorters)).concat(buildingSpots(S.hatchers, null, 3));
    if (!machines.length) { w.state = 'idle'; return; }
    if (!w.target || w.t <= 0) {
      w.target = machines[Math.floor(Math.random() * machines.length)];
      w.t = 12;
    }
    w.state = 'walk';
    if (walkTo(w, w.target.x - 6, w.target.y - 4, dt)) {
      w.state = 'work';
      w.jobs++;
      w.target = null;
      w.t = 3 + Math.random() * 3;
      if (crewLuck(w) && Math.random() < crewLuck(w)) dropPlumes(w.x + 6, w.y + 8, 2);
    }
  }

  /* KEEPER - wanders the flock petting hens, which lays eggs */
  function tickKeeper(w, dt) {
    if (!S.chickens.length) { w.state = 'idle'; return; }
    if (!w.target || w.t <= 0) {
      const ch = nearest(S.chickens, w.x, w.y, o => (o.petCd || 0) <= 0);
      w.target = ch || null;
      w.t = 6;
    }
    if (!w.target || S.chickens.indexOf(w.target) === -1) { w.target = null; w.state = 'idle'; return; }
    const ch = w.target;
    w.state = 'walk';
    if (walkTo(w, ch.x + 2, ch.y + 6, dt)) {
      if ((ch.petCd || 0) <= 0) {
        ch.petCd = petCd(false) / (1 + 0.06 * crewStat(w, 'care'));
        layEgg(ch.x + 10, ch.y + 16, SPECIES[ch.sp].tier, true);
        S.stats.pets++;
        w.jobs++;
        emit('staffpet', { w, ch });
      }
      w.target = null;
      w.t = 1.5;
      w.state = 'work';
    }
  }

  /* CULL-BOT */
  function tickCull(w, dt) {
    const ch = nearest(S.chickens, w.x, w.y, o => o.marked);
    if (!ch) { w.state = 'idle'; return; }
    w.state = 'walk';
    if (walkTo(w, ch.x + 2, ch.y + 4, dt)) { retireChicken(ch); w.jobs++; w.t = 0.6; w.state = 'work'; }
  }

  /* MATCH-BOT */
  function tickMatch(w, dt) {
    const nestSpots = buildingSpots(S.nests, n => n.slots.filter(Boolean).length < 2 && n.cd <= 0);
    if (!nestSpots.length) { w.state = 'idle'; w.carry = []; return; }
    const nest = nearest(nestSpots, w.x, w.y);
    if (!w.hold) {
      const ch = nearest(S.chickens, w.x, w.y, o => !o.marked);
      if (!ch) { w.state = 'idle'; return; }
      w.state = 'walk';
      if (walkTo(w, ch.x + 2, ch.y + 4, dt)) {
        const i = S.chickens.indexOf(ch);
        if (i >= 0) { S.chickens.splice(i, 1); w.hold = { sp: ch.sp }; }
      }
      return;
    }
    w.state = 'walk';
    if (walkTo(w, nest.x - 8, nest.y - 8, dt)) {
      const n = S.nests[nest.k];
      const slot = n.slots[0] ? 1 : 0;
      if (!n.slots[slot] && n.cd <= 0) {
        n.slots[slot] = { sp: w.hold.sp };
        if (n.slots[0] && n.slots[1]) n.prog = 0.0001;
        w.hold = null;
        w.jobs++;
        emit('staffmatch', { w });
      } else {
        spawnChicken(w.hold.sp, w.x, w.y);
        w.hold = null;
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
      applicants: S.applicants.length,
      feed: S.feedStore, feedCap: feedCap(),
      soil: Object.keys(S.soil).length,
      crops: Object.values(S.soil).filter(t => t.crop).length,
      ripe: Object.values(S.soil).filter(t => ripe(t)).length,
      chicks: S.chickens.filter(isChick).length,
      hungry: S.chickens.filter(c => !isChick(c) && c.food <= 0).length,
      stored: Object.values(S.silos).reduce((a, s) => a + s.store.length, 0),
    };
  }


  /* ---------- building ---------- */
  function build(type, c, r, dir) {
    const cost = buildCost(type, S.built[type]);
    if (S.coins < cost || !canPlace(type, c, r)) return false;
    const b0 = BUILDS[type];
    for (let dc = 0; dc < b0.w; dc++) for (let dr = 0; dr < b0.h; dr++) delete S.deco[key(c + dc, r + dr)];
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
    else if (type === 'hatchery') S.hatchers[k] = { queue: [], prog: 0 };
    else if (type === 'splitter') S.splitters[k] = { dir: dir || 0, n: 0 };
    else if (type === 'loader') S.loaders[k] = { store: [], t: 0 };
    else if (type === 'barn') S.barns[k] = { built: Date.now() };
    else if (type === 'trough') S.troughs[k] = { n: 0 };
    else if (type === 'well') S.wells[k] = { built: Date.now() };
    else if (type === 'sprinkler') S.sprinklers[k] = { built: Date.now() };
    else if (type === 'mill') S.mills[k] = { t: 0 };
    else if (type === 'coop') S.coops[k] = { built: Date.now() };
    else if (type === 'board') S.boards[k] = { built: Date.now() };
    else if (type === 'hq') S.hqs[k] = { built: Date.now() };
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
    } else if (o.type === 'hatchery') {
      S.hatchers[k].queue.slice(0, 24).forEach((e, i) =>
        spawnEgg(kc * 16 + 6 + (i % 8) * 4, kr * 16 + 44, e.tier, e.golden, e.rainbow));
      delete S.hatchers[k]; S.built.hatchery = Math.max(0, S.built.hatchery - 1);
    } else if (o.type === 'splitter') {
      delete S.splitters[k]; S.built.splitter = Math.max(0, S.built.splitter - 1);
    } else if (o.type === 'loader') {
      S.loaders[k].store.forEach((e, i) =>
        spawnEgg(kc * 16 + 4 + i * 3, kr * 16 + 18, e.tier, e.golden, e.rainbow));
      delete S.loaders[k]; S.built.loader = Math.max(0, S.built.loader - 1);
    } else if (o.type === 'barn') {
      delete S.barns[k]; S.built.barn = Math.max(0, S.built.barn - 1);
      if (S.feedStore > feedCap()) { const spill = S.feedStore - feedCap(); S.feedStore = feedCap(); addFeed(0, 0, 0); for (let i = 0; i < Math.min(12, spill); i++) S.feed.push({ x: kc * 16 + 8 + (Math.random() * 30 - 15), y: kr * 16 + 30, n: 1 }); }
    } else if (o.type === 'trough') {
      for (let i = 0; i < S.troughs[k].n; i++) S.feed.push({ x: kc * 16 + 8 + (Math.random() * 14 - 7), y: kr * 16 + 14, n: 1 });
      delete S.troughs[k]; S.built.trough = Math.max(0, S.built.trough - 1);
    } else if (o.type === 'well') {
      delete S.wells[k]; S.built.well = Math.max(0, S.built.well - 1);
    } else if (o.type === 'sprinkler') {
      delete S.sprinklers[k]; S.built.sprinkler = Math.max(0, S.built.sprinkler - 1);
    } else if (o.type === 'mill') {
      delete S.mills[k]; S.built.mill = Math.max(0, S.built.mill - 1);
    } else if (o.type === 'coop') {
      delete S.coops[k]; S.built.coop = Math.max(0, S.built.coop - 1);
    } else if (o.type === 'hq') {
      delete S.hqs[k]; S.built.hq = Math.max(0, S.built.hq - 1);
    } else if (o.type === 'board') {
      delete S.boards[k]; S.built.board = Math.max(0, S.built.board - 1);
      S.applicants.forEach(a => { a.state = 'leaving'; });
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
      S.mama.lay = mamaLayTime();
      layEgg(WORLD.mama.x, WORLD.mama.y + 10, S.mamaTier, false);
    }
    S.chickens.forEach(ch => tickChicken(ch, dt));
    tickEggs(dt);
    tickVacs(dt);
    tickBlowers(dt);
    tickBelts(dt);
    tickSilos(dt);
    tickLoaders(dt);
    tickFarm(dt);
    tickStaff(dt);
    tickIncs(dt);
    tickNests(dt);
    tickTruck(dt);
    tickRecruit(dt);
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
    for (const k of Object.keys(S.hatchers)) {
      const h = S.hatchers[k];
      let budget = dt * 2 + h.prog;
      h.prog = 0;
      const [c, r] = k.split(',').map(Number);
      while (h.queue.length && S.chickens.length < chickenCap()) {
        const egg = h.queue[0];
        const need = incHatchTime(egg.tier, egg.rainbow) / Math.min(3, h.queue.length);
        if (budget < need) { h.prog = budget; break; }
        budget -= need;
        h.queue.shift();
        const before = S.feathers, pcount = S.plumes.length;
        hatchChicken(egg.tier, c * 16 + 24, r * 16 + 50, egg.rainbow);
        while (S.plumes.length > pcount) feathersGot += collectPlume(S.plumes[S.plumes.length - 1]);
        feathersGot += S.feathers - before;
        hatched++;
      }
    }
    /* the crew still drew wages while you were away */
    const owed = wagePerSec() * dt;
    let wages = 0;
    if (owed > 0) { wages = Math.min(S.coins, owed); S.coins -= wages; S.stats.wagesPaid += wages; }
    /* and flyers finished their run */
    if (S.flyer) {
      S.flyer.t -= dt;
      if (S.flyer.t <= 0) { const n = S.flyer.n; S.flyer = null; tickRecruit(0); for (let i = 0; i < n && S.applicants.length < RECRUIT.poolMax; i++) S.applicants.push(rollApplicant()); }
    }
    if (S.truck.state === 'away') {
      if (!S.truck.sold) {
        pay = S.truck.pay || truckPayout();
        S.coins += pay; S.stats.coinsEarned += pay; S.stats.sold += S.truck.load.length;
      }
      S.truck.load = []; S.truck.state = 'parked'; S.truck.sold = false;
    }
    /* crops kept growing */
    for (const k of Object.keys(S.soil)) {
      const t = S.soil[k];
      if (!t.crop) continue;
      const [c, r] = k.split(',').map(Number);
      t.growth = Math.min(1, t.growth + dt / CROPS[t.crop].grow * (1 + 0.15 * lvl('farming')) * (wateredBy(c, r) ? ECON.waterMult : 1));
    }
    S.eggs.forEach(e => { e.z = 0; e.vz = 0; });
    return { seconds: dt, laid, hatched, pay, feathersGot, wages };
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
      if (!d || d.v !== 6) { ensureStarterInc(); rebuildOcc(); return false; }
      S = Object.assign(freshState(), d);
      S.truck = Object.assign({ state: 'parked', t: 0, load: [] }, d.truck);
      S.held = null;
      S.chickens.forEach(c => { c.target = null; c.state = 'idle'; c.t = Math.random(); });
      S.staff = (S.staff || []).filter(w => ROLES[w.role])
        .map(w => Object.assign({ carry: [], frame: 0, anim: 0, say: 0, energy: 1 }, w, { target: null, state: 'idle' }));
      S.applicants = (S.applicants || []).filter(ap => ap && ap.st);
      S.bots = Object.assign({ cull: 0, match: 0 }, S.bots);
      ['huts', 'silos', 'blowers', 'sorters', 'fences', 'hatchers', 'splitters', 'loaders',
       'barns', 'troughs', 'wells', 'sprinklers', 'mills', 'coops', 'boards', 'hqs', 'soil',
       'terrain', 'deco'].forEach(m => { if (!S[m]) S[m] = {}; });
      S.staff.forEach(w => { if (w.bot === undefined) w.bot = (w.role === 'cull' || w.role === 'match'); });
      S.chickens.forEach(c => { if (c.age === undefined) c.age = 1; if (c.food === undefined) c.food = 1; });
      if (!Array.isArray(S.routes) || !S.routes.length) S.routes = ['hamlet'];
      if (!CITY_BY_ID[S.route]) S.route = S.routes[0];
      if (!Array.isArray(S.diary)) S.diary = [];
      if (typeof S.day !== 'number') { S.day = 1; S.dayT = 0; }
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
    staffSlots, wagePerSec, canHire, fireStaff, setRole, roleOpen,
    sendFlyers, canFlyer, flyerPrice, hireApplicant, assembleBot, botPrice,
    crewStat, crewSpeed, crewCarry, trait, machineBoost, careBoost, auraR, restCap,
    markChicken, retireChicken, rates, beltDirFor, plumeValue,
    feedCap, addFeed, canTill, till, untill, canPlant, plant, water, harvest, cropStage, ripe, harvestYield,
    terrainAt, canShape, shape, terrainOpen, terrainCost, canDecorate, decorate, undecorate, decoAt, tileOpen,
    groundSpeed, hasHQ, tileFree, botPrice, botCount,
    seedCount, cropOpen, wateredBy, isChick, growPellets, nearCoop, mamaLayTime,
    vehicle, city, tripPhase, buyVehicle, buyRoute, setRoute, applicantAt, boardSpot,
    note,
    tick, applyOffline, save, load, reset, fmt, fmtTime,
  };
})();
