// Inline SVG icons (original artwork). currentColor everywhere.
const svg = (body, vb = '0 0 32 32') => `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  gear: svg(
    '<path fill="currentColor" d="M13.6 3h4.8l.7 3.3a10 10 0 0 1 2.4 1.4l3.2-1.1 2.4 4.2-2.5 2.2a10 10 0 0 1 0 2.8l2.5 2.2-2.4 4.2-3.2-1.1a10 10 0 0 1-2.4 1.4l-.7 3.3h-4.8l-.7-3.3a10 10 0 0 1-2.4-1.4l-3.2 1.1-2.4-4.2 2.5-2.2a10 10 0 0 1 0-2.8L4.9 10.8l2.4-4.2 3.2 1.1a10 10 0 0 1 2.4-1.4zM16 11.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6z"/>',
  ),
  chevron: svg('<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M9 13l7 7 7-7"/>'),
  close: svg('<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M9 9l14 14M23 9L9 23"/>'),
  crown: svg('<path fill="currentColor" d="M4 10l6.2 5L16 6l5.8 9L28 10l-2.4 14H6.4zM6.6 26h18.8v2.4H6.6z"/>'),
  lock: svg('<path fill="currentColor" d="M10 14v-3.5a6 6 0 0 1 12 0V14h1.5A2.5 2.5 0 0 1 26 16.5v9A2.5 2.5 0 0 1 23.5 28h-15A2.5 2.5 0 0 1 6 25.5v-9A2.5 2.5 0 0 1 8.5 14zm3 0h6v-3.5a3 3 0 0 0-6 0z"/>'),
  check: svg('<path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M7 16.5l6 6L25 10"/>'),
  share: svg(
    '<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M16 4v15M10.5 9.5L16 4l5.5 5.5M11 14H8.5A1.5 1.5 0 0 0 7 15.5v11A1.5 1.5 0 0 0 8.5 28h15a1.5 1.5 0 0 0 1.5-1.5v-11a1.5 1.5 0 0 0-1.5-1.5H21"/>',
  ),
  plusBox: svg(
    '<rect x="5" y="5" width="22" height="22" rx="5" fill="none" stroke="currentColor" stroke-width="2.4"/><path stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M16 11v10M11 16h10"/>',
  ),
  phone: svg(
    '<rect x="9" y="3" width="14" height="26" rx="3.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M14 25h4"/>',
  ),
  speaker: svg(
    '<path fill="currentColor" d="M5 12.5A1.5 1.5 0 0 1 6.5 11H10l6-5.2c1-.8 2.5-.1 2.5 1.2v18c0 1.3-1.5 2-2.5 1.2L10 21H6.5A1.5 1.5 0 0 1 5 19.5z"/><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M22.5 11.5a6.5 6.5 0 0 1 0 9M25.8 8.2a11 11 0 0 1 0 15.6"/>',
  ),
  sparkle: svg('<path fill="currentColor" d="M16 2l2.6 9.4L28 14l-9.4 2.6L16 26l-2.6-9.4L4 14l9.4-2.6z"/>'),
  heart: svg('<path fill="currentColor" d="M16 27S4 19.6 4 11.8A6.3 6.3 0 0 1 16 8.6a6.3 6.3 0 0 1 12 3.2C28 19.6 16 27 16 27z"/>'),
  palette: svg(
    '<path fill="currentColor" d="M16 3C8.8 3 3 8.6 3 15.5 3 22 8.6 27 14.5 27c1.6 0 2.5-1 2.5-2.3 0-1.3-1-1.8-1-3 0-1.4 1.1-2.4 2.6-2.4H22c3.9 0 7-2.8 7-6.6C29 7.4 23.2 3 16 3zm-7 13a2.2 2.2 0 1 1 0-4.4A2.2 2.2 0 0 1 9 16zm4-6a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zm6 0a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zm4.5 4.5a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4z"/>',
  ),
  tap: svg(
    '<circle cx="16" cy="16" r="4" fill="currentColor"/><circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2" opacity=".6"/><circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".3"/>',
  ),
};

// Mode glyphs: small scenes of "players" (dots).
export const MODE_ICONS = {
  one: svg(
    '<circle cx="6" cy="8" r="2.6" fill="currentColor" opacity=".4"/><circle cx="26.5" cy="9" r="2.6" fill="currentColor" opacity=".4"/><circle cx="24" cy="26" r="2.6" fill="currentColor" opacity=".4"/><circle cx="15" cy="17" r="5.2" fill="currentColor"/><circle cx="15" cy="17" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  ),
  n: svg(
    '<circle cx="9.5" cy="12" r="4" fill="currentColor"/><circle cx="9.5" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="22.5" cy="21" r="4" fill="currentColor"/><circle cx="22.5" cy="21" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="25" cy="6" r="2.4" fill="currentColor" opacity=".4"/><circle cx="6" cy="26" r="2.4" fill="currentColor" opacity=".4"/>',
  ),
  teams: svg(
    '<circle cx="7" cy="10" r="3.6" fill="currentColor"/><circle cx="9" cy="22" r="3.6" fill="currentColor"/><path d="M7 10L9 22" stroke="currentColor" stroke-width="2"/><circle cx="25" cy="10" r="3.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="23" cy="22" r="3.6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M25 13.6l-1.6 4.8" stroke="currentColor" stroke-width="2"/><path d="M16 4v24" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 3" opacity=".5"/>',
  ),
  order: svg(
    '<circle cx="7" cy="23" r="5" fill="currentColor"/><text x="7" y="26.2" font-size="8.5" font-weight="800" text-anchor="middle" fill="#0b0914" font-family="system-ui,sans-serif">1</text><circle cx="16" cy="13" r="4.3" fill="none" stroke="currentColor" stroke-width="2"/><text x="16" y="16" font-size="7.5" font-weight="800" text-anchor="middle" fill="currentColor" font-family="system-ui,sans-serif">2</text><circle cx="26" cy="7" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8" opacity=".6"/><path d="M10.5 19.5l2.5-3M19.6 11l2.6-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 3"/>',
  ),
  elim: svg(
    '<circle cx="16" cy="16" r="5" fill="currentColor"/><circle cx="16" cy="16" r="8.6" fill="none" stroke="currentColor" stroke-width="2"/><g opacity=".55" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3.5 4.5l4 4M7.5 4.5l-4 4M24.5 23.5l4 4M28.5 23.5l-4 4M24.5 4.5l4 4M28.5 4.5l-4 4"/></g>',
  ),
  reaction: svg(
    '<circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" stroke-width="2" opacity=".5"/><path fill="currentColor" d="M18.2 4.5L9 17.5h6l-1.6 10L23 14.4h-6.2z"/>',
  ),
  markers: svg(
    '<circle cx="6.5" cy="7" r="3" fill="currentColor"/><circle cx="16" cy="5.5" r="3" fill="currentColor" opacity=".7"/><circle cx="25.5" cy="8" r="3" fill="currentColor"/><circle cx="5.5" cy="17" r="3" fill="currentColor" opacity=".7"/><circle cx="26.5" cy="18" r="3" fill="currentColor" opacity=".7"/><circle cx="9" cy="26.5" r="3" fill="currentColor"/><circle cx="17" cy="27" r="3" fill="currentColor" opacity=".7"/><circle cx="25" cy="27" r="3" fill="currentColor"/><circle cx="16" cy="16.5" r="4.4" fill="none" stroke="currentColor" stroke-width="2"/>',
  ),
};

// Gift box used by promos (animated with CSS classes).
export const GIFT = `<svg class="gift" viewBox="0 0 160 160" aria-hidden="true">
  <defs>
    <linearGradient id="gBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6d8f"/><stop offset="1" stop-color="#d9305f"/></linearGradient>
    <linearGradient id="gLid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff93ad"/><stop offset="1" stop-color="#ff5a80"/></linearGradient>
    <linearGradient id="gRib" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset="1" stop-color="#ffb21f"/></linearGradient>
    <radialGradient id="gIn" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c9" stop-opacity=".95"/><stop offset="1" stop-color="#ffd25e" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse class="gift-shadow" cx="80" cy="144" rx="46" ry="6" fill="#000" opacity=".35"/>
  <circle class="gift-glow" cx="80" cy="70" r="46" fill="url(#gIn)"/>
  <g class="gift-body">
    <rect x="38" y="76" width="84" height="62" rx="10" fill="url(#gBody)"/>
    <rect x="38" y="76" width="84" height="10" fill="#000" opacity=".12"/>
    <rect x="73" y="76" width="14" height="62" fill="url(#gRib)"/>
  </g>
  <g class="gift-lid">
    <rect x="30" y="60" width="100" height="22" rx="8" fill="url(#gLid)"/>
    <rect x="73" y="60" width="14" height="22" fill="url(#gRib)"/>
    <path d="M80 60c-10-20-34-22-31-8 2 8 18 9 31 8z" fill="url(#gRib)"/>
    <path d="M80 60c10-20 34-22 31-8-2 8-18 9-31 8z" fill="url(#gRib)"/>
    <circle cx="80" cy="59" r="6.5" fill="#ffcf4a"/>
  </g>
</svg>`;
