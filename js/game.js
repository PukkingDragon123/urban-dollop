/* ============================================================
   INF EGG CO. v2 — world model: field, chickens, eggs, factory
   World units are virtual pixels; the UI scales them up 3x.
   ============================================================ */
'use strict';

const SAVE_KEY = 'infEggCoSave_v2';

/* the field */
const WORLD = {
  W: 384, H: 208, T: 16, COLS: 24, ROWS: 13,
  roadY: 176,                                   /* road strip rows 11-12 */
  fieldTop: 34,                                 /* fence line */
  pond: { x: 20, y: 40, w: 56, h: 30 },
  mama: { x: 56, y: 98 },                       /* nest center */
  truckHome: { x: 232, y: 172, w: 56, h: 32 },  /* parked spot on the road */
  buildRows: [3, 10], buildCols: [1, 22],
};

const GAME = (() => {

  /* ---------- state ---------- */
  let nextId = 1;
  function freshState() {
    return {
      v: 2,
      coins: 0, feathers: 0,
      mamaTier: 0,
      mama: { lay: 10, petCd: 0 },
      chickens: [],          /* {id, sp, x, y, dir, state, t, lay, petCd} */
      eggs: [],              /* ground eggs {id,tier,golden,x,y,z,vz,placed,hatch,suck} */
      basket: [],            /* {tier, golden} held by the cursor */
      belts: {},             /* "c,r" -> {dir} 0→ 1↓ 2← 3↑ */
      incs: {},              /* "c,r" -> {queue:[{tier,golden}], prog} */
      vacs: {},              /* "c,r" -> {dir, hold:[{tier,golden}], cd} */
      items: [],             /* eggs riding belts {tier,golden,x,y} */
      truck: { state: 'parked', t: 0, load: [] },
      built: { incubator: 0, vacuum: 0, belt: 0 },
      disc: [], sk: {},
      stats: { pets: 0, laid: 0, collected: 0, sold: 0, coinsEarned: 0, hatched: 0, mutations: 0 },
      muted: false, last: Date.now(),
    };
  }
  let S = freshState();

  const listeners = {};
  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
  function emit(ev, d) { (listeners[ev] || []).forEach(fn => fn(d)); }
  const dirty = { hud: true, skills: true, pedia: true, build: true };
  function mark(...k) { k.forEach(x => dirty[x] = true); }

  /* ---------- derived values ---------- */
  const lvl = id => S.sk[id] || 0;
  const disc = () => S.disc.length;
  const overclock = () => (lvl('overclock') ? 2 : 1);

  function eggValue(tier, golden) {
    let v = ECON.eggValue(tier);
    v *= 1 + 0.15 * lvl('value');
    v *= 1 + 0.01 * lvl('contracts') * disc();
    if (golden) v *= ECON.goldenMult;
    return Math.round(v);
  }
  function layTime(t) { return ECON.layTime(t) / (1 + 0.10 * lvl('happy')); }
  function petCd(isMama) { return (isMama ? ECON.mamaPetCd : ECON.basePetCd) * Math.pow(0.85, lvl('pets')); }
  function groundHatchTime(t) { return ECON.groundHatch(t) / (1 + 0.15 * lvl('warm')); }
  function incHatchTime(t) {
    return ECON.incHatch(t) / (1 + 0.15 * lvl('warm')) / (1 + 0.20 * lvl('incspeed')) / overclock();
  }
  function chickenCap() { return ECON.baseChickenCap + 3 * lvl('flock'); }
  function incCap() { return 6 + 3 * lvl('inccap'); }
  function scoopR() { return ECON.baseScoopR + 12 * lvl('magnet'); }
  function vacR() { return ECON.baseVacR + 8 * lvl('vacradius'); }
  function vacInterval() { return ECON.vacInterval / (1 + 0.25 * lvl('vacspeed')) / overclock(); }
  function beltSpeed() { return ECON.beltSpeed * (1 + 0.20 * lvl('beltspeed')) * overclock(); }
  function truckCap() { return ECON.baseTruckCap + 5 * lvl('truckcap'); }
  function tripTime() { return ECON.baseTripTime * Math.pow(0.85, lvl('route')); }
  function mutationChance() { return ECON.baseMutation + 0.015 * lvl('mutate'); }
  function goldenChance() { return 0.03 * lvl('golden'); }
  function mamaCost() { return ECON.mamaCost(S.mamaTier); }
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

  /* ---------- grid helpers ---------- */
  const key = (c, r) => c + ',' + r;
  let occ = {};  /* "c,r" -> {type, k} rebuilt on change */
  function rebuildOcc() {
    occ = {};
    Object.keys(S.belts).forEach(k => occ[k] = { type: 'belt', k });
    Object.keys(S.vacs).forEach(k => occ[k] = { type: 'vacuum', k });
    Object.keys(S.incs).forEach(k => {
      const [c, r] = k.split(',').map(Number);
      for (let dc = 0; dc < 2; dc++) for (let dr = 0; dr < 2; dr++)
        occ[key(c + dc, r + dr)] = { type: 'incubator', k };
    });
  }
  function tileBuildable(c, r) {
    if (c < WORLD.buildCols[0] || c > WORLD.buildCols[1]) return false;
    if (r < WORLD.buildRows[0] || r > WORLD.buildRows[1]) return false;
    const x = c * WORLD.T, y = r * WORLD.T, p = WORLD.pond;
    if (x + 16 > p.x && x < p.x + p.w && y + 16 > p.y && y < p.y + p.h) return false;
    const m = WORLD.mama;
    if (Math.abs(x + 8 - m.x) < 26 && Math.abs(y + 8 - m.y) < 26) return false;
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

  /* ---------- egg creation ---------- */
  function rollTier(base) {
    let t = base, mutated = false;
    if (t < TIERS.length - 1 && Math.random() < mutationChance()) {
      let jump = 1;
      if (Math.random() < 0.15 * lvl('rainbow')) jump = 2;
      t = Math.min(TIERS.length - 1, t + jump);
      mutated = true;
      S.stats.mutations++;
    }
    return { tier: t, mutated };
  }

  function layEgg(x, y, baseTier, fromPet) {
    if (S.eggs.length >= ECON.groundEggCap) return null;
    const { tier, mutated } = rollTier(baseTier);
    const golden = Math.random() < goldenChance();
    const egg = {
      id: nextId++, tier, golden,
      x: Math.max(6, Math.min(WORLD.W - 6, x + (Math.random() * 22 - 11))),
      y: Math.max(WORLD.fieldTop, Math.min(WORLD.roadY - 6, y + (Math.random() * 14 - 4))),
      z: 0, vz: -34 - Math.random() * 18,
      placed: false, hatch: 0, suck: null,
    };
    S.eggs.push(egg);
    S.stats.laid++;
    emit('lay', { egg, mutated, fromPet });
    return egg;
  }

  /* ---------- chickens ---------- */
  function inPond(x, y) {
    const p = WORLD.pond;
    return x > p.x - 6 && x < p.x + p.w + 6 && y > p.y - 6 && y < p.y + p.h + 6;
  }
  function spawnChicken(sp, x, y) {
    const ch = {
      id: nextId++, sp: sp.id,
      x: Math.max(10, Math.min(WORLD.W - 30, x)),
      y: Math.max(WORLD.fieldTop, Math.min(WORLD.roadY - 24, y)),
      dir: Math.random() < 0.5 ? -1 : 1, state: 'idle', t: Math.random() * 2,
      lay: layTime(sp.tier) * (0.3 + Math.random() * 0.7), petCd: 0,
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
  /* hatch an egg of `tier` at (x,y): returns array of birth infos (twins!) */
  function hatchChicken(tier, x, y) {
    const births = [];
    const once = t => {
      if (S.chickens.length >= chickenCap()) return;
      let ht = t;
      if (ht < TIERS.length - 1 && Math.random() < 0.05 * lvl('miracle')) ht++;
      const sp = pickSpecies(ht);
      const isNew = !S.disc.includes(sp.id);
      if (isNew) S.disc.push(sp.id);
      const f = featherFor(ht, isNew);
      S.feathers += f;
      S.stats.hatched++;
      spawnChicken(sp, x, y);
      births.push({ sp, feathers: f, isNew, miracle: ht > t });
      if (isNew) mark('pedia');
    };
    once(tier);
    if (Math.random() < 0.04 * lvl('twins')) once(tier);
    if (births.length) emit('hatch', { births, x, y });
    return births;
  }

  function tickChicken(ch, dt) {
    ch.t -= dt;
    ch.petCd = Math.max(0, ch.petCd - dt);
    if (ch.t <= 0) {
      const r = Math.random();
      if (r < 0.45) { ch.state = 'walk'; ch.dir = Math.random() < 0.5 ? -1 : 1; ch.t = 0.8 + Math.random() * 2; }
      else if (r < 0.75) { ch.state = 'idle'; ch.t = 0.6 + Math.random() * 1.6; }
      else { ch.state = 'peck'; ch.t = 0.7 + Math.random() * 0.8; }
    }
    if (ch.state === 'walk') {
      const nx = ch.x + ch.dir * 9 * dt;
      const ny = ch.y + Math.sin(ch.id + ch.x / 9) * 5 * dt;
      if (!inPond(nx + 10, ny + 10)) { ch.x = nx; ch.y = ny; } else ch.dir *= -1;
      if (ch.x < 6) { ch.x = 6; ch.dir = 1; }
      if (ch.x > WORLD.W - 26) { ch.x = WORLD.W - 26; ch.dir = -1; }
      ch.y = Math.max(WORLD.fieldTop, Math.min(WORLD.roadY - 24, ch.y));
    }
    const sp = SPECIES[ch.sp];
    ch.lay -= dt;
    if (ch.lay <= 0) {
      ch.lay = layTime(sp.tier);
      layEgg(ch.x + 10, ch.y + 16, sp.tier, false);
    }
  }

  /* ---------- petting ---------- */
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

  /* ---------- basket: scoop / drop ---------- */
  function scoopEgg(egg) {
    const i = S.eggs.indexOf(egg);
    if (i === -1) return false;
    S.eggs.splice(i, 1);
    S.basket.push({ tier: egg.tier, golden: egg.golden });
    S.stats.collected++;
    return true;
  }
  /* returns how many were accepted */
  function basketToTruck() {
    if (S.truck.state !== 'parked') return 0;
    let n = 0;
    while (S.basket.length && S.truck.load.length < truckCap()) {
      S.truck.load.push(S.basket.pop()); n++;
    }
    return n;
  }
  function basketToInc(k) {
    const inc = S.incs[k];
    if (!inc) return 0;
    let n = 0;
    while (S.basket.length && inc.queue.length < incCap()) {
      inc.queue.push(S.basket.pop()); n++;
    }
    return n;
  }
  function basketToGround(x, y) {
    let n = 0;
    while (S.basket.length) {
      const e = S.basket.pop();
      const a = (n / Math.max(1, S.basket.length + n)) * Math.PI * 2 + Math.random();
      const d = n === 0 ? 0 : 5 + Math.random() * 4 + n * 1.2;
      S.eggs.push({
        id: nextId++, tier: e.tier, golden: e.golden,
        x: Math.max(6, Math.min(WORLD.W - 6, x + Math.cos(a) * d)),
        y: Math.max(WORLD.fieldTop, Math.min(WORLD.roadY - 6, y + Math.sin(a) * d * 0.6)),
        z: 0, vz: -26 - Math.random() * 10,
        placed: true, hatch: 0, suck: null,
      });
      const egg = S.eggs[S.eggs.length - 1];
      egg.hatch = groundHatchTime(egg.tier);
      egg.hatchTotal = egg.hatch;
      n++;
    }
    return n;
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
    } else if (lvl('autosend') && tr.load.length >= truckCap()) {
      sendTruck();
    }
  }

  /* ---------- ground eggs ---------- */
  function tickEggs(dt) {
    for (let i = S.eggs.length - 1; i >= 0; i--) {
      const e = S.eggs[i];
      /* being vacuumed: fly toward the vac */
      if (e.suck) {
        const [c, r] = e.suck.split(',').map(Number);
        const tx = c * 16 + 8, ty = r * 16 + 8;
        const dx = tx - e.x, dy = ty - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 5) {
          const vac = S.vacs[e.suck];
          S.eggs.splice(i, 1);
          if (vac) { vac.hold.push({ tier: e.tier, golden: e.golden }); S.stats.collected++; }
          continue;
        }
        const sp = 90 * dt / d;
        e.x += dx * sp; e.y += dy * sp;
        continue;
      }
      /* bounce physics */
      if (e.z < 0 || e.vz !== 0) {
        e.vz += 160 * dt;
        e.z += e.vz * dt;
        if (e.z >= 0) {
          e.z = 0;
          e.vz = Math.abs(e.vz) > 24 ? -Math.abs(e.vz) * 0.4 : 0;
          if (e.vz !== 0) emit('bounce', { egg: e });
        }
      }
      /* placed eggs hatch on the ground */
      if (e.placed && e.hatch > 0) {
        e.hatch -= dt;
        if (e.hatch <= 0) {
          if (S.chickens.length >= chickenCap()) { e.hatch = 0.0001; continue; } /* wait for room */
          S.eggs.splice(i, 1);
          hatchChicken(e.tier, e.x, e.y - 8);
        }
      }
    }
  }

  /* ---------- vacuums ---------- */
  function tickVacs(dt) {
    for (const k of Object.keys(S.vacs)) {
      const v = S.vacs[k];
      const [c, r] = k.split(',').map(Number);
      const vx = c * 16 + 8, vy = r * 16 + 8;
      v.cd -= dt;
      /* suck */
      if (v.cd <= 0 && v.hold.length < ECON.vacHold) {
        const R = vacR();
        let best = null, bd = 1e9;
        for (const e of S.eggs) {
          if (e.suck) continue;
          const d = Math.hypot(e.x - vx, e.y - vy);
          if (d < R && d < bd) { best = e; bd = d; }
        }
        if (best) { best.suck = k; best.placed = false; best.hatch = 0; v.cd = vacInterval(); }
      }
      /* eject onto the belt it faces */
      if (v.hold.length) {
        const [dx, dy] = DIRV[v.dir];
        const nk = key(c + dx, r + dy);
        if (S.belts[nk]) {
          const px = (c + dx) * 16 + 8 - dx * 5, py = (r + dy) * 16 + 8 - dy * 5;
          const blocked = S.items.some(it => Math.hypot(it.x - px, it.y - py) < 8);
          if (!blocked) {
            const e = v.hold.shift();
            S.items.push({ tier: e.tier, golden: e.golden, x: px, y: py });
          }
        }
      }
    }
  }

  /* ---------- belts ---------- */
  function tickBelts(dt) {
    const spd = beltSpeed();
    for (let i = S.items.length - 1; i >= 0; i--) {
      const it = S.items[i];
      const c = Math.floor(it.x / 16), r = Math.floor(it.y / 16);
      const belt = S.belts[key(c, r)];
      if (!belt) { dropItem(i); continue; }
      const [dx, dy] = DIRV[belt.dir];
      /* spacing: stall if another item is just ahead */
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
      /* crossing into a new tile */
      const nk = key(nc, nr);
      const target = occ[nk];
      if (target && target.type === 'belt') { it.x = nx; it.y = ny; continue; }
      if (target && target.type === 'incubator') {
        const inc = S.incs[target.k];
        if (inc.queue.length < incCap()) { inc.queue.push({ tier: it.tier, golden: it.golden }); S.items.splice(i, 1); }
        /* else stall at the edge */
        continue;
      }
      if (ny >= WORLD.roadY) {  /* reached the road: truck dock */
        const th = WORLD.truckHome;
        if (S.truck.state === 'parked' && nx > th.x - 6 && nx < th.x + th.w + 6) {
          if (S.truck.load.length < truckCap()) {
            S.truck.load.push({ tier: it.tier, golden: it.golden });
            S.items.splice(i, 1);
            emit('truckload', { n: 1 });
          }
          continue; /* full: wait on belt */
        }
        dropItem(i); continue;
      }
      /* belt ends on grass: egg rolls off */
      dropItem(i);
    }
    function dropItem(i) {
      const it = S.items[i];
      S.items.splice(i, 1);
      if (S.eggs.length < ECON.groundEggCap) {
        S.eggs.push({ id: nextId++, tier: it.tier, golden: it.golden,
          x: it.x, y: Math.min(WORLD.roadY - 4, it.y), z: 0, vz: -14, placed: false, hatch: 0, suck: null });
      }
    }
  }

  /* ---------- incubators ---------- */
  function tickIncs(dt) {
    for (const k of Object.keys(S.incs)) {
      const inc = S.incs[k];
      if (!inc.queue.length) { inc.prog = 0; continue; }
      const t = inc.queue[0].tier;
      inc.prog += dt;
      if (inc.prog >= incHatchTime(t)) {
        if (S.chickens.length >= chickenCap()) continue; /* hold at 100% */
        const egg = inc.queue.shift();
        inc.prog = 0;
        const [c, r] = k.split(',').map(Number);
        hatchChicken(egg.tier, c * 16 + 16, r * 16 + 34);
      }
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
    rebuildOcc();
    mark('build');
    return true;
  }
  function setBeltDir(c, r, dir) { const b = S.belts[key(c, r)]; if (b) b.dir = dir; }
  function demolish(c, r) {
    const o = occ[key(c, r)];
    if (!o) return false;
    const k = o.k;
    if (o.type === 'belt') {
      /* items on this tile roll off */
      delete S.belts[k];
      S.built.belt = Math.max(0, S.built.belt - 1);
    } else if (o.type === 'vacuum') {
      const v = S.vacs[k];
      v.hold.forEach(e => S.eggs.length < ECON.groundEggCap && S.eggs.push({
        id: nextId++, tier: e.tier, golden: e.golden,
        x: +k.split(',')[0] * 16 + 8, y: +k.split(',')[1] * 16 + 10, z: 0, vz: -18, placed: false, hatch: 0, suck: null }));
      delete S.vacs[k];
      S.built.vacuum = Math.max(0, S.built.vacuum - 1);
    } else if (o.type === 'incubator') {
      const inc = S.incs[k];
      inc.queue.forEach(e => S.eggs.length < ECON.groundEggCap && S.eggs.push({
        id: nextId++, tier: e.tier, golden: e.golden,
        x: +k.split(',')[0] * 16 + 12 + Math.random() * 8, y: +k.split(',')[1] * 16 + 20, z: 0, vz: -18, placed: false, hatch: 0, suck: null }));
      delete S.incs[k];
      S.built.incubator = Math.max(0, S.built.incubator - 1);
    }
    S.coins += BUILDS[o.type].refund;
    /* eggs sucked toward a removed vacuum are freed */
    S.eggs.forEach(e => { if (e.suck === k) e.suck = null; });
    rebuildOcc();
    mark('build');
    return true;
  }

  /* ---------- skills & mama ---------- */
  function buySkill(id) {
    const sk = SKILL_BY_ID[id];
    if (!sk) return false;
    const cur = lvl(id);
    if (cur >= sk.max) return false;
    const pre = skillPrereq(sk);
    if (pre && lvl(pre.id) < 1) return false;
    const cost = skillCost(sk, cur);
    if (S.feathers < cost) return false;
    S.feathers -= cost;
    S.sk[id] = cur + 1;
    mark('skills', 'build', 'hud');
    return true;
  }
  function upgradeMama() {
    if (S.mamaTier >= TIERS.length - 1) return false;
    const cost = mamaCost();
    if (S.coins < cost) return false;
    S.coins -= cost;
    S.mamaTier++;
    mark('hud');
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
    tickBelts(dt);
    tickIncs(dt);
    tickTruck(dt);
  }

  /* ---------- offline ---------- */
  function applyOffline() {
    const now = Date.now();
    let dt = (now - (S.last || now)) / 1000;
    S.last = now;
    if (dt < 30) { tick(Math.min(2, Math.max(0, dt))); return null; }
    dt = Math.min(dt, ECON.offlineCapHrs * 3600);
    let laid = 0, hatched = 0, pay = 0;
    /* chickens lay onto the ground (respecting the cap) */
    const layers = [{ tier: S.mamaTier, x: WORLD.mama.x, y: WORLD.mama.y + 10 }]
      .concat(S.chickens.map(ch => ({ tier: SPECIES[ch.sp].tier, x: ch.x + 10, y: ch.y + 14 })));
    for (const L of layers) {
      const n = Math.floor(dt / layTime(L.tier));
      for (let i = 0; i < n && S.eggs.length < ECON.groundEggCap; i++) {
        if (layEgg(L.x + (Math.random() * 60 - 30), L.y + (Math.random() * 40 - 20), L.tier, false)) laid++;
      }
    }
    /* incubators keep hatching */
    for (const k of Object.keys(S.incs)) {
      const inc = S.incs[k];
      let budget = dt + inc.prog;
      inc.prog = 0;
      while (inc.queue.length && S.chickens.length < chickenCap()) {
        const need = incHatchTime(inc.queue[0].tier);
        if (budget < need) { inc.prog = budget; break; }
        budget -= need;
        const egg = inc.queue.shift();
        const [c, r] = k.split(',').map(Number);
        hatchChicken(egg.tier, c * 16 + 16, r * 16 + 34);
        hatched++;
      }
    }
    /* a truck that was away finishes its trip */
    if (S.truck.state === 'away') {
      pay = truckPayout();
      S.coins += pay; S.stats.coinsEarned += pay; S.stats.sold += S.truck.load.length;
      S.truck.load = []; S.truck.state = 'parked';
    }
    S.eggs.forEach(e => { e.z = 0; e.vz = 0; });
    return { seconds: dt, laid, hatched, pay };
  }

  /* ---------- save / load ---------- */
  function save() {
    try {
      S.last = Date.now();
      const slim = JSON.parse(JSON.stringify(S));
      slim.eggs.forEach(e => { e.x = Math.round(e.x); e.y = Math.round(e.y); e.z = 0; e.vz = 0; e.suck = null; });
      slim.chickens.forEach(c => { c.x = Math.round(c.x); c.y = Math.round(c.y); });
      slim.items.forEach(i => { i.x = Math.round(i.x); i.y = Math.round(i.y); });
      localStorage.setItem(SAVE_KEY, JSON.stringify(slim));
      return true;
    } catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || d.v !== 2) return false;
      S = Object.assign(freshState(), d);
      S.truck = Object.assign({ state: 'parked', t: 0, load: [] }, d.truck);
      nextId = 1 + Math.max(0, ...S.eggs.map(e => e.id), ...S.chickens.map(c => c.id));
      rebuildOcc();
      return true;
    } catch (e) { return false; }
  }
  function reset() {
    S = freshState();
    nextId = 1;
    rebuildOcc();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    mark('hud', 'skills', 'pedia', 'build');
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

  rebuildOcc();
  return {
    get S() { return S; },
    WORLD, dirty, mark, on, lvl, disc,
    eggValue, layTime, petCd, groundHatchTime, incHatchTime,
    chickenCap, incCap, scoopR, vacR, vacInterval, beltSpeed,
    truckCap, tripTime, mutationChance, goldenChance, mamaCost, featherFor, truckPayout,
    tileBuildable, canPlace, occAt: (c, r) => occ[key(c, r)],
    petMama, petChicken, scoopEgg, basketToTruck, basketToInc, basketToGround,
    sendTruck, build, demolish, setBeltDir, buySkill, upgradeMama,
    hatchChicken, tick, applyOffline, save, load, reset, fmt, fmtTime, inPond,
  };
})();
