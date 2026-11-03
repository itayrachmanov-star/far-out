/* Far Out — Crew (online) screens: entry, lobby, answer, reveal, final. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx, h = UI.h, $ = UI.$;
  const Cr = () => FO.Crew, S = () => FO.Crew.state;
  const body = () => $('#crew-body');
  const MISS = { none: 'No answer', rule: 'Breaks the rule', repeat: 'Repeat', unknown: 'Not on charts' };
  const REACTS = ['🔥', '😂', '🤯', '👏'];
  const TEAMS = [{ n: 'Team Nova', c: '#ff8a4c' }, { n: 'Team Comet', c: '#7fe3d1' }];
  const TWIST = {
    w: ['Same Wavelength', 'Say what your crew will say: 10 points, plus 40 for every player who gives the same answer.'],
    s: ['Supernova finale', 'Last round. Every point counts double.'],
  };
  const teamOf = (g, id) => { const e = (g && g.tm || []).find((x) => x[0] === id); return e ? e[1] : null; };
  const teamTotals = (g) => { const t = [0, 0], sc = Cr().scores(g); for (const [id, team] of g.tm || []) t[team] += sc.get(id) || 0; return t; };
  let revealTimers = [], lastTickSec = -1, fixedNote = null;

  const clearReveal = () => { revealTimers.forEach(clearTimeout); revealTimers = []; };
  function mount(...nodes) { clearReveal(); body().replaceChildren(...nodes); }
  const seg = (opts, cur, onPick, disabled) => h('div', { class: 'seg', role: 'group' },
    opts.map((o) => h('button', { type: 'button', 'aria-pressed': String(o === cur), disabled: disabled || null, onclick: () => onPick(o) }, String(o))));

  // ---------- entry ----------
  async function entry(prefill) {
    const st = S();
    $('#crew-room').textContent = '';
    const err = h('p', { class: 'note', id: 'crew-err', role: 'alert' });
    const name = h('input', { id: 'crew-name', dir: 'auto', maxlength: 16, value: st.me.n, placeholder: 'Your pilot name', autocomplete: 'nickname' });
    const code = h('input', { id: 'crew-code', class: 'code-input', maxlength: 4, value: prefill || '', placeholder: 'ABCD', autocomplete: 'off', autocapitalize: 'characters' });
    const sw = h('div', { class: 'swatches' }, Cr().COLORS.map((c) => h('button', {
      type: 'button', class: 'swatch', style: { '--sw': c }, 'aria-label': 'Colour ' + c, 'aria-pressed': String(c === st.me.col),
      onclick: (e) => { st.me.col = c; UI.$$('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); },
    })));
    const note = h('p', { class: 'note' }, 'Checking how to connect…');
    const createBtn = h('button', { class: 'btn primary', type: 'button' }, 'Create room');
    const joinBtn = h('button', { class: 'btn', type: 'button' }, 'Join');
    const go = async (fn) => {
      st.me.n = name.value.trim();
      if (!st.me.n) { err.textContent = 'Pick a name first.'; name.focus(); return; }
      err.textContent = '';
      createBtn.disabled = joinBtn.disabled = true;
      try { await fn(); } catch (e) { console.warn(e); err.textContent = FO.Net.explain(e); createBtn.disabled = joinBtn.disabled = false; }
    };
    createBtn.onclick = () => go(() => Cr().create());
    joinBtn.onclick = () => {
      if (code.value.replace(/[^a-z]/gi, '').length !== 4) { err.textContent = 'Room codes are 4 letters.'; code.focus(); return; }
      go(() => Cr().join(code.value));
    };
    code.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinBtn.click(); });
    mount(h('div', { class: 'panel' },
      h('h2', null, 'Fly with friends'),
      h('p', null, 'Everyone answers the same prompt at once. An answer only you gave earns a Lone Signal bonus; the same answer as a friend collides and splits the points. Watch for Same Wavelength rounds, where matching your crew pays, and the double-points Supernova finale.'),
      h('div', { class: 'split' },
        h('div', { class: 'field' }, h('label', { for: 'crew-name' }, 'Name'), name),
        h('div', { class: 'field' }, h('label', null, 'Planet colour'), sw)),
      h('div', { class: 'split' },
        h('div', { class: 'field' }, h('label', null, 'Host a game'), createBtn),
        h('div', { class: 'inline' }, h('div', { class: 'field' }, h('label', { for: 'crew-code' }, 'Or join with a code'), code), joinBtn)),
      err, note));
    const kind = await FO.Net.kind();
    note.textContent = kind === 'room'
      ? 'Connected through Claude. Friends open this same page (shared with them) and type your room code.'
      : kind === 'peer'
        ? 'Free peer-to-peer play. Share the invite link or the 4-letter code with friends.'
        : 'Online play is not available in this view. Open this page in the Claude app while signed in, or host the game files on any free web host.';
    if (kind === 'none') createBtn.disabled = joinBtn.disabled = true;
    if (prefill) name.focus();
  }

  // ---------- lobby ----------
  function inviteText() {
    const st = S();
    if (st.kind === 'peer' && /^https?:/.test(location.protocol)) return location.origin + location.pathname + '#crew-' + st.code.toLowerCase();
    return st.code;
  }
  function lobby() {
    const st = S(), g = st.g;
    $('#crew-room').textContent = 'Room ' + st.code;
    const settings = h('div', { class: 'settings', id: 'crew-settings' });
    const action = st.isHost
      ? h('button', { class: 'btn primary', type: 'button', onclick: () => { Fx.sfx.unlock(); Cr().startGame(); } }, 'Start game')
      : h('p', { class: 'wait' }, 'Waiting for the host to start…');
    mount(
      h('div', { class: 'panel' },
        h('p', { class: 'eyebrow' }, 'Room code'),
        h('div', { class: 'code-big' }, st.code),
        h('div', { class: 'over-actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => UI.copy(inviteText()) }, inviteText() === st.code ? 'Copy code' : 'Copy invite link')),
        h('p', null, st.kind === 'room' ? 'Friends open this page and join with the code.' : 'Friends open the link, or the game and type the code.')),
      h('div', { class: 'panel' }, h('p', { class: 'eyebrow' }, 'Crew'), h('ul', { class: 'players', id: 'crew-players' })),
      h('div', { class: 'panel' }, h('p', { class: 'eyebrow' }, st.isHost ? 'Mission settings' : 'Mission settings (host decides)'), settings, action));
    renderSettings(g);
    players();
    net();
  }
  function renderSettings(g) {
    const el = $('#crew-settings');
    if (!el || !g) return;
    const host = S().isHost, set = (k) => (v) => Cr().setting(k, v);
    el.replaceChildren(
      h('div', { class: 'field' }, h('label', null, 'Rounds'), seg([5, 8, 12], g.R, set('R'), !host)),
      h('div', { class: 'field' }, h('label', null, 'Seconds'), seg([20, 30, 45, 60], g.T, set('T'), !host)),
      h('div', { class: 'field' }, h('label', null, 'Twists'), seg(['On', 'Off'], g.tw ? 'On' : 'Off', (v) => Cr().setting('tw', v === 'On' ? 1 : 0), !host)),
      h('div', { class: 'field' }, h('label', null, 'Teams'), seg(['Solo', '2 teams'], g.tt === 2 ? '2 teams' : 'Solo', (v) => Cr().setting('tt', v === '2 teams' ? 2 : 0), !host)),
      h('div', { class: 'field wide' }, h('label', null, 'Theme'), UI.themePicker(g.th || 'all', set('th'), !host)));
  }

  function players() {
    const el = $('#crew-players');
    if (!el) return;
    const st = S(), g = st.g || {};
    el.replaceChildren(...st.peers.map((pl) => {
      let status = pl.isMe ? 'You' : pl.p.host ? 'Host' : '';
      let done = false;
      if (g.ph === 'ask') { done = !!(pl.p.a && pl.p.a.r === g.r && pl.p.a.d); status = done ? 'Answered' : 'Thinking'; }
      else if (g.ph === 'reveal' || g.ph === 'final') status = (Cr().scores(g).get(pl.id) || 0).toLocaleString();
      const team = teamOf(g, pl.id);
      return h('li', { class: done ? 'done' : '' }, UI.planet(pl.p.col, true), h('span', null, pl.p.n),
        team == null ? null : h('i', { class: 'team-dot', style: { '--tc': TEAMS[team].c }, title: TEAMS[team].n }), h('small', null, status));
    }));
  }

  // ---------- ask ----------
  function timerEl() { return h('div', { class: 'timer', id: 'crew-timer' }, h('div', { class: 'timer-bar' }, h('i', { id: 'crew-tbar' })), h('b', { id: 'crew-tsec' }, '')); }
  function promptEl(p, g, small) {
    const tw = TWIST[g.k];
    return h('article', { class: 'prompt enter' + (tw ? ' twist-' + g.k : '') },
      tw ? h('p', { class: 'twist' }, h('b', null, tw[0]), ' ', tw[1]) : null,
      h('p', { class: 'p-cat' }, `Round ${g.r} of ${g.R}, ${p.cat.name.toLowerCase()}`),
      h('h2', { class: 'p-ask', style: small ? { fontSize: 'clamp(30px, 6vw, 44px)' } : null }, p.ask),
      h('p', { class: 'p-rule' }, p.rule));
  }
  function ask() {
    const st = S(), g = st.g, p = st.prompt;
    const input = h('input', { id: 'crew-ans', dir: 'auto', maxlength: 48, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'One answer, so make it rare' });
    const msg = h('p', { class: 'note', id: 'crew-msg', 'aria-live': 'polite' });
    const form = h('form', { class: 'answer', id: 'crew-form', autocomplete: 'off', onsubmit: (e) => { e.preventDefault(); submit(input, form, msg); } },
      h('label', { for: 'crew-ans', class: 'sr' }, 'Your answer'), input, h('button', { class: 'btn primary', type: 'submit' }, 'Send'));
    mount(timerEl(), promptEl(p, g), form,
      h('div', { class: 'my-answers', id: 'crew-mine' }),
      msg, h('ul', { class: 'players', id: 'crew-players' }));
    fixedNote = null;
    mine();
    players();
    input.focus({ preventScroll: true });
    Fx.warp(1.5);
    Fx.sfx.flip();
  }
  function submit(input, form, msg, text) {
    const r = Cr().addAnswer(text != null ? text : input.value);
    if (r.options) {
      msg.replaceChildren(UI.didYouMean(r.options, (it) => submit(input, form, msg, it.name)));
      Fx.sfx.flip();
      return;
    }
    if (!r.ok) { msg.textContent = r.msg; Fx.shake(form); Fx.sfx.bad(); return; }
    if (input.value.trim() || text) { Fx.sfx.key(); Fx.burstAt(input, 3, 10); }
    input.value = '';
    fixedNote = r.fixed || null;
    mine();
  }
  /** When time runs out, send what's still typed; an ambiguous typo takes its best match. */
  function flushInput() {
    const input = $('#crew-ans');
    if (!input || !input.value.trim()) return;
    const r = Cr().addAnswer(input.value);
    if (r.options) Cr().addAnswer(r.options[0].name);
    input.value = '';
  }
  function mine() {
    const st = S(), a = st.myA, el = $('#crew-mine');
    if (!el || !a) return;
    el.replaceChildren(...a.l.map((t) => h('span', { class: 'chip' }, t)));
    const locked = a.d;
    $('#crew-ans').disabled = locked;
    UI.$('#crew-form button').disabled = locked;
    if (!locked) return;
    const wait = h('span', { class: 'wait' }, a.l.length ? 'Sent. Waiting for the crew…' : 'Time’s up. Waiting for the crew…');
    $('#crew-msg').replaceChildren(...(fixedNote ? [h('span', null, UI.fixLine(fixedNote.typed, fixedNote.name), ' Typo fixed. '), wait] : [wait]));
  }

  // ---------- reveal ----------
  function reveal() {
    const st = S(), g = st.g, p = FO.buildPrompt(g.s), res = Array.isArray(g.res) ? g.res : [];
    const cards = h('div', { class: 'cards' });
    const roundPts = {};
    res.forEach((r) => { roundPts[r.p] = (roundPts[r.p] || 0) + (+r.pts || 0); });
    const STEP = Fx.reduce ? 150 : 850;
    res.forEach((r, i) => {
      const tier = FO.TIERS[r.c];
      const tag = r.f === 'L' ? h('span', { class: 'tag-lone' }, 'Lone signal') : r.f === 'X' ? h('span', { class: 'tag-clash' }, 'Collision')
        : r.f === 'M' ? h('span', { class: 'tag-lone' }, 'In sync') : null;
      const mineCard = r.p === Cr().meId();
      const card = h('div', { class: 'card' + (tier ? '' : ' miss'), style: { animationDelay: (i * STEP) / 1000 + 's' } },
        UI.planet(Cr().colorOf(r.p)),
        h('span', { class: 'who' }, Cr().nameOf(r.p), tag),
        h('span', { class: 'what' }, r.a || '—'),
        tier ? UI.badge(tier) : UI.missBadge(MISS[r.m] || 'Miss'),
        h('span', { class: 'pts' }, (r.pts ? '+' : '') + (+r.pts || 0)),
        h('div', { class: 'reacts', 'data-i': i }, REACTS.map((e, k) => h('button', {
          type: 'button', class: 'react', disabled: mineCard || null, 'aria-pressed': 'false', 'aria-label': `React ${e} to ${r.a || 'this answer'}`,
          onclick: () => { Cr().react(i, k); reactions(); Fx.sfx.key(); },
        }, e, h('small', null, '')))));
      cards.append(card);
      revealTimers.push(setTimeout(() => {
        if (!tier) { Fx.sfx.bad(); return; }
        Fx.sfx.ok(tier.c);
        if (r.f === 'L') setTimeout(Fx.sfx.lone, 250);
        if (r.f === 'X') { Fx.sfx.clash(); Fx.shake(card); }
        Fx.burstAt(card, tier.c, 8 + (5 - tier.c) * 8);
        if (tier.c <= 2) Fx.warp(1 + (3 - tier.c), tier.c);
      }, i * STEP + 200));
    });
    const board = h('ol', { class: 'board' });
    const said = new Set(res.map((r) => FO.judge(p, r.a)).filter((j) => j.ok).map((j) => j.item));
    const tt = g.tm ? teamTotals(g) : null;
    const teams = tt ? h('div', { class: 'team-board' }, TEAMS.map((t, i) => h('div', { style: { '--tc': t.c } }, h('b', null, t.n), h('span', null, tt[i].toLocaleString())))) : null;
    const after = h('div', { class: 'panel', style: { opacity: 0 } }, UI.farther(p, null, 5, said), h('p', { class: 'eyebrow' }, 'Standings'), teams, board);
    mount(promptEl(p, g, true), cards, after);
    const scm = Cr().scores(g), ranked = [...scm.keys()].sort((a, b) => scm.get(b) - scm.get(a));
    ranked.forEach((id, i) => {
      const sc = h('span', { class: 'sc' }, '0');
      board.append(h('li', null, h('span', { class: 'rk' }, String(i + 1)), UI.planet(Cr().colorOf(id), true), h('span', { class: 'nm' }, Cr().nameOf(id)), sc));
      revealTimers.push(setTimeout(() => Fx.countUp(sc, (scm.get(id) || 0) - (roundPts[id] || 0), scm.get(id) || 0, 900), res.length * STEP + 500));
    });
    revealTimers.push(setTimeout(() => { after.style.transition = 'opacity .5s'; after.style.opacity = 1; }, res.length * STEP + 300));
    $('#crew-timer') && $('#crew-timer').remove();
    reactions();
  }
  /** Reaction counts from everyone's presence, for this round only. */
  function reactions() {
    const st = S(), g = st.g;
    if (!g || g.ph !== 'reveal') return;
    const key = `${g.gid}:${g.r}`, mine = st.myR && st.myR.r === key ? st.myR.m : {};
    const counts = {};
    for (const pl of st.peers) {
      const re = pl.isMe ? { r: key, m: mine } : pl.p.re;
      if (re && re.r === key) for (const [i, k] of Object.entries(re.m)) (counts[i] = counts[i] || [0, 0, 0, 0])[k]++;
    }
    UI.$$('.reacts').forEach((row) => {
      const i = row.dataset.i, c = counts[i] || [0, 0, 0, 0];
      row.querySelectorAll('.react').forEach((b, k) => { b.setAttribute('aria-pressed', String(mine[i] === k)); b.lastChild.textContent = c[k] ? String(c[k]) : ''; });
    });
  }

  // ---------- final ----------
  function final() {
    const st = S(), g = st.g, scm = Cr().scores(g), sc = Object.fromEntries(scm);
    const ranked = [...scm.keys()].sort((a, b) => scm.get(b) - scm.get(a));
    if (st.credited !== g.gid && st.playedGid === g.gid) { st.credited = g.gid; FO.Progress.event('crew', { xp: sc[Cr().meId()] || 0 }); }
    const spot = (id, cls, place) => h('div', { class: cls, style: id ? null : { visibility: 'hidden' } }, id ? UI.planet(Cr().colorOf(id)) : null,
      h('span', { class: 'nm' }, id ? Cr().nameOf(id) : ''), h('span', { class: 'mono' }, id ? (sc[id] || 0).toLocaleString() + ' pts' : ''),
      h('div', { class: 'step', style: { height: place === 1 ? '120px' : place === 2 ? '84px' : '58px' } }, id ? String(place) : ''));
    const ready = st.peers.filter((pl) => !pl.isMe && pl.p.rm === g.gid).length;
    const actions = st.isHost
      ? [h('button', { class: 'btn primary', type: 'button', onclick: () => Cr().startGame() }, 'Rematch'),
        h('button', { class: 'btn', type: 'button', onclick: () => Cr().backToLobby() }, 'Change settings'),
        h('p', { class: 'wait', id: 'crew-ready' }, ready ? `${ready} ready for a rematch` : '')]
      : [st.myRm === g.gid ? h('p', { class: 'wait' }, 'You\'re in. Waiting for the host…')
        : h('button', { class: 'btn primary', type: 'button', onclick: () => { Cr().wantRematch(); final(); } }, 'I\'m in for a rematch')];
    const tt = g.tm ? teamTotals(g) : null, win = tt ? (tt[0] === tt[1] ? -1 : tt[0] > tt[1] ? 0 : 1) : null;
    const fav = g.fav && g.fav.n ? h('p', { class: 'fav' }, h('b', null, 'Crowd favourite: '), `“${g.fav.a}” by ${Cr().nameOf(g.fav.p)}, `,
      `${g.fav.n} reaction${g.fav.n === 1 ? '' : 's'}`) : null;
    mount(h('div', { class: 'panel' },
      h('p', { class: 'eyebrow' }, 'Mission complete'),
      h('h2', null, win != null ? (win < 0 ? 'The teams are tied' : `${TEAMS[win].n} wins`)
        : !ranked[0] ? 'Mission complete' : ranked[1] && sc[ranked[1]] === sc[ranked[0]] ? 'A tie at the top' : `${Cr().nameOf(ranked[0])} flew farthest`),
      tt ? h('div', { class: 'team-board' }, TEAMS.map((t, i) => h('div', { style: { '--tc': t.c } }, h('b', null, t.n), h('span', null, tt[i].toLocaleString())))) : null,
      fav,
      h('div', { class: 'podium' }, spot(ranked[1], 'second', 2), spot(ranked[0], 'first', 1), spot(ranked[2], 'third', 3)),
      h('ol', { class: 'board' }, ranked.map((id, i) => h('li', null, h('span', { class: 'rk' }, String(i + 1)), UI.planet(Cr().colorOf(id), true),
        h('span', { class: 'nm' }, Cr().nameOf(id)), h('span', { class: 'sc' }, (sc[id] || 0).toLocaleString())))),
      h('div', { class: 'over-actions' }, actions)));
    Fx.sfx.win();
    Fx.confetti();
  }

  // ---------- misc ----------
  function waiting() {
    $('#crew-room').textContent = 'Room ' + S().code;
    mount(h('div', { class: 'panel' }, h('h2', null, 'Joining ' + S().code), h('p', { class: 'wait' }, 'Looking for the host…')));
    net();
  }
  function message(title, text) {
    mount(h('div', { class: 'panel' }, h('h2', null, title), h('p', null, text),
      h('div', { class: 'over-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { Cr().leave(); entry(); } }, 'Back'))));
  }
  function hostGone() {
    const g = S().g;
    if (!g) message('No host found', `Nobody is hosting room ${S().code}. Check the code with your friend.`);
    else message('The host left', 'The game ended because the host disconnected. Start a new room to keep playing.');
  }
  function net() {
    const el = $('#crew-net'), st = S();
    el.textContent = st.sess ? (st.kind === 'room' ? 'Claude room' : 'Peer-to-peer') : '';
    el.classList.toggle('on', !!st.connected);
  }
  function tick(left) {
    const bar = $('#crew-tbar'), g = S().g;
    if (!bar || !g) return;
    const total = (g.T || 30) * 1000;
    const sec = Math.max(0, Math.ceil(left / 1000));
    bar.style.width = Math.max(0, Math.min(1, left / total)) * 100 + '%';
    $('#crew-tsec').textContent = String(sec);
    $('#crew-timer').classList.toggle('low', sec <= 5);
    if (sec <= 5 && sec > 0 && sec !== lastTickSec && g.ph === 'ask') Fx.sfx.tick();
    lastTickSec = sec;
  }
  function refresh() {
    const g = S().g;
    if (!g) return;
    if (g.ph === 'lobby') renderSettings(g);
    if (g.ph === 'ask') mine();
    if (g.ph === 'reveal') reactions();
    if (g.ph === 'final' && S().isHost && $('#crew-ready')) {
      const n = S().peers.filter((pl) => !pl.isMe && pl.p.rm === g.gid).length;
      $('#crew-ready').textContent = n ? `${n} ready for a rematch` : '';
    }
    players();
  }

  function outdated() {
    mount(h('div', { class: 'panel' }, h('h2', null, 'Update needed'),
      h('p', null, "Your copy of the game is older than the host's, so you can't see this question. Reload to get the latest version, then rejoin with the same code."),
      h('div', { class: 'over-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => location.reload() }, 'Reload the game'))));
  }

  FO.CrewView = { outdated, entry, lobby, ask, reveal, final, waiting, message, hostGone, net, tick, refresh, players, flushInput };
})();
