# Inf Egg Co.

A cozy 2D pixel-art incremental game. You are a floating hand tending an egg ranch that grows into a whole valley. Every pixel is generated procedurally in code - no image files, no emoji, no icon fonts.

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
- **Incubators are the only way to hatch.** Eggs go in, chickens burst out along with feathers.
- **Feathers are physical** - they flutter out of every hatch and sometimes when you scoop. Sweep them up; they are your research currency.
- The **Lab shack** opens the research grid: a tree of blocky hexagons across seven branches (Crew, Gather, Hens, Hatchery, Love, Factory, Market), 48 nodes deep, whose canopy fills in as you unlock it. Drop a chicken on the Lab to graduate it for bonus feathers.
- **Love Nests breed chickens**: carry two in, wait for the hearts, and get a fancier egg. Two Divine parents can lay a rainbow egg, which hatches the 12 breed-only Secret species (112 species total in the Chickenpedia bookstand).
- **Buy land from FOR SALE signs** - six plots with their own scenery (sunflower field, lavender meadow, mushroom glen, berry grove, rocky pines), each raising chicken capacity and giving room for a bigger factory.
- Mama's signpost upgrades her egg rarity through eight tiers; laid eggs can also mutate a tier up.

### Hiring a crew

Research **Hire Crew**, build a **Staff Hut**, then tap it to hire workers. Everyone draws a wage in coins per second - let the payroll run dry and the whole crew downs tools until you can pay again.

| Worker | What they do |
| --- | --- |
| Farmhand | Walks the field gathering loose eggs and runs them to a silo, incubator or the truck. |
| Feeder | Scatters seed so the flock keeps laying at double speed. |
| Cull-Bot | Retires chickens you mark as unwanted, recycling them into a pile of feathers. |
| Match-Bot | Carries pairs of chickens into any empty love nest so breeding never stops. |

Mark a chicken for retirement from its inspect panel, or set an **auto-mark** rule in the Staff Hut so anything born below a tier you choose is flagged the moment it hatches.

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

Autosaves to your browser, with up to 8 hours of offline laying and hatching.

### Controls

| Input | Action |
| --- | --- |
| tap chicken / Mama | pet, which lays an egg |
| hold and drag a chicken | carry it (drop on a Love Nest to breed, on the Lab to graduate) |
| drag with the basket | sweep up eggs and feathers |
| drag empty grass, WASD, or wheel | pan the map |
| tap Lab / bookstand / signposts / truck | research, chickenpedia, upgrades, sell |
| tap a Staff Hut | hire and dismiss crew |
| inspect tool on empty grass | the full ranch report |
| `1`-`5` tools, `R` rotate, `Esc` close | shortcuts |

## The art

All sprites are generated at runtime by `js/sprites.js`:

- a seeded RNG gives every tree, bush, rock and mushroom its own silhouette, so no two are identical;
- blob masks are shaded automatically (upper-left light, lower-right shade, dithered rims) to give volume;
- chickens get a procedural volume pass, wing creases and beak shading on top of their 16x16 templates;
- the ground is painted from smooth value noise into an ImageData buffer: banded grass tones, dithered borders, worn dirt paths and a shoreline-graded pond;
- a 3x5 pixel font draws every in-world label, so signs and readouts stay crisp at any zoom;
- UI icons are a set of hand-authored 10x10 pixel glyphs rendered to canvases - the interface has no emoji at all.

## Run it

No build step, no dependencies - plain HTML/CSS/JS.

```
open index.html        # or serve the folder with any static server
```

## Project layout

| File | What it is |
| --- | --- |
| `index.html` | shell and the small HUD |
| `style.css` | cozy pixel-ranch styling |
| `js/data.js` | tiers, economy, 112 species, nine buildings, staff roster, land plots, 48 research nodes |
| `js/sprites.js` | the procedural pixel-art engine (font, icons, foliage, chickens, staff, machines, hexes) |
| `js/game.js` | world simulation: plots, chickens, eggs, plumes, breeding, staff AI, wages, belts, silos, truck |
| `js/ui.js` | camera renderer, five tools, inspect and hiring panels, stations, hex research grid, particles, sound |
