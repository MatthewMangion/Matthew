// Builds the Mesura prototypes into self-contained, single-file HTML pages.
//
//   node mesura/src/build.mjs
//
// Each source page references its CSS, JS and fonts as separate files so it
// stays readable. The build inlines everything marked `data-inline`, turns
// font url()s into base64 data URIs and rewrites cross-page links, so every
// built page opens on its own (file://, GitHub Pages, a chat preview) with
// zero third-party requests.

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SRC, '..', '..');

const pages = [
  { src: 'a-mission.html', out: 'mesura/a-mission.html', hub: '../index.html' },
  { src: 'b-standard.html', out: 'mesura/b-standard.html', hub: '../index.html' },
  { src: 'c-front-door.html', out: 'mesura/c-front-door.html', hub: '../index.html' },
  { src: 'hub.html', out: 'index.html', conceptDir: 'mesura/' },
];

const MIME = { woff2: 'font/woff2', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' };
const dataUri = (file) => {
  const ext = file.split('.').pop().toLowerCase();
  return `data:${MIME[ext]};base64,${readFileSync(file).toString('base64')}`;
};

const inlineCss = (href) => {
  const file = join(SRC, href);
  return readFileSync(file, 'utf8').replace(
    /url\((['"]?)([^)'"]+\.woff2)\1\)/g,
    (_, _q, rel) => `url(${dataUri(join(dirname(file), rel))})`,
  );
};

const only = process.argv.slice(2);
for (const page of pages) {
  if (only.length && !only.some((o) => page.src.startsWith(o))) continue;
  let html = readFileSync(join(SRC, page.src), 'utf8');

  html = html.replace(
    /<link rel="stylesheet" href="([^"]+)" data-inline>/g,
    (_, href) => `<style>${inlineCss(href)}</style>`,
  );
  html = html.replace(
    /<script src="([^"]+)" data-inline><\/script>/g,
    (_, src) => `<script>${readFileSync(join(SRC, src), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`,
  );
  html = html.replace(
    /src="([^"]+\.(?:jpg|jpeg|png|webp|svg))" data-inline/g,
    (_, src) => `src="${dataUri(join(SRC, src))}"`,
  );

  if (page.hub) html = html.replaceAll('hub.html', page.hub);
  if (page.conceptDir) {
    html = html.replace(/href="((?:a-mission|b-standard|c-front-door)\.html)/g, `href="${page.conceptDir}$1`);
    // Stamp measured page weights, e.g. {{kb:a-mission}}, from the built files.
    html = html.replace(/\{\{kb:([a-z-]+)\}\}/g, (_, name) =>
      Math.round(statSync(join(ROOT, page.conceptDir, `${name}.html`)).size / 1024).toString());
  }

  const out = join(ROOT, page.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`${page.out.padEnd(28)} ${(Buffer.byteLength(html) / 1024).toFixed(1).padStart(7)} KB`);
}
