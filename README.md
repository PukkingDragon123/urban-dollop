# Inf Egg Co.

A cozy 2D pixel-art incremental game. You are a floating hand tending an egg ranch that grows into a whole valley: a bare field, a slow old hen and a bicycle at the start; farms, factories, a crew and a fleet by the end. Every pixel is generated procedurally in code - the two pixel fonts included - so there are no image files, no emoji and no icon fonts.

It opens on an animated dusk title screen: Mama Hen and her chicks on the hills, eggs drifting up through the sky, and a tally of how many of the 112 chickens you have found so far.

![Inf Egg Co. screenshot](docs/screenshot.png)

## How it plays

The land starts **bare** - sun-bleached scrub and nothing else. No pond, no paths, not a stone scattered for you. Every tree, path, terrace and pond on your ranch is one you painted there yourself. Mama Hen lays slowly now (about a minute between eggs), petting her is the quick way to a first clutch, and you pedal the first eggs to the village on a **bicycle** that carries four. The money buys seed; the seed becomes feed; the feed grows chicks into hens; the hens lay; the eggs buy a cart, then a van, then routes to bigger towns that pay more. Everything else grows out of that loop.

You are the hand. Everything on the field is touchable:

- **Hand** - tap chickens (and Mama Hen) to pet them for an instant egg; hold and drag to pick chickens up and carry them; grab single eggs; drag empty grass to pan the camera.
- **Basket** - hold and sweep to magnet eggs into your basket (it has a real capacity). Release over the truck or an incubator to unload.
- **Feed** - scatter pellets from the barn; chicks eat to grow up, grown hens eat to fill their bellies and lay twice as fast.
- **Farm** - the landscaping tool, in four tabs. GROUND shapes the land with a **paint brush**, PLANT sows crops, TEND waters and harvests, DECOR plants things purely because they look nice. Five brush sizes, and a round brush outline sits under your finger showing exactly what it will cover.
- **Build** - incubators, love nests, staff huts, silos, vacuums, blowers, sorters, conveyors and fences. Drag to paint belt lines.
- **Inspect** - tap any hen, worker, machine or patch of grass to read its live stats. Empty grass gives you the whole ranch report: eggs per minute, coins per minute, wages, capacity, silo stock, species found.

Menus are places, not panels:

- The **truck** on the road sells eggs - load it, tap it, and it drives to market and returns with coins.
- **Incubators are the only way to hatch.** The egg inside rocks harder and harder as hairline cracks spread across the shell, then it splits: the two halves tumble away, a sparkle ring pops, and a chick squashes and stretches its way up out of the wreck, trailing feathers.
- **Feathers are physical** - they flutter out of every hatch and sometimes when you scoop. Sweep them up; they are your research currency.
- The **Lab shack** puts you at a desk. There is a keyboard, a mug, sticky notes, and an old beige monitor that boots EGGOS and runs SKILLMAP.EXE: research as a **map of blocky hexagons** joined by paths, fanning out from the kernel in the middle along eight modules (crew, gather, hens, hatch, love, factory, market, farm), 73 packages in all. A pixel mouse pointer follows your finger across the glass. Only hexes you have installed or could install right now are lit; the rest of the map is dark, with dotted stubs and question marks hinting where the paths go on. Gold hexes install with one click on the README window's button; module chips on the taskbar pan the map to each branch. Drop a chicken on the Lab to graduate it for bonus feathers.
- **The Index bookstand** opens an actual book - cream pages, a leather spine, coloured bookmark tabs down the edge, a dog-eared corner, and a page flip when you change tab. Six tabs: every chicken you have found (the rest still silhouettes), your **Crew**, your **Crops**, your **Routes**, what each egg tier is worth, and the **Diary** that writes itself.
- **Love Nests breed chickens**: carry two in, wait for the hearts, and get a fancier egg. Two Divine parents can lay a rainbow egg, which hatches the 12 breed-only Secret species (112 species total in the Chickenpedia bookstand).
- **Buy land from FOR SALE signs** - twelve plots across a 1024x624 valley, each with its own scenery (sunflower field, lavender meadow, mushroom glen, berry grove, rocky pines, orchard, wet reeds, wildflower meadow, pinewood, thicket, prairie), and each raising chicken capacity and giving room for a bigger factory.
- Mama's signpost upgrades her egg rarity through eight tiers; laid eggs can also mutate a tier up.

### Landscaping

The ranch is a sandbox, and the GROUND tab is a **paint brush**, not a block placer. Pick a brush size, hold, and drag: the ground follows your hand in one continuous stroke, with no gaps however fast you sweep. Terrain is stored on an 8-pixel grid, half the size of a tile, and drawn per pixel through a weighted vote of each point's neighbours - so a stroke comes out with a soft, dithered, organic edge instead of a staircase. Ponds get an undulating shore, terraces grow an earth cliff only where they are actually exposed, and Level is just another brush that rubs the paint back off.

| Tool | What it does |
| --- | --- |

| Tool | What it does |
| --- | --- |
| Till | Turns grass into soil you can plant in (a tile at a time, not a brush). |
| Path | Packed dirt. The crew walk a quarter faster on it. |
| Stone Path | Flagstones. Faster still, and very tidy. Research Paving Stones. |
| Raise | Banks the ground up into a grassy terrace with an earth cliff. Research Terracing. |
| Dig Pond | Scoops out water with an undulating shore. Nothing walks through it. Research Pond Digging. |
| Level | Rubs the paint back off, down to plain grass. |

The DECOR tab is a garden centre: oaks, pines, apple trees, bushes, rocks, stumps, flowers, grass tufts, clover, mushrooms, reeds, lavender and sunflowers, each a few coins and each generated with its own silhouette. Lift anything again with CLEAR and get half your money back. Landscaping is deliberately far more permissive than building - anywhere you own, off the road, that is not already spoken for.

### Farming and growing up

Nothing lays until it has eaten. Every hatchling is a **chick**: it does not lay, and it follows the smell of feed until it has eaten enough pellets (three, fewer with research) to grow up - a little green bar over its head shows how close it is. Grown hens keep a belly that empties over a couple of minutes; an empty belly halves their laying until they eat again, and a hungry hen holds up a little seed bubble to tell you.

Feed comes from the ground. Till a tile, plant a seed packet, water it (or let a **Well** or **Sprinkler** do it) and harvest when it sparkles. Each harvest hands back two seeds of its kind and a pile of pellets into the **Feed Barn**; overflow spills on the grass where the flock finds it.

| Crop | Grows in | Feed | Notes |
| --- | --- | --- | --- |
| Clover | 28s | 4 | Cheap ground cover, chicks nibble it up. |
| Wheat | 42s | 7 | Quick and dependable. |
| Corn | 80s | 16 | Research Corn Seed. Tall, slow and generous. |
| Sunflower | 120s | 30 | Research Sunflower Seed. The richest feed. |
| Berry Bush | 70s | 10 | Research Berry Bushes. Regrows after every picking. |

Watering doubles growth. **Feed Troughs** hold a dozen pellets the flock helps itself to, and Feeders on the crew keep them topped up; a **Coop** adds room and grows nearby chicks twice as fast; a **Mill** adds a quarter to every harvest on the ranch. Farmhands harvest ripe crops whenever the grass is clear of eggs.

### Logistics: from a bicycle to a railcar

Wheels and routes are arranged from a **Logistics HQ** - a dispatch office with a roller door and a wall map. Until you build one, the depot sign by the road can only send the load you already have; the garage and the routes stay shut.

Inside, the wall of the office carries a **hand-drawn map of the valley**: old paper pinned to a corkboard with pushpins, inked in a wobbly line. Your ranch is marked with a red X, the road winds through every town, hills and a river and a coastline are sketched in, and there is a compass rose in the corner. Towns you have opened are drawn out building by building; the rest sit under a bank of cloud with a question mark. The active route is inked in crawling red dashes, and while a load is out your actual vehicle drives along it. Tap a town on the map to switch the route there, or to survey the road and open it. Six vehicles - bike, pedal cart, egg van, ranch truck, big lorry and the Egg Express railcar - each carry more and drive faster. Five cities sit further down the road, and each pays a steeper premium, sharper still for rare eggs:

| City | Pays | Notes |
| --- | --- | --- |
| Cluckton | x1.00 | The village down the lane. |
| Yolkford | x1.35 | A market town with a Saturday egg fair. |
| Featherton | x1.90 | Restaurants pay well for the good stuff. |
| New Shellington | x2.80 | The capital. Rare eggs fetch a fortune. |
| Port Albumen | x4.20 | Ships leave for the wide world. |

Routes open in order, and each one is another place your flyers get read, so more cities means more applicants per flyer run. While a load is out, a little window at the top of the screen shows the drive: hills rolling by, the destination skyline rising, the sale, and the ride home.

### The crew

Nobody wanders onto the ranch looking for work. Research **Recruiting**, build a **Staff Hut** and a **Noticeboard**, then **print flyers** and pin them up. A minute later folk walk in from the road and queue up in front of the board, each with a little speech bubble and a patience bar - tap one to read their stats and hire them into a role on the spot. Each applicant is generated from scratch: their own name, their own face and clothes, up to two quirks, and five stats rolled lopsided so everybody is good at something.

| Stat | What it changes |
| --- | --- |
| SPEED | how fast they cross the field |
| CARRY | eggs held per trip |
| CARE | how well the flock takes to them |
| TECH | how much faster machines near them run |
| GRIT | how long they last before wanting a breather |

You pick the role, and roles lean on different stats - so the same applicant is a bargain in one job and a waste in another.

| Role | What they do | Leans on |
| --- | --- | --- |
| Farmhand | Walks the field gathering loose eggs and runs them to a silo, hatchery or the truck. | SPEED + CARRY |
| Feeder | Scatters seed so the flock keeps laying at double speed. | CARE + SPEED |
| Packer | Shuttles eggs out of silos and packs the truck to the brim. | CARRY + GRIT |
| Technician | Patrols the line; every machine inside their aura runs faster. | TECH + GRIT |
| Keeper | Pets the flock all day, so hens lay on their own more often. | CARE + GRIT |

Quirks are rolled too, good and bad: **Tireless** never needs a break, **Thrifty** works for 30% less, **Strong Back** adds carry, **Butterfingers** fumbles one egg in eight, **Hard Bargain** wants 60% more pay. Wages scale with how good somebody is, so a five-star hire costs five-star money - and if the payroll runs dry the whole crew downs tools until you can pay again. Everyone tires as they work and takes a breather at the hut; **Overtime Pay** and high GRIT keep them going longer.

**Robots are built, not recruited** - and there is a robot for every job. The Robot Workshop assembles Gather-Bot, Seed-Bot, Haul-Bot, Fix-Bot, Cuddle-Bot, Cull-Bot and Match-Bot: round, fat, cheerful little machines that hover along on a puff of air. Each is drawn from a barrel belly with a lit job badge, a domed head with bolt ears and a collar, a wraparound visor whose eyes suit its temperament (Cuddle-Bot has hearts, Cull-Bot has crosses), rosy cheeks, a hat of its own - cap, straw brim, bow, or a bulb on an antenna - and its trade held in one swinging hand: an egg, a crate, a scoop of grain, a brass spanner, a heart, a red-tipped baton. They never tire, never ask for a raise, and can be reassigned between any roles - including the two jobs (culling and matchmaking) that only a robot will do.

**Payroll is paperwork.** Every crew screen is a stack of forms on ruled paper with a red margin line: applicants arrive as an APPLICATION with a photo box, dotted NAME / RATING / ASKS fields, a ratings block and a row of tick boxes for the job you want to give them, all under a rotated PENDING stamp. Hired staff become a numbered STAFF RECORD stamped HIRED; robots are a BUILD ORDER stamped BUILT. You hire someone by ticking a box on their form.

The crew is always two taps away: there is a crew button on the toolbelt that badges up when applicants are waiting or wages have gone unpaid, the same board sits in the Index, and the Staff Hut opens it too. Move anybody between roles at any time from their card.

### The rest of the factory

| Building | What it does |
| --- | --- |
| Incubator | The only way eggs hatch. |
| Love Nest | Breeds two chickens into a fancier egg. |
| Staff Hut | Hire crew here; each hut adds three staff slots. |
| Egg Silo | Buffers up to 240 eggs off the belts and auto-loads the parked truck. |
| Vacuum Bot | Sucks nearby ground eggs onto the belt it faces. |
| Air Blower | Herds loose eggs across the grass - no belt required. |
| Sorter | Sits on a belt: rare eggs carry straight on, common ones peel off to the side. Set the rarity threshold from its inspect panel. |
| Conveyor | Moves eggs to the truck, a silo or an incubator. |
| Fence | Chickens will not cross it, so you can pen the flock where you want them. |
| Grand Hatchery | A 3x3 bank of 24 drawers that works three eggs at a time, each at double speed. |
| Splitter | On a belt: sends eggs left and right in turn, so two lines fill evenly. |
| Truck Loader | Parks by the road, buffers twenty eggs off the belts and shovels them straight into the truck. |
| Feed Barn | Stores 160 more pellets of feed. |
| Feed Trough | Holds a dozen pellets; the flock helps itself and Feeders keep it full. |
| Well / Sprinkler | Keep every crop in a circle watered. |
| Mill | Every harvest on the ranch yields 25% more feed. |
| Coop | +6 chicken room; chicks nearby grow up twice as fast. |
| Noticeboard | Where flyers get pinned and applicants queue. |
| Logistics HQ | A dispatch office with a wall map. Vehicles and routes are bought here. |

### The interface

Big, chunky and almost wordless. Four fat pills in the corner - coins, feathers, feed, chickens held out of capacity - and a row of oversized toolbelt keys with nothing but a picture on each. The feed pill goes red when the barn is empty; the capacity pill goes red when the coops are full, which is when hatching stops.

Panels are picture-first: crew members show five coloured stat bars with an icon apiece instead of labels, vehicles and routes show their art with a capacity and a multiplier, and statistics are rows of counters rather than sentences. Every button is a fat pixel key that lifts when you hover and squashes when you press.

The build and landscaping palettes are one short **dock** along the foot of the stage - tabs down the left, a shelf of big thumbnails that scrolls sideways, brush sizes and counters on the right - so the field stays visible instead of sitting behind a wall of buttons. The DECOR shelf is styled as a garden centre, every plant on a wooden shelf with its own price tag. While you are mid-stroke the dock fades right down and stops taking clicks, and the camera is allowed to scroll a little past the foot of the map, so no strip of your land is ever stuck behind the UI.

Nothing uses the browser's own tooltips. Hovering anything pops a **cartoon speech bubble** with a fat ink outline and a tail that points back at what you asked about, flipping above or below depending on where there is room.

Autosaves to your browser, with up to 8 hours of offline laying and hatching.

### Controls

| Input | Action |
| --- | --- |
| tap chicken / Mama | pet, which lays an egg |
| hold and drag a chicken | carry it (drop on a Love Nest to breed, on the Lab to graduate) |
| drag with the basket | sweep up eggs and feathers |
| drag empty grass, WASD, or wheel | pan the map |
| tap Lab / bookstand / signposts / truck | research, the Index and Diary, upgrades, sell |
| tap the crew button | flyers, applicants and who is on the payroll |
| tap an applicant by the board | read their stats, hire them into a role |
| tap the depot sign | opens the Logistics HQ: garage, routes and the wall map |
| tap a town on the wall map | switch the route there, or survey the road to open it |
| farm tool, drag | brush paths, terraces and ponds, or place crops and decorations |
| tap a Staff Hut | print flyers, hire, reassign and dismiss crew |
| inspect tool on empty grass | the full ranch report |
| `1`-`6` tools, `R` rotate, `Esc` close | shortcuts |

## The art

All sprites are generated at runtime by `js/sprites.js`:

- a seeded RNG gives every tree, bush, rock and mushroom its own silhouette, so no two are identical;
- blob masks are shaded automatically (upper-left light, lower-right shade, dithered rims) to give volume;
- chickens get a procedural volume pass, wing creases and beak shading on top of their 16x16 templates;
- the ground is painted from smooth value noise into an ImageData buffer: banded grass tones, dithered borders and worn scrub;
- two hand-authored pixel fonts, drawn glyph by glyph in code: a tight 3x5 face for labels that have to fit inside a tile, and a 5x6 display face with drop shadows and an eight-way outline mode for signs, titles and the logo;
- hatching is animated from generated art too: a per-tier crack overlay in three stages, then the two shell halves as separate sprites that tumble apart under their own rotation;
- every hire is drawn from a little record of skin, hair colour, hair style, shirt, trousers, boots and hat, so no two people on the ranch look alike;
- the Lab is a whole desk scene drawn the same way - a beige monitor with a phosphor mesh, scanlines and a rolling band, a keyboard whose keys light up when something installs, a steaming mug, sticky notes, and a pixel mouse pointer;
- crops are drawn per stage from a seed, soil tiles get their own clods and furrows, and five vehicles and five city skylines are generated for the delivery window;
- painted terrain is resolved per pixel rather than per tile: each point takes a distance-weighted vote of the nine cells around it, thresholds it with a dither so the boundary breaks up, and lands in its own offscreen layer that is repainted only under the brush. That is what gives a stroke its soft edge - ponds wander their shoreline, dirt frays into the grass, and a terrace lifts by a few pixels and drops a mottled earth bank down the sides that are actually exposed;
- the valley map is inked with a wobbly-line routine over generated parchment, complete with fibres, foxed edges, cloud banks and a compass rose;
- robots are drawn from a chassis record - shell colour, trim, visor, hat, temperament - into a 24-row sprite with five rows of headroom reserved for the hat, so nothing gets shaved off by the edge of the canvas;
- UI icons are a set of 61 hand-authored 10x10 pixel glyphs rendered to canvases - the interface has no emoji at all.

## Run it

No build step, no dependencies - plain HTML/CSS/JS.

```
open index.html        # or serve the folder with any static server
```

## Project layout

| File | What it is |
| --- | --- |
| `index.html` | shell, the four-pill HUD, the title screen, the trip window, the crew board, the depot and the book |
| `style.css` | cozy pixel-ranch styling |
| `js/data.js` | tiers, economy, 112 species, twenty buildings in four sections, six terrain tools, thirteen decorations, five crops, six vehicles, five cities, five crew stats, seven roles and seven robot chassis, twelve quirks, twelve land plots, 76 research packages and their hex-map layout |
| `js/sprites.js` | the procedural pixel-art engine (two fonts, icons, foliage, chickens and chicks, crops, soil, paths, terraces and ponds, procedural people, cute robots, machines, vehicles, skylines, parchment and ink, CRT chrome, hexes) |
| `js/game.js` | world simulation: twelve plots, brush-painted terrain and decoration, chicks that grow and hens that get hungry, farming, feed, flyers and applicants who walk to the board, per-role crew AI for people and robots, stamina, wages, belts, splitters, silos, loaders, hatcheries, the HQ, vehicles, routes and trips, diary |
| `js/ui.js` | title screen, camera renderer, six tools and the two-dock palettes, the terrain paint layer, speech-bubble tooltips, the job-application crew forms, hatch animation, inspect, the crew board and robot workshop, the book, the HQ and its hand-drawn wall map, the trip window, the Lab desk and its hex map, particles, sound |
