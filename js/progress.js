/* Far Out — progression: XP and pilot ranks from every valid answer, plus badges for milestones.
   Kept in this browser only. Every mode reports through FO.Progress.event(). */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx;

  const RANKS = [[1, 'Cadet'], [5, 'Pilot'], [10, 'Navigator'], [15, 'Captain'], [20, 'Commander'], [30, 'Admiral'], [40, 'Star Voyager'], [50, 'Far Out Legend']];
  const need = (lvl) => 250 + 150 * (lvl - 1); // XP from level lvl to lvl + 1
  const rankOf = (lvl) => RANKS.filter(([l]) => lvl >= l).pop()[1];

  // id, name, how to earn, test(state)
  const BADGES = [
    ['first-far', 'First Far Out', 'Find a Far Out answer', (s) => s.n.far >= 1],
    ['far-25', 'Deep Field', 'Find 25 Far Out answers', (s) => s.n.far >= 25],
    ['answers-100', 'Century', 'Give 100 valid answers', (s) => s.n.answers >= 100],
    ['answers-1000', 'Encyclopedic', 'Give 1,000 valid answers', (s) => s.n.answers >= 1000],
    ['streak-10', 'On a Roll', '10 valid answers in a row in Voyage', (s) => s.best.streak >= 10],
    ['voyage-2000', 'Long Haul', 'Fly 2,000 ly in one Voyage', (s) => s.best.voyage >= 2000],
    ['voyage-5000', 'Light Speed', 'Fly 5,000 ly in one Voyage', (s) => s.best.voyage >= 5000],
    ['daily-3', 'Regular', 'Finish Daily Orbit 3 days in a row', (s) => s.best.daily >= 3],
    ['daily-7', 'Clockwork', 'Finish Daily Orbit 7 days in a row', (s) => s.best.daily >= 7],
    ['shower-15', 'Meteor Storm', '15 answers in one Meteor Shower', (s) => s.best.shower >= 15],
    ['spectrum', 'Full Spectrum', 'Fill all five rarity slots on one question', (s) => s.n.spectrum >= 1],
    ['rarer-10', 'Sharp Eye', '10 right in a row in Rarer or Not', (s) => s.best.rarer >= 10],
    ['duel-win', 'Outbid', 'Beat Vega in a duel', (s) => s.n.duelWins >= 1],
    ['duel-hard', 'Vega Who?', 'Beat Vega on Hard', (s) => s.n.duelHard >= 1],
    ['typos-10', 'Spell Check', 'Have 10 typos fixed for you', (s) => s.n.typos >= 10],
    ['topics-10', 'Wide Explorer', 'Answer questions in 10 different topics', (s) => s.topics.length >= 10],
    ['party', 'Life of the Party', 'Finish a Party game', (s) => s.n.party >= 1],
    ['crew', 'Crewmate', 'Finish a Crew game online', (s) => s.n.crew >= 1],
  ];

  const blank = () => ({ xp: 0, n: { answers: 0, far: 0, typos: 0, spectrum: 0, duelWins: 0, duelHard: 0, party: 0, crew: 0 },
    best: { streak: 0, voyage: 0, daily: 0, shower: 0, rarer: 0 }, topics: [], got: {} });
  function load() {
    const s = UI.store.get('prog', null), b = blank();
    if (!s || typeof s !== 'object') return b;
    return { xp: Math.max(0, +s.xp || 0), n: Object.assign(b.n, s.n), best: Object.assign(b.best, s.best),
      topics: Array.isArray(s.topics) ? s.topics.slice(0, 40) : [], got: s.got && typeof s.got === 'object' ? s.got : {} };
  }
  let S = load();
  const save = () => UI.store.set('prog', S);

  /** {lvl, rank, xp, into, need}: level from total XP. */
  function level(xp = S.xp) {
    let lvl = 1, left = xp;
    while (left >= need(lvl) && lvl < 99) { left -= need(lvl); lvl++; }
    return { lvl, rank: rankOf(lvl), xp, into: left, need: need(lvl) };
  }

  // Unlocks and level-ups queue up so two in a row don't overwrite each other.
  const queue = [];
  let showing = false;
  function notify(msg, big) {
    queue.push([msg, big]);
    if (!showing) next();
  }
  function next() {
    const it = queue.shift();
    if (!it) { showing = false; return; }
    showing = true;
    UI.toast(it[0], 2600);
    if (it[1]) { Fx.sfx.win(); Fx.confetti(90); } else Fx.sfx.lone();
    setTimeout(next, 2800);
  }

  function check() {
    for (const [id, name, , test] of BADGES) {
      if (S.got[id] || !test(S)) continue;
      S.got[id] = Date.now();
      notify(`Badge unlocked: ${name}`);
    }
  }

  FO.Progress = {
    RANKS, BADGES, level,
    state: () => S,
    badges: () => BADGES.map(([id, name, how]) => ({ id, name, how, got: !!S.got[id] })),
    /** Report what happened. Valid answers ('answer') also earn XP equal to their points. */
    event(type, d = {}) {
      const before = level().lvl;
      if (type === 'answer') {
        S.xp += d.pts || 0;
        S.n.answers++;
        if (d.tier === 1) S.n.far++;
        if (d.fuzzy) S.n.typos++;
        if (d.theme && !S.topics.includes(d.theme)) S.topics.push(d.theme);
      } else if (type === 'best') {
        for (const k of Object.keys(d)) if (k in S.best) S.best[k] = Math.max(S.best[k], +d[k] || 0);
      } else if (type in S.n) {
        S.n[type] += 1;
        if (type === 'duelWins' && d.hard) S.n.duelHard++;
      }
      if (d.xp) S.xp += d.xp;
      const after = level().lvl;
      if (after > before) notify(`Level ${after}: ${rankOf(after)}`, true);
      check();
      save();
    },
  };
})();
