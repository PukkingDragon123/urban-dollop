# 🥚 Inf Egg Co.

A super cute 2D pixel-art incremental **egg ranch & factory** game. One big grassy field, a hundred weird chickens, and a truck that hauls your eggs to market.

![Inf Egg Co. screenshot](docs/screenshot.png)

## How it plays

- **Pet Mama Hen** (she sits on her nest) — every pet pops out an egg. Chickens roam the field and lay eggs on the grass all by themselves, so eggs pile up everywhere.
- **Scoop eggs** by holding the mouse and sweeping over them — a magnet pulls them into your basket with satisfying pops.
- **Drag & drop** your basket:
  - onto the **truck** → loads it up; click the truck and it drives off to market, coming back with coins (full loads pay a bonus),
  - onto an **incubator** → hatches eggs fast and automatically,
  - onto **open grass** → eggs nest where they land and slowly hatch into new chickens.
- **Automate it like a factory**: research **conveyor belts** and **vacuum bots**, then paint belt lines from the vacuum straight into the truck or an incubator. Eggs visibly ride the belts — and jam up when the truck is full.
- **Research tree**: hatching earns 🪶 feathers, spent across 4 branches (Hens · Hatchery · Factory · Market) with real prerequisites — lay speed, golden eggs, mutations, twin hatches, belt speed, auto-dispatch, Overclock, and more.
- **Upgrade Mama** through 8 rarity tiers so her eggs climb from Common to Divine; eggs can also **mutate** a tier up when laid.
- **Collect all 100 chickens** in the Chickenpedia — from Peep and Butterball to Cluckthulhu, Black Hole Hen, and The Eternal Yolk.

Progress autosaves to your browser, with offline egg-laying while you're away (up to 8 hours).

### Controls

| Input | Action |
| --- | --- |
| Click chicken / Mama | pet (instant egg) |
| Hold + drag | scoop eggs into your basket |
| Release over truck / incubator / grass | sell · incubate · nest |
| Click truck | send it to market |
| `1` `2` `3` / build bar | place incubator / vacuum / conveyor |
| drag while placing belts | paint a belt line (direction follows your drag) |
| `R` | rotate · `X` remove mode · `Esc` cancel |

## Run it

No build step, no dependencies — plain HTML/CSS/JS with canvas-rendered pixel sprites.

```
open index.html        # or serve the folder with any static server
```

## Project layout

| File | What it is |
| --- | --- |
| `index.html` | page skeleton + HUD |
| `style.css` | the sunny pixel-ranch look |
| `js/data.js` | tiers, economy, all 100 species, buildings, the research tree |
| `js/sprites.js` | pixel sprite engine (chickens, eggs, Mama, foliage) |
| `js/game.js` | world simulation: chickens, eggs, belts, vacuums, incubators, truck |
| `js/ui.js` | canvas renderer, input, HUD, modals, particles, sounds |
