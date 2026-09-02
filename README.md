# Inf Egg Co.

A cozy 2D pixel-art incremental game. You are a floating hand tending an egg ranch that grows into a whole valley. Every pixel is generated procedurally in code - the two pixel fonts included - so there are no image files, no emoji and no icon fonts.

It opens on an animated dusk title screen: Mama Hen and her chicks on the hills, eggs drifting up through the sky, a duck flapping past, and a tally of how many of the 112 chickens you have found so far.

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
- The **Lab shack** opens the research grid: a tree of blocky hexagons across seven branches (Crew, Gather, Hens, Hatchery, Love, Factory, Market), 48 nodes deep, whose canopy fills in as you unlock it. Drop a chicken on the Lab to graduate it for bonus feathers.
- **The Index bookstand** keeps four tabs: every chicken you have found (with the ones you have not still blacked out as silhouettes), the ducks you have met, what each egg tier is worth, and the **Diary** - a running log that writes itself every time something happens for the first time.
- **Odd-job ducks** waddle up to the pond bank and wait. Tap one to hear the job (sweep up eggs, hatch chickens, gather feathers, run eggs to market, pet the flock, breed in a love nest), watch the progress bar fill on its own as you play, then come back for coins and feathers. Each duck you help pays better than the last, and there are eight of them to meet.
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

### The HUD

Three pills float in the corner and that is the whole interface: coins, feathers, and how many chickens the ranch is holding out of what it can hold. The capacity pill turns red when the coops are full, which is when hatching stops - buy land or research **Bigger Flock** to make room.

Autosaves to your browser, with up to 8 hours of offline laying and hatching.

### Controls

| Input | Action |
| --- | --- |
| tap chicken / Mama | pet, which lays an egg |
| hold and drag a chicken | carry it (drop on a Love Nest to breed, on the Lab to graduate) |
| drag with the basket | sweep up eggs and feathers |
| drag empty grass, WASD, or wheel | pan the map |
| tap Lab / bookstand / signposts / truck | research, the Index and Diary, upgrades, sell |
| tap a duck by the pond | take on an odd job and claim the reward |
| tap a Staff Hut | hire and dismiss crew |
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
- UI icons are a set of 53 hand-authored 10x10 pixel glyphs rendered to canvases - the interface has no emoji at all.

## Run it

No build step, no dependencies - plain HTML/CSS/JS.

```
open index.html        # or serve the folder with any static server
```

## Project layout

| File | What it is |
| --- | --- |
| `index.html` | shell, the three-pill HUD, the title screen and the Index |
| `style.css` | cozy pixel-ranch styling |
| `js/data.js` | tiers, economy, 112 species, nine buildings, staff roster, land plots, 48 research nodes, eight ducks and their six job types |
| `js/sprites.js` | the procedural pixel-art engine (two fonts, icons, foliage, chickens, ducks, staff, machines, cracking shells, hexes) |
| `js/game.js` | world simulation: plots, chickens, eggs, plumes, breeding, staff AI, wages, belts, silos, truck, ducks, quests, diary |
| `js/ui.js` | title screen, camera renderer, five tools, hatch animation, inspect, hiring, duck dialogue, the Index, hex research grid, particles, sound |
