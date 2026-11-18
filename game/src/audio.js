// Procedural sound for Solmar Bay: everything is synthesized with WebAudio, so
// the game ships no audio files at all. The context is created lazily on the
// first user gesture (browsers block audio before that) and every call is
// guarded, so a headless run without audio never throws.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c || muted) return;
    try {
      if (c.state === 'suspended') void c.resume();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur + 0.02);
    } catch {
      // Sound is garnish; a failure here must never break the game.
    }
  }

  function noiseBurst(dur, vol, lowFreq) {
    const c = ensure();
    if (!c || muted) return;
    try {
      if (c.state === 'suspended') void c.resume();
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buffer = c.createBuffer(1, len, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowFreq || 1200;
      const gain = c.createGain();
      gain.gain.value = vol;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
    } catch {
      // See blip().
    }
  }

  return {
    resume() {
      ensure();
    },
    setMuted(value) {
      muted = value;
      if (muted) this.engine(0, false);
    },
    isMuted() {
      return muted;
    },
    shoot() {
      noiseBurst(0.12, 0.5, 2600);
      blip(190, 0.09, 'square', 0.22, 70);
    },
    rivalShoot() {
      noiseBurst(0.1, 0.25, 1800);
    },
    pickup() {
      blip(660, 0.1, 'sine', 0.25);
      blip(990, 0.16, 'sine', 0.22);
    },
    cash() {
      blip(880, 0.09, 'triangle', 0.25);
      blip(1320, 0.18, 'triangle', 0.22);
    },
    crash() {
      noiseBurst(0.25, 0.5, 700);
    },
    busted() {
      blip(440, 0.25, 'sawtooth', 0.25, 220);
      blip(330, 0.4, 'sawtooth', 0.25, 165);
    },
    denied() {
      blip(160, 0.15, 'square', 0.2);
    },
    // A low engine hum whose pitch follows road speed; called every frame.
    engine(speed, driving) {
      const c = ensure();
      if (!c) return;
      try {
        if (muted || !driving) {
          if (engineOsc) {
            engineGain.gain.setTargetAtTime(0, c.currentTime, 0.08);
          }
          return;
        }
        if (c.state === 'suspended') void c.resume();
        if (!engineOsc) {
          engineOsc = c.createOscillator();
          engineGain = c.createGain();
          engineOsc.type = 'sawtooth';
          engineGain.gain.value = 0;
          const filter = c.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 420;
          engineOsc.connect(filter).connect(engineGain).connect(c.destination);
          engineOsc.start();
        }
        const target = 55 + Math.abs(speed) * 0.16;
        engineOsc.frequency.setTargetAtTime(target, c.currentTime, 0.06);
        engineGain.gain.setTargetAtTime(0.05, c.currentTime, 0.1);
      } catch {
        // See blip().
      }
    },
  };
}
