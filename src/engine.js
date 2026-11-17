// Game engine: turns fingers (or tap markers) into targets, waits for a still
// moment, then plays the reveal of the active mode. Rendering is Canvas 2D,
// time-based (identical at 60 and 120 Hz), and the loop sleeps when idle.
import { sfx } from './audio.js';
import { haptic } from './haptics.js';
import { t } from './i18n.js';
import { settings } from './store.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
const easeInCubic = (k) => k * k * k;
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutBack = (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
const now = () => performance.now() / 1000;

export const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

export function rnd(n) {
  if (n <= 1) return 0;
  const buf = new Uint32Array(1);
  const lim = Math.floor(0x100000000 / n) * n;
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= lim);
  return x % n;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const PALETTES = {
  neon: {
    colors: ['#3DFF9A', '#4DD7FF', '#FFB547', '#FF5C7A', '#A78BFA', '#F5F75C', '#FF7AE6', '#5C8DFF', '#FF8A4C', '#7CFFE5', '#C6FF4D', '#FF9EC4'],
    teams: ['#3DFF9A', '#FF5C7A', '#4DD7FF', '#FFB547'],
  },
  phosphor: {
    colors: ['#3DFF9A', '#B4FFD8', '#1FB86A', '#7DFFBE', '#2BD67E', '#C8FFE4', '#5CE6A0', '#18A05C', '#9DFFC9', '#33FF77', '#6CFFB0', '#A8FFD0'],
    teams: ['#3DFF9A', '#C8FFE4', '#18A05C', '#7DFFBE'],
  },
  amber: {
    colors: ['#FFB547', '#FFE2A8', '#E08A1E', '#FFCF7A', '#FF9A1F', '#FFEBC4', '#CC7A14', '#FFC060', '#FFD99A', '#FFA733', '#FFB000', '#FFD27F'],
    teams: ['#FFB547', '#FFEBC4', '#CC7A14', '#FFCF7A'],
  },
};

export const MODES = {
  one: { pro: false, min: () => 2, markers: true },
  teams: { pro: false, min: (o) => Math.max(2, o.teams), markers: true },
  order: { pro: false, min: () => 2, markers: true },
  n: { pro: true, min: (o) => o.pickN + 1, markers: true },
  elim: { pro: true, min: () => 2, markers: true },
  reaction: { pro: true, min: () => 2, markers: false },
};
export const MODE_ORDER = ['one', 'teams', 'order', 'n', 'elim', 'reaction'];

const SPEED = { fast: { hold: 1.2, k: 0.72 }, normal: { hold: 2.0, k: 1 }, slow: { hold: 3.2, k: 1.3 } };
const SETTLE = 0.28; // grace before the countdown starts after a change
const LINGER = 1.6; // result stays this long after the last finger lifts
const MK_HOLD = 1.1; // countdown after pressing Pick in marker mode
export const MAX_MARKERS = 24;
const MAX_ORBS = 12;
const LETTERS = ['A', 'B', 'C', 'D'];
const TICKS = 40;

const hex2rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const luma = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const WHITE = [255, 255, 255];
const INK = [7, 8, 11];
const RED = [255, 77, 94];
const FLASH = [220, 255, 236];
export const rgbHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// Soft glow sprites, cached per (quantized) color.
const glowCache = new Map();
function glow(c) {
  const q = [c[0] & 0xf0, c[1] & 0xf0, c[2] & 0xf0];
  const key = (q[0] << 16) | (q[1] << 8) | q[2];
  let cv = glowCache.get(key);
  if (cv) return cv;
  if (glowCache.size > 400) glowCache.clear();
  const S = 160;
  cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, css(c, 0.5));
  gr.addColorStop(0.3, css(c, 0.2));
  gr.addColorStop(0.65, css(c, 0.05));
  gr.addColorStop(1, css(c, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  glowCache.set(key, cv);
  return cv;
}

// Dot grid laid over the winner flood (gives the flat color some texture).
let dotTile = null;
function dots(ctx) {
  if (!dotTile) {
    const c = document.createElement('canvas');
    c.width = c.height = 22;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.beginPath();
    g.arc(11, 11, 1.25, 0, TAU);
    g.fill();
    dotTile = c;
  }
  return ctx.createPattern(dotTile, 'repeat');
}

class Spring {
  constructor(x = 0, k = 260, c = 19) {
    this.x = x;
    this.v = 0;
    this.t = x;
    this.k = k;
    this.c = c;
  }
  step(dt) {
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = this.k * (this.t - this.x) - this.c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
  }
}

class Tween {
  constructor(v = 0) {
    this.a = v;
    this.b = v;
    this.t0 = 0;
    this.d = 0;
    this.e = easeOutCubic;
  }
  to(v, at, d, e = easeOutCubic) {
    this.a = this.val(at);
    this.b = v;
    this.t0 = at;
    this.d = Math.max(0.0001, d);
    this.e = e;
    return this;
  }
  set(v) {
    this.a = this.b = v;
    this.d = 0;
  }
  val(tm) {
    if (!this.d) return this.b;
    const k = (tm - this.t0) / this.d;
    if (k <= 0) return this.a;
    if (k >= 1) return this.b;
    return this.a + (this.b - this.a) * this.e(k);
  }
  done(tm) {
    return !this.d || tm >= this.t0 + this.d;
  }
}

class Orb {
  constructor(id, x, y, rgb, tm, idx) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.idx = idx; // shown as P1, P2...
    this.base = rgb;
    this.c0 = rgb;
    this.c1 = rgb;
    this.cAt = 0;
    this.cDur = 0;
    this.s = new Spring(0);
    this.s.t = 1;
    this.ex = new Tween(1);
    this.alpha = new Tween(1);
    this.white = new Tween(0); // selected without a flood
    this.ink = new Tween(0); // drawn in black on the winner flood
    this.gray = new Tween(0);
    this.lock = new Tween(0); // brackets close in
    this.exiting = false;
    this.dead = false;
    this.down = true;
    this.phase = Math.random() * TAU;
    this.hl = 0;
    this.kick = 0;
    this.role = '';
    this.label = '';
    this.labelAt = 0;
    this.sub = '';
    this.team = -1;
    this.rank = -1;
    this.false = false;
    this.born = tm;
  }
  get tag() {
    return `P${this.idx}`;
  }
  color(tm) {
    if (!this.cDur) return this.c1;
    const k = (tm - this.cAt) / this.cDur;
    if (k <= 0) return this.c0;
    if (k >= 1) return this.c1;
    return mix(this.c0, this.c1, easeInOutCubic(k));
  }
  setColor(rgb, tm, dur = 0.35) {
    this.c0 = this.color(tm);
    this.c1 = rgb;
    this.cAt = tm;
    this.cDur = dur;
  }
}

class Round {
  constructor(tm) {
    this.orbs = [];
    this.phase = 'gather'; // gather -> reveal -> result
    this.sub = '';
    this.lastChange = tm;
    this.tl = [];
    this.flood = null;
    this.rings = [];
    this.parts = [];
    this.sonars = [];
    this.flash = null;
    this.groups = null;
    this.spots = [];
    this.dim = new Tween(0);
    this.presence = new Tween(0);
    this.alpha = new Tween(1);
    this.progress = 0;
    this.ticks = 0;
    this.armedAt = 0;
    this.lingerAt = 0;
    this.waiting = false;
    this.markers = null;
    this.goAt = 0;
    this.colorBag = [];
    this.lastStatus = 0;
  }
  live() {
    return this.orbs.filter((o) => !o.exiting);
  }
  freeIdx() {
    const used = new Set(this.live().map((o) => o.idx));
    let i = 1;
    while (used.has(i)) i++;
    return i;
  }
  at(tm, fn) {
    const ev = { t: tm, fn };
    let i = this.tl.length;
    while (i > 0 && this.tl[i - 1].t > tm) i--;
    this.tl.splice(i, 0, ev);
    return ev;
  }
  cancel(ev) {
    const i = this.tl.indexOf(ev);
    if (i >= 0) this.tl.splice(i, 1);
  }
}

const badge = (o) => ({ id: o.tag, color: rgbHex(o.base) });

export class Engine {
  constructor(canvas, hooks) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.hooks = hooks;
    this.round = null;
    this.ghosts = [];
    this.touch = new Map();
    this.extra = new Set();
    this.input = 'hold';
    this.modeId = 'one';
    this.opts = { pickN: 2, teams: 2 };
    this.raf = 0;
    this.last = 0;
    this.seq = 0;
    this.frameStats = { n: 0, js: 0, max: 0 };
    this.frame = this.frame.bind(this);
    this.resize();
  }

  // ---------- setup ----------
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.R = clamp(Math.min(w, h) * 0.125, 40, 70);
    this.kick();
  }

  setMode(id, opts) {
    this.modeId = MODES[id] ? id : 'one';
    if (opts) Object.assign(this.opts, opts);
    this.emit();
  }

  setInput(kind) {
    if (kind === this.input) return;
    this.abort();
    this.input = kind;
    this.emit();
  }

  minPlayers() {
    return MODES[this.modeId].min(this.opts);
  }

  speed() {
    return SPEED[settings.speed] || SPEED.normal;
  }

  palette() {
    return PALETTES[settings.palette] || PALETTES.neon;
  }

  fingersDown() {
    return this.touch.size + this.extra.size;
  }

  busy() {
    const r = this.round;
    if (!r) return false;
    if (this.input === 'marker') return r.phase === 'reveal' || r.armedAt > 0;
    return true;
  }

  nextColor(r) {
    const used = new Set(r.live().map((o) => o.base.join()));
    if (!r.colorBag.length) r.colorBag = shuffle(this.palette().colors.slice());
    for (let i = 0; i < r.colorBag.length; i++) {
      const c = hex2rgb(r.colorBag[i]);
      if (!used.has(c.join())) {
        r.colorBag.splice(i, 1);
        return c;
      }
    }
    return hex2rgb(r.colorBag.shift());
  }

  // ---------- hold input ----------
  touchDown(id, x, y) {
    if (this.input !== 'hold') return;
    if (this.touch.has(id) || this.extra.has(id)) return;
    const tm = now();
    let r = this.round;
    if (r && r.phase !== 'gather') {
      if (r.phase === 'result' && this.fingersDown() === 0) {
        this.retire(tm, 0.3);
        r = null;
      } else {
        this.extra.add(id);
        this.emit();
        return;
      }
    }
    if (!r) {
      r = this.round = new Round(tm);
      r.presence.to(1, tm, 0.5);
      this.hooks.caption(null);
    }
    if (r.live().length >= MAX_ORBS) {
      this.extra.add(id);
      this.emit();
      return;
    }
    const o = new Orb(id, x, y, this.nextColor(r), tm, r.freeIdx());
    r.orbs.push(o);
    this.touch.set(id, o);
    r.lastChange = tm;
    r.ticks = 0;
    this.ripple(r, x, y, o.base, tm, 0.5, 2.1, 1.5);
    sfx.down(o.idx - 1);
    haptic('light');
    this.emit();
    this.kick();
  }

  touchMove(id, x, y) {
    const o = this.touch.get(id);
    if (!o) return;
    o.x = x;
    o.y = y;
  }

  touchUp(id) {
    if (this.extra.delete(id)) {
      this.emit();
      return;
    }
    const o = this.touch.get(id);
    if (!o) return;
    this.touch.delete(id);
    o.down = false;
    const r = this.round;
    if (!r) return;
    const tm = now();
    if (r.phase === 'gather') {
      this.exitOrb(r, o, tm, 0.22);
      r.lastChange = tm;
      r.ticks = 0;
      sfx.up();
      if (!r.live().length) this.retire(tm, 0.35);
    } else if (r.phase === 'reveal' && this.modeId === 'reaction') {
      this.reactionLift(r, o, tm);
    }
    this.emit();
    this.kick();
  }

  touchCancel(ids, hadDown) {
    const r = this.round;
    const tm = now();
    let mine = 0;
    for (const id of ids) {
      if (this.extra.delete(id)) continue;
      const o = this.touch.get(id);
      if (!o) continue;
      this.touch.delete(id);
      o.down = false;
      mine++;
    }
    if (!r || !mine) return;
    if (r.phase === 'gather' || (r.phase === 'reveal' && this.modeId === 'reaction')) {
      // the OS took the touches away (6th finger on iPhone, a system gesture...)
      this.retire(tm, 0.3);
      this.hooks.toast(hadDown >= 5 && ids.length >= 2 ? t('toast.tooMany') : t('toast.cancel'));
      this.hooks.caption(null);
      this.hooks.big(null);
    }
    this.emit();
  }

  // ---------- marker input ----------
  markerTap(x, y) {
    if (this.input !== 'marker') return;
    const tm = now();
    let r = this.round;
    if (r && (r.phase !== 'gather' || r.armedAt)) return;
    if (!r) {
      r = this.round = new Round(tm);
      r.presence.to(1, tm, 0.5);
    }
    const hit = r.live().find((o) => Math.hypot(o.x - x, o.y - y) < this.mR() * 1.05);
    if (hit) {
      this.exitOrb(r, hit, tm, 0.2);
      sfx.up();
      haptic('tap');
      if (!r.live().length) this.retire(tm, 0.3);
      this.emit();
      return;
    }
    if (r.live().length >= MAX_MARKERS) {
      this.hooks.toast(t('toast.mkMax', MAX_MARKERS));
      return;
    }
    const o = new Orb('m' + this.seq++, x, y, this.nextColor(r), tm, r.freeIdx());
    o.down = false;
    r.orbs.push(o);
    this.ripple(r, x, y, o.base, tm, 0.5, 1.9, 1.5);
    sfx.down(o.idx - 1);
    haptic('light');
    this.emit();
    this.kick();
  }

  markerGo() {
    const r = this.round;
    if (this.input !== 'marker' || !r || r.phase !== 'gather' || r.armedAt) return;
    if (r.live().length < this.minPlayers()) return;
    r.armedAt = now();
    r.ticks = 0;
    this.emit();
    this.kick();
  }

  markerAgain() {
    const r = this.round;
    if (!r || !r.markers || r.phase !== 'result') return;
    const marks = r.markers;
    const tm = now();
    this.retire(tm, 0.25);
    const n = (this.round = new Round(tm));
    n.presence.set(1);
    marks.forEach((m) => {
      const o = new Orb('m' + this.seq++, m.x, m.y, m.c, tm, m.idx);
      o.down = false;
      o.s.x = 0.2;
      n.orbs.push(o);
    });
    n.armedAt = tm + 0.25;
    this.emit();
    this.kick();
  }

  markerClear() {
    if (!this.round) return;
    this.retire(now(), 0.3);
    this.emit();
  }

  mR() {
    const n = this.round ? this.round.live().length : 0;
    if (this.input !== 'marker') return this.R;
    return n > 10 ? this.R * 0.7 : n > 5 ? this.R * 0.84 : this.R;
  }

  // ---------- round flow ----------
  abort() {
    if (this.round) this.retire(now(), 0.2);
    this.touch.clear();
    this.extra.clear();
    this.hooks.caption(null);
    this.hooks.big(null);
    this.emit();
  }

  retire(tm, dur) {
    const r = this.round;
    if (!r) return;
    r.alpha.to(0, tm, dur, easeInOutCubic);
    r.tl.length = 0;
    this.ghosts.push(r);
    this.round = null;
    this.hooks.caption(null);
    this.hooks.big(null);
    this.hooks.status && this.hooks.status(null);
    this.kick();
  }

  beginReveal(tm) {
    const r = this.round;
    r.phase = 'reveal';
    r.progress = 1;
    r.markers = r.live().map((o) => ({ x: o.x, y: o.y, c: o.base, idx: o.idx }));
    this.hooks.status && this.hooks.status(null);
    haptic('medium');
    const live = r.live();
    live.forEach((o) => o.lock.to(1, tm, 0.25));
    switch (this.modeId) {
      case 'n':
        this.revealN(r, live, tm);
        break;
      case 'teams':
        this.revealTeams(r, live, tm);
        break;
      case 'order':
        this.revealOrder(r, live, tm);
        break;
      case 'elim':
        this.revealElim(r, live, tm);
        break;
      case 'reaction':
        this.revealReaction(r, live, tm);
        break;
      default:
        this.revealOne(r, live, tm);
    }
    this.emit();
  }

  toResult(r, tm, cap) {
    r.at(tm, () => {
      if (this.round !== r) return;
      r.phase = 'result';
      r.lingerAt = 0;
      this.hooks.caption(cap);
      this.emit();
      this.hooks.roundDone(this.modeId);
    });
  }

  crown(r, o, tm, flood = true) {
    o.role = 'winner';
    o.s.t = 1.22;
    o.gray.to(0, tm, 0.2);
    o.lock.to(1, tm, 0.2);
    if (flood) {
      r.flood = { x: o.x, y: o.y, c: o.base, at: tm, dur: 0.62, vig: null };
      o.ink.to(1, tm + 0.12, 0.3);
    } else o.white.to(1, tm, 0.35);
    this.bits(r, o.x, o.y, 54, tm, flood ? [INK, INK, WHITE] : null);
    r.sonars.push({ o, every: 1.25, next: tm + 0.12 });
    sfx.win();
    haptic('success');
  }

  revealOne(r, live, tm) {
    const win = live[rnd(live.length)];
    sfx.charge();
    live.forEach((o) => (o.s.t = 0.84));
    r.at(tm + 0.22, (t0) => {
      this.crown(r, win, t0);
      live.forEach((o, i) => o !== win && this.exitOrb(r, o, t0 + i * 0.03, 0.28));
      this.toResult(r, t0 + 0.55, { ...badge(win), text: t(`cap.win${1 + rnd(4)}`) });
    });
  }

  revealN(r, live, tm) {
    const k = Math.min(this.opts.pickN, live.length - 1);
    const wins = shuffle(live.slice()).slice(0, k);
    const step = 0.24 * this.speed().k;
    sfx.charge();
    live.forEach((o) => (o.s.t = 0.86));
    r.dim.to(0.72, tm + 0.15, 0.6);
    wins.forEach((o, i) =>
      r.at(tm + 0.25 + i * step, (t0) => {
        o.role = 'winner';
        o.s.t = 1.18;
        o.white.to(1, t0, 0.35);
        o.hl = 1;
        r.spots.push(o);
        this.ripple(r, o.x, o.y, WHITE, t0, 0.9, 3.2, 1.5);
        this.bits(r, o.x, o.y, 20, t0);
        sfx.pick(i);
        haptic('medium');
      }),
    );
    const tEnd = tm + 0.25 + k * step;
    r.at(tEnd, (t0) => {
      live.forEach((o, i) => !wins.includes(o) && this.exitOrb(r, o, t0 + i * 0.04, 0.3));
      wins.forEach((o, i) => r.sonars.push({ o, every: 1.3, next: t0 + i * 0.25 }));
      sfx.win();
      haptic('success');
    });
    this.toResult(r, tEnd + 0.35, { badges: wins.sort((a, b) => a.idx - b.idx).map(badge), text: t('cap.winners', k) });
  }

  revealTeams(r, live, tm) {
    const k = Math.min(this.opts.teams, live.length);
    const cols = this.palette().teams.map(hex2rgb);
    const groups = Array.from({ length: k }, () => []);
    shuffle(live.slice()).forEach((o, i) => {
      o.team = i % k;
      groups[i % k].push(o);
    });
    const step = 0.38 * this.speed().k;
    sfx.charge();
    live.forEach((o) => (o.s.t = 0.88));
    groups.forEach((members, ti) =>
      r.at(tm + 0.25 + ti * step, (t0) => {
        members.forEach((o, j) => {
          const at = t0 + j * 0.05;
          o.setColor(cols[ti], at, 0.3);
          o.base = cols[ti];
          o.label = LETTERS[ti];
          o.labelAt = at;
          o.s.t = 1.04;
          o.hl = 1;
          this.ripple(r, o.x, o.y, cols[ti], at, 0.8, 2.4, 1.5);
        });
        sfx.team(ti);
        haptic('medium');
      }),
    );
    const tEnd = tm + 0.25 + k * step;
    r.at(tEnd, (t0) => {
      r.groups = { at: t0, list: groups.map((m, ti) => ({ c: cols[ti], orbs: m })) };
      haptic('success');
    });
    this.toResult(r, tEnd + 0.2, {
      chips: groups.map((m, ti) => ({ color: rgbHex(cols[ti]), text: `${LETTERS[ti]} · ${m.map((o) => o.tag).join(' ')}` })),
    });
  }

  revealOrder(r, live, tm) {
    const order = shuffle(live.slice());
    const step = 0.42 * this.speed().k;
    sfx.charge();
    live.forEach((o) => (o.s.t = 0.88));
    order.forEach((o, i) =>
      r.at(tm + 0.3 + i * step, (t0) => {
        o.rank = i;
        o.label = String(i + 1);
        o.labelAt = t0;
        o.s.t = i === 0 ? 1.14 : 1;
        o.hl = 1;
        this.ripple(r, o.x, o.y, o.base, t0, 0.8, 2.3, 1.5);
        sfx.order(i);
        haptic(i === 0 ? 'medium' : 'light');
      }),
    );
    const tEnd = tm + 0.3 + order.length * step;
    r.at(tEnd, (t0) => {
      const first = order[0];
      first.white.to(1, t0, 0.35);
      r.sonars.push({ o: first, every: 1.3, next: t0 });
      sfx.win();
      haptic('success');
    });
    this.toResult(r, tEnd + 0.1, { text: t('cap.order'), line: order.map((o) => o.tag).join(' → ') });
  }

  revealElim(r, live, tm) {
    const sp = this.speed().k;
    sfx.charge();
    live.forEach((o) => (o.s.t = 0.92));
    const step = (t0) => {
      const rem = r.live();
      if (rem.length <= 1) {
        const w = rem[0];
        if (w) {
          r.at(t0, (t1) => this.crown(r, w, t1));
          this.toResult(r, t0 + 0.6, { ...badge(w), text: t('cap.last') });
        }
        return;
      }
      const victim = rem[rnd(rem.length)];
      const hops = 5 + rnd(3) + (rem.length > 2 ? 2 : 0);
      const seq = [];
      let cur = rnd(rem.length);
      for (let h = 0; h < hops; h++) {
        seq.push(rem[cur]);
        cur = (cur + 1 + rnd(rem.length - 1)) % rem.length;
      }
      if (seq[seq.length - 1] !== victim) seq.push(victim);
      let tt = t0;
      seq.forEach((o, i) => {
        const k = i / Math.max(1, seq.length - 1);
        tt += lerp(0.055, 0.21, k * k) * sp;
        r.at(tt, () => {
          o.hl = 1;
          sfx.hop(i);
        });
      });
      const tKill = tt + 0.3 * sp;
      r.at(tKill, (t1) => {
        victim.role = 'out';
        this.bits(r, victim.x, victim.y, 22, t1, [victim.base, victim.base, WHITE], 0.75);
        this.exitOrb(r, victim, t1, 0.2);
        r.live().forEach((o) => (o.kick = t1));
        sfx.pop();
        haptic('heavy');
        step(t1 + 0.5 * sp);
      });
    };
    step(tm + 0.35);
  }

  revealReaction(r, live, tm) {
    r.sub = 'ready';
    live.forEach((o) => {
      o.gray.to(1, tm, 0.45);
      o.s.t = 0.9;
    });
    r.dim.to(0.6, tm, 0.5);
    this.hooks.big({ text: t('cap.ready'), sub: t('cap.ready.sub'), kind: 'ready' });
    sfx.ready();
    const delay = 1.6 + rnd(2800) / 1000;
    r.goEv = r.at(tm + delay, (t0) => {
      r.sub = 'go';
      r.goAt = t0;
      r.flash = { at: t0, dur: 0.35 };
      r.live()
        .filter((o) => !o.false)
        .forEach((o) => {
          o.gray.to(0, t0, 0.1);
          o.s.t = 1.1;
          o.hl = 1;
        });
      r.dim.to(0, t0, 0.25);
      this.hooks.big({ text: t('cap.go'), kind: 'go' });
      sfx.go();
      haptic('heavy');
      this.emit();
    });
  }

  reactionLift(r, o, tm) {
    if (o.false || o.exiting) return;
    if (r.sub === 'ready') {
      o.false = true;
      o.setColor(RED, tm, 0.15);
      o.gray.to(0, tm, 0.1);
      o.label = '×';
      o.labelAt = tm;
      o.s.t = 0.78;
      o.kick = tm;
      sfx.buzz();
      haptic('warn');
      const ok = r.live().filter((x) => !x.false);
      if (ok.length <= 1) {
        r.cancel(r.goEv);
        r.sub = 'done';
        this.hooks.big(null);
        r.dim.to(0, tm, 0.3);
        if (ok.length === 1) {
          r.at(tm + 0.35, (t0) => this.crown(r, ok[0], t0));
          this.toResult(r, tm + 0.9, { ...badge(ok[0]), text: t('cap.solo') });
        } else {
          this.toResult(r, tm + 0.4, { text: t('cap.allFalse') });
        }
      } else {
        this.hooks.big({ text: t('cap.ready'), sub: `${o.tag} · ${t('cap.false')}`, kind: 'ready', shake: true });
      }
    } else if (r.sub === 'go') {
      r.sub = 'done';
      const ms = Math.max(1, Math.round((tm - r.goAt) * 1000));
      this.hooks.big(null);
      o.sub = t('cap.ms', ms);
      this.crown(r, o, tm);
      r.live().forEach((x, i) => x !== o && this.exitOrb(r, x, tm + 0.1 + i * 0.04, 0.3));
      this.toResult(r, tm + 0.6, { ...badge(o), text: `${t('cap.fast')} · ${t('cap.ms', ms)}` });
    }
  }

  // ---------- effects ----------
  exitOrb(r, o, at, dur = 0.25) {
    if (o.exiting) return;
    o.exiting = true;
    o.ex.to(0, at, dur, easeInCubic);
    o.alpha.to(0, at, dur, easeInCubic);
  }

  ripple(r, x, y, c, at, a = 0.6, scale = 2, w = 1.5) {
    r.rings.push({ x, y, c, at, dur: 0.6, r0: this.R * 0.8, r1: this.R * scale, a, w });
  }

  // square "pixels" bursting out
  bits(r, x, y, n, at, colors = null, speed = 1) {
    const cols = colors || this.palette().colors.map(hex2rgb).concat([WHITE, WHITE]);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * TAU;
      const sp = (180 + Math.random() * 620) * speed;
      const s = 2.5 + Math.random() * 4.5;
      r.parts.push({
        x: x + Math.cos(ang) * this.R * 0.5,
        y: y + Math.sin(ang) * this.R * 0.5,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        s,
        c: cols[rnd(cols.length)],
        at,
        life: 0.7 + Math.random() * 0.9,
      });
    }
  }

  // ---------- loop ----------
  kick() {
    if (!this.raf) {
      this.last = now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  frame(ts) {
    const tm = ts / 1000;
    const dt = clamp(tm - this.last, 0, 0.05);
    this.last = tm;
    const t0 = performance.now();
    this.update(tm, dt);
    this.draw(tm);
    const js = performance.now() - t0;
    const fs = this.frameStats;
    fs.n++;
    fs.js += js;
    if (js > fs.max) fs.max = js;
    if (this.round || this.ghosts.length) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.raf = 0;
      this.clear();
    }
  }

  clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
  }

  update(tm, dt) {
    const r = this.round;
    if (r) {
      while (r.tl.length && r.tl[0].t <= tm && this.round === r) {
        const ev = r.tl.shift();
        ev.fn(ev.t);
      }
    }
    if (r && this.round === r && r.phase === 'gather') {
      const live = r.live().length;
      const min = this.minPlayers();
      let p = 0;
      let dur = 1;
      let counting = false;
      if (this.input === 'hold') {
        dur = this.speed().hold;
        counting = live >= min;
        if (counting) p = clamp((tm - r.lastChange - SETTLE) / dur, 0, 1);
      } else if (r.armedAt) {
        dur = MK_HOLD;
        counting = true;
        p = clamp((tm - r.armedAt) / dur, 0, 1);
      }
      if (p > 0) {
        const N = Math.max(4, Math.round(dur * 3.6));
        const next = Math.pow((r.ticks + 1) / N, 0.62);
        if (p >= next && r.ticks < N - 1) {
          r.ticks++;
          sfx.tick(r.ticks / N);
        }
      }
      r.progress = p;
      if (this.hooks.status && live && tm - r.lastStatus > 0.05) {
        r.lastStatus = tm;
        this.hooks.status({ live, min, counting, left: counting ? Math.max(0, dur * (1 - p)) : 0, marker: this.input === 'marker' });
      }
      if (p >= 1) this.beginReveal(tm);
      const waiting = this.input === 'hold' && live > 0 && live < min && tm - r.lastChange > 0.7;
      if (waiting !== r.waiting) {
        r.waiting = waiting;
        this.emit();
      }
    }
    if (r && this.round === r && r.phase === 'result' && this.input === 'hold') {
      if (this.fingersDown() === 0) {
        if (!r.lingerAt) r.lingerAt = tm;
        else if (tm - r.lingerAt > LINGER) {
          this.retire(tm, 0.55);
          this.emit();
        }
      } else r.lingerAt = 0;
    }
    const rounds = this.round ? [...this.ghosts, this.round] : this.ghosts;
    for (const rr of rounds) this.step(rr, tm, dt);
    this.ghosts = this.ghosts.filter((g) => !g.alpha.done(tm));
  }

  step(r, tm, dt) {
    for (const o of r.orbs) {
      o.s.step(dt);
      if (o.hl > 0) o.hl = Math.max(0, o.hl - dt * 3);
      if (o.exiting && o.ex.done(tm) && tm > o.ex.t0) o.dead = true;
    }
    if (r.orbs.some((o) => o.dead)) r.orbs = r.orbs.filter((o) => !o.dead);
    for (const s of r.sonars) {
      if (tm >= s.next && !s.o.exiting) {
        s.next = tm + s.every;
        const ink = s.o.ink.val(tm) > 0.5;
        this.ripple(r, s.o.x, s.o.y, ink ? INK : WHITE, tm, ink ? 0.5 : 0.45, 4.4, 1.25);
        r.rings[r.rings.length - 1].dur = 1.6;
      }
    }
    r.rings = r.rings.filter((g) => tm < g.at + g.dur);
    for (const p of r.parts) {
      if (tm < p.at) continue;
      const drag = Math.exp(-3.2 * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + 420 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    r.parts = r.parts.filter((p) => tm < p.at + p.life);
  }

  draw(tm) {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const g of this.ghosts) this.drawRound(g, tm, g.alpha.val(tm));
    if (this.round) this.drawRound(this.round, tm, this.round.alpha.val(tm));
    ctx.globalAlpha = 1;
  }

  drawRound(r, tm, A) {
    if (A <= 0.002) return;
    const { ctx, w, h } = this;
    const R0 = this.mR();

    // dim the backdrop a little while fingers are down
    const pres = r.presence.val(tm);
    if (pres > 0) {
      ctx.globalAlpha = A * pres * 0.35;
      ctx.fillStyle = '#030405';
      ctx.fillRect(0, 0, w, h);
    }

    // light pools under every target
    for (const o of r.orbs) {
      const s = o.s.x * o.ex.val(tm);
      if (s < 0.03) continue;
      const size = R0 * 6 * s;
      ctx.globalAlpha = A * 0.32 * o.alpha.val(tm) * (1 - o.gray.val(tm) * 0.7) * (1 - o.ink.val(tm));
      ctx.drawImage(glow(o.color(tm)), o.x - size / 2, o.y - size / 2, size, size);
    }

    // winner flood: flat color, dot grid, soft edge shade
    const f = r.flood;
    if (f) {
      const k = clamp((tm - f.at) / f.dur, 0, 1);
      if (k > 0) {
        const maxR = Math.max(Math.hypot(f.x, f.y), Math.hypot(w - f.x, f.y), Math.hypot(f.x, h - f.y), Math.hypot(w - f.x, h - f.y)) + 4;
        const e = easeOutCubic(k);
        ctx.save();
        ctx.beginPath();
        if (k >= 1) ctx.rect(0, 0, w, h);
        else ctx.arc(f.x, f.y, maxR * e, 0, TAU);
        ctx.clip();
        ctx.globalAlpha = A;
        ctx.fillStyle = css(f.c);
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = dots(ctx);
        ctx.fillRect(0, 0, w, h);
        if (!f.vig || f.vigW !== w || f.vigH !== h) {
          f.vig = ctx.createRadialGradient(f.x, f.y, R0 * 1.6, f.x, f.y, maxR);
          f.vig.addColorStop(0, 'rgba(0,0,0,0)');
          f.vig.addColorStop(1, 'rgba(0,0,0,0.32)');
          f.vigW = w;
          f.vigH = h;
        }
        ctx.fillStyle = f.vig;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        // the expanding edge
        if (k < 1) {
          ctx.globalAlpha = A * (1 - k);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(f.x, f.y, maxR * e, 0, TAU);
          ctx.stroke();
        }
      }
    }

    // dim layer (several, reflex)
    const d = r.dim.val(tm);
    if (d > 0.002) {
      ctx.globalAlpha = A * d;
      ctx.fillStyle = '#030405';
      ctx.fillRect(0, 0, w, h);
    }
    for (const o of r.spots) {
      const s = o.s.x * o.ex.val(tm);
      const size = R0 * 8 * s;
      ctx.globalAlpha = A * 0.55;
      ctx.drawImage(glow(o.base), o.x - size / 2, o.y - size / 2, size, size);
    }

    if (r.groups) this.drawGroups(r, tm, A, R0);

    for (const g of r.rings) {
      const k = (tm - g.at) / g.dur;
      if (k < 0) continue;
      const e = easeOutCubic(k);
      ctx.globalAlpha = A * g.a * Math.pow(1 - k, 1.4);
      ctx.strokeStyle = css(g.c);
      ctx.lineWidth = g.w;
      ctx.beginPath();
      ctx.arc(g.x, g.y, lerp(g.r0, g.r1, e), 0, TAU);
      ctx.stroke();
    }

    for (const o of r.orbs) this.drawOrb(o, tm, A, r, R0);

    for (const p of r.parts) {
      const age = tm - p.at;
      if (age < 0) continue;
      const k = age / p.life;
      ctx.globalAlpha = A * (k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1);
      ctx.fillStyle = css(p.c);
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }

    if (r.flash) {
      const k = (tm - r.flash.at) / r.flash.dur;
      if (k >= 0 && k < 1) {
        ctx.globalAlpha = A * 0.5 * Math.pow(1 - k, 2);
        ctx.fillStyle = css(FLASH);
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  // One target: core, ring, 40-tick dial (the countdown), corner brackets
  // that close in like a lock-on, and a P-label.
  drawOrb(o, tm, A, r, R0) {
    const { ctx } = this;
    const s = Math.max(0, o.s.x) * o.ex.val(tm);
    if (s < 0.01) return;
    let a = A * o.alpha.val(tm);
    if (o.exiting) {
      const k = tm - o.ex.t0;
      if (k > 0 && k < 0.2 && Math.sin(k * 110) < 0) a *= 0.25; // digital flicker on exit
    }
    if (a < 0.01) return;
    const prog = r.phase === 'gather' ? r.progress : 0;
    const R = R0 * s * (1 + 0.018 * Math.sin(tm * (2.2 + 6 * prog) + o.phase));
    let x = o.x;
    let y = o.y;
    if (o.kick) {
      const k = tm - o.kick;
      if (k >= 0 && k < 0.35) {
        const amp = (1 - k / 0.35) * R0 * 0.08;
        x += Math.sin(k * 80) * amp;
      }
    }
    let col = o.color(tm);
    const gray = o.gray.val(tm);
    if (gray > 0) {
      const l = luma(col) * 255 * 0.75;
      col = mix(col, [l, l, l + 8], gray * 0.85);
    }
    const ink = o.ink.val(tm);
    const wh = o.white.val(tm);
    const hl = o.hl;
    // line color: player color -> white when selected -> black on the flood
    let line = mix(col, WHITE, Math.max(wh, hl * 0.9));
    line = mix(line, INK, ink);

    // glow
    if (ink < 0.99) {
      const G = R * 3.4;
      ctx.globalAlpha = a * (0.6 + 0.4 * hl) * (1 - ink);
      ctx.drawImage(glow(col), x - G / 2, y - G / 2, G, G);
    }

    // dial: unlit ticks, then lit ticks up to the countdown progress
    const lit = o.role === 'winner' || wh > 0.5 ? TICKS : Math.floor(prog * TICKS);
    const t0r = R * 1.17;
    const t1r = R * (1.17 + 0.13);
    ctx.lineCap = 'butt';
    ctx.lineWidth = Math.max(1.5, R0 * 0.035);
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (let i = pass === 0 ? lit : 0; i < (pass === 0 ? TICKS : lit); i++) {
        const ang = -Math.PI / 2 + (i / TICKS) * TAU;
        const c = Math.cos(ang);
        const sn = Math.sin(ang);
        const long = i % 10 === 0 ? 1.06 : 1;
        ctx.moveTo(x + c * t0r, y + sn * t0r);
        ctx.lineTo(x + c * t1r * long, y + sn * t1r * long);
      }
      if (pass === 0) {
        ctx.globalAlpha = a * (ink > 0.5 ? 0.35 : 0.24);
        ctx.strokeStyle = css(line);
      } else {
        ctx.globalAlpha = a;
        ctx.strokeStyle = css(ink > 0.5 ? INK : mix(col, WHITE, 0.35 + 0.65 * Math.max(wh, prog > 0.98 ? 1 : 0)));
      }
      ctx.stroke();
    }

    // ring
    ctx.globalAlpha = a;
    ctx.lineWidth = Math.max(2, R * 0.05);
    ctx.strokeStyle = css(line);
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.stroke();

    // core
    const label = o.label && tm >= o.labelAt;
    const cr = R * (label ? 0.46 : 0.36);
    const core = mix(mix(col, WHITE, hl * 0.6), INK, ink);
    ctx.fillStyle = css(core);
    ctx.beginPath();
    ctx.arc(x, y, cr, 0, TAU);
    ctx.fill();
    if (!label) {
      ctx.fillStyle = css(ink > 0.5 ? (r.flood ? r.flood.c : col) : INK);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, cr * 0.22), 0, TAU);
      ctx.fill();
    }

    // corner brackets: faint and wide while gathering, tighten with the
    // countdown, lock on reveal
    const lock = Math.max(o.lock.val(tm), prog);
    const B = R * lerp(1.62, 1.44, lock);
    const arm = R * 0.32;
    ctx.lineWidth = Math.max(2, R0 * 0.045);
    ctx.lineCap = 'square';
    ctx.strokeStyle = css(line);
    ctx.globalAlpha = a * (0.32 + 0.68 * Math.max(lock, hl));
    ctx.beginPath();
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const cx = x + sx * B;
      const cy = y + sy * B;
      ctx.moveTo(cx - sx * arm, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy - sy * arm);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';

    // P-label above the top-left bracket
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = css(line);
    ctx.font = `600 ${Math.round(clamp(R0 * 0.24, 10, 14))}px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(o.tag, clamp(x - B, 6, this.w - 30), Math.max(18, y - B - 5));

    // letter / number inside the core
    if (label) {
      const k = clamp((tm - o.labelAt) / 0.32, 0, 1);
      const ls = easeOutBack(k);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(ls, ls);
      ctx.globalAlpha = a;
      ctx.font = `700 ${Math.round(cr * 1.05)}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = luma(core) > 0.55 ? css(INK) : '#ffffff';
      ctx.fillText(o.label, 0, cr * 0.06);
      ctx.restore();
    }

    // reaction time under the target
    if (o.sub) {
      const yy = y + B + R0 * 0.55;
      ctx.font = `700 ${Math.round(R0 * 0.36)}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(o.sub).width + R0 * 0.5;
      const th = R0 * 0.62;
      ctx.globalAlpha = a;
      ctx.fillStyle = css(INK);
      ctx.fillRect(x - tw / 2, yy - th / 2, tw, th);
      ctx.fillStyle = r.flood ? css(r.flood.c) : '#ffffff';
      ctx.fillText(o.sub, x, yy + 1);
    }
  }

  drawGroups(r, tm, A, R0) {
    const { ctx } = this;
    const k = clamp((tm - r.groups.at) / 0.5, 0, 1);
    const e = easeOutCubic(k);
    for (const g of r.groups.list) {
      const pts = g.orbs.filter((o) => !o.exiting).map((o) => [o.x, o.y]);
      if (!pts.length) continue;
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const size = R0 * 9;
      ctx.globalAlpha = A * 0.3 * e;
      ctx.drawImage(glow(g.c), cx - size / 2, cy - size / 2, size, size);
      if (pts.length < 2) continue;
      pts.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (pts.length > 2) ctx.closePath();
      if (pts.length > 2) {
        ctx.globalAlpha = A * 0.07 * e;
        ctx.fillStyle = css(g.c);
        ctx.fill();
      }
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -tm * 20;
      ctx.globalAlpha = A * 0.75 * e;
      ctx.strokeStyle = css(g.c);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
  }

  // ---------- state for the UI ----------
  snapshot() {
    const r = this.round;
    return {
      phase: r ? r.phase : 'idle',
      sub: r ? r.sub : '',
      live: r ? r.live().length : 0,
      min: this.minPlayers(),
      waiting: !!(r && r.waiting),
      armed: !!(r && r.armedAt && r.phase === 'gather'),
      down: this.fingersDown(),
      input: this.input,
      mode: this.modeId,
    };
  }

  emit() {
    this.hooks.state(this.snapshot());
  }
}
