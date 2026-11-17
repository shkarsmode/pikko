// End-to-end check in Chrome's iPhone emulation: real multi-touch through
// CDP (Input.dispatchTouchEvent), home-screen (standalone) mode, every game
// mode, every promo screen and their triggers, offline reload, no zoom/scroll.
// Usage: node scripts/test-e2e.mjs [baseUrl] [--shots]
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = (process.argv.find((a) => a.startsWith('http')) || 'http://localhost:5199').replace(/\/$/, '');
const SHOTS = process.argv.includes('--shots');
const OUT = 'test-shots';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });

async function open({ lang = 'ru-RU', url = '/', w = 393, h = 852 } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && page.errors.push(m.text()));
  await page.emulate({ viewport: { width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: UA });
  const cdp = await page.createCDPSession();
  let mediaOk = true;
  try {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'display-mode', value: 'standalone' }] });
  } catch {
    mediaOk = false;
  }
  await page.evaluateOnNewDocument((l) => {
    Object.defineProperty(navigator, 'language', { get: () => l });
    Object.defineProperty(navigator, 'languages', { get: () => [l, l.split('-')[0]] });
    Object.defineProperty(navigator, 'standalone', { get: () => true });
  }, lang);
  await page.goto(BASE + url, { waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: ':root:root{--sat:59px;--sab:34px}' });
  page.cdp = cdp;
  page.ctx = ctx;
  page.mediaOk = mediaOk;
  return page;
}

const snap = async (page, name) => SHOTS && page.screenshot({ path: `${OUT}/${name}.png` });
const state = (page) => page.evaluate(() => window.__pikko.engine.snapshot());
const waitFor = (page, fn, arg, timeout = 8000) => page.waitForFunction(fn, { timeout, polling: 40 }, arg);
const waitPhase = (page, phase, timeout = 9000) => waitFor(page, (p) => window.__pikko.engine.snapshot().phase === p, phase, timeout);
const setMode = (page, patch) =>
  page.evaluate((p) => {
    Object.assign(window.__pikko.settings, p);
    window.__pikko.sync();
  }, patch);

const PTS = [
  [100, 300],
  [292, 282],
  [196, 470],
  [92, 640],
  [300, 652],
];

async function down(page, pts) {
  const hs = [];
  for (const [x, y] of pts) {
    hs.push(await page.touchscreen.touchStart(x, y));
    await sleep(70);
  }
  return hs;
}
async function upAll(hs) {
  for (const hd of hs) await hd.end().catch(() => {});
}
const orbs = (page) =>
  page.evaluate(() => {
    const r = window.__pikko.engine.round;
    return r ? r.orbs.map((o) => ({ role: o.role, label: o.label, team: o.team, exiting: o.exiting, false: o.false, sub: o.sub })) : [];
  });
const captionText = (page) => page.$eval('.caption', (e) => (e.classList.contains('show') ? e.textContent : ''));

try {
  // ---------- 1. first launch ----------
  const p = await open();
  check('standalone emulated', await page_is(p, () => document.body.classList.contains('standalone')), p.mediaOk ? 'display-mode media' : 'navigator.standalone');
  await waitFor(p, () => document.querySelector('.gift-modal.open'), null, 4000).then(
    () => check('first launch shows the gift promo', true),
    () => check('first launch shows the gift promo', false),
  );
  await sleep(700);
  await snap(p, '01-first-launch-gift');
  await p.tap('.gift-modal .ghost');
  await waitFor(p, () => !document.querySelector('.gift-modal'), null, 3000);
  const swOk = await p.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    return !!r.active;
  });
  check('service worker active', swOk);
  await sleep(300);
  await snap(p, '02-idle');
  const meta = await p.evaluate(() => ({
    capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content,
    touchIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
    splash: document.querySelectorAll('link[rel="apple-touch-startup-image"]').length,
    viewport: document.querySelector('meta[name="viewport"]').content,
    manifest: document.querySelector('link[rel="manifest"]').href,
  }));
  check('iOS meta: capable + touch icon + splash', meta.capable === 'yes' && meta.touchIcon && meta.splash >= 20, `${meta.splash} splash links`);
  check('viewport covers notch', meta.viewport.includes('viewport-fit=cover'));
  check('manifest localized', meta.manifest.endsWith('/manifest-ru.webmanifest'), meta.manifest);

  // ---------- 2. pick one, 3 fingers ----------
  let hs = await down(p, PTS.slice(0, 3));
  await sleep(450);
  await snap(p, '03-one-gather');
  check('3 fingers tracked', (await state(p)).live === 3);
  await waitFor(p, () => window.__pikko.engine.round && window.__pikko.engine.round.progress > 0.55);
  await snap(p, '04-one-countdown');
  await waitPhase(p, 'result');
  await sleep(750);
  await snap(p, '05-one-result');
  let o = await orbs(p);
  check('pick one: exactly 1 winner', o.filter((x) => x.role === 'winner').length === 1, JSON.stringify(o.map((x) => x.role)));
  check('pick one: caption shown', (await captionText(p)).length > 0, await captionText(p));
  await upAll(hs);
  await waitPhase(p, 'idle', 5000).then(
    () => check('result clears after fingers lift', true),
    () => check('result clears after fingers lift', false),
  );

  // ---------- 3. mode sheet -> teams ----------
  await sleep(300);
  await p.tap('.mode-chip');
  await waitFor(p, () => document.querySelector('.mode-sheet.open'), null, 3000);
  await sleep(550);
  await snap(p, '06-mode-sheet');
  await p.tap('.mode-card[data-m="teams"]');
  await sleep(450);
  check('mode sheet switches to teams', (await p.evaluate(() => window.__pikko.settings.mode)) === 'teams');
  await snap(p, '07-mode-sheet-teams');
  await p.tap('.mode-sheet .sheet-x');
  await waitFor(p, () => !document.querySelector('.mode-sheet'), null, 3000);
  hs = await down(p, PTS.slice(0, 4));
  await waitPhase(p, 'result');
  await sleep(800);
  await snap(p, '08-teams-result');
  o = await orbs(p);
  const sizes = [0, 1].map((tm) => o.filter((x) => x.team === tm).length);
  check('teams: 4 players split 2 + 2', sizes[0] === 2 && sizes[1] === 2, sizes.join('+'));
  await upAll(hs);
  await waitPhase(p, 'idle', 5000);

  // ---------- 4. order, 5 fingers ----------
  await setMode(p, { mode: 'order' });
  hs = await down(p, PTS);
  await waitPhase(p, 'result', 10000);
  await sleep(500);
  await snap(p, '09-order-result');
  o = await orbs(p);
  const labels = o.map((x) => x.label).sort().join(',');
  check('order: labels 1..5', labels === '1,2,3,4,5', labels);
  await upAll(hs);
  await waitPhase(p, 'idle', 5000);

  // ---------- 5. locked mode -> unlock sheet -> mock purchase ----------
  await p.tap('.mode-chip');
  await waitFor(p, () => document.querySelector('.mode-sheet.open'), null, 3000);
  await sleep(500);
  await p.tap('.mode-card[data-m="elim"]');
  await waitFor(p, () => document.querySelector('.unlock-sheet.open'), null, 3000).then(
    () => check('locked mode opens the unlock sheet', true),
    () => check('locked mode opens the unlock sheet', false),
  );
  await sleep(600);
  await snap(p, '10-unlock-sheet');
  await p.tap('.unlock-sheet .cta');
  await sleep(250);
  await snap(p, '11-purchase-busy');
  await waitFor(p, () => document.querySelector('.unlock-sheet .success'), null, 3000);
  await sleep(900);
  await snap(p, '12-purchase-success');
  check('mock purchase turns premium on', await p.evaluate(() => window.__pikko.premium.active()));
  check('unlocked mode gets selected', (await p.evaluate(() => window.__pikko.settings.mode)) === 'elim');
  await p.tap('.unlock-sheet .success .cta');
  await sleep(400);
  if (await p.$('.mode-sheet')) await p.tap('.mode-sheet .sheet-x');
  await waitFor(p, () => !document.querySelector('.layer'), null, 3000);

  // ---------- 6. knockout, 4 fingers ----------
  hs = await down(p, PTS.slice(0, 4));
  await waitFor(p, () => (window.__pikko.engine.round?.orbs || []).some((x) => x.role === 'out'), null, 9000);
  await sleep(120);
  await snap(p, '13-elim-mid');
  await waitPhase(p, 'result', 15000);
  await sleep(700);
  await snap(p, '14-elim-result');
  o = await orbs(p);
  check('knockout: 1 left standing', o.filter((x) => x.role === 'winner').length === 1, JSON.stringify(o.map((x) => x.role)));
  await upAll(hs);
  await waitPhase(p, 'idle', 5000);

  // ---------- 7. several (2 of 4) ----------
  await setMode(p, { mode: 'n', pickN: 2 });
  hs = await down(p, PTS.slice(0, 4));
  await waitPhase(p, 'result');
  await sleep(700);
  await snap(p, '15-several-result');
  o = await orbs(p);
  check('several: 2 winners of 4', o.filter((x) => x.role === 'winner').length === 2);
  await upAll(hs);
  await waitPhase(p, 'idle', 5000);

  // ---------- 8. reflex ----------
  await setMode(p, { mode: 'reaction' });
  hs = await down(p, PTS.slice(0, 3));
  await waitFor(p, () => window.__pikko.engine.snapshot().sub === 'ready', null, 8000);
  await sleep(450);
  await snap(p, '16-reflex-ready');
  await hs[0].end();
  await sleep(250);
  o = await orbs(p);
  check('reflex: early lift is a false start', o.filter((x) => x.false).length === 1);
  await snap(p, '17-reflex-false-start');
  await waitFor(p, () => window.__pikko.engine.snapshot().sub === 'go', null, 7000);
  await sleep(90);
  await snap(p, '18-reflex-go');
  await hs[1].end();
  await waitPhase(p, 'result', 5000);
  await sleep(700);
  await snap(p, '19-reflex-result');
  const cap = await captionText(p);
  check('reflex: winner with reaction time', /\d+\s?мс/.test(cap), cap);
  await upAll(hs.slice(2));
  await waitPhase(p, 'idle', 5000);

  // ---------- 9. markers (6+ players) ----------
  await setMode(p, { mode: 'one', markers: true });
  await sleep(300);
  await snap(p, '20-markers-idle');
  const MK = [
    [80, 250],
    [200, 210],
    [315, 260],
    [70, 450],
    [320, 470],
    [110, 640],
    [290, 650],
  ];
  for (const [x, y] of MK) {
    await p.touchscreen.tap(x, y);
    await sleep(90);
  }
  await sleep(400);
  check('markers: 7 placed by taps', (await state(p)).live === 7);
  await snap(p, '21-markers-placed');
  await p.tap('.mk-btn.primary');
  await waitPhase(p, 'result', 8000);
  await sleep(800);
  await snap(p, '22-markers-result');
  o = await orbs(p);
  check('markers: 1 winner of 7', o.filter((x) => x.role === 'winner').length === 1);
  await p.evaluate(() => (window.__oldRound = window.__pikko.engine.round));
  await p.tap('.mk-btn.primary');
  await waitFor(p, () => window.__pikko.engine.round && window.__pikko.engine.round !== window.__oldRound, null, 3000);
  await waitPhase(p, 'result', 8000);
  check('markers: "again" reruns with same markers', (await p.evaluate(() => window.__pikko.engine.round.markers.length)) === 7);
  await sleep(500);
  await p.tap('.mk-btn.glass');
  await waitPhase(p, 'idle', 3000);
  await setMode(p, { markers: false });

  // ---------- 10. 6th finger: iOS cancels every touch ----------
  // all five through one CDP session, so the same session can cancel them
  const tp = PTS.map(([x, y], i) => ({ x, y, id: 100 + i, radiusX: 8, radiusY: 8, force: 1 }));
  for (let i = 1; i <= tp.length; i++) {
    await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp.slice(0, i) });
    await sleep(60);
  }
  await sleep(300);
  check('5 simultaneous touches tracked', (await state(p)).live === 5);
  try {
    await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: tp });
  } catch {
    await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  }
  await sleep(350);
  const toastText = await p.$eval('.toast', (e) => (e.classList.contains('show') ? e.textContent : '')).catch(() => '');
  check('touchcancel with 5 fingers explains the iPhone limit', toastText.includes('5'), toastText);
  await snap(p, '23-touch-cancel');
  await waitPhase(p, 'idle', 3000);

  // ---------- 11. no scroll, no zoom ----------
  const hd = await p.touchscreen.touchStart(200, 400);
  for (let i = 1; i <= 8; i++) await hd.move(200, 400 - i * 30);
  await hd.end();
  try {
    await p.cdp.send('Input.synthesizePinchGesture', { x: 196, y: 420, scaleFactor: 2.2, gestureSourceType: 'touch' });
  } catch {
    /* not supported */
  }
  await sleep(500);
  const vv = await p.evaluate(() => ({ y: window.scrollY, x: window.scrollX, s: window.visualViewport ? window.visualViewport.scale : 1, sel: String(window.getSelection()) }));
  check('no page scroll, zoom or selection', vv.x === 0 && vv.y === 0 && vv.s === 1 && !vv.sel, JSON.stringify(vv));
  await waitPhase(p, 'idle', 5000).catch(() => {});

  // ---------- 12. settings + promo gallery ----------
  await sleep(400);
  await p.tap('.top .icon-btn');
  await waitFor(p, () => document.querySelector('.settings-sheet.open'), null, 3000);
  await sleep(600);
  await snap(p, '24-settings');
  // a real finger swipe must scroll the sheet (the game area blocks scrolling)
  const sw = await p.touchscreen.touchStart(196, 760);
  for (let i = 1; i <= 12; i++) {
    await sw.move(196, 760 - i * 38);
    await sleep(16);
  }
  await sw.end();
  await sleep(500);
  const swiped = await p.evaluate(() => document.querySelector('.settings-sheet .sheet-body').scrollTop);
  check('settings sheet scrolls with a touch swipe', swiped > 100, `scrollTop ${swiped}`);
  await p.evaluate(() => document.querySelector('.settings-sheet .sheet-body').scrollTo(0, 99999));
  await sleep(300);
  await snap(p, '25-settings-bottom');
  const kinds = ['gift', 'paywall', 'offer', 'unlock', 'winback'];
  for (let i = 0; i < kinds.length; i++) {
    const k = kinds[i];
    await p.evaluate((idx) => {
      const rows = document.querySelectorAll('.settings-sheet .group')[2].querySelectorAll('.row.tap');
      rows[idx].scrollIntoView({ block: 'center' });
    }, i);
    await sleep(200);
    const el = await p.evaluateHandle((idx) => document.querySelectorAll('.settings-sheet .group')[2].querySelectorAll('.row.tap')[idx], i);
    await el.tap();
    const sel = k === 'unlock' ? '.unlock-sheet.open' : `.${k === 'gift' ? 'gift' : k === 'paywall' ? 'paywall' : k === 'offer' ? 'offer' : 'winback'}-modal.open`;
    const shown = await waitFor(p, (s) => document.querySelector(s), sel, 3000).then(
      () => true,
      () => false,
    );
    check(`promo "${k}" opens from settings`, shown);
    await sleep(k === 'paywall' ? 2700 : 1100);
    await snap(p, `26-promo-${k}`);
    if (k === 'paywall') {
      await p.evaluate(() => document.querySelector('.pm-scroll').scrollTo(0, 99999));
      await sleep(300);
      await snap(p, '26-promo-paywall-bottom');
      await p.tap('.paywall-modal .plan[data-plan="week"]');
      await sleep(200);
      const lbl = await p.$eval('.paywall-modal .cta .lbl', (e) => e.textContent);
      check('paywall: choosing weekly turns the trial off', !/бесплатно/i.test(lbl), lbl);
      await p.evaluate(() => document.querySelector('.pm-scroll').scrollTo(0, 0));
      await sleep(200);
      await p.tap('.paywall-modal .pm-x');
    } else if (k === 'unlock') await p.tap('.unlock-sheet .sheet-x');
    else if (k === 'offer') {
      const t1 = await p.$eval('.clock', (e) => e.textContent);
      await sleep(1100);
      const t2 = await p.$eval('.clock', (e) => e.textContent);
      check('offer timer ticks', t1 !== t2, `${t1} -> ${t2}`);
      await p.tap('.offer-modal .ghost');
    } else await p.tap(`.${k}-modal .ghost`);
    await waitFor(p, (s) => !document.querySelector(s), sel.replace('.open', ''), 3000).catch(() => {});
    await sleep(350);
  }
  await p.tap('.settings-sheet .sheet-x');
  await sleep(500);

  // ---------- 13. offline reload ----------
  await p.setOfflineMode(true);
  await p.reload({ waitUntil: 'domcontentloaded' });
  const offline = await waitFor(p, () => document.querySelector('.mode-chip .chip-name'), null, 5000).then(
    () => true,
    () => false,
  );
  check('works offline after install (reload with network off)', offline);
  await sleep(600);
  await snap(p, '27-offline');
  await p.setOfflineMode(false);

  // ---------- 14. perf ----------
  await setMode(p, { mode: 'one', markers: false });
  await p.evaluate(() => {
    const e = window.__pikko.engine;
    e.frameStats = { n: 0, js: 0, max: 0 };
    window.__frames = [];
    let last = 0;
    const loop = (ts) => {
      if (last) window.__frames.push(ts - last);
      last = ts;
      if (window.__frames.length < 400) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  hs = await down(p, PTS);
  await waitPhase(p, 'result');
  await sleep(1200);
  const perf = await p.evaluate(() => {
    const f = window.__pikko.engine.frameStats;
    const d = window.__frames.slice().sort((a, b) => a - b);
    return { avgJs: f.js / Math.max(1, f.n), maxJs: f.max, frames: f.n, p50: d[Math.floor(d.length * 0.5)], p95: d[Math.floor(d.length * 0.95)] };
  });
  check('render cost per frame is small', perf.avgJs < 4, `avg ${perf.avgJs.toFixed(2)} ms, max ${perf.maxJs.toFixed(1)} ms, frame p50 ${perf.p50?.toFixed(1)} p95 ${perf.p95?.toFixed(1)} ms`);
  await upAll(hs);
  check('no console errors (main run)', p.errors.length === 0, p.errors.slice(0, 3).join(' | '));
  await p.ctx.close();

  // ---------- 15. promo triggers on a fresh install ----------
  const q = await open();
  await waitFor(q, () => document.querySelector('.gift-modal.open'), null, 4000);
  await q.tap('.gift-modal .ghost');
  await waitFor(q, () => !document.querySelector('.layer'), null, 3000);
  await q.evaluate(() => {
    window.__pikko.settings.speed = 'fast';
    window.__pikko.stats.lastPromoAt = 0;
    window.__pikko.sync();
  });
  for (let i = 0; i < 4; i++) {
    const h2 = await down(q, PTS.slice(0, 2));
    await waitPhase(q, 'result', 6000);
    await upAll(h2);
    await waitPhase(q, 'idle', 5000);
    await sleep(150);
  }
  const offerShown = await waitFor(q, () => document.querySelector('.offer-modal.open'), null, 3000).then(
    () => true,
    () => false,
  );
  check('every 4th round shows the limited offer (after the round ends)', offerShown);
  await q.ctx.close();

  const r = await open({ url: '/?promo=stay' });
  const wb = await waitFor(r, () => document.querySelector('.winback-modal.open'), null, 3000).then(
    () => true,
    () => false,
  );
  check('icon shortcut link /?promo=stay opens the "don\'t go" offer', wb);
  await sleep(900);
  await snap(r, '28-winback-from-shortcut');
  await r.ctx.close();

  // ---------- 16. English + landscape ----------
  const e = await open({ lang: 'en-US' });
  await waitFor(e, () => document.querySelector('.gift-modal.open'), null, 4000);
  await e.tap('.gift-modal .ghost');
  await waitFor(e, () => !document.querySelector('.layer'), null, 3000);
  await sleep(300);
  await snap(e, '29-idle-en');
  check('English UI', (await e.$eval('.hint-title', (x) => x.textContent)).startsWith('Place'));
  await e.evaluate(() => window.__pikko.ui && 0);
  await e.ctx.close();

  const l = await open({ w: 852, h: 393 });
  await waitFor(l, () => document.querySelector('.gift-modal.open'), null, 4000);
  await l.tap('.gift-modal .ghost');
  await waitFor(l, () => !document.querySelector('.layer'), null, 3000);
  const lh = await down(l, [
    [200, 150],
    [430, 260],
    [650, 140],
  ]);
  await waitPhase(l, 'result');
  await sleep(700);
  await snap(l, '30-landscape-result');
  await upAll(lh);
  check('landscape round works', true);
  await l.ctx.close();
} catch (err) {
  check('test run finished without exceptions', false, err.stack || String(err));
} finally {
  await browser.close();
}

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);

async function page_is(page, fn) {
  return page.evaluate(fn);
}
