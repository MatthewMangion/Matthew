// render.mjs — parallel deterministic rendering with headless Chromium
//
//  Stills (review):   node tools/render.mjs --frames 0,0.5,1.2 --out <dir>          (PNG screenshots)
//  Segments (master): node tools/render.mjs --from 0 --to 4 --name hook --workers 3   (raw RGBA → ffmpeg, lossless)
//
// Segment mode streams gl.readPixels() output from the page over localhost HTTP straight into one ffmpeg
// per worker (each worker owns a contiguous frame range, so order is preserved) — no image encoding in the loop.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const k = argv[i].slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[k] = v;
  }
}
const FPS = 30, W = 1080, H = 1920;
const YUV_BYTES = W * H * 1.5;
const SEG_DIR = path.resolve(args.segdir ?? '/tmp/claude-0/-home-user-Matthew/4dbca0b4-731b-564a-be9d-d98e1f54eb20/scratchpad/segs');
const workers = parseInt(args.workers ?? 3);
const samples = args.samples ? parseInt(args.samples) : 0;
const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas', '--disable-gpu-vsync', '--disable-frame-rate-limit', '--font-render-hinting=none'];

const sinks = {}; // worker id → ffmpeg process
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && url.startsWith('/frame/')) {
    const k = url.split('/')[2];
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (buf.length !== W * H * 4) console.log('bad frame size', buf.length);
      const ok = sinks[k].stdin.write(buf);
      const done = () => { res.writeHead(200); res.end('ok'); };
      ok ? done() : sinks[k].stdin.once('drain', done);
    });
    return;
  }
  const p = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
// Minimal WebSocket endpoint: each binary message is one yuv420p frame for worker k (?k=).
// The ack is sent only after ffmpeg accepted the bytes, so memory stays bounded.
server.on('upgrade', (req, sock) => {
  const k = new URL(req.url, 'http://x').searchParams.get('k');
  const acc = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acc}\r\n\r\n`);
  sock.setNoDelay(true);
  let chunks = [], have = 0, need = 0;
  const ack = () => sock.write(Buffer.from([0x82, 2, 0x6f, 0x6b]));
  const take = (n) => { // concat exactly n bytes off the front
    const out = Buffer.allocUnsafe(n);
    let o = 0;
    while (o < n) {
      const c = chunks[0];
      const m = Math.min(c.length, n - o);
      c.copy(out, o, 0, m);
      o += m;
      if (m === c.length) chunks.shift(); else chunks[0] = c.subarray(m);
    }
    have -= n;
    return out;
  };
  sock.on('data', (d) => {
    chunks.push(d);
    have += d.length;
    while (true) {
      if (!need) {
        if (have < 14 && have < 2) return;
        const head = chunks[0].length >= 14 ? chunks[0] : Buffer.concat(chunks).subarray(0, 14);
        let len = head[1] & 127, off = 2;
        if (len === 126) { if (have < 4) return; len = head.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (have < 10) return; len = Number(head.readBigUInt64BE(2)); off = 10; }
        const masked = head[1] & 128 ? 4 : 0;
        need = off + masked + len;
        sock.__hdr = { op: head[0] & 15, fin: head[0] & 128, off, masked, len };
      }
      if (have < need) return;
      const frame = take(need);
      const { op, fin, off, masked, len } = sock.__hdr;
      need = 0;
      const payload = frame.subarray(off + masked, off + masked + len);
      if (masked) {
        const mk = frame.subarray(off, off + 4);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mk[i & 3];
      }
      if (op === 8) { sock.end(); return; }
      if (op === 2 || op === 0) {
        // reassemble fragmented messages (browsers split large binary messages)
        (sock.__parts = sock.__parts || []).push(payload);
        if (!fin) continue;
        const msg = sock.__parts.length === 1 ? sock.__parts[0] : Buffer.concat(sock.__parts);
        sock.__parts = [];
        if (msg.length !== YUV_BYTES) console.log('bad frame size', msg.length);
        const ok = sinks[k].stdin.write(msg);
        ok ? ack() : sinks[k].stdin.once('drain', ack);
      }
    }
  });
  sock.on('error', () => {});
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

async function openPage(k) {
  const browser = await chromium.launch({ args: FLAGS });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[w${k}]`, m.text()); });
  page.on('pageerror', (e) => console.log(`[w${k}] pageerror`, e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html${args.debug ? '?debug' : ''}`);
  const info = await page.evaluate(() => window.READY);
  if (k === 0) console.log('engine', JSON.stringify(info));
  return { browser, page };
}

const t0 = Date.now();
if (args.frames) {
  // ── stills mode ──
  const outDir = path.resolve(args.out ?? path.join(SEG_DIR, '../stills'));
  fs.mkdirSync(outDir, { recursive: true });
  const frames = String(args.frames).split(',').map((s) => Math.round(parseFloat(s) * FPS));
  let done = 0;
  await Promise.all(
    Array.from({ length: Math.min(workers, frames.length) }, async (_, k) => {
      const { browser, page } = await openPage(k);
      const cdp = await page.context().newCDPSession(page);
      for (const f of frames.filter((_, i) => i % workers === k)) {
        await page.evaluate(([f, s]) => ENGINE.renderFrame(f, s || undefined), [f, samples]);
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
        fs.writeFileSync(path.join(outDir, `f_${String(f).padStart(5, '0')}.png`), Buffer.from(shot.data, 'base64'));
        done++;
      }
      await browser.close();
    })
  );
  console.log(`${done} stills in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${outDir}`);
} else {
  // ── segment mode ──
  const from = Math.round(parseFloat(args.from ?? 0) * FPS);
  const to = Math.round(parseFloat(args.to ?? 64) * FPS);
  const name = args.name ?? `seg_${from}_${to}`;
  fs.mkdirSync(SEG_DIR, { recursive: true });
  const total = to - from;
  const per = Math.ceil(total / workers);
  let done = 0;
  const parts = [];
  await Promise.all(
    Array.from({ length: workers }, async (_, k) => {
      const a = from + k * per, b = Math.min(to, a + per);
      if (a >= b) return;
      const file = path.join(SEG_DIR, `${name}__${String(a).padStart(5, '0')}.mkv`);
      parts.push([a, file]);
      sinks[k] = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-qp', '0', '-pix_fmt', 'yuv420p',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', file], { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise((r) => sinks[k].on('close', r));
      const { browser, page } = await openPage(k);
      await page.evaluate(async ([port, k]) => {
        ENGINE.setPresent(false);
        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?k=${k}`);
        ws.binaryType = 'arraybuffer';
        await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
        window.__send = (buf) => new Promise((res) => { ws.onmessage = () => res(); ws.send(buf); });
      }, [port, k]);
      for (let f = a; f < b; f++) {
        await page.evaluate(async ([f, s]) => {
          ENGINE.renderFrame(f, s || undefined);
          await window.__send(ENGINE.readYUV());
        }, [f, samples]);
        done++;
        if (done % 15 === 0 || done === total) {
          const el = (Date.now() - t0) / 1000;
          process.stdout.write(`\r[${name}] ${done}/${total}  ${el.toFixed(0)}s  (~${((el / done) * (total - done)).toFixed(0)}s left)   `);
        }
      }
      await browser.close();
      sinks[k].stdin.end();
      await closed;
    })
  );
  parts.sort((x, y) => x[0] - y[0]);
  fs.writeFileSync(path.join(SEG_DIR, `${name}.list`), parts.map(([, f]) => `file '${f}'`).join('\n') + '\n');
  console.log(`\n[${name}] ${total} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
server.close();
