// Renders icons, iOS splash screens and the share image from SVG/HTML with
// the locally installed Chrome. Run: npm run assets (outputs go to public/).
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const pub = path.join(root, 'public');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const iconSvg = fs.readFileSync(path.join(root, 'assets-src/icon.svg'), 'utf8');
const b64 = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`;

// maskable: same art, shrunk into the 80% safe zone
const maskSvg = iconSvg.replace('<g id="art">', '<g id="art" transform="translate(512 530) scale(0.8) translate(-512 -530)">');

const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b2391"/><stop offset="1" stop-color="#0b0820"/></linearGradient>
<radialGradient id="c" cx=".36" cy=".31" r=".78"><stop offset="0" stop-color="#fff"/><stop offset=".2" stop-color="#ffdbe2"/><stop offset=".6" stop-color="#ff4d6d"/><stop offset="1" stop-color="#ad1747"/></radialGradient></defs>
<rect width="64" height="64" rx="15" fill="url(#b)"/><circle cx="32" cy="33" r="15.5" fill="none" stroke="#fff" stroke-width="3.4"/><circle cx="32" cy="33" r="11" fill="url(#c)"/>
<circle cx="13" cy="17" r="4.4" fill="#2ee59d"/><circle cx="52" cy="22" r="3.8" fill="#38bdf8"/><circle cx="47" cy="53" r="4" fill="#ffb020"/></svg>`;

const GIFT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#2a1d5c"/>
<rect x="22" y="44" width="52" height="36" rx="6" fill="#ff5a80"/><rect x="18" y="34" width="60" height="14" rx="5" fill="#ff8fab"/>
<rect x="43" y="34" width="10" height="46" fill="#ffc53d"/><path d="M48 34c-6-12-20-13-18-5 1 5 11 5 18 5zM48 34c6-12 20-13 18-5-1 5-11 5-18 5z" fill="#ffc53d"/></svg>`;

const modeShortcut = (color, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#1d1640"/><g transform="translate(16 16) scale(2)" color="${color}">${inner}</g></svg>`;
const ONE = '<circle cx="6" cy="8" r="2.6" fill="currentColor" opacity=".4"/><circle cx="26.5" cy="9" r="2.6" fill="currentColor" opacity=".4"/><circle cx="24" cy="26" r="2.6" fill="currentColor" opacity=".4"/><circle cx="15" cy="17" r="5.2" fill="currentColor"/><circle cx="15" cy="17" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/>';
const TEAMS = '<circle cx="7" cy="10" r="3.6" fill="currentColor"/><circle cx="9" cy="22" r="3.6" fill="currentColor"/><path d="M7 10L9 22" stroke="currentColor" stroke-width="2"/><circle cx="25" cy="10" r="3.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="23" cy="22" r="3.6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M25 13.6l-1.6 4.8" stroke="currentColor" stroke-width="2"/>';

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

function splashHtml(w, h) {
  const s = Math.min(w, h);
  const orb = Math.round(s * 0.2);
  return `<!doctype html><html><head><style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#0b0914}
  .bg{position:fixed;inset:0;background:#0b0914}
  .o{position:fixed;left:50%;top:50%;width:${orb}px;height:${orb}px;margin:${-orb / 2}px;border-radius:50%;
    background:radial-gradient(circle at 34% 30%,#fff 0,#ffd3dc 16%,#ff4d6d 58%,#a51c45 100%);
    box-shadow:0 0 ${orb * 0.8}px rgba(255,77,109,.6),0 0 0 ${orb * 0.16}px rgba(255,77,109,.13)}
  .r{position:fixed;left:50%;top:50%;width:${orb * 1.6}px;height:${orb * 1.6}px;margin:${-orb * 0.8}px;border-radius:50%;border:${Math.max(2, orb * 0.04)}px solid rgba(255,255,255,.85)}
  </style></head><body><div class="bg"></div><div class="r"></div><div class="o"></div></body></html>`;
}

const ogHtml = `<!doctype html><html><head><style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;color:#fff}
.bg{position:fixed;inset:0;background:radial-gradient(90% 90% at 20% 10%,#3b2391 0%,rgba(59,35,145,0) 60%),radial-gradient(70% 80% at 100% 100%,rgba(255,77,109,.35),rgba(255,77,109,0) 60%),#0b0914}
img{position:fixed;left:110px;top:135px;width:360px;height:360px;border-radius:84px;box-shadow:0 40px 90px rgba(0,0,0,.5)}
h1{position:fixed;left:540px;top:150px;margin:0;font-size:132px;font-weight:800;letter-spacing:-3px}
p{position:fixed;left:546px;top:330px;margin:0;font-size:40px;line-height:1.3;color:rgba(255,255,255,.78);width:560px}
</style></head><body><div class="bg"></div><img src="${b64(iconSvg)}"><h1>Pikko</h1><p>Everyone puts a finger down.<br>Pikko picks one.</p></body></html>`;

async function main() {
  fs.mkdirSync(path.join(pub, 'icons'), { recursive: true });
  fs.mkdirSync(path.join(pub, 'splash'), { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
  const page = await browser.newPage();

  const shotSvg = async (svg, size, file) => {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:transparent"><img src="${b64(svg)}" width="${size}" height="${size}" style="display:block"></body></html>`);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    await page.screenshot({ path: path.join(pub, file), omitBackground: true });
  };

  await shotSvg(iconSvg, 512, 'icons/icon-512.png');
  await shotSvg(iconSvg, 192, 'icons/icon-192.png');
  await shotSvg(iconSvg, 180, 'icons/apple-touch-icon.png');
  await shotSvg(maskSvg, 512, 'icons/maskable-512.png');
  await shotSvg(favSvg, 32, 'icons/favicon-32.png');
  await shotSvg(GIFT_SVG, 96, 'icons/shortcut-gift.png');
  await shotSvg(modeShortcut('#ff5c7a', ONE), 96, 'icons/shortcut-one.png');
  await shotSvg(modeShortcut('#38bdf8', TEAMS), 96, 'icons/shortcut-teams.png');
  fs.writeFileSync(path.join(pub, 'icons/favicon.svg'), favSvg);
  fs.writeFileSync(path.join(pub, 'icons/icon.svg'), iconSvg);

  const links = [];
  for (const [w, h, dpr, needH] of DEVICES) {
    for (const orient of ['portrait', 'landscape']) {
      const vw = orient === 'portrait' ? w : h;
      const vh = orient === 'portrait' ? h : w;
      const file = `splash/${w}x${h}@${dpr}-${orient[0]}.png`;
      await page.setViewport({ width: vw, height: vh, deviceScaleFactor: dpr });
      await page.setContent(splashHtml(vw, vh));
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
