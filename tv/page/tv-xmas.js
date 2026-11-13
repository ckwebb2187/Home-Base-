/* ---------- Evergreen Glow: the premium Christmas theme ----------
   Deep pine with garnet and candlelight gold. Its layers sit behind the screen's content: two slow glows (garnet and
   pine) that drift, warm bokeh rising, a light snowfall, and a garland of lights along the top that twinkles. Built
   once when the theme turns on and removed when it turns off; everything moves with transform and opacity only. */
var XMAS = { on: false };
function xmasFx(on) {
  on = !!on && MODE !== 'style';
  if (on === XMAS.on) return; XMAS.on = on;
  clearInterval(XMAS.pt);
  ['xglow', 'xbokeh', 'xlights', 'xdeco'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  if (!on) return;
  const wrap = $('#wrap'), mk = id => { const el = document.createElement('div'); el.id = id; el.setAttribute('aria-hidden', 'true'); document.body.insertBefore(el, wrap); return el; };
  const r = n => (holHash('xmas' + n) % 1000) / 1000;
  mk('xglow').innerHTML = '<i class="g1"></i><i class="g2"></i><i class="g3"></i>';
  /* Bokeh: soft circles of warm light rising slowly, and a few fine snowflakes falling. */
  let h = '';
  const cols = ['gold', 'gold', 'red', 'green', 'gold', 'red', 'green'];
  for (let i = 0; i < 8; i++) {
    const s = 1.6 + r(i) * 5.4, du = 22 + r(i + 40) * 20;
    h += `<i class="bk ${cols[i % cols.length]}" style="left:${(r(i + 9) * 100).toFixed(1)}vw;top:${(40 + r(i + 21) * 60).toFixed(1)}vh;width:${s.toFixed(2)}vh;height:${s.toFixed(2)}vh;animation-duration:${du.toFixed(1)}s;animation-delay:${(-r(i + 3) * du).toFixed(1)}s"></i>`;
  }
  for (let i = 0; i < (HB_APP ? 0 : 12); i++) {   /* in the app, the snow falls over the app tiles too (drawn by the app) */
    const s = 0.25 + r(i + 70) * 0.45, du = 16 + r(i + 90) * 14;
    h += `<i class="fl" style="left:${(r(i + 55) * 100).toFixed(1)}vw;width:${s.toFixed(2)}vh;height:${s.toFixed(2)}vh;animation-duration:${du.toFixed(1)}s;animation-delay:${(-r(i + 33) * du).toFixed(1)}s;opacity:${(0.35 + r(i + 11) * 0.45).toFixed(2)}"></i>`;
  }
  mk('xbokeh').innerHTML = h;
  /* The garland: evergreen boughs swagged across the top in two drapes that meet under a big velvet bow in the middle,
     with warm white lights woven through. The boughs are drawn once (a still picture); only some bulbs twinkle. */
  const W = innerWidth, VH = innerHeight / 100, GH = 16 * VH;
  const y = x => 1.2 + 5.4 * Math.sin(Math.PI * ((x * 2) % 1));   // vh
  const greens = ['#0B2E1C', '#0F3B24', '#14502F', '#1D6B3E', '#2C7F4C', '#3A8F58'];
  let body = 'M0 ' + (y(0) * VH).toFixed(1), nd = '', berries = '';
  for (let k = 1; k <= 160; k++) { const x = k / 160; body += ' L' + (x * W).toFixed(1) + ' ' + (y(x) * VH).toFixed(1); }
  for (let k = 0; k <= 400; k++) {
    const x = k / 400, bx = x * W, by = y(x) * VH;
    for (let j = 0; j < 6; j++) {
      const q = r(k * 7 + j), a = (q * 2 - 1) * Math.PI, L = (1.1 + r(k * 13 + j) * 1.8) * VH, ox = (r(k * 3 + j) - .5) * 2.2 * VH, oy = (r(k * 5 + j) - .5) * 2 * VH;
      nd += `<path d="M${(bx + ox).toFixed(1)} ${(by + oy).toFixed(1)}l${(Math.cos(a) * L).toFixed(1)} ${(Math.sin(a) * L * .7 + L * .25).toFixed(1)}" stroke="${greens[Math.floor(r(k * 11 + j) * greens.length)]}"/>`;
    }
    if (k % 31 === 15) for (let j = 0; j < 3; j++) berries += `<circle cx="${(bx + (j - 1) * .55 * VH).toFixed(1)}" cy="${(by + .6 * VH + (j % 2) * .45 * VH).toFixed(1)}" r="${(.36 * VH).toFixed(1)}"/>`;
  }
  const N = 26; let b = '';
  for (let i = 0; i < N; i++) {
    const x = (i + 0.5) / N, wob = (r(i + 300) - .5) * 1.2;
    /* All warm white; about one in three twinkles, slowly, and the rest burn steady. */
    const tw = r(i + 200) < 0.34;
    b += `<i class="bl w${tw ? ' tw' : ''}" style="left:${(x * 100).toFixed(2)}vw;top:${(y(x) + wob).toFixed(2)}vh${tw ? `;animation-duration:${(6 + r(i + 120) * 5).toFixed(2)}s;animation-delay:${(-r(i + 150) * 9).toFixed(2)}s` : ''}"></i>`;
  }
  mk('xlights').innerHTML = `<svg class="xgar" width="${W}" height="${GH.toFixed(0)}" viewBox="0 0 ${W} ${GH.toFixed(0)}">
    <path d="${body}" fill="none" stroke="#0A2617" stroke-width="${(3.6 * VH).toFixed(1)}" stroke-linecap="round"/>
    <g fill="none" stroke-width="${(.32 * VH).toFixed(2)}" stroke-linecap="round">${nd}</g><g fill="#B3192F">${berries}</g></svg>${b}
    <svg class="xbigbow" viewBox="0 0 300 260">${XBOW4}</svg>`;
  /* The Up next card is dressed: snow piled on its top and two gold bells that swing from its corner. */
  const deco = document.createElement('div'); deco.id = 'xdeco'; deco.setAttribute('aria-hidden', 'true');
  deco.innerHTML = `<div class="xsnow"></div><div class="xbells"><svg viewBox="0 0 120 120">${XBELLS}</svg></div>`;
  document.body.appendChild(deco);
  xmasPlace(); XMAS.pt = setInterval(xmasPlace, 2500);
}
/* The big bow in the middle of the garland: four wide loops of deep red velvet (3½-inch ribbon), a knot and two long
   tails with notched ends; soft sheen on top, darker folds inside, a fine nap and a shadow under it. */
var XBOW4 = `<defs>
  <radialGradient id="xw" cx=".38" cy=".3" r=".9"><stop offset="0" stop-color="#E4475E"/><stop offset=".42" stop-color="#B3192F"/><stop offset="1" stop-color="#5A0713"/></radialGradient>
  <radialGradient id="xw2" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#C21D35"/><stop offset="1" stop-color="#5E0814"/></radialGradient>
  <linearGradient id="xws" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="xwn" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .2 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="xwd" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".5"/></filter></defs>
  <g filter="url(#xwd)">
  <path d="M138 110 C124 156 106 200 88 252 L110 242 L120 262 C132 212 148 160 158 114Z" fill="url(#xw2)"/>
  <path d="M162 110 C176 156 194 200 212 252 L190 242 L180 262 C168 212 152 160 142 114Z" fill="url(#xw2)"/>
  <path d="M150 100 C118 112 48 128 52 164 C58 194 124 150 150 100Z" fill="url(#xw)"/>
  <path d="M150 100 C182 112 252 128 248 164 C242 194 176 150 150 100Z" fill="url(#xw)"/>
  <path d="M150 100 C118 54 30 14 26 62 C24 102 108 116 150 100Z" fill="url(#xw)"/>
  <path d="M150 100 C182 54 270 14 274 62 C276 102 192 116 150 100Z" fill="url(#xw)"/>
  <path d="M150 100 C124 72 64 46 60 66 C60 88 114 102 150 100Z" fill="#43050E" opacity=".55"/>
  <path d="M150 100 C176 72 236 46 240 66 C240 88 186 102 150 100Z" fill="#43050E" opacity=".55"/>
  <path d="M150 100 C124 116 76 132 78 156 C96 160 134 132 150 100Z" fill="#43050E" opacity=".45"/>
  <path d="M150 100 C176 116 224 132 222 156 C204 160 166 132 150 100Z" fill="#43050E" opacity=".45"/>
  <path d="M150 100 C118 54 30 14 26 62 C24 102 108 116 150 100Z M150 100 C182 54 270 14 274 62 C276 102 192 116 150 100Z" fill="url(#xws)"/>
  <rect x="128" y="80" width="44" height="42" rx="15" fill="url(#xw)"/><rect x="128" y="80" width="44" height="42" rx="15" fill="url(#xws)"/>
  <g filter="url(#xwn)"><path d="M150 100 C118 54 30 14 26 62 C24 102 108 116 150 100Z M150 100 C182 54 270 14 274 62 C276 102 192 116 150 100Z M150 100 C118 112 48 128 52 164 C58 194 124 150 150 100Z M150 100 C182 112 252 128 248 164 C242 194 176 150 150 100Z M138 110 C124 156 106 200 88 252 L110 242 L120 262 C132 212 148 160 158 114Z M162 110 C176 156 194 200 212 252 L190 242 L180 262 C168 212 152 160 142 114Z M128 80 h44 v42 h-44Z" fill="#fff"/></g></g>`;
/* Two gold bells on red cords, hung from the knot. */
var XBELL = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><circle cx="0" cy="-17" r="3.4" fill="none" stroke="url(#xg)" stroke-width="2.2"/>
  <path d="M-12 -3 C-12 -17 12 -17 12 -3 L15 12 C15 16 -15 16 -15 12Z" fill="url(#xg)"/><ellipse cx="0" cy="13" rx="16" ry="3.6" fill="url(#xg2)"/>
  <circle cx="0" cy="18" r="4" fill="#8A5E10"/><path d="M-7 -8 C-6 -13 -2 -14 1 -14" stroke="#FFF6D0" stroke-width="2" stroke-linecap="round" fill="none" opacity=".8"/></g>`;
var XBELLS = `<defs><linearGradient id="xg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1B8"/><stop offset=".45" stop-color="#E2B44A"/><stop offset="1" stop-color="#8E6210"/></linearGradient>
  <linearGradient id="xg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D57A"/><stop offset="1" stop-color="#7A520C"/></linearGradient></defs>
  <path d="M70 0 C68 22 62 36 60 52 M70 0 C74 24 86 42 88 60" stroke="#8E1225" stroke-width="2.4" fill="none"/>
  ${XBELL(60, 70, 10)}${XBELL(88, 78, -4)}`;
/* Keeps the decorations on the card wherever the layout puts it. */
function xmasPlace() {
  const d = document.getElementById('xdeco'), c = document.querySelector('#wrap .right');
  if (!d) return;
  const r = c ? c.getBoundingClientRect() : null;
  if (!r || r.width < 50 || getComputedStyle(c).display === 'none') { d.style.display = 'none'; return; }
  d.style.display = 'block';
  const key = [r.left, r.top, r.width].map(Math.round).join();
  if (d.dataset.k === key) return; d.dataset.k = key;
  d.style.transform = `translate3d(${Math.round(r.left)}px,${Math.round(r.top)}px,0)`;
  d.style.width = Math.round(r.width) + 'px';
  /* Snow along the top: lumpy, a little over each edge, with a cool shadow under it. */
  const w = Math.round(r.width) + 16, H = innerHeight * 0.05, rnd = n => (holHash('cs' + n) % 1000) / 1000;
  let p = `M0 ${H * .55} C0 ${H * .2} 8 ${H * .12} 22 ${H * .1} L${w - 22} ${H * .1} C${w - 8} ${H * .12} ${w} ${H * .2} ${w} ${H * .55}`, n = 9, px = w, py = H * .55;
  for (let i = 1; i <= n; i++) { const x = w - w * i / n, y = H * (.5 + rnd(i) * .28); p += ` Q${((px + x) / 2).toFixed(1)} ${(Math.max(py, y) + H * (.12 + rnd(i + 20) * .18)).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`; px = x; py = y; }
  p += ' Z';
  d.querySelector('.xsnow').innerHTML = `<svg width="${w}" height="${Math.round(H * 1.2)}" viewBox="0 0 ${w} ${(H * 1.2).toFixed(1)}"><defs><linearGradient id="xsn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#DCE8F4"/></linearGradient></defs>
    <path d="${p}" transform="translate(0 ${(H * .07).toFixed(1)})" fill="rgba(10,30,40,.35)"/><path d="${p}" fill="url(#xsn)"/></svg>`;
}
addEventListener('resize', () => { try { xmasPlace(); } catch (e) {} });
try { xmasFx(document.documentElement.dataset.th === 'evergreenglow'); } catch (e) {}
