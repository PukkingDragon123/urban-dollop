/* ============================================================
   INF EGG CO. — game state, economy, actions
   ============================================================ */
'use strict';

const SAVE_KEY = 'infEggCoSave_v1';

const GAME = (() => {

  /* ---------- state ---------- */
  function freshState() {
    return {
      v: 1,
      coins: 0, feathers: 0,
      eggs: TIERS.map(() => 0),
      everEgg: TIERS.map(() => false),
      pets: 0,
      mamaTier: 0,
      nests: [null, null],          /* {tier, total, left} or 'slot open' null */
      nestsBought: 0,
      coopBought: 0,
      flock: {},                    /* speciesId -> count */
      layP: {},                     /* speciesId -> accumulated seconds */
      disc: [],                     /* discovered species ids */
      sk: {},                       /* skill id -> level */
      stats: { pets: 0, eggsMade: 0, hatched: 0, sold: 0, coinsEarned: 0, mutations: 0 },
      muted: false,
      last: Date.now(),
    };
  }

  let S = freshState();
  let autoPetAcc = 0;

  /* dirty flags — ui re-renders only what changed */
  const dirty = { nests:true, vault:true, flock:true, skills:true, pedia:true, mama:true, coop:true };
  function mark(...keys){ keys.forEach(dk => dirty[dk] = true); }

  const listeners = { egg: [], hatch: [], coins: [], toast: [], discover: [] };
  function on(ev, fn){ listeners[ev].push(fn); }
  function emit(ev, data){ listeners[ev].forEach(fn => fn(data)); }

  /* ---------- derived values ---------- */
  const lvl = id => S.sk[id] || 0;
  const discCount = () => S.disc.length;

  function clicksNeeded(){ return ECON.baseClicks - lvl('bond'); }
  function clickPower(){ return 1 + lvl('soft'); }
  function autoPetRate(){ return 0.5 * lvl('auto'); }
  function grand(){ return lvl('grand') ? 2 : 1; }

  function sellValue(t) {
    let v = ECON.eggValue(t);
    v *= 1 + 0.2 * lvl('polish');
    v *= 1 + 0.01 * lvl('collector') * discCount();
    v *= grand();
    return Math.round(v);
  }
  function shopPrice(t){ return sellValue(t) * ECON.shopMult; }
  function hatchTime(t){ return ECON.hatchTime(t) / (1 + 0.15 * lvl('warm')); }
  function layTime(t) {
    let time = ECON.layTime(t);
    time /= 1 + 0.12 * lvl('feed');
    time /= 1 + 0.005 * lvl('choir') * discCount();
    time /= grand();
    return time;
  }
  function feathersFor(t, isNew) {
    let f = ECON.feathers(t);
    if (isNew) f += ECON.discoveryBonus(t);
    return Math.ceil(f * (1 + 0.2 * lvl('whisper')));
  }
  function mutationChance(source) {  /* 'click' | 'lay' */
    let c = ECON.baseMutation + 0.02 * lvl('lucky');
    if (source === 'click') c += 0.02 * lvl('pedigree');
    if (source === 'lay')   c += 0.02 * lvl('happy');
    return c;
  }
  function doubleChance(){ return 0.06 * lvl('yolk'); }
  function twinChance(){ return 0.05 * lvl('twin'); }
  function miracleChance(){ return 0.05 * lvl('miracle'); }
  function goldenChance(){ return 0.04 * lvl('golden'); }

  function nestCount(){ return ECON.baseNests + S.nestsBought + lvl('incubator'); }
  function nestBuyCost(){ return ECON.nestCost(S.nestsBought); }
  function canBuyNest(){ return S.nestsBought < ECON.maxBoughtNests; }
  function coopCap(){ return ECON.baseCoop + S.coopBought * ECON.coopPerBuy + 4 * lvl('barn'); }
  function coopBuyCost(){ return ECON.coopCost(S.coopBought); }
  function canBuyCoop(){ return S.coopBought < ECON.maxCoopBuys; }
  function flockSize(){ return Object.values(S.flock).reduce((a,b) => a+b, 0); }
  function totalEggs(){ return S.eggs.reduce((a,b) => a+b, 0); }
  function mamaCost(){ return ECON.mamaCost(S.mamaTier); }

  /* keep nests array length in sync with slots */
  function syncNests() {
    while (S.nests.length < nestCount()) S.nests.push(null);
  }

  /* ---------- egg creation ---------- */
  function rollTier(base, source) {
    let t = base;
    if (t < TIERS.length - 1 && Math.random() < mutationChance(source)) {
      let jump = 1;
      if (Math.random() < 0.10 * lvl('rainbow')) jump = 2;
      t = Math.min(TIERS.length - 1, t + jump);
      S.stats.mutations++;
      return { tier: t, mutated: true };
    }
    return { tier: t, mutated: false };
  }

  function addEgg(baseTier, source) {
    const { tier, mutated } = rollTier(baseTier, source);
    let n = 1;
    if (Math.random() < doubleChance()) n = 2;
    S.eggs[tier] += n;
    if (!S.everEgg[tier]) { S.everEgg[tier] = true; mark('vault'); }
    S.stats.eggsMade += n;
    emit('egg', { tier, n, mutated, source });
    return { tier, n, mutated };
  }

  /* bulk laying (offline / high speed) with expected-value randomness */
  function addEggsBulk(baseTier, count) {
    if (count <= 0) return 0;
    let made = 0;
    if (count <= 12) {
      for (let i = 0; i < count; i++) made += addEgg(baseTier, 'lay').n;
      return made;
    }
    const mut = mutationChance('lay');
    const dbl = doubleChance();
    let mutated = Math.round(count * mut);
    let normal = count - mutated;
    const jump2 = Math.round(mutated * 0.10 * lvl('rainbow'));
    const jump1 = mutated - jump2;
    const put = (t, c) => {
      if (c <= 0) return;
      const extra = Math.round(c * dbl);
      S.eggs[t] += c + extra;
      made += c + extra;
      if (!S.everEgg[t]) { S.everEgg[t] = true; mark('vault'); }
      S.stats.eggsMade += c + extra;
    };
    put(baseTier, normal);
    put(Math.min(TIERS.length - 1, baseTier + 1), jump1);
    put(Math.min(TIERS.length - 1, baseTier + 2), jump2);
    S.stats.mutations += mutated;
    return made;
  }

  /* ---------- actions ---------- */
  function pet(times) {
    times = times || 1;
    let eggsLaid = 0, coinsDropped = 0;
    for (let i = 0; i < times; i++) {
      S.stats.pets++;
      S.pets += clickPower();
      if (goldenChance() > 0 && Math.random() < goldenChance()) {
        const drop = Math.max(2, Math.round(sellValue(S.mamaTier) * 0.5));
        S.coins += drop;
        S.stats.coinsEarned += drop;
        coinsDropped += drop;
      }
      while (S.pets >= clicksNeeded()) {
        S.pets -= clicksNeeded();
        addEgg(S.mamaTier, 'click');
        eggsLaid++;
      }
    }
    if (coinsDropped) emit('coins', { amount: coinsDropped, golden: true });
    mark('mama');
    return { eggsLaid, coinsDropped };
  }

  function sellEggs(tier, count) {
    const n = Math.min(count, S.eggs[tier]);
    if (n <= 0) return 0;
    const gain = sellValue(tier) * n;
    S.eggs[tier] -= n;
    S.coins += gain;
    S.stats.sold += n;
    S.stats.coinsEarned += gain;
    emit('coins', { amount: gain, golden: false });
    return gain;
  }

  function buyEgg(tier) {
    const price = shopPrice(tier);
    if (S.coins < price) return false;
    S.coins -= price;
    S.eggs[tier] += 1;
    if (!S.everEgg[tier]) { S.everEgg[tier] = true; mark('vault'); }
    return true;
  }

  function placeEgg(tier) {
    if (S.eggs[tier] <= 0) return { ok:false, why:'no-egg' };
    syncNests();
    const i = S.nests.findIndex(n => n === null);
    if (i === -1) return { ok:false, why:'full' };
    S.eggs[tier] -= 1;
    const total = hatchTime(tier);
    S.nests[i] = { tier, total, left: total };
    mark('nests');
    return { ok:true, slot:i };
  }

  function pickSpecies(tier) {
    const pool = SPECIES_BY_TIER[tier];
    const unknown = pool.filter(sp => !S.disc.includes(sp.id));
    /* nudge toward new discoveries so the pedia fills up satisfyingly */
    if (unknown.length && Math.random() < 0.4) {
      return unknown[Math.floor(Math.random() * unknown.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function hatchChicken(tier) {
    let t = tier;
    if (t < TIERS.length - 1 && Math.random() < miracleChance()) t++;
    const sp = pickSpecies(t);
    const isNew = !S.disc.includes(sp.id);
    if (isNew) S.disc.push(sp.id);
    S.flock[sp.id] = (S.flock[sp.id] || 0) + 1;
    if (!(sp.id in S.layP)) S.layP[sp.id] = 0;
    const f = feathersFor(t, isNew);
    S.feathers += f;
    S.stats.hatched++;
    mark('flock', 'pedia', 'skills', 'coop');
    if (isNew) emit('discover', { sp });
    emit('hatch', { sp, feathers: f, isNew, miracle: t > tier });
    return { sp, feathers: f, isNew };
  }

  function collectNest(i) {
    const nest = S.nests[i];
    if (!nest || nest.left > 0) return { ok:false, why:'not-ready' };
    if (flockSize() >= coopCap()) return { ok:false, why:'coop-full' };
    S.nests[i] = null;
    const first = hatchChicken(nest.tier);
    let twin = null;
    if (Math.random() < twinChance() && flockSize() < coopCap()) {
      twin = hatchChicken(nest.tier);
    }
    mark('nests');
    return { ok:true, first, twin };
  }

  function buyNest() {
    if (!canBuyNest() || S.coins < nestBuyCost()) return false;
    S.coins -= nestBuyCost();
    S.nestsBought++;
    syncNests();
    mark('nests');
    return true;
  }

  function buyCoop() {
    if (!canBuyCoop() || S.coins < coopBuyCost()) return false;
    S.coins -= coopBuyCost();
    S.coopBought++;
    mark('coop');
    return true;
  }

  function upgradeMama() {
    if (S.mamaTier >= TIERS.length - 1) return false;
    const cost = mamaCost();
    if (S.coins < cost) return false;
    S.coins -= cost;
    S.mamaTier++;
    mark('mama');
    return true;
  }

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
    if (id === 'incubator') syncNests();
    mark('skills', 'nests', 'coop', 'vault', 'mama');
    return true;
  }

  function releaseChicken(spId) {
    if (!S.flock[spId]) return false;
    S.flock[spId]--;
    if (S.flock[spId] <= 0) { delete S.flock[spId]; delete S.layP[spId]; }
    const sp = SPECIES[spId];
    const refund = Math.max(1, Math.floor(ECON.feathers(sp.tier) / 2));
    S.feathers += refund;
    mark('flock', 'skills', 'coop');
    return refund;
  }

  /* ---------- ticking ---------- */
  function tick(dt) {
    /* auto pets */
    const rate = autoPetRate();
    if (rate > 0) {
      autoPetAcc += rate * dt;
      const whole = Math.floor(autoPetAcc);
      if (whole > 0) { autoPetAcc -= whole; pet(whole); }
    }
    /* nests */
    let nestChanged = false;
    S.nests.forEach(n => {
      if (n && n.left > 0) {
        n.left = Math.max(0, n.left - dt);
        if (n.left === 0) nestChanged = true;
      }
    });
    if (nestChanged) mark('nests');
    /* laying */
    for (const idStr of Object.keys(S.flock)) {
      const id = +idStr;
      const sp = SPECIES[id];
      const count = S.flock[id];
      if (!count) continue;
      const lt = layTime(sp.tier);
      S.layP[id] = (S.layP[id] || 0) + dt * count;
      const laid = Math.floor(S.layP[id] / lt);
      if (laid > 0) {
        S.layP[id] -= laid * lt;
        addEggsBulk(sp.tier, laid);
      }
    }
  }

  /* offline progress; returns a summary or null */
  function applyOffline() {
    const now = Date.now();
    let dt = (now - (S.last || now)) / 1000;
    S.last = now;
    if (dt < 30) { tick(Math.max(0, dt)); return null; }
    dt = Math.min(dt, ECON.offlineCapHrs * 3600);
    const eggsBefore = totalEggs();
    /* nests advance */
    S.nests.forEach(n => { if (n && n.left > 0) n.left = Math.max(0, n.left - dt); });
    /* laying advances */
    for (const idStr of Object.keys(S.flock)) {
      const id = +idStr;
      const sp = SPECIES[id];
      const lt = layTime(sp.tier);
      S.layP[id] = (S.layP[id] || 0) + dt * S.flock[id];
      const laid = Math.floor(S.layP[id] / lt);
      if (laid > 0) { S.layP[id] -= laid * lt; addEggsBulk(sp.tier, laid); }
    }
    mark('nests', 'vault');
    return { seconds: dt, eggs: totalEggs() - eggsBefore };
  }

  /* ---------- save / load ---------- */
  function save() {
    try {
      S.last = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(S));
      return true;
    } catch (e) { return false; }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.v !== 1) return false;
      S = Object.assign(freshState(), data);
      /* revive holes */
      S.eggs = TIERS.map((_, t) => S.eggs[t] || 0);
      S.everEgg = TIERS.map((_, t) => !!S.everEgg[t]);
      syncNests();
      return true;
    } catch (e) { return false; }
  }

  function reset() {
    S = freshState();
    autoPetAcc = 0;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    mark('nests','vault','flock','skills','pedia','mama','coop');
  }

  /* ---------- number formatting ---------- */
  const UNITS = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp'];
  function fmt(n) {
    n = Math.floor(n);
    if (n < 1000) return String(n);
    let u = 0;
    let v = n;
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

  return {
    get S(){ return S; },
    dirty, mark, on,
    clicksNeeded, clickPower, autoPetRate,
    sellValue, shopPrice, hatchTime, layTime, feathersFor,
    mutationChance, doubleChance, twinChance, miracleChance, goldenChance,
    nestCount, nestBuyCost, canBuyNest, coopCap, coopBuyCost, canBuyCoop,
    flockSize, totalEggs, mamaCost, discCount,
    pet, sellEggs, buyEgg, placeEgg, collectNest, buyNest, buyCoop,
    upgradeMama, buySkill, releaseChicken,
    tick, applyOffline, save, load, reset, syncNests,
    fmt, fmtTime, lvl,
  };
})();
