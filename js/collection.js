/* Far Out — Logbook: level and badges (from FO.Progress), lifetime stats, and the Star Chart of
   every rare answer (Deep Space and Far Out) a player has found. Kept in this browser only. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, h = UI.h, $ = UI.$;
  let chart = UI.store.get('chart', {});
  if (!chart || typeof chart !== 'object' || Array.isArray(chart)) chart = {};

  const stats = () => Object.assign({ answers: 0, rare: 0, games: 0 }, UI.store.get('stats', {}));
  const bump = (patch) => { const s = stats(); for (const k in patch) s[k] = (s[k] || 0) + patch[k]; UI.store.set('stats', s); };

  // Counted each time: the big question bank arrives after startup.
  const total = () => FO.qs.concat(FO.cats).reduce((n, l) => n + l.rare, 0);

  function render() {
    const entries = Object.values(chart).sort((a, b) => b.t - a.t);
    const s = stats();
    const group = (c) => {
      const list = entries.filter((e) => e.c === c);
      if (!list.length) return null;
      const tier = FO.TIERS[c];
      return h('section', { class: 'chart-group' },
        h('h3', { class: tier.cls }, `${tier.name}, ${list.length}`),
        h('ul', { class: 'chart-list' }, list.map((e) => h('li', { class: tier.cls }, h('b', null, e.n), h('span', null, e.q)))));
    };
    const lv = FO.Progress.level(), P = FO.Progress, badges = P.badges(), got = badges.filter((x) => x.got).length;
    const next = P.RANKS.find(([l]) => l > lv.lvl);
    $('#chart-body').replaceChildren(
      h('div', { class: 'panel rank-card' },
        h('span', { class: 'ring', style: { '--p': Math.round((lv.into / lv.need) * 100) } }, h('b', null, String(lv.lvl))),
        h('h2', null, `Level ${lv.lvl}, ${lv.rank}`),
        h('div', { class: 'xp-bar', role: 'img', 'aria-label': `${lv.into} of ${lv.need} XP to level ${lv.lvl + 1}` }, h('i', { style: { width: (lv.into / lv.need) * 100 + '%' } })),
        h('p', null, `${(lv.need - lv.into).toLocaleString()} XP to level ${lv.lvl + 1}${next ? `. ${next[1]} at level ${next[0]}.` : '.'} Every valid answer earns its points as XP.`)),
      h('dl', { class: 'stats' },
        [['Answers given', s.answers], ['Rare finds', s.rare], ['Games played', s.games], ['Total XP', lv.xp]]
          .map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, Number(v).toLocaleString())))),
      h('h3', { class: 'sec-title' }, `Badges, ${got} of ${badges.length}`),
      h('ul', { class: 'badges' }, badges.sort((x, y) => y.got - x.got).map((x) => h('li', { class: x.got ? 'got' : '' }, h('b', null, x.name), h('span', null, x.how)))),
      h('h3', { class: 'sec-title' }, 'Star chart'),
      h('div', { class: 'chart-head' },
        h('p', { class: 'chart-count' }, h('b', null, entries.length.toLocaleString()), ` of ${total().toLocaleString()} rare answers charted`),
        h('div', { class: 'chart-bar', role: 'img', 'aria-label': `${entries.length} of ${total()} charted` },
          h('i', { style: { width: Math.max(0.6, (entries.length / Math.max(1, total())) * 100) + '%' } }))),
      ...(entries.length ? [group(1), group(2)].filter(Boolean) : [h('p', { class: 'note' },
        'Your chart is empty. Find Deep Space or Far Out answers in any mode and they are charted here for good.')]));
  }

  FO.Collection = {
    /** Record a valid answer. Returns true when it is a new rare find. */
    add(item, tier, p) {
      bump({ answers: 1, rare: tier.c <= 2 ? 1 : 0 });
      if (tier.c > 2) return false;
      const k = p.cat.id + '|' + item.name;
      if (chart[k]) return false;
      chart[k] = { n: item.name, c: tier.c, q: p.cat.ask, t: Date.now() };
      UI.store.set('chart', chart);
      return true;
    },
    gamePlayed: () => bump({ games: 1 }),
    count: () => Object.keys(chart).length,
    show() { UI.show('s-chart'); render(); },
  };
})();
