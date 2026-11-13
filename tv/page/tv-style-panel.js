/* ---------- the Style panel ----------
   Sections down the left (the same groups as the wall's Settings → Look & feel), options as tiles with small live
   previews on the right. On the remote: ▲▼ pick a section, ▶ or OK goes into it, the arrows move between tiles,
   OK picks one, Back goes back out (and closes). A phone or keyboard can tap and use the arrow keys.
   The card and each section's tiles are built once and kept; a press only moves the focus and the check marks,
   so nothing replays or flashes. While it's open the app row keeps its colors; they're sent once on close. */
var PANEL = { open: false, zone: 'nav', s: 0, part: 'bg', any: false, built: {}, upd: '' };
var GEARS = [['corner', 'Small, bottom corner'], ['end', 'End of the app row'], ['start', 'Start of the app row']];
var TV_SECTIONS = null;
function tvSections() {
  if (TV_SECTIONS) return TV_SECTIONS;
  const H = HBLook, by = id => H.SECTIONS.find(x => x.id === id), g = (key, name, opts, extra) => Object.assign({ key, name, opts }, extra || {});
  const host = {
    quick: [g('preset', 'Classic presets', PRESETS.map((p, i) => [i, p[0]]))],
    colors: [g('palette', 'Color scheme', PALETTES.map((p, i) => [i, p[0]])), g('cycle', 'Live color changing (off unless you turn it on)', CYCLES.map((c, i) => [i, c[0]]))],
    cards: [g('glow', 'Screen glow', GLOWS.map((n, i) => [i, n]))],
    motion: [g('fx', 'Screen effects (on or off)', EFFECTS.map(e => [e[0], e[1]]), { multi: true })],
    holidays: [g('wall', 'Holiday themes from the wall', [[1, 'Follow the wall'], [0, 'Keep my look']])]
  };
  TV_SECTIONS = H.SECTIONS.map(s => {
    const groups = s.groups.slice();
    if (s.id === 'quick') groups.push(...host.quick);
    if (s.id === 'colors') { groups.push(g('swatch', 'Color', [], { swatch: true }), ...host.colors); }
    if (s.id === 'cards') groups.push(...host.cards);
    if (s.id === 'motion') groups.splice(2, 0, ...host.motion);
    if (s.id === 'holidays') groups.push(...host.holidays);
    return { id: s.id, name: s.name, hint: s.hint, icon: H.ICONS[s.id] || '', groups };
  });
  TV_SECTIONS.push({ id: 'sound', name: 'Screen & sound', hint: 'Sounds, status strip, startup, screensaver', icon: H.ICONS.sound, groups: H.SCREEN.slice() });
  const app = [g('perf', 'Performance mode (keeps the TV quick)', [[1, 'On'], [0, 'Off']])];
  if (HB_APP && typeof HB_APP.place === 'function') app.push(g('gear', 'Style & Settings buttons', GEARS));
  const acts = [['reset', 'Reset to recommended']];
  if (HB_APP && typeof HB_APP.pair === 'function') acts.push(['pair', 'Change the Home Base code']);
  if (HB_APP && typeof HB_APP.update === 'function') acts.push(['update', 'Update Home Base TV']);
  app.push(g('act', 'Actions', acts));
  TV_SECTIONS.push({ id: 'app', name: 'App & updates', hint: 'Performance, buttons, reset, updates', icon: H.ICONS.screen, groups: app });
  return TV_SECTIONS;
}
/* What's chosen right now for a setting (to put the check mark on the right tile). */
function panelCur(k) {
  const s = styLoad(), L = s.hbx;
  if (k === 'preset' || k === 'palette' || k === 'cycle' || k === 'glow') return s[k];
  if (k === 'wall' || k === 'perf') return s[k] ? 1 : 0;
  if (k === 'gear') return s.gear || 'corner';
  if (k === 'part') return PANEL.part;
  if (k === 'swatch') return (L.colors || {})[PANEL.part] || '';
  return HBLook.cur.call(null, k) !== undefined && L ? (k === 'quick' ? L.quick : L[k]) : '';
}
function panelIsSel(k, v) {
  if (k === 'fx') return !!styLoad().fx[v];
  if (k === 'act') return false;
  const c = panelCur(k); return String(c).toUpperCase() === String(v).toUpperCase();
}
/* Each tile's little picture. Ones from the shared look come from HBLook (built once, cached). */
function tilePreview(k, v) {
  const H = HBLook;
  if (H.LISTS[k] || k === 'quick' || k === 'part' || k === 'fun') return H.preview(k, v);
  if (k === 'palette') { const p = PALETTES[v], cols = p[1] ? p.slice(1) : ['var(--accent)', 'var(--gold)']; return `<div class="hbx-pv"><div class="pv-stripes">${cols.map(c => `<i style="background:${c}"></i>`).join('')}</div></div>`; }
  if (k === 'preset') { const p = PRESETS[v], pal = PALETTES[p[1]], cols = pal[1] ? pal.slice(1, 4) : ['var(--accent)', 'var(--gold)']; return `<div class="hbx-pv"><div class="pv-stripes">${cols.map(c => `<i style="background:${c}"></i>`).join('')}</div></div>`; }
  if (k === 'cycle') return `<div class="hbx-pv"><i class="pv-cyc" style="animation-duration:${v ? [0, 16, 8, 4, 6][v] : 0}s"></i></div>`;
  if (k === 'glow') return `<div class="hbx-pv"><span class="pv-glow g${v}">8:45</span></div>`;
  if (k === 'fx') return `<div class="hbx-pv"><span class="pv-fx sm">${esc(EFFECTS.find(e => e[0] === v)[1])}</span></div>`;
  if (k === 'swatch') return H.preview('swatch', v);
  if (k === 'wall') return `<div class="hbx-pv"><span class="pv-fx">${v ? '🎄 🎃 🎉' : '✦'}</span></div>`;
  if (k === 'perf') return `<div class="hbx-pv"><span class="pv-fx">${v ? '⚡ Quick' : '✨ Everything'}</span></div>`;
  if (k === 'gear') return `<div class="hbx-pv"><span class="pv-gear ${v}"><i></i><i></i><i></i><b></b></span></div>`;
  if (k === 'act') return `<div class="hbx-pv"><span class="pv-fx">${v === 'reset' ? '↺' : v === 'pair' ? '🔑' : '⬇'}</span></div>`;
  return '<div class="hbx-pv"></div>';
}
const COMPACT = new Set(['palette', 'preset', 'cycle', 'glow', 'fx', 'wall', 'perf', 'gear', 'act']);
const tileHtml = (k, v, label, cls) => `<div class="hbx-opt${cls ? ' ' + cls : ''}" data-k="${esc(k)}" data-v="${esc(v)}"><div class="hbx-pvw">${tilePreview(k, v)}</div><span class="hbx-ol">${esc(label)}</span><b class="hbx-ck">✓</b></div>`;
function swatchTiles() {
  const H = HBLook; let h = H.SWATCHES.map(c => tileHtml('swatch', c, c, 'sw')).join('');
  h += `<div class="hbx-opt sw act" data-k="any" data-v="1"><div class="hbx-pvw"><div class="hbx-pv"><i class="pv-sw" style="--sw:conic-gradient(red,yellow,lime,cyan,blue,magenta,red)"></i></div></div><span class="hbx-ol">Any color…</span></div>`;
  h += `<div class="hbx-opt sw act" data-k="partReset" data-v="1"><div class="hbx-pvw"><div class="hbx-pv"><span class="pv-fx">↺</span></div></div><span class="hbx-ol">Reset this part</span></div>`;
  h += `<div class="hbx-opt sw act" data-k="colorsReset" data-v="1"><div class="hbx-pvw"><div class="hbx-pv"><span class="pv-fx">↺↺</span></div></div><span class="hbx-ol">Reset all colors</span></div>`;
  return h;
}
function anyTiles() {
  let h = '';
  for (let l of [82, 68, 56, 44, 30]) for (let i = 0; i < 24; i++) { const c = HBLook.hsl(i * 15, 88, l).toUpperCase(); h += tileHtml('swatch', c, c, 'sw tiny'); }
  for (let l of [100, 85, 65, 45, 25, 10]) { const v = Math.round(l * 2.55).toString(16).padStart(2, '0'), c = ('#' + v + v + v).toUpperCase(); h += tileHtml('swatch', c, c, 'sw tiny'); }
  return h;
}
function groupHtml(sec, gi) {
  const gr = sec.groups[gi];
  const cp = COMPACT.has(gr.key);
  let body = gr.swatch ? swatchTiles() : gr.opts.map(([v, label]) => tileHtml(gr.key, v, label, cp ? 'cp' : '')).join('');
  const extra = gr.swatch ? `<div class="sty-any" hidden>${''}</div>` : '';
  return `<div class="sty-g" data-g="${gr.key}"><div class="sty-gh"><b>${esc(gr.name)}</b><span class="sty-gv"></span></div><div class="sty-grid${gr.swatch ? ' sw' : cp ? ' cp' : ''}">${body}</div>${extra}</div>`;
}
function panelSection(i) {
  /* Built the first time it's shown, then kept. */
  if (PANEL.built[i]) return PANEL.built[i];
  const sec = tvSections()[i], el = document.createElement('div');
  el.className = 'sty-sec'; el.dataset.s = i;
  el.innerHTML = `<div class="sty-sh"><b>${esc(sec.name)}</b><span>${esc(sec.hint || '')}</span></div>` + sec.groups.map((_, gi) => groupHtml(sec, gi)).join('');
  $('#sty .sty-pane').appendChild(el);
  PANEL.built[i] = el;
  panelMarks(el);
  return el;
}
/* Check marks and the "now: ..." line on each group; nothing is rebuilt. */
function panelMarks(scope) {
  const root = scope || $('#sty'); if (!root) return;
  root.querySelectorAll('.hbx-opt').forEach(t => t.classList.toggle('sel', panelIsSel(t.dataset.k, t.dataset.v)));
  root.querySelectorAll('.sty-g').forEach(g => {
    const k = g.dataset.g, v = g.querySelector('.sty-gv'); if (!v) return;
    let txt = '';
    if (k === 'swatch') { const p = HBLook.PARTS.find(x => x[0] === PANEL.part); const c = (styLoad().hbx.colors || {})[PANEL.part]; txt = `${p ? p[1] : ''}: ${c || 'from the color scheme'}`; }
    else if (k === 'fx') { const on = EFFECTS.filter(e => styLoad().fx[e[0]]).length, act = fxActive().length; txt = `${on} on${act < on ? ` · ${on - act} paused by Performance` : ''}`; }
    else if (k === 'act') txt = PANEL.upd || '';
    else { const sel = g.querySelector('.hbx-opt.sel .hbx-ol'); txt = sel ? sel.textContent : (k === 'quick' ? 'Custom' : ''); }
    if (v.textContent !== txt) v.textContent = txt;
  });
}
function panelOpen() {
  let p = $('#sty');
  if (!p) {
    p = document.createElement('div'); p.id = 'sty'; document.body.appendChild(p);
    const secs = tvSections();
    p.innerHTML = `<div class="sty-card"><div class="sty-h"><b>Style & settings</b><span>${MODE === 'style' ? 'Tap a tile, or use the arrow keys' : '▲▼ section · ▶ / OK in · OK picks · Back out'} · <em class="sty-ver">Page 13.6</em></span></div>
      <div class="sty-body"><nav class="sty-nav">${secs.map((s, i) => `<div class="sty-ni" data-s="${i}">${s.icon || ''}<b>${esc(s.name)}</b><span>${esc(s.hint || '')}</span></div>`).join('')}</nav><div class="sty-pane"></div></div></div>`;
    p.addEventListener('click', e => {
      const ni = e.target.closest('.sty-ni'); if (ni) { panelShow(+ni.dataset.s); PANEL.zone = 'nav'; panelFocus(); return; }
      const t = e.target.closest('.hbx-opt'); if (t) { PANEL.zone = 'grid'; panelFocus(t); panelPick(t); }
    });
  }
  PANEL.open = true; PANEL.zone = 'nav'; clearTimeout(PANEL.closeT); document.body.classList.remove('sty-closing'); document.body.classList.add('sty-open');
  panelShow(PANEL.s); panelFocus();
  try { HB_APP && typeof HB_APP.panel === 'function' && HB_APP.panel(true); } catch (e) {}
}
function panelClose() {
  if (MODE === 'style') return;   /* the style page is only the panel */
  PANEL.open = false; document.body.classList.add('sty-closing');
  clearTimeout(PANEL.closeT); PANEL.closeT = setTimeout(() => { if (!PANEL.open) document.body.classList.remove('sty-open', 'sty-closing'); }, 150);
  if (PANEL.tilesLater) { const t = PANEL.tilesLater; PANEL.tilesLater = null; setTimeout(() => sendTileTheme(...t), 350); }
  try { HB_APP && typeof HB_APP.panel === 'function' && HB_APP.panel(false); } catch (e) {}
}
function panelShow(i) {
  const n = tvSections().length; PANEL.s = (i + n) % n;
  const sec = panelSection(PANEL.s);
  Object.values(PANEL.built).forEach(el => { const on = el === sec; if (el.classList.contains('show') !== on) el.classList.toggle('show', on); });
  $('#sty').querySelectorAll('.sty-ni').forEach(ni => ni.classList.toggle('cur', +ni.dataset.s === PANEL.s));
  $('#sty .sty-pane').scrollTop = 0;
}
/* Moves the remote's focus: a nav line, or a tile in the section showing. */
function panelFocus(tile) {
  const box = $('#sty'); if (!box) return;
  box.querySelectorAll('.hbx-opt.on, .sty-ni.on').forEach(x => x.classList.remove('on'));
  if (PANEL.zone === 'nav') { const ni = box.querySelector(`.sty-ni[data-s="${PANEL.s}"]`); if (ni) { ni.classList.add('on'); ni.scrollIntoView({ block: 'nearest' }); } return; }
  const sec = PANEL.built[PANEL.s]; if (!sec) return;
  const t = tile || sec.querySelector('.hbx-opt.sel') || sec.querySelector('.hbx-opt');
  if (t) { t.classList.add('on'); t.scrollIntoView({ block: 'nearest' }); PANEL.tile = t; }
}
/* Arrow keys between tiles: the nearest tile in that direction. */
function panelMove(dir) {
  const sec = PANEL.built[PANEL.s], cur = PANEL.tile; if (!sec || !cur || !cur.isConnected) { panelFocus(); return true; }
  const tiles = [...sec.querySelectorAll('.hbx-opt')].filter(t => t.offsetParent !== null), a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bd = Infinity;
  tiles.forEach(t => {
    if (t === cur) return;
    const b = t.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const dx = bx - ax, dy = by - ay;
    const main = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy, side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    if (main <= 4) return;
    const d = main + side * (dir === 'up' || dir === 'down' ? 0.6 : 3);
    if (d < bd) { bd = d; best = t; }
  });
  if (best) { panelFocus(best); return true; }
  return false;
}
/* OK (or a tap) on a tile. */
function panelPick(t) {
  const s = styLoad(), k = t.dataset.k, raw = t.dataset.v, num = Number(raw), v = raw !== '' && !isNaN(num) && /^\d+$/.test(raw) ? num : raw;
  HBLook.press(t);
  const look = (key, val) => { s.hbx = HBLook.set(s.hbx, key, val); };
  if (HBLook.LISTS[k] || k === 'quick') look(k, v);
  else if (k === 'part') { PANEL.part = raw; panelMarks(PANEL.built[PANEL.s]); return; }
  else if (k === 'swatch') look('color', [PANEL.part, raw]);
  else if (k === 'any') { const sec = PANEL.built[PANEL.s], box = sec && sec.querySelector('.sty-any'); if (box) { if (!box.dataset.made) { box.innerHTML = `<div class="sty-gh"><b>Any color</b><span class="sty-gv">for ${esc((HBLook.PARTS.find(x => x[0] === PANEL.part) || [])[1] || '')}</span></div><div class="sty-grid any">${anyTiles()}</div>`; box.dataset.made = '1'; panelMarks(box); } box.hidden = !box.hidden; } return; }
  else if (k === 'partReset') look('color', [PANEL.part, '']);
  else if (k === 'colorsReset') look('colorsReset', 1);
  else if (k === 'preset') { s.preset = v; const p = PRESETS[v]; s.palette = p[1]; s.cycle = p[2]; s.glow = p[3]; s.fx = fxFromList(p[4]); }
  else if (k === 'palette' || k === 'cycle' || k === 'glow') s[k] = v;
  else if (k === 'fx') s.fx[raw] = !s.fx[raw];
  else if (k === 'wall') s.wall = !!v;
  else if (k === 'perf') s.perf = !!v;
  else if (k === 'gear') s.gear = raw;
  else if (k === 'act') {
    if (raw === 'reset') { const ts = s.ts, hx = HBLook.set(s.hbx, 'recommended', 1); STY = styDefault(); STY.ts = ts; STY.hbx = hx; }
    else if (raw === 'pair') { try { HB_APP.pair(); } catch (e) {} return; }
    else if (raw === 'update') { if (HB_APP && typeof HB_APP.update === 'function') { PANEL.upd = 'Checking…'; panelMarks(); try { HB_APP.update(); } catch (e) {} } else { PANEL.upd = ''; updHint(); } return; }
  }
  const colorsBefore = JSON.stringify(PANEL.lastColors || '');
  styApply(true);
  /* previews that show the colors are redrawn only when the colors changed */
  const now = JSON.stringify([styLoad().hbx.colors, styLoad().hbx.mset, D.look]);
  if (now !== colorsBefore) { PANEL.lastColors = now; HBLook.forgetColorPreviews(); document.querySelectorAll('#sty .hbx-opt[data-k="part"] .hbx-pvw, #sty .hbx-opt[data-k="motion"] .hbx-pvw, #sty .hbx-opt[data-k="mset"] .hbx-pvw').forEach(w => { const o = w.parentNode; w.innerHTML = tilePreview(o.dataset.k, o.dataset.v); }); }
  panelMarks();
}
/* The app tells the page how an update check went (newer TV app versions). */
window.hbUpdate = msg => { PANEL.upd = String(msg || ''); if (PANEL.open) panelMarks(); };
function updHint() {
  let t = $('#sty .sty-note'); const card = $('#sty .sty-card'); if (!card) return;
  if (!t) { t = document.createElement('div'); t.className = 'sty-note'; card.appendChild(t); }
  t.textContent = 'This TV has an older Home Base app. To get the new one: open Downloader, enter home-bridge.webb-home.workers.dev/tv and install it. After that, this button updates the app for you.';
}
/* The remote's buttons, passed in by the app while the panel is open. Returns true when used. */
function snd(kind) { try { if (HB_APP && typeof HB_APP.snd === 'function') HB_APP.snd(kind); } catch (e) {} }
window.hbKey = k => {
  const used = hbKey0(k);
  if (used) snd(k === 'menu' ? (PANEL.open ? 'menu' : 'back') : k === 'ok' ? 'ok' : k === 'back' || !PANEL.open ? 'back' : 'move');
  return used;
};
function hbKey0(k) {
  if (!PANEL.open) { if (k === 'menu') { panelOpen(); return true; } return false; }
  if (PANEL.zone === 'nav') {
    if (k === 'up' || k === 'down') { panelShow(PANEL.s + (k === 'up' ? -1 : 1)); panelFocus(); }
    else if (k === 'right' || k === 'ok') { PANEL.zone = 'grid'; panelFocus(); }
    else if (k === 'back' || k === 'menu') panelClose();
    else if (k !== 'left') return false;
    return true;
  }
  if (k === 'back') { PANEL.zone = 'nav'; panelFocus(); return true; }
  if (k === 'menu') { panelClose(); return true; }
  if (k === 'ok') { if (PANEL.tile) panelPick(PANEL.tile); return true; }
  if (['up', 'down', 'left', 'right'].includes(k)) { if (!panelMove(k) && k === 'left') { PANEL.zone = 'nav'; panelFocus(); } return true; }
  return false;
}
window.hbStyle = { open: panelOpen, close: panelClose, get: () => styLoad() };
document.addEventListener('keydown', e => {
  const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', Escape: 'back', Backspace: 'back', s: 'menu' };
  if (map[e.key] && window.hbKey(map[e.key])) e.preventDefault();
});
