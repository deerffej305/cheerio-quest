// Procedural Web Audio SFX. No external asset files yet — every
// sound is synthesized with an oscillator + envelope so we can ship
// audible feedback today without an asset pipeline. Real sampled
// audio replaces this in Phase 8 of the design doc.
//
// Browsers gate AudioContext until the first user interaction.
// init() is called lazily before any sound; if the context starts
// in "suspended" state we resume it. The TitleScene's first
// keydown will unlock it for the whole session.

class SoundManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.7;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // --- Building blocks -------------------------------------------

  _envOsc(type, freqStart, freqEnd, durSec, gainPeak = 0.18, freqCurve = 'exp') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freqStart, now);
    if (freqCurve === 'lin') {
      o.frequency.linearRampToValueAtTime(freqEnd, now + durSec);
    } else {
      o.frequency.exponentialRampToValueAtTime(Math.max(0.0001, freqEnd), now + durSec);
    }
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gainPeak, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durSec);
    o.connect(g);
    g.connect(this.master);
    o.start(now);
    o.stop(now + durSec + 0.02);
  }

  _noiseBurst(durSec, gainPeak = 0.12) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.ceil(durSec * ctx.sampleRate), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gainPeak, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durSec);
    src.connect(g);
    g.connect(this.master);
    src.start(now);
    src.stop(now + durSec + 0.02);
  }

  // --- Game SFX --------------------------------------------------

  playJump()       { this._envOsc('square',   220, 600, 0.10, 0.14); }
  playStomp()      { this._envOsc('square',   320,  80, 0.08, 0.18); }
  playOuch()       { this._noiseBurst(0.16, 0.18); }
  playScore()      { this._envOsc('triangle', 880, 1320, 0.12, 0.14); }
  playFiber()      {
    // Two-note triumphant chirp.
    this._envOsc('triangle', 660, 990, 0.10, 0.15);
    setTimeout(() => this._envOsc('triangle', 990, 1320, 0.12, 0.15), 80);
  }
  playDeath()      { this._envOsc('sawtooth', 440, 80, 0.45, 0.18, 'lin'); }
  playRoomClear()  {
    this._envOsc('triangle', 523, 659, 0.12, 0.15);
    setTimeout(() => this._envOsc('triangle', 659, 784, 0.12, 0.15), 100);
    setTimeout(() => this._envOsc('triangle', 784, 1047, 0.18, 0.15), 200);
  }
  playFart()       {
    // Low blat + noise on top.
    this._envOsc('sawtooth', 130, 60, 0.30, 0.22, 'lin');
    this._noiseBurst(0.30, 0.10);
  }
}

export const sound = new SoundManager();
