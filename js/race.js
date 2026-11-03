/* Far Out — Puffer Race, played in Crew rooms. Everyone gets the same question and feeds their own space
   pufferfish as many answers as they can; rarer answers puff it up more. The first puffer to pop wins the round.
   Each player publishes the answers they've fed (`pa`); the host re-judges them, so nobody can fake their size. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx, h = UI.h, $ = UI.$;
  const AIR = { 5: 12, 4: 18, 3: 26, 2: 36, 1: 50 }; // out of 100; a full puffer pops
  const POP_BONUS = 100, LEAD_BONUS = 50, POP_SHOW_MS = 7000, MAX_FEED = 12, SPIKES = 18;
  const Cr = () => FO.Crew, S = () => FO.Crew.state;
  let lanes = new Map(), fixNote = null;

  /** Air, points and answer count from a list of fed answers, judged in order (repeats don't count). */
  function tally(p, list) {
    const used = new Set();
    let air = 0, pts = 0, n = 0;
    for (const t of list || []) {
      const j = FO.judge(p, t, used);
      if (!j.ok) continue;
      used.add(j.item);
      air += AIR[j.tier.c]; pts += j.tier.pts; n++;
    }
    return { air: Math.min(100, air), pts, n };
  }
  const listOf = (pl, g) => (pl.isMe ? S().myP && S().myP.r === g.r ? S().myP.l : [] : pl.p.pa && pl.p.pa.r === g.r ? pl.p.pa.l : []);

  // ---------- host ----------
  /** Called on every host tick during a race. Ends the round when a puffer pops or time runs out. */
  function hostStep(now, timeUp) {
    const C = S(), g = C.hg, p = FO.buildPrompt(g.s);
    const all = C.peers.map((pl) => Object.assign({ p: pl.id }, tally(p, listOf(pl, g))));
    const full = all.filter((t) => t.air >= 100).sort((a, b) => a.n - b.n); // two pops at once: fewer answers wins
    if (!full.length && !timeUp) return false;
    const top = Math.max(0, ...all.map((t) => t.air));
    const win = full.length ? full[0].p : '';
    const rr = all.map((t) => ({ p: t.p, air: t.air, pts: t.pts, n: t.n, b: win ? (t.p === win ? POP_BONUS : 0) : top && t.air === top ? LEAD_BONUS : 0 }))
      .sort((a, b) => b.air - a.air || b.pts - a.pts);
    const sc = Cr().scores(g);
    for (const pl of C.peers) if (!sc.has(pl.id)) sc.set(pl.id, 0);
    for (const r of rr) sc.set(r.p, (sc.get(r.p) || 0) + r.pts + r.b);
    Cr().setPhase({ ph: 'pop', win, rr, sc: [...sc], left: POP_SHOW_MS });
    return true;
  }

  // ---------- the fish ----------
  /** A pufferfish, front view, in colour col. Its spikes grow with --spk and the whole fish with --puff. */
  function fish(col) {
    const NS = 'http://www.w3.org/2000/svg', s = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const svg = s('svg', { viewBox: '0 0 200 200', class: 'puffer', 'aria-hidden': 'true', style: `--pc:${col}` });
    const spikes = s('g', { class: 'spikes' });
    for (let i = 0; i < SPIKES; i++) {
      const g = s('g', { transform: `rotate(${(360 / SPIKES) * i} 100 100)` });
      g.append(s('polygon', { class: 'spk', points: '93,47 107,47 100,24' }));
      spikes.append(g);
    }
    svg.append(spikes,
      s('ellipse', { cx: 34, cy: 112, rx: 16, ry: 9, class: 'fin', transform: 'rotate(-24 34 112)' }),
      s('ellipse', { cx: 166, cy: 112, rx: 16, ry: 9, class: 'fin', transform: 'rotate(24 166 112)' }),
      s('circle', { cx: 100, cy: 100, r: 56, class: 'body' }),
      s('path', { d: 'M48 118 Q100 168 152 118 Q100 150 48 118Z', class: 'belly' }),
      s('circle', { cx: 78, cy: 90, r: 14, class: 'eye' }), s('circle', { cx: 122, cy: 90, r: 14, class: 'eye' }),
      s('circle', { cx: 81, cy: 92, r: 7, class: 'pupil' }), s('circle', { cx: 125, cy: 92, r: 7, class: 'pupil' }),
      s('circle', { cx: 84, cy: 88, r: 2.6, class: 'glint' }), s('circle', { cx: 128, cy: 88, r: 2.6, class: 'glint' }),
      s('ellipse', { cx: 66, cy: 112, rx: 9, ry: 5, class: 'cheek' }), s('ellipse', { cx: 134, cy: 112, rx: 9, ry: 5, class: 'cheek' }),
      s('ellipse', { cx: 100, cy: 120, rx: 7, ry: 8, class: 'mouth' }));
    return svg;
  }
  const puff = (wrap, air) => {
    wrap.style.setProperty('--puff', (0.7 + 0.5 * air / 100).toFixed(3));
    wrap.style.setProperty('--spk', (0.25 + 0.75 * air / 100).toFixed(3));
  };
  /** Floating "+100ly FAR OUT!" over a fish. */
  function float(host, text, cls) {
    const f = h('span', { class: 'puff-float ' + (cls || '') }, text);
    host.append(f);
    setTimeout(() => f.remove(), 1300);
  }
  const nebula = () => [h('span', { class: 'nebula n1' }), h('span', { class: 'nebula n2' })];

  // ---------- race screen ----------
  function race() {
    const st = S(), g = st.g, p = st.prompt;
    lanes = new Map();
    fixNote = null;
    const box = UI.answerBox('crew-ans', 'Feed', (text) => submit(text, box), 'Name as many as you can');
    const pond = h('div', { class: 'pond', id: 'race-pond' });
    $('#crew-body').replaceChildren(
      h('div', { class: 'timer', id: 'crew-timer' }, h('div', { class: 'timer-bar' }, h('i', { id: 'crew-tbar' })), h('b', { id: 'crew-tsec' }, '')),
      h('article', { class: 'prompt enter' }, h('p', { class: 'p-cat' }, `Round ${g.r} of ${g.R}, ${p.cat.name.toLowerCase()}`),
        h('h2', { class: 'p-ask' }, p.ask), h('p', { class: 'p-rule' }, p.rule)),
      h('div', { class: 'pond-stage' }, ...nebula(), pond),
      box.form, h('p', { class: 'note', id: 'race-msg', 'aria-live': 'polite' }), h('div', { class: 'log', id: 'race-mine' }));
    refresh();
    box.input.focus({ preventScroll: true });
    Fx.warp(1.5);
    Fx.sfx.flip();
  }

  function submit(text, box) {
    const st = S(), g = st.g, mine = st.myP, msg = $('#race-msg');
    if (!g || g.ph !== 'race' || !mine || mine.r !== g.r) return;
    const used = new Set(mine.l.map((t) => FO.judge(st.prompt, t)).filter((j) => j.ok).map((j) => j.item));
    const j = FO.judge(st.prompt, text, used);
    if (j.why === 'empty') return;
    if (j.why === 'maybe') { msg.replaceChildren(UI.didYouMean(j.options, (it) => submit(it.name, box))); Fx.sfx.flip(); return; }
    if (!j.ok) {
      msg.replaceChildren(h('span', { class: 'miss-line' }, j.why === 'repeat' ? `Your puffer already ate ${j.item.name}. Try another.` : UI.missText(st.prompt, j)));
      Fx.shake(box.form); Fx.sfx.bad(); Fx.buzz('bad');
      box.input.select();
      return;
    }
    if (mine.l.length >= MAX_FEED) return;
    mine.l.push(j.item.name); // the host judges this name, which it has even before its Hebrew names arrive
    st.playedGid = g.gid; // for XP: this player took part in this game
    Cr().push();
    fixNote = j.fuzzy ? { typed: j.typed, name: j.item.name } : null;
    msg.replaceChildren(fixNote ? h('span', { class: 'fix-note' }, UI.fixLine(fixNote.typed, fixNote.name), ' Typo fixed.') : '');
    box.input.value = '';
    $('#race-mine').prepend(h('span', { class: 'chip pop-in ' + j.tier.cls }, j.item.name, h('small', null, '+' + j.tier.pts)));
    const lane = lanes.get(Cr().meId());
    if (lane) float(lane.el, `+${j.tier.pts}ly ${j.tier.name.toUpperCase()}!`, j.tier.cls);
    Fx.sfx.ok(j.tier.c); Fx.buzz(j.tier.c <= 2 ? 'big' : 'ok');
    if (j.tier.c <= 2) Fx.warp(1 + (3 - j.tier.c), j.tier.c);
    refresh();
  }

  /** Redraw every puffer from everyone's presence; new answers make a fish gulp. */
  function refresh() {
    const st = S(), g = st.g, pond = $('#race-pond');
    if (!g || g.ph !== 'race' || !pond) return;
    const p = st.prompt, seen = new Set();
    for (const pl of st.peers) {
      seen.add(pl.id);
      let lane = lanes.get(pl.id);
      if (!lane) {
        const wrap = h('div', { class: 'puffer-wrap' }, fish(pl.p.col));
        const pct = h('small', null, '0%');
        const el = h('div', { class: 'lane' + (pl.isMe ? ' me' : '') }, wrap, h('b', null, pl.isMe ? 'You' : pl.p.n), pct);
        lane = { el, wrap, pct, n: 0 };
        lanes.set(pl.id, lane);
        pond.append(el);
      }
      const t = tally(p, listOf(pl, g));
      puff(lane.wrap, t.air);
      lane.pct.textContent = t.air >= 100 ? 'Pop!' : t.air + '%';
      if (t.n > lane.n) { Fx.pop(lane.wrap, 'gulp'); if (!pl.isMe) float(lane.el, '+' + (t.pts - (lane.pts || 0)), 'small'); }
      lane.n = t.n; lane.pts = t.pts;
    }
    for (const [id, lane] of lanes) if (!seen.has(id)) { lane.el.remove(); lanes.delete(id); }
  }

  // ---------- round result ----------
  function popped() {
    const st = S(), g = st.g, p = FO.buildPrompt(g.s), rr = g.rr || [], me = Cr().meId();
    const w = g.win, top = rr[0];
    const star = w || (top && top.air ? top.p : '');
    const wrap = h('div', { class: 'puffer-wrap' }, fish(Cr().colorOf(star || me)));
    puff(wrap, star ? (rr.find((r) => r.p === star) || {}).air || 0 : 0);
    const stage = h('div', { class: 'puffer-stage' }, ...nebula(), wrap);
    const head = w ? (w === me ? 'Your puffer popped first!' : `${Cr().nameOf(w)}’s puffer popped first!`)
      : star ? `Time’s up. ${star === me ? 'Yours was' : Cr().nameOf(star) + '’s was'} the biggest.` : 'Time’s up. Nobody puffed.';
    const said = new Set();
    for (const pl of st.peers) for (const t of listOf(pl, g)) { const j = FO.judge(p, t); if (j.ok) said.add(j.item); }
    const sc = Cr().scores(g), ranked = [...sc.keys()].sort((a, b) => sc.get(b) - sc.get(a));
    $('#crew-body').replaceChildren(
      h('article', { class: 'prompt' }, h('p', { class: 'p-cat' }, `Round ${g.r} of ${g.R}`), h('h2', { class: 'p-ask', style: { fontSize: 'clamp(26px, 5vw, 38px)' } }, p.ask)),
      stage, h('h2', { class: 'race-head' }, head),
      h('ol', { class: 'board' }, rr.map((r, i) => h('li', null, h('span', { class: 'rk' }, String(i + 1)), UI.planet(Cr().colorOf(r.p), true),
        h('span', { class: 'nm' }, Cr().nameOf(r.p), h('small', null, ` ${r.air}% puffed, ${r.n} answer${r.n === 1 ? '' : 's'}`)),
        h('span', { class: 'sc' }, '+' + (r.pts + r.b).toLocaleString())))),
      h('div', { class: 'panel' }, UI.farther(p, null, 5, said), h('p', { class: 'eyebrow' }, 'Standings'),
        h('ol', { class: 'board' }, ranked.map((id, i) => h('li', null, h('span', { class: 'rk' }, String(i + 1)), UI.planet(Cr().colorOf(id), true),
          h('span', { class: 'nm' }, Cr().nameOf(id)), h('span', { class: 'sc' }, (sc.get(id) || 0).toLocaleString()))))));
    if (w) {
      float(stage, `Pop! +${POP_BONUS}ly`, 'big');
      const k = 0.7 + 0.5 * ((rr.find((r) => r.p === w) || {}).air || 100) / 100;
      wrap.querySelector('.puffer').animate(Fx.reduce ? [{ opacity: 1 }, { opacity: 0 }] : [
        { transform: `scale(${k})`, opacity: 1 }, { transform: `scale(${k * 1.35})`, opacity: 1, offset: 0.6 }, { transform: `scale(${k * 1.6})`, opacity: 0 },
      ], { duration: Fx.reduce ? 150 : 600, delay: Fx.reduce ? 0 : 500, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => { Fx.confetti(w === me ? 160 : 70); Fx.sfx[w === me ? 'win' : 'lone'](); }, Fx.reduce ? 0 : 900);
    } else Fx.sfx.over();
    window.scrollTo(0, 0);
  }

  FO.Race = { hostStep, race, refresh, popped, tally };
})();
