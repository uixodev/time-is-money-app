/* Tick — the running-session timer ("Big number").
 *
 *   TickTimers.render(ctx)        -> HTML string (call once when the session screen is drawn)
 *   TickTimers.update(ctx, root)  -> updates that HTML in place (call ~4×/second; never rebuilds, so the animations keep running)
 *
 * ctx = { kind: 'care'|'invest'|'useless'|'neutral', elapsed (seconds), ticks (signed, this session),
 *         pillar: { name, pct } | null, signHTML (the Ŧ. sign as an <svg class="tk">), reduced (bool) }
 */
(function () {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const clockStr = s => { s = Math.max(0, Math.floor(s)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
  const signChar = t => (t >= 0.005 ? '+' : t <= -0.005 ? '−' : '');
  const num2 = t => Math.abs(t).toFixed(2);
  const q = (root, sel) => root.querySelector(sel);
  const subText = ctx => (ctx.kind === 'neutral' ? 'time only' : 'Ticks this session') + (ctx.pillar ? ` · ${ctx.pillar.name} ${Math.round(ctx.pillar.pct)}%` : '');
  const SIGN = '<svg class="tk" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 14H50M32 14V52M21 31H43"/><circle cx="50" cy="48" r="3.6" fill="currentColor" stroke="none"/></svg>';

  function render(ctx) {
    const digits = clockStr(ctx.elapsed).split('').map(ch => (ch === ':' ? '<span class="sep">:</span>' : `<span class="dg">${ch}</span>`)).join('');
    return `<div class="tt tA k-${ctx.kind}">
      <div class="tA-glow"></div>
      <div class="tA-clock t-clock" role="timer" aria-label="Elapsed time">${digits}</div>
      <div class="tA-min"><i style="animation-delay:-${(ctx.elapsed % 60).toFixed(2)}s"></i></div>
      <div class="tA-ticks"><span class="t-sign"></span>${ctx.signHTML || SIGN}<span class="t-num"></span></div>
      <div class="tA-sub t-sub"></div></div>`;
  }
  function update(ctx, root) {
    const dg = root.querySelectorAll('.dg'); let k = 0;
    for (const ch of clockStr(ctx.elapsed)) {
      if (ch === ':') continue;
      const e = dg[k++];
      if (e.textContent !== ch) { e.textContent = ch; if (!ctx.reduced) { e.classList.remove('roll'); void e.offsetWidth; e.classList.add('roll'); } }   // digits roll in as they change
    }
    q(root, '.t-sign').textContent = signChar(ctx.ticks); q(root, '.t-num').textContent = num2(ctx.ticks); q(root, '.t-sub').textContent = subText(ctx);
  }

  window.TickTimers = { signHTML: SIGN, render, update };
})();
