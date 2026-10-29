/* Far Out — core: word bank, answer matching, prompt generation, scoring.
   Pure logic, no DOM. Data files call FarOut.addCategories([...]). */
(function () {
  'use strict';
  const FO = (window.FarOut = window.FarOut || {});
  FO.cats = [];
  FO.catById = Object.create(null);

  // ---------- text ----------
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/\+/g, ' plus ').replace(/#/g, ' sharp ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const strip = (s) => norm(s).replace(/^(the|a|an) /, '');
  const letters = (f) => f.replace(/[^a-z]/g, '');

  function singular(w) {
    if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /(ches|shes|sses|xes|zes|oes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
    return w;
  }
  const keyOf = (s) => strip(s).split(' ').map(singular).join('');

  const FILLER = /\b(river|mount|mt|mountains?|volcano|islands?|isle|lake|city|breed|dog|cat|language|cheese|dance|bread|pasta|the)\b/g;

  // Optimal-string-alignment distance with an early exit above `max`.
  function dist(a, b, max) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > max) return max + 1;
    let p2 = null, p1 = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      let rowMin = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(p1[j] + 1, cur[j - 1] + 1, p1[j - 1] + cost);
        if (p2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      p2 = p1; p1 = cur;
    }
    return p1[n];
  }

  // ---------- data ----------
  // Data is lowercase; restore display casing: "kfc" → KFC, "mcdonalds" → McDonalds, "st john" → St John.
  const NOT_ACRONYM = new Set(['st', 'mr', 'mrs', 'dr', 'jr', 'sr', 'ft', 'mt', 'vs', 'pt', 'nd', 'rd', 'th', 'ms', 'grrrl']);
  const title = (s) => s.replace(/[a-z0-9]+/g, (w) => {
    if (/^[b-df-hj-np-tv-xz]{2,5}$/.test(w) && !NOT_ACRONYM.has(w)) return w.toUpperCase();
    if (/^mc[a-z]{2}/.test(w)) return 'Mc' + w[2].toUpperCase() + w.slice(3);
    return w[0].toUpperCase() + w.slice(1);
  });

  function parseCat(c) {
    const items = [], index = new Map();
    for (const raw of String(c.items).split(';')) {
      const m = raw.trim().match(/^(.*):([1-5])$/);
      if (!m) continue;
      const names = m[1].split('|').map((s) => s.trim()).filter(Boolean);
      if (!names.length) continue;
      const item = { name: title(names[0]), c: +m[2], f: strip(names[0]) };
      items.push(item);
      for (const n of names) {
        const k = keyOf(n);
        if (k && !index.has(k)) index.set(k, { item, f: strip(n) });
      }
    }
    return { id: c.id, name: c.name, ask: c.ask, items, index };
  }

  FO.addCategories = function (arr) {
    for (const c of arr) {
      if (!c || !c.id || FO.catById[c.id]) continue;
      const cat = parseCat(c);
      if (cat.items.length < 12) continue;
      FO.cats.push(cat);
      FO.catById[cat.id] = cat;
    }
  };

  function match(cat, text) {
    const k = keyOf(text);
    if (!k) return null;
    const hit = cat.index.get(k);
    if (hit) return { item: hit.item, f: hit.f, fuzzy: false };
    // "Nile River", "Mount Everest", "Persian cat": retry without the category's filler words.
    const k2 = keyOf(norm(text).replace(FILLER, ' '));
    const hit2 = k2 && k2 !== k && cat.index.get(k2);
    if (hit2) return { item: hit2.item, f: hit2.f, fuzzy: false };
    if (k.length < 5) return null;
    const max = k.length >= 9 ? 2 : 1;
    let best = null, bestD = max + 1, tie = false;
    for (const [kk, v] of cat.index) {
      if (Math.abs(kk.length - k.length) > max) continue;
      const d = dist(k, kk, max);
      if (d < bestD) { bestD = d; best = v; tie = false; }
      else if (d === bestD && best && v.item !== best.item) tie = true;
    }
    return best && !tie ? { item: best.item, f: best.f, fuzzy: true } : null;
  }

  // ---------- rarity tiers (redshift scale: the farther, the redder) ----------
  FO.TIERS = {
    5: { c: 5, name: 'Low Orbit', pts: 10, fuel: 3, cls: 't5' },
    4: { c: 4, name: 'Moonshot', pts: 25, fuel: 5, cls: 't4' },
    3: { c: 3, name: 'Red Planet', pts: 45, fuel: 7, cls: 't3' },
    2: { c: 2, name: 'Deep Space', pts: 70, fuel: 10, cls: 't2' },
    1: { c: 1, name: 'Far Out', pts: 100, fuel: 14, cls: 't1' },
  };

  // ---------- prompt rules ----------
  const RULES = {
    any: { w: 3, label: () => '', test: () => true },
    start: { w: 7, label: (v) => `starting with ${v.toUpperCase()}`, test: (f, v) => f.startsWith(v) },
    end: { w: 2.5, label: (v) => `ending in ${v.toUpperCase()}`, test: (f, v) => letters(f).endsWith(v) },
    has: { w: 2, label: (v) => `with ${'aefhilmnorsx'.includes(v) ? 'an' : 'a'} ${v.toUpperCase()} in it`, test: (f, v) => f.includes(v) },
    len: { w: 2, label: (v) => `with exactly ${v} letters`, test: (f, v) => letters(f).length === v },
    long: { w: 1.2, label: () => 'with 10 or more letters', test: (f) => letters(f).length >= 10 },
    short: { w: 1.2, label: () => 'with 5 letters or fewer', test: (f) => letters(f).length <= 5 },
    words: { w: 1, label: () => 'that is two or more words', test: (f) => f.includes(' ') },
    dbl: { w: 1, label: () => 'with a double letter, like EE or LL', test: (f) => /([a-z])\1/.test(letters(f)) },
    noe: { w: 1, label: () => 'without the letter E', test: (f) => !f.includes('e') },
    same: { w: 0.8, label: () => 'that starts and ends with the same letter', test: (f) => { const l = letters(f); return l.length > 1 && l[0] === l[l.length - 1]; } },
    vowel: { w: 1, label: () => 'starting with a vowel', test: (f) => /^[aeiou]/.test(f) },
  };
  const PARAMS = {
    start: 'abcdefghijklmnopqrstuvwxyz'.split(''),
    end: 'aehklnorsty'.split(''),
    has: 'zxqjkvwybpfg'.split(''),
    len: [3, 4, 5, 6, 7, 8, 9],
  };

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
  function weighted(rng) {
    const keys = Object.keys(RULES);
    let r = rng() * keys.reduce((s, k) => s + RULES[k].w, 0);
    for (const k of keys) { r -= RULES[k].w; if (r <= 0) return k; }
    return 'any';
  }
  const poolOf = (cat, t, v) => cat.items.filter((it) => RULES[t].test(it.f, v));

  /** Rebuild a prompt from its serializable spec {c, t, v}. */
  FO.buildPrompt = function (spec) {
    const cat = FO.catById[spec.c] || FO.cats[0];
    const rule = Object.prototype.hasOwnProperty.call(RULES, spec.t) ? spec.t : 'any';
    let v;
    if (rule === 'len') v = Math.max(1, Math.min(30, Math.round(+spec.v) || 5));
    else if (PARAMS[rule]) v = typeof spec.v === 'string' && /^[a-z]$/.test(spec.v) ? spec.v : 'a';
    const pool = poolOf(cat, rule, v);
    const maxC = pool.reduce((m, it) => Math.max(m, it.c), 1);
    return {
      spec: { c: cat.id, t: rule, v },
      id: `${cat.id}:${rule}:${v ?? ''}`,
      cat, pool,
      shift: Math.min(2, 5 - maxC), // a hard rule makes its own best-known answers "obvious"
      ask: `Name ${cat.ask}`,
      rule: RULES[rule].label(v),
      test: (f) => RULES[rule].test(f, v),
    };
  };

  FO.makePrompt = function (rng, opts = {}) {
    const minPool = opts.minPool || 6, recent = opts.recent || new Set(), avoid = opts.avoid || [];
    for (let tries = 0; tries < 120; tries++) {
      const cat = pick(rng, FO.cats);
      if (tries < 80 && avoid.includes(cat.id)) continue;
      const t = weighted(rng);
      let v;
      if (PARAMS[t]) {
        const ok = PARAMS[t].filter((x) => poolOf(cat, t, x).length >= minPool);
        if (!ok.length) continue;
        v = pick(rng, ok);
      }
      const p = FO.buildPrompt({ c: cat.id, t, v });
      if (p.pool.length < minPool || recent.has(p.id)) continue;
      if (opts.avoid) { avoid.push(cat.id); if (avoid.length > (opts.avoidN || 4)) avoid.shift(); }
      return p;
    }
    return FO.buildPrompt({ c: pick(rng, FO.cats).id, t: 'any' });
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
    return n;
  };

  FO.effOf = (p, item) => Math.max(1, Math.min(5, item.c + p.shift));

  /** Judge one typed answer against a prompt.
      ok:true → {item, tier, pts}; ok:false → why: empty | unknown | rule | repeat */
  FO.judge = function (p, text, used) {
    const raw = norm(text);
    if (!raw) return { ok: false, why: 'empty', raw };
    const m = match(p.cat, text);
    if (!m) return { ok: false, why: 'unknown', raw, ruleOk: p.test(strip(text)) };
    if (!p.test(m.f)) return { ok: false, why: 'rule', raw, item: m.item };
    if (used && used.has(m.item)) return { ok: false, why: 'repeat', raw, item: m.item };
    const tier = FO.TIERS[FO.effOf(p, m.item)];
    return { ok: true, raw, item: m.item, tier, pts: tier.pts, fuzzy: m.fuzzy };
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

  FO.text = { norm, strip, keyOf };
})();
