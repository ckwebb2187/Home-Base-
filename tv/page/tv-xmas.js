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
  const W = innerWidth, VH = innerHeight / 100, GH = Math.round(15 * VH), dpr = Math.min(2, devicePixelRatio || 1);
  const bot = x => (5.6 + 4 * Math.sin(Math.PI * ((x * 2) % 1))) * VH;   // the garland's lower edge, in px
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
    for (let x = -30; x < W + 30; x += 9 + R() * 7) {
      const b = bot(Math.max(0, Math.min(1, x / W)));
      for (let row = 0; row < 3; row++) {
        const py = L === 2 ? b * (0.55 + R() * 0.5) : b * (0.1 + R() * 0.95), a = Math.PI / 2 + (R() * 2 - 1) * 1.25, len = (2.2 + R() * 2.4) * VH;
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
  /* pine cones */
  for (let i = 0; i < 12; i++) {
    const x = (i + 0.3 + R() * 0.4) / 12 * W, y = bot(x / W) - (1.2 + R() * 1.4) * VH, w = 1.1 * VH, h = 2.2 * VH, rot = (R() - .5) * .8;
    g.save(); g.translate(x, y); g.rotate(rot);
    const cg = g.createLinearGradient(-w, 0, w, 0); cg.addColorStop(0, '#5A3418'); cg.addColorStop(.5, '#8A5A2E'); cg.addColorStop(1, '#4A2A12');
    g.fillStyle = cg; g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(40,20,8,.7)'; g.lineWidth = 0.14 * VH;
    for (let k = -3; k <= 3; k++) { g.beginPath(); g.arc(0, k * h / 4 - h / 6, w * 0.95, 0.35, Math.PI - 0.35); g.stroke(); }
    g.fillStyle = 'rgba(240,248,255,.6)'; g.beginPath(); g.ellipse(0, -h * .8, w * .7, h * .22, 0, 0, 6.283); g.fill();
    g.restore();
  }
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
  <radialGradient id="xw" cx=".32" cy=".34" r=".9"><stop offset="0" stop-color="#EC5670"/><stop offset=".38" stop-color="#C01C36"/><stop offset=".78" stop-color="#7A0A1A"/><stop offset="1" stop-color="#42040D"/></radialGradient>
  <radialGradient id="xwt" cx=".5" cy=".2" r=".9"><stop offset="0" stop-color="#C8223A"/><stop offset=".6" stop-color="#8A0D1F"/><stop offset="1" stop-color="#4E0610"/></radialGradient>
  <radialGradient id="xwk" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#E24862"/><stop offset=".55" stop-color="#A3142B"/><stop offset="1" stop-color="#560712"/></radialGradient>
  <linearGradient id="xwp" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#20010A" stop-opacity=".85"/><stop offset=".45" stop-color="#20010A" stop-opacity="0"/></linearGradient>
  <linearGradient id="xws" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="xwn" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .2 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="xwb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="xwd" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".55"/></filter>
  <g id="xhalf">
    <path d="M190 146 C178 196 160 244 136 306 L160 296 L168 326 C186 268 204 210 212 154Z" fill="url(#xwt)"/>
    <path d="M190 146 C182 186 172 214 164 238 C176 214 190 186 200 150Z" fill="#2E0309" opacity=".45"/>
    <path d="M200 132 C160 142 88 150 64 190 C48 220 88 238 124 212 C160 186 188 160 200 132Z" fill="url(#xw)"/>
    <path d="M200 132 C176 146 140 158 120 172 C144 170 176 156 200 132Z" fill="#2A020A" opacity=".5"/>
    <path d="M196 136 C160 160 110 184 84 206" stroke="#3A030C" stroke-width="3" fill="none" opacity=".55" filter="url(#xwb)"/>
    <path d="M200 132 C160 142 88 150 64 190 C48 220 88 238 124 212 C160 186 188 160 200 132Z" fill="url(#xwp)"/>
    <path d="M200 128 C170 88 118 34 66 30 C24 28 14 72 34 104 C56 136 132 148 200 128Z" fill="url(#xw)"/>
    <path d="M196 124 C160 96 112 70 82 70" stroke="#3A030C" stroke-width="3.5" fill="none" opacity=".5" filter="url(#xwb)"/>
    <path d="M200 128 C170 88 118 34 66 30 C24 28 14 72 34 104 C56 136 132 148 200 128Z" fill="url(#xwp)"/>
    <path d="M200 128 C170 88 118 34 66 30 C24 28 14 72 34 104" fill="none" stroke="#FF9AAA" stroke-width="2.2" opacity=".35" filter="url(#xwb)"/>
    <path d="M200 128 C170 88 118 34 66 30 C24 28 14 72 34 104 C56 136 132 148 200 128Z" fill="url(#xws)"/>
    <path d="M64 190 C48 220 88 238 124 212" fill="none" stroke="#FF9AAA" stroke-width="2" opacity=".28" filter="url(#xwb)"/>
  </g></defs>
  <g filter="url(#xwd)">
  <use href="#xhalf"/><use href="#xhalf" transform="matrix(-1 0 0 1 400 0)"/>
  <path d="M176 106 C188 96 212 96 224 106 C234 122 234 142 224 158 C212 168 188 168 176 158 C166 142 166 122 176 106Z" fill="url(#xwk)"/>
  <path d="M184 108 C190 126 190 142 184 158 M200 102 C203 122 203 144 200 164 M216 108 C210 126 210 142 216 158" stroke="#4A0410" stroke-width="2.4" fill="none" opacity=".55" filter="url(#xwb)"/>
  <path d="M176 106 C188 96 212 96 224 106" stroke="#FFB0BC" stroke-width="2" fill="none" opacity=".35"/>
  <g filter="url(#xwn)"><use href="#xhalf"/><use href="#xhalf" transform="matrix(-1 0 0 1 400 0)"/><path d="M176 106 C188 96 212 96 224 106 C234 122 234 142 224 158 C212 168 188 168 176 158 C166 142 166 122 176 106Z" fill="#fff"/></g></g>`;
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
