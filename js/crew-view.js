/* Far Out — Crew (online) screens: entry, lobby, answer, vote, reveal, final. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx, h = UI.h, $ = UI.$;
  const Cr = () => FO.Crew, S = () => FO.Crew.state;
  const body = () => $('#crew-body');
  const MISS = { none: 'No answer', rule: 'Breaks the rule', repeat: 'Repeat', vote: 'Voted out', unknown: 'Not on charts' };
  let revealTimers = [], lastTickSec = -1;

  const clearReveal = () => { revealTimers.forEach(clearTimeout); revealTimers = []; };
  function mount(...nodes) { clearReveal(); body().replaceChildren(...nodes); }
  const seg = (opts, cur, onPick, disabled) => h('div', { class: 'seg', role: 'group' },
    opts.map((o) => h('button', { type: 'button', 'aria-pressed': String(o === cur), disabled: disabled || null, onclick: () => onPick(o) }, String(o))));

  // ---------- entry ----------
  async function entry(prefill) {
    const st = S();
    $('#crew-room').textContent = '';
    const err = h('p', { class: 'note', id: 'crew-err', role: 'alert' });
    const name = h('input', { id: 'crew-name', maxlength: 16, value: st.me.n, placeholder: 'Your pilot name', autocomplete: 'nickname' });
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
      h('p', null, 'Everyone answers the same prompt at once. An answer only you gave earns a Lone Signal bonus. Same answer as a friend? You collide and split the points.'),
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
      h('div', { class: 'field' }, h('label', null, 'Answers each'), seg([1, 2, 3], g.A, set('A'), !host)));
  }

  function players() {
    const el = $('#crew-players');
    if (!el) return;
    const st = S(), g = st.g || {};
    el.replaceChildren(...st.peers.map((pl) => {
      let status = pl.isMe ? 'You' : pl.p.host ? 'Host' : '';
      let done = false;
      if (g.ph === 'ask') { done = !!(pl.p.a && pl.p.a.r === g.r && pl.p.a.d); status = done ? 'Locked' : 'Thinking'; }
      else if (g.ph === 'vote') {
        const voter = (g.u || []).some((x) => !x.by.includes(pl.id));
        done = !voter || !!(pl.p.v && pl.p.v.r === g.r && pl.p.v.d);
        status = !voter ? 'Waiting' : done ? 'Voted' : 'Voting';
      }
      else if (g.ph === 'reveal' || g.ph === 'final') status = (Cr().scores(g).get(pl.id) || 0).toLocaleString();
      return h('li', { class: done ? 'done' : '' }, UI.planet(pl.p.col, true), h('span', null, pl.p.n), h('small', null, status));
    }));
  }

  // ---------- ask ----------
  function timerEl() { return h('div', { class: 'timer', id: 'crew-timer' }, h('div', { class: 'timer-bar' }, h('i', { id: 'crew-tbar' })), h('b', { id: 'crew-tsec' }, '')); }
  function promptEl(p, g, small) {
    return h('article', { class: 'prompt enter' },
      h('p', { class: 'p-cat' }, `Round ${g.r} of ${g.R} · ${p.cat.name}`),
      h('h2', { class: 'p-ask', style: small ? { fontSize: 'clamp(30px, 6vw, 44px)' } : null }, p.ask),
      h('p', { class: 'p-rule' }, p.rule));
  }
  function ask() {
    const st = S(), g = st.g, p = st.prompt;
    const input = h('input', { id: 'crew-ans', maxlength: 48, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Type an answer, press Enter' });
    const msg = h('p', { class: 'note', id: 'crew-msg', 'aria-live': 'polite' });
    const form = h('form', { class: 'answer', id: 'crew-form', autocomplete: 'off', onsubmit: (e) => { e.preventDefault(); submit(input, form, msg); } },
      h('label', { for: 'crew-ans', class: 'sr' }, 'Your answer'), input, h('button', { class: 'btn primary', type: 'submit' }, 'Add'));
    mount(timerEl(), promptEl(p, g), form,
      h('div', { class: 'my-answers', id: 'crew-mine' }),
      h('div', { class: 'row-actions' }, h('span', { class: 'mono', id: 'crew-count' }),
        h('button', { class: 'btn', type: 'button', id: 'crew-lock', onclick: () => { flushInput(); Cr().lock(); refresh(); } }, 'Lock in')),
      msg, h('ul', { class: 'players', id: 'crew-players' }));
    mine();
    players();
    input.focus({ preventScroll: true });
    Fx.warp(1.5);
    Fx.sfx.flip();
  }
  function submit(input, form, msg) {
    const r = Cr().addAnswer(input.value);
    if (r && r !== 'unknown') { msg.textContent = r; Fx.shake(form); Fx.sfx.bad(); return; }
    msg.textContent = r === 'unknown' ? "That one isn't on our charts. The crew will vote on it." : '';
    if (input.value.trim()) { Fx.sfx.key(); Fx.burstAt(input, 3, 10); }
    input.value = '';
    mine();
  }
  function flushInput() {
    const input = $('#crew-ans');
    if (input && input.value.trim()) { Cr().addAnswer(input.value); input.value = ''; }
  }
  function mine() {
    const st = S(), a = st.myA, el = $('#crew-mine');
    if (!el || !a) return;
    el.replaceChildren(...a.l.map((t, i) => h('span', { class: 'chip' }, t,
      a.d ? null : h('button', { type: 'button', class: 'link', 'aria-label': 'Remove ' + t, onclick: () => { Cr().removeAnswer(i); mine(); } }, '×'))));
    $('#crew-count').textContent = `${a.l.length} of ${st.g.A} answer${st.g.A > 1 ? 's' : ''}`;
    const locked = a.d;
    $('#crew-ans').disabled = locked;
    UI.$('#crew-form button').disabled = locked;
    $('#crew-lock').hidden = locked;
    if (locked) $('#crew-msg').replaceChildren(h('span', { class: 'wait' }, 'Locked in. Waiting for the crew…'));
  }

  // ---------- vote ----------
  function vote() {
    const st = S(), g = st.g, me = Cr().meId();
    const rows = (g.u || []).map((x, i) => {
      const mineToo = x.by.includes(me);
      return h('div', { class: 'vote-row' }, h('b', null, x.a),
        mineToo ? h('span', { class: 'mono' }, 'Your answer. The crew decides.')
          : seg(['Counts', "Doesn't"], "Doesn't", (v) => { Cr().setVote(i, v === 'Counts'); markVote(i, v); }));
    });
    mount(timerEl(), h('div', { class: 'panel' },
      h('h2', null, 'Crew vote'),
      h('p', null, `These answers aren't on our charts. Do they count as ${st.prompt.cat.ask}${st.prompt.rule ? ' ' + st.prompt.rule : ''}? Accepted answers score as Deep Space.`),
      h('div', { class: 'vote-list', id: 'vote-list' }, rows),
      h('button', { class: 'btn primary', type: 'button', id: 'vote-send', onclick: () => { Cr().sendVotes(); refresh(); } }, 'Send votes')),
      h('ul', { class: 'players', id: 'crew-players' }));
    players();
    Fx.sfx.flip();
  }
  function markVote(i, v) {
    const row = $('#vote-list').children[i];
    row.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === v)));
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
      const tag = r.f === 'L' ? h('span', { class: 'tag-lone' }, 'Lone signal') : r.f === 'X' ? h('span', { class: 'tag-clash' }, 'Collision') : r.v ? h('span', { class: 'tag-lone' }, 'Voted in') : null;
      const card = h('div', { class: 'card' + (tier ? '' : ' miss'), style: { animationDelay: (i * STEP) / 1000 + 's' } },
        UI.planet(Cr().colorOf(r.p)),
        h('span', { class: 'who' }, Cr().nameOf(r.p), tag),
        h('span', { class: 'what' }, r.a || '—'),
        tier ? UI.badge(tier) : UI.missBadge(MISS[r.m] || 'Miss'),
        h('span', { class: 'pts' }, (r.pts ? '+' : '') + (+r.pts || 0)));
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
    const after = h('div', { class: 'panel', style: { opacity: 0 } }, UI.farther(p, null, 5, said), h('p', { class: 'eyebrow' }, 'Standings'), board);
    mount(promptEl(p, g, true), cards, after);
    const scm = Cr().scores(g), ranked = [...scm.keys()].sort((a, b) => scm.get(b) - scm.get(a));
    ranked.forEach((id, i) => {
      const sc = h('span', { class: 'sc' }, '0');
      board.append(h('li', null, h('span', { class: 'rk' }, String(i + 1)), UI.planet(Cr().colorOf(id), true), h('span', { class: 'nm' }, Cr().nameOf(id)), sc));
      revealTimers.push(setTimeout(() => Fx.countUp(sc, (scm.get(id) || 0) - (roundPts[id] || 0), scm.get(id) || 0, 900), res.length * STEP + 500));
    });
    revealTimers.push(setTimeout(() => { after.style.transition = 'opacity .5s'; after.style.opacity = 1; }, res.length * STEP + 300));
    $('#crew-timer') && $('#crew-timer').remove();
  }

  // ---------- final ----------
  function final() {
    const st = S(), g = st.g, scm = Cr().scores(g), sc = Object.fromEntries(scm);
    const ranked = [...scm.keys()].sort((a, b) => scm.get(b) - scm.get(a));
    const spot = (id, cls, place) => h('div', { class: cls, style: id ? null : { visibility: 'hidden' } }, id ? UI.planet(Cr().colorOf(id)) : null,
      h('span', { class: 'nm' }, id ? Cr().nameOf(id) : ''), h('span', { class: 'mono' }, id ? (sc[id] || 0).toLocaleString() + ' ly' : ''),
      h('div', { class: 'step', style: { height: place === 1 ? '120px' : place === 2 ? '84px' : '58px' } }, id ? String(place) : ''));
    const actions = st.isHost
      ? [h('button', { class: 'btn primary', type: 'button', onclick: () => Cr().startGame() }, 'Play again'),
        h('button', { class: 'btn', type: 'button', onclick: () => Cr().backToLobby() }, 'Change settings')]
      : [h('p', { class: 'wait' }, 'Waiting for the host…')];
    mount(h('div', { class: 'panel' },
      h('p', { class: 'eyebrow' }, 'Mission complete'),
      h('h2', null, !ranked[0] ? 'Mission complete' : ranked[1] && sc[ranked[1]] === sc[ranked[0]] ? 'A tie at the top' : `${Cr().nameOf(ranked[0])} flew farthest`),
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
    const total = g.ph === 'vote' ? Cr().VOTE_MS : (g.T || 30) * 1000;
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
    if (g.ph === 'vote' && S().myV && S().myV.d) {
      const b = $('#vote-send');
      if (b) { b.disabled = true; b.textContent = 'Votes sent'; }
    }
    players();
  }

  FO.CrewView = { entry, lobby, ask, vote, reveal, final, waiting, message, hostGone, net, tick, refresh, players, flushInput };
})();
