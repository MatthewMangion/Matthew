#!/usr/bin/env node
/* Mesura reel renderer.
   Renders a reel frame-by-frame in headless Chromium (parallel pages), with temporal
   super-sampling for motion blur, into lossless segments, then encodes a delivery MP4.

   node tools/render.cjs --reel flagship                      → renders/mesura-flagship.mp4
   node tools/render.cjs --reel flagship --stills 1,2.5,4     → PNG stills
   node tools/render.cjs --reel flagship --sheet 0.5          → contact sheet every 0.5 s
   node tools/render.cjs --reel flagship --cues               → audio cue sheet JSON
   Options: --fps 60 --workers 4 --samples N --from s --to s --out file --audio file.wav --crf 16 */
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  if (i < 0) return d;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const FFMPEG = process.env.FFMPEG || (() => {
  try { return execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim(); }
  catch (e) { return 'ffmpeg'; }
})();

const reel = opt('reel', 'flagship');
const fps = +opt('fps', 60);
const workers = +opt('workers', 4);
const samplesOverride = opt('samples', null);
const W = 1080, H = 1920;

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.m4a': 'audio/mp4' };
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
    fs.readFile(p, (e, d) => {
      if (e) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream');
      res.end(d);
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/studio.html?render=1`);
  await page.evaluate(() => window.__ready);
  const cdp = await page.context().newCDPSession(page);
  return { page, cdp };
}

async function capture(w, f, samples) {
  const n = await w.page.evaluate(([id, f, fps, s]) => R.frame(id, f, s ? { fps, samples: +s } : { fps }), [reel, f, fps, samples]);
  const shot = await w.cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
  return { buf: Buffer.from(shot.data, 'base64'), n };
}

function ff(argv, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, argv, { stdio: [opts.stdin ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg failed: ' + err.slice(-2000)))));
    if (opts.onSpawn) opts.onSpawn(p);
  });
}

async function main() {
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none', '--disable-lcd-text'] });
  try {
    const first = await openPage(browser, port);
    const meta = await first.page.evaluate((id) => ({ duration: R.reels[id].duration, title: R.reels[id].title }), reel);

    if (opt('cues', false)) {
      const cues = await first.page.evaluate((id) => R.cues(id), reel);
      const out = typeof opt('cues') === 'string' ? opt('cues') : path.join(ROOT, 'audio', reel + '.cues.json');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(cues, null, 1));
      console.log('cues →', out, cues.cues.length, 'events');
      return;
    }

    const stills = opt('stills', null);
    const sheet = opt('sheet', null);
    if (stills || sheet) {
      let times;
      if (stills) times = String(stills).split(',').map(Number);
      else {
        const step = +sheet;
        const a = +opt('from', 0), b = +opt('to', meta.duration);
        times = [];
        for (let t = a; t < b - 1e-6; t += step) times.push(+t.toFixed(4));
      }
      const outdir = opt('outdir', path.join(ROOT, '.stills', reel));
      fs.mkdirSync(outdir, { recursive: true });
      const pool = [first];
      for (let k = 1; k < Math.min(workers, times.length); k++) pool.push(await openPage(browser, port));
      const files = new Array(times.length);
      let next = 0;
      await Promise.all(pool.map(async (w) => {
        while (next < times.length) {
          const i = next++;
          const f = Math.round(times[i] * fps);
          const { buf } = await capture(w, f, samplesOverride);
          const file = path.join(outdir, `${reel}_${times[i].toFixed(2).padStart(6, '0')}.png`);
          fs.writeFileSync(file, buf);
          files[i] = file;
        }
      }));
      if (sheet || opt('sheetout', false)) {
        const out = opt('out', path.join(outdir, `sheet_${reel}.png`));
        execFileSync('python3', [path.join(__dirname, 'sheet.py'), out, String(opt('cols', 6)), String(opt('thumb', 270)), ...files]);
        console.log('sheet →', out);
      } else files.forEach((f) => console.log(f));
      return;
    }

    // ---------- full render
    const total = Math.round(meta.duration * fps);
    const fromF = Math.round(+opt('from', 0) * fps);
    const toF = Math.min(total, Math.round(+opt('to', meta.duration) * fps));
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mesura-'));
    const pool = [first];
    for (let k = 1; k < workers; k++) pool.push(await openPage(browser, port));
    const chunk = Math.ceil((toF - fromF) / pool.length);
    let done = 0, sampleSum = 0;
    const t0 = Date.now();
    const segs = [];
    await Promise.all(pool.map(async (w, k) => {
      const a = fromF + k * chunk, b = Math.min(toF, a + chunk);
      if (a >= b) return;
      const seg = path.join(tmp, `seg_${String(k).padStart(2, '0')}.mkv`);
      segs[k] = seg;
      let proc;
      const fin = ff(['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-qp', '0', seg], { stdin: true, onSpawn: (p) => (proc = p) });
      for (let f = a; f < b; f++) {
        const { buf, n } = await capture(w, f, samplesOverride);
        sampleSum += n;
        if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once('drain', r));
        done++;
        if (done % 60 === 0) {
          const el = (Date.now() - t0) / 1000;
          process.stdout.write(`\r${done}/${toF - fromF} frames · ${(done / el).toFixed(1)} fps · avg ${(sampleSum / done).toFixed(1)} samples   `);
        }
      }
      proc.stdin.end();
      await fin;
    }));
    console.log(`\nrendered ${done} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    const list = path.join(tmp, 'list.txt');
    fs.writeFileSync(list, segs.filter(Boolean).map((s) => `file '${s}'`).join('\n'));
    const out = path.resolve(opt('out', path.join(ROOT, 'renders', `mesura-${reel}.mp4`)));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const audio = opt('audio', null);
    const argv = ['-y', '-f', 'concat', '-safe', '0', '-i', list];
    if (audio) argv.push('-ss', String(+opt('from', 0)), '-i', path.resolve(audio));
    argv.push(
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p',
      '-c:v', 'libx264', '-preset', opt('preset', 'slow'), '-crf', String(opt('crf', 16)), '-tune', 'animation',
      '-profile:v', 'high', '-level', '4.2', '-g', String(fps), '-bf', '2',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
      '-r', String(fps), '-movflags', '+faststart'
    );
    if (opt('maxrate', null)) argv.push('-maxrate', opt('maxrate'), '-bufsize', opt('bufsize', '12M'));
    if (audio) argv.push('-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest');
    argv.push(out);
    await ff(argv);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('→', out, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
  } finally {
    await browser.close();
    server.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
