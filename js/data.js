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
};

/* buildable things — cost grows with how many you own (belts stay flat) */
const BUILDS = {
  incubator: { name:'Incubator', w:2, h:2, base:120, growth:1.6, refund:50,
               desc:'Drop eggs in — the only way they hatch!' },
  lovenest:  { name:'Love Nest', w:2, h:2, base:400, growth:1.8, refund:150,
               desc:'Drop two chickens in to breed a fancy egg.', needs:'court' },
  vacuum:    { name:'Vacuum Bot', w:1, h:1, base:300, growth:1.7, refund:100,
               desc:'Slurps nearby eggs onto the belt it faces.', needs:'vacuum' },
  belt:      { name:'Conveyor', w:1, h:1, base:15, growth:1, refund:7,
               desc:'Carries eggs to the truck or an incubator.', needs:'belts' },
};
function buildCost(type, owned) {
  const b = BUILDS[type];
  return Math.round(b.base * Math.pow(b.growth, b.growth === 1 ? 0 : owned));
}

/* ------------------------------------------------------------
   LAND — 3x2 plots of 16x13 tiles. You start with the
   bottom-left plot; buy neighbors from their signposts.
   ------------------------------------------------------------ */
const PLOTS = [
  { id:0, tc:0,  tr:0,  price:3000,    theme:'berry'   },
  { id:1, tc:16, tr:0,  price:200000,  theme:'lavender'},
  { id:2, tc:32, tr:0,  price:1500000, theme:'shroom'  },
  { id:3, tc:0,  tr:13, price:0,       theme:'home'    },   /* start */
  { id:4, tc:16, tr:13, price:400,     theme:'sunflower'},
  { id:5, tc:32, tr:13, price:25000,   theme:'rocky'   },
];
const PLOT_W = 16, PLOT_H = 13;
function plotNeighbors(id) {
  const map = { 0:[1,3], 1:[0,2,4], 2:[1,5], 3:[0,4], 4:[1,3,5], 5:[2,4] };
  return map[id];
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
   RESEARCH TREE — drawn as an actual tree in the Lab.
   x,y are % coordinates on the tree canvas (y grows downward;
   the trunk root sits at the bottom middle). pre: node id.
   Cost in feathers: base * growth^level.
   ------------------------------------------------------------ */
const BRANCHES = [
  { name:'GATHER',  icon:'🧺', hue:'#6ab04c' },
  { name:'HENS',    icon:'🐔', hue:'#e8542f' },
  { name:'HATCHERY',icon:'🐣', hue:'#f0a422' },
  { name:'LOVE',    icon:'💘', hue:'#ff5f9e' },
  { name:'FACTORY', icon:'⚙️', hue:'#3fa7d6' },
  { name:'MARKET',  icon:'🚚', hue:'#b8862f' },
];

const SKILLS = [
  { id:'root', br:2, x:50, y:93, pre:null, name:'Egg Science', icon:'🥚', max:1, base:0, growth:1, desc:'It all starts with one egg.' },

  /* GATHER 🧺 — far left */
  { id:'basket1',  br:0, x:31, y:78, pre:'root',    name:'Bigger Basket', icon:'🧺', max:5, base:4,   growth:2.0, desc:'+8 basket capacity' },
  { id:'magnet',   br:0, x:19, y:69, pre:'basket1', name:'Magnet Palm',   icon:'🧲', max:5, base:8,   growth:2.1, desc:'+12px scoop radius' },
  { id:'feather1', br:0, x:29, y:63, pre:'basket1', name:'Feather Finder',icon:'🪶', max:5, base:10,  growth:2.2, desc:'+3% feathers when scooping eggs' },
  { id:'feed',     br:0, x:10, y:57, pre:'magnet',  name:'Bird Feed',     icon:'🌾', max:1, base:25,  growth:1,   desc:'Unlock the Feed tool (hens lay 2x)' },
  { id:'feedplus', br:0, x:6,  y:43, pre:'feed',    name:'Tasty Mix',     icon:'🥣', max:3, base:45,  growth:2.5, desc:'feed lasts +50% longer' },
  { id:'sweepluck',br:0, x:23, y:49, pre:'feather1',name:'Lucky Sweep',   icon:'🍀', max:5, base:30,  growth:2.4, desc:'+2% scooped eggs duplicate' },
  { id:'basket2',  br:0, x:16, y:33, pre:'sweepluck',name:'Deep Basket',  icon:'🧺', max:3, base:60,  growth:2.6, desc:'+16 basket capacity' },

  /* HENS 🐔 — left of trunk */
  { id:'happy',   br:1, x:40, y:73, pre:'root',   name:'Happy Hens',    icon:'💗', max:10, base:4,   growth:1.9, desc:'+10% lay speed' },
  { id:'pets',    br:1, x:33, y:56, pre:'happy',  name:'Pet Therapy',   icon:'🤲', max:5,  base:6,   growth:2.2, desc:'-15% pet cooldown' },
  { id:'flock',   br:1, x:43, y:59, pre:'happy',  name:'Bigger Flock',  icon:'🏡', max:8,  base:10,  growth:2.1, desc:'+4 chicken capacity' },
  { id:'golden',  br:1, x:39, y:45, pre:'flock',  name:'Golden Peck',   icon:'✨', max:5,  base:25,  growth:2.5, desc:'+3% golden eggs (worth 5x)' },
  { id:'mutate',  br:1, x:33, y:33, pre:'golden', name:'Mutation Vats', icon:'🧬', max:8,  base:30,  growth:2.3, desc:'+1.5% egg mutation chance' },
  { id:'rainbow', br:1, x:38, y:20, pre:'mutate', name:'Rainbow Genome',icon:'🌈', max:3,  base:300, growth:5.0, desc:'+15% for mutations to jump 2 tiers' },

  /* HATCHERY 🐣 — center */
  { id:'warm',    br:2, x:50, y:70, pre:'root',   name:'Warm Coils',    icon:'🔥', max:10, base:4,   growth:1.9, desc:'+15% incubator speed' },
  { id:'inccap',  br:2, x:46, y:55, pre:'warm',   name:'Roomy Racks',   icon:'🗄️', max:5,  base:20,  growth:2.4, desc:'+3 incubator queue' },
  { id:'twins',   br:2, x:54, y:55, pre:'warm',   name:'Twin Yolks',    icon:'👯', max:5,  base:30,  growth:2.4, desc:'+4% twin hatch chance' },
  { id:'whisper', br:2, x:46, y:41, pre:'inccap', name:'Egg Whisperer', icon:'🪶', max:5,  base:25,  growth:2.3, desc:'+20% feathers from hatching' },
  { id:'miracle', br:2, x:54, y:41, pre:'twins',  name:'Miracle Hatch', icon:'🌟', max:3,  base:120, growth:4.0, desc:'+5% hatchling is +1 tier' },
  { id:'quantum', br:2, x:50, y:27, pre:'whisper',name:'Quantum Coils', icon:'⚛️', max:5,  base:220, growth:2.6, desc:'+30% incubator speed' },

  /* LOVE 💘 — right of trunk */
  { id:'court',    br:3, x:61, y:72, pre:'root',     name:'Courtship',     icon:'💘', max:1, base:15,  growth:1,   desc:'Unlock the LOVE NEST (breed chickens!)' },
  { id:'candle',   br:3, x:58, y:57, pre:'court',    name:'Candlelight',   icon:'🕯️', max:5, base:20,  growth:2.3, desc:'+20% breeding speed' },
  { id:'genes',    br:3, x:66, y:58, pre:'court',    name:'Fine Genes',    icon:'🧪', max:5, base:35,  growth:2.5, desc:'+6% bred egg tier-up chance' },
  { id:'twindate', br:3, x:60, y:44, pre:'candle',   name:'Double Date',   icon:'💕', max:3, base:90,  growth:3.0, desc:'+10% breeding lays 2 eggs' },
  { id:'rainbowegg',br:3,x:67, y:44, pre:'genes',    name:'Rainbow Clutch',icon:'🌈', max:3, base:250, growth:4.0, desc:'+8% rainbow egg from Divine pairs' },
  { id:'secretlore',br:3,x:63, y:29, pre:'rainbowegg',name:'Secret Lore',  icon:'📜', max:1, base:1200,growth:1,   desc:'Rainbow eggs hatch 3x faster' },

  /* FACTORY ⚙️ — right */
  { id:'belts',    br:4, x:73, y:75, pre:'root',    name:'Conveyor Tech', icon:'📦', max:1, base:30,  growth:1,   desc:'Unlock conveyor belts' },
  { id:'beltspeed',br:4, x:70, y:62, pre:'belts',   name:'Belt Grease',   icon:'🛢️', max:5, base:20,  growth:2.2, desc:'+20% belt speed' },
  { id:'vacuum',   br:4, x:78, y:62, pre:'belts',   name:'Vacuum Bots',   icon:'🤖', max:1, base:80,  growth:1,   desc:'Unlock egg vacuums' },
  { id:'vacradius',br:4, x:74, y:49, pre:'vacuum',  name:'Wide Suction',  icon:'🌀', max:5, base:40,  growth:2.2, desc:'+8px vacuum radius' },
  { id:'vacspeed', br:4, x:81, y:48, pre:'vacuum',  name:'Turbo Pumps',   icon:'💨', max:5, base:40,  growth:2.2, desc:'+25% vacuum speed' },
  { id:'overclock',br:4, x:77, y:34, pre:'vacradius',name:'Overclock',    icon:'⚡', max:1, base:1500,growth:1,   desc:'ALL machines run 2x faster' },

  /* MARKET 🚚 — far right */
  { id:'value',    br:5, x:88, y:76, pre:'root',     name:'Egg Polish',       icon:'🥚', max:10, base:5,   growth:1.9, desc:'+15% egg sell value' },
  { id:'truckcap', br:5, x:85, y:63, pre:'value',    name:'Bigger Bed',       icon:'🛻', max:6,  base:15,  growth:2.2, desc:'+5 truck capacity' },
  { id:'route',    br:5, x:92, y:62, pre:'value',    name:'Express Route',    icon:'🛣️', max:5,  base:25,  growth:2.3, desc:'truck trips 15% faster' },
  { id:'fullbonus',br:5, x:86, y:49, pre:'truckcap', name:'Full Load Deal',   icon:'📈', max:5,  base:30,  growth:2.3, desc:'+6% payout for a full truck' },
  { id:'autosend', br:5, x:93, y:48, pre:'route',    name:'Auto-Dispatch',    icon:'🗝️', max:1,  base:250, growth:1,   desc:'truck departs by itself when full' },
  { id:'contracts',br:5, x:89, y:35, pre:'fullbonus',name:'Premium Contracts',icon:'📜', max:3,  base:400, growth:5.0, desc:'+1% value per species discovered' },
  { id:'tycoon',   br:5, x:92, y:21, pre:'contracts',name:'Egg Empire',       icon:'👑', max:1,  base:5000,growth:1,   desc:'ALL coin gains x2' },
];

const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));
function skillCost(sk, lvl) { return Math.ceil(sk.base * Math.pow(sk.growth, lvl)); }
function skillPrereq(sk) { return sk.pre ? SKILL_BY_ID[sk.pre] : null; }
