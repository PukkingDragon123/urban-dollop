# 🥚 Inf Egg Co.

A super cute 2D pixel-art incremental game about experimenting with weird chickens.

![Inf Egg Co. screenshot](docs/screenshot.png)

## How to play

1. **Pet Mama Hen** 10 times — she lays a Common egg.
2. **Nest it or sell it.** Every egg is both hatchable and sellable:
   - 🐣 **Hatch** — put it in an incubation nest, wait, and a brand-new chicken pops out.
   - 🪙 **Sell** — trade it for coins (or **buy** more eggs with coins).
3. **Chickens lay eggs on their own** in the Free-Range Yard — rarer chickens lay rarer, pricier eggs.
4. **Hatching earns 🪶 feathers** — spend them in the Research tree (4 branches, 20 upgradable nodes: faster hatching, auto-petting, double yolks, twin hatches, mutations, and the Grand Cluckening).
5. **Upgrade Mama's rarity** with coins so her eggs climb the tiers: Common → Uncommon → Rare → Epic → Legendary → Mythic → Cosmic → Divine.
6. **Collect all 100 chickens** in the Chickenpedia — from Peep and Butterball to Cluckthulhu, Black Hole Hen, and The Eternal Yolk. Eggs can *mutate* a tier up when laid, which is how you reach species beyond Mama's tier.

Progress saves automatically to your browser (plus offline egg-laying while you're away, up to 8 hours).

## Run it

No build step, no dependencies — it's plain HTML/CSS/JS with canvas-rendered pixel sprites.

```
open index.html        # or serve the folder with any static server
```

## Project layout

| File | What it is |
| --- | --- |
| `index.html` | page skeleton |
| `style.css` | the sunny pixel-farm look |
| `js/data.js` | tiers, economy, all 100 species, the skill tree |
| `js/sprites.js` | pixel sprite engine (chickens, eggs, nests, Mama) |
| `js/game.js` | game state, actions, ticking, save/load |
| `js/ui.js` | rendering, canvas scenes, particles, sounds |
