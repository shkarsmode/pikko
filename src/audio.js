// All sounds are synthesized with Web Audio: no files, works offline, tiny.
// iOS only starts audio inside a user gesture, so unlock() runs on taps.
import { settings } from './store.js';

let ctx = null;
let out = null;
let send = null;
let noiseBuf = null;
let primed = false;
const watchers = new Set();

// iOS only lets audio start on touchend/click, never on touchstart, so the
// UI asks for one tap while this is false.
export const audioRunning = () => !!ctx && ctx.state === 'running';
export function onAudioState(fn) {
  watchers.add(fn);
  return () => watchers.delete(fn);
}

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    // mix with music, respect the silent switch
    if (navigator.audioSession) navigator.audioSession.type = 'ambient';
  } catch {
    /* ignore */
  }
  try {
    ctx = new AC({ latencyHint: 'interactive' });
  } catch {
    return null;
  }
  ctx.onstatechange = () => watchers.forEach((fn) => fn(ctx.state));
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 14;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.18;
  out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(comp);
  comp.connect(ctx.destination);

  // small hall made from decaying noise
  const verb = ctx.createConvolver();
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * 1.6);
  const ir = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
  }
  verb.buffer = ir;
  send = ctx.createGain();
  send.gain.value = 0.3;
  send.connect(verb);
  verb.connect(out);

  noiseBuf = ctx.createBuffer(1, Math.floor(rate * 0.5), rate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return ctx;
}

export function unlock() {
  const c = init();
  if (!c) return;
  if (c.state !== 'running') {
    c.resume()
      .then(() => watchers.forEach((fn) => fn(c.state)))
      .catch(() => {});
  }
  if (!primed) {
    primed = true;
    const s = c.createBufferSource();
    s.buffer = c.createBuffer(1, 1, 22050);
    s.connect(c.destination);
    s.start(0);
  }
}

function ok() {
  return settings.sound && ctx && ctx.state === 'running';
}

function tone({ f = 440, f2 = 0, type = 'sine', at = 0, dur = 0.2, att = 0.004, gain = 0.2, wet = 0.25, lp = 0, detune = 0 }) {
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  if (detune) o.detune.value = detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = o;
  if (lp) {
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = lp;
    o.connect(fl);
    node = fl;
  }
  node.connect(g);
  g.connect(out);
  if (wet) {
    const s = ctx.createGain();
    s.gain.value = wet;
    g.connect(s);
    s.connect(send);
  }
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise({ at = 0, dur = 0.08, gain = 0.15, f = 2000, f2 = 0, q = 1, type = 'bandpass', wet = 0.1 }) {
  const t0 = ctx.currentTime + at;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.frequency.setValueAtTime(f, t0);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  fl.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(fl);
  fl.connect(g);
  g.connect(out);
  if (wet) {
    const w = ctx.createGain();
    w.gain.value = wet;
    g.connect(w);
    w.connect(send);
  }
  s.start(t0);
  s.stop(t0 + dur + 0.05);
}

// C major pentatonic from C5, used to give every finger its own note
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
const note = (semi, base = 523.25) => base * Math.pow(2, semi / 12);

export const sfx = {
  down(i = 0) {
    if (!ok()) return;
    const f = note(PENTA[i % PENTA.length]);
    tone({ f, f2: f * 1.01, dur: 0.32, gain: 0.2, wet: 0.3 });
    tone({ f: f * 2, dur: 0.12, gain: 0.05, type: 'triangle', wet: 0.2 });
    noise({ dur: 0.025, gain: 0.05, f: 4200, q: 0.8, wet: 0 });
  },
  up() {
    if (!ok()) return;
    tone({ f: 620, f2: 380, dur: 0.16, gain: 0.09, wet: 0.15 });
  },
  tick(p = 0) {
    if (!ok()) return;
    tone({ f: 1250 + 700 * p, dur: 0.05, gain: 0.08 + 0.05 * p, type: 'triangle', wet: 0.12 });
    noise({ dur: 0.02, gain: 0.04, f: 3000, q: 2, wet: 0 });
  },
  charge() {
    if (!ok()) return;
    tone({ f: 140, f2: 620, dur: 0.24, gain: 0.07, type: 'sawtooth', lp: 1400, wet: 0.2 });
    noise({ dur: 0.24, gain: 0.05, f: 600, f2: 5000, q: 0.9, wet: 0.2 });
  },
  win() {
    if (!ok()) return;
    tone({ f: 92, f2: 46, dur: 0.32, gain: 0.32, wet: 0 });
    [0, 4, 7, 12, 16].forEach((s, i) => tone({ f: note(s), at: i * 0.055, dur: 1.1, gain: 0.1, type: 'triangle', wet: 0.5 }));
    [24, 31, 36].forEach((s, i) => tone({ f: note(s), at: 0.18 + i * 0.07, dur: 0.6, gain: 0.03, wet: 0.7 }));
  },
  pick(i = 0) {
    if (!ok()) return;
    const f = note(PENTA[(i + 2) % PENTA.length]);
    tone({ f, dur: 0.5, gain: 0.14, type: 'triangle', wet: 0.45 });
    tone({ f: f * 1.5, dur: 0.35, gain: 0.05, wet: 0.4 });
  },
  team(k = 0) {
    if (!ok()) return;
    const roots = [0, 5, 7, 9];
    const r = roots[k % roots.length];
    tone({ f: note(r - 5), dur: 0.55, gain: 0.13, type: 'triangle', wet: 0.4 });
    tone({ f: note(r + 2), at: 0.07, dur: 0.55, gain: 0.1, type: 'triangle', wet: 0.45 });
  },
  order(i = 0) {
    if (!ok()) return;
    const f = note(PENTA[i % PENTA.length]);
    tone({ f, dur: 0.6, gain: 0.15, wet: 0.45 });
    tone({ f: f * 2.76, dur: 0.18, gain: 0.03, wet: 0.3 });
  },
  hop(i = 0) {
    if (!ok()) return;
    tone({ f: i % 2 ? 1180 : 1320, dur: 0.035, gain: 0.05, type: 'square', lp: 3200, wet: 0.05 });
  },
  pop() {
    if (!ok()) return;
    noise({ dur: 0.16, gain: 0.28, f: 900, f2: 250, q: 1.4, wet: 0.2 });
    tone({ f: 420, f2: 60, dur: 0.22, gain: 0.22, wet: 0.1 });
  },
  ready() {
    if (!ok()) return;
    tone({ f: 110, dur: 1.4, att: 0.3, gain: 0.06, wet: 0.3 });
    tone({ f: 165, dur: 1.4, att: 0.3, gain: 0.04, wet: 0.3 });
  },
  go() {
    if (!ok()) return;
    tone({ f: 988, dur: 0.2, gain: 0.12, type: 'square', lp: 4000, wet: 0.2 });
    tone({ f: 1976, dur: 0.16, gain: 0.05, wet: 0.2 });
  },
  buzz() {
    if (!ok()) return;
    tone({ f: 98, dur: 0.34, gain: 0.12, type: 'sawtooth', lp: 900, wet: 0.05 });
    tone({ f: 104, dur: 0.34, gain: 0.1, type: 'sawtooth', lp: 900, wet: 0.05 });
  },
  ui() {
    if (!ok()) return;
    tone({ f: 1700, dur: 0.035, gain: 0.035, wet: 0 });
  },
  sparkle() {
    if (!ok()) return;
    [24, 28, 31, 36, 40].forEach((s, i) => tone({ f: note(s), at: i * 0.045, dur: 0.4, gain: 0.035, wet: 0.7 }));
  },
  success() {
    if (!ok()) return;
    [0, 4, 7, 11, 14].forEach((s, i) => tone({ f: note(s), at: i * 0.06, dur: 1.2, gain: 0.09, type: 'triangle', wet: 0.55 }));
    tone({ f: 80, f2: 45, dur: 0.3, gain: 0.25, wet: 0 });
  },
};
