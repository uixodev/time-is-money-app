/* Tons — two currencies.
 * TIME: everyone gets 86,400 seconds every day (equal for all). Unspent time expires at midnight.
 * TICKS: your own earned currency. Hard deeds earn Tons, useless deeds cost Tons. Tons never expire.
 * Vanilla JS, data in localStorage. */
(() => {
  'use strict';
  const KEY = 'tick.v1';
  const VERSION = 'v46';   // bump with the ?v= number in index.html so browsers fetch fresh files
  const DAY = 86400;
  const $ = (s, el = document) => el.querySelector(s);
  // one tonal green family (+ ink) so every deed colour belongs to the brand
  const PALETTE = ['#C9F26B', '#6FBF3B', '#2F6B2A', '#A9C79B', '#E4F5B0', '#16210F'];

  // ---------- state ----------
  // Health: seven pillars, each a 0–100 gauge that drains over time and refills with care deeds
  const PILLARS = {
    sleep:   { name: 'Sleep',   decay: 4.5, price: 0.9 },   // decay = points lost per hour · price = Tons earned per point refilled (raised 50% in v28)
    food:    { name: 'Food',    decay: 6,   price: 0.525 },
    move:    { name: 'Move',    decay: 2,   price: 1.5 },
    hygiene: { name: 'Hygiene', decay: 3,   price: 0.45 },
    home:    { name: 'Home',    decay: 1.5, price: 1.05 },
    family:  { name: 'Family',  decay: 1.2, price: 1.2 },
    allah:   { name: 'Allah',   decay: 3,   price: 0.9 },   // faith: prayer, Quran, remembrance — about five prayers' worth of drain a day
  };
  const MAX_ACTIVE = 3;           // deeds you can run at the same time
  const HEALTH_MIN = 40;          // below this overall Health you can't start an investment
  const FADE = 0.98;              // skills fade 2% a day without practice
  const SHOP_CATS = ['Food', 'Fun', 'Rest', 'Self-care', 'Learning', 'Other'];   // what an item in the shop is for
  const GEM_PER_DIV = 5;          // investments pay in GEMS (whole numbers): 1 Ton of dividend = 5 gems
  const DIV_PER_RATE = 2;         // dividend: Tons/day per effective hour, per Tons/min of cost (0.5/min → 1 Tons/day per hour)
  const DEBT_SURCHARGE = 1.5;     // useless time costs +50% while you're in debt
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const freshHealth = () => Object.fromEntries(Object.keys(PILLARS).map(k => [k, { v: 80, t: Date.now() }]));
  // kind: care (refills a pillar and EARNS Tons = points refilled × the pillar's price)
  //       invest (costs rate Tons/min now, pays daily dividends later) · useless (costs rate Tons/min) · neutral (time only)
  // care timer: pts = health % per minute · care tap: pts = health % per check-in
  const defaultDeeds = () => [
    { id: 'd1',  name: 'Deep work',     color: PALETTE[0], kind: 'invest', rate: 0.25 },
    { id: 'd12', name: 'Learn to code', color: PALETTE[1], kind: 'invest', rate: 0.25 },
    { id: 'd7',  name: 'Workout',     color: PALETTE[1], kind: 'care', pillar: 'move',    mode: 'timer', pts: 1.2, rate: 2 },
    { id: 'd2',  name: 'Sleep',       color: PALETTE[2], kind: 'care', pillar: 'sleep',   mode: 'timer', pts: 0.2, rate: 0.3 },
    { id: 'd8',  name: 'Meal',        color: PALETTE[3], kind: 'care', pillar: 'food',    mode: 'tap',   pts: 35,  rate: 3 },
    { id: 'd9',  name: 'Wash up',     color: PALETTE[4], kind: 'care', pillar: 'hygiene', mode: 'tap',   pts: 40,  rate: 2 },
    { id: 'd10', name: 'Cleaning',    color: PALETTE[1], kind: 'care', pillar: 'home',    mode: 'timer', pts: 1.5, rate: 1 },
    { id: 'd11', name: 'Family time', color: PALETTE[3], kind: 'care', pillar: 'family',  mode: 'timer', pts: 1,   rate: 1 },
    { id: 'd13', name: 'Prayer',      color: PALETTE[2], kind: 'care', pillar: 'allah',   mode: 'tap',   pts: 15,  rate: 0 },
    { id: 'd14', name: 'Quran',       color: PALETTE[4], kind: 'care', pillar: 'allah',   mode: 'timer', pts: 1,   rate: 0 },
    { id: 'd5',  name: 'Scrolling',   color: PALETTE[5], kind: 'useless', rate: 1 },
    { id: 'd6',  name: 'Gaming',      color: PALETTE[2], kind: 'useless', rate: 2 },
  ];
  const defaults = () => ({
    created: Date.now(),
    onboarded: false,
    gift: 30,      // welcome Tons
    deeds: defaultDeeds(),
    health: freshHealth(),
    entries: [],   // {id, deedId, ts, secs, ticks (signed)}
    actives: [],   // running sessions, up to 3 at once: {id, deedId, start, startVal, startBal}
    goals: [],     // {id, name, target (Tons)}
    bought: [],    // {id, name, cost, ts} rewards you've bought
    sound: true,   // celebration sounds
    tomb: [],      // ids of things deleted on any device, so deletes survive syncing
    notes: [],     // journal: {id, ts, kind:'invest'|'reward', deedId?, refId?, title, line, text, rating}
    divAt: Date.now(),  // last time dividends were settled
    chat: [],
  });
  const sgn = d => d.kind === 'care' ? 1 : d.kind === 'invest' || d.kind === 'useless' ? -1 : 0;
  let S;
  try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { S = defaults(); }
  const uid = () => Math.random().toString(36).slice(2, 9);
  function migrate() {
    const OLDK = { d1: ['hard', 3], d3: ['hard', 4], d5: ['useless', 1] };
    S.deeds.forEach((d, i) => {
      if (!PALETTE.includes(d.color)) d.color = PALETTE[i % PALETTE.length];
      if (!d.kind) { const k = OLDK[d.id] || ['neutral', 0]; d.kind = k[0]; d.rate = k[1]; }
      // legacy Sleep / Workout become care deeds
      if (d.kind === 'neutral' && /sleep/i.test(d.name)) Object.assign(d, { kind: 'care', pillar: 'sleep', mode: 'timer', pts: 0.2, rate: 0.3 });
      if (d.kind === 'hard' && d.id === 'd3' && /workout|move|exercise/i.test(d.name)) Object.assign(d, { kind: 'care', pillar: 'move', mode: 'timer', pts: 1.2, rate: 2 });
    });
    // the old 'hard' earner is now an investment: it costs a little and pays back later
    S.deeds.forEach(d => { if (d.kind === 'hard') { d.kind = 'invest'; d.rate = 0.5; } });
    if (!S.health) S.health = freshHealth();
    if (!S.divAt) S.divAt = Date.now();
    Object.keys(PILLARS).forEach(k => { if (!S.health[k]) S.health[k] = { v: 80, t: Date.now() }; });
    const covered = new Set(S.deeds.filter(d => d.kind === 'care').map(d => d.pillar));
    defaultDeeds().filter(n => n.kind === 'care' && !covered.has(n.pillar)).forEach(n => S.deeds.push({ ...n }));   // a pillar with no deed yet gets its starters
    S.entries.forEach(e => { if (typeof e.ticks !== 'number') { const d = S.deeds.find(x => x.id === e.deedId); e.ticks = d ? sgn(d) * d.rate * e.secs / 60 : 0; } });
    S.goals = S.goals.filter(g => g.target);
    if (S.balanceV !== 2) {                                              // v28 rebalance: investing costs half as much (once)
      S.deeds.forEach(d => { if (d.kind === 'invest' && d.rate >= 0.5) { d.rate = d.rate / 2; d.mod = Date.now(); } });
      S.balanceV = 2;
    }
    // v31 fair start (once, same id on every device): the balance at the START of today is the welcome Tons, so today's earnings add on top of it
    if (typeof S.divCollected !== 'number') S.divCollected = S.entries.reduce((a, e) => a + (e.div ? e.ticks : 0), 0);   // v40: dividends you've already received count as collected
    if (typeof S.divAuto !== 'boolean') S.divAuto = false;
    if (S.gemsV !== 1) {                                               // v44: investments pay in gems. Tons dividends you already collected stay in your balance; what was still waiting becomes gems.
      S.divLegacy = Math.min(S.divCollected || 0, S.entries.reduce((a, e) => a + (e.div ? e.ticks : 0), 0));
      if (typeof S.gemsCollected !== 'number') S.gemsCollected = 0;
      S.goals.forEach(g => { g.target = Math.max(1, Math.round(g.target / 5)); g.mod = Date.now(); });   // goals are now priced in gems
      S.gemsV = 1;
    }
    if (S.shopV !== 1) {                                               // v45: Goals became a Shop. Old goals are "saving for" items; a few starter items are added once.
      const dead = S.tomb || [];
      S.goals.forEach(g => { if (g.pin === undefined) g.pin = true; if (!g.cat) g.cat = 'Other'; });
      [['shop-coffee', 'Coffee out', 5, 'Food'], ['shop-treat', 'Favourite treat', 8, 'Food'], ['shop-movie', 'Movie night', 20, 'Fun'], ['shop-game', 'Gaming session', 10, 'Fun'], ['shop-bath', 'Long hot bath', 12, 'Self-care'], ['shop-lazy', 'Lazy morning', 15, 'Rest']]
        .forEach(([id, name, target, cat]) => { if (!S.goals.some(g => g.id === id) && !dead.includes(id)) S.goals.push({ id, name, target, cat, pin: false, created: Date.now(), mod: Date.now() }); });
      S.shopV = 1;
    }
    if (!Array.isArray(S.tomb)) S.tomb = [];
    if (S.entries.some(e => e.id === 'adjust:v30')) { S.entries = S.entries.filter(e => e.id !== 'adjust:v30'); if (!S.tomb.includes('adjust:v30')) S.tomb.push('adjust:v30'); }   // the v30 reset was dated "now" and hid today's earnings
    if (!S.entries.some(e => e.id === 'adjust:v31')) {
      const d0 = new Date(); d0.setHours(0, 0, 0, 0);
      const before = S.gift + S.entries.reduce((x, e) => x + (e.ts < d0.getTime() && typeof e.ticks === 'number' ? e.ticks : 0), 0);
      if (before < S.gift - 0.004) S.entries.push({ id: 'adjust:v31', deedId: 'adjust:v31', ts: d0.getTime(), secs: 0, ticks: S.gift - before });
    }
    delete S.timerStyle; delete S.pickedLook;   // the look switcher is gone: everyone has the Big number timer
    if (S.active && (!Array.isArray(S.actives) || !S.actives.length)) S.actives = [{ id: 'run-' + S.active.start, ...S.active }];   // older saves had ONE running session (defaults already add an empty list)
    delete S.active; delete S.lastStopped;
    if (!Array.isArray(S.actives)) S.actives = [];
    S.actives = S.actives.filter(a => a && typeof a.deedId === 'string' && typeof a.start === 'number').map(a => ({ ...a, id: a.id || 'run-' + a.start })).slice(0, MAX_ACTIVE);
    if (!Array.isArray(S.tomb)) S.tomb = [];
    if (!Array.isArray(S.notes)) S.notes = [];
  }
  migrate();
  // cloud sync handles (declared early because save() uses them)
  const SYNC_KEY = 'tick.sync';
  let sb = null, user = null, syncing = false, syncAgain = false, syncTimer = null, acctMode = 'signin';
  let meta = (() => { try { return JSON.parse(localStorage.getItem(SYNC_KEY) || '{}'); } catch { return {}; } })();   // {owner, rev, dirty}
  let sync = { status: 'off', msg: '', at: 0 };
  const persistMeta = () => { try { localStorage.setItem(SYNC_KEY, JSON.stringify(meta)); } catch {} };
  const gone = id => { if (!S.tomb.includes(id)) S.tomb.push(id); };
  function save(localOnly) {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
    if (!localOnly) { meta.dirty = true; persistMeta(); scheduleSync(); }
  }

  // ---------- currency icons ----------
  const INK = '#16210F';
  // One coin family: same round shape + open "timer ring". The value shows on the coin; the darker the coin, the more it is worth.
  const COINS = {                                                          // keys are internal ids; the names are what people see
    tick:    { name: 'Ton',         value: 1,   label: '1',   fill: '#C9F26B', fg: INK },
    ten:     { name: 'Ten-ton',     value: 10,  label: '10',  fill: '#E4F5B0', fg: INK },
    hundred: { name: 'Hundred-ton', value: 100, label: '100', fill: '#2F6B2A', fg: '#C9F26B' },
  };
  const ring = fg => `<circle cx="24" cy="24" r="14.5" fill="none" stroke="${fg}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="72 19" transform="rotate(-70 24 24)"/>`;
  const coinInner = c => `<circle cx="24" cy="24" r="21" fill="${c.fill}" stroke="${INK}" stroke-width="3"/>${ring(c.fg)}<text x="24" y="29.2" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${c.label.length > 2 ? 11 : 13}" font-weight="800" fill="${c.fg}">${c.label}</text>`;
  const coin = (k, size = 40) => `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">${coinInner(COINS[k])}</svg>`;
  // The Tons currency sign (brand/ton-sign.svg): a T struck by a slanted bar, with the seconds pip.
  const SIGN = '<path d="M13 14H51M32 14V54M19 38L45 28"/><circle cx="49.6" cy="50" r="3.4" fill="currentColor" stroke="none"/>';
  const signSVG = (cls, size) => `<svg ${cls ? `class="${cls}"` : ''} ${size ? `width="${size}" height="${size}"` : ''} viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SIGN}</svg>`;
  const markSVG = size => signSVG('', size);
  const tk = signSVG('tk');
  const gm = '<svg class="gm" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 12H46L58 26L32 56L6 26Z"/><path d="M6 26H58M24 12L20 26L32 56L44 26L40 12"/></svg>';
  const gemN = n => Math.round(n).toLocaleString();
  const gemRate = n => n >= 9.5 ? gemN(n) : n < 0.05 ? '0' : String(Math.round(n * 10) / 10);   // per-day RATES can be fractions; counts are always whole
  const symbol = (size = 26) => signSVG('', size);

  // consistent 24px line icons for the tab bar
  const ICONS = {
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3.5"/><path d="M3 10V8a3 3 0 0 1 3-3h10"/><circle cx="16.5" cy="13" r="1.1" fill="currentColor"/>',
    deeds: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 9.6"/>',
    invest: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    goals: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    history: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
    earn: '<path d="M12 5v14M5 12h14"/>',
    spend: '<path d="M7 17L17 7M8 7h9v9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
    account: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
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
  // Tons, big style (can be negative = debt): 1,234.<small>56</small>
  const tBig = n => { const neg = n < -0.004; const [i, d] = Math.abs(n).toFixed(2).split('.'); return `${neg ? '−' : ''}${Number(i).toLocaleString()}<small>.${d}</small>`; };
  const t1 = n => (Math.round(Math.abs(n) * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });
  const signed = n => (n > 0.04 ? '+' : n < -0.04 ? '−' : '') + t1(n);
  const nf2 = x => String(Math.round(x * 100) / 100);   // costs per minute need two decimals (0.25 must not read as 0.3)
  const nf = x => Number.isInteger(x) ? String(x) : String(Math.round(x * 10) / 10);
  const dayStart = off => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - off); return d.getTime(); };
  const nextMidnight = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); };
  const deedOf = id => {
    const d = S.deeds.find(x => x.id === id); if (d) return d;
    if (String(id).startsWith('adjust:')) return { id, name: 'Fresh start', color: '#D6DCC8', kind: 'adjust', rate: 0 };
    if (String(id).startsWith('reward:')) { const b = S.bought.find(x => x.id === id); return { id, name: b ? `Reward: ${b.name}` : 'Reward', color: '#16210F', kind: 'reward', rate: 0 }; }
    return { id, name: 'Other', color: '#D6DCC8', kind: 'neutral', rate: 0 };
  };
  const careRate = d => d.pts * PILLARS[d.pillar].price;   // Tons per minute (timer) or per check-in (tap) when the pillar has room
  const fmtSec = v => String(Number(Math.abs(v).toPrecision(2)));   // 0.0175 → 0.018, 0.002 → 0.002 (two significant digits)
  const perSec = perMin => fmtSec(perMin / 60);
  const leftLbl = d => { const r = roomTons(d.pillar); return r < 0.05 ? 'full' : `${t1(r)} left`; };   // Tons still earnable from this deed's pillar
  // care timers are labelled in Tons per second; check-ins in Tons each; costs stay per minute
  const rateLbl = d => d.kind === 'invest' || d.kind === 'useless' ? `−${nf2(d.rate)}/min`
    : d.kind === 'care' ? (d.mode === 'tap' ? `+${nf(careRate(d))} Tons each` : `+${perSec(careRate(d))} Tons/sec`) : 'no Tons';
  const isAdjust = e => String(e.deedId).startsWith('adjust:') || !!e.div;   // fresh-start corrections and (gem) dividends: never counted as Tons earned/spent   // fresh-start corrections: count toward the balance, never toward earned/spent
  const dayRange = off => [dayStart(off), off === 0 ? nextMidnight() : dayStart(off - 1)];

  // ---------- Health ----------
  const hBase = k => { const h = S.health[k]; return clamp(h.v - PILLARS[k].decay * (Date.now() - h.t) / 3600000, 0, 100); };
  const elapsedOf = a => (Date.now() - a.start) / 1000;
  const isActive = deedId => S.actives.some(a => a.deedId === deedId);
  const liveGain = k => S.actives.reduce((sum, a) => { const d = deedOf(a.deedId); return sum + (d.kind === 'care' && d.mode === 'timer' && d.pillar === k ? d.pts * elapsedOf(a) / 60 : 0); }, 0);
  const pv = k => clamp(hBase(k) + liveGain(k), 0, 100);
  const roomTons = k => Math.max(0, (100 - pv(k)) * PILLARS[k].price);   // Tons this pillar can still pay before it is full
  const healthScore = () => { const v = Object.keys(PILLARS).map(pv); return 0.6 * (v.reduce((a, b) => a + b, 0) / v.length) + 0.4 * Math.min(...v); };
  const gated = () => healthScore() < HEALTH_MIN;
  const healthWord = () => { const h = healthScore(); return h >= 70 ? 'Strong' : h >= HEALTH_MIN ? 'OK' : 'Low'; };
  const refill = (k, g) => { S.health[k] = { v: clamp(hBase(k) + g, 0, 100), t: Date.now() }; };
  const lowest = n => Object.keys(PILLARS).sort((a, b) => pv(a) - pv(b)).slice(0, n);

  // ---------- Tons ----------
  // useless time costs more while you're in debt: normal rate until the balance hits zero, surcharged after
  const uselessCost = (r, m, b0) => {
    if (b0 <= 0) return DEBT_SURCHARGE * r * m;
    const t0 = b0 / r;
    return m <= t0 ? r * m : b0 + DEBT_SURCHARGE * r * (m - t0);
  };
  // Tons a session of `secs` seconds is worth (negative = cost)
  function ticksFor(a, secs) {
    const d = deedOf(a.deedId), m = secs / 60;
    if (d.kind === 'invest') return -d.rate * m;
    if (d.kind === 'care') {
      const cap = d.mode === 'timer' && d.pts > 0 ? Math.max(0, (100 - (a.startVal || 0)) / d.pts) : m;   // a full pillar stops paying
      return careRate(d) * Math.min(m, cap);
    }
    if (d.kind === 'useless') return -uselessCost(d.rate, m, ticksSaved());
    return 0;
  }
  const activeIn = (a, d0, d1) => Math.max(0, (Math.min(Date.now(), d1) - Math.max(a.start, d0)) / 1000);
  const activeTicksOf = (a, d0, d1) => { const el = elapsedOf(a); return el > 0 ? ticksFor(a, el) * (activeIn(a, d0, d1) / el) : 0; };
  const activeTicks = (d0, d1) => S.actives.reduce((sum, a) => sum + activeTicksOf(a, d0, d1), 0);

  // TIME: seconds spent per deed in a day (offset 0 = today)
  function dayByDeed(off) {
    const [d0, d1] = dayRange(off), m = {};
    S.entries.forEach(e => { if (e.ts >= d0 && e.ts < d1 && e.secs > 0) m[e.deedId] = (m[e.deedId] || 0) + e.secs; });
    S.actives.forEach(a => { const x = activeIn(a, d0, d1); if (x > 0) m[a.deedId] = (m[a.deedId] || 0) + x; });
    return m;
  }
  function dayTicksByDeed(off) {
    const [d0, d1] = dayRange(off), m = {};
    S.entries.forEach(e => { if (e.ts >= d0 && e.ts < d1 && !isAdjust(e)) m[e.deedId] = (m[e.deedId] || 0) + e.ticks; });
    S.actives.forEach(a => { const x = activeTicksOf(a, d0, d1); if (x) m[a.deedId] = (m[a.deedId] || 0) + x; });
    return m;
  }
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const dayRemaining = () => Math.max(0, (nextMidnight() - Date.now()) / 1000);   // real seconds until midnight
  const trackedToday = () => Math.min(DAY - dayRemaining(), sum(dayByDeed(0)));   // doing deeds together doesn't make the day longer
  const dayEarnSpend = off => {
    const [d0, d1] = dayRange(off); let earned = 0, spent = 0;
    S.entries.forEach(e => { if (e.ts >= d0 && e.ts < d1 && !isAdjust(e)) { if (e.ticks > 0) earned += e.ticks; else spent -= e.ticks; } });
    S.actives.forEach(a => { const t = activeTicksOf(a, d0, d1); if (t > 0) earned += t; else spent -= t; });
    return { earned, spent };
  };
  // Dividends build up as "accrued"; only what you've collected counts toward the balance (or everything, with auto-pay on)
  const divAccrued = () => S.entries.reduce((a, e) => a + (e.div ? e.ticks : 0), 0);
  // GEMS: investment dividends are paid in whole gems (Tons-equivalent dividend × 5). They build up and you collect them when you like.
  const gemsAccrued = () => Math.floor(Math.max(0, divAccrued() - (S.divLegacy || 0)) * GEM_PER_DIV + 1e-9);
  const gemsEarned = () => Math.min(S.gemsCollected || 0, gemsAccrued());
  const gemsPending = () => Math.max(0, gemsAccrued() - gemsEarned());
  const gemsSpent = () => S.bought.reduce((a, b) => a + (b.cur === 'gem' ? b.cost : 0), 0);
  const gems = () => Math.max(0, gemsEarned() - gemsSpent());
  const gemFrac = () => Math.max(0, Math.min(0.999, Math.max(0, divAccrued() - (S.divLegacy || 0)) * GEM_PER_DIV - gemsAccrued()));   // progress toward the next gem
  const gemsPerDay = d => dividendPerDay(d) * GEM_PER_DIV;
  const ticksSaved = () => S.gift + S.entries.reduce((a, e) => a + (e.div ? 0 : e.ticks), 0) + Math.min(S.divLegacy || 0, divAccrued());   // without the running deed (Tons from old-style dividends stay in)
  const balance = () => ticksSaved() + activeTicks(0, Infinity);                   // can be negative = debt
  // average Tons earned per day (health income + dividends) over the days you've used the app — for "about N days" estimates
  const avgDailyIncome = () => {
    const days = [6, 5, 4, 3, 2, 1, 0].filter(off => dayStart(off) + 86400000 > S.created);
    const tot = days.reduce((a, off) => a + dayEarnSpend(off).earned, 0);
    return Math.max(25, tot / Math.max(1, days.length));
  };

  // ---------- Investments ----------
  // Skill = hours invested, with each hour fading 2% a day. Dividend = skill × the deed's yield, paid continuously.
  const skillHours = (deedId, at) => {
    let h = 0;
    S.entries.forEach(e => { if (e.deedId === deedId && e.secs > 0 && e.ts <= at) h += (e.secs / 3600) * Math.pow(FADE, (at - e.ts) / 86400000); });
    return h;
  };
  const dividendPerDay = d => skillHours(d.id, Date.now()) * d.rate * DIV_PER_RATE;
  function addDividend(deedId, ts, amt) {
    const d0 = new Date(ts); d0.setHours(0, 0, 0, 0);
    const e = S.entries.find(x => x.div && x.deedId === deedId && x.ts >= d0.getTime() && x.ts < d0.getTime() + 86400000);
    if (e) e.ticks += amt; else S.entries.push({ id: uid(), deedId, ts, secs: 0, ticks: amt, div: true });
  }
  function settleDividends() {
    const now = Date.now(); let from = Math.max(S.divAt || now, now - 60 * 86400000), added = false;
    const deeds = S.deeds.filter(d => d.kind === 'invest');
    while (from < now) {
      const to = Math.min(now, from + 6 * 3600000), mid = (from + to) / 2, days = (to - from) / 86400000;
      deeds.forEach(d => { const amt = skillHours(d.id, mid) * d.rate * DIV_PER_RATE * days; if (amt > 1e-6) { addDividend(d.id, mid, amt); added = true; } });
      from = to;
    }
    if (S.divAuto) S.gemsCollected = gemsAccrued();
    S.divAt = now; save(!added);
  }
  function collectDividends() {
    const n = gemsPending(); if (n < 1) { flash('No whole gem yet — it keeps building'); return; }
    S.gemsCollected = gemsAccrued(); save(); render(); confetti(); chime(); flash(`+${gemN(n)} gem${n === 1 ? '' : 's'} collected`);
  }
  function investStats(d) {
    let hours = 0, spent = 0, returned = 0;
    S.entries.forEach(e => { if (e.deedId !== d.id) return; hours += e.secs / 3600; if (e.ticks < 0) spent -= e.ticks; else if (e.div) returned += e.ticks; });
    S.actives.filter(a => a.deedId === d.id).forEach(a => { const el = elapsedOf(a); hours += el / 3600; spent += d.rate * el / 60; });
    const perDay = dividendPerDay(d), net = returned - spent;
    return { hours, spent, returned, gemsEarned: Math.floor(returned * GEM_PER_DIV + 1e-9), gemsDay: perDay * GEM_PER_DIV, perDay, skill: skillHours(d.id, Date.now()), net, roi: spent > 0 ? net / spent : 0, days: net >= 0 ? 0 : perDay > 0.01 ? Math.ceil(-net / perDay) : Infinity };
  }

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
  function flash(msg, action) {
    const e = document.createElement('div'); e.className = 'toast'; e.textContent = msg;
    if (action) { const b = document.createElement('button'); b.className = 'toastbtn'; b.textContent = action.label; b.onclick = () => { e.remove(); action.fn(); }; e.appendChild(b); }
    $('#app').appendChild(e); setTimeout(() => e.remove(), action ? 5000 : 2300);
  }
  function tapCare(id) {
    const d = deedOf(id), gain = Math.min(d.pts, 100 - hBase(d.pillar));
    if (gain < 0.5) { flash(`${PILLARS[d.pillar].name} is already full`); return; }
    const ticks = gain * PILLARS[d.pillar].price;   // pays in proportion to what it actually refilled
    refill(d.pillar, gain);
    S.entries.push({ id: uid(), deedId: id, ts: Date.now(), secs: 0, ticks });
    save(); flash(`+${t1(ticks)} Tons · ${PILLARS[d.pillar].name} (${leftLbl(d)})`); render(); chime();
  }

  // ---------- celebration: confetti + chime ----------
  let audioCtx = null;
  function chime() {
    if (!S.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      audioCtx = audioCtx || new AC(); if (audioCtx.state === 'suspended') audioCtx.resume();
      const t0 = audioCtx.currentTime + 0.02;
      const note = (f, at, len, type, vol) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
        o.connect(g); g.connect(audioCtx.destination); o.start(t0 + at); o.stop(t0 + at + len + 0.05);
      };
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.085, 0.32, 'triangle', 0.16));   // C E G C — a little fanfare
      [1046.5, 1318.5, 1568].forEach(f => note(f, 0.36, 0.7, 'sine', 0.1));                              // sparkly final chord
      note(2093, 0.36, 0.25, 'sine', 0.05);
    } catch {}
  }
  function confetti(originEl) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const app = $('#app'), box = app.getBoundingClientRect(), r = originEl ? originEl.getBoundingClientRect() : null;
    const ox = r ? r.left + r.width / 2 - box.left : box.width / 2, oy = r ? r.top + r.height / 2 - box.top : box.height * 0.6;
    const cv = document.createElement('canvas'); cv.className = 'confetti';
    const dpr = window.devicePixelRatio || 1; cv.width = box.width * dpr; cv.height = box.height * dpr; app.appendChild(cv);
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const dark = isDark();
    const COL = ['#C9F26B', '#6FBF3B', '#2F6B2A', dark ? '#F5F8EC' : '#16210F', '#A9C79B', '#C9F26B'];
    const mk = (x, y, vx, vy) => ({ x, y, vx, vy, w: 7 + Math.random() * 7, h: 5 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: COL[(Math.random() * COL.length) | 0], round: Math.random() < 0.3 });
    const P = [
      // burst from the button…
      ...Array.from({ length: 90 }, () => { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 5 + Math.random() * 8; return mk(ox, oy, Math.cos(a) * v, Math.sin(a) * v); }),
      // …plus a shower from the top so the whole screen celebrates
      ...Array.from({ length: 70 }, () => mk(Math.random() * box.width, -20 - Math.random() * 160, (Math.random() - 0.5) * 2, 1.5 + Math.random() * 3)),
    ];
    const start = performance.now();
    (function frame(now) {
      const t = now - start; ctx.clearRect(0, 0, box.width, box.height);
      P.forEach(p => {
        p.vy += 0.3; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, Math.min(1, (2600 - t) / 700));
        ctx.fillStyle = p.c; ctx.strokeStyle = dark ? '#0F1609' : '#16210F'; ctx.lineWidth = 1.2;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, 7); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
        ctx.restore();
      });
      if (t < 2600) requestAnimationFrame(frame); else cv.remove();
    })(start);
  }

  // ---------- notes, summaries & journal ----------
  const fmtDays = n => n === Infinity ? 'not yet — invest more' : n > 365 ? 'over a year' : `about ${n} day${n === 1 ? '' : 's'}`;
  const stars = r => r ? '●'.repeat(r) + '○'.repeat(5 - r) : '';
  const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const addNote = f => { S.notes.unshift({ id: uid(), ts: Date.now(), ...f }); save(); };
  // one popup used everywhere: optional summary stats + a note + a 1–5 rating
  function noteSheet(o) {
    let rating = o.rating || 0;
    openSheet(`<h3>${o.heading}</h3>${o.sub ? `<div class="sub">${o.sub}</div>` : ''}
      ${o.stats || ''}
      ${o.pick || ''}
      <label class="l">${o.noteLabel || 'Your note'}</label>
      <textarea class="field" id="nt" rows="4" maxlength="600" placeholder="${esc(o.placeholder || '')}">${esc(o.text || '')}</textarea>
      <label class="l">${o.ratingLabel || 'How did it go?'} (optional)</label>
      <div class="rate" id="rt">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rbtn ${rating === n ? 'on' : ''}" data-r="${n}">${n}</button>`).join('')}</div>
      <button class="btn" id="ok">${o.saveLabel || 'Save note'}</button>
      <button class="link" id="skip">${o.onDelete ? 'Delete this note' : 'Skip'}</button>`, w => {
      $('#rt', w).onclick = e => { const b = e.target.closest('.rbtn'); if (!b) return; const n = +b.dataset.r; rating = rating === n ? 0 : n; w.querySelectorAll('.rbtn').forEach(x => x.classList.toggle('on', +x.dataset.r === rating)); };
      $('#ok', w).onclick = () => { const text = $('#nt', w).value.trim(), pick = $('#npick', w) ? $('#npick', w).value : undefined; closeSheet(); if (text || rating) o.onSave(text, rating, pick); };   // read the form BEFORE the sheet closes
      $('#skip', w).onclick = () => { if (o.onDelete) { if (confirm('Delete this note?')) { closeSheet(); o.onDelete(); } } else closeSheet(); };
      $('#nt', w).focus({ preventScroll: true });
    });
  }
  const statBox = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
  // a small centred pop-up with confetti and a chime — no note prompt (notes can still be written from the Journal)
  function miniSummary(o) {
    openSheet(`<div style="text-align:center"><div style="font-size:44px;line-height:1">${o.emoji}</div><h3 style="margin:8px 0 2px">${o.heading}</h3><div class="sub" style="margin:0">${o.sub}</div></div>
      ${o.stats}${o.foot ? `<div class="sub" style="margin-top:10px;text-align:center">${o.foot}</div>` : ''}
      <button class="btn" id="ok" style="margin-top:14px">Nice</button>`, w => { $('#ok', w).onclick = closeSheet; });
    $('#sheet').classList.add('mini');
    confetti(); chime();
  }
  function investSummary(d, secs, cost, divBefore, divAfter) {
    const st = investStats(d), gain = (divAfter - divBefore) * GEM_PER_DIV;
    miniSummary({
      emoji: '🚀', heading: 'Session done', sub: `<b>${esc(d.name)}</b> · total ${nf(Math.round(st.hours * 10) / 10)}h invested`,
      stats: `<div class="stats">${statBox(dur(secs), 'time invested')}${statBox(tk + '−' + t1(cost), 'Tons spent')}${statBox('+' + (secs / 3600).toFixed(1) + 'h', 'skill added')}${statBox(gm + '+' + gemRate(gain), 'gems / day more')}</div>`,
      foot: `Now paying about ${gm} ${gemRate(st.gemsDay)} a day · ${gemN(st.gemsEarned)} earned so far`,
    });
  }
  function rewardSummary(b, g, left) {
    const took = g && g.created ? Math.max(1, Math.round((b.ts - g.created) / 86400000)) : 0, u = b.cur === 'gem' ? gm : tk, un = b.cur === 'gem' ? 'gems' : 'Tons';
    noteSheet({
      heading: 'Enjoy it 🎉', sub: `<b>${esc(b.name)}</b>`,
      stats: `<div class="stats">${statBox(u + '−' + num(b.cost), un + ' spent')}${statBox(u + (b.cur === 'gem' ? gemN(left) : t1(left)), un + ' left')}${took ? statBox(took + (took === 1 ? ' day' : ' days'), 'to earn it') : ''}</div>`,
      noteLabel: 'How was it? Was it worth it?', placeholder: 'What did you do with it? Would you buy it again?', ratingLabel: 'Worth it?',
      onSave: (text, rating) => { addNote({ kind: 'reward', refId: b.id, title: b.name, line: `−${num(b.cost)} ${un}${took ? ` · took ${took} day${took === 1 ? '' : 's'}` : ''}`, text, rating }); flash('Saved to your Journal'); render(); },
    });
  }
  function freeNoteSheet(kind, ref, title) {
    noteSheet({ heading: 'Add a note', sub: `<b>${esc(title)}</b>`, noteLabel: 'What happened?', placeholder: 'Write anything worth remembering…', onSave: (text, rating) => { addNote({ kind, ...ref, title, line: '', text, rating }); flash('Saved to your Journal'); render(); } });
  }
  function writeNoteSheet() {
    const opts = S.deeds.filter(x => x.kind !== 'neutral').map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
    noteSheet({
      heading: 'Write a note', sub: 'For your Journal — about anything.',
      pick: `<label class="l">About</label><select class="field sel" id="npick"><option value="">General</option>${opts}</select>`,
      noteLabel: 'What happened?', placeholder: 'Write anything worth remembering…', ratingLabel: 'How did it feel?',
      onSave: (text, rating, pick) => { const d = pick ? deedOf(pick) : null; addNote({ kind: d ? (d.kind === 'care' ? 'care' : 'invest') : 'general', ...(d ? { deedId: d.id } : {}), title: d ? d.name : 'Journal', line: '', text, rating }); flash('Saved to your Journal'); render(); },
    });
  }
  function careSummary(d, secs, earned, before, after) {
    const p = PILLARS[d.pillar];
    miniSummary({
      emoji: '💚', heading: 'Nicely done', sub: `<b>${esc(d.name)}</b> · ${p.name} · Health ${healthWord()}`,
      stats: `<div class="stats">${statBox(dur(secs), 'time')}${statBox(tk + '+' + t1(earned), 'Tons earned')}${statBox(tk + '+' + fmtSec(secs > 0 ? earned / secs : 0), 'Tons per second')}${statBox(roomTons(d.pillar) < 0.05 ? 'Full' : tk + t1(roomTons(d.pillar)), p.name + ' · left to earn')}</div>`,
      foot: `Balance ${tk}${t1(balance())}`,
    });
  }
  function editNoteSheet(id) {
    const n = S.notes.find(x => x.id === id); if (!n) return;
    noteSheet({
      heading: 'Edit note', sub: `<b>${esc(n.title)}</b> · ${fmtDate(n.ts)}${n.line ? `<br>${esc(n.line)}` : ''}`, noteLabel: 'Your note', text: n.text, rating: n.rating, saveLabel: 'Save changes',
      onSave: (text, rating) => { Object.assign(n, { text, rating, edited: Date.now() }); save(); render(); },
      onDelete: () => { S.notes = S.notes.filter(x => x.id !== id); gone(id); save(); render(); },
    });
  }
  const noteHTML = n => `<button class="jn" data-edit-note="${n.id}">
      <div class="jt"><b>${esc(n.title)}</b><span>${fmtDate(n.ts)}</span></div>
      ${n.line ? `<div class="sub">${esc(n.line)}</div>` : ''}
      ${n.rating ? `<div class="stars">${stars(n.rating)}</div>` : ''}
      ${n.text ? `<div class="jtext">${esc(n.text)}</div>` : ''}</button>`;

  function buyGoal(id, el) {
    const g = S.goals.find(x => x.id === id); if (!g) return;
    if (gems() < g.target) { const n = g.target - gems(); flash(`You need ${gemN(n)} more gem${n === 1 ? '' : 's'}`); return; }
    const rid = `reward:${uid()}`, ts = Date.now();
    const rec = { id: rid, name: g.name, cost: g.target, cur: 'gem', cat: g.cat || 'Other', ts }; S.bought.unshift(rec);
    if (g.pin) { S.goals = S.goals.filter(x => x.id !== id); gone(id); }   // a goal you saved up for is done; shop items stay for next time
    save(); render(); confetti(el); chime();
    rewardSummary(rec, g, gems());
  }
  // spend gems on anything, without making it an item first
  function spendAnySheet() {
    openSheet(`<h3>Treat myself</h3><div class="sub">Spend gems on whatever you like — it's yours to decide.</div>
      <label class="l">What for?</label><input class="field" id="sn" maxlength="30" placeholder="Pizza night">
      <label class="l">Gems</label><input class="field" id="sg" type="number" inputmode="numeric" step="1" min="1" placeholder="10">
      <label class="l">Category</label><select class="field sel" id="sc">${SHOP_CATS.map(c => `<option>${c}</option>`).join('')}</select>
      <div class="sub" style="margin-top:8px">You have ${gm} ${gemN(gems())}.</div>
      <button class="btn" id="ok">Spend</button><button class="link" id="skip">Cancel</button>`, w => {
      $('#skip', w).onclick = closeSheet;
      $('#ok', w).onclick = () => {
        const name = $('#sn', w).value.trim(), n = Math.round(parseFloat($('#sg', w).value)), cat = $('#sc', w).value;
        if (!name) { $('#sn', w).focus(); return; } if (!(n > 0)) { $('#sg', w).focus(); return; }
        if (n > gems()) { flash(`You only have ${gemN(gems())} gem${gems() === 1 ? '' : 's'}`); return; }
        const rec = { id: `reward:${uid()}`, name, cost: n, cur: 'gem', cat, ts: Date.now() }; S.bought.unshift(rec);
        save(); closeSheet(); render(); confetti(); chime(); rewardSummary(rec, null, gems());
      };
    });
  }

  // ---------- ui state ----------
  let tab = 'wallet';
  const TABS = [['wallet', 'Wallet'], ['deeds', 'Deeds'], ['invest', 'Invest'], ['goals', 'Shop'], ['history', 'History']];
  const renderTabs = () => { $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}"><span class="ic">${icon(k)}</span>${l}</button>`).join(''); };

  // ---------- sheet ----------
  function openSheet(html, onMount) {
    const w = $('#sheet'); w.hidden = false;
    w.innerHTML = `<div class="sheet">${html}</div>`;
    w.onclick = e => { if (e.target === w) closeSheet(); };
    onMount && onMount(w);
  }
  const sheetQueue = [];   // pop-ups waiting their turn (e.g. summaries after "Stop all")
  const closeSheet = () => { const w = $('#sheet'); w.classList.remove('mini'); w.hidden = true; w.innerHTML = ''; if (sheetQueue.length) { const next = sheetQueue.shift(); setTimeout(next, 300); } };
  const coinList = () => `<div class="coinlist">${['tick', 'ten', 'hundred'].map(k => `
    <div class="cl">${coin(k)}<div><b>${COINS[k].name}</b><span>${COINS[k].value} Ton${COINS[k].value > 1 ? 's' : ''}</span></div></div>`).join('')}</div>`;

  function aboutSheet(first) {
    openSheet(`
      <h3>${first ? 'Welcome to Tons' : 'How Tons works'}</h3>
      <div class="sub"><b>Time</b> is the same for everyone: <b>86,400 seconds</b> every day, gone at midnight.</div>
      <div class="sub" style="margin-top:8px"><b>Health</b> is your income: sleep, food, move, hygiene, home, family and Allah (faith). Look after them and you <b>earn Tons</b>.</div>
      <div class="sub" style="margin-top:8px"><b>Looking after yourself:</b> each of those pillars slowly drains through the day, and care deeds refill it and pay you Tons — a timer pays <b>Tons per second</b> while it runs, a check-in pays a lump sum. A pillar can only pay so much at a time — every care deed shows how many Tons are <b>left</b> to earn from it, and a full pillar stops paying. If your overall Health gets too low (below 40%) you can't start an investment.</div>
      <div class="sub" style="margin-top:8px"><b>Combine deeds:</b> you can run up to <b>3 at once</b> — each earns or costs Tons at its own rate, so cleaning while you learn works.</div>
      <div class="sub" style="margin-top:8px"><b>Investments</b> (learning, projects) cost Tons now and <b>pay you gems</b> every day later. <b>Gems</b> are whole numbers you can count — spend them on your goals. <b>Useless</b> deeds just cost — and cost 50% more if you're in debt.</div>
      ${coinList()}
      <div class="sub" style="margin-top:12px"><b>Appearance</b></div>
      <div class="seg" id="theme">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button type="button" data-t="${k}" class="${getTheme() === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="switch"><input type="checkbox" id="snd" ${S.sound ? 'checked' : ''}><span>Celebration sounds</span></label>
      <button class="btn" id="ok">${first ? `Start with ${S.gift} Tons` : 'Got it'}</button>
      ${first ? '<button class="link" id="signin">Already have an account? Sign in</button>' : '<button class="link" id="reset">Reset all data</button>'}
      ${first ? '' : '<button class="link" id="bk">Backup &amp; restore</button>'}
      <div class="sub" style="text-align:center;margin-top:10px;font-size:12px">Tons ${VERSION}</div>`, w => {
      $('#theme', w).onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; setTheme(b.dataset.t); w.querySelectorAll('#theme button').forEach(x => x.classList.toggle('on', x === b)); render(); };
      $('#snd', w).onchange = e => { S.sound = e.target.checked; save(); if (S.sound) chime(); };
      $('#ok', w).onclick = () => { S.onboarded = true; save(); closeSheet(); render(); };
      const si = $('#signin', w); if (si) si.onclick = () => { S.onboarded = true; save(); closeSheet(); accountSheet(); };
      const bk = $('#bk', w); if (bk) bk.onclick = () => { closeSheet(); backupSheet(); };
      const r = $('#reset', w);
      if (r) r.onclick = () => { if (confirm('Delete all deeds, history and goals?')) { S = defaults(); save(); closeSheet(); render(); } };
    });
  }

  // ---------- Backup & restore ----------
  const BK_KEY = 'tick.lastBackup';
  const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`; };
  const lastBackup = () => { try { return +localStorage.getItem(BK_KEY) || 0; } catch { return 0; } };
  // A backup file is untrusted input. Only known fields with the right types get through, ids must be plain tokens and colours
  // must come from the palette — several of these values are placed straight into the page, so anything else could inject markup.
  function sanitizeBackup(d) {
    const A = x => (Array.isArray(x) ? x : []), N = x => typeof x === 'number' && isFinite(x), T = x => typeof x === 'string';
    const ID = x => T(x) && /^[\w:.\-]{1,80}$/.test(x), TXT = (x, n) => (T(x) ? x.slice(0, n) : '');
    const KINDS = ['care', 'invest', 'useless', 'neutral', 'hard'];
    const out = { onboarded: !!d.onboarded };
    ['created', 'gift', 'divAt', 'divCollected', 'divLegacy', 'gemsCollected', 'gemsV', 'shopV'].forEach(k => { if (N(d[k])) out[k] = d[k]; });
    if (typeof d.divAuto === 'boolean') out.divAuto = d.divAuto;
    out.deeds = A(d.deeds).filter(x => x && ID(x.id) && T(x.name) && KINDS.includes(x.kind) &&
      (x.kind === 'care' ? Object.prototype.hasOwnProperty.call(PILLARS, x.pillar) && ['timer', 'tap'].includes(x.mode) && N(x.pts) && x.pts > 0 : x.kind === 'neutral' || N(x.rate)))
      .map(x => ({ id: x.id, name: TXT(x.name, 40), color: PALETTE.includes(x.color) ? x.color : PALETTE[0], kind: x.kind, rate: N(x.rate) ? x.rate : 0,
        ...(x.kind === 'care' ? { pillar: x.pillar, mode: x.mode, pts: x.pts } : {}), ...(N(x.mod) ? { mod: x.mod } : {}) }));
    out.entries = A(d.entries).filter(e => e && ID(e.id) && ID(e.deedId) && N(e.ts) && N(e.secs) && N(e.ticks))
      .map(e => ({ id: e.id, deedId: e.deedId, ts: e.ts, secs: e.secs, ticks: e.ticks, ...(e.div ? { div: true } : {}) }));
    out.notes = A(d.notes).filter(n => n && ID(n.id) && T(n.title) && N(n.ts))
      .map(n => ({ id: n.id, ts: n.ts, kind: ['reward', 'care', 'general'].includes(n.kind) ? n.kind : 'invest', ...(ID(n.deedId) ? { deedId: n.deedId } : {}), ...(ID(n.refId) ? { refId: n.refId } : {}),
        title: TXT(n.title, 80), line: TXT(n.line, 160), text: TXT(n.text, 600), rating: Number.isInteger(n.rating) && n.rating >= 1 && n.rating <= 5 ? n.rating : 0, ...(N(n.edited) ? { edited: n.edited } : {}) }));
    out.goals = A(d.goals).filter(g => g && ID(g.id) && T(g.name) && N(g.target) && g.target > 0)
      .map(g => ({ id: g.id, name: TXT(g.name, 40), target: g.target, ...(N(g.created) ? { created: g.created } : {}), ...(N(g.mod) ? { mod: g.mod } : {}), ...(T(g.cat) ? { cat: TXT(g.cat, 20) } : {}), ...(IMG_OK(g.img) ? { img: g.img } : {}), ...(typeof g.pin === 'boolean' ? { pin: g.pin } : {}) }));
    out.bought = A(d.bought).filter(b => b && ID(b.id) && T(b.name) && N(b.cost) && N(b.ts)).map(b => ({ id: b.id, name: TXT(b.name, 40), cost: b.cost, ts: b.ts, ...(b.cur === 'gem' ? { cur: 'gem' } : {}), ...(T(b.cat) ? { cat: TXT(b.cat, 20) } : {}) }));
    out.tomb = A(d.tomb).filter(ID);
    if (d.balanceV === 2) out.balanceV = 2;
    out.chat = A(d.chat).filter(c => c && (c.from === 'me' || c.from === 'bot') && T(c.text)).map(c => ({ from: c.from, text: TXT(c.text, 600) })).slice(-40);
    if (d.health && typeof d.health === 'object') { out.health = {}; Object.keys(PILLARS).forEach(k => { const h = d.health[k]; if (h && N(h.v) && N(h.t)) out.health[k] = { v: clamp(h.v, 0, 100), t: h.t }; }); }
    out.actives = [...A(d.actives), ...(d.active ? [d.active] : [])].filter(a => a && ID(a.deedId) && N(a.start)).slice(0, MAX_ACTIVE)
      .map(a => ({ id: ID(a.id) ? a.id : 'run-' + a.start, deedId: a.deedId, start: a.start, startVal: N(a.startVal) ? a.startVal : 0, ...(N(a.startBal) ? { startBal: a.startBal } : {}) }));   // older backups had one running session
    return out;
  }
  function parseBackup(text) {
    const o = JSON.parse(text);
    const d = o && (o.app === 'tick' || o.app === 'gems' || o.app === 'tons') && o.data ? o.data : o;                  // new wrapped format, or a raw save from v14
    if (!d || typeof d !== 'object' || !Array.isArray(d.deeds) || !Array.isArray(d.entries)) throw new Error('not a Tons backup');
    return { data: sanitizeBackup(d), exportedAt: o && o.exportedAt ? Date.parse(o.exportedAt) || 0 : 0 };
  }
  function exportBackup() {
    const file = { app: 'tons', format: 1, exportedAt: new Date().toISOString(), appVersion: VERSION, data: JSON.parse(JSON.stringify(S)) };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `tons-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    try { localStorage.setItem(BK_KEY, String(Date.now())); } catch {}
    flash('Backup downloaded');
  }
  function backupSheet() {
    const lb = lastBackup();
    openSheet(`<h3>Backup &amp; restore</h3>
      <div class="sub">Your Tons live in this browser${user ? ' and in your account' : ''}. A backup file is a copy you can keep anywhere — handy before clearing your browser or switching phones.</div>
      <div class="stats">${statBox(S.entries.length, 'entries')}${statBox(S.notes.length, 'journal notes')}${statBox(S.deeds.length, 'deeds')}${statBox(S.goals.length + S.bought.length, 'goals &amp; rewards')}</div>
      <div class="sub" style="margin-top:10px">${lb ? `Last backup: ${ago(lb)}` : 'You haven\'t made a backup on this device yet.'}</div>
      <button class="btn" id="bx">Export backup</button>
      <label class="btn lime" style="display:block;text-align:center;border:1.5px solid var(--ink);cursor:pointer">Import a backup file<input type="file" id="bi" accept="application/json,.json" hidden></label>
      <div class="msg sub" id="bmsg" style="min-height:20px;margin-top:10px"></div>`, w => {
      $('#bx', w).onclick = () => { exportBackup(); backupSheet(); };
      const bi = $('#bi', w);
      bi.onchange = () => {
        const f = bi.files[0]; bi.value = ''; if (!f) return;
        if (f.size > 8e6) { $('#bmsg', w).textContent = 'That file is too big to be a Tons backup.'; return; }
        const rd = new FileReader();
        rd.onload = () => { try { importChoiceSheet(parseBackup(String(rd.result)), f.name); } catch { const m = $('#bmsg', w); if (m) m.textContent = 'That file is not a Tons backup.'; } };
        rd.onerror = () => { $('#bmsg', w).textContent = 'Could not read that file.'; };
        rd.readAsText(f);
      };
    });
  }
  function importChoiceSheet(bk, name) {
    const d = bk.data;
    openSheet(`<h3>Restore this backup?</h3>
      <div class="sub"><b>${esc(name)}</b>${bk.exportedAt ? ` · saved ${new Date(bk.exportedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</div>
      <div class="stats">${statBox(d.entries.length, 'entries')}${statBox(d.notes.length, 'journal notes')}${statBox(d.deeds.length, 'deeds')}${statBox(d.goals.length + d.bought.length, 'goals &amp; rewards')}</div>
      <div class="sub" style="margin-top:10px"><b>Merge</b> adds everything in the file to what you have now and keeps both — nothing is lost.${user ? '' : ' <b>Replace</b> swaps your data for the file.'}</div>
      ${user ? '<div class="sub" style="margin-top:6px">You are signed in, so a backup is always merged with your account.</div>' : ''}
      <button class="btn" id="merge">Merge with my data</button>
      ${user ? '' : '<button class="btn ghost" id="replace">Replace everything on this device</button>'}
      <button class="link" id="cancel">Cancel</button>`, w => {
      const snd = S.sound;
      $('#merge', w).onclick = () => { S = mergeStates(S, d); S.sound = snd; migrate(); save(); closeSheet(); render(); flash('Backup merged'); };
      const rp = $('#replace', w);
      if (rp) rp.onclick = () => { if (!confirm('Replace everything on this device with this backup?')) return; S = Object.assign(defaults(), d); S.sound = snd; migrate(); save(); closeSheet(); render(); flash('Backup restored'); };
      $('#cancel', w).onclick = closeSheet;
    });
  }

  // ---------- views ----------
  // appearance: 'auto' follows the phone, or force light / dark. Per device (not synced).
  const getTheme = () => { try { const t = localStorage.getItem('tick.theme'); return t === 'light' || t === 'dark' ? t : 'auto'; } catch { return 'auto'; } };
  const isDark = () => { const t = getTheme(); return t === 'dark' || (t === 'auto' && !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)); };
  function setTheme(t) {
    try { if (t === 'auto') localStorage.removeItem('tick.theme'); else localStorage.setItem('tick.theme', t); } catch {}
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  }
  const head = (title, extra = '') => `<div class="head"><h1>${title}</h1><div style="display:flex;gap:8px">${extra}<button class="icon-btn" data-act="theme" aria-label="Switch dark / light mode">${icon(isDark() ? 'sun' : 'moon')}</button><button class="icon-btn acct ${user ? 'on' : ''} ${sync.status === 'syncing' ? 'syncing' : ''}" data-act="account" aria-label="Account">${icon('account')}</button><button class="icon-btn" data-act="about" aria-label="How Tons works">${symbol(26)}</button></div></div>`;
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
  const healthSub = () => gated() ? `Too low to invest — refill ${lowest(2).map(k => PILLARS[k].name).join(' or ')} first` : `Refill pillars to earn Tons · keep it above ${HEALTH_MIN}% to invest`;
  const deedBtn = d => {
    const care = d.kind === 'care', tap = care && d.mode === 'tap', r = care ? roomTons(d.pillar) : 0, pct = care ? Math.round(100 * r / (100 * PILLARS[d.pillar].price)) : 0;
    const attr = tap ? `data-tap="${d.id}"` : `data-start="${d.id}" ${d.kind === 'invest' && gated() ? 'disabled' : ''}`;
    return `<button class="deedbtn" ${attr}><span class="dn"><i class="dot" style="background:${d.color}"></i><span>${esc(d.name)}</span></span>
      <em class="dr">${rateLbl(d)}</em>${care ? `<span class="dl">${r < 0.05 ? 'full — nothing to earn' : `${t1(r)} Tons to earn`}</span><span class="db"><i style="width:${pct}%"></i></span>` : ''}</button>`;
  };
  const group = (kind, title) => {
    const ds = S.deeds.filter(d => d.kind === kind && !isActive(d.id)); if (!ds.length) return '';
    return `<div class="glbl">${title}</div><div class="deeds">${ds.map(deedBtn).join('')}</div>`;
  };

  // ---------- The running timer (see timers.js) ----------
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const timerCtx = (d, el, t) => ({ kind: d.kind, elapsed: el, ticks: t, reduced: REDUCED, signHTML: tk, pillar: null, label: d.kind === 'care' && d.mode === 'timer' ? (roomTons(d.pillar) < 0.05 ? `${PILLARS[d.pillar].name} is full — no more Tons right now` : `Tons this session · ${roomTons(d.pillar).toFixed(2)} left to earn`) : undefined });
  const verbOf = d => ({ invest: 'Investing in', care: 'Looking after', useless: 'Spending on', neutral: 'Doing' }[d.kind]);
  const netLbl = r => `${r >= 0 ? '+' : '−'}${Math.abs(r).toFixed(1)}/min`;
  const comboNet = () => S.actives.reduce((sum, a) => sum + ticksFor(a, elapsedOf(a)), 0);
  const comboRate = () => S.actives.reduce((sum, a) => { const d = deedOf(a.deedId); return sum + (d.kind === 'care' ? (d.mode === 'timer' ? careRate(d) : 0) : d.kind === 'neutral' ? 0 : -d.rate); }, 0);
  const comboCtx = () => { const net = comboNet(); return { kind: net >= 0 ? 'care' : 'useless', elapsed: Math.max(0, ...S.actives.map(elapsedOf)), ticks: net, reduced: REDUCED, signHTML: tk, pillar: null, label: `${S.actives.length} deeds together · ${netLbl(comboRate())}` }; };
  function stageHTML(a) {                                   // one running session: the Big number timer
    const d = deedOf(a.deedId), el = elapsedOf(a);
    if (!window.TickTimers) return `<div class="stage" data-sid="${a.id}"><div class="mid live">${clock(el)}</div></div>`;   // timers.js failed to load
    return `<div class="stage" data-sid="${a.id}">${TickTimers.render(timerCtx(d, el, ticksFor(a, el)))}</div>`;
  }
  function runningHTML() {
    const n = S.actives.length; if (!n) return '';
    if (n === 1) { const a = S.actives[0], d = deedOf(a.deedId); return `<div class="card run"><div class="rhead"><div class="sub"><span class="pulse"></span>${verbOf(d)} <b>${esc(d.name)}</b> · ${rateLbl(d)}</div><button class="pbtn" data-stop="${a.id}">Stop</button></div>${stageHTML(a)}</div>`; }
    const stage = window.TickTimers ? `<div class="stage" data-combo="1">${TickTimers.render(comboCtx())}</div>` : '';
    return `<div class="card run"><div class="rhead"><div class="sub"><span class="pulse"></span>Doing <b>${n} things at once</b></div><button class="pbtn" data-act="stopall">Stop all</button></div>${stage}
      <div style="margin-top:6px">${S.actives.map(a => { const d = deedOf(a.deedId), el = elapsedOf(a), t = ticksFor(a, el);
        return `<div class="row" data-row="${a.id}"><i class="dot" style="background:${d.color}"></i><div class="t"><b>${esc(d.name)}</b><span class="rk">${clock(el)} · ${rateLbl(d)}</span></div><div class="r"><b class="rt">${t >= 0 ? '+' : '−'}${Math.abs(t).toFixed(2)}</b></div><button class="chip" style="margin:0 0 0 8px" data-stop="${a.id}">Stop</button></div>`; }).join('')}</div></div>`;
  }
  function updateStages() {
    if (!window.TickTimers) return;
    document.querySelectorAll('.stage[data-sid]').forEach(h => { const a = S.actives.find(x => x.id === h.dataset.sid); if (a) { const el = elapsedOf(a); TickTimers.update(timerCtx(deedOf(a.deedId), el, ticksFor(a, el)), h.firstElementChild); } });
    const cb = document.querySelector('.stage[data-combo]'); if (cb) TickTimers.update(comboCtx(), cb.firstElementChild);
    document.querySelectorAll('[data-row]').forEach(r => { const a = S.actives.find(x => x.id === r.dataset.row); if (!a) return; const el = elapsedOf(a), t = ticksFor(a, el); r.querySelector('.rk').textContent = `${clock(el)} · ${rateLbl(deedOf(a.deedId))}`; r.querySelector('.rt').textContent = `${t >= 0 ? '+' : '−'}${Math.abs(t).toFixed(2)}`; });
  }

  // balance at the start of today = balance now − what today added + what today took
  const startBal = () => { const { earned, spent } = dayEarnSpend(0); return balance() - earned + spent; };
  const startLine = () => { const b = startBal(); return b < -0.004 ? `Started today in debt: −${t1(b)}` : `Started today with ${t1(b)}`; };
  let histFilter = 'all';
  function ledgerSheet() {
    const from = dayStart(29), rows = [];
    S.entries.forEach(e => { if (e.ts >= from && e.ticks) rows.push({ ts: e.ts, t: e.ticks, secs: e.secs, e, d: deedOf(e.deedId) }); });
    S.actives.forEach(a => { const t = activeTicksOf(a, from, Infinity); if (Math.abs(t) > 0.004) rows.push({ ts: a.start, t, secs: elapsedOf(a), live: true, d: deedOf(a.deedId) }); });
    rows.sort((a, b) => b.ts - a.ts);
    const sel = rows.filter(r => histFilter === 'all' || (histFilter === 'in' ? r.t > 0 : r.t < 0));
    const by = {}; sel.forEach(r => { if (r.e && isAdjust(r.e)) return; const k = r.live ? (r.d.kind === 'care' ? 'care' : r.d.kind === 'invest' ? 'invest' : 'useless') : catOf(r.e); const key = (r.t > 0 ? '+' : '−') + k; by[key] = (by[key] || 0) + Math.abs(r.t); });
    const inT = rows.filter(r => r.t > 0 && !(r.e && isAdjust(r.e))).reduce((a, r) => a + r.t, 0), outT = rows.filter(r => r.t < 0 && !(r.e && isAdjust(r.e))).reduce((a, r) => a - r.t, 0);
    const mx = Math.max(1, ...Object.values(by));
    const cats = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="crow"><div class="cn"><span>${CAT[k.slice(1)]}</span><b>${k[0]}${t1(v)}</b></div><div class="cb"><i class="${k[0] === '+' ? 'in' : 'out'}" style="width:${(v / mx) * 100}%"></i></div></div>`).join('');
    const dayLbl = ts => { const off = Math.round((dayStart(0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000); return off === 0 ? 'Today' : off === 1 ? 'Yesterday' : new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };
    let last = '', list = '';
    sel.slice(0, 150).forEach(r => {
      const dl = dayLbl(r.ts); if (dl !== last) { last = dl; list += `<div class="sub" style="margin:14px 0 4px;font-weight:700">${dl}</div>`; }
      const adj = r.e && isAdjust(r.e), why = adj ? 'Balance reset to the welcome Tons' : r.live ? 'running now' : r.e.div ? 'daily dividend' : (CAT[catOf(r.e)] + (r.secs > 0 ? ' · ' + dur(r.secs) : ''));
      const time = new Date(r.ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      list += `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(128,128,128,.18)"><span><b>${esc(r.d.name)}</b><br><span class="sub">${esc(why)} · ${time}</span></span><b style="white-space:nowrap">${r.t > 0 ? '+' : '−'}${t1(r.t)}</b></div>`;
    });
    const chip = (k, l) => `<button class="chip" data-hf="${k}" style="margin:0 6px 0 0;${histFilter === k ? 'background:var(--btn-bg);color:var(--btn-fg)' : 'background:none;color:inherit'}">${l}</button>`;
    openSheet(`<div style="position:sticky;top:-22px;margin:-22px -18px 0;padding:18px 18px 8px;background:var(--bg);z-index:2;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">History</h3><button id="x" aria-label="Close" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--ink);background:none;color:var(--ink);font-size:22px;line-height:1;cursor:pointer">×</button></div>
      <div class="sub" style="margin-top:6px">Last 30 days · earned <b>+${t1(inT)}</b> · spent <b>−${t1(outT)}</b></div>
      <div style="margin:10px 0 4px">${chip('all', 'All')}${chip('in', 'Earned')}${chip('out', 'Spent')}</div>
      ${cats ? `<div style="margin-top:10px;font-size:15px;font-weight:700">${histFilter === 'in' ? 'Where you earned' : histFilter === 'out' ? 'Where you spent' : 'Where Tons came from and went'}</div>${cats}` : ''}
      <div style="margin-top:14px;font-size:15px;font-weight:700">${histFilter === 'in' ? 'Every earning' : histFilter === 'out' ? 'Every purchase and cost' : 'Everything, newest first'}</div>
      ${list || '<div class="sub">Nothing here yet.</div>'}
      <button class="btn lime" id="ok" style="margin-top:14px;border:1.5px solid var(--ink)">Close</button>`, w => {
      $('#ok', w).onclick = closeSheet; $('#x', w).onclick = closeSheet;
      w.querySelectorAll('[data-hf]').forEach(b => b.onclick = () => { const sc = w.firstElementChild.scrollTop; histFilter = b.dataset.hf; ledgerSheet(); const n = $('#sheet').firstElementChild; if (n) n.scrollTop = sc; });
    });
  }

  const KIND_UI = { care: ['Earn', 'earn', 'Look after yourself · earns Tons'], invest: ['Invest', 'invest', 'Invest · costs now, pays back later'], useless: ['Spend', 'spend', 'Spend · no return'] };
  function pickSheet(kind) {
    const [name, , sub] = KIND_UI[kind];
    const full = S.actives.length >= MAX_ACTIVE;
    openSheet(`<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">${name}</h3><button id="x" aria-label="Close" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--ink);background:none;color:var(--ink);font-size:22px;line-height:1;cursor:pointer">×</button></div>
      <div class="sub" style="margin-bottom:6px">${full ? `You are doing ${MAX_ACTIVE} things at once — stop one to start another.` : kind === 'invest' && gated() ? `Health is too low to invest — refill ${lowest(2).map(k => PILLARS[k].name).join(' or ')} first.` : sub}</div>
      <div class="compact">${group(kind, '')}${kind === 'care' ? group('neutral', 'Just living · time only') : ''}</div>${kind === 'useless' ? `<div style="margin-top:12px"><div class="sub" style="margin:0 0 6px">Edit a spend deed</div>${S.deeds.filter(x => x.kind === 'useless').map(x => `<button class="chip" data-edit="${x.id}">${esc(x.name)} ✎</button>`).join('')}<button class="chip" data-act="adddeed">+ New</button></div>` : ''}`, w => { $('#x', w).onclick = closeSheet; });
  }
  const recentHTML = () => {
    const rows = S.entries.filter(e => !isAdjust(e) && e.ticks).sort((a, b) => b.ts - a.ts).slice(0, 6);
    if (!rows.length) return '<div class="sub" style="padding:6px 0">Nothing yet — start a deed and it will show up here.</div>';
    const gl = c => c === 'care' || c === 'other' ? 'deeds' : c === 'invest' || c === 'div' ? 'invest' : c === 'reward' ? 'goals' : 'spend';
    return rows.map(e => { const d = deedOf(e.deedId), c = catOf(e);
      return `<div class="tx"><span class="txi ${e.ticks > 0 ? 'in' : ''}">${icon(gl(c))}</span><span class="txm"><b>${esc(d.name)}</b><span class="sub">${e.div ? 'Daily dividend' : CAT[c]}${e.secs > 0 ? ' · ' + dur(e.secs) : ''} · ${ago(e.ts)}</span></span><b class="txa ${e.ticks > 0 ? 'in' : ''}">${e.ticks > 0 ? '+' : '−'}${t1(e.ticks)}</b></div>`; }).join('');
  };
  // what your investments will pay: dividends accrue continuously and land in your balance through the day
  function incomingHTML() {
    const invs = S.deeds.filter(d => d.kind === 'invest').map(d => ({ d, perDay: gemsPerDay(d) })).filter(x => x.perDay > 0.02).sort((a, b) => b.perDay - a.perDay);
    if (!invs.length) return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b>Gems</b><div class="sub" style="margin:2px 0 0">Invest time in something and it pays you gems every day.</div></div><button class="pbtn" data-pick="invest">Invest</button></div></div>`;
    const perDay = invs.reduce((a, x) => a + x.perDay, 0), pend = gemsPending();
    return `<div class="card">
      <div class="sechead" style="margin:0 0 8px"><b>Incoming gems</b><button class="link" data-tab="invest">Invest ›</button></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><span class="gv">${S.divAuto ? '' : '<i>+</i>'}${gm}<b>${S.divAuto ? gemRate(perDay) : gemN(pend)}</b>${S.divAuto ? '<small>/ day</small>' : ''}</span><div class="sub" style="margin:0">${S.divAuto ? 'Paid straight into your gems' : 'ready · building ≈ ' + gemRate(perDay) + ' a day'}</div></div>
        ${S.divAuto ? '' : `<button class="pbtn" data-act="collect" ${pend < 1 ? 'disabled style="opacity:.4"' : ''}>Collect</button>`}</div>
      ${S.divAuto ? '' : `<div class="bar"><i style="width:${Math.round(gemFrac() * 100)}%"></i></div><div class="sub" style="margin-top:6px">Next gem is ${Math.round(gemFrac() * 100)}% there.</div>`}
      ${invs.slice(0, 3).map(x => `<div class="row" style="padding:8px 0 0"><i class="dot" style="background:${x.d.color}"></i><div class="t"><b>${esc(x.d.name)}</b></div><div class="r"><b>+${gemRate(x.perDay)}/day</b></div></div>`).join('')}
    </div>`;
  }
  // the goal you're closest to — with the Buy button right here
  function nextGoalHTML() {
    const sv = S.goals.filter(x => x.pin); if (!sv.length) return '';
    const have = gems(), g = [...sv].sort((a, b) => (a.target - have) - (b.target - have))[0], need = g.target - have, can = need <= 0;
    const inc = S.deeds.filter(d => d.kind === 'invest').reduce((a, d) => a + gemsPerDay(d), 0);
    return `<div class="card">
      ${IMG_OK(g.img) ? `<div class="cover" style="margin:-4px -4px 10px"><img src="${g.img}" alt=""></div>` : ''}
      <div class="sechead" style="margin:0 0 8px"><b>Saving up for</b><button class="link" data-tab="goals">Shop ›</button></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><b style="font-size:17px">${esc(g.name)}</b><span class="sub" style="margin:0">${gm} ${gemN(Math.min(have, g.target))} of ${gemN(g.target)}</span></div>
      <div class="bar"><i style="width:${Math.max(0, Math.min(100, (have / g.target) * 100))}%"></i></div>
      <div class="sub" style="margin-top:6px">${can ? 'You can afford it 🎉' : `${gemN(need)} gem${need === 1 ? '' : 's'} to go${inc > 0.05 ? ` · about ${Math.max(1, Math.ceil(need / inc))} day${Math.ceil(need / inc) <= 1 ? '' : 's'} at your pace` : ' · invest to earn gems'}`}</div>
      ${can ? `<button class="btn" data-buy="${g.id}" style="margin-top:10px">Buy it · ${gm} ${gemN(g.target)}</button>` : ''}
    </div>`;
  }
  function viewWallet() {
    const bal = balance(), debt = bal < -0.004;
    const act = (k, label, extra) => `<button class="qa" ${extra}><span class="qi">${icon(k)}</span><span>${label}</span></button>`;
    return `
      ${head('Wallet')}
      <div class="card hero ${debt ? 'debt' : ''}" id="balhero">
        <div class="lbl" id="ballbl">${debt ? 'In debt · useless time costs +50%' : 'Total balance'}</div>
        <div class="big live" id="bal">${tk}${tBig(bal)}</div>
        <div class="gemline"><span>${gm} <b id="gems">${gemN(gems())}</b> gems</span>${gemsPending() >= 1 ? `<button class="chip" data-act="collect" style="margin:0">+${gemN(gemsPending())} ready</button>` : ''}</div>
        <div class="hrow"><span>Time left today</span><b class="live" id="hms">${hms(dayRemaining())}</b></div>
        <div class="bar"><i id="bar" style="width:${((DAY - dayRemaining()) / DAY) * 100}%"></i></div>
      </div>
      <div class="qas">${act('earn', 'Earn', 'data-pick="care"')}${act('invest', 'Invest', 'data-pick="invest"')}${act('spend', 'Spend', 'data-pick="useless"')}${act('history', 'History', 'data-act="ledger"')}</div>
      ${runningHTML()}
      ${incomingHTML()}${nextGoalHTML()}
      <div class="sechead"><b>Recent activity</b><button class="link" data-act="ledger">See all</button></div>
      <div class="card txl" id="recent">${recentHTML()}</div>
      <div class="sechead"><b>Where today went</b></div>
      <div class="card" id="where">${whereHTML()}</div>`;
  }
  function whereHTML() {
    const byT = dayByDeed(0), byK = dayTicksByDeed(0), ids = [...new Set([...Object.keys(byT), ...Object.keys(byK)])].sort((a, b) => (byT[b] || 0) - (byT[a] || 0));
    return ids.length ? `<div class="segbar">${ids.filter(id => byT[id]).map(id => `<i style="width:${(byT[id] / DAY) * 100}%;background:${deedOf(id).color}"></i>`).join('')}</div>` + ids.map(id => `
      <div class="row"><i class="dot" style="background:${deedOf(id).color}"></i><div class="t"><b>${esc(deedOf(id).name)}</b><span>${byT[id] ? dur(byT[id]) : deedOf(id).kind === 'invest' ? 'dividend' : 'check-in'}</span></div>
      <div class="r"><b>${deedOf(id).kind === 'neutral' ? '—' : tk + signed(byK[id] || 0)}</b></div></div>`).join('')
      : '<div class="empty">Nothing yet. Look after yourself and earn your first Tons.</div>';
  }

  function viewDeeds() {
    const byT = dayByDeed(0), byK = dayTicksByDeed(0);
    const sub = d => d.kind === 'care'
      ? `${PILLARS[d.pillar].name} · ${rateLbl(d)} · ${leftLbl(d)}`
      : `${rateLbl(d)} · ${dur(byT[d.id] || 0)} today`;
    const grp = (kind, title) => {
      const ds = S.deeds.filter(d => d.kind === kind); if (!ds.length) return '';
      return `<h2>${title}</h2><div class="card">${ds.map(d => `<div class="row"><i class="dot" style="background:${d.color};width:18px;height:18px"></i>
        <div class="t"><b>${esc(d.name)}</b><span>${sub(d)}</span></div>
        <div class="r"><b>${d.kind === 'neutral' ? '' : tk + signed(byK[d.id] || 0)}</b></div><button class="x edit" data-edit="${d.id}" aria-label="Edit ${esc(d.name)}">✎</button></div>`).join('')}</div>`;
    };
    return `
      ${head('Deeds', '<button class="icon-btn" data-act="adddeed" aria-label="Add deed">+</button>')}
      ${grp('care', 'Care · refill your Health, earn Tons')}${grp('invest', 'Investments · cost Tons, pay gems')}${grp('neutral', 'Just living')}
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
      return `Health is ${Math.round(healthScore())}% (each pillar is a 0–100% gauge: 0% neglected, 100% fully looked after). Lowest: ${PILLARS[ks[0]].name} ${Math.round(pv(ks[0]))}%, ${PILLARS[ks[1]].name} ${Math.round(pv(ks[1]))}%.` + (gated() ? '\nThat is too low to invest — refill a pillar first.' : '');
    }
    const mt = l.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(?:ticks?|gems?|tons?)\b/);
    if (mt) {
      const n = parseFloat(mt[1]), useless = S.deeds.filter(d => d.kind === 'useless').map(d => d.rate), avgU = useless.length ? useless.reduce((a, b) => a + b, 0) / useless.length : 1;
      return `${num(n)} Tons is about ${dur(n / avgU * 60)} of useless fun, or ${dur(n / 0.25 * 60)} of investing at 0.25/min.\nAt your pace (${t1(avgDailyIncome())}/day) you earn that in ${Math.max(1, Math.ceil(n / avgDailyIncome()))} day(s).`;
    }
    const secs = parseDur(q);
    if (secs !== null) {
      const d = named || { kind: 'useless', rate: 1, name: 'useless time' }, m = secs / 60, pct = (secs / DAY * 100).toFixed(1);
      if (d.kind === 'invest') {
        const cost = d.rate * m, perDay = (secs / 3600) * d.rate * DIV_PER_RATE, back = perDay > 0 ? Math.ceil(cost / perDay) : 0;
        return `${dur(secs)} of ${d.name} costs ${t1(cost)} Tons (${nf2(d.rate)}/min).\nIt pays about ${gemRate(perDay * GEM_PER_DIV)} gems a day, fading 2% a day if you stop practising.\nThat is roughly ${gemRate(cost / Math.max(0.01, perDay * GEM_PER_DIV))} Tons per gem.` + (gated() ? '\nBut Health is too low to start it right now.' : '');
      }
      if (d.kind === 'care') return d.mode === 'tap' ? `${d.name} is a quick check-in worth up to +${nf(careRate(d))} Tons.` : `${dur(secs)} of ${d.name} earns up to +${t1(careRate(d) * m)} Tons (${perSec(careRate(d))} Tons/sec) — but ${PILLARS[d.pillar].name} can only pay ${t1(roomTons(d.pillar))} more right now.`;
      if (d.kind === 'useless') {
        const cost = uselessCost(d.rate, m, bal), left = bal - cost;
        return `${dur(secs)} of ${d.name === 'useless time' ? q.replace(/(\d+(?:\.\d+)?)\s*[a-z]+\b/i, '').trim() || d.name : d.name} costs ${t1(cost)} Tons (${d.rate}/min).\n` +
          (left >= 0 ? `You have ${t1(bal)} → ${t1(left)} left.\n` : `That puts you ${t1(-left)} Tons in debt (+50% surcharge while in debt).\n`) + `That's ${pct}% of today's time.`;
      }
      return `${dur(secs)} of ${d.name} costs no Tons, but uses ${pct}% of today's time.`;
    }
    if (/\btons?\b|gem|tick|balance|wallet|have|afford|debt/.test(l)) return bal < 0 ? `You are ${t1(-bal)} Tons in debt. Look after yourself to earn your way back above zero.` : `You have ${t1(bal)} Tons. Caring for yourself earns more. You also have ${gemN(gems())} gems from investing.`;
    if (/left|time/.test(l)) return `You have ${hms(dayRemaining())} of today left. It expires at midnight.`;
    if (/earn|spen[dt]|top|most|where/.test(l)) { const { earned, spent } = dayEarnSpend(0); return `Today: +${t1(earned)} earned, −${t1(spent)} spent. Net ${signed(earned - spent)} Tons.`; }
    return 'Try “2h scrolling”, “2h learn to code”, “100 tons”, “how is my health?” or “how many Tons do I have?”';
  }
  const roiChip = x => `<span class="pc ${x.gemsEarned > 0 ? 'up' : ''}">${gm} ${gemN(x.gemsEarned)} earned</span>`;
  // dividends paid per day for the last 14 days → a small stock-style area chart
  function divChart() {
    const vals = Array.from({ length: 14 }, (_, k) => { const [d0, d1] = dayRange(13 - k); return S.entries.reduce((a, e) => a + (e.div && e.ts >= d0 && e.ts < d1 ? e.ticks * GEM_PER_DIV : 0), 0); });
    const W = 320, H = 70, mx = Math.max(0.01, ...vals), pts = vals.map((v, k) => [k * W / 13, H - 6 - (v / mx) * (H - 16)]);
    const line = pts.map((q, k) => (k ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#16210F" stop-opacity=".28"/><stop offset="1" stop-color="#16210F" stop-opacity="0"/></linearGradient></defs><path d="${line} L${W} ${H} L0 ${H} Z" fill="url(#sg)"/><path d="${line}" fill="none" stroke="#16210F" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="${pts[13][0]}" cy="${pts[13][1].toFixed(1)}" r="4" fill="#16210F"/></svg>`;
  }
  function holdSheet(id) {
    const d = deedOf(id), x = { d, ...investStats(d) }; if (d.kind !== 'invest') return;
    const n = S.notes.find(q => q.deedId === id), cnt = S.notes.filter(q => q.deedId === id).length, dis = S.actives.length >= MAX_ACTIVE || isActive(id) || gated();
    openSheet(`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><h3 style="margin:0">${esc(d.name)}</h3><div class="sub" style="margin:2px 0 0">costs ${nf2(d.rate)} Tons/min · ${roiChip(x)}</div></div><div style="display:flex;gap:8px"><button class="x edit" data-edit="${id}" aria-label="Edit">✎</button><button id="x" aria-label="Close" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--ink);background:none;color:var(--ink);font-size:22px;line-height:1;cursor:pointer">×</button></div></div>
      <div class="stats">${statBox(gm + ' ' + gemRate(x.gemsDay), 'gems / day')}${statBox(nf(Math.round(x.hours * 10) / 10) + 'h', 'time invested')}${statBox(tk + num(x.spent), 'Tons invested')}${statBox(gm + ' ' + gemN(x.gemsEarned), 'gems earned')}${statBox(x.skill.toFixed(1) + 'h', 'skill now')}${statBox(x.gemsEarned > 0 ? tk + t1(x.spent / x.gemsEarned) : '—', 'Tons per gem so far')}</div>
      ${n ? `<div class="sub" style="margin-top:12px;font-style:italic">“${esc(n.text || 'Rated ' + n.rating + '/5')}” <span style="font-size:12px">· ${cnt} note${cnt === 1 ? '' : 's'}</span></div>` : ''}
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn" style="margin:0;flex:1" data-start="${id}" ${dis ? 'disabled' : ''}>${isActive(id) ? 'Running…' : gated() ? 'Health too low' : S.actives.length >= MAX_ACTIVE ? '3 running' : 'Invest now'}</button><button class="chip" style="margin:0;align-self:center" data-add-note="${id}">+ note</button></div>`, w => { $('#x', w).onclick = closeSheet; });
  }
  function viewInvest() {
    const invs = S.deeds.filter(d => d.kind === 'invest'), st = invs.map(d => ({ d, ...investStats(d) })).sort((a, b) => b.gemsDay - a.gemsDay);
    const perDay = st.reduce((a, x) => a + x.gemsDay, 0), spent = st.reduce((a, x) => a + x.spent, 0), earnedG = st.reduce((a, x) => a + x.gemsEarned, 0);
    const pend = gemsPending();
    const chips = ['2h learn to code', '1h deep work', '100 tons', 'how is my health?'];
    return `
      ${head('Invest', '<button class="icon-btn" data-act="addinvest" aria-label="Add investment">+</button>')}
      <div class="card hero">
        <div class="lbl">Gems per day</div>
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><div class="big live" id="divs">${gm} ${gemRate(perDay)}</div><span class="pc big-pc">${gm} ${gemN(gems())} in your pocket</span></div>
        ${divChart()}
        <div class="hrow"><span>Last 14 days</span><span>gems earned per day · fades 2% without practice</span></div>
      </div>
      <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div class="sub" style="margin:0">${S.divAuto ? 'Auto-pay is on' : 'Ready to collect'}</div>${S.divAuto ? '<div class="mid" style="font-size:22px">Paid as it builds</div>' : `<span class="gv"><i>+</i>${gm}<b>${gemN(pend)}</b></span>`}</div>${S.divAuto ? '' : `<button class="pbtn" data-act="collect" ${pend < 1 ? 'disabled style="opacity:.4"' : ''}>Collect</button>`}</div>
        ${S.divAuto ? '' : `<div class="bar"><i style="width:${Math.round(gemFrac() * 100)}%"></i></div><div class="sub" style="margin-top:6px">Next gem is ${Math.round(gemFrac() * 100)}% there.</div>`}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px"><span class="sub" style="margin:0">${S.divAuto ? 'Gems go straight into your pocket.' : 'Gems build up until you collect.'}</span><button class="chip" style="margin:0" data-act="autopay">Auto-pay: ${S.divAuto ? 'on' : 'off'}</button></div></div>
      <div class="grid2">
        <div class="card"><div class="sub" style="margin:0">Tons invested</div><div class="mid" style="font-size:26px">${tk}${num(spent)}</div></div>
        <div class="card"><div class="sub" style="margin:0">Gems earned</div><div class="mid" style="font-size:26px">${gm} ${gemN(earnedG)}</div></div>
      </div>
      ${S.actives.filter(a => deedOf(a.deedId).kind === 'invest').map(a => { const d = deedOf(a.deedId); return `<div class="card run"><div class="rhead"><div class="sub"><span class="pulse"></span>Investing in <b>${esc(d.name)}</b></div><button class="pbtn" data-stop="${a.id}">Stop</button></div>${stageHTML(a)}</div>`; }).join('')}
      <div class="sechead"><b>Your investments</b><button class="link" data-act="addinvest">+ Add</button></div>
      <div class="card txl">${st.length ? st.map(x => `
        <div class="tx hold" data-hold="${x.d.id}" role="button" tabindex="0"><span class="txi" style="background:${x.d.color};border-color:transparent;color:#16210F;font-weight:800">${esc(x.d.name.trim().charAt(0).toUpperCase())}</span>
          <span class="txm"><b>${esc(x.d.name)}</b><span class="sub">${nf(Math.round(x.hours * 10) / 10)}h · skill ${x.skill.toFixed(1)}h · −${nf2(x.d.rate)} Tons/min</span></span>
          <span class="holdr"><b>${gm} ${gemRate(x.gemsDay)}<small>/day</small></b>${roiChip(x)}</span>
          <button class="play" data-start="${x.d.id}" aria-label="Invest now" ${(S.actives.length >= MAX_ACTIVE || isActive(x.d.id) || gated()) ? 'disabled' : ''}>${isActive(x.d.id) ? '●' : '▶'}</button></div>`).join('') : '<div class="empty">No investments yet.<br>Tap + to add one, like “Learn to code”.</div>'}</div>
      <div class="sechead"><b>What if…?</b></div>
      <div class="card">
        <div class="sub">Ask what something would cost, or how your Health is doing.</div>
        <div class="chat" id="chat">${S.chat.slice(-4).map(c => `<div class="bub ${c.from}">${esc(c.text)}</div>`).join('')}</div>
        <div>${chips.map(c => `<button class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <form class="askbar" id="askform" style="position:static"><input class="field" id="q" autocomplete="off" placeholder="e.g. 3h learn to code"><button aria-label="Send">↑</button></form>
      </div>`;
  }

  function viewGoals() {
    const have = gems(), inc = S.deeds.filter(d => d.kind === 'invest').reduce((a, d) => a + gemsPerDay(d), 0);
    const saving = S.goals.filter(g => g.pin), shop = S.goals.filter(g => !g.pin);
    const savingCard = (g, i) => {
      const pct = Math.min(100, (have / g.target) * 100), cls = ['peach', 'mint', 'sky'][i % 3], need = g.target - have, can = need <= 0;
      return `<div class="card ${cls}">
        ${IMG_OK(g.img) ? `<div class="cover"><img src="${g.img}" alt=""></div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><button class="gname mid" data-edit-goal="${g.id}" aria-label="Edit ${esc(g.name)}">${esc(g.name)}</button><button class="x edit" data-edit-goal="${g.id}" aria-label="Edit ${esc(g.name)}">✎</button></div>
        <div class="big">${gm} ${gemN(Math.min(have, g.target))}</div>
        <div class="sub">of ${gm} ${gemN(g.target)} · ${can ? 'You can afford it 🎉' : `${gemN(need)} gem${need === 1 ? '' : 's'} to go${inc > 0.05 ? ` ≈ ${Math.max(1, Math.ceil(need / inc))} day${Math.ceil(need / inc) <= 1 ? '' : 's'} at your pace` : ' — invest to earn gems'}`}</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <button class="btn" data-buy="${g.id}" ${can ? '' : 'disabled'}>${can ? `Buy it · ${gm} ${gemN(g.target)}` : 'Keep investing'}</button></div>`;
    };
    const cats = [...SHOP_CATS, ...new Set(shop.map(g => g.cat).filter(c => c && !SHOP_CATS.includes(c)))].filter(c => shop.some(g => (g.cat || 'Other') === c));
    const row = g => { const can = have >= g.target; return `<div class="row">${IMG_OK(g.img) ? `<img class="thumb" src="${g.img}" alt="">` : ''}<div class="t"><b>${esc(g.name)}</b><span>${gm} ${gemN(g.target)}${can ? '' : ` · ${gemN(g.target - have)} more`}</span></div>
      <button class="pbtn" data-buy="${g.id}" ${can ? '' : 'disabled style="opacity:.4"'}>Buy</button><button class="x edit" data-edit-goal="${g.id}" aria-label="Edit ${esc(g.name)}">✎</button></div>`; };
    return `
      ${head('Shop', '<button class="icon-btn" data-act="addgoal" aria-label="Add shop item">+</button>')}
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div class="sub" style="margin:0">Your gems</div><span class="gv">${gm}<b>${gemN(have)}</b></span></div>${gemsPending() >= 1 ? `<button class="pbtn" data-act="collect">Collect +${gemN(gemsPending())}</button>` : ''}</div>
      <button class="btn lime" data-act="spendany" style="border:1.5px solid var(--ink);margin-bottom:6px">Treat myself — spend on anything</button>
      ${saving.length ? `<h2>Saving up for</h2>${saving.map(savingCard).join('')}` : ''}
      ${cats.map(c => `<div class="glbl" style="margin:16px 2px 8px">${esc(c)}</div><div class="card" style="padding:4px 14px">${shop.filter(g => (g.cat || 'Other') === c).map(row).join('')}</div>`).join('')}
      ${!saving.length && !shop.length ? '<div class="card"><div class="empty">The shop is empty.<br>Tap + to add something you would like to buy with gems.</div></div>' : ''}
      ${S.bought.length ? `<h2>Bought</h2><div class="card">${S.bought.slice(0, 20).map(b => `
        ${(() => { const n = S.notes.find(x => x.refId === b.id); return `<div class="row"><div class="t"><b>${esc(b.name)}</b><span>${b.cat ? esc(b.cat) + ' · ' : ''}${new Date(b.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${n && n.rating ? ' · ' + stars(n.rating) : ''}</span>${n && n.text ? `<div class="jtext" style="font-style:italic;color:var(--muted);font-size:13px">“${esc(n.text)}”</div>` : ''}</div>
        <div class="r"><b>${b.cur === 'gem' ? gm : tk}−${num(b.cost)}</b></div>${n ? `<button class="x edit" data-edit-note="${n.id}" aria-label="Edit note">✎</button>` : `<button class="chip" style="margin:0" data-add-reward-note="${b.id}">+ note</button>`}</div>`; })()}`).join('')}</div>` : ''}`;
  }

  // ---------- History ----------
  let histRange = 7, histMore = false;
  const CAT = { care: 'Looking after yourself', div: 'Dividends', other: 'Other income', invest: 'Investing', useless: 'Useless time', reward: 'Rewards bought', otherOut: 'Other' };
  const catOf = e => {
    if (e.div) return 'div';
    if (String(e.deedId).startsWith('reward:')) return 'reward';
    const d = deedOf(e.deedId);
    if (e.ticks > 0) return d.kind === 'care' ? 'care' : 'other';
    return d.kind === 'invest' ? 'invest' : d.kind === 'useless' ? 'useless' : 'otherOut';
  };
  const dayLabel = (off, d0) => off === 0 ? 'Today' : off === 1 ? 'Yesterday' : new Date(d0).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  function careStreak() {
    const careIds = new Set(S.deeds.filter(d => d.kind === 'care').map(d => d.id)), days = new Set();
    S.entries.forEach(e => { if (careIds.has(e.deedId) && e.ticks > 0) days.add(new Date(e.ts).setHours(0, 0, 0, 0)); });
    let n = 0;
    for (let off = 0; off < 400; off++) { const has = days.has(dayStart(off)); if (has) n++; else if (off > 0) break; }
    return n;
  }
  function viewHistory() {
    const offs = Array.from({ length: histRange }, (_, i) => histRange - 1 - i).filter(off => dayStart(off) + 86400000 > S.created);
    const rows = offs.map(off => ({ off, d0: dayStart(off), ...dayEarnSpend(off) }));
    const n = Math.max(1, rows.length), from = dayStart(histRange - 1);
    const earned = rows.reduce((a, r) => a + r.earned, 0), spent = rows.reduce((a, r) => a + r.spent, 0), net = earned - spent;
    // where Tons came from / went
    const tin = {}, tout = {};
    S.entries.forEach(e => { if (e.ts < from || !e.ticks || isAdjust(e)) return; const c = catOf(e); const m = e.ticks > 0 ? tin : tout; m[c] = (m[c] || 0) + Math.abs(e.ticks); });
    S.actives.forEach(a => { const t = activeTicksOf(a, from, Infinity), d = deedOf(a.deedId), c = d.kind === 'care' ? 'care' : d.kind === 'invest' ? 'invest' : 'useless'; if (t > 0) tin[c] = (tin[c] || 0) + t; else if (t < 0) tout[c] = (tout[c] || 0) - t; });
    const catMax = Math.max(1, ...Object.values(tin), ...Object.values(tout));
    const catRows = (m, cls) => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([c, v]) => `
      <div class="crow"><div class="cn"><span>${CAT[c]}</span><b>${cls === 'in' ? '+' : '−'}${t1(v)}</b></div><div class="cb"><i class="${cls}" style="width:${(v / catMax) * 100}%"></i></div></div>`).join('');
    // time by deed
    const tm = {}; offs.forEach(off => { const m = dayByDeed(off); Object.keys(m).forEach(k => { tm[k] = (tm[k] || 0) + m[k]; }); });
    const tmIds = Object.keys(tm).sort((a, b) => tm[b] - tm[a]), tmTot = Math.max(1, sum(tm));
    // chart
    const cmax = Math.max(1, ...rows.flatMap(r => [r.earned, r.spent]));
    const lbl = (r, i) => histRange === 7 ? new Date(r.d0).toLocaleDateString(undefined, { weekday: 'narrow' }) : (i % 5 === 0 || i === rows.length - 1 ? new Date(r.d0).getDate() : '');
    // insights
    const best = rows.length ? rows.reduce((a, r) => (r.earned - r.spent > a.earned - a.spent ? r : a), rows[0]) : null;
    const streak = careStreak();
    const shownDays = [...rows].reverse().slice(0, histMore ? rows.length : 7), shownNotes = S.notes.slice(0, histMore ? 40 : 4);
    return `
      ${head('History')}
      <div class="pills">${[7, 30].map(r => `<button class="pill ${histRange === r ? 'on' : ''}" data-range="${r}">${r} days</button>`).join('')}</div>
      <div class="card hero">
        <div class="lbl">Net Tons · last ${histRange} days</div>
        <div class="big">${tk}${net < 0 ? '−' : net > 0 ? '+' : ''}${t1(net)}</div>
        <div class="sub">+${t1(earned)} earned · −${t1(spent)} spent</div>
      </div>
      <div class="grid2">
        <div class="card"><div class="mid">${streak}<small> day${streak === 1 ? '' : 's'}</small></div><div class="sub">Care streak 🔥</div></div>
        <div class="card"><div class="mid">${best && rows.length > 1 ? (best.earned - best.spent >= 0 ? '+' : '−') + t1(best.earned - best.spent) : '—'}</div><div class="sub">${best && rows.length > 1 ? 'Best day · ' + dayLabel(best.off, best.d0) : 'Best day'}</div></div>
        <div class="card"><div class="mid">${tk}${t1(earned / n)}</div><div class="sub">Avg earned / day</div></div>
        <div class="card"><div class="mid">${tk}${t1(spent / n)}</div><div class="sub">Avg spent / day</div></div>
      </div>
      <div class="card"><b>Earned vs spent</b>
        <div class="dchart ${histRange === 30 ? 'tight' : ''}">${rows.map((r, i) => `<div class="dcol"><div class="up"><i style="height:${(r.earned / cmax) * 100}%" title="+${t1(r.earned)}"></i></div><div class="dn"><i style="height:${(r.spent / cmax) * 100}%" title="−${t1(r.spent)}"></i></div><small>${lbl(r, i)}</small></div>`).join('')}</div>
        <div class="sub" style="margin-top:8px"><span class="lg up"></span>Earned <span class="lg dn" style="margin-left:12px"></span>Spent</div></div>
      <h2>Where your Tons went</h2>
      <div class="card">${Object.keys(tin).length || Object.keys(tout).length ? `
        ${Object.keys(tin).length ? `<div class="glbl" style="margin-top:0">Came in</div>${catRows(tin, 'in')}` : ''}
        ${Object.keys(tout).length ? `<div class="glbl">Went out</div>${catRows(tout, 'out')}` : ''}` : '<div class="empty">Nothing yet. Once you earn or spend Tons, the breakdown shows up here.</div>'}</div>
      <h2>Where your time went</h2>
      <div class="card">${tmIds.length ? `<div class="segbar">${tmIds.map(id => `<i style="width:${(tm[id] / tmTot) * 100}%;background:${deedOf(id).color}"></i>`).join('')}</div>` + tmIds.map(id => `
        <div class="row"><i class="dot" style="background:${deedOf(id).color}"></i><div class="t"><b>${esc(deedOf(id).name)}</b></div><div class="r"><b>${dur(tm[id])}</b><span>${Math.round((tm[id] / tmTot) * 100)}% of tracked</span></div></div>`).join('') : '<div class="empty">No tracked time yet.</div>'}</div>
      <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:22px 0 10px">Journal</h2><button class="chip" style="margin:12px 0 0" data-act="writenote">+ Write a note</button></div>
      <div class="card">${shownNotes.length ? shownNotes.map(noteHTML).join('') : '<div class="empty">No notes yet.<br>After a session, a check-in or a purchase you can write what you got from it — or tap + Write a note.</div>'}</div>
      <h2>Day by day</h2>
      <div class="card">${shownDays.length ? shownDays.map(r => `
        <div class="dayrow"><div class="t" style="flex:1"><b>${dayLabel(r.off, r.d0)}</b><div class="sub">+${t1(r.earned)} earned · −${t1(r.spent)} spent</div></div>
        <div class="r"><b>${tk}${signed(r.earned - r.spent)}</b></div></div>`).join('') : '<div class="empty">Your days will appear here.</div>'}</div>
      ${rows.length > 7 || S.notes.length > 4 ? `<button class="btn lime" data-act="histmore" style="border:1.5px solid var(--ink)">${histMore ? 'Show less' : 'Show more'}</button>` : ''}
      <div class="card"><b>Backup</b><div class="sub">${lastBackup() ? `Last backup: ${ago(lastBackup())}` : 'Keep a copy of your Tons safe — export it, or restore one.'}</div><button class="btn lime" data-act="backup" style="border:1.5px solid var(--ink)">Backup &amp; restore</button></div>`;
  }

  // ---------- render ----------
  function render() {
    renderTabs();
    const v = $('#view'), sc = v.scrollTop;
    v.innerHTML = { wallet: viewWallet, deeds: viewDeeds, invest: viewInvest, goals: viewGoals, history: viewHistory }[tab]();
    v.scrollTop = sc;
  }
  let lastKey = '';
  function tick() {
    const dk = new Date().toDateString();
    if (lastKey && lastKey !== dk) render();
    lastKey = dk;
    const drained = S.actives.find(a => deedOf(a.deedId).kind === 'invest' && gated());
    if (drained) { stopSession(drained.id); flash('Health is too low — investing stopped'); return; }
    const bal = balance(), { earned, spent } = dayEarnSpend(0), debt = bal < -0.004, hs = healthScore();
    const set = (id, h) => { const e = $(id); if (e) e.innerHTML = h; };
    set('#bal', tk + tBig(bal)); set('#gems', gemN(gems()));
    set('#ballbl', debt ? 'In debt · useless time costs +50%' : 'Total balance');
    const hero = $('#balhero'); if (hero) hero.classList.toggle('debt', debt);
    set('#hscore', `${Math.round(hs)}<small>%</small>`); set('#hsub', healthSub()); set('#pillars', pillarsHTML());
    set('#hms', hms(dayRemaining())); set('#tracked', `${dur(trackedToday())} tracked today · 86,400 seconds a day for everyone · expires at midnight`);
    if ($('#divs')) set('#divs', gm + ' ' + gemRate(S.deeds.filter(d => d.kind === 'invest').reduce((a, d) => a + gemsPerDay(d), 0)));
    const bar = $('#bar'); if (bar) bar.style.width = ((DAY - dayRemaining()) / DAY) * 100 + '%';
    let b = Math.max(0, Math.floor(bal));
    ['hundred', 'ten', 'tick'].forEach(k => { const n = Math.floor(b / COINS[k].value); b -= n * COINS[k].value; const e = $(`[data-coin="${k}"]`); if (e) e.textContent = n; });
    if (S.actives.length) { updateStages(); const wh = $('#where'); if (wh) wh.innerHTML = whereHTML(); }
  }
  setInterval(tick, 250);

  // stop one running session (by its id) and bank it
  function stopSession(id, opts = {}) {
    const i = S.actives.findIndex(a => a.id === id); if (i < 0) return;
    const a = S.actives[i], d = deedOf(a.deedId), end = Math.min(Date.now(), a.start + DAY * 1000), secs = (end - a.start) / 1000;
    const isInv = d.kind === 'invest', cost = isInv ? d.rate * secs / 60 : 0, divBefore = isInv ? dividendPerDay(d) : 0;
    const isCare = d.kind === 'care' && d.mode === 'timer', careEarn = isCare ? ticksFor(a, secs) : 0, careBefore = isCare ? hBase(d.pillar) : 0;
    S.actives.splice(i, 1); gone(a.id);                     // the tombstone stops a finished session coming back from another device
    addSpan(a, end);
    if (isCare && d.pts > 0) refill(d.pillar, d.pts * (end - a.start) / 60000);
    save(); if (!opts.noRender) render();
    const popup = isInv && secs >= 10 ? () => investSummary(d, secs, cost, divBefore, dividendPerDay(d)) : isCare && secs >= 10 ? () => careSummary(d, secs, careEarn, careBefore, hBase(d.pillar)) : null;
    if (!opts.silent && popup) { if (opts.defer) sheetQueue.push(popup); else popup(); }
  }
  function stopAll() {
    S.actives.map(a => a.id).forEach(id => stopSession(id, { defer: true, noRender: true }));
    render(); if (sheetQueue.length) sheetQueue.shift()();   // the summaries then open one after another
  }

  // ---------- sheets ----------
  const RATE_USELESS = [1, 2, 3, 4, 5].map(n => `<option value="${n}">${n} Ton${n > 1 ? 's' : ''} / min</option>`).join('');
  const RATE_INVEST = [0.25, 0.5, 1, 2].map(n => `<option value="${n}">${n} Ton${n > 1 ? 's' : ''} / min</option>`).join('');
  const PILLAR_OPTS = Object.entries(PILLARS).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join('');
  function deedSheet(id, presetKind) {
    const ed = id ? S.deeds.find(d => d.id === id) : null;
    let color = ed ? ed.color : PALETTE[S.deeds.length % PALETTE.length];
    openSheet(`<h3>${ed ? 'Edit deed' : 'New deed'}</h3><div class="sub">${ed ? 'Changes apply from now on — past time keeps the Tons it already earned or cost.' : 'Care deeds refill your Health and earn Tons. Investments cost Tons now and pay dividends. Useless deeds just cost.'}</div>
      <label class="l">Name</label><input class="field" id="dn" maxlength="24" placeholder="Reading" value="${ed ? esc(ed.name) : ''}">
      <label class="l">Type</label><select class="field sel" id="dk"><option value="care">Care — refills a Health pillar, earns Tons</option><option value="invest">Investment — costs Tons, pays dividends</option><option value="useless">Useless — costs Tons, no return</option><option value="neutral">Just living — no Tons</option></select>
      <div id="rr"><label class="l" id="rl">Cost</label><select class="field sel" id="dr"></select></div>
      <div id="cc">
        <label class="l">Pillar</label><select class="field sel" id="cp">${PILLAR_OPTS}</select>
        <label class="l">How it works</label><select class="field sel" id="cm"><option value="timer">Timer — takes time (sleep, exercise)</option><option value="tap">Check-in — one tap (meal, brushing teeth)</option></select>
        <label class="l" id="pl1">Tons per second</label><input class="field" id="cpts" type="number" inputmode="decimal" min="0" step="any">
        <div class="sub" style="margin-top:6px;font-size:12px">A deed pays this rate only until its pillar is full, then it stops paying. The “left” number on the deed shows how many Tons that pillar can still pay right now.</div>
      </div>
      <label class="l">Colour</label><div class="swatches" id="sw">${PALETTE.map(c => `<button type="button" class="swatch ${c === color ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
      <button class="btn" id="ok">${ed ? 'Save changes' : 'Add deed'}</button>
      ${ed ? '<button class="link" id="del">Delete this deed</button>' : ''}`, w => {
      $('#dk', w).value = ed ? ed.kind : (presetKind || 'invest');
      const fillRate = () => { const k = $('#dk', w).value; $('#dr', w).innerHTML = k === 'useless' ? RATE_USELESS : RATE_INVEST; $('#rl', w).textContent = k === 'useless' ? 'How useless? (cost per minute)' : 'How expensive? (cost per minute)'; };
      fillRate(); $('#dr', w).value = String(ed && (ed.kind === 'invest' || ed.kind === 'useless') ? ed.rate : ($('#dk', w).value === 'useless' ? 1 : 0.25));
      $('#cp', w).value = ed && ed.pillar ? ed.pillar : 'sleep';
      $('#cm', w).value = ed && ed.mode ? ed.mode : 'timer';
      const defVal = tap => (tap ? '5' : '0.01');                                   // a sensible starting rate for each kind
      $('#cpts', w).value = ed && ed.kind === 'care' ? (ed.mode === 'tap' ? String(nf(careRate(ed))) : fmtSec(careRate(ed) / 60)) : defVal($('#cm', w).value === 'tap');
      const sync = () => {
        const k = $('#dk', w).value, tap = $('#cm', w).value === 'tap';
        $('#rr', w).style.display = k === 'invest' || k === 'useless' ? '' : 'none';
        $('#cc', w).style.display = k === 'care' ? '' : 'none';
        $('#pl1', w).textContent = tap ? 'Tons per check-in' : 'Tons per second';
      };
      sync(); $('#dk', w).onchange = () => { fillRate(); sync(); }; $('#cm', w).onchange = () => { if (!ed) $('#cpts', w).value = defVal($('#cm', w).value === 'tap'); sync(); };
      $('#sw', w).onclick = e => {
        const sw = e.target.closest('.swatch'); if (!sw) return;
        color = sw.dataset.color; w.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === sw));
      };
      $('#ok', w).onclick = () => {
        const name = $('#dn', w).value.trim(); if (!name) { $('#dn', w).focus(); return; }
        const kind = $('#dk', w).value;
        let fields = { name, kind, color };
        if (kind === 'invest' || kind === 'useless') fields = { ...fields, rate: parseFloat($('#dr', w).value), pillar: undefined, mode: undefined, pts: undefined };
        else if (kind === 'care') {
          const tons = parseFloat($('#cpts', w).value), pillar = $('#cp', w).value, mode = $('#cm', w).value;
          if (!(tons > 0)) { $('#cpts', w).focus(); return; }
          const pts = Math.round(((mode === 'tap' ? tons : tons * 60) / PILLARS[pillar].price) * 1e4) / 1e4;   // inside, a pillar works in points; you only ever set Tons
          fields = { ...fields, pillar, mode, pts, rate: 0 };
        } else fields = { ...fields, rate: 0, pillar: undefined, mode: undefined, pts: undefined };
        if (ed) {
          S.actives.filter(a => a.deedId === ed.id).forEach(a => stopSession(a.id, { silent: true, noRender: true }));   // bank any running session at the old settings first
          Object.assign(ed, fields, { mod: Date.now() });
        } else S.deeds.push({ id: uid(), ...fields, mod: Date.now() });
        save(); closeSheet(); render();
      };
      const del = $('#del', w);
      if (del) del.onclick = () => { if (confirm(`Delete “${ed.name}”? Your history keeps its time and Tons.`)) { S.actives.filter(a => a.deedId === ed.id).forEach(a => stopSession(a.id, { silent: true, noRender: true })); S.deeds = S.deeds.filter(x => x.id !== ed.id); gone(ed.id); save(); closeSheet(); render(); } };
      $('#dn', w).focus();
    });
  }
  const loggable = () => S.deeds.filter(d => !(d.kind === 'care' && d.mode === 'tap'));
  const deedOptions = () => loggable().map(d => `<option value="${d.id}">${esc(d.name)} (${rateLbl(d)})</option>`).join('');
  function logPastSheet() {
    if (!loggable().length) return;
    openSheet(`<h3>Log time already spent</h3><div class="sub">You can log up to ${dur(DAY - dayRemaining())} (today so far).</div>
      <label class="l">Deed</label><select class="field sel" id="ld">${deedOptions()}</select>
      <label class="l">Minutes</label><input class="field" id="lm" type="number" inputmode="decimal" min="1" step="1" placeholder="30">
      <div class="sub" id="lv" style="margin-top:10px"></div>
      <button class="btn" id="ok">Log it</button>`, w => {
      const calc = () => {
        const d = deedOf($('#ld', w).value), m = parseFloat($('#lm', w).value);
        if (!(m > 0)) return null;
        const mins = Math.min(m, (DAY - dayRemaining()) / 60);
        let ticks = 0, gain = 0;
        if (d.kind === 'invest') ticks = -d.rate * mins;
        else if (d.kind === 'useless') ticks = -uselessCost(d.rate, mins, ticksSaved());
        else if (d.kind === 'care') { const cap = d.pts > 0 ? Math.max(0, (100 - hBase(d.pillar)) / d.pts) : mins; ticks = careRate(d) * Math.min(mins, cap); gain = d.pts * mins; }
        return { d, mins, ticks, gain };
      };
      const show = () => { const c = calc(); $('#lv').innerHTML = c ? (c.d.kind === 'neutral' ? 'No Tons change' : `${c.ticks >= 0 ? '+' : '−'}${tk}${t1(c.ticks)}`) : ''; };
      $('#lm', w).oninput = show; $('#ld', w).onchange = show;
      $('#ok', w).onclick = () => {
        const c = calc(); if (!c || c.mins <= 0) return;
        const secs = Math.round(c.mins * 60); if (secs <= 0) return;
        if (c.d.kind === 'invest' && gated()) { flash('Health is too low to invest'); return; }
        S.entries.push({ id: uid(), deedId: c.d.id, ts: Date.now(), secs, ticks: c.ticks });
        if (c.gain) refill(c.d.pillar, c.gain);
        save(); closeSheet(); render();
      };
    });
  }
  // a cover picture: downscaled in the browser to a small JPEG so it stays light for storage and sync
  const IMG_OK = x => typeof x === 'string' && x.length < 220000 && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(x);
  function shrinkImage(file, max = 640) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('read'));
      fr.onload = () => {
        const im = new Image();
        im.onerror = () => reject(new Error('decode'));
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(im, 0, 0, w, h);
          let q = 0.75, out = cv.toDataURL('image/jpeg', q);
          while (out.length > 150000 && q > 0.35) { q -= 0.1; out = cv.toDataURL('image/jpeg', q); }
          IMG_OK(out) ? resolve(out) : reject(new Error('big'));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function goalSheet(id) {
    const ed = id ? S.goals.find(g => g.id === id) : null;
    let img = ed && ed.img ? ed.img : '';
    openSheet(`<h3>${ed ? 'Edit item' : 'New shop item'}</h3><div class="sub">Something you can buy with gems.</div>
      <label class="l">Name</label><input class="field" id="gn" maxlength="30" placeholder="Gaming weekend" value="${ed ? esc(ed.name) : ''}">
      <label class="l">Price in gems</label><input class="field" id="gt" type="number" inputmode="numeric" step="1" min="1" placeholder="30" value="${ed ? ed.target : ''}">
      <label class="l">What is it for?</label><select class="field sel" id="gc">${SHOP_CATS.map(c => `<option ${((ed && ed.cat) || 'Fun') === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <label class="l">Cover picture (optional)</label>
      <div id="gimg" class="gimg">${ed && ed.img ? `<img src="${ed.img}" alt="">` : '<span>No picture yet</span>'}</div>
      <div style="display:flex;gap:8px;margin-top:8px"><label class="chip" style="margin:0;cursor:pointer">Choose a picture / screenshot<input type="file" id="gf" accept="image/*" hidden></label><button type="button" class="chip" id="gr" style="margin:0" ${ed && ed.img ? '' : 'hidden'}>Remove</button></div>
      <label class="switch" style="margin-top:12px"><input type="checkbox" id="gp" ${ed ? (ed.pin ? 'checked' : '') : ''}><span>I'm saving up for this (shows progress, removed once bought)</span></label>
      <button class="btn" id="ok">${ed ? 'Save changes' : 'Add to shop'}</button>
      ${ed ? '<button class="link" id="del">Delete this item</button>' : ''}`, w => {
      $('#ok', w).onclick = () => {
        const name = $('#gn', w).value.trim(), t = Math.round(parseFloat($('#gt', w).value)), cat = $('#gc', w).value, pin = $('#gp', w).checked;
        if (!name) { $('#gn', w).focus(); return; } if (!(t > 0)) { $('#gt', w).focus(); return; }
        if (ed) { Object.assign(ed, { name, target: t, cat, pin, mod: Date.now() }); if (img) ed.img = img; else delete ed.img; }
        else S.goals.push({ id: uid(), name, target: t, cat, pin, ...(img ? { img } : {}), created: Date.now(), mod: Date.now() });
        save(); closeSheet(); render();
      };
      const del = $('#del', w);
      if (del) del.onclick = () => { if (confirm(`Delete “${ed.name}”?`)) { S.goals = S.goals.filter(g => g.id !== ed.id); gone(ed.id); save(); closeSheet(); render(); } };
      const box = $('#gimg', w), rm = $('#gr', w);
      const show = () => { box.innerHTML = img ? `<img src="${img}" alt="">` : '<span>No picture yet</span>'; rm.hidden = !img; };
      $('#gf', w).onchange = async e => { const f = e.target.files && e.target.files[0]; if (!f) return; try { img = await shrinkImage(f); show(); } catch { flash("Couldn't use that picture — try a screenshot or JPG/PNG"); } };
      rm.onclick = () => { img = ''; show(); };
      $('#gn', w).focus();
    });
  }

  // ---------- events ----------
  function ask(text) {
    text = text.trim(); if (!text) return;
    S.chat.push({ from: 'me', text }, { from: 'bot', text: answer(text) }); S.chat = S.chat.slice(-40); save(); render();
    const c = $('#chat'); if (c && c.lastElementChild) c.lastElementChild.scrollIntoView({ block: 'nearest' });
    const q = $('#q'); if (q) q.focus({ preventScroll: true });
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) { const h = e.target.closest('[data-hold]'); if (h) holdSheet(h.dataset.hold); return; }
    if (t.disabled) return;
    const d = t.dataset;
    if (d.tab) { tab = d.tab; render(); return; }
    if (d.chip) { ask(d.chip); return; }
    if (d.pick) { pickSheet(d.pick); return; }
    if ((d.tap || d.start) && t.closest('#sheet')) closeSheet();
    if (d.tap) { tapCare(d.tap); return; }
    if (d.start) {
      const dd = deedOf(d.start);
      if (isActive(d.start) || dayRemaining() <= 0) return;
      if (S.actives.length >= MAX_ACTIVE) { flash(`You can do up to ${MAX_ACTIVE} things at once`); return; }
      if (dd.kind === 'invest' && gated()) { flash('Health is too low to invest — refill a pillar first'); return; }
      S.actives.push({ id: uid(), deedId: d.start, start: Date.now(), startVal: dd.kind === 'care' ? hBase(dd.pillar) : 0, startBal: balance() }); save(); render(); return;
    }
    if (d.stop) { stopSession(d.stop); return; }
    if (d.range) { histRange = +d.range; render(); return; }
    if (d.buy) { buyGoal(d.buy, t); return; }
    if (d.editNote) { editNoteSheet(d.editNote); return; }
    if (d.addNote) { freeNoteSheet('invest', { deedId: d.addNote }, deedOf(d.addNote).name); return; }
    if (d.addRewardNote) { const b = S.bought.find(x => x.id === d.addRewardNote); if (b) freeNoteSheet('reward', { refId: b.id }, b.name); return; }
    if (d.editGoal) { goalSheet(d.editGoal); return; }
    if (d.edit) { deedSheet(d.edit); return; }
    switch (d.act) {
      case 'stopall': stopAll(); break;
      case 'histmore': histMore = !histMore; render(); break;
      case 'about': aboutSheet(false); break;
      case 'theme': setTheme(isDark() ? 'light' : 'dark'); render(); break;
      case 'account': accountSheet(); break;
      case 'backup': backupSheet(); break;
      case 'collect': collectDividends(); break;
      case 'autopay': S.divAuto = !S.divAuto; if (S.divAuto) S.gemsCollected = gemsAccrued(); save(); render(); flash(S.divAuto ? 'Auto-pay on — gems go straight to your pocket' : 'Auto-pay off — collect when you want'); break;
      case 'ledger': ledgerSheet(); break;
      case 'writenote': writeNoteSheet(); break;
      case 'adddeed': deedSheet(); break;
      case 'logpast': logPastSheet(); break;
      case 'addgoal': goalSheet(); break;
      case 'spendany': spendAnySheet(); break;
      case 'addinvest': deedSheet(null, 'invest'); break;
    }
  });
  document.addEventListener('submit', e => { if (e.target.id === 'askform') { e.preventDefault(); ask($('#q').value); } });

  // ---------- Cloud sync & accounts (Supabase) ----------
  // Local-first: the app always works offline from localStorage. When signed in, the whole state is mirrored to one
  // row per user (table tick_state). A revision number detects two devices writing at once; conflicts are merged, not overwritten.
  const cfg = window.TICK_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient) {
    try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); } catch { sb = null; }
  }
  // Where confirmation / reset / Google links return to. A page opened as a local file reports its origin as the word "null",
  // which made links point at "null" — so outside http(s) fall back to the published site.
  const isWeb = /^https?:$/.test(location.protocol);
  const returnUrl = () => (isWeb ? location.origin + location.pathname : (cfg.SITE_URL || ''));
  const redirectOpt = key => { const u = returnUrl(); return u ? { [key]: u } : {}; };
  const libMissing = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) && !sb;
  const payload = () => { const d = JSON.parse(JSON.stringify(S)); delete d.sound; return d; };   // sound is a per-device setting
  const isPristine = st => !st.entries.length && !st.notes.length && !st.goals.length && !(st.bought || []).length;
  const friendly = e => {
    const m = String((e && (e.message || e.error_description)) || e || '');
    if (/invalid login/i.test(m)) return 'Wrong email or password.';
    if (/not confirmed/i.test(m)) return 'Please confirm your email first — check your inbox.';
    if (/already registered|already been registered/i.test(m)) return 'That email already has an account — try signing in.';
    if (/password.*(short|least|weak)/i.test(m)) return 'Choose a longer password (at least 8 characters).';
    if (/rate limit|too many/i.test(m)) return 'Too many attempts — wait a minute and try again.';
    if (/failed to fetch|network|load failed/i.test(m)) return 'No connection — your data is safe here and will sync when you are back online.';
    if (e && (e.code === 'PGRST205' || e.code === '42P01' || /tick_state/.test(m) && /not find|does not exist/i.test(m))) return 'The cloud table is missing — run supabase/schema.sql in Supabase.';
    return m || 'Something went wrong.';
  };
  const timeStr = ts => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const syncText = () => !user ? 'Not signed in' : sync.status === 'syncing' ? 'Syncing…' : sync.status === 'error' ? `⚠ ${sync.msg}` : sync.at ? `Synced at ${timeStr(sync.at)}` : 'Waiting to sync';
  function setSync(status, msg) {
    sync = { status, msg: msg || '', at: status === 'idle' ? Date.now() : sync.at };
    document.querySelectorAll('.acct').forEach(b => { b.classList.toggle('on', !!user); b.classList.toggle('syncing', status === 'syncing'); });
    const e = $('#ssub'); if (e) e.textContent = syncText();
  }

  // Merge two states without losing anything: entries / notes / bought are unioned by id, deeds and goals take the newer edit,
  // deletes are remembered as tombstones, dividends are keyed by deed+day (so two devices can't double-pay them).
  function mergeStates(l, c) {
    const legacy = st => (st.active && !Array.isArray(st.actives) ? { ...st, actives: [{ id: 'run-' + st.active.start, ...st.active }] } : st);
    l = legacy(l); c = legacy(c);                                          // a device on the older version still has ONE running session
    const dead = new Set([...(l.tomb || []), ...(c.tomb || [])]);
    const byId = (a, b, pick) => { const m = new Map(); [...(a || []), ...(b || [])].forEach(x => { if (dead.has(x.id)) return; const o = m.get(x.id); m.set(x.id, o ? pick(o, x) : x); }); return [...m.values()]; };
    const newer = k => (a, b) => ((b[k] || 0) > (a[k] || 0) ? b : a);
    const out = { ...c, ...l };
    out.created = Math.min(l.created || Infinity, c.created || Infinity);
    out.onboarded = !!(l.onboarded || c.onboarded);
    out.gift = c.gift !== undefined ? c.gift : l.gift;
    out.tomb = [...dead];
    out.deeds = byId(l.deeds, c.deeds, newer('mod'));
    out.goals = byId(l.goals, c.goals, newer('mod'));
    out.notes = byId(l.notes, c.notes, newer('edited')).sort((a, b) => b.ts - a.ts);
    out.bought = byId(l.bought, c.bought, a => a).sort((a, b) => b.ts - a.ts);
    const ent = new Map();
    [...(l.entries || []), ...(c.entries || [])].forEach(e => {
      if (dead.has(e.id)) return;
      const k = e.div ? `div:${e.deedId}:${new Date(e.ts).toDateString()}` : e.id, o = ent.get(k);
      ent.set(k, !o ? e : (Math.abs(e.ticks) > Math.abs(o.ticks) ? e : o));
    });
    out.entries = [...ent.values()].sort((a, b) => a.ts - b.ts);
    out.health = Object.fromEntries(Object.keys(PILLARS).map(k => { const a = (l.health || {})[k], b = (c.health || {})[k]; return [k, !a ? b : !b ? a : (b.t > a.t ? b : a)]; }));
    out.actives = byId(l.actives, c.actives, a => a).slice(0, MAX_ACTIVE);   // running sessions: unioned by id; a stopped one is in the tombstones
    delete out.active; delete out.lastStopped;
    out.divAt = Math.max(l.divAt || 0, c.divAt || 0) || Date.now();
    out.gemsCollected = Math.max(l.gemsCollected || 0, c.gemsCollected || 0); out.divLegacy = Math.max(l.divLegacy || 0, c.divLegacy || 0);
    if (typeof l.divCollected === 'number' || typeof c.divCollected === 'number') out.divCollected = Math.max(l.divCollected || 0, c.divCollected || 0);   // collecting can only move forward, so two devices never pay twice
    out.sound = l.sound; out.chat = l.chat || c.chat || [];
    return out;
  }
  function adopt(next) { const snd = S.sound; S = Object.assign(defaults(), next); S.sound = snd; migrate(); }

  async function syncNow() {
    if (!sb || !user) return;
    if (syncing) { syncAgain = true; return; }
    syncing = true; setSync('syncing');
    try {
      for (let i = 0; i < 4; i++) {
        const { data: row, error } = await sb.from('tick_state').select('data,rev').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        const foreign = meta.owner && meta.owner !== user.id;
        if (!row) {
          if (foreign) { adopt(defaults()); }                               // another account's data must never be uploaded into this one
          const { error: e2 } = await sb.from('tick_state').insert({ user_id: user.id, data: payload(), rev: 1 });
          if (e2) { if (e2.code === '23505') continue; throw e2; }          // someone inserted first → pull and merge
          meta = { owner: user.id, rev: 1, dirty: false }; save(true); break;
        }
        if (foreign) {
          if (!confirm("This device holds another account's data. Replace it with this account's data?")) { await sb.auth.signOut(); setSync('off'); return; }
          adopt(row.data); meta = { owner: user.id, rev: row.rev, dirty: false }; save(true); render(); break;
        }
        if (row.rev !== meta.rev || meta.owner !== user.id) {               // the cloud has something this device hasn't seen
          const pristine = isPristine(S);
          if (pristine) adopt(row.data); else { const merged = mergeStates(S, row.data); const snd = S.sound; S = merged; S.sound = snd; migrate(); }
          meta = { owner: user.id, rev: row.rev, dirty: !pristine }; save(true); render();
        }
        if (!meta.dirty) break;
        const { data: upd, error: e3 } = await sb.from('tick_state').update({ data: payload(), rev: meta.rev + 1, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('rev', meta.rev).select('rev');
        if (e3) throw e3;
        if (upd && upd.length) { meta.rev = upd[0].rev; meta.dirty = false; break; }   // saved
        // otherwise another device wrote in between → loop: pull, merge, try again
      }
      persistMeta(); setSync('idle');
    } catch (e) { setSync('error', friendly(e)); }
    finally { syncing = false; if (syncAgain) { syncAgain = false; scheduleSync(300); } }
  }
  function scheduleSync(ms) {
    if (!sb || !user) return;
    clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, ms === undefined ? 2500 : ms);
  }

  // ----- account UI -----
  const acctMsg = (w, t, ok) => { const e = $('#amsg', w); if (e) { e.textContent = t; e.style.color = ok ? '' : 'var(--ink)'; e.style.fontWeight = ok ? '' : '700'; } };
  function accountSheet() {
    if (!sb) {
      openSheet(`<h3>Cloud sync</h3><div class="sub">${libMissing ? "The sign-in library couldn't load — check your connection and refresh." : 'Sign-in and sync need a Supabase project. Add its URL and anon key to <b>config.js</b> — the README has the 5-minute setup.'}</div><button class="btn" id="ok">Got it</button>`, w => { $('#ok', w).onclick = closeSheet; });
      return;
    }
    if (user) {
      openSheet(`<h3>Your account</h3><div class="sub">Signed in as <b>${esc(user.email || 'you')}</b>. Your Tons sync to every device you sign in on.</div>
        <div class="card" style="margin:14px 0 0"><b>Cloud sync</b><div class="sub" id="ssub">${esc(syncText())}</div></div>
        <button class="btn" id="sn">Sync now</button>
        <button class="btn ghost" id="so">Sign out</button>
        <button class="link" id="bk">Backup &amp; restore</button>`, w => {
        $('#sn', w).onclick = () => { meta.dirty = true; syncNow(); };
        $('#so', w).onclick = () => signOutSheet();
        $('#bk', w).onclick = () => backupSheet();
      });
      return;
    }
    const signin = acctMode === 'signin';
    openSheet(`<h3>${signin ? 'Welcome back' : 'Sync your Tons'}</h3><div class="sub">Sign in to back up your data and use Tons on any device. The app works without an account too.</div>
      <div class="pills" style="margin:14px 0 0"><button class="pill ${signin ? 'on' : ''}" data-m="signin">Sign in</button><button class="pill ${!signin ? 'on' : ''}" data-m="signup">Create account</button></div>
      <label class="l">Email</label><input class="field" id="em" type="email" autocomplete="email" inputmode="email" placeholder="you@gmail.com">
      <label class="l">Password</label><input class="field" id="pw" type="password" autocomplete="${signin ? 'current-password' : 'new-password'}" placeholder="At least 8 characters">
      ${isWeb ? '' : `<div class="sub" style="margin-top:10px">You are on a local copy of Tons. Email and Google links will open the live site (${esc((cfg.SITE_URL || '').replace(/^https?:\/\//, ''))}) — sign in there, and your Tons sync across.</div>`}
      <div class="sub" id="amsg" style="min-height:20px;margin-top:10px"></div>
      <button class="btn" id="go" style="margin-top:6px">${signin ? 'Sign in' : 'Create account'}</button>
      <button class="btn lime" id="gg" style="border:1.5px solid var(--ink)">Continue with Google</button>
      ${signin ? '<button class="link" id="fp">Forgot your password?</button>' : ''}
      <button class="link" id="bk">Backup &amp; restore</button>`, w => {
      w.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => { acctMode = b.dataset.m; accountSheet(); }; });
      const creds = () => ({ email: $('#em', w).value.trim(), password: $('#pw', w).value });
      const busy = on => { const g = $('#go', w); if (g) { g.disabled = on; g.style.opacity = on ? .6 : 1; } };   // the sheet may already be closed after a successful sign-in
      const submit = async () => {
        const { email, password } = creds();
        if (!/^\S+@\S+\.\S+$/.test(email)) { acctMsg(w, 'Enter a valid email address.'); return; }
        if (password.length < 8) { acctMsg(w, 'Use a password of at least 8 characters.'); return; }
        busy(true); acctMsg(w, signin ? 'Signing in…' : 'Creating your account…', true);
        try {
          if (signin) { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; closeSheet(); flash('Signed in'); }
          else {
            const { data, error } = await sb.auth.signUp({ email, password, options: redirectOpt('emailRedirectTo') });
            if (error) throw error;
            if (data && data.session) { closeSheet(); flash('Account created'); }
            else if (data && data.user && Array.isArray(data.user.identities) && !data.user.identities.length) acctMsg(w, 'That email already has an account — try signing in.');
            else acctMsg(w, '✓ Check your inbox and click the confirmation link, then sign in.', true);
          }
        } catch (e) { acctMsg(w, friendly(e)); }
        busy(false);
      };
      $('#go', w).onclick = submit;
      $('#pw', w).onkeydown = e => { if (e.key === 'Enter') submit(); };
      $('#gg', w).onclick = async () => {
        try { const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: redirectOpt('redirectTo') }); if (error) throw error; }
        catch (e) { acctMsg(w, /provider.*not enabled|unsupported provider/i.test(String(e && e.message)) ? 'Google sign-in is not switched on in Supabase yet.' : friendly(e)); }
      };
      $('#bk', w).onclick = () => backupSheet();
      const fp = $('#fp', w);
      if (fp) fp.onclick = async () => {
        const email = $('#em', w).value.trim(); if (!/^\S+@\S+\.\S+$/.test(email)) { acctMsg(w, 'Type your email above first, then tap “Forgot your password?”.'); return; }
        try { const { error } = await sb.auth.resetPasswordForEmail(email, redirectOpt('redirectTo')); if (error) throw error; acctMsg(w, '✓ If that email has an account, a reset link is on its way.', true); }
        catch (e) { acctMsg(w, friendly(e)); }
      };
      $('#em', w).focus({ preventScroll: true });
    });
  }
  function signOutSheet() {
    openSheet(`<h3>Sign out</h3><div class="sub">Your data stays safe in your account. What should happen to the copy on this device?</div>
      <button class="btn" id="keep">Sign out — keep data on this device</button>
      <button class="btn ghost" id="wipe">Sign out and clear this device</button>
      <button class="link" id="back">Cancel</button>`, w => {
      const out = async clear => {
        if (meta.dirty && user) await syncNow();                 // push anything unsynced before leaving
        await sb.auth.signOut(); user = null;
        if (clear) { S = defaults(); meta = {}; persistMeta(); save(true); }
        setSync('off'); closeSheet(); render(); flash('Signed out');
      };
      $('#keep', w).onclick = () => out(false);
      $('#wipe', w).onclick = () => { if (confirm('Clear all Tons data from this device? It stays in your account.')) out(true); };
      $('#back', w).onclick = closeSheet;
    });
  }
  function recoverySheet() {
    openSheet(`<h3>Choose a new password</h3><div class="sub">You followed a reset link. Set a new password for your account.</div>
      <label class="l">New password</label><input class="field" id="np" type="password" autocomplete="new-password" placeholder="At least 8 characters">
      <div class="sub" id="amsg" style="min-height:20px;margin-top:10px"></div>
      <button class="btn" id="go">Save password</button>`, w => {
      $('#go', w).onclick = async () => {
        const p = $('#np', w).value; if (p.length < 8) { acctMsg(w, 'Use a password of at least 8 characters.'); return; }
        const { error } = await sb.auth.updateUser({ password: p });
        if (error) acctMsg(w, friendly(error)); else { closeSheet(); flash('Password updated'); }
      };
    });
  }
  function startCloud() {
    if (!sb) return;
    sb.auth.onAuthStateChange((evt, session) => {
      user = session ? session.user : null;
      setTimeout(() => {                                          // never call Supabase from inside this callback
        if (evt === 'PASSWORD_RECOVERY') recoverySheet();
        if (user) { meta.dirty = meta.dirty || false; syncNow(); } else setSync('off');
        render();
      }, 0);
    });
    sb.auth.getSession().then(({ data }) => { if (data && data.session && !user) { user = data.session.user; syncNow(); render(); } });
    setInterval(() => { if (user && document.visibilityState === 'visible') syncNow(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (user && document.visibilityState === 'visible') syncNow(); });
    window.addEventListener('online', () => { if (user) syncNow(); });
  }

  // ---------- boot ----------
  $('#logo').innerHTML = markSVG(52) + '<span>tons</span>';
  $('#logo').style.cssText = 'font-size:44px;gap:10px';
  settleDividends(); setInterval(settleDividends, 60000);
  startCloud();
  render(); tick();
  setTimeout(() => { $('#splash').classList.add('hide'); if (!S.onboarded) aboutSheet(true); }, 900);
})();
