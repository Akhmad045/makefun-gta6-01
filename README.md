# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Akhmad045/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Akhmad045/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-22%2B-green.svg)](https://nodejs.org)
[![Play offline](https://img.shields.io/badge/Play-offline-blue.svg)](#play-it)
[![No dependencies](https://img.shields.io/badge/Dependencies-none-lightgrey.svg)](#play-it)

**Solmar Bay** is a complete 2D top-down open-world crime game that runs entirely
offline in a desktop browser, from static files alone. No build step, no network
request, no library — just a canvas, a seeded city, and the rules.

Rae Delgado lost her delivery job on a Tuesday. By Friday, Marisol Vega — fixer,
lender, keeper of Old Port — offered her a wheel and a second chance. Solmar Bay
pays drivers who don't ask questions.

## What's in the city

- **A city to explore on foot and by car** — a road grid of named districts
  (Downtown, Old Port, Marina Bay, Palm Court, North Hills), a beach, a bay and a
  pier, parks, plazas and palm rows, all generated from a seed.
- **Traffic and pedestrians** — cars drive the grid and turn at intersections;
  pedestrians walk the sidewalks, and some wave for a taxi fare worth $35–$85.
- **Cars to steal and drive** — walk up to any car and press **E**. Stealing a
  stranger's car raises your wanted level; Rae's own yellow cab is parked outside
  her apartment.
- **A wanted level and police who respond** — 1 to 5 stars. Police cars chase and
  ram you; at 2+ stars officers chase you on foot and can bust you. Lose them and
  the heat cools off.
- **Missions and a story** — three missions for Marisol Vega: a quiet fare, a
  package pickup with rivals and a police tip-off, and a daylight car heist.
  Taxi fares pay between missions.
- **Combat** — a pistol on foot (mouse to aim, click or **F** to fire), rival
  gunmen in mission 2, wreckable police cars.
- **HUD with a minimap** — cash, health, ammo, wanted stars, speedometer, mission
  objective, a live minimap with the player, the police, traffic and the mission
  marker, and a clock.
- **Start screen and saves** — title screen with the story, pause menu, busted /
  wasted endings, and progress saved to `localStorage` after every mission.
- **Sound** — engine hum, police sirens, gunshots and mission jingles, all
  synthesized with WebAudio. No audio files.

## Play it

```sh
node serve.ts
# then open http://localhost:8080
```

Or serve `game/` with any static file server and open `game/index.html`.

## Controls

| Key | Action |
| --- | --- |
| Enter | Start / confirm on the title and pause screens |
| WASD / arrows | Walk, or drive (W/S throttle, A/D steer) |
| E | Enter / exit a car |
| Mouse + click / F | Aim and shoot (on foot) |
| Space | Handbrake |
| M | Mission brief |
| Esc / P | Pause (Enter saves and returns to the title) |

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own code,
staged deterministically with `?shot=cover|drive|city|start&seed=7` and captured in
headless Chromium — no edits, no compositing.

## Structure

```
game/
  index.html        the page: one canvas, one module script
  src/
    config.js       tuning numbers, palette, districts
    random.js       seeded RNG (mulberry32)
    input.js        keyboard + mouse
    audio.js        WebAudio sound bank (all synthesized)
    city.js         city generation, buildings, collision
    entities.js     traffic, pedestrians, police, car physics
    missions.js     the story: three missions + taxi fares
    world.js        game state, update, wanted, save/load
    render.js       canvas drawing, HUD, minimap, menus
    shots.js        deterministic screenshot scenes
    main.js         boot, fixed-step loop
```

## License

MIT — see [LICENSE](LICENSE). Solmar Bay, its city, characters and story are
entirely original.

Built for the make.fun gta6-01 bounty — play it here: https://make.fun/bounty/gta6-01?ref=4g7knchf
