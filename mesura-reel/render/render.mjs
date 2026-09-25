// Offline renderer for the Mesura reel.
//   node render/render.mjs stills <outDir> <t1,t2,...>      single frames, no motion blur
//   node render/render.mjs frames <outDir> [from] [to] [stride] [offset]   motion-blurred PNG sequence
//   node render/render.mjs cues <outDir>                    event sheet for the soundtrack
// Pages are served straight from disk through request interception, so no server is needed.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPlaywright() {
  try { return await import('playwright'); } catch {
    const req = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'));
    return req('playwright');
  }
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };

const [mode = 'stills', outDir = 'out/stills', a, b] = process.argv.slice(2);
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', e => { console.error('[pageerror]', e.message); });
await page.route('http://reel.local/**', route => {
  const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
  route.fulfill({ status: 200, body: fs.readFileSync(file), headers: { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' } });
});
await page.goto('http://reel.local/index.html?render');
await page.waitForFunction(() => window.REEL_READY === true, null, { timeout: 60000 });
fs.mkdirSync(outDir, { recursive: true });
const shot = file => page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 }, type: 'png' });

if (mode === 'stills') {
  const times = (a || '0').split(',').map(Number);
  for (const t of times) {
    await page.evaluate(t => window.REEL.drawFrame(t), t);
    await shot(path.join(outDir, `t${t.toFixed(3).padStart(6, '0')}.png`));
  }
  console.log(`wrote ${times.length} stills to ${outDir}`);
} else if (mode === 'cues') {
  const cues = await page.evaluate(() => window.REEL.cues());
  fs.writeFileSync(path.join(outDir, 'cues.json'), JSON.stringify(cues, null, 1));
  console.log('wrote cues.json');
} else if (mode === 'frames') {
  const fps = await page.evaluate(() => window.REEL.FPS);
  const dur = await page.evaluate(() => window.REEL.DUR);
  const from = a ? parseInt(a, 10) : 0, to = b ? parseInt(b, 10) : Math.round(fps * dur) - 1;
  const stride = parseInt(process.argv[6] || '1', 10), offset = parseInt(process.argv[7] || '0', 10);
  const t0 = Date.now();
  for (let f = from + offset; f <= to; f += stride) {
    const file = path.join(outDir, `f${String(f).padStart(4, '0')}.png`);
    if (fs.existsSync(file) && process.env.RESUME) continue;
    const n = await page.evaluate(f => window.REEL.renderFrame(f), f);
    await shot(file);
    if ((f - from - offset) % (30 * stride) === 0 || f + stride > to) {
      const el = (Date.now() - t0) / 1000, done = Math.floor((f - from - offset) / stride) + 1;
      console.log(`frame ${f}/${to}  samples ${n}  ${(el / done).toFixed(2)}s/frame  eta ${((to - f) * el / done).toFixed(0)}s`);
    }
  }
}
await browser.close();
