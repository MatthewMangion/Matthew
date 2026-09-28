// Render individual frames for review:  node render/stills.mjs out/dir 0.5 1.25 3.0 ...
// Add --sheet to also build a labelled contact sheet (requires python3 + Pillow).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const sheet = args.includes('--sheet');
const [outDir, ...rest] = args.filter((a) => a !== '--sheet');
let times = rest.map(Number).filter((n) => !Number.isNaN(n));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(pathToFileURL(resolve(root, 'index.html')).href + '?render=1');
await page.evaluate(() => window.ready);
const files = [];
for (const t of times) {
  await page.evaluate((t) => window.renderFrame(t), t);
  const f = resolve(outDir, `t${t.toFixed(2).padStart(6, '0')}.png`);
  await page.locator('#c').screenshot({ path: f });
  files.push(f);
}
await browser.close();
if (sheet) {
  execFileSync('python3', [resolve(root, 'render/sheet.py'), resolve(outDir, 'sheet.jpg'), ...files], { stdio: 'inherit' });
}
console.log(files.length, 'frames ->', outDir);
