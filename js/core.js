/* Far Out — core: answer lists, typo-tolerant matching, endless prompts, scoring. Pure logic, no DOM.
   Data files call FarOut.addCategories([...]) (broad lists: "a bird") and
   FarOut.addQuestions([...]) (curated questions: "Name a red fruit"). */
(function () {
  'use strict';
  const FO = (window.FarOut = window.FarOut || {});
  const { norm, strip, letters, keyOf, dist, sound, title } = FO.text;
  FO.cats = [];   // broad categories
  FO.qs = [];     // curated questions
  FO.catById = Object.create(null);
  const allKeys = new Set(); // every answer in the game: a real thing is never "corrected" into a different one

  // ---------- themes ----------
  FO.THEMES = [
    { id: 'food', name: 'Food & Drink' }, { id: 'nature', name: 'Animals & Nature' }, { id: 'world', name: 'Places & Travel' },
    { id: 'history', name: 'History & People' }, { id: 'screen', name: 'Movies & TV' }, { id: 'music', name: 'Music' },
    { id: 'arts', name: 'Books, Art & Myths' }, { id: 'sport', name: 'Sport' }, { id: 'games', name: 'Games & Hobbies' },
    { id: 'science', name: 'Science & Space' }, { id: 'tech', name: 'Tech & Internet' }, { id: 'body', name: 'Body & Health' },
    { id: 'life', name: 'Everyday Life' }, { id: 'words', name: 'Words & Language' }, { id: 'kids', name: 'Family friendly' },
  ];
  // Curated questions carry a theme label; broad categories are mapped by id.
  const LABEL_THEME = {
    food: 'food', drink: 'food', animals: 'nature', nature: 'nature', geography: 'world', cities: 'world', travel: 'world', architecture: 'world',
    history: 'history', people: 'history', movies: 'screen', tv: 'screen', music: 'music', books: 'arts', art: 'arts', myths: 'arts', religion: 'arts',
    sport: 'sport', fitness: 'sport', games: 'games', hobbies: 'games', science: 'science', space: 'science', maths: 'science',
    tech: 'tech', internet: 'tech', body: 'body', health: 'body', medicine: 'body',
    home: 'life', everyday: 'life', school: 'life', work: 'life', jobs: 'life', feelings: 'life', holidays: 'life', fashion: 'life', brands: 'life',
    transport: 'life', cars: 'life', money: 'life', words: 'words', language: 'words', philosophy: 'words', kids: 'kids',
  };
  const CAT_THEME = {
    food: /^(fruit|vegetable|nut-seed-grain|herb-spice|cheese|dish|dessert|drink|bread|pasta|fastfood|breakfast)$/,
    nature: /^(mammal|bird|fish|sea-creature|insect|reptile-amphibian|dog-breed|cat-breed|tree|flower|dinosaur)$/,
    world: /^(country|capital|us-state|world-city|river|mountain|island|currency)$/,
    history: /^(president|scientist|painter)$/,
    screen: /^(superhero)$/,
    music: /^(instrument|music-genre|dance)$/,
    arts: /^(author|mythical-creature|god)$/,
    sport: /^(sport|sportsgear)$/,
    games: /^(game|toy|hobby|campbeach)$/,
    science: /^(element|gem-mineral|space|unit|shape)$/,
    tech: /^(proglang)$/,
    body: /^(body-part)$/,
    words: /^(language|emotion|subject)$/,
    kids: /^(color)$/,
  };
  const themeOf = (kind, def) => {
    if (kind === 'q') return LABEL_THEME[String(def.theme || '').toLowerCase()] || 'life';
    return Object.keys(CAT_THEME).find((t) => CAT_THEME[t].test(def.id)) || 'life';
  };

  // ---------- lists ----------
  function parseList(src) {
    const items = [], index = new Map(), named = [];
    for (const raw of String(src).split(/[;\n]/)) {
      const m = raw.trim().match(/^(.*):([1-5])$/);
      if (!m) continue;
      const names = m[1].split('|').map((s) => s.trim()).filter(Boolean);
      if (!names.length) continue;
      const item = { name: title(names[0]), c: +m[2], f: strip(names[0]) };
      items.push(item);
      named.push([item, names]);
    }
    // Every answer's own name wins over another answer's alias ("georgetown" vs Penang's alias).
    const put = (item, n) => {
      const k = keyOf(n);
      if (!k || index.has(k)) return;
      const f = strip(n);
      index.set(k, { item, f, s: sound(k), r: f.replace(/ /g, '') });
      allKeys.add(k);
    };
    // Duplicates ("lamb chop" and "lamb chops") merge into the first, keeping its rating.
    const owner = new Map();
    for (const [item, names] of named) {
      const first = owner.get(keyOf(names[0]));
      if (first) { first.extra.push(...names); item.dup = true; continue; }
      owner.set(keyOf(names[0]), { item, extra: names.slice(1) });
      put(item, names[0]);
    }
    for (const { item, extra } of owner.values()) extra.forEach((n) => put(item, n));
    return { items: items.filter((it) => !it.dup), index };
  }
  function addList(def, kind, min) {
    if (!def || !def.id || FO.catById[def.id] || !def.items) return;
    const { items, index } = parseList(def.items);
    if (items.length < min) return;
    const list = kind === 'q'
      ? { kind, id: def.id, name: String(def.theme || 'Mixed'), ask: String(def.ask), what: String(def.what), items, index }
      : { kind, id: def.id, name: String(def.name), ask: `Name ${def.ask}`, what: String(def.ask), items, index };
    list.theme = themeOf(kind, def);
    (kind === 'q' ? FO.qs : FO.cats).push(list);
    FO.catById[list.id] = list;
  }
  FO.addCategories = (arr) => arr.forEach((c) => addList(c, 'cat', 12));
  FO.addQuestions = (arr) => arr.forEach((c) => addList(c, 'q', 15));

  // ---------- matching ----------
  const FILLER = /\b(river|mount|mt|mountains?|volcano|islands?|isle|lake|city|breed|dog|cat|language|cheese|dance|bread|pasta|desert|sea|ocean|bridge|falls|waterfall|canyon|bay|gulf|strait|the|a|an)\b/g;

  // A sound-alike match is strong evidence only when the spelling is also close.
  const soundScore = (d) => (d <= 1 ? 0.5 + 0.15 * d : 0.5 + 0.35 * d);

  /** Find what the player meant. Returns {hit, f, fuzzy} for one answer, {options} when a typo
      could be several answers, or null. `keep(item, f)` filters candidates (rule, already used). */
  function match(list, text, keep) {
    const k = keyOf(text);
    if (!k) return null;
    const exact = list.index.get(k);
    if (exact) return { item: exact.item, f: exact.f, fuzzy: false };
    const k2 = keyOf(norm(text).replace(FILLER, ' '));
    const ex2 = k2 && k2 !== k && list.index.get(k2);
    if (ex2) return { item: ex2.item, f: ex2.f, fuzzy: false };
    if (k.length < 3) return null;
    const known = allKeys.has(k); // a real answer elsewhere is only "fixed" to something that sounds the same

    const L = k.length, maxD = L >= 13 ? 3 : L >= 8 ? 2 : L >= 4 ? 1 : 0, s = sound(k), rk = strip(text).replace(/ /g, '');
    const best = new Map(); // item -> {score, f}
    for (const [kk, v] of list.index) {
      let score = Infinity;
      if (known) {
        if (L >= 5 && v.s === s) { const d = dist(k, kk, 2); if (d <= 2) score = soundScore(d); }
        if (score === Infinity) continue;
      } else if (maxD) {
        let d = Math.abs(kk.length - L) <= maxD ? dist(k, kk, maxD) : maxD + 1;
        if (d > maxD && Math.abs(v.r.length - rk.length) <= maxD) d = dist(rk, v.r, maxD); // "tapass", "tortoies"
        if (d <= maxD) score = d + (kk[0] !== k[0] ? 0.5 : 0);
      }
      const cap = Math.max(2, Math.ceil(L * 0.4));
      if (known) { /* scored above */ } else if (L >= 4 && s.length >= 3 && v.s === s) { const d = dist(k, kk, cap); if (d <= cap) score = Math.min(score, soundScore(d)); }
      else if (L >= 6 && s.length >= 4 && Math.abs(v.s.length - s.length) <= 1 && dist(s, v.s, 1) <= 1 && dist(k, kk, 3) <= 3) score = Math.min(score, 1.6);
      if (!known && L >= 5 && kk.length > L && kk.startsWith(k) && L >= kk.length * 0.6) score = Math.min(score, 1.2); // unfinished word
      if (score === Infinity) continue;
      const cur = best.get(v.item);
      if (!cur || score < cur.score) best.set(v.item, { score, f: v.f });
    }
    if (!best.size) return null;
    const ranked = [...best].map(([item, x]) => ({ item, ...x })).sort((a, b) => a.score - b.score || b.item.c - a.item.c);
    const allowed = keep ? ranked.filter((x) => keep(x.item, x.f)) : ranked;
    if (!allowed.length) return { item: ranked[0].item, f: ranked[0].f, fuzzy: true, blocked: true };
    const top = allowed[0].score;
    const near = allowed.filter((x) => x.score <= top + 0.12);
    if (near.length > 1) return { options: near.slice(0, 3).map((x) => x.item) };
    return { item: allowed[0].item, f: allowed[0].f, fuzzy: true };
  }

  // ---------- rarity tiers (redshift scale: the farther, the redder) ----------
  FO.TIERS = {
    5: { c: 5, name: 'Low Orbit', pts: 10, fuel: 3, cls: 't5' },
    4: { c: 4, name: 'Moonshot', pts: 25, fuel: 5, cls: 't4' },
    3: { c: 3, name: 'Red Planet', pts: 45, fuel: 7, cls: 't3' },
    2: { c: 2, name: 'Deep Space', pts: 70, fuel: 10, cls: 't2' },
    1: { c: 1, name: 'Far Out', pts: 100, fuel: 14, cls: 't1' },
  };

  // ---------- prompt rules (only natural ones: letter games are rare and never stack) ----------
  const RULES = {
    any: { w: 6, label: () => '', test: () => true },
    start: { w: 1, label: (v) => `starting with ${v.toUpperCase()}`, test: (f, v) => f.startsWith(v) },
  };
  const Q_RULES = { any: 14, start: 1 };
  const PARAMS = { start: 'abcdefghiklmnoprstw'.split('') };

  FO.rng = function (seed) {
    let h = 1779033703 ^ String(seed).length;
    for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  function weighted(rng, weights) {
    const keys = Object.keys(weights);
    let r = rng() * keys.reduce((s, k) => s + weights[k], 0);
    for (const k of keys) { r -= weights[k]; if (r <= 0) return k; }
    return 'any';
  }
  const CAT_W = Object.fromEntries(Object.entries(RULES).map(([k, v]) => [k, v.w]));
  const poolOf = (list, t, v) => list.items.filter((it) => RULES[t].test(it.f, v));

  /** Rebuild a prompt from its serializable spec {c, t, v}. */
  FO.buildPrompt = function (spec) {
    const known = !!FO.catById[spec.c];
    const list = FO.catById[spec.c] || FO.qs[0] || FO.cats[0];
    const rule = Object.prototype.hasOwnProperty.call(RULES, spec.t) ? spec.t : 'any';
    let v;
    if (PARAMS[rule]) v = typeof spec.v === 'string' && /^[a-z]$/.test(spec.v) ? spec.v : 'a';
    const pool = poolOf(list, rule, v);
    const maxC = pool.reduce((m, it) => Math.max(m, it.c), 1);
    return {
      spec: { c: list.id, t: rule, v },
      missing: !known, // this device's word bank is older than the host's
      id: `${list.id}:${rule}:${v ?? ''}`,
      cat: list, pool,
      shift: Math.min(2, 5 - maxC), // a hard rule makes its own best-known answers "obvious"
      ask: list.ask,
      what: list.what + (rule === 'any' ? '' : ' ' + RULES[rule].label(v)),
      rule: RULES[rule].label(v),
      test: (f) => RULES[rule].test(f, v),
    };
  };

  /** Next prompt. opts: minPool, recent (Set of ids), avoid (recent list ids), theme, qShare. */
  FO.makePrompt = function (rng, opts = {}) {
    const minPool = opts.minPool || 6, recent = opts.recent || new Set(), avoid = opts.avoid || [];
    const inTheme = (l) => !opts.theme || opts.theme === 'all' || l.theme === opts.theme;
    const qs = FO.qs.filter(inTheme), cats = FO.cats.filter(inTheme);
    const qShare = opts.qShare ?? 0.7;
    for (let tries = 0; tries < 160; tries++) {
      const useQ = qs.length && (!cats.length || rng() < qShare);
      const list = pick(rng, useQ ? qs : cats.length ? cats : FO.cats);
      if (!list || (tries < 100 && avoid.includes(list.id))) continue;
      const t = weighted(rng, useQ ? Q_RULES : CAT_W);
      if (useQ && t === 'start' && list.items.length < 40) continue;
      let v;
      if (PARAMS[t]) {
        const ok = PARAMS[t].filter((x) => poolOf(list, t, x).length >= minPool);
        if (!ok.length) continue;
        v = pick(rng, ok);
      }
      const p = FO.buildPrompt({ c: list.id, t, v });
      if (p.pool.length < minPool || recent.has(p.id)) continue;
      if (opts.avoid) { avoid.push(list.id); if (avoid.length > (opts.avoidN || 6)) avoid.shift(); }
      return p;
    }
    return FO.buildPrompt({ c: pick(rng, FO.qs.length ? FO.qs : FO.cats).id, t: 'any' });
  };

  /** How many distinct prompts the bank can produce (for the home screen). */
  FO.countPrompts = function (minPool = 6) {
    let n = 0;
    for (const cat of FO.cats) {
      for (const t of Object.keys(RULES)) {
        if (PARAMS[t]) n += PARAMS[t].filter((v) => poolOf(cat, t, v).length >= minPool).length;
        else if (poolOf(cat, t).length >= minPool) n++;
      }
    }
    for (const q of FO.qs) n += 1 + (q.items.length >= 40 ? PARAMS.start.filter((v) => poolOf(q, 'start', v).length >= minPool).length : 0);
    return n;
  };

  FO.effOf = (p, item) => Math.max(1, Math.min(5, item.c + p.shift));

  /** Judge one typed answer against a prompt.
      ok:true → {item, tier, pts, fuzzy, typed}
      ok:false → why: empty | unknown | rule | repeat | maybe (options: items to choose from) */
  FO.judge = function (p, text, used) {
    const raw = norm(text);
    if (!raw) return { ok: false, why: 'empty', raw };
    const keep = (item, f) => p.test(f) && !(used && used.has(item));
    const m = match(p.cat, text, keep);
    if (!m) return { ok: false, why: 'unknown', raw, ruleOk: p.test(strip(text)) };
    if (m.options) return { ok: false, why: 'maybe', raw, options: m.options };
    if (m.blocked || !p.test(m.f)) {
      if (used && used.has(m.item) && p.test(m.f)) return { ok: false, why: 'repeat', raw, item: m.item };
      return { ok: false, why: 'rule', raw, item: m.item };
    }
    if (used && used.has(m.item)) return { ok: false, why: 'repeat', raw, item: m.item };
    const tier = FO.TIERS[FO.effOf(p, m.item)];
    return { ok: true, raw, item: m.item, tier, pts: tier.pts, fuzzy: m.fuzzy, typed: m.fuzzy ? String(text).trim() : '' };
  };

  /** A few valid answers per tier, rarest first, to show what else was out there. */
  FO.spectrum = function (p, exclude, perTier = 2, rng = Math.random) {
    const out = [];
    for (let c = 1; c <= 5; c++) {
      const tierItems = p.pool.filter((it) => FO.effOf(p, it) === c && !(exclude && exclude.has(it)));
      for (let i = 0; i < perTier && tierItems.length; i++) {
        out.push({ item: tierItems.splice(Math.floor(rng() * tierItems.length), 1)[0], tier: FO.TIERS[c] });
      }
    }
    return out;
  };
})();
