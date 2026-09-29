/* Prototype chrome shared by the three Mesura concepts.
   Reads #proto-config (JSON) from the page:
     { concept, name, intro, notes: [{ target, title, body, refs? }] }
   Adds a concept switcher, and a design-notes mode that pins numbered
   annotations to page elements. Add ?clean or #clean to hide all of it. */
(() => {
  'use strict';
  const cfgNode = document.getElementById('proto-config');
  if (!cfgNode) return;
  if (/\bclean\b/.test(location.search + location.hash)) return;
  const cfg = JSON.parse(cfgNode.textContent);
  const notes = cfg.notes || [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const CONCEPTS = [
    { id: 'A', name: 'Mission', href: 'a-mission.html' },
    { id: 'B', name: 'Standard', href: 'b-standard.html' },
    { id: 'C', name: 'Front Door', href: 'c-front-door.html' },
  ];
  const ICON = {
    grid: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    min: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 8h8"/></svg>',
  };

  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v; // static icon strings only
      else n.setAttribute(k, v === true ? '' : v);
    }
    kids.forEach((kid) => kid != null && n.append(kid));
    return n;
  };

  /* ---------- toolbar ---------- */
  const bar = el('div', { class: 'proto-bar', role: 'region', 'aria-label': 'Prototype controls' });
  const label = el('p', { class: 'proto-label' },
    el('strong', { text: `Concept ${cfg.concept}` }), ` · ${cfg.name}`);
  const nav = el('nav', { class: 'proto-switch', 'aria-label': 'Switch concept' });
  CONCEPTS.forEach((c) => nav.append(el('a', {
    href: c.href,
    text: c.id,
    title: `Concept ${c.id}: ${c.name}`,
    'aria-label': `Concept ${c.id}: ${c.name}`,
    'aria-current': c.id === cfg.concept ? 'page' : null,
  })));
  const notesBtn = el('button', {
    type: 'button', class: 'proto-notes-btn', 'aria-pressed': 'false', 'aria-controls': 'proto-drawer',
    'aria-label': `Design notes (${notes.length})`,
  }, el('span', { text: 'Design notes', 'aria-hidden': 'true' }), el('b', { text: String(notes.length), 'aria-hidden': 'true' }));
  const hub = el('a', { class: 'proto-hub', href: 'hub.html', title: 'All concepts', 'aria-label': 'All concepts', html: ICON.grid });
  const hide = el('button', { type: 'button', class: 'proto-hide', 'aria-label': 'Hide prototype controls', title: 'Hide', html: ICON.min });
  bar.append(label, nav, notesBtn, hub, hide);
  const restore = el('button', {
    type: 'button', class: 'proto-restore', hidden: true,
    'aria-label': 'Show prototype controls', title: 'Show prototype controls', text: cfg.concept,
  });

  /* ---------- drawer ---------- */
  const drawer = el('aside', { id: 'proto-drawer', class: 'proto-drawer', 'aria-label': 'Design notes', hidden: true });
  const close = el('button', { type: 'button', class: 'proto-close', 'aria-label': 'Close design notes', html: ICON.close });
  const list = el('ol', { class: 'proto-list' });
  const items = notes.map((n, i) => {
    const num = el('button', { type: 'button', class: 'proto-num', text: String(i + 1), 'aria-label': `Show note ${i + 1} on the page` });
    const li = el('li', {}, num, el('div', {},
      el('h3', { text: n.title }),
      el('p', { text: n.body }),
      n.refs ? el('p', { class: 'proto-refs', text: `Borrowed from ${n.refs.join(' + ')}` }) : null));
    li.addEventListener('click', () => activate(i, true));
    list.append(li);
    return li;
  });
  drawer.append(
    el('header', { class: 'proto-drawer-head' },
      el('div', {}, el('p', { class: 'proto-eyebrow', text: `Concept ${cfg.concept} · ${cfg.name}` }), el('h2', { text: 'Design notes' })),
      close),
    el('div', { class: 'proto-body' },
      cfg.intro ? el('p', { class: 'proto-intro', text: cfg.intro }) : null,
      list,
      el('p', { class: 'proto-foot' }, 'Press ', el('kbd', { text: 'N' }), ' to toggle notes. All scores and benchmark figures on this page are illustrative.')),
  );

  /* ---------- pins ---------- */
  const layer = el('div', { class: 'proto-layer', 'aria-hidden': 'true' });
  const targets = notes.map((n) => document.querySelector(n.target));
  const boxes = notes.map(() => layer.appendChild(el('div', { class: 'proto-box' })));
  const pins = notes.map((_, i) => {
    const pin = layer.appendChild(el('button', { type: 'button', class: 'proto-pin', tabindex: '-1', text: String(i + 1) }));
    pin.addEventListener('click', () => { open(true); activate(i, false); });
    return pin;
  });

  let frame = 0;
  const place = () => {
    frame = 0;
    if (!document.documentElement.classList.contains('proto-notes-on')) return;
    const root = document.documentElement;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const w = root.clientWidth;
    layer.style.height = `${root.scrollHeight}px`;
    targets.forEach((t, i) => {
      const r = t && t.getBoundingClientRect();
      const visible = r && (r.width || r.height);
      pins[i].hidden = !visible;
      boxes[i].hidden = !visible;
      if (!visible) return;
      const x = Math.min(Math.max(r.left + sx - 12, sx + 6), sx + w - 30);
      const y = Math.max(r.top + sy - 12, 6);
      pins[i].style.translate = `${x}px ${y}px`;
      boxes[i].style.translate = `${r.left + sx - 4}px ${r.top + sy - 4}px`;
      boxes[i].style.width = `${r.width + 8}px`;
      boxes[i].style.height = `${r.height + 8}px`;
    });
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(place); };

  let active = -1;
  function activate(i, scroll) {
    active = i;
    pins.forEach((p, j) => p.classList.toggle('is-active', j === i));
    boxes.forEach((b, j) => b.classList.toggle('is-active', j === i));
    items.forEach((li, j) => li.classList.toggle('is-active', j === i));
    items[i].scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
    if (scroll && targets[i]) targets[i].scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  function open(on) {
    document.documentElement.classList.toggle('proto-notes-on', on);
    drawer.hidden = !on;
    notesBtn.setAttribute('aria-pressed', String(on));
    if (on) { schedule(); } else { active = -1; }
  }

  notesBtn.addEventListener('click', () => {
    const on = drawer.hidden;
    open(on);
    if (on) close.focus();
  });
  close.addEventListener('click', () => { open(false); notesBtn.focus(); });
  hide.addEventListener('click', () => { open(false); bar.hidden = true; restore.hidden = false; restore.focus(); });
  restore.addEventListener('click', () => { bar.hidden = false; restore.hidden = true; notesBtn.focus(); });
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'n' || e.key === 'N') { open(drawer.hidden); }
    else if (e.key === 'Escape' && !drawer.hidden) { open(false); notesBtn.focus(); }
  });

  addEventListener('resize', schedule, { passive: true });
  document.addEventListener('toggle', schedule, true);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  if (document.fonts) document.fonts.ready.then(schedule);

  document.body.append(layer, bar, restore, drawer);
  if (/\bnotes\b/.test(location.search + location.hash)) open(true);
})();
