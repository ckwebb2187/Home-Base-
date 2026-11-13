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
  /* The garland: a thick alpine garland hugging the top of the screen, swagged in two drapes that meet under a big
     velvet bow in the middle: layered fir and pine with frosted tips, pine cones and a few berries, warm white lights
     woven through. Painted once onto a canvas (a still picture); only some bulbs twinkle. */
  const W = innerWidth, VH = innerHeight / 100, GH = Math.round(34 * VH), dpr = Math.min(2, devicePixelRatio || 1);
  /* how close to a side edge (1 at the edge, 0 from ~7% in): the garland gets fuller there and falls down the sides */
  const edge = x => Math.pow(Math.max(0, 1 - Math.min(x, 1 - x) / 0.075), 1.6);
  const bot = x => (5.6 + 4 * Math.sin(Math.PI * ((x * 2) % 1)) + 0.7 * Math.sin(x * 41) + 0.5 * Math.sin(x * 97 + 1) + 11 * edge(x)) * VH;   // the lower edge, in px
  const box = mk('xlights');
  const cv = document.createElement('canvas'); cv.className = 'xgar'; cv.width = Math.round(W * dpr); cv.height = Math.round(GH * dpr);
  cv.style.width = W + 'px'; cv.style.height = GH + 'px'; box.appendChild(cv);
  const g = cv.getContext('2d'); g.scale(dpr, dpr); g.lineCap = 'round';
  let seedN = 1; const R = () => { seedN = (seedN * 16807) % 2147483647; return seedN / 2147483647; };
  /* body: a dark bed of greenery so no sky shows through */
  g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0);
  for (let k = 100; k >= 0; k--) g.lineTo(k / 100 * W, bot(k / 100) - 1.2 * VH);
  g.closePath(); const bg = g.createLinearGradient(0, 0, 0, 10 * VH); bg.addColorStop(0, '#061A11'); bg.addColorStop(1, '#0B2B1C'); g.fillStyle = bg; g.fill();
  /* sprays: a twig with needles down both sides; three layers from deep shade to sunlit tips */
  const LAYERS = [['#0A2A1A', '#0E3523', '#123F29'], ['#15492F', '#1B5838', '#22643F'], ['#2A7347', '#358254', '#4A9563']];
  const tips = [];
  LAYERS.forEach((cols, L) => {
    const paths = cols.map(() => new Path2D());
    for (let x = -30; x < W + 30;) {
      const fx = Math.max(0, Math.min(1, x / W)), e = edge(fx), b = bot(fx);
      x += (9 + R() * 7) / (1 + 1.4 * e);
      for (let row = 0, rows = 3 + Math.round(4 * e); row < rows; row++) {
        const py = L === 2 ? b * (0.55 + R() * 0.5) : b * (0.1 + R() * 0.95), a = Math.PI / 2 + (R() * 2 - 1) * 1.25 * (1 - 0.55 * e), len = (2.2 + R() * 2.4) * (1 + 0.7 * e) * VH;
        const P = paths[Math.floor(R() * cols.length)], cx = Math.cos(a), cy = Math.sin(a), nx = -cy, ny = cx;
        P.moveTo(x, py); P.lineTo(x + cx * len, py + cy * len);
        for (let n = 1; n <= 7; n++) {
          const f = n / 8, bx = x + cx * len * f, by = py + cy * len * f, nl = (1 - f * 0.55) * 0.9 * VH;
          P.moveTo(bx, by); P.lineTo(bx + (nx * 0.8 + cx * 0.6) * nl, by + (ny * 0.8 + cy * 0.6) * nl);
          P.moveTo(bx, by); P.lineTo(bx + (-nx * 0.8 + cx * 0.6) * nl, by + (-ny * 0.8 + cy * 0.6) * nl);
        }
        if (L === 2) tips.push([x + cx * len, py + cy * len]);
      }
    }
    g.lineWidth = (L === 2 ? 0.2 : 0.26) * VH;
    paths.forEach((P, i) => { g.strokeStyle = cols[i]; g.stroke(P); });
  });
  /* frost on the tips, like it's been out in the snow */
  g.fillStyle = 'rgba(235,245,255,.55)';
  tips.forEach(([x, y], i) => { if (i % 3) return; g.beginPath(); g.arc(x, y, 0.32 * VH, 0, 6.283); g.fill(); });
  /* a few holly berries */
  g.fillStyle = '#B3192F';
  for (let i = 0; i < 16; i++) { const x = R() * W, y = bot(x / W) - (0.8 + R() * 2.5) * VH; for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x + (j - 1) * .5 * VH, y + (j % 2) * .45 * VH, .36 * VH, 0, 6.283); g.fill(); } }
  const N = 28; let b = '';
  for (let i = 0; i < N; i++) {
    const x = (i + 0.5) / N, wob = (r(i + 300) - .5) * 2.4;
    /* All warm white; about one in three twinkles, slowly, and the rest burn steady. */
    const tw = r(i + 200) < 0.34;
    b += `<i class="bl w${tw ? ' tw' : ''}" style="left:${(x * 100).toFixed(2)}vw;top:${(bot(x) / VH - 2.4 + wob).toFixed(2)}vh${tw ? `;animation-duration:${(6 + r(i + 120) * 5).toFixed(2)}s;animation-delay:${(-r(i + 150) * 9).toFixed(2)}s` : ''}"></i>`;
  }
  box.insertAdjacentHTML('beforeend', `${b}<svg class="xbigbow" viewBox="0 0 400 340">${XBOW4}</svg>`);
  /* The Up next card is dressed: snow piled on its top and two gold bells that swing from its right corner. */
  const deco = document.createElement('div'); deco.id = 'xdeco'; deco.setAttribute('aria-hidden', 'true');
  deco.innerHTML = `<div class="xsnow"></div><div class="xbells"><svg viewBox="0 0 120 120">${XBELLS}</svg></div>`;
  document.body.appendChild(deco);
  xmasPlace(); XMAS.pt = setInterval(xmasPlace, 2500);
}
/* The big bow in the middle of the garland: four wide loops of deep red velvet (3½-inch ribbon), a knot and two long
   tails with notched ends; soft sheen on top, darker folds inside, a fine nap and a shadow under it. */
var XBOW4 = `<defs>
  <linearGradient id="xw" x1="1" y1=".55" x2="0" y2=".35"><stop offset="0" stop-color="#5C0612"/><stop offset=".35" stop-color="#9C1328"/><stop offset=".7" stop-color="#B51C33"/><stop offset="1" stop-color="#7E0C1D"/></linearGradient>
  <linearGradient id="xwl" x1="1" y1=".3" x2="0" y2=".8"><stop offset="0" stop-color="#560511"/><stop offset=".45" stop-color="#94122A"/><stop offset=".8" stop-color="#A9182F"/><stop offset="1" stop-color="#6E0A19"/></linearGradient>
  <linearGradient id="xwi" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#1E0106"/><stop offset="1" stop-color="#4E0510"/></linearGradient>
  <linearGradient id="xwt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A0A1A"/><stop offset=".5" stop-color="#A3162D"/><stop offset="1" stop-color="#6A0816"/></linearGradient>
  <linearGradient id="xwt2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3C030B"/><stop offset="1" stop-color="#5E0713"/></linearGradient>
  <linearGradient id="xwk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5A0612"/><stop offset=".45" stop-color="#A5172E"/><stop offset=".6" stop-color="#B21D34"/><stop offset="1" stop-color="#5A0612"/></linearGradient>
  <filter id="xwn" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .18 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="xwb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".9"/></filter>
  <filter id="xwd" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#000" flood-opacity=".55"/></filter>
  <radialGradient id="xwp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF8090" stop-opacity=".22"/><stop offset="1" stop-color="#FF8090" stop-opacity="0"/></radialGradient>
  <g id="xhalf">
    <!-- tail: wide ribbon that turns over partway (its back is darker), notched end -->
    <path d="M186 150 C182 182 176 210 168 236 L192 240 C198 212 202 182 206 154Z" fill="url(#xwt)"/>
    <path d="M168 236 C160 264 152 288 144 316 L160 306 L170 330 C178 302 186 268 192 240Z" fill="url(#xwt2)"/>
    <path d="M186 150 C182 182 176 210 168 236" stroke="#D0485E" stroke-width="1.2" fill="none" opacity=".3"/>
    <!-- lower loop: out, a fold at the tip, and back; the inside of the loop shows the ribbon's darker back -->
    <path d="M198 138 C166 146 112 160 80 180 C60 192 54 214 66 226 C80 238 106 228 128 210 C158 186 184 162 198 148Z" fill="url(#xwl)"/>
    <path d="M188 148 C160 164 124 184 104 198 C96 206 100 212 108 208 C128 196 160 174 188 154Z" fill="url(#xwi)" opacity=".9"/>
    <ellipse cx="116" cy="192" rx="40" ry="20" transform="rotate(-30 120 190)" fill="url(#xwp)"/>
    <path d="M76 184 C66 196 66 214 74 226" stroke="#2A0209" stroke-width="2.2" fill="none" opacity=".55" filter="url(#xwb)"/>
    <path d="M80 180 C60 192 54 214 66 226" stroke="#D85A6E" stroke-width="1.3" fill="none" opacity=".35"/>
    <!-- upper loop -->
    <path d="M198 124 C168 86 118 36 70 26 C50 20 32 28 30 46 C28 70 48 96 80 114 C118 136 162 142 198 138Z" fill="url(#xw)"/>
    <path d="M188 126 C160 112 120 86 88 74 C74 70 66 76 70 86 C76 98 112 116 150 124 C166 128 180 129 188 128Z" fill="url(#xwi)" opacity=".92"/>
    <ellipse cx="104" cy="92" rx="52" ry="26" transform="rotate(24 108 100)" fill="url(#xwp)"/>
    <path d="M48 26 C36 42 38 70 52 92" stroke="#2A0209" stroke-width="2.4" fill="none" opacity=".55" filter="url(#xwb)"/>
    <path d="M55 28 C44 43 46 69 59 89" stroke="#E0667A" stroke-width="1.2" fill="none" opacity=".3"/>
    <path d="M198 124 C168 86 118 36 70 26 C50 20 32 28 30 46" stroke="#E0667A" stroke-width="1.4" fill="none" opacity=".4"/>
    <!-- gathered creases where the ribbon is pinched into the knot -->
    <path d="M184 124 C170 118 160 114 150 112 M184 134 C170 134 160 136 148 140 M184 144 C172 150 164 156 156 164" stroke="#2A0209" stroke-width="1.8" fill="none" opacity=".5" filter="url(#xwb)"/>
  </g></defs>
  <g filter="url(#xwd)">
  <use href="#xhalf"/><use href="#xhalf" transform="matrix(-1 0 0 1 400 0)"/>
  <!-- the knot: a band of ribbon wrapped round the middle, gathered in soft vertical folds -->
  <path d="M182 110 C190 106 210 106 218 110 C224 126 224 146 218 162 C210 166 190 166 182 162 C176 146 176 126 182 110Z" fill="url(#xwk)"/>
  <path d="M191 110 C188 126 188 146 191 164 M200 108 C202 128 202 146 200 166 M209 110 C212 126 212 146 209 164" stroke="#3A030C" stroke-width="1.5" fill="none" opacity=".5" filter="url(#xwb)"/>
  <path d="M182 110 C190 106 210 106 218 110" stroke="#E0667A" stroke-width="1.2" fill="none" opacity=".4"/>
  <g filter="url(#xwn)"><use href="#xhalf"/><use href="#xhalf" transform="matrix(-1 0 0 1 400 0)"/><path d="M182 110 C190 106 210 106 218 110 C224 126 224 146 218 162 C210 166 190 166 182 162 C176 146 176 126 182 110Z" fill="#fff"/></g></g>`;
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
