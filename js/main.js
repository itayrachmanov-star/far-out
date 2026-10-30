/* Far Out — boot: the hub (daily card, mode tiles, launch sheet), settings, deep links. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx, h = UI.h, $ = UI.$;

  // Every mode the hub offers. topic: the player picks a topic first. best: how to show a record.
  const MODES = [
    { id: 'voyage', name: 'Voyage', color: 'var(--t3)', d: 'Race the fuel clock. Rare answers refuel you.', topic: true,
      rules: ['Fuel burns every second; rare answers refill more.', 'A wrong answer costs 3 seconds.', 'Answers in a row raise your multiplier up to ×2.'],
      best: () => { const b = UI.store.get('best.voyage', 0); return b ? `Best ${b.toLocaleString()} ly` : ''; }, go: (o) => FO.Solo.start('voyage', o) },
    { id: 'shower', name: 'Meteor Shower', color: 'var(--t1)', d: 'One question, 60 seconds. Name as many as you can.', topic: true, isNew: true,
      rules: ['Every answer scores its rarity.', 'Three rare answers in a row start Hyperdrive: double points for 10 seconds.', 'Wrong answers cost nothing.'],
      best: () => { const b = UI.store.get('best.shower', 0); return b ? `Best ${b.toLocaleString()} pts` : ''; }, go: (o) => FO.Arcade.start('shower', o) },
    { id: 'spectrum', name: 'Spectrum', color: 'var(--t2)', d: 'Fill all five rarities on one question.', topic: true, isNew: true,
      rules: ['Find one answer for each rarity, Low Orbit to Far Out.', '90 seconds, two hints.', 'Finish early for a time bonus.'],
      best: () => { const b = UI.store.get('best.spectrum', 0); return b ? `Best ${b.toLocaleString()} pts` : ''; }, go: (o) => FO.Arcade.start('spectrum', o) },
    { id: 'twin', name: 'Twin Stars', color: 'var(--t4)', d: 'No typing. Tap the rarer of two answers.', topic: true, isNew: true,
      rules: ['Two real answers to one question: tap the rarer one.', 'Eight seconds a pair, three lives.', 'The pairs get closer as your score grows.'],
      best: () => { const b = UI.store.get('best.twin', 0); return b ? `Best ${b} pairs` : ''; }, go: (o) => FO.Twin.start(o) },
    { id: 'duel', name: 'Duel', color: '#5cc8ff', d: 'Vega answers first. Go rarer to win the round.', topic: true, isNew: true, diff: true,
      rules: ['Vega, the rival pilot, reveals an answer.', 'Name something rarer to win the round; same rarity is a tie.', 'First to three rounds wins.'],
      best: () => { const s = FO.Progress.state(); return s.n.duelWins ? `${s.n.duelWins} win${s.n.duelWins === 1 ? '' : 's'}` : ''; }, go: (o) => FO.Arcade.start('duel', o) },
    { id: 'explore', name: 'Explore', color: 'var(--t5)', d: 'No clock, no end. Hints on tap.', topic: true,
      rules: ['Answer at your own pace.', 'Ask for a hint, or skip and see the rare answers.'], best: () => 'Relaxed', go: (o) => FO.Solo.start('explore', o) },
  ];
  const GROUP = [
    { id: 'party', name: 'Party', color: '#ff8fb8', d: '2 to 8 players pass one phone. Works offline.', best: () => 'Same room', go: () => FO.Party.show() },
    { id: 'crew', name: 'Crew', color: '#b6f36a', d: 'Online rooms: everyone on their own phone.', best: () => 'Create or join', go: () => { UI.show('s-crew'); FO.CrewView.entry(); } },
  ];

  function tile(m) {
    return h('button', { class: 'tile', type: 'button', onclick: () => (m.rules ? launch(m) : (Fx.sfx.unlock(), m.go())) },
      h('span', { class: 'planet' + (m.id === 'shower' || m.id === 'crew' ? ' ringed' : ''), style: { '--sw': m.color } }),
      h('b', null, m.name), h('span', { class: 't-d' }, m.d),
      m.isNew && !UI.store.get('tried.' + m.id, false) ? h('span', { class: 'tag-new' }, 'New') : h('span', { class: 't-s' }, m.best() || 'Not played yet'));
  }

  /** Bottom sheet: rules, topic, difficulty, start. */
  function launch(m) {
    Fx.sfx.unlock();
    const o = { theme: UI.theme(), diff: UI.store.get('duel.diff', 'normal') };
    const start = () => { close(); UI.store.set('tried.' + m.id, true); m.go(o); };
    const close = UI.sheet(
      h('div', { class: 'sheet-head' }, h('span', { class: 'planet' + (m.id === 'shower' ? ' ringed' : ''), style: { '--sw': m.color } }), h('h2', null, m.name)),
      h('p', { class: 'sheet-sub' }, m.d),
      h('ul', { class: 'rules' }, m.rules.map((r) => h('li', null, r))),
      m.diff ? h('div', { class: 'field' }, h('span', { class: 'opt-h' }, 'How good is Vega?'),
        UI.seg([['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], o.diff, (v) => { o.diff = v; UI.store.set('duel.diff', v); }, 'Difficulty')) : null,
      m.topic ? h('div', { class: 'field' }, h('span', { class: 'opt-h' }, 'Topic'), UI.themePicker(o.theme, (t) => { o.theme = t; UI.store.set('theme', t); })) : null,
      m.best() && m.id !== 'explore' ? h('p', { class: 'sheet-best' }, m.best()) : null,
      h('button', { class: 'btn primary', type: 'button', 'data-autofocus': '', onclick: start }, 'Start'));
  }

  function home() {
    if (FO.updateReady) { location.reload(); return; }
    UI.show('s-home');
    Fx.cruise(0.3);
    // streak and level pills
    const streak = FO.Solo.streakNow();
    $('#streak-n').textContent = streak;
    $('#streak-pill').classList.toggle('on', streak > 0);
    $('#streak-pill').setAttribute('aria-label', `Daily streak: ${streak} day${streak === 1 ? '' : 's'}`);
    const lv = FO.Progress.level();
    $('#lvl-n').textContent = lv.lvl;
    $('#lvl-rank').textContent = lv.rank;
    $('#lvl-ring').style.setProperty('--p', Math.round((lv.into / lv.need) * 100));
    $('#level-pill').setAttribute('aria-label', `Level ${lv.lvl}, ${lv.rank}. Open your logbook`);
    // daily card
    const d = UI.store.get('daily.' + FO.Solo.today(), null), done = d && d.done !== false, idx = d ? (done ? 6 : d.idx || 0) : 0;
    $('#daily-date').textContent = 'Daily Orbit, ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    $('#daily-h').textContent = done ? "Today's orbit is done" : idx ? 'Finish today’s six' : "Today's six questions";
    $('#best-daily').textContent = done ? `${(d.dist || 0).toLocaleString()} ly${streak > 1 ? `, ${streak}-day streak` : ''}. New questions tomorrow.`
      : streak > 0 ? `Keep your ${streak}-day streak going. Same six for everyone.` : 'Same six for everyone. No clock.';
    $('#daily-progress').replaceChildren(...Array.from({ length: 6 }, (_, i) => h('i', { class: i < idx ? 'on' : '' })));
    $('#daily-go').textContent = done ? 'See your result' : idx ? 'Continue' : "Play today's six";
    document.querySelector('.daily-card').classList.toggle('done', !!done);
    $('#tiles-solo').replaceChildren(...MODES.map(tile));
    $('#tiles-group').replaceChildren(...GROUP.map(tile));
  }

  function go(where) {
    Fx.sfx.unlock();
    const m = MODES.find((x) => x.id === where) || GROUP.find((x) => x.id === where);
    if (where === 'daily') FO.Solo.start('daily');
    else if (where === 'howto') UI.show('s-howto');
    else if (where === 'chart') FO.Collection.show();
    else if (m) m.go({ theme: UI.theme(), diff: UI.store.get('duel.diff', 'normal') });
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-home]');
    if (!t) return;
    if (t.hasAttribute('data-home')) home(); else go(t.dataset.go);
  });

  $('#answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    FO.Solo.submit($('#ans').value);
  });
  $('#ans').addEventListener('input', () => Fx.sfx.key());
  // Phones: keep the answer box above the on-screen keyboard.
  document.addEventListener('focusin', (e) => {
    if (innerWidth >= 640 || !e.target.matches('.answer input')) return;
    setTimeout(() => e.target.closest('form').scrollIntoView({ block: 'center', behavior: Fx.reduce ? 'auto' : 'smooth' }), 300);
  });
  $('#skip').addEventListener('click', () => FO.Solo.skip());
  $('#hint').addEventListener('click', () => FO.Solo.hint());

  const mute = $('#mute'), buzz = $('#buzz');
  const paint = () => { mute.textContent = Fx.isMuted() ? 'Sound: off' : 'Sound: on'; buzz.textContent = Fx.buzzOn() ? 'Vibration: on' : 'Vibration: off'; };
  mute.addEventListener('click', () => { Fx.setMuted(!Fx.isMuted()); paint(); if (!Fx.isMuted()) Fx.sfx.ok(4); });
  buzz.addEventListener('click', () => { Fx.setBuzz(!Fx.buzzOn()); paint(); Fx.buzz('ok'); });
  buzz.hidden = !Fx.canBuzz;
  paint();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && UI.current !== 's-home' && !e.target.closest('input') && !document.querySelector('.sheet')) home();
  });

  const lists = FO.qs.length + FO.cats.length, answers = FO.qs.concat(FO.cats).reduce((n, c) => n + c.items.length, 0);
  $('#bank-stat').textContent = `${lists.toLocaleString()} questions, ${FO.THEMES.length} topics and ${answers.toLocaleString()} known answers.`;

  home();
  // First visit: a three-step intro.
  if (!UI.store.get('seen', false) && !location.hash) {
    const intro = $('#intro'), done = (next) => { intro.hidden = true; UI.store.set('seen', true); if (next) next(); };
    intro.hidden = false;
    $('#intro-go').onclick = () => done(() => go('daily'));
    $('#intro-close').onclick = () => done();
    intro.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(); });
    setTimeout(() => $('#intro-go').focus(), 50);
  }
  // Installed-app support (GitHub Pages and other real hosts only; never inside claude.ai).
  try {
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !FO.Net.inArtifact) {
      // A new version installs in the background; switch to it at the menu, never mid-game.
      const hadWorker = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadWorker) return;
        FO.updateReady = true;
        if (UI.current === 's-home' && !document.querySelector('.sheet')) location.reload();
      });
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is optional */ });
    }
  } catch (e) { /* sandboxed frames can refuse service workers */ }
  const m = location.hash.match(/^#crew-([a-z]{4})$/i);
  if (m) { UI.show('s-crew'); FO.CrewView.entry(m[1].toUpperCase()); }
  else if (/^#(voyage|daily|explore|shower|spectrum|twin|duel|party)$/.test(location.hash)) go(location.hash.slice(1));
  FO.home = home;
})();
