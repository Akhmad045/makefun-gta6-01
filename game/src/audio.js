// audio.js — every sound is synthesized with WebAudio: no audio files, no network.
// Engine hum, police siren, gunshot, cash blip, mission jingle and crash thud.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 700;
      this.engineOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch {
      this.ctx = null;
    }
  }

  setEngine(speedRatio) {
    if (!this.ctx || this.muted) return;
    this.engineGain.gain.value = speedRatio > 0.02 ? 0.045 + speedRatio * 0.05 : 0;
    this.engineOsc.frequency.value = 50 + speedRatio * 190;
  }

  setSiren(on, time) {
    if (!this.ctx || this.muted) return;
    this.sirenGain.gain.value = on ? 0.035 : 0;
    if (on) this.sirenOsc.frequency.value = Math.sin(time * 4.2) > 0 ? 880 : 660;
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  gunshot() {
    if (!this.ctx || this.muted) return;
    const len = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.22;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  cash() {
    this.blip(880, 0.09, 'sine', 0.1);
    setTimeout(() => this.blip(1318, 0.14, 'sine', 0.1), 90);
  }

  missionDone() {
    [523, 659, 784, 1046].forEach((freq, i) => setTimeout(() => this.blip(freq, 0.18, 'triangle', 0.12), i * 110));
  }

  crash() {
    this.blip(90, 0.25, 'sawtooth', 0.16);
  }

  stopAll() {
    if (!this.ctx) return;
    this.engineGain.gain.value = 0;
    this.sirenGain.gain.value = 0;
  }
}
