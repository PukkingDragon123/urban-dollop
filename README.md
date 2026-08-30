# 🥚 Inf Egg Co.

A super cute, cozy 2D pixel-art incremental game. You're a floating hand tending an egg ranch that grows into a whole valley — with almost no UI in the way.

![Inf Egg Co. screenshot](docs/screenshot.png)

## How it plays

You're the hand. Everything on the field is touchable:

- 🖐️ **Hand** — tap chickens (and Mama Hen) to pet them for an instant egg; hold & drag to *pick chickens up* and carry them around; grab single eggs; drag empty grass to pan the camera.
- 🧺 **Basket** — hold and sweep to magnet eggs into your basket (it has a real capacity — research bigger ones). Release over the truck to load it, or over an incubator to queue hatching.
- 🌾 **Feed** (research to unlock) — sprinkle seeds; chickens waddle over, snack, and lay twice as fast.
- 🔨 **Build** — incubators, love nests, vacuum bots, and conveyor belts. Drag to paint belt lines; they carry eggs to the truck or incubators, factory-style.

**Everything is a place, not a menu:**

- 🚚 The **truck** on the road sells eggs — load it, tap it, and it drives to market and comes back with coins.
- 🐣 **Incubators are the only way to hatch.** Eggs go in, chickens pop out with a burst of feathers.
- 🪶 **Feathers are physical** — they flutter out of every hatch (and sometimes when you scoop eggs). Sweep them up; they're your research currency.
- 🧪 The **Lab shack** opens the research tree — an *actual tree* with a trunk and six branches (Gather · Hens · Hatchery · Love · Factory · Market), ~40 nodes deep. You can even drop a chicken on the Lab to "graduate" it for bonus feathers.
- 💘 **Love Nests breed chickens**: carry two chickens in, wait for the hearts, and get a fancier egg — two Divine parents can lay a 🌈 **rainbow egg**, which hatches the 12 breed-only **Secret** species (112 species total in the Chickenpedia bookstand).
- 🪧 **Buy land from FOR SALE signs** — 6 plots with their own scenery (sunflower field, lavender meadow, mushroom glen…), each raising your chicken capacity and giving room for a bigger factory.
- ⬆️ Mama's little signpost upgrades her egg rarity through 8 tiers; laid eggs can also mutate a tier up.

Autosaves to your browser, with up to 8 hours of offline laying and hatching.

### Controls

| Input | Action |
| --- | --- |
| tap chicken / Mama | pet → instant egg |
| hold + drag a chicken | carry it (drop on a Love Nest to breed, on the Lab to graduate) |
| drag with basket | sweep eggs & feathers |
| drag empty grass (hand) / WASD / wheel | pan the big map |
| tap Lab / bookstand / signposts / truck | research · chickenpedia · upgrades · sell |
| `1`–`4` tools · `R` rotate · `Esc` close | shortcuts |

## Run it

No build step, no dependencies — plain HTML/CSS/JS with canvas-rendered pixel sprites.

```
open index.html        # or serve the folder with any static server
```

## Project layout

| File | What it is |
| --- | --- |
| `index.html` | shell + the (tiny) HUD |
| `style.css` | cozy pixel-ranch styling |
| `js/data.js` | tiers, economy, 112 species, buildings, land plots, the research tree |
| `js/sprites.js` | pixel sprite engine (chickens, eggs, Mama, foliage, the hand) |
| `js/game.js` | world simulation: plots, chickens, eggs, plumes, breeding, belts, truck |
| `js/ui.js` | camera renderer, tools & input, stations, modals, particles, sounds |
