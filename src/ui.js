// HUD, mode picker, settings and install help.
import { audioRunning, onAudioState, sfx } from './audio.js';
import { button, fill, h, icon, overlayOpen, segmented, sheet, switchEl, toast } from './dom.js';
import { MAX_MARKERS, MODE_ORDER, MODES, PALETTES } from './engine.js';
import { HAPTIC_KIND, IS_IOS } from './haptics.js';
import { fmtDate, setLang, t } from './i18n.js';
import { ICONS, MODE_ICONS } from './icons.js';
import { isLocked, isPro, onPremium, premium, PROMO_KINDS, show, flush } from './promo.js';
import { dropAll, saveSettings, settings } from './store.js';

export const ui = {
  engine: null,
  state: { phase: 'idle', live: 0, min: 2, input: 'hold', down: 0 },
  maxTouches: 0,
  installPrompt: null,
  version: '',
};

const $ = (id) => document.getElementById(id);
const MODE_COLORS = { one: '#ff5c7a', teams: '#38bdf8', order: '#ffb020', n: '#2ee59d', elim: '#f15bb5', reaction: '#ffe14d' };
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

let els = {};

export function buildHud() {
  const hud = $('hud');
  hud.replaceChildren();
  els = {};
  els.settingsBtn = button({ class: 'icon-btn glass', 'data-ui': '', 'aria-label': t('a11y.settings') }, icon('gear'), openSettings);
  els.modeChip = button({ class: 'mode-chip glass', 'data-ui': '', 'aria-label': t('a11y.mode') }, [], openModes);
  els.proBtn = button({ class: 'pro-btn', 'data-ui': '', 'aria-label': t('a11y.premium') }, [], () => {
    if (ui.state.phase !== 'idle' && ui.state.input === 'hold') return;
    if (premium.active()) openSettings();
    else show('paywall', { force: true });
  });
  els.top = h('div', { class: 'top' }, els.settingsBtn, els.modeChip, els.proBtn);

  els.sound = h('div', { class: 'sound-hint glass' }, icon('speaker'), h('span', { text: t('sound.tap') }));
  // soft drifting light behind the idle screen
  els.ambient = h(
    'div',
    { class: 'ambient', 'aria-hidden': 'true' },
    [
      ['#9b7bff', '18%', '22%', '62vmin', '13s'],
      ['#ff4d6d', '84%', '34%', '56vmin', '11s'],
      ['#38bdf8', '22%', '78%', '58vmin', '15s'],
      ['#2ee59d', '80%', '86%', '44vmin', '12s'],
    ].map(([c, x, y, s, d]) => h('i', { style: { '--c': c, '--x': x, '--y': y, '--s': s, '--d': d } })),
  );
  // "players" orbiting the hint orb, like on the app icon
  const orbit = h(
    'span',
    { class: 'hint-orbit' },
    [
      ['#2ee59d', 0],
      ['#38bdf8', 120],
      ['#ffb020', 240],
    ].map(([c, a]) => h('i', { style: { '--c': c, '--a': `${a}deg` } })),
  );
  els.hint = h(
    'div',
    { class: 'hint', 'aria-live': 'polite' },
    h('div', { class: 'hint-art', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), orbit, h('b')),
    (els.hintTitle = h('div', { class: 'hint-title' })),
    (els.hintSub = h('div', { class: 'hint-sub' })),
    h('div', { class: 'hint-mouse', text: t('hint.mouse') }),
    els.sound,
  );
  syncSoundHint();
  els.wait = h('div', { class: 'wait glass' });
  els.caption = h('div', { class: 'caption glass', 'aria-live': 'polite' });
  els.big = h('div', { class: 'big', 'aria-live': 'assertive' }, (els.bigText = h('b')), (els.bigSub = h('span')));

  els.mkClear = button({ class: 'mk-btn glass', 'data-ui': '' }, [], () => ui.engine.markerClear());
  els.mkGo = button({ class: 'mk-btn primary', 'data-ui': '' }, [], () => {
    const s = ui.state;
    if (s.phase === 'result') ui.engine.markerAgain();
    else ui.engine.markerGo();
  });
  els.mkbar = h('div', { class: 'mkbar' }, els.mkClear, els.mkGo);

  els.banner = h('div', { class: 'banner glass', 'data-ui': '' });
  hud.append(els.ambient, els.top, els.hint, els.wait, els.caption, els.big, els.mkbar, els.banner);
  renderTexts();
  renderBanner();
  onEngineState(ui.state);
}

export function syncSoundHint() {
  if (els.sound) els.sound.classList.toggle('show', !!settings.sound && !audioRunning());
}
onAudioState(syncSoundHint);

export function renderTexts() {
  const m = settings.mode;
  const suffix = m === 'n' ? ` · ${settings.pickN}` : m === 'teams' ? ` · ${settings.teams}` : '';
  fill(els.modeChip,
    h('span', { class: 'chip-ic', html: MODE_ICONS[m], style: { color: MODE_COLORS[m] } }),
    h('span', { class: 'chip-name', text: t(`mode.${m}`) + suffix }),
    settings.markers ? h('span', { class: 'chip-mk', html: MODE_ICONS.markers, title: t('mk.name') }) : null,
    icon('chevron', 'ic chev'),
  );
  if (premium.active()) {
    els.proBtn.className = 'pro-btn is-on glass';
    fill(els.proBtn, icon("crown"));
  } else {
    els.proBtn.className = 'pro-btn';
    fill(els.proBtn, h('span', { text: 'PRO' }));
  }
  const min = MODES[m].min(settings);
  if (settings.markers) {
    els.hintTitle.textContent = t('hint.mk.title');
    els.hintSub.textContent = `${t('hint.mk.sub')} · ${t('hint.min', min)}`;
  } else {
    els.hintTitle.textContent = t('hint.title');
    const sub = m === 'n' ? t('hint.n', settings.pickN) : m === 'teams' ? t('hint.teams', settings.teams) : t(`hint.${m}`);
    els.hintSub.textContent = `${sub} · ${t('hint.min', min)}`;
  }
  els.wait.textContent = t('cap.wait');
  els.settingsBtn.setAttribute('aria-label', t('a11y.settings'));
  renderMkbar();
}

function renderMkbar() {
  const s = ui.state;
  const result = s.phase === 'result';
  fill(els.mkClear, h('span', { text: result ? t('mk.new') : t('mk.clear') }));
  fill(els.mkGo, h('span', { text: result ? t('mk.again') : t('mk.go') }), !result ? h('small', { text: `${s.live}` }) : null);
  els.mkGo.disabled = !result && (s.live < s.min || s.armed || s.phase !== 'gather');
}

export function onEngineState(s) {
  const prev = ui.state;
  ui.state = s;
  const b = document.body;
  const markers = s.input === 'marker';
  const playing = markers ? s.phase === 'reveal' || s.armed : s.phase !== 'idle';
  b.classList.toggle('playing', playing);
  b.classList.toggle('markers', markers);
  b.classList.toggle('has-orbs', s.phase !== 'idle');
  b.classList.toggle('show-mkbar', markers && s.live > 0);
  els.wait.classList.toggle('show', !!s.waiting);
  if (markers) renderMkbar();
  if (s.phase === 'idle' && prev.phase !== 'idle') flush();
}

export function caption(cap) {
  const el = els.caption;
  if (!cap || (!cap.text && !cap.chips)) {
    el.classList.remove('show');
    return;
  }
  const kids = [];
  if (cap.text) kids.push(h('span', { class: 'cap-text', text: cap.text }));
  if (cap.chips) cap.chips.forEach((c) => kids.push(h('span', { class: 'cap-chip' }, h('i', { style: { background: c.color, color: c.color } }), c.text)));
  el.replaceChildren(...kids);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

export function big(b) {
  const el = els.big;
  if (!b) {
    el.className = 'big';
    return;
  }
  const bt = els.bigText;
  bt.textContent = b.text || '';
  els.bigSub.textContent = b.sub || '';
  el.className = `big show ${b.kind || ''}`;
  // shrink long words (e.g. Ukrainian "ВІДПУСКАЙ!") to fit the screen
  bt.style.fontSize = '';
  // the pop animation overshoots ~18%, so "go" leaves room for it
  const room = el.clientWidth * (b.kind === 'go' ? 0.82 : 0.96);
  const wide = bt.offsetWidth;
  if (wide > room) bt.style.fontSize = `${(parseFloat(getComputedStyle(bt).fontSize) * room) / wide}px`;
  if (b.shake) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }
}

// ---------- install banner ----------
function renderBanner() {
  const el = els.banner;
  let hidden = true;
  try {
    const until = +localStorage.getItem('pikko.bannerUntil') || 0;
    hidden = isStandalone() || Date.now() < until || !(IS_IOS || ui.installPrompt);
  } catch {
    hidden = isStandalone() || !(IS_IOS || ui.installPrompt);
  }
  el.classList.toggle('show', !hidden);
  if (hidden) return;
  el.replaceChildren(
    h('img', { src: '/icons/icon-192.png', alt: '', width: 40, height: 40 }),
    h('div', { class: 'banner-text' }, h('b', { text: t('inst.banner') }), h('span', { text: t('inst.banner.s') })),
    button({ class: 'banner-go', 'data-ui': '' }, ui.installPrompt ? t('inst.install') : t('inst.how'), openInstall),
    button({ class: 'icon-btn banner-x', 'data-ui': '', 'aria-label': t('a11y.close') }, icon('close'), () => {
      try {
        localStorage.setItem('pikko.bannerUntil', String(Date.now() + 3 * 864e5));
      } catch {
        /* ignore */
      }
      el.classList.remove('show');
    }),
  );
}
export const refreshBanner = () => els.banner && renderBanner();

export function openInstall() {
  if (ui.installPrompt) {
    const p = ui.installPrompt;
    ui.installPrompt = null;
    p.prompt();
    p.userChoice.finally(() => renderBanner());
    return;
  }
  const steps = [
    ['share', t('inst.s1')],
    ['plusBox', t('inst.s2')],
    ['phone', t('inst.s3')],
  ];
  sheet({
    title: t('inst.title'),
    cls: 'install-sheet',
    content: h(
      'ol',
      { class: 'steps' },
      steps.map(([ic, text], i) => h('li', null, h('span', { class: 'step-n', text: String(i + 1) }), icon(ic, 'ic step-ic'), h('span', { text }))),
    ),
  });
}

// ---------- mode sheet ----------
let modeSheet = null;
function openModes() {
  if (ui.state.phase !== 'idle' && ui.state.input === 'hold') return;
  const body = h('div', { class: 'modes' });
  const draw = () => {
    fill(body,
      h(
        'div',
        { class: 'mode-grid' },
        MODE_ORDER.map((id) => {
          const locked = isLocked(`mode:${id}`);
          const card = button(
            { class: `mode-card${settings.mode === id ? ' on' : ''}${locked ? ' locked' : ''}`, 'data-m': id, 'aria-pressed': String(settings.mode === id) },
            [
              h('span', { class: 'mc-ic', html: MODE_ICONS[id] }),
              h('b', { text: t(`mode.${id}`) }),
              h('small', { text: t(`mode.${id}.d`) }),
              isPro(`mode:${id}`) ? h('span', { class: `pro-badge${locked ? '' : ' owned'}`, text: 'PRO' }) : null,
            ],
            () => pickMode(id, draw),
          );
          return card;
        }),
      ),
      optionsFor(settings.mode, draw),
      markersRow(draw),
    );
  };
  draw();
  modeSheet = sheet({ title: t('sheet.mode'), content: body, cls: 'mode-sheet', onClose: () => (modeSheet = null) });
}

function pickMode(id, redraw) {
  if (isLocked(`mode:${id}`)) {
    show('unlock', { force: true, feature: `mode:${id}`, onUnlocked: () => applyMode(id, redraw) });
    return;
  }
  applyMode(id, redraw);
}

function applyMode(id, redraw) {
  settings.mode = id;
  if (id === 'reaction' && settings.markers) {
    settings.markers = false;
    toast(t('toast.noReaction'));
  }
  saveSettings();
  syncEngine();
  renderTexts();
  redraw && redraw();
}

function optionsFor(id, redraw) {
  if (id === 'n') {
    return h(
      'div',
      { class: 'opt' },
      h('span', { class: 'opt-title', text: t('opt.n') }),
      segmented([2, 3, 4].map((v) => ({ value: v, label: String(v) })), settings.pickN, (v) => {
        settings.pickN = v;
        saveSettings();
        syncEngine();
        renderTexts();
      }),
    );
  }
  if (id === 'teams') {
    return h(
      'div',
      { class: 'opt' },
      h('span', { class: 'opt-title', text: t('opt.teams') }),
      segmented([2, 3, 4].map((v) => ({ value: v, label: String(v) })), settings.teams, (v) => {
        settings.teams = v;
        saveSettings();
        syncEngine();
        renderTexts();
      }),
    );
  }
  void redraw;
  return null;
}

function markersRow(redraw) {
  const locked = isLocked('markers');
  const disabled = settings.mode === 'reaction';
  const sw = switchEl(
    settings.markers,
    (on) => {
      if (on && locked) {
        show('unlock', {
          force: true,
          feature: 'markers',
          onUnlocked: () => {
            settings.markers = true;
            saveSettings();
            syncEngine();
            renderTexts();
            redraw();
          },
        });
        return false;
      }
      if (on && disabled) {
        toast(t('toast.noReaction'));
        return false;
      }
      settings.markers = on;
      saveSettings();
      syncEngine();
      renderTexts();
      return true;
    },
    t('mk.name'),
  );
  return h(
    'label',
    { class: `row mk-row${disabled ? ' dim' : ''}` },
    h('span', { class: 'row-ic', html: MODE_ICONS.markers }),
    h('span', { class: 'row-text' }, h('b', null, t('mk.name'), isPro('markers') ? h('span', { class: `pro-badge${locked ? '' : ' owned'}`, text: 'PRO' }) : null), h('small', { text: t('mk.d') })),
    sw,
  );
}

export function syncEngine() {
  const e = ui.engine;
  if (!e) return;
  let mode = settings.mode;
  if (isLocked(`mode:${mode}`)) mode = settings.mode = 'one';
  if (settings.markers && (isLocked('markers') || mode === 'reaction')) settings.markers = false;
  if (isLocked(`palette:${settings.palette}`)) settings.palette = 'neon';
  e.setMode(mode, { pickN: settings.pickN, teams: settings.teams });
  e.setInput(settings.markers ? 'marker' : 'hold');
}

// ---------- settings ----------
function row({ ic, title, note, control, cls = '', onClick }) {
  const kids = [
    ic ? h('span', { class: 'row-ic', html: ICONS[ic] || ic }) : null,
    h('span', { class: 'row-text' }, h('b', { text: title }), note ? h('small', { text: note }) : null),
    control || null,
  ];
  if (onClick) return button({ class: `row tap ${cls}` }, [...kids, icon('chevron', 'ic row-chev')], onClick);
  return h(control && control.tagName === 'INPUT' ? 'label' : 'div', { class: `row ${cls}` }, kids);
}

function section(title, rows) {
  return h('section', { class: 'group' }, h('h3', { text: title }), h('div', { class: 'group-box' }, rows));
}

let settingsSheet = null;
export function openSettings() {
  if (ui.state.phase !== 'idle' && ui.state.input === 'hold') return;
  const body = h('div', { class: 'settings' });
  const draw = () => {
    const hapNote = t(`hap.${HAPTIC_KIND}`);
    const p = premium.get();
    let premNote = t('prem.off');
    if (premium.active()) premNote = p.until ? (p.plan === 'trial' ? t('prem.until', fmtDate(p.until)) : t('prem.paid', `${p.plan} · ${fmtDate(p.until)}`)) : t('prem.forever');
    fill(body,
      section(t('set.game'), [
        h(
          'div',
          { class: 'row col' },
          h('span', { class: 'row-text' }, h('b', { text: t('set.speed') })),
          segmented(['fast', 'normal', 'slow'].map((v) => ({ value: v, label: t(`speed.${v}`) })), settings.speed, (v) => {
            settings.speed = v;
            saveSettings();
          }),
        ),
        row({
          title: t('set.sound'),
          note: t('set.sound.n'),
          control: switchEl(settings.sound, (on) => {
            settings.sound = on;
            syncSoundHint();
            saveSettings();
            if (on) sfx.ui();
          }, t('set.sound')),
        }),
        row({
          title: t('set.haptics'),
          note: hapNote,
          control: switchEl(settings.haptics, (on) => {
            settings.haptics = on;
            saveSettings();
            document.body.classList.toggle('hx-on', on);
          }, t('set.haptics')),
        }),
        h(
          'div',
          { class: 'row col' },
          h('span', { class: 'row-text' }, h('b', { text: t('set.palette') })),
          segmented(
            ['neon', 'pastel', 'sunset'].map((v) => ({ value: v, label: t(`pal.${v}`), locked: isLocked(`palette:${v}`) })),
            settings.palette,
            (v) => {
              if (isLocked(`palette:${v}`)) {
                show('unlock', {
                  force: true,
                  feature: `palette:${v}`,
                  onUnlocked: () => {
                    settings.palette = v;
                    saveSettings();
                    draw();
                  },
                });
                return false;
              }
              settings.palette = v;
              saveSettings();
              swatchRefresh();
            },
          ),
          paletteSwatches(),
        ),
        h(
          'div',
          { class: 'row col' },
          h('span', { class: 'row-text' }, h('b', { text: t('set.lang') })),
          segmented(
            [
              { value: 'auto', label: t('lang.auto') },
              { value: 'en', label: 'EN' },
              { value: 'ru', label: 'RU' },
              { value: 'uk', label: 'UK' },
            ],
            settings.lang,
            (v) => {
              settings.lang = v;
              saveSettings();
              setLang(v);
              document.dispatchEvent(new Event('pikko:lang'));
              settingsSheet && settingsSheet.close();
              setTimeout(openSettings, 380);
            },
          ),
        ),
      ]),
      section(t('set.premium'), [
        row({ ic: 'crown', title: premium.active() ? t('prem.on') : t('prem.off'), note: premium.active() ? premNote : '', cls: premium.active() ? 'prem-on' : '' }),
        premium.active()
          ? row({ title: t('prem.reset'), cls: 'danger', onClick: () => { premium.reset(); toast(t('toast.reset')); draw(); } })
          : row({ title: t('prem.get'), cls: 'accent', onClick: () => show('paywall', { force: true }) }),
      ]),
      section(t('set.promos'), [
        row({
          title: t('set.autoPromos'),
          control: switchEl(settings.autoPromos, (on) => {
            settings.autoPromos = on;
            saveSettings();
          }, t('set.autoPromos')),
        }),
        ...PROMO_KINDS.map((k) =>
          row({
            title: t(`promo.${k}`),
            note: t(`promo.${k}.w`),
            onClick: () => show(k, { force: true, demo: true, feature: 'mode:elim' }),
          }),
        ),
      ]),
      section(t('set.install'), [
        isStandalone()
          ? row({ ic: 'check', title: t('inst.done'), cls: 'ok' })
          : row({ ic: 'plusBox', title: t('inst.row'), onClick: openInstall }),
      ]),
      section(t('set.about'), [
        row({ title: t('about.touches'), note: t('about.limit'), control: h('span', { class: 'row-val', text: String(ui.maxTouches) }) }),
        row({ title: `Pikko`, note: `${t('about.version')} ${ui.version}` }),
        row({
          title: t('about.resetAll'),
          cls: 'danger',
          onClick: () => {
            dropAll();
            location.replace(location.pathname);
          },
        }),
      ]),
    );
  };
  draw();
  const unsub = onPremium(draw);
  settingsSheet = sheet({
    title: t('set.title'),
    content: body,
    tall: true,
    cls: 'settings-sheet',
    onClose: () => {
      unsub();
      settingsSheet = null;
    },
  });
}

function paletteSwatches() {
  const el = h('div', { class: 'swatches', 'aria-hidden': 'true' });
  const paint = () => el.replaceChildren(...(PALETTES[settings.palette] || PALETTES.neon).colors.slice(0, 10).map((c) => h('i', { style: { background: c } })));
  paint();
  swatchRefresh = paint;
  return el;
}
let swatchRefresh = () => {};

export function setupPremiumSync() {
  onPremium(() => {
    syncEngine();
    renderTexts();
  });
}

export const constants = { MAX_MARKERS };
