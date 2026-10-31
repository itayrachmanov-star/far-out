/* Far Out — arcade modes, one question at a time:
   Meteor Shower (60 s, name as many as you can), Spectrum (fill all five rarity slots, 90 s)
   and Duel (beat Vega's answer; first to 3 rounds). */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx, h = UI.h, $ = UI.$;
  const NAMES = { shower: 'Meteor Shower', spectrum: 'Spectrum', duel: 'Duel' };
  const SHOWER_T = 60, SPECTRUM_T = 90, DUEL_T = 25, HYPER_T = 10;
  const DUEL_TIERS = { easy: { 5: 5, 4: 4, 3: 1 }, normal: { 4: 3, 3: 4, 2: 2 }, hard: { 3: 2, 2: 4, 1: 2 } };
  let A = null, tick = 0, hyperTick = 0, cancelCount = null;

  const body = () => $('#arcade-body');
  const mount = (...n) => { body().replaceChildren(...n.filter(Boolean)); window.scrollTo(0, 0); };
  const score = (n, unit) => { const el = $('#arc-score'); if (n > +el.dataset.v) { Fx.countUp(el, +el.dataset.v || 0, n, 400); Fx.pop(el.parentElement); } else { el.countId = (el.countId || 0) + 1; el.textContent = n.toLocaleString(); } el.dataset.v = n; if (unit) $('#arc-unit').textContent = unit; };
  const stop = () => { clearInterval(tick); clearInterval(hyperTick); tick = hyperTick = 0; if (cancelCount) cancelCount(); cancelCount = null; };

  /** A question whose answer list passes ok(p); curated questions most of the time. */
  function question(ok) {
    const next = FO.sampler({ theme: A.theme });
    for (let i = 0; i < 300; i++) {
      const l = next(A.rng);
      if (!l || (i < 200 && A.recent.has(l.id))) continue;
      const p = FO.buildPrompt({ c: l.id, t: 'any' });
      if (ok(p)) { A.recent.add(l.id); return p; }
    }
    return FO.buildPrompt({ c: FO.qs[0].id, t: 'any' });
  }
  const tiersIn = (p) => { const n = [0, 0, 0, 0, 0, 0]; p.pool.forEach((it) => n[FO.effOf(p, it)]++); return n; };

  const card = (p, sub) => h('article', { class: 'prompt enter' }, h('p', { class: 'p-cat' }, sub || p.cat.name), h('h2', { class: 'p-ask' }, p.ask));
  const record = (j, p) => {
    if (FO.Collection) FO.Collection.add(j.item, j.tier, p);
    FO.Progress.event('answer', { pts: j.pts, tier: j.tier.c, fuzzy: j.fuzzy, theme: p.cat.theme });
  };
  /** Shared typed-answer handling. Calls onOk(j) for a valid answer; shows did-you-mean and misses itself. */
  function judgeInto(p, text, used, msg, form, onOk) {
    if (A.paused) return; // the 3-2-1 countdown is still running
    const j = FO.judge(p, text, used);
    if (j.why === 'empty') return;
    if (j.why === 'maybe') { msg.replaceChildren(UI.didYouMean(j.options, (it) => judgeInto(p, it.name, used, msg, form, onOk))); Fx.sfx.flip(); return; }
    if (!j.ok) { msg.replaceChildren(h('span', { class: 'miss-line' }, UI.missText(p, j))); Fx.shake(form); Fx.sfx.bad(); Fx.buzz('bad'); form.querySelector('input').select(); return; }
    msg.replaceChildren(j.fuzzy ? h('span', { class: 'fix-note' }, UI.fixLine(j.typed, j.item.name), ' Typo fixed.') : '');
    form.querySelector('input').value = '';
    onOk(j);
  }
  /** Run a countdown clock; onEnd when it hits zero. */
  function clock(t, total, onEnd) {
    let last = performance.now();
    A.left = total;
    t.set(total, total);
    tick = setInterval(() => {
      const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (document.hidden || A.paused) return;
      A.left -= dt;
      t.set(A.left, total);
      if (A.left <= 5 && Math.ceil(A.left) !== A.lowSec) { A.lowSec = Math.ceil(A.left); if (A.left > 0) Fx.sfx.tick(); }
      if (A.left <= 0) { stop(); onEnd(); }
    }, 100);
  }

  // ---------- Meteor Shower ----------
  function shower() {
    const p = question((q) => q.pool.length >= 40 && FO.ease(q.cat) >= 8);
    Object.assign(A, { p, used: new Set(), pts: 0, finds: [], run: 0, hyper: 0 });
    const t = UI.timer(), msg = h('div', { class: 'note', 'aria-live': 'polite' }), log = h('div', { class: 'log' });
    const hyper = h('div', { class: 'hyper', hidden: true }, 'Hyperdrive ×2');
    const box = UI.answerBox('arc-ans', 'Go', (text) => judgeInto(p, text, A.used, msg, box.form, (j) => {
      A.used.add(j.item);
      const now = A.left, x = A.hyper && now > A.hyper ? 2 : 1;
      A.run = j.tier.c <= 3 ? A.run + 1 : 0;
      if (A.run >= 3 && x === 1) { A.hyper = now - HYPER_T; A.run = 0; hyper.hidden = false; Fx.pop(hyper); Fx.sfx.lone(); Fx.warp(3, 1); }
      const gain = j.pts * x;
      A.pts += gain;
      A.finds.push(j);
      score(A.pts);
      log.prepend(h('span', { class: 'chip pop-in ' + j.tier.cls }, j.item.name, h('small', null, '+' + gain)));
      Fx.burstAt(box.input, j.tier.c, 14 + (5 - j.tier.c) * 8);
      Fx.sfx.ok(j.tier.c); Fx.buzz('ok');
      if (j.tier.c <= 2) Fx.warp(1 + (3 - j.tier.c), j.tier.c);
      record(j, p);
    }));
    hyperTick = setInterval(() => { if (A.hyper && A.left <= A.hyper) { A.hyper = 0; hyper.hidden = true; } }, 250);
    mount(card(p, 'Name as many as you can'), t.el, hyper, box.form, msg, log);
    score(0, 'pts');
    A.paused = true;
    cancelCount = UI.countdown(body(), () => { cancelCount = null; A.paused = false; box.input.focus({ preventScroll: true }); });
    clock(t, SHOWER_T, () => over({
      big: A.pts, unit: 'pts', head: `${A.finds.length} answer${A.finds.length === 1 ? '' : 's'} in 60 seconds`,
      best: ['shower', A.finds.length], finds: A.finds, p, exclude: A.used,
    }));
  }

  // ---------- Spectrum ----------
  function spectrum() {
    const p = question((q) => { const n = tiersIn(q); return q.pool.length >= 25 && [1, 2, 3, 4, 5].every((c) => n[c] >= 2); });
    Object.assign(A, { p, used: new Set(), got: {}, peeks: 2, pts: 0, finds: [] });
    const t = UI.timer(), msg = h('div', { class: 'note', 'aria-live': 'polite' });
    const slots = h('ol', { class: 'slots-row', 'aria-label': 'Rarity slots' }, [1, 2, 3, 4, 5].map((c) =>
      h('li', { class: 'slot ' + FO.TIERS[c].cls, 'data-c': c }, h('b', null, FO.TIERS[c].name), h('span', null, 'Empty'))));
    const peek = h('button', { class: 'link', type: 'button', onclick: () => {
      const c = [1, 2, 3, 4, 5].find((x) => !A.got[x]);
      if (!c || A.peeks <= 0 || A.paused) return;
      const it = p.pool.filter((x) => FO.effOf(p, x) === c && !A.used.has(x))[0];
      if (!it) return;
      A.peeks--;
      peek.textContent = A.peeks ? `Hint (${A.peeks} left)` : 'No hints left';
      peek.disabled = !A.peeks;
      msg.replaceChildren(h('span', null, `${FO.TIERS[c].name} hint: starts with “${it.name.slice(0, 2)}”, ${it.name.length} characters.`));
      Fx.sfx.flip();
    } }, 'Hint (2 left)');
    const box = UI.answerBox('arc-ans', 'Place', (text) => judgeInto(p, text, A.used, msg, box.form, (j) => {
      A.used.add(j.item);
      const c = j.tier.c;
      if (A.got[c]) { msg.replaceChildren(h('span', null, `${j.item.name} is ${j.tier.name}, and that slot is full. Try a different rarity.`)); Fx.sfx.skip(); Fx.shake(slots.children[c - 1]); return; }
      A.got[c] = j.item;
      A.pts += j.pts;
      A.finds.push(j);
      const li = slots.children[c - 1];
      li.classList.add('on');
      li.querySelector('span').textContent = j.item.name;
      Fx.pop(li, 'slot-pop');
      Fx.burstAt(li, c, 26);
      Fx.sfx.ok(c); Fx.buzz('ok');
      score(A.pts);
      record(j, p);
      if (Object.keys(A.got).length === 5) {
        stop();
        const bonus = Math.round(A.left * 5);
        A.pts += bonus;
        FO.Progress.event('spectrum', { xp: 150 });
        finish(true, bonus);
      }
    }));
    const finish = (full, bonus = 0) => over({
      big: A.pts, unit: 'pts', head: full ? `All five filled with ${Math.ceil(A.left)} seconds left` : `${Object.keys(A.got).length} of 5 slots filled`,
      sub: full ? `Includes a time bonus of ${bonus}.` : 'Fill all five before the clock runs out.', win: full, finds: A.finds, p, exclude: A.used,
    });
    mount(card(p, 'Find one answer for every rarity'), t.el, slots, box.form, msg, h('div', { class: 'row-actions' }, peek));
    score(0, 'pts');
    A.paused = true;
    cancelCount = UI.countdown(body(), () => { cancelCount = null; A.paused = false; box.input.focus({ preventScroll: true }); });
    clock(t, SPECTRUM_T, () => finish(false));
  }

  // ---------- Duel ----------
  const VEGA = '#5cc8ff';
  function duelRound() {
    const w = DUEL_TIERS[A.diff] || DUEL_TIERS.normal;
    const p = question((q) => q.pool.length >= 25 && FO.ease(q.cat) >= 6);
    const n = tiersIn(p);
    const pickC = () => { const ks = Object.keys(w).filter((c) => n[c]); let r = A.rng() * ks.reduce((s, c) => s + w[c], 0); for (const c of ks) { r -= w[c]; if (r <= 0) return +c; } return +ks[0] || 5; };
    const c = pickC(), opts = p.pool.filter((it) => FO.effOf(p, it) === c);
    const vega = opts[Math.floor(A.rng() * opts.length)] || p.pool[0];
    const vt = FO.TIERS[FO.effOf(p, vega)];
    A.round++;
    const used = new Set([vega]);
    const t = UI.timer(), msg = h('div', { class: 'note', 'aria-live': 'polite' });
    let done = false;
    const settle = (j) => {
      if (done) return;
      done = true; stop();
      const mine = j ? j.tier.c : 9, res = mine < vt.c ? 'win' : mine === vt.c ? 'tie' : 'lose';
      if (res === 'win') A.me++; else if (res === 'lose') A.vega++;
      if (j) record(j, p);
      Fx.sfx[res === 'win' ? 'lone' : res === 'tie' ? 'flip' : 'clash']();
      if (res === 'win') { Fx.warp(2.5, mine); Fx.buzz('ok'); } else Fx.buzz('bad');
      score(A.me, `vs ${A.vega}`);
      const decided = A.me === 3 || A.vega === 3 || A.round >= 9; // first to three; nine rounds at most
      mount(card(p, `Round ${A.round}`),
        h('div', { class: 'duel-row' },
          h('div', { class: 'duel-side' + (res === 'win' ? ' won' : '') }, h('span', { class: 'who' }, 'You'), h('b', null, j ? j.item.name : 'No answer'), j ? UI.badge(j.tier) : UI.missBadge('Time')),
          h('div', { class: 'duel-side' + (res === 'lose' ? ' won' : '') }, h('span', { class: 'who' }, UI.planet(VEGA, true), 'Vega'), h('b', null, vega.name), UI.badge(vt))),
        h('p', { class: 'duel-res ' + res }, res === 'win' ? 'You went farther. Round to you.' : res === 'tie' ? 'Same rarity. Nobody scores.' : j ? 'Vega went farther.' : 'Out of time. Round to Vega.'),
        UI.farther(p, j, 4, new Set([vega].concat(j ? [j.item] : []))),
        h('button', { class: 'btn primary', type: 'button', 'data-autofocus': '', onclick: decided ? duelEnd : duelRound }, decided ? 'See who won' : 'Next round'));
      body().querySelector('.btn.primary').focus({ preventScroll: true });
    };
    const box = UI.answerBox('arc-ans', 'Beat it', (text) => judgeInto(p, text, used, msg, box.form, settle));
    mount(card(p, `Round ${A.round}, first to 3`),
      h('div', { class: 'vega' }, UI.planet(VEGA), h('div', null, h('span', { class: 'who' }, 'Vega answered'), h('b', null, vega.name)), UI.badge(vt)),
      h('p', { class: 'duel-goal' }, vt.c === 1 ? 'Vega went all the way out. Match it to tie.' : `Name something rarer than ${vt.name} to win the round.`),
      t.el, box.form, msg);
    Fx.sfx.flip();
    clock(t, DUEL_T, () => settle(null));
    box.input.focus({ preventScroll: true });
  }
  function duelEnd() {
    const won = A.me > A.vega;
    if (won) FO.Progress.event('duelWins', { hard: A.diff === 'hard', xp: { easy: 50, normal: 120, hard: 250 }[A.diff] });
    const draw = A.me === A.vega;
    over({ big: A.me, unit: `vs ${A.vega}`, head: won ? 'You beat Vega' : draw ? 'A draw after nine rounds' : 'Vega wins this one', win: won,
      sub: won ? (A.diff === 'hard' ? 'On Hard, too.' : 'Try a harder Vega next time.') : draw ? 'Neither pilot reached three. Play again to settle it.' : 'Vega plays rare. Try going farther out sooner.', finds: [] });
  }

  // ---------- end ----------
  function over(o) {
    stop();
    const mode = A.mode;
    if (o.best) FO.Progress.event('best', { [o.best[0]]: o.best[1] });
    const key = 'best.' + mode, prev = UI.store.get(key, 0), isBest = mode !== 'duel' && o.big > prev;
    if (isBest) UI.store.set(key, o.big);
    if (FO.Collection) FO.Collection.gamePlayed();
    const counts = [0, 0, 0, 0, 0, 0];
    o.finds.forEach((j) => counts[j.tier.c]++);
    const bigEl = h('span', null, '0');
    mount(h('div', { class: 'panel result-panel' },
      h('p', { class: 'eyebrow' }, o.head),
      h('h2', { class: 'over-h' }, bigEl, h('small', null, o.unit)),
      mode === 'duel' ? null : h('p', { class: 'over-best' }, isBest && prev ? h('b', null, 'New personal best.') : `Best: ${Math.max(prev, o.big).toLocaleString()} pts`),
      o.sub ? h('p', null, o.sub) : null,
      o.finds.length ? h('div', { class: 'log' }, o.finds.slice().sort((a, b) => a.tier.c - b.tier.c).map((j) => UI.chip(j.item.name, j.tier.cls))) : null,
      o.p ? UI.farther(o.p, null, 6, o.exclude) : null,
      h('div', { class: 'over-actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => FO.Arcade.start(mode, { theme: A.theme, diff: A.diff }) }, 'Play again'),
        h('button', { class: 'btn ghost', type: 'button', 'data-home': '' }, 'Menu'))));
    Fx.countUp(bigEl, 0, o.big, 900);
    setTimeout(() => { if (o.win || isBest) { Fx.sfx.win(); Fx.confetti(); } else Fx.sfx.over(); }, 250);
  }

  FO.Arcade = {
    NAMES,
    start(mode, opts = {}) {
      stop();
      Fx.sfx.unlock();
      A = { mode, theme: opts.theme || 'all', diff: opts.diff || 'normal', rng: FO.rng(Date.now() + ':' + Math.random()), recent: new Set(), round: 0, me: 0, vega: 0 };
      UI.show('s-arcade');
      $('#arc-mode').textContent = NAMES[mode];
      $('#arc-score').dataset.v = 0;
      Fx.warp(2);
      UI.onLeave(() => { stop(); A = null; });
      if (mode === 'shower') shower(); else if (mode === 'spectrum') spectrum(); else { score(0, 'vs 0'); duelRound(); }
    },
  };
})();
