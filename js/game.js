/* ============================================================
   INF EGG CO. v4 - world model: a twelve-plot valley, hand
   tools, feather plumes, breeding, incubator-only hatching,
   and a crew you recruit with flyers.
   World units are virtual pixels; the UI scales them up 3x.
   ============================================================ */
'use strict';

const SAVE_KEY = 'infEggCoSave_v7';

/* the world: 5x4 plots of 16x13 tiles = 80x52 tiles = 1280x832 px.
   the home plot is bottom-left, and the road runs along its foot. */
const WORLD = {
  T: 16, COLS: 80, ROWS: 52,
  W: 1280, H: 928,                           /* the last 96px are the road and the town over it */
  roadY: 800,                                /* the kerb on your side; the road runs 48px deep */
  roadH: 48,                                 /* three tile rows of tarmac, two lanes and a line */
  farY: 848,                                 /* the far kerb: footpath, then the town frontage */
  view: { w: 384, h: 208 },                  /* camera viewport */
  mama: { x: 118, y: 688 },
  truckHome: { x: 150, y: 796, w: 56, h: 32 },
  layby: { x: 236, y: 784, w: 160, h: 16 },     /* gravel shoulder where customers pull up */
  stations: {
    lab:      { x: 18,  y: 638, w: 30, h: 32 },   /* the Lab, home of EGGOS */
    stand:    { x: 56,  y: 644, w: 16, h: 24 },   /* the Index bookstand */
    mamaSign: { x: 88,  y: 666, w: 14, h: 20 },   /* upgrade-mama signpost */
    depot:    { x: 214, y: 770, w: 26, h: 26 },   /* the road sign: vehicles and routes */
    brand:    { x: 72,  y: 766, w: 72, h: 30 },   /* the company sign, in your colours */
  },
  starterInc: [3, 44],                      /* prebuilt incubator anchor tile */
};

const GAME = (() => {

  /* ---------- state ---------- */
  const zeroCounts = () => Object.keys(BUILDS).reduce((o, t) => { o[t] = 0; return o; }, {});
  let nextId = 1;
  function freshState() {
    const plots = PLOTS.map(p => p.id === PLOT_START);
    return {
      v: 7,
      coins: 0, feathers: 0,
      decree: null,          /* a timed change the valley voted on you */
      newsT: ECON.newsEvery, newsSeen: [], news: null,  /* the Chronicle's clock, memory and open front page */
      plots,
      mamaTier: 0,
      mama: { lay: 8, petCd: 0, belly: 1 },
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
      polishers: {}, graders: {}, dynamos: {},
      barns: {}, troughs: {}, wells: {}, sprinklers: {}, mills: {}, coops: {}, boards: {}, hqs: {},
      beehives: {}, genelabs: {}, billboards: {}, kitchens: {}, parks: {}, timemachines: {},
      hrs: {}, canneries: {},   /* the HR Office and the Cannery */
      composts: {}, wormfarms: {},  /* where the bugs come from */
      warden: null,          /* the small orange objection, when a tree comes down */
      bugs: [],              /* what is crawling about {id,kind,x,y,dir,state,t,ph,hop} */
      bugjar: {},            /* bug kind -> how many are in the jar */
      pantry: {},            /* produce id -> count, what harvests leave besides feed */
      goods: {},             /* goods id -> count, what the Cannery makes */
      premiumT: 0,           /* seconds of super feed left in the scatter */
      garage: { col: null, decal: 'none', upg: {}, routes: {} },
      factories: {},         /* city id -> true: a factory of ours in that town */
      road: { events: [], t: 90, weather: {}, wt: 40 },
      presents: [],          /* gift boxes on the grass {id,x,y,z,vz,rw,t} */
      limo: null, drone: null, limoQueue: [],
      tut: {},                 /* what the game has already shown you once */
      ach: {},               /* achievement id -> when */
      cosOwned: {},          /* cosmetics unlocked beyond the free ones */
      wardrobe: Object.assign({}, WARDROBE_DEFAULT),
      settings: Object.assign({}, SETTINGS_DEFAULT),
      secrets: {},           /* secret id -> when it was found */
      cooked: {},            /* recipe id -> dishes made */
      fossils: [],           /* bones lying on the ground {id,x,y,z,vz,seed} */
      fossilCount: 0,        /* bones in the crate, ready for the Time Machine */
      visitors: [],          /* diners and tourists walking about */
      age: 0,                /* index into AGES */
      playT: 0,              /* seconds actually played */
      sites: {},             /* "c,r" -> {type, dir, t, T, kind:'build'|'storey'} the movers are on */
      storeys: {},           /* "c,r" -> 2 for a building with a second floor */
      orders: [],            /* customers at the lay-by, and their egg orders */
      orderT: 45,            /* seconds to the next customer */
      quests: {},            /* quest id -> true once it has paid out */
      company: Object.assign({}, COMPANY_DEFAULT),
      ledger: { hist: [], acc: 0, t: 0, sales: 0, orders: 0, honey: 0, quests: 0, stocks: 0, empire: 0, food: 0, park: 0, secrets: 0 },
      empire: { open: { valley: true }, branches: {}, t: 0, rocket: 0, moonT: 0 },   /* the rest of the world, and the Moon */
      market: { t: 0, px: {}, hist: {}, held: {} },
      boss: { x: WORLD.mama.x + 34, y: WORLD.mama.y + 4, dir: -1, frame: 0, anim: 0,
              state: 'idle', t: 2, tx: 0, ty: 0, at: null, line: null, lineT: 0, pose: 'stand', said: null },
      seenIntro: false,
      weather: { t: 150, rain: false, left: 0, after: 0 },   /* showers water every crop on the ranch */
      soil: {},              /* "c,r" -> {crop, growth, water, seed} tilled ground */
      paint: {},             /* "cx,cy" at 8px -> 'path'|'stone'|'high'|'water', painted ground */
      brush: 2,              /* brush radius, in 8px cells */
      deco: {},              /* "c,r" -> {kind, seed} things planted for the look of them */
      feedStore: 6,          /* pellets in the barn, ready to scatter */
      seeds: { clover: 6, wheat: 4 },
      vehicle: 0,            /* index into VEHICLES - you start on a bike */
      routes: ['hamlet'],    /* cities you can deliver to */
      route: 'hamlet',       /* where the next load goes */
      staff: [],             /* the crew: animals and robots, no people */
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
      /* one counter per building, derived from BUILDS so adding a machine
         can never leave a hole here (a missing counter made buildCost
         return NaN and quietly wiped your coins) */
      built: zeroCounts(),
      disc: [], sk: { root: 1 },
      cam: { x: 0, y: WORLD.H - 208 },
      stats: { pets: 0, laid: 0, collected: 0, sold: 0, coinsEarned: 0, hatched: 0, mutations: 0,
               bred: 0, plumes: 0, culled: 0, wagesPaid: 0, staffEggs: 0, hired: 0, flyers: 0,
               planted: 0, harvested: 0, feedMade: 0, grown: 0, trips: 0, shaped: 0, planted2: 0,
               mamaFed: 0, watered: 0, builtN: 0, orders: 0, ordersMissed: 0, edits: 0, storeys: 0,
               honey: 0, questsDone: 0, trades: 0, rains: 0, vips: 0, regions: 0, branches: 0, posters: 0, bossPets: 0,
               cooked: 0, dishes: 0, roasts: 0, ranked: 0, champions: 0, secrets: 0, visitors: 0,
               celestial: 0, fossils: 0, dinos: 0, dinoShown: 0, mamaPets: 0,
               goods: 0, produce: 0, presents: 0, upgrades: 0, trained: 0, factories: 0, claimed: 0 },
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
  /* whatever the Chronicle talked you into last, while it lasts */
  function decreeMul(key) {
    const d = S.decree;
    return d && d.t > 0 && d[key] !== undefined ? d[key] : 1;
  }
  const ownedPlots = () => S.plots.filter(Boolean).length;

  function eggValue(tier, golden, polished) {
    let v = ECON.eggValue(tier);
    v *= 1 + 0.15 * lvl('value');
    v *= 1 + 0.01 * lvl('contracts') * disc();
    if (tier === TIER_DINO && lvl('bigeggs')) v *= 2;
    if (golden) v *= ECON.goldenMult;
    if (polished) v *= ECON.polishMult;
    return Math.round(v * tycoon() * decreeMul('pay'));
  }
  function layTime(t) { return ECON.layTime(t) / (1 + 0.10 * lvl('happy')); }
  function petCd(isMama) { return (isMama ? ECON.mamaPetCd : ECON.basePetCd) * Math.pow(0.85, lvl('pets')); }
  function incHatchTime(t, rainbow) {
    let time = ECON.incHatch(t) / (1 + 0.15 * lvl('warm')) / (1 + 0.30 * lvl('quantum')) / overclock();
    if (rainbow && lvl('secretlore')) time /= 3;
    return time;
  }
  function chickenCap() {
    return ECON.baseChickenCap + 4 * lvl('flock') + 10 * lvl('coops')
         + Math.round(Object.keys(S.coops).reduce((a, k) => a + 6 * storeyMult(k), 0))
         + ECON.capPerPlot * (ownedPlots() - 1);
  }
  function feedCap() { return ECON.baseFeedCap + Math.round(Object.keys(S.barns).reduce((a, k) => a + ECON.barnCap * storeyMult(k), 0)); }
  function vehicle() { return VEHICLES[Math.min(S.vehicle, VEHICLES.length - 1)]; }
  function city() { return CITY_BY_ID[S.route] || CITIES[0]; }
  function mamaLayTime() { return layTime(S.mamaTier) * ECON.mamaLayMult; }
  function incCap() { return 6 + 3 * lvl('inccap'); }
  function incCapAt(k) { return Math.round(incCap() * storeyMult(k)); }
  function basketCap() { return ECON.baseBasketCap + 8 * lvl('basket1') + 16 * lvl('basket2'); }
  function scoopR() { return ECON.baseScoopR + 12 * lvl('magnet'); }
  function vacR() { return ECON.baseVacR + 8 * lvl('vacradius'); }
  function vacInterval() { return ECON.vacInterval / (1 + 0.25 * lvl('vacspeed')) / overclock(); }
  function vacIntervalAt(x, y) { return vacInterval() / machineBoost(x, y); }
  function beltSpeed() { return ECON.beltSpeed * (1 + 0.20 * lvl('beltspeed')) * overclock(); }
  function truckCap() { return vehicle().cap + 5 * lvl('truckcap') + 4 * garageLevel('cargo'); }
  function hqMult() {
    const ks = Object.keys(S.hqs);
    if (!ks.length) return 1;
    return ks.some(k => S.storeys[k]) ? 0.85 : 0.9;      /* a dispatch office trims every trip */
  }
  function tripTimeTo(id) {
    const c = CITY_BY_ID[id] || city();
    const st = routeStyle(c.id);
    let m = st.time * Math.pow(0.92, garageLevel('engine'));
    const ev = eventAt(c.id);
    if (ev) m *= 1 + (ROAD_EVENT_BY_ID[ev.id].slow - 1) * (1 - 0.2 * garageLevel('tyres'));
    if (townWeather(c.id) === 'rain') m *= ROAD.rainSlow;
    return vehicle().trip * c.dist * Math.pow(0.85, lvl('route')) * Math.pow(0.75, lvl('fleet')) * hqMult() * m;
  }
  function tripTime() { return tripTimeTo(S.route); }
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
  function truckPayoutBase() {
    const c = city();
    /* bigger cities pay a premium, and a steeper one for rare eggs */
    let sum = S.truck.load.reduce((a, e) => a + eggValue(e.tier, e.golden, e.pol) * (1 + 0.08 * c.sky * e.tier), 0);
    sum *= c.mult;
    if (S.truck.load.length >= truckCap()) sum *= 1 + 0.06 * lvl('fullbonus');
    return Math.round(sum);
  }  function payMultTo(id) {
    const c = CITY_BY_ID[id] || city();
    const st = routeStyle(c.id);
    const ev = eventAt(c.id);
    return st.pay * (1 - st.toll) * (1 + 0.06 * garageLevel('cooler')) * (ev ? ROAD_EVENT_BY_ID[ev.id].pay : 1) * (S.factories[c.id] ? 1 + ROAD.factoryPay : 1);
  }
  function truckPayout() { return Math.round(truckPayoutBase() * payMultTo(S.route)); }


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
  /* ============================================================
     THE PAINT GRID
     Terrain is not placed in tiles - it is painted, on a grid of
     8px cells, four to a tile. Brushes are round and paint every
     cell they cover, so what you draw has organic edges.
     ============================================================ */
  const CELL_PX = 8;
  const ckey = (cx, cy) => cx + ',' + cy;
  function paintAt(x, y) { return S.paint[ckey(Math.floor(x / CELL_PX), Math.floor(y / CELL_PX))] || null; }
  /* what covers a whole tile, if anything covers most of it */
  function terrainAt(c, r) {
    const counts = {};
    let best = null, bn = 0;
    for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) {
      const k = S.paint[ckey(c * 2 + dx, r * 2 + dy)];
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
      if (counts[k] > bn) { bn = counts[k]; best = k; }
    }
    return bn >= 2 ? best : null;
  }
  function tileHasWater(c, r) {
    for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++)
      if (S.paint[ckey(c * 2 + dx, r * 2 + dy)] === 'water') return true;
    return false;
  }
  function inPond(x, y) { return paintAt(x, y) === 'water'; }
  /* how much quicker the crew move over the ground underfoot */
  function groundSpeed(x, y) {
    const t = paintAt(x, y);
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
    /* own anything on the road row and you may look over the road at the town */
    if (y1 >= PLOT_ROWS * PLOT_H * 16) y1 = WORLD.H;
    return { x0, y0, x1, y1 };
  }
  /* the tool dock floats over the foot of the screen. camPad is how many
     world pixels it covers, so the camera may scroll that much further
     down and no strip of your land is ever stuck behind the buttons. */
  let camPad = 0;
  function setCamPad(px) { camPad = Math.max(0, Math.round(px) || 0); clampCam(); }
  function getCamPad() { return camPad; }
  function clampCam() {
    const b = ownedBounds();
    const vw = WORLD.view.w, vh = WORLD.view.h;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const loX = Math.max(0, Math.min(b.x0, WORLD.W - vw));
    const hiX = Math.max(loX, Math.min(WORLD.W - vw, b.x1 - vw));
    const loY = Math.max(0, Math.min(b.y0, WORLD.H - vh));
    const hiY = Math.max(loY, Math.min(WORLD.H - vh, b.y1 - vh) + camPad);
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
    Object.keys(S.polishers).forEach(k => occ[k] = { type: 'polisher', k });
    box(S.graders, 'grader', 2, 1);
    two(S.dynamos, 'dynamo');
    Object.keys(S.beehives).forEach(k => occ[k] = { type: 'beehive', k });
    two(S.billboards, 'billboard');
    two(S.genelabs, 'genelab');
    two(S.kitchens, 'kitchen');
    box(S.parks, 'park', 3, 3);
    two(S.timemachines, 'timemachine');
    two(S.hrs, 'hr');
    two(S.canneries, 'cannery');
    Object.keys(S.composts).forEach(k => occ[k] = { type: 'compost', k });
    box(S.wormfarms, 'wormfarm', 2, 1);
    /* a site holds its footprint until the movers are done */
    Object.keys(S.sites).forEach(k => {
      const s = S.sites[k];
      if (s.kind !== 'build' || !BUILDS[s.type]) return;
      const [c, r] = k.split(',').map(Number);
      const b = BUILDS[s.type];
      for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) occ[key(c + dc, r + dr)] = { type: 'site', k };
    });
  }
  function isFence(x, y) { return !!S.fences[key(Math.floor(x / 16), Math.floor(y / 16))]; }
  const ROAD_ROW = Math.floor(WORLD.roadY / WORLD.T);   /* derived, never hardcode it */
  function inLayby(px, py) {
    const L = WORLD.layby;
    return px + 16 > L.x && px < L.x + L.w && py + 16 > L.y && py < L.y + L.h;
  }
  function tileBuildable(c, r) {
    const x = c * 16 + 8, y = r * 16 + 8;
    const p = plotAt(x, y);
    if (!p || !S.plots[p.id]) return false;
    if (r >= ROAD_ROW) return false;                    /* the road */
    if (inLayby(c * 16, r * 16)) return false;          /* the customers' lay-by */
    if (tileHasWater(c, r)) return false;               /* not in the water */
    if (r === p.tr && p.tr === 0) return false;         /* top tree line */
    const px = c * 16, py = r * 16;
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
      if (tileHasWater(c + dc, r + dr)) return false;
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
  function rollTier(base, extra) {
    let t = base, mutated = false;
    const capT = TIER_DIVINE;   /* mutations never reach Secret */
    if (t < capT && Math.random() < mutationChance() + (extra || 0)) {
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
  function layEgg(x, y, baseTier, fromPet, ch) {
    if (S.eggs.length >= ECON.groundEggCap) return null;
    const { tier, mutated } = rollTier(baseTier, ch ? ECON.geneSize * gene(ch, 'size') : 0);
    const golden = Math.random() < goldenChance() + (ch ? ECON.geneLuck * gene(ch, 'luck') + rankLuck(ch) : 0);
    const egg = spawnEgg(x + (Math.random() * 22 - 11), y + (Math.random() * 14 - 4), tier, golden, false);
    if (!egg) return null;
    S.stats.laid++;
    if (ch) countLay(ch);
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
      age: 1, fed: 1, raised: 1e9, food: 1,
      genes: rollGenes(sp.tier), mods: [],
    };
    S.chickens.push(ch);
    return ch;
  }

  /* ---------- genes: five per bird, the Gene Lab edits them ---------- */
  function rollGenes(tier) {
    const g = {};
    GENE_KEYS.forEach(k => { g[k] = Math.random() < 0.16 + tier * 0.04 ? 1 : 0; });
    return g;
  }
  function genesOf(ch) { if (!ch.genes) ch.genes = rollGenes(SPECIES[ch.sp].tier); return ch.genes; }
  function gene(ch, k) { return genesOf(ch)[k] || 0; }
  function chLayTime(ch) {
    const sp = SPECIES[ch.sp];
    let t = layTime(sp.tier) / (1 + ECON.geneLay * gene(ch, 'lay')) / (1 + rankSpeed(ch));
    if (sp.tier === TIER_DINO) t /= 1 + 0.2 * lvl('dinofeed');
    return t;
  }
  /* coins a minute this bird is good for, every gene counted */
  function chScore(ch) {
    const sp = SPECIES[ch.sp];
    const perMin = 60 / chLayTime(ch);
    const up = Math.min(TIER_DIVINE, sp.tier + 1);
    const pUp = Math.min(0.9, mutationChance() + ECON.geneSize * gene(ch, 'size'));
    const gold = Math.min(1, goldenChance() + ECON.geneLuck * gene(ch, 'luck'));
    const v = (eggValue(sp.tier, false) * (1 - pUp) + eggValue(up, false) * pUp) * (1 - gold + gold * ECON.goldenMult);
    return perMin * v;
  }
  function bestChickens(n) { return S.chickens.slice().sort((a, b) => chScore(b) - chScore(a)).slice(0, n || 3); }
  function hasGeneLab() { return Object.keys(S.genelabs).length > 0; }
  function geneLabSpot() {
    const k = Object.keys(S.genelabs)[0];
    if (!k) return { x: WORLD.mama.x + 30, y: WORLD.mama.y };
    const [c, r] = k.split(',').map(Number);
    return { x: c * 16 + 4, y: r * 16 + 34 };
  }
  function spliceCost() { return ECON.spliceFeathers; }
  function crossCost() { return ECON.crossFeathers; }
  function cloneCost(ch) { return { c: ECON.cloneCoins * eggValue(SPECIES[ch.sp].tier, false), f: ECON.cloneFeathers }; }
  function canSplice(t, d) {
    return lvl('splice') > 0 && hasGeneLab() && !!t && !!d && t !== d && S.feathers >= spliceCost();
  }
  /* the donor goes into the target: every gene the better of the two, one bird left */
  function splice(targetId, donorId) {
    const t = S.chickens.find(c => c.id === targetId), d = S.chickens.find(c => c.id === donorId);
    if (!canSplice(t, d)) return false;
    S.feathers -= spliceCost();
    const gt = genesOf(t), gd = genesOf(d);
    GENE_KEYS.forEach(k => { gt[k] = Math.min(ECON.geneMax, Math.max(gt[k] || 0, gd[k] || 0)); });
    t.mods = Array.from(new Set((t.mods || []).concat(d.mods || [])));
    S.chickens.splice(S.chickens.indexOf(d), 1);
    S.stats.edits++;
    note('genes', 'Spliced a ' + SPECIES[d.sp].name + ' into a ' + SPECIES[t.sp].name + '.', t.sp);
    emit('splice', { ch: t, x: t.x + 10, y: t.y });
    return true;
  }
  function canClone(ch) {
    if (!ch || lvl('clone') < 1 || !hasGeneLab() || S.chickens.length >= chickenCap()) return false;
    const c = cloneCost(ch);
    return S.coins >= c.c && S.feathers >= c.f;
  }
  function cloneChicken(id) {
    const ch = S.chickens.find(c => c.id === id);
    if (!canClone(ch)) return false;
    const cost = cloneCost(ch);
    S.coins -= cost.c; S.feathers -= cost.f;
    const p = geneLabSpot();
    const twin = spawnChicken(ch.sp, p.x, p.y);
    twin.genes = Object.assign({}, genesOf(ch));
    twin.mods = (ch.mods || []).slice();
    S.stats.edits++;
    note('genes', 'Cloned a ' + SPECIES[ch.sp].name + '.', ch.sp);
    emit('clone', { ch: twin, x: twin.x + 10, y: twin.y });
    return true;
  }
  function canCross(ch, animalId) {
    const a = ANIMAL_BY_ID[animalId];
    return !!ch && !!a && lvl('crossbreed') > 0 && hasGeneLab() && S.feathers >= crossCost() && gene(ch, a.gene) < ECON.geneMax;
  }
  function crossAnimal(id, animalId) {
    const ch = S.chickens.find(c => c.id === id);
    if (!canCross(ch, animalId)) return false;
    const a = ANIMAL_BY_ID[animalId];
    S.feathers -= crossCost();
    genesOf(ch)[a.gene] = Math.min(ECON.geneMax, gene(ch, a.gene) + 1);
    ch.mods = ch.mods || [];
    if (!ch.mods.includes(a.mark)) ch.mods.push(a.mark);
    S.stats.edits++;
    note('genes', 'Crossed a ' + SPECIES[ch.sp].name + ' with a ' + a.name.toLowerCase() + '.', ch.sp);
    emit('cross', { ch, animal: a, x: ch.x + 10, y: ch.y });
    return true;
  }
  function isChick(ch) { return (ch.age === undefined ? 1 : ch.age) < 1; }
  /* A chick has two things to get through before it is a laying bird:
     enough feed, and enough time. Neither one on its own will do it -
     you cannot rush a bird by tipping the whole barn over it, and it
     will not grow on time alone if nobody feeds it. */
  function growPellets() { return Math.max(3, ECON.chickPellets - 2 * lvl('hearty')); }
  function growTime() { return ECON.growTime * Math.pow(0.88, lvl('hearty')); }
  /* how far along a chick is: the lesser of what it has eaten and how
     long it has been growing */
  function growAge(ch) {
    const fed = ch.fed === undefined ? (ch.age === undefined ? 1 : ch.age) : ch.fed;
    const t = ch.raised === undefined ? 1e9 : ch.raised;
    return Math.max(0, Math.min(1, Math.min(fed, t / growTime())));
  }
  function nearCoop(x, y) {
    return Object.keys(S.coops).some(k => {
      const [c, r] = k.split(',').map(Number);
      return Math.hypot(c * 16 + 16 - x, r * 16 + 16 - y) < ECON.coopR;
    });
  }
  /* a chicken eats one pellet: chicks grow, adults fill up and lay faster */
  function eat(ch, f) {
    const prem = f && f.prem ? 3 : 1;
    ch.eat = 1.1;                                       /* the pecking animation */
    if (isChick(ch)) {
      ch.fed = Math.min(1, (ch.fed || 0) + (prem > 1 ? 2 : 1) / growPellets());
      ch.food = 1;
    } else {
      ch.food = 1;
      ch.buffT = Math.max(ch.buffT || 0, ECON.feedBuff * (1 + 0.5 * lvl('feedplus')) * prem);
    }
    emit('eat', { ch, prem: prem > 1 });
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
      let ht = rainbow ? TIER_SECRET : t;
      if (!rainbow && ht < TIER_DIVINE && Math.random() < 0.05 * lvl('miracle')) ht++;
      const sp = pickSpecies(ht);
      const isNew = !S.disc.includes(sp.id);
      if (isNew) S.disc.push(sp.id);
      const f = featherFor(ht, isNew);
      dropPlumes(x, y + 6, f);
      S.stats.hatched++;
      if (sp.tier === TIER_DINO) S.stats.dinos++;
      else if (sp.tier === TIER_MOON) S.stats.celestial++;
      const born = spawnChicken(sp.id, x, y);
      born.age = 0;
      born.fed = 0;
      born.raised = 0;
      born.food = 1;
      if (S.autoMark >= 0 && sp.tier < S.autoMark) born.marked = true;
      births.push({ sp, feathers: f, isNew, miracle: !rainbow && ht > t });
      if (isNew) { mark('pedia'); note('species', 'Met ' + sp.name + ' for the first time.', sp.id); }
      if (S.stats.hatched === 1) note('first', 'The very first egg hatched on the ranch.', sp.id);
    };
    once(tier);
    if (!rainbow && Math.random() < 0.04 * lvl('twins')) once(tier);
    if (births.length) emit('hatch', { births, x, y, rainbow });
    if (rainbow && births.length) findSecret('rainbow');
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

  /* ============================================================
     BUGS
     Worms, grubs, beetles, crickets and snails. They come up when
     you dig, when it rains, and out of a compost heap on their own.
     A loose bug crawls about until something eats it or it burrows
     back down; a hen will drop what she is doing and run one down,
     and it is worth several pellets to her. What you catch by hand
     goes in the jar, and the jar can be scattered over the flock.
     ============================================================ */
  let bugId = 1;
  const BUG_LIFE = 26;                       /* seconds above ground */
  function bugsOn() { return true; }
  function pickBugKind(deep) {
    /* the spade turns up commoner things near the surface */
    let roll = Math.random() * BUG_FIND_TOTAL;
    for (const k of BUG_KEYS) {
      roll -= BUGS[k].find * (deep ? 1 : (BUGS[k].find > 20 ? 1.4 : 0.7));
      if (roll <= 0) return k;
    }
    return 'worm';
  }
  function spawnBug(kind, x, y) {
    if (S.bugs.length > 40) return null;
    const b = { id: bugId++, kind: kind || pickBugKind(false), x, y,
      dir: Math.random() < 0.5 ? -1 : 1, state: 'up', t: 0, ph: Math.random() * 6, hop: 0 };
    S.bugs.push(b);
    emit('bugup', { bug: b, x, y });
    return b;
  }
  /* the spade: turn over a patch and see what is in it */
  function digAt(x, y) {
    if (!inOwned(x, y) || inPond(x, y)) return null;
    S.stats.dug = (S.stats.dug || 0) + 1;
    const tk = key(Math.floor(x / 16), Math.floor(y / 16));
    const soil = !!S.soil[tk];                       /* turned earth is richer */
    const compost = nearCompost(x, y);
    let n = 0;
    const chance = (soil ? 0.62 : 0.34) + (compost ? 0.3 : 0) + 0.06 * lvl('wormfarm');
    if (Math.random() < chance) n = 1;
    if (n && Math.random() < (soil ? 0.3 : 0.12) + (compost ? 0.2 : 0)) n = 2;
    const found = [];
    for (let i = 0; i < n; i++) {
      const b = spawnBug(pickBugKind(soil || compost), x + (i ? 6 : 0) - 3, y + (i ? 3 : 0));
      if (b) found.push(b);
    }
    emit('dig', { x, y, found, soil });
    if (found.length && !S.tut.bug) { S.tut.bug = 1; emit('firstbug', { bug: found[0] }); }
    return found;
  }
  function nearCompost(x, y) {
    for (const k of Object.keys(S.composts)) {
      const [c, r] = k.split(',').map(Number);
      if (Math.abs(c * 16 + 8 - x) < 40 && Math.abs(r * 16 + 8 - y) < 40) return true;
    }
    return false;
  }
  function bugAt(x, y) {
    for (let i = S.bugs.length - 1; i >= 0; i--) {
      const b = S.bugs[i];
      if (Math.abs(b.x - x) < 7 && Math.abs(b.y - y) < 6) return b;
    }
    return null;
  }
  /* pick one up: into the jar, and the hens lose their lunch */
  function catchBug(b) {
    const i = S.bugs.indexOf(b);
    if (i === -1) return false;
    S.bugs.splice(i, 1);
    S.bugjar[b.kind] = (S.bugjar[b.kind] || 0) + 1;
    S.stats.bugsCaught = (S.stats.bugsCaught || 0) + 1;
    S.chickens.forEach(ch => { if (ch.target === b) { ch.target = null; ch.state = 'idle'; ch.t = 0.4; } });
    emit('bugcatch', { bug: b });
    return true;
  }
  function jarCount() { return BUG_KEYS.reduce((t, k) => t + (S.bugjar[k] || 0), 0); }
  function jarValue() { return BUG_KEYS.reduce((t, k) => t + (S.bugjar[k] || 0) * BUGS[k].value, 0); }
  /* tip a handful out over the flock */
  function scatterBugs(n) {
    let left = Math.min(n || 6, jarCount());
    if (!left) return 0;
    let out = 0;
    const flock = S.chickens.length ? S.chickens : null;
    while (left > 0) {
      const kind = BUG_KEYS.find(k => (S.bugjar[k] || 0) > 0);
      if (!kind) break;
      const host = flock ? flock[(Math.random() * flock.length) | 0] : null;
      const x = host ? host.x + 10 + (Math.random() * 40 - 20) : WORLD.mama.x + (Math.random() * 40 - 20);
      const y = host ? host.y + 14 + (Math.random() * 24 - 12) : WORLD.mama.y + 20;
      if (!inOwned(x, y) || inPond(x, y)) { left--; continue; }
      S.bugjar[kind]--;
      if (S.bugjar[kind] <= 0) delete S.bugjar[kind];
      spawnBug(kind, x, y);
      out++; left--;
    }
    if (out) emit('bugscatter', { n: out });
    return out;
  }
  /* sell the jar to the roadside trade */
  function sellJar() {
    const v = jarValue();
    if (!v) return 0;
    S.bugjar = {};
    earn(v);
    emit('bugsold', { v });
    return v;
  }
  function nearestBug(x, y, R) {
    let best = null, bd = R * R;
    for (const b of S.bugs) {
      if (b.state === 'down') continue;
      const d = (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y);
      if (d < bd) { best = b; bd = d; }
    }
    return best;
  }
  /* a hen catches one: a full belly and a spell of laying twice as fast */
  function eatBug(ch, b) {
    const B = BUGS[b.kind] || BUGS.worm;
    const i = S.bugs.indexOf(b);
    if (i !== -1) S.bugs.splice(i, 1);
    ch.eat = 1.1;
    if (isChick(ch)) {
      ch.fed = Math.min(1, (ch.fed || 0) + 3 / growPellets());
      ch.food = 1;
      ch.raised = (ch.raised || 0) + 6;
    } else {
      ch.food = 1;
      ch.buffT = Math.max(ch.buffT || 0, B.buff * (1 + 0.5 * lvl('feedplus')));
    }
    S.stats.bugsEaten = (S.stats.bugsEaten || 0) + 1;
    emit('bugeat', { ch, bug: b, x: ch.x + 10, y: ch.y + 8 });
    if (S.stats.bugsEaten === 1) note('bugeat', 'A hen ran down her first worm. Bugs beat pellets every time.', SPECIES[ch.sp]);
    return true;
  }
  function tickBugs(dt) {
    /* compost heaps breed their own, and the worm farm fills the jar */
    for (const k of Object.keys(S.composts)) {
      const h = S.composts[k];
      h.t = (h.t || 0) + dt;
      const every = 26 / storeyMult(k);
      if (h.t > every) {
        h.t = 0;
        const [c, r] = k.split(',').map(Number);
        if (S.bugs.length < 16) spawnBug(pickBugKind(true), c * 16 + 8 + (Math.random() * 20 - 10), r * 16 + 14 + (Math.random() * 12 - 6));
      }
    }
    for (const k of Object.keys(S.wormfarms)) {
      const w = S.wormfarms[k];
      w.t = (w.t || 0) + dt;
      const every = 9 / storeyMult(k);
      if (w.t > every) {
        w.t = 0;
        if (jarCount() < 90) {
          const kind = Math.random() < 0.72 ? 'worm' : pickBugKind(true);
          S.bugjar[kind] = (S.bugjar[kind] || 0) + 1;
          emit('bugfarm', { kind, c: k });
        }
      }
    }
    /* rain brings worms up all over the ranch */
    if (S.weather.rain && S.bugs.length < 14 && Math.random() < dt * 0.5) {
      const p = PLOTS.find(pl => S.plots[pl.id]);
      if (p) {
        const x = p.tc * 16 + 8 + Math.random() * (PLOT_W * 16 - 16);
        const y = p.tr * 16 + 8 + Math.random() * (PLOT_H * 16 - 16);
        if (inOwned(x, y) && !inPond(x, y)) spawnBug('worm', x, y);
      }
    }
    for (let i = S.bugs.length - 1; i >= 0; i--) {
      const b = S.bugs[i];
      const B = BUGS[b.kind] || BUGS.worm;
      b.t += dt;
      b.ph += dt * (b.kind === 'cricket' ? 9 : 4);
      if (b.t > BUG_LIFE) {                    /* gone back down */
        S.bugs.splice(i, 1);
        emit('bugdown', { bug: b, x: b.x, y: b.y });
        continue;
      }
      /* crickets hop, everything else crawls */
      if (b.kind === 'cricket') {
        b.hop = Math.max(0, (b.hop || 0) - dt);
        if (b.hop <= 0 && Math.random() < dt * 1.2) { b.hop = 0.42; b.dir = Math.random() < 0.5 ? -1 : 1; }
        if (b.hop > 0) {
          const nx = b.x + b.dir * 46 * dt;
          if (inOwned(nx, b.y) && !inPond(nx, b.y)) b.x = nx; else b.dir *= -1;
        }
      } else {
        const sp = b.kind === 'snail' ? 2.5 : b.kind === 'beetle' ? 11 : 5;
        const nx = b.x + b.dir * sp * dt;
        const ny = b.y + Math.sin(b.ph * 0.5) * 3 * dt;
        if (inOwned(nx, ny) && !inPond(nx, ny)) { b.x = nx; b.y = ny; } else b.dir *= -1;
      }
    }
  }

  function tickChicken(ch, dt) {
    ch.t -= dt;
    ch.petCd = Math.max(0, ch.petCd - dt);
    ch.buffT = Math.max(0, ch.buffT - dt);
    if (ch.eat > 0) ch.eat -= dt;
    if (ch.age === undefined) ch.age = 1;
    if (ch.food === undefined) ch.food = 1;
    const chick = isChick(ch);
    if (chick) {
      /* a coop keeps them warm, so they come on twice as fast in one */
      ch.raised = (ch.raised || 0) + dt * (nearCoop(ch.x + 10, ch.y + 10) ? 2 : 1);
      const was = ch.age;
      ch.age = growAge(ch);
      if (was < 1 && ch.age >= 1) {
        ch.lay = layTime(SPECIES[ch.sp].tier) * 0.5;
        S.stats.grown++;
        emit('grown', { ch });
        if (S.stats.grown === 1) note('grown', 'The first chick grew up. It lays now.', ch.sp);
      }
    }
    ch.food = Math.max(0, ch.food - dt / (ECON.hungerTime * (1 + 0.25 * lvl('slowbelly')) * (1 + ECON.geneHardy * gene(ch, 'hardy'))));
    /* a plumed bird sheds the odd feather for you to sweep up */
    if (!chick && gene(ch, 'plume')) {
      ch.shed = (ch.shed || 0) + dt;
      if (ch.shed > 150 / gene(ch, 'plume')) { ch.shed = 0; dropPlumes(ch.x + 10, ch.y + 10, 1); }
    }
    /* a bug beats anything in a trough: she will cross the yard for one,
       and the chicks are keenest of all */
    if (S.bugs.length && ch.state !== 'chase' && (chick || ch.food < 0.92 || ch.buffT <= 0)) {
      const bug = nearestBug(ch.x + 10, ch.y + 12, chick ? 130 : 96);
      if (bug) { ch.state = 'chase'; ch.target = bug; ch.t = 7; }
    }
    if (ch.state === 'chase') {
      const b = ch.target;
      if (!b || S.bugs.indexOf(b) === -1) { ch.state = 'idle'; ch.t = 0.4; ch.target = null; }
      else {
        const dx = b.x - (ch.x + 10), dy = b.y - (ch.y + 14);
        const d = Math.hypot(dx, dy) || 1;
        if (d < 7) { eatBug(ch, b); ch.state = 'peck'; ch.t = 0.9; ch.target = null; }
        else {
          ch.dir = dx > 0 ? 1 : -1;
          /* a chase is a run, not a stroll */
          const sp = 34 + (chick ? 6 : 0);
          const nx = ch.x + (dx / d) * sp * dt, ny = ch.y + (dy / d) * sp * dt;
          if (inOwned(nx + 10, ny + 12) && !inPond(nx + 10, ny + 12) && !isFence(nx + 10, ny + 16) && ny < WORLD.roadY - 24) { ch.x = nx; ch.y = ny; }
          else { ch.state = 'idle'; ch.t = 0.6; ch.target = null; }
        }
        return;
      }
    }
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
          eat(ch, f);
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
      ch.lay = chLayTime(ch);
      layEgg(ch.x + 10, ch.y + 16, sp.tier, false, ch);
    }
  }

  /* ---------- petting / grabbing ---------- */
  function petMama() {
    if (S.mama.petCd > 0) return false;
    /* a hungry grandma will take the fuss but she has no egg to give */
    if (mamaHungry()) { S.mama.petCd = 1.2; emit('mamahungry', {}); return 'hungry'; }
    S.mama.petCd = petCd(true);
    S.mama.belly = Math.max(0, mamaBelly() - (ECON.mamaPetCost || 1) / ECON.mamaPellets);
    S.stats.pets++;
    S.stats.mamaPets++;
    layEgg(WORLD.mama.x, WORLD.mama.y + 8, S.mamaTier, true);
    return true;
  }
  function petChicken(ch) {
    if (ch.petCd > 0) return false;
    ch.petCd = petCd(false);
    S.stats.pets++;
    if (isChick(ch)) {
      /* a fuss is worth about a beakful, no more */
      ch.fed = Math.min(1, (ch.fed || 0) + 0.04);
      ch.age = growAge(ch);
      return true;
    }
    layEgg(ch.x + 10, ch.y + 14, SPECIES[ch.sp].tier, true, ch);
    if (SPECIES[ch.sp].tier === TIER_DINO) findSecret('dinopet');
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
      let why = null;
      if (o && o.type === 'lovenest') {
        const nest = S.nests[o.k];
        if (nest.slots.filter(Boolean).length < 2 && nest.cd <= 0) {
          nest.slots[nest.slots[0] ? 1 : 0] = { sp: ch.sp };
          if (nest.slots[0] && nest.slots[1]) nest.prog = 0.0001;
          return 'nested';
        }
      }
      /* the park: on show. the kitchen: in the pot. */
      if (o && o.type === 'park') {
        const res = parkAdd(o.k, ch);
        if (res === true) return 'exhibited';
        why = 'park-' + res;
      }
      if (o && o.type === 'kitchen') {
        const res = kitchenRoast(o.k, ch);
        if (res === 'roasting') return 'roasting';
        why = 'kitchen-' + res;
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
      return why || 'dropped';
    }
    /* egg */
    const e = held.egg;
    const c = Math.floor(x / 16), r = Math.floor(y / 16);
    const ord = orderAt(x, y);
    if (ord && giveEgg(ord, e)) return 'ordered';
    const o = occ[key(c, r)];
    if (o && o.type === 'kitchen' && kitchenAdd(o.k, e)) return 'pantry';
    if (o && o.type === 'incubator') {
      const inc = S.incs[o.k];
      if (inc.queue.length < incCapAt(o.k)) { inc.queue.push(e); return 'incubated'; }
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
    while (S.basket.length && inc.queue.length < incCapAt(k)) { inc.queue.push(S.basket.pop()); n++; }
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
      S.feed.push({ x: x + (Math.random() * 18 - 9), y: y + (Math.random() * 12 - 6), n: 1, prem: S.premiumT > 0 ? 1 : 0 });
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
    if (r >= ROAD_ROW) return false;
    if (inLayby(c * 16, r * 16)) return false;
    if (r === p.tr && p.tr === 0) return false;
    const px = c * 16, py = r * 16;
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
    if (!tileFree(c, r)) return false;
    /* you can till straight over a path, but not over open water */
    return !tileHasWater(c, r);
  }

  /* ---- shaping the ground with a brush ---- */
  function terrainCost(kind) { return (TERRAIN[kind] || {}).cost || 0; }
  function terrainOpen(kind) {
    const d = TERRAIN[kind];
    return !!d && (!d.needs || lvl(d.needs) > 0);
  }
  /* a cell can be painted if you own the ground under it and nothing is built there */
  function cellPaintable(cx, cy) {
    const x = cx * CELL_PX + 4, y = cy * CELL_PX + 4;
    const c = Math.floor(x / 16), r = Math.floor(y / 16);
    if (!tileOpen(c, r)) return false;
    if (occ[key(c, r)] || S.soil[key(c, r)] || S.deco[key(c, r)]) return false;
    return true;
  }
  /* paint one round dab. returns how many cells actually changed. */
  function dab(kind, x, y, radius) {
    if (kind !== 'flat' && !terrainOpen(kind)) return 0;
    const rr = Math.max(0.5, radius);
    const cx0 = Math.floor((x - rr) / CELL_PX), cx1 = Math.floor((x + rr) / CELL_PX);
    const cy0 = Math.floor((y - rr) / CELL_PX), cy1 = Math.floor((y + rr) / CELL_PX);
    let n = 0;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const px = cx * CELL_PX + CELL_PX / 2, py = cy * CELL_PX + CELL_PX / 2;
      /* a soft round edge: cells right on the rim only take about half the time,
         which is what stops a brush stroke looking like a staircase */
      const d = Math.hypot(px - x, py - y);
      if (d > rr + 3) continue;
      if (d > rr && ((cx * 7 + cy * 13) % 5) < 3) continue;
      const k = ckey(cx, cy);
      if (kind === 'flat') {
        if (!S.paint[k]) continue;
        /* rubbing out soil takes the (empty) plot with it */
        if (S.paint[k] === 'soil') {
          const t = S.soil[key(Math.floor(cx / 2), Math.floor(cy / 2))];
          if (t && t.crop) continue;
          if (t) delete S.soil[key(Math.floor(cx / 2), Math.floor(cy / 2))];
        }
        delete S.paint[k]; n++;
        continue;
      }
      if (S.paint[k] === kind) continue;
      if (!cellPaintable(cx, cy)) continue;
      const fresh = !S.paint[k];
      if (fresh) {
        if (S.coins < terrainCost(kind) / 4) continue;
        S.coins -= terrainCost(kind) / 4;
      }
      S.paint[k] = kind;
      /* now and then the spade turns up something that is not water */
      if (kind === 'water' && fresh && Math.random() < fossilOdds()) dropFossil(px, py - 4);
      n++;
    }
    if (n) { S.stats.shaped += n; if (S.stats.shaped === n) note('shape', 'Started shaping the land.'); }
    return n;
  }
  /* a whole stroke, so a fast drag leaves no gaps */
  function stroke(kind, x0, y0, x1, y1, radius) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(d / Math.max(1, radius * 0.6)));
    let n = 0;
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      n += dab(kind, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius);
    }
    if (n) emit('paint', { kind, x0, y0, x1, y1, radius });
    return n;
  }
  function paintedCells() { return Object.keys(S.paint).length; }

  /* ---- decorations ---- */
  function canDecorate(kind, c, r) {
    const d = DECOS[kind];
    if (!d) return false;
    if (tileHasWater(c, r)) return false;
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
  const WARDEN_TREES = ['tree', 'pine', 'apple', 'bamboo'];
  const WARDEN_LINES = [
    'I speak for the trees. The trees are unavailable.',
    'That one was ninety years old. You had it down in four seconds.',
    'Every one you fell, I have to write up. Do you know the paperwork?',
    'I am not angry. I am orange. It reads as angry.',
    'Plant another and I will consider forgetting this.',
    'A raccoon in a top hat. I might have known.',
  ];
  function undecorate(c, r) {
    const k = key(c, r), d = S.deco[k];
    if (!d) return false;
    S.coins += Math.round(DECOS[d.kind].cost * ECON.decoRefund);
    const felled = DECOS[d.kind] && WARDEN_TREES.includes(DECOS[d.kind].kind);
    delete S.deco[k];
    emit('decorate', { c, r, kind: null });
    /* fell a tree and somebody comes out from under the stump about it */
    if (felled && !S.warden && Math.random() < 0.4) {
      S.warden = { x: c * 16 + 2, y: r * 16 + 15, t: 0, T: 11, said: Math.floor(Math.random() * WARDEN_LINES.length), paid: false, going: 0 };
      emit('warden', { x: S.warden.x, y: S.warden.y, line: WARDEN_LINES[S.warden.said] });
    }
    return true;
  }
  function warden() { return S.warden; }
  function wardenLine() { return S.warden ? WARDEN_LINES[S.warden.said % WARDEN_LINES.length] : null; }
  function tickWarden(dt) {
    const w = S.warden;
    if (!w) return;
    w.t += dt;
    if (w.t > w.T) { w.going += dt; w.x += 26 * dt; if (w.going > 2.5) S.warden = null; }
  }
  function wardenAt(x, y) {
    const w = S.warden;
    if (!w) return null;
    return (x > w.x - 4 && x < w.x + 18 && y > w.y - 24 && y < w.y + 4) ? w : null;
  }
  /* tap him once and he hands over a bribe of feathers, under protest */
  function tapWarden() {
    const w = S.warden;
    if (!w) return 0;
    w.said = (w.said + 1) % WARDEN_LINES.length;
    w.t = Math.min(w.t, 1);
    findSecret('warden');
    if (w.paid) return 0;
    w.paid = true;
    const f = 30 + Math.floor(Math.random() * 40);
    dropPlumes(w.x + 6, w.y - 6, f);
    return f;
  }
  function decoAt(c, r) { return S.deco[key(c, r)] || null; }
  /* soil lives on the paint grid like every other ground kind, so a
     ploughed field gets the same soft dithered edge as a path or a pond
     instead of a staircase of square tiles. the crop itself still hangs
     off the 16px tile, which is where growth and water are kept. */
  function soilCells(c, r, fn) {
    for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) fn(ckey(c * 2 + dx, r * 2 + dy));
  }
  function till(c, r) {
    if (!canTill(c, r)) return false;
    soilCells(c, r, k => { S.paint[k] = 'soil'; });
    S.soil[key(c, r)] = { crop: null, growth: 0, water: 0, seed: Math.floor(Math.random() * 999) };
    emit('till', { c, r });
    return true;
  }
  /* till everything the brush sweeps over, so a field is one drag */
  function tillStroke(x0, y0, x1, y1, radius) {
    const rr = Math.max(8, radius);
    const lo = p => Math.floor((p - rr) / 16), hi = p => Math.floor((p + rr) / 16);
    let n = 0;
    for (let r = lo(Math.min(y0, y1)); r <= hi(Math.max(y0, y1)); r++)
      for (let c = lo(Math.min(x0, x1)); c <= hi(Math.max(x0, x1)); c++) {
        const px = c * 16 + 8, py = r * 16 + 8;
        if (segDist(px, py, x0, y0, x1, y1) > rr) continue;
        if (till(c, r)) n++;
      }
    return n;
  }
  /* shortest distance from a point to the segment the brush just swept */
  function segDist(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len)) : 0;
    return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
  }
  function untill(c, r) {
    const k = key(c, r), t = S.soil[k];
    if (!t) return false;
    if (t.crop) return false;
    delete S.soil[k];
    soilCells(c, r, ck => { if (S.paint[ck] === 'soil') delete S.paint[ck]; });
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
    if (!t || lvl('wateringcan') < 1) return false;
    if (t.water <= 0) S.stats.watered++;
    t.water = 1;
    emit('water', { c, r });
    return true;
  }
  /* bees nearby hurry a crop along */
  function beeBoost(c, r) {
    const x = c * 16 + 8, y = r * 16 + 8;
    for (const k of Object.keys(S.beehives)) {
      const [bc, br] = k.split(',').map(Number);
      if (Math.hypot(bc * 16 + 8 - x, br * 16 + 8 - y) < ECON.beehiveR * (S.storeys[k] ? 1.25 : 1)) return 1 + ECON.beehiveBoost;
    }
    return 1;
  }
  function cropSpeed(c, r) { return (1 + 0.15 * lvl('farming')) * beeBoost(c, r); }
  /* seconds to ripe if it stays watered */
  function cropTimeLeft(t, c, r) { return t.crop ? Math.max(0, (1 - t.growth) * CROPS[t.crop].grow / cropSpeed(c, r)) : 0; }
  function tickBees(dt) {
    for (const k of Object.keys(S.beehives)) {
      const b = S.beehives[k];
      b.t = (b.t || 0) + dt * storeyMult(k);
      if (b.t >= ECON.honeyEvery) {
        b.t -= ECON.honeyEvery;
        const [c, r] = k.split(',').map(Number);
        const v = Math.round(ECON.honeyValue * tycoon());
        earn(v, 'honey');
        S.stats.honey++;
        emit('honey', { x: c * 16 + 8, y: r * 16, v });
      }
    }
  }
  function wateredBy(c, r) {
    const x = c * 16 + 8, y = r * 16 + 8;
    for (const k of Object.keys(S.wells)) {
      const [wc, wr] = k.split(',').map(Number);
      if (Math.hypot(wc * 16 + 8 - x, wr * 16 + 8 - y) < ECON.wellR * (S.storeys[k] ? 1.25 : 1)) return 'well';
    }
    for (const k of Object.keys(S.sprinklers)) {
      const [wc, wr] = k.split(',').map(Number);
      if (Math.hypot(wc * 16 + 8 - x, wr * 16 + 8 - y) < ECON.sprinklerR * (S.storeys[k] ? 1.25 : 1)) return 'sprinkler';
    }
    return null;
  }
  function cropStage(t) {
    const d = CROPS[t.crop];
    return Math.min(d.stages - 1, Math.floor(t.growth * d.stages));
  }
  function ripe(t) { return !!t.crop && t.growth >= 1; }
  function harvestYield(crop) {
    return Math.round(CROPS[crop].yield * (1 + 0.20 * lvl('bumper')) * (1 + 0.25 * Object.keys(S.mills).reduce((a, k) => a + storeyMult(k), 0)));
  }
  function harvest(c, r, auto) {
    const k = key(c, r), t = S.soil[k];
    if (!t || !ripe(t)) return 0;
    if (!auto && lvl('sickle') < 1) return 0;            /* you need the sickle in hand */
    const d = CROPS[t.crop];
    const n = harvestYield(t.crop);
    addFeed(n, c * 16 + 8, r * 16 + 8);
    S.stats.harvested++;
    /* and a share of the crop itself goes to the pantry */
    const pid = PRODUCE_BY_CROP[t.crop];
    if (pid) {
      const pn = 1 + (Math.random() < 0.15 + 0.08 * lvl('bumper') ? 1 : 0);
      S.pantry[pid] = (S.pantry[pid] || 0) + pn;
      S.stats.produce += pn;
      emit('produce', { c, r, id: pid, n: pn });
    }
    if (lvl('amber') && Math.random() < 0.04) dropFossil(c * 16 + 8, r * 16 + 2);
    /* no seeds come back: the next packet is bought */
    if (d.regrow) t.growth = 0.3;
    else { t.crop = null; t.growth = 0; }
    emit('harvest', { c, r, crop: d, id: t.crop || null, n });
    return n;
  }
  function tickFarm(dt) {
    for (const k of Object.keys(S.soil)) {
      const t = S.soil[k];
      const [c, r] = k.split(',').map(Number);
      const auto = wateredBy(c, r) || S.weather.rain;
      if (auto) t.water = 1;
      else t.water = Math.max(0, (t.water || 0) - dt / ECON.waterLast);
      if (!t.crop) continue;
      if (t.growth < 1) {
        /* a dry crop simply waits */
        if (t.water <= 0) { t.dry = (t.dry || 0) + dt; continue; }
        t.dry = 0;
        const d = CROPS[t.crop];
        t.growth = Math.min(1, t.growth + dt / d.grow * cropSpeed(c, r));
        if (t.growth >= 1) emit('ripe', { c, r });
      } else if (lvl('harvestbot')) {
        t.auto = (t.auto || 0) + dt;
        if (t.auto > 4) { t.auto = 0; harvest(c, r, true); }
      }
    }
  }

  /* ---------- weather: a shower now and then, and a rainbow after ---------- */
  function tickWeather(dt) {
    const w = S.weather;
    if (w.rain) {
      w.left -= dt;
      if (w.left <= 0) { w.rain = false; w.after = 14; w.t = ECON.rainEvery * (0.6 + Math.random() * 0.8); emit('rainend', {}); }
    } else {
      if (w.after > 0) w.after -= dt;
      w.t -= dt;
      if (w.t <= 0) { w.rain = true; w.left = ECON.rainLength * (0.7 + Math.random() * 0.8); S.stats.rains++; emit('rain', {}); }
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
    /* with a food truck licence, whatever is on the counters rides along */
    if (lvl('foodtruck')) {
      let food = 0, n = 0;
      Object.values(S.kitchens).forEach(kt => { kt.counter.forEach(d => { food += d.value; n++; }); kt.sold += kt.counter.length; kt.counter = []; });
      if (n) { tr.pay += food; S.stats.dishes += n; tr.food = n; }
    }
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
  function depotOpen() { return lvl('logistics') > 0; }
  function buyVehicle() {
    const next = VEHICLES[S.vehicle + 1];
    if (!depotOpen() || !next || S.coins < next.cost || S.truck.state !== 'parked') return false;
    S.coins -= next.cost;
    S.vehicle++;
    note('wheels', 'Traded up to the ' + next.name + '.');
    emit('vehicle', { v: next });
    return true;
  }
  function buyRoute(id) {
    const c = CITY_BY_ID[id];
    if (!depotOpen() || !c || S.routes.includes(id) || S.coins < c.cost) return false;
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
        earn(pay, 'sales');
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
    /* the polisher and the grader sit in a line like any other belt
       piece, so an egg standing on one keeps rolling the way they face */
    const po = S.polishers[k];
    if (po) return po.dir;
    const g = occ[k];
    if (g && g.type === 'grader' && S.graders[g.k]) return S.graders[g.k].dir;
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
      /* the polisher buffs whatever rolls over it; the grader now and
         then bumps an egg a whole tier. both pass the egg straight on,
         so they sit in the middle of a line like any other belt piece. */
      if (target && target.type === 'polisher') {
        if (!it.pol) {
          it.pol = true;
          S.polishers[target.k].n++;
          S.stats.polished = (S.stats.polished || 0) + 1;
          emit('polish', { x: nx, y: ny });
        }
        it.x = nx; it.y = ny; continue;
      }
      if (target && target.type === 'grader') {
        const g = S.graders[target.k];
        if (!it.graded) {
          it.graded = true;
          g.n++;
          if (it.tier < TIER_DIVINE && Math.random() < ECON.gradeChance * machineBoost(nx, ny)) {
            it.tier++;
            g.up++;
            S.stats.graded = (S.stats.graded || 0) + 1;
            emit('grade', { x: nx, y: ny, tier: it.tier });
          }
        }
        it.x = nx; it.y = ny; continue;
      }
      if (target && (target.type === 'belt' || target.type === 'sorter' || target.type === 'splitter')) {
        it.x = nx; it.y = ny; continue;
      }
      if (target && target.type === 'hatchery') {
        const h = S.hatchers[target.k];
        if (h.queue.length < ECON.hatcheryCap) {
          h.queue.push({ tier: it.tier, golden: it.golden, rainbow: it.rainbow, pol: it.pol });
          S.items.splice(i, 1);
        }
        continue;
      }
      if (target && target.type === 'loader') {
        const ld = S.loaders[target.k];
        if (ld.store.length < 20) {
          ld.store.push({ tier: it.tier, golden: it.golden, rainbow: it.rainbow, pol: it.pol });
          S.items.splice(i, 1);
        }
        continue;
      }
      if (target && target.type === 'incubator') {
        const inc = S.incs[target.k];
        if (inc.queue.length < incCap()) {
          inc.queue.push({ tier: it.tier, golden: it.golden, rainbow: it.rainbow, pol: it.pol });
          S.items.splice(i, 1);
        }
        continue;
      }
      if (target && target.type === 'kitchen') {
        if (kitchenAdd(target.k, { tier: it.tier, golden: it.golden, rainbow: it.rainbow, pol: it.pol })) S.items.splice(i, 1);
        continue;
      }
      if (target && target.type === 'silo') {
        const silo = S.silos[target.k];
        if (silo.store.length < ECON.siloCap) {
          silo.store.push({ tier: it.tier, golden: it.golden, rainbow: it.rainbow, pol: it.pol });
          S.items.splice(i, 1);
        }
        continue;
      }
      if (ny >= WORLD.roadY) {
        const th = WORLD.truckHome;
        if (S.truck.state === 'parked' && nx > th.x - 6 && nx < th.x + th.w + 6) {
          if (S.truck.load.length < truckCap()) {
            S.truck.load.push({ tier: it.tier, golden: it.golden, rainbow: it.rainbow, pol: it.pol });
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
      inc.prog += dt * machineBoost(c * 16 + 16, r * 16 + 16) * storeyMult(k);
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
      h.prog += dt * 2 * machineBoost(cx, cy) * storeyMult(k);
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
      nest.prog += dt * storeyMult(k);
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
        if (tier < TIER_DIVINE && Math.random() < up) tier++;
      }
      const lay = n => {
        const egg = spawnEgg(x + (Math.random() * 20 - 10), y, rainbow ? 7 : tier, false, rainbow);
        if (egg && rainbow) egg.tier = TIER_SECRET;   /* rainbow eggs are Secret tier */
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
      emit('breed', { x, y, rainbow, tier: rainbow ? TIER_SECRET : tier });
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
     Every hire is rolled procedurally: five stats, a look, a
     name and up to two traits. Roles lean on different stats, so
     who you put where actually matters.
     ============================================================ */
  function staffSlots() {
    return ECON.staffBaseSlots + Math.round(Object.keys(S.huts).reduce((a, k) => a + ECON.hutSlots * storeyMult(k), 0)) + 2 * lvl('crewcap');
  }
  function unionMult() { return lvl('union') ? 1.5 : 1; }
  function wageMult() { return Math.pow(0.88, lvl('wages')) * decreeMul('wage'); }
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
    for (const k of Object.keys(S.dynamos)) {
      const [dc, dr] = k.split(',').map(Number);
      if (Math.hypot(dc * 16 + 16 - x, dr * 16 + 16 - y) > ECON.dynamoR) continue;
      m += ECON.dynamoBoost;
    }
    return m;
  }
  /* how many machines a dynamo is currently driving, for its inspect card */
  function dynamoLoad(c, r) {
    const x = c * 16 + 16, y = r * 16 + 16;
    let n = 0;
    for (const kk of Object.keys(occ)) {
      const o = occ[kk];
      if (!o || o.type === 'dynamo' || o.type === 'fence') continue;
      const [oc, orr] = kk.split(',').map(Number);
      if (Math.hypot(oc * 16 + 8 - x, orr * 16 + 8 - y) <= ECON.dynamoR) n++;
    }
    return n;
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

  /* ---- rolling a hire ---- */
  function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }
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
    /* nobody who answers a flyer is a person - they are all another
       species, drawn on the founder's own frame and naturally good at
       one thing. Robots are assembled, not recruited. */
    const A = pick(CREW_ANIMALS, rnd);
    const animal = A.id;
    st[A.stat] = Math.min(RECRUIT.statMax, st[A.stat] + 2);
    const look = rollFolk(rnd, animal);
    return {
      id: nextId++, seed, name: pick(ANIMAL_NAMES, rnd), st, traits, look, animal,
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
    /* applicants are out in the world: they walk in, wait by the board, and walk off */
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
      if (x > a.x - 3 && x < a.x + 21 && y > a.y - 6 && y < a.y + 24) return a;
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
      id: nextId++, role, name: ap.name, st: ap.st, traits: ap.traits, look: ap.look, animal: ap.animal || null,
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
    /* an animal cannot take the jobs built for robots */
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
    /* a hungry grandma comes before anything else */
    if (mamaBelly() < 0.5) {
      w.state = 'walk';
      if (walkTo(w, WORLD.mama.x - 4, WORLD.mama.y + 16, dt)) {
        const n = Math.min(Math.floor(S.feedStore), ECON.mamaPellets);
        S.feedStore -= n;
        feedMama(n);
        w.jobs++; w.t = 3; w.state = 'work';
        emit('stafffeed', { w });
      }
      return;
    }
    /* a hungry trough comes next */
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
        layEgg(ch.x + 10, ch.y + 16, SPECIES[ch.sp].tier, true, ch);
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
    S.chickens.forEach(ch => { if (!isChick(ch)) eggsPerMin += 60 / chLayTime(ch) * (ch.buffT > 0 ? 2 : 1); });
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
      painted: Object.keys(S.paint).length,
      crops: Object.values(S.soil).filter(t => t.crop).length,
      ripe: Object.values(S.soil).filter(t => ripe(t)).length,
      chicks: S.chickens.filter(isChick).length,
      hungry: S.chickens.filter(c => !isChick(c) && c.food <= 0).length,
      stored: Object.values(S.silos).reduce((a, s) => a + s.store.length, 0),
    };
  }


  /* ---------- building ---------- */
  /* the whole tool rack: which tools research has handed you */
  const TOOL_NEEDS = { feed: 'feedtool', farm: 'hoe', dig: 'spade', build: 'buildtool' };
  function toolOpen(t) { const n = TOOL_NEEDS[t]; return !n || lvl(n) > 0; }

  /* ---------- quests: several at once, each a to-do list, claimed by hand ----------
     S.quests[id]: undefined = open, 1 = every objective met and waiting to be
     claimed, 2 = claimed (old saves carry `true`, which counts as claimed). */
  function goalProgress(g) {
    if (!g) return [0, 1];
    if (g.k === 'skill') return [lvl(g.id) > 0 ? 1 : 0, 1];
    if (g.k === 'region') return [regionOpen(g.id) ? 1 : 0, 1];
    if (g.k === 'age') return [ageIndex() >= AGE_INDEX[g.id] ? 1 : 0, 1];
    if (g.k === 'multi') { const parts = g.all.map(goalProgress); return [parts.filter(([c, n]) => c >= n).length, parts.length]; }
    let cur = 0;
    if (g.k === 'stat') cur = S.stats[g.s] || 0;
    else if (g.k === 'soil') cur = Object.keys(S.soil).length;
    else if (g.k === 'disc') cur = S.disc.length;
    else if (g.k === 'built') cur = S.built[g.t] || 0;
    else if (g.k === 'plots') cur = S.plots.filter(Boolean).length;
    else if (g.k === 'regions') cur = REGIONS.filter(r => !r.home && regionOpen(r.id)).length;
    else if (g.k === 'flock') cur = S.chickens.filter(ch => !isChick(ch)).length;
    else if (g.k === 'skills') cur = Object.keys(S.sk).filter(id => id !== 'root').reduce((a, id) => a + S.sk[id], 0);
    else if (g.k === 'deco') cur = Object.keys(S.deco).length;
    else if (g.k === 'staff') cur = S.staff.length;
    return [Math.min(cur, g.n), g.n];
  }
  function objDone(o) { const [c, n] = goalProgress(o); return c >= n; }
  function questObjs(q) { return q.objs || [q.goal]; }
  /* [met, total] over the objectives; a single-objective quest reports its own numbers */
  function questProgress(q) {
    const objs = questObjs(q);
    if (objs.length === 1) return goalProgress(objs[0]);
    return [objs.filter(objDone).length, objs.length];
  }
  function questDone(q) { const v = S.quests[q.id]; return v === 2 || v === true; }
  function questReady(q) { return S.quests[q.id] === 1; }
  function questState(q) {
    if (questDone(q)) return 'claimed';
    if (questReady(q)) return 'ready';
    return activeQuests().includes(q) ? 'active' : 'later';
  }
  function activeQuests() { return QUESTS.filter(q => !questDone(q)).slice(0, QUEST_ACTIVE); }
  /* the one the founder talks about: the first still in progress, else the first waiting to be claimed */
  function currentQuest() {
    const act = activeQuests();
    return act.find(q => !questReady(q)) || act[0] || null;
  }
  function tickQuests() {
    for (const q of activeQuests()) {
      if (questReady(q)) continue;
      if (!questObjs(q).every(objDone)) continue;
      S.quests[q.id] = 1;
      mark('skills');
      emit('questready', { q });
    }
  }
  function claimQuest(id) {
    const q = QUEST_BY_ID[id];
    if (!q || !questReady(q)) return false;
    S.quests[id] = 2;
    S.stats.questsDone++;
    S.stats.claimed++;
    note('quest', 'Claimed the reward for ' + q.name + '.');
    mark('skills');
    /* the reward arrives by limousine, in a box, on the grass by the road */
    sendPresent({ c: q.rw.c || 0, f: q.rw.f || 0, from: q.name, icon: q.icon });
    emit('quest', { q });
    return true;
  }
  function claimAll() { let n = 0; QUESTS.forEach(q => { if (claimQuest(q.id)) n++; }); return n; }

  /* ---------- the delivery drone and its presents ----------
     The rewards used to come up the track in a limousine. They come
     in by air now: a drone lifts over the hill, crosses to wherever
     the founder is standing, hovers there with the parcel swinging
     under it, lets go, and climbs away. The parcel comes down on a
     chute and sits on the grass until you open it.
     The very first delivery is held for the player: the drone waits
     to be tapped rather than releasing on its own, and gives up
     waiting after ten seconds so nothing can ever get stuck. */
  function sendPresent(rw) { S.limoQueue.push(rw); }
  function droneTarget() {
    const b = S.boss;
    if (b && S.company.done) return { x: b.x + 14, y: b.y - 34 };
    return { x: WORLD.layby.x + 44, y: WORLD.layby.y - 40 };
  }
  function tickLimo(dt) {
    if (!S.drone) {
      if (!S.limoQueue.length) return;
      const t = droneTarget();
      const first = !S.tut.drone;
      S.drone = { state: 'in', x: -60, y: Math.max(20, t.y - 40), tx: t.x, ty: t.y,
                  t: 0, anim: 0, rw: S.limoQueue.shift(), wait: first ? 10 : 1.4,
                  first, held: false, wob: Math.random() * 6 };
      emit('drone', { state: 'coming', d: S.drone });
    }
    const D = S.drone;
    D.anim += dt;
    if (D.state === 'in') {
      /* it keeps aiming at him even while he wanders off */
      const t = droneTarget();
      D.tx += (t.x - D.tx) * Math.min(1, dt * 1.2);
      D.ty += (t.y - D.ty) * Math.min(1, dt * 1.2);
      const dx = D.tx - D.x, dy = D.ty - D.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = Math.min(d, (70 + d * 0.9) * dt);
      D.x += dx / d * sp; D.y += dy / d * sp;
      if (d < 3) { D.state = 'hover'; D.t = D.wait; emit('drone', { state: 'here', d: D }); }
    } else if (D.state === 'hover') {
      D.t -= dt;
      if (D.t <= 0 || D.held) dropFromDrone();
    } else if (D.state === 'out') {
      D.x += 96 * dt; D.y -= 42 * dt;
      if (D.x > WORLD.W + 60 || D.y < -40) { S.drone = null; emit('drone', { state: 'gone' }); }
    }
  }
  /* the release: the parcel leaves the hook on a chute */
  function dropFromDrone() {
    const D = S.drone;
    if (!D || D.state !== 'hover') return null;
    const p = { id: nextId++, x: D.x, y: Math.min(WORLD.H - 20, D.y + 44), z: -(D.y + 44 - D.y) - 8,
                vz: -6, rw: D.rw, t: 120, wob: Math.random() * 6, chute: 1 };
    /* it falls from where the drone is to the ground under it */
    p.z = -(44 + 8);
    S.presents.push(p);
    D.state = 'out';
    D.rw = null;
    if (!S.tut.drone) S.tut.drone = 1;
    emit('present', { p, state: 'dropped' });
    emit('drone', { state: 'released', d: D, p });
    return p;
  }
  /* tapping the drone makes it let go there and then */
  function droneAt(x, y) {
    const D = S.drone;
    if (!D || D.state !== 'hover') return null;
    return (x > D.x - 20 && x < D.x + 20 && y > D.y - 14 && y < D.y + 22) ? D : null;
  }
  function tapDrone() {
    const D = S.drone;
    if (!D || D.state !== 'hover') return null;
    D.held = true;
    return dropFromDrone();
  }
  function tickPresents(dt) {
    for (let i = S.presents.length - 1; i >= 0; i--) {
      const p = S.presents[i];
      if (p.z < 0) {
        if (p.chute) { p.vz = Math.min(26, p.vz + 40 * dt); p.z = Math.min(0, p.z + p.vz * dt); if (p.z >= 0) { p.chute = 0; p.vz = 0; } }
        else { p.vz += 90 * dt; p.z = Math.min(0, p.z + p.vz * dt); if (p.z >= 0 && p.vz > 30) { p.z = -0.01; p.vz = -p.vz * 0.35; } }
      }
      p.t -= dt;
      if (p.t <= 0) openPresent(p);
    }
  }
  function presentAt(x, y) { return S.presents.find(p => Math.abs(x - p.x) < 9 && Math.abs(y - p.y) < 10) || null; }
  function openPresent(p) {
    const i = S.presents.indexOf(p);
    if (i === -1) return null;
    S.presents.splice(i, 1);
    const rw = p.rw || {};
    if (rw.c) earn(rw.c, 'quests');
    if (rw.f) S.feathers += rw.f;
    if (rw.cos) rw.cos.forEach(id => { S.cosOwned[id] = true; });
    S.stats.presents++;
    emit('present', { p, state: 'opened', rw });
    return rw;
  }

  /* ---------- the pantry and the Cannery ---------- */
  function pantryCount(id) { return S.pantry[id] || 0; }
  function goodsCount(id) { return S.goods[id] || 0; }
  function pantryTotal() { return PRODUCE_KEYS.reduce((a, k) => a + pantryCount(k), 0) + GOODS_KEYS.reduce((a, k) => a + goodsCount(k), 0); }
  function sellProduce(id, n) {
    const have = pantryCount(id);
    n = Math.min(n === undefined ? have : n, have);
    if (n <= 0 || !PRODUCE[id]) return 0;
    S.pantry[id] = have - n;
    const got = Math.round(PRODUCE[id].val * n * (1 + 0.15 * lvl('value')));
    earn(got, 'food');
    emit('soldfood', { id, n, got });
    return got;
  }
  function sellGoods(id, n) {
    const have = goodsCount(id);
    n = Math.min(n === undefined ? have : n, have);
    if (n <= 0 || !GOODS[id] || !GOODS[id].val) return 0;
    S.goods[id] = have - n;
    const got = Math.round(GOODS[id].val * n * (1 + 0.15 * lvl('value')) * dishMult());
    earn(got, 'food');
    emit('soldfood', { id, n, got });
    return got;
  }
  /* super feed goes to the barn, and everything scattered for a while is premium */
  function useGoods(id) {
    const G = GOODS[id];
    if (!G || !G.feed || goodsCount(id) <= 0) return false;
    S.goods[id]--;
    addFeed(G.feed, WORLD.mama.x, WORLD.mama.y);
    S.premiumT = Math.max(S.premiumT, 90);
    emit('superfeed', {});
    return true;
  }
  function canMake(id) { const G = GOODS[id]; return !!G && Object.keys(G.need).every(k => pantryCount(k) >= G.need[k]); }
  function hasCannery() { return Object.keys(S.canneries).length > 0; }
  function setCanneryRecipe(k, id) { const cn = S.canneries[k]; if (!cn || !GOODS[id]) return false; cn.recipe = id; return true; }
  function setAllCanneries(id) { Object.keys(S.canneries).forEach(k => setCanneryRecipe(k, id)); return hasCannery(); }
  function canneryTime(k, G) { return G.time * Math.pow(0.88, lvl('chef')) / storeyMult(k); }
  function tickCanneries(dt) {
    S.premiumT = Math.max(0, S.premiumT - dt);
    for (const k of Object.keys(S.canneries)) {
      const cn = S.canneries[k];
      const [c, r] = k.split(',').map(Number);
      if (cn.cook) {
        cn.cook.t += dt * machineBoost(c * 16 + 16, r * 16 + 16);
        if (cn.cook.t >= cn.cook.T) {
          S.goods[cn.cook.id] = (S.goods[cn.cook.id] || 0) + 1;
          cn.made++;
          S.stats.goods++;
          emit('canned', { k, id: cn.cook.id, x: c * 16 + 16, y: r * 16 });
          cn.cook = null;
        }
        continue;
      }
      const G = GOODS[cn.recipe] || GOODS.flour;
      if (!canMake(cn.recipe)) continue;
      Object.keys(G.need).forEach(pk => { S.pantry[pk] -= G.need[pk]; });
      cn.cook = { id: cn.recipe, t: 0, T: canneryTime(k, G) };
    }
  }

  /* ---------- the garage ---------- */
  function garageLevel(id) { return (S.garage && S.garage.upg && S.garage.upg[id]) || 0; }
  function garagePrice(id) { return garageCost(id, garageLevel(id)); }
  function canUpgrade(id) { const u = GARAGE_UPGRADES[id]; return !!u && depotOpen() && garageLevel(id) < u.max && S.coins >= garagePrice(id); }
  function buyUpgrade(id) {
    if (!canUpgrade(id)) return false;
    S.coins -= garagePrice(id);
    S.garage.upg[id] = garageLevel(id) + 1;
    S.stats.upgrades++;
    note('garage', 'Fitted ' + GARAGE_UPGRADES[id].name + ' level ' + S.garage.upg[id] + '.');
    emit('upgrade', { id, lvl: S.garage.upg[id] });
    return true;
  }
  function setPaint(col, decal) {
    if (col !== undefined) S.garage.col = col;
    if (decal !== undefined) S.garage.decal = decal;
    emit('paint', {});
    return true;
  }
  function paintInfo() { return { col: S.garage.col, decal: S.garage.decal, logo: S.company.logo }; }
  function routeStyle(cityId) { return ROUTE_STYLES[(S.garage.routes || {})[cityId]] || ROUTE_STYLES.safe; }
  function setRouteStyle(cityId, styleId) {
    if (!ROUTE_STYLES[styleId] || !CITY_BY_ID[cityId]) return false;
    S.garage.routes[cityId] = styleId;
    return true;
  }

  /* ---------- the road: events on it, weather over the towns, our factories in them ---------- */
  function eventAt(cityId) { return S.road.events.find(e => e.city === cityId) || null; }
  function townWeather(cityId) { return S.road.weather[cityId] || 'sun'; }
  function tickRoad(dt) {
    const R = S.road;
    R.t -= dt;
    if (R.t <= 0) {
      R.t = ROAD.eventEvery * (0.6 + Math.random() * 0.8);
      const towns = CITIES.filter(c => !eventAt(c.id));
      if (towns.length && R.events.length < 3) {
        const c = towns[Math.floor(Math.random() * towns.length)];
        const ev = ROAD_EVENTS[Math.floor(Math.random() * ROAD_EVENTS.length)];
        R.events.push({ id: ev.id, city: c.id, t: ev.dur, T: ev.dur });
        emit('roadevent', { ev, city: c });
      }
    }
    for (let i = R.events.length - 1; i >= 0; i--) { R.events[i].t -= dt; if (R.events[i].t <= 0) R.events.splice(i, 1); }
    R.wt -= dt;
    if (R.wt <= 0) {
      R.wt = ROAD.weatherEvery * (0.5 + Math.random());
      const c = CITIES[Math.floor(Math.random() * CITIES.length)];
      R.weather[c.id] = TOWN_WEATHER[Math.floor(Math.random() * TOWN_WEATHER.length)];
    }
  }
  function factoryCost(cityId) { const c = CITY_BY_ID[cityId]; return c ? Math.max(ROAD.factoryMin, Math.round(c.cost * ROAD.factoryCostMult)) : 0; }
  function canFactory(cityId) { return depotOpen() && S.routes.includes(cityId) && !S.factories[cityId] && S.coins >= factoryCost(cityId); }
  function buyFactory(cityId) {
    if (!canFactory(cityId)) return false;
    S.coins -= factoryCost(cityId);
    S.factories[cityId] = true;
    S.stats.factories++;
    note('factory', 'Opened a factory in ' + CITY_BY_ID[cityId].name + '.');
    emit('factory', { city: CITY_BY_ID[cityId] });
    return true;
  }
  function factoryIncome() { return Object.keys(S.factories).reduce((a, id) => a + (CITY_BY_ID[id] ? CITY_BY_ID[id].mult * ROAD.factoryIncome : 0), 0); }
  let factoryAcc = 0;
  function tickFactories(dt) {
    const perMin = factoryIncome();
    if (!perMin) return;
    factoryAcc += perMin / 60 * dt;
    if (factoryAcc >= 1) { const n = Math.floor(factoryAcc); factoryAcc -= n; earn(n, 'factories'); }
  }

  /* ---------- HR: training ---------- */
  function hasHR() { return Object.keys(S.hrs).length > 0; }
  function trainCost(w) { return Math.round(150 * Math.pow(1.6, w.trained || 0)); }
  function canTrain(id, stat) {
    const w = S.staff.find(x => x.id === id);
    return !!w && !w.bot && hasHR() && STATS[stat] && (w.st[stat] || 0) < RECRUIT.statMax && S.coins >= trainCost(w);
  }
  function trainStaff(id, stat) {
    if (!canTrain(id, stat)) return false;
    const w = S.staff.find(x => x.id === id);
    S.coins -= trainCost(w);
    w.st[stat] = (w.st[stat] || 0) + 1;
    w.trained = (w.trained || 0) + 1;
    w.wage = crewWage(w.st, w.traits);
    S.stats.trained++;
    note('train', w.name + ' trained up their ' + STATS[stat].name + '.');
    emit('train', { w, stat });
    return true;
  }

  /* ---------- achievements and the wardrobe ---------- */
  function achDone(id) { return !!S.ach[id]; }
  function achProgress(a) { return goalProgress(a.goal); }
  let achT = 0;
  function tickAch(dt) {
    achT += dt;
    if (achT < 1) return;
    achT = 0;
    for (const a of ACHIEVEMENTS) {
      if (S.ach[a.id]) continue;
      const [c, n] = achProgress(a);
      if (c < n) continue;
      S.ach[a.id] = Date.now();
      const cos = COSMETICS.filter(k => k.unlock === a.id).map(k => k.id);
      note('achievement', 'Achievement: ' + a.name + '.');
      sendPresent({ f: 25, cos, from: a.name, icon: a.icon, ach: a.id });
      emit('achievement', { a, cos });
    }
  }
  function ownsCosmetic(id) { const c = COSMETIC_BY_ID[id]; return !!c && (c.free || !!S.cosOwned[id]); }
  function wearCosmetic(id) {
    const c = COSMETIC_BY_ID[id];
    if (!c || !ownsCosmetic(id)) return false;
    S.wardrobe[c.kind] = id;
    emit('wardrobe', { id });
    return true;
  }
  function wardrobe() { return S.wardrobe; }

  /* ---------- settings ---------- */
  function setting(k) { return S.settings[k]; }
  function setSetting(k, v) {
    if (!(k in SETTINGS_DEFAULT)) return false;
    S.settings[k] = v;
    if (k === 'sound') S.muted = !v;
    emit('settings', { k, v });
    return true;
  }
  /* 0..1 through the ranch's day; a day is one dayT cycle */
  function dayPhase() { return ((S.dayT || 0) % 300) / 300; }

  /* ---------- completion, for the egg on the save slot ---------- */
  function completion() {
    const q = QUESTS.filter(questDone).length / QUESTS.length;
    const d = S.disc.length / SPECIES_TOTAL;
    const skMax = SKILLS.reduce((a, sk) => a + (sk.id === 'root' ? 0 : sk.max), 0);
    const sk = Object.keys(S.sk).filter(id => id !== 'root').reduce((a, id) => a + S.sk[id], 0) / skMax;
    const ac = Object.keys(S.ach).length / ACHIEVEMENTS.length;
    const pl = S.plots.filter(Boolean).length / PLOTS.length;
    const ag = ageIndex() / (AGES.length - 1);
    return Math.round(100 * (q * 0.3 + d * 0.2 + sk * 0.2 + ac * 0.15 + pl * 0.1 + ag * 0.05));
  }

  /* ---------- the ledger and the market ---------- */
  function earn(a, src) {
    /* every age the company has lived through adds a little to every coin, share sales aside */
    if (src !== 'stocks') a = a * ageMult();
    a = Math.round(a);
    S.coins += a;
    S.stats.coinsEarned += a;
    const L = S.ledger;
    L.acc += a;
    L[src] = (L[src] || 0) + a;
  }
  function tickLedger(dt) {
    const L = S.ledger;
    L.t += dt;
    if (L.t >= 10) { L.hist.push(Math.round(L.acc * 6)); L.acc = 0; L.t = 0; if (L.hist.length > 90) L.hist.shift(); }
  }
  function stockPrice(id) { return S.market.px[id] || STOCK_BY_ID[id].base; }
  function tickMarket(dt) {
    if (!lvl('stocks')) return;
    const M = S.market;
    M.t += dt;
    if (M.t < ECON.stockTick) return;
    M.t = 0;
    STOCKS.forEach(st => {
      const p = stockPrice(st.id);
      const anchor = st.base * (1 + 0.03 * S.day);
      const shock = (Math.random() - 0.5) * 2 * ECON.stockVol;
      const pull = (anchor - p) / anchor * 0.02;
      const np = Math.max(0.5, p * (1 + shock + pull + st.drift));
      M.px[st.id] = Math.round(np * 100) / 100;
      (M.hist[st.id] = M.hist[st.id] || []).push(M.px[st.id]);
      if (M.hist[st.id].length > 60) M.hist[st.id].shift();
    });
    emit('market', {});
  }
  function buyStock(id, n) {
    if (!lvl('stocks') || !STOCK_BY_ID[id]) return false;
    const cost = stockPrice(id) * n;
    if (n < 1 || S.coins < cost) return false;
    S.coins -= cost;
    S.market.held[id] = (S.market.held[id] || 0) + n;
    S.stats.trades++;
    return true;
  }
  function sellStock(id, n) {
    const have = S.market.held[id] || 0;
    if (!lvl('stocks') || n < 1 || have < n) return false;
    S.market.held[id] = have - n;
    earn(stockPrice(id) * n, 'stocks');
    S.stats.trades++;
    return true;
  }
  function portfolio() { return STOCKS.reduce((a, st) => a + (S.market.held[st.id] || 0) * stockPrice(st.id), 0); }
  /* what the company itself is worth: its earnings, capitalised */
  function companyValue() { return Math.round((rates().coinsPerMin + branchIncome()) * 20 + S.coins + portfolio()); }

  /* ---------- the world: regions open in order, branches earn on their own ---------- */
  function regionOpen(id) { return !!(S.empire && S.empire.open[id]); }
  function regionReachable(id) {
    const r = REGION_BY_ID[id];
    if (!r || lvl('worldmap') < 1) return false;
    if (r.moon && lvl('moonshot') < 1) return false;
    const idx = REGIONS.indexOf(r);
    return idx <= 1 || regionOpen(REGIONS[idx - 1].id);
  }
  function canOpenRegion(id) { return regionReachable(id) && !regionOpen(id) && S.coins >= REGION_BY_ID[id].cost; }
  function openRegion(id) {
    if (!canOpenRegion(id)) return false;
    const r = REGION_BY_ID[id];
    S.coins -= r.cost;
    S.empire.open[id] = true;
    S.stats.regions++;
    if (r.moon) S.empire.rocket = 6;
    note('world', 'Opened ' + r.name + '.');
    emit('region', { r });
    return true;
  }
  function branchCount(id) { return (S.empire.branches[id] || 0); }
  function branchCost(id) { const r = REGION_BY_ID[id]; return Math.round(r.branchBase * Math.pow(1.6, branchCount(id))); }
  function canBranch(id) {
    const r = REGION_BY_ID[id];
    return !!r && !r.home && regionOpen(id) && branchCount(id) < r.cap && S.coins >= branchCost(id);
  }
  function buildBranch(id) {
    if (!canBranch(id)) return false;
    S.coins -= branchCost(id);
    S.empire.branches[id] = branchCount(id) + 1;
    S.stats.branches++;
    emit('branch', { r: REGION_BY_ID[id], n: S.empire.branches[id] });
    return true;
  }
  /* coins a minute from every branch, air freight and the empire bonus counted */
  function regionIncome(id) { return branchCount(id) * REGION_BY_ID[id].yield * (1 + 0.5 * lvl('airfreight')) * tycoon(); }
  function branchIncome() { return REGIONS.reduce((a, r) => a + regionIncome(r.id), 0); }
  function tickEmpire(dt) {
    const E = S.empire;
    if (E.rocket > 0) E.rocket -= dt;
    E.t += dt;
    if (E.t >= 10) {
      E.t -= 10;
      const v = branchIncome() / 6;
      if (v > 0) { earn(v, 'empire'); emit('empireincome', { v }); }
    }
    /* a Moon branch posts an egg home now and then; it falls out of the sky by the Lab */
    if (lvl('moonegg') && branchCount('moon') > 0) {
      E.moonT = (E.moonT || 0) + dt;
      if (E.moonT >= ECON.moonEggEvery) {
        E.moonT = 0;
        const egg = spawnEgg(WORLD.stations.lab.x + 44 + Math.random() * 30, WORLD.stations.lab.y - 6 + Math.random() * 24, TIER_MOON, false, false);
        if (egg) { egg.z = -90; egg.vz = 0; note('moon', 'An egg came down from the Moon.'); emit('moonegg', { egg }); }
      }
    }
  }
  function setCompany(o) {
    const c = S.company;
    if (typeof o.name === 'string') {
      const nm = o.name.toUpperCase().replace(/[^A-Z0-9 .&'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
      if (nm) c.name = nm;
    }
    if (LOGOS.includes(o.logo)) c.logo = o.logo;
    if (BRAND_COLS.includes(o.col1)) c.col1 = o.col1;
    if (BRAND_COLS.includes(o.col2)) c.col2 = o.col2;
    /* the signature is a run of pen points on a 120 x 40 grid; -1 marks a lifted pen */
    if (Array.isArray(o.sig) && o.sig.length) {
      c.sig = o.sig.slice(0, 900).map(p => [Math.max(-1, Math.min(119, p[0] | 0)), Math.max(-1, Math.min(39, p[1] | 0))]);
    }
    c.done = true;
    mark('build');
    emit('company', { c });
    return c;
  }

  /* ---------- traffic: cars go by on the road ---------- */
  const CAR_KINDS = ['sedan', 'sedan', 'sedan', 'hatch', 'hatch', 'pickup', 'pickup', 'van', 'van', 'bus'];
  const CUSTOMER_CARS = ['sedan', 'hatch', 'pickup', 'van'];
  const CAR_COLS = ['#e8542f', '#3fa7d6', '#ffd23f', '#6ab04c', '#fff8ec', '#b06ee0', '#2e2216', '#f0a422', '#ff5f9e', '#c9ced6', '#8a5e2a'];
  const cars = [];
  let carT = 3;
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  /* the near lane runs east, the far lane west, with the dashes between them */
  function laneY(dir) { return dir === 1 ? WORLD.roadY + 28 : WORLD.roadY + 6; }
  function tickTraffic(dt) {
    carT -= dt;
    if (carT <= 0 && cars.length < 9) {
      carT = ECON.carEvery * (0.5 + Math.random()) / decreeMul('cars');
      const dir = Math.random() < 0.5 ? 1 : -1;
      const c = { id: nextId++, kind: pickOne(CAR_KINDS), col: pickOne(CAR_COLS), dir,
                  x: dir === 1 ? -70 : WORLD.W + 70, y: laneY(dir), v: 36 + Math.random() * 34,
                  v0: 0, state: 'drive', who: null, t: 0 };
      c.v0 = c.v;
      /* one car in five pulls over for a gawp at the ranch, once the
         company is a going concern and there is something to gawp at */
      if (S.company.done && Math.random() < 0.22) {
        const from = dir === 1 ? 120 : WORLD.W - 120;
        c.pull = from + dir * (60 + Math.random() * (WORLD.W - 360));
        c.pull = Math.max(90, Math.min(WORLD.W - 130, c.pull));
      }
      cars.push(c);
    }
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      /* the pull-over: slow, stop on the verge, out for a look, back in */
      if (c.pull !== undefined && c.state === 'drive' && (c.x - c.pull) * c.dir > -40) c.state = 'slow';
      if (c.state === 'slow') {
        c.v = Math.max(0, c.v - 90 * dt);
        c.y += (laneY(c.dir) + (c.dir === 1 ? 8 : -8) - c.y) * Math.min(1, dt * 3);
        if (c.v <= 0.5) {
          c.state = 'stopped'; c.v = 0; c.t = 4.5 + Math.random() * 3;
          const seed = Math.floor(Math.random() * 1e9);
          const rnd = SPR.mulberry(seed);
          c.who = { x: c.x + (c.dir === 1 ? 8 : 24), y: c.y - 2, dir: -c.dir, frame: 0, anim: 0,
                    state: 'out', t: 0, seed,
                    look: rollFolk(rnd),
                    line: pickOne(PULLOVER_LINES), lineT: 4 };
          emit('pullover', { car: c, x: c.x + 16, y: c.y });
        }
      } else if (c.state === 'stopped') {
        c.t -= dt;
        const w = c.who;
        if (w) {
          w.lineT = Math.max(0, w.lineT - dt);
          /* out of the car, up to the fence, a look, and back */
          const goal = w.state === 'back' ? { x: c.x + 14, y: c.y - 2 } : { x: w.x, y: WORLD.roadY - 12 };
          const dx = goal.x - w.x, dy = goal.y - w.y, d = Math.hypot(dx, dy);
          if (d > 2) {
            const sp = 26 * dt;
            w.x += dx / d * Math.min(d, sp); w.y += dy / d * Math.min(d, sp);
            w.dir = dx > 0 ? 1 : -1;
            w.anim += sp;
            if (w.anim > 5) { w.anim = 0; w.frame ^= 1; }
          } else if (w.state === 'out') { w.state = 'look'; w.t = 2.4; w.frame = 0; }
          else if (w.state === 'back') { c.who = null; c.t = Math.min(c.t, 0.6); }
          if (w.state === 'look') { w.t -= dt; if (w.t <= 0) w.state = 'back'; }
        }
        if (c.t <= 0 && !c.who) { c.state = 'go'; c.pull = undefined; emit('pullaway', { car: c, x: c.x + 16, y: c.y }); }
      } else if (c.state === 'go') {
        c.v = Math.min(c.v0, c.v + 60 * dt);
        c.y += (laneY(c.dir) - c.y) * Math.min(1, dt * 3);
        if (c.v >= c.v0 - 1) c.state = 'drive';
      }
      /* nobody drives through the car in front */
      const ahead = cars.find(o => o !== c && o.dir === c.dir && (o.x - c.x) * c.dir > 0 && (o.x - c.x) * c.dir < 44);
      c.x += c.dir * (ahead ? Math.min(c.v, ahead.v) : c.v) * dt;
      if (c.x < -120 || c.x > WORLD.W + 120) cars.splice(i, 1);
    }
    tickPassers(dt);
  }

  /* ---------- passers-by ----------
     Livestock, dog walkers and joggers along the verge and the far
     footpath. They live in a plain array like the cars, not in the
     save: whoever was walking past while you were away has gone. */
  const passers = [];
  let passT = 8;
  function passerY(path, dir) {
    /* nobody walks through the wood over the road: everything that passes
       keeps to the verge on your side of the kerb, two lines of it so
       they do not tread on each other */
    return WORLD.roadY - 10 + (dir === 1 ? 3 : 0);
  }
  function tickPassers(dt) {
    passT -= dt;
    if (passT <= 0 && passers.length < 4) {
      passT = 13 + Math.random() * 16;
      /* weighted pick, so a cow in the road stays a surprise */
      const tot = PASSERS.reduce((a, p) => a + p.w, 0);
      let roll = Math.random() * tot, def = PASSERS[0];
      for (const p of PASSERS) { roll -= p.w; if (roll <= 0) { def = p; break; } }
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y = passerY(def.path, dir);
      const seed = Math.floor(Math.random() * 1e9);
      const rnd = SPR.mulberry(seed);
      passers.push({ id: nextId++, def, dir, x: dir === 1 ? -30 : WORLD.W + 30, y,
        v: def.v * (0.85 + Math.random() * 0.3), state: 'walk', t: 0, frame: 0, anim: 0,
        seed, line: null, lineT: 0,
        look: def.folk ? (def.bot ? Object.assign(rollFolk(rnd), { bot: true })
                                  : rollFolk(rnd, def.folk === true ? undefined : def.folk)) : null,
        pets: def.line ? def.line - 1 : def.pet ? 1 : 0 });
      emit('passer', { p: passers[passers.length - 1] });
    }
    for (let i = passers.length - 1; i >= 0; i--) {
      const p = passers[i];
      p.lineT = Math.max(0, p.lineT - dt);
      if (!p.lineT) p.line = null;
      if (p.state === 'walk') {
        p.x += p.dir * p.v * dt;
        p.anim += p.v * dt;
        if (p.anim > 6) { p.anim = 0; p.frame ^= 1; }
        /* a stop to stare over the fence, and something said about it.
           Only one voice on the road at a time: two clouds over the
           verge at once cover the field and read as noise. */
        if (p.def.stop && !p.stopped && Math.random() < dt * 0.12
            && p.x > 80 && p.x < WORLD.W - 120) {
          const talking = passers.some(o => o !== p && o.lineT > 0)
            || cars.some(c => c.who && c.who.lineT > 0);
          p.stopped = true; p.state = 'stare'; p.t = 2 + Math.random() * 2.5;
          if (!talking) { p.line = pickOne(p.def.says || PASSER_LINES); p.lineT = p.t; }
          emit('passerstop', { p });
        }
      } else {
        p.t -= dt;
        p.frame = 0;
        if (p.t <= 0) p.state = 'walk';
      }
      if (p.x < -60 || p.x > WORLD.W + 60) passers.splice(i, 1);
    }
  }

  /* ---------- customers: cars pull into the lay-by with an order ---------- */
  const CUSTOMER_NAMES = ['MRS PLUME', 'OLD TOM CAT', 'THE BAKER BADGER', 'CHEF OTTER', 'MISS YOLK', 'GRAN VIXEN', 'UNIT 7',
                          'DEL THE DROID', 'TWO CUBS', 'THE MAYOR MOLE', 'A PAINTER POSSUM', 'NURSE HARE', 'THE STOAT TWINS', 'A BUSKING BOT'];
  function orderSpots() {
    const L = WORLD.layby;
    return [{ x: L.x + 6, y: L.y - 8 }, { x: L.x + 58, y: L.y - 8 }, { x: L.x + 110, y: L.y - 8 }];
  }
  /* ---------- billboards: paint a poster, pull the road in ---------- */
  function billboardPull() {
    return Object.keys(S.billboards).reduce((a, k) =>
      a + 1 + (S.billboards[k].custom ? ECON.billboardArt : 0), 0);
  }
  function billboardArt(k) { const b = S.billboards[k]; return b ? b.art : null; }
  function setBillboardArt(k, art, custom) {
    const b = S.billboards[k];
    if (!b || typeof art !== 'string') return false;
    b.art = art;
    b.custom = !!custom;
    if (custom) S.stats.posters++;
    mark('build');
    emit('poster', { k, custom: !!custom });
    return true;
  }
  function maxOrders() { return ECON.maxOrders + Math.min(1, Math.floor(billboardPull() / 2)); }
  function orderWait() { return ECON.orderEvery / (1 + ECON.billboardPull * billboardPull()); }
  function orderTierPool() {
    const pool = [S.mamaTier];
    S.chickens.forEach(ch => { if (!isChick(ch)) pool.push(SPECIES[ch.sp].tier); });
    return pool;
  }
  const VIP_NAMES = ['THE COUNTESS STOAT', 'A FILM-STAR FOX', 'MR MONEYBAGS', 'TYCOON BADGER', 'LADY YOLKINGTON', 'THE BANKING DROID', 'A DUCHESS HARE'];
  function newOrder(spot) {
    const tier = pickOne(orderTierPool());
    /* once you have filled a couple, the odd VIP turns up: a longer car, a
       bigger order, twice the money, and less patience */
    const vip = S.stats.orders >= 2 && Math.random() < ECON.vipChance;
    let n = 2 + Math.floor(Math.random() * Math.min(7, 2 + Math.floor(S.day / 2) + Math.floor(S.chickens.length / 4)));
    if (vip) n += 3;
    const unit = Math.round(eggValue(tier, false) * ECON.orderPay * (vip ? ECON.vipPay : 1)
                            * (1 + ECON.billboardPay * billboardPull()));
    const wait = (vip ? ECON.vipTime : ECON.orderTime) * (garageLevel('horn') ? 1.2 : 1);
    return { id: nextId++, tier, n, got: 0, unit, pay: unit * n, t: wait, T: wait, vip,
             who: vip ? pickOne(VIP_NAMES) : pickOne(CUSTOMER_NAMES),
             kind: vip ? 'limo' : pickOne(CUSTOMER_CARS), col: vip ? '#2e2216' : pickOne(CAR_COLS),
             state: 'arrive', x: WORLD.W + 60, y: laneY(-1), spot };
  }
  function tickOrders(dt) {
    if (lvl('orders')) {
      S.orderT -= dt;
      if (S.orderT <= 0) {
        S.orderT = orderWait() * (0.6 + Math.random() * 0.8);
        const spot = orderSpots().map((_, i) => i).find(i => !S.orders.some(q => q.spot === i && q.state !== 'leave'));
        if (spot !== undefined && S.orders.filter(o => o.state !== 'leave').length < maxOrders()) S.orders.push(newOrder(spot));
      }
    }
    for (let i = S.orders.length - 1; i >= 0; i--) {
      const o = S.orders[i];
      const sp = orderSpots()[o.spot] || orderSpots()[0];
      if (o.state === 'arrive') {
        const d = o.x - sp.x;
        o.x -= Math.min(d, 64 * dt);
        if (d < 50) o.y = laneY(-1) + (sp.y - laneY(-1)) * (1 - Math.max(0, d) / 50);
        if (d <= 0.5) { o.x = sp.x; o.y = sp.y; o.state = 'wait'; emit('customer', { o }); }
      } else if (o.state === 'wait') {
        o.t -= dt;
        if (o.t <= 0) { o.state = 'leave'; o.miss = true; S.stats.ordersMissed++; emit('ordermiss', { o }); }
      } else {
        o.x -= 72 * dt;
        o.y += (laneY(-1) - o.y) * Math.min(1, dt * 3);
        if (o.x < -80) S.orders.splice(i, 1);
      }
    }
  }
  function orderAt(x, y) {
    return S.orders.find(o => o.state === 'wait' && x > o.x - 4 && x < o.x + 30 && y > o.y - 22 && y < o.y + 16) || null;
  }
  function eggFits(o, e) { return e.tier >= o.tier; }
  function completeOrder(o) {
    o.state = 'leave'; o.done = true;
    earn(o.pay, 'orders');
    S.feathers += ECON.orderTip * (o.vip ? 3 : 1);
    S.stats.orders++;
    if (o.vip) S.stats.vips++;
    note('order', o.who + ' drove off with ' + o.n + ' eggs and paid ' + o.pay + '.');
    emit('orderdone', { o });
  }
  function giveEgg(o, e) {
    if (!o || o.state !== 'wait' || !eggFits(o, e)) return false;
    o.got++;
    if (o.got >= o.n) completeOrder(o);
    return true;
  }
  function basketToOrder(o) {
    if (!o || o.state !== 'wait') return 0;
    let n = 0;
    for (let i = S.basket.length - 1; i >= 0 && o.got < o.n; i--) {
      if (eggFits(o, S.basket[i])) { S.basket.splice(i, 1); o.got++; n++; }
    }
    if (o.got >= o.n) completeOrder(o);
    return n;
  }

  /* ---------- construction: a moving van pulls up and two movers build it ---------- */
  const INSTANT = { belt: 1, fence: 1 };
  /* the two who get out of the van: a badger in a hi-vis cap and the
     droid that carries the heavy end */
  const MOVER_LOOKS = [
    { species: 'badger', shirt: '#f0a422', pants: '#3a3a4a', boot: '#2e2216', hat: 'cap' },
    { bot: true, shirt: '#c9cfd8', pants: '#f0a422', boot: '#3a3f4a' },
  ];
  function siteTime(type) { return ECON.siteBase + Math.sqrt(BUILDS[type].base) / 3; }
  function siteFor(k) { return S.sites[k] || null; }
  const STOREY_OK = ['incubator', 'coop', 'barn', 'staffhut', 'silo', 'hq', 'mill', 'well', 'sprinkler', 'beehive', 'trough', 'hatchery', 'lovenest', 'kitchen', 'park', 'timemachine', 'cannery', 'hr', 'compost', 'wormfarm'];
  function storeyMult(k) { return S.storeys && S.storeys[k] ? ECON.storeyMult : 1; }
  function storeyCost(type) { return Math.round(BUILDS[type].base * ECON.storeyCost); }
  function canStorey(k) {
    const o = occ[k];
    if (!o || o.k !== k || o.type === 'site') return false;
    if (lvl('storeys') < 1 || !STOREY_OK.includes(o.type) || S.storeys[k] || S.sites[k]) return false;
    return S.coins >= storeyCost(o.type);
  }
  function addStorey(k) {
    if (!canStorey(k)) return false;
    const o = occ[k];
    S.coins -= storeyCost(o.type);
    S.sites[k] = { type: o.type, dir: 0, t: 0, T: siteTime(o.type) * 0.8, kind: 'storey', stage: 'wait' };
    mark('build');
    emit('site', { type: o.type, kind: 'storey' });
    return true;
  }
  function finishSite(k) {
    const s = S.sites[k];
    if (!s) return;
    delete S.sites[k];
    const [c, r] = k.split(',').map(Number);
    if (s.kind === 'storey') {
      S.storeys[k] = 2;
      S.stats.storeys++;
      note('storey', 'Added a second floor to the ' + BUILDS[s.type].name + '.');
    } else placeBuilding(s.type, k, s.dir);
    rebuildOcc();
    mark('build');
    emit('built', { type: s.type, c, r, kind: s.kind });
  }
  const movers = { van: null, crew: [] };
  function moverWalk(w, tx, ty, dt) {
    const dx = tx - w.x, dy = ty - w.y;
    const d = Math.hypot(dx, dy);
    if (d < 2.5) return true;
    const sp = 34 * groundSpeed(w.x + 6, w.y + 12) * dt;
    w.dir = dx > 0 ? 1 : -1;
    w.x += (dx / d) * Math.min(d, sp); w.y += (dy / d) * Math.min(d, sp);
    w.anim += sp;
    if (w.anim > 5) { w.anim = 0; w.frame ^= 1; }
    return false;
  }
  function moversTick(dt) {
    const pending = Object.keys(S.sites);
    if (!movers.van) {
      if (!pending.length) return;
      movers.van = { x: -90, y: WORLD.roadY + 26, tx: 0, state: 'arrive', anim: 0 };
      movers.crew = MOVER_LOOKS.map((look, i) => ({ id: 9000 + i, x: -90, y: WORLD.roadY, dir: 1, frame: 0, anim: 0, state: 'van', look, job: null, hammer: 0 }));
      emit('movers', { state: 'coming' });
    }
    const van = movers.van;
    van.anim += dt;
    if (van.state === 'arrive') {
      const k = pending[0];
      if (!k) { van.state = 'leave'; return; }
      const c = +k.split(',')[0];
      van.tx = Math.max(10, Math.min(WORLD.W - 70, c * 16 - 24));
      const d = van.tx - van.x;
      van.x += Math.sign(d) * Math.min(Math.abs(d), 72 * dt);
      if (Math.abs(d) < 1) {
        van.state = 'parked';
        movers.crew.forEach((w, i) => { w.x = van.x + 14 + i * 12; w.y = WORLD.roadY - 10; w.state = 'idle'; });
        emit('movers', { state: 'here', x: van.x });
      }
      return;
    }
    if (van.state === 'leave') {
      /* another job comes in as they pull away: they turn straight round */
      if (pending.length) { van.state = 'arrive'; movers.crew.forEach(w => { w.state = 'van'; }); return; }
      van.x += 72 * dt;
      if (van.x > WORLD.W + 110) { movers.van = null; movers.crew = []; }
      return;
    }
    /* parked: the crew work the sites, then climb back in */
    if (!pending.length) {
      let all = true;
      movers.crew.forEach((w, i) => { w.state = 'walk'; if (!moverWalk(w, van.x + 14 + i * 12, WORLD.roadY - 10, dt)) all = false; });
      if (all) { van.state = 'leave'; emit('movers', { state: 'leaving' }); }
      return;
    }
    movers.crew.forEach((w, i) => {
      const k = pending[Math.min(i, pending.length - 1)];
      const st = S.sites[k];
      const [c, r] = k.split(',').map(Number);
      const b = BUILDS[st.type];
      const tx = c * 16 + b.w * 8 - 6 + (i ? 7 : -9), ty = r * 16 + b.h * 16 - 4;
      w.job = k;
      if (moverWalk(w, tx, ty, dt)) {
        w.state = 'work';
        w.hammer += dt;
        st.stage = 'work';
        st.t += dt * (lvl('union') ? 1.5 : 1);
      } else w.state = 'walk';
    });
    pending.forEach(k => { const st = S.sites[k]; if (st && st.t >= st.T) finishSite(k); });
  }

  function placeBuilding(type, k, dir) {
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
    else if (type === 'polisher') S.polishers[k] = { dir: dir || 0, n: 0 };
    else if (type === 'grader') S.graders[k] = { dir: dir || 0, n: 0, up: 0 };
    else if (type === 'dynamo') S.dynamos[k] = { t: 0 };
    else if (type === 'barn') S.barns[k] = { built: Date.now() };
    else if (type === 'trough') S.troughs[k] = { n: 0 };
    else if (type === 'well') S.wells[k] = { built: Date.now() };
    else if (type === 'sprinkler') S.sprinklers[k] = { built: Date.now() };
    else if (type === 'mill') S.mills[k] = { t: 0 };
    else if (type === 'coop') S.coops[k] = { built: Date.now() };
    else if (type === 'board') S.boards[k] = { built: Date.now() };
    else if (type === 'hq') S.hqs[k] = { built: Date.now() };
    else if (type === 'beehive') S.beehives[k] = { t: 0 };
    else if (type === 'genelab') S.genelabs[k] = { built: Date.now() };
    else if (type === 'billboard') S.billboards[k] = { art: null, custom: false, seed: Math.floor(Math.random() * 9999) };
    else if (type === 'kitchen') S.kitchens[k] = { pantry: [], recipe: 'omelette', cook: null, counter: [], sold: 0 };
    else if (type === 'park') S.parks[k] = { slots: [], t: 0, visitors: 0 };
    else if (type === 'timemachine') S.timemachines[k] = { on: false, t: 0, T: 0, made: 0 };
    else if (type === 'hr') S.hrs[k] = { built: Date.now() };
    else if (type === 'cannery') S.canneries[k] = { recipe: 'flour', cook: null, made: 0 };
    else if (type === 'compost') S.composts[k] = { t: 0 };
    else if (type === 'wormfarm') S.wormfarms[k] = { t: 0 };
  }
  function build(type, c, r, dir) {
    const cost = buildCost(type, S.built[type]);
    if (S.coins < cost || !canPlace(type, c, r)) return false;
    const b0 = BUILDS[type];
    for (let dc = 0; dc < b0.w; dc++) for (let dr = 0; dr < b0.h; dr++) delete S.deco[key(c + dc, r + dr)];
    S.coins -= cost;
    S.built[type]++;
    S.stats.builtN++;
    const k = key(c, r);
    if (INSTANT[type]) { placeBuilding(type, k, dir); rebuildOcc(); mark('build'); return true; }
    /* everything else is a site until the movers have been */
    S.sites[k] = { type, dir: dir || 0, t: 0, T: siteTime(type), kind: 'build', stage: 'wait' };
    rebuildOcc();
    mark('build');
    emit('site', { type, c, r, kind: 'build' });
    return true;
  }
  function setBeltDir(c, r, dir) { const b = S.belts[key(c, r)]; if (b) b.dir = dir; }
  function demolish(c, r) {
    const o = occ[key(c, r)];
    if (!o) return false;
    const k = o.k;
    const [kc, kr] = k.split(',').map(Number);
    if (o.type === 'site') {
      /* call the movers off: the money comes straight back */
      const st = S.sites[k];
      delete S.sites[k];
      S.built[st.type] = Math.max(0, S.built[st.type] - 1);
      S.coins += buildCost(st.type, S.built[st.type]);
      rebuildOcc(); mark('build');
      return true;
    }
    if (S.sites[k] && S.sites[k].kind === 'storey') { S.coins += storeyCost(o.type); delete S.sites[k]; }
    delete S.storeys[k];
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
    } else if (o.type === 'beehive') {
      delete S.beehives[k]; S.built.beehive = Math.max(0, S.built.beehive - 1);
    } else if (o.type === 'genelab') {
      delete S.genelabs[k]; S.built.genelab = Math.max(0, S.built.genelab - 1);
    } else if (o.type === 'billboard') {
      delete S.billboards[k]; S.built.billboard = Math.max(0, S.built.billboard - 1);
    } else if (o.type === 'kitchen') {
      S.kitchens[k].pantry.forEach((e, i) => spawnEgg(kc * 16 + 6 + (i % 8) * 3, kr * 16 + 30, e.tier, e.golden, e.rainbow));
      delete S.kitchens[k]; S.built.kitchen = Math.max(0, S.built.kitchen - 1);
    } else if (o.type === 'park') {
      S.parks[k].slots.forEach((ch, i) => { if (ch) parkEject(k, i); });
      delete S.parks[k]; S.built.park = Math.max(0, S.built.park - 1);
    } else if (o.type === 'timemachine') {
      if (S.timemachines[k].on) S.fossilCount += ECON.dinoFossils;
      delete S.timemachines[k]; S.built.timemachine = Math.max(0, S.built.timemachine - 1);
    } else if (o.type === 'hr') {
      delete S.hrs[k]; S.built.hr = Math.max(0, S.built.hr - 1);
    } else if (o.type === 'cannery') {
      delete S.canneries[k]; S.built.cannery = Math.max(0, S.built.cannery - 1);
    } else if (o.type === 'compost') {
      delete S.composts[k]; S.built.compost = Math.max(0, S.built.compost - 1);
    } else if (o.type === 'wormfarm') {
      delete S.wormfarms[k]; S.built.wormfarm = Math.max(0, S.built.wormfarm - 1);
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
    if (!laneOpen(sk.br)) return false;                /* the lane waits for its age */
    const cost = skillCost(sk, cur);
    if (S.feathers < cost) return false;
    S.feathers -= cost;
    S.sk[id] = cur + 1;
    mark('skills', 'build');
    return true;
  }
  function upgradeMama() {
    if (S.mamaTier >= TIER_DIVINE) return false;    /* mama tops out at Divine */
    const cost = ECON.mamaCost(S.mamaTier);
    if (S.coins < cost) return false;
    S.coins -= cost;
    S.mamaTier++;
    note('mama', 'Mama Hen became a ' + TIERS[S.mamaTier].n + ' layer.');
    return true;
  }

  /* Mama works for her supper now. Her belly empties as she sits, and an
     empty grandma does not lay - scatter feed by her nest to top her up. */
  function mamaBelly() { return Math.max(0, Math.min(1, S.mama.belly == null ? 1 : S.mama.belly)); }
  function mamaHungry() { return mamaBelly() <= 0; }
  function feedMama(n) {
    if (mamaBelly() >= 1) return false;
    S.mama.belly = Math.min(1, mamaBelly() + n / ECON.mamaPellets);
    S.stats.mamaFed++;
    emit('mamafed', {});
    return true;
  }
  function tickMama(dt) {
    S.mama.petCd = Math.max(0, S.mama.petCd - dt);
    /* she eats what lands within reach of the nest */
    if (mamaBelly() < 1) {
      for (let i = S.feed.length - 1; i >= 0; i--) {
        const f = S.feed[i];
        if (Math.hypot(f.x - WORLD.mama.x, f.y - WORLD.mama.y - 6) > ECON.mamaReach) continue;
        S.feed.splice(i, 1);
        feedMama(1);
        if (mamaBelly() >= 1) break;
      }
    }
    if (mamaHungry()) { S.mama.belly = 0; return; }
    S.mama.belly = Math.max(0, mamaBelly() - dt / ECON.mamaHunger);
    S.mama.lay -= dt;
    if (S.mama.lay <= 0) {
      S.mama.lay = mamaLayTime();
      layEgg(WORLD.mama.x, WORLD.mama.y + 10, S.mamaTier, false);
    }
  }

  /* ============================================================
     RANKS - stars for the eggs a hen has laid
     ============================================================ */
  function rankOf(ch) {
    const n = ch.laid || 0;
    let r = 0;
    for (let i = 0; i < RANKS.length; i++) if (n >= RANKS[i].eggs) r = i;
    return r;
  }
  function rankName(ch) { return RANKS[rankOf(ch)].n; }
  function rankSpeed(ch) { return lvl('ranks') ? rankOf(ch) * (ECON.rankLay + 0.04 * lvl('medals')) : 0; }
  function rankLuck(ch) { return lvl('ranks') ? rankOf(ch) * 0.01 : 0; }
  function nextRankEggs(ch) { const r = rankOf(ch); return r < RANKS.length - 1 ? RANKS[r + 1].eggs : null; }
  function countLay(ch) {
    const before = rankOf(ch);
    ch.laid = (ch.laid || 0) + 1;
    const after = rankOf(ch);
    if (after > before) {
      if (before === 0) S.stats.ranked++;
      if (after === RANKS.length - 1) { S.stats.champions++; note('rank', SPECIES[ch.sp].name + ' made Champion.', ch.sp); findSecret('champion'); }
      emit('rankup', { ch, rank: after });
    }
  }

  /* ============================================================
     AGES - six eras, each reached by milestones
     ============================================================ */
  function ageIndex() { return S.age || 0; }
  function age() { return AGES[ageIndex()]; }
  function ageValue(k) {
    if (k === 'disc') return S.disc.length;
    if (k === 'belts') return S.built.belt || 0;
    if (k === 'moon') return regionOpen('moon') ? 1 : 0;
    return S.stats[k] || 0;
  }
  function ageNeeds(a) {
    return Object.keys(a.need).map(k => {
      const want = a.need[k] === true ? 1 : a.need[k];
      const have = ageValue(k);
      return { k, want, have: Math.min(have, want), ok: have >= want, name: AGE_NEED_NAMES[k] || k };
    });
  }
  function ageProgress(a) { const n = ageNeeds(a); return [n.filter(x => x.ok).length, Math.max(1, n.length)]; }
  function nextAge() { return AGES[ageIndex() + 1] || null; }
  function ageMult() { return 1 + ECON.ageBonus * ageIndex(); }
  function laneOpen(modId) { const m = MOD_BY_ID[modId]; return !m || !m.age || ageIndex() >= AGE_INDEX[m.age]; }
  function tickAges() {
    const nx = nextAge();
    if (!nx || !ageNeeds(nx).every(x => x.ok)) return;
    S.age = ageIndex() + 1;
    note('age', 'The ' + nx.name + ' began.');
    mark('skills', 'build', 'pedia');
    emit('age', { a: nx, i: S.age });
  }

  /* ============================================================
     SECRETS - found, never told
     ============================================================ */
  function secretFound(id) { return !!(S.secrets && S.secrets[id]); }
  function findSecret(id) {
    const s = SECRET_BY_ID[id];
    if (!s || secretFound(id)) return false;
    S.secrets[id] = Date.now();
    S.stats.secrets++;
    if (s.rw.c) earn(s.rw.c, 'secrets');
    if (s.rw.f) S.feathers += s.rw.f;
    note('secret', 'Secret found: ' + s.name + '.');
    mark('pedia');
    emit('secret', { s });
    return true;
  }
  let secretT = 0;
  function tickSecrets(dt) {
    S.playT = (S.playT || 0) + dt;
    secretT += dt;
    if (secretT < 1) return;
    secretT = 0;
    if (new Date().getHours() < 5) findSecret('nightowl');
    if (S.eggs.length >= 100) findSecret('eggtower');
    if (S.chickens.length >= chickenCap()) findSecret('fullhouse');
    if (S.playT >= 3600) findSecret('longhaul');
    if (S.stats.rains >= 5) findSecret('soaked');
    if (regionOpen('moon')) findSecret('moonwalk');
    if (S.stats.mamaPets >= 100) findSecret('petfan');
    if (RECIPES.every(r => S.cooked[r.id])) findSecret('chef');
  }

  /* ============================================================
     THE KITCHEN - eggs in the larder, a recipe on the board,
     dishes on the counter, diners at the hatch
     ============================================================ */
  function recipeOpen(id) { const r = RECIPE_BY_ID[id]; return !!r && !r.hen && (!r.needs || lvl(r.needs) > 0); }
  function recipesOpen() { return RECIPES.filter(r => !r.hen && recipeOpen(r.id)); }
  function setRecipe(k, id) { const kt = S.kitchens[k]; if (!kt || !recipeOpen(id)) return false; kt.recipe = id; return true; }
  function kitchenRoom(k) { const kt = S.kitchens[k]; return kt ? ECON.kitchenPantry - kt.pantry.length : 0; }
  function kitchenAdd(k, e) {
    const kt = S.kitchens[k];
    if (!kt || kt.pantry.length >= ECON.kitchenPantry) return false;
    kt.pantry.push({ tier: e.tier, golden: !!e.golden, rainbow: !!e.rainbow, pol: !!e.pol });
    return true;
  }
  function basketToKitchen(k) {
    let n = 0;
    while (S.basket.length && kitchenAdd(k, S.basket[S.basket.length - 1])) { S.basket.pop(); n++; }
    return n;
  }
  function dishMult() { return 1 + 0.2 * lvl('menu'); }
  function cookTime(k, r) { return r.time * Math.pow(0.88, lvl('chef')) / storeyMult(k); }
  /* a hen dropped on the kitchen goes in the oven; dinosaurs need the grill */
  function kitchenRoast(k, ch) {
    const kt = S.kitchens[k];
    if (!kt) return 'none';
    if (kt.cook) return 'busy';
    const sp = SPECIES[ch.sp];
    if (sp.tier === TIER_MOON) return 'locked';
    const r = RECIPE_BY_ID[sp.tier === TIER_DINO ? 'dino' : 'roast'];
    if (r.needs && !lvl(r.needs)) return 'locked';
    const value = Math.round(eggValue(sp.tier, false) * r.mult * (1 + 0.1 * rankOf(ch)) * dishMult());
    kt.cook = { recipe: r.id, t: 0, T: cookTime(k, r), value };
    S.stats.roasts++;
    note('food', 'A ' + sp.name + ' went into the pot.', ch.sp);
    emit('roast', { k, ch, r });
    return 'roasting';
  }
  function tickKitchens(dt) {
    for (const k of Object.keys(S.kitchens)) {
      const kt = S.kitchens[k];
      const [c, r] = k.split(',').map(Number);
      if (kt.cook) {
        kt.cook.t += dt * machineBoost(c * 16 + 16, r * 16 + 16);
        if (kt.cook.t >= kt.cook.T && kt.counter.length < ECON.kitchenCounter) {
          kt.counter.push({ recipe: kt.cook.recipe, value: kt.cook.value });
          S.cooked[kt.cook.recipe] = (S.cooked[kt.cook.recipe] || 0) + 1;
          S.stats.cooked++;
          emit('cooked', { k, recipe: kt.cook.recipe, x: c * 16 + 16, y: r * 16 });
          kt.cook = null;
        }
        continue;
      }
      /* start the next dish once the larder can cover it */
      const rc = RECIPE_BY_ID[kt.recipe] || RECIPES[0];
      if (!recipeOpen(rc.id)) { kt.recipe = 'omelette'; continue; }
      if (kt.counter.length >= ECON.kitchenCounter) continue;
      if (kt.pantry.length < rc.eggs || S.feedStore < rc.feed) continue;
      const used = kt.pantry.splice(0, rc.eggs);
      S.feedStore -= rc.feed;
      const base = used.reduce((a, e) => a + eggValue(e.tier, e.golden, e.pol), 0);
      kt.cook = { recipe: rc.id, t: 0, T: cookTime(k, rc), value: Math.round(base * rc.mult * dishMult()) };
    }
  }
  function kitchenCounterValue() { return Object.values(S.kitchens).reduce((a, kt) => a + kt.counter.reduce((b, d) => b + d.value, 0), 0); }
  function sellDish(k) {
    const kt = S.kitchens[k];
    if (!kt || !kt.counter.length) return 0;
    const d = kt.counter.shift();
    earn(d.value, 'food');
    kt.sold++;
    S.stats.dishes++;
    return d.value;
  }

  /* ============================================================
     THE CHICKEN PARK - hens on show, visitors at the gate
     ============================================================ */
  function parkSlots(k) { return ECON.parkSlots + (S.storeys[k] ? 2 : 0); }
  function parkAdd(k, ch) {
    const p = S.parks[k];
    if (!p) return 'none';
    const sp = SPECIES[ch.sp];
    if (isChick(ch)) return 'chick';
    if (sp.tier === TIER_DINO && !lvl('dinopen')) return 'nodino';
    if (p.slots.filter(Boolean).length >= parkSlots(k)) return 'full';
    let i = p.slots.findIndex(s => !s);
    if (i < 0) i = p.slots.length;
    p.slots[i] = ch;
    if (sp.tier === TIER_DINO) S.stats.dinoShown++;
    note('park', sp.name + ' went on show at the park.', ch.sp);
    emit('exhibit', { k, ch });
    return true;
  }
  function parkEject(k, i) {
    const p = S.parks[k];
    if (!p || !p.slots[i]) return false;
    const ch = p.slots[i];
    p.slots[i] = null;
    const [c, r] = k.split(',').map(Number);
    ch.x = c * 16 + 6 + i * 7; ch.y = r * 16 + 50;
    ch.state = 'idle'; ch.t = 0.5; ch.target = null;
    S.chickens.push(ch);
    return true;
  }
  function exhibitAppeal(ch) {
    const sp = SPECIES[ch.sp];
    let a = Math.pow(sp.tier + 1, 1.6) * (1 + 0.25 * rankOf(ch));
    if (sp.tier === TIER_DINO) a *= 4;
    if (sp.tier === TIER_MOON) a *= 3;
    if (ch.mods && ch.mods.length) a *= 1 + 0.15 * ch.mods.length;
    return a;
  }
  function parkAppeal(k) { const p = S.parks[k]; return p ? p.slots.filter(Boolean).reduce((a, ch) => a + exhibitAppeal(ch), 0) : 0; }
  function ticketPrice(k) {
    const v = ECON.ticketBase * parkAppeal(k) * (1 + 0.15 * lvl('tickets')) * (lvl('giftshop') ? 1.3 : 1) * (lvl('nightshow') ? 1.5 : 1) * tycoon();
    return Math.round(v);
  }
  function busEvery() { return ECON.parkBusEvery / (lvl('busstop') ? 1.5 : 1) / (1 + 0.12 * billboardPull()); }
  function tickParks(dt) {
    for (const k of Object.keys(S.parks)) {
      const p = S.parks[k];
      const appeal = parkAppeal(k);
      if (appeal <= 0) { p.t = Math.min(p.t || 0, 5); continue; }
      p.t = (p.t || 0) + dt;
      if (p.t < busEvery()) continue;
      p.t = 0;
      const n = Math.min(9, 2 + Math.floor(Math.sqrt(appeal) / 3) + lvl('crowds'));
      /* the bus rolls by and lets them off at the gate */
      cars.push({ id: nextId++, kind: 'bus', col: '#ffd23f', dir: 1, tour: true, x: -70, y: laneY(1), v: 60 });
      const e = roadEntry();
      for (let i = 0; i < n; i++) spawnVisitor('tourist', k, e.x - 40 - i * 9, e.y + (i % 2) * 5, ticketPrice(k));
      emit('bus', { k, n });
    }
  }

  /* ============================================================
     VISITORS - diners at the kitchen hatch and tourists at the
     park gate: little folk who walk in, pay, gawp and leave
     ============================================================ */
  function spawnVisitor(kind, k, x, y, pay) {
    if (S.visitors.length > 40) return null;
    const v = { id: nextId++, kind, k, x, y, state: 'in', t: 0, pay: pay || 0, dir: 1, frame: 0, anim: 0, seed: Math.floor(Math.random() * 1e9) };
    S.visitors.push(v);
    return v;
  }
  function buildingFront(k, w, h) { const [c, r] = k.split(',').map(Number); return { x: c * 16 + w * 8 - 6, y: r * 16 + h * 16 + 2 }; }
  function walkVisitor(v, tx, ty, dt) {
    const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const sp = 30 * groundSpeed(v.x + 6, v.y + 12) * dt;
    v.dir = dx > 0 ? 1 : -1;
    let nx = v.x + dx / d * Math.min(d, sp), ny = v.y + dy / d * Math.min(d, sp);
    if (inPond(nx + 6, ny + 8)) ny = v.y;
    v.x = nx; v.y = ny;
    v.anim = (v.anim || 0) + sp;
    if (v.anim > 5) { v.anim = 0; v.frame ^= 1; }
    return false;
  }
  let dinerT = 0;
  function tickVisitors(dt) {
    /* diners turn up while there is something on a counter */
    const withFood = Object.keys(S.kitchens).filter(k => S.kitchens[k].counter.length);
    if (withFood.length) {
      dinerT += dt;
      if (dinerT >= ECON.dinerEvery / (lvl('diner') ? 2 : 1)) {
        dinerT = 0;
        const e = roadEntry();
        spawnVisitor('diner', withFood[Math.floor(Math.random() * withFood.length)], e.x, e.y, 0);
      }
    } else dinerT = Math.min(dinerT, 5);
    for (let i = S.visitors.length - 1; i >= 0; i--) {
      const v = S.visitors[i];
      const b = BUILDS[v.kind === 'diner' ? 'kitchen' : 'park'];
      const alive = v.kind === 'diner' ? S.kitchens[v.k] : S.parks[v.k];
      if (!alive && v.state !== 'out') v.state = 'out';
      if (v.state === 'in') {
        const f = buildingFront(v.k, b.w, b.h);
        if (walkVisitor(v, f.x + ((v.id % 5) - 2) * 5, f.y + (v.id % 3) * 2, dt)) {
          v.state = 'stay'; v.t = v.kind === 'diner' ? 2.5 : ECON.parkWatch;
          if (v.kind === 'diner') {
            const got = sellDish(v.k);
            if (got) emit('dine', { x: v.x + 6, y: v.y, v: got }); else v.state = 'out';
          } else {
            earn(v.pay, 'park');
            alive.visitors = (alive.visitors || 0) + 1;
            S.stats.visitors++;
            emit('ticket', { x: v.x + 6, y: v.y, v: v.pay, k: v.k });
          }
        }
      } else if (v.state === 'stay') {
        v.t -= dt; v.frame = 0;
        if (v.t <= 0) v.state = 'out';
      } else {
        const e = roadEntry();
        if (walkVisitor(v, e.x + 12, e.y, dt) || v.x > WORLD.W - 8) S.visitors.splice(i, 1);
      }
    }
  }

  /* ============================================================
     FOSSILS AND THE TIME MACHINE
     ============================================================ */
  function fossilOdds() { return ECON.fossilChance * (lvl('fossilhunt') ? 3 : 1); }
  function dropFossil(x, y) {
    if (S.fossils.length > 30) return null;
    const f = { id: nextId++, x: Math.max(8, Math.min(WORLD.W - 8, x)), y: Math.max(20, Math.min(WORLD.roadY - 8, y)), z: -14, vz: 0, seed: Math.floor(Math.random() * 999) };
    S.fossils.push(f);
    note('fossil', 'Something very old turned up in the dirt.');
    emit('fossil', { x: f.x, y: f.y });
    return f;
  }
  function fossilAt(x, y) { return S.fossils.find(f => Math.abs(x - f.x) < 8 && Math.abs(y - f.y) < 8) || null; }
  function collectFossil(f) {
    const i = S.fossils.indexOf(f);
    if (i < 0) return false;
    S.fossils.splice(i, 1);
    S.fossilCount++;
    S.stats.fossils++;
    findSecret('fossil');
    emit('fossilgot', { x: f.x, y: f.y });
    return true;
  }
  function tickFossils(dt) { for (const f of S.fossils) if (f.z < 0) { f.vz += 60 * dt; f.z = Math.min(0, f.z + f.vz * dt); } }
  function tmTime(k) { return ECON.dinoTime * Math.pow(0.85, lvl('deextinct')) / storeyMult(k); }
  function canLoadTM(k) { const tm = S.timemachines[k]; return !!tm && !tm.on && S.fossilCount >= ECON.dinoFossils && S.chickens.length < chickenCap(); }
  function loadTM(k) {
    if (!canLoadTM(k)) return false;
    const tm = S.timemachines[k];
    S.fossilCount -= ECON.dinoFossils;
    tm.on = true; tm.t = 0; tm.T = tmTime(k);
    emit('tmstart', { k });
    return true;
  }
  function tickTimeMachines(dt) {
    for (const k of Object.keys(S.timemachines)) {
      const tm = S.timemachines[k];
      if (!tm.on) continue;
      const [c, r] = k.split(',').map(Number);
      tm.t += dt * machineBoost(c * 16 + 16, r * 16 + 16);
      if (tm.t < tm.T || S.chickens.length >= chickenCap()) continue;
      tm.on = false; tm.t = 0; tm.made = (tm.made || 0) + 1;
      hatchChicken(TIER_DINO, c * 16 + 16, r * 16 + 36, false);
      emit('tmdone', { k, x: c * 16 + 16, y: r * 16 + 16 });
    }
  }

  /* ============================================================
     THE FOUNDER
     A raccoon with a plan, walking his own farm. He heads for
     whatever the current job is about, says his piece over the
     fence, and takes the credit the moment it lands.
     ============================================================ */
  function boss() { return S.boss; }
  function bossSay(line, secs, pose) {
    const b = S.boss;
    if (!b || !line) return false;
    b.line = line;
    b.lineT = secs || 6;
    b.pose = pose || 'stand';
    emit('boss', { line, pose: b.pose });
    return true;
  }
  /* where on the farm a job actually happens */
  function bossSpot(where) {
    const W2 = WORLD;
    if (where === 'mama') return { x: W2.mama.x + 30, y: W2.mama.y + 2, at: 'mama' };
    if (where === 'lab') return { x: W2.stations.lab.x + 38, y: W2.stations.lab.y + 18, at: 'lab' };
    if (where === 'truck') return { x: W2.truckHome.x + 62, y: W2.truckHome.y - 34, at: 'truck' };
    if (where === 'road') { const e = roadEntry(); return { x: Math.max(20, e.x - 70), y: W2.roadY - 34, at: 'road' }; }
    if (where === 'inc') {
      const k = Object.keys(S.incs)[0] || W2.starterInc.join(',');
      const [c, r] = k.split(',').map(Number);
      return { x: c * 16 + 36, y: r * 16 + 22, at: 'inc' };
    }
    /* the field: a crop if there is one, else anywhere he owns */
    const soil = Object.keys(S.soil);
    if (soil.length) {
      const [c, r] = soil[Math.floor(Math.random() * soil.length)].split(',').map(Number);
      return { x: c * 16 + 18, y: r * 16 + 4, at: 'field' };
    }
    const owned = PLOTS.filter(p => S.plots[p.id]);
    const p = owned[Math.floor(Math.random() * owned.length)] || PLOTS[PLOT_START];
    return { x: p.tc * 16 + 30 + Math.random() * (PLOT_W * 16 - 60),
             y: p.tr * 16 + 30 + Math.random() * (PLOT_H * 16 - 60), at: 'field' };
  }
  function bossGo(where) {
    const sp = bossSpot(where);
    const b = S.boss;
    b.tx = Math.max(12, Math.min(WORLD.W - 26, sp.x));
    b.ty = Math.max(24, Math.min(WORLD.roadY - 30, sp.y));
    b.at = sp.at;
    b.state = 'walk';
    b.t = 26;                                  /* give up and stand about after this long */
  }
  function bossWalk(dt) {
    const b = S.boss;
    const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const sp = 26 * groundSpeed(b.x + 14, b.y + 30) * dt;
    b.dir = dx > 0 ? 1 : -1;
    let nx = b.x + dx / d * Math.min(d, sp), ny = b.y + dy / d * Math.min(d, sp);
    if (inPond(nx + 10, ny + 22) || !inOwned(nx + 10, ny + 22)) { nx = b.x; ny = b.y; b.t = Math.min(b.t, 0.2); }
    b.x = nx; b.y = ny;
    b.anim += sp;
    if (b.anim > 5) { b.anim = 0; b.frame ^= 1; }
    return false;
  }
  const pickLine = arr => arr[Math.floor(Math.random() * arr.length)];
  /* what he has to say where he is standing: the job first, then the place */
  function bossLineHere() {
    /* the jobs come down as paperwork now; he only has opinions - about
       where he is standing, what the sky is doing, and how the money looks */
    const at = BOSS_AT[S.boss.at];
    if (at && Math.random() < 0.5) return pickLine(at);
    if (S.weather && S.weather.rain && Math.random() < 0.4) return pickLine(BOSS_RAIN);
    const ph = dayPhase();
    if (setting('dayNight') && (ph > 0.78 || ph < 0.08) && Math.random() < 0.35) return pickLine(BOSS_NIGHT);
    if (S.coins > 250000 && Math.random() < 0.3) return pickLine(BOSS_RICH);
    if (S.coins < 25 && Math.random() < 0.5) return pickLine(BOSS_BROKE);
    return pickLine(BOSS_IDLE);
  }
  function tickBoss(dt) {
    const b = S.boss;
    if (!b || !S.company.done) return;
    if (b.lineT > 0) { b.lineT -= dt; if (b.lineT <= 0) { b.line = null; if (b.pose === 'cheer' || b.pose === 'read') b.pose = 'stand'; } }
    b.t -= dt;
    if (b.state === 'walk') {
      if (bossWalk(dt) || b.t <= 0) {
        b.state = 'talk';
        b.t = 3 + Math.random() * 3;
        bossSay(bossLineHere(), 6, 'stand');
      }
      return;
    }
    if (b.t > 0) return;
    if (b.state === 'talk') {
      /* a breather: he reads the ledger, or just stands and admires it */
      b.state = 'idle';
      b.t = 4 + Math.random() * 6;
      b.pose = Math.random() < 0.35 ? 'read' : 'stand';
      return;
    }
    /* off to the next thing - wherever the current job is, most of the time */
    const q = currentQuest();
    b.pose = 'stand';
    bossGo(q && Math.random() < 0.7 ? q.where : 'field');
  }
  /* a fresh job: he goes and stands where it happens, and says so */
  function bossTap() {
    const b = S.boss;
    if (!b) return null;
    S.stats.bossPets++;
    /* keep bothering him and something comes out of the hat */
    if (S.stats.bossPets % 10 === 0 && S.chickens.length < chickenCap()) {
      const sp = pickSpecies(Math.min(TIER_DIVINE, 1 + Math.floor(Math.random() * 3)));
      if (!S.disc.includes(sp.id)) { S.disc.push(sp.id); mark('pedia'); }
      const born = spawnChicken(sp.id, b.x + 4, b.y - 6);
      born.age = 1; born.fed = 1; born.raised = 1e9; born.food = 1;
      findSecret('tophat');
      note('hat', 'A ' + sp.name + ' climbed out of the founder\'s hat.', sp.id);
      emit('hatchick', { x: b.x + 14, y: b.y - 10, sp });
      bossSay('That is not mine. I have never seen that hen before.', 7, 'cheer');
      return currentQuest();
    }
    bossSay(pickLine(BOSS_IDLE), 7, S.stats.bossPets % 4 === 0 ? 'cheer' : 'stand');
    return currentQuest();
  }
  function bossAt(x, y) {
    const b = S.boss;
    if (!b || !S.company.done) return null;
    return (x > b.x - 2 && x < b.x + 24 && y > b.y - 8 && y < b.y + 29) ? b : null;
  }

  /* ============================================================
     THE CHRONICLE - the valley's opinion of you, delivered as a
     newspaper with two ways out of it printed underneath. One waits
     on the front page until you pick; the clock does not start
     again until you have.
     ============================================================ */
  function newsEligible(e) {
    const n = e.need || {};
    if (n.staff !== undefined && S.staff.length < n.staff) return false;
    if (n.coins !== undefined && S.stats.coinsEarned < n.coins) return false;
    if (n.routes !== undefined && S.routes.length < n.routes) return false;
    return true;
  }
  function rollEvent() {
    /* prefer the ones you have not had yet; once they are all used, the
       memory clears and they come round again */
    let pool = EVENTS.filter(e => newsEligible(e) && S.newsSeen.indexOf(e.id) === -1);
    if (!pool.length) { S.newsSeen = []; pool = EVENTS.filter(newsEligible); }
    if (!pool.length) return null;
    const tot = pool.reduce((a, e) => a + (e.w || 1), 0);
    let roll = Math.random() * tot;
    for (const e of pool) { roll -= (e.w || 1); if (roll <= 0) return e; }
    return pool[pool.length - 1];
  }
  function openNews(id) {
    const e = id ? EVENT_BY_ID[id] : rollEvent();
    if (!e || S.news) return null;
    const rnd = Math.random;
    const filler = NEWS_FILLER.slice().sort(() => rnd() - 0.5).slice(0, 3);
    S.news = { id: e.id, filler, t: 0 };
    if (S.newsSeen.indexOf(e.id) === -1) S.newsSeen.push(e.id);
    S.stats.news = (S.stats.news || 0) + 1;
    emit('news', { ev: e, news: S.news });
    return e;
  }
  /* can you afford what this choice says it costs? */
  function newsAfford(e, i) {
    const c = (e.choices[i] || {}).cost || {};
    if (c.coins !== undefined && S.coins < c.coins) return false;
    if (c.feathers !== undefined && S.feathers < c.feathers) return false;
    return true;
  }
  function chooseNews(i) {
    if (!S.news) return false;
    const e = EVENT_BY_ID[S.news.id];
    const ch = e && e.choices[i];
    if (!ch || !newsAfford(e, i)) return false;
    const fx = ch.fx || {};
    if (fx.coins) S.coins = Math.max(0, S.coins + fx.coins);
    if (fx.feathers) S.feathers = Math.max(0, S.feathers + fx.feathers);
    if (fx.eggs) {
      if (fx.eggs < 0) { for (let n = 0; n < -fx.eggs && S.eggs.length; n++) S.eggs.pop(); }
      else for (let n = 0; n < fx.eggs; n++) layEgg(WORLD.mama.x + Math.random() * 40 - 20, WORLD.mama.y + Math.random() * 24 - 12);
    }
    if (fx.decree) S.decree = Object.assign({ T: fx.decree.t }, fx.decree);
    S.news = null;
    S.newsT = ECON.newsEvery * (0.7 + Math.random() * 0.6);
    mark('news');
    note('news', e.head + ' - ' + ch.label.toLowerCase() + '.');
    if (ch.line) bossSay(ch.line, 'boss', 5);
    emit('newsdone', { ev: e, choice: ch, i });
    return true;
  }
  function tickNews(dt) {
    if (S.decree) {
      S.decree.t -= dt;
      if (S.decree.t <= 0) { const d = S.decree; S.decree = null; emit('decreeover', { decree: d }); }
    }
    if (S.news || !S.company.done) return;
    S.newsT -= dt;
    if (S.newsT <= 0) { S.newsT = ECON.newsEvery; openNews(); }
  }

  /* ---------- master tick ---------- */
  function tick(dt) {
    tickMama(dt);
    tickBugs(dt);
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
    tickBees(dt);
    tickTraffic(dt);
    tickNews(dt);
    tickOrders(dt);
    moversTick(dt);
    tickQuests();
    tickBoss(dt);
    tickLedger(dt);
    tickMarket(dt);
    tickWeather(dt);
    tickEmpire(dt);
    tickKitchens(dt);
    tickParks(dt);
    tickVisitors(dt);
    tickFossils(dt);
    tickTimeMachines(dt);
    tickAges();
    tickSecrets(dt);
    tickCanneries(dt);
    tickRoad(dt);
    tickFactories(dt);
    tickLimo(dt);
    tickPresents(dt);
    tickAch(dt);
    tickWarden(dt);
  }

  /* ---------- offline ---------- */
  function applyOffline() {
    const now = Date.now();
    let dt = (now - (S.last || now)) / 1000;
    S.last = now;
    if (dt < 30) { tick(Math.min(2, Math.max(0, dt))); return null; }
    if (dt >= 8 * 3600) findSecret('sleeper');
    dt = Math.min(dt, ECON.offlineCapHrs * 3600);
    S.visitors = [];
    let laid = 0, hatched = 0, pay = 0, feathersGot = 0;
    /* Mama only lays for as long as the feed in her lasts */
    const mamaRan = Math.min(dt, mamaBelly() * ECON.mamaHunger);
    S.mama.belly = Math.max(0, mamaBelly() - dt / ECON.mamaHunger);
    const layers = [{ tier: S.mamaTier, x: WORLD.mama.x, y: WORLD.mama.y + 10, span: mamaRan }]
      .concat(S.chickens.map(ch => ({ tier: SPECIES[ch.sp].tier, x: ch.x + 10, y: ch.y + 14, span: dt })));
    for (const L of layers) {
      const n = Math.floor(L.span / layTime(L.tier));
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
        earn(pay, 'sales'); S.stats.sold += S.truck.load.length;
      }
      S.truck.load = []; S.truck.state = 'parked'; S.truck.sold = false;
    }
    /* crops kept growing */
    for (const k of Object.keys(S.soil)) {
      const t = S.soil[k];
      if (!t.crop) continue;
      const [c, r] = k.split(',').map(Number);
      const span = wateredBy(c, r) ? dt : Math.min(dt, (t.water || 0) * ECON.waterLast);
      t.growth = Math.min(1, t.growth + span / CROPS[t.crop].grow * cropSpeed(c, r));
      if (!wateredBy(c, r)) t.water = Math.max(0, (t.water || 0) - dt / ECON.waterLast);
    }
    Object.keys(S.sites).forEach(finishSite);
    S.orders = [];
    S.limo = null; S.drone = null;
    if (factoryIncome()) earn(Math.round(factoryIncome() / 60 * dt), 'factories');
    S.eggs.forEach(e => { e.z = 0; e.vz = 0; });
    return { seconds: dt, laid, hatched, pay, feathersGot, wages };
  }

  /* ---------- save / load ---------- */
  /* ---------- save slots: three eggs on the menu ---------- */
  let slot = 0;
  try { slot = Math.max(0, Math.min(SAVE_SLOTS - 1, +(localStorage.getItem('infEggCo_slot') || 0))); } catch (e) {}
  function slotKey(i) { return SAVE_KEY + (i ? '_s' + i : ''); }
  function currentSlot() { return slot; }
  function saveMeta() {
    return { name: S.company.name, done: !!S.company.done, pct: completion(), playT: S.playT || 0, coins: S.coins, age: ageIndex(),
             disc: S.disc.length, logo: S.company.logo, col1: S.company.col1, col2: S.company.col2, at: Date.now(),
             wardrobe: Object.assign({}, S.wardrobe), quests: QUESTS.filter(questDone).length };
  }
  /* what is in a slot, without loading it */
  function slotInfo(i) {
    try {
      const raw = localStorage.getItem(slotKey(i));
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || d.v !== 7) return null;
      if (d.meta) return d.meta;
      return { name: (d.company || {}).name || 'INF EGG CO.', done: !!(d.company || {}).done, pct: 0, playT: d.playT || 0, coins: d.coins || 0, age: d.age || 0,
               disc: (d.disc || []).length, logo: (d.company || {}).logo, col1: (d.company || {}).col1, col2: (d.company || {}).col2, at: d.last || 0, quests: 0 };
    } catch (e) { return null; }
  }
  function setSlot(i) {
    i = Math.max(0, Math.min(SAVE_SLOTS - 1, i | 0));
    if (i === slot) return false;
    save();
    slot = i;
    try { localStorage.setItem('infEggCo_slot', String(slot)); } catch (e) {}
    S = freshState();
    nextId = 1;
    if (!load()) { ensureStarterInc(); rebuildOcc(); clampCam(); }
    mark('skills', 'pedia', 'build', 'ground');
    emit('slot', { slot });
    return true;
  }
  function deleteSlot(i) {
    try { localStorage.removeItem(slotKey(i)); } catch (e) {}
    if (i === slot) reset();
    emit('slot', { slot });
    return true;
  }
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
      slim.meta = saveMeta();
      slim.eggs.forEach(e => { e.x = Math.round(e.x); e.y = Math.round(e.y); e.z = 0; e.vz = 0; e.suck = null; });
      slim.chickens.forEach(c => { c.x = Math.round(c.x); c.y = Math.round(c.y); c.target = null; });
      slim.items.forEach(i => { i.x = Math.round(i.x); i.y = Math.round(i.y); });
      slim.plumes.forEach(p => { p.x = Math.round(p.x); p.y = Math.round(p.y); p.z = 0; });
      slim.staff.forEach(w => { w.x = Math.round(w.x); w.y = Math.round(w.y); w.target = null; });
      slim.orders.forEach(o => { o.x = Math.round(o.x); o.y = Math.round(o.y); });
      localStorage.setItem(slotKey(slot), JSON.stringify(slim));
      return true;
    } catch (e) { return false; }
  }
  function ensureStarterInc() {
    const k = WORLD.starterInc.join(',');
    if (!S.incs[k]) S.incs[k] = { queue: [], prog: 0 };
  }
  function load() {
    try {
      const raw = localStorage.getItem(slotKey(slot));
      if (!raw) { ensureStarterInc(); rebuildOcc(); return false; }
      const d = JSON.parse(raw);
      if (!d || d.v !== 7) { ensureStarterInc(); rebuildOcc(); return false; }
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
       'paint', 'deco', 'polishers', 'graders', 'dynamos', 'beehives', 'genelabs', 'sites', 'storeys', 'quests', 'billboards',
       'kitchens', 'parks', 'timemachines', 'secrets', 'cooked', 'hrs', 'canneries', 'pantry', 'goods', 'factories', 'ach', 'cosOwned',
       'composts', 'wormfarms', 'bugjar'].forEach(m => { if (!S[m]) S[m] = {}; });
      if (!Array.isArray(S.presents)) S.presents = [];
      /* bugs never survive a reload: they burrow while you are away */
      S.bugs = [];
      if (!Array.isArray(S.limoQueue)) S.limoQueue = [];
      if (!S.tut || typeof S.tut !== 'object') S.tut = {};
      S.limo = null; S.drone = null; S.drone = null;
      if (S.warden && typeof S.warden.x !== 'number') S.warden = null;
      S.garage = Object.assign({ col: null, decal: 'none', upg: {}, routes: {} }, S.garage || {});
      if (!S.garage.upg) S.garage.upg = {};
      if (!S.garage.routes) S.garage.routes = {};
      S.road = Object.assign({ events: [], t: 90, weather: {}, wt: 40 }, S.road || {});
      if (!Array.isArray(S.road.events)) S.road.events = [];
      if (!S.road.weather) S.road.weather = {};
      S.wardrobe = Object.assign({}, WARDROBE_DEFAULT, S.wardrobe || {});
      S.settings = Object.assign({}, SETTINGS_DEFAULT, S.settings || {});
      S.muted = !S.settings.sound;
      if (typeof S.premiumT !== 'number') S.premiumT = 0;
      Object.values(S.canneries).forEach(cn => { if (!GOODS[cn.recipe]) cn.recipe = 'flour'; if (typeof cn.made !== 'number') cn.made = 0; });
      Object.keys(S.quests).forEach(id => { if (S.quests[id] === true) S.quests[id] = 2; });
      if (!Array.isArray(S.fossils)) S.fossils = [];
      if (!Array.isArray(S.visitors)) S.visitors = [];
      S.visitors = S.visitors.filter(v => v && typeof v.x === 'number' && v.k);
      if (typeof S.age !== 'number') S.age = 0;
      if (typeof S.fossilCount !== 'number') S.fossilCount = 0;
      if (typeof S.playT !== 'number') S.playT = 0;
      Object.values(S.kitchens).forEach(kt => { if (!Array.isArray(kt.pantry)) kt.pantry = []; if (!Array.isArray(kt.counter)) kt.counter = []; if (!kt.recipe) kt.recipe = 'omelette'; if (typeof kt.sold !== 'number') kt.sold = 0; });
      Object.values(S.parks).forEach(p => { if (!Array.isArray(p.slots)) p.slots = []; p.slots = p.slots.map(ch => ch && SPECIES[ch.sp] ? ch : null); });
      if (!Array.isArray(S.orders)) S.orders = [];
      S.orders = S.orders.filter(o => o && o.state && typeof o.x === 'number');
      if (typeof S.orderT !== 'number') S.orderT = 45;
      S.company = Object.assign({}, COMPANY_DEFAULT, S.company || {});
      if (!Array.isArray(S.company.sig)) S.company.sig = null;
      S.weather = Object.assign({ t: 150, rain: false, left: 0, after: 0 }, S.weather || {});
      S.empire = Object.assign({ open: { valley: true }, branches: {}, t: 0, rocket: 0 }, S.empire || {});
      if (!S.empire.open) S.empire.open = { valley: true };
      if (!S.empire.branches) S.empire.branches = {};
      S.ledger = Object.assign({ hist: [], acc: 0, t: 0, sales: 0, orders: 0, honey: 0, quests: 0, stocks: 0 }, S.ledger || {});
      if (!Array.isArray(S.ledger.hist)) S.ledger.hist = [];
      S.market = Object.assign({ t: 0, px: {}, hist: {}, held: {} }, S.market || {});
      S.boss = Object.assign(freshState().boss, S.boss || {});
      S.boss.line = null; S.boss.lineT = 0; S.boss.state = 'idle'; S.boss.t = 2; S.boss.said = null;
      if (!inOwned(S.boss.x + 14, S.boss.y + 32)) { S.boss.x = WORLD.mama.x + 34; S.boss.y = WORLD.mama.y + 4; }
      Object.values(S.billboards).forEach(b => { if (typeof b.art !== 'string') b.art = null; });
      S.stats = Object.assign(freshState().stats, S.stats || {});
      Object.values(S.sites).forEach(st => { if (typeof st.t !== 'number') st.t = 0; });
      if (!toolOpen(S.tool)) S.tool = 'hand';
      if (typeof S.brush !== 'number') S.brush = 2;
      S.built = Object.assign(zeroCounts(), S.built);
      Object.keys(S.built).forEach(t => { if (typeof S.built[t] !== 'number' || !isFinite(S.built[t])) S.built[t] = 0; });
      S.mama = Object.assign({ lay: 8, petCd: 0, belly: 1 }, S.mama);
      if (typeof S.mama.belly !== 'number') S.mama.belly = 1;
      S.staff.forEach(w => { if (w.bot === undefined) w.bot = (w.role === 'cull' || w.role === 'match'); });
      S.chickens.forEach(c => {
        if (c.age === undefined) c.age = 1;
        if (c.food === undefined) c.food = 1;
        /* saves from before growing took time: carry their progress over */
        if (c.fed === undefined) c.fed = c.age;
        if (c.raised === undefined) c.raised = c.age >= 1 ? 1e9 : c.age * ECON.growTime;
        if (!c.genes) c.genes = rollGenes(SPECIES[c.sp] ? SPECIES[c.sp].tier : 0);
        if (!Array.isArray(c.mods)) c.mods = [];
        if (typeof c.laid !== 'number') c.laid = 0;
      });
      S.empire.moonT = S.empire.moonT || 0;
      if (!Array.isArray(S.routes) || !S.routes.length) S.routes = ['hamlet'];
      if (!CITY_BY_ID[S.route]) S.route = S.routes[0];
      if (!Array.isArray(S.diary)) S.diary = [];
      if (typeof S.day !== 'number') { S.day = 1; S.dayT = 0; }
      Object.values(S.silos).forEach(si => { if (!si.store) si.store = []; });
      ensureStarterInc();
      nextId = 1 + Math.max(0, ...S.eggs.map(e => e.id || 0), ...S.chickens.map(c => c.id || 0), ...S.plumes.map(p => p.id || 0),
                            ...S.visitors.map(v => v.id || 0), ...S.fossils.map(f => f.id || 0),
                            ...Object.values(S.parks).flatMap(p => p.slots.filter(Boolean).map(c => c.id || 0)));
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
    try { localStorage.removeItem(slotKey(slot)); } catch (e) {}
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
    sendTruck, build, demolish, setBeltDir, ejectNest, buySkill, upgradeMama, setCamPad, camPad: getCamPad,
    staffSlots, wagePerSec, canHire, fireStaff, setRole, roleOpen,
    sendFlyers, canFlyer, flyerPrice, hireApplicant, assembleBot, botPrice,
    crewStat, crewSpeed, crewCarry, trait, machineBoost, careBoost, auraR, restCap,
    markChicken, retireChicken, rates, beltDirFor, plumeValue,
    feedCap, addFeed, canTill, till, untill, canPlant, plant, water, harvest, cropStage, ripe, harvestYield,
    terrainAt, paintAt, tileHasWater, dab, stroke, tillStroke, terrainOpen, terrainCost, cellPaintable, paintedCells, CELL_PX, dynamoLoad,
    canDecorate, decorate, undecorate, decoAt, tileOpen,
    groundSpeed, hasHQ, tileFree, botPrice, botCount,
    seedCount, cropOpen, wateredBy, isChick, growPellets, growTime, growAge, nearCoop, mamaLayTime, mamaBelly, mamaHungry, feedMama,
    vehicle, city, tripPhase, buyVehicle, buyRoute, setRoute, applicantAt, boardSpot,
    note,
    toolOpen, depotOpen, incCapAt,
    questProgress, questDone, currentQuest, questState, questReady, activeQuests, questObjs, objDone, goalProgress, claimQuest, claimAll,
    presentAt, openPresent, droneAt, tapDrone, dropFromDrone,
    get limo() { return S.limo; }, get drone() { return S.drone; }, get presents() { return S.presents; },
    pantryCount, goodsCount, pantryTotal, sellProduce, sellGoods, useGoods, canMake, hasCannery, setCanneryRecipe, setAllCanneries, canneryTime,
    garageLevel, garagePrice, canUpgrade, buyUpgrade, setPaint, paintInfo, routeStyle, setRouteStyle, tripTimeTo, payMultTo,
    eventAt, townWeather, factoryCost, canFactory, buyFactory, factoryIncome,
    hasHR, trainCost, canTrain, trainStaff,
    achDone, achProgress, ownsCosmetic, wearCosmetic, wardrobe,
    setting, setSetting, dayPhase, completion,
    currentSlot, slotInfo, setSlot, deleteSlot,
    get cars() { return cars; }, get movers() { return movers; },
    orderAt, orderSpots, giveEgg, basketToOrder, maxOrders, orderWait,
    billboardPull, billboardArt, setBillboardArt,
    boss, bossSay, bossTap, bossAt, bossGo,
    openNews, chooseNews, newsAfford, rollEvent,
    digAt, bugAt, catchBug, spawnBug, scatterBugs, sellJar, jarCount, jarValue, nearestBug,
    get passers() { return passers; },
    get bugs() { return S.bugs; }, get bugjar() { return S.bugjar; },
    warden, wardenLine, wardenAt, tapWarden,
    siteFor, storeyMult, canStorey, addStorey, storeyCost, finishSites: () => Object.keys(S.sites).forEach(finishSite),
    cropSpeed, cropTimeLeft, beeBoost,
    genesOf, gene, chScore, bestChickens, hasGeneLab, chLayTime,
    canSplice, splice, spliceCost, canClone, cloneChicken, cloneCost, canCross, crossAnimal, crossCost,
    stockPrice, buyStock, sellStock, portfolio, companyValue, setCompany, earn,
    get weather() { return S.weather; },
    regionOpen, regionReachable, canOpenRegion, openRegion, branchCount, branchCost, canBranch, buildBranch, regionIncome, branchIncome,
    rankOf, rankName, rankSpeed, rankLuck, nextRankEggs,
    ageIndex, age, nextAge, ageNeeds, ageProgress, ageMult, laneOpen,
    findSecret, secretFound,
    recipeOpen, recipesOpen, setRecipe, kitchenAdd, kitchenRoom, basketToKitchen, kitchenRoast, sellDish, kitchenCounterValue, cookTime, dishMult,
    parkSlots, parkAdd, parkEject, parkAppeal, exhibitAppeal, ticketPrice, busEvery,
    fossilAt, collectFossil, canLoadTM, loadTM, tmTime, dropFossil,
    get visitors() { return S.visitors; },
    tick, applyOffline, save, load, reset, fmt, fmtTime,
  };
})();
