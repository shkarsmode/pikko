// Quick look: open the app as an iPhone home-screen app and screenshot it.
// Usage: node scripts/shot.mjs [url] [out.png] [lang]
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://localhost:5199/';
const out = process.argv[3] || 'test-shots/quick.png';
const lang = process.argv[4] || 'ru-RU';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.emulate({
  viewport: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
});
await page.evaluateOnNewDocument((l) => {
  Object.defineProperty(navigator, 'language', { get: () => l });
  Object.defineProperty(navigator, 'languages', { get: () => [l, l.split('-')[0]] });
  Object.defineProperty(navigator, 'standalone', { get: () => true });
}, lang);
await page.goto(url, { waitUntil: 'networkidle0' });
await page.addStyleTag({ content: ':root:root{--sat:59px;--sab:34px}' });
await new Promise((r) => setTimeout(r, 1800));
await page.screenshot({ path: out });
console.log(logs.join('\n') || 'no console output');
await browser.close();
