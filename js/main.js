/* Far Out — boot: menu wiring, deep links, home stats. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx, $ = UI.$;

  function home() {
    UI.show('s-home');
    const best = UI.store.get('best.voyage', 0);
    $('#best-voyage').textContent = best ? `Best: ${best.toLocaleString()} ly` : 'No voyage yet';
    const d = UI.store.get('daily.' + FO.Solo.today(), null);
    const streak = FO.Solo.streakNow();
    $('#best-daily').textContent = !d ? (streak > 1 ? `Keep your ${streak}-day streak going` : "Today's six are ready")
      : d.done === false ? `In progress, ${(d.dist || 0).toLocaleString()} ly so far` : `Done today: ${(d.dist || 0).toLocaleString()} ly${streak > 1 ? `, ${streak}-day streak` : ''}`;
    Fx.cruise(0.35);
    const n = FO.Collection.count();
    $('#chart-link').textContent = n ? `Your star chart (${n})` : 'Your star chart';
    $('#home-themes').replaceChildren(UI.themePicker(UI.store.get('theme', 'all'), (t) => UI.store.set('theme', t)));
  }

  function go(where) {
    Fx.sfx.unlock();
    if (where === 'voyage' || where === 'daily') FO.Solo.start(where);
    else if (where === 'crew') { UI.show('s-crew'); FO.CrewView.entry(); }
    else if (where === 'howto') UI.show('s-howto');
    else if (where === 'chart') FO.Collection.show();
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
    if (innerWidth >= 640 || !e.target.matches('#ans, #crew-ans')) return;
    setTimeout(() => e.target.closest('form').scrollIntoView({ block: 'center', behavior: Fx.reduce ? 'auto' : 'smooth' }), 300);
  });
  $('#skip').addEventListener('click', () => FO.Solo.skip());

  const mute = $('#mute');
  const paintMute = () => { mute.textContent = Fx.isMuted() ? 'Sound: off' : 'Sound: on'; };
  mute.addEventListener('click', () => { Fx.setMuted(!Fx.isMuted()); paintMute(); if (!Fx.isMuted()) Fx.sfx.ok(4); });
  paintMute();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && UI.current !== 's-home' && !e.target.closest('input')) home();
  });

  const lists = FO.qs.length + FO.cats.length, answers = FO.qs.concat(FO.cats).reduce((n, c) => n + c.items.length, 0);
  $('#bank-stat').textContent = `${lists.toLocaleString()} topics and ${answers.toLocaleString()} known answers`;

  home();
  // First visit: a three-step intro.
  if (!UI.store.get('seen', false) && !location.hash) {
    const intro = $('#intro'), done = (go) => { intro.hidden = true; UI.store.set('seen', true); if (go) go(); };
    intro.hidden = false;
    $('#intro-go').onclick = () => done(() => window.FarOut && document.querySelector('[data-go=voyage]').click());
    $('#intro-close').onclick = () => done();
    intro.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(); });
    setTimeout(() => $('#intro-go').focus(), 50);
  }
  // Installed-app support (GitHub Pages and other real hosts only; never inside claude.ai).
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !FO.Net.inArtifact) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is optional */ });
  }
  const m = location.hash.match(/^#crew-([a-z]{4})$/i);
  if (m) { UI.show('s-crew'); FO.CrewView.entry(m[1].toUpperCase()); }
  else if (location.hash === '#voyage' || location.hash === '#daily') go(location.hash.slice(1));
})();
