/* ---------- Feel & extras: the finishing touches, each one switchable ----------
   Kept with the Style settings as s.pol. Defaults are calm: glass, slow drift, time-of-day light, the startup
   animation, tile tilt & sheen and the Watch button are on; the status strip and sounds are off. Some of these are
   drawn by the page (glass, drift, light, strip, startup, screensaver zoom); the app draws the rest (tilt, sheen,
   sounds, Watch button) and gets them through HB_APP.prefs. */
var POL_DEF = { glass: true, drift: true, day: true, strip: false, start: true, kb: true, tilt: true, sound: 'off', watch: true, fun: 'playful' };
function polNorm(p) {
  const o = { ...POL_DEF }; p = p && typeof p === 'object' ? p : {};
  ['glass', 'drift', 'day', 'strip', 'start', 'kb', 'tilt', 'watch'].forEach(k => { if (typeof p[k] === 'boolean') o[k] = p[k]; });
  if (['off', 'soft', 'normal'].includes(p.sound)) o.sound = p.sound;
  if (['calm', 'playful', 'party'].includes(p.fun)) o.fun = p.fun;
  return o;
}
var POL_GROUPS = [
  ['glass', 'Frosted-glass panels', [[1, 'On'], [0, 'Off']]], ['drift', 'Slow background drift', [[1, 'On'], [0, 'Off']]],
  ['day', 'Light that follows the time of day', [[1, 'On'], [0, 'Off']]], ['strip', 'Status strip (time, weather, Wi-Fi)', [[1, 'On'], [0, 'Off']]],
  ['start', 'Startup animation', [[1, 'On'], [0, 'Off']]], ['kb', 'Screensaver photo zoom', [[1, 'On'], [0, 'Off']]],
  ['tilt', 'App tiles tilt & shine', [[1, 'On'], [0, 'Off']]], ['sound', 'Navigation sounds', [['off', 'Off'], ['soft', 'Soft'], ['normal', 'Normal']]],
  ['fun', 'Fun level', [['calm', 'Calm'], ['playful', 'Playful'], ['party', 'Party']]], ['watch', 'Watch button', [[1, 'On'], [0, 'Off']]]
];
var POL_KEYS = new Set(POL_GROUPS.map(g => 'pol.' + g[0]));
function polSection() {
  return { id: 'feel', name: 'Feel & extras', hint: 'Glass, light, sounds, fun', groups: POL_GROUPS.map(([k, name, opts]) => ({ key: 'pol.' + k, name, opts })) };
}
function polCur(k) { const p = polNorm(styLoad().pol), v = p[k.slice(4)]; return typeof v === 'boolean' ? (v ? 1 : 0) : v; }
function polPick(s, k, raw) {
  const key = k.slice(4), p = polNorm(s.pol);
  p[key] = typeof POL_DEF[key] === 'boolean' ? raw === '1' : raw;
  s.pol = p;
  /* the fun level sets how often the characters visit (and turns them off at Calm) */
  if (key === 'fun') { s.hbx = HBLook.set(s.hbx, 'pals', raw === 'calm' ? 'off' : 'on'); if (raw !== 'calm') s.hbx = HBLook.set(s.hbx, 'palsOften', raw === 'party' ? 'often' : 'some'); }
}
function polPreview(k, v) {
  const key = k.slice(4), on = v === 1 || v === '1';
  const icons = { glass: '🧊', drift: '🌫', day: '🌅', strip: '📶', start: '✨', kb: '🖼', tilt: '🃏', watch: '🍿' };
  if (key === 'sound') return `<div class="hbx-pv"><span class="pv-fx">${v === 'off' ? '🔇' : v === 'soft' ? '🔉' : '🔊'}</span></div>`;
  if (key === 'fun') return `<div class="hbx-pv"><span class="pv-fx">${v === 'calm' ? '🍃' : v === 'playful' ? '👻' : '🎉'}</span></div>`;
  return `<div class="hbx-pv"><span class="pv-fx" style="opacity:${on ? 1 : .35}">${icons[key] || '•'}</span></div>`;
}
/* Time-of-day light: a soft wash over the background, warm in the morning, clear by day, golden in the evening,
   deep blue at night. Updated every few minutes. */
function polLight() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const tint = h < 5 ? ['#1b2a6b', .22] : h < 9 ? ['#ff9a4a', .13] : h < 16 ? ['#ffffff', .03] : h < 19 ? ['#ff7a2e', .14] : h < 22 ? ['#6b3fa0', .15] : ['#1b2a6b', .22];
  document.documentElement.style.setProperty('--pol-tint', tint[0]); document.documentElement.style.setProperty('--pol-tint-a', tint[1]);
}
function polStrip() {
  let el = document.getElementById('pstrip');
  if (!el) { el = document.createElement('div'); el.id = 'pstrip'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
  const d = new Date(); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  const wx = D.data && D.data.wx, t = wx && wx.now != null ? `${wx.now}°` : '';
  const net = navigator.onLine !== false;
  el.innerHTML = `<span>${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}</span>${t ? `<span>${t}</span>` : ''}<span class="${net ? 'ok' : 'off'}"><i></i>${net ? 'Online' : 'Offline'}</span>`;
}
let POL_T = 0, POL_STARTED = false;
function polApply(pRaw) {
  const p = polNorm(pRaw), b = document.body;
  b.classList.toggle('p-glass', p.glass); b.classList.toggle('p-drift', p.drift); b.classList.toggle('p-day', p.day);
  b.classList.toggle('p-strip', p.strip); b.classList.toggle('p-kb', p.kb);
  if (p.day) polLight();
  if (p.strip) polStrip();
  clearInterval(POL_T); POL_T = setInterval(() => { const q = polNorm(styLoad().pol); if (q.day) polLight(); if (q.strip) polStrip(); }, 30000);
  if (!POL_STARTED) { POL_STARTED = true; if (p.start && MODE === 'home' && !DEMO_NOSTART) { b.classList.add('p-start'); setTimeout(() => b.classList.remove('p-start'), 2600); } }
  try { if (HB_APP && typeof HB_APP.prefs === 'function') HB_APP.prefs(JSON.stringify({ tilt: p.tilt, sound: p.sound, watch: p.watch })); } catch (e) {}
}
var DEMO_NOSTART = /nostart=1/.test(location.search);
