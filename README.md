# Inf Egg Co.

A cozy 2D pixel-art incremental game. You are a floating hand tending an egg ranch that grows into a whole valley. Every pixel is generated procedurally in code - the two pixel fonts included - so there are no image files, no emoji and no icon fonts.

It opens on an animated dusk title screen: Mama Hen and her chicks on the hills, eggs drifting up through the sky, and a tally of how many of the 112 chickens you have found so far.

![Inf Egg Co. screenshot](docs/screenshot.png)

## How it plays

You are the hand. Everything on the field is touchable:

- **Hand** - tap chickens (and Mama Hen) to pet them for an instant egg; hold and drag to pick chickens up and carry them; grab single eggs; drag empty grass to pan the camera.
- **Basket** - hold and sweep to magnet eggs into your basket (it has a real capacity). Release over the truck or an incubator to unload.
- **Feed** (research to unlock) - sprinkle seed; chickens waddle over, snack, and lay twice as fast.
- **Build** - incubators, love nests, staff huts, silos, vacuums, blowers, sorters, conveyors and fences. Drag to paint belt lines.
- **Inspect** - tap any hen, worker, machine or patch of grass to read its live stats. Empty grass gives you the whole ranch report: eggs per minute, coins per minute, wages, capacity, silo stock, species found.

Menus are places, not panels:

- The **truck** on the road sells eggs - load it, tap it, and it drives to market and returns with coins.
- **Incubators are the only way to hatch.** The egg inside rocks harder and harder as hairline cracks spread across the shell, then it splits: the two halves tumble away, a sparkle ring pops, and a chick squashes and stretches its way up out of the wreck, trailing feathers.
- **Feathers are physical** - they flutter out of every hatch and sometimes when you scoop. Sweep them up; they are your research currency.
- The **Lab shack** boots **EGGOS**, a little CRT terminal: seven modules down the left (crew.sys, gather.sys, hens.sys, hatch.sys, love.sys, fact.sys, mrkt.sys) and installable packages on the right, 60 of them. A package only appears once its prerequisite is installed, so the screen always shows exactly what you can do right now and counts the rest as encrypted. Tap a cost chip to install on the spot. Drop a chicken on the Lab to graduate it for bonus feathers.
- **The Index bookstand** keeps four tabs: every chicken you have found (with the ones you have not still blacked out as silhouettes), your **Crew**, what each egg tier is worth, and the **Diary** - a running log that writes itself every time something happens for the first time.
- **Love Nests breed chickens**: carry two in, wait for the hearts, and get a fancier egg. Two Divine parents can lay a rainbow egg, which hatches the 12 breed-only Secret species (112 species total in the Chickenpedia bookstand).
- **Buy land from FOR SALE signs** - twelve plots across a 1024x624 valley, each with its own scenery (sunflower field, lavender meadow, mushroom glen, berry grove, rocky pines, orchard, wet reeds, wildflower meadow, pinewood, thicket, prairie), and each raising chicken capacity and giving room for a bigger factory.
- Mama's signpost upgrades her egg rarity through eight tiers; laid eggs can also mutate a tier up.

### The crew

Nobody wanders onto the ranch looking for work. Research **Recruiting**, build a **Staff Hut**, then **print flyers** and pin them up around the valley. A minute later folk start turning up at the hut, and each one is generated from scratch: their own name, their own face and clothes, up to two quirks, and five stats rolled lopsided so everybody is good at something.

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

**Robots are built, not recruited.** Assemble Cull-Bots (they retire chickens you mark) and Match-Bots (they keep love nests full) at the hut - they never tire and never ask for a raise.

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

### The HUD

Three pills float in the corner and that is nearly the whole interface: coins, feathers, and how many chickens the ranch is holding out of what it can hold. The capacity pill turns red when the coops are full, which is when hatching stops - buy land or research **Bigger Flock** to make room.

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
| tap a Staff Hut | print flyers, hire, reassign and dismiss crew |
| inspect tool on empty grass | the full ranch report |
| `1`-`5` tools, `R` rotate, `Esc` close | shortcuts |

## The art

All sprites are generated at runtime by `js/sprites.js`:

- a seeded RNG gives every tree, bush, rock and mushroom its own silhouette, so no two are identical;
- blob masks are shaded automatically (upper-left light, lower-right shade, dithered rims) to give volume;
- chickens get a procedural volume pass, wing creases and beak shading on top of their 16x16 templates;
- the ground is painted from smooth value noise into an ImageData buffer: banded grass tones, dithered borders, worn dirt paths and a shoreline-graded pond;
- two hand-authored pixel fonts, drawn glyph by glyph in code: a tight 3x5 face for labels that have to fit inside a tile, and a 5x6 display face with drop shadows and an eight-way outline mode for signs, titles and the logo;
- hatching is animated from generated art too: a per-tier crack overlay in three stages, then the two shell halves as separate sprites that tumble apart under their own rotation;
- every hire is drawn from a little record of skin, hair colour, hair style, shirt, trousers, boots and hat, so no two people on the ranch look alike;
- the Lab terminal is drawn the same way as everything else - a chunky plastic bezel with corner screws, a phosphor mesh, scanlines and a bright band rolling down the tube;
- UI icons are a set of 53 hand-authored 10x10 pixel glyphs rendered to canvases - the interface has no emoji at all.

## Run it

No build step, no dependencies - plain HTML/CSS/JS.

```
open index.html        # or serve the folder with any static server
```

## Project layout

| File | What it is |
| --- | --- |
| `index.html` | shell, the three-pill HUD, the title screen, the crew board and the Index |
| `style.css` | cozy pixel-ranch styling |
| `js/data.js` | tiers, economy, 112 species, twelve buildings, five crew stats, seven roles, twelve quirks, procedural name and look tables, twelve land plots, 60 research packages |
| `js/sprites.js` | the procedural pixel-art engine (two fonts, icons, foliage, chickens, procedural people, robots, machines, cracking shells, CRT chrome) |
| `js/game.js` | world simulation: twelve plots, chickens, eggs, plumes, breeding, flyers and applicants, per-role crew AI, stamina, wages, belts, splitters, silos, loaders, hatcheries, truck, diary |
| `js/ui.js` | title screen, camera renderer, five tools, hatch animation, inspect, the crew board, the Index, the EGGOS terminal, particles, sound |
