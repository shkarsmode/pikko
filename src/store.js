// Tiny localStorage wrapper. Every access is guarded: private mode, blocked
// storage or a full quota must never break the app.
const P = 'pikko.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(P + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(P + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep running in memory */
  }
}

export function drop(key) {
  try {
    localStorage.removeItem(P + key);
  } catch {
    /* ignore */
  }
}

export function dropAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(P))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

const DEFAULTS = {
  speed: 'normal', // fast | normal | slow
  sound: true,
  haptics: true,
  palette: 'neon', // neon | pastel | sunset
  lang: 'auto', // auto | en | ru | uk
  autoPromos: true,
  mode: 'one',
  pickN: 2,
  teams: 2,
  markers: false,
};

export const settings = Object.assign({}, DEFAULTS, load('settings', {}));

export function saveSettings() {
  save('settings', settings);
}

// Usage counters that drive promo triggers.
export const stats = Object.assign(
  { launches: 0, rounds: 0, firstSeen: false, lastPromoAt: 0, winbackDay: '', offerEndsAt: 0, trialNotified: false },
  load('stats', {}),
);

export function saveStats() {
  save('stats', stats);
}
