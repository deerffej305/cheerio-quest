#!/usr/bin/env node
// Generates the Phase 8 SFX as bundled .wav files in
// public/assets/audio/ using the SAME procedural recipes as
// src/systems/SoundManager.js. That way the asset pipeline is in
// place: BootScene preloads these files, SoundManager prefers the
// loaded sample over the runtime procedural fallback, and when
// Cowork later drops in real recorded audio under the same names
// the swap is one-file-per-key with no code changes.
//
// Re-run any time the recipes change:
//   node scripts/gen-audio.js

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050; // procedural synth doesn't need 44.1k
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'assets', 'audio');

function envOsc(type, freqStart, freqEnd, durSec, gainPeak = 0.18, freqCurve = 'exp') {
  const samples = Math.ceil(durSec * SR);
  const out = new Float32Array(samples);
  let phase = 0;
  for (let i = 0; i < samples; i++) {
    const t = i / SR;
    const tt = t / durSec;
    const freq = freqCurve === 'lin'
      ? freqStart + (freqEnd - freqStart) * tt
      : freqStart * Math.pow(Math.max(0.001, freqEnd / freqStart), tt);
    // Attack 5ms, exponential decay over the remainder.
    let gain;
    if (t < 0.005) gain = (t / 0.005) * gainPeak;
    else {
      const decay = (t - 0.005) / Math.max(0.001, durSec - 0.005);
      gain = gainPeak * Math.exp(-3 * decay);
    }
    let s;
    switch (type) {
      case 'square':   s = phase < 0.5 ? 1 : -1; break;
      case 'sawtooth': s = 2 * phase - 1; break;
      case 'triangle': s = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase; break;
      default:         s = Math.sin(2 * Math.PI * phase);
    }
    out[i] = s * gain;
    phase += freq / SR;
    if (phase >= 1) phase -= Math.floor(phase);
  }
  return out;
}

function noiseBurst(durSec, gainPeak = 0.12) {
  const samples = Math.ceil(durSec * SR);
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const t = i / SR;
    let gain;
    if (t < 0.01) gain = (t / 0.01) * gainPeak;
    else {
      const decay = (t - 0.01) / Math.max(0.001, durSec - 0.01);
      gain = gainPeak * Math.exp(-3 * decay);
    }
    out[i] = (Math.random() * 2 - 1) * gain;
  }
  return out;
}

function silence(durSec) {
  return new Float32Array(Math.ceil(durSec * SR));
}

function concat(...arrs) {
  const len = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Float32Array(len);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

function mix(a, b) {
  const len = Math.max(a.length, b.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = (i < a.length ? a[i] : 0) + (i < b.length ? b[i] : 0);
  }
  return out;
}

function writeWAV(filename, audio) {
  const samples = audio.length;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);  // PCM
  buf.writeUInt16LE(1, 22);  // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const s = Math.max(-1, Math.min(1, audio[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(filename, buf);
}

mkdirSync(OUT_DIR, { recursive: true });

const recipes = {
  jump:         envOsc('square',   220, 600, 0.10, 0.14),
  stomp:        envOsc('square',   320,  80, 0.08, 0.18),
  damage:       noiseBurst(0.16, 0.18),
  score:        envOsc('triangle', 880, 1320, 0.12, 0.14),
  fiber:        concat(
                  envOsc('triangle', 660, 990, 0.10, 0.15),
                  silence(0.02),
                  envOsc('triangle', 990, 1320, 0.12, 0.15),
                ),
  death:        envOsc('sawtooth', 440,  80, 0.45, 0.18, 'lin'),
  'room-clear': concat(
                  envOsc('triangle', 523,  659, 0.12, 0.15),
                  silence(0.04),
                  envOsc('triangle', 659,  784, 0.12, 0.15),
                  silence(0.04),
                  envOsc('triangle', 784, 1047, 0.18, 0.15),
                ),
  fart:         mix(envOsc('sawtooth', 130, 60, 0.30, 0.22, 'lin'),
                    noiseBurst(0.30, 0.10)),
};

for (const [key, audio] of Object.entries(recipes)) {
  const path = resolve(OUT_DIR, `${key}.wav`);
  writeWAV(path, audio);
  console.log(`wrote ${path}  (${(audio.length / SR).toFixed(2)}s, ${audio.length * 2}B)`);
}
