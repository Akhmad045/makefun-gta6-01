// The story of Solmar Bay, told as a small state machine. Marisol Vega, a
// fixer Rae Delgado owes a favour to, hands her three jobs in order; between
// jobs the city offers taxi fares. The director never draws anything and never
// touches the canvas: it watches where the player is, moves the mission marker,
// spawns rivals, raises the heat and pays out cash through the hooks the world
// hands it.

import { MISSION_REWARDS } from './config.js';

export const MISSION_TITLES = [
  'A Quiet Fare',
  'The Package',
  'Daylight Heist',
];

const ARRIVE_RADIUS = 120;

export function createDirector(city, hooks) {
  const spots = city.spots;
  const director = {
    index: 0,
    stage: 'toPickup',
    marker: null,
    markerLabel: '',
    passenger: false,
    done: false,
    banner: '',
    bannerTimer: 0,
  };

  function setMarker(x, y, label) {
    director.marker = { x, y };
    director.markerLabel = label;
    hooks.setMarker(x, y, label);
  }

  function clearMarker() {
    director.marker = null;
    director.markerLabel = '';
    hooks.clearMarker();
  }

  function announce(text) {
    director.banner = text;
    director.bannerTimer = 4;
    hooks.toast(text);
  }

  function startMission(i) {
    director.index = i;
    director.passenger = false;
    if (i === 0) {
      director.stage = 'toPickup';
      setMarker(spots.client.x, spots.client.y, 'Pick up Marisol\u2019s client');
      announce('Mission 1: A Quiet Fare - pick up the client in Marina Bay.');
    } else if (i === 1) {
      director.stage = 'toPickup';
      setMarker(spots.warehouse.x, spots.warehouse.y, 'Collect the package');
      announce('Mission 2: The Package - collect it at the Old Port warehouse.');
    } else if (i === 2) {
      director.stage = 'toPickup';
      setMarker(spots.targetCar.x, spots.targetCar.y, 'Steal the marked coupe');
      announce('Mission 3: Daylight Heist - take the red coupe in North Hills.');
    } else {
      director.done = true;
      clearMarker();
      announce('All missions done. Solmar Bay is yours - drive fares, stay sharp.');
    }
  }

  function completeMission(state) {
    const reward = director.index === 0
      ? MISSION_REWARDS.fare
      : director.index === 1 ? MISSION_REWARDS.package : MISSION_REWARDS.heist;
    hooks.giveCash(reward);
    hooks.audioCash();
    announce(`Mission complete: ${MISSION_TITLES[director.index]} - $${reward} earned.`);
    state.missionsDone += 1;
    hooks.saveGame();
    startMission(director.index + 1);
  }

  function near(state, point) {
    const dx = state.player.x - point.x;
    const dy = state.player.y - point.y;
    return dx * dx + dy * dy < ARRIVE_RADIUS * ARRIVE_RADIUS;
  }

  // Advance the story one step. `state` is the world state; the director only
  // reads the player's position and car, and writes through the hooks.
  function update(state, dt) {
    if (director.bannerTimer > 0) director.bannerTimer -= dt;
    if (director.done) return;
    if (director.index === 0) {
      if (director.stage === 'toPickup') {
        if (near(state, spots.client)) {
          director.stage = 'toDrop';
          director.passenger = true;
          setMarker(spots.palmDrop.x, spots.palmDrop.y, 'Drop the client off');
          announce('Client aboard. Take him to Palm Court - and drive smooth.');
        }
      } else if (near(state, spots.palmDrop)) {
        director.passenger = false;
        completeMission(state);
      }
    } else if (director.index === 1) {
      if (director.stage === 'toPickup') {
        if (near(state, spots.warehouse)) {
          director.stage = 'toDrop';
          hooks.spawnRivals(spots.warehouse.x, spots.warehouse.y, 3);
          hooks.setWanted(2);
          setMarker(spots.downtownDrop.x, spots.downtownDrop.y, 'Deliver the package');
          announce('Ambush! Rival gunmen - and someone tipped off the police. Run it to Downtown.');
        }
      } else if (near(state, spots.downtownDrop)) {
        completeMission(state);
      }
    } else if (director.index === 2) {
      if (director.stage === 'toPickup') {
        if (state.flags.heistCarTaken) {
          director.stage = 'toDrop';
          hooks.setWanted(3);
          setMarker(spots.garage.x, spots.garage.y, 'Deliver the coupe');
          announce('You have the coupe. Lose the heat and bring it to Marisol\u2019s garage.');
        }
      } else if (near(state, spots.garage)) {
        if (state.player.car && state.player.car.kind === 'target') {
          completeMission(state);
        } else {
          announce('Bring the coupe itself to the garage, not another car.');
          director.bannerTimer = 3;
        }
      }
    }
  }

  function objectiveText(state) {
    if (director.done) return 'Free roam - pick up fares, explore Solmar Bay.';
    if (director.index === 0) {
      return director.stage === 'toPickup'
        ? 'Mission 1 - A Quiet Fare: pick up the client in Marina Bay'
        : 'Mission 1 - A Quiet Fare: drop the client in Palm Court';
    }
    if (director.index === 1) {
      return director.stage === 'toPickup'
        ? 'Mission 2 - The Package: collect it at the Old Port warehouse'
        : 'Mission 2 - The Package: deliver it to Downtown';
    }
    if (director.stage === 'toPickup') {
      return 'Mission 3 - Daylight Heist: steal the red coupe in North Hills';
    }
    return 'Mission 3 - Daylight Heist: deliver the coupe to the garage';
  }

  function restore(index) {
    if (index >= 0 && index <= 2) {
      director.index = index;
      director.done = false;
      startMission(index);
    } else {
      director.index = 3;
      director.done = true;
      clearMarker();
    }
  }

  startMission(0);

  return {
    get index() { return director.index; },
    get done() { return director.done; },
    get marker() { return director.marker; },
    get markerLabel() { return director.markerLabel; },
    get banner() { return director.banner; },
    get bannerTimer() { return director.bannerTimer; },
    update,
    objectiveText,
    restore,
  };
}
