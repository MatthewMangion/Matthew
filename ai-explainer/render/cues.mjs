// Export the SFX cue sheet + timeline metadata the audio score is built from.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(resolve(root, 'out'), { recursive: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve(root, 'index.html')).href + '?render=1');
await page.evaluate(() => window.ready);
const data = await page.evaluate(() => ({ duration: window.DURATION, fps: window.FPS, chapters: window.CHAPTERS, cues: window.CUES.slice().sort((a, b) => a.t - b.t) }));
writeFileSync(resolve(root, 'out/cues.json'), JSON.stringify(data, null, 1));
await browser.close();
const types = {}; data.cues.forEach((c) => (types[c.type] = (types[c.type] || 0) + 1));
console.log(data.cues.length, 'cues;', Object.keys(types).length, 'types');
console.log(Object.entries(types).map(([k, v]) => `${k}:${v}`).join(' '));
