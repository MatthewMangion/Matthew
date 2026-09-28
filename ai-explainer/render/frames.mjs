// Frame-accurate offline render: N parallel headless Chromium pages, each renders every Nth frame.
//   node render/frames.mjs [--workers 4] [--from 0] [--to 4860] [--fps 60]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cpus } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const outDir = resolve(root, arg('out', 'out/frames'));
const workers = +arg('workers', Math.max(2, cpus().length));
const skipExisting = process.argv.includes('--resume');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const url = pathToFileURL(resolve(root, 'index.html')).href + '?render=1';
const probe = await browser.newPage();
await probe.goto(url); await probe.evaluate(() => window.ready);
const { duration, fps } = await probe.evaluate(() => ({ duration: window.DURATION, fps: window.FPS }));
await probe.close();
const FPS = +arg('fps', fps);
const total = Math.round(duration * FPS);
const from = +arg('from', 0), to = Math.min(total, +arg('to', total));
console.log(`rendering frames ${from}..${to - 1} of ${total} @${FPS}fps with ${workers} workers -> ${outDir}`);

let done = 0; const t0 = Date.now();
async function worker(w) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(url); await page.evaluate(() => window.ready);
  const cdp = await page.context().newCDPSession(page);
  for (let f = from + w; f < to; f += workers) {
    const file = resolve(outDir, `f${String(f).padStart(5, '0')}.png`);
    if (skipExisting && existsSync(file)) { done++; continue; }
    await page.evaluate(([t, fr]) => window.renderFrame(t, fr), [f / FPS, f]);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 } });
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    done++;
    if (done % 120 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`${done}/${to - from} frames  ${(done / el).toFixed(1)} fps  eta ${((to - from - done) / (done / el)).toFixed(0)}s`);
    }
  }
  await page.close();
}
await Promise.all(Array.from({ length: workers }, (_, w) => worker(w)));
await browser.close();
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
