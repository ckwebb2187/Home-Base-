"""Builds the TV home page (page 12.x) from the live page 11.9-D plus the shared look module and the new Style panel.
Usage: python build_tv_page.py   (reads live/tv-page-11.9-D.html, writes live/tv-page.html and the app's assets/tv.html)
The shared look module (hb-look.js) is the same code the wall carries between its hb-look markers."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(HERE, p), encoding='utf-8').read()
page = rd('live/tv-page-11.9-D.html')
look = rd('hb-look.js'); panel_js = rd('tv-style-panel.js'); panel_css = rd('tv-style-panel.css')
pol_js = rd('tv-polish.js'); pol_css = rd('tv-polish.css')

def once(s, old, new):
    n = s.count(old)
    assert n == 1, f'expected one of {old[:70]!r}, found {n}'
    return s.replace(old, new)

# 1. CSS: the old Style panel rules make way for the new ones.
i = page.index('#sty { display:none;'); j = page.index('\n', page.index('.sty-r button { padding:6px 12px } }', i))
page = page[:i] + panel_css.strip() + '\n' + pol_css.strip() + page[j:]

# 2. The shared look module, in its own script before the page's script.
assert '</script' not in look
page = once(page, '<div id="lane" aria-hidden="true"></div>\n<script>',
            '<div id="lane" aria-hidden="true"></div>\n<script>/* hb-look:start */\n' + look + '\n/* hb-look:end */</script>\n<script>')

# 3. Clock and date: changed digits (and a new date) get the chosen number animation.
page = once(page, '`<span class="tk">${c}</span>`', '`<span class="tk hbx-d">${c}</span>`')
page = once(page, '`<span class="tk">${hh}</span>`', '`<span class="tk hbx-d">${hh}</span>`')
page = once(page, "if ($('#date').textContent !== dt) $('#date').textContent = dt;",
            "if ($('#date').textContent !== dt) { const first = !$('#date').textContent; $('#date').innerHTML = first ? esc(dt) : `<span class=\"hbx-d\">${esc(dt)}</span>`; }")

# 4. Style settings carry the shared look (hbx); the Style & Settings button place is kept too.
page = once(page, "function styDefault() { return { preset: 0, palette: 0, cycle: 0, glow: 1, fx: fxFromList(PRESETS[0][4]), wall: true, perf: true, ts: 0 }; }",
            "function styDefault() { return { preset: 0, palette: 0, cycle: 0, glow: 1, fx: fxFromList(PRESETS[0][4]), wall: true, perf: true, gear: 'corner', hbx: HBLook.norm(null), ts: 0 }; }")
page = once(page, "glow: n(s.glow, GLOWS.length, d.glow), fx: {}, wall: s.wall !== false, perf: s.perf !== false, ts: +s.ts || 0 };",
            "glow: n(s.glow, GLOWS.length, d.glow), fx: {}, wall: s.wall !== false, perf: s.perf !== false, ts: +s.ts || 0,\n"
            "    gear: ['corner', 'end', 'start'].includes(s.gear) ? s.gear : 'corner', hbx: HBLook.norm(s.hbx) };")
page = once(page, "  D.look = '';   /* re-derive colors from the new palette */\n  applyLook(D.data);\n",
            "  D.look = '';   /* re-derive colors from the new palette */\n  applyLook(D.data);\n  HBLook.apply(s.hbx);\n")
# colors picked in the look sit on top of the theme: repaint after the theme or the cycling changes them
page = once(page, "  sendTileTheme(ht, main, tk);\n  renderLane();\n}",
            "  sendTileTheme(ht, main, tk);\n  renderLane();\n  try { HBLook.paint(); } catch (e) {}\n}")
page = once(page, "  try { if (HB_APP && typeof HB_APP.look === 'function') HB_APP.look(a, g); } catch (e) {}\n}\nfunction hslHex",
            "  try { HBLook.paint(); } catch (e) {}\n  try { if (HB_APP && typeof HB_APP.look === 'function') HB_APP.look(a, g); } catch (e) {}\n}\nfunction hslHex")
# the app row's tiles take the Buttons color when one is picked
page = once(page, "  if (key !== D.look) return;   /* the theme changed again meanwhile */\n",
            "  if (key !== D.look) return;   /* the theme changed again meanwhile */\n"
            "  const bm = typeof PRESETS !== 'undefined' && PRESETS && STY && STY.hbx ? (STY.hbx.colors || {}).btn : ''; if (bm) main = bm;\n")
# the wall's look settings arrive with tv.json (look.x); the newer one wins and is saved for the phone style page too
page = once(page, "function styleFromFeed(data) {\n  if (!PRESETS) return;\n  const r = data && data.style;\n  if (!r || typeof r !== 'object' || !(+r.ts > styLoad().ts)) return;\n  STY = styClean(r);",
            "function styleFromFeed(data) {\n  if (!PRESETS) return;\n  const lx = data && data.look && data.look.x;\n"
            "  if (lx && typeof lx === 'object' && +lx.ts > +(styLoad().hbx.ts || 0)) {\n"
            "    const s = styLoad(); s.hbx = HBLook.norm(lx); s.ts = Date.now();\n"
            "    try { localStorage.setItem(STY_KEY, JSON.stringify(s)); } catch (e) {}\n"
            "    styApply(false); styPush(); if (PANEL.open) panelMarks();\n  }\n"
            "  const r = data && data.style;\n  if (!r || typeof r !== 'object' || !(+r.ts > styLoad().ts)) return;\n"
            "  const keep = styLoad().hbx;\n  STY = styClean(r);\n  if (+keep.ts > +STY.hbx.ts) STY.hbx = keep;")
page = once(page, "  if (PANEL.open) panelDraw();\n}", "  if (PANEL.open) panelMarks();\n}")
page = once(page, "page: '11.9-D', mode: MODE", "page: '13.1', mode: MODE")

# 4b. Premium polish hooks: holiday level, screensaver pan & zoom, layers refreshed with each load, startup on open.
page = once(page, "  const s = styLoad(), p = PALETTES[s.palette];\n  if (!p[1]) return lk;",
            "  const s = styLoad(), p = PALETTES[s.palette];\n  if (s.hbx && s.hbx.holi === 'off' && lk.th) { lk = { ...lk }; delete lk.th; }\n  if (!p[1]) return lk;")
page = once(page, "  if (ht) {\n    const c = { ...HOL_BASE, ...ht.c }", "  if (ht && styLoad().hbx.holi === 'full') {\n    const c = { ...HOL_BASE, ...ht.c }")
page = once(page, "    el.className = 'ph';\n", "    el.className = 'ph'; polKb(el);\n")
page = once(page, "    PH.timer = setTimeout(nextPhoto, PHOTO_MS);", "    PH.timer = setTimeout(nextPhoto, polPhotoMs());")
page = once(page, "  applyLook(D.data); render();\n}\nwindow.hbRefresh", "  applyLook(D.data); render();\n  if (typeof POL !== 'undefined' && POL) polTick();\n}\nwindow.hbRefresh")
page = once(page, "  HBLook.apply(s.hbx);\n", "  HBLook.apply(s.hbx);\n  if (typeof POL !== 'undefined' && POL) polApply();\n")
page = once(page, "requestAnimationFrame(() => { document.body.classList.add('ready');", "try { window.hbBoot(); } catch (e) {}\nrequestAnimationFrame(() => { document.body.classList.add('ready');")

# 5. The Style panel itself.
i = page.rindex('/* ---------- the Style panel ----------'); j = page.index("styApply(false);\nif (MODE === 'style')", i)
host = """/* The shared look's hooks into this page: which elements are the clock, the date, cards and buttons, and how its
   color parts map onto this page's colors. */
HBLook.init({
  sel: { clock: '#clock', date: '#date', card: '.right', glass: '#pstrip', btnSel: '#sty .hbx-opt.on .hbx-pvw, #sty .sty-ni.on', btnMain: '#sty .hbx-opt.sel .hbx-pvw',
    btnAll: '#sty .hbx-opt .hbx-pvw, #sty .sty-ni', headText: '.right > .lbl, #dinner .lbl, #chores .lbl', hiText: '.ev .when' },
  base: () => { const cs = getComputedStyle(document.documentElement), g = n => cs.getPropertyValue(n).trim();
    return { bg: g('--bg'), card: g('--card'), text: g('--ink'), head: g('--accent'), hi: g('--gold'), glow: g('--accent'), btn: g('--accent'), clock: g('--ink'), date: g('--accent') }; },
  vars: (c, ch) => { const o = {}, A = hexRgb(c.glow);
    if (ch.has('bg')) { o['--bg'] = c.bg; o['--bg2'] = HBLook.mix(c.bg, c.glow, 0.12); }
    if (ch.has('card')) o['--card'] = rgba(hexRgb(c.card), 0.74);
    if (ch.has('text')) { o['--ink'] = c.text; o['--ink2'] = HBLook.mix(c.text, c.bg, 0.32); }
    if (ch.has('head')) o['--accent'] = c.head;
    if (ch.has('hi')) o['--gold'] = c.hi;
    if (ch.has('glow')) { o['--glowA'] = rgba(A, 0.24); o['--haloA'] = rgba(A, 0.45); }
    return o; },
  motionBox: () => { let b = document.getElementById('hbxbox'); if (!b) { b = document.createElement('div'); b.id = 'hbxbox'; b.setAttribute('aria-hidden', 'true'); document.body.insertBefore(b, $('#wrap')); } return b; },
  safeBottom: 'calc(var(--row) + 1vh)',
  perf: () => !!styLoad().perf,
  busy: () => PANEL.open || MODE !== 'home',
  onFx: fx => { if (MODE === 'home' && HB_APP && typeof HB_APP.fx === 'function') try { HB_APP.fx(JSON.stringify(fx)); } catch (e) {} },
  tv: true
});
"""
panel_js = panel_js.replace("  return HBLook.cur.call(null, k) !== undefined && L ? (k === 'quick' ? L.quick : L[k]) : '';",
                            "  return k === 'quick' ? L.quick : (L[k] !== undefined ? L[k] : '');")
page = page[:i] + host + panel_js + '\n' + pol_js + page[j:]
page = once(page, "if (MODE === 'style') { document.body.classList.add('home'); panelOpen(); }",
            "if (MODE === 'style') { document.body.classList.add('home'); panelOpen(); }\nsetInterval(() => HBLook.lock(), 60000);")

assert 'id="wrap"' in page and len(page) > 50000
for out in ('live/tv-page.html', '../app/src/main/assets/tv.html'):
    open(os.path.join(HERE, out), 'w', encoding='utf-8').write(page)
print('tv page', len(page), 'bytes')
