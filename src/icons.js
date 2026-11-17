// Inline SVG icons (original artwork), line style, currentColor.
const svg = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;
const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  gear: svg(
    `<path ${S} d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path ${S} d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z"/>`,
  ),
  chevron: svg(`<path ${S} d="M7 10l5 5 5-5"/>`),
  close: svg(`<path ${S} d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`),
  check: svg(`<path ${S} stroke-width="2.2" d="M5 12.5l4.5 4.5L19 7.5"/>`),
  lock: svg(`<rect ${S} x="5" y="10.5" width="14" height="10" rx="2"/><path ${S} d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>`),
  key: svg(`<circle ${S} cx="8" cy="15" r="4"/><path ${S} d="M11 12l8-8M16 7l2 2M14 9l2 2"/>`),
  share: svg(`<path ${S} d="M12 3.5v11M8 7.5l4-4 4 4M8.5 10.5H7a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1.5"/>`),
  plusBox: svg(`<rect ${S} x="4" y="4" width="16" height="16" rx="4"/><path ${S} d="M12 8.5v7M8.5 12h7"/>`),
  phone: svg(`<rect ${S} x="7" y="2.5" width="10" height="19" rx="2.5"/><path ${S} d="M10.5 18.5h3"/>`),
  speaker: svg(`<path ${S} d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path ${S} d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>`),
  bolt: svg(`<path ${S} d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>`),
  grid: svg(`<path ${S} d="M4 4h16v16H4zM4 12h16M12 4v16"/>`),
  palette: svg(`<circle ${S} cx="12" cy="12" r="8.5"/><circle cx="8.5" cy="10" r="1.3" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="10" r="1.3" fill="currentColor"/><path ${S} d="M12 20.5c-1.5 0-2-1-2-2s1-1.8 2.2-1.8h1.6"/>`),
  heart: svg(`<path ${S} d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.7 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>`),
  layers: svg(`<path ${S} d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z"/><path ${S} d="M3.5 12l8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>`),
  terminal: svg(`<rect ${S} x="3" y="4.5" width="18" height="15" rx="2.5"/><path ${S} d="M7 9.5l3 2.5-3 2.5M12.5 15h4.5"/>`),
};

// Mode glyphs: little diagrams of targets and players.
export const MODE_ICONS = {
  one: svg(
    `<circle ${S} cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><path ${S} d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/>`,
  ),
  n: svg(
    `<circle ${S} cx="8" cy="9" r="3.4"/><circle cx="8" cy="9" r="1.1" fill="currentColor"/><circle ${S} cx="16.5" cy="15.5" r="3.4"/><circle cx="16.5" cy="15.5" r="1.1" fill="currentColor"/><circle cx="18.5" cy="5" r="1.2" fill="currentColor" opacity=".45"/><circle cx="5" cy="19" r="1.2" fill="currentColor" opacity=".45"/>`,
  ),
  teams: svg(
    `<circle cx="5.5" cy="7.5" r="2.2" fill="currentColor"/><circle cx="6.5" cy="16.5" r="2.2" fill="currentColor"/><path ${S} d="M5.5 7.5l1 9"/><circle ${S} cx="18.5" cy="7.5" r="2.2"/><circle ${S} cx="17.5" cy="16.5" r="2.2"/><path ${S} d="M18.3 9.7l-.6 4.6"/><path ${S} stroke-dasharray="1.5 2.5" d="M12 3v18"/>`,
  ),
  order: svg(
    `<circle cx="5" cy="6" r="1.6" fill="currentColor"/><path ${S} d="M9 6h11"/><circle cx="5" cy="12" r="1.6" fill="currentColor" opacity=".7"/><path ${S} d="M9 12h8"/><circle cx="5" cy="18" r="1.6" fill="currentColor" opacity=".4"/><path ${S} d="M9 18h5"/>`,
  ),
  elim: svg(
    `<circle ${S} cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><path ${S} opacity=".6" d="M3 3.5l3 3M6 3.5l-3 3M18 17.5l3 3M21 17.5l-3 3M18 3.5l3 3M21 3.5l-3 3"/>`,
  ),
  reaction: svg(`<circle ${S} opacity=".5" cx="12" cy="12" r="9"/><path ${S} d="M13 5.5L8 13h4l-1 5.5L16 11h-4z"/>`),
  markers: svg(
    `<circle cx="5" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="4.5" r="1.5" fill="currentColor" opacity=".6"/><circle cx="19" cy="5.5" r="1.5" fill="currentColor"/><circle cx="4.5" cy="12" r="1.5" fill="currentColor" opacity=".6"/><circle cx="19.5" cy="12.5" r="1.5" fill="currentColor" opacity=".6"/><circle cx="6" cy="19" r="1.5" fill="currentColor"/><circle cx="12.5" cy="19.5" r="1.5" fill="currentColor" opacity=".6"/><circle cx="19" cy="19" r="1.5" fill="currentColor"/><circle ${S} cx="12" cy="12" r="3"/>`,
  ),
};

// Idle-screen target: spinning dashed orbit, a dial that sweeps like the
// in-game countdown, lock-on brackets, a pulsing core and three "players".
function dialTicks() {
  let d = '';
  for (let i = 0; i < 40; i++) {
    const a = -Math.PI / 2 + (i / 40) * Math.PI * 2;
    const r0 = 62;
    const r1 = i % 10 === 0 ? 72 : 69;
    d += `M${(100 + Math.cos(a) * r0).toFixed(1)} ${(100 + Math.sin(a) * r0).toFixed(1)}L${(100 + Math.cos(a) * r1).toFixed(1)} ${(100 + Math.sin(a) * r1).toFixed(1)}`;
  }
  return d;
}
const TICK_PATH = dialTicks();

export const RETICLE = `<svg class="reticle" viewBox="0 0 200 200" aria-hidden="true">
  <defs><mask id="pk-sweep"><circle class="rt-sweep" cx="100" cy="100" r="67" fill="none" stroke="#fff" stroke-width="16" pathLength="100" transform="rotate(-90 100 100)"/></mask></defs>
  <g class="rt-spin"><circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" stroke-opacity=".22" stroke-width="1.2" stroke-dasharray="1.5 5"/></g>
  <path d="${TICK_PATH}" stroke="currentColor" stroke-opacity=".22" stroke-width="1.6"/>
  <path d="${TICK_PATH}" stroke="var(--acc)" stroke-width="1.8" mask="url(#pk-sweep)"/>
  <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="1.6"/>
  <path class="rt-br" d="M36 56V36h20M144 36h20v20M164 144v20h-20M56 164H36v-20" fill="none" stroke="currentColor" stroke-opacity=".8" stroke-width="2" stroke-linecap="square"/>
  <circle class="rt-core" cx="100" cy="100" r="17" fill="var(--acc)"/>
  <circle cx="100" cy="100" r="4" fill="#07080b"/>
  <g class="rt-orbit"><circle cx="100" cy="8" r="3.6" fill="#4dd7ff"/><circle cx="179.7" cy="146" r="3.6" fill="#ffb547"/><circle cx="20.3" cy="146" r="3.6" fill="#ff5c7a"/></g>
</svg>`;

// Big reticle used as paywall artwork.
export const HERO = RETICLE.replace('class="reticle"', 'class="reticle hero"').replace('id="pk-sweep"', 'id="pk-sweep2"').replace('url(#pk-sweep)', 'url(#pk-sweep2)');
