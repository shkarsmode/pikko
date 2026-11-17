// Game engine: turns fingers (or tap markers) into orbs, waits for a still
// moment, then plays the reveal of the active mode. Rendering is Canvas 2D,
// time-based (works the same at 60 and 120 Hz), and the loop sleeps when idle.
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

export const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

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
    colors: ['#FF4D6D', '#FFB020', '#2EE59D', '#38BDF8', '#9B7BFF', '#FF7A33', '#F15BB5', '#B7F34E', '#FFE14D', '#22D3C5', '#FF8FAB', '#7DD3FC'],
    teams: ['#FF4D6D', '#38BDF8', '#B7F34E', '#FFB020'],
  },
  pastel: {
    colors: ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFB5E8', '#B5EAD7', '#E2F0CB', '#C7CEEA'],
    teams: ['#FFADAD', '#9BF6FF', '#CAFFBF', '#BDB2FF'],
  },
  sunset: {
    colors: ['#FF5E5B', '#FF9F1C', '#FFD23F', '#FF4F9A', '#C04CFD', '#FF7B54', '#F72585', '#FFB4A2', '#E76F51', '#FCA311', '#B5179E', '#FF8C42'],
    teams: ['#FF5E5B', '#C04CFD', '#FFD23F', '#22D3C5'],
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

const hex2rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const luma = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const WHITE = [255, 255, 255];
const INK = [11, 9, 20];
const RED = [255, 69, 58];
export const rgbHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// Soft glow sprites, cached per (quantized) color.
const glowCache = new Map();
function glow(c) {
  const q = [c[0] & 0xf0, c[1] & 0xf0, c[2] & 0xf0];
  const key = (q[0] << 16) | (q[1] << 8) | q[2];
  let cv = glowCache.get(key);
  if (cv) return cv;
  if (glowCache.size > 400) glowCache.clear();
  const S = 192;
  cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, css(c, 0.85));
  gr.addColorStop(0.22, css(c, 0.42));
  gr.addColorStop(0.5, css(c, 0.12));
  gr.addColorStop(1, css(c, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  glowCache.set(key, cv);
  return cv;
}

class Spring {
  constructor(x = 0, k = 260, c = 17) {
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
    this.idx = idx;
    this.base = rgb;
    this.c0 = rgb;
    this.c1 = rgb;
    this.cAt = 0;
    this.cDur = 0;
    this.s = new Spring(0);
    this.s.t = 1;
    this.ex = new Tween(1); // exit multiplier
    this.alpha = new Tween(1);
    this.white = new Tween(0);
    this.gray = new Tween(0);
    this.exiting = false;
    this.dead = false;
    this.down = true;
    this.phase = Math.random() * TAU;
    this.spin = Math.random() * TAU;
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
    this.path = null;
    this.pathAt = 0;
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
  }
  live() {
    return this.orbs.filter((o) => !o.exiting);
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
    // true while a round is on screen and should not be interrupted
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
    const o = new Orb(id, x, y, this.nextColor(r), tm, r.orbs.length);
    r.orbs.push(o);
    this.touch.set(id, o);
    r.lastChange = tm;
    r.ticks = 0;
    this.ripple(r, x, y, o.base, tm, 0.55, 1.9);
    sfx.down(r.live().length - 1);
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
    const o = new Orb('m' + this.seq++, x, y, this.nextColor(r), tm, r.orbs.length);
    o.down = false;
    r.orbs.push(o);
    this.ripple(r, x, y, o.base, tm, 0.5, 1.7);
    sfx.down(r.live().length - 1);
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
    marks.forEach((m, i) => {
      const o = new Orb('m' + this.seq++, m.x, m.y, m.c, tm, i);
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
    return this.input === 'marker' && n > 8 ? this.R * 0.78 : this.R;
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
    this.kick();
  }

  beginReveal(tm) {
    const r = this.round;
    r.phase = 'reveal';
    r.progress = 1;
    r.markers = r.live().map((o) => ({ x: o.x, y: o.y, c: o.base }));
    haptic('medium');
    const live = r.live();
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
    r.at(tm, (t0) => {
      if (this.round !== r) return;
      r.phase = 'result';
      r.lingerAt = 0;
      this.hooks.caption(cap);
      this.emit();
      this.hooks.roundDone(this.modeId);
      void t0;
    });
  }

  crown(r, o, tm, flood = true) {
    o.role = 'winner';
    o.s.t = 1.3;
    o.white.to(1, tm, 0.45);
    o.gray.to(0, tm, 0.2);
    if (flood) r.flood = { x: o.x, y: o.y, c: o.base, at: tm, dur: 0.72, vig: null };
    this.confetti(r, o.x, o.y, 64, tm);
    r.sonars.push({ o, every: 1.2, next: tm + 0.1 });
    sfx.win();
    haptic('success');
  }

  revealOne(r, live, tm) {
    const win = live[rnd(live.length)];
    sfx.charge();
    live.forEach((o) => (o.s.t = 0.82));
    r.at(tm + 0.22, (t0) => {
      this.crown(r, win, t0);
      live.forEach((o, i) => o !== win && this.exitOrb(r, o, t0 + i * 0.035, 0.3));
      this.toResult(r, t0 + 0.6, { text: t('cap.winner') });
    });
  }

  revealN(r, live, tm) {
    const k = Math.min(this.opts.pickN, live.length - 1);
    const wins = shuffle(live.slice()).slice(0, k);
    const step = 0.24 * this.speed().k;
    sfx.charge();
    live.forEach((o) => (o.s.t = 0.84));
    r.dim.to(0.7, tm + 0.15, 0.6);
    wins.forEach((o, i) =>
      r.at(tm + 0.25 + i * step, (t0) => {
        o.role = 'winner';
        o.s.t = 1.22;
        o.white.to(0.9, t0, 0.4);
        o.hl = 1;
        r.spots.push(o);
        this.ripple(r, o.x, o.y, WHITE, t0, 1, 3.2, 0.7);
        this.confetti(r, o.x, o.y, 22, t0);
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
    this.toResult(r, tEnd + 0.35, { text: t('cap.winners', k) });
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
    live.forEach((o) => (o.s.t = 0.86));
    groups.forEach((members, ti) =>
      r.at(tm + 0.25 + ti * step, (t0) => {
        members.forEach((o, j) => {
          const at = t0 + j * 0.05;
          o.setColor(cols[ti], at, 0.34);
          o.base = cols[ti];
          o.label = LETTERS[ti];
          o.labelAt = at;
          o.s.t = 1.06;
          o.hl = 1;
          this.ripple(r, o.x, o.y, cols[ti], at, 0.9, 2.4);
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
      text: '',
      chips: groups.map((m, ti) => ({ color: rgbHex(cols[ti]), text: `${t('team', LETTERS[ti])} · ${m.length}` })),
    });
  }

  revealOrder(r, live, tm) {
    const order = shuffle(live.slice());
    const step = 0.42 * this.speed().k;
    sfx.charge();
    live.forEach((o) => (o.s.t = 0.86));
    order.forEach((o, i) =>
      r.at(tm + 0.3 + i * step, (t0) => {
        o.rank = i;
        o.label = String(i + 1);
        o.labelAt = t0;
        o.s.t = i === 0 ? 1.16 : 1;
        o.hl = 1;
        this.ripple(r, o.x, o.y, o.base, t0, 0.9, 2.3);
        sfx.order(i);
        haptic(i === 0 ? 'medium' : 'light');
      }),
    );
    const tEnd = tm + 0.3 + order.length * step;
    r.at(tEnd, (t0) => {
      const first = order[0];
      first.white.to(0.35, t0, 0.4);
      r.sonars.push({ o: first, every: 1.3, next: t0 });
      sfx.win();
      haptic('success');
    });
    this.toResult(r, tEnd + 0.1, { text: t('cap.order') });
  }

  revealElim(r, live, tm) {
    const sp = this.speed().k;
    sfx.charge();
    live.forEach((o) => (o.s.t = 0.9));
    const step = (t0) => {
      const rem = r.live();
      if (rem.length <= 1) {
        const w = rem[0];
        if (w) {
          r.at(t0, (t1) => this.crown(r, w, t1));
          this.toResult(r, t0 + 0.6, { text: t('cap.last') });
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
        this.shards(r, victim.x, victim.y, victim.base, t1);
        this.exitOrb(r, victim, t1, 0.18);
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
      r.flash = { at: t0, dur: 0.5 };
      r.live()
        .filter((o) => !o.false)
        .forEach((o) => {
          o.gray.to(0, t0, 0.12);
          o.s.t = 1.12;
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
      o.setColor(RED, tm, 0.18);
      o.gray.to(0, tm, 0.1);
      o.label = '✕';
      o.labelAt = tm;
      o.s.t = 0.74;
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
          this.toResult(r, tm + 0.9, { text: t('cap.solo') });
        } else {
          this.toResult(r, tm + 0.4, { text: t('cap.allFalse') });
        }
      } else {
        this.hooks.big({ text: t('cap.ready'), sub: t('cap.false'), kind: 'ready', shake: true });
      }
    } else if (r.sub === 'go') {
      r.sub = 'done';
      const ms = Math.max(1, Math.round((tm - r.goAt) * 1000));
      this.hooks.big(null);
      o.sub = t('cap.ms', ms);
      this.crown(r, o, tm);
      r.live().forEach((x, i) => x !== o && this.exitOrb(r, x, tm + 0.1 + i * 0.04, 0.3));
      this.toResult(r, tm + 0.6, { text: `${t('cap.fast')} ${t('cap.ms', ms)}` });
    }
  }

  // ---------- effects ----------
  exitOrb(r, o, at, dur = 0.25) {
    if (o.exiting) return;
    o.exiting = true;
    o.ex.to(0, at, dur, easeInCubic);
    o.alpha.to(0, at, dur, easeInCubic);
  }

  ripple(r, x, y, c, at, a = 0.6, scale = 2, w = 3) {
    r.rings.push({ x, y, c, at, dur: 0.65, r0: this.R * 0.7, r1: this.R * scale, a, w });
  }

  confetti(r, x, y, n, at) {
    const cols = this.palette().colors.map(hex2rgb).concat([WHITE, WHITE]);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * TAU;
      const sp = 260 + Math.random() * 720;
      r.parts.push({
        kind: 'c',
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 220,
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 14,
        flip: Math.random() * TAU,
        vf: 6 + Math.random() * 10,
        w: 5 + Math.random() * 5,
        h: 8 + Math.random() * 7,
        c: cols[rnd(cols.length)],
        at,
        life: 1.4 + Math.random() * 1.1,
      });
    }
  }

  shards(r, x, y, c, at) {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * TAU + Math.random() * 0.4;
      const sp = 180 + Math.random() * 420;
      r.parts.push({
        kind: 's',
        x: x + Math.cos(ang) * this.R * 0.4,
        y: y + Math.sin(ang) * this.R * 0.4,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 18,
        flip: 0,
        vf: 0,
        w: 7 + Math.random() * 9,
        h: 7 + Math.random() * 9,
        c: mix(c, WHITE, Math.random() * 0.3),
        at,
        life: 0.6 + Math.random() * 0.4,
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
      if (this.input === 'hold') {
        dur = this.speed().hold;
        if (live >= min) p = clamp((tm - r.lastChange - SETTLE) / dur, 0, 1);
      } else if (r.armedAt) {
        dur = MK_HOLD;
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
    const prog = r.phase === 'gather' ? r.progress : 0;
    for (const o of r.orbs) {
      o.s.step(dt);
      o.spin += dt * (1.1 + 7 * prog * prog) * (o.role === 'winner' ? 0.55 : 1);
      if (o.hl > 0) o.hl = Math.max(0, o.hl - dt * 3);
      if (o.exiting && o.ex.done(tm) && tm > o.ex.t0) o.dead = true;
    }
    if (r.orbs.some((o) => o.dead)) r.orbs = r.orbs.filter((o) => !o.dead);
    for (const s of r.sonars) {
      if (tm >= s.next && !s.o.exiting) {
        s.next = tm + s.every;
        this.ripple(r, s.o.x, s.o.y, WHITE, tm, 0.55, 4.2, 2.5);
        r.rings[r.rings.length - 1].dur = 1.5;
      }
    }
    r.rings = r.rings.filter((g) => tm < g.at + g.dur);
    const g = 1300;
    for (const p of r.parts) {
      if (tm < p.at) continue;
      const drag = Math.exp(-(p.kind === 'c' ? 2.6 : 3.4) * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + g * dt * (p.kind === 'c' ? 0.55 : 0.9);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.flip += p.vf * dt;
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

    // darken the backdrop a little while fingers are down
    const pres = r.presence.val(tm);
    if (pres > 0) {
      ctx.globalAlpha = A * pres * 0.32;
      ctx.fillStyle = '#05040b';
      ctx.fillRect(0, 0, w, h);
    }

    // colored light pools under every orb
    for (const o of r.orbs) {
      const s = o.s.x * o.ex.val(tm);
      if (s < 0.03) continue;
      const size = R0 * 6 * s;
      ctx.globalAlpha = A * 0.22 * o.alpha.val(tm) * (1 - o.gray.val(tm) * 0.7);
      ctx.drawImage(glow(o.color(tm)), o.x - size / 2, o.y - size / 2, size, size);
    }

    // winner flood
    const f = r.flood;
    if (f) {
      const k = clamp((tm - f.at) / f.dur, 0, 1);
      if (k > 0) {
        const maxR = Math.max(Math.hypot(f.x, f.y), Math.hypot(w - f.x, f.y), Math.hypot(f.x, h - f.y), Math.hypot(w - f.x, h - f.y)) + 4;
        const e = easeOutCubic(k);
        ctx.globalAlpha = A;
        ctx.fillStyle = css(mix(f.c, INK, 0.08));
        if (k >= 1) ctx.fillRect(0, 0, w, h);
        else {
          ctx.beginPath();
          ctx.arc(f.x, f.y, maxR * e, 0, TAU);
          ctx.fill();
        }
        if (!f.vig || f.vigW !== w || f.vigH !== h) {
          f.vig = ctx.createRadialGradient(f.x, f.y, R0 * 1.4, f.x, f.y, maxR);
          f.vig.addColorStop(0, 'rgba(8,6,16,0)');
          f.vig.addColorStop(0.55, 'rgba(8,6,16,0.16)');
          f.vig.addColorStop(1, 'rgba(8,6,16,0.5)');
          f.vigW = w;
          f.vigH = h;
        }
        ctx.globalAlpha = A * e;
        ctx.fillStyle = f.vig;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // dim layer (pick several, reflex)
    const d = r.dim.val(tm);
    if (d > 0.002) {
      ctx.globalAlpha = A * d;
      ctx.fillStyle = '#06050c';
      ctx.fillRect(0, 0, w, h);
    }
    for (const o of r.spots) {
      const s = o.s.x * o.ex.val(tm);
      const size = R0 * 9 * s;
      ctx.globalAlpha = A * 0.5;
      ctx.drawImage(glow(o.base), o.x - size / 2, o.y - size / 2, size, size);
    }

    if (r.groups) this.drawGroups(r, tm, A, R0);

    // rings
    for (const g of r.rings) {
      const k = (tm - g.at) / g.dur;
      if (k < 0) continue;
      const e = easeOutCubic(k);
      ctx.globalAlpha = A * g.a * Math.pow(1 - k, 1.6);
      ctx.strokeStyle = css(g.c);
      ctx.lineWidth = g.w * (1 - k * 0.6);
      ctx.beginPath();
      ctx.arc(g.x, g.y, lerp(g.r0, g.r1, e), 0, TAU);
      ctx.stroke();
    }

    for (const o of r.orbs) this.drawOrb(o, tm, A, r, R0);
    this.drawParts(r, tm, A);

    if (r.flash) {
      const k = (tm - r.flash.at) / r.flash.dur;
      if (k >= 0 && k < 1) {
        ctx.globalAlpha = A * 0.85 * Math.pow(1 - k, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  drawOrb(o, tm, A, r, R0) {
    const { ctx } = this;
    const s = Math.max(0, o.s.x) * o.ex.val(tm);
    if (s < 0.01) return;
    const a = A * o.alpha.val(tm);
    if (a < 0.01) return;
    const prog = r.phase === 'gather' ? r.progress : 0;
    const breathe = 1 + 0.032 * Math.sin(tm * (2.3 + 6 * prog) + o.phase);
    const R = R0 * s * breathe;
    let x = o.x;
    let y = o.y;
    if (o.kick) {
      const k = tm - o.kick;
      if (k >= 0 && k < 0.4) {
        const amp = (1 - k / 0.4) * R0 * 0.09;
        x += Math.sin(k * 70) * amp;
        y += Math.cos(k * 55) * amp * 0.5;
      }
    }
    let col = o.color(tm);
    const gray = o.gray.val(tm);
    if (gray > 0) {
      const l = luma(col) * 255 * 0.8;
      col = mix(col, [l, l, l + 12], gray * 0.85);
    }
    const wh = o.white.val(tm);
    const hl = o.hl;

    // glow
    const G = R * 3.2;
    ctx.globalAlpha = a * (0.7 + 0.3 * hl);
    ctx.drawImage(glow(col), x - G / 2, y - G / 2, G, G);
    if (wh > 0.01) {
      ctx.globalAlpha = a * wh * 0.55;
      ctx.drawImage(glow(WHITE), x - G / 2, y - G / 2, G, G);
    }

    // countdown arc
    if (prog > 0) {
      const ar = R * 1.52;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2.5, R0 * 0.065);
      ctx.globalAlpha = a * 0.16;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, ar, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = a * 0.95;
      ctx.beginPath();
      ctx.arc(x, y, ar, -Math.PI / 2, -Math.PI / 2 + TAU * prog);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // orbiting satellites
    const satR = R * 1.27;
    const dot = Math.max(2.2, R0 * 0.062) * s;
    ctx.globalAlpha = a * 0.88;
    ctx.fillStyle = css(mix(col, WHITE, 0.75));
    for (let i = 0; i < 3; i++) {
      const ang = o.spin + (i * TAU) / 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(ang) * satR, y + Math.sin(ang) * satR, dot, 0, TAU);
      ctx.fill();
    }

    // ring
    ctx.globalAlpha = a;
    ctx.lineWidth = Math.max(3, R * 0.085);
    ctx.strokeStyle = css(mix(col, WHITE, Math.max(wh, hl * 0.85)));
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.stroke();

    // core
    const cr = R * 0.7;
    const core = mix(col, WHITE, wh * 0.9);
    const gr = ctx.createRadialGradient(x - cr * 0.35, y - cr * 0.42, cr * 0.08, x, y, cr);
    gr.addColorStop(0, css(mix(core, WHITE, 0.5)));
    gr.addColorStop(0.62, css(core));
    gr.addColorStop(1, css(mix(core, INK, 0.2)));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, cr, 0, TAU);
    ctx.fill();

    if (o.label) {
      const k = clamp((tm - o.labelAt) / 0.38, 0, 1);
      if (k > 0) {
        const ls = easeOutBack(k);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(ls, ls);
        ctx.font = `800 ${Math.round(cr * 1.02)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = luma(core) > 0.6 ? 'rgba(14,10,26,0.9)' : '#ffffff';
        ctx.fillText(o.label, 0, cr * 0.07);
        ctx.restore();
      }
    }
    if (o.sub) {
      const yy = y + R * 1.95;
      ctx.font = `800 ${Math.round(R0 * 0.42)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(o.sub).width + R0 * 0.5;
      const th = R0 * 0.7;
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = '#0b0914';
      this.pill(x - tw / 2, yy - th / 2, tw, th);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(o.sub, x, yy + 1);
    }
  }

  pill(x, y, w, h) {
    const { ctx } = this;
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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
      const size = R0 * 10;
      ctx.globalAlpha = A * 0.28 * e;
      ctx.drawImage(glow(g.c), cx - size / 2, cy - size / 2, size, size);
      if (pts.length < 2) continue;
      pts.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (pts.length > 2) ctx.closePath();
      if (pts.length > 2) {
        ctx.globalAlpha = A * 0.1 * e;
        ctx.fillStyle = css(g.c);
        ctx.fill();
      }
      let len = 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const q = pts[(i + 1) % pts.length];
        if (i === pts.length - 1 && pts.length === 2) break;
        len += Math.hypot(q[0] - p[0], q[1] - p[1]);
      }
      ctx.setLineDash([len * e, len + 1]);
      ctx.globalAlpha = A * 0.7;
      ctx.strokeStyle = css(g.c);
      ctx.lineWidth = Math.max(3, R0 * 0.07);
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }


  drawParts(r, tm, A) {
    const { ctx, dpr } = this;
    let any = false;
    for (const p of r.parts) {
      const age = tm - p.at;
      if (age < 0) continue;
      const k = age / p.life;
      const a = A * (k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1);
      if (a <= 0) continue;
      any = true;
      const cos = Math.cos(p.rot);
      const sin = Math.sin(p.rot);
      const fy = p.kind === 'c' ? Math.cos(p.flip) : 1;
      ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin * fy, dpr * cos * fy, dpr * p.x, dpr * p.y);
      ctx.globalAlpha = a;
      ctx.fillStyle = css(p.c);
      if (p.kind === 'c') ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      else {
        ctx.beginPath();
        ctx.moveTo(0, -p.h / 2);
        ctx.lineTo(p.w / 2, p.h / 2);
        ctx.lineTo(-p.w / 2, p.h / 3);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (any) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
