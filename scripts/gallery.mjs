// Builds the README gallery images from e2e screenshots (test-shots/).
// Run the e2e suite with --shots first, then: node scripts/gallery.mjs
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const shots = path.join(root, 'test-shots');
const out = path.join(root, 'docs');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(out, { recursive: true });

const sets = {
  'screens.png': [
    ['04-one-countdown', 'Hold still'],
    ['05-one-result', 'Pick one'],
    ['08-teams-result', 'Teams'],
    ['09-order-result', 'Order'],
    ['21-markers-placed', 'Markers, 6+ players'],
  ],
  'promos.png': [
    ['01-first-launch-gift', 'First-launch gift'],
    ['26-promo-paywall', 'Paywall'],
    ['26-promo-offer', 'Timed discount'],
    ['10-unlock-sheet', 'Locked mode'],
    ['26-promo-winback', '“Don’t go” offer'],
  ],
};

const img = (name) => `data:image/png;base64,${fs.readFileSync(path.join(shots, `${name}.png`)).toString('base64')}`;
const lift = [0, -22, -36, -22, 0];

function html(items) {
  const phones = items
    .map(
      ([name, label], i) => `<figure style="transform:translateY(${lift[i]}px)">
        <div class="phone"><img src="${img(name)}"><span class="island"></span></div>
        <figcaption>${label}</figcaption></figure>`,
    )
    .join('');
  return `<!doctype html><html><head><style>
  html,body{margin:0;width:1840px;height:880px;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
  body{background:radial-gradient(60% 70% at 50% 0%,rgba(61,255,154,.12),rgba(61,255,154,0) 70%),radial-gradient(circle at 1px 1px,rgba(255,255,255,.07) 1px,transparent 1.4px) 0 0/24px 24px,#07080b;
    display:flex;align-items:center;justify-content:center;gap:40px}
  figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:22px}
  .phone{position:relative;width:300px;height:650px;padding:10px;border-radius:54px;background:linear-gradient(160deg,#2a2e37,#121419);
    box-shadow:0 40px 80px rgba(0,0,0,.55),inset 0 0 0 2px rgba(255,255,255,.08)}
  .phone img{display:block;width:300px;height:650px;border-radius:44px;object-fit:cover}
  .island{position:absolute;left:50%;top:22px;width:92px;height:27px;margin-left:-46px;border-radius:14px;background:#000}
  figcaption{color:#99a0ac;font:500 20px Consolas,'Cascadia Code',monospace;letter-spacing:.02em}
  </style></head><body>${phones}</body></html>`;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1840, height: 880, deviceScaleFactor: 1 });
for (const [file, items] of Object.entries(sets)) {
  await page.setContent(html(items));
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.screenshot({ path: path.join(out, file) });
  console.log(`docs/${file}`, (fs.statSync(path.join(out, file)).size / 1024).toFixed(0), 'KB');
}
await browser.close();
