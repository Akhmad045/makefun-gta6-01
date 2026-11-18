# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Akhmad045/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Akhmad045/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is a complete 2D top-down open-world crime game that runs entirely
offline in a desktop browser from static files. There is no build step, no
network request and no library: canvas rendering, a seeded city, and a story
told through driving.

## The story

Rae Delgado was a delivery driver until the company let her go. Now fixer
Marisol Vega has work for her, and in Solmar Bay work always comes with a
catch. Three jobs stand between Rae and a clean slate: a quiet fare that is
not as quiet as it sounds, a package pickup that brings rival gunmen and a
police tip-off, and a daylight car heist in North Hills. Between jobs, the
yellow cab outside her apartment still earns its keep one fare at a time.

## The city

Solmar Bay is a coastal city of five named districts, generated from a seed
so the same seed always builds the same streets. Downtown towers over the
north-west, the Old Port works the docks in the north-east, Palm Court keeps
its plazas in the south-west, North Hills rises in the south, and Marina Bay
watches the water in the south-east. A beach runs down the eastern edge, the
bay opens beyond it, and a wooden pier reaches out past the palm rows. Parks,
plazas and palm-lined avenues fill the blocks between the avenues, and every
road on the grid is drivable.

Traffic cars drive the grid and turn at intersections. Pedestrians walk the
sidewalks, and some of them wave for a taxi. The sun moves across the clock
in the corner of the screen while you work.

## On foot and behind the wheel

Walk up to any car and press E to get in. Rae's own yellow cab is parked
outside her apartment, and it is the only car in the city that is truly hers.
Taking a stranger's car raises the wanted level, and the police notice.
Driving is arcade-simple: accelerate, brake, steer, and mind the buildings,
because a hard crash wrecks a car and a wrecked car goes nowhere.

The wanted level runs from one to five stars. Police cars chase and ram you,
and at two stars and above officers chase you on foot and can bust you. Lose
them, stay out of sight, and the heat cools off on its own. Getting busted
costs Rae a fine and sends her home to start again.

## Combat

Rae carries a pistol. On foot, the mouse aims and a click or F fires. Rival
gunmen show up during the package job and shoot back, and a police car that
takes enough hits can be wrecked. Ammo is limited, so every shot should count,
and shooting a bystander is the fastest way to earn stars you do not want.

## The HUD

Cash, health and ammo sit at the top left. Wanted stars, the clock and the
current district sit at the top right. A speedometer and the car's condition
appear at the bottom left while driving, the current objective runs along the
bottom, and a live minimap in the bottom right shows Rae, the police, the
traffic and the mission marker.

## How to play

Serve the game folder with any static server, or run `node serve.ts` from the
repo root and open http://localhost:8901. The game opens on a title screen;
press Enter to start. Progress is saved in the browser: cash, health, ammo
and the current mission are kept in localStorage, so closing the tab does not
lose the story.

Missions are marked with a gold beacon. Taxi fares are marked in green: drive
the cab up to a waving pedestrian, pick them up, and take them where they
need to go. Fares pay cash, and cash is what keeps Rae moving.

## Controls

- W A S D or arrow keys: walk, or drive when in a car
- E: get in or out of a car
- Mouse: aim the pistol on foot
- Click or F: fire the pistol
- M: mute or unmute the sound
- P or Esc: pause
- Enter: start the game, or continue after being busted

## Screenshots

The four screenshots in `screenshots/` are real renders of the game, taken
in a browser from the shot scenes: the cover, a drive through the city, the
full city from above, and the title screen. Each one is reproducible from the
same seed with `?shot=cover|drive|city|start&seed=7`.

## Tech notes

The game is plain ES modules under `game/src/`, split by responsibility:
city generation, the world simulation, missions, entities, rendering, input,
procedural WebAudio sound, and the screenshot stager. Nothing is fetched over
the network; every sound is synthesized in the browser. `main.ts` at the repo
root copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

Solmar Bay is an original game: its city, characters, vehicles, names, story,
art and sounds are all its own, made for the make.fun gta6-01 bounty.

Play it, break it, and tell us what the city did to you.
— Built for the make.fun gta6-01 bounty: https://make.fun/bounty/gta6-01?ref=4g7knchf
