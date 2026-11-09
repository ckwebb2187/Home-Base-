/* ==========================================================================================================
   Home Base look (hb-look.js) — one set of look settings shared by the TV home screen and the Home Base wall.
   Source of truth: Home-Base-/tv/page/hb-look.js. page/inject_look.py copies it into the TV page and the wall
   between the "hb-look:start" and "hb-look:end" markers, so both always run the same code.

   What it does
   - Keeps the look settings (L): quick look, part colors, clock & date styles, button glows, press effect, card
     style, the extra background motions and the little characters. Hosts save L wherever they keep settings
     (the wall: config/settings.hbx; the TV: tv_style.hbx) and call HBLook.apply(L).
   - Draws everything with CSS that animates transform and opacity (a few text sheens slide a gradient; Performance
     mode freezes those). One motion language: the same easing and 150 / 250 / 400 ms everywhere.
   - Repeating animations are pinned to the wall clock (HBLook.lock), so a redraw never makes them jump.
   - Builds small live previews for every option, once, and caches them.
   The host tells it which of its elements are the clock, the date, cards and buttons (init), and how its own color
   variables map to the color parts (base / vars). Nothing here knows about calendars or data.
   ========================================================================================================== */
window.HBLook = window.HBLook || (() => {
  'use strict';
  const VER = '1.1';
  const E = 'cubic-bezier(.2,.8,.2,1)';   /* the one easing; durations are 150, 250 and 400 ms */

  /* ---------- small helpers ---------- */
  const isHex = v => /^#[0-9a-f]{6}$/i.test(String(v || ''));
  const rgb = h => { h = String(h || '').trim(); if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map(c => c + c).join('');
    if (isHex(h)) return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const m = h.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i); return m ? [+m[1], +m[2], +m[3]] : null; };
  const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const toHex = v => { const c = rgb(v); return c ? hex(c) : ''; };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); if (!A || !B) return a; return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const rgba = (h, a) => { const c = rgb(h) || [128, 128, 128]; return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`; };
  const lum = h => { const c = rgb(h) || [0, 0, 0]; return c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /* Moves a color toward white or black (whichever reads better) until it reaches the contrast asked for. */
  function readable(c, bg, min) {
    if (!isHex(c) || !isHex(bg) || contrast(c, bg) >= min) return c;
    const to = lum(bg) < 0.4 ? '#ffffff' : '#000000';
    for (let t = 0.1; t <= 1.001; t += 0.1) { const m = mix(c, to, t); if (contrast(m, bg) >= min) return m; }
    return to;
  }
  const inkOn = bg => contrast('#ffffff', bg) >= contrast('#111111', bg) ? '#ffffff' : '#111111';
  function hsl(h, s, l) {
    s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))));
    return hex([f(0), f(8), f(4)]);
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const f1 = v => Math.round(v * 10) / 10;
  const still = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  /* ---------- the options ---------- */
  const PARTS = [['bg', 'Background'], ['card', 'Cards'], ['text', 'Text'], ['head', 'Headers & today'], ['btn', 'Buttons'],
    ['hi', 'Highlights & stars'], ['clock', 'Clock'], ['date', 'Date'], ['glow', 'Glow']];
  const SWATCHES = ['#05070D', '#0B1020', '#14201C', '#1D5B4A', '#6DC2A4', '#00E5A8', '#00F0FF', '#4FC3FF', '#1E6BFF', '#7B2CFF',
    '#B967FF', '#FF2BD6', '#FF3CAC', '#FF5E1A', '#F0B43C', '#FFE600', '#9DFF00', '#00FF41', '#E8ECF2', '#FFFFFF'];
  const TEXT_FX = [['plain', 'Plain'], ['soft', 'Soft glow'], ['neon', 'Neon sign'], ['outline', 'Light outline'], ['sweep', 'Color sweep'],
    ['rainbow', 'Rainbow'], ['holo', 'Hologram'], ['beat', 'Heartbeat'], ['float', 'Float'], ['glitch', 'Glitch']];
  const TICKS = [['slide', 'Slide down'], ['drop', 'Drop & bounce'], ['flip', 'Flip'], ['fade', 'Fade in'], ['focus', 'Focus in'], ['zoom', 'Zoom in']];
  const BTNS = [['soft', 'Soft glow'], ['pulse', 'Pulse'], ['neon', 'Neon outline'], ['sweep', 'Light sweep'], ['rainbow', 'Rainbow ring'], ['breathe', 'Breathe'], ['holo', 'Hologram']];
  const WHICH = [['sel', 'Highlighted & selected'], ['main', 'Plus main buttons'], ['all', 'Every button']];
  const STRENGTH = [['subtle', 'Subtle'], ['normal', 'Normal'], ['strong', 'Strong']];
  const PRESS = [['push', 'Push in'], ['pop', 'Pop out'], ['squish', 'Squish'], ['flash', 'Flash']];
  const CARDS = [['soft', 'Soft glow'], ['neon', 'Neon edges'], ['shift', 'Color-shifting edges'], ['float', 'Floating shadow'], ['glass', 'Glass']];
  const MOTIONS = [['', 'None of these'], ['neongrid', 'Neon grid'], ['rain', 'Digital rain'], ['hyper', 'Hyperspeed'], ['const', 'Constellation'],
    ['circuit', 'Circuit board'], ['field', 'Force field'], ['radar', 'Radar'], ['tunnel', 'Warp tunnel'], ['orbs', 'Plasma orbs'], ['stream', 'Data stream'],
    ['swarm', 'Particle swarm'], ['eq', 'Equalizer'], ['lasers', 'Laser show'], ['globe', 'Holo globe'], ['bokeh', 'Bokeh lights'], ['waves', 'Sine waves'], ['comets', 'Comets']];
  const MSETS = [['match', 'Match my colors'], ['neon', 'Neon', ['#00F0FF', '#FF2BD6', '#7CFF4F']], ['cyber', 'Cyber green', ['#00FF41', '#00B32C', '#B6FFC9']],
    ['synth', 'Synthwave', ['#FF3CAC', '#784BA0', '#2B86C5', '#FFB86B']]];
  const PALS_ON = [['on', 'On'], ['off', 'Off']];
  const OFTEN = [['rare', 'Now and then'], ['some', 'Sometimes'], ['often', 'Often']];
  const OFTEN_MS = { rare: 12 * 60e3, some: 5 * 60e3, often: 100e3 };
  const STR_K = { subtle: 0.6, normal: 1, strong: 1.6 };
  /* The feel settings: each effect has its own switch (they don't change the quick look). Calm by default. */
  const ON = [['on', 'On'], ['off', 'Off']];
  const HOLI = [['subtle', 'Subtle'], ['full', 'Full'], ['off', 'Off']];
  const VOL = [['low', 'Quiet'], ['mid', 'Medium'], ['high', 'Loud']];
  const SPEED = [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']];
  const FUN = [['calm', 'Calm'], ['playful', 'Playful'], ['party', 'Party']];
  const ART = [['theme', 'In my colors'], ['real', 'Original app art']];
  const FEEL = { tilt: ON, sheen: ON, glass: ON, drift: ON, tod: ON, wx: ON, holi: HOLI, snd: ON, vol: VOL, strip: ON, boot: ON, kb: ON, kbSpeed: SPEED, fun: FUN, art: ART };
  const FEEL_DEF = { tilt: 'on', sheen: 'on', glass: 'on', drift: 'on', tod: 'off', wx: 'off', holi: 'subtle', snd: 'off', vol: 'low', strip: 'on', boot: 'on', kb: 'on', kbSpeed: 'normal', fun: 'calm', art: 'theme' };

  /* Quick looks: one press sets everything (colors included). Classic clears the part colors. */
  const QUICK = [
    ['classic', 'Classic', { clock: 'soft', clockAnim: 'slide', date: 'plain', dateAnim: 'fade', btn: 'soft', which: 'sel', str: 'normal', press: 'push', card: 'soft', motion: '', mset: 'match', colors: {} }],
    ['calm', 'Calm glow', { clock: 'soft', clockAnim: 'fade', date: 'soft', dateAnim: 'fade', btn: 'breathe', which: 'sel', str: 'subtle', press: 'push', card: 'glass', motion: 'const', mset: 'match', colors: {} }],
    ['neon', 'Neon future', { clock: 'neon', clockAnim: 'flip', date: 'neon', dateAnim: 'focus', btn: 'neon', which: 'main', str: 'strong', press: 'pop', card: 'neon', motion: 'neongrid', mset: 'neon',
      colors: { bg: '#07071A', card: '#0E0B26', head: '#FF2BD6', hi: '#00F0FF', glow: '#00F0FF', clock: '#E9FDFF', btn: '#3A1C8C' } }],
    ['holo', 'Hologram', { clock: 'holo', clockAnim: 'focus', date: 'holo', dateAnim: 'fade', btn: 'holo', which: 'sel', str: 'normal', press: 'flash', card: 'glass', motion: 'field', mset: 'neon',
      colors: { bg: '#04111A', card: '#0A2230', head: '#7DF9FF', hi: '#FF7BF2', glow: '#5CF6FF', clock: '#C8FBFF', btn: '#0F4C5C' } }],
    ['synth', 'Synthwave', { clock: 'sweep', clockAnim: 'drop', date: 'neon', dateAnim: 'slide', btn: 'sweep', which: 'main', str: 'strong', press: 'squish', card: 'shift', motion: 'neongrid', mset: 'synth',
      colors: { bg: '#150A2A', card: '#22113E', head: '#FFB86B', hi: '#FF3CAC', glow: '#FF3CAC', clock: '#FFD6F2', btn: '#784BA0' } }],
    ['code', 'Green code', { clock: 'glitch', clockAnim: 'slide', date: 'plain', dateAnim: 'fade', btn: 'neon', which: 'sel', str: 'normal', press: 'flash', card: 'neon', motion: 'rain', mset: 'cyber',
      colors: { bg: '#020A04', card: '#05160B', text: '#B6FFC9', head: '#00FF41', hi: '#39FF14', glow: '#00FF41', clock: '#7CFF9E', date: '#00FF41', btn: '#0B3D1A' } }],
    ['space', 'Deep space', { clock: 'float', clockAnim: 'zoom', date: 'soft', dateAnim: 'fade', btn: 'pulse', which: 'sel', str: 'normal', press: 'pop', card: 'float', motion: 'hyper', mset: 'match',
      colors: { bg: '#03040C', card: '#0B0E22', head: '#9DB4FF', hi: '#C9A7FF', glow: '#7A8CFF', clock: '#E6E9FF', btn: '#1B2160' } }]
  ];
  const DEF = { quick: 'classic', colors: {}, clock: 'soft', clockAnim: 'slide', date: 'plain', dateAnim: 'fade', btn: 'soft', which: 'sel', str: 'normal',
    press: 'push', card: 'soft', motion: '', mset: 'match', pals: 'on', palsOften: 'some', ...FEEL_DEF, ts: 0 };
  const LISTS = { clock: TEXT_FX, date: TEXT_FX, clockAnim: TICKS, dateAnim: TICKS, btn: BTNS, which: WHICH, str: STRENGTH, press: PRESS, card: CARDS, motion: MOTIONS, mset: MSETS, pals: PALS_ON, palsOften: OFTEN, ...FEEL };
  const NOT_LOOK = new Set(['pals', 'palsOften', ...Object.keys(FEEL)]);
  function norm(o) {
    o = o && typeof o === 'object' ? o : {};
    const L = { ...DEF };
    Object.keys(LISTS).forEach(k => { if (LISTS[k].some(x => x[0] === o[k])) L[k] = o[k]; });
    /* Settings saved before the Fun level existed keep their characters (on = Playful). */
    if (!FUN.some(x => x[0] === o.fun) && o.pals) L.fun = o.pals === 'off' ? 'calm' : o.palsOften === 'often' ? 'party' : 'playful';
    L.pals = L.fun === 'calm' ? 'off' : 'on';
    L.quick = QUICK.some(q => q[0] === o.quick) ? o.quick : (o.quick === '' ? '' : DEF.quick);
    L.colors = {}; PARTS.forEach(([k]) => { if (o.colors && isHex(o.colors[k])) L.colors[k] = o.colors[k].toUpperCase(); });
    L.ts = +o.ts || 0;
    return L;
  }
  /* Changing one thing: a quick look sets the whole bundle; anything else makes the look "Custom". */
  function set(L, key, val) {
    L = norm(L); const n = { ...L, colors: { ...L.colors } };
    if (key === 'quick') { const q = QUICK.find(x => x[0] === val); if (q) Object.assign(n, JSON.parse(JSON.stringify(q[2])), { quick: val }); }
    else if (key === 'color') { const [part, c] = val; if (isHex(c)) n.colors[part] = c.toUpperCase(); else delete n.colors[part]; n.quick = ''; }
    else if (key === 'colorsReset') { n.colors = {}; n.quick = ''; }
    else if (key === 'recommended') { const keep = n.ts; Object.assign(n, JSON.parse(JSON.stringify(DEF)), JSON.parse(JSON.stringify(QUICK[0][2])), { quick: 'classic', colors: {}, ts: keep }); }
    else if (LISTS[key]) { n[key] = val; if (!NOT_LOOK.has(key)) n.quick = ''; }
    n.ts = Date.now();
    return norm(n);
  }
  const name = (key, id) => { const l = key === 'quick' ? QUICK : LISTS[key]; const x = l && l.find(o => o[0] === id); return x ? x[1] : ''; };

  /* ---------- host wiring ---------- */
  const H = { sel: {}, base: null, vars: null, motionBox: null, safeBottom: '0px', perf: () => false, busy: () => false, onFx: null, tv: false };
  let L = norm(null), baseEl = null, rootEl = null, ovEl = null, moEl = null, moKey = '', palT = 0;
  function init(host) {
    Object.assign(H, host || {});
    if (!baseEl) { baseEl = document.createElement('style'); baseEl.id = 'hbx-base'; baseEl.textContent = baseCss(); document.head.appendChild(baseEl); }
    if (!rootEl) { rootEl = document.createElement('style'); rootEl.id = 'hbx-root'; document.head.appendChild(rootEl); }
    if (!ovEl) { ovEl = document.createElement('style'); ovEl.id = 'hbx-colors'; document.head.appendChild(ovEl); }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) lock(); });
  }

  /* ---------- CSS ---------- */
  /* Text styles, written against "&" (the element) so the same rule serves the clock, the date and the previews. */
  const GRAD = g => `background:${g} 0 0/300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent;text-shadow:none!important;width:fit-content;`;
  const TEXT_CSS = {
    plain: '&{text-shadow:none!important}',
    soft: '&{text-shadow:0 0 .3em var(--hbx-g1),0 0 .06em rgba(255,255,255,.18)!important}',
    neon: '&{color:var(--hbx-neonc)!important;-webkit-text-fill-color:var(--hbx-neonc);text-shadow:0 0 .03em #fff,0 0 .09em var(--hbx-glow),0 0 .22em var(--hbx-glow),0 0 .5em var(--hbx-g1)!important}',
    outline: '&{color:transparent!important;-webkit-text-fill-color:transparent;-webkit-text-stroke:max(1.5px,.022em) var(--hbx-tc);text-shadow:0 0 .3em var(--hbx-g2)!important} & *{-webkit-text-fill-color:transparent;-webkit-text-stroke:max(1px,.02em) var(--hbx-tc)}',
    sweep: '&{' + GRAD('linear-gradient(100deg,var(--hbx-tc) 0 36%,#fff 47%,var(--hbx-hi) 53%,var(--hbx-tc) 64% 100%)') + 'animation:hbx-sheen 6s linear infinite} & *{color:transparent!important;-webkit-text-fill-color:transparent}',
    rainbow: '&{' + GRAD('linear-gradient(90deg,#FF5F6D,#FFC371,#F9F871,#5CF6A4,#4FC3FF,#B57BFF,#FF5F6D,#FFC371)') + 'animation:hbx-sheen 12s linear infinite} & *{color:transparent!important;-webkit-text-fill-color:transparent}',
    holo: '&{' + GRAD('linear-gradient(160deg,#BFFBFF 0%,var(--hbx-glow) 28%,#FFFFFF 46%,#FF9BF5 62%,var(--hbx-glow) 80%,#BFFBFF 100%)') + 'opacity:.94;animation:hbx-sheen 9s linear infinite,hbx-hover 4s ease-in-out infinite;filter:drop-shadow(0 0 .12em var(--hbx-g2))} & *{color:transparent!important;-webkit-text-fill-color:transparent}',
    beat: '&{text-shadow:0 0 .25em var(--hbx-g1)!important;animation:hbx-beat 2s ease-in-out infinite;transform-origin:30% 60%}',
    float: '&{text-shadow:0 .18em .4em rgba(0,0,0,.35),0 0 .3em var(--hbx-g2)!important;animation:hbx-hover 6s ease-in-out infinite}',
    glitch: '&{text-shadow:.035em 0 rgba(255,40,110,.55),-.035em 0 rgba(0,235,255,.55),0 0 .25em var(--hbx-g2)!important;animation:hbx-glitch 6s steps(1,end) infinite}'
  };
  /* The minute-change number animations, as keyframe stops; each makes a one-shot (400 ms) and a looping preview. */
  const TICK_KF = {
    slide: [[0, 'opacity:0;translate:0 -.45em'], [100, 'opacity:1;translate:0 0']],
    drop: [[0, 'opacity:0;translate:0 -.7em'], [55, 'opacity:1;translate:0 .08em'], [78, 'translate:0 -.03em'], [100, 'translate:0 0']],
    flip: [[0, 'opacity:0;transform:perspective(2em) rotateX(-88deg)'], [100, 'opacity:1;transform:perspective(2em) rotateX(0)']],
    fade: [[0, 'opacity:0'], [100, 'opacity:1']],
    focus: [[0, 'opacity:0;filter:blur(.12em);scale:1.12'], [100, 'opacity:1;filter:blur(0);scale:1']],
    zoom: [[0, 'opacity:0;scale:.55'], [70, 'opacity:1;scale:1.05'], [100, 'scale:1']]
  };
  const PRESS_KF = { push: 'scale:.93', pop: 'scale:1.08', squish: 'scale:1.09 .9', flash: 'filter:brightness(1.7) saturate(1.2)' };
  /* Button glows: "on" is the highlighted/selected look (may move), "rest" is the still version for the others. */
  const BTN_CSS = {
    soft: { on: '&{box-shadow:0 0 calc(16px*var(--hbx-k)) var(--hbx-g1),0 0 0 1.5px var(--hbx-g2)!important}', rest: '&{box-shadow:0 0 calc(10px*var(--hbx-k)) var(--hbx-g2)!important}' },
    pulse: { on: '&{box-shadow:0 0 calc(14px*var(--hbx-k)) var(--hbx-g1),0 0 0 2px var(--hbx-glow)!important;animation:hbx-bpulse 2s ease-out infinite}', rest: '&{box-shadow:0 0 calc(10px*var(--hbx-k)) var(--hbx-g2)!important}' },
    neon: { on: '&{border-color:var(--hbx-glow)!important;box-shadow:0 0 0 2px var(--hbx-glow),0 0 calc(10px*var(--hbx-k)) var(--hbx-glow),0 0 calc(26px*var(--hbx-k)) var(--hbx-g1),inset 0 0 calc(10px*var(--hbx-k)) var(--hbx-g2)!important}',
      rest: '&{border-color:var(--hbx-g1)!important;box-shadow:0 0 0 1px var(--hbx-g1),0 0 calc(10px*var(--hbx-k)) var(--hbx-g2)!important}' },
    sweep: { on: '&{box-shadow:0 0 calc(14px*var(--hbx-k)) var(--hbx-g1),0 0 0 1.5px var(--hbx-g2)!important;background-image:linear-gradient(110deg,transparent 38%,rgba(255,255,255,.34) 50%,transparent 62%)!important;background-size:260% 100%!important;background-repeat:no-repeat!important;animation:hbx-sheen 2.4s ease-in-out infinite}',
      rest: '&{box-shadow:0 0 calc(10px*var(--hbx-k)) var(--hbx-g2)!important}' },
    rainbow: { on: '&{animation:hbx-rainbow 6s linear infinite}', rest: '&{box-shadow:0 0 0 1px var(--hbx-g1),0 0 calc(10px*var(--hbx-k)) var(--hbx-g2)!important}' },
    breathe: { on: '&{animation:hbx-breathe 4s ease-in-out infinite}', rest: '&{box-shadow:0 0 calc(10px*var(--hbx-k)) var(--hbx-g2)!important}' },
    holo: { on: '&{box-shadow:-2px 0 0 0 rgba(0,240,255,.85),2px 0 0 0 rgba(255,80,230,.85),0 0 calc(18px*var(--hbx-k)) var(--hbx-g1)!important;background-image:linear-gradient(115deg,transparent 35%,rgba(160,255,255,.25) 48%,rgba(255,150,240,.22) 54%,transparent 66%)!important;background-size:260% 100%!important;background-repeat:no-repeat!important;animation:hbx-sheen 3.2s linear infinite}',
      rest: '&{box-shadow:-1px 0 0 0 rgba(0,240,255,.5),1px 0 0 0 rgba(255,80,230,.5)!important}' }
  };
  const CARD_CSS = {
    soft: '&{box-shadow:0 0 calc(30px*var(--hbx-k)) var(--hbx-g2),0 10px 30px rgba(0,0,0,.28)!important}',
    neon: '&{border-color:var(--hbx-glow)!important;box-shadow:0 0 0 1px var(--hbx-glow),0 0 calc(18px*var(--hbx-k)) var(--hbx-g1),inset 0 0 calc(18px*var(--hbx-k)) var(--hbx-g2)!important}',
    shift: '&{border-width:max(1.5px,.12em)!important;border-style:solid!important;box-shadow:0 0 calc(20px*var(--hbx-k)) var(--hbx-g2)!important;animation:hbx-edges 9s linear infinite}',
    float: '&{box-shadow:0 22px 46px rgba(0,0,0,.42),0 4px 10px rgba(0,0,0,.22),0 0 calc(20px*var(--hbx-k)) var(--hbx-g2)!important;animation:hbx-cfloat 8s ease-in-out infinite}',
    glass: '&{background:color-mix(in srgb,var(--hbx-cardc) 42%,transparent)!important;-webkit-backdrop-filter:blur(14px) saturate(150%);backdrop-filter:blur(14px) saturate(150%);border-color:rgba(255,255,255,.16)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 10px 30px rgba(0,0,0,.25)!important}'
  };
  const kf = (n, stops) => `@keyframes ${n}{${stops.map(([p, s]) => `${p}%{${s}}`).join('')}}`;
  /* The looping preview version of a one-shot animation: plays it in the first part, then holds. */
  const kfLoop = (n, stops, part) => `@keyframes ${n}{${stops.map(([p, s]) => `${f1(p * part)}%{${s}}`).join('')}100%{${stops[stops.length - 1][1]}}}`;
  const sub = (tpl, T) => tpl.replace(/&/g, T);
  /* Puts a prefix in front of every selector in a list ("a, b" -> "P a, P b"). */
  const pre = (P, list) => String(list || '').split(',').map(s => s.trim()).filter(Boolean).map(s => `${P} ${s}`).join(',');

  function baseCss() {
    let c = `
:root{--hbx-e:${E};--hbx-k:1;--hbx-glow:#6DC2A4;--hbx-g1:rgba(109,194,164,.5);--hbx-g2:rgba(109,194,164,.25);--hbx-hi:#F0B43C;--hbx-tc:#EEF2EF;--hbx-neonc:#F4FFFB;--hbx-cardc:#1E2824;--mc1:#00F0FF;--mc2:#FF2BD6;--mc3:#7CFF4F}
.hbx-d{display:inline-block}
@keyframes hbx-sheen{from{background-position:100% 0}to{background-position:-200% 0}}
@keyframes hbx-hover{0%,100%{translate:0 0}50%{translate:0 -.06em}}
@keyframes hbx-beat{0%,100%{scale:1}12%{scale:1.035}24%{scale:1}36%{scale:1.025}52%{scale:1}}
@keyframes hbx-glitch{0%,90%,100%{translate:0 0}91%{translate:.025em -.01em}92.5%{translate:-.03em .012em}94%{translate:.012em 0}95.5%{translate:0 0}}
@keyframes hbx-bpulse{0%{box-shadow:0 0 calc(14px*var(--hbx-k)) var(--hbx-g1),0 0 0 2px var(--hbx-glow),0 0 0 0 var(--hbx-g1)}100%{box-shadow:0 0 calc(14px*var(--hbx-k)) var(--hbx-g1),0 0 0 2px var(--hbx-glow),0 0 0 calc(12px*var(--hbx-k)) transparent}}
@keyframes hbx-breathe{0%,100%{box-shadow:0 0 calc(6px*var(--hbx-k)) var(--hbx-g2),0 0 0 1px var(--hbx-g2)}50%{box-shadow:0 0 calc(24px*var(--hbx-k)) var(--hbx-g1),0 0 0 2px var(--hbx-g1)}}
@keyframes hbx-rainbow{${[0, 1, 2, 3, 4, 5, 6].map(i => `${f1(i * 100 / 6)}%{box-shadow:0 0 0 2px ${hsl(i * 60 % 360, 95, 62)},0 0 calc(16px*var(--hbx-k)) ${rgba(hsl(i * 60 % 360, 95, 62), .55)}}`).join('')}}
@keyframes hbx-edges{0%,100%{border-color:var(--hbx-glow)}33%{border-color:var(--hbx-hi)}66%{border-color:var(--mc2)}}
@keyframes hbx-cfloat{0%,100%{translate:0 0}50%{translate:0 -6px}}
.hbx-press{transition:scale 150ms ${E},filter 150ms ${E}!important}
html[data-hbx-press] .hbx-press{${'scale:.93'}}
${Object.keys(PRESS_KF).map(k => `html[data-hbx-press="${k}"] .hbx-press{${PRESS_KF[k]}}`).join('\n')}
`;
    Object.keys(TICK_KF).forEach(k => { c += kf('hbx-t-' + k, TICK_KF[k]) + '\n' + kfLoop('hbx-tl-' + k, TICK_KF[k], 0.22) + '\n'; });
    Object.keys(PRESS_KF).forEach(k => { c += `@keyframes hbx-pl-${k}{0%,30%,100%{scale:1;filter:none}40%{${PRESS_KF[k]}}52%{scale:1;filter:none}}\n`; });
    /* previews: each option's little picture carries its own setting in a data attribute */
    Object.keys(TEXT_FX).forEach(() => {});
    TEXT_FX.forEach(([k]) => { c += sub(TEXT_CSS[k], `.hbx-pv[data-t="${k}"] .hbx-tx`) + '\n'; });
    TICKS.forEach(([k]) => { c += `.hbx-pv[data-a="${k}"] .hbx-d{animation:hbx-tl-${k} 1.8s ${E} infinite}\n`; });
    BTNS.forEach(([k]) => { c += sub(BTN_CSS[k].on, `.hbx-pv[data-b="${k}"] .hbx-b.b-on`) + '\n' + sub(BTN_CSS[k].rest, `.hbx-pv[data-b="${k}"] .hbx-b.b-rest`) + '\n'; });
    PRESS.forEach(([k]) => { c += `.hbx-pv[data-p="${k}"] .hbx-b{animation:hbx-pl-${k} 1.6s ${E} infinite}\n`; });
    CARDS.forEach(([k]) => { c += sub(CARD_CSS[k], `.hbx-pv[data-c="${k}"] .hbx-cd`) + '\n'; });
    c += PREVIEW_CSS + MOTION_CSS + PAL_CSS;
    return c;
  }

  /* The CSS for the host's own elements, for the current settings only (rebuilt when a setting changes). */
  function rootCss() {
    const s = H.sel, R = 'html.hbx-on';
    let c = '';
    const txt = (key, sel, tc) => { if (!sel) return; const T = pre(R, sel); c += `${T}{--hbx-tc:var(${tc})}\n` + sub(TEXT_CSS[L[key]] || '', T) + '\n'; };
    txt('clock', s.clock, '--hbx-clockc'); txt('date', s.date, '--hbx-datec');
    /* number animations on the digits that changed (class hbx-d, added by the host) */
    if (s.clock) c += `${pre(R, s.clock.split(',').map(x => x + ' .hbx-d').join(','))}{animation:hbx-t-${L.clockAnim} 400ms ${E} both!important}\n`;
    if (s.date) c += `${pre(R, s.date.split(',').map(x => x + ' .hbx-d').join(','))}{animation:hbx-t-${L.dateAnim} 400ms ${E} both!important}\n`;
    /* gradient clock styles: the moving digits carry their own copy of the gradient */
    if (['sweep', 'rainbow', 'holo', 'outline'].includes(L.clock) && s.clock) c += `${pre(R, s.clock.split(',').map(x => x + ' .hbx-d').join(','))}{background:inherit;-webkit-background-clip:text;background-clip:text}\n`;
    const B = BTN_CSS[L.btn];
    if (B) {
      if (s.btnSel) c += sub(B.on, pre(R, s.btnSel)) + '\n';
      const restSel = L.which === 'all' ? s.btnAll : L.which === 'main' ? s.btnMain : '';
      if (restSel) c += sub(B.rest, pre(R, restSel.split(',').map(x => x.trim()).filter(Boolean).map(x => `${x}:not(.hbx-skip)`).join(','))) + '\n';
    }
    if (s.press) c += `${pre(R, s.press.split(',').map(x => x.trim() + ':active').join(','))}{${PRESS_KF[L.press]};transition:scale 150ms ${E},filter 150ms ${E}}\n`;
    if (s.btnFill && L.colors.btn) c += `${pre(R, s.btnFill)}{background-color:var(--hbx-btn)!important;color:var(--hbx-btnink)!important;border-color:var(--hbx-btn)!important}\n`;
    if (s.card && CARD_CSS[L.card]) c += sub(CARD_CSS[L.card], pre(R, s.card)) + '\n';
    const gl = [s.card, s.glass].filter(Boolean).join(',');
    if (gl) {
      c += `${pre(R, gl)}{border-top-color:rgba(255,255,255,.16)!important}\n`;
      if (L.glass === 'on') c += `${pre(R + ':not(.hbx-perf)', gl)}{background-color:color-mix(in srgb,var(--hbx-cardc) 58%,transparent)!important;-webkit-backdrop-filter:blur(24px) saturate(1.35);backdrop-filter:blur(24px) saturate(1.35)}\n`
        + `${pre(R + '.hbx-perf', gl)}{background-color:color-mix(in srgb,var(--hbx-cardc) 86%,transparent)!important}\n`;
      else c += `${pre(R, gl)}{background-color:color-mix(in srgb,var(--hbx-cardc) 97%,#000)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}\n`;
    }
    if (s.headText && L.colors.head) c += `${pre(R, s.headText)}{color:var(--hbx-headc)!important}\n`;
    if (s.hiText && L.colors.hi) c += `${pre(R, s.hiText)}{color:var(--hbx-hi)!important}\n`;
    return c;
  }

  /* ---------- colors ---------- */
  /* Reads the host's own colors (with this module's overrides switched off), fills in the parts that were picked,
     keeps text readable on its background, then writes the overrides as !important custom properties so they sit
     on top of whatever the host sets (the host can keep changing its own colors underneath). */
  function paint() {
    if (!ovEl) return;
    ovEl.disabled = true;
    let base = {};
    try { base = H.base ? H.base() : {}; } catch (e) {}
    ovEl.disabled = false;
    const c = {}, pick = L.colors || {};
    PARTS.forEach(([k]) => { c[k] = isHex(pick[k]) ? pick[k] : toHex(base[k]) || ''; });
    if (!c.bg) c.bg = '#101614'; if (!c.card) c.card = mix(c.bg, '#ffffff', 0.06); if (!c.text) c.text = '#EEF2EF';
    if (!c.head) c.head = '#6DC2A4'; if (!c.hi) c.hi = '#F0B43C'; if (!c.glow) c.glow = c.head; if (!c.btn) c.btn = c.head;
    /* Auto-adjust: picked or not, text stays readable on what it sits on. */
    const surf = c.card && contrast(c.card, c.bg) < 1.4 ? c.bg : c.card;
    const fix = {};
    if (pick.bg || pick.card || pick.text) { const t = readable(readable(c.text, c.bg, 7), surf, 4.5); if (t !== c.text) fix.text = t; c.text = t; }
    if (pick.bg || pick.card || pick.head) { const t = readable(c.head, surf, 3); if (t !== c.head) fix.head = t; c.head = t; }
    if (pick.bg || pick.hi) { const t = readable(c.hi, c.bg, 3); if (t !== c.hi) fix.hi = t; c.hi = t; }
    c.clock = readable(c.clock || c.text, c.bg, 3); c.date = readable(c.date || c.head, c.bg, 3);
    c.btnInk = inkOn(c.btn);
    const changed = new Set(Object.keys(pick).filter(k => isHex(pick[k])).concat(Object.keys(fix)));
    const out = {
      '--hbx-glow': c.glow, '--hbx-g1': rgba(c.glow, 0.5), '--hbx-g2': rgba(c.glow, 0.24), '--hbx-hi': c.hi, '--hbx-tc': c.text,
      '--hbx-clockc': c.clock, '--hbx-datec': c.date, '--hbx-headc': c.head, '--hbx-neonc': mix(c.glow, '#ffffff', 0.82),
      '--hbx-cardc': toHex(c.card) || c.card, '--hbx-btn': c.btn, '--hbx-btnink': c.btnInk
    };
    let hostVars = {};
    try { hostVars = H.vars ? H.vars(c, changed) || {} : {}; } catch (e) {}
    const k = STR_K[L.str] || 1;
    const decl = Object.entries({ ...out, ...hostVars }).map(([n, v]) => `${n}:${v}!important`).join(';') + `;--hbx-k:${k}`;
    const want = `html:root{${decl}}`;
    if (ovEl.textContent !== want) ovEl.textContent = want;
    PAINTED = c;
    return c;
  }
  let PAINTED = null;

  /* ---------- background motions (DOM + CSS: transforms and opacity) ---------- */
  const GLYPHS = 'アカサタナハマヤラワイキシチニヒミリウクスツヌフムユルエケセテネヘメレオコソトノホモヨロ0123456789ABCDEFZ';
  function motionHtml(id, mini, perf) {
    const r = rng(hash(id + (mini ? 'm' : 'f'))), n = (full, small, lite) => mini ? small : perf ? lite : full;
    let h = '';
    switch (id) {
      case 'neongrid':
        return '<div class="ng-sky"></div><div class="ng-sun"></div><div class="ng-plane"><div class="ng-lines"></div></div><div class="ng-haze"></div>';
      case 'rain': {
        const cols = n(26, 8, 14);
        for (let i = 0; i < cols; i++) {
          let s = ''; const len = 10 + Math.floor(r() * 14);
          for (let j = 0; j < len; j++) s += GLYPHS[Math.floor(r() * GLYPHS.length)];
          const d = f1(5 + r() * 7), x = f1((i + r() * 0.6) * 100 / cols), dl = f1(-r() * d);
          h += `<i style="left:${x}%;animation-duration:${d}s;animation-delay:${dl}s;--o:${f1(0.35 + r() * 0.6)}">${s}</i>`;
        }
        return h;
      }
      case 'hyper': {
        const k = n(46, 16, 24);
        for (let i = 0; i < k; i++) {
          const a = f1(r() * 360), d = f1(1.2 + r() * 1.6), dl = f1(-r() * d), c = ['--mc1', '--mc2', '--mc3'][i % 3];
          h += `<i style="rotate:${a}deg"><b style="animation-duration:${d}s;animation-delay:${dl}s;--c:var(${c})"></b></i>`;
        }
        return '<div class="hy-core"></div>' + h;
      }
      case 'const': {
        const k = n(30, 11, 20), pts = [];
        for (let i = 0; i < k; i++) pts.push([f1(4 + r() * 92), f1(6 + r() * 88)]);
        let lines = '';
        pts.forEach((p, i) => { const near = pts.map((q, j) => [j, (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2]).filter(x => x[0] > i).sort((a, b) => a[1] - b[1]).slice(0, 2);
          near.forEach(([j, d2]) => { if (d2 < 520) lines += `<line x1="${p[0]}" y1="${p[1]}" x2="${pts[j][0]}" y2="${pts[j][1]}"/>`; }); });
        const stars = pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${f1(0.35 + r() * 0.5)}" style="animation-duration:${f1(2 + r() * 3)}s;animation-delay:${f1(-r() * 4)}s;fill:var(${i % 4 ? '--mc1' : '--mc3'})"/>`).join('');
        return `<svg class="cs-s" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><g class="cs-l">${lines}</g>${stars}</svg>`;
      }
      case 'circuit': {
        const k = n(14, 5, 9); let paths = '', pulses = '';
        for (let i = 0; i < k; i++) {
          let x = f1(r() * 100), y = f1(r() * 100), d = `M${x} ${y}`, len = 0;
          for (let s = 0; s < 4; s++) { const horiz = s % 2 === (i % 2), step = f1(8 + r() * 22) * (r() < 0.5 ? -1 : 1); if (horiz) x = f1(Math.max(0, Math.min(100, x + step))); else y = f1(Math.max(0, Math.min(100, y + step))); d += ` L${x} ${y}`; len += Math.abs(step); }
          paths += `<path d="${d}"/><circle cx="${x}" cy="${y}" r=".8"/>`;
          pulses += `<path class="cb-p" d="${d}" pathLength="100" style="animation-duration:${f1(3 + r() * 4)}s;animation-delay:${f1(-r() * 6)}s;stroke:var(${i % 3 ? '--mc1' : '--mc2'})"/>`;
        }
        return `<svg class="cb-s" viewBox="0 0 100 100" preserveAspectRatio="none"><g class="cb-t">${paths}</g>${pulses}</svg>`;
      }
      case 'field':
        return '<div class="ff-hex"></div><i class="ff-r"></i><i class="ff-r" style="animation-delay:-2s"></i><i class="ff-r" style="animation-delay:-4s"></i><div class="ff-band"></div>';
      case 'radar': {
        let b = '';
        for (let i = 0; i < n(7, 3, 5); i++) { const a = r() * 360, d = 12 + r() * 30; b += `<i class="rd-b" style="left:${f1(50 + Math.cos(a * Math.PI / 180) * d)}%;top:${f1(50 + Math.sin(a * Math.PI / 180) * d)}%;animation-delay:${f1(((a + 90) % 360) / 360 * 4 - 4)}s"></i>`; }
        return `<div class="rd-w"><div class="rd-g"></div><div class="rd-sw"></div>${b}</div>`;
      }
      case 'tunnel': { const k = n(9, 6, 7); for (let i = 0; i < k; i++) h += `<i style="animation-delay:${f1(-i * 5 / k)}s;--c:var(${['--mc1', '--mc2', '--mc3'][i % 3]})"></i>`; return h; }
      case 'orbs': { for (let i = 0; i < n(5, 3, 4); i++) h += `<i style="left:${f1(r() * 70)}%;top:${f1(r() * 60)}%;--c:var(${['--mc1', '--mc2', '--mc3'][i % 3]});animation-duration:${f1(22 + r() * 18)}s;animation-delay:${f1(-r() * 30)}s"></i>`; return h; }
      case 'stream': { for (let i = 0; i < n(34, 12, 18); i++) { const d = f1(1.6 + r() * 3); h += `<i style="top:${f1(r() * 100)}%;height:${r() < 0.3 ? 3 : r() < 0.6 ? 2 : 1}px;animation-duration:${d}s;animation-delay:${f1(-r() * d)}s;--c:var(${i % 4 ? '--mc1' : '--mc2'})"></i>`; } return h; }
      case 'swarm': { for (let i = 0; i < n(48, 16, 26); i++) { const d = f1(8 + r() * 22); h += `<i style="animation-duration:${d}s;animation-delay:${f1(-r() * d)}s;animation-direction:${i % 3 ? 'normal' : 'reverse'}"><b style="left:${f1(52 + r() * 42)}%;--c:var(${['--mc1', '--mc2', '--mc3'][i % 3]});scale:${f1(0.5 + r())}"></b></i>`; } return '<div class="sw-core"></div>' + h; }
      case 'eq': { const k = n(36, 14, 24); for (let i = 0; i < k; i++) h += `<i style="left:${f1(i * 100 / k)}%;width:${f1(100 / k * 0.62)}%;animation-duration:${f1(0.5 + r() * 1.1)}s;animation-delay:${f1(-r() * 2)}s"></i>`; return h; }
      case 'lasers': { for (let i = 0; i < n(7, 4, 5); i++) h += `<i style="left:${f1(8 + i * 84 / n(6, 3, 4))}%;--c:var(${['--mc1', '--mc2', '--mc3'][i % 3]});animation-duration:${f1(3 + r() * 3)}s;animation-delay:${f1(-r() * 6)}s"></i>`; return h; }
      case 'globe': { for (let i = 0; i < 6; i++) h += `<i class="gm" style="animation-delay:${f1(-i)}s"></i>`; for (const y of [0.35, 0.7, 1]) h += `<i class="gl" style="scale:1 ${y}"></i>`; return `<div class="gb-w">${h}</div>`; }
      case 'bokeh': { for (let i = 0; i < n(20, 8, 12); i++) { const z = f1(4 + r() * 12), d = f1(14 + r() * 16); h += `<i style="left:${f1(r() * 100)}%;width:${z}%;--c:var(${['--mc1', '--mc2', '--mc3'][i % 3]});animation-duration:${d}s;animation-delay:${f1(-r() * d)}s;opacity:${f1(0.25 + r() * 0.4)}"></i>`; } return h; }
      case 'waves': { const wave = (a, c, y, d) => `<svg viewBox="0 0 200 40" preserveAspectRatio="none" style="top:${y}%;animation-duration:${d}s"><path d="M0 20 ${[0, 1, 2, 3].map(j => `Q${j * 50 + 12.5} ${20 - a} ${j * 50 + 25} 20 T${j * 50 + 50} 20`).join(' ')}" style="stroke:var(${c})"/></svg>`;
        return wave(12, '--mc1', 52, 9) + wave(8, '--mc2', 60, 13) + wave(16, '--mc3', 44, 17) + wave(5, '--mc1', 68, 7); }
      case 'comets': { for (let i = 0; i < n(9, 4, 6); i++) { const d = f1(3 + r() * 4); h += `<i style="top:${f1(r() * 90)}%;animation-duration:${d}s;animation-delay:${f1(-r() * d * 2)}s;--c:var(${['--mc1', '--mc2', '--mc3'][i % 3]})"></i>`; } return `<div class="cm-w">${h}</div>`; }
    }
    return '';
  }
  const MOTION_CSS = `
.hbx-mo{position:fixed;inset:0;overflow:hidden;pointer-events:none;contain:strict;z-index:0}
.hbx-mo.mini{position:absolute;contain:paint}
.hbx-mo i,.hbx-mo b{position:absolute;display:block;font-style:normal}
.mo-neongrid{perspective:300px;background:radial-gradient(120% 70% at 50% 100%,color-mix(in srgb,var(--mc2) 18%,transparent),transparent 70%)}
.mo-neongrid .ng-sun{position:absolute;left:50%;top:40%;width:15%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;background:linear-gradient(180deg,var(--mc3),var(--mc2));opacity:.55;
  -webkit-mask:repeating-linear-gradient(180deg,#000 0 7%,transparent 7% 9%);mask:repeating-linear-gradient(180deg,#000 0 7%,transparent 7% 9%);filter:drop-shadow(0 0 2vmin var(--mc2))}
.mo-neongrid .ng-plane{position:absolute;left:-50%;right:-50%;bottom:0;height:52%;overflow:hidden;-webkit-mask:linear-gradient(180deg,transparent,#000 40%);mask:linear-gradient(180deg,transparent,#000 40%)}
.mo-neongrid .ng-lines{position:absolute;left:0;right:0;top:-40%;height:240%;transform-origin:50% 0;transform:rotateX(68deg);
  background:linear-gradient(90deg,var(--mc1) 2px,transparent 2px) 0 0/6% 100%,linear-gradient(0deg,var(--mc1) 2px,transparent 2px) 0 0/100% 8%;opacity:.55;animation:ng-run 1.6s linear infinite}
.hbx-mo.mini .ng-lines{background-size:8% 100%,100% 10%}
@keyframes ng-run{to{translate:0 8%}}
.mo-neongrid .ng-haze{position:absolute;left:0;right:0;top:40%;height:12%;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--mc1) 30%,transparent) 55%,transparent);opacity:.8}
.mo-rain i{top:0;height:100%;writing-mode:vertical-rl;text-orientation:upright;font:600 1.6vmin/1.05 ui-monospace,monospace;letter-spacing:.1em;color:var(--mc1);opacity:var(--o);
  text-shadow:0 0 .6em var(--mc1);-webkit-mask:linear-gradient(180deg,transparent,#000 75%,#fff);mask:linear-gradient(180deg,transparent,#000 75%);animation:rn-fall 8s linear infinite;will-change:transform}
.hbx-mo.mini.mo-rain i{font-size:7px}
@keyframes rn-fall{from{translate:0 -100%}to{translate:0 100%}}
.mo-hyper{background:radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--mc1) 14%,transparent),transparent 45%)}
.mo-hyper i{left:0;top:0;width:100%;height:100%}
.mo-hyper b{left:50%;top:50%;width:50%;height:2px;margin-top:-1px;transform-origin:0 50%;background:linear-gradient(90deg,transparent,var(--c));border-radius:2px;animation:hy-go 2s cubic-bezier(.55,0,1,.45) infinite;will-change:transform,opacity}
.hbx-mo.mini.mo-hyper b{height:1px}
@keyframes hy-go{0%{transform:translateX(4%) scaleX(.05);opacity:0}20%{opacity:1}100%{transform:translateX(110%) scaleX(.9);opacity:0}}
.mo-hyper .hy-core{left:50%;top:50%;width:12%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;background:radial-gradient(circle,#fff,var(--mc1) 30%,transparent 70%);opacity:.35;animation:hy-core 3s ease-in-out infinite}
@keyframes hy-core{50%{opacity:.6;scale:1.25}}
.mo-const .cs-s{position:absolute;inset:-4%;width:108%;height:108%;animation:cs-drift 120s linear infinite}
.mo-const .cs-l line{stroke:var(--mc1);stroke-width:1;opacity:.3;vector-effect:non-scaling-stroke}
.mo-const circle{animation:cs-tw 3s ease-in-out infinite;filter:drop-shadow(0 0 .6px #fff)}
@keyframes cs-tw{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes cs-drift{0%,100%{translate:0 0}50%{translate:-2% 1.5%}}
.mo-circuit .cb-s{position:absolute;inset:0;width:100%;height:100%}
.mo-circuit .cb-t path{fill:none;stroke:var(--mc1);stroke-width:1.2;opacity:.22;vector-effect:non-scaling-stroke}
.mo-circuit .cb-t circle{fill:var(--mc1);opacity:.4}
.mo-circuit .cb-p{fill:none;stroke-width:2.2;stroke-linecap:round;stroke-dasharray:6 94;stroke-dashoffset:100;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 2px currentColor);animation:cb-run 4s linear infinite}
@keyframes cb-run{to{stroke-dashoffset:0}}
.mo-field .ff-hex{position:absolute;inset:0;opacity:.22;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='97' viewBox='0 0 56 97'%3E%3Cpath d='M28 0 56 16v32L28 64 0 48V16zM28 64v33' fill='none' stroke='%23fff' stroke-width='1.4'/%3E%3C/svg%3E") 0 0/56px 97px;
  -webkit-mask:radial-gradient(ellipse at 50% 55%,#000 10%,transparent 72%);mask:radial-gradient(ellipse at 50% 55%,#000 10%,transparent 72%)}
.mo-field{background:radial-gradient(ellipse at 50% 55%,color-mix(in srgb,var(--mc1) 16%,transparent),transparent 65%)}
.mo-field .ff-hex{background-color:transparent}
.mo-field .ff-r{left:50%;top:55%;width:70vmin;aspect-ratio:1;margin:-35vmin 0 0 -35vmin;border-radius:50%;border:2px solid var(--mc1);box-shadow:0 0 2vmin var(--mc1);animation:ff-ring 6s ease-out infinite;opacity:0}
.hbx-mo.mini .ff-r{width:70%;margin:-35% 0 0 -35%;border-width:1px}
@keyframes ff-ring{0%{scale:.1;opacity:.7}100%{scale:1.6;opacity:0}}
.mo-field .ff-band{position:absolute;left:0;right:0;top:0;height:30%;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--mc2) 16%,transparent),transparent);animation:ff-band 7s ease-in-out infinite}
@keyframes ff-band{0%{translate:0 -100%}100%{translate:0 360%}}
.mo-radar .rd-w{position:absolute;left:50%;top:50%;width:min(84vmin,92%);aspect-ratio:1;translate:-50% -50%;opacity:.55}
.hbx-mo.mini .rd-w{width:92%}
.mo-radar .rd-g{position:absolute;inset:0;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 15.5%,color-mix(in srgb,var(--mc1) 60%,transparent) 15.5% 16%),
  linear-gradient(90deg,transparent 49.85%,color-mix(in srgb,var(--mc1) 50%,transparent) 49.85% 50.15%,transparent 50.15%),linear-gradient(0deg,transparent 49.85%,color-mix(in srgb,var(--mc1) 50%,transparent) 49.85% 50.15%,transparent 50.15%);
  -webkit-mask:radial-gradient(circle,#000 69%,transparent 70%);mask:radial-gradient(circle,#000 69%,transparent 70%)}
.mo-radar .rd-sw{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 280deg,color-mix(in srgb,var(--mc1) 55%,transparent) 358deg,var(--mc1) 360deg);
  -webkit-mask:radial-gradient(circle,#000 69%,transparent 70%);mask:radial-gradient(circle,#000 69%,transparent 70%);animation:rd-spin 4s linear infinite}
@keyframes rd-spin{to{rotate:360deg}}
.mo-radar .rd-b{width:1.4%;aspect-ratio:1;margin:-.7%;border-radius:50%;background:var(--mc3);box-shadow:0 0 1.4vmin var(--mc3);animation:rd-blip 4s linear infinite;opacity:0}
@keyframes rd-blip{0%{opacity:1;scale:1.4}60%{opacity:.15;scale:1}100%{opacity:0}}
.mo-tunnel{background:radial-gradient(circle,color-mix(in srgb,var(--mc1) 12%,transparent),transparent 60%)}
.mo-tunnel i{left:50%;top:50%;width:150%;aspect-ratio:1;translate:-50% -50%;border:2px solid var(--c);border-radius:22%;box-shadow:0 0 12px var(--c);opacity:0;animation:tn-go 5s cubic-bezier(.5,0,1,.6) infinite}
@keyframes tn-go{0%{transform:scale(.02) rotate(0);opacity:0}20%{opacity:.8}100%{transform:scale(1) rotate(45deg);opacity:0}}
.mo-orbs i{width:45%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--c) 55%,transparent),transparent 68%);mix-blend-mode:screen;animation:ob-drift 30s ease-in-out infinite alternate}
@keyframes ob-drift{0%{transform:translate(-20%,-10%) scale(.9)}50%{transform:translate(30%,25%) scale(1.25)}100%{transform:translate(-10%,40%) scale(1)}}
.mo-stream i{left:-20%;width:20%;background:linear-gradient(90deg,transparent,var(--c));border-radius:3px;animation:st-go 3s linear infinite;opacity:.75}
@keyframes st-go{to{transform:translateX(620%)}}
.mo-swarm i{left:0;top:0;width:100%;height:100%;animation:sw-spin 20s linear infinite}
.mo-swarm b{top:50%;width:.5vmin;min-width:3px;aspect-ratio:1;border-radius:50%;background:var(--c);box-shadow:0 0 6px var(--c)}
@keyframes sw-spin{to{rotate:360deg}}
.mo-swarm .sw-core{left:50%;top:50%;width:18%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--mc1) 40%,transparent),transparent 70%);animation:hy-core 4s ease-in-out infinite}
.mo-eq i{bottom:0;height:42%;transform-origin:50% 100%;border-radius:4px 4px 0 0;background:linear-gradient(0deg,var(--mc1),var(--mc2) 70%,var(--mc3));opacity:.45;animation:eq-b 1s ease-in-out infinite alternate}
@keyframes eq-b{from{transform:scaleY(.08)}to{transform:scaleY(1)}}
.mo-lasers i{bottom:-5%;width:3px;height:150%;transform-origin:50% 100%;background:linear-gradient(0deg,var(--c),transparent 85%);box-shadow:0 0 8px var(--c);opacity:.6;animation:ls-sweep 4s ease-in-out infinite alternate}
@keyframes ls-sweep{from{transform:rotate(-38deg)}to{transform:rotate(38deg)}}
.mo-globe .gb-w{position:absolute;left:50%;top:50%;width:min(56vmin,70%);aspect-ratio:1;translate:-50% -50%;border-radius:50%;box-shadow:0 0 4vmin color-mix(in srgb,var(--mc1) 35%,transparent),inset 0 0 3vmin color-mix(in srgb,var(--mc1) 25%,transparent);opacity:.7}
.hbx-mo.mini.mo-globe .gb-w{width:62%}
.mo-globe i{inset:0;border-radius:50%;border:1.5px solid var(--mc1)}
.mo-globe .gm{animation:gb-turn 6s ease-in-out infinite}
.mo-globe .gl{border-color:color-mix(in srgb,var(--mc2) 70%,transparent)}
@keyframes gb-turn{0%,100%{transform:scaleX(1)}50%{transform:scaleX(-1)}}
.mo-bokeh i{bottom:-20%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--c) 80%,transparent) 0 40%,transparent 70%);animation:bk-up 20s linear infinite}
@keyframes bk-up{from{transform:translateY(0) scale(.8)}to{transform:translateY(-900%) scale(1.2)}}
.mo-waves svg{position:absolute;left:0;width:200%;height:22%;animation:wv-go 10s linear infinite;overflow:visible}
.mo-waves path{fill:none;stroke-width:2;vector-effect:non-scaling-stroke;opacity:.6;filter:drop-shadow(0 0 3px currentColor)}
@keyframes wv-go{to{transform:translateX(-50%)}}
.mo-comets .cm-w{position:absolute;inset:-30%;rotate:-28deg}
.mo-comets i{left:0;width:16%;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--c),#fff);box-shadow:0 0 8px var(--c);animation:cm-go 5s cubic-bezier(.4,0,.8,1) infinite;opacity:0}
@keyframes cm-go{0%{transform:translateX(-100%);opacity:0}10%{opacity:1}60%{opacity:1}75%,100%{transform:translateX(700%);opacity:0}}
html.hbx-perf .mo-waves path{filter:none}
html.hbx-perf .mo-rain i{text-shadow:none}
html.hbx-perf .mo-neongrid .ng-haze,html.hbx-perf .mo-neongrid .ng-sun{filter:none}
@media (prefers-reduced-motion: reduce){.hbx-mo *,.hbx-pal *{animation-play-state:paused!important}.hbx-pal{display:none}}
`;
  /* Mounts (or swaps) the background motion layer. */
  function mountMotion() {
    const box = typeof H.motionBox === 'function' ? H.motionBox() : H.motionBox;
    const id = L.motion, perf = !!H.perf(), key = [id, perf, L.mset].join('|');
    if (!id || !box) { if (moEl) { moEl.remove(); moEl = null; moKey = ''; } return; }
    if (moEl && moKey === key && moEl.isConnected) { setMset(moEl); return; }
    if (!moEl) { moEl = document.createElement('div'); moEl.setAttribute('aria-hidden', 'true'); }
    moEl.className = `hbx-mo mo-${id}`;
    moEl.innerHTML = motionHtml(id, false, perf);
    setMset(moEl);
    if (moEl.parentNode !== box) box.insertBefore(moEl, box.firstChild);
    moKey = key;
  }
  function setMset(el, set) {
    const m = MSETS.find(x => x[0] === (set || L.mset));
    const cols = m && m[2] ? m[2] : [PAINTED ? PAINTED.glow : '#00F0FF', PAINTED ? PAINTED.hi : '#FF2BD6', PAINTED ? mix(PAINTED.glow, '#ffffff', 0.5) : '#7CFF4F'];
    el.style.setProperty('--mc1', cols[0]); el.style.setProperty('--mc2', cols[1]); el.style.setProperty('--mc3', cols[2] || cols[0]);
  }

  /* ---------- the little characters (original, anime-style chibis) ---------- */
  const eyes = (x1, x2, y, c) => [x1, x2].map(x => `<g class="pl-eye" style="transform-origin:${x}px ${y}px"><ellipse cx="${x}" cy="${y}" rx="4.6" ry="6" fill="#241a33"/><ellipse cx="${x}" cy="${y + 1.6}" rx="3.4" ry="3.6" fill="${c}"/><circle cx="${x - 1.6}" cy="${y - 2.4}" r="1.9" fill="#fff"/><circle cx="${x + 1.7}" cy="${y + 2.4}" r=".9" fill="#fff"/></g>`).join('');
  const cheeks = (x1, x2, y) => `<ellipse cx="${x1}" cy="${y}" rx="4" ry="2.2" fill="#FF8FB1" opacity=".7"/><ellipse cx="${x2}" cy="${y}" rx="4" ry="2.2" fill="#FF8FB1" opacity=".7"/>`;
  const mouth = (x, y) => `<path d="M${x - 2.6} ${y} Q${x} ${y + 3} ${x + 2.6} ${y}" fill="none" stroke="#241a33" stroke-width="1.6" stroke-linecap="round"/>`;
  const PALS = {
    /* Momo: a round marshmallow puff with floppy ears */
    momo: () => `<g class="pl-body"><path d="M30 34 C22 14 30 6 36 10 C40 14 38 26 38 32Z" fill="#FFE3EE" stroke="#3a2a4a" stroke-width="2"/><path d="M70 34 C78 14 70 6 64 10 C60 14 62 26 62 32Z" fill="#FFE3EE" stroke="#3a2a4a" stroke-width="2"/>
      <ellipse cx="50" cy="60" rx="30" ry="27" fill="#FFF6FA" stroke="#3a2a4a" stroke-width="2.2"/>${eyes(40, 60, 57, '#8E6BFF')}${cheeks(33, 67, 66)}${mouth(50, 67)}
      <g class="pl-arm" style="transform-origin:76px 64px"><ellipse cx="82" cy="58" rx="6" ry="5" fill="#FFF6FA" stroke="#3a2a4a" stroke-width="2"/></g></g>`,
    /* Bolt: a tiny robot with a visor and a star antenna */
    bolt: () => `<g class="pl-body"><line x1="50" y1="22" x2="50" y2="12" stroke="#3a2a4a" stroke-width="2"/><path class="pl-star" style="transform-origin:50px 9px" d="M50 3 L52 8 L57 8.5 L53 11.5 L54.5 16 L50 13.5 L45.5 16 L47 11.5 L43 8.5 L48 8Z" fill="#FFE066" stroke="#3a2a4a" stroke-width="1.2"/>
      <rect x="24" y="22" width="52" height="42" rx="14" fill="#CFE8FF" stroke="#3a2a4a" stroke-width="2.2"/><rect x="30" y="31" width="40" height="22" rx="10" fill="#1d2440"/>
      <g class="pl-eye" style="transform-origin:50px 42px"><rect x="36" y="37" width="8" height="10" rx="4" fill="#5CF6FF"/><rect x="56" y="37" width="8" height="10" rx="4" fill="#5CF6FF"/></g>
      <rect x="32" y="64" width="36" height="20" rx="8" fill="#A9D2FF" stroke="#3a2a4a" stroke-width="2"/><circle cx="50" cy="74" r="3.4" fill="#FF6FB5"/>
      <g class="pl-arm" style="transform-origin:68px 68px"><rect x="68" y="62" width="14" height="7" rx="3.5" fill="#CFE8FF" stroke="#3a2a4a" stroke-width="2"/></g></g>`,
    /* Kiki: a sleepy-happy star sprite */
    kiki: () => `<g class="pl-body"><path d="M50 10 L61 36 L89 38 L67 56 L75 84 L50 68 L25 84 L33 56 L11 38 L39 36Z" fill="#FFE27A" stroke="#3a2a4a" stroke-width="2.2" stroke-linejoin="round"/>
      ${eyes(42, 58, 47, '#FF9B3D')}${cheeks(35, 65, 56)}${mouth(50, 57)}<g class="pl-arm" style="transform-origin:80px 40px"><circle cx="86" cy="34" r="3" fill="#fff"/></g></g>`,
    /* Tofu: a squishy cube cat */
    tofu: () => `<g class="pl-body"><path d="M24 30 L30 14 L40 28Z M76 30 L70 14 L60 28Z" fill="#F4F1E8" stroke="#3a2a4a" stroke-width="2" stroke-linejoin="round"/>
      <rect x="20" y="26" width="60" height="56" rx="16" fill="#FBF8F0" stroke="#3a2a4a" stroke-width="2.2"/>${eyes(39, 61, 50, '#3DBB8F')}${cheeks(31, 69, 60)}
      <path d="M46 61 Q50 65 50 61 Q50 65 54 61" fill="none" stroke="#241a33" stroke-width="1.6" stroke-linecap="round"/>
      <g class="pl-arm" style="transform-origin:78px 64px"><ellipse cx="84" cy="60" rx="6" ry="5" fill="#FBF8F0" stroke="#3a2a4a" stroke-width="2"/></g></g>`
  };
  const PAL_NAMES = Object.keys(PALS);
  const palSvg = n => `<svg viewBox="0 0 100 100" aria-hidden="true">${PALS[n]()}</svg>`;
  const PAL_CSS = `
.hbx-pal{position:fixed;z-index:30;pointer-events:none;width:clamp(70px,11vh,140px);aspect-ratio:1;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))}
.hbx-pal svg,.hbx-pv svg{display:block;width:100%;height:100%;overflow:visible}
.pl-eye{animation:pl-blink 4.2s linear infinite}
@keyframes pl-blink{0%,92%,100%{scale:1 1}95%{scale:1 .1}}
.pl-arm{animation:pl-wave .8s ease-in-out infinite}
@keyframes pl-wave{0%,100%{rotate:-14deg}50%{rotate:22deg}}
.pl-star{animation:pl-spin 3s linear infinite}
@keyframes pl-spin{to{rotate:360deg}}
.pl-body{animation:pl-bob 1.2s ease-in-out infinite}
@keyframes pl-bob{0%,100%{translate:0 0}50%{translate:0 -3px}}
.hbx-pal.peek{right:6vw;bottom:var(--hbx-safe,0px);animation:pl-peek 6.5s ${E} forwards}
@keyframes pl-peek{0%{translate:0 110%;opacity:0}10%{opacity:1}14%,82%{translate:0 0}100%{translate:0 110%;opacity:0}}
.hbx-pal.zip{left:0;top:8vh;animation:pl-zip 7s linear forwards}
@keyframes pl-zip{from{translate:-20vw 0}to{translate:120vw 0}}
.hbx-pal.zip > svg{animation:pl-zipy 1.4s ease-in-out infinite}
@keyframes pl-zipy{0%,100%{translate:0 0;rotate:-6deg}50%{translate:0 2.4vh;rotate:6deg}}
.hbx-pal.hop{left:0;bottom:var(--hbx-safe,0px);animation:pl-zip 9s linear forwards}
.hbx-pal.hop > svg{animation:pl-hop .75s ease-in-out infinite;transform-origin:50% 100%}
@keyframes pl-hop{0%,100%{translate:0 0;scale:1.06 .94}45%{translate:0 -32%;scale:.96 1.05}}
.hbx-confetti{position:fixed;inset:0;z-index:31;pointer-events:none;overflow:hidden}
.hbx-confetti i{position:absolute;top:-4vh;width:1vh;height:1.6vh;border-radius:2px;opacity:.9;animation:hbx-fall linear both}
@keyframes hbx-fall{to{transform:translate3d(4vw,112vh,0) rotate(540deg);opacity:.7}}
.hbx-pal .pl-trail{position:absolute;right:90%;top:40%;width:60%;height:14%;border-radius:9px;background:linear-gradient(90deg,transparent,var(--hbx-hi));opacity:.6}
`;
  let palN = 0;
  function palVisit(force) {
    if (!force && (L.fun === 'calm' || document.hidden || still() || H.busy())) return;
    if (document.querySelector('.hbx-pal')) return;
    const n = PAL_NAMES[palN % PAL_NAMES.length], mode = typeof force === 'string' ? force : ['peek', 'zip', 'hop'][palN % 3]; palN++;
    const el = document.createElement('div'); el.className = 'hbx-pal ' + mode;
    el.style.setProperty('--hbx-safe', H.safeBottom || '0px');
    el.innerHTML = (mode === 'zip' ? '<i class="pl-trail"></i>' : '') + palSvg(n);
    el.addEventListener('animationend', e => { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
  }
  function palSchedule() {
    clearTimeout(palT);
    if (L.fun === 'calm') { document.querySelectorAll('.hbx-pal').forEach(x => x.remove()); return; }
    greet();
    const ms = L.fun === 'party' ? Math.min(OFTEN_MS[L.palsOften] || OFTEN_MS.some, OFTEN_MS.often) : OFTEN_MS[L.palsOften] || OFTEN_MS.some;
    palT = setTimeout(() => { palVisit(); palSchedule(); }, ms * (0.75 + Math.random() * 0.5));
  }

  /* A character peeks up and waves the first time the screen is seen each day (after 5 am). */
  function greet() {
    if (L.fun === 'calm' || document.hidden || still() || H.busy() || new Date().getHours() < 5) return;
    const day = new Date().toDateString(); let last = '';
    try { last = localStorage.getItem('hbx.greet') || ''; } catch (e) {}
    if (last === day) return;
    try { localStorage.setItem('hbx.greet', day); } catch (e) {}
    setTimeout(() => palVisit('peek'), 2500);
  }
  /* Chores all done: a character hops across (Party adds a burst of confetti). */
  function cheer() {
    if (L.fun === 'calm' || document.hidden || still()) return;
    palVisit('hop');
    if (L.fun !== 'party' || H.perf()) return;
    const box = document.createElement('div'); box.className = 'hbx-confetti'; box.setAttribute('aria-hidden', 'true');
    const cols = [PAINTED ? PAINTED.glow : '#6DC2A4', PAINTED ? PAINTED.hi : '#F0B43C', '#FF8FB1', '#ffffff'], r = rng(Date.now());
    let h = ''; for (let i = 0; i < 36; i++) h += `<i style="left:${f1(r() * 100)}vw;background:${cols[i % 4]};animation-delay:${f1(r() * 0.6)}s;animation-duration:${f1(2.4 + r() * 1.4)}s;rotate:${Math.round(r() * 360)}deg"></i>`;
    box.innerHTML = h; document.body.appendChild(box); setTimeout(() => box.remove(), 4500);
  }

  /* ---------- keeping repeating animations in step with the clock ----------
     Every repeating animation here gets the same time origin (the wall clock), so when a part of the page is
     redrawn its animation carries on from where the clock says it should be, instead of starting over. */
  let lockQ = 0;
  function lock() {
    if (lockQ) return;
    lockQ = requestAnimationFrame(() => {
      lockQ = 0;
      if (!document.getAnimations) return;
      const origin = performance.now() - Date.now() % 3600000;
      for (const a of document.getAnimations()) {
        const nm = a.animationName || '';
        if (!/^(hbx-|ng-|rn-|hy-|cs-|cb-|ff-|rd-|tn-|ob-|st-|sw-|eq-|ls-|gb-|bk-|wv-|cm-|pl-(blink|wave|spin|bob|zipy|hop))/.test(nm) || /^hbx-t-/.test(nm)) continue;
        try { const t = a.effect && a.effect.getTiming(); if (!t || t.iterations !== Infinity) continue; if (Math.abs((a.startTime || 0) - origin) > 2) a.startTime = origin; } catch (e) {}
      }
    });
  }

  /* ---------- apply ---------- */
  function apply(next) {
    L = norm(next);
    const R = document.documentElement;
    R.classList.add('hbx-on');
    R.classList.toggle('hbx-perf', !!H.perf());
    R.dataset.hbxPress = L.press;
    ['tilt', 'sheen', 'glass', 'drift', 'tod', 'wx', 'strip', 'boot', 'kb'].forEach(k => R.classList.toggle('hbx-' + k, L[k] === 'on'));
    R.dataset.hbxHoli = L.holi; R.dataset.hbxFun = L.fun;
    if (rootEl) { const css = rootCss(); if (rootEl.textContent !== css) rootEl.textContent = css; }
    paint();
    mountMotion();
    palSchedule();
    if (H.onFx) { try { H.onFx(fxForApp()); } catch (e) {} }
    lock();
    return L;
  }
  /* What the TV app needs for its own tiles: glow style, which tiles, strength, press effect and the colors. */
  function fxForApp() {
    const c = PAINTED || {};
    return { btn: L.btn, which: L.which, str: L.str, press: L.press, glow: L.colors.glow ? c.glow : '', tilt: L.tilt, sheen: L.sheen, snd: L.snd, vol: L.vol, art: L.art };
  }
  /* A press on a remote: the pressed element does the chosen press effect. */
  function press(el) {
    if (!el) return; el.classList.add('hbx-press');
    setTimeout(() => el.classList.remove('hbx-press'), 160);
  }

  /* ---------- previews (built once, kept) ---------- */
  const PREVIEW_CSS = `
.hbx-pv{position:relative;display:grid;place-items:center;overflow:hidden;width:100%;aspect-ratio:16/9;border-radius:10px;background:var(--pv-bg,#0d1412);color:var(--pv-ink,#eef2ef);font-family:inherit;isolation:isolate;contain:paint}
.hbx-pv .hbx-tx{font-weight:800;font-size:clamp(18px,2.4em,40px);line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums;--hbx-tc:var(--pv-ink,#eef2ef);color:var(--pv-ink,#eef2ef)}
.hbx-pv .hbx-b{display:inline-grid;place-items:center;min-width:42%;padding:.45em .9em;border-radius:999px;background:var(--pv-btn,rgba(255,255,255,.08));border:1px solid rgba(255,255,255,.18);font-weight:700;font-size:.82em;color:var(--pv-ink,#eef2ef)}
.hbx-pv .hbx-row{display:flex;gap:6%;width:86%;justify-content:center}.hbx-pv .hbx-row .hbx-b{min-width:0;flex:1;padding:.4em 0}
.hbx-pv .hbx-cd{width:62%;height:62%;border-radius:12%;background:var(--pv-card,rgba(255,255,255,.07));border:1px solid rgba(255,255,255,.14);display:flex;flex-direction:column;justify-content:center;gap:12%;padding:0 10%;box-sizing:border-box}
.hbx-pv .hbx-cd i{display:block;height:9%;border-radius:9px;background:currentColor;opacity:.35}.hbx-pv .hbx-cd i:first-child{width:55%;opacity:.8;background:var(--pv-head,var(--hbx-glow))}
.hbx-pv .pv-mini{position:absolute;inset:0}
.hbx-pv .pv-scene{position:absolute;inset:0;display:grid;grid-template-columns:1.1fr 1fr;gap:6%;padding:9% 8%;box-sizing:border-box;align-items:center}
.hbx-pv .pv-scene .hbx-tx{font-size:1.5em}.hbx-pv .pv-scene .hbx-cd{width:100%;height:78%}
.hbx-pv .pv-pal{width:42%;aspect-ratio:1}
.hbx-pv .pv-off{opacity:.6;font-weight:700}
.hbx-pv .pv-snd{width:30%;aspect-ratio:1;color:var(--hbx-glow);position:relative}.hbx-pv .pv-snd svg{width:100%;height:100%}.hbx-pv .pv-snd.off{color:currentColor;opacity:.6}
.hbx-pv .pv-snd.off::after{content:'';position:absolute;left:-6%;right:-6%;top:50%;height:2px;background:currentColor;rotate:-35deg}
.hbx-pv .pv-big{font-size:2.2em;line-height:1}.hbx-pv .pv-dim{opacity:.55;font-size:1.6em}
.hbx-pv.pv-persp{perspective:300px}
.hbx-pv .pv-card{position:relative;z-index:1;width:56%;height:58%;border-radius:12%;background:var(--hbx-cardc,#1a2420);border:1px solid rgba(255,255,255,.14);border-top-color:rgba(255,255,255,.3);display:flex;flex-direction:column;justify-content:center;gap:14%;padding:0 12%;box-sizing:border-box;overflow:hidden;box-shadow:0 8px 18px rgba(0,0,0,.35)}
.hbx-pv .pv-card i{display:block;height:10%;border-radius:9px;background:currentColor;opacity:.35}.hbx-pv .pv-card i:first-child{width:60%;opacity:.8;background:var(--hbx-glow)}
.hbx-pv .pv-tilt{animation:pv-tilt 3.2s ${E} infinite;box-shadow:0 12px 24px var(--hbx-g2)}
@keyframes pv-tilt{0%,100%{transform:rotateY(-12deg) rotateX(4deg) scale(1.04)}50%{transform:rotateY(12deg) rotateX(-4deg) scale(1.04)}}
.hbx-pv .pv-sheen::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.4) 50%,transparent 70%);animation:pv-sheen 2.4s ${E} infinite}
@keyframes pv-sheen{from{translate:-110% 0}60%,to{translate:110% 0}}
.hbx-pv .pv-blobs{position:absolute;inset:-20%;background:radial-gradient(circle at 30% 40%,var(--hbx-glow) 0 14%,transparent 30%),radial-gradient(circle at 70% 60%,var(--hbx-hi) 0 12%,transparent 28%),radial-gradient(circle at 50% 20%,#FF8FB1 0 8%,transparent 22%)}
.hbx-pv .pv-drift{animation:pv-drift 6s ease-in-out infinite alternate}
@keyframes pv-drift{to{translate:8% -6%}}
.hbx-pv .pv-glass{background:rgba(255,255,255,.12);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}.hbx-pv .pv-solid{background:var(--hbx-cardc,#1a2420)}
.hbx-pv .pv-tod{position:absolute;inset:0;background:linear-gradient(90deg,#F6B26B,#7AB8E8 35%,#4B3A7A 70%,#0B0E1E)}
.hbx-pv .pv-tag{position:relative;padding:.2em .7em;border-radius:9px;background:rgba(0,0,0,.45);color:#fff;font-weight:700}
.hbx-pv .pv-rain{position:absolute;inset:-50% 0 0;background:repeating-linear-gradient(105deg,transparent 0 9px,rgba(200,225,255,.35) 9px 10px);animation:pv-rain 1s linear infinite}
@keyframes pv-rain{to{translate:-8px 50%}}
.hbx-pv .pv-bars{display:flex;align-items:flex-end;gap:10%;width:34%;height:56%}.hbx-pv .pv-bars i{flex:1;border-radius:3px;background:rgba(255,255,255,.2)}.hbx-pv .pv-bars i.on{background:var(--hbx-glow)}
.hbx-pv .pv-strip{position:absolute;top:10%;right:6%;padding:.2em .6em;border-radius:99px;background:rgba(255,255,255,.12);font-size:.62em;font-weight:700;white-space:nowrap}
.hbx-pv .pv-logo{font-size:2.6em;line-height:1;color:var(--hbx-neonc,#fff);text-shadow:0 0 .2em var(--hbx-glow),0 0 .5em var(--hbx-g1);animation:pv-boot 2.8s ${E} infinite}
@keyframes pv-boot{0%{opacity:0;scale:.9}25%,75%{opacity:1;scale:1}100%{opacity:0;scale:1}}
.hbx-pv .pv-photo{position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,rgba(255,255,255,.55) 0 10%,transparent 11%),linear-gradient(135deg,#E8913A,#6B2E7A)}
.hbx-pv .pv-kb{animation:pv-kb var(--kbd,5.5s) linear infinite alternate}
@keyframes pv-kb{to{scale:1.18;translate:-5% 3%}}
.hbx-pv .pv-conf{position:absolute;inset:0;background:radial-gradient(circle,#FF8FB1 0 2px,transparent 3px) 0 0/22px 22px,radial-gradient(circle,var(--hbx-hi) 0 2px,transparent 3px) 11px 11px/22px 22px;opacity:.7;animation:pv-rain 2s linear infinite}
.hbx-pv .pv-pop{animation:pv-pop var(--pd,4s) ${E} infinite}
@keyframes pv-pop{0%,100%{translate:0 70%;opacity:0}15%,60%{translate:0 0;opacity:1}75%{translate:0 70%;opacity:0}}
.hbx-pv .pv-parts{position:absolute;inset:0;padding:8%;box-sizing:border-box;display:grid;grid-template-columns:1fr 1.1fr;gap:6%;align-items:center}
.hbx-pv .pv-parts > div{display:flex;flex-direction:column;gap:8%}
.hbx-pv .pv-parts .pc{font:800 1.25em/1 inherit;color:var(--pv-clock)}.hbx-pv .pv-parts .pd{font-size:.62em;font-weight:700;color:var(--pv-date)}
.hbx-pv .pv-parts .pk{height:100%;border-radius:10px;background:var(--pv-card);padding:10%;box-sizing:border-box;display:flex;flex-direction:column;gap:12%}
.hbx-pv .pv-parts .ph{height:12%;width:60%;border-radius:4px;background:var(--pv-head)}.hbx-pv .pv-parts .pt{height:9%;border-radius:4px;background:var(--pv-ink);opacity:.55}
.hbx-pv .pv-parts .pb{margin-top:auto;height:22%;width:70%;border-radius:999px;background:var(--pv-btn);box-shadow:0 0 10px var(--pv-glow)}
.hbx-pv .pv-parts .ps{color:var(--pv-hi);font-size:.8em;line-height:1}
.hbx-pv[data-on]{outline-offset:-3px!important}
.hbx-pv [data-on],.hbx-pv[data-on]{outline:2px solid #fff;outline-offset:2px;animation:pv-ring 1.6s ease-in-out infinite}
@keyframes pv-ring{50%{outline-color:transparent}}
.hbx-pv .pv-sw{position:absolute;inset:0;background:var(--sw)}
html.hbx-perf .hbx-opt:not(.on):not(:hover) .hbx-pv *{animation-play-state:paused!important}
`;
  const PV = new Map();
  function scene(o) {
    const c = o.colors || {};
    const v = `--pv-bg:${c.bg || 'var(--hbx-pvbg,#0d1412)'};--pv-ink:${c.text || '#eef2ef'};--pv-card:${c.card ? rgba(c.card, .8) : 'rgba(255,255,255,.07)'};--pv-head:${c.head || 'var(--hbx-glow)'};--pv-btn:${c.btn ? c.btn : 'rgba(255,255,255,.1)'};--hbx-glow:${c.glow || 'var(--hbx-glow)'};--hbx-g1:${c.glow ? rgba(c.glow, .5) : 'var(--hbx-g1)'};--hbx-g2:${c.glow ? rgba(c.glow, .24) : 'var(--hbx-g2)'}`;
    const mo = o.motion ? `<div class="hbx-mo mini mo-${o.motion}" style="${msetVars(o.mset, c)}">${motionHtml(o.motion, true)}</div>` : '';
    return `<div class="hbx-pv" data-t="${o.clock}" data-b="${o.btn}" data-c="${o.card}" style="${v}">${mo}<div class="pv-scene"><span class="hbx-tx" style="--pv-ink:${c.clock || c.text || '#eef2ef'}">8:45</span><div class="hbx-cd"><i></i><i></i><span class="hbx-b b-on" style="padding:.15em 0;font-size:.6em">OK</span></div></div></div>`;
  }
  function msetVars(set, c) {
    const m = MSETS.find(x => x[0] === set); const cols = m && m[2] ? m[2] : [(c && c.glow) || '#6DC2A4', (c && c.hi) || '#F0B43C', '#ffffff'];
    return `--mc1:${cols[0]};--mc2:${cols[1]};--mc3:${cols[2] || cols[0]}`;
  }
  /* The little picture for one option. key: the setting, id: the option. Cached by both. */
  function preview(key, id, extra) {
    const k = key + ':' + id + (extra ? ':' + extra : '');
    if (PV.has(k)) return PV.get(k);
    let h = '';
    switch (key) {
      case 'quick': { const q = QUICK.find(x => x[0] === id); h = q ? scene(q[2]) : ''; break; }
      case 'clock': case 'date': h = `<div class="hbx-pv" data-t="${id}"><span class="hbx-tx"${key === 'date' ? ' style="font-size:1.1em"' : ''}>${key === 'date' ? 'Sunday 8' : '8:45'}</span></div>`; break;
      case 'clockAnim': case 'dateAnim': h = `<div class="hbx-pv" data-a="${id}"><span class="hbx-tx">8:4<span class="hbx-d">5</span></span></div>`; break;
      case 'btn': h = `<div class="hbx-pv" data-b="${id}"><span class="hbx-b b-on">OK</span></div>`; break;
      case 'which': h = `<div class="hbx-pv" data-b="soft"><div class="hbx-row"><span class="hbx-b ${id === 'all' ? 'rest' : ''}">A</span><span class="hbx-b b-on">B</span><span class="hbx-b ${id === 'sel' ? '' : 'rest'}">C</span></div></div>`; break;
      case 'str': h = `<div class="hbx-pv" data-b="neon" style="--hbx-k:${STR_K[id]}"><span class="hbx-b b-on">OK</span></div>`; break;
      case 'press': h = `<div class="hbx-pv" data-p="${id}" data-b="soft"><span class="hbx-b b-on">OK</span></div>`; break;
      case 'card': h = `<div class="hbx-pv" data-c="${id}" style="background:radial-gradient(circle at 30% 30%,var(--hbx-g2),transparent 60%),var(--hbx-pvbg,#0d1412)"><div class="hbx-cd"><i></i><i></i><i></i></div></div>`; break;
      case 'motion': h = id ? `<div class="hbx-pv" style="--pv-bg:#05070d"><div class="hbx-mo mini mo-${id}" style="${msetVars(L.mset, PAINTED)}">${motionHtml(id, true)}</div></div>` : '<div class="hbx-pv"><span style="opacity:.6;font-weight:700">Off</span></div>'; break;
      case 'mset': h = `<div class="hbx-pv" style="--pv-bg:#05070d"><div class="hbx-mo mini mo-hyper" style="${msetVars(id, PAINTED)}">${motionHtml('hyper', true)}</div></div>`; break;
      case 'pals': h = id === 'on' ? `<div class="hbx-pv"><div class="pv-pal">${palSvg('momo')}</div></div>` : '<div class="hbx-pv"><span style="opacity:.6;font-weight:700">Off</span></div>'; break;
      case 'palsOften': h = `<div class="hbx-pv"><div class="pv-pal pv-pop" style="--pd:${id === 'rare' ? 6 : id === 'some' ? 3.6 : 2}s">${palSvg(id === 'rare' ? 'kiki' : id === 'some' ? 'bolt' : 'tofu')}</div></div>`; break;
      case 'part': h = partPreview(id); break;
      case 'fun': h = id === 'calm' ? '<div class="hbx-pv"><span class="pv-off">Calm</span></div>' : `<div class="hbx-pv">${id === 'party' ? '<i class="pv-conf"></i>' : ''}<div class="pv-pal pv-pop" style="--pd:${id === 'party' ? 2 : 3.6}s">${palSvg(id === 'party' ? 'kiki' : 'momo')}</div></div>`; break;
      default: if (FEEL[key]) { h = feelPreview(key, id); break; }
      case 'swatch': h = `<div class="hbx-pv"><i class="pv-sw" style="--sw:${id}"></i></div>`; break;
        h = `<div class="hbx-pv"></div>`;
    }
    PV.set(k, h);
    return h;
  }
  /* The feel switches: a small picture of what each one does ("Off" shows it plain). */
  const OFF = '<span class="pv-off">Off</span>';
  function feelPreview(key, id) {
    const on = id !== 'off', card = cls => `<div class="pv-card ${cls || ''}"><i></i><i></i></div>`;
    switch (key) {
      case 'tilt': return `<div class="hbx-pv pv-persp">${card(on ? 'pv-tilt' : '')}</div>`;
      case 'sheen': return `<div class="hbx-pv">${card(on ? 'pv-sheen' : '')}</div>`;
      case 'glass': return `<div class="hbx-pv"><div class="pv-blobs"></div>${card(on ? 'pv-glass' : 'pv-solid')}</div>`;
      case 'drift': return `<div class="hbx-pv"><div class="pv-blobs${on ? ' pv-drift' : ''}"></div></div>`;
      case 'tod': return on ? '<div class="hbx-pv"><div class="pv-tod"></div><span class="pv-tag">☀ → ☾</span></div>' : `<div class="hbx-pv">${OFF}</div>`;
      case 'wx': return on ? '<div class="hbx-pv pv-rainbox"><i class="pv-rain"></i><span class="pv-big">🌧</span></div>' : `<div class="hbx-pv">${OFF}</div>`;
      case 'holi': return id === 'off' ? `<div class="hbx-pv">${OFF}</div>` : `<div class="hbx-pv"><span class="pv-big${id === 'full' ? '' : ' pv-dim'}">${id === 'full' ? '🎃 🎄 🎉' : '🎃'}</span></div>`;
      case 'snd': return `<div class="hbx-pv"><span class="pv-snd${on ? '' : ' off'}">${ICONS.sound}</span></div>`;
      case 'vol': return `<div class="hbx-pv"><span class="pv-bars">${[1, 2, 3].map(n => `<i class="${n <= (id === 'low' ? 1 : id === 'mid' ? 2 : 3) ? 'on' : ''}" style="height:${n * 28}%"></i>`).join('')}</span></div>`;
      case 'strip': return on ? '<div class="hbx-pv"><span class="pv-strip">☁ 54° · ▂▄▆ · 2 home</span></div>' : `<div class="hbx-pv">${OFF}</div>`;
      case 'boot': return on ? '<div class="hbx-pv"><span class="pv-logo">⌂</span></div>' : `<div class="hbx-pv">${OFF}</div>`;
      case 'kb': return `<div class="hbx-pv"><div class="pv-photo${on ? ' pv-kb' : ''}"></div></div>`;
      case 'kbSpeed': return `<div class="hbx-pv"><div class="pv-photo pv-kb" style="--kbd:${id === 'slow' ? 9 : id === 'fast' ? 3 : 5.5}s"></div></div>`;
      case 'art': return id === 'real' ? '<div class="hbx-pv"><div class="pv-stripes"><i style="background:#E50914"></i><i style="background:#1CE783"></i><i style="background:#FF0000"></i><i style="background:#00A8E1"></i></div></div>'
        : '<div class="hbx-pv"><div class="pv-stripes"><i style="background:var(--hbx-glow)"></i><i style="background:color-mix(in srgb,var(--hbx-glow) 60%,#000)"></i><i style="background:var(--hbx-hi)"></i><i style="background:color-mix(in srgb,var(--hbx-glow) 40%,#fff)"></i></div></div>';
    }
    return '<div class="hbx-pv"></div>';
  }
  /* For a color part: a tiny screen with that part outlined. */
  function partPreview(part) {
    const c = PAINTED || {}, on = p => p === part ? ' data-on' : '';
    const v = `--pv-bg:${c.bg || '#0d1412'};--pv-ink:${c.text || '#eef2ef'};--pv-card:${c.card || '#1a2420'};--pv-head:${c.head || '#6DC2A4'};--pv-btn:${c.btn || '#6DC2A4'};--pv-hi:${c.hi || '#F0B43C'};--pv-clock:${c.clock || '#eef2ef'};--pv-date:${c.date || '#6DC2A4'};--pv-glow:${c.glow || '#6DC2A4'}`;
    return `<div class="hbx-pv" style="${v}"${on('bg')}><div class="pv-parts"><div><span class="pc"${on('clock')}>8:45</span><span class="pd"${on('date')}>Sunday</span><span class="ps"${on('hi')}>★★★</span></div>
      <div class="pk"${on('card')}><i class="ph"${on('head')}></i><i class="pt"${on('text')}></i><i class="pt"></i><i class="pb"${on('btn') || on('glow')}></i></div></div></div>`;
  }
  /* Previews of colors change with the colors, so those are dropped from the cache when the colors change. */
  function forgetColorPreviews() { [...PV.keys()].forEach(k => { if (/^(part|motion|mset):/.test(k)) PV.delete(k); }); }

  /* ---------- the menu: groups and their options, shared by the wall's Settings and the TV's Style panel ---------- */
  /* Section icons (simple line drawings in the text color). */
  const ic = d => `<svg class="hbx-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    quick: ic('<path d="M12 3l2.4 5.6L20 9.2l-4.3 3.9 1.2 5.9L12 16l-4.9 3 1.2-5.9L4 9.2l5.6-.6z"/>'),
    colors: ic('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.6-.8 1.6-1.6 0-1.2-1-1.4-1-2.4 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>'),
    clock: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    buttons: ic('<rect x="3.5" y="7" width="17" height="10" rx="5"/><path d="M8 12h8"/>'),
    cards: ic('<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M4 9.5h16"/>'),
    motion: ic('<path d="M3 15c3-6 6 2 9-4s6 2 9-2"/><path d="M3 20c3-4 6 1 9-2.5S18 19 21 16"/>'),
    holidays: ic('<path d="M12 3l5 8h-3l4 6H6l4-6H7z"/><path d="M12 17v4"/>'),
    fun: ic('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5c1.8 2 5.2 2 7 0"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/>'),
    screen: ic('<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>'),
    sound: ic('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>')
  };
  /* ---------- the menu: groups and their options, shared by the wall's Settings (Look & feel) and the TV's Style panel ---------- */
  const SECTIONS = [
    { id: 'quick', name: 'Quick looks', hint: 'One press sets everything', groups: [{ key: 'quick', name: 'Quick looks', opts: QUICK.map(q => [q[0], q[1]]) }] },
    { id: 'colors', name: 'Colors', hint: 'Your own color for each part', groups: [{ key: 'part', name: 'Pick a part, then a color', opts: PARTS }] },
    { id: 'clock', name: 'Clock & date', hint: 'Styles and number animations', groups: [
      { key: 'clock', name: 'Clock style', opts: TEXT_FX }, { key: 'clockAnim', name: 'When the minute changes', opts: TICKS },
      { key: 'date', name: 'Date style', opts: TEXT_FX }, { key: 'dateAnim', name: 'When the date changes', opts: TICKS }] },
    { id: 'buttons', name: 'Buttons & glows', hint: 'Glow, tilt, sheen, press', groups: [
      { key: 'btn', name: 'Glow style', opts: BTNS }, { key: 'which', name: 'Which buttons glow', opts: WHICH },
      { key: 'str', name: 'Glow strength', opts: STRENGTH }, { key: 'tilt', name: 'Tilt toward you when highlighted', opts: ON },
      { key: 'sheen', name: 'Light sheen when highlighted', opts: ON }, { key: 'press', name: 'When pressed', opts: PRESS }] },
    { id: 'cards', name: 'Cards & panels', hint: 'Card style and frosted glass', groups: [{ key: 'card', name: 'Card style', opts: CARDS },
      { key: 'glass', name: 'Frosted glass panels', opts: ON }] },
    { id: 'motion', name: 'Background motion', hint: 'Moving backgrounds, light and weather', groups: [
      { key: 'motion', name: 'Futuristic motion', opts: MOTIONS }, { key: 'mset', name: 'Motion colors', opts: MSETS.map(m => [m[0], m[1]]) },
      { key: 'drift', name: 'Slow background drift', opts: ON }, { key: 'tod', name: 'Time-of-day lighting', opts: ON },
      { key: 'wx', name: 'Weather touches (rain, frost)', opts: ON }] },
    { id: 'holidays', name: 'Holidays', hint: 'Holiday themes and their characters', groups: [{ key: 'holi', name: 'Holiday touches', opts: HOLI }] },
    { id: 'fun', name: 'Fun', hint: 'Characters that visit now and then', groups: [{ key: 'fun', name: 'Fun level', opts: FUN }, { key: 'palsOften', name: 'How often they visit', opts: OFTEN }] }
  ];
  /* Screen & sound settings (the TV adds these as their own section; the wall can show them under Screen & sound). */
  const SCREEN = [{ key: 'snd', name: 'Navigation sounds', opts: ON }, { key: 'vol', name: 'Sound volume', opts: VOL },
    { key: 'strip', name: 'Status strip (weather, Wi-Fi, who\'s home)', opts: ON }, { key: 'boot', name: 'Startup animation', opts: ON },
    { key: 'kb', name: 'Screensaver photo zoom', opts: ON }, { key: 'kbSpeed', name: 'Screensaver speed', opts: SPEED }, { key: 'art', name: 'App tiles', opts: ART }];
  const cur = key => key === 'quick' ? L.quick : L[key];

  return {
    VER, init, apply, paint, lock, press, preview, forgetColorPreviews, set, norm, name, cur, get: () => L, painted: () => PAINTED,
    SECTIONS, SCREEN, ICONS, FEEL, PARTS, SWATCHES, QUICK, LISTS, hsl, readable, contrast, mix, isHex, esc, palVisit, greet, cheer, motionHtml
  };
})();
