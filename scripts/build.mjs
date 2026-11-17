// Build: bundle + minify with esbuild, copy static files, write localized
// manifests and a service worker that precaches the exact build output.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const version = `${pkg.version} · ${stamp}`;

const result = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['safari15.4', 'chrome100', 'firefox110'],
  outdir: path.join(dist, 'assets'),
  entryNames: 'app-[hash]',
  assetNames: '[name]-[hash]',
  metafile: true,
  legalComments: 'none',
  define: { __VERSION__: JSON.stringify(version) },
  logLevel: 'warning',
});

const outs = Object.keys(result.metafile.outputs).map((p) => '/' + path.relative(dist, path.resolve(root, p)).replace(/\\/g, '/'));
const js = outs.find((p) => p.endsWith('.js'));
const css = outs.find((p) => p.endsWith('.css'));

// static files
fs.cpSync(path.join(root, 'public'), dist, { recursive: true });

// index.html
const splash = fs.existsSync(path.join(root, 'assets-src/splash-links.html')) ? fs.readFileSync(path.join(root, 'assets-src/splash-links.html'), 'utf8').trim() : '';
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html
  .replace('<!--SPLASH-->', splash.split('\n').join('\n    '))
  .replace('<!--CSS-->', `<link rel="stylesheet" href="${css}" />`)
  .replace('<!--JS-->', `<script type="module" src="${js}"></script>`);
fs.writeFileSync(path.join(dist, 'index.html'), html);

// manifests (iOS reads name/icons; Android and desktop also read shortcuts)
const L = {
  en: { desc: 'Everyone puts a finger down. Pikko picks one.', stay: 'Wait! A free week inside 🎁', one: 'Pick one', teams: 'Split into teams' },
  ru: { desc: 'Все кладут палец на экран — Pikko выбирает одного.', stay: 'Не уходи! Неделя бесплатно 🎁', one: 'Выбрать одного', teams: 'Разбить на команды' },
  uk: { desc: 'Усі кладуть палець на екран — Pikko обирає одного.', stay: 'Не йди! Тиждень безкоштовно 🎁', one: 'Обрати одного', teams: 'Розбити на команди' },
};
for (const [lang, s] of Object.entries(L)) {
  const manifest = {
    id: '/',
    name: 'Pikko — finger picker',
    short_name: 'Pikko',
    description: s.desc,
    lang,
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0b0914',
    theme_color: '#0b0914',
    categories: ['games', 'entertainment', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    shortcuts: [
      { name: s.stay, short_name: s.stay, url: '/?promo=stay', icons: [{ src: '/icons/shortcut-gift.png', sizes: '96x96', type: 'image/png' }] },
      { name: s.one, short_name: s.one, url: '/?mode=one', icons: [{ src: '/icons/shortcut-one.png', sizes: '96x96', type: 'image/png' }] },
      { name: s.teams, short_name: s.teams, url: '/?mode=teams', icons: [{ src: '/icons/shortcut-teams.png', sizes: '96x96', type: 'image/png' }] },
    ],
  };
  const file = lang === 'en' ? 'manifest.webmanifest' : `manifest-${lang}.webmanifest`;
  fs.writeFileSync(path.join(dist, file), JSON.stringify(manifest, null, 2));
}

// service worker: precache the app shell, versioned by content hash
const precache = ['/', js, css, '/manifest.webmanifest', '/manifest-ru.webmanifest', '/manifest-uk.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/icons/favicon.svg', '/icons/favicon-32.png'];
const hash = crypto.createHash('sha256');
for (const p of precache) hash.update(fs.readFileSync(path.join(dist, p === '/' ? 'index.html' : p.slice(1))));
const swVersion = hash.digest('hex').slice(0, 12);
const sw = fs
  .readFileSync(path.join(root, 'src/sw.js'), 'utf8')
  .replace('__VERSION__', swVersion)
  .replace('__PRECACHE__', JSON.stringify(precache));
const swMin = await esbuild.transform(sw, { minify: true, target: 'safari15.4' });
fs.writeFileSync(path.join(dist, 'sw.js'), swMin.code);
fs.writeFileSync(path.join(dist, 'version.json'), JSON.stringify({ version, sw: swVersion }, null, 2));

const size = (p) => (fs.statSync(path.join(dist, p.slice(1))).size / 1024).toFixed(1) + ' KB';
console.log(`built ${version}\n  ${js} ${size(js)}\n  ${css} ${size(css)}\n  sw ${swVersion}`);
