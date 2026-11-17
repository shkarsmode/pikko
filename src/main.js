import './styles.css';
import { overlayOpen, toast } from './dom.js';
import { Engine, MODES } from './engine.js';
import { lang, setLang, t } from './i18n.js';
import { attachInput } from './input.js';
import { checkTrialEnd, onBoot, onResume, onRoundDone, premium, setGate } from './promo.js';
import { saveSettings, settings, stats } from './store.js';
import { big, buildHud, caption, isStandalone, onEngineState, refreshBanner, renderTexts, setupPremiumSync, status, syncEngine, ui } from './ui.js';

/* global __VERSION__ */
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'dev';
ui.version = VERSION;

setLang(settings.lang);
document.body.classList.toggle('standalone', isStandalone());

// localized manifest (name, shortcuts) for browsers that read it at install time
function syncManifest() {
  const link = document.querySelector('link[rel="manifest"]');
  if (link) link.href = lang() === 'en' ? '/manifest.webmanifest' : `/manifest-${lang()}.webmanifest`;
}
syncManifest();

const params = new URLSearchParams(location.search);
const wanted = params.get('mode');
if (wanted && MODES[wanted]) {
  settings.mode = wanted;
  saveSettings();
}

const engine = new Engine(document.getElementById('stage'), {
  state: onEngineState,
  caption,
  big,
  toast,
  roundDone: onRoundDone,
  status,
});
ui.engine = engine;

buildHud();
setupPremiumSync();
syncEngine();
renderTexts();
attachInput(engine);
setGate(() => engine.snapshot().phase === 'idle' && !overlayOpen());
onBoot(params);
if (location.search) history.replaceState(null, '', location.pathname);

document.addEventListener('pikko:lang', () => {
  syncManifest();
  buildHud();
});

// layout
let rz = 0;
const onResize = () => {
  cancelAnimationFrame(rz);
  rz = requestAnimationFrame(() => engine.resize());
};
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

// keep the screen awake while the app is open (iOS 18.4+ in home-screen apps)
let wake = null;
async function requestWake() {
  if (!('wakeLock' in navigator) || wake || document.visibilityState !== 'visible') return;
  try {
    wake = await navigator.wakeLock.request('screen');
    wake.addEventListener('release', () => (wake = null));
  } catch {
    wake = null;
  }
}
document.addEventListener('touchend', requestWake, { passive: true });
document.addEventListener('click', requestWake);

// background / foreground
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    engine.abort();
    return;
  }
  const away = hiddenAt ? Date.now() - hiddenAt : 0;
  hiddenAt = 0;
  checkTrialEnd();
  syncEngine();
  renderTexts();
  requestWake();
  onResume(away);
});

// Android / desktop install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  ui.installPrompt = e;
  refreshBanner();
});
window.addEventListener('appinstalled', () => {
  ui.installPrompt = null;
  refreshBanner();
});

// offline: service worker
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    const first = !navigator.serviceWorker.controller;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        const watch = (w) =>
          w &&
          w.addEventListener('statechange', () => {
            if (w.state === 'activated' && first) setTimeout(() => !overlayOpen() && toast(t('toast.offline')), 1600);
          });
        watch(reg.installing);
        reg.addEventListener('updatefound', () => watch(reg.installing));
        setInterval(() => reg.update().catch(() => {}), 30 * 60e3);
      })
      .catch(() => {});
  });
}

// handle for tests and debugging
window.__pikko = {
  engine,
  ui,
  settings,
  stats,
  premium,
  version: VERSION,
  sync() {
    saveSettings();
    syncEngine();
    renderTexts();
  },
};
