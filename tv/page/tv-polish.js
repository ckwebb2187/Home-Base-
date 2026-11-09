/* ---------- premium polish (page 13): the switchable touches ----------
   Each one reads its switch from the shared look (styLoad().hbx) and does nothing when it's off. Layers are built once
   and only rebuilt when what they show changes; everything moves with transform and opacity. Nothing here ever shows
   an error: if something can't be read, the last good version stays on screen. */
var POL = { wx: '', done: null, net: '', t: 0 };
const polL = () => { try { return styLoad().hbx || {}; } catch (e) { return {}; } };
const polStill = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function polLayers() {
  const mk = (id, before) => { let el = document.getElementById(id); if (!el) { el = document.createElement('div'); el.id = id; el.setAttribute('aria-hidden', 'true'); document.body.insertBefore(el, before); } return el; };
  const wrap = $('#wrap');
  mk('amb', $('#glow') || wrap); mk('tod', wrap); mk('wxfx', wrap);
  const strip = mk('pstrip', null); strip.hidden = true;
  const boot = mk('boot', null); boot.hidden = true;
  if (!boot.firstChild) boot.innerHTML = '<div class="bm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5.5h4V20"/></svg><b>Home Base</b></div>';
}

/* Time of day: the light's color and how dim the screen is, eased between a few points through the day. */
const TOD = [[0, [60, 70, 150], .10, .30], [5, [80, 80, 160], .10, .26], [7, [255, 172, 104], .16, 0], [10, [255, 222, 176], .07, 0], [16, [255, 196, 128], .06, 0],
  [18.5, [255, 128, 92], .15, .04], [20.5, [104, 80, 180], .14, .14], [22.5, [60, 70, 150], .10, .26], [24, [60, 70, 150], .10, .30]];
function polTod() {
  const el = $('#tod'), R = document.documentElement; if (!el) return;
  if (polL().tod !== 'on') { R.classList.remove('tod-night'); return; }
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  let i = 0; while (i < TOD.length - 2 && TOD[i + 1][0] <= h) i++;
  const a = TOD[i], b = TOD[i + 1], t = (h - a[0]) / (b[0] - a[0]), m = (x, y) => x + (y - x) * t;
  const c = a[1].map((v, k) => Math.round(m(v, b[1][k])));
  el.style.setProperty('--tod-c', `rgba(${c.join(',')},${m(a[2], b[2]).toFixed(3)})`);
  const dim = m(a[3], b[3]); el.style.setProperty('--tod-d', dim.toFixed(3));
  R.classList.toggle('tod-night', dim > .2);
}

/* Weather touches from the weather the wall sends: rain shimmer, slow snow, frost on cold mornings. */
const WX_RAIN = [12, 13, 14, 18, 39, 40, 15, 16, 17, 41, 42];
function polWx() {
  const box = $('#wxfx'); if (!box) return;
  const w = D.data && D.data.wx, on = polL().wx === 'on' && w && !polStill(), c = w ? Number(w.ic) || 0 : 0, hr = new Date().getHours();
  const rain = on && WX_RAIN.includes(c), snow = on && ((c >= 19 && c <= 29) || c === 43 || c === 44);
  const frost = on && w.now != null && +w.now <= 34 && hr >= 5 && hr < 11;
  const key = [rain, snow, frost].join();
  if (key === POL.wx) return; POL.wx = key;
  let h = '';
  const r = n => (holHash('wx' + n) % 1000) / 1000;
  if (rain) for (let i = 0; i < 36; i++) { const du = 0.75 + r(i) * 0.5; h += `<i class="rd" style="left:${(r(i + 99) * 120).toFixed(1)}vw;animation-duration:${du.toFixed(2)}s;animation-delay:${(-r(i + 7) * du).toFixed(2)}s;opacity:${(0.4 + r(i + 3) * 0.6).toFixed(2)}"></i>`; }
  if (snow) for (let i = 0; i < 28; i++) { const du = 14 + r(i) * 12, s = 0.5 + r(i + 5) * 0.9; h += `<i class="sf" style="left:${(r(i + 50) * 100).toFixed(1)}vw;width:${s.toFixed(2)}vh;height:${s.toFixed(2)}vh;animation-duration:${du.toFixed(1)}s;animation-delay:${(-r(i + 9) * du).toFixed(1)}s"></i>`; }
  box.innerHTML = h;
  box.classList.toggle('frost', !!frost);
}

/* Status strip: the time, the weather, the Wi-Fi signal (from the app) and who's home (when Home Base sends it). */
const WIFI = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${[[20, 7.2], [16.4, 10.6], [12.8, 14]].map(([w, y], i) =>
  `<path d="M${12 - w / 2} ${y}a${w * 0.9} ${w * 0.9} 0 0 1 ${w} 0" opacity="${i < 3 - n ? .3 : 1}"/>`).join('')}<circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none"/></svg>`;
function polNet() {
  try { if (HB_APP && typeof HB_APP.net === 'function') return String(HB_APP.net() || ''); } catch (e) {}
  return navigator.onLine === false ? 'none' : 'wifi:3';
}
function polStrip() {
  const el = $('#pstrip'); if (!el) return;
  if (polL().strip !== 'on' || MODE === 'style') { el.hidden = true; return; }
  const d = D.data || {}, w = d.wx, parts = [];
  const now = new Date(); let h = now.getHours() % 12 || 12;
  parts.push(`<span><b>${h}:${pad(now.getMinutes())}</b></span>`);
  if (w && w.now != null) parts.push(`<span>${wxIcon(w.ic, w.night)}<b>${esc(w.now)}°</b></span>`);
  const net = polNet();
  if (/^wifi/.test(net)) parts.push(`<span>${WIFI(Math.max(0, Math.min(3, +(net.split(':')[1] || 3))))}Wi-Fi</span>`);
  else if (net === 'eth') parts.push('<span>Wired</span>');
  else if (net === 'none') parts.push(`<span>${WIFI(0)}Offline</span>`);
  const home = Array.isArray(d.home) ? d.home.filter(x => typeof x === 'string' && x).slice(0, 4) : null;
  if (home) parts.push(`<span>${home.length ? `<b>${esc(home.join(', '))}</b> home` : 'Nobody home'}</span>`);
  const html = parts.join('<i class="sep"></i>');
  if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  el.hidden = false;
}

/* Chores: when the last one is ticked off, the Fun characters celebrate. */
function polChores() {
  const c = D.data && Array.isArray(D.data.chores) ? D.data.chores : [];
  const done = c.length > 0 && c.every(x => !x.left || !x.left.length);
  if (POL.done === false && done) { try { HBLook.cheer(); } catch (e) {} }
  POL.done = done;
}

/* Startup: the mark glows in, then the screen assembles. Played when the page first opens and when the TV wakes. */
window.hbBoot = () => {
  const b = $('#boot');
  if (!b || polL().boot !== 'on' || MODE !== 'home' || polStill()) return;
  clearTimeout(POL.bt1); clearTimeout(POL.bt2);
  b.classList.remove('go', 'out'); b.hidden = false; void b.offsetWidth; b.classList.add('go');
  document.body.classList.add('booting');
  POL.bt1 = setTimeout(() => { b.classList.add('out'); document.body.classList.remove('booting'); }, 1300);
  POL.bt2 = setTimeout(() => { b.hidden = true; b.classList.remove('go', 'out'); }, 1750);
};

/* Screensaver photos: each one gets its own gentle pan and zoom, and the speed setting sets how long each shows. */
function polPhotoMs() { const sp = polL().kbSpeed; return sp === 'slow' ? 24000 : sp === 'fast' ? 9000 : 15000; }
function polKb(el) {
  const r = Math.random, dir = r() < 0.5 ? -1 : 1;
  el.style.setProperty('--ks', (1.08 + r() * 0.06).toFixed(3));
  el.style.setProperty('--kx', (dir * (1 + r() * 2)).toFixed(2) + '%');
  el.style.setProperty('--ky', ((r() - 0.5) * 3).toFixed(2) + '%');
  el.style.setProperty('--kbd', ((polPhotoMs() + 2500) / 1000).toFixed(1) + 's');
}

function polTick() { polTod(); polWx(); polStrip(); polChores(); }
function polApply() { polLayers(); POL.wx = ''; polTick(); }
polLayers();
setInterval(polTick, 30000);
(function polMin() { polStrip(); setTimeout(polMin, 60000 - Date.now() % 60000 + 80); })();
