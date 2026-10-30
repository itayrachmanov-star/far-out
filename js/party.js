/* Far Out — Party: 2–8 players pass one phone around. Everyone answers the same question in
   private, then the reveal scores it like Crew (Lone Signal +50%, collisions split). Works offline. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx, h = UI.h, $ = UI.$;
  const COLORS = ['#ff7a5c', '#52e0b4', '#a9b5dc', '#ffcb45', '#ff8fb8', '#a98dff', '#8cff9a', '#5cc8ff'];
  const MAX = 8;
  let P = null, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const body = () => $('#party-body');
  const mount = (...n) => { timers.forEach(clearTimeout); timers = []; body().replaceChildren(...n.filter(Boolean)); window.scrollTo(0, 0); };
  const seg = (opts, cur, onPick) => h('div', { class: 'seg', role: 'group' },
    opts.map((o) => h('button', { type: 'button', 'aria-pressed': String(o === cur), onclick: (e) => {
      e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      onPick(o);
    } }, String(o))));

  // ---------- setup ----------
  function setup() {
    const saved = UI.store.get('party.names', []);
    const st = { names: Array.isArray(saved) ? saved.filter((n) => typeof n === 'string').slice(0, MAX) : [], R: 5, th: UI.theme() };
    const list = h('ul', { class: 'players' });
    const err = h('p', { class: 'note', role: 'alert' });
    const input = h('input', { id: 'party-name', maxlength: 16, placeholder: 'Player name', autocomplete: 'off', enterkeyhint: 'done' });
    const paint = () => list.replaceChildren(...st.names.map((n, i) => h('li', null, UI.planet(COLORS[i % COLORS.length], true), h('span', null, n),
      h('button', { type: 'button', class: 'link', 'aria-label': 'Remove ' + n, onclick: () => { st.names.splice(i, 1); paint(); } }, 'Remove'))));
    const add = () => {
      const n = input.value.trim().slice(0, 16);
      if (!n) return;
      if (st.names.length >= MAX) { err.textContent = `Up to ${MAX} players.`; return; }
      if (st.names.some((x) => x.toLowerCase() === n.toLowerCase())) { err.textContent = 'That name is already playing.'; return; }
      st.names.push(n); input.value = ''; err.textContent = ''; paint(); input.focus();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    paint();
    mount(h('div', { class: 'panel' },
      h('h2', null, 'Party on one phone'),
      h('p', null, 'Pass the phone around. Everyone answers the same question in secret, then the reveal shows who went farthest. An answer nobody else gave earns a bonus; the same answer as someone else splits the points.'),
      h('div', { class: 'inline' }, h('div', { class: 'field' }, h('label', { for: 'party-name' }, 'Add players (2 to 8)'), input),
        h('button', { class: 'btn', type: 'button', onclick: add }, 'Add')),
      list, err,
      h('div', { class: 'settings' },
        h('div', { class: 'field' }, h('label', null, 'Rounds'), seg([3, 5, 8, 12], st.R, (v) => { st.R = v; })),
        h('div', { class: 'field wide' }, h('label', null, 'Topic'), UI.themePicker(st.th, (t) => { st.th = t; }))),
      h('button', { class: 'btn primary', type: 'button', onclick: () => {
        if (st.names.length < 2) { err.textContent = 'Add at least two players.'; input.focus(); return; }
        UI.store.set('party.names', st.names);
        start(st);
      } }, 'Start the party')));
    input.focus({ preventScroll: true });
  }

  // ---------- game ----------
  function start(st) {
    Fx.sfx.unlock();
    P = { players: st.names.map((n, i) => ({ n, col: COLORS[i % COLORS.length], sc: 0 })), R: st.R, r: 0, th: st.th,
      rng: FO.rng(Date.now() + ':' + Math.random()), recent: new Set(), avoid: [], prompt: null, turn: 0, answers: [] };
    nextRound();
  }
  function nextRound() {
    P.r++;
    P.prompt = FO.makePrompt(P.rng, { minPool: 12, recent: P.recent, avoid: P.avoid, theme: P.th });
    P.recent.add(P.prompt.id);
    P.turn = 0;
    P.answers = [];
    handOff();
  }
  function handOff() {
    const pl = P.players[P.turn];
    mount(h('div', { class: 'panel handoff' },
      h('p', { class: 'p-cat' }, `Round ${P.r} of ${P.R}`),
      UI.planet(pl.col),
      h('h2', null, `Pass the phone to ${pl.n}`),
      h('p', null, 'Everyone else, look away.'),
      h('button', { class: 'btn primary', type: 'button', onclick: answerScreen }, `I'm ${pl.n}, show the question`)));
    Fx.warp(1.2);
  }
  function answerScreen() {
    const pl = P.players[P.turn], p = P.prompt;
    const msg = h('div', { class: 'note', 'aria-live': 'polite' });
    const input = h('input', { id: 'party-ans', maxlength: 48, autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'go', placeholder: 'Your rarest answer' });
    const form = h('form', { class: 'answer', autocomplete: 'off', onsubmit: (e) => { e.preventDefault(); lock(input.value); } },
      h('label', { for: 'party-ans', class: 'sr' }, 'Your answer'), input, h('button', { class: 'btn primary', type: 'submit' }, 'Lock in'));
    const lock = (text) => {
      const j = FO.judge(p, text);
      if (j.why === 'empty') return;
      if (j.why === 'maybe') { msg.replaceChildren(UI.didYouMean(j.options, (it) => lock(it.name))); Fx.sfx.flip(); return; }
      if (!j.ok) { msg.textContent = UI.missText(p, j); Fx.shake(form); Fx.sfx.bad(); input.select(); return; }
      P.answers.push({ who: P.turn, j });
      if (FO.Collection) FO.Collection.add(j.item, j.tier, p);
      Fx.sfx.key();
      advance();
    };
    mount(h('p', { class: 'p-cat' }, `${pl.n}'s turn, round ${P.r} of ${P.R}`),
      h('article', { class: 'prompt enter' }, h('h2', { class: 'p-ask' }, p.ask), h('p', { class: 'p-rule' }, p.rule)),
      form, msg,
      h('div', { class: 'row-actions' }, h('button', { class: 'link', type: 'button', onclick: () => { P.answers.push({ who: P.turn, j: null }); advance(); } }, 'Pass, no answer')));
    input.focus({ preventScroll: true });
  }
  function advance() {
    P.turn++;
    if (P.turn < P.players.length) handOff(); else reveal();
  }

  function reveal() {
    const p = P.prompt, groups = new Map();
    for (const a of P.answers) if (a.j) { const k = a.j.item.name; groups.set(k, (groups.get(k) || 0) + 1); }
    const rows = P.answers.map((a) => {
      if (!a.j) return { a, pts: 0 };
      const n = groups.get(a.j.item.name), base = a.j.tier.pts;
      const pts = n === 1 ? Math.round(base * 1.5) : Math.round(base / n);
      return { a, pts, f: n === 1 ? 'L' : 'X' };
    }).sort((x, y) => (x.a.j ? 1 : 0) - (y.a.j ? 1 : 0) || (y.a.j ? y.a.j.tier.c : 0) - (x.a.j ? x.a.j.tier.c : 0));
    const before = P.players.map((pl) => pl.sc);
    rows.forEach((r) => { P.players[r.a.who].sc += r.pts; });
    const STEP = Fx.reduce ? 150 : 800;
    const cards = h('div', { class: 'cards' }, rows.map((r, i) => {
      const pl = P.players[r.a.who], j = r.a.j;
      later(() => {
        if (!j) return Fx.sfx.bad();
        Fx.sfx.ok(j.tier.c);
        if (r.f === 'L') later(Fx.sfx.lone, 250); else Fx.sfx.clash();
        if (j.tier.c <= 2) Fx.warp(1 + (3 - j.tier.c), j.tier.c);
      }, i * STEP + 200);
      return h('div', { class: 'card' + (j ? '' : ' miss'), style: { animationDelay: (i * STEP) / 1000 + 's' } },
        UI.planet(pl.col), h('span', { class: 'who' }, pl.n, r.f === 'L' ? h('span', { class: 'tag-lone' }, 'Lone signal') : r.f === 'X' ? h('span', { class: 'tag-clash' }, 'Collision') : null),
        h('span', { class: 'what' }, j ? j.item.name : 'No answer'), j ? UI.badge(j.tier) : UI.missBadge('Pass'),
        h('span', { class: 'pts' }, (r.pts ? '+' : '') + r.pts));
    }));
    const ranked = P.players.map((pl, i) => ({ pl, i })).sort((a, b) => b.pl.sc - a.pl.sc);
    const board = h('ol', { class: 'board' }, ranked.map(({ pl, i }, k) => {
      const sc = h('span', { class: 'sc' }, before[i].toLocaleString());
      later(() => Fx.countUp(sc, before[i], pl.sc, 900), rows.length * STEP + 400);
      return h('li', null, h('span', { class: 'rk' }, String(k + 1)), UI.planet(pl.col, true), h('span', { class: 'nm' }, pl.n), sc);
    }));
    const last = P.r >= P.R;
    mount(h('article', { class: 'prompt' }, h('p', { class: 'p-cat' }, `Round ${P.r} of ${P.R}`), h('h2', { class: 'p-ask' }, p.ask), h('p', { class: 'p-rule' }, p.rule)),
      cards,
      h('div', { class: 'panel' }, UI.farther(p, null, 5, new Set(P.answers.filter((a) => a.j).map((a) => a.j.item))), h('p', { class: 'eyebrow' }, 'Standings'), board,
        h('button', { class: 'btn primary', type: 'button', onclick: last ? final : nextRound }, last ? 'See the winner' : 'Next round')));
  }

  function final() {
    const ranked = P.players.slice().sort((a, b) => b.sc - a.sc);
    const tie = ranked[1] && ranked[1].sc === ranked[0].sc;
    mount(h('div', { class: 'panel' },
      h('h2', null, tie ? 'A tie at the top' : `${ranked[0].n} flew farthest`),
      h('ol', { class: 'board' }, ranked.map((pl, i) => h('li', null, h('span', { class: 'rk' }, String(i + 1)), UI.planet(pl.col, true),
        h('span', { class: 'nm' }, pl.n), h('span', { class: 'sc' }, pl.sc.toLocaleString())))),
      h('div', { class: 'over-actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => start({ names: P.players.map((x) => x.n), R: P.R, th: P.th }) }, 'Play again'),
        h('button', { class: 'btn', type: 'button', onclick: setup }, 'Change players'))));
    Fx.sfx.win();
    Fx.confetti();
    if (FO.Collection) FO.Collection.gamePlayed();
    FO.Progress.event('party');
  }

  FO.Party = { show() { UI.show('s-party'); setup(); UI.onLeave(() => { timers.forEach(clearTimeout); timers = []; }); } };
})();
