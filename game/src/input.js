// input.js — keyboard and mouse state, plus the on-screen control hints.

export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  enter: ['KeyE'],
  brake: ['Space'],
  shoot: ['KeyF'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter'],
  mission: ['KeyM'],
};

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this._onKeyDown = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
    };
    this._onKeyUp = (event) => this.down.delete(event.code);
    this._onMouseMove = (event) => {
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    };
    this._onMouseDown = (event) => {
      if (event.button === 0) {
        this.mouse.down = true;
        this.mouse.clicked = true;
      }
    };
    this._onMouseUp = (event) => {
      if (event.button === 0) this.mouse.down = false;
    };
    this._onBlur = () => {
      this.down.clear();
      this.mouse.down = false;
    };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('blur', this._onBlur);
  }

  held(group) {
    return KEYS[group].some((code) => this.down.has(code));
  }

  wasPressed(group) {
    return KEYS[group].some((code) => this.pressed.has(code));
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
