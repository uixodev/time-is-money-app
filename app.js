/* Worth — treat time as money. Vanilla JS, data stored in localStorage. */
(() => {
  'use strict';
  const KEY = 'worth.v1';
  const HOUR = 3600000;
  const $ = (s, el = document) => el.querySelector(s);

  // ---------- state ----------
  const defaults = () => ({
    rate: 0,            // $ per hour
    dailyHours: 6,      // daily target in hours
    sessions: [],       // {id,label,start,end,rate}
    purchases: [],      // {id,name,amount,ts}
    goals: [],          // {id,name,target,saved}
    active: null,       // {label,start,rate}
    chat: [],           // {from:'me'|'bot',text}
  });
  let S;
  try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { S = defaults(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const uid = () => Math.random().toString(36).slice(2, 9);

  // ---------- helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => {
    const v = Math.max(0, Math.round(n * 100) / 100);
    const [i, d] = v.toFixed(2).split('.');
    return `$${Number(i).toLocaleString()}<small>.${d}</small>`;
  };
  const moneyTxt = n => '$' + (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dur = ms => {
    const m = Math.round(ms / 60000);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${String(r).padStart(2, '0')}m` : `${h}h`;
  };
  const clock = ms => {
    const s = Math.floor(ms / 1000);
    const p = n => String(n).padStart(2, '0');
    return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
  };
  const costMs = amount => S.rate > 0 ? (amount / S.rate) * HOUR : 0;
  const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const sessionMs = s => (s.end || Date.now()) - s.start;
  const sessionEarn = s => (sessionMs(s) / HOUR) * s.rate;
  const allSessions = () => S.active ? [...S.sessions, { ...S.active, end: null }] : S.sessions;
  function inPeriod(ts, period) {
    const now = new Date();
    if (period === 'today') return ts >= startOfDay();
    if (period === 'week') return ts >= startOfDay(new Date(Date.now() - 6 * 86400000));
    return ts >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  const totals = period => {
    const ss = allSessions().filter(s => inPeriod(s.start, period));
    const ms = ss.reduce((a, s) => a + sessionMs(s), 0);
    const earned = ss.reduce((a, s) => a + sessionEarn(s), 0);
    const spent = S.purchases.filter(p => inPeriod(p.ts, period)).reduce((a, p) => a + p.amount, 0);
    return { ms, earned, spent, spentMs: costMs(spent) };
  };

  // ---------- ui state ----------
  let tab = 'earn', period = 'today', planTab = 'budget', timer = null;

  const TABS = [
    ['earn', 'Earn', '↗'], ['plan', 'Plan', 'A'], ['ask', 'Ask', 'W'], ['save', 'Save', '↙'], ['cash', 'Cash out', '$'],
  ];
  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(([k, l, i]) =>
      `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}"><span class="ic">${i}</span>${l}</button>`).join('');
  }

  // ---------- sheet (modal) ----------
  function openSheet(html, onMount) {
    const w = $('#sheet'); w.hidden = false;
    w.innerHTML = `<div class="sheet">${html}</div>`;
    w.onclick = e => { if (e.target === w) closeSheet(); };
    onMount && onMount(w);
  }
  const closeSheet = () => { const w = $('#sheet'); w.hidden = true; w.innerHTML = ''; };

  function rateSheet(first) {
    openSheet(`
      <h3>${first ? 'What is your time worth?' : 'Your hourly rate'}</h3>
      <div class="sub">Every minute you track turns into dollars at this rate.</div>
      <label class="l">Dollars per hour</label>
      <input class="field" id="rate" type="number" inputmode="decimal" min="0" step="0.5" value="${S.rate || ''}" placeholder="e.g. 25">
      <label class="l">Daily target (hours)</label>
      <input class="field" id="dh" type="number" inputmode="decimal" min="0.5" step="0.5" value="${S.dailyHours}">
      <button class="btn" id="ok">Alright, I can do this</button>`,
      w => {
        $('#ok', w).onclick = () => {
          const r = parseFloat($('#rate', w).value), d = parseFloat($('#dh', w).value);
          if (!(r > 0)) { $('#rate', w).focus(); return; }
          S.rate = r; if (d > 0) S.dailyHours = d; save(); closeSheet(); render();
        };
        $('#rate', w).focus();
      });
  }

  // ---------- views ----------
  const head = (title, extra = '') => `<div class="head"><h1>${title}</h1><div style="display:flex;gap:8px">${extra}<button class="icon-btn" data-act="settings" aria-label="Settings">⚙</button></div></div>`;

  function viewEarn() {
    const t = totals(period);
    const target = period === 'today' ? S.dailyHours * HOUR : period === 'week' ? S.dailyHours * HOUR * 7 : S.dailyHours * HOUR * 30;
    const pct = Math.min(100, target ? (t.ms / target) * 100 : 0);
    const label = { today: 'Earned today', week: 'Earned last 7 days', month: 'Earned this month' }[period];
    const recent = [...S.sessions].sort((a, b) => b.start - a.start).slice(0, 6);
    return `
      ${head('Earn')}
      <div class="pills">${['today', 'week', 'month'].map(p => `<button class="pill ${period === p ? 'on' : ''}" data-period="${p}">${p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}</button>`).join('')}</div>
      <div class="card hero">
        <div class="lbl">${label}</div>
        <div class="big live" id="earned">${money(t.earned)}</div>
        <div class="sub" id="tracked">${dur(t.ms)} tracked · ${moneyTxt(S.rate)}/hr</div>
        <div class="bar"><i id="pct" style="width:${pct}%"></i></div>
        <div class="sub" style="margin-top:6px">${Math.round(pct)}% of ${dur(target)} target</div>
      </div>
      <div class="card">
        ${S.active ? `
          <div class="sub"><span class="pulse"></span>${esc(S.active.label || 'Working')}</div>
          <div class="mid live" id="clock">${clock(Date.now() - S.active.start)}</div>
          <div class="sub live" id="liveearn"></div>
          <button class="btn stop" data-act="stop">Stop &amp; bank it</button>` : `
          <div class="mid">Start the clock</div>
          <div class="sub">Watch your time turn into money.</div>
          <input class="field" id="label" maxlength="40" placeholder="What are you working on? (optional)">
          <button class="btn" data-act="start">Start earning</button>`}
      </div>
      <h2>Recent sessions</h2>
      <div class="card">${recent.length ? recent.map(s => `
        <div class="row"><div class="t"><b>${esc(s.label || 'Work session')}</b><span>${new Date(s.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${dur(sessionMs(s))}</span></div>
        <div class="r"><b>${moneyTxt(sessionEarn(s))}</b></div><button class="x" data-del-session="${s.id}" aria-label="Delete">✕</button></div>`).join('')
        : '<div class="empty">No sessions yet. Hit start and get paid for your time.</div>'}</div>`;
  }

  function dayStats(offset) {
    const d0 = startOfDay(new Date(Date.now() - offset * 86400000)), d1 = d0 + 86400000;
    const earnedMs = allSessions().filter(s => s.start >= d0 && s.start < d1).reduce((a, s) => a + sessionMs(s), 0);
    const spent = S.purchases.filter(p => p.ts >= d0 && p.ts < d1).reduce((a, p) => a + p.amount, 0);
    return { label: new Date(d0).toLocaleDateString(undefined, { weekday: 'narrow' }), earnedMs, spentMs: costMs(spent) };
  }

  function viewPlan() {
    const w = totals('week');
    const days = [6, 5, 4, 3, 2, 1, 0].map(dayStats);
    const max = Math.max(S.dailyHours * HOUR, ...days.flatMap(d => [d.earnedMs, d.spentMs]), 1);
    const net = w.ms - w.spentMs;
    const h = ms => (ms / HOUR).toFixed(1);
    return `
      ${head('Plan')}
      <div class="pills">${['budget', 'target'].map(p => `<button class="pill ${planTab === p ? 'on' : ''}" data-plan="${p}">${p === 'budget' ? 'Budget' : 'Daily target'}</button>`).join('')}</div>
      ${planTab === 'budget' ? `
        <div class="card mint">
          <div class="mid">Time budget</div><div class="sub">Last 7 days</div>
          <div class="grid2" style="margin-top:12px">
            <div class="card"><div class="mid">${h(w.ms)}<small>h</small></div><div class="sub">Hours earned</div></div>
            <div class="card"><div class="mid">${h(w.spentMs)}<small>h</small></div><div class="sub">Hours spent</div></div>
          </div>
          <div class="sub">Net: <b>${net >= 0 ? '+' : '−'}${h(Math.abs(net))}h</b> ${net >= 0 ? 'in the green' : 'overspent'}</div>
        </div>
        <div class="card">
          <b>Earned vs spent (hours)</b>
          <div class="chart">${days.map(d => `<div class="col"><div class="pair">
            <div class="b" style="height:${(d.earnedMs / max) * 100}%" title="earned"></div>
            <div class="b s" style="height:${(d.spentMs / max) * 100}%" title="spent"></div></div><small>${d.label}</small></div>`).join('')}</div>
          <div class="sub" style="margin-top:10px">Lime = earned · Peach = spent</div>
        </div>` : `
        <div class="card">
          <div class="sub">Set your daily goal</div>
          <div class="stepper"><button data-step="-0.5" aria-label="Less">−</button><div class="big">${S.dailyHours}<small>h</small></div><button data-step="0.5" aria-label="More">+</button></div>
          <div class="sub" style="text-align:center;margin-top:8px">≈ ${moneyTxt(S.dailyHours * S.rate)} per day at ${moneyTxt(S.rate)}/hr</div>
        </div>
        <div class="card sky"><b>Why a target?</b><div class="sub">Hitting ${S.dailyHours}h a day is ${moneyTxt(S.dailyHours * S.rate * 7)} a week. Your Earn tab tracks progress against it.</div></div>`}`;
  }

  function answer(q) {
    const lower = q.toLowerCase();
    const m = q.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)/);
    if (/earn|made|make|paid/.test(lower) && !m) {
      const t = totals(/week/.test(lower) ? 'week' : /month/.test(lower) ? 'month' : 'today');
      return `You've earned ${moneyTxt(t.earned)} over ${dur(t.ms)}.`;
    }
    if (/spen[dt]/.test(lower) && !m) {
      const t = totals(/week/.test(lower) ? 'week' : /month/.test(lower) ? 'month' : 'today');
      return `You've spent ${moneyTxt(t.spent)} — that's ${dur(t.spentMs)} of your time.`;
    }
    if (m) {
      const amt = parseFloat(m[1]);
      const ms = costMs(amt);
      const what = q.replace(m[0], '').replace(/\b(how|long|much|does|do|is|it|cost|me|in|time|would|for|a|an|the|worth|to|earn|buy|\?)\b/gi, '').replace(/[?$]/g, '').trim();
      const line = ms < 3 * HOUR ? `That's ${dur(ms)} of work.` : `That's ${(ms / HOUR).toFixed(1)} hours of work.`;
      const verdict = ms < 30 * 60000 ? 'Easy. Probably fine ✨' : ms < 4 * HOUR ? 'Worth thinking about for a sec 🤔' : 'That is a big chunk of your life. Sure about it? 👀';
      return `${what ? what + ' — ' : ''}${moneyTxt(amt)} at ${moneyTxt(S.rate)}/hr.\n${line}\n${verdict}`;
    }
    return "Try something like “$7 coffee”, “how much did I earn this week?” or “what did I spend today?”";
  }
  function viewAsk() {
    const chips = ['$7 coffee', '$120 sneakers', 'earned today?', 'spent this week?'];
    return `
      <div class="glow"></div>
      ${head('Ask')}
      <div class="greet">Hey you 👋</div>
      <div class="sub">Tell me a price and I'll tell you what it costs in time.</div>
      <div class="chat" id="chat">${S.chat.map(c => `<div class="bub ${c.from}">${esc(c.text)}</div>`).join('')}</div>
      <div>${chips.map(c => `<button class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <form class="askbar" id="askform"><input class="field" id="q" autocomplete="off" placeholder="Ask me anything"><button aria-label="Send">↑</button></form>`;
  }

  function viewSave() {
    return `
      ${head('Save', '<button class="icon-btn" data-act="addgoal" aria-label="Add goal">+</button>')}
      ${S.goals.length ? S.goals.map((g, i) => {
        const pct = Math.min(100, (g.saved / g.target) * 100);
        const left = Math.max(0, g.target - g.saved);
        const cls = ['peach', 'mint', 'sky'][i % 3];
        return `<div class="card ${cls}">
          <div style="display:flex;justify-content:space-between"><div class="mid">${esc(g.name)}</div><button class="x" data-del-goal="${g.id}" aria-label="Delete goal">✕</button></div>
          <div class="big">${money(g.saved)}</div>
          <div class="sub">of ${moneyTxt(g.target)} · ${left > 0 ? `${dur(costMs(left))} of work to go` : 'Goal reached 🎉'}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <button class="btn" data-deposit="${g.id}">Deposit</button></div>`;
      }).join('') : `<div class="card"><div class="empty">No goals yet.<br>Tap + to turn a dream purchase into hours of work.</div></div>`}`;
  }

  function viewCash() {
    const w = totals('week');
    const list = [...S.purchases].sort((a, b) => b.ts - a.ts);
    const month = S.purchases.filter(p => inPeriod(p.ts, 'month'));
    const top = month.sort((a, b) => b.amount - a.amount)[0];
    return `
      ${head('Cash out')}
      <div class="card hero">
        <div class="lbl">Spent last 7 days</div>
        <div class="big">${money(w.spent)}</div>
        <div class="sub">That's ${dur(w.spentMs)} of your life</div>
      </div>
      ${top ? `<div class="card sky"><b>Time IQ</b><div class="sub">Your biggest buy this month: <b>${esc(top.name)}</b> — ${dur(costMs(top.amount))} of work.</div></div>` : ''}
      <button class="btn lime" data-act="addbuy" style="margin:0 0 14px;border:1.5px solid var(--ink)">+ Log a purchase</button>
      <div class="card">${list.length ? list.slice(0, 30).map(p => `
        <div class="row"><div class="t"><b>${esc(p.name)}</b><span>${new Date(p.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
        <div class="r"><b>${moneyTxt(p.amount)}</b><span>${dur(costMs(p.amount))}</span></div><button class="x" data-del-buy="${p.id}" aria-label="Delete">✕</button></div>`).join('')
        : '<div class="empty">Nothing logged. Every purchase will show its time cost here.</div>'}</div>`;
  }

  // ---------- render ----------
  function render() {
    renderTabs();
    const v = $('#view');
    const keepScroll = v.scrollTop;
    v.innerHTML = { earn: viewEarn, plan: viewPlan, ask: viewAsk, save: viewSave, cash: viewCash }[tab]();
    v.scrollTop = keepScroll;
    if (tab === 'ask') { const c = $('#chat'); c.lastElementChild && c.lastElementChild.scrollIntoView({ block: 'end' }); }
    tick();
  }
  function tick() {
    if (tab !== 'earn') return;
    const t = totals(period);
    const e = $('#earned'); if (e) e.innerHTML = money(t.earned);
    const tr = $('#tracked'); if (tr) tr.textContent = `${dur(t.ms)} tracked · ${moneyTxt(S.rate)}/hr`;
    if (S.active) {
      const el = Date.now() - S.active.start;
      const c = $('#clock'); if (c) c.textContent = clock(el);
      const l = $('#liveearn'); if (l) l.textContent = `+${moneyTxt((el / HOUR) * S.active.rate)} this session`;
    }
  }
  setInterval(tick, 500);

  // ---------- events ----------
  function ask(text) {
    text = text.trim(); if (!text) return;
    S.chat.push({ from: 'me', text }); S.chat.push({ from: 'bot', text: answer(text) });
    S.chat = S.chat.slice(-40); save(); render();
  }

  function addGoalSheet() {
    openSheet(`<h3>New goal</h3><div class="sub">We'll convert it into hours of work.</div>
      <label class="l">What are you saving for?</label><input class="field" id="gn" maxlength="30" placeholder="Singapore flight">
      <label class="l">Target amount ($)</label><input class="field" id="ga" type="number" inputmode="decimal" min="1" placeholder="1250">
      <button class="btn" id="ok">Create goal</button>`, w => {
      $('#ok', w).onclick = () => {
        const name = $('#gn', w).value.trim(), target = parseFloat($('#ga', w).value);
        if (!name || !(target > 0)) return;
        S.goals.push({ id: uid(), name, target, saved: 0 }); save(); closeSheet(); render();
      };
    });
  }
  function addBuySheet() {
    openSheet(`<h3>Log a purchase</h3><div class="sub">See what it really cost you.</div>
      <label class="l">What did you buy?</label><input class="field" id="pn" maxlength="30" placeholder="Coffee">
      <label class="l">Amount ($)</label><input class="field" id="pa" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="7.21">
      <div class="sub" id="pv" style="margin-top:10px"></div>
      <button class="btn" id="ok">Cash out</button>`, w => {
      $('#pa', w).oninput = () => { const a = parseFloat($('#pa', w).value); $('#pv', w).textContent = a > 0 ? `≈ ${dur(costMs(a))} of work` : ''; };
      $('#ok', w).onclick = () => {
        const name = $('#pn', w).value.trim() || 'Purchase', amount = parseFloat($('#pa', w).value);
        if (!(amount > 0)) return;
        S.purchases.push({ id: uid(), name, amount, ts: Date.now() }); save(); closeSheet(); render();
      };
    });
  }
  function depositSheet(id) {
    const g = S.goals.find(x => x.id === id); if (!g) return;
    openSheet(`<h3>Deposit to ${esc(g.name)}</h3>
      <label class="l">Amount ($)</label><input class="field" id="da" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="50">
      <div class="sub" id="dv" style="margin-top:10px"></div>
      <button class="btn" id="ok">Deposit</button>`, w => {
      $('#da', w).oninput = () => { const a = parseFloat($('#da', w).value); $('#dv', w).textContent = a > 0 ? `That's ${dur(costMs(a))} of work banked` : ''; };
      $('#ok', w).onclick = () => { const a = parseFloat($('#da', w).value); if (!(a > 0)) return; g.saved += a; save(); closeSheet(); render(); };
      $('#da', w).focus();
    });
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.tab) { tab = d.tab; render(); return; }
    if (d.period) { period = d.period; render(); return; }
    if (d.plan) { planTab = d.plan; render(); return; }
    if (d.step) { S.dailyHours = Math.max(0.5, Math.min(24, S.dailyHours + parseFloat(d.step))); save(); render(); return; }
    if (d.chip) { ask(d.chip); return; }
    if (d.deposit) { depositSheet(d.deposit); return; }
    if (d.delSession) { S.sessions = S.sessions.filter(s => s.id !== d.delSession); save(); render(); return; }
    if (d.delGoal) { S.goals = S.goals.filter(g => g.id !== d.delGoal); save(); render(); return; }
    if (d.delBuy) { S.purchases = S.purchases.filter(p => p.id !== d.delBuy); save(); render(); return; }
    switch (d.act) {
      case 'start': S.active = { label: ($('#label') || {}).value || '', start: Date.now(), rate: S.rate }; save(); render(); break;
      case 'stop': {
        const a = S.active; S.active = null;
        if (a && Date.now() - a.start >= 1000) S.sessions.push({ id: uid(), label: a.label, start: a.start, end: Date.now(), rate: a.rate });
        save(); render(); break;
      }
      case 'settings': rateSheet(false); break;
      case 'addgoal': addGoalSheet(); break;
      case 'addbuy': addBuySheet(); break;
    }
  });
  document.addEventListener('submit', e => {
    if (e.target.id === 'askform') { e.preventDefault(); ask($('#q').value); }
  });

  // ---------- boot ----------
  render();
  setTimeout(() => {
    $('#splash').classList.add('hide');
    if (!(S.rate > 0)) rateSheet(true);
  }, 900);
})();
