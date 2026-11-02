/* Tick — a daily time currency.
 * 1 Tick = 1 second. Everyone receives 86,400 Ticks each midnight (same for all).
 * Spend them on your deeds. Unspent Ticks expire at midnight.
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
    deeds: [
      { id: 'd1', name: 'Deep work', color: PALETTE[0] },
      { id: 'd2', name: 'Sleep', color: PALETTE[2] },
      { id: 'd3', name: 'Move', color: PALETTE[1] },
      { id: 'd4', name: 'People', color: PALETTE[3] },
      { id: 'd5', name: 'Scrolling', color: PALETTE[5] },
    ],
    entries: [],   // {id, deedId, ts (ms, within a single day), secs}
    active: null,  // {deedId, start}
    goals: [],     // {id, name, deedId, targetSecs}
    chat: [],
  });
  let S;
  try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { S = defaults(); }
  S.deeds.forEach((d, i) => { if (!PALETTE.includes(d.color)) d.color = PALETTE[i % PALETTE.length]; }); // migrate old colours
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const uid = () => Math.random().toString(36).slice(2, 9);

  // ---------- currency icons ----------
  const INK = '#16210F';
  // One coin family: same round shape + open "timer ring". Value shows on the coin; darker = worth more.
  const COINS = {
    tick:   { name: 'Tick',   secs: 1,     label: '1s', fill: '#C9F26B', fg: INK },
    minute: { name: 'Minute', secs: 60,    label: '1m', fill: '#E4F5B0', fg: INK },
    hour:   { name: 'Hour',   secs: 3600,  label: '1h', fill: '#2F6B2A', fg: '#C9F26B' },
    day:    { name: 'Day',    secs: 86400, label: '1d', fill: INK,       fg: '#C9F26B' },
  };
  const ring = fg => `<circle cx="24" cy="24" r="14.5" fill="none" stroke="${fg}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="72 19" transform="rotate(-70 24 24)"/>`;
  const coinInner = (c, withLabel) => `<circle cx="24" cy="24" r="21" fill="${c.fill}" stroke="${INK}" stroke-width="3"/>${ring(c.fg)}` +
    (withLabel ? `<text x="24" y="29.2" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="13" font-weight="800" fill="${c.fg}">${c.label}</text>` : `<circle cx="24" cy="24" r="3.4" fill="${c.fg}"/>`);
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
  const dayStart = off => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - off); return d.getTime(); };
  const nextMidnight = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); };
  const deedOf = id => S.deeds.find(d => d.id === id) || { id, name: 'Other', color: '#D6DCC8' };

  // seconds of the active deed that fall inside [d0,d1)
  const activeIn = (d0, d1) => !S.active ? 0 : Math.max(0, (Math.min(Date.now(), d1) - Math.max(S.active.start, d0)) / 1000);
  // seconds spent per deed in a day (offset 0 = today)
  function dayByDeed(off) {
    const d0 = dayStart(off), d1 = off === 0 ? nextMidnight() : dayStart(off - 1);
    const m = {};
    S.entries.forEach(e => { if (e.ts >= d0 && e.ts < d1) m[e.deedId] = (m[e.deedId] || 0) + e.secs; });
    if (S.active) { const a = activeIn(d0, d1); if (a > 0) m[S.active.deedId] = (m[S.active.deedId] || 0) + a; }
    return m;
  }
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const spentToday = () => Math.min(DAY, sum(dayByDeed(0)));
  const balance = () => Math.max(0, DAY - spentToday());
  const deedTotal = id => S.entries.filter(e => e.deedId === id).reduce((a, e) => a + e.secs, 0) + (S.active && S.active.deedId === id ? (Date.now() - S.active.start) / 1000 : 0);

  // add a span of time spent, splitting at midnights
  function addSpan(deedId, startMs, endMs) {
    let a = startMs;
    while (a < endMs) {
      const d = new Date(a); d.setHours(24, 0, 0, 0);
      const b = Math.min(endMs, d.getTime());
      const secs = Math.round((b - a) / 1000);
      if (secs > 0) S.entries.push({ id: uid(), deedId, ts: a, secs });
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
  const coinList = () => `<div class="coinlist">${['tick', 'minute', 'hour', 'day'].map(k => `
    <div class="cl">${coin(k)}<div><b>${COINS[k].name} coin</b><span>${k === 'tick' ? '1 second' : k === 'minute' ? '60 Ticks · 1 minute' : k === 'hour' ? '3,600 Ticks · 1 hour' : '86,400 Ticks · 1 full day'}</span></div></div>`).join('')}</div>`;

  function aboutSheet(first) {
    openSheet(`
      <h3>${first ? 'Welcome to Tick' : 'About the Tick'}</h3>
      <div class="sub">A currency everyone earns equally. Every midnight you receive <b>86,400 Ticks</b> — one for each second of the day. Spend them on your deeds. Unspent Ticks expire at midnight.</div>
      ${coinList()}
      <button class="btn" id="ok">${first ? "Claim today's Ticks" : 'Got it'}</button>
      ${first ? '' : '<button class="link" id="reset">Reset all data</button>'}`, w => {
      $('#ok', w).onclick = () => { S.onboarded = true; save(); closeSheet(); render(); };
      const r = $('#reset', w);
      if (r) r.onclick = () => { if (confirm('Delete all deeds, history and goals?')) { S = defaults(); save(); closeSheet(); render(); } };
    });
  }

  // ---------- views ----------
  const head = (title, extra = '') => `<div class="head"><h1>${title}</h1><div style="display:flex;gap:8px">${extra}<button class="icon-btn" data-act="about" aria-label="About the Tick">${symbol(26)}</button></div></div>`;

  function viewWallet() {
    const bal = balance(), spent = DAY - bal;
    let b = bal;
    const purse = ['hour', 'minute', 'tick'].map(k => {
      const n = k === 'tick' ? b : Math.floor(b / COINS[k].secs);
      b -= n * COINS[k].secs;
      return `<div class="coin">${coin(k)}<div class="n" data-coin="${k}">${Math.floor(n)}</div><div class="u">${COINS[k].name}${n === 1 ? '' : 's'}</div></div>`;
    }).join('');
    return `
      ${head('Wallet')}
      <div class="card hero">
        <div class="lbl">Today's Ticks left</div>
        <div class="big live" id="bal">${tk}${num(bal)}</div>
        <div class="sub live" id="hms">${hms(bal)} to spend · expires at midnight</div>
        <div class="bar"><i id="bar" style="width:${(spent / DAY) * 100}%"></i></div>
        <div class="sub" style="margin-top:6px" id="spentline">${num(spent)} spent · ${((spent / DAY) * 100).toFixed(1)}% of today</div>
      </div>
      <div class="purse" id="purse">${purse}</div>
      <div class="card">
        ${S.active ? (() => { const d = deedOf(S.active.deedId); return `
          <div class="sub"><span class="pulse"></span>Spending on <b>${esc(d.name)}</b></div>
          <div class="mid live" id="clock">${clock((Date.now() - S.active.start) / 1000)}</div>
          <div class="sub live" id="sess"></div>
          <button class="btn stop" data-act="stop">Stop spending</button>`; })() : `
          <div class="mid">Spend your Ticks</div>
          <div class="sub">Pick a deed and your balance starts counting down.</div>
          <div class="deeds">${S.deeds.map(d => `<button class="deedbtn" data-start="${d.id}"><i class="dot" style="background:${d.color}"></i>${esc(d.name)}</button>`).join('')}</div>`}
      </div>
      <h2>Where today went</h2>
      <div class="card" id="where">${whereHTML()}</div>`;
  }
  function whereHTML() {
    const byDeed = Object.entries(dayByDeed(0)).sort((a, b) => b[1] - a[1]);
    return byDeed.length ? `<div class="segbar">${byDeed.map(([id, s]) => `<i style="width:${(s / DAY) * 100}%;background:${deedOf(id).color}"></i>`).join('')}</div>` + byDeed.map(([id, s]) => `
      <div class="row"><i class="dot" style="background:${deedOf(id).color}"></i><div class="t"><b>${esc(deedOf(id).name)}</b></div>
      <div class="r"><b>${tk}${num(s)}</b><span>${dur(s)}</span></div></div>`).join('')
      : '<div class="empty">Nothing spent yet. All 86,400 Ticks are yours.</div>';
  }

  function viewDeeds() {
    return `
      ${head('Deeds', '<button class="icon-btn" data-act="adddeed" aria-label="Add deed">+</button>')}
      <div class="card">${S.deeds.length ? S.deeds.map(d => {
        const t = sum(Object.fromEntries([[d.id, dayByDeed(0)[d.id] || 0]]));
        return `<div class="row"><i class="dot" style="background:${d.color};width:18px;height:18px"></i>
          <div class="t"><b>${esc(d.name)}</b><span>${dur(t)} today · ${dur(deedTotal(d.id))} all time</span></div>
          <div class="r"><b>${tk}${num(t)}</b></div><button class="x" data-del-deed="${d.id}" aria-label="Delete deed">✕</button></div>`;
      }).join('') : '<div class="empty">Add your first deed with +</div>'}</div>
      <button class="btn lime" data-act="logpast" style="border:1.5px solid var(--ink);margin-top:0">+ Log time I already spent</button>`;
  }

  function parseDur(q) {
    const re = /(\d+(?:\.\d+)?)\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi;
    let tot = 0, m, found = false;
    while ((m = re.exec(q))) { found = true; const u = m[2][0].toLowerCase(); tot += parseFloat(m[1]) * (u === 'd' ? 86400 : u === 'h' ? 3600 : u === 'm' ? 60 : 1); }
    return found ? tot : null;
  }
  function answer(q) {
    const l = q.toLowerCase(), secs = parseDur(q);
    if (secs !== null) {
      const bal = balance(), left = bal - secs;
      const what = q.replace(/(\d+(?:\.\d+)?)\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi, '').replace(/[?]/g, '').trim();
      const verdict = secs / DAY < 0.02 ? 'Cheap. Go for it ✨' : secs / DAY < 0.1 ? 'Worth a second thought 🤔' : 'That is a big chunk of your day. Sure? 👀';
      return `${what ? what + ': ' : ''}${num(secs)} Ticks (${dur(secs)}).\nThat's ${(secs / DAY * 100).toFixed(1)}% of a day.\n` +
        (left >= 0 ? `You'd have ${hms(left)} left today.\n` : `That's more than the ${hms(bal)} you have left.\n`) + verdict;
    }
    if (/left|balance|wallet|have/.test(l)) return `You have ${num(balance())} Ticks left today (${hms(balance())}). They expire at midnight.`;
    if (/spen[dt]|top|most|where/.test(l)) {
      const e = Object.entries(dayByDeed(0)).sort((a, b) => b[1] - a[1]);
      return e.length ? `Today you've spent ${num(spentToday())} Ticks. Most on ${deedOf(e[0][0]).name} (${dur(e[0][1])}).` : "You haven't spent anything yet today.";
    }
    return 'Try “2h Netflix”, “45 min scrolling”, “how much is left?” or “where did my time go?”';
  }
  function viewAsk() {
    const chips = ['2h Netflix', '45 min scrolling', '10 min walk', 'how much is left?', 'where did my time go?'];
    return `
      <div class="glow"></div>
      ${head('Ask')}
      <div class="greet">Hey you 👋</div>
      <div class="sub">Tell me how long something takes and I'll tell you what it costs in Ticks.</div>
      <div class="chat" id="chat">${S.chat.map(c => `<div class="bub ${c.from}">${esc(c.text)}</div>`).join('')}</div>
      <div>${chips.map(c => `<button class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <form class="askbar" id="askform"><input class="field" id="q" autocomplete="off" placeholder="Ask me anything"><button aria-label="Send">↑</button></form>`;
  }

  function viewGoals() {
    return `
      ${head('Goals', '<button class="icon-btn" data-act="addgoal" aria-label="Add goal">+</button>')}
      ${S.goals.length ? S.goals.map((g, i) => {
        const done = deedTotal(g.deedId), pct = Math.min(100, (done / g.targetSecs) * 100), cls = ['peach', 'mint', 'sky'][i % 3];
        return `<div class="card ${cls}">
          <div style="display:flex;justify-content:space-between"><div class="mid">${esc(g.name)}</div><button class="x" data-del-goal="${g.id}" aria-label="Delete goal">✕</button></div>
          <div class="big">${tk}${num(done)}</div>
          <div class="sub">of ${tk}${num(g.targetSecs)} · ${done >= g.targetSecs ? 'Goal reached 🎉' : `${dur(g.targetSecs - done)} still to spend on ${esc(deedOf(g.deedId).name)}`}</div>
          <div class="bar"><i style="width:${pct}%"></i></div></div>`;
      }).join('') : '<div class="card"><div class="empty">No goals yet.<br>Tap + and decide how many hours a deed deserves.</div></div>'}`;
  }

  function viewHistory() {
    const rows = [6, 5, 4, 3, 2, 1, 0].map(off => {
      const d0 = dayStart(off), by = dayByDeed(off), s = Math.min(DAY, sum(by));
      return { off, d0, by, s, valid: d0 + 86400000 > S.created };
    });
    const valid = rows.filter(r => r.valid);
    const avg = valid.length ? valid.reduce((a, r) => a + r.s, 0) / valid.length : 0;
    return `
      ${head('History')}
      <div class="grid2">
        <div class="card"><div class="mid">${dur(avg)}</div><div class="sub">Avg spent / day</div></div>
        <div class="card"><div class="mid">${dur(DAY - avg)}</div><div class="sub">Avg expired / day</div></div>
      </div>
      <div class="card"><b>Last 7 days</b>
        <div class="chart">${rows.map(r => `<div class="col"><div class="stack" title="${num(r.s)} Ticks">${Object.entries(r.by).map(([id, s]) => `<i style="height:${Math.min(100, (s / DAY) * 100)}%;background:${deedOf(id).color}"></i>`).join('')}</div><small>${new Date(r.d0).toLocaleDateString(undefined, { weekday: 'narrow' })}</small></div>`).join('')}</div>
        <div class="sub" style="margin-top:10px">Each bar is a full day of 86,400 Ticks. Empty space = Ticks that expired unspent.</div></div>
      <h2>Day by day</h2>
      <div class="card">${[...rows].reverse().map(r => `
        <div class="dayrow"><div class="t" style="flex:1"><b>${r.off === 0 ? 'Today' : r.off === 1 ? 'Yesterday' : new Date(r.d0).toLocaleDateString(undefined, { weekday: 'long' })}</b>
        <div class="sub">${r.valid ? `${dur(r.s)} spent · ${r.off === 0 ? dur(DAY - r.s) + ' left' : dur(DAY - r.s) + ' expired'}` : 'Before you joined'}</div></div>
        <div class="r"><b>${r.valid ? tk + num(r.s) : '—'}</b></div></div>`).join('')}</div>`;
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
    // new day started → refresh the whole screen
    const dk = new Date().toDateString();
    if (lastKey && lastKey !== dk) render();
    lastKey = dk;
    if (tab !== 'wallet') return;
    const bal = balance(), spent = DAY - bal;
    const set = (id, h) => { const e = $(id); if (e) e.innerHTML = h; };
    set('#bal', tk + num(bal)); set('#hms', hms(bal) + ' to spend · expires at midnight');
    set('#spentline', `${num(spent)} spent · ${((spent / DAY) * 100).toFixed(1)}% of today`);
    const wh = $('#where'); if (wh && S.active) wh.innerHTML = whereHTML();
    const bar = $('#bar'); if (bar) bar.style.width = (spent / DAY) * 100 + '%';
    let b = bal;
    ['hour', 'minute', 'tick'].forEach(k => { const n = k === 'tick' ? b : Math.floor(b / COINS[k].secs); b -= n * COINS[k].secs; const e = $(`[data-coin="${k}"]`); if (e) e.textContent = Math.floor(n); });
    if (S.active) {
      const el = (Date.now() - S.active.start) / 1000;
      const c = $('#clock'); if (c) c.textContent = clock(el);
      const s = $('#sess'); if (s) s.innerHTML = `−${tk}${num(el)} this session`;
      if (bal <= 0) stopActive();
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
  function addDeedSheet() {
    openSheet(`<h3>New deed</h3><div class="sub">Something you spend your Ticks on.</div>
      <label class="l">Name</label><input class="field" id="dn" maxlength="24" placeholder="Reading">
      <button class="btn" id="ok">Add deed</button>`, w => {
      $('#ok', w).onclick = () => {
        const name = $('#dn', w).value.trim(); if (!name) return;
        S.deeds.push({ id: uid(), name, color: PALETTE[S.deeds.length % PALETTE.length] }); save(); closeSheet(); render();
      };
      $('#dn', w).focus();
    });
  }
  function deedOptions() { return S.deeds.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join(''); }
  function logPastSheet() {
    if (!S.deeds.length) return;
    openSheet(`<h3>Log time already spent</h3><div class="sub">You have ${hms(balance())} left today.</div>
      <label class="l">Deed</label><select class="field sel" id="ld">${deedOptions()}</select>
      <label class="l">Minutes</label><input class="field" id="lm" type="number" inputmode="decimal" min="1" step="1" placeholder="30">
      <div class="sub" id="lv" style="margin-top:10px"></div>
      <button class="btn" id="ok">Spend Ticks</button>`, w => {
      $('#lm', w).oninput = () => { const m = parseFloat($('#lm', w).value); $('#lv', w).innerHTML = m > 0 ? `= ${tk}${num(m * 60)} Ticks` : ''; };
      $('#ok', w).onclick = () => {
        const m = parseFloat($('#lm', w).value); if (!(m > 0)) return;
        const secs = Math.min(Math.round(m * 60), balance()); if (secs <= 0) return;
        S.entries.push({ id: uid(), deedId: $('#ld', w).value, ts: Date.now(), secs }); save(); closeSheet(); render();
      };
    });
  }
  function addGoalSheet() {
    if (!S.deeds.length) return;
    openSheet(`<h3>New goal</h3><div class="sub">How much of your life does it deserve?</div>
      <label class="l">Goal</label><input class="field" id="gn" maxlength="30" placeholder="Learn guitar">
      <label class="l">Deed to count</label><select class="field sel" id="gd">${deedOptions()}</select>
      <label class="l">Target (hours)</label><input class="field" id="gh" type="number" inputmode="decimal" min="0.5" step="0.5" placeholder="50">
      <button class="btn" id="ok">Create goal</button>`, w => {
      $('#ok', w).onclick = () => {
        const name = $('#gn', w).value.trim(), h = parseFloat($('#gh', w).value); if (!name || !(h > 0)) return;
        S.goals.push({ id: uid(), name, deedId: $('#gd', w).value, targetSecs: Math.round(h * 3600) }); save(); closeSheet(); render();
      };
    });
  }

  // ---------- events ----------
  function ask(text) {
    text = text.trim(); if (!text) return;
    S.chat.push({ from: 'me', text }, { from: 'bot', text: answer(text) }); S.chat = S.chat.slice(-40); save(); render();
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.tab) { tab = d.tab; render(); return; }
    if (d.chip) { ask(d.chip); return; }
    if (d.start) { if (balance() > 0 && !S.active) { S.active = { deedId: d.start, start: Date.now() }; save(); render(); } return; }
    if (d.delDeed) { if (S.active && S.active.deedId === d.delDeed) stopActive(); S.deeds = S.deeds.filter(x => x.id !== d.delDeed); S.goals = S.goals.filter(g => g.deedId !== d.delDeed); save(); render(); return; }
    if (d.delGoal) { S.goals = S.goals.filter(g => g.id !== d.delGoal); save(); render(); return; }
    switch (d.act) {
      case 'stop': stopActive(); break;
      case 'about': aboutSheet(false); break;
      case 'adddeed': addDeedSheet(); break;
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
