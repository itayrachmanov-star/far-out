/* Far Out — Twin Stars: no typing. Two real answers to one question; tap the rarer one.
   Three lives, 8 seconds a pair, and the two answers get closer in rarity as the score grows. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx, h = UI.h, $ = UI.$;
  const LIVES = 3, PAIR_T = 8;
  let T = null, tick = 0, next = 0;

  const body = () => $('#arcade-body');
  const stop = () => { clearInterval(tick); clearTimeout(next); tick = next = 0; };
  const gapFor = (n) => (n < 5 ? 3 : n < 12 ? 2 : 1); // how many tiers apart the two answers are

  /** A question and two answers whose effective tiers differ by at least `gap`. */
  function pair() {
    const gap = gapFor(T.score);
    const inTheme = (l) => T.theme === 'all' || l.theme === T.theme;
    const lists = FO.qs.filter(inTheme).concat(FO.cats.filter(inTheme));
    for (let i = 0; i < 300; i++) {
      const l = lists[Math.floor(T.rng() * lists.length)];
      if (!l || (i < 200 && T.recent.has(l.id))) continue;
      const p = FO.buildPrompt({ c: l.id, t: 'any' });
      const by = {};
      p.pool.forEach((it) => { (by[FO.effOf(p, it)] = by[FO.effOf(p, it)] || []).push(it); });
      const cs = Object.keys(by).map(Number);
      const combos = [];
      for (const a of cs) for (const b of cs) if (a < b && b - a >= gap && b - a <= gap + 1) combos.push([a, b]);
      if (!combos.length) continue;
      const [a, b] = combos[Math.floor(T.rng() * combos.length)];
      const one = (c) => by[c][Math.floor(T.rng() * by[c].length)];
      T.recent.add(l.id);
      const rare = one(a), common = one(b);
      return { p, items: T.rng() < 0.5 ? [rare, common] : [common, rare], rare };
    }
    return null;
  }

  function hud() {
    const el = $('#arc-score');
    el.countId = (el.countId || 0) + 1;
    el.textContent = T.score;
    el.dataset.v = T.score;
    $('#arc-unit').replaceChildren(h('span', { class: 'lives', 'aria-label': `${T.lives} lives left` },
      Array.from({ length: LIVES }, (_, i) => h('i', { class: i < T.lives ? '' : 'off' }))));
  }

  function round() {
    const q = pair();
    if (!q) return end();
    T.q = q;
    T.left = PAIR_T;
    const t = UI.timer();
    const picks = q.items.map((it) => h('button', { class: 'pick', type: 'button', onclick: () => choose(it, picks, q) }, h('span', null, it.name)));
    body().replaceChildren(
      h('article', { class: 'prompt enter' }, h('p', { class: 'p-cat' }, 'Which answer is rarer?'), h('h2', { class: 'p-ask' }, q.p.ask)),
      t.el, h('div', { class: 'pair' }, picks), h('p', { class: 'note', id: 'twin-msg', 'aria-live': 'polite' }, 'Tap the answer fewer people would give.'));
    let last = performance.now();
    t.set(PAIR_T, PAIR_T);
    tick = setInterval(() => {
      const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      T.left -= dt;
      t.set(T.left, PAIR_T);
      if (T.left <= 0) choose(null, picks, q);
    }, 100);
  }

  function choose(it, picks, q) {
    if (T.locked) return;
    T.locked = true;
    clearInterval(tick);
    const right = it === q.rare;
    picks.forEach((b, i) => {
      const x = q.items[i], tier = FO.TIERS[FO.effOf(q.p, x)];
      b.disabled = true;
      b.append(UI.badge(tier));
      if (x === q.rare) b.classList.add('right');
      else if (x === it) b.classList.add('wrong');
    });
    const msg = $('#twin-msg');
    if (right) {
      T.score++;
      T.run++;
      T.best = Math.max(T.best, T.run);
      Fx.sfx.ok(FO.effOf(q.p, q.rare)); Fx.buzz('ok');
      Fx.burstAt(picks[q.items.indexOf(q.rare)], FO.effOf(q.p, q.rare), 24);
      FO.Progress.event('answer', { pts: 10, theme: q.p.cat.theme });
      msg.textContent = `Right. ${q.rare.name} is the rarer answer.`;
    } else {
      T.lives--;
      T.run = 0;
      Fx.sfx.bad(); Fx.buzz('bad');
      Fx.shake(picks[0].parentElement);
      msg.textContent = it ? `Not this time. ${q.rare.name} is rarer.` : `Out of time. ${q.rare.name} is rarer.`;
    }
    hud();
    next = setTimeout(() => { T.locked = false; if (T.lives <= 0) end(); else round(); }, Fx.reduce ? 700 : 1500);
  }

  function end() {
    stop();
    FO.Progress.event('best', { rarer: T.best });
    const prev = UI.store.get('best.twin', 0), isBest = T.score > prev;
    if (isBest) UI.store.set('best.twin', T.score);
    if (FO.Collection) FO.Collection.gamePlayed();
    const big = h('span', null, '0');
    body().replaceChildren(h('div', { class: 'panel result-panel' },
      h('p', { class: 'eyebrow' }, 'Out of lives'),
      h('h2', { class: 'over-h' }, big, h('small', null, T.score === 1 ? 'pair' : 'pairs')),
      h('p', { class: 'over-best' }, isBest && prev ? h('b', null, 'New personal best.') : `Best: ${Math.max(prev, T.score)} pairs`),
      h('p', null, `Longest run: ${T.best} in a row.`),
      h('div', { class: 'over-actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => FO.Twin.start({ theme: T.theme }) }, 'Play again'),
        h('button', { class: 'btn ghost', type: 'button', 'data-home': '' }, 'Menu'))));
    Fx.countUp(big, 0, T.score, 700);
    setTimeout(() => { if (isBest) { Fx.sfx.win(); Fx.confetti(); } else Fx.sfx.over(); }, 250);
  }

  FO.Twin = {
    start(opts = {}) {
      stop();
      Fx.sfx.unlock();
      T = { theme: opts.theme || 'all', rng: FO.rng(Date.now() + ':' + Math.random()), recent: new Set(), score: 0, lives: LIVES, run: 0, best: 0, locked: false };
      UI.show('s-arcade');
      $('#arc-mode').textContent = 'Twin Stars';
      hud();
      Fx.warp(2);
      UI.onLeave(() => { stop(); T = null; });
      round();
    },
  };
})();
