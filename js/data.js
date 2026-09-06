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
  mamaPetCd: 4,            // mama likes attention, in moderation
  mamaLayMult: 3.2,        // mama takes her time between eggs - the flock is the engine
  mamaHunger: 150,         // seconds a full grandma keeps laying before she wants feeding
  mamaPellets: 4,          // pellets that fill her right back up
  mamaReach: 34,           // px around the nest she can reach without getting up
  chickPellets: 12,        // pellets a chick eats to grow up
  growTime: 300,           // seconds a chick needs to grow, however well fed
  hungerTime: 110,         // seconds for a full belly to empty
  hungryLay: 0.5,          // lay speed when the belly is empty
  baseFeedCap: 40,         // pellets the ranch can store before a barn
  barnCap: 160,            // extra pellets per barn
  troughCap: 12,           // pellets a trough holds
  wellR: 44,               // px a well keeps watered
  sprinklerR: 30,          // px a sprinkler keeps watered
  waterLast: 60,           // seconds one watering keeps a tile damp - dry crops do not grow
  beehiveR: 48,            // px a beehive pollinates
  beehiveBoost: 0.30,      // crop growth inside that circle
  honeyEvery: 75,          // seconds between honey jars
  honeyValue: 14,          // coins a jar of honey fetches
  orderEvery: 70,          // seconds between customers pulling up
  orderTime: 150,          // seconds a customer waits
  orderPay: 2.4,           // what an order pays per egg, against the sell value
  orderTip: 3,             // feathers tipped for a filled order
  maxOrders: 2,            // cars that fit in the lay-by
  carEvery: 9,             // seconds between passing cars, give or take
  siteBase: 6,             // seconds the movers need for the cheapest building
  storeyMult: 1.5,         // what a second storey does to a building's effect
  storeyCost: 1.4,         // second storey price against the building's base
  geneMax: 3,              // points a gene can carry
  geneLay: 0.12, geneSize: 0.10, geneLuck: 0.01, genePlume: 0.15, geneHardy: 0.15,
  spliceFeathers: 40, cloneFeathers: 30, crossFeathers: 80,
  cloneCoins: 40,          // coins per point of egg value to clone a hen
  stockTick: 6,            // seconds between market moves
  stockVol: 0.035,         // how jumpy the market is
  rainEvery: 240,          // seconds between showers, give or take
  rainLength: 45,          // seconds a shower lasts; every crop drinks while it does
  vipChance: 0.18,         // odds a customer is a VIP with a bigger, better-paying order
  vipPay: 2.0,             // what a VIP pays on top of the going rate
  vipTime: 110,            // seconds a VIP is prepared to wait
  polishMult: 1.5,         // what a polished egg is worth
  gradeChance: 0.12,       // chance a grader bumps an egg a tier
  dynamoR: 74,             // px a dynamo drives machines
  dynamoBoost: 0.55,       // how much faster inside that circle
  coopR: 60,               // px a coop speeds chicks growing
  baseBasketCap: 8,
  baseTruckCap: 10,
  baseTripTime: 7,         // seconds the truck is gone
  baseScoopR: 26,          // px magnet radius around the cursor
  baseVacR: 30,            // px vacuum suction radius
  vacInterval: 1.2,        // seconds per egg vacuumed
  vacHold: 12,             // eggs a vacuum can hold with no belt
  beltSpeed: 26,           // px per second
  scoopFeather: 0.05,      // base chance a scooped egg pops a feather
  sprinkle: 3,             // pellets per sprinkle
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
  pathSpeed: 1.25,         // how much faster the crew walk on a path
  stoneSpeed: 1.45,
  decoRefund: 0.5,         // what you get back for lifting a decoration
  loaderRate: 0.35,        // seconds per egg a Loader pushes into the truck
  hatcheryCap: 24,         // eggs a Grand Hatchery holds
};

/* ------------------------------------------------------------
   FARMING - the field starts bare. Till, plant, water, harvest.
   Every harvest becomes feed pellets; feed grows chicks up and
   keeps the flock laying. Growth is in seconds for a dry tile.
   ------------------------------------------------------------ */
const CROPS = {
  clover: { name:'Clover',    grow:90,  yield:4,  seed:4,  col:'#6ab04c', flower:'#fff', stages:3,
            desc:'Cheap ground cover. Chicks nibble it right up.' },
  wheat:  { name:'Wheat',     grow:150, yield:8,  seed:8,  col:'#e8c458', stages:4, needs:'wheat',
            desc:'Slow and dependable.' },
  corn:   { name:'Corn',      grow:280, yield:18, seed:18, col:'#f2d24c', stages:4, needs:'corn',
            desc:'Tall, slow and generous.' },
  sunseed:{ name:'Sunflower', grow:420, yield:34, seed:36, col:'#f0a422', stages:4, needs:'sunflowers',
            desc:'Sunny seeds the flock adores.' },
  berry:  { name:'Berry Bush',grow:240, yield:12, seed:70, col:'#c94a6a', stages:4, needs:'berries', regrow:true,
            desc:'Regrows after every picking.' },
  strawberry: { name:'Strawberry', grow:200, yield:14, seed:24, col:'#e8324a', stages:4, needs:'strawberries', regrow:true,
            desc:'Sweet, and it fruits again.' },
  chili:  { name:'Chili',     grow:260, yield:22, seed:30, col:'#e8402f', stages:4, needs:'chilis',
            desc:'Hot stuff. A heavy, fiery harvest.' },
  pumpkin:{ name:'Pumpkin',   grow:600, yield:60, seed:80, col:'#f0a422', stages:4, needs:'pumpkins',
            desc:'Slow as anything, and worth the wait.' },
};
const CROP_KEYS = Object.keys(CROPS);

/* ------------------------------------------------------------
   LANDSCAPING - the ranch is yours to shape. Terrain paints on
   the tile grid; decorations sit on top of it.
   ------------------------------------------------------------ */
const TERRAIN = {
  soil:  { name:'Till',      icon:'hoe',    cost:0,  desc:'Turn grass into soil you can plant in.', needs:'hoe' },
  path:  { name:'Path',      icon:'road',   cost:4,  desc:'Packed dirt. The crew walk a quarter faster on it.', needs:'paths' },
  stone: { name:'Stone Path',icon:'silo',   cost:14, desc:'Neat flagstones. Faster still, and very tidy.', needs:'paving' },
  high:  { name:'Raise',     icon:'house',  cost:22, desc:'Bank the ground up into a grassy terrace.', needs:'terracing' },
  water: { name:'Dig Pond',  icon:'water',  cost:30, desc:'Scoop out a pond. Nothing walks through it.', needs:'digging' },
  flat:  { name:'Level',     icon:'remove', cost:0,  desc:'Put a tile back to plain grass.' },
};
const TERRAIN_KEYS = Object.keys(TERRAIN);

/* things you can plant purely because they look nice */
const DECOS = {
  /* the garden centre */
  flower:    { name:'Flowers',    cost:8,   kind:'flower',    needs:'garden' },
  tuft:      { name:'Grass Tuft', cost:4,   kind:'tuft',      needs:'garden' },
  clover:    { name:'Clover',     cost:6,   kind:'clover',    needs:'garden' },
  bush:      { name:'Bush',       cost:18,  kind:'bush',      needs:'garden' },
  rock:      { name:'Rock',       cost:10,  kind:'rock',      needs:'garden' },
  daisy:     { name:'Daisies',    cost:6,   kind:'daisy',     needs:'garden' },
  poppy:     { name:'Poppies',    cost:9,   kind:'poppy',     needs:'garden' },
  dandelion: { name:'Dandelions', cost:5,   kind:'dandelion', needs:'garden' },
  ivy:       { name:'Ivy Patch',  cost:12,  kind:'ivy',       needs:'garden' },
  moss:      { name:'Moss',       cost:5,   kind:'moss',      needs:'garden' },
  /* the tree nursery */
  tree:      { name:'Oak',        cost:35,  kind:'tree',      needs:'trees' },
  pine:      { name:'Pine',       cost:35,  kind:'pine',      needs:'trees' },
  stump:     { name:'Stump',      cost:12,  kind:'stump',     needs:'trees' },
  shroom:    { name:'Mushrooms',  cost:14,  kind:'shroom',    needs:'trees' },
  reed:      { name:'Reeds',      cost:9,   kind:'reed',      needs:'trees' },
  fern:      { name:'Fern',       cost:11,  kind:'fern',      needs:'trees' },
  bamboo:    { name:'Bamboo',     cost:24,  kind:'bamboo',    needs:'trees' },
  /* the orchard */
  apple:     { name:'Apple Tree', cost:60,  kind:'apple',     needs:'orchard' },
  lavender:  { name:'Lavender',   cost:16,  kind:'lavender',  needs:'orchard' },
  sunflower: { name:'Sunflower',  cost:20,  kind:'sunflower', needs:'orchard' },
  tulip:     { name:'Tulips',     cost:18,  kind:'tulip',     needs:'orchard' },
  rosebush:  { name:'Rose Bush',  cost:32,  kind:'rosebush',  needs:'orchard' },
  cactus:    { name:'Cactus',     cost:26,  kind:'cactus',    needs:'orchard' },
  /* furniture */
  bench:     { name:'Bench',      cost:24,  kind:'bench',     needs:'furniture' },
  lamp:      { name:'Lamp Post',  cost:30,  kind:'lamp',      needs:'furniture' },
  barrel:    { name:'Barrel',     cost:14,  kind:'barrel',    needs:'furniture' },
  birdbath:  { name:'Birdbath',   cost:40,  kind:'birdbath',  needs:'furniture' },
  scarecrow: { name:'Scarecrow',  cost:36,  kind:'scarecrow', needs:'furniture' },
  mailbox:   { name:'Mailbox',    cost:18,  kind:'mailbox',   needs:'furniture' },
  hay:       { name:'Hay Bale',   cost:12,  kind:'hay',       needs:'furniture' },
  planter:   { name:'Planter',    cost:22,  kind:'planter',   needs:'furniture' },
};
const DECO_KEYS = Object.keys(DECOS);

/* the landscaping tool's own tabs */
const FARM_SECTIONS = [
  { id:'ground', name:'GROUND', icon:'hoe' },
  { id:'plant',  name:'PLANT',  icon:'sprout' },
  { id:'tend',   name:'TEND',   icon:'water' },
  { id:'decor',  name:'DECOR',  icon:'tree' },
];

/* ------------------------------------------------------------
   LOGISTICS - you start on a bicycle. Every vehicle carries more
   and goes faster; every city pays more and sits further away.
   ------------------------------------------------------------ */
const VEHICLES = [
  { id:'bike',  name:'Delivery Bike', cap:4,   trip:16, cost:0,      desc:'A basket on the handlebars. Four eggs, if you pedal gently.' },
  { id:'cart',  name:'Pedal Cart',    cap:9,   trip:15, cost:450,    desc:'A crate on wheels behind the bike.' },
  { id:'van',   name:'Egg Van',       cap:18,  trip:12, cost:4200,   desc:'Padded shelves. Your first engine.' },
  { id:'truck', name:'Ranch Truck',   cap:32,  trip:10, cost:28000,  desc:'The classic. Room for a proper load.' },
  { id:'lorry', name:'Big Lorry',     cap:64,  trip:9,  cost:240000, desc:'Articulated. Cities notice when it arrives.' },
  { id:'train', name:'Egg Express',   cap:150, trip:8,  cost:3.2e6,  desc:'A private railcar on the valley line.' },
];
const CITIES = [
  { id:'hamlet', name:'Cluckton',        dist:1.0, mult:1.0,  cost:0,     sky:0, pop:'village',
    desc:'The village down the lane. Pays what eggs are worth.' },
  { id:'town',   name:'Yolkford',        dist:1.5, mult:1.35, cost:900,   sky:1, pop:'market town',
    desc:'A market town with a Saturday egg fair.' },
  { id:'city',   name:'Featherton',      dist:2.2, mult:1.9,  cost:12000, sky:2, pop:'city',
    desc:'A proper city. Restaurants pay well for the good stuff.' },
  { id:'capital',name:'New Shellington', dist:3.1, mult:2.8,  cost:160000,sky:3, pop:'capital',
    desc:'The capital. Rare eggs fetch a fortune here.' },
  { id:'port',   name:'Port Albumen',    dist:4.2, mult:4.2,  cost:2.2e6, sky:4, pop:'port',
    desc:'Ships leave for the wide world, eggs and all.' },
];
const CITY_BY_ID = Object.fromEntries(CITIES.map(c => [c.id, c]));

/* buildable things - cost grows with how many you own (belts stay flat) */
const BUILD_SECTIONS = [
  { id:'ranch',   name:'RANCH',   icon:'egg' },
  { id:'farm',    name:'FARM',    icon:'seed' },
  { id:'factory', name:'FACTORY', icon:'gear' },
  { id:'crew',    name:'CREW',    icon:'hands' },
];
const BUILDS = {
  incubator: { name:'Incubator', sec:'ranch', w:2, h:2, base:120, growth:1.6, refund:50,
               desc:'Drop eggs in - the only way they hatch.' },
  coop:      { name:'Coop', sec:'ranch', w:2, h:2, base:350, growth:1.7, refund:140,
               desc:'+6 chicken room, and chicks near it grow up twice as fast.', needs:'coopbuild' },
  barn:      { name:'Feed Barn', sec:'farm', w:2, h:2, base:180, growth:1.6, refund:70,
               desc:'Stores 160 more pellets of feed.' },
  trough:    { name:'Feed Trough', sec:'farm', w:1, h:1, base:60, growth:1.3, refund:25,
               desc:'Holds a dozen pellets; the flock helps itself. Crew keep it topped up.', needs:'trough' },
  well:      { name:'Well', sec:'farm', w:1, h:1, base:260, growth:1.6, refund:100,
               desc:'Keeps every crop nearby watered, no can needed.', needs:'well' },
  sprinkler: { name:'Sprinkler', sec:'farm', w:1, h:1, base:140, growth:1.4, refund:55,
               desc:'A small watered circle. Cheap to line a field with.', needs:'sprinkler' },
  mill:      { name:'Mill', sec:'farm', w:2, h:2, base:1200, growth:1.9, refund:480,
               desc:'Every harvest on the ranch yields 25% more feed.', needs:'mill' },
  lovenest:  { name:'Love Nest', sec:'ranch', w:2, h:2, base:400, growth:1.8, refund:150,
               desc:'Drop two chickens in to breed a fancy egg.', needs:'court' },
  staffhut:  { name:'Staff Hut', sec:'crew', w:2, h:2, base:220, growth:1.8, refund:90,
               desc:'Hire farmhands and robots here. +3 staff slots each.', needs:'hiring' },
  silo:      { name:'Egg Silo',  sec:'factory', w:2, h:2, base:900, growth:1.8, refund:350,
               desc:'Stores eggs from belts and loads the truck by itself.', needs:'silo' },
  vacuum:    { name:'Vacuum Bot', sec:'factory', w:1, h:1, base:300, growth:1.7, refund:100,
               desc:'Slurps nearby eggs onto the belt it faces.', needs:'vacuum' },
  blower:    { name:'Air Blower', sec:'factory', w:1, h:1, base:260, growth:1.7, refund:90,
               desc:'Blows loose eggs across the grass in the way it faces.', needs:'blower' },
  sorter:    { name:'Sorter',    sec:'factory', w:1, h:1, base:150, growth:1.6, refund:60,
               desc:'On a belt: rare eggs go straight, common ones turn aside.', needs:'sorter' },
  hatchery:  { name:'Grand Hatchery', sec:'ranch', w:3, h:3, base:6500, growth:1.9, refund:2600,
               desc:'A 24-egg incubator bank that hatches twice as fast.', needs:'hatchery' },
  splitter:  { name:'Splitter', sec:'factory', w:1, h:1, base:180, growth:1.5, refund:70,
               desc:'On a belt: sends eggs left and right in turn to fill two lines.', needs:'splitter' },
  loader:    { name:'Truck Loader', sec:'factory', w:2, h:1, base:1400, growth:1.8, refund:550,
               desc:'Parks by the road and shovels belt eggs straight into the truck.', needs:'loader' },
  polisher:  { name:'Polisher',  sec:'factory', w:1, h:1, base:900, growth:1.7, refund:350,
               desc:'On a belt: buffs every egg that rolls through, worth half again as much.', needs:'polisher' },
  grader:    { name:'Grader',    sec:'factory', w:2, h:1, base:5200, growth:1.9, refund:2000,
               desc:'On a belt: now and then it grades an egg up a whole tier.', needs:'grader' },
  dynamo:    { name:'Dynamo',    sec:'factory', w:2, h:2, base:9000, growth:2.0, refund:3600,
               desc:'Drives every belt and machine around it a good deal faster.', needs:'dynamo' },
  hq:        { name:'Logistics HQ', sec:'crew', w:3, h:2, base:400, growth:2.2, refund:160,
               desc:'A dispatch office with a wall map. Every trip runs 10% faster with one on the ranch.', needs:'logistics' },
  beehive:   { name:'Beehive', sec:'farm', w:1, h:1, base:220, growth:1.5, refund:90,
               desc:'Bees pollinate every crop nearby so it grows faster, and drip honey you can sell.', needs:'beehive' },
  genelab:   { name:'Gene Lab', sec:'ranch', w:2, h:2, base:1500, growth:2.0, refund:600,
               desc:'Read a hen\'s genes, splice two birds into one, clone the best, cross in animal traits.', needs:'genelab' },
  board:     { name:'Noticeboard', sec:'crew', w:1, h:1, base:40, growth:1.4, refund:15,
               desc:'Where flyers get pinned. Applicants walk up to it and wait.', needs:'hiring' },
  belt:      { name:'Conveyor',  sec:'factory', w:1, h:1, base:15, growth:1, refund:7,
               desc:'Carries eggs to the truck, a silo or an incubator.', needs:'belts' },
  fence:     { name:'Fence',     sec:'ranch', w:1, h:1, base:10, growth:1, refund:5,
               desc:'Chickens will not cross it. Pen them where you want them.', needs:'belts' },
};

/* ------------------------------------------------------------
   GENES - every hen carries five, nought to three points each.
   The Gene Lab reads them, splices, clones and crosses them.
   ------------------------------------------------------------ */
const GENES = {
  lay:   { key:'lay',   name:'LAY',   icon:'egg',     col:'#f0a422', desc:'lays faster' },
  size:  { key:'size',  name:'SIZE',  icon:'coin',    col:'#ffd23f', desc:'eggs worth more' },
  luck:  { key:'luck',  name:'LUCK',  icon:'clover',  col:'#6ab04c', desc:'more golden eggs' },
  plume: { key:'plume', name:'PLUME', icon:'feather', col:'#b06ee0', desc:'more feathers' },
  hardy: { key:'hardy', name:'HARDY', icon:'flame',   col:'#e8542f', desc:'stays full longer' },
};
const GENE_KEYS = Object.keys(GENES);
/* animals a hen can be crossed with, each pushing one gene and leaving a mark */
const ANIMALS = [
  { id:'cow',     name:'Cow',     gene:'size',  mark:'spots',   desc:'Big eggs. Patches on the plumage.' },
  { id:'rabbit',  name:'Rabbit',  gene:'lay',   mark:'ears',    desc:'Lays quick as anything. Long ears.' },
  { id:'peacock', name:'Peacock', gene:'plume', mark:'fan',     desc:'Feathers for days. A teal tail fan.' },
  { id:'bee',     name:'Bee',     gene:'luck',  mark:'stripes', desc:'Lucky golden eggs. Striped body.' },
  { id:'goat',    name:'Goat',    gene:'hardy', mark:'horns',   desc:'Never gets hungry. Little horns.' },
];
const ANIMAL_BY_ID = Object.fromEntries(ANIMALS.map(a => [a.id, a]));

/* ------------------------------------------------------------
   THE COMPANY - a raccoon inherited this farm and means to get
   rich. Name it, pick a logo and two colours; the truck, the
   sign and the paperwork wear them.
   ------------------------------------------------------------ */
const COMPANY_DEFAULT = { name:'INF EGG CO.', logo:'egg', col1:'#e8542f', col2:'#ffd23f', done:false, sig:null };
const LOGOS = ['egg', 'chick', 'star', 'crown', 'sparkle', 'heart', 'bolt', 'clover', 'gear', 'truck', 'flame', 'atom'];
const BRAND_COLS = ['#e8542f', '#f0a422', '#ffd23f', '#6ab04c', '#3fa7d6', '#2f5f9e', '#b06ee0', '#ff5f9e',
                    '#fff8ec', '#2e2216', '#8a5e2a', '#4fb8a8'];

/* rival egg companies whose shares you can hold, once the market opens */
const STOCKS = [
  { id:'cluck',  name:'Cluck Corp',      col:'#e8542f', base:24,  drift:0.0006 },
  { id:'yolk',   name:'Yolkford Farms',  col:'#f0a422', base:61,  drift:0.0004 },
  { id:'shell',  name:'Shellington Ltd', col:'#3fa7d6', base:140, drift:0.0009 },
  { id:'feath',  name:'Featherton Feed', col:'#6ab04c', base:9,   drift:0.0003 },
];
const STOCK_BY_ID = Object.fromEntries(STOCKS.map(s => [s.id, s]));

/* ------------------------------------------------------------
   THE WORLD - once the valley is yours, the rest of it. Regions
   open in order down this list for coins; each takes a number
   of branches that earn coins a minute on their own. The Moon
   needs a rocket (the Moonshot cube) on top of its price.
   x, y sit on the 380 x 200 world map.
   ------------------------------------------------------------ */
const REGIONS = [
  { id:'valley',       name:'Cluckton Valley', flag:['#6ab04c', '#ffd23f'], x:96,  y:96,  cost:0,     branchBase:0,      cap:0,  yield:0,    home:true, blurb:'Home. The ranch itself.' },
  { id:'featherland',  name:'Featherland',     flag:['#3fa7d6', '#fff8ec'], x:64,  y:62,  cost:8000,  branchBase:3000,   cap:4,  yield:24,   blurb:'Cold, tidy, mad for eggs.' },
  { id:'yolkshire',    name:'Yolkshire',       flag:['#e8542f', '#fff8ec'], x:190, y:66,  cost:20000, branchBase:6000,   cap:5,  yield:40,   blurb:'Tea, rain and a boiled egg.' },
  { id:'shellvador',   name:'Shellvador',      flag:['#ffd23f', '#6ab04c'], x:116, y:146, cost:45000, branchBase:12000,  cap:5,  yield:70,   blurb:'Sun all year. Hens lay double.' },
  { id:'eggypt',       name:'Eggypt',          flag:['#f0a422', '#2e2216'], x:208, y:112, cost:90000, branchBase:22000,  cap:6,  yield:120,  blurb:'Pyramids of eggs, literally.' },
  { id:'cluckistan',   name:'Cluckistan',      flag:['#b06ee0', '#ffd23f'], x:252, y:84,  cost:180000,branchBase:40000,  cap:6,  yield:200,  blurb:'High plains. Very large hens.' },
  { id:'peckoslovakia',name:'Peckoslovakia',   flag:['#ff5f9e', '#fff8ec'], x:166, y:44,  cost:320000,branchBase:70000,  cap:6,  yield:320,  blurb:'The egg opera capital.' },
  { id:'coopisland',   name:'Coop Island',     flag:['#4fb8a8', '#fff8ec'], x:302, y:146, cost:650000,branchBase:130000, cap:8,  yield:520,  blurb:'An island shaped like a hen.' },
  { id:'henmark',      name:'Henmark',         flag:['#e8324a', '#fff8ec'], x:130, y:34,  cost:1.2e6, branchBase:250000, cap:8,  yield:850,  blurb:'Designer eggs. Very dear.' },
  { id:'moon',         name:'The Moon',        flag:['#c9ced6', '#2e2216'], x:338, y:36,  cost:8e6,   branchBase:2e6,    cap:10, yield:6000, moon:true, blurb:'No air. No foxes. Eggs float.' },
];
const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]));

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
  hand:   { id:'hand',   name:'Farmhand',   icon:'hand',   uses:['speed','carry'],
            job:'Gathers loose eggs and runs them to a silo, hatchery or the truck.' },
  feeder: { id:'feeder', name:'Feeder',     icon:'seed',   uses:['care','speed'], needs:'feed',
            job:'Scatters seed so the flock keeps laying at double speed.' },
  packer: { id:'packer', name:'Packer',     icon:'crate',  uses:['carry','grit'], needs:'silo',
            job:'Shuttles eggs out of silos and packs the truck to the brim.' },
  tech:   { id:'tech',   name:'Technician', icon:'gear',   uses:['tech','grit'], needs:'belts',
            job:'Walks the line; every machine near them runs faster.' },
  keeper: { id:'keeper', name:'Keeper',     icon:'hands',  uses:['care','grit'], needs:'keeper',
            job:'Pets the flock all day, so hens lay on their own more often.' },
  cull:   { id:'cull',   name:'Cull-Bot',   icon:'remove', botOnly:true, uses:['speed','grit'], needs:'cullbot',
            job:'Retires chickens you mark as unwanted, recycling them into feathers.' },
  match:  { id:'match',  name:'Match-Bot',  icon:'cupid',  botOnly:true, uses:['speed','care'], needs:'matchbot',
            job:'Carries pairs of chickens into any empty love nest.' },
};
const ROLE_KEYS = Object.keys(ROLES);

/* Every role can be filled by a person or by a little robot. The bots are
   round, fat and cheerful; each role gets its own paint job and hat. */
const BOTS = {
  hand:   { name:'Gather-Bot', shell:'#8fd6f9', trim:'#ffd23f', visor:'#3fd0ff', hat:'cap',    face:'happy' },
  feeder: { name:'Seed-Bot',   shell:'#b8e986', trim:'#f2a03f', visor:'#7ac74f', hat:'straw',  face:'happy' },
  packer: { name:'Haul-Bot',   shell:'#f2c14e', trim:'#7a5230', visor:'#ff9f1c', hat:'none',   face:'grin'  },
  tech:   { name:'Fix-Bot',    shell:'#c9ced6', trim:'#3fa7d6', visor:'#5fe8ff', hat:'bolt',   face:'wink'  },
  keeper: { name:'Cuddle-Bot', shell:'#ffc0d8', trim:'#fff8ec', visor:'#ff8ab5', hat:'bow',    face:'happy' },
  cull:   { name:'Cull-Bot',   shell:'#ffb0a0', trim:'#e8542f', visor:'#ff6b4a', hat:'none',   face:'stern' },
  match:  { name:'Match-Bot',  shell:'#f2d8e6', trim:'#ff5f9e', visor:'#ff8ab5', hat:'bow',    face:'love'  },
};
function botName(role, n) {
  const base = (BOTS[role] || BOTS.hand).name.toUpperCase().replace('-', '');
  return base + '-' + String(n).padStart(2, '0');
}

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
  flyerYield: 1,           // applicants per run, +1 per city on your routes
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
   LAND - 5x4 plots of 16x13 tiles = 80x52 tiles = 1280x832 px.
   You start on the bottom-left plot; buy neighbours from their
   FOR SALE signs. Row 2 is the road row.
   ------------------------------------------------------------ */
const PLOT_W = 16, PLOT_H = 13, PLOT_COLS = 5, PLOT_ROWS = 4;
const PLOTS = [
  /* top row - the far end of the valley, and the last land you buy */
  { id:0,  tc:0,  tr:0,  price:8e11,  theme:'pinewood' },
  { id:1,  tc:16, tr:0,  price:4e12,  theme:'wetland'  },
  { id:2,  tc:32, tr:0,  price:2e13,  theme:'thicket'  },
  { id:3,  tc:48, tr:0,  price:9e13,  theme:'shroom'   },
  { id:4,  tc:64, tr:0,  price:4e14,  theme:'highland' },
  { id:5,  tc:0,  tr:13, price:9e6,   theme:'birch'    },
  { id:6,  tc:16, tr:13, price:5e8,   theme:'pinewood' },
  { id:7,  tc:32, tr:13, price:4e9,   theme:'wetland'  },
  { id:8,  tc:48, tr:13, price:3e10,  theme:'thicket'  },
  { id:9,  tc:64, tr:13, price:1.5e11,theme:'highland' },
  { id:10, tc:0,  tr:26, price:3000,  theme:'berry'    },
  { id:11, tc:16, tr:26, price:25000, theme:'orchard'  },
  { id:12, tc:32, tr:26, price:1.5e6, theme:'lavender' },
  { id:13, tc:48, tr:26, price:7e7,   theme:'rocky'    },
  { id:14, tc:64, tr:26, price:2e9,   theme:'birch'    },
  /* the home row, along the road */
  { id:15, tc:0,  tr:39, price:0,     theme:'home'     },   /* start */
  { id:16, tc:16, tr:39, price:400,   theme:'sunflower'},
  { id:17, tc:32, tr:39, price:200000,theme:'meadow'   },
  { id:18, tc:48, tr:39, price:1.2e7, theme:'prairie'  },
  { id:19, tc:64, tr:39, price:4e8,   theme:'orchard'  },
];
const PLOT_START = 15;
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
   RESEARCH - the Lab runs EGGOS, a little terminal. Packages are
   square nodes laid out in lanes, one lane per module, depth
   running left to right from the kernel. A package only lists
   once its prerequisite is installed, so the screen shows exactly
   what you can do now. Cost in feathers: base * growth^level.
   Nodes come in kinds: 'unlock' opens a tool, a building, a brush
   or a screen; 'stat' stacks a bonus; the QUESTS lane is a chain
   of goals that pay out when you reach them.
   ------------------------------------------------------------ */
const MODULES = [
  { id:'quests',  name:'QUESTS',  code:'quest.sys', icon:'star',    hue:'#ffd23f' },
  { id:'tools',   name:'TOOLS',   code:'tools.sys', icon:'hammer',  hue:'#9fb3c8' },
  { id:'farm',    name:'FARM',    code:'farm.sys',  icon:'seed',    hue:'#7ab648' },
  { id:'hens',    name:'HENS',    code:'hens.sys',  icon:'chick',   hue:'#e8542f' },
  { id:'hatch',   name:'HATCH',   code:'hatch.sys', icon:'egg',     hue:'#f0a422' },
  { id:'gather',  name:'GATHER',  code:'gather.sys',icon:'basket',  hue:'#6ab04c' },
  { id:'market',  name:'MARKET',  code:'mrkt.sys',  icon:'truck',   hue:'#b8862f' },
  { id:'crew',    name:'CREW',    code:'crew.sys',  icon:'hands',   hue:'#9b6bd0' },
  { id:'factory', name:'FACTORY', code:'fact.sys',  icon:'gear',    hue:'#3fa7d6' },
  { id:'love',    name:'LOVE',    code:'love.sys',  icon:'heart',   hue:'#ff5f9e' },
  { id:'decor',   name:'DECOR',   code:'deco.sys',  icon:'tree',    hue:'#4fb8a8' },
];
const MOD_BY_ID = Object.fromEntries(MODULES.map(m => [m.id, m]));
const MOD_INDEX = Object.fromEntries(MODULES.map((m, i) => [m.id, i]));

/* U(...) is an unlock: one level, it opens something. K(...) stacks. */
const U = (id, br, d, pre, name, icon, base, desc) => ({ id, br, d, pre, name, icon, max:1, base, growth:1, desc, kind:'unlock' });
const K = (id, br, d, pre, name, icon, max, base, growth, desc) => ({ id, br, d, pre, name, icon, max, base, growth, desc, kind:'stat' });
const SKILLS = [
  { id:'root', br:'hens', d:0, pre:null, name:'Egg Science', icon:'egg', max:1, base:0, growth:1, desc:'The kernel. It all starts with one egg.', kind:'root' },

  /* ---- TOOLS: what goes on the rack ---- */
  U('feedtool',   'tools', 1, 'root',       'Feed Bag',       'bowl',    2,   'Unlock the FEED tool: scatter pellets so chicks grow and hens lay double'),
  U('hoe',        'tools', 1, 'root',       'The Hoe',        'hoe',     3,   'Unlock the FARM tool and the Till brush: turn grass to soil and sow clover'),
  U('wateringcan','tools', 2, 'hoe',        'Watering Can',   'water',   4,   'Unlock WATER. Nothing grows on dry soil, not one leaf'),
  U('sickle',     'tools', 3, 'wateringcan','Sickle',         'scythe',  5,   'Unlock HARVEST: cut ripe crops into feed pellets'),
  U('buildtool',  'tools', 1, 'root',       'Toolbox',        'hammer',  6,   'Unlock the BUILD tool. The movers come and put things up for you'),
  U('paths',      'tools', 2, 'buildtool',  'Dirt Paths',     'road',    8,   'Unlock the Path brush: the crew walk a quarter faster on it'),
  U('paving',     'tools', 3, 'paths',      'Paving Stones',  'silo',    20,  'Unlock stone paths: the crew fairly skip along them'),
  U('terracing',  'tools', 4, 'paving',     'Terracing',      'house',   55,  'Unlock Raise: bank the ground into grassy terraces'),
  U('digging',    'tools', 5, 'terracing',  'Pond Digging',   'water',   130, 'Unlock Dig Pond: scoop out water wherever you like'),
  U('storeys',    'tools', 3, 'buildtool',  'Second Storey',  'rack',    120, 'Unlock upgrades: LOOK at a building and add a floor for half again its effect'),

  /* ---- FARM: the field starts bare ---- */
  K('farming',    'farm', 1, 'root',       'Green Thumb',    'seed',    6, 3,   1.9, '+15% crop growth speed'),
  U('wheat',      'farm', 2, 'farming',    'Wheat Seed',     'seed',    6,   'Unlock wheat: slow and dependable'),
  K('bumper',     'farm', 2, 'farming',    'Bumper Crop',    'bowl',    6, 8,   2.1, '+20% feed per harvest'),
  U('trough',     'farm', 2, 'farming',    'Feed Trough',    'bowl',    15,  'Unlock the Trough: the flock feeds itself'),
  U('corn',       'farm', 3, 'wheat',      'Corn Seed',      'seed',    12,  'Unlock corn: slow, tall, generous'),
  U('strawberries','farm', 3, 'wheat',     'Strawberry Seed','heart',   14,  'Unlock strawberries: sweet, and they fruit again'),
  U('sprinkler',  'farm', 3, 'bumper',     'Sprinklers',     'spiral',  30,  'Unlock the Sprinkler: keeps a circle watered'),
  U('coopbuild',  'farm', 3, 'trough',     'The Coop',       'house',   40,  'Unlock the Coop: chicks near it grow twice as fast'),
  U('sunflowers', 'farm', 4, 'corn',       'Sunflower Seed', 'sparkle', 45,  'Unlock sunflowers: the richest feed'),
  U('chilis',     'farm', 4, 'corn',       'Chili Seed',     'flame',   40,  'Unlock chilis: a hot, heavy harvest'),
  U('well',       'farm', 4, 'sprinkler',  'The Well',       'spiral',  90,  'Unlock the Well: a wide watered circle'),
  K('hearty',     'farm', 4, 'coopbuild',  'Hearty Feed',    'flame',   5, 60,  2.3, 'chicks need two feeds fewer and 12% less time'),
  U('berries',    'farm', 5, 'sunflowers', 'Berry Bushes',   'heart',   120, 'Unlock berry bushes: they regrow after picking'),
  U('mill',       'farm', 5, 'well',       'The Mill',       'gear',    260, 'Unlock the Mill: +25% feed from every harvest'),
  K('slowbelly',  'farm', 5, 'hearty',     'Slow Bellies',   'heart',   5, 110, 2.3, 'the flock stays full 25% longer'),
  U('harvestbot', 'farm', 6, 'mill',       'Auto Harvest',   'robot',   900, 'ripe crops harvest themselves'),
  U('pumpkins',   'farm', 6, 'berries',    'Pumpkin Seed',   'sparkle', 220, 'Unlock pumpkins: slow as anything, worth the wait'),

  /* ---- HENS ---- */
  K('happy',      'hens', 1, 'root',   'Happy Hens',     'heart',   12, 4,  1.9, '+10% lay speed'),
  K('flock',      'hens', 2, 'happy',  'Bigger Flock',   'house',   10, 10, 2.1, '+4 chicken capacity'),
  K('pets',       'hens', 2, 'happy',  'Pet Therapy',    'hands',   6,  6,  2.2, '-15% pet cooldown'),
  K('golden',     'hens', 3, 'flock',  'Golden Peck',    'sparkle', 6,  25, 2.5, '+3% golden eggs (worth 5x)'),
  K('mutate',     'hens', 3, 'pets',   'Mutation Vats',  'dna',     8,  30, 2.3, '+1.5% egg mutation chance'),
  K('coops',      'hens', 4, 'flock',  'Tower Coops',    'silo',    6,  120,2.6, '+10 chicken capacity'),
  U('genelab',    'hens', 4, 'mutate', 'Gene Lab',       'dna',     90,  'Unlock the Gene Lab: read a hen\'s five genes and edit them'),
  K('rainbow',    'hens', 5, 'coops',  'Rainbow Genome', 'rainbow', 3,  300,5.0, '+15% for mutations to jump 2 tiers'),
  U('splice',     'hens', 5, 'genelab','Splicing',       'flask',   140, 'Splice two hens into one: the best of every gene, one bird'),
  U('clone',      'hens', 5, 'genelab','Cloning',        'twins',   180, 'Clone your best hen, genes and all'),
  U('crossbreed', 'hens', 6, 'splice', 'Crossbreeding',  'atom',    320, 'Cross a hen with a cow, rabbit, peacock, bee or goat'),

  /* ---- HATCH ---- */
  K('warm',       'hatch', 1, 'root',   'Warm Coils',     'flame',   12, 4,  1.9, '+15% incubator speed'),
  K('inccap',     'hatch', 2, 'warm',   'Roomy Racks',    'rack',    6,  20, 2.4, '+3 incubator queue'),
  K('twins',      'hatch', 2, 'warm',   'Twin Yolks',     'twins',   6,  30, 2.4, '+4% twin hatch chance'),
  K('whisper',    'hatch', 3, 'inccap', 'Egg Whisperer',  'feather', 6,  25, 2.3, '+20% feathers from hatching'),
  K('miracle',    'hatch', 3, 'twins',  'Miracle Hatch',  'star',    4,  120,4.0, '+5% hatchling is +1 tier'),
  K('quantum',    'hatch', 4, 'whisper','Quantum Coils',  'atom',    6,  220,2.6, '+30% incubator speed'),
  U('hatchery',   'hatch', 5, 'quantum','Grand Hatchery', 'rack',    900, 'Unlock the Grand Hatchery: 24 eggs, double speed'),

  /* ---- GATHER ---- */
  K('basket1',    'gather', 1, 'root',      'Bigger Basket',  'basket', 6, 3,  2.0, '+8 basket capacity'),
  K('magnet',     'gather', 2, 'basket1',   'Magnet Palm',    'magnet', 6, 8,  2.1, '+12px scoop radius'),
  K('feather1',   'gather', 2, 'basket1',   'Feather Finder', 'feather',6, 10, 2.2, '+3% feathers when scooping eggs'),
  U('feed',       'gather', 3, 'magnet',    'Feeder Role',    'seed',   15,  'Unlock the Feeder role: crew scatter feed for you'),
  K('sweepluck',  'gather', 3, 'feather1',  'Lucky Sweep',    'clover', 5, 30, 2.4, '+2% scooped eggs duplicate'),
  K('feedplus',   'gather', 4, 'feed',      'Tasty Mix',      'bowl',   4, 45, 2.5, 'feed lasts +50% longer'),
  K('basket2',    'gather', 4, 'sweepluck', 'Deep Basket',    'basket2',4, 60, 2.6, '+16 basket capacity'),
  K('plumage',    'gather', 5, 'basket2',   'Plume Press',    'feather',5, 180,2.5, '+25% value from every feather picked up'),

  /* ---- MARKET ---- */
  K('value',      'market', 1, 'root',      'Egg Polish',       'egg',   12, 5,   1.9, '+15% egg sell value'),
  U('logistics',  'market', 1, 'root',      'Logistics',        'truck', 6,   'Unlock the DEPOT: buy vehicles and open routes to richer towns'),
  U('orders',     'market', 2, 'logistics', 'Roadside Orders',  'doc',   10,  'Customers pull up on the road with egg orders. Fill one in time for a bonus'),
  K('truckcap',   'market', 2, 'logistics', 'Bigger Bed',       'truck', 8,  15,  2.2, '+5 truck capacity'),
  K('route',      'market', 2, 'logistics', 'Express Route',    'road',  6,  25,  2.3, 'truck trips 15% faster'),
  U('ledger',     'market', 3, 'orders',    'The Ledger',       'chart', 60,  'Unlock the LEDGER in the Index: a graph of what the company earns'),
  U('silo',       'market', 3, 'truckcap',  'Egg Silo',         'silo',  180, 'Unlock the Silo and the Packer role'),
  K('fullbonus',  'market', 3, 'route',     'Full Load Deal',   'chart', 6,  30,  2.3, '+6% payout for a full truck'),
  U('stocks',     'market', 4, 'ledger',    'Stock Market',     'coin',  400, 'Unlock the market: buy and sell shares in rival egg companies'),
  U('autosend',   'market', 4, 'silo',      'Auto-Dispatch',    'key',   250, 'truck departs by itself when full'),
  K('contracts',  'market', 4, 'fullbonus', 'Premium Contracts','doc',   4,  400, 5.0, '+1% value per species discovered'),
  K('fleet',      'market', 5, 'autosend',  'Second Lorry',     'truck', 3,  1400,3.0, '-25% truck round trip'),
  U('tycoon',     'market', 6, 'fleet',     'Egg Empire',       'crown', 5000,'ALL coin gains x2'),
  U('worldmap',   'market', 6, 'fleet',     'World Map',        'city',  2500,'Unlock the WORLD: open branches in other countries'),
  K('airfreight', 'market', 7, 'worldmap',  'Air Freight',      'wind',  4, 4000, 2.2, '+50% income from every branch abroad'),
  U('moonshot',   'market', 8, 'airfreight','Moonshot',         'atom',  20000,'Unlock the Moon: the last place left to sell eggs'),

  /* ---- CREW: flyers, wages, robots, roles ---- */
  U('hiring',     'crew', 1, 'root',      'Recruiting',     'doc',    12,  'Unlock the Staff Hut, flyers and hiring'),
  K('posters',    'crew', 2, 'hiring',    'Bigger Posters', 'doc',    5, 30,  2.1, '+1 applicant per flyer run'),
  K('wages',      'crew', 2, 'hiring',    'Payroll Deals',  'coin',   6, 30,  2.3, '-12% crew wages'),
  K('crewspeed',  'crew', 2, 'hiring',    'Sturdy Boots',   'wind',   5, 25,  2.2, '+15% crew walking speed'),
  K('agency',     'crew', 3, 'posters',   'Hiring Agency',  'chart',  5, 90,  2.4, '+1 to every stat an applicant rolls'),
  K('overtime',   'crew', 3, 'wages',     'Overtime Pay',   'flame',  5, 70,  2.3, '+25% stamina before a breather'),
  U('cullbot',    'crew', 3, 'crewspeed', 'Cull-Bot',       'remove', 160, 'Assemble Cull-Bots: they retire chickens you mark'),
  U('keeper',     'crew', 4, 'agency',    'Keeper Role',    'hands',  220, 'Hire Keepers: they pet the flock all day long'),
  U('matchbot',   'crew', 4, 'cullbot',   'Match-Bot',      'cupid',  260, 'Assemble Match-Bots: they fill love nests for you'),
  K('crewcap',    'crew', 4, 'overtime',  'Bunkhouse',      'house',  6, 140, 2.4, '+2 crew slots'),
  K('foreman',    'crew', 5, 'keeper',    'Foreman',        'crown',  5, 400, 2.6, '+35% reach on a Technician aura'),
  U('union',      'crew', 6, 'foreman',   'Egg Union',      'star',   3200,'The whole crew works 50% faster'),

  /* ---- FACTORY ---- */
  U('belts',      'factory', 1, 'root',      'Conveyor Tech', 'crate',  20,  'Unlock conveyors, fences and the Technician role'),
  K('beltspeed',  'factory', 2, 'belts',     'Belt Grease',   'oil',    6, 20, 2.2, '+20% belt speed'),
  U('vacuum',     'factory', 2, 'belts',     'Vacuum Bots',   'robot',  80,  'Unlock egg vacuums'),
  U('sorter',     'factory', 3, 'beltspeed', 'Egg Sorter',    'sorter', 140, 'Unlock the Sorter: splits belts by rarity'),
  K('vacradius',  'factory', 3, 'vacuum',    'Wide Suction',  'spiral', 6, 40, 2.2, '+8px vacuum radius'),
  U('splitter',   'factory', 4, 'sorter',    'Belt Splitter', 'sorter', 220, 'Unlock the Splitter: feeds two lines in turn'),
  U('blower',     'factory', 4, 'sorter',    'Air Blower',    'blower', 260, 'Unlock the Blower: herds loose eggs along'),
  K('vacspeed',   'factory', 4, 'vacradius', 'Turbo Pumps',   'wind',   6, 40, 2.2, '+25% vacuum speed'),
  U('loader',     'factory', 5, 'splitter',  'Truck Loader',  'crate',  700, 'Unlock the Loader: belts feed the truck directly'),
  U('polisher',   'factory', 6, 'loader',    'Polishing',     'sparkle',1100,'Unlock the Polisher: belt eggs come out worth half again'),
  U('overclock',  'factory', 6, 'loader',    'Overclock',     'bolt',   1500,'ALL machines run 2x faster'),
  U('grader',     'factory', 7, 'polisher',  'Grading Line',  'star',   2600,'Unlock the Grader: it bumps the odd egg a whole tier'),
  U('dynamo',     'factory', 8, 'grader',    'The Dynamo',    'gear',   5200,'Unlock the Dynamo: drives every machine around it faster'),

  /* ---- LOVE ---- */
  U('court',      'love', 1, 'root',       'Courtship',      'cupid',     15,  'Unlock the LOVE NEST (breed chickens!)'),
  K('candle',     'love', 2, 'court',      'Candlelight',    'candle',    6, 20, 2.3, '+20% breeding speed'),
  K('genes',      'love', 2, 'court',      'Fine Genes',     'flask',     6, 35, 2.5, '+6% bred egg tier-up chance'),
  K('twindate',   'love', 3, 'candle',     'Double Date',    'hearts',    4, 90, 3.0, '+10% breeding lays 2 eggs'),
  K('rainbowegg', 'love', 3, 'genes',      'Rainbow Clutch', 'rainbowegg',4, 250,4.0, '+8% rainbow egg from Divine pairs'),
  U('secretlore', 'love', 4, 'rainbowegg', 'Secret Lore',    'scroll',    1200,'Rainbow eggs hatch 3x faster'),

  /* ---- DECOR ---- */
  U('garden',     'decor', 1, 'root',      'Garden Centre',  'flower',  4,   'Unlock flowers, tufts, clover, bushes and rocks in DECOR'),
  U('trees',      'decor', 2, 'garden',    'Tree Nursery',   'tree',    10,  'Unlock oaks, pines, stumps, mushrooms and reeds'),
  U('furniture',  'decor', 2, 'garden',    'Furniture',      'rack',    14,  'Unlock benches, lamp posts, barrels, birdbaths, scarecrows and more'),
  U('orchard',    'decor', 3, 'trees',     'The Orchard',    'sparkle', 25,  'Unlock apple trees, lavender and sunflowers'),
  U('beehive',    'decor', 3, 'furniture', 'Beekeeping',     'hexcomb', 40,  'Unlock the Beehive: crops near it grow faster, and the honey sells'),
];

const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));
function skillCost(sk, lvl) { return Math.ceil(sk.base * Math.pow(sk.growth, lvl)); }
function skillPrereq(sk) { return sk.pre ? SKILL_BY_ID[sk.pre] : null; }

/* ------------------------------------------------------------
   QUESTS - one chain, start to finish, each goal paying out
   feathers or coins the moment you hit it. goal kinds:
     stat   S.stats[s] >= n         skill  package installed
     soil   tilled tiles >= n        disc   species found >= n
     built  S.built[t] >= n
   `where` is the thing on screen the quest card points at.
   ------------------------------------------------------------ */
const QUESTS = [
  { id:'q_sweep',   name:'Sweep Up Eggs',   icon:'basket', goal:{ k:'stat', s:'collected', n:5 },   rw:{ f:5 },          hint:'Sweep up eggs', where:'mama' },
  { id:'q_sale',    name:'First Sale',      icon:'coin',   goal:{ k:'stat', s:'trips', n:1 },       rw:{ c:30, f:3 },    hint:'Sell at the bike', where:'truck' },
  { id:'q_feedbag', name:'The Feed Bag',    icon:'bowl',   goal:{ k:'skill', id:'feedtool' },        rw:{ c:20 },         hint:'Install Feed Bag', where:'lab' },
  { id:'q_grandma', name:'Feed Grandma',    icon:'crown',  goal:{ k:'stat', s:'mamaFed', n:1 },     rw:{ f:4 },          hint:'Feed Mama', where:'mama' },
  { id:'q_hatch',   name:'Hatch A Chick',   icon:'egg',    goal:{ k:'stat', s:'hatched', n:1 },     rw:{ f:6 },          hint:'Hatch an egg', where:'inc' },
  { id:'q_hoe',     name:'The Hoe',         icon:'hoe',    goal:{ k:'skill', id:'hoe' },             rw:{ c:15 },         hint:'Install The Hoe', where:'lab' },
  { id:'q_till',    name:'Till The Field',  icon:'hoe',    goal:{ k:'soil', n:6 },                   rw:{ c:12 },         hint:'Till 6 tiles', where:'field' },
  { id:'q_water',   name:'Sow And Water',   icon:'water',  goal:{ k:'stat', s:'watered', n:3 },     rw:{ f:5 },          hint:'Plant and water', where:'field' },
  { id:'q_harvest', name:'First Harvest',   icon:'scythe', goal:{ k:'stat', s:'harvested', n:1 },   rw:{ f:8, c:20 },    hint:'Harvest a crop', where:'field' },
  { id:'q_grown',   name:'Raise A Hen',     icon:'chick',  goal:{ k:'stat', s:'grown', n:1 },       rw:{ c:40 },         hint:'Raise a chick', where:'mama' },
  { id:'q_toolbox', name:'The Toolbox',     icon:'hammer', goal:{ k:'skill', id:'buildtool' },       rw:{ c:60 },         hint:'Install Toolbox', where:'lab' },
  { id:'q_build',   name:'Break Ground',    icon:'house',  goal:{ k:'stat', s:'builtN', n:1 },      rw:{ f:8 },          hint:'Build something', where:'field' },
  { id:'q_depot',   name:'Open The Depot',  icon:'truck',  goal:{ k:'skill', id:'logistics' },       rw:{ c:80 },         hint:'Install Logistics', where:'lab' },
  { id:'q_order',   name:'Roadside Order',  icon:'doc',    goal:{ k:'stat', s:'orders', n:1 },      rw:{ f:15 },         hint:'Fill an order', where:'road' },
  { id:'q_hire',    name:'Hire A Hand',     icon:'hands',  goal:{ k:'stat', s:'hired', n:1 },       rw:{ c:120 },        hint:'Hire someone', where:'lab' },
  { id:'q_eight',   name:'Eight Species',   icon:'book',   goal:{ k:'disc', n:8 },                   rw:{ f:30 },         hint:'Find 8 species', where:'inc' },
  { id:'q_belts',   name:'Belt Line',       icon:'crate',  goal:{ k:'built', t:'belt', n:4 },        rw:{ c:250 },        hint:'Build 4 belts', where:'field' },
  { id:'q_genes',   name:'Gene Editor',     icon:'dna',    goal:{ k:'stat', s:'edits', n:1 },       rw:{ f:60 },         hint:'Edit a gene', where:'field' },
  { id:'q_storey',  name:'Second Storey',   icon:'rack',   goal:{ k:'stat', s:'storeys', n:1 },     rw:{ c:400 },        hint:'Add a floor', where:'field' },
  { id:'q_regulars',name:'Regulars',        icon:'doc',    goal:{ k:'stat', s:'orders', n:5 },      rw:{ c:300 },        hint:'Fill 5 orders', where:'road' },
  { id:'q_land',    name:'More Land',       icon:'house',  goal:{ k:'plots', n:3 },                  rw:{ f:80 },         hint:'Own 3 plots', where:'field' },
  { id:'q_flock',   name:'A Real Flock',    icon:'chick',  goal:{ k:'flock', n:20 },                 rw:{ c:600 },        hint:'Keep 20 hens', where:'mama' },
  { id:'q_fingers', name:'Green Fingers',   icon:'sprout', goal:{ k:'stat', s:'harvested', n:25 },  rw:{ f:60 },         hint:'Harvest 25 crops', where:'field' },
  { id:'q_tenk',    name:'Ten Thousand',    icon:'chart',  goal:{ k:'stat', s:'coinsEarned', n:10000 }, rw:{ f:120 },    hint:'Earn 10,000 coins', where:'truck' },
  { id:'q_public',  name:'Go Public',       icon:'star',   goal:{ k:'skill', id:'stocks' },          rw:{ c:2000 },       hint:'Go public', where:'lab' },
  { id:'q_abroad',  name:'Go Abroad',       icon:'city',   goal:{ k:'regions', n:1 },                rw:{ f:200 },        hint:'Open a country', where:'lab' },
  { id:'q_branches',name:'Ten Branches',    icon:'house',  goal:{ k:'stat', s:'branches', n:10 },   rw:{ c:50000 },      hint:'Build 10 branches', where:'lab' },
  { id:'q_moon',    name:'The Moon',        icon:'atom',   goal:{ k:'region', id:'moon' },           rw:{ f:2000 },       hint:'Reach the Moon', where:'lab' },
];
const QUEST_BY_ID = Object.fromEntries(QUESTS.map(q => [q.id, q]));

/* ------------------------------------------------------------
   GRID LAYOUT - the map is a board of square nodes. Each module
   is a horizontal lane; a node's column is its depth; within a
   lane rows are packed like a tidy tree (a parent sits level with
   the middle of its children). The kernel is column 0, top-left,
   with a trunk running down the left edge into every lane. The
   QUESTS lane zigzags two rows deep so the chain stays compact.
   ------------------------------------------------------------ */
const LANE_ROWS = 2;   /* rows the quest lane takes */
const GRID = (() => {
  const pos = {}, lanes = [];
  let row = 0;
  /* quests: two rows, snaking */
  lanes.push({ id:'quests', top: row, rows: 2 });
  QUESTS.forEach((q, i) => { pos[q.id] = { col: 1 + Math.floor(i / 2), row: row + (i % 2), quest: true }; });
  row += 2;
  /* the kernel on its own row, then every module in order */
  pos.root = { col: 0, row: row };
  const children = id => SKILLS.filter(sk => sk.pre === id);
  MODULES.forEach(m => {
    if (m.id === 'quests') return;
    const top = row;
    let next = row;
    const place = sk => {
      const kids = children(sk.id).filter(k => k.br === m.id);
      if (!kids.length) { pos[sk.id] = { col: sk.d, row: next++ }; return; }
      kids.forEach(place);
      const rs = kids.map(k => pos[k.id].row);
      const mid = Math.floor((Math.min(...rs) + Math.max(...rs)) / 2);
      /* a parent may not share a row with a sibling in its own column */
      let r2 = mid;
      while (Object.values(pos).some(p => p.col === sk.d && p.row === r2 && p.lane === m.id)) r2++;
      pos[sk.id] = { col: sk.d, row: r2 };
      next = Math.max(next, r2 + 1);
    };
    SKILLS.filter(sk => sk.br === m.id && sk.pre === 'root').forEach(place);
    /* tag the lane on every node placed */
    SKILLS.filter(sk => sk.br === m.id && sk.id !== 'root').forEach(sk => { pos[sk.id].lane = m.id; });
    lanes.push({ id: m.id, top, rows: Math.max(1, next - top) });
    row = next;
  });
  return { pos, lanes, rows: row };
})();
const GRID_POS = GRID.pos;

/* modules keep their packages in dependency order */
const SKILLS_BY_MODULE = MODULES.map(m =>
  SKILLS.filter(sk => sk.br === m.id && sk.id !== 'root').sort((a, b) => a.d - b.d || a.name.localeCompare(b.name)));
