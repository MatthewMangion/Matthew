// Render the designed cover/thumbnail: out/cover.png (9:16) + out/cover_3x4.jpg (profile-grid crop).
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(resolve(root, 'index.html')).href + '?render=1');
await page.evaluate(() => window.ready);
await page.evaluate(() => window.renderCover());
await page.locator('#c').screenshot({ path: resolve(root, 'out/cover.png') });
await browser.close();
execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open('${resolve(root, 'out/cover.png')}').convert('RGB')
im.crop((0, 240, 1080, 1680)).save('${resolve(root, 'out/cover_3x4.jpg')}', quality=92)
im.save('${resolve(root, 'out/cover.jpg')}', quality=92)
`]);
console.log('cover -> out/cover.png, out/cover.jpg, out/cover_3x4.jpg');
