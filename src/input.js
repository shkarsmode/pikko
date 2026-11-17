// Touch input. Listeners sit on the document (capture, non-passive) so we can
// cancel every default: no scroll, bounce, zoom, selection or callout.
// A single finger on a HUD control while nothing is happening stays a normal tap.
import { unlock } from './audio.js';
import { overlayOpen } from './dom.js';
import { ui } from './ui.js';

const isUi = (el) => !!(el && el.closest && el.closest('[data-ui]'));

export function attachInput(engine) {
  const opt = { passive: false, capture: true };

  const uiTapAllowed = () => {
    const s = ui.state;
    if (engine.input === 'marker') return !(s.phase === 'reveal' || s.armed);
    return s.phase === 'idle' || (s.phase === 'result' && s.down === 0);
  };

  document.addEventListener(
    'touchstart',
    (e) => {
      unlock();
      if (overlayOpen()) return;
      if (e.touches.length > ui.maxTouches) ui.maxTouches = e.touches.length;
      const changed = [...e.changedTouches];
      if (e.touches.length === changed.length && changed.every((tc) => isUi(tc.target)) && uiTapAllowed()) return;
      e.preventDefault();
      if (engine.input === 'marker') {
        for (const tc of changed) if (!isUi(tc.target)) engine.markerTap(tc.clientX, tc.clientY);
        return;
      }
      for (const tc of e.touches) engine.touchDown(tc.identifier, tc.clientX, tc.clientY);
    },
    opt,
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (overlayOpen()) return;
      e.preventDefault();
      for (const tc of e.changedTouches) engine.touchMove(tc.identifier, tc.clientX, tc.clientY);
    },
    opt,
  );

  document.addEventListener(
    'touchend',
    (e) => {
      unlock();
      for (const tc of e.changedTouches) engine.touchUp(tc.identifier);
    },
    opt,
  );

  document.addEventListener(
    'touchcancel',
    (e) => {
      const had = engine.fingersDown();
      engine.touchCancel(
        [...e.changedTouches].map((tc) => tc.identifier),
        had,
      );
    },
    opt,
  );

  // Safari pinch / double-tap zoom and long-press menus
  for (const n of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(n, (e) => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

  // Mouse / pen for desktop. Shift- or Alt-click pins a virtual finger so
  // several "fingers" can be held with one mouse; Esc lifts them.
  const stage = document.getElementById('stage');
  const pins = [];
  let seq = 0;
  let mouse = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    unlock();
    if (overlayOpen()) return;
    if (engine.input === 'marker') {
      engine.markerTap(e.clientX, e.clientY);
      return;
    }
    if (e.shiftKey || e.altKey) {
      const id = `pin${seq++}`;
      pins.push(id);
      engine.touchDown(id, e.clientX, e.clientY);
      return;
    }
    if (pins.length && ui.state.phase === 'result') liftPins();
    mouse = `mouse${seq++}`;
    engine.touchDown(mouse, e.clientX, e.clientY);
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (mouse && e.pointerType !== 'touch') engine.touchMove(mouse, e.clientX, e.clientY);
  });
  const up = (e) => {
    if (e.pointerType === 'touch' || !mouse) return;
    engine.touchUp(mouse);
    mouse = null;
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  const liftPins = () => {
    while (pins.length) engine.touchUp(pins.pop());
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlayOpen()) liftPins();
  });
}
