// Haptics, as far as the web allows.
//  - Android / Chrome: Vibration API.
//  - iOS has no Vibration API. Safari 18+ plays a system tick when an
//    <input type=checkbox switch> toggles. Programmatic toggles worked on
//    iOS 17.4-26.4; iOS 26.5 limits it to a real tap on a switch. So we do
//    both: a hidden switch we click from code (old iOS), and invisible
//    switches laid over the main buttons (any iOS 18+: the user's own tap
//    lands on a real switch).
import { settings } from './store.js';

const ua = navigator.userAgent;
export const IS_IOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const CAN_VIBRATE = typeof navigator.vibrate === 'function';
const SWITCH = (() => {
  try {
    const i = document.createElement('input');
    i.type = 'checkbox';
    return 'switch' in i;
  } catch {
    return false;
  }
})();
export const HAS_SWITCH = SWITCH;
export const HAPTIC_KIND = CAN_VIBRATE ? 'android' : IS_IOS ? 'ios' : 'none';

let label = null;
function hiddenSwitch() {
  if (label) return label;
  label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  label.addEventListener('click', (e) => e.stopPropagation());
  document.body.appendChild(label);
  return label;
}

const PATTERNS = {
  tap: [8],
  light: [12],
  medium: [22],
  heavy: [40],
  success: [30, 60, 45],
  warn: [60, 40, 60],
  tick: [6],
};
const IOS_TICKS = { tap: 1, light: 1, tick: 1, medium: 1, heavy: 2, success: 3, warn: 2 };

export function haptic(kind = 'light') {
  if (!settings.haptics) return;
  if (CAN_VIBRATE) {
    try {
      navigator.vibrate(PATTERNS[kind] || PATTERNS.light);
    } catch {
      /* ignore */
    }
    return;
  }
  if (IS_IOS && SWITCH) {
    const n = IOS_TICKS[kind] || 1;
    const el = hiddenSwitch();
    for (let i = 0; i < n; i++) {
      if (i === 0) el.click();
      else setTimeout(() => el.click(), i * 70);
    }
  }
}

// Bind a tap handler. On iOS an invisible native switch covers the control,
// so the finger lands on a real switch and Safari plays its own tick.
export function onTap(el, fn) {
  el.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('hx')) return;
    fn(e);
  });
  if (IS_IOS && SWITCH) {
    // visible only while haptics are on (body.hx-on), see styles.css
    const ov = document.createElement('input');
    ov.type = 'checkbox';
    ov.setAttribute('switch', '');
    ov.className = 'hx';
    ov.tabIndex = -1;
    ov.setAttribute('aria-hidden', 'true');
    ov.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      fn(e);
    });
    el.appendChild(ov);
  }
  return el;
}
