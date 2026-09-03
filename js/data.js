/* ============================================================
   INF EGG CO. — data: tiers, species, skills, economy
   ============================================================ */
'use strict';

const TIERS = [
  { n:'Common',    c:'#a09a8f' },
  { n:'Uncommon',  c:'#6ab04c' },
  { n:'Rare',      c:'#3fa7d6' },
  { n:'Epic',      c:'#b06ee0' },
  { n:'Legendary', c:'#ff9f1c' },
  { n:'Mythic',    c:'#ef476f' },
  { n:'Cosmic',    c:'#6457d6' },
  { n:'Divine',    c:'#f0b429' },
  { n:'Secret',    c:'#ff5fd0' },   /* breed-only: hatches from rainbow eggs */
];

/* pale egg shell colors per tier (spots use TIERS[t].c) */
const EGG_SHELL = ['#f8efe0','#dcf2c8','#cfe9fb','#ead4f8','#ffe4b8','#ffd3dc','#d3ccf8','#fff1c4','#fff0fa'];

/* how many species live in each tier — totals 112 */
const TIER_COUNTS = [18,16,14,13,12,10,9,8,12];

const ECON = {
  eggValue: t => 5 * Math.pow(5, t),
  layTime:  t => 22 * Math.pow(1.5, t),        // seconds between eggs per chicken
  incHatch: t => 10 * Math.pow(1.55, t),       // seconds inside an incubator
  feathers:  t => Math.pow(2, t),
  discoveryBonus: t => 5 * Math.pow(2, t),
  mamaCost:  t => Math.round(200 * Math.pow(14, t)),   // cost to go t -> t+1
  baseMutation: 0.02,
  goldenMult: 5,           // golden eggs sell for 5x
  baseChickenCap: 10,
  capPerPlot: 6,           // extra chicken capacity per owned plot
  groundEggCap: 400,
  basePetCd: 6,            // seconds between pets per chicken
  mamaPetCd: 1.2,          // mama loves attention
  baseBasketCap: 8,
  baseTruckCap: 10,
  baseTripTime: 7,         // seconds the truck is gone
  baseScoopR: 26,          // px magnet radius around the cursor
  baseVacR: 30,            // px vacuum suction radius
  vacInterval: 1.2,        // seconds per egg vacuumed
  vacHold: 12,             // eggs a vacuum can hold with no belt
  beltSpeed: 26,           // px per second
  scoopFeather: 0.05,      // base chance a scooped egg pops a feather
  feedCost: 3,             // coins per sprinkle
  feedBuff: 18,            // seconds of double lay speed per pellet
  breedTime: 25,           // base seconds per breeding
  breedCd: 6,              // nest cooldown after a breeding
  breedUpBase: 0.30,       // chance the bred egg is +1 tier
  rainbowBase: 0.18,       // chance two Divine parents make a rainbow egg
  offlineCapHrs: 8,
  staffSpeed: 26,          // px per second a worker walks
  staffCarry: 4,           // eggs a farmhand carries per trip
  staffBaseSlots: 2,       // slots before any Staff Hut
  hutSlots: 3,             // slots per Staff Hut
  cullReward: 2.5,         // feathers multiplier when a chicken is retired
  siloCap: 240,
  blowerR: 34,             // blower reach
  blowerPush: 46,          // px/sec push
  sorterRare: 2,           // tier >= this goes straight through a sorter
  diaryMax: 160,
  staffTireless: 90,       // seconds of work before a worker wants a breather
  staffRest: 14,           // seconds of breather at a hut
  techAuraR: 58,           // px a Technician's speed aura reaches
  loaderRate: 0.35,        // seconds per egg a Loader pushes into the truck
  hatcheryCap: 24,         // eggs a Grand Hatchery holds
};

/* buildable things — cost grows with how many you own (belts stay flat) */
const BUILDS = {
  incubator: { name:'Incubator', w:2, h:2, base:120, growth:1.6, refund:50,
               desc:'Drop eggs in - the only way they hatch.' },
  lovenest:  { name:'Love Nest', w:2, h:2, base:400, growth:1.8, refund:150,
               desc:'Drop two chickens in to breed a fancy egg.', needs:'court' },
  staffhut:  { name:'Staff Hut', w:2, h:2, base:500, growth:1.9, refund:200,
               desc:'Hire farmhands and robots here. +3 staff slots each.', needs:'hiring' },
  silo:      { name:'Egg Silo',  w:2, h:2, base:900, growth:1.8, refund:350,
               desc:'Stores eggs from belts and loads the truck by itself.', needs:'silo' },
  vacuum:    { name:'Vacuum Bot', w:1, h:1, base:300, growth:1.7, refund:100,
               desc:'Slurps nearby eggs onto the belt it faces.', needs:'vacuum' },
  blower:    { name:'Air Blower', w:1, h:1, base:260, growth:1.7, refund:90,
               desc:'Blows loose eggs across the grass in the way it faces.', needs:'blower' },
  sorter:    { name:'Sorter',    w:1, h:1, base:150, growth:1.6, refund:60,
               desc:'On a belt: rare eggs go straight, common ones turn aside.', needs:'sorter' },
  hatchery:  { name:'Grand Hatchery', w:3, h:3, base:6500, growth:1.9, refund:2600,
               desc:'A 24-egg incubator bank that hatches twice as fast.', needs:'hatchery' },
  splitter:  { name:'Splitter', w:1, h:1, base:180, growth:1.5, refund:70,
               desc:'On a belt: sends eggs left and right in turn to fill two lines.', needs:'splitter' },
  loader:    { name:'Truck Loader', w:2, h:1, base:1400, growth:1.8, refund:550,
               desc:'Parks by the road and shovels belt eggs straight into the truck.', needs:'loader' },
  belt:      { name:'Conveyor',  w:1, h:1, base:15, growth:1, refund:7,
               desc:'Carries eggs to the truck, a silo or an incubator.', needs:'belts' },
  fence:     { name:'Fence',     w:1, h:1, base:10, growth:1, refund:5,
               desc:'Chickens will not cross it. Pen them where you want them.', needs:'belts' },
};

/* ------------------------------------------------------------
   CREW - five stats, and roles that each lean on different ones.
   People answer flyers; robots get assembled at the hut.
   ------------------------------------------------------------ */
const STATS = {
  speed: { key:'speed', name:'SPEED', icon:'wind',   desc:'how fast they cross the field' },
  carry: { key:'carry', name:'CARRY', icon:'basket', desc:'eggs held per trip' },
  care:  { key:'care',  name:'CARE',  icon:'heart',  desc:'how well the flock takes to them' },
  tech:  { key:'tech',  name:'TECH',  icon:'gear',   desc:'machines near them run faster' },
  grit:  { key:'grit',  name:'GRIT',  icon:'flame',  desc:'how long before they need a breather' },
};
const STAT_KEYS = Object.keys(STATS);

const ROLES = {
  hand:   { id:'hand',   name:'Farmhand',   icon:'hand',   robot:false, uses:['speed','carry'],
            job:'Gathers loose eggs and runs them to a silo, hatchery or the truck.' },
  feeder: { id:'feeder', name:'Feeder',     icon:'seed',   robot:false, uses:['care','speed'], needs:'feed',
            job:'Scatters seed so the flock keeps laying at double speed.' },
  packer: { id:'packer', name:'Packer',     icon:'crate',  robot:false, uses:['carry','grit'], needs:'silo',
            job:'Shuttles eggs out of silos and packs the truck to the brim.' },
  tech:   { id:'tech',   name:'Technician', icon:'gear',   robot:false, uses:['tech','grit'], needs:'belts',
            job:'Walks the line; every machine near them runs faster.' },
  keeper: { id:'keeper', name:'Keeper',     icon:'hands',  robot:false, uses:['care','grit'], needs:'keeper',
            job:'Pets the flock all day, so hens lay on their own more often.' },
  cull:   { id:'cull',   name:'Cull-Bot',   icon:'remove', robot:true,  uses:['speed','grit'], needs:'cullbot',
            job:'Retires chickens you mark as unwanted, recycling them into feathers.' },
  match:  { id:'match',  name:'Match-Bot',  icon:'cupid',  robot:true,  uses:['speed','care'], needs:'matchbot',
            job:'Carries pairs of chickens into any empty love nest.' },
};
const ROLE_KEYS = Object.keys(ROLES);

/* procedural perks - an applicant rolls nought to two */
const TRAITS = [
  { id:'early',    name:'Early Bird',    good:true,  desc:'+2 SPEED',                  add:{ speed:2 } },
  { id:'strong',   name:'Strong Back',   good:true,  desc:'+2 CARRY',                  add:{ carry:2 } },
  { id:'gentle',   name:'Gentle Hands',  good:true,  desc:'+2 CARE',                   add:{ care:2 } },
  { id:'tinker',   name:'Tinkerer',      good:true,  desc:'+2 TECH',                   add:{ tech:2 } },
  { id:'ox',       name:'Built Like An Ox', good:true, desc:'+2 GRIT',                  add:{ grit:2 } },
  { id:'thrifty',  name:'Thrifty',       good:true,  desc:'works for 30% less',        wage:0.7 },
  { id:'tireless', name:'Tireless',      good:true,  desc:'never needs a breather',    noRest:true },
  { id:'lucky',    name:'Four-Leaf',     good:true,  desc:'+10% feathers from their work', luck:0.10 },
  { id:'keen',     name:'Quick Study',   good:true,  desc:'gains a stat point every 200 jobs', learn:true },
  { id:'haggler',  name:'Hard Bargain',  good:false, desc:'wants 60% more pay',        wage:1.6 },
  { id:'butter',   name:'Butterfingers', good:false, desc:'fumbles one egg in eight',  drop:0.12 },
  { id:'dozy',     name:'Dozy',          good:false, desc:'tires out twice as fast',   restMult:2 },
];
const TRAIT_BY_ID = Object.fromEntries(TRAITS.map(t => [t.id, t]));

/* name syllables - a first name is two or three of these, then a farm surname */
const NAME_A = ['Bram','Mar','Tes','Or','Nim','Sul','Wren','Hol','Fen','Pip','Cor','Del',
                'Gus','Hes','Jun','Kes','Lark','Mos','Nel','Ost','Per','Quil','Ros','Sen',
                'Tam','Ull','Ves','Wil','Yar','Zib','Ada','Bex','Cly','Dov','Elm','Fay'];
const NAME_B = ['a','o','ie','ette','en','is','ard','wyn','ric','ley','ora','us','ina','eth',
                'ick','ony','ell','iah','ka','na','ph','ta','va','well'];
const NAME_C = ['Hensworth','Yolkley','Cluckett','Barleycorn','Thistlewood','Meadows','Featherby',
                'Nestor','Coopwright','Peppercorn','Strawby','Grainger','Bramblewick','Hayloft',
                'Ryefield','Dovecote','Corncrake','Wattleby','Broodmoor','Shellman','Pullet',
                'Roostwood','Grubbins','Marrowfield','Applewhite','Chaffinch','Bantam','Downey'];

/* procedural looks */
const SKINS  = ['#f2c9a0','#e8b184','#d69a66','#b87a4a','#8f5a30','#6b4224','#f7dcc0','#c98f5f'];
const HAIRS  = ['#3a2a18','#5e3d18','#8a5e2a','#c9a35f','#e8d5a8','#a03f2f','#2e2216','#7a5230',
                '#d9d9c9','#4a5a6a','#6a4a7a','#2f4f4f'];
const SHIRTS = ['#7fc4e8','#8fd14f','#ffb84d','#ff8fa8','#c9a3f0','#e8e2d0','#5fa8d6','#f2a03f',
                '#a8d8b0','#e8607a','#6ab04c','#d0c0f0','#f0d060','#89a8c9'];
const PANTS  = ['#4a5a7a','#5e3d18','#3f5a3f','#6a5a4a','#7a4a4a','#4a4a5a','#8a6a3a','#3a3a4a'];
const BOOTS  = ['#5e3d18','#3a2a18','#6a4a2a','#4a3a2a','#2e2216'];
const HATS   = ['straw','cap','bandana','none','none','beanie','wide'];
const HAIR_STYLES = ['short','tuft','long','bun','curl','bald','mohawk','braid'];

const RECRUIT = {
  flyerBase: 220,          // coins for one flyer run
  flyerGrow: 1.22,         // each run costs a little more
  flyerTime: 42,           // seconds before the applicants turn up
  flyerYield: 2,           // applicants per run
  poolMax: 8,              // applicants that will wait around at once
  applicantLife: 480,      // seconds before an applicant gives up
  signBase: 90,            // signing bonus per point of quality
  wageBase: 0.22,          // coins per second per point of quality
  botBase: 1200,           // robots are assembled, not recruited
  botGrow: 1.55,
  statMin: 1, statMax: 10,
};

/* a rolled applicant's headline number, 5 to 50 */
function crewQuality(st) { return STAT_KEYS.reduce((a, k) => a + (st[k] || 0), 0); }
function crewWage(st, traits) {
  let w = RECRUIT.wageBase * crewQuality(st) / 5;
  (traits || []).forEach(id => { const t = TRAIT_BY_ID[id]; if (t && t.wage) w *= t.wage; });
  return Math.max(0.08, w);
}
function crewSignCost(st, traits) {
  return Math.round(RECRUIT.signBase * crewQuality(st) / 5 * (1 + (traits || []).length * 0.15));
}
function flyerCost(runs) { return Math.round(RECRUIT.flyerBase * Math.pow(RECRUIT.flyerGrow, runs || 0)); }
function botCost(owned) { return Math.round(RECRUIT.botBase * Math.pow(RECRUIT.botGrow, owned || 0)); }

function buildCost(type, owned) {
  const b = BUILDS[type];
  return Math.round(b.base * Math.pow(b.growth, b.growth === 1 ? 0 : owned));
}

/* ------------------------------------------------------------
   LAND - 4x3 plots of 16x13 tiles = 64x39 tiles = 1024x624 px.
   You start on the bottom-left plot; buy neighbours from their
   FOR SALE signs. Row 2 is the road row.
   ------------------------------------------------------------ */
const PLOT_W = 16, PLOT_H = 13, PLOT_COLS = 4, PLOT_ROWS = 3;
const PLOTS = [
  { id:0,  tc:0,  tr:0,  price:9e7,   theme:'pinewood' },
  { id:1,  tc:16, tr:0,  price:5e9,   theme:'wetland'  },
  { id:2,  tc:32, tr:0,  price:4e10,  theme:'thicket'  },
  { id:3,  tc:48, tr:0,  price:3e11,  theme:'shroom'   },
  { id:4,  tc:0,  tr:13, price:3000,  theme:'berry'    },
  { id:5,  tc:16, tr:13, price:25000, theme:'orchard'  },
  { id:6,  tc:32, tr:13, price:1.5e6, theme:'lavender' },
  { id:7,  tc:48, tr:13, price:7e8,   theme:'rocky'    },
  { id:8,  tc:0,  tr:26, price:0,     theme:'home'     },   /* start */
  { id:9,  tc:16, tr:26, price:400,   theme:'sunflower'},
  { id:10, tc:32, tr:26, price:200000,theme:'meadow'   },
  { id:11, tc:48, tr:26, price:1.2e7, theme:'prairie'  },
];
const PLOT_START = 8;
function plotNeighbors(id) {
  const c = id % PLOT_COLS, r = Math.floor(id / PLOT_COLS), out = [];
  if (c > 0) out.push(id - 1);
  if (c < PLOT_COLS - 1) out.push(id + 1);
  if (r > 0) out.push(id - PLOT_COLS);
  if (r < PLOT_ROWS - 1) out.push(id + PLOT_COLS);
  return out;
}

/* ------------------------------------------------------------
   SPECIES — exactly 100. Tier assigned by position (TIER_COUNTS).
   [name, shape, body, accent, pattern, accessory, eyes, quip]
   shape: chick | hen | fluff | tall
   pattern: solid | spots | stripes | star
   eyes: round | happy | sleepy
   ------------------------------------------------------------ */
const SPECIES_RAW = [
  /* ---- COMMON (18) ---- */
  ['Peep',        'chick','#ffe08a','#f2b64c','solid',  'none',   'round', 'Fresh out of the shell.'],
  ['Nugget',      'chick','#f7d354','#e89b3c','solid',  'none',   'happy', 'Certified bite-sized.'],
  ['Butterball',  'fluff','#ffd97d','#f2b64c','solid',  'none',   'round', 'Perfectly spherical. Do not roll.'],
  ['Popcorn',     'fluff','#fff3d6','#f2c94c','spots',  'none',   'happy', 'Pops when startled.'],
  ['Biscuit',     'chick','#e8c48f','#c99a5b','solid',  'none',   'round', 'Warm. Flaky. Loyal.'],
  ['Mochi',       'chick','#ffe3ec','#f7a8c4','solid',  'none',   'happy', 'Squishy and proud of it.'],
  ['Dumpling',    'tall', '#f5e6d3','#d9b98c','solid',  'none',   'sleepy','Steamed, not stirred.'],
  ['Pebble',      'chick','#cfcfc4','#a5a596','solid',  'none',   'sleepy','Sits very, very still.'],
  ['Waffles',     'hen',  '#e9b869','#c98f3f','stripes','none',   'round', 'Syrup enthusiast.'],
  ['Sunny',       'chick','#ffdd55','#ff9f1c','solid',  'none',   'happy', 'Believes in you!!'],
  ['Clucky',      'hen',  '#f2f2e9','#d9d9c9','solid',  'none',   'round', 'Your everyday egg machine.'],
  ['Doodle',      'chick','#f4e04d','#4ea8de','spots',  'none',   'happy', 'Draws with her feet.'],
  ['Pip',         'chick','#cdeac0','#94c973','solid',  'none',   'round', 'Smallest. Also loudest.'],
  ['Marshmallow', 'fluff','#fffdf7','#ffd9e8','solid',  'none',   'sleepy','Toasted? Never.'],
  ['Toast',       'tall', '#d9a066','#b3773f','stripes','none',   'round', 'Slightly crunchy.'],
  ['Bubbles',     'chick','#cdeffd','#8fd6f9','spots',  'none',   'happy', 'Blows beak bubbles.'],
  ['Freckle',     'hen',  '#f6e0b5','#c98f3f','spots',  'none',   'round', 'Counting her spots. 43 so far.'],
  ['Pudding',     'chick','#e6c79c','#a86f32','solid',  'none',   'sleepy','Wobbles gently.'],

  /* ---- UNCOMMON (16) ---- */
  ['Minty',       'chick','#b8f2d0','#5fd39a','solid',  'none',   'happy', 'Breath always fresh.'],
  ['Bluebell',    'hen',  '#a8c8f0','#5f8ad3','solid',  'none',   'round', 'Rings softly at dawn.'],
  ['Lavender',    'fluff','#d5c1f0','#a58ae0','solid',  'flower', 'sleepy','Smells like naptime.'],
  ['Pistachio',   'chick','#cbe6a3','#8fbf5f','spots',  'none',   'happy', 'Half open. Fully cute.'],
  ['Berry',       'chick','#e6a8d0','#c45f9e','spots',  'none',   'round', 'Legally a fruit?'],
  ['Sprout',      'chick','#d7f0b8','#7ac74f','solid',  'sprout', 'happy', 'Photosynthesizes compliments.'],
  ['Coco',        'hen',  '#8a5a3b','#5e3a24','solid',  'none',   'round', '70% cocoa. 30% cluck.'],
  ['Cinnamon',    'tall', '#d38f5f','#a8663a','stripes','none',   'round', 'A little swirly.'],
  ['Stormy',      'fluff','#9fb3c8','#6a86a3','solid',  'none',   'sleepy','Small chance of drizzle.'],
  ['Rusty',       'hen',  '#d3765f','#a34a35','solid',  'none',   'round', 'Squeaks when she walks.'],
  ['Olive',       'chick','#b5b86a','#8a8d43','solid',  'none',   'sleepy','Extra virgin.'],
  ['Plum',        'chick','#9f6bb5','#7a4a91','solid',  'none',   'round', 'Plum-p and happy.'],
  ['Honeydew',    'tall', '#e0f2b8','#aad35f','solid',  'none',   'happy', 'Do. Not. Eat.'],
  ['Slate',       'hen',  '#8a9bab','#5f7285','stripes','none',   'round', 'Very put together.'],
  ['Ginger Snap', 'chick','#e0975f','#b56a35','spots',  'none',   'happy', 'Snaps back. Politely.'],
  ['Sherbet',     'fluff','#ffd1a8','#ff9f7d','stripes','none',   'happy', 'Three flavors in one.'],

  /* ---- RARE (14) ---- */
  ['Disco Hen',   'hen',  '#e85fd0','#5fd0e8','stripes','glasses','happy', 'Born in a groove.'],
  ['Bumblebee',   'chick','#ffd23f','#3a3a3a','stripes','antenna','happy', 'Buzzworthy.'],
  ['Sakura',      'fluff','#ffd7e8','#ff8ab5','spots',  'flower', 'happy', 'Petal soft. Blooms in spring.'],
  ['Frostbite',   'chick','#cfeef5','#7fd3e8','solid',  'none',   'sleepy','Cool under pressure.'],
  ['Ember',       'chick','#ff9950','#e8542f','spots',  'none',   'round', 'Faint campfire smell.'],
  ['Galaxy Chick','chick','#4a4e8f','#8f7fe8','star',   'none',   'round', 'Contains at least 3 stars.'],
  ['Neon',        'tall', '#ccff33','#33ffcc','stripes','none',   'happy', 'Visible from space.'],
  ['Peacocka',    'hen',  '#3fa7d6','#8fd14f','spots',  'tiara',  'round', 'Fancy. Knows it.'],
  ['Tuxedo',      'hen',  '#3a3a3a','#f2f2f2','star',   'tophat', 'round', 'Formal at all times.'],
  ['Pirate Peck', 'hen',  '#a8663a','#5e3a24','solid',  'eyepatch','round','Yarr. Buried egg treasure.'],
  ['Wizard Wing', 'chick','#7a5fd0','#ffd23f','star',   'wizard', 'round', 'Knows three egg spells.'],
  ['Ninja Nug',   'chick','#4a4a5e','#e85f5f','solid',  'ninja',  'round', 'You never see her lay.'],
  ['Cowpoke',     'hen',  '#d9a066','#8a5a3b','spots',  'cowboy', 'happy', 'Yeehaw, partner.'],
  ['Mermaid Hen', 'tall', '#7fe8d0','#5f8ad3','stripes','none',   'happy', 'Allegedly can swim.'],

  /* ---- EPIC (13) ---- */
  ['Dracopeck',   'hen',  '#6bd35f','#3a9e4a','spots',  'horns',  'round', '1/16th dragon. Big deal.'],
  ['Crystal Comb','hen',  '#b8e8f5','#8fb5e8','star',   'none',   'round', 'Sparkles audibly.'],
  ['Voltage',     'chick','#ffe23f','#3fd0ff','stripes','antenna','happy', 'Do not touch. Zap.'],
  ['Magma Hen',   'hen',  '#e8542f','#ffb03f','spots',  'none',   'round', 'Lays them sunny-side up.'],
  ['Glacier',     'fluff','#d0f0ff','#8fc8e8','solid',  'none',   'sleepy','Moves 1cm per year.'],
  ['Jungle Queen','hen',  '#3a9e4a','#ffd23f','spots',  'flower', 'round', 'Rules the ferns.'],
  ['Clockwork',   'tall', '#c9a35f','#8a7a5e','spots',  'glasses','round', 'Tick tock cluck.'],
  ['Phantom',     'fluff','#e8e8f5','#b5b5d9','solid',  'none',   'sleepy','Boo. Just kidding.'],
  ['Sunflare',    'chick','#ffb03f','#ff5f3f','star',   'none',   'happy', 'Warm hugs only.'],
  ['Moonfeather', 'fluff','#d9d9f0','#8f8fd9','star',   'none',   'sleepy','Naps all day. Valid.'],
  ['Ore-o',       'chick','#3a3a3a','#f5f5f5','stripes','none',   'happy', 'Dunk resistant.'],
  ['Bonbon Blitz','chick','#ff8ab5','#7fe8d0','spots',  'bow',    'happy', '97% sugar by volume.'],
  ['Star Scout',  'chick','#5f8ad3','#ffd23f','star',   'antenna','happy', 'First hen on the moon.'],

  /* ---- LEGENDARY (12) ---- */
  ['Phoenix Hen', 'hen',  '#ff6b35','#ffd23f','stripes','none',   'round', 'Re-hatches herself. Rude.'],
  ['Thunderbird', 'hen',  '#4a5e8f','#ffe23f','star',   'none',   'round', 'Comes with a storm cloud.'],
  ['Aurora',      'fluff','#a8f0d0','#c9a8f0','stripes','none',   'happy', 'Glows on a schedule.'],
  ['Seraphina',   'fluff','#fff5d9','#ffd23f','solid',  'halo',   'happy', 'Suspiciously angelic.'],
  ['Midas Hen',   'hen',  '#ffd23f','#e8a52f','solid',  'crown',  'round', 'Everything she touches... yolk.'],
  ['Onyx King',   'hen',  '#2a2a35','#ffd23f','solid',  'crown',  'round', 'Broods. Dramatically.'],
  ['Prism Peck',  'chick','#f5f5f5','#ff8ab5','stripes','none',   'happy', 'Refracts compliments.'],
  ['Tempest',     'hen',  '#6a86a3','#cfeef5','spots',  'none',   'round', 'The winds of cluck.'],
  ['Solstice',    'tall', '#ffb03f','#7a5fd0','star',   'none',   'round', 'Half summer. Half winter.'],
  ['Wildfire',    'chick','#e8542f','#ff9950','stripes','none',   'happy', 'Spreads enthusiasm fast.'],
  ['Frostcrown',  'hen',  '#cfeef5','#8fb5e8','star',   'tiara',  'sleepy','Her Majesty of March.'],
  ['Eclipse',     'fluff','#3a3a4a','#ffb03f','star',   'none',   'sleepy','Blocks the sun. Briefly.'],

  /* ---- MYTHIC (10) ---- */
  ['Cluckthulhu', 'fluff','#5e3a6e','#7fe8d0','spots',  'horns',  'round', "Ph'nglui mglw'nafh cluck."],
  ['Yolkozuna',   'fluff','#f5e6d3','#e8542f','solid',  'ninja',  'round', 'Undefeated. 400 eggs.'],
  ['Hydra Hen',   'hen',  '#3a9e4a','#8fd14f','spots',  'horns',  'round', 'Pluck one feather, two grow.'],
  ['Basilisk Beak','tall','#8fbf5f','#3a5e2a','stripes','none',   'sleepy','Do not make eye contact.'],
  ['Chimera Chick','chick','#d38f5f','#7a5fd0','spots', 'horns',  'happy', 'Some assembly required.'],
  ['Sphinx Feather','tall','#e8c48f','#3fa7d6','stripes','tiara', 'round', 'Speaks only in riddles.'],
  ['Valkyrie',    'hen',  '#cfd9e8','#ffd23f','solid',  'horns',  'round', 'Chooses the bravest eggs.'],
  ['Djinn Wing',  'fluff','#5f8ad3','#ffb03f','star',   'none',   'happy', 'Three wishes per egg.'],
  ['Kitsune Hen', 'hen',  '#ff9950','#fff5d9','solid',  'none',   'happy', 'Nine tail feathers.'],
  ['World Egg',   'chick','#8fd14f','#3fa7d6','spots',  'none',   'round', 'Contains one small planet.'],

  /* ---- COSMIC (9) ---- */
  ['Nebula Nug',  'chick','#7a5fd0','#ff8ab5','star',   'none',   'happy', 'Mostly stardust.'],
  ['Supernova',   'fluff','#ffd23f','#ff5f3f','star',   'none',   'happy', 'Goes out with a bang.'],
  ['Black Hole Hen','hen','#1a1a24','#7a5fd0','star',   'none',   'round', 'Eggs check in...'],
  ['Andromeda',   'tall', '#5f8ad3','#c9a8f0','star',   'none',   'round', '2.5M lightyears from coop.'],
  ['Stardust',    'chick','#d9d9f0','#ffd23f','star',   'none',   'sleepy','Sneezes glitter.'],
  ['Comet Crest', 'chick','#cfeef5','#5f8ad3','star',   'antenna','happy', 'Visits every 76 years.'],
  ['Quasar Quill','hen',  '#e85fd0','#3fd0ff','stripes','none',   'round', 'Loudest hen in the universe.'],
  ['Void Peep',   'chick','#24242e','#8f8fd9','star',   'none',   'sleepy','Stares back. Cutely.'],
  ['Galaxy Guardian','hen','#4a4e8f','#ffd23f','star',  'crown',  'round', 'Protects the yolky way.'],

  /* ---- DIVINE (8) ---- */
  ['The Eternal Yolk','fluff','#fff5d9','#ffd23f','star','halo',  'sleepy','Was. Is. Will be. Egg.'],
  ['Omelette Prime','hen','#ffe08a','#e8542f','solid',  'crown',  'round', 'The final breakfast form.'],
  ['Archangel Cluck','fluff','#f5f5ff','#ffd23f','solid','halo',  'happy', 'Leads the heavenly coop choir.'],
  ['Dawn Goddess','hen',  '#ffd7e8','#ffb03f','star',   'tiara',  'happy', 'Sunrise is her yawn.'],
  ['Infinity Hen','hen',  '#8fd14f','#e85fd0','stripes','none',   'happy', 'Lays in a loop. Forever.'],
  ['The First Egg','chick','#f5e6d3','#c99a5b','solid', 'none',   'sleepy','Answered the old question.'],
  ['Yolk of Creation','fluff','#ffd23f','#f5f5ff','star','halo',  'round', 'Big Bang? Big Cluck.'],
  ['Chicken Zero','hen',  '#f2f2e9','#3a3a3a','solid',  'glasses','round', 'The original experiment.'],

  /* ---- SECRET (12) — hatch only from rainbow eggs (breeding) ---- */
  ['Eggdrasil',   'tall', '#8fd14f','#ff8ab5','star',   'sprout', 'round', 'The world tree laid roots. And eggs.'],
  ['Prisma',      'fluff','#f5f5ff','#ff5fd0','stripes','tiara',  'happy', 'Every color at once, politely.'],
  ['The Omelegend','hen', '#ffd23f','#ff5fd0','star',   'crown',  'round', 'Whispered about in every coop.'],
  ['Cluckarina',  'fluff','#ffd7e8','#5fd0e8','solid',  'bow',    'happy', 'Dances on eggshells. Gracefully.'],
  ['Doodle Deluxe','chick','#f4e04d','#ff5fd0','spots', 'glasses','happy', 'Limited edition. Very loud.'],
  ['Hologram Hen','hen',  '#cfeef5','#ff5fd0','stripes','antenna','round', 'Might not be entirely there.'],
  ['Jellybean',   'chick','#b8f2d0','#ff8ab5','spots',  'none',   'happy', 'Assorted flavors. All cute.'],
  ['Borealis',    'fluff','#a8f0d0','#c9a8f0','stripes','none',   'sleepy','Northern lights, southern naps.'],
  ['Marshmelody', 'fluff','#fffdf7','#ffd23f','solid',  'halo',   'happy', 'Sings in toasted harmony.'],
  ['Circuit Chick','chick','#3a3a4a','#33ffcc','stripes','antenna','round','01001100 01001111 01010110 01000101.'],
  ['Grand Cluck', 'hen',  '#7a5fd0','#ffd23f','star',   'wizard', 'round', 'Wrote the book on clucking. Twice.'],
  ['Infinity Yolk','chick','#fff5d9','#ff5fd0','star',  'halo',   'sleepy','Contains this game. Somehow.'],
];

/* build SPECIES with tier + id resolved */
const SPECIES = (() => {
  const out = []; let idx = 0;
  TIER_COUNTS.forEach((count, tier) => {
    for (let i = 0; i < count; i++) {
      const r = SPECIES_RAW[idx];
      out.push({
        id: idx, tier,
        name: r[0], shape: r[1], body: r[2], accent: r[3],
        pattern: r[4], acc: r[5], eyes: r[6], quip: r[7],
      });
      idx++;
    }
  });
  if (out.length !== 112) throw new Error('species count ' + out.length);
  return out;
})();
const SPECIES_TOTAL = SPECIES.length;

const SPECIES_BY_TIER = TIERS.map((_, t) => SPECIES.filter(s => s.tier === t));

/* ------------------------------------------------------------
   RESEARCH - the Lab runs EGGOS, a little terminal. Packages sit
   in modules; a package only lists once its prerequisite is
   installed, so the screen shows exactly what you can do now.
   Cost in feathers: base * growth^level.
   ------------------------------------------------------------ */
const MODULES = [
  { name:'CREW',    code:'crew.sys', icon:'hands',  hue:'#9b6bd0' },
  { name:'GATHER',  code:'gather.sys',icon:'basket',hue:'#6ab04c' },
  { name:'HENS',    code:'hens.sys', icon:'chick',  hue:'#e8542f' },
  { name:'HATCH',   code:'hatch.sys',icon:'egg',    hue:'#f0a422' },
  { name:'LOVE',    code:'love.sys', icon:'heart',  hue:'#ff5f9e' },
  { name:'FACTORY', code:'fact.sys', icon:'gear',   hue:'#3fa7d6' },
  { name:'MARKET',  code:'mrkt.sys', icon:'truck',  hue:'#b8862f' },
];

const SKILLS = [
  { id:'root', br:3, d:0, pre:null, name:'Egg Science', icon:'egg', max:1, base:0, growth:1, desc:'The kernel. It all starts with one egg.' },

  /* ---- CREW: flyers, wages, robots, roles ---- */
  { id:'hiring',    br:0, d:1, pre:'root',      name:'Recruiting',    icon:'doc',    max:1, base:40,   growth:1,   desc:'Unlock the Staff Hut, flyers and hiring' },
  { id:'posters',   br:0, d:2, pre:'hiring',    name:'Bigger Posters',icon:'doc',    max:5, base:30,   growth:2.1, desc:'+1 applicant per flyer run' },
  { id:'wages',     br:0, d:2, pre:'hiring',    name:'Payroll Deals', icon:'coin',   max:6, base:30,   growth:2.3, desc:'-12% crew wages' },
  { id:'crewspeed', br:0, d:2, pre:'hiring',    name:'Sturdy Boots',  icon:'wind',   max:5, base:25,   growth:2.2, desc:'+15% crew walking speed' },
  { id:'agency',    br:0, d:3, pre:'posters',   name:'Hiring Agency', icon:'chart',  max:5, base:90,   growth:2.4, desc:'+1 to every stat an applicant rolls' },
  { id:'overtime',  br:0, d:3, pre:'wages',     name:'Overtime Pay',  icon:'flame',  max:5, base:70,   growth:2.3, desc:'+25% stamina before a breather' },
  { id:'cullbot',   br:0, d:3, pre:'crewspeed', name:'Cull-Bot',      icon:'remove', max:1, base:160,  growth:1,   desc:'Assemble Cull-Bots: they retire chickens you mark' },
  { id:'keeper',    br:0, d:4, pre:'agency',    name:'Keeper Role',   icon:'hands',  max:1, base:220,  growth:1,   desc:'Hire Keepers: they pet the flock all day long' },
  { id:'matchbot',  br:0, d:4, pre:'cullbot',   name:'Match-Bot',     icon:'cupid',  max:1, base:260,  growth:1,   desc:'Assemble Match-Bots: they fill love nests for you' },
  { id:'crewcap',   br:0, d:4, pre:'overtime',  name:'Bunkhouse',     icon:'house',  max:6, base:140,  growth:2.4, desc:'+2 crew slots' },
  { id:'foreman',   br:0, d:5, pre:'keeper',    name:'Foreman',       icon:'crown',  max:5, base:400,  growth:2.6, desc:'+35% reach on a Technician aura' },
  { id:'union',     br:0, d:6, pre:'foreman',   name:'Egg Union',     icon:'star',   max:1, base:3200, growth:1,   desc:'The whole crew works 50% faster' },

  /* ---- GATHER ---- */
  { id:'basket1',  br:1, d:1, pre:'root',      name:'Bigger Basket', icon:'basket', max:6, base:4,   growth:2.0, desc:'+8 basket capacity' },
  { id:'magnet',   br:1, d:2, pre:'basket1',   name:'Magnet Palm',   icon:'magnet', max:6, base:8,   growth:2.1, desc:'+12px scoop radius' },
  { id:'feather1', br:1, d:2, pre:'basket1',   name:'Feather Finder',icon:'feather',max:6, base:10,  growth:2.2, desc:'+3% feathers when scooping eggs' },
  { id:'feed',     br:1, d:3, pre:'magnet',    name:'Bird Feed',     icon:'seed',   max:1, base:25,  growth:1,   desc:'Unlock the Feed tool and the Feeder role' },
  { id:'sweepluck',br:1, d:3, pre:'feather1',  name:'Lucky Sweep',   icon:'clover', max:5, base:30,  growth:2.4, desc:'+2% scooped eggs duplicate' },
  { id:'feedplus', br:1, d:4, pre:'feed',      name:'Tasty Mix',     icon:'bowl',   max:4, base:45,  growth:2.5, desc:'feed lasts +50% longer' },
  { id:'basket2',  br:1, d:4, pre:'sweepluck', name:'Deep Basket',   icon:'basket2',max:4, base:60,  growth:2.6, desc:'+16 basket capacity' },
  { id:'plumage',  br:1, d:5, pre:'basket2',   name:'Plume Press',   icon:'feather',max:5, base:180, growth:2.5, desc:'+25% value from every feather picked up' },

  /* ---- HENS ---- */
  { id:'happy',   br:2, d:1, pre:'root',   name:'Happy Hens',    icon:'heart',  max:12, base:4,   growth:1.9, desc:'+10% lay speed' },
  { id:'flock',   br:2, d:2, pre:'happy',  name:'Bigger Flock',  icon:'house',  max:10, base:10,  growth:2.1, desc:'+4 chicken capacity' },
  { id:'pets',    br:2, d:2, pre:'happy',  name:'Pet Therapy',   icon:'hands',  max:6,  base:6,   growth:2.2, desc:'-15% pet cooldown' },
  { id:'golden',  br:2, d:3, pre:'flock',  name:'Golden Peck',   icon:'sparkle',max:6,  base:25,  growth:2.5, desc:'+3% golden eggs (worth 5x)' },
  { id:'mutate',  br:2, d:3, pre:'pets',   name:'Mutation Vats', icon:'dna',    max:8,  base:30,  growth:2.3, desc:'+1.5% egg mutation chance' },
  { id:'coops',   br:2, d:4, pre:'flock',  name:'Tower Coops',   icon:'silo',   max:6,  base:120, growth:2.6, desc:'+10 chicken capacity' },
  { id:'rainbow', br:2, d:4, pre:'mutate', name:'Rainbow Genome',icon:'rainbow',max:3,  base:300, growth:5.0, desc:'+15% for mutations to jump 2 tiers' },

  /* ---- HATCH ---- */
  { id:'warm',    br:3, d:1, pre:'root',   name:'Warm Coils',    icon:'flame',  max:12, base:4,   growth:1.9, desc:'+15% incubator speed' },
  { id:'inccap',  br:3, d:2, pre:'warm',   name:'Roomy Racks',   icon:'rack',   max:6,  base:20,  growth:2.4, desc:'+3 incubator queue' },
  { id:'twins',   br:3, d:2, pre:'warm',   name:'Twin Yolks',    icon:'twins',  max:6,  base:30,  growth:2.4, desc:'+4% twin hatch chance' },
  { id:'whisper', br:3, d:3, pre:'inccap', name:'Egg Whisperer', icon:'feather',max:6,  base:25,  growth:2.3, desc:'+20% feathers from hatching' },
  { id:'miracle', br:3, d:3, pre:'twins',  name:'Miracle Hatch', icon:'star',   max:4,  base:120, growth:4.0, desc:'+5% hatchling is +1 tier' },
  { id:'quantum', br:3, d:4, pre:'whisper',name:'Quantum Coils', icon:'atom',   max:6,  base:220, growth:2.6, desc:'+30% incubator speed' },
  { id:'hatchery',br:3, d:5, pre:'quantum',name:'Grand Hatchery',icon:'rack',   max:1,  base:900, growth:1,   desc:'Unlock the Grand Hatchery: 24 eggs, double speed' },

  /* ---- LOVE ---- */
  { id:'court',     br:4, d:1, pre:'root',       name:'Courtship',      icon:'cupid',     max:1, base:15,  growth:1,   desc:'Unlock the LOVE NEST (breed chickens!)' },
  { id:'candle',    br:4, d:2, pre:'court',      name:'Candlelight',    icon:'candle',    max:6, base:20,  growth:2.3, desc:'+20% breeding speed' },
  { id:'genes',     br:4, d:2, pre:'court',      name:'Fine Genes',     icon:'flask',     max:6, base:35,  growth:2.5, desc:'+6% bred egg tier-up chance' },
  { id:'twindate',  br:4, d:3, pre:'candle',     name:'Double Date',    icon:'hearts',    max:4, base:90,  growth:3.0, desc:'+10% breeding lays 2 eggs' },
  { id:'rainbowegg',br:4, d:3, pre:'genes',      name:'Rainbow Clutch', icon:'rainbowegg',max:4, base:250, growth:4.0, desc:'+8% rainbow egg from Divine pairs' },
  { id:'secretlore',br:4, d:4, pre:'rainbowegg', name:'Secret Lore',    icon:'scroll',    max:1, base:1200,growth:1,   desc:'Rainbow eggs hatch 3x faster' },

  /* ---- FACTORY ---- */
  { id:'belts',    br:5, d:1, pre:'root',      name:'Conveyor Tech', icon:'crate',  max:1, base:30,  growth:1,   desc:'Unlock conveyors, fences and the Technician role' },
  { id:'beltspeed',br:5, d:2, pre:'belts',     name:'Belt Grease',   icon:'oil',    max:6, base:20,  growth:2.2, desc:'+20% belt speed' },
  { id:'vacuum',   br:5, d:2, pre:'belts',     name:'Vacuum Bots',   icon:'robot',  max:1, base:80,  growth:1,   desc:'Unlock egg vacuums' },
  { id:'sorter',   br:5, d:3, pre:'beltspeed', name:'Egg Sorter',    icon:'sorter', max:1, base:140, growth:1,   desc:'Unlock the Sorter: splits belts by rarity' },
  { id:'vacradius',br:5, d:3, pre:'vacuum',    name:'Wide Suction',  icon:'spiral', max:6, base:40,  growth:2.2, desc:'+8px vacuum radius' },
  { id:'splitter', br:5, d:4, pre:'sorter',    name:'Belt Splitter', icon:'sorter', max:1, base:220, growth:1,   desc:'Unlock the Splitter: feeds two lines in turn' },
  { id:'blower',   br:5, d:4, pre:'sorter',    name:'Air Blower',    icon:'blower', max:1, base:260, growth:1,   desc:'Unlock the Blower: herds loose eggs along' },
  { id:'vacspeed', br:5, d:4, pre:'vacradius', name:'Turbo Pumps',   icon:'wind',   max:6, base:40,  growth:2.2, desc:'+25% vacuum speed' },
  { id:'loader',   br:5, d:5, pre:'splitter',  name:'Truck Loader',  icon:'crate',  max:1, base:700, growth:1,   desc:'Unlock the Loader: belts feed the truck directly' },
  { id:'overclock',br:5, d:6, pre:'loader',    name:'Overclock',     icon:'bolt',   max:1, base:1500,growth:1,   desc:'ALL machines run 2x faster' },

  /* ---- MARKET ---- */
  { id:'value',    br:6, d:1, pre:'root',      name:'Egg Polish',       icon:'egg',   max:12, base:5,   growth:1.9, desc:'+15% egg sell value' },
  { id:'truckcap', br:6, d:2, pre:'value',     name:'Bigger Bed',       icon:'truck', max:8,  base:15,  growth:2.2, desc:'+5 truck capacity' },
  { id:'route',    br:6, d:2, pre:'value',     name:'Express Route',    icon:'road',  max:6,  base:25,  growth:2.3, desc:'truck trips 15% faster' },
  { id:'silo',     br:6, d:3, pre:'truckcap',  name:'Egg Silo',         icon:'silo',  max:1,  base:180, growth:1,   desc:'Unlock the Silo and the Packer role' },
  { id:'fullbonus',br:6, d:3, pre:'route',     name:'Full Load Deal',   icon:'chart', max:6,  base:30,  growth:2.3, desc:'+6% payout for a full truck' },
  { id:'autosend', br:6, d:4, pre:'silo',      name:'Auto-Dispatch',    icon:'key',   max:1,  base:250, growth:1,   desc:'truck departs by itself when full' },
  { id:'contracts',br:6, d:4, pre:'fullbonus', name:'Premium Contracts',icon:'doc',   max:4,  base:400, growth:5.0, desc:'+1% value per species discovered' },
  { id:'fleet',    br:6, d:5, pre:'autosend',  name:'Second Lorry',     icon:'truck', max:3,  base:1400,growth:3.0, desc:'-25% truck round trip' },
  { id:'tycoon',   br:6, d:6, pre:'fleet',     name:'Egg Empire',       icon:'crown', max:1,  base:5000,growth:1,   desc:'ALL coin gains x2' },
];

const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));
function skillCost(sk, lvl) { return Math.ceil(sk.base * Math.pow(sk.growth, lvl)); }
function skillPrereq(sk) { return sk.pre ? SKILL_BY_ID[sk.pre] : null; }
/* modules keep their packages in dependency order */
const SKILLS_BY_MODULE = MODULES.map((_, i) =>
  SKILLS.filter(sk => sk.br === i && sk.id !== 'root').sort((a, b) => a.d - b.d || a.name.localeCompare(b.name)));
