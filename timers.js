/* Tick — timer looks. Three designs for the running-session display, shared by the app and timer-options.html.
 *
 *   TickTimers.render(style, ctx)        -> HTML string (call once when the session screen is drawn)
 *   TickTimers.update(style, ctx, root)  -> updates that HTML in place (call ~4×/second; never rebuilds, so animations keep running)
 *
 * ctx = { kind: 'care'|'invest'|'useless'|'neutral', elapsed (seconds), ticks (signed, this session), rate (label, e.g. '+1.2/min'),
 *         pillar: { name, pct } | null, signHTML (the Ŧ. sign as an <svg class="tk">), reduced (bool) }
 */
(function () {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const clockStr = s => { s = Math.max(0, Math.floor(s)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
  const signChar = t => (t >= 0.005 ? '+' : t <= -0.005 ? '−' : '');
  const num2 = t => Math.abs(t).toFixed(2);
  const delay = el => `animation-delay:-${(el % 60).toFixed(2)}s`;
  const q = (root, sel) => root.querySelector(sel);
  const subText = ctx => (ctx.kind === 'neutral' ? 'time only' : 'Ticks this session') + (ctx.pillar ? ` · ${ctx.pillar.name} ${Math.round(ctx.pillar.pct)}%` : '');
  const SIGN = '<svg class="tk" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 14H50M32 14V52M21 31H43"/><circle cx="50" cy="48" r="3.6" fill="currentColor" stroke="none"/></svg>';
  const sign = ctx => ctx.signHTML || SIGN;

  // shared bits every look updates
  function common(ctx, root) {
    const c = q(root, '.t-clock'); if (c && !c.querySelector('.dg')) c.textContent = clockStr(ctx.elapsed);
    q(root, '.t-sign').textContent = signChar(ctx.ticks); q(root, '.t-num').textContent = num2(ctx.ticks); q(root, '.t-sub').textContent = subText(ctx);
  }

  // ───────────── A · Big number ─────────────
  function renderNumber(ctx) {
    const digits = clockStr(ctx.elapsed).split('').map(ch => (ch === ':' ? '<span class="sep">:</span>' : `<span class="dg">${ch}</span>`)).join('');
    return `<div class="tt tA k-${ctx.kind}" data-style="number">
      <div class="tA-glow"></div>
      <div class="tA-clock t-clock" role="timer" aria-label="Elapsed time">${digits}</div>
      <div class="tA-min"><i style="${delay(ctx.elapsed)}"></i></div>
      <div class="tA-ticks"><span class="t-sign"></span>${sign(ctx)}<span class="t-num"></span></div>
      <div class="tA-sub t-sub"></div></div>`;
  }
  function updateNumber(ctx, root) {
    const dg = root.querySelectorAll('.dg'); let k = 0;
    for (const ch of clockStr(ctx.elapsed)) {
      if (ch === ':') continue;
      const e = dg[k++];
      if (e.textContent !== ch) { e.textContent = ch; if (!ctx.reduced) { e.classList.remove('roll'); void e.offsetWidth; e.classList.add('roll'); } }   // digits roll in as they change
    }
    common(ctx, root);
  }

  // ───────────── B · Coin stack ─────────────
  const COIN = { care: ['#C9F26B', '#8FBF2F'], invest: ['#6FBF3B', '#2F6B2A'], useless: ['#B7C4A5', '#6B7560'], neutral: ['#E4F5B0', '#A9C79B'] };
  const coinCount = t => Math.min(14, Math.floor(Math.abs(t)));          // one coin per whole Tick, up to 14
  function coinG(i, kind, drop) {
    const [face, side] = COIN[kind] || COIN.care, y = 124 - i * 9;
    return `<g class="cn${drop ? ' drop' : ''}" transform="translate(120 ${y})"><g class="cn-in">
      <ellipse cx="0" cy="8" rx="38" ry="11" fill="${side}" stroke="var(--ink)" stroke-width="2"/>
      <rect x="-38" y="0" width="76" height="8" fill="${side}"/><line x1="-38" y1="0" x2="-38" y2="8" stroke="var(--ink)" stroke-width="2"/><line x1="38" y1="0" x2="38" y2="8" stroke="var(--ink)" stroke-width="2"/>
      <ellipse cx="0" cy="0" rx="38" ry="11" fill="${face}" stroke="var(--ink)" stroke-width="2"/>
      <ellipse cx="0" cy="0" rx="24" ry="6.5" fill="none" stroke="var(--ink)" stroke-width="1.6" opacity=".5"/></g></g>`;
  }
  function renderCoins(ctx) {
    const n = coinCount(ctx.ticks);
    return `<div class="tt tB k-${ctx.kind}" data-style="coins">
      <div class="tB-top"><div class="tB-clock t-clock">${clockStr(ctx.elapsed)}</div><div class="tB-ticks"><span class="t-sign"></span>${sign(ctx)}<span class="t-num"></span></div></div>
      <svg viewBox="0 0 240 150" class="tB-scene" aria-hidden="true"><ellipse cx="120" cy="138" rx="64" ry="9" fill="var(--ink)" opacity=".12"/><g class="stack">${Array.from({ length: n }, (_, i) => coinG(i, ctx.kind, false)).join('')}</g></svg>
      <div class="tB-sub t-sub"></div></div>`;
  }
  function updateCoins(ctx, root) {
    common(ctx, root); q(root, '.t-clock').textContent = clockStr(ctx.elapsed);
    const st = q(root, '.stack'), n = coinCount(ctx.ticks);
    for (let i = st.children.length; i < n; i++) st.insertAdjacentHTML('beforeend', coinG(i, ctx.kind, !ctx.reduced));   // a new coin drops onto the pile
  }

  // ───────────── C · Seconds grid ─────────────
  function renderGrid(ctx) {
    const dots = Array.from({ length: 60 }, (_, i) => `<circle class="gd" style="--i:${i}" cx="${11 + (i % 10) * 22}" cy="${11 + Math.floor(i / 10) * 22}" r="6"/>`).join('');
    return `<div class="tt tC k-${ctx.kind}" data-style="grid">
      <div class="tC-clock t-clock">${clockStr(ctx.elapsed)}</div>
      <div class="tC-ticks"><span class="t-sign"></span>${sign(ctx)}<span class="t-num"></span></div>
      <svg viewBox="0 0 220 132" class="tC-grid" aria-hidden="true">${dots}</svg>
      <div class="tC-beads" aria-hidden="true">${'<i></i>'.repeat(60)}</div>
      <div class="tC-sub t-sub"></div></div>`;
  }
  function updateGrid(ctx, root) {
    common(ctx, root); q(root, '.t-clock').textContent = clockStr(ctx.elapsed);
    const sec = Math.floor(ctx.elapsed) % 60, mins = Math.floor(ctx.elapsed / 60), inHour = mins % 60;
    root.querySelectorAll('.gd').forEach((d, i) => { d.classList.toggle('on', i < sec); d.classList.toggle('now', i === sec); });   // one dot per second
    root.querySelectorAll('.tC-beads i').forEach((b, i) => b.classList.toggle('on', i < inHour));                                       // one bead per finished minute
    const st = root._st || (root._st = {});
    if (st.min !== undefined && st.min !== mins && !ctx.reduced) {                                                                       // ripple across the grid every minute
      const g = q(root, '.tC-grid'); g.classList.remove('ripple'); void g.getBoundingClientRect(); g.classList.add('ripple'); setTimeout(() => g.classList.remove('ripple'), 1800);
    }
    st.min = mins;
  }

  // ───────────── D · Ticks first ─────────────
  function renderTicks(ctx) {
    return `<div class="tt tD k-${ctx.kind}" data-style="ticks">
      <div class="tD-glow"></div>
      <div class="tD-num" role="timer" aria-label="Ticks this session"><span class="t-sign tD-sign"></span>${sign(ctx)}<span class="tD-digits"></span></div>
      <div class="tD-rate t-rate"></div>
      <div class="tD-time"><span class="t-clock">${clockStr(ctx.elapsed)}</span><span class="tD-min"><i style="${delay(ctx.elapsed)}"></i></span></div>
      <div class="tD-sub t-sub"></div></div>`;
  }
  function updateTicks(ctx, root) {
    q(root, '.t-sign').textContent = signChar(ctx.ticks);
    q(root, '.t-clock').textContent = clockStr(ctx.elapsed);
    q(root, '.t-rate').textContent = ctx.kind === 'neutral' ? 'no Ticks change' : (ctx.rate || '') + (ctx.rate ? ' · ' : '') + 'Ticks this session';
    q(root, '.t-sub').textContent = ctx.pillar ? `${ctx.pillar.name} ${Math.round(ctx.pillar.pct)}%` : '';
    const s = num2(ctx.ticks), box = q(root, '.tD-digits'); let spans = box.children;
    root.classList.toggle('long', s.length > 5);
    if (spans.length !== s.length) {                                                                   // the number grew a digit: rebuild
      box.innerHTML = [...s].map(ch => (ch === '.' ? '<span class="pt">.</span>' : `<span class="dg">${ch}</span>`)).join(''); return;
    }
    [...s].forEach((ch, i) => {                                                                        // otherwise only the digits that changed roll in
      const e = spans[i];
      if (e.textContent !== ch) { e.textContent = ch; if (!ctx.reduced && ch !== '.') { e.classList.remove('roll'); void e.offsetWidth; e.classList.add('roll'); } }
    });
  }

  const R = { ticks: renderTicks, number: renderNumber, coins: renderCoins, grid: renderGrid }, U = { ticks: updateTicks, number: updateNumber, coins: updateCoins, grid: updateGrid };
  window.TickTimers = {
    STYLES: [
      { id: 'ticks', name: 'Ticks first', blurb: 'The Ticks you are earning or spending — huge, rolling live. Time is small.' },
      { id: 'number', name: 'Big number', blurb: 'Huge digits, a calm glow and a thin line that fills every minute.' },
      { id: 'coins', name: 'Coin stack', blurb: 'A coin drops onto the pile for every Tick you earn or spend.' },
      { id: 'grid', name: 'Seconds grid', blurb: '60 dots light up second by second; each finished minute adds a bead.' },
    ],
    signHTML: SIGN,
    render: (style, ctx) => (R[style] || R.ticks)(ctx),
    update: (style, ctx, root) => { if (root) (U[style] || U.ticks)(ctx, root); },
  };
})();
