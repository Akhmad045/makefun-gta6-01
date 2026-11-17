// missions.js — the story of Solmar Bay. Rae Delgado, a driver who lost her delivery
// job, takes work from Marisol Vega, a fixer in Old Port. Three missions, played in
// order, plus taxi fares any pedestrian with a raised hand will pay for.

export const STORY_INTRO = 'Rae Delgado lost her delivery job on a Tuesday. By Friday, Marisol Vega — fixer, lender, keeper of Old Port — offered her a wheel and a second chance. Solmar Bay pays drivers who don\u2019t ask questions.';

export const MISSIONS = [
  {
    id: 'first-fare',
    title: 'Mission 1 — First Fare',
    brief: 'Marisol needs a client moved quietly. Pick up the man in the grey suit at the Sunset Diner, then drive him to the Marina Bay docks. Don\u2019t keep him waiting.',
    reward: 250,
    stages: [
      { type: 'goto', x: 650, y: 650, place: 'Sunset Diner', text: 'Pick up the client at the Sunset Diner' },
      { type: 'drive', x: 2470, y: 2210, place: 'Marina Bay docks', text: 'Drive the client to the Marina Bay docks' },
    ],
  },
  {
    id: 'the-pickup',
    title: 'Mission 2 — The Pickup',
    brief: 'A package is waiting in the Old Port garage. Collect it on foot, then take it to Solmar Plaza. Vega\u2019s rivals know about the package — and the police have been tipped off.',
    reward: 450,
    stages: [
      { type: 'goto', x: 390, y: 2210, place: 'Old Port garage', text: 'Collect the package at the Old Port garage' },
      { type: 'deliver', x: 1300, y: 1300, place: 'Solmar Plaza', text: 'Deliver the package to Solmar Plaza — the cops are on you' },
    ],
  },
  {
    id: 'bay-heist',
    title: 'Mission 3 — Bay Heist',
    brief: 'A red Veloce GT is parked outside Bay Trust Bank. Take it. The whole city will be looking for it — lose the police, then bring it home to the Old Port garage.',
    reward: 900,
    stages: [
      { type: 'steal', x: 1560, y: 910, place: 'Bay Trust Bank', text: 'Steal the red Veloce GT outside Bay Trust Bank' },
      { type: 'escape', x: 390, y: 2210, place: 'Old Port garage', text: 'Lose the police, then deliver the Veloce to the Old Port garage' },
    ],
  },
];

export function makeMissionState() {
  return {
    index: 0, // which mission of MISSIONS is active
    stage: 0,
    done: [], // ids of finished missions
    active: false,
    pickupCarried: false,
    rivalsSpawned: false,
    heistCar: null,
    fare: null, // active taxi fare {from, to, pay}
    banner: null, // {text, until}
    startedAt: 0,
  };
}

export function currentMission(state) {
  if (state.index >= MISSIONS.length) return null;
  return MISSIONS[state.index];
}

export function currentStage(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  return mission.stages[state.stage] || null;
}

export function missionObjectiveText(state) {
  const mission = currentMission(state);
  if (!mission) return state.fare ? 'Taxi fare: take your passenger to the yellow marker' : 'All missions complete — Solmar Bay is yours. Free roam!';
  const stage = currentStage(state);
  if (!stage) return mission.title;
  if (state.fare) return `Taxi fare ($${state.fare.pay}) — then: ${stage.text}`;
  return stage.text;
}
