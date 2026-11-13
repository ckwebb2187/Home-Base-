/* ---------- Evergreen Glow: the premium Christmas theme ----------
   Deep pine with garnet and candlelight gold. Its layers sit behind the screen's content: two slow glows (garnet and
   pine) that drift, warm bokeh rising, a light snowfall, and a garland of lights along the top that twinkles. Built
   once when the theme turns on and removed when it turns off; everything moves with transform and opacity only. */
var XMAS = { on: false };
function xmasFx(on) {
  on = !!on && MODE !== 'style';
  if (on === XMAS.on) return; XMAS.on = on;
  ['xglow', 'xbokeh', 'xlights'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
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
  for (let i = 0; i < 12; i++) {
    const s = 0.25 + r(i + 70) * 0.45, du = 16 + r(i + 90) * 14;
    h += `<i class="fl" style="left:${(r(i + 55) * 100).toFixed(1)}vw;width:${s.toFixed(2)}vh;height:${s.toFixed(2)}vh;animation-duration:${du.toFixed(1)}s;animation-delay:${(-r(i + 33) * du).toFixed(1)}s;opacity:${(0.35 + r(i + 11) * 0.45).toFixed(2)}"></i>`;
  }
  mk('xbokeh').innerHTML = h;
  /* The garland: a wire that sags gently across the top, with bulbs in garnet, pine, gold and warm white. */
  const N = 24, bulbs = ['r', 'g', 'y', 'w'];
  const y = x => 1.4 + 2.6 * Math.sin(Math.PI * ((x * 3) % 1));   // three gentle swags across the width, in vh
  let path = '', b = '';
  for (let k = 0; k <= 120; k++) { const x = k / 120; path += (k ? 'L' : 'M') + (x * 1000).toFixed(1) + ' ' + (y(x) * 10).toFixed(1); }
  for (let i = 0; i < N; i++) {
    const x = (i + 0.5) / N;
    b += `<i class="bl ${bulbs[i % 4]}" style="left:${(x * 100).toFixed(2)}vw;top:${y(x).toFixed(2)}vh;animation-duration:${(4 + r(i + 120) * 4).toFixed(2)}s;animation-delay:${(-r(i + 150) * 5).toFixed(2)}s"></i>`;
  }
  mk('xlights').innerHTML = `<svg viewBox="0 0 1000 60" preserveAspectRatio="none"><path d="${path}"/></svg>${b}`;
}
try { xmasFx(document.documentElement.dataset.th === 'evergreenglow'); } catch (e) {}
