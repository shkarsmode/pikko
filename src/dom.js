// DOM helpers shared by the HUD, sheets and promo screens.
import { sfx } from './audio.js';
import { HAS_SWITCH } from './haptics.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [prop, val] of Object.entries(v)) {
          if (prop.startsWith('--')) el.style.setProperty(prop, String(val));
          else el.style[prop] = val;
        }
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat(3)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const icon = (name, cls = 'ic') => h('span', { class: cls, html: ICONS[name] || '' });

// Replace an element's content, skipping empty values.
export function fill(el, ...kids) {
  el.replaceChildren(...kids.flat(3).filter((k) => k != null && k !== false));
  return el;
}

// ---------- native-feeling taps ----------
// Like UIKit: a tap counts only if the finger stayed put and nothing scrolled
// under it, and inside scrolling lists the pressed look waits ~90 ms so a
// swipe never flashes or triggers rows.
const g = { id: null, x: 0, y: 0, moved: false, scrolled: false, el: null, timer: 0 };
const unpress = () => {
  clearTimeout(g.timer);
  if (g.el) g.el.classList.remove('pressing');
};
document.addEventListener(
  'pointerdown',
  (e) => {
    unpress();
    g.id = e.pointerId;
    g.x = e.clientX;
    g.y = e.clientY;
    g.moved = false;
    g.scrolled = false;
    g.el = e.target.closest ? e.target.closest('[data-press]') : null;
    if (!g.el || g.el.disabled) return;
    const el = g.el;
    const delay = el.closest('.sheet-body, .pm-scroll') ? 90 : 0;
    g.timer = setTimeout(() => !g.moved && !g.scrolled && el.classList.add('pressing'), delay);
  },
  true,
);
document.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerId !== g.id || g.moved) return;
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 10) {
      g.moved = true;
      unpress();
    }
  },
  true,
);
document.addEventListener(
  'scroll',
  () => {
    if (g.id === null) return;
    g.scrolled = true;
    unpress();
  },
  true,
);
const release = (e) => {
  if (e.pointerId !== g.id) return;
  g.id = null;
  if (e.type === 'pointercancel') g.moved = true;
  const el = g.el;
  clearTimeout(g.timer);
  if (el && !g.moved && !g.scrolled && e.type === 'pointerup') {
    el.classList.add('pressing');
    setTimeout(() => el.classList.remove('pressing'), 130);
  } else unpress();
};
document.addEventListener('pointerup', release, true);
document.addEventListener('pointercancel', release, true);

// keyboard clicks (detail 0) always count
export const cleanTap = (e) => !e || e.detail === 0 || (!g.moved && !g.scrolled);

export function button(attrs, kids, fn) {
  const el = h('button', Object.assign({ type: 'button', 'data-press': '' }, attrs), kids);
  if (fn)
    el.addEventListener('click', (e) => {
      if (!cleanTap(e) || el.disabled) return;
      sfx.ui();
      fn(e);
    });
  return el;
}

// ---------- layers (sheets, modals) ----------
const stack = [];
export const overlayOpen = () => stack.length > 0;
let layersEl = null;
const layers = () => layersEl || (layersEl = document.getElementById('layers'));

function mount(root, api) {
  layers().append(root);
  stack.push(api);
  document.body.classList.add('has-layer');
  // two frames so the start state is committed before the transition
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
}

function unmount(root, api, delay) {
  const i = stack.indexOf(api);
  if (i >= 0) stack.splice(i, 1);
  root.classList.remove('open');
  root.classList.add('closing');
  setTimeout(() => root.remove(), delay);
  if (!stack.length) document.body.classList.remove('has-layer');
}

export function closeAll() {
  [...stack].reverse().forEach((a) => a.close());
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close();
});

export function sheet({ title = '', content, cls = '', tall = false, onClose }) {
  const root = h('div', { class: `layer sheet-root ${cls}` });
  const back = h('div', { class: 'layer-back' });
  const panel = h('div', { class: `sheet${tall ? ' tall' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  const grab = h('div', { class: 'grab' }, h('i'));
  const closeBtn = button({ class: 'icon-btn sheet-x', 'aria-label': t('a11y.close') }, icon('close'), () => api.close());
  const head = h('div', { class: 'sheet-head' }, h('h2', { text: title }), closeBtn);
  const body = h('div', { class: 'sheet-body' }, content);
  panel.append(grab, head, body);
  root.append(back, panel);
  let closed = false;
  const api = {
    root,
    body,
    close() {
      if (closed) return;
      closed = true;
      unmount(root, api, 380);
      onClose && onClose();
    },
  };
  back.addEventListener('click', () => api.close());
  dragHandles(panel, [grab, head], () => api.close());
  pullDown(panel, body, () => api.close());
  mount(root, api);
  return api;
}

const shouldClose = (dy, ms) => dy > 120 || (dy > 36 && dy / Math.max(1, ms) > 0.55);

// drag the grabber or the title bar down to dismiss
function dragHandles(panel, handles, close) {
  let y0 = 0;
  let dy = 0;
  let t0 = 0;
  let id = null;
  const move = (e) => {
    if (e.pointerId !== id) return;
    dy = Math.max(0, e.clientY - y0);
    panel.style.transform = `translateY(${dy}px)`;
  };
  const up = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    panel.classList.remove('dragging');
    panel.style.transform = '';
    if (shouldClose(dy, performance.now() - t0)) close();
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
  handles.forEach((hd) =>
    hd.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      id = e.pointerId;
      y0 = e.clientY;
      dy = 0;
      t0 = performance.now();
      panel.classList.add('dragging');
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }),
  );
}

// iOS sheet behavior: when the content is scrolled to the top, pulling down
// moves the whole sheet instead of bouncing the list.
function pullDown(panel, body, close) {
  let y0 = 0;
  let dy = 0;
  let t0 = 0;
  let armed = false;
  let active = false;
  body.addEventListener(
    'touchstart',
    (e) => {
      armed = e.touches.length === 1 && body.scrollTop <= 0;
      active = false;
      dy = 0;
      y0 = e.touches[0].clientY;
      t0 = performance.now();
    },
    { passive: true },
  );
  body.addEventListener(
    'touchmove',
    (e) => {
      if (!armed) return;
      const d = e.touches[0].clientY - y0;
      if (!active) {
        if (d < -3 || body.scrollTop > 0) {
          armed = false;
          return;
        }
        if (d < 8) return;
        active = true;
        y0 += 8;
        panel.classList.add('dragging');
      }
      e.preventDefault();
      dy = Math.max(0, e.touches[0].clientY - y0);
      panel.style.transform = `translateY(${dy}px)`;
    },
    { passive: false },
  );
  const end = () => {
    armed = false;
    if (!active) return;
    active = false;
    panel.classList.remove('dragging');
    panel.style.transform = '';
    if (shouldClose(dy, performance.now() - t0)) close();
  };
  body.addEventListener('touchend', end);
  body.addEventListener('touchcancel', end);
}

// Centered or full-screen promo container.
export function modal({ cls = '', content, label = '', onClose, backdropClose = false }) {
  const root = h('div', { class: `layer modal-root ${cls}` });
  const back = h('div', { class: 'layer-back' });
  const panel = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, content);
  root.append(back, panel);
  let closed = false;
  const api = {
    root,
    panel,
    close() {
      if (closed) return;
      closed = true;
      unmount(root, api, 420);
      onClose && onClose();
    },
  };
  if (backdropClose) back.addEventListener('click', () => api.close());
  mount(root, api);
  return api;
}

// ---------- toast ----------
let toastEl = null;
let toastTimer = 0;
export function toast(text, ms = 2600) {
  if (!toastEl) {
    toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastEl);
  }
  toastEl.textContent = text;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

// ---------- controls ----------
export function segmented(options, value, onPick) {
  const wrap = h('div', { class: 'seg', role: 'radiogroup', style: { '--n': options.length } });
  const thumb = h('i', { class: 'seg-thumb' });
  wrap.append(thumb);
  const btns = options.map((o) => {
    const b = button(
      { class: 'seg-opt', role: 'radio', 'aria-checked': String(o.value === value), 'data-v': String(o.value) },
      [h('span', { text: o.label }), o.locked ? icon('lock', 'ic lock') : null],
      () => {
        if (onPick(o.value, o) === false) return;
        set(o.value);
      },
    );
    wrap.append(b);
    return b;
  });
  const set = (v) => {
    const i = Math.max(0, options.findIndex((o) => o.value === v));
    wrap.style.setProperty('--i', i);
    btns.forEach((b, j) => b.setAttribute('aria-checked', String(j === i)));
  };
  set(value);
  wrap.set = set;
  return wrap;
}

// Real switch: on iOS 18+ a tap on it plays the system haptic tick.
export function switchEl(checked, onChange, label) {
  const input = h('input', { type: 'checkbox', class: HAS_SWITCH ? 'sw' : 'sw sw-custom', 'aria-label': label || '' });
  if (HAS_SWITCH) input.setAttribute('switch', '');
  input.checked = !!checked;
  input.addEventListener('change', () => {
    sfx.ui();
    if (onChange(input.checked) === false) input.checked = !input.checked;
  });
  return input;
}
