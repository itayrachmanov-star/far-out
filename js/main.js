/* Far Out — boot: menu wiring, deep links, home stats. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx, $ = UI.$;

  function home() {
    UI.show('s-home');
    const best = UI.store.get('best.voyage', 0);
    $('#best-voyage').textContent = best ? `Best: ${best.toLocaleString()} ly` : 'No voyage yet';
    const d = UI.store.get('daily.' + FO.Solo.today(), null);
    $('#best-daily').textContent = !d ? "Today's orbit is ready" : d.done === false ? `In progress · ${(d.dist || 0).toLocaleString()} ly` : `Today: ${(d.dist || 0).toLocaleString()} ly · see result`;
    Fx.cruise(0.35);
  }

  function go(where) {
    Fx.sfx.unlock();
    if (where === 'voyage' || where === 'daily') FO.Solo.start(where);
    else if (where === 'crew') { UI.show('s-crew'); FO.CrewView.entry(); }
    else if (where === 'howto') UI.show('s-howto');
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
  $('#skip').addEventListener('click', () => FO.Solo.skip());

  const mute = $('#mute');
  const paintMute = () => { mute.textContent = Fx.isMuted() ? 'Sound: off' : 'Sound: on'; };
  mute.addEventListener('click', () => { Fx.setMuted(!Fx.isMuted()); paintMute(); if (!Fx.isMuted()) Fx.sfx.ok(4); });
  paintMute();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && UI.current !== 's-home' && !e.target.closest('input')) home();
  });

  const cats = FO.cats.length, answers = FO.cats.reduce((n, c) => n + c.items.length, 0);
  $('#bank-stat').textContent = `${cats} categories · ${answers.toLocaleString()} answers · ${FO.countPrompts().toLocaleString()} prompts`;

  home();
  const m = location.hash.match(/^#crew-([a-z]{4})$/i);
  if (m) { UI.show('s-crew'); FO.CrewView.entry(m[1].toUpperCase()); }
  else if (location.hash === '#voyage' || location.hash === '#daily') go(location.hash.slice(1));
})();
