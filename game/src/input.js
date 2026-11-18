// Keyboard and mouse input for Solmar Bay. Held keys are read every frame;
// one-shot presses (enter a car, fire, start, pause, mute) are queued as flags
// and taken once by the loop, so a press between two frames is never lost and
// never counted twice.

export const ACT_ENTER = 1;
export const ACT_FIRE = 2;
export const ACT_CONFIRM = 4;
export const ACT_PAUSE = 8;
export const ACT_MUTE = 16;

const UP = new Set(['KeyW', 'ArrowUp']);
const DOWN = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const ENTER = new Set(['KeyE']);
const FIRE = new Set(['KeyF']);
const CONFIRM = new Set(['Enter', 'Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let mouseDown = false;
  const mouse = { x: 0, y: 0, inside: false };

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
    } else if (ENTER.has(event.code)) {
      if (!event.repeat) queued |= ACT_ENTER;
      event.preventDefault();
    } else if (FIRE.has(event.code)) {
      if (!event.repeat) queued |= ACT_FIRE;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) queued |= ACT_CONFIRM;
      event.preventDefault();
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) queued |= ACT_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) queued |= ACT_MUTE;
    } else {
      return;
    }
  });

  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });

  // A key released while the tab is hidden never sends keyup.
  window.addEventListener('blur', () => {
    held.clear();
    mouseDown = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.inside = true;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.inside = true;
    mouseDown = true;
    queued |= ACT_FIRE;
    event.preventDefault();
  });

  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });

  function anyHeld(set) {
    for (const code of set) if (held.has(code)) return true;
    return false;
  }

  return {
    mouse,
    isMouseDown() {
      return mouseDown;
    },
    // -1 / 0 / 1 on each axis, from the held movement keys.
    move() {
      const x = (anyHeld(RIGHT) ? 1 : 0) - (anyHeld(LEFT) ? 1 : 0);
      const y = (anyHeld(DOWN) ? 1 : 0) - (anyHeld(UP) ? 1 : 0);
      return { x, y };
    },
    takeActions() {
      const taken = queued;
      queued = 0;
      return taken;
    },
  };
}
