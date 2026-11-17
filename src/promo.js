// Premium mock and promo screens. Nothing here takes money: every "purchase"
// just flips a flag in localStorage after a short fake delay.
import { sfx } from './audio.js';
import { button, h, icon, modal, sheet, switchEl, toast } from './dom.js';
import { haptic } from './haptics.js';
import { fmtDate, prices, t } from './i18n.js';
import { HERO, MODE_ICONS } from './icons.js';
import { drop, load, save, saveStats, settings, stats } from './store.js';

// ---------- premium state ----------
const subs = new Set();
export const onPremium = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
const changed = () => subs.forEach((fn) => fn());

export const premium = {
  get: () => load('premium', null),
  active() {
    const p = this.get();
    return !!p && (!p.until || Date.now() < p.until);
  },
  grant(plan, days) {
    save('premium', { plan, since: Date.now(), until: days ? Date.now() + days * 864e5 : null });
    stats.trialNotified = false;
    saveStats();
    changed();
  },
  reset() {
    drop('premium');
    changed();
  },
};

const LOCKED = new Set(['mode:n', 'mode:elim', 'mode:reaction', 'markers', 'palette:phosphor', 'palette:amber']);
export const isPro = (feature) => LOCKED.has(feature);
export const isLocked = (feature) => LOCKED.has(feature) && !premium.active();

export function checkTrialEnd() {
  const p = premium.get();
  if (p && p.until && Date.now() > p.until && !stats.trialNotified) {
    stats.trialNotified = true;
    saveStats();
    setTimeout(() => toast(t('toast.trialEnded'), 3600), 800);
  }
}

// ---------- presenting ----------
let current = null;
let pending = null;
let gate = () => true;
export const setGate = (fn) => (gate = fn);
export const promoOpen = () => !!current;

const counters = {};
function variant(kind, n, opts) {
  if (opts.v) return opts.v;
  if (opts.demo) {
    counters[kind] = ((counters[kind] || 0) % n) + 1;
    return counters[kind];
  }
  return 1 + Math.floor(Math.random() * n);
}

export function show(kind, opts = {}) {
  if (current) {
    if (opts.force) current.close();
    else return;
  }
  if (!opts.force && !gate()) {
    pending = [kind, opts];
    return;
  }
  const build = BUILDERS[kind];
  if (!build) return;
  current = build(opts);
  stats.lastPromoAt = Date.now();
  saveStats();
}

export function flush() {
  if (pending && !current && gate()) {
    const [k, o] = pending;
    pending = null;
    setTimeout(() => show(k, o), 350);
  }
}

function closed() {
  current = null;
}

// ---------- triggers ----------
export function onBoot(params) {
  stats.launches++;
  saveStats();
  checkTrialEnd();
  const p = params.get('promo');
  if (p) {
    const kind = p === 'stay' ? 'winback' : p;
    if (BUILDERS[kind]) {
      stats.firstSeen = true;
      saveStats();
      setTimeout(() => show(kind, { force: true, feature: params.get('feature') || 'mode:elim' }), 500);
      return;
    }
  }
  if (!stats.firstSeen) {
    stats.firstSeen = true;
    saveStats();
    if (settings.autoPromos && !premium.active()) setTimeout(() => show('gift'), 900);
    return;
  }
  if (!premium.active() && settings.autoPromos && stats.launches % 3 === 0) setTimeout(() => show('paywall'), 800);
}

export function onRoundDone() {
  stats.rounds++;
  saveStats();
  if (premium.active() || !settings.autoPromos) return;
  if (Date.now() - stats.lastPromoAt < 40e3) return;
  if (stats.rounds % 8 === 0) show('paywall');
  else if (stats.rounds % 4 === 0) show('offer');
}

export function onResume(awayMs) {
  if (premium.active() || !settings.autoPromos || current) return;
  const day = new Date().toDateString();
  if (awayMs > 30e3 && stats.winbackDay !== day) {
    stats.winbackDay = day;
    saveStats();
    show('winback');
  }
}

// ---------- shared pieces ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function cta(label, fn, cls = 'cta') {
  const b = button({ class: cls }, [h('span', { class: 'spin' }), h('span', { class: 'lbl', text: label })], () => fn(b));
  return b;
}

function closeX(api, delay = 0) {
  const b = button({ class: 'icon-btn pm-x', 'aria-label': t('a11y.close') }, icon('close'), () => api().close());
  if (delay) {
    b.classList.add('late');
    b.style.setProperty('--late', `${delay}ms`);
  }
  return b;
}

const kicker = (text) => h('span', { class: 'kicker' }, h('i'), text);

function pixels() {
  const cols = ['#3DFF9A', '#4DD7FF', '#FFB547', '#ffffff'];
  return h(
    'div',
    { class: 'pixels', 'aria-hidden': 'true' },
    Array.from({ length: 30 }, (_, i) =>
      h('i', {
        style: {
          '--x': `${(Math.random() * 2 - 1) * 160}px`,
          '--y': `${-60 - Math.random() * 170}px`,
          background: cols[i % cols.length],
          animationDelay: `${Math.random() * 0.12}s`,
        },
      }),
    ),
  );
}

// Fake checkout, then a success view in place of the offer.
function purchase(btn, { plan, days, host, after }) {
  if (btn.disabled) return;
  btn.disabled = true;
  btn.classList.add('busy');
  btn.querySelector('.lbl').textContent = t('buy.busy');
  haptic('medium');
  setTimeout(() => {
    premium.grant(plan, days);
    sfx.success();
    haptic('success');
    const until = days ? Date.now() + days * 864e5 : 0;
    const done = h(
      'div',
      { class: 'success' },
      pixels(),
      h('div', { class: 'tick', html: '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>' }),
      h('code', { class: 'ok-line', text: `status: 200 · premium: true` }),
      h('h2', { text: t('buy.ok') }),
      h('p', { text: days ? t('buy.trial', fmtDate(until)) : t('buy.forever') }),
      cta(t('buy.go'), () => host.api().close()),
    );
    host.el.replaceChildren(done);
    host.el.classList.add('is-success');
    after && after();
  }, 1100);
}

// ---------- 1. first launch: a terminal that "activates" the trial ----------
function gift(opts) {
  const v = variant('gift', 3, opts);
  let api;
  const box = h('div', { class: 'pm pm-gift' });
  const host = { el: box, api: () => api };
  const lines = [
    ['cmd', '$ pikko unlock --trial 3d'],
    ['ok', `✓ ${t('mode.n')} · ${t('mode.elim')} · ${t('mode.reaction')}`],
    ['ok', `✓ ${t('mk.name')} · ≤24 ${t('term.players')}`],
    ['ok', `✓ ${t('term.price')}: 0.00`],
    ['dim', `# ${t('term.cancel')}`],
  ];
  const term = h(
    'div',
    { class: 'term' },
    h('div', { class: 'term-bar' }, h('i'), h('i'), h('i'), h('span', { text: '~/pikko' })),
    h(
      'div',
      { class: 'term-body' },
      lines.map(([k, text], i) => h('div', { class: `ln ${k}`, style: { '--i': i }, text })),
      h('span', { class: 'caret' }),
    ),
  );
  box.append(
    closeX(() => api),
    kicker(t('gift.kicker')),
    h('h2', { class: 'pm-title', text: t(`gift.t${v}`) }),
    h('p', { class: 'pm-sub', text: t(`gift.s${v}`) }),
    term,
    cta(t('cta.claim'), (b) => purchase(b, { plan: 'trial', days: 3, host })),
    button({ class: 'ghost' }, t('cta.later'), () => api.close()),
    h('p', { class: 'fine', text: t('demo.note') }),
  );
  api = modal({ cls: 'pm-center gift-modal', content: box, label: t(`gift.t${v}`), onClose: closed });
  sfx.sparkle();
  haptic('light');
  return api;
}

// ---------- 2. full paywall ----------
function paywall(opts) {
  const v = variant('paywall', 2, opts);
  const P = prices();
  let api;
  let plan = 'year';
  let trial = true;
  const box = h('div', { class: 'pm pm-paywall' });
  const host = { el: box, api: () => api };

  const feats = [t('feat.modes'), t('feat.markers'), t('feat.colors'), t('feat.support')].map((text) => h('li', null, icon('check', 'ic feat-ic'), h('span', { text })));

  const planDefs = {
    year: { title: t('plan.year'), price: t('plan.perYear', P.fmt(P.raw.year)), note: `≈ ${t('plan.perWeek', P.yearPerWeek)}`, badge: `−${P.save}%` },
    week: { title: t('plan.week'), price: t('plan.perWeek', P.fmt(P.raw.week)), note: '' },
    life: { title: t('plan.life'), price: t('plan.once', P.fmt(P.raw.life)), note: '' },
  };
  const cards = {};
  const plansEl = h(
    'div',
    { class: 'plans', role: 'radiogroup' },
    Object.entries(planDefs).map(([id, d]) => {
      const card = button(
        { class: 'plan', role: 'radio', 'data-plan': id },
        [
          h('span', { class: 'plan-radio' }),
          h('span', { class: 'plan-main' }, h('b', null, d.title, d.badge ? h('em', { class: 'plan-save', text: d.badge }) : null), d.note ? h('small', { text: d.note }) : null),
          h('span', { class: 'plan-price', text: d.price }),
          id === 'year' ? h('span', { class: 'plan-trial', text: `// ${t('plan.trial')}` }) : null,
        ],
        () => {
          plan = id;
          if (id !== 'year') trial = false;
          sync();
        },
      );
      cards[id] = card;
      return card;
    }),
  );

  const trialSw = switchEl(
    trial,
    (on) => {
      trial = on;
      if (on) plan = 'year';
      sync();
    },
    t('trial.toggle'),
  );
  const trialRow = h('div', { class: 'trial-row' }, h('span', { text: t('trial.toggle') }), trialSw);
  const go = cta(t('cta.try'), (b) => {
    const days = plan === 'year' && trial ? 3 : plan === 'week' ? 7 : plan === 'year' ? 365 : 0;
    purchase(b, { plan: plan === 'year' && trial ? 'trial' : plan, days, host });
  });
  const note = h('p', { class: 'fine strong' });
  const links = h(
    'div',
    { class: 'pm-links' },
    ['link.restore', 'link.terms', 'link.privacy'].map((k) => button({ class: 'link' }, t(k), () => toast(t('toast.demo')))),
  );

  function sync() {
    Object.entries(cards).forEach(([id, c]) => {
      c.setAttribute('aria-checked', String(id === plan));
      c.classList.toggle('on', id === plan);
    });
    trialSw.checked = trial;
    go.querySelector('.lbl').textContent = trial && plan === 'year' ? t('cta.try') : t('cta.continue');
    const price = plan === 'week' ? t('plan.perWeek', P.fmt(P.raw.week)) : plan === 'life' ? t('plan.once', P.fmt(P.raw.life)) : t('plan.perYear', P.fmt(P.raw.year));
    note.textContent = trial && plan === 'year' ? t('trial.on', P.fmt(P.raw.year)) : t('trial.off', price);
  }
  sync();

  box.append(
    h('div', { class: 'pw-hero', html: HERO }),
    kicker('PIKKO PRO'),
    h('h2', { class: 'pm-title', text: t(`pw.t${v}`) }),
    h('p', { class: 'pm-sub', text: t(`pw.s${v}`) }),
    h('ul', { class: 'feats' }, feats),
    plansEl,
    trialRow,
    go,
    note,
    h('p', { class: 'fine', text: t('demo.note') }),
    links,
  );
  api = modal({ cls: 'pm-full paywall-modal', content: [closeX(() => api, 2200), h('div', { class: 'pm-scroll' }, box)], label: t(`pw.t${v}`), onClose: closed });
  sfx.sparkle();
  return api;
}

// ---------- 3. limited offer: coupon + timer ----------
function offer(opts) {
  const v = variant('offer', 2, opts);
  const P = prices();
  if (!stats.offerEndsAt || stats.offerEndsAt < Date.now() + 5000) {
    stats.offerEndsAt = Date.now() + 10 * 60e3;
    saveStats();
  }
  let api;
  let timer = 0;
  const box = h('div', { class: 'pm pm-offer' });
  const host = { el: box, api: () => api };
  const clock = h('div', { class: 'clock', 'aria-live': 'off' });
  const tick = () => {
    const left = Math.max(0, stats.offerEndsAt - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    clock.replaceChildren(
      ...[String(m).padStart(2, '0'), ':', String(s).padStart(2, '0')].map((x) => h('span', { class: x === ':' ? 'colon' : 'dig', text: x })),
    );
  };
  tick();
  timer = setInterval(tick, 1000);
  const half = P.raw.year / 2;
  const halfFmt = P.fmt(P.cur === 'RUB' || P.cur === 'UAH' ? Math.round(half) : Math.floor(half * 100) / 100);
  const coupon = button({ class: 'coupon' }, [h('code', { text: 'PIKKO-50' }), h('small', { text: t('of.applied') })], () => toast(t('of.applied')));
  box.append(
    h(
      'div',
      { class: 'ticket' },
      closeX(() => api),
      kicker(t('of.badge')),
      h('div', { class: 'of-big', text: '−50%' }),
      h('h2', { class: 'pm-title', text: t(`of.t${v}`) }),
      h('p', { class: 'pm-sub', text: t(`of.s${v}`) }),
      clock,
      coupon,
      h('div', { class: 'of-price' }, h('s', { text: P.fmt(P.raw.year) }), h('b', { text: halfFmt }), h('small', { text: t('of.per') })),
      cta(t('cta.offer'), (b) => {
        clearInterval(timer);
        purchase(b, { plan: 'year-offer', days: 365, host });
      }),
      button({ class: 'ghost small' }, t('cta.noThanks'), () => api.close()),
      h('p', { class: 'fine', text: t('demo.note') }),
    ),
  );
  api = modal({
    cls: 'pm-center offer-modal',
    content: box,
    label: t(`of.t${v}`),
    onClose: () => {
      clearInterval(timer);
      closed();
    },
  });
  sfx.sparkle();
  haptic('light');
  return api;
}

// ---------- 4. locked feature sheet ----------
function unlock(opts) {
  const feature = opts.feature || 'mode:elim';
  const [kind, id] = feature.split(':');
  const name = kind === 'mode' ? t(`mode.${id}`) : kind === 'markers' ? t('mk.name') : t(`pal.${id}`);
  const desc = kind === 'mode' ? t(`mode.${id}.d`) : kind === 'markers' ? t('ul.mk.d') : t('ul.pal.d');
  const art = kind === 'mode' ? MODE_ICONS[id] : kind === 'markers' ? MODE_ICONS.markers : MODE_ICONS.one;
  let api;
  const box = h('div', { class: 'pm pm-unlock' });
  const host = { el: box, api: () => api };
  box.append(
    h('div', { class: `ul-art ul-${id || kind}` }, h('div', { class: 'ul-icon', html: art }), h('span', { class: 'ul-lock' }, icon('lock'))),
    kicker(`${feature} · locked`),
    h('h2', { class: 'pm-title', text: t('ul.title', name) }),
    h('p', { class: 'pm-sub', text: desc }),
    h('p', { class: 'ul-more' }, icon('layers', 'ic'), h('span', { text: t('ul.more') })),
    cta(t('cta.try'), (b) => purchase(b, { plan: 'trial', days: 3, host, after: () => opts.onUnlocked && opts.onUnlocked() })),
    button({ class: 'ghost' }, t('cta.all'), () => {
      api.close();
      setTimeout(() => show('paywall', { force: true }), 260);
    }),
    h('p', { class: 'fine', text: t('demo.note') }),
  );
  api = sheet({ title: '', content: box, cls: 'unlock-sheet', onClose: closed });
  sfx.sparkle();
  return api;
}

// ---------- 5. "don't go" win-back: a code snippet that grants a week ----------
function winback(opts) {
  const v = variant('winback', 2, opts);
  let api;
  const box = h('div', { class: 'pm pm-winback' });
  const host = { el: box, api: () => api };
  const code = `<span class="k">if</span> (user.<span class="f">isLeaving</span>()) {
  <span class="f">grant</span>(<span class="s">'premium'</span>, { days: <span class="n">7</span> });
  <span class="c">// ${esc(t('wb.comment'))}</span>
}`;
  box.append(
    h('div', { class: 'wb-glow', 'aria-hidden': 'true' }),
    kicker('exit_intent'),
    h('h2', { class: 'pm-title', text: t(`wb.t${v}`) }),
    h('p', { class: 'pm-sub', text: t(`wb.s${v}`) }),
    h('div', { class: 'code' }, h('div', { class: 'code-bar' }, h('span', { text: 'exit.ts' }), h('span', { class: 'code-tag', text: t('wb.badge') })), h('pre', { html: code })),
    cta(t('cta.week'), (b) => purchase(b, { plan: 'trial', days: 7, host })),
    button({ class: 'ghost' }, t('cta.leave'), () => api.close()),
    h('p', { class: 'fine', text: t('demo.note') }),
  );
  api = modal({ cls: 'pm-full winback-modal', content: [closeX(() => api), box], label: t(`wb.t${v}`), onClose: closed });
  sfx.sparkle();
  haptic('success');
  return api;
}

const BUILDERS = { gift, paywall, offer, unlock, winback };
export const PROMO_KINDS = ['gift', 'paywall', 'offer', 'unlock', 'winback'];
