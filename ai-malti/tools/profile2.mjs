// profile2.mjs — where does a production frame spend its time?
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
let sink = null, bytes = 0;
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const b = Buffer.concat(chunks);
      bytes += b.length;
      if (sink) { const ok = sink.stdin.write(b); if (!ok) return sink.stdin.once('drain', () => { res.writeHead(200); res.end(); }); }
      res.writeHead(200); res.end();
    });
    return;
  }
  const p = path.join(ROOT, decodeURIComponent(url));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.log('err', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await page.evaluate(() => window.READY);
const T = parseFloat(process.argv[2] || '20');
const r = await page.evaluate(async (T) => {
  const gl = document.getElementById('out').getContext('webgl2');
  const res = {};
  const add = (k, v) => (res[k] = (res[k] || 0) + v);
  const f0 = Math.round(T * 30);
  for (let i = 0; i < 6; i++) {
    const f = f0 + i;
    let a = performance.now();
    const t = f / 30;
    ENGINE.drawScene(t);
    ENGINE.sceneCanvas().getContext('2d').getImageData(0, 0, 1, 1);
    add('drawScene(1 sub)', performance.now() - a);
    a = performance.now();
    const n = ENGINE.renderFrame(f);
    gl.finish();
    add(`renderFrame(n=${n})`, performance.now() - a);
    a = performance.now();
    ENGINE.renderFrame(f, 1);
    gl.finish();
    add('renderFrame(n=1)', performance.now() - a);
    a = performance.now();
    const px = ENGINE.readPixels();
    add('readPixels', performance.now() - a);
    a = performance.now();
    await fetch('/frame/0', { method: 'POST', body: px });
    add('POST 8MB', performance.now() - a);
  }
  for (const k in res) res[k] = (res[k] / 6).toFixed(1) + ' ms';
  return res;
}, T);
console.log('t=' + T, JSON.stringify(r, null, 1));
await browser.close();
// ffmpeg encode throughput for raw frames
const raw = Buffer.alloc(1080 * 1920 * 4, 90);
for (const args of [['-c:v', 'libx264rgb', '-preset', 'ultrafast', '-qp', '0'], ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '8', '-pix_fmt', 'yuv444p']]) {
  const t0 = Date.now();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1080x1920', '-r', '30', '-i', '-', ...args, '/tmp/claude-0/-home-user-Matthew/4dbca0b4-731b-564a-be9d-d98e1f54eb20/scratchpad/_p.mkv']);
  for (let i = 0; i < 30; i++) { for (let j = 0; j < raw.length; j += 4096) raw[j] = (i * 7 + j) & 255; if (!ff.stdin.write(raw)) await new Promise((r) => ff.stdin.once('drain', r)); }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(args.join(' '), ((Date.now() - t0) / 30).toFixed(1), 'ms/frame');
}
server.close();
