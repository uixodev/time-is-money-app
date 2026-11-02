/* Tick — two currencies.
 * TIME: everyone gets 86,400 seconds every day (equal for all). Unspent time expires at midnight.
 * TICKS: your own earned currency. Hard deeds earn Ticks, useless deeds cost Ticks. Ticks never expire.
 * Vanilla JS, data in localStorage. */
(() => {
  'use strict';
  const KEY = 'tick.v1';
  const DAY = 86400;
  const $ = (s, el = document) => el.querySelector(s);
  // one tonal green family (+ ink) so every deed colour belongs to the brand
  const PALETTE = ['#C9F26B', '#6FBF3B', '#2F6B2A', '#A9C79B', '#E4F5B0', '#16210F'];

  // ---------- state ----------
  // Health: six pillars, each a 0–100 gauge that drains over time and refills with care deeds
  const PILLARS = {
    sleep:   { name: 'Sleep',   decay: 4.5 },   // points lost per hour
    food:    { name: 'Food',    decay: 6 },
    move:    { name: 'Move',    decay: 2 },
    hygiene: { name: 'Hygiene', decay: 3 },
    home:    { name: 'Home',    decay: 1.5 },
    family:  { name: 'Family',  decay: 1.2 },
  };
  const HEALTH_MIN = 40;          // below this overall Health you can't earn with hard deeds
  const DEBT_SURCHARGE = 1.5;     // useless time costs +50% while you're in debt
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const freshHealth = () => Object.fromEntries(Object.keys(PILLARS).map(k => [k, { v: 80, t: Date.now() }]));
  // kind: hard (earns) · care (refills a pillar) · useless (spends) · neutral (time only)
  // hard/useless: rate = Ticks per minute · care timer: pts = % per minute, rate = Ticks per minute
  // care tap: pts = % per check-in, rate = Ticks per check-in
  const defaultDeeds = () => [
    { id: 'd1',  name: 'Deep work',   color: PALETTE[0], kind: 'hard', rate: 3 },
    { id: 'd7',  name: 'Workout',     color: PALETTE[1], kind: 'care', pillar: 'move',    mode: 'timer', pts: 1.2, rate: 2 },
    { id: 'd2',  name: 'Sleep',       color: PALETTE[2], kind: 'care', pillar: 'sleep',   mode: 'timer', pts: 0.2, rate: 0.3 },
    { id: 'd8',  name: 'Meal',        color: PALETTE[3], kind: 'care', pillar: 'food',    mode: 'tap',   pts: 35,  rate: 3 },
    { id: 'd9',  name: 'Wash up',     color: PALETTE[4], kind: 'care', pillar: 'hygiene', mode: 'tap',   pts: 40,  rate: 2 },
    { id: 'd10', name: 'Cleaning',    color: PALETTE[1], kind: 'care', pillar: 'home',    mode: 'timer', pts: 1.5, rate: 1 },
    { id: 'd11', name: 'Family time', color: PALETTE[3], kind: 'care', pillar: 'family',  mode: 'timer', pts: 1,   rate: 1 },
    { id: 'd5',  name: 'Scrolling',   color: PALETTE[5], kind: 'useless', rate: 1 },
    { id: 'd6',  name: 'Gaming',      color: PALETTE[2], kind: 'useless', rate: 2 },
  ];
  const defaults = () => ({
    created: Date.now(),
    onboarded: false,
    gift: 30,      // welcome Ticks
    deeds: defaultDeeds(),
    health: freshHealth(),
    entries: [],   // {id, deedId, ts, secs, ticks (signed)}
    active: null,  // {deedId, start, startVal}
    goals: [],     // {id, name, target (Ticks)}
    chat: [],
  });
  const sgn = d => d.kind === 'hard' || d.kind === 'care' ? 1 : d.kind === 'useless' ? -1 : 0;
  let S;
  try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { S = defaults(); }
  const uid = () => Math.random().toString(36).slice(2, 9);
  (function migrate() {
    const OLDK = { d1: ['hard', 3], d3: ['hard', 4], d5: ['useless', 1] };
    S.deeds.forEach((d, i) => {
      if (!PALETTE.includes(d.color)) d.color = PALETTE[i % PALETTE.length];
      if (!d.kind) { const k = OLDK[d.id] || ['neutral', 0]; d.kind = k[0]; d.rate = k[1]; }
      // legacy Sleep / Workout become care deeds
      if (d.kind === 'neutral' && /sleep/i.test(d.name)) Object.assign(d, { kind: 'care', pillar: 'sleep', mode: 'timer', pts: 0.2, rate: 0.3 });
      if (d.kind === 'hard' && d.id === 'd3' && /workout|move|exercise/i.test(d.name)) Object.assign(d, { kind: 'care', pillar: 'move', mode: 'timer', pts: 1.2, rate: 2 });
    });
    if (!S.health) S.health = freshHealth();
    Object.keys(PILLARS).forEach(k => { if (!S.health[k]) S.health[k] = { v: 80, t: Date.now() }; });
    defaultDeeds().filter(n => n.kind === 'care').forEach(n => { if (!S.deeds.some(d => d.kind === 'care' && d.pillar === n.pillar)) S.deeds.push({ ...n }); });
    S.entries.forEach(e => { if (typeof e.ticks !== 'number') { const d = S.deeds.find(x => x.id === e.deedId); e.ticks = d ? sgn(d) * d.rate * e.secs / 60 : 0; } });
    S.goals = S.goals.filter(g => g.target);
  })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  // ---------- currency icons ----------
  const INK = '#16210F';
  // One coin family: same round shape + open "timer ring". Value shows on the coin; darker = worth more.
  const COINS = {
    tick:    { name: 'Tick',    value: 1,   label: '1',   fill: '#C9F26B', fg: INK },
    ten:     { name: 'Ten',     value: 10,  label: '10',  fill: '#E4F5B0', fg: INK },
    hundred: { name: 'Hundred', value: 100, label: '100', fill: '#2F6B2A', fg: '#C9F26B' },
  };
  const ring = fg => `<circle cx="24" cy="24" r="14.5" fill="none" stroke="${fg}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="72 19" transform="rotate(-70 24 24)"/>`;
  const coinInner = (c, withLabel) => `<circle cx="24" cy="24" r="21" fill="${c.fill}" stroke="${INK}" stroke-width="3"/>${ring(c.fg)}` +
    (withLabel ? `<text x="24" y="29.2" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${c.label.length > 2 ? 11 : 13}" font-weight="800" fill="${c.fg}">${c.label}</text>` : `<circle cx="24" cy="24" r="3.4" fill="${c.fg}"/>`);
  const coin = (k, size = 40) => `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">${coinInner(COINS[k], true)}</svg>`;
  // The Tick currency sign: a struck T with a seconds pip (brand/tick-sign.svg)
  const SIGN = '<path d="M14 14H50M32 14V52M21 31H43"/><circle cx="50" cy="48" r="3.6" fill="currentColor" stroke="none"/>';
  const signSVG = (cls, size) => `<svg ${cls ? `class="${cls}"` : ''} ${size ? `width="${size}" height="${size}"` : ''} viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SIGN}</svg>`;
  const tk = signSVG('tk');
  const symbol = (size = 26) => signSVG('', size);

  // consistent 24px line icons for the tab bar
  const ICONS = {
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3.5"/><path d="M3 10V8a3 3 0 0 1 3-3h10"/><circle cx="16.5" cy="13" r="1.1" fill="currentColor"/>',
    deeds: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 9.6"/>',
    ask: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>',
    goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    history: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  };
  const icon = k => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

  // ---------- time helpers ----------
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Math.round(n).toLocaleString();
  const hms = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 3600)}h ${pad(Math.floor(s / 60) % 60)}m ${pad(s % 60)}s`; };
  const clock = s => { s = Math.max(0, Math.floor(s)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
  const dur = s => {
    s = Math.round(s);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.round(s / 60)} min`;
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    return m ? `${h}h ${pad(m)}m` : `${h}h`;
  };
  // Ticks, big style (can be negative = debt): 1,234.<small>56</small>
  const tBig = n => { const neg = n < -0.004; const [i, d] = Math.abs(n).toFixed(2).split('.'); return `${neg ? '−' : ''}${Number(i).toLocaleString()}<small>.${d}</small>`; };
  const t1 = n => (Math.round(Math.abs(n) * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });
  const signed = n => (n > 0.04 ? '+' : n < -0.04 ? '−' : '') + t1(n);
  const nf = x => Number.isInteger(x) ? String(x) : String(Math.round(x * 10) / 10);
  const dayStart = off => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - off); return d.getTime(); };
  const nextMidnight = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); };
  const deedOf = id => S.deeds.find(d => d.id === id) || { id, name: 'Other', color: '#D6DCC8', kind: 'neutral', rate: 0 };
  const rateLbl = d => d.kind === 'hard' ? `+${nf(d.rate)}/min` : d.kind === 'useless' ? `−${nf(d.rate)}/min`
    : d.kind === 'care' ? (d.mode === 'tap' ? `+${nf(d.rate)} each` : `+${nf(d.rate)}/min`) : 'no Ticks';
  const careLbl = d => d.mode === 'tap' ? `${PILLARS[d.pillar].name} +${nf(d.pts)}%` : `${PILLARS[d.pillar].name} +${nf(d.pts)}%/min`;
  const dayRange = off => [dayStart(off), off === 0 ? nextMidnight() : dayStart(off - 1)];

  // ---------- Health ----------
  const hBase = k => { const h = S.health[k]; return clamp(h.v - PILLARS[k].decay * (Date.now() - h.t) / 3600000, 0, 100); };
  const activeElapsed = () => S.active ? (Date.now() - S.active.start) / 1000 : 0;
  const liveGain = k => {
    if (!S.active) return 0; const d = deedOf(S.active.deedId);
    return d.kind === 'care' && d.mode === 'timer' && d.pillar === k ? d.pts * activeElapsed() / 60 : 0;
  };
  const pv = k => clamp(hBase(k) + liveGain(k), 0, 100);
  const healthScore = () => { const v = Object.keys(PILLARS).map(pv); return 0.6 * (v.reduce((a, b) => a + b, 0) / v.length) + 0.4 * Math.min(...v); };
  const gated = () => healthScore() < HEALTH_MIN;
  const refill = (k, g) => { S.health[k] = { v: clamp(hBase(k) + g, 0, 100), t: Date.now() }; };
  const lowest = n => Object.keys(PILLARS).sort((a, b) => pv(a) - pv(b)).slice(0, n);

  // ---------- Ticks ----------
  // useless time costs more while you're in debt: normal rate until the balance hits zero, surcharged after
  const uselessCost = (r, m, b0) => {
    if (b0 <= 0) return DEBT_SURCHARGE * r * m;
    const t0 = b0 / r;
    return m <= t0 ? r * m : b0 + DEBT_SURCHARGE * r * (m - t0);
  };
  // Ticks a session of `secs` seconds is worth (negative = cost)
  function ticksFor(a, secs) {
    const d = deedOf(a.deedId), m = secs / 60;
    if (d.kind === 'hard') return d.rate * m;
    if (d.kind === 'care') {
      const cap = d.mode === 'timer' && d.pts > 0 ? Math.max(0, (100 - (a.startVal || 0)) / d.pts) : m;   // a full pillar stops paying
      return d.rate * Math.min(m, cap);
    }
    if (d.kind === 'useless') return -uselessCost(d.rate, m, ticksSaved());
    return 0;
  }
  const activeIn = (d0, d1) => !S.active ? 0 : Math.max(0, (Math.min(Date.now(), d1) - Math.max(S.active.start, d0)) / 1000);
  const activeTicks = (d0, d1) => { const el = activeElapsed(); return S.active && el > 0 ? ticksFor(S.active, el) * (activeIn(d0, d1) / el) : 0; };

  // TIME: seconds spent per deed in a day (offset 0 = today)
  function dayByDeed(off) {
    const [d0, d1] = dayRange(off), m = {};
    S.entries.forEach(e => { if (e.ts >= d0 && e.ts < d1 && e.secs > 0) m[e.deedId] = (m[e.deedId] || 0) + e.secs; });
    if (S.active) { const a = activeIn(d0, d1); if (a > 0) m[S.active.deedId] = (m[S.active.deedId] || 0) + a; }
    return m;
  }
  function dayTicksByDeed(off) {
    const [d0, d1] = dayRange(off), m = {};
    S.entries.forEach(e => { if (e.ts >= d0 && e.ts < d1) m[e.deedId] = (m[e.deedId] || 0) + e.ticks; });
    if (S.active) { const a = activeTicks(d0, d1); if (a) m[S.active.deedId] = (m[S.active.deedId] || 0) + a; }
    return m;
  }
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const timeLeft = () => Math.max(0, DAY - Math.min(DAY, sum(dayByDeed(0))));
  const dayEarnSpend = off => {
    const [d0, d1] = dayRange(off); let earned = 0, spent = 0;
    S.entries.forEach(e => { if (e.ts >= d0 && e.ts < d1) { if (e.ticks > 0) earned += e.ticks; else spent -= e.ticks; } });
    const a = activeTicks(d0, d1); if (a > 0) earned += a; else spent -= a;
    return { earned, spent };
  };
  const ticksSaved = () => S.gift + S.entries.reduce((a, e) => a + e.ticks, 0);   // without the running deed
  const balance = () => ticksSaved() + activeTicks(0, Infinity);                   // can be negative = debt
  const maxHardRate = () => Math.max(0, ...S.deeds.filter(d => d.kind === 'hard').map(d => d.rate));

  // record a finished session, splitting at midnights
  function addSpan(a, endMs) {
    const total = (endMs - a.start) / 1000, f = total > 0 ? ticksFor(a, total) / total : 0;
    let t = a.start;
    while (t < endMs) {
      const dd = new Date(t); dd.setHours(24, 0, 0, 0);
      const b = Math.min(endMs, dd.getTime()), secs = Math.round((b - t) / 1000);
      if (secs > 0) S.entries.push({ id: uid(), deedId: a.deedId, ts: t, secs, ticks: f * secs });
      t = b;
    }
  }
  function flash(msg) {
    const e = document.createElement('div'); e.className = 'toast'; e.textContent = msg; $('#app').appendChild(e);
    setTimeout(() => e.remove(), 2300);
  }
  function tapCare(id) {
    const d = deedOf(id), gain = Math.min(d.pts, 100 - hBase(d.pillar));
    if (gain < 0.5) { flash(`${PILLARS[d.pillar].name} is already full`); return; }
    const ticks = d.pts > 0 ? d.rate * gain / d.pts : 0;   // pays in proportion to what it actually refilled
    refill(d.pillar, gain);
    S.entries.push({ id: uid(), deedId: id, ts: Date.now(), secs: 0, ticks });
    save(); flash(`${PILLARS[d.pillar].name} +${nf(gain)}% · +${t1(ticks)} Ticks`); render();
  }

  // ---------- ui state ----------
  let tab = 'wallet';
  const TABS = [['wallet', 'Wallet'], ['deeds', 'Deeds'], ['ask', 'Ask'], ['goals', 'Goals'], ['history', 'History']];
  const renderTabs = () => { $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}"><span class="ic">${icon(k)}</span>${l}</button>`).join(''); };

  // ---------- sheet ----------
  function openSheet(html, onMount) {
    const w = $('#sheet'); w.hidden = false;
    w.innerHTML = `<div class="sheet">${html}</div>`;
    w.onclick = e => { if (e.target === w) closeSheet(); };
    onMount && onMount(w);
  }
  const closeSheet = () => { const w = $('#sheet'); w.hidden = true; w.innerHTML = ''; };
  const coinList = () => `<div class="coinlist">${['tick', 'ten', 'hundred'].map(k => `
    <div class="cl">${coin(k)}<div><b>${COINS[k].name} coin</b><span>${COINS[k].value} Tick${COINS[k].value > 1 ? 's' : ''}</span></div></div>`).join('')}</div>`;

  function aboutSheet(first) {
    openSheet(`
      <h3>${first ? 'Welcome to Tick' : 'How Tick works'}</h3>
      <div class="sub"><b>Time</b> is the same for everyone: <b>86,400 seconds</b> every day, gone at midnight.</div>
      <div class="sub" style="margin-top:8px"><b>Health</b> is your engine: sleep, food, move, hygiene, home and family. Look after them or you can't earn.</div>
      <div class="sub" style="margin-top:8px"><b>Ticks</b> are your money. Hard deeds and caring for yourself earn them. Useless deeds cost them — go below zero and they cost 50% more.</div>
      ${coinList()}
      <button class="btn" id="ok">${first ? `Start with ${S.gift} Ticks` : 'Got it'}</button>
      ${first ? '' : '<button class="link" id="reset">Reset all data</button>'}`, w => {
      $('#ok', w).onclick = () => { S.onboarded = true; save(); closeSheet(); render(); };
      const r = $('#reset', w);
      if (r) r.onclick = () => { if (confirm('Delete all deeds, history and goals?')) { S = defaults(); save(); closeSheet(); render(); } };
    });
  }

  // ---------- views ----------
  const head = (title, extra = '') => `<div class="head"><h1>${title}</h1><div style="display:flex;gap:8px">${extra}<button class="icon-btn" data-act="about" aria-label="How Tick works">${symbol(26)}</button></div></div>`;
  const purseHTML = () => {
    let b = Math.max(0, Math.floor(balance()));
    return ['hundred', 'ten', 'tick'].map(k => {
      const n = Math.floor(b / COINS[k].value); b -= n * COINS[k].value;
      return `<div class="coin">${coin(k)}<div class="n" data-coin="${k}">${n}</div><div class="u">${COINS[k].name}${n === 1 ? '' : 's'}</div></div>`;
    }).join('');
  };
  const pillarsHTML = () => Object.keys(PILLARS).map(k => {
    const v = Math.round(pv(k));
    return `<div class="pl ${v < HEALTH_MIN ? 'low' : ''}"><div class="pn"><span>${PILLARS[k].name}</span><b>${v}%</b></div><div class="pb"><i style="width:${v}%"></i></div></div>`;
  }).join('');
  const healthSub = () => gated() ? `Too low to earn — refill ${lowest(2).map(k => PILLARS[k].name).join(' or ')} first` : `Keep it above ${HEALTH_MIN}% to earn with hard deeds`;
  const deedBtn = d => {
    if (d.kind === 'care' && d.mode === 'tap') return `<button class="deedbtn" data-tap="${d.id}"><i class="dot" style="background:${d.color}"></i>${esc(d.name)}<em>${careLbl(d)} · ${rateLbl(d)}</em></button>`;
    const em = d.kind === 'care' ? `${careLbl(d)} · ${rateLbl(d)}` : rateLbl(d);
    return `<button class="deedbtn" data-start="${d.id}" ${d.kind === 'hard' && gated() ? 'disabled' : ''}><i class="dot" style="background:${d.color}"></i>${esc(d.name)}<em>${em}</em></button>`;
  };
  const group = (kind, title) => {
    const ds = S.deeds.filter(d => d.kind === kind); if (!ds.length) return '';
    return `<div class="glbl">${title}</div><div class="deeds">${ds.map(deedBtn).join('')}</div>`;
  };

  function viewWallet() {
    const bal = balance(), { earned, spent } = dayEarnSpend(0), left = timeLeft(), debt = bal < -0.004, hs = healthScore();
    return `
      ${head('Wallet')}
      <div class="card hero ${debt ? 'debt' : ''}">
        <div class="lbl" id="ballbl">${debt ? 'In debt · useless time costs +50%' : 'Your Ticks'}</div>
        <div class="big live" id="bal">${tk}${tBig(bal)}</div>
        <div class="sub live" id="earnline">+${t1(earned)} earned today · −${t1(spent)} spent</div>
      </div>
      <div class="card" id="health">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><b>Health</b><span class="mid live" id="hscore">${Math.round(hs)}<small>%</small></span></div>
        <div class="sub" id="hsub">${healthSub()}</div>
        <div class="pillars" id="pillars">${pillarsHTML()}</div>
      </div>
      <div class="card">
        ${S.active ? (() => { const d = deedOf(S.active.deedId); return `
          <div class="sub"><span class="pulse"></span>${{ hard: 'Earning on', care: 'Looking after', useless: 'Spending on', neutral: 'Doing' }[d.kind]} <b>${esc(d.name)}</b> · ${rateLbl(d)}</div>
          <div class="mid live" id="clock">${clock(activeElapsed())}</div>
          <div class="sub live" id="sess"></div>
          <button class="btn stop" data-act="stop">Stop</button>`; })() : `
          <div class="mid">What are you doing?</div>
          <div class="sub">${gated() ? 'Health is too low for hard deeds. Look after yourself first.' : 'Hard things earn Ticks. Useless things cost them.'}</div>
          ${group('hard', 'Earn')}${group('care', 'Look after yourself')}${group('useless', 'Spend')}${group('neutral', 'Just living')}`}
      </div>
      <div class="purse" id="purse">${purseHTML()}</div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><b>Time left today</b><span class="sub live" id="hms">${hms(left)}</span></div>
        <div class="bar"><i id="bar" style="width:${((DAY - left) / DAY) * 100}%"></i></div>
        <div class="sub" style="margin-top:6px">Everyone gets 86,400 seconds a day · expires at midnight</div>
      </div>
      <h2>Where today went</h2>
      <div class="card" id="where">${whereHTML()}</div>`;
  }
  function whereHTML() {
    const byT = dayByDeed(0), byK = dayTicksByDeed(0), ids = [...new Set([...Object.keys(byT), ...Object.keys(byK)])].sort((a, b) => (byT[b] || 0) - (byT[a] || 0));
    return ids.length ? `<div class="segbar">${ids.filter(id => byT[id]).map(id => `<i style="width:${(byT[id] / DAY) * 100}%;background:${deedOf(id).color}"></i>`).join('')}</div>` + ids.map(id => `
      <div class="row"><i class="dot" style="background:${deedOf(id).color}"></i><div class="t"><b>${esc(deedOf(id).name)}</b><span>${byT[id] ? dur(byT[id]) : 'check-in'}</span></div>
      <div class="r"><b>${deedOf(id).kind === 'neutral' ? '—' : tk + signed(byK[id] || 0)}</b></div></div>`).join('')
      : '<div class="empty">Nothing yet. Look after yourself or do something hard and earn your first Ticks.</div>';
  }

  function viewDeeds() {
    const byT = dayByDeed(0), byK = dayTicksByDeed(0);
    const sub = d => d.kind === 'care'
      ? `${PILLARS[d.pillar].name} · ${d.mode === 'tap' ? `+${nf(d.pts)}% per check-in · +${nf(d.rate)} Ticks` : `+${nf(d.pts)}%/min · +${nf(d.rate)} Ticks/min`}`
      : `${rateLbl(d)} · ${dur(byT[d.id] || 0)} today`;
    const grp = (kind, title) => {
      const ds = S.deeds.filter(d => d.kind === kind); if (!ds.length) return '';
      return `<h2>${title}</h2><div class="card">${ds.map(d => `<div class="row"><i class="dot" style="background:${d.color};width:18px;height:18px"></i>
        <div class="t"><b>${esc(d.name)}</b><span>${sub(d)}</span></div>
        <div class="r"><b>${d.kind === 'neutral' ? '' : tk + signed(byK[d.id] || 0)}</b></div><button class="x edit" data-edit="${d.id}" aria-label="Edit ${esc(d.name)}">✎</button></div>`).join('')}</div>`;
    };
    return `
      ${head('Deeds', '<button class="icon-btn" data-act="adddeed" aria-label="Add deed">+</button>')}
      ${grp('hard', 'Hard · earn Ticks')}${grp('care', 'Care · refill your Health')}${grp('useless', 'Useless · cost Ticks')}${grp('neutral', 'Just living')}
      <button class="btn lime" data-act="logpast" style="border:1.5px solid var(--ink)">+ Log time I already spent</button>`;
  }

  function parseDur(q) {
    const re = /(\d+(?:\.\d+)?)\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi;
    let tot = 0, m, found = false;
    while ((m = re.exec(q))) { found = true; const u = m[2][0].toLowerCase(); tot += parseFloat(m[1]) * (u === 'd' ? 86400 : u === 'h' ? 3600 : u === 'm' ? 60 : 1); }
    return found ? tot : null;
  }
  function answer(q) {
    const l = q.toLowerCase(), bal = balance();
    const named = S.deeds.find(d => l.includes(d.name.toLowerCase()));
    if (/health|pillar|tired|energy/.test(l)) {
      const ks = lowest(2);
      return `Health is ${Math.round(healthScore())}%. Lowest: ${PILLARS[ks[0]].name} ${Math.round(pv(ks[0]))}%, ${PILLARS[ks[1]].name} ${Math.round(pv(ks[1]))}%.` + (gated() ? '\nThat is too low to earn with hard deeds — refill a pillar first.' : '');
    }
    const mt = l.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*ticks?\b/);
    if (mt) {
      const n = parseFloat(mt[1]), hard = Math.max(1, maxHardRate()), useless = S.deeds.filter(d => d.kind === 'useless').map(d => d.rate), avgU = useless.length ? useless.reduce((a, b) => a + b, 0) / useless.length : 1;
      return `${num(n)} Ticks is about ${dur(n / avgU * 60)} of useless fun.\nTo earn them: ${dur(n / hard * 60)} of your hardest deed (${hard}/min).`;
    }
    const secs = parseDur(q);
    if (secs !== null) {
      const d = named || { kind: 'useless', rate: 1, name: 'useless time' }, m = secs / 60, pct = (secs / DAY * 100).toFixed(1);
      if (d.kind === 'hard') return `${dur(secs)} of ${d.name} earns +${t1(d.rate * m)} Ticks (${d.rate}/min).\nThat's ${pct}% of today's time.\nYou'd have ${t1(bal + d.rate * m)} Ticks.` + (gated() ? '\nBut Health is too low to start it right now.' : '');
      if (d.kind === 'care') return d.mode === 'tap' ? `${d.name} is a quick check-in: ${careLbl(d)}, +${nf(d.rate)} Ticks.` : `${dur(secs)} of ${d.name} refills ${PILLARS[d.pillar].name} by ${nf(d.pts * m)}% and earns +${t1(d.rate * m)} Ticks.`;
      if (d.kind === 'useless') {
        const cost = uselessCost(d.rate, m, bal), left = bal - cost;
        return `${dur(secs)} of ${d.name === 'useless time' ? q.replace(/(\d+(?:\.\d+)?)\s*[a-z]+\b/i, '').trim() || d.name : d.name} costs ${t1(cost)} Ticks (${d.rate}/min).\n` +
          (left >= 0 ? `You have ${t1(bal)} → ${t1(left)} left.\n` : `That puts you ${t1(-left)} Ticks in debt (+50% surcharge while in debt).\n`) + `That's ${pct}% of today's time.`;
      }
      return `${dur(secs)} of ${d.name} costs no Ticks, but uses ${pct}% of today's time.`;
    }
    if (/tick|balance|wallet|have|afford|debt/.test(l)) return bal < 0 ? `You are ${t1(-bal)} Ticks in debt. Earn some to get back above zero.` : `You have ${t1(bal)} Ticks. Hard deeds and caring for yourself earn more.`;
    if (/left|time/.test(l)) return `You have ${hms(timeLeft())} of today's time left. It expires at midnight.`;
    if (/earn|spen[dt]|top|most|where/.test(l)) { const { earned, spent } = dayEarnSpend(0); return `Today: +${t1(earned)} earned, −${t1(spent)} spent. Net ${signed(earned - spent)} Ticks.`; }
    return 'Try “2h scrolling”, “1h deep work”, “100 ticks”, “how is my health?” or “how many Ticks do I have?”';
  }
  function viewAsk() {
    const chips = ['2h scrolling', '1h deep work', '100 ticks', 'how is my health?', 'how many Ticks do I have?'];
    return `
      <div class="glow"></div>
      ${head('Ask')}
      <div class="greet">Hey you 👋</div>
      <div class="sub">Ask what something costs in Ticks — or how your Health is doing.</div>
      <div class="chat" id="chat">${S.chat.map(c => `<div class="bub ${c.from}">${esc(c.text)}</div>`).join('')}</div>
      <div>${chips.map(c => `<button class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <form class="askbar" id="askform"><input class="field" id="q" autocomplete="off" placeholder="Ask me anything"><button aria-label="Send">↑</button></form>`;
  }

  function viewGoals() {
    const bal = Math.max(0, balance()), hr = Math.max(1, maxHardRate());
    return `
      ${head('Goals', '<button class="icon-btn" data-act="addgoal" aria-label="Add goal">+</button>')}
      <div class="sub" style="margin:-4px 0 12px">Rewards you're earning Ticks for.</div>
      ${S.goals.length ? S.goals.map((g, i) => {
        const pct = Math.min(100, (bal / g.target) * 100), cls = ['peach', 'mint', 'sky'][i % 3], need = g.target - balance();
        return `<div class="card ${cls}">
          <div style="display:flex;justify-content:space-between"><div class="mid">${esc(g.name)}</div><button class="x" data-del-goal="${g.id}" aria-label="Delete goal">✕</button></div>
          <div class="big">${tk}${num(Math.min(bal, g.target))}</div>
          <div class="sub">of ${tk}${num(g.target)} · ${need > 0 ? `${num(need)} to go ≈ ${dur(need / hr * 60)} of hard work` : 'You can afford it 🎉'}</div>
          <div class="bar"><i style="width:${pct}%"></i></div></div>`;
      }).join('') : '<div class="card"><div class="empty">No goals yet.<br>Tap + and name a guilt-free reward, like “Gaming weekend”.</div></div>'}`;
  }

  function viewHistory() {
    const rows = [6, 5, 4, 3, 2, 1, 0].map(off => {
      const d0 = dayStart(off), by = dayByDeed(off), s = Math.min(DAY, sum(by)), et = dayEarnSpend(off);
      return { off, d0, by, s, ...et, valid: d0 + 86400000 > S.created };
    });
    const valid = rows.filter(r => r.valid), n = Math.max(1, valid.length);
    const avgE = valid.reduce((a, r) => a + r.earned, 0) / n, avgS = valid.reduce((a, r) => a + r.spent, 0) / n;
    return `
      ${head('History')}
      <div class="grid2">
        <div class="card"><div class="mid">${tk}${t1(avgE)}</div><div class="sub">Avg earned / day</div></div>
        <div class="card"><div class="mid">${tk}${t1(avgS)}</div><div class="sub">Avg spent / day</div></div>
      </div>
      <div class="card"><b>Where your time went</b>
        <div class="chart">${rows.map(r => `<div class="col"><div class="stack" title="${dur(r.s)}">${Object.entries(r.by).map(([id, s]) => `<i style="height:${Math.min(100, (s / DAY) * 100)}%;background:${deedOf(id).color}"></i>`).join('')}</div><small>${new Date(r.d0).toLocaleDateString(undefined, { weekday: 'narrow' })}</small></div>`).join('')}</div>
        <div class="sub" style="margin-top:10px">Each bar is one day of 86,400 seconds. Empty space = time that expired unspent.</div></div>
      <h2>Day by day</h2>
      <div class="card">${[...rows].reverse().map(r => `
        <div class="dayrow"><div class="t" style="flex:1"><b>${r.off === 0 ? 'Today' : r.off === 1 ? 'Yesterday' : new Date(r.d0).toLocaleDateString(undefined, { weekday: 'long' })}</b>
        <div class="sub">${r.valid ? `+${t1(r.earned)} earned · −${t1(r.spent)} spent` : 'Before you joined'}</div></div>
        <div class="r"><b>${r.valid ? tk + signed(r.earned - r.spent) : '—'}</b></div></div>`).join('')}</div>`;
  }

  // ---------- render ----------
  function render() {
    renderTabs();
    const v = $('#view'), sc = v.scrollTop;
    v.innerHTML = { wallet: viewWallet, deeds: viewDeeds, ask: viewAsk, goals: viewGoals, history: viewHistory }[tab]();
    v.scrollTop = sc;
    if (tab === 'ask') { const c = $('#chat'); c.lastElementChild && c.lastElementChild.scrollIntoView({ block: 'end' }); }
  }
  let lastKey = '';
  function tick() {
    const dk = new Date().toDateString();
    if (lastKey && lastKey !== dk) render();
    lastKey = dk;
    if (S.active && deedOf(S.active.deedId).kind === 'hard' && gated()) { stopActive(); flash('Health is too low — session stopped'); return; }
    if (tab !== 'wallet') return;
    const bal = balance(), { earned, spent } = dayEarnSpend(0), left = timeLeft(), debt = bal < -0.004, hs = healthScore();
    const set = (id, h) => { const e = $(id); if (e) e.innerHTML = h; };
    set('#bal', tk + tBig(bal));
    set('#ballbl', debt ? 'In debt · useless time costs +50%' : 'Your Ticks');
    const hero = $('.hero'); if (hero) hero.classList.toggle('debt', debt);
    set('#earnline', `+${t1(earned)} earned today · −${t1(spent)} spent`);
    set('#hscore', `${Math.round(hs)}<small>%</small>`); set('#hsub', healthSub()); set('#pillars', pillarsHTML());
    set('#hms', hms(left));
    const bar = $('#bar'); if (bar) bar.style.width = ((DAY - left) / DAY) * 100 + '%';
    let b = Math.max(0, Math.floor(bal));
    ['hundred', 'ten', 'tick'].forEach(k => { const n = Math.floor(b / COINS[k].value); b -= n * COINS[k].value; const e = $(`[data-coin="${k}"]`); if (e) e.textContent = n; });
    if (S.active) {
      const d = deedOf(S.active.deedId), el = activeElapsed(), t = ticksFor(S.active, el);
      const c = $('#clock'); if (c) c.textContent = clock(el);
      const s = $('#sess');
      if (s) s.innerHTML = d.kind === 'neutral' ? 'No Ticks change' : `${t >= 0 ? '+' : '−'}${tk}${Math.abs(t).toFixed(2)} this session` + (d.kind === 'care' && d.mode === 'timer' ? ` · ${PILLARS[d.pillar].name} ${Math.round(pv(d.pillar))}%` : '');
      const wh = $('#where'); if (wh) wh.innerHTML = whereHTML();
    }
  }
  setInterval(tick, 250);

  function stopActive() {
    const a = S.active; if (!a) return;
    const d = deedOf(a.deedId), end = Math.min(Date.now(), a.start + DAY * 1000);
    S.active = null;
    addSpan(a, end);
    if (d.kind === 'care' && d.mode === 'timer' && d.pts > 0) refill(d.pillar, d.pts * (end - a.start) / 60000);
    save(); render();
  }

  // ---------- sheets ----------
  const RATE_OPTS = [1, 2, 3, 4, 5].map(n => `<option value="${n}">${n} Tick${n > 1 ? 's' : ''} / min</option>`).join('');
  const PILLAR_OPTS = Object.entries(PILLARS).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join('');
  function deedSheet(id) {
    const ed = id ? S.deeds.find(d => d.id === id) : null;
    let color = ed ? ed.color : PALETTE[S.deeds.length % PALETTE.length];
    openSheet(`<h3>${ed ? 'Edit deed' : 'New deed'}</h3><div class="sub">${ed ? 'Changes apply from now on — past time keeps the Ticks it already earned or cost.' : 'Hard deeds earn Ticks, care deeds refill your Health, useless deeds spend Ticks.'}</div>
      <label class="l">Name</label><input class="field" id="dn" maxlength="24" placeholder="Reading" value="${ed ? esc(ed.name) : ''}">
      <label class="l">Type</label><select class="field sel" id="dk"><option value="hard">Hard — earns Ticks</option><option value="care">Care — refills a Health pillar</option><option value="useless">Useless — costs Ticks</option><option value="neutral">Just living — no Ticks</option></select>
      <div id="rr"><label class="l">How hard / how useless?</label><select class="field sel" id="dr">${RATE_OPTS}</select></div>
      <div id="cc">
        <label class="l">Pillar</label><select class="field sel" id="cp">${PILLAR_OPTS}</select>
        <label class="l">How it works</label><select class="field sel" id="cm"><option value="timer">Timer — takes time (sleep, exercise)</option><option value="tap">Check-in — one tap (meal, brushing teeth)</option></select>
        <label class="l" id="pl1">Health % per minute</label><input class="field" id="cpts" type="number" inputmode="decimal" min="0.1" step="0.1">
        <label class="l" id="pl2">Ticks per minute</label><input class="field" id="crate" type="number" inputmode="decimal" min="0" step="0.1">
      </div>
      <label class="l">Colour</label><div class="swatches" id="sw">${PALETTE.map(c => `<button type="button" class="swatch ${c === color ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
      <button class="btn" id="ok">${ed ? 'Save changes' : 'Add deed'}</button>
      ${ed ? '<button class="link" id="del">Delete this deed</button>' : ''}`, w => {
      $('#dk', w).value = ed ? ed.kind : 'hard';
      $('#dr', w).value = String(ed && (ed.kind === 'hard' || ed.kind === 'useless') ? ed.rate : 2);
      $('#cp', w).value = ed && ed.pillar ? ed.pillar : 'sleep';
      $('#cm', w).value = ed && ed.mode ? ed.mode : 'timer';
      $('#cpts', w).value = ed && ed.kind === 'care' ? ed.pts : 1;
      $('#crate', w).value = ed && ed.kind === 'care' ? ed.rate : 1;
      const sync = () => {
        const k = $('#dk', w).value, tap = $('#cm', w).value === 'tap';
        $('#rr', w).style.display = k === 'hard' || k === 'useless' ? '' : 'none';
        $('#cc', w).style.display = k === 'care' ? '' : 'none';
        $('#pl1', w).textContent = tap ? 'Health % per check-in' : 'Health % per minute';
        $('#pl2', w).textContent = tap ? 'Ticks per check-in' : 'Ticks per minute';
      };
      sync(); $('#dk', w).onchange = sync; $('#cm', w).onchange = sync;
      $('#sw', w).onclick = e => {
        const sw = e.target.closest('.swatch'); if (!sw) return;
        color = sw.dataset.color; w.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === sw));
      };
      $('#ok', w).onclick = () => {
        const name = $('#dn', w).value.trim(); if (!name) { $('#dn', w).focus(); return; }
        const kind = $('#dk', w).value;
        let fields = { name, kind, color };
        if (kind === 'hard' || kind === 'useless') fields = { ...fields, rate: parseInt($('#dr', w).value, 10), pillar: undefined, mode: undefined, pts: undefined };
        else if (kind === 'care') {
          const pts = parseFloat($('#cpts', w).value), rate = parseFloat($('#crate', w).value);
          if (!(pts > 0) || !(rate >= 0)) { $('#cpts', w).focus(); return; }
          fields = { ...fields, pillar: $('#cp', w).value, mode: $('#cm', w).value, pts, rate };
        } else fields = { ...fields, rate: 0, pillar: undefined, mode: undefined, pts: undefined };
        if (ed) {
          if (S.active && S.active.deedId === ed.id) stopActive();   // bank the running session at the old settings first
          Object.assign(ed, fields);
        } else S.deeds.push({ id: uid(), ...fields });
        save(); closeSheet(); render();
      };
      const del = $('#del', w);
      if (del) del.onclick = () => { if (confirm(`Delete “${ed.name}”? Your history keeps its time and Ticks.`)) { if (S.active && S.active.deedId === ed.id) stopActive(); S.deeds = S.deeds.filter(x => x.id !== ed.id); save(); closeSheet(); render(); } };
      $('#dn', w).focus();
    });
  }
  const loggable = () => S.deeds.filter(d => !(d.kind === 'care' && d.mode === 'tap'));
  const deedOptions = () => loggable().map(d => `<option value="${d.id}">${esc(d.name)} (${rateLbl(d)})</option>`).join('');
  function logPastSheet() {
    if (!loggable().length) return;
    openSheet(`<h3>Log time already spent</h3><div class="sub">${hms(timeLeft())} of time left today.</div>
      <label class="l">Deed</label><select class="field sel" id="ld">${deedOptions()}</select>
      <label class="l">Minutes</label><input class="field" id="lm" type="number" inputmode="decimal" min="1" step="1" placeholder="30">
      <div class="sub" id="lv" style="margin-top:10px"></div>
      <button class="btn" id="ok">Log it</button>`, w => {
      const calc = () => {
        const d = deedOf($('#ld', w).value), m = parseFloat($('#lm', w).value);
        if (!(m > 0)) return null;
        const mins = Math.min(m, timeLeft() / 60);
        let ticks = 0, gain = 0;
        if (d.kind === 'hard') ticks = d.rate * mins;
        else if (d.kind === 'useless') ticks = -uselessCost(d.rate, mins, ticksSaved());
        else if (d.kind === 'care') { const cap = d.pts > 0 ? Math.max(0, (100 - hBase(d.pillar)) / d.pts) : mins; ticks = d.rate * Math.min(mins, cap); gain = d.pts * mins; }
        return { d, mins, ticks, gain };
      };
      const show = () => { const c = calc(); $('#lv').innerHTML = c ? (c.d.kind === 'neutral' ? 'No Ticks change' : `${c.ticks >= 0 ? '+' : '−'}${tk}${t1(c.ticks)}${c.gain ? ` · ${PILLARS[c.d.pillar].name} +${nf(Math.min(c.gain, 100))}%` : ''}`) : ''; };
      $('#lm', w).oninput = show; $('#ld', w).onchange = show;
      $('#ok', w).onclick = () => {
        const c = calc(); if (!c || c.mins <= 0) return;
        const secs = Math.round(c.mins * 60); if (secs <= 0) return;
        if (c.d.kind === 'hard' && gated()) { flash('Health is too low for hard deeds'); return; }
        S.entries.push({ id: uid(), deedId: c.d.id, ts: Date.now(), secs, ticks: c.ticks });
        if (c.gain) refill(c.d.pillar, c.gain);
        save(); closeSheet(); render();
      };
    });
  }
  function addGoalSheet() {
    openSheet(`<h3>New goal</h3><div class="sub">A guilt-free reward to earn Ticks for.</div>
      <label class="l">Reward</label><input class="field" id="gn" maxlength="30" placeholder="Gaming weekend">
      <label class="l">Ticks needed</label><input class="field" id="gt" type="number" inputmode="decimal" min="1" placeholder="600">
      <button class="btn" id="ok">Create goal</button>`, w => {
      $('#ok', w).onclick = () => {
        const name = $('#gn', w).value.trim(), t = parseFloat($('#gt', w).value); if (!name || !(t > 0)) return;
        S.goals.push({ id: uid(), name, target: t }); save(); closeSheet(); render();
      };
    });
  }

  // ---------- events ----------
  function ask(text) {
    text = text.trim(); if (!text) return;
    S.chat.push({ from: 'me', text }, { from: 'bot', text: answer(text) }); S.chat = S.chat.slice(-40); save(); render();
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.tab) { tab = d.tab; render(); return; }
    if (d.chip) { ask(d.chip); return; }
    if (d.tap) { tapCare(d.tap); return; }
    if (d.start) {
      const dd = deedOf(d.start);
      if (S.active || timeLeft() <= 0) return;
      if (dd.kind === 'hard' && gated()) { flash('Health is too low — refill a pillar first'); return; }
      S.active = { deedId: d.start, start: Date.now(), startVal: dd.kind === 'care' ? hBase(dd.pillar) : 0 }; save(); render(); return;
    }
    if (d.edit) { deedSheet(d.edit); return; }
    if (d.delGoal) { S.goals = S.goals.filter(g => g.id !== d.delGoal); save(); render(); return; }
    switch (d.act) {
      case 'stop': stopActive(); break;
      case 'about': aboutSheet(false); break;
      case 'adddeed': deedSheet(); break;
      case 'logpast': logPastSheet(); break;
      case 'addgoal': addGoalSheet(); break;
    }
  });
  document.addEventListener('submit', e => { if (e.target.id === 'askform') { e.preventDefault(); ask($('#q').value); } });

  // ---------- boot ----------
  $('#logo').innerHTML = signSVG('', 52) + '<span>tick</span>';
  $('#logo').style.cssText = 'font-size:44px;gap:10px';
  render(); tick();
  setTimeout(() => { $('#splash').classList.add('hide'); if (!S.onboarded) aboutSheet(true); }, 900);
})();
