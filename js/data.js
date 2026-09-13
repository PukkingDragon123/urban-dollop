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
  { n:'Prehistoric', c:'#8a6a3a' }, /* fossil-only: the Time Machine brings them back */
  { n:'Celestial', c:'#5fd0ff' },   /* moon-only: hatch from eggs the Moon branch sends home */
];
/* the tiers that the rest of the game reasons about by name */
const TIER_DIVINE = 7, TIER_SECRET = 8, TIER_DINO = 9, TIER_MOON = 10;

/* pale egg shell colors per tier (spots use TIERS[t].c) */
const EGG_SHELL = ['#f8efe0','#dcf2c8','#cfe9fb','#ead4f8','#ffe4b8','#ffd3dc','#d3ccf8','#fff1c4','#fff0fa','#c9b89a','#e8f6ff'];

/* how many species live in each tier — totals 128 */
const TIER_COUNTS = [18,16,14,13,12,10,9,8,12,10,6];

/* ------------------------------------------------------------
   RANKS - every hen earns stars for the eggs she lays. Each star
   is worth a little more speed and value once Pecking Order is
   installed; a Champion draws a crowd at the park.
   ------------------------------------------------------------ */
const RANKS = [
  { n:'Rookie',   eggs:0,   col:'#a09a8f' },
  { n:'Layer',    eggs:20,  col:'#8fd14f' },
  { n:'Veteran',  eggs:60,  col:'#3fa7d6' },
  { n:'Elite',    eggs:150, col:'#b06ee0' },
  { n:'Champion', eggs:400, col:'#ffd23f' },
];

const ECON = {
  /* the price curve flattens past Secret: a dinosaur egg is a fortune, not the economy */
  eggValue: t => t <= 8 ? 5 * Math.pow(5, t) : t === 9 ? 3e6 : 8e6,
  layTime:  t => 22 * Math.pow(1.5, Math.min(t, 9)),   // seconds between eggs per chicken
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
  mamaHunger: 260,         // seconds a full grandma keeps laying before she wants feeding
  mamaPellets: 5,          // pellets that fill her right back up
  mamaPetCost: 0.5,        // pellets a pet costs her, against a whole one before
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
  billboardPull: 0.40,     // how much one billboard cuts the wait between customers
  billboardPay: 0.07,      // and what it adds to what they pay
  billboardArt: 0.5,       // a poster you painted yourself counts half again
  orderEvery: 70,          // seconds between customers pulling up
  orderTime: 150,          // seconds a customer waits
  orderPay: 2.4,           // what an order pays per egg, against the sell value
  orderTip: 3,             // feathers tipped for a filled order
  maxOrders: 2,            // cars that fit in the lay-by
  carEvery: 3.4,           // seconds between passing cars, give or take
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
  newsEvery: 190,          // seconds between editions of the Chronicle
  staffTireless: 90,       // seconds of work before a worker wants a breather
  staffRest: 14,           // seconds of breather at a hut
  techAuraR: 58,           // px a Technician's speed aura reaches
  pathSpeed: 1.25,         // how much faster the crew walk on a path
  stoneSpeed: 1.45,
  decoRefund: 0.5,         // what you get back for lifting a decoration
  loaderRate: 0.35,        // seconds per egg a Loader pushes into the truck
  hatcheryCap: 24,         // eggs a Grand Hatchery holds
  rankLay: 0.06,           // lay speed per rank star, once Pecking Order is installed
  rankValue: 0.06,         // egg value per rank star
  kitchenPantry: 24,       // eggs a kitchen keeps in the larder
  kitchenCounter: 8,       // dishes that fit on the counter
  dinerEvery: 16,          // seconds between walk-up diners while there is food
  parkSlots: 4,            // exhibits in a park (six with a second floor)
  parkBusEvery: 32,        // seconds between tour buses
  ticketBase: 4,           // coins per visitor per point of appeal
  parkWatch: 9,            // seconds a visitor spends gawping
  fossilChance: 0.012,     // odds a freshly dug pond cell turns up a fossil
  dinoFossils: 3,          // fossils the Time Machine burns per dinosaur
  dinoTime: 240,           // seconds the Time Machine counts down
  moonEggEvery: 300,       // seconds between eggs the Moon branch sends home
  ageBonus: 0.08,          // coin gains per age reached
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
  carrot: { name:'Carrot',    grow:120, yield:6,  seed:6,  col:'#f0872f', stages:4, needs:'carrots',
            desc:'Quick, crunchy and orange.' },
  potato: { name:'Potato',    grow:170, yield:10, seed:9,  col:'#c9a35f', stages:4, needs:'potatoes',
            desc:'Humble. Fills a barn.' },
  tomato: { name:'Tomato',    grow:200, yield:12, seed:14, col:'#e8402f', stages:4, needs:'tomatoes', regrow:true,
            desc:'Fruits again and again on the vine.' },
  cabbage:{ name:'Cabbage',   grow:230, yield:16, seed:18, col:'#8fd14f', stages:4, needs:'cabbages',
            desc:'A big green head of feed.' },
  melon:  { name:'Watermelon',grow:380, yield:28, seed:40, col:'#3f9a4f', stages:4, needs:'melons',
            desc:'Green outside, red inside, the founder\'s favourite.' },
  rice:   { name:'Rice',      grow:300, yield:20, seed:26, col:'#e8dcb0', stages:4, needs:'rice',
            desc:'Wants water. Gives plenty.' },
};
/* what a harvest leaves in the pantry besides feed pellets */
const PRODUCE = {
  wheat:        { name:'Wheat',        val:6,  col:'#e8c458', crop:'wheat' },
  corn:         { name:'Corn',         val:12, col:'#f2d24c', crop:'corn' },
  sunseeds:     { name:'Sunseeds',     val:18, col:'#f0a422', crop:'sunseed' },
  berries:      { name:'Berries',      val:10, col:'#c94a6a', crop:'berry' },
  strawberries: { name:'Strawberries', val:12, col:'#e8324a', crop:'strawberry' },
  chilis:       { name:'Chilis',       val:14, col:'#e8402f', crop:'chili' },
  pumpkin:      { name:'Pumpkin',      val:40, col:'#f0a422', crop:'pumpkin' },
  carrots:      { name:'Carrots',      val:5,  col:'#f0872f', crop:'carrot' },
  potatoes:     { name:'Potatoes',     val:8,  col:'#c9a35f', crop:'potato' },
  tomatoes:     { name:'Tomatoes',     val:9,  col:'#e8402f', crop:'tomato' },
  cabbage:      { name:'Cabbage',      val:11, col:'#8fd14f', crop:'cabbage' },
  melon:        { name:'Watermelon',   val:30, col:'#3f9a4f', crop:'melon' },
  rice:         { name:'Rice',         val:15, col:'#e8dcb0', crop:'rice' },
};
const PRODUCE_KEYS = Object.keys(PRODUCE);
const PRODUCE_BY_CROP = Object.fromEntries(PRODUCE_KEYS.map(k => [PRODUCE[k].crop, k]));
/* the Cannery turns produce into goods worth far more than the sum of it */
const GOODS = {
  flour:    { name:'Flour',        val:30,  col:'#fff3d6', icon:'bowl',   time:30, need:{ wheat:3 } },
  popcorn:  { name:'Popcorn',      val:42,  col:'#fff8ec', icon:'sparkle',time:25, need:{ corn:2 } },
  jam:      { name:'Berry Jam',    val:58,  col:'#b02a4a', icon:'heart',  time:40, need:{ berries:2, strawberries:1 } },
  hotsauce: { name:'Hot Sauce',    val:84,  col:'#d92f1f', icon:'flame',  time:45, need:{ chilis:3, tomatoes:1 } },
  chips:    { name:'Crisps',       val:40,  col:'#f2c94c', icon:'crate',  time:30, need:{ potatoes:3 } },
  slaw:     { name:'Coleslaw',     val:52,  col:'#c8f0a0', icon:'sprout', time:30, need:{ cabbage:2, carrots:2 } },
  juice:    { name:'Melon Juice',  val:66,  col:'#ff6b7a', icon:'water',  time:25, need:{ melon:1 } },
  ricecake: { name:'Rice Cakes',   val:72,  col:'#f6efe0', icon:'cake',   time:40, need:{ rice:3 } },
  pie:      { name:'Pumpkin Pie',  val:130, col:'#e09a3f', icon:'pan',    time:60, need:{ pumpkin:1, wheat:2 } },
  superfeed:{ name:'Super Feed',   val:0,   col:'#ffd23f', icon:'seed',   time:20, need:{ corn:1, sunseeds:1 }, feed:24,
              desc:'Twenty-four premium pellets: a hen fed on them lays double for three times as long.' },
};
const GOODS_KEYS = Object.keys(GOODS);
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
  { id:'empire',  name:'EMPIRE',  icon:'crown' },
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
  compost:   { name:'Compost Heap', sec:'farm', w:1, h:1, base:90, growth:1.5, refund:35,
               desc:'A steaming heap of muck. Bugs breed in it and crawl out for the hens to chase.', needs:'compost' },
  wormfarm:  { name:'Worm Farm', sec:'farm', w:2, h:1, base:600, growth:1.7, refund:240,
               desc:'Stacked crates of worms. Fills the bug jar by itself, and a full jar feeds the whole flock.', needs:'wormfarm' },
  beehive:   { name:'Beehive', sec:'farm', w:1, h:1, base:220, growth:1.5, refund:90,
               desc:'Bees pollinate every crop nearby so it grows faster, and drip honey you can sell.', needs:'beehive' },
  genelab:   { name:'Gene Lab', sec:'ranch', w:2, h:2, base:1500, growth:2.0, refund:600,
               desc:'Read a hen\'s genes, splice two birds into one, clone the best, cross in animal traits.', needs:'genelab' },
  kitchen:   { name:'Kitchen', sec:'empire', w:2, h:2, base:900, growth:1.9, refund:350,
               desc:'Eggs go in, dishes come out, and diners walk up to pay for them. Drop a hen on it for a roast.', needs:'kitchen' },
  park:      { name:'Chicken Park', sec:'empire', w:3, h:3, base:4000, growth:2.0, refund:1600,
               desc:'Put your finest hens on show. Tour buses bring visitors who pay at the gate.', needs:'park' },
  timemachine: { name:'Time Machine', sec:'empire', w:2, h:2, base:250000, growth:2.5, refund:100000,
               desc:'Three fossils in, one dinosaur out, sixty-five million years later.', needs:'timemachine' },
  hr:        { name:'HR Office', sec:'crew', w:2, h:2, base:520, growth:2.0, refund:200,
               desc:'A security room: a wall of cameras on every worker. Inspect, train, hire and fire from one chair.', needs:'hiring' },
  cannery:   { name:'Cannery', sec:'farm', w:2, h:2, base:700, growth:1.8, refund:280,
               desc:'Turns pantry produce into jam, flour, crisps and pie worth far more than the harvest.', needs:'processing' },
  board:     { name:'Noticeboard', sec:'crew', w:1, h:1, base:40, growth:1.4, refund:15,
               desc:'Where flyers get pinned. Applicants walk up to it and wait.', needs:'hiring' },
  billboard: { name:'Billboard', sec:'empire', w:2, h:2, base:300, growth:1.7, refund:120,
               desc:'A hoarding by the road. Paint your own poster; more customers pull in.', needs:'billboard' },
  belt:      { name:'Conveyor',  sec:'factory', w:1, h:1, base:15, growth:1, refund:7,
               desc:'Carries eggs to the truck, a silo or an incubator.', needs:'belts' },
  fence:     { name:'Fence',     sec:'ranch', w:1, h:1, base:10, growth:1, refund:5,
               desc:'Chickens will not cross it. Pen them where you want them.', needs:'belts' },
};

/* ------------------------------------------------------------
   THE ANIMAL CREW - nobody who walks up the drive is a person.
   Every one of them is another species, drawn on the founder's own
   frame at crew size, and each is naturally good at one thing: it
   lands as a bonus on that stat when they roll.
   ------------------------------------------------------------ */
const CREW_ANIMALS = [
  { id:'fox',     name:'Fox',     stat:'speed', line:'Quick on her feet and quicker with an excuse.' },
  { id:'badger',  name:'Badger',  stat:'carry', line:'Digs like a machine, carries like two. Will not be hurried.' },
  { id:'possum',  name:'Possum',  stat:'care',  line:'Gentle with the birds. Plays dead in a crisis.' },
  { id:'cat',     name:'Cat',     stat:'tech',  line:'Sits on the warm machines until they behave.' },
  { id:'otter',   name:'Otter',   stat:'grit',  line:'Never tires, never dry, always cheerful.' },
  { id:'hare',    name:'Hare',    stat:'speed', line:'Covers the whole ranch before you have your boots on.' },
  { id:'raccoon', name:'Raccoon', stat:'tech',  line:'One of the family. Watch the till.' },
];
const CREW_ANIMAL_BY_ID = Object.fromEntries(CREW_ANIMALS.map(a => [a.id, a]));
/* animal hires get their own names */
const ANIMAL_NAMES = ['BRUSH', 'BRAMBLE', 'PIP', 'NUTMEG', 'SORREL', 'BADGE', 'MOSS', 'CLOVER',
                      'RUSTY', 'WILLOW', 'FLINT', 'HAZEL', 'TUFT', 'BURROW', 'SCRUFF', 'THISTLE',
                      'ACORN', 'JUNIPER', 'SMUDGE', 'BRACKEN'];

/* ------------------------------------------------------------
   PASSERS-BY - the road is not only cars. Livestock gets loose,
   a badger walks its dog past the gate, and now and then somebody
   pulls over to gawp at the ranch and say something about it.
   `critter` picks a four-legged sprite, `folk` one of the upright
   ones - a species by name, or true for any of them - `bot` makes
   that a droid, and `pet` trails an animal behind on a lead.
   ------------------------------------------------------------ */
const PASSERS = [
  { id:'cow',     critter:'cow',   v:11, w:0.9, stop:0.5,  path:'verge', name:'A Loose Cow',
    says:['MOO.', 'MOOOO.', 'MOO?'] },
  { id:'sheep',   critter:'sheep', v:14, w:1.0, stop:0.35, path:'verge', name:'A Sheep',
    says:['BAA.', 'BAAAA.', 'BAA. BAA.'] },
  { id:'pig',     critter:'pig',   v:16, w:0.8, stop:0.4,  path:'verge', name:'A Pig',
    says:['OINK.', 'SNRRRK.', 'OINK OINK.'] },
  { id:'goat',    critter:'goat',  v:19, w:0.8, stop:0.45, path:'verge', name:'A Goat',
    says:['BLEAT!', 'MEHHH.', 'IS THAT FENCE EDIBLE?'] },
  { id:'ducks',   critter:'duck',  v:13, w:0.7, stop:0.25, path:'verge', name:'Ducks', line:3,
    says:['QUACK.', 'QUACK QUACK QUACK.', 'QUACK?'] },
  /* the ones that walk upright are folk, not people: a species on the
     founder's frame, or a droid out for a roll. `folk` names the
     species it is always drawn as; leave it off for a random one. */
  { id:'walker',  folk:'badger', pet:'dog', v:22, w:1.2, stop:0.4, path:'verge', name:'A Badger and a Dog' },
  { id:'shepherd',folk:'otter', pet:'sheep', v:18, w:0.6, stop:0.3, path:'verge', name:'An Otter and a Sheep' },
  { id:'jogger',  folk:'hare',  v:38, w:0.8, stop:0.12, path:'verge', name:'A Hare in a Hurry' },
  { id:'stroll',  folk:true,    v:20, w:1.1, stop:0.55, path:'verge', name:'Somebody Passing' },
  { id:'droid',   folk:true, bot:true, v:26, w:0.9, stop:0.35, path:'verge', name:'A Delivery Droid',
    says:['BEEP.', 'PARCEL FOR A HEN?', 'SCANNING. NICE FENCE.', 'BOOP. GOOD DAY.'] },
];
/* what the folk say when they stop and stare over the fence; the
   livestock have their own noises, up in PASSERS */
const PASSER_LINES = [
  'IS THAT A RACCOON IN A SUIT?',
  'HE HAS A LOGO. A LOGO!',
  'MY AUNT BUYS THESE EGGS.',
  'SMELLS LIKE MONEY. AND HENS.',
  'THAT ONE IS LOOKING AT ME.',
  'ARE THE BROWN ONES DEARER?',
  'I READ ABOUT THIS PLACE.',
  'GOOD MORNING, CHICKENS.',
  'MY DOG WANTS A WORD WITH THAT HEN.',
  'IS THE FARM SHOP OPEN?',
  'HOW MANY EGGS IS THAT, THEN?',
  'THEY SAY HE STARTED WITH ONE HEN.',
  'THAT IS A LOT OF FENCE.',
  'I COULD DO THIS. I COULD.',
  'THE DOG HAS NEVER SEEN A HEN IN A HAT.',
  'IS HE HIRING? ASKING FOR ME.',
  'THAT FENCE WENT UP WITHOUT PLANNING.',
  'ALL THAT, AND HE STILL PARKS ON THE VERGE.',
  'PRODUCTIVITY, THEY CALL IT. IT IS HENS.',
  'HE HAS A MISSION STATEMENT. FOR CHICKENS.',
  'FIRST IT IS EGGS. THEN IT IS THE WATER RIGHTS.',
  'MY COUSIN APPLIED. THEY ASKED HIS STAT LINE.',
  'SOMEBODY IS GETTING A GRANT FOR THIS.',
  'I VOTED FOR THE OTHER RACCOON.',
];
/* and what a driver says when they pull over for a look */
const PULLOVER_LINES = [
  'JUST A QUICK LOOK, LOVE.',
  'THAT IS THE PLACE FROM THE RADIO.',
  'SIX DOZEN, IF THEY HAVE THEM.',
  'PULL IN, PULL IN - LOOK AT THE HENS!',
  'IS HE HIRING, DO YOU RECKON?',
  'I AM GOING TO BUY A HEN.',
  'THAT RACCOON IS DOING BETTER THAN US.',
  'TAKE A PHOTO. NOBODY WILL BELIEVE IT.',
  'ARE WE STOPPING? WE ARE STOPPING.',
  'IT WAS A FIELD LAST YEAR!',
  'HE HAS A SUPPLY CHAIN. IN A FIELD.',
  'THE COUNCIL WANTS A WORD ABOUT THAT SIGN.',
  'VERTICAL INTEGRATION, THEY CALL IT. IT IS A SHED.',
  'THAT IS WHAT DEREGULATION LOOKS LIKE.',
  'MY BROTHER-IN-LAW IS ON THE PLANNING COMMITTEE.',
  'IS THAT A UNION? THAT IS A QUEUE FOR FEED.',
  'HE PAYS IN FEATHERS. IS THAT LEGAL?',
  'SOMEBODY SHOULD REGULATE THE RACCOON.',
  'THEY SAY HE LOBBIES. IN A TOP HAT.',
  'TAX BREAK, THAT IS. HAS TO BE.',
];

/* ------------------------------------------------------------
   BUGS - what lives in the soil. Dig them up with the spade,
   pick them up by hand, or let a hen find one herself: a bug is
   the best thing a chicken can eat, worth several pellets of
   feed and a spell of laying twice as fast.
   `find` weights what the spade turns up; the rarer the bug the
   more it fills a bird and the more the jar is worth.
   ------------------------------------------------------------ */
const BUGS = {
  worm:    { name:'Earthworm', icon:'worm',   col:'#e0918f', dark:'#a8666c', find:34, food:0.22, buff:14, value:2,
             desc:'Comes up on its own in the rain. A hen will cross a field for one.' },
  grub:    { name:'Fat Grub',  icon:'grub',   col:'#f2e2b8', dark:'#c9b184', find:24, food:0.34, buff:20, value:4,
             desc:'Curled up under the turf, doing nothing useful. Now it is protein.' },
  beetle:  { name:'Beetle',    icon:'beetle', col:'#5f7f52', dark:'#37502f', find:20, food:0.28, buff:16, value:5,
             desc:'Shiny, indignant, and quicker than it looks.' },
  cricket: { name:'Cricket',   col:'#8fb36a', icon:'cricket', dark:'#5f7f3f', find:15, food:0.26, buff:22, value:7,
             desc:'Hops twice as far as it walks. The chicks love the chase.' },
  snail:   { name:'Snail',     icon:'snail',  col:'#d9b877', dark:'#8a6a3a', find:7,  food:0.4,  buff:26, value:11,
             desc:'Carries its own house, in no hurry whatsoever.' },
};
const BUG_KEYS = Object.keys(BUGS);
const BUG_FIND_TOTAL = BUG_KEYS.reduce((t, k) => t + BUGS[k].find, 0);

/* ------------------------------------------------------------
   BILLBOARDS - a poster is a grid of fat pixels, each cell an
   index into this palette. 0 is the bare board.
   ------------------------------------------------------------ */
const BILL_COLS = ['#e8dcc0', '#fff8ec', '#2e2216', '#ffd23f', '#f0a422', '#e8542f',
                   '#ff5f9e', '#6ab04c', '#3fa7d6', '#7fe8d0', '#b06ee0', '#8a5e2a'];
const BILL_PRESETS = [
  { id:'eggs',  name:'FRESH EGGS' },
  { id:'sale',  name:'BIG SALE' },
  { id:'hen',   name:'OUR HENS' },
  { id:'brand', name:'THE COMPANY' },
  { id:'blank', name:'BLANK BOARD' },
];

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
/* the paint and trim are picked together: one row of liveries instead of
   two rows of swatches, because nobody wants to choose twice */
const BRAND_PAIRS = [
  ['#e8542f', '#ffd23f'],  ['#f0a422', '#2e2216'],  ['#ffd23f', '#e8542f'],
  ['#6ab04c', '#fff8ec'],  ['#3fa7d6', '#ffd23f'],  ['#2f5f9e', '#fff8ec'],
  ['#b06ee0', '#ffd23f'],  ['#ff5f9e', '#fff8ec'],  ['#fff8ec', '#e8542f'],
  ['#2e2216', '#ffd23f'],  ['#8a5e2a', '#e0bd82'],  ['#4fb8a8', '#2e2216'],
];

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
  { id:'valley',       name:'Cluckton Valley', flag:['#6ab04c', '#ffd23f'], lat:22,  lon:0,    size:26, land:'green', cost:0,     branchBase:0,      cap:0,  yield:0,    home:true, blurb:'Home. The ranch itself.' },
  { id:'featherland',  name:'Featherland',     flag:['#3fa7d6', '#fff8ec'], lat:56,  lon:-46,  size:22, land:'cold',  cost:8000,  branchBase:3000,   cap:4,  yield:24,   blurb:'Cold, tidy, mad for eggs.' },
  { id:'yolkshire',    name:'Yolkshire',       flag:['#e8542f', '#fff8ec'], lat:46,  lon:38,   size:20, land:'green', cost:20000, branchBase:6000,   cap:5,  yield:40,   blurb:'Tea, rain and a boiled egg.' },
  { id:'shellvador',   name:'Shellvador',      flag:['#ffd23f', '#6ab04c'], lat:-14, lon:-28,  size:24, land:'lush',  cost:45000, branchBase:12000,  cap:5,  yield:70,   blurb:'Sun all year. Hens lay double.' },
  { id:'eggypt',       name:'Eggypt',          flag:['#f0a422', '#2e2216'], lat:22,  lon:74,   size:24, land:'sand',  cost:90000, branchBase:22000,  cap:6,  yield:120,  blurb:'Pyramids of eggs, literally.' },
  { id:'cluckistan',   name:'Cluckistan',      flag:['#b06ee0', '#ffd23f'], lat:40,  lon:118,  size:26, land:'high',  cost:180000,branchBase:40000,  cap:6,  yield:200,  blurb:'High plains. Very large hens.' },
  { id:'peckoslovakia',name:'Peckoslovakia',   flag:['#ff5f9e', '#fff8ec'], lat:52,  lon:164,  size:18, land:'green', cost:320000,branchBase:70000,  cap:6,  yield:320,  blurb:'The egg opera capital.' },
  { id:'coopisland',   name:'Coop Island',     flag:['#4fb8a8', '#fff8ec'], lat:-30, lon:-124, size:11, land:'lush',  cost:650000,branchBase:130000, cap:8,  yield:520,  blurb:'An island shaped like a hen.' },
  { id:'henmark',      name:'Henmark',         flag:['#e8324a', '#fff8ec'], lat:68,  lon:-150, size:20, land:'cold',  cost:1.2e6, branchBase:250000, cap:8,  yield:850,  blurb:'Designer eggs. Very dear.' },
  { id:'moon',         name:'The Moon',        flag:['#c9ced6', '#2e2216'], lat:0,   lon:0,    size:0,  land:'moon',  cost:8e6,   branchBase:2e6,    cap:10, yield:6000, moon:true, blurb:'No air. No foxes. Eggs float.' },
];
const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]));

/* ------------------------------------------------------------
   AGES - the company grows through six eras. Each one is reached
   by milestones, tints the valley its own way, adds a little to
   every coin earned, and opens a lane of the research board.
   ------------------------------------------------------------ */
const AGES = [
  { id:'straw',    name:'Straw Age',    icon:'seed',   hue:'#c9a35f', tint:null,                   blurb:'One hen, one field, one bicycle.',
    need:{} },
  { id:'iron',     name:'Iron Age',     icon:'hammer', hue:'#9fb3c8', tint:'rgba(70,80,100,.07)',   blurb:'Tools, sheds and the first machines.',
    need:{ hatched:5, coinsEarned:600, builtN:2 } },
  { id:'steam',    name:'Steam Age',    icon:'gear',   hue:'#c98f3f', tint:'rgba(150,95,40,.09)',   blurb:'Boilers, belts and a kitchen full of steam.',
    need:{ disc:14, coinsEarned:15000, hired:1, builtN:8 } },
  { id:'electric', name:'Electric Age', icon:'bolt',   hue:'#ffd23f', tint:'rgba(255,225,130,.07)', blurb:'Lamps in the windows and crowds at the gate.',
    need:{ disc:30, coinsEarned:250000, orders:10, belts:8 } },
  { id:'space',    name:'Space Age',    icon:'atom',   hue:'#5fd0ff', tint:'rgba(70,110,200,.09)',  blurb:'Branches abroad and a rocket on the pad.',
    need:{ disc:50, coinsEarned:5e6, regions:1 } },
  { id:'jurassic', name:'Jurassic Age', icon:'dino',   hue:'#6a8a3a', tint:'rgba(60,120,40,.11)',   blurb:'The company bought a time machine.',
    need:{ disc:70, coinsEarned:6e7, moon:true } },
];
const AGE_INDEX = Object.fromEntries(AGES.map((a, i) => [a.id, i]));
/* what each requirement key is called on the age's card */
const AGE_NEED_NAMES = { hatched:'eggs hatched', coinsEarned:'coins earned', builtN:'things built', disc:'species found',
                         hired:'crew hired', orders:'orders filled', belts:'belts laid', regions:'countries opened', moon:'the Moon opened' };

/* ------------------------------------------------------------
   SECRETS - things the game never tells you to do. Each one pays
   out once, the moment it happens, and gets its page in the Index.
   ------------------------------------------------------------ */
const SECRETS = [
  { id:'nightowl',   name:'Night Owl',           icon:'clock',   rw:{ f:20 },   desc:'Ran the ranch between midnight and five.' },
  { id:'eggtower',   name:'Egg Tower',           icon:'egg',     rw:{ f:25 },   desc:'A hundred eggs on the grass at once.' },
  { id:'goldrush',   name:'Gold Rush',           icon:'sparkle', rw:{ c:500 },  desc:'Three golden eggs in one sweep of the basket.' },
  { id:'rainbow',    name:'Rainbow Connection',  icon:'rainbow', rw:{ f:100 },  desc:'Hatched a rainbow egg.' },
  { id:'moonname',   name:'Moon Unit',           icon:'moon',    rw:{ f:30 },   desc:'Named the company after the Moon.' },
  { id:'petfan',     name:'Grandma\'s Favourite', icon:'crown',  rw:{ f:40 },   desc:'Petted Mama a hundred times.' },
  { id:'vanmover',   name:'Tip The Movers',      icon:'car',     rw:{ c:200 },  desc:'Tapped the movers\' van while they worked.' },
  { id:'fossil',     name:'Bone Digger',         icon:'fossil',  rw:{ f:60 },   desc:'Dug up a fossil.' },
  { id:'butterfly',  name:'Butterfly Catcher',   icon:'heart',   rw:{ f:15 },   desc:'Tapped a butterfly on the wing.' },
  { id:'fullhouse',  name:'Full House',          icon:'house',   rw:{ c:300 },  desc:'Filled the ranch to capacity.' },
  { id:'longhaul',   name:'Long Haul',           icon:'road',    rw:{ f:50 },   desc:'A whole hour on the ranch in one sitting.' },
  { id:'soaked',     name:'Soaked',              icon:'water',   rw:{ f:30 },   desc:'Stood through five showers.' },
  { id:'moonwalk',   name:'One Small Peck',      icon:'atom',    rw:{ f:500 },  desc:'Opened the Moon.' },
  { id:'dinopet',    name:'Clever Girl',         icon:'dino',    rw:{ f:300 },  desc:'Petted a dinosaur and kept every finger.' },
  { id:'chef',       name:'Chef\'s Kiss',        icon:'pan',     rw:{ c:5000 }, desc:'Cooked every recipe on the menu.' },
  { id:'sleeper',    name:'Sleeper',             icon:'clock',   rw:{ f:80 },   desc:'Came back after eight hours away.' },
  { id:'typist',     name:'The Password',        icon:'key',     rw:{ f:200 },  desc:'Typed E, G, G on the keyboard.' },
  { id:'champion',   name:'Champion Layer',      icon:'medal',   rw:{ c:2000 }, desc:'A hen reached Champion rank.' },
  { id:'warden',     name:'Speaks For The Trees', icon:'tree',   rw:{ f:120 },  desc:'Met the Warden under a felled tree.' },
  { id:'tophat',     name:'Something In The Hat', icon:'chick',  rw:{ f:150 },  desc:'Bothered the founder until a hen climbed out of his hat.' },
];
const SECRET_BY_ID = Object.fromEntries(SECRETS.map(s => [s.id, s]));

/* ------------------------------------------------------------
   THE KITCHEN - recipes. Eggs (and, later, whole hens) become
   dishes worth a multiple of what the eggs would have fetched.
   ------------------------------------------------------------ */
const RECIPES = [
  { id:'omelette', name:'Omelette',       icon:'pan',       eggs:3, feed:0, time:20, mult:5,  desc:'Three eggs, one pan.' },
  { id:'scotch',   name:'Scotch Egg',     icon:'egg',       eggs:1, feed:3, time:14, mult:4,  needs:'scotch',    desc:'An egg in a coat of feed.' },
  { id:'cake',     name:'Egg Cake',       icon:'cake',      eggs:6, feed:6, time:45, mult:12, needs:'bakery',    desc:'Six eggs tall.' },
  { id:'roast',    name:'Roast Hen',      icon:'drumstick', hen:true, time:60, mult:40, needs:'roast',          desc:'A whole bird, slow and low.' },
  { id:'dino',     name:'Dino Drumstick', icon:'drumstick', hen:true, dino:true, time:90, mult:80, needs:'dinoroast', desc:'Serves forty.' },
];
const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));

/* ------------------------------------------------------------
   CREW - five stats, and roles that each lean on different ones.
   Animals answer flyers; robots get assembled at the hut.
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

/* Every role can be filled by an animal or by a little robot. The bots are
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

/* procedural looks. Nobody in this valley is a person: everyone who
   walks upright is either another species on the founder's own frame
   or a little service droid, so a look carries a species or a bot
   flag instead of a skin and a head of hair. */
const FOLK_SPECIES = ['fox','badger','possum','cat','otter','hare','raccoon'];
const DROID_SHELLS = ['#9aa6b4','#c9cfd8','#8a94a8','#b0a8c0','#7fa8b8','#c0b49a'];
const DROID_TRIMS  = ['#3fa7d6','#ffd23f','#e8542f','#4fc46a','#c98af0','#ff8fa8'];
const SHIRTS = ['#7fc4e8','#8fd14f','#ffb84d','#ff8fa8','#c9a3f0','#e8e2d0','#5fa8d6','#f2a03f',
                '#a8d8b0','#e8607a','#6ab04c','#d0c0f0','#f0d060','#89a8c9'];
const PANTS  = ['#4a5a7a','#5e3d18','#3f5a3f','#6a5a4a','#7a4a4a','#4a4a5a','#8a6a3a','#3a3a4a'];
const BOOTS  = ['#5e3d18','#3a2a18','#6a4a2a','#4a3a2a','#2e2216'];
const HATS   = ['straw','cap','bandana','none','none','beanie','wide'];
/* one in four of the folk out in the world is a droid; the rest are
   another species. `rndFn` is a seeded 0..1 source. */
function rollFolk(rndFn, species) {
  const pick = a => a[Math.floor(rndFn() * a.length)];
  if (!species && rndFn() < 0.26) {
    return { bot: true, shirt: pick(DROID_SHELLS), pants: pick(DROID_TRIMS), boot: '#3a3f4a' };
  }
  return { species: typeof species === 'string' ? species : pick(FOLK_SPECIES),
           shirt: pick(SHIRTS), pants: pick(PANTS), boot: pick(BOOTS), hat: pick(HATS) };
}

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

  /* ---- PREHISTORIC (10) — fossils only: the Time Machine brings them back ---- */
  ['Cluckosaurus Rex','dino','#6a8a3a','#3a5a22','stripes','none',  'round', 'Tiny arms. Enormous opinions.'],
  ['Velocirooster','dino', '#c98f3f','#7a5230','spots',  'crest',  'round', 'Clever girl.'],
  ['Tricerachick', 'dino', '#8a9a5a','#5a6a3a','solid',  'horns',  'sleepy','Three horns, one attitude.'],
  ['Stegocluck',   'dino', '#5f8ad3','#3a5a9e','solid',  'plates', 'round', 'Plates for days.'],
  ['Pteracluck',   'dino', '#b06ee0','#6a3a9e','solid',  'sail',   'happy', 'Not technically a dinosaur. Still counts.'],
  ['Brontobawk',   'dino', '#4fb8a8','#2a7a6a','spots',  'none',   'sleepy','Long neck. Longer naps.'],
  ['Ankylocluck',  'dino', '#8a6a3a','#5a4222','solid',  'spikes', 'round', 'Armoured. Grumpy.'],
  ['Raptor Roo',   'dino', '#e8542f','#a8321c','stripes','crest',  'round', 'Fast. Loud. Feathery.'],
  ['Spinocluck',   'dino', '#3a9e4a','#1f6a2a','solid',  'sail',   'round', 'Swims. Sort of.'],
  ['Mega Mama Saurus','dino','#ffd23f','#e8542f','star', 'crown',  'happy', 'Queen of the Cretaceous coop.'],

  /* ---- CELESTIAL (6) — hatch only from eggs the Moon branch sends home ---- */
  ['Moon Hen',     'fluff','#e8f6ff','#5fd0ff','solid',  'halo',   'sleepy','Lays in low gravity.'],
  ['Crater Chick', 'chick','#c9ced6','#8a9099','spots',  'none',   'round', 'Pockmarked and proud.'],
  ['Selene',       'hen',  '#d0d8ff','#7a8ad3','star',   'tiara',  'happy', 'Waxes and wanes.'],
  ['Apollo Bird',  'tall', '#fff8ec','#e8542f','stripes','antenna','round', 'One small peck for henkind.'],
  ['Lunar Lantern','fluff','#fff3c4','#ffd23f','solid',  'none',   'happy', 'Glows on the dark side.'],
  ['The Far Side', 'hen',  '#24242e','#5fd0ff','star',   'none',   'sleepy','Nobody has seen her face.'],
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
  if (out.length !== 128) throw new Error('species count ' + out.length);
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
  { id:'ages',    name:'AGES',    code:'age.sys',   icon:'scroll',  hue:'#f0a422' },
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
  /* lanes an age has to open first */
  { id:'kitchen', name:'KITCHEN', code:'cook.sys',  icon:'pan',     hue:'#e8a52f', age:'iron' },
  { id:'park',    name:'PARK',    code:'park.sys',  icon:'ticket',  hue:'#5fd0a0', age:'steam' },
  { id:'jurassic',name:'JURASSIC',code:'dino.sys',  icon:'dino',    hue:'#8a9a5a', age:'jurassic' },
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
  U('spade',      'farm', 2, 'farming',    'The Spade',      'spade',   10,  'Unlock the DIG tool: turn the soil over for worms and grubs, the finest feed there is'),
  U('compost',    'farm', 3, 'spade',      'Compost Heap',   'compost', 26,  'Unlock the Compost Heap: it breeds bugs of its own all day long'),
  U('wormfarm',   'farm', 4, 'compost',    'Worm Farm',      'worm',    70,  'Unlock the Worm Farm: crates of worms into the jar, no digging needed'),
  U('sunflowers', 'farm', 4, 'corn',       'Sunflower Seed', 'sparkle', 45,  'Unlock sunflowers: the richest feed'),
  U('chilis',     'farm', 4, 'corn',       'Chili Seed',     'flame',   40,  'Unlock chilis: a hot, heavy harvest'),
  U('well',       'farm', 4, 'sprinkler',  'The Well',       'spiral',  90,  'Unlock the Well: a wide watered circle'),
  K('hearty',     'farm', 4, 'coopbuild',  'Hearty Feed',    'flame',   5, 60,  2.3, 'chicks need two feeds fewer and 12% less time'),
  U('berries',    'farm', 5, 'sunflowers', 'Berry Bushes',   'heart',   120, 'Unlock berry bushes: they regrow after picking'),
  U('mill',       'farm', 5, 'well',       'The Mill',       'gear',    260, 'Unlock the Mill: +25% feed from every harvest'),
  K('slowbelly',  'farm', 5, 'hearty',     'Slow Bellies',   'heart',   5, 110, 2.3, 'the flock stays full 25% longer'),
  U('harvestbot', 'farm', 6, 'mill',       'Auto Harvest',   'robot',   900, 'ripe crops harvest themselves'),
  U('pumpkins',   'farm', 6, 'berries',    'Pumpkin Seed',   'sparkle', 220, 'Unlock pumpkins: slow as anything, worth the wait'),
  U('carrots',    'farm', 2, 'farming',    'Carrot Seed',    'seed',    5,   'Unlock carrots: quick and crunchy'),
  U('potatoes',   'farm', 3, 'carrots',    'Potato Seed',    'bowl',    12,  'Unlock potatoes: humble, and they fill a barn'),
  U('tomatoes',   'farm', 3, 'carrots',    'Tomato Seed',    'heart',   16,  'Unlock tomatoes: they fruit again on the vine'),
  U('processing', 'farm', 3, 'bumper',     'Food Processing','gear',    45,  'Unlock the CANNERY: produce becomes jam, flour and pie worth far more'),
  U('cabbages',   'farm', 4, 'potatoes',   'Cabbage Seed',   'sprout',  38,  'Unlock cabbages: a big green head of feed'),
  U('melons',     'farm', 4, 'tomatoes',   'Melon Seed',     'sparkle', 50,  'Unlock watermelons: the founder\'s favourite'),
  U('rice',       'farm', 5, 'melons',     'Rice Paddy',     'water',   140, 'Unlock rice: wants water, gives plenty'),

  /* ---- HENS ---- */
  K('happy',      'hens', 1, 'root',   'Happy Hens',     'heart',   12, 4,  1.9, '+10% lay speed'),
  K('flock',      'hens', 2, 'happy',  'Bigger Flock',   'house',   10, 10, 2.1, '+4 chicken capacity'),
  K('pets',       'hens', 2, 'happy',  'Pet Therapy',    'hands',   6,  6,  2.2, '-15% pet cooldown'),
  U('ranks',      'hens', 2, 'happy',  'Pecking Order',  'medal',   20,  'Hens earn stars for the eggs they lay: every star is 6% more speed and value'),
  K('medals',     'hens', 3, 'ranks',  'Medal Table',    'medal',   5,  60, 2.3, '+4% more per star on every ranked hen'),
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
  U('billboard',  'market', 3, 'orders',    'Billboards',       'sign',  40,  'Unlock the Billboard: paint your own poster and pull more cars off the road'),
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
  U('moonegg',    'market', 9, 'moonshot',  'Moon Eggs',        'moon',  50000,'A Moon branch sends an egg home now and then: Celestial birds hatch from them'),

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

  /* ---- KITCHEN: opens with the Iron Age ---- */
  U('kitchen',    'kitchen', 1, 'root',     'The Kitchen',    'pan',      30,  'Unlock the Kitchen: eggs become omelettes, and diners walk up to buy them'),
  U('scotch',     'kitchen', 2, 'kitchen',  'Scotch Eggs',    'egg',      40,  'A recipe: one egg in a coat of feed, four times the price'),
  K('chef',       'kitchen', 2, 'kitchen',  'Quick Chef',     'flame',    6, 35,  2.2, '-12% cooking time'),
  U('bakery',     'kitchen', 3, 'scotch',   'The Bakery',     'cake',     120, 'A recipe: egg cake, six eggs tall, twelve times the price'),
  K('menu',       'kitchen', 3, 'chef',     'Bigger Menu',    'doc',      5, 80,  2.4, '+20% on every dish sold'),
  U('roast',      'kitchen', 4, 'bakery',   'Sunday Roast',   'drumstick',300, 'Drop a hen on the Kitchen: a roast worth forty of her eggs'),
  U('diner',      'kitchen', 4, 'menu',     'The Diner',      'house',    260, 'Diners come twice as often'),
  U('dinoroast',  'kitchen', 5, 'roast',    'Jurassic Grill', 'dino',     2500,'Roast a dinosaur: a drumstick that serves forty'),
  U('foodtruck',  'kitchen', 5, 'diner',    'Food Truck',     'truck',    900, 'Dishes on the counter ride out with the egg truck and sell in town'),

  /* ---- PARK: opens with the Steam Age ---- */
  U('park',       'park', 1, 'root',       'Chicken Park',   'ticket',   60,  'Unlock the Chicken Park: put hens on show and sell tickets at the gate'),
  K('tickets',    'park', 2, 'park',       'Dearer Tickets', 'coin',     8, 60,  2.2, '+15% ticket price'),
  U('busstop',    'park', 2, 'park',       'Bus Stop',       'car',      150, 'Tour buses come half again as often'),
  U('giftshop',   'park', 3, 'tickets',    'Gift Shop',      'crate',    400, '+30% from every visitor'),
  K('crowds',     'park', 3, 'busstop',    'Word Of Beak',   'hands',    6, 200, 2.4, '+1 visitor on every bus'),
  U('dinopen',    'park', 4, 'giftshop',   'Dino Pen',       'dino',     3000,'Dinosaurs allowed in the park: four times the appeal'),
  U('nightshow',  'park', 4, 'crowds',     'Night Show',     'candle',   2400,'Visitors pay half again after dark'),

  /* ---- JURASSIC: opens with the Jurassic Age ---- */
  U('fossilhunt', 'jurassic', 1, 'root',       'Fossil Hunt',    'fossil',  500,  'Digging ponds turns up fossils three times as often'),
  U('timemachine','jurassic', 2, 'fossilhunt', 'Time Machine',   'clock',   5000, 'Unlock the Time Machine: three fossils in, one dinosaur out'),
  K('deextinct',  'jurassic', 3, 'timemachine','De-Extinction',  'dna',     5, 3000, 2.4, '-15% Time Machine countdown'),
  U('amber',      'jurassic', 3, 'timemachine','Amber',          'honey',   4000, 'Harvests turn up the odd fossil too'),
  K('dinofeed',   'jurassic', 4, 'deextinct',  'Dino Feed',      'bowl',    5, 6000, 2.5, 'dinosaurs lay 20% faster'),
  U('bigeggs',    'jurassic', 4, 'amber',      'Big Eggs',       'egg',     20000,'dinosaur eggs sell for double'),
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
  { id:'q_iron',    name:'Iron Age',        icon:'hammer', goal:{ k:'age', id:'iron' },              rw:{ c:100 },        hint:'Reach the Iron Age', where:'lab' },
  { id:'q_cook',    name:'First Omelette',  icon:'pan',    goal:{ k:'stat', s:'cooked', n:1 },      rw:{ f:20 },         hint:'Cook a dish', where:'field' },
  { id:'q_eight',   name:'Eight Species',   icon:'book',   goal:{ k:'disc', n:8 },                   rw:{ f:30 },         hint:'Find 8 species', where:'inc' },
  { id:'q_belts',   name:'Belt Line',       icon:'crate',  goal:{ k:'built', t:'belt', n:4 },        rw:{ c:250 },        hint:'Build 4 belts', where:'field' },
  { id:'q_rank',    name:'Star Layer',      icon:'medal',  goal:{ k:'stat', s:'ranked', n:1 },      rw:{ f:30 },         hint:'Rank up a hen', where:'mama' },
  { id:'q_genes',   name:'Gene Editor',     icon:'dna',    goal:{ k:'stat', s:'edits', n:1 },       rw:{ f:60 },         hint:'Edit a gene', where:'field' },
  { id:'q_storey',  name:'Second Storey',   icon:'rack',   goal:{ k:'stat', s:'storeys', n:1 },     rw:{ c:400 },        hint:'Add a floor', where:'field' },
  { id:'q_dishes',  name:'Ten Dishes',      icon:'pan',    goal:{ k:'stat', s:'dishes', n:10 },     rw:{ c:500 },        hint:'Sell 10 dishes', where:'field' },
  { id:'q_regulars',name:'Regulars',        icon:'doc',    goal:{ k:'stat', s:'orders', n:5 },      rw:{ c:300 },        hint:'Fill 5 orders', where:'road' },
  { id:'q_secret',  name:'A Secret',        icon:'key',    goal:{ k:'stat', s:'secrets', n:1 },     rw:{ f:50 },         hint:'Find a secret', where:'field' },
  { id:'q_land',    name:'More Land',       icon:'house',  goal:{ k:'plots', n:3 },                  rw:{ f:80 },         hint:'Own 3 plots', where:'field' },
  { id:'q_steam',   name:'Steam Age',       icon:'gear',   goal:{ k:'age', id:'steam' },             rw:{ c:1500 },       hint:'Reach the Steam Age', where:'lab' },
  { id:'q_park',    name:'Open The Park',   icon:'ticket', goal:{ k:'built', t:'park', n:1 },        rw:{ f:100 },        hint:'Build the park', where:'field' },
  { id:'q_flock',   name:'A Real Flock',    icon:'chick',  goal:{ k:'flock', n:20 },                 rw:{ c:600 },        hint:'Keep 20 hens', where:'mama' },
  { id:'q_visitors',name:'A Hundred Visitors', icon:'hands', goal:{ k:'stat', s:'visitors', n:100 }, rw:{ c:3000 },     hint:'100 visitors', where:'field' },
  { id:'q_fingers', name:'Green Fingers',   icon:'sprout', goal:{ k:'stat', s:'harvested', n:25 },  rw:{ f:60 },         hint:'Harvest 25 crops', where:'field' },
  { id:'q_roast',   name:'Sunday Roast',    icon:'drumstick', goal:{ k:'stat', s:'roasts', n:1 },   rw:{ c:2000 },       hint:'Roast a hen', where:'field' },
  { id:'q_tenk',    name:'Ten Thousand',    icon:'chart',  goal:{ k:'stat', s:'coinsEarned', n:10000 }, rw:{ f:120 },    hint:'Earn 10,000 coins', where:'truck' },
  { id:'q_public',  name:'Go Public',       icon:'star',   goal:{ k:'skill', id:'stocks' },          rw:{ c:2000 },       hint:'Go public', where:'lab' },
  { id:'q_champion',name:'Champion',        icon:'medal',  goal:{ k:'stat', s:'champions', n:1 },   rw:{ c:5000 },       hint:'Raise a Champion', where:'mama' },
  { id:'q_electric',name:'Electric Age',    icon:'bolt',   goal:{ k:'age', id:'electric' },          rw:{ f:300 },        hint:'Reach the Electric Age', where:'lab' },
  { id:'q_abroad',  name:'Go Abroad',       icon:'city',   goal:{ k:'regions', n:1 },                rw:{ f:200 },        hint:'Open a country', where:'lab' },
  { id:'q_secrets5',name:'Five Secrets',    icon:'key',    goal:{ k:'stat', s:'secrets', n:5 },     rw:{ f:400 },        hint:'Find 5 secrets', where:'field' },
  { id:'q_branches',name:'Ten Branches',    icon:'house',  goal:{ k:'stat', s:'branches', n:10 },   rw:{ c:50000 },      hint:'Build 10 branches', where:'lab' },
  { id:'q_space',   name:'Space Age',       icon:'atom',   goal:{ k:'age', id:'space' },             rw:{ c:200000 },     hint:'Reach the Space Age', where:'lab' },
  { id:'q_moon',    name:'The Moon',        icon:'moon',   goal:{ k:'region', id:'moon' },           rw:{ f:2000 },       hint:'Reach the Moon', where:'lab' },
  { id:'q_moonegg', name:'Moon Egg',        icon:'moon',   goal:{ k:'stat', s:'celestial', n:1 },   rw:{ f:3000 },       hint:'Hatch a Moon egg', where:'inc' },
  { id:'q_fossil',  name:'Bone Digger',     icon:'fossil', goal:{ k:'stat', s:'fossils', n:1 },     rw:{ f:500 },        hint:'Dig up a fossil', where:'field' },
  { id:'q_jurassic',name:'Jurassic Age',    icon:'dino',   goal:{ k:'age', id:'jurassic' },          rw:{ c:1e6 },        hint:'Reach the Jurassic Age', where:'lab' },
  { id:'q_dino',    name:'Hatch A Dinosaur',icon:'dino',   goal:{ k:'stat', s:'dinos', n:1 },       rw:{ f:5000 },       hint:'Hatch a dinosaur', where:'field' },
  { id:'q_dinopark',name:'Jurassic Park',   icon:'ticket', goal:{ k:'stat', s:'dinoShown', n:1 },   rw:{ c:5e6 },        hint:'A dino in the park', where:'field' },
  { id:'q_keeper',  name:'Secret Keeper',   icon:'key',    goal:{ k:'stat', s:'secrets', n:12 },    rw:{ f:10000 },      hint:'Find 12 secrets', where:'field' },
];
const QUEST_BY_ID = Object.fromEntries(QUESTS.map(q => [q.id, q]));

/* ------------------------------------------------------------
   THE FOUNDER'S VOICE
   Every quest is a raccoon leaning on a fence telling you what
   he wants next. He walks the farm; these are his lines.
   ------------------------------------------------------------ */
const QUEST_SAY = {
  q_sweep:    'Eggs on the grass are money on the floor. Sweep them up.',
  q_sale:     'Load the bike and pedal into town. Our first coin is out there.',
  q_feedbag:  'Buy me the feed bag at the Lab. A hungry hen is a sad hen.',
  q_grandma:  'Grandmama\'s hen wants her supper before she gives us anything.',
  q_hatch:    'One hen is a hobby. Put an egg in the incubator and we are a business.',
  q_hoe:      'The field is bare. Fetch the hoe from the Lab and we will fix that.',
  q_till:     'Turn six tiles of that dirt over. I would help, but these are my good paws.',
  q_water:    'Seeds in, water on. Nothing on this farm grows out of hope.',
  q_harvest:  'Cut it while it is ripe. Every crop is a bag of feed we did not buy.',
  q_grown:    'Feed that chick until it is a hen. Then it works for us.',
  q_toolbox:  'Get the toolbox. I have plans, and plans need buildings.',
  q_build:    'Put something up. A farm with no sheds looks like a hobby.',
  q_depot:    'Install Logistics. A bicycle is not a supply chain.',
  q_order:    'Someone has pulled up on the road wanting eggs. Do not keep them waiting.',
  q_hire:     'Hire a hand. I did not inherit a farm to carry baskets myself.',
  q_iron:     'Hatch, earn, build. Get us to the Iron Age and the tools improve.',
  q_cook:     'An egg sells for one coin. An omelette sells for five. Cook something.',
  q_eight:    'Eight kinds of chicken. The book is looking thin, partner.',
  q_belts:    'Four belts. Let the machines carry eggs and we will carry money.',
  q_rank:     'Keep a hen laying and she earns her stars. Stars mean speed.',
  q_genes:    'Splice something in the Gene Lab. Nobody has to know.',
  q_storey:   'Build up, not out. Land is dear and air is free.',
  q_dishes:   'Ten dishes out of that kitchen. The diners are hungry and rich.',
  q_regulars: 'Five orders filled and we have regulars. Regulars come back.',
  q_secret:   'This valley is hiding things. Go and poke at something odd.',
  q_land:     'Three plots. Buy the neighbours out before they get ideas.',
  q_steam:    'Boilers, belts and a proper kitchen. Take us to the Steam Age.',
  q_park:     'They pay to look at chickens. Build the park. I checked. They do.',
  q_flock:    'Twenty hens on the ground. Now it sounds like a farm from the road.',
  q_visitors: 'A hundred visitors through that gate, and a ticket off every one.',
  q_fingers:  'Twenty-five harvests. You are frighteningly good at this.',
  q_roast:    'One hen, one pot, forty times the money. Do not tell the others.',
  q_tenk:     'Ten thousand coins. I would very much like to see it written down.',
  q_public:   'Take the company public. Then buy into the rivals. Quietly.',
  q_champion: 'Four hundred eggs from one hen. I want her name on a plaque.',
  q_electric: 'Lamps in the windows, crowds at the gate. The Electric Age, please.',
  q_abroad:   'Open a country. Eggs taste the same everywhere and pay more abroad.',
  q_secrets5: 'Five secrets. Somebody in this valley is keeping notes.',
  q_branches: 'Ten branches. I want our sign on ten roads I have never driven.',
  q_space:    'A rocket on the pad. The Space Age will not open itself.',
  q_moon:     'The Moon. No foxes, no rain, and nobody has claimed the eggs.',
  q_moonegg:  'Something came down from the Moon. Hatch it and see what we bought.',
  q_fossil:   'There are bones under this dirt. Water the soil and dig one up.',
  q_jurassic: 'Seventy species and sixty million coins. Then we buy a time machine.',
  q_dino:     'Three fossils in the machine. Stand back. Possibly quite far back.',
  q_dinopark: 'Put the dinosaur in the park. Tickets will pay for the fence. Probably.',
  q_keeper:   'Twelve secrets. At this point the valley works for you, not me.',
};
QUESTS.forEach(q => { q.say = QUEST_SAY[q.id] || q.hint + '.'; });

/* what he says when one is paid out, and what he mutters between jobs */
const BOSS_DONE = [
  'That is the one. Next.',
  'Paid out. Now do it again, bigger.',
  'Look at us. Practically respectable.',
  'Banked. I am writing this one down.',
  'See? I said it would work.',
  'Good. Now something harder.',
  'The ledger likes you today.',
  'That went better than my last idea.',
  'Signed, sealed, and mine.',
  'Put that one in the annual report.',
  'I knew you had it in you. I did not, but I said it.',
  'One more of those and I am buying a hat for the hat.',
  'Filed under: went well for once.',
  'That is the sound of a business.',
];
const BOSS_IDLE = [
  'Fine farm. Needs more of everything.',
  'Do you smell money? I smell money.',
  'Grandmama would have hated the paperwork.',
  'Every egg is a coin with a shell on it.',
  'I am supervising. This is supervising.',
  'If a fox turns up, that one is yours.',
  'One day all of this is a chain.',
  'Mind the hen. She is particular.',
  'I have read the ledger twice. It is still good.',
  'A tidy yard is a yard that is not earning.',
  'I have been thinking. Dangerous, I know.',
  'Somebody has to stand here and believe in it.',
  'Growth. Say it with me. Growth.',
  'I do not do heavy lifting. I do vision.',
  'If it clucks, it can be scaled.',
  'The trick is to look busy near something expensive.',
  'We are one good quarter from a second hat.',
  'I sleep four hours. Two of them in the barn.',
  'The competition is asleep. The competition is a duck pond.',
  'Nothing personal against the trees. Purely commercial.',
  'Small is just big that has not been told yet.',
  'I am not anti-regulation. I am pro-loophole.',
  'The hens have no vote. That is the beauty of it.',
  'We do not lobby. We explain, at length, with a hamper.',
  'Synergy is two sheds that can see each other.',
  'I told the council it was a hobby. It is a sector.',
  'Every empire starts as an unlicensed shed.',
  'Downsizing is when the hens do it to themselves.',
  'The market is efficient. I have met it. It is a duck.',
  'Call it a co-operative and nobody asks questions.',
  'I am a job creator. The jobs are in the barn.',
  'Trickle-down works. Ask the worms.',
  'A subsidy is just a compliment with a number on it.',
  'My five-year plan is four years of hats.',
  'I would run for office, but the hours here are better.',
  'Automate it, and then automate whoever asks why.',
  'Never trust a quarterly. Trust a full basket.',
  'The chickens are stakeholders. They just do not know.',
  'When we are enormous, remind me to be humble about it.',
  'I have a five year plan. Year one is this fence.',
  'Money is only paper. Get me more paper.',
  'Every hen here has equity. Do not tell them what in.',
];
/* he has something to say about the weather, the hour and the money */
const BOSS_RAIN = [
  'Rain is free irrigation. Bill it to nobody.',
  'Do not melt. I need you.',
  'The crops love this. I am indoors about it.',
];
const BOSS_NIGHT = [
  'The night shift is just the day shift with worse lighting.',
  'Look at those lamps. That is money burning, but prettily.',
  'Nothing sleeps here. Least of all me.',
];
const BOSS_RICH = [
  'We could buy the village. We will not. Yet.',
  'I have stopped counting. That is a good sign.',
  'Somebody get me a bigger safe.',
];
const BOSS_BROKE = [
  'We are between fortunes. It happens.',
  'Cash is a state of mind. A very thin one.',
  'Sell something. Anything. Not the hen.',
];
const BOSS_AT = {
  mama:  ['She was Grandmama\'s. Be nice to her.', 'That hen has outlasted three of my schemes.',
          'She lays when she is fussed over. So do I.', 'Careful. That bird has seen things.'],
  lab:   ['Feathers in, science out. My favourite trade.', 'Everything on this board is a plan I cannot afford yet.',
          'Research is just guessing with a receipt.', 'One day this board is all lit up and I am insufferable.'],
  truck: ['Every load that leaves is a coin that comes back.', 'One day this is a fleet. Watch.',
          'Load it heavier. The suspension is a suggestion.', 'That road goes everywhere. Eventually.'],
  road:  ['Cars all day and not one of them stops. Yet.', 'A big enough sign and they all pull in.',
          'Traffic is just customers who have not been asked.', 'I have counted forty. Forty missed sales.'],
  field: ['Dirt today, dinner tomorrow.', 'I like a field that owes me something.',
          'Plant it. Water it. Bill it.', 'Every furrow is a little line in the ledger.'],
  inc:   ['Rock, crack, cluck. Best sound on the farm.', 'Every one of those is a new employee.',
          'Do not rush them. They are compounding.', 'Hatching is the only growth I can watch happen.'],
};
/* what he says when the drone lets go */
const DRONE_LINES = [
  'Air freight. I am not walking to the road twice.',
  'Special delivery. Mostly for me.',
  'It flies, it drops, it does not ask for wages.',
  'The future, and it fits in a box.',
  'Signed for. Open it before the hens do.',
  'I bought six. This is the one that still works.',
  'No driver, no lunch break, no opinions.',
];

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
  /* the ages: one row, the eras in order */
  lanes.push({ id:'ages', top: row, rows: 1 });
  AGES.forEach((a, i) => { pos[a.id] = { col: 1 + i, row, age: true }; });
  row += 1;
  /* the kernel on its own row, then every module in order */
  pos.root = { col: 0, row: row };
  const children = id => SKILLS.filter(sk => sk.pre === id);
  MODULES.forEach(m => {
    if (m.id === 'quests' || m.id === 'ages') return;
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
  let cols = 0;
  Object.values(pos).forEach(p => { cols = Math.max(cols, p.col + 1); });
  return { pos, lanes, rows: row, cols };
})();
const GRID_POS = GRID.pos;

/* modules keep their packages in dependency order */
const SKILLS_BY_MODULE = MODULES.map(m =>
  SKILLS.filter(sk => sk.br === m.id && sk.id !== 'root').sort((a, b) => a.d - b.d || a.name.localeCompare(b.name)));

/* ============================================================
   THE OVERHAUL - quest objectives and dialogue, the road and its
   events, the garage, town factories, the founder's wardrobe,
   achievements, settings and save slots.
   ============================================================ */

/* ---- quests: several at once, each a to-do list, claimed by hand ----
   objs: a list of goals (the plain goal is still the last one). Every
   objective wears a short label for the to-do list. */
const QUEST_ACTIVE = 3;
const QUEST_OBJS = {
  q_sweep:   [{ k:'stat', s:'pets', n:1, label:'Pet Mama Hen' }, { k:'stat', s:'collected', n:5, label:'Sweep 5 eggs' }],
  q_sale:    [{ k:'stat', s:'collected', n:4, label:'Sweep 4 eggs' }, { k:'stat', s:'trips', n:1, label:'Send the bike to town' }],
  q_water:   [{ k:'stat', s:'planted', n:3, label:'Sow 3 seeds' }, { k:'stat', s:'watered', n:3, label:'Water 3 crops' }],
  q_harvest: [{ k:'stat', s:'harvested', n:1, label:'Harvest a crop' }, { k:'stat', s:'feedMade', n:4, label:'Bank 4 feed' }],
  q_grown:   [{ k:'stat', s:'hatched', n:1, label:'Hatch a chick' }, { k:'stat', s:'grown', n:1, label:'Raise it to a hen' }],
  q_build:   [{ k:'skill', id:'buildtool', label:'Install the Toolbox' }, { k:'stat', s:'builtN', n:1, label:'Build something' }],
  q_order:   [{ k:'skill', id:'orders', label:'Install Roadside Orders' }, { k:'stat', s:'orders', n:1, label:'Fill a roadside order' }],
  q_hire:    [{ k:'built', t:'staffhut', n:1, label:'Build a Staff Hut' }, { k:'stat', s:'flyers', n:1, label:'Put posters up' }, { k:'stat', s:'hired', n:1, label:'Hire someone' }],
  q_cook:    [{ k:'built', t:'kitchen', n:1, label:'Build a Kitchen' }, { k:'stat', s:'cooked', n:1, label:'Cook a dish' }],
  q_belts:   [{ k:'skill', id:'belts', label:'Install Conveyor Tech' }, { k:'built', t:'belt', n:4, label:'Lay 4 belts' }],
  q_regulars:[{ k:'stat', s:'orders', n:5, label:'Fill 5 orders' }, { k:'built', t:'billboard', n:1, label:'Put a billboard up' }],
  q_land:    [{ k:'plots', n:2, label:'Buy a second plot' }, { k:'plots', n:3, label:'Own 3 plots' }],
  q_park:    [{ k:'built', t:'park', n:1, label:'Build the park' }, { k:'stat', s:'visitors', n:5, label:'Sell 5 tickets' }],
  q_fingers: [{ k:'stat', s:'harvested', n:25, label:'Harvest 25 crops' }, { k:'stat', s:'goods', n:1, label:'Can something at the Cannery' }],
};
/* what he says when you claim it, per quest; the pool below covers the rest */
const QUEST_DONE_SAY = {
  q_sweep:   'Five eggs and a clean lawn. I could get used to this.',
  q_sale:    'Our first coin. I have framed it. Mentally.',
  q_hatch:   'It cheeped at me. I think it knows who the boss is.',
  q_harvest: 'Food out of dirt. Farming is basically alchemy.',
  q_hire:    'Staff! Now I can supervise properly, from a chair.',
  q_order:   'They paid extra for the convenience. Convenience is our product now.',
  q_iron:    'The Iron Age. Sounds heavy. Feels rich.',
  q_land:    'Three plots. The neighbours are calling me sir.',
  q_public:  'We are on the market. Buy low, sell to your cousin.',
  q_moon:    'The Moon. Grandmama, if you can see this: I told you so.',
};
QUESTS.forEach((q, i) => {
  q.objs = QUEST_OBJS[q.id] || [Object.assign({ label: q.hint }, q.goal)];
  q.doneSay = QUEST_DONE_SAY[q.id] || null;
  q.chapter = i < 10 ? 'THE FARM' : i < 20 ? 'THE BUSINESS' : i < 32 ? 'THE COMPANY' : i < 40 ? 'THE EMPIRE' : 'THE STARS';
});

/* ---- the road between here and the towns ---- */
const ROUTE_STYLES = {
  fast:   { id:'fast',   name:'Highway',       icon:'road',    time:0.78, toll:0.07, pay:1.0,  events:0.6,
            desc:'Quick, but the toll booth takes 7% of the load.' },
  safe:   { id:'safe',   name:'Country Lane',  icon:'tree',    time:1.0,  toll:0,    pay:1.0,  events:1.0,
            desc:'Free and steady. Whatever happens on the road happens to you.' },
  scenic: { id:'scenic', name:'Scenic Route',  icon:'sparkle', time:1.28, toll:0,    pay:1.12, events:0.8,
            desc:'Slow, pretty, and the eggs arrive in a good mood: 12% more at the market.' },
};
const ROUTE_STYLE_KEYS = Object.keys(ROUTE_STYLES);
/* things that happen on the map: each sits on a town's road for a while */
/* ------------------------------------------------------------
   THE CHRONICLE - now and then the valley has an opinion about
   you, and it arrives the way opinions did: a newspaper spinning
   in out of nowhere with your name in the headline and two ways
   out of it underneath. Each choice does something you can feel,
   and most of them cost you something.

   `need` gates it on progress; `w` is how often it comes up.
   An effect is any of { coins, feathers, eggs } as a flat number,
   or `decree` for a timed change to how the valley treats you:
     pay   multiplies what every egg is worth
     wage  multiplies what the crew costs you
     cars  multiplies how much traffic the road gets
   ------------------------------------------------------------ */
const NEWS_PAPER = 'THE CLUCKTON CHRONICLE';
const NEWS_FILLER = [
  'Sources close to the barn confirmed the figures late last night.',
  'The committee met for six hours and adjourned for sandwiches.',
  'Local opinion remains divided, loud, and largely uninformed.',
  'Our correspondent was escorted from the premises by a goose.',
  'A spokesraccoon declined to comment, then commented at length.',
  'Analysts described the move as bold, or possibly as a shed.',
  'The minister was unavailable, being at the time inside a hedge.',
  'Turnout was described as brisk. Feed prices held firm.',
  'No hens were harmed. Several were extremely inconvenienced.',
  'The full text of the ordinance runs to nine pages and a diagram.',
];
const EVENTS = [
  { id:'inspector', w:1.2, need:{ staff:1 },
    head:'EGG INSPECTOR AT THE GATE',
    sub:'Ministry official demands to see the paperwork nobody has',
    icon:'doc',
    choices:[
      { label:'PAY THE FEE', blurb:'Quietly. Everyone does.', cost:{ coins:260 },
        fx:{ coins:-260, decree:{ pay:1.3, t:90, name:'CERTIFIED' } },
        line:'Certified. Stamped. Framed by lunchtime.' },
      { label:'ARGUE', blurb:'You have a mouth. Use it.',
        fx:{ decree:{ pay:0.75, t:70, name:'UNDER REVIEW' } },
        line:'We are under review. We have always been under review.' },
    ] },
  { id:'union', w:1.1, need:{ staff:3 },
    head:'CREW FORMS A COMMITTEE',
    sub:'Demands include shorter shifts and a better class of pellet',
    icon:'hands',
    choices:[
      { label:'GIVE THE RAISE', blurb:'Costs more, works harder.',
        fx:{ coins:-180, decree:{ wage:1.3, pay:1.2, t:140, name:'HAPPY CREW' } },
        line:'Fine. Pellets for everyone. Do not tell the hens.' },
      { label:'CALL IT A CO-OP', blurb:'Cheaper. They will notice.',
        fx:{ feathers:-8, decree:{ pay:0.9, t:80, name:'GRUMBLING' } },
        line:'It is not a pay cut, it is an ownership stake in a shed.' },
    ] },
  { id:'zoning', w:1.0,
    head:'COUNCIL QUERIES THE FENCE',
    sub:'Planning department discovers the farm exists, is furious',
    icon:'fence',
    choices:[
      { label:'GREASE IT', blurb:'A hamper. A large one.', cost:{ coins:400 },
        fx:{ coins:-400, decree:{ cars:1.6, pay:1.15, t:120, name:'PERMITTED' } },
        line:'It is not a bribe, it is a gift basket with intent.' },
      { label:'MOVE THE FENCE', blurb:'Free. Slow. Humiliating.',
        fx:{ feathers:6, decree:{ pay:0.85, t:60, name:'REBUILDING' } },
        line:'Two feet left. Two feet! I have measured it in spite.' },
    ] },
  { id:'strikeroad', w:1.0,
    head:'HAULIERS BLOCK THE ROAD',
    sub:'Fuel duty protest reaches the bottom of the drive',
    icon:'truck',
    choices:[
      { label:'FEED THEM', blurb:'Eggs buy goodwill.',
        fx:{ eggs:-6, decree:{ cars:2.2, pay:1.25, t:110, name:'GOODWILL' } },
        line:'Six dozen and they love us. Cheapest advertising going.' },
      { label:'DRIVE THROUGH', blurb:'Bold. Loud. Memorable.',
        fx:{ coins:180, decree:{ cars:0.4, t:90, name:'BOYCOTT' } },
        line:'We got through. We are also on a list now.' },
    ] },
  { id:'subsidy', w:1.1,
    head:'RURAL GROWTH FUND OPENS',
    sub:'Money available to anyone who can fill in the form',
    icon:'coin',
    choices:[
      { label:'APPLY HONESTLY', blurb:'Slow money, clean money.',
        fx:{ coins:420, feathers:4 },
        line:'Filled it in twice. Got it right the second time.' },
      { label:'EMBELLISH', blurb:'More money, more questions.',
        fx:{ coins:1100, decree:{ pay:0.8, t:100, name:'AUDITED' } },
        line:'I may have described the shed as a campus.' },
    ] },
  { id:'tycoonrival', w:1.0, need:{ coins:5000 },
    head:'RIVAL EGG BARON BUYS THE VALLEY',
    sub:'Mystery consortium acquires everything except your field',
    icon:'skull',
    choices:[
      { label:'UNDERCUT HIM', blurb:'Sell cheap. Hurt him.',
        fx:{ decree:{ pay:0.7, cars:2.4, t:130, name:'PRICE WAR' } },
        line:'Sell at a loss for long enough and you win. Somehow.' },
      { label:'RAISE PRICES', blurb:'Let him have the cheap end.',
        fx:{ decree:{ pay:1.45, cars:0.55, t:130, name:'PREMIUM' } },
        line:'Ours are artisanal now. Same hens. Bigger word.' },
    ] },
  { id:'election', w:1.0,
    head:'ELECTION CALLED IN CLUCKTON',
    sub:'Both candidates promise the farm road will finally be fixed',
    icon:'flag',
    choices:[
      { label:'DONATE TO BOTH', blurb:'Hedged. Expensive.', cost:{ coins:600 },
        fx:{ coins:-600, decree:{ pay:1.35, cars:1.8, t:150, name:'WELL CONNECTED' } },
        line:'I believe in democracy twice, at the same time.' },
      { label:'STAY OUT OF IT', blurb:'Principled. Cheap.',
        fx:{ feathers:10 },
        line:'No comment. Put that in the paper. No comment.' },
    ] },
  { id:'safety', w:1.0, need:{ staff:2 },
    head:'SAFETY AUDIT FINDS THE BARN',
    sub:'Inspector lists nine hazards, eight of which are the goat',
    icon:'wrench',
    choices:[
      { label:'FIX IT PROPERLY', blurb:'Dull. Correct.', cost:{ coins:320 },
        fx:{ coins:-320, decree:{ wage:0.85, pay:1.2, t:130, name:'COMPLIANT' } },
        line:'Handrails. Signage. A little gate. I hate it. It works.' },
      { label:'MOVE THE GOAT', blurb:'Technically compliant.',
        fx:{ feathers:5, decree:{ pay:0.95, t:60, name:'IMPROVISED' } },
        line:'Eight hazards solved by one gate and a firm word.' },
    ] },
  { id:'automation', w:1.0, need:{ staff:4 },
    head:'MACHINES COULD DO IT CHEAPER',
    sub:'Consultant with a clipboard says so, at length, for a fee',
    icon:'robot',
    choices:[
      { label:'BUY THE MACHINES', blurb:'Fast now, awkward later.', cost:{ coins:520 },
        fx:{ coins:-520, decree:{ pay:1.5, wage:1.2, t:120, name:'AUTOMATED' } },
        line:'The robots do not ask about pellets. I respect that.' },
      { label:'KEEP THE CREW', blurb:'Slower. They remember.',
        fx:{ feathers:12, decree:{ wage:0.8, t:140, name:'LOYAL' } },
        line:'Machines break. Badgers hold a grudge. Easy call.' },
    ] },
  { id:'scandal', w:0.9, need:{ coins:12000 },
    head:'"WHERE DOES THE MONEY GO?"',
    sub:'Chronicle prints a diagram with your hat in the middle of it',
    icon:'quest',
    choices:[
      { label:'BUY THE PAPER', blurb:'Simple. Suspicious.', cost:{ coins:1400 },
        fx:{ coins:-1400, decree:{ pay:1.4, t:160, name:'GOOD PRESS' } },
        line:'I now own the front page. It is very complimentary.' },
      { label:'GIVE A TOUR', blurb:'Honest. Risky.',
        fx:{ feathers:18, decree:{ cars:2.6, t:120, name:'FAMOUS' } },
        line:'Showed them everything. They loved the compost heap.' },
    ] },
  { id:'weatherbill', w:1.0,
    head:'STORM LEVY PROPOSED',
    sub:'Every farm on the road to pay for one broken culvert',
    icon:'cloud',
    choices:[
      { label:'PAY YOUR SHARE', blurb:'Neighbourly.', cost:{ coins:240 },
        fx:{ coins:-240, decree:{ cars:1.7, pay:1.15, t:110, name:'GOOD NEIGHBOUR' } },
        line:'Paid up. Smiled. Made sure everyone saw me smile.' },
      { label:'REFUSE', blurb:'It is not your culvert.',
        fx:{ coins:240, decree:{ cars:0.5, t:100, name:'UNPOPULAR' } },
        line:'It is a culvert. I did not break it. I am at peace.' },
    ] },
  { id:'tariff', w:1.0, need:{ routes:2 },
    head:'TARIFF ON OUT-OF-VALLEY EGGS',
    sub:'Protectionism arrives, wearing a rosette and a small hat',
    icon:'map',
    choices:[
      { label:'BACK THE TARIFF', blurb:'Good for you, briefly.',
        fx:{ decree:{ pay:1.4, cars:0.6, t:140, name:'PROTECTED' } },
        line:'Free trade is wonderful. So is a moat.' },
      { label:'OPPOSE IT', blurb:'Principles, and more traffic.',
        fx:{ feathers:9, decree:{ cars:2.4, pay:1.1, t:140, name:'OPEN ROAD' } },
        line:'Let them all come. Ours are better. Probably.' },
    ] },
];
const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));

const ROAD_EVENTS = [
  { id:'jam',    name:'Traffic Jam',  icon:'car',    slow:1.45, pay:1,    dur:120, col:'#e8542f', desc:'Everything crawls. Trips through here take half again as long.' },
  { id:'works',  name:'Roadworks',    icon:'hammer', slow:1.25, pay:1,    dur:200, col:'#f0a422', desc:'Cones and a mole with a flag. A quarter slower.' },
  { id:'fair',   name:'Egg Fair',     icon:'star',   slow:1,    pay:1.35, dur:150, col:'#ffd23f', desc:'The town wants eggs today. 35% more for every load here.' },
  { id:'storm',  name:'Storm',        icon:'water',  slow:1.5,  pay:1,    dur:90,  col:'#3fa7d6', desc:'Sheets of rain on the road. Half again as slow.' },
  { id:'parade', name:'Parade',       icon:'flag',   slow:1.6,  pay:1.15, dur:100, col:'#b06ee0', desc:'The whole town is in the street. Slow, but they buy.' },
  { id:'market', name:'Market Day',   icon:'coin',   slow:1.1,  pay:1.2,  dur:180, col:'#6ab04c', desc:'Stalls in the square. A fifth more for eggs.' },
];
const ROAD_EVENT_BY_ID = Object.fromEntries(ROAD_EVENTS.map(e => [e.id, e]));
const ROAD = {
  eventEvery: 110,        // seconds between something happening on some road
  weatherEvery: 75,       // seconds between the weather in a town changing
  factoryCostMult: 6,     // a town factory costs this much of the route to it (min below)
  factoryMin: 1500,
  factoryPay: 0.15,       // what a factory adds to every delivery to its town
  factoryIncome: 3,       // coins a minute per point of the town's multiplier
  rainSlow: 1.15,         // rain over a town slows a trip there
};
/* the weather each town can be having */
const TOWN_WEATHER = ['sun', 'sun', 'cloud', 'rain', 'sun', 'wind', 'fog'];

/* ---- the garage ---- */
const GARAGE_UPGRADES = {
  engine: { id:'engine', name:'Engine',     icon:'gear',    max:5, base:600,  growth:2.0, desc:'-8% round trip per level' },
  tyres:  { id:'tyres',  name:'Tyres',      icon:'wind',    max:4, base:400,  growth:2.0, desc:'road events slow you 20% less per level' },
  cargo:  { id:'cargo',  name:'Cargo Rack', icon:'crate',   max:5, base:800,  growth:2.1, desc:'+4 eggs per level' },
  cooler: { id:'cooler', name:'Egg Cooler', icon:'sparkle', max:4, base:1500, growth:2.2, desc:'+6% at the market per level: fresher eggs' },
  horn:   { id:'horn',   name:'Big Horn',   icon:'bolt',    max:1, base:250,  growth:1,   desc:'customers on the lay-by wait 20% longer' },
};
const GARAGE_KEYS = Object.keys(GARAGE_UPGRADES);
const CAR_DECALS = ['none', 'egg', 'stripe', 'flames', 'logo', 'stars'];
function garageCost(id, lvl) { const u = GARAGE_UPGRADES[id]; return Math.round(u.base * Math.pow(u.growth, lvl || 0)); }

/* ---- the founder's wardrobe ---- */
const COSMETICS = [
  /* hats */
  { id:'hat_top',    kind:'hat',   name:'Top Hat',      free:true },
  { id:'hat_none',   kind:'hat',   name:'Bare Ears',    free:true },
  { id:'hat_cap',    kind:'hat',   name:'Flat Cap',     unlock:'a_hire' },
  { id:'hat_straw',  kind:'hat',   name:'Straw Hat',    unlock:'a_harvest' },
  { id:'hat_crown',  kind:'hat',   name:'Crown',        unlock:'a_rich' },
  { id:'hat_beanie', kind:'hat',   name:'Beanie',       unlock:'a_rain' },
  { id:'hat_wizard', kind:'hat',   name:'Wizard Hat',   unlock:'a_genes' },
  { id:'hat_cowboy', kind:'hat',   name:'Ten Gallon',   unlock:'a_trips' },
  { id:'hat_halo',   kind:'hat',   name:'Halo',         unlock:'a_moon' },
  { id:'hat_chef',   kind:'hat',   name:'Chef Toque',   unlock:'a_cook' },
  /* suits */
  { id:'suit_black', kind:'suit',  name:'Black Suit',   free:true,  col:'#2c2a36', trim:'#e8542f' },
  { id:'suit_green', kind:'suit',  name:'Tycoon Green', unlock:'a_factory', col:'#2f8f4f', trim:'#1f5f33' },
  { id:'suit_red',   kind:'suit',  name:'Racing Red',   unlock:'a_garage', col:'#c9302f', trim:'#ffd23f' },
  { id:'suit_blue',  kind:'suit',  name:'Navy Pinstripe', unlock:'a_orders', col:'#2f4f9e', trim:'#c9ced6' },
  { id:'suit_purple',kind:'suit',  name:'Royal Purple', unlock:'a_species', col:'#7a3fb0', trim:'#ffd23f' },
  { id:'suit_gold',  kind:'suit',  name:'Solid Gold',   unlock:'a_tycoon',  col:'#e0a416', trim:'#fff3c4' },
  { id:'suit_pink',  kind:'suit',  name:'Bubblegum',    unlock:'a_breed',   col:'#ff5f9e', trim:'#fff8ec' },
  { id:'suit_white', kind:'suit',  name:'Ice White',    unlock:'a_park',    col:'#f2ece0', trim:'#3fa7d6' },
  /* glasses */
  { id:'gl_none',    kind:'glasses', name:'No Glasses', free:true },
  { id:'gl_round',   kind:'glasses', name:'Round Specs', unlock:'a_lab' },
  { id:'gl_star',    kind:'glasses', name:'Sparkle Shades', unlock:'a_factory' },
  { id:'gl_shades',  kind:'glasses', name:'Black Shades', unlock:'a_secret' },
  /* the thing in his hand */
  { id:'acc_coin',   kind:'acc',   name:'A Coin',       free:true },
  { id:'acc_none',   kind:'acc',   name:'Empty Paws',   free:true },
  { id:'acc_guitar', kind:'acc',   name:'Red Guitar',   unlock:'a_factory' },
  { id:'acc_cane',   kind:'acc',   name:'Cane',         unlock:'a_rich' },
  { id:'acc_egg',    kind:'acc',   name:'Golden Egg',   unlock:'a_golden' },
  { id:'acc_axe',    kind:'acc',   name:'Axe',          unlock:'a_trees' },
];
const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map(c => [c.id, c]));
const COSMETIC_KINDS = [
  { id:'hat', name:'HATS' }, { id:'suit', name:'SUITS' }, { id:'glasses', name:'GLASSES' }, { id:'acc', name:'IN HAND' },
];
const WARDROBE_DEFAULT = { hat:'hat_top', suit:'suit_black', glasses:'gl_none', acc:'acc_coin' };

/* ---- achievements: things worth a plaque, each one worth a cosmetic ---- */
const ACHIEVEMENTS = [
  { id:'a_first',   name:'First Egg',        icon:'egg',      desc:'Sweep your first egg.',                 goal:{ k:'stat', s:'collected', n:1 } },
  { id:'a_lab',     name:'Lab Coat',         icon:'flask',    desc:'Install five cubes in the Lab.',        goal:{ k:'skills', n:5 } },
  { id:'a_harvest', name:'Green Fingers',    icon:'scythe',   desc:'Harvest ten crops.',                    goal:{ k:'stat', s:'harvested', n:10 } },
  { id:'a_hire',    name:'The Boss',         icon:'hands',    desc:'Hire your first worker.',               goal:{ k:'stat', s:'hired', n:1 } },
  { id:'a_trips',   name:'Road Warrior',     icon:'truck',    desc:'Send fifty loads to market.',           goal:{ k:'stat', s:'trips', n:50 } },
  { id:'a_orders',  name:'Regular Custom',   icon:'doc',      desc:'Fill twenty roadside orders.',          goal:{ k:'stat', s:'orders', n:20 } },
  { id:'a_rain',    name:'Rain Or Shine',    icon:'water',    desc:'Sit through ten showers.',              goal:{ k:'stat', s:'rains', n:10 } },
  { id:'a_species', name:'Collector',        icon:'book',     desc:'Find twenty-five species.',             goal:{ k:'disc', n:25 } },
  { id:'a_breed',   name:'Matchmaker',       icon:'cupid',    desc:'Breed ten eggs in love nests.',         goal:{ k:'stat', s:'bred', n:10 } },
  { id:'a_genes',   name:'Mad Science',      icon:'dna',      desc:'Edit five hens in the Gene Lab.',       goal:{ k:'stat', s:'edits', n:5 } },
  { id:'a_golden',  name:'Midas Beak',       icon:'sparkle',  desc:'Earn a hundred thousand coins.',        goal:{ k:'stat', s:'coinsEarned', n:1e5 } },
  { id:'a_rich',    name:'Super Rich',       icon:'crown',    desc:'Earn a million coins.',                 goal:{ k:'stat', s:'coinsEarned', n:1e6 } },
  { id:'a_tycoon',  name:'Egg Tycoon',       icon:'coin',     desc:'Earn a hundred million coins.',         goal:{ k:'stat', s:'coinsEarned', n:1e8 } },
  { id:'a_factory', name:'How Bad Can I Be', icon:'gear',     desc:'Build twenty things and lay eight belts.', goal:{ k:'multi', all:[{ k:'stat', s:'builtN', n:20 }, { k:'built', t:'belt', n:8 }] } },
  { id:'a_trees',   name:'Lumberjack',       icon:'tree',     desc:'Plant thirty decorations.',             goal:{ k:'deco', n:30 } },
  { id:'a_garage',  name:'Grease Monkey',    icon:'gear',     desc:'Buy five garage upgrades.',             goal:{ k:'stat', s:'upgrades', n:5 } },
  { id:'a_cook',    name:'Short Order',      icon:'pan',      desc:'Sell fifty dishes.',                    goal:{ k:'stat', s:'dishes', n:50 } },
  { id:'a_cannery', name:'Preserved',        icon:'crate',    desc:'Can twenty-five goods at the Cannery.',  goal:{ k:'stat', s:'goods', n:25 } },
  { id:'a_park',    name:'Showman',          icon:'ticket',   desc:'Two hundred visitors through the park.', goal:{ k:'stat', s:'visitors', n:200 } },
  { id:'a_secret',  name:'Nosy',             icon:'key',      desc:'Find six secrets.',                     goal:{ k:'stat', s:'secrets', n:6 } },
  { id:'a_quests',  name:'Yes Boss',         icon:'star',     desc:'Claim twenty quests.',                  goal:{ k:'stat', s:'questsDone', n:20 } },
  { id:'a_land',    name:'Landlord',         icon:'house',    desc:'Own eight plots.',                      goal:{ k:'plots', n:8 } },
  { id:'a_crew',    name:'Full Roster',      icon:'person',   desc:'Employ ten workers at once.',           goal:{ k:'staff', n:10 } },
  { id:'a_train',   name:'Staff Training',   icon:'medal',    desc:'Train a worker ten times at the HR Office.', goal:{ k:'stat', s:'trained', n:10 } },
  { id:'a_present', name:'Unwrapped',        icon:'heart',    desc:'Open ten presents from the limousine.', goal:{ k:'stat', s:'presents', n:10 } },
  { id:'a_abroad',  name:'Passport',         icon:'globe',    desc:'Open three countries.',                 goal:{ k:'regions', n:3 } },
  { id:'a_moon',    name:'Moonlighting',     icon:'moon',     desc:'Open the Moon.',                        goal:{ k:'region', id:'moon' } },
  { id:'a_dino',    name:'Life Finds A Way', icon:'dino',     desc:'Hatch a dinosaur.',                     goal:{ k:'stat', s:'dinos', n:1 } },
  { id:'a_ages',    name:'Old Money',        icon:'scroll',   desc:'Reach the Electric Age.',               goal:{ k:'age', id:'electric' } },
  { id:'a_mama',    name:'Grandma\'s Boy',   icon:'crown',    desc:'Feed Mama fifty times.',                goal:{ k:'stat', s:'mamaFed', n:50 } },
];
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/* ---- settings and slots ---- */
const SETTINGS_DEFAULT = { sound:true, music:true, volume:0.7, news:false, shake:true, dayNight:true, particles:true, bigUI:false, showFps:false, autosave:true };
const SAVE_SLOTS = 3;

/* ---- the founder's sequence on the main menu: what he sings while he does it ---- */
const MENU_ACTS = [
  { id:'dance',  secs:5.0, line:'I AM ONLY AS BAD AS THE MARKET' },
  { id:'chop',   secs:4.2, line:'EVERY TREE IS A CHAIR IN WAITING' },
  { id:'build',  secs:4.6, line:'THE SMOKE MEANS IT IS WORKING' },
  { id:'punch',  secs:3.6, line:'AND EVERY HEN IS ON THE PAYROLL' },
];
