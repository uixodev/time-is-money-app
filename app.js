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
  const defaults = () => ({
    created: Date.now(),
    onboarded: false,
    gift: 30,      // welcome Ticks so you can try a useless deed right away
    deeds: [       // kind: 'hard' earns, 'useless' spends, 'neutral' only uses time; rate = Ticks per minute
      { id: 'd1', name: 'Deep work', color: PALETTE[0], kind: 'hard', rate: 3 },
      { id: 'd3', name: 'Workout', color: PALETTE[1], kind: 'hard', rate: 4 },
      { id: 'd5', name: 'Scrolling', color: PALETTE[5], kind: 'useless', rate: 1 },
      { id: 'd6', name: 'Gaming', color: PALETTE[3], kind: 'useless', rate: 2 },
      { id: 'd2', name: 'Sleep', color: PALETTE[2], kind: 'neutral', rate: 0 },
    ],
    entries: [],   // {id, deedId, ts, secs, ticks (signed)}
    active: null,  // {deedId, start}
    goals: [],     // {id, name, target (Ticks)}
    chat: [],
  });
  const sgn = d => d.kind === 'hard' ? 1 : d.kind === 'useless' ? -1 : 0;
  let S;
  try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { S = defaults(); }
  const OLDK = { d1: ['hard', 3], d3: ['hard', 4], d5: ['useless', 1] };
  S.deeds.forEach((d, i) => {
    if (!PALETTE.includes(d.color)) d.color = PALETTE[i % PALETTE.length];
    if (!d.kind) { const k = OLDK[d.id] || ['neutral', 0]; d.kind = k[0]; d.rate = k[1]; }
  });
  S.entries.forEach(e => { if (typeof e.ticks !== 'number') { const d = S.deeds.find(x => x.id === e.deedId); e.ticks = d ? sgn(d) * d.rate * e.secs / 60 : 0; } });
  S.goals = S.goals.filter(g => g.target);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const uid = () => Math.random().toString(36).slice(2, 9);

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
  // Ticks, big style: 1,234.<small>56</small>
  const tBig = n => { n = Math.max(0, n); const [i, d] = n.toFixed(2).split('.'); return `${Number(i).toLocaleString()}<small>.${d}</small>`; };
  const t1 = n => (Math.round(Math.abs(n) * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + t1(n);
  const dayStart = off => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - off); return d.getTime(); };
  const nextMidnight = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); };
  const deedOf = id => S.deeds.find(d => d.id === id) || { id, name: 'Other', color: '#D6DCC8', kind: 'neutral', rate: 0 };
  const rateLbl = d => d.kind === 'hard' ? `+${d.rate}/min` : d.kind === 'useless' ? `−${d.rate}/min` : 'no Ticks';
  const dayRange = off => [dayStart(off), off === 0 ? nextMidnight() : dayStart(off - 1)];

  // seconds of the active deed that fall inside [d0,d1)
  const activeIn = (d0, d1) => !S.active ? 0 : Math.max(0, (Math.min(Date.now(), d1) - Math.max(S.active.start, d0)) / 1000);
  const activeTicks = (d0, d1) => { if (!S.active) return 0; const d = deedOf(S.active.deedId); return sgn(d) * d.rate * activeIn(d0, d1) / 60; };

  // TIME: seconds spent per deed in a day (offset 0 = today)
  function dayByDeed(off) {
    const [d0, d1] = dayRange(off), m = {};
    S.entries.forEach(e => { if (e.ts >= d0 && e.ts < d1) m[e.deedId] = (m[e.deedId] || 0) + e.secs; });
    if (S.active) { const a = activeIn(d0, d1); if (a > 0) m[S.active.deedId] = (m[S.active.deedId] || 0) + a; }
    return m;
  }
  // TICKS: earned / spent per deed in a day
  function dayTicksByDeed(off) {
    const [d0, d1] = dayRange(off), m = {};
    S.entries.forEach(e => { if (e.ts >= d0 && e.ts < d1) m[e.deedId] = (m[e.deedId] || 0) + e.ticks; });
    if (S.active) { const a = activeTicks(d0, d1); if (a) m[S.active.deedId] = (m[S.active.deedId] || 0) + a; }
    return m;
  }
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const spentToday = () => Math.min(DAY, sum(dayByDeed(0)));
  const timeLeft = () => Math.max(0, DAY - spentToday());
  const dayEarnSpend = off => {
    const [d0, d1] = dayRange(off); let earned = 0, spent = 0;
    S.entries.forEach(e => { if (e.ts >= d0 && e.ts < d1) { if (e.ticks > 0) earned += e.ticks; else spent -= e.ticks; } });
    const a = activeTicks(d0, d1); if (a > 0) earned += a; else spent -= a;
    return { earned, spent };
  };
  const ticksSaved = () => S.gift + S.entries.reduce((a, e) => a + e.ticks, 0);   // without the running deed
  const balance = () => Math.max(0, ticksSaved() + activeTicks(0, Infinity));
  const maxHardRate = () => Math.max(0, ...S.deeds.filter(d => d.kind === 'hard').map(d => d.rate));

  // add a span of time, splitting at midnights; useless deeds can never push Ticks below zero
  function addSpan(deedId, startMs, endMs) {
    const d = deedOf(deedId), totalSecs = (endMs - startMs) / 1000;
    let delta = sgn(d) * d.rate * totalSecs / 60;
    if (delta < 0) delta = Math.max(delta, -Math.max(0, ticksSaved()));
    const f = totalSecs > 0 ? delta / totalSecs : 0;
    let a = startMs;
    while (a < endMs) {
      const dd = new Date(a); dd.setHours(24, 0, 0, 0);
      const b = Math.min(endMs, dd.getTime()), secs = Math.round((b - a) / 1000);
      if (secs > 0) S.entries.push({ id: uid(), deedId, ts: a, secs, ticks: f * secs });
      a = b;
    }
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
      <div class="sub" style="margin-top:8px"><b>Ticks</b> are your own money. <b>Hard deeds earn them. Useless deeds cost them.</b> Ticks never expire — earn first, waste time guilt-free.</div>
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
    let b = Math.floor(balance());
    return ['hundred', 'ten', 'tick'].map(k => {
      const n = Math.floor(b / COINS[k].value); b -= n * COINS[k].value;
      return `<div class="coin">${coin(k)}<div class="n" data-coin="${k}">${n}</div><div class="u">${COINS[k].name}${n === 1 ? '' : 's'}</div></div>`;
    }).join('');
  };
  const startBtns = kind => {
    const bal = balance();
    return S.deeds.filter(d => d.kind === kind).map(d => {
      const off = d.kind === 'useless' && bal < d.rate;
      return `<button class="deedbtn" data-start="${d.id}" ${off ? 'disabled' : ''}><i class="dot" style="background:${d.color}"></i>${esc(d.name)}<em>${rateLbl(d)}</em></button>`;
    }).join('') || '<span class="sub">None yet — add one in Deeds.</span>';
  };

  function viewWallet() {
    const bal = balance(), { earned, spent } = dayEarnSpend(0), left = timeLeft(), used = DAY - left;
    return `
      ${head('Wallet')}
      <div class="card hero">
        <div class="lbl">Your Ticks</div>
        <div class="big live" id="bal">${tk}${tBig(bal)}</div>
        <div class="sub live" id="earnline">+${t1(earned)} earned today · −${t1(spent)} spent</div>
      </div>
      <div class="purse" id="purse">${purseHTML()}</div>
      <div class="card">
        ${S.active ? (() => { const d = deedOf(S.active.deedId); return `
          <div class="sub"><span class="pulse"></span>${d.kind === 'hard' ? 'Earning on' : d.kind === 'useless' ? 'Spending on' : 'Doing'} <b>${esc(d.name)}</b> · ${rateLbl(d)}</div>
          <div class="mid live" id="clock">${clock((Date.now() - S.active.start) / 1000)}</div>
          <div class="sub live" id="sess"></div>
          <button class="btn stop" data-act="stop">Stop</button>`; })() : `
          <div class="mid">What are you doing?</div>
          <div class="sub">Hard things earn Ticks. Useless things cost them.</div>
          <div class="glbl">Earn</div><div class="deeds" id="g-hard">${startBtns('hard')}</div>
          <div class="glbl">Spend</div><div class="deeds" id="g-useless">${startBtns('useless')}</div>
          ${S.deeds.some(d => d.kind === 'neutral') ? `<div class="glbl">Just living</div><div class="deeds">${startBtns('neutral')}</div>` : ''}`}
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><b>Time left today</b><span class="sub live" id="hms">${hms(left)}</span></div>
        <div class="bar"><i id="bar" style="width:${(used / DAY) * 100}%"></i></div>
        <div class="sub" style="margin-top:6px">Everyone gets 86,400 seconds a day · expires at midnight</div>
      </div>
      <h2>Where today went</h2>
      <div class="card" id="where">${whereHTML()}</div>`;
  }
  function whereHTML() {
    const byT = dayByDeed(0), byK = dayTicksByDeed(0), ids = Object.keys(byT).sort((a, b) => byT[b] - byT[a]);
    return ids.length ? `<div class="segbar">${ids.map(id => `<i style="width:${(byT[id] / DAY) * 100}%;background:${deedOf(id).color}"></i>`).join('')}</div>` + ids.map(id => `
      <div class="row"><i class="dot" style="background:${deedOf(id).color}"></i><div class="t"><b>${esc(deedOf(id).name)}</b><span>${dur(byT[id])}</span></div>
      <div class="r"><b>${deedOf(id).kind === 'neutral' ? '—' : tk + signed(byK[id] || 0)}</b></div></div>`).join('')
      : '<div class="empty">Nothing yet. Do something hard and earn your first Ticks.</div>';
  }

  function viewDeeds() {
    const byT = dayByDeed(0), byK = dayTicksByDeed(0);
    const group = (kind, title) => {
      const ds = S.deeds.filter(d => d.kind === kind); if (!ds.length) return '';
      return `<h2>${title}</h2><div class="card">${ds.map(d => `<div class="row"><i class="dot" style="background:${d.color};width:18px;height:18px"></i>
        <div class="t"><b>${esc(d.name)}</b><span>${rateLbl(d)} · ${dur(byT[d.id] || 0)} today</span></div>
        <div class="r"><b>${d.kind === 'neutral' ? '' : tk + signed(byK[d.id] || 0)}</b></div><button class="x edit" data-edit="${d.id}" aria-label="Edit ${esc(d.name)}">✎</button></div>`).join('')}</div>`;
    };
    return `
      ${head('Deeds', '<button class="icon-btn" data-act="adddeed" aria-label="Add deed">+</button>')}
      ${group('hard', 'Hard · earn Ticks')}${group('useless', 'Useless · cost Ticks')}${group('neutral', 'Just living')}
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
    const mt = l.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*ticks?\b/);
    if (mt) {
      const n = parseFloat(mt[1]), hard = Math.max(1, maxHardRate()), useless = S.deeds.filter(d => d.kind === 'useless').map(d => d.rate), avgU = useless.length ? useless.reduce((a, b) => a + b, 0) / useless.length : 1;
      return `${num(n)} Ticks is about ${dur(n / avgU * 60)} of useless fun.\nTo earn them: ${dur(n / hard * 60)} of your hardest deed (${hard}/min).`;
    }
    const secs = parseDur(q);
    if (secs !== null) {
      const d = named || { kind: 'useless', rate: 1, name: 'useless time' };
      const t = d.rate * secs / 60, pct = (secs / DAY * 100).toFixed(1);
      if (d.kind === 'hard') return `${dur(secs)} of ${d.name} earns +${t1(t)} Ticks (${d.rate}/min).\nThat's ${pct}% of today's time.\nYou'd have ${t1(bal + t)} Ticks.`;
      if (d.kind === 'useless') {
        const left = bal - t;
        return `${dur(secs)} of ${d.name === 'useless time' ? q.replace(/(\d+(?:\.\d+)?)\s*[a-z]+\b/i, '').trim() || d.name : d.name} costs ${t1(t)} Ticks (${d.rate}/min).\n` +
          (left >= 0 ? `You have ${t1(bal)} → ${t1(left)} left.\n` : `You only have ${t1(bal)}. Earn ${t1(-left)} more first — about ${dur(-left / Math.max(1, maxHardRate()) * 60)} of hard work.\n`) + `That's ${pct}% of today's time.`;
      }
      return `${dur(secs)} of ${d.name} costs no Ticks, but uses ${pct}% of today's time.`;
    }
    if (/tick|balance|wallet|have|afford/.test(l)) return `You have ${t1(bal)} Ticks. Hard deeds earn more, useless ones spend them.`;
    if (/left|time/.test(l)) return `You have ${hms(timeLeft())} of today's time left. It expires at midnight.`;
    if (/earn|spen[dt]|top|most|where/.test(l)) { const { earned, spent } = dayEarnSpend(0); return `Today: +${t1(earned)} earned, −${t1(spent)} spent. Net ${signed(earned - spent)} Ticks.`; }
    return 'Try “2h scrolling”, “1h deep work”, “100 ticks” or “how many Ticks do I have?”';
  }
  function viewAsk() {
    const chips = ['2h scrolling', '1h deep work', '100 ticks', 'how many Ticks do I have?', 'how much time is left?'];
    return `
      <div class="glow"></div>
      ${head('Ask')}
      <div class="greet">Hey you 👋</div>
      <div class="sub">Ask what something costs in Ticks — or how long it takes to earn.</div>
      <div class="chat" id="chat">${S.chat.map(c => `<div class="bub ${c.from}">${esc(c.text)}</div>`).join('')}</div>
      <div>${chips.map(c => `<button class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <form class="askbar" id="askform"><input class="field" id="q" autocomplete="off" placeholder="Ask me anything"><button aria-label="Send">↑</button></form>`;
  }

  function viewGoals() {
    const bal = balance(), hr = Math.max(1, maxHardRate());
    return `
      ${head('Goals', '<button class="icon-btn" data-act="addgoal" aria-label="Add goal">+</button>')}
      <div class="sub" style="margin:-4px 0 12px">Rewards you're earning Ticks for.</div>
      ${S.goals.length ? S.goals.map((g, i) => {
        const pct = Math.min(100, (bal / g.target) * 100), cls = ['peach', 'mint', 'sky'][i % 3], need = g.target - bal;
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
    if (tab !== 'wallet') return;
    const bal = balance(), { earned, spent } = dayEarnSpend(0), left = timeLeft();
    const set = (id, h) => { const e = $(id); if (e) e.innerHTML = h; };
    set('#bal', tk + tBig(bal));
    set('#earnline', `+${t1(earned)} earned today · −${t1(spent)} spent`);
    set('#hms', hms(left));
    const bar = $('#bar'); if (bar) bar.style.width = ((DAY - left) / DAY) * 100 + '%';
    let b = Math.floor(bal);
    ['hundred', 'ten', 'tick'].forEach(k => { const n = Math.floor(b / COINS[k].value); b -= n * COINS[k].value; const e = $(`[data-coin="${k}"]`); if (e) e.textContent = n; });
    if (S.active) {
      const d = deedOf(S.active.deedId), el = (Date.now() - S.active.start) / 1000, t = sgn(d) * d.rate * el / 60;
      const c = $('#clock'); if (c) c.textContent = clock(el);
      const s = $('#sess'); if (s) s.innerHTML = d.kind === 'neutral' ? 'No Ticks change' : `${t > 0 ? '+' : '−'}${tk}${Math.abs(t).toFixed(2)} this session`;
      const wh = $('#where'); if (wh) wh.innerHTML = whereHTML();
      if (d.kind === 'useless' && bal <= 0.005) stopActive();   // out of Ticks → time to stop
    }
  }
  setInterval(tick, 250);

  function stopActive() {
    const a = S.active; if (!a) return;
    S.active = null;
    addSpan(a.deedId, a.start, Math.min(Date.now(), a.start + DAY * 1000));
    save(); render();
  }

  // ---------- sheets ----------
  const RATE_OPTS = [1, 2, 3, 4, 5].map(n => `<option value="${n}">${n} Tick${n > 1 ? 's' : ''} / min</option>`).join('');
  function deedSheet(id) {
    const ed = id ? S.deeds.find(d => d.id === id) : null;
    let color = ed ? ed.color : PALETTE[S.deeds.length % PALETTE.length];
    openSheet(`<h3>${ed ? 'Edit deed' : 'New deed'}</h3><div class="sub">Hard deeds earn Ticks. Useless deeds spend them.${ed ? ' Changes apply from now on — past time keeps the Ticks it already earned or cost.' : ''}</div>
      <label class="l">Name</label><input class="field" id="dn" maxlength="24" placeholder="Reading" value="${ed ? esc(ed.name) : ''}">
      <label class="l">Type</label><select class="field sel" id="dk"><option value="hard">Hard — earns Ticks</option><option value="useless">Useless — costs Ticks</option><option value="neutral">Just living — no Ticks</option></select>
      <div id="rr"><label class="l">How hard / how useless?</label><select class="field sel" id="dr">${RATE_OPTS}</select></div>
      <label class="l">Colour</label><div class="swatches" id="sw">${PALETTE.map(c => `<button type="button" class="swatch ${c === color ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
      <button class="btn" id="ok">${ed ? 'Save changes' : 'Add deed'}</button>
      ${ed ? '<button class="link" id="del">Delete this deed</button>' : ''}`, w => {
      $('#dk', w).value = ed ? ed.kind : 'hard';
      $('#dr', w).value = String(ed && ed.rate ? ed.rate : 2);
      const sync = () => { $('#rr', w).style.display = $('#dk', w).value === 'neutral' ? 'none' : ''; };
      sync(); $('#dk', w).onchange = sync;
      $('#sw', w).onclick = e => {
        const sw = e.target.closest('.swatch'); if (!sw) return;
        color = sw.dataset.color; w.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === sw));
      };
      $('#ok', w).onclick = () => {
        const name = $('#dn', w).value.trim(); if (!name) { $('#dn', w).focus(); return; }
        const kind = $('#dk', w).value, rate = kind === 'neutral' ? 0 : parseInt($('#dr', w).value, 10);
        if (ed) {
          if (S.active && S.active.deedId === ed.id) stopActive();   // bank the running session at the old rate first
          Object.assign(ed, { name, kind, rate, color });
        } else S.deeds.push({ id: uid(), name, color, kind, rate });
        save(); closeSheet(); render();
      };
      const del = $('#del', w);
      if (del) del.onclick = () => { if (confirm(`Delete “${ed.name}”? Your history keeps its time and Ticks.`)) { if (S.active && S.active.deedId === ed.id) stopActive(); S.deeds = S.deeds.filter(x => x.id !== ed.id); save(); closeSheet(); render(); } };
      $('#dn', w).focus();
    });
  }
  const deedOptions = () => S.deeds.map(d => `<option value="${d.id}">${esc(d.name)} (${rateLbl(d)})</option>`).join('');
  function logPastSheet() {
    if (!S.deeds.length) return;
    openSheet(`<h3>Log time already spent</h3><div class="sub">${hms(timeLeft())} of time and ${t1(balance())} Ticks available.</div>
      <label class="l">Deed</label><select class="field sel" id="ld">${deedOptions()}</select>
      <label class="l">Minutes</label><input class="field" id="lm" type="number" inputmode="decimal" min="1" step="1" placeholder="30">
      <div class="sub" id="lv" style="margin-top:10px"></div>
      <button class="btn" id="ok">Log it</button>`, w => {
      const calc = () => {
        const d = deedOf($('#ld', w).value), m = parseFloat($('#lm', w).value);
        if (!(m > 0)) return null;
        let mins = Math.min(m, timeLeft() / 60);
        if (d.kind === 'useless') mins = Math.min(mins, ticksSaved() / d.rate);
        return { d, mins };
      };
      const show = () => { const c = calc(); $('#lv').innerHTML = c ? (c.d.kind === 'neutral' ? 'No Ticks change' : `${c.d.kind === 'hard' ? '+' : '−'}${tk}${t1(c.d.rate * c.mins)}${c.mins < parseFloat($('#lm', w).value) ? ' (limited by what you have)' : ''}`) : ''; };
      $('#lm', w).oninput = show; $('#ld', w).onchange = show;
      $('#ok', w).onclick = () => {
        const c = calc(); if (!c || c.mins <= 0) return;
        const secs = Math.round(c.mins * 60); if (secs <= 0) return;
        S.entries.push({ id: uid(), deedId: c.d.id, ts: Date.now(), secs, ticks: sgn(c.d) * c.d.rate * secs / 60 }); save(); closeSheet(); render();
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
    if (d.start) { const dd = deedOf(d.start); if (!S.active && timeLeft() > 0 && !(dd.kind === 'useless' && balance() < dd.rate)) { S.active = { deedId: d.start, start: Date.now() }; save(); render(); } return; }
    if (d.edit) { deedSheet(d.edit); return; }
    if (d.delDeed) { if (S.active && S.active.deedId === d.delDeed) stopActive(); S.deeds = S.deeds.filter(x => x.id !== d.delDeed); save(); render(); return; }
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
