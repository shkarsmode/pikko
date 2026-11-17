// Renders the app icon, iOS splash screens and the share image with the
// locally installed Chrome. Run: npm run assets (outputs go to public/).
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const pub = path.join(root, 'public');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ACC = '#3dff9a';

// The reticle: dial (70% lit), ring, core, lock-on brackets, three players.
function reticle({ withNodes = true } = {}) {
  let ticks = '';
  let lit = '';
  for (let i = 0; i < 40; i++) {
    const a = -Math.PI / 2 + (i / 40) * Math.PI * 2;
    const r0 = 296;
    const r1 = i % 10 === 0 ? 352 : 334;
    const seg = `M${(512 + Math.cos(a) * r0).toFixed(1)} ${(512 + Math.sin(a) * r0).toFixed(1)}L${(512 + Math.cos(a) * r1).toFixed(1)} ${(512 + Math.sin(a) * r1).toFixed(1)}`;
    if (i < 28) lit += seg;
    else ticks += seg;
  }
  const B = 352;
  const arm = 92;
  const br = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]
    .map(([sx, sy]) => {
      const cx = 512 + sx * B;
      const cy = 512 + sy * B;
      return `M${cx - sx * arm} ${cy}L${cx} ${cy}L${cx} ${cy - sy * arm}`;
    })
    .join('');
  const node = (deg, color) => {
    const a = (deg * Math.PI) / 180;
    const x = 512 + Math.cos(a) * 398;
    const y = 512 + Math.sin(a) * 398;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="64" fill="url(#g-${color.slice(1)})"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="25" fill="${color}"/>`;
  };
  return `
  <circle cx="512" cy="512" r="300" fill="url(#glow)"/>
  <path d="${ticks}" stroke="#ffffff" stroke-opacity=".22" stroke-width="12"/>
  <path d="${lit}" stroke="${ACC}" stroke-width="12"/>
  <circle cx="512" cy="512" r="228" fill="none" stroke="#eceef2" stroke-width="16"/>
  <circle cx="512" cy="512" r="96" fill="${ACC}"/>
  <circle cx="512" cy="512" r="22" fill="#07080b"/>
  <path d="${br}" fill="none" stroke="#eceef2" stroke-width="22" stroke-linecap="square"/>
  ${withNodes ? node(45, '#4dd7ff') + node(135, '#ffb547') + node(-45, '#ff5c7a') : ''}`;
}

const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14171e"/><stop offset="1" stop-color="#07080b"/></linearGradient>
  <pattern id="dots" width="56" height="56" patternUnits="userSpaceOnUse"><circle cx="28" cy="28" r="3" fill="#ffffff" fill-opacity=".085"/></pattern>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${ACC}" stop-opacity=".34"/><stop offset="1" stop-color="${ACC}" stop-opacity="0"/></radialGradient>
  ${['4dd7ff', 'ffb547', 'ff5c7a'].map((c) => `<radialGradient id="g-${c}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#${c}" stop-opacity=".45"/><stop offset="1" stop-color="#${c}" stop-opacity="0"/></radialGradient>`).join('')}
</defs>`;

const iconSvg = (scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#dots)"/>
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${reticle()}</g></svg>`;

const glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}${reticle({ withNodes: true })}</svg>`;

const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#0d0f13"/><circle cx="32" cy="32" r="15" fill="none" stroke="#eceef2" stroke-width="3.2"/>
<circle cx="32" cy="32" r="7" fill="${ACC}"/><path d="M10 18V10h8M46 10h8v8M54 46v8h-8M18 54h-8v-8" fill="none" stroke="#eceef2" stroke-width="3" stroke-linecap="square"/></svg>`;

const tile = (inner, color = '#eceef2') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#0d0f13"/><g transform="translate(24 24) scale(2)" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
const SHORTCUTS = {
  'shortcut-gift.png': tile('<path d="M4 9h16v4H4zM5.5 13h13v7.5h-13zM12 9v11.5M12 9C10 5 6.5 5.5 7.5 8 8 9 12 9 12 9zM12 9c2-4 5.5-3.5 4.5-1C16 9 12 9 12 9z"/>', ACC),
  'shortcut-one.png': tile('<circle cx="12" cy="12" r="4.2"/><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/>', ACC),
  'shortcut-teams.png': tile('<circle cx="5.5" cy="7.5" r="2.2"/><circle cx="6.5" cy="16.5" r="2.2"/><circle cx="18.5" cy="7.5" r="2.2"/><circle cx="17.5" cy="16.5" r="2.2"/><path d="M12 3v18" stroke-dasharray="1.5 2.5"/>', '#4dd7ff'),
};

// iPhone screens (portrait CSS size, pixel ratio). device-height is only
// used where two phones share a width: iOS 27.0 misreads it at launch
// (WebKit bug 326500), and both of those phones stop at older iOS.
const DEVICES = [
  [440, 956, 3],
  [430, 932, 3],
  [428, 926, 3],
  [420, 912, 3],
  [414, 896, 3, true],
  [414, 736, 3, true],
  [414, 896, 2],
  [402, 874, 3],
  [393, 852, 3],
  [390, 844, 3],
  [375, 812, 3],
  [375, 667, 2],
  [320, 568, 2],
];

const b64 = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`;

function splashHtml(w, h) {
  const size = Math.round(Math.min(w, h) * 0.46);
  return `<!doctype html><html><head><style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#07080b}
  .bg{position:fixed;inset:0;background:radial-gradient(circle at 1px 1px, rgba(255,255,255,.075) 1px, transparent 1.4px) 0 0/22px 22px,#07080b}
  img{position:fixed;left:50%;top:50%;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px}
  </style></head><body><div class="bg"></div><img src="${b64(glyphSvg)}"></body></html>`;
}

const ogHtml = `<!doctype html><html><head><style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden;color:#eceef2;font-family:'Segoe UI',system-ui,sans-serif}
.bg{position:fixed;inset:0;background:radial-gradient(60% 80% at 22% 50%,rgba(61,255,154,.12),rgba(61,255,154,0) 70%),radial-gradient(circle at 1px 1px,rgba(255,255,255,.07) 1px,transparent 1.4px) 0 0/24px 24px,#07080b}
img{position:fixed;left:96px;top:135px;width:360px;height:360px;border-radius:82px;box-shadow:0 40px 90px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.08)}
h1{position:fixed;left:530px;top:150px;margin:0;font-size:124px;font-weight:700;letter-spacing:-4px}
p{position:fixed;left:536px;top:322px;margin:0;font:500 30px/1.55 Consolas,'Cascadia Code',monospace;color:#99a0ac}
p b{color:#3dff9a;font-weight:500}
</style></head><body><div class="bg"></div><img src="${b64(iconSvg())}"><h1>Pikko</h1><p><b>$</b> pikko --pick 1<br>fair finger picker<br>for iPhone · PWA</p></body></html>`;

async function main() {
  fs.mkdirSync(path.join(pub, 'icons'), { recursive: true });
  fs.mkdirSync(path.join(pub, 'splash'), { recursive: true });
  fs.writeFileSync(path.join(root, 'assets-src/icon.svg'), iconSvg());
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
  const page = await browser.newPage();

  const shotSvg = async (svg, size, file) => {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:transparent"><img src="${b64(svg)}" width="${size}" height="${size}" style="display:block"></body></html>`);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    await page.screenshot({ path: path.join(pub, file), omitBackground: true });
  };

  await shotSvg(iconSvg(), 512, 'icons/icon-512.png');
  await shotSvg(iconSvg(), 192, 'icons/icon-192.png');
  await shotSvg(iconSvg(), 180, 'icons/apple-touch-icon.png');
  await shotSvg(iconSvg(0.8), 512, 'icons/maskable-512.png');
  await shotSvg(favSvg, 32, 'icons/favicon-32.png');
  for (const [file, svg] of Object.entries(SHORTCUTS)) await shotSvg(svg, 96, `icons/${file}`);
  fs.writeFileSync(path.join(pub, 'icons/favicon.svg'), favSvg);
  fs.writeFileSync(path.join(pub, 'icons/icon.svg'), iconSvg());

  const links = [];
  for (const [w, h, dpr, needH] of DEVICES) {
    for (const orient of ['portrait', 'landscape']) {
      const vw = orient === 'portrait' ? w : h;
      const vh = orient === 'portrait' ? h : w;
      const file = `splash/${w}x${h}@${dpr}-${orient[0]}.png`;
      await page.setViewport({ width: vw, height: vh, deviceScaleFactor: dpr });
      await page.setContent(splashHtml(vw, vh));
      await page.waitForFunction(() => [...document.images].every((i) => i.complete));
      await page.screenshot({ path: path.join(pub, file) });
      const media = `(device-width: ${w}px)${needH ? ` and (device-height: ${h}px)` : ''} and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orient})`;
      links.push(`<link rel="apple-touch-startup-image" media="${media}" href="/${file}">`);
    }
  }
  fs.writeFileSync(path.join(root, 'assets-src/splash-links.html'), links.join('\n') + '\n');

  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(ogHtml);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.screenshot({ path: path.join(pub, 'og.png') });

  await browser.close();
  console.log(`icons, ${links.length} splash screens and og.png written to public/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
