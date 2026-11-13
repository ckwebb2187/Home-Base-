/* ---------- Watch: "What should I watch?" ----------
   Opened from the app's Watch button (or W on a keyboard). Pick a mood, how much time and who's watching, then
   browse the picks Nuvio-style: a big backdrop for the highlighted title, rows of posters, and OK opens it in Nuvio.
   Titles come from Cinemeta (the free catalog Nuvio and Stremio use: IMDb ids, posters, backdrops, logos, trailers),
   so there's no account or key. Rows are fetched once per mood and kept for the visit.
   On the remote: arrows move, OK picks, Back steps out (results → questions → closed). */
var WATCH = { open: false, step: 'ask', f: { r: 0, c: 0 }, mood: 'funny', time: 'movie', who: 'adults', seed: 1, rows: [], cache: {}, hero: null, busy: false };
const WATCH_MOODS = [
  ['funny', 'Funny', '😂', ['Comedy']], ['cozy', 'Cozy', '☕', ['Family', 'Romance', 'Animation']],
  ['exciting', 'Exciting', '⚡', ['Action', 'Adventure']], ['scary', 'Scary', '👻', ['Horror', 'Thriller']],
  ['mind', 'Mind-bending', '🌀', ['Mystery', 'Sci-Fi']], ['learn', 'Learn something', '🧠', ['Documentary', 'History', 'Biography']],
  ['feel', 'Feel-good', '🌈', ['Comedy', 'Family']], ['epic', 'Epic', '🐉', ['Fantasy', 'Adventure', 'Sci-Fi']]
];
const WATCH_TIMES = [['quick', 'Under an hour', '⏱'], ['movie', 'A movie', '🎬'], ['binge', 'All night', '🌙']];
const WATCH_WHO = [['adults', 'Grown-ups', '🛋'], ['family', 'Whole family', '👨‍👩‍👧'], ['kids', 'Kids', '🧸']];
/* "On YouTube" ideas for each mood (opened as a YouTube search), and the family channel guide. */
const WATCH_YT = {
  funny: ['stand up comedy full special', 'funniest bloopers', 'improv comedy'], cozy: ['cozy cabin rain ambience', 'bob ross painting', 'slow living vlog'],
  exciting: ['best car chase scenes', 'extreme sports highlights', 'parkour'], scary: ['scary stories animated', 'unsolved mysteries documentary', 'creepypasta'],
  mind: ['mind blowing science', 'optical illusions explained', 'space mysteries'], learn: ['kurzgesagt', 'how its made', 'history documentary'],
  feel: ['wholesome moments', 'dogs reunited with owners', 'random acts of kindness'], epic: ['epic orchestral music', 'lord of the rings behind the scenes', 'nature documentary 4k']
};
const WATCH_GUIDE = [['Learning', '🧠', 'kurzgesagt science explained'], ['Kids', '🧸', 'kids cartoons full episodes'], ['Cooking', '🍳', 'easy family dinner recipes'],
  ['Chill', '🎧', 'lofi hip hop radio'], ['Gaming', '🎮', 'gaming highlights'], ['Nature', '🌿', 'nature documentary 4k'], ['Music', '🎵', 'top music videos this week'], ['Comedy', '😂', 'stand up comedy clips']];
const CM = 'https://v3-cinemeta.strem.io';
const wEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function wRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function wShuffle(a, seed) { const r = wRand(seed), o = a.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; }
async function wFetch(type, list, genre) {
  const k = `${type}/${list}/${genre}`;
  if (WATCH.cache[k]) return WATCH.cache[k];
  const p = fetch(`${CM}/catalog/${type}/${list}/genre=${encodeURIComponent(genre)}.json`).then(r => r.ok ? r.json() : { metas: [] }).then(j => (j && j.metas) || []).catch(() => []);
  WATCH.cache[k] = p;
  const out = await p; if (!out.length) delete WATCH.cache[k];
  return out;
}
const wMins = m => { const n = parseInt(String(m.runtime || ''), 10); return isNaN(n) ? 0 : n; };
const wRating = m => parseFloat(m.imdbRating) || 0;
const wKidsOk = m => { const g = (m.genres || m.genre || []).map(String); return !g.some(x => /Horror|Thriller|Crime|War/.test(x)) && g.some(x => /Animation|Family/.test(x)); };
/* The picks: movies, shows and documentaries for the mood, time and who's watching. */
async function watchLoad() {
  const mood = WATCH_MOODS.find(m => m[0] === WATCH.mood) || WATCH_MOODS[0];
  let genres = mood[3];
  if (WATCH.who === 'kids') genres = WATCH.mood === 'learn' ? ['Documentary', 'Animation'] : ['Animation', 'Family'];
  else if (WATCH.who === 'family' && (WATCH.mood === 'scary')) genres = ['Fantasy', 'Family'];
  const both = (type, gs) => Promise.all(gs.flatMap(g => [wFetch(type, 'top', g), wFetch(type, 'imdbRating', g)])).then(a => a.flat());
  const [mv, sr, docs] = await Promise.all([both('movie', genres), both('series', genres), WATCH.mood === 'learn' ? Promise.resolve([]) : both('movie', ['Documentary'])]);
  const seen = new Set(), clean = (list, test) => {
    const out = [];
    for (const m of list) {
      const id = m.imdb_id || m.id; if (!id || !/^tt\d+$/.test(id) || seen.has(id) || !m.poster) continue;
      if (wRating(m) && wRating(m) < 6.2) continue;
      if (WATCH.who !== 'adults' && !wKidsOk(m) && !(WATCH.mood === 'learn' && /Documentary/.test((m.genres || []).join()))) continue;
      if (test && !test(m)) continue;
      seen.add(id); out.push(m);
    }
    return out;
  };
  const cap = WATCH.time === 'movie' ? 130 : 999;
  const movies = wShuffle(clean(mv, m => !wMins(m) || wMins(m) <= cap), WATCH.seed).slice(0, 14);
  const shows = wShuffle(clean(sr), WATCH.seed + 1).slice(0, 14);
  const doc = wShuffle(clean(docs), WATCH.seed + 2).slice(0, 12);
  const yt = wShuffle(WATCH_YT[mood[0]] || [], WATCH.seed).map(q => ({ yt: q, name: q }));
  const rows = [];
  const mRow = { name: WATCH.who === 'kids' ? 'Movies for the kids' : 'Movies for you', items: movies }, sRow = { name: WATCH.time === 'quick' ? 'Quick episodes' : 'Shows to start', items: shows };
  if (WATCH.time === 'quick') rows.push(sRow, mRow); else rows.push(mRow, sRow);
  if (doc.length) rows.push({ name: 'Documentaries', items: doc });
  rows.push({ name: 'On YouTube', items: yt.concat(WATCH_GUIDE.slice(0, 4).map(g => ({ yt: g[2], name: g[0], icon: g[1] }))) });
  rows.push({ name: 'Family channel guide', items: WATCH_GUIDE.map(g => ({ yt: g[2], name: g[0], icon: g[1] })) });
  WATCH.rows = rows.filter(r => r.items.length);
}
/* ---------- drawing ---------- */
function watchBox() {
  let w = $('#watch');
  if (!w) {
    w = document.createElement('div'); w.id = 'watch';
    w.innerHTML = `<div class="w-bd"><i class="a"></i><i class="b"></i></div><div class="w-shade"></div><div class="w-in"></div><div class="w-toast" hidden></div>`;
    document.body.appendChild(w);
    w.addEventListener('click', e => { const t = e.target.closest('[data-r]'); if (!t) return; WATCH.f = { r: +t.dataset.r, c: +t.dataset.c }; watchFocus(); watchKey('ok'); });
  }
  return w;
}
function watchAsk() {
  const chip = (r, c, on, ico, label) => `<div class="w-chip${on ? ' sel' : ''}" data-r="${r}" data-c="${c}"><span class="i">${ico}</span><span>${wEsc(label)}</span></div>`;
  $('#watch .w-in').innerHTML = `<div class="w-ask">
    <div class="w-title"><b>What should we watch?</b><span>Pick a mood, how long, and who's watching</span></div>
    <div class="w-q"><span class="w-lbl">Mood</span><div class="w-chips">${WATCH_MOODS.map((m, i) => chip(0, i, m[0] === WATCH.mood, m[2], m[1])).join('')}</div></div>
    <div class="w-q"><span class="w-lbl">Time</span><div class="w-chips">${WATCH_TIMES.map((m, i) => chip(1, i, m[0] === WATCH.time, m[2], m[1])).join('')}</div></div>
    <div class="w-q"><span class="w-lbl">Who's watching</span><div class="w-chips">${WATCH_WHO.map((m, i) => chip(2, i, m[0] === WATCH.who, m[2], m[1])).join('')}</div></div>
    <div class="w-go"><div class="w-btn pri" data-r="3" data-c="0">Show me</div><div class="w-btn" data-r="3" data-c="1">🎲 Surprise me</div></div></div>`;
  watchFocus();
}
function watchResults() {
  const card = (m, r, c) => m.yt
    ? `<div class="w-card yt" data-r="${r}" data-c="${c}"><div class="w-ytb"><span>${m.icon || '▶'}</span><b>${wEsc(m.name)}</b><small>YouTube</small></div></div>`
    : `<div class="w-card" data-r="${r}" data-c="${c}"><img loading="lazy" src="${wEsc(m.poster)}" alt="" onerror="this.parentNode.classList.add('noimg');this.remove()"><span class="w-cn">${wEsc(m.name)}</span></div>`;
  $('#watch .w-in').innerHTML = `<div class="w-res"><div class="w-hero"></div><div class="w-btns"><div class="w-btn pri" data-r="0" data-c="0">▶ Open in Nuvio</div><div class="w-btn" data-r="0" data-c="1">🎞 Trailer</div><div class="w-btn" data-r="0" data-c="2">🎲 Something else</div><div class="w-btn" data-r="0" data-c="3">✎ Change mood</div></div>
    <div class="w-rows">${WATCH.rows.map((row, i) => `<section class="w-row"><h3>${wEsc(row.name)}</h3><div class="w-track">${row.items.map((m, c) => card(m, i + 1, c)).join('')}</div></section>`).join('')}</div></div>`;
  const first = WATCH.rows[0] && WATCH.rows[0].items[0];
  WATCH.f = { r: 1, c: 0 };
  watchHero(first);
  watchFocus();
}
/* The big backdrop and details for the highlighted title (crossfades between two layers). */
function watchHero(m) {
  if (!m || m.yt) { if (m && m.yt) { const h = $('#watch .w-hero'); h.innerHTML = `<div class="w-meta"><div class="w-name">${wEsc(m.name)}</div><div class="w-chips2"><span>YouTube</span><span>Opens a search</span></div><p>Opens YouTube on the TV with “${wEsc(m.yt)}”.</p></div>`; } return; }
  WATCH.hero = m;
  const bd = $('#watch .w-bd'), a = bd.querySelector('.a'), b = bd.querySelector('.b'), front = a.classList.contains('on') ? b : a, back = front === a ? b : a;
  const url = m.background || m.poster;
  const img = new Image(); img.onload = () => { if (WATCH.hero !== m) return; front.style.backgroundImage = `url("${url}")`; front.classList.add('on'); back.classList.remove('on'); }; img.src = url;
  const g = (m.genres || m.genre || []).slice(0, 3), mins = wMins(m), yr = m.year || m.releaseInfo || '';
  const chips = [wRating(m) ? `★ ${wRating(m).toFixed(1)}` : '', yr, m.type === 'series' ? 'Series' : mins ? `${Math.floor(mins / 60) ? Math.floor(mins / 60) + ' hr ' : ''}${mins % 60} min` : '', ...g].filter(Boolean);
  const name = m.logo ? `<img class="w-logo" src="${wEsc(m.logo)}" alt="${wEsc(m.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div class="w-name" style="display:none">${wEsc(m.name)}</div>` : `<div class="w-name">${wEsc(m.name)}</div>`;
  $('#watch .w-hero').innerHTML = `<div class="w-meta">${name}<div class="w-chips2">${chips.map(c => `<span>${wEsc(c)}</span>`).join('')}</div><p>${wEsc(String(m.description || '').slice(0, 260))}</p></div>`;
}
function watchItem(r, c) {
  if (WATCH.step === 'ask') return null;
  if (r === 0) return null;
  const row = WATCH.rows[r - 1]; return row ? row.items[c] : null;
}
function watchFocus() {
  const w = $('#watch'); if (!w) return;
  w.querySelectorAll('.on-f').forEach(x => x.classList.remove('on-f'));
  const el = w.querySelector(`[data-r="${WATCH.f.r}"][data-c="${WATCH.f.c}"]`);
  if (!el) return;
  el.classList.add('on-f');
  if (WATCH.step === 'res') {
    const tr = el.closest('.w-track'); if (tr) { const x = el.offsetLeft - tr.clientWidth * 0.08; tr.style.transform = `translateX(${-Math.max(0, x)}px)`; }
    const rows = w.querySelector('.w-rows'), sec = el.closest('.w-row');
    if (rows && sec) rows.style.transform = `translateY(${-Math.max(0, sec.offsetTop - 0)}px)`;
    if (WATCH.f.r > 0) { const m = watchItem(WATCH.f.r, WATCH.f.c); clearTimeout(WATCH.ht); WATCH.ht = setTimeout(() => watchHero(m), 140); }
  }
}
function watchCount(r) {
  if (WATCH.step === 'ask') return [WATCH_MOODS.length, WATCH_TIMES.length, WATCH_WHO.length, 2][r] || 0;
  if (r === 0) return 4;
  const row = WATCH.rows[r - 1]; return row ? row.items.length : 0;
}
function watchToast(msg) { const t = $('#watch .w-toast'); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(WATCH.tt); WATCH.tt = setTimeout(() => { t.hidden = true; }, 3200); }
/* Opens a title in Nuvio (its own detail page), a trailer, or a YouTube search, through the app. */
function watchLaunch(kind, m) {
  if (!HB_APP || typeof HB_APP.open !== 'function') { watchToast('Update the TV app (Style → Screen & app → Update) to open titles from here.'); return; }
  let uri = '', pkg = '';
  if (kind === 'nuvio') { uri = `nuvio://${m.type === 'series' ? 'series' : 'movie'}/${m.imdb_id || m.id}`; pkg = 'nuvio'; }
  else if (kind === 'trailer') { const t = (m.trailerStreams && m.trailerStreams[0] && m.trailerStreams[0].ytId) || (m.trailers && m.trailers[0] && m.trailers[0].source); if (!t) { watchYt(`${m.name} ${m.year || ''} trailer`); return; } uri = `https://www.youtube.com/watch?v=${encodeURIComponent(t)}`; pkg = 'youtube'; }
  try { const r = HB_APP.open(uri, pkg); if (r) watchToast(String(r)); } catch (e) { watchToast("That didn't open."); }
}
function watchYt(q) {
  if (!HB_APP || typeof HB_APP.open !== 'function') { watchToast('Update the TV app to open YouTube from here.'); return; }
  try { const r = HB_APP.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, 'youtube'); if (r) watchToast(String(r)); } catch (e) {}
}
async function watchShow() {
  WATCH.step = 'res'; WATCH.busy = true;
  $('#watch .w-in').innerHTML = `<div class="w-load"><i></i><span>Finding something good…</span></div>`;
  await watchLoad(); WATCH.busy = false;
  if (!WATCH.open) return;
  if (!WATCH.rows.some(r => r.items.some(m => !m.yt))) { $('#watch .w-in').innerHTML = `<div class="w-load"><span>Couldn't reach the movie catalog right now. Check the TV's internet, then try again.</span></div>`; WATCH.step = 'err'; return; }
  watchResults();
}
function watchOpen() {
  watchBox(); WATCH.open = true; WATCH.step = 'ask'; WATCH.f = { r: 0, c: Math.max(0, WATCH_MOODS.findIndex(m => m[0] === WATCH.mood)) };
  document.body.classList.add('w-open'); watchAsk();
  try { HB_APP && typeof HB_APP.panel === 'function' && HB_APP.panel(true); } catch (e) {}
}
function watchClose() {
  WATCH.open = false; document.body.classList.remove('w-open');
  try { HB_APP && typeof HB_APP.panel === 'function' && HB_APP.panel(false); } catch (e) {}
}
function watchKey(k) {
  const f = WATCH.f;
  if (k === 'back' || k === 'menu') {
    if (WATCH.step === 'res' || WATCH.step === 'err') { WATCH.step = 'ask'; WATCH.f = { r: 3, c: 0 }; watchAsk(); } else watchClose();
    return true;
  }
  if (WATCH.busy) return true;
  const rows = WATCH.step === 'ask' ? 4 : WATCH.rows.length + 1;
  if (k === 'left' || k === 'right') { const n = watchCount(f.r); f.c = Math.max(0, Math.min(n - 1, f.c + (k === 'left' ? -1 : 1))); watchFocus(); return true; }
  if (k === 'up' || k === 'down') {
    const nr = Math.max(0, Math.min(rows - 1, f.r + (k === 'up' ? -1 : 1)));
    if (nr !== f.r) { f.r = nr; f.c = Math.min(f.c, watchCount(nr) - 1);
      if (WATCH.step === 'ask' && nr < 3) { const keys = [WATCH.mood, WATCH.time, WATCH.who], lists = [WATCH_MOODS, WATCH_TIMES, WATCH_WHO]; f.c = Math.max(0, lists[nr].findIndex(x => x[0] === keys[nr])); }
      watchFocus(); }
    return true;
  }
  if (k !== 'ok') return false;
  if (WATCH.step === 'ask') {
    if (f.r === 0) WATCH.mood = WATCH_MOODS[f.c][0]; else if (f.r === 1) WATCH.time = WATCH_TIMES[f.c][0]; else if (f.r === 2) WATCH.who = WATCH_WHO[f.c][0];
    else { if (f.c === 1) { const r = wRand(Date.now()); WATCH.mood = WATCH_MOODS[Math.floor(r() * WATCH_MOODS.length)][0]; WATCH.time = WATCH_TIMES[Math.floor(r() * 2) + 1][0]; } WATCH.seed = (Date.now() / 1000) | 0; watchShow(); return true; }
    const cur = f.r; watchAsk(); WATCH.f = { r: cur + 1, c: 0 }; if (cur + 1 < 3) { const keys = [WATCH.mood, WATCH.time, WATCH.who], lists = [WATCH_MOODS, WATCH_TIMES, WATCH_WHO]; WATCH.f.c = Math.max(0, lists[cur + 1].findIndex(x => x[0] === keys[cur + 1])); } watchFocus();
    return true;
  }
  if (WATCH.step !== 'res') return true;
  if (f.r === 0) {
    const m = WATCH.hero;
    if (f.c === 0 && m) watchLaunch('nuvio', m);
    else if (f.c === 1 && m) watchLaunch('trailer', m);
    else if (f.c === 2) { WATCH.seed++; watchShow(); }
    else if (f.c === 3) { WATCH.step = 'ask'; WATCH.f = { r: 0, c: 0 }; watchAsk(); }
    return true;
  }
  const m = watchItem(f.r, f.c); if (!m) return true;
  if (m.yt) watchYt(m.yt); else { WATCH.hero = m; watchLaunch('nuvio', m); }
  return true;
}
window.hbWatch = { open: watchOpen, close: watchClose };
document.addEventListener('keydown', e => { if (e.key === 'w' && !WATCH.open && !PANEL.open && MODE === 'home') { watchOpen(); e.preventDefault(); } }, true);
