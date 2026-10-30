/* Far Out — solo modes: Voyage (endless, fuel clock) and Daily Orbit (seeded, 6 × 2). */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx, h = UI.h, $ = UI.$;
  const FUEL_MAX = 60, FUEL_START = 45, MISS_COST = 3, SKIP_COST = 3;
  const DAILY_PROMPTS = 6, DAILY_SLOTS = 2;

  let S = null, ticker = 0;

  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => ymd(new Date());
  const multFor = (streak) => (streak >= 8 ? 2 : streak >= 5 ? 1.5 : streak >= 3 ? 1.25 : 1);

  function fresh(mode) {
    return { mode, dist: 0, streak: 0, bestStreak: 0, fuel: FUEL_START, finds: [], misses: 0, recent: new Set(), avoid: [],
      used: new Set(), prompt: null, busy: false, over: false, grid: [], idx: 0, slots: DAILY_SLOTS, lastT: performance.now(), lowSec: -1 };
  }

  // ---------- rendering ----------
  function renderPrompt() {
    const p = S.prompt;
    $('#p-cat').textContent = S.mode === 'daily' ? `Question ${S.idx + 1} of ${DAILY_PROMPTS}, ${p.cat.name.toLowerCase()}` : p.cat.name;
    $('#p-ask').textContent = p.ask;
    $('#p-rule').textContent = p.rule;
    $('#p-meta').textContent = `${p.pool.length} known answers`;
    Fx.pop($('#prompt'), 'enter');
    renderSlots();
    const inp = $('#ans');
    inp.value = '';
    inp.focus({ preventScroll: true });
  }
  function renderSlots() {
    $('#slots').textContent = S.mode === 'daily' ? `${S.slots} launch${S.slots === 1 ? '' : 'es'} left. A miss uses one.` : '';
    $('#skip').textContent = S.mode === 'daily' ? 'Pass' : S.mode === 'explore' ? 'Next question' : `Skip question (−${SKIP_COST}s)`;
    if (S.mode === 'daily') {
      const dots = $('#daily-dots');
      dots.replaceChildren(...Array.from({ length: DAILY_PROMPTS }, (_, i) => h('i', { class: i < S.idx ? 'on' : i === S.idx ? 'now' : '' })));
    }
  }
  function renderHud(gain) {
    const d = $('#distance');
    if (gain) { Fx.countUp(d, S.dist - gain, S.dist); Fx.pop(d.parentElement); } else d.textContent = S.dist.toLocaleString();
    const st = $('#streak'), m = multFor(S.streak);
    st.textContent = '×' + m;
    st.classList.toggle('hot', m > 1);
  }
  function renderFuel() {
    const f = Math.max(0, S.fuel);
    $('#fuel').style.width = (f / FUEL_MAX) * 100 + '%';
    $('#fuel-label').textContent = `Fuel ${Math.ceil(f)}s`;
    const low = f < 10;
    $('#fuel-wrap').classList.toggle('low', low);
    const sec = Math.ceil(f);
    if (low && sec !== S.lowSec) { S.lowSec = sec; Fx.sfx.tick(); }
  }
  function verdict(p, j, gain) {
    const res = $('#result');
    let card;
    if (j.ok) {
      card = h('div', { class: 'verdict ' + j.tier.cls },
        UI.badge(j.tier, S.mode === 'voyage' ? `+${j.tier.fuel}s fuel` : `${j.tier.pts} pts`),
        h('span', { class: 'v-ans' }, j.item.name),
        h('span', { class: 'v-why' }, j.fuzzy ? [UI.fixLine(j.typed, j.item.name), ' Typo fixed.'] : `${j.tier.name} answer for ${p.what}.`),
        h('span', { class: 'v-pts' }, '+' + gain));
    } else {
      card = h('div', { class: 'verdict miss' }, UI.missBadge(),
        h('span', { class: 'v-ans' }, j.item ? j.item.name : j.raw),
        h('span', { class: 'v-why' }, UI.missText(p, j)),
        h('span', { class: 'v-pts' }, S.mode === 'voyage' ? `−${MISS_COST}s` : '0'));
    }
    res.replaceChildren(...[card, j.ok ? UI.farther(p, j) : null].filter(Boolean));
  }

  // ---------- flow ----------
  function nextPrompt() {
    if (S.mode === 'daily') {
      S.prompt = S.daily[S.idx];
      S.slots = S.resumeSlots || DAILY_SLOTS;
      S.resumeSlots = 0;
    } else {
      S.prompt = FO.makePrompt(S.rng, { minPool: 6, recent: S.recent, avoid: S.avoid, theme: S.theme });
      S.recent.add(S.prompt.id);
    }
    S.used = new Set();
    renderPrompt();
  }

  function submit(text) {
    if (!S || S.busy || S.over) return;
    const p = S.prompt, j = FO.judge(p, text, S.used);
    if (j.why === 'empty') return;
    const form = $('#answer-form');
    if (j.why === 'maybe') { // a typo close to several answers: ask, no penalty
      $('#result').replaceChildren(h('div', { class: 'verdict maybe' }, h('span', { class: 'badge ask' }, 'Typo?'),
        h('span', { class: 'v-ans' }, String(text).trim()),
        h('span', { class: 'v-why' }, UI.didYouMean(j.options, (it) => submit(it.name))),
        h('span', { class: 'v-pts' }, '')));
      Fx.sfx.flip();
      return;
    }
    if (j.ok) {
      S.used.add(j.item);
      S.streak++;
      S.bestStreak = Math.max(S.bestStreak, S.streak);
      const gain = S.mode === 'daily' ? j.pts : Math.round(j.pts * multFor(S.streak));
      S.dist += gain;
      S.finds.push({ name: j.item.name, tier: j.tier, prompt: p.ask + (p.rule ? ' ' + p.rule : '') });
      if (S.mode === 'voyage') S.fuel = Math.min(FUEL_MAX, S.fuel + j.tier.fuel);
      if (FO.Collection) FO.Collection.add(j.item, j.tier, p);
      FO.Progress.event('answer', { pts: j.pts, tier: j.tier.c, fuzzy: j.fuzzy, theme: p.cat.theme });
      Fx.buzz(j.tier.c <= 2 ? 'big' : 'ok');
      verdict(p, j, gain);
      renderHud(gain);
      Fx.warp(1.2 + (5 - j.tier.c) * 0.55, j.tier.c);
      Fx.burstAt($('#ans'), j.tier.c, 20 + (5 - j.tier.c) * 14);
      Fx.sfx.ok(j.tier.c);
      if (S.mode === 'daily') { S.grid.push(j.tier.c); useSlot(); }
      else { const s = S; s.busy = true; setTimeout(() => { if (S !== s) return; s.busy = false; if (!s.over) nextPrompt(); }, 900); }
    } else {
      const free = j.why === 'repeat'; // using an answer twice is a slip, not a miss
      if (!free) { S.streak = 0; S.misses++; }
      if (S.mode === 'voyage' && !free) S.fuel -= MISS_COST;
      Fx.buzz('bad');
      verdict(p, j);
      renderHud();
      form.classList.add('bad');
      setTimeout(() => form.classList.remove('bad'), 500);
      Fx.shake(form);
      Fx.sfx.bad();
      $('#ans').select();
      if (S.mode === 'daily' && j.why !== 'repeat') { S.grid.push(0); useSlot(); }
    }
    if (S.mode === 'voyage' && S.fuel <= 0) end();
  }

  function useSlot() {
    S.slots--;
    renderSlots();
    $('#ans').value = '';
    saveDaily();
    if (S.slots > 0) return;
    const s = S;
    s.busy = true;
    setTimeout(() => {
      if (S !== s || s.over) return;
      s.busy = false;
      s.idx++;
      if (s.idx >= DAILY_PROMPTS) end(); else nextPrompt();
    }, 1100);
  }

  /** Daily progress is saved after every launch, so leaving can't replay or lose a prompt. */
  function saveDaily() {
    const nextIdx = S.slots > 0 ? S.idx : S.idx + 1;
    UI.store.set('daily.' + S.day, { dist: S.dist, grid: S.grid, finds: S.finds.map((f) => [f.name, f.tier.c]),
      idx: nextIdx, slots: S.slots > 0 ? S.slots : DAILY_SLOTS, done: nextIdx >= DAILY_PROMPTS });
    if (nextIdx >= DAILY_PROMPTS) { bumpStreak(S.day); FO.Progress.event('best', { daily: streakNow() }); }
  }

  function skip() {
    if (!S || S.busy || S.over) return;
    const p = S.prompt;
    S.streak = 0;
    renderHud();
    Fx.sfx.skip();
    $('#result').replaceChildren(h('div', { class: 'verdict miss' }, UI.missBadge('Skipped'),
      h('span', { class: 'v-ans' }, p.ask + (p.rule ? ' ' + p.rule : '')),
      h('span', { class: 'v-why' }, 'Here is what was out there.'),
      h('span', { class: 'v-pts' }, S.mode === 'voyage' ? `−${SKIP_COST}s` : '0')), ...[UI.farther(p, null, 5)].filter(Boolean));
    if (S.mode === 'daily') {
      while (S.slots > 0) { S.grid.push(0); S.slots--; }
      S.slots = 1; useSlot();
      return;
    }
    if (S.mode === 'voyage') S.fuel -= SKIP_COST;
    if (S.fuel <= 0) return end();
    nextPrompt();
  }

  function tick() {
    if (!S || S.over) return;
    const now = performance.now(), dt = Math.min(0.25, (now - S.lastT) / 1000);
    S.lastT = now;
    if (!S.busy && !document.hidden) S.fuel -= dt;
    renderFuel();
    if (S.fuel <= 0) end();
  }

  /** Consecutive days with a finished Daily Orbit. */
  const dayBefore = (day) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() - 1); return ymd(d); };
  function bumpStreak(day) {
    const s = UI.store.get('streak', { last: '', n: 0 });
    if (s.last === day) return;
    UI.store.set('streak', { last: day, n: s.last === dayBefore(day) ? s.n + 1 : 1 });
  }
  function streakNow() {
    const s = UI.store.get('streak', { last: '', n: 0 }), t = today();
    return s.last === t || s.last === dayBefore(t) ? s.n : 0;
  }

  // Fuel doesn't burn while the tab is hidden.
  document.addEventListener('visibilitychange', () => { if (S) S.lastT = performance.now(); });

  // ---------- end ----------
  function end() {
    if (S.over) return;
    S.over = true;
    clearInterval(ticker);
    const mode = S.mode;
    const prevBest = UI.store.get('best.voyage', 0);
    if (mode === 'voyage' && S.dist > prevBest) UI.store.set('best.voyage', S.dist);
    if (mode === 'voyage') FO.Progress.event('best', { voyage: S.dist, streak: S.bestStreak });
    if (mode === 'daily') { S.idx = DAILY_PROMPTS; S.slots = 0; saveDaily(); }
    if (FO.Collection) FO.Collection.gamePlayed();
    showOver(mode, S, prevBest);
  }

  function showOver(mode, st, prevBest) {
    UI.show('s-over');
    $('#over-k').textContent = mode === 'daily' ? `Daily Orbit, ${st.day || today()}` : mode === 'explore' ? 'Exploring done' : 'Out of fuel';
    Fx.countUp($('#over-dist'), 0, st.dist, 1100);
    const best = $('#over-best');
    if (mode === 'voyage') {
      best.replaceChildren(st.dist > prevBest && st.dist > 0 ? h('b', null, 'New personal record.') : `Personal best: ${Math.max(prevBest, st.dist).toLocaleString()} ly`);
    } else {
      const n = streakNow();
      best.textContent = n > 1 ? `${n}-day streak. New questions tomorrow.` : 'New questions tomorrow. Come back to start a streak.';
    }
    const counts = [0, 0, 0, 0, 0, 0];
    st.finds.forEach((f) => counts[f.tier.c]++);
    const total = st.finds.length || 1;
    $('#over-hist').replaceChildren(...[5, 4, 3, 2, 1].filter((c) => counts[c]).map((c, i) =>
      h('i', { class: 't' + c, title: `${FO.TIERS[c].name}: ${counts[c]}`, style: { width: (counts[c] / total) * 100 + '%', animationDelay: i * 0.12 + 's' } })));
    const rarest = st.finds.slice().sort((a, b) => a.tier.c - b.tier.c)[0];
    const stats = [
      ['Answers', st.finds.length],
      ['Far Out finds', counts[1]],
      [mode === 'daily' ? 'Misses' : 'Best streak', mode === 'daily' ? st.grid.filter((c) => !c).length : st.bestStreak],
      ['Rarest', rarest ? rarest.name : '—'],
    ];
    $('#over-stats').replaceChildren(...stats.map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, String(v)))));
    const grid = (mode === 'daily' ? st.grid : st.finds.map((f) => f.tier.c)).slice(0, 24).map((c) => UI.EMOJI[c]).join('');
    st.share = [`Far Out, ${mode === 'daily' ? 'Daily Orbit ' + (st.day || today()) : 'Voyage'}`, `${st.dist.toLocaleString()} ly`, grid,
      rarest ? `Rarest find: ${rarest.name} (${rarest.tier.name})` : '', mode === 'daily' && streakNow() > 1 ? `${streakNow()}-day streak` : ''].filter(Boolean).join('\n');
    $('#share-text').hidden = true;
    $('#share').onclick = () => UI.share(st.share + (/^https?:/.test(location.protocol) && !FO.Net.inArtifact ? '\n' + location.origin + location.pathname : ''), $('#share-text'));
    const img = $('#share-img');
    img.hidden = !(FO.ShareCard && FO.ShareCard.available());
    img.onclick = () => FO.ShareCard.share({
      title: mode === 'daily' ? `Daily Orbit, ${st.day || today()}` : 'Voyage', dist: st.dist,
      grid: mode === 'daily' ? st.grid : st.finds.map((f) => f.tier.c), rarest: rarest ? { name: rarest.name, c: rarest.tier.c } : null,
      extra: mode === 'daily' && streakNow() > 1 ? `${streakNow()}-day streak` : '',
      url: /^https?:/.test(location.protocol) ? (location.host + location.pathname).replace(/\/$/, '') : '', text: st.share,
    });
    $('#again').textContent = mode === 'daily' ? 'Play Voyage' : 'Fly again';
    $('#again').onclick = () => FO.Solo.start('voyage');
    if (st.dist > 0) setTimeout(() => { Fx.sfx[counts[1] || st.dist > prevBest ? 'win' : 'over'](); if (st.dist > prevBest || counts[1] >= 2) Fx.confetti(); }, 300);
    else Fx.sfx.over();
  }

  // ---------- public ----------
  FO.Solo = {
    start(mode, opts = {}) {
      const day = today();
      const rec = mode === 'daily' ? UI.store.get('daily.' + day, null) : null;
      const finds = rec && Array.isArray(rec.finds) ? rec.finds.filter((f) => FO.TIERS[f[1]]).map(([name, c]) => ({ name, tier: FO.TIERS[c] })) : [];
      if (rec && rec.done !== false) {
        showOver('daily', { day, dist: rec.dist || 0, grid: rec.grid || [], finds }, 0);
        UI.toast("You've flown today's orbit. Here's your result.");
        return;
      }
      S = fresh(mode);
      S.day = day;
      S.theme = mode === 'daily' ? 'all' : opts.theme || UI.theme();
      if (rec) Object.assign(S, { dist: rec.dist || 0, grid: rec.grid || [], finds, idx: Math.min(DAILY_PROMPTS - 1, rec.idx || 0), resumeSlots: rec.slots });
      if (mode === 'daily') {
        const rng = FO.rng('daily-' + day);
        S.daily = [];
        for (let i = 0; i < DAILY_PROMPTS; i++) { const p = FO.makePrompt(rng, { minPool: 10, recent: S.recent, avoid: S.avoid, avoidN: 6 }); S.recent.add(p.id); S.daily.push(p); }
      } else S.rng = FO.rng(Date.now() + ':' + Math.random());
      UI.show('s-play');
      $('#play-mode').textContent = mode === 'daily' ? 'Daily Orbit' : mode === 'explore' ? 'Explore' : 'Voyage';
      $('#fuel-wrap').hidden = mode !== 'voyage';
      $('#daily-dots').hidden = mode !== 'daily';
      $('#streak').hidden = mode === 'daily';
      $('#hint').hidden = mode !== 'explore';
      $('#result').replaceChildren(h('p', { class: 'note' }, mode === 'daily'
        ? 'Two launches per question. Rarer answers score more. No clock, so take your time.'
        : mode === 'explore' ? 'No clock and no end. Answer, skip, and see the rare answers you could have given.'
        : 'Fuel burns every second. Rare answers refuel more. A wrong answer costs 3 seconds.'));
      renderHud();
      nextPrompt();
      Fx.warp(2);
      clearInterval(ticker);
      if (mode === 'voyage') { S.lastT = performance.now(); ticker = setInterval(tick, 100); renderFuel(); }
      UI.onLeave(() => { clearInterval(ticker); if (S) S.over = true; });
    },
    submit, skip,
    /** Explore: show how a rarer unused answer starts. */
    hint() {
      if (!S || S.over || S.mode !== 'explore') return;
      const p = S.prompt, it = p.pool.filter((x) => FO.effOf(p, x) <= 3 && !S.used.has(x)).sort(() => Math.random() - 0.5)[0];
      if (!it) return;
      const tier = FO.TIERS[FO.effOf(p, it)];
      $('#result').replaceChildren(h('div', { class: 'verdict maybe' }, h('span', { class: 'badge ask' }, 'Hint'),
        h('span', { class: 'v-ans' }, it.name.slice(0, 2) + it.name.slice(2).replace(/[a-z0-9]/gi, '_')),
        h('span', { class: 'v-why' }, `A ${tier.name} answer, ${it.name.replace(/[^a-z0-9]/gi, '').length} letters.`), h('span', { class: 'v-pts' }, '')));
      Fx.sfx.flip();
      $('#ans').focus({ preventScroll: true });
    },
    today, streakNow,
  };
})();
